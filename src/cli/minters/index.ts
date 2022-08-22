import { ContractFreshmintConfig, ContractType } from '../config';
import FlowGateway from '../flow';
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
  contract: ContractFreshmintConfig,
  nftAssetPath: string,
  ipfs: IPFS,
  flowGateway: FlowGateway,
  storage: Storage,
): Minter {
  switch (contract.type) {
    case ContractType.Standard:
      return new StandardMinter(contract.schema, nftAssetPath, ipfs, flowGateway, storage);
    case ContractType.Edition:
      return new EditionMinter(contract.schema, nftAssetPath, ipfs, flowGateway, storage);
  }
}
