import {{ contractName }} from {{{ contractAddress }}}

pub fun main(id: UInt64): {{ contractName }}.Edition? {
    return {{ contractName }}.getEdition(id: id)
}
