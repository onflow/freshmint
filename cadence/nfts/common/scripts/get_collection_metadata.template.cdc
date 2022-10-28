import {{ contractName }} from {{{ contractAddress }}}

import MetadataViews from {{{ imports.MetadataViews }}}

pub fun main(): MetadataViews.NFTCollectionDisplay? {
    return {{ contractName }}.collectionMetadata
}
