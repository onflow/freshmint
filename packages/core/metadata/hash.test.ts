import { hashMetadataWithSalt } from './hash';
import { String } from './fields';
import { createSchema } from './schema';

describe('hashMetadataWithSalt', () => {
  it('should create a salt with length 32', () => {
    const schema = createSchema({ fields: { foo: String(), bar: String() } });

    const { salt } = hashMetadataWithSalt(schema, { foo: 'foo', bar: 'bar' });

    expect(salt).toHaveLength(32);
  });
});
