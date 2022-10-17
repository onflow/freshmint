#!/usr/bin/env node

// This file contains the main entry point for the `fresh` command line app.
// See fresh.js for the core functionality.

import * as path from 'path';
import { Command, InvalidArgumentError } from 'commander';
import ora from 'ora';
import ProgressBar from 'progress';
import inquirer from 'inquirer';
import * as metadata from '@freshmint/core/metadata';

import Fresh from './fresh';
import carlton from './carlton';
import startCommand from './start';
import { runDevServer } from './devServer';
import { loadConfig, FreshmintConfigSchema } from './config';
import { generateNextjsApp, generateProjectCadence } from './generateProject';
import { FreshmintError } from './errors';
import CSVLoader from './mint/loaders/CSVLoader';

const program = new Command();
const spinner = ora();

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
  program.command('start <project-path>').description('initialize a new project').action(start);

  program.command('dev').description('start the Freshmint development server').action(dev);

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

  program
    .command('update-collection')
    .description('update the collection metadata on your contract')
    .option('-n, --network <network>', "Network to use. Either 'emulator', 'testnet' or 'mainnet'", 'emulator')
    .action(updateCollection);

  const generate = program.command('generate').description('regenerate project files from config');

  generate.command('cadence').description('regenerate project Cadence files').action(generateCadence);
  generate.command('web').description('regenerate project web app files').action(generateWeb);

  program
    .command('prince')
    .description('in West Philadelphia born and raised...')
    .action(() => {
      console.log(carlton);
    });

  await program.parseAsync(process.argv);
}

async function start(projectPath: string) {
  await startCommand(spinner, projectPath);
}

async function dev() {
  await runDevServer();
}

async function mint({
  network,
  data,
  claim,
  batchSize,
}: {
  network: string;
  data: string | undefined;
  claim: boolean;
  batchSize: string;
}) {
  const config = loadConfig((schema: FreshmintConfigSchema) => {
    schema.contract.fields.schema.onLoad((metadataSchema: metadata.Schema) => {
      if (metadataSchema.includesFieldType(metadata.IPFSFile)) {
        schema.ipfsPinningService.setEnabled(
          true,
          'This field is required because your metadata schema specifies an "ipfs-file" field.',
        );
      }
    });
  });

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

  let bar: ProgressBar;

  spinner.start('Checking for duplicate NFTs ...\n');

  await minter.mint(
    loader,
    claim,
    (total: number, batchCount: number, batchSize: number, message?: string) => {
      if (message) {
        spinner.info(`${message}\n`);
      } else {
        spinner.succeed();
      }

      if (total === 0) {
        return;
      }

      console.log(`Minting ${total} NFTs in ${batchCount} batches (batchSize = ${batchSize})...\n`);

      bar = new ProgressBar('[:bar] :current/:total :percent :etas', { width: 40, total });

      bar.tick(0);
    },
    (batchSize: number) => {
      bar.tick(batchSize);
    },
    (error: Error) => {
      bar.interrupt(error.message);
    },
    Number(batchSize),
  );
}

async function startDrop(price: string, { network }: { network: string }) {
  const config = loadConfig();
  const fresh = new Fresh(config, network);

  await fresh.startDrop(price);

  spinner.succeed(`Success! Your drop is live.`);
}

async function stopDrop({ network }: { network: string }) {
  const config = loadConfig();
  const fresh = new Fresh(config, network);

  await fresh.stopDrop();

  // TODO: return error if no drop is active

  spinner.succeed('Your drop has been stopped.');
}

async function updateCollection({ network }: { network: string }) {
  const config = loadConfig();
  const fresh = new Fresh(config, network);

  spinner.start('Updating collection metadata ...\n');

  const collectionMetadata = await fresh.updateCollection();

  spinner.succeed('Updated your contract with new collection metadata:');

  // TODO: pretty print instead of dumping the object
  console.log(collectionMetadata)
}

async function generateCadence() {
  const config = loadConfig();

  await generateProjectCadence('./', config.contract, [], false);

  spinner.succeed(`Success! Regenerated Cadence files.`);
}

async function generateWeb() {
  const config = loadConfig();

  await generateNextjsApp('./', config.collection.name, config.collection.description);

  spinner.succeed(`Success! Regenerated web files.`);
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
