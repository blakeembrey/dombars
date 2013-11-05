var base     = require('handlebars/lib/handlebars/base');
var utils    = require('handlebars/lib/handlebars/utils');
var compiler = require('handlebars/lib/handlebars/compiler');
var runtime  = require('handlebars/lib/handlebars/runtime');

var Handlebars = module.exports = base.create();

utils.attach(Handlebars);
compiler.attach(Handlebars);
runtime.attach(Handlebars);
