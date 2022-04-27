const PouchDB = require("pouchdb");
PouchDB.plugin(require("pouchdb-find"));

class DataStore {
  
  constructor(name, options) {
    this.db = new PouchDB(name, options)
  }

  async find(selector) {
    const result = await this.db.find({ selector });
    return result.docs;
  }

  async all() {
    const result = await this.db.allDocs({
      include_docs: true,
      attachments: true
    });

    return result.rows
      .map(row => row.doc)
      .sort((a, b) => {
        return parseInt(a.tokenId, 10) - parseInt(b.tokenId, 10);
      })
  }

  async save(value) {
    // Creates a new document with an auto-generated _id
    return await this.db.post(value);
  }

  async update(selector, value) {
    const result = await this.db.find({ selector });
    if (!result.docs.length) {
      console.log(`No document found for selector ${selector}`);
      return null;
    }
    const doc = result.docs[0];
    const keys = Object.keys(value);
    for (const key of keys) {
      doc[key] = value[key];
    }

    return await this.db.put(doc);
  }
}

module.exports = DataStore;
