// @ts-ignore
import * as fcl from '@onflow/fcl';

import { Authorizer, Config } from '@fresh-js/core';
import * as metadata from '../metadata';

export default interface NFTCollection {
  config: Config;

  name: string;
  address?: string;

  schema: metadata.Schema;

  owner?: Authorizer;
  payer?: Authorizer;
  proposer?: Authorizer;

  getAuthorizers(): any;
}

export type CollectionAuthorizers = {
  default?: Authorizer;
  minter?: Authorizer;
  payer?: Authorizer;
  proposer?: Authorizer;
};

export class BaseCollection implements NFTCollection {
  config: Config;

  name: string;
  address?: string;

  schema: metadata.Schema;

  owner?: Authorizer;
  payer?: Authorizer;
  proposer?: Authorizer;

  constructor({
    config,
    name,
    address,
    schema,
    owner,
    payer,
    proposer,
  }: {
    config: Config;
    name: string;
    address?: string;
    schema: metadata.Schema;
    owner?: Authorizer;
    payer?: Authorizer;
    proposer?: Authorizer;
  }) {
    this.config = config;

    this.name = name;
    this.address = address;

    this.schema = schema;

    this.owner = owner;
    this.payer = payer;
    this.proposer = proposer;

    // TODO: find a better way to set this.
    //
    // Global config is messy but FCL requires it
    fcl.config().put('accessNode.api', this.config.host);
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

  getAuthorizers() {
    const ownerAuth = this.owner;
    if (!ownerAuth) {
      // TODO: improve error message
      throw 'must specify owner';
    }

    const payerAuth = this.payer ?? ownerAuth;
    const proposerAuth = this.proposer ?? ownerAuth;

    return [
      fcl.payer(payerAuth.toFCLAuthorizationFunction()),
      fcl.proposer(proposerAuth.toFCLAuthorizationFunction()),
      fcl.authorizations([ownerAuth.toFCLAuthorizationFunction()]),
    ];
  }
}
