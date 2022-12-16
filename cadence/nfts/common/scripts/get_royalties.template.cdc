import {{ contractName }} from {{{ contractAddress }}}

import MetadataViews from {{{ imports.MetadataViews }}}

/// This script fetches the royalty recipients for all {{ contractName }} NFTs.
///
pub fun main(): [MetadataViews.Royalty] {
    return {{ contractName }}.getRoyalties()
}
