import {{ contractName }} from {{{ contractAddress }}}

/// This transaction reveals the serial numbers for a batch of NFTs.
///
/// Parameters:
/// - ids: the NFT IDs to reveal.
/// - serialNumbers: a serial number for each NFT (must be same length as ids).
/// - salts: a hex-encoded salt value for each NFT (must be same length as ids).
///
transaction(
    ids: [UInt64],
    serialNumbers: [UInt64],
    salts: [String]
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
                serialNumber: serialNumbers[i],
                // Convert salt from hex string to byte array
                salt: salts[i].decodeHex()
            )
        }
    }
}
