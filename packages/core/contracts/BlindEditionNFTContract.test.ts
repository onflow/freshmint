import { BlindEditionNFTContract, EditionResult, NFTMintResult } from './BlindEditionNFTContract';
import { FreshmintClaimSaleContract } from './FreshmintClaimSaleContract';

import {
  client,
  contractHashAlgorithm,
  contractPublicKey,
  ownerAuthorizer,
  getTestSchema,
  setupEmulator,
  teardownEmulator,
  collectionMetadata,
  placeholderImage,
} from '../testHelpers';

describe('BlindEditionNFTContract', () => {
  beforeAll(setupEmulator);
  afterAll(teardownEmulator);

  const contract = new BlindEditionNFTContract({
    name: 'BlindEditionNFT_Test',
    schema: getTestSchema(false),
    owner: ownerAuthorizer,
  });

  it('should generate a contract', async () => {
    expect(contract.getSource(client.config.imports)).toMatchSnapshot();
  });

  it('should deploy a contract', async () => {
    await client.send(
      contract.deploy({
        publicKey: contractPublicKey,
        hashAlgorithm: contractHashAlgorithm,
        collectionMetadata,
      }),
    );
  });

  // TODO: refactor this test case into a separate test suite
  it('should deploy a contract and save the admin resource to the contract account', async () => {
    const contractWithAdmin = new BlindEditionNFTContract({
      name: 'BlindEditionNFT_Test_ContractAdmin',
      schema: getTestSchema(false),
      owner: ownerAuthorizer,
    });

    await client.send(
      contractWithAdmin.deploy({
        publicKey: contractPublicKey,
        hashAlgorithm: contractHashAlgorithm,
        collectionMetadata,
        saveAdminResourceToContractAccount: true,
      }),
    );
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

    edition1 = await client.send(contract.createEdition(editionMetadata1));
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

    edition2 = await client.send(contract.createEdition(editionMetadata2));
  });

  let edition1mintedNFTs: NFTMintResult[];
  let edition2mintedNFTs: NFTMintResult[];

  it('should mint Edition 1 NFTs into default bucket', async () => {
    edition1mintedNFTs = await client.send(
      contract.mintNFTs({ editionId: edition1.id, serialNumbers: edition1.serialNumbers }),
    );
  });

  const edition2Bucket = 'edition2';

  it('should mint Edition 2 NFTs into custom bucket', async () => {
    edition2mintedNFTs = await client.send(
      contract.mintNFTs({ editionId: edition2.id, serialNumbers: edition2.serialNumbers, bucket: edition2Bucket }),
    );
  });

  const sale = new FreshmintClaimSaleContract(contract);

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

  it('should fail to reveal an NFT with a serial number from another NFT', async () => {
    const [nftA, nftB] = edition1mintedNFTs;

    const nft = {
      id: nftA.id,
      serialNumber: nftB.serialNumber, // Use serial number from NFT B
      salt: nftB.salt,
    };

    await expect(client.send(contract.revealNFTs([nft]))).rejects.toThrow(
      `the provided serial number hash matches NFT with ID=${nftB.id}, but expected ID=${nftA.id}`,
    );
  });

  it('should fail to reveal an NFT with the wrong salt', async () => {
    const [nftA, nftB] = edition1mintedNFTs;

    const nft = {
      id: nftA.id,
      serialNumber: nftA.serialNumber,
      salt: nftB.salt, // Use salt from NFT B
    };

    await expect(client.send(contract.revealNFTs([nft]))).rejects.toThrow(
      'the provided serial number hash does not match any minted NFTs',
    );
  });

  it('should fail to reveal an NFT with a serial number never minted', async () => {
    const [nftA, nftB] = edition1mintedNFTs;

    const nft = {
      id: nftA.id,
      serialNumber: '500', // This serial number was never minted
      salt: nftB.salt,
    };

    await expect(client.send(contract.revealNFTs([nft]))).rejects.toThrow(
      'the provided serial number hash does not match any minted NFTs',
    );
  });

  it('should reveal edition 1 NFTs', async () => {
    // Reveal both editions in the same transaction
    const mintedNFTs = [...edition1mintedNFTs, ...edition2mintedNFTs];

    await client.send(contract.revealNFTs(mintedNFTs));

    // After NFTs are revealed, ensure that each
    // on-chain computed hash matches our off-chain copy.
    for (const nft of mintedNFTs) {
      const onChainHash = await client.query(contract.getRevealedNFTHash(nft.id));
      expect(onChainHash).toEqual(nft.hash);
    }
  });
});
