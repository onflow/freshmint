// @ts-ignore
import * as t from '@onflow/types';

import FlowCliWrapper from './cli';

export interface CollectionMetadataInput {
  name: string;
  description: string;
  externalUrl: string;
  squareImage: {
    source: string;
    mediaType: string;
  };
  bannerImage: {
    source: string;
    mediaType: string;
  };
  socials: { [name: string]: string };
}

// Use the maximum compute limit for minting transactions.
//
// This allows users to set the highest possible batch size.
const mintComputeLimit = 9999;

export default class FlowGateway {
  network: string;
  flow: FlowCliWrapper;

  constructor(network: string) {
    this.network = network || 'emulator';
    this.flow = new FlowCliWrapper(this.network);
  }

  async mint(fields: any[]) {
    const args = fields.map((field) => ({
      type: t.Array(field.typeInstance.cadenceType),
      value: field.values,
    }));

    return await this.flow.transaction(
      './cadence/transactions/mint.cdc',
      `${this.network}-account`,
      args,
      mintComputeLimit,
    );
  }

  async mintWithClaimKey(publicKeys: string[], fields: any[]) {
    const args = [
      { type: t.Array(t.String), value: publicKeys },
      ...fields.map((field) => ({
        type: t.Array(field.typeInstance.cadenceType),
        value: field.values,
      })),
    ];

    return await this.flow.transaction(
      './cadence/transactions/mint_with_claim_key.cdc',
      `${this.network}-account`,
      args,
      mintComputeLimit,
    );
  }

  async getNFTDetails(address: string, nftId: string) {
    return await this.flow.script('./cadence/scripts/get_nft.cdc', [
      { type: t.Address, value: address },
      { type: t.UInt64, value: nftId },
    ]);
  }

  async createEditions(sizes: number[], fields: any[]) {
    const args = [
      { type: t.Array(t.UInt64), value: sizes.map((size) => size.toString(10)) },
      ...fields.map((field) => ({
        type: t.Array(field.cadenceType),
        value: field.values,
      })),
    ];

    return await this.flow.transaction(
      './cadence/transactions/create_editions.cdc',
      `${this.network}-account`,
      args,
      mintComputeLimit,
    );
  }

  async mintEdition(editionId: string, count: number) {
    return await this.flow.transaction(
      './cadence/transactions/mint.cdc',
      `${this.network}-account`,
      [
        { type: t.UInt64, value: editionId },
        { type: t.Int, value: count.toString(10) },
        { type: t.Optional(t.String), value: null },
      ],
      mintComputeLimit,
    );
  }

  async mintEditionWithClaimKey(editionId: string, publicKeys: string[]) {
    return await this.flow.transaction(
      './cadence/transactions/mint_with_claim_key.cdc',
      `${this.network}-account`,
      [
        { type: t.UInt64, value: editionId },
        { type: t.Array(t.String), value: publicKeys },
      ],
      mintComputeLimit,
    );
  }

  async startDrop(saleId: string, price: string) {
    return await this.flow.transaction('./cadence/transactions/start_drop.cdc', `${this.network}-account`, [
      { type: t.String, value: saleId },
      { type: t.UFix64, value: price },
      { type: t.Optional(t.Address), value: null },
      { type: t.Optional(t.Path), value: null },
      { type: t.Optional(t.String), value: null },
      { type: t.Optional(t.String), value: null },
    ]);
  }

  async getDrop() {
    return await this.flow.script('./cadence/transactions/get_drop.cdc', []);
  }

  async stopDrop(saleId: string) {
    return await this.flow.transaction('./cadence/transactions/stop_drop.cdc', `${this.network}-account`, [
      { type: t.String, value: saleId },
    ]);
  }

  async setCollectionMetadata(collection: CollectionMetadataInput) {
    return await this.flow.transaction(
      './cadence/transactions/set_collection_metadata.cdc',
      `${this.network}-account`,
      [
        { type: t.String, value: collection.name },
        { type: t.String, value: collection.description },
        { type: t.String, value: collection.externalUrl },
        { type: t.String, value: collection.squareImage.source },
        { type: t.String, value: collection.squareImage.mediaType },
        { type: t.String, value: collection.bannerImage.source },
        { type: t.String, value: collection.bannerImage.mediaType },
        { type: t.Dictionary({ key: t.String, value: t.String }), value: objectToDictionary(collection.socials) },
      ],
    );
  }
}

function objectToDictionary(obj: { [key: string]: any }): { key: string; value: any }[] {
  return Object.entries(obj).map(([key, value]) => ({ key, value }));
}
