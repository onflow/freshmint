const crypto = require("crypto");
const parse = require("csv-parse/lib/sync");
const fs = require("fs");
const path = require("path");

class MetadataParser {

  constructor(config, fields) {
    this.config = config
    this.fields = fields
  }

  getFields() {
    return this.fields
  }

  indexFields(fields, headers) {
    fields.forEach(field => {
      field.type.setIndex(field.name, headers)
    })
  
    return fields  
  }

  async parse(csvPath) {
    const { headers, rows } = readCSV(csvPath)
  
    const fields = this.indexFields(this.fields, headers)
  
    return this.parseTokens(headers, rows, fields)
  }

  async parseTokens(headers, rows, fields) {
    const tokens = rows.map((items) => {
      const metadata = {}
  
      fields.forEach((field) =>  {
        const name = field.name
        const value = field.type.getValue(items, headers, this.config)
  
        metadata[name] = value
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
