import * as fcl from "@onflow/fcl";

import claim_nft from "../../../cadence/transactions/queue/claim_nft.cdc";
import replaceImports from "../replace-imports";

const claimNft = async (dropAddress) => {
  return await fcl.mutate({
    cadence: replaceImports(claim_nft),
    limit: 500,
    args: (arg, t) => [
      arg(dropAddress, t.Address),
    ]
  });
};

export default claimNft;
