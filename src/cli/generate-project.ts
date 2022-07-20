import * as fs from "fs-extra";
import * as path from "path";
import * as Handlebars from "handlebars";
import { writeFile } from "./helpers";
import generateWebAssets from "./generate-web";
import { Field } from "./metadata/fields";

export default async function generateProject(
  projectName: string,
  contractName: string,
  onChainMetadata: boolean,
  fields: Field[]
) {

  await createScaffold(projectName);

  const createContract = template(
    "templates/cadence/contracts/NFT.cdc",
    `cadence/contracts/${contractName}.cdc`
  );  

  await createContract(
    projectName,
    contractName, 
    { fields, onChainMetadata }
  );

  await createSetupTransaction(projectName, contractName);
  await createMintTransaction(projectName, contractName, { fields });
  await createMintWithClaimTransaction(projectName, contractName, { fields });

  await createClaimQueueDropTransaction(projectName, contractName);
  await createClaimAirDropTransaction(projectName, contractName);

  await createStartDropTransaction(projectName, contractName);
  await createRemoveDropTransaction(projectName, contractName);

  await createGetDropScript(projectName, contractName);
    

  if (onChainMetadata) {
    await createOnChainGetNFTScript(projectName, contractName);

    await createOnChainCSVFile(
      projectName, 
      contractName,
      { fields }
    )
  } else {
    await createOffChainGetNFTScript(projectName, contractName);
    await createOffChainCSVFile(projectName, contractName)
  }

  await createFreshConfig(
    projectName, 
    contractName, 
    { fields, onChainMetadata }
  );

  await createFlowConfig(projectName, contractName);
  await createFlowTestnetConfig(projectName, contractName);
  await createFlowMainnetConfig(projectName, contractName);

  await createWebAssets(projectName, contractName);
  await createReadme(projectName, contractName);
}

async function createScaffold(dir: string) {
  await fs.copy(
    path.resolve(__dirname, "templates/assets"),
    path.resolve(dir, "assets")
  );

  await fs.copy(
    path.resolve(__dirname, "templates/ipfs-data"),
    path.resolve(dir, "ipfs-data")
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
    path.resolve(__dirname, "templates/cadence/contracts/NFTQueueDrop.cdc"),
    path.resolve(dir, "cadence/contracts/NFTQueueDrop.cdc")
  );

  await fs.copy(
    path.resolve(__dirname, "templates/cadence/contracts/NFTAirDrop.cdc"),
    path.resolve(dir, "cadence/contracts/NFTAirDrop.cdc")
  );

  await fs.copy(
    path.resolve(
      __dirname,
      "templates/cadence/transactions/setup_flowtoken.cdc"
    ),
    path.resolve(dir, "cadence/transactions/setup_flowtoken.cdc")
  );

  await fs.copy(
    path.resolve(__dirname, "templates/cadence/transactions/fund_account.cdc"),
    path.resolve(dir, "cadence/transactions/fund_account.cdc")
  );

  await fs.copy(
    path.resolve(__dirname, "templates/env.template"),
    path.resolve(dir, ".env")
  );

  await fs.copy(
    path.resolve(__dirname, "templates/docker-compose.yml"),
    path.resolve(dir, "docker-compose.yml")
  );

  await fs.copy(
    path.resolve(__dirname, "templates/cleanup.sh"),
    path.resolve(dir, "cleanup.sh")
  );

  await fs.copy(
    path.resolve(__dirname, "templates/gitignore"),
    path.resolve(dir, ".gitignore")
  );
}

const createSetupTransaction = template(
  "templates/cadence/transactions/setup_account.cdc",
  "cadence/transactions/setup_account.cdc"
);

const createMintTransaction = template(
  "templates/cadence/transactions/mint.cdc",
  "cadence/transactions/mint.cdc"
);

const createMintWithClaimTransaction = template(
  "templates/cadence/transactions/airdrop/mint.cdc",
  "cadence/transactions/airdrop/mint.cdc"
);

const createClaimQueueDropTransaction = template(
  "templates/cadence/transactions/queue/claim_nft.cdc",
  "cadence/transactions/queue/claim_nft.cdc"
);

const createClaimAirDropTransaction = template(
  "templates/cadence/transactions/airdrop/claim_nft.cdc",
  "cadence/transactions/airdrop/claim_nft.cdc"
);

const createStartDropTransaction = template(
  "templates/cadence/transactions/queue/start_drop.cdc",
  "cadence/transactions/queue/start_drop.cdc"
);

const createRemoveDropTransaction = template(
  "templates/cadence/transactions/queue/remove_drop.cdc",
  "cadence/transactions/queue/remove_drop.cdc"
);

const createOnChainGetNFTScript = template(
  "templates/cadence/scripts/get_nft.on-chain.cdc",
  "cadence/scripts/get_nft.cdc"
);

const createOffChainGetNFTScript = template(
  "templates/cadence/scripts/get_nft.off-chain.cdc",
  "cadence/scripts/get_nft.cdc"
);

const createGetDropScript = template(
  "templates/cadence/scripts/queue/get_drop.cdc",
  "cadence/scripts/queue/get_drop.cdc"
);

const createOnChainCSVFile = template("templates/nfts.on-chain.csv", "nfts.csv");
const createOffChainCSVFile = template("templates/nfts.off-chain.csv", "nfts.csv");

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

async function createWebAssets(dir: string, name: string) {
  await generateWebAssets(dir, name);
}

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

module.exports = generateProject;
