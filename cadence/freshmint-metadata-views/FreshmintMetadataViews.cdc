pub contract FreshmintMetadataViews {

    /// BlindNFT returns a representation of a hidden NFT.
    ///
    /// A hidden (or blind) NFT contains secure
    /// hash of its metadata values that can later be used
    /// to verify its authenticity.
    ///
    pub struct BlindNFT {
    
        // TODO: change this field to "hash" and redeploy the contract on testnet.
        pub let metadataHash: [UInt8]

        init(hash: [UInt8]) {
            self.metadataHash = hash
        }
    }
}
