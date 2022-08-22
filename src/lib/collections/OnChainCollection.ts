// @ts-ignore
import * as fcl from '@onflow/fcl';

import { Authorizer, Config } from '@fresh-js/core';
import { PublicKey, HashAlgorithm } from '@fresh-js/crypto';

import * as metadata from '../metadata';
import { StandardNFTContract, NFTMintResult } from '../contracts/StandardNFTContract';
import { FreshmintClient } from '../client';
import NFTCollection from './NFTCollection';

export class OnChainCollection implements NFTCollection {
  config: Config;
  client: FreshmintClient;
  contract: StandardNFTContract;

  constructor({
    config,
    name,
    address,
    schema,
    owner,
    payer,
    proposer,
  }: {
    config: Config;
    name: string;
    address?: string;
    schema: metadata.Schema;
    owner?: Authorizer;
    payer?: Authorizer;
    proposer?: Authorizer;
  }) {
    this.config = config;

    fcl.config().put('accessNode.api', config.host);

    this.client = FreshmintClient.fromFCL(fcl, { imports: config.contracts });

    this.contract = new StandardNFTContract({
      name,
      address,
      schema,
      owner,
      payer,
      proposer,
    });
  }

  async getContract(options?: { saveAdminResourceToContractAccount?: boolean }): Promise<string> {
    return this.contract.getSource(this.config.contracts, options);
  }

  async deployContract(
    publicKey: PublicKey,
    hashAlgo: HashAlgorithm,
    options?: {
      saveAdminResourceToContractAccount?: boolean;
    },
  ): Promise<string> {
    return this.client.send(this.contract.deploy(publicKey, hashAlgo, options));
  }

  async mintNFTs(metadata: metadata.MetadataMap[]): Promise<NFTMintResult[]> {
    return this.client.send(this.contract.mintNFTs(metadata));
  }
}
