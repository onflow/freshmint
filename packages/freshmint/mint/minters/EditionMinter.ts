import * as path from 'path';
import { existsSync } from 'fs';
import { unlink } from 'fs/promises';
import { MetadataMap, Field, Schema } from '@freshmint/core/metadata';

import { MetadataProcessor } from '../processors';
import { BatchField, FlowGateway } from '../../flow';
import { formatClaimKey, generateClaimKeyPairs } from '../claimKeys';
import { readCSV, writeCSV } from '../csv';
import { FreshmintError } from '../../errors';

interface EditionEntry {
  limit: number | null;
  size: number;
  rawMetadata: MetadataMap;
  preparedMetadata: MetadataMap;
  hash: string;
  csvLineNumber: number;
}

interface Edition {
  id: string;
  limit: number | null;
  currentSize: number;
  targetSize: number;
  rawMetadata: MetadataMap;
  preparedMetadata: MetadataMap;
  transactionId?: string;
  csvLineNumber: number;
}

type EditionBatch = {
  edition: Edition;
  size: number;
};

export type EditionHooks = {
  onStartDuplicateCheck: () => void;
  onCompleteDuplicateCheck: (skippedEditions: number, skippedNFTs: number) => void;
  onStartEditionCreation: (count: number) => void;
  onCompleteEditionCreation: (count: number) => void;
  onStartMinting: (total: number, batchCount: number, batchSize: number) => void;
  onCompleteBatch: (batchSize: number) => void;
  onComplete: (editionCount: number, nftCount: number) => void;
};

export class InvalidEditionLimitError extends FreshmintError {
  constructor(value: string, csvLineNumber: number) {
    super(`Invalid edition on line ${csvLineNumber}: size must be a number, received "${value}".`);
  }
}

export class ExceededEditionLimitError extends FreshmintError {
  constructor(edition: Edition) {
    super(
      `Invalid edition on line ${edition.csvLineNumber} (with on-chain ID ${edition.id}): target size ${edition.targetSize} exceeds edition limit of ${edition.limit} (defined during first minting and non-modifiable thereafter).`,
    );
  }
}

