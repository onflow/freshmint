const path = require("path")

const { IPFSImage, IPFSMetadata } = require("./fields")

class MetadataProcessor {

  constructor(config, ipfs) {
    this.config = config
    this.ipfs = ipfs
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
        return this.processIpfsFile(value, "images")
      case IPFSMetadata:
        return this.processIpfsMetadata(value)
      default:
        return value
    }
  }

  async processIpfsFile(
    filename, 
    dir, 
    options = { withUriPrefix: false }
  ) {

    const fullPath = `${this.config.nftAssetPath}/${dir}/${filename}`

    let filepath 

    try {
      filepath = path.resolve(process.cwd(), fullPath)
    } catch (e) {
      throw new Error(
        `Failed to mint asset, file does not exist at ${fullPath}`
      )
    }
  
    const cid = await this.ipfs.addLocally(filepath, options)

    return cid;
  }

  async processIpfsMetadata(metadata) {

    if (metadata.image) {
      const imageUri = await this.processIpfsFile(
        metadata.image, 
        "images", 
        { withUriPrefix: true }
      )

      metadata.image = imageUri
    }

    if (metadata.animation) {
      const animationUri = await this.processIpfsFile(
        metadata.image, 
        "animations",
        { withUriPrefix: true }
      )

      // if an animation has been provided, add it to the metadata
      // Named 'animation_url' to conform to the OpenSea's NFT schema
      // https://docs.opensea.io/docs/metadata-standards
      metadata.animation_url = animationUri
    }

    delete metadata.animation

    const cid = await this.ipfs.addLocally(
      Buffer.from(JSON.stringify(metadata))
    )

    return cid 
  }
}

module.exports = MetadataProcessor
