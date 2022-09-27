import { registerPartial } from '.';
import { ContractImports } from '../config';
import TemplateGenerator from './TemplateGenerator';

// Register the royalties partials
registerPartial('royaltiesFields', '../../../cadence/common-nft/partials/royalties-fields.partial.cdc')
registerPartial('royaltiesAdmin', '../../../cadence/common-nft/partials/royalties-admin.partial.cdc')
registerPartial('royaltiesInit', '../../../cadence/common-nft/partials/royalties-init.partial.cdc')

export class CommonNFTGenerator extends TemplateGenerator {
  static getNFT({
    imports,
    contractName,
    contractAddress,
  }: {
    imports: ContractImports;
    contractName: string;
    contractAddress: string;
  }): string {
    return this.generate('../../../cadence/common-nft/scripts/get_nft.template.cdc', { imports, contractName, contractAddress });
  }

  static setRoyalties({
    imports,
    contractName,
    contractAddress,
  }: {
    imports: ContractImports;
    contractName: string;
    contractAddress: string;
  }): string {
    return this.generate('../../../cadence/common-nft/transactions/set_royalties.template.cdc', {
      imports,
      contractName,
      contractAddress,
    });
  }

  static getRoyalties({
    imports,
    contractName,
    contractAddress,
  }: {
    imports: ContractImports;
    contractName: string;
    contractAddress: string;
  }): string {
    return this.generate('../../../cadence/common-nft/scripts/get_royalties.template.cdc', {
      imports,
      contractName,
      contractAddress,
    });
  }
}
