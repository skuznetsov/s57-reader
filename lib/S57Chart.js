const ObjectClasses = require('./ObjectClasses');
const AttributeCodes = require('./AttributeCodes');

D2R = Math.PI / 180;
HALF_D2R = D2R / 2;
PI_4 = Math.PI / 4;
A = 6378137.0;
MAXEXTENT = 20037508.342789244;

class S57Chart {
    constructor(opts) {
        this.opts = opts || null;
        this.DSNM = null;
        this.NavPurpose = 0;
        this.COMF = 1;
        this.SOMF = 1;
        this.CSCL = 1;
        this.Nall = 0;
        this.NWCorner = {X: 99999999, Y: 99999999};
        this.SECorner = {X: 0, Y: 0};
        this.Aall = 0;
        this.Nodes = {};
        this.Features = {};
    }

    normalizeCoords(pt) {
        if (pt.X == 0 && pt.Y == 0) {
            return;
        }

        let x = A * pt.X * D2R;
        let y = A * Math.log(Math.tan((PI_4) + (pt.Y * HALF_D2R)));
        (x > MAXEXTENT) && (x = MAXEXTENT);
        (x < -MAXEXTENT) && (x = -MAXEXTENT);
        (y > MAXEXTENT) && (y = MAXEXTENT);
        (y < -MAXEXTENT) && (y = -MAXEXTENT);

        pt.X = ~~(x + MAXEXTENT);
        pt.Y = ~~Math.abs(y - MAXEXTENT);
    }
    
    visit(record) {
        this.opts && this.opts.debug && console.log(record.toString());
        let dsid = record.getField('DSID');
        let dspm = record.getField('DSPM');
        let vrid = record.getField('VRID');
        let frid = record.getField('FRID');
        if (record.hasField('FFPT')) {
            // console.log('FFPT field identified');
        } else if (dsid) {
            let dssi = record.getField('DSSI');
            this.DSNM = dsid.getValueFor('DSNM');
            this.Nall = +dssi.getValueFor('NALL');
            this.Aall = +dssi.getValueFor('AALL');
            this.NavPurpose = dsid.getValueFor('INTU');
        } else if (dspm) {
            this.COMF = +dspm.getValueFor('COMF');
            this.SOMF = +dspm.getValueFor('SOMF');
            this.CSCL = +dspm.getValueFor('CSCL');
        } else if (vrid) {
            let feature = {Children: []};
            let pointsList = [];
            let RCNM = vrid.getValueFor('RCNM');
            let RCID = vrid.getValueFor('RCID');
            let name = RCNM * 10000000 + RCID;
            let hasVrptSubRecord = record.hasField('VRPT');
            let sg2d = record.getField('SG2D');
            let sg3d = record.getField('SG3D');
            let sg = sg2d || sg3d;
            if (hasVrptSubRecord) {
                this.readFeatureSegments(record, feature, 'VRPT');
                if (feature.Children.length > 0) {
                    pointsList = pointsList.concat(feature.Children[0].Points);
                }
            }
            if (sg) {
                for (let idx = 0; idx < sg.GroupsCount; idx++) {
                    let coord = {X: 0, Y: 0};
                    coord.X = sg.getValueFor('XCOO', idx) / this.COMF;
                    coord.Y = sg.getValueFor('YCOO', idx) / this.COMF;
                    this.normalizeCoords(coord);
                    this.NWCorner.X = Math.min(this.NWCorner.X, coord.X);
                    this.NWCorner.Y = Math.min(this.NWCorner.Y, coord.Y);
                    this.SECorner.X = Math.max(this.SECorner.X, coord.X);
                    this.SECorner.Y = Math.max(this.SECorner.Y, coord.Y);
                    if (sg3d) {
                        coord.Depth = sg.getValueFor('VE3D', idx) / this.SOMF;
                    }
                    pointsList.push(coord);
                }
            }
            if (hasVrptSubRecord) {
                if (feature.Children.length > 1) {
                    pointsList = pointsList.concat(feature.Children[1].Points);
                } 
            }
            this.Nodes[name] = {Type: RCNM, RCID, Points: pointsList};
        } else if (frid) {
            let feature = {Attributes: {}, Children: []};
            let attf = record.getField('ATTF');
            let code = frid.getValueFor('OBJL');
            feature.Group = frid.getValueFor('GRUP');
            feature.Geometry = frid.getValueFor('PRIM');
            let obj = code && ObjectClasses[code];
            if (obj) {
                feature.ObjectClass = obj.Code;
            }
            if (attf) {
                for (let idx = 0; idx < attf.GroupsCount; idx++) {
                    let attributeCode = attf.getValueFor('ATTL', idx);
                    let attributeValue = attf.getValueFor('ATVL', idx);
                    let attr = attributeCode && AttributeCodes[attributeCode];
                    if (attr) {
                        feature.Attributes[attr.Code] = attributeValue;
                    }
                }
            }
            this.readFeatureSegments(record, feature, 'FSPT');
            this.Features[feature.ObjectClass] = this.Features[feature.ObjectClass] || [];
            this.Features[feature.ObjectClass].push(feature);
        }
    }

    readFeatureSegments(record, feature, subFieldName) {
        let subField = record.getField(subFieldName);
        let isVrpt = subFieldName == 'VRPT';
        if (subField) {
            let children = [];
            for (let idx = 0; idx < subField.GroupsCount; idx++) {
                let child = {Points: null, Orientation: 0, Usage: 0, Mask: 0};
                let rawName = subField.getValueFor('NAME', idx);
                let id = this._fromRawName(rawName);
                let obj = this.Nodes[id];
                if (!obj) {
                    console.log(`ERROR: Node ${id} not found`);
                }
                child.Points = obj && obj.Points || [];
                child.Orientation = subField.getValueFor('ORNT', idx);
                child.Usage = subField.getValueFor('USAG', idx);
                child.Mask = subField.getValueFor('MASK', idx);
                if (isVrpt) {
                    child.Topology = subField.getValueFor('TOPI', idx);
                }
                children.push(child);
            }
            feature.Children = children;
        }
    }

    _fromRawName(buf) {
        let rcName = buf[0];
        let rcId = 0;
        let idx = 4;
        while(idx > 1) {
            rcId |= buf[idx--] & 0xFF;
            rcId <<= 8;
        }
        rcId |= buf[idx--] & 0xFF;
        return rcName * 10000000 + rcId;
    }

    _toRawName(name, id) {
        let value = id;
        let result = Buffer.alloc(5);
        let idx = 1;
        result[0] = name;
        while(idx < 5) {
            result[idx++] = value & 0xFF;
            value >>= 8;
        }

        return result;
    }
}

module.exports = S57Chart;