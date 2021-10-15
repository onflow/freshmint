import Hash from "ipfs-only-hash";
import CID from "cids";

function readFile(file) {
  return new Promise((resolve, reject) => {
    // Create file reader
    let reader = new FileReader();

    // Register event listeners
    reader.addEventListener("loadend", (e) => resolve(e.target.result));
    reader.addEventListener("error", reject);

    // Read file
    reader.readAsArrayBuffer(file);
  });
}

export async function getAsByteArray(file) {
  return new Uint8Array(await readFile(file));
}

export const fileToBase64 = async (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (e) => reject(e);
  });

export const makeIPFSURI = async (file) => {
  const data = await file.arrayBuffer();
  const hash = await Hash.of(Buffer.from(data), {
    onlyHash: true,
    cidVersion: 1,
    rawLeaves: true
  });
  return "ipfs://" + hash;
};

export const makeV1Hash = (hash) => {
  return new CID(hash).toV1().toString("base32");
};

export const toJSON = (obj) => {
  return JSON.stringify(obj, null, 2);
};
