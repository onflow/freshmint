import { existsSync } from 'fs';
import { unlink } from 'fs/promises';
import { Schema, hashMetadata } from '@freshmint/core/metadata';

import { formatClaimKey, generateClaimKeyPairs } from '../claimKeys';
import { FlowGateway } from '../flow';
import { MetadataLoader, Entry } from '../loaders';
import { MetadataProcessor } from '../processors';
import { createBatches, groupMetadataByField, Minter, PreparedEntry, preparedValues, writeCSV } from '.';

export class StandardMinter implements Minter {
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
    withClaimKeys: boolean,
    onStart: (total: number, skipped: number, batchCount: number, batchSize: number) => void,
    onBatchComplete: (batchSize: number) => void,
    onError: (error: Error) => void,
    batchSize = 10,
  ) {
    const entries = await loader.loadEntries();

    const preparedEntries = await this.prepareMetadata(entries);

    const newEntries = await this.filterDuplicates(preparedEntries, batchSize);

    const total = newEntries.length;
    const skipped = entries.length - newEntries.length;

    const batches = createBatches(newEntries, batchSize);

    onStart(total, skipped, batches.length, batchSize);

    const timestamp = Date.now();

    const outFile = `mint-${timestamp}.csv`;
    const tempFile = `mint-${timestamp}.tmp.csv`;

    for (const [batchIndex, nfts] of batches.entries()) {

      // Process the NFT metadata fields (i.e. perform actions such as pinning files to IPFS).
      await this.processMetadata(nfts);

      if (withClaimKeys) {
        await this.mintNFTsWithClaimKeys(batchIndex, outFile, tempFile, nfts, onError)
      } else {
        await this.mintNFTs(batchIndex, outFile, nfts, onError);
      }

      const batchSize = nfts.length;

      onBatchComplete(batchSize);
    }

    // Remove the temporary file used to store claim keys
    if (existsSync(tempFile)) {
      await unlink(tempFile);
    }
  }

  async prepareMetadata(entries: Entry[]): Promise<PreparedEntry[]> {
    return Promise.all(
      entries.map(async (entry: Entry) => {
        const metadata = await this.metadataProcessor.prepare(entry)
        const hash = hashMetadata(this.schema, preparedValues(metadata)).toString('hex');

        return {
          metadata,
          hash,
        }
      })
    );
  }

  async processMetadata(entries: PreparedEntry[]): Promise<void> {
    for (const entry of entries) {
      await this.metadataProcessor.process(entry.metadata);
    }
  }

  async mintNFTs(batchIndex: number, outFile: string, nfts: PreparedEntry[], onError: (error: Error) => void) {
    const metadataFields = groupMetadataByField(this.schema.fields, nfts);

    let results;

    try {
      results = await this.flowGateway.mint(metadataFields);
    } catch (error: any) {
      onError(error);
      return;
    }

    const rows = results.map((result: any, i: number) => {
      const { id, transactionId } = result;

      const nft = nfts[i];

      return {
        _id: id,
        _transaction_id: transactionId,
        ...preparedValues(nft.metadata),
      };
    });

    await writeCSV(outFile, rows, { append: batchIndex > 0 });
  }

  async mintNFTsWithClaimKeys(batchIndex: number, outFile: string, tempFile: string, nfts: PreparedEntry[], onError: (error: Error) => void) {
    const { privateKeys, publicKeys } = generateClaimKeyPairs(nfts.length);

    await savePrivateKeysToFile(tempFile, nfts, privateKeys);

    const metadataFields = groupMetadataByField(this.schema.fields, nfts);

    let results;

    try {
      results = await this.flowGateway.mintWithClaimKey(publicKeys, metadataFields);
    } catch (error: any) {
      onError(error);
      return;
    }

    const rows = results.map((result: any, i: number) => {
      const { id, transactionId } = result;

      const nft = nfts[i];

      return {
        _id: id,
        _transaction_id: transactionId,
        _claim_key: formatClaimKey(id, privateKeys[i]),
        ...preparedValues(nft.metadata),
      };
    });

    await writeCSV(outFile, rows, { append: batchIndex > 0 });
  }

  // filterDuplicates returns only the NFTs that have not yet been minted.
  async filterDuplicates(nfts: PreparedEntry[], batchSize: number): Promise<PreparedEntry[]> {
    const hashes = nfts.map((nft) => nft.hash);

    const batches = createBatches(hashes, batchSize);

    const duplicates = (await Promise.all(batches.map((batch) => this.flowGateway.getDuplicateNFTs(batch)))).flat();

    return nfts.filter((_, index) => !duplicates[index]);
  }
}

async function savePrivateKeysToFile(filename: string, nfts: PreparedEntry[], privateKeys: string[]): Promise<void> {
  const rows = nfts.map((nft: PreparedEntry, i) => {
    return {
      _partial_claim_key: privateKeys[i],
      ...preparedValues(nft.metadata),
    };
  });

  return writeCSV(filename, rows);
}
