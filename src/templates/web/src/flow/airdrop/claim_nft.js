import * as fcl from "@onflow/fcl";
import { 
  ECPrivateKey, 
  ECSigner, 
  signatureAlgorithms, 
  hashAlgorithms 
} from "../crypto";
import BN from "bn.js"

import claim_nft from "../../../cadence/transactions/airdrop/claim_nft.cdc";
import replaceImports from "../replace-imports";

const rightPaddedHexBuffer = (value, pad) =>
  Buffer.from(value.padEnd(pad * 2, 0), "hex")

const USER_DOMAIN_TAG = rightPaddedHexBuffer(
  Buffer.from("FLOW-V0.0-user").toString("hex"), 
  32
)

function makeClaimMessage(address, id) {
  const idBn = new BN(id);
  const idBuffer = idBn.toArrayLike(Buffer, "be", 8)
  const addressBuffer = Buffer.from(fcl.sansPrefix(address), "hex")

  return Buffer.concat([USER_DOMAIN_TAG, addressBuffer, idBuffer])
}

function generateNFTClaim(address, nftId, privateKeyHex) {
  const privateKey = ECPrivateKey.fromHex(privateKeyHex, signatureAlgorithms.ECDSA_P256)

  const signer = new ECSigner(privateKey, hashAlgorithms.SHA3_256)

  const message = makeClaimMessage(address, nftId)

  const signature = signer.sign(message)

  return signature.toHex()
}

const claimNft = async (address, nftId, privateKey) => {
  const signature = generateNFTClaim(address, nftId, privateKey)

  return await fcl.mutate({
    cadence: replaceImports(claim_nft),
    limit: 500,
    args: (arg, t) => [
      arg(Number(nftId), t.UInt64),
      arg(signature, t.String)
    ]
  });
};

export default claimNft;
