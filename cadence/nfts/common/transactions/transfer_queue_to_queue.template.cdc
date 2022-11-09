import {{ contractName }} from {{{ contractAddress }}}

import NonFungibleToken from {{{ imports.NonFungibleToken }}}
import MetadataViews from {{{ imports.MetadataViews }}}
import FreshmintQueue from {{{ imports.FreshmintQueue }}}

/// This transaction moves NFTs from one queue to another within the signer's account.
///
/// Parameters:
/// - fromBucketName: the bucket name to withdraw from. If nil, the default bucket is used.
/// - toBucketName: the bucket name to deposit to. If nil, the default bucket is used.
/// - count: the number of NFTs to move.
///
transaction(
    fromBucketName: String?,
    toBucketName: String?,
    count: Int
) {

    let fromQueue: &FreshmintQueue.CollectionQueue
    let toQueue: &FreshmintQueue.CollectionQueue

    prepare(signer: AuthAccount) {

        // Withdraw NFTs from the main mint queue
        let fromQueueName = {{ contractName }}.makeQueueName(bucketName: fromBucketName)
        let fromQueuePrivatePath = {{ contractName }}.getPrivatePath(suffix: fromQueueName)

        self.fromQueue = signer
            .getCapability<&FreshmintQueue.CollectionQueue>(fromQueuePrivatePath)
            .borrow()!

        self.toQueue = getOrCreateQueue(
            account: signer,
            bucketName: toBucketName
        )
    }

    execute {
        var i = 0

        // Withdraw the first `count` NFTs from one queue and deposit them into the other
        while i < count {
            let token <- self.fromQueue.getNextNFT()!

            self.toQueue.deposit(token: <- token)

            i = i + 1
        }
    }
}

pub fun getOrCreateCollection(
    account: AuthAccount,
    bucketName: String?
): Capability<&NonFungibleToken.Collection> {

    let collectionName = {{ contractName }}.makeCollectionName(bucketName: bucketName)

    let collectionPrivatePath = {{ contractName }}.getPrivatePath(suffix: collectionName)

    let collectionCap = account.getCapability<&NonFungibleToken.Collection>(collectionPrivatePath)

    if collectionCap.check() {
        return collectionCap
    }

    // Create an empty collection if one does not exist

    let collection <- {{ contractName }}.createEmptyCollection()

    let collectionStoragePath = {{ contractName }}.getStoragePath(suffix: collectionName)
    let collectionPublicPath = {{ contractName }}.getPublicPath(suffix: collectionName)

    account.save(<-collection, to: collectionStoragePath)

    account.link<&{{ contractName }}.Collection>(collectionPrivatePath, target: collectionStoragePath)
    account.link<&{{ contractName }}.Collection{NonFungibleToken.CollectionPublic, {{ contractName }}.{{ contractName }}CollectionPublic, MetadataViews.ResolverCollection}>(collectionPublicPath, target: collectionStoragePath)
    
    return collectionCap
}

pub fun getOrCreateQueue(
    account: AuthAccount,
    bucketName: String?
): &FreshmintQueue.CollectionQueue {

    let queueName = {{ contractName }}.makeQueueName(bucketName: bucketName)

    let queuePrivatePath = {{ contractName }}.getPrivatePath(suffix: queueName)

    // Check if a queue already exists with this name
    let queueCap = account.getCapability<&FreshmintQueue.CollectionQueue>(queuePrivatePath)
    if let queueRef = queueCap.borrow() {
        return queueRef
    }

    // Create a new queue if one does not exist

    let queue <- FreshmintQueue.createCollectionQueue(
        collection: getOrCreateCollection(account: account, bucketName: bucketName)
    )
    
    let queueRef = &queue as &FreshmintQueue.CollectionQueue

    let queueStoragePath = {{ contractName }}.getStoragePath(suffix: queueName)
    
    account.save(<- queue, to: queueStoragePath)
    account.link<&FreshmintQueue.CollectionQueue>(queuePrivatePath, target: queueStoragePath)

    return queueRef
}
