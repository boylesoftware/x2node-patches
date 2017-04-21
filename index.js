/**
 * JSON Patch imlpementation module.
 *
 * @module x2node-patches
 * @requires module:x2node-common
 * @requires module:x2node-records
 * @requires module:x2node-pointers
 */
'use strict';

const recordPatchBuilder = require('./lib/record-patch-builder.js');


// export the builder functions
exports.build = recordPatchBuilder.build;
exports.buildMerge = recordPatchBuilder.buildMerge;
