.. _objects:

*********************************************
Using Oracle Database Objects and Collections
*********************************************

You can query and insert most Oracle Database objects and collections,
with some :ref:`limitations <objectlimitations>`.

Both the node-oracledb Thin and Thick modes support Oracle Database Objects.
The node-oracledb Thin mode does not support Oracle Database Objects that
contain LOBs.

.. _objectinsert:

Inserting Objects
=================

Performance-sensitive applications should consider using scalar types
instead of objects. If you do use objects, avoid calling
:meth:`connection.getDbObjectClass()` unnecessarily, and avoid objects with
large numbers of attributes. Using the type's fully qualified name can help
performance.

As an example, the Oracle Spatial type
`SDO_GEOMETRY <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=
GUID-683FF8C5-A773-4018-932D-2AF6EC8BC119>`__ can easily be used in
node-oracledb. Describing SDO_GEOMETRY in SQL*Plus shows:

::

    Name                                      Null?    Type
    ----------------------------------------- -------- ----------------------------
    SDO_GTYPE                                          NUMBER
    SDO_SRID                                           NUMBER
    SDO_POINT                                          MDSYS.SDO_POINT_TYPE
    SDO_ELEM_INFO                                      MDSYS.SDO_ELEM_INFO_ARRAY
    SDO_ORDINATES                                      MDSYS.SDO_ORDINATE_ARRAY

In Node.js, a call to :meth:`connection.getDbObjectClass()` returns a
:ref:`DbObject prototype object <dbobjectclass>` representing the
database type:

.. code-block:: javascript

    const GeomType = await connection.getDbObjectClass("MDSYS.SDO_GEOMETRY");
    console.log(GeomType.prototype);

This gives::

    DbObject {
        schema: 'MDSYS',
        name: 'SDO_GEOMETRY',
        fqn: 'MDSYS.SDO_GEOMETRY',
        attributes:
        {   SDO_GTYPE: { type: 2010, typeName: 'NUMBER' },
            SDO_SRID: { type: 2010, typeName: 'NUMBER' },
            SDO_POINT:
            {   type: 2023,
                typeName: 'MDSYS.SDO_POINT_TYPE',
                typeClass: [Object] },
            SDO_ELEM_INFO:
            {   type: 2023,
                typeName: 'MDSYS.SDO_ELEM_INFO_ARRAY',
                typeClass: [Object] },
            SDO_ORDINATES:
            {   type: 2023,
                typeName: 'MDSYS.SDO_ORDINATE_ARRAY',
                typeClass: [Object] } },
            isCollection: false }

The ``type`` value of 2023 corresponds to the ``oracledb.DB_TYPE_OBJECT``
constant. The value 2010 corresponds to ``oracledb.DB_TYPE_NUMBER``.

Now that the object prototype has been found, an object can be created by
passing a JavaScript object to the constructor.

.. note::

    The case of the attributes is important.

Attributes not assigned values will default to null. Extra attributes
set that are not present in the database object will be ignored.

.. code-block:: javascript

    const geom = new GeomType(
        {
            SDO_GTYPE: 2003,
            SDO_SRID: null,
            SDO_POINT: null,
            SDO_ELEM_INFO: [ 1, 1003, 3 ],
            SDO_ORDINATES: [ 1, 1, 5, 7 ]
        }
    );

An alternative to instantiating the whole object at once is to set
individual attributes:

.. code-block:: javascript

    const geom = new GeomType();
    geom.S_GTYPE = 2003;
    . . .

Once created, the DbObject in ``geom`` can then be bound for insertion.
For example, if TESTGEOMETRY was created as:

.. code-block:: sql

    CREATE TABLE testgeometry (id NUMBER, geometry MDSYS.SDO_GEOMETRY)

Then the INSERT statement would be:

.. code-block:: javascript

    await connection.execute(
        `INSERT INTO testgeometry (id, geometry) VALUES (:id, :g)`,
        {id: 1, g: geom}
    );

Node-oracledb automatically detects the type for ``geom``.

Insertion can be simplified by setting the bind parameter ``type`` to
the name of the Oracle Database object and passing a JavaScript object
as the bind value:

