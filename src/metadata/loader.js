const fetch = require("node-fetch");

const { IPFSMetadata } = require("./fields")

class MetadataLoader {

  constructor(nebulus) {
    this.nebulus = nebulus
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
        return this.loadIPFSMetadata(field, values)
      default:
        return values
    }
  }

  async loadIPFSMetadata(field, values) {
    return this.getIPFSJSON(values[field.name])
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

module.exports = MetadataLoader
