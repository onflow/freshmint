import {{ name }} from "../contracts/{{ name }}.cdc"
import FungibleToken from "../contracts/FungibleToken.cdc"

transaction(price: UFix64) {
    
    let admin: &{{ name }}.Admin

    let sellerCollection: Capability<&{{ name }}.Collection>
    let sellerReceiver: Capability<&{FungibleToken.Receiver}>

    prepare(signer: AuthAccount) {
        self.admin = signer
            .borrow<&{{ name }}.Admin>(from: {{ name }}.AdminStoragePath)
            ?? panic("Could not borrow a reference to the NFT admin")

        self.sellerCollection = signer
            .getCapability<&{{ name }}.Collection>({{ name }}.CollectionPrivatePath)

        self.sellerReceiver = signer
            .getCapability<&{FungibleToken.Receiver}>(/public/flowTokenReceiver)!
    }

    execute {
        self.admin.startDrop(
            sellerCollection: self.sellerCollection,
            sellerReceiver: self.sellerReceiver, 
            price: price,
        )
    }
}
