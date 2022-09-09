import NFTClaimSale from {{{ imports.NFTClaimSale }}}

// This transaction stops an existing claim sale.
//
// Parameters:
// - saleID: the ID of the sale to stop.
//
transaction(saleID: String) {
    
    let sales: &NFTClaimSale.SaleCollection

    prepare(signer: AuthAccount) {
        self.sales = signer.borrow<&NFTClaimSale.SaleCollection>(from: NFTClaimSale.SaleCollectionStoragePath)!
    }

    execute {
        let sale <- self.sales.remove(saleID: saleID)

        destroy sale
    }
}
