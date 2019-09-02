#!/usr/bin/env node

const MapReader = require('./lib/MapReader');

let loader = new MapReader({debug: true, filename: process.argv[2]});
loader.read();