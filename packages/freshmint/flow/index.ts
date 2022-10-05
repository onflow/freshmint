// @ts-ignore
import * as t from '@onflow/types';

import FlowCliWrapper from './cli';

export default class FlowGateway {
  network: string;
  flow: FlowCliWrapper;

  constructor(network: string) {
    this.network = network || 'emulator';
    this.flow = new FlowCliWrapper(this.network);
  }

  async mint(fields: any[]) {
    return await this.flow.transaction(
      './cadence/transactions/mint.cdc',
      `${this.network}-account`,
      fields.map((field) => ({
        type: t.Array(field.typeInstance.cadenceType),
        value: field.values,
      })),
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

    return await this.flow.transaction('./cadence/transactions/create_editions.cdc', `${this.network}-account`, args);
  }

  async mintEdition(editionId: string, count: number) {
    return await this.flow.transaction('./cadence/transactions/mint.cdc', `${this.network}-account`, [
      { type: t.UInt64, value: editionId },
      { type: t.Int, value: count.toString(10) },
      { type: t.Optional(t.String), value: null },
    ]);
  }

  async mintEditionWithClaimKey(editionId: string, publicKeys: string[]) {
    return await this.flow.transaction('./cadence/transactions/mint_with_claim_key.cdc', `${this.network}-account`, [
      { type: t.UInt64, value: editionId },
      { type: t.Array(t.String), value: publicKeys },
    ]);
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
}
