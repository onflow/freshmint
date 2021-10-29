import * as fcl from "@onflow/fcl";

import get_drop from "../../../cadence/scripts/queue/get_drop.cdc";
import replaceImports from "../replace-imports";

const getDrop = async (address) => {
  return await fcl.query({
    cadence: replaceImports(get_drop),
    args: (arg, t) => [
      arg(address, t.Address),
    ]
  });
};

export default getDrop;
