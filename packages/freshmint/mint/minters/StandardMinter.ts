import * as path from 'path';
import { existsSync } from 'fs';
import { unlink } from 'fs/promises';
import { MetadataMap, Field, Schema } from '@freshmint/core/metadata';

import { BatchField, FlowGateway } from '../../flow';
import { formatClaimKey, generateClaimKeyPairs } from '../claimKeys';
import { MetadataProcessor, PreparedEntry } from '../processors';
import { Minter, MinterHooks } from '.';
import { readCSV, writeCSV } from '../csv';

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
    csvInputFile: string,
    csvOutputFile: string,
    withClaimKeys: boolean,
    batchSize: number,
    hooks: MinterHooks,
  ) {
    const entries = await readCSV(path.resolve(process.cwd(), csvInputFile));

    const preparedEntries = await this.prepareMetadata(entries);

    hooks.onStartDuplicateCheck();

    const newEntries = await this.filterDuplicates(preparedEntries, batchSize);

    const total = newEntries.length;
    const skipped = entries.length - newEntries.length;

    hooks.onCompleteDuplicateCheck(makeSkippedMessage(skipped));

    const batches = createBatches(newEntries, batchSize);

    const csvTempFile = `${csvOutputFile}.tmp`;

    hooks.onStartMinting(total, batches.length, batchSize);

    for (const [batchIndex, nfts] of batches.entries()) {
      // Process the NFT metadata fields (i.e. perform actions such as pinning files to IPFS)
      await this.processMetadata(nfts);

      if (withClaimKeys) {
        await this.mintNFTsWithClaimKeys(batchIndex, csvOutputFile, csvTempFile, nfts);
      } else {
        await this.mintNFTs(batchIndex, csvOutputFile, nfts);
      }

      const batchSize = nfts.length;

      hooks.onCompleteBatch(batchSize);
    }

    // Remove the temporary file used to store claim keys
    if (existsSync(csvTempFile)) {
      await unlink(csvTempFile);
    }
  }

  async prepareMetadata(entries: MetadataMap[]): Promise<PreparedEntry[]> {
    return await this.metadataProcessor.prepare(entries);
  }

  async processMetadata(entries: PreparedEntry[]) {
    await this.metadataProcessor.process(entries);
  }

  async mintNFTs(batchIndex: number, csvOutputFile: string, nfts: PreparedEntry[]) {
    const metadataFields = groupMetadataByField(this.schema.fields, nfts);

    // Use metadata hash as mint ID
    const mintIds = nfts.map((nft) => nft.hash);

    const results = await this.flowGateway.mint(mintIds, metadataFields);

    const rows = results.map((result: any, i: number) => {
      const { id, transactionId } = result;

      const nft = nfts[i];

      return {
        _id: id,
        _transaction_id: transactionId,
        ...nft.preparedMetadata,
      };
    });

    await writeCSV(csvOutputFile, rows, { append: batchIndex > 0 });
  }

  async mintNFTsWithClaimKeys(batchIndex: number, csvOutputFile: string, csvTempFile: string, nfts: PreparedEntry[]) {
    const { privateKeys, publicKeys } = generateClaimKeyPairs(nfts.length);

    await savePrivateKeysToFile(csvTempFile, nfts, privateKeys);

    const metadataFields = groupMetadataByField(this.schema.fields, nfts);

    // Use metadata hash as mint ID
    const mintIds = nfts.map((nft) => nft.hash);

    const results = await this.flowGateway.mintWithClaimKey(publicKeys, mintIds, metadataFields);

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

    await writeCSV(csvOutputFile, rows, { append: batchIndex > 0 });
  }

  // filterDuplicates returns only the NFTs that have not yet been minted.
  async filterDuplicates(nfts: PreparedEntry[], batchSize: number): Promise<PreparedEntry[]> {
    // Use metadata hash as mint ID
    const mintIds = nfts.map((nft) => nft.hash);

    const batches = createBatches(mintIds, batchSize);

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
    // Note: to select a metadata value, use `field.getValue(nft.preparedMetadata)` 
    // instead of `nft.preparedMetadata[field.name]` so that the value is parsed
    // to its correct type.
    values: nfts.map((nft) => field.getValue(nft.preparedMetadata)),
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
    return 'No duplicate NFTs found.';
  }

  return skippedNFTCount > 1
    ? `Skipped ${skippedNFTCount} NFTs because they already exist.`
    : `Skipped 1 NFT because it already exists.`;
}
