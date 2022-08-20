# {{ name }}

This project was generated with [freshmint](https://github.com/packagelabs/freshmint).

## Setup

This project requires the Flow CLI.

- [Install Flow CLI](https://developers.flow.com/tools/flow-cli/install)

## Quick start

This project uses the [Flow emulator](https://github.com/onflow/flow-emulator) for rapid local development.

### Start the emulator

```sh
flow run
```

### Configure your pinning service

Freshmint is compatible with [NFT.Storage](https://nft.storage), [Pinata](https://www.pinata.cloud/) and any other pinning service that implements the [IPFS Remote Pinning API](https://ipfs.github.io/pinning-services-api-spec).

First configure your pinning service by editing `.env`:

#### NFT.Storage

[Create a free NFT.Storage account to get an API key](https://nft.storage/).

```sh
# .env
PINNING_SERVICE_ENDPOINT="https://nft.storage/api"
PINNING_SERVICE_KEY="Paste your nft.storage JWT token here!"
```

### Mint your NFTs

This command mints the NFTs listed in `{{ nftDataPath }}`. Edit that file to add your own NFTs!

```sh
fresh mint
```

### Inspect an NFT

View the metadata for a single NFT.

```sh
fresh get 0
```

## Deploy on testnet

Generate a new key pair for your testnet admin account:

```sh
flow keys generate
```

Save the private key to your `.env` file:

```sh
# .env
FLOW_TESTNET_PRIVATE_KEY=xxxx
```

Use the [Flow Faucet to create a new account](https://testnet-faucet.onflow.org/) with the public key.

Save the resulting address to your `.env` file:

```sh
# .env
FLOW_TESTNET_ADDRESS=xxxx
```

### Deploy your contract

You can now run the project commands with the testnet flag:

```sh
flow project deploy --network testnet
```

### Mint your NFTs and manage drops

```sh
fresh mint --network testnet

fresh start-drop 10.0 --network testnet
fresh stop-drop --network testnet
```
