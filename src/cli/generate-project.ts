import * as fs from "fs-extra";
import * as path from "path";
import * as Handlebars from "handlebars";
import { metadata } from "../lib";
import OnChainGenerator from "../lib/generators/OnChainGenerator";

export default async function generateProject(
  projectName: string,
  contractName: string,
  schema: metadata.Schema,
) {

  await createScaffold(projectName);
  
  const contracts = {
    NonFungibleToken: `"./NonFungibleToken.cdc"`,
    MetadataViews: `"./MetadataViews.cdc"`,
    FungibleToken: `"./FungibleToken.cdc"`,
    FlowToken: `"./FlowToken.cdc"`
  };

  const contractAddress = `"../contracts/${contractName}.cdc"`;

  const contract = await OnChainGenerator.contract({ 
    contracts,
    contractName,
    schema,
    saveAdminResourceToContractAccount: true
  });

  await writeFile(
    path.resolve(projectName, `cadence/contracts/${contractName}.cdc`),
    contract
  );

  const mintTransaction = await OnChainGenerator.mint({
    contracts: {
      ...contracts,
      // TODO: this is a workaround to fix the relative import in this file.
      // Find a better solution.
      NonFungibleToken: `"../contracts/NonFungibleToken.cdc"`
    },
    contractName,
    contractAddress,
    schema
  });

  await writeFile(
    path.resolve(projectName, "cadence/transactions/mint.cdc"),
    mintTransaction
  );

  await createGetNFTScript(projectName, contractName);

  await createCSVFile(
    projectName, 
    contractName,
    { schema }
  )

  await createFreshConfig(
    projectName, 
    contractName, 
    { schema }
  );

  await createFlowConfig(projectName, contractName);
  await createFlowTestnetConfig(projectName, contractName);
  await createFlowMainnetConfig(projectName, contractName);

  await createReadme(projectName, contractName);
}

async function createScaffold(dir: string) {
  await fs.copy(
    path.resolve(__dirname, "templates/assets"),
    path.resolve(dir, "assets")
  );

  await fs.copy(
    path.resolve(__dirname, "templates/cadence/contracts/NonFungibleToken.cdc"),
    path.resolve(dir, "cadence/contracts/NonFungibleToken.cdc")
  );

  await fs.copy(
    path.resolve(__dirname, "templates/cadence/contracts/MetadataViews.cdc"),
    path.resolve(dir, "cadence/contracts/MetadataViews.cdc")
  );

  await fs.copy(
    path.resolve(__dirname, "templates/cadence/contracts/FungibleToken.cdc"),
    path.resolve(dir, "cadence/contracts/FungibleToken.cdc")
  );

  await fs.copy(
    path.resolve(__dirname, "templates/cadence/contracts/FlowToken.cdc"),
    path.resolve(dir, "cadence/contracts/FlowToken.cdc")
  );

  await fs.copy(
    path.resolve(__dirname, "templates/env.template"),
    path.resolve(dir, ".env")
  );

  await fs.copy(
    path.resolve(__dirname, "templates/gitignore"),
    path.resolve(dir, ".gitignore")
  );
}

const createGetNFTScript = template(
  "templates/cadence/scripts/get_nft.cdc",
  "cadence/scripts/get_nft.cdc"
);

const createCSVFile = template("templates/nfts.csv", "nfts.csv");

const createFreshConfig = template("templates/fresh.config.js", "fresh.config.js");

const createFlowConfig = template("templates/flow.json", "flow.json");

const createFlowTestnetConfig = template(
  "templates/flow.testnet.json",
  "flow.testnet.json"
);

const createFlowMainnetConfig = template(
  "templates/flow.mainnet.json",
  "flow.mainnet.json"
);

const createReadme = template("templates/README.md", "README.md");

function template(src: string, out: string) {
  return async (dir: string, name: string, fields = {}) => {
    const templateSource = await fs.readFile(
      path.resolve(__dirname, src),
      "utf8"
    );

    const template = Handlebars.compile(templateSource);

    const result = template({ name, ...fields });

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

    await fs.writeFile(filePath, data, "utf8");
  } catch (err: any) {
    throw new Error(err);
  }
}
