'use strict';

const common = require('x2node-common');
const pointers = require('x2node-pointers');


/**
 * Single record patch operation.
 *
 * @private
 * @memberof module:x2node-patches
 * @inner
 * @abstract
 */
class RecordPatchOperation {

	/**
	 * Create new operation.
	 *
	 * @param {module:x2node-pointers~RecordElementPointer} pathPtr Pointer for
	 * the property, to which the operation is applied.
	 */
	constructor(pathPtr) {

		this._pathPtr = pathPtr;
	}

	/**
	 * Apply operation.
	 *
	 * @function module:x2node-patches~RecordPatchOperation#apply
	 * @param {Object} record The record.
	 * @param {module:x2node-patches.RecordPatchHandlers} [handlers] The
	 * handlers.
	 * @returns {boolean} <code>true</code> unless a failed "test" operation.
	 * @throws {module:x2node-common.X2DataError} If the provided record is
	 * invalid.
	 */
}

/**
 * Test if two simple value arrays are equal.
 *
 * @private
 * @param {?Array} arr1 Array 1.
 * @param {?Array} arr2 Array 2.
 * @returns {boolean} <code>true</code> if considered equal.
 */
function equalSimpleArrays(arr1, arr2) {

	if (arr1 && (arr1.length > 0))
		return (
			arr2 &&
				(arr2.length === arr1.length) &&
				arr2.every((v, i) => (v === arr1[i]))
		);

	return (!arr2 || (arr2.length === 0));
}

/**
 * Test if two simple value maps are equal.
 *
 * @private
 * @param {?Object} map1 Map 1.
 * @param {?Object} map2 Map 2.
 * @returns {boolean} <code>true</code> if considered equal.
 */
function equalSimpleMaps(map1, map2) {

	const keys1 = (map1 && Object.keys(map1));
	if (map1 && (keys1.length > 0)) {
		const keys2 = (map2 && Object.keys(map2));
		return (
			keys2 &&
				(keys2.length === keys1.length) &&
				keys2.every(k => (map2[k] === map1[k]))
		);
	}

	return (!map2 || (Object.keys(map2).length === 0));
}

/**
 * Test if two nested object arrays are equal.
 *
 * @private
 * @param {?Array} arr1 Array 1.
 * @param {?Array} arr2 Array 2.
 * @returns {boolean} <code>true</code> if considered equal.
 */
function equalObjectArrays(/*arr1, arr2*/) {

	// TODO: implement
	return false;
}

/**
 * Test if two nested object maps are equal.
 *
 * @private
 * @param {?Object} map1 Map 1.
 * @param {?Object} map2 Map 2.
 * @returns {boolean} <code>true</code> if considered equal.
 */
function equalObjectMaps(/*map1, map2*/) {

	// TODO: implement
	return false;
}

/**
 * Test if two nested objects are equal.
 *
 * @private
 * @param {?Object} obj1 Object 1.
 * @param {?Object} obj2 Object 2.
 * @returns {boolean} <code>true</code> if considered equal.
 */
function equalObjects(/*obj1, obj2*/) {

	// TODO: implement
	return false;
}

/**
 * Tell if anything needs to be done to "add" the specified value at the
 * specified by the pointer location in the specified record.
 *
 * @private
 * @param {module:x2node-pointers~RecordElementPointer} ptr The pointer.
 * @param {Object} record The record.
 * @param {*} value The value.
 * @returns {boolean} <code>true</code> if "add" patch operation would change the
 * record.
 */
function needsAdd(ptr, record, value) {

	const propDesc = ptr.propDesc;

	if (propDesc.isArray()) {
		if (ptr.collectionElement)
			return true;
		if (propDesc.scalarValueType === 'object')
			return !equalObjectArrays(/*ptr.getValue(record), value*/);
		return !equalSimpleArrays(ptr.getValue(record), value);
	}

	if (propDesc.isMap() && !ptr.collectionElement) {
		if (propDesc.scalarValueType === 'object')
			return !equalObjectMaps(/*ptr.getValue(record), value*/);
		return !equalSimpleMaps(ptr.getValue(record), value);
	}

	if (propDesc.scalarValueType === 'object')
		return !equalObjects(/*ptr.getValue(record), value*/);

	return (ptr.getValue(record) !== value);
}

/**
 * Tell if anything needs to be done to "replace" the specified by the pointer
 * location in the specified record with the specified value.
 *
 * @private
 * @param {module:x2node-pointers~RecordElementPointer} ptr The pointer.
 * @param {Object} record The record.
 * @param {*} value The value.
 * @returns {boolean} <code>true</code> if "replace" patch operation would change
 * the record.
 */
function needsReplace(ptr, record, value) {

	const propDesc = ptr.propDesc;

	if (!ptr.collectionElement && propDesc.isArray()) {
		if (propDesc.scalarValueType === 'object')
			return !equalObjectArrays(/*ptr.getValue(record), value*/);
		return !equalSimpleArrays(ptr.getValue(record), value);
	}

	if (!ptr.collectionElement && propDesc.isMap()) {
		if (propDesc.scalarValueType === 'object')
			return !equalObjectMaps(/*ptr.getValue(record), value*/);
		return !equalSimpleMaps(ptr.getValue(record), value);
	}

	if (propDesc.scalarValueType === 'object')
		return !equalObjects(/*ptr.getValue(record), value*/);

	return (ptr.getValue(record) !== value);
}

