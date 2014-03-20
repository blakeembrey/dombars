var create     = require('../utils').create;
var JSCompiler = require(
  'handlebars/dist/cjs/handlebars/compiler/javascript-compiler'
)['default'].prototype;

/**
 * Create the base compiler functionality and attach relevant references.
 */
var Compiler = module.exports = function () {};
Compiler.prototype = create(JSCompiler);
Compiler.prototype.compiler = Compiler;

/**
 * Override name lookup to use the function provided on the DOMBars object.
 *
 * @return {String}
 */
Compiler.prototype.nameLookup = function (parent, property, type) {
  if (type !== 'context') {
    return JSCompiler.nameLookup.call(this, parent, property, type);
  }

  this.context.aliases.self = 'this';

  var args = [parent, this.quotedString(property), this.quotedString(parent)];

  return 'self.get(' + args.join(', ') + ')';
};

/**
 * Set the attribute compiler to be false. This is overriden in the attribute
 * compiler subclass.
 *
 * @type {Boolean}
 */
Compiler.prototype.isAttribute = false;

/**
 * No-op function. Only used for subscribers in the JavaScript compiler.
 */
Compiler.prototype.beforeAppend = function () {};

/**
 * Override the params setup with an attribute boolean and custom wrappers
 * for program functions.
 *
 * @param  {Number}  paramSize
 * @param  {Array}   params
 * @param  {Boolean} useRegister
 * @return {String}
 */
Compiler.prototype.setupOptions = function () {
  var options = JSCompiler.setupOptions.apply(this, arguments);

  // Alias `self` instead of a static subscription, since the current
  // subscription object will change during execution.
  this.context.aliases.self = 'this';

  options.push('attribute:' + this.isAttribute);
  options.push('update:self.subscription.boundUpdate');
  options.push('unsubscribe:self.subscription.boundUnsubscription');

  for (var i = 0; i < options.length; i++) {
    if (options[i].substr(0, 8) === 'inverse:') {
      options[i] = 'inverse:self.wrapProgram(' + options[i].substr(8) + ')';
    }

    if (options[i].substr(0, 3) === 'fn:') {
      options[i] = 'fn:self.wrapProgram(' + options[i].substr(3) + ')';
    }
  }

  return options;
};
