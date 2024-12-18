// Copyright (c) 2019, 2023, Oracle and/or its affiliates.

//-----------------------------------------------------------------------------
//
// This software is dual-licensed to you under the Universal Permissive License
// (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
// 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
// either license.
//
// If you elect to accept the software under the Apache License, Version 2.0,
// the following applies:
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// NAME
//   njsDbObject.c
//
// DESCRIPTION
//   Database-Object class implementation.
//
//-----------------------------------------------------------------------------

#include "njsModule.h"

// class methods
NJS_NAPI_METHOD_DECL_SYNC(njsDbObject_append);
NJS_NAPI_METHOD_DECL_SYNC(njsDbObject_copy);
NJS_NAPI_METHOD_DECL_SYNC(njsDbObject_deleteElement);
NJS_NAPI_METHOD_DECL_SYNC(njsDbObject_getAttrValue);
NJS_NAPI_METHOD_DECL_SYNC(njsDbObject_getElement);
NJS_NAPI_METHOD_DECL_SYNC(njsDbObject_getFirstIndex);
NJS_NAPI_METHOD_DECL_SYNC(njsDbObject_getKeys);
NJS_NAPI_METHOD_DECL_SYNC(njsDbObject_getLastIndex);
NJS_NAPI_METHOD_DECL_SYNC(njsDbObject_getLength);
NJS_NAPI_METHOD_DECL_SYNC(njsDbObject_getNextIndex);
NJS_NAPI_METHOD_DECL_SYNC(njsDbObject_getPrevIndex);
NJS_NAPI_METHOD_DECL_SYNC(njsDbObject_getValues);
NJS_NAPI_METHOD_DECL_SYNC(njsDbObject_hasElement);
NJS_NAPI_METHOD_DECL_SYNC(njsDbObject_setAttrValue);
NJS_NAPI_METHOD_DECL_SYNC(njsDbObject_setElement);
NJS_NAPI_METHOD_DECL_SYNC(njsDbObject_trim);

// finalize
static NJS_NAPI_FINALIZE(njsDbObject_finalize);
static NJS_NAPI_FINALIZE(njsDbObjectType_finalize);

// properties for collections
static const napi_property_descriptor njsClassProperties[] = {
    { "append", NULL, njsDbObject_append, NULL, NULL, NULL, napi_default,
            NULL },
    { "copy", NULL, njsDbObject_copy, NULL, NULL, NULL, napi_default, NULL },
    { "deleteElement", NULL, njsDbObject_deleteElement, NULL, NULL, NULL,
            napi_default, NULL },
    { "getAttrValue", NULL, njsDbObject_getAttrValue, NULL, NULL, NULL,
            napi_default, NULL },
    { "getElement", NULL, njsDbObject_getElement, NULL, NULL, NULL,
            napi_default, NULL },
    { "getFirstIndex", NULL, njsDbObject_getFirstIndex, NULL, NULL, NULL,
            napi_default, NULL },
    { "getKeys", NULL, njsDbObject_getKeys, NULL, NULL, NULL, napi_default,
            NULL },
    { "getLastIndex", NULL, njsDbObject_getLastIndex, NULL, NULL, NULL,
            napi_default, NULL },
    { "getNextIndex", NULL, njsDbObject_getNextIndex, NULL, NULL, NULL,
            napi_default, NULL },
    { "getPrevIndex", NULL, njsDbObject_getPrevIndex, NULL, NULL, NULL,
            napi_default, NULL },
    { "getValues", NULL, njsDbObject_getValues, NULL, NULL, NULL, napi_default,
            NULL },
    { "hasElement", NULL, njsDbObject_hasElement, NULL, NULL, NULL,
            napi_default, NULL },
    { "getLength", NULL, njsDbObject_getLength, NULL, NULL, NULL, napi_default,
            NULL },
    { "setAttrValue", NULL, njsDbObject_setAttrValue, NULL, NULL, NULL,
            napi_default, NULL },
    { "setElement", NULL, njsDbObject_setElement, NULL, NULL, NULL,
            napi_default, NULL },
    { "trim", NULL, njsDbObject_trim, NULL, NULL, NULL, napi_default, NULL },
    { NULL, NULL, NULL, NULL, NULL, NULL, napi_default, NULL }
};

// class definition
const njsClassDef njsClassDefDbObject = {
    "DbObjectImpl", sizeof(njsDbObject), njsDbObject_finalize,
    njsClassProperties, false
};

// other methods used internally
static bool njsDbObject_transformFromOracle(njsDbObject *obj, napi_env env,
        njsDataTypeInfo *typeInfo, dpiData *data, napi_value *value,
        njsDbObjectAttr *attr, njsModuleGlobals *globals);
static bool njsDbObject_transformToOracle(njsDbObject *obj, napi_env env,
        napi_value value, dpiOracleTypeNum oracleTypeNum,
        dpiNativeTypeNum *nativeTypeNum, dpiData *data, char **strBuffer,
        njsDbObjectAttr *attr, njsModuleGlobals *globals);
