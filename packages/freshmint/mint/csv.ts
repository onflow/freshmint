import { createWriteStream, createReadStream } from 'fs';
import * as csv from 'fast-csv';

export async function writeCSV(filename: string, rows: any[], { append = false } = {}) {
  return new Promise<void>((resolve) => {
    const csvStream = csv.format({ headers: !append, includeEndRowDelimiter: true });
    const writeStream = createWriteStream(filename, append ? { flags: 'a' } : {});

    csvStream.pipe(writeStream).on('finish', resolve);

    for (const row of rows) {
      csvStream.write(row);
    }

    csvStream.end();
  });
}

export async function readCSV(filename: string): Promise<{ [key: string]: string }[]> {
  return new Promise((resolve, reject) => {
    const rows: { [key: string]: string }[] = [];

    createReadStream(filename)
      .pipe(csv.parse({ headers: true }))
      .on('error', (error) => reject(error))
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows));
  });
}
