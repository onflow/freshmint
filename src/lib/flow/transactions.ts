import { Authorizer, Event } from '@fresh-js/core';
import { FlowConfig } from './config';
import { FCL, FCLTransaction } from './fcl';

export interface TransactionResult {
  transactionId: string;
  events: Event[];
}

export type TransactionResultTransformer<T> = (result: TransactionResult) => T;

export type TransactionSigners = {
  payer: Authorizer;
  proposer: Authorizer;
  authorizers: Authorizer[];
};

export type TransactionBody = {
  script: string;
  args: any[]; // TODO: use real types
  computeLimit: number;
  signers?: TransactionSigners;
};

export class Transaction<T> {
  private create: (config: FlowConfig) => TransactionBody | Promise<TransactionBody>;
  private onResult: TransactionResultTransformer<T>;

  constructor(
    create: (config: FlowConfig) => TransactionBody | Promise<TransactionBody>,
    onResult?: TransactionResultTransformer<T>,
  ) {
    this.create = create;
    this.onResult = onResult;
  }

  async toFCLTransaction(fcl: FCL, config: FlowConfig): Promise<FCLTransaction> {
    const { script, args, computeLimit, signers } = await this.create(config);

    return [fcl.transaction(script), fcl.args(args), fcl.limit(computeLimit), ...this.getAuthorizations(fcl, signers)];
  }

  async transformResult(result: TransactionResult): Promise<T | void> {
    if (this.onResult) {
      return await this.onResult(result);
    }
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
