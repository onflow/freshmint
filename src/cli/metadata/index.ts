import { metadata } from "../../lib";
import IPFS from "../ipfs";
import MetadataParser from "./parser";
import MetadataProcessor from "./processor";

export default class Metadata {
  schema: metadata.Schema

  parser: MetadataParser;
  processor: MetadataProcessor;

  constructor(schema: metadata.Schema, nftAssetPath: string, ipfs: IPFS) {
    this.schema = schema;

    this.parser = new MetadataParser()
    this.processor = new MetadataProcessor(nftAssetPath, ipfs)
  }

  async parse(csvPath: string) {
    return this.parser.parse(this.schema, csvPath)
  }

  async process(metadata: metadata.MetadataMap) {
    return this.processor.process(this.schema, metadata)
  }
}
