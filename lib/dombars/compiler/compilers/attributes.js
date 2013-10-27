var Handlebars     = require('handlebars');
var CommonCompiler = require('./common').prototype;

/**
 * Attribute compiler.
 */
var Compiler = module.exports = function () {};
Compiler.prototype = Handlebars.createFrame(CommonCompiler);
Compiler.prototype.compiler = Compiler;
/**
 * Append content to the current buffer.
 */
Compiler.prototype.append = function () {
  this.subscribe();
  CommonCompiler.append.call(this);
};

/**
 * Append escaped Handlebars content to the source.
 */
Compiler.prototype.appendEscaped = function () {
  this.subscribe();
  CommonCompiler.appendEscaped.call(this);
};

