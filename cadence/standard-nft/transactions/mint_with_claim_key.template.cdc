import {{ contractName }} from {{{ contractAddress }}}

import NonFungibleToken from {{{ imports.NonFungibleToken }}}
import MetadataViews from {{{ imports.MetadataViews }}}
import NFTLockBox from {{{ imports.NFTLockBox }}}

pub fun getOrCreateLockBox(account: AuthAccount): &NFTLockBox.LockBox {
    if let existingLockBox = account.borrow<&NFTLockBox.LockBox>(from: NFTLockBox.DefaultLockBoxStoragePath) {
        return existingLockBox
    }

    let collection = account.getCapability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic, MetadataViews.ResolverCollection}>({{ contractName }}.CollectionPrivatePath)

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
    {{#each fields}}
    {{ this.name }}: [{{ this.asCadenceTypeString }}],
    {{/each}}
) {
    
    let admin: &{{ contractName }}.Admin
    let lockBox: &NFTLockBox.LockBox

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
