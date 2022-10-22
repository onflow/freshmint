import { EditionNFTContract, EditionResult } from './EditionNFTContract';
import { ClaimSaleContract } from './ClaimSaleContract';

import {
  client,
  contractHashAlgorithm,
  contractPublicKey,
  ownerAuthorizer,
  getTestSchema,
  setupEmulator,
  teardownEmulator,
  royaltiesTests,
  collectionMetadataTests,
} from '../testHelpers';

describe('EditionNFTContract', () => {
  beforeAll(setupEmulator);
  afterAll(teardownEmulator);

  const contract = new EditionNFTContract({
    name: 'EditionNFT_Test',
    schema: getTestSchema(false),
    owner: ownerAuthorizer,
  });

  it('should generate a contract', async () => {
    expect(contract.getSource(client.config.imports)).toMatchSnapshot();
  });

  it('should deploy a contract', async () => {
    await client.send(contract.deploy(contractPublicKey, contractHashAlgorithm));
  });

  let edition1: EditionResult;
  let edition2: EditionResult;

  it('should create edition 1', async () => {
    const editionMetadata1 = {
      size: 5,
      metadata: {
        name: 'Edition 1',
        description: 'This is the first edition.',
        thumbnail: 'edition-1.jpeg',
      },
    };

    edition1 = await client.send(contract.createEdition(editionMetadata1));

    const onChainEdition = await client.query(contract.getEdition(edition1.id));

    expect(onChainEdition.id).toEqual(edition1.id);
    expect(onChainEdition.size).toEqual(edition1.size);
    expect(onChainEdition.count).toEqual(0);
  });

  it('should create edition 2', async () => {
    const editionMetadata2 = {
      size: 5,
      metadata: {
        name: 'Edition 2',
        description: 'This is the second edition.',
        thumbnail: 'edition-2.jpeg',
      },
    };

    edition2 = await client.send(contract.createEdition(editionMetadata2));

    const onChainEdition = await client.query(contract.getEdition(edition2.id));

    expect(onChainEdition.id).toEqual(edition2.id);
    expect(onChainEdition.size).toEqual(edition2.size);
    expect(onChainEdition.count).toEqual(0);
  });

  it('should mint 3 edition 1 NFTs into default bucket', async () => {
    const count = 3;

    await client.send(contract.mintNFTs({ editionId: edition1.id, count }));

    const onChainEdition = await client.query(contract.getEdition(edition1.id));

    expect(onChainEdition.id).toEqual(edition1.id);
    expect(onChainEdition.size).toEqual(edition1.size);
    expect(onChainEdition.count).toEqual(count);
  });

  it('should mint remaining 2 edition 1 NFTs into default bucket', async () => {
    const count = 2;

    await client.send(contract.mintNFTs({ editionId: edition1.id, count }));

    const onChainEdition = await client.query(contract.getEdition(edition1.id));

    expect(onChainEdition.id).toEqual(edition1.id);
    expect(onChainEdition.size).toEqual(edition1.size);
    expect(onChainEdition.count).toEqual(edition1.size);
  });

  it('should fail to mint more than edition size', async () => {
    await expect(async () => {
      await client.send(contract.mintNFTs({ editionId: edition1.id, count: 5 }));
    }).rejects.toThrow();

    const onChainEdition = await client.query(contract.getEdition(edition1.id));

    expect(onChainEdition.id).toEqual(edition1.id);
    expect(onChainEdition.size).toEqual(edition1.size);
    expect(onChainEdition.count).toEqual(edition1.size);
  });

  const edition2Bucket = 'edition2';

  it('should mint all edition 2 NFTs into custom bucket', async () => {
    await client.send(contract.mintNFTs({ editionId: edition2.id, count: edition2.size, bucket: edition2Bucket }));
  });

  const sale = new ClaimSaleContract(contract);

  const sale1 = 'sale1';
  const sale2 = 'sale2';

  describe('sale 1', () => {
    it('should start a sale from default bucket', async () => {
      await client.send(sale.start({ id: sale1, price: '10.0' }));
    });

    it('should claim an NFT', async () => {
      await client.send(sale.claimNFT(ownerAuthorizer.address, ownerAuthorizer, sale1));
    });

    it('should stop a sale', async () => {
      await client.send(sale.stop(sale1));
    });
  });

  describe('sale 2', () => {
    it('should start a sale from custom bucket', async () => {
      await client.send(sale.start({ id: sale2, price: '10.0', bucket: edition2Bucket }));
    });

    it('should claim an NFT', async () => {
      await client.send(sale.claimNFT(ownerAuthorizer.address, ownerAuthorizer, sale2));
    });

    it('should stop a sale', async () => {
      await client.send(sale.stop(sale2));
    });
  });

  royaltiesTests(client, contract);
  collectionMetadataTests(client, contract);
});
