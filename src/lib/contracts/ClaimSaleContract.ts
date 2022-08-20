// @ts-ignore
import * as fcl from '@onflow/fcl';

// @ts-ignore
import * as t from '@onflow/types';

import { ClaimSaleGenerator } from '../generators/ClaimSaleGenerator';
import { Authorizer, Event } from '@fresh-js/core';

import NFTContract from './NFTContract';
import { Config, ContractImports } from '../config';
import { Transaction, TransactionResult } from '../transactions';

export class ClaimSaleContract {
  nftContract: NFTContract;

  constructor(nftContract: NFTContract) {
    this.nftContract = nftContract;
  }

  getSource(imports: ContractImports): string {
    return ClaimSaleGenerator.contract({
      imports,
    });
  }

  start({ id, price, bucket }: { id: string; price: string; bucket?: string }): Transaction<void> {
    return new Transaction(({ imports }: Config) => {
      const script = ClaimSaleGenerator.startSale({
        imports,
        contractName: this.nftContract.name,
        // TODO: return error if contract address is not set
        contractAddress: this.nftContract.address ?? '',
      });

      return {
        script,
        args: [fcl.arg(id, t.String), fcl.arg(price, t.UFix64), fcl.arg(bucket, t.Optional(t.String))],
        computeLimit: 9999,
        signers: this.nftContract.getSigners(),
      };
    }, Transaction.VoidResult);
  }

  stop(id: string): Transaction<void> {
    return new Transaction(({ imports }: Config) => {
      const script = ClaimSaleGenerator.stopSale({
        imports,
        contractName: this.nftContract.name,
        // TODO: return error if contract address is not set
        contractAddress: this.nftContract.address ?? '',
      });

      return {
        script,
        args: [fcl.arg(id, t.String)],
        computeLimit: 9999,
        signers: this.nftContract.getSigners(),
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
      ({ imports }: Config) => {
        const script = ClaimSaleGenerator.claimNFT({
          imports,
          contractName: this.nftContract.name,
          // TODO: return error if contract address is not set
          contractAddress: this.nftContract.address ?? '',
        });

        return {
          script,
          args: [fcl.arg(saleAddress, t.Address), fcl.arg(saleId, t.String)],
          computeLimit: 9999,
          signers: this.nftContract.getSigners(),
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
