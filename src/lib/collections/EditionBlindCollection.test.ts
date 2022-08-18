import ClaimSale from '../sales/ClaimSale';
import * as metadata from '../metadata';

import EditionBlindCollection, { EditionResult, NFTMintResult } from './EditionBlindCollection';

import {
  client,
  config,
  contractHashAlgorithm,
  contractPublicKey,
  ownerAuthorizer,
  randomContractName,
} from '../testHelpers';

describe('EditionCollection', () => {
  const collection = new EditionBlindCollection({
    name: randomContractName(),
    schema: metadata.defaultSchema,
    owner: ownerAuthorizer,
  });

  it('should generate a contract', async () => {
    collection.getContract(config.imports);
  });

  it('should deploy a contract', async () => {
    await client.send(collection.deployContract(contractPublicKey, contractHashAlgorithm, 'sample-image.jpeg'));
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

    edition1 = await client.send(collection.createEdition(editionMetadata1));
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

    edition2 = await client.send(collection.createEdition(editionMetadata2));
  });

  let edition1mintedNFTs: NFTMintResult[];
  let edition2mintedNFTs: NFTMintResult[];

  it('should mint Edition 1 NFTs into default bucket', async () => {
    edition1mintedNFTs = await client.send(collection.mintNFTs(edition1.nfts));
  });

  const edition2Bucket = 'edition2';

  it('should mint Edition 2 NFTs into custom bucket', async () => {
    edition2mintedNFTs = await client.send(collection.mintNFTs(edition2.nfts, { bucket: edition2Bucket }));
  });

  const sale = new ClaimSale(collection);

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

  it('should reveal edition 1 NFTs', async () => {
    await client.send(collection.revealNFTs(edition1mintedNFTs));
  });

  it('should reveal edition 2 NFTs', async () => {
    await client.send(collection.revealNFTs(edition2mintedNFTs));
  });
});
