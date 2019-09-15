const DirEntry = require('./DirEntry');

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
        let numEntries = (this.BaseAddress - 25) / (this.LengthSize + this.PositionSize + this.TagSize)
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

module.exports = Header;