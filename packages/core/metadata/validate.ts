import { MetadataMap } from '.';
import { Schema } from './schema';

// Validate a metadata map against the given schema.
//
// This function throws an error if the provided metadata map
// is missing any fields defined in the schema.
//
export function validateMetadata(schema: Schema, metadata: MetadataMap) {
  const missingFields: string[] = [];

  for (const field of schema.fields) {
    if (!(field.name in metadata)) {
      missingFields.push(field.name);
    }
  }

  if (missingFields.length > 0) {
    throw new MissingMetadataFieldsError(missingFields);
  }
}

export class MissingMetadataFieldsError extends Error {
  missingFields: string[];

  constructor(missingFields: string[]) {
    super(`The provided metadata is missing one or more fields defined in your schema: ${missingFields.join(', ')}.`);
    this.missingFields = missingFields;
  }
}
