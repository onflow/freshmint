import chalk from 'chalk';

import { FreshmintError } from '../errors';

export interface ConfigFieldError {
  keyPath: string[];
  error: FreshmintError;
}

export class ConfigFieldErrors extends FreshmintError {
  name = 'ConfigFieldErrors';

  errors: ConfigFieldError[];

  constructor(errors: ConfigFieldError[], label: string) {
    const errorMessages = errors
      .map((error) => `${chalk.gray(keyPathToLabel(error.keyPath) + ':')} ${error.error.message}`)
      .join('\n');

    const message = `${chalk.red(label + ':')}\n\n${errorMessages}`;

    super(message);

    this.errors = errors;
  }
}

export function extendKeyPath(keyPath: string[], key: string): string[] {
  return [...keyPath, key];
}

function keyPathToLabel(keyPath: string[]): string {
  return keyPath.join('.');
}

export class ConfigValidationError extends FreshmintError {
  name = 'ConfigValidationError';
}

export class UndefinedConfigFieldError extends FreshmintError {
  name = 'UndefinedConfigFieldError';

  constructor(message?: string) {
    super(message ?? 'This field is required.');
  }
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
