// @ts-ignore
import * as fcl from '@onflow/fcl';

// @ts-ignore
import { init, emulator, deployContract } from '@onflow/flow-js-testing';

import { EMULATOR } from './config';
import { FreshmintClient } from './client';
import { TransactionAuthorizer } from './transactions';
import { HashAlgorithm, InMemoryECPrivateKey, InMemoryECSigner, SignatureAlgorithm } from './crypto';
import * as metadata from './metadata';
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
