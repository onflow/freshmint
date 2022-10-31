import {{ contractName }} from {{{ contractAddress }}}

import NonFungibleToken from {{{ imports.NonFungibleToken }}}
import MetadataViews from {{{ imports.MetadataViews }}}
import FreshmintLockBox from {{{ imports.FreshmintLockBox }}}

pub fun intializeCollection(account: AuthAccount) {
    if account.borrow<&{{ contractName }}.Collection>(from: {{ contractName }}.CollectionStoragePath) == nil {
        let collection <- {{ contractName }}.createEmptyCollection()
        
        account.save(<-collection, to: {{ contractName }}.CollectionStoragePath)

        account.link<&{{ contractName }}.Collection{NonFungibleToken.CollectionPublic, {{ contractName }}.{{ contractName }}CollectionPublic, MetadataViews.ResolverCollection}>(
            {{ contractName }}.CollectionPublicPath, 
            target: {{ contractName }}.CollectionStoragePath
        )
    }
}

// This transaction claims on NFT from a lock box at the given address.
//
// Parameters:
// - lockBoxAddress: the account address where the lock box is stored.
// - lockBoxPublicPath: the public path where the lock box is linked.
// - nftID: the ID of the NFT to be claimed.
// - signature: a claim message signature from the NFT's claim key.
//
// The transaction also creates a collection that is capable of
// receiving the NFT if one does not already exist in the signer's account.
//
transaction(
    lockBoxAddress: Address,
    lockBoxPublicPath: PublicPath,
    nftID: UInt64,
    signature: String
) {

    let receiverAddress: Address 
    let lockBox: &{FreshmintLockBox.LockBoxPublic}

    prepare(signer: AuthAccount) {
        self.receiverAddress = signer.address

        self.lockBox = getAccount(lockBoxAddress)
            .getCapability(lockBoxPublicPath)!
            .borrow<&{FreshmintLockBox.LockBoxPublic}>()!

        intializeCollection(account: signer)
    }

    execute {
        self.lockBox.claim(
            id: nftID,
            address: self.receiverAddress,
            signature: signature.decodeHex() 
        )
    }
}
