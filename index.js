var mongodb = require('./db');
var staticFns = require('./staticFunctions');
var connection;

module.exports = VoltronMongoAdapter;


function VoltronMongoAdapter(Model, collectionName, hooks) {
  var statics = staticFns(collectionName, connection);
  for (var key in statics) {
    Model[key] = statics[key];
  }

  Model.prototype.save = save(collectionName, hooks);
  Object.defineProperty(Model.prototype, 'id', {
    get: function() {
      if (this._attributes._id) {
        return this._attributes._id.toString();
      }
      else {
        return undefined;
      }
    }
  });
}

VoltronMongoAdapter.initialize = function(server, db) {
  connection = mongodb(server, db);
};


var save = function(collectionName, hooks) {
  var self = this;
  return function() {
    var saveMethod;
    var executeSave = function () {
      if (this.id) {
        saveMethod = connection.update;
      } else {
        if (this._attributes.hasOwnProperty('_id')) {
          delete this._attributes._id;
        }
        saveMethod = connection.insert;
      }
      return saveMethod.call(connection, collectionName, this.attributes);
    };

    if (hooks && hooks.beforeSave) {
      if (hooks.beforeSave.lengthOf == 1) {
        return Q.ncall(hooks.beforeSave, self).then(executeSave.bind(self));
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
  };
};

