import {{ contractName }} from {{{ contractAddress }}}

import NonFungibleToken from {{{ imports.NonFungibleToken }}}
import MetadataViews from {{{ imports.MetadataViews }}}
import FreshmintLockBox from {{{ imports.FreshmintLockBox }}}

pub fun getOrCreateLockBox(
    account: AuthAccount,
    lockBoxStoragePath: StoragePath,
    lockBoxPublicPath: PublicPath,
    collectionPrivatePath: PrivatePath
): &FreshmintLockBox.LockBox {
    if let existingLockBox = account.borrow<&FreshmintLockBox.LockBox>(from: lockBoxStoragePath) {
        return existingLockBox
    }

    let collection = account.getCapability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic, MetadataViews.ResolverCollection}>(collectionPrivatePath)

    let lockBox <- FreshmintLockBox.createLockBox(
        collection: collection,
        receiverPath: {{ contractName }}.CollectionPublicPath
    )

    let lockBoxRef = &lockBox as &FreshmintLockBox.LockBox

    account.save(<- lockBox, to: lockBoxStoragePath)

    account.link<&FreshmintLockBox.LockBox{FreshmintLockBox.LockBoxPublic}>(
        lockBoxPublicPath, 
        target: lockBoxStoragePath
    )

    return lockBoxRef
}

transaction(
    editionID: UInt64,
    publicKeys: [String]
) {
    
    let admin: &{{ contractName }}.Admin
    let lockBox: &FreshmintLockBox.LockBox

    prepare(signer: AuthAccount) {
        self.admin = signer
            .borrow<&{{ contractName }}.Admin>(from: {{ contractName }}.AdminStoragePath)
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
        
            let token <- self.admin.mintNFT(editionID: editionID)

            self.lockBox.deposit(
                token: <- token, 
                publicKey: publicKey.decodeHex()
            )
        }
    }
}
