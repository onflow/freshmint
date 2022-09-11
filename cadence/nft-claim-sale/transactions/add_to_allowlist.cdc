import {{ contractName }} from {{{ contractAddress }}}

import NFTClaimSale from {{{ imports.NFTClaimSale }}}

pub fun getOrCreateAllowlist(account: AuthAccount, allowlistName: String): &NFTClaimSale.Allowlist {
    let fullAllowlistName = NFTClaimSale.makeAllowlistName(name: allowlistName)

    let storagePath = {{ contractName }}.getStoragePath(suffix: fullAllowlistName)

    if let allowlist = account.borrow<&NFTClaimSale.Allowlist>(from: storagePath) {
        return allowlist
    }

    let allowlist <- NFTClaimSale.createAllowlist()
    let allowlistRef = &allowlist as &NFTClaimSale.Allowlist

    account.save(<- allowlist, to: storagePath)

    let privatePath = {{ contractName }}.getPrivatePath(suffix: fullAllowlistName)

    account.link<&NFTClaimSale.Allowlist>(privatePath, target: storagePath)

    return allowlistRef
}

// This transaction adds a list of addresses to an allowlist.
//
// Parameters:
// - allowlistName: the name of the allowlist.
// - addresses: the list of addresses to add to the allowlist.
// - claims: the number of claims to grant to all addresses.
//
transaction(allowlistName: String, addresses: [Address], claims: UInt) {

    let allowlist: &NFTClaimSale.Allowlist

    prepare(signer: AuthAccount) {
        self.allowlist = getOrCreateAllowlist(account: signer, allowlistName: allowlistName)
    }

    execute {
        for address in addresses {
            self.allowlist.setClaims(address: address, claims: claims)
        }
    }
}
