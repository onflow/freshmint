const PouchDB = require("pouchdb");
PouchDB.plugin(require("pouchdb-find"));

class DataStore {
  constructor() {
    this.db = null;
  }

  async init(name, options) {
    if (this._initialized) {
      return;
    }
    this.db = new PouchDB(name, options);
    this._initialized = true;
  }

  async find(selector) {
    const result = await this.db.find({ selector });
    return result.docs;
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
  async remove(key) {}
}

module.exports = DataStore;
