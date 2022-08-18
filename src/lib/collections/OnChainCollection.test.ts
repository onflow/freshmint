import ClaimSale from '../sales/ClaimSale';
import * as metadata from '../metadata';

import OnChainCollection from './OnChainCollection';

import {
  client,
  config,
  contractHashAlgorithm,
  contractPublicKey,
  ownerAuthorizer,
  randomContractName,
} from '../testHelpers';

describe('OnChainCollection', () => {
  const collection = new OnChainCollection({
    name: randomContractName(),
    schema: metadata.defaultSchema,
    owner: ownerAuthorizer,
  });

  it('should generate a contract', async () => {
    collection.getContract(config.imports);
  });

  it('should deploy a contract', async () => {
    await client.send(collection.deployContract(contractPublicKey, contractHashAlgorithm));
  });

  it('should mint NFTs', async () => {
    const nfts = [
      {
        name: 'NFT 1',
        description: 'This is the first NFT.',
        thumbnail: 'nft-1.jpeg',
      },
      {
        name: 'NFT 2',
        description: 'This is the second NFT.',
        thumbnail: 'nft-2.jpeg',
      },
      {
        name: 'NFT 3',
        description: 'This is the third NFT.',
        thumbnail: 'nft-3.jpeg',
      },
    ];

    await client.send(collection.mintNFTs(nfts));
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
