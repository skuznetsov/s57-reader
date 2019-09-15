class SubFieldType {
    constructor(kind, size, tag) {
        this.Kind = kind;
        this.Size = size;
        this.Tag = tag || '';
    }
}

module.exports = SubFieldType;