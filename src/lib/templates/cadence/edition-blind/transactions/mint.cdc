import NonFungibleToken from {{{ contracts.NonFungibleToken }}}
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

transaction(editionHashes: [String], collectionName: String?) {
    
    let admin: &{{ contractName }}.Admin
    let collection: &{NonFungibleToken.CollectionPublic}

    prepare(signer: AuthAccount) {
        self.admin = signer.borrow<&{{ contractName }}.Admin>(from: {{ contractName }}.AdminStoragePath)
            ?? panic("Could not borrow a reference to the NFT admin")
        
        self.collection = getOrCreateCollection(account: signer, collectionName: collectionName)
    }

    execute {
        for editionHash in editionHashes {
            let token <- self.admin.mintNFT(editionHash: editionHash)

            self.collection.deposit(token: <- token)
        }
    }
}
