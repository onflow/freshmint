const parse = require("csv-parse/lib/sync");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const getConfig = require("./config");
const { IPFSImage, String } = require("./fields");

function hashMetadata(values) {
  const hash = crypto.createHash("sha256")

  values.forEach(value => hash.update(value))

  return hash.digest('hex');
}

function getMetadataFields(config) {
  const defaultFields = [
    {
      name: "name",
      type: String,
    },
    {
      name: "description",
      type: String,
    },
    {
      name: "image",
      type: IPFSImage,
    }
  ]

  const customFields = config.customFields

  return [
    ...defaultFields,
    ...customFields
  ]
}

function fieldsToObject(fields) {
  const values = {};

  fields.forEach(field => {
    values[field.name] = field.value
  })

  return values
}

async function generateMetadata(csvPath) {
  const config = getConfig();

  const nftCSV = fs.readFileSync(path.resolve(process.cwd(), csvPath));

  // Parse the CSV content
  const records = parse(nftCSV);

  const columns = records[0];
  const rows = records.slice(1);

  let fields = getMetadataFields(config)

  const fieldsString = fields.map(field => `'${field.name}'`).join(", ")

  if (columns.length < fields.length) {
    throw new Error(
      `CSV file must contain ${fields.length} columns: ${fieldsString}`
    )
  }

  fields = fields.map(field => {
    const index = columns.findIndex((element) => element === field.name)
    
    if (index === -1) {
      throw new Error(`CSV file is missing required column: '${field.name}'`)
    }

    return {
      ...field,
      index: index,
    }
  })

  const tokens = rows.map((columns) => {
    const orderedValues = fields.map(field => columns[field.index])
    const values = fields.reduce(
      (values, field) => ({ [
        field.name]: columns[field.index],
        ...values
      }),
      {}
    )

    return {
      hash: hashMetadata(orderedValues),
      values,
    };
  });

  return {
    fields,
    tokens
  }
};

module.exports = { 
  generateMetadata,
  getMetadataFields,
  fieldsToObject
}
