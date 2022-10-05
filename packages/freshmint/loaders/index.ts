export type Entry = { [key: string]: string };

export interface MetadataLoader {
  loadEntries(): Promise<Entry[]>;
}
