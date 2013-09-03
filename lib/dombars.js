var compiler = require('./dombars/compiler');

var Handlebars = require('handlebars');
var HTMLParser = require('htmlparser2');

var create = function create () {
  var db = Handlebars.createFrame(Handlebars);

  compiler.attach(db);

  db.create = create;

  return db;
};

var DOMBars = module.exports = create();