/**
 * "add" patch operation implementation.
 *
 * @private
 * @memberof module:x2node-patches
 * @inner
 * @extends module:x2node-patches~RecordPatchOperation
 */
class AddRecordPatchOperation extends RecordPatchOperation {

	/**
	 * Create new operation.
	 *
	 * @param {module:x2node-pointers~RecordElementPointer} pathPtr Pointer for
	 * the property, to which the operation is applied.
	 * @param {*} value Value to add.
	 */
	constructor(pathPtr, value) {
		super(pathPtr);

		this._value = value;
	}

	// apply implementation
	apply(record, handlers) {

		// apply the operation if needs to be applied
		if (needsAdd(this._pathPtr, record, this._value)) {
			const oldValue = this._pathPtr.addValue(record, this._value);
			if (this._pathPtr.collectionElement && (
				this._pathPtr.propDesc.isArray() || (oldValue === undefined))) {
				if (handlers.onInsert)
					handlers.onInsert(
						'add', this._pathPtr, this._value, oldValue);
			} else {
				if (handlers.onSet)
					handlers.onSet(
						'add', this._pathPtr, this._value, oldValue);
			}
		}

		// done
		return true;
	}
}

/**
 * "merge" patch operation implementation.
 *
 * @private
 * @memberof module:x2node-patches
 * @inner
 * @extends module:x2node-patches~RecordPatchOperation
 */
class MergeRecordPatchOperation extends RecordPatchOperation {

	/**
	 * Create new operation.
	 *
	 * @param {module:x2node-pointers~RecordElementPointer} pathPtr Pointer for
	 * the property, to which the operation is applied.
	 * @param {Object} value Value to add if not exists.
	 * @param {Array.<module:x2node-patches~RecordPatchOperation>} patchOps Patch
	 * operation to apply if exists.
	 */
	constructor(pathPtr, value, patchOps) {
		super(pathPtr);

		this._addOp = new AddRecordPatchOperation(pathPtr, value);
		this._patch = new RecordPatch(patchOps);
	}

	// apply implementation
	apply(record, handlers) {

		// get current value
		const oldValue = this._pathPtr.getValue(record);

		// patch it if it exists
		if (oldValue)
			return this._patch.apply(record, handlers);

		// otherwise, add it
		return this._addOp(record, handlers);
	}
}

/**
 * "remove" patch operation implementation.
 *
 * @private
 * @memberof module:x2node-patches
 * @inner
 * @extends module:x2node-patches~RecordPatchOperation
 */
class RemoveRecordPatchOperation extends RecordPatchOperation {

	/**
	 * Create new operation.
	 *
	 * @param {module:x2node-pointers~RecordElementPointer} pathPtr Pointer for
	 * the property, to which the operation is applied.
	 */
	constructor(pathPtr) {
		super(pathPtr);
	}

	// apply implementation
	apply(record, handlers) {

		// remove the value from the original location
		const oldValue = this._pathPtr.removeValue(record);

		// call handlers if necessary
		if (this._pathPtr.collectionElement) {
			if (oldValue === undefined)
				throw new common.X2DataError(
					'No value to remove at ' + this._pathPtr + '.');
			if (handlers.onRemove)
				handlers.onRemove('remove', this._pathPtr, oldValue);
		} else {
			if ((oldValue !== null) && handlers.onSet)
				handlers.onSet('remove', this._pathPtr, null, oldValue);
		}

		// done
		return true;
	}
}

/**
 * "replace" patch operation implementation.
 *
 * @private
 * @memberof module:x2node-patches
 * @inner
 * @extends module:x2node-patches~RecordPatchOperation
 */
class ReplaceRecordPatchOperation extends RecordPatchOperation {

	/**
	 * Create new operation.
	 *
	 * @param {module:x2node-pointers~RecordElementPointer} pathPtr Pointer for
	 * the property, to which the operation is applied.
	 * @param {*} value Value to replace with.
	 */
	constructor(pathPtr, value) {
		super(pathPtr);

		this._value = value;
	}

	// apply implementation
	apply(record, handlers) {

		// apply the operation if needs to be applied
		if (needsReplace(this._pathPtr, record, this._value)) {
			const oldValue = this._pathPtr.replaceValue(record, this._value);
			if (handlers.onSet)
				handlers.onSet('replace', this._pathPtr, this._value, oldValue);
		}

		// done
		return true;
	}
}

/**
 * "move" patch operation implementation.
 *
 * @private
 * @memberof module:x2node-patches
 * @inner
 * @extends module:x2node-patches~RecordPatchOperation
 */
class MoveRecordPatchOperation extends RecordPatchOperation {

	/**
	 * Create new operation.
	 *
	 * @param {module:x2node-pointers~RecordElementPointer} pathPtr Pointer for
	 * the property, to which the operation is applied.
	 * @param {module:x2node-pointers~RecordElementPointer} fromPtr Pointer for
	 * the property to move.
	 */
	constructor(pathPtr, fromPtr) {
		super(pathPtr);

		this._fromPtr = fromPtr;
	}

