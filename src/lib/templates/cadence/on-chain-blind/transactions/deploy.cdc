transaction(
    contractName: String,
    contractCode: String,
    publicKeyHex: String,
    signatureAlgorithm: UInt8,
    hashAlgorithm: UInt8,
    placeholderImage: String,
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

        if saveAdminResourceToContractAccount {
            account.contracts.add(
                name: contractName,
                code: contractCode.decodeHex(),
                account,
                placeholderImage,
            )
        } else {
            account.contracts.add(
                name: contractName,
                code: contractCode.decodeHex(),
                admin,
                placeholderImage,
            )
        }
    }
}
