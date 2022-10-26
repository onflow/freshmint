/// Set the royalty recipients for this contract.
///
/// This function updates the royalty recipients for all NFTs
/// minted by this contract.
///
pub fun setRoyalties(_ royalties: [MetadataViews.Royalty]) {
    {{ contractName }}.royalties = royalties
}
