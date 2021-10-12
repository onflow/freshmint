const parse = require("csv-parse/lib/sync");
const fs = require("fs");
const path = require("path");

const getConfig = require("./config");

const generateMetaData = async (csvPath) => {
  const config = getConfig();

  const nftCSV = fs.readFileSync(path.resolve(process.cwd(), csvPath));

  // Parse the CSV content
  const records = parse(nftCSV);

  const fields = records[0];
  const data = records.slice(1);

  const metadata = data.map((values) => {
    const record = {};
    values.forEach((value, index) => {
      record[fields[index]] = value;
    });

    if (!record.image) {
      throw new Error(
        "Error generating metadata, must supply an 'image' property"
      );
    }

    if (record.attributes) {
      try {
        JSON.parse(record.attributes);
      } catch (e) {
        throw new Error(
          "Error generating metadata, 'attributes' must be valid JSON"
        );
      }
    }

    try {
      if (record.image) {
        fs.statSync(
          path.resolve(
            process.cwd(),
            `${config.nftAssetPath}/images/${record.image}`
          )
        );
      }

      if (record.animation) {
        fs.statSync(
          path.resolve(
            process.cwd(),
            `${config.nftAssetPath}/animations/${record.animation}`
          )
        );
      }
    } catch (e) {
      throw new Error(
        `Generating metadata failed, asset does not exist for ${JSON.stringify(
          record,
          null,
          2
        )}`
      );
    }

    return record;
  });

  return metadata;
};

module.exports = generateMetaData;
