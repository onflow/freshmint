import {{ contractName }} from {{{ contractAddress }}}

import NonFungibleToken from {{{ imports.NonFungibleToken }}}
import MetadataViews from {{{ imports.MetadataViews }}}

pub fun getOrCreateCollection(account: AuthAccount, collectionName: String): &{NonFungibleToken.CollectionPublic} {

    let storagePath = {{ contractName }}.getStoragePath(suffix: collectionName)

    if let collectionRef = account.borrow<&{NonFungibleToken.CollectionPublic}>(from: storagePath) {
        return collectionRef
    }

    let collection <- {{ contractName }}.createEmptyCollection()

    let collectionRef = &collection as &{NonFungibleToken.CollectionPublic}

    let publicPath = {{ contractName }}.getPublicPath(suffix: collectionName)
    let privatePath = {{ contractName }}.getPrivatePath(suffix: collectionName)

    account.save(<-collection, to: storagePath)

    account.link<&{{ contractName }}.Collection>(privatePath, target: storagePath)
    account.link<&{{ contractName }}.Collection{NonFungibleToken.CollectionPublic, {{ contractName }}.{{ contractName }}CollectionPublic, MetadataViews.ResolverCollection}>(publicPath, target: storagePath)
    
    return collectionRef
}

transaction(editionHashes: [String], collectionName: String?) {
    
    let admin: &{{ contractName }}.Admin
    let collection: &{NonFungibleToken.CollectionPublic}

    prepare(signer: AuthAccount) {
        self.admin = signer.borrow<&{{ contractName }}.Admin>(from: {{ contractName }}.AdminStoragePath)
            ?? panic("Could not borrow a reference to the NFT admin")
        
        self.collection = getOrCreateCollection(account: signer, collectionName: collectionName ?? "Collection")
    }

    execute {
        for editionHash in editionHashes {
            let token <- self.admin.mintNFT(editionHash: editionHash.decodeHex())

            self.collection.deposit(token: <- token)
        }
    }
}
