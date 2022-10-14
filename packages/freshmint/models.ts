import * as metadata from '@freshmint/core/metadata';

export type Edition = {
  id: string;
  size: number;
  count: number;
  txId: string;
  hash: string;
  metadata: metadata.MetadataMap;
};

export type NFT = {
  id: string;
  transactionId: string;
  editionId?: string;
  serialNumber?: string;
  claimKey?: string;
  metadata: metadata.MetadataMap;
};
