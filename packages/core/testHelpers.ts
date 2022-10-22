// @ts-ignore
import * as fcl from '@onflow/fcl';

// @ts-ignore
import { init, emulator, deployContract } from '@onflow/flow-js-testing';

import { EMULATOR } from './config';
import { FreshmintClient } from './client';
import { TransactionAuthorizer } from './transactions';
import { HashAlgorithm, InMemoryECPrivateKey, InMemoryECSigner, SignatureAlgorithm } from './crypto';
import * as metadata from './metadata';
import { NFTContract, CollectionMetadata } from './contracts/NFTContract';
import { FreshmintMetadataViewsGenerator } from './generators/FreshmintMetadataViewsGenerator';
import { ClaimSaleGenerator } from './generators/ClaimSaleGenerator';

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
    code: FreshmintMetadataViewsGenerator.contract(),
    to: emulatorServiceAccount,
    name: 'FreshmintMetadataViews',
  });

  await deployContract({
    code: ClaimSaleGenerator.contract({ imports: config.imports }),
    to: emulatorServiceAccount,
    name: 'FreshmintClaimSale',
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
      metadata.ExternalURLView({
        cadenceTemplate: `"http://foo.com/".concat(self.id.toString())`,
      }),
      metadata.NFTCollectionDisplayView({
        name: 'My Collection',
        description: 'This is my collection.',
        url: 'http://foo.com',
        media: {
          ipfs: 'bafkreicrfbblmaduqg2kmeqbymdifawex7rxqq2743mitmeia4zdybmmre',
          type: 'image/jpeg',
        },
      }),
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

export function royaltiesTests(client: FreshmintClient, contract: NFTContract) {
  const royaltyA = {
    address: ownerAuthorizer.address,
    receiverPath: '/public/flowTokenReceiver',
    cut: '0.1',
    description: '10% of sale proceeds go to the NFT creator in FLOW.',
  };

  const royaltyB = {
    address: ownerAuthorizer.address,
    receiverPath: '/public/fusdReceiver',
    cut: '0.05',
    description: '5% of sale proceeds go to the NFT creator in FUSD.',
  };

  it('should set a royalty recipient', async () => {
    const royalties = [royaltyA];

    await client.send(contract.setRoyalties(royalties));

    const onChainRoyalties = await client.query(contract.getRoyalties());

    onChainRoyalties.forEach((onChainRoyalty, i) => {
      const royalty = royalties[i];

      expect(onChainRoyalty.address).toEqual(royalty.address);
      expect(onChainRoyalty.receiverPath).toEqual(royalty.receiverPath);
      expect(parseFloat(onChainRoyalty.cut)).toEqual(parseFloat(royalty.cut));
      expect(onChainRoyalty.description).toEqual(royalty.description);
    });
  });

  it('should add royalty recipient', async () => {
    // Add royalty B to the list
    const royalties = [royaltyA, royaltyB];

    await client.send(contract.setRoyalties(royalties));

    const onChainRoyalties = await client.query(contract.getRoyalties());

    onChainRoyalties.forEach((onChainRoyalty, i) => {
      const royalty = royalties[i];

      expect(onChainRoyalty.address).toEqual(royalty.address);
      expect(onChainRoyalty.receiverPath).toEqual(royalty.receiverPath);
      expect(parseFloat(onChainRoyalty.cut)).toEqual(parseFloat(royalty.cut));
      expect(onChainRoyalty.description).toEqual(royalty.description);
    });
  });

  it('should update a royalty recipient', async () => {
    const updatedRoyaltyA = {
      ...royaltyA,
      // Switch to the generic fungible token receiver
      receiverPath: '/public/GenericFTReceiver',
      // Update cut to 3%
      cut: '0.03',
    };

    // Update royalty A
    const royalties = [updatedRoyaltyA, royaltyB];

    await client.send(contract.setRoyalties(royalties));

    const onChainRoyalties = await client.query(contract.getRoyalties());

    onChainRoyalties.forEach((onChainRoyalty, i) => {
      const royalty = royalties[i];

      expect(onChainRoyalty.address).toEqual(royalty.address);
      expect(onChainRoyalty.receiverPath).toEqual(royalty.receiverPath);
      expect(parseFloat(onChainRoyalty.cut)).toEqual(parseFloat(royalty.cut));
      expect(onChainRoyalty.description).toEqual(royalty.description);
    });
  });

  it('should remove all royalty recipients', async () => {
    await client.send(contract.setRoyalties([]));

    const onChainRoyalties = await client.query(contract.getRoyalties());

    expect(onChainRoyalties).toEqual([]);
  });
}

export function collectionMetadataTests(client: FreshmintClient, contract: NFTContract) {
  it('collection metadata should be empty', async () => {
    const collectionMetadata = await client.query(contract.getCollectionMetadata());
    expect(collectionMetadata).toBe(null);
  });

  it('should be able to set collection metadata', async () => {
    const collectionMetadataInput: CollectionMetadata = {
      name: 'Foo NFT Collection',
      description: 'This is the Foo NFT collection.',
      externalUrl: 'https://foo.com',
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

    await client.send(contract.setCollectionMetadata(collectionMetadataInput));

    const collectionMetadata = await client.query(contract.getCollectionMetadata());

    expect(collectionMetadata).toEqual(collectionMetadataInput);
  });

  it('should be able to update collection metadata', async () => {
    const collectionMetadataInput = {
      name: 'Bar NFT Collection',
      description: 'This is the Bar NFT collection.',
      externalUrl: 'https://bar.com',
      squareImage: {
        url: 'https://bar.com/square.png',
        type: 'image/png',
      },
      bannerImage: {
        url: 'https://bar.com/banner.png',
        type: 'image/png',
      },
      socials: {
        twitter: 'https://twitter.com/bar',
      },
    };

    await client.send(contract.setCollectionMetadata(collectionMetadataInput));

    const collectionMetadata = await client.query(contract.getCollectionMetadata());

    expect(collectionMetadata).toEqual(collectionMetadataInput);
  });
}
