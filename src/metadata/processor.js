const path = require("path")
const stdout = require('mute-stdout');

const { IPFSImage, IPFSMetadata } = require("./fields")

class MetadataProcessor {

  constructor(config, nebulus) {
    this.config = config
    this.nebulus = nebulus
  }

  async process(fields, metadata) {
    const values = {}

    for (const field of fields) {
      const value = metadata[field.name]

      values[field.name] = await this.processField(
        field,
        value
      )
    }

    return values
  }

  async processField(field, value) {
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

  async addIPFSData(data) {
    // Mute noisy nebulus logs
    stdout.mute()

    const cid = await this.nebulus.add(data);

    // Unmute when done using nebulus
    stdout.unmute()

    return cid
  }
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

module.exports = MetadataProcessor
