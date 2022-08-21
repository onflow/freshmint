import {{ contractName }} from {{{ contractAddress }}}

transaction(
    ids: [UInt64],
    metadataSalts: [String],
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
            let metadataSalt = metadataSalts[i].decodeHex()

            let metadata = {{ contractName }}.Metadata(
                metadataSalt: metadataSalt,
                {{#each fields}}
                {{ this.name }}: {{ this.name }}[i],
                {{/each}}
            )

            self.admin.revealNFT(
                id: id,
                metadata: metadata,
            )        
        }
    }
}
