import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';

import { FlowGateway, FlowNetwork } from '../flow';
import { FreshmintError } from '../errors';
import { loadConfig } from '../config';
import { parseUFix64Argument } from '../arguments';

export default new Command('burn')
  .argument('<ids>', 'The IDs of NFTs to destroy (e.g. 3425 1235 4524 216661).', parseUFix64Argument)
  .description('destroy NFTs')
  .option('-n, --network <network>', "Network to use. Either 'emulator', 'testnet' or 'mainnet'", 'emulator')
  .action(destroyNFTs);

async function destroyNFTs(ids: string[], { network }: { network: FlowNetwork }) {
  const config = await loadConfig();

  const flow = new FlowGateway(network, config.getContractAccount(network));

  const spinner = ora();

  console.log(chalk.gray('\n> flow transactions send ./cadence/transactions/destroy_nfts.cdc <...>\n'));

  spinner.start(`Destroying the NFTs...`);

  try {
    await flow.destroyNFTs(ids);
  } catch (error: any) {
    spinner.fail('Failed to destroy NFTs:\n');
    throw new FreshmintError(error);
  }

  spinner.succeed('The NFTs were destroyed.');
}
