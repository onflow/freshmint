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
      { type: t.Array(t.UInt), value: sizes.map((size) => size.toString(10)) },
      ...fields.map((field) => ({
        type: t.Array(field.cadenceType),
        value: field.values,
      })),
    ];

    return await this.flow.transaction('./cadence/transactions/create_editions.cdc', `${this.network}-account`, args);
  }

  async mintEdition(editionIds: string[], editionSerials: string[]) {
    return await this.flow.transaction('./cadence/transactions/mint.cdc', `${this.network}-account`, [
      { type: t.Array(t.UInt64), value: editionIds },
      { type: t.Array(t.UInt64), value: editionSerials },
      { type: t.Optional(t.String), value: null },
    ]);
  }

  async mintEditionWithClaimKey(publicKeys: string[], editionIds: string[], editionSerials: string[]) {
    return await this.flow.transaction('./cadence/transactions/mint_with_claim_key.cdc', `${this.network}-account`, [
      { type: t.Array(t.String), value: publicKeys },
      { type: t.Array(t.UInt64), value: editionIds },
      { type: t.Array(t.UInt64), value: editionSerials }
    ]);
  }
}
