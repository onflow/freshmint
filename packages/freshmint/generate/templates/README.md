# {{ name }}

This project was generated with [freshmint](https://github.com/packagelabs/freshmint).

## Setup

This project requires the Flow CLI.

- [Install the Flow CLI](https://developers.flow.com/tools/flow-cli/install)

## Quick start

This project uses the [Flow emulator](https://github.com/onflow/flow-emulator) and [FCL dev wallet](https://github.com/onflow/fcl-dev-wallet) for rapid local development.

### Start the development server

This command launches the emulator, dev wallet and deploys all contract dependencies.

Keep it running while you build!

```sh
fresh dev
```

### Deploy your contract

```sh
fresh deploy
```

### Configure NFT.Storage for IPFS

Freshmint uses [NFT.Storage](https://nft.storage) to upload and pin files to IPFS.

1. [Sign up for a free NFT.Storage account](https://nft.storage/).
2. [Create a new API key](https://nft.storage/manage/) in the dashboard.
3. Add the API key to the `.env` file:

```sh
# .env
PINNING_SERVICE_ENDPOINT="https://nft.storage/api"
PINNING_SERVICE_KEY="Paste your NFT.Storage key here!"
```

### Mint your NFTs

This command mints the NFTs listed in `{{ nftDataPath }}`.

Edit that file to add your own NFTs!

```sh
fresh mint
```

### Launch the web app

Install and run the prebuilt Next.js web app:

```sh
# Switch to the web app directory
cd web

npm install
npm run dev
```

### Start a drop

The `start-drop` command creates a new drop that lists all of your minted NFTs for the same price.

Users can claim NFTs one-by-one in the same order they were minted.

```sh
# Start a drop with a price of 42 FLOW
fresh start-drop 42.0
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

Use the `--network` flag to deploy your contract to testnet.

```sh
fresh deploy --network testnet
```

### Mint your NFTs and manage drops

```sh
fresh mint --network testnet

fresh start-drop 10.0 --network testnet
fresh stop-drop --network testnet
```
