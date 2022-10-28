import {{ contractName }} from {{{ contractAddress }}}

import NonFungibleToken from {{{ imports.NonFungibleToken }}}
import MetadataViews from {{{ imports.MetadataViews }}}
import FreshmintQueue from {{{ imports.FreshmintQueue }}}

pub fun getOrCreateMintQueue(
    account: AuthAccount,
    bucketName: String?
): &FreshmintQueue.CollectionQueue {

    var queueName = "Queue"
    var collectionName = "Collection"

    if let bucket = bucketName {
        queueName = "Queue_".concat(bucket)
        collectionName = "Collection_".concat(bucket)
    }

    let queuePrivatePath = {{ contractName }}.getPrivatePath(suffix: queueName)

    // Check if a queue already exists with this name
    let queueCap = account.getCapability<&FreshmintQueue.CollectionQueue>(queuePrivatePath)
    if let queueRef = queueCap.borrow() {
        return queueRef
    }

    // If no queue exists, create a new collection and queue

    let collection <- {{ contractName }}.createEmptyCollection()

    let collectionRef = &collection as &{NonFungibleToken.CollectionPublic}

    let collectionStoragePath = {{ contractName }}.getStoragePath(suffix: collectionName)
    let collectionPublicPath = {{ contractName }}.getPublicPath(suffix: collectionName)
    let collectionPrivatePath = {{ contractName }}.getPrivatePath(suffix: collectionName)

    account.save(<-collection, to: collectionStoragePath)

    account.link<&{{ contractName }}.Collection>(collectionPrivatePath, target: collectionStoragePath)
    account.link<&{{ contractName }}.Collection{NonFungibleToken.CollectionPublic, {{ contractName }}.{{ contractName }}CollectionPublic, MetadataViews.ResolverCollection}>(collectionPublicPath, target: collectionStoragePath)
    
    let queue <- FreshmintQueue.createCollectionQueue(
        collection: account.getCapability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic, MetadataViews.ResolverCollection}>(collectionPrivatePath)
    )
    
    let queueRef = &queue as &FreshmintQueue.CollectionQueue

    let queueStoragePath = {{ contractName }}.getStoragePath(suffix: queueName)
    
    account.save(<- queue, to: queueStoragePath)
    account.link<&FreshmintQueue.CollectionQueue>(queuePrivatePath, target: queueStoragePath)

    return queueRef
}

transaction(hashes: [String], bucketName: String?) {
    
    let admin: &{{ contractName }}.Admin
    let mintQueue: &FreshmintQueue.CollectionQueue

    prepare(signer: AuthAccount) {
        self.admin = signer.borrow<&{{ contractName }}.Admin>(from: {{ contractName }}.AdminStoragePath)
            ?? panic("Could not borrow a reference to the NFT admin")
        
        self.mintQueue = getOrCreateMintQueue(
            account: signer,
            bucketName: bucketName
        )
    }

    execute {
        for hash in hashes {
            let token <- self.admin.mintNFT(hash: hash.decodeHex())

            self.mintQueue.deposit(token: <- token)
        }
    }
}
