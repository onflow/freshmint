import OpenSeaCompat from "../contracts/OpenSeaCompat.cdc"

transaction {
    
    let admin: &OpenSeaCompat.Admin

    prepare(signer: AuthAccount) {
        self.admin = signer
            .borrow<&OpenSeaCompat.Admin>(from: OpenSeaCompat.AdminStoragePath)
            ?? panic("Could not borrow a reference to the NFT admin")
    }

    execute {
        self.admin.removeDrop()
    }
}
