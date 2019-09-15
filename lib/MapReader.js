const fs = require('fs').promises;
const ISO8211Reader = require('./ISO8211Reader');
const S57Chart = require('./S57Chart');

function dump(obj) {
    console.log(JSON.stringify(obj, null, 2));
}

class MapReader {

    constructor(opts) {
        this.chart = new S57Chart(opts);
        this.opts = opts;
    }

    async read(layers) {
        layers = layers || [];
        let records = null;
        try {
            let dirPath = `${this.opts.baseDir}/${this.opts.tileName}/`;
            let filenames = await fs.readdir(dirPath);
            filenames = filenames.filter(el => el.match(/^US.{6}.\d{3}$/));

            for (let filename of filenames) {
                let reader = new ISO8211Reader(dirPath + filename);
                let loadedRecords = await reader.process();
                if (!records) {
                    records = loadedRecords;
                } else {
                    this.updateRecords(records, loadedRecords);
                }
            }
            let sortedRecords = Object.values(records).sort((a,b)=>{
                if (a.RecordID != b.RecordID) {
                    return a.RecordID - b.RecordID;
                }
                let aKey = a.RCNM * 1000000 + a.RCID;
                let bKey = b.RCNM * 1000000 + b.RCID;
                return aKey - bKey;
            });
            for (let record of sortedRecords) {
                this.chart.visit(record);
            }
        } catch (ex) {
            dump(ex);
        } finally {
            delete this.chart.Nodes;

            if (layers.length > 0) {
                Object.keys(this.chart.Features).filter(feature => !layers.includes(feature)).forEach(feature =>{ 
                    delete this.chart.Features[feature];
                });
            }
            this.optimizeLayers();
            if (this.opts.debug) {
                dump(this.chart);
            }
            return this.chart;
        }
    }

    findRecordByID(records, updateRecord) {
        for (let idx = 0; idx < records.length; idx++) {
            let record = records[idx];
            if (record.RCNM == updateRecord.RCNM && record.RCID == updateRecord.RCID) {
                return {Index: idx, Record: record};
            }
        }
        return null;
    }

    updateRecords(records, loadedRecords) {
        for (let record of loadedRecords) {
            if (record.FieldNames[1] == 'DSID') {
                continue;
            }
            let action = record.Fields[1].getValueFor('RUIN');
            let result = this.findRecordByID(records, record);
            if (action == 1) {
                if (result) {
                    records[result.Index] = record;
                } else {
                    records.push(record);
                }
            } else if (action == 2) {
                if (result) {
                    result.Record.delete(record);
                }
            } else {
                if (result) {
                    result.Record.update(record);
                }
            }
        }
    }


    getBoundingBox(points) {
        let bbox = {
            NWCorner: { X: 0xFFFFFFFF, Y: 0xFFFFFFFF },
            SECorner: { X: 0, Y: 0 }
        };

        for (let pt of points) {
            bbox.NWCorner.X = Math.min(bbox.NWCorner.X, pt.X);
            bbox.NWCorner.Y = Math.min(bbox.NWCorner.Y, pt.Y);
            bbox.SECorner.X = Math.max(bbox.SECorner.X, pt.X);
            bbox.SECorner.Y = Math.max(bbox.SECorner.Y, pt.Y);
        }

        if (points.length > 5) {
            points.bbox = bbox;
        }
        return bbox;
    }

    calcDelta(a, b) {
        if (!a || !b) return 0xFFFFFFFF;
        return Math.abs(a.X - b.X) + Math.abs(a.Y - b.Y);
    }

    copyChild(child) {
        let childCopy = Object.assign({}, child);
        childCopy.Points = null;
        return childCopy;
    }

    reverse(arr) {
        let result = [];
        let idx = arr.length - 1;

        while(idx >= 0) {
            result.push(arr[idx--]);
        }
        return result;
    }

    optimizeLayers() {
        for (let feature in this.chart.Features) {
            for (let segment of this.chart.Features[feature]) {
                let points = [];
                let sub_segments = [];
                let lastChild = null;
                let child_points;

                for (let child of segment.Children) {
                    lastChild = child;
                    if (child.Orientation == 2) {
                        child_points = this.reverse(child.Points);
                    } else {
                        child_points = child.Points;
                    }
                    if (points.length > 0 && this.calcDelta(child_points[0], points[points.length - 1]) > 15) {
                        let childCopy = this.copyChild(child);
                        this.getBoundingBox(points);
                        childCopy.Points = points;
                        sub_segments.push(childCopy);
                        points = [];
                    } else {
                        points = points.concat(child_points);
                    }
                }

                if (lastChild && sub_segments.length == 0) {
                    this.getBoundingBox(points);
                    lastChild.Points = points;
                    sub_segments.push(lastChild);
                }
                segment.Children = sub_segments;
            }
        }
    }
}

module.exports = MapReader;