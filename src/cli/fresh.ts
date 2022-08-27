import { NFTStorage } from 'nft.storage';
import { createObjectCsvWriter as createCsvWriter } from 'csv-writer';

import FlowGateway from './flow';
import IPFS from './ipfs';
import { Config } from './config';
import { Minter, createMinter } from './minters';
import Storage from './storage';
import CSVLoader from './loaders/CSVLoader';
import { MetadataProcessor } from './processors';
import { metadata } from '../lib';
import IPFSFileProcessor from './processors/IPFSFileProcessor';

export default class Fresh {
  config: Config;
  network: string;

  flowGateway: FlowGateway;
  storage: Storage;
  minter: Minter;

  constructor(config: Config, network: string) {
    this.network = network;

    this.flowGateway = new FlowGateway(this.network);

    this.storage = new Storage('freshdb', { baseSelector: { network: this.network } });

    const schema = config.contract.schema;

    const metadataProcessor = new MetadataProcessor(config.contract.schema);

    if (schema.includesFieldType(metadata.IPFSFile)) {
      const ipfsClient = new NFTStorage({
        token: config.ipfsPinningService.key,
        endpoint: config.ipfsPinningService.endpoint,
      });

      const ipfs = new IPFS(ipfsClient);

      const ipfsFileProcessor = new IPFSFileProcessor(config.nftAssetPath, ipfs);

      metadataProcessor.addFieldProcessor(ipfsFileProcessor);
    }

    this.minter = createMinter(config.contract, metadataProcessor, this.flowGateway, this.storage);
  }

  async mintNFTsFromCSVFile(
    csvPath: string,
    withClaimKey: boolean,
    onStart: (total: number, skipped: number, batchCount: number, batchSize: number) => void,
    onBatchComplete: (batchSize: number) => void,
    onError: (error: Error) => void,
    batchSize = 10,
  ) {
    const loader = new CSVLoader(csvPath);
    await this.minter.mint(loader, withClaimKey, onStart, onBatchComplete, onError, batchSize);
  }

  async getNFT(tokenId: string) {
    // TODO: display user-friendly message if token not found
    const nft = await this.storage.loadNFTById(tokenId);

    return {
      id: tokenId,
      metadata: nft.metadata,
    };
  }

  async dumpNFTs(csvPath: string) {
    const nfts = await this.storage.loadAllNFTs();

    if (nfts.length === 0) {
      return 0;
    }

    const firstNft = nfts[0];

    const metadataHeaders = Object.keys(firstNft.metadata).map((key) => {
      return { id: key, title: key };
    });

    const csvWriter = createCsvWriter({
      path: csvPath,
      header: [
        { id: 'tokenID', title: 'token_id' },
        ...metadataHeaders,
        { id: 'transactionID', title: 'transaction_id' },
        { id: 'claimKey', title: 'claim_key' },
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
}
