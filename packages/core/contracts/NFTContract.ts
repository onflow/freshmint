// @ts-ignore
import * as fcl from '@onflow/fcl';

// @ts-ignore
import * as t from '@onflow/types';

import * as metadata from '../metadata';
import { FreshmintConfig } from '../config';
import { Transaction, TransactionAuthorizer, TransactionResult, TransactionSigners } from '../transactions';
import { Script } from '../scripts';
import { Path } from '../cadence/values';
import { CommonNFTGenerator } from '../generators/CommonNFTGenerator';
import { HTTPMediaInput, IPFSMediaInput, isIPFSMediaInput } from '../metadata/views';

export interface Royalty {
  address: string;
  receiverPath: string;
  cut: string;
  description?: string;
}

export interface CollectionMetadata {
  name: string;
  description: string;
  url: string;
  squareImage: IPFSMediaInput | HTTPMediaInput;
  bannerImage: IPFSMediaInput | HTTPMediaInput;
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

  getNFT(address: string, id: string): Script<{ id: string }> {
    return new Script(
      ({ imports }: FreshmintConfig) => {
        const script = CommonNFTGenerator.getNFT({
          imports,
          contractName: this.name,
          contractAddress: this.getAddress(),
        });

        return {
          script,
          args: (arg, t) => [arg(address, t.Address), arg(id, t.UInt64)],
          computeLimit: 9999,
        };
      },
      (result) => result,
    );
  }

  destroyNFT(id: string): Transaction<void> {
    return new Transaction(({ imports }: FreshmintConfig) => {
      const script = CommonNFTGenerator.destroyNFT({
        imports,
        contractName: this.name,
        contractAddress: this.getAddress(),
      });

      return {
        script,
        args: [fcl.arg(id, t.UInt64)],
        computeLimit: 9999,
        signers: this.getSigners(),
      };
    }, Transaction.VoidResult);
  }

  setupCollection(authorizer: TransactionAuthorizer): Transaction<void> {
    return new Transaction(({ imports }: FreshmintConfig) => {
      const script = CommonNFTGenerator.setupCollection({
        imports,
        contractName: this.name,
        contractAddress: this.getAddress(),
      });

      return {
        script,
        args: [],
        computeLimit: 9999,
        signers: {
          payer: authorizer,
          proposer: authorizer,
          authorizers: [authorizer],
        },
      };
    }, Transaction.VoidResult);
  }

  transferQueueToQueue({
    fromQueue,
    toQueue,
    count,
  }: {
    fromQueue: string | null;
    toQueue: string | null;
    count: number;
  }): Transaction<void> {
    return new Transaction(({ imports }: FreshmintConfig) => {
      const script = CommonNFTGenerator.transferQueueToQueue({
        imports,
        contractName: this.name,
        contractAddress: this.getAddress(),
      });

      return {
        script,
        args: [
          fcl.arg(fromQueue, t.Optional(t.String)),
          fcl.arg(toQueue, t.Optional(t.String)),
          fcl.arg(count.toString(), t.Int),
        ],
        computeLimit: 9999,
        signers: this.getSigners(),
      };
    }, Transaction.VoidResult);
  }

