import {{ contractName }} from {{{ contractAddress }}}

import NonFungibleToken from {{{ imports.NonFungibleToken }}}
import MetadataViews from {{{ imports.MetadataViews }}}
import FreshmintQueue from {{{ imports.FreshmintQueue }}}

/// This transaction mints a batch of NFTs.
///
/// Parameters:
/// - bucketName: (optional) the name of the collection bucket to mint into. If nil, the default collection is used.
/// - mintIDs: a unique string for each NFT used to prevent duplicate mints.
{{#each fields}}
/// - {{ this.name }}: a {{ this.name }} metadata value for each NFT (must be same length as mintIDs).
{{/each}}
///
transaction(
    bucketName: String?,
    mintIDs: [String],
    {{#each fields}}
    {{ this.name }}: [{{ this.asCadenceTypeString }}],
    {{/each}}
) {
    
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

        for i, mintID in mintIDs {

            let token <- self.admin.mintNFT(
                mintID: mintID,
                {{#each fields}}
                {{ this.name }}: {{ this.name }}[i],
                {{/each}}
                attributes: {}
            )
        
            // NFTs are minted into a queue to preserve the mint order.
            // A CollectionQueue is linked to a collection. All NFTs minted into 
            // the queue are deposited into the underlying collection.
            //
            self.mintQueue.deposit(token: <- token)
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

pub fun getOrCreateMintQueue(
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
