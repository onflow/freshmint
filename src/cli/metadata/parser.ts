import * as fs from "fs";
import * as path from "path";
import parse from "csv-parse/lib/sync";
import { metadata } from "../../lib";
import { hashMetadata } from "../../lib/metadata";

export default class MetadataParser {

  async parse(schema: metadata.Schema, csvPath: string) {
    const { headers, rows } = readCSV(csvPath)
    
    return this.parseTokens(headers, rows, schema)
  }

  async parseTokens(headers: { [x: string]: string; }, rows: any[], schema: metadata.Schema) {
    const fields = schema.getFieldList()

    const tokens = rows.map((items) => {
      const values: any = {}

      items.forEach((item: any, index: number) => {
        const name = headers[index]
        values[name] = item
      })

      const metadata: metadata.MetadataMap = {}

      fields.forEach((field) =>  {
        const value = field.getValue(values)
  
        metadata[field.name] = value
      })
  
      const hash = hashMetadata(schema, metadata).toString("hex");

      return {
        hash,
        metadata,
      }
    })
  
    return {
      fields,
      tokens
    }
  }
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
