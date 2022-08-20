import { ContractImports } from '../config';
import TemplateGenerator from './TemplateGenerator';

export class ClaimSaleGenerator extends TemplateGenerator {
  static contract({ imports }: { imports: ContractImports }): string {
    return this.generate('../templates/cadence/nft-claim-sale/contracts/NFTClaimSale.cdc', {
      imports,
    });
  }

  static startSale({
    imports,
    contractName,
    contractAddress,
  }: {
    imports: ContractImports;
    contractName: string;
    contractAddress: string;
  }): string {
    return this.generate('../templates/cadence/nft-claim-sale/transactions/start_sale.cdc', {
      imports,
      contractName,
      contractAddress,
    });
  }

  static stopSale({
    imports,
    contractName,
    contractAddress,
  }: {
    imports: ContractImports;
    contractName: string;
    contractAddress: string;
  }): string {
    return this.generate('../templates/cadence/nft-claim-sale/transactions/stop_sale.cdc', {
      imports,
      contractName,
      contractAddress,
    });
  }

  static claimNFT({
    imports,
    contractName,
    contractAddress,
  }: {
    imports: ContractImports;
    contractName: string;
    contractAddress: string;
  }): string {
    return this.generate('../templates/cadence/nft-claim-sale/transactions/claim_nft.cdc', {
      imports,
      contractName,
      contractAddress,
    });
  }
}
