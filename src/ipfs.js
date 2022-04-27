const fs = require("fs/promises");
const path = require("path");
const { Blob, toGatewayURL } = require("nft.storage");
const fetch = require("node-fetch");
const stdout = require('mute-stdout');

class IPFS {
  constructor(nebulus, ipfsClient) {
      this.nebulus = nebulus
      this.ipfsClient = ipfsClient
  }

  async addLocally(data, options = { withUriPrefix: false }) {
    // Mute noisy nebulus logs
    stdout.mute()

    const cid = await this.nebulus.add(data);

    // Unmute when done using nebulus
    stdout.unmute()

    if (options.withUriPrefix) {
      return ensureIpfsUriPrefix(cid)
    }

    return cid
  }

  async pin(cid) {
    cid = stripIpfsUriPrefix(cid)

    const data = await fs.readFile(
      path.resolve(process.cwd(), `ipfs-data/ipfs/${cid}`)
    );

    return await this.ipfsClient.storeBlob(new Blob([data]));
  }

  async fetchJson(cidOrUri) {
    try {
      // Attempt to get local data from the URI
      const metadataBytes = await this.nebulus.get(
        stripIpfsUriPrefix(cidOrUri)
      );

      const metadata = JSON.parse(metadataBytes.toString());

      return metadata;

    } catch (e) {
      // If we can't get local data, this NFT may have been created using the Web UI.
      // So, we need to fetch it from IPFS...
      const location = toGatewayURL(cidOrUri);
      const result = await fetch(location.toString()).then((r) => r.json());
      return result;
    }
  }
}

function stripIpfsUriPrefix(cidOrURI) {
  if (cidOrURI.startsWith("ipfs://")) {
    return cidOrURI.slice("ipfs://".length);
  }
  return cidOrURI;
}

function ensureIpfsUriPrefix(cidOrURI) {
  let uri = cidOrURI.toString()

  if (!uri.startsWith("ipfs://")) {
    uri = "ipfs://" + cidOrURI
  }

  // Avoid the Nyan Cat bug (https://github.com/ipfs/go-ipfs/pull/7930)
  if (uri.startsWith("ipfs://ipfs/")) {
    uri = uri.replace("ipfs://ipfs/", "ipfs://")
  }

  return uri;
}

module.exports = IPFS
