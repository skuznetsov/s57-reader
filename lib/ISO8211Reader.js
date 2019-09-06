const fs = require('fs').promises;
const ByteReader = require('./ByteReader');

// DirEntry describes each following Field
class DirEntry {
    constructor() {
        this.Tag = '';
        this.Length = 0;
        this.Position = 0;
    }
}

// Header holds the overall layout for a Record.
class Header {
    constructor(reader) {
        this.reader = reader;
        this.RecordLength = 0;
        this.InterchangeLevel = '';
        this.LeaderID = '';
        this.InLineCode = '';
        this.Version = '';
        this.ApplicationIndicator = '';
        this.FieldControlLength = 0;
        this.BaseAddress = 0;
        this.ExtendedCharacterSetIndicator = '';
        this.LengthSize = 0;
        this.PositionSize = 0;
        this.TagSize = 0;
        this.Entries = [];
    }

    read() {
        this.RecordLength = +this.reader.readString(5);
        this.InterchangeLevel = +this.reader.readString(1);
        this.LeaderID = this.reader.readString(1);
        this.InLineCode = this.reader.readString(1);
        this.Version = this.reader.readString(1);         
        this.ApplicationIndicator = this.reader.readString(1);
        this.FieldControlLength = +this.reader.readString(2);
        this.BaseAddress = +this.reader.readString(5);
        this.ExtendedCharacterSetIndicator = this.reader.readString(3);
        this.LengthSize = +this.reader.readString(1);
        this.PositionSize = +this.reader.readString(1);
        this.reader.pc++;
        this.TagSize = +this.reader.readString(1);
        this.readEntries();
    }

    readEntries() {
        let numEntries = (this.BaseAddress - 25) / (this.LengthSize+this.PositionSize+this.TagSize)
        for (let idx = 0; idx < numEntries; idx++) {
            let entry = new DirEntry();
            entry.Tag = this.reader.readString(this.TagSize);
            entry.Length = +this.reader.readString(this.LengthSize);
            entry.Position = +this.reader.readString(this.PositionSize);
            this.Entries.push(entry);
        }
        this.reader.pc++;
    }
}

// LeadRecord is the first Record in a file. It has metadata for each
// Field in the file.
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

// Field is a field within a data record, it holds an array of values 
// called SubFields.
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
        let counter = 0;
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
}

// DataRecord contains data for a set of Fields and their SubFields.
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
}

// SubFieldType holds the Go type, size and tag for each SubField.
class SubFieldType {
    constructor(kind, size, tag) {
        this.Kind = kind;
        this.Size = size;
        this.Tag = tag || '';
    }
}

// FieldType holds the metadata describing fields and subfields.
class FieldType {
    constructor(reader, tag, length, position) {
        this.reader = reader;
        this.Tag = tag;
	    this.Length = length;
	    this.Position = position;
	    this.DataStructure = '';
	    this.DataType = '';
	    this.AuxiliaryControls = '';
	    this.PrintableFt = '';
	    this.PrintableUt = '';
	    this.EscapeSeq = '';
	    this.Name = '';
	    this.ArrayDescriptor = '';
        this.FormatControls = '';
        this.GroupLength = 0;
        this.SubFields = [];
        this.SubFields = [];
        this.SubFieldsByTag = {};
    }

    read() {
        this.DataStructure = this.reader.readString(1);
        this.DataType = this.reader.readString(1);
        this.AuxiliaryControls = this.reader.readString(2);
        this.PrintableFt = this.reader.readString(1);
        this.PrintableUt = this.reader.readString(1);
        this.EscapeSeq = this.reader.readString(3);
        let data = this.reader.readString(this.Length - 9);
        let parts = data.split("\x1f");
        this.Name = parts[0];
        if (parts.length > 1) {
            this.ArrayDescriptor = parts[1];
            if (parts.length > 2) {
                this.FormatControls = parts[2];
            }
        }
    }

