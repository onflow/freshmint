import TemplateGenerator, { Contracts } from './TemplateGenerator';

export class NFTAirDropGenerator extends TemplateGenerator {
  static contract({ contracts }: { contracts: Contracts }): string {
    return this.generate('../templates/cadence/nft-air-drop/contracts/NFTAirDrop.cdc', {
      contracts,
    });
  }
}
