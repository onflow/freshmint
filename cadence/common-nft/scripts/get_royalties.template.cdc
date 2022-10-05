import {{ contractName }} from {{{ contractAddress }}}

import MetadataViews from {{{ imports.MetadataViews }}}

pub fun main(): [MetadataViews.Royalty] {
    return {{ contractName }}.getRoyalties()
}
