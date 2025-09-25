/* Copyright (c) 2020, 2025, Oracle and/or its affiliates. */

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
 *   231. soda13.js
 *
 * DESCRIPTION
 *   Collection.truncate() method.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const sodaUtil  = require('./sodaUtil.js');
const testsUtil = require('./testsUtil.js');

describe('231. soda13.js', () => {
  let conn;

  before(async function() {
    const isSodaRunnable = await testsUtil.isSodaRunnable();

    const clientVersion = testsUtil.getClientVersion();
    let isClientOK;
    if (clientVersion < 2000000000) {
      isClientOK = false;
    } else {
      isClientOK = true;
    }

    const isRunnable = isClientOK && isSodaRunnable;
    if (!isRunnable) {
      this.skip();
    }

    await sodaUtil.cleanup();
  }); // before()

  beforeEach(async function() {
    conn = await oracledb.getConnection(dbConfig);
  });

  afterEach(async function() {
    if (conn) {
      await conn.close();
      conn = null;
    }
  });

  it('231.1 example case', async () => {

    const TABLE = "soda_test_13_1";
    const soda = conn.getSodaDatabase();
    const coll = await soda.createCollection(TABLE);

    // (1)
    await coll.insertOne({fred: 5, george: 6});
    await coll.insertOne({fred: 8, george: 9});
    const docs1 = await coll.find().getDocuments();
    assert.strictEqual(docs1.length, 2);

    // (2)
    await coll.truncate();
    const docs2 = await coll.find().getDocuments();
    assert.strictEqual(docs2.length, 0);

    await conn.commit();
    const res = await coll.drop();
    assert.strictEqual(res.dropped, true);

  }); // 231.1

  it('231.2 truncate multiple times', async () => {

    const TABLE = "soda_test_13_2";
    const soda = conn.getSodaDatabase();
    const coll = await soda.createCollection(TABLE);

    await coll.insertOne({fred: 5, george: 6});
    await coll.insertOne({fred: 8, george: 9});
    await coll.truncate();
    await coll.truncate();
    const docs1 = await coll.find().getDocuments();
    assert.strictEqual(docs1.length, 0);

    await coll.insertOne({fred: 1, george: 2});
    await coll.insertOne({fred: 3, george: 4});
    await coll.insertOne({fred: 5, george: 6});
    const docs2 = await coll.find().getDocuments();
    assert.strictEqual(docs2.length, 3);

    await conn.commit();
    const res = await coll.drop();
    assert.strictEqual(res.dropped, true);

  }); // 231.2

  it('231.3 Negative -invalid parameters', async () => {

    const TABLE = "soda_test_13_3";
    const soda = conn.getSodaDatabase();
    const coll = await soda.createCollection(TABLE);

    await coll.insertOne({fred: 1, george: 2});
    await coll.insertOne({fred: 3, george: 4});

    await assert.rejects(
      async () => {
        await coll.truncate("foobar");
      },
      /NJS-009/
    );

    await conn.commit();
    const res = await coll.drop();
    assert.strictEqual(res.dropped, true);
  }); // 231.3
});
