import {{ contractName }} from {{{ contractAddress }}}

import FreshmintClaimSale from {{{ imports.FreshmintClaimSale }}}
import FreshmintQueue from {{{ imports.FreshmintQueue }}}
import FungibleToken from {{{ imports.FungibleToken }}}
import NonFungibleToken from {{{ imports.NonFungibleToken }}}
import MetadataViews from {{{ imports.MetadataViews }}}

pub fun getOrCreateSaleCollection(account: AuthAccount): &FreshmintClaimSale.SaleCollection {
    if let collectionRef = account.borrow<&FreshmintClaimSale.SaleCollection>(from: FreshmintClaimSale.SaleCollectionStoragePath) {
        return collectionRef
    }

    let collection <- FreshmintClaimSale.createEmptySaleCollection()

    let collectionRef = &collection as &FreshmintClaimSale.SaleCollection

    account.save(<-collection, to: FreshmintClaimSale.SaleCollectionStoragePath)
    account.link<&FreshmintClaimSale.SaleCollection{FreshmintClaimSale.SaleCollectionPublic}>(FreshmintClaimSale.SaleCollectionPublicPath, target: FreshmintClaimSale.SaleCollectionStoragePath)
        
    return collectionRef
}

pub fun getAllowlist(account: AuthAccount, allowlistName: String): Capability<&FreshmintClaimSale.Allowlist> {
    let fullAllowlistName = FreshmintClaimSale.makeAllowlistName(name: allowlistName)

    let privatePath = {{ contractName }}.getPrivatePath(suffix: fullAllowlistName)

    return account.getCapability<&FreshmintClaimSale.Allowlist>(privatePath)
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
    paymentReceiverAddress: Address?,
    paymentReceiverPath: PublicPath?,
    bucketName: String?,
    claimLimit: UInt?,
    allowlistName: String?
) {

    let sales: &FreshmintClaimSale.SaleCollection
    let mintQueue: Capability<&{FreshmintQueue.Queue}>
    let paymentReceiver: Capability<&{FungibleToken.Receiver}>
    let allowlist: Capability<&FreshmintClaimSale.Allowlist>?

    prepare(signer: AuthAccount) {

        self.sales = getOrCreateSaleCollection(account: signer)

        var queueName = "Queue"

        if let bucket = bucketName {
            queueName = "Queue_".concat(bucket)
        }

        let queuePrivatePath = {{ contractName }}.getPrivatePath(suffix: queueName)

        self.mintQueue = signer
            .getCapability<&{FreshmintQueue.Queue}>(queuePrivatePath)

        self.paymentReceiver = getAccount(paymentReceiverAddress ?? signer.address)
            .getCapability<&{FungibleToken.Receiver}>(paymentReceiverPath ?? /public/flowTokenReceiver)

        if let name = allowlistName {
            self.allowlist = getAllowlist(account: signer, allowlistName: name)
        } else {
            self.allowlist = nil
        }
    }

    execute {
        let sale <- FreshmintClaimSale.createSale(
            id: saleID,
            queue: self.mintQueue,
            receiverPath: {{ contractName }}.CollectionPublicPath,
            paymentReceiver: self.paymentReceiver,
            price: price,
            claimLimit: claimLimit,
            allowlist: self.allowlist
        )

        self.sales.insert(<- sale)
    }
}
