const { IPFSMetadata } = require("./fields")

class MetadataLoader {

  constructor(ipfs) {
    this.ipfs = ipfs
  }

  async load(fields, metadata) {
    let values = metadata

    for (const field of fields) {
      values = await this.loadField(field, values)
    }

    return values
  }

  async loadField(field, values) {
    switch (field.type) {
      case IPFSMetadata:
        return this.loadIpfsMetadata(field, values)
      default:
        return values
    }
  }

  async loadIpfsMetadata(field, values) {
    const cid = values[field.name]
    return this.ipfs.fetchJson(cid)
  }
}

module.exports = MetadataLoader
