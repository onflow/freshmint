import MetadataViews from {{{ imports.MetadataViews }}}
import FungibleToken from {{{ imports.FungibleToken }}}

/// This transaction creates a new account and adds a Freshmint NFT contract to it.
///
/// In addition to deploying the contract, it also sets the collection metadata
/// and royalty recipients for the contract.
///
/// Parameters:
/// - contractName: the name of the contract.
/// - contractCode: a hex-encoded string containing the UTF-8 bytes of the contract source code.
/// - publicKeyHex: a hex-encoded public key string to add to the contract account.
/// - signatureAlgorithm: the signature algorithm of the above public key.
/// - hashAlgorithm: the hash algorithm to pair with the public key.
/// - collectionMetadata: the collection display metadata to attach to the contract.
/// - royaltyAddresses: a list of royalty receiver addresses.
/// - royaltyReceiverPaths: a list of royalty receiver paths (must be same length as royaltyAddresses).
/// - royaltyCuts: a list of royalty cut percentages (must be same length as royaltyAddresses).
/// - royaltyDescriptions: a list of royalty descriptions (must be same length as royaltyAddresses).
/// - saveAdminResourceToContractAccount: if true, this transaction will save the contract admin resource directly to the contract account.
///
transaction(
    contractName: String,
    contractCode: String,
    publicKeyHex: String,
    signatureAlgorithm: UInt8,
    hashAlgorithm: UInt8,
    collectionMetadata: MetadataViews.NFTCollectionDisplay,
    royaltyAddresses: [Address],
    royaltyReceiverPaths: [PublicPath],
    royaltyCuts: [UFix64],
    royaltyDescriptions: [String],
    saveAdminResourceToContractAccount: Bool,
) {
    prepare(signer: AuthAccount) {
        let account = AuthAccount(payer: signer)

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
            )
        } else {
            account.contracts.add(
                name: contractName,
                code: contractCode.decodeHex(),
                collectionMetadata,
                royalties,
                signer
            )
        }
    }
}

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
