var pg = require('pg');
var Q = require('q');

module.exports = PostgresAdapter;

var pgConfig;

var executeQuery = function (query, values, cb) {
  if (values && typeof values == 'function') {
    cb = values;
    values = undefined;
  }
  return Q.ninvoke(pg, 'connect', pgConfig)
    .then(function (client) {
      return Q.ninvoke(client, 'query', query, values);
    }).nend(cb);
};


function PostgresAdapter (tableName) {

  this.query = function (query, values, cb) {
    return executeQuery(query, values, cb);
  };

  this.all = function (cb) {
    var self = this;
    var query = 'SELECT * FROM ' + tableName + ';';
    return executeQuery(query)
      .then(function (result) {
        return result.rows.map(function (row) {
          return new self(row);
        });
      }).nend(cb);
  };

  this.findById = function (cb) {
    var self = this;
    var query = 'SELECT * FROM ' + tableName +
      ' WHERE ' + this._primaryKey + ' = $1;';
    return executeQuery(query, [this.id])
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
    var values = [];
    var query = 'INSERT INTO ' + tableName + '(';
    Object.keys(self._attributes).forEach(function (key, idx) {
      values.push(self._attributes[key]);
      if (idx != self._attributes.length - 1) {
        query += ',';
      }
      else {
        query += ')';
      }
    });
    query += 'VALUES(';
    values.forEach(function (val, idx) {
      query += '$'+idx;
      if (idx !== self._attributes.length - 1) {
        query += ',';
      }
      else {
        query += ')';
      }
    });
    return executeQuery(query, values, cb);
  };

  this.update = function (cb) {
    var values = [];
    var query = 'UPDATE ' + tableName + ' SET ';
    Object.keys(self._attributes).forEach(function (key, idx) {
      values.push(self._attributes[key]);
      query += ' ' + key + ' = $' + values.length;
      if (idx !== self._attributes.length -1) {
        query += ',';
      }
    });
    values.push(this.id);
    query += ' WHERE ' + this._primaryKey + ' = $' + values.length + ';';
    return executeQuery(query, values, cb);
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
  Model.all = adapter.all;
  Model.findById = adapter.findById;
};

PostgresAdapter.addDelegates = function (Model, adapter) {
  Model.prototype.save = function () {
    if (this.id) {
      adapter.insert.call(this);
    }
    else {
      adapter.update.call(this);
    }

  };
  Model.prototype.delete = adapter.delete;
};

