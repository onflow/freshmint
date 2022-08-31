import NonFungibleToken from {{{ imports.NonFungibleToken }}}
import NFTLockBox from {{{ imports.NFTClaimKeyCollection }}}
import {{ contractName }} from {{{ contractAddress }}}

transaction(lockBoxAddress: Address, id: UInt64, signature: String) {

    let receiver: &{NonFungibleToken.Receiver}
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

        self.receiver = signer
            .getCapability({{ contractName }}.CollectionPublicPath)!
            .borrow<&{NonFungibleToken.Receiver}>()!

        self.lockBox = getAccount(lockBoxAddress)
            .getCapability(NFTLockBox.LockBoxPublicPath)!
            .borrow<&{NFTLockBox.LockBoxPublic}>()!
    }

    execute {
        self.lockBox.claim(
            id: id, 
            signature: signature.decodeHex(), 
            receiver: self.receiver,
        )
    }
}
