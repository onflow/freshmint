import { ContractConfig, ContractType } from '../config';
import { FlowGateway } from '../flow';
import { EditionMinter } from './EditionMinter';
import { StandardMinter } from './StandardMinter';
import { MetadataProcessor } from './processors';
import { MetadataLoader } from './loaders';

export type MinterHooks = {
  onStartDuplicateCheck: () => void;
  onCompleteDuplicateCheck: (message: string) => void;
  onStartPinning: (files: number) => void;
  onCompletePinning: () => void;
  onStartMinting: (total: number, batchCount: number, batchSize: number) => void;
  onCompleteBatch: (batchSize: number) => void;
  onMintingError: (error: Error) => void;
};

export interface Minter {
  mint(loader: MetadataLoader, withClaimKey: boolean, batchSize: number, hooks: MinterHooks): Promise<void>;
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
