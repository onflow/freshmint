import * as path from 'path';
import * as fs from 'fs/promises';
import fetch from 'node-fetch';
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
    const data = await this.#readFile(value as string);

    const cid = await this.#ipfs.pin(data);

    return cid;
  }

  async #readFile(value: string): Promise<Buffer> {
    if (isURL(value)) {
      return this.#readRemoteFile(value);
    }

    return this.#readLocalFile(value);
  }

  async #readLocalFile(filename: string): Promise<Buffer> {
    const fullPath = `${this.#nftAssetPath}/${filename}`;

    try {
      return await fs.readFile(path.resolve(process.cwd(), fullPath));
    } catch (e) {
      throw new Error(`Failed to read asset file at ${fullPath}`);
    }
  }

  async #readRemoteFile(url: string): Promise<Buffer> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}

function isURL(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}
