import * as fs from 'fs-extra';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import {
  ContractImports,
  StandardNFTGenerator,
  EditionNFTGenerator,
  FreshmintMetadataViewsGenerator,
  FreshmintClaimSaleV2Generator,
  FreshmintQueueGenerator,
  CommonNFTGenerator,
  LockBoxGenerator,
} from '@freshmint/core';

import { ContractConfig, ContractType } from '../config';

export async function generateProject(
  dir: string,
  name: string,
  description: string,
  contract: ContractConfig,
  nftDataPath: string,
) {
  await createScaffold(dir);

  await generateCadence(dir, contract);

  await createFlowConfig(dir, { contractName: contract.name });
  await createFlowTestnetConfig(dir, { contractName: contract.name });
  await createFlowMainnetConfig(dir, { contractName: contract.name });

  await generateWeb(dir, name, description);

  await createFreshmintYaml(dir, { name, contract });
  await createReadme(dir, { name, nftDataPath });
}

const contracts = {
  NonFungibleToken: './NonFungibleToken.cdc',
  MetadataViews: './MetadataViews.cdc',
  FungibleToken: './FungibleToken.cdc',
  FlowToken: './FlowToken.cdc',
  FreshmintLockBox: './FreshmintLockBox.cdc',
  FreshmintMetadataViews: './FreshmintMetadataViews.cdc',
  FreshmintClaimSaleV2: './FreshmintClaimSaleV2.cdc',
  FreshmintQueue: './FreshmintQueue.cdc',
};

const imports = prepareImports(contracts);
const shiftedImports = prepareImports(contracts, '../contracts');

export async function generateCadence(dir: string, contract: ContractConfig, includeCSVFile = true) {
  switch (contract.type) {
    case ContractType.Standard:
      await generateStandardProject(dir, contract, includeCSVFile);
      break;
    case ContractType.Edition:
      await generateEditionProject(dir, contract, includeCSVFile);
      break;
  }

  await generateFreshmintMetadataViews(dir, imports);
  await generateFreshmintLockBox(dir);
  await generateFreshmintQueue(dir);
  await generateFreshmintClaimSale(dir, contract);
}

async function generateStandardProject(dir: string, contract: ContractConfig, includeCSVFile = true) {
  const contractAddress = `"../contracts/${contract.name}.cdc"`;

  const contractSource = StandardNFTGenerator.contract({
    imports,
    contractName: contract.name,
    schema: contract.schema,
    saveAdminResourceToContractAccount: true,
  });

  await writeFile(path.resolve(dir, `cadence/contracts/${contract.name}.cdc`), contractSource);

  const deployTransaction = StandardNFTGenerator.deployToExistingAccount({ imports: shiftedImports });

  await writeFile(path.resolve(dir, 'cadence/transactions/deploy.cdc'), deployTransaction);

  const mintTransaction = StandardNFTGenerator.mint({
    imports: shiftedImports,
    contractName: contract.name,
    contractAddress,
    schema: contract.schema,
  });

  await writeFile(path.resolve(dir, 'cadence/transactions/mint.cdc'), mintTransaction);

  const mintWithClaimKeyTransaction = StandardNFTGenerator.mintWithClaimKey({
    imports: shiftedImports,
    contractName: contract.name,
    contractAddress,
    schema: contract.schema,
  });

  await writeFile(path.resolve(dir, 'cadence/transactions/mint_with_claim_key.cdc'), mintWithClaimKeyTransaction);

  if (includeCSVFile) {
    await createNFTsCSVFile(dir);
  }

  await writeFile(
    path.resolve(dir, `cadence/scripts/get_nft.cdc`),
    CommonNFTGenerator.getNFT({ imports: shiftedImports, contractName: contract.name, contractAddress }),
  );

  await writeFile(
    path.resolve(dir, `cadence/scripts/get_nfts.cdc`),
    CommonNFTGenerator.getNFTs({ imports: shiftedImports, contractName: contract.name, contractAddress }),
  );

  await writeFile(
    path.resolve(dir, `cadence/scripts/get_duplicate_nfts.cdc`),
    CommonNFTGenerator.getDuplicateNFTs({ contractName: contract.name, contractAddress }),
  );
}