	// apply implementation
	apply(record, handlers) {

		// check if pointers are equal
		if (this._pathPtr.toString() === this._fromPtr.toString())
			return true;

		// remove the value from the original location
		const value = this._fromPtr.removeValue(record);

		// call handlers if necessary
		if (this._fromPtr.collectionElement) {
			if (value === undefined)
				throw new common.X2DataError(
					'No value to move at ' + this._fromPtr + '.');
			if (handlers.onRemove)
				handlers.onRemove('move', this._fromPtr, value);
		} else {
			if ((value !== null) && handlers.onSet)
				handlers.onSet('move', this._fromPtr, null, value);
		}

		// check if needs to be added to the target location
		if (needsAdd(this._pathPtr, record, value)) {
			const oldValue = this._pathPtr.addValue(record, value);
			if (this._pathPtr.collectionElement && (
				this._pathPtr.propDesc.isArray() || (oldValue === undefined))) {
				if (handlers.onInsert)
					handlers.onInsert('move', this._pathPtr, value, oldValue);
			} else {
				if (handlers.onSet)
					handlers.onSet('move', this._pathPtr, value, oldValue);
			}
		}

		// done
		return true;
	}
}

/**
 * "copy" patch operation implementation.
 *
 * @private
 * @memberof module:x2node-patches
 * @inner
 * @extends module:x2node-patches~RecordPatchOperation
 */
class CopyRecordPatchOperation extends RecordPatchOperation {

	/**
	 * Create new operation.
	 *
	 * @param {module:x2node-pointers~RecordElementPointer} pathPtr Pointer for
	 * the property, to which the operation is applied.
	 * @param {module:x2node-pointers~RecordElementPointer} fromPtr Pointer for
	 * the property to copy.
	 */
	constructor(pathPtr, fromPtr) {
		super(pathPtr);

		this._fromPtr = fromPtr;
	}

	// apply implementation
	apply(record, handlers) {

		// get the value to copy
		const value = this._fromPtr.getValue(record);
		if (value === undefined)
			throw new common.X2DataError(
				'No value to copy at ' + this._fromPtr + '.');

		// check if needs to be added to the target location
		if (needsAdd(this._pathPtr, record, value)) {
			const oldValue = this._pathPtr.addValue(record, value);
			if (this._pathPtr.collectionElement && (
				this._pathPtr.propDesc.isArray() || (oldValue === undefined))) {
				if (handlers.onInsert)
					handlers.onInsert('copy', this._pathPtr, value, oldValue);
			} else {
				if (handlers.onSet)
					handlers.onSet('copy', this._pathPtr, value, oldValue);
			}
		}

		// done
		return true;
	}
}

/**
 * "test" patch operation implementation.
 *
 * @private
 * @memberof module:x2node-patches
 * @inner
 * @extends module:x2node-patches~RecordPatchOperation
 */
class TestRecordPatchOperation extends RecordPatchOperation {

	/**
	 * Create new operation.
	 *
	 * @param {module:x2node-pointers~RecordElementPointer} pathPtr Pointer for
	 * the property, to which the operation is applied.
	 * @param {*} value Value to test against.
	 */
	constructor(pathPtr, value) {
		super(pathPtr);

		this._value = value;
	}

	// apply implementation
	apply(record, handlers) {

		// do the test
		const passed = !needsReplace(this._pathPtr, record, this._value);

		// call the handler if any
		if (handlers.onTest)
			handlers.onTest(this._pathPtr, this._value, passed);

		// return the result
		return passed;
	}
}


/**
 * Record patch, which is an implementation of
 * [RFC 6902]{@link https://tools.ietf.org/html/rfc6902} JSON Patch.
 *
 * @memberof module:x2node-patches
 * @inner
 */
class RecordPatch {

	/**
	 * <strong>Note:</strong> The constructor is not accessible from the client
	 * code. The instances are creating using module's
	 * [build()]{@link module:x2node-patches.build} function.
	 *
	 * @private
	 * @param {Array.<module:x2node-patches~RecordPatchOperation>} patchOps
	 * Record patch operations sequence.
	 * @param {Set.<string>} involvedPropPaths Involved property paths.
	 * @param {Set.<string>} updatedPropPaths Paths of properties directly
	 * updated by the patch.
	 */
	constructor(patchOps, involvedPropPaths, updatedPropPaths) {

		this._patchOps = patchOps;
		this._involvedPropPaths = involvedPropPaths;
		this._updatedPropPaths = updatedPropPaths;
	}

	/**
	 * Apply patch to the specified record.
	 *
	 * @param {Object} record The record to patch.
	 * @param {module:x2node-patches.RecordPatchHandlers} [handlers] Handlers
	 * called when a patch operation is applied.
	 * @returns {boolean} <code>true</code> if the patch was applied,
	 * <code>false</code> if a "test" operation in the patch failed. Note, that
	 * in the case of a failed "test" operation the record may be partially
	 * modified as this method does not provide transactionality.
	 * @throws {module:x2node-common.X2DataError} If the patch could not be
	 * applied because the record is invalid (e.g. missing properties that are
	 * expected to be present by the patch logic).
	 */
	apply(record, handlers) {

		for (let patchOp of this._patchOps)
			if (!patchOp.apply(record, handlers))
				return false;

		return true;
	}

