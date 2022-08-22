// @ts-ignore
import * as fcl from '@onflow/fcl';

import { Authorizer, Config } from '@fresh-js/core';
import { PublicKey, HashAlgorithm } from '@fresh-js/crypto';

import * as metadata from '../metadata';
import {
  BlindEditionNFTContract,
  EditionInput,
  EditionNFT,
  EditionResult,
  NFTMintResult,
  NFTRevealInput,
  NFTRevealResult,
} from '../contracts/BlindEditionNFTContract';
import { FreshmintClient } from '../client';
import NFTCollection from './NFTCollection';

export class EditionBlindCollection implements NFTCollection {
  config: Config;
  client: FreshmintClient;
  contract: BlindEditionNFTContract;

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

    this.contract = new BlindEditionNFTContract({
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

  async createEdition(edition: EditionInput): Promise<EditionResult> {
    return this.client.send(this.contract.createEdition(edition));
  }

  async createEditions(editions: EditionInput[]): Promise<EditionResult[]> {
    return this.client.send(this.contract.createEditions(editions));
  }

  async mintNFT(nft: EditionNFT, { bucket }: { bucket?: string } = {}): Promise<NFTMintResult> {
    return this.client.send(this.contract.mintNFT(nft, { bucket }));
  }

  async mintNFTs(nfts: EditionNFT[], { bucket }: { bucket?: string } = {}): Promise<NFTMintResult[]> {
    return this.client.send(this.contract.mintNFTs(nfts, { bucket }));
  }

  async revealNFT(nft: NFTRevealInput): Promise<NFTRevealResult> {
    return this.client.send(this.contract.revealNFT(nft));
  }

  async revealNFTs(nfts: NFTRevealInput[]): Promise<NFTRevealResult[]> {
    return this.client.send(this.contract.revealNFTs(nfts));
  }
}
