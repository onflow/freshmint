import * as path from 'path';
import { existsSync } from 'fs';
import { unlink } from 'fs/promises';
import { IPFSFile, MetadataMap, Schema } from '@freshmint/core/metadata';

import { MetadataProcessor } from '../processors';
import { FlowGateway } from '../../flow';
import { formatClaimKey, generateClaimKeyPairs } from '../claimKeys';
import { Minter, MinterHooks } from '.';
import { readCSV, writeCSV } from '../csv';

type Edition = {
  id: string;
  size: number;
  limit: number;
  rawMetadata: MetadataMap;
  preparedMetadata: MetadataMap;
};

type PreparedEditionEntry = {
  rawMetadata: MetadataMap;
  preparedMetadata: MetadataMap;
  hash: string;
  limit: number;
};

type EditionBatch = {
  edition: Edition;
  size: number;
};

export class EditionMinter implements Minter {
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

    const { existingEditions, newEditionEntries } = await this.filterDuplicateEditions(preparedEntries);

    const existingEditionCount = existingEditions.length;
    const existingNFTCount = existingEditions.reduce((totalSize, edition) => totalSize + edition.size, 0);
    const totalNFTCount = preparedEntries.reduce((totalLimit, edition) => totalLimit + edition.limit, 0);
    const newNFTCount = totalNFTCount - existingNFTCount;

    hooks.onCompleteDuplicateCheck(makeSkippedMessage(existingEditionCount, existingNFTCount));

    const newEditions = await this.createEditions(newEditionEntries, hooks);

    const editions = [...existingEditions, ...newEditions];

    const editionsToMint = editions.filter((edition) => edition.size < edition.limit);

    const batches = createBatches(editionsToMint, batchSize);

    const csvTempFile = `${csvOutputFile}.tmp`;

    hooks.onStartMinting(newNFTCount, batches.length, batchSize);

    for (const [batchIndex, batch] of batches.entries()) {
      if (withClaimKeys) {
        await this.mintNFTsWithClaimKeys(batchIndex, csvOutputFile, csvTempFile, batch);
      } else {
        await this.mintNFTs(batchIndex, csvOutputFile, batch);
      }

      hooks.onCompleteBatch(batch.size);
    }

