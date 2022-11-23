import {{ contractName }} from {{{ contractAddress }}}

pub fun main(mintIDs: [String]): [Bool] {
    let nfts: [Bool] = []

    for mintID in mintIDs {
        let exists = {{ contractName }}.getNFTByMintID(mintID: mintID) != nil
        nfts.append(exists)
    }

    return nfts
}