	/**
	 * Paths (in dot notation) of all properties involved (read, erased and
	 * updated) in the patch.
	 *
	 * @member {Set.<string>}
	 * @readonly
	 */
	get involvedPropPaths() { return this._involvedPropPaths; }

	/**
	 * Paths (in dot notation) of all properties directly updated by the patch.
	 * All are also included in the <code>involvedPropPaths</code>.
	 *
	 * @member {Set.<string>}
	 * @readonly
	 */
	get updatedPropPaths() { return this._updatedPropPaths; }
}


/**
 * Build record patch object from JSON Patch specification.
 *
 * @function module:x2node-patches.build
 * @param {module:x2node-records~RecordTypesLibrary} recordTypes Record types
 * library.
 * @param {string} recordTypeName Name of the record type, against records of
 * which the patch will be applied.
 * @param {Array.<Object>} patch RFC 6902 JSON patch specification.
 * @returns {module:x2node-patches~RecordPatch} The patch object that can be used
 * to apply the patch to records.
 * @throws {module:x2node-common.X2UsageError} If the provided record type name
 * is invalid.
 * @throws {module:x2node-common.X2SyntaxError} If the provided patch
 * specification is invalid.
 */
function build(recordTypes, recordTypeName, patch) {

	// get the record type descriptor
	if (!recordTypes.hasRecordType(recordTypeName))
		throw new common.X2UsageError(
			`Unknown record type ${recordTypeName}.`);
	const recordTypeDesc = recordTypes.getRecordTypeDesc(recordTypeName);

	// make sure the patch spec is an array
	if (!Array.isArray(patch))
		throw new common.X2SyntaxError('Patch specification is not an array.');

	// process patch operations
	const involvedPropPaths = new Set();
	const updatedPropPaths = new Set();
	const patchOps = patch.map((patchOpDef, opInd) => parsePatchOperation(
		recordTypes, recordTypeDesc, patchOpDef, opInd,
		involvedPropPaths, updatedPropPaths));

	// return the patch object
	return new RecordPatch(patchOps, involvedPropPaths, updatedPropPaths);
}

/**
 * Build record patch object from Merge Patch specification.
 *
 * @function module:x2node-patches.buildMerge
 * @param {module:x2node-records~RecordTypesLibrary} recordTypes Record types
 * library.
 * @param {string} recordTypeName Name of the record type, against records of
 * which the patch will be applied.
 * @param {Object} mergePatch RFC 7396 merge patch specification.
 * @returns {module:x2node-patches~RecordPatch} The patch object that can be used
 * to apply the patch to records.
 * @throws {module:x2node-common.X2UsageError} If the provided record type name
 * is invalid.
 * @throws {module:x2node-common.X2SyntaxError} If the provided patch
 * specification is invalid.
 */
function buildMerge(recordTypes, recordTypeName, mergePatch) {

	// only object merge patches are supported
	if (((typeof mergePatch) !== 'object') || (mergePatch === null))
		throw new common.X2SyntaxError('Merge patch must be an object.');

	// build JSON patch
	const jsonPatch = new Array();
	buildMergeLevel('', mergePatch, jsonPatch);

	// build and return the record patch
	return build(recordTypes, recordTypeName, jsonPatch);
}

/**
 * Recusrively build JSON patch from Merge patch's nesting level.
 *
 * @private
 * @param {string} basePtr Base JSON pointer for the nesting level.
 * @param {Object} levelMergePatch Nested Merge patch for the level.
 * @param {Array.<Object>} jsonPatch Resulting JSON patch specification array.
 */
function buildMergeLevel(basePtr, levelMergePatch, jsonPatch) {

	for (let propName in levelMergePatch) {
		const mergeVal = levelMergePatch[propName];
		const path = basePtr + '/' + propName;
		if (mergeVal === null) {
			jsonPatch.push({
				op: 'remove',
				path: path
			});
		} else if (Array.isArray(mergeVal)) {
			jsonPatch.push({
				op: 'replace',
				path: path,
				value: mergeVal
			});
		} else if ((typeof mergeVal) === 'object') {
			const nestedPatch = new Array();
			buildMergeLevel(path, mergeVal, nestedPatch);
			jsonPatch.push({
				op: 'merge',
				path: path,
				value: mergeVal,
				patch: nestedPatch
			});
		} else {
			jsonPatch.push({
				op: 'replace',
				path: path,
				value: mergeVal
			});
		}
	}
}

/**
 * Pointer use in the patch operation.
 *
 * @private
 * @enum {Symbol}
 */
const PTRUSE = {
	READ: Symbol('READ'),
	SET: Symbol('SET'),
	ERASE: Symbol('ERASE')
};

/**
 * Parse patch operation.
 *
 * @private
 * @param {module:x2node-records~RecordTypesLibrary} recordTypes Record types
 * library.
 * @param {module:x2node-records~RecordTypeDescriptor} recordTypeDesc Record type
 * descriptor.
 * @param {Object} patchOpDef Patch operation definition.
 * @param {number} opInd Index of the patch operation in the patch operations
 * list.
 * @param {Set.<string>} involvedPropPaths Involved property paths collection.
 * @param {Set.<string>} updatedPropPaths Updated property paths collection.
 * @returns {module:x2node-patches~RecordPatchOperation} Parsed operation object.
 * @throws {module:x2node-common.X2SyntaxError} If the operation is invalid.
 */
