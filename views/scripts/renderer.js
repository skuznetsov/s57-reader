const { ipcRenderer } = require('electron');

let ctx = null;
let canvas = null;
let tileSelector = null;

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

function setupEnvironment() {
    canvas = document.getElementById('mapArea');
    if (!canvas) {
        alert('No canvas element was found.');
    }
    ctx = canvas.getContext('2d');
    tileSelector = document.getElementById('tileNames');
    tileSelector.addEventListener('change', function(event) {
        let tileName = tileSelector.options[tileSelector.selectedIndex].text;
        let filename = `data/ENC_ROOT/${tileName}/${tileName}.000`;
        requestMap(filename);
    });
    // ipcRenderer.send('loadCatalog');
    // ipcRenderer.on('catalogLoaded', function (event, catalog) {
    //     renderCatalog(catalog);
    // });
    ipcRenderer.send('loadTileNames');
    ipcRenderer.on('tileNamesLoaded', function (event, result) {
        tileSelector.options.length = 0;
        for(let idx = 0; idx < result.length; idx++) {
            var opt = document.createElement("option");
            opt.value = idx;
            opt.innerHTML = result[idx]; // whatever property it has
         
            // then append it to the select element
            tileSelector.appendChild(opt);
        }
    })
    
    ipcRenderer.on('mapLoaded', function (event, result) {
        console.timeEnd("Map load by renderer");
        renderMap(result);
    })
}

function getBoundingBox(chart) {
    let bbox = {
        NWCorner: {X: 99999999, Y: 99999999},
        SECorner: {X: 0, Y: 0}
    };
    for(let feature in chart.Features) {
        chart.Features[feature].forEach(function(segment) {
            segment.Children.forEach(function(child) {
                for (let pt of child.Points) {
                    bbox.NWCorner.X = Math.min(bbox.NWCorner.X, pt.X);
                    bbox.NWCorner.Y = Math.min(bbox.NWCorner.Y, pt.Y);
                    bbox.SECorner.X = Math.max(bbox.SECorner.X, pt.X);
                    bbox.SECorner.Y = Math.max(bbox.SECorner.Y, pt.Y);
                }
            });
        });        
    }
    return bbox;
}

function renderMap(chart) {
    let bbox = getBoundingBox(chart);
    let xMapper = canvas.width / (bbox.SECorner.X - bbox.NWCorner.X);
    let yMapper = canvas.height / (bbox.SECorner.Y - bbox.NWCorner.Y);
    let ratio = canvas.width / canvas.height;
    // if (ratio >= 1) {
    //     yMapper = xMapper * ratio;
    // } else {
    //     xMapper = yMapper / ratio;
    // }
    let points = [];

    console.time("Renderer");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // COALNE, SLCONS, BUAARE, DEPARE
    for(let feature in chart.Features) {
        let color = colorClass[layerToColorClass[feature]];
        chart.Features[feature].forEach(function(segment) {
            ctx.fillStyle = color;
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            let isFirstPoint = true;
            ctx.beginPath();
            let prevX = 0, prevY = 0;
            segment.Children.forEach(function(child) {
                // if (child.Usage == 3) {
                //     return;
                // }
                if (child.Orientation == 2) {
                    points = child.Points.reverse();
                } else {
                    points = child.Points;
                }
                for (let pt of points) {
                    let x = ~~((pt.X - bbox.NWCorner.X) * xMapper);
                    let y = ~~((pt.Y - bbox.NWCorner.Y) * yMapper);
                    if (isFirstPoint) {
                        isFirstPoint = false;
                        ctx.moveTo(x, y);
                    } else if (x != prevX || y != prevY) {
                        ctx.lineTo(x, y);
                        prevX = x;
                        prevY = y;
                    }
                }
            });
            ctx.closePath();
            if (segment.Geometry == 3) {
                ctx.fill();
                ctx.stroke();
            } else {
                ctx.stroke();
            }
    });        
    }
// ctx.closePath();
    // ctx.stroke();
    console.timeEnd("Renderer");
}

function renderChartBox(chart) {

}


function renderCatalog(catalog) {
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

    let xMapper = canvas.width / (bbox.SECorner.X - bbox.NWCorner.X);
    let yMapper = canvas.height / (bbox.SECorner.Y - bbox.NWCorner.Y);
    let ratio = canvas.width / canvas.height;
    if (ratio >= 1) {
        yMapper = xMapper / ratio;
    } else {
        xMapper = yMapper * ratio;
    }

    console.time("Renderer");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let chartBox in catalog.root.children) {
        ctx.strokeStyle = "red";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(chartBox.NWCorner.X * xMapper, chartBox.NWCorner.Y * yMapper);
        ctx.lineTo(chartBox.SECorner.X * xMapper, chartBox.NWCorner.Y * yMapper);
        ctx.lineTo(chartBox.SECorner.X * xMapper, chartBox.SECorner.Y * yMapper);
        ctx.closePath();
        ctx.stroke();
    }
    console.timeEnd("Renderer");
}


function requestMap(filename) {
    console.time("Map load by renderer");
    ipcRenderer.send('loadMap', {filename, Layers: ["LNDARE", "DRGARE", "FLODOC", "HULKES", "PONTON", "UNSARE"]}); // "LNDARE", "DEPARE", "DRGARE", "FLODOC", "HULKES", "PONTON", "UNSARE"
}

setupEnvironment();

