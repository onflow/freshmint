import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';

import { FlowGateway, FlowNetwork } from '../flow';
import { loadConfig } from '../config';
import { deployNFTContract } from '../deploy';

export default new Command('deploy')
  .description('deploy your NFT contract')
  .option('-n, --network <network>', "Network to deploy to. Either 'emulator', 'testnet' or 'mainnet'", 'emulator')
  .action(deploy);

async function deploy({ network }: { network: FlowNetwork }) {
  const config = await loadConfig();

  const flow = new FlowGateway(network, config.getContractAccount(network));

  const spinner = ora();

  console.log(chalk.gray('\n> flow transactions send ./cadence/transactions/deploy.cdc <...>\n'));

  spinner.start(`Deploying ${config.contract.name} to ${network}...`);

  await deployNFTContract(config, flow, network);

  spinner.succeed(`Success! Deployed ${chalk.cyan(config.contract.name)} to ${network}.`);
}
