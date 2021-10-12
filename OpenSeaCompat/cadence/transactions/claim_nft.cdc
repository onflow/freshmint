import OpenSeaCompat from "../contracts/OpenSeaCompat.cdc"
import FlowToken from "../contracts/FlowToken.cdc"
import FungibleToken from "../contracts/FungibleToken.cdc"
import NonFungibleToken from "../contracts/NonFungibleToken.cdc"

transaction {

    let payment: @FungibleToken.Vault
    let recipient: &{NonFungibleToken.CollectionPublic}

    prepare(signer: AuthAccount) {
        if signer.borrow<&OpenSeaCompat.Collection>(from: OpenSeaCompat.CollectionStoragePath) == nil {
            // create a new empty collection
            let collection <- OpenSeaCompat.createEmptyCollection()
            
            // save it to the account
            signer.save(<-collection, to: OpenSeaCompat.CollectionStoragePath)

            // create a public capability for the collection
            signer.link<&OpenSeaCompat.Collection{NonFungibleToken.CollectionPublic, OpenSeaCompat.OpenSeaCompatCollectionPublic}>(OpenSeaCompat.CollectionPublicPath, target: OpenSeaCompat.CollectionStoragePath)
        }

        let vault = signer
            .borrow<&FlowToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("Cannot borrow FLOW vault from account storage")

        let drop = OpenSeaCompat.getDrop()!
        let price = drop.price
   
        self.payment <- vault.withdraw(amount: price)
        
        self.recipient = signer
            .getCapability(OpenSeaCompat.CollectionPublicPath)!
            .borrow<&{NonFungibleToken.CollectionPublic}>()!
    }

    execute {
        OpenSeaCompat.claim(payment: <- self.payment, recipient: self.recipient)
    }
}
