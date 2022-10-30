import { randomBytes } from 'crypto';
import { SHA3_256Hasher } from './crypto';

export function hashValues(values: Buffer[]): Buffer {
  const hasher = new SHA3_256Hasher();

  const message = Buffer.concat(values);

  return hasher.hash(message);
}

export function hashValuesWithSalt(values: Buffer[]): { hash: Buffer; salt: Buffer } {
  // Salt size should be the same as the hash size (32 bytes for SHA3_256)
  const salt = randomBytes(SHA3_256Hasher.size / 8);

  const hash = hashValues([salt, ...values]);

  return { hash, salt };
}
