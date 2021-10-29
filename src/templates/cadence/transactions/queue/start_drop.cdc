import {{ name }} from "../../contracts/{{ name }}.cdc"
import NFTQueueDrop from "../../contracts/NFTQueueDrop.cdc"
import NonFungibleToken from "../../contracts/NonFungibleToken.cdc"
import FungibleToken from "../../contracts/FungibleToken.cdc"

transaction(price: UFix64) {

    prepare(signer: AuthAccount) {
        let admin = signer
            .borrow<&{{ name }}.Admin>(from: {{ name }}.AdminStoragePath)
            ?? panic("Could not borrow a reference to the NFT admin")

        let collection = signer
            .getCapability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>({{ name }}.CollectionPrivatePath)

        let paymentReceiver = signer
            .getCapability<&{FungibleToken.Receiver}>(/public/flowTokenReceiver)!

        let drop <- NFTQueueDrop.createDrop(
            nftType: Type<@{{ name }}.NFT>(),
            collection: collection,
            paymentReceiver: paymentReceiver,
            paymentPrice: price,
        )

        signer.save(<- drop, to: NFTQueueDrop.DropStoragePath)

        signer.link<&NFTQueueDrop.Drop{NFTQueueDrop.DropPublic}>(
            NFTQueueDrop.DropPublicPath, 
            target: NFTQueueDrop.DropStoragePath
        )
    }
}
