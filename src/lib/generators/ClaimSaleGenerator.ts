import TemplateGenerator, { Contracts } from './TemplateGenerator';

export default class ClaimSaleGenerator extends TemplateGenerator {
  static async contract({ contracts }: { contracts: Contracts }): Promise<string> {
    return this.generate('../templates/cadence/claim-sale/contracts/NFTClaimSale.cdc', {
      contracts,
    });
  }

  static async startSale({
    contracts,
    contractName,
    contractAddress,
  }: {
    contracts: Contracts;
    contractName: string;
    contractAddress: string;
  }): Promise<string> {
    return this.generate('../templates/cadence/claim-sale/transactions/start_sale.cdc', {
      contracts,
      contractName,
      contractAddress,
    });
  }

  static async stopSale({
    contracts,
    contractName,
    contractAddress,
  }: {
    contracts: Contracts;
    contractName: string;
    contractAddress: string;
  }): Promise<string> {
    return this.generate('../templates/cadence/claim-sale/transactions/stop_sale.cdc', {
      contracts,
      contractName,
      contractAddress,
    });
  }

  static async claimNFT({
    contracts,
    contractName,
    contractAddress,
  }: {
    contracts: Contracts;
    contractName: string;
    contractAddress: string;
  }): Promise<string> {
    return this.generate('../templates/cadence/claim-sale/transactions/claim_nft.cdc', {
      contracts,
      contractName,
      contractAddress,
    });
  }
}
