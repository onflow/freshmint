import NonFungibleToken from "../contracts/NonFungibleToken.cdc"
import OpenSeaCompat from "../contracts/OpenSeaCompat.cdc"

// This transaction configures an account to hold Kitty Items.

transaction {
    prepare(signer: AuthAccount) {
        // if the account doesn't already have a collection
        if signer.borrow<&OpenSeaCompat.Collection>(from: OpenSeaCompat.CollectionStoragePath) == nil {

            // create a new empty collection
            let collection <- OpenSeaCompat.createEmptyCollection()
            
            // save it to the account
            signer.save(<-collection, to: OpenSeaCompat.CollectionStoragePath)

            // create a public capability for the collection
            signer.link<&OpenSeaCompat.Collection{NonFungibleToken.CollectionPublic, OpenSeaCompat.OpenSeaCompatCollectionPublic}>(OpenSeaCompat.CollectionPublicPath, target: OpenSeaCompat.CollectionStoragePath)
        }
    }
}
