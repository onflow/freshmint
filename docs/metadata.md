# NFT Metadata

Your NFT metadata is what makes each of your NFTs unique.

An NFT's metadata can include text fields (e.g. name, description), media assets (e.g. images, video),
traits (e.g. color, rarity) and any other information that you choose.

Freshmint stores all NFT metadata on the blockchain (except for file assets like images, which we recommend you store in IFPS).

## Metadata schema

Your metadata schema defines the structure of your metadata. It has two parts: fields and views.

### Fields

A schema defines list of data fields attached to each NFT.
All fields must have a name and a type.

Freshmint reads each field in your schema and generates a corresponding 
Cadence field in your NFT contract code.

For example, here's a simple schema for a postcard NFT:

```yaml
# freshmint.yaml
schema:
  fields:
    - name: city
      type: string
    - name: greeting
      type: string
    - name: image
      type: ipfs-file
```

This would generate the following metadata struct in Cadence:

```cadence
pub struct Metadata {
  pub let city: String
  pub let description: String
  pub let image: String
}
```

#### Available field types

Freshmint supports the following field types:

|Field Type|Description|Sample Value|
|----------|-----------|------------|
|`string`|A string value.|`"Hello, World!"`|
|`int`|A signed integer of arbitrary precision.|`-42`|
|`uint`|An unsigned integer of arbitrary precision.|`42`|
|`uint64`|An unsigned 64-bit integer.|`425456`|
|`fix64`|A signed fixed-point integer.|`-54426.4521`|
|`ufix64`|An unsigned fixed-point integer.|`54426.4521`|
|`bool`|A boolean value.|`true`|
|`http-file`|The URL of an HTTP file.|`http://foo.com/bar.png`|
|`ipfs-file`|The CID of an IPFS file (with optional path).|`bafkreicrfbblmaduqg2kmeqb...`|

### Views

[Metadata views](https://github.com/onflow/flow-nft#nft-metadata), 
as defined by the Flow metadata standard in 
[FLIP-636](https://github.com/onflow/flips/blob/main/flips/20210916-nft-metadata.md),
are read-only functions that return metadata in a consistent format
that can be consumed by 3rd-party applications (e.g. wallets and marketplaces).

For example, an NFT that includes video content would implement the 
[Media view](https://github.com/onflow/flow-nft/blob/master/contracts/MetadataViews.cdc#L386-L401) 
to ensure that the video is supported by 3rd-party applications.

#### Views in Freshmint

Freshmint has support for a limited set of common metadata views.
You can define these in your schema.

|View|Schema ID|Description|
|----|---------|-----------|
|Display|`display`|Return the name, description and thumbnail for each NFT.|
|Media|`media`|Return a media asset for each NFT|
|Serial|`serial`|Return a serial number for each NFT.|
|External URL|`external-url`|Return a URL to view each NFT.|
|Royalties|`royalties`|Return the royalty recipients for each NFT.|
|NFT|`nft`|A wrapper for the `display`, `external-url`, `nft-collection-display`, `nft-collection-data` and `royalties` views.|
|NFT Collection Display|`nft-collection-display`|Return the display information for your NFT collection.|
|NFT Collection Data|`nft-collection-data`|Return the data needed to create a new `NonFungibleToken.Collection` instance for your NFTs.|

Here's all the views defined in a single schema:

```yaml
# freshmint.yaml
schema:
  fields:
    - name: city
      type: string
    - name: description
      type: string
    - name: image
      type: ipfs-file
    - name: serial
      type: uint64
  views:
    - type: display
      options:
        name: name
        description: description
        # Link to the "image" field above
        thumbnail: image
        
    - type: serial
      options:
        # Link to the "serial" field above
        serialNumber: serial
    
    - type: external-url
      options: "${collection.url}/nfts/${nft.owner}/${nft.id}"
      
    # These fields don't require any options
    - type: nft
    - type: nft-collection-display
    - type: nft-collection-data
```

## Customize your metadata schema

Every new Freshmint project uses a schema with three simple fields: `name`, `description` and `thumbnail`.

However, you can add and remove fields by updating `freshmint.yaml`.

For example, you may want to attach a video file to each NFT:

```yaml
# freshmint.yaml
contract:
  name: Foo
  type: standard
  schema:
    fields:
      - name: name
        type: string
      - name: description
        type: string
      - name: thumbnail
        type: ipfs-file
      # Add a video field to each NFT
      - name: video
        type: ipfs-file
    views:
      ...
```

After updating your schema, you'll need to update the columns in `nfts.csv` to match the new schema.

Here we add the video column:

```csv
name,description,thumbnail,video
London,"A watercolor scene from London, UK.",london.png,london.mp4
...
```

Next, use the `fresh gen` command to regenerate your Cadence contract.

```sh
fresh gen cadence
```

Lastly, restart the dev server to redeploy your contract.

```sh
fresh dev
```

## Working with media assets

Your metadata can include links to external assets like images and videos.

### IPFS assets

> We recommend storing assets in [IPFS](https://ipfs.tech/), a peer-to-peer storage network.

Start by adding an `ipfs-file` field to your schema.

The default schema already stores `thumbnail` in IPFS:

```yaml
# freshmint.yaml
contract:
  name: Foo
  type: standard
  schema:
    fields:
      - name: name
        type: string
      - name: description
        type: string
      - name: thumbnail
        type: ipfs-file # Thumbnails are stored in IPFS
    views:
      ...
```

#### Pin local files

The easiest way to pin an IPFS asset is by moving it to your project's `assets` directory.

```
/your-project
  /assets
    foo.jpeg
```

Then you can reference the asset in your `nfts.csv` file:

```csv
name,description,thumbnail
Foo,This is the foo NFT,foo.jpeg
```

Now when you run `fresh mint`, Freshmint will automatically pin the asset to IPFS and attach its
[CID](https://docs.ipfs.tech/concepts/content-addressing/#what-is-a-cid) to the minted NFT.

#### Remote files

You can also pin files that exist at a remote URL (i.e. in your app's cloud storage bucket).

To do this, just specify an HTTP URL in `nfts.csv`:

```csv
name,description,thumbnail
Foo,This is the foo NFT,https://foo.app/foo.jpeg
```

Freshmint will download the asset and pin it to IPFS.

### HTTP assets

You can also include links to HTTP assets in your NFTs by using an `http-file` field in your schema:

```yaml
# freshmint.yaml
contract:
  name: Foo
  type: standard
  schema:
    fields:
      - name: name
        type: string
      - name: description
        type: string
      - name: thumbnail
        type: http-file # Thumbnails are loaded from HTTP URLs
    views:
      ...
```

Then specify an HTTP URL for each NFT in `nfts.csv`:

```csv
name,description,thumbnail
Foo,This is the foo NFT,https://foo.app/foo.jpeg
```
