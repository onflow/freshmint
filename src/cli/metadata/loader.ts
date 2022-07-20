import { Field, IPFSMetadata } from "./fields";

export default class MetadataLoader {
  ipfs: any;

  constructor(ipfs: any) {
    this.ipfs = ipfs
  }

  async load(fields: any, metadata: any) {
    let values = metadata

    for (const field of fields) {
      values = await this.loadField(field, values)
    }

    return values
  }

  async loadField(field: Field, values: any) {
    switch (field.type) {
      case IPFSMetadata:
        return this.loadIpfsMetadata(field, values)
      default:
        return values
    }
  }

  async loadIpfsMetadata(field: Field, values: any) {
    const cid = values[field.name]
    return this.ipfs.fetchJson(cid)
  }
}
