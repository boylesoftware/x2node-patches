'use strict';

const expect = require('chai').expect;
const common = require('x2node-common');
const records = require('x2node-records');

const patches = require('../index.js');


const TEST_LIB = {
	recordTypes: {
		'Record1': {
			properties: {
				'id': {
					valueType: 'number',
					role: 'id'
				},
				'simpleProp': {
					valueType: 'string'
				},
				'optionalSimpleProp': {
					valueType: 'string',
					optional: true
				},
				'simpleArrayProp': {
					valueType: 'string[]'
				},
				'simpleMapProp': {
					valueType: 'string{}'
				},
				'nestedObjProp': {
					valueType: 'object',
					properties: {
						'prop1': {
							valueType: 'string'
						}
					}
				},
				'nestedObjArrayProp': {
					valueType: 'object[]',
					properties: {
						'id': {
							valueType: 'number',
							role: 'id'
						},
						'prop1': {
							valueType: 'string'
						}
					}
				},
				'nestedObjMapProp': {
					valueType: 'object{}',
					properties: {
						'prop1': {
							valueType: 'string'
						}
					}
				}
			}
		}
	}
};


describe('x2node-patches Module', function() {

	const recordTypes = records.buildLibrary(TEST_LIB);

	describe('build()', function() {

		it('builds valid patch', function() {
			expect(patches.build(recordTypes, 'Record1', [
				{ op: 'add', path: '/simpleArrayProp', value: [ 'A', 'B' ] },
				{ op: 'replace', path: '/simpleArrayProp/0', value: 'C' },
				{ op: 'remove', path: '/simpleArrayProp/0' },
				{ op: 'move', path: '/simpleArrayProp/-', from: '/optionalSimpleProp' },
				{ op: 'copy', path: '/simpleMapProp/key1', from: '/simpleProp' },
				{ op: 'test', path: '/simpleProp', value: 'some value' }
			])).to.be.ok;
		});
	});

	describe('fromDiff()', function() {

		const rec = {
			id: 1,
			simpleProp: 'Mamber',
			simpleArrayProp: [ 'A', 'B', 'C', 'D', 'E', 'F', 'G' ],
			nestedObjProp: {
				prop1: 'Zumber'
			},
			nestedObjArrayProp: [
				{ id: 1, prop1: 'A' },
				{ id: 2, prop1: 'B' },
				{ id: 3, prop1: 'C' },
				{ id: 4, prop1: 'D' },
				{ id: 5, prop1: 'E' }
			]
		};

		it('patches simple values array prop via diff', function() {
			[
				[ 'A', 'B', 'C', 'D', 'E', 'F', 'G' ],
				[ '0', '1' ],
				[ '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ],
				[ 'A', 'B', 'C', '0', '1', 'D', 'E', 'F', 'G' ],
				[ '0', '1', 'A', 'B', 'C', '2', '3', 'D', 'E', 'F', 'G', '4', '5' ],
				[ 'A', 'B', 'E', 'F', 'G' ],
				[ 'B', 'E', 'F' ],
				[ 'A', 'D', 'E', 'G' ],
				[ 'A', 'B', '0', '1', '2', '3', 'E', 'F', 'G' ],
				[ 'A', 'B', '0', 'E', 'F', 'G' ],
				[ 'A', 'B', '0', 'D', '1', 'F', '2' ]
			].forEach(a => {
				const recNew = deepCopy(rec);
				recNew.simpleArrayProp = a;
				const patchSpec = patches.fromDiff(
					recordTypes, 'Record1', rec, recNew);
				const patch = patches.build(recordTypes, 'Record1', patchSpec);
				const recPatched = deepCopy(rec);
				patch.apply(recPatched);
				expect(recPatched).to.deep.equal(recNew);
			});
		});

		it('patches nested objects array prop via diff', function() {
			[
				[
					{ id: 1, prop1: 'A' },
					{ id: 0, prop1: '0' },
					{ id: 0, prop1: '1' },
					{ id: 4, prop1: 'D' },
					{ id: 5, prop1: 'E' },
					{ id: 0, prop1: '2' }
				],
				[
					{ id: 0, prop1: '0' },
					{ id: 0, prop1: '1' },
					{ id: 3, prop1: 'X' },
					{ id: 4, prop1: 'D' },
					{ id: 0, prop1: '2' }
				],
				[
					{ id: 3, prop1: 'X' }
				],
				[
					{ id: 0, prop1: '0' },
					{ id: 1, prop1: 'X' },
					{ id: 2, prop1: 'B' },
					{ id: 3, prop1: 'C' },
					{ id: 4, prop1: 'D' },
					{ id: 5, prop1: 'E' },
					{ id: 0, prop1: '1' }
				]
			].forEach(a => {
				const recNew = deepCopy(rec);
				recNew.nestedObjArrayProp = a;
				const patchSpec = patches.fromDiff(
					recordTypes, 'Record1', rec, recNew);
				const patch = patches.build(recordTypes, 'Record1', patchSpec);
				const recPatched = deepCopy(rec);
				patch.apply(recPatched);
				expect(recPatched).to.deep.equal(recNew);
			});
		});
	});
});

function deepCopy(obj) {

	let res;
	if (Array.isArray(obj)) {
		res = [];
		for (let v of obj)
			res.push(deepCopy(v));
	} else if (((typeof obj) === 'object') && (obj !== null)) {
		res = {};
		for (let k of Object.keys(obj))
			res[k] = deepCopy(obj[k]);
	} else {
		res = obj;
	}

	return res;
}
