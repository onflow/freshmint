import NonFungibleToken from "../contracts/NonFungibleToken.cdc"
import {{ name }} from "../contracts/{{ name }}.cdc"

transaction(metadata: String) {
    
    let admin: &{{ name }}.Admin
    let receiver: &{NonFungibleToken.CollectionPublic}

    prepare(signer: AuthAccount) {
        self.admin = signer.borrow<&{{ name }}.Admin>(from: {{ name }}.AdminStoragePath)
            ?? panic("Could not borrow a reference to the NFT admin")
        
        self.receiver = signer
            .getCapability({{ name }}.CollectionPublicPath)!
            .borrow<&{NonFungibleToken.CollectionPublic}>()
            ?? panic("Could not get receiver reference to the NFT Collection")
    }

    execute {
        let token <- self.admin.mintNFT(metadata: metadata)
        
        self.receiver.deposit(token: <- token)
    }
}
