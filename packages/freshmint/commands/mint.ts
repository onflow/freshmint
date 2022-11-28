import * as path from 'path';
import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import ProgressBar from 'progress';
import inquirer from 'inquirer';
import { NFTStorage } from 'nft.storage';
import * as metadata from '@freshmint/core/metadata';

import { IPFS } from '../mint/ipfs';
import { envsubst } from '../envsubst';
import { Minter, createMinter } from '../mint/minters';
import { MetadataProcessor } from '../mint/processors';
import { IPFSFileProcessor } from '../mint/processors/IPFSFileProcessor';

import { FlowGateway, FlowNetwork } from '../flow';
import { FreshmintConfig, loadConfig } from '../config';
import { CSVLoader } from '../mint/loaders/CSVLoader';

export default new Command('mint')
  .description('mint NFTs using data from a CSV file')
  .option('-d, --data <csv-path>', 'The location of the csv file to use for minting')
  .option('-b, --batch-size <number>', 'The number of NFTs to mint per batch', '10')
  .option('-c, --claim', 'Generate a claim key for each NFT')
  .option('-n, --network <network>', "Network to mint to. Either 'emulator', 'testnet' or 'mainnet'", 'emulator')
  .action(mint);

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

  const flow = new FlowGateway(network, config.getContractAccount(network));

  const minter = getMinter(config, flow);

  const csvPath = data ?? config.nftDataPath;

  const loader = new CSVLoader(csvPath);

  const answer = await inquirer.prompt({
    type: 'confirm',
    name: 'confirm',
    message: `Create NFTs using data from ${path.basename(csvPath)}?`,
  });

  if (!answer.confirm) return;

  console.log();

  const duplicatesSpinner = ora();
  const pinningSpinner = ora();
  const editionSpinner = ora();

  let bar: ProgressBar;

  await minter.mint(loader, claim, Number(batchSize), {
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
    onStartMinting: (total: number, batchCount: number, batchSize: number, outFile: string) => {
      if (total === 0) {
        return;
      }

      console.log(chalk.greenBright(`Minting ${total} NFTs in ${batchCount} batches (batchSize = ${batchSize})...\n`));
      console.log(`Piping results to ${chalk.cyan(outFile)}\n`);

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

    const ipfsClient = new NFTStorage({
      endpoint,
      token,
    });

    const ipfs = new IPFS(ipfsClient);

    const ipfsFileProcessor = new IPFSFileProcessor(config.nftAssetPath, ipfs);

    metadataProcessor.addFieldProcessor(ipfsFileProcessor);
  }

  return createMinter(config.contract, metadataProcessor, flowGateway);
}
