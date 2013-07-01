# voltron-mongo-adapter: A voltron.io Component

voltron-adapter provides mid-level adapters to provide access to
a variety of datastores. These adapters shouldn't be considered at the level
of an ORM, but rather provide a convenient API around more low-level drivers. If
used as part of [voltron.io](https://github.com/jmreiy/voltron.io), adapter methods
decorate a provided [voltron-model](https://github.com/jmreidy/voltron-model) Object,
but the adapters can be used on their own without any other voltron components.

There are currently two adapters: one for
[https://github.com/jmreidy/voltron-pg-adapter](Postgres), and this one for
MongoDB.

## Adapters

The steps for implementing an adapter are the same for all voltron-adapters.

1. `require` the adapter you want to use
2. Call `<Adapter>.configure` to setup the connection to the datastore.
3. Instantiate new Adapters, with the table name (or collection or URL root) and
instance-specific configuration options.

Adapters are built around [Q promises](https://github.com/kriskowal/q), but support
callbacks as well.

## Mongo Adapter
The Mongo adapter provides a wrapper around the [node-mongodb-native](http://mongodb.github.com/node-mongodb-native/)
driver. It is designed to support basic CRUD operations. The API is very limited at this time.

### Constructor
The Adapter constructor takes the following arguments `(collectionName, options)`:

`collection`: The name of the collection for this adapter instance.
`options.modelConstructor`: The constructor function to call for instantiating query results.
`options.primaryKey`: The name of the `id` field for the collection.

### Configure
`MongoAdapter.configure` takes the following arguments:

`server`: The server to which to connect
`port`: The port to which to connect
`db`: The name of the db to which to connect.
`options`: A hash of `user`, `password` for connecting (if necessary).

a new `Server` and `Db` instance are created. See driver docs for details.

### Prototype methods
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









