import {{ contractName }} from {{{ contractAddress }}}

import FungibleToken from {{{ imports.FungibleToken }}}
import MetadataViews from {{{ imports.MetadataViews }}}

transaction(
    royaltyAddresses: [Address],
    royaltyReceiverPaths: [PublicPath],
    royaltyCuts: [UFix64],
    royaltyDescriptions: [String]
) {
    
    let admin: &{{ contractName }}.Admin

    prepare(signer: AuthAccount) {
        self.admin = signer.borrow<&{{ contractName }}.Admin>(from: {{ contractName }}.AdminStoragePath)
            ?? panic("Could not borrow a reference to the NFT admin")
    }
    
    execute {
    
        let royalties: [MetadataViews.Royalty] = []

        for i, recipientAddress in royaltyAddresses {
            let receiverPath = royaltyReceiverPaths[i]
            let cut = royaltyCuts[i]
            let description = royaltyDescriptions[i]

            let receiver = getAccount(recipientAddress)
                .getCapability<&{FungibleToken.Receiver}>(receiverPath)

            let royalty = MetadataViews.Royalty(
                receiver: receiver,
                cut: cut, 
                description: description
            )

            royalties.append(royalty)
        }

        self.admin.setRoyalties(royalties)
    }
}
