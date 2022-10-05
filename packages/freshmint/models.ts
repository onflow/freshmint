import * as metadata from '@freshmint/core/metadata';

export type Edition = {
  editionId: string;
  size: number;
  count: number;
  txId: string;
  hash: string;
  metadata: metadata.MetadataMap;
};

export type NFT = {
  tokenId: string;
  txId: string;
  hash: string;
  metadata: metadata.MetadataMap;
  editionId?: string;
  serialNumber?: string;
  claimKey?: string;
};
