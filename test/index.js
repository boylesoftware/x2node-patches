'use strict';

const expect = require('chai').expect;
const records = require('x2node-records');

const patch = require('../index.js');


const TEST_LIB = {
	recordTypes: {
		'Record1': {
			properties: {
				'id': {
					valueType: 'number',
					role: 'id'
				}
			}
		}
	}
};


describe('PropertyPointer', function() {

	const recordTypes = records.buildLibrary(TEST_LIB);

	describe('Simple Pointer', function() {

		const recordTypeDesc = recordTypes.getRecordTypeDesc('Record1');
		it('should parse simple pointer', function() {
			const ptr = patch.parseJSONPointer(recordTypeDesc, '/id');
			expect(ptr).to.be.ok;
		});

	});
});
