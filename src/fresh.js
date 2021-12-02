const fs = require("fs/promises");
const path = require("path");
const fetch = require("node-fetch");
const { NFTStorage, Blob, toGatewayURL } = require("nft.storage");
const Nebulus = require("nebulus");
const ora = require("ora");
const FlowMinter = require("./flow");
const DataStore = require("./datastore");
const generateMetadata = require("./generate-metadata");
const getConfig = require("./config");
const { ECPrivateKey, signatureAlgorithms } = require("./flow/crypto");

async function MakeFresh() {
  const m = new Fresh();
  await m.init();
  return m;
}

async function MakeFlowMinter() {
  return new FlowMinter();
}

async function MakeDataStore() {
  const db = new DataStore();
  await db.init("freshdb");
  return db;
}

class Fresh {
  constructor() {
    this.config = null;
    this.ipfs = null;
    this.nebulus = null;
    this.flowMinter = null;
    this.datastore = null;
    this._initialized = false;
  }

  async init() {
    if (this._initialized) {
      return;
    }

    this.config = getConfig();

    this.datastore = await MakeDataStore();
    this.flowMinter = await MakeFlowMinter();

    this.nebulus = new Nebulus({
      path: path.resolve(process.cwd(), this.config.nebulusPath)
    });

    this.ipfs = new NFTStorage({
      token: this.config.pinningService.key,
      endpoint: this.config.pinningService.endpoint
    });

    this.sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    this._initialized = true;
  }

  //////////////////////////////////////////////
  // ------ Deployment
  //////////////////////////////////////////////

  async deployContracts() {
    await this.flowMinter.deployContracts();
  }

  //////////////////////////////////////////////
  // ------ NFT Creation
  //////////////////////////////////////////////
  /**
   * Create a new NFT from the given CSV data.
   *
   * @param {string} csvPath - Path to the CSV data file
   * @param {function} cb - Callback to call with the results of the minting
   * @typedef {object} BatchCreateNFTResult
   * @property {number} total - the total number of NFTs created
   *
   *
   * @returns {Promise<BatchCreateNFTResult>}
   */
  async createNFTsFromCSVFile(csvPath, withClaimKey, cb) {
    const metadatas = await generateMetadata(csvPath);

    for (const metadata of metadatas) {
      // Images are required
      const imagePath = path.resolve(
        process.cwd(),
        `${this.config.nftAssetPath}/images/${metadata.image}`
      );

      // Animatons are not required, so check if one has been provided
      const animationPath = metadata.animation
        ? path.resolve(
            process.cwd(),
            `${this.config.nftAssetPath}/animations/${metadata.animation}`
          )
        : null;

      const result = await this.createNFTFromAssetData({
        imagePath,
        animationPath,
        withClaimKey,
        ...metadata
      });

      if (!result) {
        cb({ skip: true });
        metadatas.length--;
      } else {
        // Save the NFT to the database
        this.datastore.save({ pinned: false, ...result });
        cb(result);
      }

      await this.sleep(this.config.RATE_LIMIT_MS);
    }

    return {
      total: metadatas.length
    };
  }

  /**
   * Create a new NFT from the given asset data.
   *
   * @param {object} options
   *
   * @typedef {object} CreateNFTResult
   * @property {string} txId - The id of the minting transaction
   * @property {number} tokenId - the unique ID of the new token
   * @property {string} ownerAddress - the Flow address of the new token's owner
   * @property {object} metadata - the JSON metadata stored in IPFS and referenced by the token's metadata URI
   * @property {string} imageURI - an ipfs:// URI for the image
   * @property {URL} imageGatewayURL - an HTTP gateway URL for the image
   * @property {string} metadataURI - an ipfs:// URI for the NFT metadata
   * @property {URL} metadataGatewayURL - an HTTP gateway URL for the NFT metadata
   *
   * @returns {Promise<CreateNFTResult>}
   */

