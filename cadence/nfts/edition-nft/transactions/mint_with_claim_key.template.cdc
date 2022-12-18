import {{ contractName }} from {{{ contractAddress }}}

import NonFungibleToken from {{{ imports.NonFungibleToken }}}
import MetadataViews from {{{ imports.MetadataViews }}}
import FreshmintLockBox from {{{ imports.FreshmintLockBox }}}

/// This transaction mints a batch of NFTs into the given edition
/// and places them in a lock box, where users can claim them using claim keys.
///
/// Parameters:
/// - editionID: the ID of the edition to mint into.
/// - publicKeys: a public key for each NFT that matches its corresponding claim key.
///
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
        // Mint one NFT for each public key
        for i, publicKey in publicKeys {
        
            let token <- self.admin.mintNFT(editionID: editionID)

            self.lockBox.deposit(
                token: <- token, 
                publicKey: publicKey.decodeHex()
            )
        }
    }
}

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
