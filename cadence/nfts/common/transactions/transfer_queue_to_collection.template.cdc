import {{ contractName }} from {{{ contractAddress }}}

import NonFungibleToken from {{{ imports.NonFungibleToken }}}
import MetadataViews from {{{ imports.MetadataViews }}}
import FreshmintQueue from {{{ imports.FreshmintQueue }}}

/// This transaction moves NFTs from a queue to collection.
///
/// Parameters:
/// - fromBucketName: (optional) the bucket name to withdraw from. If nil, the default collection is used.
/// - recipientAddress: the address of the account to deposit to.
/// - count: the number of NFTs to move.
///
transaction(
    fromBucketName: String?,
    recipientAddress: Address,
    count: Int
) {

    let fromQueue: &FreshmintQueue.CollectionQueue
    let toCollection: &{NonFungibleToken.CollectionPublic}

    prepare(signer: AuthAccount) {

        // Withdraw NFTs from the main mint queue
        let fromQueueName = {{ contractName }}.makeQueueName(bucketName: fromBucketName)
        let fromQueuePrivatePath = {{ contractName }}.getPrivatePath(suffix: fromQueueName)

        self.fromQueue = signer
            .getCapability<&FreshmintQueue.CollectionQueue>(fromQueuePrivatePath)
            .borrow()!

        self.toCollection = getAccount(recipientAddress)
            .getCapability({{ contractName }}.CollectionPublicPath)
            .borrow<&{NonFungibleToken.CollectionPublic}>()
            ?? panic("failed to borrow a reference to the recipient's collection")
    }

    execute {
        var i = 0

        // Withdraw the first `count` NFTs from the queue and deposit them into the collection
        while i < count {
            let token <- self.fromQueue.getNextNFT()!

            self.toCollection.deposit(token: <- token)

            i = i + 1
        }
    }
}
