import {{ name }} from "../../contracts/{{ name }}.cdc"
import NFTQueueDrop from "../../contracts/NFTQueueDrop.cdc"

pub struct Drop {

    pub let price: UFix64
    pub let size: Int
    pub let supply: Int
    pub let status: String

    init(price: UFix64, size: Int, supply: Int, status: NFTQueueDrop.DropStatus) {
        self.price = price
        self.size = size
        self.supply = supply
        self.status = getStatus(status)
    }
}

pub fun getStatus(_ status: NFTQueueDrop.DropStatus): String {
    switch status {
    case NFTQueueDrop.DropStatus.paused:
        return "paused"
    case NFTQueueDrop.DropStatus.closed:
        return "closed"
    }

    return "open"
}

pub fun main(address: Address): Drop? {
    let dropCapability = getAccount(address)
        .getCapability(NFTQueueDrop.DropPublicPath)

    if let drop = dropCapability.borrow<&{NFTQueueDrop.DropPublic}>() {
        return Drop(
            price: drop.price, 
            size: drop.size, 
            supply: drop.supply(), 
            status: NFTQueueDrop.DropStatus.open,
        )
    }

    return nil
}
