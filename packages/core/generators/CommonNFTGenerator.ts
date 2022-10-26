/* eslint-disable @typescript-eslint/no-var-requires */

import { ContractImports } from '../config';
import TemplateGenerator from './TemplateGenerator';

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
    return this.generate(require('../../../cadence/nfts/common/scripts/get_nft.template.cdc'), {
      imports,
      contractName,
      contractAddress,
    });
  }

  static getNFTs({
    imports,
    contractName,
    contractAddress,
  }: {
    imports: ContractImports;
    contractName: string;
    contractAddress: string;
  }): string {
    return this.generate(require('../../../cadence/nfts/common/scripts/get_nfts.template.cdc'), {
      imports,
      contractName,
      contractAddress,
    });
  }
}
