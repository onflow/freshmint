pub fun resolveNFTView(_ metadata: Metadata): MetadataViews.NFTView {
    return MetadataViews.NFTView(
        id: self.id,
        uuid: self.uuid,
        display: self.resolveDisplay(metadata),
        externalURL: self.resolveExternalURL(metadata),
        collectionData: self.resolveNFTCollectionData(),
        collectionDisplay: self.resolveNFTCollectionDisplay(metadata),
        royalties : self.resolveRoyalties(),
        traits: nil
    )
}
