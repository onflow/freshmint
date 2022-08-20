import * as metadata from '../metadata';
import TemplateGenerator, { Contracts } from './TemplateGenerator';

export class BlindNFTGenerator extends TemplateGenerator {
  static contract({
    contracts,
    contractName,
    schema,
    saveAdminResourceToContractAccount,
  }: {
    contracts: Contracts;
    contractName: string;
    schema: metadata.Schema;
    saveAdminResourceToContractAccount?: boolean;
  }): string {
    return this.generate('../templates/cadence/on-chain-blind/contracts/NFT.cdc', {
      contracts,
      contractName,
      fields: schema.getFieldList(),
      views: schema.views,
      saveAdminResourceToContractAccount: saveAdminResourceToContractAccount ?? false,
    });
  }

  static deploy(): string {
    return this.generate('../templates/cadence/on-chain-blind/transactions/deploy.cdc', {});
  }

  static mint({
    contracts,
    contractName,
    contractAddress,
  }: {
    contracts: Contracts;
    contractName: string;
    contractAddress: string;
  }): string {
    return this.generate('../templates/cadence/on-chain-blind/transactions/mint.cdc', {
      contracts,
      contractName,
      contractAddress,
    });
  }

  static reveal({
    contracts,
    contractName,
    contractAddress,
    schema,
  }: {
    contracts: Contracts;
    contractName: string;
    contractAddress: string;
    schema: metadata.Schema;
  }): string {
    return this.generate('../templates/cadence/on-chain-blind/transactions/reveal.cdc', {
      contracts,
      contractName,
      contractAddress,
      fields: schema.getFieldList(),
    });
  }
}
