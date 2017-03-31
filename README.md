# X2 Framework for Node.js | JSON Patch and Pointer

This is module is an implementation of JSON Patch ([RFC 6902](https://tools.ietf.org/html/rfc6902)) and JSON Pointer ([RFC 6901](https://tools.ietf.org/html/rfc6901)) for use with the record objects as defined by the X2 Framework's [x2node-records](https://www.npmjs.com/package/x2node-records) module.

## Table of Contents

* [Property Pointers](#property-pointers)
* [Record Patch](#record-patch)

## Property Pointers

A JSON pointer against a record can be parsed into a `PropertyPointer` class object using module's `parseJSONPointer()` function:

```javascript
const records = require('x2node-records');
const patch = require('x2node-patch');

const recordTypes = records.buildLibrary({
	...
});

const ptr = patch.parseJSONPointer(
	recordTypes.getRecordTypeDesc('Order'), '/items/0/quantity');
```

The function takes the following arguments:

* `recordTypeDesc` - `RecordTypeDescriptor` for the record type, against which the pointer is going to be used.

* `propPointer` - The pointer string.

* `noDash` - `true` to disallow dash at the end of an array element pointer. Such dash pointer is allowed only in certain contexts (such as JSON Patch "add" operation, for example), so this flag allows disallowing it at the pointer parse step.

The returned `PropertyPointer` object exposes the following properties and methods:

* `isRoot()` - Returns `true` if the pointer is a root pointer. A root pointer corresponds to an empty string and points to the record as a whole.

* `isChildOf(otherPtr)` - Returns `true` if the pointer points to a child location of the specified other pointer (that is the other pointer is a "proper prefix" of this pointer). For example, will always return `true` if the other pointer is a root pointer and this one is not.

* `propDesc` - `PropertyDescriptor` of the property, at which the pointer points. For an array or map element pointer, the property descriptor of the array or map property but the pointer object's `collectionElement` flag is set to indicate that it is for an element and not the whole array or map property. For the root pointer this property is `null`.

* `propPath` - Property path corresponding to `propDesc`, or `null` for the root pointer.

* `collectionElement` - `true` if the pointer is for an array or map property element.

* `getValue(record, [traceFunc])` - Given a record, gets value of the property, at which the pointer points. Returns `null` if no value. For absent array and map elements returns `undefined`. Throws `X2DataError` if the property cannot be reached.

	Optionally, a trace callback function can be provided with the `getValue()` call. The trace callback function is called for every prefix pointer starting with the root pointer and ending with the leaf pointer itself. So, for example, for a pointer "/a/b/c" it will be called four times: first for the root pointer (empty string), then for "/a", then for "/a/b", and finally for "/a/b/c". The callback function receives the following arguments:

	* `prefixPtr` - The current prefix pointer (instance of `PropertyPointer`).

	* `value` - The value in the record for the current prefix pointer.

	* `prefixDepth` - Integer number representing the prefix depth. For the last call, it is zero. For the call before the last it is one, and so on. The first call (the one with the root prefix pointer), therefore, gets the number of tokens in the pointer.

* `addValue(record, value)` - Adds value to the property, at which the pointer points in the given record. If the pointer points at an array element, the value is inserted into the array at the specified by the pointer location. In all other cases, any existing value is simply replaced.

* `replaceValue(record, value)` - Like `addValue()`, but replaces an existing array element instead of inserting the value in front of it.

* `removeValue(record)` - Erase the property, at which the pointer points in the given object. If the pointer points at an array element, the element is deleted from the array and the following elements, if any, are shifted left into its place.

* `toString()` - Get string representation of the pointer as specified in RFC 6901.

Note, that `addValue()`, `replaceValue()` and `removeValue()` methods are not allowed on a root pointer. Also, `addValue()` and `replaceValue()` methods cannot take `undefined` for the value to set and `null` is not allowed for nested object array and map elements. Beyond that, the methods make no checks for the value type whether it matches the property or not.

## Record Patch

The second piece of the module is an implementation of RFC 6902 JSON Patch specific to the X2 Framework's records notion. A patch is represented by a `RecordPatch` class object and is parsed from the JSON using module's `buildJSONPatch()` function. For example:

```javascript
const records = require('x2node-records');
const patch = require('x2node-patch');

const recordTypes = records.buildLibrary({
	...
});

// parse the patch
const p = patch.buildJSONPatch(recordTypes, 'Order', [
	{ "op": "test", "path": "/a/b/c", "value": "foo" },
	{ "op": "remove", "path": "/a/b/c" },
	{ "op": "add", "path": "/a/b/c", "value": [ "foo", "bar" ] },
	{ "op": "replace", "path": "/a/b/c", "value": 42 },
	{ "op": "move", "from": "/a/b/c", "path": "/a/b/d" },
	{ "op": "copy", "from": "/a/b/d", "path": "/a/b/e" }
]);

// apply patch to a record
const order = ...
p.apply(order);
```

The `buildJSONPatch()` function takes the following arguments:

* `recordTypes` - A `RecordTypesLibrary` instance.

* `recordTypeName` - Name of the record type, against records of which the patch is going to be applied.

* `patch` - The JSON patch specification according to the RFC 6902 specification.

If anything goes wrong with the provided arguments, the function throws an `X2UsageError`. Otherwise, it returns a `RecordPatch` instance, which exposes the following properties and methods:

* `involvedPropPaths` - A `Set` of paths (in dot notation) of all record properties involved (read, erased and updated) in the patch.

* `apply(record, [handlers])` - Applies the patch to the specified record. If the record is not good for the patch (e.g. some properties are missing that are expected to be present by the patch specification), the method throws an `X2DataError`. Otherwise, it makes the necessary modifications to the provided record object and returns either `true` if all good, or `false` if a "test" patch operation fails. Note, that the method does not provide transactionality, so in case of an error or a failed "test" operation the provided record object may be left partially modified.

Optionally, the `apply()` method can be provided with a `handlers` object that implements `RecordPatchHandlers` interface. The interface methods on the object, if present, are invoked during the patch application to notify it about the changes that the patch is making to the record as it goes through the patch operations. The methods are:

* `onInsert(op, ptr, value)` - Called when a value is added to an array or map property as a result of an "add", "move" or "copy" patch operation. The `op` argument is the operation, which can be "add", "move" or "copy". The `ptr` is a `PropertyPointer` pointing at the array or map element, and the `value` is the value being inserted. The value may be `null` for a simple (non nested object) value array or map element, but never `undefined`.

* `onRemove(op, ptr)` - Called when a value is removed from an array or map property as a result of a "remove" or "move" patch operation. The `op` argument is the operation, which can be "remove" or "move". The `ptr` is a `PropertyPointer` pointing at the array or map element.

* `onSet(op, ptr, value)` - Called when a value is set to a property (or an array or a map element is replaced) as a result of an "add", "remove" (the `value` is `null`), "replace", "move" or "copy" patch operation. The `op` argument is the operation, which can be "add", "remove", "replace", "move" or "copy". The `ptr` is a `PropertyPointer`, and the `value` is the value being set. The value may be `null` but never `undefined`.

* `onTest(ptr, value, passed)` - Called when a property value is tested as a result of a "test" patch operation. The `ptr` is a `PropertyPointer` pointing at the property, `value` is the value, against which it is tested and `passed` is `true` if the test was successful.

The methods are called only if present on the provided `handlers` object and only if the record is actually modified as a result of the operation (except the `onTest()`, which does not modify the record and is called always, if present).
