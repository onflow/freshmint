/// A list of royalty recipients that is attached to all NFTs
/// minted by this contract.
///
access(contract) let royalties: [MetadataViews.Royalty]

/// Return the royalty recipients for this contract.
///
pub fun getRoyalties(): [MetadataViews.Royalty] {
    return {{ contractName }}.royalties
}
