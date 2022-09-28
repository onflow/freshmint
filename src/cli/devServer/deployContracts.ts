import { spawnProcess } from './process';

export async function deployContracts() {
  return new Promise((resolve) => {
    // TODO: capture number of contracts deployed and address
    spawnProcess('flow', ['deploy', '-o', 'json'], { onClose: resolve });
  });
}