  async createNFTFromAssetData(options) {
    const imagePath = options.imagePath;
    const animationPath = options.animationPath;
    const withClaimKey = options.withClaimKey;

    // Generate image CIDs for IPFS
    const imageCid = await this.nebulus.add(imagePath);
    const imageURI = ensureIpfsUriPrefix(imageCid);

    // Generate animation CIDs for IPFS (if animation file is given)
    let animationCid = null;
    let animationURI = null;
    if (animationPath) {
      animationCid = await this.nebulus.add(animationPath);
      animationURI = ensureIpfsUriPrefix(animationCid);
    }

    const metadata = await this.makeNFTMetadata(
      { imageURI, animationURI },
      options
    );

    // add the metadata to IPFS
    const metadataCid = await this.nebulus.add(
      Buffer.from(JSON.stringify(metadata))
    );

    const metadataURI = ensureIpfsUriPrefix(metadataCid);

    // If attempting to mint n NFT with identical metadata, as one that has laready been minted,
    // we skip it skip to ensure the minting command is idempotent.
    // NOTE: This could be configured to allow multiple mints of
    // the same metadata if the user desired.
    const exists = await this.datastore.find({ metadataURI });
    if (exists.length) return;

    // Get the address of the token owner from options,
    // or use the default signing address if no owner is given
    let ownerAddress = options.owner;
    if (!ownerAddress) {
      ownerAddress = await this.defaultOwnerAddress();
    }

    const nftDetails = await this.createNFT(metadataURI, withClaimKey);

    const details = {
      ...nftDetails,
      ownerAddress,
      metadata,
      imageURI,
      metadataURI,
      imageGatewayURL: toGatewayURL(imageURI),
      metadataGatewayURL: toGatewayURL(metadataURI)
    };

    return details;
  }

  async createNFT(metadataURI, withClaimKey) {
    if (withClaimKey) {
      return await this.mintTokenWithClaimKey(metadataURI);
    }

    return await this.mintToken(metadataURI);
  }

  /**
   * Create a new NFT from an asset file at the given path.
   *
   * @param {string} filename - the path to an image file or other asset to use
   * If missing, the default signing address will be used.
   *
   * @returns {Promise<CreateNFTResult>}
   */
  async createNFTFromAssetFile(filename) {
    const content = await fs.readFile(filename);
    return this.createNFTFromAssetData(content);
  }

  /**
   * Helper to construct metadata JSON for
   * @param {object} options
   * @param {object} uris
   * @property {string} imageURI - IPFS URI for the NFT image
   * @property {?string} animationURI - optional URI to a video file to use as the NFT animation
   */
  async makeNFTMetadata(uris, options) {
    uris.imageURI = ensureIpfsUriPrefix(uris.imageURI);
    if (uris.animationURI)
      uris.animationURI = ensureIpfsUriPrefix(uris.animationURI);
    // remove path, imagePath and animationPath and animation, because we don't
    // need them to be part of the metadata...
    const { path, imagePath, animationPath, animation, ...metadata } = options;
    return {
      ...metadata,
      image: uris.imageURI,
      // if an animation has been provided, add it to the metadata
      // Named 'animation_url' to conform to the OpenSea's NFT schema
      // https://docs.opensea.io/docs/metadata-standards
      animation_url: uris.animationURI || ""
    };
  }

  //////////////////////////////////////////////
  // -------- NFT Retreival
  //////////////////////////////////////////////

