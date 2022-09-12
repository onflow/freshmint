pub fun resolveNFTCollectionData(): MetadataViews.NFTCollectionData {
    return MetadataViews.NFTCollectionData(
        storagePath: {{ contractName }}.CollectionStoragePath,
        publicPath: {{ contractName }}.CollectionPublicPath,
        providerPath: {{ contractName }}.CollectionPrivatePath,
        publicCollection: Type<&{{ contractName }}.Collection{ {{~contractName~}}.{{ contractName }}CollectionPublic}>(),
        publicLinkedType: Type<&{{ contractName }}.Collection{ {{~contractName~}}.{{ contractName }}CollectionPublic, NonFungibleToken.CollectionPublic, NonFungibleToken.Receiver, MetadataViews.ResolverCollection}>(),
        providerLinkedType: Type<&{{ contractName }}.Collection{ {{~contractName~}}.{{ contractName }}CollectionPublic, NonFungibleToken.CollectionPublic, NonFungibleToken.Provider, MetadataViews.ResolverCollection}>(),
        createEmptyCollectionFunction: (fun (): @NonFungibleToken.Collection {
            return <-{{ contractName }}.createEmptyCollection()
        })
    )
}
