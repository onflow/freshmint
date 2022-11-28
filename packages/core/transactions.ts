// @ts-ignore
import { withPrefix, sansPrefix } from '@onflow/util-address';

import { FreshmintConfig } from './config';
import { Signer } from './crypto';
import { FCL, FCLTransaction } from './fcl';

const toHex = (buffer: Buffer) => buffer.toString('hex');
const fromHex = (hex: string) => Buffer.from(hex, 'hex');

export interface TransactionResult {
  transactionId: string;
  events: TransactionEvent[];
}

export type TransactionEvent = {
  type: string;
  data: { [key: string]: string };
};

export class TransactionAuthorizer {
  address: string;
  keyIndex: number;
  signer: Signer;

  constructor({ address, keyIndex, signer }: { address: string; keyIndex: number; signer: Signer }) {
    this.address = address;
    this.keyIndex = keyIndex;
    this.signer = signer;
  }

  // Convert this authorizer to an authorization function that can be passed to FCL-JS.
  //
  // FCL will invoke this function when resolving signatures for a transaction.
  //
  // Ref: https://github.com/onflow/fcl-js/blob/3355cb148f2e6a447d8076b3ae62c40747c338ce/packages/fcl/src/wallet-provider-spec/authorization-function.md#how-to-create-an-authorization-function
  //
  toFCLAuthorizationFunction() {
    return async (account = {}) => {
      const keyIndex = Number(this.keyIndex);

      return {
        ...account,
        tempId: `${withPrefix(this.address)}-${keyIndex}`,
        addr: sansPrefix(this.address),
        keyId: keyIndex,
        signingFunction: async (data: { message: string }) => {
          const message = fromHex(data.message);

          const signature = await this.signer.sign(message);

          return {
            addr: withPrefix(this.address),
            keyId: keyIndex,
            signature: toHex(signature),
          };
        },
      };
    };
  }
}

export type TransactionResultTransformer<T> = (result: TransactionResult) => T;

export type TransactionSigners = {
  payer: TransactionAuthorizer;
  proposer: TransactionAuthorizer;
  authorizers: TransactionAuthorizer[];
};

export type TransactionBody = {
  script: string;
  args: any[]; // TODO: use real types
  computeLimit: number;
  signers?: TransactionSigners;
};

export class Transaction<T> {
  private create: (config: FreshmintConfig) => TransactionBody | Promise<TransactionBody>;
  private onResult: TransactionResultTransformer<T>;

  /* eslint-disable @typescript-eslint/no-empty-function */
  static VoidResult = () => {};

  constructor(
    create: (config: FreshmintConfig) => TransactionBody | Promise<TransactionBody>,
    onResult: TransactionResultTransformer<T>,
  ) {
    this.create = create;
    this.onResult = onResult;
  }

  async toFCLTransaction(fcl: FCL, config: FreshmintConfig): Promise<FCLTransaction> {
    const { script, args, computeLimit, signers } = await this.create(config);

    return [fcl.transaction(script), fcl.args(args), fcl.limit(computeLimit), ...this.getAuthorizations(fcl, signers)];
  }

  async transformResult(result: TransactionResult): Promise<T> {
    return await this.onResult(result);
  }

  private getAuthorizations(fcl: FCL, signers: TransactionSigners | undefined) {
    if (signers) {
      return [
        fcl.payer(signers.payer.toFCLAuthorizationFunction()),
        fcl.proposer(signers.proposer.toFCLAuthorizationFunction()),
        fcl.authorizations(signers.authorizers.map((auth) => auth.toFCLAuthorizationFunction())),
      ];
    }

    return [];
  }
}

class TransactionError extends Error {}

export function convertTransactionError(error: any): Error {
  // TODO: parse error and convert to correct error class
  return new TransactionError(error);
}
