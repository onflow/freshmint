# Getting Started with Freshmint

This guide covers how to use the Freshmint CLI tool to create and manage an NFT application on Flow.

## Installation

```sh
npm install -g freshmint
```

:warning: **Important:** Freshmint depends on the Flow CLI, so make sure you have it installed:

- [Install the Flow CLI](https://developers.flow.com/tools/flow-cli/install).
- Verify that the Flow CLI is installed and callable by running:
  ```sh
  flow version
  ```

## Create a project

Start by creating a new Freshmint project:

```sh
fresh start your-project-name

cd ./your-project-name
```

This command creates a new directory with the following:

- A custom NFT contract, just for you!
- Transactions and scripts to interact with your contract.
- Sample NFTs and image assets (in `nfts.csv` and `assets`).
- A pre-built Next.js web app for running a live drop.
- A project configuration file (`freshmint.yaml`).
- Flow configuration files.

## Start the local dev server

Freshmint uses the [Flow emulator](https://github.com/onflow/flow-emulator) and
[FCL dev wallet](https://github.com/onflow/fcl-dev-wallet) for rapid local development.

This command launches the emulator and dev wallet, then deploys all Cadence contracts.

Keep it running while you build!

```sh
fresh dev
```

## Configure IPFS pinning

Freshmint uses [NFT.Storage](https://nft.storage) to upload and pin files to IPFS.

1. [Sign up for a free NFT.Storage account](https://nft.storage/).
2. [Create a new API key](https://nft.storage/manage/) in the dashboard.
3. Add the API key to the `.env` file:

```sh
# .env
PINNING_SERVICE_ENDPOINT="https://nft.storage/api"
PINNING_SERVICE_KEY="Paste your NFT.Storage key here!"
```

## Mint your NFTs

This command mints the NFTs listed in `nfts.csv` (or `editions.csv` for edition contracts).

Before minting, it also pins images and other media to IPFS.

> Your project comes with a few sample NFTs, but you can edit that file to add your own!
We recommend using a spreadsheet tool like
[Microsoft Excel](https://www.microsoft.com/en-us/microsoft-365/excel),
[Google Sheets](https://docs.google.com/spreadsheets),
[Numbers for Mac](https://www.apple.com/ca/numbers/) or
[Excel Viewer for VS Code](https://marketplace.visualstudio.com/items?itemName=GrapeCity.gc-excelviewer).


```sh
fresh mint
```

## Launch the web app

Install and run the pre-built Next.js web app:

```sh
# Switch to the web app directory
cd ./web

npm install
npm run dev
```

## Start a drop

The `start-drop` command creates a new drop that lists all of your minted NFTs for the same price.

Users can purchase NFTs on a first come, first served basis in the same order they were minted.

```sh
# Start a drop with a price of 42 FLOW
fresh start-drop 42.0
```

## More concepts

- [Customize your NFT metadata](./metadata.md)
- [Deploy to testnet](./testnet.md)
