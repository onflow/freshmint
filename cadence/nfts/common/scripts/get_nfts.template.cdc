import {{ contractName }} from {{{ contractAddress }}}
import NonFungibleToken from {{{ imports.NonFungibleToken }}}

pub fun main(address: Address): [UInt64] {
    if let col = getAccount(address).getCapability<&{{ contractName }}.Collection{NonFungibleToken.CollectionPublic}>({{ contractName }}.CollectionPublicPath).borrow() {
        return col.getIDs()
    }

    return []
}
