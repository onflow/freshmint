import FreshmintClaimSale from {{{ imports.FreshmintClaimSale }}}

// This script returns the information about an active claim sale.
//
// Parameters:
// - saleAddress: the address of the account holding the sale.
// - saleID: the ID of the sale within the account.
//
pub fun main(saleAddress: Address, saleID: String): FreshmintClaimSale.SaleInfo? {
    if let saleCollection = getAccount(saleAddress)
        .getCapability(FreshmintClaimSale.SaleCollectionPublicPath)
        .borrow<&{FreshmintClaimSale.SaleCollectionPublic}>() {

        if let sale = saleCollection.borrowSale(id: saleID) {
            return sale.info()
        }
    }

    return nil
}
