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
					valueType: 'number',
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

	describe('build()', function() {

		it('build valid patch', function() {
			expect(patches.build(recordTypes, 'Record1', [
				{ op: 'add', path: '/simpleArrayProp', value: [ 7, 10 ] },
				{ op: 'replace', path: '/simpleArrayProp/0', value: 5 },
				{ op: 'remove', path: '/simpleArrayProp/0' },
				{ op: 'move', path: '/simpleArrayProp/-', from: '/optionalSimpleProp' },
				{ op: 'copy', path: '/simpleMapProp/key1', from: '/simpleProp' },
				{ op: 'test', path: '/simpleProp', value: 'some value' }
			])).to.be.ok;
		});
	});
});
