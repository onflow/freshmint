import {{ contractName }} from {{{ contractAddress }}}

/// This transaction creates a batch of new editions.
///
/// Parameters:
/// - mintIDs: a list containing the mint ID for each edition.
/// - limits: a list containing an optional size limit for each edition.
///
transaction(
    mintIDs: [String],
    limits: [UInt64?],
    metadataValues: [{String: AnyStruct}]
) {
    
    let admin: &{{ contractName }}.Admin

    prepare(signer: AuthAccount) {
        self.admin = signer.borrow<&{{ contractName }}.Admin>(from: {{ contractName }}.AdminStoragePath)
            ?? panic("Could not borrow a reference to the NFT admin")
    }

    execute {        
        for i, mintID in mintIDs {
            self.admin.createEdition(
                mintID: mintID,
                limit: limits[i],
                metadata: metadataValues[i]
            )        
        }
    }
}
