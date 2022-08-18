// @ts-ignore
import * as fcl from '@onflow/fcl';
// @ts-ignore
import * as t from '@onflow/types';

import { Event } from '@fresh-js/core';
import { PublicKey, SignatureAlgorithm, HashAlgorithm } from '@fresh-js/crypto';
import { MetadataMap, hashMetadataWithSalt } from '../metadata';
import OnChainBlindGenerator from '../generators/OnChainBlindGenerator';
import { BaseCollection } from './NFTCollection';
import { Config, ContractImports } from '../config';
import { Transaction, TransactionResult } from '../transactions';

export type HashedNFT = {
  metadata: MetadataMap;
  metadataHash: string;
  metadataSalt: string;
};

export type NFTMintResult = {
  id: string;
  metadata: MetadataMap;
  metadataHash: string;
  metadataSalt: string;
  transactionId: string;
};

export interface NFTRevealInput {
  id: string;
  metadata: MetadataMap;
  metadataSalt: string;
}

export type NFTRevealResult = {
  id: string;
  transactionId: string;
};

export default class OnChainBlindCollection extends BaseCollection {
  getContract(imports: ContractImports, options?: { saveAdminResourceToContractAccount?: boolean }): string {
    return OnChainBlindGenerator.contract({
      contracts: imports,
      contractName: this.name,
      schema: this.schema,
      saveAdminResourceToContractAccount: options?.saveAdminResourceToContractAccount,
    });
  }

  deployContract(
    publicKey: PublicKey,
    hashAlgo: HashAlgorithm,
    placeholderImage: string,
    options?: {
      saveAdminResourceToContractAccount?: boolean;
    },
  ): Transaction<string> {
    return new Transaction(
      (config: Config) => {
        const script = OnChainBlindGenerator.deploy();

        const saveAdminResourceToContractAccount = options?.saveAdminResourceToContractAccount ?? false;

        const contractCode = this.getContract(config.imports, { saveAdminResourceToContractAccount });
        const contractCodeHex = Buffer.from(contractCode, 'utf-8').toString('hex');

        const sigAlgo = publicKey.signatureAlgorithm();

        return {
          script,
          args: [
            fcl.arg(this.name, t.String),
            fcl.arg(contractCodeHex, t.String),
            fcl.arg(publicKey.toHex(), t.String),
            fcl.arg(SignatureAlgorithm.toCadence(sigAlgo), t.UInt8),
            fcl.arg(HashAlgorithm.toCadence(hashAlgo), t.UInt8),
            fcl.arg(placeholderImage, t.String),
            fcl.arg(saveAdminResourceToContractAccount, t.Bool),
          ],
          computeLimit: 1000,
          signers: this.getSigners(),
        };
      },
      ({ events }: TransactionResult) => {
        const accountCreatedEvent = events.find((event: Event) => event.type === 'flow.AccountCreated');

        const address = accountCreatedEvent?.data['address'];

        this.setAddress(address);

        return address;
      },
    );
  }

  mintNFTs(metadata: MetadataMap[]): Transaction<NFTMintResult[]> {
    const hashedNFTs = this.hashNFTs(metadata);
    const hashes = hashedNFTs.map((nft) => nft.metadataHash);

    return new Transaction(
      (config: Config) => {
        const script = OnChainBlindGenerator.mint({
          contracts: config.imports,
          contractName: this.name,
          // TODO: return error if contract address is not set
          contractAddress: this.address ?? '',
        });

        return {
          script,
          args: [fcl.arg(hashes, t.Array(t.String))],
          computeLimit: 9999,
          signers: this.getSigners(),
        };
      },
      (result: TransactionResult) => this.formatMintResults(result, hashedNFTs),
    );
  }

  private hashNFTs(metadata: MetadataMap[]): HashedNFT[] {
    return metadata.map((metadata) => {
      const { hash, salt } = hashMetadataWithSalt(this.schema, metadata);

      return {
        metadata,
        metadataHash: hash.toString('hex'),
        metadataSalt: salt.toString('hex'),
      };
    });
  }

  private formatMintResults({ transactionId, events }: TransactionResult, nfts: HashedNFT[]): NFTMintResult[] {
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

  revealNFTs(nfts: NFTRevealInput[]): Transaction<NFTRevealResult[]> {
    const ids = nfts.map((nft) => nft.id);
    const salts = nfts.map((nft) => nft.metadataSalt);

    return new Transaction(
      (config: Config) => {
        const script = OnChainBlindGenerator.reveal({
          contracts: config.imports,
          contractName: this.name,
          // TODO: return error if contract address is not set
          contractAddress: this.address ?? '',
          schema: this.schema,
        });

        return {
          script,
          args: [
            fcl.arg(ids, t.Array(t.UInt64)),
            fcl.arg(salts, t.Array(t.String)),
            ...this.schema.getFieldList().map((field) => {
              return fcl.arg(
                nfts.map((nft) => field.getValue(nft.metadata)),
                t.Array(field.asCadenceTypeObject()),
              );
            }),
          ],
          computeLimit: 9999,
          signers: this.getSigners(),
        };
      },
      (result: TransactionResult) => this.formatRevealtResults(result),
    );
  }

  private formatRevealtResults({ transactionId, events }: TransactionResult): NFTRevealResult[] {
    const deposits = events.filter((event) => event.type.includes('.Revealed'));

    return deposits.map((deposit) => {
      return {
        id: deposit.data.id,
        transactionId,
      };
    });
  }
}
