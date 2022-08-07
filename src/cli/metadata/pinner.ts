import { metadata } from "../../lib";

export default class MetadataPinner {
  ipfs: any;

  constructor(ipfs: any) {
    this.ipfs = ipfs
  }

  async pin(schema: metadata.Schema, metadata: metadata.MetadataMap, onStart: (fieldName: string) => void, onComplete: (fieldName: string) => void) {
    for (const field of schema.getFieldList()) {
      const value = metadata[field.name]

      await this.pinField(field, value, onStart, onComplete)
    }
  }

  async pinField(field: metadata.Field, value: metadata.MetadataValue, onStart: (fieldName: string) => void, onComplete: (fieldName: string) => void) {
    const cid = value

    switch (field.type) {
      case metadata.IPFSImage:
        return this.pinIpfsFile(field, cid, onStart, onComplete)
      default:
        return value
    }
  }

  async pinIpfsFile(field: metadata.Field, cid: any, onStart: (fieldName: string) => void, onComplete: (fieldName: string) => void) {    
    onStart(field.name)
    await this.ipfs.pin(cid)
    onComplete(field.name)
  }
}

module.exports = MetadataPinner
