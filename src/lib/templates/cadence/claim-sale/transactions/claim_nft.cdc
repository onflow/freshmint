import {{ contractName }} from {{{ contractAddress }}}

import NFTClaimSale from {{{ contracts.NFTClaimSale }}}
import FlowToken from {{{ contracts.FlowToken }}}
import FungibleToken from {{{ contracts.FungibleToken }}}
import NonFungibleToken from {{{ contracts.NonFungibleToken }}}

transaction(saleAddress: Address) {

    let payment: @FungibleToken.Vault
    let receiver: &{NonFungibleToken.CollectionPublic}
    let sale: &{NFTClaimSale.SalePublic}

    prepare(signer: AuthAccount) {
        if signer.borrow<&{{ contractName }}.Collection>(from: {{ contractName }}.CollectionStoragePath) == nil {
            // create a new empty collection
            let collection <- {{ contractName }}.createEmptyCollection()
            
            // save it to the account
            signer.save(<-collection, to: {{ contractName }}.CollectionStoragePath)

            // create a public capability for the collection
            signer.link<&{{ contractName }}.Collection{NonFungibleToken.CollectionPublic, {{ contractName }}.{{ contractName }}CollectionPublic}>({{ contractName }}.CollectionPublicPath, target: {{ contractName }}.CollectionStoragePath)
        }

        self.receiver = signer
            .getCapability({{ contractName }}.CollectionPublicPath)!
            .borrow<&{NonFungibleToken.CollectionPublic}>()!

        self.sale = getAccount(saleAddress)
            .getCapability(NFTClaimSale.SalePublicPath)!
            .borrow<&{NFTClaimSale.SalePublic}>()!

        let vault = signer
            .borrow<&FlowToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("Cannot borrow FLOW vault from account storage")

        let price = self.sale.price
   
        self.payment <- vault.withdraw(amount: price)
    }

    execute {
        let token <- self.sale.claim(payment: <- self.payment)
        self.receiver.deposit(token: <- token)
    }
}
