import {{ contractName }} from {{{ contractAddress }}}

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
