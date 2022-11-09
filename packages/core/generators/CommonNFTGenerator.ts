/* eslint-disable @typescript-eslint/no-var-requires */

import { registerPartial } from '.';
import { ContractImports } from '../config';
import TemplateGenerator from './TemplateGenerator';

// Register the royalties partial
registerPartial('royalties-field', require('../../../cadence/nfts/common/partials/royalties-field.partial.cdc'));

// Register the collection metadata partial
registerPartial(
  'collection-metadata-field',
  require('../../../cadence/nfts/common/partials/collection-metadata-field.partial.cdc'),
);

export class CommonNFTGenerator extends TemplateGenerator {
  static getNFT({
    imports,
    contractName,
    contractAddress,
  }: {
    imports: ContractImports;
    contractName: string;
    contractAddress: string;
  }): string {
    return this.generate(require('../../../cadence/nfts/common/scripts/get_nft.template.cdc'), {
      imports,
      contractName,
      contractAddress,
    });
  }

  static getNFTs({
    imports,
    contractName,
    contractAddress,
  }: {
    imports: ContractImports;
    contractName: string;
    contractAddress: string;
  }): string {
    return this.generate(require('../../../cadence/nfts/common/scripts/get_nfts.template.cdc'), {
      imports,
      contractName,
      contractAddress,
    });
  }

  static destroyNFT({
    imports,
    contractName,
    contractAddress,
  }: {
    imports: ContractImports;
    contractName: string;
    contractAddress: string;
  }): string {
    return this.generate(require('../../../cadence/nfts/common/transactions/destroy_nft.template.cdc'), {
      imports,
      contractName,
      contractAddress,
    });
  }

  static transferQueueToQueue({
    imports,
    contractName,
    contractAddress,
  }: {
    imports: ContractImports;
    contractName: string;
    contractAddress: string;
  }): string {
    return this.generate(require('../../../cadence/nfts/common/transactions/transfer_queue_to_queue.template.cdc'), {
      imports,
      contractName,
      contractAddress,
    });
  }

  static getRoyalties({
    imports,
    contractName,
    contractAddress,
  }: {
    imports: ContractImports;
    contractName: string;
    contractAddress: string;
  }): string {
    return this.generate(require('../../../cadence/nfts/common/scripts/get_royalties.template.cdc'), {
      imports,
      contractName,
      contractAddress,
    });
  }

  static getCollectionMetadata({
    imports,
    contractName,
    contractAddress,
  }: {
    imports: ContractImports;
    contractName: string;
    contractAddress: string;
  }): string {
    return this.generate(require('../../../cadence/nfts/common/scripts/get_collection_metadata.template.cdc'), {
      imports,
      contractName,
      contractAddress,
    });
  }
}
