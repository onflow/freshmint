import { spawnProcess } from './process';
import { ChildProcess } from 'child_process';

const port = 8701;

export type DevWalletProcess = { port: number; done: Promise<number>; process: ChildProcess };

export async function startDevWallet(): Promise<DevWalletProcess> {
  return new Promise((resolveStart) => {
    const done = new Promise<number>((resolveRun) => {
      const handleStdout = (line: string) => {
        // The dev wallet is considered ready when the  HTTP server launches
        if (line.includes('Starting dev wallet server')) {
          resolveStart({ port, done, process });
        }
      };

      const process = spawnProcess('flow', ['dev-wallet', '--port', port.toString()], {
        onClose: (code: number) => resolveRun(code),
        onStdout: (line: string) => handleStdout(line),
      });
    });
  });
}
