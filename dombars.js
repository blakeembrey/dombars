var base     = require('./lib/base');
var compiler = require('./lib/compiler');
var utils    = require('./lib/utils');
var runtime  = require('./lib/runtime');

/**
 * Generate the base DOMBars object.
 *
 * @return {Object}
 */
module.exports = (function create () {
  var DOMBars = base.create();

  utils.attach(DOMBars);
  compiler.attach(DOMBars);
  runtime.attach(DOMBars);

  DOMBars.create     = create;
  DOMBars.Handlebars = require('./lib/handlebars');

  return DOMBars;
})();
