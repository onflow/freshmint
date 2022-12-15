import * as path from 'path';
import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import ProgressBar from 'progress';
import inquirer from 'inquirer';
import { NFTStorage } from 'nft.storage';
import * as metadata from '@freshmint/core/metadata';

import { FlowGateway, FlowNetwork } from '../flow';
import { ContractType, FreshmintConfig, loadConfig } from '../config';
import { parsePositiveIntegerArgument } from '../arguments';

import { StandardMinter } from '../mint/minters/StandardMinter';
import { EditionMinter } from '../mint/minters/EditionMinter';
import { MetadataProcessor } from '../mint/processors';
import { IPFSFileProcessor } from '../mint/processors/IPFSFileProcessor';
import { IPFSClient } from '../mint/ipfs';

export default new Command('mint')
  .description('mint NFTs using data from a CSV file')
  .option('-i, --input <csv-path>', 'The location of the input CSV file')
  .option('-o, --output <csv-path>', 'The location of the output CSV file')
  .option('-b, --batch-size <number>', 'The number of NFTs to mint per batch', parsePositiveIntegerArgument, 10)
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
  batchSize: number;
}) {
  const config = await loadConfig();

  const flow = new FlowGateway(network, config.getContractAccount(network));

  const csvInputFile = input ?? config.nftDataPath;
  const csvOutputFile = output ?? generateOutputFilename(network);

  const metadataProcessor = getMetadataProcessor(config);

  const answer = await inquirer.prompt({
    type: 'confirm',
    name: 'confirm',
    message: `Mint NFTs using data from ${path.basename(csvInputFile)}?`,
  });

  if (!answer.confirm) return;

  lineBreak();
  ora().info(`Results will be saved to ${chalk.cyan(csvOutputFile)}.`);

  switch (config.contract.type) {
    case ContractType.Standard:
      return mintStandard(config, metadataProcessor, flow, csvInputFile, csvOutputFile, claim, batchSize);
    case ContractType.Edition:
      return mintEdition(config, metadataProcessor, flow, csvInputFile, csvOutputFile, claim, batchSize);
  }
}

async function mintStandard(
  config: FreshmintConfig,
  metadataProcessor: MetadataProcessor,
  flow: FlowGateway,
  csvInputFile: string,
  csvOutputFile: string,
  withClaimKeys: boolean,
  batchSize: number,
) {
  const minter = new StandardMinter(config.contract.schema, metadataProcessor, flow);

  const duplicatesSpinner = ora();

  let bar: ProgressBar;

  await minter.mint(csvInputFile, csvOutputFile, withClaimKeys, batchSize, {
    onStartDuplicateCheck: () => {
      lineBreak();
      duplicatesSpinner.start('Checking for duplicates...');
    },
    onCompleteDuplicateCheck: (skipped: number) => {
      if (skipped == 0) {
        duplicatesSpinner.succeed('No duplicate NFTs found.');
        return;
      }

      // We cannot use `pluralize` here because the grammar is a bit too complex.
      //
      if (skipped > 1) {
        duplicatesSpinner.info(`Skipped ${skipped} NFTs because they already exist.`);
      } else {
        duplicatesSpinner.info('Skipped 1 NFT because it already exists.');
      }
    },
    onStartMinting: (nftCount: number, batchCount: number, batchSize: number) => {
      if (nftCount === 0) {
        return;
      }

      lineBreak();
      console.log(
        chalk.greenBright(
          `Minting ${pluralize(nftCount, 'NFT')} in ${pluralize(
            batchCount,
            'batch',
            'es',
          )} (batchSize = ${batchSize})...\n`,
        ),
      );

      console.log(chalk.gray('> flow transactions send ./cadence/transactions/mint.cdc <...>\n'));

      bar = new ProgressBar('[:bar] :current/:total :percent :etas', { width: 40, total: nftCount });
      bar.tick(0);
    },
    onCompleteBatch: (batchSize: number) => {
      bar.tick(batchSize);
    },
    onComplete: (nftCount: number) => {
      lineBreak();
      console.log(chalk.greenBright(`Minted ${pluralize(nftCount, 'new NFT')}.`));
    },
  });
}

