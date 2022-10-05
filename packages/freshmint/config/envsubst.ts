import { EmptyEnvironmentVariableError, MissingEnvironmentVariableError } from './errors';

const varNames = '[a-zA-Z_]+[a-zA-Z0-9_]*';
const placeholders = ['\\$_', '\\${_}', '{{_}}'];
const envVars = placeholders.map((placeholder) => placeholder.replace('_', `(${varNames})`)).join('|');
const rgEnvVars = new RegExp(envVars, 'gm');

export function envsubst(input: string) {
  const match = input.matchAll(rgEnvVars);

  return Array.from(match)
    .map((m) => {
      const [varInput, varName] = m.slice(0, placeholders.length + 1).filter(Boolean);

      return { varInput, varName };
    })
    .map(({ varInput, varName }) => {
      if (varName in process.env) {
        const varValue = process.env[varName] ?? '';

        if (varValue.trim() === '') {
          throw new EmptyEnvironmentVariableError(varName);
        }

        return { varInput, varValue };
      }

      throw new MissingEnvironmentVariableError(varName);
    })
    .reduce((acc, { varInput, varValue }) => acc.replace(varInput, varValue), input);
}
