import {{ contractName }} from {{{ contractAddress }}}

import FreshmintClaimSale from {{{ imports.FreshmintClaimSale }}}
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

// This transaction claims an NFT from a sale.
//
// Parameters:
// - saleAddress: the address of the account holding the sale.
// - saleID: the ID of the sale within the account.
//
transaction(saleAddress: Address, saleID: String) {

    let address: Address
    let payment: @FungibleToken.Vault
    let sale: &{FreshmintClaimSale.SalePublic}

    prepare(signer: AuthAccount) {
        intializeCollection(account: signer)

        self.address = signer.address

        self.sale = getAccount(saleAddress)
            .getCapability(FreshmintClaimSale.SaleCollectionPublicPath)!
            .borrow<&{FreshmintClaimSale.SaleCollectionPublic}>()!
            .borrowSale(id: saleID)!

        let vault = signer
            .borrow<&FlowToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("Cannot borrow FLOW vault from account storage")

        let price = self.sale.price
   
        self.payment <- vault.withdraw(amount: price)
    }

    execute {
        self.sale.claim(payment: <- self.payment, address: self.address)
    }
}
