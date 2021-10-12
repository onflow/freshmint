import getConfig from "next/config";

const { publicRuntimeConfig } = getConfig();

export default function replaceImports(src) {
  return src
    .replace(
      '"../contracts/NonFungibleToken.cdc"',
      publicRuntimeConfig.nonFungibleTokenAddress
    )
    .replace(
      '"../contracts/FungibleToken.cdc"',
      publicRuntimeConfig.fungibleTokenAddress
    )
    .replace(
      '"../contracts/FlowToken.cdc"',
      publicRuntimeConfig.flowTokenAddress
    )
    .replace(
      '"../contracts/OpenSeaCompat.cdc"',
      publicRuntimeConfig.projectNFTContract
    );
}
