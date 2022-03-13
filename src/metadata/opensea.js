const { IPFSMetadata } = require("../fields");

const getConfig = require("../config");
const { readCSV, getMetadata } = require("./index")

const defaultFields = [
  {
    name: "metadata",
    type: IPFSMetadata,
  }
]

async function generateMetadata(csvPath) {
  const { headers, rows } = readCSV(csvPath)

  const config = getConfig()

  return getMetadata(headers, rows, defaultFields, config)
};

module.exports = {
  getFields: () => defaultFields,
  generateMetadata
}
