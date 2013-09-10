var mongo = require('mongodb');
var Q = require('q');
var util = require('util');

module.exports = MongoAdapter;

var connection, mongoServer, mongoDB, mongoUser, mongoPassword;
var opening = false;
var DEFAULT_PK = '_id';
var next = setImmediate? setImmediate : process.nextTick;

var open = function(token) {
  if (!token) {
    token = Q.defer();
  }
  if (connection) {
    token.resolve(connection);
    return token.promise;
  }

  if (opening) {
    var self = this;
    next(function() {
      open(token);
    });
  } else {
    opening = true;
    mongoDB.open(function(err, conn) {
      if (err) {
        return token.reject(err);
      } else {
        if (mongoUser && mongoPassword) {
          mongoDB.authenticate(mongoUser, mongoPassword, function(err) {
            if (err) {
              return token.reject(err);
            }
            opening = false;
            connection = conn;
            return token.resolve(conn);
          });
        } else {
          opening = false;
          connection = conn;
          return token.resolve(conn);
        }
      }
    });
  }
  return token.promise;
};


var collection = function(name) {
  return open()
    .then(function(conn) {
      return conn.collection(name);
    });
};

var queryOne = function(collectionName, query, options) {
  query || (query = {});
  options || (options = {});
  if (typeof query._id === 'string') {
    query._id = new mongo.ObjectID(query._id);
  }
  return collection(collectionName).then(function(coll) {
    return Q.ninvoke(coll, 'findOne', query, options);
  });
};

var queryAll = function(collectionName, query, options) {
  query || (query = {});
  options || (options = {});
  var promise = collection(collectionName)
    .then(function(coll) {
      var search;
      return Q.ninvoke(coll, 'find', query, options);
    });
  return promise;
};


var insert = function(collectionName, document) {
  if (!util.isArray(document)) {
    document = [document];
  }
  return collection(collectionName)
    .then(function (coll) {
      return Q.ninvoke(coll, 'insert', document);
    });
};

var update = function(collectionName, query, document) {
  return collection(collectionName)
    .then(function (coll) {
      return Q.ninvoke(coll, 'update', query, document);
    });
};

var remove = function(collectionName, query) {
  return collection(collectionName)
    .then(function (coll) {
      return Q.ninvoke(coll, 'remove', query);
    });
};

function MongoAdapter(collectionName, options) {
  this.collectionName = collectionName;
  if (options) {
    this.primaryKey = (options.primaryKey || DEFAULT_PK);
    this.modelConstructor = options.modelConstructor;
  }
  else {
    this.primaryKey = DEFAULT_PK;
  }
}

MongoAdapter.prototype = Object.create(MongoAdapter.prototype, {

    findAll: {
      value: function(query, options, cb) {
        var self = this;
        if (query === null) {
          query = {};
        }
        if (options === null) {
          options = {};
        }
        return queryAll(self.collectionName, query, options)
          .then(function (result) {
            return Q.ninvoke(result, 'toArray');
          })
          .then(function (documents) {
            if (self.modelConstructor) {
              return documents.map(function (doc) {
                return new self.modelConstructor(doc);
              });
            }
            else {
              return documents;
            }
          })
          .nodeify(cb);
      },
      writable: true
    },

    findOne: {
      value: function(query, options, cb) {
        var self = this;
        query || (query = {});
        options || (options = {});
        return queryOne(self.collectionName, query, options)
          .then(function (document) {
            if (document && self.modelConstructor) {
              return new self.modelConstructor(document);
            } else {
              return document;
            }
          })
          .nodeify(cb);
      },
      writable: true
    },

    remove: {
      value: function (id, cb) {
        if (typeof id === 'string') {
          id = MongoAdapter.toID(id);
        }
        var query = {};
        query[self.primaryKey] = id;
        return remove(self.collectionName, query);
      },
      writable: true
    },

    update: {
      value: function (query, value) {
        return collection(self.collectionName)
          .then(function (coll) {
            return Q.ninvoke(coll, 'update', query, value);
          });
      }
    },

    save:  {
      value: function (target, cb) {
        var self = this;
        var id = target[self.primaryKey];
        if (!util.isArray(target) && id) {
          if (typeof id === 'string') {
            id = MongoAdapter.toID(id);
          }
          var query = {};
          query[self.primaryKey] = id;
          return update(self.collectionName, query, target)
            .then(function (result) {
              return Q.when();
            })
            .nodeify(cb);
        }
        else {
          //get rid of undefined id
          if (target.hasOwnProperty(self.primaryKey)) {
            delete target[self.primaryKey];
          }
          return insert(self.collectionName, target)
            .then(function (documents) {
              return documents.map(function (doc) {
                if (self.modelConstructor) {
                  return new self.modelConstructor(doc);
                }
                else {
                  return doc;
                }
              });
            })
            .nodeify(cb);
        }
      },
      writable: true
    }
  });

MongoAdapter.configure = function(server, port, db, options) {
  var writeConcern = 1;
  mongoServer = new mongo.Server(server, port);
  if (options) {
    if (options.user) {
      mongoUser = options.user;
    }
    if (options.password) {
      mongoPassword = options.password;
    }
    if (options.writeConcern) {
      writeConcern = options.writeConcern;
    }
  }
  mongoDB = new mongo.Db(db, mongoServer, {
    w: writeConcern
  });
};

MongoAdapter.connect = function () {
  return open();
};


MongoAdapter.stub = function() {
  var sinon = require('sinon');
  open = sinon.stub();
  collection = sinon.stub();
  queryOne = sinon.stub();
  queryAll = sinon.stub();
  insert = sinon.stub();
  update = sinon.stub();
  remove = sinon.stub();

  return {
    queryOn: queryOne,
    queryAll: queryAll,
    insert: insert,
    update: update,
    remove: remove
  };
};


MongoAdapter.toID = function(idAsString) {
  return new mongo.ObjectID(idAsString);
};

MongoAdapter.addStatics = function (Model, adapter) {
  Model.findAll = function (query, options, cb) {
    return adapter.findAll(query, options, cb);
  };
  Model.findOne = function (query, options, cb) {
    return adapter.findOne(query, options, cb);
  };
};

MongoAdapter.addDelegates = function (Model, adapter) {
  Model.prototype.save = function (cb) {
    var self = this;
    return adapter.save(this._attributes)
      .then(function (document) {
        if (document) {
          return document;
        }
        else {
          return self;
        }
      })
      .nodeify(cb);
  };

  Model.prototype.remove = function (cb) {
    return adapter.remove(this.id);
  };

  //add toString for ObjectId types
  Object.defineProperty(Model.prototype, 'id', {
    get:  function () {
      if (this._attributes[adapter.primaryKey]) {
        return this._attributes[adapter.primaryKey].toString();
      }
      else {
        return undefined;
      }
    }
  });
};


