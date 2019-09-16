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

    setField(fieldName, value) {
        for (let idx = 0; idx < this.Fields.length; idx++) {
            if (this.Fields[idx].Tag == fieldName) {
                this.Fields[idx] = value;
                return true;
            }
        }
        return false;
    }

    addOrUpdateField(fieldName, value, headerEntry) {
        if (!this.setField(fieldName, value)) {
            this.Fields.push(value);
            this.Header.Entries.push(headerEntry);
        }
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

    update (updateRecord) {
        let isOperationTagFound = false;
        this.Fields[1].setValueFor('RVER', updateRecord.Fields[1].getValueFor('RVER'));
        this.Fields[1].setValueFor('RUIN', updateRecord.Fields[1].getValueFor('RUIN'));
        for (let operationTag of ['VRPC', 'SGCC', 'FFPC', 'FSPC']) {
            let updateOperation = updateRecord.getField(operationTag);
            if (updateOperation == null) {
                continue;
            }
            isOperationTagFound = true;
            switch(updateOperation.Name) {
                case 'FSPC':
                    let fspt = updateRecord.getField('FSPT');
                    let thisFspt = this.getField('FSPT');
                    this.updateSubRecords(updateOperation, thisFspt, fspt);
                    break;
                case 'FFPC':
                    let ffpt = updateRecord.getField('FFPT');
                    let thisFfpt = this.getField('FFPT');
                    this.updateSubRecords(updateOperation, thisFfpt, ffpt);
                    break;
                case 'VRPC':
                    let vrpt = updateRecord.getField('VRPT');
                    let thisVrpt = this.getField('VRPT');
                    this.updateSubRecords(updateOperation, thisVrpt, vrpt);
                    break;
                case 'SGCC':
                    let sg2d = updateRecord.getField('SG2D') || updateRecord.getField('SG3D');
                    let thisSg2d = this.getField('SG2D') || this.getField('SG3D');
                    this.updateSubRecords(updateOperation, thisSg2d, sg2d);
                    break;
            }
        }
        if (!isOperationTagFound) {
            if (updateRecord.Fields[1].getValueFor('RUIN') == 3) {
                for (let fieldName of updateRecord.FieldNames) {
                    if (fieldName == '0001') {
                        continue;
                    }
                    this.addOrUpdateField(fieldName, updateRecord.getField(fieldName), updateRecord.Header.getEntryByTag(fieldName));
                }
            } else {
                console.log(`Unknown update operation for RCNM: ${updateRecord.RCNM}, RCID:  ${updateRecord.RCID}`);
            }
        }
    }

    updateSubRecords(updateOperation, thisField, updateField) {
        try {
            let operationAction = updateOperation.SubFields[0];
            let operationIdx = updateOperation.SubFields[1];
            let operationNum = updateOperation.SubFields[2];
            let fieldLength = thisField.FieldType.SubFields.length;
            let position = (operationIdx - 1) * fieldLength;
            switch(operationAction) {
                case 1: // Insert
                    // let insertionPosition = (operationIdx > 1 ? operationIdx - 2 : 0) * fieldLength;
                    thisField.SubFields.splice(position, 0, ...updateField.SubFields);
                    break;
                case 2: // Delete
                    thisField.SubFields.splice(position, operationNum * fieldLength);
                    break;
                case 3: // Update
                    thisField.SubFields.splice(position, operationNum * fieldLength, ...updateField.SubFields);
                    break;
            }
        } catch (ex) {
            dump(ex);
        }

    }
}


module.exports = DataRecord;