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

// Register the collection partial
registerPartial('collection', require('../../../cadence/nfts/common/partials/collection.partial.cdc'));

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

  static getDuplicateNFTs({
    contractName,
    contractAddress,
  }: {
    contractName: string;
    contractAddress: string;
  }): string {
    return this.generate(require('../../../cadence/nfts/common/scripts/get_duplicate_nfts.template.cdc'), {
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

  static setupCollection({
    imports,
    contractName,
    contractAddress,
  }: {
    imports: ContractImports;
    contractName: string;
    contractAddress: string;
  }): string {
    return this.generate(require('../../../cadence/nfts/common/transactions/setup_collection.template.cdc'), {
      imports,
      contractName,
      contractAddress,
    });
  }

  static transferNFT({
    imports,
    contractName,
    contractAddress,
  }: {
    imports: ContractImports;
    contractName: string;
    contractAddress: string;
  }): string {
    return this.generate(require('../../../cadence/nfts/common/transactions/transfer_nft.template.cdc'), {
      imports,
      contractName,
      contractAddress,
    });
  }

  static transferNFTs({
    imports,
    contractName,
    contractAddress,
  }: {
    imports: ContractImports;
    contractName: string;
    contractAddress: string;
  }): string {
    return this.generate(require('../../../cadence/nfts/common/transactions/transfer_nfts.template.cdc'), {
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

  static transferQueueToCollection({
    imports,
    contractName,
    contractAddress,
  }: {
    imports: ContractImports;
    contractName: string;
    contractAddress: string;
  }): string {
    return this.generate(
      require('../../../cadence/nfts/common/transactions/transfer_queue_to_collection.template.cdc'),
      {
        imports,
        contractName,
        contractAddress,
      },
    );
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
