const Header = require('./Header');
const Field = require('./Field');

class DataRecord {
    constructor(reader, leadRecord) {
        this.reader = reader;
        this.Header = new Header(reader);
        this.Lead = leadRecord;
        this.Fields = [];
        this.pc = 0;
    }

    get RecordID() {
        return this.getField('0001').SubFields[0];
    }

    get RCNM() {
        return this.Fields[1].getValueFor('RCNM');
    }

    get RCID() {
        return this.Fields[1].getValueFor('RCID');
    }

    get FieldNames() {
        return this.Fields && this.Fields.map(field => field.Tag) || [];
    }

    hasField(fieldName) {
        return this.FieldNames.includes(fieldName);
    }

    getField(fieldName) {
        return this.Fields && this.Fields.find(field => field.Tag == fieldName ) || null;
    }

    read() {
        this.Header.read();
        this.pc = this.reader.pc;
        if (this.Header.LeaderID != 'D') {
            throw Error('Data record is not found');
        }

        this.readFields();
        this.reader.pc = this.pc - this.Header.BaseAddress + (this.Header.RecordLength || 0);
    }

    readFields() {
        if (!this.Lead) {
            throw new Error('Cannot read data without DDR information.');
        }
        for (let entry of this.Header.Entries) {
            let field = new Field(this.reader, entry.Tag, entry.Length, entry.Position, this.pc);
            field.FieldType = this.Lead.FieldTypes[field.Tag];
            field.read();
            this.Fields.push(field);
        }
    }

    toString() {
        let result = [];
        for (let idx = 0; idx < this.Header.Entries.length; idx++) {
            let tagName = this.Header.Entries[idx] && this.Header.Entries[idx].Tag || '';
            let value = this.Fields[idx].toString();
            result.push(`${tagName}=[${value}]`);
        }
        return result.join(',');
    }

    delete (updateRecord) {
        this.Fields[1].setValueFor('RVER', updateRecord.Fields[1].getValueFor('RVER'));
        this.Fields[1].setValueFor('RUIN', updateRecord.Fields[1].getValueFor('RUIN'));
        this.Header.Entries.splice(2);
        this.Fields.splice(2);
    }
}


module.exports = DataRecord;