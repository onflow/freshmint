import { EditionNFTContract, EditionResult } from './EditionNFTContract';
import { FreshmintClaimSaleContract } from './FreshmintClaimSaleContract';

import {
  client,
  contractHashAlgorithm,
  contractPublicKey,
  ownerAuthorizer,
  getTestSchema,
  setupEmulator,
  teardownEmulator,
  collectionMetadata,
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
    await client.send(
      contract.deploy({
        publicKey: contractPublicKey,
        hashAlgorithm: contractHashAlgorithm,
        collectionMetadata,
      }),
    );
  });

  // TODO: refactor this test case into a separate test suite
  it('should deploy a contract and save the admin resource to the contract account', async () => {
    const contractWithAdmin = new EditionNFTContract({
      name: 'EditionNFT_Test_ContractAdmin',
      schema: getTestSchema(false),
      owner: ownerAuthorizer,
    });

    await client.send(
      contractWithAdmin.deploy({
        publicKey: contractPublicKey,
        hashAlgorithm: contractHashAlgorithm,
        collectionMetadata,
        saveAdminResourceToContractAccount: true,
      }),
    );
  });

  describe('Edition with limit and full mint', () => {
    let edition: EditionResult;

    it('should create the edition', async () => {
      const editionInput = {
        limit: 5,
        metadata: {
          name: 'Edition 1',
          description: 'This is the first edition.',
          thumbnail: 'edition-1.jpeg',
        },
      };

      edition = await client.send(contract.createEdition(editionInput));

      const onChainEdition = await client.query(contract.getEdition(edition.id));

      expect(onChainEdition.id).toEqual(edition.id);
      expect(onChainEdition.limit).toEqual(edition.limit);
      expect(onChainEdition.size).toEqual(0);
    });

    it('should mint 3 NFTs into the edition', async () => {
      const count = 3;

      await client.send(contract.mintNFTs({ editionId: edition.id, count }));

      const onChainEdition = await client.query(contract.getEdition(edition.id));

      expect(onChainEdition.id).toEqual(edition.id);
      expect(onChainEdition.limit).toEqual(edition.limit);
      expect(onChainEdition.size).toEqual(count);
    });

    it('should mint remaining 2 NFTs into the edition', async () => {
      const count = 2;

      await client.send(contract.mintNFTs({ editionId: edition.id, count }));

      const onChainEdition = await client.query(contract.getEdition(edition.id));

      expect(onChainEdition.id).toEqual(edition.id);
      expect(onChainEdition.limit).toEqual(edition.limit);
      expect(onChainEdition.size).toEqual(edition.limit);

      // Edition should now be closed
      expect(onChainEdition.isClosed).toBe(true);
    });

    it('should fail to mint more than the edition limit', async () => {
      await expect(async () => {
        await client.send(contract.mintNFTs({ editionId: edition.id, count: 5 }));
      }).rejects.toThrow();

      const onChainEdition = await client.query(contract.getEdition(edition.id));

      expect(onChainEdition.id).toEqual(edition.id);
      expect(onChainEdition.limit).toEqual(edition.limit);

      // Size should still be the limit
      expect(onChainEdition.size).toEqual(edition.limit);

      // Edition should still be closed
      expect(onChainEdition.isClosed).toBe(true);
    });
  });

  describe('Edition with limit and partial mint', () => {
    let edition: EditionResult;

    it('should create the edition', async () => {
      const editionInput = {
        limit: 5,
        metadata: {
          name: 'Edition 2',
          description: 'This is the second edition.',
          thumbnail: 'edition-2.jpeg',
        },
      };

      edition = await client.send(contract.createEdition(editionInput));

      const onChainEdition = await client.query(contract.getEdition(edition.id));

      expect(onChainEdition.id).toEqual(edition.id);
      expect(onChainEdition.limit).toEqual(edition.limit);
      expect(onChainEdition.size).toEqual(0);
    });

    const count = 3;

    it('should mint part of the edition', async () => {
      await client.send(contract.mintNFTs({ editionId: edition.id, count }));

      const onChainEdition = await client.query(contract.getEdition(edition.id));

      expect(onChainEdition.id).toEqual(edition.id);
      expect(onChainEdition.limit).toEqual(edition.limit);
      expect(onChainEdition.size).toEqual(count);
    });

    it('should close the edition early', async () => {
      await client.send(contract.closeEdition(edition.id));

      const onChainEdition = await client.query(contract.getEdition(edition.id));

      expect(onChainEdition.id).toEqual(edition.id);
      expect(onChainEdition.limit).toEqual(edition.limit);
      expect(onChainEdition.size).toEqual(count);
    });

    it('should fail to mint after closing', async () => {
      await expect(async () => {
        await client.send(contract.mintNFTs({ editionId: edition.id, count: 5 }));
      }).rejects.toThrow();

      const onChainEdition = await client.query(contract.getEdition(edition.id));

      expect(onChainEdition.id).toEqual(edition.id);
      expect(onChainEdition.limit).toEqual(edition.limit);

      // Size should still be the limit
      expect(onChainEdition.size).toEqual(count);

      // Edition should still be closed
      expect(onChainEdition.isClosed).toBe(true);
    });
  });

  describe('Edition with no limit', () => {
    let edition: EditionResult;

    it('should create the edition', async () => {
      const editionInput = {
        metadata: {
          name: 'Edition 3',
          description: 'This is the third edition.',
          thumbnail: 'edition-3.jpeg',
        },
      };

      edition = await client.send(contract.createEdition(editionInput));

      const onChainEdition = await client.query(contract.getEdition(edition.id));

      expect(onChainEdition.id).toEqual(edition.id);
      expect(onChainEdition.limit).toBeUndefined();
      expect(onChainEdition.size).toEqual(0);
    });

    const count = 3;

    it('should mint NFTs into the edition', async () => {
      await client.send(contract.mintNFTs({ editionId: edition.id, count }));

      const onChainEdition = await client.query(contract.getEdition(edition.id));

      expect(onChainEdition.id).toEqual(edition.id);
      expect(onChainEdition.limit).toBeUndefined();
      expect(onChainEdition.size).toEqual(count);
    });

    it('should close the edition', async () => {
      await client.send(contract.closeEdition(edition.id));

      const onChainEdition = await client.query(contract.getEdition(edition.id));

      expect(onChainEdition.id).toEqual(edition.id);
      expect(onChainEdition.limit).toBeUndefined();
      expect(onChainEdition.size).toEqual(count);
    });

    it('should fail to mint after closing', async () => {
      await expect(async () => {
        await client.send(contract.mintNFTs({ editionId: edition.id, count: 5 }));
      }).rejects.toThrow();

      const onChainEdition = await client.query(contract.getEdition(edition.id));

      expect(onChainEdition.id).toEqual(edition.id);
      expect(onChainEdition.limit).toBeUndefined();

      // Size should still be the limit
      expect(onChainEdition.size).toEqual(count);

      // Edition should still be closed
      expect(onChainEdition.isClosed).toBe(true);
    });
  });

  describe('Edition with a custom bucket', () => {
    const edition2Bucket = 'edition2';

    let edition1: EditionResult;
    let edition2: EditionResult;

    it('should create two editions', async () => {
      const edition1Input = {
        limit: 5,
        metadata: {
          name: 'Edition 1',
          description: 'This is the first edition.',
          thumbnail: 'edition-1.jpeg',
        },
      };

      const edition2Input = {
        limit: 5,
        metadata: {
          name: 'Edition 2',
          description: 'This is the second edition.',
          thumbnail: 'edition-2.jpeg',
        },
      };

      edition1 = await client.send(contract.createEdition(edition1Input));
      edition2 = await client.send(contract.createEdition(edition2Input));
    });

    it('should mint all edition 1 NFTs into the default bucket', async () => {
      await client.send(contract.mintNFTs({ editionId: edition1.id, count: 5 }));
    });

    it('should mint all edition 2 NFTs into a custom bucket', async () => {
      await client.send(contract.mintNFTs({ editionId: edition2.id, count: 5, bucket: edition2Bucket }));
    });

    const sale = new FreshmintClaimSaleContract(contract);

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
  });
});
