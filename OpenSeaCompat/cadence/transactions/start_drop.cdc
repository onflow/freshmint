import OpenSeaCompat from "../contracts/OpenSeaCompat.cdc"
import FungibleToken from "../contracts/FungibleToken.cdc"

transaction(price: UFix64) {
    
    let admin: &OpenSeaCompat.Admin

    let sellerCollection: Capability<&OpenSeaCompat.Collection>
    let sellerReceiver: Capability<&{FungibleToken.Receiver}>

    prepare(signer: AuthAccount) {
        self.admin = signer
            .borrow<&OpenSeaCompat.Admin>(from: OpenSeaCompat.AdminStoragePath)
            ?? panic("Could not borrow a reference to the NFT admin")

        self.sellerCollection = signer
            .getCapability<&OpenSeaCompat.Collection>(OpenSeaCompat.CollectionPrivatePath)

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
