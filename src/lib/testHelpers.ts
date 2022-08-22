// @ts-ignore
import * as fcl from '@onflow/fcl';

import { Authorizer } from '@fresh-js/core';

import { FreshmintConfig } from './config';
import { FreshmintClient } from './client';
import { HashAlgorithm, InMemoryECPrivateKey, InMemoryECSigner, SignatureAlgorithm } from './crypto';

fcl.config().put('accessNode.api', 'http://localhost:8888');

export const config = FreshmintConfig.EMULATOR;
export const client = FreshmintClient.fromFCL(fcl, config);

export const legacyFreshmintConfig = {
  host: 'http://localhost:8888',
  contracts: config.imports,
};

const PRIVATE_KEY_HEX = '4d9287571c8bff7482ffc27ef68d5b4990f9bd009a1e9fa812aae08ba167d57f';

const privateKey = InMemoryECPrivateKey.fromHex(PRIVATE_KEY_HEX, SignatureAlgorithm.ECDSA_P256);
const signer = new InMemoryECSigner(privateKey, HashAlgorithm.SHA3_256);

export const ownerAuthorizer = new Authorizer({ address: '0xf8d6e0586b0a20c7', keyIndex: 0, signer });

export const payerAuthorizer = new Authorizer({ address: '0xf8d6e0586b0a20c7', keyIndex: 0, signer });

export const contractPublicKey = privateKey.getPublicKey();
export const contractHashAlgorithm = HashAlgorithm.SHA3_256;

export function randomContractName() {
  return `Foo${Math.floor(Math.random() * 1000)}`;
}
