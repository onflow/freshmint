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

pub resource Collection: {{ contractName }}CollectionPublic, NonFungibleToken.Provider, NonFungibleToken.Receiver, NonFungibleToken.CollectionPublic, MetadataViews.ResolverCollection {
    
    /// A dictionary of all NFTs in this collection indexed by ID.
    ///
    pub var ownedNFTs: @{UInt64: NonFungibleToken.NFT}

    init () {
        self.ownedNFTs <- {}
    }

    /// Remove an NFT from the collection and move it to the caller.
    ///
    pub fun withdraw(withdrawID: UInt64): @NonFungibleToken.NFT {
        let token <- self.ownedNFTs.remove(key: withdrawID) 
            ?? panic("Requested NFT to withdraw does not exist in this collection")

        emit Withdraw(id: token.id, from: self.owner?.address)

        return <- token
    }

    /// Deposit an NFT into this collection.
    ///
    pub fun deposit(token: @NonFungibleToken.NFT) {
        let token <- token as! @{{ contractName }}.NFT

        let id: UInt64 = token.id

        // add the new token to the dictionary which removes the old one
        let oldToken <- self.ownedNFTs[id] <- token

        emit Deposit(id: id, to: self.owner?.address)

        destroy oldToken
    }

    /// Return an array of the NFT IDs in this collection.
    ///
    pub fun getIDs(): [UInt64] {
        return self.ownedNFTs.keys
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
