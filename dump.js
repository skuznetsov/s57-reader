#!/usr/bin/env node

const ISO8211Reader = require('./lib/ISO8211Reader');

async function dumpFile(filename) {
    let reader = new ISO8211Reader(filename, {debug: true});
    await reader.process();
}

dumpFile(process.argv[2]);