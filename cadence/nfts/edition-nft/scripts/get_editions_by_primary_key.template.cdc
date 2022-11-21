import {{ contractName }} from {{{ contractAddress }}}

pub fun main(primaryKeys: [String]): [{{ contractName }}.Edition?] {
    let editions: [{{ contractName }}.Edition?] = []

    for primaryKey in primaryKeys {
        if let editionID = {{ contractName }}.getEditionByPrimaryKey(primaryKey: primaryKey) {
            let edition = {{ contractName }}.getEdition(id: editionID)!
            editions.append(edition)
        } else {
            editions.append(nil)
        }
    }

    return editions
}
