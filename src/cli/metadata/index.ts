import { metadata } from "../../lib";
import MetadataParser from "./parser";
import MetadataPinner from "./pinner";
import MetadataProcessor from "./processor";

export default class Metadata {
  schema: metadata.Schema

  parser: MetadataParser;
  processor: MetadataProcessor;
  pinner: MetadataPinner;

  constructor(schema: metadata.Schema, nftAssetPath: string, ipfs: any) {
    this.schema = schema;

    this.parser = new MetadataParser()
    this.processor = new MetadataProcessor(nftAssetPath, ipfs)
    this.pinner = new MetadataPinner(ipfs)
  }

  async parse(csvPath: string) {
    return this.parser.parse(this.schema, csvPath)
  }

  async process(metadata: metadata.MetadataMap) {
    return this.processor.process(this.schema, metadata)
  }

  async pin(metadata: metadata.MetadataMap, onStart: any, onComplete: any) {
    return this.pinner.pin(this.schema, metadata, onStart, onComplete)
  }
}

module.exports = Metadata
