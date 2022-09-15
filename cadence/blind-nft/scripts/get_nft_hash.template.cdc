import {{ contractName }} from {{{ contractAddress }}}

pub fun main(id: UInt64): String? {
    if let metadata = {{ contractName }}.getMetadata(nftID: id) {
        return String.encodeHex(metadata.hash())
    }

    return nil
}
