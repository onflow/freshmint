#!/usr/bin/env node

// This file contains the main entry point for the `fresh` command line app.
// See fresh.js for the core functionality.

import * as path from 'path';
import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import ProgressBar from 'progress';
import Fresh from './fresh';
import carlton from './carlton';
import startCommand from './start';
import inquirer from 'inquirer';

const program = new Command();
const spinner = ora();

async function main() {
  // commands

  program.command('start').description('initialize a new project').action(start);

  program
    .command('deploy')
    .description('deploy an instance of the FreshMint NFT contract')
    .option('-n, --network <network>', "Network to deploy to. Either 'emulator', 'testnet' or 'mainnet'", 'emulator')
    .action(deploy);

  program
    .command('mint')
    .description('create multiple NFTs using data from a csv file')
    .option('-d, --data <csv-path>', 'The location of the csv file to use for minting', 'nfts.csv')
    .option('-b, --batch-size <number>', 'The number of NFTs to mint per batch', '10')
    .option('-c, --claim', 'Generate a claim key for each NFT')
    .option('-n, --network <network>', "Network to mint to. Either 'emulator', 'testnet' or 'mainnet'", 'emulator')
    .action(mint);

  program
    .command('get <token-id>')
    .description('get info from Flow about an NFT using its token ID')
    .option('-n, --network <network>', "Network to mint to. Either 'emulator', 'testnet' or 'mainnet'", 'emulator')
    .action(getNFT);

  program
    .command('dump <csv-path>')
    .description('dump all token metadata to a file')
    .option('-n, --network <network>', "Network to use. Either 'emulator', 'testnet' or 'mainnet'", 'emulator')
    .action(dumpNFTs);

  program
    .command('prince')
    .description('in West Philadelphia born and raised...')
    .action(() => {
      console.log(carlton);
    });

  await program.parseAsync(process.argv);
}

// ---- command action functions

async function start() {
  await startCommand(spinner);
}

async function deploy({ network }: { network: string }) {
  spinner.start(`Deploying project to ${network} ...`);
  const fresh = new Fresh(network);
  await fresh.deployContracts();
  spinner.succeed(`✨ Success! Project deployed to ${network} ✨`);
}

async function mint({
  network,
  data,
  claim,
  batchSize,
}: {
  network: string;
  data: string;
  claim: boolean;
  batchSize: string;
}) {
  const fresh = new Fresh(network);

  const answer = await inquirer.prompt({
    type: 'confirm',
    name: 'confirm',
    message: `Create NFTs using data from ${path.basename(data)}?`,
  });

  if (!answer.confirm) return;

  console.log();

  spinner.start('Checking for duplicate NFTs ...\n');

  let bar: ProgressBar;

  await fresh.createNFTsFromCSVFile(
    data,
    claim,
    (total: number, skipped: number, batchCount: number, batchSize: number) => {
      if (skipped) {
        spinner.info(`Skipped ${skipped} NFTs because they already exist.\n`);
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

async function getNFT(tokenId: string, { network }: { network: string }) {
  const fresh = new Fresh(network);
  const { id, schema, metadata } = await fresh.getNFTMetadata(tokenId);

  const output = [
    ['ID:', chalk.green(id)],
    ['Fields:'],
    ...schema.getFieldList().map((field) => [` ${field.name}:`, chalk.blue(field.getValue(metadata))]),
  ];

  alignOutput(output);
}

async function dumpNFTs(csvPath: string, { network }: { network: string }) {
  const fresh = new Fresh(network);
  const count = await fresh.dumpNFTs(csvPath);

  spinner.succeed(`✨ Success! ${count} NFT records saved to ${csvPath}. ✨`);
}

function alignOutput(labelValuePairs: any[]) {
  const maxLabelLength = labelValuePairs.map(([l]) => l.length).reduce((len, max) => (len > max ? len : max));
  for (const [label, value] of labelValuePairs) {
    if (value) {
      console.log(label.padEnd(maxLabelLength + 1), value);
    } else {
      console.log(label);
    }
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
