// @ts-ignore
import * as fcl from '@onflow/fcl';

import { FreshmintConfig } from './config';
import { FreshmintClient } from './client';
import { TransactionAuthorizer } from './transactions';
import { HashAlgorithm, InMemoryECPrivateKey, InMemoryECSigner, SignatureAlgorithm } from './crypto';
import * as metadata from './metadata';
import NFTContract from './contracts/NFTContract';

fcl.config().put('accessNode.api', 'http://localhost:8888');

export const config = FreshmintConfig.EMULATOR;
export const client = FreshmintClient.fromFCL(fcl, config);

export const legacyFreshmintConfig = {
  host: 'http://localhost:8888',
  contracts: config.imports,
};

const PRIVATE_KEY_HEX = '4d9287571c8bff7482ffc27ef68d5b4990f9bd009a1e9fa812aae08ba167d57f';

const privateKey = InMemoryECPrivateKey.fromHex(PRIVATE_KEY_HEX, SignatureAlgorithm.ECDSA_P256);
const signer = new InMemoryECSigner(privateKey, HashAlgorithm.SHA3_256);

export const ownerAuthorizer = new TransactionAuthorizer({ address: '0xf8d6e0586b0a20c7', keyIndex: 0, signer });

export const payerAuthorizer = new TransactionAuthorizer({ address: '0xf8d6e0586b0a20c7', keyIndex: 0, signer });

export const contractPublicKey = privateKey.getPublicKey();
export const contractHashAlgorithm = HashAlgorithm.SHA3_256;

export function randomContractName() {
  return `Foo${Math.floor(Math.random() * 1000)}`;
}

export const schema = metadata.createSchema({
  fields: {
    name: metadata.String(),
    description: metadata.String(),
    thumbnail: metadata.IPFSFile(),
  },
  views: (fields: metadata.FieldMap) => [
    metadata.NFTView(),
    metadata.DisplayView({
      name: fields.name,
      description: fields.description,
      thumbnail: fields.thumbnail,
    }),
    metadata.ExternalURLView({
      cadenceTemplate: `"http://foo.com/".concat(self.id.toString())`,
    }),
    metadata.NFTCollectionDisplayView({
      name: 'My Collection',
      description: 'This is my collection.',
      url: 'http://foo.com',
      media: {
        ipfs: 'bafkreicrfbblmaduqg2kmeqbymdifawex7rxqq2743mitmeia4zdybmmre',
        type: 'image/jpeg',
      },
    }),
    metadata.NFTCollectionDataView(),
    metadata.RoyaltiesView(),
  ],
});

export function royaltiesTests(contract: NFTContract) {

  const royaltyA = {
    address: ownerAuthorizer.address,
    receiverPath: '/public/flowTokenReceiver',
    cut: '0.1',
    description: '10% of sale proceeds go to the NFT creator in FLOW.',
  };

  const royaltyB = {
    address: ownerAuthorizer.address,
    receiverPath: '/public/fusdReceiver',
    cut: '0.05',
    description: '5% of sale proceeds go to the NFT creator in FUSD.',
  };

  it('should set a royalty recipient', async () => {
    const royalties = [royaltyA];

    await client.send(contract.setRoyalties(royalties));

    const onChainRoyalties = await client.query(contract.getRoyalties());

    onChainRoyalties.forEach((onChainRoyalty, i) => {
      const royalty = royalties[i];

      expect(onChainRoyalty.address).toEqual(royalty.address);
      expect(onChainRoyalty.receiverPath).toEqual(royalty.receiverPath);
      expect(parseFloat(onChainRoyalty.cut)).toEqual(parseFloat(royalty.cut));
      expect(onChainRoyalty.description).toEqual(royalty.description);
    });
  });

  it('should add royalty recipient', async () => {
    // Add royalty B to the list
    const royalties = [royaltyA, royaltyB];

    await client.send(contract.setRoyalties(royalties));

    const onChainRoyalties = await client.query(contract.getRoyalties());

    onChainRoyalties.forEach((onChainRoyalty, i) => {
      const royalty = royalties[i];

      expect(onChainRoyalty.address).toEqual(royalty.address);
      expect(onChainRoyalty.receiverPath).toEqual(royalty.receiverPath);
      expect(parseFloat(onChainRoyalty.cut)).toEqual(parseFloat(royalty.cut));
      expect(onChainRoyalty.description).toEqual(royalty.description);
    });
  });

  it('should update a royalty recipient', async () => {
    const updatedRoyaltyA = {
      ...royaltyA,
      // Switch to the generic fungible token receiver
      receiverPath: '/public/GenericFTReceiver',
      // Update cut to 3%
      cut: '0.03',
    };

    // Update royalty A
    const royalties = [updatedRoyaltyA, royaltyB];

    await client.send(contract.setRoyalties(royalties));

    const onChainRoyalties = await client.query(contract.getRoyalties());

    onChainRoyalties.forEach((onChainRoyalty, i) => {
      const royalty = royalties[i];

      expect(onChainRoyalty.address).toEqual(royalty.address);
      expect(onChainRoyalty.receiverPath).toEqual(royalty.receiverPath);
      expect(parseFloat(onChainRoyalty.cut)).toEqual(parseFloat(royalty.cut));
      expect(onChainRoyalty.description).toEqual(royalty.description);
    });
  });

  it('should remove all royalty recipients', async () => {
    await client.send(contract.setRoyalties([]));

    const onChainRoyalties = await client.query(contract.getRoyalties());

    expect(onChainRoyalties).toEqual([]);
  });
}
