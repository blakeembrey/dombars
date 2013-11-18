var ast     = require('./ast');
var base    = require('./base');
var printer = require('./printer');
var visitor = require('./visitor');

exports.attach = function (DOMBars) {
  visitor.attach(DOMBars);
  printer.attach(DOMBars);
  ast.attach(DOMBars);
  base.attach(DOMBars);

  return DOMBars;
};
