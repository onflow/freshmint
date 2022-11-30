// @ts-ignore
import * as fcl from '@onflow/fcl';
// @ts-ignore
import * as t from '@onflow/types';

import { NFTContract, CollectionMetadata, prepareCollectionMetadata, Royalty, prepareRoyalties } from './NFTContract';
import { MetadataMap, hashMetadataWithSalt } from '../metadata';
import { BlindNFTGenerator } from '../generators/BlindNFTGenerator';
import { FreshmintConfig, ContractImports } from '../config';
import { Transaction, TransactionResult } from '../transactions';
import { Script } from '../scripts';
import { PublicKey, SignatureAlgorithm, HashAlgorithm } from '../crypto';

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

export class BlindNFTContract extends NFTContract {
  getSource(imports: ContractImports, options?: { saveAdminResourceToContractAccount?: boolean }): string {
    return BlindNFTGenerator.contract({
      imports,
      contractName: this.name,
      schema: this.schema,
      saveAdminResourceToContractAccount: options?.saveAdminResourceToContractAccount,
    });
  }

  deploy({
    publicKey,
    hashAlgorithm,
    placeholderImage,
    collectionMetadata,
    royalties,
    saveAdminResourceToContractAccount,
  }: {
    publicKey: PublicKey;
    hashAlgorithm: HashAlgorithm;
    placeholderImage: string;
    collectionMetadata: CollectionMetadata;
    royalties?: Royalty[];
    saveAdminResourceToContractAccount?: boolean;
  }): Transaction<string> {
    return new Transaction(
      ({ imports }: FreshmintConfig) => {
        const script = BlindNFTGenerator.deployToNewAccount({ imports });

        const contractCode = this.getSource(imports, { saveAdminResourceToContractAccount });
        const contractCodeHex = Buffer.from(contractCode, 'utf-8').toString('hex');

        const sigAlgo = publicKey.signatureAlgorithm();

        const { royaltyAddresses, royaltyReceiverPaths, royaltyCuts, royaltyDescriptions } = prepareRoyalties(
          royalties ?? [],
        );

        return {
          script,
          args: [
            fcl.arg(this.name, t.String),
            fcl.arg(contractCodeHex, t.String),
            fcl.arg(publicKey.toHex(), t.String),
            fcl.arg(SignatureAlgorithm.toCadence(sigAlgo), t.UInt8),
            fcl.arg(HashAlgorithm.toCadence(hashAlgorithm), t.UInt8),
            fcl.arg(placeholderImage, t.String),
            fcl.arg(prepareCollectionMetadata(imports.MetadataViews, collectionMetadata), t.Identity),
            fcl.arg(royaltyAddresses, t.Array(t.Address)),
            fcl.arg(royaltyReceiverPaths, t.Array(t.Path)),
            fcl.arg(royaltyCuts, t.Array(t.UFix64)),
            fcl.arg(royaltyDescriptions, t.Array(t.String)),
            fcl.arg(saveAdminResourceToContractAccount ?? false, t.Bool),
          ],
          computeLimit: 1000,
          signers: this.getSigners(),
        };
      },
      ({ events }: TransactionResult) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const accountCreatedEvent = events.find((event) => event.type === 'flow.AccountCreated')!;

        const address = accountCreatedEvent.data['address'];

        this.setAddress(address);

        return address;
      },
    );
  }

  mintNFTs(nfts: MetadataMap[], bucket?: string): Transaction<NFTMintResult[]> {
    const hashedNFTs = this.hashNFTs(nfts);
    return this.mintHashedNFTs(hashedNFTs, bucket);
  }

  mintHashedNFTs(hashedNFTs: HashedNFT[], bucket?: string): Transaction<NFTMintResult[]> {
    const hashes = hashedNFTs.map((nft) => nft.metadataHash);

    return new Transaction(
      ({ imports }: FreshmintConfig) => {
        const script = BlindNFTGenerator.mint({
          imports,
          contractName: this.name,
          contractAddress: this.getAddress(),
        });

        return {
          script,
          args: [fcl.arg(hashes, t.Array(t.String)), fcl.arg(bucket, t.Optional(t.String))],
          computeLimit: 9999,
          signers: this.getSigners(),
        };
      },
      (result) => formatMintResults(result, hashedNFTs),
    );
  }

  hashNFTs(nfts: MetadataMap[]): HashedNFT[] {
    return nfts.map((metadata) => {
      const { hash, salt } = hashMetadataWithSalt(this.schema, metadata);

      return {
        metadata,
        metadataHash: hash.toString('hex'),
        metadataSalt: salt.toString('hex'),
      };
    });
  }

  revealNFTs(nfts: NFTRevealInput[]): Transaction<NFTRevealResult[]> {
    const ids = nfts.map((nft) => nft.id);
    const salts = nfts.map((nft) => nft.metadataSalt);

    return new Transaction(
      ({ imports }: FreshmintConfig) => {
        const script = BlindNFTGenerator.reveal({
          imports,
          contractName: this.name,
          contractAddress: this.getAddress(),
          schema: this.schema,
        });

        return {
          script,
          args: [
            fcl.arg(ids, t.Array(t.UInt64)),
            fcl.arg(salts, t.Array(t.String)),
            ...this.schema.fields.map((field) => {
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
      (result) => formatRevealtResults(result),
    );
  }

  getRevealedNFTHash(nftId: string): Script<string> {
    const script = BlindNFTGenerator.getRevealedNFTHash({
      contractName: this.name,
      contractAddress: this.getAddress(),
    });

    return new Script(
      () => ({
        script,
        args: (arg, t) => [arg(nftId, t.UInt64)],
        computeLimit: 9999,
      }),
      (result) => result,
    );
  }
}

function formatMintResults({ transactionId, events }: TransactionResult, nfts: HashedNFT[]): NFTMintResult[] {
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

function formatRevealtResults({ transactionId, events }: TransactionResult): NFTRevealResult[] {
  const deposits = events.filter((event) => event.type.includes('.Revealed'));

  return deposits.map((deposit) => {
    return {
      id: deposit.data.id,
      transactionId,
    };
  });
}
