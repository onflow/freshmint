// @ts-ignore
import * as fcl from '@onflow/fcl';
// @ts-ignore
import * as t from '@onflow/types';

import { Event } from '@fresh-js/core';
import { PublicKey, SignatureAlgorithm, HashAlgorithm } from '@fresh-js/crypto';
import { MetadataMap } from '../metadata';
import { BaseCollection } from './NFTCollection';
import EditionBlindGenerator from '../generators/EditionBlindGenerator';
import { hashWithSalt } from '../hash';

type Edition = {
  size: number;
  metadata: MetadataMap;
};

type EditionNFT = {
  editionId: string;
  editionSerial: string;
};

type HashedEditionNFT = {
  editionId: string;
  editionSerial: string;
  editionHash: string;
  editionSalt: string;
};

type MintResult = {
  id: string;
  editionId: string;
  editionSerial: string;
  editionHash: string;
  editionSalt: string;
  transactionId: string;
};

interface RevealInput {
  id: string;
  editionId: string;
  editionSerial: string;
  editionSalt: string;
}

type RevealResult = {
  id: string;
  transactionId: string;
};

export default class EditionBlindCollection extends BaseCollection {
  async getContract(): Promise<string> {
    return EditionBlindGenerator.contract({
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
    const transaction = await EditionBlindGenerator.deploy();

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
    const transaction = await EditionBlindGenerator.createEditions({
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
    const hashedNFTs = hashNFTs(nfts);

    const hashes = hashedNFTs.map((nft) => nft.editionHash);

    const transaction = await EditionBlindGenerator.mint({
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
    const { events, error: _ } = await fcl.tx(response).onceSealed();

    return formatMintResults(transactionId, events, hashedNFTs);
  }

  async revealNFT(nft: RevealInput): Promise<RevealResult> {
    const results = await this.revealNFTs([nft]);
    return results[0];
  }

  async revealNFTs(nfts: RevealInput[]): Promise<RevealResult[]> {
    const nftIds = nfts.map((nft) => nft.id);
    const editionIds = nfts.map((nft) => nft.editionId);
    const editionSerials = nfts.map((nft) => nft.editionSerial);
    const editionSalts = nfts.map((nft) => nft.editionSalt);

    const transaction = await EditionBlindGenerator.reveal({
      contracts: this.config.contracts,
      contractName: this.name,
      // TODO: return error if contract address is not set
      contractAddress: this.address ?? '',
    });

    const response = await fcl.send([
      fcl.transaction(transaction),
      fcl.args([
        fcl.arg(nftIds, t.Array(t.UInt64)),
        fcl.arg(editionIds, t.Array(t.UInt64)),
        fcl.arg(editionSerials, t.Array(t.UInt64)),
        fcl.arg(editionSalts, t.Array(t.String)),
      ]),
      fcl.limit(1000),

      ...this.getAuthorizers(),
    ]);

    const { transactionId } = response;

    // TODO: handle error
    const { events, error: _ } = await fcl.tx(response).onceSealed();

    return formatRevealtResults(transactionId, events);
  }
}

function formatMintResults(transactionId: string, events: Event[], nfts: HashedEditionNFT[]): MintResult[] {
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

function formatEditionResults(events: Event[], editions: Edition[]): EditionNFT[] {
  const editionEvents = events.filter((event) => event.type.includes('.EditionCreated'));

  return editions.flatMap((edition, i) => {
    const editionEvent: any = editionEvents[i];
    const editionId = editionEvent.data.edition.id;
    
    return getEditionNFTs(editionId, edition.size);
  });
}

function formatRevealtResults(transactionId: string, events: Event[]): RevealResult[] {
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

  return hashWithSalt([editionIdBuffer, editionSerialBuffer]);
}
