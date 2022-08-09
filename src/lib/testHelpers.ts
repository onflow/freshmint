import { HashAlgorithm, InMemoryECPrivateKey, InMemoryECSigner, SignatureAlgorithm } from '@fresh-js/crypto';
import { Authorizer } from '@fresh-js/core';

// @ts-ignore
import * as fcl from '@onflow/fcl';

fcl.config().put('accessNode.api', 'http://localhost:8888');

const imports = {
  FungibleToken: '0xee82856bf20e2aa6',
  NonFungibleToken: '0xf8d6e0586b0a20c7',
  FlowToken: '0x0ae53cb6e3f42a79',
  MetadataViews: '0xf8d6e0586b0a20c7',
  NFTClaimSale: '0xf8d6e0586b0a20c7', // TODO: replace with real address
};

export const config = {
  host: 'http://localhost:8888',
  contracts: imports
}

const PRIVATE_KEY_HEX = '4d9287571c8bff7482ffc27ef68d5b4990f9bd009a1e9fa812aae08ba167d57f';

const privateKey = InMemoryECPrivateKey.fromHex(PRIVATE_KEY_HEX, SignatureAlgorithm.ECDSA_P256);
const signer = new InMemoryECSigner(privateKey, HashAlgorithm.SHA3_256);

export const ownerAuthorizer = new Authorizer({ address: '0xf8d6e0586b0a20c7', keyIndex: 0, signer });

export const payerAuthorizer = new Authorizer({ address: '0xf8d6e0586b0a20c7', keyIndex: 0, signer });

export const contractPublicKey = privateKey.getPublicKey();
export const contractHashAlgorithm = HashAlgorithm.SHA3_256;

export function randomContractName() {
  return `Foo${Math.floor(Math.random() * 1000)}`
}
