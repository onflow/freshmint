import * as metadata from '../metadata';
import TemplateGenerator, { Contracts } from './TemplateGenerator';

export default class OnChainGenerator extends TemplateGenerator {
  static async contract({
    contracts,
    contractName,
    schema,
    saveAdminResourceToContractAccount,
  }: {
    contracts: Contracts;
    contractName: string;
    schema: metadata.Schema;
    saveAdminResourceToContractAccount?: boolean;
  }): Promise<string> {    
    return this.generate('../templates/cadence/on-chain/contracts/NFT.cdc', {
      contracts,
      contractName,
      fields: schema.getFieldList(),
      views: schema.views,
      saveAdminResourceToContractAccount: saveAdminResourceToContractAccount ?? false,
    });
  }

  static async deploy(): Promise<string> {
    return this.generate('../templates/cadence/on-chain/transactions/deploy.cdc', {});
  }

  static async mint({
    contracts,
    contractName,
    contractAddress,
    schema,
  }: {
    contracts: Contracts;
    contractName: string;
    contractAddress: string;
    schema: metadata.Schema;
  }): Promise<string> {
    return this.generate('../templates/cadence/on-chain/transactions/mint.cdc', {
      contracts,
      contractName,
      contractAddress,
      fields: schema.getFieldList(),
    });
  }
}
