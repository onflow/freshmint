import {{ contractName }} from {{{ contractAddress }}}

import FreshmintClaimSaleV2 from {{{ imports.FreshmintClaimSaleV2 }}}

pub fun getOrCreateAllowlist(account: AuthAccount, allowlistName: String): &FreshmintClaimSaleV2.Allowlist {
    let fullAllowlistName = FreshmintClaimSaleV2.makeAllowlistName(name: allowlistName)

    let storagePath = {{ contractName }}.getStoragePath(suffix: fullAllowlistName)

    if let allowlist = account.borrow<&FreshmintClaimSaleV2.Allowlist>(from: storagePath) {
        return allowlist
    }

    let allowlist <- FreshmintClaimSaleV2.createAllowlist()
    let allowlistRef = &allowlist as &FreshmintClaimSaleV2.Allowlist

    account.save(<- allowlist, to: storagePath)

    let privatePath = {{ contractName }}.getPrivatePath(suffix: fullAllowlistName)

    account.link<&FreshmintClaimSaleV2.Allowlist>(privatePath, target: storagePath)

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

    let allowlist: &FreshmintClaimSaleV2.Allowlist

    prepare(signer: AuthAccount) {
        self.allowlist = getOrCreateAllowlist(account: signer, allowlistName: allowlistName)
    }

    execute {
        for address in addresses {
            self.allowlist.setClaims(address: address, claims: claims)
        }
    }
}
