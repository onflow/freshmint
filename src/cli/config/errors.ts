import chalk from 'chalk';

import { FreshmintError } from '../errors';

export class ConfigErrors extends FreshmintError {

  name: string = 'ConfigErrors';

  errors: { label: string, error: Error }[]

  constructor(errors: { label: string, error: Error }[], depth: number = 0, label?: string) {
    const padding = '  '.repeat(depth);
  
    const errorMessages = errors.map(error => `${padding}${chalk.gray(error.label + ':')} ${error.error.message}`).join("\n")

    const message = label ?
      `${chalk.red(label+':')}\n\n${errorMessages}` :
      `\n${errorMessages}`;
    
    super(message);

    this.errors = errors;
  }
}

export class ConfigValidationError extends FreshmintError {
  name: string = 'ConfigValidationError';
}

export class MissingEnvironmentVariableError extends FreshmintError {

  name: string = 'MissingEnvironmentVariableError';

  variableName: string

  constructor(variableName: string) {
    super(`${variableName} environment variable is not set`)

    this.variableName = variableName;
  }
}

export class EmptyEnvironmentVariableError extends FreshmintError {

  name: string = 'EmptyEnvironmentVariableError';

  variableName: string

  constructor(variableName: string) {
    super(`The ${variableName} environment variable is empty.`)

    this.variableName = variableName;
  }
}
