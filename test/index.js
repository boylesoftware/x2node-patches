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
					valueType: 'number[]'
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
	const recordTypeDesc = recordTypes.getRecordTypeDesc('Record1');

	describe('parseJSONPointer()', function() {

		it('parse valid pointers', function() {
			const validPointers = [
				'',
				'/id',
				'/simpleProp',
				'/simpleArrayProp',
				'/simpleArrayProp/20',
				'/simpleArrayProp/-',
				'/simpleMapProp',
				'/simpleMapProp/MYKEY',
				'/nestedObjProp',
				'/nestedObjProp/prop1',
				'/nestedObjArrayProp',
				'/nestedObjArrayProp/0',
				'/nestedObjArrayProp/0/prop1',
				'/nestedObjMapProp',
				'/nestedObjMapProp/MYKEY',
				'/nestedObjMapProp/MYKEY/prop1'
			];
			for (let pointer of validPointers) {
				expect(patches.parseJSONPointer(recordTypeDesc, pointer), pointer)
					.to.be.ok;
			}
		});
		it('fail parsing invalid pointers', function() {
			const invalidPointers = [
				'/',
				'/hobla',
				'ambra',
				'/simpleArrayProp/zumba',
				'/simpleArrayProp/0/kamba',
				'/simpleMapProp/MYKEY/kmaba',
				'/nestedObjProp/mumba',
				'/nestedObjProp/prop1/umba',
				'/nestedObjArrayProp/-/prop1',
				'/nestedObjMapProp/MYKEY/karamba'
			];
			for (let pointer of invalidPointers) {
				expect(() => patches.parseJSONPointer(recordTypeDesc, pointer), pointer)
					.to.throw(common.X2UsageError);
			}
		});
	});

	describe('PropertyPointer.getValue()', function() {

		const record1 = {
			id: 1,
			simpleProp: 'mamber',
			simpleArrayProp: [
				10, 20, 30
			],
			simpleMapProp: {
				'key1': 'value1',
				'key2': 'value2',
			},
			nestedObjProp: {
				prop1: 'zumba'
			},
			nestedObjArrayProp: [
				{
					id: 100,
					prop1: 'element100'
				},
				{
					id: 101,
					prop1: 'element101'
				}
			],
			nestedObjMapProp: {
				'key1': {
					prop1: 'value1'
				},
				'key2': {
					prop1: 'value2'
				}
			}
		};

		const record2 = {};

		it('get valid pointer values', function() {
			let pointerValues = [
				[ '', record1 ],
				[ '/id', 1 ],
				[ '/simpleProp', 'mamber' ],
				[ '/optionalSimpleProp', null ],
				[ '/simpleArrayProp', record1.simpleArrayProp ],
				[ '/simpleArrayProp/0', 10 ],
				[ '/simpleArrayProp/-', undefined ],
				[ '/simpleArrayProp/100', undefined ],
				[ '/simpleMapProp', record1.simpleMapProp ],
				[ '/simpleMapProp/key1', 'value1' ],
				[ '/simpleMapProp/missing', undefined ],
				[ '/nestedObjProp', record1.nestedObjProp ],
				[ '/nestedObjProp/prop1', 'zumba' ],
				[ '/nestedObjArrayProp', record1.nestedObjArrayProp ],
				[ '/nestedObjArrayProp/0', record1.nestedObjArrayProp[0] ],
				[ '/nestedObjArrayProp/100', undefined ],
				[ '/nestedObjArrayProp/-', undefined ],
				[ '/nestedObjArrayProp/1/prop1', 'element101' ],
				[ '/nestedObjMapProp', record1.nestedObjMapProp ],
				[ '/nestedObjMapProp/key1', record1.nestedObjMapProp['key1'] ],
				[ '/nestedObjMapProp/missing', undefined ],
				[ '/nestedObjMapProp/key2/prop1', 'value2' ]
			];
			for (let pair of pointerValues) {
				const ptr = patches.parseJSONPointer(recordTypeDesc, pair[0]);
				expect(ptr.getValue(record1), ptr.toString())
					.to.be.equal(pair[1]);
			}
			pointerValues = [
				[ '/optionalSimpleProp', null ],
				[ '/simpleArrayProp', null ],
				[ '/simpleArrayProp/0', undefined ],
				[ '/simpleArrayProp/-', undefined ],
				[ '/simpleMapProp', null ],
				[ '/simpleMapProp/missing', undefined ],
				[ '/nestedObjProp', null ],
				[ '/nestedObjArrayProp', null ],
				[ '/nestedObjArrayProp/0', undefined ],
				[ '/nestedObjArrayProp/-', undefined ],
				[ '/nestedObjMapProp', null ],
				[ '/nestedObjMapProp/missing', undefined ]
			];
			for (let pair of pointerValues) {
				const ptr = patches.parseJSONPointer(recordTypeDesc, pair[0]);
				expect(ptr.getValue(record2), ptr.toString())
					.to.be.equal(pair[1]);
			}
			record2.optionalSimpleProp = null;
			record2.simpleArrayProp = null;
			record2.simpleMapProp = null;
			record2.nestedObjProp = null;
			record2.nestedObjArrayProp = null;
			record2.nestedObjMapProp = null;
			for (let pair of pointerValues) {
				const ptr = patches.parseJSONPointer(recordTypeDesc, pair[0]);
				expect(ptr.getValue(record2), ptr.toString())
					.to.be.equal(pair[1]);
			}
			record2.simpleArrayProp = [];
			record2.simpleMapProp = {};
			record2.nestedObjArrayProp = [];
			record2.nestedObjMapProp = {};
			pointerValues = [
				[ '/simpleArrayProp', [] ],
				[ '/simpleMapProp', {} ],
				[ '/nestedObjArrayProp', [] ],
				[ '/nestedObjMapProp', {} ]
			];
			for (let pair of pointerValues) {
				const ptr = patches.parseJSONPointer(recordTypeDesc, pair[0]);
				expect(ptr.getValue(record2), ptr.toString())
					.to.be.deep.equal(pair[1]);
			}
		});

		it('fail invalid pointer values', function() {
			let pointers = [
				'/nestedObjArrayProp/100/prop1',
				'/nestedObjMapProp/missing/prop1'
			];
			for (let pointer of pointers) {
				const ptr = patches.parseJSONPointer(recordTypeDesc, pointer);
				expect(() => ptr.getValue(record1), ptr.toString())
					.to.throw(common.X2DataError);
			}
			record2.nestedObjArrayProp = null;
			record2.nestedObjMapProp = null;
			pointers = [
				'/nestedObjProp/prop1',
				'/nestedObjArrayProp/100/prop1',
				'/nestedObjMapProp/missing/prop1'
			];
			for (let pointer of pointers) {
				const ptr = patches.parseJSONPointer(recordTypeDesc, pointer);
				expect(() => ptr.getValue(record2), ptr.toString())
					.to.throw(common.X2DataError);
			}
			delete record2.nestedObjProp;
			delete record2.nestedObjArrayProp;
			delete record2.nestedObjMapProp;
			for (let pointer of pointers) {
				const ptr = patches.parseJSONPointer(recordTypeDesc, pointer);
				expect(() => ptr.getValue(record2), ptr.toString())
					.to.throw(common.X2DataError);
			}
		});
	});
});
