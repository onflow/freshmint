import { getHasher, HashAlgorithm } from './hash';

const HASH_ALGORITHMS = [HashAlgorithm.SHA2_256, HashAlgorithm.SHA3_256];

const MESSAGE = Buffer.from('deadbeef', 'hex');

const VALID_HASHES = {
  [HashAlgorithm.SHA2_256]: '5f78c33274e43fa9de5659265c1d917e25c03722dcb0b8d27db8d5feaa813953',
  [HashAlgorithm.SHA3_256]: '352b82608dad6c7ac3dd665bc2666e5d97803cb13f23a1109e2105e93f42c448',
};

describe.each(HASH_ALGORITHMS)('getHasher(%s)', (hashAlgo) => {
  const hasher = getHasher(hashAlgo);

  const expectedHash = Buffer.from(VALID_HASHES[hashAlgo], 'hex');

  it('should generate a valid hash', () => {
    const hash = hasher.hash(MESSAGE);

    expect(hash).toEqual(expectedHash);
  });

  it('should be able to generate multiple hashes', () => {
    const hashA = hasher.hash(MESSAGE);
    const hashB = hasher.hash(MESSAGE);

    expect(hashA).toEqual(expectedHash);
    expect(hashB).toEqual(expectedHash);
  });
});
