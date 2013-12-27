var create     = require('../utils').create;
var JSCompiler = require(
  'handlebars/dist/cjs/handlebars/compiler/javascript-compiler'
).default.prototype;

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

  this.context.aliases.get = 'this.get';

  var quotedParent   = this.quotedString(parent);
  var quotedProperty = this.quotedString(property);

  return 'get(' + parent + ', ' + quotedProperty + ', ' + quotedParent + ')';
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

/**
 * Set the attribute compiler to be false. This is overriden in the attribute
 * compiler subclass.
 *
 * @type {Boolean}
 */
Compiler.prototype.isAttribute = false;

/**
 * Override the params setup with an attribute boolean and custom wrappers
 * for program functions.
 *
 * @param  {Number}  paramSize
 * @param  {Array}   params
 * @param  {Boolean} useRegister
 * @return {String}
 */
Compiler.prototype.setupParams = function (paramSize, params, useRegister) {
  var types    = [];
  var options  = [];
  var contexts = [];

  this.context.aliases.self = 'this';

  options.push('hash: ' + this.popStack());
  options.push('attribute: ' + this.isAttribute);

  // References to the current subscriber execution.
  options.push('update: self.subscriber.update');
  options.push('unsubscribe: self.subscriber.unsubscribe');

  var inverse = this.popStack();
  var program = this.popStack();

  // Avoid setting fn and inverse if neither are set. This allows helpers to
  // do a check for `if (options.fn)`.
  if (program || inverse) {
    if (!program) {
      this.context.aliases.noop = 'this.noop';
      program = 'noop';
    }

    if (!inverse) {
      this.context.aliases.noop = 'this.noop';
      inverse = 'noop';
    }

    this.context.aliases.wrapProgram = 'this.wrapProgram';

    options.push('fn: wrapProgram(' + program + ')');
    options.push('inverse: wrapProgram(' + inverse + ')');
  }

  for (var i = 0; i < paramSize; i++) {
    params.push(this.popStack());

    if (this.options.stringParams) {
      types.push(this.popStack());
      contexts.push(this.popStack());
    }
  }

  if (this.options.stringParams) {
    options.push('contexts: [' + contexts.join(',') + ']');
    options.push('types: [' + types.join(',') + ']');
    options.push('hashContexts: hashContexts');
    options.push('hashTypes: hashTypes');
  }

  if (this.options.data) {
    options.push('data: data');
  }

  options = '{' + options.join(', ') + '}';

  if (useRegister) {
    this.register('options', options);
    params.push('options');
  } else {
    params.push(options);
  }
  return params.join(', ');
};
