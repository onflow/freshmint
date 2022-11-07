/* eslint-disable @typescript-eslint/no-var-requires */

import * as metadata from '../metadata';
import { ContractImports } from '../config';
import TemplateGenerator from './TemplateGenerator';

export class BlindEditionNFTGenerator extends TemplateGenerator {
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
    return this.generate(require('../../../cadence/nfts/blind-edition-nft/BlindEditionNFT.template.cdc'), {
      imports,
      contractName,
      fields: schema.fields,
      views: schema.views,
      saveAdminResourceToContractAccount: saveAdminResourceToContractAccount ?? false,
    });
  }

  static deployToNewAccount({ imports }: { imports: ContractImports }): string {
    return this.generate(require('../../../cadence/nfts/blind-edition-nft/transactions/deploy_new_account.cdc'), {
      imports,
    });
  }

  static createEditions({
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
    return this.generate(require('../../../cadence/nfts/blind-edition-nft/transactions/create_editions.template.cdc'), {
      imports,
      contractName,
      contractAddress,
      fields: schema.fields,
    });
  }

  static mint({
    imports,
    contractName,
    contractAddress,
  }: {
    imports: ContractImports;
    contractName: string;
    contractAddress: string;
  }): string {
    return this.generate(require('../../../cadence/nfts/blind-edition-nft/transactions/mint.template.cdc'), {
      imports,
      contractName,
      contractAddress,
    });
  }

  static reveal({
    imports,
    contractName,
    contractAddress,
  }: {
    imports: ContractImports;
    contractName: string;
    contractAddress: string;
  }): string {
    return this.generate(require('../../../cadence/nfts/blind-edition-nft/transactions/reveal.template.cdc'), {
      imports,
      contractName,
      contractAddress,
    });
  }
}
