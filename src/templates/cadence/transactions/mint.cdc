import NonFungibleToken from "../contracts/NonFungibleToken.cdc"
import {{ name }} from "../contracts/{{ name }}.cdc"

transaction(
    name: String,
    description: String,
    image: String,
    {{#each customFields}}
    {{ this.name }}: {{ this.type }},
    {{/each}}
) {
    
    let admin: &{{ name }}.Admin
    let receiver: &{NonFungibleToken.CollectionPublic}

    prepare(signer: AuthAccount) {
        self.admin = signer.borrow<&{{ name }}.Admin>(from: {{ name }}.AdminStoragePath)
            ?? panic("Could not borrow a reference to the NFT admin")
        
        self.receiver = signer
            .getCapability({{ name }}.CollectionPublicPath)!
            .borrow<&{NonFungibleToken.CollectionPublic}>()
            ?? panic("Could not get receiver reference to the NFT Collection")
    }

    execute {
        let token <- self.admin.mintNFT(
            name: name,
            description: description,
            image: image,
            {{#each customFields}}
            {{ this.name }}: {{ this.name }},
            {{/each}}
        )
        
        self.receiver.deposit(token: <- token)
    }
}
