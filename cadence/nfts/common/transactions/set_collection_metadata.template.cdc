import {{ contractName }} from {{{ contractAddress }}}

import MetadataViews from {{{ imports.MetadataViews }}}

transaction(
    name: String,
    description: String,
    externalURL: String,
    squareImage: String,
    squareImageType: String,
    bannerImage: String,
    bannerImageType: String,
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
                file: MetadataViews.IPFSFile(cid: squareImage, path: nil),
                mediaType: squareImageType
            ),
            bannerImage: MetadataViews.Media(
                file: MetadataViews.IPFSFile(cid: bannerImage, path: nil),
                mediaType: bannerImageType
            ),
            socials: socialURLs
        )

        self.admin.setCollectionMetadata(collectionMetadata)
    }
}
