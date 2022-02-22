import NonFungibleToken from "../contracts/NonFungibleToken.cdc"
import {{ name }} from "../contracts/{{ name }}.cdc"

transaction(
    names: [String],
    descriptions: [String],
    images: [String],
    {{#each customFields}}
    {{ this.name }}: [{{ this.type.toCadence }}],
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
        var i = 0
        
        while i < names.length {

            let token <- self.admin.mintNFT(
                name: names[i],
                description: descriptions[i],
                image: images[i],
                {{#each customFields}}
                {{ this.name }}: {{ this.name }}[i],
                {{/each}}
            )
        
            self.receiver.deposit(token: <- token)

            i = i +1
        }
    }
}
