import { useState } from 'react';

import { useFCL } from './useFCL';
import { CadenceSourceCode } from '../cadence';
import {
  Transaction,
  TransactionParameters,
  isTransactionParameters,
  TransactionResult,
  TransactionResultTransformer,
  convertToTransactionError,
} from '../transaction';
import { FCLModule } from '../fcl';

export type TransactionExecutor = (...args: any[]) => Promise<void>;

export function useTransaction<T = TransactionResult>(
  transaction: Transaction<T> | TransactionParameters | CadenceSourceCode,
  onResult?: TransactionResultTransformer<T>,
): [T | undefined, TransactionExecutor, boolean] {
  const [result, setResult] = useState<T | undefined>(undefined);
  const isLoading = result === undefined;

  const { fcl, getNetwork } = useFCL();

  async function execute(...args: any[]) {
    let transactionInstance = normalizeTransaction<T>(transaction, args);

    if (onResult !== undefined) {
      transactionInstance = transactionInstance.onResult(onResult);
    }

    const network = await getNetwork();

    const result = await executeTransaction(fcl, transactionInstance, network);

    setResult(result);
  }

  return [result, execute, isLoading];
}

function normalizeTransaction<T>(
  transaction: Transaction<T> | TransactionParameters | CadenceSourceCode,
  args: any[],
): Transaction<T> {
  if (transaction instanceof Transaction) {
    return transaction;
  }

  if (isTransactionParameters(transaction)) {
    return new Transaction<T>(transaction);
  }

  return new Transaction<T>({ cadence: transaction, args: args });
}

async function executeTransaction<T = void>(fcl: FCLModule, tx: Transaction<T>, network: string): Promise<T> {
  const transactionId = await sendTransaction(fcl, tx, network);

  try {
    const { events, error } = await fcl.tx({ transactionId }).onceSealed();
    if (error) {
      throw convertToTransactionError(error);
    }

    const result = { events, transactionId };

    return await tx.transformResult(result);
  } catch (error) {
    throw convertToTransactionError(error);
  }
}

async function sendTransaction(fcl: FCLModule, tx: Transaction<any>, network: string): Promise<string> {
  // Do not catch and convert errors that throw when building the transaction
  const fclTransaction = await tx.toFCLTransaction(fcl, network);

  try {
    // Return the transaction ID
    return await fcl.mutate(fclTransaction);
  } catch (error) {
    throw convertToTransactionError(error);
  }
}
