// @ts-ignore
import * as t from '@onflow/types';

// @ts-ignore
import { replaceImportAddresses } from '@onflow/flow-cadut';

import {
  CollectionMetadata,
  FreshmintConfig,
  prepareCollectionMetadata,
  prepareRoyalties,
  Royalty,
} from '@freshmint/core';

import FlowCliWrapper from './cli';

// Use the maximum compute limit for minting transactions.
//
// This allows users to set the highest possible batch size.
const mintComputeLimit = 9999;

export type FlowNetwork = 'emulator' | 'testnet' | 'mainnet';

export class FlowGateway {
  network: FlowNetwork;
  flow: FlowCliWrapper;

  constructor(network: FlowNetwork) {
    this.network = network || 'emulator';
    this.flow = new FlowCliWrapper(this.network);
  }

  getContractImports(): FreshmintConfig.ContractImports {
    switch (this.network) {
      case 'emulator':
        return FreshmintConfig.EMULATOR.imports;
      case 'testnet':
        return FreshmintConfig.EMULATOR.imports;
      case 'mainnet':
        return FreshmintConfig.EMULATOR.imports;
    }

    throw new Error(`Invalid network "${this.network}". Expected one of "emulator", "testnet" or "mainnet".`);
  }

  async deploy(name: string, code: string, collectionMetadata: CollectionMetadata, royalties: Royalty[]) {
    const { royaltyAddresses, royaltyReceiverPaths, royaltyCuts, royaltyDescriptions } = prepareRoyalties(royalties);

    const contractImports = this.getContractImports();

    // The Flow CLI normally handles import replacement when using
    // the `flow deploy` or `flow accounts add-contract` commands.
    //
    // However, we need to replace the imports ourselves because
    // we are using a custom deployment transaction.
    //
    // We can ditch the custom transaction and use `add-contract` if it
    // adds support for struct arguments. This is something I'd like to help
    // implement in the CLI.
    //
    const preparedCode = replaceImportAddresses(code, contractImports);
    const preparedCodeAsHex = Buffer.from(preparedCode, 'utf-8').toString('hex');

    const args = [
      { type: t.String, value: name },
      { type: t.String, value: preparedCodeAsHex },
      { type: t.Identity, value: prepareCollectionMetadata(contractImports.MetadataViews, collectionMetadata) },
      { type: t.Array(t.Address), value: royaltyAddresses },
      { type: t.Array(t.Path), value: royaltyReceiverPaths },
      { type: t.Array(t.UFix64), value: royaltyCuts },
      { type: t.Array(t.String), value: royaltyDescriptions },
    ];

    return await this.flow.transaction('./cadence/transactions/deploy.cdc', `${this.network}-account`, args);
  }

  async mint(fields: any[]) {
    const args = [
      { type: t.Optional(t.String), value: null }, // Bucket name
      ...fields.map((field) => ({
        type: t.Array(field.typeInstance.cadenceType),
        value: field.values,
      })),
    ];

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
}
