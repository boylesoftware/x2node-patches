# X2 Framework for Node.js | JSON Patch and Pointer

This is module is an implementation of JSON Patch ([RFC 6902](https://tools.ietf.org/html/rfc6902)) and JSON Pointer ([RFC 6901](https://tools.ietf.org/html/rfc6901)) for use with the record objects as defined by the X2 Framework's [x2node-records](https://www.npmjs.com/package/x2node-records) module.

## Table of Contents

* [Property Pointers](#property-pointers)

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

* `getValue(record)` - Given a record, gets value of the property, at which the pointer points. Returns `null` if no value. For absent array and map elements returns `undefined`. Throws `X2DataError` if the property cannot be reached.

* `addValue(record, value)` - Adds value to the property, at which the pointer points in the given record. If the pointer points at an array element, the value is inserted into the array at the specified by the pointer location. In all other cases, any existing value is simply replaced.

* `replaceValue(record, value)` - Like `addValue()`, but replaces an existing array element instead of inserting the value in front of it.

* `removeValue(record)` - Erase the property, at which the pointer points in the given object. If the pointer points at an array element, the element is deleted from the array and the following elements, if any, are shifted left into its place.

* `toString()` - Get string representation of the pointer as specified in RFC 6901.

Note, that `addValue()`, `replaceValue()` and `removeValue()` methods are not allowed on a root pointer. Also, `addValue()` and `replaceValue()` methods cannot take `undefined` for the value to set and `null` is not allowed for nested object array and map elements. Beyond that, the methods make no checks for the value type whether it matches the property or not.
