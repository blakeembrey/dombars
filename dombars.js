var DOMBars            = require('./runtime');
var AST                = require('./lib/compiler/ast');
var base               = require('./lib/compiler/base');
var Compiler           = require('./lib/compiler/compiler');
var JavaScriptCompiler = require('./lib/compiler/javascript-compiler');

module.exports = (function create () {
  var db = DOMBars.create();

  db.compile = function (input, options) {
    return Compiler.compile(input, options, db);
  };

  db.precompile = function (input, options) {
    return Compiler.precompile(input, options, db);
  };

  db.create             = create;
  db.AST                = AST;
  db.Compiler           = Compiler.Compiler;
  db.JavaScriptCompiler = JavaScriptCompiler;
  db.parse              = base.parse;
  db.Parser             = base.parser;

  return db;
})();
