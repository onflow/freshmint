# Blind NFT Template

The Blind NFT template generates a contract that uses a commit-reveal scheme when minting NFTs.

NFTs are initially minted in "blind" form with their metadata hidden.
The minter can then reveal the NFT metadata by publishing it to the blockchain
at a later date.

Using a cryptographic hash, NFT owners can verify that the revealed metadata matches the original blind NFT.

## How blind minting works

Each NFT is minted with a hash of its metadata values, called the metadata hash.
This hash can later be used to check that the revealed metadata did not
change after minting.

### Generating the metadata hash

The metadata hash is created by computing the SHA3_256 hash of the following:

- A 32 byte random salt (this prevents users from hash grinding all possible metadata combinations)
- The concatenated byte encoding of all metadata fields (in the order they are defined in the schema)

For example, start with this simple schema:

```yaml
fields:
  - name: foo
    type: string
  - name: bar
    type: int
```

Here's NFT created from the schema:

```js
{
  foo: "Hello, World!"
  bar: 42
}
```

It's hash would be computed like this (pseudocode):

```
metadataHash = sha3(
  SALT,
  encodeString("Hello, World!"),
  encodeInt(42)
)
```

where `SALT` is a random 32 byte sequence.

#### TypeScript implementation

The `@freshmint/core` library provides functions to encode and hash NFT metadata:

- Metadata encoding: [metadata/encode.ts](https://github.com/dapperlabs/freshmint/blob/documentation/packages/core/metadata/encode.ts)
- Metadata hashing: [metadata/hash.ts](https://github.com/dapperlabs/freshmint/blob/documentation/packages/core/metadata/hash.ts)

#### Cadence implementation

- Metadata encoding is implemented by the [FreshmintEncoding](../../freshmint-encoding/FreshmintEncoding.cdc) contract.
- Metadata hashing is implemented [directly on each blind NFT contract](./BlindNFT.template.cdc#L81-L83).

### Revealing the metadata

To reveal the metadata for an NFT, we publish the original metadata object to the NFT smart contract
using the [reveal.cdc](./transactions/reveal.template.cdc) transaction. It is very similar to 
the minting transaction for standard NFTs, but accepts an additional argument `metadataSalts`.

The contract then hashes the salt and metadata for each NFT directly on-chain using Cadence's crypto standard library.
It will reject the revealed metadata and salt if they do not hash to the same value that was set at mint time.

## Contract generation

The template requires the following inputs when generating a contract:

- `contractName` - the name of the contract.
- `fields` - the metadata fields to include on the contract.
- `views` - the metadata views to include on the contract.
- `saveAdminResourceToContractAccount` - a special boolean flag that indicates whether the `Admin` resource should be saved to the contract account at mint time. If false, the deployer must pass to the contract initializer an `AuthAccount` that will receive the `Admin` resource.

## TypeScript wrapper

This template has an accompanying TypeScript wrapper in `@freshmint/core` implemented in [`BlindNFTContract.ts`](../../../packages/core/contracts/BlindNFTContract.ts).

The wrapper contains functions to generate a contract, deploy it and mint NFTs.

> See the [Blind NFTs section in the Node.js documentation](../../../docs/nodejs.md#blind-nfts) for more documentation and examples.

## Usage

### Mint NFTs

Use the [`mint.cdc`](./transactions/mint.template.cdc) transaction to mint blind NFTs.

This transaction accepts list of metadata hashes; one for each NFT to be minted.

The transaction will fail if any of the hashes have already been minted.
This prevents duplicate mints.

### Reveal NFTs

Use the [`reveal.cdc`](./transactions/reveal.template.cdc) transaction to reveal NFTs.

This transaction accepts one argument for each field defined in your metadata schema,
as well as the salt values used to generate each metadata hash.

## Tests

Tests are implemented in TypeScript in [`BlindNFTContract.test.ts`](../../../packages/core/contracts/BlindNFTContract.test.ts) and use [`@onflow/flow-js-testing`](https://github.com/onflow/flow-js-testing) to run on the Flow Emulator.