  /**
   * Get information about an existing token, from the chain.
   * By default, this includes the token id, owner address, metadata, and metadata URI.
   * To include info about when the token was created and by whom, set `opts.fetchCreationInfo` to true.
   * To include the full asset data (base64 encoded), set `opts.fetchAsset` to true.
   *
   * @param {string} tokenId - the unique ID of the token to get info for
   *
   * @typedef {object} NFTInfo
   * @property {string} tokenId
   * @property {object} metadata
   * @property {string} metadataURI
   * @property {URL} metadataGatewayURL
   * @property {string} ownerAddress
   * @returns {Promise<NFTInfo>}
   */
  async getNFT(tokenId) {
    const flowData = await this.flowMinter.getNFTDetails(
      this.config.emulatorFlowAccount.address,
      tokenId
    );

    const metadataURI = flowData.metadata;
    const ownerAddress = flowData.owner;
    const metadataGatewayURL = toGatewayURL(metadataURI);

    const metadata = await this.getIPFSJSON(metadataURI);

    const nft = {
      tokenId,
      metadata,
      metadataURI,
      metadataGatewayURL,
      ownerAddress
    };

    return nft;
  }

  /**
   * Fetch the NFT metadata for a given token id.
   *
   * @param tokenId - the id of an existing token
   * @returns {Promise<{metadata: object, metadataURI: string}>} - resolves to an object containing the metadata and
   * metadata URI. Fails if the token does not exist, or if fetching the data fails.
   */
  async getNFTMetadata(tokenId) {
    const results = await this.datastore.find({ tokenId });

    if (results.length === 0) {
      throw new Error(`Token ${tokenId} does not exist`);
    }
    const meta = results[0].metadata;

    const metadataCid = await this.nebulus.add(
      Buffer.from(JSON.stringify(meta))
    );

    const metadataURI = ensureIpfsUriPrefix(metadataCid);
    const metadata = await this.getIPFSJSON(metadataURI);

    return { metadata, metadataURI };
  }

  //////////////////////////////////////////////
  // --------- Smart contract interactions
  //////////////////////////////////////////////

  /**
   * Create a new NFT token that references the given metadata CID, owned by the given address.
   *
   * @param {string} ownerAddress - the Flow address that should own the new token
   * @param {string} metadataURI - IPFS URI for the NFT metadata that should be associated with this token
   * @returns {Promise<any>} - The result from minting the token, includes events
   */
  async mintToken(metadataURI) {
    await this.flowMinter.setupAccount();
    const minted = await this.flowMinter.mint(metadataURI);
    return formatMintResult(minted);
  }

  async mintTokenWithClaimKey(metadataURI) {
    await this.flowMinter.setupAccount();

    const { privateKey, publicKey } = generateKeyPair();

    const minted = await this.flowMinter.mintWithClaimKey(
      metadataURI,
      publicKey
    );
    const result = formatMintResult(minted);

    // format and return the results
    return {
      txId: result.txId,
      tokenId: result.tokenId,
      claimKey: formatClaimKey(result.tokenId, privateKey)
    };
  }

  async startDrop(price) {
    await this.flowMinter.startQueueDrop(price);
  }

  async removeDrop() {
    await this.flowMinter.removeQueueDrop();
  }

  /**
   * @returns {Promise<string>} - the default signing address that should own new tokens, if no owner was specified.
   */
  async defaultOwnerAddress() {
    return this.config.emulatorFlowAccount.address;
  }

  /** @returns {Promise<string>} - Amoutn of tokens funded */
  async fundAccount(address) {
    const result = this.flowMinter.fundAccount(address);
    return result;
  }

  //////////////////////////////////////////////
  // --------- IPFS helpers
  //////////////////////////////////////////////

  /**
   * Get the contents of the IPFS object identified by the given CID or URI, and parse it as JSON, returning the parsed object.
   *
   * @param {string} cidOrURI - IPFS CID string or `ipfs://<cid>` style URI
   * @returns {Promise<string>} - contents of the IPFS object, as a javascript object (or array, etc depending on what was stored). Fails if the content isn't valid JSON.
   */
  async getIPFSJSON(cidOrURI) {
    try {
      // Attempt to get local data from the URI
      const metadataBytes = await this.nebulus.get(
        stripIpfsUriPrefix(cidOrURI)
      );
      const metadata = JSON.parse(metadataBytes.toString());
      return metadata;
    } catch (e) {
      // If we can't get local data, this NFT may have been created using the Web UI.
      // So, we need to fetch it from IPFS...
      const location = toGatewayURL(cidOrURI);
      const result = await fetch(location.toString()).then((r) => r.json());
      return result;
    }
  }