static bool njsDbObjectType_populate(njsDbObjectType *objType,
        dpiObjectType *objectTypeHandle, napi_env env, napi_value jsObjectType,
        dpiObjectTypeInfo *info, njsBaton *baton);
static bool njsDbObjectType_populateTypeInfo(njsDataTypeInfo *info,
        njsBaton *baton, napi_env env, dpiDataTypeInfo *sourceInfo);
static bool njsDbObject_wrap(napi_env env, napi_value value,
        njsDbObject **obj);
static napi_value njsDbObjectType_refCleanup(napi_env env,
        napi_callback_info info);


//-----------------------------------------------------------------------------
// njsDbObject_append()
//   Append an element to the end of the collection.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsDbObject_append, 1, &njsClassDefDbObject)
{
    dpiNativeTypeNum nativeTypeNum;
    njsDbObject *obj = (njsDbObject*) callingInstance;
    char *str = NULL;
    dpiData data;
    int status;

    nativeTypeNum = obj->type->elementTypeInfo.nativeTypeNum;
    if (!njsDbObject_transformToOracle(obj, env, args[0],
            obj->type->elementTypeInfo.oracleTypeNum, &nativeTypeNum, &data,
            &str, NULL, globals))
        return false;
    status = dpiObject_appendElement(obj->handle,
            nativeTypeNum, &data);
    if (str)
        free(str);
    if (status < 0)
        return njsUtils_throwErrorDPI(env, globals);
    return true;
}