async function mintEdition(
  config: FreshmintConfig,
  metadataProcessor: MetadataProcessor,
  flow: FlowGateway,
  csvInputFile: string,
  csvOutputFile: string,
  withClaimKeys: boolean,
  batchSize: number,
) {
  const minter = new EditionMinter(config.contract.schema, metadataProcessor, flow);

  const duplicatesSpinner = ora();
  const editionSpinner = ora();

  let bar: ProgressBar;

  await minter.mint(csvInputFile, csvOutputFile, withClaimKeys, batchSize, {
    onStartDuplicateCheck: () => {
      lineBreak();
      duplicatesSpinner.start('Checking for duplicates...');
    },
    onCompleteDuplicateCheck: (skippedEditions: number, skippedNFTs: number) => {
      if (skippedEditions === 0 && skippedNFTs === 0) {
        duplicatesSpinner.succeed('No duplicate edition templates or NFTs found.');
        return;
      }

      duplicatesSpinner.info(
        `Skipped ${pluralize(skippedEditions, 'edition template')} and ${pluralize(
          skippedNFTs,
          'NFT',
        )} because they already exist.`,
      );
    },
    onStartEditionCreation: (count: number) => {
      if (count === 0) {
        return;
      }

      lineBreak();
      editionSpinner.start(`Creating ${pluralize(count, 'new edition template')}...`);
    },
    onCompleteEditionCreation: (count: number) => {
      if (count === 0) {
        return;
      }

      editionSpinner.succeed(
        `Successfully created ${pluralize(count, 'new edition template')} in ${chalk.cyan(config.contract.name)}.`,
      );
    },
    onStartMinting: (nftCount: number, batchCount: number, batchSize: number) => {
      if (nftCount === 0) {
        return;
      }

      lineBreak();
      console.log(
        chalk.greenBright(
          `Minting ${pluralize(nftCount, 'NFT')} in ${pluralize(
            batchCount,
            'batch',
            'es',
          )} (batchSize = ${batchSize})...\n`,
        ),
      );

      console.log(chalk.gray('> flow transactions send ./cadence/transactions/mint.cdc <...>\n'));

      bar = new ProgressBar('[:bar] :current/:total :percent :etas', { width: 40, total: nftCount });
      bar.tick(0);
    },
    onCompleteBatch: (batchSize: number) => {
      bar.tick(batchSize);
    },
    onComplete: (editionCount: number, nftCount: number) => {
      lineBreak();
      console.log(
        chalk.greenBright(
          `Created ${pluralize(editionCount, 'new edition template')} and minted ${pluralize(nftCount, 'new NFT')}.`,
        ),
      );
    },
  });
}

function getMetadataProcessor(config: FreshmintConfig): MetadataProcessor {
  const metadataProcessor = new MetadataProcessor(config.contract.schema);

  if (config.contract.schema.includesFieldType(metadata.IPFSFile)) {
    const { endpoint, token } = config.parseIPFSPinningServiceConfig();

    const nftStorage = new NFTStorage({
      endpoint,
      token,
    });

    const ipfs = new IPFSClient(nftStorage);

    const ipfsFileProcessor = new IPFSFileProcessor(config.nftAssetPath, ipfs);

    metadataProcessor.addFieldProcessor(ipfsFileProcessor);
  }

  return metadataProcessor;
}

const lineBreak = () => console.log();
const pluralize = (count: number, noun: string, suffix = 's') => `${count} ${noun}${count !== 1 ? suffix : ''}`;

function generateOutputFilename(network: string): string {
  const timestamp = generateTimestamp();
  return `mint-${network}-${timestamp}.csv`;
}

const padDigits = (num: number, digits: number) => String(num).padStart(digits, '0');

const year = (date: Date) => date.getFullYear();
const month = (date: Date) => padDigits(date.getMonth() + 1, 2);
const day = (date: Date) => padDigits(date.getDate(), 2);

const hours = (date: Date) => padDigits(date.getHours(), 2);
const minutes = (date: Date) => padDigits(date.getMinutes(), 2);
const seconds = (date: Date) => padDigits(date.getSeconds(), 2);

function generateTimestamp(): string {
  const date = new Date();

  return `${year(date)}-${month(date)}-${day(date)}-${hours(date)}${minutes(date)}${seconds(date)}`;
}
