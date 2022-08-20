import { Authorizer, Config } from '@fresh-js/core';
import NFTCollection from '../collections/NFTCollection';
import { ClaimSaleContract } from '../contracts/ClaimSaleContract';
import { FlowClient } from '../client';

export class ClaimSale {
  config: Config;
  client: FlowClient;
  sale: ClaimSaleContract;

  constructor(collection: NFTCollection) {
    this.config = collection.config;
    this.client = collection.client;
    this.sale = new ClaimSaleContract(collection.contract);
  }

  async getContract(): Promise<string> {
    return this.sale.getSource(this.config.contracts);
  }

  async start({ id, price, bucket }: { id: string; price: string; bucket?: string }): Promise<void> {
    return this.client.send(this.sale.start({ id, price, bucket }));
  }

  async stop(id: string): Promise<void> {
    return this.client.send(this.sale.stop(id));
  }

  async claimNFT(saleAddress: string, authorizer: Authorizer, saleId: string): Promise<string> {
    return this.client.send(this.sale.claimNFT(saleAddress, authorizer, saleId));
  }
}
