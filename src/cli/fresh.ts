// @ts-ignore
import { NFTStorage } from 'nft.storage';

import { createObjectCsvWriter as createCsvWriter } from 'csv-writer';
import FlowMinter from './flow';

import DataStore from './datastore';
import getConfig from './config';
import { ECPrivateKey, signatureAlgorithms } from './flow/crypto';
import Metadata from './metadata';
import IPFS from './ipfs';
import { metadata } from '../lib';

export default class Fresh {
  network: string;
  config: any;
  datastore: any;
  flowMinter: FlowMinter;
  metadata: Metadata;

  constructor(network: string) {
    this.network = network;

    this.config = getConfig();

    this.datastore = new DataStore('freshdb');
    this.flowMinter = new FlowMinter(this.network);

    const ipfsClient = new NFTStorage({
      token: this.config.pinningService.key,
      endpoint: this.config.pinningService.endpoint,
    });

    const ipfs = new IPFS(ipfsClient);

    this.metadata = new Metadata(this.config.schema, this.config.nftAssetPath, ipfs);
  }

  //////////////////////////////////////////////
  // ------ Deployment
  //////////////////////////////////////////////

  async deployContracts() {
    await this.flowMinter.deployContracts();
  }

  //////////////////////////////////////////////
  // ------ NFT Creation
  //////////////////////////////////////////////

  async createNFTsFromCSVFile(
    csvPath: string,
    withClaimKey: boolean,
    onStart: (total: number, skipped: number, batchCount: number, batchSize: number) => void,
    onBatchComplete: (batchSize: number) => void,
    onError: (error: Error) => void,
    batchSize = 10,
  ) {
    const { fields, tokens } = await this.metadata.parse(csvPath);

    const newTokens = [];

    for (const token of tokens) {
      const exists = await this.nftExists(token.hash);
      if (!exists) {
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

      const finalResults = results.map((result: any, index: number) => {
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
        await this.datastore.save(result);
      }

      onBatchComplete(batchSize);
    }
  }

  async nftExists(hash: string) {
    const exists = await this.datastore.find({ hash });
    return exists.length !== 0;
  }

  async processTokenBatch(batch: any) {
    return await Promise.all(
      batch.map(async (token: any) => ({
        ...token,
        metadata: await this.metadata.process(token.metadata),
      })),
    );
  }

  async createTokenBatch(batchFields: any, withClaimKey: boolean) {
    if (withClaimKey) {
      return await this.mintTokensWithClaimKey(batchFields);
    }

    return await this.mintTokens(batchFields);
  }

  //////////////////////////////////////////////
  // -------- NFT Retreival
  //////////////////////////////////////////////

  async getNFT(tokenId: string) {
    const results = await this.datastore.find({ tokenId });

    if (results.length === 0) {
      throw new Error(`Token ${tokenId} does not exist`);
    }

    const nft = results[0];

    return {
      id: tokenId,
      metadata: nft.metadata,
    };
  }

  async getNFTMetadata(
    tokenId: string,
  ): Promise<{ id: string; schema: metadata.Schema; metadata: metadata.MetadataMap }> {
    const { metadata } = await this.getNFT(tokenId);

    return {
      id: tokenId,
      schema: this.config.schema,
      metadata,
    };
  }

  async dumpNFTs(csvPath: string) {
    const nfts = await this.datastore.all();

    if (nfts.length === 0) {
      return 0;
    }

    const firstNft = nfts[0];

    const metadataHeaders = Object.keys(firstNft.metadata).map((key) => {
      return { id: key, title: key.toUpperCase() };
    });

    const csvWriter = createCsvWriter({
      path: csvPath,
      header: [
        { id: 'tokenID', title: 'TOKEN ID' },
        ...metadataHeaders,
        { id: 'transactionID', title: 'TRANSACTION ID' },
        { id: 'claimKey', title: 'CLAIM KEY' },
      ],
    });

    const records = nfts.map((nft: any) => {
      return {
        tokenID: nft.tokenId,
        ...nft.metadata,
        transactionID: nft.txId,
        claimKey: nft.claimKey,
      };
    });

    await csvWriter.writeRecords(records);

    return nfts.length;
  }

  //////////////////////////////////////////////
  // --------- Smart contract interactions
  //////////////////////////////////////////////

  async mintTokens(batchFields: any[]) {
    const minted = await this.flowMinter.mint(batchFields);
    return formatMintResults(minted);
  }

  async mintTokensWithClaimKey(batchFields: any[]) {
    const batchSize = batchFields[0].values.length;

    const { privateKeys, publicKeys } = generateKeyPairs(batchSize);

    const minted = await this.flowMinter.mintWithClaimKey(publicKeys, batchFields);

    const results = formatMintResults(minted);

    return results.map((result: any, i: number) => ({
      txId: result.txId,
      tokenId: result.tokenId,
      claimKey: formatClaimKey(result.tokenId, privateKeys[i]),
    }));
  }

  defaultOwnerAddress() {
    return this.network === 'testnet'
      ? this.config.testnetFlowAccount.address
      : this.network === 'mainnet'
      ? this.config.mainnetFlowAccount.address
      : this.config.emulatorFlowAccount.address;
  }
}

//////////////////////////////////////////////
// -------- Crypto helpers
//////////////////////////////////////////////

function generateKeyPairs(count: number) {
  const privateKeys = [];
  const publicKeys = [];

  while (count--) {
    const privateKey = ECPrivateKey.generate(signatureAlgorithms.ECDSA_P256);
    const publicKey = privateKey.getPublicKey();

    privateKeys.push(privateKey.toHex());
    publicKeys.push(publicKey.toHex());
  }

  return {
    privateKeys,
    publicKeys,
  };
}

function formatClaimKey(nftId: string, privateKey: string) {
  return `${privateKey}${nftId}`;
}

//////////////////////////////////////////////
// -------- General Helpers
//////////////////////////////////////////////

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

function groupBatchesByField(fields: metadata.Field[], batches: any[]) {
  return fields.map((field) => ({
    ...field,
    values: batches.map((batch) => batch.metadata[field.name]),
  }));
}
