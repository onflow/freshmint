import MetadataViews from {{{ imports.MetadataViews }}}
import FungibleToken from {{{ imports.FungibleToken }}}

pub fun prepareRoyalties(
    addresses: [Address],
    receiverPaths: [PublicPath],
    cuts: [UFix64],
    descriptions: [String]
): [MetadataViews.Royalty] {
    let royalties: [MetadataViews.Royalty] = []

    for i, address in addresses {
        let receiverPath = receiverPaths[i]
        let cut = cuts[i]
        let description = descriptions[i]

        let receiver = getAccount(address).getCapability<&{FungibleToken.Receiver}>(receiverPath)

        let royalty = MetadataViews.Royalty(
            receiver: receiver,
            cut: cut, 
            description: description
        )

        royalties.append(royalty)
    }

    return royalties
}

transaction(
    contractName: String,
    contractCode: String,
    collectionMetadata: MetadataViews.NFTCollectionDisplay,
    royaltyAddresses: [Address],
    royaltyReceiverPaths: [PublicPath],
    royaltyCuts: [UFix64],
    royaltyDescriptions: [String]
) {
    prepare(signer: AuthAccount) {
        let account = AuthAccount(payer: signer)

        let royalties = prepareRoyalties(
            addresses: royaltyAddresses,
            receiverPaths: royaltyReceiverPaths,
            cuts: royaltyCuts,
            descriptions: royaltyDescriptions
        )

        signer.contracts.add(
            name: contractName,
            code: contractCode.decodeHex(),
            collectionMetadata,
            royalties
        )
    }
}
