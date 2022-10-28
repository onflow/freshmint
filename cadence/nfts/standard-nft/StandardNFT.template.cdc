import NonFungibleToken from {{{ imports.NonFungibleToken }}}
import MetadataViews from {{{ imports.MetadataViews }}}
import FungibleToken from {{{ imports.FungibleToken }}}
import FreshmintQueue from {{{ imports.FreshmintQueue }}}

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

    pub let QueueStoragePath: StoragePath
    pub let QueuePrivatePath: PrivatePath
    
    pub let AdminStoragePath: StoragePath

    /// The total number of {{ contractName }} NFTs that have been minted.
    ///
    pub var totalSupply: UInt64

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

    pub resource NFT: NonFungibleToken.INFT, MetadataViews.Resolver {

        pub let id: UInt64
        pub let metadata: Metadata

        init(metadata: Metadata) {
            self.id = self.uuid
            self.metadata = metadata
        }

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
                {{> viewCase view=this metadata="self.metadata" }}
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

        /// Mint a new NFT.
        ///
        /// To mint an NFT, specify a value for each of its metadata fields.
        ///
        pub fun mintNFT(
            {{#each fields}}
            {{ this.name }}: {{ this.asCadenceTypeString }},
            {{/each}}
        ): @{{ contractName }}.NFT {

            let metadata = Metadata(
                {{#each fields}}
                {{ this.name }}: {{ this.name }},
                {{/each}}
            )

            let nft <- create {{ contractName }}.NFT(metadata: metadata)

            emit Minted(id: nft.id)

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

    priv fun initAdmin(admin: AuthAccount) {
        // Create an empty collection and save it to storage
        let collection <- {{ contractName }}.createEmptyCollection()

        admin.save(<- collection, to: {{ contractName }}.CollectionStoragePath)

        admin.link<&{{ contractName }}.Collection>({{ contractName }}.CollectionPrivatePath, target: {{ contractName }}.CollectionStoragePath)

        admin.link<&{{ contractName }}.Collection{NonFungibleToken.CollectionPublic, {{ contractName }}.{{ contractName }}CollectionPublic, MetadataViews.ResolverCollection}>({{ contractName }}.CollectionPublicPath, target: {{ contractName }}.CollectionStoragePath)
        
        // Create a queue to hold minted NFTs.
        //
        // NFTs are minted into a queue to preserve the mint order.
        // A CollectionQueue is linked to a collection. All NFTs minted into 
        // the queue are deposited into the underlying collection.
        //
        let queue <- FreshmintQueue.createCollectionQueue(
            collection: admin.getCapability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic, MetadataViews.ResolverCollection}>({{ contractName }}.CollectionPrivatePath)
        )

        admin.save(<- queue, to: {{ contractName }}.QueueStoragePath)
        admin.link<&FreshmintQueue.CollectionQueue>({{ contractName }}.QueuePrivatePath, target: {{ contractName }}.QueueStoragePath)

        // Create an admin resource and save it to storage
        let adminResource <- create Admin()

        admin.save(<- adminResource, to: self.AdminStoragePath)
    }

    init(collectionMetadata: MetadataViews.NFTCollectionDisplay, royalties: [MetadataViews.Royalty]{{#unless saveAdminResourceToContractAccount }}, admin: AuthAccount{{/unless}}) {

        self.version = "{{ freshmintVersion }}"

        self.CollectionPublicPath = {{ contractName }}.getPublicPath(suffix: "Collection")
        self.CollectionStoragePath = {{ contractName }}.getStoragePath(suffix: "Collection")
        self.CollectionPrivatePath = {{ contractName }}.getPrivatePath(suffix: "Collection")

        self.QueueStoragePath = {{ contractName }}.getStoragePath(suffix: "Queue")
        self.QueuePrivatePath = {{ contractName }}.getPrivatePath(suffix: "Queue")

        self.AdminStoragePath = {{ contractName }}.getStoragePath(suffix: "Admin")

        self.royalties = royalties
        self.collectionMetadata = collectionMetadata

        self.totalSupply = 0

        self.initAdmin(admin: {{#if saveAdminResourceToContractAccount }}self.account{{ else }}admin{{/if}})

        emit ContractInitialized()
    }
}
