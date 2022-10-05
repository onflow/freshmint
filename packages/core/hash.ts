import { randomBytes } from 'crypto';
import { SHA3_256Hasher } from './crypto';

export function hashValues(values: Buffer[]): Buffer {
  const hasher = new SHA3_256Hasher();

  const message = Buffer.concat(values);

  return hasher.hash(message);
}

export function hashValuesWithSalt(values: Buffer[]): { hash: Buffer; salt: Buffer } {
  const salt = randomBytes(16);

  const hash = hashValues([salt, ...values]);

  return { hash, salt };
}
