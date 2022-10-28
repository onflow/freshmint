import { StandardNFTContract } from './StandardNFTContract';
import { ClaimSaleContract } from './ClaimSaleContract';

import {
  client,
  contractHashAlgorithm,
  contractPublicKey,
  ownerAuthorizer,
  getTestSchema,
  getTestNFTs,
  setupEmulator,
  teardownEmulator,
} from '../testHelpers';

describe('ClaimSaleContract', () => {
  beforeAll(setupEmulator);
  afterAll(teardownEmulator);

  const contract = new StandardNFTContract({
    name: 'StandardNFT_ClaimSale_Test',
    schema: getTestSchema(),
    owner: ownerAuthorizer,
  });

  it('should deploy the NFT contract', async () => {
    await client.send(contract.deploy(contractPublicKey, contractHashAlgorithm));
  });

  const sale = new ClaimSaleContract(contract);

  const saleID = 'default';

  it('should sell NFTs in the same order they were minted', async () => {
    const mintedNFTs = await client.send(contract.mintNFTs(getTestNFTs(10)));

    await client.send(sale.start({ id: saleID, price: '10.0' }));
    
    const saleResultA = await client.query(sale.getSale(ownerAuthorizer.address, saleID));

    expect(saleResultA?.id).toEqual(saleID);
    expect(saleResultA?.price).toEqual('10.00000000');
    expect(saleResultA?.size).toEqual(10);
    expect(saleResultA?.supply).toEqual(10);

    for (const nft of mintedNFTs) {
      const nftId = await client.send(sale.claimNFT(ownerAuthorizer.address, ownerAuthorizer, saleID));
      expect(nftId).toEqual(nft.id);
    }

    const saleResultB = await client.query(sale.getSale(ownerAuthorizer.address, saleID));

    expect(saleResultB?.supply).toEqual(0);

    // Last claim should fail since queue is empty
    await expect(async () => {
      await client.send(sale.claimNFT(ownerAuthorizer.address, ownerAuthorizer, saleID));
    }).rejects.toThrow();

    await client.send(sale.stop(saleID));
  });

  it('should skip NFTs removed from the middle of the queue', async () => {
    const [nftA, nftB, nftC, nftD, nftE] = await client.send(contract.mintNFTs(getTestNFTs(5)));

    await client.send(sale.start({ id: saleID, price: '10.0' }));

    await client.send(contract.destroyNFT(nftB.id));
    await client.send(contract.destroyNFT(nftC.id));
    await client.send(contract.destroyNFT(nftD.id));

    const nftId1 = await client.send(sale.claimNFT(ownerAuthorizer.address, ownerAuthorizer, saleID));
    const nftId2 = await client.send(sale.claimNFT(ownerAuthorizer.address, ownerAuthorizer, saleID));

    // The sale should skip over NFTs B, C, D
    expect(nftId1).toEqual(nftA.id);
    expect(nftId2).toEqual(nftE.id);

    await client.send(sale.stop(saleID));
  });

  it('should skip NFTs removed from the end of the queue', async () => {
    const [nftA, nftB, nftC, nftD, nftE] = await client.send(contract.mintNFTs(getTestNFTs(5)));

    await client.send(sale.start({ id: saleID, price: '10.0' }));

    await client.send(contract.destroyNFT(nftC.id));
    await client.send(contract.destroyNFT(nftD.id));
    await client.send(contract.destroyNFT(nftE.id));

    const nftId1 = await client.send(sale.claimNFT(ownerAuthorizer.address, ownerAuthorizer, saleID));
    const nftId2 = await client.send(sale.claimNFT(ownerAuthorizer.address, ownerAuthorizer, saleID));

    // The sale should skip over NFTs C, D, E
    expect(nftId1).toEqual(nftA.id);
    expect(nftId2).toEqual(nftB.id);

    // Last claim should fail since queue is empty
    await expect(async () => {
      await client.send(sale.claimNFT(ownerAuthorizer.address, ownerAuthorizer, saleID));
    }).rejects.toThrow();

    await client.send(sale.stop(saleID));
  });

  const allowlistName = 'default_allowlist';
  const allowlistSaleId = 'allowlist_sale';

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
    await client.send(contract.mintNFTs(getTestNFTs(3)));
    await client.send(sale.start({ id: allowlistSaleId, price: '10.0', allowlist: allowlistName }));
  });

  it('should not be able to claim an NFT when not on the allowlist', async () => {
    await expect(async () => {
      await client.send(sale.claimNFT(ownerAuthorizer.address, ownerAuthorizer, allowlistSaleId));
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
    await client.send(sale.claimNFT(ownerAuthorizer.address, ownerAuthorizer, allowlistSaleId));

    // Claim the second NFT
    await client.send(sale.claimNFT(ownerAuthorizer.address, ownerAuthorizer, allowlistSaleId));
  });

  it('should not be able to claim a third NFT', async () => {
    await expect(async () => {
      await client.send(sale.claimNFT(ownerAuthorizer.address, ownerAuthorizer, allowlistSaleId));
    }).rejects.toThrow();
  });
});
