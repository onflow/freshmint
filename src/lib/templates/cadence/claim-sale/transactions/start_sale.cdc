import {{ contractName }} from {{{ contractAddress }}}

import NFTClaimSale from {{{ contracts.NFTClaimSale }}}
import FungibleToken from {{{ contracts.FungibleToken }}}
import NonFungibleToken from {{{ contracts.NonFungibleToken }}}

pub fun getOrCreateSaleCollection(account: AuthAccount): &NFTClaimSale.SaleCollection {
    if let collectionRef = account.borrow<&NFTClaimSale.SaleCollection>(from: NFTClaimSale.SaleCollectionStoragePath) {
        return collectionRef
    }

    let collection <- NFTClaimSale.createEmptySaleCollection()

    let collectionRef = &collection as &NFTClaimSale.SaleCollection

    account.save(<-collection, to: NFTClaimSale.SaleCollectionStoragePath)
    account.link<&NFTClaimSale.SaleCollection{NFTClaimSale.SaleCollectionPublic}>(NFTClaimSale.SaleCollectionPublicPath, target: NFTClaimSale.SaleCollectionStoragePath)
        
    return collectionRef
}

transaction(saleID: String, price: UFix64, collectionName: String?) {

    let sales: &NFTClaimSale.SaleCollection
    let nfts: Capability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>
    let paymentReceiver: Capability<&{FungibleToken.Receiver}>

    prepare(signer: AuthAccount) {

        self.sales = getOrCreateSaleCollection(account: signer)

        let nftCollectionPrivatePath = {{ contractName }}.getCollectionPrivatePath(collectionName: collectionName)

        self.nfts = signer
            .getCapability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>(nftCollectionPrivatePath)

        self.paymentReceiver = signer
            .getCapability<&{FungibleToken.Receiver}>(/public/flowTokenReceiver)!
    }

    execute {
        let sale <- NFTClaimSale.createSale(
            id: saleID,
            nftType: Type<@{{ contractName }}.NFT>(),
            collection: self.nfts,
            paymentReceiver: self.paymentReceiver,
            paymentPrice: price,
        )

        self.sales.insert(<- sale)
    }
}
