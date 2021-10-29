import getConfig from "next/config";

const { publicRuntimeConfig } = getConfig();

export default function replaceImports(src) {
  return src
    .replace(
      /\".*NonFungibleToken\.cdc\"/,
      publicRuntimeConfig.nonFungibleTokenAddress
    )
    .replace(
      /\".*FungibleToken\.cdc\"/,
      publicRuntimeConfig.fungibleTokenAddress
    )
    .replace(
      /\".*FlowToken\.cdc\"/,
      publicRuntimeConfig.flowTokenAddress
    )
    .replace(
      /\".*{{ name }}\.cdc\"/,
      publicRuntimeConfig.projectContractAddress
    )
    .replace(
      /\".*NFTAirDrop\.cdc\"/,
      publicRuntimeConfig.projectContractAddress
    )
    .replace(
      /\".*NFTQueueDrop\.cdc\"/,
      publicRuntimeConfig.projectContractAddress
    );
}
