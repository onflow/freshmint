const t = require("@onflow/types");

const toNumber = (v) => Number(v)

class FieldType {

  constructor(
    name,
    label,
    cadenceType,
    placeholder,
    toArgument = (v) => v,
  ) {
    this.name = name
    this.label = label
    this.cadenceType = cadenceType;
    this.toCadence = this.cadenceType.label
    this.placeholder = placeholder
    this.toArgument = toArgument
  }

  getValue(fieldName, metadata) {
    return metadata[fieldName]
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
    super("ipfs-metadata", "IPFS Metadata", t.String, "");
  }

  getValue(fieldName, metadata) {
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

const String = new FieldType("string", "String", t.String, "Sample string")
const Int = new FieldType("int", "Int", t.Int, "42", toNumber)
const Int8 = new FieldType("int8", "Int8", t.Int8, "42", toNumber)
const Int16 = new FieldType("int16", "Int16", t.Int16, "42", toNumber)
const Int32 = new FieldType("int32", "Int32", t.Int32, "42", toNumber)
const Int64 = new FieldType("int64", "Int64", t.Int64, "42", toNumber)
const UInt = new FieldType("uint", "UInt", t.UInt, "42", toNumber)
const UInt8 = new FieldType("uint8", "UInt8", t.UInt8, "42", toNumber)
const UInt16 = new FieldType("uint16", "UInt16", t.UInt16, "42", toNumber)
const UInt32 = new FieldType("uint32", "UInt32", t.UInt32, "42", toNumber)
const UInt64 = new FieldType("uint64", "UInt64", t.UInt64, "42", toNumber)
const Fix64 = new FieldType("fix64", "Fix64", t.Fix64, "42.0", toNumber)
const UFix64 = new FieldType("ufix64", "UFix64", t.UFix64, "42.0", toNumber)

const IPFSImage = new FieldType("ipfs-image", "IPFS Image", t.String, "lady.jpg")
const IPFSMetadata = new IPFSMetadataFieldType()

// Fields that the user can select during project creation
const validFieldTypes = [
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

const fieldTypesByName = validFieldTypes.reduce(
  (fields, field) => ({ [field.name]: field, ...fields }),
  {}
)

function getFieldTypeByName(name) {
  return fieldTypesByName[name]
}

function parseFields(fields) {
  return fields.map((field) => {
    const name = field.name
    const type = getFieldTypeByName(field.type)

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

  fieldTypes: validFieldTypes,
  parseFields
}
