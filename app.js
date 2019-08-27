const fs = require('fs');
const ByteReader = require('./lib/byteReader');

function dump(obj) {
    console.log(JSON.stringify(obj, null, 2));
}

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
        this.SubFields = this.FieldType.decode();
        this.reader.pc = this.StartOfRecord + this.Position + this.Length;
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
        return this.Header.Entries.map(el => el.Tag).join(', ');
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
                        break;
                    case 'I':
                        subField = new SubFieldType("String", size, tags[tagIdx]);
                        break;
                    case 'R':
                        subField = new SubFieldType("String", size, tags[tagIdx]);
                        break;
                    case 'B':
                        subField = new SubFieldType("Array", size / 8, tags[tagIdx]);
                        break;
                    case 'b':
                        switch (formatSubType) {
                            case "11":
                                subField = new SubFieldType("Uint8", 1, tags[tagIdx]);
                                break;
                            case "12":
                                subField = new SubFieldType("Uint16", 2, tags[tagIdx]);
                                break;
                            case "14":
                                subField = new SubFieldType("Uint32", 4, tags[tagIdx]);
                                break;
                            case "21":
                                subField = new SubFieldType("Int8", 1, tags[tagIdx]);
                                break;
                            case "22":
                                subField = new SubFieldType("Int16", 2, tags[tagIdx]);
                                break;
                            case "24":
                                subField = new SubFieldType("Int32", 4, tags[tagIdx]);
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

    decode() {
        let values = [];
        let tags = this.format;
        for (let tag of tags) {
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
                    let strSize = this.SubFieldsByTag[tag.Tag].Size;
                    if (strSize == 0) {
                        str = this.reader.readVariableString("\x1f");
                    } else {
                        str = this.reader.readString(strSize);
                    }
                    values.push(str);
                    break;
            }
        }

        return values;
    }
}

let data = fs.readFileSync('data/US1AK90M/US1AK90M.000');
let reader = new ByteReader(data);

let leadRecord = new LeadRecord(reader);
leadRecord.read();
let dataRecords = [];
let currentRecordNum = 0;
while(!reader.EOF) {
    let dataRecord = new DataRecord(reader, leadRecord);
    dataRecord.read();
    dataRecords.push(dataRecord);
}

console.log(`Read ${dataRecords.length} data records`);




