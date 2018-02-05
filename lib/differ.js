'use strict';

const common = require('x2node-common');


/**
 * Build patch specification by analyzing the difference between two record
 * versions. The top record id property is allowed to be missing in the provided
 * new record (if present, must be the same). View, calculated and record
 * meta-info properties are ignored. Unrecognized properties in the new record
 * are not allowed. The resulting patch specification may still be invalid. For
 * example, the function does not check if properties are modifiable or
 * optional. Attempt to build a patch from the resulting specification will
 * reveal the error. The array properties are assumed to be sorted using the
 * same criteria in both old and new records.
 *
 * @function module:x2node-patches.fromDiff
 * @param {module:x2node-records~RecordTypesLibrary} recordTypes Record types
 * library.
 * @param {string} recordTypeName Name of the record type.
 * @param {Object} recOld Original record.
 * @param {Object} recNew New record.
 * @returns {Array.<Object>} RFC 6902 JSON patch specification, which, when
 * applied to <code>recOld</code> updates it to become identical to
 * <code>recNew</code>.
 * @throws {module:x2node-common.X2UsageError} If the provided record type name
 * is invalid, or the specified old record object is not an object or is
 * <code>null</code>.
 * @throws {module:x2node-common.X2SyntaxError} If the provided new record
 * object is not an object, is <code>null</code>, or contains invalid property
 * values. Note, that the validity of the specified old object property
 * values is not checked and is assumed to be always valid and complete.
 */
function fromDiff(recordTypes, recordTypeName, recOld, recNew) {

	// get the record type descriptor
	if (!recordTypes.hasRecordType(recordTypeName))
		throw new common.X2UsageError(
			`Unknown record type ${recordTypeName}.`);
	const recordTypeDesc = recordTypes.getRecordTypeDesc(recordTypeName);

	// make sure the provided records are objects
	if (((typeof recOld) !== 'object') || (recOld === null))
		throw new common.X2UsageError(
			'Specified original record is not a non-null object.');
	if (((typeof recNew) !== 'object') || (recNew === null))
		throw new common.X2SyntaxError(
			'Specified new record is not a non-null object.');

	// build patch specification
	const patchSpec = new Array();
	diffObjects(recordTypeDesc, '', recOld, recNew, patchSpec);

	// return the patch specification
	return patchSpec;
}

function diffObjects(container, basePath, objOld, objNew, patchSpec) {

	// check each property
	const unrecognizedPropNames = new Set(Object.keys(objNew));
	for (let propName of container.allPropertyNames) {

		// property recognized
		unrecognizedPropNames.delete(propName);

		// get property descriptor
		const propDesc = container.getPropertyDesc(propName);

		// skip certain types of properties
		if (propDesc.isView() || propDesc.isCalculated() ||
			propDesc.isRecordMetaInfo())
			continue;

		// get the property values, old and new
		const valOld = objOld[propName];
		const valNew = objNew[propName];

		// common check for property removal
		if ((valNew === undefined) || (valNew === null)) {
			if ((valOld !== undefined) && (valOld !== null) &&
				!propDesc.isId())
				patchSpec.push({
					op: 'remove',
					path: `${basePath}/${propName}`
				});
			continue;
		}

		// proceed depending on the property structural type
		if (propDesc.isArray()) {
			if (!Array.isArray(valNew))
				throw new common.X2SyntaxError(
					`Provided value for ${container.recordTypeName} property` +
					` at ${basePath}/${propName} is not an array.`);
			if (valNew.length === 0) {
				if ((valOld !== undefined) && (valOld !== null) &&
					(valOld.length > 0))
					patchSpec.push({
						op: 'remove',
						path: `${basePath}/${propName}`
					});
			} else if ((valOld === undefined) || (valOld === null) ||
						(valOld.length === 0)) {
				patchSpec.push({
					op: 'replace',
					path: `${basePath}/${propName}`,
					value: valNew
				});
			} else {
				diffArrays(propDesc, basePath, valOld, valNew, patchSpec);
			}
		} else if (propDesc.isMap()) {
			if ((typeof valNew) !== 'object')
				throw new common.X2SyntaxError(
					`Provided value for ${container.recordTypeName} property` +
					` at ${basePath}/${propName} is not an object.`);
			if (Object.keys(valNew).length === 0) {
				if ((valOld !== undefined) && (valOld !== null) &&
					(Object.keys(valOld).length > 0))
					patchSpec.push({
						op: 'remove',
						path: `${basePath}/${propName}`
					});
			} else if ((valOld === undefined) || (valOld === null) ||
						(Object.keys(valOld).length === 0)) {
				patchSpec.push({
					op: 'replace',
					path: `${basePath}/${propName}`,
					value: valNew
				});
			} else {
				diffMaps(propDesc, basePath, valOld, valNew, patchSpec);
			}
		} else if (propDesc.scalarValueType === 'object') {
			if ((typeof valNew) !== 'object')
				throw new common.X2SyntaxError(
					`Provided value for ${container.recordTypeName} property` +
					` at ${basePath}/${propName} is not an object.`);
			if ((valOld === undefined) || (valOld === null)) {
				patchSpec.push({
					op: 'replace',
					path: `${basePath}/${propName}`,
					value: valNew
				});
			} else {
				diffObjects(
					propDesc.nestedProperties, `${basePath}/${propName}`,
					valOld, valNew, patchSpec);
			}
		} else {
			if (valNew !== valOld)
				patchSpec.push({
					op: 'replace',
					path: `${basePath}/${propName}`,
					value: valNew
				});
		}
	}

	// any unrecognized properties?
	if (unrecognizedPropNames.size > 0)
		throw new common.X2SyntaxError(
			`Unrecognized properties for ${container.recordTypeName}` +
			(basePath.length > 0 ? ` at ${basePath}` : '') + ': ' +
			Array.from(unrecognizedPropNames).join(', '));
}

