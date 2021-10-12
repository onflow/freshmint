import NonFungibleToken from "../contracts/NonFungibleToken.cdc"
import OpenSeaCompat from "../contracts/OpenSeaCompat.cdc"


transaction(recipient: Address, metadata: String) {
    
    let admin: &OpenSeaCompat.Admin

    prepare(signer: AuthAccount) {
        self.admin = signer.borrow<&OpenSeaCompat.Admin>(from: OpenSeaCompat.AdminStoragePath)
            ?? panic("Could not borrow a reference to the NFT admin")
    }

    execute {
        // get the public account object for the recipient
        let recipient = getAccount(recipient)

        // borrow the recipient's public NFT collection reference
        let receiver = recipient
            .getCapability(OpenSeaCompat.CollectionPublicPath)!
            .borrow<&{NonFungibleToken.CollectionPublic}>()
            ?? panic("Could not get receiver reference to the NFT Collection")

        // mint the NFT and deposit it to the recipient's collection
        self.admin.mintNFT(recipient: receiver, metadata: metadata)
    }
}
