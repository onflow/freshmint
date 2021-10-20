import { FaGithub } from "react-icons/fa";

export default function Home() {
  return (
    <div className="h-screen">
      <div className="fixed w-full">
        <div className="flex justify-center px-4 py-4 space-x-6 py-6w-full bg-gradient-to-r from-green-100 to-transparent">
          <a href="https://github.com/onflow/freshmint/docs">Documentation</a>
          <a
            className="flex items-center space-x-1 font-sanscursor-pointer"
            href="https://github.com/onflow/freshmint"
          >
            <span>Github</span> <FaGithub />
          </a>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center bg-cover gradient h-4/6">
        <div className="pb-10 text-8xl">🌿</div>
        <div className="font-serif text-8xl">
          <h1>Freshmint <div className="pb-10 text-sm text-right">alpha</div></h1>
        </div>
        <div className="text-2xl text-gray-600">
          The minty fresh way to build NFT Apps on Flow
        </div>
        <div>
          <div className="p-10 py-8 my-20 font-mono text-gray-100 bg-gray-800 rounded-md shadow-2xl">
            npm i -g @onflow/freshmint
          </div>
        </div>
      </div>
      <div className="flex justify-center w-ful">
        <div className="-mt-20 bg-gray-200 shadow-xl w-youtube h-youtube"></div>
      </div>
      <div className="flex justify-center py-20 pb-10">
         <h3 className="text-2xl"> Build cool stuff using cool stuff </h3>
      </div>
      <div className="flex justify-center w-full pt-10 pb-40 space-x-20">
        <div className="h-24">
          <img className="max-w-full max-h-full" src="/images/flow.png"></img>
        </div>
        <div className="h-24">
          <img className="max-w-full max-h-full" src="/images/nftstorage.png"></img>
        </div>
        <div className="h-24">
          <img className="max-w-full max-h-full" src="/images/ipfs.png"></img>
        </div>
        <div className="h-24">
          <img className="max-w-full max-h-full" src="/images/filecoin.png"></img>
        </div>
      </div>
    </div>
  );
}
