/// Set the collection metadata for this contract.
///
pub fun setCollectionMetadata(_ collectionMetadata: MetadataViews.NFTCollectionDisplay) {
    {{ contractName }}.collectionMetadata = collectionMetadata
}
