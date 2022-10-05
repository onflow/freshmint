import chalk from 'chalk';

import { startEmulator, EmulatorTransaction } from './startEmulator';
import { startDevWallet } from './startDevWallet';
import { deployContracts } from './deployContracts';

export type ServerReadyHandler<T> = (value: T) => void;

// TODO: clean up the child process handling logic
//
// Ensure that the emulator and dev wallet servers are never left running

export async function runDevServer() {
  const emulator = await startEmulator({
    onTransaction: (tx: EmulatorTransaction) => {
      if (tx.error) {
        console.log(`${chalk.redBright('error - transaction failed:')} ${chalk.gray(tx.id)}\n\n${chalk.red(tx.error)}`);
      } else {
        console.log(`${chalk.blue('info')}  - transaction executed: ${chalk.gray(tx.id)}`);
      }
    },
    onExit: (code: number, message: string) => {
      if (code !== 0) {
        console.error(chalk.redBright('error - emulator failed with error:'));
        console.error(chalk.red(message));
      }
    },
  });

  console.log(
    `${chalk.green('ready')} - started emulator on 0.0.0.0:${emulator.port}, url: http://localhost:${emulator.port}`,
  );

  // Disable emulator output when deploying contracts to keep console clean
  emulator.showOutput(false);

  const devWallet = await startDevWallet();

  console.log(
    `${chalk.green('ready')} - started dev wallet on 0.0.0.0:${devWallet.port}, url: http://localhost:${
      devWallet.port
    }`,
  );

  try {
    await deployContracts();
    console.log(`${chalk.green('ready')} - project contracts deployed`);
  } catch (error) {
    console.log(`${chalk.redBright('error - failed to deploy contracts:')}\n\n${chalk.red(error)}`);

    // Stop the emulator and dev wallet
    emulator.process.kill();
    devWallet.process.kill();
  }

  // Enable emulator output after contracts are deployed
  emulator.showOutput(true);

  // Wait for the emulator and dev wallet to exit
  await emulator.done;
  await devWallet.done;
}
