import NonFungibleToken from "../../contracts/NonFungibleToken.cdc"
import {{ name }} from "../../contracts/{{ name }}.cdc"
import NFTAirDrop from "../../contracts/NFTAirDrop.cdc"

transaction(
    publicKey: String,
    name: String,
    description: String,
    image: String,
    {{#each customFields}}
    {{ this.name }}: {{ this.type.toCadence }},
    {{/each}}
) {
    
    let admin: &{{ name }}.Admin
    let drop: &NFTAirDrop.Drop

    prepare(signer: AuthAccount) {
        self.admin = signer
            .borrow<&{{ name }}.Admin>(from: {{ name }}.AdminStoragePath)
            ?? panic("Could not borrow a reference to the NFT admin")
        
        if let existingDrop = signer.borrow<&NFTAirDrop.Drop>(from: NFTAirDrop.DropStoragePath) {
            self.drop = existingDrop
        } else {
            let collection = signer.getCapability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>({{ name }}.CollectionPrivatePath)

            let drop <- NFTAirDrop.createDrop(
                nftType: Type<@{{ name }}.NFT>(),
                collection: collection
            )

            self.drop = &drop as &NFTAirDrop.Drop

            signer.save(<- drop, to: NFTAirDrop.DropStoragePath)

            signer.link<&NFTAirDrop.Drop{NFTAirDrop.DropPublic}>(
                NFTAirDrop.DropPublicPath, 
                target: NFTAirDrop.DropStoragePath
            )
        }
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

        self.drop.deposit(token: <- token, publicKey: publicKey.decodeHex())
    }
}
