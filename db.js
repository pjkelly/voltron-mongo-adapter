var mongo = require('mongodb');
var Q = require('q');

var connection, mongoUser, mongoPassword;
var opening = false;

module.exports = function(server, db, options) {
  options || (options = {});
  if (options.user)
    mongoUser = options.user;
  if (options.password)
    mongoPassword = options.password;

  return {
    open: function(token) {
      if (!token) {
        token = Q.defer();
      }
      if (connection) {
        return token.resolve(connection);
      }

      if (opening) {
        var self = this;
        process.nextTick(function() {
          self.open(token);
        });
      } else {
        opening = true;
        db.open(function(err, conn) {
          if (err) {
            return token.reject(err);
          } else {
            if (mongoUser && mongoPassword) {
              db.authenticate(mongoUser, mongoPassword, function(err) {
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
    },

      queryOne: function(collectionName, query, options) {
        query || (query = {});
        options || (options = {});
        if (typeof query._id === 'string') {
          query._id = new mongo.ObjectID(query._id);
        }
        var promise = this.collection(collectionName).then(function(collection) {
          return Q.ncall(collection.findOne, collection, query, options);
        });
        return promise;
      },

      queryAll: function(collectionName, query, options) {
        query || (query = {});
        options || (options = {});
        var promise = this.collection(collectionName).then(function(collection) {
          var search;
          search = collection.find(query, options);
          return Q.ncall(search.toArray, search);
        });
        return promise;
      },

      collection: function(name) {
        return this.open().then(function(conn) {
          return conn.collection(name);
        });
      },

      insert: function(collectionName, document) {
        return this.collection(collectionName)
          .then(function(collection) {
            return Q.ncall(collection.insert, collection,
              [document], {safe:true});
          });


      },

      update: function(collectionName, document) {
        return this.collection(collectionName)
          .then(function(collection) {
            return Q.ncall(collection.update, collection,
              {_id:document._id}, document, {safe:true});
          });
      }


  }
};


