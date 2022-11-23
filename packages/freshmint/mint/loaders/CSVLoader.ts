import * as path from 'path';
import * as metadata from '@freshmint/core/metadata';

import { MetadataLoader } from '.';
import { readCSV } from '../csv';

export class CSVLoader implements MetadataLoader {
  csvPath: string;

  constructor(csvPath: string) {
    this.csvPath = csvPath;
  }

  async loadEntries(): Promise<metadata.MetadataMap[]> {
    return readCSV(path.resolve(process.cwd(), this.csvPath));
  }
}
