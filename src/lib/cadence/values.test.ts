import {
  IntValue,
  Int8Value,
  Int16Value,
  Int32Value,
  Int64Value,
  UIntValue,
  UInt8Value,
  UInt16Value,
  UInt32Value,
  UInt64Value,
  Fix64Value,
  UFix64Value,
} from './values';

// Test cases from Cadence interpreter:
// https://github.com/onflow/cadence/blob/3db71b8364aee60a83dd53d8a99e935a0e5c8b78/values_test.go#L287-L442
const cases = [
  {
    type: 'Int',
    toBytes: [
      [new IntValue('0'), [0]],
      [new IntValue('42'), [42]],
      [new IntValue('127'), [127]],
      [new IntValue('128'), [0, 128]],
      [new IntValue('200'), [0, 200]],
      [new IntValue('-1'), [255]],
      [new IntValue('-200'), [255, 56]],
      [new IntValue('-12341255'), [255, 67, 175, 249]],
      [new IntValue('-10000000000000000'), [220, 121, 13, 144, 63, 0, 0]],
    ],
  },
  {
    type: 'Int8',
    toBytes: [
      [new Int8Value('0'), [0]],
      [new Int8Value('42'), [42]],
      [new Int8Value('127'), [127]],
      [new Int8Value('-1'), [255]],
      [new Int8Value('-127'), [129]],
      [new Int8Value('-128'), [128]],
    ],
  },
  {
    type: 'Int16',
    toBytes: [
      [new Int16Value('0'), [0, 0]],
      [new Int16Value('42'), [0, 42]],
      [new Int16Value('32767'), [127, 255]],
      [new Int16Value('-1'), [255, 255]],
      [new Int16Value('-32767'), [128, 1]],
      [new Int16Value('-32768'), [128, 0]],
    ],
  },
  {
    type: 'Int32',
    toBytes: [
      [new Int32Value('0'), [0, 0, 0, 0]],
      [new Int32Value('42'), [0, 0, 0, 42]],
      [new Int32Value('2147483647'), [127, 255, 255, 255]],
      [new Int32Value('-1'), [255, 255, 255, 255]],
      [new Int32Value('-2147483647'), [128, 0, 0, 1]],
      [new Int32Value('-2147483648'), [128, 0, 0, 0]],
    ],
  },
  {
    type: 'Int64',
    toBytes: [
      [new Int64Value('0'), [0, 0, 0, 0, 0, 0, 0, 0]],
      [new Int64Value('42'), [0, 0, 0, 0, 0, 0, 0, 42]],
      [new Int64Value('9223372036854775807'), [127, 255, 255, 255, 255, 255, 255, 255]],
      [new Int64Value('-1'), [255, 255, 255, 255, 255, 255, 255, 255]],
      [new Int64Value('-9223372036854775807'), [128, 0, 0, 0, 0, 0, 0, 1]],
      [new Int64Value('-9223372036854775808'), [128, 0, 0, 0, 0, 0, 0, 0]],
    ],
  },
  {
    type: 'UInt',
    toBytes: [
      [new UIntValue('0'), [0]],
      [new UIntValue('42'), [42]],
      [new UIntValue('127'), [127]],
      [new UIntValue('128'), [128]],
      [new UIntValue('200'), [200]],
    ],
  },
  {
    type: 'UInt8',
    toBytes: [
      [new UInt8Value('0'), [0]],
      [new UInt8Value('42'), [42]],
      [new UInt8Value('127'), [127]],
      [new UInt8Value('128'), [128]],
      [new UInt8Value('255'), [255]],
    ],
  },
  {
    type: 'UInt16',
    toBytes: [
      [new UInt16Value('0'), [0, 0]],
      [new UInt16Value('42'), [0, 42]],
      [new UInt16Value('32767'), [127, 255]],
      [new UInt16Value('32768'), [128, 0]],
      [new UInt16Value('65535'), [255, 255]],
    ],
  },
  {
    type: 'UInt32',
    toBytes: [
      [new UInt32Value('0'), [0, 0, 0, 0]],
      [new UInt32Value('42'), [0, 0, 0, 42]],
      [new UInt32Value('2147483647'), [127, 255, 255, 255]],
      [new UInt32Value('2147483648'), [128, 0, 0, 0]],
      [new UInt32Value('4294967295'), [255, 255, 255, 255]],
    ],
  },
  {
    type: 'UInt64',
    toBytes: [
      [new UInt64Value('0'), [0, 0, 0, 0, 0, 0, 0, 0]],
      [new UInt64Value('42'), [0, 0, 0, 0, 0, 0, 0, 42]],
      [new UInt64Value('9223372036854775807'), [127, 255, 255, 255, 255, 255, 255, 255]],
      [new UInt64Value('9223372036854775808'), [128, 0, 0, 0, 0, 0, 0, 0]],
      [new UInt64Value('18446744073709551615'), [255, 255, 255, 255, 255, 255, 255, 255]],
    ],
  },
  {
    type: 'Fix64',
    toBytes: [
      [new Fix64Value('0.0'), [0, 0, 0, 0, 0, 0, 0, 0]],
      [new Fix64Value('42.0'), [0, 0, 0, 0, 250, 86, 234, 0]],
      [new Fix64Value('42.24'), [0, 0, 0, 0, 251, 197, 32, 0]],
      [new Fix64Value('-1.0'), [255, 255, 255, 255, 250, 10, 31, 0]],
    ],
  },
  {
    type: 'UFix64',
    toBytes: [
      [new UFix64Value('0.0'), [0, 0, 0, 0, 0, 0, 0, 0]],
      [new UFix64Value('42.0'), [0, 0, 0, 0, 250, 86, 234, 0]],
      [new UFix64Value('42.24'), [0, 0, 0, 0, 251, 197, 32, 0]],
    ],
  },
];

describe.each(cases)('$type#toBytes()', ({ toBytes }) => {
  test.each(toBytes)('%s', (number, expectedBytes) => {
    expect(number.toBytes().toString('hex')).toEqual(Buffer.from(expectedBytes).toString('hex'));
  });
});
