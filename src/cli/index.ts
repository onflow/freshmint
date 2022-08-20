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
import { ContractType } from './config';
import { metadata } from '../lib';

const program = new Command();
const spinner = ora();

async function main() {
  // commands

  program.command('start').description('initialize a new project').action(start);

  program
    .command('mint')
    .description('create multiple NFTs using data from a csv file')
    .option('-d, --data <csv-path>', 'The location of the csv file to use for minting')
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
  const fresh = new Fresh(network);

  if (!data) {
    data = fresh.config.nftDataPath;
  }

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

  const schema = fresh.config.contract.schema;
  const fields = schema.getFieldList();

  const { id, metadata } = await fresh.getNFT(tokenId);

  const output = getNFTOutput(fresh.config.contract.type, id, metadata, fields);

  alignOutput(output);
}

function getNFTOutput(
  contractType: ContractType,
  id: string,
  metadata: metadata.MetadataMap,
  fields: metadata.Field[],
) {
  const idOutput = ['ID:', chalk.green(id)];
  const fieldOutput = fields.map((field) => [` ${field.name}:`, chalk.blue(field.getValue(metadata))]);

  if (contractType === ContractType.Edition) {
    return [
      idOutput,
      ['Edition ID', chalk.green(metadata.edition_id)],
      ['Edition Serial #', chalk.green(metadata.edition_serial)],
      ['Edition Fields:'],
      ...fieldOutput,
    ];
  }

  return [idOutput, ['Fields:'], ...fieldOutput];
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
