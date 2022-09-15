import { createObjectCsvWriter as createCsvWriter } from 'csv-writer';
import { NFTStorage } from 'nft.storage';

import { FreshmintConfig } from './config';
import { metadata } from '../lib';
import FlowGateway from './flow';
import IPFS from './ipfs';
import { Minter, createMinter } from './minters';
import { MetadataProcessor } from './processors';
import IPFSFileProcessor from './processors/IPFSFileProcessor';
import Storage from './storage';
import * as models from './models';

export default class Fresh {
  config: FreshmintConfig;
  network: string;

  storage: Storage;

  constructor(config: FreshmintConfig, network: string) {
    this.config = config;
    this.network = network;

    this.storage = new Storage('freshdb', { baseSelector: { network: this.network } });
  }

  getMinter(): Minter {
    const metadataProcessor = new MetadataProcessor(this.config.contract.schema);

    if (this.config.contract.schema.includesFieldType(metadata.IPFSFile)) {
      const ipfsClient = new NFTStorage({
        endpoint: this.config.ipfsPinningService.endpoint,
        token: this.config.ipfsPinningService.key,
      });

      const ipfs = new IPFS(ipfsClient);

      const ipfsFileProcessor = new IPFSFileProcessor(this.config.nftAssetPath, ipfs);

      metadataProcessor.addFieldProcessor(ipfsFileProcessor);
    }

    const flowGateway = new FlowGateway(this.network);

    return createMinter(this.config.contract, metadataProcessor, flowGateway, this.storage);
  }

  async getNFT(tokenId: string): Promise<models.NFT> {
    // TODO: display user-friendly message if token not found
    return await this.storage.loadNFTById(tokenId);
  }

  async dumpNFTs(csvPath: string, tail = 0) {
    let nfts = await this.storage.loadAllNFTs();

    if (nfts.length === 0) {
      return 0;
    }

    // If tail parameter N is greater than zero,
    // only dump the last N records.
    //
    // TODO: optimize this; NFTs should be sorted and sliced in DB.
    if (tail > 0) {
      nfts = nfts.slice(-tail);
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
