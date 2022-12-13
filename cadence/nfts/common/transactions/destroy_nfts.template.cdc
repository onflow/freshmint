import NonFungibleToken from {{{ imports.NonFungibleToken }}}
import {{ contractName }} from {{{ contractAddress }}}

/// This transaction withdraws multiple NFTs from the signer's collection and destroys them.
///
transaction(ids: [UInt64], fromBucketName: String?) {

    /// A reference to the signer's {{ contractName }} collection.
    ///
    let collectionRef: &{{ contractName }}.Collection

    prepare(signer: AuthAccount) {
        
        // Derive the collection path from the bucket name
        let collectionName = {{ contractName }}.makeCollectionName(bucketName: fromBucketName)
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
