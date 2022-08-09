// @ts-ignore
import * as fcl from '@onflow/fcl';
// @ts-ignore
import * as t from '@onflow/types';

import { Event } from '@fresh-js/core';
import { PublicKey, SignatureAlgorithm, HashAlgorithm } from '@fresh-js/crypto';
import { MetadataMap } from '../metadata';
import { BaseCollection } from './NFTCollection';
import EditionGenerator from '../generators/EditionGenerator';

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

export default class EditionCollection extends BaseCollection {
  async getContract(options?: { saveAdminResourceToContractAccount?: boolean }): Promise<string> {
    return EditionGenerator.contract({
      contracts: this.config.contracts,
      contractName: this.name,
      schema: this.schema,
      saveAdminResourceToContractAccount: options?.saveAdminResourceToContractAccount
    });
  }

  async deployContract(
    publicKey: PublicKey,
    hashAlgo: HashAlgorithm,
    options?: {
      saveAdminResourceToContractAccount?: boolean;
    },
  ): Promise<string> {
    const transaction = await EditionGenerator.deploy();

    const saveAdminResourceToContractAccount = options?.saveAdminResourceToContractAccount ?? false;

    const contractCode = await this.getContract({
      saveAdminResourceToContractAccount,
    });

    const contractCodeHex = Buffer.from(contractCode, 'utf-8').toString('hex');

    const sigAlgo = publicKey.signatureAlgorithm();


    const response = await fcl.send([
      fcl.transaction(transaction),
      fcl.args([
        fcl.arg(this.name, t.String),
        fcl.arg(contractCodeHex, t.String),
        fcl.arg(publicKey.toHex(), t.String),
        fcl.arg(SignatureAlgorithm.toCadence(sigAlgo), t.UInt8),
        fcl.arg(HashAlgorithm.toCadence(hashAlgo), t.UInt8),
        fcl.arg(saveAdminResourceToContractAccount, t.Bool),
      ]),
      fcl.limit(1000),

      ...this.getAuthorizers(),
    ]);

    // TODO: handle error
    const { events, error: _ } = await fcl.tx(response).onceSealed();

    const accountCreatedEvent: Event = events.find((event: Event) => event.type === 'flow.AccountCreated');

    const address = accountCreatedEvent.data['address'];

    this.setAddress(address);

    return address;
  }

  async createEdition(edition: EditionInput): Promise<EditionResult> {
    return (await this.createEditions([edition]))[0];
  }

  async createEditions(editions: EditionInput[]): Promise<EditionResult[]> {
    const transaction = await EditionGenerator.createEditions({
      contracts: this.config.contracts,
      contractName: this.name,
      // TODO: return error if contract address is not set
      contractAddress: this.address ?? '',
      schema: this.schema,
    });

    const sizes = editions.map((edition) => edition.size);

    const response = await fcl.send([
      fcl.transaction(transaction),
      fcl.args([
        fcl.arg(sizes, t.Array(t.UInt)),
        ...this.schema.getFieldList().map((field) => {
          return fcl.arg(
            editions.map((edition) => field.getValue(edition.metadata)),
            t.Array(field.asCadenceTypeObject()),
          );
        }),
      ]),
      fcl.limit(1000),

      ...this.getAuthorizers(),
    ]);

    // TODO: handle error
    const { events, error: _ } = await fcl.tx(response).onceSealed();

    return formatEditionResults(events, editions);
  }

  // async mintEdition(edition: )

  async mintNFT(nft: EditionNFT, bucket?: string): Promise<NFTMintResult> {
    const results = await this.mintNFTs([nft], bucket);
    return results[0];
  }

  async mintNFTs(nfts: EditionNFT[], bucket?: string): Promise<NFTMintResult[]> {
    const editionIds = nfts.map((nft) => nft.editionId);
    const editionSerials = nfts.map((nft) => nft.editionSerial);

    const transaction = await EditionGenerator.mint({
      contracts: this.config.contracts,
      contractName: this.name,
      // TODO: return error if contract address is not set
      contractAddress: this.address ?? '',
    });

    const response = await fcl.send([
      fcl.transaction(transaction),
      fcl.args([
        fcl.arg(editionIds, t.Array(t.UInt64)),
        fcl.arg(editionSerials, t.Array(t.UInt64)),
        fcl.arg(bucket, t.Optional(t.String))
      ]),
      fcl.limit(1000),

      ...this.getAuthorizers(),
    ]);

    const { transactionId } = response;

    // TODO: handle error
    const { events, error: _ } = await fcl.tx(response).onceSealed();

    return formatMintResults(transactionId, events, nfts);
  }
}

function formatMintResults(transactionId: string, events: Event[], nfts: EditionNFT[]): NFTMintResult[] {
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

function formatEditionResults(events: Event[], editions: EditionInput[]): EditionResult[] {
  const editionEvents = events.filter((event) => event.type.includes('.EditionCreated'));

  return editions.flatMap((edition, i) => {
    const editionEvent: any = editionEvents[i];
    const editionId = editionEvent.data.edition.id;

    return {
      id: editionId,
      metadata: edition.metadata,
      size: edition.size,
      nfts: getEditionNFTs(editionId, edition.size)
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
