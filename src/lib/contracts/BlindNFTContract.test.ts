import * as metadata from '../metadata';

import { BlindNFTContract, NFTMintResult } from './BlindNFTContract';
import { ClaimSaleContract } from './ClaimSaleContract';

import {
  client,
  config,
  contractHashAlgorithm,
  contractPublicKey,
  ownerAuthorizer,
  randomContractName,
} from '../testHelpers';

describe('BlindNFTContract', () => {
  const contract = new BlindNFTContract({
    name: randomContractName(),
    schema: metadata.defaultSchema,
    owner: ownerAuthorizer,
  });

  it('should generate a contract', async () => {
    contract.getSource(config.imports);
  });

  it('should deploy a contract', async () => {
    await client.send(contract.deploy(contractPublicKey, contractHashAlgorithm, 'sample-image.jpeg'));
  });

  let mintedNFTs: NFTMintResult[];

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

    mintedNFTs = await client.send(contract.mintNFTs(nfts));
  });

  const sale = new ClaimSaleContract(contract);

  it('should start a sale', async () => {
    await client.send(sale.start({ id: 'default', price: '10.0' }));
  });

  it('should claim an NFT', async () => {
    await client.send(sale.claimNFT(ownerAuthorizer.address, ownerAuthorizer, 'default'));
  });

  it('should stop a sale', async () => {
    await client.send(sale.stop('default'));
  });

  it('should reveal NFTs', async () => {
    await client.send(contract.revealNFTs(mintedNFTs));
  });
});
