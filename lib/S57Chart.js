const ObjectClasses = require('./ObjectClasses');
const AttributeCodes = require('./attributeCodes');

class S57Chart {
    NavPurposeTypes = {
        1: 'Overview',
        2: 'General',
        3: 'Coastal',
        4: 'Approach',
        5: 'Harbour',
        6: 'Berthing'
    };

    constructor() {
        this.DSNM = null;
        this.NavPurpose = 0;
        this.COMF = 1;
        this.SOMF = 1;
        this.CSCL = 1;
        this.Nall = 0;
        this.Aall = 0;
        this.Nodes = {};
        this.IsolatedNodes = {};
        this.ConnectedNodes = {};
        this.Edges = {};
        this.Faces = {};
        this.Features = {};
    }

    visit(record) {
        // console.log(record.toString());
        let dsid = record.getField('DSID');
        let dspm = record.getField('DSPM');
        let vrid = record.getField('VRID');
        let frid = record.getField('FRID');
        if (dsid) {
            let dssi = record.getField('DSSI');
            this.DSNM = dsid.getValueFor('DSNM');
            this.Nall = +dssi.getValueFor('NALL');
            this.Aall = +dssi.getValueFor('AALL');
            this.NavPurpose = dsid.getValueFor('INTU');
            console.log(`Purpose type: ${this.NavPurposeTypes[this.NavPurpose]}`);
        } else if (dspm) {
            this.COMF = +dspm.getValueFor('COMF');
            this.SOMF = +dspm.getValueFor('SOMF');
            this.CSCL = +dspm.getValueFor('CSCL');
        } else if (vrid) {
            let feature = {Children: []};
            let pointsList = [];
            let RCNM = vrid.getValueFor('RCNM');
            let RCID = vrid.getValueFor('RCID');
            let name = `${RCNM},${RCID}`;
            let hasVrptSubRecord = record.hasField('VRPT');
            let sg2d = record.getField('SG2D');
            let sg3d = record.getField('SG3D');
            let sg = sg2d || sg3d;
            if (hasVrptSubRecord) {
                this.readFeatureSegments(record, feature, 'VRPT');
                if (feature.Children.length > 0) {
                    for (let child of feature.Children) {
                        pointsList = pointsList.concat(child.Points);
                    }
                }
            }
            if (sg) {
                for (let idx = 0; idx < sg.GroupsCount; idx++) {
                    let X = sg.getValueFor('XCOO', idx) / this.COMF;
                    let Y = sg.getValueFor('YCOO', idx) / this.COMF;
                    let Depth = (sg.getValueFor('VE3D', idx) || 0) / this.SOMF;
                    pointsList.push({X,Y, Depth});
                }
            } else if (!hasVrptSubRecord) {
                console.log(`No point are assigned to VRID: ${name}`);
            }
            this.Nodes[name] = {Type: RCNM, ID: RCID, Points: pointsList};
        } else if (frid) {
            let feature = {Attributes: [], Children: []};
            let attf = record.getField('ATTF');
            let code = frid.getValueFor('OBJL');
            feature.Group = frid.getValueFor('GRUP');
            feature.Geometry = frid.getValueFor('PRIM');
            let obj = code && ObjectClasses[code];
            if (obj) {
                feature.ObjectClass = obj;
            }
            if (attf) {
                for (let idx = 0; idx < attf.GroupsCount; idx++) {
                    let attributeCode = attf.getValueFor('ATTL', idx);
                    let attributeValue = attf.getValueFor('ATVL', idx);
                    let attr = attributeCode && AttributeCodes[attributeCode];
                    if (attr) {
                        feature.Attributes.push({Name: attr.Code, Description: attr.Description, Value: attributeValue});
                    }
                }
            }
            this.readFeatureSegments(record, feature, 'FSPT');
            this.Features[feature.ObjectClass.Code] = this.Features[feature.ObjectClass.Code] || [];
            this.Features[feature.ObjectClass.Code].push(feature);
        }
    }

    readFeatureSegments(record, feature, subFieldName) {
        let subField = record.getField(subFieldName);
        let isVrpt = subFieldName == 'VRPT';
        if (subField) {
            for (let idx = 0; idx < subField.GroupsCount; idx++) {
                let child = {Points: null, Orientation: 0, Usage: 0, Mask: 0};
                let name = subField.getValueFor('NAME', idx);
                let id = this._fromRawName(name);
                let obj = this.Nodes[id];
                if (!obj) {
                    console.log(`Node ${id} not found`);
                }
                child.Type = name[0];
                child.Points = obj && obj.Points || null;
                child.Orientation = subField.getValueFor('ORNT', idx);
                child.Usage = subField.getValueFor('USAG', idx);
                child.Mask = subField.getValueFor('MASK', idx);
                if (isVrpt) {
                    child.Topology = subField.getValueFor('TOPI', idx);
                }
                feature.Children.push(child);
            }
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
        return `${rcName},${rcId}`;
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