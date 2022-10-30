// @ts-ignore
import * as t from '@onflow/types';

// @ts-ignore
import { sansPrefix } from '@onflow/util-address';

import {
  BoolValue,
  CadenceType,
  Fix64Value,
  Int16Value,
  Int32Value,
  Int64Value,
  Int8Value,
  IntValue,
  StringValue,
  UFix64Value,
  UInt16Value,
  UInt32Value,
  UInt64Value,
  UInt8Value,
  UIntValue,
} from './values';

export function encodeCadenceValue(cadenceType: CadenceType, value: any): Buffer {
  // TODO: support Character type

  switch (cadenceType) {
    case t.Int:
      return encodeInt(value);
    case t.Int8:
      return new Int8Value(value).toBytes();
    case t.Int16:
      return new Int16Value(value).toBytes();
    case t.Int32:
      return new Int32Value(value).toBytes();
    case t.Int64:
      return new Int64Value(value).toBytes();
    case t.UInt:
      return encodeUInt(value);
    case t.UInt8:
      return new UInt8Value(value).toBytes();
    case t.UInt16:
      return new UInt16Value(value).toBytes();
    case t.UInt32:
      return new UInt32Value(value).toBytes();
    case t.UInt64:
      return new UInt64Value(value).toBytes();
    case t.UFix64:
      return new UFix64Value(value).toBytes();
    case t.Fix64:
      return new Fix64Value(value).toBytes();
    case t.String:
      return encodeString(value);
    case t.Address:
      return Buffer.from(sansPrefix(value), 'hex');
    case t.Bool:
      return new BoolValue(value).toBytes();
  }

  throw new Error(`The '${cadenceType.label}' Cadence type cannot yet be encoded in JavaScript.`);
}

function encodeInt(value: string): Buffer {
  const bytes = new IntValue(value).toBytes();
  const prefix = new UInt16Value(bytes.length.toString()).toBytes();
  return Buffer.concat([prefix, bytes]);
}

function encodeUInt(value: string): Buffer {
  const bytes = new UIntValue(value).toBytes();
  const prefix = new UInt16Value(bytes.length.toString()).toBytes();
  return Buffer.concat([prefix, bytes]);
}

function encodeString(value: string): Buffer {
  const bytes = new StringValue(value).toBytes();
  const prefix = new UInt16Value(bytes.length.toString()).toBytes();
  return Buffer.concat([prefix, bytes]);
}

export function getCadenceEncodingTemplate(name: string, cadenceType: CadenceType): string {
  // TODO: support Bool and Character types

  switch (cadenceType) {
    case t.UInt:
      return `FreshmintEncoding.encodeUInt(self.${name})`;
    case t.UInt8:
      return `FreshmintEncoding.encodeUInt8(self.${name})`;
    case t.UInt16:
      return `FreshmintEncoding.encodeUInt16(self.${name})`;
    case t.UInt32:
      return `FreshmintEncoding.encodeUInt32(self.${name})`;
    case t.UInt64:
      return `FreshmintEncoding.encodeUInt64(self.${name})`;
    case t.UInt128:
      return `FreshmintEncoding.encodeUInt128(self.${name})`;
    case t.UInt256:
      return `FreshmintEncoding.encodeUInt256(self.${name})`;
    case t.Int:
      return `FreshmintEncoding.encodeInt(self.${name})`;
    case t.Int8:
      return `FreshmintEncoding.encodeInt8(self.${name})`;
    case t.Int16:
      return `FreshmintEncoding.encodeInt16(self.${name})`;
    case t.Int32:
      return `FreshmintEncoding.encodeInt32(self.${name})`;
    case t.Int64:
      return `FreshmintEncoding.encodeInt64(self.${name})`;
    case t.Int128:
      return `FreshmintEncoding.encodeInt128(self.${name})`;
    case t.Int256:
      return `FreshmintEncoding.encodeInt256(self.${name})`;
    case t.UFix64:
      return `FreshmintEncoding.encodeUFix64(self.${name})`;
    case t.Fix64:
      return `FreshmintEncoding.encodeFix64(self.${name})`;
    case t.String:
      return `FreshmintEncoding.encodeString(self.${name})`;
    case t.Address:
      return `FreshmintEncoding.encodeAddress(self.${name})`;
  }

  throw new Error(`The '${cadenceType.label}' Cadence type cannot yet be encoded in Cadence.`);
}
