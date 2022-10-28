/* eslint-disable @typescript-eslint/no-var-requires */

import * as metadata from '../metadata';
import { ContractImports } from '../config';
import TemplateGenerator from './TemplateGenerator';

export class StandardNFTGenerator extends TemplateGenerator {
  static contract({
    imports,
    contractName,
    schema,
    saveAdminResourceToContractAccount,
  }: {
    imports: ContractImports;
    contractName: string;
    schema: metadata.Schema;
    saveAdminResourceToContractAccount?: boolean;
  }): string {
    return this.generate(require('../../../cadence/nfts/standard-nft/StandardNFT.template.cdc'), {
      imports,
      contractName,
      fields: schema.fields,
      views: schema.views,
      saveAdminResourceToContractAccount: saveAdminResourceToContractAccount ?? false,
    });
  }

  static deploy({ imports }: { imports: ContractImports }): string {
    return this.generate(require('../../../cadence/nfts/standard-nft/transactions/deploy.cdc'), { imports });
  }

  static mint({
    imports,
    contractName,
    contractAddress,
    schema,
  }: {
    imports: ContractImports;
    contractName: string;
    contractAddress: string;
    schema: metadata.Schema;
  }): string {
    return this.generate(require('../../../cadence/nfts/standard-nft/transactions/mint.template.cdc'), {
      imports,
      contractName,
      contractAddress,
      fields: schema.fields,
    });
  }

  static mintWithClaimKey({
    imports,
    contractName,
    contractAddress,
    schema,
  }: {
    imports: ContractImports;
    contractName: string;
    contractAddress: string;
    schema: metadata.Schema;
  }): string {
    return this.generate(require('../../../cadence/nfts/standard-nft/transactions/mint_with_claim_key.template.cdc'), {
      imports,
      contractName,
      contractAddress,
      fields: schema.fields,
    });
  }
}
