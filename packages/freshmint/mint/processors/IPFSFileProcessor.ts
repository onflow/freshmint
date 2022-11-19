import * as path from 'path';
import * as fs from 'fs/promises';
import fetch from 'node-fetch';
import * as metadata from '@freshmint/core/metadata';

import IPFS from '../ipfs';
import { FieldProcessor } from '.';

export default class IPFSFileProcessor implements FieldProcessor {
  fieldType: metadata.FieldType = metadata.IPFSFile;

  #nftAssetPath: string;
  #ipfs: IPFS;

  constructor(nftAssetPath: string, ipfs: IPFS) {
    this.#nftAssetPath = nftAssetPath;
    this.#ipfs = ipfs;
  }

  async prepare(value: any): Promise<any> {
    const data = await this.#readFile(value as string);
    return this.#ipfs.getCID(data);
  }

  async process(raw: any, prepared: any): Promise<void> {
    const data = await this.#readFile(raw as string);

    const cid = await this.#ipfs.pin(data);

    if (cid !== prepared) {
      throw new MismatchedCIDError(prepared, cid);
    }
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

export class MismatchedCIDError extends Error {
  expected: string;
  actual: string;

  constructor(expected: string, actual: string) {
    super(`Expected file to have IPFS CID of ${expected} but got ${actual}`);
    this.expected = expected;
    this.actual = actual;
  }
}
