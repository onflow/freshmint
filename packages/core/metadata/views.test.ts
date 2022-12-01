import TemplateGenerator from '../generators/TemplateGenerator';
import * as metadata from './index';

const name = 'Foo NFT Collection';
const description = 'This is the Foo NFT collection.';
const url = 'http://foo.com';
const ipfsMedia = 'bafkreicrfbblmaduqg2kmeqbymdifawex7rxqq2743mitmeia4zdybmmre';
const httpMedia = 'http://foo.com/nft.jpeg';
const mediaType = 'image/jpeg';

const contractName = 'Foo';

function generateView(view: metadata.View): string {
  return TemplateGenerator.generate(view.type.cadenceTemplate, { view, metadataInstance: 'self', contractName });
}

describe('NFTCollectionDisplayView', () => {
  it('rejects combined IPFS and HTTP media input', () => {
    expect(() => {
      metadata.NFTCollectionDisplayView({
        name,
        description,
        url,
        media: {
          ipfs: {
            cid: ipfsMedia,
          },
          url: httpMedia,
          type: mediaType,
        },
      });
    }).toThrow();
  });

  const ipfsView = metadata.NFTCollectionDisplayView({
    name,
    description,
    url,
    media: {
      ipfs: {
        cid: ipfsMedia,
      },
      type: mediaType,
    },
  });

  const ipfsWithPathView = metadata.NFTCollectionDisplayView({
    name,
    description,
    url,
    media: {
      ipfs: {
        cid: ipfsMedia,
        path: 'foo.jpeg',
      },
      type: mediaType,
    },
  });

  const compactIpfsView = metadata.NFTCollectionDisplayView({
    name,
    description,
    url,
    media: {
      ipfs: ipfsMedia,
      type: mediaType,
    },
  });

  const legacyIpfsView = metadata.NFTCollectionDisplayView({
    name,
    description,
    url,
    media: {
      ipfsCid: ipfsMedia,
      type: mediaType,
    },
  });

  it('generates a Cadence snippet with an IPFS media file with no path', () => {
    expect(generateView(ipfsView)).toMatchSnapshot();
  });

  it('generates a Cadence snippet with an IPFS media file with a path', () => {
    expect(generateView(ipfsWithPathView)).toMatchSnapshot();
  });

  it('generates a Cadence snippet with an IPFS media file passed as a CID string only', () => {
    expect(compactIpfsView).toEqual(ipfsView);
    expect(generateView(compactIpfsView)).toEqual(generateView(ipfsView));
  });

  it('generates a Cadence snippet with an IPFS media file using legacy input', () => {
    // Legacy view should be equivalent to non-legacy view
    expect(legacyIpfsView).toEqual(ipfsView);
    expect(generateView(legacyIpfsView)).toEqual(generateView(ipfsView));
  });

  it('generates a Cadence snippet with an HTTP media file', () => {
    const view = metadata.NFTCollectionDisplayView({
      name,
      description,
      url,
      media: {
        url: httpMedia,
        type: mediaType,
      },
    });

    expect(generateView(view)).toMatchSnapshot();
  });

  it('returns the collectionMetadata field when no options are passed', () => {
    const view = metadata.NFTCollectionDisplayView();
    expect(generateView(view)).toMatchSnapshot();
  });
});

describe('SerialView', () => {
  it('generates a Cadence snippet', () => {
    const serialNumberField = new metadata.Field('serialNumber', metadata.UInt64());
    const view = metadata.SerialView({ serialNumber: serialNumberField });

    expect(generateView(view)).toMatchSnapshot();
  });

  it('rejects a field that is not typed as UInt64', () => {
    const invalidSerialNumberField = new metadata.Field('serialNumber', metadata.Int());

    expect(() => metadata.SerialView({ serialNumber: invalidSerialNumberField })).toThrow(
      `The serialNumber field passed to SerialView must have type UInt64. You passed the 'serialNumber' field which has type Int.`,
    );
  });
});

describe('ExternalURLView', () => {
  it('accepts a complete Cadence expression', () => {
    const view = metadata.ExternalURLView({ cadenceTemplate: '"http://foo.com/nfts/".concat(self.id)' });
    expect(generateView(view)).toMatchSnapshot();
  });

  it('accepts a raw template that uses no variables', () => {
    const view = metadata.ExternalURLView('https://foo.com');
    expect(generateView(view)).toMatchSnapshot();
  });

  it('accepts a raw template that uses the ${collection.url} variable', () => {
    const view = metadata.ExternalURLView('${collection.url}/nfts');
    expect(generateView(view)).toMatchSnapshot();
  });

  it('accepts a raw template that uses the ${nft.owner} variable', () => {
    const view = metadata.ExternalURLView('http://foo.com/${nft.owner}');
    expect(generateView(view)).toMatchSnapshot();
  });

  it('accepts a raw template that uses the ${nft.id} variable', () => {
    const view = metadata.ExternalURLView('http://foo.com/${nft.id}');
    expect(generateView(view)).toMatchSnapshot();
  });

  it('accepts a raw template that uses all variables', () => {
    const view = metadata.ExternalURLView('${collection.url}/nfts/${nft.owner}/${nft.id}');
    expect(generateView(view)).toMatchSnapshot();
  });
});

describe('RoyaltiesView', () => {
  it('generates a royalties view', () => {
    const view = metadata.RoyaltiesView();
    expect(generateView(view)).toMatchSnapshot();
  });
});