function parsePatchOperation(
	recordTypes, recordTypeDesc, patchOpDef, opInd,
	involvedPropPaths, updatedPropPaths) {

	const invalidOp = msg => new common.X2SyntaxError(
		`Invalid patch operation #${opInd + 1}: ${msg}`);

	// operation definition must be an object
	if (((typeof patchOpDef) !== 'object') || (patchOpDef === null))
		throw invalidOp('operation specification is not an object.');

	// validate the op
	if ((typeof patchOpDef.op) !== 'string')
		throw invalidOp('op is missing or is not a string.');

	// process the operation
	let pathPtr;
	switch (patchOpDef.op) {
	case 'add':
		pathPtr = resolvePropPointer(
			recordTypeDesc, patchOpDef.path, false, PTRUSE.SET);
		return new AddRecordPatchOperation(
			addInvolvedProperty(pathPtr, involvedPropPaths, updatedPropPaths),
			validatePatchOperationValue(
				recordTypes, patchOpDef.op, opInd, pathPtr, patchOpDef.value,
				true)
		);
	case 'merge':
		pathPtr = resolvePropPointer(
			recordTypeDesc, patchOpDef.path, true, PTRUSE.SET);
		if (!Array.isArray(patchOpDef.patch))
			throw invalidOp('patch is not an array.');
		return new MergeRecordPatchOperation(
			addInvolvedProperty(pathPtr, involvedPropPaths, updatedPropPaths),
			validatePatchOperationValue(
				recordTypes, patchOpDef.op, opInd, pathPtr, patchOpDef.value,
				true),
			patchOpDef.patch.map(
				(mergePatchOpDef, mergeOpInd) => parsePatchOperation(
					recordTypes, recordTypeDesc, mergePatchOpDef, mergeOpInd,
					involvedPropPaths, updatedPropPaths))
		);
	case 'remove':
		pathPtr = resolvePropPointer(
			recordTypeDesc, patchOpDef.path, true, PTRUSE.ERASE);
		return new RemoveRecordPatchOperation(
			addInvolvedProperty(pathPtr, involvedPropPaths, updatedPropPaths)
		);
	case 'replace':
		pathPtr = resolvePropPointer(
			recordTypeDesc, patchOpDef.path, false, PTRUSE.SET);
		return new ReplaceRecordPatchOperation(
			addInvolvedProperty(pathPtr, involvedPropPaths, updatedPropPaths),
			validatePatchOperationValue(
				recordTypes, patchOpDef.op, opInd, pathPtr, patchOpDef.value,
				true)
		);
	case 'move':
		pathPtr = resolvePropPointer(
			recordTypeDesc, patchOpDef.path, false, PTRUSE.SET);
		return new MoveRecordPatchOperation(
			addInvolvedProperty(pathPtr, involvedPropPaths, updatedPropPaths),
			addInvolvedProperty(
				validatePatchOperationFrom(
					patchOpDef.op, opInd, pathPtr, resolvePropPointer(
						recordTypeDesc, patchOpDef.from, true, PTRUSE.ERASE),
					true),
				involvedPropPaths, updatedPropPaths)
		);
	case 'copy':
		pathPtr = resolvePropPointer(
			recordTypeDesc, patchOpDef.path, false, PTRUSE.SET);
		return new CopyRecordPatchOperation(
			addInvolvedProperty(pathPtr, involvedPropPaths, updatedPropPaths),
			addInvolvedProperty(
				validatePatchOperationFrom(
					patchOpDef.op, opInd, pathPtr, resolvePropPointer(
						recordTypeDesc, patchOpDef.from, true, PTRUSE.READ),
					false),
				involvedPropPaths)
		);
	case 'test':
		pathPtr = resolvePropPointer(
			recordTypeDesc, patchOpDef.path, true, PTRUSE.READ);
		return new TestRecordPatchOperation(
			addInvolvedProperty(pathPtr, involvedPropPaths),
			validatePatchOperationValue(
				recordTypes, patchOpDef.op, opInd, pathPtr, patchOpDef.value,
				false)
		);
	default:
		throw new common.X2SyntaxError(
			`Invalid patch operation: unknown operation "${patchOpDef.op}".`);
	}
}

/**
 * Resolve property pointer.
 *
 * @private
 * @param {module:x2node-records~RecordTypeDescriptor} recordTypeDesc Record type
 * descriptor.
 * @param {string} propPointer Property pointer.
 * @param {boolean} noDash <code>true</code> if dash at the end of the array
 * property pointer is disallowed (in the context of the patch operation).
 * @param {Symbol} ptrUse Intended property use in the patch operation.
 * @returns {module:x2node-pointers~RecordElementPointer} The resolved property.
 * @throws {module:x2node-common.X2SyntaxError} If the pointer is invalid.
 */
