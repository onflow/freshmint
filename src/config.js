const path = require("path");
const { withPrefix } = require("@onflow/util-address");

function getConfig() {
  require("dotenv").config({ path: path.resolve(process.cwd(), ".env") });

  // TOOD: inform the user when config is missing
  const userConfig = require(path.resolve(
    process.cwd(),
    "fresh.config.js"
  ));

  const flowConfig = require(path.resolve(process.cwd(), "flow.json"));

  const flowTestnetConfig = require(path.resolve(
    process.cwd(),
    "flow.testnet.json"
  ));

  return {
    //////////////////////////////////////////////
    // ------ App Configs
    //////////////////////////////////////////////

    // Store IPFS NFT asset & metadata CIDs and data before pushing to the live network
    // https://github.com/rarepress/nebulus
    nebulusPath: userConfig.ipfsDataPath || "ipfs-data",
    mintDataPath: userConfig.mintDataPath || "mint-data",

    // Location of NFT metadata and assets for minting
    nftDataPath: userConfig.nftDataPath || "nfts.csv",
    nftAssetPath: userConfig.nftAssetPath || "assets",

    // How fast to batch mint txs
    RATE_LIMIT_MS: 2000,

    //////////////////////////////////////////////
    // ------ IPFS Configs
    //////////////////////////////////////////////

    pinningService: userConfig.pinningService,

    // pinningService: {
    //   endpoint: "PINNING_SERVICE_ENDPOINT",
    //   key: "PINNING_SERVICE_KEY"
    // },

    // If you're running IPFS on a non-default port, update this URL. If you're using the IPFS defaults, you should be all set.
    ipfsApiUrl: userConfig.ipfsApiUrl || "http://localhost:8081/ipfs",

    // If you're running the local IPFS gateway on a non-default port, or if you want to use a public gatway when displaying IPFS gateway urls, edit this.

    ipfsGatewayUrl: userConfig.ipfsGatewayUrl || "http://localhost:4001",

    //////////////////////////////////////////////
    // ------ Emulator Configs
    //////////////////////////////////////////////

    // This is the default owner address and signing key for all newly minted NFTs
    emulatorFlowAccount: userConfig.emulatorFlowAccount
      ? getAccount(userConfig.emulatorFlowAccount, flowConfig)
      : getAccount("emulator-account", flowConfig),

    //////////////////////////////////////////////
    // ------ Testnet Configs
    //////////////////////////////////////////////

    // This is the default owner address and signing key for all newly minted NFTs
    testnetFlowAccount: userConfig.testnetFlowAccount
      ? getAccount(userConfig.testnetFlowAccount, flowTestnetConfig)
      : getAccount("testnet-account", flowTestnetConfig)
  };
}

function getAccount(name, flowConfig) {
  const account = flowConfig.accounts[name];

  return {
    name,
    address: withPrefix(account.address)
  };
}

module.exports = getConfig;
