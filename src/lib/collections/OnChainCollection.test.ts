import ClaimSale from '../sales/ClaimSale';
import * as metadata from '../metadata';

import OnChainCollection from './OnChainCollection';

import { config, contractHashAlgorithm, contractPublicKey, ownerAuthorizer, randomContractName } from '../testHelpers';

describe('OnChainCollection', () => {
  const collection = new OnChainCollection({
    config,
    name: randomContractName(),

    schema: metadata.createSchema({
      fields: {
        name: metadata.String(),
        description: metadata.String(),
        thumbnail: metadata.IPFSFile(),
        video: metadata.HTTPFile(),
      },
      views: (fields: metadata.Fields) => [
        metadata.DisplayView({
          name: fields.name,
          description: fields.description,
          thumbnail: fields.thumbnail,
        }),
        metadata.MediaView({
          file: fields.video,
          mediaType: 'video/mp4'
        })
      ],
    }),
    owner: ownerAuthorizer,
  });

  it('should generate a contract', async () => {
    console.log(await collection.getContract());
  });

  it('should deploy a contract', async () => {
    await collection.deployContract(contractPublicKey, contractHashAlgorithm);
  });

  it('should mint NFTs', async () => {
    const nfts = [
      {
        name: 'NFT 1',
        description: 'This is the first NFT.',
        thumbnail: 'nft-1.jpeg',
        image: 'nft-1.jpeg',
      },
      {
        name: 'NFT 2',
        description: 'This is the second NFT.',
        thumbnail: 'nft-2.jpeg',
        image: 'nft-1.jpeg',
      },
      {
        name: 'NFT 3',
        description: 'This is the third NFT.',
        thumbnail: 'nft-3.jpeg',
        image: 'nft-1.jpeg',
      },
    ];

    await collection.mintNFTs(nfts);
  });

  const sale = new ClaimSale(collection);

  it('should start a sale', async () => {
    await sale.start({ id: 'default', price: '10.0' });
  });

  it('should claim an NFT', async () => {
    await sale.claimNFT(ownerAuthorizer.address, ownerAuthorizer, 'default');
  });

  it('should stop a sale', async () => {
    await sale.stop('default');
  });
});