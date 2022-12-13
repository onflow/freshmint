# Testnet Deployment Guide

This guide covers how to deploy a Freshmint project to [Flow Testnet](https://developers.flow.com/learn/concepts/accessing-testnet).

## Create a testnet account 

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

## Deploy your contract

Use `fresh deploy` to deploy your NFT contract to testnet.

```sh
fresh deploy --network testnet
```

## Mint your NFTs and manage drops

Most Freshmint commands accept a `--network` flag. Use `--network testnet` to run them on testnet:

```sh
fresh mint --network testnet

fresh start-drop 10.0 --network testnet
fresh stop-drop --network testnet
```
