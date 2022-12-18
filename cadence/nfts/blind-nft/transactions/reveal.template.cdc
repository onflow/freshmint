import {{ contractName }} from {{{ contractAddress }}}

/// This transaction reveals a batch of NFTs from the {{ contractName }} contract.
///
/// Parameters:
/// - ids: a list of the NFT IDs to reveal.
/// - metadataSalts: a list of salt values as hex-encoded strings (must be same length as ids).
{{#each fields}}
/// - {{ this.name }}: a {{ this.name }} metadata value for each NFT (must be same length as ids).
{{/each}}
///
transaction(
    ids: [UInt64],
    salts: [String],
    {{#each fields}}
    {{ this.name }}: [{{ this.asCadenceTypeString }}],
    {{/each}}
) {
    
    let admin: &{{ contractName }}.Admin

    prepare(signer: AuthAccount) {
        self.admin = signer.borrow<&{{ contractName }}.Admin>(from: {{ contractName }}.AdminStoragePath)
            ?? panic("Could not borrow a reference to the NFT admin")
    }

    execute {
        for i, id in ids {
            // Convert salt from hex string to byte array
            let salt = salts[i].decodeHex()

            let metadata = {{ contractName }}.Metadata(
                salt: salt,
                {{#each fields}}
                {{ this.name }}: {{ this.name }}[i],
                {{/each}}
                // Use the attributes dictionary to add additional metadata
                // not defined in the original schema.
                //
                // The attributes dictionary is empty by default.
                //
                // - Attributes are NOT included as part of the blind metadata hash.
                // - Attributes must be string values.
                //
                attributes: {}
            )

            self.admin.revealNFT(
                id: id,
                metadata: metadata,
            )        
        }
    }
}
