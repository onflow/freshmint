import {{ contractName }} from {{{ contractAddress }}}

/// This transaction fetches a list of editions by their mint IDs.
///
/// Parameters:
/// - mintIDs: the edition mint IDs to fetch.
///
/// Returns: a list of optional {{ contractName }}.Edition structs
/// in the same order as their provided mint IDs.
///
/// If an edition is not found, it is returned as a nil entry in the list.
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
