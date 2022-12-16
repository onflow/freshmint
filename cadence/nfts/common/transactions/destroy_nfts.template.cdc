import NonFungibleToken from {{{ imports.NonFungibleToken }}}
import {{ contractName }} from {{{ contractAddress }}}

/// This transaction withdraws multiple NFTs from the signer's collection and destroys them.
///
/// Parameters:
/// - ids: the IDs of the NFTs to destroy.
/// - bucketName: (optional) the collection bucket to withdraw from. If nil, the default collection is used.
///
transaction(ids: [UInt64], bucketName: String?) {

    /// A reference to the signer's {{ contractName }} collection.
    ///
    let collectionRef: &{{ contractName }}.Collection

    prepare(signer: AuthAccount) {
        
        // Derive the collection path from the bucket name
        let collectionName = {{ contractName }}.makeCollectionName(bucketName: bucketName)
        let collectionStoragePath = {{ contractName }}.getStoragePath(suffix: collectionName)

        self.collectionRef = signer.borrow<&{{ contractName }}.Collection>(from: collectionStoragePath)
            ?? panic("failed to borrow collection")
    }

    execute {
        for id in ids {
            // withdraw the NFT from the signers's collection
            let nft <- self.collectionRef.withdraw(withdrawID: id)

            destroy nft
        }
    }
}
