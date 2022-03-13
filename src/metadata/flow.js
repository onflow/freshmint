const getConfig = require("../config");
const { IPFSImage, String } = require("../fields");
const { readCSV, getMetadata } = require("./index")

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

function getFields(customFields) {
  return [
    ...defaultFields,
    ...customFields
  ]
}

function getIndexedFields(customFields, headers) {
  const fields = getFields(customFields)

  fields.forEach(field => {
    const index = headers.findIndex((element) => element === field.name)
    
    if (index === -1) {
      throw new Error(
        `CSV file is missing required column: '${field.name}'`
      )
    }

    field.type.setIndex(index)
  })

  return fields
}

async function generateMetadata(csvPath) {
  const { headers, rows } = readCSV(csvPath)

  const config = getConfig()
  const fields = getIndexedFields(config.customFields, headers)

  return getMetadata(headers, rows, fields, config)
}

module.exports = {
  getFields, 
  generateMetadata
}
