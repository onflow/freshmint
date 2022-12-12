import NonFungibleToken from {{{ imports.NonFungibleToken }}}
import {{ contractName }} from {{{ contractAddress }}}

/// This transaction transfers a {{ contractName }} NFT from one account to another.
///
transaction(recipient: Address, ids: [UInt64]) {

    /// Reference to the sender's collection
    let withdrawRef: &{{ contractName }}.Collection

    /// Public reference to the receiver's collection
    let depositRef: &{NonFungibleToken.CollectionPublic}

    prepare(signer: AuthAccount) {
        // Borrow a reference to the signer's NFT collection
        self.withdrawRef = signer
            .borrow<&{{ contractName }}.Collection>(from: {{ contractName }}.CollectionStoragePath)
            ?? panic("Account does not store an object at the specified path")

        // Get the recipient's public account object
        let recipient = getAccount(recipient)

        // Borrow a public reference to the receiver's collection
        self.depositRef = recipient
            .getCapability({{ contractName }}.CollectionPublicPath)
            .borrow<&{NonFungibleToken.CollectionPublic}>()
            ?? panic("Could not borrow a reference to the receiver's collection")
    }

    execute {
        for id in ids {
            // Withdraw the NFT from the owner's collection
            let nft <- self.withdrawRef.withdraw(withdrawID: id)

            // Deposit the NFT in the recipient's collection
            self.depositRef.deposit(token: <-nft)
        }
    }
}
