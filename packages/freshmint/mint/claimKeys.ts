import * as elliptic from 'elliptic';
import { InMemoryECPrivateKey, SignatureAlgorithm } from '@freshmint/core/crypto';

export function generateClaimKeyPairs(count: number) {
  const privateKeys: string[] = [];
  const publicKeys: string[] = [];

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