.. code-block:: javascript

    await connection.execute(
        `INSERT INTO testgeometry (id, geometry) VALUES (:id, :g)`,
        {
            id: 1,
            g: {
                type: "MDSYS.SDO_GEOMETRY",
                val: {
                    SDO_GTYPE: 2003,
                    SDO_SRID: null,
                    SDO_POINT: null,
                    SDO_ELEM_INFO: [ 1, 1003, 3 ],
                    SDO_ORDINATES: [ 1, 1, 5, 7 ]
                }
            }
        }
    );

For objects that are nested, such as SDO_GEOMETRY is, you only need to
give the name of the top level object.

See `selectgeometry.js <https://github.com/oracle/node-oracledb/tree/
main/examples/selectgeometry.js>`__ for a runnable example.

When handling multiple objects of the same type, then use fully
qualified names like “MDSYS.SDO_GEOMETRY” instead of “SDO_GEOMETRY”.
Alternatively retain, and use, the prototype object returned by
:meth:`connection.getDbObjectClass()`. Node-oracledb will cache
type information using the type’s fully qualified name as the
key to avoid the expense of a :ref:`round-trip <roundtrips>`, when
possible. Each connection has its own cache.

When the definition of a type changes in the database, such as might
occur in a development environment, you should fully close connections
to clear the object caches used by node-oracledb and the Oracle client
libraries. For example, when using a pool you could use
:meth:`await connection.close({drop: true}) <connection.close()>`, or
restart the pool. Then ``getDbObjectClass()`` can be called again to get
the updated type information.

.. _objectfetch:

Fetching Objects
================

When objects are fetched, they are represented as a
:ref:`DbObject <dbobjectclass>`.

Note that LOBs will be represented as :ref:`Lob objects <lobclass>`
regardless of any ``fetchAsString``, ``fetchAsBuffer``, or ``fetchInfo``
setting.

If :attr:`oracledb.dbObjectAsPojo` is set to *true*, then
queried objects and OUT bind objects are returned as “plain old
JavaScript objects” instead of being database-backed. The setting can
help performance if an object’s attributes are accessed multiple times.
However if only a few object attributes are accessed, or attributes are
accessed once, then it may be more efficient to keep ``dbObjectAsPojo``
*false*. Setting ``dbObjectAsPojo`` to *true* also allows applications
to close connections before any attributes are accessed unless LOBs are
involved.

Accessing a DbObject is the same whichever value of ``dbObjectAsPojo``
you use. For example:

.. code-block:: javascript

    result = await connection.execute(`SELECT geometry FROM testgeometry WHERE id = 1`);
    o = result.rows[0][0];
    console.log(o);

This gives::

    [MDSYS.SDO_GEOMETRY] { SDO_GTYPE: 2003,
        SDO_SRID: null,
        SDO_POINT: null,
        SDO_ELEM_INFO: [ 4, 1003, 3 ],
        SDO_ORDINATES: [ 4, 8, 5, 9 ] }

The SDO_ELEM_INFO attribute is itself a DbObject. The following code

.. code-block:: javascript

    console.log(o.SDO_ELEM_INFO);

gives:

::

    [MDSYS.SDO_ELEM_INFO_ARRAY] [ 1, 1003, 3 ]

If a DbObject is for an Oracle Database collection, the
:attr:`dbObject.isCollection` attribute
will be true.

.. code-block:: javascript

    console.log(o.isCollection);                // false
    console.log(o.SDO_ELEM_INFO.isCollection);  // true

For DbObjects representing Oracle collections, methods such as
:meth:`dbObject.getKeys()` and :meth:`dbObject.getValues()` can be used:

.. code-block:: javascript

    console.log(o.SDO_ELEM_INFO.getKeys());    // [ 0, 1, 2 ]
    console.log(o.SDO_ELEM_INFO.getValues());  // [ 1, 1003, 3 ]

The options :attr:`~oracledb.fetchAsBuffer` and
:attr:`oracledb.fetchAsString` do not affect values in
objects queried from the database.

LOBs will be fetched as :ref:`Lob objects <lobclass>`. The
:meth:`lob.getData()` method is a convenient way to
retrieve the data. Note it is an asynchronous method and requires a
round-trip to the database.

.. _dbobjecttypehandlers:

Using DbObject Type Handlers
============================

You may need to convert the data type of a DbObject property to another data
type for any reason (for example, to preserve numeric precision when reading
as a JavaScript type). The data returned in the DbObject properties can be
processed further by using a DbObject type handler introduced in node-oracledb
6.8.

The DbObject type handler converts the data type of the DbObject property to
the desired data type before the data is returned from the database to
node-oracledb.

