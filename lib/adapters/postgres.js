var pg = require('pg');
var Q = require('q');

module.exports = PostgresAdapter;

var pgConfig;

function PostgresAdapter (tableName) {
  this.query = function (query) {
    return Q.ninvoke(pg, 'connect', pgConfig)
      .then(function (client) {
        return Q.ninvoke(client, 'query', query);
      });
  };
  this.findAll= function () {
    var self = this;
    var query = 'SELECT * FROM ' + tableName + ';';
    return Q.ninvoke(pg, 'connect', pgConfig)
      .then(function (client) {
        console.log(arguments);
        return Q.ninvoke(client, 'query', query);
      })
      .then(function (result) {
        return result.rows.map(function (row) {
          return new self(row);
        });
      });
  };
  this.delete = function () {
    var query = 'DELETE FROM ' + tableName + ' WHERE ' +
      this._primaryKey + ' = ' + this.id + ';';
    return Q.ninvoke(pg, 'connect', pgConfig)
      .then(function (client) {
        return Q.ninvoke(client, 'query', query);
      });
  };
}

PostgresAdapter.configure = function (config) {
  pgConfig = config;
};

PostgresAdapter.addStatics = function (Model, adapter) {
  Model.query = adapter.query;
  Model.findAll = adapter.findAll;
};

PostgresAdapter.addDelegates = function (Model, adapter) {
  Model.prototype.delete = adapter.delete;
};

