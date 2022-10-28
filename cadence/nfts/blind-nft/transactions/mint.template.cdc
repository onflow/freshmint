import {{ contractName }} from {{{ contractAddress }}}

import NonFungibleToken from {{{ imports.NonFungibleToken }}}
import FreshmintQueue from {{{ imports.FreshmintQueue }}}

transaction(hashes: [String]) {
    
    let admin: &{{ contractName }}.Admin
    let mintQueue: &FreshmintQueue.CollectionQueue

    prepare(signer: AuthAccount) {
        self.admin = signer.borrow<&{{ contractName }}.Admin>(from: {{ contractName }}.AdminStoragePath)
            ?? panic("Could not borrow a reference to the NFT admin")
        
        self.mintQueue = signer
            .getCapability<&FreshmintQueue.CollectionQueue>({{ contractName }}.QueuePrivatePath)
            .borrow()
            ?? panic("Could not borrow a reference to the mint queue")
    }

    execute {
        for hash in hashes {
            let token <- self.admin.mintNFT(hash: hash.decodeHex())

            // NFTs are minted into a queue to preserve the mint order.
            // A CollectionQueue is linked to a collection. All NFTs minted into 
            // the queue are deposited into the underlying collection.
            //
            self.mintQueue.deposit(token: <- token)
        }
    }
}
