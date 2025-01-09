/* Copyright (c) 2018, 2025, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at https://www.apache.org/licenses/LICENSE-2.0. You may choose
 * either license.
 *
 * If you elect to accept the software under the Apache License, Version 2.0,
 * the following applies:
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   167. soda3.js
 *
 * DESCRIPTION
 *   SODA tests that use many collections.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const sodaUtil  = require('./sodaUtil.js');
const testsUtil = require('./testsUtil.js');

describe('167. soda3.js', () => {

  let isRunnable;
  let conn, sd, t_collections;
  const t_collectionNames = [
    "chris_1", "chris_2", "chris_3", "chris_4",
    "changjie_1", "changjie_2", "Changjie_3", "Changjie_4",
    "venkat_1", "venkat_2", "venkat_3", "venkat_4"
  ];

  before('create collections', async function() {
    isRunnable = await testsUtil.isSodaRunnable();
    if (!isRunnable) {
      this.skip();
    }

    await sodaUtil.cleanup();

    conn = await oracledb.getConnection(dbConfig);
    sd = conn.getSodaDatabase();

    t_collections = await Promise.all(
      t_collectionNames.map(function(name) {
        return sd.createCollection(name);
      })
    );
  }); // before

  after('drop collections, close connection', async () => {
    if (!isRunnable) return;

    if (t_collections) {
      await Promise.all(
        t_collections.map(function(coll) {
          return coll.drop();
        })
      );
    }
    await conn.close();
  }); // after

  it('167.1 get collection names', async () => {
    const cNames = await sd.getCollectionNames();
    assert.strictEqual(cNames.length, t_collectionNames.length);
    assert.deepStrictEqual(cNames, t_collectionNames.sort());
  });

  it('167.2 getCollectionNames() - limit option', async () => {
    const options = { limit: 1 };
    const cNames = await sd.getCollectionNames(options);
    assert.strictEqual(cNames.length, 1);
    assert.deepStrictEqual(cNames, t_collectionNames.sort().slice(0, 1));
  });

  it('167.3 getCollectionNames() - limit is "undefined"', async () => {
    const options = { limit: undefined };
    const cNames = await sd.getCollectionNames(options);
    assert.strictEqual(cNames.length, t_collectionNames.length);
    assert.deepStrictEqual(cNames, t_collectionNames.sort());
  });

  it('167.4 getCollectionNames() - limit is 0', async () => {
    const options = { limit: 0 };
    const cNames = await sd.getCollectionNames(options);
    assert.strictEqual(cNames.length, t_collectionNames.length);
    assert.deepStrictEqual(cNames, t_collectionNames.sort());
  });

  it('167.5 getCollectionNames() - limit is null', async () => {
    const options = { limit: null };
    await assert.rejects(
      async () => await sd.getCollectionNames(options),
      /NJS-007: invalid value for "limit" in parameter 1/
    );
  });

  it('167.6 getCollectionNames() - limit is an empty string', async () => {
    const options = { limit: '' };
    await assert.rejects(
      async () => await sd.getCollectionNames(options),
      /NJS-007: invalid value for "limit" in parameter 1/
    );
  });

  it('167.7 getCollectionNames() - limit is a negative number', async () => {
    const options = { limit: -7 };
    const cNames = await sd.getCollectionNames(options);
    assert.strictEqual(cNames.length, t_collectionNames.length);
    assert.deepStrictEqual(cNames, t_collectionNames.sort());
  });

  it('167.8 startsWith option - basic test', async () => {
    const options = { startsWith: "changjie" };
    const cNames = await sd.getCollectionNames(options);
    assert.deepStrictEqual(cNames, t_collectionNames.sort().slice(2));
  });

  it('167.9 startsWith is case sensitive', async () => {
    const options = { startsWith: "Changjie" };
    const cNames = await sd.getCollectionNames(options);
    assert.strictEqual(cNames.length, t_collectionNames.length);
    assert.deepStrictEqual(cNames, t_collectionNames.sort());
  });

  it('167.10 startsWith is an empty string', async () => {
    const options = { startsWith: "" };
    const cNames = await sd.getCollectionNames(options);
    assert.strictEqual(cNames.length, t_collectionNames.length);
    assert.deepStrictEqual(cNames, t_collectionNames.sort());
  });

  it('167.11 startsWith is null', async () => {
    const options = { startsWith: null };
    await assert.rejects(
      async () => await sd.getCollectionNames(options),
      /NJS-007: invalid value for "startsWith" in parameter 1/
    );
  });

  it('167.12 Negative - startsWith has invalid type, a Number', async () => {
    const options = { startsWith: 7 };
    await assert.rejects(
      async () => await sd.getCollectionNames(options),
      /NJS-007: invalid value for "startsWith" in parameter 1/
    );
  });

  it('167.13 openCollection() basic case 1', async () => {
    const candidate = "Changjie_3";
    const coll = await sd.openCollection(candidate);
    assert.strictEqual(coll.name, candidate);
  });

  it('167.14 openCollection() basic case 2', async () => {
    const candidate = "chris_1";
    const coll = await sd.openCollection(candidate);
    assert.strictEqual(coll.name, candidate);
  });

  it('167.15 the returned value is null if the requested collection does not exist', async () => {
    const candidate = "nonexistent_collection";
    const coll = await sd.openCollection(candidate);
    assert.strictEqual(coll, undefined);
  });

  it('167.16 the requested collection name is case sensitive', async () => {
    const candidate = "changjie_3";
    const coll = await sd.openCollection(candidate);
    assert.strictEqual(coll, undefined);
  });

  it('167.17 getCollectionNames() with both limit and startsWith options', async () => {
    const options = {
      limit: 2,
      startsWith: "chris"
    };
    const cNames = await sd.getCollectionNames(options);
    assert.strictEqual(cNames.length, 2);
    assert.deepStrictEqual(cNames, ['chris_1', 'chris_2']);
  });

  it('167.18 startsWith with special characters', async () => {
    // First create some collections with special characters
    const specialCollections = [
      "test$collection_1",
      "test@collection_2",
      "test#collection_3"
    ];

    const newCollections = await Promise.all(
      specialCollections.map(name => sd.createCollection(name))
    );

    const options = { startsWith: "test" };
    const cNames = await sd.getCollectionNames(options);

    // Verify all test collections are found
    specialCollections.forEach(name => {
      assert(cNames.includes(name));
    });

    // Cleanup
    await Promise.all(newCollections.map(coll => coll.drop()));
  });

  it('167.19 getCollectionNames() with very large limit', async () => {
    const options = { limit: Number.MAX_SAFE_INTEGER };
    const cNames = await sd.getCollectionNames(options);
    assert.strictEqual(cNames.length, t_collectionNames.length);
    assert.deepStrictEqual(cNames, t_collectionNames.sort());
  });

  it('167.20 getCollectionNames() with whitespace patterns', async () => {
    // Create collections with whitespace
    const whitespaceCollections = [
      " leading_space",
      "trailing_space ",
      " both_sides ",
      "multiple  spaces"
    ];

    const newCollections = await Promise.all(
      whitespaceCollections.map(name => sd.createCollection(name))
    );

    // Test different whitespace patterns
    const patterns = [' ', 'trailing', 'multiple'];
    for (const pattern of patterns) {
      const options = { startsWith: pattern };
      const cNames = await sd.getCollectionNames(options);
      assert(cNames.length > 0);
    }

    // Cleanup
    await Promise.all(newCollections.map(coll => coll.drop()));
  });

  it('167.21 openCollection() with non-string collection names', async () => {
    const invalidNames = [
      123,
      true,
      {},
      [],
      null,
      undefined
    ];

    for (const name of invalidNames) {
      await assert.rejects(
        async () => await sd.openCollection(name),
        /NJS-005:/  // NJS-005: invalid value for parameter 1
      );
    }
  });

  it('167.22 getCollectionNames() with very specific startsWith pattern', async () => {
    // Create collections with numeric suffixes
    const numericCollections = [
      "test_1",
      "test_2",
      "test_10",
      "test_20",
      "test_100"
    ];

    const newCollections = await Promise.all(
      numericCollections.map(name => sd.createCollection(name))
    );

    const options = { startsWith: "test_" };
    const cNames = await sd.getCollectionNames(options);

    // Verify numeric suffix order
    const sortedNames = numericCollections.sort();
    assert.deepStrictEqual(
      cNames.filter(name => name.startsWith("test_")),
      sortedNames
    );

    // Cleanup
    await Promise.all(newCollections.map(coll => coll.drop()));
  });

  it('167.23 test collection name with maximum length', async () => {
    // Create collection with maximum allowed length name
    const maxLengthName = "A".repeat(128);
    const maxCollection = await sd.createCollection(maxLengthName);

    // Verify it can be found with getCollectionNames
    const options = { startsWith: "A" };
    const cNames = await sd.getCollectionNames(options);
    assert(cNames.includes(maxLengthName));

    // Verify it can be opened
    const openedColl = await sd.openCollection(maxLengthName);
    assert(openedColl);
    assert.strictEqual(openedColl.name, maxLengthName);

    // Cleanup
    await maxCollection.drop();
  });
});
