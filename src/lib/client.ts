import { FreshmintConfig } from './config';
import { FCL } from './fcl';
import { Transaction, convertTransactionError } from './transactions';

export class FreshmintClient {
  fcl: FCL;
  config: FreshmintConfig;

  private constructor(fcl: FCL, config?: FreshmintConfig) {
    this.fcl = fcl;
    this.config = config ?? { imports: {} };
  }

  static fromFCL(fcl: FCL, config?: FreshmintConfig): FreshmintClient {
    return new FreshmintClient(fcl, config);
  }

  async send<T = void>(tx: Transaction<T>): Promise<T> {
    const transactionId = await this.sendAsync(tx);

    try {
      const { events, error } = await this.fcl.tx({ transactionId }).onceSealed();
      if (error) {
        throw convertTransactionError(error);
      }

      const result = { events, transactionId };

      return await tx.transformResult(result);
    } catch (error) {
      throw convertTransactionError(error);
    }
  }

  async sendAsync(tx: Transaction<any>): Promise<string> {
    try {
      const fclTransaction = await tx.toFCLTransaction(this.fcl, this.config);
      const { transactionId } = await this.fcl.send(fclTransaction);
      return transactionId;
    } catch (error) {
      throw convertTransactionError(error);
    }
  }
}
