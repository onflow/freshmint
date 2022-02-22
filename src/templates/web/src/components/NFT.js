import { toGatewayURL } from "nft.storage"

export default function NFT({ nft }) {
  const imageURL = toGatewayURL(`ipfs://${nft.image}`)

  return (
    <div className="w-80 border rounded-b-lg">
      <img
        className="w-full"
        src={imageURL} 
        alt={nft.description} />
      <div className="p-4">
        <h2 className="text-xl font-medium mb-2">
          {nft.name}
          &nbsp;<span className="text-gray-500">#{nft.id}</span>
        </h2>
        <p className="text-gray">{nft.description}</p>
      </div>
    </div>
  )
}
