import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';

import { FlowGateway, FlowNetwork } from '../flow';
import { loadConfig } from '../config';

export default new Command('burn')
  .argument('<ids...>', 'The IDs of NFTs to destroy (e.g. 3425 1235 4524 216661).')
  .description('burn (i.e. destroy) one or more NFTs')
  .option('-n, --network <network>', "Network to use. Either 'emulator', 'testnet' or 'mainnet'", 'emulator')
  .action(destroyNFTs);

async function destroyNFTs(ids: string[], { network }: { network: FlowNetwork }) {
  const config = await loadConfig();

  const flow = new FlowGateway(network, config.getContractAccount(network));

  const spinner = ora();

  console.log(chalk.gray('\n> flow transactions send ./cadence/transactions/destroy_nfts.cdc <...>\n'));

  spinner.start(`Destroying the NFTs...`);

  await flow.destroyNFTs(ids);

  if (ids.length == 1) {
    spinner.succeed(`1 NFT was destroyed.`);
  } else {
    spinner.succeed(`${ids.length} NFTs were destroyed.`);
  }
}
