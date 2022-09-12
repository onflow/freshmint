import * as fs from 'fs-extra';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import {
  ContractImports,
  StandardNFTGenerator,
  EditionNFTGenerator,
  NFTLockBoxGenerator,
  FreshmintMetadataViewsGenerator,
  CommonNFTGenerator,
  ClaimSaleGenerator,
} from '../lib';
import { ContractConfig, ContractType } from './config';

export async function generateProject(dir: string, contract: ContractConfig, nftDataPath: string) {
  await createScaffold(dir);

  await generateProjectCadence(dir, contract);

  await createFlowConfig(dir, contract.name);
  await createFlowTestnetConfig(dir, contract.name);
  await createFlowMainnetConfig(dir, contract.name);

  await createReadme(dir, contract.name, { nftDataPath });
}

export async function generateProjectCadence(dir: string, contract: ContractConfig, includeCSVFile = true) {
  const imports = {
    NonFungibleToken: `"./NonFungibleToken.cdc"`,
    MetadataViews: `"./MetadataViews.cdc"`,
    FreshmintMetadataViews: `"./FreshmintMetadataViews.cdc"`,
    FungibleToken: `"./FungibleToken.cdc"`,
    FlowToken: `"./FlowToken.cdc"`,
    NFTLockBox: `"./NFTLockBox.cdc"`,
  };

  switch (contract.type) {
    case ContractType.Standard:
      await generateStandardProject(dir, contract, imports, includeCSVFile);
      break;
    case ContractType.Edition:
      await generateEditionProject(dir, contract, imports, includeCSVFile);
      break;
  }

  await writeFile(path.resolve(dir, `cadence/contracts/NFTLockBox.cdc`), NFTLockBoxGenerator.contract({ imports }));
  await writeFile(
    path.resolve(dir, `cadence/contracts/FreshmintClaimSale.cdc`),
    ClaimSaleGenerator.contract({ imports }),
  );

  await writeFile(
    path.resolve(dir, `cadence/contracts/FreshmintMetadataViews.cdc`),
    FreshmintMetadataViewsGenerator.contract(),
  );
}

async function generateStandardProject(
  dir: string,
  contract: ContractConfig,
  imports: ContractImports,
  includeCSVFile = true,
) {
  const contractAddress = `"../contracts/${contract.name}.cdc"`;

  const contractSource = StandardNFTGenerator.contract({
    imports,
    contractName: contract.name,
    schema: contract.schema,
    saveAdminResourceToContractAccount: true,
  });

  await writeFile(path.resolve(dir, `cadence/contracts/${contract.name}.cdc`), contractSource);

  const adjustedImports = {
    ...imports,
    // TODO: this is a workaround to fix the relative import in this file.
    // Find a better solution.
    NonFungibleToken: `"../contracts/NonFungibleToken.cdc"`,
    NFTLockBox: `"../contracts/NFTLockBox.cdc"`,
    MetadataViews: `"../contracts/MetadataViews.cdc"`,
    FreshmintMetadataViews: `"../contracts/FreshmintMetadataViews.cdc"`,
  };

  const mintTransaction = StandardNFTGenerator.mint({
    imports: adjustedImports,
    contractName: contract.name,
    contractAddress,
    schema: contract.schema,
  });

  await writeFile(path.resolve(dir, 'cadence/transactions/mint.cdc'), mintTransaction);

  const mintWithClaimKeyTransaction = StandardNFTGenerator.mintWithClaimKey({
    imports: adjustedImports,
    contractName: contract.name,
    contractAddress,
    schema: contract.schema,
  });

  await writeFile(path.resolve(dir, 'cadence/transactions/mint_with_claim_key.cdc'), mintWithClaimKeyTransaction);

  if (includeCSVFile) {
    await createNFTsCSVFile(dir, contract.name, { fields: contract.schema.fields });
  }

  await writeFile(
    path.resolve(dir, `cadence/scripts/get_nft.cdc`),
    CommonNFTGenerator.getNFT({ imports: adjustedImports, contractName: contract.name, contractAddress }),
  );
}

