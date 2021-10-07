# {{name}}

This project was generated with [freshmint](https://github.com/onflow/freshmint).

## Setup

This project requires the Flow CLI and Docker.

- [Install Flow CLI](https://docs.onflow.org/flow-cli/install/)
- [Install Docker Desktop](https://www.docker.com/products/docker-desktop)

Now install the project and its dependencies: 

```sh
npm install
```

## Development

This project uses the [Flow emulator](https://github.com/onflow/flow-emulator) for rapid local development.

### Start the emulator

```sh
docker-compose up -d
```

## Usage

### Deploy your contract to Flow

```sh
fresh deploy
```

### Mint your NFTs

```sh
fresh mint
```

### Get an NFT

```sh
fresh show 0
```

### Pin the NFT metadata

After you mint your NFTs, you'll need to pin the metdata to IPFS so that it's available to the world.

Hint: you can implement a blind drop by pinning the metadata _after_ your drop completes.

Fresh is compatible with [Pinata](https://www.pinata.cloud/), [NFT Storage](https://nft.storage) and any other pinning service that implements the [IPFS Remote Pinning API](https://ipfs.github.io/pinning-services-api-spec).

First configure your pinning service by editing `.env`:

**NFT Storage**

```sh
# .env
PINNING_SERVICE_ENDPOINT="https://nft.storage/api"
PINNING_SERVICE_KEY="Paste your nft.storage JWT token here!"
```

**Pinata**

```sh
# .env
PINNING_SERVICE_ENDPOINT="https://api.pinata.cloud/psa"
PINNING_SERVICE_KEY="Paste your Pinata JWT token here!"
```

Pin a single NFT:

```sh
fresh pin 0
```

## Run an NFT drop

```sh
npm run dev
```
