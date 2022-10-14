import { NFTStorage } from 'nft.storage';
import * as metadata from '@freshmint/core/metadata';

import { FreshmintConfig } from './config';
import { FlowGateway } from './flow';
import IPFS from './ipfs';
import { Minter, createMinter } from './minters';
import { MetadataProcessor } from './processors';
import IPFSFileProcessor from './processors/IPFSFileProcessor';

export default class Fresh {
  config: FreshmintConfig;
  network: string;
  flowGateway: FlowGateway;

  constructor(config: FreshmintConfig, network: string) {
    this.config = config;
    this.network = network;
    this.flowGateway = new FlowGateway(this.network);
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

    return createMinter(this.config.contract, metadataProcessor, this.flowGateway);
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
