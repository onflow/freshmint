import { hashMetadata, MetadataMap, Schema } from '@freshmint/core/metadata';

import { MetadataLoader, Entry } from '../loaders';
import { FlowGateway } from '../flow';
import Storage from '../storage';
import * as models from '../models';
import { formatClaimKey, generateClaimKeyPairs } from '../claimKeys';
import { MetadataProcessor } from '../processors';

type EditionBatch = {
  edition: models.Edition;
  size: number;
  newCount: number;
};

type EditionInput = {
  size: number;
  hash: string;
  metadata: MetadataMap;
};

export class EditionMinter {
  schema: Schema;
  metadataProcessor: MetadataProcessor;
  flowGateway: FlowGateway;
  storage: Storage;

  constructor(schema: Schema, metadataProcessor: MetadataProcessor, flowGateway: FlowGateway, storage: Storage) {
    this.schema = schema;
    this.metadataProcessor = metadataProcessor;
    this.flowGateway = flowGateway;

    this.storage = storage;
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

    const editionInputs = this.prepare(entries);

    const editions = await this.getOrCreateEditions(editionInputs);
    const editionsToMint = editions.filter((edition) => edition.count < edition.size);

    const totalNFTCount = editions.reduce((size, edition) => size + edition.size, 0);

    const batches = createBatches(editionsToMint, batchSize);

    const newNFTCount = batches.reduce((count, batch) => count + batch.size, 0);
    const skippedNFTCount = totalNFTCount - newNFTCount;

    onStart(newNFTCount, skippedNFTCount, batches.length, batchSize);

    for (const batch of batches) {
      let results;

      try {
        results = await this.mintBatch(batch, withClaimKey);
      } catch (error: any) {
        onError(error);
        return;
      }

      await this.storage.updateEditionCount(batch.edition.editionId, batch.newCount);

      const finalResults = results.map((result: any) => {
        const { tokenId, serialNumber, txId, claimKey } = result;

        return {
          tokenId,
          txId,
          hash: batch.edition.hash,
          metadata: batch.edition.metadata,
          editionId: batch.edition.editionId,
          serialNumber,
          claimKey,
        };
      });

      for (const result of finalResults) {
        await this.storage.saveNFT(result);
      }

      onBatchComplete(batch.size);
    }
  }

  async getOrCreateEditions(
    editionInputs: { size: number; hash: string; metadata: MetadataMap }[],
  ): Promise<models.Edition[]> {
    // TODO: improve this function

    const editionMap: { [hash: string]: models.Edition } = {};

    const newEditions: EditionInput[] = [];

    for (const editionInput of editionInputs) {
      const edition = await this.storage.loadEditionByHash(editionInput.hash);
      if (edition) {
        editionMap[edition.hash] = edition;
      } else {
        newEditions.push(editionInput);
      }
    }

    const processedEditions = await Promise.all(
      newEditions.map(async (edition) => ({
        ...edition,
        metadata: await this.metadataProcessor.process(edition.metadata),
      })),
    );

    const sizes = processedEditions.map((edition) => edition.size);

    const values = this.schema.fields.map((field) => ({
      cadenceType: field.asCadenceTypeObject(),
      values: processedEditions.map((edition) => field.getValue(edition.metadata)),
    }));

    const result = await this.flowGateway.createEditions(sizes, values);

    const createdEditions = formatEditionResults(result.id, result.events, processedEditions);

    for (const createdEdition of createdEditions) {
      // Save new editions with a count of zero
      const edition = { ...createdEdition, count: 0 };

      editionMap[createdEdition.hash] = edition;

      await this.storage.saveEdition(edition);
    }

    return editionInputs.map((editionInput) => editionMap[editionInput.hash]);
  }

  prepare(entries: Entry[]): EditionInput[] {
    return entries.map((values) => {
      const metadata: MetadataMap = {};

      this.schema.fields.forEach((field) => {
        const value = field.getValue(values);

        metadata[field.name] = value;
      });

      const hash = hashMetadata(this.schema, metadata).toString('hex');

      const size = parseInt(values.edition_size, 10);

      return {
        size,
        hash,
        metadata,
      };
    });
  }

  async mintBatch(batch: EditionBatch, withClaimKey: boolean) {
    if (withClaimKey) {
      return await this.mintTokensWithClaimKey(batch);
    }

    return await this.mintTokens(batch);
  }

  async mintTokens(batch: EditionBatch) {
    const minted = await this.flowGateway.mintEdition(batch.edition.editionId, batch.size);
    return formatMintResults(minted);
  }

  async mintTokensWithClaimKey(batch: EditionBatch) {
    const { privateKeys, publicKeys } = generateClaimKeyPairs(batch.size);

    const minted = await this.flowGateway.mintEditionWithClaimKey(batch.edition.editionId, publicKeys);

    const results = formatMintResults(minted);

    return results.map((result: any, i: number) => ({
      ...result,
      claimKey: formatClaimKey(result.tokenId, privateKeys[i]),
    }));
  }
}

function formatEditionResults(txId: string, events: any[], editions: any[]): models.Edition[] {
  const editionEvents = events.filter((event) => event.type.includes('.EditionCreated'));

  return editions.flatMap((edition, i) => {
    // TODO: improve event parsing. Use FCL?
    const editionEvent: any = editionEvents[i];

    const editionStruct = editionEvent.values.value.fields.find((f: any) => f.name === 'edition').value;

    const editionId = editionStruct.value.fields.find((f: any) => f.name === 'id').value.value;

    return {
      editionId,
      size: edition.size,
      count: edition.count,
      txId,
      metadata: edition.metadata,
      hash: edition.hash,
    };
  });
}

function formatMintResults(txOutput: any) {
  const mints = txOutput.events.filter((event: any) => event.type.includes('.Minted'));

  return mints.map((mint: any) => {
    // TODO: improve event parsing. Use FCL?
    const tokenId = mint.values.value.fields.find((f: any) => f.name === 'id').value;
    const serialNumber = mint.values.value.fields.find((f: any) => f.name === 'serialNumber').value;

    return {
      tokenId: tokenId.value,
      serialNumber: serialNumber.value,
      txId: txOutput.id,
    };
  });
}

function createBatches(editions: models.Edition[], batchSize: number): EditionBatch[] {
  return editions.flatMap((edition) => createEditionBatches(edition, batchSize));
}

function createEditionBatches(edition: models.Edition, batchSize: number): EditionBatch[] {
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
