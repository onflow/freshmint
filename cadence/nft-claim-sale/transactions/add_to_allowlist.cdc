import {{ contractName }} from {{{ contractAddress }}}

import NFTClaimSale from {{{ imports.NFTClaimSale }}}

pub fun getOrCreateAllowlist(account: AuthAccount): &NFTClaimSale.Allowlist {
    let storagePath = {{ contractName }}.getStoragePath(suffix: "Allowlist")

    if let allowlist = account.borrow<&NFTClaimSale.Allowlist>(from: storagePath) {
        return allowlist
    }

    let allowlist <- NFTClaimSale.createAllowlist()
    let allowlistRef = &allowlist as &NFTClaimSale.Allowlist

    account.save(<- allowlist, to: storagePath)

    let privatePath = {{ contractName }}.getPrivatePath(suffix: "Allowlist")

    account.link<&NFTClaimSale.Allowlist>(privatePath, target: storagePath)

    return allowlistRef
}

transaction(addresses: [Address]) {

    let allowlist: &NFTClaimSale.Allowlist

    prepare(signer: AuthAccount) {
        self.allowlist = getOrCreateAllowlist(account: signer)
    }

    execute {
        for address in addresses {
            self.allowlist.setClaims(address: address, claims: 1)
        }
    }
}
