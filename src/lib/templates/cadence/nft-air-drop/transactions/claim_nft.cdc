import NonFungibleToken from {{{ contracts.NonFungibleToken }}}
import NFTAirDrop from {{{ contracts.NFTAirDrop }}}
import {{ contractName }} from {{{ contractAddress }}}

transaction(dropAddress: Address, id: UInt64, signature: String) {

    let receiver: &{NonFungibleToken.CollectionPublic}
    let drop: &{NFTAirDrop.DropPublic}

    prepare(signer: AuthAccount) {
        if signer.borrow<&{{ contractName }}.Collection>(from: {{ contractName }}.CollectionStoragePath) == nil {
            // create a new empty collection
            let collection <- {{ contractName }}.createEmptyCollection()
            
            // save it to the account
            signer.save(<-collection, to: {{ contractName }}.CollectionStoragePath)

            // create a public capability for the collection
            signer.link<&{{ contractName }}.Collection{NonFungibleToken.CollectionPublic, {{ contractName }}.{{ contractName }}CollectionPublic}>(
                {{ contractName }}.CollectionPublicPath, 
                target: {{ contractName }}.CollectionStoragePath
            )
        }
           
        self.receiver = signer
            .getCapability({{ contractName }}.CollectionPublicPath)!
            .borrow<&{NonFungibleToken.CollectionPublic}>()!

        self.drop = getAccount(dropAddress)
            .getCapability(NFTAirDrop.DropPublicPath)!
            .borrow<&{NFTAirDrop.DropPublic}>()!
    }

    execute {
        self.drop.claim(
            id: id, 
            signature: signature.decodeHex(), 
            receiver: self.receiver,
        )
    }
}
