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
 * same criteria in both old and new records. Elements of nested object arrays
 * must have id property. All elements in the old record must have an id value.
 * Elements in the new record without the id or with an id that is not found in
 * the old array are assumed to be new and are inserted.
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
	diffObjects(recordTypeDesc, '/', recOld, recNew, patchSpec);

	// return the patch specification
	return patchSpec;
}

/**
 * Recursively diff two objects and generate corresponding patch operations.
 *
 * @private
 * @param {module:x2node-records~PropertiesContainer} container The container
 * that describes the object (record or nested object property).
 * @param {string} pathPrefix Prefix to add to contained property names to form
 * corresponding JSON pointers.
 * @param {Object} objOld Original object.
 * @param {Object} objNew New object.
 * @param {Array.<Object>} patchSpec The patch specification, to which to add
 * generated operations.
 */
function diffObjects(container, pathPrefix, objOld, objNew, patchSpec) {

	// keep track of processed properties
	const unrecognizedPropNames = new Set(Object.keys(objNew));

	// diff main properties
	diffObjectProps(
		container, pathPrefix,
		objOld, objNew,
		unrecognizedPropNames, patchSpec);	

	// check if polymorphic object and check the subtype properties
	if (container.isPolymorphObject()) {

		// type property is recognized
		unrecognizedPropNames.delete(container.typePropertyName);

		// match the subtype
		const subtype = objOld[container.typePropertyName];
		if (objNew[container.typePropertyName] !== subtype)
			throw new common.X2SyntaxError(
				'Polymorphic object type does not match.');

		// go over the subtype properties
		const subtypeDesc = container.getPropertyDesc(subtype);
		diffObjectProps(
			subtypeDesc.nestedProperties, `${pathPrefix}${subtype}:`,
			objOld, objNew,
			unrecognizedPropNames, patchSpec);
	}

	// any unrecognized properties?
	if (unrecognizedPropNames.size > 0)
		throw new common.X2SyntaxError(
			`Unrecognized properties for ${container.recordTypeName}` +
			` at ${pathPrefix}:` + Array.from(unrecognizedPropNames).join(', '));
}

/**
 * Diff object properties.
 *
 * @private
 * @param {module:x2node-records~PropertiesContainer} container The container
 * that describes the object (record or nested object property).
 * @param {string} pathPrefix Prefix to add to contained property names to form
 * corresponding JSON pointers.
 * @param {Object} objOld Original object.
 * @param {Object} objNew New object.
 * @param {Set.<string>} unrecognizedPropNames Set used to keep track of
 * processed properties. Processed property names are removed from this set. In
 * the end, what remains in the set are the unrecognized properties in the new
 * object.
 * @param {Array.<Object>} patchSpec The patch specification, to which to add
 * generated operations.
 */
function diffObjectProps(
	container, pathPrefix, objOld, objNew, unrecognizedPropNames, patchSpec) {

	// check each property
	for (let propName of container.allPropertyNames) {

		// property recognized
		unrecognizedPropNames.delete(propName);

		// get property descriptor
		const propDesc = container.getPropertyDesc(propName);

		// skip certain types of properties
		if (propDesc.isView() || propDesc.isCalculated() ||
			propDesc.isRecordMetaInfo() || propDesc.isSubtype())
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
					path: `${pathPrefix}${propName}`
				});
			continue;
		}

		// proceed depending on the property structural type
		if (propDesc.isArray()) {

			if (!Array.isArray(valNew))
				throw new common.X2SyntaxError(
					`Provided value for ${container.recordTypeName} property` +
					` at ${pathPrefix}${propName} is not an array.`);

			if (valNew.length === 0) {
				if ((valOld !== undefined) && (valOld !== null) &&
					(valOld.length > 0))
					patchSpec.push({
						op: 'remove',
						path: `${pathPrefix}${propName}`
					});
			} else if ((valOld === undefined) || (valOld === null) ||
						(valOld.length === 0)) {
				patchSpec.push({
					op: 'replace',
					path: `${pathPrefix}${propName}`,
					value: valNew
				});
			} else {
				if (propDesc.scalarValueType === 'object')
					diffObjectArrays(
						propDesc, `${pathPrefix}${propName}`, valOld, valNew,
						patchSpec);
				else
					diffValueArrays(
						`${pathPrefix}${propName}`, valOld, valNew, patchSpec);
			}

		} else if (propDesc.isMap()) {

			if ((typeof valNew) !== 'object')
				throw new common.X2SyntaxError(
					`Provided value for ${container.recordTypeName} property` +
					` at ${pathPrefix}${propName} is not an object.`);

			if (Object.keys(valNew).length === 0) {
				if ((valOld !== undefined) && (valOld !== null) &&
					(Object.keys(valOld).length > 0))
					patchSpec.push({
						op: 'remove',
						path: `${pathPrefix}${propName}`
					});
			} else if ((valOld === undefined) || (valOld === null) ||
						(Object.keys(valOld).length === 0)) {
				patchSpec.push({
					op: 'replace',
					path: `${pathPrefix}${propName}`,
					value: valNew
				});
			} else {
				diffMaps(
					propDesc, `${pathPrefix}${propName}`, valOld, valNew,
					patchSpec);
			}

		} else if (propDesc.scalarValueType === 'object') {

			if ((typeof valNew) !== 'object')
				throw new common.X2SyntaxError(
					`Provided value for ${container.recordTypeName} property` +
					` at ${pathPrefix}${propName} is not an object.`);

			if ((valOld === undefined) || (valOld === null)) {
				patchSpec.push({
					op: 'replace',
					path: `${pathPrefix}${propName}`,
					value: valNew
				});
			} else {
				diffObjects(
					propDesc.nestedProperties, `${pathPrefix}${propName}/`,
					valOld, valNew, patchSpec);
			}

		} else {

			if (valNew !== valOld)
				patchSpec.push({
					op: 'replace',
					path: `${pathPrefix}${propName}`,
					value: valNew
				});
		}
	}
}

