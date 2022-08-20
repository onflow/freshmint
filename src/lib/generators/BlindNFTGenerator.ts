import * as metadata from '../metadata';
import { ContractImports } from '../config';
import TemplateGenerator from './TemplateGenerator';

export class BlindNFTGenerator extends TemplateGenerator {
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
    return this.generate('../templates/cadence/blind-nft/contracts/NFT.cdc', {
      imports,
      contractName,
      fields: schema.getFieldList(),
      views: schema.views,
      saveAdminResourceToContractAccount: saveAdminResourceToContractAccount ?? false,
    });
  }

  static deploy(): string {
    return this.generate('../templates/cadence/blind-nft/transactions/deploy.cdc', {});
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
    return this.generate('../templates/cadence/blind-nft/transactions/mint.cdc', {
      imports,
      contractName,
      contractAddress,
    });
  }

  static reveal({
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
    return this.generate('../templates/cadence/blind-nft/transactions/reveal.cdc', {
      imports,
      contractName,
      contractAddress,
      fields: schema.getFieldList(),
    });
  }
}
