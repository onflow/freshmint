import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';

import { FlowGateway, FlowNetwork } from '../flow';
import { FreshmintError } from '../errors';
import { loadConfig } from '../config';
import { parseUFix64Argument } from '../arguments';

export default new Command('start-drop')
  .argument('<price>', 'The amount of FLOW to charge for each NFT (e.g. 42.123).', parseUFix64Argument)
  .description('start a new drop')
  .option('-n, --network <network>', "Network to use. Either 'emulator', 'testnet' or 'mainnet'", 'emulator')
  .action(startDrop);

async function startDrop(price: string, { network }: { network: FlowNetwork }) {
  const config = await loadConfig();

  const flow = new FlowGateway(network, config.getContractAccount(network));

  const spinner = ora();

  console.log(chalk.gray('\n> flow transactions send ./cadence/transactions/start_drop.cdc <...>\n'));

  spinner.start(`Starting a drop...`);

  try {
    await flow.startDrop('default', price);
  } catch (error: any) {
    spinner.fail('Failed to start drop:\n');
    throw new FreshmintError(error);
  }

  spinner.succeed('Success! Your drop is live.');
}
