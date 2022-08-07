import NonFungibleToken from {{{ contracts.NonFungibleToken }}}
import {{ contractName }} from {{{ contractAddress }}}

transaction(editionIDs: [UInt64], editionSerials: [UInt64]) {
    
    let admin: &{{ contractName }}.Admin
    let receiver: &{NonFungibleToken.CollectionPublic}

    prepare(signer: AuthAccount) {
        self.admin = signer.borrow<&{{ contractName }}.Admin>(from: {{ contractName }}.AdminStoragePath)
            ?? panic("Could not borrow a reference to the NFT admin")
        
        self.receiver = signer
            .getCapability({{ contractName }}.CollectionPublicPath)!
            .borrow<&{NonFungibleToken.CollectionPublic}>()
            ?? panic("Could not get receiver reference to the NFT Collection")
    }

    pre {
        editionIDs.length == editionSerials.length : "input arrays must be equal length"
    }

    execute {
        for i, editionID in editionIDs {
            let token <- self.admin.mintNFT(
                editionID: editionID,
                editionSerial: editionSerials[i],
            )

            self.receiver.deposit(token: <- token)   
        }
    }
}
