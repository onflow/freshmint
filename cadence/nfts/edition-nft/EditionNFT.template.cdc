import NonFungibleToken from {{{ imports.NonFungibleToken }}}
import MetadataViews from {{{ imports.MetadataViews }}}
import FungibleToken from {{{ imports.FungibleToken }}}

pub contract {{ contractName }}: NonFungibleToken {

    pub let version: String

    pub event ContractInitialized()
    pub event Withdraw(id: UInt64, from: Address?)
    pub event Deposit(id: UInt64, to: Address?)
    pub event Minted(id: UInt64, editionID: UInt64, serialNumber: UInt64)
    pub event Burned(id: UInt64)
    pub event EditionCreated(edition: Edition)
    pub event EditionClosed(id: UInt64, size: UInt64)

    pub let CollectionStoragePath: StoragePath
    pub let CollectionPublicPath: PublicPath
    pub let CollectionPrivatePath: PrivatePath
    pub let AdminStoragePath: StoragePath

    /// The total number of {{ contractName }} NFTs that have been minted.
    ///
    pub var totalSupply: UInt64

    /// The total number of {{ contractName }} editions that have been created.
    ///
    pub var totalEditions: UInt64

    {{> royalties-field contractName=contractName }}

    {{> collection-metadata-field }}

    pub struct Metadata {
    
        {{#each fields}}
        pub let {{ this.name }}: {{ this.asCadenceTypeString }}
        {{/each}}

        init(
            {{#each fields}}
            {{ this.name }}: {{ this.asCadenceTypeString }},
            {{/each}}
        ) {
            {{#each fields}}
            self.{{ this.name }} = {{ this.name }}
            {{/each}}
        }
    }

    pub struct Edition {

        pub let id: UInt64

        /// The maximum number of NFTs that can be minted in this edition.
        ///
        /// If nil, the edition has no size limit.
        ///
        pub let limit: UInt64?

        /// The number of NFTs minted in this edition.
        ///
        /// This field is incremented each time a new NFT is minted.
        /// It cannot exceed the limit defined above.
        ///
        pub var size: UInt64

        /// The number of NFTs in this edition that have been burned.
        ///
        /// This field is incremented each time an NFT is burned.
        ///
        pub var burned: UInt64

        /// Return the total supply of NFTs in this edition.
        ///
        /// The supply is the number of NFTs minted minus the number burned.
        ///
        pub fun supply(): UInt64 {
            return self.size - self.burned
        }

        /// A flag indicating whether this edition is closed for minting.
        ///
        pub var isClosed: Bool

        /// The metadata for this edition.
        ///
        pub let metadata: Metadata

        init(
            id: UInt64,
            limit: UInt64?,
            metadata: Metadata
        ) {
            self.id = id
            self.limit = limit
            self.metadata = metadata

            self.size = 0
            self.burned = 0

            self.isClosed = false
        }

        /// Increment the size of this edition.
        ///
        access(contract) fun incrementSize() {
            post {
                self.isClosed == false : "edition is closed for minting"
            }

            self.size = self.size + (1 as UInt64)
        }

        /// Close this edition and prevent further minting.
        ///
        /// Note: an edition is automatically closed when 
        /// it reaches its size limit, if defined.
        ///
        access(contract) fun close() {
            pre {
                self.isClosed == false : "edition is already closed"
            }

            self.isClosed = true
        }
    }

    access(self) let editions: {UInt64: Edition}

    pub fun getEdition(id: UInt64): Edition? {
        return {{ contractName }}.editions[id]
    }

    pub resource NFT: NonFungibleToken.INFT, MetadataViews.Resolver {

        pub let id: UInt64

        pub let editionID: UInt64
        pub let serialNumber: UInt64

        init(
            editionID: UInt64,
            serialNumber: UInt64
        ) {
            self.id = self.uuid
            self.editionID = editionID
            self.serialNumber = serialNumber
        }

        /// Return the edition that this NFT belongs to.
        ///
        pub fun getEdition(): Edition {
            return {{ contractName }}.getEdition(id: self.editionID)!
        }

        pub fun getViews(): [Type] {
            return [   
                {{#each views}}
                {{{ this.cadenceTypeString }}},
                {{/each}}
                Type<MetadataViews.Edition>()
            ]
        }

        pub fun resolveView(_ view: Type): AnyStruct? {
            let edition = self.getEdition()

            switch view {
                {{#each views}}
                {{> viewCase view=this metadata="edition.metadata" }}
                {{/each}}
                case Type<MetadataViews.Edition>():
                    return self.resolveEditionView(edition)
            }

            return nil
        }

        {{#each views}}
        {{#if this.cadenceResolverFunction }}
        {{> (lookup . "id") view=this contractName=../contractName }}
        
        {{/if}}
        {{/each}}
        pub fun resolveEditionView(_ edition: Edition): MetadataViews.Edition {
            return MetadataViews.Edition(
                name: "Edition",
                number: self.serialNumber,
                max: edition.size
            )
        }

        destroy() {
            {{ contractName }}.totalSupply = {{ contractName }}.totalSupply - (1 as UInt64)

            emit Burned(id: self.id)
        }
    }

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

    /// The administrator resource used to mint and reveal NFTs.
    ///
    pub resource Admin {

        /// Create a new NFT edition.
        ///
        /// This function does not mint any NFTs. It only creates the
        /// edition data that will later be associated with minted NFTs.
        ///
        pub fun createEdition(
            limit: UInt64?,
            {{#each fields}}
            {{ this.name }}: {{ this.asCadenceTypeString }},
            {{/each}}
        ): UInt64 {
            let metadata = Metadata(
                {{#each fields}}
                {{ this.name }}: {{ this.name }},
                {{/each}}
            )

            let edition = Edition(
                id: {{ contractName }}.totalEditions,
                limit: limit,
                metadata: metadata
            )

            {{ contractName }}.editions[edition.id] = edition

            emit EditionCreated(edition: edition)

            {{ contractName }}.totalEditions = {{ contractName }}.totalEditions + (1 as UInt64)

            return edition.id
        }

        /// Close an existing edition.
        ///
        /// This prevents new NFTs from being minted into the edition.
        /// An edition cannot be reopened after it is closed.
        ///
        pub fun closeEdition(editionID: UInt64) {
            let edition = {{ contractName }}.editions[editionID]
                ?? panic("edition does not exist")

            edition.close()

            // Save the updated edition
            {{ contractName }}.editions[editionID] = edition

            emit EditionClosed(id: edition.id, size: edition.size)
        }

        /// Mint a new NFT.
        ///
        /// This function will mint the next NFT in this edition
        /// and automatically assign the serial number.
        ///
        /// This function will panic if the edition has already
        /// reached its maximum size.
        ///
        pub fun mintNFT(editionID: UInt64): @{{ contractName }}.NFT {
            let edition = {{ contractName }}.editions[editionID]
                ?? panic("edition does not exist")

            // Increase the edition size by one
            edition.incrementSize()

            // The NFT serial number is the new edition size
            let serialNumber = edition.size

            let nft <- create {{ contractName }}.NFT(
                editionID: editionID,
                serialNumber: serialNumber
            )

            emit Minted(id: nft.id, editionID: editionID, serialNumber: serialNumber)

            // Close the edition if it reaches its size limit
            if let limit = edition.limit {
                if edition.size == limit {
                    edition.close()

                    emit EditionClosed(id: edition.id, size: edition.size)
                }
            }

            // Save the updated edition
            {{ contractName }}.editions[editionID] = edition

            {{ contractName }}.totalSupply = {{ contractName }}.totalSupply + (1 as UInt64)

            return <- nft
        }
    }

    /// Return a public path that is scoped to this contract.
    ///
    pub fun getPublicPath(suffix: String): PublicPath {
        return PublicPath(identifier: "{{ contractName }}_".concat(suffix))!
    }

    /// Return a private path that is scoped to this contract.
    ///
    pub fun getPrivatePath(suffix: String): PrivatePath {
        return PrivatePath(identifier: "{{ contractName }}_".concat(suffix))!
    }

    /// Return a storage path that is scoped to this contract.
    ///
    pub fun getStoragePath(suffix: String): StoragePath {
        return StoragePath(identifier: "{{ contractName }}_".concat(suffix))!
    }

    /// Return a collection name with an optional bucket suffix.
    ///
    pub fun makeCollectionName(bucketName maybeBucketName: String?): String {
        if let bucketName = maybeBucketName {
            return "Collection_".concat(bucketName)
        }

        return "Collection"
    }

    /// Return a queue name with an optional bucket suffix.
    ///
    pub fun makeQueueName(bucketName maybeBucketName: String?): String {
        if let bucketName = maybeBucketName {
            return "Queue_".concat(bucketName)
        }

        return "Queue"
    }

    priv fun initAdmin(admin: AuthAccount) {
        // Create an empty collection and save it to storage
        let collection <- {{ contractName }}.createEmptyCollection()

        admin.save(<- collection, to: {{ contractName }}.CollectionStoragePath)

        admin.link<&{{ contractName }}.Collection>({{ contractName }}.CollectionPrivatePath, target: {{ contractName }}.CollectionStoragePath)

        admin.link<&{{ contractName }}.Collection{NonFungibleToken.CollectionPublic, {{ contractName }}.{{ contractName }}CollectionPublic, MetadataViews.ResolverCollection}>({{ contractName }}.CollectionPublicPath, target: {{ contractName }}.CollectionStoragePath)
        
        // Create an admin resource and save it to storage
        let adminResource <- create Admin()

        admin.save(<- adminResource, to: self.AdminStoragePath)
    }

    init(collectionMetadata: MetadataViews.NFTCollectionDisplay, royalties: [MetadataViews.Royalty]{{#unless saveAdminResourceToContractAccount }}, admin: AuthAccount{{/unless}}) {

        self.version = "{{ freshmintVersion }}"

        self.CollectionPublicPath = {{ contractName }}.getPublicPath(suffix: "Collection")
        self.CollectionStoragePath = {{ contractName }}.getStoragePath(suffix: "Collection")
        self.CollectionPrivatePath = {{ contractName }}.getPrivatePath(suffix: "Collection")

        self.AdminStoragePath = {{ contractName }}.getStoragePath(suffix: "Admin")

        self.royalties = royalties
        self.collectionMetadata = collectionMetadata

        self.totalSupply = 0
        self.totalEditions = 0

        self.editions = {}
        
        self.initAdmin(admin: {{#if saveAdminResourceToContractAccount }}self.account{{ else }}admin{{/if}})

        emit ContractInitialized()
    }
}
