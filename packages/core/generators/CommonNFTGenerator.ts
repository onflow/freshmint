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
    return this.generate(require('../../../cadence/common-nft/scripts/get_nft.cdc'), {
      imports,
      contractName,
      contractAddress,
    });
  }
}
