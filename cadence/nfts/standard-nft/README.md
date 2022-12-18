# Standard NFT Template

The Standard NFT template generates a contract that can mint simple one-of-a-kind NFTs.

In this model, NFT metadata is attached directly to each NFT at mint time.

## Contract Generation

The template requires the following inputs when generating a contract:

- `contractName` - the name of the contract.
- `fields` - the metadata fields to include on the contract.
- `views` - the metadata views to include on the contract.
- `saveAdminResourceToContractAccount` - a special boolean flag that indicates whether the `Admin` resource should be saved to the contract account at mint time. If false, the deployer must pass to the contract initializer an `AuthAccount` that will receive the `Admin` resource.

## TypeScript Wrapper

This template has an accompanying TypeScript wrapper in `@freshmint/core` implemented in [`StandardNFTContract.ts`](../../../packages/core/contracts/StandardNFTContract.ts).

The wrapper contains functions to generate a contract, deploy it and mint NFTs.

> See the [Standard NFTs section in the Node.js documentation](../../../docs/nodejs.md#standard-nfts) for more documentation and examples.

## Usage

### Mint NFTs

Use the [`mint.cdc`](./transactions/mint.template.cdc) transaction to mint NFTs with this contract.

This transaction accepts one argument for each field defined in your metadata schema.
It accepts an array of values for each field to support batch minting.

## Tests

Tests are implemented in TypeScript in [`StandardNFTContract.test.ts`](../../../packages/core/contracts/StandardNFTContract.test.ts) and use [`@onflow/flow-js-testing`](https://github.com/onflow/flow-js-testing) to run on the Flow Emulator.
