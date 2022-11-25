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

        /// Return this NFT's serial number.
        ///
        /// This function returns nil if the serial number is not yet revealed.
        ///
        pub fun getSerialNumber(): UInt64? {
            if let revealedSerialNumber = {{ contractName }}.serialNumbers[self.id] {
                return revealedSerialNumber.serialNumber
            }

            return nil
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
                {{> viewCase view=this metadata="edition.metadata" }}
                {{/each}}
            }

            if let serialNumber = self.getSerialNumber() {
                switch view {
                    case Type<MetadataViews.Edition>():
                        return self.resolveEditionView(serialNumber: serialNumber, size: edition.size)
                    case Type<MetadataViews.Serial>():
                        return self.resolveSerialView(serialNumber: serialNumber)
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
        {{> (lookup . "id") view=this contractName=../contractName }}
        
        {{/if}}
        {{/each}}
        pub fun resolveEditionView(serialNumber: UInt64, size: UInt64): MetadataViews.Edition {
            return MetadataViews.Edition(
                name: "Edition",
                number: serialNumber,
                max: size
            )
        }

        pub fun resolveSerialView(serialNumber: UInt64): MetadataViews.Serial {
            return MetadataViews.Serial(serialNumber)
        }

        destroy() {
            {{ contractName }}.totalSupply = {{ contractName }}.totalSupply - (1 as UInt64)

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

            let edition = Edition(
                id: {{ contractName }}.totalEditions,
                size: size,
                metadata: metadata
            )

            {{ contractName }}.editions[edition.id] = edition

            emit EditionCreated(edition: edition)

            {{ contractName }}.totalEditions = {{ contractName }}.totalEditions + (1 as UInt64)

            return edition.id
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

            let hexHash = String.encodeHex(hash)

            // Prevent multiple NFTs from being minted with the same serial number hash
            assert(
                {{ contractName }}.nftsByHash[hexHash] == nil,
                message: "an NFT has already been minted with hash=".concat(hexHash)
            )

            // Increase the edition count by one
            edition.incrementCount()

            let nft <- create {{ contractName }}.NFT(editionID: editionID, hash: hash)

            // Save the updated edition
            {{ contractName }}.editions[editionID] = edition

            // Save the metadata hash so that it can later be validated on reveal
            {{ contractName }}.nftsByHash[hexHash] = nft.id

            emit Minted(id: nft.id, editionID: editionID, hash: hash)

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
        self.serialNumbers = {}
        self.nftsByHash = {}
        
        self.initAdmin(admin: {{#if saveAdminResourceToContractAccount }}self.account{{ else }}admin{{/if}})

        emit ContractInitialized()
    }
}
