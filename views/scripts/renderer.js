const { ipcRenderer } = require('electron');

const eps = 0.0000001;

let colorClass = {
    "NODTA": xyZtoRGB(0.2800, 0.3100, 40.000),
    "CURSR": xyZtoRGB(0.5000, 0.4000, 32.000),
    "CHBLK": xyZtoRGB(0.2800, 0.3100, 0.000),
    "CHGRD": xyZtoRGB(0.2800, 0.3100, 10.000),
    "CHGRF": xyZtoRGB(0.2800, 0.3100, 25.000),
    "CHRED": xyZtoRGB(0.4800, 0.3000, 25.000),
    "CHGRN": xyZtoRGB(0.3100, 0.5600, 60.000),
    "CHYLW": xyZtoRGB(0.4100, 0.4900, 70.000),
    "CHMGD": xyZtoRGB(0.3000, 0.1700, 20.000),
    "CHMGF": xyZtoRGB(0.2800, 0.2400, 48.000),
    "CHBRN": xyZtoRGB(0.3900, 0.4300, 30.000),
    "CHWHT": xyZtoRGB(0.2800, 0.3100, 80.000),
    "SCLBR": xyZtoRGB(0.5000, 0.4000, 32.000),
    "CHCOR": xyZtoRGB(0.5000, 0.4000, 32.000),
    "LITRD": xyZtoRGB(0.4800, 0.3000, 25.000),
    "LITGN": xyZtoRGB(0.3100, 0.5600, 60.000),
    "LITYW": xyZtoRGB(0.4100, 0.4900, 70.000),
    "ISDNG": xyZtoRGB(0.3000, 0.1700, 20.000),
    "DNGHL": xyZtoRGB(0.4800, 0.3000, 25.000),
    "TRFCD": xyZtoRGB(0.3000, 0.1700, 20.000),
    "TRFCF": xyZtoRGB(0.2800, 0.2400, 48.000),
    "LANDA": xyZtoRGB(0.3500, 0.3900, 50.000),
    "LANDF": xyZtoRGB(0.4500, 0.4200, 15.000),
    "CSTLN": xyZtoRGB(0.2800, 0.3100, 10.000),
    "SNDG1": xyZtoRGB(0.2800, 0.3100, 25.000),
    "SNDG2": xyZtoRGB(0.2800, 0.3100, 0.000),
    "DEPSC": xyZtoRGB(0.2800, 0.3100, 10.000),
    "DEPCN": xyZtoRGB(0.2800, 0.3100, 25.000),
    "DEPDW": xyZtoRGB(0.2800, 0.3100, 80.000),
    "DEPMD": xyZtoRGB(0.2600, 0.2900, 65.000),
    "DEPMS": xyZtoRGB(0.2300, 0.2500, 55.000),
    "DEPVS": xyZtoRGB(0.2100, 0.2200, 45.000),
    "DEPIT": xyZtoRGB(0.2600, 0.3600, 35.000),
    "RADHI": xyZtoRGB(0.3100, 0.5600, 60.000),
    "RADLO": xyZtoRGB(0.3100, 0.5600, 20.000),
    "ARPAT": xyZtoRGB(0.2600, 0.4200, 30.000),
    "NINFO": xyZtoRGB(0.5000, 0.4000, 32.000),
    "RESBL": xyZtoRGB(0.1800, 0.1500, 22.000),
    "ADINF": xyZtoRGB(0.4100, 0.4900, 35.000),
    "RESGR": xyZtoRGB(0.2800, 0.3100, 25.000),
    "SHIPS": xyZtoRGB(0.2800, 0.3100, 0.000),
    "PSTRK": xyZtoRGB(0.2800, 0.3100, 0.000),
    "SYTRK": xyZtoRGB(0.2800, 0.3100, 25.000),
    "PLRTE": xyZtoRGB(0.5800, 0.3500, 18.000),
    "APLRT": xyZtoRGB(0.5000, 0.4000, 32.000),
    "OUTLW": xyZtoRGB(0.2800, 0.3100, 0.000),
    "OUTLL": xyZtoRGB(0.4500, 0.4200, 15.000),
    "RES01": xyZtoRGB(0.2800, 0.3100, 25.000),
    "RES02": xyZtoRGB(0.2800, 0.3100, 25.000),
    "RES03": xyZtoRGB(0.2800, 0.3100, 25.000),
    "BKAJ1": xyZtoRGB(0.2800, 0.3100, 0.600),
    "BKAJ2": xyZtoRGB(0.2800, 0.3100, 1.600),
    "MARBL": xyZtoRGB(0.145, 0.140, 20.0),
    "MARCY": xyZtoRGB(0.200, 0.355, 20.0),
    "MARMG": xyZtoRGB(0.360, 0.220, 20.0),
    "MARWH": xyZtoRGB(0.305, 0.344, 20.0)
}

