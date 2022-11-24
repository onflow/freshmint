import * as path from 'path';
import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import ProgressBar from 'progress';
import inquirer from 'inquirer';
import { NFTStorage } from 'nft.storage';
import * as metadata from '@freshmint/core/metadata';

import { IPFSClient } from '../mint/ipfs';
import { Minter, createMinter } from '../mint/minters';
import { MetadataProcessor } from '../mint/processors';
import { IPFSFileProcessor } from '../mint/processors/IPFSFileProcessor';

import { envsubst } from '../envsubst';
import { FlowGateway, FlowNetwork } from '../flow';
import { FreshmintConfig, loadConfig } from '../config';

export default new Command('mint')
  .description('mint NFTs using data from a CSV file')
  .option('-i, --input <csv-path>', 'The location of the input CSV file')
  .option('-o, --output <csv-path>', 'The location of the output CSV file')
  .option('-b, --batch-size <number>', 'The number of NFTs to mint per batch', '10')
  .option('-c, --claim', 'Generate a claim key for each NFT')
  .option('-n, --network <network>', "Network to mint to. Either 'emulator', 'testnet' or 'mainnet'", 'emulator')
  .action(mint);

async function mint({
  network,
  input,
  output,
  claim,
  batchSize,
}: {
  network: FlowNetwork;
  input: string | undefined;
  output: string | undefined;
  claim: boolean;
  batchSize: string;
}) {
  const config = await loadConfig();

  const flow = new FlowGateway(network);

  const minter = getMinter(config, flow);

  const csvInputFile = input ?? config.nftDataPath;
  const csvOutputFile = output ?? generateOutputFilename(network);

  const answer = await inquirer.prompt({
    type: 'confirm',
    name: 'confirm',
    message: `Create NFTs using data from ${path.basename(csvInputFile)}?`,
  });

  if (!answer.confirm) return;

  console.log();

  const duplicatesSpinner = ora();
  const pinningSpinner = ora();
  const editionSpinner = ora();

  let bar: ProgressBar;

  await minter.mint(csvInputFile, csvOutputFile, claim, Number(batchSize), {
    onStartDuplicateCheck: () => {
      duplicatesSpinner.start('Checking for duplicates...\n');
    },
    onCompleteDuplicateCheck: (message: string) => {
      duplicatesSpinner.succeed(message + '\n');
    },
    onStartPinning: (count: number) => {
      const message = count === 1 ? `Pinning 1 file to IPFS...\n` : `Pinning ${count} files to IPFS...\n`;

      pinningSpinner.start(message);
    },
    onCompletePinning: () => {
      pinningSpinner.succeed();
    },
    onStartEditionCreation: (count: number) => {
      const message = count === 1 ? `Adding 1 new edition template...\n` : `Adding ${count} new edition templates...\n`;

      editionSpinner.start(message);
    },
    onCompleteEditionCreation: () => {
      editionSpinner.succeed();
    },
    onStartMinting: (total: number, batchCount: number, batchSize: number) => {
      if (total === 0) {
        return;
      }

      console.log(chalk.greenBright(`Minting ${total} NFTs in ${batchCount} batches (batchSize = ${batchSize})...\n`));
      console.log(`Saving results to ${chalk.cyan(csvOutputFile)}\n`);

      console.log(chalk.gray('> flow transactions send ./cadence/transactions/mint.cdc <...>\n'));

      bar = new ProgressBar('[:bar] :current/:total :percent :etas', { width: 40, total });
      bar.tick(0);
    },
    onCompleteBatch: (batchSize: number) => {
      bar.tick(batchSize);
    },
  });
}

function getMinter(config: FreshmintConfig, flowGateway: FlowGateway): Minter {
  const metadataProcessor = new MetadataProcessor(config.contract.schema);

  if (config.contract.schema.includesFieldType(metadata.IPFSFile)) {
    const endpoint = new URL(envsubst(config.ipfsPinningService.endpoint));
    const token = envsubst(config.ipfsPinningService.key);

    const nftStorage = new NFTStorage({
      endpoint,
      token,
    });

    const ipfs = new IPFSClient(nftStorage);

    const ipfsFileProcessor = new IPFSFileProcessor(config.nftAssetPath, ipfs);

    metadataProcessor.addFieldProcessor(ipfsFileProcessor);
  }

  return createMinter(config.contract, metadataProcessor, flowGateway);
}

function generateOutputFilename(network: string): string {
  const timestamp = generateTimestamp();
  return `mint-${network}-${timestamp}.csv`;
}

function generateTimestamp(): string {
  const date = new Date();
  return `${date.getFullYear()}-${
    date.getMonth() + 1
  }-${date.getDate()}-${date.getHours()}${date.getMinutes()}${date.getSeconds()}`;
}
