import {{ contractName }} from {{{ contractAddress }}}

pub fun main(hashes: [String]): [Bool] {
    let nfts: [Bool] = []

    for hash in hashes {
        let exists = {{ contractName }}.getNFTIDByHash(hash: hash) != nil
        nfts.append(exists)
    }

    return nfts
}
