var base     = require('./dombars/base');
var compiler = require('./dombars/compiler');
var utils    = require('./dombars/utils');
var runtime  = require('./dombars/runtime');

/**
 * Generate the base DOMBars object.
 *
 * @return {Object}
 */
module.exports = (function create () {
  var db = base.create();

  utils.attach(db);
  compiler.attach(db);
  runtime.attach(db);

  db.create = create;

  return db;
})();
