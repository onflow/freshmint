import { ContractConfig, ContractType } from '../config';
import { FlowGateway } from '../flow';
import { EditionMinter } from './EditionMinter';
import { StandardMinter } from './StandardMinter';
import { MetadataProcessor } from './processors';
import { MetadataLoader } from './loaders';

export interface Minter {
  mint(
    loader: MetadataLoader,
    withClaimKey: boolean,
    onStart: (total: number, batchCount: number, batchSize: number, message?: string) => void,
    onBatchComplete: (batchSize: number) => void,
    onError: (error: Error) => void,
    batchSize: number,
  ): Promise<void>;
}

export function createMinter(
  contract: ContractConfig,
  metadataProcessor: MetadataProcessor,
  flowGateway: FlowGateway,
): Minter {
  switch (contract.type) {
    case ContractType.Standard:
      return new StandardMinter(contract.schema, metadataProcessor, flowGateway);
    case ContractType.Edition:
      return new EditionMinter(contract.schema, metadataProcessor, flowGateway);
  }
}
