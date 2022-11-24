# Freshmint Node.js Library

The Freshmint Node.js package provides the core pieces needed to deploy,
mint and distribute NFTs on Flow from a Node.js application.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**

- [Installation](#installation)
- [Create & deploy an NFT contract](#create--deploy-an-nft-contract)
  - [Define a metadata schema](#define-a-metadata-schema)
    - [Default schema](#default-schema)
    - [Supported metadata fields](#supported-metadata-fields)
    - [Parse a raw metadata schema](#parse-a-raw-metadata-schema)
  - [Create a contract](#create-a-contract)
    - [Optional: set the deployed contract address](#optional-set-the-deployed-contract-address)
  - [Configure the contract owner](#configure-the-contract-owner)
    - [Define an authorizer](#define-an-authorizer)
    - [Set the owner](#set-the-owner)
    - [Use a separate payer or proposer](#use-a-separate-payer-or-proposer)
    - [Specify authorizers in the constructor](#specify-authorizers-in-the-constructor)
  - [Deploy the contract](#deploy-the-contract)
- [Mint NFTs](#mint-nfts)
  - [Standard NFTs](#standard-nfts)
    - [Deploy the contract](#deploy-the-contract-1)
    - [Mint the NFTs](#mint-the-nfts)
  - [Edition NFTs](#edition-nfts)
    - [Deploy the contract](#deploy-the-contract-2)
    - [Step 1: Create one or more editions](#step-1-create-one-or-more-editions)
    - [Step 2: Mint NFTs](#step-2-mint-nfts)
      - [Mint into buckets](#mint-into-buckets)
  - [Blind NFTs](#blind-nfts)
    - [Deploy the contract](#deploy-the-contract-3)
    - [Step 1: Mint NFTs](#step-1-mint-nfts)
      - [Randomized minting](#randomized-minting)
    - [Step 2: Reveal NFTs](#step-2-reveal-nfts)
  - [Blind Edition NFTs](#blind-edition-nfts)
    - [Deploy the contract](#deploy-the-contract-4)
    - [Step 1: Create one or more editions](#step-1-create-one-or-more-editions-1)
    - [Step 2: Mint NFTs](#step-2-mint-nfts-1)
    - [Step 3: Reveal NFTs](#step-3-reveal-nfts)
- [Distribute NFTs](#distribute-nfts)
  - [Claim sale](#claim-sale)
    - [Edition-based claim sales](#edition-based-claim-sales)
    - [Reveal on claim](#reveal-on-claim)
    - [Allowlists](#allowlists)
      - [Add to an allowlist](#add-to-an-allowlist)
      - [Create a sale with an allowlist](#create-a-sale-with-an-allowlist)
- [Metadata views](#metadata-views)
  - [Add views to a schema](#add-views-to-a-schema)
  - [Built-in views](#built-in-views)
    - [NFT Collection Display View](#nft-collection-display-view)
      - [Collection media](#collection-media)
        - [IPFS Media](#ipfs-media)
        - [HTTP Media](#http-media)
- [Royalties](#royalties)
  - [1. Enable the royalties view](#1-enable-the-royalties-view)
  - [2. Deploy your contract with royalties recipients](#2-deploy-your-contract-with-royalties-recipients)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Installation

This guide uses the `@freshmint/core` package (instead of `freshmint`, which is the CLI version).

```sh
npm i @freshmint/core
```

# Create & deploy an NFT contract

NFTs on Flow are defined by a Cadence contract that 
implements the [Flow NFT interface](https://github.com/onflow/flow-nft).

Freshmint includes several NFT contract templates:

- `StandardNFTContract`
- `BlindNFTContract`
- `EditionNFTContract`
- `BlindEditionNFTContract`

## Define a metadata schema

Before creating a contract, you'll need to define its metadata schema.
The schema is a list of fields that define the structure
of an NFT and the data it contains. You'll then use the schema to generate
your custom contract.

```js
import { metadata } from '@freshmint/core';

// Create a schema with two fields:
// - "foo" is a string field
// - "bar" is an integer field
const schema = metadata.createSchema({
  foo: metadata.String(),
  bar: metadata.Int()
});
```

### Default schema

Freshmint ships with a default metadata schema.
This is the minimum set of fields required to
implement the [Display](https://github.com/onflow/flow-nft#list-of-common-views)
metadata view.

For a full list of supported metadata views,
see the [metadata views](#metadata-views) section.

```js
const defaultSchema = metadata.createSchema({
  fields: {
    name: metadata.String(),
    description: metadata.String(),
    thumbnail: metadata.IPFSImage()
  },
  // The default schema implements the MetadataViews.Display view.
  views: (fields) => [
    metadata.DisplayView({
      name: fields.name,
      description: fields.description,
      thumbnail: fields.thumbnail
    })
  ]
});
```

You can use the default schema as a base and 
extend it with additional fields:

```js
import { metadata } from '@freshmint/core';

const schema = metadata.defaultSchema.extend({
  foo: metadata.String(),
  bar: metadata.Int()
});
```

### Supported metadata fields

|Name|Identifier|
|----|----------|
|String|`string`|
|Bool|`bool`|
|Int|`int`|
|UInt|`uint`|
|Fix64|`fix64`|
|UFix64|`ufix64`|
|IPFSFile|`ipfs-file`|

### Parse a raw metadata schema

You can represent a metadata schema as a plain JavaScript object,
which can easily be serialized to JSON, YAML or other formats.

The `type` field must match a field identifier from the table above.

```js
const rawSchema = {
  fields: [
    {
      name: 'foo',
      type: 'string'
    },
    {
      name: 'bar',
      type: 'int'
    }
  ]
};
```

Use the `parseSchema` function to convert a raw schema into a `metadata.Schema` object:

```js
import { metadata } from '@freshmint/core';

const schema = metadata.parseSchema(rawSchema);
```

## Create a contract

```js
import { StandardNFTContract, metadata } from '@freshmint/core';

const contract = new StandardNFTContract({
  name: 'MyNFTContract',
  schema: metadata.defaultSchema.extend({
    foo: metadata.String(),
    bar: metadata.Int()
  })
});
```

### Optional: set the deployed contract address

If your contract is already deployed to an account,
you can set the contract address in the constructor.
Otherwise the address will be set when you deploy the contract.

```js
const contract = new StandardNFTContract({
  name: 'MyNFTContract',
  schema: metadata.defaultSchema.extend({
    foo: metadata.String(),
    bar: metadata.Int()
  }),
  address: '0xf8d6e0586b0a20c7' // The address where your contract is deployed
});
```

## Configure the contract owner

You will need to configure the contract owner before you can
deploy the contract or mint NFTs. The owner is the account that will
mint, reveal and manage your NFTs.

### Define an authorizer

The owner is defined as a `TransactionAuthorizer`, an object that can authorize transactions for a specific Flow account.

The snippet below shows how to define an authorizer from an ECDSA private key.

```js
import { TransactionAuthorizer } from '@freshmint/core';
import { 
  InMemoryECPrivateKey, 
  InMemoryECSigner, 
  HashAlgorithm,
  SignatureAlgorithm
} from 'freshmint/crypto';

const privateKey = InMemoryECPrivateKey.fromHex(
  process.env.PRIVATE_KEY, 
  SignatureAlgorithm.ECDSA_P256,
);
const signer = new InMemoryECSigner(privateKey, HashAlgorithm.SHA3_256);

const authorizer = new TransactionAuthorizer({ 
  address: '0xf8d6e0586b0a20c7',
  keyIndex: 0,
  signer,
});
```

### Set the owner

```js
const contract = new StandardNFTContract(...);

// ...

contract.setOwner(authorizer);
```

### Use a separate payer or proposer

You can optionally specify separate payer or proposer authorizers.
This is useful if you would like to create multiple contracts, 
each with a separate owner, but pay for all fees from a central account.

An NFT contract has three authorizer roles:

|Role|Actions|
|----|-------|
|Owner|Mints, reveals and distributes NFTs. This is the only account with administrator access to the NFT contract.|
|Payer|Pays fees for all transactions.|
|Proposer|Signs as the proposer on all transactions.|

Note: the contract owner will sign for any role that is not explicitly set.

```js
contract.setOwner(ownerAuthorizer);

contract.setPayer(payerAuthorizer);

contract.setProposer(proposerAuthorizer);
```

### Specify authorizers in the constructor

For convenience, you can pass the authorizers directly in the contract constructor:

```js
const contract = new StandardNFTContract({
  // ...
  owner: ownerAuthorizer, 
  payer: payerAuthorizer
  proposer: proposerAuthorizer
});
```

## Deploy the contract

First create a `FreshmintClient` instance using FCL as a base.

```js
import * as fcl from '@onflow/fcl';
import { FreshmintClient, FreshmintConfig } from '@freshmint/core';

const client = FreshmintClient.fromFCL(fcl, FreshmintConfig.TESTNET);
```

Then deploy the contract using the `deploy()` transaction method.

```js
import { HashAlgorithm } from 'freshmint/crypto';

const contract = new StandardNFTContract(...);

// Specify a public key (with hash algorithm)
// to attach to the contract account.
const publicKey = privateKey.getPublicKey();
const hashAlgorithm = HashAlgorithm.SHA3_256;

// Note: contract.address will automatically update once the transaction succeeds.
const deployTransaction = contract.deploy({ publicKey, hashAlgorithm });

const contractAddress = await client.send(deployTransaction);
```

# Mint NFTs

## Standard NFTs

The `StandardNFTContract` allows you to mint simple one-of-a-kind NFTs.

```js
import { StandardNFTContract, TransactionAuthorizer, metadata } from '@freshmint/core';

// Intialize your owner authorizer.
const owner = new TransactionAuthorizer(...);

const contract = new StandardNFTContract({
  name: 'MyEditionNFTContract',
  schema: metadata.defaultSchema,
  owner
});
```

### Deploy the contract

```js
import * as fcl from '@onflow/fcl';
import { FreshmintClient, FreshmintConfig } from '@freshmint/core';
import { HashAlgorithm } from 'freshmint/crypto';

// Specify a public key (with hash algorithm)
// to attach to the contract account.
const publicKey = privateKey.getPublicKey();
const hashAlgorithm = HashAlgorithm.SHA3_256;

const client = FreshmintClient.fromFCL(fcl, FreshmintConfig.TESTNET);

const address = await client.send(contract.deploy({ 
  publicKey, 
  hashAlgorithm
}));
```

### Mint the NFTs

```js
// Note: the metadata fields provided must match those
// defined in your metadata schema.
const nfts = [
  {
    name: 'NFT 1',
    description: 'NFT 1 is awesome.',
    thumbnail: 'bafybeidlkqhddsjrdue7y3dy27pu5d7ydyemcls4z24szlyik3we7vqvam',
  },
  {
    name: 'NFT 2',
    description: 'NFT 2 is even better.',
    thumbnail: 'bafybeidlkqhddsjrdue7y3dy27pu5d7ydyemcls4z24szlyik3we7vqvam',
  },
];

const mintedNFTs = await client.send(contract.mintNFTs(nfts));

console.log(mintedNFTs);
```

This will print:

```
[
  {
    id: "0",
    metadata: {
      name: "NFT 1",
      description: "NFT 1 is awesome.",
      thumbnail: "bafybeidlkqhddsjrdue7y3dy27pu5d7ydyemcls4z24szlyik3we7vqvam"
    },
    transactionId: "20d0c77028d9a23347330956e8cd253fbe96a225e5cb42a4450fdc2e5cefa8c1"
  },
  {
    id: "1",
    metadata: {
      name: "NFT 2",
      description: "NFT 2 is even better.",
      thumbnail: "bafybeidlkqhddsjrdue7y3dy27pu5d7ydyemcls4z24szlyik3we7vqvam"
    },
    transactionId: "20d0c77028d9a23347330956e8cd253fbe96a225e5cb42a4450fdc2e5cefa8c1"
  }
]
```

## Edition NFTs

The `EditionNFTContract` allows you to mint edition-based NFTs.

In this model, a contract can define multiple NFT editions.
All NFTs in an edition share the same metadata;
only their serial numbers are different.

```js
import { EditionNFTContract, TransactionAuthorizer, metadata } from '@freshmint/core';

// Intialize your owner authorizer.
const owner = new TransactionAuthorizer(...);

const contract = new EditionNFTContract({
  name: 'MyEditionNFTContract',
  schema: metadata.defaultSchema,
  owner
});
```

### Deploy the contract

```js
import * as fcl from '@onflow/fcl';
import { FreshmintClient, FreshmintConfig } from '@freshmint/core';
import { HashAlgorithm } from 'freshmint/crypto';

// Specify a public key (with hash algorithm)
// to attach to the contract account.
const publicKey = privateKey.getPublicKey();
const hashAlgorithm = HashAlgorithm.SHA3_256;

const client = FreshmintClient.fromFCL(fcl, FreshmintConfig.TESTNET);

const address = await client.send(contract.deploy({ 
  publicKey, 
  hashAlgorithm
}));
```

### Step 1: Create one or more editions

```js
const edition1 = {
  // This edition will contain 100 NFTs.
  size: 100,
  // Note: the metadata fields provided must match those
  // defined in your metadata schema.
  metadata: {
    name: 'Edition 1',
    description: 'This is the first edition',
    thumbnail: 'bafybeidlkqhddsjrdue7y3dy27pu5d7ydyemcls4z24szlyik3we7vqvam',
  }
};

const edition2 = {
  // This edition will contain 200 NFTs.
  size: 200,
  // Note: the metadata fields provided must match those
  // defined in your metadata schema.
  metadata: {
    name: 'Edition 2',
    description: 'This is the second edition',
    thumbnail: 'bafybeidlkqhddsjrdue7y3dy27pu5d7ydyemcls4z24szlyik3we7vqvam',
  }
};

// This function submits a transaction that publishes
// this edition to the blockchain. 
// 
// Once you create an edition, its metadata becomes publicly viewable.
const editions = await client.send(contract.createEditions([edition1, edition2]));

console.log(editions);
```

This will print:

```
[
  {
    id: '0',
    size: 100,
    metadata: {
      name: 'Edition 1',
      description: 'This is the first edition',
      thumbnail: 'bafybeidlkqhddsjrdue7y3dy27pu5d7ydyemcls4z24szlyik3we7vqvam',
    }
  },
  {
    id: '1',
    size: 200,
    metadata: {
      name: 'Edition 2',
      description: 'This is the second edition',
      thumbnail: 'bafybeidlkqhddsjrdue7y3dy27pu5d7ydyemcls4z24szlyik3we7vqvam',
    }
  }
]
```

### Step 2: Mint NFTs

The `mintNFTs` function prepares a transaction to mint NFTs into an existing edition. 

It requires two arguments:
- `editionId` is the ID of the edition to mint into.
- `count` is the number of NFTs to mint. 
For smaller editions, you may be able mint the entire edition in a single transaction,
but in most cases you will need to mint in smaller batches.

```js
// This example shows how to mint editions into separate buckets.
//
// By default, Freshmint will mint all NFTs into a single collection
// on the minter's account. By specifying a bucket, you can split 
// your minted NFTs into separate collections (i.e. buckets) in the same account.
//
// In the case of editions, this allows you to sell or distribute each edition
// separately, rather than mixing all editions into a single collection

for (const edition of editions) {

  const mintedNFTs = await client.send(contract.mintNFTs({
    editionId: edition.id,
    // Mint NFTs in batches of 10.
    count: 10, 
  }));

  console.log(mintedNFTs);
}
```

This will print:

```
[
  {
    id: '0',
    editionId: '0',
    editionSerial: '1',
    transactionId: 'e648c662c3eb8550030c95c0dcc01d6d179925b9fc33fbaabe90715555d78ead'
  },
  {
    id: '1',
    editionId: '0',
    editionSerial: '2',
    transactionId: 'e648c662c3eb8550030c95c0dcc01d6d179925b9fc33fbaabe90715555d78ead'
  },
  ...
]
```

#### Mint into buckets

This example shows how to mint editions into separate buckets.

By default, Freshmint will mint all NFTs into a single collection
on the minter's account. By specifying a bucket name, you can split 
your minted NFTs into separate collections (i.e. buckets) in the same account.

In the case of editions, this allows you to [distribute each edition
in a separate sale](#edition-based-claim-sales), rather than mixing all editions into a single collection.

```js
const mintedNFTs = await client.send(contract.mintNFTs({ 
  editionId: '1',
  count: 10, 
  // Mint each edition into its own bucket.
  bucket: 'edition-1-bucket'
}));
```

## Blind NFTs

Use a `BlindNFTContract` to create NFTs that can be blindly minted.
In a blind mint, NFTs are initially minted as partial objects with their metadata hidden.
The contract owner can then reveal the metadata at a later point in time.

Freshmint implements blind minting using two separate mint and reveal transactions:

1. The first transaction mints an NFT in its hidden form. 
A hidden NFT contains a SHA256 hash of the complete metadata that 
can later be used to verify the integrity of the revealed metadata.
2. The second transaction publishes the NFT metadata to the blockchain.
The hidden NFT is converted into a full NFT containing a complete
on-chain metadata record.

```js
import { BlindNFTContract, TransactionAuthorizer, metadata } from '@freshmint/core';

// Intialize your owner authorizer.
const owner = new TransactionAuthorizer(...);

const contract = new BlindNFTContract({
  name: 'MyNFTContract',
  schema: metadata.defaultSchema,
  owner
});
```

### Deploy the contract

```js
import * as fcl from '@onflow/fcl';
import { FreshmintClient, FreshmintConfig } from '@freshmint/core';
import { HashAlgorithm } from 'freshmint/crypto';

// Specify a public key (with hash algorithm)
// to attach to the contract account.
const publicKey = privateKey.getPublicKey();
const hashAlgorithm = HashAlgorithm.SHA3_256;

// Specify the IPFS hash of an image (JPEG, PNG, etc)
// to be used as a placeholder for hidden NFTs.
const placeholderImage = 'bafybeidlkqhddsjrdue7y3dy27pu5d7ydyemcls4z24szlyik3we7vqvam';

const client = FreshmintClient.fromFCL(fcl, FreshmintConfig.TESTNET);

const address = await client.send(contract.deploy({ 
  publicKey, 
  hashAlgorithm,
  placeholderImage
}));
```

### Step 1: Mint NFTs

```js
// Note: the metadata fields provided must match those
// defined in your metadata schema.
const nfts = [
  {
    name: 'NFT 1',
    description: 'NFT 1 is awesome.',
    thumbnail: 'bafybeidlkqhddsjrdue7y3dy27pu5d7ydyemcls4z24szlyik3we7vqvam',
  },
  {
    name: 'NFT 2',
    description: 'NFT 2 is even better.',
    thumbnail: 'bafybeidlkqhddsjrdue7y3dy27pu5d7ydyemcls4z24szlyik3we7vqvam',
  },
];

const mintedNFTs = await client.send(contract.mintNFTs(nfts));

console.log(mintedNFTs);
```

This will print:

```
[
  {
    id: "0",
    metadata: {
      name: "NFT 1",
      description: "NFT 1 is awesome.",
      thumbnail: "bafybeidlkqhddsjrdue7y3dy27pu5d7ydyemcls4z24szlyik3we7vqvam"
    },
    metadataHash: "ed94560233ee34cf059e846560b43b462d0337e21d563f668404ee4cee407c97",
    metadataSalt: "727ca86ae4a338f21e83ec330f490bcf",
    transactionId: "20d0c77028d9a23347330956e8cd253fbe96a225e5cb42a4450fdc2e5cefa8c1"
  },
  {
    id: "1",
    metadata: {
      name: "NFT 2",
      description: "NFT 2 is even better.",
      thumbnail: "bafybeidlkqhddsjrdue7y3dy27pu5d7ydyemcls4z24szlyik3we7vqvam"
    },
    metadataHash: "504b154e868692932e2ef77900459915d3ab97be6150b2eac03c65b233cfbb8c",
    metadataSalt: "18087aeaa388597b81cafdf4d2f6d81f",
    transactionId: "20d0c77028d9a23347330956e8cd253fbe96a225e5cb42a4450fdc2e5cefa8c1"
  }
]
```

The `mintNFTs` function generates a unique salt for each minted NFT.
The salt is used to compute the metadata hash and prevents users from hash-grinding
against a known set of possible metadata values.

Important: you **must** save the `id`, `metadata` and `metadataSalt` fields for each NFT.
You'll need them to later reveal the NFTs.

#### Randomized minting

Blind NFTs are often minted in a random order. To randomize your mint,
shuffle your input array before calling `mintNFTs()`.
Freshmint does not support automatic randomization.

It's important to note that this will only randomize the NFT metadata.
The minted NFT IDs will still be sequential (i.e. 0, 1, 2, etc).

### Step 2: Reveal NFTs

You can reveal your NFTs at any time.
You also have the option to reveal NFTs one by one, all at once, or in batches.

```js
const nft0 = {
  id: '0',
  metadata: {
    name: 'NFT 1',
    description: 'NFT 1 is awesome.',
    thumbnail: 'bafybeidlkqhddsjrdue7y3dy27pu5d7ydyemcls4z24szlyik3we7vqvam',
  },
  metadataSalt: '727ca86ae4a338f21e83ec330f490bcf',
}

const nft1 = {
  id: '1',
  metadata: {
    name: 'NFT 2',
    description: 'NFT 2 is awesome.',
    thumbnail: 'bafybeidlkqhddsjrdue7y3dy27pu5d7ydyemcls4z24szlyik3we7vqvam',
  },
  metadataSalt: '18087aeaa388597b81cafdf4d2f6d81f',
}

// Reveal a single NFT
await client.send(contract.revealNFTs([nft0]));

// Reveal multiple NFTs
await client.send(contract.revealNFTs([nft0, nft1]));
```

## Blind Edition NFTs

The `BlindEditionNFTContract` allows you to mint edition-based NFTs
that are hidden at mint time and revealed at a later date.

In this model, a contract can define multiple editions.
All NFTs in an edition share the same metadata;
only their serial numbers are different.

```js
import { BlindEditionNFTContract, TransactionAuthorizer, metadata } from '@freshmint/core';

// Intialize your owner authorizer.
const owner = new TransactionAuthorizer(...);

const contract = new BlindEditionNFTContract({
  name: 'MyEditionNFTContract',
  schema: metadata.defaultSchema,
  owner
});
```

### Deploy the contract

```js
import * as fcl from '@onflow/fcl';
import { FreshmintClient, FreshmintConfig } from '@freshmint/core';
import { HashAlgorithm } from 'freshmint/crypto';

// Specify a public key (with hash algorithm)
// to attach to the contract account.
const publicKey = privateKey.getPublicKey();
const hashAlgorithm = HashAlgorithm.SHA3_256;

// Specify the IPFS hash of an image (JPEG, PNG, etc)
// to be used as a placeholder for hidden NFTs.
const placeholderImage = 'bafybeidlkqhddsjrdue7y3dy27pu5d7ydyemcls4z24szlyik3we7vqvam';

const client = FreshmintClient.fromFCL(fcl, FreshmintConfig.TESTNET);

const address = await client.send(contract.deploy({ 
  publicKey, 
  hashAlgorithm,
  placeholderImage
}));
```

### Step 1: Create one or more editions

```js
const edition1 = {
  // This edition will contain 5 NFTs.
  size: 5,
  // Note: the metadata fields provided must match those
  // defined in your metadata schema.
  metadata: {
    name: 'Edition 1',
    description: 'This is the first edition',
    thumbnail: 'bafybeidlkqhddsjrdue7y3dy27pu5d7ydyemcls4z24szlyik3we7vqvam',
  }
};

const edition2 = {
  // This edition will contain 5 NFTs.
  size: 5,
  // Note: the metadata fields provided must match those
  // defined in your metadata schema.
  metadata: {
    name: 'Edition 2',
    description: 'This is the second edition',
    thumbnail: 'bafybeidlkqhddsjrdue7y3dy27pu5d7ydyemcls4z24szlyik3we7vqvam',
  }
};

// This function submits a transaction that publishes
// this edition to the blockchain. 
// 
// Once you create an edition, its metadata becomes publicly viewable.
const editions = await client.send(contract.createEditions([edition1, edition2]));

console.log(editions);
```

This will print:

```
[
  {
    id: '0',
    size: 5,
    metadata: {
      name: 'Edition 1',
      description: 'This is the first edition',
      thumbnail: 'bafybeidlkqhddsjrdue7y3dy27pu5d7ydyemcls4z24szlyik3we7vqvam',
    },
    nfts: [
      { editionId: '0', editionSerial: '1' },
      { editionId: '0', editionSerial: '2' },
      { editionId: '0', editionSerial: '3' },
      { editionId: '0', editionSerial: '4' },
      { editionId: '0', editionSerial: '5' },
    ]
  },
  {
    id: '1',
    size: 5,
    metadata: {
      name: 'Edition 2',
      description: 'This is the second edition',
      thumbnail: 'bafybeidlkqhddsjrdue7y3dy27pu5d7ydyemcls4z24szlyik3we7vqvam',
    },
    nfts: [
      { editionId: '1', editionSerial: '1' },
      { editionId: '1', editionSerial: '2' },
      { editionId: '1', editionSerial: '3' },
      { editionId: '1', editionSerial: '4' },
      { editionId: '1', editionSerial: '5' },
    ]
  }
]
```

### Step 2: Mint NFTs

You can mint NFTs to any existing edition.
The input to each NFT is simply its edition ID and serial number.

**However, there are several important steps you need to take to avoid
leaking edition contents before they are revealed.**

1. Always randomize the minting order.

   This prevents users from being able to guess an NFT's _serial number_ before it is revealed.

2. If you want to mix scramble multiple editions, always mint their NFTs in a mixed batch, rather than by edition.

   This prevents users from being able to guess an NFT's _edition_ before it is revealed.

```js
// This example shows how to mint editions into separate buckets.

import shuffle from 'your-secure-randomization-lib';

for (const edition of editions) {
  // As mentioned above, ALWAYS randomize the mint order.
  const randomizedNFTs = shuffle(edition.nfts);

  // Mint each edition into its own bucket.
  const mintedNFTs = await client.send(contract.mintNFTs(
    randomizedNFTs,
    { bucket: edition.id }
  ));

  console.log(mintedNFTs);
}
```

This will print:

```
[
  {
    id: '0',
    editionId: '0',
    editionSerial: '3',
    editionHash: 'ab17379badad7bcf91885104f449a679b4cc68d1e3ccd527c6c7b922d0ae2655',
    editionSalt: '6d8f193cab051793a1864bb8d082cf32',
    transactionId: 'e648c662c3eb8550030c95c0dcc01d6d179925b9fc33fbaabe90715555d78ead'
  },
  {
    id: '1',
    editionId: '0',
    editionSerial: '1',
    editionHash: '10a315ec07b64935cebe82f14cdc5d7320ad941db3a14ad998305851d75c2119',
    editionSalt: '8c658bba126995b1f99b8c9af374716f',
    transactionId: 'e648c662c3eb8550030c95c0dcc01d6d179925b9fc33fbaabe90715555d78ead'
  },
  ...
]
```

### Step 3: Reveal NFTs

Reveal edition NFTs by publishing their edition ID, serial number and unique salt.

```js
const nft0 = {
  id: '0',
  editionId: '1',
  editionSerial: '3',
  editionSalt: '6d8f193cab051793a1864bb8d082cf32',
};

const nft1 = {
  id: '1',
  editionId: '0',
  editionSerial: '3',
  editionSalt: '8c658bba126995b1f99b8c9af374716f',
};

// Reveal a single NFT
await client.send(contract.revealNFT(nft0));

// Reveal multiple NFTs
await client.send(contract.revealNFTs([nft0, nft1]));
```

# Distribute NFTs

Freshmint provides several distribution methods that you can use
after minting your NFTs.

## Claim sale

In a claim sale, a user purchases an NFT from a contract but does not get to pick
the specific NFT.

```js
import * as fcl from '@onflow/fcl';

import {
  FreshmintClient,
  FreshmintConfig,
  ClaimSaleContract,
  StandardNFTContract
} from '@freshmint/core';

const client = FreshmintClient.fromFCL(fcl, FreshmintConfig.TESTNET);

const contract = new StandardNFTContract(...);

// After minting your NFTs...

const sale = new ClaimSaleContract(contract);

// Start a new claim sale for 10 FLOW
await client.send(sale.start({ id: "default", price: "10.0" }));

// Stop the claim sale. 
// The unsold NFTs stay in the contract owner's account.
await client.send(sale.stop("default"));
```

### Edition-based claim sales

When selling edition-based NFTs, you may want to allow
users to claim each edition separately and at a different price.

```js
import * as fcl from '@onflow/fcl';

import {
  FreshmintClient,
  FreshmintConfig,
  ClaimSaleContract,
  EditionNFTContract
} from '@freshmint/core';

const client = FreshmintClient.fromFCL(fcl, FreshmintConfig.TESTNET);

const contract = new EditionNFTContract(...);

const sale = new ClaimSale(contract);

// After creating and minting editions...

for (const edition in editions) {
  // Specify the bucket to claim from. This should be the same bucket
  // you used to mint that edition.
  await client.send(sale.start({ id: edition.id, price: "10.0", bucket: edition.id }));
}

// Later, stop the claim sales:

for (const edition in editions) {
  await client.send(sale.stop(edition.id));
}
```

### Reveal on claim

In this strategy, each NFT is revealed immediately after it is claimed by a buyer.
The NFTs are revealed one by one until all NFTs are claimed.

An individual user sees their revealed NFT shortly after they buy it.

This strategy assumes you are using the [claim sale](#claim-sale) distribution method.

```js
import * as fcl from '@onflow/fcl';
import { FreshmintClient, FreshmintConfig } from '@freshmint/core';

const client = FreshmintClient.fromFCL(fcl, FreshmintConfig.TESTNET);

// This implementation assumes you have the transaction ID
// of the buyer's claim transaction (i.e. by capturing on your frontend).
//
// An alternate and more robust implementation would subscribe
// to 'NFTClaimSale.Claimed' events and trigger a reveal.
async function revealAfterPurchase(transactionId) {
  const { events } = await fcl.tx({ transationId }).onceSealed();
  
  const claimEvent = events.find(
    // Note: this is the event ID for testnet.
    (event) => event.type === 'A.f6908f3ab6c14d81.NFTClaimSale.Claimed'
  );

  const nftId = claimEvent.data['nftID'];

  // This implementation assumes that you have stored the NFT metadata
  // and salt in your database.
  const { metadata, metadataSalt } = await loadNFTFromDatabase(nftId);

  await client.send(contract.reveal([{
    id: nftId,
    metadata,
    metadataSalt
  }]));
}
```

### Allowlists

You can optionally configure a claim sale to be gated by an address-based allowlist.

Allowlists are referenced by a string name and stored as a resource in your minter account.
You can create an allowlist before a sale, add addresses to it, and then attach it to the sale later.

#### Add to an allowlist

The `addToAllowlist` function builds a transaction that adds one or more addresses to an on-chain allowlist.

When calling `addToAllowlist` for the first time with a new name,
Freshmint will automatically create the allowlist if it does not exist.
You can execute this transaction again to add more addresses to the list.

This example creates an allowlist with name `early_access_users` and 
adds accounts 0x0ae53cb6e3f42a79 and 0xf8d6e0586b0a20c7,
both of which will be allowed to claim 3 NFTs.

Note: the allowlist name cannot contain spaces, hyphens (`-`), slashers or other special characters. Only alphanumeric characters and underscores are allowed.

```js
await client.send(
  sale.addToAllowlist({
    name: 'early_access_users',
    addresses: ['0x0ae53cb6e3f42a79', '0xf8d6e0586b0a20c7'],
    claims: 3, // Each account will be allowed to claim 3 NFTs
  })
)
```

#### Create a sale with an allowlist

This example creates a sale and attaches the `early_access_users` allowlist created above.

Only the the accounts 0x0ae53cb6e3f42a79 and 0xf8d6e0586b0a20c7 will be allowed to claim from the sale,
up to a maximum of 3 NFTs each.

```js
await client.send(sale.start({
  id: 'default',
  price: '10.0',
  // Note: 'allowlist' is an optional argument. 
  //
  // If omitted, the sale will be open to anybody and with no claim limits.
  allowlist: 'early_access_users'
}));
```

# Metadata views

Metadata views allow NFTs to return their metadata in a standardized way
to consumers such as wallets, indexers and marketplaces.
They were proposed in [FLIP-0636](https://github.com/onflow/flow/blob/master/flips/20210916-nft-metadata.md)
and implemented in the [Flow NFT standard repository](https://github.com/onflow/flow-nft#nft-metadata).

Freshmint allows you to specify views as part of your metadata schema.
It will then generate the necessary Cadence code to attach the views to your contract.

## Add views to a schema

```js
import { metadata } from '@freshmint/core';

const defaultSchema = metadata.createSchema({
  fields: {
    name: metadata.String(),
    description: metadata.String(),
    thumbnail: metadata.IPFSImage()
  },
  // The views property returns a list of views 
  // to be attached to the contract.
  views: (fields) => [
    metadata.DisplayView({
      name: fields.name,
      description: fields.description,
      thumbnail: fields.thumbnail
    })
  ]
});
```

## Built-in views

Freshmint has built-in support for the following metadata views.

### NFT Collection Display View

The `NFTCollectionDisplay` view returns a basic representation of the collection
that an NFT belongs to.

```js
import { metadata } from '@freshmint/core';

const view = metadata.NFTCollectionDisplayView({
  name: 'My NFT Collection',
  description: 'This is my new NFT collection.',
  url: 'http://my-nft-collection.com',
  media: {
    ipfs: 'bafkreicrfbblmaduqg2kmeqbymdifawex7rxqq2743mitmeia4zdybmmre',
    type: 'image/jpeg'
  }
})
```

#### Collection media 

The media object can either be an IPFS CID or an HTTP URL.

##### IPFS Media

```js
// Example: IPFS media file

const view = metadata.NFTCollectionDisplayView({
  // ...
  media: {
    ipfs: 'bafkreicrfbblmaduqg2kmeqbymdifawex7rxqq2743mitmeia4zdybmmre',
    type: 'image/jpeg'
  }
})

// Alternatively, you can specify an IPFS CID and path as an object.
const view = metadata.NFTCollectionDisplayView({
  // ...
  media: {
    ipfs: {
      cid: 'bafkreicrfbblmaduqg2kmeqbymdifawex7rxqq2743mitmeia4zdybmmre',
      path: 'banner.jpeg'
    }
    type: 'image/jpeg'
  }
})
```

##### HTTP Media

```js
// Example: HTTP media file

const view = metadata.NFTCollectionDisplayView({
  // ...
  media: {
    url: 'http://my-nft-collection.com/banner.jpeg',
    type: 'image/jpeg'
  }
})
```

# Royalties

Freshmint allows you to configure one or more royalty recipients
who will receive a portion of the sales on all NFTs minted by your contract.

There are two steps to configuring royalties for your contract.

## 1. Enable the royalties view

First, ensure that your schema contains the royalties metadata view.
This view exposes your royalty information to wallets and marketplaces.
Without it your royalties will not be applied.

Note: `metadata.defaultSchema` already contains the royalties view.

```js
import { metadata } from '@freshmint/core';

const schema = metadata.createSchema({
  // ...
  views: (fields) => [
    // ...
    metadata.RoyaltiesView()
  ]
});
```

## 2. Deploy your contract with royalties recipients

Configure your royalties when deploying your contract:

```js
const royalties = [
  {
    address: '0xf8d6e0586b0a20c7',
    receiverPath: '/public/flowTokenReceiver',
    // Cut must be between 0.0 and 1.0 (100%)
    cut: '0.1', // 10% of sales go to this recipient
    // Description is an optional field
    description: '10% of sale proceeds go to 0xf8d6e0586b0a20c7 in FLOW.',
  },
  {
    address: '0x0ae53cb6e3f42a79',
    receiverPath: '/public/flowTokenReceiver',
    cut: '0.05' // 5% of sales go to this recipient
  },
];

await client.send(contract.deploy({
  publicKey,
  hashAlgorithm,
  royalties
}));
```
