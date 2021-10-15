import getConfig from "next/config";
import * as fcl from "@onflow/fcl";
import { NFTStorage, Blob } from "nft.storage";
import mint from "../../cadence/transactions/mint.cdc";
import replaceImports from "./replace-imports";

const { publicRuntimeConfig } = getConfig();

const mintNft = async (metadata, files) => {
  const client = new NFTStorage({
    token: publicRuntimeConfig.pinningServiceKey
  });

  metadata = JSON.parse(metadata);

  const image = await files[0].arrayBuffer();
  const bufData = Buffer.from(image);
  const imageCID = await client.storeBlob(new Blob([bufData]));

  metadata.image = "ipfs://" + imageCID;

  const metadataCID = await client.storeBlob(
    new Blob([Buffer.from(JSON.stringify(metadata))])
  );

  const metadataAddress = "ipfs://" + metadataCID;

  return await fcl.mutate({
    cadence: replaceImports(mint),
    args: (arg, t) => [
      arg(publicRuntimeConfig.projectNFTContract, t.Address),
      arg(metadataAddress, t.String)
    ],
    limit: 500
  });
};

export default mintNft;
