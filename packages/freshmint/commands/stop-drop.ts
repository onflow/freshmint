import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';

import { FlowGateway, FlowNetwork } from '../flow';
import { FreshmintError } from '../errors';
import { loadConfig } from '../config';

export default new Command('stop-drop')
  .description('stop the current drop')
  .option('-n, --network <network>', "Network to use. Either 'emulator', 'testnet' or 'mainnet'", 'emulator')
  .action(stopDrop);

async function stopDrop({ network }: { network: FlowNetwork }) {
  const config = await loadConfig();

  const flow = new FlowGateway(network, config.getContractAccount(network));

  const spinner = ora();

  console.log(chalk.gray('\n> flow transactions send ./cadence/transactions/stop_drop.cdc <...>\n'));

  spinner.start('Stopping drop...');

  try {
    await flow.stopDrop('default');
  } catch (error: any) {
    spinner.fail('Failed to stop drop:\n');
    throw new FreshmintError(error);
  }

  // TODO: return error if no drop is active

  spinner.succeed('Your drop has been stopped.');
}
