import {{ contractName }} from {{{ contractAddress }}}

/// This script checks if any of the provided mint IDs have already
/// been used in the {{ contractName }} contract.
///
/// The Freshmint minting tool uses this script to avoid 
/// minting duplicate NFTs.
///
/// Returns: an array with a boolean entry for each provided mint ID
/// that is true if the mind ID at that index has already been used.
///
pub fun main(mintIDs: [String]): [Bool] {
    let nfts: [Bool] = []

    for mintID in mintIDs {
        let exists = {{ contractName }}.getNFTByMintID(mintID: mintID) != nil
        nfts.append(exists)
    }

    return nfts
}
