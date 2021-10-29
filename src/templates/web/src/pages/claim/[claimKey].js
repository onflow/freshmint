import getConfig from "next/config";
import useCurrentUser from "../../hooks/use-current-user";
import { useRouter } from "next/router";

import AirDrop from "../../components/AirDrop";
import DropImage from "../../components/DropImage";
import Header from "../../components/Header";

const { publicRuntimeConfig: { appName } } = getConfig();

export default function Claim() {
  const router = useRouter();

  const { claimKey } = router.query;

  const { privateKey, nftId } = parseClaimKey(claimKey);

  const user = useCurrentUser();

  return (
    <div className="flex flex-col h-screen">

      <Header user={user} />

      <div className="container h-full my-8 mx-auto">
        <div className="flex flex-col items-center justify-center">
          <h1 className="text-4xl mb-2 font-bold">Claim {appName} NFT</h1>
        </div>

        <div className="flex flex-col items-center pt-4">
          <DropImage />
          <AirDrop 
            nftId={nftId} 
            privateKey={privateKey} />
        </div>
        
      </div>
    </div>
  );
}

export async function getServerSideProps(context) {
  return {
    props: {}
  }
}

function parseClaimKey(claimKey) {
  const privateKey = claimKey.slice(0, 64);
  const nftId = claimKey.slice(64);
  return { privateKey, nftId }
}
