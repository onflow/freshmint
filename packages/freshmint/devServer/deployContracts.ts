import { spawnProcess } from './process';

export async function deployContracts() {
  return new Promise((resolve, reject) => {
    // TODO: capture number of contracts deployed and address
    spawnProcess('flow', ['deploy', '-o', 'json'], {
      onClose: (code: number) => resolve(code),
      onStderr: (error: string) => reject(error),
    });
  });
}
