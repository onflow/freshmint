import * as fs from "fs/promises";
import * as path from "path";
import fetch from "node-fetch";

// @ts-ignore
import { Blob, NFTStorage, toGatewayURL } from "nft.storage";

// @ts-ignore
import stdout from 'mute-stdout';

export default class IPFS {
  nebulus: any;
  ipfsClient: any;

  constructor(nebulus: any, ipfsClient: NFTStorage) {
      this.nebulus = nebulus
      this.ipfsClient = ipfsClient
  }

  async addLocally(data: any, options = { withUriPrefix: false }) {
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

  async pin(cid: string) {
    cid = stripIpfsUriPrefix(cid)

    const data = await fs.readFile(
      path.resolve(process.cwd(), `ipfs-data/ipfs/${cid}`)
    );

    return await this.ipfsClient.storeBlob(new Blob([data]));
  }

  async fetchJson(cidOrUri: string) {
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

function stripIpfsUriPrefix(cidOrURI: string) {
  if (cidOrURI.startsWith("ipfs://")) {
    return cidOrURI.slice("ipfs://".length);
  }
  return cidOrURI;
}

function ensureIpfsUriPrefix(cidOrURI: string) {
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