  //////////////////////////////////////////////
  // -------- Pinning to remote services
  //////////////////////////////////////////////

  /**
   * Pins all IPFS data associated with the given tokend id to the remote pinning service.
   *
   * @param {string} tokenId - the ID of an NFT that was previously minted.
   * @returns {Promise<void>} - the IPFS asset and metadata uris that were pinned.
   * Fails if no token with the given id exists, or if pinning fails.
   */

  async pinTokenData(tokenId) {
    return new Promise(async (resolve, reject) => {
      const { metadata, metadataURI } = await this.getNFTMetadata(tokenId);
      const { image: imageURI, animation: animationURI } = metadata;

      const spinner = ora();

      spinner.start("Pinning metadata...");

      const pin = async (cid) => {
        const data = await fs.readFile(
          path.resolve(process.cwd(), `ipfs-data/ipfs/${cid}`)
        );

        return await this.ipfs.storeBlob(new Blob([data]));
      };

      const meta = await pin(stripIpfsUriPrefix(metadataURI));

      spinner.succeed(`📌 ${meta} was pinned!`);
      spinner.start("Pinning assets...");

      const image = await pin(stripIpfsUriPrefix(imageURI));
      spinner.succeed(`📌 ${image} was pinned!`);

      if (animationURI) {
        spinner.start("Pinning animation...");
        const animation = await pin(stripIpfsUriPrefix(animationURI));
        spinner.succeed(`📌 ${animation} was pinned!`);
      }
      this.datastore.update({ tokenId }, { pinned: true });
      resolve();
    });
  }
}

//////////////////////////////////////////////
// -------- Crypto helpers
//////////////////////////////////////////////

function generateKeyPair() {
  const privateKey = ECPrivateKey.generate(signatureAlgorithms.ECDSA_P256);
  const publicKey = privateKey.getPublicKey();

  return {
    privateKey: privateKey.toHex(),
    publicKey: publicKey.toHex()
  };
}

function formatClaimKey(nftId, privateKey) {
  return `${privateKey}${nftId}`;
}

//////////////////////////////////////////////
// -------- URI helpers
//////////////////////////////////////////////

/**
 * @param {string} cidOrURI either a CID string, or a URI string of the form `ipfs://${cid}`
 * @returns the input string with the `ipfs://` prefix stripped off
 */
function stripIpfsUriPrefix(cidOrURI) {
  if (cidOrURI.startsWith("ipfs://")) {
    return cidOrURI.slice("ipfs://".length);
  }
  return cidOrURI;
}

function ensureIpfsUriPrefix(cidOrURI) {
  let uri = cidOrURI.toString();
  if (!uri.startsWith("ipfs://")) {
    uri = "ipfs://" + cidOrURI;
  }
  // Avoid the Nyan Cat bug (https://github.com/ipfs/go-ipfs/pull/7930)
  if (uri.startsWith("ipfs://ipfs/")) {
    uri = uri.replace("ipfs://ipfs/", "ipfs://");
  }
  return uri;
}

//////////////////////////////////////////////
// -------- General Helpers
//////////////////////////////////////////////

function formatMintResult(txOutput) {
  const deposit = txOutput.events.find((event) =>
    event.type.includes("Deposit")
  );

  const tokenId = deposit.values.value.fields.find(
    (f) => f.name === "id"
  ).value;

  return {
    tokenId: tokenId.value,
    txId: txOutput.id
  };
}

//////////////////////////////////////////////
// -------- Exports
//////////////////////////////////////////////

module.exports = {
  MakeFresh
};
