import * as fcl from "@onflow/fcl";

import get_drop from "../../../cadence/scripts/queue/get_drop.cdc";
import replaceImports from "../replace-imports";

const getDrop = async (dropAddress) => {
  return await fcl.query({
    cadence: replaceImports(get_drop),
    args: (arg, t) => [
      arg(dropAddress, t.Address),
    ]
  });
};

export default getDrop;
