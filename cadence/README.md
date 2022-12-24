# Freshmint Cadence Contracts

This directory contains the Cadence contracts, transactions and scripts that power Freshmint.

## NFT templates

Freshmint generates valid NFT contracts using Cadence template files written with the [Handlebars](https://handlebarsjs.com/) templating syntax. The [`@freshmint/core`](../packages/core) package imports these templates
to generate unique contracts for users.

As such, you may notice that the template files do not look like valid Cadence and contain variables (e.g. `{{ contractName }}`) and logical statements (e.g. `{{#for field in fields}}`).

All template files end with the `.template.cdc` suffix.

Freshmint currently supports four NFT template types:

- [Standard NFTs](./nfts/standard-nft/)
- [Blind NFTs](./nfts/blind-nft/)
- [Edition NFTs](./nfts/edition-nft/)
- [Blind Edition NFTs](./nfts/blind-edition-nft/)

### Common template files

The are also common template files shared by all NFT templates:

- [Common partials](./nfts/common/partials/) - [Handlebars template partials](https://handlebarsjs.com/guide/partials.html) that are reused across all NFT templates.
- [Metadata views partials](./nfts/metadata-views/) - [Handlebars template partials](https://handlebarsjs.com/guide/partials.html) containing implementations of common NFT metadata views.

## Freshmint contracts

Freshmint also depends on several supporting contracts that provide functionality such as NFT distribution (i.e. drops) and metadata encoding.

- [FreshmintClaimSaleV2](./freshmint-claim-sale-v2/) - distribute NFTs in a drop.
- [FreshmintEncoding](./freshmint-encoding/) - encode Cadence values to byte arrays (used by blind NFTs).
- [FreshmintMetadataViews](./freshmint-metadata-views/) - Freshmint-specific metadata views and utilities.
- [FreshmintQueue](./freshmint-queue/) - a container for storing NFTs in a FIFO queue (used by `FreshmintClaimSaleV2`).
- [FreshmintLockBox](./freshmint-lock-box/) - distribute NFTs that can be claimed with unique claim keys (e.g. for airdrops).

### Deprecated contracts

- [FreshmintClaimSale](./freshmint-claim-sale/) (use `FreshmintClaimSaleV2` instead)

### Deployments

The Freshmint contracts are deployed to Flow testnet and mainnet.

|Contract|Testnet|Mainnet|
|--------|-------|-------|
|`FreshmintClaimSaleV2`|`0x3b8959a9823c62b4`|`0x0ed88e62be7037ac`|
|`FreshmintEncoding`|`0x8ab7897dd9d69819`|`0xad7ea9b6c112b937`|
|`FreshmintMetadataViews`|`0xc270e330615c6fa0`|`0x0c82d33d4666f1f7`|
|`FreshmintQueue`|`0x10077395fa5d2436`|`0xb442022ad78b11a2`|
|`FreshmintLockBox`|`0x0cad7d1c09a3a433`|`0xdd1c2c328f849078`|
|`FreshmintClaimSale` (deprecated)|`0x2d3d6874bc231156`|`0x16a3117d86821389`|

### Contract updates

Deployments are defined in [`flow.json`](./flow.json), [`flow.testnet.json`](./flow.testnet.json) and [`flow.mainnet.json`](./flow.mainnet.json).

> This repository does not contain the private key information for the contracts.
Contact a project maintainer for more information on how to update deployed contracts.

#### Update testnet contracts

- Replace the import placeholders in each contract with their testnet address.
  - For example, `{{ imports.NonFungibleToken }}` becomes `0x631e88ae7f1d7c20`.
  - All contract addresses are defined in [config.ts](../packages/core/config.ts).
- If you only want to update one contract, remove all but that contract from the `"deployments"` section of `flow.testnet.json` (but don't commit that change).
- Copy the `freshmint-testnet.private.json` file into this directory.

```sh
flow deploy -f flow.json -f flow.testnet.json --update --network testnet
```

#### Update mainnet contracts

- Replace the import placeholders in each contract with their mainnet address.
  - For example, `{{ imports.NonFungibleToken }}` becomes `0x1d7e57aa55817448`.
  - All contract addresses are defined in [config.ts](../packages/core/config.ts).
- If you only want to update one contract, remove all but that contract from the `"deployments"` section of `flow.mainnet.json` (but don't commit that change).
- Copy the `freshmint-mainnet.private.json` file into this directory.

```sh
flow deploy -f flow.json -f flow.mainnet.json --update --network mainnet
```
