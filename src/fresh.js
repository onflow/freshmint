const fs = require("fs/promises");
const path = require("path");
const fetch = require("node-fetch");
const { NFTStorage, Blob, toGatewayURL } = require("nft.storage");
const Nebulus = require("nebulus");
const ora = require("ora");
const stdout = require('mute-stdout');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const FlowMinter = require("./flow");
const DataStore = require("./datastore");
const { generateMetadata, getMetadataFields } = require("./metadata");
const getConfig = require("./config");
const { ECPrivateKey, signatureAlgorithms } = require("./flow/crypto");
const { IPFSImage } = require("./fields");

async function MakeFresh(network) {
  const m = new Fresh(network);
  await m.init();
  return m;
}

async function MakeFlowMinter(network) {
  return new FlowMinter(network);
}

async function MakeDataStore() {
  const db = new DataStore();
  await db.init("freshdb");
  return db;
}

class Fresh {
  constructor(network) {
    this.network = network
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
    this.flowMinter = await MakeFlowMinter(this.network);

    this.nebulus = new Nebulus({
      path: path.resolve(process.cwd(), this.config.nebulusPath)
    });

    this.ipfs = new NFTStorage({
      token: this.config.pinningService.key,
      endpoint: this.config.pinningService.endpoint
    });

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

  async createNFTsFromCSVFile(csvPath, withClaimKey, cb) {
    await this.flowMinter.setupAccount();

    const metadatas = await generateMetadata(csvPath);

    let totalMinted = 0;

    for (const metadata of metadatas) {

      const exists = await this.nftExists(metadata.hash)
      if (exists) {
        cb({ skipped: true });
        continue;
      }

      const fields = await this.processFieldValues(metadata.fields)

      const { tokenId, txId, claimKey } = await this.createNFT(fields, withClaimKey);

      const result = { 
        tokenId,
        txId,
        pinned: false,
        metadataHash: metadata.hash,
        metadata: fieldsToObject(fields),
        claimKey
      }
      
      await this.datastore.save(result);

      cb(result);

      totalMinted++;
    }

    return {
      total: totalMinted
    };
  }

  async nftExists(hash) {
    const exists = await this.datastore.find({ metadataHash: hash });
    return (exists.length !== 0)
  }

  async processFieldValues(fields) {
    return await Promise.all(fields.map(async (field) => ({
      ...field,
      value: await this.processFieldValue(field)
    })))
  }

  async processFieldValue(field) {
    switch (field.type) {
      case IPFSImage:
        return this.processIPFSFile(field.value)
      default:
        return field.value
    }
  }

  async processIPFSFile(filename) {
    const filepath = path.resolve(
      process.cwd(),
      `${this.config.nftAssetPath}/images/${filename}`
    );
  
    // Mute noisy nebulus logs
    stdout.mute();

    const cid = await this.nebulus.add(filepath);

    // Unmute when done using nebulus
    stdout.unmute();

    return cid;
  }

  async createNFT(fields, withClaimKey) {
    if (withClaimKey) {
      return await this.mintTokenWithClaimKey(fields);
    }

    return await this.mintToken(fields);
  }

  //////////////////////////////////////////////
  // -------- NFT Retreival
  //////////////////////////////////////////////

  async getNFT(tokenId) {
    return await this.flowMinter.getNFTDetails(
      this.defaultOwnerAddress(),
      tokenId
    );
  }

  async dumpNFTs(csvPath) {
    const nfts = await this.datastore.all();

    if (nfts.length === 0) {
      return 0;
    }

    const firstNft = nfts[0];

    const metadataHeaders = Object.keys(firstNft.metadata)
      .map(key => { return { id: key, title: key.toUpperCase()} })

    const csvWriter = createCsvWriter({
      path: csvPath,
      header: [
        {id: 'tokenID', title: 'TOKEN ID'},
        ...metadataHeaders,
        {id: 'transactionID', title: 'TRANSACTION ID'},
        {id: 'pinned', title: 'PINNED'},
        {id: 'claimKey', title: "CLAIM KEY"},
      ]
    });
   
    const records = nfts.map(nft => {
      return {
        tokenID: nft.tokenId,
        ...nft.metadata,
        transactionID: nft.txId,
        pinned: nft.pinned,
        claimKey: nft.claimKey,
      }
    })
  
    await csvWriter.writeRecords(records);

    return nfts.length;
  }

  async getNFTMetadata(tokenId) {
    const results = await this.datastore.find({ tokenId });

    if (results.length === 0) {
      throw new Error(`Token ${tokenId} does not exist`);
    }

    return results[0].metadata;
  }

  //////////////////////////////////////////////
  // --------- Smart contract interactions
  //////////////////////////////////////////////

  async mintToken(fields) {
    const minted = await this.flowMinter.mint(fields);
    return formatMintResult(minted);
  }

  async mintTokenWithClaimKey(fields) {
    const { privateKey, publicKey } = generateKeyPair();

    const minted = await this.flowMinter.mintWithClaimKey(
      publicKey,
      fields
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
   * @returns {string} - the default signing address that should own new tokens, if no owner was specified.
   */
  defaultOwnerAddress() {
    return this.network === "testnet" ? 
      this.config.testnetFlowAccount.address : 
      (this.network === "mainnet" ?
        this.config.mainnetFlowAccount.address :
        this.config.emulatorFlowAccount.address);
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
    const metadata = await this.getNFTMetadata(tokenId);
    const fields = getMetadataFields(this.config)

    const spinner = ora();

    const pin = async (cid) => {
      const data = await fs.readFile(
        path.resolve(process.cwd(), `ipfs-data/ipfs/${cid}`)
      );

      return await this.ipfs.storeBlob(new Blob([data]));
    };

    for (const field of fields) {
      if (field.type === IPFSImage) {
        const cid = metadata[field.name];
        
        spinner.start(`Pinning ${field.name}...`);

        await pin(cid);

        spinner.succeed(`📌 ${field.name} was pinned!`);
      }
    }

    await this.datastore.update({ tokenId }, { pinned: true });
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

  if (!deposit.values) {
    throw new Error(
      "Error format mint result, missing values"
    )
  }

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
