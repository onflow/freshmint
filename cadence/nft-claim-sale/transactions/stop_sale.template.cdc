import NFTClaimSale from {{{ imports.NFTClaimSale }}}

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
