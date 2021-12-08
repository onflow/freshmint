import {{ name }} from "../../contracts/{{ name }}.cdc"
import NFTAirDrop from "../../contracts/NFTAirDrop.cdc"
import FlowToken from "../../contracts/FlowToken.cdc"
import FungibleToken from "../../contracts/FungibleToken.cdc"
import NonFungibleToken from "../../contracts/NonFungibleToken.cdc"

transaction(dropAddress: Address, id: UInt64, signature: String) {

    let receiver: &{NonFungibleToken.CollectionPublic}
    let drop: &{NFTAirDrop.DropPublic}

    prepare(signer: AuthAccount) {
        if signer.borrow<&{{ name }}.Collection>(from: {{ name }}.CollectionStoragePath) == nil {
            // create a new empty collection
            let collection <- {{ name }}.createEmptyCollection()
            
            // save it to the account
            signer.save(<-collection, to: {{ name }}.CollectionStoragePath)

            // create a public capability for the collection
            signer.link<&{{ name }}.Collection{NonFungibleToken.CollectionPublic, {{ name }}.{{ name }}CollectionPublic}>(
                {{ name }}.CollectionPublicPath, 
                target: {{ name }}.CollectionStoragePath
            )
        }
           
        self.receiver = signer
            .getCapability({{ name }}.CollectionPublicPath)!
            .borrow<&{NonFungibleToken.CollectionPublic}>()!

        self.drop = getAccount(dropAddress)
            .getCapability(NFTAirDrop.DropPublicPath)!
            .borrow<&{NFTAirDrop.DropPublic}>()!
    }

    execute {
        self.drop.claim(
            id: id, 
            signature: signature.decodeHex(), 
            receiver: self.receiver,
        )
    }
}
