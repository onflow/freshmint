// @ts-ignore
import * as fcl from '@onflow/fcl';

// @ts-ignore
import * as t from '@onflow/types';

import { ClaimSaleGenerator } from '../generators/ClaimSaleGenerator';

import NFTContract from './NFTContract';
import { FreshmintConfig, ContractImports } from '../config';
import { Transaction, TransactionAuthorizer, TransactionResult } from '../transactions';
import { parsePath } from '../cadence/values';

const flowTokenReceiverPublicPath = '/public/flowTokenReceiver';

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

  start({
    id,
    price,
    paymentReceiverAddress,
    paymentReceiverPath,
    bucket,
    allowlist,
  }: {
    id: string;
    price: string;
    paymentReceiverAddress?: string;
    paymentReceiverPath?: string;
    bucket?: string;
    allowlist?: string;
  }): Transaction<void> {
    const signers = this.nftContract.getSigners();

    // Payment receiver address defaults to the transaction signer
    paymentReceiverAddress = paymentReceiverAddress ?? signers.authorizers[0].address;

    // Payment receiver path defaults to the FLOW token receiver
    paymentReceiverPath = paymentReceiverPath ?? flowTokenReceiverPublicPath;

    return new Transaction(({ imports }: FreshmintConfig) => {
      const script = ClaimSaleGenerator.startSale({
        imports,
        contractName: this.nftContract.name,
        contractAddress: this.nftContract.getAddress(),
      });

      return {
        script,
        args: [
          fcl.arg(id, t.String),
          fcl.arg(price, t.UFix64),
          fcl.arg(paymentReceiverAddress, t.Optional(t.Address)),
          fcl.arg(parsePath(paymentReceiverPath), t.Optional(t.Path)),
          fcl.arg(bucket, t.Optional(t.String)),
          fcl.arg(allowlist ?? null, t.Optional(t.String)),
        ],
        computeLimit: 9999,
        signers,
      };
    }, Transaction.VoidResult);
  }

  stop(id: string): Transaction<void> {
    return new Transaction(({ imports }: FreshmintConfig) => {
      const script = ClaimSaleGenerator.stopSale({
        imports,
        contractName: this.nftContract.name,
        contractAddress: this.nftContract.getAddress(),
      });

      return {
        script,
        args: [fcl.arg(id, t.String)],
        computeLimit: 9999,
        signers: this.nftContract.getSigners(),
      };
    }, Transaction.VoidResult);
  }

  addToAllowlist({
    name,
    addresses,
    claims,
  }: {
    name: string;
    addresses: string[];
    claims: number;
  }): Transaction<void> {
    return new Transaction(({ imports }: FreshmintConfig) => {
      const script = ClaimSaleGenerator.addToAllowlist({
        imports,
        contractName: this.nftContract.name,
        contractAddress: this.nftContract.getAddress(),
      });

      return {
        script,
        args: [fcl.arg(name, t.String), fcl.arg(addresses, t.Array(t.Address)), fcl.arg(claims.toString(10), t.UInt)],
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
  claimNFT(saleAddress: string, authorizer: TransactionAuthorizer, saleId: string): Transaction<string> {
    return new Transaction(
      ({ imports }: FreshmintConfig) => {
        const script = ClaimSaleGenerator.claimNFT({
          imports,
          contractName: this.nftContract.name,
          contractAddress: this.nftContract.getAddress(),
        });

        return {
          script,
          args: [fcl.arg(saleAddress, t.Address), fcl.arg(saleId, t.String)],
          computeLimit: 9999,
          signers: {
            payer: authorizer,
            proposer: authorizer,
            authorizers: [authorizer],
          },
        };
      },
      ({ events }: TransactionResult) => {
        const claimedEvent = events.find((event) => event.type.includes('.Claimed'));

        const nftId = claimedEvent.data['nftID'];

        return nftId;
      },
    );
  }
}
