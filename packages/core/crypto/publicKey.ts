import { SignatureAlgorithm } from './sign';

export interface PublicKey {
  verify(message: Buffer, signature: Buffer): boolean;
  toBuffer(): Buffer;
  toHex(): string;
  signatureAlgorithm(): SignatureAlgorithm;
}
