const crypto = require("crypto");
const parse = require("csv-parse/lib/sync");
const fs = require("fs");
const path = require("path");

class MetadataParser {

  constructor(config, fields) {
    this.config = config
    this.fields = fields
  }

  async parse(csvPath) {
    const { headers, rows } = readCSV(csvPath)
    
    return this.parseTokens(headers, rows, this.fields)
  }

  async parseTokens(headers, rows, fields) {
    const tokens = rows.map((items) => {
      const values = {}

      items.forEach((item, index) => {
        const name = headers[index]
        values[name] = item
      })

      const metadata = {}
  
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

function hashMetadata(values) {
  const hash = crypto.createHash("sha256")

  values.forEach(value => hash.update(value))

  return hash.digest('hex')
}

function readCSV(csvPath) {
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
