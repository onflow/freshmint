import NonFungibleToken from {{{ imports.NonFungibleToken }}}
import {{ contractName }} from {{{ contractAddress }}}

/// This transaction withdraws an NFT from the signer's collection and destroys it.
///
/// Parameters:
/// - id: the ID of the NFT to destroy.
///
transaction(id: UInt64) {

    /// A reference to the signer's {{ contractName }} collection.
    ///
    let collectionRef: &{{ contractName }}.Collection

    prepare(signer: AuthAccount) {
        self.collectionRef = signer.borrow<&{{ contractName }}.Collection>(from: {{ contractName }}.CollectionStoragePath)
            ?? panic("failed to borrow collection")
    }

    execute {
        // withdraw the NFT from the signers's collection
        let nft <- self.collectionRef.withdraw(withdrawID: id)

        destroy nft
    }

    post {
        !self.collectionRef.getIDs().contains(id): "The NFT with the specified ID should have been deleted"
    }
}
