// Copyright (c) 2018, 2025, Oracle and/or its affiliates.

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
//   njsSodaDatabase.c
//
// DESCRIPTION
//   SodaDatabase class implementation.
//
//-----------------------------------------------------------------------------

#include "njsModule.h"

// class methods
NJS_NAPI_METHOD_DECL_ASYNC(njsSodaDatabase_createCollection);
NJS_NAPI_METHOD_DECL_SYNC(njsSodaDatabase_createDocument);
NJS_NAPI_METHOD_DECL_ASYNC(njsSodaDatabase_getCollectionNames);
NJS_NAPI_METHOD_DECL_ASYNC(njsSodaDatabase_openCollection);

// asynchronous methods
static NJS_ASYNC_METHOD(njsSodaDatabase_createCollectionAsync);
static NJS_ASYNC_METHOD(njsSodaDatabase_getCollectionNamesAsync);
static NJS_ASYNC_METHOD(njsSodaDatabase_openCollectionAsync);

// post asynchronous methods
static NJS_ASYNC_POST_METHOD(njsSodaDatabase_createCollectionPostAsync);
static NJS_ASYNC_POST_METHOD(njsSodaDatabase_getCollectionNamesPostAsync);
static NJS_ASYNC_POST_METHOD(njsSodaDatabase_openCollectionPostAsync);

// finalize
static NJS_NAPI_FINALIZE(njsSodaDatabase_finalize);

// properties defined by the class
static const napi_property_descriptor njsClassProperties[] = {
    { "createCollection", NULL, njsSodaDatabase_createCollection, NULL, NULL,
            NULL, napi_default, NULL },
    { "createDocument", NULL, njsSodaDatabase_createDocument, NULL, NULL, NULL,
            napi_default, NULL },
    { "getCollectionNames", NULL, njsSodaDatabase_getCollectionNames, NULL,
            NULL, NULL, napi_default, NULL },
    { "openCollection", NULL, njsSodaDatabase_openCollection, NULL, NULL, NULL,
            napi_default, NULL },
    { NULL, NULL, NULL, NULL, NULL, NULL, napi_default, NULL }
};

// class definition
const njsClassDef njsClassDefSodaDatabase = {
    "SodaDatabaseImpl", sizeof(njsSodaDatabase), njsSodaDatabase_finalize,
    njsClassProperties, false
};


//-----------------------------------------------------------------------------
// njsSodaDatabase_createCollection()
//   Creates a new (or opens an existing) SODA collection.
//
// PARAMETERS
//   - name
//   - options
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsSodaDatabase_createCollection, 2, NULL)
{
    if (!njsUtils_copyStringFromJS(env, args[0], &baton->name,
            &baton->nameLength))
        return false;
    if (!njsUtils_getNamedPropertyBool(env, args[1], "autoCommit",
            &baton->autoCommit))
        return false;
    if (!njsUtils_getNamedPropertyString(env, args[1], "metaData",
            &baton->sodaMetaData, &baton->sodaMetaDataLength))
        return false;
    if (!njsUtils_getNamedPropertyUnsignedInt(env, args[1], "mode",
            &baton->createCollectionMode))
        return false;
    return njsBaton_queueWork(baton, env, "CreateCollection",
            njsSodaDatabase_createCollectionAsync,
            njsSodaDatabase_createCollectionPostAsync, returnValue);
}


//-----------------------------------------------------------------------------
// njsSodaDatabase_createCollectionAsync()
//   Worker function for njsSodaDatabase_createCollection().
//-----------------------------------------------------------------------------
static bool njsSodaDatabase_createCollectionAsync(njsBaton *baton)
{
    njsSodaDatabase *db = (njsSodaDatabase*) baton->callingInstance;
    uint32_t flags = DPI_SODA_FLAGS_DEFAULT;

    if (baton->autoCommit)
        flags |= DPI_SODA_FLAGS_ATOMIC_COMMIT;
    if (baton->createCollectionMode == NJS_SODA_COLL_CREATE_MODE_MAP)
        flags |= DPI_SODA_FLAGS_CREATE_COLL_MAP;

    if (dpiSodaDb_createCollection(db->handle, baton->name,
            (uint32_t) baton->nameLength, baton->sodaMetaData,
            (uint32_t) baton->sodaMetaDataLength, flags,
            &baton->dpiSodaCollHandle) < 0)
        return njsBaton_setErrorDPI(baton);

    return true;
}


