import {{ contractName }} from {{{ contractAddress }}}
import NonFungibleToken from {{{ imports.NonFungibleToken }}}

/// This script returns the NFT IDs in this account's
/// default {{ contractName }}.Collection.
///
/// Parameters:
/// - address: the address of the account to fetch from.
///
pub fun main(address: Address): [UInt64] {
    if let col = getAccount(address).getCapability<&{{ contractName }}.Collection{NonFungibleToken.CollectionPublic}>({{ contractName }}.CollectionPublicPath).borrow() {
        return col.getIDs()
    }

    return []
}
