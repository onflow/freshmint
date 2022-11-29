import { EditionNFTContract, EditionResult, NFTMintResult } from './EditionNFTContract';
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
    const allMintedNFTs: NFTMintResult[] = [];

    const editionInput = {
      limit: 5,
      metadata: {
        name: 'Edition 1',
        description: 'This is the first edition.',
        thumbnail: 'edition-1.jpeg',
      },
    };

    it('should create the edition', async () => {
      edition = await client.send(contract.createEdition(editionInput));

      const onChainEdition = await client.query(contract.getEdition(edition.id));

      expect(onChainEdition.id).toEqual(edition.id);
      expect(onChainEdition.limit).toEqual(edition.limit);
      expect(onChainEdition.size).toEqual(0);
      expect(onChainEdition.burned).toEqual(0);
    });

    it('should fail to create an edition that already exists', async () => {
      await expect(async () => {
        await client.send(contract.createEdition(editionInput));
      }).rejects.toThrow('an edition has already been created with mintID');
    });

    it('should mint 4 NFTs into the edition', async () => {
      const count = 4;

      const mintedNFTs = await client.send(contract.mintNFTs({ editionId: edition.id, count }));

      for (const nft of mintedNFTs) {
        expect(nft.editionId).toEqual(edition.id);
      }

      allMintedNFTs.push(...mintedNFTs);

      const onChainEdition = await client.query(contract.getEdition(edition.id));

      expect(onChainEdition.id).toEqual(edition.id);
      expect(onChainEdition.limit).toEqual(edition.limit);
      expect(onChainEdition.size).toEqual(count);
      expect(onChainEdition.burned).toEqual(0);
    });

    it('should fail to mint more than the edition limit', async () => {
      await expect(async () => {
        await client.send(contract.mintNFTs({ editionId: edition.id, count: 2 }));
      }).rejects.toThrow('edition is closed for minting');

      const onChainEdition = await client.query(contract.getEdition(edition.id));

      // Size should be unchanged
      expect(onChainEdition.size).toEqual(4);

      expect(onChainEdition.id).toEqual(edition.id);
      expect(onChainEdition.limit).toEqual(edition.limit);
      expect(onChainEdition.burned).toEqual(0);
    });

    it('should mint 1 remaining NFT into the edition', async () => {
      const count = 1;

      const mintedNFTs = await client.send(contract.mintNFTs({ editionId: edition.id, count }));

      for (const nft of mintedNFTs) {
        expect(nft.editionId).toEqual(edition.id);
      }

      allMintedNFTs.push(...mintedNFTs);

      const onChainEdition = await client.query(contract.getEdition(edition.id));

      expect(onChainEdition.id).toEqual(edition.id);
      expect(onChainEdition.limit).toEqual(edition.limit);
      expect(onChainEdition.size).toEqual(edition.limit);
      expect(onChainEdition.burned).toEqual(0);

      // Edition should now be closed
      expect(onChainEdition.isClosed).toBe(true);
    });

    it('should fail to mint into a closed edition', async () => {
      await expect(async () => {
        await client.send(contract.mintNFTs({ editionId: edition.id, count: 1 }));
      }).rejects.toThrow('edition is closed for minting');

      const onChainEdition = await client.query(contract.getEdition(edition.id));

      // Edition should still be closed
      expect(onChainEdition.isClosed).toBe(true);

      // Edition size should be unchanged
      expect(onChainEdition.size).toEqual(edition.limit);

      expect(onChainEdition.id).toEqual(edition.id);
      expect(onChainEdition.limit).toEqual(edition.limit);
      expect(onChainEdition.burned).toEqual(0);
    });

    it('should burn an NFT and increment the edition burn count', async () => {
      const nft = allMintedNFTs[0];

      // Destroy one NFT from the edition
      await client.send(contract.destroyNFT(nft.id));

      const onChainEdition = await client.query(contract.getEdition(edition.id));

      // Burn count should increase to 1
      expect(onChainEdition.burned).toEqual(1);

      // All other edition properties should be unchanged
      expect(onChainEdition.id).toEqual(edition.id);
      expect(onChainEdition.limit).toEqual(edition.limit);
      expect(onChainEdition.size).toEqual(edition.limit);
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
      const mintedNFTs = await client.send(contract.mintNFTs({ editionId: edition.id, count }));

      for (const nft of mintedNFTs) {
        expect(nft.editionId).toEqual(edition.id);
      }

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
        await client.send(contract.mintNFTs({ editionId: edition.id, count: 1 }));
      }).rejects.toThrow('edition is closed for minting');

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
        await client.send(contract.mintNFTs({ editionId: edition.id, count: 1 }));
      }).rejects.toThrow('edition is closed for minting');

      const onChainEdition = await client.query(contract.getEdition(edition.id));

      expect(onChainEdition.id).toEqual(edition.id);
      expect(onChainEdition.limit).toBeUndefined();

      // Size should still be the limit
      expect(onChainEdition.size).toEqual(count);

      // Edition should still be closed
      expect(onChainEdition.isClosed).toBe(true);
    });

    it('should fail close the edition twice', async () => {
      await expect(async () => {
        await client.send(contract.closeEdition(edition.id));
      }).rejects.toThrow('edition is already closed');
    });
  });

  describe('Edition with a custom bucket', () => {
    const customBucketName = 'custom_bucket';

    let editionA: EditionResult;
    let editionB: EditionResult;

    it('should create two editions', async () => {
      const editionAInput = {
        limit: 5,
        metadata: {
          name: 'Edition 4',
          description: 'This is the fourth edition.',
          thumbnail: 'edition-4.jpeg',
        },
      };

      const editionBInput = {
        limit: 5,
        metadata: {
          name: 'Edition 5',
          description: 'This is the fifth edition.',
          thumbnail: 'edition-5.jpeg',
        },
      };

      editionA = await client.send(contract.createEdition(editionAInput));
      editionB = await client.send(contract.createEdition(editionBInput));
    });

    it('should mint all edition A NFTs into the default bucket', async () => {
      await client.send(contract.mintNFTs({ editionId: editionA.id, count: 5 }));
    });

    it('should mint all edition B NFTs into a custom bucket', async () => {
      await client.send(contract.mintNFTs({ editionId: editionB.id, count: 5, bucket: customBucketName }));
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
        await client.send(sale.start({ id: sale2, price: '10.0', bucket: customBucketName }));
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