    // Remove the temporary file used to store claim keys
    if (existsSync(csvTempFile)) {
      await unlink(csvTempFile);
    }
  }

  async filterDuplicateEditions(
    entries: PreparedEditionEntry[],
  ): Promise<{ existingEditions: Edition[]; newEditionEntries: PreparedEditionEntry[] }> {
    const mintIds = entries.map((edition) => edition.hash);

    const results = await this.flowGateway.getEditionsByMintId(mintIds);

    const existingEditions: Edition[] = [];
    const newEditionEntries: PreparedEditionEntry[] = [];

    for (const [i, entry] of entries.entries()) {
      const existingEdition = results[i];

      if (existingEdition) {
        existingEditions.push({
          ...existingEdition,
          // TODO: the on-chain ID needs to be converted to a string in order to be
          // used as an FCL argument. Find a better way to sanitize this.
          id: existingEdition.id.toString(),
          rawMetadata: entry.rawMetadata,
          preparedMetadata: entry.preparedMetadata,
        });
      } else {
        newEditionEntries.push(entry);
      }
    }

    return {
      existingEditions,
      newEditionEntries,
    };
  }

  async createEditions(entries: PreparedEditionEntry[], hooks: MinterHooks): Promise<Edition[]> {
    if (entries.length === 0) {
      return [];
    }

    // Process the edition metadata fields (i.e. perform actions such as pinning files to IPFS)
    await this.processMetadata(entries, hooks);

    const limits = entries.map((edition) => edition.limit);

    const values = this.schema.fields.map((field) => ({
      cadenceType: field.asCadenceTypeObject(),
      // Note: to select a metadata value, use `field.getValue(edition.preparedMetadata)` 
      // instead of `edition.preparedMetadata[field.name]` so that the value is parsed
      // to its correct type.
      values: entries.map((edition) => field.getValue(edition.preparedMetadata)),
    }));

    // Use metadata hash as mint ID
    const mintIds = entries.map((edition) => edition.hash);

    hooks.onStartEditionCreation(entries.length);

    const results = await this.flowGateway.createEditions(mintIds, limits, values);

    hooks.onCompleteEditionCreation();

    return results.map((result, i) => {
      const edition = entries[i];

      return {
        id: result.id,
        limit: result.limit,
        size: result.size,
        rawMetadata: edition.rawMetadata,
        preparedMetadata: edition.preparedMetadata,
      };
    });
  }

  async prepareMetadata(entries: MetadataMap[]): Promise<PreparedEditionEntry[]> {
    const preparedEntries = await this.metadataProcessor.prepare(entries);

    return preparedEntries.map((entry, i) => {
      // Attach the edition size parsed from the input
      const limit = parseInt(entries[i]['edition_size'], 10);

      return {
        ...entry,
        limit,
      };
    });
  }

  async processMetadata(entries: PreparedEditionEntry[], hooks: MinterHooks) {
    const ipfsFields = this.schema.fields.filter((field) => field.type == IPFSFile);
    const ipfsFileCount = entries.length * ipfsFields.length;

    if (ipfsFileCount > 0) {
      hooks.onStartPinning(ipfsFileCount);
    }

    await this.metadataProcessor.process(entries);

    if (ipfsFileCount > 0) {
      hooks.onCompletePinning();
    }
  }

  async mintNFTs(batchIndex: number, csvOutputFile: string, batch: EditionBatch) {
    const results = await this.flowGateway.mintEdition(batch.edition.id, batch.size);

    const rows = results.map((result: any) => {
      const { id, serialNumber, transactionId } = result;

      return {
        _id: id,
        _edition_id: batch.edition.id,
        _serial_number: serialNumber,
        _transaction_id: transactionId,
        ...batch.edition.preparedMetadata,
      };
    });

    await writeCSV(csvOutputFile, rows, { append: batchIndex > 0 });
  }

  async mintNFTsWithClaimKeys(batchIndex: number, csvOutputFile: string, csvTempFile: string, batch: EditionBatch) {
    const { privateKeys, publicKeys } = generateClaimKeyPairs(batch.size);

    await savePrivateKeysToFile(csvTempFile, batch, privateKeys);

    const results = await this.flowGateway.mintEditionWithClaimKey(batch.edition.id, publicKeys);

    const rows = results.map((result: any, i: number) => {
      const { id, serialNumber, transactionId } = result;

      return {
        _id: id,
        _edition_id: batch.edition.id,
        _serial_number: serialNumber,
        _transaction_id: transactionId,
        _claim_key: formatClaimKey(id, privateKeys[i]),
        ...batch.edition.preparedMetadata,
      };
    });

    await writeCSV(csvOutputFile, rows, { append: batchIndex > 0 });
  }
}

function createBatches(editions: Edition[], batchSize: number): EditionBatch[] {
  return editions.flatMap((edition) => createEditionBatches(edition, batchSize));
}

function createEditionBatches(edition: Edition, batchSize: number): EditionBatch[] {
  const batches: EditionBatch[] = [];

  let count = edition.size;
  let remaining = edition.limit - edition.size;

  while (remaining > 0) {
    const size = Math.min(batchSize, remaining);

    count = count + size;
    remaining = remaining - size;

    batches.push({ edition: edition, size });
  }

  return batches;
}

async function savePrivateKeysToFile(filename: string, batch: EditionBatch, privateKeys: string[]) {
  const rows = privateKeys.map((privateKey) => ({
    _edition_id: batch.edition.id,
    _partial_claim_key: privateKey,
  }));

  return writeCSV(filename, rows);
}

function makeSkippedMessage(skippedEditionCount: number, skippedNFTCount: number): string {
  if (skippedEditionCount === 0 && skippedNFTCount === 0) {
    return 'No duplicate editions or NFTs found.';
  }

  if (skippedNFTCount > 0 && skippedEditionCount === 0) {
    return `Skipped ${skippedNFTCount} NFTs because they already exist.`;
  }

  const nftMessage = skippedNFTCount > 1 ? `${skippedNFTCount} NFTs` : '1 NFT';

  return skippedEditionCount > 1
    ? `Skipped ${skippedEditionCount} editions (${nftMessage}) because they already exist.`
    : `Skipped 1 edition (${nftMessage}) because it already exists.`;
}
