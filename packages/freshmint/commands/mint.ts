import * as path from 'path';
import { Command } from 'commander';
import ora from 'ora';
import ProgressBar from 'progress';
import inquirer from 'inquirer';
import { NFTStorage } from 'nft.storage';
import * as metadata from '@freshmint/core/metadata';

import { IPFS } from '../ipfs';
import { envsubst } from '../envsubst';
import { Minter, createMinter } from '../mint';
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

  const flow = new FlowGateway(network);

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
