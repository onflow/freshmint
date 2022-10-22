// @ts-ignore
import * as fcl from '@onflow/fcl';
// @ts-ignore
import * as t from '@onflow/types';

import * as metadata from '../metadata';
import { FreshmintConfig } from '../config';
import { Transaction, TransactionAuthorizer, TransactionSigners } from '../transactions';
import { Script } from '../scripts';
import { objectToDictionaryEntries, Path } from '../cadence';
import { CommonNFTGenerator } from '../generators/CommonNFTGenerator';
import { isHTTPMediaInput, isIPFSMediaInput, MediaInput } from '../metadata/views';

export interface Royalty {
  address: string;
  receiverPath: string;
  cut: string;
  description?: string;
}

export interface CollectionMetadata {
  name: string;
  description: string;
  externalUrl: string;
  squareImage: MediaInput;
  bannerImage: MediaInput;
  socials: { [name: string]: string };
}

export abstract class NFTContract {
  name: string;
  address?: string;

  schema: metadata.Schema;

  owner?: TransactionAuthorizer;
  payer?: TransactionAuthorizer;
  proposer?: TransactionAuthorizer;

  constructor({
    name,
    address,
    schema,
    owner,
    payer,
    proposer,
  }: {
    name: string;
    address?: string;
    schema: metadata.Schema;
    owner?: TransactionAuthorizer;
    payer?: TransactionAuthorizer;
    proposer?: TransactionAuthorizer;
  }) {
    this.name = name;
    this.address = address;

    this.schema = schema;

    this.owner = owner;
    this.payer = payer;
    this.proposer = proposer;
  }

  setOwner(authorizer: TransactionAuthorizer) {
    this.owner = authorizer;
  }

  setPayer(authorizer: TransactionAuthorizer) {
    this.payer = authorizer;
  }

  setProposer(authorizer: TransactionAuthorizer) {
    this.proposer = authorizer;
  }

  setAddress(address: string) {
    this.address = address;
  }

  getAddress(): string {
    if (this.address !== undefined) {
      return this.address;
    }

    throw new MissingContractAddressError(this.name);
  }

  getSigners(): TransactionSigners {
    const owner = this.owner;
    if (!owner) {
      // TODO: improve error message
      throw 'must specify owner';
    }

    const payer = this.payer ?? owner;
    const proposer = this.proposer ?? owner;

    return {
      payer,
      proposer,
      authorizers: [owner],
    };
  }

  setRoyalties(royalties: Royalty[]): Transaction<void> {
    return new Transaction(({ imports }: FreshmintConfig) => {
      const script = CommonNFTGenerator.setRoyalties({
        imports,
        contractName: this.name,
        contractAddress: this.getAddress(),
      });

      const { royaltyAddresses, royaltyReceiverPaths, royaltyCuts, royaltyDescriptions } = prepareRoyalties(royalties);

      return {
        script,
        args: [
          fcl.arg(royaltyAddresses, t.Array(t.Address)),
          fcl.arg(royaltyReceiverPaths, t.Array(t.Path)),
          fcl.arg(royaltyCuts, t.Array(t.UFix64)),
          fcl.arg(royaltyDescriptions, t.Array(t.String)),
        ],
        computeLimit: 9999,
        signers: this.getSigners(),
      };
    }, Transaction.VoidResult);
  }

  getRoyalties(): Script<Royalty[]> {
    return new Script(
      ({ imports }: FreshmintConfig) => {
        const script = CommonNFTGenerator.getRoyalties({
          imports,
          contractName: this.name,
          contractAddress: this.getAddress(),
        });

        return {
          script,
          args: () => [],
          computeLimit: 9999,
        };
      },
      (royalties) =>
        royalties.map((royalty: any) => ({
          address: royalty.receiver.address,
          receiverPath: new Path(royalty.receiver.path.value).toString(),
          cut: royalty.cut,
          description: royalty.description,
        })),
    );
  }

