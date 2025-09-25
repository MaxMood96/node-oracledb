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
 *   101. binding_defaultBindInout.js
 *
 * DESCRIPTION
 *   This suite tests the data binding, including:
 *     Test cases test bind inout oracledb type STRING/BUFFER to all db column types using plsql procedure and function
 *     The cases use default bind type and dir.
 *     The cases take null bind values.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('101.binding_defaultBindInout.js', function() {

  let connection = null;

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
    assert(connection);
  });

  after(async function() {
    await connection.close();
  });

  const doTest1 = async function(table_name, procName, dbColType, content, sequence) {
    let bindVar = {
      i: sequence,
      c: content
    };
    await inBind1(table_name, procName, dbColType, bindVar);

    bindVar = [ sequence, content ];
    await inBind1(table_name, procName, dbColType, bindVar);
  };

  const inBind1 = async function(table_name, proc_name, dbColType, bindVar) {
    const proc = "CREATE OR REPLACE PROCEDURE " + proc_name + " (ID IN NUMBER, inValue IN OUT " + dbColType + ")\n" +
               "AS \n" +
               "BEGIN \n" +
               "    insert into " + table_name + " ( id, content ) values (ID, inValue); \n" +
               "    select content into inValue from " + table_name + " where id = ID; \n" +
               "END " + proc_name + "; ";
    const sqlRun = "BEGIN " + proc_name + " (:i, :c); END;";
    const proc_drop = "DROP PROCEDURE " + proc_name;

    // Create table first
    await testsUtil.createBindingTestTable(connection, table_name, dbColType);

    // Create procedure
    await connection.execute(proc);

    if (dbColType === "BLOB") {
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar),
        /ORA-06550:/
      );
    } else {
      await connection.execute(sqlRun, bindVar);
    }

    // Cleanup
    await connection.execute(proc_drop);
    await testsUtil.dropTable(connection, table_name);
  };

  const doTest2 = async function(table_name, procPre, dbColType, content, sequence) {
    let bindVar = {
      i: sequence,
      c: content,
      output: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
    };
    await inBind2(table_name, procPre, dbColType, bindVar);

    bindVar = [ { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }, sequence, content ];
    await inBind2(table_name, procPre, dbColType, bindVar);
  };

  const inBind2 = async function(table_name, fun_name, dbColType, bindVar) {
    const proc = "CREATE OR REPLACE FUNCTION " + fun_name + " (ID IN NUMBER, inValue IN OUT " + dbColType + ") RETURN NUMBER\n" +
               "IS \n" +
               "    tmpconst NUMBER; \n" +
               "BEGIN \n" +
               "    insert into " + table_name + " ( id, content ) values (ID, inValue); \n" +
               "    select id, content into tmpconst, inValue from " + table_name + " where id = ID; \n" +
               "    RETURN tmpconst; \n" +
               "END ; ";
    const sqlRun = "BEGIN :output := " + fun_name + " (:i, :c); END;";
    const proc_drop = "DROP FUNCTION " + fun_name;

    // Create table first
    await testsUtil.createBindingTestTable(connection, table_name, dbColType);

    // Create function
    await connection.execute(proc);

    if (dbColType === "BLOB") {
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar),
        /ORA-06550:/
      );
    } else {
      await connection.execute(sqlRun, bindVar);
    }

    // Cleanup
    await connection.execute(proc_drop);
    await testsUtil.dropTable(connection, table_name);
  };

  const tableNamePre = "table_101";
  const procPre = "proc_101";
  let index = 1;

  describe('101.1 PLSQL procedure: bind out null value with default type and dir', function() {

    it('101.1.1 oracledb.STRING <--> DB: NUMBER', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "NUMBER";

      await doTest1(table_name, proc_name, dbColType, content, index);
    });

    it('101.1.2 oracledb.STRING <--> DB: CHAR', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "CHAR";

      await doTest1(table_name, proc_name, dbColType, content, index);
    });

    it('101.1.3 oracledb.STRING <--> DB: NCHAR', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "NCHAR";

      await doTest1(table_name, proc_name, dbColType, content, index);
    });

    it('101.1.4 oracledb.STRING <--> DB: VARCHAR2', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "VARCHAR2";

      await doTest1(table_name, proc_name, dbColType, content, index);
    });

    it('101.1.5 oracledb.STRING <--> DB: FLOAT', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "FLOAT";

      await doTest1(table_name, proc_name, dbColType, content, index);
    });

    it('101.1.6 oracledb.STRING <--> DB: BINARY_FLOAT', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "BINARY_FLOAT";

      await doTest1(table_name, proc_name, dbColType, content, index);
    });

    it('101.1.7 oracledb.STRING <--> DB: BINARY_DOUBLE', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "BINARY_DOUBLE";

      await doTest1(table_name, proc_name, dbColType, content, index);
    });

    it('101.1.8 oracledb.STRING <--> DB: DATE', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "DATE";

      await doTest1(table_name, proc_name, dbColType, content, index);
    });

    it('101.1.9 oracledb.STRING <--> DB: TIMESTAMP', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "TIMESTAMP";

      await doTest1(table_name, proc_name, dbColType, content, index);
    });

    it('101.1.10 oracledb.STRING <--> DB: RAW', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "RAW";

      await doTest1(table_name, proc_name, dbColType, content, index);
    });

    it('101.1.11 oracledb.STRING <--> DB: CLOB', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "CLOB";

      await doTest1(table_name, proc_name, dbColType, content, index);
    });

    it('101.1.12 oracledb.STRING <--> DB: BLOB', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "BLOB";

      await doTest1(table_name, proc_name, dbColType, content, index);
    });

    it('101.1.13 oracledb.BUFFER <--> DB: NUMBER', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "NUMBER";

      await doTest1(table_name, proc_name, dbColType, content, index);
    });

    it('101.1.14 oracledb.BUFFER <--> DB: CHAR', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "CHAR";

      await doTest1(table_name, proc_name, dbColType, content, index);
    });

    it('101.1.15 oracledb.BUFFER <--> DB: NCHAR', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "NCHAR";

      await doTest1(table_name, proc_name, dbColType, content, index);
    });

    it('101.1.16 oracledb.BUFFER <--> DB: VARCHAR2', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "VARCHAR2";

      await doTest1(table_name, proc_name, dbColType, content, index);
    });

    it('101.1.17 oracledb.BUFFER <--> DB: FLOAT', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "FLOAT";

      await doTest1(table_name, proc_name, dbColType, content, index);
    });

    it('101.1.18 oracledb.BUFFER <--> DB: BINARY_FLOAT', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "BINARY_FLOAT";

      await doTest1(table_name, proc_name, dbColType, content, index);
    });

    it('101.1.19 oracledb.BUFFER <--> DB: BINARY_DOUBLE', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "BINARY_DOUBLE";

      await doTest1(table_name, proc_name, dbColType, content, index);
    });

    it('101.1.20 oracledb.BUFFER <--> DB: DATE', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "DATE";

      await doTest1(table_name, proc_name, dbColType, content, index);
    });

    it('101.1.21 oracledb.BUFFER <--> DB: TIMESTAMP', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "TIMESTAMP";

      await doTest1(table_name, proc_name, dbColType, content, index);
    });

    it('101.1.22 oracledb.BUFFER <--> DB: RAW', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "RAW";

      await doTest1(table_name, proc_name, dbColType, content, index);
    });

    it('101.1.23 oracledb.BUFFER <--> DB: CLOB', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "CLOB";

      await doTest1(table_name, proc_name, dbColType, content, index);
    });

    it('101.1.24 oracledb.BUFFER <--> DB: BLOB', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "BLOB";

      await doTest1(table_name, proc_name, dbColType, content, index);
    });
  });

  describe('101.2 PLSQL function: bind out null value with default type and dir', function() {

    it('101.2.1 oracledb.STRING <--> DB: NUMBER', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "NUMBER";

      await doTest2(table_name, proc_name, dbColType, content, index);
    });

    it('101.2.2 oracledb.STRING <--> DB: CHAR', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "CHAR";

      await doTest2(table_name, proc_name, dbColType, content, index);
    });

    it('101.2.3 oracledb.STRING <--> DB: NCHAR', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "NCHAR";

      await doTest2(table_name, proc_name, dbColType, content, index);
    });

    it('101.2.4 oracledb.STRING <--> DB: VARCHAR2', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "VARCHAR2";

      await doTest2(table_name, proc_name, dbColType, content, index);
    });

    it('101.2.5 oracledb.STRING <--> DB: FLOAT', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "FLOAT";

      await doTest2(table_name, proc_name, dbColType, content, index);
    });

    it('101.2.6 oracledb.STRING <--> DB: BINARY_FLOAT', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "BINARY_FLOAT";

      await doTest2(table_name, proc_name, dbColType, content, index);
    });

    it('101.2.7 oracledb.STRING <--> DB: BINARY_DOUBLE', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "BINARY_DOUBLE";

      await doTest2(table_name, proc_name, dbColType, content, index);
    });

    it('101.2.8 oracledb.STRING <--> DB: DATE', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "DATE";

      await doTest2(table_name, proc_name, dbColType, content, index);
    });

    it('101.2.9 oracledb.STRING <--> DB: TIMESTAMP', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "TIMESTAMP";

      await doTest2(table_name, proc_name, dbColType, content, index);
    });

    it('101.2.10 oracledb.STRING <--> DB: RAW', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "RAW";

      await doTest2(table_name, proc_name, dbColType, content, index);
    });

    it('101.2.11 oracledb.STRING <--> DB: CLOB', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "CLOB";

      await doTest2(table_name, proc_name, dbColType, content, index);
    });

    it('101.2.12 oracledb.STRING <--> DB: BLOB', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "BLOB";

      await doTest2(table_name, proc_name, dbColType, content, index);
    });

    it('101.2.13 oracledb.BUFFER <--> DB: NUMBER', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "NUMBER";

      await doTest2(table_name, proc_name, dbColType, content, index);
    });

    it('101.2.14 oracledb.BUFFER <--> DB: CHAR', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "CHAR";

      await doTest2(table_name, proc_name, dbColType, content, index);
    });

    it('101.2.15 oracledb.BUFFER <--> DB: NCHAR', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "NCHAR";

      await doTest2(table_name, proc_name, dbColType, content, index);
    });

    it('101.2.16 oracledb.BUFFER <--> DB: VARCHAR2', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "VARCHAR2";

      await doTest2(table_name, proc_name, dbColType, content, index);
    });

    it('101.2.17 oracledb.BUFFER <--> DB: FLOAT', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "FLOAT";

      await doTest2(table_name, proc_name, dbColType, content, index);
    });

    it('101.2.18 oracledb.BUFFER <--> DB: BINARY_FLOAT', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "BINARY_FLOAT";

      await doTest2(table_name, proc_name, dbColType, content, index);
    });

    it('101.2.19 oracledb.BUFFER <--> DB: BINARY_DOUBLE', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "BINARY_DOUBLE";

      await doTest2(table_name, proc_name, dbColType, content, index);
    });

    it('101.2.20 oracledb.BUFFER <--> DB: DATE', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "DATE";

      await doTest2(table_name, proc_name, dbColType, content, index);
    });

    it('101.2.21 oracledb.BUFFER <--> DB: TIMESTAMP', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "TIMESTAMP";

      await doTest2(table_name, proc_name, dbColType, content, index);
    });

    it('101.2.22 oracledb.BUFFER <--> DB: RAW', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "RAW";

      await doTest2(table_name, proc_name, dbColType, content, index);
    });

    it('101.2.23 oracledb.BUFFER <--> DB: CLOB', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "CLOB";

      await doTest2(table_name, proc_name, dbColType, content, index);
    });

    it('101.2.24 oracledb.BUFFER <--> DB: BLOB', async function() {
      index++;
      const table_name = tableNamePre + index;
      const proc_name = procPre + index;
      const content = null;
      const dbColType = "BLOB";

      await doTest2(table_name, proc_name, dbColType, content, index);
    });
  });
});
