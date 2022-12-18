import {{ contractName }} from {{{ contractAddress }}}

import NonFungibleToken from {{{ imports.NonFungibleToken }}}
import MetadataViews from {{{ imports.MetadataViews }}}
import FreshmintQueue from {{{ imports.FreshmintQueue }}}

/// This transaction mints a batch of blind NFTs.
///
/// Parameters:
/// - hashes: one metadata hash for for each NFT to be minted.
/// - bucketName: (optional) the name of the collection bucket to mint into. If nil, the default collection is used.
///
transaction(hashes: [String], bucketName: String?) {
    
    let admin: &{{ contractName }}.Admin
    let mintQueue: &FreshmintQueue.CollectionQueue

    prepare(signer: AuthAccount) {
        self.admin = signer.borrow<&{{ contractName }}.Admin>(from: {{ contractName }}.AdminStoragePath)
            ?? panic("Could not borrow a reference to the NFT admin")
        
        self.mintQueue = getOrCreateQueue(
            account: signer,
            bucketName: bucketName
        )
    }

    execute {
        // Mint one NFT for each metadata hash
        for hash in hashes {
            let token <- self.admin.mintNFT(hash: hash.decodeHex())

            // NFTs are minted into a queue to preserve the mint order.
            // A CollectionQueue is linked to a collection. All NFTs minted into 
            // the queue are deposited into the underlying collection.
            //
            self.mintQueue.deposit(token: <- token)
        }
    }
}

/// Borrow a reference to the queue with the given bucket name
/// or create one if it does not exist.
///
/// If bucketName is nil, the default queue path is used.
///
pub fun getOrCreateQueue(
    account: AuthAccount,
    bucketName: String?
): &FreshmintQueue.CollectionQueue {

    let queueName = {{ contractName }}.makeQueueName(bucketName: bucketName)
    let queuePrivatePath = {{ contractName }}.getPrivatePath(suffix: queueName)

    // Check if a queue already exists with this name.
    //
    let queueCap = account.getCapability<&FreshmintQueue.CollectionQueue>(queuePrivatePath)
    if let queueRef = queueCap.borrow() {
        return queueRef
    }

    // Create a new collection queue if one does not exist.
    //
    // The underlying collection will have the same bucket name as the queue.
    //
    let queue <- FreshmintQueue.createCollectionQueue(
        collection: getOrCreateCollection(account: account, bucketName: bucketName)
    )
    
    // Borrow a reference to the queue before we move it to storage
    // so that we can return the reference from this function.
    //
    let queueRef = &queue as &FreshmintQueue.CollectionQueue

    let queueStoragePath = {{ contractName }}.getStoragePath(suffix: queueName)
    
    account.save(<- queue, to: queueStoragePath)
    
    // Create a private link for the queue. Queues are not linked publicly.
    //
    account.link<&FreshmintQueue.CollectionQueue>(queuePrivatePath, target: queueStoragePath)

    return queueRef
}

/// Borrow a capability to the collection with the given bucket name
/// or create one if it does not exist.
///
/// If bucketName is nil, the default collection path is used.
///
pub fun getOrCreateCollection(
    account: AuthAccount,
    bucketName: String?
): Capability<&NonFungibleToken.Collection> {

    let collectionName = {{ contractName }}.makeCollectionName(bucketName: bucketName)
    let collectionPrivatePath = {{ contractName }}.getPrivatePath(suffix: collectionName)

    let collectionCap = account.getCapability<&NonFungibleToken.Collection>(collectionPrivatePath)

    // Check to see if the capability links to an existing collection.
    //
    if collectionCap.check() {
        return collectionCap
    }

    // Create an empty collection if one does not exist.
    //
    let collection <- {{ contractName }}.createEmptyCollection()

    let collectionStoragePath = {{ contractName }}.getStoragePath(suffix: collectionName)
    let collectionPublicPath = {{ contractName }}.getPublicPath(suffix: collectionName)

    account.save(<-collection, to: collectionStoragePath)

    account.link<&{{ contractName }}.Collection>(collectionPrivatePath, target: collectionStoragePath)
    account.link<&{{ contractName }}.Collection{NonFungibleToken.CollectionPublic, {{ contractName }}.{{ contractName }}CollectionPublic, MetadataViews.ResolverCollection}>(collectionPublicPath, target: collectionStoragePath)
    
    return collectionCap
}
