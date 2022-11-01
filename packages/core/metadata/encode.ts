import { MetadataMap } from '.';
import { Schema } from './schema';

export function encodeMetadata(schema: Schema, metadata: MetadataMap): Buffer[] {
  const fields = schema.fields;

  return fields.map((field) => {
    const value = field.getValue(metadata);
    return field.encodeValue(value);
  });
}
