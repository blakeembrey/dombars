var createFrame    = require('../../handlebars').createFrame;
var CommonCompiler = require('./common').prototype;

/**
 * Attribute compiler.
 */
var Compiler = module.exports = function () {};
Compiler.prototype = createFrame(CommonCompiler);
Compiler.prototype.compiler = Compiler;

/**
 * Append a value to the current buffer. We override the default functionality
 * of Handlebars since we want to be able to append *every* value.
 */
Compiler.prototype.append = function () {
  this.flushInline();

  this.source.push(this.appendToBuffer(this.popStack()));
};
