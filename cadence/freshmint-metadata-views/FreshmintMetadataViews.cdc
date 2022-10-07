pub contract FreshmintMetadataViews {

    /// BlindNFT returns a representation of a hidden NFT.
    ///
    /// A hidden NFT contains a secure hash of its metadata values 
    /// that can later be used to verify its authenticity.
    ///
    pub struct BlindNFT {
    
        pub let hash: [UInt8]

        init(hash: [UInt8]) {
            self.hash = hash
        }
    }
}
