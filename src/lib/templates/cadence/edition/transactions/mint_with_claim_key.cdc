import NonFungibleToken from {{{ contracts.NonFungibleToken }}}
import NFTAirDrop from {{{ contracts.NFTAirDrop }}}
import {{ contractName }} from {{{ contractAddress }}}

pub fun getOrCreateCollection(account: AuthAccount, collectionName: String?): &{NonFungibleToken.CollectionPublic} {

    let storagePath = {{ contractName }}.getCollectionStoragePath(collectionName: collectionName)

    if let collectionRef = account.borrow<&{NonFungibleToken.CollectionPublic}>(from: storagePath) {
        return collectionRef
    }

    let collection <- {{ contractName }}.createEmptyCollection()

    let collectionRef = &collection as &{NonFungibleToken.CollectionPublic}

    let publicPath = {{ contractName }}.getCollectionPublicPath(collectionName: collectionName)
    let privatePath = {{ contractName }}.getCollectionPrivatePath(collectionName: collectionName)

    account.save(<-collection, to: storagePath)

    account.link<&{{ contractName }}.Collection>(privatePath, target: storagePath)
    account.link<&{{ contractName }}.Collection{NonFungibleToken.CollectionPublic, {{ contractName }}.{{ contractName }}CollectionPublic}>(publicPath, target: storagePath)
    
    return collectionRef
}

pub fun getOrCreateDrop(account: AuthAccount): &NFTAirDrop.Drop {
    if let existingDrop = account.borrow<&NFTAirDrop.Drop>(from: NFTAirDrop.DropStoragePath) {
        return existingDrop
    }

    let collection = account.getCapability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>({{ contractName }}.CollectionPrivatePath)

    let drop <- NFTAirDrop.createDrop(
        nftType: Type<@{{ contractName }}.NFT>(),
        collection: collection
    )

    let drop = &drop as &NFTAirDrop.Drop

    account.save(<- drop, to: NFTAirDrop.DropStoragePath)

    account.link<&NFTAirDrop.Drop{NFTAirDrop.DropPublic}>(
        NFTAirDrop.DropPublicPath, 
        target: NFTAirDrop.DropStoragePath
    )

    return drop
}

transaction(
    publicKeys: [String],
    editionIDs: [UInt64],
    editionSerials: [UInt64],
    collectionName: String?
) {
    
    let admin: &{{ contractName }}.Admin
    let collection: &{NonFungibleToken.CollectionPublic}
    let drop: &NFTAirDrop.Drop

    prepare(signer: AuthAccount) {
        self.admin = signer.borrow<&{{ contractName }}.Admin>(from: {{ contractName }}.AdminStoragePath)
            ?? panic("Could not borrow a reference to the NFT admin")
        
        self.collection = getOrCreateCollection(account: signer, collectionName: collectionName)

        self.drop = getOrCreateDrop(signer)
    }

    pre {
        publicKeys.length == editionIDs.length : "input arrays must be equal length",
        editionIDs.length == editionSerials.length : "input arrays must be equal length"
    }

    execute {
        for i, editionID in editionIDs {
            let token <- self.admin.mintNFT(
                editionID: editionID,
                editionSerial: editionSerials[i],
            )

            self.drop.deposit(
                token: <- token, 
                publicKey: publicKeys[i].decodeHex()
            )
        }
    }
}
