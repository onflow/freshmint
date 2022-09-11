import {{ contractName }} from {{{ contractAddress }}}

import NonFungibleToken from {{{ imports.NonFungibleToken }}}
import MetadataViews from {{{ imports.MetadataViews }}}
import NFTLockBox from {{{ imports.NFTLockBox }}}

pub fun getOrCreateLockBox(
    account: AuthAccount,
    lockBoxStoragePath: StoragePath,
    lockBoxPublicPath: PublicPath,
    collectionPrivatePath: PrivatePath
): &NFTLockBox.LockBox {
    if let existingLockBox = account.borrow<&NFTLockBox.LockBox>(from: lockBoxStoragePath) {
        return existingLockBox
    }

    let collection = account.getCapability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic, MetadataViews.ResolverCollection}>(collectionPrivatePath)

    let lockBox <- NFTLockBox.createLockBox(
        collection: collection,
        receiverPath: {{ contractName }}.CollectionPublicPath
    )

    let lockBoxRef = &lockBox as &NFTLockBox.LockBox

    account.save(<- lockBox, to: lockBoxStoragePath)

    account.link<&NFTLockBox.LockBox{NFTLockBox.LockBoxPublic}>(
        lockBoxPublicPath, 
        target: lockBoxStoragePath
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
        
        self.lockBox = getOrCreateLockBox(
            account: signer,
            lockBoxStoragePath: {{ contractName }}.getStoragePath(suffix: "LockBox"),
            lockBoxPublicPath: {{ contractName }}.getPublicPath(suffix: "LockBox"),
            collectionPrivatePath: {{ contractName }}.CollectionPrivatePath
        )
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
