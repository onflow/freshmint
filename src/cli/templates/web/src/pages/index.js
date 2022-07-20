import getConfig from "next/config";
import useCurrentUser from "../hooks/use-current-user";

import Header from "../components/Header";
import DropImage from "../components/DropImage";
import QueueDrop from "../components/QueueDrop";

const { publicRuntimeConfig: { appName, projectAdminAddress} } = getConfig();

export default function Home() {

  const user = useCurrentUser();

  return (
    <div className="flex flex-col h-screen">

      <Header user={user} />

      <div className="container h-full my-8 mx-auto">
        <div className="flex flex-col items-center justify-center">
          <h1 className="text-4xl mb-2 font-bold">{appName} NFT Drop</h1>
          <p className="text-gray-700">Welcome to the {appName} NFT drop web app</p>
        </div>

        <div className="flex flex-col items-center pt-4">
          <DropImage />
          <QueueDrop dropAddress={projectAdminAddress} />
        </div>
        
      </div>
    </div>
  );
}
