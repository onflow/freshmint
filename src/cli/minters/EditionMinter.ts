import { metadata } from '../../lib';
import { hashMetadata } from '../../lib/metadata';
import { Entry, parseCSVEntries } from '../metadata/parse';
import MetadataProcessor from '../metadata/MetadataProcessor';
import FlowGateway from '../flow';
import IPFS from '../ipfs';
import { hashValues } from '../../lib/hash';
import { UInt64Value } from '../../lib/cadence/values';
import { Storage } from '../storage';
import * as models from '../models';
import { formatClaimKey, generateClaimKeyPairs } from '../claimKeys';

type EditionNFT = {
  editionId: string;
  editionSerial: string;
  metadata: metadata.MetadataMap;
  hash: string;
};

export class EditionMinter {
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
    const entries = parseCSVEntries(csvPath);

    const editionInputs = this.prepare(entries);

    const editions = await this.getOrCreateEditions(editionInputs);

    const tokens = [];

    for (const edition of editions) {
      tokens.push(...getEditionNFTs(edition));
    }

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

      const batchFields = {
        editionIds: batch.map((nft: EditionNFT) => nft.editionId),
        editionSerials: batch.map((nft: EditionNFT) => nft.editionSerial),
      };

      let results;

      try {
        results = await this.createTokenBatch(withClaimKey, batchFields);
      } catch (error: any) {
        onError(error);
        return;
      }

      const finalResults = results.map((result: any, index: number) => {
        const { tokenId, txId, claimKey } = result;

        const token = batch[index];

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

  async getOrCreateEditions(
    editionInputs: { size: number; hash: string; metadata: metadata.MetadataMap }[],
  ): Promise<models.Edition[]> {
    // TODO: improve this function

    const editionMap: { [hash: string]: models.Edition } = {};

    const newEditions = [];

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
        metadata: await this.processor.process(edition.metadata),
      })),
    );

    const fields = this.schema.getFieldList();

    const sizes = processedEditions.map((edition) => edition.size);

    const values = fields.map((field) => ({
      cadenceType: field.asCadenceTypeObject(),
      values: processedEditions.map((edition) => field.getValue(edition.metadata)),
    }));

    const result = await this.flowGateway.createEditions(sizes, values);

    const createdEditions = formatEditionResults(result.id, result.events, processedEditions);

    for (const createdEdition of createdEditions) {
      editionMap[createdEdition.hash] = createdEdition;

      await this.storage.saveEdition(createdEdition);
    }

    return editionInputs.map((editionInput) => editionMap[editionInput.hash]);
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

      const size = parseInt(values.edition_size, 10);

      return {
        size,
        hash,
        metadata,
      };
    });
  }

  async createTokenBatch(withClaimKey: boolean, batchFields: { editionIds: string[]; editionSerials: string[] }) {
    if (withClaimKey) {
      return await this.mintTokensWithClaimKey(batchFields);
    }

    return await this.mintTokens(batchFields);
  }

  async mintTokens(batchFields: { editionIds: string[]; editionSerials: string[] }) {
    const minted = await this.flowGateway.mintEdition(batchFields.editionIds, batchFields.editionSerials);
    return formatMintResults(minted);
  }

  async mintTokensWithClaimKey(batchFields: { editionIds: string[]; editionSerials: string[] }) {
    const batchSize = batchFields.editionIds.length;

    const { privateKeys, publicKeys } = generateClaimKeyPairs(batchSize);

    const minted = await this.flowGateway.mintEditionWithClaimKey(
      publicKeys,
      batchFields.editionIds,
      batchFields.editionSerials,
    );

    const results = formatMintResults(minted);

    return results.map((result: any, i: number) => ({
      txId: result.txId,
      tokenId: result.tokenId,
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
      txId,
      metadata: edition.metadata,
      hash: edition.hash,
    };
  });
}

function formatMintResults(txOutput: any) {
  const deposits = txOutput.events.filter((event: any) => event.type.includes('.Deposit'));

  return deposits.map((deposit: any) => {
    // TODO: improve event parsing. Use FCL?
    const tokenId = deposit.values.value.fields.find((f: any) => f.name === 'id').value;

    return {
      tokenId: tokenId.value,
      txId: txOutput.id,
    };
  });
}

function getEditionNFTs(edition: models.Edition): EditionNFT[] {
  const nfts = Array(edition.size);

  const editionIdBytes = new UInt64Value(edition.editionId).toBytes();

  for (let i = 0; i < edition.size; i++) {
    const editionSerial = String(i + 1);
    const editionSerialBytes = new UInt64Value(editionSerial).toBytes();

    nfts[i] = {
      editionId: edition.editionId,
      editionSerial: editionSerial,
      metadata: {
        // TODO: improve this. Find a way to avoid saving it here.
        edition_id: edition.editionId,
        edition_serial: editionSerial,
        ...edition.metadata,
      },
      hash: hashValues([editionIdBytes, editionSerialBytes]).toString('hex'),
    };
  }

  return nfts;
}
