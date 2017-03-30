/**
 * JSON Patch and JSON Pointer imlpementation module.
 *
 * @module x2node-patch
 * @requires module:x2node-common
 * @requires module:x2node-records
 */
'use strict';

const propertyPointerParser = require('./lib/property-pointer-parser.js');


// export the JSON pointer parser function
exports.parseJSONPointer = propertyPointerParser.parse;
