import NonFungibleToken from {{{ contracts.NonFungibleToken }}}
import FungibleToken from {{{ contracts.FungibleToken }}}

pub contract NFTClaimSale {

    pub event Claimed(nftType: Type, nftID: UInt64)

    pub let SaleStoragePath: StoragePath
    pub let SalePublicPath: PublicPath

    pub resource interface SalePublic {
        pub let price: UFix64
        pub let size: Int
        pub fun supply(): Int
        pub fun isActive(): Bool
        pub fun claim(payment: @FungibleToken.Vault): @NonFungibleToken.NFT
    }

    pub resource Sale: SalePublic {

        access(self) let nftType: Type
        access(self) let collection: Capability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>
        access(self) let paymentReceiver: Capability<&{FungibleToken.Receiver}>

        pub let price: UFix64
        pub let size: Int

        pub fun supply(): Int {
            return self.collection.borrow()!.getIDs().length
        }

        pub fun isActive(): Bool {
            return self.supply() != 0
        }

        access(self) fun pop(): @NonFungibleToken.NFT {
            let collection = self.collection.borrow()!
            let ids = collection.getIDs()
            let nextID = ids[0]

            return <- collection.withdraw(withdrawID: nextID)
        }

        pub fun claim(payment: @FungibleToken.Vault): @NonFungibleToken.NFT {
            pre {
                payment.balance == self.price: "payment vault does not contain requested price"
            }

            let collection = self.collection.borrow()!

            if collection.getIDs().length == 0 {
                panic("Sale is sold out")
            }

            let receiver = self.paymentReceiver.borrow()!

            receiver.deposit(from: <- payment)

            let nft <- self.pop()

            emit Claimed(nftType: self.nftType, nftID: nft.id)

            return <- nft
        }

        init(
            nftType: Type,
            collection: Capability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>, 
            paymentReceiver: Capability<&{FungibleToken.Receiver}>,
            paymentPrice: UFix64
        ) {
            self.nftType = nftType
            self.collection = collection
            self.paymentReceiver = paymentReceiver
            self.price = paymentPrice
            self.size = collection.borrow()!.getIDs().length
        }
    }

    pub fun createSale(
        nftType: Type,
        collection: Capability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>, 
        paymentReceiver: Capability<&{FungibleToken.Receiver}>,
        paymentPrice: UFix64
    ): @Sale {
        return <- create Sale(
            nftType: nftType,
            collection: collection,
            paymentReceiver: paymentReceiver,
            paymentPrice: paymentPrice
        )
    }

    init() {
        self.SaleStoragePath = /storage/NFTClaimSale
        self.SalePublicPath = /public/NFTClaimSale
    }
}