/**
 * Diff two simple value arrays and generate corresponding patch operations.
 *
 * @private
 * @param {string} propPath JSON pointer path of the array property.
 * @param {Array.<*>} arrOld Original array.
 * @param {Array.<*>} arrNew New array.
 * @param {Array.<Object>} patchSpec The patch specification, to which to add
 * generated operations.
 */
function diffValueArrays(propPath, arrOld, arrNew, patchSpec) {

	let iOld = 0, iNew = 0, t = 0;
	const lenOld = arrOld.length, lenNew = arrNew.length;

	while ((iOld < lenOld) && (iNew < lenNew)) {

		const valOld = arrOld[iOld];
		const valNew = arrNew[iNew];

		if (valOld === valNew) {
			iOld++;
			iNew++;
			t++;
		} else {
			const si = iOld;
			let di = iNew;
			while ((di < lenNew) && (arrNew[di] !== valOld))
				di++;
			if (di < lenNew) {
				while (iNew < di) {
					patchSpec.push({
						op: 'add',
						path: `${propPath}/${t}`,
						value: arrNew[iNew]
					});
					iNew++;
					t++;
				}
				iOld++;
				iNew++;
				t++;
			} else {
				let sni = si + 1;
				while (sni < lenOld) {
					const v = arrOld[sni];
					for (di = iNew; di < lenNew; di++) {
						if (arrNew[di] === v)
							break;
					}
					if (di < lenNew) {
						break;
					} else {
						sni++;
					}
				}
				if (sni < lenOld) {
					while ((iOld < sni) && (iNew < di)) {
						patchSpec.push({
							op: 'replace',
							path: `${propPath}/${t}`,
							value: arrNew[iNew]
						});
						iOld++;
						iNew++;
						t++;
					}
					while (iOld < sni) {
						patchSpec.push({
							op: 'remove',
							path: `${propPath}/${t + sni - iOld - 1}`
						});
						iOld++;
					}
					while (iNew < di) {
						patchSpec.push({
							op: 'add',
							path: `${propPath}/${t}`,
							value: arrNew[iNew]
						});
						iNew++;
						t++;
					}
					iOld++;
					iNew++;
					t++;
				} else {
					break;
				}
			}
		}
	}
	while ((iOld < lenOld) && (iNew < lenNew)) {
		patchSpec.push({
			op: 'replace',
			path: `${propPath}/${t}`,
			value: arrNew[iNew]
		});
		iOld++;
		iNew++;
		t++;
	}
	while (iOld++ < lenOld) {
		patchSpec.push({
			op: 'remove',
			path: `${propPath}/${t + lenOld - iOld}`
		});
	}
	while (iNew < lenNew) {
		patchSpec.push({
			op: 'add',
			path: `${propPath}/-`,
			value: arrNew[iNew]
		});
		iNew++;
	}
}

