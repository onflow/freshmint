import NonFungibleToken from {{{ contracts.NonFungibleToken }}}
import MetadataViews from {{{ contracts.MetadataViews }}}
import FungibleToken from {{{ contracts.FungibleToken }}}

pub contract {{ contractName }}: NonFungibleToken {

    // Events
    //
    pub event ContractInitialized()
    pub event Withdraw(id: UInt64, from: Address?)
    pub event Deposit(id: UInt64, to: Address?)
    pub event Minted(id: UInt64)
    pub event Burned(id: UInt64)

    // Named Paths
    //
    pub let CollectionStoragePath: StoragePath
    pub let CollectionPublicPath: PublicPath
    pub let CollectionPrivatePath: PrivatePath
    pub let AdminStoragePath: StoragePath

    // totalSupply
    // The total number of {{ contractName }} that have been minted
    //
    pub var totalSupply: UInt64

    pub resource NFT: NonFungibleToken.INFT {

        pub let id: UInt64

        {{#each fields}}
        pub let {{ this.name }}: {{ this.asCadenceTypeString }}
        {{/each}}

        init(
            id: UInt64,
            {{#each fields}}
            {{ this.name }}: {{ this.asCadenceTypeString }},
            {{/each}}
        ) {
            self.id = id
            {{#each fields}}
            self.{{ this.name }} = {{ this.name }}
            {{/each}}
        }

        {{#if displayView }}
        pub fun getViews(): [Type] {
            return [
                Type<MetadataViews.Display>()
            ]
        }

        pub fun resolveView(_ view: Type): AnyStruct? {
            switch view {
                case Type<MetadataViews.Display>():
                    return MetadataViews.Display(
                        name: self.{{viewField displayView.options.fields.name }},
                        description: self.{{viewField displayView.options.fields.description }},
                        thumbnail: MetadataViews.IPFSFile(
                            cid: self.{{viewField displayView.options.fields.thumbnail }}, 
                            path: nil
                        )
                    )
            }

            return nil
        }
        {{ else }}
        pub fun getViews(): [Type] {
            return []
        }

        pub fun resolveView(_ view: Type): AnyStruct? {
            return nil
        }
        {{/if}}

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

    pub resource Collection: {{ contractName }}CollectionPublic, NonFungibleToken.Provider, NonFungibleToken.Receiver, NonFungibleToken.CollectionPublic {
        
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

        // mintNFT
        // Mints a new NFT with a new ID
        //
        pub fun mintNFT(
            {{#each fields}}
            {{ this.name }}: {{ this.asCadenceTypeString }},
            {{/each}}
        ): @{{ contractName }}.NFT {
            let nft <- create {{ contractName }}.NFT(
                id: {{ contractName }}.totalSupply,
                {{#each fields}}
                {{ this.name }}: {{ this.name }},
                {{/each}}
            )

            emit Minted(id: nft.id)

            {{ contractName }}.totalSupply = {{ contractName }}.totalSupply + (1 as UInt64)

            return <- nft
        }
    }

    // fetch
    // Get a reference to a {{ contractName }} from an account's Collection, if available.
    // If an account does not have a {{ contractName }}.Collection, panic.
    // If it has a collection but does not contain the itemID, return nil.
    // If it has a collection and that collection contains the itemID, return a reference to that.
    //
    pub fun fetch(_ from: Address, itemID: UInt64): &{{ contractName }}.NFT? {
        let collection = getAccount(from)
            .getCapability({{ contractName }}.CollectionPublicPath)!
            .borrow<&{ {{ contractName }}.{{ contractName }}CollectionPublic }>()
            ?? panic("Couldn't get collection")

        // We trust {{ contractName }}.Collection.borow{{ contractName }} to get the correct itemID
        // (it checks it before returning it).
        return collection.borrow{{ contractName }}(id: itemID)
    }

    priv fun initAdmin(admin: AuthAccount) {
        // Create an empty collection and save it to storage
        let collection <- {{ contractName }}.createEmptyCollection()
        admin.save(<- collection, to: {{ contractName }}.CollectionStoragePath)
        admin.link<&{{ contractName }}.Collection>({{ contractName }}.CollectionPrivatePath, target: {{ contractName }}.CollectionStoragePath)
        admin.link<&{{ contractName }}.Collection{NonFungibleToken.CollectionPublic, {{ contractName }}.{{ contractName }}CollectionPublic}>({{ contractName }}.CollectionPublicPath, target: {{ contractName }}.CollectionStoragePath)
        
        // Create an admin resource and save it to storage
        let adminResource <- create Admin()
        admin.save(<- adminResource, to: self.AdminStoragePath)
    }

    // initializer
    //
    init({{#unless saveAdminResourceToContractAccount }}admin: AuthAccount{{/unless}}) {
        // Set our named paths
        self.CollectionStoragePath = /storage/{{ contractName }}Collection
        self.CollectionPublicPath = /public/{{ contractName }}Collection
        self.CollectionPrivatePath = /private/{{ contractName }}Collection
        self.AdminStoragePath = /storage/{{ contractName }}Admin

        // Initialize the total supply
        self.totalSupply = 0

        self.initAdmin(admin: {{#if saveAdminResourceToContractAccount }}self.account{{ else }}admin{{/if}})

        emit ContractInitialized()
    }
}
