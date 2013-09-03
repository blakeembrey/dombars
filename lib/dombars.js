var base     = require('./dombars/base');
var compiler = require('./dombars/compiler');
var utils    = require('./dombars/utils');
var runtime  = require('./dombars/runtime');

var create = function create () {
  var db = base.create();

  utils.attach(db);
  compiler.attach(db);
  runtime.attach(db);

  db.create = create;
  db.Handlebars = require('handlebars');

  return db;
};

var DOMBars = module.exports = create();
