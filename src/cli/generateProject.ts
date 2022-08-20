import * as fs from 'fs-extra';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import { ContractImports, StandardNFTGenerator, EditionNFTGenerator } from '../lib';
import { Config, ContractType } from './config';
import { NFTAirDropGenerator } from '../lib/generators/NFTAirDropGenerator';

export async function generateProject(dir: string, config: Config) {
  await createScaffold(dir);

  config.save(dir);

  await generateProjectCadence(dir, config);

  await createGetNFTScript(dir, config.contract.name);

  await createFlowConfig(dir, config.contract.name);
  await createFlowTestnetConfig(dir, config.contract.name);
  await createFlowMainnetConfig(dir, config.contract.name);

  await createReadme(dir, config.contract.name, { nftDataPath: config.nftDataPath });
}

export async function generateProjectCadence(dir: string, config: Config) {
  const imports = {
    NonFungibleToken: `"./NonFungibleToken.cdc"`,
    MetadataViews: `"./MetadataViews.cdc"`,
    FungibleToken: `"./FungibleToken.cdc"`,
    FlowToken: `"./FlowToken.cdc"`,
    NFTAirDrop: `"./NFTAirDrop.cdc"`
  };

  switch (config.contract.type) {
    case ContractType.Standard:
      await generateStandardProject(dir, config, imports);
      break;
    case ContractType.Edition:
      await generateEditionProject(dir, config, imports);
      break;
  }

  await writeFile(
    path.resolve(dir, `cadence/contracts/NFTAirDrop.cdc`), 
    NFTAirDropGenerator.contract({ contracts: imports })
  );
}

async function generateStandardProject(dir: string, config: Config, imports: ContractImports) {
  const contractAddress = `"../contracts/${config.contract.name}.cdc"`;

  const contract = StandardNFTGenerator.contract({
    contracts: imports,
    contractName: config.contract.name,
    schema: config.contract.schema,
    saveAdminResourceToContractAccount: true,
  });

  await writeFile(path.resolve(dir, `cadence/contracts/${config.contract.name}.cdc`), contract);

  const contracts = {
    ...imports,
    // TODO: this is a workaround to fix the relative import in this file.
    // Find a better solution.
    NonFungibleToken: `"../contracts/NonFungibleToken.cdc"`,
    NFTAirDrop: `"../contracts/NFTAirDrop.cdc"`,
  };

  const mintTransaction = StandardNFTGenerator.mint({
    contracts,
    contractName: config.contract.name,
    contractAddress,
    schema: config.contract.schema,
  });


  await writeFile(path.resolve(dir, 'cadence/transactions/mint.cdc'), mintTransaction);

  const mintWithClaimKeyTransaction = StandardNFTGenerator.mintWithClaimKey({
    contracts,
    contractName: config.contract.name,
    contractAddress,
    schema: config.contract.schema
  });

  await writeFile(path.resolve(dir, 'cadence/transactions/mint_with_claim_key.cdc'), mintWithClaimKeyTransaction);

  await createNFTsCSVFile(dir, config.contract.name, { schema: config.contract.schema });
}

async function generateEditionProject(dir: string, config: Config, imports: ContractImports) {
  const contractAddress = `"../contracts/${config.contract.name}.cdc"`;

  const contract = EditionNFTGenerator.contract({
    contracts: imports,
    contractName: config.contract.name,
    schema: config.contract.schema,
    saveAdminResourceToContractAccount: true,
  });

  await writeFile(path.resolve(dir, `cadence/contracts/${config.contract.name}.cdc`), contract);

  const contracts = {
    ...imports,
    // TODO: this is a workaround to fix the relative import in this file.
    // Find a better solution.
    NonFungibleToken: `"../contracts/NonFungibleToken.cdc"`,
    NFTAirDrop: `"../contracts/NFTAirDrop.cdc"`,
  }

  const createEditionTransaction = EditionNFTGenerator.createEditions({
    contracts,
    contractName: config.contract.name,
    contractAddress,
    schema: config.contract.schema,
  });

  console.log(config.contract.schema);
  console.log(createEditionTransaction);

  console.log(path.resolve(dir, 'cadence/transactions/createEdition.cdc'))

  await writeFile(path.resolve(dir, 'cadence/transactions/createEdition.cdc'), createEditionTransaction);

  const mintTransaction = EditionNFTGenerator.mint({
    contracts,
    contractName: config.contract.name,
    contractAddress,
  });

  await writeFile(path.resolve(dir, 'cadence/transactions/mint.cdc'), mintTransaction);

  const mintWithClaimKeyTransaction = EditionNFTGenerator.mintWithClaimKey({
    contracts,
    contractName: config.contract.name,
    contractAddress,
  });

  await writeFile(path.resolve(dir, 'cadence/transactions/mint_with_claim_key.cdc'), mintWithClaimKeyTransaction);

  await createEditionsCSVFile(dir, config.contract.name, { schema: config.contract.schema });
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

    console.log("WRITING", filePath, data)

    await fs.writeFile(filePath, data, 'utf8');
  } catch (err: any) {
    throw new Error(err);
  }
}
