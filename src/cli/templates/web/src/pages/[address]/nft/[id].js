import Header from "../../../components/Header";
import NFT from "../../../components/NFT";

import { useRouter } from "next/router";
import useNFT from "../../../hooks/use-nft";
import useCurrentUser from "../../../hooks/use-current-user";

export default function NFTDetails() {
  const router = useRouter();
  const { address, id } = router.query;

  const user = useCurrentUser()

  const nft = useNFT(address, id);

  return (
    <div>
      <Header user={user} />

      <div className="container mx-auto">
        <div className="flex flex-col items-center py-20">
          {nft.loading ? "Loading..." : <NFT nft={nft} />}
        </div>
      </div>
    </div>
  );
}
