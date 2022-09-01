import NonFungibleToken from {{{ imports.NonFungibleToken }}}
import NFTLockBox from {{{ imports.NFTLockBox }}}
import {{ contractName }} from {{{ contractAddress }}}

transaction(lockBoxAddress: Address, id: UInt64, signature: String) {

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
            id: id,
            address: self.receiverAddress,
            signature: signature.decodeHex() 
        )
    }
}
