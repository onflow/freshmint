# Blind Edition NFT Template

The Blind Edition NFT template is similar to the blind NFT contract, but for edition-based NFTs.

With this contract, edition-based NFTs are initially minted in "blind" form with their metadata visible
but their serial numbers hidden.

The minter can then reveal serial numbers by publishing them to the blockchain at a later date.

Using a cryptographic hash, NFT owners can verify that their serial number matches the original blind NFT.

## How blind minting works

We use the same technique as we do for standard blind NFTs, except that the we
only hash the serial number rather than the entire metadata object.

For edition-based NFTs, all the metadata values are known at mint time (except the serial number).
We don't gain much from hiding the metadata because it would be effectively revealed for all NFTs in an edition
as soon as one NFT is revealed, due to the fact that all NFTs in an edition share the same metadata.

### Generating the metadata hash

For edition-based NFTs, we hash the serial number combined with a random salt.

Here's some pseudocode:

```
metadataHash = sha3(
  SALT,
  encodeInt(serialNumber)
)
```

where `SALT` is a random 32 byte sequence.

### Revealing the metadata

To reveal the metadata for an NFT, we publish the salt and serial number to the NFT smart contract
using the [reveal.cdc](./transactions/reveal.template.cdc) transaction.

The contract then hashes the salt and serial number for each NFT directly on-chain using Cadence's crypto standard library.
It will reject the serial number if it does not hash to the same value that was set at mint time.

## Contract generation

The template requires the following inputs when generating a contract:

- `contractName` - the name of the contract.
- `fields` - the metadata fields to include on the contract.
- `views` - the metadata views to include on the contract.
- `saveAdminResourceToContractAccount` - a special boolean flag that indicates whether the `Admin` resource should be saved to the contract account at mint time. If false, the deployer must pass to the contract initializer an `AuthAccount` that will receive the `Admin` resource.

## TypeScript wrapper

This template has an accompanying TypeScript wrapper in `@freshmint/core` implemented in [`BlindEditionNFTContract.ts`](../../../packages/core/contracts/BlindEditionNFTContract.ts).

The wrapper contains functions to generate a contract, deploy it and mint NFTs.

## Usage

### Create an edition

Before minting NFTs, you must create an edition and add it to the contract.
This acts a blueprint for all NFTs that will exist in the edition.

Editions are created in batches. Use the [`create_editions.cdc`](./transactions/create_editions.template.cdc) transaction to create one or more editions.

This transaction is generated to accept one argument for each metadata field defined in your schema.

> Note: this is the same transaction used by the [standard edition contract](../edition-nft).

### Mint NFTs

Use the [`mint.cdc`](./transactions/mint.template.cdc) transaction to mint blind NFTs.

This transaction accepts an edition ID and a list of hashes to mint.

The transaction will fail if any of the hashes have already been minted.
This prevents duplicate mints.

### Reveal NFTs

Use the [`reveal.cdc`](./transactions/reveal.template.cdc) transaction to reveal NFTs.

This transaction accepts a list of NFT IDs, serial numbers and salt values; one for each NFT to be revealed.

## Tests

Tests are implemented in TypeScript in [`BlindEditionNFTContract.test.ts`](../../../packages/core/contracts/BlindEditionNFTContract.test.ts) and use [`@onflow/flow-js-testing`](https://github.com/onflow/flow-js-testing) to run on the Flow Emulator.
