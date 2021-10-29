# {{ name }}

This project was generated with [freshmint](https://github.com/onflow/freshmint).

## Setup

This project requires the Flow CLI and Docker.

- [Install Flow CLI](https://docs.onflow.org/flow-cli/install/)
- [Install Docker Desktop](https://www.docker.com/products/docker-desktop)

Now install the project and its dependencies: 

```sh
npm install
```
## Quick start

This project uses the [Flow emulator](https://github.com/onflow/flow-emulator) for rapid local development.

### Start the emulator

```sh
docker-compose up -d
```
### Deploy your contract to Flow

(Ensure you run the following commands from your new project's directory)

```sh
fresh deploy
```

### Mint your NFTs

This command mints the NFTs declared in `nfts.csv`. Edit that file to add your own NFTs!

Notes: 

- The metadata in the CSV is compatible with [OpenSea's NFT standard](https://docs.opensea.io/docs/metadata-standards). Freshmint does not enforce any standard metadata, but it is reccomended you consider using a standard format.

- Only the **image** property is required, and it's value must be the name of a file in the **assets/images** directory of your project. 

```sh
fresh mint
```

### Inspect an NFT

View the metadata for a single NFT.

```sh
fresh inspect 0
```

### Pin the NFT metadata

After you mint your NFTs, you'll need to pin the metdata to IPFS so that it's available to the world.

Hint: you can implement a blind drop by pinning the metadata _after_ your drop completes.

#### Configure your pinning service

Freshmint is compatible with [NFT.Storage](https://nft.storage), [Pinata](https://www.pinata.cloud/) and any other pinning service that implements the [IPFS Remote Pinning API](https://ipfs.github.io/pinning-services-api-spec).

First configure your pinning service by editing `.env`:

- **NFT.Storage**

    [Create a free NFT.Storage account to get an API key](https://nft.storage/).

    ```sh
    # .env
    PINNING_SERVICE_ENDPOINT="https://nft.storage/api"
    PINNING_SERVICE_KEY="Paste your nft.storage JWT token here!"
    ```

#### Pin an NFT

Use the pin command to pin an NFT by ID.

```sh
fresh pin 0
```

### Start your drop

Start an NFT drop. This will start a new drop that lists all the NFTs currently minted. Use the price argument to set the price of each NFT in FLOW.

```sh
fresh start-drop 10.0
```

#### Remove a drop

Remove a drop. Once your drop is sold out, run this command to remove it.

```sh
fresh remove-drop
```

### Launch the web app

This is the last step! Run this command to launch the UI for you NFT project.

```sh
npm run dev
```