//-----------------------------------------------------------------------------
// njsDbObject_copy()
//   Create a copy of the object and return that. The copy is independent of
// the original object that was copied.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsDbObject_copy, 0, &njsClassDefDbObject)
{
    njsDbObject *obj = (njsDbObject*) callingInstance;
    dpiObject *copiedObjHandle;
    bool ok;

    if (dpiObject_copy(obj->handle, &copiedObjHandle) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    ok = njsDbObject_new(obj->type, copiedObjHandle, env, globals,
            returnValue);
    dpiObject_release(copiedObjHandle);
    return ok;
}


//-----------------------------------------------------------------------------
// njsDbObject_deleteElement()
//   Returns the element at the specified index.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsDbObject_deleteElement, 1, &njsClassDefDbObject)
{
    njsDbObject *obj = (njsDbObject*) callingInstance;
    int32_t index;

    NJS_CHECK_NAPI(env, napi_get_value_int32(env, args[0], &index))
    if (dpiObject_deleteElementByIndex(obj->handle, index) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    return true;
}


//-----------------------------------------------------------------------------
// njsDbObject_finalize()
//   Invoked when njsDbObject is garbage collected.
//-----------------------------------------------------------------------------
static void njsDbObject_finalize(napi_env env, void *finalizeData,
        void *finalizeHint)
{
    njsDbObject *obj = (njsDbObject*) finalizeData;

    if (obj->handle) {
        dpiObject_release(obj->handle);
        obj->handle = NULL;
    }
    obj->type = NULL;
    free(obj);
}


//-----------------------------------------------------------------------------
// njsDbObject_getAttrValue()
//   Generic get accessor for attributes.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsDbObject_getAttrValue, 1, &njsClassDefDbObject)
{
    njsDbObject *obj = (njsDbObject*) callingInstance;
    njsDbObjectAttr *attr;
    dpiData data;

    NJS_CHECK_NAPI(env, napi_unwrap(env, args[0], (void**) &attr))
    if (dpiObject_getAttributeValue(obj->handle, attr->handle,
            attr->typeInfo.nativeTypeNum, &data) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    return njsDbObject_transformFromOracle(obj, env, &attr->typeInfo, &data,
            returnValue, attr, globals);
}


//-----------------------------------------------------------------------------
// njsDbObject_getElement()
//   Returns the element at the specified index.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsDbObject_getElement, 1, &njsClassDefDbObject)
{
    njsDbObject *obj = (njsDbObject*) callingInstance;
    int32_t index;
    dpiData data;

    NJS_CHECK_NAPI(env, napi_get_value_int32(env, args[0], &index))
    if (dpiObject_getElementValueByIndex(obj->handle, index,
            obj->type->elementTypeInfo.nativeTypeNum, &data) < 0 )
        return njsUtils_throwErrorDPI(env, globals);
    if (!njsDbObject_transformFromOracle(obj, env, &obj->type->elementTypeInfo,
            &data, returnValue, NULL, globals))
        return false;
    return true;
}


//-----------------------------------------------------------------------------
//  njsDbObject_getInstance()
//    Returns the instance associated with the object. Since objects may be
// created in JavaScript, an instance may not be associated at all. In that
// case, a new instance is created and associated with the object.
//-----------------------------------------------------------------------------
bool njsDbObject_getInstance(njsModuleGlobals *globals, napi_env env,
        napi_value jsObj, njsDbObject **obj)
{
    njsDbObject *tempObj = NULL;

    // if JavaScript object is wrapped, instance is returned immediately
    if (napi_unwrap(env, jsObj, (void**) obj) == napi_ok)
        return true;

    // perform wrap; the object handle will be NULL so create a new object of
    // that type
    if (!njsDbObject_wrap(env, jsObj, &tempObj))
        return false;
    if (dpiObjectType_createObject(tempObj->type->handle,
            &tempObj->handle) < 0)
        return njsUtils_throwErrorDPI(env, globals);

    *obj = tempObj;
    return true;
}


//-----------------------------------------------------------------------------
// njsDbObject_getFirstIndex()
//   Returns the first index in the collection.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsDbObject_getFirstIndex, 0, &njsClassDefDbObject)
{
    njsDbObject *obj = (njsDbObject*) callingInstance;
    int32_t index;
    int exists;

    if (dpiObject_getFirstIndex(obj->handle, &index, &exists) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    if (exists) {
        NJS_CHECK_NAPI(env, napi_create_int32(env, index, returnValue))
    }
    return true;
}


//-----------------------------------------------------------------------------
// njsDbObject_getKeys()
//   Returns the elements of the collection as a plain JavaScript array.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsDbObject_getKeys, 0, &njsClassDefDbObject)
{
    njsDbObject *obj = (njsDbObject*) callingInstance;
    int32_t index, exists, size;
    uint32_t arrayPos;
    napi_value temp;

    // determine the size of the collection and create an array of that length
    if (dpiObject_getSize(obj->handle, &size) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    NJS_CHECK_NAPI(env, napi_create_array_with_length(env, (size_t) size,
            returnValue))

    // iterate over the elements in the collection
    arrayPos = 0;
    if (dpiObject_getFirstIndex(obj->handle, &index, &exists) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    while (exists) {
        NJS_CHECK_NAPI(env, napi_create_int32(env, index, &temp))
        NJS_CHECK_NAPI(env, napi_set_element(env, *returnValue, arrayPos++,
                temp))
        if (dpiObject_getNextIndex(obj->handle, index, &index, &exists) < 0)
            return njsUtils_throwErrorDPI(env, globals);
    }
    return true;
}


//-----------------------------------------------------------------------------
// njsDbObject_getLastIndex()
//   Returns the last index in the collection.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsDbObject_getLastIndex, 0, &njsClassDefDbObject)
{
    njsDbObject *obj = (njsDbObject*) callingInstance;
    int32_t index;
    int exists;

    if (dpiObject_getLastIndex(obj->handle, &index, &exists) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    if (exists) {
        NJS_CHECK_NAPI(env, napi_create_int32(env, index, returnValue))
    }
    return true;
}


//-----------------------------------------------------------------------------
// njsDbObject_getLength()
//   Get accessor of "length" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsDbObject_getLength, 0, NULL)
{
    njsDbObject *obj = (njsDbObject*) callingInstance;
    int32_t size;

    if (dpiObject_getSize(obj->handle, &size) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    NJS_CHECK_NAPI(env, napi_create_int32(env, size, returnValue))
    return true;
}


//-----------------------------------------------------------------------------
// njsDbObject_getNextIndex()
//   Returns the next index in the collection following the one provided.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsDbObject_getNextIndex, 1, &njsClassDefDbObject)
{
    njsDbObject *obj = (njsDbObject*) callingInstance;
    int32_t index;
    int exists;

    NJS_CHECK_NAPI(env, napi_get_value_int32(env, args[0], &index))
    if (dpiObject_getNextIndex(obj->handle, index, &index, &exists) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    if (exists) {
        NJS_CHECK_NAPI(env, napi_create_int32(env, index, returnValue))
    }
    return true;
}


//-----------------------------------------------------------------------------
// njsDbObject_getPrevIndex()
//   Returns the previous index in the collection preceding the one provided.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsDbObject_getPrevIndex, 1, &njsClassDefDbObject)
{
    njsDbObject *obj = (njsDbObject*) callingInstance;
    int32_t index;
    int exists;

    NJS_CHECK_NAPI(env, napi_get_value_int32(env, args[0], &index))
    if (dpiObject_getPrevIndex(obj->handle, index, &index, &exists) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    if (exists) {
        NJS_CHECK_NAPI(env, napi_create_int32(env, index, returnValue))
    }
    return true;
}


//-----------------------------------------------------------------------------
//  njsDbObject_getSubClass()
//    Gets the sub class for the specified type.
//-----------------------------------------------------------------------------
bool njsDbObject_getSubClass(njsBaton *baton, dpiObjectType *objectTypeHandle,
        napi_env env, napi_value *cls, njsDbObjectType **objectType)
{
    napi_value fn, args[3], callingObj;
    njsDbObjectType *tempObjectType;
    dpiObjectTypeInfo info;

    // get object type information from ODPI-C
    if (dpiObjectType_getInfo(objectTypeHandle, &info) < 0)
        return njsBaton_setErrorDPI(baton);

    // call into JavaScript to get class (stored in cache on connection)
    NJS_CHECK_NAPI(env, napi_create_string_utf8(env, info.schema,
            info.schemaLength, &args[0]))
    NJS_CHECK_NAPI(env, napi_create_string_utf8(env, info.name,
            info.nameLength, &args[1]))
    NJS_CHECK_NAPI(env, napi_create_string_utf8(env, info.packageName,
            info.packageNameLength, &args[2]))
    NJS_CHECK_NAPI(env, napi_get_reference_value(env, baton->jsCallingObjRef,
            &callingObj))
    NJS_CHECK_NAPI(env, napi_get_named_property(env, callingObj,
            "_getDbObjectType", &fn))
    NJS_CHECK_NAPI(env, napi_call_function(env, callingObj, fn, 3, args, cls))

    // if it has already been wrapped, it has been fully populated and there is
    // no need to do anything further
    if (napi_unwrap(env, *cls, (void**) objectType) == napi_ok)
        return true;

    // allocate memory for structure; memory is zero-ed
    tempObjectType = (njsDbObjectType*) calloc(1, sizeof(njsDbObjectType));
    if (!tempObjectType)
        return njsUtils_throwInsufficientMemory(env);

    // populate object type (C) and prototype (JS) with all information about
    // the object type
    if (!njsDbObjectType_populate(tempObjectType, objectTypeHandle, env,
            *cls, &info, baton)) {
        njsDbObjectType_finalize(env, tempObjectType, NULL);
        return false;
    }

    // wrap the structure for use by JavaScript
    if (napi_wrap(env, *cls, tempObjectType, njsDbObjectType_finalize, NULL,
            NULL) != napi_ok) {
        njsUtils_genericThrowError(env, __FILE__, __LINE__);
        njsDbObjectType_finalize(env, tempObjectType, NULL);
        return false;
    }

    *objectType = tempObjectType;
    return true;
}


//-----------------------------------------------------------------------------
// njsDbObject_getValues()
//   Returns the elements of the collection as a plain JavaScript array.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsDbObject_getValues, 0, &njsClassDefDbObject)
{
    njsDbObject *obj = (njsDbObject*) callingInstance;
    int32_t index, exists, size;
    uint32_t arrayPos;
    napi_value temp;
    dpiData data;

    // determine the size of the collection and create an array of that length
    if (dpiObject_getSize(obj->handle, &size) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    NJS_CHECK_NAPI(env, napi_create_array_with_length(env, (size_t) size,
            returnValue))

    // iterate over the elements in the collection
    arrayPos = 0;
    if (dpiObject_getFirstIndex(obj->handle, &index, &exists) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    while (exists) {
        if (dpiObject_getElementValueByIndex(obj->handle, index,
                obj->type->elementTypeInfo.nativeTypeNum, &data) < 0)
            return njsUtils_throwErrorDPI(env, globals);
        if (!njsDbObject_transformFromOracle(obj, env,
                &obj->type->elementTypeInfo, &data, &temp, NULL, globals))
            return false;
        NJS_CHECK_NAPI(env, napi_set_element(env, *returnValue, arrayPos++,
                temp))
        if (dpiObject_getNextIndex(obj->handle, index, &index, &exists) < 0)
            return njsUtils_throwErrorDPI(env, globals);
    }
    return true;
}


//-----------------------------------------------------------------------------
// njsDbObject_hasElement()
//   Returns true or false indicating if an element exists at the specified
// index.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsDbObject_hasElement, 1, &njsClassDefDbObject)
{
    njsDbObject *obj = (njsDbObject*) callingInstance;
    int32_t index;
    int exists;

    NJS_CHECK_NAPI(env, napi_get_value_int32(env, args[0], &index))
    if (dpiObject_getElementExistsByIndex(obj->handle, index, &exists) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    NJS_CHECK_NAPI(env, napi_get_boolean(env, exists, returnValue))

    return true;
}


//-----------------------------------------------------------------------------
//  njsDbObject_new()
//    To create a new instance of njsDbObject
//-----------------------------------------------------------------------------
bool njsDbObject_new(njsDbObjectType *objType, dpiObject *objHandle,
        napi_env env, njsModuleGlobals *globals, napi_value *value)
{
    napi_value jsDbObjectType;
    njsDbObject *obj;

    // create new object
    if (!njsUtils_genericNew(env, &njsClassDefDbObject,
            globals->jsDbObjectConstructor, value, (void**) &obj))
        return false;

    // get the object type and store a reference to it on the new object
    NJS_CHECK_NAPI(env, napi_get_reference_value(env,
            objType->jsDbObjectType, &jsDbObjectType))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, *value, "_objType",
            jsDbObjectType))

    // transfer handle to instance
    if (dpiObject_addRef(objHandle) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    obj->handle = objHandle;
    obj->type = objType;

    return true;
}


//-----------------------------------------------------------------------------
// njsDbObject_setAttrValue()
//   Generic set accessor for attributes.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsDbObject_setAttrValue, 2, &njsClassDefDbObject)
{
    dpiNativeTypeNum nativeTypeNum;
    njsDbObject *obj = (njsDbObject*) callingInstance;
    njsDbObjectAttr *attr;
    char *str = NULL;
    dpiData data;
    int status;

    // get object instance and validate number of arguments
    NJS_CHECK_NAPI(env, napi_unwrap(env, args[0], (void**) &attr))

    // transform to value required by ODPI-C
    nativeTypeNum = attr->typeInfo.nativeTypeNum;
    if (!njsDbObject_transformToOracle(obj, env, args[1],
            attr->typeInfo.oracleTypeNum, &nativeTypeNum, &data, &str, attr,
            globals))
        return false;

    // set value
    status = dpiObject_setAttributeValue(obj->handle, attr->handle,
            nativeTypeNum, &data);
    if (str)
        free(str);
    if (status < 0)
        return njsUtils_throwErrorDPI(env, globals);

    return true;
}


//-----------------------------------------------------------------------------
// njsDbObject_setElement()
//   Sets the element at the specified index to the specified value.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsDbObject_setElement, 2, &njsClassDefDbObject)
{
    dpiNativeTypeNum nativeTypeNum;
    njsDbObject *obj = (njsDbObject*) callingInstance;
    char *str = NULL;
    int32_t index;
    dpiData data;
    int status;

    NJS_CHECK_NAPI(env, napi_get_value_int32(env, args[0], &index))

    nativeTypeNum = obj->type->elementTypeInfo.nativeTypeNum;
    if (!njsDbObject_transformToOracle(obj, env, args[1],
            obj->type->elementTypeInfo.oracleTypeNum, &nativeTypeNum, &data,
            &str, NULL, globals))
        return false;
    status = dpiObject_setElementValueByIndex(obj->handle, index,
            nativeTypeNum, &data);
    if (str)
        free(str);
    if (status < 0)
        return njsUtils_throwErrorDPI(env, globals);
    return true;
}


//-----------------------------------------------------------------------------
// njsDbObject_transformFromOracle()
//   Transforms the value from what was returned by ODPI-C into the value
// expected by JavaScript.
//-----------------------------------------------------------------------------
static bool njsDbObject_transformFromOracle(njsDbObject *obj, napi_env env,
        njsDataTypeInfo *typeInfo, dpiData *data, napi_value *value,
        njsDbObjectAttr *attr, njsModuleGlobals *globals)
{
    napi_value jsDbObjectType, makeDateFn, temp;
    njsLobBuffer lobBuffer;
    bool ok;

    // handle null values
    if (data->isNull) {
        NJS_CHECK_NAPI(env, napi_get_null(env, value))
        return true;
    }

    // transform other values
    switch (typeInfo->oracleTypeNum) {
        case DPI_ORACLE_TYPE_CHAR:
        case DPI_ORACLE_TYPE_NCHAR:
        case DPI_ORACLE_TYPE_VARCHAR:
        case DPI_ORACLE_TYPE_NVARCHAR:
            NJS_CHECK_NAPI(env, napi_create_string_utf8(env,
                    data->value.asBytes.ptr, data->value.asBytes.length,
                    value))
            return true;
        case DPI_ORACLE_TYPE_RAW:
            NJS_CHECK_NAPI(env, napi_create_buffer_copy(env,
                    data->value.asBytes.length, data->value.asBytes.ptr, NULL,
                    value))
            return true;
        case DPI_ORACLE_TYPE_NUMBER:
            if (typeInfo->nativeTypeNum == DPI_NATIVE_TYPE_INT64) {
                NJS_CHECK_NAPI(env, napi_create_int64(env, data->value.asInt64,
                        value))
            } else {
                NJS_CHECK_NAPI(env, napi_create_double(env,
                        data->value.asDouble, value))
            }
            return true;
        case DPI_ORACLE_TYPE_NATIVE_INT:
            NJS_CHECK_NAPI(env, napi_create_int64(env, data->value.asInt64,
                    value))
            return true;
        case DPI_ORACLE_TYPE_NATIVE_FLOAT:
            NJS_CHECK_NAPI(env, napi_create_double(env, data->value.asFloat,
                    value))
            return true;
        case DPI_ORACLE_TYPE_NATIVE_DOUBLE:
            NJS_CHECK_NAPI(env, napi_create_double(env, data->value.asDouble,
                    value))
            return true;
        case DPI_ORACLE_TYPE_DATE:
        case DPI_ORACLE_TYPE_TIMESTAMP:
        case DPI_ORACLE_TYPE_TIMESTAMP_TZ:
        case DPI_ORACLE_TYPE_TIMESTAMP_LTZ:
            NJS_CHECK_NAPI(env, napi_get_reference_value(env,
                    globals->jsMakeDateFn, &makeDateFn))
            return njsUtils_getDateValue(typeInfo->oracleTypeNum, env,
                    makeDateFn, &data->value.asTimestamp, value);
        case DPI_ORACLE_TYPE_CLOB:
        case DPI_ORACLE_TYPE_NCLOB:
        case DPI_ORACLE_TYPE_BLOB:
            lobBuffer.dataType = typeInfo->oracleTypeNum;
            lobBuffer.handle = data->value.asLOB;
            if (dpiLob_getChunkSize(lobBuffer.handle,
                    &lobBuffer.chunkSize) < 0)
                return njsUtils_throwErrorDPI(env, globals);
            if (dpiLob_getSize(lobBuffer.handle, &lobBuffer.length) < 0)
                return njsUtils_throwErrorDPI(env, globals);
            NJS_CHECK_NAPI(env, napi_get_reference_value(env,
                    obj->type->jsDbObjectType, &jsDbObjectType))
            NJS_CHECK_NAPI(env, napi_get_named_property(env, jsDbObjectType,
                    "_connection", &temp))
            if (!njsLob_new(globals, &lobBuffer, env, temp, value))
                return false;
            if (dpiLob_addRef(data->value.asLOB) < 0)
                return njsUtils_throwErrorDPI(env, globals);
            return true;
        case DPI_ORACLE_TYPE_OBJECT:
            ok = njsDbObject_new(typeInfo->objectType, data->value.asObject,
                    env, globals, value);
            dpiObject_release(data->value.asObject);
            return ok;
        case DPI_ORACLE_TYPE_BOOLEAN:
            NJS_CHECK_NAPI(env, napi_get_boolean(env, data->value.asBoolean,
                    value))
            return true;
        default:
            break;
    }

    // unsupported
    return njsUtils_genericThrowError(env, __FILE__, __LINE__);
}


//-----------------------------------------------------------------------------
// njsDbObject_transformToOracle()
//   Transforms a JavaScript value into the value that ODPI-C expects.
//-----------------------------------------------------------------------------
static bool njsDbObject_transformToOracle(njsDbObject *obj, napi_env env,
        napi_value value, dpiOracleTypeNum oracleTypeNum,
        dpiNativeTypeNum *nativeTypeNum, dpiData *data, char **strBuffer,
        njsDbObjectAttr *attr, njsModuleGlobals *globals)
{
    napi_value constructor, getComponentsFn;
    napi_valuetype valueType;
    njsDbObject *valueObj;
    bool check, tempBool;
    void *bufferData;
    size_t length;

    data->isNull = 0;
    *strBuffer = NULL;
    NJS_CHECK_NAPI(env, napi_typeof(env, value, &valueType))
    switch (valueType) {

        // null and undefined are treated as Oracle null values
        case napi_null:
        case napi_undefined:
            dpiData_setNull(data);
            return true;

        // strings are handled as bytes; the buffer is retained so it can be
        // freed by the caller when it is finished with it
        case napi_string:
            if (!njsUtils_copyStringFromJS(env, value, strBuffer, &length))
                return false;
            *nativeTypeNum = DPI_NATIVE_TYPE_BYTES;
            dpiData_setBytes(data, *strBuffer, (uint32_t) length);
            return true;

        // numbers are handled as doubles in JavaScript
        case napi_number:
            NJS_CHECK_NAPI(env, napi_get_value_double(env, value,
                    &data->value.asDouble));
            *nativeTypeNum = DPI_NATIVE_TYPE_DOUBLE;
            return true;

        // handle booleans
        case napi_boolean:
            NJS_CHECK_NAPI(env, napi_get_value_bool(env, value, &tempBool))
            *nativeTypeNum = DPI_NATIVE_TYPE_BOOLEAN;
            data->value.asBoolean = (int) tempBool;
            return true;

        // several types of objects are supported
        case napi_object:

            // handle dates
            NJS_CHECK_NAPI(env, napi_is_date(env, value, &check))
            if (check) {
                NJS_CHECK_NAPI(env, napi_get_reference_value(env,
                        globals->jsGetDateComponentsFn, &getComponentsFn))
                *nativeTypeNum = DPI_NATIVE_TYPE_TIMESTAMP;
                return njsUtils_setDateValue(oracleTypeNum, env, value,
                        getComponentsFn, &data->value.asTimestamp);
            }

            // handle buffers
            NJS_CHECK_NAPI(env, napi_is_buffer(env, value, &check))
            if (check) {
                NJS_CHECK_NAPI(env, napi_get_buffer_info(env, value,
                        &bufferData, &length))
                dpiData_setBytes(data, bufferData, (uint32_t) length);
                *nativeTypeNum = DPI_NATIVE_TYPE_BYTES;
                return true;
            }

            // handle database objects
            NJS_CHECK_NAPI(env, napi_get_reference_value(env,
                    globals->jsDbObjectConstructor, &constructor))
            NJS_CHECK_NAPI(env, napi_instanceof(env, value, constructor,
                    &check))
            if (check) {
                if (!njsDbObject_getInstance(globals, env, value, &valueObj))
                    return false;
                dpiData_setObject(data, valueObj->handle);
                *nativeTypeNum = DPI_NATIVE_TYPE_OBJECT;
                return true;
            }

            break;

        // no other types are supported
        default:
            break;
    }

    return njsUtils_genericThrowError(env, __FILE__, __LINE__);
}


//-----------------------------------------------------------------------------
// njsDbObject_trim()
//   Trim the specified number of elements from the end of the collection.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsDbObject_trim, 1, &njsClassDefDbObject)
{
    njsDbObject *obj = (njsDbObject*) callingInstance;
    uint32_t numToTrim;

    NJS_CHECK_NAPI(env, napi_get_value_uint32(env, args[0], &numToTrim))
    if (dpiObject_trim(obj->handle, numToTrim) < 0)
        return njsUtils_throwErrorDPI(env, globals);

    return true;
}


//-----------------------------------------------------------------------------
// njsDbObject_wrap()
//   Wraps the specified value with a new object instance and performs basic
// initialization, if needed. For collections which are proxied, the proxy
// target may already have been wrapped, so check for that first before
// creating a new instance.
//-----------------------------------------------------------------------------
static bool njsDbObject_wrap(napi_env env, napi_value jsObj, njsDbObject **obj)
{
    njsDbObjectType *objType;
    njsDbObject *tempObj;
    napi_value temp;

    // acquire JS object type and unwrap it
    NJS_CHECK_NAPI(env, napi_get_named_property(env, jsObj, "_objType", &temp))
    NJS_CHECK_NAPI(env, napi_unwrap(env, temp, (void**) &objType))

    // create a new object instance
    tempObj = calloc(1, sizeof(njsDbObject));
    if (!tempObj)
        return njsUtils_throwInsufficientMemory(env);
    tempObj->type = objType;
    if (napi_wrap(env, jsObj, tempObj, njsDbObject_finalize, NULL,
            NULL) != napi_ok) {
        free(tempObj);
        return njsUtils_genericThrowError(env, __FILE__, __LINE__);
    }

    *obj = tempObj;
    return true;
}


//-----------------------------------------------------------------------------
// njsDbObjectType_finalize()
//   Invoked when njsDbObjectType is garbage collected.
//-----------------------------------------------------------------------------
static void njsDbObjectType_finalize(napi_env env, void *finalizeData,
        void *finalizeHint)
{
    njsDbObjectType *type = (njsDbObjectType*) finalizeData;
    njsDbObjectAttr *attr;
    uint16_t i;

    if (type->attributes) {
        for (i = 0; i < type->numAttributes; i++) {
            attr = &type->attributes[i];
            if (attr->handle) {
                dpiObjectAttr_release(attr->handle);
                attr->handle = NULL;
            }
        }
        free(type->attributes);
        type->attributes = NULL;
    }
    if (type->handle) {
        dpiObjectType_release(type->handle);
        type->handle = NULL;
    }
    NJS_DELETE_REF_AND_CLEAR(type->jsDbObjectType);
    NJS_FREE_AND_CLEAR(type->fqn);
    free(type);
}

//-----------------------------------------------------------------------------
// njsDbObjectType_refCleanup()
//   Invoked when njsDbObjectType reference count needs to be decremented.
//   This is required for the clean up of obj type reference created
//   in njsDbObjectType_populate.
//-----------------------------------------------------------------------------
static napi_value njsDbObjectType_refCleanup(napi_env env,
        napi_callback_info info)
{
    njsDbObjectType *type;

    napi_get_cb_info(env, info, NULL, NULL, NULL, (void**) &type);
    NJS_DELETE_REF_AND_CLEAR(type->jsDbObjectType);
    return NULL;
}

//-----------------------------------------------------------------------------
// njsDbObjectType_populate()
//   Populates the object type and its JS equivalent with information about the
// object type.
//-----------------------------------------------------------------------------
static bool njsDbObjectType_populate(njsDbObjectType *objType,
        dpiObjectType *objectTypeHandle, napi_env env, napi_value jsObjectType,
        dpiObjectTypeInfo *info, njsBaton *baton)
{
    dpiObjectAttr **attrHandles;
    dpiObjectAttrInfo attrInfo;
    napi_value attrs, temp, elementTypeInfo;
    njsDbObjectAttr *attr;
    napi_value element;
    uint16_t i;

    // transfer basic data to instance
    if (dpiObjectType_addRef(objectTypeHandle) < 0)
        return njsBaton_setErrorDPI(baton);
    objType->handle = objectTypeHandle;
    objType->numAttributes = info->numAttributes;

    // transfer attribute information to instance
    if (info->numAttributes > 0) {

        // allocate space for attributes
        objType->attributes = calloc(info->numAttributes,
                sizeof(njsDbObjectAttr));
        if (!objType->attributes)
            return njsBaton_setErrorInsufficientMemory(baton);

        // determine the attributes associated with the object type
        attrHandles = calloc(info->numAttributes, sizeof(dpiObjectAttr*));
        if (!attrHandles)
            return njsBaton_setErrorInsufficientMemory(baton);
        if (dpiObjectType_getAttributes(objectTypeHandle,
                objType->numAttributes, attrHandles) < 0) {
            free(attrHandles);
            return njsBaton_setErrorDPI(baton);
        }

        // transfer handle to attribute structure
        for (i = 0; i < info->numAttributes; i++)
            objType->attributes[i].handle = attrHandles[i];
        free(attrHandles);

    }

    // process collections object types
    if (info->isCollection) {
        if (!njsDbObjectType_populateTypeInfo(&objType->elementTypeInfo,
                baton, env, &info->elementTypeInfo))
            return false;
        if (!njsUtils_addTypeProperties(env, jsObjectType, "elementType",
                info->elementTypeInfo.oracleTypeNum,
                objType->elementTypeInfo.objectType))
            return false;
        NJS_CHECK_NAPI(env, napi_create_object(env, &elementTypeInfo))
        if (!njsUtils_addMetaDataProperties(env, elementTypeInfo,
                &info->elementTypeInfo))
            return false;
        NJS_CHECK_NAPI(env, napi_set_named_property(env, jsObjectType,
                "elementTypeInfo", elementTypeInfo))

    // process object types with attributes
    } else {
        NJS_CHECK_NAPI(env, napi_create_array_with_length(env,
                info->numAttributes, &attrs))
        for (i = 0; i < info->numAttributes; i++) {
            attr = &objType->attributes[i];
            if (dpiObjectAttr_getInfo(attr->handle, &attrInfo) < 0)
                return njsBaton_setErrorDPI(baton);
            attr->name = attrInfo.name;
            attr->nameLength = attrInfo.nameLength;
            attr->globals = baton->globals;
            if (!njsDbObjectType_populateTypeInfo(&attr->typeInfo,
                    baton, env, &attrInfo.typeInfo))
                return false;
            NJS_CHECK_NAPI(env, napi_create_object(env, &element))
            NJS_CHECK_NAPI(env, napi_create_string_utf8(env, attrInfo.name,
                    attrInfo.nameLength, &temp))
            NJS_CHECK_NAPI(env, napi_set_named_property(env, element, "name",
                    temp))
            if (!njsUtils_addTypeProperties(env, element, "type",
                    attrInfo.typeInfo.oracleTypeNum,
                    attr->typeInfo.objectType))
                return false;
            if (!njsUtils_addMetaDataProperties(env, element,
                    &attrInfo.typeInfo))
                return false;
            NJS_CHECK_NAPI(env, napi_wrap(env, element, attr, NULL, NULL,
                    NULL))
            NJS_CHECK_NAPI(env, napi_set_element(env, attrs, i, element))
        }
        NJS_CHECK_NAPI(env, napi_set_named_property(env, jsObjectType,
                "attributes", attrs))
    }

    // keep a reference to the constructor
    NJS_CHECK_NAPI(env, napi_create_reference(env, jsObjectType, 1,
            &objType->jsDbObjectType))

    // keep a copy of the name to be used in error messages; include enough
    // space for the trailing NULL character even though it is never used
    objType->fqnLength = info->schemaLength + info->nameLength + 1;
    objType->fqn = malloc(objType->fqnLength + 1);
    if (!objType->fqn)
        return njsBaton_setErrorInsufficientMemory(baton);
    (void) snprintf(objType->fqn, objType->fqnLength + 1, "%.*s.%.*s",
            (int) info->schemaLength, info->schema, (int) info->nameLength,
            info->name);

    // set whether or not the class is a collection or not
    NJS_CHECK_NAPI(env, napi_get_boolean(env, info->isCollection, &temp))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, jsObjectType,
            "isCollection", temp))

    // cleanup function
    NJS_CHECK_NAPI(env, napi_create_function(env, "refCleanup", NAPI_AUTO_LENGTH,
            njsDbObjectType_refCleanup, objType, &temp))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, jsObjectType, "refCleanup",
             temp))
    return true;
}


//-----------------------------------------------------------------------------
// njsDbObjectType_populateTypeInfo()
//   Populates type information. Acquires the object type, if needed. Modifies
// the native type to double for all dates.
//-----------------------------------------------------------------------------
static bool njsDbObjectType_populateTypeInfo(njsDataTypeInfo *info,
        njsBaton *baton, napi_env env, dpiDataTypeInfo *sourceInfo)
{
    napi_value temp;

    info->oracleTypeNum = sourceInfo->oracleTypeNum;
    info->nativeTypeNum = sourceInfo->defaultNativeTypeNum;
    info->precision = sourceInfo->precision;
    info->scale = sourceInfo->scale;
    info->dbSizeInBytes = sourceInfo->dbSizeInBytes;
    if (sourceInfo->objectType) {
        return njsDbObject_getSubClass(baton, sourceInfo->objectType, env,
                &temp, &info->objectType);
    }
    return true;
}
