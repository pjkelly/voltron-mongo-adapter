var pg = require('pg');
var Q = require('q');

module.exports = PostgresAdapter;

var client;

function PostgresAdapter () {
  return {
    query: function (query) {
      return Q.ninvoke(client, 'query', query);
    }
  };
}

PostgresAdapter.configure = function (config) {
  client = new pg.Client(config);
};

PostgresAdapter.addStatics = function (Model, adapter) {
  Model.query = adapter.query;
};

PostgresAdapter.addDelegates = function (Model, adapter) {

};

