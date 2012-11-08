var pg = require('pg');
var Q = require('q');

module.exports = PostgresAdapter;

var pgConfig;

var executeTransaction = function (queries, cb) {
  var client;
  return Q.ninvoke(pg, 'connect', pgConfig)
    .then(function (c) {
      client = c;
      client.pauseDrain();
      return Q.ninvoke(client, 'query', 'BEGIN');
    })
    .then(function () {
      return Q.all(
        queries.map(function (query) {
          return Q.ninvoke(client, 'query', query[0], query[1]);
        })
      );
    })
    .then(function () {
      console.log('committing');
      return Q.ninvoke(client, 'query', 'COMMIT');
    })
    .then(function () {
      client.resumeDrain();
      return;
    });
};

var executeQuery = function (query, values, cb) {
  if (values && typeof values == 'function') {
    cb = values;
    values = undefined;
  }
  return Q.ninvoke(pg, 'connect', pgConfig)
    .then(function (client) {
      return Q.ninvoke(client, 'query', query, values);
    }).nodeify(cb);
};


function PostgresAdapter (tableName) {

  this.query = function (query, values, cb) {
    return executeQuery(query, values, cb);
  };

  this.transaction = function (queries, cb) {
    return executeTransaction(queries, cb);
  };

  this.all = function (cb) {
    var self = this;
    var query = 'SELECT * FROM ' + tableName;
    query += ' ORDER BY ' + self.prototype._primaryKey;
    return executeQuery(query)
      .then(function (result) {
        return result.rows.map(function (row) {
          return new self(row);
        });
      }).nodeify(cb);
  };

  this.findById = function (id, cb) {
    var self = this;
    var query = 'SELECT * FROM ' + tableName +
      ' WHERE ' + this.prototype._primaryKey + ' = $1;';
    return executeQuery(query, [id])
      .then(function (result) {
        if (result.rows.length > 0) {
          return new self(result.rows[0]);
        }
        else {
          return undefined;
        }
      });
  };

  this.insert = function (cb) {
    var self = this;
    var values = [];
    var query = 'INSERT INTO ' + tableName + '(';
    Object.keys(self._attributes).forEach(function (key, idx, keys) {
      values.push(self._attributes[key]);
      query += key;
      if (idx !== keys.length - 1) {
        query += ', ';
      }
      else {
        query += ')';
      }
    });
    query += ' VALUES(';
    values.forEach(function (val, idx) {
      var valId = idx + 1;
      query += '$' + valId;
      if (idx !== values.length - 1) {
        query += ', ';
      }
      else {
        query += ')';
      }
    });
    query += ' RETURNING ' + self._primaryKey;
    return executeQuery(query, values)
      .then(function (result) {
        return result.rows[0][self._primaryKey];
      }).nodeify(cb);
  };

  this.updateQuery = function (target) {
    var values = [];
    var query = 'UPDATE ' + tableName + ' SET ';
    Object.keys(target._attributes).forEach(function (key, idx, keys) {
      values.push(target._attributes[key]);
      query += ' ' + key + ' = $' + values.length;
      if (idx !== keys.length -1) {
        query += ',';
      }
    });
    values.push(target.id);
    query += ' WHERE ' + target._primaryKey + ' = $' + values.length;
    return [query, values];
  };

  this.update = function (cb) {
    var self = this;
    var statement = updateQuery(self);
    var query = statement[0], values = statement[1];
    query += ' RETURNING ' + this._primaryKey;
    return executeQuery(query, values)
      .then(function (result) {
        return result.rows[0][self._primaryKey];
      }).nodeify(cb);
  };

  this.delete = function (cb) {
    var query = 'DELETE FROM ' + tableName + ' WHERE ' +
      this._primaryKey + ' = $1';
    return executeQuery(query, [this.id], cb);
  };

}

PostgresAdapter.configure = function (config) {
  pgConfig = config;
};

PostgresAdapter.addStatics = function (Model, adapter) {
  Model.query = adapter.query;
  Model.transaction = adapter.transaction;
  Model.all = adapter.all;
  Model.findById = adapter.findById;
};

PostgresAdapter.addDelegates = function (Model, adapter) {
  Model.prototype.save = function () {
    if (this.id) {
      return adapter.update.call(this);
    }
    else {
      return adapter.insert.call(this);
    }
  };
  Model.prototype.delete = adapter.delete;
};

