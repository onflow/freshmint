const { IPFSImage, IPFSMetadata } = require("./fields")

class MetadataPinner {

  constructor(ipfs) {
    this.ipfs = ipfs
  }

  async pin(fields, metadata, onStart, onComplete) {
    for (const field of fields) {
      const value = metadata[field.name]

      await this.pinField(field, value, onStart, onComplete)
    }
  }

  async pinField(field, value, onStart, onComplete) {
    const cid = value

    switch (field.type) {
      case IPFSImage:
        return this.pinIpfsFile(field, cid, onStart, onComplete)
      case IPFSMetadata:
        return this.pinIpfsMetadata(cid, onStart, onComplete)
      default:
        return value
    }
  }

  async pinIpfsFile(field, cid, onStart, onComplete) {    
    onStart(field.name)
    await this.ipfs.pin(cid)
    onComplete(field.name)
  }
  
  async pinIpfsMetadata(cid, onStart, onComplete) {  
    const metadata = await this.ipfs.fetchJson(cid)
  
    if (metadata.image) {
      onStart("image")
      await this.ipfs.pin(metadata.image)
      onComplete("image")
    }
  
    if (metadata.animation_url) {
      onStart("animation_url")
      await this.ipfs.pin(metadata.animation_url)
      onComplete("animation_url")
    }
  
    onStart("metadata")
    await this.ipfs.pin(cid)
    onComplete("metadata")
  }
}

module.exports = MetadataPinner
