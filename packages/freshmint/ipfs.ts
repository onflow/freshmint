import { Blob, NFTStorage } from 'nft.storage';

export default class IPFS {
  ipfsClient: NFTStorage;

  // The NFTStorage client has a built-in rate limiter that attempts to keep
  // requests below the 30 req / 10s limit enforced by the API.
  //
  // Sometimes the API still returns a 409 (rate limited) response,
  // so we add retries to prevent uploads from failing.
  //
  // An alternative is to set a custom rate limiter on the client.
  //
  maxRetries = 10;

  constructor(ipfsClient: NFTStorage) {
    this.ipfsClient = ipfsClient;
  }

  async pin(data: Buffer): Promise<string> {
    const { cid, car } = await NFTStorage.encodeBlob(new Blob([data]));

    await this.ipfsClient.storeCar(car, { maxRetries: this.maxRetries });

    return cid.toString();
  }
}
