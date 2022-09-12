import NonFungibleToken from {{{ imports.NonFungibleToken }}}
import MetadataViews from {{{ imports.MetadataViews }}}
import FungibleToken from {{{ imports.FungibleToken }}}

// FreshmintClaimSale provides functionality to operate a claim-style sale of NFTs.
//
// In a claim sale, users can claim NFTs from a collection
// for a fee. All NFTs in a sale are sold for the same price.
//
// Unlike in the NFTStorefront contract, a user cannot purchase a specific NFT by ID.
// On each claim, the user receives the next available NFT in the collection.
// 
pub contract FreshmintClaimSale {

    pub event Claimed(nftType: Type, nftID: UInt64)

    pub let SaleCollectionStoragePath: StoragePath
    pub let SaleCollectionPublicPath: PublicPath

    pub resource interface SaleCollectionPublic {
        pub fun getIDs(): [String]
        pub fun borrowSale(id: String): &Sale
    }

    // A SaleCollection is a container that holds one or
    // more Sale resources.
    //
    // The sale creator does not need to use a sale collection,
    // but it is useful when running multiple claims from different collections
    // in the same account.
    //
    pub resource SaleCollection: SaleCollectionPublic {

        access(self) let sales: @{String: Sale}

        init () {
            self.sales <- {}
        }

        destroy() {
            destroy self.sales
        }

        pub fun insert(_ sale: @Sale) {
            let oldSale <- self.sales[sale.id] <- sale
            destroy oldSale
        }

        pub fun remove(saleID: String): @Sale {
            let sale <- self.sales.remove(key: saleID) ?? panic("sale does not exist")
            return <- sale
        }

        pub fun getIDs(): [String] {
            return self.sales.keys
        }
        
        pub fun borrowSale(id: String): &Sale {
            return (&self.sales[id] as &Sale?)!
        }
    }

    // SalePublic is the public-facing capability for a sale.
    //
    // Users can use this interface to read the details of a sale
    // and claim an NFT.
    //
    pub resource interface SalePublic {

        pub let id: String
        pub let price: UFix64
        pub let size: Int
        pub fun supply(): Int
        pub fun isActive(): Bool

        pub fun claim(payment: @FungibleToken.Vault, address: Address)

        pub fun borrowCollection(): &{NonFungibleToken.CollectionPublic, MetadataViews.ResolverCollection}
    }

    // A Sale is a resource that lists NFTs that can be claimed
    // for a fee.
    //
    // A sale can optionally include an allowlist used to gate claiming.
    //
    pub resource Sale: SalePublic {
    
        pub let id: String
        pub let nftType: Type
        pub let price: UFix64
        pub let size: Int

        // A capability to the underlying base NFT collection
        // that will store the claimable NFTs.
        //
        access(self) let collection: Capability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic, MetadataViews.ResolverCollection}>
        
        // When moving a claimed NFT in an account,
        // the sale will deposit the NFT into 
        // the NonFungibleToken.CollectionPublic linked at this public path.
        //
        pub let receiverPath: PublicPath

        // A capability to the receiver that will receive
        // payments from this sale.
        //
        access(self) let paymentReceiver: Capability<&{FungibleToken.Receiver}>

        // An optional allowlist used to gate access to this sale.
        //
        access(self) let allowlist: Capability<&Allowlist>?

        init(
            id: String,
            nftType: Type,
            collection: Capability<&AnyResource{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic, MetadataViews.ResolverCollection}>,
            receiverPath: PublicPath,
            paymentReceiver: Capability<&{FungibleToken.Receiver}>,
            paymentPrice: UFix64,
            allowlist: Capability<&Allowlist>?
        ) {
            self.id = id
            self.nftType = nftType
            self.price = paymentPrice
            self.size = collection.borrow()!.getIDs().length

            self.collection = collection
            self.receiverPath = receiverPath
            self.paymentReceiver = paymentReceiver
            self.allowlist = allowlist

            if let allowlist = self.allowlist {
                allowlist.borrow() ?? panic("failed to borrow allowlist capability")
            }
        }

        pub fun supply(): Int {
            return self.collection.borrow()!.getIDs().length
        }

        pub fun isActive(): Bool {
            return self.supply() != 0
        }

        // If an allowlist is set,
        // check that the provided address can claim
        // and decrement their claim counter.
        access(self) fun checkAllowlist(address: Address) {
            if let allowlistCap = self.allowlist {

                let allowlist = allowlistCap.borrow() ?? panic("failed to borrow allowlist")

                if let claims = allowlist.getClaims(address: address) {
                    if claims == 0 {
                        panic("address has already consumed all claims")
                    }

                    allowlist.consumeClaim(address: address)
                } else {
                    panic("address is not in the allowlist")
                }
            }
        }

        // The claim function is called by a user to claim an NFT from 
        // this sale.
        //
        // The user will receive the next available NFT in the collection
        // if they pass a vault with the correct price and,
        // if an allowlist is set, their address exists in the allowlist.
        //
        // The NFT is transfered to the provided address at the storage
        // path defined in self.receiverPath.
        //
        pub fun claim(payment: @FungibleToken.Vault, address: Address) {
            pre {
                payment.balance == self.price: "payment vault does not contain requested price"
            }

            self.checkAllowlist(address: address)

            let collection = self.collection.borrow()!

            let ids = collection.getIDs()

            if ids.length == 0 {
                panic("Sale is sold out")
            }

            let paymentReceiver = self.paymentReceiver.borrow()!

            paymentReceiver.deposit(from: <- payment)

            // Remove the next NFT from the collection.
            let nextID = ids[0]
            let nft <- collection.withdraw(withdrawID: nextID)

            let nftReceiver = getAccount(address)
                .getCapability(self.receiverPath)
                .borrow<&{NonFungibleToken.CollectionPublic}>()!

            emit Claimed(nftType: self.nftType, nftID: nft.id)

            nftReceiver.deposit(token: <- nft)
        }

        // borrowCollection returns a public reference to the
        // underlying collection for this lockbox.
        //
        // Callers can use this to read information about NFTs in this lock box.
        //
        pub fun borrowCollection(): &AnyResource{NonFungibleToken.CollectionPublic, MetadataViews.ResolverCollection} {
            let collection = self.collection.borrow()!
            return collection as! &AnyResource{NonFungibleToken.CollectionPublic, MetadataViews.ResolverCollection}
        }
    }

    // An Allowlist holds a set of addresse that 
    // are pre-approved to claim NFTs from a sale.
    //
    // Each address can be approved for one or more claims.
    //
    // A single allowlist can be used by multiple sale instances.
    //
    pub resource Allowlist {

        // Approved addresses are stored in dictionary.
        //
        // The integer value is the number of NFTs an  
        // address is entitled to claim.
        //
        access(self) let claimsByAddress: {Address: UInt}

        init() {
            self.claimsByAddress = {}
        }

        // setClaims sets the number of claims that an address can make.
        //
        pub fun setClaims(address: Address, claims: UInt) {
            self.claimsByAddress[address] = claims
        }

        // getClaims returns the number of claims for an address
        // or nil if the address is not in the allowlist.
        //
        pub fun getClaims(address: Address): UInt? {
            return self.claimsByAddress[address]
        }

        // consumeClaim is called when a user exercises one of their claims.
        //
        // This function returns true if the address can claim an NFT.
        // It returns false is the address is not in the allowlist or has
        // excercised all of its claims.
        //
        // Each call to consumeClaim decrements the address's claim
        // count by one.
        //
        pub fun consumeClaim(address: Address) {
            if let claims = self.claimsByAddress[address] {
                if claims != 0 {
                    self.claimsByAddress[address] = claims - 1
                }
            }
        }
    }

    // makeAllowlistName is a utility function that constructs
    // an allowlist name with a common prefix.
    //
    pub fun makeAllowlistName(name: String): String {
        return "Allowlist_".concat(name)
    }

    pub fun createEmptySaleCollection(): @SaleCollection {
        return <- create SaleCollection()
    }

    pub fun createSale(
        id: String,
        nftType: Type,
        collection: Capability<&AnyResource{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic, MetadataViews.ResolverCollection}>,
        receiverPath: PublicPath,
        paymentReceiver: Capability<&{FungibleToken.Receiver}>,
        paymentPrice: UFix64,
        allowlist: Capability<&Allowlist>?
    ): @Sale {
        return <- create Sale(
            id: id,
            nftType: nftType,
            collection: collection,
            receiverPath: receiverPath,
            paymentReceiver: paymentReceiver,
            paymentPrice: paymentPrice,
            allowlist: allowlist
        )
    }

    pub fun createAllowlist(): @Allowlist {
        return <- create Allowlist()
    }

    init() {
        self.SaleCollectionStoragePath = /storage/FreshmintClaimSaleCollection
        self.SaleCollectionPublicPath = /public/FreshmintClaimSaleCollection
    }
}
