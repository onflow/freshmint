import claimNft from "../../flow/queue/claim_nft";
import * as fcl from "@onflow/fcl"
import { useState } from "react"
import { useRouter } from 'next/router'

import useQueueDrop from "../../hooks/use-queue-drop";
import QueueDropButton from "./QueueDropButton";
import QueueDropInfo from "./QueueDropInfo";

export default function QueueDrop({ dropAddress }) {
  const router = useRouter();

  const [status, setStatus] = useState({ isLoading: false, error: "" });

  async function claim() {
    setStatus({ isLoading: true });

    let txId;

    try {
      txId = await claimNft(dropAddress);
    } catch(err) {
      setStatus({ isLoading: false, error: err });
      return
    }

    fcl.tx(txId).subscribe((tx) => {
      if (tx.errorMessage) {
        setStatus({ isLoading: false, error: tx.errorMessage });
        return
      }

      if (fcl.tx.isSealed(tx)) {
        const event = tx.events.find((e) => e.type.includes("NFTQueueDrop.Claimed"));
        const nftId = event.data.nftID;

        fcl.currentUser().snapshot().then((user) => {
          router.push(`/${user.addr}/nft/${nftId}`);
        })
      }
    })
  }

  const drop = useQueueDrop(dropAddress, status.isLoading);

  if (drop.loading) {
    return null;
  }

  const isInactive = !!drop.notFound;
  const isSoldOut = drop.supply === 0 || drop.status === "closed";
  const supply = drop.status === "closed" ? 0 : drop.supply;
  const price = parseFloat(drop.price);
  const size = drop.size;

  return (
    <>
      <QueueDropButton
        onClick={() => claim()}
        price={price}
        isInactive={isInactive}
        isSoldOut={isSoldOut}
        isLoading={status.isLoading} 
        error={status.error} />
      {!isInactive && 
        <QueueDropInfo 
          supply={supply} 
          size={size} />}
    </>
  );
}
