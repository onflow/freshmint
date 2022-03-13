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
const { generateMetadata, getFields } = require("./metadata/opensea");
const getConfig = require("./config");
const { ECPrivateKey, signatureAlgorithms } = require("./flow/crypto");
const { IPFSImage, IPFSMetadata } = require("./fields");

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

  async createNFTsFromCSVFile(
    csvPath,
    withClaimKey,
    onStart,
    onBatchComplete,
    onError,
    batchSize = 10
  ) {
    await this.flowMinter.setupAccount();

    const { fields, tokens } = await generateMetadata(csvPath);

    const newTokens = []

    for (const token of tokens) {
      const exists = await this.nftExists(token.hash)
      if (!exists) {
        newTokens.push(token)
      }
    }

    const total = newTokens.length
    const skipped = tokens.length - newTokens.length
    
    const batches = []

    while (newTokens.length > 0) {
      const batch = newTokens.splice(0, batchSize)
      batches.push(batch)
    }

    onStart(total, skipped, batches.length, batchSize)

    for (const batch of batches) {

      const batchSize = batch.length

      const processedBatch = await this.processTokenBatch(fields, batch)

      const batchFields = groupBatchesByField(fields, processedBatch)

      let results 

      try {
        results = await this.createTokenBatch(
          batchFields, 
          withClaimKey
        )
      } catch(error) {
        onError(error)
        return
      }

      const finalResults = results.map((result, index) => {

        const { tokenId, txId, claimKey } = result;

        const metadata = processedBatch[index];
        
        return {
          tokenId,
          txId,
          pinned: false,
          metadataHash: metadata.hash,
          metadata: metadata.values,
          claimKey
        }
      })

      for (const result of finalResults) {        
        await this.datastore.save(result);
      }

      onBatchComplete(batchSize)
    }
  }

  async nftExists(hash) {
    const exists = await this.datastore.find({ metadataHash: hash });
    return (exists.length !== 0)
  }

  async processTokenBatch(fields, batch) {
    return await Promise.all(batch.map(async (token) => ({
      ...token,
      values: await this.processTokenValues(fields, token.values)
    })))
  }

  async processTokenValues(fields, values) {
    const newValues = {}

    for (const field of fields) {
      newValues[field.name] = await this.processTokenValue(field, values[field.name])
    }

    return newValues
  }

  async processTokenValue(field, value) {
    switch (field.type) {
      case IPFSImage:
        return this.processIPFSFile(value, "images")
      case IPFSMetadata:
        return this.processIPFSMetadata(value)
      default:
        return value
    }
  }

  async processIPFSFile(filename, dir) {

    const fullPath = `${this.config.nftAssetPath}/${dir}/${filename}`

    let filepath 

    try {
      filepath = path.resolve(process.cwd(), fullPath)
    } catch (e) {
      throw new Error(
        `Failed to mint asset, file does not exist at ${fullPath}`
      )
    }
  
    const cid = await this.addIPFSData(filepath)

    return cid;
  }

  async addIPFSData(data) {
    // Mute noisy nebulus logs
    stdout.mute()

    const cid = await this.nebulus.add(data);

    // Unmute when done using nebulus
    stdout.unmute()

    return cid
  }

  async processIPFSMetadata(metadata) {

    if (metadata.image) {
      const image = await this.processIPFSFile(metadata.image, "images")
      const imageURI = ensureIpfsUriPrefix(image)

      metadata.image = imageURI
    }

    if (metadata.animation) {
      const animation = await this.processIPFSFile(metadata.image, "animations")
      const animationURI = ensureIpfsUriPrefix(animation)

      // if an animation has been provided, add it to the metadata
      // Named 'animation_url' to conform to the OpenSea's NFT schema
      // https://docs.opensea.io/docs/metadata-standards
      metadata.animation_url = animationURI
    }

    delete metadata.animation

    const cid = await this.addIPFSData(
      Buffer.from(JSON.stringify(metadata))
    )

    return cid 
  }

  async createTokenBatch(batchFields, withClaimKey) {
    if (withClaimKey) {
      return await this.mintTokensWithClaimKey(batchFields);
    }

    return await this.mintTokens(batchFields);
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

  async mintTokens(batchFields) {
    const minted = await this.flowMinter.mint(batchFields);
    return formatMintResults(minted);
  }

  async mintTokensWithClaimKey(batchFields) {

    const batchSize = batchFields[0].values.length

    const { privateKeys, publicKeys } = generateKeyPairs(batchSize);

    const minted = await this.flowMinter.mintWithClaimKey(
      publicKeys,
      batchFields
    );

    const results = formatMintResults(minted);
    
    return results.map((result, i) => ({
      txId: result.txId,
      tokenId: result.tokenId,
      claimKey: formatClaimKey(result.tokenId, privateKeys[i])
    }))
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
      this.config.emulatorFlowAccount.address;
  }

  /** @returns {Promise<string>} - Amount of tokens funded */
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
    const values = await this.getNFTMetadata(tokenId);
    const fields = getFields(this.config.customFields)

    const spinner = ora();

    const pin = async (cid) => {
      const data = await fs.readFile(
        path.resolve(process.cwd(), `ipfs-data/ipfs/${cid}`)
      );

      return await this.ipfs.storeBlob(new Blob([data]));
    };

    for (const field of fields) {
      if (field.type === IPFSImage) {
        const cid = values[field.name];
        
        spinner.start(`Pinning ${field.name}...`);

        await pin(cid);

        spinner.succeed(`📌 ${field.name} was pinned!`);
      }

      if (field.type == IPFSMetadata) {
        const cid = values[field.name]

        const metadata = await this.getIPFSJSON(cid);

        if (metadata.image) {
          await pin(stripIpfsUriPrefix(metadata.image));
        }

        if (metadata.animation_url) {
          await pin(stripIpfsUriPrefix(metadata.animation_url));
        }

        await pin(cid)

        console.log(metadata)

        return
      }
    }

    await this.datastore.update({ tokenId }, { pinned: true });
  }
}

//////////////////////////////////////////////
// -------- Crypto helpers
//////////////////////////////////////////////

function generateKeyPairs(count) {

  const privateKeys = [];
  const publicKeys = [];

  while (count--) {
    const privateKey = ECPrivateKey.generate(signatureAlgorithms.ECDSA_P256);
    const publicKey = privateKey.getPublicKey();

    privateKeys.push(privateKey.toHex())
    publicKeys.push(publicKey.toHex())

  }

  return {
    privateKeys,
    publicKeys,
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

function formatMintResults(txOutput) {
  const deposits = txOutput.events.filter((event) =>
    event.type.includes(".Deposit")
  );

  return deposits.map(deposit => {
    const tokenId = deposit.values.value.fields.find(
      (f) => f.name === "id"
    ).value;
  
    return {
      tokenId: tokenId.value,
      txId: txOutput.id
    };
  })
}

function groupBatchesByField(fields, batches) {
  return fields.map(field => ({
    ...field,
    values: batches.map(batch => batch.values[field.name])
  }))
}

//////////////////////////////////////////////
// -------- Exports
//////////////////////////////////////////////

module.exports = {
  MakeFresh
};
