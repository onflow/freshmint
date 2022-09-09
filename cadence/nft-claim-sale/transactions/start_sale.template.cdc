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

pub fun getAllowlist(account: AuthAccount, allowlistName: String): Capability<&NFTClaimSale.Allowlist> {
    let fullAllowlistName = NFTClaimSale.makeAllowlistName(name: allowlistName)

    let privatePath = {{ contractName }}.getPrivatePath(suffix: fullAllowlistName)

    return account.getCapability<&NFTClaimSale.Allowlist>(privatePath)
}

// This transaction starts a new claim sale.
//
// Parameters:
// - saleID: the ID of the sale.
// - price: the price to set for the sale.
// - collectionName: (optional) the collection name to claim from.
// - allowlistName: (optional) the name of the allowlist to attach to the sale.
//
transaction(
    saleID: String,
    price: UFix64,
    collectionName: String?,
    allowlistName: String?
) {

    let sales: &NFTClaimSale.SaleCollection
    let collection: Capability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic, MetadataViews.ResolverCollection}>
    let paymentReceiver: Capability<&{FungibleToken.Receiver}>
    let allowlist: Capability<&NFTClaimSale.Allowlist>?

    prepare(signer: AuthAccount) {

        self.sales = getOrCreateSaleCollection(account: signer)

        let nftCollectionPrivatePath = {{ contractName }}.getPrivatePath(suffix: collectionName ?? "Collection")

        self.collection = signer
            .getCapability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic, MetadataViews.ResolverCollection}>(nftCollectionPrivatePath)

        self.paymentReceiver = signer
            .getCapability<&{FungibleToken.Receiver}>(/public/flowTokenReceiver)!

        if let name = allowlistName {
            self.allowlist = getAllowlist(account: signer, allowlistName: name)
        } else {
            self.allowlist = nil
        }
    }

    execute {
        let sale <- NFTClaimSale.createSale(
            id: saleID,
            nftType: Type<@{{ contractName }}.NFT>(),
            collection: self.collection,
            receiverPath: {{ contractName }}.CollectionPublicPath,
            paymentReceiver: self.paymentReceiver,
            paymentPrice: price,
            allowlist: self.allowlist
        )

        self.sales.insert(<- sale)
    }
}
