// @ts-ignore
import * as fcl from '@onflow/fcl';
// @ts-ignore
import * as t from '@onflow/types';

import { Event } from '@fresh-js/core';
import { PublicKey, SignatureAlgorithm, HashAlgorithm } from '@fresh-js/crypto';

import NFTContract from './NFTContract';
import { MetadataMap } from '../metadata';
import { EditionNFTGenerator } from '../generators/EditionNFTGenerator';
import { Config, ContractImports } from '../config';
import { Transaction, TransactionResult } from '../transactions';

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

export type NFTMintResult = {
  id: string;
  editionId: string;
  editionSerial: string;
  transactionId: string;
};

export class EditionNFTContract extends NFTContract {
  getSource(imports: ContractImports, options?: { saveAdminResourceToContractAccount?: boolean }): string {
    return EditionNFTGenerator.contract({
      imports,
      contractName: this.name,
      schema: this.schema,
      saveAdminResourceToContractAccount: options?.saveAdminResourceToContractAccount,
    });
  }

  deploy(
    publicKey: PublicKey,
    hashAlgo: HashAlgorithm,
    options?: {
      saveAdminResourceToContractAccount?: boolean;
    },
  ): Transaction<string> {
    return new Transaction(
      ({ imports }: Config) => {
        const script = EditionNFTGenerator.deploy();

        const saveAdminResourceToContractAccount = options?.saveAdminResourceToContractAccount ?? false;

        const contractCode = this.getSource(imports, { saveAdminResourceToContractAccount });
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
            fcl.arg(saveAdminResourceToContractAccount, t.Bool),
          ],
          computeLimit: 9999,
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
    return ({ imports }: Config) => {
      const script = EditionNFTGenerator.createEditions({
        imports,
        contractName: this.name,
        // TODO: return error if contract address is not set
        contractAddress: this.address ?? '',
        schema: this.schema,
      });

      const sizes = editions.map((edition) => edition.size.toString(10));

      return {
        script,
        args: [
          fcl.arg(sizes, t.Array(t.UInt)),
          ...this.schema.getFieldList().map((field) => {
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

    return new Transaction(
      this.makeMintNFTsTransaction(nfts, { bucket }),
      (result: TransactionResult) => formatMintResults(result, nfts)[0],
    );
  }

  mintNFTs(nfts: EditionNFT[], { bucket }: { bucket?: string } = {}): Transaction<NFTMintResult[]> {
    return new Transaction(this.makeMintNFTsTransaction(nfts, { bucket }), (result: TransactionResult) =>
      formatMintResults(result, nfts),
    );
  }

  private makeMintNFTsTransaction(nfts: EditionNFT[], { bucket }: { bucket?: string } = {}) {
    return ({ imports }: Config) => {
      const script = EditionNFTGenerator.mint({
        imports,
        contractName: this.name,
        // TODO: return error if contract address is not set
        contractAddress: this.address ?? '',
      });

      const editionIds = nfts.map((nft) => nft.editionId);
      const editionSerials = nfts.map((nft) => nft.editionSerial);

      return {
        script,
        args: [
          fcl.arg(editionIds, t.Array(t.UInt64)),
          fcl.arg(editionSerials, t.Array(t.UInt64)),
          fcl.arg(bucket, t.Optional(t.String)),
        ],
        computeLimit: 9999,
        signers: this.getSigners(),
      };
    };
  }
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

function formatMintResults({ transactionId, events }: TransactionResult, nfts: EditionNFT[]): NFTMintResult[] {
  const deposits = events.filter((event) => event.type.includes('.Minted'));

  return deposits.map((deposit, i) => {
    const { editionId, editionSerial } = nfts[i];

    return {
      id: deposit.data.id,
      editionId,
      editionSerial,
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
