/* Copyright (c) 2018, 2024, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
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
 *   em_dmlreturn2.js
 *
 * DESCRIPTION
 *   executeMany() example of DML RETURNING that returns multiple values
 *
 *****************************************************************************/

'use strict';

Error.stackTraceLimit = 50;

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');
const demoSetup = require('./demosetup.js');

// This example runs in both node-oracledb Thin and Thick modes.
//
// Optionally run in node-oracledb Thick mode
if (process.env.NODE_ORACLEDB_DRIVER_MODE === 'thick') {

  // Thick mode requires Oracle Client or Oracle Instant Client libraries.
  // On Windows and macOS you can specify the directory containing the
  // libraries at runtime or before Node.js starts.  On other platforms (where
  // Oracle libraries are available) the system library search path must always
  // include the Oracle library path before Node.js starts.  If the search path
  // is not correct, you will get a DPI-1047 error.  See the node-oracledb
  // installation documentation.
  let clientOpts = {};
  // On Windows and macOS platforms, set the environment variable
  // NODE_ORACLEDB_CLIENT_LIB_DIR to the Oracle Client library path
  if (process.platform === 'win32' || process.platform === 'darwin') {
    clientOpts = { libDir: process.env.NODE_ORACLEDB_CLIENT_LIB_DIR };
  }
  oracledb.initOracleClient(clientOpts);  // enable node-oracledb Thick mode
}

console.log(oracledb.thin ? 'Running in thin mode' : 'Running in thick mode');

const insertSql = "INSERT INTO no_em_tab VALUES (:1, :2)";

const insertData = [
  [1, "Test 1 (One)"],
  [2, "Test 2 (Two)"],
  [3, "Test 3 (Three)"],
  [4, "Test 4 (Four)"],
  [5, "Test 5 (Five)"],
  [6, "Test 6 (Six)"],
  [7, "Test 7 (Seven)"],
  [8, "Test 8 (Eight)"]
];

const insertOptions = {
  bindDefs: [
    { type: oracledb.NUMBER },
    { type: oracledb.STRING, maxSize: 20 }
  ]
};

const deleteSql = "DELETE FROM no_em_tab WHERE id < :1 RETURNING id, val INTO :2, :3";

const deleteData = [
  [2],
  [6],
  [8]
];

const deleteOptions = {
  bindDefs: [
    { type: oracledb.NUMBER },
    { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
    { type: oracledb.STRING, maxSize: 25, dir: oracledb.BIND_OUT }
  ]
};

async function run() {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    await demoSetup.setupEm(connection);  // create the demo table

    await connection.executeMany(insertSql, insertData, insertOptions);

    const result = await connection.executeMany(deleteSql, deleteData, deleteOptions);

    console.log("rowsAffected is:", result.rowsAffected);
    console.log("Out binds:");
    for (let i = 0; i < result.outBinds.length; i++) {
      console.log("-->", result.outBinds[i]);
    }

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
}

run();
