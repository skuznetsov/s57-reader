const ISO8211Reader = require('./ISO8211Reader');
const S57Chart = require('./S57Chart');

function dump(obj) {
    console.log(JSON.stringify(obj, null, 2));
}

class MapReader {

    constructor(opts) {
        this.reader = new ISO8211Reader(opts.filename);
        this.chart = new S57Chart(opts);
        this.opts = opts;
    }

    read(layers) {
        layers = layers || [];
        try {
            this.reader.process(this.chart);
        } catch (ex) {
            dump(ex);
        } finally {
            delete this.chart.Nodes;
            if (layers.length > 0) {
                Object.keys(this.chart.Features).filter(feature => !layers.includes(feature)).forEach(feature =>{ 
                    delete this.chart.Features[feature];
                });
            }
            if (this.opts.debug) {
                dump(this.chart);
            }
            return this.chart;
        }
    }
}

module.exports = MapReader;