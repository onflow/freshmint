import { ContractConfig, ContractType } from '../config';
import FlowMinter from '../flow';
import IPFS from '../ipfs';
import { EditionMinter } from './EditionMinter';
import { StandardMinter } from './StandardMinter';
import { Storage } from '../storage';

export interface Minter {
  mint(
    csvPath: string,
    withClaimKey: boolean,
    onStart: (total: number, skipped: number, batchCount: number, batchSize: number) => void,
    onBatchComplete: (batchSize: number) => void,
    onError: (error: Error) => void,
    batchSize: number,
  ): Promise<void>;
}

export function createMinter(
  contract: ContractConfig,
  nftAssetPath: string,
  ipfs: IPFS,
  flowMinter: FlowMinter,
  storage: Storage,
): Minter {
  switch (contract.type) {
    case ContractType.Standard:
      return new StandardMinter(contract.schema, nftAssetPath, ipfs, flowMinter, storage);
    case ContractType.Edition:
      return new EditionMinter(contract.schema, nftAssetPath, ipfs, flowMinter, storage);
  }
}
