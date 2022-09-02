import NonFungibleToken from {{{ imports.NonFungibleToken }}}
import NFTLockBox from {{{ imports.NFTLockBox }}}
import {{ contractName }} from {{{ contractAddress }}}

// This transaction claims on NFT from a lock box at the given address.
//
// Parameters:
// - lockBoxAddress: the account address where the lock box is stored.
// - nftID: the ID of the NFT to be claimed.
// - signature: a claim message signature from the NFT's claim key.
//
// The transaction also creates a collection that is capable of
// receiving the NFT if one does not already exist in the signer's account.
//
transaction(lockBoxAddress: Address, nftID: UInt64, signature: String) {

    let receiverAddress: Address 
    let lockBox: &{NFTLockBox.LockBoxPublic}

    prepare(signer: AuthAccount) {
        if signer.borrow<&{{ contractName }}.Collection>(from: {{ contractName }}.CollectionStoragePath) == nil {
            let collection <- {{ contractName }}.createEmptyCollection()
            
            signer.save(<-collection, to: {{ contractName }}.CollectionStoragePath)

            signer.link<&{{ contractName }}.Collection{NonFungibleToken.CollectionPublic, {{ contractName }}.{{ contractName }}CollectionPublic}>(
                {{ contractName }}.CollectionPublicPath, 
                target: {{ contractName }}.CollectionStoragePath
            )
        }

        self.receiverAddress = signer.address

        self.lockBox = getAccount(lockBoxAddress)
            .getCapability(NFTLockBox.DefaultLockBoxPublicPath)!
            .borrow<&{NFTLockBox.LockBoxPublic}>()!
    }

    execute {
        self.lockBox.claim(
            id: nftID,
            address: self.receiverAddress,
            signature: signature.decodeHex() 
        )
    }
}
