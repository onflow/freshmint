import { StandardNFTContract } from './StandardNFTContract';

import {
  client,
  collectionMetadata,
  contractHashAlgorithm,
  contractPublicKey,
  createAccount,
  getTestNFTs,
  getTestSchema,
  ownerAuthorizer,
  setupEmulator,
  teardownEmulator,
} from '../testHelpers';

describe('Transfer NFTs', () => {
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

  it('should transfer NFTs from the default queue to another account', async () => {
    // Create a new account and set up an NFT collection
    const account = await createAccount();
    await client.send(contract.setupCollection(account.authorizer));

    // Mint 5 new NFTs
    const mintedNFTs = await client.send(contract.mintNFTs(getTestNFTs(5)));
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
    const [nft] = await client.send(contract.mintNFTs(getTestNFTs(1)));

    // Transfer the NFT to the new account
    await client.send(contract.transferNFT({ toAddress: account.address, id: nft.id }));

    const onChainNFT = await client.query(contract.getNFT(account.address, nft.id));

    // The NFT should now be in the new account
    expect(onChainNFT.id).toEqual(nft.id);
  });
});
