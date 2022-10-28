// @ts-ignore
import * as fcl from '@onflow/fcl';
// @ts-ignore
import * as t from '@onflow/types';

import * as metadata from '../metadata';
import { FreshmintConfig } from '../config';
import { Transaction, TransactionAuthorizer, TransactionSigners } from '../transactions';
import { Script } from '../scripts';
import { Path } from '../cadence/values';
import { CommonNFTGenerator } from '../generators/CommonNFTGenerator';

export type Royalty = {
  address: string;
  receiverPath: string;
  cut: string;
  description?: string;
};

export default abstract class NFTContract {
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
