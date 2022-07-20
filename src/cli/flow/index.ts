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

  async setupAccount() {
    return await this.flow.transaction(
      "./cadence/transactions/setup_account.cdc",
      `${this.network}-account`,
      []
    );
  }

  async fundAccount(address: string, amount: string = "10.0") {
    await this.flow.transaction(
      "./cadence/transactions/setup_flowtoken.cdc",
      `${this.network}-account`,
      []
    );

    await this.flow.transaction(
      "./cadence/transactions/fund_account.cdc",
      `${this.network}-account`,
      [
        { type: t.UFix64, value: amount },
        { type: t.Address, value: address }
      ]
    );
    return amount;
  }

  async mint(fields: any[]) {  
    return await this.flow.transaction(
      "./cadence/transactions/mint.cdc",
      `${this.network}-account`,
      fields.map(field => ({
        type: t.Array(field.type.cadenceType), 
        value: field.values.map(field.type.toArgument)
      }))
    );
  }

  async mintWithClaimKey(publicKeys: string[], fields: any[]) {
    const args = [
      { type: t.Array(t.String), value: publicKeys },
      ...fields.map(field => ({
        type: t.Array(field.type.cadenceType), 
        value: field.values.map(field.type.toArgument)
      }))
    ]

    return await this.flow.transaction(
      "./cadence/transactions/airdrop/mint.cdc",
      `${this.network}-account`,
      args,
    );
  }

  async startQueueDrop(price: string) {
    return await this.flow.transaction(
      "./cadence/transactions/queue/start_drop.cdc",
      `${this.network}-account`,
      [{ type: t.UFix64, value: price }]
    );
  }

  async removeQueueDrop() {
    return await this.flow.transaction(
      "./cadence/transactions/queue/remove_drop.cdc",
      `${this.network}-account`,
      []
    );
  }

  async removeAirDrop() {
    return await this.flow.transaction(
      "./cadence/transactions/airdrop/remove_drop.cdc",
      `${this.network}-account`,
      []
    );
  }

  async transfer(recipient: string, nftId: string) {
    // TODO
  }

  async getNFTDetails(address: string, nftId: string) {
    return await this.flow.script("./cadence/scripts/get_nft.cdc", [
      { type: t.Address, value: address },
      { type: t.UInt64, value: Number(nftId) }
    ]);
  }
}

module.exports = FlowMinter;
