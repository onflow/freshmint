const FlowCliWrapper = require("./cli");
const t = require("@onflow/types");

class FlowMinter {
  constructor(network) {
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

  async fundAccount(address, amount) {
    amount = amount || "10.0";

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

  async mint(metadata) {
    return await this.flow.transaction(
      "./cadence/transactions/mint.cdc",
      `${this.network}-account`,
      [
        { type: t.String, value: metadata },
      ]
    );
  }

  async mintWithClaimKey(metadata, publicKey) {
    return await this.flow.transaction(
      "./cadence/transactions/airdrop/mint.cdc",
      `${this.network}-account`,
      [
        { type: t.String, value: metadata },
        { type: t.String, value: publicKey }
      ]
    );
  }

  async startQueueDrop(price) {
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

  async transfer(recipient, itemID) {
    // TODO
  }

  async getNFTDetails(address, nftId) {
    return await this.flow.script("./cadence/scripts/get_nft.cdc", [
      { type: t.Address, value: address },
      { type: t.UInt64, value: Number(nftId) }
    ]);
  }
}

module.exports = FlowMinter;
