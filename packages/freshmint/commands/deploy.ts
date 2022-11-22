import * as fs from 'fs/promises';
import { Command } from 'commander';
import ora from 'ora';
import { CollectionMetadata } from '@freshmint/core';

// @ts-ignore
import * as mime from 'mime-types';

import { FlowGateway, FlowNetwork } from '../flow';
import { loadConfig } from '../config';
import { FlowJSONConfig } from '../flow/config';
import { FreshmintError } from '../errors';

export default new Command('deploy')
  .description('fetch the information for an NFT')
  .option('-n, --network <network>', "Network to deploy to. Either 'emulator', 'testnet' or 'mainnet'", 'emulator')
  .action(deploy);

const flowJSONConfigPath = 'flow.json';

async function deploy({ network }: { network: FlowNetwork }) {
  const config = await loadConfig();

  const flow = new FlowGateway(network);

  const contractName = config.contract.name;
  const flowConfig = await FlowJSONConfig.load(flowJSONConfigPath);

  const contractPath = flowConfig.getContract(contractName);

  if (!contractPath) {
    throw new FreshmintError(`Contract ${contractName} is not defined in flow.json.`);
  }

  const collectionMetadata: CollectionMetadata = {
    name: config.collection.name,
    description: config.collection.description,
    url: config.collection.url,
    squareImage: {
      url: config.collection.images.square,
      type: mime.lookup(config.collection.images.square),
    },
    bannerImage: {
      url: config.collection.images.banner,
      type: mime.lookup(config.collection.images.banner),
    },
    socials: config.collection.socials,
  };

  const contract = await fs.readFile(contractPath, 'utf-8');

  const spinner = ora();

  spinner.start(`Deploying ${config.contract.name} to ${network}...`);

  await flow.deploy(contractName, contract, collectionMetadata, []);

  spinner.succeed();
}
