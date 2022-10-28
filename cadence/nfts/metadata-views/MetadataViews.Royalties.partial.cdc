pub fun resolveRoyalties(): MetadataViews.Royalties {
    return MetadataViews.Royalties({{ contractName }}.getRoyalties())
}
