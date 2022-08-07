// @ts-ignore
import * as t from "@onflow/types";

import FlowCliWrapper from "./cli";

export default class FlowMinter {

  network: string;
  flow: FlowCliWrapper;

  constructor(network: string) {
    this.network = network || "emulator";
    this.flow = new FlowCliWrapper(this.network);
  }

  async deployContracts() {
    await this.flow.deploy();
  }

  async mint(fields: any[]) {  
    return await this.flow.transaction(
      "./cadence/transactions/mint.cdc",
      `${this.network}-account`,
      fields.map(field => ({
        type: t.Array(field.cadenceType), 
        value: field.values
      }))
    );
  }

  async mintWithClaimKey(publicKeys: string[], fields: any[]) {
    const args = [
      { type: t.Array(t.String), value: publicKeys },
      ...fields.map(field => ({
        type: t.Array(field.cadenceType), 
        value: field.values
      }))
    ]

    return await this.flow.transaction(
      "./cadence/transactions/airdrop/mint.cdc",
      `${this.network}-account`,
      args,
    );
  }

  async getNFTDetails(address: string, nftId: string) {
    return await this.flow.script("./cadence/scripts/get_nft.cdc", [
      { type: t.Address, value: address },
      { type: t.UInt64, value: Number(nftId) }
    ]);
  }
}

module.exports = FlowMinter;