const colorKeys = Object.keys(colorClass);

let layerToColorClass = {
    "LNDARE": "LANDA",
    "DEPARE": "DEPMD",
    "DRGARE": "LANDF",
    "FLODOC": "CSTLN",
    "HULKES": "SNDG1",
    "PONTON": "SNDG2",
    "UNSARE": "DEPSC"
};

function adj(C) {
    if (Math.abs(C) < 0.0031308) {
      return 12.92 * C;
    }
    return 1.055 * Math.pow(C, 0.41666) - 0.055;
  }
function xyZtoRGB(_x, _y, _z) {

    _z /= 100;
    let x = _x * ( _z / _y );
    let y = _z;
    let z = ( 1 - _x - _y ) * ( _z / _y );

    let r =  3.2404542 * x - 1.5371385 * y - 0.4985314 * z;
    let g = -0.9692660 * x + 1.8760108 * y + 0.0415560 * z;
    let b =  0.0556434 * x - 0.2040259 * y + 1.0572252 * z;
    r = ~~(adj(r) * 255);
    g = ~~(adj(g) * 255);
    b = ~~(adj(b) * 255);
    let color = '#' + Buffer.from([r, g, b]).toString('hex').toUpperCase();
    return color;
}

const INITIAL_SCALE = 3000;
const STEP_MULTIPLIER = 0.25;

class MapRenderer {
    constructor() {
        this.chart = null;
        this.ctx = null;
        this.canvas = null;
        this.tileSelector = null;
        this.mapX = 0;
        this.mapY = 0;
        this.mapScale = INITIAL_SCALE;
        this.isReady = false;
        this.isMouseDown = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
    }
    
    setupEnvironment() {
        this.canvas = document.getElementById('mapArea');
        if (!this.canvas) {
            alert('No canvas element was found.');
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        this.tileSelector = document.getElementById('tileNames');
        this.tileSelector.addEventListener('change', this.onSelectChange.bind(this));

        this.canvas.addEventListener('wheel', this.zoom.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));

        ipcRenderer.on('tileNamesLoaded', this.onTileNamesLoaded.bind(this));
        ipcRenderer.on('mapLoaded', this.onMapLoaded.bind(this));

        ipcRenderer.send('loadTileNames');
    }
    
    onSelectChange (event) {
        let tileName = this.tileSelector.options[this.tileSelector.selectedIndex].text;
        let filename = `data/ENC_ROOT/${tileName}/${tileName}.000`;
        this.mapScale = INITIAL_SCALE;
        this.requestMap(filename);
    }

    zoom(event) {
        event.preventDefault();
        this.mapScale += ~~event.deltaY * STEP_MULTIPLIER;
        // Restrict scale
        this.mapScale = Math.min(Math.max(1, this.mapScale), 10000);
        this.renderMap();
    }

    onMouseUp(event) {
        event.preventDefault();
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.isMouseDown = false;
    }

    onMouseDown(event) {
        event.preventDefault();
        this.lastMouseX = event.layerX;
        this.lastMouseY = event.layerY;
        this.isMouseDown = true;
    }

    onMouseMove(event) {
        if (this.isMouseDown) {
            let offsetX = this.lastMouseX - event.layerX;
            let offsetY = this.lastMouseY - event.layerY;
            this.lastMouseX = event.layerX;
            this.lastMouseY = event.layerY;
            this.mapTopX = Math.min(Math.max(this.mapTopX + offsetX * this.mapScale, 0), this.chart.SECorner.X - this.canvas.width * this.mapScale); // TODO: offset to the size of the screen
            this.mapTopY = Math.min(Math.max(this.mapTopY + offsetY * this.mapScale, 0), this.chart.SECorner.Y - this.canvas.height * this.mapScale); // TODO: offset to the size of the screen
            this.renderMap();
            event.preventDefault();
        }
    }

    onTileNamesLoaded(event, result) {
        this.tileSelector.options.length = 0;
        for(let idx = 0; idx < result.length; idx++) {
            var opt = document.createElement("option");
            opt.value = idx;
            opt.innerHTML = result[idx];
         
            this.tileSelector.appendChild(opt);
        }
    }
    
