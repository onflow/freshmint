import { ContractConfig, ContractType } from '../../config';
import { FlowGateway } from '../../flow';
import { MetadataProcessor } from '../processors';
import { EditionMinter } from './EditionMinter';
import { StandardMinter } from './StandardMinter';

export type MinterHooks = {
  onStartDuplicateCheck: () => void;
  onCompleteDuplicateCheck: (message: string) => void;
  onStartEditionCreation: (count: number) => void;
  onCompleteEditionCreation: () => void;
  onStartPinning: (count: number) => void;
  onCompletePinning: () => void;
  onStartMinting: (total: number, batchCount: number, batchSize: number) => void;
  onCompleteBatch: (batchSize: number) => void;
};

export interface Minter {
  mint(
    csvInputFile: string,
    csvOutputFile: string,
    withClaimKeys: boolean,
    batchSize: number,
    hooks: MinterHooks,
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
