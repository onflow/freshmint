import NonFungibleToken from {{{ imports.NonFungibleToken }}}
import FungibleToken from {{{ imports.FungibleToken }}}

pub contract NFTClaimSale {

    pub let version: String

    pub event Claimed(nftType: Type, nftID: UInt64)

    pub let SaleCollectionStoragePath: StoragePath
    pub let SaleCollectionPublicPath: PublicPath

    pub resource interface SaleCollectionPublic {
        pub fun getIDs(): [String]
        pub fun borrowSale(id: String): &Sale
    }

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
        access(self) let addresses: {Address: Int}

        init() {
            self.addresses = {}
        }

        // setClaims sets the number of claims that an address can make.
        //
        pub fun setClaims(address: Address, claims: Int) {
            self.addresses[address] = claims
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
        pub fun consumeClaim(address: Address): Bool {
            if let claims = self.addresses[address] {
                if claims == 0 {
                    return false
                }

                self.addresses[address] = claims - 1

                return true
            }

            return false
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
    }

    // A Sale
    pub resource Sale: SalePublic {
    
        pub let id: String
        pub let nftType: Type
        pub let price: UFix64
        pub let size: Int

        // A capability to the underlying base NFT collection
        // that will store the claimable NFTs.
        //
        access(self) let collection: Capability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>
        
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
            collection: Capability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>,
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
            if let allowlist = self.allowlist {
                let canClaim = allowlist.borrow()!.consumeClaim(address: address)
                if !canClaim {
                    panic("address is not on the allowlist")
                }
            }
        }

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
    }

    pub fun createEmptySaleCollection(): @SaleCollection {
        return <- create SaleCollection()
    }

    pub fun createAllowlist(): @Allowlist {
        return <- create Allowlist()
    }

    pub fun createSale(
        id: String,
        nftType: Type,
        collection: Capability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>, 
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

    init() {
        self.version = "{{ freshmintVersion }}"

        self.SaleCollectionStoragePath = /storage/NFTClaimSale
        self.SaleCollectionPublicPath = /public/NFTClaimSale
    }
}
