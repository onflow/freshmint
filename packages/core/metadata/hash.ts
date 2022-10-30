import { MetadataMap } from '.';
import { Schema } from './schema';
import { encodeMetadata } from './encode';
import { hashValues, hashValuesWithSalt } from '../hash';

export function hashMetadata(schema: Schema, metadata: MetadataMap): Buffer {
  const values = encodeMetadata(schema, metadata);
  return hashValues(values);
}

export function hashMetadataWithSalt(schema: Schema, metadata: MetadataMap): { hash: Buffer; salt: Buffer } {
  const values = encodeMetadata(schema, metadata);
  return hashValuesWithSalt(values);
}
