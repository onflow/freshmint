const fs = require("fs/promises");
const path = require("path");
const { Blob, toGatewayURL } = require("nft.storage");
const fetch = require("node-fetch");

const { IPFSImage, IPFSMetadata } = require("./fields")

class MetadataPinner {

  constructor(nebulus, ipfs) {
    this.nebulus = nebulus
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
        return this.pinIPFSFile(field, cid, onStart, onComplete)
      case IPFSMetadata:
        return this.pinIPFSMetadata(cid, onStart, onComplete)
      default:
        return value
    }
  }

  async pinIPFSFile(field, cid, onStart, onComplete) {    
    onStart(field.name)
    await this._pin(cid)
    onComplete(field.name)
  }
  
  async pinIPFSMetadata(cid, onStart, onComplete) {  
    const metadata = await this.getIPFSJSON(cid)
  
    if (metadata.image) {
      onStart("image")
      await this._pin(stripIpfsUriPrefix(metadata.image))
      onComplete("image")
    }
  
    if (metadata.animation_url) {
      onStart("animation_url")
      await this._pin(stripIpfsUriPrefix(metadata.animation_url))
      onComplete("animation_url")
    }
  
    onStart("metadata")
    await this._pin(cid)
    onComplete("metadata")
  }

  async _pin(cid) {
    const data = await fs.readFile(
      path.resolve(process.cwd(), `ipfs-data/ipfs/${cid}`)
    );

    return await this.ipfs.storeBlob(new Blob([data]));
  }

  /**
   * Get the contents of the IPFS object identified by the given CID or URI, and parse it as JSON, returning the parsed object.
   *
   * @param {string} cidOrURI - IPFS CID string or `ipfs://<cid>` style URI
   * @returns {Promise<string>} - contents of the IPFS object, as a javascript object (or array, etc depending on what was stored). Fails if the content isn't valid JSON.
   */
  async getIPFSJSON(cidOrURI) {
    try {
      // Attempt to get local data from the URI
      const metadataBytes = await this.nebulus.get(
        stripIpfsUriPrefix(cidOrURI)
      );
      const metadata = JSON.parse(metadataBytes.toString());
      return metadata;
    } catch (e) {
      // If we can't get local data, this NFT may have been created using the Web UI.
      // So, we need to fetch it from IPFS...
      const location = toGatewayURL(cidOrURI);
      const result = await fetch(location.toString()).then((r) => r.json());
      return result;
    }
  }
}

/**
 * @param {string} cidOrURI either a CID string, or a URI string of the form `ipfs://${cid}`
 * @returns the input string with the `ipfs://` prefix stripped off
 */
 function stripIpfsUriPrefix(cidOrURI) {
  if (cidOrURI.startsWith("ipfs://")) {
    return cidOrURI.slice("ipfs://".length);
  }
  return cidOrURI;
}

module.exports = MetadataPinner
