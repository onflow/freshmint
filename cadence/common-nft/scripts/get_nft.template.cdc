import {{ contractName }} from {{{ contractAddress }}}
import NonFungibleToken from {{{ imports.NonFungibleToken }}}
import MetadataViews from {{{ imports.MetadataViews }}}
import FreshmintMetadataViews from {{{ imports.FreshmintMetadataViews }}}

pub struct NFT {
    pub let id: UInt64

    pub let display: MetadataViews.Display
    pub let hash: String?
    
    init(
        id: UInt64,
        display: MetadataViews.Display,
        hash: String?
    ) {
        self.id = id
        self.display = display
        self.hash = hash
    }
}

pub fun main(address: Address, id: UInt64): NFT? {
    if let col = getAccount(address).getCapability<&{{ contractName }}.Collection{NonFungibleToken.CollectionPublic, {{ contractName }}.{{ contractName }}CollectionPublic}>({{ contractName }}.CollectionPublicPath).borrow() {
        if let nft = col.borrow{{ contractName }}(id: id) {

            let display = nft.resolveView(Type<MetadataViews.Display>())! as! MetadataViews.Display

            var hash: String? = nil

            if let blindNFTView = nft.resolveView(Type<FreshmintMetadataViews.BlindNFT>()) {
                let blindNFT = blindNFTView as! FreshmintMetadataViews.BlindNFT
                hash = String.encodeHex(blindNFT.metadataHash)
            }

            return NFT(
                id: id,
                display: display,
                hash: hash
            )
        }
    }

    return nil
}
