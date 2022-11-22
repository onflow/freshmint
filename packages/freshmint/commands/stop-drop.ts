import { Command } from 'commander';
import ora from 'ora';

import { FlowGateway, FlowNetwork } from '../flow';

export default new Command('stop-drop')
  .command('stop-drop')
  .description('stop the current drop')
  .option('-n, --network <network>', "Network to use. Either 'emulator', 'testnet' or 'mainnet'", 'emulator')
  .action(stopDrop);

async function stopDrop({ network }: { network: FlowNetwork }) {
  const flow = new FlowGateway(network);

  const spinner = ora();

  spinner.start('Stopping drop...');

  await flow.stopDrop('default');

  // TODO: return error if no drop is active

  spinner.succeed('Your drop has been stopped.');
}
