import {{ name }} from "../contracts/{{ name }}.cdc"
import FlowToken from "../contracts/FlowToken.cdc"
import FungibleToken from "../contracts/FungibleToken.cdc"
import NonFungibleToken from "../contracts/NonFungibleToken.cdc"

transaction {

    let payment: @FungibleToken.Vault
    let recipient: &{NonFungibleToken.CollectionPublic}

    prepare(signer: AuthAccount) {
        if signer.borrow<&{{ name }}.Collection>(from: {{ name }}.CollectionStoragePath) == nil {
            // create a new empty collection
            let collection <- {{ name }}.createEmptyCollection()
            
            // save it to the account
            signer.save(<-collection, to: {{ name }}.CollectionStoragePath)

            // create a public capability for the collection
            signer.link<&{{ name }}.Collection{NonFungibleToken.CollectionPublic, {{ name }}.{{ name }}CollectionPublic}>({{ name }}.CollectionPublicPath, target: {{ name }}.CollectionStoragePath)
        }

        let vault = signer
            .borrow<&FlowToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("Cannot borrow FLOW vault from account storage")

        let drop = {{ name }}.getDrop()!
        let price = drop.price
   
        self.payment <- vault.withdraw(amount: price)
        
        self.recipient = signer
            .getCapability({{ name }}.CollectionPublicPath)!
            .borrow<&{NonFungibleToken.CollectionPublic}>()!
    }

    execute {
        {{ name }}.claim(payment: <- self.payment, recipient: self.recipient)
    }
}
