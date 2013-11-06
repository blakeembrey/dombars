var Handlebars = require('../../handlebars');
var JSCompiler = Handlebars.JavaScriptCompiler.prototype;

/**
 * Create the base compiler functionality and attach relevant references.
 */
var Compiler = module.exports = function () {};
Compiler.prototype = Handlebars.createFrame(JSCompiler);
Compiler.prototype.compiler = Compiler;

/**
 * Override name lookup to use the function provided on the DOMBars object.
 *
 * @return {String}
 */
Compiler.prototype.nameLookup = function (parent, name, type) {
  if (type !== 'context') {
    return JSCompiler.nameLookup.call(this, parent, name, type);
  }

  this.context.aliases.get = 'this.get';

  return 'get(' + parent + ', ' + this.quotedString(name) + ')';
};
