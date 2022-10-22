/* eslint-disable @typescript-eslint/no-var-requires */

import { registerPartial } from '.';
import { ContractImports } from '../config';
import TemplateGenerator from './TemplateGenerator';

// Register the royalties partials
registerPartial('royaltiesFields', require('../../../cadence/nfts/common/partials/royalties-fields.partial.cdc'));
registerPartial('royaltiesAdmin', require('../../../cadence/nfts/common/partials/royalties-admin.partial.cdc'));
registerPartial('royaltiesInit', require('../../../cadence/nfts/common/partials/royalties-init.partial.cdc'));

// Register the collection metadata partials
registerPartial(
  'collectionMetadataFields',
  require('../../../cadence/nfts/common/partials/collection-metadata-fields.partial.cdc'),
);
registerPartial(
  'collectionMetadataAdmin',
  require('../../../cadence/nfts/common/partials/collection-metadata-admin.partial.cdc'),
);
registerPartial(
  'collectionMetadataInit',
  require('../../../cadence/nfts/common/partials/collection-metadata-init.partial.cdc'),
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

  static setRoyalties({
    imports,
    contractName,
    contractAddress,
  }: {
    imports: ContractImports;
    contractName: string;
    contractAddress: string;
  }): string {
    return this.generate(require('../../../cadence/nfts/common/transactions/set_royalties.template.cdc'), {
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

  static setCollectionMetadata({
    imports,
    contractName,
    contractAddress,
  }: {
    imports: ContractImports;
    contractName: string;
    contractAddress: string;
  }): string {
    return this.generate(require('../../../cadence/nfts/common/transactions/set_collection_metadata.template.cdc'), {
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
