
function within(el, low, high) {
    if (low > high) {
        [low, high] = [high, low];
    }
    return low <= el && el <= high;
}


class Catalog {

    constructor(opts) {
        this.opts = opts || null;
        this.records = [];
        this.root = {children: []};
        this.NWCorner = {X: 99999999, Y: 99999999};
        this.SECorner = {X: 0, Y: 0};
    }

    normalizeCoords(pt) {
        if (pt.X == 0 && pt.Y == 0) {
            return;
        }
        let x = ~~(Math.abs(pt.X + 180.0) * 111319);
        let y = ~~(Math.abs(pt.Y - 90.0) * 222266);
        pt.X = x;
        pt.Y = y;
    }
    
    visit(record) {
        this.opts && this.opts.debug && console.log(record.toString());
        let data = {
            NWCorner: {X: 99999999, Y: 99999999},
            SECorner: {X: 0, Y: 0}
        };
        let catd = record.getField('CATD');
        data.Filename = catd.getValueFor('FILE');
        data.Implementation = catd.getValueFor('IMPL');
        data.Description = catd.getValueFor('LFIL');
        data.Comment = catd.getValueFor('COMT');
        data.NWCorner.Y = +(catd.getValueFor('NLAT') || 0);
        data.NWCorner.X = +(catd.getValueFor('WLON') || 0);
        this.normalizeCoords(data.NWCorner);
        data.SECorner.Y = +(catd.getValueFor('SLAT') || 0);
        data.SECorner.X = +(catd.getValueFor('ELON') || 0);
        this.normalizeCoords(data.SECorner);
        data.height = (data.SECorner.Y - data.NWCorner.Y);
        data.width  = (data.SECorner.X - data.NWCorner.X);
        data.chartVolume = (data.height / 1000) * (data.width / 1000);
        this.records.push(data);

        if (data.NWCorner.Y != 0 && data.SECorner.Y != 0) {
            data.isMap = true;
            this.NWCorner.X = Math.min(this.NWCorner.X, data.NWCorner.X);
            this.NWCorner.Y = Math.min(this.NWCorner.Y, data.NWCorner.Y);
            this.SECorner.X = Math.max(this.SECorner.X, data.SECorner.X);
            this.SECorner.Y = Math.max(this.SECorner.Y, data.SECorner.Y);
        } else {
            data.isMap = false;
        }
    }

    pointInsideArea(pt, obj2) {
        let intX = pt.X - obj2.NWCorner.X;
        let intY = pt.Y - obj2.NWCorner.Y;
        if (0 <= intX && intX <= obj2.width ||
            0 <= intY && intY <= obj2.height) {
                return true;
        }
        return false;
    }

    areaInsideArea(obj1, obj2) {
        if (this.pointInsideArea(obj1.NWCorner, obj2) &&
            this.pointInsideArea(obj1.SECorner, obj2)) {
            return true;
        }
        return false;
    }

    isAreaIntersects(obj1, obj2) {
        if (this.pointInsideArea(obj1.NWCorner, obj2) ^
            this.pointInsideArea(obj1.SECorner, obj2)) {
            return true;
        }
        return false;
    }

    normalize() {
        this.records.sort((a,b) => b.chartVolume - a.chartVolume);
        for (let record of this.records) {
            if(record.chartVolume == 0) {
                return;
            }
            if (this.root.children.length == 0) {
                this.root.children.push(record);
            } else {
                this.addRecordToTree(record, this.root);
            }
        }
    }

    addRecordToTree(record, root) {
        root.children = root.children || [];
        if (root.children.length == 0) {
            root.children.push(record);
        } else {
            let isFound = false;
            root.children.sort((a, b) => a.chartVolume - b.chartVolume);
            for (let el of root.children) {
                if (this.isAreaIntersects(record, el)) {
                    el.siblings = el.siblings || [];
                    el.siblings.push(record);
                    record.siblings = record.siblings || [];
                    record.siblings.push(el);
                    root.children.push(record);
                    isFound = true;
                    break;
                } else if (this.areaInsideArea(record,el)) {
                    if (record.chartVolume == el.chartVolume && record.Filename != el.Filename) { // TODO: check if coord boxes are matching
                        // el.charts = el.charts || [];
                        // el.charts.push(record);
                    } else {
                        this.addRecordToTree(record, el);
                    }
                    isFound = true;
                    break;
                }
            }
            if (!isFound) {
                root.children.push(record);
            }
        }
    }
}

module.exports = Catalog;