import { Entry } from '../entries';

export interface MetadataLoader {
  loadEntries(): Promise<Entry[]>;
}
