import { FCLScript } from './fcl';
import { CadenceSourceCode, resolveCadence, Arguments, resolveArgs } from './cadence';

export type ScriptResultTransformer<T> = (result: any) => T;

export type ScriptParameters = {
  cadence: CadenceSourceCode;
  args?: Arguments;
  computeLimit?: number;
};

export function isScriptParameters(script: any): script is ScriptParameters {
  return (script as ScriptParameters).cadence !== undefined;
}

export class Script<T = any> {
  static defaultComputeLimit = 100;

  cadence: CadenceSourceCode;
  args?: Arguments;
  computeLimit?: number;

  private _onResult: ScriptResultTransformer<T>;

  constructor(
    { cadence, args, computeLimit }: ScriptParameters,
    onResult: ScriptResultTransformer<T> = (result: any) => result,
  ) {
    this.cadence = cadence;
    this.args = args;
    this.computeLimit = computeLimit;

    this._onResult = onResult;
  }

  onResult<T>(onResult: ScriptResultTransformer<T>): Script<T> {
    return new Script<T>({ cadence: this.cadence, args: this.args, computeLimit: this.computeLimit }, onResult);
  }

  async toFCLScript(network: string): Promise<FCLScript> {
    const limit = this.computeLimit ?? Script.defaultComputeLimit;
    const cadence = resolveCadence(this.cadence, network);
    const args = await resolveArgs(cadence, this.args ?? []);

    return {
      cadence,
      args,
      limit,
    };
  }

  async transformResult(result: any): Promise<T> {
    return await this._onResult(result);
  }
}

class ScriptError extends Error {}

export function convertToScriptError(error: any): Error {
  // TODO: parse error and convert to correct error class
  return new ScriptError(error);
}
