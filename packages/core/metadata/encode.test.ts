import { IntValue, StringValue, UIntValue } from '../cadence/values';
import { encodeMetadata } from './encode';
import { Int, String, UInt } from './fields';
import { createSchema } from './schema';

describe('encodeMetadata', () => {
  it('should produce a unique encoding for the same string concatenation', () => {
    const schema = createSchema({ fields: { foo: String(), bar: String() } });

    const fooA = 'foo';
    const barA = 'bar';

    const fooB = 'foob';
    const barB = 'ar';

    const encodingA = encodeMetadata(schema, { foo: fooA, bar: barA });
    const encodingB = encodeMetadata(schema, { foo: fooB, bar: barB });

    const rawEncodingA = Buffer.concat([new StringValue(fooA).toBytes(), new StringValue(barA).toBytes()]);
    const rawEncodingB = Buffer.concat([new StringValue(fooB).toBytes(), new StringValue(barB).toBytes()]);

    // ['foo', 'bar'] and ['foob', 'ar'] have the same raw byte sequence
    expect(rawEncodingA).toEqual(rawEncodingB);

    // Encodings are not equal due to added length prefix
    expect(encodingA).not.toEqual(encodingB);
  });

  it('should produce a unique encoding for the same int concatenation', () => {
    const schema = createSchema({ fields: { foo: Int(), bar: Int() } });

    const fooA = '134744072';
    const barA = '134744072';

    const fooB = '2056';
    const barB = '8830587504648';

    const encodingA = encodeMetadata(schema, { foo: fooA, bar: barA });
    const encodingB = encodeMetadata(schema, { foo: fooB, bar: barB });

    const rawEncodingA = Buffer.concat([new IntValue(fooA).toBytes(), new IntValue(barA).toBytes()]);
    const rawEncodingB = Buffer.concat([new IntValue(fooB).toBytes(), new IntValue(barB).toBytes()]);

    // [134744072, 134744072] and [2056, 8830587504648] have the same raw byte sequence
    expect(rawEncodingA).toEqual(rawEncodingB);

    // Encodings are not equal due to added length prefix
    expect(encodingA).not.toEqual(encodingB);
  });

  it('should produce a unique encoding for the same uint concatenation', () => {
    const schema = createSchema({ fields: { foo: UInt(), bar: UInt() } });

    const fooA = '134744072';
    const barA = '134744072';

    const fooB = '2056';
    const barB = '8830587504648';

    const encodingA = encodeMetadata(schema, { foo: fooA, bar: barA });
    const encodingB = encodeMetadata(schema, { foo: fooB, bar: barB });

    const rawEncodingA = Buffer.concat([new UIntValue(fooA).toBytes(), new UIntValue(barA).toBytes()]);
    const rawEncodingB = Buffer.concat([new UIntValue(fooB).toBytes(), new UIntValue(barB).toBytes()]);

    // [134744072, 134744072] and [2056, 8830587504648] have the same raw byte sequence
    expect(rawEncodingA).toEqual(rawEncodingB);

    // Encodings are not equal due to added length prefix
    expect(encodingA).not.toEqual(encodingB);
  });
});
