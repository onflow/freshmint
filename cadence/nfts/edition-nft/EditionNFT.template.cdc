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

        /// The maximum size of this edition.
        ///
        pub let size: UInt64

        /// The number of NFTs minted in this edition.
        ///
        /// The count cannot exceed the edition size.
        ///
        pub var count: UInt64

        /// The metadata for this edition.
        ///
        pub let metadata: Metadata

        init(
            id: UInt64,
            size: UInt64,
            metadata: Metadata
        ) {
            self.id = id
            self.size = size
            self.metadata = metadata

            // An edition starts with a count of zero
            self.count = 0
        }

        /// Increment the NFT count of this edition.
        ///
        /// The count cannot exceed the edition size.
        ///
        access(contract) fun incrementCount() {
            post {
                self.count <= self.size: "edition has already reached its maximum size"
            }

            self.count = self.count + (1 as UInt64)
        }
    }

    access(self) let editions: {UInt64: Edition}

    pub fun getEdition(id: UInt64): Edition? {
        return {{ contractName }}.editions[id]
    }

    /// This dictionary indexes editions by their primary key.
    ///
    /// It is populated at mint time and used to prevent duplicate mints.
    /// The primary key can be any unique string value,
    /// for example the hash of the edition metadata.
    ///
    access(self) let editionsByPrimaryKey: {String: UInt64}

    pub fun getEditionByPrimaryKey(primaryKey: String): UInt64? {
        return {{ contractName }}.editionsByPrimaryKey[primaryKey]
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

    {{> collection contractName=contractName }}

    /// The administrator resource used to mint and reveal NFTs.
    ///
    pub resource Admin {

        /// Create a new NFT edition.
        ///
        /// This function does not mint any NFTs. It only creates the
        /// edition data that will later be associated with minted NFTs.
        ///
        pub fun createEdition(
            primaryKey: String,
            size: UInt64,
            {{#each fields}}
            {{ this.name }}: {{ this.asCadenceTypeString }},
            {{/each}}
        ): UInt64 {
            let metadata = Metadata(
                {{#each fields}}
                {{ this.name }}: {{ this.name }},
                {{/each}}
            )

            // Prevent multiple editions from being minted with the same primary key
            assert(
                {{ contractName }}.editionsByPrimaryKey[primaryKey] == nil,
                message: "an edition has already been created with primaryKey=".concat(primaryKey)
            )

            let edition = Edition(
                id: {{ contractName }}.totalEditions,
                size: size,
                metadata: metadata
            )

            // Save the edition
            {{ contractName }}.editions[edition.id] = edition

            // Update the primary key index
            {{ contractName }}.editionsByPrimaryKey[primaryKey] = edition.id

            emit EditionCreated(edition: edition)

            {{ contractName }}.totalEditions = {{ contractName }}.totalEditions + (1 as UInt64)

            return edition.id
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

            // Increase the edition count by one
            edition.incrementCount()

            // The NFT serial number is the new edition count
            let serialNumber = edition.count

            let nft <- create {{ contractName }}.NFT(
                editionID: editionID,
                serialNumber: serialNumber
            )

            // Save the updated edition
            {{ contractName }}.editions[editionID] = edition

            emit Minted(id: nft.id, editionID: editionID, serialNumber: serialNumber)

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
        self.editionsByPrimaryKey = {}
        
        self.initAdmin(admin: {{#if saveAdminResourceToContractAccount }}self.account{{ else }}admin{{/if}})

        emit ContractInitialized()
    }
}
