import {{ contractName }} from {{{ contractAddress }}}

/// This script fetches batch of editions by their mint IDs.
///
/// It is used by the Freshmint client code to prevent 
/// minting the same edition twice.
///
/// Returns: an arry of {{ contractName }}.Edition structs with one entry
/// for each provided mint ID.
///
/// A nil entry indicates that the mint ID at that index does not exist.
///
pub fun main(mintIDs: [String]): [{{ contractName }}.Edition?] {
    let editions: [{{ contractName }}.Edition?] = []

    for mintID in mintIDs {
        if let editionID = {{ contractName }}.getEditionByMintID(mintID: mintID) {
            let edition = {{ contractName }}.getEdition(id: editionID)!
            editions.append(edition)
        } else {
            editions.append(nil)
        }
    }

    return editions
}
