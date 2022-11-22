import { Command, InvalidArgumentError } from 'commander';
import ora from 'ora';

import { FlowGateway, FlowNetwork } from '../flow';

export default new Command('start-drop')
  .argument('<price>', 'The amount of FLOW to charge for each NFT (e.g. 42.123).', parseUFix64)
  .description('start a new drop')
  .option('-n, --network <network>', "Network to use. Either 'emulator', 'testnet' or 'mainnet'", 'emulator')
  .action(startDrop);

async function startDrop(price: string, { network }: { network: FlowNetwork }) {
  const flow = new FlowGateway(network);

  const spinner = ora();

  spinner.start('Creating drop...');

  await flow.startDrop('default', price);

  spinner.succeed('Success! Your drop is live.');
}

function validateInteger(value: string, error: InvalidArgumentError) {
  const integer = parseInt(value, 10);
  if (isNaN(integer)) {
    throw error;
  }
}

const InvalidUFix64ArgumentError = new InvalidArgumentError(
  'Not a valid number. Must be an integer (e.g. 42) or decimal (e.g. 42.123).',
);

function parseUFix64(value: string): string {
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
