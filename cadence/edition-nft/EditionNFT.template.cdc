import NonFungibleToken from {{{ imports.NonFungibleToken }}}
import MetadataViews from {{{ imports.MetadataViews }}}
import FungibleToken from {{{ imports.FungibleToken }}}

pub contract {{ contractName }}: NonFungibleToken {

    pub let version: String

    // Events
    //
    pub event ContractInitialized()
    pub event Withdraw(id: UInt64, from: Address?)
    pub event Deposit(id: UInt64, to: Address?)
    pub event Minted(id: UInt64, editionID: UInt64, editionSerial: UInt64)
    pub event Burned(id: UInt64)
    pub event EditionCreated(edition: Edition)

    // Named Paths
    //
    pub let CollectionStoragePath: StoragePath
    pub let CollectionPublicPath: PublicPath
    pub let CollectionPrivatePath: PrivatePath
    pub let AdminStoragePath: StoragePath

    // totalSupply
    // The total number of {{ contractName }} NFTs that have been minted.
    //
    pub var totalSupply: UInt64

    // totalEditions
    // The total number of {{ contractName }} editions that have been created.
    //
    pub var totalEditions: UInt64

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
        pub let size: UInt
        pub let metadata: Metadata

        init(
            id: UInt64,
            size: UInt,
            metadata: Metadata
        ) {
            self.id = id
            self.size = size
            self.metadata = metadata
        }

        pub fun resolveView(serial: UInt64): MetadataViews.Edition {
            return MetadataViews.Edition(
                name: "Edition",
                number: serial,
                max: (self.size as! UInt64)
            )
        }
    }

    access(self) let editions: {UInt64: Edition}

    pub fun getEdition(id: UInt64): Edition? {
        return {{ contractName }}.editions[id]
    }

    pub resource NFT: NonFungibleToken.INFT, MetadataViews.Resolver {

        pub let id: UInt64

        pub let editionID: UInt64
        pub let editionSerial: UInt64

        init(
            id: UInt64,
            editionID: UInt64,
            editionSerial: UInt64
        ) {
            self.id = id
            self.editionID = editionID
            self.editionSerial = editionSerial
        }

        // Return the edition that this NFT belongs to.
        //
        pub fun getEdition(): Edition {
            return {{ contractName }}.getEdition(id: self.editionID)!
        }

        pub fun getViews(): [Type] {
            return [   
                {{#each views}}
                {{{ this.cadenceTypeString }}},
                {{/each}}
                Type<MetadataViews.NFTCollectionData>(),
                Type<MetadataViews.Royalties>(),
                Type<MetadataViews.Edition>()
            ]
        }

        pub fun resolveView(_ view: Type): AnyStruct? {
            let edition = self.getEdition()

            switch view {
                {{#each views}}
                case {{{ this.cadenceTypeString }}}:
                    {{#with this}}
                    {{#if cadenceResolverFunction }}
                    {{#if requiresMetadata }}
                    return self.{{ cadenceResolverFunction }}(edition.metadata)
                    {{ else }}
                    return self.{{ cadenceResolverFunction }}()
                    {{/if}}
                    {{ else }}
                    {{> (lookup . "id") view=this metadata="edition.metadata" }}
                    {{/if}}
                    {{/with}}
                {{/each}}
                case Type<MetadataViews.Edition>():
                    return edition.resolveView(serial: self.editionSerial)
                case Type<MetadataViews.NFTCollectionData>():
                    return self.resolveNFTCollectionData()
                case Type<MetadataViews.Royalties>():
                    return self.resolveRoyalties()
            }

            return nil
        }

        {{#each views}}
        {{#if this.cadenceResolverFunction }}
        {{> (lookup . "id") view=this }}
        
        {{/if}}
        {{/each}}
        pub fun resolveNFTCollectionData(): MetadataViews.NFTCollectionData {
            return MetadataViews.NFTCollectionData(
                storagePath: {{ contractName }}.CollectionStoragePath,
                publicPath: {{ contractName }}.CollectionPublicPath,
                providerPath: {{ contractName }}.CollectionPrivatePath,
                publicCollection: Type<&{{ contractName }}.Collection{ {{~contractName~}}.{{ contractName }}CollectionPublic}>(),
                publicLinkedType: Type<&{{ contractName }}.Collection{ {{~contractName~}}.{{ contractName }}CollectionPublic, NonFungibleToken.CollectionPublic, NonFungibleToken.Receiver, MetadataViews.ResolverCollection}>(),
                providerLinkedType: Type<&{{ contractName }}.Collection{ {{~contractName~}}.{{ contractName }}CollectionPublic, NonFungibleToken.CollectionPublic, NonFungibleToken.Provider, MetadataViews.ResolverCollection}>(),
                createEmptyCollectionFunction: (fun (): @NonFungibleToken.Collection {
                    return <-{{ contractName }}.createEmptyCollection()
                })
            )
        }

        pub fun resolveRoyalties(): MetadataViews.Royalties {
            return MetadataViews.Royalties([])
        }

        destroy() {
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
        
        // dictionary of NFTs
        // NFT is a resource type with an `UInt64` ID field
        //
        pub var ownedNFTs: @{UInt64: NonFungibleToken.NFT}

        // withdraw
        // Removes an NFT from the collection and moves it to the caller
        //
        pub fun withdraw(withdrawID: UInt64): @NonFungibleToken.NFT {
            let token <- self.ownedNFTs.remove(key: withdrawID) ?? panic("missing NFT")

            emit Withdraw(id: token.id, from: self.owner?.address)

            return <- token
        }

        // deposit
        // Takes a NFT and adds it to the collections dictionary
        // and adds the ID to the id array
        //
        pub fun deposit(token: @NonFungibleToken.NFT) {
            let token <- token as! @{{ contractName }}.NFT

            let id: UInt64 = token.id

            // add the new token to the dictionary which removes the old one
            let oldToken <- self.ownedNFTs[id] <- token

            emit Deposit(id: id, to: self.owner?.address)

            destroy oldToken
        }

        // getIDs
        // Returns an array of the IDs that are in the collection
        //
        pub fun getIDs(): [UInt64] {
            return self.ownedNFTs.keys
        }

        // borrowNFT
        // Gets a reference to an NFT in the collection
        // so that the caller can read its metadata and call its methods
        //
        pub fun borrowNFT(id: UInt64): &NonFungibleToken.NFT {
            return (&self.ownedNFTs[id] as &NonFungibleToken.NFT?)!
        }

        // borrow{{ contractName }}
        // Gets a reference to an NFT in the collection as a {{ contractName }}.
        //
        pub fun borrow{{ contractName }}(id: UInt64): &{{ contractName }}.NFT? {
            if self.ownedNFTs[id] != nil {
                let ref = (&self.ownedNFTs[id] as auth &NonFungibleToken.NFT?)!
                return ref as! &{{ contractName }}.NFT
            }

            return nil
        }

        pub fun borrowViewResolver(id: UInt64): &AnyResource{MetadataViews.Resolver} {
            let nft = (&self.ownedNFTs[id] as auth &NonFungibleToken.NFT?)!
            let nftRef = nft as! &{{ contractName }}.NFT
            return nftRef as &AnyResource{MetadataViews.Resolver}
        }

        // destructor
        destroy() {
            destroy self.ownedNFTs
        }

        // initializer
        //
        init () {
            self.ownedNFTs <- {}
        }
    }

    // createEmptyCollection
    // public function that anyone can call to create a new empty collection
    //
    pub fun createEmptyCollection(): @NonFungibleToken.Collection {
        return <- create Collection()
    }

    // Admin
    // Resource that an admin can use to mint NFTs.
    //
    pub resource Admin {

        // createEdition
        //
        // Create a new NFT edition.
        //
        // This function does not mint any NFTs. It only creates the
        // edition data that will later be associated with minted NFTs.
        //
        pub fun createEdition(
            size: UInt,
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

        // mintNFT
        //
        // Mints a new NFT.
        //
        pub fun mintNFT(editionID: UInt64, editionSerial: UInt64): @{{ contractName }}.NFT {
            pre {
                {{ contractName }}.getEdition(id: editionID) != nil : "edition does not exist"
            }

            let nft <- create {{ contractName }}.NFT(
                id: {{ contractName }}.totalSupply,
                editionID: editionID,
                editionSerial: editionSerial
            )

            emit Minted(id: nft.id, editionID: editionID, editionSerial: editionSerial)

            {{ contractName }}.totalSupply = {{ contractName }}.totalSupply + (1 as UInt64)

            return <- nft
        }
    }

    // getPublicPath returns a public path that is scoped to this contract.
    //
    pub fun getPublicPath(suffix: String): PublicPath {
        return PublicPath(identifier: "{{ contractName }}_".concat(suffix))!
    }

    // getPrivatePath returns a private path that is scoped to this contract.
    //
    pub fun getPrivatePath(suffix: String): PrivatePath {
        return PrivatePath(identifier: "{{ contractName }}_".concat(suffix))!
    }

    // getStoragePath returns a storage path that is scoped to this contract.
    //
    pub fun getStoragePath(suffix: String): StoragePath {
        return StoragePath(identifier: "{{ contractName }}_".concat(suffix))!
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

    init({{#unless saveAdminResourceToContractAccount }}admin: AuthAccount{{/unless}}) {

        self.version = "{{ freshmintVersion }}"

        self.CollectionPublicPath = {{ contractName }}.getPublicPath(suffix: "Collection")
        self.CollectionStoragePath = {{ contractName }}.getStoragePath(suffix: "Collection")
        self.CollectionPrivatePath = {{ contractName }}.getPrivatePath(suffix: "Collection")

        self.AdminStoragePath = {{ contractName }}.getStoragePath(suffix: "Admin")

        // Initialize the total supply
        self.totalSupply = 0

        // Initialize the total editions
        self.totalEditions = 0

        self.editions = {}
        
        self.initAdmin(admin: {{#if saveAdminResourceToContractAccount }}self.account{{ else }}admin{{/if}})

        emit ContractInitialized()
    }
}
