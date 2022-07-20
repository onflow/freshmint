import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import parse from "csv-parse/lib/sync";

export default class MetadataParser {
  config: { onChainMetadata: any; metadataFields: any; };

  constructor(config: { onChainMetadata: any; metadataFields: any; }) {
    this.config = config
  }

  async parse(fields: any, csvPath: string) {
    const { headers, rows } = readCSV(csvPath)
    
    return this.parseTokens(headers, rows, fields)
  }

  async parseTokens(headers: { [x: string]: string; }, rows: any[], fields: any[]) {
    const tokens = rows.map((items) => {
      const values: any = {}

      items.forEach((item: any, index: number) => {
        const name = headers[index]
        values[name] = item
      })

      const metadata: any = {}
  
      fields.forEach((field) =>  {
        const value = field.getValue(values)
  
        metadata[field.name] = value
      })
  
      return {
        hash: hashMetadata(items),
        metadata,
      }
    })
  
    return {
      fields,
      tokens
    }
  }
}

function hashMetadata(values: any) {
  const hash = crypto.createHash("sha256")

  values.forEach((value: any) => hash.update(value))

  return hash.digest('hex')
}

function readCSV(csvPath: string) {
  const nftCSV = fs.readFileSync(
    path.resolve(process.cwd(), csvPath)
  )

  const records = parse(nftCSV);

  const headers = records[0];
  const rows = records.slice(1);
  
  return {
    headers, 
    rows
  }
}

module.exports = MetadataParser
