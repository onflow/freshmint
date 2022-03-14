const { IPFSImage, String, IPFSMetadata, Field } = require("./fields");
const MetadataLoader = require("./loader");
const MetadataParser = require("./parser");
const MetadataPinner = require("./pinner");
const MetadataProcessor = require("./processor");

const onChainFields = [
  new Field("name", String),
  new Field("description", String),
  new Field("image", IPFSImage)
]

const offChainFields = [
  new Field("metadata", IPFSMetadata)
]

class Metadata {

  constructor(config, ipfs) {
    this.fields = config.onChainMetadata ? 
      config.metadataFields :
      offChainFields

    this.parser = new MetadataParser(config)
    this.processor = new MetadataProcessor(config, ipfs)
    this.pinner = new MetadataPinner(ipfs)
    this.loader = new MetadataLoader(ipfs)
  }

  static getDefaultFields(onChainMetadata, customFields) {
    if (onChainMetadata) {
      return [
        ...onChainFields,
        ...customFields,
      ]
    }
  
    return offChainFields
  }

  async parse(csvPath) {
    return this.parser.parse(this.fields, csvPath)
  }

  async process(metadata) {
    return this.processor.process(this.fields, metadata)
  }

  async pin(metadata, onStart, onComplete) {
    return this.pinner.pin(this.fields, metadata, onStart, onComplete)
  }

  async load(metadata) {
    return this.loader.load(this.fields, metadata)
  }
}

module.exports = Metadata
