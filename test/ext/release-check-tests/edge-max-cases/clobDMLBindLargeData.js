/* Copyright (c) 2024, Oracle and/or its affiliates. All rights reserved. */

/******************************************************************************
 *
 * You may not use the identified files except in compliance with the Apache
 * License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * The node-oracledb test suite uses 'mocha' and 'assert'.
 * See LICENSE.md for relevant licenses.
 *
 * NAME
 *   4. clobDMLBindLargeData.js
 *
 * DESCRIPTION
 *   Testing DML bind larger size CLOB.
 *
 * NUMBERING RULE
 *   Test numbers follow this numbering rule:
 *     1  - 20  are reserved for basic functional tests
 *     21 - 50  are reserved for data type supporting tests
 *     51 onwards are for other tests
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const fs        = require('fs');
const dbConfig  = require('../../../dbconfig.js');
const largeFile = require('./largeFile.js');

describe('4.clobDMLBindLargeData.js', function() {
  let connection = null;
  const fileRoot = process.cwd();

  const proc_clob_prepare_tab = `BEGIN \n
                                  DECLARE \n
                                      e_table_missing EXCEPTION; \n
                                      PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n
                                  BEGIN \n
                                      EXECUTE IMMEDIATE('DROP TABLE nodb_tab_lobs_pre PURGE'); \n
                                  EXCEPTION \n
                                      WHEN e_table_missing \n
                                      THEN NULL; \n
                                  END; \n
                                  EXECUTE IMMEDIATE (' \n
                                      CREATE TABLE nodb_tab_lobs_pre ( \n
                                          id    NUMBER, \n
                                          clob  CLOB \n
                                      ) \n
                                  '); \n
                              END; `;

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
    await setupAllTable();
  }); // before

  after(async function() {
    await dropAllTable();
    await connection.release();
  }); // after

  let inFileName = '';

  describe('4.1 CLOB, INSERT/SELECT', function() {
    it('4.1.1 BIND_IN & BIND_OUT a 1GB txt file', async function() {
      inFileName = fileRoot + '/1GBlargeString.txt';
      const fileSizeInGB = 1;
      const selectID = 1;
      const insertID = 101;
      const numMinus = 0;

      await bindIn(inFileName, fileSizeInGB, numMinus, selectID, insertID);
    }); // 4.1.1

    it('4.1.2 BIND_IN & BIND_OUT a 2GB txt file', async function() {
      inFileName = fileRoot + '/2GBlargeString.txt';
      const fileSizeInGB = 2;
      const selectID = 2;
      const insertID = 102;
      const numMinus = 0;

      await bindIn(inFileName, fileSizeInGB, numMinus, selectID, insertID);
    }); // 4.1.2

    it.skip('4.1.3 BIND_IN & BIND_OUT a 4GB txt file', async function() {
      inFileName = fileRoot + '/4GBlargeString.txt';
      const selectID = 3;
      const insertID = 103;
      const fileSizeInGB = 4;
      const numMinus = 0;

      await bindIn(inFileName, fileSizeInGB, numMinus, selectID, insertID);
    });

    it('4.1.4 BIND_IN & BIND_OUT a 10MB txt file', async function() {
      inFileName = fileRoot + '/smallString.txt';
      const selectID = 4;
      const insertID = 104;
      const fileSize = 10 * 1024 * 1024;
      const specialStr = "4.1.4";

      await bindIn_small(inFileName, fileSize, selectID, insertID, specialStr);
    });

    it('4.1.5 BIND_IN & BIND_OUT a 20MB txt file', async function() {
      inFileName = fileRoot + '/smallString.txt';
      const selectID = 5;
      const insertID = 105;
      const fileSize = 20 * 1024 * 1024;
      const specialStr = "4.1.5";

      await bindIn_small(inFileName, fileSize, selectID, insertID, specialStr);
    });

    it('4.1.6 BIND_IN & BIND_OUT a 50MB txt file', async function() {
      inFileName = fileRoot + '/smallString.txt';
      const selectID = 6;
      const insertID = 106;
      const fileSize = 50 * 1024 * 1024;
      const specialStr = "4.1.6";

      await bindIn_small(inFileName, fileSize, selectID, insertID, specialStr);
    });

  }); // 4.1

  const bindIn = async function(inFileName, fileSizeInGB, numMinus, selectID, insertID) {
    await largeFile.createFileInGB(inFileName, fileSizeInGB, numMinus);
    await insetTableWithClob(selectID, inFileName);
    const lenexpected = fileSizeInGB * 1024 * 1024 * 1024 - numMinus;
    await verifyClob(selectID, insertID, lenexpected);
    fs.unlinkSync(inFileName);
  };

  const bindIn_small = async function(inFileName, fileSize, selectID, insertID, specialStr) {
    await largeFile.createFileInKB(inFileName, fileSize, specialStr);
    await insetTableWithClob(selectID, inFileName);
    await verifyClob(selectID, insertID, fileSize);
    fs.unlinkSync(inFileName);
  };

  const setupAllTable = async function() {
    await connection.execute(proc_clob_prepare_tab);
  };

  const dropAllTable = async function() {
    await connection.execute(`DROP TABLE nodb_tab_lobs_pre PURGE`);
  };

  const executeSQL = async function(sql) {
    await connection.execute(sql);
  };

  const insetTableWithClob = async function(id, inFileName) {
    const sql = `INSERT INTO nodb_tab_lobs_pre (id, clob)
               VALUES (:i, EMPTY_CLOB()) RETURNING clob INTO :lobbv`;
    const bindVar = {
      i: id,
      lobbv: { type: oracledb.CLOB, dir: oracledb.BIND_OUT }
    };
    let result = null;
    result = await connection.execute(
      sql,
      bindVar,
      { autoCommit: false });
    // a transaction needs to span the INSERT and pipe()
    assert.strictEqual(result.rowsAffected, 1);
    assert.strictEqual(result.outBinds.lobbv.length, 1);

    const inStream = fs.createReadStream(inFileName);
    const lob = result.outBinds.lobbv[0];

    await new Promise((resolve, reject) => {
      inStream.on("error", reject);
      lob.on("error", reject);

      lob.on('close', async function() {
        await connection.commit();
        resolve();
      });
      inStream.pipe(lob); // copies the text to the CLOB
    });
  };

  const verifyClob = async function(selectID, insertID, lenExpected) {
    let lob = {};
    const selectSql = `select clob from nodb_tab_lobs_pre where id = ` + selectID;
    const insetSql = `INSERT INTO nodb_tab_lobs_pre (id, clob) VALUES (:i, :c)`;
    let result = null;
    const proc_compare_clob = `CREATE OR REPLACE PROCEDURE nodb_clob_compare(result OUT NUMBER, len OUT NUMBER) \n
                             IS \n
                                 clob1 CLOB; \n
                                 clob2 CLOB; \n
                             BEGIN \n
                                 select clob into clob1 from nodb_tab_lobs_pre where id = ` + selectID + `; \n
                                 select clob into clob2 from nodb_tab_lobs_pre where id = ` + insertID + `; \n
                                 result := DBMS_LOB.COMPARE(clob1, clob2); \n
                                 len := length(clob1); \n
                             END nodb_clob_compare;`;
    const sqlRunComparePorc = `begin nodb_clob_compare(:r, :l); end;`;
    const sqlDropComparePorc = `DROP PROCEDURE nodb_clob_compare`;

    result = await connection.execute(selectSql);
    lob = result.rows[0][0];

    let bindVar = {
      i: insertID,
      c: { val: lob, type: oracledb.CLOB, dir: oracledb.BIND_IN }
    };
    try {
      await connection.execute(
        insetSql,
        bindVar,
        { autoCommit: true });
    } catch (err) {
      if (err) {
        // ORA-01691: unable to extend lob segment SHENZHEN.SYS_LOB0000185953C00002$$ by 699912 in tablespace SYSTE
        assert.equal(err.message.substring(0, 10), `ORA-01691:`);
      }
      lob.close();
    }

    await executeSQL(proc_compare_clob);
    bindVar = {
      r: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      l: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
    };

    result = await connection.execute(
      sqlRunComparePorc,
      bindVar);
    assert.strictEqual(result.outBinds.r, 0);
    assert.strictEqual(result.outBinds.l, lenExpected);

    await executeSQL(sqlDropComparePorc);
  };
});
