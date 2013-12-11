var createFrame  = require('../base').createFrame;
var hbsCompiler  = require('handlebars/dist/cjs/handlebars/compiler/compiler');
var BaseCompiler = hbsCompiler.Compiler.prototype;
var Exception    = require('../exception');
var parse        = require('./base').parse;
var JSCompiler   = require('./javascript-compiler');
var AST          = require('./ast');

/**
 * Base compiler in charge of generating a consumable environment for the
 * JavaScript compiler.
 */
var Compiler = exports.Compiler = function () {};
Compiler.prototype = createFrame(BaseCompiler);
Compiler.prototype.compiler = Compiler;

/**
 * Append a DOM element node to the environment.
 *
 * @param {Object} node
 */
Compiler.prototype.DOM_ELEMENT = function (node) {
  this.opcode('pushProgram', this.compileAttribute(node.name));
  this.opcode('invokeElement');

  for (var i = 0, len = node.attributes.length; i < len; i++) {
    var name  = this.compileAttribute(node.attributes[i].name);
    var value = this.compileAttribute(node.attributes[i].value);
    this.appendAttribute(name, value);
  }

  this.opcode('pushProgram', this.compileContents(node.content));
  this.opcode('invokeContent');
  this.opcode('appendElement');
};

/**
 * Append a DOM comment node to the environment.
 *
 * @param {Object} node
 */
Compiler.prototype.DOM_COMMENT = function (node) {
  this.opcode('pushProgram', this.compileAttribute(node.text));
  this.opcode('invokeComment');
  this.opcode('appendElement');
};

/**
 * Append an attribute to the environment.
 *
 * @param  {Object} name
 * @param  {Object} value
 */
Compiler.prototype.appendAttribute = function (name, value) {
  this.opcode('pushProgram', name);
  this.opcode('pushProgram', value);
  this.opcode('invokeAttribute');
};

/**
 * Compile an attribute program.
 *
 * @param  {Object} program
 * @return {Number}
 */
Compiler.prototype.compileAttribute = function (program) {
  var guid = this.compileContents(program);
  this.children[guid].isAttribute = true;
  return guid;
};

/**
 * Compile an elements contents.
 *
 * @param  {Object} program
 * @return {Number}
 */
Compiler.prototype.compileContents = function (program) {
  var guid   = this.compileProgram(program);
  var result = this.children[guid];
  result.isProxied = true;

  // Proxy all the depth nodes between compiled programs.
  for (var i = 0; i < result.depths.list.length; i++) {
    this.addDepth(result.depths.list[i]);
  }

  return guid;
};

/**
 * Update the compiler equality check to also take into account attribute
 * programs.
 *
 * @param  {Object}  other
 * @return {Boolean}
 */
Compiler.prototype.equals = function (other) {
  // Check if we have two attribute programs (or non-attribute programs).
  if (this.isAttribute !== other.isAttribute) {
    return false;
  }

  return BaseCompiler.equals.call(this, other);
};

/**
 * Check the arguments passed into the compilation functions before trying to
 * compile the as a program.
 *
 * @param  {Function} fn
 * @return {Function}
 */
var compilePrecheck = function (fn) {
  return function (input, options, env) {
    if (typeof input !== 'string' && !(input instanceof AST.ProgramNode)) {
      throw new Exception(
        'You must pass a string or DOMBars AST to DOMBars.precompile. ' +
        'You passed ' + input
      );
    }

    options = options || {};

    if (!('data' in options)) {
      options.data = true;
    }

    return fn(input, options, env);
  };
};

/**
 * Precompile generates a stringified JavaScript function.
 *
 * @param  {String} input
 * @param  {Object} options
 * @return {String}
 */
exports.precompile = compilePrecheck(function (input, options) {
  var ast         = parse(input);
  var environment = new Compiler().compile(ast, options);
  return new JSCompiler().compile(environment, options);
});

/**
 * Compilation return a function that is immediately ready for execution as a
 * template.
 *
 * @param  {String}   input
 * @param  {Object}   options
 * @return {Function}
 */
exports.compile = compilePrecheck(function (input, options, env) {
  var compiled;

  var compileInput = function () {
    var ast          = parse(input);
    var environment  = new Compiler().compile(ast, options);
    var templateSpec = new JSCompiler().compile(
      environment, options, undefined, true
    );

    return env.template(templateSpec);
  };

  return function (context, options) {
    if (!compiled) {
      compiled = compileInput();
    }

    return compiled.call(this, context, options);
  };
});
