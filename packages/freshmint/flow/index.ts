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

import FlowCLIWrapper from './cli';

export interface BatchField {
  cadenceType: any;
  values: any[];
}

export type MintResult = {
  id: string;
  transactionId: string;
};

export type MintEditionResult = {
  id: string;
  serialNumber: string;
  transactionId: string;
};

export type CreateEditionResult = {
  id: string;
  limit: number | null;
  size: number;
  transactionId: string;
};

export type EditionResult = {
  id: string;
  limit: number;
  size: number;
} | null;

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

    return await this.cli.transaction('./cadence/transactions/deploy.cdc', this.signer, args);
  }

  async mint(mintIds: string[], fields: BatchField[]) {
    const args = [
      { type: t.Optional(t.String), value: null }, // Bucket name
      { type: t.Array(t.String), value: mintIds },
      ...fields.map((field) => ({
        type: t.Array(field.cadenceType),
        value: field.values,
      })),
    ];

    const result = await this.cli.transaction('./cadence/transactions/mint.cdc', this.signer, args, mintComputeLimit);

    return parseMintResults(result);
  }

  async mintWithClaimKey(publicKeys: string[], mintIds: string[], fields: BatchField[]) {
    const args = [
      { type: t.Array(t.String), value: publicKeys },
      { type: t.Array(t.String), value: mintIds },
      ...fields.map((field) => ({
        type: t.Array(field.cadenceType),
        value: field.values,
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

  async createEditions(mintIds: string[], limits: (string | null)[], fields: BatchField[]) {
    const args = [
      { type: t.Array(t.String), value: mintIds },
      { type: t.Array(t.Optional(t.UInt64)), value: limits },
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

    return parseCreateEditionResults(result);
  }

  async mintEdition(editionId: string, count: number) {
    const args = [
      { type: t.UInt64, value: editionId },
      { type: t.Int, value: count.toString(10) },
      { type: t.Optional(t.String), value: null },
    ];

    const result = await this.cli.transaction('./cadence/transactions/mint.cdc', this.signer, args, mintComputeLimit);

    return parseMintEditionResults(result);
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

    return parseMintEditionResults(result);
  }

  async startDrop(saleId: string, price: string) {
    return await this.cli.transaction('./cadence/transactions/start_drop.cdc', this.signer, [
      { type: t.String, value: saleId }, // saleID
      { type: t.UFix64, value: price }, // price
      { type: t.Optional(t.Address), value: null }, // paymentReceiverAddress (defaults to signer)
      { type: t.Optional(t.Path), value: null }, // paymentReceiverPath (defaults to /public/flowTokenReceiver)
      { type: t.Optional(t.String), value: null }, // bucketName
      { type: t.Optional(t.UInt), value: null }, // claimLimit
      { type: t.Optional(t.String), value: null }, // allowlistName
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

  async getEditionsByMintId(mintIds: string[]): Promise<EditionResult[]> {
    const results = await this.cli.script('./cadence/scripts/get_editions_by_mint_id.cdc', [
      { type: t.Array(t.String), value: mintIds },
    ]);

    return parseGetEditionResults(results);
  }

  async destroyNFTs(ids: string[]) {
    return await this.cli.transaction('./cadence/transactions/destroy_nfts.cdc', this.signer, [
      { type: t.Array(t.UInt64), value: ids },
      { type: t.Optional(t.String), value: null } // bucketName
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

function parseCreateEditionResults(txOutput: any): CreateEditionResult[] {
  const editions: any[] = txOutput.events.filter((event: any) => event.type.includes('.EditionCreated'));

  return editions.map((edition: any) => {
    // TODO: improve event parsing. Use FCL?

    const editionStruct = edition.values.value.fields.find((f: any) => f.name === 'edition').value;

    const editionId = editionStruct.value.fields.find((f: any) => f.name === 'id').value.value;
    const limit = getEditionLimitFromEvent(editionStruct);

    return {
      id: editionId,
      limit,
      size: 0,
      transactionId: txOutput.id,
    };
  });
}

// The legacy edition contract (pre v0.3.0 and earlier) does
// not contain a limit field. In this case, use the size field instead.
//
function getEditionLimitFromEvent(editionStruct: any): number | null {
  const limit = editionStruct.value.fields.find((f: any) => f.name === 'limit');

  // Only parse the limit field if it exists
  if (limit !== undefined) {
    const optionalLimit = limit.value.value;
    return optionalLimit ? parseInt(optionalLimit.value, 10) : null;
  }

  // Otherwise, assume legacy format and return size
  const size = editionStruct.value.fields.find((f: any) => f.name === 'size');

  return parseInt(size.value.value, 10);
}

function parseMintEditionResults(txOutput: any): MintEditionResult[] {
  const mints: any[] = txOutput.events.filter((event: any) => event.type.includes('.Minted'));

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

function parseGetEditionResults(editions: any[]): EditionResult[] {
  return editions.map((edition) => {
    if (edition === null) {
      return null;
    }

    // If limit is undefined, assume legacy edition format
    if (edition.limit === undefined) {
      return {
        id: edition.id,
        limit: edition.size,
        size: edition.count,
      };
    }

    return {
      id: edition.id,
      limit: edition.limit,
      size: edition.size,
    };
  });
}
