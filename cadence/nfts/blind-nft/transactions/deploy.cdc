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
    publicKeyHex: String,
    signatureAlgorithm: UInt8,
    hashAlgorithm: UInt8,
    placeholderImage: String,
    collectionMetadata: MetadataViews.NFTCollectionDisplay,
    royaltyAddresses: [Address],
    royaltyReceiverPaths: [PublicPath],
    royaltyCuts: [UFix64],
    royaltyDescriptions: [String],
    saveAdminResourceToContractAccount: Bool,
) {
    prepare(admin: AuthAccount) {
        let account = AuthAccount(payer: admin)

        let publicKey = PublicKey(
            publicKey: publicKeyHex.decodeHex(),
            signatureAlgorithm: SignatureAlgorithm(rawValue: signatureAlgorithm)!
        )

        account.keys.add(
            publicKey: publicKey,
            hashAlgorithm: HashAlgorithm(rawValue: hashAlgorithm)!,
            weight: 1000.0
        )

        let royalties = prepareRoyalties(
            addresses: royaltyAddresses,
            receiverPaths: royaltyReceiverPaths,
            cuts: royaltyCuts,
            descriptions: royaltyDescriptions
        )

        if saveAdminResourceToContractAccount {
            account.contracts.add(
                name: contractName,
                code: contractCode.decodeHex(),
                collectionMetadata,
                royalties,
                placeholderImage
            )
        } else {
            account.contracts.add(
                name: contractName,
                code: contractCode.decodeHex(),
                collectionMetadata,
                royalties,
                placeholderImage,
                admin
            )
        }
    }
}
