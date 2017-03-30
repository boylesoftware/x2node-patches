/**
 * JSON Patch and JSON Pointer imlpementation module.
 *
 * @module x2node-patch
 * @requires module:x2node-common
 * @requires module:x2node-records
 */
'use strict';

const propertyPointerParser = require('./lib/property-pointer-parser.js');
const recordPatchBuilder = require('./lib/record-patch-builder.js');


// export the JSON patch builder function
exports.buildJSONPatch = recordPatchBuilder.build;

// export the JSON pointer parser function
exports.parseJSONPointer = propertyPointerParser.parse;