  transferQueueToCollection({
    fromQueue,
    toAddress,
    count,
  }: {
    fromQueue: string | null;
    toAddress: string;
    count: number;
  }): Transaction<string[]> {
    return new Transaction(
      ({ imports }: FreshmintConfig) => {
        const script = CommonNFTGenerator.transferQueueToCollection({
          imports,
          contractName: this.name,
          contractAddress: this.getAddress(),
        });

        return {
          script,
          args: [
            fcl.arg(fromQueue, t.Optional(t.String)),
            fcl.arg(toAddress, t.Address),
            fcl.arg(count.toString(), t.Int),
          ],
          computeLimit: 9999,
          signers: this.getSigners(),
        };
      },
      ({ events }: TransactionResult) => {
        const deposits = events.filter((event) => event.type.includes('.Deposit'));
        return deposits.map((event) => event.data.id);
      },
    );
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
      (royalties) => {
        return royalties.map((royalty: any) => ({
          address: royalty.receiver.address,
          receiverPath: new Path(royalty.receiver.path.value).toString(),
          // Trim trailing zeros (0.01000 becomes 0.01)
          cut: parseFloat(royalty.cut).toString(),
          description: royalty.description !== '' ? royalty.description : undefined,
        }));
      },
    );
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

// Prepare a metadata batch as a JSON-Cadence argument that can be used in an Flow transaction.
//
// Batch minting transactions accept a list of metadata dictionaries
// with a Cadence type of `[{String: AnyStruct}]`.
//
// Example return value:
//
// {
//   type: 'Array',
//   value: [
//     {
//       type: 'Dictionary',
//       value: [
//         {
//           key: { type: 'String', value: 'name' },
//           value: { type: 'String', value: 'My NFT' }
//         }
//         ...
//       ]
//     },
//     ...
//   ]
// }
//
export function prepareMetadataBatch(schema: metadata.Schema, entries: metadata.MetadataMap[]) {
  const dictionaries = entries.map((values) => {
    const pairs = schema.fields.map((field) => {
      const keyType = t.String;
      const valueType = field.asCadenceTypeObject();

      const value = field.getValue(values);

      return {
        key: keyType.asArgument(field.name),
        value: valueType.asArgument(value),
      };
    });

    return prepareDictionary(pairs);
  });

  return t.Array(t.Identity).asArgument(dictionaries);
}

export function prepareRoyalties(royalties: Royalty[]): {
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

function parseCollectionMetadataResult(result: any | null): CollectionMetadata | null {
  if (result === null) {
    return null;
  }

  return {
    name: result.name,
    description: result.description,
    url: result.externalURL.url,
    squareImage: parseMedia(result.squareImage),
    bannerImage: parseMedia(result.bannerImage),
    socials: parseSocials(result.socials),
  };
}

function parseMedia(media: { mediaType: string; file: IPFSFile | HTTPFile }): IPFSMediaInput | HTTPMediaInput {
  if (isIPFSFile(media.file)) {
    return {
      ipfs: media.file.path ? { cid: media.file.cid, path: media.file.path } : media.file.cid,
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

export function prepareCollectionMetadata(metadataViewsAddress: string, collectionMetadata: CollectionMetadata) {
  return prepareStruct(`A.${fcl.sansPrefix(metadataViewsAddress)}.MetadataViews.NFTCollectionDisplay`, [
    prepareStructField('name', prepareString(collectionMetadata.name)),
    prepareStructField('description', prepareString(collectionMetadata.description)),
    prepareStructField('externalURL', prepareExternalURL(metadataViewsAddress, collectionMetadata.url)),
    prepareStructField('squareImage', prepareMedia(metadataViewsAddress, collectionMetadata.squareImage)),
    prepareStructField('bannerImage', prepareMedia(metadataViewsAddress, collectionMetadata.bannerImage)),
    prepareStructField('socials', prepareSocials(metadataViewsAddress, collectionMetadata.socials)),
  ]);
}

function prepareStruct(typeId: string, fields: any[]) {
  return {
    type: 'Struct',
    value: {
      id: typeId,
      fields,
    },
  };
}

function prepareStructField(name: string, value: any) {
  return {
    name,
    value,
  };
}

function prepareDictionary(pairs: any[]) {
  return {
    type: 'Dictionary',
    value: pairs,
  };
}

function prepareString(value: string) {
  return {
    type: 'String',
    value,
  };
}

function prepareOptional(value: any | null) {
  return {
    type: 'Optional',
    value,
  };
}

function prepareExternalURL(metadataViewsAddress: string, url: string) {
  return prepareStruct(`A.${fcl.sansPrefix(metadataViewsAddress)}.MetadataViews.ExternalURL`, [
    prepareStructField('url', prepareString(url)),
  ]);
}

function prepareMedia(metadataViewsAddress: string, media: IPFSMediaInput | HTTPMediaInput) {
  const file = prepareFile(metadataViewsAddress, media);

  return prepareStruct(`A.${fcl.sansPrefix(metadataViewsAddress)}.MetadataViews.Media`, [
    prepareStructField('file', file),
    prepareStructField('mediaType', prepareString(media.type)),
  ]);
}

function prepareFile(metadataViewsAddress: string, media: IPFSMediaInput | HTTPMediaInput) {
  if (isIPFSMediaInput(media)) {
    return prepareIPFSFile(metadataViewsAddress, media);
  }

  return prepareHTTPFile(metadataViewsAddress, media);
}

function prepareIPFSFile(metadataViewsAddress: string, media: IPFSMediaInput) {
  if (typeof media.ipfs === 'string') {
    return prepareStruct(`A.${fcl.sansPrefix(metadataViewsAddress)}.MetadataViews.IPFSFile`, [
      prepareStructField('cid', prepareString(media.ipfs)),
      prepareStructField('path', prepareOptional(null)),
    ]);
  }

  return prepareStruct(`A.${fcl.sansPrefix(metadataViewsAddress)}.MetadataViews.IPFSFile`, [
    prepareStructField('cid', prepareString(media.ipfs.cid)),
    prepareStructField('path', prepareOptional(media.ipfs.path ? prepareString(media.ipfs.path) : null)),
  ]);
}

function prepareHTTPFile(metadataViewsAddress: string, media: HTTPMediaInput) {
  return prepareStruct(`A.${fcl.sansPrefix(metadataViewsAddress)}.MetadataViews.HTTPFile`, [
    prepareStructField('url', prepareString(media.url)),
  ]);
}

function prepareSocials(metadataViewsAddress: string, socials: { [key: string]: string }) {
  const pairs = [];

  for (const key in socials) {
    pairs.push({ key: prepareString(key), value: prepareExternalURL(metadataViewsAddress, socials[key]) });
  }

  return prepareDictionary(pairs);
}
