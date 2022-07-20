import {{ name }} from "../../contracts/{{ name }}.cdc"
import NFTQueueDrop from "../../contracts/NFTQueueDrop.cdc"

transaction {
    
    prepare(signer: AuthAccount) {

        signer.unlink(NFTQueueDrop.DropPublicPath)

        signer.load(<- drop, to: NFTQueueDrop.DropStoragePath)

        let drop <- signer.load<@NFTQueueDrop.Drop>(from: NFTQueueDrop.DropStoragePath)

        destroy drop
    }
}
