pub resource interface {{ contractName }}CollectionPublic {
    pub fun deposit(token: @NonFungibleToken.NFT)
    pub fun getIDs(): [UInt64]
    pub fun borrowNFT(id: UInt64): &NonFungibleToken.NFT
    pub fun borrow{{ contractName }}(id: UInt64): &{{ contractName }}.NFT? {
        post {
            (result == nil) || (result?.id == id):
                "Cannot borrow {{ contractName }} reference: The ID of the returned reference is incorrect"
        }
    }
}

/// Collection is a container for {{ contractName}} NFTs.
///
/// A {{ contractName}} collection preserves the insertion order of its contents.
///
pub resource Collection: {{ contractName }}CollectionPublic, NonFungibleToken.Provider, NonFungibleToken.Receiver, NonFungibleToken.CollectionPublic, MetadataViews.ResolverCollection {
    
    /// An array of all NFT IDs in this collection in insertion order.
    ///
    pub let ids: [UInt64]

    /// A dictionary of all NFTs in this collection indexed by ID.
    ///
    pub var ownedNFTs: @{UInt64: NonFungibleToken.NFT}

    init () {
        self.ids = []
        self.ownedNFTs <- {}
    }

    /// Remove an NFT from this collection and move it to the caller.
    ///
    pub fun withdraw(withdrawID: UInt64): @NonFungibleToken.NFT {
        let token <- self.ownedNFTs.remove(key: withdrawID) 
            ?? panic("Requested NFT to withdraw does not exist in this collection")

        // Remove the NFT ID from the IDs list
        let index = self.ids.firstIndex(of: token.id)!
        self.ids.remove(at: index)

        emit Withdraw(id: token.id, from: self.owner?.address)

        return <- token
    }

    /// Deposit an NFT into this collection.
    ///
    pub fun deposit(token: @NonFungibleToken.NFT) {
        let token <- token as! @{{ contractName }}.NFT

        let id: UInt64 = token.id

        // Add the new NFT to the dictionary.
        //
        // Because ownedNFTs is an array of resources,
        // it is technically possible for it to contain an existing resource
        // for any given key. Resources cannot be silenty overwritten
        // so we must explicity destory it.
        //
        // However, the existing token should always be nil.
        //
        let oldToken <- self.ownedNFTs[id] <- token
        if (oldToken != nil) {
            panic("Collection already contains an NFT with that ID")
        }

        destroy oldToken

        // Add the NFT ID to the end of the IDs list
        self.ids.append(id)

        emit Deposit(id: id, to: self.owner?.address)
    }

    /// Return an array of the NFT IDs in this collection.
    ///
    /// The array will be in insertion order.
    ///
    pub fun getIDs(): [UInt64] {
        return self.ids
    }

    /// Return a reference to an NFT in this collection.
    ///
    /// This function panics if the NFT does not exist in this collection.
    ///
    pub fun borrowNFT(id: UInt64): &NonFungibleToken.NFT {
        return (&self.ownedNFTs[id] as &NonFungibleToken.NFT?)!
    }

    /// Return a reference to an NFT in this collection
    /// typed as {{ contractName }}.NFT.
    ///
    /// This function returns nil if the NFT does not exist in this collection.
    ///
    pub fun borrow{{ contractName }}(id: UInt64): &{{ contractName }}.NFT? {
        if self.ownedNFTs[id] != nil {
            let ref = (&self.ownedNFTs[id] as auth &NonFungibleToken.NFT?)!
            return ref as! &{{ contractName }}.NFT
        }

        return nil
    }

    /// Return a reference to an NFT in this collection
    /// typed as MetadataViews.Resolver.
    ///
    /// This function panics if the NFT does not exist in this collection.
    ///
    pub fun borrowViewResolver(id: UInt64): &AnyResource{MetadataViews.Resolver} {
        let nft = (&self.ownedNFTs[id] as auth &NonFungibleToken.NFT?)!
        let nftRef = nft as! &{{ contractName }}.NFT
        return nftRef as &AnyResource{MetadataViews.Resolver}
    }

    destroy() {
        destroy self.ownedNFTs
    }
}

/// Return a new empty collection.
///
pub fun createEmptyCollection(): @NonFungibleToken.Collection {
    return <- create Collection()
}
