const ISO8211Reader = require('./ISO8211Reader');
const Catalog = require('./Catalog');

function dump(obj) {
    console.log(JSON.stringify(obj, null, 2));
}

class CatalogReader {
    constructor(opts) {
        this.reader = new ISO8211Reader('data/ENC_ROOT/CATALOG.031');
        this.catalog = new Catalog(opts);
        this.opts = opts;
    }

    async read() {
        try {
            await this.reader.process(this.catalog);
            this.catalog.normalize();
        } catch (ex) {
            dump(ex);
        } finally {
            if (this.opts.debug) {
                // dump(this.catalog);
            }
            delete this.catalog.records;
            return this.catalog;
        }
    }
}

module.exports = CatalogReader;