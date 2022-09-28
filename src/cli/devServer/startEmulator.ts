import { spawnProcess } from './process';

import { exec } from 'child_process';

const port = 8888;

export type EmulatorProcess = { port: number; done: Promise<number>; showOutput: (show: boolean) => void };

export type EmulatorTransaction = {
  id: string;
  error?: string;
};

export type TransactionHandler = (transaction: EmulatorTransaction) => void;
export type ExitHandler = (code: number, message: string) => void;

export type EmulatorHandlers = {
  onTransaction: TransactionHandler;
  onExit: ExitHandler;
};

export async function startEmulator(handlers: EmulatorHandlers): Promise<EmulatorProcess> {
  return new Promise((resolveStart) => {
    let outputEnabled = true;

    const showOutput = (show: boolean) => {
      outputEnabled = show;
    };

    let lastLogLine = '';

    const handleStdout = (line: string) => {
      if (line.trim() === '') {
        return;
      }

      lastLogLine = line;

      console.log(line);

      // The emulator is considered ready when the REST API launches
      if (line.includes('Starting REST API')) {
        resolveStart({ port, done, showOutput });
      }

      if (outputEnabled) {
        if (line.includes('Transaction executed')) {
          handleTransaction(line, handlers.onTransaction);
        }

        if (line.includes('Transaction reverted')) {
          handleTransaction(line, handlers.onTransaction);
        }
      }
    };

    const done = new Promise<number>((resolveRun) => {
      spawnProcess('flow', ['emulator', '--verbose', '--log-format', 'json', '--rest-port', port.toString()], {
        onClose: (code: number) => {
          handlers.onExit(code, lastLogLine);
          resolveRun(code);
        },
        onStdout: (line: string) => handleStdout(line),
      });
    });
  });
}

function handleTransaction(logLine: string, onTransaction: TransactionHandler) {
  const json = JSON.parse(logLine);

  getTransaction(json.txID).then(({ id, error }: any) => {
    onTransaction({ id, error });
  });
}

async function getTransaction(id: string) {
  return new Promise((resolve) => {
    exec(`flow transactions get ${id} -o json`, (error, stdout) => {
      // TODO: handle errors
      resolve(JSON.parse(stdout));
    });
  });
}