async function generateEditionProject(
  dir: string,
  contract: ContractConfig,
  imports: ContractImports,
  includeCSVFile = true,
) {
  const contractAddress = `"../contracts/${contract.name}.cdc"`;

  const contractSource = EditionNFTGenerator.contract({
    imports,
    contractName: contract.name,
    schema: contract.schema,
    saveAdminResourceToContractAccount: true,
  });

  await writeFile(path.resolve(dir, `cadence/contracts/${contract.name}.cdc`), contractSource);

  const adjustedImports = {
    ...imports,
    // TODO: this is a workaround to fix the relative import in this file.
    // Find a better solution.
    NonFungibleToken: `"../contracts/NonFungibleToken.cdc"`,
    NFTLockBox: `"../contracts/NFTLockBox.cdc"`,
    MetadataViews: `"../contracts/MetadataViews.cdc"`,
    FreshmintMetadataViews: `"../contracts/FreshmintMetadataViews.cdc"`,
  };

  const createEditionsTransaction = EditionNFTGenerator.createEditions({
    imports: adjustedImports,
    contractName: contract.name,
    contractAddress,
    schema: contract.schema,
  });

  await writeFile(path.resolve(dir, 'cadence/transactions/create_editions.cdc'), createEditionsTransaction);

  const mintTransaction = EditionNFTGenerator.mint({
    imports: adjustedImports,
    contractName: contract.name,
    contractAddress,
  });

  await writeFile(path.resolve(dir, 'cadence/transactions/mint.cdc'), mintTransaction);

  const mintWithClaimKeyTransaction = EditionNFTGenerator.mintWithClaimKey({
    imports: adjustedImports,
    contractName: contract.name,
    contractAddress,
  });

  await writeFile(path.resolve(dir, 'cadence/transactions/mint_with_claim_key.cdc'), mintWithClaimKeyTransaction);

  if (includeCSVFile) {
    await createEditionsCSVFile(dir, contract.name, { fields: contract.schema.fields });
  }

  await writeFile(
    path.resolve(dir, `cadence/scripts/get_nft.cdc`),
    CommonNFTGenerator.getNFT({ imports: adjustedImports, contractName: contract.name, contractAddress }),
  );
}

async function createScaffold(dir: string) {
  await fs.copy(path.resolve(__dirname, 'templates/assets'), path.resolve(dir, 'assets'));

  await fs.copy(
    path.resolve(__dirname, 'templates/cadence/contracts/NonFungibleToken.cdc'),
    path.resolve(dir, 'cadence/contracts/NonFungibleToken.cdc'),
  );

  await fs.copy(
    path.resolve(__dirname, 'templates/cadence/contracts/MetadataViews.cdc'),
    path.resolve(dir, 'cadence/contracts/MetadataViews.cdc'),
  );

  await fs.copy(
    path.resolve(__dirname, 'templates/cadence/contracts/FungibleToken.cdc'),
    path.resolve(dir, 'cadence/contracts/FungibleToken.cdc'),
  );

  await fs.copy(
    path.resolve(__dirname, 'templates/cadence/contracts/FlowToken.cdc'),
    path.resolve(dir, 'cadence/contracts/FlowToken.cdc'),
  );

  await fs.copy(path.resolve(__dirname, 'templates/env.template'), path.resolve(dir, '.env'));

  await fs.copy(path.resolve(__dirname, 'templates/gitignore'), path.resolve(dir, '.gitignore'));
}

const createNFTsCSVFile = template('templates/nfts.csv', 'nfts.csv');
const createEditionsCSVFile = template('templates/editions.csv', 'editions.csv');

const createFlowConfig = template('templates/flow.json', 'flow.json');

const createFlowTestnetConfig = template('templates/flow.testnet.json', 'flow.testnet.json');

const createFlowMainnetConfig = template('templates/flow.mainnet.json', 'flow.mainnet.json');

const createReadme = template('templates/README.md', 'README.md');

function template(src: string, out: string) {
  return async (dir: string, name: string, fields = {}) => {
    const templateSource = await fs.readFile(path.resolve(__dirname, src), 'utf8');

    const template = Handlebars.compile(templateSource);

    const result = template(
      { name, ...fields },
      {
        allowedProtoMethods: {
          type: true,
        },
      },
    );

    await writeFile(path.resolve(dir, out), result);
  };
}

async function writeFile(filePath: string, data: any) {
  try {
    const dirname = path.dirname(filePath);

    const exists = await fs.pathExists(dirname);
    if (!exists) {
      await fs.mkdir(dirname, { recursive: true });
    }

    await fs.writeFile(filePath, data, 'utf8');
  } catch (err: any) {
    throw new Error(err);
  }
}
