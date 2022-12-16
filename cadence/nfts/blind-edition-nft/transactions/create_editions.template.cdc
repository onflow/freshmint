import {{ contractName }} from {{{ contractAddress }}}

/// This transaction creates a batch of edition templates.
///
/// Parameters:
/// - mintIDs: a unique identifier for each edition, used to prevent duplicate mints.
/// - limits: an optional limit for each edition.
{{#each fields}}
/// - {{ this.name }}: a {{ this.name }} metadata value for each NFT (must be same length as limits).
{{/each}}
///
transaction(
    mintIDs: [String],
    limits: [UInt64?],
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
        for i, mintID in mintIDs {
            self.admin.createEdition(
                mintID: mintID,
                limit: limits[i],
                {{#each fields}}
                {{ this.name }}: {{ this.name }}[i],
                {{/each}}
                attributes: {}
            )
        }
    }
}
