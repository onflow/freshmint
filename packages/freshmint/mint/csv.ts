import { createWriteStream } from 'fs';
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
