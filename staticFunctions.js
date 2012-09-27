module.exports = function(collectionName, connection) {
  return Object.create(null, {
    findAll: {
      value: function(query, options) {
        var self = this;
        if (query === null) {
          query = {};
        }
        if (options === null) {
          options = {};
        }
        return connection.queryAll(collectionName, query, options)
          .then(function(documents) {
            return self.build(documents);
          }, function(err) {
            throw new Error(err);
          });
      }, enumerable: true
    },

    findOne: {
      value: function(query, options) {
        var self = this;
        query || (query = {});
        options || (options = {});
        return connection.queryOne(collectionName, query, options)
          .then(function(document) {
            if (document) {
              return new self(document);
            } else {
              return void 0;
            }
          }, function(err) {
            throw new Error(err);
          });
      }, enumerable: true
    }

  });
};
