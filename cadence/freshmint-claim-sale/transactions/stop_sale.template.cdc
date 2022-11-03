import FreshmintClaimSale from {{{ imports.FreshmintClaimSale }}}

// This transaction stops an existing claim sale.
//
// Parameters:
// - saleID: the ID of the sale to stop.
//
transaction(saleID: String) {
    
    let sales: &FreshmintClaimSale.SaleCollection

    prepare(signer: AuthAccount) {
        self.sales = signer.borrow<&FreshmintClaimSale.SaleCollection>(from: FreshmintClaimSale.SaleCollectionStoragePath)!
    }

    execute {
        let sale <- self.sales.remove(id: saleID)

        destroy sale
    }
}