    get format() {
        if (this.SubFields && this.SubFields.length > 0 || this.FormatControls.length < 3) {
            return this.SubFields;
        }
        this.repeat = this.ArrayDescriptor[0] == '*';
        if (this.repeat) {
            this.ArrayDescriptor = this.ArrayDescriptor.substring(1);
        }
        let tags = this.ArrayDescriptor ? this.ArrayDescriptor.split('!') : [];
        let formatCodes = this.FormatControls.replace(/[\(\)]/g,'').split(',');
        let tagIdx = 0;
        for (let formatCode of formatCodes) {
            let matches = formatCode.match(/^(\d*)(\w)(\d*)/);
            if (!matches) {
                throw new Error(`Wrong format code: ${formatCode}`)
            }
            let repeat = +matches[1] || 1;
            let formatType = matches[2];
            let formatSubType = matches[3];
            let size = +formatSubType;

            while (repeat--) {
                let subField = null;
                let tagName = tags[tagIdx];
                switch (formatType) {
                    case 'A':
                        subField = new SubFieldType("String", size, tagName);
                        this.GroupLength += size;
                        break;
                    case 'I':
                        subField = new SubFieldType("String", size, tags[tagIdx]);
                        this.GroupLength += size;
                        break;
                    case 'R':
                        subField = new SubFieldType("String", size, tags[tagIdx]);
                        this.GroupLength += size;
                        break;
                    case 'B':
                        subField = new SubFieldType("Array", size / 8, tags[tagIdx]);
                        this.GroupLength += size / 8;
                        break;
                    case 'b':
                        switch (formatSubType) {
                            case "11":
                                subField = new SubFieldType("Uint8", 1, tags[tagIdx]);
                                this.GroupLength += 1;
                                break;
                            case "12":
                                subField = new SubFieldType("Uint16", 2, tags[tagIdx]);
                                this.GroupLength += 2;
                                break;
                            case "14":
                                subField = new SubFieldType("Uint32", 4, tags[tagIdx]);
                                this.GroupLength += 4;
                                break;
                            case "21":
                                subField = new SubFieldType("Int8", 1, tags[tagIdx]);
                                this.GroupLength += 1;
                                break;
                            case "22":
                                subField = new SubFieldType("Int16", 2, tags[tagIdx]);
                                this.GroupLength += 2;
                                break;
                            case "24":
                                subField = new SubFieldType("Int32", 4, tags[tagIdx]);
                                this.GroupLength += 4;
                                break;
                        }
                        break;
                }
                this.SubFields.push(subField);
                if (tagName) {
                    this.SubFieldsByTag[tagName] = subField;
                }
                tagIdx++;
            }
        }
        return this.SubFields;
    }

    decode(maxLength) {
        let values = [];
        let tags = this.format;
        let maxPc = this.reader.pc + maxLength;
        do {
            for (let tag of tags) {
                if (this.reader.EOF) {
                    break;
                }
                switch(tag.Kind) {
                    case "Uint8":
                        values.push(this.reader.readByte());
                        break;
                    case "Uint16":
                        values.push(this.reader.readUShort());
                        break;
                    case "Uint32":
                        values.push(this.reader.readUInt());
                        break;
                    case "Int8":
                        values.push(this.reader.readByte());
                        break;
                    case "Int16":
                        values.push(this.reader.readShort());
                        break;
                    case "Int32":
                        values.push(this.reader.readInt());
                        break;
                    case "Array":
                        let size = this.SubFieldsByTag[tag.Tag].Size;
                        values.push(this.reader.readBytes(size));
                        break;
                    default: // Strings
                        let str = null;
                        let strSize = tag.Size;
                        if (strSize == 0) {
                            str = this.reader.readVariableString("\x1f", this.Length);
                        } else {
                            str = this.reader.readString(strSize);
                        }
                        values.push(str);
                        break;
                }
            }
        } while(this.repeat && this.reader.pc < maxPc - 1);

        return values;
    }
}

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
            visitor && visitor.visit(dataRecord);
            visitor || dataRecords.push(dataRecord);
        }
        if (!visitor) {
            return dataRecords;
        }
    }    
}

module.exports = ISO8211Reader;