    onMapLoaded (event, result) {
        console.timeEnd("Map load by renderer");
        this.chart = result;
        let bbox = this.getChartBoundingBox(this.chart);
        this.chart.NWCorner = bbox.NWCorner;
        this.chart.SECorner = bbox.SECorner;
        this.mapTopX = this.chart.NWCorner.X;
        this.mapTopY = this.chart.NWCorner.Y;
        this.renderMap();
    }

    // ipcRenderer.send('loadCatalog');
    // ipcRenderer.on('catalogLoaded', function (event, catalog) {
    //     renderCatalog(catalog);
    // });

    getChartBoundingBox(chart) {
        let bbox = {
            NWCorner: {X: 99999999, Y: 99999999},
            SECorner: {X: 0, Y: 0}
        };
        for (let feature in this.chart.Features) {
            for (let segment of this.chart.Features[feature]) {
                for (let child of segment.Children) {
                    this.getBoundingBox(child.Points, bbox);
                }
            }      
        }
        bbox.width = bbox.SECorner.X - bbox.NWCorner.X;
        bbox.height = bbox.SECorner.Y - bbox.NWCorner.Y;
        return bbox;
    }

    getBoundingBox(points, bbox) {
        for (let pt of points) {
            bbox.NWCorner.X = Math.min(bbox.NWCorner.X, pt.X);
            bbox.NWCorner.Y = Math.min(bbox.NWCorner.Y, pt.Y);
            bbox.SECorner.X = Math.max(bbox.SECorner.X, pt.X);
            bbox.SECorner.Y = Math.max(bbox.SECorner.Y, pt.Y);
        }
        return bbox;
    }

    normalizePoint(pt) {
        let pt1 = {X: 0, Y: 0};
        if (!pt) {
            return pt1;
        }
        pt1.X = ~~((pt.X - this.mapTopX) / this.mapScale);
        pt1.Y = ~~((pt.Y - this.mapTopY) / this.mapScale);

        return pt1;
    }

    renderMap() {
        let points = [];
        let screenBBox = {
            NWCorner: {
                X: this.mapTopX,
                Y: this.mapTopY
            }, 
            SECorner: {
                X: this.mapTopX + this.canvas.width * this.mapScale,
                Y: this.mapTopY + this.canvas.height * this.mapScale
            }
        };

        console.time("Renderer");
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (let feature in this.chart.Features) {
            let color = "#000000";
            if (feature in layerToColorClass) {
                color = colorClass[layerToColorClass[feature]] || "#000000";
            }
            for (let segment of this.chart.Features[feature]) {
                this.ctx.fillStyle = color;
                this.ctx.strokeStyle = color;
                this.ctx.lineWidth = 1;
                let isFirstPoint = true;
                this.ctx.beginPath();
                let prevX = 0, prevY = 0;
                let prevPt = null;
                for (let child of segment.Children) {
                    let bbox = {
                        NWCorner: {X: 99999999, Y: 99999999},
                        SECorner: {X: 0, Y: 0}
                    };
            
                    if (child.Orientation == 2) {
                        points = child.Points.reverse();
                    } else {
                        points = child.Points;
                    }
                    this.getBoundingBox(points, bbox);

                    if (this.areaInsideOrIntersectsArea(bbox, screenBBox) || this.areaInsideArea(screenBBox, bbox)) {
                        if (prevPt ) {
                            let pt = this.normalizePoint(points[0]);
                            if (Math.abs(pt.X - prevPt.X) > 10 && Math.abs(pt.Y - prevPt.Y) > 10) {
                                isFirstPoint = true;
                                prevPt = null;
                            }
                        }
                        for (let pt of points) {
                            let pt1 = {X: 0, Y: 0};
                            pt1 = this.normalizePoint(pt);
                            if (prevPt) {
                                let ln = [prevPt, pt1];
                                ln = this.calculateInterceptOfLineAndBox(ln, [{X:0, Y:0}, {X: this.canvas.width, Y: this.canvas.height}]);
                                if (ln) {
                                    pt1 = ln[1];
                                } else {
                                    pt1.X = Math.max(0, Math.min(pt1.X, this.canvas.width));
                                    pt1.Y = Math.max(0, Math.min(pt1.Y, this.canvas.height));
                                }
                            } else {
                                let ln = this.calculateInterceptOfLineAndBox([pt1, this.normalizePoint(points[1])], [{X:0, Y:0}, {X: this.canvas.width, Y: this.canvas.height}]);
                                if (ln) {
                                    pt1 = ln[0];
                                } else {
                                    pt1.X = Math.max(0, Math.min(pt1.X, this.canvas.width));
                                    pt1.Y = Math.max(0, Math.min(pt1.Y, this.canvas.height));
                                }
                            }
                            prevPt = pt1;
                            if (isFirstPoint) {
                                isFirstPoint = false;
                                this.ctx.moveTo(pt1.X, pt1.Y);
                            } else if (pt1.X != prevX || pt1.Y != prevY) {
                                this.ctx.lineTo(pt1.X, pt1.Y);
                                prevX = pt1.X;
                                prevY = pt1.Y;
                            }
                        }
                    }
                }
                this.ctx.closePath();
                if (segment.Geometry == 3) {
                    this.ctx.fill();
                    this.ctx.stroke();
                } else {
                    this.ctx.stroke();
                }
            }
        }

        console.timeEnd("Renderer");
    }

