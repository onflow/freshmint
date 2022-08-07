import { MetadataMap } from '.';
import { Schema } from './schema';
import { hashWithSalt } from '../hash';

export type MetadataHash = { hash: Buffer; salt: Buffer };

export function hashMetadata(schema: Schema, metadata: MetadataMap): MetadataHash {
  const values = schema.getFieldList().map((field) => {
    const value = field.getValue(metadata);
    return field.serializeValue(value);
  });

  return hashWithSalt(values);
}
