import { useEffect, useState } from 'react';

import { useFCL } from './useFCL';
import { CadenceSourceCode } from '../cadence';
import { Script, ScriptParameters, isScriptParameters, convertToScriptError, ScriptResultTransformer } from '../script';
import { FCLModule } from '../fcl';

function isFunction(obj: any) {
  return !!(obj && obj.constructor && obj.call && obj.apply);
}

export type ScriptHookInput<T> = Script<T> | ScriptParameters | CadenceSourceCode | null;
export type ScriptHookInputThunk<T> = () => ScriptHookInput<T>;

function isThunk<T>(input: ScriptHookInput<T> | ScriptHookInputThunk<T>): input is ScriptHookInputThunk<T> {
  return isFunction(input);
}

export function useScript<T = any>(
  script: ScriptHookInput<T> | ScriptHookInputThunk<T>,
  onResult?: ScriptResultTransformer<T>,
): [T | undefined, boolean] {
  const [result, setResult] = useState<T | undefined>(undefined);
  const isLoading = result === undefined;

  const { fcl, getNetwork } = useFCL();

  const scriptInput = isThunk<T>(script) ? script() : script;

  useEffect(() => {
    async function execute(script: Script<T> | ScriptParameters | CadenceSourceCode) {
      let scriptInstance = normalizeScript<T>(script);

      if (onResult !== undefined) {
        scriptInstance = scriptInstance.onResult(onResult);
      }

      const network = await getNetwork();

      const result = await executeScript(fcl, scriptInstance, network);

      setResult(result);
    }

    if (scriptInput !== null) {
      execute(scriptInput);
    }
  }, [script]);

  return [result, isLoading];
}

function normalizeScript<T>(script: Script<T> | ScriptParameters | CadenceSourceCode): Script<T> {
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
