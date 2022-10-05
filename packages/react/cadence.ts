// @ts-ignore
import { resolveArguments } from '@onflow/flow-cadut';

export type CadenceImports = { [key: string]: string };

export type CadenceModule = {
  raw: string;
  resolve: (network: string, overides?: { [contractName: string]: string }) => string;
};

export function isCadenceModule(cadence: any): cadence is CadenceModule {
  return (cadence as CadenceModule).raw !== undefined;
}

export type CadenceSourceCode = CadenceModule | string;

export type ArgumentsList = any[];
export type ArgumentsThunk = (arg: any, t: any) => any[];
export type Arguments = ArgumentsList | ArgumentsThunk;

export function resolveCadence(cadence: CadenceSourceCode, network: string, imports: CadenceImports = {}): string {
  if (isCadenceModule(cadence)) {
    return cadence.resolve(network, imports);
  }

  return cadence;
}

export async function resolveArgs(cadence: string, args: Arguments): Promise<ArgumentsThunk> {
  if (Array.isArray(args)) {
    const resolvedArgs = await resolveArguments(args, cadence);
    return () => resolvedArgs;
  }

  return args;
}
