var mongo = require('mongodb');
var Q = require('q');

var connection, mongoServer, mongoDB, mongoUser, mongoPassword;
var opening = false;

var open = function(token) {
  if (!token) {
    token = Q.defer();
  }
  if (connection) {
    return token.resolve(connection);
  }

  if (opening) {
    var self = this;
    process.nextTick(function() {
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
  return open().then(function(conn) {
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
    return Q.ncall(coll.findOne, coll, query, options);
  });
};

var queryAll = function(collectionName, query, options) {
  query || (query = {});
  options || (options = {});
  var promise = collection(collectionName).then(function(coll) {
    var search;
    search = coll.find(query, options);
    return Q.ncall(search.toArray, search);
  });
  return promise;
};


var insert = function(collectionName, document) {
  return collection(collectionName)
    .then(function (coll) {
      return Q.ncall(coll.insert, coll,
        [document], {safe:true});
    });
};

var update = function(collectionName, document) {
  return collection(collectionName)
    .then(function (coll) {
      return Q.ncall(coll.update, coll,
        {_id:document._id}, document, {safe:true});
    });
};

var remove = function(collectionName, id) {
  if (typeof id === 'string') {
    id = new mongo.ObjectID(id);
  }
  return collection(collectionName)
    .then(function (coll) {
      return Q.ncall(coll.remove, coll, {_id: id}, {safe:true});
    });
};

function MongoAdapter(collectionName, hooks) {
  return {
    id: function() {
      if (this._attributes._id) {
        return this._attributes._id.toString();
      }
      else {
        return undefined;
      }
    },

    findAll: function(query, options) {
      var self = this;
      if (query === null) {
        query = {};
      }
      if (options === null) {
        options = {};
      }
      return queryAll(collectionName, query, options)
        .then(function(documents) {
          return self.build(documents);
        }, function(err) {
          throw new Error(err);
        });
    },

    findOne: function(query, options) {
      var self = this;
      query || (query = {});
      options || (options = {});
      return queryOne(collectionName, query, options)
        .then(function(document) {
          if (document) {
            return new self(document);
          } else {
            return void 0;
          }
        }, function(err) {
          throw new Error(err);
        });
    },

    remove: function() {
      return remove(collectionName, this.id);
    },

    save:  function() {
      var saveMethod;
      var self = this;
      var executeSave = function () {
        if (self.id) {
          saveMethod = update;
        } else {
          if (self._attributes.hasOwnProperty('_id')) {
            delete self._attributes._id;
          }
          saveMethod = insert;
        }
        return saveMethod.call(null, collectionName, self._attributes)
          .then(function () {
            return self;
          });
      };

      if (hooks && hooks.beforeSave) {
        if (hooks.beforeSave.length == 1) {
          return Q.ncall(hooks.beforeSave, self)
            .then(function() {
               return executeSave.call(self);
            });
          }

        var result = hooks.beforeSave.call(self);
        if (Q.isPromise(result)) {
          return result.then(executeSave.bind(self));
        }
        else {
          throw new Error('Before Save hook must accept a callback or return a promise');
        }
      }
      else {
        return executeSave();
      }
    }
  };
};

MongoAdapter.configure = function(server, port, db, options) {
  mongoServer = new mongo.Server(server, port);
  mongoDB = new mongo.Db(db, mongoServer);
  if (!options) {
    return;
  }
  else {
    if (options.user) {
      mongoUser = options.user;
    }
    if (options.password) {
      mongoPassword = options.password;
    }
  }
};


MongoAdapter.toID = function(idAsString) {
  return new mongo.ObjectID(idAsString);
};


module.exports = MongoAdapter;
