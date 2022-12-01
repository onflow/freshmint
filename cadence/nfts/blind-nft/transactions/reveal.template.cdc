import {{ contractName }} from {{{ contractAddress }}}

transaction(
    ids: [UInt64],
    metadataSalts: [String],
    metadataValues: [{String: AnyStruct}]
) {
    
    let admin: &{{ contractName }}.Admin

    prepare(signer: AuthAccount) {
        self.admin = signer.borrow<&{{ contractName }}.Admin>(from: {{ contractName }}.AdminStoragePath)
            ?? panic("Could not borrow a reference to the NFT admin")
    }

    execute {
        for i, id in ids {
            // Convert salt from hex string to byte array
            let metadataSalt = metadataSalts[i].decodeHex()

            let metadata = {{ contractName }}.Metadata(
                salt: metadataSalt,
                metadata: metadataValues[i]
            )

            self.admin.revealNFT(
                id: id,
                metadata: metadata,
            )        
        }
    }
}
