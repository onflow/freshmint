import { FreshmintConfig } from './config';
import { FCLTransaction } from './fcl';

export type ScriptResultTransformer<T> = (result: any) => T;

export type ScriptBody = {
  script: string;
  args: (arg: any, t: any) => any[]; // TODO: use real types
  computeLimit: number;
};

export class Script<T> {
  private create: (config: FreshmintConfig) => ScriptBody | Promise<ScriptBody>;
  private onResult: ScriptResultTransformer<T>;

  constructor(
    create: (config: FreshmintConfig) => ScriptBody | Promise<ScriptBody>,
    onResult: ScriptResultTransformer<T>,
  ) {
    this.create = create;
    this.onResult = onResult;
  }

  async toFCLScript(config: FreshmintConfig): Promise<FCLTransaction> {
    const { script, args, computeLimit } = await this.create(config);

    return {
      cadence: script,
      args,
      limit: computeLimit,
    };
  }

  async transformResult(result: any): Promise<T> {
    return await this.onResult(result);
  }
}

class ScriptError extends Error {}

export function convertScriptError(error: any): Error {
  // TODO: parse error and convert to correct error class
  return new ScriptError(error);
}
