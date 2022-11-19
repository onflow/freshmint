import { Field, hashMetadata, MetadataMap, Schema } from '@freshmint/core/metadata';

import { formatClaimKey, generateClaimKeyPairs } from '../claimKeys';
import { FlowGateway } from '../flow';
import Storage from '../storage';
import * as models from '../models';
import { MetadataLoader, Entry } from '../loaders';
import { MetadataProcessor } from '../processors';

type NFTInput = {
  hash: string;
  metadata: MetadataMap;
};

export class StandardMinter {
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

    const tokens = this.prepare(entries);

    const newTokens: NFTInput[] = [];

    for (const token of tokens) {
      const existingNFT = await this.storage.loadNFTByHash(token.hash);
      if (!existingNFT) {
        newTokens.push(token);
      }
    }

    const total = newTokens.length;
    const skipped = tokens.length - newTokens.length;

    const batches: NFTInput[][] = [];

    while (newTokens.length > 0) {
      const batch = newTokens.splice(0, batchSize);
      batches.push(batch);
    }

    onStart(total, skipped, batches.length, batchSize);

    for (const batch of batches) {
      const batchSize = batch.length;

      const processedBatch = await this.processTokenBatch(batch);

      const batchFields = groupBatchesByField(this.schema.fields, processedBatch);

      let results;

      try {
        results = await this.createTokenBatch(batchFields, withClaimKey);
      } catch (error: any) {
        onError(error);
        return;
      }

      const finalResults: models.NFT[] = results.map((result: any, index: number) => {
        const { tokenId, txId, claimKey } = result;

        const token = processedBatch[index];

        return {
          tokenId,
          txId,
          hash: token.hash,
          metadata: token.metadata,
          claimKey,
        };
      });

      for (const result of finalResults) {
        await this.storage.saveNFT(result);
      }

      onBatchComplete(batchSize);
    }
  }

  prepare(entries: Entry[]): NFTInput[] {
    return entries.map((values) => {
      const metadata: MetadataMap = {};

      this.schema.fields.forEach((field) => {
        const value = field.getValue(values);

        metadata[field.name] = value;
      });

      const hash = hashMetadata(this.schema, metadata).toString('hex');

      return {
        hash,
        metadata,
      };
    });
  }

  async processTokenBatch(batch: any) {
    return await Promise.all(
      batch.map(async (token: any) => ({
        ...token,
        metadata: await this.metadataProcessor.process(token.metadata),
      })),
    );
  }

  async createTokenBatch(batchFields: any, withClaimKey: boolean) {
    if (withClaimKey) {
      return await this.mintTokensWithClaimKey(batchFields);
    }

    return await this.mintTokens(batchFields);
  }

  async mintTokens(batchFields: any[]) {
    const minted = await this.flowGateway.mint(batchFields);
    return formatMintResults(minted);
  }

  async mintTokensWithClaimKey(batchFields: any[]) {
    const batchSize = batchFields[0].values.length;

    const { privateKeys, publicKeys } = generateClaimKeyPairs(batchSize);

    const minted = await this.flowGateway.mintWithClaimKey(publicKeys, batchFields);

    const results = formatMintResults(minted);

    return results.map((result: any, i: number) => ({
      txId: result.txId,
      tokenId: result.tokenId,
      claimKey: formatClaimKey(result.tokenId, privateKeys[i]),
    }));
  }
}

function groupBatchesByField(fields: Field[], batches: any[]) {
  return fields.map((field) => ({
    ...field,
    values: batches.map((batch) => batch.metadata[field.name]),
  }));
}

function formatMintResults(txOutput: any) {
  const deposits = txOutput.events.filter((event: any) => event.type.includes('.Deposit'));

  return deposits.map((deposit: any) => {
    const tokenId = deposit.values.value.fields.find((f: any) => f.name === 'id').value;

    return {
      tokenId: tokenId.value,
      txId: txOutput.id,
    };
  });
}
