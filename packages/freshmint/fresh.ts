import { NFTStorage } from 'nft.storage';
import * as metadata from '@freshmint/core/metadata';
import * as fs from 'fs/promises';

// @ts-ignore
import * as mime from 'mime-types';

import { FreshmintConfig } from './config';
import { FlowGateway, FlowNetwork } from './flow';
import IPFS from './ipfs';
import { Minter, createMinter } from './mint';
import { MetadataProcessor } from './mint/processors';
import IPFSFileProcessor from './mint/processors/IPFSFileProcessor';
import { FlowJSONConfig } from './flow/config';
import { FreshmintError } from './errors';
import { envsubst } from './envsubst';
import { CollectionMetadata } from '@freshmint/core';

const flowJSONConfigPath = 'flow.json';

export default class Fresh {
  config: FreshmintConfig;
  network: FlowNetwork;
  flowGateway: FlowGateway;

  constructor(config: FreshmintConfig, network: FlowNetwork) {
    this.config = config;
    this.network = network;
    this.flowGateway = new FlowGateway(this.network);
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

    return createMinter(this.config.contract, metadataProcessor, this.flowGateway);
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
