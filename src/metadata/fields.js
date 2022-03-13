const t = require("@onflow/types");

const toNumber = (v) => Number(v)

class Field {
  constructor(
    label,
    type,
    placeholder,
    toArgument = (v) => v,
  ) {
    this.label = label
    this.type = type;
    this.toCadence = this.type.label
    this.placeholder = placeholder
    this.toArgument = toArgument
  }

  setIndex(fieldName, headers) {
    const index = headers.findIndex((element) => element === fieldName)
      
    if (index === -1) {
      throw new Error(
        `CSV file is missing required column: '${fieldName}'`
      )
    }

    this.index = index;
  }

  getValue(items, headers, config) {
    return items[this.index]
  }
}

class IPFSMetadataField extends Field {
  constructor() {
    super("IPFS Metadata", t.String, "");
  }

  setIndex(fieldName, headers) {}

  getValue(items, headers, config) {
    const metadata = {}

    items.forEach((value, index) => {
      metadata[headers[index]] = value
    })

    if (!metadata.image) {
      throw new Error(
        "Error generating metadata, must supply an 'image' property"
      );
    }

    if (metadata.attributes) {
      try {
        metadata.attributes = JSON.parse(metadata.attributes);
      } catch (e) {
        throw new Error(
          "Error generating metadata, 'attributes' must be valid JSON"
        );
      }
    }

    return metadata
  }
}

const String = new Field("String", t.String, "Sample string")
const Int = new Field("Int", t.Int, "42", toNumber)
const Int8 = new Field("Int8", t.Int8, "42", toNumber)
const Int16 = new Field("Int16", t.Int16, "42", toNumber)
const Int32 = new Field("Int32", t.Int32, "42", toNumber)
const Int64 = new Field("Int64", t.Int64, "42", toNumber)
const UInt = new Field("UInt", t.UInt, "42", toNumber)
const UInt8 = new Field("UInt8", t.UInt8, "42", toNumber)
const UInt16 = new Field("UInt16", t.UInt16, "42", toNumber)
const UInt32 = new Field("UInt32", t.UInt32, "42", toNumber)
const UInt64 = new Field("UInt64", t.UInt64, "42", toNumber)
const Fix64 = new Field("Fix64", t.Fix64, "42.0", toNumber)
const UFix64 = new Field("UFix64", t.UFix64, "42.0", toNumber)

const IPFSImage = new Field("IPFS Image", t.String, "lady.jpg")
const IPFSMetadata = new IPFSMetadataField()

const validFields = [
  IPFSImage,
  String,
  Int,
  Int8,
  Int16,
  Int32,
  Int64,
  UInt,
  UInt8,
  UInt16,
  UInt32,
  UInt64,
  Fix64,
  UFix64
]

const fieldTypes = validFields.map(field => field.label)
const fieldsByLabel = validFields.reduce(
  (fields, field) => ({ [field.label]: field, ...fields }),
  {}
)

function getFieldType(label) {
  return fieldsByLabel[label]
}

function parseFields(fields) {
  return fields.map((field) => ({ ...field, type: fieldsByLabel[field.type] }))
}

module.exports = {
  IPFSMetadata,
  IPFSImage,
  String,
  Int,
  Int8,
  Int16,
  Int32,
  Int64,
  UInt,
  UInt8,
  UInt16,
  UInt32,
  UInt64,
  Fix64,
  UFix64,

  fieldTypes,
  getFieldType,
  parseFields
}
