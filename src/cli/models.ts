import { metadata } from '../lib';

export type Edition = {
  editionId: string;
  size: number;
  txId: string;
  hash: string;
  metadata: metadata.MetadataMap;
};

export type NFT = {
  tokenId: string;
  txId: string;
  hash: string;
  metadata: metadata.MetadataMap;
  claimKey: string;
};
