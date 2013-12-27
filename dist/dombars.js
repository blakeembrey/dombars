!function(e){"object"==typeof exports?module.exports=e():"function"==typeof define&&define.amd?define(e):"undefined"!=typeof window?window.DOMBars=e():"undefined"!=typeof global?global.DOMBars=e():"undefined"!=typeof self&&(self.DOMBars=e())}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var DOMBars            = require('./runtime');
var AST                = require('./lib/compiler/ast');
var base               = require('./lib/compiler/base');
var Compiler           = require('./lib/compiler/compiler');
var JavaScriptCompiler = require('./lib/compiler/javascript-compiler');

module.exports = (function create () {
  var db = DOMBars.create();

  db.compile = function (input, options) {
    return Compiler.compile(input, options, db);
  };

  db.create             = create;
  db.precompile         = Compiler.precompile;
  db.AST                = AST;
  db.Compiler           = Compiler.Compiler;
  db.JavaScriptCompiler = JavaScriptCompiler;
  db.parse              = base.parse;
  db.Parser             = base.parser;

  return db;
})();

},{"./lib/compiler/ast":3,"./lib/compiler/base":5,"./lib/compiler/compiler":7,"./lib/compiler/javascript-compiler":8,"./runtime":38}],2:[function(require,module,exports){
var hbsBase               = require('handlebars/dist/cjs/handlebars/base');
var Utils                 = require('./utils');
var HandlebarsEnvironment = hbsBase.HandlebarsEnvironment;

/**
 * Extend Handlebars base object with custom functionality.
 *
 * @type {Object}
 */
var base = module.exports = Utils.create(hbsBase);

/**
 * Wrap old-style Handlebars helpers with the updated object syntax return.
 *
 * @param  {Function} helper
 * @return {Function}
 */
var wrapOldHelper = function (helper) {
  return function () {
    var result = helper.apply(this, arguments);

    // Need a special handler for the `with` helper which won't always execute.
    return result == null ? result : result.value;
  };
};

/**
 * Register DOMBars helpers on the passed in DOMBars instance.
 *
 * @param {Object} instance
 */
var registerDefaultHelpers = function (instance) {
  /**
   * The handlebars `each` helper is incompatibable with DOMBars, since it
   * assumes string concatination (as opposed to document fragments).
   *
   * @param  {Object} context
   * @param  {Object} options
   * @return {Node}
   */
  instance.registerHelper('each', function (context, options) {
    var fn       = options.fn;
    var inverse  = options.inverse;
    var fragment = document.createDocumentFragment();
    var i        = 0;
    var data;

    if (typeof context === 'function') {
      context = context.call(this);
    }

    if (options.data) {
      data = Utils.create(options.data);
    }

    if (typeof context === 'object') {
      var len = context.length;

      if (len === +len) {
        for (; i < len; i++) {
          data.index = i;
          data.first = (i === 0);
          data.last  = (i === len - 1);

          fragment.appendChild(fn(context[i], { data: data }).value);
        }
      } else {
        for (var key in context) {
          if (Object.prototype.hasOwnProperty.call(context, key)) {
            i += 1;

            data.key   = key;
            data.index = i;
            data.first = (i === 0);

            fragment.appendChild(fn(context[key], { data: data }).value);
          }
        }
      }
    }

    if (i === 0) {
      return inverse(this).value;
    }

    return fragment;
  });

  // Register updated Handlebars helpers.
  instance.registerHelper({
    'if':                 wrapOldHelper(instance.helpers.if),
    'with':               wrapOldHelper(instance.helpers.with),
    'blockHelperMissing': wrapOldHelper(instance.helpers.blockHelperMissing)
  });
};

/**
 * Create a custom DOMBars environment to match HandlebarsEnvironment.
 */
var DOMBarsEnvironment = base.DOMBarsEnvironment = function () {
  HandlebarsEnvironment.apply(this, arguments);
  registerDefaultHelpers(this);
};

/**
 * Extend the HandlebarsEnvironment prototype.
 *
 * @type {Object}
 */
var envPrototype = DOMBarsEnvironment.prototype = Utils.create(
  HandlebarsEnvironment.prototype
);

/**
 * Alias some useful functionality that is expected to be exposed on the root
 * object.
 */
envPrototype.createFrame       = hbsBase.createFrame;
envPrototype.REVISION_CHANGES  = hbsBase.REVISION_CHANGES;
envPrototype.COMPILER_REVISION = hbsBase.COMPILER_REVISION;

/**
 * The basic getter function. Override this with something else based on your
 * project. For example, Backbone.js models.
 *
 * @param  {Object} object
 * @param  {String} property
 * @return {*}
 */
envPrototype.get = function (object, property) {
  return object[property];
};

/**
 * Noop functions for subscribe and unsubscribe. Override with custom
 * functionality.
 */
envPrototype.subscribe = envPrototype.unsubscribe = function () {};

},{"./utils":16,"handlebars/dist/cjs/handlebars/base":22}],3:[function(require,module,exports){
var hbsAST = require('handlebars/dist/cjs/handlebars/compiler/ast').default;
var Utils  = require('../utils');

/**
 * Extend the Handlebars AST with DOM nodes.
 *
 * @type {Object}
 */
var AST = module.exports = Utils.create(hbsAST);

/**
 * Create an AST node for representing an element.
 *
 * @param {Object} name
 * @param {Object} attributes
 * @param {Object} content
 */
AST.DOMElement = function (name, attributes, content) {
  this.type       = 'DOM_ELEMENT';
  this.name       = name;
  this.attributes = attributes;
  this.content    = content;
};

/**
 * Create an AST node for representing an element attribute.
 *
 * @param {Object} name
 * @param {Object} value
 */
AST.DOMAttribute = function (name, value) {
  this.type  = 'DOM_ATTRIBUTE';
  this.name  = name;
  this.value = value;
};

/**
 * Create an AST node for representing a comment node.
 *
 * @param {Object} text
 */
AST.DOMComment = function (text) {
  this.type = 'DOM_COMMENT';
  this.text = text;
};

},{"../utils":16,"handlebars/dist/cjs/handlebars/compiler/ast":23}],4:[function(require,module,exports){
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

},{"../utils":16,"./common-compiler":6}],5:[function(require,module,exports){
var AST    = require('./ast');
var parser = exports.parser = require('./parser');

/**
 * Parse a string into an AST.
 *
 * @return {Object}
 */
exports.parse = function (input) {
  if (input.constructor === AST.ProgramNode) {
    return input;
  }

  parser.yy = AST;
  return parser.parse(input);
};

},{"./ast":3,"./parser":9}],6:[function(require,module,exports){
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

},{"../utils":16,"handlebars/dist/cjs/handlebars/compiler/javascript-compiler":26}],7:[function(require,module,exports){
var create       = require('../utils').create;
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
Compiler.prototype = create(BaseCompiler);
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

},{"../exception":11,"../utils":16,"./ast":3,"./base":5,"./javascript-compiler":8,"handlebars/dist/cjs/handlebars/compiler/compiler":25}],8:[function(require,module,exports){
var create         = require('../utils').create;
var CommonCompiler = require('./common-compiler').prototype;

/**
 * Extends Handlebars JavaScript compiler to add DOM specific rules.
 */
var Compiler = module.exports = function () {};
Compiler.prototype = create(CommonCompiler);
Compiler.prototype.compiler     = Compiler;
Compiler.prototype.attrCompiler = require('./attribute-compiler');

/**
 * Compiles the environment object generated by the base compiler.
 *
 * @param  {Object}            environment
 * @return {(Function|String)}
 */
Compiler.prototype.compile = function () {
  this.elementSlot = 0;
  return CommonCompiler.compile.apply(this, arguments);
};

/**
 * Compile any child program nodes. E.g. Block helpers.
 *
 * @param {Object} environment
 * @param {Object} options
 */
Compiler.prototype.compileChildren = function(environment, options) {
  var children = environment.children;
  var Compiler, child, program, index;

  for (var i = 0, l = children.length; i < l; i++) {
    child    = children[i];
    index    = this.matchExistingProgram(child);
    Compiler = this.compiler;

    if (child.isAttribute) {
      Compiler = this.attrCompiler;
    }

    if (index == null) {
      this.context.programs.push('');
      child.index = index = this.context.programs.length;
      child.name  = 'program' + index;
      program = new Compiler().compile(child, options, this.context);
      this.context.programs[index]     = program;
      this.context.environments[index] = child;
    } else {
      child.index = index;
      child.name  = 'program' + index;
    }
  }
};

/**
 * Push an element onto the stack and return it.
 *
 * @return {String}
 */
Compiler.prototype.pushElement = function () {
  return 'element' + (++this.elementSlot);
};

/**
 * Pop the last element off the stack and return it.
 *
 * @return {String}
 */
Compiler.prototype.popElement = function () {
  return 'element' + (this.elementSlot--);
};

/**
 * Returns the element at the end of the stack.
 *
 * @return {String}
 */
Compiler.prototype.topElement = function () {
  return 'element' + this.elementSlot;
};

/**
 * Append some content to the buffer (a document fragment).
 *
 * @param  {String} string
 * @return {String}
 */
Compiler.prototype.appendToBuffer = function (string) {
  if (this.environment.isSimple) {
    return 'return ' + string + ';';
  }

  this.context.aliases.appendChild = 'this.appendChild';

  return 'appendChild(buffer, ' + string + ');';
};

/**
 * Initialize the base value of the buffer, in this case a document fragment.
 *
 * @return {String}
 */
Compiler.prototype.initializeBuffer = function () {
  return 'document.createDocumentFragment()';
};

/**
 * Append a text node to the buffer.
 *
 * @param {String} content
 */
Compiler.prototype.appendContent = function (content) {
  var string = 'document.createTextNode(' + this.quotedString(content) + ')';
  this.source.push(this.appendToBuffer(string));
};

/**
 * Append a variable to the stack. Adds some additional logic to transform the
 * text into a DOM node before we attempt to append it to the buffer.
 */
Compiler.prototype.append = function (isEscaped) {
  this.flushInline();

  var createFn = 'createText';

  if (isEscaped) {
    this.context.aliases.createText = 'this.createText';
  } else {
    createFn = 'createDOM';
    this.context.aliases.createDOM = 'this.createDOM';
  }

  var local   = this.popStack();
  var source  = this.source.pop();
  var element = this.pushStack(
    createFn + '(function () { ' + source + '; return ' + local + '; })'
  );

  this.source.push(this.appendToBuffer(element));
};

/**
 * Append an escaped Handlebars expression to the source.
 */
Compiler.prototype.appendEscaped = function () {
  return this.append(true);
};

/**
 * Append an element node to the source.
 */
Compiler.prototype.appendElement = function () {
  this.source.push(this.appendToBuffer(this.popStack()));
};

/**
 * Create a DOM comment node ready for appending to the current buffer.
 */
Compiler.prototype.invokeComment = function () {
  this.context.aliases.partial = 'this.partial';

  var depth  = 'depth' + this.lastContext;
  var invoke = 'partial(' + this.topStack() + ', ' + depth + ')';

  this.context.aliases.createComment = 'this.createComment';

  this.pushStack('createComment(' + invoke + ')');
};

/**
 * Create a DOM element node ready for appending to the current buffer.
 */
Compiler.prototype.invokeElement = function () {
  this.context.aliases.partial       = 'this.partial';
  this.context.aliases.createElement = 'this.createElement';

  var element = this.pushElement();
  var depth   = 'depth' + this.lastContext;
  var current = 'partial(' + this.popStack() + ', ' + depth + ')';
  var update  = 'function (element) { ' + element + ' = element; }';
  var create  = 'createElement(' + current + ', ' + update + ')';

  this.pushStackLiteral(element);
  this.register(element, create);
};

/**
 * Append an attribute node to the current element.
 */
Compiler.prototype.invokeAttribute = function () {
  this.context.aliases.partial      = 'this.partial';
  this.context.aliases.setAttribute = 'this.setAttribute';

  var depth   = 'depth' + this.lastContext;
  var element = 'function () { return ' + this.topElement() + '; }';
  var value   = 'partial(' + this.popStack() + ', ' + depth + ')';
  var name    = 'partial(' + this.popStack() + ', ' + depth + ')';
  var params  = [element, name, value];

  this.source.push('setAttribute(' + params.join(', ') + ');');
};

/**
 * Invoke an arbitrary program and append to the current element.
 */
Compiler.prototype.invokeContent = function () {
  var element = this.topElement();
  var depth   = 'depth' + this.lastContext;
  var child   = this.popStack() + '(' + depth + ')';

  this.context.aliases.appendChild = 'this.appendChild';

  this.source.push('appendChild(' + element + ', ' + child + ');');
};

/**
 * Override the program expression function to proxy depth.
 *
 * @param  {Number} guid
 * @return {String}
 */
Compiler.prototype.programExpression = function (guid) {
  this.context.aliases.self = 'this';

  if (guid == null) {
    return 'self.noop';
  }

  var child         = this.environment.children[guid];
  var depths        = child.depths.list;
  var programParams = [child.index, child.name, 'data'];

  for (var i = 0, len = depths.length; i < len; i++) {
    var depth = depths[i] + this.environment.depths.list.length;

    programParams.push('depth' + (depth - 1));
  }

  var params = programParams.join(', ');

  if (depths.length === 0) {
    return 'self.program(' + params + ')';
  }

  return 'self.programWithDepth(' + params + ')';
};

},{"../utils":16,"./attribute-compiler":4,"./common-compiler":6}],9:[function(require,module,exports){
var HbsParser  = require(
  'handlebars/dist/cjs/handlebars/compiler/parser'
).default;
var HTMLParser = require('htmlparser2/lib/Parser');

/**
 * Stringify an `AST.ProgramNode` so it can be run through others parsers. This
 * is required for the node to be parsed as HTML *after* it is parsed as a
 * Handlebars template. Handlebars must always run before the HTML parser, so
 * it can correctly match block nodes (I couldn't see a simple way to resume
 * the end block node parsing).
 *
 * @param  {Handlebars.AST.ProgramNode} program
 * @return {String}
 */
var stringifyProgram = function (program) {
  var html       = '';
  var statements = program.statements;

  for (var i = 0; i < statements.length; i++) {
    var statement = statements[i];

    if (statement.type === 'content') {
      html += statement.string;
    } else {
      html += '{{d' + i + '}}'; // "Alias" node.
    }
  }

  return html;
};

/**
 * Parses a text string returned from stringifying a program node. Replaces any
 * mustache node references with the original node.

 * @param  {String} input
 * @param  {Object} originalProgram
 * @return {Object}
 */
var parseProgram = function (input, originalProgram) {
  var program    = HbsParser.parse(input);
  var statements = program.statements;

  for (var i = 0; i < statements.length; i++) {
    var statement = statements[i];

    // Replace mustache nodes, which *should* only be real Handlebars "alias"
    // nodes that were injected by the stringification of the program node.
    if (statement.type === 'mustache') {
      statements[i] = originalProgram.statements[statement.id.string.substr(1)];
      statement = statements[i];
    }

    // Need to recursively resolve block node programs as HTML.
    if (statement.type === 'block') {
      if (statement.program) {
        statement.program = parseAsHTML(statement.program);
      }

      if (statement.inverse) {
        statement.inverse = parseAsHTML(statement.inverse);
      }
    }
  }

  return program;
};

/**
 * Parse a program object as HTML and return an updated program.
 *
 * @param  {Object} originalProgram
 * @return {Object}
 */
var parseAsHTML = function (originalProgram) {
  var yy   = HbsParser.yy;
  var html = stringifyProgram(originalProgram);

  // Create and return a new empty program node.
  var createProgram = function () {
    return new yy.ProgramNode([]);
  };

  // Start the stack with an empty program node which will contain all the
  // parsed elements.
  var program = createProgram();
  var stack   = [program];
  var element;

  // Generate a new HTML parser instance.
  var parser = new HTMLParser({
    onopentagname: function (name) {
      var node = new yy.DOMElement(name, [], createProgram());
      program.statements.push(element = node);
      stack.push(program = node.content);
    },
    onclosetag: function () {
      stack.pop();
      element = null;
      program = stack[stack.length - 1];
    },
    onattribute: function (name, value) {
      element.attributes.push(new yy.DOMAttribute(name, value));
    },
    ontext: function (text) {
      program.statements.push(text);
    },
    onprocessinginstruction: function () {
      throw new Error('Processing instructions are not supported');
    },
    oncomment: function (data) {
      program.statements.push(new yy.DOMComment(data));
    },
    onerror: function (error) {
      throw error;
    }
  }, {
    decodeEntities: true
  });

  parser.write(html);
  parser.end();

  /**
   * Recursively parses nested DOM elements as Handlebars templates.
   *
   * @param  {Object} program
   * @param  {Object} originalProgram
   * @return {Object}
   */
  var ast = (function recurse (program, originalProgram) {
    var statements = program.statements;

    for (var i = 0; i < statements.length; i++) {
      var statement = statements[i];

      if (typeof statement === 'string') {
        var merge = parseProgram(statement, originalProgram).statements;

        statements.splice.apply(statements, [i, 1].concat(merge));
        i += merge.length - 1;
      } else if (statement.type === 'DOM_COMMENT') {
        statement.text = parseProgram(statement.text, originalProgram);
      } else if (statement.type === 'DOM_ELEMENT') {
        statement.name = parseProgram(statement.name, originalProgram);

        for (var k = 0; k < statement.attributes.length; k++) {
          var attribute = statement.attributes[k];

          attribute.name  = parseProgram(attribute.name,  originalProgram);
          attribute.value = parseProgram(attribute.value, originalProgram);
        }

        recurse(statement.content, originalProgram);
      }
    }

    return program;
  })(stack.pop(), originalProgram);

  return ast;
};

/**
 * The parser is a simple constructor. All the functionality is on the prototype
 * object.
 */
var Parser = function () {
  this.yy = {};
};

/**
 * Alias the parser constructor function.
 *
 * @type {Function}
 */
Parser.prototype.Parser = Parser;

/**
 * The primary functionality of the parser. Pushes the input text through
 * Handlebars and a HTML parser, generating a AST for use with the compiler.
 *
 * @param  {String} input
 * @return {Object}
 */
Parser.prototype.parse = function (input) {
  HbsParser.yy = this.yy;

  // Parse it as a Handlebars to extract the important nodes first. Then we
  // stringify the node to something the HTML parser can handle. The AST the
  // HTML parser generates will be parsed using Handlebars again to inject the
  // original nodes back.
  return parseAsHTML(HbsParser.parse(input));
};

/**
 * Export a static instance of the parser.
 *
 * @type {Parser}
 */
module.exports = new Parser();

},{"handlebars/dist/cjs/handlebars/compiler/parser":27,"htmlparser2/lib/Parser":32}],10:[function(require,module,exports){
var Events = module.exports = {};

/**
 * Listen to any events triggered.
 *
 * @param  {String}   name
 * @param  {Function} fn
 * @param  {Object}   context
 * @return {Events}
 */
Events.on = function (name, fn, context) {
  this._events || (this._events = {});
  var events = this._events[name] || (this._events[name] = []);
  events.push({ fn: fn, context: context });
  return this;
};

/**
 * Listen to any events triggered once.
 *
 * @param  {String}   name
 * @param  {Function} fn
 * @param  {Object}   context
 * @return {Events}
 */
Events.once = function (name, fn, context) {
  var that = this;

  return this.on(name, function self () {
    that.off(name, self);
    fn.apply(this, arguments);
  }, context);
};

/**
 * Remove an event listener.
 *
 * @param  {String}   name
 * @param  {Function} fn
 * @param  {Object}   context
 * @return {Events}
 */
Events.off = function (name, fn, context) {
  if (!this._events || !this._events[name]) {
    return this;
  }

  if (arguments.length < 2) {
    if (!name) {
      delete this._events;
    } else {
      delete this._events[name];
    }

    return this;
  }

  var events = this._events[name];
  for (var i = 0; i < events.length; i++) {
    if (events[i].fn === fn) {
      if (arguments.length === 2 || events[i].context === context) {
        events.splice(i, 1);
        i--;
      }
    }
  }

  if (!events.length) {
    delete this._events[name];
  }

  return this;
};

/**
 * Emit an event.
 *
 * @param  {String} name
 * @param  {*}      ...
 * @return {Events}
 */
Events.emit = function (name /*, ...args */) {
  var args   = Array.prototype.slice.call(arguments, 1);
  var events = this._events && this._events[name] && this._events[name].slice();

  if (events) {
    for (var i = 0; i < events.length; i++) {
      events[i].fn.apply(events[i].context, args);
    }
  }

  return this;
};

},{}],11:[function(require,module,exports){
module.exports = require('handlebars/dist/cjs/handlebars/exception').default;

},{"handlebars/dist/cjs/handlebars/exception":28}],12:[function(require,module,exports){
var currentTime = window.Date.now || (function () {
  var Constuctor = window.Date;

  return function () {
    return new Constuctor().getTime();
  };
})();


var setTimer    = window.setTimeout;
var clearTimer  = window.clearTimeout;

/**
 * Fallback animation frame implementation.
 *
 * @return {Function}
 */
var fallback = function () {
  var prev = currentTime();

  return function (fn) {
    var curr = currentTime();
    var ms   = Math.max(0, 16 - (curr - prev));
    var req  = setTimer(fn, ms);

    prev = curr;

    return req;
  };
};

/**
 * Expose `requestAnimationFrame`.
 *
 * @type {Function}
 */
exports = module.exports = window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.msRequestAnimationFrame ||
  window.oRequestAnimationFrame ||
  fallback();

/**
 * Cancel the animation frame.
 *
 * @type {Function}
 */
var cancel = window.cancelAnimationFrame ||
  window.webkitCancelAnimationFrame ||
  window.mozCancelAnimationFrame ||
  window.msCancelAnimationFrame ||
  window.oCancelAnimationFrame ||
  clearTimer;

/**
 * Cancel an animation frame.
 *
 * @param {Number} id
 */
exports.cancel = function (id) {
  cancel.call(window, id);
};

},{}],13:[function(require,module,exports){
var hbsVM     = require('handlebars/dist/cjs/handlebars/runtime');
var Utils     = require('./utils');
var isBrowser = typeof window !== 'undefined';
var raf       = isBrowser && require('./raf');

/**
 * Iterate over an array of functions and execute each of them.
 *
 * @param {Array} array
 */
var iteration = function (array) {
  for (var i = 0; i < array.length; i++) {
    array[i]();
  }
};

/**
 * Extend the Handlebars runtime environment with DOM specific helpers.
 *
 * @type {Object}
 */
var VM = module.exports = Utils.create(hbsVM);

/**
 * Bind a function to the animation frame.
 *
 * @param  {Function} fn
 * @return {Number}
 */
VM.exec = function (fn) {
  return isBrowser ? raf(fn) : setImmediate(fn);
};

/**
 * Cancel an execution.
 *
 * @param {Number} id
 */
VM.exec.cancel = function (id) {
  return isBrowser ? raf.cancel(id) : clearImmediate(id);
};

/**
 * Generate an executable template from a template spec.
 *
 * @param  {Object}   templateSpec
 * @return {Function}
 */
VM.template = function (templateSpec, env) {
  /**
   * Accepts a function that has subscriptions called inside and returns a new
   * function that will listen to all subscriptions and can update with any
   * changes.
   *
   * @param  {Function} fn
   * @return {Function}
   */
  var subscribe = function (fn) {
    var triggered    = false;
    var unsubscribed = false;
    var execId;
    var updater;
    var prevSubscriptions;

    /**
     * Iterate over a subscriptions object and unsubscribe everything.
     *
     * @param {Array} subscriptions
     */
    var eachSubscription = function (subscriptions, fn) {
      for (var property in subscriptions) {
        for (var key in subscriptions[property]) {
          var subscription = subscriptions[property][key];
          fn(subscription, property, subscriber.update);
        }
      }
    };

    /**
     * Run this function before we run an update function. It moves current
     * subscriptions so that we can diff the subscriptions after we update
     * the DOM.
     */
    var beforeUpdate = function () {
      iteration(subscriber.unsubscriptions);
      prevSubscriptions = subscriber.subscriptions;
    };

    /**
     * Run this function after an update. It will check for difference in the
     * before and after updates.
     */
    var afterUpdate = function () {
      var subscriptions = subscriber.subscriptions;

      // Diff the new subscriptions against the previous subscriptions object
      // to add/remove listeners as needed. This is more memory efficient than
      // blindly adding and removing every listener each execution.
      for (var property in subscriptions) {
        for (var key in subscriptions[property]) {
          if (!prevSubscriptions[property][key]) {
            var subscription = subscriptions[property][key];
            env.subscribe(subscription, property, subscriber.update);
          } else {
            delete prevSubscriptions[property][key];
          }
        }
      }

      // Loop over previous subscriptions that no longer exist and unsubscribe.
      eachSubscription(prevSubscriptions, env.unsubscribe);

      // Remove any lingering references to previous subscription objects.
      prevSubscriptions = null;
    };

    /**
     * Unsubscribe every child of the current subscription.
     */
    var unsubscribeChildren = function () {
      for (var child in subscriber.children) {
        subscriber.children[child].remove();
      }
    };

    /**
     * Execute the function and return the result.
     *
     * @return {*}
     */
    var execute = function () {
      // If we have a parent subscriber, link the subscribers together.
      if (container.subscriber) {
        subscriber.parent = container.subscriber;
        subscriber.parent.children[subscriber.cid] = subscriber;
      }

      // Reset subscriptions before execution.
      subscriber.subscriptions   = {};
      subscriber.unsubscriptions = [];

      // Alias subscriber functionality to the VM object.
      container.subscriber = subscriber;

      var value = fn.apply(this, arguments);

      // Reset the VM functionality to what it was beforehand.
      container.subscriber = subscriber.parent;

      // Return an object with a value property and unsubscribe functionality.
      return value;
    };

    /**
     * The returned subscription function takes care of aliasing the
     * subscriptions array correctly, subscribing for updates and triggering
     * updates when any of the subscriptions change.
     *
     * @param  {Function} fn
     * @return {*}
     */
    var subscriber = function (fn) {
      var result = execute.apply(this, arguments);

      updater = fn;
      eachSubscription(subscriber.subscriptions, env.subscribe);

      return result;
    };

    // Keep an array of current subscriptions and an object with references
    // to child subscription functions.
    subscriber.cid      = 'subscriber' + Utils.uniqueId();
    subscriber.children = {};

    /**
     * Trigger this function with every change with the listeners.
     */
    subscriber.update = function () {
      // If the triggered flag has been set, don't cause another update.
      if (triggered || unsubscribed) { return; }

      // Set a triggered flag to avoid multiple triggers. Also unsubscribe any
      // children immediately to stop update clashes.
      triggered = true;
      unsubscribeChildren();

      execId = VM.exec(function () {
        triggered = false;

        beforeUpdate();
        updater(execute());
        afterUpdate();
      });
    };

    /**
     * Push unsubscription functions into the unsubscribe array.
     */
    subscriber.unsubscribe = function (fn) {
      Utils.isFunction(fn) && subscriber.unsubscriptions.push(fn);
    };

    /**
     * Remove the current subscriber from all listeners. We also need to cancel
     * any current execution event and remove a reference from the parent
     * subscription.
     */
    subscriber.remove = function () {
      iteration(subscriber.unsubscriptions);
      eachSubscription(subscriber.subscriptions, env.unsubscribe);

      // Remove the current subscription from its parent.
      if (subscriber.parent) {
        delete subscriber.parent.children[subscriber.cid];
        delete subscriber.parent;
      }

      // Remove other refernences.
      updater = null;

      // Track whether we have been unsubscribed. This is required since the
      // listener could still be triggered at any time even though we expect
      // the external references to be dropped. This could also indicate a
      // potential memory leak with the listener unsusbcription code.
      unsubscribed = true;
      unsubscribeChildren();
      VM.exec.cancel(execId);
    };

    return subscriber;
  };

  /**
   * Wrap a function in a subscriber *every* time that function is called.
   *
   * @param  {Function} fn
   * @return {Object}
   */
  var wrapSubscriber = function (fn) {
    return function () {
      var subscriber = subscribe(fn);
      var value      = subscriber.apply(this, arguments);

      // Return an object wrapped in useful functionality.
      return {
        value:       value,
        unsubscribe: subscriber.remove
      };
    };
  };

  /**
   * The container object holds all the functions used by the template spec.
   *
   * @type {Object}
   */
  var container = {
    invokePartial:    VM.invokePartial,
    programs:         [],
    noop:             VM.noop,
    partial:          Utils.partial,
    escapeExpression: Utils.escapeExpression,
    programWithDepth: VM.programWithDepth
  };

  /**
   * Render and subscribe a single DOM node using a custom creation function.
   *
   * @param  {Function} fn
   * @param  {Function} create
   * @return {Node}
   */
  var subscribeNode = function (fn, create) {
    var subscription = subscribe(fn);

    var trackNode = Utils.trackNode(create(subscription(function (value) {
      trackNode.replace(create(value));
    })));

    return trackNode.fragment;
  };

  /**
   * Remove an attribute from an element.
   *
   * @param {Node}   element
   * @param {String} name
   */
  var removeAttribute = function (element, name) {
    if (element.hasAttribute(name)) {
      env.emit('removeAttribute', element, name);
      element.removeAttribute(name);
    }
  };

  /**
   * Set an attribute value on an element.
   *
   * @param {Node}   element
   * @param {String} name
   * @param {*}      value
   */
  var setAttribute = function (element, name, value) {
    if (value === false) {
      return removeAttribute(element, name);
    }

    env.emit('setAttribute', element, name, value);
    element.setAttribute(name, value);
  };

  /**
   * Create an element from a tag name.
   *
   * @param  {String} tagName
   * @return {Node}
   */
  var createElement = function (tagName) {
    var node = document.createElement(tagName);
    env.emit('createElement', node);
    return node;
  };

  /**
   * Create a comment node based on text contents.
   *
   * @param  {String} contents
   * @return {Node}
   */
  var createComment = function (tagName) {
    var node = document.createComment(tagName);
    env.emit('createComment', node);
    return node;
  };

  /**
   * Copy all significant data from one element node to another.
   *
   * @param  {Node} newNode
   * @param  {Node} oldNode
   * @return {Node}
   */
  var copyNode = function (newNode, oldNode) {
    // Move all child elements to the new node.
    while (oldNode.firstChild) {
      newNode.appendChild(oldNode.firstChild);
    }

    // Copy all the attributes to the new node.
    for (var i = 0; i < oldNode.attributes.length; i++) {
      var attribute = oldNode.attributes[i];
      setAttribute(newNode, attribute.name, attribute.value);
    }

    return newNode;
  };

  /**
   * Copy all the data from one element to another and replace in place.
   *
   * @param  {Node} newNode
   * @param  {Node} oldNode
   * @return {Node}
   */
  var copyAndReplaceNode = function (newNode, oldNode) {
    oldNode.parentNode.replaceChild(copyNode(newNode, oldNode), oldNode);
    return newNode;
  };

  /**
   * Create an element and subscribe to any changes. This method requires a
   * callback function for any element changes since you can't change a tag
   * name in place.
   *
   * @param  {Function} fn
   * @param  {Function} cb
   * @return {Element}
   */
  container.createElement = function (fn, cb) {
    var subscription = subscribe(fn);

    var el = createElement(subscription(function (value) {
      cb(el = copyAndReplaceNode(createElement(value), el));
    }));

    return el;
  };

  /**
   * Append an element to the end of another element.
   *
   * @param {Node} parent
   * @param {Node} child
   */
  container.appendChild = function (parent, child) {
    if (!child) { return; }

    parent.appendChild(child);
    env.emit('appendChild', parent, child);
  };

  /**
   * Set an elements attribute. We accept the current element a function
   * because when a tag name changes we will lose reference to the actively
   * rendered element.
   *
   * @param {Function} elementFn
   * @param {Function} nameFn
   * @param {Function} valueFn
   */
  container.setAttribute = function (elementFn, nameFn, valueFn) {
    var nameSubscription  = subscribe(nameFn);
    var valueSubscription = subscribe(valueFn);

    // Keep track of the current name and value without having to re-run the
    // function every time something changes.
    var attrName = nameSubscription(function (value) {
      removeAttribute(elementFn(), attrName);
      setAttribute(elementFn(), attrName = value, attrValue);
    });

    var attrValue = valueSubscription(function (value) {
      setAttribute(elementFn(), attrName, attrValue = value);
    });

    return setAttribute(elementFn(), attrName, attrValue);
  };

  /**
   * Create a DOM element and subscribe to any changes.
   *
   * @param  {Function} fn
   * @return {Node}
   */
  container.createDOM = function (fn) {
    return subscribeNode(fn, Utils.domifyExpression);
  };

  /**
   * Create a text node and subscribe to any changes.
   *
   * @param  {Function} fn
   * @return {Text}
   */
  container.createText = function (fn) {
    return subscribeNode(fn, Utils.textifyExpression);
  };

  /**
   * Create a comment node and subscribe to any changes.
   *
   * @param  {Function} fn
   * @return {Comment}
   */
  container.createComment = function (fn) {
    var subscription = subscribe(fn);
    var node         = createComment(subscription(function (value) {
      node.textContent = value;
    }));

    return node;
  };

  /**
   * Create and return a program singleton based on index.
   *
   * @param  {Number}   i
   * @param  {Function} fn
   * @param  {Object}   data
   * @return {Function}
   */
  container.program = function (i, fn, data) {
    var programWrapper = container.programs[i];

    if (data) {
      return VM.program(i, fn, data);
    }

    if (!programWrapper) {
      return container.programs[i] = VM.program(i, fn);
    }

    return programWrapper;
  };

  /**
   * Wrap program functions with subscriber functionality.
   *
   * @param  {Function} program
   * @return {Function}
   */
  container.wrapProgram = function (fn) {
    return function () {
      return wrapSubscriber(fn).apply(this, arguments);
    };
  };

  /**
   * Merge two objects into a single object.
   *
   * @param  {Object} param
   * @param  {Object} common
   * @return {Object}
   */
  container.merge = function (param, common) {
    var ret = param || common;

    if (param && common && (param !== common)) {
      ret = {};
      Utils.extend(ret, common);
      Utils.extend(ret, param);
    }

    return ret;
  };

  /**
   * Get a property from an object. Passes in the object id (depth) to make it
   * much faster to do comparisons between new and old subscriptions.
   *
   * @param  {Object} object
   * @param  {String} property
   * @param  {String} id
   * @return {*}
   */
  container.get = function (object, property, id) {
    var subscriptions = container.subscriber.subscriptions;

    (subscriptions[property] || (subscriptions[property] = {}))[id] = object;

    return env.get(object, property);
  };

  /**
   * Return the compiled JavaScript function for execution.
   *
   * @param  {Object} context
   * @param  {Object} options
   * @return {Node}
   */
  return wrapSubscriber(function (context, options) {
    options = options || {};

    var namespace = options.partial ? options : env;
    var helpers;
    var partials;

    if (!options.partial) {
      helpers  = options.helpers;
      partials = options.partials;
    }

    var result = templateSpec.call(
      container,
      namespace,
      context,
      helpers,
      partials,
      options.data
    );

    if (!options.partial) {
      env.VM.checkRevision(container.compilerInfo);
    }

    return result;
  });
};

},{"./raf":12,"./utils":16,"handlebars/dist/cjs/handlebars/runtime":29}],14:[function(require,module,exports){
module.exports = require('handlebars/dist/cjs/handlebars/safe-string').default;

},{"handlebars/dist/cjs/handlebars/safe-string":30}],15:[function(require,module,exports){
var TrackNode = module.exports = function (node) {
  this.fragment = document.createDocumentFragment();

  // Instantly append a before and after tracking node.
  this.before = this.fragment.appendChild(document.createTextNode(''));
  this.after  = this.fragment.appendChild(document.createTextNode(''));

  // Append the passed in node to the current fragment.
  node && this.appendChild(node);
};

/**
 * Append a node to the current tracking fragment.
 *
 * @param  {Node} node
 * @return {this}
 */
TrackNode.prototype.appendChild = function (node) {
  this.after.parentNode.insertBefore(node, this.after);

  return this;
};

/**
 * Prepend a node to the current tracking fragment.
 *
 * @param  {Node} node
 * @return {this}
 */
TrackNode.prototype.prependChild = function (node) {
  this.before.parentNode.insertBefore(node, this.before.nextSibling);

  return this;
};

/**
 * Remove all elements between the two tracking nodes.
 *
 * @param  {Node} node
 * @return {this}
 */
TrackNode.prototype.empty = function () {
  while (this.before.nextSibling !== this.after) {
    this.before.parentNode.removeChild(this.before.nextSibling);
  }

  return this;
};

/**
 * Remove the the elements from the DOM.
 *
 * @param  {Node} node
 * @return {this}
 */
TrackNode.prototype.remove = function () {
  while (this.before.nextSibling !== this.after) {
    this.fragment.appendChild(this.before.nextSibling);
  }

  // Pull the two reference nodes out of the DOM and into the fragment.
  this.fragment.appendChild(this.after);
  this.fragment.insertBefore(this.before, this.fragment.firstChild);

  return this;
};

/**
 * Replace the contents of the tracking node with new contents.
 *
 * @param  {Node} node
 * @return {this}
 */
TrackNode.prototype.replace = function (node) {
  return this.empty().appendChild(node);
};

},{}],16:[function(require,module,exports){
var hbsUtils   = require('handlebars/dist/cjs/handlebars/utils');
var uniqueId   = 0;
var TrackNode  = require('./track-node');
var SafeString = require('./safe-string');
var __slice    = Array.prototype.slice;

/**
 * Simple way to subclass an object, with support for older browsers.
 *
 * @return {Object}
 */
var create = Object.create || (function () {
  var F = function () {};

  return function (o) {
    F.prototype = o;
    var obj = new F();
    F.prototype = null;
    return obj;
  };
})();

/**
 * Extend Handlebars utilities with DOM functionality.
 *
 * @type {Object}
 */
var Utils = module.exports = create(hbsUtils);

/**
 * Return a unique id.
 *
 * @return {Number}
 */
Utils.uniqueId = function () {
  return uniqueId++;
};

/**
 * Simple partial application function.
 *
 * @param  {Function} fn
 * @return {Function}
 */
Utils.partial = function (fn /* , ..args */) {
  var args = __slice.call(arguments, 1);

  return function () {
    return fn.apply(this, args.concat(__slice.call(arguments)));
  };
};

/**
 * Expose the create function.
 *
 * @type {Function}
 */
Utils.create = create;

/**
 * Check whether an object is actually a DOM node.
 *
 * @param  {*}       element
 * @return {Boolean}
 */
Utils.isNode = function (element) {
  return element instanceof Node;
};

/**
 * Track a node instance anywhere it goes in the DOM.
 *
 * @param  {Node}      node
 * @return {TrackNode}
 */
Utils.trackNode = function (node) {
  return new TrackNode(node);
};

/**
 * Transform a string into arbitrary DOM nodes.
 *
 * @param  {String} string
 * @return {Node}
 */
Utils.domifyExpression = function (string) {
  // If we passed in a safe string, get the actual value.
  if (string instanceof SafeString) {
    string = string.string;
  }

  // No need to coerce a node.
  if (Utils.isNode(string)) {
    return string;
  }

  var div = document.createElement('div');
  div.innerHTML = string;

  if (div.childNodes.length === 1) {
    return div.removeChild(div.childNodes[0]);
  }

  var fragment = document.createDocumentFragment();

  while (div.firstChild) {
    fragment.appendChild(div.firstChild);
  }

  return fragment;
};

/**
 * Transform a string into a DOM text node for appending to the template.
 *
 * @param  {String} string
 * @return {Text}
 */
Utils.textifyExpression = function (string) {
  if (string instanceof SafeString) {
    return Utils.domifyExpression(string.string);
  }

  // Catch when the string is actually a DOM node and turn it into a string.
  if (Utils.isNode(string)) {
    // Already a text node, just return it immediately.
    if (string.nodeType === 3) {
      return string;
    }

    if (typeof string.outerHTML === 'string') {
      return document.createTextNode(string.outerHTML);
    }

    var div = document.createElement('div');
    div.appendChild(string.cloneNode(true));
    return document.createTextNode(div.innerHTML);
  }

  return document.createTextNode(string == null ? '' : string);
};

},{"./safe-string":14,"./track-node":15,"handlebars/dist/cjs/handlebars/utils":31}],17:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        throw TypeError('Uncaught, unspecified "error" event.');
      }
      return false;
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      console.trace();
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],18:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],19:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],20:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],21:[function(require,module,exports){
var process=require("__browserify_process"),global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

},{"./support/isBuffer":20,"__browserify_process":19,"inherits":18}],22:[function(require,module,exports){
"use strict";
var Utils = require("./utils");
var Exception = require("./exception")["default"];

var VERSION = "1.2.0";
exports.VERSION = VERSION;var COMPILER_REVISION = 4;
exports.COMPILER_REVISION = COMPILER_REVISION;
var REVISION_CHANGES = {
  1: '<= 1.0.rc.2', // 1.0.rc.2 is actually rev2 but doesn't report it
  2: '== 1.0.0-rc.3',
  3: '== 1.0.0-rc.4',
  4: '>= 1.0.0'
};
exports.REVISION_CHANGES = REVISION_CHANGES;
var isArray = Utils.isArray,
    isFunction = Utils.isFunction,
    toString = Utils.toString,
    objectType = '[object Object]';

function HandlebarsEnvironment(helpers, partials) {
  this.helpers = helpers || {};
  this.partials = partials || {};

  registerDefaultHelpers(this);
}

exports.HandlebarsEnvironment = HandlebarsEnvironment;HandlebarsEnvironment.prototype = {
  constructor: HandlebarsEnvironment,

  logger: logger,
  log: log,

  registerHelper: function(name, fn, inverse) {
    if (toString.call(name) === objectType) {
      if (inverse || fn) { throw new Exception('Arg not supported with multiple helpers'); }
      Utils.extend(this.helpers, name);
    } else {
      if (inverse) { fn.not = inverse; }
      this.helpers[name] = fn;
    }
  },

  registerPartial: function(name, str) {
    if (toString.call(name) === objectType) {
      Utils.extend(this.partials,  name);
    } else {
      this.partials[name] = str;
    }
  }
};

function registerDefaultHelpers(instance) {
  instance.registerHelper('helperMissing', function(arg) {
    if(arguments.length === 2) {
      return undefined;
    } else {
      throw new Error("Missing helper: '" + arg + "'");
    }
  });

  instance.registerHelper('blockHelperMissing', function(context, options) {
    var inverse = options.inverse || function() {}, fn = options.fn;

    if (isFunction(context)) { context = context.call(this); }

    if(context === true) {
      return fn(this);
    } else if(context === false || context == null) {
      return inverse(this);
    } else if (isArray(context)) {
      if(context.length > 0) {
        return instance.helpers.each(context, options);
      } else {
        return inverse(this);
      }
    } else {
      return fn(context);
    }
  });

  instance.registerHelper('each', function(context, options) {
    var fn = options.fn, inverse = options.inverse;
    var i = 0, ret = "", data;

    if (isFunction(context)) { context = context.call(this); }

    if (options.data) {
      data = createFrame(options.data);
    }

    if(context && typeof context === 'object') {
      if (isArray(context)) {
        for(var j = context.length; i<j; i++) {
          if (data) {
            data.index = i;
            data.first = (i === 0);
            data.last  = (i === (context.length-1));
          }
          ret = ret + fn(context[i], { data: data });
        }
      } else {
        for(var key in context) {
          if(context.hasOwnProperty(key)) {
            if(data) { 
              data.key = key; 
              data.index = i;
              data.first = (i === 0);
            }
            ret = ret + fn(context[key], {data: data});
            i++;
          }
        }
      }
    }

    if(i === 0){
      ret = inverse(this);
    }

    return ret;
  });

  instance.registerHelper('if', function(conditional, options) {
    if (isFunction(conditional)) { conditional = conditional.call(this); }

    // Default behavior is to render the positive path if the value is truthy and not empty.
    // The `includeZero` option may be set to treat the condtional as purely not empty based on the
    // behavior of isEmpty. Effectively this determines if 0 is handled by the positive path or negative.
    if ((!options.hash.includeZero && !conditional) || Utils.isEmpty(conditional)) {
      return options.inverse(this);
    } else {
      return options.fn(this);
    }
  });

  instance.registerHelper('unless', function(conditional, options) {
    return instance.helpers['if'].call(this, conditional, {fn: options.inverse, inverse: options.fn, hash: options.hash});
  });

  instance.registerHelper('with', function(context, options) {
    if (isFunction(context)) { context = context.call(this); }

    if (!Utils.isEmpty(context)) return options.fn(context);
  });

  instance.registerHelper('log', function(context, options) {
    var level = options.data && options.data.level != null ? parseInt(options.data.level, 10) : 1;
    instance.log(level, context);
  });
}

var logger = {
  methodMap: { 0: 'debug', 1: 'info', 2: 'warn', 3: 'error' },

  // State enum
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  level: 3,

  // can be overridden in the host environment
  log: function(level, obj) {
    if (logger.level <= level) {
      var method = logger.methodMap[level];
      if (typeof console !== 'undefined' && console[method]) {
        console[method].call(console, obj);
      }
    }
  }
};
exports.logger = logger;
function log(level, obj) { logger.log(level, obj); }

exports.log = log;var createFrame = function(object) {
  var obj = {};
  Utils.extend(obj, object);
  return obj;
};
exports.createFrame = createFrame;
},{"./exception":28,"./utils":31}],23:[function(require,module,exports){
"use strict";
var Exception = require("../exception")["default"];

var AST = {
  ProgramNode: function(statements, inverseStrip, inverse) {
    this.type = "program";
    this.statements = statements;
    this.strip = {};

    if(inverse) {
      this.inverse = new AST.ProgramNode(inverse, inverseStrip);
      this.strip.right = inverseStrip.left;
    } else if (inverseStrip) {
      this.strip.left = inverseStrip.right;
    }
  },

  MustacheNode: function(rawParams, hash, open, strip) {
    this.type = "mustache";
    this.hash = hash;
    this.strip = strip;

    // Open may be a string parsed from the parser or a passed boolean flag
    if (open != null && open.charAt) {
      // Must use charAt to support IE pre-10
      var escapeFlag = open.charAt(3) || open.charAt(2);
      this.escaped = escapeFlag !== '{' && escapeFlag !== '&';
    } else {
      this.escaped = !!open;
    }

    var id = this.id = rawParams[0];
    var params = this.params = rawParams.slice(1);

    // a mustache is an eligible helper if:
    // * its id is simple (a single part, not `this` or `..`)
    var eligibleHelper = this.eligibleHelper = id.isSimple;

    // a mustache is definitely a helper if:
    // * it is an eligible helper, and
    // * it has at least one parameter or hash segment
    this.isHelper = eligibleHelper && (params.length || hash);

    // if a mustache is an eligible helper but not a definite
    // helper, it is ambiguous, and will be resolved in a later
    // pass or at runtime.
  },

  PartialNode: function(partialName, context, strip) {
    this.type         = "partial";
    this.partialName  = partialName;
    this.context      = context;
    this.strip = strip;
  },

  BlockNode: function(mustache, program, inverse, close) {
    if(mustache.id.original !== close.path.original) {
      throw new Exception(mustache.id.original + " doesn't match " + close.path.original);
    }

    this.type = "block";
    this.mustache = mustache;
    this.program  = program;
    this.inverse  = inverse;

    this.strip = {
      left: mustache.strip.left,
      right: close.strip.right
    };

    (program || inverse).strip.left = mustache.strip.right;
    (inverse || program).strip.right = close.strip.left;

    if (inverse && !program) {
      this.isInverse = true;
    }
  },

  ContentNode: function(string) {
    this.type = "content";
    this.string = string;
  },

  HashNode: function(pairs) {
    this.type = "hash";
    this.pairs = pairs;
  },

  IdNode: function(parts) {
    this.type = "ID";

    var original = "",
        dig = [],
        depth = 0;

    for(var i=0,l=parts.length; i<l; i++) {
      var part = parts[i].part;
      original += (parts[i].separator || '') + part;

      if (part === ".." || part === "." || part === "this") {
        if (dig.length > 0) { throw new Exception("Invalid path: " + original); }
        else if (part === "..") { depth++; }
        else { this.isScoped = true; }
      }
      else { dig.push(part); }
    }

    this.original = original;
    this.parts    = dig;
    this.string   = dig.join('.');
    this.depth    = depth;

    // an ID is simple if it only has one part, and that part is not
    // `..` or `this`.
    this.isSimple = parts.length === 1 && !this.isScoped && depth === 0;

    this.stringModeValue = this.string;
  },

  PartialNameNode: function(name) {
    this.type = "PARTIAL_NAME";
    this.name = name.original;
  },

  DataNode: function(id) {
    this.type = "DATA";
    this.id = id;
  },

  StringNode: function(string) {
    this.type = "STRING";
    this.original =
      this.string =
      this.stringModeValue = string;
  },

  IntegerNode: function(integer) {
    this.type = "INTEGER";
    this.original =
      this.integer = integer;
    this.stringModeValue = Number(integer);
  },

  BooleanNode: function(bool) {
    this.type = "BOOLEAN";
    this.bool = bool;
    this.stringModeValue = bool === "true";
  },

  CommentNode: function(comment) {
    this.type = "comment";
    this.comment = comment;
  }
};

// Must be exported as an object rather than the root of the module as the jison lexer
// most modify the object to operate properly.
exports["default"] = AST;
},{"../exception":28}],24:[function(require,module,exports){
"use strict";
var parser = require("./parser")["default"];
var AST = require("./ast")["default"];

exports.parser = parser;

function parse(input) {
  // Just return if an already-compile AST was passed in.
  if(input.constructor === AST.ProgramNode) { return input; }

  parser.yy = AST;
  return parser.parse(input);
}

exports.parse = parse;
},{"./ast":23,"./parser":27}],25:[function(require,module,exports){
"use strict";
var Exception = require("../exception")["default"];
var parse = require("./base").parse;
var JavaScriptCompiler = require("./javascript-compiler")["default"];
var AST = require("./ast")["default"];

function Compiler() {}

exports.Compiler = Compiler;// the foundHelper register will disambiguate helper lookup from finding a
// function in a context. This is necessary for mustache compatibility, which
// requires that context functions in blocks are evaluated by blockHelperMissing,
// and then proceed as if the resulting value was provided to blockHelperMissing.

Compiler.prototype = {
  compiler: Compiler,

  disassemble: function() {
    var opcodes = this.opcodes, opcode, out = [], params, param;

    for (var i=0, l=opcodes.length; i<l; i++) {
      opcode = opcodes[i];

      if (opcode.opcode === 'DECLARE') {
        out.push("DECLARE " + opcode.name + "=" + opcode.value);
      } else {
        params = [];
        for (var j=0; j<opcode.args.length; j++) {
          param = opcode.args[j];
          if (typeof param === "string") {
            param = "\"" + param.replace("\n", "\\n") + "\"";
          }
          params.push(param);
        }
        out.push(opcode.opcode + " " + params.join(" "));
      }
    }

    return out.join("\n");
  },

  equals: function(other) {
    var len = this.opcodes.length;
    if (other.opcodes.length !== len) {
      return false;
    }

    for (var i = 0; i < len; i++) {
      var opcode = this.opcodes[i],
          otherOpcode = other.opcodes[i];
      if (opcode.opcode !== otherOpcode.opcode || opcode.args.length !== otherOpcode.args.length) {
        return false;
      }
      for (var j = 0; j < opcode.args.length; j++) {
        if (opcode.args[j] !== otherOpcode.args[j]) {
          return false;
        }
      }
    }

    len = this.children.length;
    if (other.children.length !== len) {
      return false;
    }
    for (i = 0; i < len; i++) {
      if (!this.children[i].equals(other.children[i])) {
        return false;
      }
    }

    return true;
  },

  guid: 0,

  compile: function(program, options) {
    this.opcodes = [];
    this.children = [];
    this.depths = {list: []};
    this.options = options;

    // These changes will propagate to the other compiler components
    var knownHelpers = this.options.knownHelpers;
    this.options.knownHelpers = {
      'helperMissing': true,
      'blockHelperMissing': true,
      'each': true,
      'if': true,
      'unless': true,
      'with': true,
      'log': true
    };
    if (knownHelpers) {
      for (var name in knownHelpers) {
        this.options.knownHelpers[name] = knownHelpers[name];
      }
    }

    return this.accept(program);
  },

  accept: function(node) {
    var strip = node.strip || {},
        ret;
    if (strip.left) {
      this.opcode('strip');
    }

    ret = this[node.type](node);

    if (strip.right) {
      this.opcode('strip');
    }

    return ret;
  },

  program: function(program) {
    var statements = program.statements;

    for(var i=0, l=statements.length; i<l; i++) {
      this.accept(statements[i]);
    }
    this.isSimple = l === 1;

    this.depths.list = this.depths.list.sort(function(a, b) {
      return a - b;
    });

    return this;
  },

  compileProgram: function(program) {
    var result = new this.compiler().compile(program, this.options);
    var guid = this.guid++, depth;

    this.usePartial = this.usePartial || result.usePartial;

    this.children[guid] = result;

    for(var i=0, l=result.depths.list.length; i<l; i++) {
      depth = result.depths.list[i];

      if(depth < 2) { continue; }
      else { this.addDepth(depth - 1); }
    }

    return guid;
  },

  block: function(block) {
    var mustache = block.mustache,
        program = block.program,
        inverse = block.inverse;

    if (program) {
      program = this.compileProgram(program);
    }

    if (inverse) {
      inverse = this.compileProgram(inverse);
    }

    var type = this.classifyMustache(mustache);

    if (type === "helper") {
      this.helperMustache(mustache, program, inverse);
    } else if (type === "simple") {
      this.simpleMustache(mustache);

      // now that the simple mustache is resolved, we need to
      // evaluate it by executing `blockHelperMissing`
      this.opcode('pushProgram', program);
      this.opcode('pushProgram', inverse);
      this.opcode('emptyHash');
      this.opcode('blockValue');
    } else {
      this.ambiguousMustache(mustache, program, inverse);

      // now that the simple mustache is resolved, we need to
      // evaluate it by executing `blockHelperMissing`
      this.opcode('pushProgram', program);
      this.opcode('pushProgram', inverse);
      this.opcode('emptyHash');
      this.opcode('ambiguousBlockValue');
    }

    this.opcode('append');
  },

  hash: function(hash) {
    var pairs = hash.pairs, pair, val;

    this.opcode('pushHash');

    for(var i=0, l=pairs.length; i<l; i++) {
      pair = pairs[i];
      val  = pair[1];

      if (this.options.stringParams) {
        if(val.depth) {
          this.addDepth(val.depth);
        }
        this.opcode('getContext', val.depth || 0);
        this.opcode('pushStringParam', val.stringModeValue, val.type);
      } else {
        this.accept(val);
      }

      this.opcode('assignToHash', pair[0]);
    }
    this.opcode('popHash');
  },

  partial: function(partial) {
    var partialName = partial.partialName;
    this.usePartial = true;

    if(partial.context) {
      this.ID(partial.context);
    } else {
      this.opcode('push', 'depth0');
    }

    this.opcode('invokePartial', partialName.name);
    this.opcode('append');
  },

  content: function(content) {
    this.opcode('appendContent', content.string);
  },

  mustache: function(mustache) {
    var options = this.options;
    var type = this.classifyMustache(mustache);

    if (type === "simple") {
      this.simpleMustache(mustache);
    } else if (type === "helper") {
      this.helperMustache(mustache);
    } else {
      this.ambiguousMustache(mustache);
    }

    if(mustache.escaped && !options.noEscape) {
      this.opcode('appendEscaped');
    } else {
      this.opcode('append');
    }
  },

  ambiguousMustache: function(mustache, program, inverse) {
    var id = mustache.id,
        name = id.parts[0],
        isBlock = program != null || inverse != null;

    this.opcode('getContext', id.depth);

    this.opcode('pushProgram', program);
    this.opcode('pushProgram', inverse);

    this.opcode('invokeAmbiguous', name, isBlock);
  },

  simpleMustache: function(mustache) {
    var id = mustache.id;

    if (id.type === 'DATA') {
      this.DATA(id);
    } else if (id.parts.length) {
      this.ID(id);
    } else {
      // Simplified ID for `this`
      this.addDepth(id.depth);
      this.opcode('getContext', id.depth);
      this.opcode('pushContext');
    }

    this.opcode('resolvePossibleLambda');
  },

  helperMustache: function(mustache, program, inverse) {
    var params = this.setupFullMustacheParams(mustache, program, inverse),
        name = mustache.id.parts[0];

    if (this.options.knownHelpers[name]) {
      this.opcode('invokeKnownHelper', params.length, name);
    } else if (this.options.knownHelpersOnly) {
      throw new Error("You specified knownHelpersOnly, but used the unknown helper " + name);
    } else {
      this.opcode('invokeHelper', params.length, name);
    }
  },

  ID: function(id) {
    this.addDepth(id.depth);
    this.opcode('getContext', id.depth);

    var name = id.parts[0];
    if (!name) {
      this.opcode('pushContext');
    } else {
      this.opcode('lookupOnContext', id.parts[0]);
    }

    for(var i=1, l=id.parts.length; i<l; i++) {
      this.opcode('lookup', id.parts[i]);
    }
  },

  DATA: function(data) {
    this.options.data = true;
    if (data.id.isScoped || data.id.depth) {
      throw new Exception('Scoped data references are not supported: ' + data.original);
    }

    this.opcode('lookupData');
    var parts = data.id.parts;
    for(var i=0, l=parts.length; i<l; i++) {
      this.opcode('lookup', parts[i]);
    }
  },

  STRING: function(string) {
    this.opcode('pushString', string.string);
  },

  INTEGER: function(integer) {
    this.opcode('pushLiteral', integer.integer);
  },

  BOOLEAN: function(bool) {
    this.opcode('pushLiteral', bool.bool);
  },

  comment: function() {},

  // HELPERS
  opcode: function(name) {
    this.opcodes.push({ opcode: name, args: [].slice.call(arguments, 1) });
  },

  declare: function(name, value) {
    this.opcodes.push({ opcode: 'DECLARE', name: name, value: value });
  },

  addDepth: function(depth) {
    if(isNaN(depth)) { throw new Error("EWOT"); }
    if(depth === 0) { return; }

    if(!this.depths[depth]) {
      this.depths[depth] = true;
      this.depths.list.push(depth);
    }
  },

  classifyMustache: function(mustache) {
    var isHelper   = mustache.isHelper;
    var isEligible = mustache.eligibleHelper;
    var options    = this.options;

    // if ambiguous, we can possibly resolve the ambiguity now
    if (isEligible && !isHelper) {
      var name = mustache.id.parts[0];

      if (options.knownHelpers[name]) {
        isHelper = true;
      } else if (options.knownHelpersOnly) {
        isEligible = false;
      }
    }

    if (isHelper) { return "helper"; }
    else if (isEligible) { return "ambiguous"; }
    else { return "simple"; }
  },

  pushParams: function(params) {
    var i = params.length, param;

    while(i--) {
      param = params[i];

      if(this.options.stringParams) {
        if(param.depth) {
          this.addDepth(param.depth);
        }

        this.opcode('getContext', param.depth || 0);
        this.opcode('pushStringParam', param.stringModeValue, param.type);
      } else {
        this[param.type](param);
      }
    }
  },

  setupMustacheParams: function(mustache) {
    var params = mustache.params;
    this.pushParams(params);

    if(mustache.hash) {
      this.hash(mustache.hash);
    } else {
      this.opcode('emptyHash');
    }

    return params;
  },

  // this will replace setupMustacheParams when we're done
  setupFullMustacheParams: function(mustache, program, inverse) {
    var params = mustache.params;
    this.pushParams(params);

    this.opcode('pushProgram', program);
    this.opcode('pushProgram', inverse);

    if(mustache.hash) {
      this.hash(mustache.hash);
    } else {
      this.opcode('emptyHash');
    }

    return params;
  }
};

function precompile(input, options) {
  if (input == null || (typeof input !== 'string' && input.constructor !== AST.ProgramNode)) {
    throw new Exception("You must pass a string or Handlebars AST to Handlebars.precompile. You passed " + input);
  }

  options = options || {};
  if (!('data' in options)) {
    options.data = true;
  }

  var ast = parse(input);
  var environment = new Compiler().compile(ast, options);
  return new JavaScriptCompiler().compile(environment, options);
}

exports.precompile = precompile;function compile(input, options, env) {
  if (input == null || (typeof input !== 'string' && input.constructor !== AST.ProgramNode)) {
    throw new Exception("You must pass a string or Handlebars AST to Handlebars.compile. You passed " + input);
  }

  options = options || {};

  if (!('data' in options)) {
    options.data = true;
  }

  var compiled;

  function compileInput() {
    var ast = parse(input);
    var environment = new Compiler().compile(ast, options);
    var templateSpec = new JavaScriptCompiler().compile(environment, options, undefined, true);
    return env.template(templateSpec);
  }

  // Template is only compiled on first use and cached after that point.
  return function(context, options) {
    if (!compiled) {
      compiled = compileInput();
    }
    return compiled.call(this, context, options);
  };
}

exports.compile = compile;
},{"../exception":28,"./ast":23,"./base":24,"./javascript-compiler":26}],26:[function(require,module,exports){
"use strict";
var COMPILER_REVISION = require("../base").COMPILER_REVISION;
var REVISION_CHANGES = require("../base").REVISION_CHANGES;
var log = require("../base").log;

function Literal(value) {
  this.value = value;
}

function JavaScriptCompiler() {}

JavaScriptCompiler.prototype = {
  // PUBLIC API: You can override these methods in a subclass to provide
  // alternative compiled forms for name lookup and buffering semantics
  nameLookup: function(parent, name /* , type*/) {
    var wrap,
        ret;
    if (parent.indexOf('depth') === 0) {
      wrap = true;
    }

    if (/^[0-9]+$/.test(name)) {
      ret = parent + "[" + name + "]";
    } else if (JavaScriptCompiler.isValidJavaScriptVariableName(name)) {
      ret = parent + "." + name;
    }
    else {
      ret = parent + "['" + name + "']";
    }

    if (wrap) {
      return '(' + parent + ' && ' + ret + ')';
    } else {
      return ret;
    }
  },

  compilerInfo: function() {
    var revision = COMPILER_REVISION,
        versions = REVISION_CHANGES[revision];
    return "this.compilerInfo = ["+revision+",'"+versions+"'];\n";
  },

  appendToBuffer: function(string) {
    if (this.environment.isSimple) {
      return "return " + string + ";";
    } else {
      return {
        appendToBuffer: true,
        content: string,
        toString: function() { return "buffer += " + string + ";"; }
      };
    }
  },

  initializeBuffer: function() {
    return this.quotedString("");
  },

  namespace: "Handlebars",
  // END PUBLIC API

  compile: function(environment, options, context, asObject) {
    this.environment = environment;
    this.options = options || {};

    log('debug', this.environment.disassemble() + "\n\n");

    this.name = this.environment.name;
    this.isChild = !!context;
    this.context = context || {
      programs: [],
      environments: [],
      aliases: { }
    };

    this.preamble();

    this.stackSlot = 0;
    this.stackVars = [];
    this.registers = { list: [] };
    this.compileStack = [];
    this.inlineStack = [];

    this.compileChildren(environment, options);

    var opcodes = environment.opcodes, opcode;

    this.i = 0;

    for(var l=opcodes.length; this.i<l; this.i++) {
      opcode = opcodes[this.i];

      if(opcode.opcode === 'DECLARE') {
        this[opcode.name] = opcode.value;
      } else {
        this[opcode.opcode].apply(this, opcode.args);
      }

      // Reset the stripNext flag if it was not set by this operation.
      if (opcode.opcode !== this.stripNext) {
        this.stripNext = false;
      }
    }

    // Flush any trailing content that might be pending.
    this.pushSource('');

    return this.createFunctionContext(asObject);
  },

  preamble: function() {
    var out = [];

    if (!this.isChild) {
      var namespace = this.namespace;

      var copies = "helpers = this.merge(helpers, " + namespace + ".helpers);";
      if (this.environment.usePartial) { copies = copies + " partials = this.merge(partials, " + namespace + ".partials);"; }
      if (this.options.data) { copies = copies + " data = data || {};"; }
      out.push(copies);
    } else {
      out.push('');
    }

    if (!this.environment.isSimple) {
      out.push(", buffer = " + this.initializeBuffer());
    } else {
      out.push("");
    }

    // track the last context pushed into place to allow skipping the
    // getContext opcode when it would be a noop
    this.lastContext = 0;
    this.source = out;
  },

  createFunctionContext: function(asObject) {
    var locals = this.stackVars.concat(this.registers.list);

    if(locals.length > 0) {
      this.source[1] = this.source[1] + ", " + locals.join(", ");
    }

    // Generate minimizer alias mappings
    if (!this.isChild) {
      for (var alias in this.context.aliases) {
        if (this.context.aliases.hasOwnProperty(alias)) {
          this.source[1] = this.source[1] + ', ' + alias + '=' + this.context.aliases[alias];
        }
      }
    }

    if (this.source[1]) {
      this.source[1] = "var " + this.source[1].substring(2) + ";";
    }

    // Merge children
    if (!this.isChild) {
      this.source[1] += '\n' + this.context.programs.join('\n') + '\n';
    }

    if (!this.environment.isSimple) {
      this.pushSource("return buffer;");
    }

    var params = this.isChild ? ["depth0", "data"] : ["Handlebars", "depth0", "helpers", "partials", "data"];

    for(var i=0, l=this.environment.depths.list.length; i<l; i++) {
      params.push("depth" + this.environment.depths.list[i]);
    }

    // Perform a second pass over the output to merge content when possible
    var source = this.mergeSource();

    if (!this.isChild) {
      source = this.compilerInfo()+source;
    }

    if (asObject) {
      params.push(source);

      return Function.apply(this, params);
    } else {
      var functionSource = 'function ' + (this.name || '') + '(' + params.join(',') + ') {\n  ' + source + '}';
      log('debug', functionSource + "\n\n");
      return functionSource;
    }
  },
  mergeSource: function() {
    // WARN: We are not handling the case where buffer is still populated as the source should
    // not have buffer append operations as their final action.
    var source = '',
        buffer;
    for (var i = 0, len = this.source.length; i < len; i++) {
      var line = this.source[i];
      if (line.appendToBuffer) {
        if (buffer) {
          buffer = buffer + '\n    + ' + line.content;
        } else {
          buffer = line.content;
        }
      } else {
        if (buffer) {
          source += 'buffer += ' + buffer + ';\n  ';
          buffer = undefined;
        }
        source += line + '\n  ';
      }
    }
    return source;
  },

  // [blockValue]
  //
  // On stack, before: hash, inverse, program, value
  // On stack, after: return value of blockHelperMissing
  //
  // The purpose of this opcode is to take a block of the form
  // `{{#foo}}...{{/foo}}`, resolve the value of `foo`, and
  // replace it on the stack with the result of properly
  // invoking blockHelperMissing.
  blockValue: function() {
    this.context.aliases.blockHelperMissing = 'helpers.blockHelperMissing';

    var params = ["depth0"];
    this.setupParams(0, params);

    this.replaceStack(function(current) {
      params.splice(1, 0, current);
      return "blockHelperMissing.call(" + params.join(", ") + ")";
    });
  },

  // [ambiguousBlockValue]
  //
  // On stack, before: hash, inverse, program, value
  // Compiler value, before: lastHelper=value of last found helper, if any
  // On stack, after, if no lastHelper: same as [blockValue]
  // On stack, after, if lastHelper: value
  ambiguousBlockValue: function() {
    this.context.aliases.blockHelperMissing = 'helpers.blockHelperMissing';

    var params = ["depth0"];
    this.setupParams(0, params);

    var current = this.topStack();
    params.splice(1, 0, current);

    // Use the options value generated from the invocation
    params[params.length-1] = 'options';

    this.pushSource("if (!" + this.lastHelper + ") { " + current + " = blockHelperMissing.call(" + params.join(", ") + "); }");
  },

  // [appendContent]
  //
  // On stack, before: ...
  // On stack, after: ...
  //
  // Appends the string value of `content` to the current buffer
  appendContent: function(content) {
    if (this.pendingContent) {
      content = this.pendingContent + content;
    }
    if (this.stripNext) {
      content = content.replace(/^\s+/, '');
    }

    this.pendingContent = content;
  },

  // [strip]
  //
  // On stack, before: ...
  // On stack, after: ...
  //
  // Removes any trailing whitespace from the prior content node and flags
  // the next operation for stripping if it is a content node.
  strip: function() {
    if (this.pendingContent) {
      this.pendingContent = this.pendingContent.replace(/\s+$/, '');
    }
    this.stripNext = 'strip';
  },

  // [append]
  //
  // On stack, before: value, ...
  // On stack, after: ...
  //
  // Coerces `value` to a String and appends it to the current buffer.
  //
  // If `value` is truthy, or 0, it is coerced into a string and appended
  // Otherwise, the empty string is appended
  append: function() {
    // Force anything that is inlined onto the stack so we don't have duplication
    // when we examine local
    this.flushInline();
    var local = this.popStack();
    this.pushSource("if(" + local + " || " + local + " === 0) { " + this.appendToBuffer(local) + " }");
    if (this.environment.isSimple) {
      this.pushSource("else { " + this.appendToBuffer("''") + " }");
    }
  },

  // [appendEscaped]
  //
  // On stack, before: value, ...
  // On stack, after: ...
  //
  // Escape `value` and append it to the buffer
  appendEscaped: function() {
    this.context.aliases.escapeExpression = 'this.escapeExpression';

    this.pushSource(this.appendToBuffer("escapeExpression(" + this.popStack() + ")"));
  },

  // [getContext]
  //
  // On stack, before: ...
  // On stack, after: ...
  // Compiler value, after: lastContext=depth
  //
  // Set the value of the `lastContext` compiler value to the depth
  getContext: function(depth) {
    if(this.lastContext !== depth) {
      this.lastContext = depth;
    }
  },

  // [lookupOnContext]
  //
  // On stack, before: ...
  // On stack, after: currentContext[name], ...
  //
  // Looks up the value of `name` on the current context and pushes
  // it onto the stack.
  lookupOnContext: function(name) {
    this.push(this.nameLookup('depth' + this.lastContext, name, 'context'));
  },

  // [pushContext]
  //
  // On stack, before: ...
  // On stack, after: currentContext, ...
  //
  // Pushes the value of the current context onto the stack.
  pushContext: function() {
    this.pushStackLiteral('depth' + this.lastContext);
  },

  // [resolvePossibleLambda]
  //
  // On stack, before: value, ...
  // On stack, after: resolved value, ...
  //
  // If the `value` is a lambda, replace it on the stack by
  // the return value of the lambda
  resolvePossibleLambda: function() {
    this.context.aliases.functionType = '"function"';

    this.replaceStack(function(current) {
      return "typeof " + current + " === functionType ? " + current + ".apply(depth0) : " + current;
    });
  },

  // [lookup]
  //
  // On stack, before: value, ...
  // On stack, after: value[name], ...
  //
  // Replace the value on the stack with the result of looking
  // up `name` on `value`
  lookup: function(name) {
    this.replaceStack(function(current) {
      return current + " == null || " + current + " === false ? " + current + " : " + this.nameLookup(current, name, 'context');
    });
  },

  // [lookupData]
  //
  // On stack, before: ...
  // On stack, after: data, ...
  //
  // Push the data lookup operator
  lookupData: function() {
    this.push('data');
  },

  // [pushStringParam]
  //
  // On stack, before: ...
  // On stack, after: string, currentContext, ...
  //
  // This opcode is designed for use in string mode, which
  // provides the string value of a parameter along with its
  // depth rather than resolving it immediately.
  pushStringParam: function(string, type) {
    this.pushStackLiteral('depth' + this.lastContext);

    this.pushString(type);

    if (typeof string === 'string') {
      this.pushString(string);
    } else {
      this.pushStackLiteral(string);
    }
  },

  emptyHash: function() {
    this.pushStackLiteral('{}');

    if (this.options.stringParams) {
      this.register('hashTypes', '{}');
      this.register('hashContexts', '{}');
    }
  },
  pushHash: function() {
    this.hash = {values: [], types: [], contexts: []};
  },
  popHash: function() {
    var hash = this.hash;
    this.hash = undefined;

    if (this.options.stringParams) {
      this.register('hashContexts', '{' + hash.contexts.join(',') + '}');
      this.register('hashTypes', '{' + hash.types.join(',') + '}');
    }
    this.push('{\n    ' + hash.values.join(',\n    ') + '\n  }');
  },

  // [pushString]
  //
  // On stack, before: ...
  // On stack, after: quotedString(string), ...
  //
  // Push a quoted version of `string` onto the stack
  pushString: function(string) {
    this.pushStackLiteral(this.quotedString(string));
  },

  // [push]
  //
  // On stack, before: ...
  // On stack, after: expr, ...
  //
  // Push an expression onto the stack
  push: function(expr) {
    this.inlineStack.push(expr);
    return expr;
  },

  // [pushLiteral]
  //
  // On stack, before: ...
  // On stack, after: value, ...
  //
  // Pushes a value onto the stack. This operation prevents
  // the compiler from creating a temporary variable to hold
  // it.
  pushLiteral: function(value) {
    this.pushStackLiteral(value);
  },

  // [pushProgram]
  //
  // On stack, before: ...
  // On stack, after: program(guid), ...
  //
  // Push a program expression onto the stack. This takes
  // a compile-time guid and converts it into a runtime-accessible
  // expression.
  pushProgram: function(guid) {
    if (guid != null) {
      this.pushStackLiteral(this.programExpression(guid));
    } else {
      this.pushStackLiteral(null);
    }
  },

  // [invokeHelper]
  //
  // On stack, before: hash, inverse, program, params..., ...
  // On stack, after: result of helper invocation
  //
  // Pops off the helper's parameters, invokes the helper,
  // and pushes the helper's return value onto the stack.
  //
  // If the helper is not found, `helperMissing` is called.
  invokeHelper: function(paramSize, name) {
    this.context.aliases.helperMissing = 'helpers.helperMissing';

    var helper = this.lastHelper = this.setupHelper(paramSize, name, true);
    var nonHelper = this.nameLookup('depth' + this.lastContext, name, 'context');

    this.push(helper.name + ' || ' + nonHelper);
    this.replaceStack(function(name) {
      return name + ' ? ' + name + '.call(' +
          helper.callParams + ") " + ": helperMissing.call(" +
          helper.helperMissingParams + ")";
    });
  },

  // [invokeKnownHelper]
  //
  // On stack, before: hash, inverse, program, params..., ...
  // On stack, after: result of helper invocation
  //
  // This operation is used when the helper is known to exist,
  // so a `helperMissing` fallback is not required.
  invokeKnownHelper: function(paramSize, name) {
    var helper = this.setupHelper(paramSize, name);
    this.push(helper.name + ".call(" + helper.callParams + ")");
  },

  // [invokeAmbiguous]
  //
  // On stack, before: hash, inverse, program, params..., ...
  // On stack, after: result of disambiguation
  //
  // This operation is used when an expression like `{{foo}}`
  // is provided, but we don't know at compile-time whether it
  // is a helper or a path.
  //
  // This operation emits more code than the other options,
  // and can be avoided by passing the `knownHelpers` and
  // `knownHelpersOnly` flags at compile-time.
  invokeAmbiguous: function(name, helperCall) {
    this.context.aliases.functionType = '"function"';

    this.pushStackLiteral('{}');    // Hash value
    var helper = this.setupHelper(0, name, helperCall);

    var helperName = this.lastHelper = this.nameLookup('helpers', name, 'helper');

    var nonHelper = this.nameLookup('depth' + this.lastContext, name, 'context');
    var nextStack = this.nextStack();

    this.pushSource('if (' + nextStack + ' = ' + helperName + ') { ' + nextStack + ' = ' + nextStack + '.call(' + helper.callParams + '); }');
    this.pushSource('else { ' + nextStack + ' = ' + nonHelper + '; ' + nextStack + ' = typeof ' + nextStack + ' === functionType ? ' + nextStack + '.call(' + helper.callParams + ') : ' + nextStack + '; }');
  },

  // [invokePartial]
  //
  // On stack, before: context, ...
  // On stack after: result of partial invocation
  //
  // This operation pops off a context, invokes a partial with that context,
  // and pushes the result of the invocation back.
  invokePartial: function(name) {
    var params = [this.nameLookup('partials', name, 'partial'), "'" + name + "'", this.popStack(), "helpers", "partials"];

    if (this.options.data) {
      params.push("data");
    }

    this.context.aliases.self = "this";
    this.push("self.invokePartial(" + params.join(", ") + ")");
  },

  // [assignToHash]
  //
  // On stack, before: value, hash, ...
  // On stack, after: hash, ...
  //
  // Pops a value and hash off the stack, assigns `hash[key] = value`
  // and pushes the hash back onto the stack.
  assignToHash: function(key) {
    var value = this.popStack(),
        context,
        type;

    if (this.options.stringParams) {
      type = this.popStack();
      context = this.popStack();
    }

    var hash = this.hash;
    if (context) {
      hash.contexts.push("'" + key + "': " + context);
    }
    if (type) {
      hash.types.push("'" + key + "': " + type);
    }
    hash.values.push("'" + key + "': (" + value + ")");
  },

  // HELPERS

  compiler: JavaScriptCompiler,

  compileChildren: function(environment, options) {
    var children = environment.children, child, compiler;

    for(var i=0, l=children.length; i<l; i++) {
      child = children[i];
      compiler = new this.compiler();

      var index = this.matchExistingProgram(child);

      if (index == null) {
        this.context.programs.push('');     // Placeholder to prevent name conflicts for nested children
        index = this.context.programs.length;
        child.index = index;
        child.name = 'program' + index;
        this.context.programs[index] = compiler.compile(child, options, this.context);
        this.context.environments[index] = child;
      } else {
        child.index = index;
        child.name = 'program' + index;
      }
    }
  },
  matchExistingProgram: function(child) {
    for (var i = 0, len = this.context.environments.length; i < len; i++) {
      var environment = this.context.environments[i];
      if (environment && environment.equals(child)) {
        return i;
      }
    }
  },

  programExpression: function(guid) {
    this.context.aliases.self = "this";

    if(guid == null) {
      return "self.noop";
    }

    var child = this.environment.children[guid],
        depths = child.depths.list, depth;

    var programParams = [child.index, child.name, "data"];

    for(var i=0, l = depths.length; i<l; i++) {
      depth = depths[i];

      if(depth === 1) { programParams.push("depth0"); }
      else { programParams.push("depth" + (depth - 1)); }
    }

    return (depths.length === 0 ? "self.program(" : "self.programWithDepth(") + programParams.join(", ") + ")";
  },

  register: function(name, val) {
    this.useRegister(name);
    this.pushSource(name + " = " + val + ";");
  },

  useRegister: function(name) {
    if(!this.registers[name]) {
      this.registers[name] = true;
      this.registers.list.push(name);
    }
  },

  pushStackLiteral: function(item) {
    return this.push(new Literal(item));
  },

  pushSource: function(source) {
    if (this.pendingContent) {
      this.source.push(this.appendToBuffer(this.quotedString(this.pendingContent)));
      this.pendingContent = undefined;
    }

    if (source) {
      this.source.push(source);
    }
  },

  pushStack: function(item) {
    this.flushInline();

    var stack = this.incrStack();
    if (item) {
      this.pushSource(stack + " = " + item + ";");
    }
    this.compileStack.push(stack);
    return stack;
  },

  replaceStack: function(callback) {
    var prefix = '',
        inline = this.isInline(),
        stack;

    // If we are currently inline then we want to merge the inline statement into the
    // replacement statement via ','
    if (inline) {
      var top = this.popStack(true);

      if (top instanceof Literal) {
        // Literals do not need to be inlined
        stack = top.value;
      } else {
        // Get or create the current stack name for use by the inline
        var name = this.stackSlot ? this.topStackName() : this.incrStack();

        prefix = '(' + this.push(name) + ' = ' + top + '),';
        stack = this.topStack();
      }
    } else {
      stack = this.topStack();
    }

    var item = callback.call(this, stack);

    if (inline) {
      if (this.inlineStack.length || this.compileStack.length) {
        this.popStack();
      }
      this.push('(' + prefix + item + ')');
    } else {
      // Prevent modification of the context depth variable. Through replaceStack
      if (!/^stack/.test(stack)) {
        stack = this.nextStack();
      }

      this.pushSource(stack + " = (" + prefix + item + ");");
    }
    return stack;
  },

  nextStack: function() {
    return this.pushStack();
  },

  incrStack: function() {
    this.stackSlot++;
    if(this.stackSlot > this.stackVars.length) { this.stackVars.push("stack" + this.stackSlot); }
    return this.topStackName();
  },
  topStackName: function() {
    return "stack" + this.stackSlot;
  },
  flushInline: function() {
    var inlineStack = this.inlineStack;
    if (inlineStack.length) {
      this.inlineStack = [];
      for (var i = 0, len = inlineStack.length; i < len; i++) {
        var entry = inlineStack[i];
        if (entry instanceof Literal) {
          this.compileStack.push(entry);
        } else {
          this.pushStack(entry);
        }
      }
    }
  },
  isInline: function() {
    return this.inlineStack.length;
  },

  popStack: function(wrapped) {
    var inline = this.isInline(),
        item = (inline ? this.inlineStack : this.compileStack).pop();

    if (!wrapped && (item instanceof Literal)) {
      return item.value;
    } else {
      if (!inline) {
        this.stackSlot--;
      }
      return item;
    }
  },

  topStack: function(wrapped) {
    var stack = (this.isInline() ? this.inlineStack : this.compileStack),
        item = stack[stack.length - 1];

    if (!wrapped && (item instanceof Literal)) {
      return item.value;
    } else {
      return item;
    }
  },

  quotedString: function(str) {
    return '"' + str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\u2028/g, '\\u2028')   // Per Ecma-262 7.3 + 7.8.4
      .replace(/\u2029/g, '\\u2029') + '"';
  },

  setupHelper: function(paramSize, name, missingParams) {
    var params = [];
    this.setupParams(paramSize, params, missingParams);
    var foundHelper = this.nameLookup('helpers', name, 'helper');

    return {
      params: params,
      name: foundHelper,
      callParams: ["depth0"].concat(params).join(", "),
      helperMissingParams: missingParams && ["depth0", this.quotedString(name)].concat(params).join(", ")
    };
  },

  // the params and contexts arguments are passed in arrays
  // to fill in
  setupParams: function(paramSize, params, useRegister) {
    var options = [], contexts = [], types = [], param, inverse, program;

    options.push("hash:" + this.popStack());

    inverse = this.popStack();
    program = this.popStack();

    // Avoid setting fn and inverse if neither are set. This allows
    // helpers to do a check for `if (options.fn)`
    if (program || inverse) {
      if (!program) {
        this.context.aliases.self = "this";
        program = "self.noop";
      }

      if (!inverse) {
       this.context.aliases.self = "this";
        inverse = "self.noop";
      }

      options.push("inverse:" + inverse);
      options.push("fn:" + program);
    }

    for(var i=0; i<paramSize; i++) {
      param = this.popStack();
      params.push(param);

      if(this.options.stringParams) {
        types.push(this.popStack());
        contexts.push(this.popStack());
      }
    }

    if (this.options.stringParams) {
      options.push("contexts:[" + contexts.join(",") + "]");
      options.push("types:[" + types.join(",") + "]");
      options.push("hashContexts:hashContexts");
      options.push("hashTypes:hashTypes");
    }

    if(this.options.data) {
      options.push("data:data");
    }

    options = "{" + options.join(",") + "}";
    if (useRegister) {
      this.register('options', options);
      params.push('options');
    } else {
      params.push(options);
    }
    return params.join(", ");
  }
};

var reservedWords = (
  "break else new var" +
  " case finally return void" +
  " catch for switch while" +
  " continue function this with" +
  " default if throw" +
  " delete in try" +
  " do instanceof typeof" +
  " abstract enum int short" +
  " boolean export interface static" +
  " byte extends long super" +
  " char final native synchronized" +
  " class float package throws" +
  " const goto private transient" +
  " debugger implements protected volatile" +
  " double import public let yield"
).split(" ");

var compilerWords = JavaScriptCompiler.RESERVED_WORDS = {};

for(var i=0, l=reservedWords.length; i<l; i++) {
  compilerWords[reservedWords[i]] = true;
}

JavaScriptCompiler.isValidJavaScriptVariableName = function(name) {
  if(!JavaScriptCompiler.RESERVED_WORDS[name] && /^[a-zA-Z_$][0-9a-zA-Z_$]+$/.test(name)) {
    return true;
  }
  return false;
};

exports["default"] = JavaScriptCompiler;
},{"../base":22}],27:[function(require,module,exports){
"use strict";
/* jshint ignore:start */
/* Jison generated parser */
var handlebars = (function(){
var parser = {trace: function trace() { },
yy: {},
symbols_: {"error":2,"root":3,"statements":4,"EOF":5,"program":6,"simpleInverse":7,"statement":8,"openInverse":9,"closeBlock":10,"openBlock":11,"mustache":12,"partial":13,"CONTENT":14,"COMMENT":15,"OPEN_BLOCK":16,"inMustache":17,"CLOSE":18,"OPEN_INVERSE":19,"OPEN_ENDBLOCK":20,"path":21,"OPEN":22,"OPEN_UNESCAPED":23,"CLOSE_UNESCAPED":24,"OPEN_PARTIAL":25,"partialName":26,"partial_option0":27,"inMustache_repetition0":28,"inMustache_option0":29,"dataName":30,"param":31,"STRING":32,"INTEGER":33,"BOOLEAN":34,"hash":35,"hash_repetition_plus0":36,"hashSegment":37,"ID":38,"EQUALS":39,"DATA":40,"pathSegments":41,"SEP":42,"$accept":0,"$end":1},
terminals_: {2:"error",5:"EOF",14:"CONTENT",15:"COMMENT",16:"OPEN_BLOCK",18:"CLOSE",19:"OPEN_INVERSE",20:"OPEN_ENDBLOCK",22:"OPEN",23:"OPEN_UNESCAPED",24:"CLOSE_UNESCAPED",25:"OPEN_PARTIAL",32:"STRING",33:"INTEGER",34:"BOOLEAN",38:"ID",39:"EQUALS",40:"DATA",42:"SEP"},
productions_: [0,[3,2],[3,1],[6,2],[6,3],[6,2],[6,1],[6,1],[6,0],[4,1],[4,2],[8,3],[8,3],[8,1],[8,1],[8,1],[8,1],[11,3],[9,3],[10,3],[12,3],[12,3],[13,4],[7,2],[17,3],[17,1],[31,1],[31,1],[31,1],[31,1],[31,1],[35,1],[37,3],[26,1],[26,1],[26,1],[30,2],[21,1],[41,3],[41,1],[27,0],[27,1],[28,0],[28,2],[29,0],[29,1],[36,1],[36,2]],
performAction: function anonymous(yytext,yyleng,yylineno,yy,yystate,$$,_$) {

var $0 = $$.length - 1;
switch (yystate) {
case 1: return new yy.ProgramNode($$[$0-1]); 
break;
case 2: return new yy.ProgramNode([]); 
break;
case 3:this.$ = new yy.ProgramNode([], $$[$0-1], $$[$0]);
break;
case 4:this.$ = new yy.ProgramNode($$[$0-2], $$[$0-1], $$[$0]);
break;
case 5:this.$ = new yy.ProgramNode($$[$0-1], $$[$0], []);
break;
case 6:this.$ = new yy.ProgramNode($$[$0]);
break;
case 7:this.$ = new yy.ProgramNode([]);
break;
case 8:this.$ = new yy.ProgramNode([]);
break;
case 9:this.$ = [$$[$0]];
break;
case 10: $$[$0-1].push($$[$0]); this.$ = $$[$0-1]; 
break;
case 11:this.$ = new yy.BlockNode($$[$0-2], $$[$0-1].inverse, $$[$0-1], $$[$0]);
break;
case 12:this.$ = new yy.BlockNode($$[$0-2], $$[$0-1], $$[$0-1].inverse, $$[$0]);
break;
case 13:this.$ = $$[$0];
break;
case 14:this.$ = $$[$0];
break;
case 15:this.$ = new yy.ContentNode($$[$0]);
break;
case 16:this.$ = new yy.CommentNode($$[$0]);
break;
case 17:this.$ = new yy.MustacheNode($$[$0-1][0], $$[$0-1][1], $$[$0-2], stripFlags($$[$0-2], $$[$0]));
break;
case 18:this.$ = new yy.MustacheNode($$[$0-1][0], $$[$0-1][1], $$[$0-2], stripFlags($$[$0-2], $$[$0]));
break;
case 19:this.$ = {path: $$[$0-1], strip: stripFlags($$[$0-2], $$[$0])};
break;
case 20:this.$ = new yy.MustacheNode($$[$0-1][0], $$[$0-1][1], $$[$0-2], stripFlags($$[$0-2], $$[$0]));
break;
case 21:this.$ = new yy.MustacheNode($$[$0-1][0], $$[$0-1][1], $$[$0-2], stripFlags($$[$0-2], $$[$0]));
break;
case 22:this.$ = new yy.PartialNode($$[$0-2], $$[$0-1], stripFlags($$[$0-3], $$[$0]));
break;
case 23:this.$ = stripFlags($$[$0-1], $$[$0]);
break;
case 24:this.$ = [[$$[$0-2]].concat($$[$0-1]), $$[$0]];
break;
case 25:this.$ = [[$$[$0]], null];
break;
case 26:this.$ = $$[$0];
break;
case 27:this.$ = new yy.StringNode($$[$0]);
break;
case 28:this.$ = new yy.IntegerNode($$[$0]);
break;
case 29:this.$ = new yy.BooleanNode($$[$0]);
break;
case 30:this.$ = $$[$0];
break;
case 31:this.$ = new yy.HashNode($$[$0]);
break;
case 32:this.$ = [$$[$0-2], $$[$0]];
break;
case 33:this.$ = new yy.PartialNameNode($$[$0]);
break;
case 34:this.$ = new yy.PartialNameNode(new yy.StringNode($$[$0]));
break;
case 35:this.$ = new yy.PartialNameNode(new yy.IntegerNode($$[$0]));
break;
case 36:this.$ = new yy.DataNode($$[$0]);
break;
case 37:this.$ = new yy.IdNode($$[$0]);
break;
case 38: $$[$0-2].push({part: $$[$0], separator: $$[$0-1]}); this.$ = $$[$0-2]; 
break;
case 39:this.$ = [{part: $$[$0]}];
break;
case 42:this.$ = [];
break;
case 43:$$[$0-1].push($$[$0]);
break;
case 46:this.$ = [$$[$0]];
break;
case 47:$$[$0-1].push($$[$0]);
break;
}
},
table: [{3:1,4:2,5:[1,3],8:4,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,11],22:[1,13],23:[1,14],25:[1,15]},{1:[3]},{5:[1,16],8:17,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,11],22:[1,13],23:[1,14],25:[1,15]},{1:[2,2]},{5:[2,9],14:[2,9],15:[2,9],16:[2,9],19:[2,9],20:[2,9],22:[2,9],23:[2,9],25:[2,9]},{4:20,6:18,7:19,8:4,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,21],20:[2,8],22:[1,13],23:[1,14],25:[1,15]},{4:20,6:22,7:19,8:4,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,21],20:[2,8],22:[1,13],23:[1,14],25:[1,15]},{5:[2,13],14:[2,13],15:[2,13],16:[2,13],19:[2,13],20:[2,13],22:[2,13],23:[2,13],25:[2,13]},{5:[2,14],14:[2,14],15:[2,14],16:[2,14],19:[2,14],20:[2,14],22:[2,14],23:[2,14],25:[2,14]},{5:[2,15],14:[2,15],15:[2,15],16:[2,15],19:[2,15],20:[2,15],22:[2,15],23:[2,15],25:[2,15]},{5:[2,16],14:[2,16],15:[2,16],16:[2,16],19:[2,16],20:[2,16],22:[2,16],23:[2,16],25:[2,16]},{17:23,21:24,30:25,38:[1,28],40:[1,27],41:26},{17:29,21:24,30:25,38:[1,28],40:[1,27],41:26},{17:30,21:24,30:25,38:[1,28],40:[1,27],41:26},{17:31,21:24,30:25,38:[1,28],40:[1,27],41:26},{21:33,26:32,32:[1,34],33:[1,35],38:[1,28],41:26},{1:[2,1]},{5:[2,10],14:[2,10],15:[2,10],16:[2,10],19:[2,10],20:[2,10],22:[2,10],23:[2,10],25:[2,10]},{10:36,20:[1,37]},{4:38,8:4,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,11],20:[2,7],22:[1,13],23:[1,14],25:[1,15]},{7:39,8:17,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,21],20:[2,6],22:[1,13],23:[1,14],25:[1,15]},{17:23,18:[1,40],21:24,30:25,38:[1,28],40:[1,27],41:26},{10:41,20:[1,37]},{18:[1,42]},{18:[2,42],24:[2,42],28:43,32:[2,42],33:[2,42],34:[2,42],38:[2,42],40:[2,42]},{18:[2,25],24:[2,25]},{18:[2,37],24:[2,37],32:[2,37],33:[2,37],34:[2,37],38:[2,37],40:[2,37],42:[1,44]},{21:45,38:[1,28],41:26},{18:[2,39],24:[2,39],32:[2,39],33:[2,39],34:[2,39],38:[2,39],40:[2,39],42:[2,39]},{18:[1,46]},{18:[1,47]},{24:[1,48]},{18:[2,40],21:50,27:49,38:[1,28],41:26},{18:[2,33],38:[2,33]},{18:[2,34],38:[2,34]},{18:[2,35],38:[2,35]},{5:[2,11],14:[2,11],15:[2,11],16:[2,11],19:[2,11],20:[2,11],22:[2,11],23:[2,11],25:[2,11]},{21:51,38:[1,28],41:26},{8:17,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,11],20:[2,3],22:[1,13],23:[1,14],25:[1,15]},{4:52,8:4,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,11],20:[2,5],22:[1,13],23:[1,14],25:[1,15]},{14:[2,23],15:[2,23],16:[2,23],19:[2,23],20:[2,23],22:[2,23],23:[2,23],25:[2,23]},{5:[2,12],14:[2,12],15:[2,12],16:[2,12],19:[2,12],20:[2,12],22:[2,12],23:[2,12],25:[2,12]},{14:[2,18],15:[2,18],16:[2,18],19:[2,18],20:[2,18],22:[2,18],23:[2,18],25:[2,18]},{18:[2,44],21:56,24:[2,44],29:53,30:60,31:54,32:[1,57],33:[1,58],34:[1,59],35:55,36:61,37:62,38:[1,63],40:[1,27],41:26},{38:[1,64]},{18:[2,36],24:[2,36],32:[2,36],33:[2,36],34:[2,36],38:[2,36],40:[2,36]},{14:[2,17],15:[2,17],16:[2,17],19:[2,17],20:[2,17],22:[2,17],23:[2,17],25:[2,17]},{5:[2,20],14:[2,20],15:[2,20],16:[2,20],19:[2,20],20:[2,20],22:[2,20],23:[2,20],25:[2,20]},{5:[2,21],14:[2,21],15:[2,21],16:[2,21],19:[2,21],20:[2,21],22:[2,21],23:[2,21],25:[2,21]},{18:[1,65]},{18:[2,41]},{18:[1,66]},{8:17,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,11],20:[2,4],22:[1,13],23:[1,14],25:[1,15]},{18:[2,24],24:[2,24]},{18:[2,43],24:[2,43],32:[2,43],33:[2,43],34:[2,43],38:[2,43],40:[2,43]},{18:[2,45],24:[2,45]},{18:[2,26],24:[2,26],32:[2,26],33:[2,26],34:[2,26],38:[2,26],40:[2,26]},{18:[2,27],24:[2,27],32:[2,27],33:[2,27],34:[2,27],38:[2,27],40:[2,27]},{18:[2,28],24:[2,28],32:[2,28],33:[2,28],34:[2,28],38:[2,28],40:[2,28]},{18:[2,29],24:[2,29],32:[2,29],33:[2,29],34:[2,29],38:[2,29],40:[2,29]},{18:[2,30],24:[2,30],32:[2,30],33:[2,30],34:[2,30],38:[2,30],40:[2,30]},{18:[2,31],24:[2,31],37:67,38:[1,68]},{18:[2,46],24:[2,46],38:[2,46]},{18:[2,39],24:[2,39],32:[2,39],33:[2,39],34:[2,39],38:[2,39],39:[1,69],40:[2,39],42:[2,39]},{18:[2,38],24:[2,38],32:[2,38],33:[2,38],34:[2,38],38:[2,38],40:[2,38],42:[2,38]},{5:[2,22],14:[2,22],15:[2,22],16:[2,22],19:[2,22],20:[2,22],22:[2,22],23:[2,22],25:[2,22]},{5:[2,19],14:[2,19],15:[2,19],16:[2,19],19:[2,19],20:[2,19],22:[2,19],23:[2,19],25:[2,19]},{18:[2,47],24:[2,47],38:[2,47]},{39:[1,69]},{21:56,30:60,31:70,32:[1,57],33:[1,58],34:[1,59],38:[1,28],40:[1,27],41:26},{18:[2,32],24:[2,32],38:[2,32]}],
defaultActions: {3:[2,2],16:[2,1],50:[2,41]},
parseError: function parseError(str, hash) {
    throw new Error(str);
},
parse: function parse(input) {
    var self = this, stack = [0], vstack = [null], lstack = [], table = this.table, yytext = "", yylineno = 0, yyleng = 0, recovering = 0, TERROR = 2, EOF = 1;
    this.lexer.setInput(input);
    this.lexer.yy = this.yy;
    this.yy.lexer = this.lexer;
    this.yy.parser = this;
    if (typeof this.lexer.yylloc == "undefined")
        this.lexer.yylloc = {};
    var yyloc = this.lexer.yylloc;
    lstack.push(yyloc);
    var ranges = this.lexer.options && this.lexer.options.ranges;
    if (typeof this.yy.parseError === "function")
        this.parseError = this.yy.parseError;
    function popStack(n) {
        stack.length = stack.length - 2 * n;
        vstack.length = vstack.length - n;
        lstack.length = lstack.length - n;
    }
    function lex() {
        var token;
        token = self.lexer.lex() || 1;
        if (typeof token !== "number") {
            token = self.symbols_[token] || token;
        }
        return token;
    }
    var symbol, preErrorSymbol, state, action, a, r, yyval = {}, p, len, newState, expected;
    while (true) {
        state = stack[stack.length - 1];
        if (this.defaultActions[state]) {
            action = this.defaultActions[state];
        } else {
            if (symbol === null || typeof symbol == "undefined") {
                symbol = lex();
            }
            action = table[state] && table[state][symbol];
        }
        if (typeof action === "undefined" || !action.length || !action[0]) {
            var errStr = "";
            if (!recovering) {
                expected = [];
                for (p in table[state])
                    if (this.terminals_[p] && p > 2) {
                        expected.push("'" + this.terminals_[p] + "'");
                    }
                if (this.lexer.showPosition) {
                    errStr = "Parse error on line " + (yylineno + 1) + ":\n" + this.lexer.showPosition() + "\nExpecting " + expected.join(", ") + ", got '" + (this.terminals_[symbol] || symbol) + "'";
                } else {
                    errStr = "Parse error on line " + (yylineno + 1) + ": Unexpected " + (symbol == 1?"end of input":"'" + (this.terminals_[symbol] || symbol) + "'");
                }
                this.parseError(errStr, {text: this.lexer.match, token: this.terminals_[symbol] || symbol, line: this.lexer.yylineno, loc: yyloc, expected: expected});
            }
        }
        if (action[0] instanceof Array && action.length > 1) {
            throw new Error("Parse Error: multiple actions possible at state: " + state + ", token: " + symbol);
        }
        switch (action[0]) {
        case 1:
            stack.push(symbol);
            vstack.push(this.lexer.yytext);
            lstack.push(this.lexer.yylloc);
            stack.push(action[1]);
            symbol = null;
            if (!preErrorSymbol) {
                yyleng = this.lexer.yyleng;
                yytext = this.lexer.yytext;
                yylineno = this.lexer.yylineno;
                yyloc = this.lexer.yylloc;
                if (recovering > 0)
                    recovering--;
            } else {
                symbol = preErrorSymbol;
                preErrorSymbol = null;
            }
            break;
        case 2:
            len = this.productions_[action[1]][1];
            yyval.$ = vstack[vstack.length - len];
            yyval._$ = {first_line: lstack[lstack.length - (len || 1)].first_line, last_line: lstack[lstack.length - 1].last_line, first_column: lstack[lstack.length - (len || 1)].first_column, last_column: lstack[lstack.length - 1].last_column};
            if (ranges) {
                yyval._$.range = [lstack[lstack.length - (len || 1)].range[0], lstack[lstack.length - 1].range[1]];
            }
            r = this.performAction.call(yyval, yytext, yyleng, yylineno, this.yy, action[1], vstack, lstack);
            if (typeof r !== "undefined") {
                return r;
            }
            if (len) {
                stack = stack.slice(0, -1 * len * 2);
                vstack = vstack.slice(0, -1 * len);
                lstack = lstack.slice(0, -1 * len);
            }
            stack.push(this.productions_[action[1]][0]);
            vstack.push(yyval.$);
            lstack.push(yyval._$);
            newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
            stack.push(newState);
            break;
        case 3:
            return true;
        }
    }
    return true;
}
};


function stripFlags(open, close) {
  return {
    left: open.charAt(2) === '~',
    right: close.charAt(0) === '~' || close.charAt(1) === '~'
  };
}

/* Jison generated lexer */
var lexer = (function(){
var lexer = ({EOF:1,
parseError:function parseError(str, hash) {
        if (this.yy.parser) {
            this.yy.parser.parseError(str, hash);
        } else {
            throw new Error(str);
        }
    },
setInput:function (input) {
        this._input = input;
        this._more = this._less = this.done = false;
        this.yylineno = this.yyleng = 0;
        this.yytext = this.matched = this.match = '';
        this.conditionStack = ['INITIAL'];
        this.yylloc = {first_line:1,first_column:0,last_line:1,last_column:0};
        if (this.options.ranges) this.yylloc.range = [0,0];
        this.offset = 0;
        return this;
    },
input:function () {
        var ch = this._input[0];
        this.yytext += ch;
        this.yyleng++;
        this.offset++;
        this.match += ch;
        this.matched += ch;
        var lines = ch.match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno++;
            this.yylloc.last_line++;
        } else {
            this.yylloc.last_column++;
        }
        if (this.options.ranges) this.yylloc.range[1]++;

        this._input = this._input.slice(1);
        return ch;
    },
unput:function (ch) {
        var len = ch.length;
        var lines = ch.split(/(?:\r\n?|\n)/g);

        this._input = ch + this._input;
        this.yytext = this.yytext.substr(0, this.yytext.length-len-1);
        //this.yyleng -= len;
        this.offset -= len;
        var oldLines = this.match.split(/(?:\r\n?|\n)/g);
        this.match = this.match.substr(0, this.match.length-1);
        this.matched = this.matched.substr(0, this.matched.length-1);

        if (lines.length-1) this.yylineno -= lines.length-1;
        var r = this.yylloc.range;

        this.yylloc = {first_line: this.yylloc.first_line,
          last_line: this.yylineno+1,
          first_column: this.yylloc.first_column,
          last_column: lines ?
              (lines.length === oldLines.length ? this.yylloc.first_column : 0) + oldLines[oldLines.length - lines.length].length - lines[0].length:
              this.yylloc.first_column - len
          };

        if (this.options.ranges) {
            this.yylloc.range = [r[0], r[0] + this.yyleng - len];
        }
        return this;
    },
more:function () {
        this._more = true;
        return this;
    },
less:function (n) {
        this.unput(this.match.slice(n));
    },
pastInput:function () {
        var past = this.matched.substr(0, this.matched.length - this.match.length);
        return (past.length > 20 ? '...':'') + past.substr(-20).replace(/\n/g, "");
    },
upcomingInput:function () {
        var next = this.match;
        if (next.length < 20) {
            next += this._input.substr(0, 20-next.length);
        }
        return (next.substr(0,20)+(next.length > 20 ? '...':'')).replace(/\n/g, "");
    },
showPosition:function () {
        var pre = this.pastInput();
        var c = new Array(pre.length + 1).join("-");
        return pre + this.upcomingInput() + "\n" + c+"^";
    },
next:function () {
        if (this.done) {
            return this.EOF;
        }
        if (!this._input) this.done = true;

        var token,
            match,
            tempMatch,
            index,
            col,
            lines;
        if (!this._more) {
            this.yytext = '';
            this.match = '';
        }
        var rules = this._currentRules();
        for (var i=0;i < rules.length; i++) {
            tempMatch = this._input.match(this.rules[rules[i]]);
            if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                match = tempMatch;
                index = i;
                if (!this.options.flex) break;
            }
        }
        if (match) {
            lines = match[0].match(/(?:\r\n?|\n).*/g);
            if (lines) this.yylineno += lines.length;
            this.yylloc = {first_line: this.yylloc.last_line,
                           last_line: this.yylineno+1,
                           first_column: this.yylloc.last_column,
                           last_column: lines ? lines[lines.length-1].length-lines[lines.length-1].match(/\r?\n?/)[0].length : this.yylloc.last_column + match[0].length};
            this.yytext += match[0];
            this.match += match[0];
            this.matches = match;
            this.yyleng = this.yytext.length;
            if (this.options.ranges) {
                this.yylloc.range = [this.offset, this.offset += this.yyleng];
            }
            this._more = false;
            this._input = this._input.slice(match[0].length);
            this.matched += match[0];
            token = this.performAction.call(this, this.yy, this, rules[index],this.conditionStack[this.conditionStack.length-1]);
            if (this.done && this._input) this.done = false;
            if (token) return token;
            else return;
        }
        if (this._input === "") {
            return this.EOF;
        } else {
            return this.parseError('Lexical error on line '+(this.yylineno+1)+'. Unrecognized text.\n'+this.showPosition(),
                    {text: "", token: null, line: this.yylineno});
        }
    },
lex:function lex() {
        var r = this.next();
        if (typeof r !== 'undefined') {
            return r;
        } else {
            return this.lex();
        }
    },
begin:function begin(condition) {
        this.conditionStack.push(condition);
    },
popState:function popState() {
        return this.conditionStack.pop();
    },
_currentRules:function _currentRules() {
        return this.conditions[this.conditionStack[this.conditionStack.length-1]].rules;
    },
topState:function () {
        return this.conditionStack[this.conditionStack.length-2];
    },
pushState:function begin(condition) {
        this.begin(condition);
    }});
lexer.options = {};
lexer.performAction = function anonymous(yy,yy_,$avoiding_name_collisions,YY_START) {


function strip(start, end) {
  return yy_.yytext = yy_.yytext.substr(start, yy_.yyleng-end);
}


var YYSTATE=YY_START
switch($avoiding_name_collisions) {
case 0:
                                   if(yy_.yytext.slice(-2) === "\\\\") {
                                     strip(0,1);
                                     this.begin("mu");
                                   } else if(yy_.yytext.slice(-1) === "\\") {
                                     strip(0,1);
                                     this.begin("emu");
                                   } else {
                                     this.begin("mu");
                                   }
                                   if(yy_.yytext) return 14;
                                 
break;
case 1:return 14;
break;
case 2:
                                   this.popState();
                                   return 14;
                                 
break;
case 3:strip(0,4); this.popState(); return 15;
break;
case 4:return 25;
break;
case 5:return 16;
break;
case 6:return 20;
break;
case 7:return 19;
break;
case 8:return 19;
break;
case 9:return 23;
break;
case 10:return 22;
break;
case 11:this.popState(); this.begin('com');
break;
case 12:strip(3,5); this.popState(); return 15;
break;
case 13:return 22;
break;
case 14:return 39;
break;
case 15:return 38;
break;
case 16:return 38;
break;
case 17:return 42;
break;
case 18:// ignore whitespace
break;
case 19:this.popState(); return 24;
break;
case 20:this.popState(); return 18;
break;
case 21:yy_.yytext = strip(1,2).replace(/\\"/g,'"'); return 32;
break;
case 22:yy_.yytext = strip(1,2).replace(/\\'/g,"'"); return 32;
break;
case 23:return 40;
break;
case 24:return 34;
break;
case 25:return 34;
break;
case 26:return 33;
break;
case 27:return 38;
break;
case 28:yy_.yytext = strip(1,2); return 38;
break;
case 29:return 'INVALID';
break;
case 30:return 5;
break;
}
};
lexer.rules = [/^(?:[^\x00]*?(?=(\{\{)))/,/^(?:[^\x00]+)/,/^(?:[^\x00]{2,}?(?=(\{\{|\\\{\{|\\\\\{\{|$)))/,/^(?:[\s\S]*?--\}\})/,/^(?:\{\{(~)?>)/,/^(?:\{\{(~)?#)/,/^(?:\{\{(~)?\/)/,/^(?:\{\{(~)?\^)/,/^(?:\{\{(~)?\s*else\b)/,/^(?:\{\{(~)?\{)/,/^(?:\{\{(~)?&)/,/^(?:\{\{!--)/,/^(?:\{\{![\s\S]*?\}\})/,/^(?:\{\{(~)?)/,/^(?:=)/,/^(?:\.\.)/,/^(?:\.(?=([=~}\s\/.])))/,/^(?:[\/.])/,/^(?:\s+)/,/^(?:\}(~)?\}\})/,/^(?:(~)?\}\})/,/^(?:"(\\["]|[^"])*")/,/^(?:'(\\[']|[^'])*')/,/^(?:@)/,/^(?:true(?=([~}\s])))/,/^(?:false(?=([~}\s])))/,/^(?:-?[0-9]+(?=([~}\s])))/,/^(?:([^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=([=~}\s\/.]))))/,/^(?:\[[^\]]*\])/,/^(?:.)/,/^(?:$)/];
lexer.conditions = {"mu":{"rules":[4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30],"inclusive":false},"emu":{"rules":[2],"inclusive":false},"com":{"rules":[3],"inclusive":false},"INITIAL":{"rules":[0,1,30],"inclusive":true}};
return lexer;})()
parser.lexer = lexer;
function Parser () { this.yy = {}; }Parser.prototype = parser;parser.Parser = Parser;
return new Parser;
})();exports["default"] = handlebars;
/* jshint ignore:end */
},{}],28:[function(require,module,exports){
"use strict";

var errorProps = ['description', 'fileName', 'lineNumber', 'message', 'name', 'number', 'stack'];

function Exception(/* message */) {
  var tmp = Error.prototype.constructor.apply(this, arguments);

  // Unfortunately errors are not enumerable in Chrome (at least), so `for prop in tmp` doesn't work.
  for (var idx = 0; idx < errorProps.length; idx++) {
    this[errorProps[idx]] = tmp[errorProps[idx]];
  }
}

Exception.prototype = new Error();

exports["default"] = Exception;
},{}],29:[function(require,module,exports){
"use strict";
var Utils = require("./utils");
var Exception = require("./exception")["default"];
var COMPILER_REVISION = require("./base").COMPILER_REVISION;
var REVISION_CHANGES = require("./base").REVISION_CHANGES;

function checkRevision(compilerInfo) {
  var compilerRevision = compilerInfo && compilerInfo[0] || 1,
      currentRevision = COMPILER_REVISION;

  if (compilerRevision !== currentRevision) {
    if (compilerRevision < currentRevision) {
      var runtimeVersions = REVISION_CHANGES[currentRevision],
          compilerVersions = REVISION_CHANGES[compilerRevision];
      throw new Error("Template was precompiled with an older version of Handlebars than the current runtime. "+
            "Please update your precompiler to a newer version ("+runtimeVersions+") or downgrade your runtime to an older version ("+compilerVersions+").");
    } else {
      // Use the embedded version info since the runtime doesn't know about this revision yet
      throw new Error("Template was precompiled with a newer version of Handlebars than the current runtime. "+
            "Please update your runtime to a newer version ("+compilerInfo[1]+").");
    }
  }
}

exports.checkRevision = checkRevision;// TODO: Remove this line and break up compilePartial

function template(templateSpec, env) {
  if (!env) {
    throw new Error("No environment passed to template");
  }

  // Note: Using env.VM references rather than local var references throughout this section to allow
  // for external users to override these as psuedo-supported APIs.
  var invokePartialWrapper = function(partial, name, context, helpers, partials, data) {
    var result = env.VM.invokePartial.apply(this, arguments);
    if (result != null) { return result; }

    if (env.compile) {
      var options = { helpers: helpers, partials: partials, data: data };
      partials[name] = env.compile(partial, { data: data !== undefined }, env);
      return partials[name](context, options);
    } else {
      throw new Exception("The partial " + name + " could not be compiled when running in runtime-only mode");
    }
  };

  // Just add water
  var container = {
    escapeExpression: Utils.escapeExpression,
    invokePartial: invokePartialWrapper,
    programs: [],
    program: function(i, fn, data) {
      var programWrapper = this.programs[i];
      if(data) {
        programWrapper = program(i, fn, data);
      } else if (!programWrapper) {
        programWrapper = this.programs[i] = program(i, fn);
      }
      return programWrapper;
    },
    merge: function(param, common) {
      var ret = param || common;

      if (param && common && (param !== common)) {
        ret = {};
        Utils.extend(ret, common);
        Utils.extend(ret, param);
      }
      return ret;
    },
    programWithDepth: env.VM.programWithDepth,
    noop: env.VM.noop,
    compilerInfo: null
  };

  return function(context, options) {
    options = options || {};
    var namespace = options.partial ? options : env,
        helpers,
        partials;

    if (!options.partial) {
      helpers = options.helpers;
      partials = options.partials;
    }
    var result = templateSpec.call(
          container,
          namespace, context,
          helpers,
          partials,
          options.data);

    if (!options.partial) {
      env.VM.checkRevision(container.compilerInfo);
    }

    return result;
  };
}

exports.template = template;function programWithDepth(i, fn, data /*, $depth */) {
  var args = Array.prototype.slice.call(arguments, 3);

  var prog = function(context, options) {
    options = options || {};

    return fn.apply(this, [context, options.data || data].concat(args));
  };
  prog.program = i;
  prog.depth = args.length;
  return prog;
}

exports.programWithDepth = programWithDepth;function program(i, fn, data) {
  var prog = function(context, options) {
    options = options || {};

    return fn(context, options.data || data);
  };
  prog.program = i;
  prog.depth = 0;
  return prog;
}

exports.program = program;function invokePartial(partial, name, context, helpers, partials, data) {
  var options = { partial: true, helpers: helpers, partials: partials, data: data };

  if(partial === undefined) {
    throw new Exception("The partial " + name + " could not be found");
  } else if(partial instanceof Function) {
    return partial(context, options);
  }
}

exports.invokePartial = invokePartial;function noop() { return ""; }

exports.noop = noop;
},{"./base":22,"./exception":28,"./utils":31}],30:[function(require,module,exports){
"use strict";
// Build out our basic SafeString type
function SafeString(string) {
  this.string = string;
}

SafeString.prototype.toString = function() {
  return "" + this.string;
};

exports["default"] = SafeString;
},{}],31:[function(require,module,exports){
"use strict";
/*jshint -W004 */
var SafeString = require("./safe-string")["default"];

var escape = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "`": "&#x60;"
};

var badChars = /[&<>"'`]/g;
var possible = /[&<>"'`]/;

function escapeChar(chr) {
  return escape[chr] || "&amp;";
}

function extend(obj, value) {
  for(var key in value) {
    if(Object.prototype.hasOwnProperty.call(value, key)) {
      obj[key] = value[key];
    }
  }
}

exports.extend = extend;var toString = Object.prototype.toString;
exports.toString = toString;
// Sourced from lodash
// https://github.com/bestiejs/lodash/blob/master/LICENSE.txt
var isFunction = function(value) {
  return typeof value === 'function';
};
// fallback for older versions of Chrome and Safari
if (isFunction(/x/)) {
  isFunction = function(value) {
    return typeof value === 'function' && toString.call(value) === '[object Function]';
  };
}
var isFunction;
exports.isFunction = isFunction;
var isArray = Array.isArray || function(value) {
  return (value && typeof value === 'object') ? toString.call(value) === '[object Array]' : false;
};
exports.isArray = isArray;

function escapeExpression(string) {
  // don't escape SafeStrings, since they're already safe
  if (string instanceof SafeString) {
    return string.toString();
  } else if (!string && string !== 0) {
    return "";
  }

  // Force a string conversion as this will be done by the append regardless and
  // the regex test will do this transparently behind the scenes, causing issues if
  // an object's to string has escaped characters in it.
  string = "" + string;

  if(!possible.test(string)) { return string; }
  return string.replace(badChars, escapeChar);
}

exports.escapeExpression = escapeExpression;function isEmpty(value) {
  if (!value && value !== 0) {
    return true;
  } else if (isArray(value) && value.length === 0) {
    return true;
  } else {
    return false;
  }
}

exports.isEmpty = isEmpty;
},{"./safe-string":30}],32:[function(require,module,exports){
var Tokenizer = require("./Tokenizer.js");

/*
	Options:

	xmlMode: Special behavior for script/style tags (true by default)
	lowerCaseAttributeNames: call .toLowerCase for each attribute name (true if xmlMode is `false`)
	lowerCaseTags: call .toLowerCase for each tag name (true if xmlMode is `false`)
*/

/*
	Callbacks:

	oncdataend,
	oncdatastart,
	onclosetag,
	oncomment,
	oncommentend,
	onerror,
	onopentag,
	onprocessinginstruction,
	onreset,
	ontext
*/

var formTags = {
	input: true,
	option: true,
	optgroup: true,
	select: true,
	button: true,
	datalist: true,
	textarea: true
};

var openImpliesClose = {
	tr      : { tr:true, th:true, td:true },
	th      : { th:true },
	td      : { thead:true, td:true },
	body    : { head:true, link:true, script:true },
	li      : { li:true },
	p       : { p:true },
	select  : formTags,
	input   : formTags,
	output  : formTags,
	button  : formTags,
	datalist: formTags,
	textarea: formTags,
	option  : { option:true },
	optgroup: { optgroup:true }
};

var voidElements = {
	__proto__: null,
	area: true,
	base: true,
	basefont: true,
	br: true,
	col: true,
	command: true,
	embed: true,
	frame: true,
	hr: true,
	img: true,
	input: true,
	isindex: true,
	keygen: true,
	link: true,
	meta: true,
	param: true,
	source: true,
	track: true,
	wbr: true
};

var re_nameEnd = /\s|\//;

function Parser(cbs, options){
	this._options = options || {};
	this._cbs = cbs || {};

	this._tagname = "";
	this._attribname = "";
	this._attribvalue = "";
	this._attribs = null;
	this._stack = [];
	this._done = false;

	this.startIndex = 0;
	this.endIndex = null;

	this._tokenizer = new Tokenizer(options, this);
}

require("util").inherits(Parser, require("events").EventEmitter);

Parser.prototype._updatePosition = function(initialOffset){
	if(this.endIndex === null){
		this.startIndex = this._tokenizer._sectionStart <= initialOffset ? 0 : this._tokenizer._sectionStart - initialOffset;
	}
	this.startIndex = this.endIndex + 1;
	this.endIndex = this._tokenizer._index;
};

//Tokenizer event handlers
Parser.prototype.ontext = function(data){
	this._updatePosition(1);
	this.endIndex--;

	if(this._cbs.ontext) this._cbs.ontext(data);
};

Parser.prototype.onopentagname = function(name){
	if(!(this._options.xmlMode || "lowerCaseTags" in this._options) || this._options.lowerCaseTags){
		name = name.toLowerCase();
	}

	this._tagname = name;

	if (!this._options.xmlMode && name in openImpliesClose) {
		for(
			var el;
			(el = this._stack[this._stack.length-1]) in openImpliesClose[name];
			this.onclosetag(el)
		);
	}

	if(this._options.xmlMode || !(name in voidElements)){
		this._stack.push(name);
	}

	if(this._cbs.onopentagname) this._cbs.onopentagname(name);
	if(this._cbs.onopentag) this._attribs = {};
};

Parser.prototype.onopentagend = function(){
	this._updatePosition(1);
    
	if(this._attribs){
		if(this._cbs.onopentag) this._cbs.onopentag(this._tagname, this._attribs);
		this._attribs = null;
	}
    
	if(!this._options.xmlMode && this._cbs.onclosetag && this._tagname in voidElements){
		this._cbs.onclosetag(this._tagname);
	}
    
	this._tagname = "";
};

Parser.prototype.onclosetag = function(name){
	this._updatePosition(1);

	if(!(this._options.xmlMode || "lowerCaseTags" in this._options) || this._options.lowerCaseTags){
		name = name.toLowerCase();
	}

	if(this._stack.length && (!(name in voidElements) || this._options.xmlMode)){
		var pos = this._stack.lastIndexOf(name);
		if(pos !== -1){
			if(this._cbs.onclosetag){
				pos = this._stack.length - pos;
				while(pos--) this._cbs.onclosetag(this._stack.pop());
			}
			else this._stack.length = pos;
		} else if(name === "p" && !this._options.xmlMode){
			this.onopentagname(name);
			this._closeCurrentTag();
		}
	} else if(!this._options.xmlMode && (name === "br" || name === "p")){
		this.onopentagname(name);
		this._closeCurrentTag();
	}
};

Parser.prototype.onselfclosingtag = function(){
	if(this._options.xmlMode){
		this._closeCurrentTag();
	} else {
		this.onopentagend();
	}
};

Parser.prototype._closeCurrentTag = function(){
	var name = this._tagname;

	this.onopentagend();

	//self-closing tags will be on the top of the stack
	//(cheaper check than in onclosetag)
	if(this._stack[this._stack.length-1] === name){
		if(this._cbs.onclosetag){
			this._cbs.onclosetag(name);
		}
		this._stack.pop();
	}
};

Parser.prototype.onattribname = function(name){
	if(!(this._options.xmlMode || "lowerCaseAttributeNames" in this._options) || this._options.lowerCaseAttributeNames){
		name = name.toLowerCase();
	}
	this._attribname = name;
};

Parser.prototype.onattribdata = function(value){
	this._attribvalue += value;
};

Parser.prototype.onattribend = function(){
	if(this._cbs.onattribute) this._cbs.onattribute(this._attribname, this._attribvalue);
	if(
		this._attribs &&
		!Object.prototype.hasOwnProperty.call(this._attribs, this._attribname)
	){
		this._attribs[this._attribname] = this._attribvalue;
	}
	this._attribname = "";
	this._attribvalue = "";
};

Parser.prototype.ondeclaration = function(value){
	if(this._cbs.onprocessinginstruction){
		var idx = value.search(re_nameEnd),
		    name = idx < 0 ? value : value.substr(0, idx);

		if(!(this._options.xmlMode || "lowerCaseTags" in this._options) || this._options.lowerCaseTags){
			name = name.toLowerCase();
		}
		this._cbs.onprocessinginstruction("!" + name, "!" + value);
	}
};

Parser.prototype.onprocessinginstruction = function(value){
	if(this._cbs.onprocessinginstruction){
		var idx = value.search(re_nameEnd),
		    name = idx < 0 ? value : value.substr(0, idx);

		if(!(this._options.xmlMode || "lowerCaseTags" in this._options) || this._options.lowerCaseTags){
			name = name.toLowerCase();
		}
		this._cbs.onprocessinginstruction("?" + name, "?" + value);
	}
};

Parser.prototype.oncomment = function(value){
	this._updatePosition(4);

	if(this._cbs.oncomment) this._cbs.oncomment(value);
	if(this._cbs.oncommentend) this._cbs.oncommentend();
};

Parser.prototype.oncdata = function(value){
	this._updatePosition(1);

	if(this._options.xmlMode){
		if(this._cbs.oncdatastart) this._cbs.oncdatastart();
		if(this._cbs.ontext) this._cbs.ontext(value);
		if(this._cbs.oncdataend) this._cbs.oncdataend();
	} else {
		this.oncomment("[CDATA[" + value + "]]");
	}
};

Parser.prototype.onerror = function(err){
	if(this._cbs.onerror) this._cbs.onerror(err);
};

Parser.prototype.onend = function(){
	if(this._cbs.onclosetag){
		for(
			var i = this._stack.length;
			i > 0;
			this._cbs.onclosetag(this._stack[--i])
		);
	}
	if(this._cbs.onend) this._cbs.onend();
};


//Resets the parser to a blank state, ready to parse a new HTML document
Parser.prototype.reset = function(){
	if(this._cbs.onreset) this._cbs.onreset();
	this._tokenizer.reset();

	this._tagname = "";
	this._attribname = "";
	this._attribs = null;
	this._stack = [];
	this._done = false;
};

//Parses a complete HTML document and pushes it to the handler
Parser.prototype.parseComplete = function(data){
	this.reset();
	this.end(data);
};

Parser.prototype.write = function(chunk){
	if(this._done) this.onerror(Error(".write() after done!"));
	this._tokenizer.write(chunk);
};

Parser.prototype.end = function(chunk){
	if(this._done) this.onerror(Error(".end() after done!"));
	this._tokenizer.end(chunk);
	this._done = true;
};

//alias for backwards compat
Parser.prototype.parseChunk = Parser.prototype.write;
Parser.prototype.done = Parser.prototype.end;

module.exports = Parser;

},{"./Tokenizer.js":33,"events":17,"util":21}],33:[function(require,module,exports){
module.exports = Tokenizer;

var entityMap = require("./entities/entities.json"),
    legacyMap = require("./entities/legacy.json"),
    xmlMap    = require("./entities/xml.json"),
    decodeMap = require("./entities/decode.json"),

    i = 0,

    TEXT                      = i++,
    BEFORE_TAG_NAME           = i++, //after <
    IN_TAG_NAME               = i++,
    IN_SELF_CLOSING_TAG       = i++,
    BEFORE_CLOSING_TAG_NAME   = i++,
    IN_CLOSING_TAG_NAME       = i++,
    AFTER_CLOSING_TAG_NAME    = i++,

    //attributes
    BEFORE_ATTRIBUTE_NAME     = i++,
    IN_ATTRIBUTE_NAME         = i++,
    AFTER_ATTRIBUTE_NAME      = i++,
    BEFORE_ATTRIBUTE_VALUE    = i++,
    IN_ATTRIBUTE_VALUE_DQ     = i++, // "
    IN_ATTRIBUTE_VALUE_SQ     = i++, // '
    IN_ATTRIBUTE_VALUE_NQ     = i++,

    //declarations
    BEFORE_DECLARATION        = i++, // !
    IN_DECLARATION            = i++,

    //processing instructions
    IN_PROCESSING_INSTRUCTION = i++, // ?

    //comments
    BEFORE_COMMENT            = i++,
    IN_COMMENT                = i++,
    AFTER_COMMENT_1           = i++,
    AFTER_COMMENT_2           = i++,

    //cdata
    BEFORE_CDATA_1            = i++, // [
    BEFORE_CDATA_2            = i++, // C
    BEFORE_CDATA_3            = i++, // D
    BEFORE_CDATA_4            = i++, // A
    BEFORE_CDATA_5            = i++, // T
    BEFORE_CDATA_6            = i++, // A
    IN_CDATA                  = i++,// [
    AFTER_CDATA_1             = i++, // ]
    AFTER_CDATA_2             = i++, // ]

    //special tags
    BEFORE_SPECIAL            = i++, //S
    BEFORE_SPECIAL_END        = i++,   //S

    BEFORE_SCRIPT_1           = i++, //C
    BEFORE_SCRIPT_2           = i++, //R
    BEFORE_SCRIPT_3           = i++, //I
    BEFORE_SCRIPT_4           = i++, //P
    BEFORE_SCRIPT_5           = i++, //T
    AFTER_SCRIPT_1            = i++, //C
    AFTER_SCRIPT_2            = i++, //R
    AFTER_SCRIPT_3            = i++, //I
    AFTER_SCRIPT_4            = i++, //P
    AFTER_SCRIPT_5            = i++, //T

    BEFORE_STYLE_1            = i++, //T
    BEFORE_STYLE_2            = i++, //Y
    BEFORE_STYLE_3            = i++, //L
    BEFORE_STYLE_4            = i++, //E
    AFTER_STYLE_1             = i++, //T
    AFTER_STYLE_2             = i++, //Y
    AFTER_STYLE_3             = i++, //L
    AFTER_STYLE_4             = i++, //E

    BEFORE_ENTITY             = i++, //&
    BEFORE_NUMERIC_ENTITY     = i++, //#
    IN_NAMED_ENTITY           = i++,
    IN_NUMERIC_ENTITY         = i++,
    IN_HEX_ENTITY             = i++, //X

    j = 0,

    SPECIAL_NONE              = j++,
    SPECIAL_SCRIPT            = j++,
    SPECIAL_STYLE             = j++;

function whitespace(c){
	return c === " " || c === "\n" || c === "\t" || c === "\f" || c === "\r";
}

function ifElseState(upper, SUCCESS, FAILURE){
	var lower = upper.toLowerCase();

	if(upper === lower){
		return function(c){
			this._state = c === lower ? SUCCESS : FAILURE;
		};
	} else {
		return function(c){
			this._state = (c === lower || c === upper) ? SUCCESS : FAILURE;
		};
	}
}

function consumeSpecialNameChar(upper, NEXT_STATE){
	var lower = upper.toLowerCase();

	return function(c){
		if(c === lower || c === upper){
			this._state = NEXT_STATE;
		} else {
			this._state = IN_TAG_NAME;
			this._index--; //consume the token again
		}
	};
}

function Tokenizer(options, cbs){
	this._state = TEXT;
	this._buffer = "";
	this._sectionStart = 0;
	this._index = 0;
	this._baseState = TEXT;
	this._special = SPECIAL_NONE;
	this._cbs = cbs;
	this._running = true;
	this._xmlMode = !!(options && options.xmlMode);
	this._decodeEntities = !!(options && options.decodeEntities);
}

Tokenizer.prototype._stateText = function(c){
	if(c === "<"){
		if(this._index > this._sectionStart){
			this._cbs.ontext(this._getSection());
		}
		this._state = BEFORE_TAG_NAME;
		this._sectionStart = this._index;
	} else if(this._decodeEntities && this._special === SPECIAL_NONE && c === "&"){
		if(this._index > this._sectionStart){
			this._cbs.ontext(this._getSection());
		}
		this._baseState = TEXT;
		this._state = BEFORE_ENTITY;
		this._sectionStart = this._index;
	}
};

Tokenizer.prototype._stateBeforeTagName = function(c){
	if(c === "/"){
		this._state = BEFORE_CLOSING_TAG_NAME;
	} else if(c === ">" || this._special !== SPECIAL_NONE || whitespace(c)) {
		this._state = TEXT;
	} else if(c === "!"){
		this._state = BEFORE_DECLARATION;
		this._sectionStart = this._index + 1;
	} else if(c === "?"){
		this._state = IN_PROCESSING_INSTRUCTION;
		this._sectionStart = this._index + 1;
	} else if(c === "<"){
		this._cbs.ontext(this._getSection());
		this._sectionStart = this._index;
	} else {
		this._state = (!this._xmlMode && (c === "s" || c === "S")) ?
						BEFORE_SPECIAL : IN_TAG_NAME;
		this._sectionStart = this._index;
	}
};

Tokenizer.prototype._stateInTagName = function(c){
	if(c === "/" || c === ">" || whitespace(c)){
		this._emitToken("onopentagname");
		this._state = BEFORE_ATTRIBUTE_NAME;
		this._index--;
	}
};

Tokenizer.prototype._stateBeforeCloseingTagName = function(c){
	if(whitespace(c));
	else if(c === ">"){
		this._state = TEXT;
	} else if(this._special !== SPECIAL_NONE){
		if(c === "s" || c === "S"){
			this._state = BEFORE_SPECIAL_END;
		} else {
			this._state = TEXT;
			this._index--;
		}
	} else {
		this._state = IN_CLOSING_TAG_NAME;
		this._sectionStart = this._index;
	}
};

Tokenizer.prototype._stateInCloseingTagName = function(c){
	if(c === ">" || whitespace(c)){
		this._emitToken("onclosetag");
		this._state = AFTER_CLOSING_TAG_NAME;
		this._index--;
	}
};

Tokenizer.prototype._stateAfterCloseingTagName = function(c){
	//skip everything until ">"
	if(c === ">"){
		this._state = TEXT;
		this._sectionStart = this._index + 1;
	}
};

Tokenizer.prototype._stateBeforeAttributeName = function(c){
	if(c === ">"){
		this._cbs.onopentagend();
		this._state = TEXT;
		this._sectionStart = this._index + 1;
	} else if(c === "/"){
		this._state = IN_SELF_CLOSING_TAG;
	} else if(!whitespace(c)){
		this._state = IN_ATTRIBUTE_NAME;
		this._sectionStart = this._index;
	}
};

Tokenizer.prototype._stateInSelfClosingTag = function(c){
	if(c === ">"){
		this._cbs.onselfclosingtag();
		this._state = TEXT;
		this._sectionStart = this._index + 1;
	} else if(!whitespace(c)){
		this._state = BEFORE_ATTRIBUTE_NAME;
		this._index--;
	}
};

Tokenizer.prototype._stateInAttributeName = function(c){
	if(c === "=" || c === "/" || c === ">" || whitespace(c)){
		if(this._index > this._sectionStart){
			this._cbs.onattribname(this._getSection());
		}
		this._sectionStart = -1;
		this._state = AFTER_ATTRIBUTE_NAME;
		this._index--;
	}
};

Tokenizer.prototype._stateAfterAttributeName = function(c){
	if(c === "="){
		this._state = BEFORE_ATTRIBUTE_VALUE;
	} else if(c === "/" || c === ">"){
		this._cbs.onattribend();
		this._state = BEFORE_ATTRIBUTE_NAME;
		this._index--;
	} else if(!whitespace(c)){
		this._cbs.onattribend();
		this._state = IN_ATTRIBUTE_NAME;
		this._sectionStart = this._index;
	}
};

Tokenizer.prototype._stateBeforeAttributeValue = function(c){
	if(c === "\""){
		this._state = IN_ATTRIBUTE_VALUE_DQ;
		this._sectionStart = this._index + 1;
	} else if(c === "'"){
		this._state = IN_ATTRIBUTE_VALUE_SQ;
		this._sectionStart = this._index + 1;
	} else if(!whitespace(c)){
		this._state = IN_ATTRIBUTE_VALUE_NQ;
		this._sectionStart = this._index;
	}
};

Tokenizer.prototype._stateInAttributeValueDoubleQuotes = function(c){
	if(c === "\""){
		this._emitToken("onattribdata");
		this._cbs.onattribend();
		this._state = BEFORE_ATTRIBUTE_NAME;
	} else if(this._decodeEntities && c === "&"){
		this._emitToken("onattribdata");
		this._baseState = this._state;
		this._state = BEFORE_ENTITY;
		this._sectionStart = this._index;
	}
};

Tokenizer.prototype._stateInAttributeValueSingleQuotes = function(c){
	if(c === "'"){
		this._emitToken("onattribdata");
		this._cbs.onattribend();
		this._state = BEFORE_ATTRIBUTE_NAME;
	} else if(this._decodeEntities && c === "&"){
		this._emitToken("onattribdata");
		this._baseState = this._state;
		this._state = BEFORE_ENTITY;
		this._sectionStart = this._index;
	}
};

Tokenizer.prototype._stateInAttributeValueNoQuotes = function(c){
	if(whitespace(c) || c === ">"){
		this._emitToken("onattribdata");
		this._cbs.onattribend();
		this._state = BEFORE_ATTRIBUTE_NAME;
		this._index--;
	} else if(this._decodeEntities && c === "&"){
		this._emitToken("onattribdata");
		this._baseState = this._state;
		this._state = BEFORE_ENTITY;
		this._sectionStart = this._index;
	}
};

Tokenizer.prototype._stateBeforeDeclaration = function(c){
	this._state = c === "[" ? BEFORE_CDATA_1 :
					c === "-" ? BEFORE_COMMENT :
						IN_DECLARATION;
};

Tokenizer.prototype._stateInDeclaration = function(c){
	if(c === ">"){
		this._cbs.ondeclaration(this._getSection());
		this._state = TEXT;
		this._sectionStart = this._index + 1;
	}
};

Tokenizer.prototype._stateInProcessingInstruction = function(c){
	if(c === ">"){
		this._cbs.onprocessinginstruction(this._getSection());
		this._state = TEXT;
		this._sectionStart = this._index + 1;
	}
};

Tokenizer.prototype._stateBeforeComment = function(c){
	if(c === "-"){
		this._state = IN_COMMENT;
		this._sectionStart = this._index + 1;
	} else {
		this._state = IN_DECLARATION;
	}
};

Tokenizer.prototype._stateInComment = function(c){
	if(c === "-") this._state = AFTER_COMMENT_1;
};

Tokenizer.prototype._stateAfterComment1 = ifElseState("-", AFTER_COMMENT_2, IN_COMMENT);

Tokenizer.prototype._stateAfterComment2 = function(c){
	if(c === ">"){
		//remove 2 trailing chars
		this._cbs.oncomment(this._buffer.substring(this._sectionStart, this._index - 2));
		this._state = TEXT;
		this._sectionStart = this._index + 1;
	} else if(c !== "-"){
		this._state = IN_COMMENT;
	}
	// else: stay in AFTER_COMMENT_2 (`--->`)
};

Tokenizer.prototype._stateBeforeCdata1 = ifElseState("C", BEFORE_CDATA_2, IN_DECLARATION);
Tokenizer.prototype._stateBeforeCdata2 = ifElseState("D", BEFORE_CDATA_3, IN_DECLARATION);
Tokenizer.prototype._stateBeforeCdata3 = ifElseState("A", BEFORE_CDATA_4, IN_DECLARATION);
Tokenizer.prototype._stateBeforeCdata4 = ifElseState("T", BEFORE_CDATA_5, IN_DECLARATION);
Tokenizer.prototype._stateBeforeCdata5 = ifElseState("A", BEFORE_CDATA_6, IN_DECLARATION);

Tokenizer.prototype._stateBeforeCdata6 = function(c){
	if(c === "["){
		this._state = IN_CDATA;
		this._sectionStart = this._index + 1;
	} else {
		this._state = IN_DECLARATION;
	}
};

Tokenizer.prototype._stateInCdata = function(c){
	if(c === "]") this._state = AFTER_CDATA_1;
};

Tokenizer.prototype._stateAfterCdata1 = ifElseState("]", AFTER_CDATA_2, IN_CDATA);

Tokenizer.prototype._stateAfterCdata2 = function(c){
	if(c === ">"){
		//remove 2 trailing chars
		this._cbs.oncdata(this._buffer.substring(this._sectionStart, this._index - 2));
		this._state = TEXT;
		this._sectionStart = this._index + 1;
	} else if (c !== "]") {
		this._state = IN_CDATA;
	}
	//else: stay in AFTER_CDATA_2 (`]]]>`)
};

Tokenizer.prototype._stateBeforeSpecial = function(c){
	if(c === "c" || c === "C"){
		this._state = BEFORE_SCRIPT_1;
	} else if(c === "t" || c === "T"){
		this._state = BEFORE_STYLE_1;
	} else {
		this._state = IN_TAG_NAME;
		this._index--; //consume the token again
	}
};

Tokenizer.prototype._stateBeforeSpecialEnd = function(c){
	if(this._special === SPECIAL_SCRIPT && (c === "c" || c === "C")){
		this._state = AFTER_SCRIPT_1;
	} else if(this._special === SPECIAL_STYLE && (c === "t" || c === "T")){
		this._state = AFTER_STYLE_1;
	}
	else this._state = TEXT;
};

Tokenizer.prototype._stateBeforeScript1 = consumeSpecialNameChar("R", BEFORE_SCRIPT_2);
Tokenizer.prototype._stateBeforeScript2 = consumeSpecialNameChar("I", BEFORE_SCRIPT_3);
Tokenizer.prototype._stateBeforeScript3 = consumeSpecialNameChar("P", BEFORE_SCRIPT_4);
Tokenizer.prototype._stateBeforeScript4 = consumeSpecialNameChar("T", BEFORE_SCRIPT_5);

Tokenizer.prototype._stateBeforeScript5 = function(c){
	if(c === "/" || c === ">" || whitespace(c)){
		this._special = SPECIAL_SCRIPT;
	}
	this._state = IN_TAG_NAME;
	this._index--; //consume the token again
};

Tokenizer.prototype._stateAfterScript1 = ifElseState("R", AFTER_SCRIPT_2, TEXT);
Tokenizer.prototype._stateAfterScript2 = ifElseState("I", AFTER_SCRIPT_3, TEXT);
Tokenizer.prototype._stateAfterScript3 = ifElseState("P", AFTER_SCRIPT_4, TEXT);
Tokenizer.prototype._stateAfterScript4 = ifElseState("T", AFTER_SCRIPT_5, TEXT);

Tokenizer.prototype._stateAfterScript5 = function(c){
	if(c === ">" || whitespace(c)){
		this._special = SPECIAL_NONE;
		this._state = IN_CLOSING_TAG_NAME;
		this._sectionStart = this._index - 6;
		this._index--; //reconsume the token
	}
	else this._state = TEXT;
};

Tokenizer.prototype._stateBeforeStyle1 = consumeSpecialNameChar("Y", BEFORE_STYLE_2);
Tokenizer.prototype._stateBeforeStyle2 = consumeSpecialNameChar("L", BEFORE_STYLE_3);
Tokenizer.prototype._stateBeforeStyle3 = consumeSpecialNameChar("E", BEFORE_STYLE_4);

Tokenizer.prototype._stateBeforeStyle4 = function(c){
	if(c === "/" || c === ">" || whitespace(c)){
		this._special = SPECIAL_STYLE;
	}
	this._state = IN_TAG_NAME;
	this._index--; //consume the token again
};

Tokenizer.prototype._stateAfterStyle1 = ifElseState("Y", AFTER_STYLE_2, TEXT);
Tokenizer.prototype._stateAfterStyle2 = ifElseState("L", AFTER_STYLE_3, TEXT);
Tokenizer.prototype._stateAfterStyle3 = ifElseState("E", AFTER_STYLE_4, TEXT);

Tokenizer.prototype._stateAfterStyle4 = function(c){
	if(c === ">" || whitespace(c)){
		this._special = SPECIAL_NONE;
		this._state = IN_CLOSING_TAG_NAME;
		this._sectionStart = this._index - 5;
		this._index--; //reconsume the token
	}
	else this._state = TEXT;
};

Tokenizer.prototype._stateBeforeEntity = ifElseState("#", BEFORE_NUMERIC_ENTITY, IN_NAMED_ENTITY);
Tokenizer.prototype._stateBeforeNumericEntity = ifElseState("X", IN_HEX_ENTITY, IN_NUMERIC_ENTITY);

//for entities within attributes
Tokenizer.prototype._parseNamedEntityStrict = function(){
	//offset = 1
	if(this._sectionStart + 1 < this._index){
		var entity = this._buffer.substring(this._sectionStart + 1, this._index),
		    map = this._xmlMode ? xmlMap : entityMap;

		if(map.hasOwnProperty(entity)){
			this._emitPartial(map[entity]);
			this._sectionStart = this._index + 1;
		}
	}
};


//parses legacy entities (without trailing semicolon)
Tokenizer.prototype._parseLegacyEntity = function(){
	var start = this._sectionStart + 1,
	    limit = this._index - start;

	if(limit > 6) limit = 6; //the max length of legacy entities is 6

	while(limit >= 2){ //the min length of legacy entities is 2
		var entity = this._buffer.substr(start, limit);

		if(legacyMap.hasOwnProperty(entity)){
			this._emitPartial(legacyMap[entity]);
			this._sectionStart += limit + 2;
			break;
		} else {
			limit--;
		}
	}
};

Tokenizer.prototype._stateInNamedEntity = function(c){
	if(c === ";"){
		this._parseNamedEntityStrict();
		if(this._sectionStart + 1 < this._index && !this._xmlMode){
			this._parseLegacyEntity();
		}
		this._state = this._baseState;
	} else if((c < "a" || c > "z") && (c < "A" || c > "Z") && (c < "0" || c > "9")){
		if(this._xmlMode);
		else if(this._baseState !== TEXT){
			if(c !== "="){
				this._parseNamedEntityStrict();
				this._sectionStart--; //include the current character in the section
			}
		} else {
			this._parseLegacyEntity();
			this._sectionStart--;
		}
		this._state = this._baseState;
		this._index--;
	}
};

// modified version of https://github.com/mathiasbynens/he/blob/master/src/he.js#L94-L119
function decodeCodePoint(codePoint){
	var output = "";

	if((codePoint >= 0xD800 && codePoint <= 0xDFFF) || codePoint > 0x10FFFF){
		return "\uFFFD";
	}

	if(codePoint in decodeMap){
		codePoint = decodeMap[codePoint];
	}

	if(codePoint > 0xFFFF){
		codePoint -= 0x10000;
		output += String.fromCharCode(codePoint >>> 10 & 0x3FF | 0xD800);
		codePoint = 0xDC00 | codePoint & 0x3FF;
	}

	output += String.fromCharCode(codePoint);
	return output;
}

Tokenizer.prototype._decodeNumericEntity = function(offset, base){
	var sectionStart = this._sectionStart + offset;

	if(sectionStart !== this._index){
		//parse entity
		var entity = this._buffer.substring(sectionStart, this._index);
		var parsed = parseInt(entity, base);

		if(parsed === parsed){ //not NaN (TODO: when can this happen?)
			this._emitPartial(decodeCodePoint(parsed));
			this._sectionStart = this._index;
		}
	}

	this._state = this._baseState;
};

Tokenizer.prototype._stateInNumericEntity = function(c){
	if(c === ";"){
		this._decodeNumericEntity(2, 10);
		this._sectionStart++;
	} else if(c < "0" || c > "9"){
		if(!this._xmlMode){
			this._decodeNumericEntity(2, 10);
		} else {
			this._state = this._baseState;
		}
		this._index--;
	}
};

Tokenizer.prototype._stateInHexEntity = function(c){
	if(c === ";"){
		this._decodeNumericEntity(3, 16);
		this._sectionStart++;
	} else if((c < "a" || c > "f") && (c < "A" || c > "F") && (c < "0" || c > "9")){
		if(!this._xmlMode){
			this._decodeNumericEntity(3, 16);
		} else {
			this._state = this._baseState;
		}
		this._index--;
	}
};

Tokenizer.prototype._cleanup = function () {
	if(this._sectionStart < 0){
		this._buffer = "";
		this._index = 0;
	} else {
		if(this._state === TEXT){
			if(this._sectionStart !== this._index){
				this._cbs.ontext(this._buffer.substr(this._sectionStart));
			}
			this._buffer = "";
			this._index = 0;
		} else if(this._sectionStart === this._index){
			//the section just started
			this._buffer = "";
			this._index = 0;
		} else {
			//remove everything unnecessary
			this._buffer = this._buffer.substr(this._sectionStart);
			this._index -= this._sectionStart;
		}

		this._sectionStart = 0;
	}
};

//TODO make events conditional
Tokenizer.prototype.write = function(chunk){
	this._buffer += chunk;

	while(this._index < this._buffer.length && this._running){
		var c = this._buffer.charAt(this._index);
		if(this._state === TEXT) {
			this._stateText(c);
		} else if(this._state === BEFORE_TAG_NAME){
			this._stateBeforeTagName(c);
		} else if(this._state === IN_TAG_NAME) {
			this._stateInTagName(c);
		} else if(this._state === BEFORE_CLOSING_TAG_NAME){
			this._stateBeforeCloseingTagName(c);
		} else if(this._state === IN_CLOSING_TAG_NAME){
			this._stateInCloseingTagName(c);
		} else if(this._state === AFTER_CLOSING_TAG_NAME){
			this._stateAfterCloseingTagName(c);
		} else if(this._state === IN_SELF_CLOSING_TAG){
			this._stateInSelfClosingTag(c);
		}

		/*
		*	attributes
		*/
		else if(this._state === BEFORE_ATTRIBUTE_NAME){
			this._stateBeforeAttributeName(c);
		} else if(this._state === IN_ATTRIBUTE_NAME){
			this._stateInAttributeName(c);
		} else if(this._state === AFTER_ATTRIBUTE_NAME){
			this._stateAfterAttributeName(c);
		} else if(this._state === BEFORE_ATTRIBUTE_VALUE){
			this._stateBeforeAttributeValue(c);
		} else if(this._state === IN_ATTRIBUTE_VALUE_DQ){
			this._stateInAttributeValueDoubleQuotes(c);
		} else if(this._state === IN_ATTRIBUTE_VALUE_SQ){
			this._stateInAttributeValueSingleQuotes(c);
		} else if(this._state === IN_ATTRIBUTE_VALUE_NQ){
			this._stateInAttributeValueNoQuotes(c);
		}

		/*
		*	declarations
		*/
		else if(this._state === BEFORE_DECLARATION){
			this._stateBeforeDeclaration(c);
		} else if(this._state === IN_DECLARATION){
			this._stateInDeclaration(c);
		}

		/*
		*	processing instructions
		*/
		else if(this._state === IN_PROCESSING_INSTRUCTION){
			this._stateInProcessingInstruction(c);
		}

		/*
		*	comments
		*/
		else if(this._state === BEFORE_COMMENT){
			this._stateBeforeComment(c);
		} else if(this._state === IN_COMMENT){
			this._stateInComment(c);
		} else if(this._state === AFTER_COMMENT_1){
			this._stateAfterComment1(c);
		} else if(this._state === AFTER_COMMENT_2){
			this._stateAfterComment2(c);
		}

		/*
		*	cdata
		*/
		else if(this._state === BEFORE_CDATA_1){
			this._stateBeforeCdata1(c);
		} else if(this._state === BEFORE_CDATA_2){
			this._stateBeforeCdata2(c);
		} else if(this._state === BEFORE_CDATA_3){
			this._stateBeforeCdata3(c);
		} else if(this._state === BEFORE_CDATA_4){
			this._stateBeforeCdata4(c);
		} else if(this._state === BEFORE_CDATA_5){
			this._stateBeforeCdata5(c);
		} else if(this._state === BEFORE_CDATA_6){
			this._stateBeforeCdata6(c);
		} else if(this._state === IN_CDATA){
			this._stateInCdata(c);
		} else if(this._state === AFTER_CDATA_1){
			this._stateAfterCdata1(c);
		} else if(this._state === AFTER_CDATA_2){
			this._stateAfterCdata2(c);
		}

		/*
		* special tags
		*/
		else if(this._state === BEFORE_SPECIAL){
			this._stateBeforeSpecial(c);
		} else if(this._state === BEFORE_SPECIAL_END){
			this._stateBeforeSpecialEnd(c);
		}

		/*
		* script
		*/
		else if(this._state === BEFORE_SCRIPT_1){
			this._stateBeforeScript1(c);
		} else if(this._state === BEFORE_SCRIPT_2){
			this._stateBeforeScript2(c);
		} else if(this._state === BEFORE_SCRIPT_3){
			this._stateBeforeScript3(c);
		} else if(this._state === BEFORE_SCRIPT_4){
			this._stateBeforeScript4(c);
		} else if(this._state === BEFORE_SCRIPT_5){
			this._stateBeforeScript5(c);
		}

		else if(this._state === AFTER_SCRIPT_1){
			this._stateAfterScript1(c);
		} else if(this._state === AFTER_SCRIPT_2){
			this._stateAfterScript2(c);
		} else if(this._state === AFTER_SCRIPT_3){
			this._stateAfterScript3(c);
		} else if(this._state === AFTER_SCRIPT_4){
			this._stateAfterScript4(c);
		} else if(this._state === AFTER_SCRIPT_5){
			this._stateAfterScript5(c);
		}

		/*
		* style
		*/
		else if(this._state === BEFORE_STYLE_1){
			this._stateBeforeStyle1(c);
		} else if(this._state === BEFORE_STYLE_2){
			this._stateBeforeStyle2(c);
		} else if(this._state === BEFORE_STYLE_3){
			this._stateBeforeStyle3(c);
		} else if(this._state === BEFORE_STYLE_4){
			this._stateBeforeStyle4(c);
		}

		else if(this._state === AFTER_STYLE_1){
			this._stateAfterStyle1(c);
		} else if(this._state === AFTER_STYLE_2){
			this._stateAfterStyle2(c);
		} else if(this._state === AFTER_STYLE_3){
			this._stateAfterStyle3(c);
		} else if(this._state === AFTER_STYLE_4){
			this._stateAfterStyle4(c);
		}

		/*
		* entities
		*/
		else if(this._state === BEFORE_ENTITY){
			this._stateBeforeEntity(c);
		} else if(this._state === BEFORE_NUMERIC_ENTITY){
			this._stateBeforeNumericEntity(c);
		} else if(this._state === IN_NAMED_ENTITY){
			this._stateInNamedEntity(c);
		} else if(this._state === IN_NUMERIC_ENTITY){
			this._stateInNumericEntity(c);
		} else if(this._state === IN_HEX_ENTITY){
			this._stateInHexEntity(c);
		}

		else {
			this._cbs.onerror(Error("unknown _state"), this._state);
		}

		this._index++;
	}

	this._cleanup();
};

Tokenizer.prototype.pause = function(){
	this._running = false;
};
Tokenizer.prototype.resume = function(){
	this._running = true;
};

Tokenizer.prototype.end = function(chunk){
	if(chunk) this.write(chunk);

	//if there is remaining data, emit it in a reasonable way
	if(this._sectionStart < this._index){
		this._handleTrailingData();
	}

	this._cbs.onend();
};

Tokenizer.prototype._handleTrailingData = function(){
	var data = this._buffer.substr(this._sectionStart);

	if(this._state === IN_CDATA || this._state === AFTER_CDATA_1 || this._state === AFTER_CDATA_2){
		this._cbs.oncdata(data);
	} else if(this._state === IN_COMMENT || this._state === AFTER_COMMENT_1 || this._state === AFTER_COMMENT_2){
		this._cbs.oncomment(data);
	} else if(this._state === IN_TAG_NAME){
		this._cbs.onopentagname(data);
	} else if(this._state === BEFORE_ATTRIBUTE_NAME || this._state === BEFORE_ATTRIBUTE_VALUE || this._state === AFTER_ATTRIBUTE_NAME){
		this._cbs.onopentagend();
	} else if(this._state === IN_ATTRIBUTE_NAME){
		this._cbs.onattribname(data);
	} else if(this._state === IN_ATTRIBUTE_VALUE_SQ || this._state === IN_ATTRIBUTE_VALUE_DQ || this._state === IN_ATTRIBUTE_VALUE_NQ){
		this._cbs.onattribdata(data);
		this._cbs.onattribend();
	} else if(this._state === IN_CLOSING_TAG_NAME){
		this._cbs.onclosetag(data);
	} else if(this._state === IN_NAMED_ENTITY && !this._xmlMode){
		this._parseLegacyEntity();
		if(--this._sectionStart < this._index){
			this._state = this._baseState;
			this._handleTrailingData();
		}
	} else if(this._state === IN_NUMERIC_ENTITY && !this._xmlMode){
		this._decodeNumericEntity(2, 10);
		if(this._sectionStart < this._index){
			this._state = this._baseState;
			this._handleTrailingData();
		}
	} else if(this._state === IN_HEX_ENTITY && !this._xmlMode){
		this._decodeNumericEntity(3, 16);
		if(this._sectionStart < this._index){
			this._state = this._baseState;
			this._handleTrailingData();
		}
	} else {
		this._cbs.ontext(data);
	}
};

Tokenizer.prototype.reset = function(){
	Tokenizer.call(this, {xmlMode: this._xmlMode, decodeEntities: this._decodeEntities}, this._cbs);
};

Tokenizer.prototype._getSection = function(){
	return this._buffer.substring(this._sectionStart, this._index);
};

Tokenizer.prototype._emitToken = function(name){
	this._cbs[name](this._getSection());
	this._sectionStart = -1;
};

Tokenizer.prototype._emitPartial = function(value){
	if(this._baseState !== TEXT){
		this._cbs.onattribdata(value); //TODO implement the new event
	} else {
		this._cbs.ontext(value);
	}
};

},{"./entities/decode.json":34,"./entities/entities.json":35,"./entities/legacy.json":36,"./entities/xml.json":37}],34:[function(require,module,exports){
module.exports={"0":"\uFFFD","128":"\u20AC","130":"\u201A","131":"\u0192","132":"\u201E","133":"\u2026","134":"\u2020","135":"\u2021","136":"\u02C6","137":"\u2030","138":"\u0160","139":"\u2039","140":"\u0152","142":"\u017D","145":"\u2018","146":"\u2019","147":"\u201C","148":"\u201D","149":"\u2022","150":"\u2013","151":"\u2014","152":"\u02DC","153":"\u2122","154":"\u0161","155":"\u203A","156":"\u0153","158":"\u017E","159":"\u0178"}

},{}],35:[function(require,module,exports){
module.exports={"Aacute":"\u00C1","aacute":"\u00E1","Abreve":"\u0102","abreve":"\u0103","ac":"\u223E","acd":"\u223F","acE":"\u223E\u0333","Acirc":"\u00C2","acirc":"\u00E2","acute":"\u00B4","Acy":"\u0410","acy":"\u0430","AElig":"\u00C6","aelig":"\u00E6","af":"\u2061","Afr":"\uD835\uDD04","afr":"\uD835\uDD1E","Agrave":"\u00C0","agrave":"\u00E0","alefsym":"\u2135","aleph":"\u2135","Alpha":"\u0391","alpha":"\u03B1","Amacr":"\u0100","amacr":"\u0101","amalg":"\u2A3F","amp":"&","AMP":"&","andand":"\u2A55","And":"\u2A53","and":"\u2227","andd":"\u2A5C","andslope":"\u2A58","andv":"\u2A5A","ang":"\u2220","ange":"\u29A4","angle":"\u2220","angmsdaa":"\u29A8","angmsdab":"\u29A9","angmsdac":"\u29AA","angmsdad":"\u29AB","angmsdae":"\u29AC","angmsdaf":"\u29AD","angmsdag":"\u29AE","angmsdah":"\u29AF","angmsd":"\u2221","angrt":"\u221F","angrtvb":"\u22BE","angrtvbd":"\u299D","angsph":"\u2222","angst":"\u00C5","angzarr":"\u237C","Aogon":"\u0104","aogon":"\u0105","Aopf":"\uD835\uDD38","aopf":"\uD835\uDD52","apacir":"\u2A6F","ap":"\u2248","apE":"\u2A70","ape":"\u224A","apid":"\u224B","apos":"'","ApplyFunction":"\u2061","approx":"\u2248","approxeq":"\u224A","Aring":"\u00C5","aring":"\u00E5","Ascr":"\uD835\uDC9C","ascr":"\uD835\uDCB6","Assign":"\u2254","ast":"*","asymp":"\u2248","asympeq":"\u224D","Atilde":"\u00C3","atilde":"\u00E3","Auml":"\u00C4","auml":"\u00E4","awconint":"\u2233","awint":"\u2A11","backcong":"\u224C","backepsilon":"\u03F6","backprime":"\u2035","backsim":"\u223D","backsimeq":"\u22CD","Backslash":"\u2216","Barv":"\u2AE7","barvee":"\u22BD","barwed":"\u2305","Barwed":"\u2306","barwedge":"\u2305","bbrk":"\u23B5","bbrktbrk":"\u23B6","bcong":"\u224C","Bcy":"\u0411","bcy":"\u0431","bdquo":"\u201E","becaus":"\u2235","because":"\u2235","Because":"\u2235","bemptyv":"\u29B0","bepsi":"\u03F6","bernou":"\u212C","Bernoullis":"\u212C","Beta":"\u0392","beta":"\u03B2","beth":"\u2136","between":"\u226C","Bfr":"\uD835\uDD05","bfr":"\uD835\uDD1F","bigcap":"\u22C2","bigcirc":"\u25EF","bigcup":"\u22C3","bigodot":"\u2A00","bigoplus":"\u2A01","bigotimes":"\u2A02","bigsqcup":"\u2A06","bigstar":"\u2605","bigtriangledown":"\u25BD","bigtriangleup":"\u25B3","biguplus":"\u2A04","bigvee":"\u22C1","bigwedge":"\u22C0","bkarow":"\u290D","blacklozenge":"\u29EB","blacksquare":"\u25AA","blacktriangle":"\u25B4","blacktriangledown":"\u25BE","blacktriangleleft":"\u25C2","blacktriangleright":"\u25B8","blank":"\u2423","blk12":"\u2592","blk14":"\u2591","blk34":"\u2593","block":"\u2588","bne":"=\u20E5","bnequiv":"\u2261\u20E5","bNot":"\u2AED","bnot":"\u2310","Bopf":"\uD835\uDD39","bopf":"\uD835\uDD53","bot":"\u22A5","bottom":"\u22A5","bowtie":"\u22C8","boxbox":"\u29C9","boxdl":"\u2510","boxdL":"\u2555","boxDl":"\u2556","boxDL":"\u2557","boxdr":"\u250C","boxdR":"\u2552","boxDr":"\u2553","boxDR":"\u2554","boxh":"\u2500","boxH":"\u2550","boxhd":"\u252C","boxHd":"\u2564","boxhD":"\u2565","boxHD":"\u2566","boxhu":"\u2534","boxHu":"\u2567","boxhU":"\u2568","boxHU":"\u2569","boxminus":"\u229F","boxplus":"\u229E","boxtimes":"\u22A0","boxul":"\u2518","boxuL":"\u255B","boxUl":"\u255C","boxUL":"\u255D","boxur":"\u2514","boxuR":"\u2558","boxUr":"\u2559","boxUR":"\u255A","boxv":"\u2502","boxV":"\u2551","boxvh":"\u253C","boxvH":"\u256A","boxVh":"\u256B","boxVH":"\u256C","boxvl":"\u2524","boxvL":"\u2561","boxVl":"\u2562","boxVL":"\u2563","boxvr":"\u251C","boxvR":"\u255E","boxVr":"\u255F","boxVR":"\u2560","bprime":"\u2035","breve":"\u02D8","Breve":"\u02D8","brvbar":"\u00A6","bscr":"\uD835\uDCB7","Bscr":"\u212C","bsemi":"\u204F","bsim":"\u223D","bsime":"\u22CD","bsolb":"\u29C5","bsol":"\\","bsolhsub":"\u27C8","bull":"\u2022","bullet":"\u2022","bump":"\u224E","bumpE":"\u2AAE","bumpe":"\u224F","Bumpeq":"\u224E","bumpeq":"\u224F","Cacute":"\u0106","cacute":"\u0107","capand":"\u2A44","capbrcup":"\u2A49","capcap":"\u2A4B","cap":"\u2229","Cap":"\u22D2","capcup":"\u2A47","capdot":"\u2A40","CapitalDifferentialD":"\u2145","caps":"\u2229\uFE00","caret":"\u2041","caron":"\u02C7","Cayleys":"\u212D","ccaps":"\u2A4D","Ccaron":"\u010C","ccaron":"\u010D","Ccedil":"\u00C7","ccedil":"\u00E7","Ccirc":"\u0108","ccirc":"\u0109","Cconint":"\u2230","ccups":"\u2A4C","ccupssm":"\u2A50","Cdot":"\u010A","cdot":"\u010B","cedil":"\u00B8","Cedilla":"\u00B8","cemptyv":"\u29B2","cent":"\u00A2","centerdot":"\u00B7","CenterDot":"\u00B7","cfr":"\uD835\uDD20","Cfr":"\u212D","CHcy":"\u0427","chcy":"\u0447","check":"\u2713","checkmark":"\u2713","Chi":"\u03A7","chi":"\u03C7","circ":"\u02C6","circeq":"\u2257","circlearrowleft":"\u21BA","circlearrowright":"\u21BB","circledast":"\u229B","circledcirc":"\u229A","circleddash":"\u229D","CircleDot":"\u2299","circledR":"\u00AE","circledS":"\u24C8","CircleMinus":"\u2296","CirclePlus":"\u2295","CircleTimes":"\u2297","cir":"\u25CB","cirE":"\u29C3","cire":"\u2257","cirfnint":"\u2A10","cirmid":"\u2AEF","cirscir":"\u29C2","ClockwiseContourIntegral":"\u2232","CloseCurlyDoubleQuote":"\u201D","CloseCurlyQuote":"\u2019","clubs":"\u2663","clubsuit":"\u2663","colon":":","Colon":"\u2237","Colone":"\u2A74","colone":"\u2254","coloneq":"\u2254","comma":",","commat":"@","comp":"\u2201","compfn":"\u2218","complement":"\u2201","complexes":"\u2102","cong":"\u2245","congdot":"\u2A6D","Congruent":"\u2261","conint":"\u222E","Conint":"\u222F","ContourIntegral":"\u222E","copf":"\uD835\uDD54","Copf":"\u2102","coprod":"\u2210","Coproduct":"\u2210","copy":"\u00A9","COPY":"\u00A9","copysr":"\u2117","CounterClockwiseContourIntegral":"\u2233","crarr":"\u21B5","cross":"\u2717","Cross":"\u2A2F","Cscr":"\uD835\uDC9E","cscr":"\uD835\uDCB8","csub":"\u2ACF","csube":"\u2AD1","csup":"\u2AD0","csupe":"\u2AD2","ctdot":"\u22EF","cudarrl":"\u2938","cudarrr":"\u2935","cuepr":"\u22DE","cuesc":"\u22DF","cularr":"\u21B6","cularrp":"\u293D","cupbrcap":"\u2A48","cupcap":"\u2A46","CupCap":"\u224D","cup":"\u222A","Cup":"\u22D3","cupcup":"\u2A4A","cupdot":"\u228D","cupor":"\u2A45","cups":"\u222A\uFE00","curarr":"\u21B7","curarrm":"\u293C","curlyeqprec":"\u22DE","curlyeqsucc":"\u22DF","curlyvee":"\u22CE","curlywedge":"\u22CF","curren":"\u00A4","curvearrowleft":"\u21B6","curvearrowright":"\u21B7","cuvee":"\u22CE","cuwed":"\u22CF","cwconint":"\u2232","cwint":"\u2231","cylcty":"\u232D","dagger":"\u2020","Dagger":"\u2021","daleth":"\u2138","darr":"\u2193","Darr":"\u21A1","dArr":"\u21D3","dash":"\u2010","Dashv":"\u2AE4","dashv":"\u22A3","dbkarow":"\u290F","dblac":"\u02DD","Dcaron":"\u010E","dcaron":"\u010F","Dcy":"\u0414","dcy":"\u0434","ddagger":"\u2021","ddarr":"\u21CA","DD":"\u2145","dd":"\u2146","DDotrahd":"\u2911","ddotseq":"\u2A77","deg":"\u00B0","Del":"\u2207","Delta":"\u0394","delta":"\u03B4","demptyv":"\u29B1","dfisht":"\u297F","Dfr":"\uD835\uDD07","dfr":"\uD835\uDD21","dHar":"\u2965","dharl":"\u21C3","dharr":"\u21C2","DiacriticalAcute":"\u00B4","DiacriticalDot":"\u02D9","DiacriticalDoubleAcute":"\u02DD","DiacriticalGrave":"`","DiacriticalTilde":"\u02DC","diam":"\u22C4","diamond":"\u22C4","Diamond":"\u22C4","diamondsuit":"\u2666","diams":"\u2666","die":"\u00A8","DifferentialD":"\u2146","digamma":"\u03DD","disin":"\u22F2","div":"\u00F7","divide":"\u00F7","divideontimes":"\u22C7","divonx":"\u22C7","DJcy":"\u0402","djcy":"\u0452","dlcorn":"\u231E","dlcrop":"\u230D","dollar":"$","Dopf":"\uD835\uDD3B","dopf":"\uD835\uDD55","Dot":"\u00A8","dot":"\u02D9","DotDot":"\u20DC","doteq":"\u2250","doteqdot":"\u2251","DotEqual":"\u2250","dotminus":"\u2238","dotplus":"\u2214","dotsquare":"\u22A1","doublebarwedge":"\u2306","DoubleContourIntegral":"\u222F","DoubleDot":"\u00A8","DoubleDownArrow":"\u21D3","DoubleLeftArrow":"\u21D0","DoubleLeftRightArrow":"\u21D4","DoubleLeftTee":"\u2AE4","DoubleLongLeftArrow":"\u27F8","DoubleLongLeftRightArrow":"\u27FA","DoubleLongRightArrow":"\u27F9","DoubleRightArrow":"\u21D2","DoubleRightTee":"\u22A8","DoubleUpArrow":"\u21D1","DoubleUpDownArrow":"\u21D5","DoubleVerticalBar":"\u2225","DownArrowBar":"\u2913","downarrow":"\u2193","DownArrow":"\u2193","Downarrow":"\u21D3","DownArrowUpArrow":"\u21F5","DownBreve":"\u0311","downdownarrows":"\u21CA","downharpoonleft":"\u21C3","downharpoonright":"\u21C2","DownLeftRightVector":"\u2950","DownLeftTeeVector":"\u295E","DownLeftVectorBar":"\u2956","DownLeftVector":"\u21BD","DownRightTeeVector":"\u295F","DownRightVectorBar":"\u2957","DownRightVector":"\u21C1","DownTeeArrow":"\u21A7","DownTee":"\u22A4","drbkarow":"\u2910","drcorn":"\u231F","drcrop":"\u230C","Dscr":"\uD835\uDC9F","dscr":"\uD835\uDCB9","DScy":"\u0405","dscy":"\u0455","dsol":"\u29F6","Dstrok":"\u0110","dstrok":"\u0111","dtdot":"\u22F1","dtri":"\u25BF","dtrif":"\u25BE","duarr":"\u21F5","duhar":"\u296F","dwangle":"\u29A6","DZcy":"\u040F","dzcy":"\u045F","dzigrarr":"\u27FF","Eacute":"\u00C9","eacute":"\u00E9","easter":"\u2A6E","Ecaron":"\u011A","ecaron":"\u011B","Ecirc":"\u00CA","ecirc":"\u00EA","ecir":"\u2256","ecolon":"\u2255","Ecy":"\u042D","ecy":"\u044D","eDDot":"\u2A77","Edot":"\u0116","edot":"\u0117","eDot":"\u2251","ee":"\u2147","efDot":"\u2252","Efr":"\uD835\uDD08","efr":"\uD835\uDD22","eg":"\u2A9A","Egrave":"\u00C8","egrave":"\u00E8","egs":"\u2A96","egsdot":"\u2A98","el":"\u2A99","Element":"\u2208","elinters":"\u23E7","ell":"\u2113","els":"\u2A95","elsdot":"\u2A97","Emacr":"\u0112","emacr":"\u0113","empty":"\u2205","emptyset":"\u2205","EmptySmallSquare":"\u25FB","emptyv":"\u2205","EmptyVerySmallSquare":"\u25AB","emsp13":"\u2004","emsp14":"\u2005","emsp":"\u2003","ENG":"\u014A","eng":"\u014B","ensp":"\u2002","Eogon":"\u0118","eogon":"\u0119","Eopf":"\uD835\uDD3C","eopf":"\uD835\uDD56","epar":"\u22D5","eparsl":"\u29E3","eplus":"\u2A71","epsi":"\u03B5","Epsilon":"\u0395","epsilon":"\u03B5","epsiv":"\u03F5","eqcirc":"\u2256","eqcolon":"\u2255","eqsim":"\u2242","eqslantgtr":"\u2A96","eqslantless":"\u2A95","Equal":"\u2A75","equals":"=","EqualTilde":"\u2242","equest":"\u225F","Equilibrium":"\u21CC","equiv":"\u2261","equivDD":"\u2A78","eqvparsl":"\u29E5","erarr":"\u2971","erDot":"\u2253","escr":"\u212F","Escr":"\u2130","esdot":"\u2250","Esim":"\u2A73","esim":"\u2242","Eta":"\u0397","eta":"\u03B7","ETH":"\u00D0","eth":"\u00F0","Euml":"\u00CB","euml":"\u00EB","euro":"\u20AC","excl":"!","exist":"\u2203","Exists":"\u2203","expectation":"\u2130","exponentiale":"\u2147","ExponentialE":"\u2147","fallingdotseq":"\u2252","Fcy":"\u0424","fcy":"\u0444","female":"\u2640","ffilig":"\uFB03","fflig":"\uFB00","ffllig":"\uFB04","Ffr":"\uD835\uDD09","ffr":"\uD835\uDD23","filig":"\uFB01","FilledSmallSquare":"\u25FC","FilledVerySmallSquare":"\u25AA","fjlig":"fj","flat":"\u266D","fllig":"\uFB02","fltns":"\u25B1","fnof":"\u0192","Fopf":"\uD835\uDD3D","fopf":"\uD835\uDD57","forall":"\u2200","ForAll":"\u2200","fork":"\u22D4","forkv":"\u2AD9","Fouriertrf":"\u2131","fpartint":"\u2A0D","frac12":"\u00BD","frac13":"\u2153","frac14":"\u00BC","frac15":"\u2155","frac16":"\u2159","frac18":"\u215B","frac23":"\u2154","frac25":"\u2156","frac34":"\u00BE","frac35":"\u2157","frac38":"\u215C","frac45":"\u2158","frac56":"\u215A","frac58":"\u215D","frac78":"\u215E","frasl":"\u2044","frown":"\u2322","fscr":"\uD835\uDCBB","Fscr":"\u2131","gacute":"\u01F5","Gamma":"\u0393","gamma":"\u03B3","Gammad":"\u03DC","gammad":"\u03DD","gap":"\u2A86","Gbreve":"\u011E","gbreve":"\u011F","Gcedil":"\u0122","Gcirc":"\u011C","gcirc":"\u011D","Gcy":"\u0413","gcy":"\u0433","Gdot":"\u0120","gdot":"\u0121","ge":"\u2265","gE":"\u2267","gEl":"\u2A8C","gel":"\u22DB","geq":"\u2265","geqq":"\u2267","geqslant":"\u2A7E","gescc":"\u2AA9","ges":"\u2A7E","gesdot":"\u2A80","gesdoto":"\u2A82","gesdotol":"\u2A84","gesl":"\u22DB\uFE00","gesles":"\u2A94","Gfr":"\uD835\uDD0A","gfr":"\uD835\uDD24","gg":"\u226B","Gg":"\u22D9","ggg":"\u22D9","gimel":"\u2137","GJcy":"\u0403","gjcy":"\u0453","gla":"\u2AA5","gl":"\u2277","glE":"\u2A92","glj":"\u2AA4","gnap":"\u2A8A","gnapprox":"\u2A8A","gne":"\u2A88","gnE":"\u2269","gneq":"\u2A88","gneqq":"\u2269","gnsim":"\u22E7","Gopf":"\uD835\uDD3E","gopf":"\uD835\uDD58","grave":"`","GreaterEqual":"\u2265","GreaterEqualLess":"\u22DB","GreaterFullEqual":"\u2267","GreaterGreater":"\u2AA2","GreaterLess":"\u2277","GreaterSlantEqual":"\u2A7E","GreaterTilde":"\u2273","Gscr":"\uD835\uDCA2","gscr":"\u210A","gsim":"\u2273","gsime":"\u2A8E","gsiml":"\u2A90","gtcc":"\u2AA7","gtcir":"\u2A7A","gt":">","GT":">","Gt":"\u226B","gtdot":"\u22D7","gtlPar":"\u2995","gtquest":"\u2A7C","gtrapprox":"\u2A86","gtrarr":"\u2978","gtrdot":"\u22D7","gtreqless":"\u22DB","gtreqqless":"\u2A8C","gtrless":"\u2277","gtrsim":"\u2273","gvertneqq":"\u2269\uFE00","gvnE":"\u2269\uFE00","Hacek":"\u02C7","hairsp":"\u200A","half":"\u00BD","hamilt":"\u210B","HARDcy":"\u042A","hardcy":"\u044A","harrcir":"\u2948","harr":"\u2194","hArr":"\u21D4","harrw":"\u21AD","Hat":"^","hbar":"\u210F","Hcirc":"\u0124","hcirc":"\u0125","hearts":"\u2665","heartsuit":"\u2665","hellip":"\u2026","hercon":"\u22B9","hfr":"\uD835\uDD25","Hfr":"\u210C","HilbertSpace":"\u210B","hksearow":"\u2925","hkswarow":"\u2926","hoarr":"\u21FF","homtht":"\u223B","hookleftarrow":"\u21A9","hookrightarrow":"\u21AA","hopf":"\uD835\uDD59","Hopf":"\u210D","horbar":"\u2015","HorizontalLine":"\u2500","hscr":"\uD835\uDCBD","Hscr":"\u210B","hslash":"\u210F","Hstrok":"\u0126","hstrok":"\u0127","HumpDownHump":"\u224E","HumpEqual":"\u224F","hybull":"\u2043","hyphen":"\u2010","Iacute":"\u00CD","iacute":"\u00ED","ic":"\u2063","Icirc":"\u00CE","icirc":"\u00EE","Icy":"\u0418","icy":"\u0438","Idot":"\u0130","IEcy":"\u0415","iecy":"\u0435","iexcl":"\u00A1","iff":"\u21D4","ifr":"\uD835\uDD26","Ifr":"\u2111","Igrave":"\u00CC","igrave":"\u00EC","ii":"\u2148","iiiint":"\u2A0C","iiint":"\u222D","iinfin":"\u29DC","iiota":"\u2129","IJlig":"\u0132","ijlig":"\u0133","Imacr":"\u012A","imacr":"\u012B","image":"\u2111","ImaginaryI":"\u2148","imagline":"\u2110","imagpart":"\u2111","imath":"\u0131","Im":"\u2111","imof":"\u22B7","imped":"\u01B5","Implies":"\u21D2","incare":"\u2105","in":"\u2208","infin":"\u221E","infintie":"\u29DD","inodot":"\u0131","intcal":"\u22BA","int":"\u222B","Int":"\u222C","integers":"\u2124","Integral":"\u222B","intercal":"\u22BA","Intersection":"\u22C2","intlarhk":"\u2A17","intprod":"\u2A3C","InvisibleComma":"\u2063","InvisibleTimes":"\u2062","IOcy":"\u0401","iocy":"\u0451","Iogon":"\u012E","iogon":"\u012F","Iopf":"\uD835\uDD40","iopf":"\uD835\uDD5A","Iota":"\u0399","iota":"\u03B9","iprod":"\u2A3C","iquest":"\u00BF","iscr":"\uD835\uDCBE","Iscr":"\u2110","isin":"\u2208","isindot":"\u22F5","isinE":"\u22F9","isins":"\u22F4","isinsv":"\u22F3","isinv":"\u2208","it":"\u2062","Itilde":"\u0128","itilde":"\u0129","Iukcy":"\u0406","iukcy":"\u0456","Iuml":"\u00CF","iuml":"\u00EF","Jcirc":"\u0134","jcirc":"\u0135","Jcy":"\u0419","jcy":"\u0439","Jfr":"\uD835\uDD0D","jfr":"\uD835\uDD27","jmath":"\u0237","Jopf":"\uD835\uDD41","jopf":"\uD835\uDD5B","Jscr":"\uD835\uDCA5","jscr":"\uD835\uDCBF","Jsercy":"\u0408","jsercy":"\u0458","Jukcy":"\u0404","jukcy":"\u0454","Kappa":"\u039A","kappa":"\u03BA","kappav":"\u03F0","Kcedil":"\u0136","kcedil":"\u0137","Kcy":"\u041A","kcy":"\u043A","Kfr":"\uD835\uDD0E","kfr":"\uD835\uDD28","kgreen":"\u0138","KHcy":"\u0425","khcy":"\u0445","KJcy":"\u040C","kjcy":"\u045C","Kopf":"\uD835\uDD42","kopf":"\uD835\uDD5C","Kscr":"\uD835\uDCA6","kscr":"\uD835\uDCC0","lAarr":"\u21DA","Lacute":"\u0139","lacute":"\u013A","laemptyv":"\u29B4","lagran":"\u2112","Lambda":"\u039B","lambda":"\u03BB","lang":"\u27E8","Lang":"\u27EA","langd":"\u2991","langle":"\u27E8","lap":"\u2A85","Laplacetrf":"\u2112","laquo":"\u00AB","larrb":"\u21E4","larrbfs":"\u291F","larr":"\u2190","Larr":"\u219E","lArr":"\u21D0","larrfs":"\u291D","larrhk":"\u21A9","larrlp":"\u21AB","larrpl":"\u2939","larrsim":"\u2973","larrtl":"\u21A2","latail":"\u2919","lAtail":"\u291B","lat":"\u2AAB","late":"\u2AAD","lates":"\u2AAD\uFE00","lbarr":"\u290C","lBarr":"\u290E","lbbrk":"\u2772","lbrace":"{","lbrack":"[","lbrke":"\u298B","lbrksld":"\u298F","lbrkslu":"\u298D","Lcaron":"\u013D","lcaron":"\u013E","Lcedil":"\u013B","lcedil":"\u013C","lceil":"\u2308","lcub":"{","Lcy":"\u041B","lcy":"\u043B","ldca":"\u2936","ldquo":"\u201C","ldquor":"\u201E","ldrdhar":"\u2967","ldrushar":"\u294B","ldsh":"\u21B2","le":"\u2264","lE":"\u2266","LeftAngleBracket":"\u27E8","LeftArrowBar":"\u21E4","leftarrow":"\u2190","LeftArrow":"\u2190","Leftarrow":"\u21D0","LeftArrowRightArrow":"\u21C6","leftarrowtail":"\u21A2","LeftCeiling":"\u2308","LeftDoubleBracket":"\u27E6","LeftDownTeeVector":"\u2961","LeftDownVectorBar":"\u2959","LeftDownVector":"\u21C3","LeftFloor":"\u230A","leftharpoondown":"\u21BD","leftharpoonup":"\u21BC","leftleftarrows":"\u21C7","leftrightarrow":"\u2194","LeftRightArrow":"\u2194","Leftrightarrow":"\u21D4","leftrightarrows":"\u21C6","leftrightharpoons":"\u21CB","leftrightsquigarrow":"\u21AD","LeftRightVector":"\u294E","LeftTeeArrow":"\u21A4","LeftTee":"\u22A3","LeftTeeVector":"\u295A","leftthreetimes":"\u22CB","LeftTriangleBar":"\u29CF","LeftTriangle":"\u22B2","LeftTriangleEqual":"\u22B4","LeftUpDownVector":"\u2951","LeftUpTeeVector":"\u2960","LeftUpVectorBar":"\u2958","LeftUpVector":"\u21BF","LeftVectorBar":"\u2952","LeftVector":"\u21BC","lEg":"\u2A8B","leg":"\u22DA","leq":"\u2264","leqq":"\u2266","leqslant":"\u2A7D","lescc":"\u2AA8","les":"\u2A7D","lesdot":"\u2A7F","lesdoto":"\u2A81","lesdotor":"\u2A83","lesg":"\u22DA\uFE00","lesges":"\u2A93","lessapprox":"\u2A85","lessdot":"\u22D6","lesseqgtr":"\u22DA","lesseqqgtr":"\u2A8B","LessEqualGreater":"\u22DA","LessFullEqual":"\u2266","LessGreater":"\u2276","lessgtr":"\u2276","LessLess":"\u2AA1","lesssim":"\u2272","LessSlantEqual":"\u2A7D","LessTilde":"\u2272","lfisht":"\u297C","lfloor":"\u230A","Lfr":"\uD835\uDD0F","lfr":"\uD835\uDD29","lg":"\u2276","lgE":"\u2A91","lHar":"\u2962","lhard":"\u21BD","lharu":"\u21BC","lharul":"\u296A","lhblk":"\u2584","LJcy":"\u0409","ljcy":"\u0459","llarr":"\u21C7","ll":"\u226A","Ll":"\u22D8","llcorner":"\u231E","Lleftarrow":"\u21DA","llhard":"\u296B","lltri":"\u25FA","Lmidot":"\u013F","lmidot":"\u0140","lmoustache":"\u23B0","lmoust":"\u23B0","lnap":"\u2A89","lnapprox":"\u2A89","lne":"\u2A87","lnE":"\u2268","lneq":"\u2A87","lneqq":"\u2268","lnsim":"\u22E6","loang":"\u27EC","loarr":"\u21FD","lobrk":"\u27E6","longleftarrow":"\u27F5","LongLeftArrow":"\u27F5","Longleftarrow":"\u27F8","longleftrightarrow":"\u27F7","LongLeftRightArrow":"\u27F7","Longleftrightarrow":"\u27FA","longmapsto":"\u27FC","longrightarrow":"\u27F6","LongRightArrow":"\u27F6","Longrightarrow":"\u27F9","looparrowleft":"\u21AB","looparrowright":"\u21AC","lopar":"\u2985","Lopf":"\uD835\uDD43","lopf":"\uD835\uDD5D","loplus":"\u2A2D","lotimes":"\u2A34","lowast":"\u2217","lowbar":"_","LowerLeftArrow":"\u2199","LowerRightArrow":"\u2198","loz":"\u25CA","lozenge":"\u25CA","lozf":"\u29EB","lpar":"(","lparlt":"\u2993","lrarr":"\u21C6","lrcorner":"\u231F","lrhar":"\u21CB","lrhard":"\u296D","lrm":"\u200E","lrtri":"\u22BF","lsaquo":"\u2039","lscr":"\uD835\uDCC1","Lscr":"\u2112","lsh":"\u21B0","Lsh":"\u21B0","lsim":"\u2272","lsime":"\u2A8D","lsimg":"\u2A8F","lsqb":"[","lsquo":"\u2018","lsquor":"\u201A","Lstrok":"\u0141","lstrok":"\u0142","ltcc":"\u2AA6","ltcir":"\u2A79","lt":"<","LT":"<","Lt":"\u226A","ltdot":"\u22D6","lthree":"\u22CB","ltimes":"\u22C9","ltlarr":"\u2976","ltquest":"\u2A7B","ltri":"\u25C3","ltrie":"\u22B4","ltrif":"\u25C2","ltrPar":"\u2996","lurdshar":"\u294A","luruhar":"\u2966","lvertneqq":"\u2268\uFE00","lvnE":"\u2268\uFE00","macr":"\u00AF","male":"\u2642","malt":"\u2720","maltese":"\u2720","Map":"\u2905","map":"\u21A6","mapsto":"\u21A6","mapstodown":"\u21A7","mapstoleft":"\u21A4","mapstoup":"\u21A5","marker":"\u25AE","mcomma":"\u2A29","Mcy":"\u041C","mcy":"\u043C","mdash":"\u2014","mDDot":"\u223A","measuredangle":"\u2221","MediumSpace":"\u205F","Mellintrf":"\u2133","Mfr":"\uD835\uDD10","mfr":"\uD835\uDD2A","mho":"\u2127","micro":"\u00B5","midast":"*","midcir":"\u2AF0","mid":"\u2223","middot":"\u00B7","minusb":"\u229F","minus":"\u2212","minusd":"\u2238","minusdu":"\u2A2A","MinusPlus":"\u2213","mlcp":"\u2ADB","mldr":"\u2026","mnplus":"\u2213","models":"\u22A7","Mopf":"\uD835\uDD44","mopf":"\uD835\uDD5E","mp":"\u2213","mscr":"\uD835\uDCC2","Mscr":"\u2133","mstpos":"\u223E","Mu":"\u039C","mu":"\u03BC","multimap":"\u22B8","mumap":"\u22B8","nabla":"\u2207","Nacute":"\u0143","nacute":"\u0144","nang":"\u2220\u20D2","nap":"\u2249","napE":"\u2A70\u0338","napid":"\u224B\u0338","napos":"\u0149","napprox":"\u2249","natural":"\u266E","naturals":"\u2115","natur":"\u266E","nbsp":"\u00A0","nbump":"\u224E\u0338","nbumpe":"\u224F\u0338","ncap":"\u2A43","Ncaron":"\u0147","ncaron":"\u0148","Ncedil":"\u0145","ncedil":"\u0146","ncong":"\u2247","ncongdot":"\u2A6D\u0338","ncup":"\u2A42","Ncy":"\u041D","ncy":"\u043D","ndash":"\u2013","nearhk":"\u2924","nearr":"\u2197","neArr":"\u21D7","nearrow":"\u2197","ne":"\u2260","nedot":"\u2250\u0338","NegativeMediumSpace":"\u200B","NegativeThickSpace":"\u200B","NegativeThinSpace":"\u200B","NegativeVeryThinSpace":"\u200B","nequiv":"\u2262","nesear":"\u2928","nesim":"\u2242\u0338","NestedGreaterGreater":"\u226B","NestedLessLess":"\u226A","NewLine":"\n","nexist":"\u2204","nexists":"\u2204","Nfr":"\uD835\uDD11","nfr":"\uD835\uDD2B","ngE":"\u2267\u0338","nge":"\u2271","ngeq":"\u2271","ngeqq":"\u2267\u0338","ngeqslant":"\u2A7E\u0338","nges":"\u2A7E\u0338","nGg":"\u22D9\u0338","ngsim":"\u2275","nGt":"\u226B\u20D2","ngt":"\u226F","ngtr":"\u226F","nGtv":"\u226B\u0338","nharr":"\u21AE","nhArr":"\u21CE","nhpar":"\u2AF2","ni":"\u220B","nis":"\u22FC","nisd":"\u22FA","niv":"\u220B","NJcy":"\u040A","njcy":"\u045A","nlarr":"\u219A","nlArr":"\u21CD","nldr":"\u2025","nlE":"\u2266\u0338","nle":"\u2270","nleftarrow":"\u219A","nLeftarrow":"\u21CD","nleftrightarrow":"\u21AE","nLeftrightarrow":"\u21CE","nleq":"\u2270","nleqq":"\u2266\u0338","nleqslant":"\u2A7D\u0338","nles":"\u2A7D\u0338","nless":"\u226E","nLl":"\u22D8\u0338","nlsim":"\u2274","nLt":"\u226A\u20D2","nlt":"\u226E","nltri":"\u22EA","nltrie":"\u22EC","nLtv":"\u226A\u0338","nmid":"\u2224","NoBreak":"\u2060","NonBreakingSpace":"\u00A0","nopf":"\uD835\uDD5F","Nopf":"\u2115","Not":"\u2AEC","not":"\u00AC","NotCongruent":"\u2262","NotCupCap":"\u226D","NotDoubleVerticalBar":"\u2226","NotElement":"\u2209","NotEqual":"\u2260","NotEqualTilde":"\u2242\u0338","NotExists":"\u2204","NotGreater":"\u226F","NotGreaterEqual":"\u2271","NotGreaterFullEqual":"\u2267\u0338","NotGreaterGreater":"\u226B\u0338","NotGreaterLess":"\u2279","NotGreaterSlantEqual":"\u2A7E\u0338","NotGreaterTilde":"\u2275","NotHumpDownHump":"\u224E\u0338","NotHumpEqual":"\u224F\u0338","notin":"\u2209","notindot":"\u22F5\u0338","notinE":"\u22F9\u0338","notinva":"\u2209","notinvb":"\u22F7","notinvc":"\u22F6","NotLeftTriangleBar":"\u29CF\u0338","NotLeftTriangle":"\u22EA","NotLeftTriangleEqual":"\u22EC","NotLess":"\u226E","NotLessEqual":"\u2270","NotLessGreater":"\u2278","NotLessLess":"\u226A\u0338","NotLessSlantEqual":"\u2A7D\u0338","NotLessTilde":"\u2274","NotNestedGreaterGreater":"\u2AA2\u0338","NotNestedLessLess":"\u2AA1\u0338","notni":"\u220C","notniva":"\u220C","notnivb":"\u22FE","notnivc":"\u22FD","NotPrecedes":"\u2280","NotPrecedesEqual":"\u2AAF\u0338","NotPrecedesSlantEqual":"\u22E0","NotReverseElement":"\u220C","NotRightTriangleBar":"\u29D0\u0338","NotRightTriangle":"\u22EB","NotRightTriangleEqual":"\u22ED","NotSquareSubset":"\u228F\u0338","NotSquareSubsetEqual":"\u22E2","NotSquareSuperset":"\u2290\u0338","NotSquareSupersetEqual":"\u22E3","NotSubset":"\u2282\u20D2","NotSubsetEqual":"\u2288","NotSucceeds":"\u2281","NotSucceedsEqual":"\u2AB0\u0338","NotSucceedsSlantEqual":"\u22E1","NotSucceedsTilde":"\u227F\u0338","NotSuperset":"\u2283\u20D2","NotSupersetEqual":"\u2289","NotTilde":"\u2241","NotTildeEqual":"\u2244","NotTildeFullEqual":"\u2247","NotTildeTilde":"\u2249","NotVerticalBar":"\u2224","nparallel":"\u2226","npar":"\u2226","nparsl":"\u2AFD\u20E5","npart":"\u2202\u0338","npolint":"\u2A14","npr":"\u2280","nprcue":"\u22E0","nprec":"\u2280","npreceq":"\u2AAF\u0338","npre":"\u2AAF\u0338","nrarrc":"\u2933\u0338","nrarr":"\u219B","nrArr":"\u21CF","nrarrw":"\u219D\u0338","nrightarrow":"\u219B","nRightarrow":"\u21CF","nrtri":"\u22EB","nrtrie":"\u22ED","nsc":"\u2281","nsccue":"\u22E1","nsce":"\u2AB0\u0338","Nscr":"\uD835\uDCA9","nscr":"\uD835\uDCC3","nshortmid":"\u2224","nshortparallel":"\u2226","nsim":"\u2241","nsime":"\u2244","nsimeq":"\u2244","nsmid":"\u2224","nspar":"\u2226","nsqsube":"\u22E2","nsqsupe":"\u22E3","nsub":"\u2284","nsubE":"\u2AC5\u0338","nsube":"\u2288","nsubset":"\u2282\u20D2","nsubseteq":"\u2288","nsubseteqq":"\u2AC5\u0338","nsucc":"\u2281","nsucceq":"\u2AB0\u0338","nsup":"\u2285","nsupE":"\u2AC6\u0338","nsupe":"\u2289","nsupset":"\u2283\u20D2","nsupseteq":"\u2289","nsupseteqq":"\u2AC6\u0338","ntgl":"\u2279","Ntilde":"\u00D1","ntilde":"\u00F1","ntlg":"\u2278","ntriangleleft":"\u22EA","ntrianglelefteq":"\u22EC","ntriangleright":"\u22EB","ntrianglerighteq":"\u22ED","Nu":"\u039D","nu":"\u03BD","num":"#","numero":"\u2116","numsp":"\u2007","nvap":"\u224D\u20D2","nvdash":"\u22AC","nvDash":"\u22AD","nVdash":"\u22AE","nVDash":"\u22AF","nvge":"\u2265\u20D2","nvgt":">\u20D2","nvHarr":"\u2904","nvinfin":"\u29DE","nvlArr":"\u2902","nvle":"\u2264\u20D2","nvlt":"<\u20D2","nvltrie":"\u22B4\u20D2","nvrArr":"\u2903","nvrtrie":"\u22B5\u20D2","nvsim":"\u223C\u20D2","nwarhk":"\u2923","nwarr":"\u2196","nwArr":"\u21D6","nwarrow":"\u2196","nwnear":"\u2927","Oacute":"\u00D3","oacute":"\u00F3","oast":"\u229B","Ocirc":"\u00D4","ocirc":"\u00F4","ocir":"\u229A","Ocy":"\u041E","ocy":"\u043E","odash":"\u229D","Odblac":"\u0150","odblac":"\u0151","odiv":"\u2A38","odot":"\u2299","odsold":"\u29BC","OElig":"\u0152","oelig":"\u0153","ofcir":"\u29BF","Ofr":"\uD835\uDD12","ofr":"\uD835\uDD2C","ogon":"\u02DB","Ograve":"\u00D2","ograve":"\u00F2","ogt":"\u29C1","ohbar":"\u29B5","ohm":"\u03A9","oint":"\u222E","olarr":"\u21BA","olcir":"\u29BE","olcross":"\u29BB","oline":"\u203E","olt":"\u29C0","Omacr":"\u014C","omacr":"\u014D","Omega":"\u03A9","omega":"\u03C9","Omicron":"\u039F","omicron":"\u03BF","omid":"\u29B6","ominus":"\u2296","Oopf":"\uD835\uDD46","oopf":"\uD835\uDD60","opar":"\u29B7","OpenCurlyDoubleQuote":"\u201C","OpenCurlyQuote":"\u2018","operp":"\u29B9","oplus":"\u2295","orarr":"\u21BB","Or":"\u2A54","or":"\u2228","ord":"\u2A5D","order":"\u2134","orderof":"\u2134","ordf":"\u00AA","ordm":"\u00BA","origof":"\u22B6","oror":"\u2A56","orslope":"\u2A57","orv":"\u2A5B","oS":"\u24C8","Oscr":"\uD835\uDCAA","oscr":"\u2134","Oslash":"\u00D8","oslash":"\u00F8","osol":"\u2298","Otilde":"\u00D5","otilde":"\u00F5","otimesas":"\u2A36","Otimes":"\u2A37","otimes":"\u2297","Ouml":"\u00D6","ouml":"\u00F6","ovbar":"\u233D","OverBar":"\u203E","OverBrace":"\u23DE","OverBracket":"\u23B4","OverParenthesis":"\u23DC","para":"\u00B6","parallel":"\u2225","par":"\u2225","parsim":"\u2AF3","parsl":"\u2AFD","part":"\u2202","PartialD":"\u2202","Pcy":"\u041F","pcy":"\u043F","percnt":"%","period":".","permil":"\u2030","perp":"\u22A5","pertenk":"\u2031","Pfr":"\uD835\uDD13","pfr":"\uD835\uDD2D","Phi":"\u03A6","phi":"\u03C6","phiv":"\u03D5","phmmat":"\u2133","phone":"\u260E","Pi":"\u03A0","pi":"\u03C0","pitchfork":"\u22D4","piv":"\u03D6","planck":"\u210F","planckh":"\u210E","plankv":"\u210F","plusacir":"\u2A23","plusb":"\u229E","pluscir":"\u2A22","plus":"+","plusdo":"\u2214","plusdu":"\u2A25","pluse":"\u2A72","PlusMinus":"\u00B1","plusmn":"\u00B1","plussim":"\u2A26","plustwo":"\u2A27","pm":"\u00B1","Poincareplane":"\u210C","pointint":"\u2A15","popf":"\uD835\uDD61","Popf":"\u2119","pound":"\u00A3","prap":"\u2AB7","Pr":"\u2ABB","pr":"\u227A","prcue":"\u227C","precapprox":"\u2AB7","prec":"\u227A","preccurlyeq":"\u227C","Precedes":"\u227A","PrecedesEqual":"\u2AAF","PrecedesSlantEqual":"\u227C","PrecedesTilde":"\u227E","preceq":"\u2AAF","precnapprox":"\u2AB9","precneqq":"\u2AB5","precnsim":"\u22E8","pre":"\u2AAF","prE":"\u2AB3","precsim":"\u227E","prime":"\u2032","Prime":"\u2033","primes":"\u2119","prnap":"\u2AB9","prnE":"\u2AB5","prnsim":"\u22E8","prod":"\u220F","Product":"\u220F","profalar":"\u232E","profline":"\u2312","profsurf":"\u2313","prop":"\u221D","Proportional":"\u221D","Proportion":"\u2237","propto":"\u221D","prsim":"\u227E","prurel":"\u22B0","Pscr":"\uD835\uDCAB","pscr":"\uD835\uDCC5","Psi":"\u03A8","psi":"\u03C8","puncsp":"\u2008","Qfr":"\uD835\uDD14","qfr":"\uD835\uDD2E","qint":"\u2A0C","qopf":"\uD835\uDD62","Qopf":"\u211A","qprime":"\u2057","Qscr":"\uD835\uDCAC","qscr":"\uD835\uDCC6","quaternions":"\u210D","quatint":"\u2A16","quest":"?","questeq":"\u225F","quot":"\"","QUOT":"\"","rAarr":"\u21DB","race":"\u223D\u0331","Racute":"\u0154","racute":"\u0155","radic":"\u221A","raemptyv":"\u29B3","rang":"\u27E9","Rang":"\u27EB","rangd":"\u2992","range":"\u29A5","rangle":"\u27E9","raquo":"\u00BB","rarrap":"\u2975","rarrb":"\u21E5","rarrbfs":"\u2920","rarrc":"\u2933","rarr":"\u2192","Rarr":"\u21A0","rArr":"\u21D2","rarrfs":"\u291E","rarrhk":"\u21AA","rarrlp":"\u21AC","rarrpl":"\u2945","rarrsim":"\u2974","Rarrtl":"\u2916","rarrtl":"\u21A3","rarrw":"\u219D","ratail":"\u291A","rAtail":"\u291C","ratio":"\u2236","rationals":"\u211A","rbarr":"\u290D","rBarr":"\u290F","RBarr":"\u2910","rbbrk":"\u2773","rbrace":"}","rbrack":"]","rbrke":"\u298C","rbrksld":"\u298E","rbrkslu":"\u2990","Rcaron":"\u0158","rcaron":"\u0159","Rcedil":"\u0156","rcedil":"\u0157","rceil":"\u2309","rcub":"}","Rcy":"\u0420","rcy":"\u0440","rdca":"\u2937","rdldhar":"\u2969","rdquo":"\u201D","rdquor":"\u201D","rdsh":"\u21B3","real":"\u211C","realine":"\u211B","realpart":"\u211C","reals":"\u211D","Re":"\u211C","rect":"\u25AD","reg":"\u00AE","REG":"\u00AE","ReverseElement":"\u220B","ReverseEquilibrium":"\u21CB","ReverseUpEquilibrium":"\u296F","rfisht":"\u297D","rfloor":"\u230B","rfr":"\uD835\uDD2F","Rfr":"\u211C","rHar":"\u2964","rhard":"\u21C1","rharu":"\u21C0","rharul":"\u296C","Rho":"\u03A1","rho":"\u03C1","rhov":"\u03F1","RightAngleBracket":"\u27E9","RightArrowBar":"\u21E5","rightarrow":"\u2192","RightArrow":"\u2192","Rightarrow":"\u21D2","RightArrowLeftArrow":"\u21C4","rightarrowtail":"\u21A3","RightCeiling":"\u2309","RightDoubleBracket":"\u27E7","RightDownTeeVector":"\u295D","RightDownVectorBar":"\u2955","RightDownVector":"\u21C2","RightFloor":"\u230B","rightharpoondown":"\u21C1","rightharpoonup":"\u21C0","rightleftarrows":"\u21C4","rightleftharpoons":"\u21CC","rightrightarrows":"\u21C9","rightsquigarrow":"\u219D","RightTeeArrow":"\u21A6","RightTee":"\u22A2","RightTeeVector":"\u295B","rightthreetimes":"\u22CC","RightTriangleBar":"\u29D0","RightTriangle":"\u22B3","RightTriangleEqual":"\u22B5","RightUpDownVector":"\u294F","RightUpTeeVector":"\u295C","RightUpVectorBar":"\u2954","RightUpVector":"\u21BE","RightVectorBar":"\u2953","RightVector":"\u21C0","ring":"\u02DA","risingdotseq":"\u2253","rlarr":"\u21C4","rlhar":"\u21CC","rlm":"\u200F","rmoustache":"\u23B1","rmoust":"\u23B1","rnmid":"\u2AEE","roang":"\u27ED","roarr":"\u21FE","robrk":"\u27E7","ropar":"\u2986","ropf":"\uD835\uDD63","Ropf":"\u211D","roplus":"\u2A2E","rotimes":"\u2A35","RoundImplies":"\u2970","rpar":")","rpargt":"\u2994","rppolint":"\u2A12","rrarr":"\u21C9","Rrightarrow":"\u21DB","rsaquo":"\u203A","rscr":"\uD835\uDCC7","Rscr":"\u211B","rsh":"\u21B1","Rsh":"\u21B1","rsqb":"]","rsquo":"\u2019","rsquor":"\u2019","rthree":"\u22CC","rtimes":"\u22CA","rtri":"\u25B9","rtrie":"\u22B5","rtrif":"\u25B8","rtriltri":"\u29CE","RuleDelayed":"\u29F4","ruluhar":"\u2968","rx":"\u211E","Sacute":"\u015A","sacute":"\u015B","sbquo":"\u201A","scap":"\u2AB8","Scaron":"\u0160","scaron":"\u0161","Sc":"\u2ABC","sc":"\u227B","sccue":"\u227D","sce":"\u2AB0","scE":"\u2AB4","Scedil":"\u015E","scedil":"\u015F","Scirc":"\u015C","scirc":"\u015D","scnap":"\u2ABA","scnE":"\u2AB6","scnsim":"\u22E9","scpolint":"\u2A13","scsim":"\u227F","Scy":"\u0421","scy":"\u0441","sdotb":"\u22A1","sdot":"\u22C5","sdote":"\u2A66","searhk":"\u2925","searr":"\u2198","seArr":"\u21D8","searrow":"\u2198","sect":"\u00A7","semi":";","seswar":"\u2929","setminus":"\u2216","setmn":"\u2216","sext":"\u2736","Sfr":"\uD835\uDD16","sfr":"\uD835\uDD30","sfrown":"\u2322","sharp":"\u266F","SHCHcy":"\u0429","shchcy":"\u0449","SHcy":"\u0428","shcy":"\u0448","ShortDownArrow":"\u2193","ShortLeftArrow":"\u2190","shortmid":"\u2223","shortparallel":"\u2225","ShortRightArrow":"\u2192","ShortUpArrow":"\u2191","shy":"\u00AD","Sigma":"\u03A3","sigma":"\u03C3","sigmaf":"\u03C2","sigmav":"\u03C2","sim":"\u223C","simdot":"\u2A6A","sime":"\u2243","simeq":"\u2243","simg":"\u2A9E","simgE":"\u2AA0","siml":"\u2A9D","simlE":"\u2A9F","simne":"\u2246","simplus":"\u2A24","simrarr":"\u2972","slarr":"\u2190","SmallCircle":"\u2218","smallsetminus":"\u2216","smashp":"\u2A33","smeparsl":"\u29E4","smid":"\u2223","smile":"\u2323","smt":"\u2AAA","smte":"\u2AAC","smtes":"\u2AAC\uFE00","SOFTcy":"\u042C","softcy":"\u044C","solbar":"\u233F","solb":"\u29C4","sol":"/","Sopf":"\uD835\uDD4A","sopf":"\uD835\uDD64","spades":"\u2660","spadesuit":"\u2660","spar":"\u2225","sqcap":"\u2293","sqcaps":"\u2293\uFE00","sqcup":"\u2294","sqcups":"\u2294\uFE00","Sqrt":"\u221A","sqsub":"\u228F","sqsube":"\u2291","sqsubset":"\u228F","sqsubseteq":"\u2291","sqsup":"\u2290","sqsupe":"\u2292","sqsupset":"\u2290","sqsupseteq":"\u2292","square":"\u25A1","Square":"\u25A1","SquareIntersection":"\u2293","SquareSubset":"\u228F","SquareSubsetEqual":"\u2291","SquareSuperset":"\u2290","SquareSupersetEqual":"\u2292","SquareUnion":"\u2294","squarf":"\u25AA","squ":"\u25A1","squf":"\u25AA","srarr":"\u2192","Sscr":"\uD835\uDCAE","sscr":"\uD835\uDCC8","ssetmn":"\u2216","ssmile":"\u2323","sstarf":"\u22C6","Star":"\u22C6","star":"\u2606","starf":"\u2605","straightepsilon":"\u03F5","straightphi":"\u03D5","strns":"\u00AF","sub":"\u2282","Sub":"\u22D0","subdot":"\u2ABD","subE":"\u2AC5","sube":"\u2286","subedot":"\u2AC3","submult":"\u2AC1","subnE":"\u2ACB","subne":"\u228A","subplus":"\u2ABF","subrarr":"\u2979","subset":"\u2282","Subset":"\u22D0","subseteq":"\u2286","subseteqq":"\u2AC5","SubsetEqual":"\u2286","subsetneq":"\u228A","subsetneqq":"\u2ACB","subsim":"\u2AC7","subsub":"\u2AD5","subsup":"\u2AD3","succapprox":"\u2AB8","succ":"\u227B","succcurlyeq":"\u227D","Succeeds":"\u227B","SucceedsEqual":"\u2AB0","SucceedsSlantEqual":"\u227D","SucceedsTilde":"\u227F","succeq":"\u2AB0","succnapprox":"\u2ABA","succneqq":"\u2AB6","succnsim":"\u22E9","succsim":"\u227F","SuchThat":"\u220B","sum":"\u2211","Sum":"\u2211","sung":"\u266A","sup1":"\u00B9","sup2":"\u00B2","sup3":"\u00B3","sup":"\u2283","Sup":"\u22D1","supdot":"\u2ABE","supdsub":"\u2AD8","supE":"\u2AC6","supe":"\u2287","supedot":"\u2AC4","Superset":"\u2283","SupersetEqual":"\u2287","suphsol":"\u27C9","suphsub":"\u2AD7","suplarr":"\u297B","supmult":"\u2AC2","supnE":"\u2ACC","supne":"\u228B","supplus":"\u2AC0","supset":"\u2283","Supset":"\u22D1","supseteq":"\u2287","supseteqq":"\u2AC6","supsetneq":"\u228B","supsetneqq":"\u2ACC","supsim":"\u2AC8","supsub":"\u2AD4","supsup":"\u2AD6","swarhk":"\u2926","swarr":"\u2199","swArr":"\u21D9","swarrow":"\u2199","swnwar":"\u292A","szlig":"\u00DF","Tab":"\t","target":"\u2316","Tau":"\u03A4","tau":"\u03C4","tbrk":"\u23B4","Tcaron":"\u0164","tcaron":"\u0165","Tcedil":"\u0162","tcedil":"\u0163","Tcy":"\u0422","tcy":"\u0442","tdot":"\u20DB","telrec":"\u2315","Tfr":"\uD835\uDD17","tfr":"\uD835\uDD31","there4":"\u2234","therefore":"\u2234","Therefore":"\u2234","Theta":"\u0398","theta":"\u03B8","thetasym":"\u03D1","thetav":"\u03D1","thickapprox":"\u2248","thicksim":"\u223C","ThickSpace":"\u205F\u200A","ThinSpace":"\u2009","thinsp":"\u2009","thkap":"\u2248","thksim":"\u223C","THORN":"\u00DE","thorn":"\u00FE","tilde":"\u02DC","Tilde":"\u223C","TildeEqual":"\u2243","TildeFullEqual":"\u2245","TildeTilde":"\u2248","timesbar":"\u2A31","timesb":"\u22A0","times":"\u00D7","timesd":"\u2A30","tint":"\u222D","toea":"\u2928","topbot":"\u2336","topcir":"\u2AF1","top":"\u22A4","Topf":"\uD835\uDD4B","topf":"\uD835\uDD65","topfork":"\u2ADA","tosa":"\u2929","tprime":"\u2034","trade":"\u2122","TRADE":"\u2122","triangle":"\u25B5","triangledown":"\u25BF","triangleleft":"\u25C3","trianglelefteq":"\u22B4","triangleq":"\u225C","triangleright":"\u25B9","trianglerighteq":"\u22B5","tridot":"\u25EC","trie":"\u225C","triminus":"\u2A3A","TripleDot":"\u20DB","triplus":"\u2A39","trisb":"\u29CD","tritime":"\u2A3B","trpezium":"\u23E2","Tscr":"\uD835\uDCAF","tscr":"\uD835\uDCC9","TScy":"\u0426","tscy":"\u0446","TSHcy":"\u040B","tshcy":"\u045B","Tstrok":"\u0166","tstrok":"\u0167","twixt":"\u226C","twoheadleftarrow":"\u219E","twoheadrightarrow":"\u21A0","Uacute":"\u00DA","uacute":"\u00FA","uarr":"\u2191","Uarr":"\u219F","uArr":"\u21D1","Uarrocir":"\u2949","Ubrcy":"\u040E","ubrcy":"\u045E","Ubreve":"\u016C","ubreve":"\u016D","Ucirc":"\u00DB","ucirc":"\u00FB","Ucy":"\u0423","ucy":"\u0443","udarr":"\u21C5","Udblac":"\u0170","udblac":"\u0171","udhar":"\u296E","ufisht":"\u297E","Ufr":"\uD835\uDD18","ufr":"\uD835\uDD32","Ugrave":"\u00D9","ugrave":"\u00F9","uHar":"\u2963","uharl":"\u21BF","uharr":"\u21BE","uhblk":"\u2580","ulcorn":"\u231C","ulcorner":"\u231C","ulcrop":"\u230F","ultri":"\u25F8","Umacr":"\u016A","umacr":"\u016B","uml":"\u00A8","UnderBar":"_","UnderBrace":"\u23DF","UnderBracket":"\u23B5","UnderParenthesis":"\u23DD","Union":"\u22C3","UnionPlus":"\u228E","Uogon":"\u0172","uogon":"\u0173","Uopf":"\uD835\uDD4C","uopf":"\uD835\uDD66","UpArrowBar":"\u2912","uparrow":"\u2191","UpArrow":"\u2191","Uparrow":"\u21D1","UpArrowDownArrow":"\u21C5","updownarrow":"\u2195","UpDownArrow":"\u2195","Updownarrow":"\u21D5","UpEquilibrium":"\u296E","upharpoonleft":"\u21BF","upharpoonright":"\u21BE","uplus":"\u228E","UpperLeftArrow":"\u2196","UpperRightArrow":"\u2197","upsi":"\u03C5","Upsi":"\u03D2","upsih":"\u03D2","Upsilon":"\u03A5","upsilon":"\u03C5","UpTeeArrow":"\u21A5","UpTee":"\u22A5","upuparrows":"\u21C8","urcorn":"\u231D","urcorner":"\u231D","urcrop":"\u230E","Uring":"\u016E","uring":"\u016F","urtri":"\u25F9","Uscr":"\uD835\uDCB0","uscr":"\uD835\uDCCA","utdot":"\u22F0","Utilde":"\u0168","utilde":"\u0169","utri":"\u25B5","utrif":"\u25B4","uuarr":"\u21C8","Uuml":"\u00DC","uuml":"\u00FC","uwangle":"\u29A7","vangrt":"\u299C","varepsilon":"\u03F5","varkappa":"\u03F0","varnothing":"\u2205","varphi":"\u03D5","varpi":"\u03D6","varpropto":"\u221D","varr":"\u2195","vArr":"\u21D5","varrho":"\u03F1","varsigma":"\u03C2","varsubsetneq":"\u228A\uFE00","varsubsetneqq":"\u2ACB\uFE00","varsupsetneq":"\u228B\uFE00","varsupsetneqq":"\u2ACC\uFE00","vartheta":"\u03D1","vartriangleleft":"\u22B2","vartriangleright":"\u22B3","vBar":"\u2AE8","Vbar":"\u2AEB","vBarv":"\u2AE9","Vcy":"\u0412","vcy":"\u0432","vdash":"\u22A2","vDash":"\u22A8","Vdash":"\u22A9","VDash":"\u22AB","Vdashl":"\u2AE6","veebar":"\u22BB","vee":"\u2228","Vee":"\u22C1","veeeq":"\u225A","vellip":"\u22EE","verbar":"|","Verbar":"\u2016","vert":"|","Vert":"\u2016","VerticalBar":"\u2223","VerticalLine":"|","VerticalSeparator":"\u2758","VerticalTilde":"\u2240","VeryThinSpace":"\u200A","Vfr":"\uD835\uDD19","vfr":"\uD835\uDD33","vltri":"\u22B2","vnsub":"\u2282\u20D2","vnsup":"\u2283\u20D2","Vopf":"\uD835\uDD4D","vopf":"\uD835\uDD67","vprop":"\u221D","vrtri":"\u22B3","Vscr":"\uD835\uDCB1","vscr":"\uD835\uDCCB","vsubnE":"\u2ACB\uFE00","vsubne":"\u228A\uFE00","vsupnE":"\u2ACC\uFE00","vsupne":"\u228B\uFE00","Vvdash":"\u22AA","vzigzag":"\u299A","Wcirc":"\u0174","wcirc":"\u0175","wedbar":"\u2A5F","wedge":"\u2227","Wedge":"\u22C0","wedgeq":"\u2259","weierp":"\u2118","Wfr":"\uD835\uDD1A","wfr":"\uD835\uDD34","Wopf":"\uD835\uDD4E","wopf":"\uD835\uDD68","wp":"\u2118","wr":"\u2240","wreath":"\u2240","Wscr":"\uD835\uDCB2","wscr":"\uD835\uDCCC","xcap":"\u22C2","xcirc":"\u25EF","xcup":"\u22C3","xdtri":"\u25BD","Xfr":"\uD835\uDD1B","xfr":"\uD835\uDD35","xharr":"\u27F7","xhArr":"\u27FA","Xi":"\u039E","xi":"\u03BE","xlarr":"\u27F5","xlArr":"\u27F8","xmap":"\u27FC","xnis":"\u22FB","xodot":"\u2A00","Xopf":"\uD835\uDD4F","xopf":"\uD835\uDD69","xoplus":"\u2A01","xotime":"\u2A02","xrarr":"\u27F6","xrArr":"\u27F9","Xscr":"\uD835\uDCB3","xscr":"\uD835\uDCCD","xsqcup":"\u2A06","xuplus":"\u2A04","xutri":"\u25B3","xvee":"\u22C1","xwedge":"\u22C0","Yacute":"\u00DD","yacute":"\u00FD","YAcy":"\u042F","yacy":"\u044F","Ycirc":"\u0176","ycirc":"\u0177","Ycy":"\u042B","ycy":"\u044B","yen":"\u00A5","Yfr":"\uD835\uDD1C","yfr":"\uD835\uDD36","YIcy":"\u0407","yicy":"\u0457","Yopf":"\uD835\uDD50","yopf":"\uD835\uDD6A","Yscr":"\uD835\uDCB4","yscr":"\uD835\uDCCE","YUcy":"\u042E","yucy":"\u044E","yuml":"\u00FF","Yuml":"\u0178","Zacute":"\u0179","zacute":"\u017A","Zcaron":"\u017D","zcaron":"\u017E","Zcy":"\u0417","zcy":"\u0437","Zdot":"\u017B","zdot":"\u017C","zeetrf":"\u2128","ZeroWidthSpace":"\u200B","Zeta":"\u0396","zeta":"\u03B6","zfr":"\uD835\uDD37","Zfr":"\u2128","ZHcy":"\u0416","zhcy":"\u0436","zigrarr":"\u21DD","zopf":"\uD835\uDD6B","Zopf":"\u2124","Zscr":"\uD835\uDCB5","zscr":"\uD835\uDCCF","zwj":"\u200D","zwnj":"\u200C"}
},{}],36:[function(require,module,exports){
module.exports={"Aacute":"\u00C1","aacute":"\u00E1","Acirc":"\u00C2","acirc":"\u00E2","acute":"\u00B4","AElig":"\u00C6","aelig":"\u00E6","Agrave":"\u00C0","agrave":"\u00E0","amp":"&","AMP":"&","Aring":"\u00C5","aring":"\u00E5","Atilde":"\u00C3","atilde":"\u00E3","Auml":"\u00C4","auml":"\u00E4","brvbar":"\u00A6","Ccedil":"\u00C7","ccedil":"\u00E7","cedil":"\u00B8","cent":"\u00A2","copy":"\u00A9","COPY":"\u00A9","curren":"\u00A4","deg":"\u00B0","divide":"\u00F7","Eacute":"\u00C9","eacute":"\u00E9","Ecirc":"\u00CA","ecirc":"\u00EA","Egrave":"\u00C8","egrave":"\u00E8","ETH":"\u00D0","eth":"\u00F0","Euml":"\u00CB","euml":"\u00EB","frac12":"\u00BD","frac14":"\u00BC","frac34":"\u00BE","gt":">","GT":">","Iacute":"\u00CD","iacute":"\u00ED","Icirc":"\u00CE","icirc":"\u00EE","iexcl":"\u00A1","Igrave":"\u00CC","igrave":"\u00EC","iquest":"\u00BF","Iuml":"\u00CF","iuml":"\u00EF","laquo":"\u00AB","lt":"<","LT":"<","macr":"\u00AF","micro":"\u00B5","middot":"\u00B7","nbsp":"\u00A0","not":"\u00AC","Ntilde":"\u00D1","ntilde":"\u00F1","Oacute":"\u00D3","oacute":"\u00F3","Ocirc":"\u00D4","ocirc":"\u00F4","Ograve":"\u00D2","ograve":"\u00F2","ordf":"\u00AA","ordm":"\u00BA","Oslash":"\u00D8","oslash":"\u00F8","Otilde":"\u00D5","otilde":"\u00F5","Ouml":"\u00D6","ouml":"\u00F6","para":"\u00B6","plusmn":"\u00B1","pound":"\u00A3","quot":"\"","QUOT":"\"","raquo":"\u00BB","reg":"\u00AE","REG":"\u00AE","sect":"\u00A7","shy":"\u00AD","sup1":"\u00B9","sup2":"\u00B2","sup3":"\u00B3","szlig":"\u00DF","THORN":"\u00DE","thorn":"\u00FE","times":"\u00D7","Uacute":"\u00DA","uacute":"\u00FA","Ucirc":"\u00DB","ucirc":"\u00FB","Ugrave":"\u00D9","ugrave":"\u00F9","uml":"\u00A8","Uuml":"\u00DC","uuml":"\u00FC","Yacute":"\u00DD","yacute":"\u00FD","yen":"\u00A5","yuml":"\u00FF"}
},{}],37:[function(require,module,exports){
module.exports={"amp":"&","apos":"'","gt":">","lt":"<","quot":"\""}

},{}],38:[function(require,module,exports){
var base       = require('./lib/base');
var SafeString = require('./lib/safe-string');
var Exception  = require('./lib/exception');
var Utils      = require('./lib/utils');
var Events     = require('./lib/events');
var runtime    = require('./lib/runtime');

// Extend the DOMBars prototype with event emitter functionality.
Utils.extend(base.DOMBarsEnvironment.prototype, Events);

module.exports = (function create () {
  var db = new base.DOMBarsEnvironment();

  Utils.extend(db, base);
  db.VM         = runtime;
  db.Utils      = Utils;
  db.create     = create;
  db.Exception  = Exception;
  db.SafeString = SafeString;

  db.template = function (spec) {
    return runtime.template(spec, db);
  };

  return db;
})();

},{"./lib/base":2,"./lib/events":10,"./lib/exception":11,"./lib/runtime":13,"./lib/safe-string":14,"./lib/utils":16}]},{},[1])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9kb21iYXJzLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbGliL2Jhc2UuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvY29tcGlsZXIvYXN0LmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbGliL2NvbXBpbGVyL2F0dHJpYnV0ZS1jb21waWxlci5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi9jb21waWxlci9iYXNlLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbGliL2NvbXBpbGVyL2NvbW1vbi1jb21waWxlci5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi9jb21waWxlci9jb21waWxlci5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi9jb21waWxlci9qYXZhc2NyaXB0LWNvbXBpbGVyLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbGliL2NvbXBpbGVyL3BhcnNlci5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi9ldmVudHMuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvZXhjZXB0aW9uLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbGliL3JhZi5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi9ydW50aW1lLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbGliL3NhZmUtc3RyaW5nLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbGliL3RyYWNrLW5vZGUuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvdXRpbHMuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9pbmhlcml0cy9pbmhlcml0c19icm93c2VyLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2luc2VydC1tb2R1bGUtZ2xvYmFscy9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3V0aWwvc3VwcG9ydC9pc0J1ZmZlckJyb3dzZXIuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvdXRpbC91dGlsLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9iYXNlLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9jb21waWxlci9hc3QuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL2NvbXBpbGVyL2Jhc2UuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL2NvbXBpbGVyL2NvbXBpbGVyLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9jb21waWxlci9qYXZhc2NyaXB0LWNvbXBpbGVyLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9jb21waWxlci9wYXJzZXIuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL2V4Y2VwdGlvbi5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvcnVudGltZS5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvc2FmZS1zdHJpbmcuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL3V0aWxzLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2h0bWxwYXJzZXIyL2xpYi9QYXJzZXIuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvaHRtbHBhcnNlcjIvbGliL1Rva2VuaXplci5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9odG1scGFyc2VyMi9saWIvZW50aXRpZXMvZGVjb2RlLmpzb24iLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvaHRtbHBhcnNlcjIvbGliL2VudGl0aWVzL2VudGl0aWVzLmpzb24iLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvaHRtbHBhcnNlcjIvbGliL2VudGl0aWVzL2xlZ2FjeS5qc29uIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2h0bWxwYXJzZXIyL2xpYi9lbnRpdGllcy94bWwuanNvbiIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL3J1bnRpbWUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2UEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0ZBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6akJBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFrQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25MQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuZUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1MkJBO0FBQ0E7O0FDREE7O0FDQUE7O0FDQUE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgRE9NQmFycyAgICAgICAgICAgID0gcmVxdWlyZSgnLi9ydW50aW1lJyk7XG52YXIgQVNUICAgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi9saWIvY29tcGlsZXIvYXN0Jyk7XG52YXIgYmFzZSAgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi9saWIvY29tcGlsZXIvYmFzZScpO1xudmFyIENvbXBpbGVyICAgICAgICAgICA9IHJlcXVpcmUoJy4vbGliL2NvbXBpbGVyL2NvbXBpbGVyJyk7XG52YXIgSmF2YVNjcmlwdENvbXBpbGVyID0gcmVxdWlyZSgnLi9saWIvY29tcGlsZXIvamF2YXNjcmlwdC1jb21waWxlcicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbiBjcmVhdGUgKCkge1xuICB2YXIgZGIgPSBET01CYXJzLmNyZWF0ZSgpO1xuXG4gIGRiLmNvbXBpbGUgPSBmdW5jdGlvbiAoaW5wdXQsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gQ29tcGlsZXIuY29tcGlsZShpbnB1dCwgb3B0aW9ucywgZGIpO1xuICB9O1xuXG4gIGRiLmNyZWF0ZSAgICAgICAgICAgICA9IGNyZWF0ZTtcbiAgZGIucHJlY29tcGlsZSAgICAgICAgID0gQ29tcGlsZXIucHJlY29tcGlsZTtcbiAgZGIuQVNUICAgICAgICAgICAgICAgID0gQVNUO1xuICBkYi5Db21waWxlciAgICAgICAgICAgPSBDb21waWxlci5Db21waWxlcjtcbiAgZGIuSmF2YVNjcmlwdENvbXBpbGVyID0gSmF2YVNjcmlwdENvbXBpbGVyO1xuICBkYi5wYXJzZSAgICAgICAgICAgICAgPSBiYXNlLnBhcnNlO1xuICBkYi5QYXJzZXIgICAgICAgICAgICAgPSBiYXNlLnBhcnNlcjtcblxuICByZXR1cm4gZGI7XG59KSgpO1xuIiwidmFyIGhic0Jhc2UgICAgICAgICAgICAgICA9IHJlcXVpcmUoJ2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9iYXNlJyk7XG52YXIgVXRpbHMgICAgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi91dGlscycpO1xudmFyIEhhbmRsZWJhcnNFbnZpcm9ubWVudCA9IGhic0Jhc2UuSGFuZGxlYmFyc0Vudmlyb25tZW50O1xuXG4vKipcbiAqIEV4dGVuZCBIYW5kbGViYXJzIGJhc2Ugb2JqZWN0IHdpdGggY3VzdG9tIGZ1bmN0aW9uYWxpdHkuXG4gKlxuICogQHR5cGUge09iamVjdH1cbiAqL1xudmFyIGJhc2UgPSBtb2R1bGUuZXhwb3J0cyA9IFV0aWxzLmNyZWF0ZShoYnNCYXNlKTtcblxuLyoqXG4gKiBXcmFwIG9sZC1zdHlsZSBIYW5kbGViYXJzIGhlbHBlcnMgd2l0aCB0aGUgdXBkYXRlZCBvYmplY3Qgc3ludGF4IHJldHVybi5cbiAqXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gaGVscGVyXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqL1xudmFyIHdyYXBPbGRIZWxwZXIgPSBmdW5jdGlvbiAoaGVscGVyKSB7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHJlc3VsdCA9IGhlbHBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgLy8gTmVlZCBhIHNwZWNpYWwgaGFuZGxlciBmb3IgdGhlIGB3aXRoYCBoZWxwZXIgd2hpY2ggd29uJ3QgYWx3YXlzIGV4ZWN1dGUuXG4gICAgcmV0dXJuIHJlc3VsdCA9PSBudWxsID8gcmVzdWx0IDogcmVzdWx0LnZhbHVlO1xuICB9O1xufTtcblxuLyoqXG4gKiBSZWdpc3RlciBET01CYXJzIGhlbHBlcnMgb24gdGhlIHBhc3NlZCBpbiBET01CYXJzIGluc3RhbmNlLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBpbnN0YW5jZVxuICovXG52YXIgcmVnaXN0ZXJEZWZhdWx0SGVscGVycyA9IGZ1bmN0aW9uIChpbnN0YW5jZSkge1xuICAvKipcbiAgICogVGhlIGhhbmRsZWJhcnMgYGVhY2hgIGhlbHBlciBpcyBpbmNvbXBhdGliYWJsZSB3aXRoIERPTUJhcnMsIHNpbmNlIGl0XG4gICAqIGFzc3VtZXMgc3RyaW5nIGNvbmNhdGluYXRpb24gKGFzIG9wcG9zZWQgdG8gZG9jdW1lbnQgZnJhZ21lbnRzKS5cbiAgICpcbiAgICogQHBhcmFtICB7T2JqZWN0fSBjb250ZXh0XG4gICAqIEBwYXJhbSAge09iamVjdH0gb3B0aW9uc1xuICAgKiBAcmV0dXJuIHtOb2RlfVxuICAgKi9cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2VhY2gnLCBmdW5jdGlvbiAoY29udGV4dCwgb3B0aW9ucykge1xuICAgIHZhciBmbiAgICAgICA9IG9wdGlvbnMuZm47XG4gICAgdmFyIGludmVyc2UgID0gb3B0aW9ucy5pbnZlcnNlO1xuICAgIHZhciBmcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICB2YXIgaSAgICAgICAgPSAwO1xuICAgIHZhciBkYXRhO1xuXG4gICAgaWYgKHR5cGVvZiBjb250ZXh0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLmRhdGEpIHtcbiAgICAgIGRhdGEgPSBVdGlscy5jcmVhdGUob3B0aW9ucy5kYXRhKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGNvbnRleHQgPT09ICdvYmplY3QnKSB7XG4gICAgICB2YXIgbGVuID0gY29udGV4dC5sZW5ndGg7XG5cbiAgICAgIGlmIChsZW4gPT09ICtsZW4pIHtcbiAgICAgICAgZm9yICg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgIGRhdGEuaW5kZXggPSBpO1xuICAgICAgICAgIGRhdGEuZmlyc3QgPSAoaSA9PT0gMCk7XG4gICAgICAgICAgZGF0YS5sYXN0ICA9IChpID09PSBsZW4gLSAxKTtcblxuICAgICAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKGZuKGNvbnRleHRbaV0sIHsgZGF0YTogZGF0YSB9KS52YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBjb250ZXh0KSB7XG4gICAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChjb250ZXh0LCBrZXkpKSB7XG4gICAgICAgICAgICBpICs9IDE7XG5cbiAgICAgICAgICAgIGRhdGEua2V5ICAgPSBrZXk7XG4gICAgICAgICAgICBkYXRhLmluZGV4ID0gaTtcbiAgICAgICAgICAgIGRhdGEuZmlyc3QgPSAoaSA9PT0gMCk7XG5cbiAgICAgICAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKGZuKGNvbnRleHRba2V5XSwgeyBkYXRhOiBkYXRhIH0pLnZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoaSA9PT0gMCkge1xuICAgICAgcmV0dXJuIGludmVyc2UodGhpcykudmFsdWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZyYWdtZW50O1xuICB9KTtcblxuICAvLyBSZWdpc3RlciB1cGRhdGVkIEhhbmRsZWJhcnMgaGVscGVycy5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoe1xuICAgICdpZic6ICAgICAgICAgICAgICAgICB3cmFwT2xkSGVscGVyKGluc3RhbmNlLmhlbHBlcnMuaWYpLFxuICAgICd3aXRoJzogICAgICAgICAgICAgICB3cmFwT2xkSGVscGVyKGluc3RhbmNlLmhlbHBlcnMud2l0aCksXG4gICAgJ2Jsb2NrSGVscGVyTWlzc2luZyc6IHdyYXBPbGRIZWxwZXIoaW5zdGFuY2UuaGVscGVycy5ibG9ja0hlbHBlck1pc3NpbmcpXG4gIH0pO1xufTtcblxuLyoqXG4gKiBDcmVhdGUgYSBjdXN0b20gRE9NQmFycyBlbnZpcm9ubWVudCB0byBtYXRjaCBIYW5kbGViYXJzRW52aXJvbm1lbnQuXG4gKi9cbnZhciBET01CYXJzRW52aXJvbm1lbnQgPSBiYXNlLkRPTUJhcnNFbnZpcm9ubWVudCA9IGZ1bmN0aW9uICgpIHtcbiAgSGFuZGxlYmFyc0Vudmlyb25tZW50LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIHJlZ2lzdGVyRGVmYXVsdEhlbHBlcnModGhpcyk7XG59O1xuXG4vKipcbiAqIEV4dGVuZCB0aGUgSGFuZGxlYmFyc0Vudmlyb25tZW50IHByb3RvdHlwZS5cbiAqXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG52YXIgZW52UHJvdG90eXBlID0gRE9NQmFyc0Vudmlyb25tZW50LnByb3RvdHlwZSA9IFV0aWxzLmNyZWF0ZShcbiAgSGFuZGxlYmFyc0Vudmlyb25tZW50LnByb3RvdHlwZVxuKTtcblxuLyoqXG4gKiBBbGlhcyBzb21lIHVzZWZ1bCBmdW5jdGlvbmFsaXR5IHRoYXQgaXMgZXhwZWN0ZWQgdG8gYmUgZXhwb3NlZCBvbiB0aGUgcm9vdFxuICogb2JqZWN0LlxuICovXG5lbnZQcm90b3R5cGUuY3JlYXRlRnJhbWUgICAgICAgPSBoYnNCYXNlLmNyZWF0ZUZyYW1lO1xuZW52UHJvdG90eXBlLlJFVklTSU9OX0NIQU5HRVMgID0gaGJzQmFzZS5SRVZJU0lPTl9DSEFOR0VTO1xuZW52UHJvdG90eXBlLkNPTVBJTEVSX1JFVklTSU9OID0gaGJzQmFzZS5DT01QSUxFUl9SRVZJU0lPTjtcblxuLyoqXG4gKiBUaGUgYmFzaWMgZ2V0dGVyIGZ1bmN0aW9uLiBPdmVycmlkZSB0aGlzIHdpdGggc29tZXRoaW5nIGVsc2UgYmFzZWQgb24geW91clxuICogcHJvamVjdC4gRm9yIGV4YW1wbGUsIEJhY2tib25lLmpzIG1vZGVscy5cbiAqXG4gKiBAcGFyYW0gIHtPYmplY3R9IG9iamVjdFxuICogQHBhcmFtICB7U3RyaW5nfSBwcm9wZXJ0eVxuICogQHJldHVybiB7Kn1cbiAqL1xuZW52UHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChvYmplY3QsIHByb3BlcnR5KSB7XG4gIHJldHVybiBvYmplY3RbcHJvcGVydHldO1xufTtcblxuLyoqXG4gKiBOb29wIGZ1bmN0aW9ucyBmb3Igc3Vic2NyaWJlIGFuZCB1bnN1YnNjcmliZS4gT3ZlcnJpZGUgd2l0aCBjdXN0b21cbiAqIGZ1bmN0aW9uYWxpdHkuXG4gKi9cbmVudlByb3RvdHlwZS5zdWJzY3JpYmUgPSBlbnZQcm90b3R5cGUudW5zdWJzY3JpYmUgPSBmdW5jdGlvbiAoKSB7fTtcbiIsInZhciBoYnNBU1QgPSByZXF1aXJlKCdoYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvY29tcGlsZXIvYXN0JykuZGVmYXVsdDtcbnZhciBVdGlscyAgPSByZXF1aXJlKCcuLi91dGlscycpO1xuXG4vKipcbiAqIEV4dGVuZCB0aGUgSGFuZGxlYmFycyBBU1Qgd2l0aCBET00gbm9kZXMuXG4gKlxuICogQHR5cGUge09iamVjdH1cbiAqL1xudmFyIEFTVCA9IG1vZHVsZS5leHBvcnRzID0gVXRpbHMuY3JlYXRlKGhic0FTVCk7XG5cbi8qKlxuICogQ3JlYXRlIGFuIEFTVCBub2RlIGZvciByZXByZXNlbnRpbmcgYW4gZWxlbWVudC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gbmFtZVxuICogQHBhcmFtIHtPYmplY3R9IGF0dHJpYnV0ZXNcbiAqIEBwYXJhbSB7T2JqZWN0fSBjb250ZW50XG4gKi9cbkFTVC5ET01FbGVtZW50ID0gZnVuY3Rpb24gKG5hbWUsIGF0dHJpYnV0ZXMsIGNvbnRlbnQpIHtcbiAgdGhpcy50eXBlICAgICAgID0gJ0RPTV9FTEVNRU5UJztcbiAgdGhpcy5uYW1lICAgICAgID0gbmFtZTtcbiAgdGhpcy5hdHRyaWJ1dGVzID0gYXR0cmlidXRlcztcbiAgdGhpcy5jb250ZW50ICAgID0gY29udGVudDtcbn07XG5cbi8qKlxuICogQ3JlYXRlIGFuIEFTVCBub2RlIGZvciByZXByZXNlbnRpbmcgYW4gZWxlbWVudCBhdHRyaWJ1dGUuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG5hbWVcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZVxuICovXG5BU1QuRE9NQXR0cmlidXRlID0gZnVuY3Rpb24gKG5hbWUsIHZhbHVlKSB7XG4gIHRoaXMudHlwZSAgPSAnRE9NX0FUVFJJQlVURSc7XG4gIHRoaXMubmFtZSAgPSBuYW1lO1xuICB0aGlzLnZhbHVlID0gdmFsdWU7XG59O1xuXG4vKipcbiAqIENyZWF0ZSBhbiBBU1Qgbm9kZSBmb3IgcmVwcmVzZW50aW5nIGEgY29tbWVudCBub2RlLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB0ZXh0XG4gKi9cbkFTVC5ET01Db21tZW50ID0gZnVuY3Rpb24gKHRleHQpIHtcbiAgdGhpcy50eXBlID0gJ0RPTV9DT01NRU5UJztcbiAgdGhpcy50ZXh0ID0gdGV4dDtcbn07XG4iLCJ2YXIgY3JlYXRlICAgICAgICAgPSByZXF1aXJlKCcuLi91dGlscycpLmNyZWF0ZTtcbnZhciBDb21tb25Db21waWxlciA9IHJlcXVpcmUoJy4vY29tbW9uLWNvbXBpbGVyJykucHJvdG90eXBlO1xuXG4vKipcbiAqIEF0dHJpYnV0ZSBjb21waWxlci5cbiAqL1xudmFyIENvbXBpbGVyID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoKSB7fTtcbkNvbXBpbGVyLnByb3RvdHlwZSA9IGNyZWF0ZShDb21tb25Db21waWxlcik7XG5Db21waWxlci5wcm90b3R5cGUuY29tcGlsZXIgPSBDb21waWxlcjtcblxuLyoqXG4gKiBBcHBlbmQgYSB2YWx1ZSB0byB0aGUgY3VycmVudCBidWZmZXIuIFdlIG92ZXJyaWRlIHRoZSBkZWZhdWx0IGZ1bmN0aW9uYWxpdHlcbiAqIG9mIEhhbmRsZWJhcnMgc2luY2Ugd2Ugd2FudCB0byBiZSBhYmxlIHRvIGFwcGVuZCAqZXZlcnkqIHZhbHVlLlxuICovXG5Db21waWxlci5wcm90b3R5cGUuYXBwZW5kID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmZsdXNoSW5saW5lKCk7XG5cbiAgdGhpcy5zb3VyY2UucHVzaCh0aGlzLmFwcGVuZFRvQnVmZmVyKHRoaXMucG9wU3RhY2soKSkpO1xufTtcblxuLyoqXG4gKiBTZXQgYSBmbGFnIHRvIGluZGljYXRlIHRoZSBjb21waWxlciBpcyBhbiBhdHRyaWJ1dGUgY29tcGlsZXIuXG4gKlxuICogQHR5cGUge0Jvb2xlYW59XG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5pc0F0dHJpYnV0ZSA9IHRydWU7XG4iLCJ2YXIgQVNUICAgID0gcmVxdWlyZSgnLi9hc3QnKTtcbnZhciBwYXJzZXIgPSBleHBvcnRzLnBhcnNlciA9IHJlcXVpcmUoJy4vcGFyc2VyJyk7XG5cbi8qKlxuICogUGFyc2UgYSBzdHJpbmcgaW50byBhbiBBU1QuXG4gKlxuICogQHJldHVybiB7T2JqZWN0fVxuICovXG5leHBvcnRzLnBhcnNlID0gZnVuY3Rpb24gKGlucHV0KSB7XG4gIGlmIChpbnB1dC5jb25zdHJ1Y3RvciA9PT0gQVNULlByb2dyYW1Ob2RlKSB7XG4gICAgcmV0dXJuIGlucHV0O1xuICB9XG5cbiAgcGFyc2VyLnl5ID0gQVNUO1xuICByZXR1cm4gcGFyc2VyLnBhcnNlKGlucHV0KTtcbn07XG4iLCJ2YXIgY3JlYXRlICAgICA9IHJlcXVpcmUoJy4uL3V0aWxzJykuY3JlYXRlO1xudmFyIEpTQ29tcGlsZXIgPSByZXF1aXJlKFxuICAnaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL2NvbXBpbGVyL2phdmFzY3JpcHQtY29tcGlsZXInXG4pLmRlZmF1bHQucHJvdG90eXBlO1xuXG4vKipcbiAqIENyZWF0ZSB0aGUgYmFzZSBjb21waWxlciBmdW5jdGlvbmFsaXR5IGFuZCBhdHRhY2ggcmVsZXZhbnQgcmVmZXJlbmNlcy5cbiAqL1xudmFyIENvbXBpbGVyID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoKSB7fTtcbkNvbXBpbGVyLnByb3RvdHlwZSA9IGNyZWF0ZShKU0NvbXBpbGVyKTtcbkNvbXBpbGVyLnByb3RvdHlwZS5jb21waWxlciA9IENvbXBpbGVyO1xuXG4vKipcbiAqIE92ZXJyaWRlIG5hbWUgbG9va3VwIHRvIHVzZSB0aGUgZnVuY3Rpb24gcHJvdmlkZWQgb24gdGhlIERPTUJhcnMgb2JqZWN0LlxuICpcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuQ29tcGlsZXIucHJvdG90eXBlLm5hbWVMb29rdXAgPSBmdW5jdGlvbiAocGFyZW50LCBwcm9wZXJ0eSwgdHlwZSkge1xuICBpZiAodHlwZSAhPT0gJ2NvbnRleHQnKSB7XG4gICAgcmV0dXJuIEpTQ29tcGlsZXIubmFtZUxvb2t1cC5jYWxsKHRoaXMsIHBhcmVudCwgcHJvcGVydHksIHR5cGUpO1xuICB9XG5cbiAgdGhpcy5jb250ZXh0LmFsaWFzZXMuZ2V0ID0gJ3RoaXMuZ2V0JztcblxuICB2YXIgcXVvdGVkUGFyZW50ICAgPSB0aGlzLnF1b3RlZFN0cmluZyhwYXJlbnQpO1xuICB2YXIgcXVvdGVkUHJvcGVydHkgPSB0aGlzLnF1b3RlZFN0cmluZyhwcm9wZXJ0eSk7XG5cbiAgcmV0dXJuICdnZXQoJyArIHBhcmVudCArICcsICcgKyBxdW90ZWRQcm9wZXJ0eSArICcsICcgKyBxdW90ZWRQYXJlbnQgKyAnKSc7XG59O1xuXG4vKipcbiAqIE92ZXJyaWRlIGFtYmlndW91cyBpbnZva2VzIHRvIHByb2R1Y2UganVzdCBvbmUgc291cmNlIHZhbHVlLlxuICovXG5Db21waWxlci5wcm90b3R5cGUuaW52b2tlQW1iaWd1b3VzID0gZnVuY3Rpb24gKCkge1xuICBKU0NvbXBpbGVyLmludm9rZUFtYmlndW91cy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB0aGlzLnNvdXJjZS5wdXNoKHRoaXMuc291cmNlLnNwbGljZSgtMikuam9pbignXFxuJykpO1xufTtcblxuLyoqXG4gKiBPdmVycmlkZSB0aGUgYW1iaWdvdXMgYmxvY2sgdmFsdWUgaW52b2thdGlvbiB0byBwcm9kdWNlIGEgc2luZ2xlIHNvdXJjZS5cbiAqL1xuQ29tcGlsZXIucHJvdG90eXBlLmFtYmlndW91c0Jsb2NrVmFsdWUgPSBmdW5jdGlvbiAoKSB7XG4gIEpTQ29tcGlsZXIuYW1iaWd1b3VzQmxvY2tWYWx1ZS5jYWxsKHRoaXMpO1xuICB0aGlzLnNvdXJjZS5wdXNoKHRoaXMuc291cmNlLnNwbGljZSgtMikuam9pbignXFxuJykpO1xufTtcblxuLyoqXG4gKiBTZXQgdGhlIGF0dHJpYnV0ZSBjb21waWxlciB0byBiZSBmYWxzZS4gVGhpcyBpcyBvdmVycmlkZW4gaW4gdGhlIGF0dHJpYnV0ZVxuICogY29tcGlsZXIgc3ViY2xhc3MuXG4gKlxuICogQHR5cGUge0Jvb2xlYW59XG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5pc0F0dHJpYnV0ZSA9IGZhbHNlO1xuXG4vKipcbiAqIE92ZXJyaWRlIHRoZSBwYXJhbXMgc2V0dXAgd2l0aCBhbiBhdHRyaWJ1dGUgYm9vbGVhbiBhbmQgY3VzdG9tIHdyYXBwZXJzXG4gKiBmb3IgcHJvZ3JhbSBmdW5jdGlvbnMuXG4gKlxuICogQHBhcmFtICB7TnVtYmVyfSAgcGFyYW1TaXplXG4gKiBAcGFyYW0gIHtBcnJheX0gICBwYXJhbXNcbiAqIEBwYXJhbSAge0Jvb2xlYW59IHVzZVJlZ2lzdGVyXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5zZXR1cFBhcmFtcyA9IGZ1bmN0aW9uIChwYXJhbVNpemUsIHBhcmFtcywgdXNlUmVnaXN0ZXIpIHtcbiAgdmFyIHR5cGVzICAgID0gW107XG4gIHZhciBvcHRpb25zICA9IFtdO1xuICB2YXIgY29udGV4dHMgPSBbXTtcblxuICB0aGlzLmNvbnRleHQuYWxpYXNlcy5zZWxmID0gJ3RoaXMnO1xuXG4gIG9wdGlvbnMucHVzaCgnaGFzaDogJyArIHRoaXMucG9wU3RhY2soKSk7XG4gIG9wdGlvbnMucHVzaCgnYXR0cmlidXRlOiAnICsgdGhpcy5pc0F0dHJpYnV0ZSk7XG5cbiAgLy8gUmVmZXJlbmNlcyB0byB0aGUgY3VycmVudCBzdWJzY3JpYmVyIGV4ZWN1dGlvbi5cbiAgb3B0aW9ucy5wdXNoKCd1cGRhdGU6IHNlbGYuc3Vic2NyaWJlci51cGRhdGUnKTtcbiAgb3B0aW9ucy5wdXNoKCd1bnN1YnNjcmliZTogc2VsZi5zdWJzY3JpYmVyLnVuc3Vic2NyaWJlJyk7XG5cbiAgdmFyIGludmVyc2UgPSB0aGlzLnBvcFN0YWNrKCk7XG4gIHZhciBwcm9ncmFtID0gdGhpcy5wb3BTdGFjaygpO1xuXG4gIC8vIEF2b2lkIHNldHRpbmcgZm4gYW5kIGludmVyc2UgaWYgbmVpdGhlciBhcmUgc2V0LiBUaGlzIGFsbG93cyBoZWxwZXJzIHRvXG4gIC8vIGRvIGEgY2hlY2sgZm9yIGBpZiAob3B0aW9ucy5mbilgLlxuICBpZiAocHJvZ3JhbSB8fCBpbnZlcnNlKSB7XG4gICAgaWYgKCFwcm9ncmFtKSB7XG4gICAgICB0aGlzLmNvbnRleHQuYWxpYXNlcy5ub29wID0gJ3RoaXMubm9vcCc7XG4gICAgICBwcm9ncmFtID0gJ25vb3AnO1xuICAgIH1cblxuICAgIGlmICghaW52ZXJzZSkge1xuICAgICAgdGhpcy5jb250ZXh0LmFsaWFzZXMubm9vcCA9ICd0aGlzLm5vb3AnO1xuICAgICAgaW52ZXJzZSA9ICdub29wJztcbiAgICB9XG5cbiAgICB0aGlzLmNvbnRleHQuYWxpYXNlcy53cmFwUHJvZ3JhbSA9ICd0aGlzLndyYXBQcm9ncmFtJztcblxuICAgIG9wdGlvbnMucHVzaCgnZm46IHdyYXBQcm9ncmFtKCcgKyBwcm9ncmFtICsgJyknKTtcbiAgICBvcHRpb25zLnB1c2goJ2ludmVyc2U6IHdyYXBQcm9ncmFtKCcgKyBpbnZlcnNlICsgJyknKTtcbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcGFyYW1TaXplOyBpKyspIHtcbiAgICBwYXJhbXMucHVzaCh0aGlzLnBvcFN0YWNrKCkpO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpbmdQYXJhbXMpIHtcbiAgICAgIHR5cGVzLnB1c2godGhpcy5wb3BTdGFjaygpKTtcbiAgICAgIGNvbnRleHRzLnB1c2godGhpcy5wb3BTdGFjaygpKTtcbiAgICB9XG4gIH1cblxuICBpZiAodGhpcy5vcHRpb25zLnN0cmluZ1BhcmFtcykge1xuICAgIG9wdGlvbnMucHVzaCgnY29udGV4dHM6IFsnICsgY29udGV4dHMuam9pbignLCcpICsgJ10nKTtcbiAgICBvcHRpb25zLnB1c2goJ3R5cGVzOiBbJyArIHR5cGVzLmpvaW4oJywnKSArICddJyk7XG4gICAgb3B0aW9ucy5wdXNoKCdoYXNoQ29udGV4dHM6IGhhc2hDb250ZXh0cycpO1xuICAgIG9wdGlvbnMucHVzaCgnaGFzaFR5cGVzOiBoYXNoVHlwZXMnKTtcbiAgfVxuXG4gIGlmICh0aGlzLm9wdGlvbnMuZGF0YSkge1xuICAgIG9wdGlvbnMucHVzaCgnZGF0YTogZGF0YScpO1xuICB9XG5cbiAgb3B0aW9ucyA9ICd7JyArIG9wdGlvbnMuam9pbignLCAnKSArICd9JztcblxuICBpZiAodXNlUmVnaXN0ZXIpIHtcbiAgICB0aGlzLnJlZ2lzdGVyKCdvcHRpb25zJywgb3B0aW9ucyk7XG4gICAgcGFyYW1zLnB1c2goJ29wdGlvbnMnKTtcbiAgfSBlbHNlIHtcbiAgICBwYXJhbXMucHVzaChvcHRpb25zKTtcbiAgfVxuICByZXR1cm4gcGFyYW1zLmpvaW4oJywgJyk7XG59O1xuIiwidmFyIGNyZWF0ZSAgICAgICA9IHJlcXVpcmUoJy4uL3V0aWxzJykuY3JlYXRlO1xudmFyIGhic0NvbXBpbGVyICA9IHJlcXVpcmUoJ2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9jb21waWxlci9jb21waWxlcicpO1xudmFyIEJhc2VDb21waWxlciA9IGhic0NvbXBpbGVyLkNvbXBpbGVyLnByb3RvdHlwZTtcbnZhciBFeGNlcHRpb24gICAgPSByZXF1aXJlKCcuLi9leGNlcHRpb24nKTtcbnZhciBwYXJzZSAgICAgICAgPSByZXF1aXJlKCcuL2Jhc2UnKS5wYXJzZTtcbnZhciBKU0NvbXBpbGVyICAgPSByZXF1aXJlKCcuL2phdmFzY3JpcHQtY29tcGlsZXInKTtcbnZhciBBU1QgICAgICAgICAgPSByZXF1aXJlKCcuL2FzdCcpO1xuXG4vKipcbiAqIEJhc2UgY29tcGlsZXIgaW4gY2hhcmdlIG9mIGdlbmVyYXRpbmcgYSBjb25zdW1hYmxlIGVudmlyb25tZW50IGZvciB0aGVcbiAqIEphdmFTY3JpcHQgY29tcGlsZXIuXG4gKi9cbnZhciBDb21waWxlciA9IGV4cG9ydHMuQ29tcGlsZXIgPSBmdW5jdGlvbiAoKSB7fTtcbkNvbXBpbGVyLnByb3RvdHlwZSA9IGNyZWF0ZShCYXNlQ29tcGlsZXIpO1xuQ29tcGlsZXIucHJvdG90eXBlLmNvbXBpbGVyID0gQ29tcGlsZXI7XG5cbi8qKlxuICogQXBwZW5kIGEgRE9NIGVsZW1lbnQgbm9kZSB0byB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG5vZGVcbiAqL1xuQ29tcGlsZXIucHJvdG90eXBlLkRPTV9FTEVNRU5UID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgdGhpcy5vcGNvZGUoJ3B1c2hQcm9ncmFtJywgdGhpcy5jb21waWxlQXR0cmlidXRlKG5vZGUubmFtZSkpO1xuICB0aGlzLm9wY29kZSgnaW52b2tlRWxlbWVudCcpO1xuXG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBub2RlLmF0dHJpYnV0ZXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICB2YXIgbmFtZSAgPSB0aGlzLmNvbXBpbGVBdHRyaWJ1dGUobm9kZS5hdHRyaWJ1dGVzW2ldLm5hbWUpO1xuICAgIHZhciB2YWx1ZSA9IHRoaXMuY29tcGlsZUF0dHJpYnV0ZShub2RlLmF0dHJpYnV0ZXNbaV0udmFsdWUpO1xuICAgIHRoaXMuYXBwZW5kQXR0cmlidXRlKG5hbWUsIHZhbHVlKTtcbiAgfVxuXG4gIHRoaXMub3Bjb2RlKCdwdXNoUHJvZ3JhbScsIHRoaXMuY29tcGlsZUNvbnRlbnRzKG5vZGUuY29udGVudCkpO1xuICB0aGlzLm9wY29kZSgnaW52b2tlQ29udGVudCcpO1xuICB0aGlzLm9wY29kZSgnYXBwZW5kRWxlbWVudCcpO1xufTtcblxuLyoqXG4gKiBBcHBlbmQgYSBET00gY29tbWVudCBub2RlIHRvIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gbm9kZVxuICovXG5Db21waWxlci5wcm90b3R5cGUuRE9NX0NPTU1FTlQgPSBmdW5jdGlvbiAobm9kZSkge1xuICB0aGlzLm9wY29kZSgncHVzaFByb2dyYW0nLCB0aGlzLmNvbXBpbGVBdHRyaWJ1dGUobm9kZS50ZXh0KSk7XG4gIHRoaXMub3Bjb2RlKCdpbnZva2VDb21tZW50Jyk7XG4gIHRoaXMub3Bjb2RlKCdhcHBlbmRFbGVtZW50Jyk7XG59O1xuXG4vKipcbiAqIEFwcGVuZCBhbiBhdHRyaWJ1dGUgdG8gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIEBwYXJhbSAge09iamVjdH0gbmFtZVxuICogQHBhcmFtICB7T2JqZWN0fSB2YWx1ZVxuICovXG5Db21waWxlci5wcm90b3R5cGUuYXBwZW5kQXR0cmlidXRlID0gZnVuY3Rpb24gKG5hbWUsIHZhbHVlKSB7XG4gIHRoaXMub3Bjb2RlKCdwdXNoUHJvZ3JhbScsIG5hbWUpO1xuICB0aGlzLm9wY29kZSgncHVzaFByb2dyYW0nLCB2YWx1ZSk7XG4gIHRoaXMub3Bjb2RlKCdpbnZva2VBdHRyaWJ1dGUnKTtcbn07XG5cbi8qKlxuICogQ29tcGlsZSBhbiBhdHRyaWJ1dGUgcHJvZ3JhbS5cbiAqXG4gKiBAcGFyYW0gIHtPYmplY3R9IHByb2dyYW1cbiAqIEByZXR1cm4ge051bWJlcn1cbiAqL1xuQ29tcGlsZXIucHJvdG90eXBlLmNvbXBpbGVBdHRyaWJ1dGUgPSBmdW5jdGlvbiAocHJvZ3JhbSkge1xuICB2YXIgZ3VpZCA9IHRoaXMuY29tcGlsZUNvbnRlbnRzKHByb2dyYW0pO1xuICB0aGlzLmNoaWxkcmVuW2d1aWRdLmlzQXR0cmlidXRlID0gdHJ1ZTtcbiAgcmV0dXJuIGd1aWQ7XG59O1xuXG4vKipcbiAqIENvbXBpbGUgYW4gZWxlbWVudHMgY29udGVudHMuXG4gKlxuICogQHBhcmFtICB7T2JqZWN0fSBwcm9ncmFtXG4gKiBAcmV0dXJuIHtOdW1iZXJ9XG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5jb21waWxlQ29udGVudHMgPSBmdW5jdGlvbiAocHJvZ3JhbSkge1xuICB2YXIgZ3VpZCAgID0gdGhpcy5jb21waWxlUHJvZ3JhbShwcm9ncmFtKTtcbiAgdmFyIHJlc3VsdCA9IHRoaXMuY2hpbGRyZW5bZ3VpZF07XG4gIHJlc3VsdC5pc1Byb3hpZWQgPSB0cnVlO1xuXG4gIC8vIFByb3h5IGFsbCB0aGUgZGVwdGggbm9kZXMgYmV0d2VlbiBjb21waWxlZCBwcm9ncmFtcy5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCByZXN1bHQuZGVwdGhzLmxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICB0aGlzLmFkZERlcHRoKHJlc3VsdC5kZXB0aHMubGlzdFtpXSk7XG4gIH1cblxuICByZXR1cm4gZ3VpZDtcbn07XG5cbi8qKlxuICogVXBkYXRlIHRoZSBjb21waWxlciBlcXVhbGl0eSBjaGVjayB0byBhbHNvIHRha2UgaW50byBhY2NvdW50IGF0dHJpYnV0ZVxuICogcHJvZ3JhbXMuXG4gKlxuICogQHBhcmFtICB7T2JqZWN0fSAgb3RoZXJcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbiAob3RoZXIpIHtcbiAgLy8gQ2hlY2sgaWYgd2UgaGF2ZSB0d28gYXR0cmlidXRlIHByb2dyYW1zIChvciBub24tYXR0cmlidXRlIHByb2dyYW1zKS5cbiAgaWYgKHRoaXMuaXNBdHRyaWJ1dGUgIT09IG90aGVyLmlzQXR0cmlidXRlKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuIEJhc2VDb21waWxlci5lcXVhbHMuY2FsbCh0aGlzLCBvdGhlcik7XG59O1xuXG4vKipcbiAqIENoZWNrIHRoZSBhcmd1bWVudHMgcGFzc2VkIGludG8gdGhlIGNvbXBpbGF0aW9uIGZ1bmN0aW9ucyBiZWZvcmUgdHJ5aW5nIHRvXG4gKiBjb21waWxlIHRoZSBhcyBhIHByb2dyYW0uXG4gKlxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqL1xudmFyIGNvbXBpbGVQcmVjaGVjayA9IGZ1bmN0aW9uIChmbikge1xuICByZXR1cm4gZnVuY3Rpb24gKGlucHV0LCBvcHRpb25zLCBlbnYpIHtcbiAgICBpZiAodHlwZW9mIGlucHV0ICE9PSAnc3RyaW5nJyAmJiAhKGlucHV0IGluc3RhbmNlb2YgQVNULlByb2dyYW1Ob2RlKSkge1xuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcbiAgICAgICAgJ1lvdSBtdXN0IHBhc3MgYSBzdHJpbmcgb3IgRE9NQmFycyBBU1QgdG8gRE9NQmFycy5wcmVjb21waWxlLiAnICtcbiAgICAgICAgJ1lvdSBwYXNzZWQgJyArIGlucHV0XG4gICAgICApO1xuICAgIH1cblxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgaWYgKCEoJ2RhdGEnIGluIG9wdGlvbnMpKSB7XG4gICAgICBvcHRpb25zLmRhdGEgPSB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiBmbihpbnB1dCwgb3B0aW9ucywgZW52KTtcbiAgfTtcbn07XG5cbi8qKlxuICogUHJlY29tcGlsZSBnZW5lcmF0ZXMgYSBzdHJpbmdpZmllZCBKYXZhU2NyaXB0IGZ1bmN0aW9uLlxuICpcbiAqIEBwYXJhbSAge1N0cmluZ30gaW5wdXRcbiAqIEBwYXJhbSAge09iamVjdH0gb3B0aW9uc1xuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5leHBvcnRzLnByZWNvbXBpbGUgPSBjb21waWxlUHJlY2hlY2soZnVuY3Rpb24gKGlucHV0LCBvcHRpb25zKSB7XG4gIHZhciBhc3QgICAgICAgICA9IHBhcnNlKGlucHV0KTtcbiAgdmFyIGVudmlyb25tZW50ID0gbmV3IENvbXBpbGVyKCkuY29tcGlsZShhc3QsIG9wdGlvbnMpO1xuICByZXR1cm4gbmV3IEpTQ29tcGlsZXIoKS5jb21waWxlKGVudmlyb25tZW50LCBvcHRpb25zKTtcbn0pO1xuXG4vKipcbiAqIENvbXBpbGF0aW9uIHJldHVybiBhIGZ1bmN0aW9uIHRoYXQgaXMgaW1tZWRpYXRlbHkgcmVhZHkgZm9yIGV4ZWN1dGlvbiBhcyBhXG4gKiB0ZW1wbGF0ZS5cbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9ICAgaW5wdXRcbiAqIEBwYXJhbSAge09iamVjdH0gICBvcHRpb25zXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqL1xuZXhwb3J0cy5jb21waWxlID0gY29tcGlsZVByZWNoZWNrKGZ1bmN0aW9uIChpbnB1dCwgb3B0aW9ucywgZW52KSB7XG4gIHZhciBjb21waWxlZDtcblxuICB2YXIgY29tcGlsZUlucHV0ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBhc3QgICAgICAgICAgPSBwYXJzZShpbnB1dCk7XG4gICAgdmFyIGVudmlyb25tZW50ICA9IG5ldyBDb21waWxlcigpLmNvbXBpbGUoYXN0LCBvcHRpb25zKTtcbiAgICB2YXIgdGVtcGxhdGVTcGVjID0gbmV3IEpTQ29tcGlsZXIoKS5jb21waWxlKFxuICAgICAgZW52aXJvbm1lbnQsIG9wdGlvbnMsIHVuZGVmaW5lZCwgdHJ1ZVxuICAgICk7XG5cbiAgICByZXR1cm4gZW52LnRlbXBsYXRlKHRlbXBsYXRlU3BlYyk7XG4gIH07XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIChjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgaWYgKCFjb21waWxlZCkge1xuICAgICAgY29tcGlsZWQgPSBjb21waWxlSW5wdXQoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY29tcGlsZWQuY2FsbCh0aGlzLCBjb250ZXh0LCBvcHRpb25zKTtcbiAgfTtcbn0pO1xuIiwidmFyIGNyZWF0ZSAgICAgICAgID0gcmVxdWlyZSgnLi4vdXRpbHMnKS5jcmVhdGU7XG52YXIgQ29tbW9uQ29tcGlsZXIgPSByZXF1aXJlKCcuL2NvbW1vbi1jb21waWxlcicpLnByb3RvdHlwZTtcblxuLyoqXG4gKiBFeHRlbmRzIEhhbmRsZWJhcnMgSmF2YVNjcmlwdCBjb21waWxlciB0byBhZGQgRE9NIHNwZWNpZmljIHJ1bGVzLlxuICovXG52YXIgQ29tcGlsZXIgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHt9O1xuQ29tcGlsZXIucHJvdG90eXBlID0gY3JlYXRlKENvbW1vbkNvbXBpbGVyKTtcbkNvbXBpbGVyLnByb3RvdHlwZS5jb21waWxlciAgICAgPSBDb21waWxlcjtcbkNvbXBpbGVyLnByb3RvdHlwZS5hdHRyQ29tcGlsZXIgPSByZXF1aXJlKCcuL2F0dHJpYnV0ZS1jb21waWxlcicpO1xuXG4vKipcbiAqIENvbXBpbGVzIHRoZSBlbnZpcm9ubWVudCBvYmplY3QgZ2VuZXJhdGVkIGJ5IHRoZSBiYXNlIGNvbXBpbGVyLlxuICpcbiAqIEBwYXJhbSAge09iamVjdH0gICAgICAgICAgICBlbnZpcm9ubWVudFxuICogQHJldHVybiB7KEZ1bmN0aW9ufFN0cmluZyl9XG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5jb21waWxlID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmVsZW1lbnRTbG90ID0gMDtcbiAgcmV0dXJuIENvbW1vbkNvbXBpbGVyLmNvbXBpbGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cbi8qKlxuICogQ29tcGlsZSBhbnkgY2hpbGQgcHJvZ3JhbSBub2Rlcy4gRS5nLiBCbG9jayBoZWxwZXJzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBlbnZpcm9ubWVudFxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqL1xuQ29tcGlsZXIucHJvdG90eXBlLmNvbXBpbGVDaGlsZHJlbiA9IGZ1bmN0aW9uKGVudmlyb25tZW50LCBvcHRpb25zKSB7XG4gIHZhciBjaGlsZHJlbiA9IGVudmlyb25tZW50LmNoaWxkcmVuO1xuICB2YXIgQ29tcGlsZXIsIGNoaWxkLCBwcm9ncmFtLCBpbmRleDtcblxuICBmb3IgKHZhciBpID0gMCwgbCA9IGNoaWxkcmVuLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGNoaWxkICAgID0gY2hpbGRyZW5baV07XG4gICAgaW5kZXggICAgPSB0aGlzLm1hdGNoRXhpc3RpbmdQcm9ncmFtKGNoaWxkKTtcbiAgICBDb21waWxlciA9IHRoaXMuY29tcGlsZXI7XG5cbiAgICBpZiAoY2hpbGQuaXNBdHRyaWJ1dGUpIHtcbiAgICAgIENvbXBpbGVyID0gdGhpcy5hdHRyQ29tcGlsZXI7XG4gICAgfVxuXG4gICAgaWYgKGluZGV4ID09IG51bGwpIHtcbiAgICAgIHRoaXMuY29udGV4dC5wcm9ncmFtcy5wdXNoKCcnKTtcbiAgICAgIGNoaWxkLmluZGV4ID0gaW5kZXggPSB0aGlzLmNvbnRleHQucHJvZ3JhbXMubGVuZ3RoO1xuICAgICAgY2hpbGQubmFtZSAgPSAncHJvZ3JhbScgKyBpbmRleDtcbiAgICAgIHByb2dyYW0gPSBuZXcgQ29tcGlsZXIoKS5jb21waWxlKGNoaWxkLCBvcHRpb25zLCB0aGlzLmNvbnRleHQpO1xuICAgICAgdGhpcy5jb250ZXh0LnByb2dyYW1zW2luZGV4XSAgICAgPSBwcm9ncmFtO1xuICAgICAgdGhpcy5jb250ZXh0LmVudmlyb25tZW50c1tpbmRleF0gPSBjaGlsZDtcbiAgICB9IGVsc2Uge1xuICAgICAgY2hpbGQuaW5kZXggPSBpbmRleDtcbiAgICAgIGNoaWxkLm5hbWUgID0gJ3Byb2dyYW0nICsgaW5kZXg7XG4gICAgfVxuICB9XG59O1xuXG4vKipcbiAqIFB1c2ggYW4gZWxlbWVudCBvbnRvIHRoZSBzdGFjayBhbmQgcmV0dXJuIGl0LlxuICpcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuQ29tcGlsZXIucHJvdG90eXBlLnB1c2hFbGVtZW50ID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gJ2VsZW1lbnQnICsgKCsrdGhpcy5lbGVtZW50U2xvdCk7XG59O1xuXG4vKipcbiAqIFBvcCB0aGUgbGFzdCBlbGVtZW50IG9mZiB0aGUgc3RhY2sgYW5kIHJldHVybiBpdC5cbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5wb3BFbGVtZW50ID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gJ2VsZW1lbnQnICsgKHRoaXMuZWxlbWVudFNsb3QtLSk7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIGVsZW1lbnQgYXQgdGhlIGVuZCBvZiB0aGUgc3RhY2suXG4gKlxuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5Db21waWxlci5wcm90b3R5cGUudG9wRWxlbWVudCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuICdlbGVtZW50JyArIHRoaXMuZWxlbWVudFNsb3Q7XG59O1xuXG4vKipcbiAqIEFwcGVuZCBzb21lIGNvbnRlbnQgdG8gdGhlIGJ1ZmZlciAoYSBkb2N1bWVudCBmcmFnbWVudCkuXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSBzdHJpbmdcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuQ29tcGlsZXIucHJvdG90eXBlLmFwcGVuZFRvQnVmZmVyID0gZnVuY3Rpb24gKHN0cmluZykge1xuICBpZiAodGhpcy5lbnZpcm9ubWVudC5pc1NpbXBsZSkge1xuICAgIHJldHVybiAncmV0dXJuICcgKyBzdHJpbmcgKyAnOyc7XG4gIH1cblxuICB0aGlzLmNvbnRleHQuYWxpYXNlcy5hcHBlbmRDaGlsZCA9ICd0aGlzLmFwcGVuZENoaWxkJztcblxuICByZXR1cm4gJ2FwcGVuZENoaWxkKGJ1ZmZlciwgJyArIHN0cmluZyArICcpOyc7XG59O1xuXG4vKipcbiAqIEluaXRpYWxpemUgdGhlIGJhc2UgdmFsdWUgb2YgdGhlIGJ1ZmZlciwgaW4gdGhpcyBjYXNlIGEgZG9jdW1lbnQgZnJhZ21lbnQuXG4gKlxuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5Db21waWxlci5wcm90b3R5cGUuaW5pdGlhbGl6ZUJ1ZmZlciA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuICdkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCknO1xufTtcblxuLyoqXG4gKiBBcHBlbmQgYSB0ZXh0IG5vZGUgdG8gdGhlIGJ1ZmZlci5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gY29udGVudFxuICovXG5Db21waWxlci5wcm90b3R5cGUuYXBwZW5kQ29udGVudCA9IGZ1bmN0aW9uIChjb250ZW50KSB7XG4gIHZhciBzdHJpbmcgPSAnZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJyArIHRoaXMucXVvdGVkU3RyaW5nKGNvbnRlbnQpICsgJyknO1xuICB0aGlzLnNvdXJjZS5wdXNoKHRoaXMuYXBwZW5kVG9CdWZmZXIoc3RyaW5nKSk7XG59O1xuXG4vKipcbiAqIEFwcGVuZCBhIHZhcmlhYmxlIHRvIHRoZSBzdGFjay4gQWRkcyBzb21lIGFkZGl0aW9uYWwgbG9naWMgdG8gdHJhbnNmb3JtIHRoZVxuICogdGV4dCBpbnRvIGEgRE9NIG5vZGUgYmVmb3JlIHdlIGF0dGVtcHQgdG8gYXBwZW5kIGl0IHRvIHRoZSBidWZmZXIuXG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5hcHBlbmQgPSBmdW5jdGlvbiAoaXNFc2NhcGVkKSB7XG4gIHRoaXMuZmx1c2hJbmxpbmUoKTtcblxuICB2YXIgY3JlYXRlRm4gPSAnY3JlYXRlVGV4dCc7XG5cbiAgaWYgKGlzRXNjYXBlZCkge1xuICAgIHRoaXMuY29udGV4dC5hbGlhc2VzLmNyZWF0ZVRleHQgPSAndGhpcy5jcmVhdGVUZXh0JztcbiAgfSBlbHNlIHtcbiAgICBjcmVhdGVGbiA9ICdjcmVhdGVET00nO1xuICAgIHRoaXMuY29udGV4dC5hbGlhc2VzLmNyZWF0ZURPTSA9ICd0aGlzLmNyZWF0ZURPTSc7XG4gIH1cblxuICB2YXIgbG9jYWwgICA9IHRoaXMucG9wU3RhY2soKTtcbiAgdmFyIHNvdXJjZSAgPSB0aGlzLnNvdXJjZS5wb3AoKTtcbiAgdmFyIGVsZW1lbnQgPSB0aGlzLnB1c2hTdGFjayhcbiAgICBjcmVhdGVGbiArICcoZnVuY3Rpb24gKCkgeyAnICsgc291cmNlICsgJzsgcmV0dXJuICcgKyBsb2NhbCArICc7IH0pJ1xuICApO1xuXG4gIHRoaXMuc291cmNlLnB1c2godGhpcy5hcHBlbmRUb0J1ZmZlcihlbGVtZW50KSk7XG59O1xuXG4vKipcbiAqIEFwcGVuZCBhbiBlc2NhcGVkIEhhbmRsZWJhcnMgZXhwcmVzc2lvbiB0byB0aGUgc291cmNlLlxuICovXG5Db21waWxlci5wcm90b3R5cGUuYXBwZW5kRXNjYXBlZCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuYXBwZW5kKHRydWUpO1xufTtcblxuLyoqXG4gKiBBcHBlbmQgYW4gZWxlbWVudCBub2RlIHRvIHRoZSBzb3VyY2UuXG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5hcHBlbmRFbGVtZW50ID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLnNvdXJjZS5wdXNoKHRoaXMuYXBwZW5kVG9CdWZmZXIodGhpcy5wb3BTdGFjaygpKSk7XG59O1xuXG4vKipcbiAqIENyZWF0ZSBhIERPTSBjb21tZW50IG5vZGUgcmVhZHkgZm9yIGFwcGVuZGluZyB0byB0aGUgY3VycmVudCBidWZmZXIuXG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5pbnZva2VDb21tZW50ID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmNvbnRleHQuYWxpYXNlcy5wYXJ0aWFsID0gJ3RoaXMucGFydGlhbCc7XG5cbiAgdmFyIGRlcHRoICA9ICdkZXB0aCcgKyB0aGlzLmxhc3RDb250ZXh0O1xuICB2YXIgaW52b2tlID0gJ3BhcnRpYWwoJyArIHRoaXMudG9wU3RhY2soKSArICcsICcgKyBkZXB0aCArICcpJztcblxuICB0aGlzLmNvbnRleHQuYWxpYXNlcy5jcmVhdGVDb21tZW50ID0gJ3RoaXMuY3JlYXRlQ29tbWVudCc7XG5cbiAgdGhpcy5wdXNoU3RhY2soJ2NyZWF0ZUNvbW1lbnQoJyArIGludm9rZSArICcpJyk7XG59O1xuXG4vKipcbiAqIENyZWF0ZSBhIERPTSBlbGVtZW50IG5vZGUgcmVhZHkgZm9yIGFwcGVuZGluZyB0byB0aGUgY3VycmVudCBidWZmZXIuXG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5pbnZva2VFbGVtZW50ID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmNvbnRleHQuYWxpYXNlcy5wYXJ0aWFsICAgICAgID0gJ3RoaXMucGFydGlhbCc7XG4gIHRoaXMuY29udGV4dC5hbGlhc2VzLmNyZWF0ZUVsZW1lbnQgPSAndGhpcy5jcmVhdGVFbGVtZW50JztcblxuICB2YXIgZWxlbWVudCA9IHRoaXMucHVzaEVsZW1lbnQoKTtcbiAgdmFyIGRlcHRoICAgPSAnZGVwdGgnICsgdGhpcy5sYXN0Q29udGV4dDtcbiAgdmFyIGN1cnJlbnQgPSAncGFydGlhbCgnICsgdGhpcy5wb3BTdGFjaygpICsgJywgJyArIGRlcHRoICsgJyknO1xuICB2YXIgdXBkYXRlICA9ICdmdW5jdGlvbiAoZWxlbWVudCkgeyAnICsgZWxlbWVudCArICcgPSBlbGVtZW50OyB9JztcbiAgdmFyIGNyZWF0ZSAgPSAnY3JlYXRlRWxlbWVudCgnICsgY3VycmVudCArICcsICcgKyB1cGRhdGUgKyAnKSc7XG5cbiAgdGhpcy5wdXNoU3RhY2tMaXRlcmFsKGVsZW1lbnQpO1xuICB0aGlzLnJlZ2lzdGVyKGVsZW1lbnQsIGNyZWF0ZSk7XG59O1xuXG4vKipcbiAqIEFwcGVuZCBhbiBhdHRyaWJ1dGUgbm9kZSB0byB0aGUgY3VycmVudCBlbGVtZW50LlxuICovXG5Db21waWxlci5wcm90b3R5cGUuaW52b2tlQXR0cmlidXRlID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmNvbnRleHQuYWxpYXNlcy5wYXJ0aWFsICAgICAgPSAndGhpcy5wYXJ0aWFsJztcbiAgdGhpcy5jb250ZXh0LmFsaWFzZXMuc2V0QXR0cmlidXRlID0gJ3RoaXMuc2V0QXR0cmlidXRlJztcblxuICB2YXIgZGVwdGggICA9ICdkZXB0aCcgKyB0aGlzLmxhc3RDb250ZXh0O1xuICB2YXIgZWxlbWVudCA9ICdmdW5jdGlvbiAoKSB7IHJldHVybiAnICsgdGhpcy50b3BFbGVtZW50KCkgKyAnOyB9JztcbiAgdmFyIHZhbHVlICAgPSAncGFydGlhbCgnICsgdGhpcy5wb3BTdGFjaygpICsgJywgJyArIGRlcHRoICsgJyknO1xuICB2YXIgbmFtZSAgICA9ICdwYXJ0aWFsKCcgKyB0aGlzLnBvcFN0YWNrKCkgKyAnLCAnICsgZGVwdGggKyAnKSc7XG4gIHZhciBwYXJhbXMgID0gW2VsZW1lbnQsIG5hbWUsIHZhbHVlXTtcblxuICB0aGlzLnNvdXJjZS5wdXNoKCdzZXRBdHRyaWJ1dGUoJyArIHBhcmFtcy5qb2luKCcsICcpICsgJyk7Jyk7XG59O1xuXG4vKipcbiAqIEludm9rZSBhbiBhcmJpdHJhcnkgcHJvZ3JhbSBhbmQgYXBwZW5kIHRvIHRoZSBjdXJyZW50IGVsZW1lbnQuXG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5pbnZva2VDb250ZW50ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgZWxlbWVudCA9IHRoaXMudG9wRWxlbWVudCgpO1xuICB2YXIgZGVwdGggICA9ICdkZXB0aCcgKyB0aGlzLmxhc3RDb250ZXh0O1xuICB2YXIgY2hpbGQgICA9IHRoaXMucG9wU3RhY2soKSArICcoJyArIGRlcHRoICsgJyknO1xuXG4gIHRoaXMuY29udGV4dC5hbGlhc2VzLmFwcGVuZENoaWxkID0gJ3RoaXMuYXBwZW5kQ2hpbGQnO1xuXG4gIHRoaXMuc291cmNlLnB1c2goJ2FwcGVuZENoaWxkKCcgKyBlbGVtZW50ICsgJywgJyArIGNoaWxkICsgJyk7Jyk7XG59O1xuXG4vKipcbiAqIE92ZXJyaWRlIHRoZSBwcm9ncmFtIGV4cHJlc3Npb24gZnVuY3Rpb24gdG8gcHJveHkgZGVwdGguXG4gKlxuICogQHBhcmFtICB7TnVtYmVyfSBndWlkXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5wcm9ncmFtRXhwcmVzc2lvbiA9IGZ1bmN0aW9uIChndWlkKSB7XG4gIHRoaXMuY29udGV4dC5hbGlhc2VzLnNlbGYgPSAndGhpcyc7XG5cbiAgaWYgKGd1aWQgPT0gbnVsbCkge1xuICAgIHJldHVybiAnc2VsZi5ub29wJztcbiAgfVxuXG4gIHZhciBjaGlsZCAgICAgICAgID0gdGhpcy5lbnZpcm9ubWVudC5jaGlsZHJlbltndWlkXTtcbiAgdmFyIGRlcHRocyAgICAgICAgPSBjaGlsZC5kZXB0aHMubGlzdDtcbiAgdmFyIHByb2dyYW1QYXJhbXMgPSBbY2hpbGQuaW5kZXgsIGNoaWxkLm5hbWUsICdkYXRhJ107XG5cbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGRlcHRocy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIHZhciBkZXB0aCA9IGRlcHRoc1tpXSArIHRoaXMuZW52aXJvbm1lbnQuZGVwdGhzLmxpc3QubGVuZ3RoO1xuXG4gICAgcHJvZ3JhbVBhcmFtcy5wdXNoKCdkZXB0aCcgKyAoZGVwdGggLSAxKSk7XG4gIH1cblxuICB2YXIgcGFyYW1zID0gcHJvZ3JhbVBhcmFtcy5qb2luKCcsICcpO1xuXG4gIGlmIChkZXB0aHMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuICdzZWxmLnByb2dyYW0oJyArIHBhcmFtcyArICcpJztcbiAgfVxuXG4gIHJldHVybiAnc2VsZi5wcm9ncmFtV2l0aERlcHRoKCcgKyBwYXJhbXMgKyAnKSc7XG59O1xuIiwidmFyIEhic1BhcnNlciAgPSByZXF1aXJlKFxuICAnaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL2NvbXBpbGVyL3BhcnNlcidcbikuZGVmYXVsdDtcbnZhciBIVE1MUGFyc2VyID0gcmVxdWlyZSgnaHRtbHBhcnNlcjIvbGliL1BhcnNlcicpO1xuXG4vKipcbiAqIFN0cmluZ2lmeSBhbiBgQVNULlByb2dyYW1Ob2RlYCBzbyBpdCBjYW4gYmUgcnVuIHRocm91Z2ggb3RoZXJzIHBhcnNlcnMuIFRoaXNcbiAqIGlzIHJlcXVpcmVkIGZvciB0aGUgbm9kZSB0byBiZSBwYXJzZWQgYXMgSFRNTCAqYWZ0ZXIqIGl0IGlzIHBhcnNlZCBhcyBhXG4gKiBIYW5kbGViYXJzIHRlbXBsYXRlLiBIYW5kbGViYXJzIG11c3QgYWx3YXlzIHJ1biBiZWZvcmUgdGhlIEhUTUwgcGFyc2VyLCBzb1xuICogaXQgY2FuIGNvcnJlY3RseSBtYXRjaCBibG9jayBub2RlcyAoSSBjb3VsZG4ndCBzZWUgYSBzaW1wbGUgd2F5IHRvIHJlc3VtZVxuICogdGhlIGVuZCBibG9jayBub2RlIHBhcnNpbmcpLlxuICpcbiAqIEBwYXJhbSAge0hhbmRsZWJhcnMuQVNULlByb2dyYW1Ob2RlfSBwcm9ncmFtXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKi9cbnZhciBzdHJpbmdpZnlQcm9ncmFtID0gZnVuY3Rpb24gKHByb2dyYW0pIHtcbiAgdmFyIGh0bWwgICAgICAgPSAnJztcbiAgdmFyIHN0YXRlbWVudHMgPSBwcm9ncmFtLnN0YXRlbWVudHM7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdGF0ZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHN0YXRlbWVudCA9IHN0YXRlbWVudHNbaV07XG5cbiAgICBpZiAoc3RhdGVtZW50LnR5cGUgPT09ICdjb250ZW50Jykge1xuICAgICAgaHRtbCArPSBzdGF0ZW1lbnQuc3RyaW5nO1xuICAgIH0gZWxzZSB7XG4gICAgICBodG1sICs9ICd7e2QnICsgaSArICd9fSc7IC8vIFwiQWxpYXNcIiBub2RlLlxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBodG1sO1xufTtcblxuLyoqXG4gKiBQYXJzZXMgYSB0ZXh0IHN0cmluZyByZXR1cm5lZCBmcm9tIHN0cmluZ2lmeWluZyBhIHByb2dyYW0gbm9kZS4gUmVwbGFjZXMgYW55XG4gKiBtdXN0YWNoZSBub2RlIHJlZmVyZW5jZXMgd2l0aCB0aGUgb3JpZ2luYWwgbm9kZS5cblxuICogQHBhcmFtICB7U3RyaW5nfSBpbnB1dFxuICogQHBhcmFtICB7T2JqZWN0fSBvcmlnaW5hbFByb2dyYW1cbiAqIEByZXR1cm4ge09iamVjdH1cbiAqL1xudmFyIHBhcnNlUHJvZ3JhbSA9IGZ1bmN0aW9uIChpbnB1dCwgb3JpZ2luYWxQcm9ncmFtKSB7XG4gIHZhciBwcm9ncmFtICAgID0gSGJzUGFyc2VyLnBhcnNlKGlucHV0KTtcbiAgdmFyIHN0YXRlbWVudHMgPSBwcm9ncmFtLnN0YXRlbWVudHM7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdGF0ZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHN0YXRlbWVudCA9IHN0YXRlbWVudHNbaV07XG5cbiAgICAvLyBSZXBsYWNlIG11c3RhY2hlIG5vZGVzLCB3aGljaCAqc2hvdWxkKiBvbmx5IGJlIHJlYWwgSGFuZGxlYmFycyBcImFsaWFzXCJcbiAgICAvLyBub2RlcyB0aGF0IHdlcmUgaW5qZWN0ZWQgYnkgdGhlIHN0cmluZ2lmaWNhdGlvbiBvZiB0aGUgcHJvZ3JhbSBub2RlLlxuICAgIGlmIChzdGF0ZW1lbnQudHlwZSA9PT0gJ211c3RhY2hlJykge1xuICAgICAgc3RhdGVtZW50c1tpXSA9IG9yaWdpbmFsUHJvZ3JhbS5zdGF0ZW1lbnRzW3N0YXRlbWVudC5pZC5zdHJpbmcuc3Vic3RyKDEpXTtcbiAgICAgIHN0YXRlbWVudCA9IHN0YXRlbWVudHNbaV07XG4gICAgfVxuXG4gICAgLy8gTmVlZCB0byByZWN1cnNpdmVseSByZXNvbHZlIGJsb2NrIG5vZGUgcHJvZ3JhbXMgYXMgSFRNTC5cbiAgICBpZiAoc3RhdGVtZW50LnR5cGUgPT09ICdibG9jaycpIHtcbiAgICAgIGlmIChzdGF0ZW1lbnQucHJvZ3JhbSkge1xuICAgICAgICBzdGF0ZW1lbnQucHJvZ3JhbSA9IHBhcnNlQXNIVE1MKHN0YXRlbWVudC5wcm9ncmFtKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHN0YXRlbWVudC5pbnZlcnNlKSB7XG4gICAgICAgIHN0YXRlbWVudC5pbnZlcnNlID0gcGFyc2VBc0hUTUwoc3RhdGVtZW50LmludmVyc2UpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBwcm9ncmFtO1xufTtcblxuLyoqXG4gKiBQYXJzZSBhIHByb2dyYW0gb2JqZWN0IGFzIEhUTUwgYW5kIHJldHVybiBhbiB1cGRhdGVkIHByb2dyYW0uXG4gKlxuICogQHBhcmFtICB7T2JqZWN0fSBvcmlnaW5hbFByb2dyYW1cbiAqIEByZXR1cm4ge09iamVjdH1cbiAqL1xudmFyIHBhcnNlQXNIVE1MID0gZnVuY3Rpb24gKG9yaWdpbmFsUHJvZ3JhbSkge1xuICB2YXIgeXkgICA9IEhic1BhcnNlci55eTtcbiAgdmFyIGh0bWwgPSBzdHJpbmdpZnlQcm9ncmFtKG9yaWdpbmFsUHJvZ3JhbSk7XG5cbiAgLy8gQ3JlYXRlIGFuZCByZXR1cm4gYSBuZXcgZW1wdHkgcHJvZ3JhbSBub2RlLlxuICB2YXIgY3JlYXRlUHJvZ3JhbSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gbmV3IHl5LlByb2dyYW1Ob2RlKFtdKTtcbiAgfTtcblxuICAvLyBTdGFydCB0aGUgc3RhY2sgd2l0aCBhbiBlbXB0eSBwcm9ncmFtIG5vZGUgd2hpY2ggd2lsbCBjb250YWluIGFsbCB0aGVcbiAgLy8gcGFyc2VkIGVsZW1lbnRzLlxuICB2YXIgcHJvZ3JhbSA9IGNyZWF0ZVByb2dyYW0oKTtcbiAgdmFyIHN0YWNrICAgPSBbcHJvZ3JhbV07XG4gIHZhciBlbGVtZW50O1xuXG4gIC8vIEdlbmVyYXRlIGEgbmV3IEhUTUwgcGFyc2VyIGluc3RhbmNlLlxuICB2YXIgcGFyc2VyID0gbmV3IEhUTUxQYXJzZXIoe1xuICAgIG9ub3BlbnRhZ25hbWU6IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICB2YXIgbm9kZSA9IG5ldyB5eS5ET01FbGVtZW50KG5hbWUsIFtdLCBjcmVhdGVQcm9ncmFtKCkpO1xuICAgICAgcHJvZ3JhbS5zdGF0ZW1lbnRzLnB1c2goZWxlbWVudCA9IG5vZGUpO1xuICAgICAgc3RhY2sucHVzaChwcm9ncmFtID0gbm9kZS5jb250ZW50KTtcbiAgICB9LFxuICAgIG9uY2xvc2V0YWc6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHN0YWNrLnBvcCgpO1xuICAgICAgZWxlbWVudCA9IG51bGw7XG4gICAgICBwcm9ncmFtID0gc3RhY2tbc3RhY2subGVuZ3RoIC0gMV07XG4gICAgfSxcbiAgICBvbmF0dHJpYnV0ZTogZnVuY3Rpb24gKG5hbWUsIHZhbHVlKSB7XG4gICAgICBlbGVtZW50LmF0dHJpYnV0ZXMucHVzaChuZXcgeXkuRE9NQXR0cmlidXRlKG5hbWUsIHZhbHVlKSk7XG4gICAgfSxcbiAgICBvbnRleHQ6IGZ1bmN0aW9uICh0ZXh0KSB7XG4gICAgICBwcm9ncmFtLnN0YXRlbWVudHMucHVzaCh0ZXh0KTtcbiAgICB9LFxuICAgIG9ucHJvY2Vzc2luZ2luc3RydWN0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Byb2Nlc3NpbmcgaW5zdHJ1Y3Rpb25zIGFyZSBub3Qgc3VwcG9ydGVkJyk7XG4gICAgfSxcbiAgICBvbmNvbW1lbnQ6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICBwcm9ncmFtLnN0YXRlbWVudHMucHVzaChuZXcgeXkuRE9NQ29tbWVudChkYXRhKSk7XG4gICAgfSxcbiAgICBvbmVycm9yOiBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfSwge1xuICAgIGRlY29kZUVudGl0aWVzOiB0cnVlXG4gIH0pO1xuXG4gIHBhcnNlci53cml0ZShodG1sKTtcbiAgcGFyc2VyLmVuZCgpO1xuXG4gIC8qKlxuICAgKiBSZWN1cnNpdmVseSBwYXJzZXMgbmVzdGVkIERPTSBlbGVtZW50cyBhcyBIYW5kbGViYXJzIHRlbXBsYXRlcy5cbiAgICpcbiAgICogQHBhcmFtICB7T2JqZWN0fSBwcm9ncmFtXG4gICAqIEBwYXJhbSAge09iamVjdH0gb3JpZ2luYWxQcm9ncmFtXG4gICAqIEByZXR1cm4ge09iamVjdH1cbiAgICovXG4gIHZhciBhc3QgPSAoZnVuY3Rpb24gcmVjdXJzZSAocHJvZ3JhbSwgb3JpZ2luYWxQcm9ncmFtKSB7XG4gICAgdmFyIHN0YXRlbWVudHMgPSBwcm9ncmFtLnN0YXRlbWVudHM7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN0YXRlbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBzdGF0ZW1lbnQgPSBzdGF0ZW1lbnRzW2ldO1xuXG4gICAgICBpZiAodHlwZW9mIHN0YXRlbWVudCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgdmFyIG1lcmdlID0gcGFyc2VQcm9ncmFtKHN0YXRlbWVudCwgb3JpZ2luYWxQcm9ncmFtKS5zdGF0ZW1lbnRzO1xuXG4gICAgICAgIHN0YXRlbWVudHMuc3BsaWNlLmFwcGx5KHN0YXRlbWVudHMsIFtpLCAxXS5jb25jYXQobWVyZ2UpKTtcbiAgICAgICAgaSArPSBtZXJnZS5sZW5ndGggLSAxO1xuICAgICAgfSBlbHNlIGlmIChzdGF0ZW1lbnQudHlwZSA9PT0gJ0RPTV9DT01NRU5UJykge1xuICAgICAgICBzdGF0ZW1lbnQudGV4dCA9IHBhcnNlUHJvZ3JhbShzdGF0ZW1lbnQudGV4dCwgb3JpZ2luYWxQcm9ncmFtKTtcbiAgICAgIH0gZWxzZSBpZiAoc3RhdGVtZW50LnR5cGUgPT09ICdET01fRUxFTUVOVCcpIHtcbiAgICAgICAgc3RhdGVtZW50Lm5hbWUgPSBwYXJzZVByb2dyYW0oc3RhdGVtZW50Lm5hbWUsIG9yaWdpbmFsUHJvZ3JhbSk7XG5cbiAgICAgICAgZm9yICh2YXIgayA9IDA7IGsgPCBzdGF0ZW1lbnQuYXR0cmlidXRlcy5sZW5ndGg7IGsrKykge1xuICAgICAgICAgIHZhciBhdHRyaWJ1dGUgPSBzdGF0ZW1lbnQuYXR0cmlidXRlc1trXTtcblxuICAgICAgICAgIGF0dHJpYnV0ZS5uYW1lICA9IHBhcnNlUHJvZ3JhbShhdHRyaWJ1dGUubmFtZSwgIG9yaWdpbmFsUHJvZ3JhbSk7XG4gICAgICAgICAgYXR0cmlidXRlLnZhbHVlID0gcGFyc2VQcm9ncmFtKGF0dHJpYnV0ZS52YWx1ZSwgb3JpZ2luYWxQcm9ncmFtKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlY3Vyc2Uoc3RhdGVtZW50LmNvbnRlbnQsIG9yaWdpbmFsUHJvZ3JhbSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHByb2dyYW07XG4gIH0pKHN0YWNrLnBvcCgpLCBvcmlnaW5hbFByb2dyYW0pO1xuXG4gIHJldHVybiBhc3Q7XG59O1xuXG4vKipcbiAqIFRoZSBwYXJzZXIgaXMgYSBzaW1wbGUgY29uc3RydWN0b3IuIEFsbCB0aGUgZnVuY3Rpb25hbGl0eSBpcyBvbiB0aGUgcHJvdG90eXBlXG4gKiBvYmplY3QuXG4gKi9cbnZhciBQYXJzZXIgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMueXkgPSB7fTtcbn07XG5cbi8qKlxuICogQWxpYXMgdGhlIHBhcnNlciBjb25zdHJ1Y3RvciBmdW5jdGlvbi5cbiAqXG4gKiBAdHlwZSB7RnVuY3Rpb259XG4gKi9cblBhcnNlci5wcm90b3R5cGUuUGFyc2VyID0gUGFyc2VyO1xuXG4vKipcbiAqIFRoZSBwcmltYXJ5IGZ1bmN0aW9uYWxpdHkgb2YgdGhlIHBhcnNlci4gUHVzaGVzIHRoZSBpbnB1dCB0ZXh0IHRocm91Z2hcbiAqIEhhbmRsZWJhcnMgYW5kIGEgSFRNTCBwYXJzZXIsIGdlbmVyYXRpbmcgYSBBU1QgZm9yIHVzZSB3aXRoIHRoZSBjb21waWxlci5cbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9IGlucHV0XG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cblBhcnNlci5wcm90b3R5cGUucGFyc2UgPSBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgSGJzUGFyc2VyLnl5ID0gdGhpcy55eTtcblxuICAvLyBQYXJzZSBpdCBhcyBhIEhhbmRsZWJhcnMgdG8gZXh0cmFjdCB0aGUgaW1wb3J0YW50IG5vZGVzIGZpcnN0LiBUaGVuIHdlXG4gIC8vIHN0cmluZ2lmeSB0aGUgbm9kZSB0byBzb21ldGhpbmcgdGhlIEhUTUwgcGFyc2VyIGNhbiBoYW5kbGUuIFRoZSBBU1QgdGhlXG4gIC8vIEhUTUwgcGFyc2VyIGdlbmVyYXRlcyB3aWxsIGJlIHBhcnNlZCB1c2luZyBIYW5kbGViYXJzIGFnYWluIHRvIGluamVjdCB0aGVcbiAgLy8gb3JpZ2luYWwgbm9kZXMgYmFjay5cbiAgcmV0dXJuIHBhcnNlQXNIVE1MKEhic1BhcnNlci5wYXJzZShpbnB1dCkpO1xufTtcblxuLyoqXG4gKiBFeHBvcnQgYSBzdGF0aWMgaW5zdGFuY2Ugb2YgdGhlIHBhcnNlci5cbiAqXG4gKiBAdHlwZSB7UGFyc2VyfVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBQYXJzZXIoKTtcbiIsInZhciBFdmVudHMgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vKipcbiAqIExpc3RlbiB0byBhbnkgZXZlbnRzIHRyaWdnZXJlZC5cbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9ICAgbmFtZVxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gKiBAcGFyYW0gIHtPYmplY3R9ICAgY29udGV4dFxuICogQHJldHVybiB7RXZlbnRzfVxuICovXG5FdmVudHMub24gPSBmdW5jdGlvbiAobmFtZSwgZm4sIGNvbnRleHQpIHtcbiAgdGhpcy5fZXZlbnRzIHx8ICh0aGlzLl9ldmVudHMgPSB7fSk7XG4gIHZhciBldmVudHMgPSB0aGlzLl9ldmVudHNbbmFtZV0gfHwgKHRoaXMuX2V2ZW50c1tuYW1lXSA9IFtdKTtcbiAgZXZlbnRzLnB1c2goeyBmbjogZm4sIGNvbnRleHQ6IGNvbnRleHQgfSk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBMaXN0ZW4gdG8gYW55IGV2ZW50cyB0cmlnZ2VyZWQgb25jZS5cbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9ICAgbmFtZVxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gKiBAcGFyYW0gIHtPYmplY3R9ICAgY29udGV4dFxuICogQHJldHVybiB7RXZlbnRzfVxuICovXG5FdmVudHMub25jZSA9IGZ1bmN0aW9uIChuYW1lLCBmbiwgY29udGV4dCkge1xuICB2YXIgdGhhdCA9IHRoaXM7XG5cbiAgcmV0dXJuIHRoaXMub24obmFtZSwgZnVuY3Rpb24gc2VsZiAoKSB7XG4gICAgdGhhdC5vZmYobmFtZSwgc2VsZik7XG4gICAgZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfSwgY29udGV4dCk7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBhbiBldmVudCBsaXN0ZW5lci5cbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9ICAgbmFtZVxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gKiBAcGFyYW0gIHtPYmplY3R9ICAgY29udGV4dFxuICogQHJldHVybiB7RXZlbnRzfVxuICovXG5FdmVudHMub2ZmID0gZnVuY3Rpb24gKG5hbWUsIGZuLCBjb250ZXh0KSB7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbbmFtZV0pIHtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgIGlmICghbmFtZSkge1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50cztcbiAgICB9IGVsc2Uge1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1tuYW1lXTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHZhciBldmVudHMgPSB0aGlzLl9ldmVudHNbbmFtZV07XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZXZlbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGV2ZW50c1tpXS5mbiA9PT0gZm4pIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAyIHx8IGV2ZW50c1tpXS5jb250ZXh0ID09PSBjb250ZXh0KSB7XG4gICAgICAgIGV2ZW50cy5zcGxpY2UoaSwgMSk7XG4gICAgICAgIGktLTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZiAoIWV2ZW50cy5sZW5ndGgpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW25hbWVdO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEVtaXQgYW4gZXZlbnQuXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSBuYW1lXG4gKiBAcGFyYW0gIHsqfSAgICAgIC4uLlxuICogQHJldHVybiB7RXZlbnRzfVxuICovXG5FdmVudHMuZW1pdCA9IGZ1bmN0aW9uIChuYW1lIC8qLCAuLi5hcmdzICovKSB7XG4gIHZhciBhcmdzICAgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICB2YXIgZXZlbnRzID0gdGhpcy5fZXZlbnRzICYmIHRoaXMuX2V2ZW50c1tuYW1lXSAmJiB0aGlzLl9ldmVudHNbbmFtZV0uc2xpY2UoKTtcblxuICBpZiAoZXZlbnRzKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBldmVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGV2ZW50c1tpXS5mbi5hcHBseShldmVudHNbaV0uY29udGV4dCwgYXJncyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCdoYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvZXhjZXB0aW9uJykuZGVmYXVsdDtcbiIsInZhciBjdXJyZW50VGltZSA9IHdpbmRvdy5EYXRlLm5vdyB8fCAoZnVuY3Rpb24gKCkge1xuICB2YXIgQ29uc3R1Y3RvciA9IHdpbmRvdy5EYXRlO1xuXG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIG5ldyBDb25zdHVjdG9yKCkuZ2V0VGltZSgpO1xuICB9O1xufSkoKTtcblxuXG52YXIgc2V0VGltZXIgICAgPSB3aW5kb3cuc2V0VGltZW91dDtcbnZhciBjbGVhclRpbWVyICA9IHdpbmRvdy5jbGVhclRpbWVvdXQ7XG5cbi8qKlxuICogRmFsbGJhY2sgYW5pbWF0aW9uIGZyYW1lIGltcGxlbWVudGF0aW9uLlxuICpcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICovXG52YXIgZmFsbGJhY2sgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBwcmV2ID0gY3VycmVudFRpbWUoKTtcblxuICByZXR1cm4gZnVuY3Rpb24gKGZuKSB7XG4gICAgdmFyIGN1cnIgPSBjdXJyZW50VGltZSgpO1xuICAgIHZhciBtcyAgID0gTWF0aC5tYXgoMCwgMTYgLSAoY3VyciAtIHByZXYpKTtcbiAgICB2YXIgcmVxICA9IHNldFRpbWVyKGZuLCBtcyk7XG5cbiAgICBwcmV2ID0gY3VycjtcblxuICAgIHJldHVybiByZXE7XG4gIH07XG59O1xuXG4vKipcbiAqIEV4cG9zZSBgcmVxdWVzdEFuaW1hdGlvbkZyYW1lYC5cbiAqXG4gKiBAdHlwZSB7RnVuY3Rpb259XG4gKi9cbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgd2luZG93LndlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICB3aW5kb3cubW96UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gIHdpbmRvdy5tc1JlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICB3aW5kb3cub1JlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICBmYWxsYmFjaygpO1xuXG4vKipcbiAqIENhbmNlbCB0aGUgYW5pbWF0aW9uIGZyYW1lLlxuICpcbiAqIEB0eXBlIHtGdW5jdGlvbn1cbiAqL1xudmFyIGNhbmNlbCA9IHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSB8fFxuICB3aW5kb3cud2Via2l0Q2FuY2VsQW5pbWF0aW9uRnJhbWUgfHxcbiAgd2luZG93Lm1vekNhbmNlbEFuaW1hdGlvbkZyYW1lIHx8XG4gIHdpbmRvdy5tc0NhbmNlbEFuaW1hdGlvbkZyYW1lIHx8XG4gIHdpbmRvdy5vQ2FuY2VsQW5pbWF0aW9uRnJhbWUgfHxcbiAgY2xlYXJUaW1lcjtcblxuLyoqXG4gKiBDYW5jZWwgYW4gYW5pbWF0aW9uIGZyYW1lLlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBpZFxuICovXG5leHBvcnRzLmNhbmNlbCA9IGZ1bmN0aW9uIChpZCkge1xuICBjYW5jZWwuY2FsbCh3aW5kb3csIGlkKTtcbn07XG4iLCJ2YXIgaGJzVk0gICAgID0gcmVxdWlyZSgnaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL3J1bnRpbWUnKTtcbnZhciBVdGlscyAgICAgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG52YXIgaXNCcm93c2VyID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCc7XG52YXIgcmFmICAgICAgID0gaXNCcm93c2VyICYmIHJlcXVpcmUoJy4vcmFmJyk7XG5cbi8qKlxuICogSXRlcmF0ZSBvdmVyIGFuIGFycmF5IG9mIGZ1bmN0aW9ucyBhbmQgZXhlY3V0ZSBlYWNoIG9mIHRoZW0uXG4gKlxuICogQHBhcmFtIHtBcnJheX0gYXJyYXlcbiAqL1xudmFyIGl0ZXJhdGlvbiA9IGZ1bmN0aW9uIChhcnJheSkge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgYXJyYXlbaV0oKTtcbiAgfVxufTtcblxuLyoqXG4gKiBFeHRlbmQgdGhlIEhhbmRsZWJhcnMgcnVudGltZSBlbnZpcm9ubWVudCB3aXRoIERPTSBzcGVjaWZpYyBoZWxwZXJzLlxuICpcbiAqIEB0eXBlIHtPYmplY3R9XG4gKi9cbnZhciBWTSA9IG1vZHVsZS5leHBvcnRzID0gVXRpbHMuY3JlYXRlKGhic1ZNKTtcblxuLyoqXG4gKiBCaW5kIGEgZnVuY3Rpb24gdG8gdGhlIGFuaW1hdGlvbiBmcmFtZS5cbiAqXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge051bWJlcn1cbiAqL1xuVk0uZXhlYyA9IGZ1bmN0aW9uIChmbikge1xuICByZXR1cm4gaXNCcm93c2VyID8gcmFmKGZuKSA6IHNldEltbWVkaWF0ZShmbik7XG59O1xuXG4vKipcbiAqIENhbmNlbCBhbiBleGVjdXRpb24uXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IGlkXG4gKi9cblZNLmV4ZWMuY2FuY2VsID0gZnVuY3Rpb24gKGlkKSB7XG4gIHJldHVybiBpc0Jyb3dzZXIgPyByYWYuY2FuY2VsKGlkKSA6IGNsZWFySW1tZWRpYXRlKGlkKTtcbn07XG5cbi8qKlxuICogR2VuZXJhdGUgYW4gZXhlY3V0YWJsZSB0ZW1wbGF0ZSBmcm9tIGEgdGVtcGxhdGUgc3BlYy5cbiAqXG4gKiBAcGFyYW0gIHtPYmplY3R9ICAgdGVtcGxhdGVTcGVjXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqL1xuVk0udGVtcGxhdGUgPSBmdW5jdGlvbiAodGVtcGxhdGVTcGVjLCBlbnYpIHtcbiAgLyoqXG4gICAqIEFjY2VwdHMgYSBmdW5jdGlvbiB0aGF0IGhhcyBzdWJzY3JpcHRpb25zIGNhbGxlZCBpbnNpZGUgYW5kIHJldHVybnMgYSBuZXdcbiAgICogZnVuY3Rpb24gdGhhdCB3aWxsIGxpc3RlbiB0byBhbGwgc3Vic2NyaXB0aW9ucyBhbmQgY2FuIHVwZGF0ZSB3aXRoIGFueVxuICAgKiBjaGFuZ2VzLlxuICAgKlxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAgICogQHJldHVybiB7RnVuY3Rpb259XG4gICAqL1xuICB2YXIgc3Vic2NyaWJlID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgdmFyIHRyaWdnZXJlZCAgICA9IGZhbHNlO1xuICAgIHZhciB1bnN1YnNjcmliZWQgPSBmYWxzZTtcbiAgICB2YXIgZXhlY0lkO1xuICAgIHZhciB1cGRhdGVyO1xuICAgIHZhciBwcmV2U3Vic2NyaXB0aW9ucztcblxuICAgIC8qKlxuICAgICAqIEl0ZXJhdGUgb3ZlciBhIHN1YnNjcmlwdGlvbnMgb2JqZWN0IGFuZCB1bnN1YnNjcmliZSBldmVyeXRoaW5nLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtBcnJheX0gc3Vic2NyaXB0aW9uc1xuICAgICAqL1xuICAgIHZhciBlYWNoU3Vic2NyaXB0aW9uID0gZnVuY3Rpb24gKHN1YnNjcmlwdGlvbnMsIGZuKSB7XG4gICAgICBmb3IgKHZhciBwcm9wZXJ0eSBpbiBzdWJzY3JpcHRpb25zKSB7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBzdWJzY3JpcHRpb25zW3Byb3BlcnR5XSkge1xuICAgICAgICAgIHZhciBzdWJzY3JpcHRpb24gPSBzdWJzY3JpcHRpb25zW3Byb3BlcnR5XVtrZXldO1xuICAgICAgICAgIGZuKHN1YnNjcmlwdGlvbiwgcHJvcGVydHksIHN1YnNjcmliZXIudXBkYXRlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSdW4gdGhpcyBmdW5jdGlvbiBiZWZvcmUgd2UgcnVuIGFuIHVwZGF0ZSBmdW5jdGlvbi4gSXQgbW92ZXMgY3VycmVudFxuICAgICAqIHN1YnNjcmlwdGlvbnMgc28gdGhhdCB3ZSBjYW4gZGlmZiB0aGUgc3Vic2NyaXB0aW9ucyBhZnRlciB3ZSB1cGRhdGVcbiAgICAgKiB0aGUgRE9NLlxuICAgICAqL1xuICAgIHZhciBiZWZvcmVVcGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBpdGVyYXRpb24oc3Vic2NyaWJlci51bnN1YnNjcmlwdGlvbnMpO1xuICAgICAgcHJldlN1YnNjcmlwdGlvbnMgPSBzdWJzY3JpYmVyLnN1YnNjcmlwdGlvbnM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJ1biB0aGlzIGZ1bmN0aW9uIGFmdGVyIGFuIHVwZGF0ZS4gSXQgd2lsbCBjaGVjayBmb3IgZGlmZmVyZW5jZSBpbiB0aGVcbiAgICAgKiBiZWZvcmUgYW5kIGFmdGVyIHVwZGF0ZXMuXG4gICAgICovXG4gICAgdmFyIGFmdGVyVXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIHN1YnNjcmlwdGlvbnMgPSBzdWJzY3JpYmVyLnN1YnNjcmlwdGlvbnM7XG5cbiAgICAgIC8vIERpZmYgdGhlIG5ldyBzdWJzY3JpcHRpb25zIGFnYWluc3QgdGhlIHByZXZpb3VzIHN1YnNjcmlwdGlvbnMgb2JqZWN0XG4gICAgICAvLyB0byBhZGQvcmVtb3ZlIGxpc3RlbmVycyBhcyBuZWVkZWQuIFRoaXMgaXMgbW9yZSBtZW1vcnkgZWZmaWNpZW50IHRoYW5cbiAgICAgIC8vIGJsaW5kbHkgYWRkaW5nIGFuZCByZW1vdmluZyBldmVyeSBsaXN0ZW5lciBlYWNoIGV4ZWN1dGlvbi5cbiAgICAgIGZvciAodmFyIHByb3BlcnR5IGluIHN1YnNjcmlwdGlvbnMpIHtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHN1YnNjcmlwdGlvbnNbcHJvcGVydHldKSB7XG4gICAgICAgICAgaWYgKCFwcmV2U3Vic2NyaXB0aW9uc1twcm9wZXJ0eV1ba2V5XSkge1xuICAgICAgICAgICAgdmFyIHN1YnNjcmlwdGlvbiA9IHN1YnNjcmlwdGlvbnNbcHJvcGVydHldW2tleV07XG4gICAgICAgICAgICBlbnYuc3Vic2NyaWJlKHN1YnNjcmlwdGlvbiwgcHJvcGVydHksIHN1YnNjcmliZXIudXBkYXRlKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZGVsZXRlIHByZXZTdWJzY3JpcHRpb25zW3Byb3BlcnR5XVtrZXldO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBMb29wIG92ZXIgcHJldmlvdXMgc3Vic2NyaXB0aW9ucyB0aGF0IG5vIGxvbmdlciBleGlzdCBhbmQgdW5zdWJzY3JpYmUuXG4gICAgICBlYWNoU3Vic2NyaXB0aW9uKHByZXZTdWJzY3JpcHRpb25zLCBlbnYudW5zdWJzY3JpYmUpO1xuXG4gICAgICAvLyBSZW1vdmUgYW55IGxpbmdlcmluZyByZWZlcmVuY2VzIHRvIHByZXZpb3VzIHN1YnNjcmlwdGlvbiBvYmplY3RzLlxuICAgICAgcHJldlN1YnNjcmlwdGlvbnMgPSBudWxsO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBVbnN1YnNjcmliZSBldmVyeSBjaGlsZCBvZiB0aGUgY3VycmVudCBzdWJzY3JpcHRpb24uXG4gICAgICovXG4gICAgdmFyIHVuc3Vic2NyaWJlQ2hpbGRyZW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICBmb3IgKHZhciBjaGlsZCBpbiBzdWJzY3JpYmVyLmNoaWxkcmVuKSB7XG4gICAgICAgIHN1YnNjcmliZXIuY2hpbGRyZW5bY2hpbGRdLnJlbW92ZSgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBFeGVjdXRlIHRoZSBmdW5jdGlvbiBhbmQgcmV0dXJuIHRoZSByZXN1bHQuXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHsqfVxuICAgICAqL1xuICAgIHZhciBleGVjdXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgLy8gSWYgd2UgaGF2ZSBhIHBhcmVudCBzdWJzY3JpYmVyLCBsaW5rIHRoZSBzdWJzY3JpYmVycyB0b2dldGhlci5cbiAgICAgIGlmIChjb250YWluZXIuc3Vic2NyaWJlcikge1xuICAgICAgICBzdWJzY3JpYmVyLnBhcmVudCA9IGNvbnRhaW5lci5zdWJzY3JpYmVyO1xuICAgICAgICBzdWJzY3JpYmVyLnBhcmVudC5jaGlsZHJlbltzdWJzY3JpYmVyLmNpZF0gPSBzdWJzY3JpYmVyO1xuICAgICAgfVxuXG4gICAgICAvLyBSZXNldCBzdWJzY3JpcHRpb25zIGJlZm9yZSBleGVjdXRpb24uXG4gICAgICBzdWJzY3JpYmVyLnN1YnNjcmlwdGlvbnMgICA9IHt9O1xuICAgICAgc3Vic2NyaWJlci51bnN1YnNjcmlwdGlvbnMgPSBbXTtcblxuICAgICAgLy8gQWxpYXMgc3Vic2NyaWJlciBmdW5jdGlvbmFsaXR5IHRvIHRoZSBWTSBvYmplY3QuXG4gICAgICBjb250YWluZXIuc3Vic2NyaWJlciA9IHN1YnNjcmliZXI7XG5cbiAgICAgIHZhciB2YWx1ZSA9IGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgICAgIC8vIFJlc2V0IHRoZSBWTSBmdW5jdGlvbmFsaXR5IHRvIHdoYXQgaXQgd2FzIGJlZm9yZWhhbmQuXG4gICAgICBjb250YWluZXIuc3Vic2NyaWJlciA9IHN1YnNjcmliZXIucGFyZW50O1xuXG4gICAgICAvLyBSZXR1cm4gYW4gb2JqZWN0IHdpdGggYSB2YWx1ZSBwcm9wZXJ0eSBhbmQgdW5zdWJzY3JpYmUgZnVuY3Rpb25hbGl0eS5cbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogVGhlIHJldHVybmVkIHN1YnNjcmlwdGlvbiBmdW5jdGlvbiB0YWtlcyBjYXJlIG9mIGFsaWFzaW5nIHRoZVxuICAgICAqIHN1YnNjcmlwdGlvbnMgYXJyYXkgY29ycmVjdGx5LCBzdWJzY3JpYmluZyBmb3IgdXBkYXRlcyBhbmQgdHJpZ2dlcmluZ1xuICAgICAqIHVwZGF0ZXMgd2hlbiBhbnkgb2YgdGhlIHN1YnNjcmlwdGlvbnMgY2hhbmdlLlxuICAgICAqXG4gICAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gICAgICogQHJldHVybiB7Kn1cbiAgICAgKi9cbiAgICB2YXIgc3Vic2NyaWJlciA9IGZ1bmN0aW9uIChmbikge1xuICAgICAgdmFyIHJlc3VsdCA9IGV4ZWN1dGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAgICAgdXBkYXRlciA9IGZuO1xuICAgICAgZWFjaFN1YnNjcmlwdGlvbihzdWJzY3JpYmVyLnN1YnNjcmlwdGlvbnMsIGVudi5zdWJzY3JpYmUpO1xuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG5cbiAgICAvLyBLZWVwIGFuIGFycmF5IG9mIGN1cnJlbnQgc3Vic2NyaXB0aW9ucyBhbmQgYW4gb2JqZWN0IHdpdGggcmVmZXJlbmNlc1xuICAgIC8vIHRvIGNoaWxkIHN1YnNjcmlwdGlvbiBmdW5jdGlvbnMuXG4gICAgc3Vic2NyaWJlci5jaWQgICAgICA9ICdzdWJzY3JpYmVyJyArIFV0aWxzLnVuaXF1ZUlkKCk7XG4gICAgc3Vic2NyaWJlci5jaGlsZHJlbiA9IHt9O1xuXG4gICAgLyoqXG4gICAgICogVHJpZ2dlciB0aGlzIGZ1bmN0aW9uIHdpdGggZXZlcnkgY2hhbmdlIHdpdGggdGhlIGxpc3RlbmVycy5cbiAgICAgKi9cbiAgICBzdWJzY3JpYmVyLnVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIC8vIElmIHRoZSB0cmlnZ2VyZWQgZmxhZyBoYXMgYmVlbiBzZXQsIGRvbid0IGNhdXNlIGFub3RoZXIgdXBkYXRlLlxuICAgICAgaWYgKHRyaWdnZXJlZCB8fCB1bnN1YnNjcmliZWQpIHsgcmV0dXJuOyB9XG5cbiAgICAgIC8vIFNldCBhIHRyaWdnZXJlZCBmbGFnIHRvIGF2b2lkIG11bHRpcGxlIHRyaWdnZXJzLiBBbHNvIHVuc3Vic2NyaWJlIGFueVxuICAgICAgLy8gY2hpbGRyZW4gaW1tZWRpYXRlbHkgdG8gc3RvcCB1cGRhdGUgY2xhc2hlcy5cbiAgICAgIHRyaWdnZXJlZCA9IHRydWU7XG4gICAgICB1bnN1YnNjcmliZUNoaWxkcmVuKCk7XG5cbiAgICAgIGV4ZWNJZCA9IFZNLmV4ZWMoZnVuY3Rpb24gKCkge1xuICAgICAgICB0cmlnZ2VyZWQgPSBmYWxzZTtcblxuICAgICAgICBiZWZvcmVVcGRhdGUoKTtcbiAgICAgICAgdXBkYXRlcihleGVjdXRlKCkpO1xuICAgICAgICBhZnRlclVwZGF0ZSgpO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFB1c2ggdW5zdWJzY3JpcHRpb24gZnVuY3Rpb25zIGludG8gdGhlIHVuc3Vic2NyaWJlIGFycmF5LlxuICAgICAqL1xuICAgIHN1YnNjcmliZXIudW5zdWJzY3JpYmUgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgIFV0aWxzLmlzRnVuY3Rpb24oZm4pICYmIHN1YnNjcmliZXIudW5zdWJzY3JpcHRpb25zLnB1c2goZm4pO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmUgdGhlIGN1cnJlbnQgc3Vic2NyaWJlciBmcm9tIGFsbCBsaXN0ZW5lcnMuIFdlIGFsc28gbmVlZCB0byBjYW5jZWxcbiAgICAgKiBhbnkgY3VycmVudCBleGVjdXRpb24gZXZlbnQgYW5kIHJlbW92ZSBhIHJlZmVyZW5jZSBmcm9tIHRoZSBwYXJlbnRcbiAgICAgKiBzdWJzY3JpcHRpb24uXG4gICAgICovXG4gICAgc3Vic2NyaWJlci5yZW1vdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBpdGVyYXRpb24oc3Vic2NyaWJlci51bnN1YnNjcmlwdGlvbnMpO1xuICAgICAgZWFjaFN1YnNjcmlwdGlvbihzdWJzY3JpYmVyLnN1YnNjcmlwdGlvbnMsIGVudi51bnN1YnNjcmliZSk7XG5cbiAgICAgIC8vIFJlbW92ZSB0aGUgY3VycmVudCBzdWJzY3JpcHRpb24gZnJvbSBpdHMgcGFyZW50LlxuICAgICAgaWYgKHN1YnNjcmliZXIucGFyZW50KSB7XG4gICAgICAgIGRlbGV0ZSBzdWJzY3JpYmVyLnBhcmVudC5jaGlsZHJlbltzdWJzY3JpYmVyLmNpZF07XG4gICAgICAgIGRlbGV0ZSBzdWJzY3JpYmVyLnBhcmVudDtcbiAgICAgIH1cblxuICAgICAgLy8gUmVtb3ZlIG90aGVyIHJlZmVybmVuY2VzLlxuICAgICAgdXBkYXRlciA9IG51bGw7XG5cbiAgICAgIC8vIFRyYWNrIHdoZXRoZXIgd2UgaGF2ZSBiZWVuIHVuc3Vic2NyaWJlZC4gVGhpcyBpcyByZXF1aXJlZCBzaW5jZSB0aGVcbiAgICAgIC8vIGxpc3RlbmVyIGNvdWxkIHN0aWxsIGJlIHRyaWdnZXJlZCBhdCBhbnkgdGltZSBldmVuIHRob3VnaCB3ZSBleHBlY3RcbiAgICAgIC8vIHRoZSBleHRlcm5hbCByZWZlcmVuY2VzIHRvIGJlIGRyb3BwZWQuIFRoaXMgY291bGQgYWxzbyBpbmRpY2F0ZSBhXG4gICAgICAvLyBwb3RlbnRpYWwgbWVtb3J5IGxlYWsgd2l0aCB0aGUgbGlzdGVuZXIgdW5zdXNiY3JpcHRpb24gY29kZS5cbiAgICAgIHVuc3Vic2NyaWJlZCA9IHRydWU7XG4gICAgICB1bnN1YnNjcmliZUNoaWxkcmVuKCk7XG4gICAgICBWTS5leGVjLmNhbmNlbChleGVjSWQpO1xuICAgIH07XG5cbiAgICByZXR1cm4gc3Vic2NyaWJlcjtcbiAgfTtcblxuICAvKipcbiAgICogV3JhcCBhIGZ1bmN0aW9uIGluIGEgc3Vic2NyaWJlciAqZXZlcnkqIHRpbWUgdGhhdCBmdW5jdGlvbiBpcyBjYWxsZWQuXG4gICAqXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICAgKiBAcmV0dXJuIHtPYmplY3R9XG4gICAqL1xuICB2YXIgd3JhcFN1YnNjcmliZXIgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIHN1YnNjcmliZXIgPSBzdWJzY3JpYmUoZm4pO1xuICAgICAgdmFyIHZhbHVlICAgICAgPSBzdWJzY3JpYmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgICAgIC8vIFJldHVybiBhbiBvYmplY3Qgd3JhcHBlZCBpbiB1c2VmdWwgZnVuY3Rpb25hbGl0eS5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHZhbHVlOiAgICAgICB2YWx1ZSxcbiAgICAgICAgdW5zdWJzY3JpYmU6IHN1YnNjcmliZXIucmVtb3ZlXG4gICAgICB9O1xuICAgIH07XG4gIH07XG5cbiAgLyoqXG4gICAqIFRoZSBjb250YWluZXIgb2JqZWN0IGhvbGRzIGFsbCB0aGUgZnVuY3Rpb25zIHVzZWQgYnkgdGhlIHRlbXBsYXRlIHNwZWMuXG4gICAqXG4gICAqIEB0eXBlIHtPYmplY3R9XG4gICAqL1xuICB2YXIgY29udGFpbmVyID0ge1xuICAgIGludm9rZVBhcnRpYWw6ICAgIFZNLmludm9rZVBhcnRpYWwsXG4gICAgcHJvZ3JhbXM6ICAgICAgICAgW10sXG4gICAgbm9vcDogICAgICAgICAgICAgVk0ubm9vcCxcbiAgICBwYXJ0aWFsOiAgICAgICAgICBVdGlscy5wYXJ0aWFsLFxuICAgIGVzY2FwZUV4cHJlc3Npb246IFV0aWxzLmVzY2FwZUV4cHJlc3Npb24sXG4gICAgcHJvZ3JhbVdpdGhEZXB0aDogVk0ucHJvZ3JhbVdpdGhEZXB0aFxuICB9O1xuXG4gIC8qKlxuICAgKiBSZW5kZXIgYW5kIHN1YnNjcmliZSBhIHNpbmdsZSBET00gbm9kZSB1c2luZyBhIGN1c3RvbSBjcmVhdGlvbiBmdW5jdGlvbi5cbiAgICpcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBjcmVhdGVcbiAgICogQHJldHVybiB7Tm9kZX1cbiAgICovXG4gIHZhciBzdWJzY3JpYmVOb2RlID0gZnVuY3Rpb24gKGZuLCBjcmVhdGUpIHtcbiAgICB2YXIgc3Vic2NyaXB0aW9uID0gc3Vic2NyaWJlKGZuKTtcblxuICAgIHZhciB0cmFja05vZGUgPSBVdGlscy50cmFja05vZGUoY3JlYXRlKHN1YnNjcmlwdGlvbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHRyYWNrTm9kZS5yZXBsYWNlKGNyZWF0ZSh2YWx1ZSkpO1xuICAgIH0pKSk7XG5cbiAgICByZXR1cm4gdHJhY2tOb2RlLmZyYWdtZW50O1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZW1vdmUgYW4gYXR0cmlidXRlIGZyb20gYW4gZWxlbWVudC5cbiAgICpcbiAgICogQHBhcmFtIHtOb2RlfSAgIGVsZW1lbnRcbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAgICovXG4gIHZhciByZW1vdmVBdHRyaWJ1dGUgPSBmdW5jdGlvbiAoZWxlbWVudCwgbmFtZSkge1xuICAgIGlmIChlbGVtZW50Lmhhc0F0dHJpYnV0ZShuYW1lKSkge1xuICAgICAgZW52LmVtaXQoJ3JlbW92ZUF0dHJpYnV0ZScsIGVsZW1lbnQsIG5hbWUpO1xuICAgICAgZWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUobmFtZSk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBTZXQgYW4gYXR0cmlidXRlIHZhbHVlIG9uIGFuIGVsZW1lbnQuXG4gICAqXG4gICAqIEBwYXJhbSB7Tm9kZX0gICBlbGVtZW50XG4gICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gICAqIEBwYXJhbSB7Kn0gICAgICB2YWx1ZVxuICAgKi9cbiAgdmFyIHNldEF0dHJpYnV0ZSA9IGZ1bmN0aW9uIChlbGVtZW50LCBuYW1lLCB2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSA9PT0gZmFsc2UpIHtcbiAgICAgIHJldHVybiByZW1vdmVBdHRyaWJ1dGUoZWxlbWVudCwgbmFtZSk7XG4gICAgfVxuXG4gICAgZW52LmVtaXQoJ3NldEF0dHJpYnV0ZScsIGVsZW1lbnQsIG5hbWUsIHZhbHVlKTtcbiAgICBlbGVtZW50LnNldEF0dHJpYnV0ZShuYW1lLCB2YWx1ZSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhbiBlbGVtZW50IGZyb20gYSB0YWcgbmFtZS5cbiAgICpcbiAgICogQHBhcmFtICB7U3RyaW5nfSB0YWdOYW1lXG4gICAqIEByZXR1cm4ge05vZGV9XG4gICAqL1xuICB2YXIgY3JlYXRlRWxlbWVudCA9IGZ1bmN0aW9uICh0YWdOYW1lKSB7XG4gICAgdmFyIG5vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHRhZ05hbWUpO1xuICAgIGVudi5lbWl0KCdjcmVhdGVFbGVtZW50Jywgbm9kZSk7XG4gICAgcmV0dXJuIG5vZGU7XG4gIH07XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIGNvbW1lbnQgbm9kZSBiYXNlZCBvbiB0ZXh0IGNvbnRlbnRzLlxuICAgKlxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IGNvbnRlbnRzXG4gICAqIEByZXR1cm4ge05vZGV9XG4gICAqL1xuICB2YXIgY3JlYXRlQ29tbWVudCA9IGZ1bmN0aW9uICh0YWdOYW1lKSB7XG4gICAgdmFyIG5vZGUgPSBkb2N1bWVudC5jcmVhdGVDb21tZW50KHRhZ05hbWUpO1xuICAgIGVudi5lbWl0KCdjcmVhdGVDb21tZW50Jywgbm9kZSk7XG4gICAgcmV0dXJuIG5vZGU7XG4gIH07XG5cbiAgLyoqXG4gICAqIENvcHkgYWxsIHNpZ25pZmljYW50IGRhdGEgZnJvbSBvbmUgZWxlbWVudCBub2RlIHRvIGFub3RoZXIuXG4gICAqXG4gICAqIEBwYXJhbSAge05vZGV9IG5ld05vZGVcbiAgICogQHBhcmFtICB7Tm9kZX0gb2xkTm9kZVxuICAgKiBAcmV0dXJuIHtOb2RlfVxuICAgKi9cbiAgdmFyIGNvcHlOb2RlID0gZnVuY3Rpb24gKG5ld05vZGUsIG9sZE5vZGUpIHtcbiAgICAvLyBNb3ZlIGFsbCBjaGlsZCBlbGVtZW50cyB0byB0aGUgbmV3IG5vZGUuXG4gICAgd2hpbGUgKG9sZE5vZGUuZmlyc3RDaGlsZCkge1xuICAgICAgbmV3Tm9kZS5hcHBlbmRDaGlsZChvbGROb2RlLmZpcnN0Q2hpbGQpO1xuICAgIH1cblxuICAgIC8vIENvcHkgYWxsIHRoZSBhdHRyaWJ1dGVzIHRvIHRoZSBuZXcgbm9kZS5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9sZE5vZGUuYXR0cmlidXRlcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGF0dHJpYnV0ZSA9IG9sZE5vZGUuYXR0cmlidXRlc1tpXTtcbiAgICAgIHNldEF0dHJpYnV0ZShuZXdOb2RlLCBhdHRyaWJ1dGUubmFtZSwgYXR0cmlidXRlLnZhbHVlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3Tm9kZTtcbiAgfTtcblxuICAvKipcbiAgICogQ29weSBhbGwgdGhlIGRhdGEgZnJvbSBvbmUgZWxlbWVudCB0byBhbm90aGVyIGFuZCByZXBsYWNlIGluIHBsYWNlLlxuICAgKlxuICAgKiBAcGFyYW0gIHtOb2RlfSBuZXdOb2RlXG4gICAqIEBwYXJhbSAge05vZGV9IG9sZE5vZGVcbiAgICogQHJldHVybiB7Tm9kZX1cbiAgICovXG4gIHZhciBjb3B5QW5kUmVwbGFjZU5vZGUgPSBmdW5jdGlvbiAobmV3Tm9kZSwgb2xkTm9kZSkge1xuICAgIG9sZE5vZGUucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQoY29weU5vZGUobmV3Tm9kZSwgb2xkTm9kZSksIG9sZE5vZGUpO1xuICAgIHJldHVybiBuZXdOb2RlO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDcmVhdGUgYW4gZWxlbWVudCBhbmQgc3Vic2NyaWJlIHRvIGFueSBjaGFuZ2VzLiBUaGlzIG1ldGhvZCByZXF1aXJlcyBhXG4gICAqIGNhbGxiYWNrIGZ1bmN0aW9uIGZvciBhbnkgZWxlbWVudCBjaGFuZ2VzIHNpbmNlIHlvdSBjYW4ndCBjaGFuZ2UgYSB0YWdcbiAgICogbmFtZSBpbiBwbGFjZS5cbiAgICpcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBjYlxuICAgKiBAcmV0dXJuIHtFbGVtZW50fVxuICAgKi9cbiAgY29udGFpbmVyLmNyZWF0ZUVsZW1lbnQgPSBmdW5jdGlvbiAoZm4sIGNiKSB7XG4gICAgdmFyIHN1YnNjcmlwdGlvbiA9IHN1YnNjcmliZShmbik7XG5cbiAgICB2YXIgZWwgPSBjcmVhdGVFbGVtZW50KHN1YnNjcmlwdGlvbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIGNiKGVsID0gY29weUFuZFJlcGxhY2VOb2RlKGNyZWF0ZUVsZW1lbnQodmFsdWUpLCBlbCkpO1xuICAgIH0pKTtcblxuICAgIHJldHVybiBlbDtcbiAgfTtcblxuICAvKipcbiAgICogQXBwZW5kIGFuIGVsZW1lbnQgdG8gdGhlIGVuZCBvZiBhbm90aGVyIGVsZW1lbnQuXG4gICAqXG4gICAqIEBwYXJhbSB7Tm9kZX0gcGFyZW50XG4gICAqIEBwYXJhbSB7Tm9kZX0gY2hpbGRcbiAgICovXG4gIGNvbnRhaW5lci5hcHBlbmRDaGlsZCA9IGZ1bmN0aW9uIChwYXJlbnQsIGNoaWxkKSB7XG4gICAgaWYgKCFjaGlsZCkgeyByZXR1cm47IH1cblxuICAgIHBhcmVudC5hcHBlbmRDaGlsZChjaGlsZCk7XG4gICAgZW52LmVtaXQoJ2FwcGVuZENoaWxkJywgcGFyZW50LCBjaGlsZCk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFNldCBhbiBlbGVtZW50cyBhdHRyaWJ1dGUuIFdlIGFjY2VwdCB0aGUgY3VycmVudCBlbGVtZW50IGEgZnVuY3Rpb25cbiAgICogYmVjYXVzZSB3aGVuIGEgdGFnIG5hbWUgY2hhbmdlcyB3ZSB3aWxsIGxvc2UgcmVmZXJlbmNlIHRvIHRoZSBhY3RpdmVseVxuICAgKiByZW5kZXJlZCBlbGVtZW50LlxuICAgKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBlbGVtZW50Rm5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gbmFtZUZuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IHZhbHVlRm5cbiAgICovXG4gIGNvbnRhaW5lci5zZXRBdHRyaWJ1dGUgPSBmdW5jdGlvbiAoZWxlbWVudEZuLCBuYW1lRm4sIHZhbHVlRm4pIHtcbiAgICB2YXIgbmFtZVN1YnNjcmlwdGlvbiAgPSBzdWJzY3JpYmUobmFtZUZuKTtcbiAgICB2YXIgdmFsdWVTdWJzY3JpcHRpb24gPSBzdWJzY3JpYmUodmFsdWVGbik7XG5cbiAgICAvLyBLZWVwIHRyYWNrIG9mIHRoZSBjdXJyZW50IG5hbWUgYW5kIHZhbHVlIHdpdGhvdXQgaGF2aW5nIHRvIHJlLXJ1biB0aGVcbiAgICAvLyBmdW5jdGlvbiBldmVyeSB0aW1lIHNvbWV0aGluZyBjaGFuZ2VzLlxuICAgIHZhciBhdHRyTmFtZSA9IG5hbWVTdWJzY3JpcHRpb24oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICByZW1vdmVBdHRyaWJ1dGUoZWxlbWVudEZuKCksIGF0dHJOYW1lKTtcbiAgICAgIHNldEF0dHJpYnV0ZShlbGVtZW50Rm4oKSwgYXR0ck5hbWUgPSB2YWx1ZSwgYXR0clZhbHVlKTtcbiAgICB9KTtcblxuICAgIHZhciBhdHRyVmFsdWUgPSB2YWx1ZVN1YnNjcmlwdGlvbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHNldEF0dHJpYnV0ZShlbGVtZW50Rm4oKSwgYXR0ck5hbWUsIGF0dHJWYWx1ZSA9IHZhbHVlKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBzZXRBdHRyaWJ1dGUoZWxlbWVudEZuKCksIGF0dHJOYW1lLCBhdHRyVmFsdWUpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBET00gZWxlbWVudCBhbmQgc3Vic2NyaWJlIHRvIGFueSBjaGFuZ2VzLlxuICAgKlxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAgICogQHJldHVybiB7Tm9kZX1cbiAgICovXG4gIGNvbnRhaW5lci5jcmVhdGVET00gPSBmdW5jdGlvbiAoZm4pIHtcbiAgICByZXR1cm4gc3Vic2NyaWJlTm9kZShmbiwgVXRpbHMuZG9taWZ5RXhwcmVzc2lvbik7XG4gIH07XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIHRleHQgbm9kZSBhbmQgc3Vic2NyaWJlIHRvIGFueSBjaGFuZ2VzLlxuICAgKlxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAgICogQHJldHVybiB7VGV4dH1cbiAgICovXG4gIGNvbnRhaW5lci5jcmVhdGVUZXh0ID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgcmV0dXJuIHN1YnNjcmliZU5vZGUoZm4sIFV0aWxzLnRleHRpZnlFeHByZXNzaW9uKTtcbiAgfTtcblxuICAvKipcbiAgICogQ3JlYXRlIGEgY29tbWVudCBub2RlIGFuZCBzdWJzY3JpYmUgdG8gYW55IGNoYW5nZXMuXG4gICAqXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICAgKiBAcmV0dXJuIHtDb21tZW50fVxuICAgKi9cbiAgY29udGFpbmVyLmNyZWF0ZUNvbW1lbnQgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICB2YXIgc3Vic2NyaXB0aW9uID0gc3Vic2NyaWJlKGZuKTtcbiAgICB2YXIgbm9kZSAgICAgICAgID0gY3JlYXRlQ29tbWVudChzdWJzY3JpcHRpb24oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICBub2RlLnRleHRDb250ZW50ID0gdmFsdWU7XG4gICAgfSkpO1xuXG4gICAgcmV0dXJuIG5vZGU7XG4gIH07XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhbmQgcmV0dXJuIGEgcHJvZ3JhbSBzaW5nbGV0b24gYmFzZWQgb24gaW5kZXguXG4gICAqXG4gICAqIEBwYXJhbSAge051bWJlcn0gICBpXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICAgKiBAcGFyYW0gIHtPYmplY3R9ICAgZGF0YVxuICAgKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAgICovXG4gIGNvbnRhaW5lci5wcm9ncmFtID0gZnVuY3Rpb24gKGksIGZuLCBkYXRhKSB7XG4gICAgdmFyIHByb2dyYW1XcmFwcGVyID0gY29udGFpbmVyLnByb2dyYW1zW2ldO1xuXG4gICAgaWYgKGRhdGEpIHtcbiAgICAgIHJldHVybiBWTS5wcm9ncmFtKGksIGZuLCBkYXRhKTtcbiAgICB9XG5cbiAgICBpZiAoIXByb2dyYW1XcmFwcGVyKSB7XG4gICAgICByZXR1cm4gY29udGFpbmVyLnByb2dyYW1zW2ldID0gVk0ucHJvZ3JhbShpLCBmbik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHByb2dyYW1XcmFwcGVyO1xuICB9O1xuXG4gIC8qKlxuICAgKiBXcmFwIHByb2dyYW0gZnVuY3Rpb25zIHdpdGggc3Vic2NyaWJlciBmdW5jdGlvbmFsaXR5LlxuICAgKlxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gcHJvZ3JhbVxuICAgKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAgICovXG4gIGNvbnRhaW5lci53cmFwUHJvZ3JhbSA9IGZ1bmN0aW9uIChmbikge1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gd3JhcFN1YnNjcmliZXIoZm4pLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfTtcblxuICAvKipcbiAgICogTWVyZ2UgdHdvIG9iamVjdHMgaW50byBhIHNpbmdsZSBvYmplY3QuXG4gICAqXG4gICAqIEBwYXJhbSAge09iamVjdH0gcGFyYW1cbiAgICogQHBhcmFtICB7T2JqZWN0fSBjb21tb25cbiAgICogQHJldHVybiB7T2JqZWN0fVxuICAgKi9cbiAgY29udGFpbmVyLm1lcmdlID0gZnVuY3Rpb24gKHBhcmFtLCBjb21tb24pIHtcbiAgICB2YXIgcmV0ID0gcGFyYW0gfHwgY29tbW9uO1xuXG4gICAgaWYgKHBhcmFtICYmIGNvbW1vbiAmJiAocGFyYW0gIT09IGNvbW1vbikpIHtcbiAgICAgIHJldCA9IHt9O1xuICAgICAgVXRpbHMuZXh0ZW5kKHJldCwgY29tbW9uKTtcbiAgICAgIFV0aWxzLmV4dGVuZChyZXQsIHBhcmFtKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmV0O1xuICB9O1xuXG4gIC8qKlxuICAgKiBHZXQgYSBwcm9wZXJ0eSBmcm9tIGFuIG9iamVjdC4gUGFzc2VzIGluIHRoZSBvYmplY3QgaWQgKGRlcHRoKSB0byBtYWtlIGl0XG4gICAqIG11Y2ggZmFzdGVyIHRvIGRvIGNvbXBhcmlzb25zIGJldHdlZW4gbmV3IGFuZCBvbGQgc3Vic2NyaXB0aW9ucy5cbiAgICpcbiAgICogQHBhcmFtICB7T2JqZWN0fSBvYmplY3RcbiAgICogQHBhcmFtICB7U3RyaW5nfSBwcm9wZXJ0eVxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IGlkXG4gICAqIEByZXR1cm4geyp9XG4gICAqL1xuICBjb250YWluZXIuZ2V0ID0gZnVuY3Rpb24gKG9iamVjdCwgcHJvcGVydHksIGlkKSB7XG4gICAgdmFyIHN1YnNjcmlwdGlvbnMgPSBjb250YWluZXIuc3Vic2NyaWJlci5zdWJzY3JpcHRpb25zO1xuXG4gICAgKHN1YnNjcmlwdGlvbnNbcHJvcGVydHldIHx8IChzdWJzY3JpcHRpb25zW3Byb3BlcnR5XSA9IHt9KSlbaWRdID0gb2JqZWN0O1xuXG4gICAgcmV0dXJuIGVudi5nZXQob2JqZWN0LCBwcm9wZXJ0eSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJldHVybiB0aGUgY29tcGlsZWQgSmF2YVNjcmlwdCBmdW5jdGlvbiBmb3IgZXhlY3V0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGNvbnRleHRcbiAgICogQHBhcmFtICB7T2JqZWN0fSBvcHRpb25zXG4gICAqIEByZXR1cm4ge05vZGV9XG4gICAqL1xuICByZXR1cm4gd3JhcFN1YnNjcmliZXIoZnVuY3Rpb24gKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgIHZhciBuYW1lc3BhY2UgPSBvcHRpb25zLnBhcnRpYWwgPyBvcHRpb25zIDogZW52O1xuICAgIHZhciBoZWxwZXJzO1xuICAgIHZhciBwYXJ0aWFscztcblxuICAgIGlmICghb3B0aW9ucy5wYXJ0aWFsKSB7XG4gICAgICBoZWxwZXJzICA9IG9wdGlvbnMuaGVscGVycztcbiAgICAgIHBhcnRpYWxzID0gb3B0aW9ucy5wYXJ0aWFscztcbiAgICB9XG5cbiAgICB2YXIgcmVzdWx0ID0gdGVtcGxhdGVTcGVjLmNhbGwoXG4gICAgICBjb250YWluZXIsXG4gICAgICBuYW1lc3BhY2UsXG4gICAgICBjb250ZXh0LFxuICAgICAgaGVscGVycyxcbiAgICAgIHBhcnRpYWxzLFxuICAgICAgb3B0aW9ucy5kYXRhXG4gICAgKTtcblxuICAgIGlmICghb3B0aW9ucy5wYXJ0aWFsKSB7XG4gICAgICBlbnYuVk0uY2hlY2tSZXZpc2lvbihjb250YWluZXIuY29tcGlsZXJJbmZvKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9KTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJ2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9zYWZlLXN0cmluZycpLmRlZmF1bHQ7XG4iLCJ2YXIgVHJhY2tOb2RlID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAobm9kZSkge1xuICB0aGlzLmZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuXG4gIC8vIEluc3RhbnRseSBhcHBlbmQgYSBiZWZvcmUgYW5kIGFmdGVyIHRyYWNraW5nIG5vZGUuXG4gIHRoaXMuYmVmb3JlID0gdGhpcy5mcmFnbWVudC5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJykpO1xuICB0aGlzLmFmdGVyICA9IHRoaXMuZnJhZ21lbnQuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpKTtcblxuICAvLyBBcHBlbmQgdGhlIHBhc3NlZCBpbiBub2RlIHRvIHRoZSBjdXJyZW50IGZyYWdtZW50LlxuICBub2RlICYmIHRoaXMuYXBwZW5kQ2hpbGQobm9kZSk7XG59O1xuXG4vKipcbiAqIEFwcGVuZCBhIG5vZGUgdG8gdGhlIGN1cnJlbnQgdHJhY2tpbmcgZnJhZ21lbnQuXG4gKlxuICogQHBhcmFtICB7Tm9kZX0gbm9kZVxuICogQHJldHVybiB7dGhpc31cbiAqL1xuVHJhY2tOb2RlLnByb3RvdHlwZS5hcHBlbmRDaGlsZCA9IGZ1bmN0aW9uIChub2RlKSB7XG4gIHRoaXMuYWZ0ZXIucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUobm9kZSwgdGhpcy5hZnRlcik7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFByZXBlbmQgYSBub2RlIHRvIHRoZSBjdXJyZW50IHRyYWNraW5nIGZyYWdtZW50LlxuICpcbiAqIEBwYXJhbSAge05vZGV9IG5vZGVcbiAqIEByZXR1cm4ge3RoaXN9XG4gKi9cblRyYWNrTm9kZS5wcm90b3R5cGUucHJlcGVuZENoaWxkID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgdGhpcy5iZWZvcmUucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUobm9kZSwgdGhpcy5iZWZvcmUubmV4dFNpYmxpbmcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgYWxsIGVsZW1lbnRzIGJldHdlZW4gdGhlIHR3byB0cmFja2luZyBub2Rlcy5cbiAqXG4gKiBAcGFyYW0gIHtOb2RlfSBub2RlXG4gKiBAcmV0dXJuIHt0aGlzfVxuICovXG5UcmFja05vZGUucHJvdG90eXBlLmVtcHR5ID0gZnVuY3Rpb24gKCkge1xuICB3aGlsZSAodGhpcy5iZWZvcmUubmV4dFNpYmxpbmcgIT09IHRoaXMuYWZ0ZXIpIHtcbiAgICB0aGlzLmJlZm9yZS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMuYmVmb3JlLm5leHRTaWJsaW5nKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgdGhlIHRoZSBlbGVtZW50cyBmcm9tIHRoZSBET00uXG4gKlxuICogQHBhcmFtICB7Tm9kZX0gbm9kZVxuICogQHJldHVybiB7dGhpc31cbiAqL1xuVHJhY2tOb2RlLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAoKSB7XG4gIHdoaWxlICh0aGlzLmJlZm9yZS5uZXh0U2libGluZyAhPT0gdGhpcy5hZnRlcikge1xuICAgIHRoaXMuZnJhZ21lbnQuYXBwZW5kQ2hpbGQodGhpcy5iZWZvcmUubmV4dFNpYmxpbmcpO1xuICB9XG5cbiAgLy8gUHVsbCB0aGUgdHdvIHJlZmVyZW5jZSBub2RlcyBvdXQgb2YgdGhlIERPTSBhbmQgaW50byB0aGUgZnJhZ21lbnQuXG4gIHRoaXMuZnJhZ21lbnQuYXBwZW5kQ2hpbGQodGhpcy5hZnRlcik7XG4gIHRoaXMuZnJhZ21lbnQuaW5zZXJ0QmVmb3JlKHRoaXMuYmVmb3JlLCB0aGlzLmZyYWdtZW50LmZpcnN0Q2hpbGQpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZXBsYWNlIHRoZSBjb250ZW50cyBvZiB0aGUgdHJhY2tpbmcgbm9kZSB3aXRoIG5ldyBjb250ZW50cy5cbiAqXG4gKiBAcGFyYW0gIHtOb2RlfSBub2RlXG4gKiBAcmV0dXJuIHt0aGlzfVxuICovXG5UcmFja05vZGUucHJvdG90eXBlLnJlcGxhY2UgPSBmdW5jdGlvbiAobm9kZSkge1xuICByZXR1cm4gdGhpcy5lbXB0eSgpLmFwcGVuZENoaWxkKG5vZGUpO1xufTtcbiIsInZhciBoYnNVdGlscyAgID0gcmVxdWlyZSgnaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL3V0aWxzJyk7XG52YXIgdW5pcXVlSWQgICA9IDA7XG52YXIgVHJhY2tOb2RlICA9IHJlcXVpcmUoJy4vdHJhY2stbm9kZScpO1xudmFyIFNhZmVTdHJpbmcgPSByZXF1aXJlKCcuL3NhZmUtc3RyaW5nJyk7XG52YXIgX19zbGljZSAgICA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcblxuLyoqXG4gKiBTaW1wbGUgd2F5IHRvIHN1YmNsYXNzIGFuIG9iamVjdCwgd2l0aCBzdXBwb3J0IGZvciBvbGRlciBicm93c2Vycy5cbiAqXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cbnZhciBjcmVhdGUgPSBPYmplY3QuY3JlYXRlIHx8IChmdW5jdGlvbiAoKSB7XG4gIHZhciBGID0gZnVuY3Rpb24gKCkge307XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIChvKSB7XG4gICAgRi5wcm90b3R5cGUgPSBvO1xuICAgIHZhciBvYmogPSBuZXcgRigpO1xuICAgIEYucHJvdG90eXBlID0gbnVsbDtcbiAgICByZXR1cm4gb2JqO1xuICB9O1xufSkoKTtcblxuLyoqXG4gKiBFeHRlbmQgSGFuZGxlYmFycyB1dGlsaXRpZXMgd2l0aCBET00gZnVuY3Rpb25hbGl0eS5cbiAqXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG52YXIgVXRpbHMgPSBtb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZShoYnNVdGlscyk7XG5cbi8qKlxuICogUmV0dXJuIGEgdW5pcXVlIGlkLlxuICpcbiAqIEByZXR1cm4ge051bWJlcn1cbiAqL1xuVXRpbHMudW5pcXVlSWQgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB1bmlxdWVJZCsrO1xufTtcblxuLyoqXG4gKiBTaW1wbGUgcGFydGlhbCBhcHBsaWNhdGlvbiBmdW5jdGlvbi5cbiAqXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICovXG5VdGlscy5wYXJ0aWFsID0gZnVuY3Rpb24gKGZuIC8qICwgLi5hcmdzICovKSB7XG4gIHZhciBhcmdzID0gX19zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJncy5jb25jYXQoX19zbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgfTtcbn07XG5cbi8qKlxuICogRXhwb3NlIHRoZSBjcmVhdGUgZnVuY3Rpb24uXG4gKlxuICogQHR5cGUge0Z1bmN0aW9ufVxuICovXG5VdGlscy5jcmVhdGUgPSBjcmVhdGU7XG5cbi8qKlxuICogQ2hlY2sgd2hldGhlciBhbiBvYmplY3QgaXMgYWN0dWFsbHkgYSBET00gbm9kZS5cbiAqXG4gKiBAcGFyYW0gIHsqfSAgICAgICBlbGVtZW50XG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICovXG5VdGlscy5pc05vZGUgPSBmdW5jdGlvbiAoZWxlbWVudCkge1xuICByZXR1cm4gZWxlbWVudCBpbnN0YW5jZW9mIE5vZGU7XG59O1xuXG4vKipcbiAqIFRyYWNrIGEgbm9kZSBpbnN0YW5jZSBhbnl3aGVyZSBpdCBnb2VzIGluIHRoZSBET00uXG4gKlxuICogQHBhcmFtICB7Tm9kZX0gICAgICBub2RlXG4gKiBAcmV0dXJuIHtUcmFja05vZGV9XG4gKi9cblV0aWxzLnRyYWNrTm9kZSA9IGZ1bmN0aW9uIChub2RlKSB7XG4gIHJldHVybiBuZXcgVHJhY2tOb2RlKG5vZGUpO1xufTtcblxuLyoqXG4gKiBUcmFuc2Zvcm0gYSBzdHJpbmcgaW50byBhcmJpdHJhcnkgRE9NIG5vZGVzLlxuICpcbiAqIEBwYXJhbSAge1N0cmluZ30gc3RyaW5nXG4gKiBAcmV0dXJuIHtOb2RlfVxuICovXG5VdGlscy5kb21pZnlFeHByZXNzaW9uID0gZnVuY3Rpb24gKHN0cmluZykge1xuICAvLyBJZiB3ZSBwYXNzZWQgaW4gYSBzYWZlIHN0cmluZywgZ2V0IHRoZSBhY3R1YWwgdmFsdWUuXG4gIGlmIChzdHJpbmcgaW5zdGFuY2VvZiBTYWZlU3RyaW5nKSB7XG4gICAgc3RyaW5nID0gc3RyaW5nLnN0cmluZztcbiAgfVxuXG4gIC8vIE5vIG5lZWQgdG8gY29lcmNlIGEgbm9kZS5cbiAgaWYgKFV0aWxzLmlzTm9kZShzdHJpbmcpKSB7XG4gICAgcmV0dXJuIHN0cmluZztcbiAgfVxuXG4gIHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgZGl2LmlubmVySFRNTCA9IHN0cmluZztcblxuICBpZiAoZGl2LmNoaWxkTm9kZXMubGVuZ3RoID09PSAxKSB7XG4gICAgcmV0dXJuIGRpdi5yZW1vdmVDaGlsZChkaXYuY2hpbGROb2Rlc1swXSk7XG4gIH1cblxuICB2YXIgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG5cbiAgd2hpbGUgKGRpdi5maXJzdENoaWxkKSB7XG4gICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQoZGl2LmZpcnN0Q2hpbGQpO1xuICB9XG5cbiAgcmV0dXJuIGZyYWdtZW50O1xufTtcblxuLyoqXG4gKiBUcmFuc2Zvcm0gYSBzdHJpbmcgaW50byBhIERPTSB0ZXh0IG5vZGUgZm9yIGFwcGVuZGluZyB0byB0aGUgdGVtcGxhdGUuXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSBzdHJpbmdcbiAqIEByZXR1cm4ge1RleHR9XG4gKi9cblV0aWxzLnRleHRpZnlFeHByZXNzaW9uID0gZnVuY3Rpb24gKHN0cmluZykge1xuICBpZiAoc3RyaW5nIGluc3RhbmNlb2YgU2FmZVN0cmluZykge1xuICAgIHJldHVybiBVdGlscy5kb21pZnlFeHByZXNzaW9uKHN0cmluZy5zdHJpbmcpO1xuICB9XG5cbiAgLy8gQ2F0Y2ggd2hlbiB0aGUgc3RyaW5nIGlzIGFjdHVhbGx5IGEgRE9NIG5vZGUgYW5kIHR1cm4gaXQgaW50byBhIHN0cmluZy5cbiAgaWYgKFV0aWxzLmlzTm9kZShzdHJpbmcpKSB7XG4gICAgLy8gQWxyZWFkeSBhIHRleHQgbm9kZSwganVzdCByZXR1cm4gaXQgaW1tZWRpYXRlbHkuXG4gICAgaWYgKHN0cmluZy5ub2RlVHlwZSA9PT0gMykge1xuICAgICAgcmV0dXJuIHN0cmluZztcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHN0cmluZy5vdXRlckhUTUwgPT09ICdzdHJpbmcnKSB7XG4gICAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoc3RyaW5nLm91dGVySFRNTCk7XG4gICAgfVxuXG4gICAgdmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGRpdi5hcHBlbmRDaGlsZChzdHJpbmcuY2xvbmVOb2RlKHRydWUpKTtcbiAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoZGl2LmlubmVySFRNTCk7XG4gIH1cblxuICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoc3RyaW5nID09IG51bGwgPyAnJyA6IHN0cmluZyk7XG59O1xuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgdGhpcy5fZXZlbnRzID0gdGhpcy5fZXZlbnRzIHx8IHt9O1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG5FdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gIGlmICghaXNOdW1iZXIobikgfHwgbiA8IDAgfHwgaXNOYU4obikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCduIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBlciwgaGFuZGxlciwgbGVuLCBhcmdzLCBpLCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xuICAgIGlmICghdGhpcy5fZXZlbnRzLmVycm9yIHx8XG4gICAgICAgIChpc09iamVjdCh0aGlzLl9ldmVudHMuZXJyb3IpICYmICF0aGlzLl9ldmVudHMuZXJyb3IubGVuZ3RoKSkge1xuICAgICAgZXIgPSBhcmd1bWVudHNbMV07XG4gICAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBlcjsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IFR5cGVFcnJvcignVW5jYXVnaHQsIHVuc3BlY2lmaWVkIFwiZXJyb3JcIiBldmVudC4nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc1VuZGVmaW5lZChoYW5kbGVyKSlcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIC8vIGZhc3QgY2FzZXNcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc09iamVjdChoYW5kbGVyKSkge1xuICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcblxuICAgIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBtO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gIGlmICh0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgICAgIGlzRnVuY3Rpb24obGlzdGVuZXIubGlzdGVuZXIpID9cbiAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIGVsc2UgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZVxuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcblxuICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSAmJiAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuICAgIHZhciBtO1xuICAgIGlmICghaXNVbmRlZmluZWQodGhpcy5fbWF4TGlzdGVuZXJzKSkge1xuICAgICAgbSA9IHRoaXMuX21heExpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cblxuICAgIGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICB2YXIgZmlyZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBnKCkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG5cbiAgICBpZiAoIWZpcmVkKSB7XG4gICAgICBmaXJlZCA9IHRydWU7XG4gICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIGcubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgdGhpcy5vbih0eXBlLCBnKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZmYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGxpc3QsIHBvc2l0aW9uLCBsZW5ndGgsIGk7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgbGVuZ3RoID0gbGlzdC5sZW5ndGg7XG4gIHBvc2l0aW9uID0gLTE7XG5cbiAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAoaXNGdW5jdGlvbihsaXN0Lmxpc3RlbmVyKSAmJiBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gIH0gZWxzZSBpZiAoaXNPYmplY3QobGlzdCkpIHtcbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSA+IDA7KSB7XG4gICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAobGlzdFtpXS5saXN0ZW5lciAmJiBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpc3Quc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBrZXksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gIGlmICghdGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgZm9yIChrZXkgaW4gdGhpcy5fZXZlbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGxpc3RlbmVycykpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gTElGTyBvcmRlclxuICAgIHdoaWxlIChsaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbbGlzdGVuZXJzLmxlbmd0aCAtIDFdKTtcbiAgfVxuICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gW107XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24odGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgZWxzZVxuICAgIHJldCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5zbGljZSgpO1xuICByZXR1cm4gcmV0O1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghZW1pdHRlci5fZXZlbnRzIHx8ICFlbWl0dGVyLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gMDtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbihlbWl0dGVyLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IDE7XG4gIGVsc2VcbiAgICByZXQgPSBlbWl0dGVyLl9ldmVudHNbdHlwZV0ubGVuZ3RoO1xuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuIiwiaWYgKHR5cGVvZiBPYmplY3QuY3JlYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gIC8vIGltcGxlbWVudGF0aW9uIGZyb20gc3RhbmRhcmQgbm9kZS5qcyAndXRpbCcgbW9kdWxlXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICBjdG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDdG9yLnByb3RvdHlwZSwge1xuICAgICAgY29uc3RydWN0b3I6IHtcbiAgICAgICAgdmFsdWU6IGN0b3IsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICB9XG4gICAgfSk7XG4gIH07XG59IGVsc2Uge1xuICAvLyBvbGQgc2Nob29sIHNoaW0gZm9yIG9sZCBicm93c2Vyc1xuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgdmFyIFRlbXBDdG9yID0gZnVuY3Rpb24gKCkge31cbiAgICBUZW1wQ3Rvci5wcm90b3R5cGUgPSBzdXBlckN0b3IucHJvdG90eXBlXG4gICAgY3Rvci5wcm90b3R5cGUgPSBuZXcgVGVtcEN0b3IoKVxuICAgIGN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY3RvclxuICB9XG59XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHZhciBxdWV1ZSA9IFtdO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgaWYgKGV2LnNvdXJjZSA9PT0gd2luZG93ICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaXNCdWZmZXIoYXJnKSB7XG4gIHJldHVybiBhcmcgJiYgdHlwZW9mIGFyZyA9PT0gJ29iamVjdCdcbiAgICAmJiB0eXBlb2YgYXJnLmNvcHkgPT09ICdmdW5jdGlvbidcbiAgICAmJiB0eXBlb2YgYXJnLmZpbGwgPT09ICdmdW5jdGlvbidcbiAgICAmJiB0eXBlb2YgYXJnLnJlYWRVSW50OCA9PT0gJ2Z1bmN0aW9uJztcbn0iLCJ2YXIgcHJvY2Vzcz1yZXF1aXJlKFwiX19icm93c2VyaWZ5X3Byb2Nlc3NcIiksZ2xvYmFsPXR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fTsvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxudmFyIGZvcm1hdFJlZ0V4cCA9IC8lW3NkaiVdL2c7XG5leHBvcnRzLmZvcm1hdCA9IGZ1bmN0aW9uKGYpIHtcbiAgaWYgKCFpc1N0cmluZyhmKSkge1xuICAgIHZhciBvYmplY3RzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIG9iamVjdHMucHVzaChpbnNwZWN0KGFyZ3VtZW50c1tpXSkpO1xuICAgIH1cbiAgICByZXR1cm4gb2JqZWN0cy5qb2luKCcgJyk7XG4gIH1cblxuICB2YXIgaSA9IDE7XG4gIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICB2YXIgbGVuID0gYXJncy5sZW5ndGg7XG4gIHZhciBzdHIgPSBTdHJpbmcoZikucmVwbGFjZShmb3JtYXRSZWdFeHAsIGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoeCA9PT0gJyUlJykgcmV0dXJuICclJztcbiAgICBpZiAoaSA+PSBsZW4pIHJldHVybiB4O1xuICAgIHN3aXRjaCAoeCkge1xuICAgICAgY2FzZSAnJXMnOiByZXR1cm4gU3RyaW5nKGFyZ3NbaSsrXSk7XG4gICAgICBjYXNlICclZCc6IHJldHVybiBOdW1iZXIoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVqJzpcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoYXJnc1tpKytdKTtcbiAgICAgICAgfSBjYXRjaCAoXykge1xuICAgICAgICAgIHJldHVybiAnW0NpcmN1bGFyXSc7XG4gICAgICAgIH1cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiB4O1xuICAgIH1cbiAgfSk7XG4gIGZvciAodmFyIHggPSBhcmdzW2ldOyBpIDwgbGVuOyB4ID0gYXJnc1srK2ldKSB7XG4gICAgaWYgKGlzTnVsbCh4KSB8fCAhaXNPYmplY3QoeCkpIHtcbiAgICAgIHN0ciArPSAnICcgKyB4O1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgKz0gJyAnICsgaW5zcGVjdCh4KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHN0cjtcbn07XG5cblxuLy8gTWFyayB0aGF0IGEgbWV0aG9kIHNob3VsZCBub3QgYmUgdXNlZC5cbi8vIFJldHVybnMgYSBtb2RpZmllZCBmdW5jdGlvbiB3aGljaCB3YXJucyBvbmNlIGJ5IGRlZmF1bHQuXG4vLyBJZiAtLW5vLWRlcHJlY2F0aW9uIGlzIHNldCwgdGhlbiBpdCBpcyBhIG5vLW9wLlxuZXhwb3J0cy5kZXByZWNhdGUgPSBmdW5jdGlvbihmbiwgbXNnKSB7XG4gIC8vIEFsbG93IGZvciBkZXByZWNhdGluZyB0aGluZ3MgaW4gdGhlIHByb2Nlc3Mgb2Ygc3RhcnRpbmcgdXAuXG4gIGlmIChpc1VuZGVmaW5lZChnbG9iYWwucHJvY2VzcykpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZXhwb3J0cy5kZXByZWNhdGUoZm4sIG1zZykuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9XG5cbiAgaWYgKHByb2Nlc3Mubm9EZXByZWNhdGlvbiA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiBmbjtcbiAgfVxuXG4gIHZhciB3YXJuZWQgPSBmYWxzZTtcbiAgZnVuY3Rpb24gZGVwcmVjYXRlZCgpIHtcbiAgICBpZiAoIXdhcm5lZCkge1xuICAgICAgaWYgKHByb2Nlc3MudGhyb3dEZXByZWNhdGlvbikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobXNnKTtcbiAgICAgIH0gZWxzZSBpZiAocHJvY2Vzcy50cmFjZURlcHJlY2F0aW9uKSB7XG4gICAgICAgIGNvbnNvbGUudHJhY2UobXNnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IobXNnKTtcbiAgICAgIH1cbiAgICAgIHdhcm5lZCA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9XG5cbiAgcmV0dXJuIGRlcHJlY2F0ZWQ7XG59O1xuXG5cbnZhciBkZWJ1Z3MgPSB7fTtcbnZhciBkZWJ1Z0Vudmlyb247XG5leHBvcnRzLmRlYnVnbG9nID0gZnVuY3Rpb24oc2V0KSB7XG4gIGlmIChpc1VuZGVmaW5lZChkZWJ1Z0Vudmlyb24pKVxuICAgIGRlYnVnRW52aXJvbiA9IHByb2Nlc3MuZW52Lk5PREVfREVCVUcgfHwgJyc7XG4gIHNldCA9IHNldC50b1VwcGVyQ2FzZSgpO1xuICBpZiAoIWRlYnVnc1tzZXRdKSB7XG4gICAgaWYgKG5ldyBSZWdFeHAoJ1xcXFxiJyArIHNldCArICdcXFxcYicsICdpJykudGVzdChkZWJ1Z0Vudmlyb24pKSB7XG4gICAgICB2YXIgcGlkID0gcHJvY2Vzcy5waWQ7XG4gICAgICBkZWJ1Z3Nbc2V0XSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbXNnID0gZXhwb3J0cy5mb3JtYXQuYXBwbHkoZXhwb3J0cywgYXJndW1lbnRzKTtcbiAgICAgICAgY29uc29sZS5lcnJvcignJXMgJWQ6ICVzJywgc2V0LCBwaWQsIG1zZyk7XG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBkZWJ1Z3Nbc2V0XSA9IGZ1bmN0aW9uKCkge307XG4gICAgfVxuICB9XG4gIHJldHVybiBkZWJ1Z3Nbc2V0XTtcbn07XG5cblxuLyoqXG4gKiBFY2hvcyB0aGUgdmFsdWUgb2YgYSB2YWx1ZS4gVHJ5cyB0byBwcmludCB0aGUgdmFsdWUgb3V0XG4gKiBpbiB0aGUgYmVzdCB3YXkgcG9zc2libGUgZ2l2ZW4gdGhlIGRpZmZlcmVudCB0eXBlcy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIFRoZSBvYmplY3QgdG8gcHJpbnQgb3V0LlxuICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgb3B0aW9ucyBvYmplY3QgdGhhdCBhbHRlcnMgdGhlIG91dHB1dC5cbiAqL1xuLyogbGVnYWN5OiBvYmosIHNob3dIaWRkZW4sIGRlcHRoLCBjb2xvcnMqL1xuZnVuY3Rpb24gaW5zcGVjdChvYmosIG9wdHMpIHtcbiAgLy8gZGVmYXVsdCBvcHRpb25zXG4gIHZhciBjdHggPSB7XG4gICAgc2VlbjogW10sXG4gICAgc3R5bGl6ZTogc3R5bGl6ZU5vQ29sb3JcbiAgfTtcbiAgLy8gbGVnYWN5Li4uXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDMpIGN0eC5kZXB0aCA9IGFyZ3VtZW50c1syXTtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gNCkgY3R4LmNvbG9ycyA9IGFyZ3VtZW50c1szXTtcbiAgaWYgKGlzQm9vbGVhbihvcHRzKSkge1xuICAgIC8vIGxlZ2FjeS4uLlxuICAgIGN0eC5zaG93SGlkZGVuID0gb3B0cztcbiAgfSBlbHNlIGlmIChvcHRzKSB7XG4gICAgLy8gZ290IGFuIFwib3B0aW9uc1wiIG9iamVjdFxuICAgIGV4cG9ydHMuX2V4dGVuZChjdHgsIG9wdHMpO1xuICB9XG4gIC8vIHNldCBkZWZhdWx0IG9wdGlvbnNcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5zaG93SGlkZGVuKSkgY3R4LnNob3dIaWRkZW4gPSBmYWxzZTtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5kZXB0aCkpIGN0eC5kZXB0aCA9IDI7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguY29sb3JzKSkgY3R4LmNvbG9ycyA9IGZhbHNlO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmN1c3RvbUluc3BlY3QpKSBjdHguY3VzdG9tSW5zcGVjdCA9IHRydWU7XG4gIGlmIChjdHguY29sb3JzKSBjdHguc3R5bGl6ZSA9IHN0eWxpemVXaXRoQ29sb3I7XG4gIHJldHVybiBmb3JtYXRWYWx1ZShjdHgsIG9iaiwgY3R4LmRlcHRoKTtcbn1cbmV4cG9ydHMuaW5zcGVjdCA9IGluc3BlY3Q7XG5cblxuLy8gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9BTlNJX2VzY2FwZV9jb2RlI2dyYXBoaWNzXG5pbnNwZWN0LmNvbG9ycyA9IHtcbiAgJ2JvbGQnIDogWzEsIDIyXSxcbiAgJ2l0YWxpYycgOiBbMywgMjNdLFxuICAndW5kZXJsaW5lJyA6IFs0LCAyNF0sXG4gICdpbnZlcnNlJyA6IFs3LCAyN10sXG4gICd3aGl0ZScgOiBbMzcsIDM5XSxcbiAgJ2dyZXknIDogWzkwLCAzOV0sXG4gICdibGFjaycgOiBbMzAsIDM5XSxcbiAgJ2JsdWUnIDogWzM0LCAzOV0sXG4gICdjeWFuJyA6IFszNiwgMzldLFxuICAnZ3JlZW4nIDogWzMyLCAzOV0sXG4gICdtYWdlbnRhJyA6IFszNSwgMzldLFxuICAncmVkJyA6IFszMSwgMzldLFxuICAneWVsbG93JyA6IFszMywgMzldXG59O1xuXG4vLyBEb24ndCB1c2UgJ2JsdWUnIG5vdCB2aXNpYmxlIG9uIGNtZC5leGVcbmluc3BlY3Quc3R5bGVzID0ge1xuICAnc3BlY2lhbCc6ICdjeWFuJyxcbiAgJ251bWJlcic6ICd5ZWxsb3cnLFxuICAnYm9vbGVhbic6ICd5ZWxsb3cnLFxuICAndW5kZWZpbmVkJzogJ2dyZXknLFxuICAnbnVsbCc6ICdib2xkJyxcbiAgJ3N0cmluZyc6ICdncmVlbicsXG4gICdkYXRlJzogJ21hZ2VudGEnLFxuICAvLyBcIm5hbWVcIjogaW50ZW50aW9uYWxseSBub3Qgc3R5bGluZ1xuICAncmVnZXhwJzogJ3JlZCdcbn07XG5cblxuZnVuY3Rpb24gc3R5bGl6ZVdpdGhDb2xvcihzdHIsIHN0eWxlVHlwZSkge1xuICB2YXIgc3R5bGUgPSBpbnNwZWN0LnN0eWxlc1tzdHlsZVR5cGVdO1xuXG4gIGlmIChzdHlsZSkge1xuICAgIHJldHVybiAnXFx1MDAxYlsnICsgaW5zcGVjdC5jb2xvcnNbc3R5bGVdWzBdICsgJ20nICsgc3RyICtcbiAgICAgICAgICAgJ1xcdTAwMWJbJyArIGluc3BlY3QuY29sb3JzW3N0eWxlXVsxXSArICdtJztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gc3RyO1xuICB9XG59XG5cblxuZnVuY3Rpb24gc3R5bGl6ZU5vQ29sb3Ioc3RyLCBzdHlsZVR5cGUpIHtcbiAgcmV0dXJuIHN0cjtcbn1cblxuXG5mdW5jdGlvbiBhcnJheVRvSGFzaChhcnJheSkge1xuICB2YXIgaGFzaCA9IHt9O1xuXG4gIGFycmF5LmZvckVhY2goZnVuY3Rpb24odmFsLCBpZHgpIHtcbiAgICBoYXNoW3ZhbF0gPSB0cnVlO1xuICB9KTtcblxuICByZXR1cm4gaGFzaDtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRWYWx1ZShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMpIHtcbiAgLy8gUHJvdmlkZSBhIGhvb2sgZm9yIHVzZXItc3BlY2lmaWVkIGluc3BlY3QgZnVuY3Rpb25zLlxuICAvLyBDaGVjayB0aGF0IHZhbHVlIGlzIGFuIG9iamVjdCB3aXRoIGFuIGluc3BlY3QgZnVuY3Rpb24gb24gaXRcbiAgaWYgKGN0eC5jdXN0b21JbnNwZWN0ICYmXG4gICAgICB2YWx1ZSAmJlxuICAgICAgaXNGdW5jdGlvbih2YWx1ZS5pbnNwZWN0KSAmJlxuICAgICAgLy8gRmlsdGVyIG91dCB0aGUgdXRpbCBtb2R1bGUsIGl0J3MgaW5zcGVjdCBmdW5jdGlvbiBpcyBzcGVjaWFsXG4gICAgICB2YWx1ZS5pbnNwZWN0ICE9PSBleHBvcnRzLmluc3BlY3QgJiZcbiAgICAgIC8vIEFsc28gZmlsdGVyIG91dCBhbnkgcHJvdG90eXBlIG9iamVjdHMgdXNpbmcgdGhlIGNpcmN1bGFyIGNoZWNrLlxuICAgICAgISh2YWx1ZS5jb25zdHJ1Y3RvciAmJiB2YWx1ZS5jb25zdHJ1Y3Rvci5wcm90b3R5cGUgPT09IHZhbHVlKSkge1xuICAgIHZhciByZXQgPSB2YWx1ZS5pbnNwZWN0KHJlY3Vyc2VUaW1lcywgY3R4KTtcbiAgICBpZiAoIWlzU3RyaW5nKHJldCkpIHtcbiAgICAgIHJldCA9IGZvcm1hdFZhbHVlKGN0eCwgcmV0LCByZWN1cnNlVGltZXMpO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9XG5cbiAgLy8gUHJpbWl0aXZlIHR5cGVzIGNhbm5vdCBoYXZlIHByb3BlcnRpZXNcbiAgdmFyIHByaW1pdGl2ZSA9IGZvcm1hdFByaW1pdGl2ZShjdHgsIHZhbHVlKTtcbiAgaWYgKHByaW1pdGl2ZSkge1xuICAgIHJldHVybiBwcmltaXRpdmU7XG4gIH1cblxuICAvLyBMb29rIHVwIHRoZSBrZXlzIG9mIHRoZSBvYmplY3QuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXModmFsdWUpO1xuICB2YXIgdmlzaWJsZUtleXMgPSBhcnJheVRvSGFzaChrZXlzKTtcblxuICBpZiAoY3R4LnNob3dIaWRkZW4pIHtcbiAgICBrZXlzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModmFsdWUpO1xuICB9XG5cbiAgLy8gSUUgZG9lc24ndCBtYWtlIGVycm9yIGZpZWxkcyBub24tZW51bWVyYWJsZVxuICAvLyBodHRwOi8vbXNkbi5taWNyb3NvZnQuY29tL2VuLXVzL2xpYnJhcnkvaWUvZHd3NTJzYnQodj12cy45NCkuYXNweFxuICBpZiAoaXNFcnJvcih2YWx1ZSlcbiAgICAgICYmIChrZXlzLmluZGV4T2YoJ21lc3NhZ2UnKSA+PSAwIHx8IGtleXMuaW5kZXhPZignZGVzY3JpcHRpb24nKSA+PSAwKSkge1xuICAgIHJldHVybiBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gIH1cblxuICAvLyBTb21lIHR5cGUgb2Ygb2JqZWN0IHdpdGhvdXQgcHJvcGVydGllcyBjYW4gYmUgc2hvcnRjdXR0ZWQuXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCkge1xuICAgIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgICAgdmFyIG5hbWUgPSB2YWx1ZS5uYW1lID8gJzogJyArIHZhbHVlLm5hbWUgOiAnJztcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZSgnW0Z1bmN0aW9uJyArIG5hbWUgKyAnXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAncmVnZXhwJyk7XG4gICAgfVxuICAgIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoRGF0ZS5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdkYXRlJyk7XG4gICAgfVxuICAgIGlmIChpc0Vycm9yKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICB2YXIgYmFzZSA9ICcnLCBhcnJheSA9IGZhbHNlLCBicmFjZXMgPSBbJ3snLCAnfSddO1xuXG4gIC8vIE1ha2UgQXJyYXkgc2F5IHRoYXQgdGhleSBhcmUgQXJyYXlcbiAgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgYXJyYXkgPSB0cnVlO1xuICAgIGJyYWNlcyA9IFsnWycsICddJ107XG4gIH1cblxuICAvLyBNYWtlIGZ1bmN0aW9ucyBzYXkgdGhhdCB0aGV5IGFyZSBmdW5jdGlvbnNcbiAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgdmFyIG4gPSB2YWx1ZS5uYW1lID8gJzogJyArIHZhbHVlLm5hbWUgOiAnJztcbiAgICBiYXNlID0gJyBbRnVuY3Rpb24nICsgbiArICddJztcbiAgfVxuXG4gIC8vIE1ha2UgUmVnRXhwcyBzYXkgdGhhdCB0aGV5IGFyZSBSZWdFeHBzXG4gIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgfVxuXG4gIC8vIE1ha2UgZGF0ZXMgd2l0aCBwcm9wZXJ0aWVzIGZpcnN0IHNheSB0aGUgZGF0ZVxuICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBEYXRlLnByb3RvdHlwZS50b1VUQ1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgfVxuXG4gIC8vIE1ha2UgZXJyb3Igd2l0aCBtZXNzYWdlIGZpcnN0IHNheSB0aGUgZXJyb3JcbiAgaWYgKGlzRXJyb3IodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgfVxuXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCAmJiAoIWFycmF5IHx8IHZhbHVlLmxlbmd0aCA9PSAwKSkge1xuICAgIHJldHVybiBicmFjZXNbMF0gKyBiYXNlICsgYnJhY2VzWzFdO1xuICB9XG5cbiAgaWYgKHJlY3Vyc2VUaW1lcyA8IDApIHtcbiAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ3JlZ2V4cCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJ1tPYmplY3RdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cblxuICBjdHguc2Vlbi5wdXNoKHZhbHVlKTtcblxuICB2YXIgb3V0cHV0O1xuICBpZiAoYXJyYXkpIHtcbiAgICBvdXRwdXQgPSBmb3JtYXRBcnJheShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXlzKTtcbiAgfSBlbHNlIHtcbiAgICBvdXRwdXQgPSBrZXlzLm1hcChmdW5jdGlvbihrZXkpIHtcbiAgICAgIHJldHVybiBmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXksIGFycmF5KTtcbiAgICB9KTtcbiAgfVxuXG4gIGN0eC5zZWVuLnBvcCgpO1xuXG4gIHJldHVybiByZWR1Y2VUb1NpbmdsZVN0cmluZyhvdXRwdXQsIGJhc2UsIGJyYWNlcyk7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0UHJpbWl0aXZlKGN0eCwgdmFsdWUpIHtcbiAgaWYgKGlzVW5kZWZpbmVkKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJ3VuZGVmaW5lZCcsICd1bmRlZmluZWQnKTtcbiAgaWYgKGlzU3RyaW5nKHZhbHVlKSkge1xuICAgIHZhciBzaW1wbGUgPSAnXFwnJyArIEpTT04uc3RyaW5naWZ5KHZhbHVlKS5yZXBsYWNlKC9eXCJ8XCIkL2csICcnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKSArICdcXCcnO1xuICAgIHJldHVybiBjdHguc3R5bGl6ZShzaW1wbGUsICdzdHJpbmcnKTtcbiAgfVxuICBpZiAoaXNOdW1iZXIodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnJyArIHZhbHVlLCAnbnVtYmVyJyk7XG4gIGlmIChpc0Jvb2xlYW4odmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnJyArIHZhbHVlLCAnYm9vbGVhbicpO1xuICAvLyBGb3Igc29tZSByZWFzb24gdHlwZW9mIG51bGwgaXMgXCJvYmplY3RcIiwgc28gc3BlY2lhbCBjYXNlIGhlcmUuXG4gIGlmIChpc051bGwodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnbnVsbCcsICdudWxsJyk7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0RXJyb3IodmFsdWUpIHtcbiAgcmV0dXJuICdbJyArIEVycm9yLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSArICddJztcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRBcnJheShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXlzKSB7XG4gIHZhciBvdXRwdXQgPSBbXTtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB2YWx1ZS5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBpZiAoaGFzT3duUHJvcGVydHkodmFsdWUsIFN0cmluZyhpKSkpIHtcbiAgICAgIG91dHB1dC5wdXNoKGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsXG4gICAgICAgICAgU3RyaW5nKGkpLCB0cnVlKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dHB1dC5wdXNoKCcnKTtcbiAgICB9XG4gIH1cbiAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIGlmICgha2V5Lm1hdGNoKC9eXFxkKyQvKSkge1xuICAgICAgb3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cyxcbiAgICAgICAgICBrZXksIHRydWUpKTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gb3V0cHV0O1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleSwgYXJyYXkpIHtcbiAgdmFyIG5hbWUsIHN0ciwgZGVzYztcbiAgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodmFsdWUsIGtleSkgfHwgeyB2YWx1ZTogdmFsdWVba2V5XSB9O1xuICBpZiAoZGVzYy5nZXQpIHtcbiAgICBpZiAoZGVzYy5zZXQpIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbR2V0dGVyL1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0dldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoZGVzYy5zZXQpIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG4gIGlmICghaGFzT3duUHJvcGVydHkodmlzaWJsZUtleXMsIGtleSkpIHtcbiAgICBuYW1lID0gJ1snICsga2V5ICsgJ10nO1xuICB9XG4gIGlmICghc3RyKSB7XG4gICAgaWYgKGN0eC5zZWVuLmluZGV4T2YoZGVzYy52YWx1ZSkgPCAwKSB7XG4gICAgICBpZiAoaXNOdWxsKHJlY3Vyc2VUaW1lcykpIHtcbiAgICAgICAgc3RyID0gZm9ybWF0VmFsdWUoY3R4LCBkZXNjLnZhbHVlLCBudWxsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0ciA9IGZvcm1hdFZhbHVlKGN0eCwgZGVzYy52YWx1ZSwgcmVjdXJzZVRpbWVzIC0gMSk7XG4gICAgICB9XG4gICAgICBpZiAoc3RyLmluZGV4T2YoJ1xcbicpID4gLTEpIHtcbiAgICAgICAgaWYgKGFycmF5KSB7XG4gICAgICAgICAgc3RyID0gc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICcgKyBsaW5lO1xuICAgICAgICAgIH0pLmpvaW4oJ1xcbicpLnN1YnN0cigyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdHIgPSAnXFxuJyArIHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiAnICAgJyArIGxpbmU7XG4gICAgICAgICAgfSkuam9pbignXFxuJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tDaXJjdWxhcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuICBpZiAoaXNVbmRlZmluZWQobmFtZSkpIHtcbiAgICBpZiAoYXJyYXkgJiYga2V5Lm1hdGNoKC9eXFxkKyQvKSkge1xuICAgICAgcmV0dXJuIHN0cjtcbiAgICB9XG4gICAgbmFtZSA9IEpTT04uc3RyaW5naWZ5KCcnICsga2V5KTtcbiAgICBpZiAobmFtZS5tYXRjaCgvXlwiKFthLXpBLVpfXVthLXpBLVpfMC05XSopXCIkLykpIHtcbiAgICAgIG5hbWUgPSBuYW1lLnN1YnN0cigxLCBuYW1lLmxlbmd0aCAtIDIpO1xuICAgICAgbmFtZSA9IGN0eC5zdHlsaXplKG5hbWUsICduYW1lJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5hbWUgPSBuYW1lLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8oXlwifFwiJCkvZywgXCInXCIpO1xuICAgICAgbmFtZSA9IGN0eC5zdHlsaXplKG5hbWUsICdzdHJpbmcnKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmFtZSArICc6ICcgKyBzdHI7XG59XG5cblxuZnVuY3Rpb24gcmVkdWNlVG9TaW5nbGVTdHJpbmcob3V0cHV0LCBiYXNlLCBicmFjZXMpIHtcbiAgdmFyIG51bUxpbmVzRXN0ID0gMDtcbiAgdmFyIGxlbmd0aCA9IG91dHB1dC5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgY3VyKSB7XG4gICAgbnVtTGluZXNFc3QrKztcbiAgICBpZiAoY3VyLmluZGV4T2YoJ1xcbicpID49IDApIG51bUxpbmVzRXN0Kys7XG4gICAgcmV0dXJuIHByZXYgKyBjdXIucmVwbGFjZSgvXFx1MDAxYlxcW1xcZFxcZD9tL2csICcnKS5sZW5ndGggKyAxO1xuICB9LCAwKTtcblxuICBpZiAobGVuZ3RoID4gNjApIHtcbiAgICByZXR1cm4gYnJhY2VzWzBdICtcbiAgICAgICAgICAgKGJhc2UgPT09ICcnID8gJycgOiBiYXNlICsgJ1xcbiAnKSArXG4gICAgICAgICAgICcgJyArXG4gICAgICAgICAgIG91dHB1dC5qb2luKCcsXFxuICAnKSArXG4gICAgICAgICAgICcgJyArXG4gICAgICAgICAgIGJyYWNlc1sxXTtcbiAgfVxuXG4gIHJldHVybiBicmFjZXNbMF0gKyBiYXNlICsgJyAnICsgb3V0cHV0LmpvaW4oJywgJykgKyAnICcgKyBicmFjZXNbMV07XG59XG5cblxuLy8gTk9URTogVGhlc2UgdHlwZSBjaGVja2luZyBmdW5jdGlvbnMgaW50ZW50aW9uYWxseSBkb24ndCB1c2UgYGluc3RhbmNlb2ZgXG4vLyBiZWNhdXNlIGl0IGlzIGZyYWdpbGUgYW5kIGNhbiBiZSBlYXNpbHkgZmFrZWQgd2l0aCBgT2JqZWN0LmNyZWF0ZSgpYC5cbmZ1bmN0aW9uIGlzQXJyYXkoYXIpIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkoYXIpO1xufVxuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheTtcblxuZnVuY3Rpb24gaXNCb29sZWFuKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nO1xufVxuZXhwb3J0cy5pc0Jvb2xlYW4gPSBpc0Jvb2xlYW47XG5cbmZ1bmN0aW9uIGlzTnVsbChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsID0gaXNOdWxsO1xuXG5mdW5jdGlvbiBpc051bGxPclVuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGxPclVuZGVmaW5lZCA9IGlzTnVsbE9yVW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuZXhwb3J0cy5pc051bWJlciA9IGlzTnVtYmVyO1xuXG5mdW5jdGlvbiBpc1N0cmluZyhhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnO1xufVxuZXhwb3J0cy5pc1N0cmluZyA9IGlzU3RyaW5nO1xuXG5mdW5jdGlvbiBpc1N5bWJvbChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnO1xufVxuZXhwb3J0cy5pc1N5bWJvbCA9IGlzU3ltYm9sO1xuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuZXhwb3J0cy5pc1VuZGVmaW5lZCA9IGlzVW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBpc1JlZ0V4cChyZSkge1xuICByZXR1cm4gaXNPYmplY3QocmUpICYmIG9iamVjdFRvU3RyaW5nKHJlKSA9PT0gJ1tvYmplY3QgUmVnRXhwXSc7XG59XG5leHBvcnRzLmlzUmVnRXhwID0gaXNSZWdFeHA7XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuZXhwb3J0cy5pc09iamVjdCA9IGlzT2JqZWN0O1xuXG5mdW5jdGlvbiBpc0RhdGUoZCkge1xuICByZXR1cm4gaXNPYmplY3QoZCkgJiYgb2JqZWN0VG9TdHJpbmcoZCkgPT09ICdbb2JqZWN0IERhdGVdJztcbn1cbmV4cG9ydHMuaXNEYXRlID0gaXNEYXRlO1xuXG5mdW5jdGlvbiBpc0Vycm9yKGUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KGUpICYmXG4gICAgICAob2JqZWN0VG9TdHJpbmcoZSkgPT09ICdbb2JqZWN0IEVycm9yXScgfHwgZSBpbnN0YW5jZW9mIEVycm9yKTtcbn1cbmV4cG9ydHMuaXNFcnJvciA9IGlzRXJyb3I7XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuZXhwb3J0cy5pc0Z1bmN0aW9uID0gaXNGdW5jdGlvbjtcblxuZnVuY3Rpb24gaXNQcmltaXRpdmUoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGwgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ251bWJlcicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3ltYm9sJyB8fCAgLy8gRVM2IHN5bWJvbFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3VuZGVmaW5lZCc7XG59XG5leHBvcnRzLmlzUHJpbWl0aXZlID0gaXNQcmltaXRpdmU7XG5cbmV4cG9ydHMuaXNCdWZmZXIgPSByZXF1aXJlKCcuL3N1cHBvcnQvaXNCdWZmZXInKTtcblxuZnVuY3Rpb24gb2JqZWN0VG9TdHJpbmcobykge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pO1xufVxuXG5cbmZ1bmN0aW9uIHBhZChuKSB7XG4gIHJldHVybiBuIDwgMTAgPyAnMCcgKyBuLnRvU3RyaW5nKDEwKSA6IG4udG9TdHJpbmcoMTApO1xufVxuXG5cbnZhciBtb250aHMgPSBbJ0phbicsICdGZWInLCAnTWFyJywgJ0FwcicsICdNYXknLCAnSnVuJywgJ0p1bCcsICdBdWcnLCAnU2VwJyxcbiAgICAgICAgICAgICAgJ09jdCcsICdOb3YnLCAnRGVjJ107XG5cbi8vIDI2IEZlYiAxNjoxOTozNFxuZnVuY3Rpb24gdGltZXN0YW1wKCkge1xuICB2YXIgZCA9IG5ldyBEYXRlKCk7XG4gIHZhciB0aW1lID0gW3BhZChkLmdldEhvdXJzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRNaW51dGVzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRTZWNvbmRzKCkpXS5qb2luKCc6Jyk7XG4gIHJldHVybiBbZC5nZXREYXRlKCksIG1vbnRoc1tkLmdldE1vbnRoKCldLCB0aW1lXS5qb2luKCcgJyk7XG59XG5cblxuLy8gbG9nIGlzIGp1c3QgYSB0aGluIHdyYXBwZXIgdG8gY29uc29sZS5sb2cgdGhhdCBwcmVwZW5kcyBhIHRpbWVzdGFtcFxuZXhwb3J0cy5sb2cgPSBmdW5jdGlvbigpIHtcbiAgY29uc29sZS5sb2coJyVzIC0gJXMnLCB0aW1lc3RhbXAoKSwgZXhwb3J0cy5mb3JtYXQuYXBwbHkoZXhwb3J0cywgYXJndW1lbnRzKSk7XG59O1xuXG5cbi8qKlxuICogSW5oZXJpdCB0aGUgcHJvdG90eXBlIG1ldGhvZHMgZnJvbSBvbmUgY29uc3RydWN0b3IgaW50byBhbm90aGVyLlxuICpcbiAqIFRoZSBGdW5jdGlvbi5wcm90b3R5cGUuaW5oZXJpdHMgZnJvbSBsYW5nLmpzIHJld3JpdHRlbiBhcyBhIHN0YW5kYWxvbmVcbiAqIGZ1bmN0aW9uIChub3Qgb24gRnVuY3Rpb24ucHJvdG90eXBlKS4gTk9URTogSWYgdGhpcyBmaWxlIGlzIHRvIGJlIGxvYWRlZFxuICogZHVyaW5nIGJvb3RzdHJhcHBpbmcgdGhpcyBmdW5jdGlvbiBuZWVkcyB0byBiZSByZXdyaXR0ZW4gdXNpbmcgc29tZSBuYXRpdmVcbiAqIGZ1bmN0aW9ucyBhcyBwcm90b3R5cGUgc2V0dXAgdXNpbmcgbm9ybWFsIEphdmFTY3JpcHQgZG9lcyBub3Qgd29yayBhc1xuICogZXhwZWN0ZWQgZHVyaW5nIGJvb3RzdHJhcHBpbmcgKHNlZSBtaXJyb3IuanMgaW4gcjExNDkwMykuXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gY3RvciBDb25zdHJ1Y3RvciBmdW5jdGlvbiB3aGljaCBuZWVkcyB0byBpbmhlcml0IHRoZVxuICogICAgIHByb3RvdHlwZS5cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IHN1cGVyQ3RvciBDb25zdHJ1Y3RvciBmdW5jdGlvbiB0byBpbmhlcml0IHByb3RvdHlwZSBmcm9tLlxuICovXG5leHBvcnRzLmluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcblxuZXhwb3J0cy5fZXh0ZW5kID0gZnVuY3Rpb24ob3JpZ2luLCBhZGQpIHtcbiAgLy8gRG9uJ3QgZG8gYW55dGhpbmcgaWYgYWRkIGlzbid0IGFuIG9iamVjdFxuICBpZiAoIWFkZCB8fCAhaXNPYmplY3QoYWRkKSkgcmV0dXJuIG9yaWdpbjtcblxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGFkZCk7XG4gIHZhciBpID0ga2V5cy5sZW5ndGg7XG4gIHdoaWxlIChpLS0pIHtcbiAgICBvcmlnaW5ba2V5c1tpXV0gPSBhZGRba2V5c1tpXV07XG4gIH1cbiAgcmV0dXJuIG9yaWdpbjtcbn07XG5cbmZ1bmN0aW9uIGhhc093blByb3BlcnR5KG9iaiwgcHJvcCkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCk7XG59XG4iLCJcInVzZSBzdHJpY3RcIjtcbnZhciBVdGlscyA9IHJlcXVpcmUoXCIuL3V0aWxzXCIpO1xudmFyIEV4Y2VwdGlvbiA9IHJlcXVpcmUoXCIuL2V4Y2VwdGlvblwiKVtcImRlZmF1bHRcIl07XG5cbnZhciBWRVJTSU9OID0gXCIxLjIuMFwiO1xuZXhwb3J0cy5WRVJTSU9OID0gVkVSU0lPTjt2YXIgQ09NUElMRVJfUkVWSVNJT04gPSA0O1xuZXhwb3J0cy5DT01QSUxFUl9SRVZJU0lPTiA9IENPTVBJTEVSX1JFVklTSU9OO1xudmFyIFJFVklTSU9OX0NIQU5HRVMgPSB7XG4gIDE6ICc8PSAxLjAucmMuMicsIC8vIDEuMC5yYy4yIGlzIGFjdHVhbGx5IHJldjIgYnV0IGRvZXNuJ3QgcmVwb3J0IGl0XG4gIDI6ICc9PSAxLjAuMC1yYy4zJyxcbiAgMzogJz09IDEuMC4wLXJjLjQnLFxuICA0OiAnPj0gMS4wLjAnXG59O1xuZXhwb3J0cy5SRVZJU0lPTl9DSEFOR0VTID0gUkVWSVNJT05fQ0hBTkdFUztcbnZhciBpc0FycmF5ID0gVXRpbHMuaXNBcnJheSxcbiAgICBpc0Z1bmN0aW9uID0gVXRpbHMuaXNGdW5jdGlvbixcbiAgICB0b1N0cmluZyA9IFV0aWxzLnRvU3RyaW5nLFxuICAgIG9iamVjdFR5cGUgPSAnW29iamVjdCBPYmplY3RdJztcblxuZnVuY3Rpb24gSGFuZGxlYmFyc0Vudmlyb25tZW50KGhlbHBlcnMsIHBhcnRpYWxzKSB7XG4gIHRoaXMuaGVscGVycyA9IGhlbHBlcnMgfHwge307XG4gIHRoaXMucGFydGlhbHMgPSBwYXJ0aWFscyB8fCB7fTtcblxuICByZWdpc3RlckRlZmF1bHRIZWxwZXJzKHRoaXMpO1xufVxuXG5leHBvcnRzLkhhbmRsZWJhcnNFbnZpcm9ubWVudCA9IEhhbmRsZWJhcnNFbnZpcm9ubWVudDtIYW5kbGViYXJzRW52aXJvbm1lbnQucHJvdG90eXBlID0ge1xuICBjb25zdHJ1Y3RvcjogSGFuZGxlYmFyc0Vudmlyb25tZW50LFxuXG4gIGxvZ2dlcjogbG9nZ2VyLFxuICBsb2c6IGxvZyxcblxuICByZWdpc3RlckhlbHBlcjogZnVuY3Rpb24obmFtZSwgZm4sIGludmVyc2UpIHtcbiAgICBpZiAodG9TdHJpbmcuY2FsbChuYW1lKSA9PT0gb2JqZWN0VHlwZSkge1xuICAgICAgaWYgKGludmVyc2UgfHwgZm4pIHsgdGhyb3cgbmV3IEV4Y2VwdGlvbignQXJnIG5vdCBzdXBwb3J0ZWQgd2l0aCBtdWx0aXBsZSBoZWxwZXJzJyk7IH1cbiAgICAgIFV0aWxzLmV4dGVuZCh0aGlzLmhlbHBlcnMsIG5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoaW52ZXJzZSkgeyBmbi5ub3QgPSBpbnZlcnNlOyB9XG4gICAgICB0aGlzLmhlbHBlcnNbbmFtZV0gPSBmbjtcbiAgICB9XG4gIH0sXG5cbiAgcmVnaXN0ZXJQYXJ0aWFsOiBmdW5jdGlvbihuYW1lLCBzdHIpIHtcbiAgICBpZiAodG9TdHJpbmcuY2FsbChuYW1lKSA9PT0gb2JqZWN0VHlwZSkge1xuICAgICAgVXRpbHMuZXh0ZW5kKHRoaXMucGFydGlhbHMsICBuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5wYXJ0aWFsc1tuYW1lXSA9IHN0cjtcbiAgICB9XG4gIH1cbn07XG5cbmZ1bmN0aW9uIHJlZ2lzdGVyRGVmYXVsdEhlbHBlcnMoaW5zdGFuY2UpIHtcbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2hlbHBlck1pc3NpbmcnLCBmdW5jdGlvbihhcmcpIHtcbiAgICBpZihhcmd1bWVudHMubGVuZ3RoID09PSAyKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIGhlbHBlcjogJ1wiICsgYXJnICsgXCInXCIpO1xuICAgIH1cbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2Jsb2NrSGVscGVyTWlzc2luZycsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICB2YXIgaW52ZXJzZSA9IG9wdGlvbnMuaW52ZXJzZSB8fCBmdW5jdGlvbigpIHt9LCBmbiA9IG9wdGlvbnMuZm47XG5cbiAgICBpZiAoaXNGdW5jdGlvbihjb250ZXh0KSkgeyBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpOyB9XG5cbiAgICBpZihjb250ZXh0ID09PSB0cnVlKSB7XG4gICAgICByZXR1cm4gZm4odGhpcyk7XG4gICAgfSBlbHNlIGlmKGNvbnRleHQgPT09IGZhbHNlIHx8IGNvbnRleHQgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGludmVyc2UodGhpcyk7XG4gICAgfSBlbHNlIGlmIChpc0FycmF5KGNvbnRleHQpKSB7XG4gICAgICBpZihjb250ZXh0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgcmV0dXJuIGluc3RhbmNlLmhlbHBlcnMuZWFjaChjb250ZXh0LCBvcHRpb25zKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBpbnZlcnNlKHRoaXMpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZm4oY29udGV4dCk7XG4gICAgfVxuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignZWFjaCcsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICB2YXIgZm4gPSBvcHRpb25zLmZuLCBpbnZlcnNlID0gb3B0aW9ucy5pbnZlcnNlO1xuICAgIHZhciBpID0gMCwgcmV0ID0gXCJcIiwgZGF0YTtcblxuICAgIGlmIChpc0Z1bmN0aW9uKGNvbnRleHQpKSB7IGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7IH1cblxuICAgIGlmIChvcHRpb25zLmRhdGEpIHtcbiAgICAgIGRhdGEgPSBjcmVhdGVGcmFtZShvcHRpb25zLmRhdGEpO1xuICAgIH1cblxuICAgIGlmKGNvbnRleHQgJiYgdHlwZW9mIGNvbnRleHQgPT09ICdvYmplY3QnKSB7XG4gICAgICBpZiAoaXNBcnJheShjb250ZXh0KSkge1xuICAgICAgICBmb3IodmFyIGogPSBjb250ZXh0Lmxlbmd0aDsgaTxqOyBpKyspIHtcbiAgICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgZGF0YS5pbmRleCA9IGk7XG4gICAgICAgICAgICBkYXRhLmZpcnN0ID0gKGkgPT09IDApO1xuICAgICAgICAgICAgZGF0YS5sYXN0ICA9IChpID09PSAoY29udGV4dC5sZW5ndGgtMSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXQgPSByZXQgKyBmbihjb250ZXh0W2ldLCB7IGRhdGE6IGRhdGEgfSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvcih2YXIga2V5IGluIGNvbnRleHQpIHtcbiAgICAgICAgICBpZihjb250ZXh0Lmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIGlmKGRhdGEpIHsgXG4gICAgICAgICAgICAgIGRhdGEua2V5ID0ga2V5OyBcbiAgICAgICAgICAgICAgZGF0YS5pbmRleCA9IGk7XG4gICAgICAgICAgICAgIGRhdGEuZmlyc3QgPSAoaSA9PT0gMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXQgPSByZXQgKyBmbihjb250ZXh0W2tleV0sIHtkYXRhOiBkYXRhfSk7XG4gICAgICAgICAgICBpKys7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYoaSA9PT0gMCl7XG4gICAgICByZXQgPSBpbnZlcnNlKHRoaXMpO1xuICAgIH1cblxuICAgIHJldHVybiByZXQ7XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdpZicsIGZ1bmN0aW9uKGNvbmRpdGlvbmFsLCBvcHRpb25zKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24oY29uZGl0aW9uYWwpKSB7IGNvbmRpdGlvbmFsID0gY29uZGl0aW9uYWwuY2FsbCh0aGlzKTsgfVxuXG4gICAgLy8gRGVmYXVsdCBiZWhhdmlvciBpcyB0byByZW5kZXIgdGhlIHBvc2l0aXZlIHBhdGggaWYgdGhlIHZhbHVlIGlzIHRydXRoeSBhbmQgbm90IGVtcHR5LlxuICAgIC8vIFRoZSBgaW5jbHVkZVplcm9gIG9wdGlvbiBtYXkgYmUgc2V0IHRvIHRyZWF0IHRoZSBjb25kdGlvbmFsIGFzIHB1cmVseSBub3QgZW1wdHkgYmFzZWQgb24gdGhlXG4gICAgLy8gYmVoYXZpb3Igb2YgaXNFbXB0eS4gRWZmZWN0aXZlbHkgdGhpcyBkZXRlcm1pbmVzIGlmIDAgaXMgaGFuZGxlZCBieSB0aGUgcG9zaXRpdmUgcGF0aCBvciBuZWdhdGl2ZS5cbiAgICBpZiAoKCFvcHRpb25zLmhhc2guaW5jbHVkZVplcm8gJiYgIWNvbmRpdGlvbmFsKSB8fCBVdGlscy5pc0VtcHR5KGNvbmRpdGlvbmFsKSkge1xuICAgICAgcmV0dXJuIG9wdGlvbnMuaW52ZXJzZSh0aGlzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG9wdGlvbnMuZm4odGhpcyk7XG4gICAgfVxuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcigndW5sZXNzJywgZnVuY3Rpb24oY29uZGl0aW9uYWwsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gaW5zdGFuY2UuaGVscGVyc1snaWYnXS5jYWxsKHRoaXMsIGNvbmRpdGlvbmFsLCB7Zm46IG9wdGlvbnMuaW52ZXJzZSwgaW52ZXJzZTogb3B0aW9ucy5mbiwgaGFzaDogb3B0aW9ucy5oYXNofSk7XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCd3aXRoJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIGlmIChpc0Z1bmN0aW9uKGNvbnRleHQpKSB7IGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7IH1cblxuICAgIGlmICghVXRpbHMuaXNFbXB0eShjb250ZXh0KSkgcmV0dXJuIG9wdGlvbnMuZm4oY29udGV4dCk7XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdsb2cnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgdmFyIGxldmVsID0gb3B0aW9ucy5kYXRhICYmIG9wdGlvbnMuZGF0YS5sZXZlbCAhPSBudWxsID8gcGFyc2VJbnQob3B0aW9ucy5kYXRhLmxldmVsLCAxMCkgOiAxO1xuICAgIGluc3RhbmNlLmxvZyhsZXZlbCwgY29udGV4dCk7XG4gIH0pO1xufVxuXG52YXIgbG9nZ2VyID0ge1xuICBtZXRob2RNYXA6IHsgMDogJ2RlYnVnJywgMTogJ2luZm8nLCAyOiAnd2FybicsIDM6ICdlcnJvcicgfSxcblxuICAvLyBTdGF0ZSBlbnVtXG4gIERFQlVHOiAwLFxuICBJTkZPOiAxLFxuICBXQVJOOiAyLFxuICBFUlJPUjogMyxcbiAgbGV2ZWw6IDMsXG5cbiAgLy8gY2FuIGJlIG92ZXJyaWRkZW4gaW4gdGhlIGhvc3QgZW52aXJvbm1lbnRcbiAgbG9nOiBmdW5jdGlvbihsZXZlbCwgb2JqKSB7XG4gICAgaWYgKGxvZ2dlci5sZXZlbCA8PSBsZXZlbCkge1xuICAgICAgdmFyIG1ldGhvZCA9IGxvZ2dlci5tZXRob2RNYXBbbGV2ZWxdO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlICE9PSAndW5kZWZpbmVkJyAmJiBjb25zb2xlW21ldGhvZF0pIHtcbiAgICAgICAgY29uc29sZVttZXRob2RdLmNhbGwoY29uc29sZSwgb2JqKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5leHBvcnRzLmxvZ2dlciA9IGxvZ2dlcjtcbmZ1bmN0aW9uIGxvZyhsZXZlbCwgb2JqKSB7IGxvZ2dlci5sb2cobGV2ZWwsIG9iaik7IH1cblxuZXhwb3J0cy5sb2cgPSBsb2c7dmFyIGNyZWF0ZUZyYW1lID0gZnVuY3Rpb24ob2JqZWN0KSB7XG4gIHZhciBvYmogPSB7fTtcbiAgVXRpbHMuZXh0ZW5kKG9iaiwgb2JqZWN0KTtcbiAgcmV0dXJuIG9iajtcbn07XG5leHBvcnRzLmNyZWF0ZUZyYW1lID0gY3JlYXRlRnJhbWU7IiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgRXhjZXB0aW9uID0gcmVxdWlyZShcIi4uL2V4Y2VwdGlvblwiKVtcImRlZmF1bHRcIl07XG5cbnZhciBBU1QgPSB7XG4gIFByb2dyYW1Ob2RlOiBmdW5jdGlvbihzdGF0ZW1lbnRzLCBpbnZlcnNlU3RyaXAsIGludmVyc2UpIHtcbiAgICB0aGlzLnR5cGUgPSBcInByb2dyYW1cIjtcbiAgICB0aGlzLnN0YXRlbWVudHMgPSBzdGF0ZW1lbnRzO1xuICAgIHRoaXMuc3RyaXAgPSB7fTtcblxuICAgIGlmKGludmVyc2UpIHtcbiAgICAgIHRoaXMuaW52ZXJzZSA9IG5ldyBBU1QuUHJvZ3JhbU5vZGUoaW52ZXJzZSwgaW52ZXJzZVN0cmlwKTtcbiAgICAgIHRoaXMuc3RyaXAucmlnaHQgPSBpbnZlcnNlU3RyaXAubGVmdDtcbiAgICB9IGVsc2UgaWYgKGludmVyc2VTdHJpcCkge1xuICAgICAgdGhpcy5zdHJpcC5sZWZ0ID0gaW52ZXJzZVN0cmlwLnJpZ2h0O1xuICAgIH1cbiAgfSxcblxuICBNdXN0YWNoZU5vZGU6IGZ1bmN0aW9uKHJhd1BhcmFtcywgaGFzaCwgb3Blbiwgc3RyaXApIHtcbiAgICB0aGlzLnR5cGUgPSBcIm11c3RhY2hlXCI7XG4gICAgdGhpcy5oYXNoID0gaGFzaDtcbiAgICB0aGlzLnN0cmlwID0gc3RyaXA7XG5cbiAgICAvLyBPcGVuIG1heSBiZSBhIHN0cmluZyBwYXJzZWQgZnJvbSB0aGUgcGFyc2VyIG9yIGEgcGFzc2VkIGJvb2xlYW4gZmxhZ1xuICAgIGlmIChvcGVuICE9IG51bGwgJiYgb3Blbi5jaGFyQXQpIHtcbiAgICAgIC8vIE11c3QgdXNlIGNoYXJBdCB0byBzdXBwb3J0IElFIHByZS0xMFxuICAgICAgdmFyIGVzY2FwZUZsYWcgPSBvcGVuLmNoYXJBdCgzKSB8fCBvcGVuLmNoYXJBdCgyKTtcbiAgICAgIHRoaXMuZXNjYXBlZCA9IGVzY2FwZUZsYWcgIT09ICd7JyAmJiBlc2NhcGVGbGFnICE9PSAnJic7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZXNjYXBlZCA9ICEhb3BlbjtcbiAgICB9XG5cbiAgICB2YXIgaWQgPSB0aGlzLmlkID0gcmF3UGFyYW1zWzBdO1xuICAgIHZhciBwYXJhbXMgPSB0aGlzLnBhcmFtcyA9IHJhd1BhcmFtcy5zbGljZSgxKTtcblxuICAgIC8vIGEgbXVzdGFjaGUgaXMgYW4gZWxpZ2libGUgaGVscGVyIGlmOlxuICAgIC8vICogaXRzIGlkIGlzIHNpbXBsZSAoYSBzaW5nbGUgcGFydCwgbm90IGB0aGlzYCBvciBgLi5gKVxuICAgIHZhciBlbGlnaWJsZUhlbHBlciA9IHRoaXMuZWxpZ2libGVIZWxwZXIgPSBpZC5pc1NpbXBsZTtcblxuICAgIC8vIGEgbXVzdGFjaGUgaXMgZGVmaW5pdGVseSBhIGhlbHBlciBpZjpcbiAgICAvLyAqIGl0IGlzIGFuIGVsaWdpYmxlIGhlbHBlciwgYW5kXG4gICAgLy8gKiBpdCBoYXMgYXQgbGVhc3Qgb25lIHBhcmFtZXRlciBvciBoYXNoIHNlZ21lbnRcbiAgICB0aGlzLmlzSGVscGVyID0gZWxpZ2libGVIZWxwZXIgJiYgKHBhcmFtcy5sZW5ndGggfHwgaGFzaCk7XG5cbiAgICAvLyBpZiBhIG11c3RhY2hlIGlzIGFuIGVsaWdpYmxlIGhlbHBlciBidXQgbm90IGEgZGVmaW5pdGVcbiAgICAvLyBoZWxwZXIsIGl0IGlzIGFtYmlndW91cywgYW5kIHdpbGwgYmUgcmVzb2x2ZWQgaW4gYSBsYXRlclxuICAgIC8vIHBhc3Mgb3IgYXQgcnVudGltZS5cbiAgfSxcblxuICBQYXJ0aWFsTm9kZTogZnVuY3Rpb24ocGFydGlhbE5hbWUsIGNvbnRleHQsIHN0cmlwKSB7XG4gICAgdGhpcy50eXBlICAgICAgICAgPSBcInBhcnRpYWxcIjtcbiAgICB0aGlzLnBhcnRpYWxOYW1lICA9IHBhcnRpYWxOYW1lO1xuICAgIHRoaXMuY29udGV4dCAgICAgID0gY29udGV4dDtcbiAgICB0aGlzLnN0cmlwID0gc3RyaXA7XG4gIH0sXG5cbiAgQmxvY2tOb2RlOiBmdW5jdGlvbihtdXN0YWNoZSwgcHJvZ3JhbSwgaW52ZXJzZSwgY2xvc2UpIHtcbiAgICBpZihtdXN0YWNoZS5pZC5vcmlnaW5hbCAhPT0gY2xvc2UucGF0aC5vcmlnaW5hbCkge1xuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihtdXN0YWNoZS5pZC5vcmlnaW5hbCArIFwiIGRvZXNuJ3QgbWF0Y2ggXCIgKyBjbG9zZS5wYXRoLm9yaWdpbmFsKTtcbiAgICB9XG5cbiAgICB0aGlzLnR5cGUgPSBcImJsb2NrXCI7XG4gICAgdGhpcy5tdXN0YWNoZSA9IG11c3RhY2hlO1xuICAgIHRoaXMucHJvZ3JhbSAgPSBwcm9ncmFtO1xuICAgIHRoaXMuaW52ZXJzZSAgPSBpbnZlcnNlO1xuXG4gICAgdGhpcy5zdHJpcCA9IHtcbiAgICAgIGxlZnQ6IG11c3RhY2hlLnN0cmlwLmxlZnQsXG4gICAgICByaWdodDogY2xvc2Uuc3RyaXAucmlnaHRcbiAgICB9O1xuXG4gICAgKHByb2dyYW0gfHwgaW52ZXJzZSkuc3RyaXAubGVmdCA9IG11c3RhY2hlLnN0cmlwLnJpZ2h0O1xuICAgIChpbnZlcnNlIHx8IHByb2dyYW0pLnN0cmlwLnJpZ2h0ID0gY2xvc2Uuc3RyaXAubGVmdDtcblxuICAgIGlmIChpbnZlcnNlICYmICFwcm9ncmFtKSB7XG4gICAgICB0aGlzLmlzSW52ZXJzZSA9IHRydWU7XG4gICAgfVxuICB9LFxuXG4gIENvbnRlbnROb2RlOiBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICB0aGlzLnR5cGUgPSBcImNvbnRlbnRcIjtcbiAgICB0aGlzLnN0cmluZyA9IHN0cmluZztcbiAgfSxcblxuICBIYXNoTm9kZTogZnVuY3Rpb24ocGFpcnMpIHtcbiAgICB0aGlzLnR5cGUgPSBcImhhc2hcIjtcbiAgICB0aGlzLnBhaXJzID0gcGFpcnM7XG4gIH0sXG5cbiAgSWROb2RlOiBmdW5jdGlvbihwYXJ0cykge1xuICAgIHRoaXMudHlwZSA9IFwiSURcIjtcblxuICAgIHZhciBvcmlnaW5hbCA9IFwiXCIsXG4gICAgICAgIGRpZyA9IFtdLFxuICAgICAgICBkZXB0aCA9IDA7XG5cbiAgICBmb3IodmFyIGk9MCxsPXBhcnRzLmxlbmd0aDsgaTxsOyBpKyspIHtcbiAgICAgIHZhciBwYXJ0ID0gcGFydHNbaV0ucGFydDtcbiAgICAgIG9yaWdpbmFsICs9IChwYXJ0c1tpXS5zZXBhcmF0b3IgfHwgJycpICsgcGFydDtcblxuICAgICAgaWYgKHBhcnQgPT09IFwiLi5cIiB8fCBwYXJ0ID09PSBcIi5cIiB8fCBwYXJ0ID09PSBcInRoaXNcIikge1xuICAgICAgICBpZiAoZGlnLmxlbmd0aCA+IDApIHsgdGhyb3cgbmV3IEV4Y2VwdGlvbihcIkludmFsaWQgcGF0aDogXCIgKyBvcmlnaW5hbCk7IH1cbiAgICAgICAgZWxzZSBpZiAocGFydCA9PT0gXCIuLlwiKSB7IGRlcHRoKys7IH1cbiAgICAgICAgZWxzZSB7IHRoaXMuaXNTY29wZWQgPSB0cnVlOyB9XG4gICAgICB9XG4gICAgICBlbHNlIHsgZGlnLnB1c2gocGFydCk7IH1cbiAgICB9XG5cbiAgICB0aGlzLm9yaWdpbmFsID0gb3JpZ2luYWw7XG4gICAgdGhpcy5wYXJ0cyAgICA9IGRpZztcbiAgICB0aGlzLnN0cmluZyAgID0gZGlnLmpvaW4oJy4nKTtcbiAgICB0aGlzLmRlcHRoICAgID0gZGVwdGg7XG5cbiAgICAvLyBhbiBJRCBpcyBzaW1wbGUgaWYgaXQgb25seSBoYXMgb25lIHBhcnQsIGFuZCB0aGF0IHBhcnQgaXMgbm90XG4gICAgLy8gYC4uYCBvciBgdGhpc2AuXG4gICAgdGhpcy5pc1NpbXBsZSA9IHBhcnRzLmxlbmd0aCA9PT0gMSAmJiAhdGhpcy5pc1Njb3BlZCAmJiBkZXB0aCA9PT0gMDtcblxuICAgIHRoaXMuc3RyaW5nTW9kZVZhbHVlID0gdGhpcy5zdHJpbmc7XG4gIH0sXG5cbiAgUGFydGlhbE5hbWVOb2RlOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgdGhpcy50eXBlID0gXCJQQVJUSUFMX05BTUVcIjtcbiAgICB0aGlzLm5hbWUgPSBuYW1lLm9yaWdpbmFsO1xuICB9LFxuXG4gIERhdGFOb2RlOiBmdW5jdGlvbihpZCkge1xuICAgIHRoaXMudHlwZSA9IFwiREFUQVwiO1xuICAgIHRoaXMuaWQgPSBpZDtcbiAgfSxcblxuICBTdHJpbmdOb2RlOiBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICB0aGlzLnR5cGUgPSBcIlNUUklOR1wiO1xuICAgIHRoaXMub3JpZ2luYWwgPVxuICAgICAgdGhpcy5zdHJpbmcgPVxuICAgICAgdGhpcy5zdHJpbmdNb2RlVmFsdWUgPSBzdHJpbmc7XG4gIH0sXG5cbiAgSW50ZWdlck5vZGU6IGZ1bmN0aW9uKGludGVnZXIpIHtcbiAgICB0aGlzLnR5cGUgPSBcIklOVEVHRVJcIjtcbiAgICB0aGlzLm9yaWdpbmFsID1cbiAgICAgIHRoaXMuaW50ZWdlciA9IGludGVnZXI7XG4gICAgdGhpcy5zdHJpbmdNb2RlVmFsdWUgPSBOdW1iZXIoaW50ZWdlcik7XG4gIH0sXG5cbiAgQm9vbGVhbk5vZGU6IGZ1bmN0aW9uKGJvb2wpIHtcbiAgICB0aGlzLnR5cGUgPSBcIkJPT0xFQU5cIjtcbiAgICB0aGlzLmJvb2wgPSBib29sO1xuICAgIHRoaXMuc3RyaW5nTW9kZVZhbHVlID0gYm9vbCA9PT0gXCJ0cnVlXCI7XG4gIH0sXG5cbiAgQ29tbWVudE5vZGU6IGZ1bmN0aW9uKGNvbW1lbnQpIHtcbiAgICB0aGlzLnR5cGUgPSBcImNvbW1lbnRcIjtcbiAgICB0aGlzLmNvbW1lbnQgPSBjb21tZW50O1xuICB9XG59O1xuXG4vLyBNdXN0IGJlIGV4cG9ydGVkIGFzIGFuIG9iamVjdCByYXRoZXIgdGhhbiB0aGUgcm9vdCBvZiB0aGUgbW9kdWxlIGFzIHRoZSBqaXNvbiBsZXhlclxuLy8gbW9zdCBtb2RpZnkgdGhlIG9iamVjdCB0byBvcGVyYXRlIHByb3Blcmx5LlxuZXhwb3J0c1tcImRlZmF1bHRcIl0gPSBBU1Q7IiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgcGFyc2VyID0gcmVxdWlyZShcIi4vcGFyc2VyXCIpW1wiZGVmYXVsdFwiXTtcbnZhciBBU1QgPSByZXF1aXJlKFwiLi9hc3RcIilbXCJkZWZhdWx0XCJdO1xuXG5leHBvcnRzLnBhcnNlciA9IHBhcnNlcjtcblxuZnVuY3Rpb24gcGFyc2UoaW5wdXQpIHtcbiAgLy8gSnVzdCByZXR1cm4gaWYgYW4gYWxyZWFkeS1jb21waWxlIEFTVCB3YXMgcGFzc2VkIGluLlxuICBpZihpbnB1dC5jb25zdHJ1Y3RvciA9PT0gQVNULlByb2dyYW1Ob2RlKSB7IHJldHVybiBpbnB1dDsgfVxuXG4gIHBhcnNlci55eSA9IEFTVDtcbiAgcmV0dXJuIHBhcnNlci5wYXJzZShpbnB1dCk7XG59XG5cbmV4cG9ydHMucGFyc2UgPSBwYXJzZTsiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBFeGNlcHRpb24gPSByZXF1aXJlKFwiLi4vZXhjZXB0aW9uXCIpW1wiZGVmYXVsdFwiXTtcbnZhciBwYXJzZSA9IHJlcXVpcmUoXCIuL2Jhc2VcIikucGFyc2U7XG52YXIgSmF2YVNjcmlwdENvbXBpbGVyID0gcmVxdWlyZShcIi4vamF2YXNjcmlwdC1jb21waWxlclwiKVtcImRlZmF1bHRcIl07XG52YXIgQVNUID0gcmVxdWlyZShcIi4vYXN0XCIpW1wiZGVmYXVsdFwiXTtcblxuZnVuY3Rpb24gQ29tcGlsZXIoKSB7fVxuXG5leHBvcnRzLkNvbXBpbGVyID0gQ29tcGlsZXI7Ly8gdGhlIGZvdW5kSGVscGVyIHJlZ2lzdGVyIHdpbGwgZGlzYW1iaWd1YXRlIGhlbHBlciBsb29rdXAgZnJvbSBmaW5kaW5nIGFcbi8vIGZ1bmN0aW9uIGluIGEgY29udGV4dC4gVGhpcyBpcyBuZWNlc3NhcnkgZm9yIG11c3RhY2hlIGNvbXBhdGliaWxpdHksIHdoaWNoXG4vLyByZXF1aXJlcyB0aGF0IGNvbnRleHQgZnVuY3Rpb25zIGluIGJsb2NrcyBhcmUgZXZhbHVhdGVkIGJ5IGJsb2NrSGVscGVyTWlzc2luZyxcbi8vIGFuZCB0aGVuIHByb2NlZWQgYXMgaWYgdGhlIHJlc3VsdGluZyB2YWx1ZSB3YXMgcHJvdmlkZWQgdG8gYmxvY2tIZWxwZXJNaXNzaW5nLlxuXG5Db21waWxlci5wcm90b3R5cGUgPSB7XG4gIGNvbXBpbGVyOiBDb21waWxlcixcblxuICBkaXNhc3NlbWJsZTogZnVuY3Rpb24oKSB7XG4gICAgdmFyIG9wY29kZXMgPSB0aGlzLm9wY29kZXMsIG9wY29kZSwgb3V0ID0gW10sIHBhcmFtcywgcGFyYW07XG5cbiAgICBmb3IgKHZhciBpPTAsIGw9b3Bjb2Rlcy5sZW5ndGg7IGk8bDsgaSsrKSB7XG4gICAgICBvcGNvZGUgPSBvcGNvZGVzW2ldO1xuXG4gICAgICBpZiAob3Bjb2RlLm9wY29kZSA9PT0gJ0RFQ0xBUkUnKSB7XG4gICAgICAgIG91dC5wdXNoKFwiREVDTEFSRSBcIiArIG9wY29kZS5uYW1lICsgXCI9XCIgKyBvcGNvZGUudmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGFyYW1zID0gW107XG4gICAgICAgIGZvciAodmFyIGo9MDsgajxvcGNvZGUuYXJncy5sZW5ndGg7IGorKykge1xuICAgICAgICAgIHBhcmFtID0gb3Bjb2RlLmFyZ3Nbal07XG4gICAgICAgICAgaWYgKHR5cGVvZiBwYXJhbSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgcGFyYW0gPSBcIlxcXCJcIiArIHBhcmFtLnJlcGxhY2UoXCJcXG5cIiwgXCJcXFxcblwiKSArIFwiXFxcIlwiO1xuICAgICAgICAgIH1cbiAgICAgICAgICBwYXJhbXMucHVzaChwYXJhbSk7XG4gICAgICAgIH1cbiAgICAgICAgb3V0LnB1c2gob3Bjb2RlLm9wY29kZSArIFwiIFwiICsgcGFyYW1zLmpvaW4oXCIgXCIpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gb3V0LmpvaW4oXCJcXG5cIik7XG4gIH0sXG5cbiAgZXF1YWxzOiBmdW5jdGlvbihvdGhlcikge1xuICAgIHZhciBsZW4gPSB0aGlzLm9wY29kZXMubGVuZ3RoO1xuICAgIGlmIChvdGhlci5vcGNvZGVzLmxlbmd0aCAhPT0gbGVuKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgdmFyIG9wY29kZSA9IHRoaXMub3Bjb2Rlc1tpXSxcbiAgICAgICAgICBvdGhlck9wY29kZSA9IG90aGVyLm9wY29kZXNbaV07XG4gICAgICBpZiAob3Bjb2RlLm9wY29kZSAhPT0gb3RoZXJPcGNvZGUub3Bjb2RlIHx8IG9wY29kZS5hcmdzLmxlbmd0aCAhPT0gb3RoZXJPcGNvZGUuYXJncy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBvcGNvZGUuYXJncy5sZW5ndGg7IGorKykge1xuICAgICAgICBpZiAob3Bjb2RlLmFyZ3Nbal0gIT09IG90aGVyT3Bjb2RlLmFyZ3Nbal0pIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBsZW4gPSB0aGlzLmNoaWxkcmVuLmxlbmd0aDtcbiAgICBpZiAob3RoZXIuY2hpbGRyZW4ubGVuZ3RoICE9PSBsZW4pIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBpZiAoIXRoaXMuY2hpbGRyZW5baV0uZXF1YWxzKG90aGVyLmNoaWxkcmVuW2ldKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG4gIH0sXG5cbiAgZ3VpZDogMCxcblxuICBjb21waWxlOiBmdW5jdGlvbihwcm9ncmFtLCBvcHRpb25zKSB7XG4gICAgdGhpcy5vcGNvZGVzID0gW107XG4gICAgdGhpcy5jaGlsZHJlbiA9IFtdO1xuICAgIHRoaXMuZGVwdGhzID0ge2xpc3Q6IFtdfTtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuXG4gICAgLy8gVGhlc2UgY2hhbmdlcyB3aWxsIHByb3BhZ2F0ZSB0byB0aGUgb3RoZXIgY29tcGlsZXIgY29tcG9uZW50c1xuICAgIHZhciBrbm93bkhlbHBlcnMgPSB0aGlzLm9wdGlvbnMua25vd25IZWxwZXJzO1xuICAgIHRoaXMub3B0aW9ucy5rbm93bkhlbHBlcnMgPSB7XG4gICAgICAnaGVscGVyTWlzc2luZyc6IHRydWUsXG4gICAgICAnYmxvY2tIZWxwZXJNaXNzaW5nJzogdHJ1ZSxcbiAgICAgICdlYWNoJzogdHJ1ZSxcbiAgICAgICdpZic6IHRydWUsXG4gICAgICAndW5sZXNzJzogdHJ1ZSxcbiAgICAgICd3aXRoJzogdHJ1ZSxcbiAgICAgICdsb2cnOiB0cnVlXG4gICAgfTtcbiAgICBpZiAoa25vd25IZWxwZXJzKSB7XG4gICAgICBmb3IgKHZhciBuYW1lIGluIGtub3duSGVscGVycykge1xuICAgICAgICB0aGlzLm9wdGlvbnMua25vd25IZWxwZXJzW25hbWVdID0ga25vd25IZWxwZXJzW25hbWVdO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmFjY2VwdChwcm9ncmFtKTtcbiAgfSxcblxuICBhY2NlcHQ6IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICB2YXIgc3RyaXAgPSBub2RlLnN0cmlwIHx8IHt9LFxuICAgICAgICByZXQ7XG4gICAgaWYgKHN0cmlwLmxlZnQpIHtcbiAgICAgIHRoaXMub3Bjb2RlKCdzdHJpcCcpO1xuICAgIH1cblxuICAgIHJldCA9IHRoaXNbbm9kZS50eXBlXShub2RlKTtcblxuICAgIGlmIChzdHJpcC5yaWdodCkge1xuICAgICAgdGhpcy5vcGNvZGUoJ3N0cmlwJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldDtcbiAgfSxcblxuICBwcm9ncmFtOiBmdW5jdGlvbihwcm9ncmFtKSB7XG4gICAgdmFyIHN0YXRlbWVudHMgPSBwcm9ncmFtLnN0YXRlbWVudHM7XG5cbiAgICBmb3IodmFyIGk9MCwgbD1zdGF0ZW1lbnRzLmxlbmd0aDsgaTxsOyBpKyspIHtcbiAgICAgIHRoaXMuYWNjZXB0KHN0YXRlbWVudHNbaV0pO1xuICAgIH1cbiAgICB0aGlzLmlzU2ltcGxlID0gbCA9PT0gMTtcblxuICAgIHRoaXMuZGVwdGhzLmxpc3QgPSB0aGlzLmRlcHRocy5saXN0LnNvcnQoZnVuY3Rpb24oYSwgYikge1xuICAgICAgcmV0dXJuIGEgLSBiO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgY29tcGlsZVByb2dyYW06IGZ1bmN0aW9uKHByb2dyYW0pIHtcbiAgICB2YXIgcmVzdWx0ID0gbmV3IHRoaXMuY29tcGlsZXIoKS5jb21waWxlKHByb2dyYW0sIHRoaXMub3B0aW9ucyk7XG4gICAgdmFyIGd1aWQgPSB0aGlzLmd1aWQrKywgZGVwdGg7XG5cbiAgICB0aGlzLnVzZVBhcnRpYWwgPSB0aGlzLnVzZVBhcnRpYWwgfHwgcmVzdWx0LnVzZVBhcnRpYWw7XG5cbiAgICB0aGlzLmNoaWxkcmVuW2d1aWRdID0gcmVzdWx0O1xuXG4gICAgZm9yKHZhciBpPTAsIGw9cmVzdWx0LmRlcHRocy5saXN0Lmxlbmd0aDsgaTxsOyBpKyspIHtcbiAgICAgIGRlcHRoID0gcmVzdWx0LmRlcHRocy5saXN0W2ldO1xuXG4gICAgICBpZihkZXB0aCA8IDIpIHsgY29udGludWU7IH1cbiAgICAgIGVsc2UgeyB0aGlzLmFkZERlcHRoKGRlcHRoIC0gMSk7IH1cbiAgICB9XG5cbiAgICByZXR1cm4gZ3VpZDtcbiAgfSxcblxuICBibG9jazogZnVuY3Rpb24oYmxvY2spIHtcbiAgICB2YXIgbXVzdGFjaGUgPSBibG9jay5tdXN0YWNoZSxcbiAgICAgICAgcHJvZ3JhbSA9IGJsb2NrLnByb2dyYW0sXG4gICAgICAgIGludmVyc2UgPSBibG9jay5pbnZlcnNlO1xuXG4gICAgaWYgKHByb2dyYW0pIHtcbiAgICAgIHByb2dyYW0gPSB0aGlzLmNvbXBpbGVQcm9ncmFtKHByb2dyYW0pO1xuICAgIH1cblxuICAgIGlmIChpbnZlcnNlKSB7XG4gICAgICBpbnZlcnNlID0gdGhpcy5jb21waWxlUHJvZ3JhbShpbnZlcnNlKTtcbiAgICB9XG5cbiAgICB2YXIgdHlwZSA9IHRoaXMuY2xhc3NpZnlNdXN0YWNoZShtdXN0YWNoZSk7XG5cbiAgICBpZiAodHlwZSA9PT0gXCJoZWxwZXJcIikge1xuICAgICAgdGhpcy5oZWxwZXJNdXN0YWNoZShtdXN0YWNoZSwgcHJvZ3JhbSwgaW52ZXJzZSk7XG4gICAgfSBlbHNlIGlmICh0eXBlID09PSBcInNpbXBsZVwiKSB7XG4gICAgICB0aGlzLnNpbXBsZU11c3RhY2hlKG11c3RhY2hlKTtcblxuICAgICAgLy8gbm93IHRoYXQgdGhlIHNpbXBsZSBtdXN0YWNoZSBpcyByZXNvbHZlZCwgd2UgbmVlZCB0b1xuICAgICAgLy8gZXZhbHVhdGUgaXQgYnkgZXhlY3V0aW5nIGBibG9ja0hlbHBlck1pc3NpbmdgXG4gICAgICB0aGlzLm9wY29kZSgncHVzaFByb2dyYW0nLCBwcm9ncmFtKTtcbiAgICAgIHRoaXMub3Bjb2RlKCdwdXNoUHJvZ3JhbScsIGludmVyc2UpO1xuICAgICAgdGhpcy5vcGNvZGUoJ2VtcHR5SGFzaCcpO1xuICAgICAgdGhpcy5vcGNvZGUoJ2Jsb2NrVmFsdWUnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5hbWJpZ3VvdXNNdXN0YWNoZShtdXN0YWNoZSwgcHJvZ3JhbSwgaW52ZXJzZSk7XG5cbiAgICAgIC8vIG5vdyB0aGF0IHRoZSBzaW1wbGUgbXVzdGFjaGUgaXMgcmVzb2x2ZWQsIHdlIG5lZWQgdG9cbiAgICAgIC8vIGV2YWx1YXRlIGl0IGJ5IGV4ZWN1dGluZyBgYmxvY2tIZWxwZXJNaXNzaW5nYFxuICAgICAgdGhpcy5vcGNvZGUoJ3B1c2hQcm9ncmFtJywgcHJvZ3JhbSk7XG4gICAgICB0aGlzLm9wY29kZSgncHVzaFByb2dyYW0nLCBpbnZlcnNlKTtcbiAgICAgIHRoaXMub3Bjb2RlKCdlbXB0eUhhc2gnKTtcbiAgICAgIHRoaXMub3Bjb2RlKCdhbWJpZ3VvdXNCbG9ja1ZhbHVlJyk7XG4gICAgfVxuXG4gICAgdGhpcy5vcGNvZGUoJ2FwcGVuZCcpO1xuICB9LFxuXG4gIGhhc2g6IGZ1bmN0aW9uKGhhc2gpIHtcbiAgICB2YXIgcGFpcnMgPSBoYXNoLnBhaXJzLCBwYWlyLCB2YWw7XG5cbiAgICB0aGlzLm9wY29kZSgncHVzaEhhc2gnKTtcblxuICAgIGZvcih2YXIgaT0wLCBsPXBhaXJzLmxlbmd0aDsgaTxsOyBpKyspIHtcbiAgICAgIHBhaXIgPSBwYWlyc1tpXTtcbiAgICAgIHZhbCAgPSBwYWlyWzFdO1xuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLnN0cmluZ1BhcmFtcykge1xuICAgICAgICBpZih2YWwuZGVwdGgpIHtcbiAgICAgICAgICB0aGlzLmFkZERlcHRoKHZhbC5kZXB0aCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5vcGNvZGUoJ2dldENvbnRleHQnLCB2YWwuZGVwdGggfHwgMCk7XG4gICAgICAgIHRoaXMub3Bjb2RlKCdwdXNoU3RyaW5nUGFyYW0nLCB2YWwuc3RyaW5nTW9kZVZhbHVlLCB2YWwudHlwZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmFjY2VwdCh2YWwpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLm9wY29kZSgnYXNzaWduVG9IYXNoJywgcGFpclswXSk7XG4gICAgfVxuICAgIHRoaXMub3Bjb2RlKCdwb3BIYXNoJyk7XG4gIH0sXG5cbiAgcGFydGlhbDogZnVuY3Rpb24ocGFydGlhbCkge1xuICAgIHZhciBwYXJ0aWFsTmFtZSA9IHBhcnRpYWwucGFydGlhbE5hbWU7XG4gICAgdGhpcy51c2VQYXJ0aWFsID0gdHJ1ZTtcblxuICAgIGlmKHBhcnRpYWwuY29udGV4dCkge1xuICAgICAgdGhpcy5JRChwYXJ0aWFsLmNvbnRleHQpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLm9wY29kZSgncHVzaCcsICdkZXB0aDAnKTtcbiAgICB9XG5cbiAgICB0aGlzLm9wY29kZSgnaW52b2tlUGFydGlhbCcsIHBhcnRpYWxOYW1lLm5hbWUpO1xuICAgIHRoaXMub3Bjb2RlKCdhcHBlbmQnKTtcbiAgfSxcblxuICBjb250ZW50OiBmdW5jdGlvbihjb250ZW50KSB7XG4gICAgdGhpcy5vcGNvZGUoJ2FwcGVuZENvbnRlbnQnLCBjb250ZW50LnN0cmluZyk7XG4gIH0sXG5cbiAgbXVzdGFjaGU6IGZ1bmN0aW9uKG11c3RhY2hlKSB7XG4gICAgdmFyIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnM7XG4gICAgdmFyIHR5cGUgPSB0aGlzLmNsYXNzaWZ5TXVzdGFjaGUobXVzdGFjaGUpO1xuXG4gICAgaWYgKHR5cGUgPT09IFwic2ltcGxlXCIpIHtcbiAgICAgIHRoaXMuc2ltcGxlTXVzdGFjaGUobXVzdGFjaGUpO1xuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gXCJoZWxwZXJcIikge1xuICAgICAgdGhpcy5oZWxwZXJNdXN0YWNoZShtdXN0YWNoZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuYW1iaWd1b3VzTXVzdGFjaGUobXVzdGFjaGUpO1xuICAgIH1cblxuICAgIGlmKG11c3RhY2hlLmVzY2FwZWQgJiYgIW9wdGlvbnMubm9Fc2NhcGUpIHtcbiAgICAgIHRoaXMub3Bjb2RlKCdhcHBlbmRFc2NhcGVkJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMub3Bjb2RlKCdhcHBlbmQnKTtcbiAgICB9XG4gIH0sXG5cbiAgYW1iaWd1b3VzTXVzdGFjaGU6IGZ1bmN0aW9uKG11c3RhY2hlLCBwcm9ncmFtLCBpbnZlcnNlKSB7XG4gICAgdmFyIGlkID0gbXVzdGFjaGUuaWQsXG4gICAgICAgIG5hbWUgPSBpZC5wYXJ0c1swXSxcbiAgICAgICAgaXNCbG9jayA9IHByb2dyYW0gIT0gbnVsbCB8fCBpbnZlcnNlICE9IG51bGw7XG5cbiAgICB0aGlzLm9wY29kZSgnZ2V0Q29udGV4dCcsIGlkLmRlcHRoKTtcblxuICAgIHRoaXMub3Bjb2RlKCdwdXNoUHJvZ3JhbScsIHByb2dyYW0pO1xuICAgIHRoaXMub3Bjb2RlKCdwdXNoUHJvZ3JhbScsIGludmVyc2UpO1xuXG4gICAgdGhpcy5vcGNvZGUoJ2ludm9rZUFtYmlndW91cycsIG5hbWUsIGlzQmxvY2spO1xuICB9LFxuXG4gIHNpbXBsZU11c3RhY2hlOiBmdW5jdGlvbihtdXN0YWNoZSkge1xuICAgIHZhciBpZCA9IG11c3RhY2hlLmlkO1xuXG4gICAgaWYgKGlkLnR5cGUgPT09ICdEQVRBJykge1xuICAgICAgdGhpcy5EQVRBKGlkKTtcbiAgICB9IGVsc2UgaWYgKGlkLnBhcnRzLmxlbmd0aCkge1xuICAgICAgdGhpcy5JRChpZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFNpbXBsaWZpZWQgSUQgZm9yIGB0aGlzYFxuICAgICAgdGhpcy5hZGREZXB0aChpZC5kZXB0aCk7XG4gICAgICB0aGlzLm9wY29kZSgnZ2V0Q29udGV4dCcsIGlkLmRlcHRoKTtcbiAgICAgIHRoaXMub3Bjb2RlKCdwdXNoQ29udGV4dCcpO1xuICAgIH1cblxuICAgIHRoaXMub3Bjb2RlKCdyZXNvbHZlUG9zc2libGVMYW1iZGEnKTtcbiAgfSxcblxuICBoZWxwZXJNdXN0YWNoZTogZnVuY3Rpb24obXVzdGFjaGUsIHByb2dyYW0sIGludmVyc2UpIHtcbiAgICB2YXIgcGFyYW1zID0gdGhpcy5zZXR1cEZ1bGxNdXN0YWNoZVBhcmFtcyhtdXN0YWNoZSwgcHJvZ3JhbSwgaW52ZXJzZSksXG4gICAgICAgIG5hbWUgPSBtdXN0YWNoZS5pZC5wYXJ0c1swXTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMua25vd25IZWxwZXJzW25hbWVdKSB7XG4gICAgICB0aGlzLm9wY29kZSgnaW52b2tlS25vd25IZWxwZXInLCBwYXJhbXMubGVuZ3RoLCBuYW1lKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMub3B0aW9ucy5rbm93bkhlbHBlcnNPbmx5KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJZb3Ugc3BlY2lmaWVkIGtub3duSGVscGVyc09ubHksIGJ1dCB1c2VkIHRoZSB1bmtub3duIGhlbHBlciBcIiArIG5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLm9wY29kZSgnaW52b2tlSGVscGVyJywgcGFyYW1zLmxlbmd0aCwgbmFtZSk7XG4gICAgfVxuICB9LFxuXG4gIElEOiBmdW5jdGlvbihpZCkge1xuICAgIHRoaXMuYWRkRGVwdGgoaWQuZGVwdGgpO1xuICAgIHRoaXMub3Bjb2RlKCdnZXRDb250ZXh0JywgaWQuZGVwdGgpO1xuXG4gICAgdmFyIG5hbWUgPSBpZC5wYXJ0c1swXTtcbiAgICBpZiAoIW5hbWUpIHtcbiAgICAgIHRoaXMub3Bjb2RlKCdwdXNoQ29udGV4dCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLm9wY29kZSgnbG9va3VwT25Db250ZXh0JywgaWQucGFydHNbMF0pO1xuICAgIH1cblxuICAgIGZvcih2YXIgaT0xLCBsPWlkLnBhcnRzLmxlbmd0aDsgaTxsOyBpKyspIHtcbiAgICAgIHRoaXMub3Bjb2RlKCdsb29rdXAnLCBpZC5wYXJ0c1tpXSk7XG4gICAgfVxuICB9LFxuXG4gIERBVEE6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICB0aGlzLm9wdGlvbnMuZGF0YSA9IHRydWU7XG4gICAgaWYgKGRhdGEuaWQuaXNTY29wZWQgfHwgZGF0YS5pZC5kZXB0aCkge1xuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbignU2NvcGVkIGRhdGEgcmVmZXJlbmNlcyBhcmUgbm90IHN1cHBvcnRlZDogJyArIGRhdGEub3JpZ2luYWwpO1xuICAgIH1cblxuICAgIHRoaXMub3Bjb2RlKCdsb29rdXBEYXRhJyk7XG4gICAgdmFyIHBhcnRzID0gZGF0YS5pZC5wYXJ0cztcbiAgICBmb3IodmFyIGk9MCwgbD1wYXJ0cy5sZW5ndGg7IGk8bDsgaSsrKSB7XG4gICAgICB0aGlzLm9wY29kZSgnbG9va3VwJywgcGFydHNbaV0pO1xuICAgIH1cbiAgfSxcblxuICBTVFJJTkc6IGZ1bmN0aW9uKHN0cmluZykge1xuICAgIHRoaXMub3Bjb2RlKCdwdXNoU3RyaW5nJywgc3RyaW5nLnN0cmluZyk7XG4gIH0sXG5cbiAgSU5URUdFUjogZnVuY3Rpb24oaW50ZWdlcikge1xuICAgIHRoaXMub3Bjb2RlKCdwdXNoTGl0ZXJhbCcsIGludGVnZXIuaW50ZWdlcik7XG4gIH0sXG5cbiAgQk9PTEVBTjogZnVuY3Rpb24oYm9vbCkge1xuICAgIHRoaXMub3Bjb2RlKCdwdXNoTGl0ZXJhbCcsIGJvb2wuYm9vbCk7XG4gIH0sXG5cbiAgY29tbWVudDogZnVuY3Rpb24oKSB7fSxcblxuICAvLyBIRUxQRVJTXG4gIG9wY29kZTogZnVuY3Rpb24obmFtZSkge1xuICAgIHRoaXMub3Bjb2Rlcy5wdXNoKHsgb3Bjb2RlOiBuYW1lLCBhcmdzOiBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkgfSk7XG4gIH0sXG5cbiAgZGVjbGFyZTogZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICB0aGlzLm9wY29kZXMucHVzaCh7IG9wY29kZTogJ0RFQ0xBUkUnLCBuYW1lOiBuYW1lLCB2YWx1ZTogdmFsdWUgfSk7XG4gIH0sXG5cbiAgYWRkRGVwdGg6IGZ1bmN0aW9uKGRlcHRoKSB7XG4gICAgaWYoaXNOYU4oZGVwdGgpKSB7IHRocm93IG5ldyBFcnJvcihcIkVXT1RcIik7IH1cbiAgICBpZihkZXB0aCA9PT0gMCkgeyByZXR1cm47IH1cblxuICAgIGlmKCF0aGlzLmRlcHRoc1tkZXB0aF0pIHtcbiAgICAgIHRoaXMuZGVwdGhzW2RlcHRoXSA9IHRydWU7XG4gICAgICB0aGlzLmRlcHRocy5saXN0LnB1c2goZGVwdGgpO1xuICAgIH1cbiAgfSxcblxuICBjbGFzc2lmeU11c3RhY2hlOiBmdW5jdGlvbihtdXN0YWNoZSkge1xuICAgIHZhciBpc0hlbHBlciAgID0gbXVzdGFjaGUuaXNIZWxwZXI7XG4gICAgdmFyIGlzRWxpZ2libGUgPSBtdXN0YWNoZS5lbGlnaWJsZUhlbHBlcjtcbiAgICB2YXIgb3B0aW9ucyAgICA9IHRoaXMub3B0aW9ucztcblxuICAgIC8vIGlmIGFtYmlndW91cywgd2UgY2FuIHBvc3NpYmx5IHJlc29sdmUgdGhlIGFtYmlndWl0eSBub3dcbiAgICBpZiAoaXNFbGlnaWJsZSAmJiAhaXNIZWxwZXIpIHtcbiAgICAgIHZhciBuYW1lID0gbXVzdGFjaGUuaWQucGFydHNbMF07XG5cbiAgICAgIGlmIChvcHRpb25zLmtub3duSGVscGVyc1tuYW1lXSkge1xuICAgICAgICBpc0hlbHBlciA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKG9wdGlvbnMua25vd25IZWxwZXJzT25seSkge1xuICAgICAgICBpc0VsaWdpYmxlID0gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGlzSGVscGVyKSB7IHJldHVybiBcImhlbHBlclwiOyB9XG4gICAgZWxzZSBpZiAoaXNFbGlnaWJsZSkgeyByZXR1cm4gXCJhbWJpZ3VvdXNcIjsgfVxuICAgIGVsc2UgeyByZXR1cm4gXCJzaW1wbGVcIjsgfVxuICB9LFxuXG4gIHB1c2hQYXJhbXM6IGZ1bmN0aW9uKHBhcmFtcykge1xuICAgIHZhciBpID0gcGFyYW1zLmxlbmd0aCwgcGFyYW07XG5cbiAgICB3aGlsZShpLS0pIHtcbiAgICAgIHBhcmFtID0gcGFyYW1zW2ldO1xuXG4gICAgICBpZih0aGlzLm9wdGlvbnMuc3RyaW5nUGFyYW1zKSB7XG4gICAgICAgIGlmKHBhcmFtLmRlcHRoKSB7XG4gICAgICAgICAgdGhpcy5hZGREZXB0aChwYXJhbS5kZXB0aCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLm9wY29kZSgnZ2V0Q29udGV4dCcsIHBhcmFtLmRlcHRoIHx8IDApO1xuICAgICAgICB0aGlzLm9wY29kZSgncHVzaFN0cmluZ1BhcmFtJywgcGFyYW0uc3RyaW5nTW9kZVZhbHVlLCBwYXJhbS50eXBlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXNbcGFyYW0udHlwZV0ocGFyYW0pO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBzZXR1cE11c3RhY2hlUGFyYW1zOiBmdW5jdGlvbihtdXN0YWNoZSkge1xuICAgIHZhciBwYXJhbXMgPSBtdXN0YWNoZS5wYXJhbXM7XG4gICAgdGhpcy5wdXNoUGFyYW1zKHBhcmFtcyk7XG5cbiAgICBpZihtdXN0YWNoZS5oYXNoKSB7XG4gICAgICB0aGlzLmhhc2gobXVzdGFjaGUuaGFzaCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMub3Bjb2RlKCdlbXB0eUhhc2gnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcGFyYW1zO1xuICB9LFxuXG4gIC8vIHRoaXMgd2lsbCByZXBsYWNlIHNldHVwTXVzdGFjaGVQYXJhbXMgd2hlbiB3ZSdyZSBkb25lXG4gIHNldHVwRnVsbE11c3RhY2hlUGFyYW1zOiBmdW5jdGlvbihtdXN0YWNoZSwgcHJvZ3JhbSwgaW52ZXJzZSkge1xuICAgIHZhciBwYXJhbXMgPSBtdXN0YWNoZS5wYXJhbXM7XG4gICAgdGhpcy5wdXNoUGFyYW1zKHBhcmFtcyk7XG5cbiAgICB0aGlzLm9wY29kZSgncHVzaFByb2dyYW0nLCBwcm9ncmFtKTtcbiAgICB0aGlzLm9wY29kZSgncHVzaFByb2dyYW0nLCBpbnZlcnNlKTtcblxuICAgIGlmKG11c3RhY2hlLmhhc2gpIHtcbiAgICAgIHRoaXMuaGFzaChtdXN0YWNoZS5oYXNoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5vcGNvZGUoJ2VtcHR5SGFzaCcpO1xuICAgIH1cblxuICAgIHJldHVybiBwYXJhbXM7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIHByZWNvbXBpbGUoaW5wdXQsIG9wdGlvbnMpIHtcbiAgaWYgKGlucHV0ID09IG51bGwgfHwgKHR5cGVvZiBpbnB1dCAhPT0gJ3N0cmluZycgJiYgaW5wdXQuY29uc3RydWN0b3IgIT09IEFTVC5Qcm9ncmFtTm9kZSkpIHtcbiAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKFwiWW91IG11c3QgcGFzcyBhIHN0cmluZyBvciBIYW5kbGViYXJzIEFTVCB0byBIYW5kbGViYXJzLnByZWNvbXBpbGUuIFlvdSBwYXNzZWQgXCIgKyBpbnB1dCk7XG4gIH1cblxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgaWYgKCEoJ2RhdGEnIGluIG9wdGlvbnMpKSB7XG4gICAgb3B0aW9ucy5kYXRhID0gdHJ1ZTtcbiAgfVxuXG4gIHZhciBhc3QgPSBwYXJzZShpbnB1dCk7XG4gIHZhciBlbnZpcm9ubWVudCA9IG5ldyBDb21waWxlcigpLmNvbXBpbGUoYXN0LCBvcHRpb25zKTtcbiAgcmV0dXJuIG5ldyBKYXZhU2NyaXB0Q29tcGlsZXIoKS5jb21waWxlKGVudmlyb25tZW50LCBvcHRpb25zKTtcbn1cblxuZXhwb3J0cy5wcmVjb21waWxlID0gcHJlY29tcGlsZTtmdW5jdGlvbiBjb21waWxlKGlucHV0LCBvcHRpb25zLCBlbnYpIHtcbiAgaWYgKGlucHV0ID09IG51bGwgfHwgKHR5cGVvZiBpbnB1dCAhPT0gJ3N0cmluZycgJiYgaW5wdXQuY29uc3RydWN0b3IgIT09IEFTVC5Qcm9ncmFtTm9kZSkpIHtcbiAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKFwiWW91IG11c3QgcGFzcyBhIHN0cmluZyBvciBIYW5kbGViYXJzIEFTVCB0byBIYW5kbGViYXJzLmNvbXBpbGUuIFlvdSBwYXNzZWQgXCIgKyBpbnB1dCk7XG4gIH1cblxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICBpZiAoISgnZGF0YScgaW4gb3B0aW9ucykpIHtcbiAgICBvcHRpb25zLmRhdGEgPSB0cnVlO1xuICB9XG5cbiAgdmFyIGNvbXBpbGVkO1xuXG4gIGZ1bmN0aW9uIGNvbXBpbGVJbnB1dCgpIHtcbiAgICB2YXIgYXN0ID0gcGFyc2UoaW5wdXQpO1xuICAgIHZhciBlbnZpcm9ubWVudCA9IG5ldyBDb21waWxlcigpLmNvbXBpbGUoYXN0LCBvcHRpb25zKTtcbiAgICB2YXIgdGVtcGxhdGVTcGVjID0gbmV3IEphdmFTY3JpcHRDb21waWxlcigpLmNvbXBpbGUoZW52aXJvbm1lbnQsIG9wdGlvbnMsIHVuZGVmaW5lZCwgdHJ1ZSk7XG4gICAgcmV0dXJuIGVudi50ZW1wbGF0ZSh0ZW1wbGF0ZVNwZWMpO1xuICB9XG5cbiAgLy8gVGVtcGxhdGUgaXMgb25seSBjb21waWxlZCBvbiBmaXJzdCB1c2UgYW5kIGNhY2hlZCBhZnRlciB0aGF0IHBvaW50LlxuICByZXR1cm4gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIGlmICghY29tcGlsZWQpIHtcbiAgICAgIGNvbXBpbGVkID0gY29tcGlsZUlucHV0KCk7XG4gICAgfVxuICAgIHJldHVybiBjb21waWxlZC5jYWxsKHRoaXMsIGNvbnRleHQsIG9wdGlvbnMpO1xuICB9O1xufVxuXG5leHBvcnRzLmNvbXBpbGUgPSBjb21waWxlOyIsIlwidXNlIHN0cmljdFwiO1xudmFyIENPTVBJTEVSX1JFVklTSU9OID0gcmVxdWlyZShcIi4uL2Jhc2VcIikuQ09NUElMRVJfUkVWSVNJT047XG52YXIgUkVWSVNJT05fQ0hBTkdFUyA9IHJlcXVpcmUoXCIuLi9iYXNlXCIpLlJFVklTSU9OX0NIQU5HRVM7XG52YXIgbG9nID0gcmVxdWlyZShcIi4uL2Jhc2VcIikubG9nO1xuXG5mdW5jdGlvbiBMaXRlcmFsKHZhbHVlKSB7XG4gIHRoaXMudmFsdWUgPSB2YWx1ZTtcbn1cblxuZnVuY3Rpb24gSmF2YVNjcmlwdENvbXBpbGVyKCkge31cblxuSmF2YVNjcmlwdENvbXBpbGVyLnByb3RvdHlwZSA9IHtcbiAgLy8gUFVCTElDIEFQSTogWW91IGNhbiBvdmVycmlkZSB0aGVzZSBtZXRob2RzIGluIGEgc3ViY2xhc3MgdG8gcHJvdmlkZVxuICAvLyBhbHRlcm5hdGl2ZSBjb21waWxlZCBmb3JtcyBmb3IgbmFtZSBsb29rdXAgYW5kIGJ1ZmZlcmluZyBzZW1hbnRpY3NcbiAgbmFtZUxvb2t1cDogZnVuY3Rpb24ocGFyZW50LCBuYW1lIC8qICwgdHlwZSovKSB7XG4gICAgdmFyIHdyYXAsXG4gICAgICAgIHJldDtcbiAgICBpZiAocGFyZW50LmluZGV4T2YoJ2RlcHRoJykgPT09IDApIHtcbiAgICAgIHdyYXAgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmICgvXlswLTldKyQvLnRlc3QobmFtZSkpIHtcbiAgICAgIHJldCA9IHBhcmVudCArIFwiW1wiICsgbmFtZSArIFwiXVwiO1xuICAgIH0gZWxzZSBpZiAoSmF2YVNjcmlwdENvbXBpbGVyLmlzVmFsaWRKYXZhU2NyaXB0VmFyaWFibGVOYW1lKG5hbWUpKSB7XG4gICAgICByZXQgPSBwYXJlbnQgKyBcIi5cIiArIG5hbWU7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcmV0ID0gcGFyZW50ICsgXCJbJ1wiICsgbmFtZSArIFwiJ11cIjtcbiAgICB9XG5cbiAgICBpZiAod3JhcCkge1xuICAgICAgcmV0dXJuICcoJyArIHBhcmVudCArICcgJiYgJyArIHJldCArICcpJztcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG4gIH0sXG5cbiAgY29tcGlsZXJJbmZvOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgcmV2aXNpb24gPSBDT01QSUxFUl9SRVZJU0lPTixcbiAgICAgICAgdmVyc2lvbnMgPSBSRVZJU0lPTl9DSEFOR0VTW3JldmlzaW9uXTtcbiAgICByZXR1cm4gXCJ0aGlzLmNvbXBpbGVySW5mbyA9IFtcIityZXZpc2lvbitcIiwnXCIrdmVyc2lvbnMrXCInXTtcXG5cIjtcbiAgfSxcblxuICBhcHBlbmRUb0J1ZmZlcjogZnVuY3Rpb24oc3RyaW5nKSB7XG4gICAgaWYgKHRoaXMuZW52aXJvbm1lbnQuaXNTaW1wbGUpIHtcbiAgICAgIHJldHVybiBcInJldHVybiBcIiArIHN0cmluZyArIFwiO1wiO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBhcHBlbmRUb0J1ZmZlcjogdHJ1ZSxcbiAgICAgICAgY29udGVudDogc3RyaW5nLFxuICAgICAgICB0b1N0cmluZzogZnVuY3Rpb24oKSB7IHJldHVybiBcImJ1ZmZlciArPSBcIiArIHN0cmluZyArIFwiO1wiOyB9XG4gICAgICB9O1xuICAgIH1cbiAgfSxcblxuICBpbml0aWFsaXplQnVmZmVyOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5xdW90ZWRTdHJpbmcoXCJcIik7XG4gIH0sXG5cbiAgbmFtZXNwYWNlOiBcIkhhbmRsZWJhcnNcIixcbiAgLy8gRU5EIFBVQkxJQyBBUElcblxuICBjb21waWxlOiBmdW5jdGlvbihlbnZpcm9ubWVudCwgb3B0aW9ucywgY29udGV4dCwgYXNPYmplY3QpIHtcbiAgICB0aGlzLmVudmlyb25tZW50ID0gZW52aXJvbm1lbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgIGxvZygnZGVidWcnLCB0aGlzLmVudmlyb25tZW50LmRpc2Fzc2VtYmxlKCkgKyBcIlxcblxcblwiKTtcblxuICAgIHRoaXMubmFtZSA9IHRoaXMuZW52aXJvbm1lbnQubmFtZTtcbiAgICB0aGlzLmlzQ2hpbGQgPSAhIWNvbnRleHQ7XG4gICAgdGhpcy5jb250ZXh0ID0gY29udGV4dCB8fCB7XG4gICAgICBwcm9ncmFtczogW10sXG4gICAgICBlbnZpcm9ubWVudHM6IFtdLFxuICAgICAgYWxpYXNlczogeyB9XG4gICAgfTtcblxuICAgIHRoaXMucHJlYW1ibGUoKTtcblxuICAgIHRoaXMuc3RhY2tTbG90ID0gMDtcbiAgICB0aGlzLnN0YWNrVmFycyA9IFtdO1xuICAgIHRoaXMucmVnaXN0ZXJzID0geyBsaXN0OiBbXSB9O1xuICAgIHRoaXMuY29tcGlsZVN0YWNrID0gW107XG4gICAgdGhpcy5pbmxpbmVTdGFjayA9IFtdO1xuXG4gICAgdGhpcy5jb21waWxlQ2hpbGRyZW4oZW52aXJvbm1lbnQsIG9wdGlvbnMpO1xuXG4gICAgdmFyIG9wY29kZXMgPSBlbnZpcm9ubWVudC5vcGNvZGVzLCBvcGNvZGU7XG5cbiAgICB0aGlzLmkgPSAwO1xuXG4gICAgZm9yKHZhciBsPW9wY29kZXMubGVuZ3RoOyB0aGlzLmk8bDsgdGhpcy5pKyspIHtcbiAgICAgIG9wY29kZSA9IG9wY29kZXNbdGhpcy5pXTtcblxuICAgICAgaWYob3Bjb2RlLm9wY29kZSA9PT0gJ0RFQ0xBUkUnKSB7XG4gICAgICAgIHRoaXNbb3Bjb2RlLm5hbWVdID0gb3Bjb2RlLnZhbHVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpc1tvcGNvZGUub3Bjb2RlXS5hcHBseSh0aGlzLCBvcGNvZGUuYXJncyk7XG4gICAgICB9XG5cbiAgICAgIC8vIFJlc2V0IHRoZSBzdHJpcE5leHQgZmxhZyBpZiBpdCB3YXMgbm90IHNldCBieSB0aGlzIG9wZXJhdGlvbi5cbiAgICAgIGlmIChvcGNvZGUub3Bjb2RlICE9PSB0aGlzLnN0cmlwTmV4dCkge1xuICAgICAgICB0aGlzLnN0cmlwTmV4dCA9IGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEZsdXNoIGFueSB0cmFpbGluZyBjb250ZW50IHRoYXQgbWlnaHQgYmUgcGVuZGluZy5cbiAgICB0aGlzLnB1c2hTb3VyY2UoJycpO1xuXG4gICAgcmV0dXJuIHRoaXMuY3JlYXRlRnVuY3Rpb25Db250ZXh0KGFzT2JqZWN0KTtcbiAgfSxcblxuICBwcmVhbWJsZTogZnVuY3Rpb24oKSB7XG4gICAgdmFyIG91dCA9IFtdO1xuXG4gICAgaWYgKCF0aGlzLmlzQ2hpbGQpIHtcbiAgICAgIHZhciBuYW1lc3BhY2UgPSB0aGlzLm5hbWVzcGFjZTtcblxuICAgICAgdmFyIGNvcGllcyA9IFwiaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgXCIgKyBuYW1lc3BhY2UgKyBcIi5oZWxwZXJzKTtcIjtcbiAgICAgIGlmICh0aGlzLmVudmlyb25tZW50LnVzZVBhcnRpYWwpIHsgY29waWVzID0gY29waWVzICsgXCIgcGFydGlhbHMgPSB0aGlzLm1lcmdlKHBhcnRpYWxzLCBcIiArIG5hbWVzcGFjZSArIFwiLnBhcnRpYWxzKTtcIjsgfVxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5kYXRhKSB7IGNvcGllcyA9IGNvcGllcyArIFwiIGRhdGEgPSBkYXRhIHx8IHt9O1wiOyB9XG4gICAgICBvdXQucHVzaChjb3BpZXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQucHVzaCgnJyk7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLmVudmlyb25tZW50LmlzU2ltcGxlKSB7XG4gICAgICBvdXQucHVzaChcIiwgYnVmZmVyID0gXCIgKyB0aGlzLmluaXRpYWxpemVCdWZmZXIoKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dC5wdXNoKFwiXCIpO1xuICAgIH1cblxuICAgIC8vIHRyYWNrIHRoZSBsYXN0IGNvbnRleHQgcHVzaGVkIGludG8gcGxhY2UgdG8gYWxsb3cgc2tpcHBpbmcgdGhlXG4gICAgLy8gZ2V0Q29udGV4dCBvcGNvZGUgd2hlbiBpdCB3b3VsZCBiZSBhIG5vb3BcbiAgICB0aGlzLmxhc3RDb250ZXh0ID0gMDtcbiAgICB0aGlzLnNvdXJjZSA9IG91dDtcbiAgfSxcblxuICBjcmVhdGVGdW5jdGlvbkNvbnRleHQ6IGZ1bmN0aW9uKGFzT2JqZWN0KSB7XG4gICAgdmFyIGxvY2FscyA9IHRoaXMuc3RhY2tWYXJzLmNvbmNhdCh0aGlzLnJlZ2lzdGVycy5saXN0KTtcblxuICAgIGlmKGxvY2Fscy5sZW5ndGggPiAwKSB7XG4gICAgICB0aGlzLnNvdXJjZVsxXSA9IHRoaXMuc291cmNlWzFdICsgXCIsIFwiICsgbG9jYWxzLmpvaW4oXCIsIFwiKTtcbiAgICB9XG5cbiAgICAvLyBHZW5lcmF0ZSBtaW5pbWl6ZXIgYWxpYXMgbWFwcGluZ3NcbiAgICBpZiAoIXRoaXMuaXNDaGlsZCkge1xuICAgICAgZm9yICh2YXIgYWxpYXMgaW4gdGhpcy5jb250ZXh0LmFsaWFzZXMpIHtcbiAgICAgICAgaWYgKHRoaXMuY29udGV4dC5hbGlhc2VzLmhhc093blByb3BlcnR5KGFsaWFzKSkge1xuICAgICAgICAgIHRoaXMuc291cmNlWzFdID0gdGhpcy5zb3VyY2VbMV0gKyAnLCAnICsgYWxpYXMgKyAnPScgKyB0aGlzLmNvbnRleHQuYWxpYXNlc1thbGlhc107XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy5zb3VyY2VbMV0pIHtcbiAgICAgIHRoaXMuc291cmNlWzFdID0gXCJ2YXIgXCIgKyB0aGlzLnNvdXJjZVsxXS5zdWJzdHJpbmcoMikgKyBcIjtcIjtcbiAgICB9XG5cbiAgICAvLyBNZXJnZSBjaGlsZHJlblxuICAgIGlmICghdGhpcy5pc0NoaWxkKSB7XG4gICAgICB0aGlzLnNvdXJjZVsxXSArPSAnXFxuJyArIHRoaXMuY29udGV4dC5wcm9ncmFtcy5qb2luKCdcXG4nKSArICdcXG4nO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5lbnZpcm9ubWVudC5pc1NpbXBsZSkge1xuICAgICAgdGhpcy5wdXNoU291cmNlKFwicmV0dXJuIGJ1ZmZlcjtcIik7XG4gICAgfVxuXG4gICAgdmFyIHBhcmFtcyA9IHRoaXMuaXNDaGlsZCA/IFtcImRlcHRoMFwiLCBcImRhdGFcIl0gOiBbXCJIYW5kbGViYXJzXCIsIFwiZGVwdGgwXCIsIFwiaGVscGVyc1wiLCBcInBhcnRpYWxzXCIsIFwiZGF0YVwiXTtcblxuICAgIGZvcih2YXIgaT0wLCBsPXRoaXMuZW52aXJvbm1lbnQuZGVwdGhzLmxpc3QubGVuZ3RoOyBpPGw7IGkrKykge1xuICAgICAgcGFyYW1zLnB1c2goXCJkZXB0aFwiICsgdGhpcy5lbnZpcm9ubWVudC5kZXB0aHMubGlzdFtpXSk7XG4gICAgfVxuXG4gICAgLy8gUGVyZm9ybSBhIHNlY29uZCBwYXNzIG92ZXIgdGhlIG91dHB1dCB0byBtZXJnZSBjb250ZW50IHdoZW4gcG9zc2libGVcbiAgICB2YXIgc291cmNlID0gdGhpcy5tZXJnZVNvdXJjZSgpO1xuXG4gICAgaWYgKCF0aGlzLmlzQ2hpbGQpIHtcbiAgICAgIHNvdXJjZSA9IHRoaXMuY29tcGlsZXJJbmZvKCkrc291cmNlO1xuICAgIH1cblxuICAgIGlmIChhc09iamVjdCkge1xuICAgICAgcGFyYW1zLnB1c2goc291cmNlKTtcblxuICAgICAgcmV0dXJuIEZ1bmN0aW9uLmFwcGx5KHRoaXMsIHBhcmFtcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBmdW5jdGlvblNvdXJjZSA9ICdmdW5jdGlvbiAnICsgKHRoaXMubmFtZSB8fCAnJykgKyAnKCcgKyBwYXJhbXMuam9pbignLCcpICsgJykge1xcbiAgJyArIHNvdXJjZSArICd9JztcbiAgICAgIGxvZygnZGVidWcnLCBmdW5jdGlvblNvdXJjZSArIFwiXFxuXFxuXCIpO1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uU291cmNlO1xuICAgIH1cbiAgfSxcbiAgbWVyZ2VTb3VyY2U6IGZ1bmN0aW9uKCkge1xuICAgIC8vIFdBUk46IFdlIGFyZSBub3QgaGFuZGxpbmcgdGhlIGNhc2Ugd2hlcmUgYnVmZmVyIGlzIHN0aWxsIHBvcHVsYXRlZCBhcyB0aGUgc291cmNlIHNob3VsZFxuICAgIC8vIG5vdCBoYXZlIGJ1ZmZlciBhcHBlbmQgb3BlcmF0aW9ucyBhcyB0aGVpciBmaW5hbCBhY3Rpb24uXG4gICAgdmFyIHNvdXJjZSA9ICcnLFxuICAgICAgICBidWZmZXI7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHRoaXMuc291cmNlLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICB2YXIgbGluZSA9IHRoaXMuc291cmNlW2ldO1xuICAgICAgaWYgKGxpbmUuYXBwZW5kVG9CdWZmZXIpIHtcbiAgICAgICAgaWYgKGJ1ZmZlcikge1xuICAgICAgICAgIGJ1ZmZlciA9IGJ1ZmZlciArICdcXG4gICAgKyAnICsgbGluZS5jb250ZW50O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGJ1ZmZlciA9IGxpbmUuY29udGVudDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGJ1ZmZlcikge1xuICAgICAgICAgIHNvdXJjZSArPSAnYnVmZmVyICs9ICcgKyBidWZmZXIgKyAnO1xcbiAgJztcbiAgICAgICAgICBidWZmZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgc291cmNlICs9IGxpbmUgKyAnXFxuICAnO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc291cmNlO1xuICB9LFxuXG4gIC8vIFtibG9ja1ZhbHVlXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiBoYXNoLCBpbnZlcnNlLCBwcm9ncmFtLCB2YWx1ZVxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IHJldHVybiB2YWx1ZSBvZiBibG9ja0hlbHBlck1pc3NpbmdcbiAgLy9cbiAgLy8gVGhlIHB1cnBvc2Ugb2YgdGhpcyBvcGNvZGUgaXMgdG8gdGFrZSBhIGJsb2NrIG9mIHRoZSBmb3JtXG4gIC8vIGB7eyNmb299fS4uLnt7L2Zvb319YCwgcmVzb2x2ZSB0aGUgdmFsdWUgb2YgYGZvb2AsIGFuZFxuICAvLyByZXBsYWNlIGl0IG9uIHRoZSBzdGFjayB3aXRoIHRoZSByZXN1bHQgb2YgcHJvcGVybHlcbiAgLy8gaW52b2tpbmcgYmxvY2tIZWxwZXJNaXNzaW5nLlxuICBibG9ja1ZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmNvbnRleHQuYWxpYXNlcy5ibG9ja0hlbHBlck1pc3NpbmcgPSAnaGVscGVycy5ibG9ja0hlbHBlck1pc3NpbmcnO1xuXG4gICAgdmFyIHBhcmFtcyA9IFtcImRlcHRoMFwiXTtcbiAgICB0aGlzLnNldHVwUGFyYW1zKDAsIHBhcmFtcyk7XG5cbiAgICB0aGlzLnJlcGxhY2VTdGFjayhmdW5jdGlvbihjdXJyZW50KSB7XG4gICAgICBwYXJhbXMuc3BsaWNlKDEsIDAsIGN1cnJlbnQpO1xuICAgICAgcmV0dXJuIFwiYmxvY2tIZWxwZXJNaXNzaW5nLmNhbGwoXCIgKyBwYXJhbXMuam9pbihcIiwgXCIpICsgXCIpXCI7XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8gW2FtYmlndW91c0Jsb2NrVmFsdWVdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IGhhc2gsIGludmVyc2UsIHByb2dyYW0sIHZhbHVlXG4gIC8vIENvbXBpbGVyIHZhbHVlLCBiZWZvcmU6IGxhc3RIZWxwZXI9dmFsdWUgb2YgbGFzdCBmb3VuZCBoZWxwZXIsIGlmIGFueVxuICAvLyBPbiBzdGFjaywgYWZ0ZXIsIGlmIG5vIGxhc3RIZWxwZXI6IHNhbWUgYXMgW2Jsb2NrVmFsdWVdXG4gIC8vIE9uIHN0YWNrLCBhZnRlciwgaWYgbGFzdEhlbHBlcjogdmFsdWVcbiAgYW1iaWd1b3VzQmxvY2tWYWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5jb250ZXh0LmFsaWFzZXMuYmxvY2tIZWxwZXJNaXNzaW5nID0gJ2hlbHBlcnMuYmxvY2tIZWxwZXJNaXNzaW5nJztcblxuICAgIHZhciBwYXJhbXMgPSBbXCJkZXB0aDBcIl07XG4gICAgdGhpcy5zZXR1cFBhcmFtcygwLCBwYXJhbXMpO1xuXG4gICAgdmFyIGN1cnJlbnQgPSB0aGlzLnRvcFN0YWNrKCk7XG4gICAgcGFyYW1zLnNwbGljZSgxLCAwLCBjdXJyZW50KTtcblxuICAgIC8vIFVzZSB0aGUgb3B0aW9ucyB2YWx1ZSBnZW5lcmF0ZWQgZnJvbSB0aGUgaW52b2NhdGlvblxuICAgIHBhcmFtc1twYXJhbXMubGVuZ3RoLTFdID0gJ29wdGlvbnMnO1xuXG4gICAgdGhpcy5wdXNoU291cmNlKFwiaWYgKCFcIiArIHRoaXMubGFzdEhlbHBlciArIFwiKSB7IFwiICsgY3VycmVudCArIFwiID0gYmxvY2tIZWxwZXJNaXNzaW5nLmNhbGwoXCIgKyBwYXJhbXMuam9pbihcIiwgXCIpICsgXCIpOyB9XCIpO1xuICB9LFxuXG4gIC8vIFthcHBlbmRDb250ZW50XVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiAuLi5cbiAgLy9cbiAgLy8gQXBwZW5kcyB0aGUgc3RyaW5nIHZhbHVlIG9mIGBjb250ZW50YCB0byB0aGUgY3VycmVudCBidWZmZXJcbiAgYXBwZW5kQ29udGVudDogZnVuY3Rpb24oY29udGVudCkge1xuICAgIGlmICh0aGlzLnBlbmRpbmdDb250ZW50KSB7XG4gICAgICBjb250ZW50ID0gdGhpcy5wZW5kaW5nQ29udGVudCArIGNvbnRlbnQ7XG4gICAgfVxuICAgIGlmICh0aGlzLnN0cmlwTmV4dCkge1xuICAgICAgY29udGVudCA9IGNvbnRlbnQucmVwbGFjZSgvXlxccysvLCAnJyk7XG4gICAgfVxuXG4gICAgdGhpcy5wZW5kaW5nQ29udGVudCA9IGNvbnRlbnQ7XG4gIH0sXG5cbiAgLy8gW3N0cmlwXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiAuLi5cbiAgLy9cbiAgLy8gUmVtb3ZlcyBhbnkgdHJhaWxpbmcgd2hpdGVzcGFjZSBmcm9tIHRoZSBwcmlvciBjb250ZW50IG5vZGUgYW5kIGZsYWdzXG4gIC8vIHRoZSBuZXh0IG9wZXJhdGlvbiBmb3Igc3RyaXBwaW5nIGlmIGl0IGlzIGEgY29udGVudCBub2RlLlxuICBzdHJpcDogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMucGVuZGluZ0NvbnRlbnQpIHtcbiAgICAgIHRoaXMucGVuZGluZ0NvbnRlbnQgPSB0aGlzLnBlbmRpbmdDb250ZW50LnJlcGxhY2UoL1xccyskLywgJycpO1xuICAgIH1cbiAgICB0aGlzLnN0cmlwTmV4dCA9ICdzdHJpcCc7XG4gIH0sXG5cbiAgLy8gW2FwcGVuZF1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogdmFsdWUsIC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IC4uLlxuICAvL1xuICAvLyBDb2VyY2VzIGB2YWx1ZWAgdG8gYSBTdHJpbmcgYW5kIGFwcGVuZHMgaXQgdG8gdGhlIGN1cnJlbnQgYnVmZmVyLlxuICAvL1xuICAvLyBJZiBgdmFsdWVgIGlzIHRydXRoeSwgb3IgMCwgaXQgaXMgY29lcmNlZCBpbnRvIGEgc3RyaW5nIGFuZCBhcHBlbmRlZFxuICAvLyBPdGhlcndpc2UsIHRoZSBlbXB0eSBzdHJpbmcgaXMgYXBwZW5kZWRcbiAgYXBwZW5kOiBmdW5jdGlvbigpIHtcbiAgICAvLyBGb3JjZSBhbnl0aGluZyB0aGF0IGlzIGlubGluZWQgb250byB0aGUgc3RhY2sgc28gd2UgZG9uJ3QgaGF2ZSBkdXBsaWNhdGlvblxuICAgIC8vIHdoZW4gd2UgZXhhbWluZSBsb2NhbFxuICAgIHRoaXMuZmx1c2hJbmxpbmUoKTtcbiAgICB2YXIgbG9jYWwgPSB0aGlzLnBvcFN0YWNrKCk7XG4gICAgdGhpcy5wdXNoU291cmNlKFwiaWYoXCIgKyBsb2NhbCArIFwiIHx8IFwiICsgbG9jYWwgKyBcIiA9PT0gMCkgeyBcIiArIHRoaXMuYXBwZW5kVG9CdWZmZXIobG9jYWwpICsgXCIgfVwiKTtcbiAgICBpZiAodGhpcy5lbnZpcm9ubWVudC5pc1NpbXBsZSkge1xuICAgICAgdGhpcy5wdXNoU291cmNlKFwiZWxzZSB7IFwiICsgdGhpcy5hcHBlbmRUb0J1ZmZlcihcIicnXCIpICsgXCIgfVwiKTtcbiAgICB9XG4gIH0sXG5cbiAgLy8gW2FwcGVuZEVzY2FwZWRdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IHZhbHVlLCAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiAuLi5cbiAgLy9cbiAgLy8gRXNjYXBlIGB2YWx1ZWAgYW5kIGFwcGVuZCBpdCB0byB0aGUgYnVmZmVyXG4gIGFwcGVuZEVzY2FwZWQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuY29udGV4dC5hbGlhc2VzLmVzY2FwZUV4cHJlc3Npb24gPSAndGhpcy5lc2NhcGVFeHByZXNzaW9uJztcblxuICAgIHRoaXMucHVzaFNvdXJjZSh0aGlzLmFwcGVuZFRvQnVmZmVyKFwiZXNjYXBlRXhwcmVzc2lvbihcIiArIHRoaXMucG9wU3RhY2soKSArIFwiKVwiKSk7XG4gIH0sXG5cbiAgLy8gW2dldENvbnRleHRdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IC4uLlxuICAvLyBDb21waWxlciB2YWx1ZSwgYWZ0ZXI6IGxhc3RDb250ZXh0PWRlcHRoXG4gIC8vXG4gIC8vIFNldCB0aGUgdmFsdWUgb2YgdGhlIGBsYXN0Q29udGV4dGAgY29tcGlsZXIgdmFsdWUgdG8gdGhlIGRlcHRoXG4gIGdldENvbnRleHQ6IGZ1bmN0aW9uKGRlcHRoKSB7XG4gICAgaWYodGhpcy5sYXN0Q29udGV4dCAhPT0gZGVwdGgpIHtcbiAgICAgIHRoaXMubGFzdENvbnRleHQgPSBkZXB0aDtcbiAgICB9XG4gIH0sXG5cbiAgLy8gW2xvb2t1cE9uQ29udGV4dF1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogY3VycmVudENvbnRleHRbbmFtZV0sIC4uLlxuICAvL1xuICAvLyBMb29rcyB1cCB0aGUgdmFsdWUgb2YgYG5hbWVgIG9uIHRoZSBjdXJyZW50IGNvbnRleHQgYW5kIHB1c2hlc1xuICAvLyBpdCBvbnRvIHRoZSBzdGFjay5cbiAgbG9va3VwT25Db250ZXh0OiBmdW5jdGlvbihuYW1lKSB7XG4gICAgdGhpcy5wdXNoKHRoaXMubmFtZUxvb2t1cCgnZGVwdGgnICsgdGhpcy5sYXN0Q29udGV4dCwgbmFtZSwgJ2NvbnRleHQnKSk7XG4gIH0sXG5cbiAgLy8gW3B1c2hDb250ZXh0XVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiBjdXJyZW50Q29udGV4dCwgLi4uXG4gIC8vXG4gIC8vIFB1c2hlcyB0aGUgdmFsdWUgb2YgdGhlIGN1cnJlbnQgY29udGV4dCBvbnRvIHRoZSBzdGFjay5cbiAgcHVzaENvbnRleHQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucHVzaFN0YWNrTGl0ZXJhbCgnZGVwdGgnICsgdGhpcy5sYXN0Q29udGV4dCk7XG4gIH0sXG5cbiAgLy8gW3Jlc29sdmVQb3NzaWJsZUxhbWJkYV1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogdmFsdWUsIC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IHJlc29sdmVkIHZhbHVlLCAuLi5cbiAgLy9cbiAgLy8gSWYgdGhlIGB2YWx1ZWAgaXMgYSBsYW1iZGEsIHJlcGxhY2UgaXQgb24gdGhlIHN0YWNrIGJ5XG4gIC8vIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIGxhbWJkYVxuICByZXNvbHZlUG9zc2libGVMYW1iZGE6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuY29udGV4dC5hbGlhc2VzLmZ1bmN0aW9uVHlwZSA9ICdcImZ1bmN0aW9uXCInO1xuXG4gICAgdGhpcy5yZXBsYWNlU3RhY2soZnVuY3Rpb24oY3VycmVudCkge1xuICAgICAgcmV0dXJuIFwidHlwZW9mIFwiICsgY3VycmVudCArIFwiID09PSBmdW5jdGlvblR5cGUgPyBcIiArIGN1cnJlbnQgKyBcIi5hcHBseShkZXB0aDApIDogXCIgKyBjdXJyZW50O1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIFtsb29rdXBdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IHZhbHVlLCAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiB2YWx1ZVtuYW1lXSwgLi4uXG4gIC8vXG4gIC8vIFJlcGxhY2UgdGhlIHZhbHVlIG9uIHRoZSBzdGFjayB3aXRoIHRoZSByZXN1bHQgb2YgbG9va2luZ1xuICAvLyB1cCBgbmFtZWAgb24gYHZhbHVlYFxuICBsb29rdXA6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB0aGlzLnJlcGxhY2VTdGFjayhmdW5jdGlvbihjdXJyZW50KSB7XG4gICAgICByZXR1cm4gY3VycmVudCArIFwiID09IG51bGwgfHwgXCIgKyBjdXJyZW50ICsgXCIgPT09IGZhbHNlID8gXCIgKyBjdXJyZW50ICsgXCIgOiBcIiArIHRoaXMubmFtZUxvb2t1cChjdXJyZW50LCBuYW1lLCAnY29udGV4dCcpO1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIFtsb29rdXBEYXRhXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiBkYXRhLCAuLi5cbiAgLy9cbiAgLy8gUHVzaCB0aGUgZGF0YSBsb29rdXAgb3BlcmF0b3JcbiAgbG9va3VwRGF0YTogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5wdXNoKCdkYXRhJyk7XG4gIH0sXG5cbiAgLy8gW3B1c2hTdHJpbmdQYXJhbV1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogc3RyaW5nLCBjdXJyZW50Q29udGV4dCwgLi4uXG4gIC8vXG4gIC8vIFRoaXMgb3Bjb2RlIGlzIGRlc2lnbmVkIGZvciB1c2UgaW4gc3RyaW5nIG1vZGUsIHdoaWNoXG4gIC8vIHByb3ZpZGVzIHRoZSBzdHJpbmcgdmFsdWUgb2YgYSBwYXJhbWV0ZXIgYWxvbmcgd2l0aCBpdHNcbiAgLy8gZGVwdGggcmF0aGVyIHRoYW4gcmVzb2x2aW5nIGl0IGltbWVkaWF0ZWx5LlxuICBwdXNoU3RyaW5nUGFyYW06IGZ1bmN0aW9uKHN0cmluZywgdHlwZSkge1xuICAgIHRoaXMucHVzaFN0YWNrTGl0ZXJhbCgnZGVwdGgnICsgdGhpcy5sYXN0Q29udGV4dCk7XG5cbiAgICB0aGlzLnB1c2hTdHJpbmcodHlwZSk7XG5cbiAgICBpZiAodHlwZW9mIHN0cmluZyA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRoaXMucHVzaFN0cmluZyhzdHJpbmcpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnB1c2hTdGFja0xpdGVyYWwoc3RyaW5nKTtcbiAgICB9XG4gIH0sXG5cbiAgZW1wdHlIYXNoOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnB1c2hTdGFja0xpdGVyYWwoJ3t9Jyk7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmluZ1BhcmFtcykge1xuICAgICAgdGhpcy5yZWdpc3RlcignaGFzaFR5cGVzJywgJ3t9Jyk7XG4gICAgICB0aGlzLnJlZ2lzdGVyKCdoYXNoQ29udGV4dHMnLCAne30nKTtcbiAgICB9XG4gIH0sXG4gIHB1c2hIYXNoOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmhhc2ggPSB7dmFsdWVzOiBbXSwgdHlwZXM6IFtdLCBjb250ZXh0czogW119O1xuICB9LFxuICBwb3BIYXNoOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgaGFzaCA9IHRoaXMuaGFzaDtcbiAgICB0aGlzLmhhc2ggPSB1bmRlZmluZWQ7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmluZ1BhcmFtcykge1xuICAgICAgdGhpcy5yZWdpc3RlcignaGFzaENvbnRleHRzJywgJ3snICsgaGFzaC5jb250ZXh0cy5qb2luKCcsJykgKyAnfScpO1xuICAgICAgdGhpcy5yZWdpc3RlcignaGFzaFR5cGVzJywgJ3snICsgaGFzaC50eXBlcy5qb2luKCcsJykgKyAnfScpO1xuICAgIH1cbiAgICB0aGlzLnB1c2goJ3tcXG4gICAgJyArIGhhc2gudmFsdWVzLmpvaW4oJyxcXG4gICAgJykgKyAnXFxuICB9Jyk7XG4gIH0sXG5cbiAgLy8gW3B1c2hTdHJpbmddXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IHF1b3RlZFN0cmluZyhzdHJpbmcpLCAuLi5cbiAgLy9cbiAgLy8gUHVzaCBhIHF1b3RlZCB2ZXJzaW9uIG9mIGBzdHJpbmdgIG9udG8gdGhlIHN0YWNrXG4gIHB1c2hTdHJpbmc6IGZ1bmN0aW9uKHN0cmluZykge1xuICAgIHRoaXMucHVzaFN0YWNrTGl0ZXJhbCh0aGlzLnF1b3RlZFN0cmluZyhzdHJpbmcpKTtcbiAgfSxcblxuICAvLyBbcHVzaF1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogZXhwciwgLi4uXG4gIC8vXG4gIC8vIFB1c2ggYW4gZXhwcmVzc2lvbiBvbnRvIHRoZSBzdGFja1xuICBwdXNoOiBmdW5jdGlvbihleHByKSB7XG4gICAgdGhpcy5pbmxpbmVTdGFjay5wdXNoKGV4cHIpO1xuICAgIHJldHVybiBleHByO1xuICB9LFxuXG4gIC8vIFtwdXNoTGl0ZXJhbF1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogdmFsdWUsIC4uLlxuICAvL1xuICAvLyBQdXNoZXMgYSB2YWx1ZSBvbnRvIHRoZSBzdGFjay4gVGhpcyBvcGVyYXRpb24gcHJldmVudHNcbiAgLy8gdGhlIGNvbXBpbGVyIGZyb20gY3JlYXRpbmcgYSB0ZW1wb3JhcnkgdmFyaWFibGUgdG8gaG9sZFxuICAvLyBpdC5cbiAgcHVzaExpdGVyYWw6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgdGhpcy5wdXNoU3RhY2tMaXRlcmFsKHZhbHVlKTtcbiAgfSxcblxuICAvLyBbcHVzaFByb2dyYW1dXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IHByb2dyYW0oZ3VpZCksIC4uLlxuICAvL1xuICAvLyBQdXNoIGEgcHJvZ3JhbSBleHByZXNzaW9uIG9udG8gdGhlIHN0YWNrLiBUaGlzIHRha2VzXG4gIC8vIGEgY29tcGlsZS10aW1lIGd1aWQgYW5kIGNvbnZlcnRzIGl0IGludG8gYSBydW50aW1lLWFjY2Vzc2libGVcbiAgLy8gZXhwcmVzc2lvbi5cbiAgcHVzaFByb2dyYW06IGZ1bmN0aW9uKGd1aWQpIHtcbiAgICBpZiAoZ3VpZCAhPSBudWxsKSB7XG4gICAgICB0aGlzLnB1c2hTdGFja0xpdGVyYWwodGhpcy5wcm9ncmFtRXhwcmVzc2lvbihndWlkKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucHVzaFN0YWNrTGl0ZXJhbChudWxsKTtcbiAgICB9XG4gIH0sXG5cbiAgLy8gW2ludm9rZUhlbHBlcl1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogaGFzaCwgaW52ZXJzZSwgcHJvZ3JhbSwgcGFyYW1zLi4uLCAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiByZXN1bHQgb2YgaGVscGVyIGludm9jYXRpb25cbiAgLy9cbiAgLy8gUG9wcyBvZmYgdGhlIGhlbHBlcidzIHBhcmFtZXRlcnMsIGludm9rZXMgdGhlIGhlbHBlcixcbiAgLy8gYW5kIHB1c2hlcyB0aGUgaGVscGVyJ3MgcmV0dXJuIHZhbHVlIG9udG8gdGhlIHN0YWNrLlxuICAvL1xuICAvLyBJZiB0aGUgaGVscGVyIGlzIG5vdCBmb3VuZCwgYGhlbHBlck1pc3NpbmdgIGlzIGNhbGxlZC5cbiAgaW52b2tlSGVscGVyOiBmdW5jdGlvbihwYXJhbVNpemUsIG5hbWUpIHtcbiAgICB0aGlzLmNvbnRleHQuYWxpYXNlcy5oZWxwZXJNaXNzaW5nID0gJ2hlbHBlcnMuaGVscGVyTWlzc2luZyc7XG5cbiAgICB2YXIgaGVscGVyID0gdGhpcy5sYXN0SGVscGVyID0gdGhpcy5zZXR1cEhlbHBlcihwYXJhbVNpemUsIG5hbWUsIHRydWUpO1xuICAgIHZhciBub25IZWxwZXIgPSB0aGlzLm5hbWVMb29rdXAoJ2RlcHRoJyArIHRoaXMubGFzdENvbnRleHQsIG5hbWUsICdjb250ZXh0Jyk7XG5cbiAgICB0aGlzLnB1c2goaGVscGVyLm5hbWUgKyAnIHx8ICcgKyBub25IZWxwZXIpO1xuICAgIHRoaXMucmVwbGFjZVN0YWNrKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIHJldHVybiBuYW1lICsgJyA/ICcgKyBuYW1lICsgJy5jYWxsKCcgK1xuICAgICAgICAgIGhlbHBlci5jYWxsUGFyYW1zICsgXCIpIFwiICsgXCI6IGhlbHBlck1pc3NpbmcuY2FsbChcIiArXG4gICAgICAgICAgaGVscGVyLmhlbHBlck1pc3NpbmdQYXJhbXMgKyBcIilcIjtcbiAgICB9KTtcbiAgfSxcblxuICAvLyBbaW52b2tlS25vd25IZWxwZXJdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IGhhc2gsIGludmVyc2UsIHByb2dyYW0sIHBhcmFtcy4uLiwgLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogcmVzdWx0IG9mIGhlbHBlciBpbnZvY2F0aW9uXG4gIC8vXG4gIC8vIFRoaXMgb3BlcmF0aW9uIGlzIHVzZWQgd2hlbiB0aGUgaGVscGVyIGlzIGtub3duIHRvIGV4aXN0LFxuICAvLyBzbyBhIGBoZWxwZXJNaXNzaW5nYCBmYWxsYmFjayBpcyBub3QgcmVxdWlyZWQuXG4gIGludm9rZUtub3duSGVscGVyOiBmdW5jdGlvbihwYXJhbVNpemUsIG5hbWUpIHtcbiAgICB2YXIgaGVscGVyID0gdGhpcy5zZXR1cEhlbHBlcihwYXJhbVNpemUsIG5hbWUpO1xuICAgIHRoaXMucHVzaChoZWxwZXIubmFtZSArIFwiLmNhbGwoXCIgKyBoZWxwZXIuY2FsbFBhcmFtcyArIFwiKVwiKTtcbiAgfSxcblxuICAvLyBbaW52b2tlQW1iaWd1b3VzXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiBoYXNoLCBpbnZlcnNlLCBwcm9ncmFtLCBwYXJhbXMuLi4sIC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IHJlc3VsdCBvZiBkaXNhbWJpZ3VhdGlvblxuICAvL1xuICAvLyBUaGlzIG9wZXJhdGlvbiBpcyB1c2VkIHdoZW4gYW4gZXhwcmVzc2lvbiBsaWtlIGB7e2Zvb319YFxuICAvLyBpcyBwcm92aWRlZCwgYnV0IHdlIGRvbid0IGtub3cgYXQgY29tcGlsZS10aW1lIHdoZXRoZXIgaXRcbiAgLy8gaXMgYSBoZWxwZXIgb3IgYSBwYXRoLlxuICAvL1xuICAvLyBUaGlzIG9wZXJhdGlvbiBlbWl0cyBtb3JlIGNvZGUgdGhhbiB0aGUgb3RoZXIgb3B0aW9ucyxcbiAgLy8gYW5kIGNhbiBiZSBhdm9pZGVkIGJ5IHBhc3NpbmcgdGhlIGBrbm93bkhlbHBlcnNgIGFuZFxuICAvLyBga25vd25IZWxwZXJzT25seWAgZmxhZ3MgYXQgY29tcGlsZS10aW1lLlxuICBpbnZva2VBbWJpZ3VvdXM6IGZ1bmN0aW9uKG5hbWUsIGhlbHBlckNhbGwpIHtcbiAgICB0aGlzLmNvbnRleHQuYWxpYXNlcy5mdW5jdGlvblR5cGUgPSAnXCJmdW5jdGlvblwiJztcblxuICAgIHRoaXMucHVzaFN0YWNrTGl0ZXJhbCgne30nKTsgICAgLy8gSGFzaCB2YWx1ZVxuICAgIHZhciBoZWxwZXIgPSB0aGlzLnNldHVwSGVscGVyKDAsIG5hbWUsIGhlbHBlckNhbGwpO1xuXG4gICAgdmFyIGhlbHBlck5hbWUgPSB0aGlzLmxhc3RIZWxwZXIgPSB0aGlzLm5hbWVMb29rdXAoJ2hlbHBlcnMnLCBuYW1lLCAnaGVscGVyJyk7XG5cbiAgICB2YXIgbm9uSGVscGVyID0gdGhpcy5uYW1lTG9va3VwKCdkZXB0aCcgKyB0aGlzLmxhc3RDb250ZXh0LCBuYW1lLCAnY29udGV4dCcpO1xuICAgIHZhciBuZXh0U3RhY2sgPSB0aGlzLm5leHRTdGFjaygpO1xuXG4gICAgdGhpcy5wdXNoU291cmNlKCdpZiAoJyArIG5leHRTdGFjayArICcgPSAnICsgaGVscGVyTmFtZSArICcpIHsgJyArIG5leHRTdGFjayArICcgPSAnICsgbmV4dFN0YWNrICsgJy5jYWxsKCcgKyBoZWxwZXIuY2FsbFBhcmFtcyArICcpOyB9Jyk7XG4gICAgdGhpcy5wdXNoU291cmNlKCdlbHNlIHsgJyArIG5leHRTdGFjayArICcgPSAnICsgbm9uSGVscGVyICsgJzsgJyArIG5leHRTdGFjayArICcgPSB0eXBlb2YgJyArIG5leHRTdGFjayArICcgPT09IGZ1bmN0aW9uVHlwZSA/ICcgKyBuZXh0U3RhY2sgKyAnLmNhbGwoJyArIGhlbHBlci5jYWxsUGFyYW1zICsgJykgOiAnICsgbmV4dFN0YWNrICsgJzsgfScpO1xuICB9LFxuXG4gIC8vIFtpbnZva2VQYXJ0aWFsXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiBjb250ZXh0LCAuLi5cbiAgLy8gT24gc3RhY2sgYWZ0ZXI6IHJlc3VsdCBvZiBwYXJ0aWFsIGludm9jYXRpb25cbiAgLy9cbiAgLy8gVGhpcyBvcGVyYXRpb24gcG9wcyBvZmYgYSBjb250ZXh0LCBpbnZva2VzIGEgcGFydGlhbCB3aXRoIHRoYXQgY29udGV4dCxcbiAgLy8gYW5kIHB1c2hlcyB0aGUgcmVzdWx0IG9mIHRoZSBpbnZvY2F0aW9uIGJhY2suXG4gIGludm9rZVBhcnRpYWw6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgcGFyYW1zID0gW3RoaXMubmFtZUxvb2t1cCgncGFydGlhbHMnLCBuYW1lLCAncGFydGlhbCcpLCBcIidcIiArIG5hbWUgKyBcIidcIiwgdGhpcy5wb3BTdGFjaygpLCBcImhlbHBlcnNcIiwgXCJwYXJ0aWFsc1wiXTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuZGF0YSkge1xuICAgICAgcGFyYW1zLnB1c2goXCJkYXRhXCIpO1xuICAgIH1cblxuICAgIHRoaXMuY29udGV4dC5hbGlhc2VzLnNlbGYgPSBcInRoaXNcIjtcbiAgICB0aGlzLnB1c2goXCJzZWxmLmludm9rZVBhcnRpYWwoXCIgKyBwYXJhbXMuam9pbihcIiwgXCIpICsgXCIpXCIpO1xuICB9LFxuXG4gIC8vIFthc3NpZ25Ub0hhc2hdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IHZhbHVlLCBoYXNoLCAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiBoYXNoLCAuLi5cbiAgLy9cbiAgLy8gUG9wcyBhIHZhbHVlIGFuZCBoYXNoIG9mZiB0aGUgc3RhY2ssIGFzc2lnbnMgYGhhc2hba2V5XSA9IHZhbHVlYFxuICAvLyBhbmQgcHVzaGVzIHRoZSBoYXNoIGJhY2sgb250byB0aGUgc3RhY2suXG4gIGFzc2lnblRvSGFzaDogZnVuY3Rpb24oa2V5KSB7XG4gICAgdmFyIHZhbHVlID0gdGhpcy5wb3BTdGFjaygpLFxuICAgICAgICBjb250ZXh0LFxuICAgICAgICB0eXBlO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpbmdQYXJhbXMpIHtcbiAgICAgIHR5cGUgPSB0aGlzLnBvcFN0YWNrKCk7XG4gICAgICBjb250ZXh0ID0gdGhpcy5wb3BTdGFjaygpO1xuICAgIH1cblxuICAgIHZhciBoYXNoID0gdGhpcy5oYXNoO1xuICAgIGlmIChjb250ZXh0KSB7XG4gICAgICBoYXNoLmNvbnRleHRzLnB1c2goXCInXCIgKyBrZXkgKyBcIic6IFwiICsgY29udGV4dCk7XG4gICAgfVxuICAgIGlmICh0eXBlKSB7XG4gICAgICBoYXNoLnR5cGVzLnB1c2goXCInXCIgKyBrZXkgKyBcIic6IFwiICsgdHlwZSk7XG4gICAgfVxuICAgIGhhc2gudmFsdWVzLnB1c2goXCInXCIgKyBrZXkgKyBcIic6IChcIiArIHZhbHVlICsgXCIpXCIpO1xuICB9LFxuXG4gIC8vIEhFTFBFUlNcblxuICBjb21waWxlcjogSmF2YVNjcmlwdENvbXBpbGVyLFxuXG4gIGNvbXBpbGVDaGlsZHJlbjogZnVuY3Rpb24oZW52aXJvbm1lbnQsIG9wdGlvbnMpIHtcbiAgICB2YXIgY2hpbGRyZW4gPSBlbnZpcm9ubWVudC5jaGlsZHJlbiwgY2hpbGQsIGNvbXBpbGVyO1xuXG4gICAgZm9yKHZhciBpPTAsIGw9Y2hpbGRyZW4ubGVuZ3RoOyBpPGw7IGkrKykge1xuICAgICAgY2hpbGQgPSBjaGlsZHJlbltpXTtcbiAgICAgIGNvbXBpbGVyID0gbmV3IHRoaXMuY29tcGlsZXIoKTtcblxuICAgICAgdmFyIGluZGV4ID0gdGhpcy5tYXRjaEV4aXN0aW5nUHJvZ3JhbShjaGlsZCk7XG5cbiAgICAgIGlmIChpbmRleCA9PSBudWxsKSB7XG4gICAgICAgIHRoaXMuY29udGV4dC5wcm9ncmFtcy5wdXNoKCcnKTsgICAgIC8vIFBsYWNlaG9sZGVyIHRvIHByZXZlbnQgbmFtZSBjb25mbGljdHMgZm9yIG5lc3RlZCBjaGlsZHJlblxuICAgICAgICBpbmRleCA9IHRoaXMuY29udGV4dC5wcm9ncmFtcy5sZW5ndGg7XG4gICAgICAgIGNoaWxkLmluZGV4ID0gaW5kZXg7XG4gICAgICAgIGNoaWxkLm5hbWUgPSAncHJvZ3JhbScgKyBpbmRleDtcbiAgICAgICAgdGhpcy5jb250ZXh0LnByb2dyYW1zW2luZGV4XSA9IGNvbXBpbGVyLmNvbXBpbGUoY2hpbGQsIG9wdGlvbnMsIHRoaXMuY29udGV4dCk7XG4gICAgICAgIHRoaXMuY29udGV4dC5lbnZpcm9ubWVudHNbaW5kZXhdID0gY2hpbGQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjaGlsZC5pbmRleCA9IGluZGV4O1xuICAgICAgICBjaGlsZC5uYW1lID0gJ3Byb2dyYW0nICsgaW5kZXg7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBtYXRjaEV4aXN0aW5nUHJvZ3JhbTogZnVuY3Rpb24oY2hpbGQpIHtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gdGhpcy5jb250ZXh0LmVudmlyb25tZW50cy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgdmFyIGVudmlyb25tZW50ID0gdGhpcy5jb250ZXh0LmVudmlyb25tZW50c1tpXTtcbiAgICAgIGlmIChlbnZpcm9ubWVudCAmJiBlbnZpcm9ubWVudC5lcXVhbHMoY2hpbGQpKSB7XG4gICAgICAgIHJldHVybiBpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBwcm9ncmFtRXhwcmVzc2lvbjogZnVuY3Rpb24oZ3VpZCkge1xuICAgIHRoaXMuY29udGV4dC5hbGlhc2VzLnNlbGYgPSBcInRoaXNcIjtcblxuICAgIGlmKGd1aWQgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIFwic2VsZi5ub29wXCI7XG4gICAgfVxuXG4gICAgdmFyIGNoaWxkID0gdGhpcy5lbnZpcm9ubWVudC5jaGlsZHJlbltndWlkXSxcbiAgICAgICAgZGVwdGhzID0gY2hpbGQuZGVwdGhzLmxpc3QsIGRlcHRoO1xuXG4gICAgdmFyIHByb2dyYW1QYXJhbXMgPSBbY2hpbGQuaW5kZXgsIGNoaWxkLm5hbWUsIFwiZGF0YVwiXTtcblxuICAgIGZvcih2YXIgaT0wLCBsID0gZGVwdGhzLmxlbmd0aDsgaTxsOyBpKyspIHtcbiAgICAgIGRlcHRoID0gZGVwdGhzW2ldO1xuXG4gICAgICBpZihkZXB0aCA9PT0gMSkgeyBwcm9ncmFtUGFyYW1zLnB1c2goXCJkZXB0aDBcIik7IH1cbiAgICAgIGVsc2UgeyBwcm9ncmFtUGFyYW1zLnB1c2goXCJkZXB0aFwiICsgKGRlcHRoIC0gMSkpOyB9XG4gICAgfVxuXG4gICAgcmV0dXJuIChkZXB0aHMubGVuZ3RoID09PSAwID8gXCJzZWxmLnByb2dyYW0oXCIgOiBcInNlbGYucHJvZ3JhbVdpdGhEZXB0aChcIikgKyBwcm9ncmFtUGFyYW1zLmpvaW4oXCIsIFwiKSArIFwiKVwiO1xuICB9LFxuXG4gIHJlZ2lzdGVyOiBmdW5jdGlvbihuYW1lLCB2YWwpIHtcbiAgICB0aGlzLnVzZVJlZ2lzdGVyKG5hbWUpO1xuICAgIHRoaXMucHVzaFNvdXJjZShuYW1lICsgXCIgPSBcIiArIHZhbCArIFwiO1wiKTtcbiAgfSxcblxuICB1c2VSZWdpc3RlcjogZnVuY3Rpb24obmFtZSkge1xuICAgIGlmKCF0aGlzLnJlZ2lzdGVyc1tuYW1lXSkge1xuICAgICAgdGhpcy5yZWdpc3RlcnNbbmFtZV0gPSB0cnVlO1xuICAgICAgdGhpcy5yZWdpc3RlcnMubGlzdC5wdXNoKG5hbWUpO1xuICAgIH1cbiAgfSxcblxuICBwdXNoU3RhY2tMaXRlcmFsOiBmdW5jdGlvbihpdGVtKSB7XG4gICAgcmV0dXJuIHRoaXMucHVzaChuZXcgTGl0ZXJhbChpdGVtKSk7XG4gIH0sXG5cbiAgcHVzaFNvdXJjZTogZnVuY3Rpb24oc291cmNlKSB7XG4gICAgaWYgKHRoaXMucGVuZGluZ0NvbnRlbnQpIHtcbiAgICAgIHRoaXMuc291cmNlLnB1c2godGhpcy5hcHBlbmRUb0J1ZmZlcih0aGlzLnF1b3RlZFN0cmluZyh0aGlzLnBlbmRpbmdDb250ZW50KSkpO1xuICAgICAgdGhpcy5wZW5kaW5nQ29udGVudCA9IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBpZiAoc291cmNlKSB7XG4gICAgICB0aGlzLnNvdXJjZS5wdXNoKHNvdXJjZSk7XG4gICAgfVxuICB9LFxuXG4gIHB1c2hTdGFjazogZnVuY3Rpb24oaXRlbSkge1xuICAgIHRoaXMuZmx1c2hJbmxpbmUoKTtcblxuICAgIHZhciBzdGFjayA9IHRoaXMuaW5jclN0YWNrKCk7XG4gICAgaWYgKGl0ZW0pIHtcbiAgICAgIHRoaXMucHVzaFNvdXJjZShzdGFjayArIFwiID0gXCIgKyBpdGVtICsgXCI7XCIpO1xuICAgIH1cbiAgICB0aGlzLmNvbXBpbGVTdGFjay5wdXNoKHN0YWNrKTtcbiAgICByZXR1cm4gc3RhY2s7XG4gIH0sXG5cbiAgcmVwbGFjZVN0YWNrOiBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIHZhciBwcmVmaXggPSAnJyxcbiAgICAgICAgaW5saW5lID0gdGhpcy5pc0lubGluZSgpLFxuICAgICAgICBzdGFjaztcblxuICAgIC8vIElmIHdlIGFyZSBjdXJyZW50bHkgaW5saW5lIHRoZW4gd2Ugd2FudCB0byBtZXJnZSB0aGUgaW5saW5lIHN0YXRlbWVudCBpbnRvIHRoZVxuICAgIC8vIHJlcGxhY2VtZW50IHN0YXRlbWVudCB2aWEgJywnXG4gICAgaWYgKGlubGluZSkge1xuICAgICAgdmFyIHRvcCA9IHRoaXMucG9wU3RhY2sodHJ1ZSk7XG5cbiAgICAgIGlmICh0b3AgaW5zdGFuY2VvZiBMaXRlcmFsKSB7XG4gICAgICAgIC8vIExpdGVyYWxzIGRvIG5vdCBuZWVkIHRvIGJlIGlubGluZWRcbiAgICAgICAgc3RhY2sgPSB0b3AudmFsdWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBHZXQgb3IgY3JlYXRlIHRoZSBjdXJyZW50IHN0YWNrIG5hbWUgZm9yIHVzZSBieSB0aGUgaW5saW5lXG4gICAgICAgIHZhciBuYW1lID0gdGhpcy5zdGFja1Nsb3QgPyB0aGlzLnRvcFN0YWNrTmFtZSgpIDogdGhpcy5pbmNyU3RhY2soKTtcblxuICAgICAgICBwcmVmaXggPSAnKCcgKyB0aGlzLnB1c2gobmFtZSkgKyAnID0gJyArIHRvcCArICcpLCc7XG4gICAgICAgIHN0YWNrID0gdGhpcy50b3BTdGFjaygpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzdGFjayA9IHRoaXMudG9wU3RhY2soKTtcbiAgICB9XG5cbiAgICB2YXIgaXRlbSA9IGNhbGxiYWNrLmNhbGwodGhpcywgc3RhY2spO1xuXG4gICAgaWYgKGlubGluZSkge1xuICAgICAgaWYgKHRoaXMuaW5saW5lU3RhY2subGVuZ3RoIHx8IHRoaXMuY29tcGlsZVN0YWNrLmxlbmd0aCkge1xuICAgICAgICB0aGlzLnBvcFN0YWNrKCk7XG4gICAgICB9XG4gICAgICB0aGlzLnB1c2goJygnICsgcHJlZml4ICsgaXRlbSArICcpJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFByZXZlbnQgbW9kaWZpY2F0aW9uIG9mIHRoZSBjb250ZXh0IGRlcHRoIHZhcmlhYmxlLiBUaHJvdWdoIHJlcGxhY2VTdGFja1xuICAgICAgaWYgKCEvXnN0YWNrLy50ZXN0KHN0YWNrKSkge1xuICAgICAgICBzdGFjayA9IHRoaXMubmV4dFN0YWNrKCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMucHVzaFNvdXJjZShzdGFjayArIFwiID0gKFwiICsgcHJlZml4ICsgaXRlbSArIFwiKTtcIik7XG4gICAgfVxuICAgIHJldHVybiBzdGFjaztcbiAgfSxcblxuICBuZXh0U3RhY2s6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnB1c2hTdGFjaygpO1xuICB9LFxuXG4gIGluY3JTdGFjazogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zdGFja1Nsb3QrKztcbiAgICBpZih0aGlzLnN0YWNrU2xvdCA+IHRoaXMuc3RhY2tWYXJzLmxlbmd0aCkgeyB0aGlzLnN0YWNrVmFycy5wdXNoKFwic3RhY2tcIiArIHRoaXMuc3RhY2tTbG90KTsgfVxuICAgIHJldHVybiB0aGlzLnRvcFN0YWNrTmFtZSgpO1xuICB9LFxuICB0b3BTdGFja05hbWU6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBcInN0YWNrXCIgKyB0aGlzLnN0YWNrU2xvdDtcbiAgfSxcbiAgZmx1c2hJbmxpbmU6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpbmxpbmVTdGFjayA9IHRoaXMuaW5saW5lU3RhY2s7XG4gICAgaWYgKGlubGluZVN0YWNrLmxlbmd0aCkge1xuICAgICAgdGhpcy5pbmxpbmVTdGFjayA9IFtdO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGlubGluZVN0YWNrLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIHZhciBlbnRyeSA9IGlubGluZVN0YWNrW2ldO1xuICAgICAgICBpZiAoZW50cnkgaW5zdGFuY2VvZiBMaXRlcmFsKSB7XG4gICAgICAgICAgdGhpcy5jb21waWxlU3RhY2sucHVzaChlbnRyeSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5wdXNoU3RhY2soZW50cnkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBpc0lubGluZTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuaW5saW5lU3RhY2subGVuZ3RoO1xuICB9LFxuXG4gIHBvcFN0YWNrOiBmdW5jdGlvbih3cmFwcGVkKSB7XG4gICAgdmFyIGlubGluZSA9IHRoaXMuaXNJbmxpbmUoKSxcbiAgICAgICAgaXRlbSA9IChpbmxpbmUgPyB0aGlzLmlubGluZVN0YWNrIDogdGhpcy5jb21waWxlU3RhY2spLnBvcCgpO1xuXG4gICAgaWYgKCF3cmFwcGVkICYmIChpdGVtIGluc3RhbmNlb2YgTGl0ZXJhbCkpIHtcbiAgICAgIHJldHVybiBpdGVtLnZhbHVlO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoIWlubGluZSkge1xuICAgICAgICB0aGlzLnN0YWNrU2xvdC0tO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGl0ZW07XG4gICAgfVxuICB9LFxuXG4gIHRvcFN0YWNrOiBmdW5jdGlvbih3cmFwcGVkKSB7XG4gICAgdmFyIHN0YWNrID0gKHRoaXMuaXNJbmxpbmUoKSA/IHRoaXMuaW5saW5lU3RhY2sgOiB0aGlzLmNvbXBpbGVTdGFjayksXG4gICAgICAgIGl0ZW0gPSBzdGFja1tzdGFjay5sZW5ndGggLSAxXTtcblxuICAgIGlmICghd3JhcHBlZCAmJiAoaXRlbSBpbnN0YW5jZW9mIExpdGVyYWwpKSB7XG4gICAgICByZXR1cm4gaXRlbS52YWx1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGl0ZW07XG4gICAgfVxuICB9LFxuXG4gIHF1b3RlZFN0cmluZzogZnVuY3Rpb24oc3RyKSB7XG4gICAgcmV0dXJuICdcIicgKyBzdHJcbiAgICAgIC5yZXBsYWNlKC9cXFxcL2csICdcXFxcXFxcXCcpXG4gICAgICAucmVwbGFjZSgvXCIvZywgJ1xcXFxcIicpXG4gICAgICAucmVwbGFjZSgvXFxuL2csICdcXFxcbicpXG4gICAgICAucmVwbGFjZSgvXFxyL2csICdcXFxccicpXG4gICAgICAucmVwbGFjZSgvXFx1MjAyOC9nLCAnXFxcXHUyMDI4JykgICAvLyBQZXIgRWNtYS0yNjIgNy4zICsgNy44LjRcbiAgICAgIC5yZXBsYWNlKC9cXHUyMDI5L2csICdcXFxcdTIwMjknKSArICdcIic7XG4gIH0sXG5cbiAgc2V0dXBIZWxwZXI6IGZ1bmN0aW9uKHBhcmFtU2l6ZSwgbmFtZSwgbWlzc2luZ1BhcmFtcykge1xuICAgIHZhciBwYXJhbXMgPSBbXTtcbiAgICB0aGlzLnNldHVwUGFyYW1zKHBhcmFtU2l6ZSwgcGFyYW1zLCBtaXNzaW5nUGFyYW1zKTtcbiAgICB2YXIgZm91bmRIZWxwZXIgPSB0aGlzLm5hbWVMb29rdXAoJ2hlbHBlcnMnLCBuYW1lLCAnaGVscGVyJyk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgcGFyYW1zOiBwYXJhbXMsXG4gICAgICBuYW1lOiBmb3VuZEhlbHBlcixcbiAgICAgIGNhbGxQYXJhbXM6IFtcImRlcHRoMFwiXS5jb25jYXQocGFyYW1zKS5qb2luKFwiLCBcIiksXG4gICAgICBoZWxwZXJNaXNzaW5nUGFyYW1zOiBtaXNzaW5nUGFyYW1zICYmIFtcImRlcHRoMFwiLCB0aGlzLnF1b3RlZFN0cmluZyhuYW1lKV0uY29uY2F0KHBhcmFtcykuam9pbihcIiwgXCIpXG4gICAgfTtcbiAgfSxcblxuICAvLyB0aGUgcGFyYW1zIGFuZCBjb250ZXh0cyBhcmd1bWVudHMgYXJlIHBhc3NlZCBpbiBhcnJheXNcbiAgLy8gdG8gZmlsbCBpblxuICBzZXR1cFBhcmFtczogZnVuY3Rpb24ocGFyYW1TaXplLCBwYXJhbXMsIHVzZVJlZ2lzdGVyKSB7XG4gICAgdmFyIG9wdGlvbnMgPSBbXSwgY29udGV4dHMgPSBbXSwgdHlwZXMgPSBbXSwgcGFyYW0sIGludmVyc2UsIHByb2dyYW07XG5cbiAgICBvcHRpb25zLnB1c2goXCJoYXNoOlwiICsgdGhpcy5wb3BTdGFjaygpKTtcblxuICAgIGludmVyc2UgPSB0aGlzLnBvcFN0YWNrKCk7XG4gICAgcHJvZ3JhbSA9IHRoaXMucG9wU3RhY2soKTtcblxuICAgIC8vIEF2b2lkIHNldHRpbmcgZm4gYW5kIGludmVyc2UgaWYgbmVpdGhlciBhcmUgc2V0LiBUaGlzIGFsbG93c1xuICAgIC8vIGhlbHBlcnMgdG8gZG8gYSBjaGVjayBmb3IgYGlmIChvcHRpb25zLmZuKWBcbiAgICBpZiAocHJvZ3JhbSB8fCBpbnZlcnNlKSB7XG4gICAgICBpZiAoIXByb2dyYW0pIHtcbiAgICAgICAgdGhpcy5jb250ZXh0LmFsaWFzZXMuc2VsZiA9IFwidGhpc1wiO1xuICAgICAgICBwcm9ncmFtID0gXCJzZWxmLm5vb3BcIjtcbiAgICAgIH1cblxuICAgICAgaWYgKCFpbnZlcnNlKSB7XG4gICAgICAgdGhpcy5jb250ZXh0LmFsaWFzZXMuc2VsZiA9IFwidGhpc1wiO1xuICAgICAgICBpbnZlcnNlID0gXCJzZWxmLm5vb3BcIjtcbiAgICAgIH1cblxuICAgICAgb3B0aW9ucy5wdXNoKFwiaW52ZXJzZTpcIiArIGludmVyc2UpO1xuICAgICAgb3B0aW9ucy5wdXNoKFwiZm46XCIgKyBwcm9ncmFtKTtcbiAgICB9XG5cbiAgICBmb3IodmFyIGk9MDsgaTxwYXJhbVNpemU7IGkrKykge1xuICAgICAgcGFyYW0gPSB0aGlzLnBvcFN0YWNrKCk7XG4gICAgICBwYXJhbXMucHVzaChwYXJhbSk7XG5cbiAgICAgIGlmKHRoaXMub3B0aW9ucy5zdHJpbmdQYXJhbXMpIHtcbiAgICAgICAgdHlwZXMucHVzaCh0aGlzLnBvcFN0YWNrKCkpO1xuICAgICAgICBjb250ZXh0cy5wdXNoKHRoaXMucG9wU3RhY2soKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpbmdQYXJhbXMpIHtcbiAgICAgIG9wdGlvbnMucHVzaChcImNvbnRleHRzOltcIiArIGNvbnRleHRzLmpvaW4oXCIsXCIpICsgXCJdXCIpO1xuICAgICAgb3B0aW9ucy5wdXNoKFwidHlwZXM6W1wiICsgdHlwZXMuam9pbihcIixcIikgKyBcIl1cIik7XG4gICAgICBvcHRpb25zLnB1c2goXCJoYXNoQ29udGV4dHM6aGFzaENvbnRleHRzXCIpO1xuICAgICAgb3B0aW9ucy5wdXNoKFwiaGFzaFR5cGVzOmhhc2hUeXBlc1wiKTtcbiAgICB9XG5cbiAgICBpZih0aGlzLm9wdGlvbnMuZGF0YSkge1xuICAgICAgb3B0aW9ucy5wdXNoKFwiZGF0YTpkYXRhXCIpO1xuICAgIH1cblxuICAgIG9wdGlvbnMgPSBcIntcIiArIG9wdGlvbnMuam9pbihcIixcIikgKyBcIn1cIjtcbiAgICBpZiAodXNlUmVnaXN0ZXIpIHtcbiAgICAgIHRoaXMucmVnaXN0ZXIoJ29wdGlvbnMnLCBvcHRpb25zKTtcbiAgICAgIHBhcmFtcy5wdXNoKCdvcHRpb25zJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBhcmFtcy5wdXNoKG9wdGlvbnMpO1xuICAgIH1cbiAgICByZXR1cm4gcGFyYW1zLmpvaW4oXCIsIFwiKTtcbiAgfVxufTtcblxudmFyIHJlc2VydmVkV29yZHMgPSAoXG4gIFwiYnJlYWsgZWxzZSBuZXcgdmFyXCIgK1xuICBcIiBjYXNlIGZpbmFsbHkgcmV0dXJuIHZvaWRcIiArXG4gIFwiIGNhdGNoIGZvciBzd2l0Y2ggd2hpbGVcIiArXG4gIFwiIGNvbnRpbnVlIGZ1bmN0aW9uIHRoaXMgd2l0aFwiICtcbiAgXCIgZGVmYXVsdCBpZiB0aHJvd1wiICtcbiAgXCIgZGVsZXRlIGluIHRyeVwiICtcbiAgXCIgZG8gaW5zdGFuY2VvZiB0eXBlb2ZcIiArXG4gIFwiIGFic3RyYWN0IGVudW0gaW50IHNob3J0XCIgK1xuICBcIiBib29sZWFuIGV4cG9ydCBpbnRlcmZhY2Ugc3RhdGljXCIgK1xuICBcIiBieXRlIGV4dGVuZHMgbG9uZyBzdXBlclwiICtcbiAgXCIgY2hhciBmaW5hbCBuYXRpdmUgc3luY2hyb25pemVkXCIgK1xuICBcIiBjbGFzcyBmbG9hdCBwYWNrYWdlIHRocm93c1wiICtcbiAgXCIgY29uc3QgZ290byBwcml2YXRlIHRyYW5zaWVudFwiICtcbiAgXCIgZGVidWdnZXIgaW1wbGVtZW50cyBwcm90ZWN0ZWQgdm9sYXRpbGVcIiArXG4gIFwiIGRvdWJsZSBpbXBvcnQgcHVibGljIGxldCB5aWVsZFwiXG4pLnNwbGl0KFwiIFwiKTtcblxudmFyIGNvbXBpbGVyV29yZHMgPSBKYXZhU2NyaXB0Q29tcGlsZXIuUkVTRVJWRURfV09SRFMgPSB7fTtcblxuZm9yKHZhciBpPTAsIGw9cmVzZXJ2ZWRXb3Jkcy5sZW5ndGg7IGk8bDsgaSsrKSB7XG4gIGNvbXBpbGVyV29yZHNbcmVzZXJ2ZWRXb3Jkc1tpXV0gPSB0cnVlO1xufVxuXG5KYXZhU2NyaXB0Q29tcGlsZXIuaXNWYWxpZEphdmFTY3JpcHRWYXJpYWJsZU5hbWUgPSBmdW5jdGlvbihuYW1lKSB7XG4gIGlmKCFKYXZhU2NyaXB0Q29tcGlsZXIuUkVTRVJWRURfV09SRFNbbmFtZV0gJiYgL15bYS16QS1aXyRdWzAtOWEtekEtWl8kXSskLy50ZXN0KG5hbWUpKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufTtcblxuZXhwb3J0c1tcImRlZmF1bHRcIl0gPSBKYXZhU2NyaXB0Q29tcGlsZXI7IiwiXCJ1c2Ugc3RyaWN0XCI7XG4vKiBqc2hpbnQgaWdub3JlOnN0YXJ0ICovXG4vKiBKaXNvbiBnZW5lcmF0ZWQgcGFyc2VyICovXG52YXIgaGFuZGxlYmFycyA9IChmdW5jdGlvbigpe1xudmFyIHBhcnNlciA9IHt0cmFjZTogZnVuY3Rpb24gdHJhY2UoKSB7IH0sXG55eToge30sXG5zeW1ib2xzXzoge1wiZXJyb3JcIjoyLFwicm9vdFwiOjMsXCJzdGF0ZW1lbnRzXCI6NCxcIkVPRlwiOjUsXCJwcm9ncmFtXCI6NixcInNpbXBsZUludmVyc2VcIjo3LFwic3RhdGVtZW50XCI6OCxcIm9wZW5JbnZlcnNlXCI6OSxcImNsb3NlQmxvY2tcIjoxMCxcIm9wZW5CbG9ja1wiOjExLFwibXVzdGFjaGVcIjoxMixcInBhcnRpYWxcIjoxMyxcIkNPTlRFTlRcIjoxNCxcIkNPTU1FTlRcIjoxNSxcIk9QRU5fQkxPQ0tcIjoxNixcImluTXVzdGFjaGVcIjoxNyxcIkNMT1NFXCI6MTgsXCJPUEVOX0lOVkVSU0VcIjoxOSxcIk9QRU5fRU5EQkxPQ0tcIjoyMCxcInBhdGhcIjoyMSxcIk9QRU5cIjoyMixcIk9QRU5fVU5FU0NBUEVEXCI6MjMsXCJDTE9TRV9VTkVTQ0FQRURcIjoyNCxcIk9QRU5fUEFSVElBTFwiOjI1LFwicGFydGlhbE5hbWVcIjoyNixcInBhcnRpYWxfb3B0aW9uMFwiOjI3LFwiaW5NdXN0YWNoZV9yZXBldGl0aW9uMFwiOjI4LFwiaW5NdXN0YWNoZV9vcHRpb24wXCI6MjksXCJkYXRhTmFtZVwiOjMwLFwicGFyYW1cIjozMSxcIlNUUklOR1wiOjMyLFwiSU5URUdFUlwiOjMzLFwiQk9PTEVBTlwiOjM0LFwiaGFzaFwiOjM1LFwiaGFzaF9yZXBldGl0aW9uX3BsdXMwXCI6MzYsXCJoYXNoU2VnbWVudFwiOjM3LFwiSURcIjozOCxcIkVRVUFMU1wiOjM5LFwiREFUQVwiOjQwLFwicGF0aFNlZ21lbnRzXCI6NDEsXCJTRVBcIjo0MixcIiRhY2NlcHRcIjowLFwiJGVuZFwiOjF9LFxudGVybWluYWxzXzogezI6XCJlcnJvclwiLDU6XCJFT0ZcIiwxNDpcIkNPTlRFTlRcIiwxNTpcIkNPTU1FTlRcIiwxNjpcIk9QRU5fQkxPQ0tcIiwxODpcIkNMT1NFXCIsMTk6XCJPUEVOX0lOVkVSU0VcIiwyMDpcIk9QRU5fRU5EQkxPQ0tcIiwyMjpcIk9QRU5cIiwyMzpcIk9QRU5fVU5FU0NBUEVEXCIsMjQ6XCJDTE9TRV9VTkVTQ0FQRURcIiwyNTpcIk9QRU5fUEFSVElBTFwiLDMyOlwiU1RSSU5HXCIsMzM6XCJJTlRFR0VSXCIsMzQ6XCJCT09MRUFOXCIsMzg6XCJJRFwiLDM5OlwiRVFVQUxTXCIsNDA6XCJEQVRBXCIsNDI6XCJTRVBcIn0sXG5wcm9kdWN0aW9uc186IFswLFszLDJdLFszLDFdLFs2LDJdLFs2LDNdLFs2LDJdLFs2LDFdLFs2LDFdLFs2LDBdLFs0LDFdLFs0LDJdLFs4LDNdLFs4LDNdLFs4LDFdLFs4LDFdLFs4LDFdLFs4LDFdLFsxMSwzXSxbOSwzXSxbMTAsM10sWzEyLDNdLFsxMiwzXSxbMTMsNF0sWzcsMl0sWzE3LDNdLFsxNywxXSxbMzEsMV0sWzMxLDFdLFszMSwxXSxbMzEsMV0sWzMxLDFdLFszNSwxXSxbMzcsM10sWzI2LDFdLFsyNiwxXSxbMjYsMV0sWzMwLDJdLFsyMSwxXSxbNDEsM10sWzQxLDFdLFsyNywwXSxbMjcsMV0sWzI4LDBdLFsyOCwyXSxbMjksMF0sWzI5LDFdLFszNiwxXSxbMzYsMl1dLFxucGVyZm9ybUFjdGlvbjogZnVuY3Rpb24gYW5vbnltb3VzKHl5dGV4dCx5eWxlbmcseXlsaW5lbm8seXkseXlzdGF0ZSwkJCxfJCkge1xuXG52YXIgJDAgPSAkJC5sZW5ndGggLSAxO1xuc3dpdGNoICh5eXN0YXRlKSB7XG5jYXNlIDE6IHJldHVybiBuZXcgeXkuUHJvZ3JhbU5vZGUoJCRbJDAtMV0pOyBcbmJyZWFrO1xuY2FzZSAyOiByZXR1cm4gbmV3IHl5LlByb2dyYW1Ob2RlKFtdKTsgXG5icmVhaztcbmNhc2UgMzp0aGlzLiQgPSBuZXcgeXkuUHJvZ3JhbU5vZGUoW10sICQkWyQwLTFdLCAkJFskMF0pO1xuYnJlYWs7XG5jYXNlIDQ6dGhpcy4kID0gbmV3IHl5LlByb2dyYW1Ob2RlKCQkWyQwLTJdLCAkJFskMC0xXSwgJCRbJDBdKTtcbmJyZWFrO1xuY2FzZSA1OnRoaXMuJCA9IG5ldyB5eS5Qcm9ncmFtTm9kZSgkJFskMC0xXSwgJCRbJDBdLCBbXSk7XG5icmVhaztcbmNhc2UgNjp0aGlzLiQgPSBuZXcgeXkuUHJvZ3JhbU5vZGUoJCRbJDBdKTtcbmJyZWFrO1xuY2FzZSA3OnRoaXMuJCA9IG5ldyB5eS5Qcm9ncmFtTm9kZShbXSk7XG5icmVhaztcbmNhc2UgODp0aGlzLiQgPSBuZXcgeXkuUHJvZ3JhbU5vZGUoW10pO1xuYnJlYWs7XG5jYXNlIDk6dGhpcy4kID0gWyQkWyQwXV07XG5icmVhaztcbmNhc2UgMTA6ICQkWyQwLTFdLnB1c2goJCRbJDBdKTsgdGhpcy4kID0gJCRbJDAtMV07IFxuYnJlYWs7XG5jYXNlIDExOnRoaXMuJCA9IG5ldyB5eS5CbG9ja05vZGUoJCRbJDAtMl0sICQkWyQwLTFdLmludmVyc2UsICQkWyQwLTFdLCAkJFskMF0pO1xuYnJlYWs7XG5jYXNlIDEyOnRoaXMuJCA9IG5ldyB5eS5CbG9ja05vZGUoJCRbJDAtMl0sICQkWyQwLTFdLCAkJFskMC0xXS5pbnZlcnNlLCAkJFskMF0pO1xuYnJlYWs7XG5jYXNlIDEzOnRoaXMuJCA9ICQkWyQwXTtcbmJyZWFrO1xuY2FzZSAxNDp0aGlzLiQgPSAkJFskMF07XG5icmVhaztcbmNhc2UgMTU6dGhpcy4kID0gbmV3IHl5LkNvbnRlbnROb2RlKCQkWyQwXSk7XG5icmVhaztcbmNhc2UgMTY6dGhpcy4kID0gbmV3IHl5LkNvbW1lbnROb2RlKCQkWyQwXSk7XG5icmVhaztcbmNhc2UgMTc6dGhpcy4kID0gbmV3IHl5Lk11c3RhY2hlTm9kZSgkJFskMC0xXVswXSwgJCRbJDAtMV1bMV0sICQkWyQwLTJdLCBzdHJpcEZsYWdzKCQkWyQwLTJdLCAkJFskMF0pKTtcbmJyZWFrO1xuY2FzZSAxODp0aGlzLiQgPSBuZXcgeXkuTXVzdGFjaGVOb2RlKCQkWyQwLTFdWzBdLCAkJFskMC0xXVsxXSwgJCRbJDAtMl0sIHN0cmlwRmxhZ3MoJCRbJDAtMl0sICQkWyQwXSkpO1xuYnJlYWs7XG5jYXNlIDE5OnRoaXMuJCA9IHtwYXRoOiAkJFskMC0xXSwgc3RyaXA6IHN0cmlwRmxhZ3MoJCRbJDAtMl0sICQkWyQwXSl9O1xuYnJlYWs7XG5jYXNlIDIwOnRoaXMuJCA9IG5ldyB5eS5NdXN0YWNoZU5vZGUoJCRbJDAtMV1bMF0sICQkWyQwLTFdWzFdLCAkJFskMC0yXSwgc3RyaXBGbGFncygkJFskMC0yXSwgJCRbJDBdKSk7XG5icmVhaztcbmNhc2UgMjE6dGhpcy4kID0gbmV3IHl5Lk11c3RhY2hlTm9kZSgkJFskMC0xXVswXSwgJCRbJDAtMV1bMV0sICQkWyQwLTJdLCBzdHJpcEZsYWdzKCQkWyQwLTJdLCAkJFskMF0pKTtcbmJyZWFrO1xuY2FzZSAyMjp0aGlzLiQgPSBuZXcgeXkuUGFydGlhbE5vZGUoJCRbJDAtMl0sICQkWyQwLTFdLCBzdHJpcEZsYWdzKCQkWyQwLTNdLCAkJFskMF0pKTtcbmJyZWFrO1xuY2FzZSAyMzp0aGlzLiQgPSBzdHJpcEZsYWdzKCQkWyQwLTFdLCAkJFskMF0pO1xuYnJlYWs7XG5jYXNlIDI0OnRoaXMuJCA9IFtbJCRbJDAtMl1dLmNvbmNhdCgkJFskMC0xXSksICQkWyQwXV07XG5icmVhaztcbmNhc2UgMjU6dGhpcy4kID0gW1skJFskMF1dLCBudWxsXTtcbmJyZWFrO1xuY2FzZSAyNjp0aGlzLiQgPSAkJFskMF07XG5icmVhaztcbmNhc2UgMjc6dGhpcy4kID0gbmV3IHl5LlN0cmluZ05vZGUoJCRbJDBdKTtcbmJyZWFrO1xuY2FzZSAyODp0aGlzLiQgPSBuZXcgeXkuSW50ZWdlck5vZGUoJCRbJDBdKTtcbmJyZWFrO1xuY2FzZSAyOTp0aGlzLiQgPSBuZXcgeXkuQm9vbGVhbk5vZGUoJCRbJDBdKTtcbmJyZWFrO1xuY2FzZSAzMDp0aGlzLiQgPSAkJFskMF07XG5icmVhaztcbmNhc2UgMzE6dGhpcy4kID0gbmV3IHl5Lkhhc2hOb2RlKCQkWyQwXSk7XG5icmVhaztcbmNhc2UgMzI6dGhpcy4kID0gWyQkWyQwLTJdLCAkJFskMF1dO1xuYnJlYWs7XG5jYXNlIDMzOnRoaXMuJCA9IG5ldyB5eS5QYXJ0aWFsTmFtZU5vZGUoJCRbJDBdKTtcbmJyZWFrO1xuY2FzZSAzNDp0aGlzLiQgPSBuZXcgeXkuUGFydGlhbE5hbWVOb2RlKG5ldyB5eS5TdHJpbmdOb2RlKCQkWyQwXSkpO1xuYnJlYWs7XG5jYXNlIDM1OnRoaXMuJCA9IG5ldyB5eS5QYXJ0aWFsTmFtZU5vZGUobmV3IHl5LkludGVnZXJOb2RlKCQkWyQwXSkpO1xuYnJlYWs7XG5jYXNlIDM2OnRoaXMuJCA9IG5ldyB5eS5EYXRhTm9kZSgkJFskMF0pO1xuYnJlYWs7XG5jYXNlIDM3OnRoaXMuJCA9IG5ldyB5eS5JZE5vZGUoJCRbJDBdKTtcbmJyZWFrO1xuY2FzZSAzODogJCRbJDAtMl0ucHVzaCh7cGFydDogJCRbJDBdLCBzZXBhcmF0b3I6ICQkWyQwLTFdfSk7IHRoaXMuJCA9ICQkWyQwLTJdOyBcbmJyZWFrO1xuY2FzZSAzOTp0aGlzLiQgPSBbe3BhcnQ6ICQkWyQwXX1dO1xuYnJlYWs7XG5jYXNlIDQyOnRoaXMuJCA9IFtdO1xuYnJlYWs7XG5jYXNlIDQzOiQkWyQwLTFdLnB1c2goJCRbJDBdKTtcbmJyZWFrO1xuY2FzZSA0Njp0aGlzLiQgPSBbJCRbJDBdXTtcbmJyZWFrO1xuY2FzZSA0NzokJFskMC0xXS5wdXNoKCQkWyQwXSk7XG5icmVhaztcbn1cbn0sXG50YWJsZTogW3szOjEsNDoyLDU6WzEsM10sODo0LDk6NSwxMTo2LDEyOjcsMTM6OCwxNDpbMSw5XSwxNTpbMSwxMF0sMTY6WzEsMTJdLDE5OlsxLDExXSwyMjpbMSwxM10sMjM6WzEsMTRdLDI1OlsxLDE1XX0sezE6WzNdfSx7NTpbMSwxNl0sODoxNyw5OjUsMTE6NiwxMjo3LDEzOjgsMTQ6WzEsOV0sMTU6WzEsMTBdLDE2OlsxLDEyXSwxOTpbMSwxMV0sMjI6WzEsMTNdLDIzOlsxLDE0XSwyNTpbMSwxNV19LHsxOlsyLDJdfSx7NTpbMiw5XSwxNDpbMiw5XSwxNTpbMiw5XSwxNjpbMiw5XSwxOTpbMiw5XSwyMDpbMiw5XSwyMjpbMiw5XSwyMzpbMiw5XSwyNTpbMiw5XX0sezQ6MjAsNjoxOCw3OjE5LDg6NCw5OjUsMTE6NiwxMjo3LDEzOjgsMTQ6WzEsOV0sMTU6WzEsMTBdLDE2OlsxLDEyXSwxOTpbMSwyMV0sMjA6WzIsOF0sMjI6WzEsMTNdLDIzOlsxLDE0XSwyNTpbMSwxNV19LHs0OjIwLDY6MjIsNzoxOSw4OjQsOTo1LDExOjYsMTI6NywxMzo4LDE0OlsxLDldLDE1OlsxLDEwXSwxNjpbMSwxMl0sMTk6WzEsMjFdLDIwOlsyLDhdLDIyOlsxLDEzXSwyMzpbMSwxNF0sMjU6WzEsMTVdfSx7NTpbMiwxM10sMTQ6WzIsMTNdLDE1OlsyLDEzXSwxNjpbMiwxM10sMTk6WzIsMTNdLDIwOlsyLDEzXSwyMjpbMiwxM10sMjM6WzIsMTNdLDI1OlsyLDEzXX0sezU6WzIsMTRdLDE0OlsyLDE0XSwxNTpbMiwxNF0sMTY6WzIsMTRdLDE5OlsyLDE0XSwyMDpbMiwxNF0sMjI6WzIsMTRdLDIzOlsyLDE0XSwyNTpbMiwxNF19LHs1OlsyLDE1XSwxNDpbMiwxNV0sMTU6WzIsMTVdLDE2OlsyLDE1XSwxOTpbMiwxNV0sMjA6WzIsMTVdLDIyOlsyLDE1XSwyMzpbMiwxNV0sMjU6WzIsMTVdfSx7NTpbMiwxNl0sMTQ6WzIsMTZdLDE1OlsyLDE2XSwxNjpbMiwxNl0sMTk6WzIsMTZdLDIwOlsyLDE2XSwyMjpbMiwxNl0sMjM6WzIsMTZdLDI1OlsyLDE2XX0sezE3OjIzLDIxOjI0LDMwOjI1LDM4OlsxLDI4XSw0MDpbMSwyN10sNDE6MjZ9LHsxNzoyOSwyMToyNCwzMDoyNSwzODpbMSwyOF0sNDA6WzEsMjddLDQxOjI2fSx7MTc6MzAsMjE6MjQsMzA6MjUsMzg6WzEsMjhdLDQwOlsxLDI3XSw0MToyNn0sezE3OjMxLDIxOjI0LDMwOjI1LDM4OlsxLDI4XSw0MDpbMSwyN10sNDE6MjZ9LHsyMTozMywyNjozMiwzMjpbMSwzNF0sMzM6WzEsMzVdLDM4OlsxLDI4XSw0MToyNn0sezE6WzIsMV19LHs1OlsyLDEwXSwxNDpbMiwxMF0sMTU6WzIsMTBdLDE2OlsyLDEwXSwxOTpbMiwxMF0sMjA6WzIsMTBdLDIyOlsyLDEwXSwyMzpbMiwxMF0sMjU6WzIsMTBdfSx7MTA6MzYsMjA6WzEsMzddfSx7NDozOCw4OjQsOTo1LDExOjYsMTI6NywxMzo4LDE0OlsxLDldLDE1OlsxLDEwXSwxNjpbMSwxMl0sMTk6WzEsMTFdLDIwOlsyLDddLDIyOlsxLDEzXSwyMzpbMSwxNF0sMjU6WzEsMTVdfSx7NzozOSw4OjE3LDk6NSwxMTo2LDEyOjcsMTM6OCwxNDpbMSw5XSwxNTpbMSwxMF0sMTY6WzEsMTJdLDE5OlsxLDIxXSwyMDpbMiw2XSwyMjpbMSwxM10sMjM6WzEsMTRdLDI1OlsxLDE1XX0sezE3OjIzLDE4OlsxLDQwXSwyMToyNCwzMDoyNSwzODpbMSwyOF0sNDA6WzEsMjddLDQxOjI2fSx7MTA6NDEsMjA6WzEsMzddfSx7MTg6WzEsNDJdfSx7MTg6WzIsNDJdLDI0OlsyLDQyXSwyODo0MywzMjpbMiw0Ml0sMzM6WzIsNDJdLDM0OlsyLDQyXSwzODpbMiw0Ml0sNDA6WzIsNDJdfSx7MTg6WzIsMjVdLDI0OlsyLDI1XX0sezE4OlsyLDM3XSwyNDpbMiwzN10sMzI6WzIsMzddLDMzOlsyLDM3XSwzNDpbMiwzN10sMzg6WzIsMzddLDQwOlsyLDM3XSw0MjpbMSw0NF19LHsyMTo0NSwzODpbMSwyOF0sNDE6MjZ9LHsxODpbMiwzOV0sMjQ6WzIsMzldLDMyOlsyLDM5XSwzMzpbMiwzOV0sMzQ6WzIsMzldLDM4OlsyLDM5XSw0MDpbMiwzOV0sNDI6WzIsMzldfSx7MTg6WzEsNDZdfSx7MTg6WzEsNDddfSx7MjQ6WzEsNDhdfSx7MTg6WzIsNDBdLDIxOjUwLDI3OjQ5LDM4OlsxLDI4XSw0MToyNn0sezE4OlsyLDMzXSwzODpbMiwzM119LHsxODpbMiwzNF0sMzg6WzIsMzRdfSx7MTg6WzIsMzVdLDM4OlsyLDM1XX0sezU6WzIsMTFdLDE0OlsyLDExXSwxNTpbMiwxMV0sMTY6WzIsMTFdLDE5OlsyLDExXSwyMDpbMiwxMV0sMjI6WzIsMTFdLDIzOlsyLDExXSwyNTpbMiwxMV19LHsyMTo1MSwzODpbMSwyOF0sNDE6MjZ9LHs4OjE3LDk6NSwxMTo2LDEyOjcsMTM6OCwxNDpbMSw5XSwxNTpbMSwxMF0sMTY6WzEsMTJdLDE5OlsxLDExXSwyMDpbMiwzXSwyMjpbMSwxM10sMjM6WzEsMTRdLDI1OlsxLDE1XX0sezQ6NTIsODo0LDk6NSwxMTo2LDEyOjcsMTM6OCwxNDpbMSw5XSwxNTpbMSwxMF0sMTY6WzEsMTJdLDE5OlsxLDExXSwyMDpbMiw1XSwyMjpbMSwxM10sMjM6WzEsMTRdLDI1OlsxLDE1XX0sezE0OlsyLDIzXSwxNTpbMiwyM10sMTY6WzIsMjNdLDE5OlsyLDIzXSwyMDpbMiwyM10sMjI6WzIsMjNdLDIzOlsyLDIzXSwyNTpbMiwyM119LHs1OlsyLDEyXSwxNDpbMiwxMl0sMTU6WzIsMTJdLDE2OlsyLDEyXSwxOTpbMiwxMl0sMjA6WzIsMTJdLDIyOlsyLDEyXSwyMzpbMiwxMl0sMjU6WzIsMTJdfSx7MTQ6WzIsMThdLDE1OlsyLDE4XSwxNjpbMiwxOF0sMTk6WzIsMThdLDIwOlsyLDE4XSwyMjpbMiwxOF0sMjM6WzIsMThdLDI1OlsyLDE4XX0sezE4OlsyLDQ0XSwyMTo1NiwyNDpbMiw0NF0sMjk6NTMsMzA6NjAsMzE6NTQsMzI6WzEsNTddLDMzOlsxLDU4XSwzNDpbMSw1OV0sMzU6NTUsMzY6NjEsMzc6NjIsMzg6WzEsNjNdLDQwOlsxLDI3XSw0MToyNn0sezM4OlsxLDY0XX0sezE4OlsyLDM2XSwyNDpbMiwzNl0sMzI6WzIsMzZdLDMzOlsyLDM2XSwzNDpbMiwzNl0sMzg6WzIsMzZdLDQwOlsyLDM2XX0sezE0OlsyLDE3XSwxNTpbMiwxN10sMTY6WzIsMTddLDE5OlsyLDE3XSwyMDpbMiwxN10sMjI6WzIsMTddLDIzOlsyLDE3XSwyNTpbMiwxN119LHs1OlsyLDIwXSwxNDpbMiwyMF0sMTU6WzIsMjBdLDE2OlsyLDIwXSwxOTpbMiwyMF0sMjA6WzIsMjBdLDIyOlsyLDIwXSwyMzpbMiwyMF0sMjU6WzIsMjBdfSx7NTpbMiwyMV0sMTQ6WzIsMjFdLDE1OlsyLDIxXSwxNjpbMiwyMV0sMTk6WzIsMjFdLDIwOlsyLDIxXSwyMjpbMiwyMV0sMjM6WzIsMjFdLDI1OlsyLDIxXX0sezE4OlsxLDY1XX0sezE4OlsyLDQxXX0sezE4OlsxLDY2XX0sezg6MTcsOTo1LDExOjYsMTI6NywxMzo4LDE0OlsxLDldLDE1OlsxLDEwXSwxNjpbMSwxMl0sMTk6WzEsMTFdLDIwOlsyLDRdLDIyOlsxLDEzXSwyMzpbMSwxNF0sMjU6WzEsMTVdfSx7MTg6WzIsMjRdLDI0OlsyLDI0XX0sezE4OlsyLDQzXSwyNDpbMiw0M10sMzI6WzIsNDNdLDMzOlsyLDQzXSwzNDpbMiw0M10sMzg6WzIsNDNdLDQwOlsyLDQzXX0sezE4OlsyLDQ1XSwyNDpbMiw0NV19LHsxODpbMiwyNl0sMjQ6WzIsMjZdLDMyOlsyLDI2XSwzMzpbMiwyNl0sMzQ6WzIsMjZdLDM4OlsyLDI2XSw0MDpbMiwyNl19LHsxODpbMiwyN10sMjQ6WzIsMjddLDMyOlsyLDI3XSwzMzpbMiwyN10sMzQ6WzIsMjddLDM4OlsyLDI3XSw0MDpbMiwyN119LHsxODpbMiwyOF0sMjQ6WzIsMjhdLDMyOlsyLDI4XSwzMzpbMiwyOF0sMzQ6WzIsMjhdLDM4OlsyLDI4XSw0MDpbMiwyOF19LHsxODpbMiwyOV0sMjQ6WzIsMjldLDMyOlsyLDI5XSwzMzpbMiwyOV0sMzQ6WzIsMjldLDM4OlsyLDI5XSw0MDpbMiwyOV19LHsxODpbMiwzMF0sMjQ6WzIsMzBdLDMyOlsyLDMwXSwzMzpbMiwzMF0sMzQ6WzIsMzBdLDM4OlsyLDMwXSw0MDpbMiwzMF19LHsxODpbMiwzMV0sMjQ6WzIsMzFdLDM3OjY3LDM4OlsxLDY4XX0sezE4OlsyLDQ2XSwyNDpbMiw0Nl0sMzg6WzIsNDZdfSx7MTg6WzIsMzldLDI0OlsyLDM5XSwzMjpbMiwzOV0sMzM6WzIsMzldLDM0OlsyLDM5XSwzODpbMiwzOV0sMzk6WzEsNjldLDQwOlsyLDM5XSw0MjpbMiwzOV19LHsxODpbMiwzOF0sMjQ6WzIsMzhdLDMyOlsyLDM4XSwzMzpbMiwzOF0sMzQ6WzIsMzhdLDM4OlsyLDM4XSw0MDpbMiwzOF0sNDI6WzIsMzhdfSx7NTpbMiwyMl0sMTQ6WzIsMjJdLDE1OlsyLDIyXSwxNjpbMiwyMl0sMTk6WzIsMjJdLDIwOlsyLDIyXSwyMjpbMiwyMl0sMjM6WzIsMjJdLDI1OlsyLDIyXX0sezU6WzIsMTldLDE0OlsyLDE5XSwxNTpbMiwxOV0sMTY6WzIsMTldLDE5OlsyLDE5XSwyMDpbMiwxOV0sMjI6WzIsMTldLDIzOlsyLDE5XSwyNTpbMiwxOV19LHsxODpbMiw0N10sMjQ6WzIsNDddLDM4OlsyLDQ3XX0sezM5OlsxLDY5XX0sezIxOjU2LDMwOjYwLDMxOjcwLDMyOlsxLDU3XSwzMzpbMSw1OF0sMzQ6WzEsNTldLDM4OlsxLDI4XSw0MDpbMSwyN10sNDE6MjZ9LHsxODpbMiwzMl0sMjQ6WzIsMzJdLDM4OlsyLDMyXX1dLFxuZGVmYXVsdEFjdGlvbnM6IHszOlsyLDJdLDE2OlsyLDFdLDUwOlsyLDQxXX0sXG5wYXJzZUVycm9yOiBmdW5jdGlvbiBwYXJzZUVycm9yKHN0ciwgaGFzaCkge1xuICAgIHRocm93IG5ldyBFcnJvcihzdHIpO1xufSxcbnBhcnNlOiBmdW5jdGlvbiBwYXJzZShpbnB1dCkge1xuICAgIHZhciBzZWxmID0gdGhpcywgc3RhY2sgPSBbMF0sIHZzdGFjayA9IFtudWxsXSwgbHN0YWNrID0gW10sIHRhYmxlID0gdGhpcy50YWJsZSwgeXl0ZXh0ID0gXCJcIiwgeXlsaW5lbm8gPSAwLCB5eWxlbmcgPSAwLCByZWNvdmVyaW5nID0gMCwgVEVSUk9SID0gMiwgRU9GID0gMTtcbiAgICB0aGlzLmxleGVyLnNldElucHV0KGlucHV0KTtcbiAgICB0aGlzLmxleGVyLnl5ID0gdGhpcy55eTtcbiAgICB0aGlzLnl5LmxleGVyID0gdGhpcy5sZXhlcjtcbiAgICB0aGlzLnl5LnBhcnNlciA9IHRoaXM7XG4gICAgaWYgKHR5cGVvZiB0aGlzLmxleGVyLnl5bGxvYyA9PSBcInVuZGVmaW5lZFwiKVxuICAgICAgICB0aGlzLmxleGVyLnl5bGxvYyA9IHt9O1xuICAgIHZhciB5eWxvYyA9IHRoaXMubGV4ZXIueXlsbG9jO1xuICAgIGxzdGFjay5wdXNoKHl5bG9jKTtcbiAgICB2YXIgcmFuZ2VzID0gdGhpcy5sZXhlci5vcHRpb25zICYmIHRoaXMubGV4ZXIub3B0aW9ucy5yYW5nZXM7XG4gICAgaWYgKHR5cGVvZiB0aGlzLnl5LnBhcnNlRXJyb3IgPT09IFwiZnVuY3Rpb25cIilcbiAgICAgICAgdGhpcy5wYXJzZUVycm9yID0gdGhpcy55eS5wYXJzZUVycm9yO1xuICAgIGZ1bmN0aW9uIHBvcFN0YWNrKG4pIHtcbiAgICAgICAgc3RhY2subGVuZ3RoID0gc3RhY2subGVuZ3RoIC0gMiAqIG47XG4gICAgICAgIHZzdGFjay5sZW5ndGggPSB2c3RhY2subGVuZ3RoIC0gbjtcbiAgICAgICAgbHN0YWNrLmxlbmd0aCA9IGxzdGFjay5sZW5ndGggLSBuO1xuICAgIH1cbiAgICBmdW5jdGlvbiBsZXgoKSB7XG4gICAgICAgIHZhciB0b2tlbjtcbiAgICAgICAgdG9rZW4gPSBzZWxmLmxleGVyLmxleCgpIHx8IDE7XG4gICAgICAgIGlmICh0eXBlb2YgdG9rZW4gIT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgIHRva2VuID0gc2VsZi5zeW1ib2xzX1t0b2tlbl0gfHwgdG9rZW47XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRva2VuO1xuICAgIH1cbiAgICB2YXIgc3ltYm9sLCBwcmVFcnJvclN5bWJvbCwgc3RhdGUsIGFjdGlvbiwgYSwgciwgeXl2YWwgPSB7fSwgcCwgbGVuLCBuZXdTdGF0ZSwgZXhwZWN0ZWQ7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgc3RhdGUgPSBzdGFja1tzdGFjay5sZW5ndGggLSAxXTtcbiAgICAgICAgaWYgKHRoaXMuZGVmYXVsdEFjdGlvbnNbc3RhdGVdKSB7XG4gICAgICAgICAgICBhY3Rpb24gPSB0aGlzLmRlZmF1bHRBY3Rpb25zW3N0YXRlXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChzeW1ib2wgPT09IG51bGwgfHwgdHlwZW9mIHN5bWJvbCA9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICAgICAgc3ltYm9sID0gbGV4KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhY3Rpb24gPSB0YWJsZVtzdGF0ZV0gJiYgdGFibGVbc3RhdGVdW3N5bWJvbF07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBhY3Rpb24gPT09IFwidW5kZWZpbmVkXCIgfHwgIWFjdGlvbi5sZW5ndGggfHwgIWFjdGlvblswXSkge1xuICAgICAgICAgICAgdmFyIGVyclN0ciA9IFwiXCI7XG4gICAgICAgICAgICBpZiAoIXJlY292ZXJpbmcpIHtcbiAgICAgICAgICAgICAgICBleHBlY3RlZCA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAocCBpbiB0YWJsZVtzdGF0ZV0pXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnRlcm1pbmFsc19bcF0gJiYgcCA+IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4cGVjdGVkLnB1c2goXCInXCIgKyB0aGlzLnRlcm1pbmFsc19bcF0gKyBcIidcIik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5sZXhlci5zaG93UG9zaXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyU3RyID0gXCJQYXJzZSBlcnJvciBvbiBsaW5lIFwiICsgKHl5bGluZW5vICsgMSkgKyBcIjpcXG5cIiArIHRoaXMubGV4ZXIuc2hvd1Bvc2l0aW9uKCkgKyBcIlxcbkV4cGVjdGluZyBcIiArIGV4cGVjdGVkLmpvaW4oXCIsIFwiKSArIFwiLCBnb3QgJ1wiICsgKHRoaXMudGVybWluYWxzX1tzeW1ib2xdIHx8IHN5bWJvbCkgKyBcIidcIjtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBlcnJTdHIgPSBcIlBhcnNlIGVycm9yIG9uIGxpbmUgXCIgKyAoeXlsaW5lbm8gKyAxKSArIFwiOiBVbmV4cGVjdGVkIFwiICsgKHN5bWJvbCA9PSAxP1wiZW5kIG9mIGlucHV0XCI6XCInXCIgKyAodGhpcy50ZXJtaW5hbHNfW3N5bWJvbF0gfHwgc3ltYm9sKSArIFwiJ1wiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5wYXJzZUVycm9yKGVyclN0ciwge3RleHQ6IHRoaXMubGV4ZXIubWF0Y2gsIHRva2VuOiB0aGlzLnRlcm1pbmFsc19bc3ltYm9sXSB8fCBzeW1ib2wsIGxpbmU6IHRoaXMubGV4ZXIueXlsaW5lbm8sIGxvYzogeXlsb2MsIGV4cGVjdGVkOiBleHBlY3RlZH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChhY3Rpb25bMF0gaW5zdGFuY2VvZiBBcnJheSAmJiBhY3Rpb24ubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUGFyc2UgRXJyb3I6IG11bHRpcGxlIGFjdGlvbnMgcG9zc2libGUgYXQgc3RhdGU6IFwiICsgc3RhdGUgKyBcIiwgdG9rZW46IFwiICsgc3ltYm9sKTtcbiAgICAgICAgfVxuICAgICAgICBzd2l0Y2ggKGFjdGlvblswXSkge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgICBzdGFjay5wdXNoKHN5bWJvbCk7XG4gICAgICAgICAgICB2c3RhY2sucHVzaCh0aGlzLmxleGVyLnl5dGV4dCk7XG4gICAgICAgICAgICBsc3RhY2sucHVzaCh0aGlzLmxleGVyLnl5bGxvYyk7XG4gICAgICAgICAgICBzdGFjay5wdXNoKGFjdGlvblsxXSk7XG4gICAgICAgICAgICBzeW1ib2wgPSBudWxsO1xuICAgICAgICAgICAgaWYgKCFwcmVFcnJvclN5bWJvbCkge1xuICAgICAgICAgICAgICAgIHl5bGVuZyA9IHRoaXMubGV4ZXIueXlsZW5nO1xuICAgICAgICAgICAgICAgIHl5dGV4dCA9IHRoaXMubGV4ZXIueXl0ZXh0O1xuICAgICAgICAgICAgICAgIHl5bGluZW5vID0gdGhpcy5sZXhlci55eWxpbmVubztcbiAgICAgICAgICAgICAgICB5eWxvYyA9IHRoaXMubGV4ZXIueXlsbG9jO1xuICAgICAgICAgICAgICAgIGlmIChyZWNvdmVyaW5nID4gMClcbiAgICAgICAgICAgICAgICAgICAgcmVjb3ZlcmluZy0tO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzeW1ib2wgPSBwcmVFcnJvclN5bWJvbDtcbiAgICAgICAgICAgICAgICBwcmVFcnJvclN5bWJvbCA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgbGVuID0gdGhpcy5wcm9kdWN0aW9uc19bYWN0aW9uWzFdXVsxXTtcbiAgICAgICAgICAgIHl5dmFsLiQgPSB2c3RhY2tbdnN0YWNrLmxlbmd0aCAtIGxlbl07XG4gICAgICAgICAgICB5eXZhbC5fJCA9IHtmaXJzdF9saW5lOiBsc3RhY2tbbHN0YWNrLmxlbmd0aCAtIChsZW4gfHwgMSldLmZpcnN0X2xpbmUsIGxhc3RfbGluZTogbHN0YWNrW2xzdGFjay5sZW5ndGggLSAxXS5sYXN0X2xpbmUsIGZpcnN0X2NvbHVtbjogbHN0YWNrW2xzdGFjay5sZW5ndGggLSAobGVuIHx8IDEpXS5maXJzdF9jb2x1bW4sIGxhc3RfY29sdW1uOiBsc3RhY2tbbHN0YWNrLmxlbmd0aCAtIDFdLmxhc3RfY29sdW1ufTtcbiAgICAgICAgICAgIGlmIChyYW5nZXMpIHtcbiAgICAgICAgICAgICAgICB5eXZhbC5fJC5yYW5nZSA9IFtsc3RhY2tbbHN0YWNrLmxlbmd0aCAtIChsZW4gfHwgMSldLnJhbmdlWzBdLCBsc3RhY2tbbHN0YWNrLmxlbmd0aCAtIDFdLnJhbmdlWzFdXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHIgPSB0aGlzLnBlcmZvcm1BY3Rpb24uY2FsbCh5eXZhbCwgeXl0ZXh0LCB5eWxlbmcsIHl5bGluZW5vLCB0aGlzLnl5LCBhY3Rpb25bMV0sIHZzdGFjaywgbHN0YWNrKTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgciAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgIHJldHVybiByO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGxlbikge1xuICAgICAgICAgICAgICAgIHN0YWNrID0gc3RhY2suc2xpY2UoMCwgLTEgKiBsZW4gKiAyKTtcbiAgICAgICAgICAgICAgICB2c3RhY2sgPSB2c3RhY2suc2xpY2UoMCwgLTEgKiBsZW4pO1xuICAgICAgICAgICAgICAgIGxzdGFjayA9IGxzdGFjay5zbGljZSgwLCAtMSAqIGxlbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdGFjay5wdXNoKHRoaXMucHJvZHVjdGlvbnNfW2FjdGlvblsxXV1bMF0pO1xuICAgICAgICAgICAgdnN0YWNrLnB1c2goeXl2YWwuJCk7XG4gICAgICAgICAgICBsc3RhY2sucHVzaCh5eXZhbC5fJCk7XG4gICAgICAgICAgICBuZXdTdGF0ZSA9IHRhYmxlW3N0YWNrW3N0YWNrLmxlbmd0aCAtIDJdXVtzdGFja1tzdGFjay5sZW5ndGggLSAxXV07XG4gICAgICAgICAgICBzdGFjay5wdXNoKG5ld1N0YXRlKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn1cbn07XG5cblxuZnVuY3Rpb24gc3RyaXBGbGFncyhvcGVuLCBjbG9zZSkge1xuICByZXR1cm4ge1xuICAgIGxlZnQ6IG9wZW4uY2hhckF0KDIpID09PSAnficsXG4gICAgcmlnaHQ6IGNsb3NlLmNoYXJBdCgwKSA9PT0gJ34nIHx8IGNsb3NlLmNoYXJBdCgxKSA9PT0gJ34nXG4gIH07XG59XG5cbi8qIEppc29uIGdlbmVyYXRlZCBsZXhlciAqL1xudmFyIGxleGVyID0gKGZ1bmN0aW9uKCl7XG52YXIgbGV4ZXIgPSAoe0VPRjoxLFxucGFyc2VFcnJvcjpmdW5jdGlvbiBwYXJzZUVycm9yKHN0ciwgaGFzaCkge1xuICAgICAgICBpZiAodGhpcy55eS5wYXJzZXIpIHtcbiAgICAgICAgICAgIHRoaXMueXkucGFyc2VyLnBhcnNlRXJyb3Ioc3RyLCBoYXNoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihzdHIpO1xuICAgICAgICB9XG4gICAgfSxcbnNldElucHV0OmZ1bmN0aW9uIChpbnB1dCkge1xuICAgICAgICB0aGlzLl9pbnB1dCA9IGlucHV0O1xuICAgICAgICB0aGlzLl9tb3JlID0gdGhpcy5fbGVzcyA9IHRoaXMuZG9uZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLnl5bGluZW5vID0gdGhpcy55eWxlbmcgPSAwO1xuICAgICAgICB0aGlzLnl5dGV4dCA9IHRoaXMubWF0Y2hlZCA9IHRoaXMubWF0Y2ggPSAnJztcbiAgICAgICAgdGhpcy5jb25kaXRpb25TdGFjayA9IFsnSU5JVElBTCddO1xuICAgICAgICB0aGlzLnl5bGxvYyA9IHtmaXJzdF9saW5lOjEsZmlyc3RfY29sdW1uOjAsbGFzdF9saW5lOjEsbGFzdF9jb2x1bW46MH07XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMucmFuZ2VzKSB0aGlzLnl5bGxvYy5yYW5nZSA9IFswLDBdO1xuICAgICAgICB0aGlzLm9mZnNldCA9IDA7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5pbnB1dDpmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBjaCA9IHRoaXMuX2lucHV0WzBdO1xuICAgICAgICB0aGlzLnl5dGV4dCArPSBjaDtcbiAgICAgICAgdGhpcy55eWxlbmcrKztcbiAgICAgICAgdGhpcy5vZmZzZXQrKztcbiAgICAgICAgdGhpcy5tYXRjaCArPSBjaDtcbiAgICAgICAgdGhpcy5tYXRjaGVkICs9IGNoO1xuICAgICAgICB2YXIgbGluZXMgPSBjaC5tYXRjaCgvKD86XFxyXFxuP3xcXG4pLiovZyk7XG4gICAgICAgIGlmIChsaW5lcykge1xuICAgICAgICAgICAgdGhpcy55eWxpbmVubysrO1xuICAgICAgICAgICAgdGhpcy55eWxsb2MubGFzdF9saW5lKys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnl5bGxvYy5sYXN0X2NvbHVtbisrO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMucmFuZ2VzKSB0aGlzLnl5bGxvYy5yYW5nZVsxXSsrO1xuXG4gICAgICAgIHRoaXMuX2lucHV0ID0gdGhpcy5faW5wdXQuc2xpY2UoMSk7XG4gICAgICAgIHJldHVybiBjaDtcbiAgICB9LFxudW5wdXQ6ZnVuY3Rpb24gKGNoKSB7XG4gICAgICAgIHZhciBsZW4gPSBjaC5sZW5ndGg7XG4gICAgICAgIHZhciBsaW5lcyA9IGNoLnNwbGl0KC8oPzpcXHJcXG4/fFxcbikvZyk7XG5cbiAgICAgICAgdGhpcy5faW5wdXQgPSBjaCArIHRoaXMuX2lucHV0O1xuICAgICAgICB0aGlzLnl5dGV4dCA9IHRoaXMueXl0ZXh0LnN1YnN0cigwLCB0aGlzLnl5dGV4dC5sZW5ndGgtbGVuLTEpO1xuICAgICAgICAvL3RoaXMueXlsZW5nIC09IGxlbjtcbiAgICAgICAgdGhpcy5vZmZzZXQgLT0gbGVuO1xuICAgICAgICB2YXIgb2xkTGluZXMgPSB0aGlzLm1hdGNoLnNwbGl0KC8oPzpcXHJcXG4/fFxcbikvZyk7XG4gICAgICAgIHRoaXMubWF0Y2ggPSB0aGlzLm1hdGNoLnN1YnN0cigwLCB0aGlzLm1hdGNoLmxlbmd0aC0xKTtcbiAgICAgICAgdGhpcy5tYXRjaGVkID0gdGhpcy5tYXRjaGVkLnN1YnN0cigwLCB0aGlzLm1hdGNoZWQubGVuZ3RoLTEpO1xuXG4gICAgICAgIGlmIChsaW5lcy5sZW5ndGgtMSkgdGhpcy55eWxpbmVubyAtPSBsaW5lcy5sZW5ndGgtMTtcbiAgICAgICAgdmFyIHIgPSB0aGlzLnl5bGxvYy5yYW5nZTtcblxuICAgICAgICB0aGlzLnl5bGxvYyA9IHtmaXJzdF9saW5lOiB0aGlzLnl5bGxvYy5maXJzdF9saW5lLFxuICAgICAgICAgIGxhc3RfbGluZTogdGhpcy55eWxpbmVubysxLFxuICAgICAgICAgIGZpcnN0X2NvbHVtbjogdGhpcy55eWxsb2MuZmlyc3RfY29sdW1uLFxuICAgICAgICAgIGxhc3RfY29sdW1uOiBsaW5lcyA/XG4gICAgICAgICAgICAgIChsaW5lcy5sZW5ndGggPT09IG9sZExpbmVzLmxlbmd0aCA/IHRoaXMueXlsbG9jLmZpcnN0X2NvbHVtbiA6IDApICsgb2xkTGluZXNbb2xkTGluZXMubGVuZ3RoIC0gbGluZXMubGVuZ3RoXS5sZW5ndGggLSBsaW5lc1swXS5sZW5ndGg6XG4gICAgICAgICAgICAgIHRoaXMueXlsbG9jLmZpcnN0X2NvbHVtbiAtIGxlblxuICAgICAgICAgIH07XG5cbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5yYW5nZXMpIHtcbiAgICAgICAgICAgIHRoaXMueXlsbG9jLnJhbmdlID0gW3JbMF0sIHJbMF0gKyB0aGlzLnl5bGVuZyAtIGxlbl07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbm1vcmU6ZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9tb3JlID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbmxlc3M6ZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgdGhpcy51bnB1dCh0aGlzLm1hdGNoLnNsaWNlKG4pKTtcbiAgICB9LFxucGFzdElucHV0OmZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHBhc3QgPSB0aGlzLm1hdGNoZWQuc3Vic3RyKDAsIHRoaXMubWF0Y2hlZC5sZW5ndGggLSB0aGlzLm1hdGNoLmxlbmd0aCk7XG4gICAgICAgIHJldHVybiAocGFzdC5sZW5ndGggPiAyMCA/ICcuLi4nOicnKSArIHBhc3Quc3Vic3RyKC0yMCkucmVwbGFjZSgvXFxuL2csIFwiXCIpO1xuICAgIH0sXG51cGNvbWluZ0lucHV0OmZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG5leHQgPSB0aGlzLm1hdGNoO1xuICAgICAgICBpZiAobmV4dC5sZW5ndGggPCAyMCkge1xuICAgICAgICAgICAgbmV4dCArPSB0aGlzLl9pbnB1dC5zdWJzdHIoMCwgMjAtbmV4dC5sZW5ndGgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAobmV4dC5zdWJzdHIoMCwyMCkrKG5leHQubGVuZ3RoID4gMjAgPyAnLi4uJzonJykpLnJlcGxhY2UoL1xcbi9nLCBcIlwiKTtcbiAgICB9LFxuc2hvd1Bvc2l0aW9uOmZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHByZSA9IHRoaXMucGFzdElucHV0KCk7XG4gICAgICAgIHZhciBjID0gbmV3IEFycmF5KHByZS5sZW5ndGggKyAxKS5qb2luKFwiLVwiKTtcbiAgICAgICAgcmV0dXJuIHByZSArIHRoaXMudXBjb21pbmdJbnB1dCgpICsgXCJcXG5cIiArIGMrXCJeXCI7XG4gICAgfSxcbm5leHQ6ZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy5kb25lKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5FT0Y7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLl9pbnB1dCkgdGhpcy5kb25lID0gdHJ1ZTtcblxuICAgICAgICB2YXIgdG9rZW4sXG4gICAgICAgICAgICBtYXRjaCxcbiAgICAgICAgICAgIHRlbXBNYXRjaCxcbiAgICAgICAgICAgIGluZGV4LFxuICAgICAgICAgICAgY29sLFxuICAgICAgICAgICAgbGluZXM7XG4gICAgICAgIGlmICghdGhpcy5fbW9yZSkge1xuICAgICAgICAgICAgdGhpcy55eXRleHQgPSAnJztcbiAgICAgICAgICAgIHRoaXMubWF0Y2ggPSAnJztcbiAgICAgICAgfVxuICAgICAgICB2YXIgcnVsZXMgPSB0aGlzLl9jdXJyZW50UnVsZXMoKTtcbiAgICAgICAgZm9yICh2YXIgaT0wO2kgPCBydWxlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdGVtcE1hdGNoID0gdGhpcy5faW5wdXQubWF0Y2godGhpcy5ydWxlc1tydWxlc1tpXV0pO1xuICAgICAgICAgICAgaWYgKHRlbXBNYXRjaCAmJiAoIW1hdGNoIHx8IHRlbXBNYXRjaFswXS5sZW5ndGggPiBtYXRjaFswXS5sZW5ndGgpKSB7XG4gICAgICAgICAgICAgICAgbWF0Y2ggPSB0ZW1wTWF0Y2g7XG4gICAgICAgICAgICAgICAgaW5kZXggPSBpO1xuICAgICAgICAgICAgICAgIGlmICghdGhpcy5vcHRpb25zLmZsZXgpIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICAgICAgbGluZXMgPSBtYXRjaFswXS5tYXRjaCgvKD86XFxyXFxuP3xcXG4pLiovZyk7XG4gICAgICAgICAgICBpZiAobGluZXMpIHRoaXMueXlsaW5lbm8gKz0gbGluZXMubGVuZ3RoO1xuICAgICAgICAgICAgdGhpcy55eWxsb2MgPSB7Zmlyc3RfbGluZTogdGhpcy55eWxsb2MubGFzdF9saW5lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgbGFzdF9saW5lOiB0aGlzLnl5bGluZW5vKzEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBmaXJzdF9jb2x1bW46IHRoaXMueXlsbG9jLmxhc3RfY29sdW1uLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgbGFzdF9jb2x1bW46IGxpbmVzID8gbGluZXNbbGluZXMubGVuZ3RoLTFdLmxlbmd0aC1saW5lc1tsaW5lcy5sZW5ndGgtMV0ubWF0Y2goL1xccj9cXG4/LylbMF0ubGVuZ3RoIDogdGhpcy55eWxsb2MubGFzdF9jb2x1bW4gKyBtYXRjaFswXS5sZW5ndGh9O1xuICAgICAgICAgICAgdGhpcy55eXRleHQgKz0gbWF0Y2hbMF07XG4gICAgICAgICAgICB0aGlzLm1hdGNoICs9IG1hdGNoWzBdO1xuICAgICAgICAgICAgdGhpcy5tYXRjaGVzID0gbWF0Y2g7XG4gICAgICAgICAgICB0aGlzLnl5bGVuZyA9IHRoaXMueXl0ZXh0Lmxlbmd0aDtcbiAgICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnMucmFuZ2VzKSB7XG4gICAgICAgICAgICAgICAgdGhpcy55eWxsb2MucmFuZ2UgPSBbdGhpcy5vZmZzZXQsIHRoaXMub2Zmc2V0ICs9IHRoaXMueXlsZW5nXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX21vcmUgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuX2lucHV0ID0gdGhpcy5faW5wdXQuc2xpY2UobWF0Y2hbMF0ubGVuZ3RoKTtcbiAgICAgICAgICAgIHRoaXMubWF0Y2hlZCArPSBtYXRjaFswXTtcbiAgICAgICAgICAgIHRva2VuID0gdGhpcy5wZXJmb3JtQWN0aW9uLmNhbGwodGhpcywgdGhpcy55eSwgdGhpcywgcnVsZXNbaW5kZXhdLHRoaXMuY29uZGl0aW9uU3RhY2tbdGhpcy5jb25kaXRpb25TdGFjay5sZW5ndGgtMV0pO1xuICAgICAgICAgICAgaWYgKHRoaXMuZG9uZSAmJiB0aGlzLl9pbnB1dCkgdGhpcy5kb25lID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAodG9rZW4pIHJldHVybiB0b2tlbjtcbiAgICAgICAgICAgIGVsc2UgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLl9pbnB1dCA9PT0gXCJcIikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuRU9GO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyc2VFcnJvcignTGV4aWNhbCBlcnJvciBvbiBsaW5lICcrKHRoaXMueXlsaW5lbm8rMSkrJy4gVW5yZWNvZ25pemVkIHRleHQuXFxuJyt0aGlzLnNob3dQb3NpdGlvbigpLFxuICAgICAgICAgICAgICAgICAgICB7dGV4dDogXCJcIiwgdG9rZW46IG51bGwsIGxpbmU6IHRoaXMueXlsaW5lbm99KTtcbiAgICAgICAgfVxuICAgIH0sXG5sZXg6ZnVuY3Rpb24gbGV4KCkge1xuICAgICAgICB2YXIgciA9IHRoaXMubmV4dCgpO1xuICAgICAgICBpZiAodHlwZW9mIHIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICByZXR1cm4gcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxleCgpO1xuICAgICAgICB9XG4gICAgfSxcbmJlZ2luOmZ1bmN0aW9uIGJlZ2luKGNvbmRpdGlvbikge1xuICAgICAgICB0aGlzLmNvbmRpdGlvblN0YWNrLnB1c2goY29uZGl0aW9uKTtcbiAgICB9LFxucG9wU3RhdGU6ZnVuY3Rpb24gcG9wU3RhdGUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbmRpdGlvblN0YWNrLnBvcCgpO1xuICAgIH0sXG5fY3VycmVudFJ1bGVzOmZ1bmN0aW9uIF9jdXJyZW50UnVsZXMoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbmRpdGlvbnNbdGhpcy5jb25kaXRpb25TdGFja1t0aGlzLmNvbmRpdGlvblN0YWNrLmxlbmd0aC0xXV0ucnVsZXM7XG4gICAgfSxcbnRvcFN0YXRlOmZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29uZGl0aW9uU3RhY2tbdGhpcy5jb25kaXRpb25TdGFjay5sZW5ndGgtMl07XG4gICAgfSxcbnB1c2hTdGF0ZTpmdW5jdGlvbiBiZWdpbihjb25kaXRpb24pIHtcbiAgICAgICAgdGhpcy5iZWdpbihjb25kaXRpb24pO1xuICAgIH19KTtcbmxleGVyLm9wdGlvbnMgPSB7fTtcbmxleGVyLnBlcmZvcm1BY3Rpb24gPSBmdW5jdGlvbiBhbm9ueW1vdXMoeXkseXlfLCRhdm9pZGluZ19uYW1lX2NvbGxpc2lvbnMsWVlfU1RBUlQpIHtcblxuXG5mdW5jdGlvbiBzdHJpcChzdGFydCwgZW5kKSB7XG4gIHJldHVybiB5eV8ueXl0ZXh0ID0geXlfLnl5dGV4dC5zdWJzdHIoc3RhcnQsIHl5Xy55eWxlbmctZW5kKTtcbn1cblxuXG52YXIgWVlTVEFURT1ZWV9TVEFSVFxuc3dpdGNoKCRhdm9pZGluZ19uYW1lX2NvbGxpc2lvbnMpIHtcbmNhc2UgMDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoeXlfLnl5dGV4dC5zbGljZSgtMikgPT09IFwiXFxcXFxcXFxcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0cmlwKDAsMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5iZWdpbihcIm11XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYoeXlfLnl5dGV4dC5zbGljZSgtMSkgPT09IFwiXFxcXFwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyaXAoMCwxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJlZ2luKFwiZW11XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYmVnaW4oXCJtdVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZih5eV8ueXl0ZXh0KSByZXR1cm4gMTQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbmJyZWFrO1xuY2FzZSAxOnJldHVybiAxNDtcbmJyZWFrO1xuY2FzZSAyOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBvcFN0YXRlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAxNDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuYnJlYWs7XG5jYXNlIDM6c3RyaXAoMCw0KTsgdGhpcy5wb3BTdGF0ZSgpOyByZXR1cm4gMTU7XG5icmVhaztcbmNhc2UgNDpyZXR1cm4gMjU7XG5icmVhaztcbmNhc2UgNTpyZXR1cm4gMTY7XG5icmVhaztcbmNhc2UgNjpyZXR1cm4gMjA7XG5icmVhaztcbmNhc2UgNzpyZXR1cm4gMTk7XG5icmVhaztcbmNhc2UgODpyZXR1cm4gMTk7XG5icmVhaztcbmNhc2UgOTpyZXR1cm4gMjM7XG5icmVhaztcbmNhc2UgMTA6cmV0dXJuIDIyO1xuYnJlYWs7XG5jYXNlIDExOnRoaXMucG9wU3RhdGUoKTsgdGhpcy5iZWdpbignY29tJyk7XG5icmVhaztcbmNhc2UgMTI6c3RyaXAoMyw1KTsgdGhpcy5wb3BTdGF0ZSgpOyByZXR1cm4gMTU7XG5icmVhaztcbmNhc2UgMTM6cmV0dXJuIDIyO1xuYnJlYWs7XG5jYXNlIDE0OnJldHVybiAzOTtcbmJyZWFrO1xuY2FzZSAxNTpyZXR1cm4gMzg7XG5icmVhaztcbmNhc2UgMTY6cmV0dXJuIDM4O1xuYnJlYWs7XG5jYXNlIDE3OnJldHVybiA0MjtcbmJyZWFrO1xuY2FzZSAxODovLyBpZ25vcmUgd2hpdGVzcGFjZVxuYnJlYWs7XG5jYXNlIDE5OnRoaXMucG9wU3RhdGUoKTsgcmV0dXJuIDI0O1xuYnJlYWs7XG5jYXNlIDIwOnRoaXMucG9wU3RhdGUoKTsgcmV0dXJuIDE4O1xuYnJlYWs7XG5jYXNlIDIxOnl5Xy55eXRleHQgPSBzdHJpcCgxLDIpLnJlcGxhY2UoL1xcXFxcIi9nLCdcIicpOyByZXR1cm4gMzI7XG5icmVhaztcbmNhc2UgMjI6eXlfLnl5dGV4dCA9IHN0cmlwKDEsMikucmVwbGFjZSgvXFxcXCcvZyxcIidcIik7IHJldHVybiAzMjtcbmJyZWFrO1xuY2FzZSAyMzpyZXR1cm4gNDA7XG5icmVhaztcbmNhc2UgMjQ6cmV0dXJuIDM0O1xuYnJlYWs7XG5jYXNlIDI1OnJldHVybiAzNDtcbmJyZWFrO1xuY2FzZSAyNjpyZXR1cm4gMzM7XG5icmVhaztcbmNhc2UgMjc6cmV0dXJuIDM4O1xuYnJlYWs7XG5jYXNlIDI4Onl5Xy55eXRleHQgPSBzdHJpcCgxLDIpOyByZXR1cm4gMzg7XG5icmVhaztcbmNhc2UgMjk6cmV0dXJuICdJTlZBTElEJztcbmJyZWFrO1xuY2FzZSAzMDpyZXR1cm4gNTtcbmJyZWFrO1xufVxufTtcbmxleGVyLnJ1bGVzID0gWy9eKD86W15cXHgwMF0qPyg/PShcXHtcXHspKSkvLC9eKD86W15cXHgwMF0rKS8sL14oPzpbXlxceDAwXXsyLH0/KD89KFxce1xce3xcXFxcXFx7XFx7fFxcXFxcXFxcXFx7XFx7fCQpKSkvLC9eKD86W1xcc1xcU10qPy0tXFx9XFx9KS8sL14oPzpcXHtcXHsofik/PikvLC9eKD86XFx7XFx7KH4pPyMpLywvXig/Olxce1xceyh+KT9cXC8pLywvXig/Olxce1xceyh+KT9cXF4pLywvXig/Olxce1xceyh+KT9cXHMqZWxzZVxcYikvLC9eKD86XFx7XFx7KH4pP1xceykvLC9eKD86XFx7XFx7KH4pPyYpLywvXig/Olxce1xceyEtLSkvLC9eKD86XFx7XFx7IVtcXHNcXFNdKj9cXH1cXH0pLywvXig/Olxce1xceyh+KT8pLywvXig/Oj0pLywvXig/OlxcLlxcLikvLC9eKD86XFwuKD89KFs9fn1cXHNcXC8uXSkpKS8sL14oPzpbXFwvLl0pLywvXig/OlxccyspLywvXig/OlxcfSh+KT9cXH1cXH0pLywvXig/Oih+KT9cXH1cXH0pLywvXig/OlwiKFxcXFxbXCJdfFteXCJdKSpcIikvLC9eKD86JyhcXFxcWyddfFteJ10pKicpLywvXig/OkApLywvXig/OnRydWUoPz0oW359XFxzXSkpKS8sL14oPzpmYWxzZSg/PShbfn1cXHNdKSkpLywvXig/Oi0/WzAtOV0rKD89KFt+fVxcc10pKSkvLC9eKD86KFteXFxzIVwiIyUtLFxcLlxcLzstPkBcXFstXFxeYFxcey1+XSsoPz0oWz1+fVxcc1xcLy5dKSkpKS8sL14oPzpcXFtbXlxcXV0qXFxdKS8sL14oPzouKS8sL14oPzokKS9dO1xubGV4ZXIuY29uZGl0aW9ucyA9IHtcIm11XCI6e1wicnVsZXNcIjpbNCw1LDYsNyw4LDksMTAsMTEsMTIsMTMsMTQsMTUsMTYsMTcsMTgsMTksMjAsMjEsMjIsMjMsMjQsMjUsMjYsMjcsMjgsMjksMzBdLFwiaW5jbHVzaXZlXCI6ZmFsc2V9LFwiZW11XCI6e1wicnVsZXNcIjpbMl0sXCJpbmNsdXNpdmVcIjpmYWxzZX0sXCJjb21cIjp7XCJydWxlc1wiOlszXSxcImluY2x1c2l2ZVwiOmZhbHNlfSxcIklOSVRJQUxcIjp7XCJydWxlc1wiOlswLDEsMzBdLFwiaW5jbHVzaXZlXCI6dHJ1ZX19O1xucmV0dXJuIGxleGVyO30pKClcbnBhcnNlci5sZXhlciA9IGxleGVyO1xuZnVuY3Rpb24gUGFyc2VyICgpIHsgdGhpcy55eSA9IHt9OyB9UGFyc2VyLnByb3RvdHlwZSA9IHBhcnNlcjtwYXJzZXIuUGFyc2VyID0gUGFyc2VyO1xucmV0dXJuIG5ldyBQYXJzZXI7XG59KSgpO2V4cG9ydHNbXCJkZWZhdWx0XCJdID0gaGFuZGxlYmFycztcbi8qIGpzaGludCBpZ25vcmU6ZW5kICovIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBlcnJvclByb3BzID0gWydkZXNjcmlwdGlvbicsICdmaWxlTmFtZScsICdsaW5lTnVtYmVyJywgJ21lc3NhZ2UnLCAnbmFtZScsICdudW1iZXInLCAnc3RhY2snXTtcblxuZnVuY3Rpb24gRXhjZXB0aW9uKC8qIG1lc3NhZ2UgKi8pIHtcbiAgdmFyIHRtcCA9IEVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3Rvci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gIC8vIFVuZm9ydHVuYXRlbHkgZXJyb3JzIGFyZSBub3QgZW51bWVyYWJsZSBpbiBDaHJvbWUgKGF0IGxlYXN0KSwgc28gYGZvciBwcm9wIGluIHRtcGAgZG9lc24ndCB3b3JrLlxuICBmb3IgKHZhciBpZHggPSAwOyBpZHggPCBlcnJvclByb3BzLmxlbmd0aDsgaWR4KyspIHtcbiAgICB0aGlzW2Vycm9yUHJvcHNbaWR4XV0gPSB0bXBbZXJyb3JQcm9wc1tpZHhdXTtcbiAgfVxufVxuXG5FeGNlcHRpb24ucHJvdG90eXBlID0gbmV3IEVycm9yKCk7XG5cbmV4cG9ydHNbXCJkZWZhdWx0XCJdID0gRXhjZXB0aW9uOyIsIlwidXNlIHN0cmljdFwiO1xudmFyIFV0aWxzID0gcmVxdWlyZShcIi4vdXRpbHNcIik7XG52YXIgRXhjZXB0aW9uID0gcmVxdWlyZShcIi4vZXhjZXB0aW9uXCIpW1wiZGVmYXVsdFwiXTtcbnZhciBDT01QSUxFUl9SRVZJU0lPTiA9IHJlcXVpcmUoXCIuL2Jhc2VcIikuQ09NUElMRVJfUkVWSVNJT047XG52YXIgUkVWSVNJT05fQ0hBTkdFUyA9IHJlcXVpcmUoXCIuL2Jhc2VcIikuUkVWSVNJT05fQ0hBTkdFUztcblxuZnVuY3Rpb24gY2hlY2tSZXZpc2lvbihjb21waWxlckluZm8pIHtcbiAgdmFyIGNvbXBpbGVyUmV2aXNpb24gPSBjb21waWxlckluZm8gJiYgY29tcGlsZXJJbmZvWzBdIHx8IDEsXG4gICAgICBjdXJyZW50UmV2aXNpb24gPSBDT01QSUxFUl9SRVZJU0lPTjtcblxuICBpZiAoY29tcGlsZXJSZXZpc2lvbiAhPT0gY3VycmVudFJldmlzaW9uKSB7XG4gICAgaWYgKGNvbXBpbGVyUmV2aXNpb24gPCBjdXJyZW50UmV2aXNpb24pIHtcbiAgICAgIHZhciBydW50aW1lVmVyc2lvbnMgPSBSRVZJU0lPTl9DSEFOR0VTW2N1cnJlbnRSZXZpc2lvbl0sXG4gICAgICAgICAgY29tcGlsZXJWZXJzaW9ucyA9IFJFVklTSU9OX0NIQU5HRVNbY29tcGlsZXJSZXZpc2lvbl07XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUZW1wbGF0ZSB3YXMgcHJlY29tcGlsZWQgd2l0aCBhbiBvbGRlciB2ZXJzaW9uIG9mIEhhbmRsZWJhcnMgdGhhbiB0aGUgY3VycmVudCBydW50aW1lLiBcIitcbiAgICAgICAgICAgIFwiUGxlYXNlIHVwZGF0ZSB5b3VyIHByZWNvbXBpbGVyIHRvIGEgbmV3ZXIgdmVyc2lvbiAoXCIrcnVudGltZVZlcnNpb25zK1wiKSBvciBkb3duZ3JhZGUgeW91ciBydW50aW1lIHRvIGFuIG9sZGVyIHZlcnNpb24gKFwiK2NvbXBpbGVyVmVyc2lvbnMrXCIpLlwiKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVXNlIHRoZSBlbWJlZGRlZCB2ZXJzaW9uIGluZm8gc2luY2UgdGhlIHJ1bnRpbWUgZG9lc24ndCBrbm93IGFib3V0IHRoaXMgcmV2aXNpb24geWV0XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUZW1wbGF0ZSB3YXMgcHJlY29tcGlsZWQgd2l0aCBhIG5ld2VyIHZlcnNpb24gb2YgSGFuZGxlYmFycyB0aGFuIHRoZSBjdXJyZW50IHJ1bnRpbWUuIFwiK1xuICAgICAgICAgICAgXCJQbGVhc2UgdXBkYXRlIHlvdXIgcnVudGltZSB0byBhIG5ld2VyIHZlcnNpb24gKFwiK2NvbXBpbGVySW5mb1sxXStcIikuXCIpO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnRzLmNoZWNrUmV2aXNpb24gPSBjaGVja1JldmlzaW9uOy8vIFRPRE86IFJlbW92ZSB0aGlzIGxpbmUgYW5kIGJyZWFrIHVwIGNvbXBpbGVQYXJ0aWFsXG5cbmZ1bmN0aW9uIHRlbXBsYXRlKHRlbXBsYXRlU3BlYywgZW52KSB7XG4gIGlmICghZW52KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm8gZW52aXJvbm1lbnQgcGFzc2VkIHRvIHRlbXBsYXRlXCIpO1xuICB9XG5cbiAgLy8gTm90ZTogVXNpbmcgZW52LlZNIHJlZmVyZW5jZXMgcmF0aGVyIHRoYW4gbG9jYWwgdmFyIHJlZmVyZW5jZXMgdGhyb3VnaG91dCB0aGlzIHNlY3Rpb24gdG8gYWxsb3dcbiAgLy8gZm9yIGV4dGVybmFsIHVzZXJzIHRvIG92ZXJyaWRlIHRoZXNlIGFzIHBzdWVkby1zdXBwb3J0ZWQgQVBJcy5cbiAgdmFyIGludm9rZVBhcnRpYWxXcmFwcGVyID0gZnVuY3Rpb24ocGFydGlhbCwgbmFtZSwgY29udGV4dCwgaGVscGVycywgcGFydGlhbHMsIGRhdGEpIHtcbiAgICB2YXIgcmVzdWx0ID0gZW52LlZNLmludm9rZVBhcnRpYWwuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBpZiAocmVzdWx0ICE9IG51bGwpIHsgcmV0dXJuIHJlc3VsdDsgfVxuXG4gICAgaWYgKGVudi5jb21waWxlKSB7XG4gICAgICB2YXIgb3B0aW9ucyA9IHsgaGVscGVyczogaGVscGVycywgcGFydGlhbHM6IHBhcnRpYWxzLCBkYXRhOiBkYXRhIH07XG4gICAgICBwYXJ0aWFsc1tuYW1lXSA9IGVudi5jb21waWxlKHBhcnRpYWwsIHsgZGF0YTogZGF0YSAhPT0gdW5kZWZpbmVkIH0sIGVudik7XG4gICAgICByZXR1cm4gcGFydGlhbHNbbmFtZV0oY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oXCJUaGUgcGFydGlhbCBcIiArIG5hbWUgKyBcIiBjb3VsZCBub3QgYmUgY29tcGlsZWQgd2hlbiBydW5uaW5nIGluIHJ1bnRpbWUtb25seSBtb2RlXCIpO1xuICAgIH1cbiAgfTtcblxuICAvLyBKdXN0IGFkZCB3YXRlclxuICB2YXIgY29udGFpbmVyID0ge1xuICAgIGVzY2FwZUV4cHJlc3Npb246IFV0aWxzLmVzY2FwZUV4cHJlc3Npb24sXG4gICAgaW52b2tlUGFydGlhbDogaW52b2tlUGFydGlhbFdyYXBwZXIsXG4gICAgcHJvZ3JhbXM6IFtdLFxuICAgIHByb2dyYW06IGZ1bmN0aW9uKGksIGZuLCBkYXRhKSB7XG4gICAgICB2YXIgcHJvZ3JhbVdyYXBwZXIgPSB0aGlzLnByb2dyYW1zW2ldO1xuICAgICAgaWYoZGF0YSkge1xuICAgICAgICBwcm9ncmFtV3JhcHBlciA9IHByb2dyYW0oaSwgZm4sIGRhdGEpO1xuICAgICAgfSBlbHNlIGlmICghcHJvZ3JhbVdyYXBwZXIpIHtcbiAgICAgICAgcHJvZ3JhbVdyYXBwZXIgPSB0aGlzLnByb2dyYW1zW2ldID0gcHJvZ3JhbShpLCBmbik7XG4gICAgICB9XG4gICAgICByZXR1cm4gcHJvZ3JhbVdyYXBwZXI7XG4gICAgfSxcbiAgICBtZXJnZTogZnVuY3Rpb24ocGFyYW0sIGNvbW1vbikge1xuICAgICAgdmFyIHJldCA9IHBhcmFtIHx8IGNvbW1vbjtcblxuICAgICAgaWYgKHBhcmFtICYmIGNvbW1vbiAmJiAocGFyYW0gIT09IGNvbW1vbikpIHtcbiAgICAgICAgcmV0ID0ge307XG4gICAgICAgIFV0aWxzLmV4dGVuZChyZXQsIGNvbW1vbik7XG4gICAgICAgIFV0aWxzLmV4dGVuZChyZXQsIHBhcmFtKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXQ7XG4gICAgfSxcbiAgICBwcm9ncmFtV2l0aERlcHRoOiBlbnYuVk0ucHJvZ3JhbVdpdGhEZXB0aCxcbiAgICBub29wOiBlbnYuVk0ubm9vcCxcbiAgICBjb21waWxlckluZm86IG51bGxcbiAgfTtcblxuICByZXR1cm4gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHZhciBuYW1lc3BhY2UgPSBvcHRpb25zLnBhcnRpYWwgPyBvcHRpb25zIDogZW52LFxuICAgICAgICBoZWxwZXJzLFxuICAgICAgICBwYXJ0aWFscztcblxuICAgIGlmICghb3B0aW9ucy5wYXJ0aWFsKSB7XG4gICAgICBoZWxwZXJzID0gb3B0aW9ucy5oZWxwZXJzO1xuICAgICAgcGFydGlhbHMgPSBvcHRpb25zLnBhcnRpYWxzO1xuICAgIH1cbiAgICB2YXIgcmVzdWx0ID0gdGVtcGxhdGVTcGVjLmNhbGwoXG4gICAgICAgICAgY29udGFpbmVyLFxuICAgICAgICAgIG5hbWVzcGFjZSwgY29udGV4dCxcbiAgICAgICAgICBoZWxwZXJzLFxuICAgICAgICAgIHBhcnRpYWxzLFxuICAgICAgICAgIG9wdGlvbnMuZGF0YSk7XG5cbiAgICBpZiAoIW9wdGlvbnMucGFydGlhbCkge1xuICAgICAgZW52LlZNLmNoZWNrUmV2aXNpb24oY29udGFpbmVyLmNvbXBpbGVySW5mbyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcbn1cblxuZXhwb3J0cy50ZW1wbGF0ZSA9IHRlbXBsYXRlO2Z1bmN0aW9uIHByb2dyYW1XaXRoRGVwdGgoaSwgZm4sIGRhdGEgLyosICRkZXB0aCAqLykge1xuICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMyk7XG5cbiAgdmFyIHByb2cgPSBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgW2NvbnRleHQsIG9wdGlvbnMuZGF0YSB8fCBkYXRhXS5jb25jYXQoYXJncykpO1xuICB9O1xuICBwcm9nLnByb2dyYW0gPSBpO1xuICBwcm9nLmRlcHRoID0gYXJncy5sZW5ndGg7XG4gIHJldHVybiBwcm9nO1xufVxuXG5leHBvcnRzLnByb2dyYW1XaXRoRGVwdGggPSBwcm9ncmFtV2l0aERlcHRoO2Z1bmN0aW9uIHByb2dyYW0oaSwgZm4sIGRhdGEpIHtcbiAgdmFyIHByb2cgPSBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICByZXR1cm4gZm4oY29udGV4dCwgb3B0aW9ucy5kYXRhIHx8IGRhdGEpO1xuICB9O1xuICBwcm9nLnByb2dyYW0gPSBpO1xuICBwcm9nLmRlcHRoID0gMDtcbiAgcmV0dXJuIHByb2c7XG59XG5cbmV4cG9ydHMucHJvZ3JhbSA9IHByb2dyYW07ZnVuY3Rpb24gaW52b2tlUGFydGlhbChwYXJ0aWFsLCBuYW1lLCBjb250ZXh0LCBoZWxwZXJzLCBwYXJ0aWFscywgZGF0YSkge1xuICB2YXIgb3B0aW9ucyA9IHsgcGFydGlhbDogdHJ1ZSwgaGVscGVyczogaGVscGVycywgcGFydGlhbHM6IHBhcnRpYWxzLCBkYXRhOiBkYXRhIH07XG5cbiAgaWYocGFydGlhbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcIlRoZSBwYXJ0aWFsIFwiICsgbmFtZSArIFwiIGNvdWxkIG5vdCBiZSBmb3VuZFwiKTtcbiAgfSBlbHNlIGlmKHBhcnRpYWwgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgIHJldHVybiBwYXJ0aWFsKGNvbnRleHQsIG9wdGlvbnMpO1xuICB9XG59XG5cbmV4cG9ydHMuaW52b2tlUGFydGlhbCA9IGludm9rZVBhcnRpYWw7ZnVuY3Rpb24gbm9vcCgpIHsgcmV0dXJuIFwiXCI7IH1cblxuZXhwb3J0cy5ub29wID0gbm9vcDsiLCJcInVzZSBzdHJpY3RcIjtcbi8vIEJ1aWxkIG91dCBvdXIgYmFzaWMgU2FmZVN0cmluZyB0eXBlXG5mdW5jdGlvbiBTYWZlU3RyaW5nKHN0cmluZykge1xuICB0aGlzLnN0cmluZyA9IHN0cmluZztcbn1cblxuU2FmZVN0cmluZy5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIFwiXCIgKyB0aGlzLnN0cmluZztcbn07XG5cbmV4cG9ydHNbXCJkZWZhdWx0XCJdID0gU2FmZVN0cmluZzsiLCJcInVzZSBzdHJpY3RcIjtcbi8qanNoaW50IC1XMDA0ICovXG52YXIgU2FmZVN0cmluZyA9IHJlcXVpcmUoXCIuL3NhZmUtc3RyaW5nXCIpW1wiZGVmYXVsdFwiXTtcblxudmFyIGVzY2FwZSA9IHtcbiAgXCImXCI6IFwiJmFtcDtcIixcbiAgXCI8XCI6IFwiJmx0O1wiLFxuICBcIj5cIjogXCImZ3Q7XCIsXG4gICdcIic6IFwiJnF1b3Q7XCIsXG4gIFwiJ1wiOiBcIiYjeDI3O1wiLFxuICBcImBcIjogXCImI3g2MDtcIlxufTtcblxudmFyIGJhZENoYXJzID0gL1smPD5cIidgXS9nO1xudmFyIHBvc3NpYmxlID0gL1smPD5cIidgXS87XG5cbmZ1bmN0aW9uIGVzY2FwZUNoYXIoY2hyKSB7XG4gIHJldHVybiBlc2NhcGVbY2hyXSB8fCBcIiZhbXA7XCI7XG59XG5cbmZ1bmN0aW9uIGV4dGVuZChvYmosIHZhbHVlKSB7XG4gIGZvcih2YXIga2V5IGluIHZhbHVlKSB7XG4gICAgaWYoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHZhbHVlLCBrZXkpKSB7XG4gICAgICBvYmpba2V5XSA9IHZhbHVlW2tleV07XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydHMuZXh0ZW5kID0gZXh0ZW5kO3ZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5leHBvcnRzLnRvU3RyaW5nID0gdG9TdHJpbmc7XG4vLyBTb3VyY2VkIGZyb20gbG9kYXNoXG4vLyBodHRwczovL2dpdGh1Yi5jb20vYmVzdGllanMvbG9kYXNoL2Jsb2IvbWFzdGVyL0xJQ0VOU0UudHh0XG52YXIgaXNGdW5jdGlvbiA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbic7XG59O1xuLy8gZmFsbGJhY2sgZm9yIG9sZGVyIHZlcnNpb25zIG9mIENocm9tZSBhbmQgU2FmYXJpXG5pZiAoaXNGdW5jdGlvbigveC8pKSB7XG4gIGlzRnVuY3Rpb24gPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbicgJiYgdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG4gIH07XG59XG52YXIgaXNGdW5jdGlvbjtcbmV4cG9ydHMuaXNGdW5jdGlvbiA9IGlzRnVuY3Rpb247XG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSA/IHRvU3RyaW5nLmNhbGwodmFsdWUpID09PSAnW29iamVjdCBBcnJheV0nIDogZmFsc2U7XG59O1xuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheTtcblxuZnVuY3Rpb24gZXNjYXBlRXhwcmVzc2lvbihzdHJpbmcpIHtcbiAgLy8gZG9uJ3QgZXNjYXBlIFNhZmVTdHJpbmdzLCBzaW5jZSB0aGV5J3JlIGFscmVhZHkgc2FmZVxuICBpZiAoc3RyaW5nIGluc3RhbmNlb2YgU2FmZVN0cmluZykge1xuICAgIHJldHVybiBzdHJpbmcudG9TdHJpbmcoKTtcbiAgfSBlbHNlIGlmICghc3RyaW5nICYmIHN0cmluZyAhPT0gMCkge1xuICAgIHJldHVybiBcIlwiO1xuICB9XG5cbiAgLy8gRm9yY2UgYSBzdHJpbmcgY29udmVyc2lvbiBhcyB0aGlzIHdpbGwgYmUgZG9uZSBieSB0aGUgYXBwZW5kIHJlZ2FyZGxlc3MgYW5kXG4gIC8vIHRoZSByZWdleCB0ZXN0IHdpbGwgZG8gdGhpcyB0cmFuc3BhcmVudGx5IGJlaGluZCB0aGUgc2NlbmVzLCBjYXVzaW5nIGlzc3VlcyBpZlxuICAvLyBhbiBvYmplY3QncyB0byBzdHJpbmcgaGFzIGVzY2FwZWQgY2hhcmFjdGVycyBpbiBpdC5cbiAgc3RyaW5nID0gXCJcIiArIHN0cmluZztcblxuICBpZighcG9zc2libGUudGVzdChzdHJpbmcpKSB7IHJldHVybiBzdHJpbmc7IH1cbiAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKGJhZENoYXJzLCBlc2NhcGVDaGFyKTtcbn1cblxuZXhwb3J0cy5lc2NhcGVFeHByZXNzaW9uID0gZXNjYXBlRXhwcmVzc2lvbjtmdW5jdGlvbiBpc0VtcHR5KHZhbHVlKSB7XG4gIGlmICghdmFsdWUgJiYgdmFsdWUgIT09IDApIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIGlmIChpc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuZXhwb3J0cy5pc0VtcHR5ID0gaXNFbXB0eTsiLCJ2YXIgVG9rZW5pemVyID0gcmVxdWlyZShcIi4vVG9rZW5pemVyLmpzXCIpO1xuXG4vKlxuXHRPcHRpb25zOlxuXG5cdHhtbE1vZGU6IFNwZWNpYWwgYmVoYXZpb3IgZm9yIHNjcmlwdC9zdHlsZSB0YWdzICh0cnVlIGJ5IGRlZmF1bHQpXG5cdGxvd2VyQ2FzZUF0dHJpYnV0ZU5hbWVzOiBjYWxsIC50b0xvd2VyQ2FzZSBmb3IgZWFjaCBhdHRyaWJ1dGUgbmFtZSAodHJ1ZSBpZiB4bWxNb2RlIGlzIGBmYWxzZWApXG5cdGxvd2VyQ2FzZVRhZ3M6IGNhbGwgLnRvTG93ZXJDYXNlIGZvciBlYWNoIHRhZyBuYW1lICh0cnVlIGlmIHhtbE1vZGUgaXMgYGZhbHNlYClcbiovXG5cbi8qXG5cdENhbGxiYWNrczpcblxuXHRvbmNkYXRhZW5kLFxuXHRvbmNkYXRhc3RhcnQsXG5cdG9uY2xvc2V0YWcsXG5cdG9uY29tbWVudCxcblx0b25jb21tZW50ZW5kLFxuXHRvbmVycm9yLFxuXHRvbm9wZW50YWcsXG5cdG9ucHJvY2Vzc2luZ2luc3RydWN0aW9uLFxuXHRvbnJlc2V0LFxuXHRvbnRleHRcbiovXG5cbnZhciBmb3JtVGFncyA9IHtcblx0aW5wdXQ6IHRydWUsXG5cdG9wdGlvbjogdHJ1ZSxcblx0b3B0Z3JvdXA6IHRydWUsXG5cdHNlbGVjdDogdHJ1ZSxcblx0YnV0dG9uOiB0cnVlLFxuXHRkYXRhbGlzdDogdHJ1ZSxcblx0dGV4dGFyZWE6IHRydWVcbn07XG5cbnZhciBvcGVuSW1wbGllc0Nsb3NlID0ge1xuXHR0ciAgICAgIDogeyB0cjp0cnVlLCB0aDp0cnVlLCB0ZDp0cnVlIH0sXG5cdHRoICAgICAgOiB7IHRoOnRydWUgfSxcblx0dGQgICAgICA6IHsgdGhlYWQ6dHJ1ZSwgdGQ6dHJ1ZSB9LFxuXHRib2R5ICAgIDogeyBoZWFkOnRydWUsIGxpbms6dHJ1ZSwgc2NyaXB0OnRydWUgfSxcblx0bGkgICAgICA6IHsgbGk6dHJ1ZSB9LFxuXHRwICAgICAgIDogeyBwOnRydWUgfSxcblx0c2VsZWN0ICA6IGZvcm1UYWdzLFxuXHRpbnB1dCAgIDogZm9ybVRhZ3MsXG5cdG91dHB1dCAgOiBmb3JtVGFncyxcblx0YnV0dG9uICA6IGZvcm1UYWdzLFxuXHRkYXRhbGlzdDogZm9ybVRhZ3MsXG5cdHRleHRhcmVhOiBmb3JtVGFncyxcblx0b3B0aW9uICA6IHsgb3B0aW9uOnRydWUgfSxcblx0b3B0Z3JvdXA6IHsgb3B0Z3JvdXA6dHJ1ZSB9XG59O1xuXG52YXIgdm9pZEVsZW1lbnRzID0ge1xuXHRfX3Byb3RvX186IG51bGwsXG5cdGFyZWE6IHRydWUsXG5cdGJhc2U6IHRydWUsXG5cdGJhc2Vmb250OiB0cnVlLFxuXHRicjogdHJ1ZSxcblx0Y29sOiB0cnVlLFxuXHRjb21tYW5kOiB0cnVlLFxuXHRlbWJlZDogdHJ1ZSxcblx0ZnJhbWU6IHRydWUsXG5cdGhyOiB0cnVlLFxuXHRpbWc6IHRydWUsXG5cdGlucHV0OiB0cnVlLFxuXHRpc2luZGV4OiB0cnVlLFxuXHRrZXlnZW46IHRydWUsXG5cdGxpbms6IHRydWUsXG5cdG1ldGE6IHRydWUsXG5cdHBhcmFtOiB0cnVlLFxuXHRzb3VyY2U6IHRydWUsXG5cdHRyYWNrOiB0cnVlLFxuXHR3YnI6IHRydWVcbn07XG5cbnZhciByZV9uYW1lRW5kID0gL1xcc3xcXC8vO1xuXG5mdW5jdGlvbiBQYXJzZXIoY2JzLCBvcHRpb25zKXtcblx0dGhpcy5fb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cdHRoaXMuX2NicyA9IGNicyB8fCB7fTtcblxuXHR0aGlzLl90YWduYW1lID0gXCJcIjtcblx0dGhpcy5fYXR0cmlibmFtZSA9IFwiXCI7XG5cdHRoaXMuX2F0dHJpYnZhbHVlID0gXCJcIjtcblx0dGhpcy5fYXR0cmlicyA9IG51bGw7XG5cdHRoaXMuX3N0YWNrID0gW107XG5cdHRoaXMuX2RvbmUgPSBmYWxzZTtcblxuXHR0aGlzLnN0YXJ0SW5kZXggPSAwO1xuXHR0aGlzLmVuZEluZGV4ID0gbnVsbDtcblxuXHR0aGlzLl90b2tlbml6ZXIgPSBuZXcgVG9rZW5pemVyKG9wdGlvbnMsIHRoaXMpO1xufVxuXG5yZXF1aXJlKFwidXRpbFwiKS5pbmhlcml0cyhQYXJzZXIsIHJlcXVpcmUoXCJldmVudHNcIikuRXZlbnRFbWl0dGVyKTtcblxuUGFyc2VyLnByb3RvdHlwZS5fdXBkYXRlUG9zaXRpb24gPSBmdW5jdGlvbihpbml0aWFsT2Zmc2V0KXtcblx0aWYodGhpcy5lbmRJbmRleCA9PT0gbnVsbCl7XG5cdFx0dGhpcy5zdGFydEluZGV4ID0gdGhpcy5fdG9rZW5pemVyLl9zZWN0aW9uU3RhcnQgPD0gaW5pdGlhbE9mZnNldCA/IDAgOiB0aGlzLl90b2tlbml6ZXIuX3NlY3Rpb25TdGFydCAtIGluaXRpYWxPZmZzZXQ7XG5cdH1cblx0dGhpcy5zdGFydEluZGV4ID0gdGhpcy5lbmRJbmRleCArIDE7XG5cdHRoaXMuZW5kSW5kZXggPSB0aGlzLl90b2tlbml6ZXIuX2luZGV4O1xufTtcblxuLy9Ub2tlbml6ZXIgZXZlbnQgaGFuZGxlcnNcblBhcnNlci5wcm90b3R5cGUub250ZXh0ID0gZnVuY3Rpb24oZGF0YSl7XG5cdHRoaXMuX3VwZGF0ZVBvc2l0aW9uKDEpO1xuXHR0aGlzLmVuZEluZGV4LS07XG5cblx0aWYodGhpcy5fY2JzLm9udGV4dCkgdGhpcy5fY2JzLm9udGV4dChkYXRhKTtcbn07XG5cblBhcnNlci5wcm90b3R5cGUub25vcGVudGFnbmFtZSA9IGZ1bmN0aW9uKG5hbWUpe1xuXHRpZighKHRoaXMuX29wdGlvbnMueG1sTW9kZSB8fCBcImxvd2VyQ2FzZVRhZ3NcIiBpbiB0aGlzLl9vcHRpb25zKSB8fCB0aGlzLl9vcHRpb25zLmxvd2VyQ2FzZVRhZ3Mpe1xuXHRcdG5hbWUgPSBuYW1lLnRvTG93ZXJDYXNlKCk7XG5cdH1cblxuXHR0aGlzLl90YWduYW1lID0gbmFtZTtcblxuXHRpZiAoIXRoaXMuX29wdGlvbnMueG1sTW9kZSAmJiBuYW1lIGluIG9wZW5JbXBsaWVzQ2xvc2UpIHtcblx0XHRmb3IoXG5cdFx0XHR2YXIgZWw7XG5cdFx0XHQoZWwgPSB0aGlzLl9zdGFja1t0aGlzLl9zdGFjay5sZW5ndGgtMV0pIGluIG9wZW5JbXBsaWVzQ2xvc2VbbmFtZV07XG5cdFx0XHR0aGlzLm9uY2xvc2V0YWcoZWwpXG5cdFx0KTtcblx0fVxuXG5cdGlmKHRoaXMuX29wdGlvbnMueG1sTW9kZSB8fCAhKG5hbWUgaW4gdm9pZEVsZW1lbnRzKSl7XG5cdFx0dGhpcy5fc3RhY2sucHVzaChuYW1lKTtcblx0fVxuXG5cdGlmKHRoaXMuX2Nicy5vbm9wZW50YWduYW1lKSB0aGlzLl9jYnMub25vcGVudGFnbmFtZShuYW1lKTtcblx0aWYodGhpcy5fY2JzLm9ub3BlbnRhZykgdGhpcy5fYXR0cmlicyA9IHt9O1xufTtcblxuUGFyc2VyLnByb3RvdHlwZS5vbm9wZW50YWdlbmQgPSBmdW5jdGlvbigpe1xuXHR0aGlzLl91cGRhdGVQb3NpdGlvbigxKTtcbiAgICBcblx0aWYodGhpcy5fYXR0cmlicyl7XG5cdFx0aWYodGhpcy5fY2JzLm9ub3BlbnRhZykgdGhpcy5fY2JzLm9ub3BlbnRhZyh0aGlzLl90YWduYW1lLCB0aGlzLl9hdHRyaWJzKTtcblx0XHR0aGlzLl9hdHRyaWJzID0gbnVsbDtcblx0fVxuICAgIFxuXHRpZighdGhpcy5fb3B0aW9ucy54bWxNb2RlICYmIHRoaXMuX2Nicy5vbmNsb3NldGFnICYmIHRoaXMuX3RhZ25hbWUgaW4gdm9pZEVsZW1lbnRzKXtcblx0XHR0aGlzLl9jYnMub25jbG9zZXRhZyh0aGlzLl90YWduYW1lKTtcblx0fVxuICAgIFxuXHR0aGlzLl90YWduYW1lID0gXCJcIjtcbn07XG5cblBhcnNlci5wcm90b3R5cGUub25jbG9zZXRhZyA9IGZ1bmN0aW9uKG5hbWUpe1xuXHR0aGlzLl91cGRhdGVQb3NpdGlvbigxKTtcblxuXHRpZighKHRoaXMuX29wdGlvbnMueG1sTW9kZSB8fCBcImxvd2VyQ2FzZVRhZ3NcIiBpbiB0aGlzLl9vcHRpb25zKSB8fCB0aGlzLl9vcHRpb25zLmxvd2VyQ2FzZVRhZ3Mpe1xuXHRcdG5hbWUgPSBuYW1lLnRvTG93ZXJDYXNlKCk7XG5cdH1cblxuXHRpZih0aGlzLl9zdGFjay5sZW5ndGggJiYgKCEobmFtZSBpbiB2b2lkRWxlbWVudHMpIHx8IHRoaXMuX29wdGlvbnMueG1sTW9kZSkpe1xuXHRcdHZhciBwb3MgPSB0aGlzLl9zdGFjay5sYXN0SW5kZXhPZihuYW1lKTtcblx0XHRpZihwb3MgIT09IC0xKXtcblx0XHRcdGlmKHRoaXMuX2Nicy5vbmNsb3NldGFnKXtcblx0XHRcdFx0cG9zID0gdGhpcy5fc3RhY2subGVuZ3RoIC0gcG9zO1xuXHRcdFx0XHR3aGlsZShwb3MtLSkgdGhpcy5fY2JzLm9uY2xvc2V0YWcodGhpcy5fc3RhY2sucG9wKCkpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB0aGlzLl9zdGFjay5sZW5ndGggPSBwb3M7XG5cdFx0fSBlbHNlIGlmKG5hbWUgPT09IFwicFwiICYmICF0aGlzLl9vcHRpb25zLnhtbE1vZGUpe1xuXHRcdFx0dGhpcy5vbm9wZW50YWduYW1lKG5hbWUpO1xuXHRcdFx0dGhpcy5fY2xvc2VDdXJyZW50VGFnKCk7XG5cdFx0fVxuXHR9IGVsc2UgaWYoIXRoaXMuX29wdGlvbnMueG1sTW9kZSAmJiAobmFtZSA9PT0gXCJiclwiIHx8IG5hbWUgPT09IFwicFwiKSl7XG5cdFx0dGhpcy5vbm9wZW50YWduYW1lKG5hbWUpO1xuXHRcdHRoaXMuX2Nsb3NlQ3VycmVudFRhZygpO1xuXHR9XG59O1xuXG5QYXJzZXIucHJvdG90eXBlLm9uc2VsZmNsb3Npbmd0YWcgPSBmdW5jdGlvbigpe1xuXHRpZih0aGlzLl9vcHRpb25zLnhtbE1vZGUpe1xuXHRcdHRoaXMuX2Nsb3NlQ3VycmVudFRhZygpO1xuXHR9IGVsc2Uge1xuXHRcdHRoaXMub25vcGVudGFnZW5kKCk7XG5cdH1cbn07XG5cblBhcnNlci5wcm90b3R5cGUuX2Nsb3NlQ3VycmVudFRhZyA9IGZ1bmN0aW9uKCl7XG5cdHZhciBuYW1lID0gdGhpcy5fdGFnbmFtZTtcblxuXHR0aGlzLm9ub3BlbnRhZ2VuZCgpO1xuXG5cdC8vc2VsZi1jbG9zaW5nIHRhZ3Mgd2lsbCBiZSBvbiB0aGUgdG9wIG9mIHRoZSBzdGFja1xuXHQvLyhjaGVhcGVyIGNoZWNrIHRoYW4gaW4gb25jbG9zZXRhZylcblx0aWYodGhpcy5fc3RhY2tbdGhpcy5fc3RhY2subGVuZ3RoLTFdID09PSBuYW1lKXtcblx0XHRpZih0aGlzLl9jYnMub25jbG9zZXRhZyl7XG5cdFx0XHR0aGlzLl9jYnMub25jbG9zZXRhZyhuYW1lKTtcblx0XHR9XG5cdFx0dGhpcy5fc3RhY2sucG9wKCk7XG5cdH1cbn07XG5cblBhcnNlci5wcm90b3R5cGUub25hdHRyaWJuYW1lID0gZnVuY3Rpb24obmFtZSl7XG5cdGlmKCEodGhpcy5fb3B0aW9ucy54bWxNb2RlIHx8IFwibG93ZXJDYXNlQXR0cmlidXRlTmFtZXNcIiBpbiB0aGlzLl9vcHRpb25zKSB8fCB0aGlzLl9vcHRpb25zLmxvd2VyQ2FzZUF0dHJpYnV0ZU5hbWVzKXtcblx0XHRuYW1lID0gbmFtZS50b0xvd2VyQ2FzZSgpO1xuXHR9XG5cdHRoaXMuX2F0dHJpYm5hbWUgPSBuYW1lO1xufTtcblxuUGFyc2VyLnByb3RvdHlwZS5vbmF0dHJpYmRhdGEgPSBmdW5jdGlvbih2YWx1ZSl7XG5cdHRoaXMuX2F0dHJpYnZhbHVlICs9IHZhbHVlO1xufTtcblxuUGFyc2VyLnByb3RvdHlwZS5vbmF0dHJpYmVuZCA9IGZ1bmN0aW9uKCl7XG5cdGlmKHRoaXMuX2Nicy5vbmF0dHJpYnV0ZSkgdGhpcy5fY2JzLm9uYXR0cmlidXRlKHRoaXMuX2F0dHJpYm5hbWUsIHRoaXMuX2F0dHJpYnZhbHVlKTtcblx0aWYoXG5cdFx0dGhpcy5fYXR0cmlicyAmJlxuXHRcdCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwodGhpcy5fYXR0cmlicywgdGhpcy5fYXR0cmlibmFtZSlcblx0KXtcblx0XHR0aGlzLl9hdHRyaWJzW3RoaXMuX2F0dHJpYm5hbWVdID0gdGhpcy5fYXR0cmlidmFsdWU7XG5cdH1cblx0dGhpcy5fYXR0cmlibmFtZSA9IFwiXCI7XG5cdHRoaXMuX2F0dHJpYnZhbHVlID0gXCJcIjtcbn07XG5cblBhcnNlci5wcm90b3R5cGUub25kZWNsYXJhdGlvbiA9IGZ1bmN0aW9uKHZhbHVlKXtcblx0aWYodGhpcy5fY2JzLm9ucHJvY2Vzc2luZ2luc3RydWN0aW9uKXtcblx0XHR2YXIgaWR4ID0gdmFsdWUuc2VhcmNoKHJlX25hbWVFbmQpLFxuXHRcdCAgICBuYW1lID0gaWR4IDwgMCA/IHZhbHVlIDogdmFsdWUuc3Vic3RyKDAsIGlkeCk7XG5cblx0XHRpZighKHRoaXMuX29wdGlvbnMueG1sTW9kZSB8fCBcImxvd2VyQ2FzZVRhZ3NcIiBpbiB0aGlzLl9vcHRpb25zKSB8fCB0aGlzLl9vcHRpb25zLmxvd2VyQ2FzZVRhZ3Mpe1xuXHRcdFx0bmFtZSA9IG5hbWUudG9Mb3dlckNhc2UoKTtcblx0XHR9XG5cdFx0dGhpcy5fY2JzLm9ucHJvY2Vzc2luZ2luc3RydWN0aW9uKFwiIVwiICsgbmFtZSwgXCIhXCIgKyB2YWx1ZSk7XG5cdH1cbn07XG5cblBhcnNlci5wcm90b3R5cGUub25wcm9jZXNzaW5naW5zdHJ1Y3Rpb24gPSBmdW5jdGlvbih2YWx1ZSl7XG5cdGlmKHRoaXMuX2Nicy5vbnByb2Nlc3NpbmdpbnN0cnVjdGlvbil7XG5cdFx0dmFyIGlkeCA9IHZhbHVlLnNlYXJjaChyZV9uYW1lRW5kKSxcblx0XHQgICAgbmFtZSA9IGlkeCA8IDAgPyB2YWx1ZSA6IHZhbHVlLnN1YnN0cigwLCBpZHgpO1xuXG5cdFx0aWYoISh0aGlzLl9vcHRpb25zLnhtbE1vZGUgfHwgXCJsb3dlckNhc2VUYWdzXCIgaW4gdGhpcy5fb3B0aW9ucykgfHwgdGhpcy5fb3B0aW9ucy5sb3dlckNhc2VUYWdzKXtcblx0XHRcdG5hbWUgPSBuYW1lLnRvTG93ZXJDYXNlKCk7XG5cdFx0fVxuXHRcdHRoaXMuX2Nicy5vbnByb2Nlc3NpbmdpbnN0cnVjdGlvbihcIj9cIiArIG5hbWUsIFwiP1wiICsgdmFsdWUpO1xuXHR9XG59O1xuXG5QYXJzZXIucHJvdG90eXBlLm9uY29tbWVudCA9IGZ1bmN0aW9uKHZhbHVlKXtcblx0dGhpcy5fdXBkYXRlUG9zaXRpb24oNCk7XG5cblx0aWYodGhpcy5fY2JzLm9uY29tbWVudCkgdGhpcy5fY2JzLm9uY29tbWVudCh2YWx1ZSk7XG5cdGlmKHRoaXMuX2Nicy5vbmNvbW1lbnRlbmQpIHRoaXMuX2Nicy5vbmNvbW1lbnRlbmQoKTtcbn07XG5cblBhcnNlci5wcm90b3R5cGUub25jZGF0YSA9IGZ1bmN0aW9uKHZhbHVlKXtcblx0dGhpcy5fdXBkYXRlUG9zaXRpb24oMSk7XG5cblx0aWYodGhpcy5fb3B0aW9ucy54bWxNb2RlKXtcblx0XHRpZih0aGlzLl9jYnMub25jZGF0YXN0YXJ0KSB0aGlzLl9jYnMub25jZGF0YXN0YXJ0KCk7XG5cdFx0aWYodGhpcy5fY2JzLm9udGV4dCkgdGhpcy5fY2JzLm9udGV4dCh2YWx1ZSk7XG5cdFx0aWYodGhpcy5fY2JzLm9uY2RhdGFlbmQpIHRoaXMuX2Nicy5vbmNkYXRhZW5kKCk7XG5cdH0gZWxzZSB7XG5cdFx0dGhpcy5vbmNvbW1lbnQoXCJbQ0RBVEFbXCIgKyB2YWx1ZSArIFwiXV1cIik7XG5cdH1cbn07XG5cblBhcnNlci5wcm90b3R5cGUub25lcnJvciA9IGZ1bmN0aW9uKGVycil7XG5cdGlmKHRoaXMuX2Nicy5vbmVycm9yKSB0aGlzLl9jYnMub25lcnJvcihlcnIpO1xufTtcblxuUGFyc2VyLnByb3RvdHlwZS5vbmVuZCA9IGZ1bmN0aW9uKCl7XG5cdGlmKHRoaXMuX2Nicy5vbmNsb3NldGFnKXtcblx0XHRmb3IoXG5cdFx0XHR2YXIgaSA9IHRoaXMuX3N0YWNrLmxlbmd0aDtcblx0XHRcdGkgPiAwO1xuXHRcdFx0dGhpcy5fY2JzLm9uY2xvc2V0YWcodGhpcy5fc3RhY2tbLS1pXSlcblx0XHQpO1xuXHR9XG5cdGlmKHRoaXMuX2Nicy5vbmVuZCkgdGhpcy5fY2JzLm9uZW5kKCk7XG59O1xuXG5cbi8vUmVzZXRzIHRoZSBwYXJzZXIgdG8gYSBibGFuayBzdGF0ZSwgcmVhZHkgdG8gcGFyc2UgYSBuZXcgSFRNTCBkb2N1bWVudFxuUGFyc2VyLnByb3RvdHlwZS5yZXNldCA9IGZ1bmN0aW9uKCl7XG5cdGlmKHRoaXMuX2Nicy5vbnJlc2V0KSB0aGlzLl9jYnMub25yZXNldCgpO1xuXHR0aGlzLl90b2tlbml6ZXIucmVzZXQoKTtcblxuXHR0aGlzLl90YWduYW1lID0gXCJcIjtcblx0dGhpcy5fYXR0cmlibmFtZSA9IFwiXCI7XG5cdHRoaXMuX2F0dHJpYnMgPSBudWxsO1xuXHR0aGlzLl9zdGFjayA9IFtdO1xuXHR0aGlzLl9kb25lID0gZmFsc2U7XG59O1xuXG4vL1BhcnNlcyBhIGNvbXBsZXRlIEhUTUwgZG9jdW1lbnQgYW5kIHB1c2hlcyBpdCB0byB0aGUgaGFuZGxlclxuUGFyc2VyLnByb3RvdHlwZS5wYXJzZUNvbXBsZXRlID0gZnVuY3Rpb24oZGF0YSl7XG5cdHRoaXMucmVzZXQoKTtcblx0dGhpcy5lbmQoZGF0YSk7XG59O1xuXG5QYXJzZXIucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24oY2h1bmspe1xuXHRpZih0aGlzLl9kb25lKSB0aGlzLm9uZXJyb3IoRXJyb3IoXCIud3JpdGUoKSBhZnRlciBkb25lIVwiKSk7XG5cdHRoaXMuX3Rva2VuaXplci53cml0ZShjaHVuayk7XG59O1xuXG5QYXJzZXIucHJvdG90eXBlLmVuZCA9IGZ1bmN0aW9uKGNodW5rKXtcblx0aWYodGhpcy5fZG9uZSkgdGhpcy5vbmVycm9yKEVycm9yKFwiLmVuZCgpIGFmdGVyIGRvbmUhXCIpKTtcblx0dGhpcy5fdG9rZW5pemVyLmVuZChjaHVuayk7XG5cdHRoaXMuX2RvbmUgPSB0cnVlO1xufTtcblxuLy9hbGlhcyBmb3IgYmFja3dhcmRzIGNvbXBhdFxuUGFyc2VyLnByb3RvdHlwZS5wYXJzZUNodW5rID0gUGFyc2VyLnByb3RvdHlwZS53cml0ZTtcblBhcnNlci5wcm90b3R5cGUuZG9uZSA9IFBhcnNlci5wcm90b3R5cGUuZW5kO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBhcnNlcjtcbiIsIm1vZHVsZS5leHBvcnRzID0gVG9rZW5pemVyO1xuXG52YXIgZW50aXR5TWFwID0gcmVxdWlyZShcIi4vZW50aXRpZXMvZW50aXRpZXMuanNvblwiKSxcbiAgICBsZWdhY3lNYXAgPSByZXF1aXJlKFwiLi9lbnRpdGllcy9sZWdhY3kuanNvblwiKSxcbiAgICB4bWxNYXAgICAgPSByZXF1aXJlKFwiLi9lbnRpdGllcy94bWwuanNvblwiKSxcbiAgICBkZWNvZGVNYXAgPSByZXF1aXJlKFwiLi9lbnRpdGllcy9kZWNvZGUuanNvblwiKSxcblxuICAgIGkgPSAwLFxuXG4gICAgVEVYVCAgICAgICAgICAgICAgICAgICAgICA9IGkrKyxcbiAgICBCRUZPUkVfVEFHX05BTUUgICAgICAgICAgID0gaSsrLCAvL2FmdGVyIDxcbiAgICBJTl9UQUdfTkFNRSAgICAgICAgICAgICAgID0gaSsrLFxuICAgIElOX1NFTEZfQ0xPU0lOR19UQUcgICAgICAgPSBpKyssXG4gICAgQkVGT1JFX0NMT1NJTkdfVEFHX05BTUUgICA9IGkrKyxcbiAgICBJTl9DTE9TSU5HX1RBR19OQU1FICAgICAgID0gaSsrLFxuICAgIEFGVEVSX0NMT1NJTkdfVEFHX05BTUUgICAgPSBpKyssXG5cbiAgICAvL2F0dHJpYnV0ZXNcbiAgICBCRUZPUkVfQVRUUklCVVRFX05BTUUgICAgID0gaSsrLFxuICAgIElOX0FUVFJJQlVURV9OQU1FICAgICAgICAgPSBpKyssXG4gICAgQUZURVJfQVRUUklCVVRFX05BTUUgICAgICA9IGkrKyxcbiAgICBCRUZPUkVfQVRUUklCVVRFX1ZBTFVFICAgID0gaSsrLFxuICAgIElOX0FUVFJJQlVURV9WQUxVRV9EUSAgICAgPSBpKyssIC8vIFwiXG4gICAgSU5fQVRUUklCVVRFX1ZBTFVFX1NRICAgICA9IGkrKywgLy8gJ1xuICAgIElOX0FUVFJJQlVURV9WQUxVRV9OUSAgICAgPSBpKyssXG5cbiAgICAvL2RlY2xhcmF0aW9uc1xuICAgIEJFRk9SRV9ERUNMQVJBVElPTiAgICAgICAgPSBpKyssIC8vICFcbiAgICBJTl9ERUNMQVJBVElPTiAgICAgICAgICAgID0gaSsrLFxuXG4gICAgLy9wcm9jZXNzaW5nIGluc3RydWN0aW9uc1xuICAgIElOX1BST0NFU1NJTkdfSU5TVFJVQ1RJT04gPSBpKyssIC8vID9cblxuICAgIC8vY29tbWVudHNcbiAgICBCRUZPUkVfQ09NTUVOVCAgICAgICAgICAgID0gaSsrLFxuICAgIElOX0NPTU1FTlQgICAgICAgICAgICAgICAgPSBpKyssXG4gICAgQUZURVJfQ09NTUVOVF8xICAgICAgICAgICA9IGkrKyxcbiAgICBBRlRFUl9DT01NRU5UXzIgICAgICAgICAgID0gaSsrLFxuXG4gICAgLy9jZGF0YVxuICAgIEJFRk9SRV9DREFUQV8xICAgICAgICAgICAgPSBpKyssIC8vIFtcbiAgICBCRUZPUkVfQ0RBVEFfMiAgICAgICAgICAgID0gaSsrLCAvLyBDXG4gICAgQkVGT1JFX0NEQVRBXzMgICAgICAgICAgICA9IGkrKywgLy8gRFxuICAgIEJFRk9SRV9DREFUQV80ICAgICAgICAgICAgPSBpKyssIC8vIEFcbiAgICBCRUZPUkVfQ0RBVEFfNSAgICAgICAgICAgID0gaSsrLCAvLyBUXG4gICAgQkVGT1JFX0NEQVRBXzYgICAgICAgICAgICA9IGkrKywgLy8gQVxuICAgIElOX0NEQVRBICAgICAgICAgICAgICAgICAgPSBpKyssLy8gW1xuICAgIEFGVEVSX0NEQVRBXzEgICAgICAgICAgICAgPSBpKyssIC8vIF1cbiAgICBBRlRFUl9DREFUQV8yICAgICAgICAgICAgID0gaSsrLCAvLyBdXG5cbiAgICAvL3NwZWNpYWwgdGFnc1xuICAgIEJFRk9SRV9TUEVDSUFMICAgICAgICAgICAgPSBpKyssIC8vU1xuICAgIEJFRk9SRV9TUEVDSUFMX0VORCAgICAgICAgPSBpKyssICAgLy9TXG5cbiAgICBCRUZPUkVfU0NSSVBUXzEgICAgICAgICAgID0gaSsrLCAvL0NcbiAgICBCRUZPUkVfU0NSSVBUXzIgICAgICAgICAgID0gaSsrLCAvL1JcbiAgICBCRUZPUkVfU0NSSVBUXzMgICAgICAgICAgID0gaSsrLCAvL0lcbiAgICBCRUZPUkVfU0NSSVBUXzQgICAgICAgICAgID0gaSsrLCAvL1BcbiAgICBCRUZPUkVfU0NSSVBUXzUgICAgICAgICAgID0gaSsrLCAvL1RcbiAgICBBRlRFUl9TQ1JJUFRfMSAgICAgICAgICAgID0gaSsrLCAvL0NcbiAgICBBRlRFUl9TQ1JJUFRfMiAgICAgICAgICAgID0gaSsrLCAvL1JcbiAgICBBRlRFUl9TQ1JJUFRfMyAgICAgICAgICAgID0gaSsrLCAvL0lcbiAgICBBRlRFUl9TQ1JJUFRfNCAgICAgICAgICAgID0gaSsrLCAvL1BcbiAgICBBRlRFUl9TQ1JJUFRfNSAgICAgICAgICAgID0gaSsrLCAvL1RcblxuICAgIEJFRk9SRV9TVFlMRV8xICAgICAgICAgICAgPSBpKyssIC8vVFxuICAgIEJFRk9SRV9TVFlMRV8yICAgICAgICAgICAgPSBpKyssIC8vWVxuICAgIEJFRk9SRV9TVFlMRV8zICAgICAgICAgICAgPSBpKyssIC8vTFxuICAgIEJFRk9SRV9TVFlMRV80ICAgICAgICAgICAgPSBpKyssIC8vRVxuICAgIEFGVEVSX1NUWUxFXzEgICAgICAgICAgICAgPSBpKyssIC8vVFxuICAgIEFGVEVSX1NUWUxFXzIgICAgICAgICAgICAgPSBpKyssIC8vWVxuICAgIEFGVEVSX1NUWUxFXzMgICAgICAgICAgICAgPSBpKyssIC8vTFxuICAgIEFGVEVSX1NUWUxFXzQgICAgICAgICAgICAgPSBpKyssIC8vRVxuXG4gICAgQkVGT1JFX0VOVElUWSAgICAgICAgICAgICA9IGkrKywgLy8mXG4gICAgQkVGT1JFX05VTUVSSUNfRU5USVRZICAgICA9IGkrKywgLy8jXG4gICAgSU5fTkFNRURfRU5USVRZICAgICAgICAgICA9IGkrKyxcbiAgICBJTl9OVU1FUklDX0VOVElUWSAgICAgICAgID0gaSsrLFxuICAgIElOX0hFWF9FTlRJVFkgICAgICAgICAgICAgPSBpKyssIC8vWFxuXG4gICAgaiA9IDAsXG5cbiAgICBTUEVDSUFMX05PTkUgICAgICAgICAgICAgID0gaisrLFxuICAgIFNQRUNJQUxfU0NSSVBUICAgICAgICAgICAgPSBqKyssXG4gICAgU1BFQ0lBTF9TVFlMRSAgICAgICAgICAgICA9IGorKztcblxuZnVuY3Rpb24gd2hpdGVzcGFjZShjKXtcblx0cmV0dXJuIGMgPT09IFwiIFwiIHx8IGMgPT09IFwiXFxuXCIgfHwgYyA9PT0gXCJcXHRcIiB8fCBjID09PSBcIlxcZlwiIHx8IGMgPT09IFwiXFxyXCI7XG59XG5cbmZ1bmN0aW9uIGlmRWxzZVN0YXRlKHVwcGVyLCBTVUNDRVNTLCBGQUlMVVJFKXtcblx0dmFyIGxvd2VyID0gdXBwZXIudG9Mb3dlckNhc2UoKTtcblxuXHRpZih1cHBlciA9PT0gbG93ZXIpe1xuXHRcdHJldHVybiBmdW5jdGlvbihjKXtcblx0XHRcdHRoaXMuX3N0YXRlID0gYyA9PT0gbG93ZXIgPyBTVUNDRVNTIDogRkFJTFVSRTtcblx0XHR9O1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiBmdW5jdGlvbihjKXtcblx0XHRcdHRoaXMuX3N0YXRlID0gKGMgPT09IGxvd2VyIHx8IGMgPT09IHVwcGVyKSA/IFNVQ0NFU1MgOiBGQUlMVVJFO1xuXHRcdH07XG5cdH1cbn1cblxuZnVuY3Rpb24gY29uc3VtZVNwZWNpYWxOYW1lQ2hhcih1cHBlciwgTkVYVF9TVEFURSl7XG5cdHZhciBsb3dlciA9IHVwcGVyLnRvTG93ZXJDYXNlKCk7XG5cblx0cmV0dXJuIGZ1bmN0aW9uKGMpe1xuXHRcdGlmKGMgPT09IGxvd2VyIHx8IGMgPT09IHVwcGVyKXtcblx0XHRcdHRoaXMuX3N0YXRlID0gTkVYVF9TVEFURTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5fc3RhdGUgPSBJTl9UQUdfTkFNRTtcblx0XHRcdHRoaXMuX2luZGV4LS07IC8vY29uc3VtZSB0aGUgdG9rZW4gYWdhaW5cblx0XHR9XG5cdH07XG59XG5cbmZ1bmN0aW9uIFRva2VuaXplcihvcHRpb25zLCBjYnMpe1xuXHR0aGlzLl9zdGF0ZSA9IFRFWFQ7XG5cdHRoaXMuX2J1ZmZlciA9IFwiXCI7XG5cdHRoaXMuX3NlY3Rpb25TdGFydCA9IDA7XG5cdHRoaXMuX2luZGV4ID0gMDtcblx0dGhpcy5fYmFzZVN0YXRlID0gVEVYVDtcblx0dGhpcy5fc3BlY2lhbCA9IFNQRUNJQUxfTk9ORTtcblx0dGhpcy5fY2JzID0gY2JzO1xuXHR0aGlzLl9ydW5uaW5nID0gdHJ1ZTtcblx0dGhpcy5feG1sTW9kZSA9ICEhKG9wdGlvbnMgJiYgb3B0aW9ucy54bWxNb2RlKTtcblx0dGhpcy5fZGVjb2RlRW50aXRpZXMgPSAhIShvcHRpb25zICYmIG9wdGlvbnMuZGVjb2RlRW50aXRpZXMpO1xufVxuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZVRleHQgPSBmdW5jdGlvbihjKXtcblx0aWYoYyA9PT0gXCI8XCIpe1xuXHRcdGlmKHRoaXMuX2luZGV4ID4gdGhpcy5fc2VjdGlvblN0YXJ0KXtcblx0XHRcdHRoaXMuX2Nicy5vbnRleHQodGhpcy5fZ2V0U2VjdGlvbigpKTtcblx0XHR9XG5cdFx0dGhpcy5fc3RhdGUgPSBCRUZPUkVfVEFHX05BTUU7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXg7XG5cdH0gZWxzZSBpZih0aGlzLl9kZWNvZGVFbnRpdGllcyAmJiB0aGlzLl9zcGVjaWFsID09PSBTUEVDSUFMX05PTkUgJiYgYyA9PT0gXCImXCIpe1xuXHRcdGlmKHRoaXMuX2luZGV4ID4gdGhpcy5fc2VjdGlvblN0YXJ0KXtcblx0XHRcdHRoaXMuX2Nicy5vbnRleHQodGhpcy5fZ2V0U2VjdGlvbigpKTtcblx0XHR9XG5cdFx0dGhpcy5fYmFzZVN0YXRlID0gVEVYVDtcblx0XHR0aGlzLl9zdGF0ZSA9IEJFRk9SRV9FTlRJVFk7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXg7XG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlVGFnTmFtZSA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIi9cIil7XG5cdFx0dGhpcy5fc3RhdGUgPSBCRUZPUkVfQ0xPU0lOR19UQUdfTkFNRTtcblx0fSBlbHNlIGlmKGMgPT09IFwiPlwiIHx8IHRoaXMuX3NwZWNpYWwgIT09IFNQRUNJQUxfTk9ORSB8fCB3aGl0ZXNwYWNlKGMpKSB7XG5cdFx0dGhpcy5fc3RhdGUgPSBURVhUO1xuXHR9IGVsc2UgaWYoYyA9PT0gXCIhXCIpe1xuXHRcdHRoaXMuX3N0YXRlID0gQkVGT1JFX0RFQ0xBUkFUSU9OO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4ICsgMTtcblx0fSBlbHNlIGlmKGMgPT09IFwiP1wiKXtcblx0XHR0aGlzLl9zdGF0ZSA9IElOX1BST0NFU1NJTkdfSU5TVFJVQ1RJT047XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXggKyAxO1xuXHR9IGVsc2UgaWYoYyA9PT0gXCI8XCIpe1xuXHRcdHRoaXMuX2Nicy5vbnRleHQodGhpcy5fZ2V0U2VjdGlvbigpKTtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleDtcblx0fSBlbHNlIHtcblx0XHR0aGlzLl9zdGF0ZSA9ICghdGhpcy5feG1sTW9kZSAmJiAoYyA9PT0gXCJzXCIgfHwgYyA9PT0gXCJTXCIpKSA/XG5cdFx0XHRcdFx0XHRCRUZPUkVfU1BFQ0lBTCA6IElOX1RBR19OQU1FO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4O1xuXHR9XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUluVGFnTmFtZSA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIi9cIiB8fCBjID09PSBcIj5cIiB8fCB3aGl0ZXNwYWNlKGMpKXtcblx0XHR0aGlzLl9lbWl0VG9rZW4oXCJvbm9wZW50YWduYW1lXCIpO1xuXHRcdHRoaXMuX3N0YXRlID0gQkVGT1JFX0FUVFJJQlVURV9OQU1FO1xuXHRcdHRoaXMuX2luZGV4LS07XG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlQ2xvc2VpbmdUYWdOYW1lID0gZnVuY3Rpb24oYyl7XG5cdGlmKHdoaXRlc3BhY2UoYykpO1xuXHRlbHNlIGlmKGMgPT09IFwiPlwiKXtcblx0XHR0aGlzLl9zdGF0ZSA9IFRFWFQ7XG5cdH0gZWxzZSBpZih0aGlzLl9zcGVjaWFsICE9PSBTUEVDSUFMX05PTkUpe1xuXHRcdGlmKGMgPT09IFwic1wiIHx8IGMgPT09IFwiU1wiKXtcblx0XHRcdHRoaXMuX3N0YXRlID0gQkVGT1JFX1NQRUNJQUxfRU5EO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLl9zdGF0ZSA9IFRFWFQ7XG5cdFx0XHR0aGlzLl9pbmRleC0tO1xuXHRcdH1cblx0fSBlbHNlIHtcblx0XHR0aGlzLl9zdGF0ZSA9IElOX0NMT1NJTkdfVEFHX05BTUU7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXg7XG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlSW5DbG9zZWluZ1RhZ05hbWUgPSBmdW5jdGlvbihjKXtcblx0aWYoYyA9PT0gXCI+XCIgfHwgd2hpdGVzcGFjZShjKSl7XG5cdFx0dGhpcy5fZW1pdFRva2VuKFwib25jbG9zZXRhZ1wiKTtcblx0XHR0aGlzLl9zdGF0ZSA9IEFGVEVSX0NMT1NJTkdfVEFHX05BTUU7XG5cdFx0dGhpcy5faW5kZXgtLTtcblx0fVxufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVBZnRlckNsb3NlaW5nVGFnTmFtZSA9IGZ1bmN0aW9uKGMpe1xuXHQvL3NraXAgZXZlcnl0aGluZyB1bnRpbCBcIj5cIlxuXHRpZihjID09PSBcIj5cIil7XG5cdFx0dGhpcy5fc3RhdGUgPSBURVhUO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4ICsgMTtcblx0fVxufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVCZWZvcmVBdHRyaWJ1dGVOYW1lID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiPlwiKXtcblx0XHR0aGlzLl9jYnMub25vcGVudGFnZW5kKCk7XG5cdFx0dGhpcy5fc3RhdGUgPSBURVhUO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4ICsgMTtcblx0fSBlbHNlIGlmKGMgPT09IFwiL1wiKXtcblx0XHR0aGlzLl9zdGF0ZSA9IElOX1NFTEZfQ0xPU0lOR19UQUc7XG5cdH0gZWxzZSBpZighd2hpdGVzcGFjZShjKSl7XG5cdFx0dGhpcy5fc3RhdGUgPSBJTl9BVFRSSUJVVEVfTkFNRTtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleDtcblx0fVxufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVJblNlbGZDbG9zaW5nVGFnID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiPlwiKXtcblx0XHR0aGlzLl9jYnMub25zZWxmY2xvc2luZ3RhZygpO1xuXHRcdHRoaXMuX3N0YXRlID0gVEVYVDtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleCArIDE7XG5cdH0gZWxzZSBpZighd2hpdGVzcGFjZShjKSl7XG5cdFx0dGhpcy5fc3RhdGUgPSBCRUZPUkVfQVRUUklCVVRFX05BTUU7XG5cdFx0dGhpcy5faW5kZXgtLTtcblx0fVxufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVJbkF0dHJpYnV0ZU5hbWUgPSBmdW5jdGlvbihjKXtcblx0aWYoYyA9PT0gXCI9XCIgfHwgYyA9PT0gXCIvXCIgfHwgYyA9PT0gXCI+XCIgfHwgd2hpdGVzcGFjZShjKSl7XG5cdFx0aWYodGhpcy5faW5kZXggPiB0aGlzLl9zZWN0aW9uU3RhcnQpe1xuXHRcdFx0dGhpcy5fY2JzLm9uYXR0cmlibmFtZSh0aGlzLl9nZXRTZWN0aW9uKCkpO1xuXHRcdH1cblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSAtMTtcblx0XHR0aGlzLl9zdGF0ZSA9IEFGVEVSX0FUVFJJQlVURV9OQU1FO1xuXHRcdHRoaXMuX2luZGV4LS07XG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQWZ0ZXJBdHRyaWJ1dGVOYW1lID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiPVwiKXtcblx0XHR0aGlzLl9zdGF0ZSA9IEJFRk9SRV9BVFRSSUJVVEVfVkFMVUU7XG5cdH0gZWxzZSBpZihjID09PSBcIi9cIiB8fCBjID09PSBcIj5cIil7XG5cdFx0dGhpcy5fY2JzLm9uYXR0cmliZW5kKCk7XG5cdFx0dGhpcy5fc3RhdGUgPSBCRUZPUkVfQVRUUklCVVRFX05BTUU7XG5cdFx0dGhpcy5faW5kZXgtLTtcblx0fSBlbHNlIGlmKCF3aGl0ZXNwYWNlKGMpKXtcblx0XHR0aGlzLl9jYnMub25hdHRyaWJlbmQoKTtcblx0XHR0aGlzLl9zdGF0ZSA9IElOX0FUVFJJQlVURV9OQU1FO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4O1xuXHR9XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUJlZm9yZUF0dHJpYnV0ZVZhbHVlID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiXFxcIlwiKXtcblx0XHR0aGlzLl9zdGF0ZSA9IElOX0FUVFJJQlVURV9WQUxVRV9EUTtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleCArIDE7XG5cdH0gZWxzZSBpZihjID09PSBcIidcIil7XG5cdFx0dGhpcy5fc3RhdGUgPSBJTl9BVFRSSUJVVEVfVkFMVUVfU1E7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXggKyAxO1xuXHR9IGVsc2UgaWYoIXdoaXRlc3BhY2UoYykpe1xuXHRcdHRoaXMuX3N0YXRlID0gSU5fQVRUUklCVVRFX1ZBTFVFX05RO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4O1xuXHR9XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUluQXR0cmlidXRlVmFsdWVEb3VibGVRdW90ZXMgPSBmdW5jdGlvbihjKXtcblx0aWYoYyA9PT0gXCJcXFwiXCIpe1xuXHRcdHRoaXMuX2VtaXRUb2tlbihcIm9uYXR0cmliZGF0YVwiKTtcblx0XHR0aGlzLl9jYnMub25hdHRyaWJlbmQoKTtcblx0XHR0aGlzLl9zdGF0ZSA9IEJFRk9SRV9BVFRSSUJVVEVfTkFNRTtcblx0fSBlbHNlIGlmKHRoaXMuX2RlY29kZUVudGl0aWVzICYmIGMgPT09IFwiJlwiKXtcblx0XHR0aGlzLl9lbWl0VG9rZW4oXCJvbmF0dHJpYmRhdGFcIik7XG5cdFx0dGhpcy5fYmFzZVN0YXRlID0gdGhpcy5fc3RhdGU7XG5cdFx0dGhpcy5fc3RhdGUgPSBCRUZPUkVfRU5USVRZO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4O1xuXHR9XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUluQXR0cmlidXRlVmFsdWVTaW5nbGVRdW90ZXMgPSBmdW5jdGlvbihjKXtcblx0aWYoYyA9PT0gXCInXCIpe1xuXHRcdHRoaXMuX2VtaXRUb2tlbihcIm9uYXR0cmliZGF0YVwiKTtcblx0XHR0aGlzLl9jYnMub25hdHRyaWJlbmQoKTtcblx0XHR0aGlzLl9zdGF0ZSA9IEJFRk9SRV9BVFRSSUJVVEVfTkFNRTtcblx0fSBlbHNlIGlmKHRoaXMuX2RlY29kZUVudGl0aWVzICYmIGMgPT09IFwiJlwiKXtcblx0XHR0aGlzLl9lbWl0VG9rZW4oXCJvbmF0dHJpYmRhdGFcIik7XG5cdFx0dGhpcy5fYmFzZVN0YXRlID0gdGhpcy5fc3RhdGU7XG5cdFx0dGhpcy5fc3RhdGUgPSBCRUZPUkVfRU5USVRZO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4O1xuXHR9XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUluQXR0cmlidXRlVmFsdWVOb1F1b3RlcyA9IGZ1bmN0aW9uKGMpe1xuXHRpZih3aGl0ZXNwYWNlKGMpIHx8IGMgPT09IFwiPlwiKXtcblx0XHR0aGlzLl9lbWl0VG9rZW4oXCJvbmF0dHJpYmRhdGFcIik7XG5cdFx0dGhpcy5fY2JzLm9uYXR0cmliZW5kKCk7XG5cdFx0dGhpcy5fc3RhdGUgPSBCRUZPUkVfQVRUUklCVVRFX05BTUU7XG5cdFx0dGhpcy5faW5kZXgtLTtcblx0fSBlbHNlIGlmKHRoaXMuX2RlY29kZUVudGl0aWVzICYmIGMgPT09IFwiJlwiKXtcblx0XHR0aGlzLl9lbWl0VG9rZW4oXCJvbmF0dHJpYmRhdGFcIik7XG5cdFx0dGhpcy5fYmFzZVN0YXRlID0gdGhpcy5fc3RhdGU7XG5cdFx0dGhpcy5fc3RhdGUgPSBCRUZPUkVfRU5USVRZO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4O1xuXHR9XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUJlZm9yZURlY2xhcmF0aW9uID0gZnVuY3Rpb24oYyl7XG5cdHRoaXMuX3N0YXRlID0gYyA9PT0gXCJbXCIgPyBCRUZPUkVfQ0RBVEFfMSA6XG5cdFx0XHRcdFx0YyA9PT0gXCItXCIgPyBCRUZPUkVfQ09NTUVOVCA6XG5cdFx0XHRcdFx0XHRJTl9ERUNMQVJBVElPTjtcbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlSW5EZWNsYXJhdGlvbiA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIj5cIil7XG5cdFx0dGhpcy5fY2JzLm9uZGVjbGFyYXRpb24odGhpcy5fZ2V0U2VjdGlvbigpKTtcblx0XHR0aGlzLl9zdGF0ZSA9IFRFWFQ7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXggKyAxO1xuXHR9XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUluUHJvY2Vzc2luZ0luc3RydWN0aW9uID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiPlwiKXtcblx0XHR0aGlzLl9jYnMub25wcm9jZXNzaW5naW5zdHJ1Y3Rpb24odGhpcy5fZ2V0U2VjdGlvbigpKTtcblx0XHR0aGlzLl9zdGF0ZSA9IFRFWFQ7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXggKyAxO1xuXHR9XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUJlZm9yZUNvbW1lbnQgPSBmdW5jdGlvbihjKXtcblx0aWYoYyA9PT0gXCItXCIpe1xuXHRcdHRoaXMuX3N0YXRlID0gSU5fQ09NTUVOVDtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleCArIDE7XG5cdH0gZWxzZSB7XG5cdFx0dGhpcy5fc3RhdGUgPSBJTl9ERUNMQVJBVElPTjtcblx0fVxufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVJbkNvbW1lbnQgPSBmdW5jdGlvbihjKXtcblx0aWYoYyA9PT0gXCItXCIpIHRoaXMuX3N0YXRlID0gQUZURVJfQ09NTUVOVF8xO1xufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVBZnRlckNvbW1lbnQxID0gaWZFbHNlU3RhdGUoXCItXCIsIEFGVEVSX0NPTU1FTlRfMiwgSU5fQ09NTUVOVCk7XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQWZ0ZXJDb21tZW50MiA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIj5cIil7XG5cdFx0Ly9yZW1vdmUgMiB0cmFpbGluZyBjaGFyc1xuXHRcdHRoaXMuX2Nicy5vbmNvbW1lbnQodGhpcy5fYnVmZmVyLnN1YnN0cmluZyh0aGlzLl9zZWN0aW9uU3RhcnQsIHRoaXMuX2luZGV4IC0gMikpO1xuXHRcdHRoaXMuX3N0YXRlID0gVEVYVDtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleCArIDE7XG5cdH0gZWxzZSBpZihjICE9PSBcIi1cIil7XG5cdFx0dGhpcy5fc3RhdGUgPSBJTl9DT01NRU5UO1xuXHR9XG5cdC8vIGVsc2U6IHN0YXkgaW4gQUZURVJfQ09NTUVOVF8yIChgLS0tPmApXG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUJlZm9yZUNkYXRhMSA9IGlmRWxzZVN0YXRlKFwiQ1wiLCBCRUZPUkVfQ0RBVEFfMiwgSU5fREVDTEFSQVRJT04pO1xuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVCZWZvcmVDZGF0YTIgPSBpZkVsc2VTdGF0ZShcIkRcIiwgQkVGT1JFX0NEQVRBXzMsIElOX0RFQ0xBUkFUSU9OKTtcblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlQ2RhdGEzID0gaWZFbHNlU3RhdGUoXCJBXCIsIEJFRk9SRV9DREFUQV80LCBJTl9ERUNMQVJBVElPTik7XG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUJlZm9yZUNkYXRhNCA9IGlmRWxzZVN0YXRlKFwiVFwiLCBCRUZPUkVfQ0RBVEFfNSwgSU5fREVDTEFSQVRJT04pO1xuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVCZWZvcmVDZGF0YTUgPSBpZkVsc2VTdGF0ZShcIkFcIiwgQkVGT1JFX0NEQVRBXzYsIElOX0RFQ0xBUkFUSU9OKTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVCZWZvcmVDZGF0YTYgPSBmdW5jdGlvbihjKXtcblx0aWYoYyA9PT0gXCJbXCIpe1xuXHRcdHRoaXMuX3N0YXRlID0gSU5fQ0RBVEE7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXggKyAxO1xuXHR9IGVsc2Uge1xuXHRcdHRoaXMuX3N0YXRlID0gSU5fREVDTEFSQVRJT047XG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlSW5DZGF0YSA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIl1cIikgdGhpcy5fc3RhdGUgPSBBRlRFUl9DREFUQV8xO1xufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVBZnRlckNkYXRhMSA9IGlmRWxzZVN0YXRlKFwiXVwiLCBBRlRFUl9DREFUQV8yLCBJTl9DREFUQSk7XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQWZ0ZXJDZGF0YTIgPSBmdW5jdGlvbihjKXtcblx0aWYoYyA9PT0gXCI+XCIpe1xuXHRcdC8vcmVtb3ZlIDIgdHJhaWxpbmcgY2hhcnNcblx0XHR0aGlzLl9jYnMub25jZGF0YSh0aGlzLl9idWZmZXIuc3Vic3RyaW5nKHRoaXMuX3NlY3Rpb25TdGFydCwgdGhpcy5faW5kZXggLSAyKSk7XG5cdFx0dGhpcy5fc3RhdGUgPSBURVhUO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4ICsgMTtcblx0fSBlbHNlIGlmIChjICE9PSBcIl1cIikge1xuXHRcdHRoaXMuX3N0YXRlID0gSU5fQ0RBVEE7XG5cdH1cblx0Ly9lbHNlOiBzdGF5IGluIEFGVEVSX0NEQVRBXzIgKGBdXV0+YClcbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlU3BlY2lhbCA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcImNcIiB8fCBjID09PSBcIkNcIil7XG5cdFx0dGhpcy5fc3RhdGUgPSBCRUZPUkVfU0NSSVBUXzE7XG5cdH0gZWxzZSBpZihjID09PSBcInRcIiB8fCBjID09PSBcIlRcIil7XG5cdFx0dGhpcy5fc3RhdGUgPSBCRUZPUkVfU1RZTEVfMTtcblx0fSBlbHNlIHtcblx0XHR0aGlzLl9zdGF0ZSA9IElOX1RBR19OQU1FO1xuXHRcdHRoaXMuX2luZGV4LS07IC8vY29uc3VtZSB0aGUgdG9rZW4gYWdhaW5cblx0fVxufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVCZWZvcmVTcGVjaWFsRW5kID0gZnVuY3Rpb24oYyl7XG5cdGlmKHRoaXMuX3NwZWNpYWwgPT09IFNQRUNJQUxfU0NSSVBUICYmIChjID09PSBcImNcIiB8fCBjID09PSBcIkNcIikpe1xuXHRcdHRoaXMuX3N0YXRlID0gQUZURVJfU0NSSVBUXzE7XG5cdH0gZWxzZSBpZih0aGlzLl9zcGVjaWFsID09PSBTUEVDSUFMX1NUWUxFICYmIChjID09PSBcInRcIiB8fCBjID09PSBcIlRcIikpe1xuXHRcdHRoaXMuX3N0YXRlID0gQUZURVJfU1RZTEVfMTtcblx0fVxuXHRlbHNlIHRoaXMuX3N0YXRlID0gVEVYVDtcbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlU2NyaXB0MSA9IGNvbnN1bWVTcGVjaWFsTmFtZUNoYXIoXCJSXCIsIEJFRk9SRV9TQ1JJUFRfMik7XG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUJlZm9yZVNjcmlwdDIgPSBjb25zdW1lU3BlY2lhbE5hbWVDaGFyKFwiSVwiLCBCRUZPUkVfU0NSSVBUXzMpO1xuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVCZWZvcmVTY3JpcHQzID0gY29uc3VtZVNwZWNpYWxOYW1lQ2hhcihcIlBcIiwgQkVGT1JFX1NDUklQVF80KTtcblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlU2NyaXB0NCA9IGNvbnN1bWVTcGVjaWFsTmFtZUNoYXIoXCJUXCIsIEJFRk9SRV9TQ1JJUFRfNSk7XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlU2NyaXB0NSA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIi9cIiB8fCBjID09PSBcIj5cIiB8fCB3aGl0ZXNwYWNlKGMpKXtcblx0XHR0aGlzLl9zcGVjaWFsID0gU1BFQ0lBTF9TQ1JJUFQ7XG5cdH1cblx0dGhpcy5fc3RhdGUgPSBJTl9UQUdfTkFNRTtcblx0dGhpcy5faW5kZXgtLTsgLy9jb25zdW1lIHRoZSB0b2tlbiBhZ2FpblxufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVBZnRlclNjcmlwdDEgPSBpZkVsc2VTdGF0ZShcIlJcIiwgQUZURVJfU0NSSVBUXzIsIFRFWFQpO1xuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVBZnRlclNjcmlwdDIgPSBpZkVsc2VTdGF0ZShcIklcIiwgQUZURVJfU0NSSVBUXzMsIFRFWFQpO1xuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVBZnRlclNjcmlwdDMgPSBpZkVsc2VTdGF0ZShcIlBcIiwgQUZURVJfU0NSSVBUXzQsIFRFWFQpO1xuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVBZnRlclNjcmlwdDQgPSBpZkVsc2VTdGF0ZShcIlRcIiwgQUZURVJfU0NSSVBUXzUsIFRFWFQpO1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUFmdGVyU2NyaXB0NSA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIj5cIiB8fCB3aGl0ZXNwYWNlKGMpKXtcblx0XHR0aGlzLl9zcGVjaWFsID0gU1BFQ0lBTF9OT05FO1xuXHRcdHRoaXMuX3N0YXRlID0gSU5fQ0xPU0lOR19UQUdfTkFNRTtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleCAtIDY7XG5cdFx0dGhpcy5faW5kZXgtLTsgLy9yZWNvbnN1bWUgdGhlIHRva2VuXG5cdH1cblx0ZWxzZSB0aGlzLl9zdGF0ZSA9IFRFWFQ7XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUJlZm9yZVN0eWxlMSA9IGNvbnN1bWVTcGVjaWFsTmFtZUNoYXIoXCJZXCIsIEJFRk9SRV9TVFlMRV8yKTtcblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlU3R5bGUyID0gY29uc3VtZVNwZWNpYWxOYW1lQ2hhcihcIkxcIiwgQkVGT1JFX1NUWUxFXzMpO1xuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVCZWZvcmVTdHlsZTMgPSBjb25zdW1lU3BlY2lhbE5hbWVDaGFyKFwiRVwiLCBCRUZPUkVfU1RZTEVfNCk7XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlU3R5bGU0ID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiL1wiIHx8IGMgPT09IFwiPlwiIHx8IHdoaXRlc3BhY2UoYykpe1xuXHRcdHRoaXMuX3NwZWNpYWwgPSBTUEVDSUFMX1NUWUxFO1xuXHR9XG5cdHRoaXMuX3N0YXRlID0gSU5fVEFHX05BTUU7XG5cdHRoaXMuX2luZGV4LS07IC8vY29uc3VtZSB0aGUgdG9rZW4gYWdhaW5cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQWZ0ZXJTdHlsZTEgPSBpZkVsc2VTdGF0ZShcIllcIiwgQUZURVJfU1RZTEVfMiwgVEVYVCk7XG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUFmdGVyU3R5bGUyID0gaWZFbHNlU3RhdGUoXCJMXCIsIEFGVEVSX1NUWUxFXzMsIFRFWFQpO1xuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVBZnRlclN0eWxlMyA9IGlmRWxzZVN0YXRlKFwiRVwiLCBBRlRFUl9TVFlMRV80LCBURVhUKTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVBZnRlclN0eWxlNCA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIj5cIiB8fCB3aGl0ZXNwYWNlKGMpKXtcblx0XHR0aGlzLl9zcGVjaWFsID0gU1BFQ0lBTF9OT05FO1xuXHRcdHRoaXMuX3N0YXRlID0gSU5fQ0xPU0lOR19UQUdfTkFNRTtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleCAtIDU7XG5cdFx0dGhpcy5faW5kZXgtLTsgLy9yZWNvbnN1bWUgdGhlIHRva2VuXG5cdH1cblx0ZWxzZSB0aGlzLl9zdGF0ZSA9IFRFWFQ7XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUJlZm9yZUVudGl0eSA9IGlmRWxzZVN0YXRlKFwiI1wiLCBCRUZPUkVfTlVNRVJJQ19FTlRJVFksIElOX05BTUVEX0VOVElUWSk7XG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUJlZm9yZU51bWVyaWNFbnRpdHkgPSBpZkVsc2VTdGF0ZShcIlhcIiwgSU5fSEVYX0VOVElUWSwgSU5fTlVNRVJJQ19FTlRJVFkpO1xuXG4vL2ZvciBlbnRpdGllcyB3aXRoaW4gYXR0cmlidXRlc1xuVG9rZW5pemVyLnByb3RvdHlwZS5fcGFyc2VOYW1lZEVudGl0eVN0cmljdCA9IGZ1bmN0aW9uKCl7XG5cdC8vb2Zmc2V0ID0gMVxuXHRpZih0aGlzLl9zZWN0aW9uU3RhcnQgKyAxIDwgdGhpcy5faW5kZXgpe1xuXHRcdHZhciBlbnRpdHkgPSB0aGlzLl9idWZmZXIuc3Vic3RyaW5nKHRoaXMuX3NlY3Rpb25TdGFydCArIDEsIHRoaXMuX2luZGV4KSxcblx0XHQgICAgbWFwID0gdGhpcy5feG1sTW9kZSA/IHhtbE1hcCA6IGVudGl0eU1hcDtcblxuXHRcdGlmKG1hcC5oYXNPd25Qcm9wZXJ0eShlbnRpdHkpKXtcblx0XHRcdHRoaXMuX2VtaXRQYXJ0aWFsKG1hcFtlbnRpdHldKTtcblx0XHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4ICsgMTtcblx0XHR9XG5cdH1cbn07XG5cblxuLy9wYXJzZXMgbGVnYWN5IGVudGl0aWVzICh3aXRob3V0IHRyYWlsaW5nIHNlbWljb2xvbilcblRva2VuaXplci5wcm90b3R5cGUuX3BhcnNlTGVnYWN5RW50aXR5ID0gZnVuY3Rpb24oKXtcblx0dmFyIHN0YXJ0ID0gdGhpcy5fc2VjdGlvblN0YXJ0ICsgMSxcblx0ICAgIGxpbWl0ID0gdGhpcy5faW5kZXggLSBzdGFydDtcblxuXHRpZihsaW1pdCA+IDYpIGxpbWl0ID0gNjsgLy90aGUgbWF4IGxlbmd0aCBvZiBsZWdhY3kgZW50aXRpZXMgaXMgNlxuXG5cdHdoaWxlKGxpbWl0ID49IDIpeyAvL3RoZSBtaW4gbGVuZ3RoIG9mIGxlZ2FjeSBlbnRpdGllcyBpcyAyXG5cdFx0dmFyIGVudGl0eSA9IHRoaXMuX2J1ZmZlci5zdWJzdHIoc3RhcnQsIGxpbWl0KTtcblxuXHRcdGlmKGxlZ2FjeU1hcC5oYXNPd25Qcm9wZXJ0eShlbnRpdHkpKXtcblx0XHRcdHRoaXMuX2VtaXRQYXJ0aWFsKGxlZ2FjeU1hcFtlbnRpdHldKTtcblx0XHRcdHRoaXMuX3NlY3Rpb25TdGFydCArPSBsaW1pdCArIDI7XG5cdFx0XHRicmVhaztcblx0XHR9IGVsc2Uge1xuXHRcdFx0bGltaXQtLTtcblx0XHR9XG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlSW5OYW1lZEVudGl0eSA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIjtcIil7XG5cdFx0dGhpcy5fcGFyc2VOYW1lZEVudGl0eVN0cmljdCgpO1xuXHRcdGlmKHRoaXMuX3NlY3Rpb25TdGFydCArIDEgPCB0aGlzLl9pbmRleCAmJiAhdGhpcy5feG1sTW9kZSl7XG5cdFx0XHR0aGlzLl9wYXJzZUxlZ2FjeUVudGl0eSgpO1xuXHRcdH1cblx0XHR0aGlzLl9zdGF0ZSA9IHRoaXMuX2Jhc2VTdGF0ZTtcblx0fSBlbHNlIGlmKChjIDwgXCJhXCIgfHwgYyA+IFwielwiKSAmJiAoYyA8IFwiQVwiIHx8IGMgPiBcIlpcIikgJiYgKGMgPCBcIjBcIiB8fCBjID4gXCI5XCIpKXtcblx0XHRpZih0aGlzLl94bWxNb2RlKTtcblx0XHRlbHNlIGlmKHRoaXMuX2Jhc2VTdGF0ZSAhPT0gVEVYVCl7XG5cdFx0XHRpZihjICE9PSBcIj1cIil7XG5cdFx0XHRcdHRoaXMuX3BhcnNlTmFtZWRFbnRpdHlTdHJpY3QoKTtcblx0XHRcdFx0dGhpcy5fc2VjdGlvblN0YXJ0LS07IC8vaW5jbHVkZSB0aGUgY3VycmVudCBjaGFyYWN0ZXIgaW4gdGhlIHNlY3Rpb25cblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5fcGFyc2VMZWdhY3lFbnRpdHkoKTtcblx0XHRcdHRoaXMuX3NlY3Rpb25TdGFydC0tO1xuXHRcdH1cblx0XHR0aGlzLl9zdGF0ZSA9IHRoaXMuX2Jhc2VTdGF0ZTtcblx0XHR0aGlzLl9pbmRleC0tO1xuXHR9XG59O1xuXG4vLyBtb2RpZmllZCB2ZXJzaW9uIG9mIGh0dHBzOi8vZ2l0aHViLmNvbS9tYXRoaWFzYnluZW5zL2hlL2Jsb2IvbWFzdGVyL3NyYy9oZS5qcyNMOTQtTDExOVxuZnVuY3Rpb24gZGVjb2RlQ29kZVBvaW50KGNvZGVQb2ludCl7XG5cdHZhciBvdXRwdXQgPSBcIlwiO1xuXG5cdGlmKChjb2RlUG9pbnQgPj0gMHhEODAwICYmIGNvZGVQb2ludCA8PSAweERGRkYpIHx8IGNvZGVQb2ludCA+IDB4MTBGRkZGKXtcblx0XHRyZXR1cm4gXCJcXHVGRkZEXCI7XG5cdH1cblxuXHRpZihjb2RlUG9pbnQgaW4gZGVjb2RlTWFwKXtcblx0XHRjb2RlUG9pbnQgPSBkZWNvZGVNYXBbY29kZVBvaW50XTtcblx0fVxuXG5cdGlmKGNvZGVQb2ludCA+IDB4RkZGRil7XG5cdFx0Y29kZVBvaW50IC09IDB4MTAwMDA7XG5cdFx0b3V0cHV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoY29kZVBvaW50ID4+PiAxMCAmIDB4M0ZGIHwgMHhEODAwKTtcblx0XHRjb2RlUG9pbnQgPSAweERDMDAgfCBjb2RlUG9pbnQgJiAweDNGRjtcblx0fVxuXG5cdG91dHB1dCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGNvZGVQb2ludCk7XG5cdHJldHVybiBvdXRwdXQ7XG59XG5cblRva2VuaXplci5wcm90b3R5cGUuX2RlY29kZU51bWVyaWNFbnRpdHkgPSBmdW5jdGlvbihvZmZzZXQsIGJhc2Upe1xuXHR2YXIgc2VjdGlvblN0YXJ0ID0gdGhpcy5fc2VjdGlvblN0YXJ0ICsgb2Zmc2V0O1xuXG5cdGlmKHNlY3Rpb25TdGFydCAhPT0gdGhpcy5faW5kZXgpe1xuXHRcdC8vcGFyc2UgZW50aXR5XG5cdFx0dmFyIGVudGl0eSA9IHRoaXMuX2J1ZmZlci5zdWJzdHJpbmcoc2VjdGlvblN0YXJ0LCB0aGlzLl9pbmRleCk7XG5cdFx0dmFyIHBhcnNlZCA9IHBhcnNlSW50KGVudGl0eSwgYmFzZSk7XG5cblx0XHRpZihwYXJzZWQgPT09IHBhcnNlZCl7IC8vbm90IE5hTiAoVE9ETzogd2hlbiBjYW4gdGhpcyBoYXBwZW4/KVxuXHRcdFx0dGhpcy5fZW1pdFBhcnRpYWwoZGVjb2RlQ29kZVBvaW50KHBhcnNlZCkpO1xuXHRcdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXg7XG5cdFx0fVxuXHR9XG5cblx0dGhpcy5fc3RhdGUgPSB0aGlzLl9iYXNlU3RhdGU7XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUluTnVtZXJpY0VudGl0eSA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIjtcIil7XG5cdFx0dGhpcy5fZGVjb2RlTnVtZXJpY0VudGl0eSgyLCAxMCk7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0Kys7XG5cdH0gZWxzZSBpZihjIDwgXCIwXCIgfHwgYyA+IFwiOVwiKXtcblx0XHRpZighdGhpcy5feG1sTW9kZSl7XG5cdFx0XHR0aGlzLl9kZWNvZGVOdW1lcmljRW50aXR5KDIsIDEwKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5fc3RhdGUgPSB0aGlzLl9iYXNlU3RhdGU7XG5cdFx0fVxuXHRcdHRoaXMuX2luZGV4LS07XG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlSW5IZXhFbnRpdHkgPSBmdW5jdGlvbihjKXtcblx0aWYoYyA9PT0gXCI7XCIpe1xuXHRcdHRoaXMuX2RlY29kZU51bWVyaWNFbnRpdHkoMywgMTYpO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCsrO1xuXHR9IGVsc2UgaWYoKGMgPCBcImFcIiB8fCBjID4gXCJmXCIpICYmIChjIDwgXCJBXCIgfHwgYyA+IFwiRlwiKSAmJiAoYyA8IFwiMFwiIHx8IGMgPiBcIjlcIikpe1xuXHRcdGlmKCF0aGlzLl94bWxNb2RlKXtcblx0XHRcdHRoaXMuX2RlY29kZU51bWVyaWNFbnRpdHkoMywgMTYpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLl9zdGF0ZSA9IHRoaXMuX2Jhc2VTdGF0ZTtcblx0XHR9XG5cdFx0dGhpcy5faW5kZXgtLTtcblx0fVxufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fY2xlYW51cCA9IGZ1bmN0aW9uICgpIHtcblx0aWYodGhpcy5fc2VjdGlvblN0YXJ0IDwgMCl7XG5cdFx0dGhpcy5fYnVmZmVyID0gXCJcIjtcblx0XHR0aGlzLl9pbmRleCA9IDA7XG5cdH0gZWxzZSB7XG5cdFx0aWYodGhpcy5fc3RhdGUgPT09IFRFWFQpe1xuXHRcdFx0aWYodGhpcy5fc2VjdGlvblN0YXJ0ICE9PSB0aGlzLl9pbmRleCl7XG5cdFx0XHRcdHRoaXMuX2Nicy5vbnRleHQodGhpcy5fYnVmZmVyLnN1YnN0cih0aGlzLl9zZWN0aW9uU3RhcnQpKTtcblx0XHRcdH1cblx0XHRcdHRoaXMuX2J1ZmZlciA9IFwiXCI7XG5cdFx0XHR0aGlzLl9pbmRleCA9IDA7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3NlY3Rpb25TdGFydCA9PT0gdGhpcy5faW5kZXgpe1xuXHRcdFx0Ly90aGUgc2VjdGlvbiBqdXN0IHN0YXJ0ZWRcblx0XHRcdHRoaXMuX2J1ZmZlciA9IFwiXCI7XG5cdFx0XHR0aGlzLl9pbmRleCA9IDA7XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vcmVtb3ZlIGV2ZXJ5dGhpbmcgdW5uZWNlc3Nhcnlcblx0XHRcdHRoaXMuX2J1ZmZlciA9IHRoaXMuX2J1ZmZlci5zdWJzdHIodGhpcy5fc2VjdGlvblN0YXJ0KTtcblx0XHRcdHRoaXMuX2luZGV4IC09IHRoaXMuX3NlY3Rpb25TdGFydDtcblx0XHR9XG5cblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSAwO1xuXHR9XG59O1xuXG4vL1RPRE8gbWFrZSBldmVudHMgY29uZGl0aW9uYWxcblRva2VuaXplci5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbihjaHVuayl7XG5cdHRoaXMuX2J1ZmZlciArPSBjaHVuaztcblxuXHR3aGlsZSh0aGlzLl9pbmRleCA8IHRoaXMuX2J1ZmZlci5sZW5ndGggJiYgdGhpcy5fcnVubmluZyl7XG5cdFx0dmFyIGMgPSB0aGlzLl9idWZmZXIuY2hhckF0KHRoaXMuX2luZGV4KTtcblx0XHRpZih0aGlzLl9zdGF0ZSA9PT0gVEVYVCkge1xuXHRcdFx0dGhpcy5fc3RhdGVUZXh0KGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQkVGT1JFX1RBR19OQU1FKXtcblx0XHRcdHRoaXMuX3N0YXRlQmVmb3JlVGFnTmFtZShjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IElOX1RBR19OQU1FKSB7XG5cdFx0XHR0aGlzLl9zdGF0ZUluVGFnTmFtZShjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9DTE9TSU5HX1RBR19OQU1FKXtcblx0XHRcdHRoaXMuX3N0YXRlQmVmb3JlQ2xvc2VpbmdUYWdOYW1lKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gSU5fQ0xPU0lOR19UQUdfTkFNRSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUluQ2xvc2VpbmdUYWdOYW1lKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQUZURVJfQ0xPU0lOR19UQUdfTkFNRSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUFmdGVyQ2xvc2VpbmdUYWdOYW1lKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gSU5fU0VMRl9DTE9TSU5HX1RBRyl7XG5cdFx0XHR0aGlzLl9zdGF0ZUluU2VsZkNsb3NpbmdUYWcoYyk7XG5cdFx0fVxuXG5cdFx0Lypcblx0XHQqXHRhdHRyaWJ1dGVzXG5cdFx0Ki9cblx0XHRlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfQVRUUklCVVRFX05BTUUpe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVBdHRyaWJ1dGVOYW1lKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gSU5fQVRUUklCVVRFX05BTUUpe1xuXHRcdFx0dGhpcy5fc3RhdGVJbkF0dHJpYnV0ZU5hbWUoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBBRlRFUl9BVFRSSUJVVEVfTkFNRSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUFmdGVyQXR0cmlidXRlTmFtZShjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9BVFRSSUJVVEVfVkFMVUUpe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVBdHRyaWJ1dGVWYWx1ZShjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IElOX0FUVFJJQlVURV9WQUxVRV9EUSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUluQXR0cmlidXRlVmFsdWVEb3VibGVRdW90ZXMoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBJTl9BVFRSSUJVVEVfVkFMVUVfU1Epe1xuXHRcdFx0dGhpcy5fc3RhdGVJbkF0dHJpYnV0ZVZhbHVlU2luZ2xlUXVvdGVzKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gSU5fQVRUUklCVVRFX1ZBTFVFX05RKXtcblx0XHRcdHRoaXMuX3N0YXRlSW5BdHRyaWJ1dGVWYWx1ZU5vUXVvdGVzKGMpO1xuXHRcdH1cblxuXHRcdC8qXG5cdFx0Klx0ZGVjbGFyYXRpb25zXG5cdFx0Ki9cblx0XHRlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfREVDTEFSQVRJT04pe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVEZWNsYXJhdGlvbihjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IElOX0RFQ0xBUkFUSU9OKXtcblx0XHRcdHRoaXMuX3N0YXRlSW5EZWNsYXJhdGlvbihjKTtcblx0XHR9XG5cblx0XHQvKlxuXHRcdCpcdHByb2Nlc3NpbmcgaW5zdHJ1Y3Rpb25zXG5cdFx0Ki9cblx0XHRlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBJTl9QUk9DRVNTSU5HX0lOU1RSVUNUSU9OKXtcblx0XHRcdHRoaXMuX3N0YXRlSW5Qcm9jZXNzaW5nSW5zdHJ1Y3Rpb24oYyk7XG5cdFx0fVxuXG5cdFx0Lypcblx0XHQqXHRjb21tZW50c1xuXHRcdCovXG5cdFx0ZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQkVGT1JFX0NPTU1FTlQpe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVDb21tZW50KGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gSU5fQ09NTUVOVCl7XG5cdFx0XHR0aGlzLl9zdGF0ZUluQ29tbWVudChjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEFGVEVSX0NPTU1FTlRfMSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUFmdGVyQ29tbWVudDEoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBBRlRFUl9DT01NRU5UXzIpe1xuXHRcdFx0dGhpcy5fc3RhdGVBZnRlckNvbW1lbnQyKGMpO1xuXHRcdH1cblxuXHRcdC8qXG5cdFx0Klx0Y2RhdGFcblx0XHQqL1xuXHRcdGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9DREFUQV8xKXtcblx0XHRcdHRoaXMuX3N0YXRlQmVmb3JlQ2RhdGExKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQkVGT1JFX0NEQVRBXzIpe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVDZGF0YTIoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfQ0RBVEFfMyl7XG5cdFx0XHR0aGlzLl9zdGF0ZUJlZm9yZUNkYXRhMyhjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9DREFUQV80KXtcblx0XHRcdHRoaXMuX3N0YXRlQmVmb3JlQ2RhdGE0KGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQkVGT1JFX0NEQVRBXzUpe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVDZGF0YTUoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfQ0RBVEFfNil7XG5cdFx0XHR0aGlzLl9zdGF0ZUJlZm9yZUNkYXRhNihjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IElOX0NEQVRBKXtcblx0XHRcdHRoaXMuX3N0YXRlSW5DZGF0YShjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEFGVEVSX0NEQVRBXzEpe1xuXHRcdFx0dGhpcy5fc3RhdGVBZnRlckNkYXRhMShjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEFGVEVSX0NEQVRBXzIpe1xuXHRcdFx0dGhpcy5fc3RhdGVBZnRlckNkYXRhMihjKTtcblx0XHR9XG5cblx0XHQvKlxuXHRcdCogc3BlY2lhbCB0YWdzXG5cdFx0Ki9cblx0XHRlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfU1BFQ0lBTCl7XG5cdFx0XHR0aGlzLl9zdGF0ZUJlZm9yZVNwZWNpYWwoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfU1BFQ0lBTF9FTkQpe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVTcGVjaWFsRW5kKGMpO1xuXHRcdH1cblxuXHRcdC8qXG5cdFx0KiBzY3JpcHRcblx0XHQqL1xuXHRcdGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9TQ1JJUFRfMSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUJlZm9yZVNjcmlwdDEoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfU0NSSVBUXzIpe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVTY3JpcHQyKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQkVGT1JFX1NDUklQVF8zKXtcblx0XHRcdHRoaXMuX3N0YXRlQmVmb3JlU2NyaXB0MyhjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9TQ1JJUFRfNCl7XG5cdFx0XHR0aGlzLl9zdGF0ZUJlZm9yZVNjcmlwdDQoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfU0NSSVBUXzUpe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVTY3JpcHQ1KGMpO1xuXHRcdH1cblxuXHRcdGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEFGVEVSX1NDUklQVF8xKXtcblx0XHRcdHRoaXMuX3N0YXRlQWZ0ZXJTY3JpcHQxKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQUZURVJfU0NSSVBUXzIpe1xuXHRcdFx0dGhpcy5fc3RhdGVBZnRlclNjcmlwdDIoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBBRlRFUl9TQ1JJUFRfMyl7XG5cdFx0XHR0aGlzLl9zdGF0ZUFmdGVyU2NyaXB0MyhjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEFGVEVSX1NDUklQVF80KXtcblx0XHRcdHRoaXMuX3N0YXRlQWZ0ZXJTY3JpcHQ0KGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQUZURVJfU0NSSVBUXzUpe1xuXHRcdFx0dGhpcy5fc3RhdGVBZnRlclNjcmlwdDUoYyk7XG5cdFx0fVxuXG5cdFx0Lypcblx0XHQqIHN0eWxlXG5cdFx0Ki9cblx0XHRlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfU1RZTEVfMSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUJlZm9yZVN0eWxlMShjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9TVFlMRV8yKXtcblx0XHRcdHRoaXMuX3N0YXRlQmVmb3JlU3R5bGUyKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQkVGT1JFX1NUWUxFXzMpe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVTdHlsZTMoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfU1RZTEVfNCl7XG5cdFx0XHR0aGlzLl9zdGF0ZUJlZm9yZVN0eWxlNChjKTtcblx0XHR9XG5cblx0XHRlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBBRlRFUl9TVFlMRV8xKXtcblx0XHRcdHRoaXMuX3N0YXRlQWZ0ZXJTdHlsZTEoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBBRlRFUl9TVFlMRV8yKXtcblx0XHRcdHRoaXMuX3N0YXRlQWZ0ZXJTdHlsZTIoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBBRlRFUl9TVFlMRV8zKXtcblx0XHRcdHRoaXMuX3N0YXRlQWZ0ZXJTdHlsZTMoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBBRlRFUl9TVFlMRV80KXtcblx0XHRcdHRoaXMuX3N0YXRlQWZ0ZXJTdHlsZTQoYyk7XG5cdFx0fVxuXG5cdFx0Lypcblx0XHQqIGVudGl0aWVzXG5cdFx0Ki9cblx0XHRlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfRU5USVRZKXtcblx0XHRcdHRoaXMuX3N0YXRlQmVmb3JlRW50aXR5KGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQkVGT1JFX05VTUVSSUNfRU5USVRZKXtcblx0XHRcdHRoaXMuX3N0YXRlQmVmb3JlTnVtZXJpY0VudGl0eShjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IElOX05BTUVEX0VOVElUWSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUluTmFtZWRFbnRpdHkoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBJTl9OVU1FUklDX0VOVElUWSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUluTnVtZXJpY0VudGl0eShjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IElOX0hFWF9FTlRJVFkpe1xuXHRcdFx0dGhpcy5fc3RhdGVJbkhleEVudGl0eShjKTtcblx0XHR9XG5cblx0XHRlbHNlIHtcblx0XHRcdHRoaXMuX2Nicy5vbmVycm9yKEVycm9yKFwidW5rbm93biBfc3RhdGVcIiksIHRoaXMuX3N0YXRlKTtcblx0XHR9XG5cblx0XHR0aGlzLl9pbmRleCsrO1xuXHR9XG5cblx0dGhpcy5fY2xlYW51cCgpO1xufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uKCl7XG5cdHRoaXMuX3J1bm5pbmcgPSBmYWxzZTtcbn07XG5Ub2tlbml6ZXIucHJvdG90eXBlLnJlc3VtZSA9IGZ1bmN0aW9uKCl7XG5cdHRoaXMuX3J1bm5pbmcgPSB0cnVlO1xufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5lbmQgPSBmdW5jdGlvbihjaHVuayl7XG5cdGlmKGNodW5rKSB0aGlzLndyaXRlKGNodW5rKTtcblxuXHQvL2lmIHRoZXJlIGlzIHJlbWFpbmluZyBkYXRhLCBlbWl0IGl0IGluIGEgcmVhc29uYWJsZSB3YXlcblx0aWYodGhpcy5fc2VjdGlvblN0YXJ0IDwgdGhpcy5faW5kZXgpe1xuXHRcdHRoaXMuX2hhbmRsZVRyYWlsaW5nRGF0YSgpO1xuXHR9XG5cblx0dGhpcy5fY2JzLm9uZW5kKCk7XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9oYW5kbGVUcmFpbGluZ0RhdGEgPSBmdW5jdGlvbigpe1xuXHR2YXIgZGF0YSA9IHRoaXMuX2J1ZmZlci5zdWJzdHIodGhpcy5fc2VjdGlvblN0YXJ0KTtcblxuXHRpZih0aGlzLl9zdGF0ZSA9PT0gSU5fQ0RBVEEgfHwgdGhpcy5fc3RhdGUgPT09IEFGVEVSX0NEQVRBXzEgfHwgdGhpcy5fc3RhdGUgPT09IEFGVEVSX0NEQVRBXzIpe1xuXHRcdHRoaXMuX2Nicy5vbmNkYXRhKGRhdGEpO1xuXHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IElOX0NPTU1FTlQgfHwgdGhpcy5fc3RhdGUgPT09IEFGVEVSX0NPTU1FTlRfMSB8fCB0aGlzLl9zdGF0ZSA9PT0gQUZURVJfQ09NTUVOVF8yKXtcblx0XHR0aGlzLl9jYnMub25jb21tZW50KGRhdGEpO1xuXHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IElOX1RBR19OQU1FKXtcblx0XHR0aGlzLl9jYnMub25vcGVudGFnbmFtZShkYXRhKTtcblx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfQVRUUklCVVRFX05BTUUgfHwgdGhpcy5fc3RhdGUgPT09IEJFRk9SRV9BVFRSSUJVVEVfVkFMVUUgfHwgdGhpcy5fc3RhdGUgPT09IEFGVEVSX0FUVFJJQlVURV9OQU1FKXtcblx0XHR0aGlzLl9jYnMub25vcGVudGFnZW5kKCk7XG5cdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gSU5fQVRUUklCVVRFX05BTUUpe1xuXHRcdHRoaXMuX2Nicy5vbmF0dHJpYm5hbWUoZGF0YSk7XG5cdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gSU5fQVRUUklCVVRFX1ZBTFVFX1NRIHx8IHRoaXMuX3N0YXRlID09PSBJTl9BVFRSSUJVVEVfVkFMVUVfRFEgfHwgdGhpcy5fc3RhdGUgPT09IElOX0FUVFJJQlVURV9WQUxVRV9OUSl7XG5cdFx0dGhpcy5fY2JzLm9uYXR0cmliZGF0YShkYXRhKTtcblx0XHR0aGlzLl9jYnMub25hdHRyaWJlbmQoKTtcblx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBJTl9DTE9TSU5HX1RBR19OQU1FKXtcblx0XHR0aGlzLl9jYnMub25jbG9zZXRhZyhkYXRhKTtcblx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBJTl9OQU1FRF9FTlRJVFkgJiYgIXRoaXMuX3htbE1vZGUpe1xuXHRcdHRoaXMuX3BhcnNlTGVnYWN5RW50aXR5KCk7XG5cdFx0aWYoLS10aGlzLl9zZWN0aW9uU3RhcnQgPCB0aGlzLl9pbmRleCl7XG5cdFx0XHR0aGlzLl9zdGF0ZSA9IHRoaXMuX2Jhc2VTdGF0ZTtcblx0XHRcdHRoaXMuX2hhbmRsZVRyYWlsaW5nRGF0YSgpO1xuXHRcdH1cblx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBJTl9OVU1FUklDX0VOVElUWSAmJiAhdGhpcy5feG1sTW9kZSl7XG5cdFx0dGhpcy5fZGVjb2RlTnVtZXJpY0VudGl0eSgyLCAxMCk7XG5cdFx0aWYodGhpcy5fc2VjdGlvblN0YXJ0IDwgdGhpcy5faW5kZXgpe1xuXHRcdFx0dGhpcy5fc3RhdGUgPSB0aGlzLl9iYXNlU3RhdGU7XG5cdFx0XHR0aGlzLl9oYW5kbGVUcmFpbGluZ0RhdGEoKTtcblx0XHR9XG5cdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gSU5fSEVYX0VOVElUWSAmJiAhdGhpcy5feG1sTW9kZSl7XG5cdFx0dGhpcy5fZGVjb2RlTnVtZXJpY0VudGl0eSgzLCAxNik7XG5cdFx0aWYodGhpcy5fc2VjdGlvblN0YXJ0IDwgdGhpcy5faW5kZXgpe1xuXHRcdFx0dGhpcy5fc3RhdGUgPSB0aGlzLl9iYXNlU3RhdGU7XG5cdFx0XHR0aGlzLl9oYW5kbGVUcmFpbGluZ0RhdGEoKTtcblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0dGhpcy5fY2JzLm9udGV4dChkYXRhKTtcblx0fVxufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5yZXNldCA9IGZ1bmN0aW9uKCl7XG5cdFRva2VuaXplci5jYWxsKHRoaXMsIHt4bWxNb2RlOiB0aGlzLl94bWxNb2RlLCBkZWNvZGVFbnRpdGllczogdGhpcy5fZGVjb2RlRW50aXRpZXN9LCB0aGlzLl9jYnMpO1xufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fZ2V0U2VjdGlvbiA9IGZ1bmN0aW9uKCl7XG5cdHJldHVybiB0aGlzLl9idWZmZXIuc3Vic3RyaW5nKHRoaXMuX3NlY3Rpb25TdGFydCwgdGhpcy5faW5kZXgpO1xufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fZW1pdFRva2VuID0gZnVuY3Rpb24obmFtZSl7XG5cdHRoaXMuX2Nic1tuYW1lXSh0aGlzLl9nZXRTZWN0aW9uKCkpO1xuXHR0aGlzLl9zZWN0aW9uU3RhcnQgPSAtMTtcbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX2VtaXRQYXJ0aWFsID0gZnVuY3Rpb24odmFsdWUpe1xuXHRpZih0aGlzLl9iYXNlU3RhdGUgIT09IFRFWFQpe1xuXHRcdHRoaXMuX2Nicy5vbmF0dHJpYmRhdGEodmFsdWUpOyAvL1RPRE8gaW1wbGVtZW50IHRoZSBuZXcgZXZlbnRcblx0fSBlbHNlIHtcblx0XHR0aGlzLl9jYnMub250ZXh0KHZhbHVlKTtcblx0fVxufTtcbiIsIm1vZHVsZS5leHBvcnRzPXtcIjBcIjpcIlxcdUZGRkRcIixcIjEyOFwiOlwiXFx1MjBBQ1wiLFwiMTMwXCI6XCJcXHUyMDFBXCIsXCIxMzFcIjpcIlxcdTAxOTJcIixcIjEzMlwiOlwiXFx1MjAxRVwiLFwiMTMzXCI6XCJcXHUyMDI2XCIsXCIxMzRcIjpcIlxcdTIwMjBcIixcIjEzNVwiOlwiXFx1MjAyMVwiLFwiMTM2XCI6XCJcXHUwMkM2XCIsXCIxMzdcIjpcIlxcdTIwMzBcIixcIjEzOFwiOlwiXFx1MDE2MFwiLFwiMTM5XCI6XCJcXHUyMDM5XCIsXCIxNDBcIjpcIlxcdTAxNTJcIixcIjE0MlwiOlwiXFx1MDE3RFwiLFwiMTQ1XCI6XCJcXHUyMDE4XCIsXCIxNDZcIjpcIlxcdTIwMTlcIixcIjE0N1wiOlwiXFx1MjAxQ1wiLFwiMTQ4XCI6XCJcXHUyMDFEXCIsXCIxNDlcIjpcIlxcdTIwMjJcIixcIjE1MFwiOlwiXFx1MjAxM1wiLFwiMTUxXCI6XCJcXHUyMDE0XCIsXCIxNTJcIjpcIlxcdTAyRENcIixcIjE1M1wiOlwiXFx1MjEyMlwiLFwiMTU0XCI6XCJcXHUwMTYxXCIsXCIxNTVcIjpcIlxcdTIwM0FcIixcIjE1NlwiOlwiXFx1MDE1M1wiLFwiMTU4XCI6XCJcXHUwMTdFXCIsXCIxNTlcIjpcIlxcdTAxNzhcIn1cbiIsIm1vZHVsZS5leHBvcnRzPXtcIkFhY3V0ZVwiOlwiXFx1MDBDMVwiLFwiYWFjdXRlXCI6XCJcXHUwMEUxXCIsXCJBYnJldmVcIjpcIlxcdTAxMDJcIixcImFicmV2ZVwiOlwiXFx1MDEwM1wiLFwiYWNcIjpcIlxcdTIyM0VcIixcImFjZFwiOlwiXFx1MjIzRlwiLFwiYWNFXCI6XCJcXHUyMjNFXFx1MDMzM1wiLFwiQWNpcmNcIjpcIlxcdTAwQzJcIixcImFjaXJjXCI6XCJcXHUwMEUyXCIsXCJhY3V0ZVwiOlwiXFx1MDBCNFwiLFwiQWN5XCI6XCJcXHUwNDEwXCIsXCJhY3lcIjpcIlxcdTA0MzBcIixcIkFFbGlnXCI6XCJcXHUwMEM2XCIsXCJhZWxpZ1wiOlwiXFx1MDBFNlwiLFwiYWZcIjpcIlxcdTIwNjFcIixcIkFmclwiOlwiXFx1RDgzNVxcdUREMDRcIixcImFmclwiOlwiXFx1RDgzNVxcdUREMUVcIixcIkFncmF2ZVwiOlwiXFx1MDBDMFwiLFwiYWdyYXZlXCI6XCJcXHUwMEUwXCIsXCJhbGVmc3ltXCI6XCJcXHUyMTM1XCIsXCJhbGVwaFwiOlwiXFx1MjEzNVwiLFwiQWxwaGFcIjpcIlxcdTAzOTFcIixcImFscGhhXCI6XCJcXHUwM0IxXCIsXCJBbWFjclwiOlwiXFx1MDEwMFwiLFwiYW1hY3JcIjpcIlxcdTAxMDFcIixcImFtYWxnXCI6XCJcXHUyQTNGXCIsXCJhbXBcIjpcIiZcIixcIkFNUFwiOlwiJlwiLFwiYW5kYW5kXCI6XCJcXHUyQTU1XCIsXCJBbmRcIjpcIlxcdTJBNTNcIixcImFuZFwiOlwiXFx1MjIyN1wiLFwiYW5kZFwiOlwiXFx1MkE1Q1wiLFwiYW5kc2xvcGVcIjpcIlxcdTJBNThcIixcImFuZHZcIjpcIlxcdTJBNUFcIixcImFuZ1wiOlwiXFx1MjIyMFwiLFwiYW5nZVwiOlwiXFx1MjlBNFwiLFwiYW5nbGVcIjpcIlxcdTIyMjBcIixcImFuZ21zZGFhXCI6XCJcXHUyOUE4XCIsXCJhbmdtc2RhYlwiOlwiXFx1MjlBOVwiLFwiYW5nbXNkYWNcIjpcIlxcdTI5QUFcIixcImFuZ21zZGFkXCI6XCJcXHUyOUFCXCIsXCJhbmdtc2RhZVwiOlwiXFx1MjlBQ1wiLFwiYW5nbXNkYWZcIjpcIlxcdTI5QURcIixcImFuZ21zZGFnXCI6XCJcXHUyOUFFXCIsXCJhbmdtc2RhaFwiOlwiXFx1MjlBRlwiLFwiYW5nbXNkXCI6XCJcXHUyMjIxXCIsXCJhbmdydFwiOlwiXFx1MjIxRlwiLFwiYW5ncnR2YlwiOlwiXFx1MjJCRVwiLFwiYW5ncnR2YmRcIjpcIlxcdTI5OURcIixcImFuZ3NwaFwiOlwiXFx1MjIyMlwiLFwiYW5nc3RcIjpcIlxcdTAwQzVcIixcImFuZ3phcnJcIjpcIlxcdTIzN0NcIixcIkFvZ29uXCI6XCJcXHUwMTA0XCIsXCJhb2dvblwiOlwiXFx1MDEwNVwiLFwiQW9wZlwiOlwiXFx1RDgzNVxcdUREMzhcIixcImFvcGZcIjpcIlxcdUQ4MzVcXHVERDUyXCIsXCJhcGFjaXJcIjpcIlxcdTJBNkZcIixcImFwXCI6XCJcXHUyMjQ4XCIsXCJhcEVcIjpcIlxcdTJBNzBcIixcImFwZVwiOlwiXFx1MjI0QVwiLFwiYXBpZFwiOlwiXFx1MjI0QlwiLFwiYXBvc1wiOlwiJ1wiLFwiQXBwbHlGdW5jdGlvblwiOlwiXFx1MjA2MVwiLFwiYXBwcm94XCI6XCJcXHUyMjQ4XCIsXCJhcHByb3hlcVwiOlwiXFx1MjI0QVwiLFwiQXJpbmdcIjpcIlxcdTAwQzVcIixcImFyaW5nXCI6XCJcXHUwMEU1XCIsXCJBc2NyXCI6XCJcXHVEODM1XFx1REM5Q1wiLFwiYXNjclwiOlwiXFx1RDgzNVxcdURDQjZcIixcIkFzc2lnblwiOlwiXFx1MjI1NFwiLFwiYXN0XCI6XCIqXCIsXCJhc3ltcFwiOlwiXFx1MjI0OFwiLFwiYXN5bXBlcVwiOlwiXFx1MjI0RFwiLFwiQXRpbGRlXCI6XCJcXHUwMEMzXCIsXCJhdGlsZGVcIjpcIlxcdTAwRTNcIixcIkF1bWxcIjpcIlxcdTAwQzRcIixcImF1bWxcIjpcIlxcdTAwRTRcIixcImF3Y29uaW50XCI6XCJcXHUyMjMzXCIsXCJhd2ludFwiOlwiXFx1MkExMVwiLFwiYmFja2NvbmdcIjpcIlxcdTIyNENcIixcImJhY2tlcHNpbG9uXCI6XCJcXHUwM0Y2XCIsXCJiYWNrcHJpbWVcIjpcIlxcdTIwMzVcIixcImJhY2tzaW1cIjpcIlxcdTIyM0RcIixcImJhY2tzaW1lcVwiOlwiXFx1MjJDRFwiLFwiQmFja3NsYXNoXCI6XCJcXHUyMjE2XCIsXCJCYXJ2XCI6XCJcXHUyQUU3XCIsXCJiYXJ2ZWVcIjpcIlxcdTIyQkRcIixcImJhcndlZFwiOlwiXFx1MjMwNVwiLFwiQmFyd2VkXCI6XCJcXHUyMzA2XCIsXCJiYXJ3ZWRnZVwiOlwiXFx1MjMwNVwiLFwiYmJya1wiOlwiXFx1MjNCNVwiLFwiYmJya3RicmtcIjpcIlxcdTIzQjZcIixcImJjb25nXCI6XCJcXHUyMjRDXCIsXCJCY3lcIjpcIlxcdTA0MTFcIixcImJjeVwiOlwiXFx1MDQzMVwiLFwiYmRxdW9cIjpcIlxcdTIwMUVcIixcImJlY2F1c1wiOlwiXFx1MjIzNVwiLFwiYmVjYXVzZVwiOlwiXFx1MjIzNVwiLFwiQmVjYXVzZVwiOlwiXFx1MjIzNVwiLFwiYmVtcHR5dlwiOlwiXFx1MjlCMFwiLFwiYmVwc2lcIjpcIlxcdTAzRjZcIixcImJlcm5vdVwiOlwiXFx1MjEyQ1wiLFwiQmVybm91bGxpc1wiOlwiXFx1MjEyQ1wiLFwiQmV0YVwiOlwiXFx1MDM5MlwiLFwiYmV0YVwiOlwiXFx1MDNCMlwiLFwiYmV0aFwiOlwiXFx1MjEzNlwiLFwiYmV0d2VlblwiOlwiXFx1MjI2Q1wiLFwiQmZyXCI6XCJcXHVEODM1XFx1REQwNVwiLFwiYmZyXCI6XCJcXHVEODM1XFx1REQxRlwiLFwiYmlnY2FwXCI6XCJcXHUyMkMyXCIsXCJiaWdjaXJjXCI6XCJcXHUyNUVGXCIsXCJiaWdjdXBcIjpcIlxcdTIyQzNcIixcImJpZ29kb3RcIjpcIlxcdTJBMDBcIixcImJpZ29wbHVzXCI6XCJcXHUyQTAxXCIsXCJiaWdvdGltZXNcIjpcIlxcdTJBMDJcIixcImJpZ3NxY3VwXCI6XCJcXHUyQTA2XCIsXCJiaWdzdGFyXCI6XCJcXHUyNjA1XCIsXCJiaWd0cmlhbmdsZWRvd25cIjpcIlxcdTI1QkRcIixcImJpZ3RyaWFuZ2xldXBcIjpcIlxcdTI1QjNcIixcImJpZ3VwbHVzXCI6XCJcXHUyQTA0XCIsXCJiaWd2ZWVcIjpcIlxcdTIyQzFcIixcImJpZ3dlZGdlXCI6XCJcXHUyMkMwXCIsXCJia2Fyb3dcIjpcIlxcdTI5MERcIixcImJsYWNrbG96ZW5nZVwiOlwiXFx1MjlFQlwiLFwiYmxhY2tzcXVhcmVcIjpcIlxcdTI1QUFcIixcImJsYWNrdHJpYW5nbGVcIjpcIlxcdTI1QjRcIixcImJsYWNrdHJpYW5nbGVkb3duXCI6XCJcXHUyNUJFXCIsXCJibGFja3RyaWFuZ2xlbGVmdFwiOlwiXFx1MjVDMlwiLFwiYmxhY2t0cmlhbmdsZXJpZ2h0XCI6XCJcXHUyNUI4XCIsXCJibGFua1wiOlwiXFx1MjQyM1wiLFwiYmxrMTJcIjpcIlxcdTI1OTJcIixcImJsazE0XCI6XCJcXHUyNTkxXCIsXCJibGszNFwiOlwiXFx1MjU5M1wiLFwiYmxvY2tcIjpcIlxcdTI1ODhcIixcImJuZVwiOlwiPVxcdTIwRTVcIixcImJuZXF1aXZcIjpcIlxcdTIyNjFcXHUyMEU1XCIsXCJiTm90XCI6XCJcXHUyQUVEXCIsXCJibm90XCI6XCJcXHUyMzEwXCIsXCJCb3BmXCI6XCJcXHVEODM1XFx1REQzOVwiLFwiYm9wZlwiOlwiXFx1RDgzNVxcdURENTNcIixcImJvdFwiOlwiXFx1MjJBNVwiLFwiYm90dG9tXCI6XCJcXHUyMkE1XCIsXCJib3d0aWVcIjpcIlxcdTIyQzhcIixcImJveGJveFwiOlwiXFx1MjlDOVwiLFwiYm94ZGxcIjpcIlxcdTI1MTBcIixcImJveGRMXCI6XCJcXHUyNTU1XCIsXCJib3hEbFwiOlwiXFx1MjU1NlwiLFwiYm94RExcIjpcIlxcdTI1NTdcIixcImJveGRyXCI6XCJcXHUyNTBDXCIsXCJib3hkUlwiOlwiXFx1MjU1MlwiLFwiYm94RHJcIjpcIlxcdTI1NTNcIixcImJveERSXCI6XCJcXHUyNTU0XCIsXCJib3hoXCI6XCJcXHUyNTAwXCIsXCJib3hIXCI6XCJcXHUyNTUwXCIsXCJib3hoZFwiOlwiXFx1MjUyQ1wiLFwiYm94SGRcIjpcIlxcdTI1NjRcIixcImJveGhEXCI6XCJcXHUyNTY1XCIsXCJib3hIRFwiOlwiXFx1MjU2NlwiLFwiYm94aHVcIjpcIlxcdTI1MzRcIixcImJveEh1XCI6XCJcXHUyNTY3XCIsXCJib3hoVVwiOlwiXFx1MjU2OFwiLFwiYm94SFVcIjpcIlxcdTI1NjlcIixcImJveG1pbnVzXCI6XCJcXHUyMjlGXCIsXCJib3hwbHVzXCI6XCJcXHUyMjlFXCIsXCJib3h0aW1lc1wiOlwiXFx1MjJBMFwiLFwiYm94dWxcIjpcIlxcdTI1MThcIixcImJveHVMXCI6XCJcXHUyNTVCXCIsXCJib3hVbFwiOlwiXFx1MjU1Q1wiLFwiYm94VUxcIjpcIlxcdTI1NURcIixcImJveHVyXCI6XCJcXHUyNTE0XCIsXCJib3h1UlwiOlwiXFx1MjU1OFwiLFwiYm94VXJcIjpcIlxcdTI1NTlcIixcImJveFVSXCI6XCJcXHUyNTVBXCIsXCJib3h2XCI6XCJcXHUyNTAyXCIsXCJib3hWXCI6XCJcXHUyNTUxXCIsXCJib3h2aFwiOlwiXFx1MjUzQ1wiLFwiYm94dkhcIjpcIlxcdTI1NkFcIixcImJveFZoXCI6XCJcXHUyNTZCXCIsXCJib3hWSFwiOlwiXFx1MjU2Q1wiLFwiYm94dmxcIjpcIlxcdTI1MjRcIixcImJveHZMXCI6XCJcXHUyNTYxXCIsXCJib3hWbFwiOlwiXFx1MjU2MlwiLFwiYm94VkxcIjpcIlxcdTI1NjNcIixcImJveHZyXCI6XCJcXHUyNTFDXCIsXCJib3h2UlwiOlwiXFx1MjU1RVwiLFwiYm94VnJcIjpcIlxcdTI1NUZcIixcImJveFZSXCI6XCJcXHUyNTYwXCIsXCJicHJpbWVcIjpcIlxcdTIwMzVcIixcImJyZXZlXCI6XCJcXHUwMkQ4XCIsXCJCcmV2ZVwiOlwiXFx1MDJEOFwiLFwiYnJ2YmFyXCI6XCJcXHUwMEE2XCIsXCJic2NyXCI6XCJcXHVEODM1XFx1RENCN1wiLFwiQnNjclwiOlwiXFx1MjEyQ1wiLFwiYnNlbWlcIjpcIlxcdTIwNEZcIixcImJzaW1cIjpcIlxcdTIyM0RcIixcImJzaW1lXCI6XCJcXHUyMkNEXCIsXCJic29sYlwiOlwiXFx1MjlDNVwiLFwiYnNvbFwiOlwiXFxcXFwiLFwiYnNvbGhzdWJcIjpcIlxcdTI3QzhcIixcImJ1bGxcIjpcIlxcdTIwMjJcIixcImJ1bGxldFwiOlwiXFx1MjAyMlwiLFwiYnVtcFwiOlwiXFx1MjI0RVwiLFwiYnVtcEVcIjpcIlxcdTJBQUVcIixcImJ1bXBlXCI6XCJcXHUyMjRGXCIsXCJCdW1wZXFcIjpcIlxcdTIyNEVcIixcImJ1bXBlcVwiOlwiXFx1MjI0RlwiLFwiQ2FjdXRlXCI6XCJcXHUwMTA2XCIsXCJjYWN1dGVcIjpcIlxcdTAxMDdcIixcImNhcGFuZFwiOlwiXFx1MkE0NFwiLFwiY2FwYnJjdXBcIjpcIlxcdTJBNDlcIixcImNhcGNhcFwiOlwiXFx1MkE0QlwiLFwiY2FwXCI6XCJcXHUyMjI5XCIsXCJDYXBcIjpcIlxcdTIyRDJcIixcImNhcGN1cFwiOlwiXFx1MkE0N1wiLFwiY2FwZG90XCI6XCJcXHUyQTQwXCIsXCJDYXBpdGFsRGlmZmVyZW50aWFsRFwiOlwiXFx1MjE0NVwiLFwiY2Fwc1wiOlwiXFx1MjIyOVxcdUZFMDBcIixcImNhcmV0XCI6XCJcXHUyMDQxXCIsXCJjYXJvblwiOlwiXFx1MDJDN1wiLFwiQ2F5bGV5c1wiOlwiXFx1MjEyRFwiLFwiY2NhcHNcIjpcIlxcdTJBNERcIixcIkNjYXJvblwiOlwiXFx1MDEwQ1wiLFwiY2Nhcm9uXCI6XCJcXHUwMTBEXCIsXCJDY2VkaWxcIjpcIlxcdTAwQzdcIixcImNjZWRpbFwiOlwiXFx1MDBFN1wiLFwiQ2NpcmNcIjpcIlxcdTAxMDhcIixcImNjaXJjXCI6XCJcXHUwMTA5XCIsXCJDY29uaW50XCI6XCJcXHUyMjMwXCIsXCJjY3Vwc1wiOlwiXFx1MkE0Q1wiLFwiY2N1cHNzbVwiOlwiXFx1MkE1MFwiLFwiQ2RvdFwiOlwiXFx1MDEwQVwiLFwiY2RvdFwiOlwiXFx1MDEwQlwiLFwiY2VkaWxcIjpcIlxcdTAwQjhcIixcIkNlZGlsbGFcIjpcIlxcdTAwQjhcIixcImNlbXB0eXZcIjpcIlxcdTI5QjJcIixcImNlbnRcIjpcIlxcdTAwQTJcIixcImNlbnRlcmRvdFwiOlwiXFx1MDBCN1wiLFwiQ2VudGVyRG90XCI6XCJcXHUwMEI3XCIsXCJjZnJcIjpcIlxcdUQ4MzVcXHVERDIwXCIsXCJDZnJcIjpcIlxcdTIxMkRcIixcIkNIY3lcIjpcIlxcdTA0MjdcIixcImNoY3lcIjpcIlxcdTA0NDdcIixcImNoZWNrXCI6XCJcXHUyNzEzXCIsXCJjaGVja21hcmtcIjpcIlxcdTI3MTNcIixcIkNoaVwiOlwiXFx1MDNBN1wiLFwiY2hpXCI6XCJcXHUwM0M3XCIsXCJjaXJjXCI6XCJcXHUwMkM2XCIsXCJjaXJjZXFcIjpcIlxcdTIyNTdcIixcImNpcmNsZWFycm93bGVmdFwiOlwiXFx1MjFCQVwiLFwiY2lyY2xlYXJyb3dyaWdodFwiOlwiXFx1MjFCQlwiLFwiY2lyY2xlZGFzdFwiOlwiXFx1MjI5QlwiLFwiY2lyY2xlZGNpcmNcIjpcIlxcdTIyOUFcIixcImNpcmNsZWRkYXNoXCI6XCJcXHUyMjlEXCIsXCJDaXJjbGVEb3RcIjpcIlxcdTIyOTlcIixcImNpcmNsZWRSXCI6XCJcXHUwMEFFXCIsXCJjaXJjbGVkU1wiOlwiXFx1MjRDOFwiLFwiQ2lyY2xlTWludXNcIjpcIlxcdTIyOTZcIixcIkNpcmNsZVBsdXNcIjpcIlxcdTIyOTVcIixcIkNpcmNsZVRpbWVzXCI6XCJcXHUyMjk3XCIsXCJjaXJcIjpcIlxcdTI1Q0JcIixcImNpckVcIjpcIlxcdTI5QzNcIixcImNpcmVcIjpcIlxcdTIyNTdcIixcImNpcmZuaW50XCI6XCJcXHUyQTEwXCIsXCJjaXJtaWRcIjpcIlxcdTJBRUZcIixcImNpcnNjaXJcIjpcIlxcdTI5QzJcIixcIkNsb2Nrd2lzZUNvbnRvdXJJbnRlZ3JhbFwiOlwiXFx1MjIzMlwiLFwiQ2xvc2VDdXJseURvdWJsZVF1b3RlXCI6XCJcXHUyMDFEXCIsXCJDbG9zZUN1cmx5UXVvdGVcIjpcIlxcdTIwMTlcIixcImNsdWJzXCI6XCJcXHUyNjYzXCIsXCJjbHVic3VpdFwiOlwiXFx1MjY2M1wiLFwiY29sb25cIjpcIjpcIixcIkNvbG9uXCI6XCJcXHUyMjM3XCIsXCJDb2xvbmVcIjpcIlxcdTJBNzRcIixcImNvbG9uZVwiOlwiXFx1MjI1NFwiLFwiY29sb25lcVwiOlwiXFx1MjI1NFwiLFwiY29tbWFcIjpcIixcIixcImNvbW1hdFwiOlwiQFwiLFwiY29tcFwiOlwiXFx1MjIwMVwiLFwiY29tcGZuXCI6XCJcXHUyMjE4XCIsXCJjb21wbGVtZW50XCI6XCJcXHUyMjAxXCIsXCJjb21wbGV4ZXNcIjpcIlxcdTIxMDJcIixcImNvbmdcIjpcIlxcdTIyNDVcIixcImNvbmdkb3RcIjpcIlxcdTJBNkRcIixcIkNvbmdydWVudFwiOlwiXFx1MjI2MVwiLFwiY29uaW50XCI6XCJcXHUyMjJFXCIsXCJDb25pbnRcIjpcIlxcdTIyMkZcIixcIkNvbnRvdXJJbnRlZ3JhbFwiOlwiXFx1MjIyRVwiLFwiY29wZlwiOlwiXFx1RDgzNVxcdURENTRcIixcIkNvcGZcIjpcIlxcdTIxMDJcIixcImNvcHJvZFwiOlwiXFx1MjIxMFwiLFwiQ29wcm9kdWN0XCI6XCJcXHUyMjEwXCIsXCJjb3B5XCI6XCJcXHUwMEE5XCIsXCJDT1BZXCI6XCJcXHUwMEE5XCIsXCJjb3B5c3JcIjpcIlxcdTIxMTdcIixcIkNvdW50ZXJDbG9ja3dpc2VDb250b3VySW50ZWdyYWxcIjpcIlxcdTIyMzNcIixcImNyYXJyXCI6XCJcXHUyMUI1XCIsXCJjcm9zc1wiOlwiXFx1MjcxN1wiLFwiQ3Jvc3NcIjpcIlxcdTJBMkZcIixcIkNzY3JcIjpcIlxcdUQ4MzVcXHVEQzlFXCIsXCJjc2NyXCI6XCJcXHVEODM1XFx1RENCOFwiLFwiY3N1YlwiOlwiXFx1MkFDRlwiLFwiY3N1YmVcIjpcIlxcdTJBRDFcIixcImNzdXBcIjpcIlxcdTJBRDBcIixcImNzdXBlXCI6XCJcXHUyQUQyXCIsXCJjdGRvdFwiOlwiXFx1MjJFRlwiLFwiY3VkYXJybFwiOlwiXFx1MjkzOFwiLFwiY3VkYXJyclwiOlwiXFx1MjkzNVwiLFwiY3VlcHJcIjpcIlxcdTIyREVcIixcImN1ZXNjXCI6XCJcXHUyMkRGXCIsXCJjdWxhcnJcIjpcIlxcdTIxQjZcIixcImN1bGFycnBcIjpcIlxcdTI5M0RcIixcImN1cGJyY2FwXCI6XCJcXHUyQTQ4XCIsXCJjdXBjYXBcIjpcIlxcdTJBNDZcIixcIkN1cENhcFwiOlwiXFx1MjI0RFwiLFwiY3VwXCI6XCJcXHUyMjJBXCIsXCJDdXBcIjpcIlxcdTIyRDNcIixcImN1cGN1cFwiOlwiXFx1MkE0QVwiLFwiY3VwZG90XCI6XCJcXHUyMjhEXCIsXCJjdXBvclwiOlwiXFx1MkE0NVwiLFwiY3Vwc1wiOlwiXFx1MjIyQVxcdUZFMDBcIixcImN1cmFyclwiOlwiXFx1MjFCN1wiLFwiY3VyYXJybVwiOlwiXFx1MjkzQ1wiLFwiY3VybHllcXByZWNcIjpcIlxcdTIyREVcIixcImN1cmx5ZXFzdWNjXCI6XCJcXHUyMkRGXCIsXCJjdXJseXZlZVwiOlwiXFx1MjJDRVwiLFwiY3VybHl3ZWRnZVwiOlwiXFx1MjJDRlwiLFwiY3VycmVuXCI6XCJcXHUwMEE0XCIsXCJjdXJ2ZWFycm93bGVmdFwiOlwiXFx1MjFCNlwiLFwiY3VydmVhcnJvd3JpZ2h0XCI6XCJcXHUyMUI3XCIsXCJjdXZlZVwiOlwiXFx1MjJDRVwiLFwiY3V3ZWRcIjpcIlxcdTIyQ0ZcIixcImN3Y29uaW50XCI6XCJcXHUyMjMyXCIsXCJjd2ludFwiOlwiXFx1MjIzMVwiLFwiY3lsY3R5XCI6XCJcXHUyMzJEXCIsXCJkYWdnZXJcIjpcIlxcdTIwMjBcIixcIkRhZ2dlclwiOlwiXFx1MjAyMVwiLFwiZGFsZXRoXCI6XCJcXHUyMTM4XCIsXCJkYXJyXCI6XCJcXHUyMTkzXCIsXCJEYXJyXCI6XCJcXHUyMUExXCIsXCJkQXJyXCI6XCJcXHUyMUQzXCIsXCJkYXNoXCI6XCJcXHUyMDEwXCIsXCJEYXNodlwiOlwiXFx1MkFFNFwiLFwiZGFzaHZcIjpcIlxcdTIyQTNcIixcImRia2Fyb3dcIjpcIlxcdTI5MEZcIixcImRibGFjXCI6XCJcXHUwMkREXCIsXCJEY2Fyb25cIjpcIlxcdTAxMEVcIixcImRjYXJvblwiOlwiXFx1MDEwRlwiLFwiRGN5XCI6XCJcXHUwNDE0XCIsXCJkY3lcIjpcIlxcdTA0MzRcIixcImRkYWdnZXJcIjpcIlxcdTIwMjFcIixcImRkYXJyXCI6XCJcXHUyMUNBXCIsXCJERFwiOlwiXFx1MjE0NVwiLFwiZGRcIjpcIlxcdTIxNDZcIixcIkREb3RyYWhkXCI6XCJcXHUyOTExXCIsXCJkZG90c2VxXCI6XCJcXHUyQTc3XCIsXCJkZWdcIjpcIlxcdTAwQjBcIixcIkRlbFwiOlwiXFx1MjIwN1wiLFwiRGVsdGFcIjpcIlxcdTAzOTRcIixcImRlbHRhXCI6XCJcXHUwM0I0XCIsXCJkZW1wdHl2XCI6XCJcXHUyOUIxXCIsXCJkZmlzaHRcIjpcIlxcdTI5N0ZcIixcIkRmclwiOlwiXFx1RDgzNVxcdUREMDdcIixcImRmclwiOlwiXFx1RDgzNVxcdUREMjFcIixcImRIYXJcIjpcIlxcdTI5NjVcIixcImRoYXJsXCI6XCJcXHUyMUMzXCIsXCJkaGFyclwiOlwiXFx1MjFDMlwiLFwiRGlhY3JpdGljYWxBY3V0ZVwiOlwiXFx1MDBCNFwiLFwiRGlhY3JpdGljYWxEb3RcIjpcIlxcdTAyRDlcIixcIkRpYWNyaXRpY2FsRG91YmxlQWN1dGVcIjpcIlxcdTAyRERcIixcIkRpYWNyaXRpY2FsR3JhdmVcIjpcImBcIixcIkRpYWNyaXRpY2FsVGlsZGVcIjpcIlxcdTAyRENcIixcImRpYW1cIjpcIlxcdTIyQzRcIixcImRpYW1vbmRcIjpcIlxcdTIyQzRcIixcIkRpYW1vbmRcIjpcIlxcdTIyQzRcIixcImRpYW1vbmRzdWl0XCI6XCJcXHUyNjY2XCIsXCJkaWFtc1wiOlwiXFx1MjY2NlwiLFwiZGllXCI6XCJcXHUwMEE4XCIsXCJEaWZmZXJlbnRpYWxEXCI6XCJcXHUyMTQ2XCIsXCJkaWdhbW1hXCI6XCJcXHUwM0REXCIsXCJkaXNpblwiOlwiXFx1MjJGMlwiLFwiZGl2XCI6XCJcXHUwMEY3XCIsXCJkaXZpZGVcIjpcIlxcdTAwRjdcIixcImRpdmlkZW9udGltZXNcIjpcIlxcdTIyQzdcIixcImRpdm9ueFwiOlwiXFx1MjJDN1wiLFwiREpjeVwiOlwiXFx1MDQwMlwiLFwiZGpjeVwiOlwiXFx1MDQ1MlwiLFwiZGxjb3JuXCI6XCJcXHUyMzFFXCIsXCJkbGNyb3BcIjpcIlxcdTIzMERcIixcImRvbGxhclwiOlwiJFwiLFwiRG9wZlwiOlwiXFx1RDgzNVxcdUREM0JcIixcImRvcGZcIjpcIlxcdUQ4MzVcXHVERDU1XCIsXCJEb3RcIjpcIlxcdTAwQThcIixcImRvdFwiOlwiXFx1MDJEOVwiLFwiRG90RG90XCI6XCJcXHUyMERDXCIsXCJkb3RlcVwiOlwiXFx1MjI1MFwiLFwiZG90ZXFkb3RcIjpcIlxcdTIyNTFcIixcIkRvdEVxdWFsXCI6XCJcXHUyMjUwXCIsXCJkb3RtaW51c1wiOlwiXFx1MjIzOFwiLFwiZG90cGx1c1wiOlwiXFx1MjIxNFwiLFwiZG90c3F1YXJlXCI6XCJcXHUyMkExXCIsXCJkb3VibGViYXJ3ZWRnZVwiOlwiXFx1MjMwNlwiLFwiRG91YmxlQ29udG91ckludGVncmFsXCI6XCJcXHUyMjJGXCIsXCJEb3VibGVEb3RcIjpcIlxcdTAwQThcIixcIkRvdWJsZURvd25BcnJvd1wiOlwiXFx1MjFEM1wiLFwiRG91YmxlTGVmdEFycm93XCI6XCJcXHUyMUQwXCIsXCJEb3VibGVMZWZ0UmlnaHRBcnJvd1wiOlwiXFx1MjFENFwiLFwiRG91YmxlTGVmdFRlZVwiOlwiXFx1MkFFNFwiLFwiRG91YmxlTG9uZ0xlZnRBcnJvd1wiOlwiXFx1MjdGOFwiLFwiRG91YmxlTG9uZ0xlZnRSaWdodEFycm93XCI6XCJcXHUyN0ZBXCIsXCJEb3VibGVMb25nUmlnaHRBcnJvd1wiOlwiXFx1MjdGOVwiLFwiRG91YmxlUmlnaHRBcnJvd1wiOlwiXFx1MjFEMlwiLFwiRG91YmxlUmlnaHRUZWVcIjpcIlxcdTIyQThcIixcIkRvdWJsZVVwQXJyb3dcIjpcIlxcdTIxRDFcIixcIkRvdWJsZVVwRG93bkFycm93XCI6XCJcXHUyMUQ1XCIsXCJEb3VibGVWZXJ0aWNhbEJhclwiOlwiXFx1MjIyNVwiLFwiRG93bkFycm93QmFyXCI6XCJcXHUyOTEzXCIsXCJkb3duYXJyb3dcIjpcIlxcdTIxOTNcIixcIkRvd25BcnJvd1wiOlwiXFx1MjE5M1wiLFwiRG93bmFycm93XCI6XCJcXHUyMUQzXCIsXCJEb3duQXJyb3dVcEFycm93XCI6XCJcXHUyMUY1XCIsXCJEb3duQnJldmVcIjpcIlxcdTAzMTFcIixcImRvd25kb3duYXJyb3dzXCI6XCJcXHUyMUNBXCIsXCJkb3duaGFycG9vbmxlZnRcIjpcIlxcdTIxQzNcIixcImRvd25oYXJwb29ucmlnaHRcIjpcIlxcdTIxQzJcIixcIkRvd25MZWZ0UmlnaHRWZWN0b3JcIjpcIlxcdTI5NTBcIixcIkRvd25MZWZ0VGVlVmVjdG9yXCI6XCJcXHUyOTVFXCIsXCJEb3duTGVmdFZlY3RvckJhclwiOlwiXFx1Mjk1NlwiLFwiRG93bkxlZnRWZWN0b3JcIjpcIlxcdTIxQkRcIixcIkRvd25SaWdodFRlZVZlY3RvclwiOlwiXFx1Mjk1RlwiLFwiRG93blJpZ2h0VmVjdG9yQmFyXCI6XCJcXHUyOTU3XCIsXCJEb3duUmlnaHRWZWN0b3JcIjpcIlxcdTIxQzFcIixcIkRvd25UZWVBcnJvd1wiOlwiXFx1MjFBN1wiLFwiRG93blRlZVwiOlwiXFx1MjJBNFwiLFwiZHJia2Fyb3dcIjpcIlxcdTI5MTBcIixcImRyY29yblwiOlwiXFx1MjMxRlwiLFwiZHJjcm9wXCI6XCJcXHUyMzBDXCIsXCJEc2NyXCI6XCJcXHVEODM1XFx1REM5RlwiLFwiZHNjclwiOlwiXFx1RDgzNVxcdURDQjlcIixcIkRTY3lcIjpcIlxcdTA0MDVcIixcImRzY3lcIjpcIlxcdTA0NTVcIixcImRzb2xcIjpcIlxcdTI5RjZcIixcIkRzdHJva1wiOlwiXFx1MDExMFwiLFwiZHN0cm9rXCI6XCJcXHUwMTExXCIsXCJkdGRvdFwiOlwiXFx1MjJGMVwiLFwiZHRyaVwiOlwiXFx1MjVCRlwiLFwiZHRyaWZcIjpcIlxcdTI1QkVcIixcImR1YXJyXCI6XCJcXHUyMUY1XCIsXCJkdWhhclwiOlwiXFx1Mjk2RlwiLFwiZHdhbmdsZVwiOlwiXFx1MjlBNlwiLFwiRFpjeVwiOlwiXFx1MDQwRlwiLFwiZHpjeVwiOlwiXFx1MDQ1RlwiLFwiZHppZ3JhcnJcIjpcIlxcdTI3RkZcIixcIkVhY3V0ZVwiOlwiXFx1MDBDOVwiLFwiZWFjdXRlXCI6XCJcXHUwMEU5XCIsXCJlYXN0ZXJcIjpcIlxcdTJBNkVcIixcIkVjYXJvblwiOlwiXFx1MDExQVwiLFwiZWNhcm9uXCI6XCJcXHUwMTFCXCIsXCJFY2lyY1wiOlwiXFx1MDBDQVwiLFwiZWNpcmNcIjpcIlxcdTAwRUFcIixcImVjaXJcIjpcIlxcdTIyNTZcIixcImVjb2xvblwiOlwiXFx1MjI1NVwiLFwiRWN5XCI6XCJcXHUwNDJEXCIsXCJlY3lcIjpcIlxcdTA0NERcIixcImVERG90XCI6XCJcXHUyQTc3XCIsXCJFZG90XCI6XCJcXHUwMTE2XCIsXCJlZG90XCI6XCJcXHUwMTE3XCIsXCJlRG90XCI6XCJcXHUyMjUxXCIsXCJlZVwiOlwiXFx1MjE0N1wiLFwiZWZEb3RcIjpcIlxcdTIyNTJcIixcIkVmclwiOlwiXFx1RDgzNVxcdUREMDhcIixcImVmclwiOlwiXFx1RDgzNVxcdUREMjJcIixcImVnXCI6XCJcXHUyQTlBXCIsXCJFZ3JhdmVcIjpcIlxcdTAwQzhcIixcImVncmF2ZVwiOlwiXFx1MDBFOFwiLFwiZWdzXCI6XCJcXHUyQTk2XCIsXCJlZ3Nkb3RcIjpcIlxcdTJBOThcIixcImVsXCI6XCJcXHUyQTk5XCIsXCJFbGVtZW50XCI6XCJcXHUyMjA4XCIsXCJlbGludGVyc1wiOlwiXFx1MjNFN1wiLFwiZWxsXCI6XCJcXHUyMTEzXCIsXCJlbHNcIjpcIlxcdTJBOTVcIixcImVsc2RvdFwiOlwiXFx1MkE5N1wiLFwiRW1hY3JcIjpcIlxcdTAxMTJcIixcImVtYWNyXCI6XCJcXHUwMTEzXCIsXCJlbXB0eVwiOlwiXFx1MjIwNVwiLFwiZW1wdHlzZXRcIjpcIlxcdTIyMDVcIixcIkVtcHR5U21hbGxTcXVhcmVcIjpcIlxcdTI1RkJcIixcImVtcHR5dlwiOlwiXFx1MjIwNVwiLFwiRW1wdHlWZXJ5U21hbGxTcXVhcmVcIjpcIlxcdTI1QUJcIixcImVtc3AxM1wiOlwiXFx1MjAwNFwiLFwiZW1zcDE0XCI6XCJcXHUyMDA1XCIsXCJlbXNwXCI6XCJcXHUyMDAzXCIsXCJFTkdcIjpcIlxcdTAxNEFcIixcImVuZ1wiOlwiXFx1MDE0QlwiLFwiZW5zcFwiOlwiXFx1MjAwMlwiLFwiRW9nb25cIjpcIlxcdTAxMThcIixcImVvZ29uXCI6XCJcXHUwMTE5XCIsXCJFb3BmXCI6XCJcXHVEODM1XFx1REQzQ1wiLFwiZW9wZlwiOlwiXFx1RDgzNVxcdURENTZcIixcImVwYXJcIjpcIlxcdTIyRDVcIixcImVwYXJzbFwiOlwiXFx1MjlFM1wiLFwiZXBsdXNcIjpcIlxcdTJBNzFcIixcImVwc2lcIjpcIlxcdTAzQjVcIixcIkVwc2lsb25cIjpcIlxcdTAzOTVcIixcImVwc2lsb25cIjpcIlxcdTAzQjVcIixcImVwc2l2XCI6XCJcXHUwM0Y1XCIsXCJlcWNpcmNcIjpcIlxcdTIyNTZcIixcImVxY29sb25cIjpcIlxcdTIyNTVcIixcImVxc2ltXCI6XCJcXHUyMjQyXCIsXCJlcXNsYW50Z3RyXCI6XCJcXHUyQTk2XCIsXCJlcXNsYW50bGVzc1wiOlwiXFx1MkE5NVwiLFwiRXF1YWxcIjpcIlxcdTJBNzVcIixcImVxdWFsc1wiOlwiPVwiLFwiRXF1YWxUaWxkZVwiOlwiXFx1MjI0MlwiLFwiZXF1ZXN0XCI6XCJcXHUyMjVGXCIsXCJFcXVpbGlicml1bVwiOlwiXFx1MjFDQ1wiLFwiZXF1aXZcIjpcIlxcdTIyNjFcIixcImVxdWl2RERcIjpcIlxcdTJBNzhcIixcImVxdnBhcnNsXCI6XCJcXHUyOUU1XCIsXCJlcmFyclwiOlwiXFx1Mjk3MVwiLFwiZXJEb3RcIjpcIlxcdTIyNTNcIixcImVzY3JcIjpcIlxcdTIxMkZcIixcIkVzY3JcIjpcIlxcdTIxMzBcIixcImVzZG90XCI6XCJcXHUyMjUwXCIsXCJFc2ltXCI6XCJcXHUyQTczXCIsXCJlc2ltXCI6XCJcXHUyMjQyXCIsXCJFdGFcIjpcIlxcdTAzOTdcIixcImV0YVwiOlwiXFx1MDNCN1wiLFwiRVRIXCI6XCJcXHUwMEQwXCIsXCJldGhcIjpcIlxcdTAwRjBcIixcIkV1bWxcIjpcIlxcdTAwQ0JcIixcImV1bWxcIjpcIlxcdTAwRUJcIixcImV1cm9cIjpcIlxcdTIwQUNcIixcImV4Y2xcIjpcIiFcIixcImV4aXN0XCI6XCJcXHUyMjAzXCIsXCJFeGlzdHNcIjpcIlxcdTIyMDNcIixcImV4cGVjdGF0aW9uXCI6XCJcXHUyMTMwXCIsXCJleHBvbmVudGlhbGVcIjpcIlxcdTIxNDdcIixcIkV4cG9uZW50aWFsRVwiOlwiXFx1MjE0N1wiLFwiZmFsbGluZ2RvdHNlcVwiOlwiXFx1MjI1MlwiLFwiRmN5XCI6XCJcXHUwNDI0XCIsXCJmY3lcIjpcIlxcdTA0NDRcIixcImZlbWFsZVwiOlwiXFx1MjY0MFwiLFwiZmZpbGlnXCI6XCJcXHVGQjAzXCIsXCJmZmxpZ1wiOlwiXFx1RkIwMFwiLFwiZmZsbGlnXCI6XCJcXHVGQjA0XCIsXCJGZnJcIjpcIlxcdUQ4MzVcXHVERDA5XCIsXCJmZnJcIjpcIlxcdUQ4MzVcXHVERDIzXCIsXCJmaWxpZ1wiOlwiXFx1RkIwMVwiLFwiRmlsbGVkU21hbGxTcXVhcmVcIjpcIlxcdTI1RkNcIixcIkZpbGxlZFZlcnlTbWFsbFNxdWFyZVwiOlwiXFx1MjVBQVwiLFwiZmpsaWdcIjpcImZqXCIsXCJmbGF0XCI6XCJcXHUyNjZEXCIsXCJmbGxpZ1wiOlwiXFx1RkIwMlwiLFwiZmx0bnNcIjpcIlxcdTI1QjFcIixcImZub2ZcIjpcIlxcdTAxOTJcIixcIkZvcGZcIjpcIlxcdUQ4MzVcXHVERDNEXCIsXCJmb3BmXCI6XCJcXHVEODM1XFx1REQ1N1wiLFwiZm9yYWxsXCI6XCJcXHUyMjAwXCIsXCJGb3JBbGxcIjpcIlxcdTIyMDBcIixcImZvcmtcIjpcIlxcdTIyRDRcIixcImZvcmt2XCI6XCJcXHUyQUQ5XCIsXCJGb3VyaWVydHJmXCI6XCJcXHUyMTMxXCIsXCJmcGFydGludFwiOlwiXFx1MkEwRFwiLFwiZnJhYzEyXCI6XCJcXHUwMEJEXCIsXCJmcmFjMTNcIjpcIlxcdTIxNTNcIixcImZyYWMxNFwiOlwiXFx1MDBCQ1wiLFwiZnJhYzE1XCI6XCJcXHUyMTU1XCIsXCJmcmFjMTZcIjpcIlxcdTIxNTlcIixcImZyYWMxOFwiOlwiXFx1MjE1QlwiLFwiZnJhYzIzXCI6XCJcXHUyMTU0XCIsXCJmcmFjMjVcIjpcIlxcdTIxNTZcIixcImZyYWMzNFwiOlwiXFx1MDBCRVwiLFwiZnJhYzM1XCI6XCJcXHUyMTU3XCIsXCJmcmFjMzhcIjpcIlxcdTIxNUNcIixcImZyYWM0NVwiOlwiXFx1MjE1OFwiLFwiZnJhYzU2XCI6XCJcXHUyMTVBXCIsXCJmcmFjNThcIjpcIlxcdTIxNURcIixcImZyYWM3OFwiOlwiXFx1MjE1RVwiLFwiZnJhc2xcIjpcIlxcdTIwNDRcIixcImZyb3duXCI6XCJcXHUyMzIyXCIsXCJmc2NyXCI6XCJcXHVEODM1XFx1RENCQlwiLFwiRnNjclwiOlwiXFx1MjEzMVwiLFwiZ2FjdXRlXCI6XCJcXHUwMUY1XCIsXCJHYW1tYVwiOlwiXFx1MDM5M1wiLFwiZ2FtbWFcIjpcIlxcdTAzQjNcIixcIkdhbW1hZFwiOlwiXFx1MDNEQ1wiLFwiZ2FtbWFkXCI6XCJcXHUwM0REXCIsXCJnYXBcIjpcIlxcdTJBODZcIixcIkdicmV2ZVwiOlwiXFx1MDExRVwiLFwiZ2JyZXZlXCI6XCJcXHUwMTFGXCIsXCJHY2VkaWxcIjpcIlxcdTAxMjJcIixcIkdjaXJjXCI6XCJcXHUwMTFDXCIsXCJnY2lyY1wiOlwiXFx1MDExRFwiLFwiR2N5XCI6XCJcXHUwNDEzXCIsXCJnY3lcIjpcIlxcdTA0MzNcIixcIkdkb3RcIjpcIlxcdTAxMjBcIixcImdkb3RcIjpcIlxcdTAxMjFcIixcImdlXCI6XCJcXHUyMjY1XCIsXCJnRVwiOlwiXFx1MjI2N1wiLFwiZ0VsXCI6XCJcXHUyQThDXCIsXCJnZWxcIjpcIlxcdTIyREJcIixcImdlcVwiOlwiXFx1MjI2NVwiLFwiZ2VxcVwiOlwiXFx1MjI2N1wiLFwiZ2Vxc2xhbnRcIjpcIlxcdTJBN0VcIixcImdlc2NjXCI6XCJcXHUyQUE5XCIsXCJnZXNcIjpcIlxcdTJBN0VcIixcImdlc2RvdFwiOlwiXFx1MkE4MFwiLFwiZ2VzZG90b1wiOlwiXFx1MkE4MlwiLFwiZ2VzZG90b2xcIjpcIlxcdTJBODRcIixcImdlc2xcIjpcIlxcdTIyREJcXHVGRTAwXCIsXCJnZXNsZXNcIjpcIlxcdTJBOTRcIixcIkdmclwiOlwiXFx1RDgzNVxcdUREMEFcIixcImdmclwiOlwiXFx1RDgzNVxcdUREMjRcIixcImdnXCI6XCJcXHUyMjZCXCIsXCJHZ1wiOlwiXFx1MjJEOVwiLFwiZ2dnXCI6XCJcXHUyMkQ5XCIsXCJnaW1lbFwiOlwiXFx1MjEzN1wiLFwiR0pjeVwiOlwiXFx1MDQwM1wiLFwiZ2pjeVwiOlwiXFx1MDQ1M1wiLFwiZ2xhXCI6XCJcXHUyQUE1XCIsXCJnbFwiOlwiXFx1MjI3N1wiLFwiZ2xFXCI6XCJcXHUyQTkyXCIsXCJnbGpcIjpcIlxcdTJBQTRcIixcImduYXBcIjpcIlxcdTJBOEFcIixcImduYXBwcm94XCI6XCJcXHUyQThBXCIsXCJnbmVcIjpcIlxcdTJBODhcIixcImduRVwiOlwiXFx1MjI2OVwiLFwiZ25lcVwiOlwiXFx1MkE4OFwiLFwiZ25lcXFcIjpcIlxcdTIyNjlcIixcImduc2ltXCI6XCJcXHUyMkU3XCIsXCJHb3BmXCI6XCJcXHVEODM1XFx1REQzRVwiLFwiZ29wZlwiOlwiXFx1RDgzNVxcdURENThcIixcImdyYXZlXCI6XCJgXCIsXCJHcmVhdGVyRXF1YWxcIjpcIlxcdTIyNjVcIixcIkdyZWF0ZXJFcXVhbExlc3NcIjpcIlxcdTIyREJcIixcIkdyZWF0ZXJGdWxsRXF1YWxcIjpcIlxcdTIyNjdcIixcIkdyZWF0ZXJHcmVhdGVyXCI6XCJcXHUyQUEyXCIsXCJHcmVhdGVyTGVzc1wiOlwiXFx1MjI3N1wiLFwiR3JlYXRlclNsYW50RXF1YWxcIjpcIlxcdTJBN0VcIixcIkdyZWF0ZXJUaWxkZVwiOlwiXFx1MjI3M1wiLFwiR3NjclwiOlwiXFx1RDgzNVxcdURDQTJcIixcImdzY3JcIjpcIlxcdTIxMEFcIixcImdzaW1cIjpcIlxcdTIyNzNcIixcImdzaW1lXCI6XCJcXHUyQThFXCIsXCJnc2ltbFwiOlwiXFx1MkE5MFwiLFwiZ3RjY1wiOlwiXFx1MkFBN1wiLFwiZ3RjaXJcIjpcIlxcdTJBN0FcIixcImd0XCI6XCI+XCIsXCJHVFwiOlwiPlwiLFwiR3RcIjpcIlxcdTIyNkJcIixcImd0ZG90XCI6XCJcXHUyMkQ3XCIsXCJndGxQYXJcIjpcIlxcdTI5OTVcIixcImd0cXVlc3RcIjpcIlxcdTJBN0NcIixcImd0cmFwcHJveFwiOlwiXFx1MkE4NlwiLFwiZ3RyYXJyXCI6XCJcXHUyOTc4XCIsXCJndHJkb3RcIjpcIlxcdTIyRDdcIixcImd0cmVxbGVzc1wiOlwiXFx1MjJEQlwiLFwiZ3RyZXFxbGVzc1wiOlwiXFx1MkE4Q1wiLFwiZ3RybGVzc1wiOlwiXFx1MjI3N1wiLFwiZ3Ryc2ltXCI6XCJcXHUyMjczXCIsXCJndmVydG5lcXFcIjpcIlxcdTIyNjlcXHVGRTAwXCIsXCJndm5FXCI6XCJcXHUyMjY5XFx1RkUwMFwiLFwiSGFjZWtcIjpcIlxcdTAyQzdcIixcImhhaXJzcFwiOlwiXFx1MjAwQVwiLFwiaGFsZlwiOlwiXFx1MDBCRFwiLFwiaGFtaWx0XCI6XCJcXHUyMTBCXCIsXCJIQVJEY3lcIjpcIlxcdTA0MkFcIixcImhhcmRjeVwiOlwiXFx1MDQ0QVwiLFwiaGFycmNpclwiOlwiXFx1Mjk0OFwiLFwiaGFyclwiOlwiXFx1MjE5NFwiLFwiaEFyclwiOlwiXFx1MjFENFwiLFwiaGFycndcIjpcIlxcdTIxQURcIixcIkhhdFwiOlwiXlwiLFwiaGJhclwiOlwiXFx1MjEwRlwiLFwiSGNpcmNcIjpcIlxcdTAxMjRcIixcImhjaXJjXCI6XCJcXHUwMTI1XCIsXCJoZWFydHNcIjpcIlxcdTI2NjVcIixcImhlYXJ0c3VpdFwiOlwiXFx1MjY2NVwiLFwiaGVsbGlwXCI6XCJcXHUyMDI2XCIsXCJoZXJjb25cIjpcIlxcdTIyQjlcIixcImhmclwiOlwiXFx1RDgzNVxcdUREMjVcIixcIkhmclwiOlwiXFx1MjEwQ1wiLFwiSGlsYmVydFNwYWNlXCI6XCJcXHUyMTBCXCIsXCJoa3NlYXJvd1wiOlwiXFx1MjkyNVwiLFwiaGtzd2Fyb3dcIjpcIlxcdTI5MjZcIixcImhvYXJyXCI6XCJcXHUyMUZGXCIsXCJob210aHRcIjpcIlxcdTIyM0JcIixcImhvb2tsZWZ0YXJyb3dcIjpcIlxcdTIxQTlcIixcImhvb2tyaWdodGFycm93XCI6XCJcXHUyMUFBXCIsXCJob3BmXCI6XCJcXHVEODM1XFx1REQ1OVwiLFwiSG9wZlwiOlwiXFx1MjEwRFwiLFwiaG9yYmFyXCI6XCJcXHUyMDE1XCIsXCJIb3Jpem9udGFsTGluZVwiOlwiXFx1MjUwMFwiLFwiaHNjclwiOlwiXFx1RDgzNVxcdURDQkRcIixcIkhzY3JcIjpcIlxcdTIxMEJcIixcImhzbGFzaFwiOlwiXFx1MjEwRlwiLFwiSHN0cm9rXCI6XCJcXHUwMTI2XCIsXCJoc3Ryb2tcIjpcIlxcdTAxMjdcIixcIkh1bXBEb3duSHVtcFwiOlwiXFx1MjI0RVwiLFwiSHVtcEVxdWFsXCI6XCJcXHUyMjRGXCIsXCJoeWJ1bGxcIjpcIlxcdTIwNDNcIixcImh5cGhlblwiOlwiXFx1MjAxMFwiLFwiSWFjdXRlXCI6XCJcXHUwMENEXCIsXCJpYWN1dGVcIjpcIlxcdTAwRURcIixcImljXCI6XCJcXHUyMDYzXCIsXCJJY2lyY1wiOlwiXFx1MDBDRVwiLFwiaWNpcmNcIjpcIlxcdTAwRUVcIixcIkljeVwiOlwiXFx1MDQxOFwiLFwiaWN5XCI6XCJcXHUwNDM4XCIsXCJJZG90XCI6XCJcXHUwMTMwXCIsXCJJRWN5XCI6XCJcXHUwNDE1XCIsXCJpZWN5XCI6XCJcXHUwNDM1XCIsXCJpZXhjbFwiOlwiXFx1MDBBMVwiLFwiaWZmXCI6XCJcXHUyMUQ0XCIsXCJpZnJcIjpcIlxcdUQ4MzVcXHVERDI2XCIsXCJJZnJcIjpcIlxcdTIxMTFcIixcIklncmF2ZVwiOlwiXFx1MDBDQ1wiLFwiaWdyYXZlXCI6XCJcXHUwMEVDXCIsXCJpaVwiOlwiXFx1MjE0OFwiLFwiaWlpaW50XCI6XCJcXHUyQTBDXCIsXCJpaWludFwiOlwiXFx1MjIyRFwiLFwiaWluZmluXCI6XCJcXHUyOURDXCIsXCJpaW90YVwiOlwiXFx1MjEyOVwiLFwiSUpsaWdcIjpcIlxcdTAxMzJcIixcImlqbGlnXCI6XCJcXHUwMTMzXCIsXCJJbWFjclwiOlwiXFx1MDEyQVwiLFwiaW1hY3JcIjpcIlxcdTAxMkJcIixcImltYWdlXCI6XCJcXHUyMTExXCIsXCJJbWFnaW5hcnlJXCI6XCJcXHUyMTQ4XCIsXCJpbWFnbGluZVwiOlwiXFx1MjExMFwiLFwiaW1hZ3BhcnRcIjpcIlxcdTIxMTFcIixcImltYXRoXCI6XCJcXHUwMTMxXCIsXCJJbVwiOlwiXFx1MjExMVwiLFwiaW1vZlwiOlwiXFx1MjJCN1wiLFwiaW1wZWRcIjpcIlxcdTAxQjVcIixcIkltcGxpZXNcIjpcIlxcdTIxRDJcIixcImluY2FyZVwiOlwiXFx1MjEwNVwiLFwiaW5cIjpcIlxcdTIyMDhcIixcImluZmluXCI6XCJcXHUyMjFFXCIsXCJpbmZpbnRpZVwiOlwiXFx1MjlERFwiLFwiaW5vZG90XCI6XCJcXHUwMTMxXCIsXCJpbnRjYWxcIjpcIlxcdTIyQkFcIixcImludFwiOlwiXFx1MjIyQlwiLFwiSW50XCI6XCJcXHUyMjJDXCIsXCJpbnRlZ2Vyc1wiOlwiXFx1MjEyNFwiLFwiSW50ZWdyYWxcIjpcIlxcdTIyMkJcIixcImludGVyY2FsXCI6XCJcXHUyMkJBXCIsXCJJbnRlcnNlY3Rpb25cIjpcIlxcdTIyQzJcIixcImludGxhcmhrXCI6XCJcXHUyQTE3XCIsXCJpbnRwcm9kXCI6XCJcXHUyQTNDXCIsXCJJbnZpc2libGVDb21tYVwiOlwiXFx1MjA2M1wiLFwiSW52aXNpYmxlVGltZXNcIjpcIlxcdTIwNjJcIixcIklPY3lcIjpcIlxcdTA0MDFcIixcImlvY3lcIjpcIlxcdTA0NTFcIixcIklvZ29uXCI6XCJcXHUwMTJFXCIsXCJpb2dvblwiOlwiXFx1MDEyRlwiLFwiSW9wZlwiOlwiXFx1RDgzNVxcdURENDBcIixcImlvcGZcIjpcIlxcdUQ4MzVcXHVERDVBXCIsXCJJb3RhXCI6XCJcXHUwMzk5XCIsXCJpb3RhXCI6XCJcXHUwM0I5XCIsXCJpcHJvZFwiOlwiXFx1MkEzQ1wiLFwiaXF1ZXN0XCI6XCJcXHUwMEJGXCIsXCJpc2NyXCI6XCJcXHVEODM1XFx1RENCRVwiLFwiSXNjclwiOlwiXFx1MjExMFwiLFwiaXNpblwiOlwiXFx1MjIwOFwiLFwiaXNpbmRvdFwiOlwiXFx1MjJGNVwiLFwiaXNpbkVcIjpcIlxcdTIyRjlcIixcImlzaW5zXCI6XCJcXHUyMkY0XCIsXCJpc2luc3ZcIjpcIlxcdTIyRjNcIixcImlzaW52XCI6XCJcXHUyMjA4XCIsXCJpdFwiOlwiXFx1MjA2MlwiLFwiSXRpbGRlXCI6XCJcXHUwMTI4XCIsXCJpdGlsZGVcIjpcIlxcdTAxMjlcIixcIkl1a2N5XCI6XCJcXHUwNDA2XCIsXCJpdWtjeVwiOlwiXFx1MDQ1NlwiLFwiSXVtbFwiOlwiXFx1MDBDRlwiLFwiaXVtbFwiOlwiXFx1MDBFRlwiLFwiSmNpcmNcIjpcIlxcdTAxMzRcIixcImpjaXJjXCI6XCJcXHUwMTM1XCIsXCJKY3lcIjpcIlxcdTA0MTlcIixcImpjeVwiOlwiXFx1MDQzOVwiLFwiSmZyXCI6XCJcXHVEODM1XFx1REQwRFwiLFwiamZyXCI6XCJcXHVEODM1XFx1REQyN1wiLFwiam1hdGhcIjpcIlxcdTAyMzdcIixcIkpvcGZcIjpcIlxcdUQ4MzVcXHVERDQxXCIsXCJqb3BmXCI6XCJcXHVEODM1XFx1REQ1QlwiLFwiSnNjclwiOlwiXFx1RDgzNVxcdURDQTVcIixcImpzY3JcIjpcIlxcdUQ4MzVcXHVEQ0JGXCIsXCJKc2VyY3lcIjpcIlxcdTA0MDhcIixcImpzZXJjeVwiOlwiXFx1MDQ1OFwiLFwiSnVrY3lcIjpcIlxcdTA0MDRcIixcImp1a2N5XCI6XCJcXHUwNDU0XCIsXCJLYXBwYVwiOlwiXFx1MDM5QVwiLFwia2FwcGFcIjpcIlxcdTAzQkFcIixcImthcHBhdlwiOlwiXFx1MDNGMFwiLFwiS2NlZGlsXCI6XCJcXHUwMTM2XCIsXCJrY2VkaWxcIjpcIlxcdTAxMzdcIixcIktjeVwiOlwiXFx1MDQxQVwiLFwia2N5XCI6XCJcXHUwNDNBXCIsXCJLZnJcIjpcIlxcdUQ4MzVcXHVERDBFXCIsXCJrZnJcIjpcIlxcdUQ4MzVcXHVERDI4XCIsXCJrZ3JlZW5cIjpcIlxcdTAxMzhcIixcIktIY3lcIjpcIlxcdTA0MjVcIixcImtoY3lcIjpcIlxcdTA0NDVcIixcIktKY3lcIjpcIlxcdTA0MENcIixcImtqY3lcIjpcIlxcdTA0NUNcIixcIktvcGZcIjpcIlxcdUQ4MzVcXHVERDQyXCIsXCJrb3BmXCI6XCJcXHVEODM1XFx1REQ1Q1wiLFwiS3NjclwiOlwiXFx1RDgzNVxcdURDQTZcIixcImtzY3JcIjpcIlxcdUQ4MzVcXHVEQ0MwXCIsXCJsQWFyclwiOlwiXFx1MjFEQVwiLFwiTGFjdXRlXCI6XCJcXHUwMTM5XCIsXCJsYWN1dGVcIjpcIlxcdTAxM0FcIixcImxhZW1wdHl2XCI6XCJcXHUyOUI0XCIsXCJsYWdyYW5cIjpcIlxcdTIxMTJcIixcIkxhbWJkYVwiOlwiXFx1MDM5QlwiLFwibGFtYmRhXCI6XCJcXHUwM0JCXCIsXCJsYW5nXCI6XCJcXHUyN0U4XCIsXCJMYW5nXCI6XCJcXHUyN0VBXCIsXCJsYW5nZFwiOlwiXFx1Mjk5MVwiLFwibGFuZ2xlXCI6XCJcXHUyN0U4XCIsXCJsYXBcIjpcIlxcdTJBODVcIixcIkxhcGxhY2V0cmZcIjpcIlxcdTIxMTJcIixcImxhcXVvXCI6XCJcXHUwMEFCXCIsXCJsYXJyYlwiOlwiXFx1MjFFNFwiLFwibGFycmJmc1wiOlwiXFx1MjkxRlwiLFwibGFyclwiOlwiXFx1MjE5MFwiLFwiTGFyclwiOlwiXFx1MjE5RVwiLFwibEFyclwiOlwiXFx1MjFEMFwiLFwibGFycmZzXCI6XCJcXHUyOTFEXCIsXCJsYXJyaGtcIjpcIlxcdTIxQTlcIixcImxhcnJscFwiOlwiXFx1MjFBQlwiLFwibGFycnBsXCI6XCJcXHUyOTM5XCIsXCJsYXJyc2ltXCI6XCJcXHUyOTczXCIsXCJsYXJydGxcIjpcIlxcdTIxQTJcIixcImxhdGFpbFwiOlwiXFx1MjkxOVwiLFwibEF0YWlsXCI6XCJcXHUyOTFCXCIsXCJsYXRcIjpcIlxcdTJBQUJcIixcImxhdGVcIjpcIlxcdTJBQURcIixcImxhdGVzXCI6XCJcXHUyQUFEXFx1RkUwMFwiLFwibGJhcnJcIjpcIlxcdTI5MENcIixcImxCYXJyXCI6XCJcXHUyOTBFXCIsXCJsYmJya1wiOlwiXFx1Mjc3MlwiLFwibGJyYWNlXCI6XCJ7XCIsXCJsYnJhY2tcIjpcIltcIixcImxicmtlXCI6XCJcXHUyOThCXCIsXCJsYnJrc2xkXCI6XCJcXHUyOThGXCIsXCJsYnJrc2x1XCI6XCJcXHUyOThEXCIsXCJMY2Fyb25cIjpcIlxcdTAxM0RcIixcImxjYXJvblwiOlwiXFx1MDEzRVwiLFwiTGNlZGlsXCI6XCJcXHUwMTNCXCIsXCJsY2VkaWxcIjpcIlxcdTAxM0NcIixcImxjZWlsXCI6XCJcXHUyMzA4XCIsXCJsY3ViXCI6XCJ7XCIsXCJMY3lcIjpcIlxcdTA0MUJcIixcImxjeVwiOlwiXFx1MDQzQlwiLFwibGRjYVwiOlwiXFx1MjkzNlwiLFwibGRxdW9cIjpcIlxcdTIwMUNcIixcImxkcXVvclwiOlwiXFx1MjAxRVwiLFwibGRyZGhhclwiOlwiXFx1Mjk2N1wiLFwibGRydXNoYXJcIjpcIlxcdTI5NEJcIixcImxkc2hcIjpcIlxcdTIxQjJcIixcImxlXCI6XCJcXHUyMjY0XCIsXCJsRVwiOlwiXFx1MjI2NlwiLFwiTGVmdEFuZ2xlQnJhY2tldFwiOlwiXFx1MjdFOFwiLFwiTGVmdEFycm93QmFyXCI6XCJcXHUyMUU0XCIsXCJsZWZ0YXJyb3dcIjpcIlxcdTIxOTBcIixcIkxlZnRBcnJvd1wiOlwiXFx1MjE5MFwiLFwiTGVmdGFycm93XCI6XCJcXHUyMUQwXCIsXCJMZWZ0QXJyb3dSaWdodEFycm93XCI6XCJcXHUyMUM2XCIsXCJsZWZ0YXJyb3d0YWlsXCI6XCJcXHUyMUEyXCIsXCJMZWZ0Q2VpbGluZ1wiOlwiXFx1MjMwOFwiLFwiTGVmdERvdWJsZUJyYWNrZXRcIjpcIlxcdTI3RTZcIixcIkxlZnREb3duVGVlVmVjdG9yXCI6XCJcXHUyOTYxXCIsXCJMZWZ0RG93blZlY3RvckJhclwiOlwiXFx1Mjk1OVwiLFwiTGVmdERvd25WZWN0b3JcIjpcIlxcdTIxQzNcIixcIkxlZnRGbG9vclwiOlwiXFx1MjMwQVwiLFwibGVmdGhhcnBvb25kb3duXCI6XCJcXHUyMUJEXCIsXCJsZWZ0aGFycG9vbnVwXCI6XCJcXHUyMUJDXCIsXCJsZWZ0bGVmdGFycm93c1wiOlwiXFx1MjFDN1wiLFwibGVmdHJpZ2h0YXJyb3dcIjpcIlxcdTIxOTRcIixcIkxlZnRSaWdodEFycm93XCI6XCJcXHUyMTk0XCIsXCJMZWZ0cmlnaHRhcnJvd1wiOlwiXFx1MjFENFwiLFwibGVmdHJpZ2h0YXJyb3dzXCI6XCJcXHUyMUM2XCIsXCJsZWZ0cmlnaHRoYXJwb29uc1wiOlwiXFx1MjFDQlwiLFwibGVmdHJpZ2h0c3F1aWdhcnJvd1wiOlwiXFx1MjFBRFwiLFwiTGVmdFJpZ2h0VmVjdG9yXCI6XCJcXHUyOTRFXCIsXCJMZWZ0VGVlQXJyb3dcIjpcIlxcdTIxQTRcIixcIkxlZnRUZWVcIjpcIlxcdTIyQTNcIixcIkxlZnRUZWVWZWN0b3JcIjpcIlxcdTI5NUFcIixcImxlZnR0aHJlZXRpbWVzXCI6XCJcXHUyMkNCXCIsXCJMZWZ0VHJpYW5nbGVCYXJcIjpcIlxcdTI5Q0ZcIixcIkxlZnRUcmlhbmdsZVwiOlwiXFx1MjJCMlwiLFwiTGVmdFRyaWFuZ2xlRXF1YWxcIjpcIlxcdTIyQjRcIixcIkxlZnRVcERvd25WZWN0b3JcIjpcIlxcdTI5NTFcIixcIkxlZnRVcFRlZVZlY3RvclwiOlwiXFx1Mjk2MFwiLFwiTGVmdFVwVmVjdG9yQmFyXCI6XCJcXHUyOTU4XCIsXCJMZWZ0VXBWZWN0b3JcIjpcIlxcdTIxQkZcIixcIkxlZnRWZWN0b3JCYXJcIjpcIlxcdTI5NTJcIixcIkxlZnRWZWN0b3JcIjpcIlxcdTIxQkNcIixcImxFZ1wiOlwiXFx1MkE4QlwiLFwibGVnXCI6XCJcXHUyMkRBXCIsXCJsZXFcIjpcIlxcdTIyNjRcIixcImxlcXFcIjpcIlxcdTIyNjZcIixcImxlcXNsYW50XCI6XCJcXHUyQTdEXCIsXCJsZXNjY1wiOlwiXFx1MkFBOFwiLFwibGVzXCI6XCJcXHUyQTdEXCIsXCJsZXNkb3RcIjpcIlxcdTJBN0ZcIixcImxlc2RvdG9cIjpcIlxcdTJBODFcIixcImxlc2RvdG9yXCI6XCJcXHUyQTgzXCIsXCJsZXNnXCI6XCJcXHUyMkRBXFx1RkUwMFwiLFwibGVzZ2VzXCI6XCJcXHUyQTkzXCIsXCJsZXNzYXBwcm94XCI6XCJcXHUyQTg1XCIsXCJsZXNzZG90XCI6XCJcXHUyMkQ2XCIsXCJsZXNzZXFndHJcIjpcIlxcdTIyREFcIixcImxlc3NlcXFndHJcIjpcIlxcdTJBOEJcIixcIkxlc3NFcXVhbEdyZWF0ZXJcIjpcIlxcdTIyREFcIixcIkxlc3NGdWxsRXF1YWxcIjpcIlxcdTIyNjZcIixcIkxlc3NHcmVhdGVyXCI6XCJcXHUyMjc2XCIsXCJsZXNzZ3RyXCI6XCJcXHUyMjc2XCIsXCJMZXNzTGVzc1wiOlwiXFx1MkFBMVwiLFwibGVzc3NpbVwiOlwiXFx1MjI3MlwiLFwiTGVzc1NsYW50RXF1YWxcIjpcIlxcdTJBN0RcIixcIkxlc3NUaWxkZVwiOlwiXFx1MjI3MlwiLFwibGZpc2h0XCI6XCJcXHUyOTdDXCIsXCJsZmxvb3JcIjpcIlxcdTIzMEFcIixcIkxmclwiOlwiXFx1RDgzNVxcdUREMEZcIixcImxmclwiOlwiXFx1RDgzNVxcdUREMjlcIixcImxnXCI6XCJcXHUyMjc2XCIsXCJsZ0VcIjpcIlxcdTJBOTFcIixcImxIYXJcIjpcIlxcdTI5NjJcIixcImxoYXJkXCI6XCJcXHUyMUJEXCIsXCJsaGFydVwiOlwiXFx1MjFCQ1wiLFwibGhhcnVsXCI6XCJcXHUyOTZBXCIsXCJsaGJsa1wiOlwiXFx1MjU4NFwiLFwiTEpjeVwiOlwiXFx1MDQwOVwiLFwibGpjeVwiOlwiXFx1MDQ1OVwiLFwibGxhcnJcIjpcIlxcdTIxQzdcIixcImxsXCI6XCJcXHUyMjZBXCIsXCJMbFwiOlwiXFx1MjJEOFwiLFwibGxjb3JuZXJcIjpcIlxcdTIzMUVcIixcIkxsZWZ0YXJyb3dcIjpcIlxcdTIxREFcIixcImxsaGFyZFwiOlwiXFx1Mjk2QlwiLFwibGx0cmlcIjpcIlxcdTI1RkFcIixcIkxtaWRvdFwiOlwiXFx1MDEzRlwiLFwibG1pZG90XCI6XCJcXHUwMTQwXCIsXCJsbW91c3RhY2hlXCI6XCJcXHUyM0IwXCIsXCJsbW91c3RcIjpcIlxcdTIzQjBcIixcImxuYXBcIjpcIlxcdTJBODlcIixcImxuYXBwcm94XCI6XCJcXHUyQTg5XCIsXCJsbmVcIjpcIlxcdTJBODdcIixcImxuRVwiOlwiXFx1MjI2OFwiLFwibG5lcVwiOlwiXFx1MkE4N1wiLFwibG5lcXFcIjpcIlxcdTIyNjhcIixcImxuc2ltXCI6XCJcXHUyMkU2XCIsXCJsb2FuZ1wiOlwiXFx1MjdFQ1wiLFwibG9hcnJcIjpcIlxcdTIxRkRcIixcImxvYnJrXCI6XCJcXHUyN0U2XCIsXCJsb25nbGVmdGFycm93XCI6XCJcXHUyN0Y1XCIsXCJMb25nTGVmdEFycm93XCI6XCJcXHUyN0Y1XCIsXCJMb25nbGVmdGFycm93XCI6XCJcXHUyN0Y4XCIsXCJsb25nbGVmdHJpZ2h0YXJyb3dcIjpcIlxcdTI3RjdcIixcIkxvbmdMZWZ0UmlnaHRBcnJvd1wiOlwiXFx1MjdGN1wiLFwiTG9uZ2xlZnRyaWdodGFycm93XCI6XCJcXHUyN0ZBXCIsXCJsb25nbWFwc3RvXCI6XCJcXHUyN0ZDXCIsXCJsb25ncmlnaHRhcnJvd1wiOlwiXFx1MjdGNlwiLFwiTG9uZ1JpZ2h0QXJyb3dcIjpcIlxcdTI3RjZcIixcIkxvbmdyaWdodGFycm93XCI6XCJcXHUyN0Y5XCIsXCJsb29wYXJyb3dsZWZ0XCI6XCJcXHUyMUFCXCIsXCJsb29wYXJyb3dyaWdodFwiOlwiXFx1MjFBQ1wiLFwibG9wYXJcIjpcIlxcdTI5ODVcIixcIkxvcGZcIjpcIlxcdUQ4MzVcXHVERDQzXCIsXCJsb3BmXCI6XCJcXHVEODM1XFx1REQ1RFwiLFwibG9wbHVzXCI6XCJcXHUyQTJEXCIsXCJsb3RpbWVzXCI6XCJcXHUyQTM0XCIsXCJsb3dhc3RcIjpcIlxcdTIyMTdcIixcImxvd2JhclwiOlwiX1wiLFwiTG93ZXJMZWZ0QXJyb3dcIjpcIlxcdTIxOTlcIixcIkxvd2VyUmlnaHRBcnJvd1wiOlwiXFx1MjE5OFwiLFwibG96XCI6XCJcXHUyNUNBXCIsXCJsb3plbmdlXCI6XCJcXHUyNUNBXCIsXCJsb3pmXCI6XCJcXHUyOUVCXCIsXCJscGFyXCI6XCIoXCIsXCJscGFybHRcIjpcIlxcdTI5OTNcIixcImxyYXJyXCI6XCJcXHUyMUM2XCIsXCJscmNvcm5lclwiOlwiXFx1MjMxRlwiLFwibHJoYXJcIjpcIlxcdTIxQ0JcIixcImxyaGFyZFwiOlwiXFx1Mjk2RFwiLFwibHJtXCI6XCJcXHUyMDBFXCIsXCJscnRyaVwiOlwiXFx1MjJCRlwiLFwibHNhcXVvXCI6XCJcXHUyMDM5XCIsXCJsc2NyXCI6XCJcXHVEODM1XFx1RENDMVwiLFwiTHNjclwiOlwiXFx1MjExMlwiLFwibHNoXCI6XCJcXHUyMUIwXCIsXCJMc2hcIjpcIlxcdTIxQjBcIixcImxzaW1cIjpcIlxcdTIyNzJcIixcImxzaW1lXCI6XCJcXHUyQThEXCIsXCJsc2ltZ1wiOlwiXFx1MkE4RlwiLFwibHNxYlwiOlwiW1wiLFwibHNxdW9cIjpcIlxcdTIwMThcIixcImxzcXVvclwiOlwiXFx1MjAxQVwiLFwiTHN0cm9rXCI6XCJcXHUwMTQxXCIsXCJsc3Ryb2tcIjpcIlxcdTAxNDJcIixcImx0Y2NcIjpcIlxcdTJBQTZcIixcImx0Y2lyXCI6XCJcXHUyQTc5XCIsXCJsdFwiOlwiPFwiLFwiTFRcIjpcIjxcIixcIkx0XCI6XCJcXHUyMjZBXCIsXCJsdGRvdFwiOlwiXFx1MjJENlwiLFwibHRocmVlXCI6XCJcXHUyMkNCXCIsXCJsdGltZXNcIjpcIlxcdTIyQzlcIixcImx0bGFyclwiOlwiXFx1Mjk3NlwiLFwibHRxdWVzdFwiOlwiXFx1MkE3QlwiLFwibHRyaVwiOlwiXFx1MjVDM1wiLFwibHRyaWVcIjpcIlxcdTIyQjRcIixcImx0cmlmXCI6XCJcXHUyNUMyXCIsXCJsdHJQYXJcIjpcIlxcdTI5OTZcIixcImx1cmRzaGFyXCI6XCJcXHUyOTRBXCIsXCJsdXJ1aGFyXCI6XCJcXHUyOTY2XCIsXCJsdmVydG5lcXFcIjpcIlxcdTIyNjhcXHVGRTAwXCIsXCJsdm5FXCI6XCJcXHUyMjY4XFx1RkUwMFwiLFwibWFjclwiOlwiXFx1MDBBRlwiLFwibWFsZVwiOlwiXFx1MjY0MlwiLFwibWFsdFwiOlwiXFx1MjcyMFwiLFwibWFsdGVzZVwiOlwiXFx1MjcyMFwiLFwiTWFwXCI6XCJcXHUyOTA1XCIsXCJtYXBcIjpcIlxcdTIxQTZcIixcIm1hcHN0b1wiOlwiXFx1MjFBNlwiLFwibWFwc3RvZG93blwiOlwiXFx1MjFBN1wiLFwibWFwc3RvbGVmdFwiOlwiXFx1MjFBNFwiLFwibWFwc3RvdXBcIjpcIlxcdTIxQTVcIixcIm1hcmtlclwiOlwiXFx1MjVBRVwiLFwibWNvbW1hXCI6XCJcXHUyQTI5XCIsXCJNY3lcIjpcIlxcdTA0MUNcIixcIm1jeVwiOlwiXFx1MDQzQ1wiLFwibWRhc2hcIjpcIlxcdTIwMTRcIixcIm1ERG90XCI6XCJcXHUyMjNBXCIsXCJtZWFzdXJlZGFuZ2xlXCI6XCJcXHUyMjIxXCIsXCJNZWRpdW1TcGFjZVwiOlwiXFx1MjA1RlwiLFwiTWVsbGludHJmXCI6XCJcXHUyMTMzXCIsXCJNZnJcIjpcIlxcdUQ4MzVcXHVERDEwXCIsXCJtZnJcIjpcIlxcdUQ4MzVcXHVERDJBXCIsXCJtaG9cIjpcIlxcdTIxMjdcIixcIm1pY3JvXCI6XCJcXHUwMEI1XCIsXCJtaWRhc3RcIjpcIipcIixcIm1pZGNpclwiOlwiXFx1MkFGMFwiLFwibWlkXCI6XCJcXHUyMjIzXCIsXCJtaWRkb3RcIjpcIlxcdTAwQjdcIixcIm1pbnVzYlwiOlwiXFx1MjI5RlwiLFwibWludXNcIjpcIlxcdTIyMTJcIixcIm1pbnVzZFwiOlwiXFx1MjIzOFwiLFwibWludXNkdVwiOlwiXFx1MkEyQVwiLFwiTWludXNQbHVzXCI6XCJcXHUyMjEzXCIsXCJtbGNwXCI6XCJcXHUyQURCXCIsXCJtbGRyXCI6XCJcXHUyMDI2XCIsXCJtbnBsdXNcIjpcIlxcdTIyMTNcIixcIm1vZGVsc1wiOlwiXFx1MjJBN1wiLFwiTW9wZlwiOlwiXFx1RDgzNVxcdURENDRcIixcIm1vcGZcIjpcIlxcdUQ4MzVcXHVERDVFXCIsXCJtcFwiOlwiXFx1MjIxM1wiLFwibXNjclwiOlwiXFx1RDgzNVxcdURDQzJcIixcIk1zY3JcIjpcIlxcdTIxMzNcIixcIm1zdHBvc1wiOlwiXFx1MjIzRVwiLFwiTXVcIjpcIlxcdTAzOUNcIixcIm11XCI6XCJcXHUwM0JDXCIsXCJtdWx0aW1hcFwiOlwiXFx1MjJCOFwiLFwibXVtYXBcIjpcIlxcdTIyQjhcIixcIm5hYmxhXCI6XCJcXHUyMjA3XCIsXCJOYWN1dGVcIjpcIlxcdTAxNDNcIixcIm5hY3V0ZVwiOlwiXFx1MDE0NFwiLFwibmFuZ1wiOlwiXFx1MjIyMFxcdTIwRDJcIixcIm5hcFwiOlwiXFx1MjI0OVwiLFwibmFwRVwiOlwiXFx1MkE3MFxcdTAzMzhcIixcIm5hcGlkXCI6XCJcXHUyMjRCXFx1MDMzOFwiLFwibmFwb3NcIjpcIlxcdTAxNDlcIixcIm5hcHByb3hcIjpcIlxcdTIyNDlcIixcIm5hdHVyYWxcIjpcIlxcdTI2NkVcIixcIm5hdHVyYWxzXCI6XCJcXHUyMTE1XCIsXCJuYXR1clwiOlwiXFx1MjY2RVwiLFwibmJzcFwiOlwiXFx1MDBBMFwiLFwibmJ1bXBcIjpcIlxcdTIyNEVcXHUwMzM4XCIsXCJuYnVtcGVcIjpcIlxcdTIyNEZcXHUwMzM4XCIsXCJuY2FwXCI6XCJcXHUyQTQzXCIsXCJOY2Fyb25cIjpcIlxcdTAxNDdcIixcIm5jYXJvblwiOlwiXFx1MDE0OFwiLFwiTmNlZGlsXCI6XCJcXHUwMTQ1XCIsXCJuY2VkaWxcIjpcIlxcdTAxNDZcIixcIm5jb25nXCI6XCJcXHUyMjQ3XCIsXCJuY29uZ2RvdFwiOlwiXFx1MkE2RFxcdTAzMzhcIixcIm5jdXBcIjpcIlxcdTJBNDJcIixcIk5jeVwiOlwiXFx1MDQxRFwiLFwibmN5XCI6XCJcXHUwNDNEXCIsXCJuZGFzaFwiOlwiXFx1MjAxM1wiLFwibmVhcmhrXCI6XCJcXHUyOTI0XCIsXCJuZWFyclwiOlwiXFx1MjE5N1wiLFwibmVBcnJcIjpcIlxcdTIxRDdcIixcIm5lYXJyb3dcIjpcIlxcdTIxOTdcIixcIm5lXCI6XCJcXHUyMjYwXCIsXCJuZWRvdFwiOlwiXFx1MjI1MFxcdTAzMzhcIixcIk5lZ2F0aXZlTWVkaXVtU3BhY2VcIjpcIlxcdTIwMEJcIixcIk5lZ2F0aXZlVGhpY2tTcGFjZVwiOlwiXFx1MjAwQlwiLFwiTmVnYXRpdmVUaGluU3BhY2VcIjpcIlxcdTIwMEJcIixcIk5lZ2F0aXZlVmVyeVRoaW5TcGFjZVwiOlwiXFx1MjAwQlwiLFwibmVxdWl2XCI6XCJcXHUyMjYyXCIsXCJuZXNlYXJcIjpcIlxcdTI5MjhcIixcIm5lc2ltXCI6XCJcXHUyMjQyXFx1MDMzOFwiLFwiTmVzdGVkR3JlYXRlckdyZWF0ZXJcIjpcIlxcdTIyNkJcIixcIk5lc3RlZExlc3NMZXNzXCI6XCJcXHUyMjZBXCIsXCJOZXdMaW5lXCI6XCJcXG5cIixcIm5leGlzdFwiOlwiXFx1MjIwNFwiLFwibmV4aXN0c1wiOlwiXFx1MjIwNFwiLFwiTmZyXCI6XCJcXHVEODM1XFx1REQxMVwiLFwibmZyXCI6XCJcXHVEODM1XFx1REQyQlwiLFwibmdFXCI6XCJcXHUyMjY3XFx1MDMzOFwiLFwibmdlXCI6XCJcXHUyMjcxXCIsXCJuZ2VxXCI6XCJcXHUyMjcxXCIsXCJuZ2VxcVwiOlwiXFx1MjI2N1xcdTAzMzhcIixcIm5nZXFzbGFudFwiOlwiXFx1MkE3RVxcdTAzMzhcIixcIm5nZXNcIjpcIlxcdTJBN0VcXHUwMzM4XCIsXCJuR2dcIjpcIlxcdTIyRDlcXHUwMzM4XCIsXCJuZ3NpbVwiOlwiXFx1MjI3NVwiLFwibkd0XCI6XCJcXHUyMjZCXFx1MjBEMlwiLFwibmd0XCI6XCJcXHUyMjZGXCIsXCJuZ3RyXCI6XCJcXHUyMjZGXCIsXCJuR3R2XCI6XCJcXHUyMjZCXFx1MDMzOFwiLFwibmhhcnJcIjpcIlxcdTIxQUVcIixcIm5oQXJyXCI6XCJcXHUyMUNFXCIsXCJuaHBhclwiOlwiXFx1MkFGMlwiLFwibmlcIjpcIlxcdTIyMEJcIixcIm5pc1wiOlwiXFx1MjJGQ1wiLFwibmlzZFwiOlwiXFx1MjJGQVwiLFwibml2XCI6XCJcXHUyMjBCXCIsXCJOSmN5XCI6XCJcXHUwNDBBXCIsXCJuamN5XCI6XCJcXHUwNDVBXCIsXCJubGFyclwiOlwiXFx1MjE5QVwiLFwibmxBcnJcIjpcIlxcdTIxQ0RcIixcIm5sZHJcIjpcIlxcdTIwMjVcIixcIm5sRVwiOlwiXFx1MjI2NlxcdTAzMzhcIixcIm5sZVwiOlwiXFx1MjI3MFwiLFwibmxlZnRhcnJvd1wiOlwiXFx1MjE5QVwiLFwibkxlZnRhcnJvd1wiOlwiXFx1MjFDRFwiLFwibmxlZnRyaWdodGFycm93XCI6XCJcXHUyMUFFXCIsXCJuTGVmdHJpZ2h0YXJyb3dcIjpcIlxcdTIxQ0VcIixcIm5sZXFcIjpcIlxcdTIyNzBcIixcIm5sZXFxXCI6XCJcXHUyMjY2XFx1MDMzOFwiLFwibmxlcXNsYW50XCI6XCJcXHUyQTdEXFx1MDMzOFwiLFwibmxlc1wiOlwiXFx1MkE3RFxcdTAzMzhcIixcIm5sZXNzXCI6XCJcXHUyMjZFXCIsXCJuTGxcIjpcIlxcdTIyRDhcXHUwMzM4XCIsXCJubHNpbVwiOlwiXFx1MjI3NFwiLFwibkx0XCI6XCJcXHUyMjZBXFx1MjBEMlwiLFwibmx0XCI6XCJcXHUyMjZFXCIsXCJubHRyaVwiOlwiXFx1MjJFQVwiLFwibmx0cmllXCI6XCJcXHUyMkVDXCIsXCJuTHR2XCI6XCJcXHUyMjZBXFx1MDMzOFwiLFwibm1pZFwiOlwiXFx1MjIyNFwiLFwiTm9CcmVha1wiOlwiXFx1MjA2MFwiLFwiTm9uQnJlYWtpbmdTcGFjZVwiOlwiXFx1MDBBMFwiLFwibm9wZlwiOlwiXFx1RDgzNVxcdURENUZcIixcIk5vcGZcIjpcIlxcdTIxMTVcIixcIk5vdFwiOlwiXFx1MkFFQ1wiLFwibm90XCI6XCJcXHUwMEFDXCIsXCJOb3RDb25ncnVlbnRcIjpcIlxcdTIyNjJcIixcIk5vdEN1cENhcFwiOlwiXFx1MjI2RFwiLFwiTm90RG91YmxlVmVydGljYWxCYXJcIjpcIlxcdTIyMjZcIixcIk5vdEVsZW1lbnRcIjpcIlxcdTIyMDlcIixcIk5vdEVxdWFsXCI6XCJcXHUyMjYwXCIsXCJOb3RFcXVhbFRpbGRlXCI6XCJcXHUyMjQyXFx1MDMzOFwiLFwiTm90RXhpc3RzXCI6XCJcXHUyMjA0XCIsXCJOb3RHcmVhdGVyXCI6XCJcXHUyMjZGXCIsXCJOb3RHcmVhdGVyRXF1YWxcIjpcIlxcdTIyNzFcIixcIk5vdEdyZWF0ZXJGdWxsRXF1YWxcIjpcIlxcdTIyNjdcXHUwMzM4XCIsXCJOb3RHcmVhdGVyR3JlYXRlclwiOlwiXFx1MjI2QlxcdTAzMzhcIixcIk5vdEdyZWF0ZXJMZXNzXCI6XCJcXHUyMjc5XCIsXCJOb3RHcmVhdGVyU2xhbnRFcXVhbFwiOlwiXFx1MkE3RVxcdTAzMzhcIixcIk5vdEdyZWF0ZXJUaWxkZVwiOlwiXFx1MjI3NVwiLFwiTm90SHVtcERvd25IdW1wXCI6XCJcXHUyMjRFXFx1MDMzOFwiLFwiTm90SHVtcEVxdWFsXCI6XCJcXHUyMjRGXFx1MDMzOFwiLFwibm90aW5cIjpcIlxcdTIyMDlcIixcIm5vdGluZG90XCI6XCJcXHUyMkY1XFx1MDMzOFwiLFwibm90aW5FXCI6XCJcXHUyMkY5XFx1MDMzOFwiLFwibm90aW52YVwiOlwiXFx1MjIwOVwiLFwibm90aW52YlwiOlwiXFx1MjJGN1wiLFwibm90aW52Y1wiOlwiXFx1MjJGNlwiLFwiTm90TGVmdFRyaWFuZ2xlQmFyXCI6XCJcXHUyOUNGXFx1MDMzOFwiLFwiTm90TGVmdFRyaWFuZ2xlXCI6XCJcXHUyMkVBXCIsXCJOb3RMZWZ0VHJpYW5nbGVFcXVhbFwiOlwiXFx1MjJFQ1wiLFwiTm90TGVzc1wiOlwiXFx1MjI2RVwiLFwiTm90TGVzc0VxdWFsXCI6XCJcXHUyMjcwXCIsXCJOb3RMZXNzR3JlYXRlclwiOlwiXFx1MjI3OFwiLFwiTm90TGVzc0xlc3NcIjpcIlxcdTIyNkFcXHUwMzM4XCIsXCJOb3RMZXNzU2xhbnRFcXVhbFwiOlwiXFx1MkE3RFxcdTAzMzhcIixcIk5vdExlc3NUaWxkZVwiOlwiXFx1MjI3NFwiLFwiTm90TmVzdGVkR3JlYXRlckdyZWF0ZXJcIjpcIlxcdTJBQTJcXHUwMzM4XCIsXCJOb3ROZXN0ZWRMZXNzTGVzc1wiOlwiXFx1MkFBMVxcdTAzMzhcIixcIm5vdG5pXCI6XCJcXHUyMjBDXCIsXCJub3RuaXZhXCI6XCJcXHUyMjBDXCIsXCJub3RuaXZiXCI6XCJcXHUyMkZFXCIsXCJub3RuaXZjXCI6XCJcXHUyMkZEXCIsXCJOb3RQcmVjZWRlc1wiOlwiXFx1MjI4MFwiLFwiTm90UHJlY2VkZXNFcXVhbFwiOlwiXFx1MkFBRlxcdTAzMzhcIixcIk5vdFByZWNlZGVzU2xhbnRFcXVhbFwiOlwiXFx1MjJFMFwiLFwiTm90UmV2ZXJzZUVsZW1lbnRcIjpcIlxcdTIyMENcIixcIk5vdFJpZ2h0VHJpYW5nbGVCYXJcIjpcIlxcdTI5RDBcXHUwMzM4XCIsXCJOb3RSaWdodFRyaWFuZ2xlXCI6XCJcXHUyMkVCXCIsXCJOb3RSaWdodFRyaWFuZ2xlRXF1YWxcIjpcIlxcdTIyRURcIixcIk5vdFNxdWFyZVN1YnNldFwiOlwiXFx1MjI4RlxcdTAzMzhcIixcIk5vdFNxdWFyZVN1YnNldEVxdWFsXCI6XCJcXHUyMkUyXCIsXCJOb3RTcXVhcmVTdXBlcnNldFwiOlwiXFx1MjI5MFxcdTAzMzhcIixcIk5vdFNxdWFyZVN1cGVyc2V0RXF1YWxcIjpcIlxcdTIyRTNcIixcIk5vdFN1YnNldFwiOlwiXFx1MjI4MlxcdTIwRDJcIixcIk5vdFN1YnNldEVxdWFsXCI6XCJcXHUyMjg4XCIsXCJOb3RTdWNjZWVkc1wiOlwiXFx1MjI4MVwiLFwiTm90U3VjY2VlZHNFcXVhbFwiOlwiXFx1MkFCMFxcdTAzMzhcIixcIk5vdFN1Y2NlZWRzU2xhbnRFcXVhbFwiOlwiXFx1MjJFMVwiLFwiTm90U3VjY2VlZHNUaWxkZVwiOlwiXFx1MjI3RlxcdTAzMzhcIixcIk5vdFN1cGVyc2V0XCI6XCJcXHUyMjgzXFx1MjBEMlwiLFwiTm90U3VwZXJzZXRFcXVhbFwiOlwiXFx1MjI4OVwiLFwiTm90VGlsZGVcIjpcIlxcdTIyNDFcIixcIk5vdFRpbGRlRXF1YWxcIjpcIlxcdTIyNDRcIixcIk5vdFRpbGRlRnVsbEVxdWFsXCI6XCJcXHUyMjQ3XCIsXCJOb3RUaWxkZVRpbGRlXCI6XCJcXHUyMjQ5XCIsXCJOb3RWZXJ0aWNhbEJhclwiOlwiXFx1MjIyNFwiLFwibnBhcmFsbGVsXCI6XCJcXHUyMjI2XCIsXCJucGFyXCI6XCJcXHUyMjI2XCIsXCJucGFyc2xcIjpcIlxcdTJBRkRcXHUyMEU1XCIsXCJucGFydFwiOlwiXFx1MjIwMlxcdTAzMzhcIixcIm5wb2xpbnRcIjpcIlxcdTJBMTRcIixcIm5wclwiOlwiXFx1MjI4MFwiLFwibnByY3VlXCI6XCJcXHUyMkUwXCIsXCJucHJlY1wiOlwiXFx1MjI4MFwiLFwibnByZWNlcVwiOlwiXFx1MkFBRlxcdTAzMzhcIixcIm5wcmVcIjpcIlxcdTJBQUZcXHUwMzM4XCIsXCJucmFycmNcIjpcIlxcdTI5MzNcXHUwMzM4XCIsXCJucmFyclwiOlwiXFx1MjE5QlwiLFwibnJBcnJcIjpcIlxcdTIxQ0ZcIixcIm5yYXJyd1wiOlwiXFx1MjE5RFxcdTAzMzhcIixcIm5yaWdodGFycm93XCI6XCJcXHUyMTlCXCIsXCJuUmlnaHRhcnJvd1wiOlwiXFx1MjFDRlwiLFwibnJ0cmlcIjpcIlxcdTIyRUJcIixcIm5ydHJpZVwiOlwiXFx1MjJFRFwiLFwibnNjXCI6XCJcXHUyMjgxXCIsXCJuc2NjdWVcIjpcIlxcdTIyRTFcIixcIm5zY2VcIjpcIlxcdTJBQjBcXHUwMzM4XCIsXCJOc2NyXCI6XCJcXHVEODM1XFx1RENBOVwiLFwibnNjclwiOlwiXFx1RDgzNVxcdURDQzNcIixcIm5zaG9ydG1pZFwiOlwiXFx1MjIyNFwiLFwibnNob3J0cGFyYWxsZWxcIjpcIlxcdTIyMjZcIixcIm5zaW1cIjpcIlxcdTIyNDFcIixcIm5zaW1lXCI6XCJcXHUyMjQ0XCIsXCJuc2ltZXFcIjpcIlxcdTIyNDRcIixcIm5zbWlkXCI6XCJcXHUyMjI0XCIsXCJuc3BhclwiOlwiXFx1MjIyNlwiLFwibnNxc3ViZVwiOlwiXFx1MjJFMlwiLFwibnNxc3VwZVwiOlwiXFx1MjJFM1wiLFwibnN1YlwiOlwiXFx1MjI4NFwiLFwibnN1YkVcIjpcIlxcdTJBQzVcXHUwMzM4XCIsXCJuc3ViZVwiOlwiXFx1MjI4OFwiLFwibnN1YnNldFwiOlwiXFx1MjI4MlxcdTIwRDJcIixcIm5zdWJzZXRlcVwiOlwiXFx1MjI4OFwiLFwibnN1YnNldGVxcVwiOlwiXFx1MkFDNVxcdTAzMzhcIixcIm5zdWNjXCI6XCJcXHUyMjgxXCIsXCJuc3VjY2VxXCI6XCJcXHUyQUIwXFx1MDMzOFwiLFwibnN1cFwiOlwiXFx1MjI4NVwiLFwibnN1cEVcIjpcIlxcdTJBQzZcXHUwMzM4XCIsXCJuc3VwZVwiOlwiXFx1MjI4OVwiLFwibnN1cHNldFwiOlwiXFx1MjI4M1xcdTIwRDJcIixcIm5zdXBzZXRlcVwiOlwiXFx1MjI4OVwiLFwibnN1cHNldGVxcVwiOlwiXFx1MkFDNlxcdTAzMzhcIixcIm50Z2xcIjpcIlxcdTIyNzlcIixcIk50aWxkZVwiOlwiXFx1MDBEMVwiLFwibnRpbGRlXCI6XCJcXHUwMEYxXCIsXCJudGxnXCI6XCJcXHUyMjc4XCIsXCJudHJpYW5nbGVsZWZ0XCI6XCJcXHUyMkVBXCIsXCJudHJpYW5nbGVsZWZ0ZXFcIjpcIlxcdTIyRUNcIixcIm50cmlhbmdsZXJpZ2h0XCI6XCJcXHUyMkVCXCIsXCJudHJpYW5nbGVyaWdodGVxXCI6XCJcXHUyMkVEXCIsXCJOdVwiOlwiXFx1MDM5RFwiLFwibnVcIjpcIlxcdTAzQkRcIixcIm51bVwiOlwiI1wiLFwibnVtZXJvXCI6XCJcXHUyMTE2XCIsXCJudW1zcFwiOlwiXFx1MjAwN1wiLFwibnZhcFwiOlwiXFx1MjI0RFxcdTIwRDJcIixcIm52ZGFzaFwiOlwiXFx1MjJBQ1wiLFwibnZEYXNoXCI6XCJcXHUyMkFEXCIsXCJuVmRhc2hcIjpcIlxcdTIyQUVcIixcIm5WRGFzaFwiOlwiXFx1MjJBRlwiLFwibnZnZVwiOlwiXFx1MjI2NVxcdTIwRDJcIixcIm52Z3RcIjpcIj5cXHUyMEQyXCIsXCJudkhhcnJcIjpcIlxcdTI5MDRcIixcIm52aW5maW5cIjpcIlxcdTI5REVcIixcIm52bEFyclwiOlwiXFx1MjkwMlwiLFwibnZsZVwiOlwiXFx1MjI2NFxcdTIwRDJcIixcIm52bHRcIjpcIjxcXHUyMEQyXCIsXCJudmx0cmllXCI6XCJcXHUyMkI0XFx1MjBEMlwiLFwibnZyQXJyXCI6XCJcXHUyOTAzXCIsXCJudnJ0cmllXCI6XCJcXHUyMkI1XFx1MjBEMlwiLFwibnZzaW1cIjpcIlxcdTIyM0NcXHUyMEQyXCIsXCJud2FyaGtcIjpcIlxcdTI5MjNcIixcIm53YXJyXCI6XCJcXHUyMTk2XCIsXCJud0FyclwiOlwiXFx1MjFENlwiLFwibndhcnJvd1wiOlwiXFx1MjE5NlwiLFwibnduZWFyXCI6XCJcXHUyOTI3XCIsXCJPYWN1dGVcIjpcIlxcdTAwRDNcIixcIm9hY3V0ZVwiOlwiXFx1MDBGM1wiLFwib2FzdFwiOlwiXFx1MjI5QlwiLFwiT2NpcmNcIjpcIlxcdTAwRDRcIixcIm9jaXJjXCI6XCJcXHUwMEY0XCIsXCJvY2lyXCI6XCJcXHUyMjlBXCIsXCJPY3lcIjpcIlxcdTA0MUVcIixcIm9jeVwiOlwiXFx1MDQzRVwiLFwib2Rhc2hcIjpcIlxcdTIyOURcIixcIk9kYmxhY1wiOlwiXFx1MDE1MFwiLFwib2RibGFjXCI6XCJcXHUwMTUxXCIsXCJvZGl2XCI6XCJcXHUyQTM4XCIsXCJvZG90XCI6XCJcXHUyMjk5XCIsXCJvZHNvbGRcIjpcIlxcdTI5QkNcIixcIk9FbGlnXCI6XCJcXHUwMTUyXCIsXCJvZWxpZ1wiOlwiXFx1MDE1M1wiLFwib2ZjaXJcIjpcIlxcdTI5QkZcIixcIk9mclwiOlwiXFx1RDgzNVxcdUREMTJcIixcIm9mclwiOlwiXFx1RDgzNVxcdUREMkNcIixcIm9nb25cIjpcIlxcdTAyREJcIixcIk9ncmF2ZVwiOlwiXFx1MDBEMlwiLFwib2dyYXZlXCI6XCJcXHUwMEYyXCIsXCJvZ3RcIjpcIlxcdTI5QzFcIixcIm9oYmFyXCI6XCJcXHUyOUI1XCIsXCJvaG1cIjpcIlxcdTAzQTlcIixcIm9pbnRcIjpcIlxcdTIyMkVcIixcIm9sYXJyXCI6XCJcXHUyMUJBXCIsXCJvbGNpclwiOlwiXFx1MjlCRVwiLFwib2xjcm9zc1wiOlwiXFx1MjlCQlwiLFwib2xpbmVcIjpcIlxcdTIwM0VcIixcIm9sdFwiOlwiXFx1MjlDMFwiLFwiT21hY3JcIjpcIlxcdTAxNENcIixcIm9tYWNyXCI6XCJcXHUwMTREXCIsXCJPbWVnYVwiOlwiXFx1MDNBOVwiLFwib21lZ2FcIjpcIlxcdTAzQzlcIixcIk9taWNyb25cIjpcIlxcdTAzOUZcIixcIm9taWNyb25cIjpcIlxcdTAzQkZcIixcIm9taWRcIjpcIlxcdTI5QjZcIixcIm9taW51c1wiOlwiXFx1MjI5NlwiLFwiT29wZlwiOlwiXFx1RDgzNVxcdURENDZcIixcIm9vcGZcIjpcIlxcdUQ4MzVcXHVERDYwXCIsXCJvcGFyXCI6XCJcXHUyOUI3XCIsXCJPcGVuQ3VybHlEb3VibGVRdW90ZVwiOlwiXFx1MjAxQ1wiLFwiT3BlbkN1cmx5UXVvdGVcIjpcIlxcdTIwMThcIixcIm9wZXJwXCI6XCJcXHUyOUI5XCIsXCJvcGx1c1wiOlwiXFx1MjI5NVwiLFwib3JhcnJcIjpcIlxcdTIxQkJcIixcIk9yXCI6XCJcXHUyQTU0XCIsXCJvclwiOlwiXFx1MjIyOFwiLFwib3JkXCI6XCJcXHUyQTVEXCIsXCJvcmRlclwiOlwiXFx1MjEzNFwiLFwib3JkZXJvZlwiOlwiXFx1MjEzNFwiLFwib3JkZlwiOlwiXFx1MDBBQVwiLFwib3JkbVwiOlwiXFx1MDBCQVwiLFwib3JpZ29mXCI6XCJcXHUyMkI2XCIsXCJvcm9yXCI6XCJcXHUyQTU2XCIsXCJvcnNsb3BlXCI6XCJcXHUyQTU3XCIsXCJvcnZcIjpcIlxcdTJBNUJcIixcIm9TXCI6XCJcXHUyNEM4XCIsXCJPc2NyXCI6XCJcXHVEODM1XFx1RENBQVwiLFwib3NjclwiOlwiXFx1MjEzNFwiLFwiT3NsYXNoXCI6XCJcXHUwMEQ4XCIsXCJvc2xhc2hcIjpcIlxcdTAwRjhcIixcIm9zb2xcIjpcIlxcdTIyOThcIixcIk90aWxkZVwiOlwiXFx1MDBENVwiLFwib3RpbGRlXCI6XCJcXHUwMEY1XCIsXCJvdGltZXNhc1wiOlwiXFx1MkEzNlwiLFwiT3RpbWVzXCI6XCJcXHUyQTM3XCIsXCJvdGltZXNcIjpcIlxcdTIyOTdcIixcIk91bWxcIjpcIlxcdTAwRDZcIixcIm91bWxcIjpcIlxcdTAwRjZcIixcIm92YmFyXCI6XCJcXHUyMzNEXCIsXCJPdmVyQmFyXCI6XCJcXHUyMDNFXCIsXCJPdmVyQnJhY2VcIjpcIlxcdTIzREVcIixcIk92ZXJCcmFja2V0XCI6XCJcXHUyM0I0XCIsXCJPdmVyUGFyZW50aGVzaXNcIjpcIlxcdTIzRENcIixcInBhcmFcIjpcIlxcdTAwQjZcIixcInBhcmFsbGVsXCI6XCJcXHUyMjI1XCIsXCJwYXJcIjpcIlxcdTIyMjVcIixcInBhcnNpbVwiOlwiXFx1MkFGM1wiLFwicGFyc2xcIjpcIlxcdTJBRkRcIixcInBhcnRcIjpcIlxcdTIyMDJcIixcIlBhcnRpYWxEXCI6XCJcXHUyMjAyXCIsXCJQY3lcIjpcIlxcdTA0MUZcIixcInBjeVwiOlwiXFx1MDQzRlwiLFwicGVyY250XCI6XCIlXCIsXCJwZXJpb2RcIjpcIi5cIixcInBlcm1pbFwiOlwiXFx1MjAzMFwiLFwicGVycFwiOlwiXFx1MjJBNVwiLFwicGVydGVua1wiOlwiXFx1MjAzMVwiLFwiUGZyXCI6XCJcXHVEODM1XFx1REQxM1wiLFwicGZyXCI6XCJcXHVEODM1XFx1REQyRFwiLFwiUGhpXCI6XCJcXHUwM0E2XCIsXCJwaGlcIjpcIlxcdTAzQzZcIixcInBoaXZcIjpcIlxcdTAzRDVcIixcInBobW1hdFwiOlwiXFx1MjEzM1wiLFwicGhvbmVcIjpcIlxcdTI2MEVcIixcIlBpXCI6XCJcXHUwM0EwXCIsXCJwaVwiOlwiXFx1MDNDMFwiLFwicGl0Y2hmb3JrXCI6XCJcXHUyMkQ0XCIsXCJwaXZcIjpcIlxcdTAzRDZcIixcInBsYW5ja1wiOlwiXFx1MjEwRlwiLFwicGxhbmNraFwiOlwiXFx1MjEwRVwiLFwicGxhbmt2XCI6XCJcXHUyMTBGXCIsXCJwbHVzYWNpclwiOlwiXFx1MkEyM1wiLFwicGx1c2JcIjpcIlxcdTIyOUVcIixcInBsdXNjaXJcIjpcIlxcdTJBMjJcIixcInBsdXNcIjpcIitcIixcInBsdXNkb1wiOlwiXFx1MjIxNFwiLFwicGx1c2R1XCI6XCJcXHUyQTI1XCIsXCJwbHVzZVwiOlwiXFx1MkE3MlwiLFwiUGx1c01pbnVzXCI6XCJcXHUwMEIxXCIsXCJwbHVzbW5cIjpcIlxcdTAwQjFcIixcInBsdXNzaW1cIjpcIlxcdTJBMjZcIixcInBsdXN0d29cIjpcIlxcdTJBMjdcIixcInBtXCI6XCJcXHUwMEIxXCIsXCJQb2luY2FyZXBsYW5lXCI6XCJcXHUyMTBDXCIsXCJwb2ludGludFwiOlwiXFx1MkExNVwiLFwicG9wZlwiOlwiXFx1RDgzNVxcdURENjFcIixcIlBvcGZcIjpcIlxcdTIxMTlcIixcInBvdW5kXCI6XCJcXHUwMEEzXCIsXCJwcmFwXCI6XCJcXHUyQUI3XCIsXCJQclwiOlwiXFx1MkFCQlwiLFwicHJcIjpcIlxcdTIyN0FcIixcInByY3VlXCI6XCJcXHUyMjdDXCIsXCJwcmVjYXBwcm94XCI6XCJcXHUyQUI3XCIsXCJwcmVjXCI6XCJcXHUyMjdBXCIsXCJwcmVjY3VybHllcVwiOlwiXFx1MjI3Q1wiLFwiUHJlY2VkZXNcIjpcIlxcdTIyN0FcIixcIlByZWNlZGVzRXF1YWxcIjpcIlxcdTJBQUZcIixcIlByZWNlZGVzU2xhbnRFcXVhbFwiOlwiXFx1MjI3Q1wiLFwiUHJlY2VkZXNUaWxkZVwiOlwiXFx1MjI3RVwiLFwicHJlY2VxXCI6XCJcXHUyQUFGXCIsXCJwcmVjbmFwcHJveFwiOlwiXFx1MkFCOVwiLFwicHJlY25lcXFcIjpcIlxcdTJBQjVcIixcInByZWNuc2ltXCI6XCJcXHUyMkU4XCIsXCJwcmVcIjpcIlxcdTJBQUZcIixcInByRVwiOlwiXFx1MkFCM1wiLFwicHJlY3NpbVwiOlwiXFx1MjI3RVwiLFwicHJpbWVcIjpcIlxcdTIwMzJcIixcIlByaW1lXCI6XCJcXHUyMDMzXCIsXCJwcmltZXNcIjpcIlxcdTIxMTlcIixcInBybmFwXCI6XCJcXHUyQUI5XCIsXCJwcm5FXCI6XCJcXHUyQUI1XCIsXCJwcm5zaW1cIjpcIlxcdTIyRThcIixcInByb2RcIjpcIlxcdTIyMEZcIixcIlByb2R1Y3RcIjpcIlxcdTIyMEZcIixcInByb2ZhbGFyXCI6XCJcXHUyMzJFXCIsXCJwcm9mbGluZVwiOlwiXFx1MjMxMlwiLFwicHJvZnN1cmZcIjpcIlxcdTIzMTNcIixcInByb3BcIjpcIlxcdTIyMURcIixcIlByb3BvcnRpb25hbFwiOlwiXFx1MjIxRFwiLFwiUHJvcG9ydGlvblwiOlwiXFx1MjIzN1wiLFwicHJvcHRvXCI6XCJcXHUyMjFEXCIsXCJwcnNpbVwiOlwiXFx1MjI3RVwiLFwicHJ1cmVsXCI6XCJcXHUyMkIwXCIsXCJQc2NyXCI6XCJcXHVEODM1XFx1RENBQlwiLFwicHNjclwiOlwiXFx1RDgzNVxcdURDQzVcIixcIlBzaVwiOlwiXFx1MDNBOFwiLFwicHNpXCI6XCJcXHUwM0M4XCIsXCJwdW5jc3BcIjpcIlxcdTIwMDhcIixcIlFmclwiOlwiXFx1RDgzNVxcdUREMTRcIixcInFmclwiOlwiXFx1RDgzNVxcdUREMkVcIixcInFpbnRcIjpcIlxcdTJBMENcIixcInFvcGZcIjpcIlxcdUQ4MzVcXHVERDYyXCIsXCJRb3BmXCI6XCJcXHUyMTFBXCIsXCJxcHJpbWVcIjpcIlxcdTIwNTdcIixcIlFzY3JcIjpcIlxcdUQ4MzVcXHVEQ0FDXCIsXCJxc2NyXCI6XCJcXHVEODM1XFx1RENDNlwiLFwicXVhdGVybmlvbnNcIjpcIlxcdTIxMERcIixcInF1YXRpbnRcIjpcIlxcdTJBMTZcIixcInF1ZXN0XCI6XCI/XCIsXCJxdWVzdGVxXCI6XCJcXHUyMjVGXCIsXCJxdW90XCI6XCJcXFwiXCIsXCJRVU9UXCI6XCJcXFwiXCIsXCJyQWFyclwiOlwiXFx1MjFEQlwiLFwicmFjZVwiOlwiXFx1MjIzRFxcdTAzMzFcIixcIlJhY3V0ZVwiOlwiXFx1MDE1NFwiLFwicmFjdXRlXCI6XCJcXHUwMTU1XCIsXCJyYWRpY1wiOlwiXFx1MjIxQVwiLFwicmFlbXB0eXZcIjpcIlxcdTI5QjNcIixcInJhbmdcIjpcIlxcdTI3RTlcIixcIlJhbmdcIjpcIlxcdTI3RUJcIixcInJhbmdkXCI6XCJcXHUyOTkyXCIsXCJyYW5nZVwiOlwiXFx1MjlBNVwiLFwicmFuZ2xlXCI6XCJcXHUyN0U5XCIsXCJyYXF1b1wiOlwiXFx1MDBCQlwiLFwicmFycmFwXCI6XCJcXHUyOTc1XCIsXCJyYXJyYlwiOlwiXFx1MjFFNVwiLFwicmFycmJmc1wiOlwiXFx1MjkyMFwiLFwicmFycmNcIjpcIlxcdTI5MzNcIixcInJhcnJcIjpcIlxcdTIxOTJcIixcIlJhcnJcIjpcIlxcdTIxQTBcIixcInJBcnJcIjpcIlxcdTIxRDJcIixcInJhcnJmc1wiOlwiXFx1MjkxRVwiLFwicmFycmhrXCI6XCJcXHUyMUFBXCIsXCJyYXJybHBcIjpcIlxcdTIxQUNcIixcInJhcnJwbFwiOlwiXFx1Mjk0NVwiLFwicmFycnNpbVwiOlwiXFx1Mjk3NFwiLFwiUmFycnRsXCI6XCJcXHUyOTE2XCIsXCJyYXJydGxcIjpcIlxcdTIxQTNcIixcInJhcnJ3XCI6XCJcXHUyMTlEXCIsXCJyYXRhaWxcIjpcIlxcdTI5MUFcIixcInJBdGFpbFwiOlwiXFx1MjkxQ1wiLFwicmF0aW9cIjpcIlxcdTIyMzZcIixcInJhdGlvbmFsc1wiOlwiXFx1MjExQVwiLFwicmJhcnJcIjpcIlxcdTI5MERcIixcInJCYXJyXCI6XCJcXHUyOTBGXCIsXCJSQmFyclwiOlwiXFx1MjkxMFwiLFwicmJicmtcIjpcIlxcdTI3NzNcIixcInJicmFjZVwiOlwifVwiLFwicmJyYWNrXCI6XCJdXCIsXCJyYnJrZVwiOlwiXFx1Mjk4Q1wiLFwicmJya3NsZFwiOlwiXFx1Mjk4RVwiLFwicmJya3NsdVwiOlwiXFx1Mjk5MFwiLFwiUmNhcm9uXCI6XCJcXHUwMTU4XCIsXCJyY2Fyb25cIjpcIlxcdTAxNTlcIixcIlJjZWRpbFwiOlwiXFx1MDE1NlwiLFwicmNlZGlsXCI6XCJcXHUwMTU3XCIsXCJyY2VpbFwiOlwiXFx1MjMwOVwiLFwicmN1YlwiOlwifVwiLFwiUmN5XCI6XCJcXHUwNDIwXCIsXCJyY3lcIjpcIlxcdTA0NDBcIixcInJkY2FcIjpcIlxcdTI5MzdcIixcInJkbGRoYXJcIjpcIlxcdTI5NjlcIixcInJkcXVvXCI6XCJcXHUyMDFEXCIsXCJyZHF1b3JcIjpcIlxcdTIwMURcIixcInJkc2hcIjpcIlxcdTIxQjNcIixcInJlYWxcIjpcIlxcdTIxMUNcIixcInJlYWxpbmVcIjpcIlxcdTIxMUJcIixcInJlYWxwYXJ0XCI6XCJcXHUyMTFDXCIsXCJyZWFsc1wiOlwiXFx1MjExRFwiLFwiUmVcIjpcIlxcdTIxMUNcIixcInJlY3RcIjpcIlxcdTI1QURcIixcInJlZ1wiOlwiXFx1MDBBRVwiLFwiUkVHXCI6XCJcXHUwMEFFXCIsXCJSZXZlcnNlRWxlbWVudFwiOlwiXFx1MjIwQlwiLFwiUmV2ZXJzZUVxdWlsaWJyaXVtXCI6XCJcXHUyMUNCXCIsXCJSZXZlcnNlVXBFcXVpbGlicml1bVwiOlwiXFx1Mjk2RlwiLFwicmZpc2h0XCI6XCJcXHUyOTdEXCIsXCJyZmxvb3JcIjpcIlxcdTIzMEJcIixcInJmclwiOlwiXFx1RDgzNVxcdUREMkZcIixcIlJmclwiOlwiXFx1MjExQ1wiLFwickhhclwiOlwiXFx1Mjk2NFwiLFwicmhhcmRcIjpcIlxcdTIxQzFcIixcInJoYXJ1XCI6XCJcXHUyMUMwXCIsXCJyaGFydWxcIjpcIlxcdTI5NkNcIixcIlJob1wiOlwiXFx1MDNBMVwiLFwicmhvXCI6XCJcXHUwM0MxXCIsXCJyaG92XCI6XCJcXHUwM0YxXCIsXCJSaWdodEFuZ2xlQnJhY2tldFwiOlwiXFx1MjdFOVwiLFwiUmlnaHRBcnJvd0JhclwiOlwiXFx1MjFFNVwiLFwicmlnaHRhcnJvd1wiOlwiXFx1MjE5MlwiLFwiUmlnaHRBcnJvd1wiOlwiXFx1MjE5MlwiLFwiUmlnaHRhcnJvd1wiOlwiXFx1MjFEMlwiLFwiUmlnaHRBcnJvd0xlZnRBcnJvd1wiOlwiXFx1MjFDNFwiLFwicmlnaHRhcnJvd3RhaWxcIjpcIlxcdTIxQTNcIixcIlJpZ2h0Q2VpbGluZ1wiOlwiXFx1MjMwOVwiLFwiUmlnaHREb3VibGVCcmFja2V0XCI6XCJcXHUyN0U3XCIsXCJSaWdodERvd25UZWVWZWN0b3JcIjpcIlxcdTI5NURcIixcIlJpZ2h0RG93blZlY3RvckJhclwiOlwiXFx1Mjk1NVwiLFwiUmlnaHREb3duVmVjdG9yXCI6XCJcXHUyMUMyXCIsXCJSaWdodEZsb29yXCI6XCJcXHUyMzBCXCIsXCJyaWdodGhhcnBvb25kb3duXCI6XCJcXHUyMUMxXCIsXCJyaWdodGhhcnBvb251cFwiOlwiXFx1MjFDMFwiLFwicmlnaHRsZWZ0YXJyb3dzXCI6XCJcXHUyMUM0XCIsXCJyaWdodGxlZnRoYXJwb29uc1wiOlwiXFx1MjFDQ1wiLFwicmlnaHRyaWdodGFycm93c1wiOlwiXFx1MjFDOVwiLFwicmlnaHRzcXVpZ2Fycm93XCI6XCJcXHUyMTlEXCIsXCJSaWdodFRlZUFycm93XCI6XCJcXHUyMUE2XCIsXCJSaWdodFRlZVwiOlwiXFx1MjJBMlwiLFwiUmlnaHRUZWVWZWN0b3JcIjpcIlxcdTI5NUJcIixcInJpZ2h0dGhyZWV0aW1lc1wiOlwiXFx1MjJDQ1wiLFwiUmlnaHRUcmlhbmdsZUJhclwiOlwiXFx1MjlEMFwiLFwiUmlnaHRUcmlhbmdsZVwiOlwiXFx1MjJCM1wiLFwiUmlnaHRUcmlhbmdsZUVxdWFsXCI6XCJcXHUyMkI1XCIsXCJSaWdodFVwRG93blZlY3RvclwiOlwiXFx1Mjk0RlwiLFwiUmlnaHRVcFRlZVZlY3RvclwiOlwiXFx1Mjk1Q1wiLFwiUmlnaHRVcFZlY3RvckJhclwiOlwiXFx1Mjk1NFwiLFwiUmlnaHRVcFZlY3RvclwiOlwiXFx1MjFCRVwiLFwiUmlnaHRWZWN0b3JCYXJcIjpcIlxcdTI5NTNcIixcIlJpZ2h0VmVjdG9yXCI6XCJcXHUyMUMwXCIsXCJyaW5nXCI6XCJcXHUwMkRBXCIsXCJyaXNpbmdkb3RzZXFcIjpcIlxcdTIyNTNcIixcInJsYXJyXCI6XCJcXHUyMUM0XCIsXCJybGhhclwiOlwiXFx1MjFDQ1wiLFwicmxtXCI6XCJcXHUyMDBGXCIsXCJybW91c3RhY2hlXCI6XCJcXHUyM0IxXCIsXCJybW91c3RcIjpcIlxcdTIzQjFcIixcInJubWlkXCI6XCJcXHUyQUVFXCIsXCJyb2FuZ1wiOlwiXFx1MjdFRFwiLFwicm9hcnJcIjpcIlxcdTIxRkVcIixcInJvYnJrXCI6XCJcXHUyN0U3XCIsXCJyb3BhclwiOlwiXFx1Mjk4NlwiLFwicm9wZlwiOlwiXFx1RDgzNVxcdURENjNcIixcIlJvcGZcIjpcIlxcdTIxMURcIixcInJvcGx1c1wiOlwiXFx1MkEyRVwiLFwicm90aW1lc1wiOlwiXFx1MkEzNVwiLFwiUm91bmRJbXBsaWVzXCI6XCJcXHUyOTcwXCIsXCJycGFyXCI6XCIpXCIsXCJycGFyZ3RcIjpcIlxcdTI5OTRcIixcInJwcG9saW50XCI6XCJcXHUyQTEyXCIsXCJycmFyclwiOlwiXFx1MjFDOVwiLFwiUnJpZ2h0YXJyb3dcIjpcIlxcdTIxREJcIixcInJzYXF1b1wiOlwiXFx1MjAzQVwiLFwicnNjclwiOlwiXFx1RDgzNVxcdURDQzdcIixcIlJzY3JcIjpcIlxcdTIxMUJcIixcInJzaFwiOlwiXFx1MjFCMVwiLFwiUnNoXCI6XCJcXHUyMUIxXCIsXCJyc3FiXCI6XCJdXCIsXCJyc3F1b1wiOlwiXFx1MjAxOVwiLFwicnNxdW9yXCI6XCJcXHUyMDE5XCIsXCJydGhyZWVcIjpcIlxcdTIyQ0NcIixcInJ0aW1lc1wiOlwiXFx1MjJDQVwiLFwicnRyaVwiOlwiXFx1MjVCOVwiLFwicnRyaWVcIjpcIlxcdTIyQjVcIixcInJ0cmlmXCI6XCJcXHUyNUI4XCIsXCJydHJpbHRyaVwiOlwiXFx1MjlDRVwiLFwiUnVsZURlbGF5ZWRcIjpcIlxcdTI5RjRcIixcInJ1bHVoYXJcIjpcIlxcdTI5NjhcIixcInJ4XCI6XCJcXHUyMTFFXCIsXCJTYWN1dGVcIjpcIlxcdTAxNUFcIixcInNhY3V0ZVwiOlwiXFx1MDE1QlwiLFwic2JxdW9cIjpcIlxcdTIwMUFcIixcInNjYXBcIjpcIlxcdTJBQjhcIixcIlNjYXJvblwiOlwiXFx1MDE2MFwiLFwic2Nhcm9uXCI6XCJcXHUwMTYxXCIsXCJTY1wiOlwiXFx1MkFCQ1wiLFwic2NcIjpcIlxcdTIyN0JcIixcInNjY3VlXCI6XCJcXHUyMjdEXCIsXCJzY2VcIjpcIlxcdTJBQjBcIixcInNjRVwiOlwiXFx1MkFCNFwiLFwiU2NlZGlsXCI6XCJcXHUwMTVFXCIsXCJzY2VkaWxcIjpcIlxcdTAxNUZcIixcIlNjaXJjXCI6XCJcXHUwMTVDXCIsXCJzY2lyY1wiOlwiXFx1MDE1RFwiLFwic2NuYXBcIjpcIlxcdTJBQkFcIixcInNjbkVcIjpcIlxcdTJBQjZcIixcInNjbnNpbVwiOlwiXFx1MjJFOVwiLFwic2Nwb2xpbnRcIjpcIlxcdTJBMTNcIixcInNjc2ltXCI6XCJcXHUyMjdGXCIsXCJTY3lcIjpcIlxcdTA0MjFcIixcInNjeVwiOlwiXFx1MDQ0MVwiLFwic2RvdGJcIjpcIlxcdTIyQTFcIixcInNkb3RcIjpcIlxcdTIyQzVcIixcInNkb3RlXCI6XCJcXHUyQTY2XCIsXCJzZWFyaGtcIjpcIlxcdTI5MjVcIixcInNlYXJyXCI6XCJcXHUyMTk4XCIsXCJzZUFyclwiOlwiXFx1MjFEOFwiLFwic2VhcnJvd1wiOlwiXFx1MjE5OFwiLFwic2VjdFwiOlwiXFx1MDBBN1wiLFwic2VtaVwiOlwiO1wiLFwic2Vzd2FyXCI6XCJcXHUyOTI5XCIsXCJzZXRtaW51c1wiOlwiXFx1MjIxNlwiLFwic2V0bW5cIjpcIlxcdTIyMTZcIixcInNleHRcIjpcIlxcdTI3MzZcIixcIlNmclwiOlwiXFx1RDgzNVxcdUREMTZcIixcInNmclwiOlwiXFx1RDgzNVxcdUREMzBcIixcInNmcm93blwiOlwiXFx1MjMyMlwiLFwic2hhcnBcIjpcIlxcdTI2NkZcIixcIlNIQ0hjeVwiOlwiXFx1MDQyOVwiLFwic2hjaGN5XCI6XCJcXHUwNDQ5XCIsXCJTSGN5XCI6XCJcXHUwNDI4XCIsXCJzaGN5XCI6XCJcXHUwNDQ4XCIsXCJTaG9ydERvd25BcnJvd1wiOlwiXFx1MjE5M1wiLFwiU2hvcnRMZWZ0QXJyb3dcIjpcIlxcdTIxOTBcIixcInNob3J0bWlkXCI6XCJcXHUyMjIzXCIsXCJzaG9ydHBhcmFsbGVsXCI6XCJcXHUyMjI1XCIsXCJTaG9ydFJpZ2h0QXJyb3dcIjpcIlxcdTIxOTJcIixcIlNob3J0VXBBcnJvd1wiOlwiXFx1MjE5MVwiLFwic2h5XCI6XCJcXHUwMEFEXCIsXCJTaWdtYVwiOlwiXFx1MDNBM1wiLFwic2lnbWFcIjpcIlxcdTAzQzNcIixcInNpZ21hZlwiOlwiXFx1MDNDMlwiLFwic2lnbWF2XCI6XCJcXHUwM0MyXCIsXCJzaW1cIjpcIlxcdTIyM0NcIixcInNpbWRvdFwiOlwiXFx1MkE2QVwiLFwic2ltZVwiOlwiXFx1MjI0M1wiLFwic2ltZXFcIjpcIlxcdTIyNDNcIixcInNpbWdcIjpcIlxcdTJBOUVcIixcInNpbWdFXCI6XCJcXHUyQUEwXCIsXCJzaW1sXCI6XCJcXHUyQTlEXCIsXCJzaW1sRVwiOlwiXFx1MkE5RlwiLFwic2ltbmVcIjpcIlxcdTIyNDZcIixcInNpbXBsdXNcIjpcIlxcdTJBMjRcIixcInNpbXJhcnJcIjpcIlxcdTI5NzJcIixcInNsYXJyXCI6XCJcXHUyMTkwXCIsXCJTbWFsbENpcmNsZVwiOlwiXFx1MjIxOFwiLFwic21hbGxzZXRtaW51c1wiOlwiXFx1MjIxNlwiLFwic21hc2hwXCI6XCJcXHUyQTMzXCIsXCJzbWVwYXJzbFwiOlwiXFx1MjlFNFwiLFwic21pZFwiOlwiXFx1MjIyM1wiLFwic21pbGVcIjpcIlxcdTIzMjNcIixcInNtdFwiOlwiXFx1MkFBQVwiLFwic210ZVwiOlwiXFx1MkFBQ1wiLFwic210ZXNcIjpcIlxcdTJBQUNcXHVGRTAwXCIsXCJTT0ZUY3lcIjpcIlxcdTA0MkNcIixcInNvZnRjeVwiOlwiXFx1MDQ0Q1wiLFwic29sYmFyXCI6XCJcXHUyMzNGXCIsXCJzb2xiXCI6XCJcXHUyOUM0XCIsXCJzb2xcIjpcIi9cIixcIlNvcGZcIjpcIlxcdUQ4MzVcXHVERDRBXCIsXCJzb3BmXCI6XCJcXHVEODM1XFx1REQ2NFwiLFwic3BhZGVzXCI6XCJcXHUyNjYwXCIsXCJzcGFkZXN1aXRcIjpcIlxcdTI2NjBcIixcInNwYXJcIjpcIlxcdTIyMjVcIixcInNxY2FwXCI6XCJcXHUyMjkzXCIsXCJzcWNhcHNcIjpcIlxcdTIyOTNcXHVGRTAwXCIsXCJzcWN1cFwiOlwiXFx1MjI5NFwiLFwic3FjdXBzXCI6XCJcXHUyMjk0XFx1RkUwMFwiLFwiU3FydFwiOlwiXFx1MjIxQVwiLFwic3FzdWJcIjpcIlxcdTIyOEZcIixcInNxc3ViZVwiOlwiXFx1MjI5MVwiLFwic3FzdWJzZXRcIjpcIlxcdTIyOEZcIixcInNxc3Vic2V0ZXFcIjpcIlxcdTIyOTFcIixcInNxc3VwXCI6XCJcXHUyMjkwXCIsXCJzcXN1cGVcIjpcIlxcdTIyOTJcIixcInNxc3Vwc2V0XCI6XCJcXHUyMjkwXCIsXCJzcXN1cHNldGVxXCI6XCJcXHUyMjkyXCIsXCJzcXVhcmVcIjpcIlxcdTI1QTFcIixcIlNxdWFyZVwiOlwiXFx1MjVBMVwiLFwiU3F1YXJlSW50ZXJzZWN0aW9uXCI6XCJcXHUyMjkzXCIsXCJTcXVhcmVTdWJzZXRcIjpcIlxcdTIyOEZcIixcIlNxdWFyZVN1YnNldEVxdWFsXCI6XCJcXHUyMjkxXCIsXCJTcXVhcmVTdXBlcnNldFwiOlwiXFx1MjI5MFwiLFwiU3F1YXJlU3VwZXJzZXRFcXVhbFwiOlwiXFx1MjI5MlwiLFwiU3F1YXJlVW5pb25cIjpcIlxcdTIyOTRcIixcInNxdWFyZlwiOlwiXFx1MjVBQVwiLFwic3F1XCI6XCJcXHUyNUExXCIsXCJzcXVmXCI6XCJcXHUyNUFBXCIsXCJzcmFyclwiOlwiXFx1MjE5MlwiLFwiU3NjclwiOlwiXFx1RDgzNVxcdURDQUVcIixcInNzY3JcIjpcIlxcdUQ4MzVcXHVEQ0M4XCIsXCJzc2V0bW5cIjpcIlxcdTIyMTZcIixcInNzbWlsZVwiOlwiXFx1MjMyM1wiLFwic3N0YXJmXCI6XCJcXHUyMkM2XCIsXCJTdGFyXCI6XCJcXHUyMkM2XCIsXCJzdGFyXCI6XCJcXHUyNjA2XCIsXCJzdGFyZlwiOlwiXFx1MjYwNVwiLFwic3RyYWlnaHRlcHNpbG9uXCI6XCJcXHUwM0Y1XCIsXCJzdHJhaWdodHBoaVwiOlwiXFx1MDNENVwiLFwic3RybnNcIjpcIlxcdTAwQUZcIixcInN1YlwiOlwiXFx1MjI4MlwiLFwiU3ViXCI6XCJcXHUyMkQwXCIsXCJzdWJkb3RcIjpcIlxcdTJBQkRcIixcInN1YkVcIjpcIlxcdTJBQzVcIixcInN1YmVcIjpcIlxcdTIyODZcIixcInN1YmVkb3RcIjpcIlxcdTJBQzNcIixcInN1Ym11bHRcIjpcIlxcdTJBQzFcIixcInN1Ym5FXCI6XCJcXHUyQUNCXCIsXCJzdWJuZVwiOlwiXFx1MjI4QVwiLFwic3VicGx1c1wiOlwiXFx1MkFCRlwiLFwic3VicmFyclwiOlwiXFx1Mjk3OVwiLFwic3Vic2V0XCI6XCJcXHUyMjgyXCIsXCJTdWJzZXRcIjpcIlxcdTIyRDBcIixcInN1YnNldGVxXCI6XCJcXHUyMjg2XCIsXCJzdWJzZXRlcXFcIjpcIlxcdTJBQzVcIixcIlN1YnNldEVxdWFsXCI6XCJcXHUyMjg2XCIsXCJzdWJzZXRuZXFcIjpcIlxcdTIyOEFcIixcInN1YnNldG5lcXFcIjpcIlxcdTJBQ0JcIixcInN1YnNpbVwiOlwiXFx1MkFDN1wiLFwic3Vic3ViXCI6XCJcXHUyQUQ1XCIsXCJzdWJzdXBcIjpcIlxcdTJBRDNcIixcInN1Y2NhcHByb3hcIjpcIlxcdTJBQjhcIixcInN1Y2NcIjpcIlxcdTIyN0JcIixcInN1Y2NjdXJseWVxXCI6XCJcXHUyMjdEXCIsXCJTdWNjZWVkc1wiOlwiXFx1MjI3QlwiLFwiU3VjY2VlZHNFcXVhbFwiOlwiXFx1MkFCMFwiLFwiU3VjY2VlZHNTbGFudEVxdWFsXCI6XCJcXHUyMjdEXCIsXCJTdWNjZWVkc1RpbGRlXCI6XCJcXHUyMjdGXCIsXCJzdWNjZXFcIjpcIlxcdTJBQjBcIixcInN1Y2NuYXBwcm94XCI6XCJcXHUyQUJBXCIsXCJzdWNjbmVxcVwiOlwiXFx1MkFCNlwiLFwic3VjY25zaW1cIjpcIlxcdTIyRTlcIixcInN1Y2NzaW1cIjpcIlxcdTIyN0ZcIixcIlN1Y2hUaGF0XCI6XCJcXHUyMjBCXCIsXCJzdW1cIjpcIlxcdTIyMTFcIixcIlN1bVwiOlwiXFx1MjIxMVwiLFwic3VuZ1wiOlwiXFx1MjY2QVwiLFwic3VwMVwiOlwiXFx1MDBCOVwiLFwic3VwMlwiOlwiXFx1MDBCMlwiLFwic3VwM1wiOlwiXFx1MDBCM1wiLFwic3VwXCI6XCJcXHUyMjgzXCIsXCJTdXBcIjpcIlxcdTIyRDFcIixcInN1cGRvdFwiOlwiXFx1MkFCRVwiLFwic3VwZHN1YlwiOlwiXFx1MkFEOFwiLFwic3VwRVwiOlwiXFx1MkFDNlwiLFwic3VwZVwiOlwiXFx1MjI4N1wiLFwic3VwZWRvdFwiOlwiXFx1MkFDNFwiLFwiU3VwZXJzZXRcIjpcIlxcdTIyODNcIixcIlN1cGVyc2V0RXF1YWxcIjpcIlxcdTIyODdcIixcInN1cGhzb2xcIjpcIlxcdTI3QzlcIixcInN1cGhzdWJcIjpcIlxcdTJBRDdcIixcInN1cGxhcnJcIjpcIlxcdTI5N0JcIixcInN1cG11bHRcIjpcIlxcdTJBQzJcIixcInN1cG5FXCI6XCJcXHUyQUNDXCIsXCJzdXBuZVwiOlwiXFx1MjI4QlwiLFwic3VwcGx1c1wiOlwiXFx1MkFDMFwiLFwic3Vwc2V0XCI6XCJcXHUyMjgzXCIsXCJTdXBzZXRcIjpcIlxcdTIyRDFcIixcInN1cHNldGVxXCI6XCJcXHUyMjg3XCIsXCJzdXBzZXRlcXFcIjpcIlxcdTJBQzZcIixcInN1cHNldG5lcVwiOlwiXFx1MjI4QlwiLFwic3Vwc2V0bmVxcVwiOlwiXFx1MkFDQ1wiLFwic3Vwc2ltXCI6XCJcXHUyQUM4XCIsXCJzdXBzdWJcIjpcIlxcdTJBRDRcIixcInN1cHN1cFwiOlwiXFx1MkFENlwiLFwic3dhcmhrXCI6XCJcXHUyOTI2XCIsXCJzd2FyclwiOlwiXFx1MjE5OVwiLFwic3dBcnJcIjpcIlxcdTIxRDlcIixcInN3YXJyb3dcIjpcIlxcdTIxOTlcIixcInN3bndhclwiOlwiXFx1MjkyQVwiLFwic3psaWdcIjpcIlxcdTAwREZcIixcIlRhYlwiOlwiXFx0XCIsXCJ0YXJnZXRcIjpcIlxcdTIzMTZcIixcIlRhdVwiOlwiXFx1MDNBNFwiLFwidGF1XCI6XCJcXHUwM0M0XCIsXCJ0YnJrXCI6XCJcXHUyM0I0XCIsXCJUY2Fyb25cIjpcIlxcdTAxNjRcIixcInRjYXJvblwiOlwiXFx1MDE2NVwiLFwiVGNlZGlsXCI6XCJcXHUwMTYyXCIsXCJ0Y2VkaWxcIjpcIlxcdTAxNjNcIixcIlRjeVwiOlwiXFx1MDQyMlwiLFwidGN5XCI6XCJcXHUwNDQyXCIsXCJ0ZG90XCI6XCJcXHUyMERCXCIsXCJ0ZWxyZWNcIjpcIlxcdTIzMTVcIixcIlRmclwiOlwiXFx1RDgzNVxcdUREMTdcIixcInRmclwiOlwiXFx1RDgzNVxcdUREMzFcIixcInRoZXJlNFwiOlwiXFx1MjIzNFwiLFwidGhlcmVmb3JlXCI6XCJcXHUyMjM0XCIsXCJUaGVyZWZvcmVcIjpcIlxcdTIyMzRcIixcIlRoZXRhXCI6XCJcXHUwMzk4XCIsXCJ0aGV0YVwiOlwiXFx1MDNCOFwiLFwidGhldGFzeW1cIjpcIlxcdTAzRDFcIixcInRoZXRhdlwiOlwiXFx1MDNEMVwiLFwidGhpY2thcHByb3hcIjpcIlxcdTIyNDhcIixcInRoaWNrc2ltXCI6XCJcXHUyMjNDXCIsXCJUaGlja1NwYWNlXCI6XCJcXHUyMDVGXFx1MjAwQVwiLFwiVGhpblNwYWNlXCI6XCJcXHUyMDA5XCIsXCJ0aGluc3BcIjpcIlxcdTIwMDlcIixcInRoa2FwXCI6XCJcXHUyMjQ4XCIsXCJ0aGtzaW1cIjpcIlxcdTIyM0NcIixcIlRIT1JOXCI6XCJcXHUwMERFXCIsXCJ0aG9yblwiOlwiXFx1MDBGRVwiLFwidGlsZGVcIjpcIlxcdTAyRENcIixcIlRpbGRlXCI6XCJcXHUyMjNDXCIsXCJUaWxkZUVxdWFsXCI6XCJcXHUyMjQzXCIsXCJUaWxkZUZ1bGxFcXVhbFwiOlwiXFx1MjI0NVwiLFwiVGlsZGVUaWxkZVwiOlwiXFx1MjI0OFwiLFwidGltZXNiYXJcIjpcIlxcdTJBMzFcIixcInRpbWVzYlwiOlwiXFx1MjJBMFwiLFwidGltZXNcIjpcIlxcdTAwRDdcIixcInRpbWVzZFwiOlwiXFx1MkEzMFwiLFwidGludFwiOlwiXFx1MjIyRFwiLFwidG9lYVwiOlwiXFx1MjkyOFwiLFwidG9wYm90XCI6XCJcXHUyMzM2XCIsXCJ0b3BjaXJcIjpcIlxcdTJBRjFcIixcInRvcFwiOlwiXFx1MjJBNFwiLFwiVG9wZlwiOlwiXFx1RDgzNVxcdURENEJcIixcInRvcGZcIjpcIlxcdUQ4MzVcXHVERDY1XCIsXCJ0b3Bmb3JrXCI6XCJcXHUyQURBXCIsXCJ0b3NhXCI6XCJcXHUyOTI5XCIsXCJ0cHJpbWVcIjpcIlxcdTIwMzRcIixcInRyYWRlXCI6XCJcXHUyMTIyXCIsXCJUUkFERVwiOlwiXFx1MjEyMlwiLFwidHJpYW5nbGVcIjpcIlxcdTI1QjVcIixcInRyaWFuZ2xlZG93blwiOlwiXFx1MjVCRlwiLFwidHJpYW5nbGVsZWZ0XCI6XCJcXHUyNUMzXCIsXCJ0cmlhbmdsZWxlZnRlcVwiOlwiXFx1MjJCNFwiLFwidHJpYW5nbGVxXCI6XCJcXHUyMjVDXCIsXCJ0cmlhbmdsZXJpZ2h0XCI6XCJcXHUyNUI5XCIsXCJ0cmlhbmdsZXJpZ2h0ZXFcIjpcIlxcdTIyQjVcIixcInRyaWRvdFwiOlwiXFx1MjVFQ1wiLFwidHJpZVwiOlwiXFx1MjI1Q1wiLFwidHJpbWludXNcIjpcIlxcdTJBM0FcIixcIlRyaXBsZURvdFwiOlwiXFx1MjBEQlwiLFwidHJpcGx1c1wiOlwiXFx1MkEzOVwiLFwidHJpc2JcIjpcIlxcdTI5Q0RcIixcInRyaXRpbWVcIjpcIlxcdTJBM0JcIixcInRycGV6aXVtXCI6XCJcXHUyM0UyXCIsXCJUc2NyXCI6XCJcXHVEODM1XFx1RENBRlwiLFwidHNjclwiOlwiXFx1RDgzNVxcdURDQzlcIixcIlRTY3lcIjpcIlxcdTA0MjZcIixcInRzY3lcIjpcIlxcdTA0NDZcIixcIlRTSGN5XCI6XCJcXHUwNDBCXCIsXCJ0c2hjeVwiOlwiXFx1MDQ1QlwiLFwiVHN0cm9rXCI6XCJcXHUwMTY2XCIsXCJ0c3Ryb2tcIjpcIlxcdTAxNjdcIixcInR3aXh0XCI6XCJcXHUyMjZDXCIsXCJ0d29oZWFkbGVmdGFycm93XCI6XCJcXHUyMTlFXCIsXCJ0d29oZWFkcmlnaHRhcnJvd1wiOlwiXFx1MjFBMFwiLFwiVWFjdXRlXCI6XCJcXHUwMERBXCIsXCJ1YWN1dGVcIjpcIlxcdTAwRkFcIixcInVhcnJcIjpcIlxcdTIxOTFcIixcIlVhcnJcIjpcIlxcdTIxOUZcIixcInVBcnJcIjpcIlxcdTIxRDFcIixcIlVhcnJvY2lyXCI6XCJcXHUyOTQ5XCIsXCJVYnJjeVwiOlwiXFx1MDQwRVwiLFwidWJyY3lcIjpcIlxcdTA0NUVcIixcIlVicmV2ZVwiOlwiXFx1MDE2Q1wiLFwidWJyZXZlXCI6XCJcXHUwMTZEXCIsXCJVY2lyY1wiOlwiXFx1MDBEQlwiLFwidWNpcmNcIjpcIlxcdTAwRkJcIixcIlVjeVwiOlwiXFx1MDQyM1wiLFwidWN5XCI6XCJcXHUwNDQzXCIsXCJ1ZGFyclwiOlwiXFx1MjFDNVwiLFwiVWRibGFjXCI6XCJcXHUwMTcwXCIsXCJ1ZGJsYWNcIjpcIlxcdTAxNzFcIixcInVkaGFyXCI6XCJcXHUyOTZFXCIsXCJ1ZmlzaHRcIjpcIlxcdTI5N0VcIixcIlVmclwiOlwiXFx1RDgzNVxcdUREMThcIixcInVmclwiOlwiXFx1RDgzNVxcdUREMzJcIixcIlVncmF2ZVwiOlwiXFx1MDBEOVwiLFwidWdyYXZlXCI6XCJcXHUwMEY5XCIsXCJ1SGFyXCI6XCJcXHUyOTYzXCIsXCJ1aGFybFwiOlwiXFx1MjFCRlwiLFwidWhhcnJcIjpcIlxcdTIxQkVcIixcInVoYmxrXCI6XCJcXHUyNTgwXCIsXCJ1bGNvcm5cIjpcIlxcdTIzMUNcIixcInVsY29ybmVyXCI6XCJcXHUyMzFDXCIsXCJ1bGNyb3BcIjpcIlxcdTIzMEZcIixcInVsdHJpXCI6XCJcXHUyNUY4XCIsXCJVbWFjclwiOlwiXFx1MDE2QVwiLFwidW1hY3JcIjpcIlxcdTAxNkJcIixcInVtbFwiOlwiXFx1MDBBOFwiLFwiVW5kZXJCYXJcIjpcIl9cIixcIlVuZGVyQnJhY2VcIjpcIlxcdTIzREZcIixcIlVuZGVyQnJhY2tldFwiOlwiXFx1MjNCNVwiLFwiVW5kZXJQYXJlbnRoZXNpc1wiOlwiXFx1MjNERFwiLFwiVW5pb25cIjpcIlxcdTIyQzNcIixcIlVuaW9uUGx1c1wiOlwiXFx1MjI4RVwiLFwiVW9nb25cIjpcIlxcdTAxNzJcIixcInVvZ29uXCI6XCJcXHUwMTczXCIsXCJVb3BmXCI6XCJcXHVEODM1XFx1REQ0Q1wiLFwidW9wZlwiOlwiXFx1RDgzNVxcdURENjZcIixcIlVwQXJyb3dCYXJcIjpcIlxcdTI5MTJcIixcInVwYXJyb3dcIjpcIlxcdTIxOTFcIixcIlVwQXJyb3dcIjpcIlxcdTIxOTFcIixcIlVwYXJyb3dcIjpcIlxcdTIxRDFcIixcIlVwQXJyb3dEb3duQXJyb3dcIjpcIlxcdTIxQzVcIixcInVwZG93bmFycm93XCI6XCJcXHUyMTk1XCIsXCJVcERvd25BcnJvd1wiOlwiXFx1MjE5NVwiLFwiVXBkb3duYXJyb3dcIjpcIlxcdTIxRDVcIixcIlVwRXF1aWxpYnJpdW1cIjpcIlxcdTI5NkVcIixcInVwaGFycG9vbmxlZnRcIjpcIlxcdTIxQkZcIixcInVwaGFycG9vbnJpZ2h0XCI6XCJcXHUyMUJFXCIsXCJ1cGx1c1wiOlwiXFx1MjI4RVwiLFwiVXBwZXJMZWZ0QXJyb3dcIjpcIlxcdTIxOTZcIixcIlVwcGVyUmlnaHRBcnJvd1wiOlwiXFx1MjE5N1wiLFwidXBzaVwiOlwiXFx1MDNDNVwiLFwiVXBzaVwiOlwiXFx1MDNEMlwiLFwidXBzaWhcIjpcIlxcdTAzRDJcIixcIlVwc2lsb25cIjpcIlxcdTAzQTVcIixcInVwc2lsb25cIjpcIlxcdTAzQzVcIixcIlVwVGVlQXJyb3dcIjpcIlxcdTIxQTVcIixcIlVwVGVlXCI6XCJcXHUyMkE1XCIsXCJ1cHVwYXJyb3dzXCI6XCJcXHUyMUM4XCIsXCJ1cmNvcm5cIjpcIlxcdTIzMURcIixcInVyY29ybmVyXCI6XCJcXHUyMzFEXCIsXCJ1cmNyb3BcIjpcIlxcdTIzMEVcIixcIlVyaW5nXCI6XCJcXHUwMTZFXCIsXCJ1cmluZ1wiOlwiXFx1MDE2RlwiLFwidXJ0cmlcIjpcIlxcdTI1RjlcIixcIlVzY3JcIjpcIlxcdUQ4MzVcXHVEQ0IwXCIsXCJ1c2NyXCI6XCJcXHVEODM1XFx1RENDQVwiLFwidXRkb3RcIjpcIlxcdTIyRjBcIixcIlV0aWxkZVwiOlwiXFx1MDE2OFwiLFwidXRpbGRlXCI6XCJcXHUwMTY5XCIsXCJ1dHJpXCI6XCJcXHUyNUI1XCIsXCJ1dHJpZlwiOlwiXFx1MjVCNFwiLFwidXVhcnJcIjpcIlxcdTIxQzhcIixcIlV1bWxcIjpcIlxcdTAwRENcIixcInV1bWxcIjpcIlxcdTAwRkNcIixcInV3YW5nbGVcIjpcIlxcdTI5QTdcIixcInZhbmdydFwiOlwiXFx1Mjk5Q1wiLFwidmFyZXBzaWxvblwiOlwiXFx1MDNGNVwiLFwidmFya2FwcGFcIjpcIlxcdTAzRjBcIixcInZhcm5vdGhpbmdcIjpcIlxcdTIyMDVcIixcInZhcnBoaVwiOlwiXFx1MDNENVwiLFwidmFycGlcIjpcIlxcdTAzRDZcIixcInZhcnByb3B0b1wiOlwiXFx1MjIxRFwiLFwidmFyclwiOlwiXFx1MjE5NVwiLFwidkFyclwiOlwiXFx1MjFENVwiLFwidmFycmhvXCI6XCJcXHUwM0YxXCIsXCJ2YXJzaWdtYVwiOlwiXFx1MDNDMlwiLFwidmFyc3Vic2V0bmVxXCI6XCJcXHUyMjhBXFx1RkUwMFwiLFwidmFyc3Vic2V0bmVxcVwiOlwiXFx1MkFDQlxcdUZFMDBcIixcInZhcnN1cHNldG5lcVwiOlwiXFx1MjI4QlxcdUZFMDBcIixcInZhcnN1cHNldG5lcXFcIjpcIlxcdTJBQ0NcXHVGRTAwXCIsXCJ2YXJ0aGV0YVwiOlwiXFx1MDNEMVwiLFwidmFydHJpYW5nbGVsZWZ0XCI6XCJcXHUyMkIyXCIsXCJ2YXJ0cmlhbmdsZXJpZ2h0XCI6XCJcXHUyMkIzXCIsXCJ2QmFyXCI6XCJcXHUyQUU4XCIsXCJWYmFyXCI6XCJcXHUyQUVCXCIsXCJ2QmFydlwiOlwiXFx1MkFFOVwiLFwiVmN5XCI6XCJcXHUwNDEyXCIsXCJ2Y3lcIjpcIlxcdTA0MzJcIixcInZkYXNoXCI6XCJcXHUyMkEyXCIsXCJ2RGFzaFwiOlwiXFx1MjJBOFwiLFwiVmRhc2hcIjpcIlxcdTIyQTlcIixcIlZEYXNoXCI6XCJcXHUyMkFCXCIsXCJWZGFzaGxcIjpcIlxcdTJBRTZcIixcInZlZWJhclwiOlwiXFx1MjJCQlwiLFwidmVlXCI6XCJcXHUyMjI4XCIsXCJWZWVcIjpcIlxcdTIyQzFcIixcInZlZWVxXCI6XCJcXHUyMjVBXCIsXCJ2ZWxsaXBcIjpcIlxcdTIyRUVcIixcInZlcmJhclwiOlwifFwiLFwiVmVyYmFyXCI6XCJcXHUyMDE2XCIsXCJ2ZXJ0XCI6XCJ8XCIsXCJWZXJ0XCI6XCJcXHUyMDE2XCIsXCJWZXJ0aWNhbEJhclwiOlwiXFx1MjIyM1wiLFwiVmVydGljYWxMaW5lXCI6XCJ8XCIsXCJWZXJ0aWNhbFNlcGFyYXRvclwiOlwiXFx1Mjc1OFwiLFwiVmVydGljYWxUaWxkZVwiOlwiXFx1MjI0MFwiLFwiVmVyeVRoaW5TcGFjZVwiOlwiXFx1MjAwQVwiLFwiVmZyXCI6XCJcXHVEODM1XFx1REQxOVwiLFwidmZyXCI6XCJcXHVEODM1XFx1REQzM1wiLFwidmx0cmlcIjpcIlxcdTIyQjJcIixcInZuc3ViXCI6XCJcXHUyMjgyXFx1MjBEMlwiLFwidm5zdXBcIjpcIlxcdTIyODNcXHUyMEQyXCIsXCJWb3BmXCI6XCJcXHVEODM1XFx1REQ0RFwiLFwidm9wZlwiOlwiXFx1RDgzNVxcdURENjdcIixcInZwcm9wXCI6XCJcXHUyMjFEXCIsXCJ2cnRyaVwiOlwiXFx1MjJCM1wiLFwiVnNjclwiOlwiXFx1RDgzNVxcdURDQjFcIixcInZzY3JcIjpcIlxcdUQ4MzVcXHVEQ0NCXCIsXCJ2c3VibkVcIjpcIlxcdTJBQ0JcXHVGRTAwXCIsXCJ2c3VibmVcIjpcIlxcdTIyOEFcXHVGRTAwXCIsXCJ2c3VwbkVcIjpcIlxcdTJBQ0NcXHVGRTAwXCIsXCJ2c3VwbmVcIjpcIlxcdTIyOEJcXHVGRTAwXCIsXCJWdmRhc2hcIjpcIlxcdTIyQUFcIixcInZ6aWd6YWdcIjpcIlxcdTI5OUFcIixcIldjaXJjXCI6XCJcXHUwMTc0XCIsXCJ3Y2lyY1wiOlwiXFx1MDE3NVwiLFwid2VkYmFyXCI6XCJcXHUyQTVGXCIsXCJ3ZWRnZVwiOlwiXFx1MjIyN1wiLFwiV2VkZ2VcIjpcIlxcdTIyQzBcIixcIndlZGdlcVwiOlwiXFx1MjI1OVwiLFwid2VpZXJwXCI6XCJcXHUyMTE4XCIsXCJXZnJcIjpcIlxcdUQ4MzVcXHVERDFBXCIsXCJ3ZnJcIjpcIlxcdUQ4MzVcXHVERDM0XCIsXCJXb3BmXCI6XCJcXHVEODM1XFx1REQ0RVwiLFwid29wZlwiOlwiXFx1RDgzNVxcdURENjhcIixcIndwXCI6XCJcXHUyMTE4XCIsXCJ3clwiOlwiXFx1MjI0MFwiLFwid3JlYXRoXCI6XCJcXHUyMjQwXCIsXCJXc2NyXCI6XCJcXHVEODM1XFx1RENCMlwiLFwid3NjclwiOlwiXFx1RDgzNVxcdURDQ0NcIixcInhjYXBcIjpcIlxcdTIyQzJcIixcInhjaXJjXCI6XCJcXHUyNUVGXCIsXCJ4Y3VwXCI6XCJcXHUyMkMzXCIsXCJ4ZHRyaVwiOlwiXFx1MjVCRFwiLFwiWGZyXCI6XCJcXHVEODM1XFx1REQxQlwiLFwieGZyXCI6XCJcXHVEODM1XFx1REQzNVwiLFwieGhhcnJcIjpcIlxcdTI3RjdcIixcInhoQXJyXCI6XCJcXHUyN0ZBXCIsXCJYaVwiOlwiXFx1MDM5RVwiLFwieGlcIjpcIlxcdTAzQkVcIixcInhsYXJyXCI6XCJcXHUyN0Y1XCIsXCJ4bEFyclwiOlwiXFx1MjdGOFwiLFwieG1hcFwiOlwiXFx1MjdGQ1wiLFwieG5pc1wiOlwiXFx1MjJGQlwiLFwieG9kb3RcIjpcIlxcdTJBMDBcIixcIlhvcGZcIjpcIlxcdUQ4MzVcXHVERDRGXCIsXCJ4b3BmXCI6XCJcXHVEODM1XFx1REQ2OVwiLFwieG9wbHVzXCI6XCJcXHUyQTAxXCIsXCJ4b3RpbWVcIjpcIlxcdTJBMDJcIixcInhyYXJyXCI6XCJcXHUyN0Y2XCIsXCJ4ckFyclwiOlwiXFx1MjdGOVwiLFwiWHNjclwiOlwiXFx1RDgzNVxcdURDQjNcIixcInhzY3JcIjpcIlxcdUQ4MzVcXHVEQ0NEXCIsXCJ4c3FjdXBcIjpcIlxcdTJBMDZcIixcInh1cGx1c1wiOlwiXFx1MkEwNFwiLFwieHV0cmlcIjpcIlxcdTI1QjNcIixcInh2ZWVcIjpcIlxcdTIyQzFcIixcInh3ZWRnZVwiOlwiXFx1MjJDMFwiLFwiWWFjdXRlXCI6XCJcXHUwMEREXCIsXCJ5YWN1dGVcIjpcIlxcdTAwRkRcIixcIllBY3lcIjpcIlxcdTA0MkZcIixcInlhY3lcIjpcIlxcdTA0NEZcIixcIlljaXJjXCI6XCJcXHUwMTc2XCIsXCJ5Y2lyY1wiOlwiXFx1MDE3N1wiLFwiWWN5XCI6XCJcXHUwNDJCXCIsXCJ5Y3lcIjpcIlxcdTA0NEJcIixcInllblwiOlwiXFx1MDBBNVwiLFwiWWZyXCI6XCJcXHVEODM1XFx1REQxQ1wiLFwieWZyXCI6XCJcXHVEODM1XFx1REQzNlwiLFwiWUljeVwiOlwiXFx1MDQwN1wiLFwieWljeVwiOlwiXFx1MDQ1N1wiLFwiWW9wZlwiOlwiXFx1RDgzNVxcdURENTBcIixcInlvcGZcIjpcIlxcdUQ4MzVcXHVERDZBXCIsXCJZc2NyXCI6XCJcXHVEODM1XFx1RENCNFwiLFwieXNjclwiOlwiXFx1RDgzNVxcdURDQ0VcIixcIllVY3lcIjpcIlxcdTA0MkVcIixcInl1Y3lcIjpcIlxcdTA0NEVcIixcInl1bWxcIjpcIlxcdTAwRkZcIixcIll1bWxcIjpcIlxcdTAxNzhcIixcIlphY3V0ZVwiOlwiXFx1MDE3OVwiLFwiemFjdXRlXCI6XCJcXHUwMTdBXCIsXCJaY2Fyb25cIjpcIlxcdTAxN0RcIixcInpjYXJvblwiOlwiXFx1MDE3RVwiLFwiWmN5XCI6XCJcXHUwNDE3XCIsXCJ6Y3lcIjpcIlxcdTA0MzdcIixcIlpkb3RcIjpcIlxcdTAxN0JcIixcInpkb3RcIjpcIlxcdTAxN0NcIixcInplZXRyZlwiOlwiXFx1MjEyOFwiLFwiWmVyb1dpZHRoU3BhY2VcIjpcIlxcdTIwMEJcIixcIlpldGFcIjpcIlxcdTAzOTZcIixcInpldGFcIjpcIlxcdTAzQjZcIixcInpmclwiOlwiXFx1RDgzNVxcdUREMzdcIixcIlpmclwiOlwiXFx1MjEyOFwiLFwiWkhjeVwiOlwiXFx1MDQxNlwiLFwiemhjeVwiOlwiXFx1MDQzNlwiLFwiemlncmFyclwiOlwiXFx1MjFERFwiLFwiem9wZlwiOlwiXFx1RDgzNVxcdURENkJcIixcIlpvcGZcIjpcIlxcdTIxMjRcIixcIlpzY3JcIjpcIlxcdUQ4MzVcXHVEQ0I1XCIsXCJ6c2NyXCI6XCJcXHVEODM1XFx1RENDRlwiLFwiendqXCI6XCJcXHUyMDBEXCIsXCJ6d25qXCI6XCJcXHUyMDBDXCJ9IiwibW9kdWxlLmV4cG9ydHM9e1wiQWFjdXRlXCI6XCJcXHUwMEMxXCIsXCJhYWN1dGVcIjpcIlxcdTAwRTFcIixcIkFjaXJjXCI6XCJcXHUwMEMyXCIsXCJhY2lyY1wiOlwiXFx1MDBFMlwiLFwiYWN1dGVcIjpcIlxcdTAwQjRcIixcIkFFbGlnXCI6XCJcXHUwMEM2XCIsXCJhZWxpZ1wiOlwiXFx1MDBFNlwiLFwiQWdyYXZlXCI6XCJcXHUwMEMwXCIsXCJhZ3JhdmVcIjpcIlxcdTAwRTBcIixcImFtcFwiOlwiJlwiLFwiQU1QXCI6XCImXCIsXCJBcmluZ1wiOlwiXFx1MDBDNVwiLFwiYXJpbmdcIjpcIlxcdTAwRTVcIixcIkF0aWxkZVwiOlwiXFx1MDBDM1wiLFwiYXRpbGRlXCI6XCJcXHUwMEUzXCIsXCJBdW1sXCI6XCJcXHUwMEM0XCIsXCJhdW1sXCI6XCJcXHUwMEU0XCIsXCJicnZiYXJcIjpcIlxcdTAwQTZcIixcIkNjZWRpbFwiOlwiXFx1MDBDN1wiLFwiY2NlZGlsXCI6XCJcXHUwMEU3XCIsXCJjZWRpbFwiOlwiXFx1MDBCOFwiLFwiY2VudFwiOlwiXFx1MDBBMlwiLFwiY29weVwiOlwiXFx1MDBBOVwiLFwiQ09QWVwiOlwiXFx1MDBBOVwiLFwiY3VycmVuXCI6XCJcXHUwMEE0XCIsXCJkZWdcIjpcIlxcdTAwQjBcIixcImRpdmlkZVwiOlwiXFx1MDBGN1wiLFwiRWFjdXRlXCI6XCJcXHUwMEM5XCIsXCJlYWN1dGVcIjpcIlxcdTAwRTlcIixcIkVjaXJjXCI6XCJcXHUwMENBXCIsXCJlY2lyY1wiOlwiXFx1MDBFQVwiLFwiRWdyYXZlXCI6XCJcXHUwMEM4XCIsXCJlZ3JhdmVcIjpcIlxcdTAwRThcIixcIkVUSFwiOlwiXFx1MDBEMFwiLFwiZXRoXCI6XCJcXHUwMEYwXCIsXCJFdW1sXCI6XCJcXHUwMENCXCIsXCJldW1sXCI6XCJcXHUwMEVCXCIsXCJmcmFjMTJcIjpcIlxcdTAwQkRcIixcImZyYWMxNFwiOlwiXFx1MDBCQ1wiLFwiZnJhYzM0XCI6XCJcXHUwMEJFXCIsXCJndFwiOlwiPlwiLFwiR1RcIjpcIj5cIixcIklhY3V0ZVwiOlwiXFx1MDBDRFwiLFwiaWFjdXRlXCI6XCJcXHUwMEVEXCIsXCJJY2lyY1wiOlwiXFx1MDBDRVwiLFwiaWNpcmNcIjpcIlxcdTAwRUVcIixcImlleGNsXCI6XCJcXHUwMEExXCIsXCJJZ3JhdmVcIjpcIlxcdTAwQ0NcIixcImlncmF2ZVwiOlwiXFx1MDBFQ1wiLFwiaXF1ZXN0XCI6XCJcXHUwMEJGXCIsXCJJdW1sXCI6XCJcXHUwMENGXCIsXCJpdW1sXCI6XCJcXHUwMEVGXCIsXCJsYXF1b1wiOlwiXFx1MDBBQlwiLFwibHRcIjpcIjxcIixcIkxUXCI6XCI8XCIsXCJtYWNyXCI6XCJcXHUwMEFGXCIsXCJtaWNyb1wiOlwiXFx1MDBCNVwiLFwibWlkZG90XCI6XCJcXHUwMEI3XCIsXCJuYnNwXCI6XCJcXHUwMEEwXCIsXCJub3RcIjpcIlxcdTAwQUNcIixcIk50aWxkZVwiOlwiXFx1MDBEMVwiLFwibnRpbGRlXCI6XCJcXHUwMEYxXCIsXCJPYWN1dGVcIjpcIlxcdTAwRDNcIixcIm9hY3V0ZVwiOlwiXFx1MDBGM1wiLFwiT2NpcmNcIjpcIlxcdTAwRDRcIixcIm9jaXJjXCI6XCJcXHUwMEY0XCIsXCJPZ3JhdmVcIjpcIlxcdTAwRDJcIixcIm9ncmF2ZVwiOlwiXFx1MDBGMlwiLFwib3JkZlwiOlwiXFx1MDBBQVwiLFwib3JkbVwiOlwiXFx1MDBCQVwiLFwiT3NsYXNoXCI6XCJcXHUwMEQ4XCIsXCJvc2xhc2hcIjpcIlxcdTAwRjhcIixcIk90aWxkZVwiOlwiXFx1MDBENVwiLFwib3RpbGRlXCI6XCJcXHUwMEY1XCIsXCJPdW1sXCI6XCJcXHUwMEQ2XCIsXCJvdW1sXCI6XCJcXHUwMEY2XCIsXCJwYXJhXCI6XCJcXHUwMEI2XCIsXCJwbHVzbW5cIjpcIlxcdTAwQjFcIixcInBvdW5kXCI6XCJcXHUwMEEzXCIsXCJxdW90XCI6XCJcXFwiXCIsXCJRVU9UXCI6XCJcXFwiXCIsXCJyYXF1b1wiOlwiXFx1MDBCQlwiLFwicmVnXCI6XCJcXHUwMEFFXCIsXCJSRUdcIjpcIlxcdTAwQUVcIixcInNlY3RcIjpcIlxcdTAwQTdcIixcInNoeVwiOlwiXFx1MDBBRFwiLFwic3VwMVwiOlwiXFx1MDBCOVwiLFwic3VwMlwiOlwiXFx1MDBCMlwiLFwic3VwM1wiOlwiXFx1MDBCM1wiLFwic3psaWdcIjpcIlxcdTAwREZcIixcIlRIT1JOXCI6XCJcXHUwMERFXCIsXCJ0aG9yblwiOlwiXFx1MDBGRVwiLFwidGltZXNcIjpcIlxcdTAwRDdcIixcIlVhY3V0ZVwiOlwiXFx1MDBEQVwiLFwidWFjdXRlXCI6XCJcXHUwMEZBXCIsXCJVY2lyY1wiOlwiXFx1MDBEQlwiLFwidWNpcmNcIjpcIlxcdTAwRkJcIixcIlVncmF2ZVwiOlwiXFx1MDBEOVwiLFwidWdyYXZlXCI6XCJcXHUwMEY5XCIsXCJ1bWxcIjpcIlxcdTAwQThcIixcIlV1bWxcIjpcIlxcdTAwRENcIixcInV1bWxcIjpcIlxcdTAwRkNcIixcIllhY3V0ZVwiOlwiXFx1MDBERFwiLFwieWFjdXRlXCI6XCJcXHUwMEZEXCIsXCJ5ZW5cIjpcIlxcdTAwQTVcIixcInl1bWxcIjpcIlxcdTAwRkZcIn0iLCJtb2R1bGUuZXhwb3J0cz17XCJhbXBcIjpcIiZcIixcImFwb3NcIjpcIidcIixcImd0XCI6XCI+XCIsXCJsdFwiOlwiPFwiLFwicXVvdFwiOlwiXFxcIlwifVxuIiwidmFyIGJhc2UgICAgICAgPSByZXF1aXJlKCcuL2xpYi9iYXNlJyk7XG52YXIgU2FmZVN0cmluZyA9IHJlcXVpcmUoJy4vbGliL3NhZmUtc3RyaW5nJyk7XG52YXIgRXhjZXB0aW9uICA9IHJlcXVpcmUoJy4vbGliL2V4Y2VwdGlvbicpO1xudmFyIFV0aWxzICAgICAgPSByZXF1aXJlKCcuL2xpYi91dGlscycpO1xudmFyIEV2ZW50cyAgICAgPSByZXF1aXJlKCcuL2xpYi9ldmVudHMnKTtcbnZhciBydW50aW1lICAgID0gcmVxdWlyZSgnLi9saWIvcnVudGltZScpO1xuXG4vLyBFeHRlbmQgdGhlIERPTUJhcnMgcHJvdG90eXBlIHdpdGggZXZlbnQgZW1pdHRlciBmdW5jdGlvbmFsaXR5LlxuVXRpbHMuZXh0ZW5kKGJhc2UuRE9NQmFyc0Vudmlyb25tZW50LnByb3RvdHlwZSwgRXZlbnRzKTtcblxubW9kdWxlLmV4cG9ydHMgPSAoZnVuY3Rpb24gY3JlYXRlICgpIHtcbiAgdmFyIGRiID0gbmV3IGJhc2UuRE9NQmFyc0Vudmlyb25tZW50KCk7XG5cbiAgVXRpbHMuZXh0ZW5kKGRiLCBiYXNlKTtcbiAgZGIuVk0gICAgICAgICA9IHJ1bnRpbWU7XG4gIGRiLlV0aWxzICAgICAgPSBVdGlscztcbiAgZGIuY3JlYXRlICAgICA9IGNyZWF0ZTtcbiAgZGIuRXhjZXB0aW9uICA9IEV4Y2VwdGlvbjtcbiAgZGIuU2FmZVN0cmluZyA9IFNhZmVTdHJpbmc7XG5cbiAgZGIudGVtcGxhdGUgPSBmdW5jdGlvbiAoc3BlYykge1xuICAgIHJldHVybiBydW50aW1lLnRlbXBsYXRlKHNwZWMsIGRiKTtcbiAgfTtcblxuICByZXR1cm4gZGI7XG59KSgpO1xuIl19
(1)
});