  setCollectionMetadata(collectionMetadata: CollectionMetadata) {
    return new Transaction(({ imports }: FreshmintConfig) => {
      const script = CommonNFTGenerator.setCollectionMetadata({
        imports,
        contractName: this.name,
        contractAddress: this.getAddress(),
      });

      return {
        script,
        args: [
          fcl.arg(collectionMetadata.name, t.String),
          fcl.arg(collectionMetadata.description, t.String),
          fcl.arg(collectionMetadata.externalUrl, t.String),
          fcl.arg(getIPFSCID(collectionMetadata.squareImage), t.Optional(t.String)),
          fcl.arg(getIPFSPath(collectionMetadata.squareImage), t.Optional(t.String)),
          fcl.arg(getHTTPURL(collectionMetadata.squareImage), t.Optional(t.String)),
          fcl.arg(collectionMetadata.squareImage.type, t.String),
          fcl.arg(getIPFSCID(collectionMetadata.bannerImage), t.Optional(t.String)),
          fcl.arg(getIPFSPath(collectionMetadata.bannerImage), t.Optional(t.String)),
          fcl.arg(getHTTPURL(collectionMetadata.bannerImage), t.Optional(t.String)),
          fcl.arg(collectionMetadata.bannerImage.type, t.String),
          fcl.arg(
            objectToDictionaryEntries(collectionMetadata.socials),
            t.Dictionary({ key: t.String, value: t.String }),
          ),
        ],
        computeLimit: 9999,
        signers: this.getSigners(),
      };
    }, Transaction.VoidResult);
  }

  getCollectionMetadata(): Script<CollectionMetadata | null> {
    return new Script(({ imports }: FreshmintConfig) => {
      const script = CommonNFTGenerator.getCollectionMetadata({
        imports,
        contractName: this.name,
        contractAddress: this.getAddress(),
      });

      return {
        script,
        args: () => [],
        computeLimit: 9999,
      };
    }, parseCollectionMetadataResult);
  }
}

export class MissingContractAddressError extends Error {
  contractName: string;

  constructor(contractName: string) {
    const message = `Missing contract address for contract with name "${contractName}".`;

    super(message);

    this.contractName = contractName;
  }
}

function prepareRoyalties(royalties: Royalty[]): {
  royaltyAddresses: string[];
  royaltyReceiverPaths: Path[];
  royaltyCuts: string[];
  royaltyDescriptions: string[];
} {
  const royaltyAddresses = royalties.map((royalty) => royalty.address);
  const royaltyReceiverPaths = royalties.map((royalty) => Path.fromString(royalty.receiverPath));
  const royaltyCuts = royalties.map((royalty) => royalty.cut);
  const royaltyDescriptions = royalties.map((royalty) => royalty.description ?? '');

  return { royaltyAddresses, royaltyReceiverPaths, royaltyCuts, royaltyDescriptions };
}

function getIPFSCID(mediaInput: MediaInput): string | null {
  if (!isIPFSMediaInput(mediaInput)) {
    return null;
  }

  return typeof mediaInput.ipfs === 'string' ? mediaInput.ipfs : mediaInput.ipfs.cid;
}

function getIPFSPath(mediaInput: MediaInput): string | null {
  if (!isIPFSMediaInput(mediaInput)) {
    return null;
  }

  return typeof mediaInput.ipfs === 'string' ? null : mediaInput.ipfs.path || null;
}

function getHTTPURL(mediaInput: MediaInput): string | null {
  if (!isHTTPMediaInput(mediaInput)) {
    return null;
  }

  return mediaInput.url;
}

function parseCollectionMetadataResult(result: any | null): CollectionMetadata | null {
  if (result === null) {
    return null;
  }

  return {
    name: result.name,
    description: result.description,
    externalUrl: result.externalURL.url,
    squareImage: parseMedia(result.squareImage),
    bannerImage: parseMedia(result.bannerImage),
    socials: parseSocials(result.socials),
  };
}

function parseMedia(media: { mediaType: string; file: IPFSFile | HTTPFile }): MediaInput {
  if (isIPFSFile(media.file)) {
    return {
      ipfs: { cid: media.file.cid, path: media.file.path ?? undefined },
      type: media.mediaType,
    };
  }

  return {
    url: media.file.url,
    type: media.mediaType,
  };
}

interface IPFSFile {
  cid: string;
  path: string | null;
}

function isIPFSFile(file: IPFSFile | HTTPFile): file is IPFSFile {
  return (file as IPFSFile).cid !== undefined;
}

interface HTTPFile {
  url: string;
}

function parseSocials(socials: { [key: string]: { url: string } }): { [key: string]: string } {
  const result: { [key: string]: string } = {};

  for (const key in socials) {
    result[key] = socials[key].url;
  }

  return result;
}
