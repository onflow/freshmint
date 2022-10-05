import { Blob, NFTStorage } from 'nft.storage';

export default class IPFS {
  ipfsClient: NFTStorage;

  constructor(ipfsClient: NFTStorage) {
    this.ipfsClient = ipfsClient;
  }

  async pin(data: Buffer): Promise<string> {
    return await this.ipfsClient.storeBlob(new Blob([data]));
  }
}
