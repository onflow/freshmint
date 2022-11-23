import { FreshmintError } from './errors';

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

export class MissingEnvironmentVariableError extends FreshmintError {
  name = 'MissingEnvironmentVariableError';

  variableName: string;

  constructor(variableName: string) {
    super(`${variableName} environment variable is not set`);

    this.variableName = variableName;
  }
}

export class EmptyEnvironmentVariableError extends FreshmintError {
  name = 'EmptyEnvironmentVariableError';

  variableName: string;

  constructor(variableName: string) {
    super(`The ${variableName} environment variable is empty.`);

    this.variableName = variableName;
  }
}
