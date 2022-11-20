import {{ contractName }} from {{{ contractAddress }}}

pub fun main(primaryKeys: [String]): [Bool] {
    let nfts: [Bool] = []

    for primaryKey in primaryKeys {
        let exists = {{ contractName }}.getNFTByPrimaryKey(primaryKey: primaryKey) != nil
        nfts.append(exists)
    }

    return nfts
}
