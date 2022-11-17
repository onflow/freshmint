import {{ contractName }} from {{{ contractAddress }}}

transaction(
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
        for i, limit in limits {
            self.admin.createEdition(
                limit: limit,
                {{#each fields}}
                {{ this.name }}: {{ this.name }}[i],
                {{/each}}
            )        
        }
    }
}
