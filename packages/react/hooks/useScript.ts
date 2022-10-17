import { useEffect, useState } from 'react';

import { useFCL } from './useFCL';
import { Arguments, CadenceSourceCode, isCadenceModule } from '../cadence';
import { Script, ScriptParameters, isScriptParameters, convertToScriptError, ScriptResultTransformer } from '../script';
import { FCLModule } from '../fcl';

export type ScriptHookInput<T> = Script<T> | ScriptParameters | CadenceSourceCode | null;
export type ScriptHookInputThunk<T> = () => ScriptHookInput<T>;

function isScriptThunk<T>(input: ScriptHookInput<T> | ScriptHookInputThunk<T>): input is ScriptHookInputThunk<T> {
  return isFunction(input);
}

export function useScript<T = any>(
  script: ScriptHookInput<T> | ScriptHookInputThunk<T>,
  onResult?: ScriptResultTransformer<T>,
): [T | undefined, boolean] {
  const [result, setResult] = useState<T | undefined>(undefined);
  const isLoading = result === undefined;

  const { fcl, getNetwork } = useFCL();

  const scriptInput = isScriptThunk<T>(script) ? script() : script;

  const scriptInstance = normalizeScript<T>(scriptInput);

  useEffect(
    () => {
      async function execute(script: Script<T>) {
        // Attatch the onResult handler if specified
        if (onResult !== undefined) {
          script = script.onResult(onResult);
        }

        const network = await getNetwork();

        const result = await executeScript(fcl, script, network);

        setResult(result);
      }

      if (scriptInstance !== null) {
        execute(scriptInstance);
      }
    },
    // Serialize the script into a list of primitive values that work with
    // React's useEffect implementation, which only does a shallow comparison
    // of the dependency list
    //
    // Ref: https://github.com/kentcdodds/use-deep-compare-effect
    [...serializeScript(fcl, scriptInstance)],
  );

  return [result, isLoading];
}

function normalizeScript<T>(script: ScriptHookInput<T>): Script<T> | null {
  if (script === null) {
    return null;
  }

  if (script instanceof Script) {
    return script;
  }

  if (isScriptParameters(script)) {
    return new Script<T>(script);
  }

  return new Script<T>({ cadence: script });
}

async function executeScript<T>(fcl: FCLModule, script: Script<T>, network: string): Promise<T> {
  // Do not catch and convert errors that throw when building the script
  const fclScript = await script.toFCLScript(network);

  try {
    const result = await fcl.query(fclScript);
    return await script.transformResult(result);
  } catch (error) {
    throw convertToScriptError(error);
  }
}

function isFunction(obj: any) {
  return !!(obj && obj.constructor && obj.call && obj.apply);
}

function serializeScript(fcl: FCLModule, script: Script | null): any[] {
  if (!script) {
    return [];
  }

  return [serializeCadence(script.cadence), ...serializeArguments(fcl, script.args)];
}

function serializeCadence(cadence: CadenceSourceCode): string {
  if (isCadenceModule(cadence)) {
    return cadence.raw;
  }

  return cadence;
}

function serializeArguments(fcl: FCLModule, args?: Arguments): any[] {
  if (!args) {
    return [];
  }

  const rawArgs = Array.isArray(args)
    ? // Arguments is already in raw form if it is an array
      args
    : // Otherwise arguments is a function that returns FCL argument objects
      args(fcl.arg, fcl.t).map((arg) => arg.value);

  // Convert all arguments to strings so that objects (e.g. path values) are flattened
  return rawArgs.map((arg) => JSON.stringify(arg));
}
