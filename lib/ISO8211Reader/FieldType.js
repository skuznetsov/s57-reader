const SubFieldType = require('./SubFieldType');

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

module.exports = FieldType;