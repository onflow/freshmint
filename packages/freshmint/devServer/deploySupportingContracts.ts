import { spawnProcess } from './process';

// Deploy Freshmint's supporting contracts to the emulator.
//
// Note: this does not deploy the user's NFT contract
// because it requires special arguments not supported by `flow deploy`.
//
export async function deploySupportingContracts() {
  return new Promise((resolve, reject) => {
    // TODO: capture number of contracts deployed and address
    spawnProcess('flow', ['deploy', '-o', 'json'], {
      onClose: (code: number) => resolve(code),
      onStderr: (error: string) => reject(error),
    });
  });
}
