import { metadata } from '../../lib';
import { hashMetadata } from '../../lib/metadata';
import { Entry, parseCSVEntries } from '../metadata/parse';
import MetadataProcessor from '../metadata/MetadataProcessor';
import { formatClaimKey, generateClaimKeyPairs } from '../claimKeys';
import FlowGateway from '../flow';
import IPFS from '../ipfs';
import { Storage } from '../storage';
import * as models from '../models';

export class StandardMinter {
  schema: metadata.Schema;
  processor: MetadataProcessor;
  flowGateway: FlowGateway;
  storage: Storage;

  constructor(schema: metadata.Schema, nftAssetPath: string, ipfs: IPFS, flowGateway: FlowGateway, storage: Storage) {
    this.schema = schema;
    this.processor = new MetadataProcessor(schema, nftAssetPath, ipfs);
    this.flowGateway = flowGateway;
    this.storage = storage;
  }

  async mint(
    csvPath: string,
    withClaimKey: boolean,
    onStart: (total: number, skipped: number, batchCount: number, batchSize: number) => void,
    onBatchComplete: (batchSize: number) => void,
    onError: (error: Error) => void,
    batchSize = 10,
  ) {
    const fields = this.schema.getFieldList();

    const entries = parseCSVEntries(csvPath);

    const tokens = this.prepare(entries);

    const newTokens = [];

    for (const token of tokens) {
      const existingNFT = await this.storage.loadNFTByHash(token.hash);
      if (!existingNFT) {
        newTokens.push(token);
      }
    }

    const total = newTokens.length;
    const skipped = tokens.length - newTokens.length;

    const batches = [];

    while (newTokens.length > 0) {
      const batch = newTokens.splice(0, batchSize);
      batches.push(batch);
    }

    onStart(total, skipped, batches.length, batchSize);

    for (const batch of batches) {
      const batchSize = batch.length;

      const processedBatch = await this.processTokenBatch(batch);

      const batchFields = groupBatchesByField(fields, processedBatch);

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

  prepare(entries: Entry[]) {
    const fields = this.schema.getFieldList();

    return entries.map((values) => {
      const metadata: metadata.MetadataMap = {};

      fields.forEach((field) => {
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
        metadata: await this.processor.process(token.metadata),
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

function groupBatchesByField(fields: metadata.Field[], batches: any[]) {
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
