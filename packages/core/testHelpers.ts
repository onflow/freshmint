// @ts-ignore
import * as fcl from '@onflow/fcl';

import {
  init,
  emulator,
  deployContract,
  createAccount as createAccountOnEmulator,
  pubFlowKey,
  mintFlow,
  // @ts-ignore
} from '@onflow/flow-js-testing';

import { EMULATOR } from './config';
import { FreshmintClient } from './client';
import { TransactionAuthorizer } from './transactions';
import { HashAlgorithm, InMemoryECPrivateKey, InMemoryECSigner, SignatureAlgorithm } from './crypto';
import * as metadata from './metadata';
import { CollectionMetadata } from './contracts/NFTContract';
import { FreshmintMetadataViewsGenerator } from './generators/FreshmintMetadataViewsGenerator';
import { FreshmintClaimSaleGenerator } from './generators/FreshmintClaimSaleGenerator';
import { FreshmintClaimSaleV2Generator } from './generators/FreshmintClaimSaleV2Generator';
import { FreshmintQueueGenerator } from './generators/FreshmintQueueGenerator';
import { FreshmintEncodingGenerator } from './generators/FreshmintEncodingGenerator';

import flowConfig from './flow.json';

const emulatorPort = 8888;
const emulatorServiceAccount = '0xf8d6e0586b0a20c7';

// Get the emulator private key from flow.json
const emulatorServiceAccountPrivateKey = flowConfig.accounts['emulator-account'].key;

const config = EMULATOR;

export const client = FreshmintClient.fromFCL(fcl, config);

export async function setupEmulator() {
  fcl.config().put('accessNode.api', `http://localhost:${emulatorPort}`);

  // flow-js-testing panics if init is not called.
  //
  // The init function must be called from a working directory that contains
  // a flow.json file.
  //
  // This is because flow-js-testing calls flowConfig() on this line,
  // which is hardcoded to search for flow.json and panics if not found:
  // https://github.com/onflow/flow-js-testing/blob/2206eda493e7c51cfe53c1cbf9365e81064dbcef/src/config.js#L48
  //
  await init('.');

  // This must be called in a directory containing a flow.json file.
  await emulator.start({
    restPort: emulatorPort,
    // Deploy NonFungibleToken and MetadataViews by default
    flags: '--contracts',
  });

  // FCL is noisy; silence it.
  fcl.config().put('logger.level', 0);

  await deployContract({
    code: FreshmintEncodingGenerator.contract(),
    to: emulatorServiceAccount,
    name: 'FreshmintEncoding',
  });

  await deployContract({
    code: FreshmintMetadataViewsGenerator.contract(),
    to: emulatorServiceAccount,
    name: 'FreshmintMetadataViews',
  });

  await deployContract({
    code: FreshmintQueueGenerator.contract({ imports: config.imports }),
    to: emulatorServiceAccount,
    name: 'FreshmintQueue',
  });

  await deployContract({
    code: FreshmintClaimSaleGenerator.contract({ imports: config.imports }),
    to: emulatorServiceAccount,
    name: 'FreshmintClaimSale',
  });

  await deployContract({
    code: FreshmintClaimSaleV2Generator.contract({ imports: config.imports }),
    to: emulatorServiceAccount,
    name: 'FreshmintClaimSaleV2',
  });
}

export async function teardownEmulator() {
  await emulator.stop();
}

const privateKey = InMemoryECPrivateKey.fromHex(emulatorServiceAccountPrivateKey, SignatureAlgorithm.ECDSA_P256);
const signer = new InMemoryECSigner(privateKey, HashAlgorithm.SHA3_256);

export const ownerAuthorizer = new TransactionAuthorizer({ address: emulatorServiceAccount, keyIndex: 0, signer });
export const payerAuthorizer = new TransactionAuthorizer({ address: emulatorServiceAccount, keyIndex: 0, signer });

export const contractPublicKey = privateKey.getPublicKey();
export const contractHashAlgorithm = HashAlgorithm.SHA3_256;

export type TestAccount = {
  address: string;
  authorizer: TransactionAuthorizer;
};

export async function createAccount(): Promise<{ address: string; authorizer: TransactionAuthorizer }> {
  const publicKey = await pubFlowKey({
    privateKey: emulatorServiceAccountPrivateKey,
    hashAlgorithm: 3, // SHA3_256
    signatureAlgorithm: 2, // ECDSA_P256
    weight: 1000,
  });

  const address = await createAccountOnEmulator({ name: '', keys: [publicKey] });
  const authorizer = new TransactionAuthorizer({ address, keyIndex: 0, signer });

  return {
    address,
    authorizer,
  };
}

export async function getFLOWBalance(address: string): Promise<number> {
  const result = await fcl.query({
    cadence: `
      import FungibleToken from ${config.imports.FungibleToken}
      import FlowToken from ${config.imports.FlowToken}
    
      pub fun main(address: Address): UFix64 {
          let account = getAccount(address)
          let vaultRef = account.getCapability(/public/flowTokenBalance)!.borrow<&FlowToken.Vault{FungibleToken.Balance}>()
              ?? panic("failed to borrow a reference to the balance capability")
      
          return vaultRef.balance
      }
    `,
    args: (arg: any, t: any) => [arg(address, t.Address)],
  });

  return parseFloat(result as unknown as string);
}

export { mintFlow as mintFLOW };

export function getTestSchema(includeSerialNumber = true): metadata.Schema {
  const schema = metadata.createSchema({
    fields: {
      name: metadata.String(),
      description: metadata.String(),
      thumbnail: metadata.IPFSFile(),
    },
    views: (fields: metadata.FieldMap) => [
      metadata.NFTView(),
      metadata.DisplayView({
        name: fields.name,
        description: fields.description,
        thumbnail: fields.thumbnail,
      }),
      metadata.ExternalURLView('${collection.url}/nfts/${nft.owner}/${nft.id}'),
      metadata.NFTCollectionDisplayView(),
      metadata.NFTCollectionDataView(),
      metadata.RoyaltiesView(),
    ],
  });

  // Extend the schema with a serial number if requested
  if (includeSerialNumber) {
    return schema.extend(
      metadata.createSchema({
        fields: {
          serialNumber: metadata.UInt64(),
        },
        views: (fields: metadata.FieldMap) => [metadata.SerialView({ serialNumber: fields.serialNumber })],
      }),
    );
  }

  return schema;
}

export function getTestNFTs(count: number, includeSerialNumber = true): metadata.MetadataMap[] {
  const nfts: metadata.MetadataMap[] = [];

  for (let i = 1; i <= count; i++) {
    const nft: metadata.MetadataMap = {
      name: `NFT ${i}`,
      description: `This is NFT #${i}.`,
      thumbnail: `nft-${i}.jpeg`,
    };

    if (includeSerialNumber) {
      // Cadence UInt64 values must be passed as strings
      nft.serialNumber = i.toString();
    }

    nfts.push(nft);
  }

  return nfts;
}

export const collectionMetadata: CollectionMetadata = {
  name: 'Foo NFT Collection',
  description: 'This is the Foo NFT collection.',
  url: 'https://foo.com',
  squareImage: {
    url: 'https://foo.com/square.png',
    type: 'image/png',
  },
  bannerImage: {
    url: 'https://foo.com/banner.png',
    type: 'image/png',
  },
  socials: {
    twitter: 'https://twitter.com/foo',
  },
};
