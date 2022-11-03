/* eslint-disable @typescript-eslint/no-var-requires */

import { ContractImports } from '../config';
import TemplateGenerator from './TemplateGenerator';

export class FreshmintClaimSaleV2Generator extends TemplateGenerator {
  static contract({ imports }: { imports: ContractImports }): string {
    return this.generate(require('../../../cadence/freshmint-claim-sale-v2/FreshmintClaimSaleV2.cdc'), {
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
    return this.generate(require('../../../cadence/freshmint-claim-sale-v2/transactions/start_sale.template.cdc'), {
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
    return this.generate(require('../../../cadence/freshmint-claim-sale-v2/transactions/stop_sale.template.cdc'), {
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
    return this.generate(require('../../../cadence/freshmint-claim-sale-v2/transactions/claim_nft.template.cdc'), {
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
    return this.generate(require('../../../cadence/freshmint-claim-sale-v2/transactions/add_to_allowlist.cdc'), {
      imports,
      contractName,
      contractAddress,
    });
  }

  static setClaimLimit({ imports }: { imports: ContractImports }): string {
    return this.generate(
      require('../../../cadence/freshmint-claim-sale-v2/transactions/set_claim_limit.template.cdc'),
      {
        imports,
      },
    );
  }

  static getClaimSale({ imports }: { imports: ContractImports }): string {
    return this.generate(require('../../../cadence/freshmint-claim-sale-v2/scripts/get_claim_sale.cdc'), {
      imports,
    });
  }
}
