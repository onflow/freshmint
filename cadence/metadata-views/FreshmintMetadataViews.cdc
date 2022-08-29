pub contract FreshmintMetadataViews {
    pub struct BlindNFT {
        pub let metadataHash: [UInt8]

        init(metadataHash: [UInt8]) {
            self.metadataHash = metadataHash
        }
    }
}
