import { Field } from '@freshmint/core/metadata';

// @ts-ignore
import * as t from '@onflow/types';

import FlowCliWrapper from './cli';

export interface BatchField {
  field: Field;
  values: any[];
}

export interface MintResult {
  id: string;
  transactionId: string;
}

// Use the maximum compute limit for minting transactions.
//
// This allows users to set the highest possible batch size.
const mintComputeLimit = 9999;

export class FlowGateway {
  network: string;
  flow: FlowCliWrapper;

  constructor(network: string) {
    this.network = network || 'emulator';
    this.flow = new FlowCliWrapper(this.network);
  }

  async mint(fields: BatchField[]) {
    const args = fields.map(({ field, values }) => ({
      type: t.Array(field.typeInstance.cadenceType),
      value: values,
    }));

    const result = await this.flow.transaction(
      './cadence/transactions/mint.cdc',
      `${this.network}-account`,
      args,
      mintComputeLimit,
    );

    return parseMintResults(result);
  }

  async mintWithClaimKey(publicKeys: string[], fields: BatchField[]) {
    const args = [
      { type: t.Array(t.String), value: publicKeys },
      ...fields.map(({ field, values }) => ({
        type: t.Array(field.typeInstance.cadenceType),
        value: values,
      })),
    ];

    const result = await this.flow.transaction(
      './cadence/transactions/mint_with_claim_key.cdc',
      `${this.network}-account`,
      args,
      mintComputeLimit,
    );

    return parseMintResults(result);
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

    const result = await this.flow.transaction(
      './cadence/transactions/create_editions.cdc',
      `${this.network}-account`,
      args,
      mintComputeLimit,
    );

    return parseEditionResults(result);
  }

  async mintEdition(editionId: string, count: number) {
    const args = [
      { type: t.UInt64, value: editionId },
      { type: t.Int, value: count.toString(10) },
      { type: t.Optional(t.String), value: null },
    ];

    const result = await this.flow.transaction(
      './cadence/transactions/mint.cdc',
      `${this.network}-account`,
      args,
      mintComputeLimit,
    );

    return parseEditionMintResults(result);
  }

  async mintEditionWithClaimKey(editionId: string, publicKeys: string[]) {
    const args = [
      { type: t.UInt64, value: editionId },
      { type: t.Array(t.String), value: publicKeys },
    ];

    const result = await this.flow.transaction(
      './cadence/transactions/mint_with_claim_key.cdc',
      `${this.network}-account`,
      args,
      mintComputeLimit,
    );

    return parseEditionMintResults(result);
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
    return await this.flow.script('./cadence/scripts/get_drop.cdc', []);
  }

  async stopDrop(saleId: string) {
    return await this.flow.transaction('./cadence/transactions/stop_drop.cdc', `${this.network}-account`, [
      { type: t.String, value: saleId },
    ]);
  }

  async getDuplicateNFTs(hashes: string[]): Promise<boolean[]> {
    return await this.flow.script('./cadence/scripts/get_duplicate_nfts.cdc', [
      { type: t.Array(t.String), value: hashes },
    ]);
  }

  async getEditionsByHash(hashes: string[]) {
    return await this.flow.script('./cadence/scripts/get_editions_by_hash.cdc', [
      { type: t.Array(t.String), value: hashes },
    ]);
  }
}

function parseMintResults(txOutput: any): MintResult[] {
  const deposits = txOutput.events.filter((event: any) => event.type.includes('.Minted'));

  return deposits.map((deposit: any) => {
    const id = deposit.values.value.fields.find((f: any) => f.name === 'id').value;

    return {
      id: id.value,
      transactionId: txOutput.id,
    };
  });
}

function parseEditionResults(txOutput: any): { id: string; size: number; count: number }[] {
  const editions = txOutput.events.filter((event: any) => event.type.includes('.EditionCreated'));

  return editions.map((edition: any) => {
    // TODO: improve event parsing. Use FCL?

    const editionStruct = edition.values.value.fields.find((f: any) => f.name === 'edition').value;

    const editionId = editionStruct.value.fields.find((f: any) => f.name === 'id').value.value;
    const editionCount = editionStruct.value.fields.find((f: any) => f.name === 'count').value.value;
    const editionSize = editionStruct.value.fields.find((f: any) => f.name === 'size').value.value;

    return {
      id: editionId,
      size: editionSize,
      count: editionCount,
      transactionId: txOutput.id,
    };
  });
}

function parseEditionMintResults(txOutput: any) {
  const mints = txOutput.events.filter((event: any) => event.type.includes('.Minted'));

  return mints.map((mint: any) => {
    // TODO: improve event parsing. Use FCL?

    const tokenId = mint.values.value.fields.find((f: any) => f.name === 'id').value;
    const serialNumber = mint.values.value.fields.find((f: any) => f.name === 'serialNumber').value;

    return {
      id: tokenId.value,
      serialNumber: serialNumber.value,
      transactionId: txOutput.id,
    };
  });
}
