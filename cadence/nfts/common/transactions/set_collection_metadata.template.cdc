import {{ contractName }} from {{{ contractAddress }}}

import MetadataViews from {{{ imports.MetadataViews }}}

pub fun getFileView(maybeIPFSCID: String?, maybeIPFSPath: String?, maybeURL: String?): AnyStruct{MetadataViews.File} {
    if let cid = maybeIPFSCID {
        return MetadataViews.IPFSFile(cid: cid, path: maybeIPFSPath)
    }

    if let url = maybeURL {
        return MetadataViews.HTTPFile(url)
    }

    panic("must specify either an IPFS CID or URL for each image")
}

transaction(
    name: String,
    description: String,
    externalURL: String,
    squareImageIPFSCID: String?,
    squareImageIPFSPath: String?,
    squareImageURL: String?,
    squareImageMediaType: String,
    bannerImageIPFSCID: String?,
    bannerImageIPFSPath: String?,
    bannerImageURL: String?,
    bannerImageMediaType: String,
    socials: {String: String}
) {

    let admin: &{{ contractName }}.Admin

    prepare(signer: AuthAccount) {
        self.admin = signer.borrow<&{{ contractName }}.Admin>(from: {{ contractName }}.AdminStoragePath)
            ?? panic("Could not borrow a reference to the NFT admin")
    }

    execute {
        let socialURLs: {String: MetadataViews.ExternalURL} = {}

        for key in socials.keys {
            socialURLs[key] = MetadataViews.ExternalURL(socials[key]!)
        }

        let collectionMetadata = MetadataViews.NFTCollectionDisplay(
            name: name,
            description: description,
            externalURL: MetadataViews.ExternalURL(externalURL),
            squareImage: MetadataViews.Media(
                file: getFileView(
                    maybeIPFSCID: squareImageIPFSCID,
                    maybeIPFSPath: squareImageIPFSPath,
                    maybeURL: squareImageURL
                ),
                mediaType: squareImageMediaType
            ),
            bannerImage: MetadataViews.Media(
                file: getFileView(
                    maybeIPFSCID: bannerImageIPFSCID,
                    maybeIPFSPath: bannerImageIPFSPath,
                    maybeURL: bannerImageURL
                ),
                mediaType: bannerImageMediaType
            ),
            socials: socialURLs
        )

        self.admin.setCollectionMetadata(collectionMetadata)
    }
}
