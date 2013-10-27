var Handlebars = require('handlebars');
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
  var quotedName = this.quotedString(name);
  var quotedType = this.quotedString(type);
  this.context.aliases.get = 'this.get';

  return 'get(' + parent + ', ' + quotedName + ', ' + quotedType + ')';
};

/**
 * Subscribe to the last subscription on the context stack.
 *
 * @param  {Function} fn
 * @return {String}
 */
Compiler.prototype.subscribe = function (fn, count) {
  var programName = this.quotedString(this.name);

  count = count || 1;

  this.context.aliases.subscribe = 'this.subscribe';

  this.register('cb', fn ? 'function (value) {' + fn('value') + '}' : 'null');

  while (count--) {
    this.source.push('subscribe(' + programName + ', cb);');
  }
};

/**
 * Simple function for looking up references on itself only.
 */
Compiler.prototype.lookupSelf = function () {
  this.replaceStack(function(current) {
    return 'get(' + current + ', null, "self")';
  });
};
