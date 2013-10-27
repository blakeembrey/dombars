var Handlebars     = require('handlebars');
var CommonCompiler = require('./common').prototype;

var Compiler = module.exports = function () {};
Compiler.prototype = Handlebars.createFrame(CommonCompiler);
Compiler.prototype.compiler = Compiler;

/**
 * Append an escaped Handlebars expression to the source.
 */
Compiler.prototype.appendEscaped = function () {
  this.subscribe();
  CommonCompiler.appendEscaped.call(this);
};
