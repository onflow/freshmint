// @ts-ignore
import * as t from '@onflow/types';

import { MetadataMap, MetadataValue } from '.';
import { CadenceType, parseBool } from '../cadence/values';
import { encodeCadenceValue, getCadenceEncodingTemplate } from '../cadence/encoding';

export class Field {
  name: string;
  typeInstance: FieldTypeInstance;

  constructor(name: string, typeInstance: FieldTypeInstance) {
    this.name = name;
    this.typeInstance = typeInstance;
  }

  get type(): FieldType {
    return this.typeInstance.type;
  }

  getValue(metadata: MetadataMap): MetadataValue {
    const value = metadata[this.name];
    return this.typeInstance.parseValue(value);
  }

  asCadenceTypeObject(): CadenceType {
    return this.typeInstance.cadenceType;
  }

  asCadenceTypeString(): string {
    return this.typeInstance.cadenceType.label;
  }

  getCadenceByteTemplate(): string {
    return getCadenceEncodingTemplate(this.name, this.asCadenceTypeObject());
  }

  serializeValue(value: MetadataValue): Buffer {
    return this.typeInstance.serializeValue(value);
  }

  export(): FieldInput {
    return {
      name: this.name,
      type: this.type.id,
    };
  }
}

export class FieldTypeInstance {
  type: FieldType;

  constructor(type: FieldType) {
    this.type = type;
  }

  get cadenceType(): CadenceType {
    return this.type.cadenceType;
  }

  parseValue(value: string): MetadataValue {
    if (this.type.parseValue) {
      return this.type.parseValue(value);
    }

    return value;
  }

  serializeValue(value: MetadataValue): Buffer {
    return encodeCadenceValue(this.cadenceType, value as string);
  }
}

export interface FieldType {
  (): FieldTypeInstance;
  id: string;
  label: string;
  cadenceType: CadenceType;
  sampleValue?: string;
  parseValue?: (value: string) => MetadataValue;
}

export function defineField({
  id,
  label,
  cadenceType,
  sampleValue,
  parseValue,
}: {
  id: string;
  label: string;
  cadenceType: CadenceType;
  sampleValue?: string;
  parseValue?: (value: string) => MetadataValue;
}): FieldType {
  const fieldType = (): FieldTypeInstance => {
    // TODO: parse options
    return new FieldTypeInstance(fieldType);
  };

  fieldType.id = id;
  fieldType.label = label;
  fieldType.cadenceType = cadenceType;
  fieldType.sampleValue = sampleValue;
  fieldType.parseValue = parseValue;

  return fieldType;
}

export const String = defineField({
  id: 'string',
  label: 'String',
  cadenceType: t.String,
  sampleValue: 'This is a sample string.',
});

export const Int = defineField({
  id: 'int',
  label: 'Integer',
  cadenceType: t.Int,
  sampleValue: '-42',
});

export const UInt = defineField({
  id: 'uint',
  label: 'UInt',
  cadenceType: t.UInt,
  sampleValue: '42',
});

export const UInt64 = defineField({
  id: 'uint64',
  label: 'UInt64',
  cadenceType: t.UInt64,
  sampleValue: '42',
});

export const Fix64 = defineField({
  id: 'fix64',
  label: 'Fix64',
  cadenceType: t.Fix64,
  sampleValue: '-42.001',
});

export const UFix64 = defineField({
  id: 'ufix64',
  label: 'UFix64',
  cadenceType: t.UFix64,
  sampleValue: '42.001',
});

export const Bool = defineField({
  id: 'bool',
  label: 'Boolean',
  cadenceType: t.Bool,
  sampleValue: 'true',
  parseValue: (value: string) => parseBool(value),
});

export const HTTPFile = defineField({
  id: 'http-file',
  label: 'HTTP File',
  cadenceType: t.String,
  sampleValue: 'sample-image.jpeg',
});

export const IPFSFile = defineField({
  id: 'ipfs-file',
  label: 'IPFS File',
  cadenceType: t.String,
  sampleValue: 'sample-image.jpeg',
});

// TODO: deprecate this field
export const IPFSImage = defineField({
  id: 'ipfs-image',
  label: 'IPFS Image',
  cadenceType: t.String,
  sampleValue: 'sample-image.jpeg',
});

export const fieldTypes: FieldType[] = [String, Int, UInt, UInt64, Fix64, UFix64, Bool, IPFSImage, HTTPFile, IPFSFile];

const fieldTypesById: { [key: string]: FieldType } = fieldTypes.reduce(
  (fields, field) => ({ [field.id]: field, ...fields }),
  {},
);

function getFieldTypeById(id: string): FieldType {
  return fieldTypesById[id];
}

export type FieldMap = { [name: string]: Field };
export type FieldTypes = { [name: string]: FieldTypeInstance };
export type FieldInput = { name: string; type: string };

export function parseFields(fields: FieldInput[]): FieldTypes {
  return fields.reduce((fieldTypeMap: FieldTypes, field) => {
    const fieldType = getFieldTypeById(field.type);
    fieldTypeMap[field.name] = fieldType();
    return fieldTypeMap;
  }, {});
}
