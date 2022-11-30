import NonFungibleToken from {{{ imports.NonFungibleToken }}}
import MetadataViews from {{{ imports.MetadataViews }}}
import FungibleToken from {{{ imports.FungibleToken }}}
import FreshmintMetadataViews from {{{ imports.FreshmintMetadataViews }}}

pub contract {{ contractName }}: NonFungibleToken {

    pub let version: String

    pub event ContractInitialized()
    pub event Withdraw(id: UInt64, from: Address?)
    pub event Deposit(id: UInt64, to: Address?)
    pub event Minted(id: UInt64)
    pub event Burned(id: UInt64)

    pub let CollectionStoragePath: StoragePath
    pub let CollectionPublicPath: PublicPath
    pub let CollectionPrivatePath: PrivatePath
    pub let AdminStoragePath: StoragePath

    /// The total number of {{ contractName }} NFTs that have been minted.
    ///
    pub var totalSupply: UInt64

    {{> royalties-field contractName=contractName }}

    {{> collection-metadata-field }}

    pub resource NFT: NonFungibleToken.INFT, MetadataViews.Resolver {

        pub let id: UInt64
        pub let metadata: {String: AnyStruct}

        init(metadata: {String: AnyStruct}) {
            {{#each fields}}
            {{ ../contractName }}.checkMetadataField(metadata: metadata, name: "{{ this.name }}", expectedType: Type<{{ this.asCadenceTypeString }}>())
            {{/each}}

            self.id = self.uuid
            self.metadata = metadata
        }

        {{#each fields}}
        pub fun {{ this.name }}(): {{ this.asCadenceTypeString }} {
            return self.metadata["{{ this.name}}"]! as! {{ this.asCadenceTypeString }}
        }

        {{/each}}
        pub fun getViews(): [Type] {
            return [
                {{#each views}}
                {{{ this.cadenceTypeString }}}{{#unless @last }},{{/unless}}
                {{/each}}
            ]
        }

        pub fun resolveView(_ view: Type): AnyStruct? {
            switch view {
                {{#each views }}
                {{> viewCase view=this }}
                {{/each}}
            }

            return nil
        }

        {{#each views}}
        {{#if this.cadenceResolverFunction }}
        {{> (lookup . "id") view=this contractName=../contractName }}
        
        {{/if}}
        {{/each}}
        destroy() {
            {{ contractName }}.totalSupply = {{ contractName }}.totalSupply - (1 as UInt64)

            emit Burned(id: self.id)
        }
    }

    /// This dictionary indexes NFTs by their mint ID.
    ///
    /// It is populated at mint time and used to prevent duplicate mints.
    /// The mint ID can be any unique string value,
    /// for example the hash of the NFT metadata.
    ///
    access(contract) var nftsByMintID: {String: UInt64}

    pub fun getNFTByMintID(mintID: String): UInt64? {
        return {{ contractName }}.nftsByMintID[mintID]
    }

    {{> collection contractName=contractName }}

    /// The administrator resource used to mint and reveal NFTs.
    ///
    pub resource Admin {

        /// Mint a new NFT.
        ///
        /// To mint an NFT, specify a value for each of its metadata fields.
        ///
        pub fun mintNFT(
            mintID: String,
            metadata: {String: AnyStruct}
        ): @{{ contractName }}.NFT {

            // Prevent multiple NFTs from being minted with the same mint ID
            assert(
                {{ contractName }}.nftsByMintID[mintID] == nil,
                message: "an NFT has already been minted with mintID=".concat(mintID)
            )

            let nft <- create {{ contractName }}.NFT(metadata: metadata)
   
            // Update the mint ID index
            {{ contractName }}.nftsByMintID[mintID] = nft.id

            emit Minted(id: nft.id)

            {{ contractName }}.totalSupply = {{ contractName }}.totalSupply + (1 as UInt64)

            return <- nft
        }
    }

    /// Check that a provided metadata field exists and is the correct type.
    ///
    /// This function is used to validate inputs during minting.
    ///
    pub fun checkMetadataField(metadata: {String: AnyStruct}, name: String, expectedType: Type) {
        if let value = metadata[name] {
            assert(
                value.isInstance(expectedType),
                message: "\"".concat(name).concat("\" metadata field should be of type ").concat(expectedType.identifier)
            )
        } else {
            panic("\"".concat(name).concat("\" metadata field is required"))
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

        self.nftsByMintID = {}

        self.initAdmin(admin: {{#if saveAdminResourceToContractAccount }}self.account{{ else }}admin{{/if}})

        emit ContractInitialized()
    }
}
