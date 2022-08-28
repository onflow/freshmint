import { createObjectCsvWriter as createCsvWriter } from 'csv-writer';
import { NFTStorage } from 'nft.storage';

import { Config } from './config';
import { metadata } from '../lib';
import FlowGateway from './flow';
import IPFS from './ipfs';
import { Minter, createMinter } from './minters';
import { MetadataProcessor } from './processors';
import IPFSFileProcessor from './processors/IPFSFileProcessor';
import Storage from './storage';

export default class Fresh {
  config: Config;
  network: string;

  storage: Storage;

  constructor(config: Config, network: string) {
    this.config = config;
    this.network = network;

    this.storage = new Storage('freshdb', { baseSelector: { network: this.network } });
  }

  getMinter(): Minter {
    const metadataProcessor = new MetadataProcessor(this.config.contract.schema);

    if (this.config.contract.schema.includesFieldType(metadata.IPFSFile)) {
      const [endpoint, key] = Config.resolveLazyFields(
        this.config.ipfsPinningService.endpoint,
        this.config.ipfsPinningService.key,
      );

      const ipfsClient = new NFTStorage({ endpoint, token: key });

      const ipfs = new IPFS(ipfsClient);

      const ipfsFileProcessor = new IPFSFileProcessor(this.config.nftAssetPath, ipfs);

      metadataProcessor.addFieldProcessor(ipfsFileProcessor);
    }

    const flowGateway = new FlowGateway(this.network);

    const storage = new Storage('freshdb', { baseSelector: { network: this.network } });

    const minter = createMinter(this.config.contract, metadataProcessor, flowGateway, storage);

    return minter;
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
