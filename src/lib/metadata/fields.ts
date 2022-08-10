// @ts-ignore
import * as t from '@onflow/types';

import { MetadataMap, MetadataValue } from '.';

interface CadenceType {
  label: string;
}

export class Field {
  name: string;
  type: FieldTypeInstance;

  constructor(name: string, type: FieldTypeInstance) {
    this.name = name;
    this.type = type
  }

  setName(name: string): void {
    this.name = name
  }

  getValue(metadata: MetadataMap): MetadataValue {
    return metadata[this.name ?? ''];
  }

  asCadenceTypeObject(): CadenceType {
    return this.type.cadenceType;
  }

  asCadenceTypeString(): string {
    return this.type.cadenceType.label;
  }

  serializeValue(value: MetadataValue): Buffer {
    return this.type.serializeValue(value);
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

  serializeValue(value: MetadataValue): Buffer {
    // TODO: improve serialization. currently all values serializes as UTF-8 strings
    // off-chain serialization should match on-chain serialization in Cadence
    return Buffer.from(value as string, 'utf-8');
  }
}

export interface FieldType {
  (): FieldTypeInstance;
  id: string;
  label: string;
  cadenceType: CadenceType;
  sampleValue?: string;
};

export function defineField({
  id,
  label,
  cadenceType,
  sampleValue,
}: {
  id: string;
  label: string;
  cadenceType: CadenceType;
  sampleValue?: string;
}): FieldType {
  const fieldType = (): FieldTypeInstance => {
    // TODO: parse options
    return new FieldTypeInstance(fieldType);
  };

  fieldType.id = id;
  fieldType.label = label;
  fieldType.cadenceType = cadenceType;
  fieldType.sampleValue = sampleValue;

  return fieldType;
}

export const String = defineField({
  id: 'string',
  label: 'String',
  cadenceType: t.String,
  sampleValue: 'Hello, World!',
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
});

export const HTTPFile = defineField({
  id: 'http-file',
  label: 'HTTP Image',
  cadenceType: t.String,
  sampleValue: 'sample-image.jpeg',
});

export const IPFSFile = defineField({
  id: 'ipfs-file',
  label: 'IPFS Image',
  cadenceType: t.String,
  sampleValue: 'sample-image.jpeg',
});

export const fieldTypes: FieldType[] = [String, Int, UInt, Fix64, UFix64, Bool, HTTPFile, IPFSFile];

const fieldTypesById: { [key: string]: FieldType } = fieldTypes.reduce(
  (fields, field) => ({ [field.id]: field, ...fields }),
  {},
);

function getFieldTypeById(id: string): FieldType {
  return fieldTypesById[id];
}

export type Fields = { [key: string]: Field };
export type FieldTypes = { [name: string]: FieldTypeInstance };
export type FieldInput = { name: string; type: string };

export function parseFields(fields: FieldInput[]): FieldTypes {
  return fields.reduce((fieldMap: FieldTypes, field) => {
    const fieldType = getFieldTypeById(field.type);
    fieldMap[field.name] = fieldType();
    return fieldMap;
  }, {});
}
