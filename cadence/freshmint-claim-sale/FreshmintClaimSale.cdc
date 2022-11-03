import NonFungibleToken from {{{ imports.NonFungibleToken }}}
import MetadataViews from {{{ imports.MetadataViews }}}
import FungibleToken from {{{ imports.FungibleToken }}}
import FreshmintQueue from {{{ imports.FreshmintQueue }}}

/// FreshmintClaimSale provides functionality to operate a claim-style sale of NFTs.
///
/// In a claim sale, users can claim NFTs from a queue for a fee.
/// All NFTs in a sale are sold for the same price.
///
/// Unlike in the NFTStorefront contract, a user cannot purchase a specific NFT by ID.
/// On each claim, the user receives the next available NFT in the queue.
/// 
pub contract FreshmintClaimSale {

    /// The SaleCreated event is emitted when a new sale is created.
    ///
    pub event SaleCreated(
        uuid: UInt64,
        id: String,
        price: UFix64,
        paymentVaultType: Type,
        size: Int?
    )

    /// The SaleInserted event is emitted when a sale is inserted into a sale collection.
    ///
    pub event SaleInserted(uuid: UInt64, id: String, address: Address?)

    /// The SaleRemoved event is emitted when a sale is removed from a sale collection.
    ///
    pub event SaleRemoved(uuid: UInt64, id: String, address: Address?)

    /// The NFTClaimed event is emitted when an NFT is claimed from a sale.
    ///
    pub event NFTClaimed(
        saleUUID: UInt64,
        saleID: String,
        saleAddress: Address?,
        remainingSupply: Int?,
        nftType: Type,
        nftID: UInt64
    )

    /// SaleCollectionStoragePath is the default storage path for a SaleCollection instance.
    ///
    pub let SaleCollectionStoragePath: StoragePath

    /// SaleCollectionPublicPath is the default public path for a SaleCollectionPublic capability.
    ///
    pub let SaleCollectionPublicPath: PublicPath

    /// SaleCollectionPublic is the public-facing capability for a sale collection.
    ///
    /// Callers can use this interface to view and borrow sales in a collection.
    ///
    pub resource interface SaleCollectionPublic {
        pub fun getIDs(): [String]
        pub fun borrowSale(id: String): &{SalePublic}?
    }

    /// A SaleCollection is a container that holds one or
    /// more Sale resources.
    ///
    /// The sale creator does not need to use a sale collection,
    /// but it is useful when running multiple sales from different collections
    /// in the same account.
    ///
    pub resource SaleCollection: SaleCollectionPublic {

        access(self) let sales: @{String: Sale}

        init () {
            self.sales <- {}
        }

        destroy() {
            destroy self.sales
        }

        pub fun insert(_ sale: @Sale) {

            emit SaleInserted(
                uuid: sale.uuid,
                id: sale.id,
                address: self.owner?.address
            )

            let oldSale <- self.sales[sale.id] <- sale

            destroy oldSale
        }

        pub fun remove(id: String): @Sale {
            let sale <- self.sales.remove(key: id) ?? panic("sale does not exist")

            emit SaleRemoved(
                uuid: sale.uuid,
                id: sale.id,
                address: self.owner?.address
            )

            return <- sale
        }

        pub fun getIDs(): [String] {
            return self.sales.keys
        }
        
        pub fun borrowSale(id: String): &{SalePublic}? {
            return &self.sales[id] as &{SalePublic}?
        }

        /// Borrow a full reference to a sale.
        ///
        /// Use this function to modify properties of the sale
        /// (e.g. to set an allowlist or claim limit).
        ///
        pub fun borrowSaleAuth(id: String): &Sale? {
            return &self.sales[id] as &Sale?
        }
    }

    /// SaleInfo is a struct containing the information
    /// about a sale including its price, payment type, size and supply.
    ///
    pub struct SaleInfo {

        pub let id: String
        pub let price: UFix64
        pub let paymentVaultType: Type
        pub let size: Int?
        pub let supply: Int?

        init(
            id: String,
            price: UFix64,
            paymentVaultType: Type,
            size: Int?,
            supply: Int?
        ) {
            self.id = id
            self.price = price
            self.paymentVaultType = paymentVaultType
            self.size = size
            self.supply = supply
        }
    }

    /// SalePublic is the public-facing capability for a sale.
    ///
    /// Callers can use this interface to read the details of a sale
    /// and claim an NFT.
    ///
    pub resource interface SalePublic {

        pub let id: String
        pub let price: UFix64
        pub let size: Int?
        pub let receiverPath: PublicPath

        pub fun getPaymentVaultType(): Type
        pub fun getSupply(): Int?
        pub fun getInfo(): SaleInfo
        pub fun getRemainingClaims(address: Address): UInt?

        pub fun claim(payment: @FungibleToken.Vault, address: Address)

        pub fun borrowPaymentReceiver(): &{FungibleToken.Receiver}
    }

    /// A Sale is a resource that lists NFTs that can be claimed for a fee.
    ///
    /// A sale can optionally include an allowlist used to gate claiming.
    ///
    pub resource Sale: SalePublic {
    
        pub let id: String
        pub let price: UFix64
        pub let size: Int?

        /// A capability to the queue that returns the NFTs to be sold in this sale.
        ///
        access(self) let queue: Capability<&{FreshmintQueue.Queue}>
        
        /// When moving a claimed NFT into an account, 
        /// the sale will deposit the NFT into the NonFungibleToken.CollectionPublic 
        /// linked at this public path.
        ///
        pub let receiverPath: PublicPath

        /// A capability to the receiver that will receive payments from this sale.
        ///
        pub let paymentReceiver: Capability<&{FungibleToken.Receiver}>

        /// A dictionary that tracks the number of NFTs claimed per address.
        ///
        access(self) let claims: {Address: UInt}

        /// An optional limit on the number of NFTs that can be claimed per address.
        ///
        pub var claimLimit: UInt?

        /// An optional allowlist used to gate access to this sale.
        ///
        access(self) var allowlist: Capability<&Allowlist>?

        init(
            id: String,
            queue: Capability<&{FreshmintQueue.Queue}>,
            receiverPath: PublicPath,
            paymentReceiver: Capability<&{FungibleToken.Receiver}>,
            price: UFix64,
            claimLimit: UInt?,
            allowlist: Capability<&Allowlist>?
        ) {
            self.id = id
            self.price = price
            self.queue = queue
            self.receiverPath = receiverPath
            self.paymentReceiver = paymentReceiver

            // Check that payment receiver capability is linked
            self.paymentReceiver.borrow() 
                ?? panic("failed to borrow payment receiver capability")

            // Check that queue capability is linked
            let queueRef = self.queue.borrow() 
                ?? panic("failed to borrow queue capability")

            // The size of the sale is the initial size of the queue
            self.size = queueRef.remaining()

            self.claims = {}

            self.claimLimit = claimLimit

            self.allowlist = allowlist
        }

        /// setClaimLimit sets the claim limit for this sale.
        ///
        /// Pass nil to remove the claim limit from this sale.
        ///
        pub fun setClaimLimit(limit: UInt?) {
            self.claimLimit = limit
        }

        /// setAllowlist sets the allowlist for this sale.
        ///
        /// Pass nil to remove the allowlist from this sale.
        ///
        pub fun setAllowlist(allowlist: Capability<&Allowlist>?) {
            self.allowlist = allowlist
        }

        /// getInfo returns a read-only summary of this sale.
        ///
        pub fun getInfo(): SaleInfo {
            return SaleInfo(
                id: self.id,
                price: self.price,
                paymentVaultType: self.getPaymentVaultType(),
                size: self.size,
                supply: self.getSupply()
            )
        }

        /// getPaymentVaultType returns the underlying type of the payment receiver.
        ///
        pub fun getPaymentVaultType(): Type {
            return self.borrowPaymentReceiver().getType()
        }

        /// getRemainingClaims returns the number of claims remaining for a given address.
        ///
        /// This function returns nil if there is no claim limit.
        ///
        pub fun getRemainingClaims(address: Address): UInt? {
            if let claimLimit = self.claimLimit {
                let claims = self.claims[address] ?? 0
                return claimLimit - claims
            }

            // Return nil if there is no claim limit to indicate that 
            // this address has unlimited remaining claims.
            return nil
        }

        /// getSupply returns the number of NFTs remaining in this sale.
        ///
        pub fun getSupply(): Int? {
            let queueRef = self.queue.borrow() 
                ?? panic("failed to borrow queue capability")

            return queueRef.remaining()
        }

        /// borrowPaymentReceiver returns a reference to the
        /// payment receiver for this sale.
        ///
        pub fun borrowPaymentReceiver(): &{FungibleToken.Receiver} {
            return self.paymentReceiver.borrow() 
                ?? panic("failed to borrow payment receiver capability")
        }

        /// If an allowlist is set, check that the provided address can claim
        /// and decrement their claim counter.
        ///
        access(self) fun checkAllowlist(address: Address) {
            if let allowlistCap = self.allowlist {

                let allowlist = allowlistCap.borrow() 
                    ?? panic("failed to borrow allowlist")

                if let claims = allowlist.getClaims(address: address) {
                    if claims == 0 {
                        panic("address has already consumed all claims")
                    }

                    // Reduce the claim count by one
                    allowlist.setClaims(address: address, claims: claims - 1)
                } else {
                    panic("address is not in the allowlist")
                }
            }
        }

        /// The claim function is called by a user to claim an NFT from this sale.
        ///
        /// The user will receive the next available NFT in the queue
        /// if they pass a vault with the correct price and,
        /// if an allowlist is set, their address exists in the allowlist.
        ///
        /// The NFT is transfered to the provided address at the storage
        /// path defined in self.receiverPath.
        ///
        pub fun claim(payment: @FungibleToken.Vault, address: Address) {
            pre {
                payment.balance == self.price: "payment vault does not contain requested price"
            }

            self.checkAllowlist(address: address)

            let claims = self.claims[address] ?? 0

            // Enforce the claim limit if it is set
            if let claimLimit = self.claimLimit {
                assert(claims < claimLimit, message: "reached claim limit")
            }

            self.claims[address] = claims + 1

            let queue = self.queue.borrow() ?? panic("failed to borrow NFT queue")

            let paymentReceiver = self.borrowPaymentReceiver()

            paymentReceiver.deposit(from: <- payment)

            // Get the next NFT from the queue
            let nft <- queue.getNextNFT() ?? panic("sale is sold out")

            let nftReceiver = getAccount(address)
                .getCapability(self.receiverPath)
                .borrow<&{NonFungibleToken.CollectionPublic}>()!

            emit NFTClaimed(
                saleUUID: self.uuid,
                saleID: self.id,
                saleAddress: self.owner?.address,
                remainingSupply: queue.remaining(),
                nftType: nft.getType(),
                nftID: nft.id
            )

            nftReceiver.deposit(token: <- nft)
        }
    }

    /// An Allowlist holds a set of addresses that 
    /// are pre-approved to claim NFTs from a sale.
    ///
    /// Each address can be approved for one or more claims.
    ///
    /// A single allowlist can be used by multiple sale instances.
    ///
    pub resource Allowlist {

        /// Approved addresses are stored in dictionary.
        ///
        /// The integer value is the number of NFTs an  
        /// address is entitled to claim.
        ///
        pub let claimsByAddress: {Address: UInt}

        init() {
            self.claimsByAddress = {}
        }

        /// setClaims sets the number of claims that an address can make.
        ///
        pub fun setClaims(address: Address, claims: UInt) {
            self.claimsByAddress[address] = claims
        }

        /// getClaims returns the number of claims for an address
        /// or nil if the address is not in the allowlist.
        ///
        pub fun getClaims(address: Address): UInt? {
            return self.claimsByAddress[address]
        }
    }

    /// makeAllowlistName is a utility function that constructs
    /// an allowlist name with a common prefix.
    ///
    pub fun makeAllowlistName(name: String): String {
        return "Allowlist_".concat(name)
    }

    pub fun createEmptySaleCollection(): @SaleCollection {
        return <- create SaleCollection()
    }

    pub fun createSale(
        id: String,
        queue: Capability<&{FreshmintQueue.Queue}>,
        receiverPath: PublicPath,
        paymentReceiver: Capability<&{FungibleToken.Receiver}>,
        price: UFix64,
        claimLimit: UInt?,
        allowlist: Capability<&Allowlist>?
    ): @Sale {
        let sale <- create Sale(
            id: id,
            queue: queue,
            receiverPath: receiverPath,
            paymentReceiver: paymentReceiver,
            price: price,
            claimLimit: claimLimit,
            allowlist: allowlist
        )

        emit SaleCreated(
            uuid: sale.uuid,
            id: sale.id,
            price: sale.price,
            paymentVaultType: sale.getPaymentVaultType(),
            size: sale.size
        )

        return <- sale
    }

    pub fun createAllowlist(): @Allowlist {
        return <- create Allowlist()
    }

    init() {
        self.SaleCollectionStoragePath = /storage/FreshmintClaimSaleCollection
        self.SaleCollectionPublicPath = /public/FreshmintClaimSaleCollection
    }
}
