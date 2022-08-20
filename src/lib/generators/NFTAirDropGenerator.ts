import { ContractImports } from '../config';
import TemplateGenerator from './TemplateGenerator';

export class NFTAirDropGenerator extends TemplateGenerator {
  static contract({ imports }: { imports: ContractImports }): string {
    return this.generate('../templates/cadence/nft-air-drop/contracts/NFTAirDrop.cdc', {
      imports,
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
    return this.generate('../templates/cadence/nft-air-drop/transactions/claim_nft.cdc', {
      imports,
      contractName,
      contractAddress,
    });
  }
}
