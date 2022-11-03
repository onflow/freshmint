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
  collectionMetadata,
  createAccount,
  getFLOWBalance,
  mintFLOW,
  TestAccount,
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
    await client.send(
      contract.deploy({
        publicKey: contractPublicKey,
        hashAlgorithm: contractHashAlgorithm,
        collectionMetadata,
      }),
    );
  });

  const sale = new ClaimSaleContract(contract);

  const saleID = 'default';

  it('should not sell to a buyer with insufficient funds', async () => {
    const buyer = await createAccount();

    await mintFLOW(buyer.address, '5.0');

    const balanceBefore = await getFLOWBalance(buyer.address);

    // Buyer should have 5.0 FLOW
    expect(balanceBefore).toBeCloseTo(5.0);

    // Mint 1 NFT
    await client.send(contract.mintNFTs(getTestNFTs(1)));

    // Start sale for 10 FLOW
    await client.send(sale.start({ id: saleID, price: '10.0' }));

    // Claim should fail
    await expect(async () => {
      await client.send(sale.claimNFT(ownerAuthorizer.address, buyer.authorizer, saleID));
    }).rejects.toThrow();

    const balanceAfter = await getFLOWBalance(buyer.address);

    // Buyer balance should be the same
    expect(balanceAfter).toEqual(balanceBefore);
  });

  it('should sell to a buyer with sufficient funds', async () => {
    const buyer = await createAccount();

    await mintFLOW(buyer.address, '20.0');

    // Buyer should have 20.0 FLOW
    const buyerBalanceBefore = await getFLOWBalance(buyer.address);
    expect(buyerBalanceBefore).toBeCloseTo(20.0);

    const sellerBalanceBefore = await getFLOWBalance(ownerAuthorizer.address);

    // Claim should succeed
    const nftId = await client.send(sale.claimNFT(ownerAuthorizer.address, buyer.authorizer, saleID));

    // Buyer should spend 10.0 FLOW
    const buyerBalanceAfter = await getFLOWBalance(buyer.address);
    expect(buyerBalanceAfter).toBeCloseTo(buyerBalanceBefore - 10.0);

    // Seller should receive 10.0 FLOW
    const sellerBalanceAfter = await getFLOWBalance(ownerAuthorizer.address);
    expect(sellerBalanceAfter).toBeCloseTo(sellerBalanceBefore + 10.0);

    const nft = await client.query(contract.getNFT(buyer.address, nftId));

    expect(nft.id).toEqual(nftId);

    // Stop the sale
    await client.send(sale.stop(saleID));
  });

  it('should sell NFTs in the same order they were minted', async () => {
    const buyer = await createAccount();

    await mintFLOW(buyer.address, '1000.0');

    const mintedNFTs = await client.send(contract.mintNFTs(getTestNFTs(10)));

    await client.send(sale.start({ id: saleID, price: '10.0' }));

    const saleResultA = await client.query(sale.getSale(ownerAuthorizer.address, saleID));

    expect(saleResultA).toEqual({
      id: saleID,
      price: '10.00000000',
      size: 10,
      supply: 10,
    });

    for (const nft of mintedNFTs) {
      const nftId = await client.send(sale.claimNFT(ownerAuthorizer.address, buyer.authorizer, saleID));
      expect(nftId).toEqual(nft.id);
    }
  });

  it('should fail to claim from an empty sale', async () => {
    const buyer = await createAccount();

    await mintFLOW(buyer.address, '1000.0');

    const saleResult = await client.query(sale.getSale(ownerAuthorizer.address, saleID));

    expect(saleResult?.supply).toEqual(0);

    // Last claim should fail since queue is empty
    await expect(async () => {
      await client.send(sale.claimNFT(ownerAuthorizer.address, buyer.authorizer, saleID));
    }).rejects.toThrow();

    await client.send(sale.stop(saleID));
  });

  it('should fail to claim from a stopped sale', async () => {
    const buyer = await createAccount();

    await mintFLOW(buyer.address, '1000.0');

    // Last claim should fail since sale does not exist
    await expect(async () => {
      await client.send(sale.claimNFT(ownerAuthorizer.address, buyer.authorizer, saleID));
    }).rejects.toThrow();
  });

  it('should skip NFTs removed from the middle of the queue', async () => {
    const buyer = await createAccount();

    await mintFLOW(buyer.address, '1000.0');

    const [nftA, nftB, nftC, nftD, nftE] = await client.send(contract.mintNFTs(getTestNFTs(5)));

    await client.send(sale.start({ id: saleID, price: '10.0' }));

    await client.send(contract.destroyNFT(nftB.id));
    await client.send(contract.destroyNFT(nftC.id));
    await client.send(contract.destroyNFT(nftD.id));

    const nftId1 = await client.send(sale.claimNFT(ownerAuthorizer.address, buyer.authorizer, saleID));
    const nftId2 = await client.send(sale.claimNFT(ownerAuthorizer.address, buyer.authorizer, saleID));

    // The sale should skip over NFTs B, C, D
    expect(nftId1).toEqual(nftA.id);
    expect(nftId2).toEqual(nftE.id);

    await client.send(sale.stop(saleID));
  });

  it('should skip NFTs removed from the end of the queue', async () => {
    const buyer = await createAccount();

    await mintFLOW(buyer.address, '1000.0');

    const [nftA, nftB, nftC, nftD, nftE] = await client.send(contract.mintNFTs(getTestNFTs(5)));

    await client.send(sale.start({ id: saleID, price: '10.0' }));

    await client.send(contract.destroyNFT(nftC.id));
    await client.send(contract.destroyNFT(nftD.id));
    await client.send(contract.destroyNFT(nftE.id));

    const nftId1 = await client.send(sale.claimNFT(ownerAuthorizer.address, buyer.authorizer, saleID));
    const nftId2 = await client.send(sale.claimNFT(ownerAuthorizer.address, buyer.authorizer, saleID));

    // The sale should skip over NFTs C, D, E
    expect(nftId1).toEqual(nftA.id);
    expect(nftId2).toEqual(nftB.id);

    // Last claim should fail since queue is empty
    await expect(async () => {
      await client.send(sale.claimNFT(ownerAuthorizer.address, ownerAuthorizer, saleID));
    }).rejects.toThrow();

    await client.send(sale.stop(saleID));
  });

  describe('With allowlist', () => {
    const allowlistName = 'default_allowlist';
    const allowlistSaleId = 'allowlist_sale';

    let buyer: TestAccount;

    beforeAll(async () => {
      buyer = await createAccount();
      await mintFLOW(buyer.address, '1000.0');
    });

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
        await client.send(sale.claimNFT(ownerAuthorizer.address, buyer.authorizer, allowlistSaleId));
      }).rejects.toThrow();
    });

    it('should be able to add our address to the allowlist', async () => {
      await client.send(
        sale.addToAllowlist({
          name: allowlistName,
          addresses: [buyer.address],
          claims: 2, // our address will be allowed to claim 2 NFTs
        }),
      );
    });

    it('should be able to claim two NFTs when on the allowlist', async () => {
      // Claim the first NFT
      await client.send(sale.claimNFT(ownerAuthorizer.address, buyer.authorizer, allowlistSaleId));

      // Claim the second NFT
      await client.send(sale.claimNFT(ownerAuthorizer.address, buyer.authorizer, allowlistSaleId));
    });

    it('should not be able to claim a third NFT', async () => {
      await expect(async () => {
        await client.send(sale.claimNFT(ownerAuthorizer.address, buyer.authorizer, allowlistSaleId));
      }).rejects.toThrow();
    });
  });
});
