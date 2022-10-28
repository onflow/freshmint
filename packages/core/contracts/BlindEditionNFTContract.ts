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

export type EditionInput = {
  size: number;
  metadata: MetadataMap;
};

export type EditionNFT = {
  editionId: string;
  editionSerial: string;
};

export type EditionResult = {
  id: string;
  metadata: MetadataMap;
  size: number;
  nfts: EditionNFT[];
};

export type HashedEditionNFT = {
  editionId: string;
  editionSerial: string;
  editionHash: string;
  editionSalt: string;
};

export type NFTMintResult = {
  id: string;
  editionId: string;
  editionSerial: string;
  editionHash: string;
  editionSalt: string;
  transactionId: string;
};

export interface NFTRevealInput {
  id: string;
  editionId: string;
  editionSerial: string;
  editionSalt: string;
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
        const script = BlindEditionNFTGenerator.deploy({ imports });

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
          fcl.arg(sizes, t.Array(t.UInt)),
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

  mintNFT(nft: EditionNFT, { bucket }: { bucket?: string } = {}): Transaction<NFTMintResult> {
    const nfts = [nft];
    const hashedNFTs = hashNFTs(nfts);

    return new Transaction(
      this.makeMintNFTsTransaction(hashedNFTs, { bucket }),
      (result: TransactionResult) => formatMintResults(result, hashedNFTs)[0],
    );
  }

  mintNFTs(nfts: EditionNFT[], { bucket }: { bucket?: string } = {}): Transaction<NFTMintResult[]> {
    const hashedNFTs = hashNFTs(nfts);

    return new Transaction(this.makeMintNFTsTransaction(hashedNFTs, { bucket }), (result: TransactionResult) =>
      formatMintResults(result, hashedNFTs),
    );
  }

  private makeMintNFTsTransaction(hashedNFTs: HashedEditionNFT[], { bucket }: { bucket?: string } = {}) {
    return ({ imports }: FreshmintConfig) => {
      const script = BlindEditionNFTGenerator.mint({
        imports,
        contractName: this.name,
        contractAddress: this.getAddress(),
      });

      const hashes = hashedNFTs.map((nft) => nft.editionHash);

      return {
        script,
        args: [fcl.arg(hashes, t.Array(t.String)), fcl.arg(bucket, t.Optional(t.String))],
        computeLimit: 9999,
        signers: this.getSigners(),
      };
    };
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
      const editionIds = nfts.map((nft) => nft.editionId);
      const editionSerials = nfts.map((nft) => nft.editionSerial);
      const editionSalts = nfts.map((nft) => nft.editionSalt);

      return {
        script,
        args: [
          fcl.arg(nftIds, t.Array(t.UInt64)),
          fcl.arg(editionIds, t.Array(t.UInt64)),
          fcl.arg(editionSerials, t.Array(t.UInt64)),
          fcl.arg(editionSalts, t.Array(t.String)),
        ],
        computeLimit: 9999,
        signers: this.getSigners(),
      };
    };
  }
}

function formatMintResults({ transactionId, events }: TransactionResult, nfts: HashedEditionNFT[]): NFTMintResult[] {
  const deposits = events.filter((event) => event.type.includes('.Minted'));

  return deposits.map((deposit, i) => {
    const { editionId, editionSerial, editionHash, editionSalt } = nfts[i];

    return {
      id: deposit.data.id,
      editionId,
      editionSerial,
      editionHash,
      editionSalt,
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
      nfts: getEditionNFTs(editionId, edition.size),
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

function getEditionNFTs(id: string, size: number): EditionNFT[] {
  const nfts = Array(size);

  for (let i = 0; i < size; i++) {
    nfts[i] = {
      editionId: id,
      editionSerial: String(i + 1),
    };
  }

  return nfts;
}

function hashNFTs(nfts: EditionNFT[]): HashedEditionNFT[] {
  return nfts.map((nft) => {
    const { hash, salt } = hashEdition(nft.editionId, nft.editionSerial);

    return {
      editionId: nft.editionId,
      editionSerial: nft.editionSerial,
      editionHash: hash.toString('hex'),
      editionSalt: salt.toString('hex'),
    };
  });
}

function hashEdition(editionId: string, editionSerial: string) {
  // TODO: use big-endian bytes
  const editionIdBuffer = Buffer.from(editionId, 'utf-8');
  const editionSerialBuffer = Buffer.from(editionSerial, 'utf-8');

  return hashValuesWithSalt([editionIdBuffer, editionSerialBuffer]);
}
