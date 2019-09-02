const { ipcRenderer } = require('electron');

let ctx = null;
let canvas = null;
let tileSelector = null;

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

function renderMap(chart) {
    let xMapper = canvas.width / (chart.SECorner.X - chart.NWCorner.X);
    let yMapper = canvas.height / (chart.SECorner.Y - chart.NWCorner.Y);
    let points = [];

    console.time("Renderer");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // COALNE, SLCONS, BUAARE, DEPARE
    for(let feature in chart.Features) {
        ctx.beginPath();
        chart.Features[feature].forEach(segment => {
            segment.Children.forEach(child => {
                if (child.Usage == 3) {
                    return;
                }
                let isFirstPoint = true;
                if (child.Orientation == 2) {
                    points = child.Points.reverse();
                } else {
                    points = child.Points;
                }
                for (let pt of points) {
                    let x = (pt.X - chart.NWCorner.X) * xMapper;
                    let y = (pt.Y - chart.NWCorner.Y) * yMapper;
                    if (isFirstPoint) {
                        isFirstPoint = false;
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
            });
        });        
        ctx.stroke();
    }
// ctx.closePath();
    // ctx.stroke();
    console.timeEnd("Renderer");
}

function requestMap(filename) {
    console.time("Map load by renderer");
    ipcRenderer.send('loadMap', {filename, Layers: ["SLCONS"]}); // "LNDARE", "DEPARE", "DRGARE", "FLODOC", "HULKES", "PONTON", "UNSARE"
}

setupEnvironment();

