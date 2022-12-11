import { InvalidArgumentError } from 'commander';

export const InvalidPositiveIntegerArgumentError = new InvalidArgumentError(
  'Not a valid number. Must be an integer greater than zero (e.g. 42).',
);

export function parsePositiveIntegerArgument(value: string): number {
  const integer = parseInt(value, 10);
  if (isNaN(integer)) {
    throw InvalidPositiveIntegerArgumentError;
  }

  return integer;
}

export const InvalidUFix64ArgumentError = new InvalidArgumentError(
  'Not a valid number. Must be an integer (e.g. 42) or decimal (e.g. 42.123).',
);

function validateInteger(value: string, error: InvalidArgumentError) {
  const integer = parseInt(value, 10);
  if (isNaN(integer)) {
    throw error;
  }
}

export function parseUFix64Argument(value: string): string {
  const pieces = value.split('.');

  if (pieces.length === 1) {
    const integer = pieces[0];

    validateInteger(integer, InvalidUFix64ArgumentError);

    // Fixed-point numbers must contain a decimal point,
    // so we add .0 to all integer inputs
    return `${integer}.0`;
  }

  if (pieces.length === 2) {
    const [integer, fractional] = pieces;

    // Both the integer and fractional should be valid integers
    validateInteger(integer, InvalidUFix64ArgumentError);
    validateInteger(fractional, InvalidUFix64ArgumentError);

    return value;
  }

  throw InvalidUFix64ArgumentError;
}
