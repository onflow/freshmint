// @ts-ignore
import * as t from '@onflow/types';

import { MetadataMap, MetadataValue } from '.';

interface CadenceType {
  label: string;
}

export class Field {
  name?: string;
  type: FieldType;
  cadenceType: CadenceType;
  sampleValue?: string;

  constructor(type: FieldType, cadenceType: CadenceType, sampleValue?: string) {
    this.type = type;
    this.cadenceType = cadenceType;
    this.sampleValue = sampleValue;
  }

  setName(name: string) {
    this.name = name;
  }

  asCadenceTypeObject(): CadenceType {
    return this.cadenceType;
  }

  asCadenceTypeString(): string {
    return this.cadenceType.label;
  }

  getValue(metadata: MetadataMap): MetadataValue {
    return metadata[this.name ?? ''];
  }

  serializeValue(value: MetadataValue): Buffer {
    // TODO: improve serialization. currently all values serializes as UTF-8 strings
    // off-chain serialization should match on-chain serialization in Cadence
    return Buffer.from(value as string, 'utf-8');
  }
}

type FieldType = {
  (): Field;
  id: string;
  label: string;
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
  const fieldType = (): Field => {
    return new Field(fieldType, cadenceType, sampleValue);
  };

  fieldType.id = id;
  fieldType.label = label;

  return fieldType;
}

export const String = defineField({
  id: 'string',
  label: 'String',
  cadenceType: t.String,
  sampleValue: 'Sample string',
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

export const IPFSImage = defineField({
  id: 'ipfs-image',
  label: 'IPFS Image',
  cadenceType: t.String,
  sampleValue: 'sample-image.jpeg',
});

export const fieldTypes = [String, Int, UInt, Fix64, UFix64, Bool, IPFSImage];

const fieldTypesById: { [key: string]: FieldType } = fieldTypes.reduce(
  (fields, field) => ({ [field.id]: field, ...fields }),
  {},
);

function getFieldTypeById(id: string): FieldType {
  return fieldTypesById[id];
}

export type Fields = { [key: string]: Field };

export type FieldInput = { name: string; type: string };

export function parseFields(fields: FieldInput[]): Fields {
  return fields.reduce((fieldMap: Fields, field) => {
    const name = field.name;
    const fieldType = getFieldTypeById(field.type);

    fieldMap[name] = fieldType();

    return fieldMap;
  }, {});
}
