import { ContractConfig, ContractType } from '../config';
import { FlowGateway } from '../flow';
import { EditionMinter } from './EditionMinter';
import { StandardMinter } from './StandardMinter';
import Storage from '../storage';
import { MetadataLoader } from '../loaders';
import { MetadataProcessor } from '../processors';

export interface Minter {
  mint(
    loader: MetadataLoader,
    withClaimKey: boolean,
    onStart: (total: number, skipped: number, batchCount: number, batchSize: number) => void,
    onBatchComplete: (batchSize: number) => void,
    onError: (error: Error) => void,
    batchSize: number,
  ): Promise<void>;
}

export function createMinter(
  contract: ContractConfig,
  metadataProcessor: MetadataProcessor,
  flowGateway: FlowGateway,
  storage: Storage,
): Minter {
  switch (contract.type) {
    case ContractType.Standard:
      return new StandardMinter(contract.schema, metadataProcessor, flowGateway, storage);
    case ContractType.Edition:
      return new EditionMinter(contract.schema, metadataProcessor, flowGateway, storage);
  }
}
