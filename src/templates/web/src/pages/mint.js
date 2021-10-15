import { useState, useEffect, useRef } from "react";
import * as fcl from "@onflow/fcl";
import getConfig from "next/config";
import { Button } from "../components/DropButton";
import Header from "../components/Header";
import useCurrentUser from "../hooks/use-current-user";
import { useDropzone } from "react-dropzone";
import Editor from "@monaco-editor/react";

import mintNFT from "../flow/mint";
import { makeIPFSURI, toJSON } from "../helpers";

export default function NFTDetails() {
  const { publicRuntimeConfig } = getConfig();
  const user = useCurrentUser();
  const isAdmin = user.addr === publicRuntimeConfig.projectNFTContract;

  const [status, setStatus] = useState({ isLoading: false, error: "" });
  const [files, setFiles] = useState([]);
  const [metadata, setMetadata] = useState(
    toJSON({
      image: "This will be filled automatically when you add an image.",
      name: "",
      description: ""
    })
  );

  useEffect(
    () => () => {
      // Make sure to revoke the data uris to avoid memory leaks
      files.forEach((file) => URL.revokeObjectURL(file.preview));
    },
    [files]
  );

  const { getRootProps, getInputProps } = useDropzone({
    maxFiles: 1,
    validator: (file) => {
      // TODO: validate file
      return null;
    },
    onDrop: async (acceptedFiles) => {
      const file = acceptedFiles[0];
      const imageURI = await makeIPFSURI(file);
      setMetadata(
        toJSON({
          ...JSON.parse(metadata),
          image: imageURI
        })
      );
      setFiles(
        acceptedFiles.map((f) =>
          Object.assign(f, {
            preview: URL.createObjectURL(f)
          })
        )
      );
    }
  });

  async function mint() {
    setStatus({ isLoading: true });

    let txId;

    try {
      txId = await mintNFT(metadata, files);
    } catch (err) {
      setStatus({ isLoading: false, error: err });
      return;
    }

    fcl.tx(txId).subscribe((tx) => {
      if (tx.errorMessage) {
        setStatus({ isLoading: false, error: tx.errorMessage });
        return;
      }
    });

    const result = await fcl.tx(txId).onceSealed();
    setStatus({ isLoading: false, error: "" });
    console.log("%cTransaction success!", "color: limegreen;");
    console.log(JSON.stringify(result.events, null, 2));
  }

  const thumb = files.map((file) => (
    <div
      key={file.name}
      className="w-full h-full flex flex-col items-center justify-center"
    >
      <img src={file.preview} className="max-w-full" />
    </div>
  ));

  return (
    <div>
      <Header user={user} />

      <div className="container mx-auto">
        <div className="flex flex-col items-center py-20">
          {isAdmin ? (
            <>
              <div className="w-full pb-10 grid grid-cols-2 gap-4 h-80">
                {files.length ? (
                  thumb
                ) : (
                  <section className="h-full flex flex-col items-center justify-center border-2 border-dashed">
                    <div {...getRootProps({ className: "dropzone" })}>
                      <input {...getInputProps()} />
                      <p>
                        Drag 'n' drop an image here, or click to select a file
                      </p>
                    </div>
                  </section>
                )}
                <section>
                  <Editor
                    className="resize-y border rounded-md w-full h-80 "
                    defaultLanguage="json"
                    value={metadata}
                    onChange={(metadata) => setMetadata(metadata)}
                    options={{
                      minimap: { enabled: false }
                    }}
                  />
                </section>
              </div>
              <div className="w-full pb-10 grid grid-cols-2 gap-4">
                <p className="text-center pt-4">Image file (required)</p>
                <p className="text-center pt-4">Metadata JSON</p>
              </div>
              <Button
                onClick={mint}
                disabled={
                  !isAdmin || !metadata || !files.length || status.isLoading
                }
                color={`bg-black`}
                type="button"
              >
                {status.isLoading ? (
                  <div className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Minting...
                  </div>
                ) : (
                  "MintNFT"
                )}
              </Button>
              <p className="pt-4 color-red">{status.error}</p>
              <p className="w-80 pt-10 pb-4 text-center">
                Use this button to mint additional NFTs.
              </p>{" "}
              <p className="w-100 text-center">
                NFTs minted here will have their metadata pinned to IPFS
                immediately
              </p>{" "}
              <p className="w-100 text-center pt-4">
                Examine the result using{" "}
                <strong>fresh inspect {`<token-id>`}</strong>
              </p>
            </>
          ) : (
            "Please log in as admin to mint NFTs"
          )}
        </div>
      </div>
    </div>
  );
}
