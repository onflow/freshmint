import {{ contractName }} from {{{ contractAddress }}}

import FreshmintClaimSale from {{{ imports.FreshmintClaimSale }}}

pub fun getOrCreateAllowlist(account: AuthAccount, allowlistName: String): &FreshmintClaimSale.Allowlist {
    let fullAllowlistName = FreshmintClaimSale.makeAllowlistName(name: allowlistName)

    let storagePath = {{ contractName }}.getStoragePath(suffix: fullAllowlistName)

    if let allowlist = account.borrow<&FreshmintClaimSale.Allowlist>(from: storagePath) {
        return allowlist
    }

    let allowlist <- FreshmintClaimSale.createAllowlist()
    let allowlistRef = &allowlist as &FreshmintClaimSale.Allowlist

    account.save(<- allowlist, to: storagePath)

    let privatePath = {{ contractName }}.getPrivatePath(suffix: fullAllowlistName)

    account.link<&FreshmintClaimSale.Allowlist>(privatePath, target: storagePath)

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

    let allowlist: &FreshmintClaimSale.Allowlist

    prepare(signer: AuthAccount) {
        self.allowlist = getOrCreateAllowlist(account: signer, allowlistName: allowlistName)
    }

    execute {
        for address in addresses {
            self.allowlist.setClaims(address: address, claims: claims)
        }
    }
}
