// @ts-ignore
import * as fcl from '@onflow/fcl';
// @ts-ignore
import * as t from '@onflow/types';

import { NFTContract, CollectionMetadata, prepareCollectionMetadata, Royalty, prepareRoyalties } from './NFTContract';
import { MetadataMap } from '../metadata';
import { BlindEditionNFTGenerator } from '../generators/BlindEditionNFTGenerator';
import { hashValuesWithSalt } from '../hash';
import { FreshmintConfig, ContractImports } from '../config';
import { Transaction, TransactionResult } from '../transactions';
import { PublicKey, SignatureAlgorithm, HashAlgorithm } from '../crypto';
import { UInt64Value } from '../cadence/values';
import { Script } from '../scripts';

export type EditionInput = {
  size: number;
  metadata: MetadataMap;
};

export type EditionResult = {
  id: string;
  metadata: MetadataMap;
  size: number;
  serialNumbers: string[];
};

export type HashedSerialNumber = {
  serialNumber: string;
  hash: string;
  salt: string;
};

export type NFTMintResult = {
  id: string;
  editionId: string;
  serialNumber: string;
  hash: string;
  salt: string;
  transactionId: string;
};

export interface NFTRevealInput {
  id: string;
  serialNumber: string;
  salt: string;
}

export type NFTRevealResult = {
  id: string;
  transactionId: string;
};

export class BlindEditionNFTContract extends NFTContract {
  getSource(imports: ContractImports, options?: { saveAdminResourceToContractAccount?: boolean }): string {
    return BlindEditionNFTGenerator.contract({
      imports,
      contractName: this.name,
      schema: this.schema,
      saveAdminResourceToContractAccount: options?.saveAdminResourceToContractAccount,
    });
  }

