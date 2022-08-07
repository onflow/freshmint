import {{ contractName }} from {{{ contractAddress }}}

import NFTClaimSale from {{{ contracts.NFTClaimSale }}}
import FungibleToken from {{{ contracts.FungibleToken }}}
import NonFungibleToken from {{{ contracts.NonFungibleToken }}}

transaction(price: UFix64) {

    prepare(signer: AuthAccount) {
        let admin = signer
            .borrow<&{{ contractName }}.Admin>(from: {{ contractName }}.AdminStoragePath)
            ?? panic("Could not borrow a reference to the NFT admin")

        let collection = signer
            .getCapability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>({{ contractName }}.CollectionPrivatePath)

        let paymentReceiver = signer
            .getCapability<&{FungibleToken.Receiver}>(/public/flowTokenReceiver)!

        let sale <- NFTClaimSale.createSale(
            nftType: Type<@{{ contractName }}.NFT>(),
            collection: collection,
            paymentReceiver: paymentReceiver,
            paymentPrice: price,
        )

        signer.save(<- sale, to: NFTClaimSale.SaleStoragePath)

        signer.link<&NFTClaimSale.Sale{NFTClaimSale.SalePublic}>(
            NFTClaimSale.SalePublicPath, 
            target: NFTClaimSale.SaleStoragePath
        )
    }
}
