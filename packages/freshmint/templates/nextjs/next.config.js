const path = require('path');

const project = {
  name: '{{{ name }}}',
  description: '{{{ description }}}'
};

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
            ]
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
    projectName: project.name,
    projectDescription: project.description
  }
}

module.exports = nextConfig
