#!/usr/bin/env node

// This file contains the main entry point for the `fresh` command line app.
// See fresh.js for the core functionality.

import * as path from 'path';
import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import ProgressBar from 'progress';
import inquirer from 'inquirer';

import Fresh from './fresh';
import carlton from './carlton';
import startCommand from './start';
import { Config, ContractType } from './config';
import { metadata } from '../lib';
import { generateProjectCadence } from './generateProject';
import { FreshmintError } from './errors';
import { MetadataProcessor } from './processors';
import IPFS from './ipfs';
import IPFSFileProcessor from './processors/IPFSFileProcessor';
import { NFTStorage } from 'nft.storage';
import CSVLoader from './loaders/CSVLoader';
import { createMinter } from './minters';
import FlowGateway from './flow';
import Storage from './storage';

const program = new Command();
const spinner = ora();

async function main() {
  program.command('start <project-path>').description('initialize a new project').action(start);

  program
    .command('mint')
    .description('mint NFTs using data from a CSV file')
    .option('-d, --data <csv-path>', 'The location of the csv file to use for minting')
    .option('-b, --batch-size <number>', 'The number of NFTs to mint per batch', '10')
    .option('-c, --claim', 'Generate a claim key for each NFT')
    .option('-n, --network <network>', "Network to mint to. Either 'emulator', 'testnet' or 'mainnet'", 'emulator')
    .action(mint);

  program
    .command('get <token-id>')
    .description('fetch the information for an NFT')
    .option('-n, --network <network>', "Network to mint to. Either 'emulator', 'testnet' or 'mainnet'", 'emulator')
    .action(getNFT);

  program
    .command('dump <csv-path>')
    .description('dump all NFT data to a CSV file')
    .option('-n, --network <network>', "Network to use. Either 'emulator', 'testnet' or 'mainnet'", 'emulator')
    .action(dumpNFTs);

  const generate = program.command('generate').description('regenerate project files from config');

  generate.command('cadence').description('regenerate project Cadence files').action(generateCadence);

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
  const config = Config.load();

  let csvPath: string;
  if (!data) {
    csvPath = config.nftDataPath;
  } else {
    csvPath = data;
  }

  const contract = config.contract;

  const metadataProcessor = new MetadataProcessor(contract.schema);

  if (contract.schema.includesFieldType(metadata.IPFSFile)) {
    const [endpoint, key] = Config.resolveLazyFields(config.ipfsPinningService.endpoint, config.ipfsPinningService.key);

    const ipfsClient = new NFTStorage({ endpoint, token: key });

    const ipfs = new IPFS(ipfsClient);

    const ipfsFileProcessor = new IPFSFileProcessor(csvPath, ipfs);

    metadataProcessor.addFieldProcessor(ipfsFileProcessor);
  }

  const flowGateway = new FlowGateway(network);

  const storage = new Storage('freshdb', { baseSelector: { network } });

  const loader = new CSVLoader(csvPath);

  const minter = createMinter(contract, metadataProcessor, flowGateway, storage);

  const answer = await inquirer.prompt({
    type: 'confirm',
    name: 'confirm',
    message: `Create NFTs using data from ${path.basename(csvPath)}?`,
  });

  if (!answer.confirm) return;

  console.log();

  let bar: ProgressBar;

  spinner.start(`Checking for duplicate NFTs ...\n`);

  await minter.mint(
    loader,
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
  const config = Config.load();

  const fresh = new Fresh(config, network);

  const { id, metadata } = await fresh.getNFT(tokenId);

  const output = getNFTOutput(config.contract.type, id, metadata, config.contract.schema.fields);

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
  const config = Config.load();
  const fresh = new Fresh(config, network);

  const count = await fresh.dumpNFTs(csvPath);

  spinner.succeed(`✨ Success! ${count} NFT records saved to ${csvPath}. ✨`);
}

async function generateCadence() {
  const config = Config.load();

  await generateProjectCadence('./', config.contract, false);

  spinner.succeed(`✨ Success! Regenerated Cadence files. ✨`);
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
    if (err instanceof FreshmintError) {
      // Freshmint application errors are designed
      // to be displayed using only the message field.
      console.error(err.message);
    } else {
      console.error(err);
    }

    process.exit(1);
  });
