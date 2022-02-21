const fs = require("fs-extra");
const path = require("path");
const Handlebars = require("handlebars");
const generateWebAssets = require("./generate-web");
const { writeFile } = require("./helpers");

async function generateProject(
  projectName,
  contractName,
  customFields
) {

  await createScaffold(projectName);

  const createContract = template(
    "templates/cadence/contracts/NFT.cdc",
    `cadence/contracts/${contractName}.cdc`
  );  

  await createContract(projectName, contractName, { customFields });

  await createSetupTransaction(projectName, contractName);
  await createMintTransaction(projectName, contractName, { customFields });
  await createMintWithClaimTransaction(projectName, contractName);

  await createClaimQueueDropTransaction(projectName, contractName);
  await createClaimAirDropTransaction(projectName, contractName);

  await createStartDropTransaction(projectName, contractName);
  await createRemoveDropTransaction(projectName, contractName);

  await createGetNFTScript(projectName, contractName);
  await createGetDropScript(projectName, contractName);

  await createFreshConfig(projectName, contractName, { customFields });

  await createFlowConfig(projectName, contractName);
  await createFlowTestnetConfig(projectName, contractName);
  await createFlowMainnetConfig(projectName, contractName);

  await createWebAssets(projectName, contractName);
  await createReadme(projectName, contractName);
}

async function createScaffold(dir) {
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
    path.resolve(__dirname, "templates/nfts.csv"),
    path.resolve(dir, "nfts.csv")
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

const createGetNFTScript = template(
  "templates/cadence/scripts/get_nft.cdc",
  "cadence/scripts/get_nft.cdc"
);

const createGetDropScript = template(
  "templates/cadence/scripts/queue/get_drop.cdc",
  "cadence/scripts/queue/get_drop.cdc"
);

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

async function createWebAssets(dir, name) {
  await generateWebAssets(dir, name);
}

function template(src, out) {
  return async (dir, name, fields = {}) => {
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
