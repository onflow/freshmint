import {{ name }} from "../contracts/{{ name }}.cdc"
import NonFungibleToken from "../contracts/NonFungibleToken.cdc"

pub struct NFT {
    pub let id: UInt64
    pub let owner: Address
    
    pub let name: String
    pub let description: String
    pub let image: String

    init(
        id: UInt64,
        owner: Address,
        name: String,
        description: String,
        image: String
    ) {
        self.id = id
        self.owner = owner
        self.name = name
        self.description = description
        self.image = image
    }
}

pub fun main(address: Address, id: UInt64): NFT? {
    if let col = getAccount(address).getCapability<&{{ name }}.Collection{NonFungibleToken.CollectionPublic, {{ name }}.{{ name }}CollectionPublic}>({{ name }}.CollectionPublicPath).borrow() {
        if let item = col.borrow{{ name }}(id: id) {
            return NFT(
                id: id,
                owner: address,
                name: item.name,
                description: item.description,
                image: item.image
            )
        }
    }

    return nil
}
