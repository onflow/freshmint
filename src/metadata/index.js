const { IPFSImage, String, IPFSMetadata } = require("./fields");
const MetadataLoader = require("./loader");
const MetadataParser = require("./parser");
const MetadataPinner = require("./pinner");
const MetadataProcessor = require("./processor");

const onChainFields = [
  {
    name: "name",
    type: String,
  },
  {
    name: "description",
    type: String,
  },
  {
    name: "image",
    type: IPFSImage,
  }
]

const offChainFields = [
  {
    name: "metadata",
    type: IPFSMetadata,
  }
]

class Metadata {

  constructor(config, nebulus, ipfs) {
    this.fields = Metadata.getFields(
      config.onChainMetadata, 
      config.customFields
    )

    this.parser = new MetadataParser(config, this.fields)
    this.processor = new MetadataProcessor(config, nebulus)
    this.pinner = new MetadataPinner(nebulus, ipfs)
    this.loader = new MetadataLoader(nebulus)
  }

  static getFields(onChainMetadata, customFields) {
    if (onChainMetadata) {
      return [
        ...onChainFields,
        ...customFields,
      ]
    }
  
    return offChainFields
  }

  async parse(csvPath) {
    return this.parser.parse(csvPath)
  }

  async process(metadata) {
    return this.processor.process(metadata, this.fields)
  }

  async pin(metadata, onStart, onComplete) {
    return this.pinner.pin(metadata, this.fields, onStart, onComplete)
  }

  async load(metadata) {
    return this.loader.load(metadata, this.fields)
  }
}

module.exports = Metadata
