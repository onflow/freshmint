// @ts-ignore
import * as fcl from '@onflow/fcl';

import { Authorizer, Config } from '@fresh-js/core';
import { PublicKey, HashAlgorithm } from '../crypto';

import { FreshmintClient } from '../client';
import { BlindNFTContract, NFTMintResult, NFTRevealInput, NFTRevealResult } from '../contracts/BlindNFTContract';
import * as metadata from '../metadata';
import NFTCollection from './NFTCollection';

export class OnChainBlindCollection implements NFTCollection {
  config: Config;
  client: FreshmintClient;
  contract: BlindNFTContract;

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

    this.contract = new BlindNFTContract({
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
    placeholderImage: string,
    options?: {
      saveAdminResourceToContractAccount?: boolean;
    },
  ): Promise<string> {
    return this.client.send(this.contract.deploy(publicKey, hashAlgo, placeholderImage, options));
  }

  async mintNFTs(metadata: metadata.MetadataMap[]): Promise<NFTMintResult[]> {
    return this.client.send(this.contract.mintNFTs(metadata));
  }

  async revealNFTs(nfts: NFTRevealInput[]): Promise<NFTRevealResult[]> {
    return this.client.send(this.contract.revealNFTs(nfts));
  }
}
