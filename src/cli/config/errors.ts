import chalk from 'chalk';

import { FreshmintError } from '../errors';

export class ConfigErrors extends FreshmintError {
  name = 'ConfigErrors';

  errors: { label: string; error: Error }[];

  constructor(errors: { label: string; error: Error }[], label: string) {
    const errorMessages = errors.map((error) => `${chalk.gray(error.label + ':')} ${error.error.message}`).join('\n');

    const message = `${chalk.red(label + ':')}\n\n${errorMessages}`;

    super(message);

    this.errors = errors;
  }
}

export class ConfigValidationError extends FreshmintError {
  name = 'ConfigValidationError';
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
