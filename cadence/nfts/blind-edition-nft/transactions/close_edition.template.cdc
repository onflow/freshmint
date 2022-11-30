import {{ contractName }} from {{{ contractAddress }}}

/// This transaction closes an edition to prevent further minting.
///
/// Parameters:
/// - editionID: the ID of the edition to close.
///
transaction(editionID: UInt64) {
    
    let admin: &{{ contractName }}.Admin

    prepare(signer: AuthAccount) {
        self.admin = signer.borrow<&{{ contractName }}.Admin>(from: {{ contractName }}.AdminStoragePath)
            ?? panic("Could not borrow a reference to the NFT admin")
    }

    execute {        
        self.admin.closeEdition(editionID: editionID)        
    }
}
