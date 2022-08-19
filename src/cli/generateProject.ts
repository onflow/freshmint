import * as fs from 'fs-extra';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import { ContractImports, OnChainGenerator, EditionGenerator } from '../lib';
import { Config, ContractType } from './config';

export async function generateProject(dir: string, config: Config) {
  await createScaffold(dir);

  const imports = {
    NonFungibleToken: `"./NonFungibleToken.cdc"`,
    MetadataViews: `"./MetadataViews.cdc"`,
    FungibleToken: `"./FungibleToken.cdc"`,
    FlowToken: `"./FlowToken.cdc"`,
  };

  switch (config.contract.type) {
    case ContractType.Standard:
      generateStandardProject(dir, config, imports);
      break;
    case ContractType.Edition:
      generateEditionProject(dir, config, imports);
      break;
  }

  config.save(dir);

  await createGetNFTScript(dir, config.contract.name);

  await createCSVFile(dir, config.contract.name, { schema: config.contract.schema });

  await createFlowConfig(dir, config.contract.name);
  await createFlowTestnetConfig(dir, config.contract.name);
  await createFlowMainnetConfig(dir, config.contract.name);

  await createReadme(dir, config.contract.name);
}

async function generateStandardProject(dir: string, config: Config, imports: ContractImports) {
  const contractAddress = `"../contracts/${config.contract.name}.cdc"`;

  const contract = OnChainGenerator.contract({
    contracts: imports,
    contractName: config.contract.name,
    schema: config.contract.schema,
    saveAdminResourceToContractAccount: true,
  });

  await writeFile(path.resolve(dir, `cadence/contracts/${config.contract.name}.cdc`), contract);

  const mintTransaction = OnChainGenerator.mint({
    contracts: {
      ...imports,
      // TODO: this is a workaround to fix the relative import in this file.
      // Find a better solution.
      NonFungibleToken: `"../contracts/NonFungibleToken.cdc"`,
    },
    contractName: config.contract.name,
    contractAddress,
    schema: config.contract.schema,
  });

  await writeFile(path.resolve(dir, 'cadence/transactions/mint.cdc'), mintTransaction);
}

async function generateEditionProject(dir: string, config: Config, imports: ContractImports) {
  const contractAddress = `"../contracts/${config.contract.name}.cdc"`;

  const contract = EditionGenerator.contract({
    contracts: imports,
    contractName: config.contract.name,
    schema: config.contract.schema,
    saveAdminResourceToContractAccount: true,
  });

  await writeFile(path.resolve(dir, `cadence/contracts/${config.contract.name}.cdc`), contract);

  const createEditionTransaction = EditionGenerator.createEditions({
    contracts: {
      ...imports,
      // TODO: this is a workaround to fix the relative import in this file.
      // Find a better solution.
      NonFungibleToken: `"../contracts/NonFungibleToken.cdc"`,
    },
    contractName: config.contract.name,
    contractAddress,
    schema: config.contract.schema,
  });

  await writeFile(path.resolve(dir, 'cadence/transactions/createEdition.cdc'), createEditionTransaction);

  const mintTransaction = EditionGenerator.mint({
    contracts: {
      ...imports,
      // TODO: this is a workaround to fix the relative import in this file.
      // Find a better solution.
      NonFungibleToken: `"../contracts/NonFungibleToken.cdc"`,
    },
    contractName: config.contract.name,
    contractAddress,
  });

  await writeFile(path.resolve(dir, 'cadence/transactions/mint.cdc'), mintTransaction);
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

const createGetNFTScript = template('templates/cadence/scripts/get_nft.cdc', 'cadence/scripts/get_nft.cdc');

const createCSVFile = template('templates/nfts.csv', 'nfts.csv');

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
