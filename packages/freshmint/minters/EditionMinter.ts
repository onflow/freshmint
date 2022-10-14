import { hashMetadata, Schema } from '@freshmint/core/metadata';

import { MetadataLoader, Entry } from '../loaders';
import { FlowGateway } from '../flow';
import { formatClaimKey, generateClaimKeyPairs } from '../claimKeys';
import { MetadataProcessor } from '../processors';
import { Minter, PreparedMetadata, preparedValues } from '.';

type Edition = {
  id: string;
  size: number;
  count: number;
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
    onStart: (total: number, skipped: number, batchCount: number, batchSize: number) => void,
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
    const skippedNFTCount = totalNFTCount - newNFTCount;

    onStart(newNFTCount, skippedNFTCount, batches.length, batchSize);

    for (const batch of batches) {
      try {
        await this.mintBatch(batch, withClaimKey);
      } catch (error: any) {
        onError(error);
        return;
      }

      // TODO: save results to CSV

      onBatchComplete(batch.size);
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

    results.forEach((edition, i) => {
      const newEdition = newEditions[i];
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

  async mintBatch(batch: EditionBatch, withClaimKey: boolean) {
    if (withClaimKey) {
      return await this.mintTokensWithClaimKey(batch);
    }

    return await this.mintTokens(batch);
  }

  async mintTokens(batch: EditionBatch) {
    return await this.flowGateway.mintEdition(batch.edition.id, batch.size);
  }

  async mintTokensWithClaimKey(batch: EditionBatch) {
    const { privateKeys, publicKeys } = generateClaimKeyPairs(batch.size);

    const results = await this.flowGateway.mintEditionWithClaimKey(batch.edition.id, publicKeys);

    return results.map((result: any, i: number) => ({
      ...result,
      claimKey: formatClaimKey(result.tokenId, privateKeys[i]),
    }));
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
