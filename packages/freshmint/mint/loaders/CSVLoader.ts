import * as fs from 'fs';
import * as path from 'path';
import parse from 'csv-parse/lib/sync';
import { MetadataLoader } from '.';
import { Entry } from '../entries';

export default class CSVLoader implements MetadataLoader {
  csvPath: string;

  constructor(csvPath: string) {
    this.csvPath = csvPath;
  }

  async loadEntries(): Promise<Entry[]> {
    const { headers, rows } = CSVLoader.readCSV(this.csvPath);

    return rows.map((items) => {
      const values: any = {};

      items.forEach((item: any, index: number) => {
        const name = headers[index];
        values[name] = item;
      });

      return values;
    });
  }

  private static readCSV(csvPath: string): { headers: string[]; rows: string[][] } {
    const nftCSV = fs.readFileSync(path.resolve(process.cwd(), csvPath));

    const records = parse(nftCSV);

    const headers = records[0];
    const rows = records.slice(1);

    return {
      headers,
      rows,
    };
  }
}