export class EditionMinter {
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
    hooks: EditionHooks,
  ) {
    const entries = await readCSV(path.resolve(process.cwd(), csvInputFile));

    const editionEntries = await this.prepareMetadata(entries);

    hooks.onStartDuplicateCheck();

    const { existingEditions, newEditionEntries } = await this.filterDuplicateEditions(editionEntries);

    const existingEditionCount = existingEditions.length;
    const existingNFTCount = existingEditions.reduce((totalSize, edition) => totalSize + edition.currentSize, 0);

    hooks.onCompleteDuplicateCheck(existingEditionCount, existingNFTCount);

    hooks.onStartEditionCreation(newEditionEntries.length);

    const newEditions = await this.createEditionTemplates(newEditionEntries);

    hooks.onCompleteEditionCreation(newEditionEntries.length);

    // Combine existing and new editions into a single array
    const editions = [...existingEditions, ...newEditions];

    // Throw an error if any edition target size is larger than its limit
    for (const edition of editions) {
      if (edition.limit !== null && edition.targetSize > edition.limit) {
        throw new ExceededEditionLimitError(edition);
      }
    }

    // Remove editions that have already reached their size limit
    const editionsToMint = editions.filter((edition) => {
      if (edition.limit === null) {
        return true;
      }

      return edition.currentSize < edition.limit;
    });

    const nftCount = await this.mintInBatches(editionsToMint, csvOutputFile, withClaimKeys, batchSize, hooks);

    hooks.onComplete(newEditions.length, nftCount);
  }

  async mintInBatches(
    editions: Edition[],
    csvOutputFile: string,
    withClaimKeys: boolean,
    batchSize: number,
    hooks: EditionHooks,
  ): Promise<number> {
    const batches = createBatches(editions, batchSize);

    // Create a temporary file to store claim keys
    const csvTempFile = `${csvOutputFile}.tmp`;

    const nftCount = batches.reduce((count, batch) => count + batch.size, 0);

    hooks.onStartMinting(nftCount, batches.length, batchSize);

    for (const [batchIndex, batch] of batches.entries()) {
      if (withClaimKeys) {
        await this.mintBatchWithClaimKeys(batchIndex, batch, csvOutputFile, csvTempFile);
      } else {
        await this.mintBatch(batchIndex, batch, csvOutputFile);
      }

      hooks.onCompleteBatch(batch.size);
    }

    // Remove the temporary file used to store claim keys
    if (existsSync(csvTempFile)) {
      await unlink(csvTempFile);
    }

    return nftCount;
  }

  async filterDuplicateEditions(
    entries: EditionEntry[],
  ): Promise<{ existingEditions: Edition[]; newEditionEntries: EditionEntry[] }> {
    const mintIds = entries.map((edition) => edition.hash);

    const results = await this.flowGateway.getEditionsByMintId(mintIds);

    const existingEditions: Edition[] = [];
    const newEditionEntries: EditionEntry[] = [];

    for (const [i, entry] of entries.entries()) {
      const existingEdition = results[i];

      if (existingEdition) {
        existingEditions.push({
          // TODO: the on-chain ID needs to be converted to a string in order to be
          // used as an FCL argument. Find a better way to sanitize this.
          id: existingEdition.id.toString(),
          limit: existingEdition.limit,
          currentSize: existingEdition.size,
          targetSize: entry.size,
          rawMetadata: entry.rawMetadata,
          preparedMetadata: entry.preparedMetadata,
          csvLineNumber: entry.csvLineNumber,
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

  async createEditionTemplates(entries: EditionEntry[]): Promise<Edition[]> {
    if (entries.length === 0) {
      return [];
    }

    // Process the edition metadata fields (i.e. perform actions such as pinning files to IPFS)
    await this.processMetadata(entries);

    const limits = entries.map((edition) => (edition.limit === null ? edition.limit : edition.limit.toString()));

    const metadataValues = groupMetadataByField(this.schema.fields, entries);

    // A mint ID is a unique identifier for each edition used to prevent duplicate mints.
    // We use the metadata hash the mint ID so that users do not need to manually
    // specify a unique ID for each edition.
    //
    // This means that two editions with identical metadata values are considered duplicates.
    //
    const mintIds = entries.map((edition) => edition.hash);

    const results = await this.flowGateway.createEditions(mintIds, limits, metadataValues);

    return results.map((result, i) => {
      const entry = entries[i];

      return {
        id: result.id,
        limit: result.limit,
        currentSize: result.size,
        targetSize: entry.size,
        transactionId: result.transactionId,
        rawMetadata: entry.rawMetadata,
        preparedMetadata: entry.preparedMetadata,
        csvLineNumber: entry.csvLineNumber,
      };
    });
  }

  async writeEditionTemplates(editions: Edition[], csvOutputFile: string) {
    const rows = editions.map((edition: any) => {
      return {
        _id: edition.id,
        _edition_id: edition.id,
        _edition_limit: edition.limit,
        _transaction_id: edition.transactionId,
        ...edition.preparedMetadata,
      };
    });

    await writeCSV(csvOutputFile, rows);
  }

  async prepareMetadata(entries: MetadataMap[]): Promise<EditionEntry[]> {
    const preparedEntries = await this.metadataProcessor.prepare(entries);

    const csvHeaderLines = 1;

    return preparedEntries.map((entry, i) => {
      const csvLineNumber = i + 1 + csvHeaderLines;

      // Attach the edition limit and size parsed from the input
      const size = parseInt(entries[i]['edition_size'], 10);
      const limit = parseEditionLimit(entries[i]['edition_limit'], size, csvLineNumber);

      return {
        ...entry,
        csvLineNumber,
        size,
        limit,
      };
    });
  }

  async processMetadata(entries: EditionEntry[]) {
    await this.metadataProcessor.process(entries);
  }

  async mintBatch(batchIndex: number, batch: EditionBatch, csvOutputFile: string) {
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

  async mintBatchWithClaimKeys(batchIndex: number, batch: EditionBatch, csvOutputFile: string, csvTempFile: string) {
    const { privateKeys, publicKeys } = generateClaimKeyPairs(batch.size);

    // We save claim private keys to a temporary file so that they are recoverable
    // if the mint transaction is lost. Without this, we may publish the public keys
    // but lose the corresponding private keys.
    //
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

  let remaining = edition.targetSize - edition.currentSize;

  while (remaining > 0) {
    const size = Math.min(batchSize, remaining);

    remaining = remaining - size;

    batches.push({ edition: edition, size });
  }

  return batches;
}

function groupMetadataByField(fields: Field[], entries: EditionEntry[]): BatchField[] {
  return fields.map((field) => ({
    cadenceType: field.asCadenceTypeObject(),
    values: entries.map((entry) => entry.preparedMetadata[field.name]),
  }));
}

async function savePrivateKeysToFile(filename: string, batch: EditionBatch, privateKeys: string[]) {
  const rows = privateKeys.map((privateKey) => ({
    _edition_id: batch.edition.id,
    _partial_claim_key: privateKey,
  }));

  return writeCSV(filename, rows);
}

// Parse the edition limit from a string value.
//
// The edition limit must be an integer or "null".
//
function parseEditionLimit(value: string | undefined, size: number, csvLineNumber: number): number | null {
  // If limit is undefined, use size as limit
  if (value === undefined) {
    return size;
  }

  if (value === 'null') {
    return null;
  }

  const limit = parseInt(value, 10);
  if (isNaN(limit)) {
    throw new InvalidEditionLimitError(value, csvLineNumber);
  }

  return limit;
}
