// @ts-ignore
import { NFTStorage } from 'nft.storage';
import { createObjectCsvWriter as createCsvWriter } from 'csv-writer';

import FlowMinter from './flow';
import IPFS from './ipfs';
import { Config } from './config';
import { Minter, createMinter } from './minters';
import { Storage } from './storage';

export default class Fresh {
  network: string;
  config: Config;
  flowMinter: FlowMinter;
  storage: Storage;
  minter: Minter;

  constructor(network: string) {
    this.network = network;

    this.config = Config.load();

    this.flowMinter = new FlowMinter(this.network);

    this.storage = new Storage();

    const ipfsClient = new NFTStorage({
      token: this.config.ipfsPinningService.key,
      endpoint: new URL(this.config.ipfsPinningService.endpoint),
    });

    const ipfs = new IPFS(ipfsClient);

    this.minter = createMinter(this.config.contract, this.config.nftAssetPath, ipfs, this.flowMinter, this.storage);
  }

  //////////////////////////////////////////////
  // ------ Deployment
  //////////////////////////////////////////////

  async deployContracts() {
    await this.flowMinter.deployContracts();
  }

  //////////////////////////////////////////////
  // ------ NFT Creation
  //////////////////////////////////////////////

  async createNFTsFromCSVFile(
    csvPath: string,
    withClaimKey: boolean,
    onStart: (total: number, skipped: number, batchCount: number, batchSize: number) => void,
    onBatchComplete: (batchSize: number) => void,
    onError: (error: Error) => void,
    batchSize = 10,
  ) {
    await this.minter.mint(csvPath, withClaimKey, onStart, onBatchComplete, onError, batchSize);
  }

  //////////////////////////////////////////////
  // -------- NFT Retreival
  //////////////////////////////////////////////

  async getNFT(tokenId: string) {
    const nft = await this.storage.loadNFTById(tokenId);

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
