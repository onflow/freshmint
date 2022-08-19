import * as path from 'path';
import * as fs from 'fs/promises';
import { metadata } from '../../lib';
import { IPFSFile } from '../../lib/metadata';
import IPFS from '../ipfs';

export default class MetadataProcessor {
  nftAssetPath: string;
  ipfs: IPFS;

  constructor(nftAssetPath: string, ipfs: IPFS) {
    this.nftAssetPath = nftAssetPath;
    this.ipfs = ipfs;
  }

  async process(schema: metadata.Schema, metadata: metadata.MetadataMap) {
    const values: any = {};

    for (const field of schema.getFieldList()) {
      const value = metadata[field.name];

      values[field.name] = await this.processField(field, value);
    }

    return values;
  }

  async processField(field: metadata.Field, value: metadata.MetadataValue) {
    switch (field.type) {
      case IPFSFile:
        return this.processIpfsFile(value as string);
      default:
        return value;
    }
  }

  async processIpfsFile(filename: string) {
    const fullPath = `${this.nftAssetPath}/${filename}`;

    let data: Buffer;

    try {
      data = await fs.readFile(path.resolve(process.cwd(), fullPath));
    } catch (e) {
      throw new Error(`Failed to mint token, failed to read asset file at ${fullPath}`);
    }

    const cid = await this.ipfs.pin(data);

    return cid;
  }
}
