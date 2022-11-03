/* eslint-disable @typescript-eslint/no-var-requires */

import { ContractImports } from '../config';
import TemplateGenerator from './TemplateGenerator';

export class FreshmintClaimSaleGenerator extends TemplateGenerator {
  static contract({ imports }: { imports: ContractImports }): string {
    return this.generate(require('../../../cadence/freshmint-claim-sale/FreshmintClaimSale.cdc'), {
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
    return this.generate(require('../../../cadence/freshmint-claim-sale/transactions/start_sale.template.cdc'), {
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
    return this.generate(require('../../../cadence/freshmint-claim-sale/transactions/stop_sale.template.cdc'), {
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
    return this.generate(require('../../../cadence/freshmint-claim-sale/transactions/claim_nft.template.cdc'), {
      imports,
      contractName,
      contractAddress,
    });
  }

  static addToAllowlist({
    imports,
    contractName,
    contractAddress,
  }: {
    imports: ContractImports;
    contractName: string;
    contractAddress: string;
  }): string {
    return this.generate(require('../../../cadence/freshmint-claim-sale/transactions/add_to_allowlist.cdc'), {
      imports,
      contractName,
      contractAddress,
    });
  }

  static getClaimSale({ imports }: { imports: ContractImports }): string {
    return this.generate(require('../../../cadence/freshmint-claim-sale/scripts/get_claim_sale.cdc'), {
      imports,
    });
  }
}
