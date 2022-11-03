import FreshmintClaimSaleV2 from {{{ imports.FreshmintClaimSaleV2 }}}

// This transaction sets a claim limit on an existing sale.
//
// Parameters:
// - saleID: the ID of the sale to stop.
// - claimLimit: the claim limit to set on the sale.
//
transaction(saleID: String, claimLimit: UInt?) {
    
    let sales: &FreshmintClaimSaleV2.SaleCollection

    prepare(signer: AuthAccount) {
        self.sales = signer.borrow<&FreshmintClaimSaleV2.SaleCollection>(from: FreshmintClaimSaleV2.SaleCollectionStoragePath)!
    }

    execute {
        let sale = self.sales.borrowSaleAuth(id: saleID) ?? panic("sale does not exist")

        sale.setClaimLimit(limit: claimLimit)
    }
}
