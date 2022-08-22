// @ts-ignore
import * as fcl from '@onflow/fcl';

import { LegacyFreshmintConfig } from '../config';
import NFTCollection from './NFTCollection';
import {
  EditionInput,
  EditionNFT,
  EditionNFTContract,
  EditionResult,
  NFTMintResult,
} from '../contracts/EditionNFTContract';
import { FreshmintClient } from '../client';
import * as metadata from '../metadata';
import { PublicKey, HashAlgorithm } from '../crypto';
import { TransactionAuthorizer } from '../transactions';

export class EditionCollection implements NFTCollection {
  config: LegacyFreshmintConfig;
  client: FreshmintClient;
  contract: EditionNFTContract;

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

    this.contract = new EditionNFTContract({
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
}
