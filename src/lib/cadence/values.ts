// @ts-ignore
import * as t from '@onflow/types';

import { sansPrefix } from '@onflow/util-address';
import { parseFixedPointValue } from './fixedPoint';

export interface CadenceType {
  label: string;
}

export interface CadenceValue {
  toBytes(): Buffer;
}

export function getCadenceByteTemplate(cadenceType: CadenceType): string {
  // TODO: support Bool and Character types

  switch (cadenceType) {
    case t.UInt:
    case t.Int:
    case t.UInt8:
    case t.Int8:
    case t.UInt16:
    case t.Int16:
    case t.UInt32:
    case t.Int32:
    case t.UInt64:
    case t.Int64:
    case t.UInt128:
    case t.Int128:
    case t.UInt256:
    case t.Int256:
    case t.UFix64:
    case t.Fix64:
      return 'toBigEndianBytes()';
    case t.String:
      return 'utf8';
    case t.Address:
      return 'toBytes()';
  }

  throw new Error(`The '${cadenceType.label}' Cadence type cannot yet be serialized on-chain.`);
}

export function serializeCadenceValue(cadenceType: CadenceType, value: string): Buffer {
  // TODO: support Character type

  switch (cadenceType) {
    case t.Int:
      return new IntValue(value).toBytes();
    case t.Int8:
      return new Int8Value(value).toBytes();
    case t.Int16:
      return new Int16Value(value).toBytes();
    case t.Int32:
      return new Int32Value(value).toBytes();
    case t.Int64:
      return new Int64Value(value).toBytes();
    case t.UInt:
      return new UIntValue(value).toBytes();
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
      return Buffer.from(value, 'utf-8');
    case t.Address:
      return Buffer.from(sansPrefix(value), 'hex');
    case t.Bool:
      return new BoolValue(value).toBytes();
  }

  throw new Error(`The '${cadenceType.label}' Cadence type cannot yet be serialized off-chain.`);
}

export class IntValue {
  number: bigint;

  constructor(value: string) {
    this.number = BigInt(value);
  }

  toBytes(): Buffer {
    // Implementation adapted from Cadence interpreter:
    // https://github.com/onflow/cadence/blob/3db71b8364aee60a83dd53d8a99e935a0e5c8b78/runtime/interpreter/big.go#L27-L58

    if (this.number < 0) {
      return this.toBytesNegative();
    } else if (this.number > 0) {
      return this.toBytesPositive();
    }

    return Buffer.from([0]);
  }

  private toBytesNegative(): Buffer {
    let number = this.number;

    const bitLength = (BigInt(number.toString(2).length) / 8n + 1n) * 8n;
    const prefix = 1n << bitLength;

    number += prefix;

    const bytes = bigIntToBytes(number);

    // Pad with 0xFF to prevent misinterpretation as positive
    if (bytes.length === 0 || (bytes.at(0) & 0x80) === 0) {
      return Buffer.concat([Buffer.from([0xff]), bytes]);
    }

    return bytes;
  }

  private toBytesPositive(): Buffer {
    const bytes = bigIntToBytes(this.number);

    // Pad with 0x0 to prevent misinterpretation as negative
    if (bytes.length > 0 && (bytes.at(0) & 0x80) !== 0) {
      return Buffer.concat([Buffer.from([0x0]), bytes]);
    }

    return bytes;
  }
}

function bigIntToBytes(number: bigint): Buffer {
  let hex = number.toString(16);

  // Pad with leading zero if hex string is uneven length
  if (hex.length % 2) {
    hex = '0' + hex;
  }

  return Buffer.from(hex, 'hex');
}

export class Int8Value {
  static byteLength = 8 / 8;

  number: number;

  constructor(value: string) {
    this.number = parseInt(value, 10);
  }

  toBytes(): Buffer {
    const buffer = Buffer.alloc(Int8Value.byteLength);

    buffer.writeInt8(this.number);

    return buffer;
  }
}

export class Int16Value {
  static byteLength = 16 / 8;

  number: number;

  constructor(value: string) {
    this.number = parseInt(value, 10);
  }

  toBytes(): Buffer {
    const buffer = Buffer.alloc(Int16Value.byteLength);

    buffer.writeInt16BE(this.number);

    return buffer;
  }
}

export class Int32Value {
  static byteLength = 32 / 8;

  number: number;

  constructor(value: string) {
    this.number = parseInt(value, 10);
  }

  toBytes(): Buffer {
    const buffer = Buffer.alloc(Int32Value.byteLength);

    buffer.writeInt32BE(this.number);

    return buffer;
  }
}

export class Int64Value {
  static byteLength = 64 / 8;

  number: bigint;

  constructor(value: string) {
    this.number = BigInt(value);
  }

  toBytes(): Buffer {
    const buffer = Buffer.alloc(Int64Value.byteLength);

    buffer.writeBigInt64BE(this.number);

    return buffer;
  }
}

export class Fix64Value {
  static scale = 8;
  static byteLength = 64 / 8;

  number: bigint;

  constructor(value: string) {
    this.number = parseFixedPointValue(value, Fix64Value.scale);
  }

  toBytes(): Buffer {
    const buffer = Buffer.alloc(Fix64Value.byteLength);

    buffer.writeBigInt64BE(this.number);

    return buffer;
  }
}

export class UIntValue {
  number: bigint;

  constructor(value: string) {
    this.number = BigInt(value);
  }

  toBytes(): Buffer {
    return bigIntToBytes(this.number);
  }
}

export class UInt8Value {
  static byteLength = 8 / 8;

  number: number;

  constructor(value: string) {
    this.number = parseInt(value, 10);
  }

  toBytes(): Buffer {
    const buffer = Buffer.alloc(Int8Value.byteLength);

    buffer.writeUInt8(this.number);

    return buffer;
  }
}

export class UInt16Value {
  static byteLength = 16 / 8;

  number: number;

  constructor(value: string) {
    this.number = parseInt(value, 10);
  }

  toBytes(): Buffer {
    const buffer = Buffer.alloc(Int16Value.byteLength);

    buffer.writeUInt16BE(this.number);

    return buffer;
  }
}

export class UInt32Value {
  static byteLength = 32 / 8;

  number: number;

  constructor(value: string) {
    this.number = parseInt(value, 10);
  }

  toBytes(): Buffer {
    const buffer = Buffer.alloc(Int32Value.byteLength);

    buffer.writeUInt32BE(this.number);

    return buffer;
  }
}

export class UInt64Value {
  static byteLength = 64 / 8;

  number: bigint;

  constructor(value: string) {
    this.number = BigInt(value);
  }

  toBytes(): Buffer {
    const buffer = Buffer.alloc(Int64Value.byteLength);

    buffer.writeBigUInt64BE(this.number);

    return buffer;
  }
}

export class UFix64Value {
  static scale = 8;
  static byteLength = 64 / 8;

  number: bigint;

  constructor(value: string) {
    this.number = parseFixedPointValue(value, UFix64Value.scale);
  }

  toBytes(): Buffer {
    const buffer = Buffer.alloc(UFix64Value.byteLength);

    buffer.writeBigUInt64BE(this.number);

    return buffer;
  }
}

function parseBool(value: string): boolean {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  throw new Error(`"${value}" is an invalid boolean value. Must be "true" or "false".`);
}

class BoolValue {
  value: boolean;

  constructor(value: string) {
    this.value = parseBool(value);
  }

  toBytes(): Buffer {
    // True:  [0x01]
    // False: [0x00]
    return Buffer.from([this.value === true ? 1 : 0]);
  }
}
