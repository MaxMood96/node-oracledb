/* Copyright (c) 2017, 2025, Oracle and/or its affiliates. */

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
 *   93. binding_procedureBindIn.js
 *
 * DESCRIPTION
 *   This suite tests the data binding, including:
 *     Test cases bind in oracledb type STRING/BUFFER to all db column types using plsql procedure
 *     The cases take small/null bind values.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert = require('assert');
const dbConfig = require('./dbconfig.js');
const assist   = require('./dataTypeAssist.js');
const testsUtil = require('./testsUtil.js');

describe('93.binding_procedureBindIn.js', function() {

  let connection = null;

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
  });

  after(async function() {
    await connection.close();
  });

  const getExpectedErrorPattern = function(bindType, dbColType, nullBind) {
    if (bindType === oracledb.STRING) {
      // STRING binding
      if (dbColType === "BLOB") {
        return /ORA-06550:/; // PL/SQL compilation error
      }

      if (nullBind === true) {
        return null;
      }

      if (dbColType.indexOf("CHAR") > -1 || dbColType === "CLOB") {
        return null;
      }

      if (dbColType.indexOf("FLOAT") > -1 || dbColType === "NUMBER" ||
          dbColType.indexOf("RAW") > -1 || dbColType === "BINARY_DOUBLE") {
        return /ORA-06502:/; // Conversion errors
      }

      if (dbColType === "DATE" || dbColType === "TIMESTAMP") {
        return /ORA-01858:/; // Date conversion error
      }
    } else {
      // BUFFER binding
      if (dbColType === "NUMBER" || dbColType.indexOf("FLOAT") > -1 ||
          dbColType === "BINARY_DOUBLE" || dbColType === "DATE" ||
          dbColType === "TIMESTAMP" || dbColType === "CLOB") {
        return /ORA-06550:/; // PL/SQL compilation error
      }

      if (dbColType.indexOf("CHAR") > -1 || dbColType.indexOf("RAW") > -1 || dbColType === "BLOB") {
        return null;
      }
    }
    return null; // Default to success
  };

  const doTest = async function(table_name, proc_name, dbColType, content, bindType, nullBind) {
    let bindVar = { c: { val: content, type: bindType, dir: oracledb.BIND_IN } };
    await inBind(table_name, proc_name, dbColType, bindVar, bindType, nullBind);

    bindVar = [ { val: content, type: bindType, dir: oracledb.BIND_IN } ];
    await inBind(table_name, proc_name, dbColType, bindVar, bindType, nullBind);
  };

  const inBind = async function(table_name, proc_name, dbColType, bindVar, bindType, nullBind) {
    const proc = "CREATE OR REPLACE PROCEDURE " + proc_name + " (inValue IN " + dbColType + ")\n" +
                    "AS \n" +
                    "BEGIN \n" +
                    "    insert into " + table_name + " ( content ) values (inValue); \n" +
                    "END " + proc_name + "; ";
    const sqlRun = "BEGIN " + proc_name + " (:c); END;";
    const proc_drop = "DROP PROCEDURE " + proc_name;

    // Create table first
    await testsUtil.createBindingTestTable(connection, table_name, dbColType);

    // Create procedure
    await connection.execute(proc);

    // Execute procedure with expected error handling
    const expectedError = getExpectedErrorPattern(bindType, dbColType, nullBind);

    if (expectedError) {
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar),
        expectedError
      );
    } else {
      await connection.execute(sqlRun, bindVar);
    }

    // Cleanup
    await connection.execute(proc_drop);
    await testsUtil.dropTable(connection, table_name);
  };

  const tableNamePre = "table_93";
  const procName = "proc_93";
  let index = 0;

  describe('93.1 PLSQL procedure: bind in small value of oracledb.STRING/BUFFER', function() {

    it('93.1.1 oracledb.STRING <--> DB: NUMBER', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "NUMBER", "small string", oracledb.STRING, false);
    });

    it('93.1.2 oracledb.STRING <--> DB: CHAR', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "CHAR", "small string", oracledb.STRING, false);
    });

    it('93.1.3 oracledb.STRING <--> DB: NCHAR', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "NCHAR", "small string", oracledb.STRING, false);
    });

    it('93.1.4 oracledb.STRING <--> DB: VARCHAR2', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "VARCHAR2", "small string", oracledb.STRING, false);
    });

    it('93.1.5 oracledb.STRING <--> DB: FLOAT', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "FLOAT", "small string", oracledb.STRING, false);
    });

    it('93.1.6 oracledb.STRING <--> DB: BINARY_FLOAT', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "BINARY_FLOAT", "small string", oracledb.STRING, false);
    });

    it('93.1.7 oracledb.STRING <--> DB: BINARY_DOUBLE', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "BINARY_DOUBLE", "small string", oracledb.STRING, false);
    });

    it('93.1.8 oracledb.STRING <--> DB: DATE', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "DATE", "small string", oracledb.STRING, false);
    });

    it('93.1.9 oracledb.STRING <--> DB: TIMESTAMP', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "TIMESTAMP", "small string", oracledb.STRING, false);
    });

    it('93.1.10 oracledb.STRING <--> DB: RAW', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "RAW", "small string", oracledb.STRING, false);
    });

    it('93.1.11 oracledb.STRING <--> DB: CLOB', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "CLOB", "small string", oracledb.STRING, false);
    });

    it('93.1.12 oracledb.STRING <--> DB: BLOB', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "BLOB", "small string", oracledb.STRING, false);
    });

    it('93.1.13 oracledb.BUFFER <--> DB: NUMBER', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "NUMBER", assist.createBuffer(100), oracledb.BUFFER, false);
    });

    it('93.1.14 oracledb.BUFFER <--> DB: CHAR', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "CHAR", assist.createBuffer(100), oracledb.BUFFER, false);
    });

    it('93.1.15 oracledb.BUFFER <--> DB: NCHAR', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "NCHAR", assist.createBuffer(100), oracledb.BUFFER, false);
    });

    it('93.1.16 oracledb.BUFFER <--> DB: VARCHAR2', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "VARCHAR2", assist.createBuffer(100), oracledb.BUFFER, false);
    });

    it('93.1.17 oracledb.BUFFER <--> DB: FLOAT', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "FLOAT", assist.createBuffer(100), oracledb.BUFFER, false);
    });

    it('93.1.18 oracledb.BUFFER <--> DB: BINARY_FLOAT', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "BINARY_FLOAT", assist.createBuffer(100), oracledb.BUFFER, false);
    });

    it('93.1.19 oracledb.BUFFER <--> DB: BINARY_DOUBLE', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "BINARY_DOUBLE", assist.createBuffer(100), oracledb.BUFFER, false);
    });

    it('93.1.20 oracledb.BUFFER <--> DB: DATE', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "DATE", assist.createBuffer(100), oracledb.BUFFER, false);
    });

    it('93.1.21 oracledb.BUFFER <--> DB: TIMESTAMP', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "TIMESTAMP", assist.createBuffer(100), oracledb.BUFFER, false);
    });

    it('93.1.22 oracledb.BUFFER <--> DB: RAW', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "RAW", assist.createBuffer(100), oracledb.BUFFER, false);
    });

    it('93.1.23 oracledb.BUFFER <--> DB: CLOB', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "CLOB", assist.createBuffer(100), oracledb.BUFFER, false);
    });

    it('93.1.24 oracledb.BUFFER <--> DB: BLOB', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "BLOB", assist.createBuffer(100), oracledb.BUFFER, false);
    });
  });

  describe('93.2 PLSQL procedure: bind in null value of oracledb.STRING/BUFFER', function() {

    it('93.2.1 oracledb.STRING <--> DB: NUMBER', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "NUMBER", null, oracledb.STRING, true);
    });

    it('93.2.2 oracledb.STRING <--> DB: CHAR', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "CHAR", null, oracledb.STRING, true);
    });

    it('93.2.3 oracledb.STRING <--> DB: NCHAR', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "NCHAR", null, oracledb.STRING, true);
    });

    it('93.2.4 oracledb.STRING <--> DB: VARCHAR2', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "VARCHAR2", null, oracledb.STRING, true);
    });

    it('93.2.5 oracledb.STRING <--> DB: FLOAT', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "FLOAT", null, oracledb.STRING, true);
    });

    it('93.2.6 oracledb.STRING <--> DB: BINARY_FLOAT', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "BINARY_FLOAT", null, oracledb.STRING, true);
    });

    it('93.2.7 oracledb.STRING <--> DB: BINARY_DOUBLE', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "BINARY_DOUBLE", null, oracledb.STRING, true);
    });

    it('93.2.8 oracledb.STRING <--> DB: DATE', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "DATE", null, oracledb.STRING, true);
    });

    it('93.2.9 oracledb.STRING <--> DB: TIMESTAMP', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "TIMESTAMP", null, oracledb.STRING, true);
    });

    it('93.2.10 oracledb.STRING <--> DB: RAW', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "RAW", null, oracledb.STRING, true);
    });

    it('93.2.11 oracledb.STRING <--> DB: CLOB', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "CLOB", null, oracledb.STRING, true);
    });

    it('93.2.12 oracledb.STRING <--> DB: BLOB', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "BLOB", null, oracledb.STRING, true);
    });

    it('93.2.13 oracledb.BUFFER <--> DB: NUMBER', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "NUMBER", null, oracledb.BUFFER, true);
    });

    it('93.2.14 oracledb.BUFFER <--> DB: CHAR', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "CHAR", null, oracledb.BUFFER, true);
    });

    it('93.2.15 oracledb.BUFFER <--> DB: NCHAR', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "NCHAR", null, oracledb.BUFFER, true);
    });

    it('93.2.16 oracledb.BUFFER <--> DB: VARCHAR2', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "VARCHAR2", null, oracledb.BUFFER, true);
    });

    it('93.2.17 oracledb.BUFFER <--> DB: FLOAT', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "FLOAT", null, oracledb.BUFFER, true);
    });

    it('93.2.18 oracledb.BUFFER <--> DB: BINARY_FLOAT', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "BINARY_FLOAT", null, oracledb.BUFFER, true);
    });

    it('93.2.19 oracledb.BUFFER <--> DB: BINARY_DOUBLE', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "BINARY_DOUBLE", null, oracledb.BUFFER, true);
    });

    it('93.2.20 oracledb.BUFFER <--> DB: DATE', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "DATE", null, oracledb.BUFFER, true);
    });

    it('93.2.21 oracledb.BUFFER <--> DB: TIMESTAMP', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "TIMESTAMP", null, oracledb.BUFFER, true);
    });

    it('93.2.22 oracledb.BUFFER <--> DB: RAW', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "RAW", null, oracledb.BUFFER, true);
    });

    it('93.2.23 oracledb.BUFFER <--> DB: CLOB', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "CLOB", null, oracledb.BUFFER, true);
    });

    it('93.2.24 oracledb.BUFFER <--> DB: BLOB', async function() {
      index++;
      await doTest(tableNamePre + index, procName + index, "BLOB", null, oracledb.BUFFER, true);
    });
  });
});
