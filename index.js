var VoltronHooks = require('voltron-hooks');

module.exports = VoltronAdapter;

VoltronAdapter.Mongo = require('./lib/adapters/mongo');

function VoltronAdapter(Model, adapter, hooks) {
  adapter.modelConstructor = Model;
  if (Model.prototype.hasOwnProperty('_primaryKey')) {
    adapter.primaryKey = Model.prototype._primaryKey;
  }

  var Adapter = adapter.constructor;

  Adapter.addStatics(Model, adapter);
  Adapter.addDelegates(Model, adapter);

  VoltronHooks.defineBeforeHook(Model.prototype, 'save');
  if (hooks) {
    Object.keys(hooks).forEach(function (key) {
      if (Model.prototype.hasOwnProperty(key)) {
        Model.prototype[key] = hooks[key];
      }
    });
  }
  return Model;
}





