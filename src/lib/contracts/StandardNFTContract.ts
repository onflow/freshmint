// @ts-ignore
import * as fcl from '@onflow/fcl';
// @ts-ignore
import * as t from '@onflow/types';

import { Event } from '@fresh-js/core';
import { PublicKey, SignatureAlgorithm, HashAlgorithm } from '@fresh-js/crypto';

import NFTContract from './NFTContract';
import { MetadataMap } from '../metadata';
import { StandardNFTGenerator } from '../generators/StandardNFTGenerator';
import { Config, ContractImports } from '../config';
import { Transaction, TransactionResult } from '../transactions';

export type NFTMintResult = {
  id: string;
  metadata: MetadataMap;
  transactionId: string;
};

export class StandardNFTContract extends NFTContract {
  getSource(imports: ContractImports, options?: { saveAdminResourceToContractAccount?: boolean }): string {
    return StandardNFTGenerator.contract({
      imports,
      contractName: this.name,
      schema: this.schema,
      saveAdminResourceToContractAccount: options?.saveAdminResourceToContractAccount,
    });
  }

  deploy(
    publicKey: PublicKey,
    hashAlgo: HashAlgorithm,
    options?: {
      saveAdminResourceToContractAccount?: boolean;
    },
  ): Transaction<string> {
    return new Transaction(
      ({ imports }: Config) => {
        const script = StandardNFTGenerator.deploy();

        const saveAdminResourceToContractAccount = options?.saveAdminResourceToContractAccount ?? false;

        const contractCode = this.getSource(imports, { saveAdminResourceToContractAccount });
        const contractCodeHex = Buffer.from(contractCode, 'utf-8').toString('hex');

        const sigAlgo = publicKey.signatureAlgorithm();

        return {
          script,
          args: [
            fcl.arg(this.name, t.String),
            fcl.arg(contractCodeHex, t.String),
            fcl.arg(publicKey.toHex(), t.String),
            fcl.arg(SignatureAlgorithm.toCadence(sigAlgo), t.UInt8),
            fcl.arg(HashAlgorithm.toCadence(hashAlgo), t.UInt8),
            fcl.arg(saveAdminResourceToContractAccount, t.Bool),
          ],
          computeLimit: 9999,
          signers: this.getSigners(),
        };
      },
      ({ events }: TransactionResult) => {
        const accountCreatedEvent = events.find((event: Event) => event.type === 'flow.AccountCreated');

        const address = accountCreatedEvent?.data['address'];

        this.setAddress(address);

        return address;
      },
    );
  }

  mintNFTs(metadata: MetadataMap[]): Transaction<NFTMintResult[]> {
    return new Transaction(
      ({ imports }: Config) => {
        const script = StandardNFTGenerator.mint({
          imports,
          contractName: this.name,
          // TODO: return error if contract address is not set
          contractAddress: this.address ?? '',
          schema: this.schema,
        });

        return {
          script,
          args: [
            ...this.schema.getFieldList().map((field) => {
              return fcl.arg(
                metadata.map((values) => field.getValue(values)),
                t.Array(field.asCadenceTypeObject()),
              );
            }),
          ],
          computeLimit: 9999,
          signers: this.getSigners(),
        };
      },
      (result) => this.formatMintResults(result, metadata),
    );
  }

  private formatMintResults({ events, transactionId }: TransactionResult, metadata: MetadataMap[]): NFTMintResult[] {
    const deposits = events.filter((event) => event.type.includes('.Minted'));

    return deposits.map((deposit, i) => {
      return {
        id: deposit.data.id,
        metadata: metadata[i],
        transactionId,
      };
    });
  }
}