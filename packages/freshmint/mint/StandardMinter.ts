import { existsSync } from 'fs';
import { unlink } from 'fs/promises';
import { MetadataMap, Field, Schema } from '@freshmint/core/metadata';

import { MetadataLoader } from './loaders';
import { BatchField, FlowGateway } from '../flow';
import { formatClaimKey, generateClaimKeyPairs } from '../claimKeys';
import { MetadataProcessor, PreparedEntry } from './processors';
import { Minter } from '.';
import { writeCSV } from './csv';

export class StandardMinter implements Minter {
  schema: Schema;
  metadataProcessor: MetadataProcessor;
  flowGateway: FlowGateway;

  constructor(schema: Schema, metadataProcessor: MetadataProcessor, flowGateway: FlowGateway) {
    this.schema = schema;
    this.metadataProcessor = metadataProcessor;
    this.flowGateway = flowGateway;
  }

  async mint(
    loader: MetadataLoader,
    withClaimKeys: boolean,
    onStart: (total: number, batchCount: number, batchSize: number, message?: string) => void,
    onBatchComplete: (batchSize: number) => void,
    onError: (error: Error) => void,
    batchSize = 10,
  ) {
    const entries = await loader.loadEntries();

    const preparedEntries = await this.prepareMetadata(entries);

    const newEntries = await this.filterDuplicates(preparedEntries, batchSize);

    const total = newEntries.length;
    const skipped = entries.length - newEntries.length;

    const batches = createBatches(newEntries, batchSize);

    onStart(total, batches.length, batchSize, makeSkippedMessage(skipped));

    const timestamp = Date.now();

    const outFile = `mint-${timestamp}.csv`;
    const tempFile = `mint-${timestamp}.tmp.csv`;

    for (const [batchIndex, nfts] of batches.entries()) {
      // Process the NFT metadata fields (i.e. perform actions such as pinning files to IPFS)
      await this.processMetadata(nfts);

      if (withClaimKeys) {
        await this.mintNFTsWithClaimKeys(batchIndex, outFile, tempFile, nfts, onError);
      } else {
        await this.mintNFTs(batchIndex, outFile, nfts, onError);
      }

      const batchSize = nfts.length;

      onBatchComplete(batchSize);
    }

    // Remove the temporary file used to store claim keys
    if (existsSync(tempFile)) {
      await unlink(tempFile);
    }
  }

  async prepareMetadata(entries: MetadataMap[]): Promise<PreparedEntry[]> {
    return await this.metadataProcessor.prepare(entries);
  }

  async processMetadata(entries: PreparedEntry[]) {
    await this.metadataProcessor.process(entries);
  }

  async mintNFTs(batchIndex: number, outFile: string, nfts: PreparedEntry[], onError: (error: Error) => void) {
    const metadataFields = groupMetadataByField(this.schema.fields, nfts);

    let results;

    // Use metadata hash as primary key
    const primaryKeys = nfts.map((nft) => nft.hash);

    try {
      results = await this.flowGateway.mint(primaryKeys, metadataFields);
    } catch (error: any) {
      onError(error);
      return;
    }

    const rows = results.map((result: any, i: number) => {
      const { id, transactionId } = result;

      const nft = nfts[i];

      return {
        _id: id,
        _transaction_id: transactionId,
        ...nft.preparedMetadata,
      };
    });

    await writeCSV(outFile, rows, { append: batchIndex > 0 });
  }

  async mintNFTsWithClaimKeys(
    batchIndex: number,
    outFile: string,
    tempFile: string,
    nfts: PreparedEntry[],
    onError: (error: Error) => void,
  ) {
    const { privateKeys, publicKeys } = generateClaimKeyPairs(nfts.length);

    await savePrivateKeysToFile(tempFile, nfts, privateKeys);

    const metadataFields = groupMetadataByField(this.schema.fields, nfts);

    // Use metadata hash as primary key
    const primaryKeys = nfts.map((nft) => nft.hash);

    let results;

    try {
      results = await this.flowGateway.mintWithClaimKey(publicKeys, primaryKeys, metadataFields);
    } catch (error: any) {
      onError(error);
      return;
    }

    const rows = results.map((result: any, i: number) => {
      const { id, transactionId } = result;

      const nft = nfts[i];

      return {
        _id: id,
        _transaction_id: transactionId,
        _claim_key: formatClaimKey(id, privateKeys[i]),
        ...nft.preparedMetadata,
      };
    });

    await writeCSV(outFile, rows, { append: batchIndex > 0 });
  }

  // filterDuplicates returns only the NFTs that have not yet been minted.
  async filterDuplicates(nfts: PreparedEntry[], batchSize: number): Promise<PreparedEntry[]> {
    // Use metadata hash as primary key
    const primaryKeys = nfts.map((nft) => nft.hash);

    const batches = createBatches(primaryKeys, batchSize);

    const duplicates = (await Promise.all(batches.map((batch) => this.flowGateway.getDuplicateNFTs(batch)))).flat();

    return nfts.filter((_, index) => !duplicates[index]);
  }
}

function createBatches<T>(items: T[], batchSize: number): T[][] {
  const batches = [];
  while (items.length > 0) {
    const batch = items.splice(0, batchSize);
    batches.push(batch);
  }
  return batches;
}

function groupMetadataByField(fields: Field[], nfts: PreparedEntry[]): BatchField[] {
  return fields.map((field) => ({
    field,
    values: nfts.map((nft) => nft.preparedMetadata[field.name]),
  }));
}

async function savePrivateKeysToFile(filename: string, nfts: PreparedEntry[], privateKeys: string[]): Promise<void> {
  const rows = nfts.map((nft: PreparedEntry, i) => {
    return {
      _partial_claim_key: privateKeys[i],
      ...nft.preparedMetadata,
    };
  });

  return writeCSV(filename, rows);
}

function makeSkippedMessage(skippedNFTCount: number): string {
  if (!skippedNFTCount) {
    return '';
  }

  return skippedNFTCount > 1
    ? `Skipped ${skippedNFTCount} NFTs because they have already been minted.`
    : `Skipped 1 NFT because it has already been minted.`;
}
