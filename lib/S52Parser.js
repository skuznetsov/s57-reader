const fs = require('fs').promises;
const ByteReader = require("./ISO8211Reader/ByteReader");

function readVariableString(reader) {
    return reader.readVariableString("\x1f", 9999);
}

class S52Parser {

    constructor(opts) {
        opts = opts || {};
        this.filename = opts.filename || 'styles/PresLib_e4.0.0.dai';
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

    parseINST(data) {
        if (data.length < 6) {
            return null;
        }
        let reader = new ByteReader(data);
        return {
            SymbologyInstruction: readVariableString(reader)
        };
    }

    parseDISC(data) {
        if (data.length < 6) {
            return null;
        }
        let reader = new ByteReader(data);
        return {
            DisplayCategory: readVariableString(reader)
        };
    }

    parseLUCM(data) {
        if (data.length < 6) {
            return null;
        }
        let reader = new ByteReader(data);
        return {
            Comment: readVariableString(reader)
        };
    }

    parseCOLS(data) {
        let reader = new ByteReader(data);
        reader.skip(10);
        let result = {
            ColorTableName: readVariableString(reader)
        };
        return result;
    }

    parseCCIE(data) {
        let reader = new ByteReader(data);
        let result = {
            Color: reader.readString(5),
            X: +readVariableString(reader),
            Y: +readVariableString(reader),
            L: +readVariableString(reader),
            UseOfColor: readVariableString(reader)
        };
        return result;
    }

    parsePATD(data) {
        let reader = new ByteReader(data);
        let result = {
            Name: reader.readString(8),
            PatternType: reader.readString(1),
            FillType: reader.readString(3),
            SymbolSpacing: reader.readString(3),
            MinDistance: +reader.readString(5),
            MaxDistance: +reader.readString(5),
            PivotColumn: +reader.readString(5),
            PivotRow: +reader.readString(5),
            BBoxWidth: +reader.readString(5),
            BBoxHeight: +reader.readString(5),
            BBoxULColumn: +reader.readString(5),
            BBoxULRow: +reader.readString(5)
        };
        return result;
    }

    parsePXPO(data) {
        let reader = new ByteReader(data);
        let result = {
            PatternComment: readVariableString(reader)
        };
        return result;
    }

    parsePCRF(data) {
        if (data.length < 6) {
            return null;
        }
        let reader = new ByteReader(data);
        let result = [];
        while (!reader.EOF) {
            result.push({
                ColorIndex: reader.readString(1),
                ColorName: reader.readString(5)
            });
        }
        return result;
    }

    parsePBTM(data) {
        let reader = new ByteReader(data);
        let result = {
            Bitmap: readVariableString(reader)
        };
        return result;
    }

    parsePVCT(data) {
        let reader = new ByteReader(data);
        let str = readVariableString(reader);
        let commands = str.split(';').map(el => { return {Command: el.substr(0,2), Params: el.substring(2).split(',')}});
        if (commands[commands.length - 1].Command == '') {
            commands.pop();
        }
        let result = {
            VectorCommands: commands
        };
        return result;
    }

    parseSYMD(data) {
        let reader = new ByteReader(data);
        let result = {
            Name: reader.readString(8),
            SymbolType: reader.readString(1),
            PivotColumn: +reader.readString(5),
            PivotRow: +reader.readString(5),
            BBoxWidth: +reader.readString(5),
            BBoxHeight: +reader.readString(5),
            BBoxULColumn: +reader.readString(5),
            BBoxULRow: +reader.readString(5)
        };
        return result;
    }

    parseSXPO(data) {
        let reader = new ByteReader(data);
        let result = {
            SymbolComment: readVariableString(reader)
        };
        return result;
    }

    parseSCRF(data) {
        if (data.length < 6) {
            return null;
        }
        let reader = new ByteReader(data);
        let result = [];
        while (!reader.EOF) {
            result.push({
                ColorIndex: reader.readString(1),
                ColorName: reader.readString(5)
            });
        }
        return result;
    }

    parseSBTM(data) {
        let reader = new ByteReader(data);
        let result = {
            Bitmap: readVariableString(reader)
        };
        return result;
    }

    parseSVCT(data) {
        let reader = new ByteReader(data);
        let str = readVariableString(reader);
        let commands = str.split(';').map(el => { return {Command: el.substr(0,2), Params: el.substring(2).split(',')}});
        if (commands[commands.length - 1].Command == '') {
            commands.pop();
        }
        let result = {
            VectorCommands: commands
        };
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