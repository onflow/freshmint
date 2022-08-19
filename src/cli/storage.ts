import PouchDB from 'pouchdb';

PouchDB.plugin(require('pouchdb-find')); // eslint-disable-line  @typescript-eslint/no-var-requires

import * as models from './models';

export class Storage {
  private nfts: Database;
  private editions: Database;

  constructor() {
    this.nfts = new Database('nfts');
    this.editions = new Database('editions');
  }

  async saveEdition(edition: models.Edition): Promise<void> {
    await this.editions.save(edition);
  }

  async loadEditionByHash(hash: string): Promise<models.Edition | null> {
    const results = await this.editions.find({ hash });

    if (results.length === 0) {
      return null;
    }

    return results[0];
  }

  async saveNFT(nft: models.NFT): Promise<void> {
    await this.nfts.save(nft);
  }

  async loadNFTByHash(hash: string): Promise<models.NFT | null> {
    const results = await this.nfts.find({ hash });

    if (results.length === 0) {
      return null;
    }

    return results[0];
  }

  async loadNFTById(tokenId: string): Promise<models.NFT | null> {
    const results = await this.nfts.find({ tokenId });

    if (results.length === 0) {
      return null;
    }

    return results[0];
  }

  async loadAllNFTs(): Promise<models.NFT[]> {
    return await this.nfts.all();
  }
}

export class Database {
  db: PouchDB.Database<any>;

  constructor(name: string, options?: PouchDB.AdapterWebSql.Configuration) {
    this.db = new PouchDB(name, options);
  }

  async find(selector: any) {
    const result = await this.db.find({ selector });
    return result.docs;
  }

  async all() {
    const result = await this.db.allDocs({
      include_docs: true,
      attachments: true,
    });

    return result.rows
      .map((row) => row.doc)
      .sort((a: any, b: any) => {
        return parseInt(a.tokenId, 10) - parseInt(b.tokenId, 10);
      });
  }

  async save(value: any) {
    // Creates a new document with an auto-generated _id
    return await this.db.post(value);
  }

  async update(selector: any, value: any) {
    const result = await this.db.find({ selector });

    if (!result.docs.length) {
      console.error(`No document found for selector ${selector}`);
      return null;
    }

    const doc: any = result.docs[0];
    const keys = Object.keys(value);

    for (const key of keys) {
      doc[key] = value[key];
    }

    return await this.db.put(doc);
  }
}
