const path = require('path');

const project = {
  name: '{{{ name }}}',
  description: '{{{ description }}}'
};

const network = process.env.NETWORK || 'emulator';

function getDefaults(network) {
  switch (network) {
    case 'emulator':
      return {
        ACCESS_API: 'http://localhost:8888',
        WALLET_DISCOVERY: 'http://localhost:8701/fcl/authn',
        CONTRACT_ADDRESS: '0xf8d6e0586b0a20c7'
      }
    case 'testnet':
      return {
        ACCESS_API: 'https://rest-testnet.onflow.org',
        WALLET_DISCOVERY: 'https://fcl-discovery.onflow.org/testnet/authn',
        CONTRACT_ADDRESS: ''
      }
  }

  throw new Error(`"${network} is not a valid network. Expected one of "emulator" or "testnet".`)
}

const defaults = getDefaults(network);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  swcMinify: true,
  webpack: (config) => {
    // Add Cadence loader to the Webpack configuration
    config.module.rules.push({
      test: /\.cdc/,
      use: [
        {
          loader: '@freshmint/cadence-loader',
          options: {
            flowConfig: [
              path.resolve('../flow.json'),
              path.resolve('../flow.testnet.json'),
              path.resolve('../flow.mainnet.json'),
            ],
            env: {
              FLOW_TESTNET_ADDRESS: process.env.CONTRACT_ADDRESS,
              FLOW_MAINNET_ADDRESS: process.env.CONTRACT_ADDRESS
            }
          },
        },
      ]
    })

    return config;
  },
  images: {
    domains: ['nftstorage.link'],
  },
  env: {
    FLOW_NETWORK: network,
    NAME: process.env.NAME || project.name,
    DESCRIPTION: process.env.DESCRIPTION || project.description,
    ACCESS_API: process.env.ACCESS_API || defaults.ACCESS_API,
    WALLET_DISCOVERY: process.env.WALLET_DISCOVERY || defaults.WALLET_DISCOVERY,
    CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS || defaults.CONTRACT_ADDRESS
  }
}

module.exports = nextConfig;
