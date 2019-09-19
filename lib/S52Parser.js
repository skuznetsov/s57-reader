const fs = require('fs').promises;
const ByteReader = require("./ISO8211Reader/ByteReader");

function readVariableString(reader) {
    return reader.readVariableString("\x1f", 9999);
}

function adj(C) {
    if (Math.abs(C) < 0.0031308) {
        return 12.92 * C;
    }
    return 1.055 * Math.pow(C, 0.41666) - 0.055;
}
function xyZtoRGB(_x, _y, _z) {

    _z /= 100;
    let x = _x * (_z / _y);
    let y = _z;
    let z = (1 - _x - _y) * (_z / _y);

    let r = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z;
    let g = -0.9692660 * x + 1.8760108 * y + 0.0415560 * z;
    let b = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z;
    r = ~~(adj(r) * 255);
    g = ~~(adj(g) * 255);
    b = ~~(adj(b) * 255);
    let color = '#' + Buffer.from([r, g, b]).toString('hex').toUpperCase();
    return color;
}

class S52Parser {

    constructor(opts) {
        opts = opts || {};
        this.filename = opts.filename || 'styles/PresLib_e4.0.0.dai';
        this.modules = {};
        this.Layers = {};
        this.ColorTables = {};
        this.Patterns = {};
        this.Symbols = {};
        this.Lines = {};
    }

    parseLine() {
        let result = {
            Tag: this.reader.readString(4),
            Data: this.reader.readString(+this.reader.readString(5))
        };
        this.reader.skip(2);
        return result;
    }

    parseLUPT(data, module) {
        let reader = new ByteReader(data);
        reader.skip(10);
        module = Object.assign(module, {
            Class: reader.readString(6),
            ObjectType: reader.readString(1),
            DisplayPriority: +reader.readString(5),
            RadarPriority: reader.readString(1),
            LookupTableSet: readVariableString(reader)
        });
        this.Layers[module.Class] = module;
    }

    parseATTC(data, module) {
        if (data.length < 6) {
            return null;
        }
        let reader = new ByteReader(data);
        if (!module.Attributes) {
            module.Attributes = {};
        }
        while (!reader.EOF) {
            module.Attributes[reader.readString(6)] = readVariableString(reader);
        }
    }

    parseINST(data, module) {
        module.SymbologyInstruction = {
            Symbol: null,
            Text: null,
            LineStyle: null,
            Procedure: null
        };
        let params;
        let reader = new ByteReader(data);
        let line = readVariableString(reader);
        module.SymbologyInstruction.Source = line;
        let commands = line.split(';');
        for (let command of commands) {
            let matches = command.match(/^(\w{2})\((.*?)\)$/);
            if (!matches) {
                continue;
            }
            switch(matches[1]) {
                case "SY":
                    params = matches[2].split(',');
                    module.SymbologyInstruction.ShowPoint = {Symbol: params[0], Rotation: params.length > 1 ? +params[1] : 0};
                    break;
                case "TX":
                    params = matches[2].split(',');
                    module.SymbologyInstruction.ShowText = {
                        Attribute: params[0],
                        HJust: +params[1],
                        VJust: +params[2],
                        Space: +params[3],
                        Chars: params[4],
                        XOffset: +params[5],
                        YOffset: +params[6],
                        Color: params[7],
                        Display: +params[8]
                    };
                    break;
                case "LS":
                    params = matches[2].split(',');
                    module.SymbologyInstruction.ShowLine = {LineStyle: params[0], Width: params[1], Color: params[2]};
                    break;
            }
        }


    }

    parseDISC(data, module) {
        let reader = new ByteReader(data);
        module.DisplayCategory = readVariableString(reader);
    }

    parseLUCM(data, module) {
        let reader = new ByteReader(data);
        module.Comment = readVariableString(reader);
    }

    parseCOLS(data, module) {
        let reader = new ByteReader(data);
        reader.skip(10);
        this.ColorTables[readVariableString(reader)] = module;
    }

    parseCCIE(data, module) {
        let reader = new ByteReader(data);
        let color = reader.readString(5);
        module[color] = {};
        module[color].Color = color;
        module[color].X = +readVariableString(reader);
        module[color].Y = +readVariableString(reader);
        module[color].L = +readVariableString(reader);
        module[color].UseOfColor = readVariableString(reader);
        module[color].HexColor = xyZtoRGB(module[color].X, module[color].Y, module[color].L);
    }

