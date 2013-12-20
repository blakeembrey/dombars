var create         = require('../utils').create;
var CommonCompiler = require('./common-compiler').prototype;

/**
 * Attribute compiler.
 */
var Compiler = module.exports = function () {};
Compiler.prototype = create(CommonCompiler);
Compiler.prototype.compiler = Compiler;

/**
 * Append a value to the current buffer. We override the default functionality
 * of Handlebars since we want to be able to append *every* value.
 */
Compiler.prototype.append = function () {
  this.flushInline();

  this.source.push(this.appendToBuffer(this.popStack()));
};

/**
 * Set a flag to indicate the compiler is an attribute compiler.
 *
 * @type {Boolean}
 */
Compiler.prototype.isAttribute = true;
