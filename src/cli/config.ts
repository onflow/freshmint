import * as path from 'path';
import * as dotenv from 'dotenv';

// @ts-ignore
import { withPrefix } from '@onflow/util-address';

import { metadata } from '../lib';

export default function getConfig() {
  /* eslint-disable @typescript-eslint/no-var-requires */

  dotenv.config({ path: path.resolve(process.cwd(), '.env') });

  // TOOD: inform the user when config is missing

  const userConfig = require(path.resolve(process.cwd(), 'fresh.config.js'));

  const flowConfig = require(path.resolve(process.cwd(), 'flow.json'));

  const flowTestnetConfig = require(path.resolve(process.cwd(), 'flow.testnet.json'));

  const flowMainnetConfig = require(path.resolve(process.cwd(), 'flow.mainnet.json'));

  return {
    //////////////////////////////////////////////
    // ------ App Config
    //////////////////////////////////////////////

    // Location of NFT metadata and assets for minting
    nftDataPath: userConfig.nftDataPath || 'nfts.csv',
    nftAssetPath: userConfig.nftAssetPath || 'assets',

    // Metadata schema defined by the user
    schema: metadata.parseSchema(userConfig.schema || []),

    //////////////////////////////////////////////
    // ------ IPFS Config
    //////////////////////////////////////////////

    pinningService: userConfig.pinningService,

    // pinningService: {
    //   endpoint: "PINNING_SERVICE_ENDPOINT",
    //   key: "PINNING_SERVICE_KEY"
    // },

    //////////////////////////////////////////////
    // ------ Emulator Config
    //////////////////////////////////////////////

    // This is the default owner address and signing key for all newly minted NFTs
    emulatorFlowAccount: userConfig.emulatorFlowAccount
      ? getAccount(userConfig.emulatorFlowAccount, flowConfig)
      : getAccount('emulator-account', flowConfig),

    //////////////////////////////////////////////
    // ------ Testnet Config
    //////////////////////////////////////////////

    // This is the default owner address and signing key for all newly minted NFTs
    testnetFlowAccount: userConfig.testnetFlowAccount
      ? getAccount(userConfig.testnetFlowAccount, flowTestnetConfig)
      : getAccount('testnet-account', flowTestnetConfig),

    //////////////////////////////////////////////
    // ------ Mainnet Configs
    //////////////////////////////////////////////

    // This is the default owner address and signing key for all newly minted NFTs
    mainnetFlowAccount: userConfig.mainnetFlowAccount
      ? getAccount(userConfig.mainnetFlowAccount, flowMainnetConfig)
      : getAccount('mainnet-account', flowMainnetConfig),
  };
}

// Expand template variable in flow.json
// Ref: https://stackoverflow.com/a/58317158/3823815
function expand(template: string, data: any) {
  return template.replace(/\$\{(\w+)\}/g, (_, name) => data[name] || '?');
}

function getAccount(name: string, flowConfig: any) {
  const account = flowConfig.accounts[name];
  const address = withPrefix(expand(account.address, process.env));

  return { name, address };
}
