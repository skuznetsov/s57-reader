class Field {
    constructor(reader, tag, length, position, startOfRecord) {
        this.reader = reader;
        this.Tag = tag;
	    this.Length = length;
        this.Position = position;
        this.StartOfRecord = startOfRecord;
        this.FieldType = null;
        this.SubFields = [];
    }

    get Name() {
        return this.Tag;
    }

    read() {
        if (!this.FieldType) {
            return;
        }
        this.reader.pc = this.StartOfRecord + this.Position;
        this.SubFields = this.FieldType.decode(this.Length);
        this.reader.pc = this.StartOfRecord + this.Position + this.Length;
    }

    toString() {
        let result = [];
        let groupIdx = 0;
        let offset = 0;
        do {
            for (let idx = 0; idx < this.FieldType.SubFields.length; idx++) {
                offset = groupIdx * this.FieldType.SubFields.length + idx;
                let tagName = this.FieldType.SubFields[idx] && this.FieldType.SubFields[idx].Tag || '';
                let value = this.SubFields[offset].toString();
                result.push(`${tagName}${tagName ? '=':''}[${value}]`);
            }
            groupIdx++;
        } while(groupIdx < this.GroupsCount);
        return result.join(',');
    }
    get GroupsCount() {
        return this.SubFields.length / this.FieldType.SubFields.length;
    }

    getFieldIndex(subFieldName) {
        let subFieldIdx = -1;
        for (let subField of this.FieldType.SubFields) {
            subFieldIdx++;
            if (subFieldName == subField.Tag) {
                break;
            }
        }
        return subFieldIdx;
    }

    getValueFor(subFieldName, idx) {
        idx = (idx || 0);
        if (idx < 0 || idx > this.GroupsCount) {
            return null;
        }
        let subFieldIdx = this.getFieldIndex(subFieldName);
        if (subFieldIdx == -1) {
            return null;
        }
        return this.SubFields[idx * this.FieldType.SubFields.length + subFieldIdx];
    }

    setValueFor(subFieldName, value, idx) {
        idx = (idx || 0);
        if (idx < 0 || idx > this.GroupsCount) {
            return null;
        }
        let subFieldIdx = this.getFieldIndex(subFieldName);
        if (subFieldIdx == -1) {
            return null;
        }
        this.SubFields[idx * this.FieldType.SubFields.length + subFieldIdx] = value;
    }
}

module.exports = Field;