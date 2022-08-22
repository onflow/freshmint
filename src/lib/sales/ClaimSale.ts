import { LegacyFreshmintConfig } from '../config';
import { FreshmintClient } from '../client';
import { ClaimSaleContract } from '../contracts/ClaimSaleContract';
import NFTCollection from '../collections/NFTCollection';
import { TransactionAuthorizer } from '../transactions';

export class ClaimSale {
  config: LegacyFreshmintConfig;
  client: FreshmintClient;
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

  async claimNFT(saleAddress: string, authorizer: TransactionAuthorizer, saleId: string): Promise<string> {
    return this.client.send(this.sale.claimNFT(saleAddress, authorizer, saleId));
  }
}
