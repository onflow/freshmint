import {{ contractName }} from {{{ contractAddress }}}

import NonFungibleToken from {{{ imports.NonFungibleToken }}}
import MetadataViews from {{{ imports.MetadataViews }}}

/// This transaction stores an empty {{ contractName }}.Collection in the signer's
/// account if they do not already have one.
///
transaction {
    prepare(signer: AuthAccount) {
        // Return early if the account already has a collection
        if signer.borrow<&{{ contractName }}.Collection>(from: {{ contractName }}.CollectionStoragePath) != nil {
            return
        }

        // Create a new empty collection
        let collection <- {{ contractName }}.createEmptyCollection()

        // Save the collection to the account
        signer.save(<-collection, to: {{ contractName }}.CollectionStoragePath)

        // Link a public capability for the collection
        signer.link<&{{ contractName }}.Collection{NonFungibleToken.CollectionPublic, {{ contractName }}.{{ contractName }}CollectionPublic, MetadataViews.ResolverCollection}>(
            {{ contractName }}.CollectionPublicPath,
            target: {{ contractName }}.CollectionStoragePath
        )
    }
}