A DbObject type handler can be specified in the
:attr:`oracledb.dbObjectTypeHandler` attribute.

The DbObject type handler is expected to be a function with a single object
argument. This single object argument contains the ``type``, ``maxSize``,
``typeName``, ``precision``, and ``scale`` attributes. See
:attr:`oracledb.dbObjectTypeHandler` for more information on these attributes.

The function is called once for each property inside the DbObject. The
function is expected to return an object containing
:ref:`converter <converterfunc>` attribute.

DbObject type handlers cannot be used with LOB data types.

.. _bigintinobj:

Using BigInt Data in DbObjects with DbObject Type Handlers
----------------------------------------------------------

From node-oracledb 6.8 onwards, you can pass BigInt numbers in a
:ref:`DbObject Class <dbobjectclass>` instance in both Thin and Thick modes.

By default, number and BigInt data types in the DbObject property are returned
as JavaScript numbers from the database when using node-oracledb Thin or Thick
mode. This results in an incorrect BigInt value being returned.

You can use the :attr:`oracledb.dbObjectTypeHandler` property to convert the
string value of the BigInt number to the actual number.

Consider the following object nodb_bigIntType:

.. code-block:: sql

    CREATE TYPE nodb_bigIntType AS OBJECT (
        BIGINTDATA NUMBER);

To reliably work with BigInt numbers in DbObject, it is recommended to use a
DbObject type handler. The following fetch type handler can be used to return
the correct BigInt value:

.. code-block:: javascript

    const myDbObjectFetchTypeHandler = function(metadata) {
      if (metadata.type === oracledb.DB_TYPE_NUMBER) {
        return {
          converter: (val) => {
            if (val.includes('.')) {
              return parseFloat(val); // It's a float, return as Number
            }

            // Convert to BigInt to avoid loss of precision.
            const bigIntValue = BigInt(val);
            return bigIntValue;
          }
        };
      }
    };

The above type handler can be used as shown in the example below:

.. code-block:: javascript

    const num = 589508999999999999999n;
    const plsql = `declare myType nodb_bigIntType := :t; begin :t := myType; end;`;
    const bind =
      {
        t: {
          dir: oracledb.BIND_INOUT,
          type: nodb_bigIntType,
          val: {
            'BIGINTDATA': num
        }
      };
    oracledb.dbObjectTypeHandler = myDbObjectFetchTypeHandler;
    let result = await connection.execute(plsql, bind, {outFormat: oracledb.OUT_FORMAT_OBJECT});
    console.log(result.outBinds.t.BIGINTDATA);

This would print ``589508999999999999999n``.

If ``JSON.stringify()`` is called on the DbObject, then a ``TypeError`` is
thrown since `BigInt is not serializable
<https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/BigInt_not_serializable>`__
and hence JSON stringification is not possible here.

.. _plsqlcollections:

PL/SQL Collection Types
=======================

PL/SQL has three collection types: associative arrays, VARRAY
(variable-size arrays), and nested tables. See `Collection Types
<https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-7E9034D5-
0D33-43A1-9012-918350FE148C>`__ in the Database PL/SQL Language Reference.

.. _plsqlindexbybinds:

PL/SQL Collection Associative Arrays (Index-by)
-----------------------------------------------

Arrays can be bound to PL/SQL IN, IN OUT, and OUT parameters of PL/SQL
INDEX BY associative array types with integer keys. This Oracle type was
formerly called PL/SQL tables or index-by tables.

While you could bind associative arrays via named types as shown in
previous examples, it is more efficient to use the method shown below
which uses the type of each element, not the name of the associative
array type. Note that if you use named types for BIND_IN, then the
resulting arrays in PL/SQL will start from index 0. The method shown
below results in indexes starting from 1. (Using named type binding for
nested tables and VARRAYs results in indexes starting from 1).

Given this table and PL/SQL package:

.. code-block:: sql

    DROP TABLE mytab;

    CREATE TABLE mytab (id NUMBER, numcol NUMBER);

    CREATE OR REPLACE PACKAGE mypkg IS
        TYPE numtype IS TABLE OF NUMBER INDEX BY BINARY_INTEGER;
        PROCEDURE myinproc(p_id IN NUMBER, vals IN numtype);
        PROCEDURE myoutproc(p_id IN NUMBER, vals OUT numtype);
    END;
    /

    CREATE OR REPLACE PACKAGE BODY mypkg IS

        PROCEDURE myinproc(p_id IN NUMBER, vals IN numtype) IS
        BEGIN
            FORALL i IN INDICES OF vals
                INSERT INTO mytab (id, numcol) VALUES (p_id, vals(i));
        END;

        PROCEDURE myoutproc(p_id IN NUMBER, vals OUT numtype) IS
        BEGIN
            SELECT numcol BULK COLLECT INTO vals FROM mytab WHERE id = p_id ORDER BY 1;
        END;

    END;
    /

To bind an array in node-oracledb using “bind by name” syntax for
insertion into ``mytab`` use:

.. code-block:: javascript

    const result = await connection.execute(
        `BEGIN mypkg.myinproc(:id, :vals); END;`,
        {
            id: 1234,
            vals: { type: oracledb.NUMBER,
                    dir: oracledb.BIND_IN,
                    val: [1, 2, 23, 4, 10]
                }
        });

Alternatively, “bind by position” syntax can be used:

.. code-block:: javascript

    const result = await connection.execute(
    `BEGIN mypkg.myinproc(:id, :vals); END;`,
    [
        1234,
        {   type: oracledb.NUMBER,
            dir: oracledb.BIND_IN,
            val: [1, 2, 23, 4, 10]
        }
    ]);

After executing either of these ``mytab`` will contain:

::

       ID         NUMCOL
    ---------- ----------
        1234          1
        1234          2
        1234         23
        1234          4
        1234         10

The :ref:`type <executebindparamtype>` must be set for PL/SQL array
binds. It can be set to
:ref:`oracledb.STRING <oracledbconstantsnodbtype>`,
:ref:`oracledb.DB_TYPE_VARCHAR <oracledbconstantsdbtype>`,
:ref:`oracledb.NUMBER <oracledbconstantsnodbtype>`,
:ref:`oracledb.DB_TYPE_NUMBER <oracledbconstantsdbtype>`,
:ref:`oracledb.DB_TYPE_NVARCHAR <oracledbconstantsdbtype>`,
:ref:`oracledb.DB_TYPE_CHAR <oracledbconstantsdbtype>`,
:ref:`oracledb.DB_TYPE_NCHAR <oracledbconstantsdbtype>`,
:ref:`oracledb.DB_TYPE_BINARY_FLOAT <oracledbconstantsdbtype>`,
:ref:`oracledb.DB_TYPE_BINARY_DOUBLE <oracledbconstantsdbtype>`,
:ref:`oracledb.DB_TYPE_DATE <oracledbconstantsdbtype>`,
:ref:`oracledb.DB_TYPE_TIMESTAMP <oracledbconstantsdbtype>`,
:ref:`oracledb.DB_TYPE_TIMESTAMP_LTZ <oracledbconstantsdbtype>`,
:ref:`oracledb.DB_TYPE_TIMESTAMP_TZ <oracledbconstantsdbtype>` or
:ref:`oracledb.DB_TYPE_RAW <oracledbconstantsdbtype>`.

For OUT and IN OUT binds, the
:ref:`maxArraySize <executebindparammaxarraysize>` bind property must
be set. Its value is the maximum number of elements that can be returned
in an array. An error will occur if the PL/SQL block attempts to insert
data beyond this limit. If the PL/SQL code returns fewer items, the
JavaScript array will have the actual number of data elements and will
not contain null entries. Setting ``maxArraySize`` larger than needed
will cause unnecessary memory allocation.

For IN OUT binds, ``maxArraySize`` can be greater than the number of
elements in the input array. This allows more values to be returned than
are passed in.

For IN binds, ``maxArraySize`` is ignored, as also is ``maxSize``.

For IN OUT or OUT binds that are returned as String or Buffer, the
:ref:`maxSize <executebindparammaxsize>` property may be set. If it is
not set the memory allocated per string will default to 200 bytes. If
the value is not large enough to hold the longest data item in the
collection, then a runtime error occurs. To avoid unnecessary memory
allocation, do not let the size be larger than needed.

The next example fetches an array of values from a table. First, insert
these values:

.. code-block:: sql

    INSERT INTO mytab (id, numcol) VALUES (99, 10);
    INSERT INTO mytab (id, numcol) VALUES (99, 25);
    INSERT INTO mytab (id, numcol) VALUES (99, 50);
    COMMIT;

With these values, the following node-oracledb code will print
``[ 10, 25, 50 ]``.

.. code-block:: javascript

    const result = await connection.execute(
        `BEGIN mypkg.myoutproc(:id, :vals); END;`,
        {
            id: 99,
            vals: { type: oracledb.NUMBER,
                    dir:  oracledb.BIND_OUT,
                    maxArraySize: 10          // allocate memory to hold 10 numbers
                }
        }
    );

    console.log(result.outBinds.vals);

If ``maxArraySize`` was reduced to ``2``, the script would fail with:

::

    ORA-06513: PL/SQL: index for PL/SQL table out of range for host language array

See :ref:`Oracledb Constants <oracledbconstants>` and :ref:`execute(): Bind
Parameters <executebindParams>` for more information about binding.

See `plsqlarray.js <https://github.com/oracle/node-oracledb/tree/
main/examples/plsqlarray.js>`__ for a runnable example.

.. _indexbyplsinteger:

Associative Array Indexed By PLS_INTEGER
++++++++++++++++++++++++++++++++++++++++

The following example defines an associative array indexed by PLS_INTEGER and
a function that returns an associative array of that type.

.. code-block:: sql

    DROP TABLE mytable;

    CREATE TABLE mytable (id NUMBER, numcol NUMBER);

    CREATE OR REPLACE PACKAGE mypkg IS
        TYPE numtype IS TABLE OF NUMBER INDEX BY PLS_INTEGER;
        FUNCTION F1 RETURN numtype;
    END;
    /

    CREATE OR REPLACE PACKAGE BODY mypkg AS
        FUNCTION F1 RETURN numtype IS
        R numtype;
        BEGIN
            R(2):=22;
            R(5):=55;
            RETURN R;
        END;
    END;
    /

To return a map object for collection types indexed by PLS_INTEGER to
get the keys along with values, you can use the :meth:`dbObject.toMap()`
method:

.. code-block:: javascript

    const connection = await oracledb.getConnection({
        user          : "hr",
        password      : mypw,  // contains the hr schema password
        connectString : "localhost/FREEPDB1"
    });

    const result = await connection.execute(
        `BEGIN
            :ret := mypkg.f1;
         END;`,
        {
            ret: {
                dir: oracledb.BIND_OUT,
                type: `mypkg.numtype`
            }
        });
    const res = result.outBinds.ret;
    console.log(res.toMap());

This will print::

    Map(2) { 2 => 22, 5 => 55 }

.. _plsqlvarray:

PL/SQL Collection VARRAY Types
------------------------------

Given a table with a VARRAY column:

.. code-block:: sql

    CREATE TYPE playertype AS OBJECT (
        shirtnumber  NUMBER,
        name         VARCHAR2(20));
    /

    CREATE TYPE teamtype AS VARRAY(10) OF playertype;
    /

    CREATE TABLE sports (sportname VARCHAR2(20), team teamtype);

You can insert values using:

.. code-block:: javascript

    await connection.execute(
        `INSERT INTO sports (sportname, team) VALUES (:sn, :t)`,
        {
            sn: "Hockey",
            t:
            {
                type: "TEAMTYPE",
                val:
                [
                    {SHIRTNUMBER: 11, NAME: 'Georgia'},
                    {SHIRTNUMBER: 22, NAME: 'Harriet'}
                ]
            }
        }
    );

  // Alternatively:

    TeamTypeClass = await connection.getDbObjectClass("TEAMTYPE");

    hockeyTeam = new TeamTypeClass(
        [
            {SHIRTNUMBER: 22, NAME: 'Elizabeth'},
            {SHIRTNUMBER: 33, NAME: 'Frank'},
        ]
    );

    await connection.execute(
        `INSERT INTO sports (sportname, team) VALUES (:sn, :t)`,
        {
            sn: "Hockey",
            t: hockeyTeam
        });

Querying the table could be done like:

.. code-block:: javascript

    result = await connection.execute(
        `SELECT sportname, team FROM sports`,
        [],
        {
            outFormat: oracledb.OUT_FORMAT_OBJECT
        }
    );
    for (row of result.rows) {
        console.log("The " + row.SPORTNAME + " team players are:");
        for (const player of row.TEAM) {
            console.log("  " + player.NAME);
        }
    }

The output would be::

    The Hockey team players are:
        Elizabeth
        Frank

See `selectvarray.js <https://github.com/oracle/node-oracledb/tree/main/
examples/selectvarray.js>`__ for a runnable example.

.. _plsqlnestedtables:

PL/SQL Collection Nested Tables
-------------------------------

Given a nested table ``staffList``:

.. code-block:: sql

    CREATE TABLE bonuses (id NUMBER, name VARCHAR2(20));

    CREATE OR REPLACE PACKAGE personnel AS
        TYPE staffList IS TABLE OF bonuses%ROWTYPE;
        PROCEDURE awardBonuses (goodStaff staffList);
    END personnel;
    /

    CREATE OR REPLACE PACKAGE BODY personnel AS
        PROCEDURE awardBonuses (goodStaff staffList) IS
        BEGIN
            FORALL i IN INDICES OF goodStaff
                INSERT INTO bonuses (id, name) VALUES (goodStaff(i).id, goodStaff(i).name);
        END;
    END;
    /

you can call ``awardBonuses()`` like:

.. code-block:: javascript

    plsql = `CALL personnel.awardBonuses(:gsbv)`;

    binds = {
        gsbv:
        {
            type: "PERSONNEL.STAFFLIST",
            val:
            [
                {ID: 1, NAME: 'Chris' },
                {ID: 2, NAME: 'Sam' }
            ]
        }
    };

    await connection.execute(plsql, binds);

Similar with other objects, calling
:meth:`connection.getDbObjectClass()` and using a constructor
to create a ``DbObject`` for binding can also be used.

.. _plsqlrecords:

PL/SQL RECORD Types
===================

PL/SQL RECORDS can be bound for insertion and retrieval. This example
uses the PL/SQL package:

.. code-block:: sql

    CREATE OR REPLACE PACKAGE seachange AS
        TYPE shiptype IS RECORD (shipname VARCHAR2(40), weight NUMBER);
        PROCEDURE biggership (p_in IN shiptype, p_out OUT shiptype);
    END seachange;
    /

    CREATE OR REPLACE PACKAGE BODY seachange AS
        PROCEDURE biggership (p_in IN shiptype, p_out OUT shiptype) AS
        BEGIN
            p_out := p_in;
            p_out.weight := p_out.weight * 2;
        END;
    END seachange;
    /

Similar to previous examples, you can use a prototype DbObject from
``getdbobjectclass()`` for binding, or pass an Oracle type name.

Below a prototype object for the SHIPTYPE record is returned from
``getDbObjectClass()`` and then a new object ``vessel`` is created for a
ship. This is bound for input when calling the BIGGERSHIP procedure. To
retrieve a SHIPTYPE record back from the the PL/SQL, the prototype
object class is passed for the output bind ``type``:

.. code-block:: javascript

    ShipTypeClass = await connection.getDbObjectClass("SEACHANGE.SHIPTYPE");

    vessel = new ShipTypeClass({ SHIPNAME: 'BoatFace', WEIGHT: 1200 });

    binds = {
        inbv: vessel,
        outbv: { type: ShipTypeClass, dir: oracledb.BIND_OUT }
    };

    result = await connection.execute(`CALL seachange.biggership(:inbv, :outbv)`, binds);
    console.log(result.outBinds.outbv.SHIPNAME, result.outBinds.outbv.WEIGHT);

The output shows the increased ship size:

::

    BoatFace 2400

See `plsqlrecord.js <https://github.com/oracle/node-oracledb/tree/main/
examples/plsqlrecord.js>`__ for a runnable example.

.. _plsqlrecordrowtype:

PL/SQL Records with %ROWTYPE Attribute
--------------------------------------

PL/SQL RECORDS with `%ROWTYPE <https://www.oracle.com/pls/topic/lookup?ctx=
dblatest&id=GUID-4E0B9FE2-909D-444A-9B4A-E0243B7FCB99>`__ attribute can be
bound for insertion and retrieval. This was introduced in node-oracledb 6.6.
The following example uses the PL/SQL package ``MY_PKG`` and table ``STAFF``:

.. code-block:: javascript

    const stmts = [

        `CREATE TABLE STAFF (ID NUMBER, NAME VARCHAR2(25))`,

        `INSERT INTO STAFF VALUES (1, 'ADSA')`,

        `CREATE OR REPLACE PACKAGE MY_PKG AS
            TYPE STAFF_ARRAY IS TABLE OF STAFF%ROWTYPE
            INDEX BY BINARY_INTEGER;
            PROCEDURE prGetRecords(out_rec OUT MY_PKG.STAFF_ARRAY);
        END MY_PKG;`,

        `CREATE OR REPLACE PACKAGE BODY MY_PKG IS
            PROCEDURE prGetRecords(out_rec OUT MY_PKG.STAFF_ARRAY)
            IS
                CURSOR c_STAFF IS
                SELECT *
                FROM STAFF;
            BEGIN
                OPEN c_STAFF;
                FETCH c_STAFF BULK COLLECT INTO out_rec;
                CLOSE c_STAFF;
            END prGetRecords;
         END MY_PKG;`
    ];

    for (const s of stmts) {
      await conn.execute(s);
    }

You can pass the Oracle type name ``STAFF_ARRAY`` in the
:meth:`connection.getDbObjectClass()` method. To retrieve a STAFF_ARRAY record
back from the PL/SQL, the prototype object class is passed for the output
``bind`` type:

.. code-block:: javascript

    const objClass = await conn.getDbObjectClass("MY_PKG.STAFF_ARRAY");
    const result = await conn.execute(`CALL MY_PKG.prGetRecords(:out_rec)`,
                    {out_rec: {type: objClass, dir: oracledb.BIND_OUT}});
    for (const val of result.outBinds.out_rec) {
      console.log("\nRow contents:");
      console.log(val);
    }

This prints the following output::

    Row contents:
    [HR.STAFF%ROWTYPE] { ID: 1, NAME: 'ADSA' }

See `plsqlrowtype.js <https://github.com/oracle/node-oracledb/tree/main/
examples/plsqlrowtype.js>`__ for a runnable example.

.. _objexecmany:

Inserting or Passing Multiple Objects of the Same Type
======================================================

You can use ``executeMany()`` with objects. See :ref:`Binding Objects with
executeMany() <executemanyobjects>`.

.. _objxmltype:

Using XMLType Data in DbObjects
===============================

From version 6.6 onwards, you can use a :ref:`DbObject Class <dbobjectclass>`
instance with an attribute of type ``SYS.XMLTYPE`` in node-oracledb Thin mode.

Consider the following object ``NODB_XMLTYPE``:

.. code-block:: sql

    CREATE TYPE nodb_xmltype AS OBJECT (
        XMLDATA sys.xmltype);

The example below defines the XML data and queries this data from the
``NODB_XMLTYPE`` object.

.. code-block:: javascript

    const XMLData =
        '<Warehouse>\n  ' +
        '<WarehouseId>1</WarehouseId>\n  ' +
        '<WarehouseName>Melbourne, Australia</WarehouseName>\n  ' +
        '<Building>Owned</Building>\n  ' +
        '<Area>2020</Area>\n  ' +
        '<Docks>1</Docks>\n  ' +
        '<DockType>Rear load</DockType>\n  ' +
        '</Warehouse>\n';
    const sql = `SELECT nodb_xmltype(sys.xmltype('${XMLData}')) FROM dual`;
    const result = await connection.execute(sql);
    console.log('XML Data:\n', result.rows[0][0].XMLDATA);

This query prints the XMLType data in the object ``nodb_xmltype``::

    XML Data:
        <Warehouse>
        <WarehouseId>1</WarehouseId>
        <WarehouseName>Melbourne, Australia</WarehouseName>
        <Building>Owned</Building>
        <Area>2020</Area>
        <Docks>1</Docks>
        <DockType>Rear load</DockType>
        </Warehouse>

To validate the metadata inside the object, you can use:

.. code-block:: javascript

    const xmlObjClass = result.metaData[0];
    const pInObj = new xmlObjClass.dbTypeClass();
    console.log('Data Type:\n', pInObj.attributes.XMLDATA.type);

This prints an output such as::

    Data Type:
        [DbType DB_TYPE_XMLTYPE]

See `xmltypeInDbObject.js <https://github.com/oracle/node-oracledb/tree/main/
examples/xmltypeInDbObject.js>`__ for a runnable example.

.. _objectlimitations:

Oracle Database Object Type Limitations
=======================================

PL/SQL collections and records can only be bound when both Oracle client
libraries and Oracle Database are 12.1, or higher.

PL/SQL Collection associative array (Index-by) types with INDEX BY
VARCHAR2, or VARCHAR2 sub-types, cannot be used natively by
node-oracledb.

Subclasses of types are not supported.

Oracle objects with REF references are not supported.

Where there is no native support, use a PL/SQL wrapper that accepts
types supported by node-oracledb and converts them to the required
Oracle Database type.
