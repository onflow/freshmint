import TemplateGenerator, { Contracts } from './TemplateGenerator';

export default class ClaimSaleGenerator extends TemplateGenerator {
  static contract({ contracts }: { contracts: Contracts }): string {
    return this.generate('../templates/cadence/claim-sale/contracts/NFTClaimSale.cdc', {
      contracts,
    });
  }

  static startSale({
    contracts,
    contractName,
    contractAddress,
  }: {
    contracts: Contracts;
    contractName: string;
    contractAddress: string;
  }): string {
    return this.generate('../templates/cadence/claim-sale/transactions/start_sale.cdc', {
      contracts,
      contractName,
      contractAddress,
    });
  }

  static stopSale({
    contracts,
    contractName,
    contractAddress,
  }: {
    contracts: Contracts;
    contractName: string;
    contractAddress: string;
  }): string {
    return this.generate('../templates/cadence/claim-sale/transactions/stop_sale.cdc', {
      contracts,
      contractName,
      contractAddress,
    });
  }

  static claimNFT({
    contracts,
    contractName,
    contractAddress,
  }: {
    contracts: Contracts;
    contractName: string;
    contractAddress: string;
  }): string {
    return this.generate('../templates/cadence/claim-sale/transactions/claim_nft.cdc', {
      contracts,
      contractName,
      contractAddress,
    });
  }
}