function diffArrays(propDesc, basePath, arrOld, arrNew, patchSpec) {

	const objects = (propDesc.scalarValueType === 'object');

	let iOld = 0, iNew = 0, t = 0;
	const lenOld = arrOld.length, lenNew = arrNew.length;
	while (iNew < lenNew) {

		if (iOld === lenOld) {

			patchSpec.push({
				op: 'add',
				path: `${basePath}/${propDesc.name}/-`,
				value: valNew
			});

		} if (objects) {

			//...

		} else { // not object elements

			const valNew = arrNew[iNew];

			if (valNew === arrOld[iOld]) {
				iOld++;
				t++;
			} else {
				let insert = true;
				for (let i = iOld + 1; i < lenOld; i++) {
					if (arrOld[i] === valNew) {
						insert = false;
						while (iOld++ < i)
							patchSpec.push({
								op: 'remove',
								path: `${basePath}/${propDesc.name}/${t}`
							});
						t++;
						break;
					}
				}
				if (insert) {
					patchSpec.push({
						op: 'add',
						path: `${basePath}/${propDesc.name}/${t}`,
						value: valNew
					});
					t++;
				}
			}
		}

		iNew++;
	}
	while (iOld++ < lenOld) {
		patchSpec.push({
			op: 'remove',
			path: `${basePath}/${propDesc.name}/${t}`
		});
	}
}

function diffMaps(propDesc, basePath, mapOld, mapNew, patchSpec) {

	const objects = (propDesc.scalarValueType === 'object');

	const keysToRemove = new Set(Object.keys(mapOld));
	for (let key of Object.keys(mapNew)) {

		const valOld = mapOld[key];
		const valNew = mapNew[key];

		if ((valNew === undefined) || (valNew === null)) {
			if ((valOld === undefined) || (valOld === null))
				keysToRemove.delete(key);
			continue;
		}

		keysToRemove.delete(key);

		if ((valOld === undefined) || (valOld === null)) {
			patchSpec.push({
				op: 'add',
				path: `${basePath}/${propDesc.name}/${ptrSafe(key)}`,
				value: valNew
			});
		} else if (objects) {
			diffObjects(
				propDesc.nestedProperties,
				`${basePath}/${propDesc.name}/${ptrSafe(key)}`,
				valOld, valNew, patchSpec);
		} else if (valNew !== valOld) {
			patchSpec.push({
				op: 'replace',
				path: `${basePath}/${propDesc.name}/${ptrSafe(key)}`,
				value: valNew
			});
		}
	}

	for (let key of keysToRemove)
		patchSpec.push({
			op: 'remove',
			path: `${basePath}/${propDesc.name}/${ptrSafe(key)}`
		});
}

function ptrSafe(str) {

	return str.replace(/[~\/]/g, m => (m === '~' ? '~0' : '~1'));
}

// export the differ function
exports.fromDiff = fromDiff;