  deploy({
    publicKey,
    hashAlgorithm,
    collectionMetadata,
    royalties,
    saveAdminResourceToContractAccount,
  }: {
    publicKey: PublicKey;
    hashAlgorithm: HashAlgorithm;
    collectionMetadata: CollectionMetadata;
    royalties?: Royalty[];
    saveAdminResourceToContractAccount?: boolean;
  }): Transaction<string> {
    return new Transaction(
      ({ imports }: FreshmintConfig) => {
        const script = BlindEditionNFTGenerator.deployToNewAccount({ imports });

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

  createEdition(edition: EditionInput): Transaction<EditionResult> {
    const editions = [edition];

    return new Transaction(
      this.makeCreateEditionsTransaction(editions),
      (result: TransactionResult) => formatEditionResults(result, editions)[0],
    );
  }

  createEditions(editions: EditionInput[]): Transaction<EditionResult[]> {
    return new Transaction(this.makeCreateEditionsTransaction(editions), (result: TransactionResult) =>
      formatEditionResults(result, editions),
    );
  }

  private makeCreateEditionsTransaction(editions: EditionInput[]) {
    return ({ imports }: FreshmintConfig) => {
      const script = BlindEditionNFTGenerator.createEditions({
        imports,
        contractName: this.name,
        contractAddress: this.getAddress(),
        schema: this.schema,
      });

      const sizes = editions.map((edition) => edition.size.toString(10));

      return {
        script,
        args: [
          fcl.arg(sizes, t.Array(t.UInt64)),
          ...this.schema.fields.map((field) => {
            return fcl.arg(
              editions.map((edition) => field.getValue(edition.metadata)),
              t.Array(field.asCadenceTypeObject()),
            );
          }),
        ],
        computeLimit: 9999,
        signers: this.getSigners(),
      };
    };
  }

  mintNFTs({
    editionId,
    serialNumbers,
    bucket,
  }: {
    editionId: string;
    serialNumbers: string[];
    bucket?: string;
  }): Transaction<NFTMintResult[]> {
    const hashedSerialNumbers = this.hashSerialNumbers(serialNumbers);
    return this.mintHashedNFTs({ editionId, hashedSerialNumbers, bucket });
  }

  mintHashedNFTs({
    editionId,
    hashedSerialNumbers,
    bucket,
  }: {
    editionId: string;
    hashedSerialNumbers: HashedSerialNumber[];
    bucket?: string;
  }): Transaction<NFTMintResult[]> {
    return new Transaction(
      ({ imports }: FreshmintConfig) => {
        const script = BlindEditionNFTGenerator.mint({
          imports,
          contractName: this.name,
          contractAddress: this.getAddress(),
        });

        const hashes = hashedSerialNumbers.map((nft) => nft.hash);

        return {
          script,
          args: [
            fcl.arg(editionId, t.UInt64),
            fcl.arg(hashes, t.Array(t.String)),
            fcl.arg(bucket, t.Optional(t.String)),
          ],
          computeLimit: 9999,
          signers: this.getSigners(),
        };
      },
      (result) => formatMintResults(result, hashedSerialNumbers),
    );
  }

  hashSerialNumbers(serialNumbers: string[]): HashedSerialNumber[] {
    return serialNumbers.map((serialNumber) => {
      const serialNumberBytes = new UInt64Value(serialNumber).toBytes();

      const { hash, salt } = hashValuesWithSalt([serialNumberBytes]);

      return {
        serialNumber: serialNumber,
        hash: hash.toString('hex'),
        salt: salt.toString('hex'),
      };
    });
  }

  revealNFT(nft: NFTRevealInput): Transaction<NFTRevealResult> {
    const nfts = [nft];

    return new Transaction(
      this.makeRevealNFTsTransaction(nfts),
      (result: TransactionResult) => formatRevealResults(result)[0],
    );
  }

  revealNFTs(nfts: NFTRevealInput[]): Transaction<NFTRevealResult[]> {
    return new Transaction(this.makeRevealNFTsTransaction(nfts), (result: TransactionResult) =>
      formatRevealResults(result),
    );
  }

  private makeRevealNFTsTransaction(nfts: NFTRevealInput[]) {
    return ({ imports }: FreshmintConfig) => {
      const script = BlindEditionNFTGenerator.reveal({
        imports,
        contractName: this.name,
        // TODO: return error if contract address is not set
        contractAddress: this.address ?? '',
      });

      const nftIds = nfts.map((nft) => nft.id);
      const serialNumbers = nfts.map((nft) => nft.serialNumber);
      const salts = nfts.map((nft) => nft.salt);

      return {
        script,
        args: [
          fcl.arg(nftIds, t.Array(t.UInt64)),
          fcl.arg(serialNumbers, t.Array(t.UInt64)),
          fcl.arg(salts, t.Array(t.String)),
        ],
        computeLimit: 9999,
        signers: this.getSigners(),
      };
    };
  }

  getRevealedNFTHash(nftId: string): Script<string> {
    const script = BlindEditionNFTGenerator.getRevealedNFTHash({
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

function formatMintResults(
  { transactionId, events }: TransactionResult,
  serialNumbers: HashedSerialNumber[],
): NFTMintResult[] {
  const deposits = events.filter((event) => event.type.includes('.Minted'));

  return deposits.map((deposit, i) => {
    const { serialNumber, hash, salt } = serialNumbers[i];

    return {
      id: deposit.data.id,
      editionId: deposit.data.editionID,
      serialNumber,
      hash,
      salt,
      transactionId,
    };
  });
}

function formatEditionResults({ events }: TransactionResult, editions: EditionInput[]): EditionResult[] {
  const editionEvents = events.filter((event) => event.type.includes('.EditionCreated'));

  return editions.flatMap((edition, i) => {
    const editionEvent: any = editionEvents[i];
    const editionId = editionEvent.data.edition.id;

    return {
      id: editionId,
      metadata: edition.metadata,
      size: edition.size,
      serialNumbers: getEditionSerialNumbers(editionId, edition.size),
    };
  });
}

function formatRevealResults({ transactionId, events }: TransactionResult): NFTRevealResult[] {
  const deposits = events.filter((event) => event.type.includes('.Revealed'));

  return deposits.map((deposit) => {
    return {
      id: deposit.data.id,
      transactionId,
    };
  });
}

function getEditionSerialNumbers(id: string, size: number): string[] {
  const serialNumbers = Array(size);

  for (let i = 0; i < size; i++) {
    const serialNumber = i + 1;
    serialNumbers[i] = serialNumber.toString();
  }

  return serialNumbers;
}
