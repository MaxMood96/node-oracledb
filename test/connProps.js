/* Copyright (c) 2019, 2023, Oracle and/or its affiliates. */

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
 *   193. connProps.js
 *
 * DESCRIPTION
 *   Test the "connection.clientInfo" and "connection.dbOp" properties.
 *   These tests requires DBA privilege.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('193. connProps.js', function() {

  let isRunnable = false;

  before(async function() {
    const preps = await testsUtil.checkPrerequisites();
    if (preps && dbConfig.test.DBA_PRIVILEGE) {
      isRunnable = true;
    }

    if (!isRunnable) {
      this.skip();
    } else {
      const dbaConfig = {
        user: dbConfig.test.DBA_user,
        password: dbConfig.test.DBA_password,
        connectString: dbConfig.connectString,
        privilege: oracledb.SYSDBA,
      };
      const dbaConnection = await oracledb.getConnection(dbaConfig);

      const sql = `GRANT SELECT ANY DICTIONARY TO ${dbConfig.user}`;
      await dbaConnection.execute(sql);

      await dbaConnection.close();
    }
  }); // before()

  it('193.1 the default values of clientInfo and dbOp are null', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    assert.strictEqual(conn.clientInfo, null);
    assert.strictEqual(conn.dbOp, null);
    await conn.close();
  }); // 193.1

  it('193.2 clientInfo and dbOp are write-only properties', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    conn.clientInfo = 'nodb_193_2';
    conn.dbOp = 'nodb_193_2';
    assert.strictEqual(conn.clientInfo, null);
    assert.strictEqual(conn.dbOp, null);
    await conn.close();
  }); // 193.2

  it('193.3 check the results of setter()', async () => {
    const conn = await oracledb.getConnection(dbConfig);

    const t_clientInfo = "My demo application";
    const t_dbOp       = "Billing";

    conn.clientInfo = t_clientInfo;
    conn.dbOp       = t_dbOp;

    const sqlOne = `SELECT sys_context('userenv', 'client_info') FROM dual`;
    let result = await conn.execute(sqlOne);
    assert.strictEqual(result.rows[0][0], t_clientInfo);

    const sqlTwo = `SELECT dbop_name FROM v$sql_monitor \
           WHERE sid = sys_context('userenv', 'sid') \
           AND status = 'EXECUTING'`;
    result = await conn.execute(sqlTwo);
    assert.strictEqual(result.rows[0][0], t_dbOp);

    // Change the values and check quried results again
    const k_clientInfo = "Demo Two";
    const k_dbOp       = "Billing Two";

    conn.clientInfo = k_clientInfo;
    conn.dbOp       = k_dbOp;

    result = await conn.execute(sqlOne);
    assert.strictEqual(result.rows[0][0], k_clientInfo);

    result = await conn.execute(sqlTwo);
    assert.strictEqual(result.rows[0][0], k_dbOp);

    await conn.close();
  }); // 193.3

  it('193.4 Negative - invalid values', async () => {
    const conn = await oracledb.getConnection(dbConfig);

    // Numeric values
    assert.throws(
      () => {
        conn.clientInfo = 3;
      },
      /NJS-004:/
    );

    assert.throws(
      () => {
        conn.dbOp = 4;
      },
      /NJS-004:/
    );

    // NaN
    assert.throws(
      () => {
        conn.clientInfo = NaN;
      },
      /NJS-004:/
    );

    assert.throws(
      () => {
        conn.dbOp = NaN;
      },
      /NJS-004:/
    );

    // undefined
    assert.throws(
      () => {
        conn.clientInfo = undefined;
      },
      /NJS-004:/
    );

    assert.throws(
      () => {
        conn.dbOp = undefined;
      },
      /NJS-004:/
    );

    await conn.close();
  }); // 193.4

  it('193.5 Oracle Database service name associated with the connection', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const query = "SELECT upper(sys_context('userenv', 'service_name')) FROM DUAL";
    const result = await conn.execute(query);
    assert.deepStrictEqual(result.rows[0][0], conn.serviceName.toUpperCase());
    await conn.close();
  }); // 193.5

  it('193.6 Oracle Database dbname associated with the connection', async () => {
    let query;
    if (!oracledb.thin) {
      // on thick mode for CDB based DB's, the CDB name is returned.
      query = `SELECT upper(NAME) FROM v$database`;
    } else {
      query = "SELECT GLOBAL_NAME FROM GLOBAL_NAME";
    }
    const conn = await oracledb.getConnection(dbConfig);
    const result = await conn.execute(query);
    assert.deepStrictEqual(result.rows[0][0], conn.dbName.toUpperCase());
    await conn.close();
  }); // 193.6

  it('193.7 Oracle Database db domain associated with the connection', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const query = "SELECT upper(VALUE) FROM v$parameter WHERE name='db_domain'";
    const result = await conn.execute(query);
    if (result.rows[0][0]) {
      assert.deepStrictEqual(result.rows[0][0], conn.dbDomain.toUpperCase());
    } else  {
      assert.deepStrictEqual(conn.dbDomain, '');
    }
    await conn.close();
  }); // 193.7

  it('193.8 maximum cursors that can be opened on a connection', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const query = "SELECT value FROM v$parameter WHERE name='open_cursors'";
    const result = await conn.execute(query);
    assert.deepStrictEqual(Number(result.rows[0][0]), conn.maxOpenCursors);
    await conn.close();
  }); // 193.8

  it('193.9 transactionInProgress = false on a connection for query', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const query = "SELECT * FROM DUAL";
    await conn.execute(query);
    assert.strictEqual(conn.transactionInProgress, false);
    await conn.close();
  }); // 193.9

  it('193.10 transactionInProgress = true on a connection', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const TABLE = 'nodb_emp';
    const createSql = `CREATE TABLE ${TABLE} (id number)`;
    assert.strictEqual(conn.transactionInProgress, false);
    await testsUtil.createTable(conn, TABLE, createSql);
    assert.strictEqual(conn.transactionInProgress, false);
    const sql = `INSERT INTO ${TABLE} VALUES(1)`;
    await conn.execute(sql);
    assert.strictEqual(conn.transactionInProgress, true);
    await conn.commit();
    assert.strictEqual(conn.transactionInProgress, false);
    await conn.execute(`DROP TABLE ${TABLE} PURGE`);
    await conn.close();
  }); // 193.10
});
