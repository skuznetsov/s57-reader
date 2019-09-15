const Header = require("./Header");
const FieldType = require("./FieldType");

class LeadRecord {
    constructor(reader) {
        this.reader = reader;
        this.Header = new Header(this.reader);
        this.FieldTypes = {};
        this.RecordSize = 0;
    }

    read() {
        this.Header.read();
        if (this.Header.LeaderID != 'L') {
            throw Error('Lead record is not found');
        }

        this.readFieldTypes();
    }

    readFieldTypes() {
        for (let entry of this.Header.Entries) {
            let fieldType = new FieldType(this.reader, entry.Tag, entry.Length, entry.Position);
            this.RecordSize = entry.Position + entry.Length;
            fieldType.read();
            this.FieldTypes[fieldType.Tag] = fieldType;
        }
    }
}

module.exports = LeadRecord;