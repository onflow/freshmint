import getConfig from "next/config";
import Link from 'next/link'

import AuthCluster from "./AuthCluster";

const { publicRuntimeConfig: { appName } } = getConfig();

export default function Header({ user }) {
  return (
    <header className="flex items-center h-16 p-3 border-b">
      <div className="container flex flex-row items-center mx-auto">
        <div className="flex-grow">
          <Link href="/">
            <a>{appName} NFT Drop</a>
          </Link>
        </div>
        <AuthCluster user={user} />
      </div>
    </header>
  );
}