    renderChartBox(chart) {

    }


    renderCatalog(catalog) {
        let bbox = {
            NWCorner: {X: 99999999, Y: 99999999},
            SECorner: {X: 0, Y: 0}
        };

        for (let chartBox in catalog.root.children) {
            bbox.NWCorner.X = Math.min(bbox.NWCorner.X, chartBox.NWCorner.X);
            bbox.NWCorner.Y = Math.min(bbox.NWCorner.Y, chartBox.NWCorner.Y);
            bbox.SECorner.X = Math.max(bbox.SECorner.X, chartBox.SECorner.X);
            bbox.SECorner.Y = Math.max(bbox.SECorner.Y, chartBox.SECorner.Y);
        }

        let xMapper = this.canvas.width / (bbox.SECorner.X - bbox.NWCorner.X);
        let yMapper = this.canvas.height / (bbox.SECorner.Y - bbox.NWCorner.Y);
        let ratio = this.canvas.width / this.canvas.height;
        if (ratio >= 1) {
            yMapper = xMapper / ratio;
        } else {
            xMapper = yMapper * ratio;
        }

        console.time("Renderer");
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (let chartBox in catalog.root.children) {
            this.ctx.strokeStyle = "red";
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(chartBox.NWCorner.X * xMapper, chartBox.NWCorner.Y * yMapper);
            this.ctx.lineTo(chartBox.SECorner.X * xMapper, chartBox.NWCorner.Y * yMapper);
            this.ctx.lineTo(chartBox.SECorner.X * xMapper, chartBox.SECorner.Y * yMapper);
            this.ctx.closePath();
            this.ctx.stroke();
        }
        console.timeEnd("Renderer");
    }

    requestMap(filename) {
        console.time("Map load by renderer");
        ipcRenderer.send('loadMap', {filename, Layers: ["ADMARE","BCNSPP","BOYSPP","BUAARE","BUISGL","CBLSUB","COALNE","CONZNE","CTNARE","CTRPNT","DEPARE","DEPCNT","DMPGRD","EXEZNE","FSHZNE","LAKARE","LIGHTS","LNDARE","LNDELV","LNDMRK","LNDRGN","MORFAC","OBSTRN","OFSPLF","PILBOP","PILPNT","PRCARE","PRDARE","RDOSTA","RESARE","RIVERS","RTPBCN","SBDARE","SEAARE","SILTNK","SLCONS","SLOGRD","SLOTOP","TESARE","TWRTPT","UNSARE","UWTROC","WRECKS"]});
        //Skin-of-Earth: "LNDARE", "DEPARE", "DRGARE", "FLODOC", "HULKES", "PONTON", "UNSARE"
        // All relevant: "ADMARE","BCNSPP","BOYSPP","BUAARE","BUISGL","CBLSUB","COALNE","CONZNE","CTNARE","CTRPNT","DEPARE","DEPCNT","DMPGRD","EXEZNE","FSHZNE","LAKARE","LIGHTS","LNDARE","LNDELV","LNDMRK","LNDRGN","MORFAC","OBSTRN","OFSPLF","PILBOP","PILPNT","PRCARE","PRDARE","RDOSTA","RESARE","RIVERS","RTPBCN","SBDARE","SEAARE","SILTNK","SLCONS","SLOGRD","SLOTOP","TESARE","TWRTPT","UNSARE","UWTROC","WRECKS"
    }

