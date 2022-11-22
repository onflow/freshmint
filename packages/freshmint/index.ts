#!/usr/bin/env node

// This file contains the main entry point for the `fresh` command line app.
// See fresh.js for the core functionality.

import * as path from 'path';
import { Command, Argument, InvalidArgumentError } from 'commander';
import ora from 'ora';
import ProgressBar from 'progress';
import inquirer from 'inquirer';

import Fresh from './fresh';
import carlton from './carlton';
import startCommand from './start';
import { runDevServer } from './devServer';
import { loadConfig } from './config';
import { generateNextjsApp, generateProjectCadence } from './generateProject';
import { FreshmintError } from './errors';
import CSVLoader from './mint/loaders/CSVLoader';
import { FlowNetwork } from './flow';

const program = new Command();

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

async function main() {
  program.command('start <project-path>').description('create a new project').action(start);

  program.command('dev').description('start the Freshmint development server').action(dev);

  program
    .command('deploy')
    .description('fetch the information for an NFT')
    .option('-n, --network <network>', "Network to deploy to. Either 'emulator', 'testnet' or 'mainnet'", 'emulator')
    .action(deploy);

  program
    .command('mint')
    .description('mint NFTs using data from a CSV file')
    .option('-d, --data <csv-path>', 'The location of the csv file to use for minting')
    .option('-b, --batch-size <number>', 'The number of NFTs to mint per batch', '10')
    .option('-c, --claim', 'Generate a claim key for each NFT')
    .option('-n, --network <network>', "Network to mint to. Either 'emulator', 'testnet' or 'mainnet'", 'emulator')
    .action(mint);

  program
    .command('start-drop')
    .argument('<price>', 'The amount of FLOW to charge for each NFT (e.g. 42.123).', parseUFix64)
    .description('start a new drop')
    .option('-n, --network <network>', "Network to use. Either 'emulator', 'testnet' or 'mainnet'", 'emulator')
    .action(startDrop);

  program
    .command('stop-drop')
    .description('stop the current drop')
    .option('-n, --network <network>', "Network to use. Either 'emulator', 'testnet' or 'mainnet'", 'emulator')
    .action(stopDrop);

  // TODO: add get-drop command

  const allRegenTargets = ['cadence', 'web'];

  program
    .command('regen')
    .addArgument(
      new Argument('[targets...]', 'targets to regenerate').choices(allRegenTargets).default(allRegenTargets),
    )
    .description('regenerate project files from config')
    .action(generate);

  program
    .command('prince')
    .description('in West Philadelphia born and raised...')
    .action(() => {
      console.log(carlton);
    });

  await program.parseAsync(process.argv);
}

async function start(projectPath: string) {
  const spinner = ora();
  await startCommand(spinner, projectPath);
}

async function dev() {
  await runDevServer();
}

async function deploy({ network }: { network: FlowNetwork }) {
  const config = await loadConfig();
  const fresh = new Fresh(config, network);

  const spinner = ora();

  spinner.start(`Deploying ${config.contract.name} to ${network}...`);

  await fresh.deploy();

  spinner.succeed();
}

async function mint({
  network,
  data,
  claim,
  batchSize,
}: {
  network: FlowNetwork;
  data: string | undefined;
  claim: boolean;
  batchSize: string;
}) {
  const config = await loadConfig();

  const fresh = new Fresh(config, network);

  let csvPath: string;
  if (!data) {
    csvPath = config.nftDataPath;
  } else {
    csvPath = data;
  }

  const loader = new CSVLoader(csvPath);

  const minter = fresh.getMinter();

  const answer = await inquirer.prompt({
    type: 'confirm',
    name: 'confirm',
    message: `Create NFTs using data from ${path.basename(csvPath)}?`,
  });

  if (!answer.confirm) return;

  console.log();

  const duplicatesSpinner = ora();
  const pinningSpinner = ora();

  let bar: ProgressBar;

  await minter.mint(loader, claim, Number(batchSize), {
    onStartDuplicateCheck: function (): void {
      duplicatesSpinner.start('Checking for duplicates...\n');
    },
    onCompleteDuplicateCheck: function (message: string): void {
      duplicatesSpinner.succeed(message + '\n');
    },
    onStartPinning: function (files: number): void {
      pinningSpinner.start(`Pinning ${files} files to IPFS...\n`);
    },
    onCompletePinning: function (): void {
      pinningSpinner.succeed();
    },
    onStartMinting: function (total: number, batchCount: number, batchSize: number): void {
      if (total === 0) {
        return;
      }

      console.log(`Minting ${total} NFTs in ${batchCount} batches (batchSize = ${batchSize})...\n`);

      bar = new ProgressBar('[:bar] :current/:total :percent :etas', { width: 40, total });

      bar.tick(0);
    },
    onCompleteBatch: function (batchSize: number): void {
      bar.tick(batchSize);
    },
    onMintingError: function (error: Error): void {
      bar.interrupt(error.message);
    },
  });
}

async function startDrop(price: string, { network }: { network: FlowNetwork }) {
  const config = await loadConfig();
  const fresh = new Fresh(config, network);

  const spinner = ora();

  spinner.start('Creating drop...');

  await fresh.startDrop(price);

  spinner.succeed('Success! Your drop is live.');
}

async function stopDrop({ network }: { network: FlowNetwork }) {
  const config = await loadConfig();
  const fresh = new Fresh(config, network);

  const spinner = ora();

  spinner.start('Stopping drop...');

  await fresh.stopDrop();

  // TODO: return error if no drop is active

  spinner.succeed('Your drop has been stopped.');
}

async function generate(targets: string[]) {
  const config = await loadConfig();

  for (const target of targets) {
    switch (target) {
      case 'cadence':
        await generateProjectCadence('./', config.contract, false);
        console.log('Regenerated files in "./cadence"');
        break;
      case 'web':
        await generateNextjsApp('./', config.collection.name, config.collection.description);
        console.log('Regenerated files in "./web"');
        break;
    }
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    if (err instanceof FreshmintError) {
      // Freshmint application errors are designed
      // to be displayed using only the message field.
      console.error(err.message);
    } else {
      console.error(err);
    }

    process.exit(1);
  });
