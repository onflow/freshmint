import NonFungibleToken from {{{ contracts.NonFungibleToken }}}
import {{ contractName }} from {{{ contractAddress }}}

transaction(
    sizes: [UInt],
    {{#each fields}}
    {{ this.name }}: [{{ this.asCadenceTypeString }}],
    {{/each}}
) {
    
    let admin: &{{ contractName }}.Admin
    let receiver: &{NonFungibleToken.CollectionPublic}

    prepare(signer: AuthAccount) {
        self.admin = signer.borrow<&{{ contractName }}.Admin>(from: {{ contractName }}.AdminStoragePath)
            ?? panic("Could not borrow a reference to the NFT admin")
        
        self.receiver = signer
            .getCapability({{ contractName }}.CollectionPublicPath)!
            .borrow<&{NonFungibleToken.CollectionPublic}>()
            ?? panic("Could not get receiver reference to the NFT Collection")
    }

    execute {
        var i = 0
        
        while i < {{ fields.[0].name }}.length {

            self.admin.createEdition(
                size: sizes[i],
                {{#each fields}}
                {{ this.name }}: {{ this.name }}[i],
                {{/each}}
            )
        
            i = i +1
        }
    }
}
