pub contract FreshmintMetadataViews {

    // BlindNFT returns a representation of
    // a hidden or "blind" NFT, which at this point
    // is a secure hash of the NFT's metadata values.
    pub struct BlindNFT {
        pub let metadataHash: [UInt8]

        init(metadataHash: [UInt8]) {
            self.metadataHash = metadataHash
        }
    }
}
