import * as path from "path";

import { Field, IPFSImage, IPFSMetadata } from "./fields";

export default class MetadataProcessor {
  config: { 
    onChainMetadata: boolean;
    metadataFields: any;
    nftAssetPath: string;
  };
  ipfs: any;

  constructor(config: { onChainMetadata: boolean; metadataFields: any; nftAssetPath: string }, ipfs: any) {
    this.config = config
    this.ipfs = ipfs
  }

  async process(fields: Field[], metadata: any) {
    const values: any = {}

    for (const field of fields) {
      const value = metadata[field.name]

      values[field.name] = await this.processField(
        field,
        value
      )
    }

    return values
  }

  async processField(field: Field, value: any) {
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
    filename: string, 
    dir: string, 
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

  async processIpfsMetadata(metadata: any) {

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
