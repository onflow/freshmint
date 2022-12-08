# Edition NFT Template

The Edition NFT template generates a contract that can mint edition-based NFTs.

In this model, a contract can define multiple NFT editions.
All NFTs in an edition share the same metadata;
only their serial numbers are different.

## Contract Generation

The template requires the following inputs when generating a contract:

- `contractName` - the name of the contract.
- `fields` - the metadata fields to include on the contract.
- `views` - the metadata views to include on the contract.
- `saveAdminResourceToContractAccount` - a special boolean flag that indicates whether the `Admin` resource should be saved to the contract account at mint time. If false, the deployer must pass to the contract initializer an `AuthAccount` that will receive the `Admin` resource.

## TypeScript Wrapper

This template has an accompanying TypeScript wrapper in `@freshmint/core` implemented in [`EditionNFTContract.ts`](../../../packages/core/contracts/EditionNFTContract.ts).

The wrapper contains functions to generate a cotnract, 
deploy a contract, create editions and mint NFTs.

## Usage

### Create an edition

Before minting NFTs, you must create an edition and add it to the contract.
This acts a blueprint for all NFTs that will exist in the edition.

Editions are created in batches. Use the [`create_editions.cdc`](./transactions/create_editions.template.cdc) transaction to create one or more editions.

This transaction is generated to accept one argument for each metadata field defined in your schema.

### Mint NFTs

After creating an edition, use the [`mint.cdc`](./transactions/mint.template.cdc) transaction to
mint NFTs into an edition.

Because you added the metadata when creating the edition,
this transaction only needs to know the edition ID and number of NFTs to mint.

## Tests

Tests are implemented in TypeScript in [`EditionNFTContract.test.ts`](../../../packages/core/contracts/EditionNFTContract.test.ts) and use [`@onflow/flow-js-testing`](https://github.com/onflow/flow-js-testing) to run on the Flow Emulator.
