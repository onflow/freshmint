import { randomBytes } from 'crypto';
import { SHA3_256Hasher } from '@fresh-js/crypto';

export function hashWithSalt(values: Buffer[]): { hash: Buffer; salt: Buffer } {
  const hasher = new SHA3_256Hasher();

  const salt = randomBytes(16);

  let message = Buffer.concat([salt, ...values]);

  const hash = hasher.hash(message);

  return { hash, salt };
}
