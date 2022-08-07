import { MetadataMap } from '.';
import { Schema } from './schema';
import { hashValues, hashValuesWithSalt } from '../hash';

export function hashMetadata(schema: Schema, metadata: MetadataMap): Buffer {
  const values = serializeMetadata(schema, metadata);
  return hashValues(values);
}

export function hashMetadataWithSalt(schema: Schema, metadata: MetadataMap): { hash: Buffer; salt: Buffer } {
  const values = serializeMetadata(schema, metadata);
  return hashValuesWithSalt(values);
}

function serializeMetadata(schema: Schema, metadata: MetadataMap): Buffer[] {
  const fields = schema.getFieldList();

  return fields.map((field) => {
    const value = field.getValue(metadata);
    return field.serializeValue(value);
  });
}
