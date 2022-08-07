import * as metadata from '../metadata';
import TemplateGenerator, { Contracts } from './TemplateGenerator';

export default class EditionBlindGenerator extends TemplateGenerator {
  static async contract({
    contracts,
    contractName,
    schema,
  }: {
    contracts: Contracts;
    contractName: string;
    schema: metadata.Schema;
  }): Promise<string> {
    const displayView = schema.getView(metadata.DisplayView.TYPE);

    return this.generate('../templates/cadence/edition-blind/contracts/NFT.cdc', {
      contracts,
      contractName,
      fields: schema.getFieldList(),
      // TODO: support multiple views
      displayView,
    });
  }

  static async deploy(): Promise<string> {
    return this.generate('../templates/cadence/edition-blind/transactions/deploy.cdc', {});
  }

  static async createEditions({
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
    return this.generate('../templates/cadence/edition-blind/transactions/create_editions.cdc', {
      contracts,
      contractName,
      contractAddress,
      fields: schema.getFieldList(),
    });
  }

  static async mint({
    contracts,
    contractName,
    contractAddress,
  }: {
    contracts: Contracts;
    contractName: string;
    contractAddress: string;
  }): Promise<string> {
    return this.generate('../templates/cadence/edition-blind/transactions/mint.cdc', {
      contracts,
      contractName,
      contractAddress,
    });
  }

  static async reveal({
    contracts,
    contractName,
    contractAddress,
  }: {
    contracts: Contracts;
    contractName: string;
    contractAddress: string;
  }): Promise<string> {
    return this.generate('../templates/cadence/edition-blind/transactions/reveal.cdc', {
      contracts,
      contractName,
      contractAddress,
    });
  }
}
