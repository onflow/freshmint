import NFTClaimSale from {{{ contracts.NFTClaimSale }}}

transaction {
    
    prepare(signer: AuthAccount) {

        signer.unlink(NFTClaimSale.SalePublicPath)

        let sale <- signer.load<@NFTClaimSale.Sale>(from: NFTClaimSale.SaleStoragePath)

        destroy sale
    }
}
