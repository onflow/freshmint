import {{ contractName }} from {{{ contractAddress }}}

import MetadataViews from {{{ imports.MetadataViews }}}

/// This script fetches the collection metadata for {{ contractName }} NFTs.
///
pub fun main(): MetadataViews.NFTCollectionDisplay? {
    return {{ contractName }}.collectionMetadata
}
