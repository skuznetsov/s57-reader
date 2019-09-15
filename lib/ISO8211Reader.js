const fs = require('fs').promises;
const ByteReader = require('./ISO8211Reader/ByteReader');
const DataRecord = require('./ISO8211Reader/DataRecord');
const LeadRecord = require('./ISO8211Reader/LeadRecord');

class ISO8211Reader {
    constructor (filename, opts) {
        this.filename = filename;
        this.options = opts || {};
    }

    async process(visitor) {
        let data = await fs.readFile(this.filename);
        let reader = new ByteReader(data);
        
        let leadRecord = new LeadRecord(reader);
        leadRecord.read();
        let dataRecords = [];
        while(!reader.EOF) {
            let dataRecord = new DataRecord(reader, leadRecord);
            dataRecord.read();
            this.options.debug && console.log(dataRecord.toString());
            if (visitor) {
                visitor.visit(dataRecord);
            } else {
                dataRecords.push(dataRecord);
            }
        }
        if (!visitor) {
            return dataRecords;
        }
    }    
}

module.exports = ISO8211Reader;