import { ContractImports } from '../config';
import TemplateGenerator from './TemplateGenerator';

export class NFTLockBoxGenerator extends TemplateGenerator {
  static contract({ imports }: { imports: ContractImports }): string {
    return this.generate('../../../cadence/nft-lock-box/NFTLockBox.cdc', {
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
    return this.generate('../../../cadence/nft-lock-box/transactions/claim_nft.template.cdc', {
      imports,
      contractName,
      contractAddress,
    });
  }
}