/**
 * Recursively diff two nested object arrays and generate corresponding patch
 * operations.
 *
 * @private
 * @param {module:x2node-records~PropertyDescriptor} propDesc Descriptor of the
 * nested objects array property.
 * @param {string} propPath JSON pointer path of the array property.
 * @param {Array.<Object>} arrOld Original array.
 * @param {Array.<Object>} arrNew New array.
 * @param {Array.<Object>} patchSpec The patch specification, to which to add
 * generated operations.
 */
function diffObjectArrays(propDesc, propPath, arrOld, arrNew, patchSpec) {

	const idPropName = propDesc.nestedProperties.idPropertyName;
	if (!idPropName)
		throw new common.X2UsageError(
			'Nested object elements without id property are not supported.');

	let iOld = 0, iNew = 0, t = 0;
	const lenOld = arrOld.length, lenNew = arrNew.length;

	while ((iOld < lenOld) && (iNew < lenNew)) {

		const valOld = arrOld[iOld];
		const valOldId = valOld[idPropName];
		const valNew = arrNew[iNew];

		if (valOldId === valNew[idPropName]) {
			diffObjects(
				propDesc.nestedProperties, `${propPath}/${t}/`,
				valOld, valNew, patchSpec);
			iOld++;
			iNew++;
			t++;
		} else {
			const si = iOld;
			let di = iNew;
			while ((di < lenNew) && (arrNew[di][idPropName] !== valOldId))
				di++;
			if (di < lenNew) {
				while (iNew < di) {
					patchSpec.push({
						op: 'add',
						path: `${propPath}/${t}`,
						value: arrNew[iNew]
					});
					iNew++;
					t++;
				}
				iOld++;
				iNew++;
				t++;
			} else {
				let sni = si + 1;
				while (sni < lenOld) {
					const vId = arrOld[sni][idPropName];
					for (di = iNew; di < lenNew; di++) {
						if (arrNew[di][idPropName] === vId)
							break;
					}
					if (di < lenNew) {
						break;
					} else {
						sni++;
					}
				}
				if (sni < lenOld) {
					while (iOld < sni) {
						patchSpec.push({
							op: 'remove',
							path: `${propPath}/${t + sni - iOld - 1}`
						});
						iOld++;
					}
					while (iNew < di) {
						patchSpec.push({
							op: 'add',
							path: `${propPath}/${t}`,
							value: arrNew[iNew]
						});
						iNew++;
						t++;
					}
					iOld++;
					iNew++;
					t++;
				} else {
					break;
				}
			}
		}
	}
	while (iOld++ < lenOld) {
		patchSpec.push({
			op: 'remove',
			path: `${propPath}/${t + lenOld - iOld}`
		});
	}
	while (iNew < lenNew) {
		patchSpec.push({
			op: 'add',
			path: `${propPath}/-`,
			value: arrNew[iNew]
		});
		iNew++;
	}
}

/**
 * Recursively diff two maps and generate corresponding patch operations.
 *
 * @private
 * @param {module:x2node-records~PropertyDescriptor} propDesc Descriptor of the
 * map property.
 * @param {string} propPath JSON pointer path of the map property.
 * @param {Object.<string,*>} mapOld Original map.
 * @param {Object.<string,*>} mapNew New map.
 * @param {Array.<Object>} patchSpec The patch specification, to which to add
 * generated operations.
 */
function diffMaps(propDesc, propPath, mapOld, mapNew, patchSpec) {

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
				path: `${propPath}/${ptrSafe(key)}`,
				value: valNew
			});
		} else if (objects) {
			diffObjects(
				propDesc.nestedProperties,
				`${propPath}/${ptrSafe(key)}/`,
				valOld, valNew, patchSpec);
		} else if (valNew !== valOld) {
			patchSpec.push({
				op: 'replace',
				path: `${propPath}/${ptrSafe(key)}`,
				value: valNew
			});
		}
	}

	for (let key of keysToRemove)
		patchSpec.push({
			op: 'remove',
			path: `${propPath}/${ptrSafe(key)}`
		});
}

/**
 * Make specified string safe to use in a JSON pointer.
 *
 * @private
 * @param {string} str The original string.
 * @returns {string} Pointer safe string.
 */
function ptrSafe(str) {

	return str.replace(/[~/]/g, m => (m === '~' ? '~0' : '~1'));
}

// export the differ function
exports.fromDiff = fromDiff;
