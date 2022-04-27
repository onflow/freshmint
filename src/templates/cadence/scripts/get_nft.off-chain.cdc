import {{ name }} from "../contracts/{{ name }}.cdc"
import NonFungibleToken from "../contracts/NonFungibleToken.cdc"

pub struct NFT {
    pub let id: UInt64
    pub let owner: Address
    
    pub let metadata: String

    init(
        id: UInt64,
        owner: Address,
        metadata: String
    ) {
        self.id = id
        self.owner = owner
        self.metadata = metadata
    }
}

pub fun main(address: Address, id: UInt64): NFT? {
    if let col = getAccount(address).getCapability<&{{ name }}.Collection{NonFungibleToken.CollectionPublic, {{ name }}.{{ name }}CollectionPublic}>({{ name }}.CollectionPublicPath).borrow() {
        if let item = col.borrow{{ name }}(id: id) {
            return NFT(
                id: id,
                owner: address,
                metadata: item.metadata
            )
        }
    }

    return nil
}
