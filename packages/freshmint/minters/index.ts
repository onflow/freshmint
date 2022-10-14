import { createWriteStream } from 'fs';
import * as csv from 'fast-csv';
import { Field, MetadataMap } from '@freshmint/core/metadata';

import { ContractConfig, ContractType } from '../config';
import { BatchField, FlowGateway } from '../flow';
import { EditionMinter } from './EditionMinter';
import { StandardMinter } from './StandardMinter';
import { MetadataProcessor } from '../processors';
import { MetadataLoader } from '../loaders';

export interface PreparedEntry {
  metadata: PreparedMetadata;
}

export type PreparedMetadata = { [name: string]: PreparedMetadataValue };

export type PreparedMetadataValue = {
  raw: any;
  prepared: any;
};

export function preparedValues(preparedMetadata: PreparedMetadata): MetadataMap {
  const metadata: MetadataMap = {};

  for (const name in preparedMetadata) {
    metadata[name] = preparedMetadata[name].prepared;
  }

  return metadata;
}

export function groupMetadataByField(fields: Field[], nfts: PreparedEntry[]): BatchField[] {
  return fields.map((field) => ({
    field,
    values: nfts.map((nft) => nft.metadata[field.name].prepared),
  }));
}

export function createBatches<T>(items: T[], batchSize: number): T[][] {
  const batches = [];
  while (items.length > 0) {
    const batch = items.splice(0, batchSize);
    batches.push(batch);
  }
  return batches;
}

export async function writeCSV(filename: string, rows: any[], { append = false } = {}) {
  return new Promise<void>((resolve) => {
    const csvStream = csv.format({ headers: !append, includeEndRowDelimiter: true });
    const writeStream = createWriteStream(filename, append ? { flags: 'a' } : {});

    csvStream.pipe(writeStream).on('finish', resolve);

    for (const row of rows) {
      csvStream.write(row);
    }

    csvStream.end();
  });
}

export interface Minter {
  mint(
    loader: MetadataLoader,
    withClaimKey: boolean,
    onStart: (total: number, batchCount: number, batchSize: number, message?: string) => void,
    onBatchComplete: (batchSize: number) => void,
    onError: (error: Error) => void,
    batchSize: number,
  ): Promise<void>;
}

export function createMinter(
  contract: ContractConfig,
  metadataProcessor: MetadataProcessor,
  flowGateway: FlowGateway,
): Minter {
  switch (contract.type) {
    case ContractType.Standard:
      return new StandardMinter(contract.schema, metadataProcessor, flowGateway);
    case ContractType.Edition:
      return new EditionMinter(contract.schema, metadataProcessor, flowGateway);
  }
}
