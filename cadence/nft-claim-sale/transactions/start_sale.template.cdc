import {{ contractName }} from {{{ contractAddress }}}

import NFTClaimSale from {{{ imports.NFTClaimSale }}}
import FungibleToken from {{{ imports.FungibleToken }}}
import NonFungibleToken from {{{ imports.NonFungibleToken }}}

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

pub fun getAllowlist(account: AuthAccount, useAllowlist: Bool): Capability<&NFTClaimSale.Allowlist>? {
    if useAllowlist {
        let privatePath = {{ contractName }}.getPrivatePath(suffix: "Allowlist")

        return account.getCapability<&NFTClaimSale.Allowlist>(privatePath)
    }

    return nil
}

transaction(
    saleID: String,
    price: UFix64,
    collectionName: String?,
    useAllowlist: Bool
) {

    let sales: &NFTClaimSale.SaleCollection
    let nfts: Capability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>
    let paymentReceiver: Capability<&{FungibleToken.Receiver}>
    let allowlist: Capability<&NFTClaimSale.Allowlist>?

    prepare(signer: AuthAccount) {

        self.sales = getOrCreateSaleCollection(account: signer)

        let nftCollectionPrivatePath = {{ contractName }}.getPrivatePath(suffix: collectionName ?? "Collection")

        self.nfts = signer
            .getCapability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>(nftCollectionPrivatePath)

        self.paymentReceiver = signer
            .getCapability<&{FungibleToken.Receiver}>(/public/flowTokenReceiver)!

        self.allowlist = getAllowlist(account: signer, useAllowlist: useAllowlist)
    }

    execute {
        let sale <- NFTClaimSale.createSale(
            id: saleID,
            nftType: Type<@{{ contractName }}.NFT>(),
            collection: self.nfts,
            receiverPath: {{ contractName }}.CollectionPublicPath,
            paymentReceiver: self.paymentReceiver,
            paymentPrice: price,
            allowlist: self.allowlist
        )

        self.sales.insert(<- sale)
    }
}
