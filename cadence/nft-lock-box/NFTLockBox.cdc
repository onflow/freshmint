import NonFungibleToken from {{{ imports.NonFungibleToken }}}
import FungibleToken from {{{ imports.FungibleToken }}}

pub contract NFTLockBox {

    // The Claimed event is emitted when an NFT
    // is successfully claimed from a lock box.
    pub event Claimed(
        nftType: Type,
        nftID: UInt64,
        from: Address?,
        recipient: Address
    )

    // These are the default storage and public paths
    // defined by the lock box contract.
    //
    // However, a lock box owner may store multiple lock boxes 
    // in the same account using non-default storage paths.
    pub let DefaultLockBoxStoragePath: StoragePath
    pub let DefaultLockBoxPublicPath: PublicPath

    // This is the publicly-available interface
    // that allows users to claim NFTs from a lock box.
    pub resource interface LockBoxPublic {
        pub fun claim(
            id: UInt64, 
            address: Address,
            signature: [UInt8]
        )
    }

    // A lock box is an NFT collection that maintains
    // a one-to-one mapping between NFTs and ECDSA public keys.
    //
    // A user can withdraw a given NFT if they have its corresponding
    // private key, referred to as the "claim key".
    //
    // The lock box owner can distribute claim keys (e.g. via email or QR code)
    // in order to facilitate an airdrop without requiring users to
    // have an existing Flow account address.
    pub resource LockBox: LockBoxPublic {

        // A capability to the underlying base NFT collection
        // that will store the claimable NFTs.
        access(self) let collection: Capability<&{NonFungibleToken.Provider, NonFungibleToken.Receiver}>
        
        // When moving a claimed NFT in an account,
        // the lock box will deposit the NFT into 
        // the NonFungibleToken.CollectionPublic linked at this public path.
        access(self) let receiverPath: PublicPath

        // A map of public keys, indexed by NFT ID,
        // used to verify claim signatures.
        access(self) let publicKeys: {UInt64: [UInt8]}

        init(
            collection: Capability<&{NonFungibleToken.Provider, NonFungibleToken.Receiver}>,
            receiverPath: PublicPath
        ) {
            self.collection = collection
            self.receiverPath = receiverPath

            self.publicKeys = {}
        }

        // Deposit an NFT into this lock box and make it claimable.
        //
        // After deposit, the NFT can be claimed with a signature
        // from the private key that corresponds to the provided public key.
        pub fun deposit(token: @NonFungibleToken.NFT, publicKey: [UInt8]) {
            let collection = self.collection.borrow()!

            self.publicKeys[token.id] = publicKey

            collection.deposit(token: <- token)
        }

        // Claim an NFT by ID using a claim signature and
        // deliver it to the provided address.
        //
        // If the NFT exists and the signature is valid,
        // this function will deposit the NFT into the account
        // with the provided address. 
        //
        // The account must expose a public NonFungibleToken.CollectionPublic
        // capability at `self.receiverPath` that can accept NFTs of this type.
        //
        // A signature is generated by signing:
        //
        //   SHA3_256(
        //     "FLOW-V0.0-user" + BYTES(ADDRESS) + BIG_ENDIAN_BYTES(ID)
        //   )
        //
        pub fun claim(
            id: UInt64, 
            address: Address,
            signature: [UInt8]
        ) {
            let collection = self.collection.borrow()!

            // We withdraw the NFT before verifying the signature
            // in order to fail as early as possible if the NFT
            // does not exist in this collection.
            let nft <- collection.withdraw(withdrawID: id)
            let nftType = nft.getType()

            let rawPublicKey = self.publicKeys.remove(key: id) 
                ?? panic("NFT is not claimable or has already been claimed")

            let publicKey = PublicKey(
                publicKey: rawPublicKey,
                signatureAlgorithm: SignatureAlgorithm.ECDSA_P256
            )

            let message = self.makeClaimMessage(address: address, id: id)

            let isValidClaim = publicKey.verify(
                signature: signature,
                signedData: message,
                domainSeparationTag: "FLOW-V0.0-user",
                hashAlgorithm: HashAlgorithm.SHA3_256
            )

            assert(isValidClaim, message: "invalid claim signature")

            let receiver = getAccount(address)
                .getCapability(self.receiverPath)
                .borrow<&{NonFungibleToken.CollectionPublic}>()!

            receiver.deposit(token: <- nft)

            emit Claimed(
                nftType: nftType,
                nftID: id,
                from: self.owner?.address,
                recipient: address
            )
        }

        // This function generates the raw message that is
        // used to validate a claim.
        //
        // The claim message is simply the recipient address concatenated
        // with the NFT ID in big-endian byte form.
        //
        // Both Address and UInt64 values have a fixed-length byte representation
        // of 8 bytes (64 bits), so a valid message will always be exactly 16 bytes long.
        pub fun makeClaimMessage(address: Address, id: UInt64): [UInt8] {
            let addressBytes = address.toBytes()
            let idBytes = id.toBigEndianBytes()

            return addressBytes.concat(idBytes)
        }
    }

    pub fun createLockBox(
        collection: Capability<&{NonFungibleToken.Provider, NonFungibleToken.Receiver}>,
        receiverPath: PublicPath
    ): @LockBox {
        return <- create LockBox(collection: collection, receiverPath: receiverPath)
    }

    init() {
        self.DefaultLockBoxStoragePath = /storage/NFTLockBox
        self.DefaultLockBoxPublicPath = /public/NFTLockBox
    }
}
