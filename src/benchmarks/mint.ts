// @ts-ignore
import * as fcl from '@onflow/fcl';

import { Authorizer } from '@fresh-js/core';
import { HashAlgorithm, InMemoryECPrivateKey, InMemoryECSigner, SignatureAlgorithm } from '@fresh-js/crypto';

import { Config, FlowClient, metadata, BlindNFTContract } from '../lib';

function makeId(length: number) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

function generateNFTs(schema: metadata.Schema, count: number): metadata.MetadataMap[] {
  const nfts: metadata.MetadataMap[] = [];

  for (let i = 0; i < count; i++) {
    nfts.push(generateNFT(schema));
  }

  return nfts;
}

function generateNFT(schema: metadata.Schema): metadata.MetadataMap {
  const metadata = {};

  schema.getFieldList().forEach((field) => {
    metadata[field.name] = makeId(100);
  });

  return metadata;
}

const MINTER_ADDRESS = process.env.MINTER_ADDRESS!;
const MINTER_PRIVATE_KEY = process.env.MINTER_PRIVATE_KEY!;

const privateKey = InMemoryECPrivateKey.fromHex(MINTER_PRIVATE_KEY, SignatureAlgorithm.ECDSA_P256);
const signer = new InMemoryECSigner(privateKey, HashAlgorithm.SHA3_256);

const ownerAuthorizer = new Authorizer({ address: MINTER_ADDRESS, keyIndex: 0, signer });

const schema = metadata.defaultSchema.extend({
  aa: metadata.String(),
  bb: metadata.String(),
  cc: metadata.String(),
  dd: metadata.String(),
  ee: metadata.String(),
  ff: metadata.String(),
  gg: metadata.String(),
  hh: metadata.String(),
  ii: metadata.String(),
  jj: metadata.String(),
  kk: metadata.String(),
});

async function main() {
  fcl.config().put('accessNode.api', 'https://rest-testnet.onflow.org');

  const client = FlowClient.fromFCL(fcl, Config.TESTNET);

  const contract = new BlindNFTContract({
    name: 'Foo',
    schema,
    address: '0xaa105a75e3cbf1a1',
    owner: ownerAuthorizer,
  });

  const batchSize = 200;

  for (let i = 0; i < 26; i++) {
    const draftNFTs = generateNFTs(schema, batchSize);
    const mintedNFTs = await client.send(contract.mintNFTs(draftNFTs));

    console.log(`total minted: ${(i + 1) * batchSize}`);

    await client.send(contract.revealNFTs(mintedNFTs));

    console.log(`total revealed: ${(i + 1) * batchSize}`);
  }
}

main();
