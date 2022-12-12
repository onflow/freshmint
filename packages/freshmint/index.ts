#!/usr/bin/env node

// This file contains the main entry point for the `fresh` command line app.

import { Command } from 'commander';
import chalk from 'chalk';

// All commands are implemented in the /commands directory.
//
import start from './commands/start';
import dev from './commands/dev';
import deploy from './commands/deploy';
import mint from './commands/mint';
import startDrop from './commands/start-drop';
import stopDrop from './commands/stop-drop';
import gen from './commands/gen';
import prince from './commands/prince';

import { FreshmintError } from './errors';

async function main() {
  const program = new Command();

  // Highlight errors in red
  program.configureOutput({
    outputError: (str: string, write: (str: string) => void) => write(chalk.red(str)),
  });

  // Copy parent program settings to all sub-commands
  const addCommand = (command: Command) => {
    program.addCommand(command);
    command.copyInheritedSettings(program);
  };

  addCommand(start);
  addCommand(dev);
  addCommand(deploy);
  addCommand(mint);
  addCommand(startDrop);
  addCommand(stopDrop);
  addCommand(gen);
  addCommand(prince);

  await program.parseAsync(process.argv);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    if (err instanceof FreshmintError) {
      // Freshmint application errors are designed
      // to be displayed using only the message field.
      console.error(chalk.red(err.message));
    } else {
      // Other errors are unexpected fatal errors and should be
      // logged in their entirety.
      console.error(err);
    }

    process.exit(1);
  });
