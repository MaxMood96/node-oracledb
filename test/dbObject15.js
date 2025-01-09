/* Copyright (c) 2021, 2025, Oracle and/or its affiliates. */

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
 *   214. dbObject15.js
 *
 * DESCRIPTION
 *   Test DB Object collection methods.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');

describe('214. dbObject15.js', () => {

  let conn, FrisbeeTeam;

  const PLAYER_T = 'NODB_TYP_PLAYERTYPE';
  const TEAM_T   = 'NODB_TYP_TEAMTYPE';

  const FrisbeePlayers = [
    { SHIRTNUMBER: 10, NAME: 'Emma' },
    { SHIRTNUMBER: 11, NAME: 'Alex' },
    { SHIRTNUMBER: 12, NAME: 'Dave' },
    { SHIRTNUMBER: 13, NAME: 'Jack' },
    { SHIRTNUMBER: 14, NAME: 'Emmet' }
  ];

  before(async () => {
    conn = await oracledb.getConnection(dbConfig);

    let plsql = `
      CREATE OR REPLACE TYPE ${PLAYER_T} AS OBJECT (
        shirtnumber NUMBER,
        name        VARCHAR2(20)
      );
    `;
    await conn.execute(plsql);

    plsql = `
      CREATE OR REPLACE TYPE ${TEAM_T} AS VARRAY(5) OF ${PLAYER_T};
    `;
    await conn.execute(plsql);

    const TeamTypeClass = await conn.getDbObjectClass(TEAM_T);
    FrisbeeTeam = new TeamTypeClass(FrisbeePlayers);
  }); // before()

  after(async () => {
    let sql = `DROP TYPE ${TEAM_T} FORCE`;
    await conn.execute(sql);

    sql = `DROP TYPE ${PLAYER_T} FORCE`;
    await conn.execute(sql);

    await conn.close();
  }); // after()

  it('214.1 Getter() - access collection elements directly', function() {
    for (let i = 0, element; i < FrisbeePlayers.length; i++) {
      element = FrisbeeTeam[i];
      assert.strictEqual(element.SHIRTNUMBER, FrisbeePlayers[i].SHIRTNUMBER);
      assert.strictEqual(element.NAME, FrisbeePlayers[i].NAME);
    }
    assert.equal(FrisbeeTeam.length, 5);
  }); // 214.1

  it('214.2 Setter() - access collection element directly', function() {
    const substitute = {SHIRTNUMBER: 15, NAME: 'Chris'};
    FrisbeeTeam[0] = substitute;
    assert.strictEqual(FrisbeeTeam[0].SHIRTNUMBER, substitute.SHIRTNUMBER);
    assert.strictEqual(FrisbeeTeam[0].NAME, substitute.NAME);

    // Verify that the other elements are not impacted
    for (let i = 1, element; i < FrisbeePlayers.length; i++) {
      element = FrisbeeTeam[i];
      assert.strictEqual(element.SHIRTNUMBER, FrisbeePlayers[i].SHIRTNUMBER);
      assert.strictEqual(element.NAME, FrisbeePlayers[i].NAME);
    }
  }); // 214.2

  it('214.3 Negative - cannot add more than maximum number of elements', function() {
    assert.throws(
      () => FrisbeeTeam.append({SHIRTNUMBER: 9, NAME: 'Diogo'}),
      /NJS-131:/
    );
  }); // 214.3

  it('214.4 Negative - Cannot delete the VARRAY collection element directly', function() {
    assert.throws(
      () => delete FrisbeeTeam[1],
      /NJS-133:/
    );
  }); // 214.4

  it('214.5 Negative - collection.deleteElement()', function() {
    assert.throws(
      function() {
        const firstIndex = FrisbeeTeam.getFirstIndex();
        FrisbeeTeam.deleteElement(firstIndex);
      },
      /NJS-133:/
    );
  }); // 214.5
});
