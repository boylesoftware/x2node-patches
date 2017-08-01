# X2 Framework for Node.js | JSON Patches

This module is an implementation of _JSON Patch_ ([RFC 6902](https://tools.ietf.org/html/rfc6902)) for use with the record objects as defined by the X2 Framework's [x2node-records](https://www.npmjs.com/package/x2node-records) module. Given patch specification JSON, the module builds a patch object that can be applied to records of the specified type.

The module also supports _Merge Patch_ specification ([RFC 7396](https://tools.ietf.org/html/rfc7396)).

See module's [API Reference Documentation](https://boylesoftware.github.io/x2node-api-reference/module-x2node-patches.html).

## Usage

A patch is represented by a `RecordPatch` class object and is parsed from the JSON using module's `build()` function. For example:

```javascript
const records = require('x2node-records');
const patches = require('x2node-patches');

const recordTypes = records.buildLibrary({
    recordTypes: {
        'Order': {
            ...
        },
        ...
    }
});

// build the patch
const patch = patches.build(recordTypes, 'Order', [
    { "op": "test", "path": "/a/b/c", "value": "foo" },
    { "op": "remove", "path": "/a/b/c" },
    { "op": "add", "path": "/a/b/c", "value": [ "foo", "bar" ] },
    { "op": "replace", "path": "/a/b/c", "value": 42 },
    { "op": "move", "from": "/a/b/c", "path": "/a/b/d" },
    { "op": "copy", "from": "/a/b/d", "path": "/a/b/e" }
]);

// apply patch to a record
const order = ...
patch.apply(order);
```

The `build()` function takes the following arguments:

* `recordTypes` - A `RecordTypesLibrary` instance.

* `recordTypeName` - Name of the record type, against records of which the patch is going to be applied.

* `patch` - The JSON patch specification according to the RFC 6902 specification.

If the record type is invalid, an `X2UsageError` is thrown. If anything is wrong with the provided patch specification, the function throws an `X2SyntaxError`. Otherwise, it returns a `RecordPatch` instance, which exposes the following properties and methods:

* `involvedPropPaths` - A `Set` of paths (in dot notation) of all record properties involved (read, erased and updated) in the patch.

* `updatedPropPaths` - A `Set` of paths (in dot notaion) of those properties that may be updated by the patch, including paths of all parent properties of updated nested object properties. It will exclude properties that are only involved in "test" operations or as "from" properties of "copy" operations. Note that whether the patch actually changes the property value will depend on the current value in the supplied record. Naturally, if the value is the same, it won't change even though the property is still listed in the `updatedPropPaths`.

* `apply(record, [handlers])` - Applies the patch to the specified record. If the record is not good for the patch (e.g. some properties are missing that are expected to be present by the patch specification), the method throws an `X2DataError`. Otherwise, it makes the necessary modifications to the provided record object and returns either `true` if all good, or `false` if a "test" patch operation fails. Note, that the method does not provide transactionality, so in case of an error or a failed "test" operation the provided record object may be left partially modified.

Optionally, the `apply()` method can be provided with a `handlers` object that implements `RecordPatchHandlers` interface. The interface methods on the object, if present, are invoked during the patch application to notify it about the changes that the patch is making to the record as it goes through the patch operations. The methods are:

* `onInsert(op, ptr, newValue, oldValue)` - Called when a value is added to an array or map property as a result of an "add", "move" or "copy" patch operation. The `op` argument is the operation, which can be "add", "move" or "copy". The `ptr` is a `RecordElementPointer` from the `x2node-pointers` module pointing at the array or map element, and the `newValue` is the value being inserted. The value may be `null` for a simple (non nested object) value array or map element, but never `undefined`. The `oldValue` is the previous value at the pointer location as would be returned by the pointer's `getValue()` method.

* `onRemove(op, ptr, oldValue)` - Called when a value is removed from an array or map property as a result of a "remove" or "move" patch operation. The `op` argument is the operation, which can be "remove" or "move". The `ptr` is a `RecordElementPointer` pointing at the array or map element. The `oldValue` is the previous value at the pointer location.

* `onSet(op, ptr, newValue, oldValue)` - Called when a value is set to a property (or an array or a map element is replaced) as a result of an "add", "remove" (the `newValue` is `null`), "replace", "move" or "copy" patch operation. The `op` argument is the operation, which can be "add", "remove", "replace", "move" or "copy". The `ptr` is a `RecordElementPointer`, and the `value` is the value being set. The value may be `null` but never `undefined`. The `oldValue` is the previous value at the pointer location.

* `onTest(ptr, value, passed)` - Called when a property value is tested as a result of a "test" patch operation. The `ptr` is a `RecordElementPointer` pointing at the property, `value` is the value, against which it is tested and `passed` is `true` if the test was successful.

The methods are called only if present on the provided `handlers` object and only if the record is actually modified as a result of the operation (except the `onTest()`, which does not modify the record and is called always, if present).

Alternatively, instead of _JSON Patch_ the patch may be specified using _Merge Patch_ format:

```javascript
const patch = patches.buildMerge(recordTypes, 'Order', {
    quantity: 10,
    status: 'ADJUSTED'
});
```

The only different is that `buildMerge()` function is used instead of the regular `build()`. The resulting patch object follows the same specification as described above.
