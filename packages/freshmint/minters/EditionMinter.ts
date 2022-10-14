import { existsSync } from 'fs';
import { unlink } from 'fs/promises';
import { hashMetadata, Schema } from '@freshmint/core/metadata';

import { MetadataLoader, Entry } from '../loaders';
import { FlowGateway } from '../flow';
import { formatClaimKey, generateClaimKeyPairs } from '../claimKeys';
import { MetadataProcessor } from '../processors';
import { Minter, PreparedMetadata, preparedValues, writeCSV } from '.';

type Edition = {
  id: string;
  size: number;
  count: number;
  metadata: PreparedMetadata;
};

type EditionBatch = {
  edition: Edition;
  size: number;
  newCount: number;
};

type PreparedEditionEntry = {
  metadata: PreparedMetadata;
  hash: string;
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
    loader: MetadataLoader,
    withClaimKey: boolean,
    onStart: (total: number, batchCount: number, batchSize: number, message?: string) => void,
    onBatchComplete: (batchSize: number) => void,
    onError: (error: Error) => void,
    batchSize = 10,
  ) {
    const entries = await loader.loadEntries();

    const preparedEntries = await this.prepareMetadata(entries);

    const editions = await this.getOrCreateEditions(preparedEntries);

    const editionsToMint = editions.filter((edition) => edition.count < edition.size);

    const totalNFTCount = editions.reduce((size, edition) => size + edition.size, 0);

    const batches = createBatches(editionsToMint, batchSize);

    const newNFTCount = batches.reduce((count, batch) => count + batch.size, 0);
    const skippedEditionCount = editions.length - editionsToMint.length;
    const skippedNFTCount = totalNFTCount - newNFTCount;

    onStart(newNFTCount, batches.length, batchSize, makeSkippedMessage(skippedEditionCount, skippedNFTCount));

    const timestamp = Date.now();

    const outFile = `mint-${timestamp}.csv`;
    const tempFile = `mint-${timestamp}.tmp.csv`;

    for (const [batchIndex, batch] of batches.entries()) {
      try {
        await this.mintBatch(batchIndex, outFile, tempFile, batch, withClaimKey, onError);
      } catch (error: any) {
        onError(error);
        return;
      }

      onBatchComplete(batch.size);
    }

    // Remove the temporary file used to store claim keys
    if (existsSync(tempFile)) {
      await unlink(tempFile);
    }
  }

  async getOrCreateEditions(entries: PreparedEditionEntry[]): Promise<Edition[]> {
    // TODO: improve this function

    const hashes = entries.map((edition) => edition.hash);

    const existingEditions = await this.flowGateway.getEditionsByHash(hashes);

    const editions: { [hash: string]: Edition } = {};

    const newEditions: PreparedEditionEntry[] = [];

    for (const [i, entry] of entries.entries()) {
      const existingEdition = existingEditions[i];

      if (existingEdition) {
        editions[entry.hash] = {
          ...existingEdition,
          // TODO: the on-chain ID needs to be converted to a string in order to be
          // used as an FCL argument. Find a better way to sanitize this.
          id: existingEdition.id.toString(),
          metadata: entry.metadata,
        };
      } else {
        newEditions.push(entry);
      }
    }

    // Process all edition metadata
    for (const newEdition of newEditions) {
      await this.metadataProcessor.process(newEdition.metadata);
    }

    const sizes = newEditions.map((edition) => edition.size);

    const values = this.schema.fields.map((field) => ({
      cadenceType: field.asCadenceTypeObject(),
      values: newEditions.map((edition) => edition.metadata[field.name].prepared),
    }));

    const results = await this.flowGateway.createEditions(sizes, values);

    results.forEach((result, i) => {
      const newEdition = newEditions[i];

      const edition = {
        id: result.id,
        count: result.count,
        size: result.size,
        metadata: newEdition.metadata,
      };

      editions[newEdition.hash] = edition;
    });

    return entries.map((entry) => editions[entry.hash]);
  }

  async prepareMetadata(entries: Entry[]): Promise<PreparedEditionEntry[]> {
    return Promise.all(
      entries.map(async (entry: Entry) => {
        const metadata = await this.metadataProcessor.prepare(entry);
        const hash = hashMetadata(this.schema, preparedValues(metadata)).toString('hex');

        const size = parseInt(entry.edition_size, 10);

        return {
          metadata,
          hash,
          size,
        };
      }),
    );
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
        ...preparedValues(batch.edition.metadata),
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
        ...preparedValues(batch.edition.metadata),
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

async function savePrivateKeysToFile(filename: string, batch: EditionBatch, privateKeys: string[]): Promise<void> {
  const rows = privateKeys.map((privateKey) => ({
    _edition_id: batch.edition.id,
    _partial_claim_key: privateKey,
  }));

  return writeCSV(filename, rows);
}

function makeSkippedMessage(skippedEditionCount: number, skippedNFTCount: number): string {
  if (!skippedEditionCount && !skippedNFTCount) {
    return '';
  }

  if (skippedNFTCount && !skippedEditionCount) {
    return `Skipped ${skippedNFTCount} NFTs because they have already been minted.`;
  }

  const nftMessage = skippedNFTCount > 1 ? `${skippedNFTCount} NFTs` : '1 NFT';

  return skippedEditionCount > 1
    ? `Skipped ${skippedEditionCount} editions (${nftMessage}) because they have already been minted.`
    : `Skipped 1 edition (${nftMessage}) because it has already been minted.`;
}
