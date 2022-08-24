import NonFungibleToken from {{{ imports.NonFungibleToken }}}
import NFTAirDrop from {{{ imports.NFTAirDrop }}}
import {{ contractName }} from {{{ contractAddress }}}

pub fun getOrCreateDrop(account: AuthAccount): &NFTAirDrop.Drop {
    if let existingDrop = account.borrow<&NFTAirDrop.Drop>(from: NFTAirDrop.DropStoragePath) {
        return existingDrop
    }

    let collection = account.getCapability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>({{ contractName }}.CollectionPrivatePath)

    let drop <- NFTAirDrop.createDrop(
        nftType: Type<@{{ contractName }}.NFT>(),
        collection: collection
    )

    let dropRef = &drop as &NFTAirDrop.Drop

    account.save(<- drop, to: NFTAirDrop.DropStoragePath)

    account.link<&NFTAirDrop.Drop{NFTAirDrop.DropPublic}>(
        NFTAirDrop.DropPublicPath, 
        target: NFTAirDrop.DropStoragePath
    )

    return dropRef
}

transaction(
    publicKeys: [String],
    editionIDs: [UInt64],
    editionSerials: [UInt64]
) {
    
    let admin: &{{ contractName }}.Admin
    let drop: &NFTAirDrop.Drop

    prepare(signer: AuthAccount) {
        self.admin = signer.borrow<&{{ contractName }}.Admin>(from: {{ contractName }}.AdminStoragePath)
            ?? panic("Could not borrow a reference to the NFT admin")
        
        self.drop = getOrCreateDrop(account: signer)
    }

    execute {
        for i, publicKey in publicKeys {
            let token <- self.admin.mintNFT(
                editionID: editionIDs[i],
                editionSerial: editionSerials[i],
            )

            self.drop.deposit(
                token: <- token, 
                publicKey: publicKey.decodeHex()
            )
        }
    }
}
