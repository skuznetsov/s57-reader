const fs = require('fs').promises;
const ByteReader = require("./ISO8211Reader/ByteReader");

function readVariableString(reader) {
    return reader.readVariableString("\x1f", 9999);
}

class S52Parser {

    constructor(opts) {
        this.filename = 'styles/PresLib_e4.0.0.dai';
        this.modules = {};
    }

    parseLine() {
        let result = {
            Tag: this.reader.readString(4),
            Data: this.reader.readString(+this.reader.readString(5))
        };
        this.reader.skip(2);
        return result;
    }

    parseLUPT(data) {
        let reader = new ByteReader(data);
        reader.skip(10);
        let result = {
            Class: reader.readString(6),
            ObjectType: reader.readString(1),
            DisplayPriority: +reader.readString(5),
            RadarPriority: reader.readString(1),
            LookupTableSet: readVariableString(reader)
        };
        return result;
    }

    parseATTC(data) {
        if (data.length < 6) {
            return null;
        }
        let reader = new ByteReader(data);
        let result = [];
        while (!reader.EOF) {
            result.push({
                AttributeCode: reader.readString(6),
                AttributeValue: readVariableString(reader)
            });
        }
        return result;
    }

    async parse() {
        let buffer = await fs.readFile(this.filename);
        this.reader = new ByteReader(buffer);

        let module = {};
        let id = 0;
        while (!this.reader.EOF) {
            let data = this.parseLine();
            if (data.Tag == '****') {
                continue;
            } else if (data.Tag == '0001') {
                id = +data.Data;
            } else {
                let parsedData = data.Data;
                let parserFuncitonName = `parse${data.Tag}`;
                if (parserFuncitonName in this) {
                    parsedData = this[parserFuncitonName](data.Data);
                }
                this.modules[id] = this.modules[id] || {};
                this.modules[id][data.Tag] = this.modules[id][data.Tag] || [];
                this.modules[id][data.Tag].push(parsedData);
            }
        }
        return this.modules;
    }
}

module.exports = S52Parser;