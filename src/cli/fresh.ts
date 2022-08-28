import { createObjectCsvWriter as createCsvWriter } from 'csv-writer';

import { Config } from './config';
import Storage from './storage';

export default class Fresh {
  config: Config;
  network: string;

  storage: Storage;

  constructor(config: Config, network: string) {
    this.config = config;
    this.network = network;

    this.storage = new Storage('freshdb', { baseSelector: { network: this.network } });
  }

  async getNFT(tokenId: string) {
    // TODO: display user-friendly message if token not found
    const nft = await this.storage.loadNFTById(tokenId);

    if (!nft) {

    }

    return {
      id: tokenId,
      metadata: nft.metadata,
    };
  }

  async dumpNFTs(csvPath: string) {
    const nfts = await this.storage.loadAllNFTs();

    if (nfts.length === 0) {
      return 0;
    }

    const firstNft = nfts[0];

    const metadataHeaders = Object.keys(firstNft.metadata).map((key) => {
      return { id: key, title: key };
    });

    const csvWriter = createCsvWriter({
      path: csvPath,
      header: [
        { id: 'tokenID', title: 'token_id' },
        ...metadataHeaders,
        { id: 'transactionID', title: 'transaction_id' },
        { id: 'claimKey', title: 'claim_key' },
      ],
    });

    const records = nfts.map((nft: any) => {
      return {
        tokenID: nft.tokenId,
        ...nft.metadata,
        transactionID: nft.txId,
        claimKey: nft.claimKey,
      };
    });

    await csvWriter.writeRecords(records);

    return nfts.length;
  }
}
