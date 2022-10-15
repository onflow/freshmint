import {{ contractName }} from {{{ contractAddress }}}

pub fun main(hashes: [String]): [{{ contractName }}.Edition?] {
    let editions: [{{ contractName }}.Edition?] = []

    for hash in hashes {
        if let editionID = {{ contractName }}.getEditionIDByHash(hash: hash) {
            let edition = {{ contractName }}.getEdition(id: editionID)!
            editions.append(edition)
        } else {
            editions.append(nil)
        }
    }

    return editions
}