async function generateEditionProject(dir: string, contract: ContractConfig, includeCSVFile = true) {
  const contractAddress = `"../contracts/${contract.name}.cdc"`;

  const contractSource = EditionNFTGenerator.contract({
    imports,
    contractName: contract.name,
    schema: contract.schema,
    saveAdminResourceToContractAccount: true,
  });

  await writeFile(path.resolve(dir, `cadence/contracts/${contract.name}.cdc`), contractSource);

  const deployTransaction = EditionNFTGenerator.deployToExistingAccount({ imports: shiftedImports });

  await writeFile(path.resolve(dir, 'cadence/transactions/deploy.cdc'), deployTransaction);

  const createEditionsTransaction = EditionNFTGenerator.createEditions({
    imports: shiftedImports,
    contractName: contract.name,
    contractAddress,
    schema: contract.schema,
  });

  await writeFile(path.resolve(dir, 'cadence/transactions/create_editions.cdc'), createEditionsTransaction);

  const mintTransaction = EditionNFTGenerator.mint({
    imports: shiftedImports,
    contractName: contract.name,
    contractAddress,
  });

  await writeFile(path.resolve(dir, 'cadence/transactions/mint.cdc'), mintTransaction);

  const mintWithClaimKeyTransaction = EditionNFTGenerator.mintWithClaimKey({
    imports: shiftedImports,
    contractName: contract.name,
    contractAddress,
  });

  await writeFile(path.resolve(dir, 'cadence/transactions/mint_with_claim_key.cdc'), mintWithClaimKeyTransaction);

  if (includeCSVFile) {
    await createEditionsCSVFile(dir);
  }

  await writeFile(
    path.resolve(dir, `cadence/scripts/get_editions_by_mint_id.cdc`),
    EditionNFTGenerator.getEditionsByMintId({ contractName: contract.name, contractAddress }),
  );

  await writeFile(
    path.resolve(dir, `cadence/scripts/get_nft.cdc`),
    CommonNFTGenerator.getNFT({ imports: shiftedImports, contractName: contract.name, contractAddress }),
  );

  await writeFile(
    path.resolve(dir, `cadence/scripts/get_nfts.cdc`),
    CommonNFTGenerator.getNFTs({ imports: shiftedImports, contractName: contract.name, contractAddress }),
  );
}

async function generateFreshmintMetadataViews(dir: string, imports: ContractImports) {
  await writeFile(
    path.resolve(dir, `cadence/contracts/FreshmintMetadataViews.cdc`),
    FreshmintMetadataViewsGenerator.contract({ imports }),
  );
}

async function generateFreshmintLockBox(dir: string) {
  await writeFile(path.resolve(dir, `cadence/contracts/FreshmintLockBox.cdc`), LockBoxGenerator.contract({ imports }));
}

async function generateFreshmintQueue(dir: string) {
  await writeFile(
    path.resolve(dir, `cadence/contracts/FreshmintQueue.cdc`),
    FreshmintQueueGenerator.contract({ imports }),
  );
}

async function generateFreshmintClaimSale(dir: string, contract: ContractConfig) {
  await writeFile(
    path.resolve(dir, `cadence/contracts/FreshmintClaimSaleV2.cdc`),
    FreshmintClaimSaleV2Generator.contract({ imports }),
  );

  const contractAddress = `"../contracts/${contract.name}.cdc"`;

  await writeFile(
    path.resolve(dir, `cadence/transactions/start_drop.cdc`),
    FreshmintClaimSaleV2Generator.startSale({
      contractName: contract.name,
      contractAddress,
      imports: shiftedImports,
    }),
  );

  await writeFile(
    path.resolve(dir, `cadence/transactions/stop_drop.cdc`),
    FreshmintClaimSaleV2Generator.stopSale({
      contractName: contract.name,
      contractAddress,
      imports: shiftedImports,
    }),
  );

  await writeFile(
    path.resolve(dir, `cadence/transactions/claim_nft.cdc`),
    FreshmintClaimSaleV2Generator.claimNFT({
      contractName: contract.name,
      contractAddress,
      imports: shiftedImports,
    }),
  );

  await writeFile(
    path.resolve(dir, `cadence/scripts/get_drop.cdc`),
    FreshmintClaimSaleV2Generator.getClaimSale({
      imports: shiftedImports,
    }),
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

const createNextConfig = template('templates/web/next.config.js', 'next.config.js');

export async function generateWeb(dir: string, name: string, description: string) {
  const webDir = path.resolve(dir, 'web');

  await fs.copy(path.resolve(__dirname, 'templates/web'), webDir);
  await fs.copy(path.resolve(__dirname, 'templates/web/eslintrc.json'), path.resolve(webDir, '.eslintrc.json'));
  await fs.copy(path.resolve(__dirname, 'templates/web/gitignore'), path.resolve(webDir, '.gitignore'));

  await createNextConfig(webDir, { name, description });
}

const createNFTsCSVFile = template('templates/nfts.csv', 'nfts.csv');
const createEditionsCSVFile = template('templates/editions.csv', 'editions.csv');

const createFlowConfig = template('templates/flow.json', 'flow.json');

const createFlowTestnetConfig = template('templates/flow.testnet.json', 'flow.testnet.json');

const createFlowMainnetConfig = template('templates/flow.mainnet.json', 'flow.mainnet.json');

const createFreshmintYaml = template('templates/freshmint.yaml', 'freshmint.yaml');

const createReadme = template('templates/README.md', 'README.md');

function template(src: string, out: string) {
  return async (dir: string, context = {}) => {
    const templateSource = await fs.readFile(path.resolve(__dirname, src), 'utf8');

    const template = Handlebars.compile(templateSource);

    const result = template(context, {
      allowedProtoMethods: {
        type: true,
      },
    });

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

function prepareImports(imports: ContractImports, basePath?: string): ContractImports {
  const preparedImports: ContractImports = {};

  for (const key in imports) {
    let importPath = imports[key];

    // If base path is provided, shift import path by joining with the base path
    if (basePath) {
      importPath = shiftImport(importPath, basePath);
    }

    // Escape the import path as a Cadence-safe string
    importPath = escapeImport(importPath);

    preparedImports[key] = importPath;
  }

  return preparedImports;
}

function shiftImport(importPath: string, basePath: string): string {
  return path.join(basePath, importPath);
}

function escapeImport(importPath: string): string {
  return `"${importPath}"`;
}
