import { MetadataMap } from '@freshmint/core/metadata';

export type Entry = { [key: string]: string };

export interface PreparedEntry {
  metadata: PreparedMetadata;
}

export type PreparedMetadata = { [name: string]: PreparedMetadataValue };

export type PreparedMetadataValue = {
  raw: any;
  prepared: any;
};

export function preparedValues(preparedMetadata: PreparedMetadata): MetadataMap {
  const metadata: MetadataMap = {};

  for (const name in preparedMetadata) {
    metadata[name] = preparedMetadata[name].prepared;
  }

  return metadata;
}
