export enum SignatureAlgorithm {
  ECDSA_P256 = 'ECDSA_P256',
  ECDSA_secp256k1 = 'ECDSA_secp256k1',
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace SignatureAlgorithm {
  export function toCadence(sigAlgo: SignatureAlgorithm) {
    switch (sigAlgo) {
      case SignatureAlgorithm.ECDSA_P256:
        return '1';
      case SignatureAlgorithm.ECDSA_secp256k1:
        return '2';
    }
  }
}

export interface Signer {
  sign(message: Buffer): Buffer;
}
