import FreshmintClaimSaleV2 from {{{ imports.FreshmintClaimSaleV2 }}}

// This transaction stops an existing claim sale.
//
// Parameters:
// - saleID: the ID of the sale to stop.
//
transaction(saleID: String) {
    
    let sales: &FreshmintClaimSaleV2.SaleCollection

    prepare(signer: AuthAccount) {
        self.sales = signer.borrow<&FreshmintClaimSaleV2.SaleCollection>(from: FreshmintClaimSaleV2.SaleCollectionStoragePath)!
    }

    execute {
        let sale <- self.sales.remove(id: saleID)

        destroy sale
    }
}
