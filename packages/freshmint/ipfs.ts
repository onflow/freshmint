import { Blob, NFTStorage } from 'nft.storage';

export default class IPFS {
  ipfsClient: NFTStorage;

  constructor(ipfsClient: NFTStorage) {
    this.ipfsClient = ipfsClient;
  }

  async getCID(data: Buffer): Promise<string> {
    const { cid } = await NFTStorage.encodeBlob(new Blob([data]));
    return cid.toString();
  }

  async pin(data: Buffer): Promise<string> {
    return await this.ipfsClient.storeBlob(new Blob([data]));
  }
}
