import NonFungibleToken from {{{ imports.NonFungibleToken }}}
import MetadataViews from {{{ imports.MetadataViews }}}
import FungibleToken from {{{ imports.FungibleToken }}}
import FreshmintMetadataViews from {{{ imports.FreshmintMetadataViews }}}

pub contract {{ contractName }}: NonFungibleToken {

    pub let version: String

    pub event ContractInitialized()
    pub event Withdraw(id: UInt64, from: Address?)
    pub event Deposit(id: UInt64, to: Address?)
    pub event Minted(id: UInt64, editionID: UInt64, hash: [UInt8])
    pub event Revealed(id: UInt64, serialNumber: UInt64, salt: [UInt8])
    pub event Burned(id: UInt64)
    pub event EditionCreated(id: UInt64, limit: UInt64?)
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
        pub let metadata: {String: AnyStruct}

        init(
            id: UInt64,
            limit: UInt64?,
            metadata: {String: AnyStruct}
        ) {
            self.id = id
            self.limit = limit
            self.metadata = metadata

            self.size = 0
            self.burned = 0

            self.isClosed = false
        }

        {{#each fields}}
        pub fun {{ this.name }}(): {{ this.asCadenceTypeString }} {
            return self.metadata["{{ this.name}}"]! as! {{ this.asCadenceTypeString }}
        }

        {{/each}}
        /// Increment the size of this edition.
        ///
        access(contract) fun incrementSize() {
            self.size = self.size + (1 as UInt64)
        }

        /// Increment the burn count for this edition.
        ///
        access(contract) fun incrementBurned() {
            self.burned = self.burned + (1 as UInt64)
        }

        /// Close this edition and prevent further minting.
        ///
        /// Note: an edition is automatically closed when 
        /// it reaches its size limit, if defined.
        ///
        access(contract) fun close() {
            self.isClosed = true
        }
    }

    access(self) let editions: {UInt64: Edition}

    pub fun getEdition(id: UInt64): Edition? {
        return {{ contractName }}.editions[id]
    }

    /// This dictionary indexes editions by their mint ID.
    ///
    /// It is populated at mint time and used to prevent duplicate mints.
    /// The mint ID can be any unique string value,
    /// for example the hash of the edition metadata.
    ///
    access(self) let editionsByMintID: {String: UInt64}

    pub fun getEditionByMintID(mintID: String): UInt64? {
        return {{ contractName }}.editionsByMintID[mintID]
    }

    /// RevealedSerialNumber contains the revealed serial number for a single NFT.
    ///
    /// This data is published when an NFT's serial number is revealed.
    /// It contains both the serial number and the salt that was used
    /// to generate the mint hash. These values can be used to verify
    /// that the serial number did not change after mint.
    ///
    pub struct RevealedSerialNumber {
    
        pub let serialNumber: UInt64

        /// The salt that is published when this serial number is revealed.
        ///
        /// The salt is a byte array that is prepended to the 
        /// encoded serial number before generating the hash.
        ///
        pub let salt: [UInt8]

        init(
            serialNumber: UInt64,
            salt: [UInt8],
        ) {
            self.serialNumber = serialNumber
            self.salt = salt
        }

        /// Encode this serial number object as a byte array.
        ///
        /// This can be used to hash the edition membership and verify its integrity.
        ///
        pub fun encode(): [UInt8] {
            return self.salt
                .concat(self.serialNumber.toBigEndianBytes())
        }

        pub fun hash(): [UInt8] {
            return HashAlgorithm.SHA3_256.hash(self.encode())
        }
    }

    access(self) let serialNumbers: {UInt64: RevealedSerialNumber}

    pub fun getSerialNumber(nftID: UInt64): RevealedSerialNumber? {
        return {{ contractName }}.serialNumbers[nftID]
    }

    /// This dictionary stores all NFT IDs minted by this contract,
    /// indexed by their serial number hash.
    ///
    /// It is populated at mint time and later used to validate
    /// serial number hashes at reveal time.
    ///
    /// This dictionary is indexed by hash rather than by ID so that
    /// the contract (and client software) can prevent duplicate mints.
    ///
    access(contract) let nftsByHash: {String: UInt64}

    pub fun getNFTIDByHash(hash: String): UInt64? {
        return {{ contractName }}.nftsByHash[hash]
    }

    pub resource NFT: NonFungibleToken.INFT, MetadataViews.Resolver {

        pub let id: UInt64

        /// The ID of the edition this NFT belongs to.
        ///
        pub let editionID: UInt64

        /// A hash of the NFT's serial number combined
        /// with a secret salt value.
        ///
        /// The hash can later be used to verify
        /// the revealed serial number.
        ///
        pub let hash: [UInt8]

        init(editionID: UInt64, hash: [UInt8]) {
            self.id = self.uuid
            self.editionID = editionID
            self.hash = hash
        }

        /// Return the edition that this NFT belongs to.
        ///
        pub fun getEdition(): Edition {
            return {{ contractName }}.getEdition(id: self.editionID)!
        }

        /// Return true if the NFT metadata is revealed, false otherwise.
        ///
        pub fun isRevealed(): Bool {
            return {{ contractName }}.serialNumbers.containsKey(self.id)
        }

        /// Return this NFT's serial number.
        ///
        /// This function returns nil if the serial number is not yet revealed.
        ///
        pub fun getSerialNumber(): UInt64 {
            if let revealedSerialNumber = {{ contractName }}.serialNumbers[self.id] {
                return revealedSerialNumber.serialNumber
            }

            panic("the serial number for this NFT is not yet revealed")
        }

        pub fun getViews(): [Type] {
            let views = [
                {{#each views}}
                {{{ this.cadenceTypeString }}}{{#unless @last }},{{/unless}}
                {{/each}}
            ]

            if self.getSerialNumber() != nil {
                views.append(Type<MetadataViews.Edition>())
                views.append(Type<MetadataViews.Serial>())
            } else {
                views.append(Type<FreshmintMetadataViews.BlindNFT>())
            }

            return views
        }

        pub fun resolveView(_ view: Type): AnyStruct? {
            let edition = self.getEdition()
            
            switch view {
                {{#each views}}
                {{> viewCase view=this }}
                {{/each}}
            }

            if self.isRevealed() {
                switch view {
                    case Type<MetadataViews.Edition>():
                        return self.resolveEditionView()
                    case Type<MetadataViews.Serial>():
                        return self.resolveSerialView()
                }
            } else {
                switch view {
                    case Type<FreshmintMetadataViews.BlindNFT>():
                        return FreshmintMetadataViews.BlindNFT(hash: self.hash)
                }
            }

            return nil
        }

        {{#each views}}
        {{#if this.cadenceResolverFunction }}
        {{> (lookup . "id") view=this metadataInstance="self.getEdition()" contractName=../contractName }}
        
        {{/if}}
        {{/each}}
        pub fun resolveEditionView(): MetadataViews.Edition {
            let serialNumber = self.getSerialNumber()
            let edition = self.getEdition()

            return MetadataViews.Edition(
                name: "Edition",
                number: serialNumber,
                max: edition.size
            )
        }

        pub fun resolveSerialView(): MetadataViews.Serial {
            let serialNumber = self.getSerialNumber()

            return MetadataViews.Serial(serialNumber)
        }

        destroy() {
            {{ contractName }}.totalSupply = {{ contractName }}.totalSupply - (1 as UInt64)

            // Update the burn count for the NFT's edition
            let edition = self.getEdition()

            edition.incrementBurned()

            {{ contractName }}.editions[edition.id] = edition

            emit Burned(id: self.id)
        }
    }

    {{> collection contractName=contractName }}

    /// The administrator resource used to create editions,
    /// mint and reveal NFTs.
    ///
    pub resource Admin {

        /// Create a new NFT edition.
        ///
        /// This function does not mint any NFTs. It only creates the
        /// edition data that will later be associated with minted NFTs.
        ///
        pub fun createEdition(
            mintID: String,
            limit: UInt64?,
            metadata: {String: AnyStruct}
        ): UInt64 {

            // Prevent multiple editions from being minted with the same mint ID
            assert(
                {{ contractName }}.editionsByMintID[mintID] == nil,
                message: "an edition has already been created with mintID=".concat(mintID)
            )

            let edition = Edition(
                id: {{ contractName }}.totalEditions,
                limit: limit,
                metadata: metadata
            )

            // Save the edition
            {{ contractName }}.editions[edition.id] = edition

            // Update the mint ID index
            {{ contractName }}.editionsByMintID[mintID] = edition.id

            emit EditionCreated(id: edition.id, limit: edition.limit)

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

            // Prevent the edition from being closed more than once
            assert(edition.isClosed == false, message: "edition is already closed")

            edition.close()

            // Save the updated edition
            {{ contractName }}.editions[editionID] = edition

            emit EditionClosed(id: edition.id, size: edition.size)
        }

        /// Mint a new NFT.
        ///
        /// To mint a blind edition NFT, specify its edition hash
        /// that can later be used to verify the revealed NFT's 
        /// edition ID and serial number.
        ///
        pub fun mintNFT(editionID: UInt64, hash: [UInt8]): @{{ contractName }}.NFT {
            let edition = {{ contractName }}.editions[editionID]
                ?? panic("edition does not exist")

            // Do not mint into a closed edition
            assert(edition.isClosed == false, message: "edition is closed for minting")

            let hexHash = String.encodeHex(hash)

            // Prevent multiple NFTs from being minted with the same serial number hash
            assert(
                {{ contractName }}.nftsByHash[hexHash] == nil,
                message: "an NFT has already been minted with hash=".concat(hexHash)
            )

            // Increase the edition size by one
            edition.incrementSize()

            let nft <- create {{ contractName }}.NFT(editionID: editionID, hash: hash)

            emit Minted(id: nft.id, editionID: editionID, hash: hash)

            // Close the edition if it reaches its size limit
            if let limit = edition.limit {
                if edition.size == limit {
                    edition.close()

                    emit EditionClosed(id: edition.id, size: edition.size)
                }
            }

            // Save the updated edition
            {{ contractName }}.editions[editionID] = edition

            // Save the metadata hash so that it can later be validated on reveal
            {{ contractName }}.nftsByHash[hexHash] = nft.id

            {{ contractName }}.totalSupply = {{ contractName }}.totalSupply + (1 as UInt64)

            return <- nft
        }

        /// Reveal a minted NFT.
        ///
        /// To reveal an NFT, publish its edition ID, serial number
        /// and unique salt value.
        ///
        pub fun revealNFT(id: UInt64, serialNumber: UInt64, salt: [UInt8]) {
            pre {
                {{ contractName }}.serialNumbers[id] == nil : "NFT serial number has already been revealed"
            }

            let revealedSerialNumber = RevealedSerialNumber(
                serialNumber: serialNumber,
                salt: salt,
            )

            // An NFT cannot be revealed unless the provided serial number and salt
            // match the hash that was specified at mint time.

            let hash = String.encodeHex(revealedSerialNumber.hash())

            if let mintedID = {{ contractName }}.getNFTIDByHash(hash: hash) {
                assert(
                    id == mintedID,
                    message: "the provided serial number hash matches NFT with ID="
                        .concat(mintedID.toString())
                        .concat(", but expected ID=")
                        .concat(id.toString())
                )
            } else {
                panic("the provided serial number hash does not match any minted NFTs")
            }

            {{ contractName }}.serialNumbers[id] = revealedSerialNumber

            emit Revealed(
                id: id,
                serialNumber: serialNumber,
                salt: salt
            )
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
        self.editionsByMintID = {}
        self.serialNumbers = {}
        self.nftsByHash = {}
        
        self.initAdmin(admin: {{#if saveAdminResourceToContractAccount }}self.account{{ else }}admin{{/if}})

        emit ContractInitialized()
    }
}