function resolvePropPointer(recordTypeDesc, propPointer, noDash, ptrUse) {

	// parse the pointer
	const ptr = pointers.parse(recordTypeDesc, propPointer, noDash);

	// check if top pointer
	if (ptr.isRoot())
		throw new common.X2SyntaxError(
			'Patch operations involving top records as a whole are not' +
				' allowed.');

	// check the use
	if (ptrUse === PTRUSE.SET) {
		if (!ptr.propDesc.modifiable)
			throw new common.X2SyntaxError(
				`May not update non-modifiable property ${ptr.propPath}.`);
	} else if (ptrUse === PTRUSE.ERASE) {
		if ((ptr.propDesc.isScalar() || !ptr.collectionElement) &&
			!ptr.propDesc.optional)
			throw new common.X2SyntaxError(
				`May not remove a required property ${ptr.propPath}.`);
	}

	// return the resolved pointer
	return ptr;
}

/**
 * Validate value provided with a patch operation.
 *
 * @private
 * @param {module:x2node-records~RecordTypesLibrary} recordTypes Record types
 * library.
 * @param {string} opType Patch operation type.
 * @param {number} opInd Index of the patch operation in the list of operations.
 * @param {module:x2node-pointers~RecordElementPointer} pathPtr Information
 * object for the property path where the value is supposed to belong.
 * @param {*} val The value to test. Can be <code>null</code>, but not
 * <code>undefined</code>.
 * @param {boolean} forUpdate <code>true</code> if the value is intended as a new
 * value for the property, or <code>false</code> if only used to test the current
 * property value.
 * @returns {*} The value passed in as <code>val</code>.
 * @throws {module:x2node-common.X2SyntaxError} If the value is invalid.
 */
function validatePatchOperationValue(
	recordTypes, opType, opInd, pathPtr, val, forUpdate) {

	// error function
	const validate = errMsg => {
		if (errMsg)
			throw new common.X2SyntaxError(
				`Invalid value in patch operation #${opInd + 1} (${opType}):` +
					` ${errMsg}`);
	};

	// check if we have the value
	if (val === undefined)
		validate('no value is provided for the operation.');

	// get target property descriptor
	const propDesc = pathPtr.propDesc;

	// "merge" operation is a special case
	if (opType === 'merge') {

		// value must be an object
		if (((typeof val) !== 'object') || (val === null))
			validate('merge value must be a non-null object.');

		// target must be a single object or a whole map
		if (!(propDesc.isMap() && !pathPtr.collectionElement) &&
			!((propDesc.scalarValueType === 'object') && (
				propDesc.isScalar() || pathPtr.collectionElement)))
			validate('invalid merge target record element type.');

		// valid value, return it
		return val;
	}

	// validate if null is acceptable
	if (val === null) {
		if ((propDesc.isScalar() || !pathPtr.collectionElement) &&
			!propDesc.optional)
			validate('null for required property.');
		if (pathPtr.collectionElement && (propDesc.scalarValueType === 'object'))
			validate('null for nested object collection element.');
		return val; // valid
	}

	// validate depending on the property type
	if (propDesc.isArray() && !pathPtr.collectionElement) {
		if (!Array.isArray(val))
			validate('expected an array.');
		if (!propDesc.optional && (val.length === 0))
			validate('empty array for required property.');
		val.forEach(v => {
			validate(isInvalidScalarValueType(
				recordTypes, v, propDesc, forUpdate));
		});
	} else if (propDesc.isMap() && !pathPtr.collectionElement) {
		if ((typeof val) !== 'object')
			validate('expected an object.');
		const keys = Object.keys(val);
		if (!propDesc.optional && (keys.length === 0))
			validate('empty object for required property.');
		keys.forEach(k => {
			validate(isInvalidScalarValueType(
				recordTypes, val[k], propDesc, forUpdate));
		});
	} else {
		validate(isInvalidScalarValueType(
			recordTypes, val, propDesc, forUpdate));
	}

	// the value is valid, return it
	return val;
}

/**
 * Tell if the specified value is not good as a value for the specified property
 * as a scalar (so if the property is not scalar, tests if the value is not good
 * to be a collection element).
 *
 * @private
 * @param {module:x2node-records~RecordTypesLibrary} recordTypes Record types
 * library.
 * @param {*} val Value to test. Valid to be <code>null</code> unless the
 * property is a nested object.
 * @param {module:x2node-records~PropertyDescriptor} propDesc Property
 * descriptor.
 * @param {boolean} forUpdate <code>true</code> if the value is intended as a new
 * value for the property, or <code>false</code> if only used to test the current
 * property value.
 * @returns {string} Error message if invalid, <code>false</code> if valid.
 */
function isInvalidScalarValueType(recordTypes, val, propDesc, forUpdate) {

	switch (propDesc.scalarValueType) {
	case 'string':
		if ((val !== null) && ((typeof val) !== 'string'))
			return 'expected string.';
		break;
	case 'number':
		if ((val !== null) && (
			(typeof val) !== 'number') || !Number.isFinite(val))
			return 'expected number.';
		break;
	case 'boolean':
		if ((val !== null) && ((typeof val) !== 'boolean'))
			return 'expected boolean.';
		break;
	case 'datetime':
		if ((val !== null) && (
			((typeof val) !== 'string') ||
				!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(val) ||
				Number.isNaN(Date.parse(val))))
			return 'expected ISO 8601 string.';
		break;
	case 'ref':
		if ((val !== null) && !isValidRefValue(recordTypes, val, propDesc))
			return ('expected ' + propDesc.refTarget + ' reference.');
		break;
	case 'object':
		if (val === null)
			return 'unexpected null instead of an object.';
		if (!isValidObjectValue(recordTypes, val, propDesc, forUpdate))
			return 'expected matching object properties.';
	}

	return false;
}

