import { createHash } from 'crypto';
import { SHA3 } from 'sha3';

export enum HashAlgorithm {
  SHA2_256 = 'SHA2_256',
  SHA3_256 = 'SHA3_256',
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace HashAlgorithm {
  export function toCadence(hashAlgo: HashAlgorithm) {
    switch (hashAlgo) {
      case HashAlgorithm.SHA2_256:
        return '1';
      case HashAlgorithm.SHA3_256:
        return '3';
    }
  }
}

export interface Hasher {
  hash(message: Buffer): Buffer;
}

export class SHA2_256Hasher {
  private static shaType = 'sha256';

  hash(message: Buffer): Buffer {
    const hash = createHash(SHA2_256Hasher.shaType);
    hash.update(message);
    return hash.digest();
  }
}

export class SHA3_256Hasher {
  private static size: 256 = 256;

  hash(message: Buffer): Buffer {
    const hash = new SHA3(SHA3_256Hasher.size);
    hash.update(message);
    return hash.digest();
  }
}

export function getHasher(hashAlgo: HashAlgorithm): Hasher {
  switch (hashAlgo) {
    case HashAlgorithm.SHA2_256:
      return new SHA2_256Hasher();
    case HashAlgorithm.SHA3_256:
      return new SHA3_256Hasher();
  }
}
