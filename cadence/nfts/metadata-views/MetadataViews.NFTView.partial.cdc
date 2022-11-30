pub fun resolveNFTView(): MetadataViews.NFTView {
    return MetadataViews.NFTView(
        id: self.id,
        uuid: self.uuid,
        display: self.resolveDisplay(),
        externalURL: self.resolveExternalURL(),
        collectionData: self.resolveNFTCollectionData(),
        collectionDisplay: self.resolveNFTCollectionDisplay(),
        royalties : self.resolveRoyalties(),
        traits: nil
    )
}
