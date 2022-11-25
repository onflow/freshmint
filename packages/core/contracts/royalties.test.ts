import { StandardNFTContract } from './StandardNFTContract';
import { EditionNFTContract } from './EditionNFTContract';
import { BlindNFTContract } from './BlindNFTContract';
import { BlindEditionNFTContract } from './BlindEditionNFTContract';

import {
  client,
  collectionMetadata,
  contractHashAlgorithm,
  contractPublicKey,
  getTestSchema,
  ownerAuthorizer,
  setupEmulator,
  teardownEmulator,
} from '../testHelpers';

const contracts = [StandardNFTContract, EditionNFTContract, BlindNFTContract, BlindEditionNFTContract];

const suites = contracts.map((contractClass) => ({ contractClass }));

describe.each(suites)('Royalties - $contractClass.name', ({ contractClass }) => {
  beforeAll(setupEmulator);
  afterAll(teardownEmulator);

  const royaltyA = {
    address: ownerAuthorizer.address,
    receiverPath: '/public/flowTokenReceiver',
    cut: '0.1',
    description: '10% of sale proceeds go to the NFT creator in FLOW.',
  };

  const royaltyB = {
    address: ownerAuthorizer.address,
    receiverPath: '/public/fusdReceiver',
    cut: '0.05',
    description: '5% of sale proceeds go to the NFT creator in FUSD.',
  };

  const royaltyC = {
    address: ownerAuthorizer.address,
    receiverPath: '/public/fusdReceiver',
    cut: '0.05',
  };

  const tests = [
    { index: 0, name: 'undefined royalty list' },
    { index: 1, name: 'empty royalty list', royalties: [] },
    { index: 2, name: 'one royalty receiver', royalties: [royaltyA] },
    { index: 3, name: 'two royalty receivers', royalties: [royaltyA, royaltyB] },
    { index: 4, name: 'no royalty description', royalties: [royaltyC] },
  ];

  it.each(tests)('should deploy a contract with $name', async ({ index, royalties }) => {
    const contract = new contractClass({
      name: `${contractClass.name}_Royalties_Test_${index}`,
      schema: getTestSchema(),
      owner: ownerAuthorizer,
    });

    await client.send(
      contract.deploy({
        publicKey: contractPublicKey,
        hashAlgorithm: contractHashAlgorithm,
        collectionMetadata,
        royalties,
        // @ts-ignore
        placeholderImage: 'foo.jpeg',
      }),
    );

    const royaltiesResult = await client.query(contract.getRoyalties());

    expect(royaltiesResult).toEqual(royalties ?? []);
  });
});
