import { existsSync } from 'fs';
import { unlink } from 'fs/promises';
import { IPFSFile, MetadataMap, Schema } from '@freshmint/core/metadata';

import { MetadataLoader } from '../loaders';
import { MetadataProcessor } from '../processors';
import { FlowGateway } from '../../flow';
import { formatClaimKey, generateClaimKeyPairs } from '../claimKeys';
import { Minter, MinterHooks } from '.';
import { writeCSV } from '../csv';

type Edition = {
  id: string;
  size: number;
  count: number;
  rawMetadata: MetadataMap;
  preparedMetadata: MetadataMap;
};

type PreparedEditionEntry = {
  rawMetadata: MetadataMap;
  preparedMetadata: MetadataMap;
  hash: string;
  size: number;
};

type EditionBatch = {
  edition: Edition;
  size: number;
  newCount: number;
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

  async mint(loader: MetadataLoader, withClaimKey: boolean, batchSize: number, hooks: MinterHooks) {
    const entries = await loader.loadEntries();

    const preparedEntries = await this.prepareMetadata(entries);

    const editions = await this.getOrCreateEditions(preparedEntries, hooks);

    const editionsToMint = editions.filter((edition) => edition.count < edition.size);

    const batches = createBatches(editionsToMint, batchSize);

    const newNFTCount = batches.reduce((count, batch) => count + batch.size, 0);

    hooks.onStartMinting(newNFTCount, batches.length, batchSize);

    const timestamp = Date.now();

    const outFile = `mint-${timestamp}.csv`;
    const tempFile = `mint-${timestamp}.tmp.csv`;

    for (const [batchIndex, batch] of batches.entries()) {
      try {
        await this.mintBatch(batchIndex, outFile, tempFile, batch, withClaimKey, hooks.onMintingError);
      } catch (error: any) {
        hooks.onMintingError(error);
        return;
      }

      hooks.onCompleteBatch(batch.size);
    }

    // Remove the temporary file used to store claim keys
    if (existsSync(tempFile)) {
      await unlink(tempFile);
    }
  }

  async getOrCreateEditions(entries: PreparedEditionEntry[], hooks: MinterHooks): Promise<Edition[]> {
    // TODO: improve this function

    const primaryKeys = entries.map((edition) => edition.hash);

    hooks.onStartDuplicateCheck();

    const existingEditions = await this.flowGateway.getEditionsByPrimaryKey(primaryKeys);

    const editions: { [hash: string]: Edition } = {};

    const newEditions: PreparedEditionEntry[] = [];

    let existingEditionCount = 0;
    let existingNFTCount = 0;

    for (const [i, entry] of entries.entries()) {
      const existingEdition = existingEditions[i];

      if (existingEdition) {
        existingEditionCount += 1;
        existingNFTCount += existingEdition.count;

        editions[entry.hash] = {
          ...existingEdition,
          // TODO: the on-chain ID needs to be converted to a string in order to be
          // used as an FCL argument. Find a better way to sanitize this.
          id: existingEdition.id.toString(),
          rawMetadata: entry.rawMetadata,
          preparedMetadata: entry.preparedMetadata,
        };
      } else {
        newEditions.push(entry);
      }
    }

    hooks.onCompleteDuplicateCheck(makeSkippedMessage(existingEditionCount, existingNFTCount));

    if (newEditions.length === 0) {
      return entries.map((entry) => editions[entry.hash]);
    }

    // Process the edition metadata fields (i.e. perform actions such as pinning files to IPFS)
    await this.processMetadata(newEditions, hooks);

    const sizes = newEditions.map((edition) => edition.size);

    const values = this.schema.fields.map((field) => ({
      cadenceType: field.asCadenceTypeObject(),
      values: newEditions.map((edition) => edition.preparedMetadata[field.name]),
    }));

    // Use metadata hash as primary key
    const newPrimaryKeys = newEditions.map((edition) => edition.hash);

    const results = await this.flowGateway.createEditions(newPrimaryKeys, sizes, values);

    results.forEach((result, i) => {
      const newEdition = newEditions[i];

      const edition = {
        id: result.id,
        count: result.count,
        size: result.size,
        rawMetadata: newEdition.rawMetadata,
        preparedMetadata: newEdition.preparedMetadata,
      };

      editions[newEdition.hash] = edition;
    });

    return entries.map((entry) => editions[entry.hash]);
  }

  async prepareMetadata(entries: MetadataMap[]): Promise<PreparedEditionEntry[]> {
    const preparedEntries = await this.metadataProcessor.prepare(entries);

    return preparedEntries.map((entry, i) => {
      // Attach the edition size parsed from the input
      const size = parseInt(entries[i]['edition_size'], 10);

      return {
        ...entry,
        size,
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

  async mintBatch(
    batchIndex: number,
    outFile: string,
    tempFile: string,
    batch: EditionBatch,
    withClaimKey: boolean,
    onError: (error: Error) => void,
  ) {
    if (withClaimKey) {
      return await this.mintNFTsWithClaimKeys(batchIndex, outFile, tempFile, batch, onError);
    }

    return await this.mintNFTs(batchIndex, outFile, batch, onError);
  }

  async mintNFTs(batchIndex: number, outFile: string, batch: EditionBatch, onError: (error: Error) => void) {
    let results;

    try {
      results = await this.flowGateway.mintEdition(batch.edition.id, batch.size);
    } catch (error: any) {
      onError(error);
      return;
    }

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

    await writeCSV(outFile, rows, { append: batchIndex > 0 });
  }

  async mintNFTsWithClaimKeys(
    batchIndex: number,
    outFile: string,
    tempFile: string,
    batch: EditionBatch,
    onError: (error: Error) => void,
  ) {
    const { privateKeys, publicKeys } = generateClaimKeyPairs(batch.size);

    await savePrivateKeysToFile(tempFile, batch, privateKeys);

    let results;

    try {
      results = await this.flowGateway.mintEditionWithClaimKey(batch.edition.id, publicKeys);
    } catch (error: any) {
      onError(error);
      return;
    }

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

    await writeCSV(outFile, rows, { append: batchIndex > 0 });
  }
}

function createBatches(editions: Edition[], batchSize: number): EditionBatch[] {
  return editions.flatMap((edition) => createEditionBatches(edition, batchSize));
}

function createEditionBatches(edition: Edition, batchSize: number): EditionBatch[] {
  const batches: EditionBatch[] = [];

  let count = edition.count;
  let remaining = edition.size - edition.count;

  while (remaining > 0) {
    const size = Math.min(batchSize, remaining);

    count = count + size;
    remaining = remaining - size;

    batches.push({ edition: edition, size, newCount: count });
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
  if (!skippedEditionCount && !skippedNFTCount) {
    return 'Completed duplicate check.';
  }

  if (skippedNFTCount && !skippedEditionCount) {
    return `Skipped ${skippedNFTCount} NFTs because they already exist.`;
  }

  const nftMessage = skippedNFTCount > 1 ? `${skippedNFTCount} NFTs` : '1 NFT';

  return skippedEditionCount > 1
    ? `Skipped ${skippedEditionCount} editions (${nftMessage}) because they already exist.`
    : `Skipped 1 edition (${nftMessage}) because it already exists.`;
}
