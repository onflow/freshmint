import MetadataViews from {{{ imports.MetadataViews }}}

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

    /// Create an instance of MetadataViews.IPFSFile from the provided string.
    ///
    /// This function accepts either a file CID string or 
    /// a directory CID followed by a file path.
    ///
    /// - Plain file: "QmXnnyufdzAWL5CqZ2RnSNgPbvCc1ALT73s6epPrRnZ1Xy"
    /// - Directory file: "QmdbaSQbGU6Wo9i5LyWWVLuU8g6WrYpWh2K4Li4QuuE8Fr/example.txt"
    ///
    pub fun ipfsFile(file: String): MetadataViews.IPFSFile {
        // Find the first "/" character if one exists
        let maybeIndex = self.firstIndexInString(file, of: "/")

        if let index = maybeIndex {
            // The CID is all characters before the "/"
            let cid = file.slice(from: 0, upTo: index)

            // The remaining characters are the IPFS path
            let path = file.slice(from: index + 1, upTo: file.length)

            return MetadataViews.IPFSFile(
                cid: cid,
                path: path
            )
        }

        return MetadataViews.IPFSFile(
            cid: file,
            path: nil
        )
    }

    /// Return the first index of a character in the string,
    /// or nil if none exists.
    ///
    pub fun firstIndexInString(_ s: String, of: Character): Int? {
        var i = 0

        while i < s.length {
            if s[i] == of {
                return i
            }

            i = i + 1
        }

        return nil
    }
}
