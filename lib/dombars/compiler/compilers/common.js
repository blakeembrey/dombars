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

/**
 * Set up a subscriber callback for any changes.
 *
 * @param {String} string
 */
Compiler.prototype.subscribe = function (string) {
  this.context.aliases.subscribe = 'this.subscribe';

  this.source.push('subscribe(function () { ' + string + ' });');
};

/**
 * Override ambiguous invokes to produce just one source value.
 */
Compiler.prototype.invokeAmbiguous = function () {
  JSCompiler.invokeAmbiguous.apply(this, arguments);
  this.source.push(this.source.splice(-2).join('\n'));
};

/**
 * Override the ambigous block value invokation to produce a single source.
 */
Compiler.prototype.ambiguousBlockValue = function () {
  JSCompiler.ambiguousBlockValue.call(this);
  this.source.push(this.source.splice(-2).join('\n'));
};
