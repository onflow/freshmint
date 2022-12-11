import * as path from 'path';
import { existsSync } from 'fs';
import { unlink } from 'fs/promises';
import { MetadataMap, Field, Schema } from '@freshmint/core/metadata';

import { BatchField, FlowGateway } from '../../flow';
import { formatClaimKey, generateClaimKeyPairs } from '../claimKeys';
import { MetadataProcessor, PreparedEntry } from '../processors';
import { readCSV, writeCSV } from '../csv';

export type StandardHooks = {
  onStartDuplicateCheck: () => void;
  onCompleteDuplicateCheck: (skipped: number) => void;
  onStartMinting: (nftCount: number, batchCount: number, batchSize: number) => void;
  onCompleteBatch: (batchSize: number) => void;
  onComplete: (nftCount: number) => void;
};

export class StandardMinter {
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
    hooks: StandardHooks,
  ) {
    const entries = await readCSV(path.resolve(process.cwd(), csvInputFile));

    const preparedEntries = await this.prepareMetadata(entries);

    hooks.onStartDuplicateCheck();

    const newEntries = await this.filterDuplicates(preparedEntries, batchSize);

    const total = newEntries.length;
    const skipped = entries.length - newEntries.length;

    hooks.onCompleteDuplicateCheck(skipped);

    const batches = createBatches<PreparedEntry>(newEntries, batchSize);

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

    hooks.onComplete(total);
  }

  async prepareMetadata(entries: MetadataMap[]): Promise<PreparedEntry[]> {
    return await this.metadataProcessor.prepare(entries);
  }

  async processMetadata(entries: PreparedEntry[]) {
    await this.metadataProcessor.process(entries);
  }

  async mintNFTs(batchIndex: number, csvOutputFile: string, nfts: PreparedEntry[]) {
    const metadataValues = groupMetadataByField(this.schema.fields, nfts);

    // A mint ID is a unique identifier for each NFT used to prevent duplicate mints.
    // We use the metadata hash the mint ID so that users do not need to manually
    // specify a unique ID for each NFT.
    //
    // This means that two NFTs with identical metadata values are considered duplicates.
    //
    const mintIds = nfts.map((nft) => nft.hash);

    const results = await this.flowGateway.mint(mintIds, metadataValues);

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

    // We save claim private keys to a temporary file so that they are recoverable
    // if the mint transaction is lost. Without this, we may publish the public keys
    // but lose the corresponding private keys.
    //
    await savePrivateKeysToFile(csvTempFile, nfts, privateKeys);

    const metadataFields = groupMetadataByField(this.schema.fields, nfts);

    // A mint ID is a unique identifier for each NFT used to prevent duplicate mints.
    // We use the metadata hash the mint ID so that users do not need to manually
    // specify a unique ID for each NFT.
    //
    // This means that two NFTs with identical metadata values are considered duplicates.
    //
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

    const batches = createBatches<string>(mintIds, batchSize);

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

function groupMetadataByField(fields: Field[], entries: PreparedEntry[]): BatchField[] {
  return fields.map((field) => ({
    cadenceType: field.asCadenceTypeObject(),
    values: entries.map((entry) => entry.preparedMetadata[field.name]),
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
