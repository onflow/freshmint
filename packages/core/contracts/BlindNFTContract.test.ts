import { BlindNFTContract, NFTMintResult } from './BlindNFTContract';
import { ClaimSaleContract } from './ClaimSaleContract';

import {
  client,
  config,
  contractHashAlgorithm,
  contractPublicKey,
  ownerAuthorizer,
  getTestSchema,
  getTestNFTs,
  royaltiesTests,
} from '../testHelpers';

describe('BlindNFTContract', () => {
  const contract = new BlindNFTContract({
    name: 'BlindNFT_Test',
    schema: getTestSchema(),
    owner: ownerAuthorizer,
  });

  it('should generate a contract', async () => {
    expect(contract.getSource(config.imports)).toMatchSnapshot();
  });

  it('should deploy a contract', async () => {
    await client.send(contract.deploy(contractPublicKey, contractHashAlgorithm, 'sample-image.jpeg'));
  });

  const nfts = getTestNFTs(3);

  let mintedNFTs: NFTMintResult[];

  it('should mint NFTs', async () => {
    mintedNFTs = await client.send(contract.mintNFTs(nfts));
  });

  it('should fail to mint the same NFTs twice', async () => {
    const nftA = mintedNFTs[0];
    await expect(client.send(contract.mintHashedNFTs([nftA]))).rejects.toThrow(
      `an NFT has already been minted with hash=${nftA.metadataHash}`,
    );
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

  it('should fail to reveal an NFT with metadata from another NFT', async () => {
    const [nftA, nftB] = mintedNFTs;

    const nft = {
      id: nftA.id,
      metadataSalt: nftB.metadataSalt,
      metadata: nftB.metadata, // Use metadata from NFT B
    };

    await expect(client.send(contract.revealNFTs([nft]))).rejects.toThrow(
      `the provided metadata hash matches NFT with ID=${nftB.id}, but expected ID=${nftA.id}`,
    );
  });

  it('should fail to reveal an NFT with the wrong salt', async () => {
    const [nftA, nftB] = mintedNFTs;

    const nft = {
      id: nftA.id,
      metadataSalt: nftB.metadataSalt, // Use salt from NFT B
      metadata: nftA.metadata,
    };

    await expect(client.send(contract.revealNFTs([nft]))).rejects.toThrow(
      'the provided metadata hash does not match any minted NFTs',
    );
  });

  it('should fail to reveal an NFT with metadata that was never minted', async () => {
    const nftA = mintedNFTs[0];

    // NFT 4 was never minted
    const nonexistentMetadata = {
      name: 'NFT 4',
      description: 'This is the fourth NFT.',
      thumbnail: 'nft-4.jpeg',
      serialNumber: '4',
    };

    const nft = {
      id: nftA.id,
      metadataSalt: nftA.metadataSalt,
      metadata: nonexistentMetadata,
    };

    await expect(client.send(contract.revealNFTs([nft]))).rejects.toThrow(
      'the provided metadata hash does not match any minted NFTs',
    );
  });

  it('should reveal NFTs', async () => {
    await client.send(contract.revealNFTs(mintedNFTs));

    // After NFTs are revealed, ensure that each
    // on-chain computed hash matches our off-chain copy.
    for (const nft of mintedNFTs) {
      const onChainHash = await client.query(contract.getRevealedNFTHash(nft.id));
      expect(onChainHash).toEqual(nft.metadataHash);
    }
  });

  royaltiesTests(contract);
});