/**
 * Tell if the specified value is suitable to be the specified reference
 * property's value.
 *
 * @private
 * @param {module:x2node-records~RecordTypesLibrary} recordTypes Record types
 * library.
 * @param {*} val The value to test.
 * @param {module:x2node-records~PropertyDescriptor} propDef Reference property
 * descriptor.
 * @returns {boolean} <code>true</code> if the value is a string (so not
 * <code>null</code> or <code>undefined</code> either) and matches the reference
 * property.
 */
function isValidRefValue(recordTypes, val, propDesc) {

	if ((typeof val) !== 'string')
		return false;

	const hashInd = val.indexOf('#');
	if ((hashInd <= 0) || (hashInd === val.length - 1))
		return false;

	const refTarget = val.substring(0, hashInd);
	if (refTarget !== propDesc.refTarget)
		return false;

	const refTargetDesc = recordTypes.getRecordTypeDesc(refTarget);
	const refIdPropDesc = refTargetDesc.getPropertyDesc(
		refTargetDesc.idPropertyName);

	if ((refIdPropDesc.scalarValueType === 'number') &&
		!Number.isFinite(Number(val.substring(hashInd + 1))))
		return false;

	return true;
}

/**
 * Tell if the specified object is suitable to be a value for the specified
 * nested object property.
 *
 * @private
 * @param {module:x2node-records~RecordTypesLibrary} recordTypes Record types
 * library.
 * @param {Object} val The object to test. May not be <code>null</code> nor
 * <code>undefined</code>.
 * @param {module:x2node-records~PropertyDescriptor} objectPropDesc Nested object
 * property descriptor (either scalar or not).
 * @param {boolean} forUpdate <code>true</code> if the object is intended as a
 * new value for the property, or <code>false</code> if only used to test the
 * current property value.
 * @returns {boolean} <code>true</code> if valid.
 */
function isValidObjectValue(recordTypes, val, objectPropDesc, forUpdate) {

	const container = objectPropDesc.nestedProperties;
	for (let propName of container.allPropertyNames) {
		const propDesc = container.getPropertyDesc(propName);
		if (propDesc.isView() || propDesc.isCalculated())
			continue;
		const propVal = val[propName];
		if ((propVal === undefined) || (propVal === null)) {
			if (!propDesc.optional && (!forUpdate || !propDesc.isGenerated()))
				return false;
		} else if (propDesc.isArray()) {
			if (!Array.isArray(propVal))
				return false;
			if (!propDesc.optional && (propVal.length === 0))
				return false;
			if (propVal.some(
				v => isInvalidScalarValueType(
					recordTypes, v, propDesc, forUpdate)))
				return false;
		} else if (propDesc.isMap()) {
			if ((typeof propVal) !== 'object')
				return false;
			const keys = Object.keys(propVal);
			if (!propDesc.optional && (keys.length === 0))
				return false;
			if (keys.some(
				k => isInvalidScalarValueType(
					recordTypes, propVal[k], propDesc, forUpdate)))
				return false;
		} else {
			if (isInvalidScalarValueType(
				recordTypes, propVal, propDesc, forUpdate))
				return false;
		}
	}

	return true;
}

/**
 * Validate "from" property provided with a patch operation.
 *
 * @private
 * @param {string} opType Patch operation type.
 * @param {number} opInd Index of the patch operation in the list of operations.
 * @param {module:x2node-pointers~RecordElementPointer} pathPtr Information
 * object for the property path where the "from" property is supposed to be
 * placed.
 * @param {module:x2node-pointers~RecordElementPointer} fromPtr Information
 * object for the "from" property.
 * @param {boolean} forMove <code>true</code> if moving, <code>false</code> if
 * copying.
 * @returns {module:x2node-pointers~RecordElementPointer} The pointer passed in
 * as the <code>fromPtr</code>.
 * @throws {module:x2node-common.X2SyntaxError} If the "from" is incompatible.
 */
function validatePatchOperationFrom(opType, opInd, pathPtr, fromPtr, forMove) {

	const invalidFrom = msg => new common.X2SyntaxError(
		`Invalid "from" pointer in patch operation #${opInd + 1} (${opType}):` +
			` ${msg}`);

	if (forMove && pathPtr.isChildOf(fromPtr))
		throw invalidFrom('may not move location into one of its children.');

	const fromPropDesc = fromPtr.propDesc;
	const toPropDesc = pathPtr.propDesc;

	if (fromPropDesc.scalarValueType !== toPropDesc.scalarValueType)
		throw invalidFrom('incompatible property value types.');
	if (toPropDesc.isRef() && (fromPropDesc.refTarget !== toPropDesc.refTarget))
		throw invalidFrom('incompatible reference property targets.');
	if ((toPropDesc.scalarValueType === 'object') &&
		!isCompatibleObjects(fromPropDesc, toPropDesc))
		throw invalidFrom('incompatible nested objects.');

	if (toPropDesc.isArray() && !pathPtr.collectionElement) {
		if (!fromPropDesc.isArray() || fromPropDesc.collectionElement)
			throw invalidFrom('not an array.');
	} else if (toPropDesc.isMap() && !pathPtr.collectionElement) {
		if (!fromPropDesc.isMap() || fromPropDesc.collectionElement)
			throw invalidFrom('not a map.');
	} else {
		if (!fromPropDesc.isScalar() && !fromPtr.collectionElement)
			throw invalidFrom('not a scalar.');
	}

	return fromPtr;
}

