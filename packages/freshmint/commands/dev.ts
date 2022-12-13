import { Command } from 'commander';

import { loadConfig } from '../config';
import { runDevServer } from '../devServer';

export default new Command('dev').description('start the Freshmint development server').action(dev);

async function dev() {
  const config = await loadConfig();

  await runDevServer(config);
}
