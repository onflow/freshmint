import { CollectionMetadata } from './NFTContract';
import { StandardNFTContract } from './StandardNFTContract';
import { EditionNFTContract } from './EditionNFTContract';
import { BlindNFTContract } from './BlindNFTContract';
import { BlindEditionNFTContract } from './BlindEditionNFTContract';

import {
  client,
  contractHashAlgorithm,
  contractPublicKey,
  getTestSchema,
  ownerAuthorizer,
  setupEmulator,
  teardownEmulator,
} from '../testHelpers';

const contracts = [StandardNFTContract, EditionNFTContract, BlindNFTContract, BlindEditionNFTContract];

const suites = contracts.map((contractClass) => ({ contractClass }));

describe.each(suites)('Collection Metadata - $contractClass.name', ({ contractClass }) => {
  beforeAll(setupEmulator);
  afterAll(teardownEmulator);

  const ipfsImage = {
    ipfs: 'bafkreicrfbblmaduqg2kmeqbymdifawex7rxqq2743mitmeia4zdybmmre',
    type: 'image/png',
  };

  const httpImage = {
    url: 'https://foo.com/square.png',
    type: 'image/png',
  };

  const collectionMetadataIPFS: CollectionMetadata = {
    name: 'Foo NFT Collection',
    description: 'This is the Foo NFT collection.',
    url: 'https://foo.com',
    squareImage: ipfsImage,
    bannerImage: ipfsImage,
    socials: {
      twitter: 'https://twitter.com/foo',
    },
  };

  const collectionMetadataHTTP: CollectionMetadata = {
    name: 'Foo NFT Collection',
    description: 'This is the Foo NFT collection.',
    url: 'https://foo.com',
    squareImage: httpImage,
    bannerImage: httpImage,
    socials: {
      twitter: 'https://twitter.com/foo',
    },
  };

  const tests = [
    { index: 0, name: 'IPFS collection metadata', collectionMetadata: collectionMetadataIPFS },
    { index: 1, name: 'HTTP collection metadata', collectionMetadata: collectionMetadataHTTP },
  ];

  it.each(tests)('should deploy a contract with $name', async ({ index, collectionMetadata }) => {
    const contract = new contractClass({
      name: `${contractClass.name}_Collection_Metadata_Test_${index}`,
      schema: getTestSchema(),
      owner: ownerAuthorizer,
    });

    await client.send(
      contract.deploy({
        publicKey: contractPublicKey,
        hashAlgorithm: contractHashAlgorithm,
        placeholderImage: 'foo.jpeg',
        collectionMetadata,
      }),
    );

    const collectionMetadataResult = await client.query(contract.getCollectionMetadata());

    expect(collectionMetadataResult).toEqual(collectionMetadata);
  });
});