/**
 * Tell if a value of the nested object property 2 can be used as a value of the
 * nested object property 1.
 *
 * @private
 * @param {module:x2node-records~PropertyDescriptor} objectPropDesc1 Nested
 * object property 1.
 * @param {module:x2node-records~PropertyDescriptor} objectPropDesc2 Nested
 * object property 2.
 * @returns {boolean} <code>true</code> if compatible nested object properties.
 */
function isCompatibleObjects(objectPropDesc1, objectPropDesc2) {

	const propNames2 = new Set(objectPropDesc2.allPropertyNames);
	const container1 = objectPropDesc1.nestedProperties;
	const container2 = objectPropDesc2.nestedProperties;
	for (let propName of objectPropDesc1.allPropertyNames) {
		const propDesc1 = container1.getPropertyDesc(propName);
		if (propDesc1.isView() || propDesc1.isCalculated())
			continue;
		if (!propNames2.has(propName)) {
			if (!propDesc1.optional)
				return false;
			continue;
		}
		propNames2.delete(propName);
		const propDesc2 = container2.getPropertyDesc(propName);
		if (!propDesc1.optional && propDesc2.optional)
			return false;
		if ((propDesc1.isArray() && !propDesc2.isArray()) ||
			(propDesc1.isMap() && !propDesc2.isMap()) ||
			(propDesc1.isScalar() && !propDesc2.isScalar()))
			return false;
		if (propDesc1.scalarValueType !== propDesc2.scalarValueType)
			return false;
		if (propDesc1.isRef() && (propDesc1.refTarget !== propDesc2.refTarget))
			return false;
		if ((propDesc1.scalarValueType === 'object') &&
			!isCompatibleObjects(propDesc1, propDesc2))
			return false;
	}

	for (let propName of propNames2) {
		const propDesc2 = container2.getPropertyDesc(propName);
		if (!propDesc2.isView() && !propDesc2.isCalculated())
			return false;
	}

	return true;
}

/**
 * Add property to the involved property paths collection.
 *
 * @private
 * @param {module:x2node-pointers~RecordElementPointer} pathPtr Resolved property
 * pointer.
 * @param {Set.<string>} involvedPropPaths Involved property paths collection.
 * @param {Set.<string>} [updatedPropPaths] Updated property paths collection if
 * the involved property is to be updated by the patch.
 * @returns {module:x2node-pointers~RecordElementPointer} The pointer passed in
 * as <code>pathPtr</code>.
 */
function addInvolvedProperty(pathPtr, involvedPropPaths, updatedPropPaths) {

	if (updatedPropPaths) {
		const propPathParts = pathPtr.propPath.split('.');
		let propPath = '';
		for (let i = 0, len = propPathParts.length - 1; i < len; i++) {
			if (propPath.length > 0)
				propPath += '.';
			propPath += propPathParts[i];
			updatedPropPaths.add(propPath);
		}
	}

	const propDesc = pathPtr.propDesc;
	if (propDesc.scalarValueType === 'object') {
		addInvolvedObjectProperty(propDesc, involvedPropPaths, updatedPropPaths);
	} else {
		involvedPropPaths.add(pathPtr.propPath);
		if (updatedPropPaths)
			updatedPropPaths.add(pathPtr.propPath);
	}

	return pathPtr;
}

/**
 * Recursively add nested object property to the involved property paths
 * collection.
 *
 * @private
 * @param {module:x2node-records~PropertyDescriptor} objectPropDesc Nested object
 * property descriptor.
 * @param {Set.<string>} involvedPropPaths Involved property paths collection.
 * @param {Set.<string>} [updatedPropPaths] Updated property paths collection if
 * the involved property is to be updated by the patch.
 */
function addInvolvedObjectProperty(
	objectPropDesc, involvedPropPaths, updatedPropPaths) {

	const container = objectPropDesc.nestedProperties;
	for (let propName of container.allPropertyNames) {
		const propDesc = container.getPropertyDesc(propName);
		if (propDesc.isCalculated() || propDesc.isView())
			continue;
		if (propDesc.scalarValueType === 'object') {
			addInvolvedObjectProperty(
				objectPropDesc, involvedPropPaths, updatedPropPaths);
		} else {
			const propPath = container.nestedPath + propName;
			involvedPropPaths.add(propPath);
			if (updatedPropPaths)
				updatedPropPaths.add(propPath);
		}
	}
}

// export the builder functions
exports.build = build;
exports.buildMerge = buildMerge;
