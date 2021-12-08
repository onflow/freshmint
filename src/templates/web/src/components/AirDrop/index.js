import * as fcl from "@onflow/fcl";
import { useState } from "react";
import { useRouter } from "next/router";
import useCurrentUser from "../../hooks/use-current-user";
import claimNft from "../../flow/airdrop/claim_nft";

import AirDropButton from "./AirDropButton";

export default function AirDrop({ dropAddress, nftId, privateKey }) {
  const router = useRouter();

  const user = useCurrentUser();

  const [status, setStatus] = useState({ isLoading: false, error: "" });

  async function claim() {
    setStatus({ isLoading: true });

    let txId;

    try {
      txId = await claimNft(dropAddress, user.addr, nftId, privateKey);
    } catch (err) {
      setStatus({ isLoading: false, error: err });
      return;
    }

    fcl.tx(txId).subscribe((tx) => {
      if (tx.errorMessage) {
        setStatus({ isLoading: false, error: tx.errorMessage });
        return;
      }

      if (fcl.tx.isSealed(tx)) {
        const event = tx.events.find((e) =>
          e.type.includes("NFTAirDrop.Claimed")
        );

        const nftId = event.data.nftID;

        fcl
          .currentUser()
          .snapshot()
          .then((user) => {
            router.push(`/${user.addr}/nft/${nftId}`);
          });
      }
    });
  }

  return (
    <>
      <AirDropButton
        onClick={() => claim()}
        nftId={nftId}
        isLoading={status.isLoading}
        error={status.error}
      />
    </>
  );
}
