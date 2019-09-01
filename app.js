#!/usr/bin/env node
const ISO8211Reader = require('./lib/ISO8211Reader');
const S57Chart = require('./lib/S57Chart');

function dump(obj) {
    console.log(JSON.stringify(obj, null, 2));
}

let reader = new ISO8211Reader(process.argv[2] || 'data/US1AK90M/US1AK90M.000');
let chart = new S57Chart();
try {
    reader.process(chart);
} catch (ex) {
    dump(ex);
} finally {
    delete chart.Nodes;
    dump(chart);
}



