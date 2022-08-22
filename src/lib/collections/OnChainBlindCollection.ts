// @ts-ignore
import * as fcl from '@onflow/fcl';

import { LegacyFreshmintConfig } from '../config';
import NFTCollection from './NFTCollection';
import { BlindNFTContract, NFTMintResult, NFTRevealInput, NFTRevealResult } from '../contracts/BlindNFTContract';
import { FreshmintClient } from '../client';
import * as metadata from '../metadata';
import { PublicKey, HashAlgorithm } from '../crypto';
import { TransactionAuthorizer } from '../transactions';

export class OnChainBlindCollection implements NFTCollection {
  config: LegacyFreshmintConfig;
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
    config: LegacyFreshmintConfig;
    name: string;
    address?: string;
    schema: metadata.Schema;
    owner?: TransactionAuthorizer;
    payer?: TransactionAuthorizer;
    proposer?: TransactionAuthorizer;
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
