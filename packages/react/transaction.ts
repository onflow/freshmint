// @ts-ignore
import { withPrefix, sansPrefix } from '@onflow/util-address';

import { CadenceSourceCode, resolveCadence, Arguments, resolveArgs } from './cadence';
import { FCLModule, FCLTransaction } from './fcl';

const toHex = (buffer: Buffer) => buffer.toString('hex');
const fromHex = (hex: string) => Buffer.from(hex, 'hex');

export interface Signer {
  sign(message: Buffer): Buffer;
}

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

  toFCLAuthorizationFunction() {
    return async (account = {}) => {
      return {
        ...account,
        tempId: 'SIGNER',
        addr: sansPrefix(this.address),
        keyId: this.keyIndex,
        signingFunction: (data: { message: string }) => ({
          addr: withPrefix(this.address),
          keyId: this.keyIndex,
          signature: toHex(this.signer.sign(fromHex(data.message))),
        }),
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

export type TransactionParameters = {
  cadence: CadenceSourceCode;
  args?: Arguments;
  computeLimit?: number;
  signers?: TransactionSigners;
};

export function isTransactionParameters(transaction: any): transaction is TransactionParameters {
  return (transaction as TransactionParameters).cadence !== undefined;
}

export class Transaction<T = TransactionResult> {
  static defaultComputeLimit = 1000;

  cadence: CadenceSourceCode;
  args?: Arguments;
  computeLimit?: number;
  signers?: TransactionSigners;

  private _onResult: TransactionResultTransformer<T>;

  /* eslint-disable @typescript-eslint/no-empty-function */
  static VoidResult = () => {};

  constructor(
    { cadence, args, computeLimit, signers }: TransactionParameters,
    onResult: TransactionResultTransformer<T> = (result: TransactionResult) => result as T,
  ) {
    this.cadence = cadence;
    this.args = args;
    this.computeLimit = computeLimit;
    this.signers = signers;

    this._onResult = onResult;
  }

  onResult<T>(onResult: TransactionResultTransformer<T>): Transaction<T> {
    return new Transaction<T>(
      {
        cadence: this.cadence,
        args: this.args,
        computeLimit: this.computeLimit,
        signers: this.signers,
      },
      onResult,
    );
  }

  async toFCLTransaction(fcl: FCLModule, network: string): Promise<FCLTransaction> {
    const limit = this.computeLimit ?? Transaction.defaultComputeLimit;
    const cadence = resolveCadence(this.cadence, network);
    const args = await resolveArgs(cadence, this.args ?? []);

    return {
      cadence,
      args,
      limit,
      ...this.getAuthorizations(fcl, this.signers),
    };
  }

  async transformResult(result: TransactionResult): Promise<T> {
    return await this._onResult(result);
  }

  private getAuthorizations(fcl: FCLModule, signers: TransactionSigners | undefined) {
    if (signers) {
      return {
        payer: signers.payer.toFCLAuthorizationFunction(),
        proposer: signers.proposer.toFCLAuthorizationFunction(),
        authorizations: signers.authorizers.map((auth) => auth.toFCLAuthorizationFunction()),
      };
    }

    return {};
  }
}

class TransactionError extends Error {}

export function convertToTransactionError(error: any): Error {
  // TODO: parse error and convert to correct error class
  return new TransactionError(error);
}
