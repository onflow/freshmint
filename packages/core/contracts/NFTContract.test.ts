import { StandardNFTContract } from './StandardNFTContract';

import {
  client,
  collectionMetadata,
  contractHashAlgorithm,
  contractPublicKey,
  createAccount,
  NFTGenerator,
  getTestSchema,
  ownerAuthorizer,
  setupEmulator,
  teardownEmulator,
} from '../testHelpers';

describe('Common NFT tests', () => {
  const contract = new StandardNFTContract({
    name: 'StandardNFT_Transfer_Test',
    schema: getTestSchema(),
    owner: ownerAuthorizer,
  });

  beforeAll(async () => {
    await setupEmulator();

    await client.send(
      contract.deploy({
        publicKey: contractPublicKey,
        hashAlgorithm: contractHashAlgorithm,
        collectionMetadata,
      }),
    );
  });

  afterAll(teardownEmulator);

  const nfts = new NFTGenerator();

  it('should transfer NFTs from the default queue to another account', async () => {
    // Create a new account and set up an NFT collection
    const account = await createAccount();
    await client.send(contract.setupCollection(account.authorizer));

    // Mint 5 new NFTs
    const mintedNFTs = await client.send(contract.mintNFTs(nfts.generate(5)));
    const mintedIDs = mintedNFTs.map((nft) => nft.id);

    const transferredIDs = await client.send(
      contract.transferQueueToCollection({ fromQueue: null, toAddress: account.address, count: 5 }),
    );

    // Transferred IDs should match the minted IDs
    expect(transferredIDs).toEqual(mintedIDs);
  });

  it('should transfer a single NFT to another account', async () => {
    // Create a new account and set up an NFT collection
    const account = await createAccount();
    await client.send(contract.setupCollection(account.authorizer));

    // Mint 1 new NFT
    const [nft] = await client.send(contract.mintNFTs(nfts.generate(1)));

    // Transfer the NFT to the new account
    await client.send(contract.transferNFT({ toAddress: account.address, id: nft.id }));

    const onChainNFT = await client.query(contract.getNFT(account.address, nft.id));

    // The NFT should now be in the new account
    expect(onChainNFT.id).toEqual(nft.id);
  });

  it('should transfer three NFTs from one account to another', async () => {
    // Create a new account and set up an NFT collection
    const account = await createAccount();
    await client.send(contract.setupCollection(account.authorizer));

    // Mint 3 new NFTs
    const [nft1, nft2, nft3] = await client.send(contract.mintNFTs(nfts.generate(3)));

    // Transfer the 3 NFTs to the new account
    await client.send(contract.transferNFTs({ toAddress: account.address, ids: [nft1.id, nft2.id, nft3.id] }));

    const onChainNFT1 = await client.query(contract.getNFT(account.address, nft1.id));
    const onChainNFT2 = await client.query(contract.getNFT(account.address, nft2.id));
    const onChainNFT3 = await client.query(contract.getNFT(account.address, nft3.id));

    // The 3 NFTs should now be in the new account
    expect([onChainNFT1.id, onChainNFT2.id, onChainNFT3.id]).toEqual([nft1.id, nft2.id, nft3.id]);
  });

  it('should transfer three NFTs from one account to another from a custom bucket', async () => {
    // Create a new account and set up an NFT collection
    const account = await createAccount();
    await client.send(contract.setupCollection(account.authorizer));

    const bucketName = 'foo';

    // Mint 3 new NFTs into
    const [nft1, nft2, nft3] = await client.send(contract.mintNFTs(nfts.generate(3), bucketName));

    // Transfer the 3 NFTs to the new account
    await client.send(
      contract.transferNFTs({
        toAddress: account.address,
        ids: [nft1.id, nft2.id, nft3.id],
        fromBucket: bucketName,
      }),
    );

    const onChainNFT1 = await client.query(contract.getNFT(account.address, nft1.id));
    const onChainNFT2 = await client.query(contract.getNFT(account.address, nft2.id));
    const onChainNFT3 = await client.query(contract.getNFT(account.address, nft3.id));

    // The 3 NFTs should now be in the new account
    expect([onChainNFT1.id, onChainNFT2.id, onChainNFT3.id]).toEqual([nft1.id, nft2.id, nft3.id]);
  });

  it('should destroy three NFTs', async () => {
    // Create a new account and set up an NFT collection
    const account = await createAccount();
    await client.send(contract.setupCollection(account.authorizer));

    // Mint 3 new NFTs
    const [nft1, nft2, nft3] = await client.send(contract.mintNFTs(nfts.generate(3)));

    // Destroy the 3 NFTs
    await client.send(contract.destroyNFTs( [nft1.id, nft2.id, nft3.id] ));

    const onChainNFT1 = await client.query(contract.getNFT(account.address, nft1.id));
    const onChainNFT2 = await client.query(contract.getNFT(account.address, nft2.id));
    const onChainNFT3 = await client.query(contract.getNFT(account.address, nft3.id));

    // The 3 NFTs should be null
    expect([onChainNFT1, onChainNFT2, onChainNFT3]).toEqual([null, null, null]);
  });

  it('should destroy three NFTs from a custom bucket', async () => {
    // Create a new account and set up an NFT collection
    const account = await createAccount();
    await client.send(contract.setupCollection(account.authorizer));

    const bucketName = 'foo';

    // Mint 3 new NFTs
    const [nft1, nft2, nft3] = await client.send(contract.mintNFTs(nfts.generate(3), bucketName));

    // Destroy the 3 NFTs
    await client.send(contract.destroyNFTs([nft1.id, nft2.id, nft3.id], bucketName));

    const onChainNFT1 = await client.query(contract.getNFT(account.address, nft1.id));
    const onChainNFT2 = await client.query(contract.getNFT(account.address, nft2.id));
    const onChainNFT3 = await client.query(contract.getNFT(account.address, nft3.id));

    // The 3 NFTs should be null
    expect([onChainNFT1, onChainNFT2, onChainNFT3]).toEqual([null, null, null]);
  });

});
