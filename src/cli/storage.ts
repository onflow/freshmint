import * as fs from 'fs-extra';
import * as path from 'path';
import PouchDB from 'pouchdb';

PouchDB.plugin(require('pouchdb-find')); // eslint-disable-line  @typescript-eslint/no-var-requires

import * as models from './models';

export type KeyValuePairs = { [key: string]: any };

export default class Storage {
  private nfts: Database;
  private editions: Database;

  constructor(basePath: string, options?: { baseSelector: KeyValuePairs }) {
    const exists = fs.pathExistsSync(basePath);
    if (!exists) {
      fs.mkdirSync(basePath, { recursive: true });
    }

    this.nfts = new Database(path.resolve(basePath, 'nfts'), options?.baseSelector);
    this.editions = new Database(path.resolve(basePath, 'editions'), options?.baseSelector);
  }

  async saveEdition(edition: models.Edition): Promise<void> {
    await this.editions.insert(edition);
  }

  async loadEditionByHash(hash: string): Promise<models.Edition | null> {
    return await this.editions.get({ hash });
  }

  async saveNFT(nft: models.NFT): Promise<void> {
    await this.nfts.insert(nft);
  }

  async loadNFTByHash(hash: string): Promise<models.NFT | null> {
    return await this.nfts.get({ hash });
  }

  async loadNFTById(tokenId: string): Promise<models.NFT | null> {
    return await this.nfts.get({ tokenId });
  }

  async loadAllNFTs(): Promise<models.NFT[]> {
    const nfts = await this.nfts.all();

    return nfts.sort((a: models.NFT, b: models.NFT) => {
      return parseInt(a.tokenId, 10) - parseInt(b.tokenId, 10);
    });
  }
}

class Database {
  #db: PouchDB.Database<any>;
  #baseSelector: KeyValuePairs;

  constructor(name: string, baseSelector: KeyValuePairs = {}) {
    this.#db = new PouchDB(name);
    this.#baseSelector = baseSelector;
  }

  #applyBaseSelector(selector: KeyValuePairs): KeyValuePairs {
    return {
      ...this.#baseSelector,
      ...selector,
    };
  }

  async insert(value: KeyValuePairs) {
    // Creates a new document with an auto-generated _id
    return await this.#db.post(this.#applyBaseSelector(value));
  }

  async get(selector: KeyValuePairs) {
    const { docs } = await this.#db.find({ selector: this.#applyBaseSelector(selector) });

    if (docs.length === 0) {
      return null;
    }

    return docs[0];
  }

  async all() {
    const { docs } = await this.#db.find({ selector: this.#baseSelector });
    return docs;
  }
}
