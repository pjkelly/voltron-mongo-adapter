module.exports = VoltronAdapter;

VoltronAdapter.Mongo = require('./lib/adapters/mongo');

function VoltronAdapter(Model, adapter, hooks) {
  addStatics(Model, adapter);
  addModelDelegates(Model, adapter);
}


var addStatics = function(Model, adapter) {
  Model.findAll = adapter.findAll;
  Model.findOne = adapter.findOne;
};

var addModelDelegates = function(Model, adapter) {
  Model.prototype.save = adapter.save;
  Model.prototype.remove = adapter.remove;
  Object.defineProperty(Model.prototype, 'id', {
    get: adapter.id
  });
};



