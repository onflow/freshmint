const crypto = require("crypto");
const parse = require("csv-parse/lib/sync");
const fs = require("fs");
const path = require("path");

async function getMetadata(headers, rows, fields, config) {
  const tokens = rows.map((items) => {
    const values = {}

    fields.forEach((field) =>  {
      const name = field.name
      const value = field.type.getValue(items, headers, config)

      values[name] = value
    })

    return {
      hash: hashMetadata(items),
      values,
    }
  })

  return {
    fields,
    tokens
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

module.exports = {
  getMetadata,
  hashMetadata,
  readCSV
}
