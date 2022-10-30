import { IntValue, StringValue } from '../cadence/values';
import { Int, String, UInt } from './fields';
import { hashMetadata } from './hash';
import { createSchema } from './schema';

describe('hashMetadata', () => {
  it('should produce a unique hash for the same string concatenation', () => {
    const schema = createSchema({ fields: { foo: String(), bar: String() } });

    const fooA = 'foo';
    const barA = 'bar';

    const fooB = 'foob';
    const barB = 'ar';

    const hashA = hashMetadata(schema, { foo: fooA, bar: barA });
    const hashB = hashMetadata(schema, { foo: fooB, bar: barB });

    const encodingA = Buffer.concat([new StringValue(fooA).toBytes(), new StringValue(barA).toBytes()]);
    const encodingB = Buffer.concat([new StringValue(fooB).toBytes(), new StringValue(barB).toBytes()]);

    // ['foo', 'bar'] and ['foob', 'ar'] have the same raw byte sequence
    expect(encodingA).toEqual(encodingB);

    // Hashes are not equal due to added length prefix
    expect(hashA).not.toEqual(hashB);
  });

  it('should produce a unique hash for the same int concatenation', () => {
    const schema = createSchema({ fields: { foo: Int(), bar: Int() } });

    const fooA = '134744072';
    const barA = '134744072';

    const fooB = '2056';
    const barB = '8830587504648';

    const hashA = hashMetadata(schema, { foo: fooA, bar: barA });
    const hashB = hashMetadata(schema, { foo: fooB, bar: barB });

    const encodingA = Buffer.concat([new IntValue(fooA).toBytes(), new IntValue(barA).toBytes()]);
    const encodingB = Buffer.concat([new IntValue(fooB).toBytes(), new IntValue(barB).toBytes()]);

    // [134744072, 134744072] and [2056, 8830587504648] have the same raw byte sequence
    expect(encodingA).toEqual(encodingB);

    // Hashes are not equal due to added length prefix
    expect(hashA).not.toEqual(hashB);
  });

  it('should produce a unique hash for the same uint concatenation', () => {
    const schema = createSchema({ fields: { foo: UInt(), bar: UInt() } });

    const fooA = '134744072';
    const barA = '134744072';

    const fooB = '2056';
    const barB = '8830587504648';

    const hashA = hashMetadata(schema, { foo: fooA, bar: barA });
    const hashB = hashMetadata(schema, { foo: fooB, bar: barB });

    const encodingA = Buffer.concat([new IntValue(fooA).toBytes(), new IntValue(barA).toBytes()]);
    const encodingB = Buffer.concat([new IntValue(fooB).toBytes(), new IntValue(barB).toBytes()]);

    // [134744072, 134744072] and [2056, 8830587504648] have the same raw byte sequence
    expect(encodingA).toEqual(encodingB);

    // Hashes are not equal due to added length prefix
    expect(hashA).not.toEqual(hashB);
  });
});
