const t = require("@onflow/types");

const toNumber = (v) => Number(v)

class FieldType {
  constructor(
    label,
    cadenceType,
    placeholder,
    toArgument = (v) => v,
  ) {
    this.label = label
    this.cadenceType = cadenceType;
    this.toCadence = this.cadenceType.label
    this.placeholder = placeholder
    this.toArgument = toArgument
  }

  getValue(name, metadata) {
    return metadata[name]
  }
}

class Field {
  constructor(name, type) {
    this.name = name
    this.type = type;
  }

  getValue(metadata) {
    return this.type.getValue(this.name, metadata)
  }
}

class IPFSMetadataFieldType extends FieldType {
  constructor() {
    super("IPFS Metadata", t.String, "");
  }

  getValue(name, metadata) {
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

const String = new FieldType("String", t.String, "Sample string")
const Int = new FieldType("Int", t.Int, "42", toNumber)
const Int8 = new FieldType("Int8", t.Int8, "42", toNumber)
const Int16 = new FieldType("Int16", t.Int16, "42", toNumber)
const Int32 = new FieldType("Int32", t.Int32, "42", toNumber)
const Int64 = new FieldType("Int64", t.Int64, "42", toNumber)
const UInt = new FieldType("UInt", t.UInt, "42", toNumber)
const UInt8 = new FieldType("UInt8", t.UInt8, "42", toNumber)
const UInt16 = new FieldType("UInt16", t.UInt16, "42", toNumber)
const UInt32 = new FieldType("UInt32", t.UInt32, "42", toNumber)
const UInt64 = new FieldType("UInt64", t.UInt64, "42", toNumber)
const Fix64 = new FieldType("Fix64", t.Fix64, "42.0", toNumber)
const UFix64 = new FieldType("UFix64", t.UFix64, "42.0", toNumber)

const IPFSImage = new FieldType("IPFS Image", t.String, "lady.jpg")
const IPFSMetadata = new IPFSMetadataFieldType()

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
  return fields.map((field) => {
    const name = field.name
    const type = getFieldType(field.type)

    return new Field(name, type)
  })
}

module.exports = {
  Field,

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
  parseFields
}