    parsePATD(data, module) {
        let reader = new ByteReader(data);
        module = Object.assign(module, {
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
        });
        this.Patterns[module.Name] = module;
    }

    parsePXPO(data, module) {
        let reader = new ByteReader(data);
        module.PatternComment = readVariableString(reader);
    }

    parsePCRF(data, module) {
        if (data.length < 6) {
            return null;
        }
        let reader = new ByteReader(data);
        module.Colors = {};
        while (!reader.EOF) {
            module.Colors[reader.readString(1)] = reader.readString(5);
        }
    }

    parsePBTM(data, module) {
        let reader = new ByteReader(data);
        module.Bitmap = readVariableString(reader);
    }

    parsePVCT(data, module) {
        let reader = new ByteReader(data);
        let str = readVariableString(reader);
        let commands = str.split(';').map(el => { return {Command: el.substr(0,2), Params: el.substring(2).split(',')}});
        if (commands[commands.length - 1].Command == '') {
            commands.pop();
        }
        if (!module.VectorCommands) {
            module.VectorCommands = [];
        }
        module.VectorCommands = module.VectorCommands.concat(commands);
    }

    parseSYMD(data, module) {
        let reader = new ByteReader(data);
        module = Object.assign(module, {
            Name: reader.readString(8),
            SymbolType: reader.readString(1),
            PivotColumn: +reader.readString(5),
            PivotRow: +reader.readString(5),
            BBoxWidth: +reader.readString(5),
            BBoxHeight: +reader.readString(5),
            BBoxULColumn: +reader.readString(5),
            BBoxULRow: +reader.readString(5)
        });
        this.Symbols[module.Name] = module;
    }

    parseSXPO(data, module) {
        let reader = new ByteReader(data);
        module.SymbolComment = readVariableString(reader);
    }

    parseSCRF(data, module) {
        if (data.length < 6) {
            return null;
        }
        let reader = new ByteReader(data);
        module.Colors = {};
        while (!reader.EOF) {
            module.Colors[reader.readString(1)] = reader.readString(5);
        }
    }

    parseSBTM(data, module) {
        let reader = new ByteReader(data);
        module.Bitmap = readVariableString(reader);
    }

    parseSVCT(data, module) {
        let reader = new ByteReader(data);
        let str = readVariableString(reader);
        let commands = str.split(';').map(el => { return {Command: el.substr(0,2), Params: el.substring(2).split(',')}});
        if (commands[commands.length - 1].Command == '') {
            commands.pop();
        }
        if (!module.VectorCommands) {
            module.VectorCommands = [];
        }
        module.VectorCommands = module.VectorCommands.concat(commands);
    }

    parseLIND(data, module) {
        let reader = new ByteReader(data);
        module = Object.assign(module, {
            Name: reader.readString(8),
            PivotColumn: +reader.readString(5),
            PivotRow: +reader.readString(5),
            BBoxWidth: +reader.readString(5),
            BBoxHeight: +reader.readString(5),
            BBoxULColumn: +reader.readString(5),
            BBoxULRow: +reader.readString(5)
        });
        this.Lines[module.Name] = module;
    }

    parseLXPO(data, module) {
        let reader = new ByteReader(data);
        module.LineComment = readVariableString(reader);
    }

    parseLCRF(data, module) {
        if (data.length < 6) {
            return null;
        }
        let reader = new ByteReader(data);
        module.Colors = {};
        while (!reader.EOF) {
            module.Colors[reader.readString(1)] = reader.readString(5);
        }
    }

    parseLBTM(data, module) {
        let reader = new ByteReader(data);
        module.Bitmap = readVariableString(reader);
    }

    parseLVCT(data, module) {
        let reader = new ByteReader(data);
        let str = readVariableString(reader);
        let commands = str.split(';').map(el => { return {Command: el.substr(0,2), Params: el.substring(2).split(',')}});
        if (commands[commands.length - 1].Command == '') {
            commands.pop();
        }
        if (!module.VectorCommands) {
            module.VectorCommands = [];
        }
        module.VectorCommands = module.VectorCommands.concat(commands);
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
                this.modules[id] = {};
            } else {
                let parserFuncitonName = `parse${data.Tag}`;
                if (parserFuncitonName in this) {
                    this[parserFuncitonName](data.Data, this.modules[id]);
                }
            }
        }
    }
}

module.exports = S52Parser;