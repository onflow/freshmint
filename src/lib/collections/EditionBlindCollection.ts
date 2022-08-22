// @ts-ignore
import * as fcl from '@onflow/fcl';

import { LegacyFreshmintConfig } from '../config';
import NFTCollection from './NFTCollection';
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
import { HashAlgorithm, PublicKey } from '../crypto';
import * as metadata from '../metadata';
import { TransactionAuthorizer } from '../transactions';

export class EditionBlindCollection implements NFTCollection {
  config: LegacyFreshmintConfig;
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
