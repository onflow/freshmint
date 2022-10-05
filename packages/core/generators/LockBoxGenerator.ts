import { ContractImports } from '../config';
import TemplateGenerator from './TemplateGenerator';

export class LockBoxGenerator extends TemplateGenerator {
  static contract({ imports }: { imports: ContractImports }): string {
    return this.generate('../../../cadence/freshmint-lock-box/FreshmintLockBox.cdc', {
      imports,
    });
  }

  static claimNFT({
    imports,
    contractName,
    contractAddress,
  }: {
    imports: ContractImports;
    contractName: string;
    contractAddress: string;
  }): string {
    return this.generate('../../../cadence/freshmint-lock-box/transactions/claim_nft.template.cdc', {
      imports,
      contractName,
      contractAddress,
    });
  }
}