    pointInsideArea(pt, obj) {
        let pt1 = obj.NWCorner || obj[0];
        let pt2 = obj.SECorner || obj[1];
        if (pt1.X <= pt.X && pt.X <= pt2.X &&
            pt1.Y <= pt.Y && pt.Y <= pt2.Y) {
                return true;
        }
        return false;
    }

    areaInsideOrIntersectsArea(obj1, obj2) {
        let pt1 = obj1.NWCorner || obj1[0];
        let pt2 = obj1.SECorner || obj1[1];
        if (this.pointInsideArea(pt1, obj2) ||
            this.pointInsideArea(pt2, obj2)) {
            return true;
        }
        return false;
    }

    areaInsideArea(obj1, obj2) {
        let pt1 = obj1.NWCorner || obj1[0];
        let pt2 = obj1.SECorner || obj1[1];
        if (this.pointInsideArea(pt1, obj2) &&
            this.pointInsideArea(pt2, obj2)) {
            return true;
        }
        return false;
    }

    isAreaIntersects(obj1, obj2) {
        let pt1 = obj1.NWCorner || obj1[0];
        let pt2 = obj1.SECorner || obj1[1];
        if (this.pointInsideArea(pt1, obj2) ^
            this.pointInsideArea(pt2, obj2)) {
            return true;
        }
        return false;
    }

    calculateInterceptOfLineAndBox(ln, box) {
        let result = [];

        if (!this.isAreaIntersects(ln, box) && !this.areaInsideArea(ln, box) && !this.isAreaIntersects(box, ln)) {
            return null;
        }
        if (this.areaInsideArea(ln, box)) { 
            return ln;
        }

        if (this.pointInsideArea(ln[0], box)) {
            result.push(ln[0]);
        } else {
            result.push(this.lineAndBoxIntersection(ln, box));
        }

        if (this.pointInsideArea(ln[1], box)) {
            result.push(ln[1]);
        } else {
            result.push(this.lineAndBoxIntersection(ln, box));
        }

        return result;
    }

    lineAndBoxIntersection(ln, box) {
        let bp1 = box.NWCorner || box[0];
        let bp2 = box.SECorner || box[1];
        let p = this.segment_intersection(ln[0], ln[1], bp1, {X: bp2.X, Y: bp1.Y});
        if (p) {
            return p;
        }
        p = this.segment_intersection(ln[0], ln[1], {X: bp2.X, Y: bp1.Y}, bp2);
        if (p) {
            return p;
        }
        p = this.segment_intersection(ln[0], ln[1], bp2, {X: bp1.X, Y: bp2.Y});
        if (p) {
            return p;
        }
        p = this.segment_intersection(ln[0], ln[1], {X: bp1.X, Y: bp2.Y}, bp1);
        if (p) {
            return p;
        }
    }

    between(a, b, c) {
        return a-eps <= b && b <= c+eps;
    }
    
    segment_intersection(p1, p2, p3, p4) {
        var x=((p1.X*p2.Y-p1.Y*p2.X)*(p3.X-p4.X)-(p1.X-p2.X)*(p3.X*p4.Y-p3.Y*p4.X)) /
                ((p1.X-p2.X)*(p3.Y-p4.Y)-(p1.Y-p2.Y)*(p3.X-p4.X));
        var y=((p1.X*p2.Y-p1.Y*p2.X)*(p3.Y-p4.Y)-(p1.Y-p2.Y)*(p3.X*p4.Y-p3.Y*p4.X)) /
                ((p1.X-p2.X)*(p3.Y-p4.Y)-(p1.Y-p2.Y)*(p3.X-p4.X));
        if (isNaN(x)||isNaN(y)) {
            return false;
        } else {
            if (p1.X>=p2.X) {
                if (!this.between(p2.X, x, p1.X)) {return false;}
            } else {
                if (!this.between(p1.X, x, p2.X)) {return false;}
            }
            if (p1.Y>=p2.Y) {
                if (!this.between(p2.Y, y, p1.Y)) {return false;}
            } else {
                if (!this.between(p1.Y, y, p2.Y)) {return false;}
            }
            if (p3.X>=p4.X) {
                if (!this.between(p4.X, x, p3.X)) {return false;}
            } else {
                if (!this.between(p3.X, x, p4.X)) {return false;}
            }
            if (p3.Y>=p4.Y) {
                if (!this.between(p4.Y, y, p3.Y)) {return false;}
            } else {
                if (!this.between(p3.Y, y, p4.Y)) {return false;}
            }
        }
        return {X: x, Y: y};
    }

}

const mapRenderer = new MapRenderer();
mapRenderer.setupEnvironment();