//-----------------------------------------------------------------------------
// njsSodaDatabase_createCollectionPostAsync()
//   Defines the value returned to JS.
//-----------------------------------------------------------------------------
static bool njsSodaDatabase_createCollectionPostAsync(njsBaton *baton,
        napi_env env, napi_value *result)
{
    return njsSodaCollection_newFromBaton(baton, env, result);
}


//-----------------------------------------------------------------------------
// njsSodaDatabase_createDocument()
//   Creates a SODA document with the specified content and attributes.
//
// PARAMETERS
//   - content
//   - options
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsSodaDatabase_createDocument, 2, NULL)
{
    size_t keyLength = 0, mediaTypeLength = 0;
    njsSodaDatabase *db = (njsSodaDatabase*) callingInstance;
    char *key = NULL, *mediaType = NULL;
    dpiSodaDoc *docHandle;
    bool status;

    // acquire the key value, if one was specified
    if (!njsUtils_getNamedPropertyString(env, args[1], "key", &key,
            &keyLength))
        return false;

    // acquire the mediaType value, if one was specified
    if (!njsUtils_getNamedPropertyString(env, args[1], "mediaType", &mediaType,
            &mediaTypeLength)) {
        if (key)
            free(key);
        return false;
    }

    // create SODA document using the passed-in data
    status = njsUtils_addSodaContent(db->handle, env, args[0], globals, key,
            (uint32_t) keyLength, mediaType, (uint32_t) mediaTypeLength,
            DPI_SODA_FLAGS_DEFAULT, &docHandle);
    if (key)
        free(key);
    if (mediaType)
        free(mediaType);
    if (!status)
        return status;

    // return wrapped document
    if (!njsSodaDocument_createFromHandle(env, docHandle, globals,
            returnValue)) {
        dpiSodaDoc_release(docHandle);
        return false;
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsSodaDatabase_finalize()
//   Invoked when the njsSodaDatabase object is garbage collected.
//-----------------------------------------------------------------------------
static void njsSodaDatabase_finalize(napi_env env, void *finalizeData,
        void *finalizeHint)
{
    njsSodaDatabase *db = (njsSodaDatabase*) finalizeData;

    if (db->handle) {
        dpiSodaDb_release(db->handle);
        db->handle = NULL;
    }
    free(db);
}


//-----------------------------------------------------------------------------
// njsSodaDatabase_getCollectionNames()
//   Return an array of collection names found in the SODA database.
//
// PARAMETERS
//   - options
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsSodaDatabase_getCollectionNames, 1, NULL)
{
    baton->sodaCollNames = calloc(1, sizeof(dpiStringList));
    if (!baton->sodaCollNames)
        return njsUtils_throwInsufficientMemory(env);
    if (!njsUtils_getNamedPropertyString(env, args[0], "startsWith",
            &baton->startsWith, &baton->startsWithLength))
        return false;
    if (!njsUtils_getNamedPropertyInt(env, args[0], "limit", &baton->limit))
        return false;
    return njsBaton_queueWork(baton, env, "GetCollectionNames",
            njsSodaDatabase_getCollectionNamesAsync,
            njsSodaDatabase_getCollectionNamesPostAsync, returnValue);
}


//-----------------------------------------------------------------------------
// njsSodaDatabase_getCollectionNamesAsync()
//   Worker function for njsSodaDatabase_getCollectionNames().
//-----------------------------------------------------------------------------
static bool njsSodaDatabase_getCollectionNamesAsync(njsBaton *baton)
{
    njsSodaDatabase *db = (njsSodaDatabase*) baton->callingInstance;

    if (dpiSodaDb_getCollectionNames(db->handle, baton->startsWith,
            (uint32_t) baton->startsWithLength, (uint32_t) baton->limit,
            DPI_SODA_FLAGS_DEFAULT, baton->sodaCollNames) < 0) {
        return njsBaton_setErrorDPI(baton);
    }
    return true;
}


//-----------------------------------------------------------------------------
// njsSodaDatabase_getCollectionNamesPostAsync()
//   Defines the value returned to JS.
//-----------------------------------------------------------------------------
static bool njsSodaDatabase_getCollectionNamesPostAsync(njsBaton *baton,
        napi_env env, napi_value *result)
{
    napi_value value;
    uint32_t i;

    // create array for the collection names
    NJS_CHECK_NAPI(env, napi_create_array_with_length(env,
            baton->sodaCollNames->numStrings, result))

    // populate it with the collection names
    for (i = 0; i < baton->sodaCollNames->numStrings; i++) {
        NJS_CHECK_NAPI(env, napi_create_string_utf8(env,
                baton->sodaCollNames->strings[i],
                baton->sodaCollNames->stringLengths[i], &value))
        NJS_CHECK_NAPI(env, napi_set_element(env, *result, i, value))
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsSodaDatabase_createFromHandle()
//   Creates a new SODA database object given the ODPI-C handle.
//-----------------------------------------------------------------------------
bool njsSodaDatabase_createFromHandle(napi_env env, napi_value connObj,
        njsModuleGlobals *globals, dpiSodaDb *handle, napi_value *dbObj)
{
    njsSodaDatabase *db;
    bool supportsJson = globals->sodaUseJsonDesc;
    napi_value boolValue;

    // create new instance
    if (!njsUtils_genericNew(env, &njsClassDefSodaDatabase,
            globals->jsSodaDatabaseConstructor, dbObj, (void**) &db))
        return false;

    // perform initialization
    db->handle = handle;

    // store a reference to the connection to permit serialization and to
    // ensure that it is not garbage collected during the lifetime of the SODA
    // database object
    NJS_CHECK_NAPI(env, napi_set_named_property(env, *dbObj, "_connection",
            connObj))

    // store supportsJSON property on the SODA database object to indicate
    // JSON in SODA is supported or not
    NJS_CHECK_NAPI(env, napi_get_boolean(env, supportsJson, &boolValue))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, *dbObj, "_supportsJson",
            boolValue))

    return true;
}


//-----------------------------------------------------------------------------
// njsSodaDatabase_openCollection()
//   Opens an existing SODA collection.
//
// PARAMETERS
//   - name
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsSodaDatabase_openCollection, 2, NULL)
{
    if (!njsUtils_copyStringFromJS(env, args[0], &baton->name,
            &baton->nameLength))
        return false;
    if (!njsUtils_getNamedPropertyBool(env, args[1], "autoCommit",
            &baton->autoCommit))
        return false;
    return njsBaton_queueWork(baton, env, "OpenCollection",
            njsSodaDatabase_openCollectionAsync,
            njsSodaDatabase_openCollectionPostAsync, returnValue);
}


//-----------------------------------------------------------------------------
// njsSodaDatabase_openCollectionAsync()
//   Worker function for njsSodaDatabase_openCollection().
//-----------------------------------------------------------------------------
static bool njsSodaDatabase_openCollectionAsync(njsBaton *baton)
{
    njsSodaDatabase *db = (njsSodaDatabase*) baton->callingInstance;
    uint32_t flags = DPI_SODA_FLAGS_DEFAULT;

    if (baton->autoCommit)
        flags |= DPI_SODA_FLAGS_ATOMIC_COMMIT;
    if (dpiSodaDb_openCollection(db->handle, baton->name,
            (uint32_t) baton->nameLength, flags,
            &baton->dpiSodaCollHandle) < 0)
        return njsBaton_setErrorDPI(baton);
    return true;
}


//-----------------------------------------------------------------------------
// njsSodaDatabase_openCollectionPostAsync()
//   Defines the value returned to JS.
//-----------------------------------------------------------------------------
static bool njsSodaDatabase_openCollectionPostAsync(njsBaton *baton,
        napi_env env, napi_value *result)
{
    if (baton->dpiSodaCollHandle)
        return njsSodaCollection_newFromBaton(baton, env, result);
    return true;
}
