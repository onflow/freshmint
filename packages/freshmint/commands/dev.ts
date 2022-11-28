import { Command } from 'commander';

import { runDevServer } from '../devServer';

export default new Command('dev').description('start the Freshmint development server').action(dev);

async function dev() {
  await runDevServer();
}
