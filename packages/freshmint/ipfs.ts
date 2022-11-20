import { Blob, NFTStorage } from 'nft.storage';
import { pack } from 'ipfs-car/pack';
import { CarReader } from '@ipld/car';
import { CID } from 'multiformats';

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

  async computeCID(file: Buffer): Promise<string> {
    const { cid } = await NFTStorage.encodeBlob(new Blob([file]));
    return cid.toString();
  }

  async uploadFiles(files: Buffer[], expectedCIDs: string[]) {
    const blobs = files.map((data) => new Blob([data]));

    const { out } = await pack({ input: blobs, wrapWithDirectory: false });

    const carReader = await CarReader.fromIterable(out);

    // Assert that packed CIDs match expected CIDs of individual files
    for (const rawCid of expectedCIDs) {
      const cid = CID.parse(rawCid);

      const hasCid = carReader.has(cid);

      if (!hasCid) {
        throw new MissingCIDError(cid);
      }
    }

    // @ts-ignore
    await this.ipfsClient.storeCar(carReader, { maxRetries: this.maxRetries });
  }
}

export class MissingCIDError extends Error {
  cid: CID;

  constructor(cid: CID) {
    super(`Expected CAR file to contain CID ${cid.toString()}`);
    this.cid = cid;
  }
}
