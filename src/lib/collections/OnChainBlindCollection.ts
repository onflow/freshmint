// @ts-ignore
import * as fcl from '@onflow/fcl';
// @ts-ignore
import * as t from '@onflow/types';

import { Event } from '@fresh-js/core';
import { PublicKey, SignatureAlgorithm, HashAlgorithm } from '@fresh-js/crypto';
import { MetadataMap, hashMetadata } from '../metadata';
import OnChainBlindGenerator from '../generators/OnChainBlindGenerator';
import { BaseCollection } from './NFTCollection';

type HashedNFT = {
  metadata: MetadataMap;
  metadataHash: string;
  metadataSalt: string;
};

type NFTMintResult = {
  id: string;
  metadata: MetadataMap;
  metadataHash: string;
  metadataSalt: string;
  transactionId: string;
};

interface NFTRevealInput {
  id: string;
  metadata: MetadataMap;
  metadataSalt: string;
}

type NFTRevealResult = {
  id: string;
  transactionId: string;
};

export default class OnChainBlindCollection extends BaseCollection {
  async getContract(): Promise<string> {
    return OnChainBlindGenerator.contract({
      contracts: this.config.contracts,
      contractName: this.name,
      schema: this.schema,
    });
  }

  async deployContract(
    publicKey: PublicKey,
    hashAlgo: HashAlgorithm,
    placeholderImage: string,
    options?: {
      saveAdminResourceToContractAccount?: boolean;
    },
  ): Promise<string> {
    const transaction = await OnChainBlindGenerator.deploy();

    const contractCode = await this.getContract();
    const contractCodeHex = Buffer.from(contractCode, 'utf-8').toString('hex');

    const sigAlgo = publicKey.signatureAlgorithm();

    const saveAdminResourceToContractAccount = options?.saveAdminResourceToContractAccount ?? false;

    const response = await fcl.send([
      fcl.transaction(transaction),
      fcl.args([
        fcl.arg(this.name, t.String),
        fcl.arg(contractCodeHex, t.String),
        fcl.arg(publicKey.toHex(), t.String),
        fcl.arg(SignatureAlgorithm.toCadence(sigAlgo), t.UInt8),
        fcl.arg(HashAlgorithm.toCadence(hashAlgo), t.UInt8),
        fcl.arg(placeholderImage, t.String),
        fcl.arg(saveAdminResourceToContractAccount, t.Bool),
      ]),
      fcl.limit(1000),

      ...this.getAuthorizers(),
    ]);

    // TODO: handle error
    const { events } = await fcl.tx(response).onceSealed();

    const accountCreatedEvent: Event = events.find((event: Event) => event.type === 'flow.AccountCreated');

    const address = accountCreatedEvent.data['address'];

    this.setAddress(address);

    return address;
  }

  async mintNFTs(metadata: MetadataMap[]): Promise<NFTMintResult[]> {
    const hashedNFTs = this.hashNFTs(metadata);

    const hashes = hashedNFTs.map((nft) => nft.metadataHash);

    const transaction = await OnChainBlindGenerator.mint({
      contracts: this.config.contracts,
      contractName: this.name,
      // TODO: return error if contract address is not set
      contractAddress: this.address ?? '',
    });

    const response = await fcl.send([
      fcl.transaction(transaction),
      fcl.args([fcl.arg(hashes, t.Array(t.String))]),
      fcl.limit(1000),

      ...this.getAuthorizers(),
    ]);

    const { transactionId } = response;

    // TODO: handle error
    const { events } = await fcl.tx(response).onceSealed();

    return this.formatMintResults(transactionId, events, hashedNFTs);
  }

  private hashNFTs(metadata: MetadataMap[]): HashedNFT[] {
    return metadata.map((metadata) => {
      const { hash, salt } = hashMetadata(this.schema, metadata);

      return {
        metadata,
        metadataHash: hash.toString('hex'),
        metadataSalt: salt.toString('hex'),
      };
    });
  }

  private formatMintResults(transactionId: string, events: Event[], nfts: HashedNFT[]): NFTMintResult[] {
    const deposits = events.filter((event) => event.type.includes('.Minted'));

    return deposits.map((deposit, i) => {
      const { metadata, metadataHash, metadataSalt } = nfts[i];

      return {
        id: deposit.data.id,
        metadata,
        metadataHash,
        metadataSalt,
        transactionId,
      };
    });
  }

  async revealNFTs(nfts: NFTRevealInput[]): Promise<NFTRevealResult[]> {
    const ids = nfts.map((nft) => nft.id);
    const salts = nfts.map((nft) => nft.metadataSalt);

    const transaction = await OnChainBlindGenerator.reveal({
      contracts: this.config.contracts,
      contractName: this.name,
      // TODO: return error if contract address is not set
      contractAddress: this.address ?? '',
      schema: this.schema,
    });

    const response = await fcl.send([
      fcl.transaction(transaction),
      fcl.args([
        fcl.arg(ids, t.Array(t.UInt64)),
        fcl.arg(salts, t.Array(t.String)),
        ...this.schema.getFieldList().map((field) => {
          return fcl.arg(
            nfts.map((nft) => field.getValue(nft.metadata)),
            t.Array(field.asCadenceTypeObject()),
          );
        }),
      ]),
      fcl.limit(1000),

      ...this.getAuthorizers(),
    ]);

    const { transactionId } = response;

    // TODO: handle error
    const { events } = await fcl.tx(response).onceSealed();

    return this.formatRevealtResults(transactionId, events);
  }

  private formatRevealtResults(transactionId: string, events: Event[]): NFTRevealResult[] {
    const deposits = events.filter((event) => event.type.includes('.Revealed'));

    return deposits.map((deposit) => {
      return {
        id: deposit.data.id,
        transactionId,
      };
    });
  }
}
