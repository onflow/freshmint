import { createObjectCsvWriter as createCsvWriter } from 'csv-writer';
import { NFTStorage } from 'nft.storage';
import { CollectionMetadata } from '@freshmint/core';
import * as metadata from '@freshmint/core/metadata';

// @ts-ignore
import mime from 'mime-types';

import { FreshmintConfig } from './config';
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
  flowGateway: FlowGateway;

  storage: Storage;

  constructor(config: FreshmintConfig, network: string) {
    this.config = config;
    this.network = network;
    this.flowGateway = new FlowGateway(this.network);

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

    return createMinter(this.config.contract, metadataProcessor, this.flowGateway, this.storage);
  }

  async getNFT(tokenId: string): Promise<models.NFT | null> {
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

    const isEdition = firstNft.editionId !== undefined;
    const editionHeaders = [
      { id: 'editionId', title: 'edition_id' },
      { id: 'serialNumber', title: 'edition_serial_number' },
    ];

    const metadataHeaders = Object.keys(firstNft.metadata).map((key) => {
      return { id: key, title: key };
    });

    const csvWriter = createCsvWriter({
      path: csvPath,
      header: [
        { id: 'tokenId', title: 'token_id' },
        ...(isEdition ? editionHeaders : []),
        ...metadataHeaders,
        { id: 'txId', title: 'transaction_id' },
        { id: 'claimKey', title: 'claim_key' },
      ],
    });

    const records = nfts.map((nft: any) => {
      return {
        tokenId: nft.tokenId,
        editionId: nft.editionId,
        serialNumber: nft.serialNumber,
        txId: nft.txId,
        claimKey: nft.claimKey,
        ...nft.metadata,
      };
    });

    await csvWriter.writeRecords(records);

    return nfts.length;
  }

  async startDrop(price: string) {
    await this.flowGateway.startDrop('default', price);
  }

  async getDrop() {
    return this.flowGateway.getDrop();
  }

  async stopDrop() {
    await this.flowGateway.stopDrop('default');
  }

  async updateCollection() {
    const collection = this.config.collection;

    const collectonMetadata: CollectionMetadata = {
      name: collection.name,
      description: collection.description,
      url: collection.url,
      squareImage: {
        url: collection.images.square,
        type: mime.lookup(collection.images.square) || '',
      },
      bannerImage: {
        url: collection.images.banner,
        type: mime.lookup(collection.images.banner) || '',
      },
      socials: collection.socials,
    };

    await this.flowGateway.setCollectionMetadata(collectonMetadata);

    return collectonMetadata;
  }
}
