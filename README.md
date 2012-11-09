# voltron-adapter: A voltron.io Component

voltron-adapter provides mid-level adapters to provide access to
a variety of datastores. These adapters shouldn't be considered at the level
of an ORM, but rather provide a convenient API around more low-level drivers. If
used as part of [voltron.io](https://github.com/jmreiy/voltron.io), adapter methods
decorate a provided [voltron-model](https://github.com/jmreidy/voltron-model) Object,
but the adapters can be used on their own without any other voltron components.

There are currently two adapters: one for Postgres, and another for MongoDB.

**PLEASE NOTE: voltron-adapter is currently in an early stage of development;
until unit tests are implemented, its use is not recommended.**

## Adapters

The steps for implementing an adapter are the same for all voltron-adapters.

1. `require` the adapter you want to use (e.g. PostgresAdapter)
2. Call `<Adapter>.configure` to setup the connection to the datastore.
3. Instantiate new Adapters, with the table name (or collection or URL root) and
instance-specific configuration options.

Adapters are built around [Q promises](https://github.com/kriskowal/q), but support
callbacks as well.

### Postgres Adapter

The Postgres adapter provides a wrapper around the [node-postgres](https://github.com/brianc/node-postgres/)
driver. It is designed to support basic CRUD operations, and also to expose an easy API for queries and transactions.

#### Constructor
The Adapter constructor takes the following arguments `(tableName, options)`:

`tableName`: The name of the table for this adapter instance.
`options.modelConstructor`: The constructor function to call for instantiating query results.
`options.primaryKey`: The primary key for the table.

#### Configure
`PostgresAdapter.configure` passes a configuration object to the node-postgres driver See
the driver docs for details.

#### Prototype methods
The following methods are exposed on the adapter:

`query(sql, [values], [cb])`: Execute a given SQL string. If an array of values is provided, assume
that the sql is a prepared statement and pass those to the driver for statement insertion. Returns
a promise.

`transaction(queries, [cb])`: Wraps a series of queries in a transaction. `queries` should be a two-dimensional array,
with each item being an array of `sql, [values]` (matching the query method signature above). Returns a promise.

`stepTransaction(queries, [cb])`: While some transactions can be considered as a group (a set of updates), others
may require inspection of updated values from a previous queries. `stepTransaction` executes each query of a
transaction in sequence, passing the results to the next query in the sequence. The signature is the same as that
of `transaction` above, but instead of each `queries` item being an array, it should be a function that
returns an array. It's probably best illustrated by an example:

```javascript
  var self = this;
  var queries = [];
  var fooId;
  queries.push(function () {
    var query = adapter.insertQuery(self);
    return query;
  });
  queries.push(function (result) {
    fooId = result.rows[0].foo_id;
    return [
      'INSERT INTO foo_bars (foo_id, bar_id) VALUES ($1, $2)',
      [fooId, self.barId]
    ];
  });
  return adapter.stepTransaction(queries);
```

`all([cb])`: Return all rows for a table as a promise (or pass to a callback). The rows
are instantiated into objects via the adapter's `modelConstructor`.

`findById(id, [cb])`: Find a record for a matching PK id (using the adapter's `primaryKey`) value
for the `WHERE` clause. Returns a promise with the instantiated row (using the `modelConstructor`),
or paasses to a callback.

`insertQuery(target)`: Iterate over a target object, creating an `INSERT` query for the adapter's `tableName`
with each key and value of the target instance. The query ends with `RETURNING` the newly generated id,
which is accessed by the adapter's `primaryKey`. Returns `[query, [values]]`.

`insert(target, [cb])`: Passes a target to `insertQuery` and executes the provided query, returning the
generated ID in a promise and passing it to a callback, if provided.

`updateQuery(target)`: Iterate over a target option, creating an `UPDATE` query for the adapter's
`tableName` with each key and value of the target instance. The query uses the adapter's `primaryKey`
to provided a `WHERE` clause. Returns an `[query, [values]]`

`update(target, [cb])`: Passes a target to `updateQuery` and executes the returned query. Returns
a promise with the ID of the updated row (and passes to a provided CB).

`del(id, [cb])`: Remove an item from the adapter's `tableName`, using the provided `id` and the
adapter's `primaryKey`. Returns a promise; passes results to CB is provided.


### Mongo Adapter
The Mongo adapter provides a wrapper around the [node-mongodb-native](http://mongodb.github.com/node-mongodb-native/)
driver. It is designed to support basic CRUD operations. The API is very limited at this time.

#### Constructor
The Adapter constructor takes the following arguments `(collectionName, options)`:

`collection`: The name of the collection for this adapter instance.
`options.modelConstructor`: The constructor function to call for instantiating query results.
`options.primaryKey`: The name of the `id` field for the collection.

#### Configure
`MongoAdapter.configure` takes the following arguments:

`server`: The server to which to connect
`port`: The port to which to connect
`db`: The name of the db to which to connect.
`options`: A hash of `user`, `password` for connecting (if necessary).

a new `Server` and `Db` instance are created. See driver docs for details.

#### Prototype methods
The following methods are exposed on the adapter:

`findAll(query, [options], [cb])`: Query the adapter's `collectionName` for all documents,
passing the provided query hash and options. See the driver's docs for `collection.find` for details.
Results are instantiated via the adapter's `modelConstructor` and returned as a promise (and passed
to a provided CB).

`findOne(query, [options], [cb])`: Query the adapter's `collectionName` for a single document,
passing the provided query hash and options. See the driver's docs for `collection.findOne` for details.
The result is instantiaed via the adaper's `modelConstructor` and returned as a promise (and passed
to a provided CB).

`remove(id, [cb])`: Removes a document from the adapter's `collectionName`, matching the provided `id`
to the adaper's `primaryKey` as a query hash. Returns a promise.

`save(target, [cb])`: Saves a target document to Mongo. Calls the driver's `insert` or `update` operation,
depending on whether the target document is new. It determines this condition by checking whether
the target document has a value for the adapter's `primaryKey` field; if the value exists, the document
is assumed to have a provisioned ID, and the document and ID are passed to the driver's `update` operation.
If the ID does not exist, the document is passed to `insert`. Insert operations return a promise with the
newly created ID (which is also passed to a CB, if provided); update operations simply return a promise
(and call a provided callback on completion).


### voltron.io integration
If you're using voltron.io or adding a voltron-adapter to a voltron-model, there are certain conveniences
provided that should make your life easier. First, to assign an adapter to a voltron-model, simply call
`VoltronAdapter(ModelFn, new Adapter('name'))`. For example:

```javascript
module.exports = VoltronAdapter(User, new PostgresAdapter('users'));
```

voltron-adapter will automatically handle configuring the
adapter's `modelConstructor` and `primaryKey`, and will add the adapter's methods to the provided ModelFn
(either as static properties, or to the ModelFn's prototype, as appropriate).

In addition to automatically wiring the adapter to the voltron-model, a [voltron-hook](https://github.com/jmreidy/voltron-hooks)
for `beforeSave` will be added to the voltron-model.

## Roadmap

* First priority is test coverage.
* Need to make sure callbacks are treated as first class citizens by the API, in addition to promises.
* A `REST` adapter, for web requests.
* Configuration for [node-browserify](https://github.com/substack/node-browserify) support.

## License
The MIT License (MIT)
Copyright &copy; 2012 Justin Reidy, http://rzrsharp.net

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.









