import FreshmintClaimSale from {{{ imports.FreshmintClaimSale }}}

// This transaction sets a claim limit on an existing sale.
//
// Parameters:
// - saleID: the ID of the sale to stop.
// - claimLimit: the claim limit to set on the sale.
//
transaction(saleID: String, claimLimit: UInt?) {
    
    let sales: &FreshmintClaimSale.SaleCollection

    prepare(signer: AuthAccount) {
        self.sales = signer.borrow<&FreshmintClaimSale.SaleCollection>(from: FreshmintClaimSale.SaleCollectionStoragePath)!
    }

    execute {
        let sale = self.sales.borrowSaleAuth(id: saleID) ?? panic("sale does not exist")

        sale.setClaimLimit(limit: claimLimit)
    }
}
