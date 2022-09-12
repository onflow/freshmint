import {{ contractName }} from {{{ contractAddress }}}

import NonFungibleToken from {{{ imports.NonFungibleToken }}}
import MetadataViews from {{{ imports.MetadataViews }}}
import FreshmintLockBox from {{{ imports.FreshmintLockBox }}}

pub fun getOrCreateLockBox(account: AuthAccount): &FreshmintLockBox.LockBox {
    if let existingLockBox = account.borrow<&FreshmintLockBox.LockBox>(from: FreshmintLockBox.DefaultLockBoxStoragePath) {
        return existingLockBox
    }

    let collection = account.getCapability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic, MetadataViews.ResolverCollection}>({{ contractName }}.CollectionPrivatePath)

    let lockBox <- FreshmintLockBox.createLockBox(
        collection: collection,
        receiverPath: {{ contractName }}.CollectionPublicPath
    )

    let lockBoxRef = &lockBox as &FreshmintLockBox.LockBox

    account.save(<- lockBox, to: FreshmintLockBox.DefaultLockBoxStoragePath)

    account.link<&FreshmintLockBox.LockBox{FreshmintLockBox.LockBoxPublic}>(
        FreshmintLockBox.DefaultLockBoxPublicPath, 
        target: FreshmintLockBox.DefaultLockBoxStoragePath
    )

    return lockBoxRef
}

transaction(
    publicKeys: [String],
    {{#each fields}}
    {{ this.name }}: [{{ this.asCadenceTypeString }}],
    {{/each}}
) {
    
    let admin: &{{ contractName }}.Admin
    let lockBox: &FreshmintLockBox.LockBox

    prepare(signer: AuthAccount) {
        self.admin = signer
            .borrow<&{{ contractName }}.Admin>(from: {{ contractName }}.AdminStoragePath)
            ?? panic("Could not borrow a reference to the NFT admin")
        
        self.lockBox = getOrCreateLockBox(signer)
    }

    execute {        
        for i, publicKey in publicKeys {

            let token <- self.admin.mintNFT(
                {{#each fields}}
                {{ this.name }}: {{ this.name }}[i],
                {{/each}}
            )
        
            self.lockBox.deposit(
                token: <- token, 
                publicKey: publicKey.decodeHex()
            )
        }
    }
}
