import { Command, Argument } from 'commander';
import chalk from 'chalk';

import { loadConfig } from '../config';
import { generateWeb, generateCadence } from '../generate';

const targets = ['cadence', 'web'];

export default new Command('gen')
  .addArgument(new Argument('<targets...>', 'targets to regenerate').choices(targets))
  .description('regenerate project files from freshmint.yaml')
  .action(gen);

async function gen(targets: string[]) {
  const config = await loadConfig();

  for (const target of targets) {
    switch (target) {
      case 'cadence':
        await generateCadence('./', config.contract, false);
        console.log(`Regenerated files in ${chalk.cyan('./cadence')}`);
        break;
      case 'web':
        await generateWeb('./', config.collection.name, config.collection.description);
        console.log(`Regenerated files in ${chalk.cyan('./web')}`);
        break;
    }
  }
}
