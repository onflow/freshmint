import NonFungibleToken from {{{ imports.NonFungibleToken }}}
import NFTLockBox from {{{ imports.NFTLockBox }}}
import {{ contractName }} from {{{ contractAddress }}}

pub fun getOrCreateLockBox(account: AuthAccount): &NFTLockBox.LockBox {
    if let existingLockBox = account.borrow<&NFTLockBox.LockBox>(from: NFTLockBox.DefaultLockBoxStoragePath) {
        return existingLockBox
    }

    let collection = account.getCapability<&{NonFungibleToken.Provider, NonFungibleToken.Receiver}>({{ contractName }}.CollectionPrivatePath)

    let lockBox <- NFTLockBox.createLockBox(
        collection: collection,
        receiverPath: {{ contractName }}.CollectionPublicPath
    )

    let lockBoxRef = &lockBox as &NFTLockBox.LockBox

    account.save(<- lockBox, to: NFTLockBox.DefaultLockBoxStoragePath)

    account.link<&NFTLockBox.LockBox{NFTLockBox.LockBoxPublic}>(
        NFTLockBox.DefaultLockBoxPublicPath, 
        target: NFTLockBox.DefaultLockBoxStoragePath
    )

    return lockBoxRef
}

transaction(
    publicKeys: [String],
    editionIDs: [UInt64],
    editionSerials: [UInt64]
) {
    
    let admin: &{{ contractName }}.Admin
    let lockBox: &NFTLockBox.LockBox

    prepare(signer: AuthAccount) {
        self.admin = signer.borrow<&{{ contractName }}.Admin>(from: {{ contractName }}.AdminStoragePath)
            ?? panic("Could not borrow a reference to the NFT admin")
        
        self.lockBox = getOrCreateLockBox(account: signer)
    }

    execute {
        for i, publicKey in publicKeys {
            let token <- self.admin.mintNFT(
                editionID: editionIDs[i],
                editionSerial: editionSerials[i],
            )

            self.lockBox.deposit(
                token: <- token, 
                publicKey: publicKey.decodeHex()
            )
        }
    }
}
