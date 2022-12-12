# Freshmint CLI

![npm](https://img.shields.io/npm/v/freshmint)

`freshmint` is the main entrypoint for developers using Freshmint.


It is a CLI tool that provides commands to generate new NFT projects,
deploy contracts, mint NFTs and manage live drops.

## Development

To develop this package, start by installing all dependencies from the **root of this repository**:

```sh
npm install
```

Next, build all packages in watch mode:

> This ensures that `@freshmint/core` is also up to date, which `freshmint` depends on.

```sh
# Keep this process running in your terminal!
npm run dev
```

### Create a link to your development build

Use [npm link](https://docs.npmjs.com/cli/v8/commands/npm-link) to create a global symlink to the `fresh` command:

```sh
# Run this from the packages/freshmint directory
cd packages/freshmint

npm link
```

You can now execute the `fresh` command on your system:

```sh
# Start a new test project to use during development
fresh start test-project
```

## Package Structure

- [index.ts](./index.ts) - the main entrypoint for the `fresh` command.
- [commands](./commands) - one file for each available CLI command. All new commands should go here.
- [mint](./mint) - code for minting NFTs, parsing metadata and pinning assets to IPFS.
- [flow](./flow) - a wrapper around the Flow CLI for executing Cadence transactions and scripts.
- [generate](./generate) - code and templates for generating a Freshmint project.
- [devServer](./devServer) - a lightweight dev server that runs the Flow Emulator and FCL Dev Wallet.

## Key Dependencies

- [@freshmint/core](../core) supplies:
  - All Cadence templates for contracts, transactions and scripts.
  - Logic for constructing metadata schemas, parsing and hashing metadata values.
- [commander](https://www.npmjs.com/package/commander) is the framework for creating commands and parsing CLI arguments.
