import * as fs from 'fs';
import * as path from 'path';
import parse from 'csv-parse/lib/sync';

export type Entry = { [key: string]: string };

export function parseCSVEntries(csvPath: string): Entry[] {
  const { headers, rows } = readCSV(csvPath);

  return rows.map((items) => {
    const values: any = {};

    items.forEach((item: any, index: number) => {
      const name = headers[index];
      values[name] = item;
    });

    return values;
  });
}

function readCSV(csvPath: string): { headers: string[]; rows: string[][] } {
  const nftCSV = fs.readFileSync(path.resolve(process.cwd(), csvPath));

  const records = parse(nftCSV);

  const headers = records[0];
  const rows = records.slice(1);

  return {
    headers,
    rows,
  };
}
