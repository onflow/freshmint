import * as elliptic from 'elliptic';
import { InMemoryECPrivateKey, SignatureAlgorithm } from '@fresh-js/crypto';

export function generateClaimKeyPairs(count: number) {
  const privateKeys = [];
  const publicKeys = [];

  const ec = new elliptic.ec('p256');

  while (count--) {
    const ecKeyPair = ec.genKeyPair();

    const privateKey = InMemoryECPrivateKey.fromElliptic(ecKeyPair, SignatureAlgorithm.ECDSA_P256);
    const publicKey = privateKey.getPublicKey();

    privateKeys.push(privateKey.toHex());
    publicKeys.push(publicKey.toHex());
  }

  return {
    privateKeys,
    publicKeys,
  };
}

export function formatClaimKey(nftId: string, privateKey: string) {
  return `${privateKey}${nftId}`;
}
