import { createObjectCsvWriter as createCsvWriter } from 'csv-writer';
import { NFTStorage } from 'nft.storage';
import * as metadata from '@freshmint/core/metadata';
import * as fs from 'fs/promises';

// @ts-ignore
import * as mime from 'mime-types';

import { FreshmintConfig } from './config';
import { FlowGateway, FlowNetwork } from './flow';
import IPFS from './ipfs';
import { Minter, createMinter } from './minters';
import { MetadataProcessor } from './processors';
import IPFSFileProcessor from './processors/IPFSFileProcessor';
import Storage from './storage';
import * as models from './models';
import { FlowJSONConfig } from './flow/config';
import { FreshmintError } from './errors';
import { envsubst } from './envsubst';
import { CollectionMetadata } from '@freshmint/core';

const flowJSONConfigPath = 'flow.json';

export default class Fresh {
  config: FreshmintConfig;
  network: FlowNetwork;
  flowGateway: FlowGateway;

  storage: Storage;

  constructor(config: FreshmintConfig, network: FlowNetwork) {
    this.config = config;
    this.network = network;
    this.flowGateway = new FlowGateway(this.network);

    this.storage = new Storage('freshdb', { baseSelector: { network: this.network } });
  }

  getMinter(): Minter {
    const metadataProcessor = new MetadataProcessor(this.config.contract.schema);

    if (this.config.contract.schema.includesFieldType(metadata.IPFSFile)) {
      const endpoint = new URL(envsubst(this.config.ipfsPinningService.endpoint));
      const token = envsubst(this.config.ipfsPinningService.key);

      const ipfsClient = new NFTStorage({
        endpoint,
        token,
      });

      const ipfs = new IPFS(ipfsClient);

      const ipfsFileProcessor = new IPFSFileProcessor(this.config.nftAssetPath, ipfs);

      metadataProcessor.addFieldProcessor(ipfsFileProcessor);
    }

    return createMinter(this.config.contract, metadataProcessor, this.flowGateway, this.storage);
  }

  async deploy() {
    const contractName = this.config.contract.name;
    const flowConfig = await FlowJSONConfig.load(flowJSONConfigPath);

    const contractPath = flowConfig.getContract(contractName);

    if (!contractPath) {
      throw new FreshmintError(`Contract ${contractName} is not defined in flow.json.`);
    }

    const collectionMetadata: CollectionMetadata = {
      name: this.config.collection.name,
      description: this.config.collection.description,
      url: this.config.collection.url,
      squareImage: {
        url: this.config.collection.images.square,
        type: mime.lookup(this.config.collection.images.square),
      },
      bannerImage: {
        url: this.config.collection.images.banner,
        type: mime.lookup(this.config.collection.images.banner),
      },
      socials: this.config.collection.socials,
    };

    const contract = await fs.readFile(contractPath, 'utf-8');

    await this.flowGateway.deploy(contractName, contract, collectionMetadata, []);
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
}
