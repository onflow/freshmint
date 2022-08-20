import * as metadata from '../metadata';
import { ContractImports } from '../config';
import TemplateGenerator from './TemplateGenerator';

export class EditionNFTGenerator extends TemplateGenerator {
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
    return this.generate('../templates/cadence/edition-nft/contracts/NFT.cdc', {
      imports,
      contractName,
      fields: schema.getFieldList(),
      views: schema.views,
      saveAdminResourceToContractAccount: saveAdminResourceToContractAccount ?? false,
    });
  }

  static deploy(): string {
    return this.generate('../templates/cadence/edition-nft/transactions/deploy.cdc', {});
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
    return this.generate('../templates/cadence/edition-nft/transactions/create_editions.cdc', {
      imports,
      contractName,
      contractAddress,
      fields: schema.getFieldList(),
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
    return this.generate('../templates/cadence/edition-nft/transactions/mint.cdc', {
      imports,
      contractName,
      contractAddress,
    });
  }

  static mintWithClaimKey({
    imports,
    contractName,
    contractAddress,
  }: {
    imports: ContractImports;
    contractName: string;
    contractAddress: string;
  }): string {
    return this.generate('../templates/cadence/edition-nft/transactions/mint_with_claim_key.cdc', {
      imports,
      contractName,
      contractAddress,
    });
  }
}
