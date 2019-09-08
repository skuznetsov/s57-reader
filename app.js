// Modules to control application life and create native browser window
const {app, BrowserWindow, ipcMain} = require('electron');
const path = require('path');
const fs = require('fs').promises;
const MapReader = require('./lib/MapReader');
const CatalogReader = require('./lib/CatalogReader');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow = null;

async function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 800,
    webPreferences: {
        nodeIntegration: true,
        nodeIntegrationInWorker: true,
        preload: path.join(__dirname, 'preload.js')
    }
  })

  // and load the index.html of the app.
  mainWindow.loadFile('views/index.html');

  ipcMain.on('loadMap', async function (event, args) {
    let loader = new MapReader({filename: args.filename});
    console.time("loader.read()");
    chart = await loader.read(args.Layers);
    console.timeEnd("loader.read()");
    event.reply('mapLoaded', chart);
  });

  ipcMain.on('loadTileNames', async function (event, args) {
    let dirNames = await fs.readdir('./data/ENC_ROOT');
    dirNames = dirNames.filter(el => el.match(/^US.{6}$/));
    dirNames.unshift('--Select Chart--');
    event.reply('tileNamesLoaded', dirNames);
  });

  // let catalogReader = new CatalogReader({debug: false});
  // let catalog = await catalogReader.read();
  // catalog.root.children.forEach(el => { delete el.children; delete el.siblings; });
  // ipcMain.on('loadCatalog', function (event, args) {
  //   event.reply('catalogLoaded', catalog);
  // });




  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
