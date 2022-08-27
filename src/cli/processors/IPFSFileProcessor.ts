import * as path from 'path';
import * as fs from 'fs/promises';
import IPFS from '../ipfs';
import { metadata } from '../../lib';
import { FieldProcessor } from '.';

export default class IPFSFileProcessor implements FieldProcessor {
  fieldType: metadata.FieldType = metadata.IPFSFile;

  #nftAssetPath: string;
  #ipfs: IPFS;

  constructor(nftAssetPath: string, ipfs: IPFS) {
    this.#nftAssetPath = nftAssetPath;
    this.#ipfs = ipfs;
  }

  async process(value: metadata.MetadataValue): Promise<metadata.MetadataValue> {
    const filename = value as string;

    const fullPath = `${this.#nftAssetPath}/${filename}`;

    let data: Buffer;

    try {
      data = await fs.readFile(path.resolve(process.cwd(), fullPath));
    } catch (e) {
      throw new Error(`Failed to mint token, failed to read asset file at ${fullPath}`);
    }

    const cid = await this.#ipfs.pin(data);

    return cid;
  }
}
