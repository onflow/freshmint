import {{ contractName }} from {{{ contractAddress }}}

import NFTClaimSale from {{{ imports.NFTClaimSale }}}
import FungibleToken from {{{ imports.FungibleToken }}}
import NonFungibleToken from {{{ imports.NonFungibleToken }}}
import MetadataViews from {{{ imports.MetadataViews }}}
import FlowToken from {{{ imports.FlowToken }}}

pub fun intializeCollection(account: AuthAccount) {
    if account.borrow<&{{ contractName }}.Collection>(from: {{ contractName }}.CollectionStoragePath) == nil {
        let collection <- {{ contractName }}.createEmptyCollection()
        
        account.save(<-collection, to: {{ contractName }}.CollectionStoragePath)

        account.link<&{{ contractName }}.Collection{NonFungibleToken.CollectionPublic, {{ contractName }}.{{ contractName }}CollectionPublic, MetadataViews.ResolverCollection}>(
            {{ contractName }}.CollectionPublicPath, 
            target: {{ contractName }}.CollectionStoragePath
        )
    }
}

transaction(saleAddress: Address, saleID: String) {

    let payment: @FungibleToken.Vault
    let receiver: &{NonFungibleToken.CollectionPublic}
    let sale: &{NFTClaimSale.SalePublic}

    prepare(signer: AuthAccount) {
        intializeCollection(account: signer)

        self.receiver = signer
            .getCapability({{ contractName }}.CollectionPublicPath)!
            .borrow<&{NonFungibleToken.CollectionPublic}>()!

        self.sale = getAccount(saleAddress)
            .getCapability(NFTClaimSale.SaleCollectionPublicPath)!
            .borrow<&{NFTClaimSale.SaleCollectionPublic}>()!
            .borrowSale(id: saleID)

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
