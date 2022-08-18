// @ts-ignore
import * as fcl from '@onflow/fcl';

// @ts-ignore
import * as t from '@onflow/types';

import { ClaimSaleGenerator } from '../generators/ClaimSaleGenerator';
import { Authorizer, Event } from '@fresh-js/core';
import NFTCollection from '../collections/NFTCollection';
import { Config, ContractImports } from '../config';
import { Transaction, TransactionResult } from '../transactions';

export class ClaimSale {
  collection: NFTCollection;

  constructor(collection: NFTCollection) {
    this.collection = collection;
  }

  getContract(imports: ContractImports): string {
    return ClaimSaleGenerator.contract({
      contracts: imports,
    });
  }

  start({ id, price, bucket }: { id: string; price: string; bucket?: string }): Transaction<void> {
    return new Transaction((config: Config) => {
      const script = ClaimSaleGenerator.startSale({
        contracts: config.imports,
        contractName: this.collection.name,
        // TODO: return error if contract address is not set
        contractAddress: this.collection.address ?? '',
      });

      return {
        script,
        args: [fcl.arg(id, t.String), fcl.arg(price, t.UFix64), fcl.arg(bucket, t.Optional(t.String))],
        computeLimit: 9999,
        signers: this.collection.getSigners(),
      };
    }, Transaction.VoidResult);
  }

  stop(id: string): Transaction<void> {
    return new Transaction((config: Config) => {
      const script = ClaimSaleGenerator.stopSale({
        contracts: config.imports,
        contractName: this.collection.name,
        // TODO: return error if contract address is not set
        contractAddress: this.collection.address ?? '',
      });

      return {
        script,
        args: [fcl.arg(id, t.String)],
        computeLimit: 9999,
        signers: this.collection.getSigners(),
      };
    }, Transaction.VoidResult);
  }

  // TODO: move this function and/or refactor this class
  //
  // This is a transaction that is only executed by client, who does not need
  // access to the "admin" settings of a project.
  //
  // What is the best way to separate the two?
  claimNFT(saleAddress: string, authorizer: Authorizer, saleId: string): Transaction<string> {
    return new Transaction(
      (config: Config) => {
        const script = ClaimSaleGenerator.claimNFT({
          contracts: config.imports,
          contractName: this.collection.name,
          // TODO: return error if contract address is not set
          contractAddress: this.collection.address ?? '',
        });

        return {
          script,
          args: [fcl.arg(saleAddress, t.Address), fcl.arg(saleId, t.String)],
          computeLimit: 9999,
          signers: this.collection.getSigners(),
        };
      },
      ({ events }: TransactionResult) => {
        const claimedEvent: Event = events.find((event: Event) => event.type.includes('.Claimed'));

        const nftId = claimedEvent.data['nftID'];

        return nftId;
      },
    );
  }
}
