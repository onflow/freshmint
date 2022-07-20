import { IPFSImage, String, IPFSMetadata, Field } from "./fields";
import MetadataLoader from "./loader";
import MetadataParser from "./parser";
import MetadataPinner from "./pinner";
import MetadataProcessor from "./processor";

const onChainFields = [
  new Field("name", String),
  new Field("description", String),
  new Field("image", IPFSImage)
]

const offChainFields = [
  new Field("metadata", IPFSMetadata)
]

export default class Metadata {
  fields: any;
  parser: MetadataParser;
  processor: MetadataProcessor;
  pinner: MetadataPinner;
  loader: MetadataLoader;

  constructor(config: { onChainMetadata: boolean; metadataFields: any; nftAssetPath: string }, ipfs: any) {
    this.fields = config.onChainMetadata ? 
      config.metadataFields :
      offChainFields

    this.parser = new MetadataParser(config)
    this.processor = new MetadataProcessor(config, ipfs)
    this.pinner = new MetadataPinner(ipfs)
    this.loader = new MetadataLoader(ipfs)
  }

  static getDefaultFields(onChainMetadata: boolean, customFields: any) {
    if (onChainMetadata) {
      return [
        ...onChainFields,
        ...customFields,
      ]
    }
  
    return offChainFields
  }

  async parse(csvPath: string) {
    return this.parser.parse(this.fields, csvPath)
  }

  async process(metadata: any) {
    return this.processor.process(this.fields, metadata)
  }

  async pin(metadata: any, onStart: any, onComplete: any) {
    return this.pinner.pin(this.fields, metadata, onStart, onComplete)
  }

  async load(metadata: any) {
    return this.loader.load(this.fields, metadata)
  }
}

module.exports = Metadata
