import {{ contractName }} from {{{ contractAddress }}}

transaction(
    ids: [UInt64],
    editionIDs: [UInt64],
    editionSerials: [UInt64],
    editionSalts: [String]
) {
    
    let admin: &{{ contractName }}.Admin

    prepare(signer: AuthAccount) {
        self.admin = signer.borrow<&{{ contractName }}.Admin>(from: {{ contractName }}.AdminStoragePath)
            ?? panic("Could not borrow a reference to the NFT admin")
    }

    execute {
        for i, id in ids {
            self.admin.revealNFT(
                id: id,
                editionID: editionIDs[i],
                editionSerial: editionSerials[i],
                // Convert salt from hex string to byte array
                editionSalt: editionSalts[i].decodeHex()
            )
        }
    }
}
