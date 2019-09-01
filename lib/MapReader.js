const ISO8211Reader = require('./lib/ISO8211Reader');
const S57Chart = require('./lib/S57Chart');

function dump(obj) {
    console.log(JSON.stringify(obj, null, 2));
}

class MapReader {

    constructor(opts) {
        this.reader = new ISO8211Reader(opts.filename);
        this.chart = new S57Chart();
        this.opts = opts;
    }

    read() {
        try {
            this.reader.process(this.chart);
        } catch (ex) {
            dump(ex);
        } finally {
            delete this.chart.Nodes;
            if (this.opts.debug) {
                dump(this.chart);
            }
            return this.chart;
        }
    }
}

module.exports = MapReader;