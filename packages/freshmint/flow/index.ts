import { Field, MetadataMap, Schema } from '@freshmint/core/metadata';

// @ts-ignore
import * as t from '@onflow/types';

// @ts-ignore
import { replaceImportAddresses } from '@onflow/flow-cadut';

import {
  CollectionMetadata,
  FreshmintConfig,
  prepareCollectionMetadata,
  prepareMetadataBatch,
  prepareRoyalties,
  Royalty,
} from '@freshmint/core';

import FlowCLIWrapper from './cli';

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

export type FlowNetwork = 'emulator' | 'testnet' | 'mainnet';

export class FlowGateway {
  // The Flow network to use when executing transactions and scripts.
  //
  network: FlowNetwork;

  // The Flow account to use when signing transactions.
  // The account with this name must be defined in flow.json.
  //
  signer: string;

  // A wrapper around the Flow CLI that can be used to execute
  // transactions and scripts in a child process.
  //
  cli: FlowCLIWrapper;

  constructor(network: FlowNetwork, signer: string) {
    this.network = network;
    this.signer = signer;
    this.cli = new FlowCLIWrapper(this.network);
  }

  getContractImports(): FreshmintConfig.ContractImports {
    switch (this.network) {
      case 'emulator':
        return FreshmintConfig.EMULATOR.imports;
      case 'testnet':
        return FreshmintConfig.TESTNET.imports;
      case 'mainnet':
        return FreshmintConfig.MAINNET.imports;
    }
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
    // adds support for struct arguments.
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

    console.log(args);

    return await this.cli.transaction('./cadence/transactions/deploy.cdc', this.signer, args);
  }

  async mint(mintIds: string[], schema: Schema, entries: MetadataMap[]) {
    const args = [
      { type: t.Optional(t.String), value: null }, // Bucket name
      { type: t.Array(t.String), value: mintIds },
      { type: t.Identity, value: prepareMetadataBatch(schema, entries)}
    ];

    const result = await this.cli.transaction('./cadence/transactions/mint.cdc', this.signer, args, mintComputeLimit);

    return parseMintResults(result);
  }

  async mintWithClaimKey(publicKeys: string[], mintIds: string[], fields: BatchField[]) {
    const args = [
      { type: t.Array(t.String), value: publicKeys },
      { type: t.Array(t.String), value: mintIds },
      ...fields.map(({ field, values }) => ({
        type: t.Array(field.typeInstance.cadenceType),
        value: values,
      })),
    ];

    const result = await this.cli.transaction(
      './cadence/transactions/mint_with_claim_key.cdc',
      this.signer,
      args,
      mintComputeLimit,
    );

    return parseMintResults(result);
  }

  async createEditions(mintIds: string[], sizes: number[], fields: any[]) {
    const args = [
      { type: t.Array(t.String), value: mintIds },
      { type: t.Array(t.UInt64), value: sizes.map((size) => size.toString(10)) },
      ...fields.map((field) => ({
        type: t.Array(field.cadenceType),
        value: field.values,
      })),
    ];

    const result = await this.cli.transaction(
      './cadence/transactions/create_editions.cdc',
      this.signer,
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

    const result = await this.cli.transaction('./cadence/transactions/mint.cdc', this.signer, args, mintComputeLimit);

    return parseEditionMintResults(result);
  }

  async mintEditionWithClaimKey(editionId: string, publicKeys: string[]) {
    const args = [
      { type: t.UInt64, value: editionId },
      { type: t.Array(t.String), value: publicKeys },
    ];

    const result = await this.cli.transaction(
      './cadence/transactions/mint_with_claim_key.cdc',
      this.signer,
      args,
      mintComputeLimit,
    );

    return parseEditionMintResults(result);
  }

  async startDrop(saleId: string, price: string) {
    return await this.cli.transaction('./cadence/transactions/start_drop.cdc', this.signer, [
      { type: t.String, value: saleId },
      { type: t.UFix64, value: price },
      { type: t.Optional(t.Address), value: null },
      { type: t.Optional(t.Path), value: null },
      { type: t.Optional(t.String), value: null },
      { type: t.Optional(t.String), value: null },
    ]);
  }

  async getDrop() {
    return await this.cli.script('./cadence/scripts/get_drop.cdc', []);
  }

  async stopDrop(saleId: string) {
    return await this.cli.transaction('./cadence/transactions/stop_drop.cdc', this.signer, [
      { type: t.String, value: saleId },
    ]);
  }

  async getDuplicateNFTs(hashes: string[]): Promise<boolean[]> {
    return await this.cli.script('./cadence/scripts/get_duplicate_nfts.cdc', [
      { type: t.Array(t.String), value: hashes },
    ]);
  }

  async getEditionsByMintId(mintIds: string[]): Promise<{ id: string; size: number; count: number }[]> {
    return await this.cli.script('./cadence/scripts/get_editions_by_primary_key.cdc', [
      { type: t.Array(t.String), value: mintIds },
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
      size: parseInt(editionSize, 10),
      count: parseInt(editionCount, 10),
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
