var base       = require('./lib/base');
var SafeString = require('./lib/safe-string');
var Exception  = require('./lib/exception');
var Utils      = require('./lib/utils');
var runtime    = require('./lib/runtime');

module.exports = (function create () {
  var db = new base.DOMBarsEnvironment();

  Utils.extend(db, base);
  db.VM         = runtime;
  db.Utils      = Utils;
  db.create     = create;
  db.Exception  = Exception;
  db.SafeString = SafeString;

  db.template = function (spec) {
    return runtime.template(spec, db);
  };

  return db;
})();
