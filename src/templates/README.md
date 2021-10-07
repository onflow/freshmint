# {{name}}

## Start the emulator

```sh
docker-compose up -d
```

## Deploy your contract

```sh
fresh deploy
```

## Mint your NFTs

```sh
fresh mint
```

## Get an NFT

```sh
fresh show 0
```

## Pin an NFT

First set up your config:

```sh
cp .env.example .env

# Replace PINNING_SERVICE_KEY= with your nft.storage API key
```

```sh
fresh pin 0
```
