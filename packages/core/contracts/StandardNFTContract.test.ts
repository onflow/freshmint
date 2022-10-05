import { StandardNFTContract } from './StandardNFTContract';
import { MissingContractAddressError } from './NFTContract';
import { ClaimSaleContract } from './ClaimSaleContract';

import {
  client,
  config,
  contractHashAlgorithm,
  contractPublicKey,
  ownerAuthorizer,
  randomContractName,
  schema,
} from '../testHelpers';

describe('StandardNFTContract', () => {
  const contract = new StandardNFTContract({
    name: randomContractName(),
    schema,
    owner: ownerAuthorizer,
  });

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

  it('should generate a contract', async () => {
    contract.getSource(config.imports);
  });

  it('should fail to mint NFTs before contract is deployed', async () => {
    expect(async () => await client.send(contract.mintNFTs(nfts))).rejects.toThrow(MissingContractAddressError);
  });

  it('should deploy a contract', async () => {
    await client.send(contract.deploy(contractPublicKey, contractHashAlgorithm));
  });

  it('should mint NFTs', async () => {
    await client.send(contract.mintNFTs(nfts));
  });

  const sale = new ClaimSaleContract(contract);

  const allowlistName = 'default';

  it('should be able to add an address we do not control to the allowlist', async () => {
    // When calling addToAllowlist for the first time with a new name,
    // Freshmint will automatically create the allowlist if it does not exist.
    //
    // This call creates an allowlist with name "default" and adds address 0x0ae53cb6e3f42a79.
    await client.send(
      sale.addToAllowlist({
        name: allowlistName,
        addresses: ['0x0ae53cb6e3f42a79'],
        claims: 1, // this address will be allowed to claim 1 NFT
      }),
    );
  });

  it('should start a sale with an allowlist', async () => {
    await client.send(sale.start({ id: 'default', price: '10.0', allowlist: allowlistName }));
  });

  it('should not be able to claim an NFT when not on the allowlist', async () => {
    await expect(async () => {
      await client.send(sale.claimNFT(ownerAuthorizer.address, ownerAuthorizer, 'default'));
    }).rejects.toThrow();
  });

  it('should be able to add our address to the allowlist', async () => {
    await client.send(
      sale.addToAllowlist({
        name: allowlistName,
        addresses: [ownerAuthorizer.address],
        claims: 2, // our address will be allowed to claim 2 NFTs
      }),
    );
  });

  it('should be able to claim two NFTs when on the allowlist', async () => {
    // Claim the first NFT
    await client.send(sale.claimNFT(ownerAuthorizer.address, ownerAuthorizer, 'default'));

    // Claim the second NFT
    await client.send(sale.claimNFT(ownerAuthorizer.address, ownerAuthorizer, 'default'));
  });

  it('should not be able to claim a third NFT', async () => {
    await expect(async () => {
      await client.send(sale.claimNFT(ownerAuthorizer.address, ownerAuthorizer, 'default'));
    }).rejects.toThrow();
  });

  it('should stop a sale', async () => {
    await client.send(sale.stop('default'));
  });
});
