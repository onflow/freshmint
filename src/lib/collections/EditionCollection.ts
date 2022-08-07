// @ts-ignore
import * as fcl from '@onflow/fcl';
// @ts-ignore
import * as t from '@onflow/types';

import { Event } from '@fresh-js/core';
import { PublicKey, SignatureAlgorithm, HashAlgorithm } from '@fresh-js/crypto';
import { MetadataMap } from '../metadata';
import { BaseCollection } from './NFTCollection';
import EditionGenerator from '../generators/EditionGenerator';

type Edition = {
  size: number;
  metadata: MetadataMap;
};

type EditionNFT = {
  editionId: string;
  editionSerial: string;
};

type MintResult = {
  id: string;
  editionId: string;
  editionSerial: string;
  transactionId: string;
};

export default class EditionCollection extends BaseCollection {
  async getContract(): Promise<string> {
    return EditionGenerator.contract({
      contracts: this.config.contracts,
      contractName: this.name,
      schema: this.schema,
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

  async createEdition(edition: Edition): Promise<EditionNFT[]> {
    return this.createEditions([edition]);
  }

  async createEditions(editions: Edition[]): Promise<EditionNFT[]> {
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

  async mintNFT(nft: EditionNFT): Promise<MintResult> {
    const results = await this.mintNFTs([nft]);
    return results[0];
  }

  async mintNFTs(nfts: EditionNFT[]): Promise<MintResult[]> {
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
      fcl.args([fcl.arg(editionIds, t.Array(t.UInt64))]),
      fcl.args([fcl.arg(editionSerials, t.Array(t.UInt64))]),
      fcl.limit(1000),

      ...this.getAuthorizers(),
    ]);

    const { transactionId } = response;

    // TODO: handle error
    const { events, error: _ } = await fcl.tx(response).onceSealed();

    return formatMintResults(transactionId, events, nfts);
  }
}

function formatMintResults(transactionId: string, events: Event[], nfts: EditionNFT[]): MintResult[] {
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

function formatEditionResults(events: Event[], editions: Edition[]): EditionNFT[] {
  const editionEvents = events.filter((event) => event.type.includes('.EditionCreated'));

  return editions.flatMap((edition, i) => {
    const editionEvent: any = editionEvents[i];
    const editionId = editionEvent.data.edition.id;

    return getEditionNFTs(editionId, edition.size);
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
