import * as metadata from '@freshmint/core/metadata';

export interface MetadataLoader {
  loadEntries(): Promise<metadata.MetadataMap[]>;
}
