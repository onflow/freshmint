import { Authorizer } from '@fresh-js/core';
import * as metadata from '../metadata';
import { TransactionSigners } from '../transactions';

export default abstract class NFTCollection {
  name: string;
  address?: string;

  schema: metadata.Schema;

  owner?: Authorizer;
  payer?: Authorizer;
  proposer?: Authorizer;

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
    owner?: Authorizer;
    payer?: Authorizer;
    proposer?: Authorizer;
  }) {
    this.name = name;
    this.address = address;

    this.schema = schema;

    this.owner = owner;
    this.payer = payer;
    this.proposer = proposer;
  }

  setOwner(authorizer: Authorizer) {
    this.owner = authorizer;
  }

  setPayer(authorizer: Authorizer) {
    this.payer = authorizer;
  }

  setProposer(authorizer: Authorizer) {
    this.proposer = authorizer;
  }

  setAddress(address: string) {
    this.address = address;
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
}
