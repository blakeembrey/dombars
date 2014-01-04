!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.DOMBars=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

  // References to the current subscription execution.
  options.push('update: self.subscription.boundUpdate');
  options.push('unsubscribe: self.subscription.boundUnsubscription');

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
var Utils = require('./utils');

/**
 * Events object mixin. Created to keep the runtime size down since including
 * the node event emitter is a huge dependency.
 *
 * @type {Object}
 */
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

  // Using the `on` functionality we can create a `once` function.
  this.on(name, function self () {
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
  // Delete all event listeners when no arguments are passed in.
  if (arguments.length === 0) {
    return delete this._events;
  }

  // Delete an entire event namespace when only the name is passed in.
  if (arguments.length === 1) {
    return delete this._events[name];
  }

  // If the namespace does not exist, return early.
  if (!this._events || !this._events[name]) {
    return;
  }

  // Iterate over the event namespace and delete listeners where the function
  // identities and optional context matches.
  var events = this._events[name];
  for (var i = 0; i < events.length; i++) {
    if (events[i].fn === fn) {
      if (arguments.length === 2 || events[i].context === context) {
        events.splice(i, 1);
        i--;
      }
    }
  }

  // Remove empty namespaces.
  if (!events.length) {
    delete this._events[name];
  }
};

/**
 * Emit an event.
 *
 * @param  {String} name
 * @param  {*}      ...
 * @return {Events}
 */
Events.emit = Utils.variadic(function (name, args) {
  if (!this._events || !this._events[name]) { return; }

  // Create a replicated array of the event namespace so unsubscribing within
  // calls (E.g. `off`) doesn't break the iteration.
  var events = this._events[name].slice();

  for (var i = 0; i < events.length; i++) {
    events[i].fn.apply(events[i].context, args);
  }
});

},{"./utils":16}],11:[function(require,module,exports){
module.exports = require('handlebars/dist/cjs/handlebars/exception').default;

},{"handlebars/dist/cjs/handlebars/exception":28}],12:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};var currentTime = global.Date.now || (function () {
  var Constuctor = global.Date;

  return function () {
    return new Constuctor().getTime();
  };
})();


var setTimer   = global.setTimeout;
var clearTimer = global.clearTimeout;

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
exports = module.exports = global.requestAnimationFrame ||
  global.webkitRequestAnimationFrame ||
  global.mozRequestAnimationFrame ||
  global.msRequestAnimationFrame ||
  global.oRequestAnimationFrame ||
  fallback();

/**
 * Cancel the animation frame.
 *
 * @type {Function}
 */
var cancel = global.cancelAnimationFrame ||
  global.webkitCancelAnimationFrame ||
  global.mozCancelAnimationFrame ||
  global.msCancelAnimationFrame ||
  global.oCancelAnimationFrame ||
  clearTimer;

/**
 * Cancel an animation frame.
 *
 * @param {Number} id
 */
exports.cancel = function (id) {
  cancel.call(global, id);
};

},{}],13:[function(require,module,exports){
var hbsVM = require('handlebars/dist/cjs/handlebars/runtime');
var Utils = require('./utils');
var raf   = require('./raf');

/**
 * Keep a map of attributes that need to update the corresponding properties.
 *
 * @type {Object}
 */
var attrProps = {
  INPUT: {
    value:   'value',
    checked: 'checked'
  },
  OPTION: {
    selected: 'selected'
  }
};

/**
 * Iterate over a subscriptions object, calling a function with the object
 * property details and a unique callback function.
 *
 * @param {Array}    subscriptions
 * @param {Function} fn
 * @param {Function} callback
 */
var iterateSubscriptions = function (subscriptions, fn, context) {
  for (var id in subscriptions) {
    for (var property in subscriptions[id]) {
      fn.call(context, subscriptions[id][property], property, id);
    }
  }
};

/**
 * Create a new subsciption instance. This functionality is tightly coupled to
 * DOMBars program execution.
 *
 * @param {Function} fn
 * @param {Function} update
 * @param {Object}   container
 * @param {Object}   env
 */
var Subscription = function (fn, update, container, env) {
  // Alias passed in variables for later access.
  this._fn        = fn;
  this._update    = update;
  this._container = container;
  this._env       = env;

  // Assign every subscription instance a unique id. This helps with linking
  // between parent and child subscription instances.
  this.cid             = 'c' + Utils.uniqueId();
  this.children        = {};
  this.subscriptions   = {};
  this.unsubscriptions = [];

  // Create statically bound function instances for public consumption.
  this.boundUpdate         = Utils.bind(this.update, this);
  this.boundUnsubscription = Utils.bind(this.unsubscription, this);
};

/**
 * Expose the internal susbcribe functionality for the container.
 *
 * @param {Object} object
 * @param {String} property
 * @param {String} id
 */
Subscription.prototype.subscribe = function (object, property, id) {
  (this.subscriptions[id] || (this.subscriptions[id] = {}))[property] = object;
};

/**
 * Pass a custom unsubscription function that will execute when we unsubscribe.
 *
 * @param {Function} fn
 */
Subscription.prototype.unsubscription = function (fn) {
  Utils.isFunction(fn) && this.unsubscriptions.push(fn);
};

/**
 * Unsubscribe from a subcriptions object.
 *
 * @param {Object} subscriptions
 */
Subscription.prototype._unsubscribe = function (subscriptions) {
  iterateSubscriptions(subscriptions, function (object, property, id) {
    delete subscriptions[id][property];
    this._env.unsubscribe(object, property, this.boundUpdate);
  }, this);
};

/**
 * Iterate over an array of unsubscriptions.
 *
 * @param {Array} unsubscriptions
 */
Subscription.prototype._unsubscription = function (unsubscriptions) {
  for (var i = 0; i < unsubscriptions.length; i++) {
    unsubscriptions[i]();
  }
};

/**
 * Unsubscribe everything from the current instance.
 */
Subscription.prototype.unsubscribe = function () {
  this._unsubscribe(this.subscriptions);
  this._unsubscription(this.unsubscriptions);

  // Delete any reference to this subscription from the parent.
  if (this.parent) {
    delete this.parent.children[this.cid];
    delete this.parent;
  }

  // Cancel any currently executing functions. We also need to set an
  // unsubscribed flag in case the function is still available somewhere and
  // called after unsubscription has occured.
  VM.exec.cancel(this._execId);
  this._unsubscribed = true;
  this._unsubscribeChildren();

  // Remove unwanted lingering references.
  delete this.children;
  delete this.subscriptions;
  delete this.unsubscriptions;
  delete this._fn;
  delete this._env;
  delete this._update;
  delete this._container;
  delete this.boundUpdate;
  delete this.boundUnsubscription;
};

/**
 * Unsubscribe the current instance children.
 */
Subscription.prototype._unsubscribeChildren = function () {
  for (var child in this.children) {
    this.children[child].unsubscribe();
  }
};

/**
 * Execute the subscription function.
 *
 * @return {*}
 */
Subscription.prototype.execute = function () {
  // If we have an existing subscription, link the subscriptions together.
  if (this._container.subscription) {
    this.parent = this._container.subscription;
    this.parent.children[this.cid] = this;
  }

  // Alias the current subscriptions object for diffing after execution.
  this._subscriptions = this.subscriptions;
  this._unsubscription(this.unsubscriptions);

  // Reset the subscriptions and unsubscriptions objects before execution.
  this.subscriptions   = {};
  this.unsubscriptions = [];

  this._container.subscription = this;
  var result = this._fn.apply(this, arguments);
  this._container.subscription = this.parent;

  // The current subscriptions object needs to be compared against the previous
  // subscriptions and any diffences fixed.
  var current  = this.subscriptions;
  var previous = this._subscriptions;

  // Iterate over the new subscriptions object. Check every key in the object
  // against the previous subscriptions. If it exists in the previous object,
  // it means we are already subscribed. Otherwise we need to subscribe to
  // the new property.
  iterateSubscriptions(current, function (object, property, id) {
    if (previous[id] && previous[id][property]) {
      return delete previous[id][property];
    }

    this._env.subscribe(object, property, this.boundUpdate);
  }, this);

  // Iterate over all remaining previous subscriptions and unsubscribe them.
  delete this._subscriptions;
  this._unsubscribe(previous);

  return result;
};

/**
 * Update the susbcription instance with changes.
 *
 * @return {Boolean}
 */
Subscription.prototype.update = function () {
  if (this._triggered || this._unsubscribed) {
    return false;
  }

  // Block triggers from occuring between animation frames.
  this._triggered = true;
  this._unsubscribeChildren();

  this._execId = VM.exec(Utils.bind(function () {
    delete this._triggered;
    this._update(this.execute());
  }, this));

  return true;
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
  return raf(fn);
};

/**
 * Cancel an execution.
 *
 * @param {Number} id
 */
VM.exec.cancel = function (id) {
  return raf.cancel(id);
};

/**
 * Create an element from a tag name.
 *
 * @param  {String} tagName
 * @param  {Object} env
 * @return {Node}
 */
VM.createElement = function (tagName, env) {
  var node = document.createElement(tagName);
  env.emit('createElement', node);
  return node;
};

/**
 * Copy all the data from one element to another and replace in place.
 *
 * @param  {Node}   node
 * @param  {String} tagName
 * @param  {Object} env
 * @return {Node}
 */
VM.setTagName = function (node, tagName, env) {
  var newNode = VM.createElement(tagName, env);

  // Move all child elements to the new node.
  while (node.firstChild) {
    newNode.appendChild(node.firstChild);
  }

  // Copy all the attributes to the new node.
  for (var i = 0; i < node.attributes.length; i++) {
    var attribute = node.attributes[i];
    VM.setAttribute(newNode, attribute.name, attribute.value, env);
  }

  // Replace the node position in the place.
  node.parentNode.replaceChild(newNode, node);

  return newNode;
};

/**
 * Remove an attribute from an element.
 *
 * @param {Node}   el
 * @param {String} name
 * @param {Object} env
 */
VM.removeAttribute = function (el, name, env) {
  if (!el.hasAttribute(name)) { return; }

  env.emit('removeAttribute', el, name);
  el.removeAttribute(name);

  // Unset the DOM property when the attribute is removed.
  if (attrProps[el.tagName] && attrProps[el.tagName][name]) {
    el[attrProps[el.tagName][name]] = null;
  }
};

/**
 * Set an attribute value on an element.
 *
 * @param {Node}   el
 * @param {String} name
 * @param {*}      value
 * @param {Object} env
 */
VM.setAttribute = function (el, name, value, env) {
  if (value === false) {
    return VM.removeAttribute(el, name, env);
  }

  env.emit('setAttribute', el, name, value);
  el.setAttribute(name, value);

  // Update the DOM property when the attribute changes.
  if (attrProps[el.tagName] && attrProps[el.tagName][name]) {
    el[attrProps[el.tagName][name]] = value;
  }
};

/**
 * Create a comment node based on text contents.
 *
 * @param  {String} contents
 * @param  {Object} env
 * @return {Node}
 */
VM.createComment = function (tagName, env) {
  var node = document.createComment(tagName);
  env.emit('createComment', node);
  return node;
};

/**
 * Generate an executable template from a template spec.
 *
 * @param  {Object}   templateSpec
 * @return {Function}
 */
VM.template = function (templateSpec, env) {
  /**
   * Subscriber to function in the DOMBars execution instance.
   *
   * @param  {Function} fn
   * @param  {Function} create
   * @param  {Function} update
   * @return {Object}
   */
  var subscribe = function (fn, create, update) {
    var subscriber = new Subscription(fn, update, container, env);

    // Immediately alias the starting value.
    subscriber.value = subscriber.execute();
    Utils.isFunction(create) && (subscriber.value = create(subscriber.value));

    return subscriber;
  };

  /**
   * Wrap a function with a sanitized public subscriber object.
   *
   * @param  {Function} fn
   * @return {Function}
   */
  var wrapProgram = function (fn) {
    var wrapper = function () {
      var subscriber = new Subscription(fn, null, container, env);

      return {
        value:       subscriber.execute.apply(subscriber, arguments),
        unsubscribe: Utils.bind(subscriber.unsubscribe, subscriber)
      };
    };

    // Extend the wrapper function with properties of the passed in function.
    Utils.extend(wrapper, fn);

    return wrapper;
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
    wrapProgram:      wrapProgram,
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
    return subscribe(fn, function (value) {
      return Utils.trackNode(create(value));
    }, function (value) {
      this.value.replace(create(value));
    }).value.fragment;
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
    return subscribe(fn, function (value) {
      return VM.createElement(value, env);
    }, function (value) {
      cb(this.value = VM.setTagName(this.value, value, env));
    }).value;
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
   * @param {Function} currentEl
   * @param {Function} nameFn
   * @param {Function} valueFn
   */
  container.setAttribute = function (currentEl, nameFn, valueFn) {
    var attrName = subscribe(nameFn, null, function (value) {
      VM.removeAttribute(currentEl(), this.value, env);
      VM.setAttribute(currentEl(), this.value = value, attrValue.value, env);
    });

    var attrValue = subscribe(valueFn, null, function (value) {
      VM.setAttribute(currentEl(), attrName.value, this.value = value, env);
    });

    return VM.setAttribute(currentEl(), attrName.value, attrValue.value, env);
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
    return subscribe(fn, function (value) {
      return VM.createComment(value, env);
    }, function (value) {
      this.value.textContent = value;
    }).value;
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
    container.subscription.subscribe(object, property, id);
    return env.get(object, property);
  };

  /**
   * Return the compiled JavaScript function for execution.
   *
   * @param  {Object} context
   * @param  {Object} options
   * @return {Node}
   */
  return wrapProgram(function (context, options) {
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
 * Create a function that accepts an unlimited number of arguments as the last
 * argument.
 *
 * @param  {Function} fn
 * @return {Function}
 */
Utils.variadic = function (fn) {
  var count = Math.max(fn.length - 1, 0);

  return function () {
    var args = __slice.call(arguments, 0, count);

    // Enforce the array length, in case we didn't have enough arguments.
    args.length = count;
    args.push(__slice.call(arguments, count));

    return fn.apply(this, args);
  };
};

/**
 * Simple partial application function.
 *
 * @param  {Function} fn
 * @param  {*}        ...
 * @return {Function}
 */
Utils.partial = Utils.variadic(function (fn, args) {
  return Utils.variadic(function (called) {
    return fn.apply(this, args.concat(called));
  });
});

/**
 * Bind a function to a certain context.
 *
 * @param  {Function} fn
 * @param  {Object}   context
 * @param  {*}        ...
 * @return {Function}
 */
Utils.bind = Utils.variadic(function (fn, context, args) {
  return Utils.variadic(function (called) {
    return fn.apply(context, args.concat(called));
  });
});

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

var VERSION = "1.2.1";
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
  if(!JavaScriptCompiler.RESERVED_WORDS[name] && /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(name)) {
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
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvZ3J1bnQtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvZG9tYmFycy5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi9iYXNlLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbGliL2NvbXBpbGVyL2FzdC5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi9jb21waWxlci9hdHRyaWJ1dGUtY29tcGlsZXIuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvY29tcGlsZXIvYmFzZS5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi9jb21waWxlci9jb21tb24tY29tcGlsZXIuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvY29tcGlsZXIvY29tcGlsZXIuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvY29tcGlsZXIvamF2YXNjcmlwdC1jb21waWxlci5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi9jb21waWxlci9wYXJzZXIuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvZXZlbnRzLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbGliL2V4Y2VwdGlvbi5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi9yYWYuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvcnVudGltZS5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi9zYWZlLXN0cmluZy5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi90cmFjay1ub2RlLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbGliL3V0aWxzLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2dydW50LWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2V2ZW50cy9ldmVudHMuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvZ3J1bnQtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvaW5oZXJpdHMvaW5oZXJpdHNfYnJvd3Nlci5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9pbnNlcnQtbW9kdWxlLWdsb2JhbHMvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy91dGlsL3N1cHBvcnQvaXNCdWZmZXJCcm93c2VyLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2dydW50LWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3V0aWwvdXRpbC5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvYmFzZS5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvY29tcGlsZXIvYXN0LmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9jb21waWxlci9iYXNlLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9jb21waWxlci9jb21waWxlci5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvY29tcGlsZXIvamF2YXNjcmlwdC1jb21waWxlci5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvY29tcGlsZXIvcGFyc2VyLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9leGNlcHRpb24uanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL3J1bnRpbWUuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL3NhZmUtc3RyaW5nLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy91dGlscy5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9odG1scGFyc2VyMi9saWIvUGFyc2VyLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2h0bWxwYXJzZXIyL2xpYi9Ub2tlbml6ZXIuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvaHRtbHBhcnNlcjIvbGliL2VudGl0aWVzL2RlY29kZS5qc29uIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2h0bWxwYXJzZXIyL2xpYi9lbnRpdGllcy9lbnRpdGllcy5qc29uIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2h0bWxwYXJzZXIyL2xpYi9lbnRpdGllcy9sZWdhY3kuanNvbiIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9odG1scGFyc2VyMi9saWIvZW50aXRpZXMveG1sLmpzb24iLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ydW50aW1lLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0R0E7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL2tCQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFrQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25MQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuZUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1MkJBO0FBQ0E7O0FDREE7O0FDQUE7O0FDQUE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBET01CYXJzICAgICAgICAgICAgPSByZXF1aXJlKCcuL3J1bnRpbWUnKTtcbnZhciBBU1QgICAgICAgICAgICAgICAgPSByZXF1aXJlKCcuL2xpYi9jb21waWxlci9hc3QnKTtcbnZhciBiYXNlICAgICAgICAgICAgICAgPSByZXF1aXJlKCcuL2xpYi9jb21waWxlci9iYXNlJyk7XG52YXIgQ29tcGlsZXIgICAgICAgICAgID0gcmVxdWlyZSgnLi9saWIvY29tcGlsZXIvY29tcGlsZXInKTtcbnZhciBKYXZhU2NyaXB0Q29tcGlsZXIgPSByZXF1aXJlKCcuL2xpYi9jb21waWxlci9qYXZhc2NyaXB0LWNvbXBpbGVyJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uIGNyZWF0ZSAoKSB7XG4gIHZhciBkYiA9IERPTUJhcnMuY3JlYXRlKCk7XG5cbiAgZGIuY29tcGlsZSA9IGZ1bmN0aW9uIChpbnB1dCwgb3B0aW9ucykge1xuICAgIHJldHVybiBDb21waWxlci5jb21waWxlKGlucHV0LCBvcHRpb25zLCBkYik7XG4gIH07XG5cbiAgZGIuY3JlYXRlICAgICAgICAgICAgID0gY3JlYXRlO1xuICBkYi5wcmVjb21waWxlICAgICAgICAgPSBDb21waWxlci5wcmVjb21waWxlO1xuICBkYi5BU1QgICAgICAgICAgICAgICAgPSBBU1Q7XG4gIGRiLkNvbXBpbGVyICAgICAgICAgICA9IENvbXBpbGVyLkNvbXBpbGVyO1xuICBkYi5KYXZhU2NyaXB0Q29tcGlsZXIgPSBKYXZhU2NyaXB0Q29tcGlsZXI7XG4gIGRiLnBhcnNlICAgICAgICAgICAgICA9IGJhc2UucGFyc2U7XG4gIGRiLlBhcnNlciAgICAgICAgICAgICA9IGJhc2UucGFyc2VyO1xuXG4gIHJldHVybiBkYjtcbn0pKCk7XG4iLCJ2YXIgaGJzQmFzZSAgICAgICAgICAgICAgID0gcmVxdWlyZSgnaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL2Jhc2UnKTtcbnZhciBVdGlscyAgICAgICAgICAgICAgICAgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG52YXIgSGFuZGxlYmFyc0Vudmlyb25tZW50ID0gaGJzQmFzZS5IYW5kbGViYXJzRW52aXJvbm1lbnQ7XG5cbi8qKlxuICogRXh0ZW5kIEhhbmRsZWJhcnMgYmFzZSBvYmplY3Qgd2l0aCBjdXN0b20gZnVuY3Rpb25hbGl0eS5cbiAqXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG52YXIgYmFzZSA9IG1vZHVsZS5leHBvcnRzID0gVXRpbHMuY3JlYXRlKGhic0Jhc2UpO1xuXG4vKipcbiAqIFdyYXAgb2xkLXN0eWxlIEhhbmRsZWJhcnMgaGVscGVycyB3aXRoIHRoZSB1cGRhdGVkIG9iamVjdCBzeW50YXggcmV0dXJuLlxuICpcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBoZWxwZXJcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICovXG52YXIgd3JhcE9sZEhlbHBlciA9IGZ1bmN0aW9uIChoZWxwZXIpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcmVzdWx0ID0gaGVscGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgICAvLyBOZWVkIGEgc3BlY2lhbCBoYW5kbGVyIGZvciB0aGUgYHdpdGhgIGhlbHBlciB3aGljaCB3b24ndCBhbHdheXMgZXhlY3V0ZS5cbiAgICByZXR1cm4gcmVzdWx0ID09IG51bGwgPyByZXN1bHQgOiByZXN1bHQudmFsdWU7XG4gIH07XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVyIERPTUJhcnMgaGVscGVycyBvbiB0aGUgcGFzc2VkIGluIERPTUJhcnMgaW5zdGFuY2UuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGluc3RhbmNlXG4gKi9cbnZhciByZWdpc3RlckRlZmF1bHRIZWxwZXJzID0gZnVuY3Rpb24gKGluc3RhbmNlKSB7XG4gIC8qKlxuICAgKiBUaGUgaGFuZGxlYmFycyBgZWFjaGAgaGVscGVyIGlzIGluY29tcGF0aWJhYmxlIHdpdGggRE9NQmFycywgc2luY2UgaXRcbiAgICogYXNzdW1lcyBzdHJpbmcgY29uY2F0aW5hdGlvbiAoYXMgb3Bwb3NlZCB0byBkb2N1bWVudCBmcmFnbWVudHMpLlxuICAgKlxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGNvbnRleHRcbiAgICogQHBhcmFtICB7T2JqZWN0fSBvcHRpb25zXG4gICAqIEByZXR1cm4ge05vZGV9XG4gICAqL1xuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignZWFjaCcsIGZ1bmN0aW9uIChjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgdmFyIGZuICAgICAgID0gb3B0aW9ucy5mbjtcbiAgICB2YXIgaW52ZXJzZSAgPSBvcHRpb25zLmludmVyc2U7XG4gICAgdmFyIGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgIHZhciBpICAgICAgICA9IDA7XG4gICAgdmFyIGRhdGE7XG5cbiAgICBpZiAodHlwZW9mIGNvbnRleHQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMuZGF0YSkge1xuICAgICAgZGF0YSA9IFV0aWxzLmNyZWF0ZShvcHRpb25zLmRhdGEpO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgY29udGV4dCA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHZhciBsZW4gPSBjb250ZXh0Lmxlbmd0aDtcblxuICAgICAgaWYgKGxlbiA9PT0gK2xlbikge1xuICAgICAgICBmb3IgKDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgZGF0YS5pbmRleCA9IGk7XG4gICAgICAgICAgZGF0YS5maXJzdCA9IChpID09PSAwKTtcbiAgICAgICAgICBkYXRhLmxhc3QgID0gKGkgPT09IGxlbiAtIDEpO1xuXG4gICAgICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQoZm4oY29udGV4dFtpXSwgeyBkYXRhOiBkYXRhIH0pLnZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIGNvbnRleHQpIHtcbiAgICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGNvbnRleHQsIGtleSkpIHtcbiAgICAgICAgICAgIGkgKz0gMTtcblxuICAgICAgICAgICAgZGF0YS5rZXkgICA9IGtleTtcbiAgICAgICAgICAgIGRhdGEuaW5kZXggPSBpO1xuICAgICAgICAgICAgZGF0YS5maXJzdCA9IChpID09PSAwKTtcblxuICAgICAgICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQoZm4oY29udGV4dFtrZXldLCB7IGRhdGE6IGRhdGEgfSkudmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChpID09PSAwKSB7XG4gICAgICByZXR1cm4gaW52ZXJzZSh0aGlzKS52YWx1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnJhZ21lbnQ7XG4gIH0pO1xuXG4gIC8vIFJlZ2lzdGVyIHVwZGF0ZWQgSGFuZGxlYmFycyBoZWxwZXJzLlxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcih7XG4gICAgJ2lmJzogICAgICAgICAgICAgICAgIHdyYXBPbGRIZWxwZXIoaW5zdGFuY2UuaGVscGVycy5pZiksXG4gICAgJ3dpdGgnOiAgICAgICAgICAgICAgIHdyYXBPbGRIZWxwZXIoaW5zdGFuY2UuaGVscGVycy53aXRoKSxcbiAgICAnYmxvY2tIZWxwZXJNaXNzaW5nJzogd3JhcE9sZEhlbHBlcihpbnN0YW5jZS5oZWxwZXJzLmJsb2NrSGVscGVyTWlzc2luZylcbiAgfSk7XG59O1xuXG4vKipcbiAqIENyZWF0ZSBhIGN1c3RvbSBET01CYXJzIGVudmlyb25tZW50IHRvIG1hdGNoIEhhbmRsZWJhcnNFbnZpcm9ubWVudC5cbiAqL1xudmFyIERPTUJhcnNFbnZpcm9ubWVudCA9IGJhc2UuRE9NQmFyc0Vudmlyb25tZW50ID0gZnVuY3Rpb24gKCkge1xuICBIYW5kbGViYXJzRW52aXJvbm1lbnQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgcmVnaXN0ZXJEZWZhdWx0SGVscGVycyh0aGlzKTtcbn07XG5cbi8qKlxuICogRXh0ZW5kIHRoZSBIYW5kbGViYXJzRW52aXJvbm1lbnQgcHJvdG90eXBlLlxuICpcbiAqIEB0eXBlIHtPYmplY3R9XG4gKi9cbnZhciBlbnZQcm90b3R5cGUgPSBET01CYXJzRW52aXJvbm1lbnQucHJvdG90eXBlID0gVXRpbHMuY3JlYXRlKFxuICBIYW5kbGViYXJzRW52aXJvbm1lbnQucHJvdG90eXBlXG4pO1xuXG4vKipcbiAqIEFsaWFzIHNvbWUgdXNlZnVsIGZ1bmN0aW9uYWxpdHkgdGhhdCBpcyBleHBlY3RlZCB0byBiZSBleHBvc2VkIG9uIHRoZSByb290XG4gKiBvYmplY3QuXG4gKi9cbmVudlByb3RvdHlwZS5jcmVhdGVGcmFtZSAgICAgICA9IGhic0Jhc2UuY3JlYXRlRnJhbWU7XG5lbnZQcm90b3R5cGUuUkVWSVNJT05fQ0hBTkdFUyAgPSBoYnNCYXNlLlJFVklTSU9OX0NIQU5HRVM7XG5lbnZQcm90b3R5cGUuQ09NUElMRVJfUkVWSVNJT04gPSBoYnNCYXNlLkNPTVBJTEVSX1JFVklTSU9OO1xuXG4vKipcbiAqIFRoZSBiYXNpYyBnZXR0ZXIgZnVuY3Rpb24uIE92ZXJyaWRlIHRoaXMgd2l0aCBzb21ldGhpbmcgZWxzZSBiYXNlZCBvbiB5b3VyXG4gKiBwcm9qZWN0LiBGb3IgZXhhbXBsZSwgQmFja2JvbmUuanMgbW9kZWxzLlxuICpcbiAqIEBwYXJhbSAge09iamVjdH0gb2JqZWN0XG4gKiBAcGFyYW0gIHtTdHJpbmd9IHByb3BlcnR5XG4gKiBAcmV0dXJuIHsqfVxuICovXG5lbnZQcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKG9iamVjdCwgcHJvcGVydHkpIHtcbiAgcmV0dXJuIG9iamVjdFtwcm9wZXJ0eV07XG59O1xuXG4vKipcbiAqIE5vb3AgZnVuY3Rpb25zIGZvciBzdWJzY3JpYmUgYW5kIHVuc3Vic2NyaWJlLiBPdmVycmlkZSB3aXRoIGN1c3RvbVxuICogZnVuY3Rpb25hbGl0eS5cbiAqL1xuZW52UHJvdG90eXBlLnN1YnNjcmliZSA9IGVudlByb3RvdHlwZS51bnN1YnNjcmliZSA9IGZ1bmN0aW9uICgpIHt9O1xuIiwidmFyIGhic0FTVCA9IHJlcXVpcmUoJ2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9jb21waWxlci9hc3QnKS5kZWZhdWx0O1xudmFyIFV0aWxzICA9IHJlcXVpcmUoJy4uL3V0aWxzJyk7XG5cbi8qKlxuICogRXh0ZW5kIHRoZSBIYW5kbGViYXJzIEFTVCB3aXRoIERPTSBub2Rlcy5cbiAqXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG52YXIgQVNUID0gbW9kdWxlLmV4cG9ydHMgPSBVdGlscy5jcmVhdGUoaGJzQVNUKTtcblxuLyoqXG4gKiBDcmVhdGUgYW4gQVNUIG5vZGUgZm9yIHJlcHJlc2VudGluZyBhbiBlbGVtZW50LlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBuYW1lXG4gKiBAcGFyYW0ge09iamVjdH0gYXR0cmlidXRlc1xuICogQHBhcmFtIHtPYmplY3R9IGNvbnRlbnRcbiAqL1xuQVNULkRPTUVsZW1lbnQgPSBmdW5jdGlvbiAobmFtZSwgYXR0cmlidXRlcywgY29udGVudCkge1xuICB0aGlzLnR5cGUgICAgICAgPSAnRE9NX0VMRU1FTlQnO1xuICB0aGlzLm5hbWUgICAgICAgPSBuYW1lO1xuICB0aGlzLmF0dHJpYnV0ZXMgPSBhdHRyaWJ1dGVzO1xuICB0aGlzLmNvbnRlbnQgICAgPSBjb250ZW50O1xufTtcblxuLyoqXG4gKiBDcmVhdGUgYW4gQVNUIG5vZGUgZm9yIHJlcHJlc2VudGluZyBhbiBlbGVtZW50IGF0dHJpYnV0ZS5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gbmFtZVxuICogQHBhcmFtIHtPYmplY3R9IHZhbHVlXG4gKi9cbkFTVC5ET01BdHRyaWJ1dGUgPSBmdW5jdGlvbiAobmFtZSwgdmFsdWUpIHtcbiAgdGhpcy50eXBlICA9ICdET01fQVRUUklCVVRFJztcbiAgdGhpcy5uYW1lICA9IG5hbWU7XG4gIHRoaXMudmFsdWUgPSB2YWx1ZTtcbn07XG5cbi8qKlxuICogQ3JlYXRlIGFuIEFTVCBub2RlIGZvciByZXByZXNlbnRpbmcgYSBjb21tZW50IG5vZGUuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHRleHRcbiAqL1xuQVNULkRPTUNvbW1lbnQgPSBmdW5jdGlvbiAodGV4dCkge1xuICB0aGlzLnR5cGUgPSAnRE9NX0NPTU1FTlQnO1xuICB0aGlzLnRleHQgPSB0ZXh0O1xufTtcbiIsInZhciBjcmVhdGUgICAgICAgICA9IHJlcXVpcmUoJy4uL3V0aWxzJykuY3JlYXRlO1xudmFyIENvbW1vbkNvbXBpbGVyID0gcmVxdWlyZSgnLi9jb21tb24tY29tcGlsZXInKS5wcm90b3R5cGU7XG5cbi8qKlxuICogQXR0cmlidXRlIGNvbXBpbGVyLlxuICovXG52YXIgQ29tcGlsZXIgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHt9O1xuQ29tcGlsZXIucHJvdG90eXBlID0gY3JlYXRlKENvbW1vbkNvbXBpbGVyKTtcbkNvbXBpbGVyLnByb3RvdHlwZS5jb21waWxlciA9IENvbXBpbGVyO1xuXG4vKipcbiAqIEFwcGVuZCBhIHZhbHVlIHRvIHRoZSBjdXJyZW50IGJ1ZmZlci4gV2Ugb3ZlcnJpZGUgdGhlIGRlZmF1bHQgZnVuY3Rpb25hbGl0eVxuICogb2YgSGFuZGxlYmFycyBzaW5jZSB3ZSB3YW50IHRvIGJlIGFibGUgdG8gYXBwZW5kICpldmVyeSogdmFsdWUuXG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5hcHBlbmQgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuZmx1c2hJbmxpbmUoKTtcblxuICB0aGlzLnNvdXJjZS5wdXNoKHRoaXMuYXBwZW5kVG9CdWZmZXIodGhpcy5wb3BTdGFjaygpKSk7XG59O1xuXG4vKipcbiAqIFNldCBhIGZsYWcgdG8gaW5kaWNhdGUgdGhlIGNvbXBpbGVyIGlzIGFuIGF0dHJpYnV0ZSBjb21waWxlci5cbiAqXG4gKiBAdHlwZSB7Qm9vbGVhbn1cbiAqL1xuQ29tcGlsZXIucHJvdG90eXBlLmlzQXR0cmlidXRlID0gdHJ1ZTtcbiIsInZhciBBU1QgICAgPSByZXF1aXJlKCcuL2FzdCcpO1xudmFyIHBhcnNlciA9IGV4cG9ydHMucGFyc2VyID0gcmVxdWlyZSgnLi9wYXJzZXInKTtcblxuLyoqXG4gKiBQYXJzZSBhIHN0cmluZyBpbnRvIGFuIEFTVC5cbiAqXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cbmV4cG9ydHMucGFyc2UgPSBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgaWYgKGlucHV0LmNvbnN0cnVjdG9yID09PSBBU1QuUHJvZ3JhbU5vZGUpIHtcbiAgICByZXR1cm4gaW5wdXQ7XG4gIH1cblxuICBwYXJzZXIueXkgPSBBU1Q7XG4gIHJldHVybiBwYXJzZXIucGFyc2UoaW5wdXQpO1xufTtcbiIsInZhciBjcmVhdGUgICAgID0gcmVxdWlyZSgnLi4vdXRpbHMnKS5jcmVhdGU7XG52YXIgSlNDb21waWxlciA9IHJlcXVpcmUoXG4gICdoYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvY29tcGlsZXIvamF2YXNjcmlwdC1jb21waWxlcidcbikuZGVmYXVsdC5wcm90b3R5cGU7XG5cbi8qKlxuICogQ3JlYXRlIHRoZSBiYXNlIGNvbXBpbGVyIGZ1bmN0aW9uYWxpdHkgYW5kIGF0dGFjaCByZWxldmFudCByZWZlcmVuY2VzLlxuICovXG52YXIgQ29tcGlsZXIgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHt9O1xuQ29tcGlsZXIucHJvdG90eXBlID0gY3JlYXRlKEpTQ29tcGlsZXIpO1xuQ29tcGlsZXIucHJvdG90eXBlLmNvbXBpbGVyID0gQ29tcGlsZXI7XG5cbi8qKlxuICogT3ZlcnJpZGUgbmFtZSBsb29rdXAgdG8gdXNlIHRoZSBmdW5jdGlvbiBwcm92aWRlZCBvbiB0aGUgRE9NQmFycyBvYmplY3QuXG4gKlxuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5Db21waWxlci5wcm90b3R5cGUubmFtZUxvb2t1cCA9IGZ1bmN0aW9uIChwYXJlbnQsIHByb3BlcnR5LCB0eXBlKSB7XG4gIGlmICh0eXBlICE9PSAnY29udGV4dCcpIHtcbiAgICByZXR1cm4gSlNDb21waWxlci5uYW1lTG9va3VwLmNhbGwodGhpcywgcGFyZW50LCBwcm9wZXJ0eSwgdHlwZSk7XG4gIH1cblxuICB0aGlzLmNvbnRleHQuYWxpYXNlcy5nZXQgPSAndGhpcy5nZXQnO1xuXG4gIHZhciBxdW90ZWRQYXJlbnQgICA9IHRoaXMucXVvdGVkU3RyaW5nKHBhcmVudCk7XG4gIHZhciBxdW90ZWRQcm9wZXJ0eSA9IHRoaXMucXVvdGVkU3RyaW5nKHByb3BlcnR5KTtcblxuICByZXR1cm4gJ2dldCgnICsgcGFyZW50ICsgJywgJyArIHF1b3RlZFByb3BlcnR5ICsgJywgJyArIHF1b3RlZFBhcmVudCArICcpJztcbn07XG5cbi8qKlxuICogT3ZlcnJpZGUgYW1iaWd1b3VzIGludm9rZXMgdG8gcHJvZHVjZSBqdXN0IG9uZSBzb3VyY2UgdmFsdWUuXG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5pbnZva2VBbWJpZ3VvdXMgPSBmdW5jdGlvbiAoKSB7XG4gIEpTQ29tcGlsZXIuaW52b2tlQW1iaWd1b3VzLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIHRoaXMuc291cmNlLnB1c2godGhpcy5zb3VyY2Uuc3BsaWNlKC0yKS5qb2luKCdcXG4nKSk7XG59O1xuXG4vKipcbiAqIE92ZXJyaWRlIHRoZSBhbWJpZ291cyBibG9jayB2YWx1ZSBpbnZva2F0aW9uIHRvIHByb2R1Y2UgYSBzaW5nbGUgc291cmNlLlxuICovXG5Db21waWxlci5wcm90b3R5cGUuYW1iaWd1b3VzQmxvY2tWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgSlNDb21waWxlci5hbWJpZ3VvdXNCbG9ja1ZhbHVlLmNhbGwodGhpcyk7XG4gIHRoaXMuc291cmNlLnB1c2godGhpcy5zb3VyY2Uuc3BsaWNlKC0yKS5qb2luKCdcXG4nKSk7XG59O1xuXG4vKipcbiAqIFNldCB0aGUgYXR0cmlidXRlIGNvbXBpbGVyIHRvIGJlIGZhbHNlLiBUaGlzIGlzIG92ZXJyaWRlbiBpbiB0aGUgYXR0cmlidXRlXG4gKiBjb21waWxlciBzdWJjbGFzcy5cbiAqXG4gKiBAdHlwZSB7Qm9vbGVhbn1cbiAqL1xuQ29tcGlsZXIucHJvdG90eXBlLmlzQXR0cmlidXRlID0gZmFsc2U7XG5cbi8qKlxuICogT3ZlcnJpZGUgdGhlIHBhcmFtcyBzZXR1cCB3aXRoIGFuIGF0dHJpYnV0ZSBib29sZWFuIGFuZCBjdXN0b20gd3JhcHBlcnNcbiAqIGZvciBwcm9ncmFtIGZ1bmN0aW9ucy5cbiAqXG4gKiBAcGFyYW0gIHtOdW1iZXJ9ICBwYXJhbVNpemVcbiAqIEBwYXJhbSAge0FycmF5fSAgIHBhcmFtc1xuICogQHBhcmFtICB7Qm9vbGVhbn0gdXNlUmVnaXN0ZXJcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuQ29tcGlsZXIucHJvdG90eXBlLnNldHVwUGFyYW1zID0gZnVuY3Rpb24gKHBhcmFtU2l6ZSwgcGFyYW1zLCB1c2VSZWdpc3Rlcikge1xuICB2YXIgdHlwZXMgICAgPSBbXTtcbiAgdmFyIG9wdGlvbnMgID0gW107XG4gIHZhciBjb250ZXh0cyA9IFtdO1xuXG4gIHRoaXMuY29udGV4dC5hbGlhc2VzLnNlbGYgPSAndGhpcyc7XG5cbiAgb3B0aW9ucy5wdXNoKCdoYXNoOiAnICsgdGhpcy5wb3BTdGFjaygpKTtcbiAgb3B0aW9ucy5wdXNoKCdhdHRyaWJ1dGU6ICcgKyB0aGlzLmlzQXR0cmlidXRlKTtcblxuICAvLyBSZWZlcmVuY2VzIHRvIHRoZSBjdXJyZW50IHN1YnNjcmlwdGlvbiBleGVjdXRpb24uXG4gIG9wdGlvbnMucHVzaCgndXBkYXRlOiBzZWxmLnN1YnNjcmlwdGlvbi5ib3VuZFVwZGF0ZScpO1xuICBvcHRpb25zLnB1c2goJ3Vuc3Vic2NyaWJlOiBzZWxmLnN1YnNjcmlwdGlvbi5ib3VuZFVuc3Vic2NyaXB0aW9uJyk7XG5cbiAgdmFyIGludmVyc2UgPSB0aGlzLnBvcFN0YWNrKCk7XG4gIHZhciBwcm9ncmFtID0gdGhpcy5wb3BTdGFjaygpO1xuXG4gIC8vIEF2b2lkIHNldHRpbmcgZm4gYW5kIGludmVyc2UgaWYgbmVpdGhlciBhcmUgc2V0LiBUaGlzIGFsbG93cyBoZWxwZXJzIHRvXG4gIC8vIGRvIGEgY2hlY2sgZm9yIGBpZiAob3B0aW9ucy5mbilgLlxuICBpZiAocHJvZ3JhbSB8fCBpbnZlcnNlKSB7XG4gICAgaWYgKCFwcm9ncmFtKSB7XG4gICAgICB0aGlzLmNvbnRleHQuYWxpYXNlcy5ub29wID0gJ3RoaXMubm9vcCc7XG4gICAgICBwcm9ncmFtID0gJ25vb3AnO1xuICAgIH1cblxuICAgIGlmICghaW52ZXJzZSkge1xuICAgICAgdGhpcy5jb250ZXh0LmFsaWFzZXMubm9vcCA9ICd0aGlzLm5vb3AnO1xuICAgICAgaW52ZXJzZSA9ICdub29wJztcbiAgICB9XG5cbiAgICB0aGlzLmNvbnRleHQuYWxpYXNlcy53cmFwUHJvZ3JhbSA9ICd0aGlzLndyYXBQcm9ncmFtJztcblxuICAgIG9wdGlvbnMucHVzaCgnZm46IHdyYXBQcm9ncmFtKCcgKyBwcm9ncmFtICsgJyknKTtcbiAgICBvcHRpb25zLnB1c2goJ2ludmVyc2U6IHdyYXBQcm9ncmFtKCcgKyBpbnZlcnNlICsgJyknKTtcbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcGFyYW1TaXplOyBpKyspIHtcbiAgICBwYXJhbXMucHVzaCh0aGlzLnBvcFN0YWNrKCkpO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpbmdQYXJhbXMpIHtcbiAgICAgIHR5cGVzLnB1c2godGhpcy5wb3BTdGFjaygpKTtcbiAgICAgIGNvbnRleHRzLnB1c2godGhpcy5wb3BTdGFjaygpKTtcbiAgICB9XG4gIH1cblxuICBpZiAodGhpcy5vcHRpb25zLnN0cmluZ1BhcmFtcykge1xuICAgIG9wdGlvbnMucHVzaCgnY29udGV4dHM6IFsnICsgY29udGV4dHMuam9pbignLCcpICsgJ10nKTtcbiAgICBvcHRpb25zLnB1c2goJ3R5cGVzOiBbJyArIHR5cGVzLmpvaW4oJywnKSArICddJyk7XG4gICAgb3B0aW9ucy5wdXNoKCdoYXNoQ29udGV4dHM6IGhhc2hDb250ZXh0cycpO1xuICAgIG9wdGlvbnMucHVzaCgnaGFzaFR5cGVzOiBoYXNoVHlwZXMnKTtcbiAgfVxuXG4gIGlmICh0aGlzLm9wdGlvbnMuZGF0YSkge1xuICAgIG9wdGlvbnMucHVzaCgnZGF0YTogZGF0YScpO1xuICB9XG5cbiAgb3B0aW9ucyA9ICd7JyArIG9wdGlvbnMuam9pbignLCAnKSArICd9JztcblxuICBpZiAodXNlUmVnaXN0ZXIpIHtcbiAgICB0aGlzLnJlZ2lzdGVyKCdvcHRpb25zJywgb3B0aW9ucyk7XG4gICAgcGFyYW1zLnB1c2goJ29wdGlvbnMnKTtcbiAgfSBlbHNlIHtcbiAgICBwYXJhbXMucHVzaChvcHRpb25zKTtcbiAgfVxuICByZXR1cm4gcGFyYW1zLmpvaW4oJywgJyk7XG59O1xuIiwidmFyIGNyZWF0ZSAgICAgICA9IHJlcXVpcmUoJy4uL3V0aWxzJykuY3JlYXRlO1xudmFyIGhic0NvbXBpbGVyICA9IHJlcXVpcmUoJ2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9jb21waWxlci9jb21waWxlcicpO1xudmFyIEJhc2VDb21waWxlciA9IGhic0NvbXBpbGVyLkNvbXBpbGVyLnByb3RvdHlwZTtcbnZhciBFeGNlcHRpb24gICAgPSByZXF1aXJlKCcuLi9leGNlcHRpb24nKTtcbnZhciBwYXJzZSAgICAgICAgPSByZXF1aXJlKCcuL2Jhc2UnKS5wYXJzZTtcbnZhciBKU0NvbXBpbGVyICAgPSByZXF1aXJlKCcuL2phdmFzY3JpcHQtY29tcGlsZXInKTtcbnZhciBBU1QgICAgICAgICAgPSByZXF1aXJlKCcuL2FzdCcpO1xuXG4vKipcbiAqIEJhc2UgY29tcGlsZXIgaW4gY2hhcmdlIG9mIGdlbmVyYXRpbmcgYSBjb25zdW1hYmxlIGVudmlyb25tZW50IGZvciB0aGVcbiAqIEphdmFTY3JpcHQgY29tcGlsZXIuXG4gKi9cbnZhciBDb21waWxlciA9IGV4cG9ydHMuQ29tcGlsZXIgPSBmdW5jdGlvbiAoKSB7fTtcbkNvbXBpbGVyLnByb3RvdHlwZSA9IGNyZWF0ZShCYXNlQ29tcGlsZXIpO1xuQ29tcGlsZXIucHJvdG90eXBlLmNvbXBpbGVyID0gQ29tcGlsZXI7XG5cbi8qKlxuICogQXBwZW5kIGEgRE9NIGVsZW1lbnQgbm9kZSB0byB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG5vZGVcbiAqL1xuQ29tcGlsZXIucHJvdG90eXBlLkRPTV9FTEVNRU5UID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgdGhpcy5vcGNvZGUoJ3B1c2hQcm9ncmFtJywgdGhpcy5jb21waWxlQXR0cmlidXRlKG5vZGUubmFtZSkpO1xuICB0aGlzLm9wY29kZSgnaW52b2tlRWxlbWVudCcpO1xuXG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBub2RlLmF0dHJpYnV0ZXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICB2YXIgbmFtZSAgPSB0aGlzLmNvbXBpbGVBdHRyaWJ1dGUobm9kZS5hdHRyaWJ1dGVzW2ldLm5hbWUpO1xuICAgIHZhciB2YWx1ZSA9IHRoaXMuY29tcGlsZUF0dHJpYnV0ZShub2RlLmF0dHJpYnV0ZXNbaV0udmFsdWUpO1xuICAgIHRoaXMuYXBwZW5kQXR0cmlidXRlKG5hbWUsIHZhbHVlKTtcbiAgfVxuXG4gIHRoaXMub3Bjb2RlKCdwdXNoUHJvZ3JhbScsIHRoaXMuY29tcGlsZUNvbnRlbnRzKG5vZGUuY29udGVudCkpO1xuICB0aGlzLm9wY29kZSgnaW52b2tlQ29udGVudCcpO1xuICB0aGlzLm9wY29kZSgnYXBwZW5kRWxlbWVudCcpO1xufTtcblxuLyoqXG4gKiBBcHBlbmQgYSBET00gY29tbWVudCBub2RlIHRvIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gbm9kZVxuICovXG5Db21waWxlci5wcm90b3R5cGUuRE9NX0NPTU1FTlQgPSBmdW5jdGlvbiAobm9kZSkge1xuICB0aGlzLm9wY29kZSgncHVzaFByb2dyYW0nLCB0aGlzLmNvbXBpbGVBdHRyaWJ1dGUobm9kZS50ZXh0KSk7XG4gIHRoaXMub3Bjb2RlKCdpbnZva2VDb21tZW50Jyk7XG4gIHRoaXMub3Bjb2RlKCdhcHBlbmRFbGVtZW50Jyk7XG59O1xuXG4vKipcbiAqIEFwcGVuZCBhbiBhdHRyaWJ1dGUgdG8gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIEBwYXJhbSAge09iamVjdH0gbmFtZVxuICogQHBhcmFtICB7T2JqZWN0fSB2YWx1ZVxuICovXG5Db21waWxlci5wcm90b3R5cGUuYXBwZW5kQXR0cmlidXRlID0gZnVuY3Rpb24gKG5hbWUsIHZhbHVlKSB7XG4gIHRoaXMub3Bjb2RlKCdwdXNoUHJvZ3JhbScsIG5hbWUpO1xuICB0aGlzLm9wY29kZSgncHVzaFByb2dyYW0nLCB2YWx1ZSk7XG4gIHRoaXMub3Bjb2RlKCdpbnZva2VBdHRyaWJ1dGUnKTtcbn07XG5cbi8qKlxuICogQ29tcGlsZSBhbiBhdHRyaWJ1dGUgcHJvZ3JhbS5cbiAqXG4gKiBAcGFyYW0gIHtPYmplY3R9IHByb2dyYW1cbiAqIEByZXR1cm4ge051bWJlcn1cbiAqL1xuQ29tcGlsZXIucHJvdG90eXBlLmNvbXBpbGVBdHRyaWJ1dGUgPSBmdW5jdGlvbiAocHJvZ3JhbSkge1xuICB2YXIgZ3VpZCA9IHRoaXMuY29tcGlsZUNvbnRlbnRzKHByb2dyYW0pO1xuICB0aGlzLmNoaWxkcmVuW2d1aWRdLmlzQXR0cmlidXRlID0gdHJ1ZTtcbiAgcmV0dXJuIGd1aWQ7XG59O1xuXG4vKipcbiAqIENvbXBpbGUgYW4gZWxlbWVudHMgY29udGVudHMuXG4gKlxuICogQHBhcmFtICB7T2JqZWN0fSBwcm9ncmFtXG4gKiBAcmV0dXJuIHtOdW1iZXJ9XG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5jb21waWxlQ29udGVudHMgPSBmdW5jdGlvbiAocHJvZ3JhbSkge1xuICB2YXIgZ3VpZCAgID0gdGhpcy5jb21waWxlUHJvZ3JhbShwcm9ncmFtKTtcbiAgdmFyIHJlc3VsdCA9IHRoaXMuY2hpbGRyZW5bZ3VpZF07XG4gIHJlc3VsdC5pc1Byb3hpZWQgPSB0cnVlO1xuXG4gIC8vIFByb3h5IGFsbCB0aGUgZGVwdGggbm9kZXMgYmV0d2VlbiBjb21waWxlZCBwcm9ncmFtcy5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCByZXN1bHQuZGVwdGhzLmxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICB0aGlzLmFkZERlcHRoKHJlc3VsdC5kZXB0aHMubGlzdFtpXSk7XG4gIH1cblxuICByZXR1cm4gZ3VpZDtcbn07XG5cbi8qKlxuICogVXBkYXRlIHRoZSBjb21waWxlciBlcXVhbGl0eSBjaGVjayB0byBhbHNvIHRha2UgaW50byBhY2NvdW50IGF0dHJpYnV0ZVxuICogcHJvZ3JhbXMuXG4gKlxuICogQHBhcmFtICB7T2JqZWN0fSAgb3RoZXJcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbiAob3RoZXIpIHtcbiAgLy8gQ2hlY2sgaWYgd2UgaGF2ZSB0d28gYXR0cmlidXRlIHByb2dyYW1zIChvciBub24tYXR0cmlidXRlIHByb2dyYW1zKS5cbiAgaWYgKHRoaXMuaXNBdHRyaWJ1dGUgIT09IG90aGVyLmlzQXR0cmlidXRlKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuIEJhc2VDb21waWxlci5lcXVhbHMuY2FsbCh0aGlzLCBvdGhlcik7XG59O1xuXG4vKipcbiAqIENoZWNrIHRoZSBhcmd1bWVudHMgcGFzc2VkIGludG8gdGhlIGNvbXBpbGF0aW9uIGZ1bmN0aW9ucyBiZWZvcmUgdHJ5aW5nIHRvXG4gKiBjb21waWxlIHRoZSBhcyBhIHByb2dyYW0uXG4gKlxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqL1xudmFyIGNvbXBpbGVQcmVjaGVjayA9IGZ1bmN0aW9uIChmbikge1xuICByZXR1cm4gZnVuY3Rpb24gKGlucHV0LCBvcHRpb25zLCBlbnYpIHtcbiAgICBpZiAodHlwZW9mIGlucHV0ICE9PSAnc3RyaW5nJyAmJiAhKGlucHV0IGluc3RhbmNlb2YgQVNULlByb2dyYW1Ob2RlKSkge1xuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcbiAgICAgICAgJ1lvdSBtdXN0IHBhc3MgYSBzdHJpbmcgb3IgRE9NQmFycyBBU1QgdG8gRE9NQmFycy5wcmVjb21waWxlLiAnICtcbiAgICAgICAgJ1lvdSBwYXNzZWQgJyArIGlucHV0XG4gICAgICApO1xuICAgIH1cblxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgaWYgKCEoJ2RhdGEnIGluIG9wdGlvbnMpKSB7XG4gICAgICBvcHRpb25zLmRhdGEgPSB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiBmbihpbnB1dCwgb3B0aW9ucywgZW52KTtcbiAgfTtcbn07XG5cbi8qKlxuICogUHJlY29tcGlsZSBnZW5lcmF0ZXMgYSBzdHJpbmdpZmllZCBKYXZhU2NyaXB0IGZ1bmN0aW9uLlxuICpcbiAqIEBwYXJhbSAge1N0cmluZ30gaW5wdXRcbiAqIEBwYXJhbSAge09iamVjdH0gb3B0aW9uc1xuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5leHBvcnRzLnByZWNvbXBpbGUgPSBjb21waWxlUHJlY2hlY2soZnVuY3Rpb24gKGlucHV0LCBvcHRpb25zKSB7XG4gIHZhciBhc3QgICAgICAgICA9IHBhcnNlKGlucHV0KTtcbiAgdmFyIGVudmlyb25tZW50ID0gbmV3IENvbXBpbGVyKCkuY29tcGlsZShhc3QsIG9wdGlvbnMpO1xuICByZXR1cm4gbmV3IEpTQ29tcGlsZXIoKS5jb21waWxlKGVudmlyb25tZW50LCBvcHRpb25zKTtcbn0pO1xuXG4vKipcbiAqIENvbXBpbGF0aW9uIHJldHVybiBhIGZ1bmN0aW9uIHRoYXQgaXMgaW1tZWRpYXRlbHkgcmVhZHkgZm9yIGV4ZWN1dGlvbiBhcyBhXG4gKiB0ZW1wbGF0ZS5cbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9ICAgaW5wdXRcbiAqIEBwYXJhbSAge09iamVjdH0gICBvcHRpb25zXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqL1xuZXhwb3J0cy5jb21waWxlID0gY29tcGlsZVByZWNoZWNrKGZ1bmN0aW9uIChpbnB1dCwgb3B0aW9ucywgZW52KSB7XG4gIHZhciBjb21waWxlZDtcblxuICB2YXIgY29tcGlsZUlucHV0ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBhc3QgICAgICAgICAgPSBwYXJzZShpbnB1dCk7XG4gICAgdmFyIGVudmlyb25tZW50ICA9IG5ldyBDb21waWxlcigpLmNvbXBpbGUoYXN0LCBvcHRpb25zKTtcbiAgICB2YXIgdGVtcGxhdGVTcGVjID0gbmV3IEpTQ29tcGlsZXIoKS5jb21waWxlKFxuICAgICAgZW52aXJvbm1lbnQsIG9wdGlvbnMsIHVuZGVmaW5lZCwgdHJ1ZVxuICAgICk7XG5cbiAgICByZXR1cm4gZW52LnRlbXBsYXRlKHRlbXBsYXRlU3BlYyk7XG4gIH07XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIChjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgaWYgKCFjb21waWxlZCkge1xuICAgICAgY29tcGlsZWQgPSBjb21waWxlSW5wdXQoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY29tcGlsZWQuY2FsbCh0aGlzLCBjb250ZXh0LCBvcHRpb25zKTtcbiAgfTtcbn0pO1xuIiwidmFyIGNyZWF0ZSAgICAgICAgID0gcmVxdWlyZSgnLi4vdXRpbHMnKS5jcmVhdGU7XG52YXIgQ29tbW9uQ29tcGlsZXIgPSByZXF1aXJlKCcuL2NvbW1vbi1jb21waWxlcicpLnByb3RvdHlwZTtcblxuLyoqXG4gKiBFeHRlbmRzIEhhbmRsZWJhcnMgSmF2YVNjcmlwdCBjb21waWxlciB0byBhZGQgRE9NIHNwZWNpZmljIHJ1bGVzLlxuICovXG52YXIgQ29tcGlsZXIgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHt9O1xuQ29tcGlsZXIucHJvdG90eXBlID0gY3JlYXRlKENvbW1vbkNvbXBpbGVyKTtcbkNvbXBpbGVyLnByb3RvdHlwZS5jb21waWxlciAgICAgPSBDb21waWxlcjtcbkNvbXBpbGVyLnByb3RvdHlwZS5hdHRyQ29tcGlsZXIgPSByZXF1aXJlKCcuL2F0dHJpYnV0ZS1jb21waWxlcicpO1xuXG4vKipcbiAqIENvbXBpbGVzIHRoZSBlbnZpcm9ubWVudCBvYmplY3QgZ2VuZXJhdGVkIGJ5IHRoZSBiYXNlIGNvbXBpbGVyLlxuICpcbiAqIEBwYXJhbSAge09iamVjdH0gICAgICAgICAgICBlbnZpcm9ubWVudFxuICogQHJldHVybiB7KEZ1bmN0aW9ufFN0cmluZyl9XG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5jb21waWxlID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmVsZW1lbnRTbG90ID0gMDtcbiAgcmV0dXJuIENvbW1vbkNvbXBpbGVyLmNvbXBpbGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cbi8qKlxuICogQ29tcGlsZSBhbnkgY2hpbGQgcHJvZ3JhbSBub2Rlcy4gRS5nLiBCbG9jayBoZWxwZXJzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBlbnZpcm9ubWVudFxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqL1xuQ29tcGlsZXIucHJvdG90eXBlLmNvbXBpbGVDaGlsZHJlbiA9IGZ1bmN0aW9uKGVudmlyb25tZW50LCBvcHRpb25zKSB7XG4gIHZhciBjaGlsZHJlbiA9IGVudmlyb25tZW50LmNoaWxkcmVuO1xuICB2YXIgQ29tcGlsZXIsIGNoaWxkLCBwcm9ncmFtLCBpbmRleDtcblxuICBmb3IgKHZhciBpID0gMCwgbCA9IGNoaWxkcmVuLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGNoaWxkICAgID0gY2hpbGRyZW5baV07XG4gICAgaW5kZXggICAgPSB0aGlzLm1hdGNoRXhpc3RpbmdQcm9ncmFtKGNoaWxkKTtcbiAgICBDb21waWxlciA9IHRoaXMuY29tcGlsZXI7XG5cbiAgICBpZiAoY2hpbGQuaXNBdHRyaWJ1dGUpIHtcbiAgICAgIENvbXBpbGVyID0gdGhpcy5hdHRyQ29tcGlsZXI7XG4gICAgfVxuXG4gICAgaWYgKGluZGV4ID09IG51bGwpIHtcbiAgICAgIHRoaXMuY29udGV4dC5wcm9ncmFtcy5wdXNoKCcnKTtcbiAgICAgIGNoaWxkLmluZGV4ID0gaW5kZXggPSB0aGlzLmNvbnRleHQucHJvZ3JhbXMubGVuZ3RoO1xuICAgICAgY2hpbGQubmFtZSAgPSAncHJvZ3JhbScgKyBpbmRleDtcbiAgICAgIHByb2dyYW0gPSBuZXcgQ29tcGlsZXIoKS5jb21waWxlKGNoaWxkLCBvcHRpb25zLCB0aGlzLmNvbnRleHQpO1xuICAgICAgdGhpcy5jb250ZXh0LnByb2dyYW1zW2luZGV4XSAgICAgPSBwcm9ncmFtO1xuICAgICAgdGhpcy5jb250ZXh0LmVudmlyb25tZW50c1tpbmRleF0gPSBjaGlsZDtcbiAgICB9IGVsc2Uge1xuICAgICAgY2hpbGQuaW5kZXggPSBpbmRleDtcbiAgICAgIGNoaWxkLm5hbWUgID0gJ3Byb2dyYW0nICsgaW5kZXg7XG4gICAgfVxuICB9XG59O1xuXG4vKipcbiAqIFB1c2ggYW4gZWxlbWVudCBvbnRvIHRoZSBzdGFjayBhbmQgcmV0dXJuIGl0LlxuICpcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuQ29tcGlsZXIucHJvdG90eXBlLnB1c2hFbGVtZW50ID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gJ2VsZW1lbnQnICsgKCsrdGhpcy5lbGVtZW50U2xvdCk7XG59O1xuXG4vKipcbiAqIFBvcCB0aGUgbGFzdCBlbGVtZW50IG9mZiB0aGUgc3RhY2sgYW5kIHJldHVybiBpdC5cbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5wb3BFbGVtZW50ID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gJ2VsZW1lbnQnICsgKHRoaXMuZWxlbWVudFNsb3QtLSk7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIGVsZW1lbnQgYXQgdGhlIGVuZCBvZiB0aGUgc3RhY2suXG4gKlxuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5Db21waWxlci5wcm90b3R5cGUudG9wRWxlbWVudCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuICdlbGVtZW50JyArIHRoaXMuZWxlbWVudFNsb3Q7XG59O1xuXG4vKipcbiAqIEFwcGVuZCBzb21lIGNvbnRlbnQgdG8gdGhlIGJ1ZmZlciAoYSBkb2N1bWVudCBmcmFnbWVudCkuXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSBzdHJpbmdcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuQ29tcGlsZXIucHJvdG90eXBlLmFwcGVuZFRvQnVmZmVyID0gZnVuY3Rpb24gKHN0cmluZykge1xuICBpZiAodGhpcy5lbnZpcm9ubWVudC5pc1NpbXBsZSkge1xuICAgIHJldHVybiAncmV0dXJuICcgKyBzdHJpbmcgKyAnOyc7XG4gIH1cblxuICB0aGlzLmNvbnRleHQuYWxpYXNlcy5hcHBlbmRDaGlsZCA9ICd0aGlzLmFwcGVuZENoaWxkJztcblxuICByZXR1cm4gJ2FwcGVuZENoaWxkKGJ1ZmZlciwgJyArIHN0cmluZyArICcpOyc7XG59O1xuXG4vKipcbiAqIEluaXRpYWxpemUgdGhlIGJhc2UgdmFsdWUgb2YgdGhlIGJ1ZmZlciwgaW4gdGhpcyBjYXNlIGEgZG9jdW1lbnQgZnJhZ21lbnQuXG4gKlxuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5Db21waWxlci5wcm90b3R5cGUuaW5pdGlhbGl6ZUJ1ZmZlciA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuICdkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCknO1xufTtcblxuLyoqXG4gKiBBcHBlbmQgYSB0ZXh0IG5vZGUgdG8gdGhlIGJ1ZmZlci5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gY29udGVudFxuICovXG5Db21waWxlci5wcm90b3R5cGUuYXBwZW5kQ29udGVudCA9IGZ1bmN0aW9uIChjb250ZW50KSB7XG4gIHZhciBzdHJpbmcgPSAnZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJyArIHRoaXMucXVvdGVkU3RyaW5nKGNvbnRlbnQpICsgJyknO1xuICB0aGlzLnNvdXJjZS5wdXNoKHRoaXMuYXBwZW5kVG9CdWZmZXIoc3RyaW5nKSk7XG59O1xuXG4vKipcbiAqIEFwcGVuZCBhIHZhcmlhYmxlIHRvIHRoZSBzdGFjay4gQWRkcyBzb21lIGFkZGl0aW9uYWwgbG9naWMgdG8gdHJhbnNmb3JtIHRoZVxuICogdGV4dCBpbnRvIGEgRE9NIG5vZGUgYmVmb3JlIHdlIGF0dGVtcHQgdG8gYXBwZW5kIGl0IHRvIHRoZSBidWZmZXIuXG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5hcHBlbmQgPSBmdW5jdGlvbiAoaXNFc2NhcGVkKSB7XG4gIHRoaXMuZmx1c2hJbmxpbmUoKTtcblxuICB2YXIgY3JlYXRlRm4gPSAnY3JlYXRlVGV4dCc7XG5cbiAgaWYgKGlzRXNjYXBlZCkge1xuICAgIHRoaXMuY29udGV4dC5hbGlhc2VzLmNyZWF0ZVRleHQgPSAndGhpcy5jcmVhdGVUZXh0JztcbiAgfSBlbHNlIHtcbiAgICBjcmVhdGVGbiA9ICdjcmVhdGVET00nO1xuICAgIHRoaXMuY29udGV4dC5hbGlhc2VzLmNyZWF0ZURPTSA9ICd0aGlzLmNyZWF0ZURPTSc7XG4gIH1cblxuICB2YXIgbG9jYWwgICA9IHRoaXMucG9wU3RhY2soKTtcbiAgdmFyIHNvdXJjZSAgPSB0aGlzLnNvdXJjZS5wb3AoKTtcbiAgdmFyIGVsZW1lbnQgPSB0aGlzLnB1c2hTdGFjayhcbiAgICBjcmVhdGVGbiArICcoZnVuY3Rpb24gKCkgeyAnICsgc291cmNlICsgJzsgcmV0dXJuICcgKyBsb2NhbCArICc7IH0pJ1xuICApO1xuXG4gIHRoaXMuc291cmNlLnB1c2godGhpcy5hcHBlbmRUb0J1ZmZlcihlbGVtZW50KSk7XG59O1xuXG4vKipcbiAqIEFwcGVuZCBhbiBlc2NhcGVkIEhhbmRsZWJhcnMgZXhwcmVzc2lvbiB0byB0aGUgc291cmNlLlxuICovXG5Db21waWxlci5wcm90b3R5cGUuYXBwZW5kRXNjYXBlZCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuYXBwZW5kKHRydWUpO1xufTtcblxuLyoqXG4gKiBBcHBlbmQgYW4gZWxlbWVudCBub2RlIHRvIHRoZSBzb3VyY2UuXG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5hcHBlbmRFbGVtZW50ID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLnNvdXJjZS5wdXNoKHRoaXMuYXBwZW5kVG9CdWZmZXIodGhpcy5wb3BTdGFjaygpKSk7XG59O1xuXG4vKipcbiAqIENyZWF0ZSBhIERPTSBjb21tZW50IG5vZGUgcmVhZHkgZm9yIGFwcGVuZGluZyB0byB0aGUgY3VycmVudCBidWZmZXIuXG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5pbnZva2VDb21tZW50ID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmNvbnRleHQuYWxpYXNlcy5wYXJ0aWFsID0gJ3RoaXMucGFydGlhbCc7XG5cbiAgdmFyIGRlcHRoICA9ICdkZXB0aCcgKyB0aGlzLmxhc3RDb250ZXh0O1xuICB2YXIgaW52b2tlID0gJ3BhcnRpYWwoJyArIHRoaXMudG9wU3RhY2soKSArICcsICcgKyBkZXB0aCArICcpJztcblxuICB0aGlzLmNvbnRleHQuYWxpYXNlcy5jcmVhdGVDb21tZW50ID0gJ3RoaXMuY3JlYXRlQ29tbWVudCc7XG5cbiAgdGhpcy5wdXNoU3RhY2soJ2NyZWF0ZUNvbW1lbnQoJyArIGludm9rZSArICcpJyk7XG59O1xuXG4vKipcbiAqIENyZWF0ZSBhIERPTSBlbGVtZW50IG5vZGUgcmVhZHkgZm9yIGFwcGVuZGluZyB0byB0aGUgY3VycmVudCBidWZmZXIuXG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5pbnZva2VFbGVtZW50ID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmNvbnRleHQuYWxpYXNlcy5wYXJ0aWFsICAgICAgID0gJ3RoaXMucGFydGlhbCc7XG4gIHRoaXMuY29udGV4dC5hbGlhc2VzLmNyZWF0ZUVsZW1lbnQgPSAndGhpcy5jcmVhdGVFbGVtZW50JztcblxuICB2YXIgZWxlbWVudCA9IHRoaXMucHVzaEVsZW1lbnQoKTtcbiAgdmFyIGRlcHRoICAgPSAnZGVwdGgnICsgdGhpcy5sYXN0Q29udGV4dDtcbiAgdmFyIGN1cnJlbnQgPSAncGFydGlhbCgnICsgdGhpcy5wb3BTdGFjaygpICsgJywgJyArIGRlcHRoICsgJyknO1xuICB2YXIgdXBkYXRlICA9ICdmdW5jdGlvbiAoZWxlbWVudCkgeyAnICsgZWxlbWVudCArICcgPSBlbGVtZW50OyB9JztcbiAgdmFyIGNyZWF0ZSAgPSAnY3JlYXRlRWxlbWVudCgnICsgY3VycmVudCArICcsICcgKyB1cGRhdGUgKyAnKSc7XG5cbiAgdGhpcy5wdXNoU3RhY2tMaXRlcmFsKGVsZW1lbnQpO1xuICB0aGlzLnJlZ2lzdGVyKGVsZW1lbnQsIGNyZWF0ZSk7XG59O1xuXG4vKipcbiAqIEFwcGVuZCBhbiBhdHRyaWJ1dGUgbm9kZSB0byB0aGUgY3VycmVudCBlbGVtZW50LlxuICovXG5Db21waWxlci5wcm90b3R5cGUuaW52b2tlQXR0cmlidXRlID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmNvbnRleHQuYWxpYXNlcy5wYXJ0aWFsICAgICAgPSAndGhpcy5wYXJ0aWFsJztcbiAgdGhpcy5jb250ZXh0LmFsaWFzZXMuc2V0QXR0cmlidXRlID0gJ3RoaXMuc2V0QXR0cmlidXRlJztcblxuICB2YXIgZGVwdGggICA9ICdkZXB0aCcgKyB0aGlzLmxhc3RDb250ZXh0O1xuICB2YXIgZWxlbWVudCA9ICdmdW5jdGlvbiAoKSB7IHJldHVybiAnICsgdGhpcy50b3BFbGVtZW50KCkgKyAnOyB9JztcbiAgdmFyIHZhbHVlICAgPSAncGFydGlhbCgnICsgdGhpcy5wb3BTdGFjaygpICsgJywgJyArIGRlcHRoICsgJyknO1xuICB2YXIgbmFtZSAgICA9ICdwYXJ0aWFsKCcgKyB0aGlzLnBvcFN0YWNrKCkgKyAnLCAnICsgZGVwdGggKyAnKSc7XG4gIHZhciBwYXJhbXMgID0gW2VsZW1lbnQsIG5hbWUsIHZhbHVlXTtcblxuICB0aGlzLnNvdXJjZS5wdXNoKCdzZXRBdHRyaWJ1dGUoJyArIHBhcmFtcy5qb2luKCcsICcpICsgJyk7Jyk7XG59O1xuXG4vKipcbiAqIEludm9rZSBhbiBhcmJpdHJhcnkgcHJvZ3JhbSBhbmQgYXBwZW5kIHRvIHRoZSBjdXJyZW50IGVsZW1lbnQuXG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5pbnZva2VDb250ZW50ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgZWxlbWVudCA9IHRoaXMudG9wRWxlbWVudCgpO1xuICB2YXIgZGVwdGggICA9ICdkZXB0aCcgKyB0aGlzLmxhc3RDb250ZXh0O1xuICB2YXIgY2hpbGQgICA9IHRoaXMucG9wU3RhY2soKSArICcoJyArIGRlcHRoICsgJyknO1xuXG4gIHRoaXMuY29udGV4dC5hbGlhc2VzLmFwcGVuZENoaWxkID0gJ3RoaXMuYXBwZW5kQ2hpbGQnO1xuXG4gIHRoaXMuc291cmNlLnB1c2goJ2FwcGVuZENoaWxkKCcgKyBlbGVtZW50ICsgJywgJyArIGNoaWxkICsgJyk7Jyk7XG59O1xuXG4vKipcbiAqIE92ZXJyaWRlIHRoZSBwcm9ncmFtIGV4cHJlc3Npb24gZnVuY3Rpb24gdG8gcHJveHkgZGVwdGguXG4gKlxuICogQHBhcmFtICB7TnVtYmVyfSBndWlkXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5wcm9ncmFtRXhwcmVzc2lvbiA9IGZ1bmN0aW9uIChndWlkKSB7XG4gIHRoaXMuY29udGV4dC5hbGlhc2VzLnNlbGYgPSAndGhpcyc7XG5cbiAgaWYgKGd1aWQgPT0gbnVsbCkge1xuICAgIHJldHVybiAnc2VsZi5ub29wJztcbiAgfVxuXG4gIHZhciBjaGlsZCAgICAgICAgID0gdGhpcy5lbnZpcm9ubWVudC5jaGlsZHJlbltndWlkXTtcbiAgdmFyIGRlcHRocyAgICAgICAgPSBjaGlsZC5kZXB0aHMubGlzdDtcbiAgdmFyIHByb2dyYW1QYXJhbXMgPSBbY2hpbGQuaW5kZXgsIGNoaWxkLm5hbWUsICdkYXRhJ107XG5cbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGRlcHRocy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIHZhciBkZXB0aCA9IGRlcHRoc1tpXSArIHRoaXMuZW52aXJvbm1lbnQuZGVwdGhzLmxpc3QubGVuZ3RoO1xuXG4gICAgcHJvZ3JhbVBhcmFtcy5wdXNoKCdkZXB0aCcgKyAoZGVwdGggLSAxKSk7XG4gIH1cblxuICB2YXIgcGFyYW1zID0gcHJvZ3JhbVBhcmFtcy5qb2luKCcsICcpO1xuXG4gIGlmIChkZXB0aHMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuICdzZWxmLnByb2dyYW0oJyArIHBhcmFtcyArICcpJztcbiAgfVxuXG4gIHJldHVybiAnc2VsZi5wcm9ncmFtV2l0aERlcHRoKCcgKyBwYXJhbXMgKyAnKSc7XG59O1xuIiwidmFyIEhic1BhcnNlciAgPSByZXF1aXJlKFxuICAnaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL2NvbXBpbGVyL3BhcnNlcidcbikuZGVmYXVsdDtcbnZhciBIVE1MUGFyc2VyID0gcmVxdWlyZSgnaHRtbHBhcnNlcjIvbGliL1BhcnNlcicpO1xuXG4vKipcbiAqIFN0cmluZ2lmeSBhbiBgQVNULlByb2dyYW1Ob2RlYCBzbyBpdCBjYW4gYmUgcnVuIHRocm91Z2ggb3RoZXJzIHBhcnNlcnMuIFRoaXNcbiAqIGlzIHJlcXVpcmVkIGZvciB0aGUgbm9kZSB0byBiZSBwYXJzZWQgYXMgSFRNTCAqYWZ0ZXIqIGl0IGlzIHBhcnNlZCBhcyBhXG4gKiBIYW5kbGViYXJzIHRlbXBsYXRlLiBIYW5kbGViYXJzIG11c3QgYWx3YXlzIHJ1biBiZWZvcmUgdGhlIEhUTUwgcGFyc2VyLCBzb1xuICogaXQgY2FuIGNvcnJlY3RseSBtYXRjaCBibG9jayBub2RlcyAoSSBjb3VsZG4ndCBzZWUgYSBzaW1wbGUgd2F5IHRvIHJlc3VtZVxuICogdGhlIGVuZCBibG9jayBub2RlIHBhcnNpbmcpLlxuICpcbiAqIEBwYXJhbSAge0hhbmRsZWJhcnMuQVNULlByb2dyYW1Ob2RlfSBwcm9ncmFtXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKi9cbnZhciBzdHJpbmdpZnlQcm9ncmFtID0gZnVuY3Rpb24gKHByb2dyYW0pIHtcbiAgdmFyIGh0bWwgICAgICAgPSAnJztcbiAgdmFyIHN0YXRlbWVudHMgPSBwcm9ncmFtLnN0YXRlbWVudHM7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdGF0ZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHN0YXRlbWVudCA9IHN0YXRlbWVudHNbaV07XG5cbiAgICBpZiAoc3RhdGVtZW50LnR5cGUgPT09ICdjb250ZW50Jykge1xuICAgICAgaHRtbCArPSBzdGF0ZW1lbnQuc3RyaW5nO1xuICAgIH0gZWxzZSB7XG4gICAgICBodG1sICs9ICd7e2QnICsgaSArICd9fSc7IC8vIFwiQWxpYXNcIiBub2RlLlxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBodG1sO1xufTtcblxuLyoqXG4gKiBQYXJzZXMgYSB0ZXh0IHN0cmluZyByZXR1cm5lZCBmcm9tIHN0cmluZ2lmeWluZyBhIHByb2dyYW0gbm9kZS4gUmVwbGFjZXMgYW55XG4gKiBtdXN0YWNoZSBub2RlIHJlZmVyZW5jZXMgd2l0aCB0aGUgb3JpZ2luYWwgbm9kZS5cblxuICogQHBhcmFtICB7U3RyaW5nfSBpbnB1dFxuICogQHBhcmFtICB7T2JqZWN0fSBvcmlnaW5hbFByb2dyYW1cbiAqIEByZXR1cm4ge09iamVjdH1cbiAqL1xudmFyIHBhcnNlUHJvZ3JhbSA9IGZ1bmN0aW9uIChpbnB1dCwgb3JpZ2luYWxQcm9ncmFtKSB7XG4gIHZhciBwcm9ncmFtICAgID0gSGJzUGFyc2VyLnBhcnNlKGlucHV0KTtcbiAgdmFyIHN0YXRlbWVudHMgPSBwcm9ncmFtLnN0YXRlbWVudHM7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdGF0ZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHN0YXRlbWVudCA9IHN0YXRlbWVudHNbaV07XG5cbiAgICAvLyBSZXBsYWNlIG11c3RhY2hlIG5vZGVzLCB3aGljaCAqc2hvdWxkKiBvbmx5IGJlIHJlYWwgSGFuZGxlYmFycyBcImFsaWFzXCJcbiAgICAvLyBub2RlcyB0aGF0IHdlcmUgaW5qZWN0ZWQgYnkgdGhlIHN0cmluZ2lmaWNhdGlvbiBvZiB0aGUgcHJvZ3JhbSBub2RlLlxuICAgIGlmIChzdGF0ZW1lbnQudHlwZSA9PT0gJ211c3RhY2hlJykge1xuICAgICAgc3RhdGVtZW50c1tpXSA9IG9yaWdpbmFsUHJvZ3JhbS5zdGF0ZW1lbnRzW3N0YXRlbWVudC5pZC5zdHJpbmcuc3Vic3RyKDEpXTtcbiAgICAgIHN0YXRlbWVudCA9IHN0YXRlbWVudHNbaV07XG4gICAgfVxuXG4gICAgLy8gTmVlZCB0byByZWN1cnNpdmVseSByZXNvbHZlIGJsb2NrIG5vZGUgcHJvZ3JhbXMgYXMgSFRNTC5cbiAgICBpZiAoc3RhdGVtZW50LnR5cGUgPT09ICdibG9jaycpIHtcbiAgICAgIGlmIChzdGF0ZW1lbnQucHJvZ3JhbSkge1xuICAgICAgICBzdGF0ZW1lbnQucHJvZ3JhbSA9IHBhcnNlQXNIVE1MKHN0YXRlbWVudC5wcm9ncmFtKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHN0YXRlbWVudC5pbnZlcnNlKSB7XG4gICAgICAgIHN0YXRlbWVudC5pbnZlcnNlID0gcGFyc2VBc0hUTUwoc3RhdGVtZW50LmludmVyc2UpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBwcm9ncmFtO1xufTtcblxuLyoqXG4gKiBQYXJzZSBhIHByb2dyYW0gb2JqZWN0IGFzIEhUTUwgYW5kIHJldHVybiBhbiB1cGRhdGVkIHByb2dyYW0uXG4gKlxuICogQHBhcmFtICB7T2JqZWN0fSBvcmlnaW5hbFByb2dyYW1cbiAqIEByZXR1cm4ge09iamVjdH1cbiAqL1xudmFyIHBhcnNlQXNIVE1MID0gZnVuY3Rpb24gKG9yaWdpbmFsUHJvZ3JhbSkge1xuICB2YXIgeXkgICA9IEhic1BhcnNlci55eTtcbiAgdmFyIGh0bWwgPSBzdHJpbmdpZnlQcm9ncmFtKG9yaWdpbmFsUHJvZ3JhbSk7XG5cbiAgLy8gQ3JlYXRlIGFuZCByZXR1cm4gYSBuZXcgZW1wdHkgcHJvZ3JhbSBub2RlLlxuICB2YXIgY3JlYXRlUHJvZ3JhbSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gbmV3IHl5LlByb2dyYW1Ob2RlKFtdKTtcbiAgfTtcblxuICAvLyBTdGFydCB0aGUgc3RhY2sgd2l0aCBhbiBlbXB0eSBwcm9ncmFtIG5vZGUgd2hpY2ggd2lsbCBjb250YWluIGFsbCB0aGVcbiAgLy8gcGFyc2VkIGVsZW1lbnRzLlxuICB2YXIgcHJvZ3JhbSA9IGNyZWF0ZVByb2dyYW0oKTtcbiAgdmFyIHN0YWNrICAgPSBbcHJvZ3JhbV07XG4gIHZhciBlbGVtZW50O1xuXG4gIC8vIEdlbmVyYXRlIGEgbmV3IEhUTUwgcGFyc2VyIGluc3RhbmNlLlxuICB2YXIgcGFyc2VyID0gbmV3IEhUTUxQYXJzZXIoe1xuICAgIG9ub3BlbnRhZ25hbWU6IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICB2YXIgbm9kZSA9IG5ldyB5eS5ET01FbGVtZW50KG5hbWUsIFtdLCBjcmVhdGVQcm9ncmFtKCkpO1xuICAgICAgcHJvZ3JhbS5zdGF0ZW1lbnRzLnB1c2goZWxlbWVudCA9IG5vZGUpO1xuICAgICAgc3RhY2sucHVzaChwcm9ncmFtID0gbm9kZS5jb250ZW50KTtcbiAgICB9LFxuICAgIG9uY2xvc2V0YWc6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHN0YWNrLnBvcCgpO1xuICAgICAgZWxlbWVudCA9IG51bGw7XG4gICAgICBwcm9ncmFtID0gc3RhY2tbc3RhY2subGVuZ3RoIC0gMV07XG4gICAgfSxcbiAgICBvbmF0dHJpYnV0ZTogZnVuY3Rpb24gKG5hbWUsIHZhbHVlKSB7XG4gICAgICBlbGVtZW50LmF0dHJpYnV0ZXMucHVzaChuZXcgeXkuRE9NQXR0cmlidXRlKG5hbWUsIHZhbHVlKSk7XG4gICAgfSxcbiAgICBvbnRleHQ6IGZ1bmN0aW9uICh0ZXh0KSB7XG4gICAgICBwcm9ncmFtLnN0YXRlbWVudHMucHVzaCh0ZXh0KTtcbiAgICB9LFxuICAgIG9ucHJvY2Vzc2luZ2luc3RydWN0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Byb2Nlc3NpbmcgaW5zdHJ1Y3Rpb25zIGFyZSBub3Qgc3VwcG9ydGVkJyk7XG4gICAgfSxcbiAgICBvbmNvbW1lbnQ6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICBwcm9ncmFtLnN0YXRlbWVudHMucHVzaChuZXcgeXkuRE9NQ29tbWVudChkYXRhKSk7XG4gICAgfSxcbiAgICBvbmVycm9yOiBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfSwge1xuICAgIGRlY29kZUVudGl0aWVzOiB0cnVlXG4gIH0pO1xuXG4gIHBhcnNlci53cml0ZShodG1sKTtcbiAgcGFyc2VyLmVuZCgpO1xuXG4gIC8qKlxuICAgKiBSZWN1cnNpdmVseSBwYXJzZXMgbmVzdGVkIERPTSBlbGVtZW50cyBhcyBIYW5kbGViYXJzIHRlbXBsYXRlcy5cbiAgICpcbiAgICogQHBhcmFtICB7T2JqZWN0fSBwcm9ncmFtXG4gICAqIEBwYXJhbSAge09iamVjdH0gb3JpZ2luYWxQcm9ncmFtXG4gICAqIEByZXR1cm4ge09iamVjdH1cbiAgICovXG4gIHZhciBhc3QgPSAoZnVuY3Rpb24gcmVjdXJzZSAocHJvZ3JhbSwgb3JpZ2luYWxQcm9ncmFtKSB7XG4gICAgdmFyIHN0YXRlbWVudHMgPSBwcm9ncmFtLnN0YXRlbWVudHM7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN0YXRlbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBzdGF0ZW1lbnQgPSBzdGF0ZW1lbnRzW2ldO1xuXG4gICAgICBpZiAodHlwZW9mIHN0YXRlbWVudCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgdmFyIG1lcmdlID0gcGFyc2VQcm9ncmFtKHN0YXRlbWVudCwgb3JpZ2luYWxQcm9ncmFtKS5zdGF0ZW1lbnRzO1xuXG4gICAgICAgIHN0YXRlbWVudHMuc3BsaWNlLmFwcGx5KHN0YXRlbWVudHMsIFtpLCAxXS5jb25jYXQobWVyZ2UpKTtcbiAgICAgICAgaSArPSBtZXJnZS5sZW5ndGggLSAxO1xuICAgICAgfSBlbHNlIGlmIChzdGF0ZW1lbnQudHlwZSA9PT0gJ0RPTV9DT01NRU5UJykge1xuICAgICAgICBzdGF0ZW1lbnQudGV4dCA9IHBhcnNlUHJvZ3JhbShzdGF0ZW1lbnQudGV4dCwgb3JpZ2luYWxQcm9ncmFtKTtcbiAgICAgIH0gZWxzZSBpZiAoc3RhdGVtZW50LnR5cGUgPT09ICdET01fRUxFTUVOVCcpIHtcbiAgICAgICAgc3RhdGVtZW50Lm5hbWUgPSBwYXJzZVByb2dyYW0oc3RhdGVtZW50Lm5hbWUsIG9yaWdpbmFsUHJvZ3JhbSk7XG5cbiAgICAgICAgZm9yICh2YXIgayA9IDA7IGsgPCBzdGF0ZW1lbnQuYXR0cmlidXRlcy5sZW5ndGg7IGsrKykge1xuICAgICAgICAgIHZhciBhdHRyaWJ1dGUgPSBzdGF0ZW1lbnQuYXR0cmlidXRlc1trXTtcblxuICAgICAgICAgIGF0dHJpYnV0ZS5uYW1lICA9IHBhcnNlUHJvZ3JhbShhdHRyaWJ1dGUubmFtZSwgIG9yaWdpbmFsUHJvZ3JhbSk7XG4gICAgICAgICAgYXR0cmlidXRlLnZhbHVlID0gcGFyc2VQcm9ncmFtKGF0dHJpYnV0ZS52YWx1ZSwgb3JpZ2luYWxQcm9ncmFtKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlY3Vyc2Uoc3RhdGVtZW50LmNvbnRlbnQsIG9yaWdpbmFsUHJvZ3JhbSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHByb2dyYW07XG4gIH0pKHN0YWNrLnBvcCgpLCBvcmlnaW5hbFByb2dyYW0pO1xuXG4gIHJldHVybiBhc3Q7XG59O1xuXG4vKipcbiAqIFRoZSBwYXJzZXIgaXMgYSBzaW1wbGUgY29uc3RydWN0b3IuIEFsbCB0aGUgZnVuY3Rpb25hbGl0eSBpcyBvbiB0aGUgcHJvdG90eXBlXG4gKiBvYmplY3QuXG4gKi9cbnZhciBQYXJzZXIgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMueXkgPSB7fTtcbn07XG5cbi8qKlxuICogQWxpYXMgdGhlIHBhcnNlciBjb25zdHJ1Y3RvciBmdW5jdGlvbi5cbiAqXG4gKiBAdHlwZSB7RnVuY3Rpb259XG4gKi9cblBhcnNlci5wcm90b3R5cGUuUGFyc2VyID0gUGFyc2VyO1xuXG4vKipcbiAqIFRoZSBwcmltYXJ5IGZ1bmN0aW9uYWxpdHkgb2YgdGhlIHBhcnNlci4gUHVzaGVzIHRoZSBpbnB1dCB0ZXh0IHRocm91Z2hcbiAqIEhhbmRsZWJhcnMgYW5kIGEgSFRNTCBwYXJzZXIsIGdlbmVyYXRpbmcgYSBBU1QgZm9yIHVzZSB3aXRoIHRoZSBjb21waWxlci5cbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9IGlucHV0XG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cblBhcnNlci5wcm90b3R5cGUucGFyc2UgPSBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgSGJzUGFyc2VyLnl5ID0gdGhpcy55eTtcblxuICAvLyBQYXJzZSBpdCBhcyBhIEhhbmRsZWJhcnMgdG8gZXh0cmFjdCB0aGUgaW1wb3J0YW50IG5vZGVzIGZpcnN0LiBUaGVuIHdlXG4gIC8vIHN0cmluZ2lmeSB0aGUgbm9kZSB0byBzb21ldGhpbmcgdGhlIEhUTUwgcGFyc2VyIGNhbiBoYW5kbGUuIFRoZSBBU1QgdGhlXG4gIC8vIEhUTUwgcGFyc2VyIGdlbmVyYXRlcyB3aWxsIGJlIHBhcnNlZCB1c2luZyBIYW5kbGViYXJzIGFnYWluIHRvIGluamVjdCB0aGVcbiAgLy8gb3JpZ2luYWwgbm9kZXMgYmFjay5cbiAgcmV0dXJuIHBhcnNlQXNIVE1MKEhic1BhcnNlci5wYXJzZShpbnB1dCkpO1xufTtcblxuLyoqXG4gKiBFeHBvcnQgYSBzdGF0aWMgaW5zdGFuY2Ugb2YgdGhlIHBhcnNlci5cbiAqXG4gKiBAdHlwZSB7UGFyc2VyfVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBQYXJzZXIoKTtcbiIsInZhciBVdGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxuLyoqXG4gKiBFdmVudHMgb2JqZWN0IG1peGluLiBDcmVhdGVkIHRvIGtlZXAgdGhlIHJ1bnRpbWUgc2l6ZSBkb3duIHNpbmNlIGluY2x1ZGluZ1xuICogdGhlIG5vZGUgZXZlbnQgZW1pdHRlciBpcyBhIGh1Z2UgZGVwZW5kZW5jeS5cbiAqXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG52YXIgRXZlbnRzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuLyoqXG4gKiBMaXN0ZW4gdG8gYW55IGV2ZW50cyB0cmlnZ2VyZWQuXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSAgIG5hbWVcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICogQHBhcmFtICB7T2JqZWN0fSAgIGNvbnRleHRcbiAqIEByZXR1cm4ge0V2ZW50c31cbiAqL1xuRXZlbnRzLm9uID0gZnVuY3Rpb24gKG5hbWUsIGZuLCBjb250ZXh0KSB7XG4gIHRoaXMuX2V2ZW50cyB8fCAodGhpcy5fZXZlbnRzID0ge30pO1xuICB2YXIgZXZlbnRzID0gdGhpcy5fZXZlbnRzW25hbWVdIHx8ICh0aGlzLl9ldmVudHNbbmFtZV0gPSBbXSk7XG4gIGV2ZW50cy5wdXNoKHsgZm46IGZuLCBjb250ZXh0OiBjb250ZXh0IH0pO1xufTtcblxuLyoqXG4gKiBMaXN0ZW4gdG8gYW55IGV2ZW50cyB0cmlnZ2VyZWQgb25jZS5cbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9ICAgbmFtZVxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gKiBAcGFyYW0gIHtPYmplY3R9ICAgY29udGV4dFxuICogQHJldHVybiB7RXZlbnRzfVxuICovXG5FdmVudHMub25jZSA9IGZ1bmN0aW9uIChuYW1lLCBmbiwgY29udGV4dCkge1xuICB2YXIgdGhhdCA9IHRoaXM7XG5cbiAgLy8gVXNpbmcgdGhlIGBvbmAgZnVuY3Rpb25hbGl0eSB3ZSBjYW4gY3JlYXRlIGEgYG9uY2VgIGZ1bmN0aW9uLlxuICB0aGlzLm9uKG5hbWUsIGZ1bmN0aW9uIHNlbGYgKCkge1xuICAgIHRoYXQub2ZmKG5hbWUsIHNlbGYpO1xuICAgIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH0sIGNvbnRleHQpO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgYW4gZXZlbnQgbGlzdGVuZXIuXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSAgIG5hbWVcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICogQHBhcmFtICB7T2JqZWN0fSAgIGNvbnRleHRcbiAqIEByZXR1cm4ge0V2ZW50c31cbiAqL1xuRXZlbnRzLm9mZiA9IGZ1bmN0aW9uIChuYW1lLCBmbiwgY29udGV4dCkge1xuICAvLyBEZWxldGUgYWxsIGV2ZW50IGxpc3RlbmVycyB3aGVuIG5vIGFyZ3VtZW50cyBhcmUgcGFzc2VkIGluLlxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBkZWxldGUgdGhpcy5fZXZlbnRzO1xuICB9XG5cbiAgLy8gRGVsZXRlIGFuIGVudGlyZSBldmVudCBuYW1lc3BhY2Ugd2hlbiBvbmx5IHRoZSBuYW1lIGlzIHBhc3NlZCBpbi5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gZGVsZXRlIHRoaXMuX2V2ZW50c1tuYW1lXTtcbiAgfVxuXG4gIC8vIElmIHRoZSBuYW1lc3BhY2UgZG9lcyBub3QgZXhpc3QsIHJldHVybiBlYXJseS5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1tuYW1lXSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIEl0ZXJhdGUgb3ZlciB0aGUgZXZlbnQgbmFtZXNwYWNlIGFuZCBkZWxldGUgbGlzdGVuZXJzIHdoZXJlIHRoZSBmdW5jdGlvblxuICAvLyBpZGVudGl0aWVzIGFuZCBvcHRpb25hbCBjb250ZXh0IG1hdGNoZXMuXG4gIHZhciBldmVudHMgPSB0aGlzLl9ldmVudHNbbmFtZV07XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZXZlbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGV2ZW50c1tpXS5mbiA9PT0gZm4pIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAyIHx8IGV2ZW50c1tpXS5jb250ZXh0ID09PSBjb250ZXh0KSB7XG4gICAgICAgIGV2ZW50cy5zcGxpY2UoaSwgMSk7XG4gICAgICAgIGktLTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBSZW1vdmUgZW1wdHkgbmFtZXNwYWNlcy5cbiAgaWYgKCFldmVudHMubGVuZ3RoKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1tuYW1lXTtcbiAgfVxufTtcblxuLyoqXG4gKiBFbWl0IGFuIGV2ZW50LlxuICpcbiAqIEBwYXJhbSAge1N0cmluZ30gbmFtZVxuICogQHBhcmFtICB7Kn0gICAgICAuLi5cbiAqIEByZXR1cm4ge0V2ZW50c31cbiAqL1xuRXZlbnRzLmVtaXQgPSBVdGlscy52YXJpYWRpYyhmdW5jdGlvbiAobmFtZSwgYXJncykge1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW25hbWVdKSB7IHJldHVybjsgfVxuXG4gIC8vIENyZWF0ZSBhIHJlcGxpY2F0ZWQgYXJyYXkgb2YgdGhlIGV2ZW50IG5hbWVzcGFjZSBzbyB1bnN1YnNjcmliaW5nIHdpdGhpblxuICAvLyBjYWxscyAoRS5nLiBgb2ZmYCkgZG9lc24ndCBicmVhayB0aGUgaXRlcmF0aW9uLlxuICB2YXIgZXZlbnRzID0gdGhpcy5fZXZlbnRzW25hbWVdLnNsaWNlKCk7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBldmVudHMubGVuZ3RoOyBpKyspIHtcbiAgICBldmVudHNbaV0uZm4uYXBwbHkoZXZlbnRzW2ldLmNvbnRleHQsIGFyZ3MpO1xuICB9XG59KTtcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL2V4Y2VwdGlvbicpLmRlZmF1bHQ7XG4iLCJ2YXIgZ2xvYmFsPXR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fTt2YXIgY3VycmVudFRpbWUgPSBnbG9iYWwuRGF0ZS5ub3cgfHwgKGZ1bmN0aW9uICgpIHtcbiAgdmFyIENvbnN0dWN0b3IgPSBnbG9iYWwuRGF0ZTtcblxuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBuZXcgQ29uc3R1Y3RvcigpLmdldFRpbWUoKTtcbiAgfTtcbn0pKCk7XG5cblxudmFyIHNldFRpbWVyICAgPSBnbG9iYWwuc2V0VGltZW91dDtcbnZhciBjbGVhclRpbWVyID0gZ2xvYmFsLmNsZWFyVGltZW91dDtcblxuLyoqXG4gKiBGYWxsYmFjayBhbmltYXRpb24gZnJhbWUgaW1wbGVtZW50YXRpb24uXG4gKlxuICogQHJldHVybiB7RnVuY3Rpb259XG4gKi9cbnZhciBmYWxsYmFjayA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHByZXYgPSBjdXJyZW50VGltZSgpO1xuXG4gIHJldHVybiBmdW5jdGlvbiAoZm4pIHtcbiAgICB2YXIgY3VyciA9IGN1cnJlbnRUaW1lKCk7XG4gICAgdmFyIG1zICAgPSBNYXRoLm1heCgwLCAxNiAtIChjdXJyIC0gcHJldikpO1xuICAgIHZhciByZXEgID0gc2V0VGltZXIoZm4sIG1zKTtcblxuICAgIHByZXYgPSBjdXJyO1xuXG4gICAgcmV0dXJuIHJlcTtcbiAgfTtcbn07XG5cbi8qKlxuICogRXhwb3NlIGByZXF1ZXN0QW5pbWF0aW9uRnJhbWVgLlxuICpcbiAqIEB0eXBlIHtGdW5jdGlvbn1cbiAqL1xuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gZ2xvYmFsLnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICBnbG9iYWwud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gIGdsb2JhbC5tb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgZ2xvYmFsLm1zUmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gIGdsb2JhbC5vUmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gIGZhbGxiYWNrKCk7XG5cbi8qKlxuICogQ2FuY2VsIHRoZSBhbmltYXRpb24gZnJhbWUuXG4gKlxuICogQHR5cGUge0Z1bmN0aW9ufVxuICovXG52YXIgY2FuY2VsID0gZ2xvYmFsLmNhbmNlbEFuaW1hdGlvbkZyYW1lIHx8XG4gIGdsb2JhbC53ZWJraXRDYW5jZWxBbmltYXRpb25GcmFtZSB8fFxuICBnbG9iYWwubW96Q2FuY2VsQW5pbWF0aW9uRnJhbWUgfHxcbiAgZ2xvYmFsLm1zQ2FuY2VsQW5pbWF0aW9uRnJhbWUgfHxcbiAgZ2xvYmFsLm9DYW5jZWxBbmltYXRpb25GcmFtZSB8fFxuICBjbGVhclRpbWVyO1xuXG4vKipcbiAqIENhbmNlbCBhbiBhbmltYXRpb24gZnJhbWUuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IGlkXG4gKi9cbmV4cG9ydHMuY2FuY2VsID0gZnVuY3Rpb24gKGlkKSB7XG4gIGNhbmNlbC5jYWxsKGdsb2JhbCwgaWQpO1xufTtcbiIsInZhciBoYnNWTSA9IHJlcXVpcmUoJ2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9ydW50aW1lJyk7XG52YXIgVXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG52YXIgcmFmICAgPSByZXF1aXJlKCcuL3JhZicpO1xuXG4vKipcbiAqIEtlZXAgYSBtYXAgb2YgYXR0cmlidXRlcyB0aGF0IG5lZWQgdG8gdXBkYXRlIHRoZSBjb3JyZXNwb25kaW5nIHByb3BlcnRpZXMuXG4gKlxuICogQHR5cGUge09iamVjdH1cbiAqL1xudmFyIGF0dHJQcm9wcyA9IHtcbiAgSU5QVVQ6IHtcbiAgICB2YWx1ZTogICAndmFsdWUnLFxuICAgIGNoZWNrZWQ6ICdjaGVja2VkJ1xuICB9LFxuICBPUFRJT046IHtcbiAgICBzZWxlY3RlZDogJ3NlbGVjdGVkJ1xuICB9XG59O1xuXG4vKipcbiAqIEl0ZXJhdGUgb3ZlciBhIHN1YnNjcmlwdGlvbnMgb2JqZWN0LCBjYWxsaW5nIGEgZnVuY3Rpb24gd2l0aCB0aGUgb2JqZWN0XG4gKiBwcm9wZXJ0eSBkZXRhaWxzIGFuZCBhIHVuaXF1ZSBjYWxsYmFjayBmdW5jdGlvbi5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSAgICBzdWJzY3JpcHRpb25zXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAqL1xudmFyIGl0ZXJhdGVTdWJzY3JpcHRpb25zID0gZnVuY3Rpb24gKHN1YnNjcmlwdGlvbnMsIGZuLCBjb250ZXh0KSB7XG4gIGZvciAodmFyIGlkIGluIHN1YnNjcmlwdGlvbnMpIHtcbiAgICBmb3IgKHZhciBwcm9wZXJ0eSBpbiBzdWJzY3JpcHRpb25zW2lkXSkge1xuICAgICAgZm4uY2FsbChjb250ZXh0LCBzdWJzY3JpcHRpb25zW2lkXVtwcm9wZXJ0eV0sIHByb3BlcnR5LCBpZCk7XG4gICAgfVxuICB9XG59O1xuXG4vKipcbiAqIENyZWF0ZSBhIG5ldyBzdWJzY2lwdGlvbiBpbnN0YW5jZS4gVGhpcyBmdW5jdGlvbmFsaXR5IGlzIHRpZ2h0bHkgY291cGxlZCB0b1xuICogRE9NQmFycyBwcm9ncmFtIGV4ZWN1dGlvbi5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHBhcmFtIHtGdW5jdGlvbn0gdXBkYXRlXG4gKiBAcGFyYW0ge09iamVjdH0gICBjb250YWluZXJcbiAqIEBwYXJhbSB7T2JqZWN0fSAgIGVudlxuICovXG52YXIgU3Vic2NyaXB0aW9uID0gZnVuY3Rpb24gKGZuLCB1cGRhdGUsIGNvbnRhaW5lciwgZW52KSB7XG4gIC8vIEFsaWFzIHBhc3NlZCBpbiB2YXJpYWJsZXMgZm9yIGxhdGVyIGFjY2Vzcy5cbiAgdGhpcy5fZm4gICAgICAgID0gZm47XG4gIHRoaXMuX3VwZGF0ZSAgICA9IHVwZGF0ZTtcbiAgdGhpcy5fY29udGFpbmVyID0gY29udGFpbmVyO1xuICB0aGlzLl9lbnYgICAgICAgPSBlbnY7XG5cbiAgLy8gQXNzaWduIGV2ZXJ5IHN1YnNjcmlwdGlvbiBpbnN0YW5jZSBhIHVuaXF1ZSBpZC4gVGhpcyBoZWxwcyB3aXRoIGxpbmtpbmdcbiAgLy8gYmV0d2VlbiBwYXJlbnQgYW5kIGNoaWxkIHN1YnNjcmlwdGlvbiBpbnN0YW5jZXMuXG4gIHRoaXMuY2lkICAgICAgICAgICAgID0gJ2MnICsgVXRpbHMudW5pcXVlSWQoKTtcbiAgdGhpcy5jaGlsZHJlbiAgICAgICAgPSB7fTtcbiAgdGhpcy5zdWJzY3JpcHRpb25zICAgPSB7fTtcbiAgdGhpcy51bnN1YnNjcmlwdGlvbnMgPSBbXTtcblxuICAvLyBDcmVhdGUgc3RhdGljYWxseSBib3VuZCBmdW5jdGlvbiBpbnN0YW5jZXMgZm9yIHB1YmxpYyBjb25zdW1wdGlvbi5cbiAgdGhpcy5ib3VuZFVwZGF0ZSAgICAgICAgID0gVXRpbHMuYmluZCh0aGlzLnVwZGF0ZSwgdGhpcyk7XG4gIHRoaXMuYm91bmRVbnN1YnNjcmlwdGlvbiA9IFV0aWxzLmJpbmQodGhpcy51bnN1YnNjcmlwdGlvbiwgdGhpcyk7XG59O1xuXG4vKipcbiAqIEV4cG9zZSB0aGUgaW50ZXJuYWwgc3VzYmNyaWJlIGZ1bmN0aW9uYWxpdHkgZm9yIHRoZSBjb250YWluZXIuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdFxuICogQHBhcmFtIHtTdHJpbmd9IHByb3BlcnR5XG4gKiBAcGFyYW0ge1N0cmluZ30gaWRcbiAqL1xuU3Vic2NyaXB0aW9uLnByb3RvdHlwZS5zdWJzY3JpYmUgPSBmdW5jdGlvbiAob2JqZWN0LCBwcm9wZXJ0eSwgaWQpIHtcbiAgKHRoaXMuc3Vic2NyaXB0aW9uc1tpZF0gfHwgKHRoaXMuc3Vic2NyaXB0aW9uc1tpZF0gPSB7fSkpW3Byb3BlcnR5XSA9IG9iamVjdDtcbn07XG5cbi8qKlxuICogUGFzcyBhIGN1c3RvbSB1bnN1YnNjcmlwdGlvbiBmdW5jdGlvbiB0aGF0IHdpbGwgZXhlY3V0ZSB3aGVuIHdlIHVuc3Vic2NyaWJlLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKi9cblN1YnNjcmlwdGlvbi5wcm90b3R5cGUudW5zdWJzY3JpcHRpb24gPSBmdW5jdGlvbiAoZm4pIHtcbiAgVXRpbHMuaXNGdW5jdGlvbihmbikgJiYgdGhpcy51bnN1YnNjcmlwdGlvbnMucHVzaChmbik7XG59O1xuXG4vKipcbiAqIFVuc3Vic2NyaWJlIGZyb20gYSBzdWJjcmlwdGlvbnMgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBzdWJzY3JpcHRpb25zXG4gKi9cblN1YnNjcmlwdGlvbi5wcm90b3R5cGUuX3Vuc3Vic2NyaWJlID0gZnVuY3Rpb24gKHN1YnNjcmlwdGlvbnMpIHtcbiAgaXRlcmF0ZVN1YnNjcmlwdGlvbnMoc3Vic2NyaXB0aW9ucywgZnVuY3Rpb24gKG9iamVjdCwgcHJvcGVydHksIGlkKSB7XG4gICAgZGVsZXRlIHN1YnNjcmlwdGlvbnNbaWRdW3Byb3BlcnR5XTtcbiAgICB0aGlzLl9lbnYudW5zdWJzY3JpYmUob2JqZWN0LCBwcm9wZXJ0eSwgdGhpcy5ib3VuZFVwZGF0ZSk7XG4gIH0sIHRoaXMpO1xufTtcblxuLyoqXG4gKiBJdGVyYXRlIG92ZXIgYW4gYXJyYXkgb2YgdW5zdWJzY3JpcHRpb25zLlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHVuc3Vic2NyaXB0aW9uc1xuICovXG5TdWJzY3JpcHRpb24ucHJvdG90eXBlLl91bnN1YnNjcmlwdGlvbiA9IGZ1bmN0aW9uICh1bnN1YnNjcmlwdGlvbnMpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB1bnN1YnNjcmlwdGlvbnMubGVuZ3RoOyBpKyspIHtcbiAgICB1bnN1YnNjcmlwdGlvbnNbaV0oKTtcbiAgfVxufTtcblxuLyoqXG4gKiBVbnN1YnNjcmliZSBldmVyeXRoaW5nIGZyb20gdGhlIGN1cnJlbnQgaW5zdGFuY2UuXG4gKi9cblN1YnNjcmlwdGlvbi5wcm90b3R5cGUudW5zdWJzY3JpYmUgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuX3Vuc3Vic2NyaWJlKHRoaXMuc3Vic2NyaXB0aW9ucyk7XG4gIHRoaXMuX3Vuc3Vic2NyaXB0aW9uKHRoaXMudW5zdWJzY3JpcHRpb25zKTtcblxuICAvLyBEZWxldGUgYW55IHJlZmVyZW5jZSB0byB0aGlzIHN1YnNjcmlwdGlvbiBmcm9tIHRoZSBwYXJlbnQuXG4gIGlmICh0aGlzLnBhcmVudCkge1xuICAgIGRlbGV0ZSB0aGlzLnBhcmVudC5jaGlsZHJlblt0aGlzLmNpZF07XG4gICAgZGVsZXRlIHRoaXMucGFyZW50O1xuICB9XG5cbiAgLy8gQ2FuY2VsIGFueSBjdXJyZW50bHkgZXhlY3V0aW5nIGZ1bmN0aW9ucy4gV2UgYWxzbyBuZWVkIHRvIHNldCBhblxuICAvLyB1bnN1YnNjcmliZWQgZmxhZyBpbiBjYXNlIHRoZSBmdW5jdGlvbiBpcyBzdGlsbCBhdmFpbGFibGUgc29tZXdoZXJlIGFuZFxuICAvLyBjYWxsZWQgYWZ0ZXIgdW5zdWJzY3JpcHRpb24gaGFzIG9jY3VyZWQuXG4gIFZNLmV4ZWMuY2FuY2VsKHRoaXMuX2V4ZWNJZCk7XG4gIHRoaXMuX3Vuc3Vic2NyaWJlZCA9IHRydWU7XG4gIHRoaXMuX3Vuc3Vic2NyaWJlQ2hpbGRyZW4oKTtcblxuICAvLyBSZW1vdmUgdW53YW50ZWQgbGluZ2VyaW5nIHJlZmVyZW5jZXMuXG4gIGRlbGV0ZSB0aGlzLmNoaWxkcmVuO1xuICBkZWxldGUgdGhpcy5zdWJzY3JpcHRpb25zO1xuICBkZWxldGUgdGhpcy51bnN1YnNjcmlwdGlvbnM7XG4gIGRlbGV0ZSB0aGlzLl9mbjtcbiAgZGVsZXRlIHRoaXMuX2VudjtcbiAgZGVsZXRlIHRoaXMuX3VwZGF0ZTtcbiAgZGVsZXRlIHRoaXMuX2NvbnRhaW5lcjtcbiAgZGVsZXRlIHRoaXMuYm91bmRVcGRhdGU7XG4gIGRlbGV0ZSB0aGlzLmJvdW5kVW5zdWJzY3JpcHRpb247XG59O1xuXG4vKipcbiAqIFVuc3Vic2NyaWJlIHRoZSBjdXJyZW50IGluc3RhbmNlIGNoaWxkcmVuLlxuICovXG5TdWJzY3JpcHRpb24ucHJvdG90eXBlLl91bnN1YnNjcmliZUNoaWxkcmVuID0gZnVuY3Rpb24gKCkge1xuICBmb3IgKHZhciBjaGlsZCBpbiB0aGlzLmNoaWxkcmVuKSB7XG4gICAgdGhpcy5jaGlsZHJlbltjaGlsZF0udW5zdWJzY3JpYmUoKTtcbiAgfVxufTtcblxuLyoqXG4gKiBFeGVjdXRlIHRoZSBzdWJzY3JpcHRpb24gZnVuY3Rpb24uXG4gKlxuICogQHJldHVybiB7Kn1cbiAqL1xuU3Vic2NyaXB0aW9uLnByb3RvdHlwZS5leGVjdXRlID0gZnVuY3Rpb24gKCkge1xuICAvLyBJZiB3ZSBoYXZlIGFuIGV4aXN0aW5nIHN1YnNjcmlwdGlvbiwgbGluayB0aGUgc3Vic2NyaXB0aW9ucyB0b2dldGhlci5cbiAgaWYgKHRoaXMuX2NvbnRhaW5lci5zdWJzY3JpcHRpb24pIHtcbiAgICB0aGlzLnBhcmVudCA9IHRoaXMuX2NvbnRhaW5lci5zdWJzY3JpcHRpb247XG4gICAgdGhpcy5wYXJlbnQuY2hpbGRyZW5bdGhpcy5jaWRdID0gdGhpcztcbiAgfVxuXG4gIC8vIEFsaWFzIHRoZSBjdXJyZW50IHN1YnNjcmlwdGlvbnMgb2JqZWN0IGZvciBkaWZmaW5nIGFmdGVyIGV4ZWN1dGlvbi5cbiAgdGhpcy5fc3Vic2NyaXB0aW9ucyA9IHRoaXMuc3Vic2NyaXB0aW9ucztcbiAgdGhpcy5fdW5zdWJzY3JpcHRpb24odGhpcy51bnN1YnNjcmlwdGlvbnMpO1xuXG4gIC8vIFJlc2V0IHRoZSBzdWJzY3JpcHRpb25zIGFuZCB1bnN1YnNjcmlwdGlvbnMgb2JqZWN0cyBiZWZvcmUgZXhlY3V0aW9uLlxuICB0aGlzLnN1YnNjcmlwdGlvbnMgICA9IHt9O1xuICB0aGlzLnVuc3Vic2NyaXB0aW9ucyA9IFtdO1xuXG4gIHRoaXMuX2NvbnRhaW5lci5zdWJzY3JpcHRpb24gPSB0aGlzO1xuICB2YXIgcmVzdWx0ID0gdGhpcy5fZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgdGhpcy5fY29udGFpbmVyLnN1YnNjcmlwdGlvbiA9IHRoaXMucGFyZW50O1xuXG4gIC8vIFRoZSBjdXJyZW50IHN1YnNjcmlwdGlvbnMgb2JqZWN0IG5lZWRzIHRvIGJlIGNvbXBhcmVkIGFnYWluc3QgdGhlIHByZXZpb3VzXG4gIC8vIHN1YnNjcmlwdGlvbnMgYW5kIGFueSBkaWZmZW5jZXMgZml4ZWQuXG4gIHZhciBjdXJyZW50ICA9IHRoaXMuc3Vic2NyaXB0aW9ucztcbiAgdmFyIHByZXZpb3VzID0gdGhpcy5fc3Vic2NyaXB0aW9ucztcblxuICAvLyBJdGVyYXRlIG92ZXIgdGhlIG5ldyBzdWJzY3JpcHRpb25zIG9iamVjdC4gQ2hlY2sgZXZlcnkga2V5IGluIHRoZSBvYmplY3RcbiAgLy8gYWdhaW5zdCB0aGUgcHJldmlvdXMgc3Vic2NyaXB0aW9ucy4gSWYgaXQgZXhpc3RzIGluIHRoZSBwcmV2aW91cyBvYmplY3QsXG4gIC8vIGl0IG1lYW5zIHdlIGFyZSBhbHJlYWR5IHN1YnNjcmliZWQuIE90aGVyd2lzZSB3ZSBuZWVkIHRvIHN1YnNjcmliZSB0b1xuICAvLyB0aGUgbmV3IHByb3BlcnR5LlxuICBpdGVyYXRlU3Vic2NyaXB0aW9ucyhjdXJyZW50LCBmdW5jdGlvbiAob2JqZWN0LCBwcm9wZXJ0eSwgaWQpIHtcbiAgICBpZiAocHJldmlvdXNbaWRdICYmIHByZXZpb3VzW2lkXVtwcm9wZXJ0eV0pIHtcbiAgICAgIHJldHVybiBkZWxldGUgcHJldmlvdXNbaWRdW3Byb3BlcnR5XTtcbiAgICB9XG5cbiAgICB0aGlzLl9lbnYuc3Vic2NyaWJlKG9iamVjdCwgcHJvcGVydHksIHRoaXMuYm91bmRVcGRhdGUpO1xuICB9LCB0aGlzKTtcblxuICAvLyBJdGVyYXRlIG92ZXIgYWxsIHJlbWFpbmluZyBwcmV2aW91cyBzdWJzY3JpcHRpb25zIGFuZCB1bnN1YnNjcmliZSB0aGVtLlxuICBkZWxldGUgdGhpcy5fc3Vic2NyaXB0aW9ucztcbiAgdGhpcy5fdW5zdWJzY3JpYmUocHJldmlvdXMpO1xuXG4gIHJldHVybiByZXN1bHQ7XG59O1xuXG4vKipcbiAqIFVwZGF0ZSB0aGUgc3VzYmNyaXB0aW9uIGluc3RhbmNlIHdpdGggY2hhbmdlcy5cbiAqXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICovXG5TdWJzY3JpcHRpb24ucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMuX3RyaWdnZXJlZCB8fCB0aGlzLl91bnN1YnNjcmliZWQpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBCbG9jayB0cmlnZ2VycyBmcm9tIG9jY3VyaW5nIGJldHdlZW4gYW5pbWF0aW9uIGZyYW1lcy5cbiAgdGhpcy5fdHJpZ2dlcmVkID0gdHJ1ZTtcbiAgdGhpcy5fdW5zdWJzY3JpYmVDaGlsZHJlbigpO1xuXG4gIHRoaXMuX2V4ZWNJZCA9IFZNLmV4ZWMoVXRpbHMuYmluZChmdW5jdGlvbiAoKSB7XG4gICAgZGVsZXRlIHRoaXMuX3RyaWdnZXJlZDtcbiAgICB0aGlzLl91cGRhdGUodGhpcy5leGVjdXRlKCkpO1xuICB9LCB0aGlzKSk7XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIEV4dGVuZCB0aGUgSGFuZGxlYmFycyBydW50aW1lIGVudmlyb25tZW50IHdpdGggRE9NIHNwZWNpZmljIGhlbHBlcnMuXG4gKlxuICogQHR5cGUge09iamVjdH1cbiAqL1xudmFyIFZNID0gbW9kdWxlLmV4cG9ydHMgPSBVdGlscy5jcmVhdGUoaGJzVk0pO1xuXG4vKipcbiAqIEJpbmQgYSBmdW5jdGlvbiB0byB0aGUgYW5pbWF0aW9uIGZyYW1lLlxuICpcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7TnVtYmVyfVxuICovXG5WTS5leGVjID0gZnVuY3Rpb24gKGZuKSB7XG4gIHJldHVybiByYWYoZm4pO1xufTtcblxuLyoqXG4gKiBDYW5jZWwgYW4gZXhlY3V0aW9uLlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBpZFxuICovXG5WTS5leGVjLmNhbmNlbCA9IGZ1bmN0aW9uIChpZCkge1xuICByZXR1cm4gcmFmLmNhbmNlbChpZCk7XG59O1xuXG4vKipcbiAqIENyZWF0ZSBhbiBlbGVtZW50IGZyb20gYSB0YWcgbmFtZS5cbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9IHRhZ05hbWVcbiAqIEBwYXJhbSAge09iamVjdH0gZW52XG4gKiBAcmV0dXJuIHtOb2RlfVxuICovXG5WTS5jcmVhdGVFbGVtZW50ID0gZnVuY3Rpb24gKHRhZ05hbWUsIGVudikge1xuICB2YXIgbm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnTmFtZSk7XG4gIGVudi5lbWl0KCdjcmVhdGVFbGVtZW50Jywgbm9kZSk7XG4gIHJldHVybiBub2RlO1xufTtcblxuLyoqXG4gKiBDb3B5IGFsbCB0aGUgZGF0YSBmcm9tIG9uZSBlbGVtZW50IHRvIGFub3RoZXIgYW5kIHJlcGxhY2UgaW4gcGxhY2UuXG4gKlxuICogQHBhcmFtICB7Tm9kZX0gICBub2RlXG4gKiBAcGFyYW0gIHtTdHJpbmd9IHRhZ05hbWVcbiAqIEBwYXJhbSAge09iamVjdH0gZW52XG4gKiBAcmV0dXJuIHtOb2RlfVxuICovXG5WTS5zZXRUYWdOYW1lID0gZnVuY3Rpb24gKG5vZGUsIHRhZ05hbWUsIGVudikge1xuICB2YXIgbmV3Tm9kZSA9IFZNLmNyZWF0ZUVsZW1lbnQodGFnTmFtZSwgZW52KTtcblxuICAvLyBNb3ZlIGFsbCBjaGlsZCBlbGVtZW50cyB0byB0aGUgbmV3IG5vZGUuXG4gIHdoaWxlIChub2RlLmZpcnN0Q2hpbGQpIHtcbiAgICBuZXdOb2RlLmFwcGVuZENoaWxkKG5vZGUuZmlyc3RDaGlsZCk7XG4gIH1cblxuICAvLyBDb3B5IGFsbCB0aGUgYXR0cmlidXRlcyB0byB0aGUgbmV3IG5vZGUuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZS5hdHRyaWJ1dGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGF0dHJpYnV0ZSA9IG5vZGUuYXR0cmlidXRlc1tpXTtcbiAgICBWTS5zZXRBdHRyaWJ1dGUobmV3Tm9kZSwgYXR0cmlidXRlLm5hbWUsIGF0dHJpYnV0ZS52YWx1ZSwgZW52KTtcbiAgfVxuXG4gIC8vIFJlcGxhY2UgdGhlIG5vZGUgcG9zaXRpb24gaW4gdGhlIHBsYWNlLlxuICBub2RlLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKG5ld05vZGUsIG5vZGUpO1xuXG4gIHJldHVybiBuZXdOb2RlO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgYW4gYXR0cmlidXRlIGZyb20gYW4gZWxlbWVudC5cbiAqXG4gKiBAcGFyYW0ge05vZGV9ICAgZWxcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gKiBAcGFyYW0ge09iamVjdH0gZW52XG4gKi9cblZNLnJlbW92ZUF0dHJpYnV0ZSA9IGZ1bmN0aW9uIChlbCwgbmFtZSwgZW52KSB7XG4gIGlmICghZWwuaGFzQXR0cmlidXRlKG5hbWUpKSB7IHJldHVybjsgfVxuXG4gIGVudi5lbWl0KCdyZW1vdmVBdHRyaWJ1dGUnLCBlbCwgbmFtZSk7XG4gIGVsLnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcblxuICAvLyBVbnNldCB0aGUgRE9NIHByb3BlcnR5IHdoZW4gdGhlIGF0dHJpYnV0ZSBpcyByZW1vdmVkLlxuICBpZiAoYXR0clByb3BzW2VsLnRhZ05hbWVdICYmIGF0dHJQcm9wc1tlbC50YWdOYW1lXVtuYW1lXSkge1xuICAgIGVsW2F0dHJQcm9wc1tlbC50YWdOYW1lXVtuYW1lXV0gPSBudWxsO1xuICB9XG59O1xuXG4vKipcbiAqIFNldCBhbiBhdHRyaWJ1dGUgdmFsdWUgb24gYW4gZWxlbWVudC5cbiAqXG4gKiBAcGFyYW0ge05vZGV9ICAgZWxcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gKiBAcGFyYW0geyp9ICAgICAgdmFsdWVcbiAqIEBwYXJhbSB7T2JqZWN0fSBlbnZcbiAqL1xuVk0uc2V0QXR0cmlidXRlID0gZnVuY3Rpb24gKGVsLCBuYW1lLCB2YWx1ZSwgZW52KSB7XG4gIGlmICh2YWx1ZSA9PT0gZmFsc2UpIHtcbiAgICByZXR1cm4gVk0ucmVtb3ZlQXR0cmlidXRlKGVsLCBuYW1lLCBlbnYpO1xuICB9XG5cbiAgZW52LmVtaXQoJ3NldEF0dHJpYnV0ZScsIGVsLCBuYW1lLCB2YWx1ZSk7XG4gIGVsLnNldEF0dHJpYnV0ZShuYW1lLCB2YWx1ZSk7XG5cbiAgLy8gVXBkYXRlIHRoZSBET00gcHJvcGVydHkgd2hlbiB0aGUgYXR0cmlidXRlIGNoYW5nZXMuXG4gIGlmIChhdHRyUHJvcHNbZWwudGFnTmFtZV0gJiYgYXR0clByb3BzW2VsLnRhZ05hbWVdW25hbWVdKSB7XG4gICAgZWxbYXR0clByb3BzW2VsLnRhZ05hbWVdW25hbWVdXSA9IHZhbHVlO1xuICB9XG59O1xuXG4vKipcbiAqIENyZWF0ZSBhIGNvbW1lbnQgbm9kZSBiYXNlZCBvbiB0ZXh0IGNvbnRlbnRzLlxuICpcbiAqIEBwYXJhbSAge1N0cmluZ30gY29udGVudHNcbiAqIEBwYXJhbSAge09iamVjdH0gZW52XG4gKiBAcmV0dXJuIHtOb2RlfVxuICovXG5WTS5jcmVhdGVDb21tZW50ID0gZnVuY3Rpb24gKHRhZ05hbWUsIGVudikge1xuICB2YXIgbm9kZSA9IGRvY3VtZW50LmNyZWF0ZUNvbW1lbnQodGFnTmFtZSk7XG4gIGVudi5lbWl0KCdjcmVhdGVDb21tZW50Jywgbm9kZSk7XG4gIHJldHVybiBub2RlO1xufTtcblxuLyoqXG4gKiBHZW5lcmF0ZSBhbiBleGVjdXRhYmxlIHRlbXBsYXRlIGZyb20gYSB0ZW1wbGF0ZSBzcGVjLlxuICpcbiAqIEBwYXJhbSAge09iamVjdH0gICB0ZW1wbGF0ZVNwZWNcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICovXG5WTS50ZW1wbGF0ZSA9IGZ1bmN0aW9uICh0ZW1wbGF0ZVNwZWMsIGVudikge1xuICAvKipcbiAgICogU3Vic2NyaWJlciB0byBmdW5jdGlvbiBpbiB0aGUgRE9NQmFycyBleGVjdXRpb24gaW5zdGFuY2UuXG4gICAqXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gY3JlYXRlXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSB1cGRhdGVcbiAgICogQHJldHVybiB7T2JqZWN0fVxuICAgKi9cbiAgdmFyIHN1YnNjcmliZSA9IGZ1bmN0aW9uIChmbiwgY3JlYXRlLCB1cGRhdGUpIHtcbiAgICB2YXIgc3Vic2NyaWJlciA9IG5ldyBTdWJzY3JpcHRpb24oZm4sIHVwZGF0ZSwgY29udGFpbmVyLCBlbnYpO1xuXG4gICAgLy8gSW1tZWRpYXRlbHkgYWxpYXMgdGhlIHN0YXJ0aW5nIHZhbHVlLlxuICAgIHN1YnNjcmliZXIudmFsdWUgPSBzdWJzY3JpYmVyLmV4ZWN1dGUoKTtcbiAgICBVdGlscy5pc0Z1bmN0aW9uKGNyZWF0ZSkgJiYgKHN1YnNjcmliZXIudmFsdWUgPSBjcmVhdGUoc3Vic2NyaWJlci52YWx1ZSkpO1xuXG4gICAgcmV0dXJuIHN1YnNjcmliZXI7XG4gIH07XG5cbiAgLyoqXG4gICAqIFdyYXAgYSBmdW5jdGlvbiB3aXRoIGEgc2FuaXRpemVkIHB1YmxpYyBzdWJzY3JpYmVyIG9iamVjdC5cbiAgICpcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gICAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICAgKi9cbiAgdmFyIHdyYXBQcm9ncmFtID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgdmFyIHdyYXBwZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgc3Vic2NyaWJlciA9IG5ldyBTdWJzY3JpcHRpb24oZm4sIG51bGwsIGNvbnRhaW5lciwgZW52KTtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdmFsdWU6ICAgICAgIHN1YnNjcmliZXIuZXhlY3V0ZS5hcHBseShzdWJzY3JpYmVyLCBhcmd1bWVudHMpLFxuICAgICAgICB1bnN1YnNjcmliZTogVXRpbHMuYmluZChzdWJzY3JpYmVyLnVuc3Vic2NyaWJlLCBzdWJzY3JpYmVyKVxuICAgICAgfTtcbiAgICB9O1xuXG4gICAgLy8gRXh0ZW5kIHRoZSB3cmFwcGVyIGZ1bmN0aW9uIHdpdGggcHJvcGVydGllcyBvZiB0aGUgcGFzc2VkIGluIGZ1bmN0aW9uLlxuICAgIFV0aWxzLmV4dGVuZCh3cmFwcGVyLCBmbik7XG5cbiAgICByZXR1cm4gd3JhcHBlcjtcbiAgfTtcblxuICAvKipcbiAgICogVGhlIGNvbnRhaW5lciBvYmplY3QgaG9sZHMgYWxsIHRoZSBmdW5jdGlvbnMgdXNlZCBieSB0aGUgdGVtcGxhdGUgc3BlYy5cbiAgICpcbiAgICogQHR5cGUge09iamVjdH1cbiAgICovXG4gIHZhciBjb250YWluZXIgPSB7XG4gICAgaW52b2tlUGFydGlhbDogICAgVk0uaW52b2tlUGFydGlhbCxcbiAgICBwcm9ncmFtczogICAgICAgICBbXSxcbiAgICBub29wOiAgICAgICAgICAgICBWTS5ub29wLFxuICAgIHBhcnRpYWw6ICAgICAgICAgIFV0aWxzLnBhcnRpYWwsXG4gICAgd3JhcFByb2dyYW06ICAgICAgd3JhcFByb2dyYW0sXG4gICAgZXNjYXBlRXhwcmVzc2lvbjogVXRpbHMuZXNjYXBlRXhwcmVzc2lvbixcbiAgICBwcm9ncmFtV2l0aERlcHRoOiBWTS5wcm9ncmFtV2l0aERlcHRoXG4gIH07XG5cbiAgLyoqXG4gICAqIFJlbmRlciBhbmQgc3Vic2NyaWJlIGEgc2luZ2xlIERPTSBub2RlIHVzaW5nIGEgY3VzdG9tIGNyZWF0aW9uIGZ1bmN0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGNyZWF0ZVxuICAgKiBAcmV0dXJuIHtOb2RlfVxuICAgKi9cbiAgdmFyIHN1YnNjcmliZU5vZGUgPSBmdW5jdGlvbiAoZm4sIGNyZWF0ZSkge1xuICAgIHJldHVybiBzdWJzY3JpYmUoZm4sIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgcmV0dXJuIFV0aWxzLnRyYWNrTm9kZShjcmVhdGUodmFsdWUpKTtcbiAgICB9LCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHRoaXMudmFsdWUucmVwbGFjZShjcmVhdGUodmFsdWUpKTtcbiAgICB9KS52YWx1ZS5mcmFnbWVudDtcbiAgfTtcblxuICAvKipcbiAgICogQ3JlYXRlIGFuIGVsZW1lbnQgYW5kIHN1YnNjcmliZSB0byBhbnkgY2hhbmdlcy4gVGhpcyBtZXRob2QgcmVxdWlyZXMgYVxuICAgKiBjYWxsYmFjayBmdW5jdGlvbiBmb3IgYW55IGVsZW1lbnQgY2hhbmdlcyBzaW5jZSB5b3UgY2FuJ3QgY2hhbmdlIGEgdGFnXG4gICAqIG5hbWUgaW4gcGxhY2UuXG4gICAqXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gY2JcbiAgICogQHJldHVybiB7RWxlbWVudH1cbiAgICovXG4gIGNvbnRhaW5lci5jcmVhdGVFbGVtZW50ID0gZnVuY3Rpb24gKGZuLCBjYikge1xuICAgIHJldHVybiBzdWJzY3JpYmUoZm4sIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgcmV0dXJuIFZNLmNyZWF0ZUVsZW1lbnQodmFsdWUsIGVudik7XG4gICAgfSwgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICBjYih0aGlzLnZhbHVlID0gVk0uc2V0VGFnTmFtZSh0aGlzLnZhbHVlLCB2YWx1ZSwgZW52KSk7XG4gICAgfSkudmFsdWU7XG4gIH07XG5cbiAgLyoqXG4gICAqIEFwcGVuZCBhbiBlbGVtZW50IHRvIHRoZSBlbmQgb2YgYW5vdGhlciBlbGVtZW50LlxuICAgKlxuICAgKiBAcGFyYW0ge05vZGV9IHBhcmVudFxuICAgKiBAcGFyYW0ge05vZGV9IGNoaWxkXG4gICAqL1xuICBjb250YWluZXIuYXBwZW5kQ2hpbGQgPSBmdW5jdGlvbiAocGFyZW50LCBjaGlsZCkge1xuICAgIGlmICghY2hpbGQpIHsgcmV0dXJuOyB9XG5cbiAgICBwYXJlbnQuYXBwZW5kQ2hpbGQoY2hpbGQpO1xuICAgIGVudi5lbWl0KCdhcHBlbmRDaGlsZCcsIHBhcmVudCwgY2hpbGQpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBTZXQgYW4gZWxlbWVudHMgYXR0cmlidXRlLiBXZSBhY2NlcHQgdGhlIGN1cnJlbnQgZWxlbWVudCBhIGZ1bmN0aW9uXG4gICAqIGJlY2F1c2Ugd2hlbiBhIHRhZyBuYW1lIGNoYW5nZXMgd2Ugd2lsbCBsb3NlIHJlZmVyZW5jZSB0byB0aGUgYWN0aXZlbHlcbiAgICogcmVuZGVyZWQgZWxlbWVudC5cbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY3VycmVudEVsXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IG5hbWVGblxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSB2YWx1ZUZuXG4gICAqL1xuICBjb250YWluZXIuc2V0QXR0cmlidXRlID0gZnVuY3Rpb24gKGN1cnJlbnRFbCwgbmFtZUZuLCB2YWx1ZUZuKSB7XG4gICAgdmFyIGF0dHJOYW1lID0gc3Vic2NyaWJlKG5hbWVGbiwgbnVsbCwgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICBWTS5yZW1vdmVBdHRyaWJ1dGUoY3VycmVudEVsKCksIHRoaXMudmFsdWUsIGVudik7XG4gICAgICBWTS5zZXRBdHRyaWJ1dGUoY3VycmVudEVsKCksIHRoaXMudmFsdWUgPSB2YWx1ZSwgYXR0clZhbHVlLnZhbHVlLCBlbnYpO1xuICAgIH0pO1xuXG4gICAgdmFyIGF0dHJWYWx1ZSA9IHN1YnNjcmliZSh2YWx1ZUZuLCBudWxsLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIFZNLnNldEF0dHJpYnV0ZShjdXJyZW50RWwoKSwgYXR0ck5hbWUudmFsdWUsIHRoaXMudmFsdWUgPSB2YWx1ZSwgZW52KTtcbiAgICB9KTtcblxuICAgIHJldHVybiBWTS5zZXRBdHRyaWJ1dGUoY3VycmVudEVsKCksIGF0dHJOYW1lLnZhbHVlLCBhdHRyVmFsdWUudmFsdWUsIGVudik7XG4gIH07XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIERPTSBlbGVtZW50IGFuZCBzdWJzY3JpYmUgdG8gYW55IGNoYW5nZXMuXG4gICAqXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICAgKiBAcmV0dXJuIHtOb2RlfVxuICAgKi9cbiAgY29udGFpbmVyLmNyZWF0ZURPTSA9IGZ1bmN0aW9uIChmbikge1xuICAgIHJldHVybiBzdWJzY3JpYmVOb2RlKGZuLCBVdGlscy5kb21pZnlFeHByZXNzaW9uKTtcbiAgfTtcblxuICAvKipcbiAgICogQ3JlYXRlIGEgdGV4dCBub2RlIGFuZCBzdWJzY3JpYmUgdG8gYW55IGNoYW5nZXMuXG4gICAqXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICAgKiBAcmV0dXJuIHtUZXh0fVxuICAgKi9cbiAgY29udGFpbmVyLmNyZWF0ZVRleHQgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICByZXR1cm4gc3Vic2NyaWJlTm9kZShmbiwgVXRpbHMudGV4dGlmeUV4cHJlc3Npb24pO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBjb21tZW50IG5vZGUgYW5kIHN1YnNjcmliZSB0byBhbnkgY2hhbmdlcy5cbiAgICpcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gICAqIEByZXR1cm4ge0NvbW1lbnR9XG4gICAqL1xuICBjb250YWluZXIuY3JlYXRlQ29tbWVudCA9IGZ1bmN0aW9uIChmbikge1xuICAgIHJldHVybiBzdWJzY3JpYmUoZm4sIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgcmV0dXJuIFZNLmNyZWF0ZUNvbW1lbnQodmFsdWUsIGVudik7XG4gICAgfSwgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICB0aGlzLnZhbHVlLnRleHRDb250ZW50ID0gdmFsdWU7XG4gICAgfSkudmFsdWU7XG4gIH07XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhbmQgcmV0dXJuIGEgcHJvZ3JhbSBzaW5nbGV0b24gYmFzZWQgb24gaW5kZXguXG4gICAqXG4gICAqIEBwYXJhbSAge051bWJlcn0gICBpXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICAgKiBAcGFyYW0gIHtPYmplY3R9ICAgZGF0YVxuICAgKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAgICovXG4gIGNvbnRhaW5lci5wcm9ncmFtID0gZnVuY3Rpb24gKGksIGZuLCBkYXRhKSB7XG4gICAgdmFyIHByb2dyYW1XcmFwcGVyID0gY29udGFpbmVyLnByb2dyYW1zW2ldO1xuXG4gICAgaWYgKGRhdGEpIHtcbiAgICAgIHJldHVybiBWTS5wcm9ncmFtKGksIGZuLCBkYXRhKTtcbiAgICB9XG5cbiAgICBpZiAoIXByb2dyYW1XcmFwcGVyKSB7XG4gICAgICByZXR1cm4gY29udGFpbmVyLnByb2dyYW1zW2ldID0gVk0ucHJvZ3JhbShpLCBmbik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHByb2dyYW1XcmFwcGVyO1xuICB9O1xuXG4gIC8qKlxuICAgKiBNZXJnZSB0d28gb2JqZWN0cyBpbnRvIGEgc2luZ2xlIG9iamVjdC5cbiAgICpcbiAgICogQHBhcmFtICB7T2JqZWN0fSBwYXJhbVxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGNvbW1vblxuICAgKiBAcmV0dXJuIHtPYmplY3R9XG4gICAqL1xuICBjb250YWluZXIubWVyZ2UgPSBmdW5jdGlvbiAocGFyYW0sIGNvbW1vbikge1xuICAgIHZhciByZXQgPSBwYXJhbSB8fCBjb21tb247XG5cbiAgICBpZiAocGFyYW0gJiYgY29tbW9uICYmIChwYXJhbSAhPT0gY29tbW9uKSkge1xuICAgICAgcmV0ID0ge307XG4gICAgICBVdGlscy5leHRlbmQocmV0LCBjb21tb24pO1xuICAgICAgVXRpbHMuZXh0ZW5kKHJldCwgcGFyYW0pO1xuICAgIH1cblxuICAgIHJldHVybiByZXQ7XG4gIH07XG5cbiAgLyoqXG4gICAqIEdldCBhIHByb3BlcnR5IGZyb20gYW4gb2JqZWN0LiBQYXNzZXMgaW4gdGhlIG9iamVjdCBpZCAoZGVwdGgpIHRvIG1ha2UgaXRcbiAgICogbXVjaCBmYXN0ZXIgdG8gZG8gY29tcGFyaXNvbnMgYmV0d2VlbiBuZXcgYW5kIG9sZCBzdWJzY3JpcHRpb25zLlxuICAgKlxuICAgKiBAcGFyYW0gIHtPYmplY3R9IG9iamVjdFxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IHByb3BlcnR5XG4gICAqIEBwYXJhbSAge1N0cmluZ30gaWRcbiAgICogQHJldHVybiB7Kn1cbiAgICovXG4gIGNvbnRhaW5lci5nZXQgPSBmdW5jdGlvbiAob2JqZWN0LCBwcm9wZXJ0eSwgaWQpIHtcbiAgICBjb250YWluZXIuc3Vic2NyaXB0aW9uLnN1YnNjcmliZShvYmplY3QsIHByb3BlcnR5LCBpZCk7XG4gICAgcmV0dXJuIGVudi5nZXQob2JqZWN0LCBwcm9wZXJ0eSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJldHVybiB0aGUgY29tcGlsZWQgSmF2YVNjcmlwdCBmdW5jdGlvbiBmb3IgZXhlY3V0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGNvbnRleHRcbiAgICogQHBhcmFtICB7T2JqZWN0fSBvcHRpb25zXG4gICAqIEByZXR1cm4ge05vZGV9XG4gICAqL1xuICByZXR1cm4gd3JhcFByb2dyYW0oZnVuY3Rpb24gKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgIHZhciBuYW1lc3BhY2UgPSBvcHRpb25zLnBhcnRpYWwgPyBvcHRpb25zIDogZW52O1xuICAgIHZhciBoZWxwZXJzO1xuICAgIHZhciBwYXJ0aWFscztcblxuICAgIGlmICghb3B0aW9ucy5wYXJ0aWFsKSB7XG4gICAgICBoZWxwZXJzICA9IG9wdGlvbnMuaGVscGVycztcbiAgICAgIHBhcnRpYWxzID0gb3B0aW9ucy5wYXJ0aWFscztcbiAgICB9XG5cbiAgICB2YXIgcmVzdWx0ID0gdGVtcGxhdGVTcGVjLmNhbGwoXG4gICAgICBjb250YWluZXIsXG4gICAgICBuYW1lc3BhY2UsXG4gICAgICBjb250ZXh0LFxuICAgICAgaGVscGVycyxcbiAgICAgIHBhcnRpYWxzLFxuICAgICAgb3B0aW9ucy5kYXRhXG4gICAgKTtcblxuICAgIGlmICghb3B0aW9ucy5wYXJ0aWFsKSB7XG4gICAgICBlbnYuVk0uY2hlY2tSZXZpc2lvbihjb250YWluZXIuY29tcGlsZXJJbmZvKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9KTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJ2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9zYWZlLXN0cmluZycpLmRlZmF1bHQ7XG4iLCJ2YXIgVHJhY2tOb2RlID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAobm9kZSkge1xuICB0aGlzLmZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuXG4gIC8vIEluc3RhbnRseSBhcHBlbmQgYSBiZWZvcmUgYW5kIGFmdGVyIHRyYWNraW5nIG5vZGUuXG4gIHRoaXMuYmVmb3JlID0gdGhpcy5mcmFnbWVudC5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJykpO1xuICB0aGlzLmFmdGVyICA9IHRoaXMuZnJhZ21lbnQuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpKTtcblxuICAvLyBBcHBlbmQgdGhlIHBhc3NlZCBpbiBub2RlIHRvIHRoZSBjdXJyZW50IGZyYWdtZW50LlxuICBub2RlICYmIHRoaXMuYXBwZW5kQ2hpbGQobm9kZSk7XG59O1xuXG4vKipcbiAqIEFwcGVuZCBhIG5vZGUgdG8gdGhlIGN1cnJlbnQgdHJhY2tpbmcgZnJhZ21lbnQuXG4gKlxuICogQHBhcmFtICB7Tm9kZX0gbm9kZVxuICogQHJldHVybiB7dGhpc31cbiAqL1xuVHJhY2tOb2RlLnByb3RvdHlwZS5hcHBlbmRDaGlsZCA9IGZ1bmN0aW9uIChub2RlKSB7XG4gIHRoaXMuYWZ0ZXIucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUobm9kZSwgdGhpcy5hZnRlcik7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFByZXBlbmQgYSBub2RlIHRvIHRoZSBjdXJyZW50IHRyYWNraW5nIGZyYWdtZW50LlxuICpcbiAqIEBwYXJhbSAge05vZGV9IG5vZGVcbiAqIEByZXR1cm4ge3RoaXN9XG4gKi9cblRyYWNrTm9kZS5wcm90b3R5cGUucHJlcGVuZENoaWxkID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgdGhpcy5iZWZvcmUucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUobm9kZSwgdGhpcy5iZWZvcmUubmV4dFNpYmxpbmcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgYWxsIGVsZW1lbnRzIGJldHdlZW4gdGhlIHR3byB0cmFja2luZyBub2Rlcy5cbiAqXG4gKiBAcGFyYW0gIHtOb2RlfSBub2RlXG4gKiBAcmV0dXJuIHt0aGlzfVxuICovXG5UcmFja05vZGUucHJvdG90eXBlLmVtcHR5ID0gZnVuY3Rpb24gKCkge1xuICB3aGlsZSAodGhpcy5iZWZvcmUubmV4dFNpYmxpbmcgIT09IHRoaXMuYWZ0ZXIpIHtcbiAgICB0aGlzLmJlZm9yZS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMuYmVmb3JlLm5leHRTaWJsaW5nKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgdGhlIHRoZSBlbGVtZW50cyBmcm9tIHRoZSBET00uXG4gKlxuICogQHBhcmFtICB7Tm9kZX0gbm9kZVxuICogQHJldHVybiB7dGhpc31cbiAqL1xuVHJhY2tOb2RlLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAoKSB7XG4gIHdoaWxlICh0aGlzLmJlZm9yZS5uZXh0U2libGluZyAhPT0gdGhpcy5hZnRlcikge1xuICAgIHRoaXMuZnJhZ21lbnQuYXBwZW5kQ2hpbGQodGhpcy5iZWZvcmUubmV4dFNpYmxpbmcpO1xuICB9XG5cbiAgLy8gUHVsbCB0aGUgdHdvIHJlZmVyZW5jZSBub2RlcyBvdXQgb2YgdGhlIERPTSBhbmQgaW50byB0aGUgZnJhZ21lbnQuXG4gIHRoaXMuZnJhZ21lbnQuYXBwZW5kQ2hpbGQodGhpcy5hZnRlcik7XG4gIHRoaXMuZnJhZ21lbnQuaW5zZXJ0QmVmb3JlKHRoaXMuYmVmb3JlLCB0aGlzLmZyYWdtZW50LmZpcnN0Q2hpbGQpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZXBsYWNlIHRoZSBjb250ZW50cyBvZiB0aGUgdHJhY2tpbmcgbm9kZSB3aXRoIG5ldyBjb250ZW50cy5cbiAqXG4gKiBAcGFyYW0gIHtOb2RlfSBub2RlXG4gKiBAcmV0dXJuIHt0aGlzfVxuICovXG5UcmFja05vZGUucHJvdG90eXBlLnJlcGxhY2UgPSBmdW5jdGlvbiAobm9kZSkge1xuICByZXR1cm4gdGhpcy5lbXB0eSgpLmFwcGVuZENoaWxkKG5vZGUpO1xufTtcbiIsInZhciBoYnNVdGlscyAgID0gcmVxdWlyZSgnaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL3V0aWxzJyk7XG52YXIgdW5pcXVlSWQgICA9IDA7XG52YXIgVHJhY2tOb2RlICA9IHJlcXVpcmUoJy4vdHJhY2stbm9kZScpO1xudmFyIFNhZmVTdHJpbmcgPSByZXF1aXJlKCcuL3NhZmUtc3RyaW5nJyk7XG52YXIgX19zbGljZSAgICA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcblxuLyoqXG4gKiBTaW1wbGUgd2F5IHRvIHN1YmNsYXNzIGFuIG9iamVjdCwgd2l0aCBzdXBwb3J0IGZvciBvbGRlciBicm93c2Vycy5cbiAqXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cbnZhciBjcmVhdGUgPSBPYmplY3QuY3JlYXRlIHx8IChmdW5jdGlvbiAoKSB7XG4gIHZhciBGID0gZnVuY3Rpb24gKCkge307XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIChvKSB7XG4gICAgRi5wcm90b3R5cGUgPSBvO1xuICAgIHZhciBvYmogPSBuZXcgRigpO1xuICAgIEYucHJvdG90eXBlID0gbnVsbDtcbiAgICByZXR1cm4gb2JqO1xuICB9O1xufSkoKTtcblxuLyoqXG4gKiBFeHRlbmQgSGFuZGxlYmFycyB1dGlsaXRpZXMgd2l0aCBET00gZnVuY3Rpb25hbGl0eS5cbiAqXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG52YXIgVXRpbHMgPSBtb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZShoYnNVdGlscyk7XG5cbi8qKlxuICogUmV0dXJuIGEgdW5pcXVlIGlkLlxuICpcbiAqIEByZXR1cm4ge051bWJlcn1cbiAqL1xuVXRpbHMudW5pcXVlSWQgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB1bmlxdWVJZCsrO1xufTtcblxuLyoqXG4gKiBDcmVhdGUgYSBmdW5jdGlvbiB0aGF0IGFjY2VwdHMgYW4gdW5saW1pdGVkIG51bWJlciBvZiBhcmd1bWVudHMgYXMgdGhlIGxhc3RcbiAqIGFyZ3VtZW50LlxuICpcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7RnVuY3Rpb259XG4gKi9cblV0aWxzLnZhcmlhZGljID0gZnVuY3Rpb24gKGZuKSB7XG4gIHZhciBjb3VudCA9IE1hdGgubWF4KGZuLmxlbmd0aCAtIDEsIDApO1xuXG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGFyZ3MgPSBfX3NsaWNlLmNhbGwoYXJndW1lbnRzLCAwLCBjb3VudCk7XG5cbiAgICAvLyBFbmZvcmNlIHRoZSBhcnJheSBsZW5ndGgsIGluIGNhc2Ugd2UgZGlkbid0IGhhdmUgZW5vdWdoIGFyZ3VtZW50cy5cbiAgICBhcmdzLmxlbmd0aCA9IGNvdW50O1xuICAgIGFyZ3MucHVzaChfX3NsaWNlLmNhbGwoYXJndW1lbnRzLCBjb3VudCkpO1xuXG4gICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9O1xufTtcblxuLyoqXG4gKiBTaW1wbGUgcGFydGlhbCBhcHBsaWNhdGlvbiBmdW5jdGlvbi5cbiAqXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAqIEBwYXJhbSAgeyp9ICAgICAgICAuLi5cbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICovXG5VdGlscy5wYXJ0aWFsID0gVXRpbHMudmFyaWFkaWMoZnVuY3Rpb24gKGZuLCBhcmdzKSB7XG4gIHJldHVybiBVdGlscy52YXJpYWRpYyhmdW5jdGlvbiAoY2FsbGVkKSB7XG4gICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3MuY29uY2F0KGNhbGxlZCkpO1xuICB9KTtcbn0pO1xuXG4vKipcbiAqIEJpbmQgYSBmdW5jdGlvbiB0byBhIGNlcnRhaW4gY29udGV4dC5cbiAqXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAqIEBwYXJhbSAge09iamVjdH0gICBjb250ZXh0XG4gKiBAcGFyYW0gIHsqfSAgICAgICAgLi4uXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqL1xuVXRpbHMuYmluZCA9IFV0aWxzLnZhcmlhZGljKGZ1bmN0aW9uIChmbiwgY29udGV4dCwgYXJncykge1xuICByZXR1cm4gVXRpbHMudmFyaWFkaWMoZnVuY3Rpb24gKGNhbGxlZCkge1xuICAgIHJldHVybiBmbi5hcHBseShjb250ZXh0LCBhcmdzLmNvbmNhdChjYWxsZWQpKTtcbiAgfSk7XG59KTtcblxuLyoqXG4gKiBFeHBvc2UgdGhlIGNyZWF0ZSBmdW5jdGlvbi5cbiAqXG4gKiBAdHlwZSB7RnVuY3Rpb259XG4gKi9cblV0aWxzLmNyZWF0ZSA9IGNyZWF0ZTtcblxuLyoqXG4gKiBDaGVjayB3aGV0aGVyIGFuIG9iamVjdCBpcyBhY3R1YWxseSBhIERPTSBub2RlLlxuICpcbiAqIEBwYXJhbSAgeyp9ICAgICAgIGVsZW1lbnRcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKi9cblV0aWxzLmlzTm9kZSA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gIHJldHVybiBlbGVtZW50IGluc3RhbmNlb2YgTm9kZTtcbn07XG5cbi8qKlxuICogVHJhY2sgYSBub2RlIGluc3RhbmNlIGFueXdoZXJlIGl0IGdvZXMgaW4gdGhlIERPTS5cbiAqXG4gKiBAcGFyYW0gIHtOb2RlfSAgICAgIG5vZGVcbiAqIEByZXR1cm4ge1RyYWNrTm9kZX1cbiAqL1xuVXRpbHMudHJhY2tOb2RlID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgcmV0dXJuIG5ldyBUcmFja05vZGUobm9kZSk7XG59O1xuXG4vKipcbiAqIFRyYW5zZm9ybSBhIHN0cmluZyBpbnRvIGFyYml0cmFyeSBET00gbm9kZXMuXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSBzdHJpbmdcbiAqIEByZXR1cm4ge05vZGV9XG4gKi9cblV0aWxzLmRvbWlmeUV4cHJlc3Npb24gPSBmdW5jdGlvbiAoc3RyaW5nKSB7XG4gIC8vIElmIHdlIHBhc3NlZCBpbiBhIHNhZmUgc3RyaW5nLCBnZXQgdGhlIGFjdHVhbCB2YWx1ZS5cbiAgaWYgKHN0cmluZyBpbnN0YW5jZW9mIFNhZmVTdHJpbmcpIHtcbiAgICBzdHJpbmcgPSBzdHJpbmcuc3RyaW5nO1xuICB9XG5cbiAgLy8gTm8gbmVlZCB0byBjb2VyY2UgYSBub2RlLlxuICBpZiAoVXRpbHMuaXNOb2RlKHN0cmluZykpIHtcbiAgICByZXR1cm4gc3RyaW5nO1xuICB9XG5cbiAgdmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBkaXYuaW5uZXJIVE1MID0gc3RyaW5nO1xuXG4gIGlmIChkaXYuY2hpbGROb2Rlcy5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gZGl2LnJlbW92ZUNoaWxkKGRpdi5jaGlsZE5vZGVzWzBdKTtcbiAgfVxuXG4gIHZhciBmcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcblxuICB3aGlsZSAoZGl2LmZpcnN0Q2hpbGQpIHtcbiAgICBmcmFnbWVudC5hcHBlbmRDaGlsZChkaXYuZmlyc3RDaGlsZCk7XG4gIH1cblxuICByZXR1cm4gZnJhZ21lbnQ7XG59O1xuXG4vKipcbiAqIFRyYW5zZm9ybSBhIHN0cmluZyBpbnRvIGEgRE9NIHRleHQgbm9kZSBmb3IgYXBwZW5kaW5nIHRvIHRoZSB0ZW1wbGF0ZS5cbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9IHN0cmluZ1xuICogQHJldHVybiB7VGV4dH1cbiAqL1xuVXRpbHMudGV4dGlmeUV4cHJlc3Npb24gPSBmdW5jdGlvbiAoc3RyaW5nKSB7XG4gIGlmIChzdHJpbmcgaW5zdGFuY2VvZiBTYWZlU3RyaW5nKSB7XG4gICAgcmV0dXJuIFV0aWxzLmRvbWlmeUV4cHJlc3Npb24oc3RyaW5nLnN0cmluZyk7XG4gIH1cblxuICAvLyBDYXRjaCB3aGVuIHRoZSBzdHJpbmcgaXMgYWN0dWFsbHkgYSBET00gbm9kZSBhbmQgdHVybiBpdCBpbnRvIGEgc3RyaW5nLlxuICBpZiAoVXRpbHMuaXNOb2RlKHN0cmluZykpIHtcbiAgICAvLyBBbHJlYWR5IGEgdGV4dCBub2RlLCBqdXN0IHJldHVybiBpdCBpbW1lZGlhdGVseS5cbiAgICBpZiAoc3RyaW5nLm5vZGVUeXBlID09PSAzKSB7XG4gICAgICByZXR1cm4gc3RyaW5nO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2Ygc3RyaW5nLm91dGVySFRNTCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShzdHJpbmcub3V0ZXJIVE1MKTtcbiAgICB9XG5cbiAgICB2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgZGl2LmFwcGVuZENoaWxkKHN0cmluZy5jbG9uZU5vZGUodHJ1ZSkpO1xuICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShkaXYuaW5uZXJIVE1MKTtcbiAgfVxuXG4gIHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShzdHJpbmcgPT0gbnVsbCA/ICcnIDogc3RyaW5nKTtcbn07XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iLCJpZiAodHlwZW9mIE9iamVjdC5jcmVhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgLy8gaW1wbGVtZW50YXRpb24gZnJvbSBzdGFuZGFyZCBub2RlLmpzICd1dGlsJyBtb2R1bGVcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIGN0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckN0b3IucHJvdG90eXBlLCB7XG4gICAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgICB2YWx1ZTogY3RvcixcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbn0gZWxzZSB7XG4gIC8vIG9sZCBzY2hvb2wgc2hpbSBmb3Igb2xkIGJyb3dzZXJzXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICB2YXIgVGVtcEN0b3IgPSBmdW5jdGlvbiAoKSB7fVxuICAgIFRlbXBDdG9yLnByb3RvdHlwZSA9IHN1cGVyQ3Rvci5wcm90b3R5cGVcbiAgICBjdG9yLnByb3RvdHlwZSA9IG5ldyBUZW1wQ3RvcigpXG4gICAgY3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yXG4gIH1cbn1cbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgdmFyIHF1ZXVlID0gW107XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICBpZiAoZXYuc291cmNlID09PSB3aW5kb3cgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn1cblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc0J1ZmZlcihhcmcpIHtcbiAgcmV0dXJuIGFyZyAmJiB0eXBlb2YgYXJnID09PSAnb2JqZWN0J1xuICAgICYmIHR5cGVvZiBhcmcuY29weSA9PT0gJ2Z1bmN0aW9uJ1xuICAgICYmIHR5cGVvZiBhcmcuZmlsbCA9PT0gJ2Z1bmN0aW9uJ1xuICAgICYmIHR5cGVvZiBhcmcucmVhZFVJbnQ4ID09PSAnZnVuY3Rpb24nO1xufSIsInZhciBwcm9jZXNzPXJlcXVpcmUoXCJfX2Jyb3dzZXJpZnlfcHJvY2Vzc1wiKSxnbG9iYWw9dHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9Oy8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG52YXIgZm9ybWF0UmVnRXhwID0gLyVbc2RqJV0vZztcbmV4cG9ydHMuZm9ybWF0ID0gZnVuY3Rpb24oZikge1xuICBpZiAoIWlzU3RyaW5nKGYpKSB7XG4gICAgdmFyIG9iamVjdHMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgb2JqZWN0cy5wdXNoKGluc3BlY3QoYXJndW1lbnRzW2ldKSk7XG4gICAgfVxuICAgIHJldHVybiBvYmplY3RzLmpvaW4oJyAnKTtcbiAgfVxuXG4gIHZhciBpID0gMTtcbiAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gIHZhciBsZW4gPSBhcmdzLmxlbmd0aDtcbiAgdmFyIHN0ciA9IFN0cmluZyhmKS5yZXBsYWNlKGZvcm1hdFJlZ0V4cCwgZnVuY3Rpb24oeCkge1xuICAgIGlmICh4ID09PSAnJSUnKSByZXR1cm4gJyUnO1xuICAgIGlmIChpID49IGxlbikgcmV0dXJuIHg7XG4gICAgc3dpdGNoICh4KSB7XG4gICAgICBjYXNlICclcyc6IHJldHVybiBTdHJpbmcoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVkJzogcmV0dXJuIE51bWJlcihhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWonOlxuICAgICAgICB0cnkge1xuICAgICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShhcmdzW2krK10pO1xuICAgICAgICB9IGNhdGNoIChfKSB7XG4gICAgICAgICAgcmV0dXJuICdbQ2lyY3VsYXJdJztcbiAgICAgICAgfVxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIHg7XG4gICAgfVxuICB9KTtcbiAgZm9yICh2YXIgeCA9IGFyZ3NbaV07IGkgPCBsZW47IHggPSBhcmdzWysraV0pIHtcbiAgICBpZiAoaXNOdWxsKHgpIHx8ICFpc09iamVjdCh4KSkge1xuICAgICAgc3RyICs9ICcgJyArIHg7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciArPSAnICcgKyBpbnNwZWN0KHgpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gc3RyO1xufTtcblxuXG4vLyBNYXJrIHRoYXQgYSBtZXRob2Qgc2hvdWxkIG5vdCBiZSB1c2VkLlxuLy8gUmV0dXJucyBhIG1vZGlmaWVkIGZ1bmN0aW9uIHdoaWNoIHdhcm5zIG9uY2UgYnkgZGVmYXVsdC5cbi8vIElmIC0tbm8tZGVwcmVjYXRpb24gaXMgc2V0LCB0aGVuIGl0IGlzIGEgbm8tb3AuXG5leHBvcnRzLmRlcHJlY2F0ZSA9IGZ1bmN0aW9uKGZuLCBtc2cpIHtcbiAgLy8gQWxsb3cgZm9yIGRlcHJlY2F0aW5nIHRoaW5ncyBpbiB0aGUgcHJvY2VzcyBvZiBzdGFydGluZyB1cC5cbiAgaWYgKGlzVW5kZWZpbmVkKGdsb2JhbC5wcm9jZXNzKSkge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBleHBvcnRzLmRlcHJlY2F0ZShmbiwgbXNnKS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH1cblxuICBpZiAocHJvY2Vzcy5ub0RlcHJlY2F0aW9uID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIGZuO1xuICB9XG5cbiAgdmFyIHdhcm5lZCA9IGZhbHNlO1xuICBmdW5jdGlvbiBkZXByZWNhdGVkKCkge1xuICAgIGlmICghd2FybmVkKSB7XG4gICAgICBpZiAocHJvY2Vzcy50aHJvd0RlcHJlY2F0aW9uKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtc2cpO1xuICAgICAgfSBlbHNlIGlmIChwcm9jZXNzLnRyYWNlRGVwcmVjYXRpb24pIHtcbiAgICAgICAgY29uc29sZS50cmFjZShtc2cpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihtc2cpO1xuICAgICAgfVxuICAgICAgd2FybmVkID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH1cblxuICByZXR1cm4gZGVwcmVjYXRlZDtcbn07XG5cblxudmFyIGRlYnVncyA9IHt9O1xudmFyIGRlYnVnRW52aXJvbjtcbmV4cG9ydHMuZGVidWdsb2cgPSBmdW5jdGlvbihzZXQpIHtcbiAgaWYgKGlzVW5kZWZpbmVkKGRlYnVnRW52aXJvbikpXG4gICAgZGVidWdFbnZpcm9uID0gcHJvY2Vzcy5lbnYuTk9ERV9ERUJVRyB8fCAnJztcbiAgc2V0ID0gc2V0LnRvVXBwZXJDYXNlKCk7XG4gIGlmICghZGVidWdzW3NldF0pIHtcbiAgICBpZiAobmV3IFJlZ0V4cCgnXFxcXGInICsgc2V0ICsgJ1xcXFxiJywgJ2knKS50ZXN0KGRlYnVnRW52aXJvbikpIHtcbiAgICAgIHZhciBwaWQgPSBwcm9jZXNzLnBpZDtcbiAgICAgIGRlYnVnc1tzZXRdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBtc2cgPSBleHBvcnRzLmZvcm1hdC5hcHBseShleHBvcnRzLCBhcmd1bWVudHMpO1xuICAgICAgICBjb25zb2xlLmVycm9yKCclcyAlZDogJXMnLCBzZXQsIHBpZCwgbXNnKTtcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGRlYnVnc1tzZXRdID0gZnVuY3Rpb24oKSB7fTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlYnVnc1tzZXRdO1xufTtcblxuXG4vKipcbiAqIEVjaG9zIHRoZSB2YWx1ZSBvZiBhIHZhbHVlLiBUcnlzIHRvIHByaW50IHRoZSB2YWx1ZSBvdXRcbiAqIGluIHRoZSBiZXN0IHdheSBwb3NzaWJsZSBnaXZlbiB0aGUgZGlmZmVyZW50IHR5cGVzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogVGhlIG9iamVjdCB0byBwcmludCBvdXQuXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBvcHRpb25zIG9iamVjdCB0aGF0IGFsdGVycyB0aGUgb3V0cHV0LlxuICovXG4vKiBsZWdhY3k6IG9iaiwgc2hvd0hpZGRlbiwgZGVwdGgsIGNvbG9ycyovXG5mdW5jdGlvbiBpbnNwZWN0KG9iaiwgb3B0cykge1xuICAvLyBkZWZhdWx0IG9wdGlvbnNcbiAgdmFyIGN0eCA9IHtcbiAgICBzZWVuOiBbXSxcbiAgICBzdHlsaXplOiBzdHlsaXplTm9Db2xvclxuICB9O1xuICAvLyBsZWdhY3kuLi5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gMykgY3R4LmRlcHRoID0gYXJndW1lbnRzWzJdO1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSA0KSBjdHguY29sb3JzID0gYXJndW1lbnRzWzNdO1xuICBpZiAoaXNCb29sZWFuKG9wdHMpKSB7XG4gICAgLy8gbGVnYWN5Li4uXG4gICAgY3R4LnNob3dIaWRkZW4gPSBvcHRzO1xuICB9IGVsc2UgaWYgKG9wdHMpIHtcbiAgICAvLyBnb3QgYW4gXCJvcHRpb25zXCIgb2JqZWN0XG4gICAgZXhwb3J0cy5fZXh0ZW5kKGN0eCwgb3B0cyk7XG4gIH1cbiAgLy8gc2V0IGRlZmF1bHQgb3B0aW9uc1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LnNob3dIaWRkZW4pKSBjdHguc2hvd0hpZGRlbiA9IGZhbHNlO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmRlcHRoKSkgY3R4LmRlcHRoID0gMjtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5jb2xvcnMpKSBjdHguY29sb3JzID0gZmFsc2U7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguY3VzdG9tSW5zcGVjdCkpIGN0eC5jdXN0b21JbnNwZWN0ID0gdHJ1ZTtcbiAgaWYgKGN0eC5jb2xvcnMpIGN0eC5zdHlsaXplID0gc3R5bGl6ZVdpdGhDb2xvcjtcbiAgcmV0dXJuIGZvcm1hdFZhbHVlKGN0eCwgb2JqLCBjdHguZGVwdGgpO1xufVxuZXhwb3J0cy5pbnNwZWN0ID0gaW5zcGVjdDtcblxuXG4vLyBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0FOU0lfZXNjYXBlX2NvZGUjZ3JhcGhpY3Ncbmluc3BlY3QuY29sb3JzID0ge1xuICAnYm9sZCcgOiBbMSwgMjJdLFxuICAnaXRhbGljJyA6IFszLCAyM10sXG4gICd1bmRlcmxpbmUnIDogWzQsIDI0XSxcbiAgJ2ludmVyc2UnIDogWzcsIDI3XSxcbiAgJ3doaXRlJyA6IFszNywgMzldLFxuICAnZ3JleScgOiBbOTAsIDM5XSxcbiAgJ2JsYWNrJyA6IFszMCwgMzldLFxuICAnYmx1ZScgOiBbMzQsIDM5XSxcbiAgJ2N5YW4nIDogWzM2LCAzOV0sXG4gICdncmVlbicgOiBbMzIsIDM5XSxcbiAgJ21hZ2VudGEnIDogWzM1LCAzOV0sXG4gICdyZWQnIDogWzMxLCAzOV0sXG4gICd5ZWxsb3cnIDogWzMzLCAzOV1cbn07XG5cbi8vIERvbid0IHVzZSAnYmx1ZScgbm90IHZpc2libGUgb24gY21kLmV4ZVxuaW5zcGVjdC5zdHlsZXMgPSB7XG4gICdzcGVjaWFsJzogJ2N5YW4nLFxuICAnbnVtYmVyJzogJ3llbGxvdycsXG4gICdib29sZWFuJzogJ3llbGxvdycsXG4gICd1bmRlZmluZWQnOiAnZ3JleScsXG4gICdudWxsJzogJ2JvbGQnLFxuICAnc3RyaW5nJzogJ2dyZWVuJyxcbiAgJ2RhdGUnOiAnbWFnZW50YScsXG4gIC8vIFwibmFtZVwiOiBpbnRlbnRpb25hbGx5IG5vdCBzdHlsaW5nXG4gICdyZWdleHAnOiAncmVkJ1xufTtcblxuXG5mdW5jdGlvbiBzdHlsaXplV2l0aENvbG9yKHN0ciwgc3R5bGVUeXBlKSB7XG4gIHZhciBzdHlsZSA9IGluc3BlY3Quc3R5bGVzW3N0eWxlVHlwZV07XG5cbiAgaWYgKHN0eWxlKSB7XG4gICAgcmV0dXJuICdcXHUwMDFiWycgKyBpbnNwZWN0LmNvbG9yc1tzdHlsZV1bMF0gKyAnbScgKyBzdHIgK1xuICAgICAgICAgICAnXFx1MDAxYlsnICsgaW5zcGVjdC5jb2xvcnNbc3R5bGVdWzFdICsgJ20nO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBzdHI7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBzdHlsaXplTm9Db2xvcihzdHIsIHN0eWxlVHlwZSkge1xuICByZXR1cm4gc3RyO1xufVxuXG5cbmZ1bmN0aW9uIGFycmF5VG9IYXNoKGFycmF5KSB7XG4gIHZhciBoYXNoID0ge307XG5cbiAgYXJyYXkuZm9yRWFjaChmdW5jdGlvbih2YWwsIGlkeCkge1xuICAgIGhhc2hbdmFsXSA9IHRydWU7XG4gIH0pO1xuXG4gIHJldHVybiBoYXNoO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFZhbHVlKGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcykge1xuICAvLyBQcm92aWRlIGEgaG9vayBmb3IgdXNlci1zcGVjaWZpZWQgaW5zcGVjdCBmdW5jdGlvbnMuXG4gIC8vIENoZWNrIHRoYXQgdmFsdWUgaXMgYW4gb2JqZWN0IHdpdGggYW4gaW5zcGVjdCBmdW5jdGlvbiBvbiBpdFxuICBpZiAoY3R4LmN1c3RvbUluc3BlY3QgJiZcbiAgICAgIHZhbHVlICYmXG4gICAgICBpc0Z1bmN0aW9uKHZhbHVlLmluc3BlY3QpICYmXG4gICAgICAvLyBGaWx0ZXIgb3V0IHRoZSB1dGlsIG1vZHVsZSwgaXQncyBpbnNwZWN0IGZ1bmN0aW9uIGlzIHNwZWNpYWxcbiAgICAgIHZhbHVlLmluc3BlY3QgIT09IGV4cG9ydHMuaW5zcGVjdCAmJlxuICAgICAgLy8gQWxzbyBmaWx0ZXIgb3V0IGFueSBwcm90b3R5cGUgb2JqZWN0cyB1c2luZyB0aGUgY2lyY3VsYXIgY2hlY2suXG4gICAgICAhKHZhbHVlLmNvbnN0cnVjdG9yICYmIHZhbHVlLmNvbnN0cnVjdG9yLnByb3RvdHlwZSA9PT0gdmFsdWUpKSB7XG4gICAgdmFyIHJldCA9IHZhbHVlLmluc3BlY3QocmVjdXJzZVRpbWVzLCBjdHgpO1xuICAgIGlmICghaXNTdHJpbmcocmV0KSkge1xuICAgICAgcmV0ID0gZm9ybWF0VmFsdWUoY3R4LCByZXQsIHJlY3Vyc2VUaW1lcyk7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH1cblxuICAvLyBQcmltaXRpdmUgdHlwZXMgY2Fubm90IGhhdmUgcHJvcGVydGllc1xuICB2YXIgcHJpbWl0aXZlID0gZm9ybWF0UHJpbWl0aXZlKGN0eCwgdmFsdWUpO1xuICBpZiAocHJpbWl0aXZlKSB7XG4gICAgcmV0dXJuIHByaW1pdGl2ZTtcbiAgfVxuXG4gIC8vIExvb2sgdXAgdGhlIGtleXMgb2YgdGhlIG9iamVjdC5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh2YWx1ZSk7XG4gIHZhciB2aXNpYmxlS2V5cyA9IGFycmF5VG9IYXNoKGtleXMpO1xuXG4gIGlmIChjdHguc2hvd0hpZGRlbikge1xuICAgIGtleXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh2YWx1ZSk7XG4gIH1cblxuICAvLyBJRSBkb2Vzbid0IG1ha2UgZXJyb3IgZmllbGRzIG5vbi1lbnVtZXJhYmxlXG4gIC8vIGh0dHA6Ly9tc2RuLm1pY3Jvc29mdC5jb20vZW4tdXMvbGlicmFyeS9pZS9kd3c1MnNidCh2PXZzLjk0KS5hc3B4XG4gIGlmIChpc0Vycm9yKHZhbHVlKVxuICAgICAgJiYgKGtleXMuaW5kZXhPZignbWVzc2FnZScpID49IDAgfHwga2V5cy5pbmRleE9mKCdkZXNjcmlwdGlvbicpID49IDApKSB7XG4gICAgcmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgfVxuXG4gIC8vIFNvbWUgdHlwZSBvZiBvYmplY3Qgd2l0aG91dCBwcm9wZXJ0aWVzIGNhbiBiZSBzaG9ydGN1dHRlZC5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICB2YXIgbmFtZSA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbRnVuY3Rpb24nICsgbmFtZSArICddJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9XG4gICAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShEYXRlLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ2RhdGUnKTtcbiAgICB9XG4gICAgaWYgKGlzRXJyb3IodmFsdWUpKSB7XG4gICAgICByZXR1cm4gZm9ybWF0RXJyb3IodmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIHZhciBiYXNlID0gJycsIGFycmF5ID0gZmFsc2UsIGJyYWNlcyA9IFsneycsICd9J107XG5cbiAgLy8gTWFrZSBBcnJheSBzYXkgdGhhdCB0aGV5IGFyZSBBcnJheVxuICBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICBhcnJheSA9IHRydWU7XG4gICAgYnJhY2VzID0gWydbJywgJ10nXTtcbiAgfVxuXG4gIC8vIE1ha2UgZnVuY3Rpb25zIHNheSB0aGF0IHRoZXkgYXJlIGZ1bmN0aW9uc1xuICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICB2YXIgbiA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgIGJhc2UgPSAnIFtGdW5jdGlvbicgKyBuICsgJ10nO1xuICB9XG5cbiAgLy8gTWFrZSBSZWdFeHBzIHNheSB0aGF0IHRoZXkgYXJlIFJlZ0V4cHNcbiAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBkYXRlcyB3aXRoIHByb3BlcnRpZXMgZmlyc3Qgc2F5IHRoZSBkYXRlXG4gIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIERhdGUucHJvdG90eXBlLnRvVVRDU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBlcnJvciB3aXRoIG1lc3NhZ2UgZmlyc3Qgc2F5IHRoZSBlcnJvclxuICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgZm9ybWF0RXJyb3IodmFsdWUpO1xuICB9XG5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwICYmICghYXJyYXkgfHwgdmFsdWUubGVuZ3RoID09IDApKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyBicmFjZXNbMV07XG4gIH1cblxuICBpZiAocmVjdXJzZVRpbWVzIDwgMCkge1xuICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAncmVnZXhwJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZSgnW09iamVjdF0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuXG4gIGN0eC5zZWVuLnB1c2godmFsdWUpO1xuXG4gIHZhciBvdXRwdXQ7XG4gIGlmIChhcnJheSkge1xuICAgIG91dHB1dCA9IGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpO1xuICB9IGVsc2Uge1xuICAgIG91dHB1dCA9IGtleXMubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgICAgcmV0dXJuIGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleSwgYXJyYXkpO1xuICAgIH0pO1xuICB9XG5cbiAgY3R4LnNlZW4ucG9wKCk7XG5cbiAgcmV0dXJuIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcmltaXRpdmUoY3R4LCB2YWx1ZSkge1xuICBpZiAoaXNVbmRlZmluZWQodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgndW5kZWZpbmVkJywgJ3VuZGVmaW5lZCcpO1xuICBpZiAoaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgdmFyIHNpbXBsZSA9ICdcXCcnICsgSlNPTi5zdHJpbmdpZnkodmFsdWUpLnJlcGxhY2UoL15cInxcIiQvZywgJycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpICsgJ1xcJyc7XG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKHNpbXBsZSwgJ3N0cmluZycpO1xuICB9XG4gIGlmIChpc051bWJlcih2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCcnICsgdmFsdWUsICdudW1iZXInKTtcbiAgaWYgKGlzQm9vbGVhbih2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCcnICsgdmFsdWUsICdib29sZWFuJyk7XG4gIC8vIEZvciBzb21lIHJlYXNvbiB0eXBlb2YgbnVsbCBpcyBcIm9iamVjdFwiLCBzbyBzcGVjaWFsIGNhc2UgaGVyZS5cbiAgaWYgKGlzTnVsbCh2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCdudWxsJywgJ251bGwnKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRFcnJvcih2YWx1ZSkge1xuICByZXR1cm4gJ1snICsgRXJyb3IucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpICsgJ10nO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpIHtcbiAgdmFyIG91dHB1dCA9IFtdO1xuICBmb3IgKHZhciBpID0gMCwgbCA9IHZhbHVlLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmIChoYXNPd25Qcm9wZXJ0eSh2YWx1ZSwgU3RyaW5nKGkpKSkge1xuICAgICAgb3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cyxcbiAgICAgICAgICBTdHJpbmcoaSksIHRydWUpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0cHV0LnB1c2goJycpO1xuICAgIH1cbiAgfVxuICBrZXlzLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgaWYgKCFrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICBvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLFxuICAgICAgICAgIGtleSwgdHJ1ZSkpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBvdXRwdXQ7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5LCBhcnJheSkge1xuICB2YXIgbmFtZSwgc3RyLCBkZXNjO1xuICBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih2YWx1ZSwga2V5KSB8fCB7IHZhbHVlOiB2YWx1ZVtrZXldIH07XG4gIGlmIChkZXNjLmdldCkge1xuICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tHZXR0ZXIvU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbR2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tTZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cbiAgaWYgKCFoYXNPd25Qcm9wZXJ0eSh2aXNpYmxlS2V5cywga2V5KSkge1xuICAgIG5hbWUgPSAnWycgKyBrZXkgKyAnXSc7XG4gIH1cbiAgaWYgKCFzdHIpIHtcbiAgICBpZiAoY3R4LnNlZW4uaW5kZXhPZihkZXNjLnZhbHVlKSA8IDApIHtcbiAgICAgIGlmIChpc051bGwocmVjdXJzZVRpbWVzKSkge1xuICAgICAgICBzdHIgPSBmb3JtYXRWYWx1ZShjdHgsIGRlc2MudmFsdWUsIG51bGwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RyID0gZm9ybWF0VmFsdWUoY3R4LCBkZXNjLnZhbHVlLCByZWN1cnNlVGltZXMgLSAxKTtcbiAgICAgIH1cbiAgICAgIGlmIChzdHIuaW5kZXhPZignXFxuJykgPiAtMSkge1xuICAgICAgICBpZiAoYXJyYXkpIHtcbiAgICAgICAgICBzdHIgPSBzdHIuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gJyAgJyArIGxpbmU7XG4gICAgICAgICAgfSkuam9pbignXFxuJykuc3Vic3RyKDIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0ciA9ICdcXG4nICsgc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICAnICsgbGluZTtcbiAgICAgICAgICB9KS5qb2luKCdcXG4nKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0NpcmN1bGFyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG4gIGlmIChpc1VuZGVmaW5lZChuYW1lKSkge1xuICAgIGlmIChhcnJheSAmJiBrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICByZXR1cm4gc3RyO1xuICAgIH1cbiAgICBuYW1lID0gSlNPTi5zdHJpbmdpZnkoJycgKyBrZXkpO1xuICAgIGlmIChuYW1lLm1hdGNoKC9eXCIoW2EtekEtWl9dW2EtekEtWl8wLTldKilcIiQvKSkge1xuICAgICAgbmFtZSA9IG5hbWUuc3Vic3RyKDEsIG5hbWUubGVuZ3RoIC0gMik7XG4gICAgICBuYW1lID0gY3R4LnN0eWxpemUobmFtZSwgJ25hbWUnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbmFtZSA9IG5hbWUucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJylcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLyheXCJ8XCIkKS9nLCBcIidcIik7XG4gICAgICBuYW1lID0gY3R4LnN0eWxpemUobmFtZSwgJ3N0cmluZycpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBuYW1lICsgJzogJyArIHN0cjtcbn1cblxuXG5mdW5jdGlvbiByZWR1Y2VUb1NpbmdsZVN0cmluZyhvdXRwdXQsIGJhc2UsIGJyYWNlcykge1xuICB2YXIgbnVtTGluZXNFc3QgPSAwO1xuICB2YXIgbGVuZ3RoID0gb3V0cHV0LnJlZHVjZShmdW5jdGlvbihwcmV2LCBjdXIpIHtcbiAgICBudW1MaW5lc0VzdCsrO1xuICAgIGlmIChjdXIuaW5kZXhPZignXFxuJykgPj0gMCkgbnVtTGluZXNFc3QrKztcbiAgICByZXR1cm4gcHJldiArIGN1ci5yZXBsYWNlKC9cXHUwMDFiXFxbXFxkXFxkP20vZywgJycpLmxlbmd0aCArIDE7XG4gIH0sIDApO1xuXG4gIGlmIChsZW5ndGggPiA2MCkge1xuICAgIHJldHVybiBicmFjZXNbMF0gK1xuICAgICAgICAgICAoYmFzZSA9PT0gJycgPyAnJyA6IGJhc2UgKyAnXFxuICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgb3V0cHV0LmpvaW4oJyxcXG4gICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgYnJhY2VzWzFdO1xuICB9XG5cbiAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyAnICcgKyBvdXRwdXQuam9pbignLCAnKSArICcgJyArIGJyYWNlc1sxXTtcbn1cblxuXG4vLyBOT1RFOiBUaGVzZSB0eXBlIGNoZWNraW5nIGZ1bmN0aW9ucyBpbnRlbnRpb25hbGx5IGRvbid0IHVzZSBgaW5zdGFuY2VvZmBcbi8vIGJlY2F1c2UgaXQgaXMgZnJhZ2lsZSBhbmQgY2FuIGJlIGVhc2lseSBmYWtlZCB3aXRoIGBPYmplY3QuY3JlYXRlKClgLlxuZnVuY3Rpb24gaXNBcnJheShhcikge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheShhcik7XG59XG5leHBvcnRzLmlzQXJyYXkgPSBpc0FycmF5O1xuXG5mdW5jdGlvbiBpc0Jvb2xlYW4oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnYm9vbGVhbic7XG59XG5leHBvcnRzLmlzQm9vbGVhbiA9IGlzQm9vbGVhbjtcblxuZnVuY3Rpb24gaXNOdWxsKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGwgPSBpc051bGw7XG5cbmZ1bmN0aW9uIGlzTnVsbE9yVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbE9yVW5kZWZpbmVkID0gaXNOdWxsT3JVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5leHBvcnRzLmlzTnVtYmVyID0gaXNOdW1iZXI7XG5cbmZ1bmN0aW9uIGlzU3RyaW5nKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N0cmluZyc7XG59XG5leHBvcnRzLmlzU3RyaW5nID0gaXNTdHJpbmc7XG5cbmZ1bmN0aW9uIGlzU3ltYm9sKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCc7XG59XG5leHBvcnRzLmlzU3ltYm9sID0gaXNTeW1ib2w7XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG5leHBvcnRzLmlzVW5kZWZpbmVkID0gaXNVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzUmVnRXhwKHJlKSB7XG4gIHJldHVybiBpc09iamVjdChyZSkgJiYgb2JqZWN0VG9TdHJpbmcocmUpID09PSAnW29iamVjdCBSZWdFeHBdJztcbn1cbmV4cG9ydHMuaXNSZWdFeHAgPSBpc1JlZ0V4cDtcblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5leHBvcnRzLmlzT2JqZWN0ID0gaXNPYmplY3Q7XG5cbmZ1bmN0aW9uIGlzRGF0ZShkKSB7XG4gIHJldHVybiBpc09iamVjdChkKSAmJiBvYmplY3RUb1N0cmluZyhkKSA9PT0gJ1tvYmplY3QgRGF0ZV0nO1xufVxuZXhwb3J0cy5pc0RhdGUgPSBpc0RhdGU7XG5cbmZ1bmN0aW9uIGlzRXJyb3IoZSkge1xuICByZXR1cm4gaXNPYmplY3QoZSkgJiZcbiAgICAgIChvYmplY3RUb1N0cmluZyhlKSA9PT0gJ1tvYmplY3QgRXJyb3JdJyB8fCBlIGluc3RhbmNlb2YgRXJyb3IpO1xufVxuZXhwb3J0cy5pc0Vycm9yID0gaXNFcnJvcjtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5leHBvcnRzLmlzRnVuY3Rpb24gPSBpc0Z1bmN0aW9uO1xuXG5mdW5jdGlvbiBpc1ByaW1pdGl2ZShhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbCB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnbnVtYmVyJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N0cmluZycgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnIHx8ICAvLyBFUzYgc3ltYm9sXG4gICAgICAgICB0eXBlb2YgYXJnID09PSAndW5kZWZpbmVkJztcbn1cbmV4cG9ydHMuaXNQcmltaXRpdmUgPSBpc1ByaW1pdGl2ZTtcblxuZXhwb3J0cy5pc0J1ZmZlciA9IHJlcXVpcmUoJy4vc3VwcG9ydC9pc0J1ZmZlcicpO1xuXG5mdW5jdGlvbiBvYmplY3RUb1N0cmluZyhvKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobyk7XG59XG5cblxuZnVuY3Rpb24gcGFkKG4pIHtcbiAgcmV0dXJuIG4gPCAxMCA/ICcwJyArIG4udG9TdHJpbmcoMTApIDogbi50b1N0cmluZygxMCk7XG59XG5cblxudmFyIG1vbnRocyA9IFsnSmFuJywgJ0ZlYicsICdNYXInLCAnQXByJywgJ01heScsICdKdW4nLCAnSnVsJywgJ0F1ZycsICdTZXAnLFxuICAgICAgICAgICAgICAnT2N0JywgJ05vdicsICdEZWMnXTtcblxuLy8gMjYgRmViIDE2OjE5OjM0XG5mdW5jdGlvbiB0aW1lc3RhbXAoKSB7XG4gIHZhciBkID0gbmV3IERhdGUoKTtcbiAgdmFyIHRpbWUgPSBbcGFkKGQuZ2V0SG91cnMoKSksXG4gICAgICAgICAgICAgIHBhZChkLmdldE1pbnV0ZXMoKSksXG4gICAgICAgICAgICAgIHBhZChkLmdldFNlY29uZHMoKSldLmpvaW4oJzonKTtcbiAgcmV0dXJuIFtkLmdldERhdGUoKSwgbW9udGhzW2QuZ2V0TW9udGgoKV0sIHRpbWVdLmpvaW4oJyAnKTtcbn1cblxuXG4vLyBsb2cgaXMganVzdCBhIHRoaW4gd3JhcHBlciB0byBjb25zb2xlLmxvZyB0aGF0IHByZXBlbmRzIGEgdGltZXN0YW1wXG5leHBvcnRzLmxvZyA9IGZ1bmN0aW9uKCkge1xuICBjb25zb2xlLmxvZygnJXMgLSAlcycsIHRpbWVzdGFtcCgpLCBleHBvcnRzLmZvcm1hdC5hcHBseShleHBvcnRzLCBhcmd1bWVudHMpKTtcbn07XG5cblxuLyoqXG4gKiBJbmhlcml0IHRoZSBwcm90b3R5cGUgbWV0aG9kcyBmcm9tIG9uZSBjb25zdHJ1Y3RvciBpbnRvIGFub3RoZXIuXG4gKlxuICogVGhlIEZ1bmN0aW9uLnByb3RvdHlwZS5pbmhlcml0cyBmcm9tIGxhbmcuanMgcmV3cml0dGVuIGFzIGEgc3RhbmRhbG9uZVxuICogZnVuY3Rpb24gKG5vdCBvbiBGdW5jdGlvbi5wcm90b3R5cGUpLiBOT1RFOiBJZiB0aGlzIGZpbGUgaXMgdG8gYmUgbG9hZGVkXG4gKiBkdXJpbmcgYm9vdHN0cmFwcGluZyB0aGlzIGZ1bmN0aW9uIG5lZWRzIHRvIGJlIHJld3JpdHRlbiB1c2luZyBzb21lIG5hdGl2ZVxuICogZnVuY3Rpb25zIGFzIHByb3RvdHlwZSBzZXR1cCB1c2luZyBub3JtYWwgSmF2YVNjcmlwdCBkb2VzIG5vdCB3b3JrIGFzXG4gKiBleHBlY3RlZCBkdXJpbmcgYm9vdHN0cmFwcGluZyAoc2VlIG1pcnJvci5qcyBpbiByMTE0OTAzKS5cbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHdoaWNoIG5lZWRzIHRvIGluaGVyaXQgdGhlXG4gKiAgICAgcHJvdG90eXBlLlxuICogQHBhcmFtIHtmdW5jdGlvbn0gc3VwZXJDdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHRvIGluaGVyaXQgcHJvdG90eXBlIGZyb20uXG4gKi9cbmV4cG9ydHMuaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xuXG5leHBvcnRzLl9leHRlbmQgPSBmdW5jdGlvbihvcmlnaW4sIGFkZCkge1xuICAvLyBEb24ndCBkbyBhbnl0aGluZyBpZiBhZGQgaXNuJ3QgYW4gb2JqZWN0XG4gIGlmICghYWRkIHx8ICFpc09iamVjdChhZGQpKSByZXR1cm4gb3JpZ2luO1xuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoYWRkKTtcbiAgdmFyIGkgPSBrZXlzLmxlbmd0aDtcbiAgd2hpbGUgKGktLSkge1xuICAgIG9yaWdpbltrZXlzW2ldXSA9IGFkZFtrZXlzW2ldXTtcbiAgfVxuICByZXR1cm4gb3JpZ2luO1xufTtcblxuZnVuY3Rpb24gaGFzT3duUHJvcGVydHkob2JqLCBwcm9wKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKTtcbn1cbiIsIlwidXNlIHN0cmljdFwiO1xudmFyIFV0aWxzID0gcmVxdWlyZShcIi4vdXRpbHNcIik7XG52YXIgRXhjZXB0aW9uID0gcmVxdWlyZShcIi4vZXhjZXB0aW9uXCIpW1wiZGVmYXVsdFwiXTtcblxudmFyIFZFUlNJT04gPSBcIjEuMi4xXCI7XG5leHBvcnRzLlZFUlNJT04gPSBWRVJTSU9OO3ZhciBDT01QSUxFUl9SRVZJU0lPTiA9IDQ7XG5leHBvcnRzLkNPTVBJTEVSX1JFVklTSU9OID0gQ09NUElMRVJfUkVWSVNJT047XG52YXIgUkVWSVNJT05fQ0hBTkdFUyA9IHtcbiAgMTogJzw9IDEuMC5yYy4yJywgLy8gMS4wLnJjLjIgaXMgYWN0dWFsbHkgcmV2MiBidXQgZG9lc24ndCByZXBvcnQgaXRcbiAgMjogJz09IDEuMC4wLXJjLjMnLFxuICAzOiAnPT0gMS4wLjAtcmMuNCcsXG4gIDQ6ICc+PSAxLjAuMCdcbn07XG5leHBvcnRzLlJFVklTSU9OX0NIQU5HRVMgPSBSRVZJU0lPTl9DSEFOR0VTO1xudmFyIGlzQXJyYXkgPSBVdGlscy5pc0FycmF5LFxuICAgIGlzRnVuY3Rpb24gPSBVdGlscy5pc0Z1bmN0aW9uLFxuICAgIHRvU3RyaW5nID0gVXRpbHMudG9TdHJpbmcsXG4gICAgb2JqZWN0VHlwZSA9ICdbb2JqZWN0IE9iamVjdF0nO1xuXG5mdW5jdGlvbiBIYW5kbGViYXJzRW52aXJvbm1lbnQoaGVscGVycywgcGFydGlhbHMpIHtcbiAgdGhpcy5oZWxwZXJzID0gaGVscGVycyB8fCB7fTtcbiAgdGhpcy5wYXJ0aWFscyA9IHBhcnRpYWxzIHx8IHt9O1xuXG4gIHJlZ2lzdGVyRGVmYXVsdEhlbHBlcnModGhpcyk7XG59XG5cbmV4cG9ydHMuSGFuZGxlYmFyc0Vudmlyb25tZW50ID0gSGFuZGxlYmFyc0Vudmlyb25tZW50O0hhbmRsZWJhcnNFbnZpcm9ubWVudC5wcm90b3R5cGUgPSB7XG4gIGNvbnN0cnVjdG9yOiBIYW5kbGViYXJzRW52aXJvbm1lbnQsXG5cbiAgbG9nZ2VyOiBsb2dnZXIsXG4gIGxvZzogbG9nLFxuXG4gIHJlZ2lzdGVySGVscGVyOiBmdW5jdGlvbihuYW1lLCBmbiwgaW52ZXJzZSkge1xuICAgIGlmICh0b1N0cmluZy5jYWxsKG5hbWUpID09PSBvYmplY3RUeXBlKSB7XG4gICAgICBpZiAoaW52ZXJzZSB8fCBmbikgeyB0aHJvdyBuZXcgRXhjZXB0aW9uKCdBcmcgbm90IHN1cHBvcnRlZCB3aXRoIG11bHRpcGxlIGhlbHBlcnMnKTsgfVxuICAgICAgVXRpbHMuZXh0ZW5kKHRoaXMuaGVscGVycywgbmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChpbnZlcnNlKSB7IGZuLm5vdCA9IGludmVyc2U7IH1cbiAgICAgIHRoaXMuaGVscGVyc1tuYW1lXSA9IGZuO1xuICAgIH1cbiAgfSxcblxuICByZWdpc3RlclBhcnRpYWw6IGZ1bmN0aW9uKG5hbWUsIHN0cikge1xuICAgIGlmICh0b1N0cmluZy5jYWxsKG5hbWUpID09PSBvYmplY3RUeXBlKSB7XG4gICAgICBVdGlscy5leHRlbmQodGhpcy5wYXJ0aWFscywgIG5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnBhcnRpYWxzW25hbWVdID0gc3RyO1xuICAgIH1cbiAgfVxufTtcblxuZnVuY3Rpb24gcmVnaXN0ZXJEZWZhdWx0SGVscGVycyhpbnN0YW5jZSkge1xuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignaGVscGVyTWlzc2luZycsIGZ1bmN0aW9uKGFyZykge1xuICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgaGVscGVyOiAnXCIgKyBhcmcgKyBcIidcIik7XG4gICAgfVxuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignYmxvY2tIZWxwZXJNaXNzaW5nJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIHZhciBpbnZlcnNlID0gb3B0aW9ucy5pbnZlcnNlIHx8IGZ1bmN0aW9uKCkge30sIGZuID0gb3B0aW9ucy5mbjtcblxuICAgIGlmIChpc0Z1bmN0aW9uKGNvbnRleHQpKSB7IGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7IH1cblxuICAgIGlmKGNvbnRleHQgPT09IHRydWUpIHtcbiAgICAgIHJldHVybiBmbih0aGlzKTtcbiAgICB9IGVsc2UgaWYoY29udGV4dCA9PT0gZmFsc2UgfHwgY29udGV4dCA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gaW52ZXJzZSh0aGlzKTtcbiAgICB9IGVsc2UgaWYgKGlzQXJyYXkoY29udGV4dCkpIHtcbiAgICAgIGlmKGNvbnRleHQubGVuZ3RoID4gMCkge1xuICAgICAgICByZXR1cm4gaW5zdGFuY2UuaGVscGVycy5lYWNoKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGludmVyc2UodGhpcyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmbihjb250ZXh0KTtcbiAgICB9XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdlYWNoJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIHZhciBmbiA9IG9wdGlvbnMuZm4sIGludmVyc2UgPSBvcHRpb25zLmludmVyc2U7XG4gICAgdmFyIGkgPSAwLCByZXQgPSBcIlwiLCBkYXRhO1xuXG4gICAgaWYgKGlzRnVuY3Rpb24oY29udGV4dCkpIHsgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTsgfVxuXG4gICAgaWYgKG9wdGlvbnMuZGF0YSkge1xuICAgICAgZGF0YSA9IGNyZWF0ZUZyYW1lKG9wdGlvbnMuZGF0YSk7XG4gICAgfVxuXG4gICAgaWYoY29udGV4dCAmJiB0eXBlb2YgY29udGV4dCA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGlmIChpc0FycmF5KGNvbnRleHQpKSB7XG4gICAgICAgIGZvcih2YXIgaiA9IGNvbnRleHQubGVuZ3RoOyBpPGo7IGkrKykge1xuICAgICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICBkYXRhLmluZGV4ID0gaTtcbiAgICAgICAgICAgIGRhdGEuZmlyc3QgPSAoaSA9PT0gMCk7XG4gICAgICAgICAgICBkYXRhLmxhc3QgID0gKGkgPT09IChjb250ZXh0Lmxlbmd0aC0xKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldCA9IHJldCArIGZuKGNvbnRleHRbaV0sIHsgZGF0YTogZGF0YSB9KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9yKHZhciBrZXkgaW4gY29udGV4dCkge1xuICAgICAgICAgIGlmKGNvbnRleHQuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgaWYoZGF0YSkgeyBcbiAgICAgICAgICAgICAgZGF0YS5rZXkgPSBrZXk7IFxuICAgICAgICAgICAgICBkYXRhLmluZGV4ID0gaTtcbiAgICAgICAgICAgICAgZGF0YS5maXJzdCA9IChpID09PSAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldCA9IHJldCArIGZuKGNvbnRleHRba2V5XSwge2RhdGE6IGRhdGF9KTtcbiAgICAgICAgICAgIGkrKztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZihpID09PSAwKXtcbiAgICAgIHJldCA9IGludmVyc2UodGhpcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldDtcbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2lmJywgZnVuY3Rpb24oY29uZGl0aW9uYWwsIG9wdGlvbnMpIHtcbiAgICBpZiAoaXNGdW5jdGlvbihjb25kaXRpb25hbCkpIHsgY29uZGl0aW9uYWwgPSBjb25kaXRpb25hbC5jYWxsKHRoaXMpOyB9XG5cbiAgICAvLyBEZWZhdWx0IGJlaGF2aW9yIGlzIHRvIHJlbmRlciB0aGUgcG9zaXRpdmUgcGF0aCBpZiB0aGUgdmFsdWUgaXMgdHJ1dGh5IGFuZCBub3QgZW1wdHkuXG4gICAgLy8gVGhlIGBpbmNsdWRlWmVyb2Agb3B0aW9uIG1heSBiZSBzZXQgdG8gdHJlYXQgdGhlIGNvbmR0aW9uYWwgYXMgcHVyZWx5IG5vdCBlbXB0eSBiYXNlZCBvbiB0aGVcbiAgICAvLyBiZWhhdmlvciBvZiBpc0VtcHR5LiBFZmZlY3RpdmVseSB0aGlzIGRldGVybWluZXMgaWYgMCBpcyBoYW5kbGVkIGJ5IHRoZSBwb3NpdGl2ZSBwYXRoIG9yIG5lZ2F0aXZlLlxuICAgIGlmICgoIW9wdGlvbnMuaGFzaC5pbmNsdWRlWmVybyAmJiAhY29uZGl0aW9uYWwpIHx8IFV0aWxzLmlzRW1wdHkoY29uZGl0aW9uYWwpKSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5pbnZlcnNlKHRoaXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5mbih0aGlzKTtcbiAgICB9XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCd1bmxlc3MnLCBmdW5jdGlvbihjb25kaXRpb25hbCwgb3B0aW9ucykge1xuICAgIHJldHVybiBpbnN0YW5jZS5oZWxwZXJzWydpZiddLmNhbGwodGhpcywgY29uZGl0aW9uYWwsIHtmbjogb3B0aW9ucy5pbnZlcnNlLCBpbnZlcnNlOiBvcHRpb25zLmZuLCBoYXNoOiBvcHRpb25zLmhhc2h9KTtcbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ3dpdGgnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24oY29udGV4dCkpIHsgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTsgfVxuXG4gICAgaWYgKCFVdGlscy5pc0VtcHR5KGNvbnRleHQpKSByZXR1cm4gb3B0aW9ucy5mbihjb250ZXh0KTtcbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2xvZycsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICB2YXIgbGV2ZWwgPSBvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5kYXRhLmxldmVsICE9IG51bGwgPyBwYXJzZUludChvcHRpb25zLmRhdGEubGV2ZWwsIDEwKSA6IDE7XG4gICAgaW5zdGFuY2UubG9nKGxldmVsLCBjb250ZXh0KTtcbiAgfSk7XG59XG5cbnZhciBsb2dnZXIgPSB7XG4gIG1ldGhvZE1hcDogeyAwOiAnZGVidWcnLCAxOiAnaW5mbycsIDI6ICd3YXJuJywgMzogJ2Vycm9yJyB9LFxuXG4gIC8vIFN0YXRlIGVudW1cbiAgREVCVUc6IDAsXG4gIElORk86IDEsXG4gIFdBUk46IDIsXG4gIEVSUk9SOiAzLFxuICBsZXZlbDogMyxcblxuICAvLyBjYW4gYmUgb3ZlcnJpZGRlbiBpbiB0aGUgaG9zdCBlbnZpcm9ubWVudFxuICBsb2c6IGZ1bmN0aW9uKGxldmVsLCBvYmopIHtcbiAgICBpZiAobG9nZ2VyLmxldmVsIDw9IGxldmVsKSB7XG4gICAgICB2YXIgbWV0aG9kID0gbG9nZ2VyLm1ldGhvZE1hcFtsZXZlbF07XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnICYmIGNvbnNvbGVbbWV0aG9kXSkge1xuICAgICAgICBjb25zb2xlW21ldGhvZF0uY2FsbChjb25zb2xlLCBvYmopO1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcbmV4cG9ydHMubG9nZ2VyID0gbG9nZ2VyO1xuZnVuY3Rpb24gbG9nKGxldmVsLCBvYmopIHsgbG9nZ2VyLmxvZyhsZXZlbCwgb2JqKTsgfVxuXG5leHBvcnRzLmxvZyA9IGxvZzt2YXIgY3JlYXRlRnJhbWUgPSBmdW5jdGlvbihvYmplY3QpIHtcbiAgdmFyIG9iaiA9IHt9O1xuICBVdGlscy5leHRlbmQob2JqLCBvYmplY3QpO1xuICByZXR1cm4gb2JqO1xufTtcbmV4cG9ydHMuY3JlYXRlRnJhbWUgPSBjcmVhdGVGcmFtZTsiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBFeGNlcHRpb24gPSByZXF1aXJlKFwiLi4vZXhjZXB0aW9uXCIpW1wiZGVmYXVsdFwiXTtcblxudmFyIEFTVCA9IHtcbiAgUHJvZ3JhbU5vZGU6IGZ1bmN0aW9uKHN0YXRlbWVudHMsIGludmVyc2VTdHJpcCwgaW52ZXJzZSkge1xuICAgIHRoaXMudHlwZSA9IFwicHJvZ3JhbVwiO1xuICAgIHRoaXMuc3RhdGVtZW50cyA9IHN0YXRlbWVudHM7XG4gICAgdGhpcy5zdHJpcCA9IHt9O1xuXG4gICAgaWYoaW52ZXJzZSkge1xuICAgICAgdGhpcy5pbnZlcnNlID0gbmV3IEFTVC5Qcm9ncmFtTm9kZShpbnZlcnNlLCBpbnZlcnNlU3RyaXApO1xuICAgICAgdGhpcy5zdHJpcC5yaWdodCA9IGludmVyc2VTdHJpcC5sZWZ0O1xuICAgIH0gZWxzZSBpZiAoaW52ZXJzZVN0cmlwKSB7XG4gICAgICB0aGlzLnN0cmlwLmxlZnQgPSBpbnZlcnNlU3RyaXAucmlnaHQ7XG4gICAgfVxuICB9LFxuXG4gIE11c3RhY2hlTm9kZTogZnVuY3Rpb24ocmF3UGFyYW1zLCBoYXNoLCBvcGVuLCBzdHJpcCkge1xuICAgIHRoaXMudHlwZSA9IFwibXVzdGFjaGVcIjtcbiAgICB0aGlzLmhhc2ggPSBoYXNoO1xuICAgIHRoaXMuc3RyaXAgPSBzdHJpcDtcblxuICAgIC8vIE9wZW4gbWF5IGJlIGEgc3RyaW5nIHBhcnNlZCBmcm9tIHRoZSBwYXJzZXIgb3IgYSBwYXNzZWQgYm9vbGVhbiBmbGFnXG4gICAgaWYgKG9wZW4gIT0gbnVsbCAmJiBvcGVuLmNoYXJBdCkge1xuICAgICAgLy8gTXVzdCB1c2UgY2hhckF0IHRvIHN1cHBvcnQgSUUgcHJlLTEwXG4gICAgICB2YXIgZXNjYXBlRmxhZyA9IG9wZW4uY2hhckF0KDMpIHx8IG9wZW4uY2hhckF0KDIpO1xuICAgICAgdGhpcy5lc2NhcGVkID0gZXNjYXBlRmxhZyAhPT0gJ3snICYmIGVzY2FwZUZsYWcgIT09ICcmJztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5lc2NhcGVkID0gISFvcGVuO1xuICAgIH1cblxuICAgIHZhciBpZCA9IHRoaXMuaWQgPSByYXdQYXJhbXNbMF07XG4gICAgdmFyIHBhcmFtcyA9IHRoaXMucGFyYW1zID0gcmF3UGFyYW1zLnNsaWNlKDEpO1xuXG4gICAgLy8gYSBtdXN0YWNoZSBpcyBhbiBlbGlnaWJsZSBoZWxwZXIgaWY6XG4gICAgLy8gKiBpdHMgaWQgaXMgc2ltcGxlIChhIHNpbmdsZSBwYXJ0LCBub3QgYHRoaXNgIG9yIGAuLmApXG4gICAgdmFyIGVsaWdpYmxlSGVscGVyID0gdGhpcy5lbGlnaWJsZUhlbHBlciA9IGlkLmlzU2ltcGxlO1xuXG4gICAgLy8gYSBtdXN0YWNoZSBpcyBkZWZpbml0ZWx5IGEgaGVscGVyIGlmOlxuICAgIC8vICogaXQgaXMgYW4gZWxpZ2libGUgaGVscGVyLCBhbmRcbiAgICAvLyAqIGl0IGhhcyBhdCBsZWFzdCBvbmUgcGFyYW1ldGVyIG9yIGhhc2ggc2VnbWVudFxuICAgIHRoaXMuaXNIZWxwZXIgPSBlbGlnaWJsZUhlbHBlciAmJiAocGFyYW1zLmxlbmd0aCB8fCBoYXNoKTtcblxuICAgIC8vIGlmIGEgbXVzdGFjaGUgaXMgYW4gZWxpZ2libGUgaGVscGVyIGJ1dCBub3QgYSBkZWZpbml0ZVxuICAgIC8vIGhlbHBlciwgaXQgaXMgYW1iaWd1b3VzLCBhbmQgd2lsbCBiZSByZXNvbHZlZCBpbiBhIGxhdGVyXG4gICAgLy8gcGFzcyBvciBhdCBydW50aW1lLlxuICB9LFxuXG4gIFBhcnRpYWxOb2RlOiBmdW5jdGlvbihwYXJ0aWFsTmFtZSwgY29udGV4dCwgc3RyaXApIHtcbiAgICB0aGlzLnR5cGUgICAgICAgICA9IFwicGFydGlhbFwiO1xuICAgIHRoaXMucGFydGlhbE5hbWUgID0gcGFydGlhbE5hbWU7XG4gICAgdGhpcy5jb250ZXh0ICAgICAgPSBjb250ZXh0O1xuICAgIHRoaXMuc3RyaXAgPSBzdHJpcDtcbiAgfSxcblxuICBCbG9ja05vZGU6IGZ1bmN0aW9uKG11c3RhY2hlLCBwcm9ncmFtLCBpbnZlcnNlLCBjbG9zZSkge1xuICAgIGlmKG11c3RhY2hlLmlkLm9yaWdpbmFsICE9PSBjbG9zZS5wYXRoLm9yaWdpbmFsKSB7XG4gICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKG11c3RhY2hlLmlkLm9yaWdpbmFsICsgXCIgZG9lc24ndCBtYXRjaCBcIiArIGNsb3NlLnBhdGgub3JpZ2luYWwpO1xuICAgIH1cblxuICAgIHRoaXMudHlwZSA9IFwiYmxvY2tcIjtcbiAgICB0aGlzLm11c3RhY2hlID0gbXVzdGFjaGU7XG4gICAgdGhpcy5wcm9ncmFtICA9IHByb2dyYW07XG4gICAgdGhpcy5pbnZlcnNlICA9IGludmVyc2U7XG5cbiAgICB0aGlzLnN0cmlwID0ge1xuICAgICAgbGVmdDogbXVzdGFjaGUuc3RyaXAubGVmdCxcbiAgICAgIHJpZ2h0OiBjbG9zZS5zdHJpcC5yaWdodFxuICAgIH07XG5cbiAgICAocHJvZ3JhbSB8fCBpbnZlcnNlKS5zdHJpcC5sZWZ0ID0gbXVzdGFjaGUuc3RyaXAucmlnaHQ7XG4gICAgKGludmVyc2UgfHwgcHJvZ3JhbSkuc3RyaXAucmlnaHQgPSBjbG9zZS5zdHJpcC5sZWZ0O1xuXG4gICAgaWYgKGludmVyc2UgJiYgIXByb2dyYW0pIHtcbiAgICAgIHRoaXMuaXNJbnZlcnNlID0gdHJ1ZTtcbiAgICB9XG4gIH0sXG5cbiAgQ29udGVudE5vZGU6IGZ1bmN0aW9uKHN0cmluZykge1xuICAgIHRoaXMudHlwZSA9IFwiY29udGVudFwiO1xuICAgIHRoaXMuc3RyaW5nID0gc3RyaW5nO1xuICB9LFxuXG4gIEhhc2hOb2RlOiBmdW5jdGlvbihwYWlycykge1xuICAgIHRoaXMudHlwZSA9IFwiaGFzaFwiO1xuICAgIHRoaXMucGFpcnMgPSBwYWlycztcbiAgfSxcblxuICBJZE5vZGU6IGZ1bmN0aW9uKHBhcnRzKSB7XG4gICAgdGhpcy50eXBlID0gXCJJRFwiO1xuXG4gICAgdmFyIG9yaWdpbmFsID0gXCJcIixcbiAgICAgICAgZGlnID0gW10sXG4gICAgICAgIGRlcHRoID0gMDtcblxuICAgIGZvcih2YXIgaT0wLGw9cGFydHMubGVuZ3RoOyBpPGw7IGkrKykge1xuICAgICAgdmFyIHBhcnQgPSBwYXJ0c1tpXS5wYXJ0O1xuICAgICAgb3JpZ2luYWwgKz0gKHBhcnRzW2ldLnNlcGFyYXRvciB8fCAnJykgKyBwYXJ0O1xuXG4gICAgICBpZiAocGFydCA9PT0gXCIuLlwiIHx8IHBhcnQgPT09IFwiLlwiIHx8IHBhcnQgPT09IFwidGhpc1wiKSB7XG4gICAgICAgIGlmIChkaWcubGVuZ3RoID4gMCkgeyB0aHJvdyBuZXcgRXhjZXB0aW9uKFwiSW52YWxpZCBwYXRoOiBcIiArIG9yaWdpbmFsKTsgfVxuICAgICAgICBlbHNlIGlmIChwYXJ0ID09PSBcIi4uXCIpIHsgZGVwdGgrKzsgfVxuICAgICAgICBlbHNlIHsgdGhpcy5pc1Njb3BlZCA9IHRydWU7IH1cbiAgICAgIH1cbiAgICAgIGVsc2UgeyBkaWcucHVzaChwYXJ0KTsgfVxuICAgIH1cblxuICAgIHRoaXMub3JpZ2luYWwgPSBvcmlnaW5hbDtcbiAgICB0aGlzLnBhcnRzICAgID0gZGlnO1xuICAgIHRoaXMuc3RyaW5nICAgPSBkaWcuam9pbignLicpO1xuICAgIHRoaXMuZGVwdGggICAgPSBkZXB0aDtcblxuICAgIC8vIGFuIElEIGlzIHNpbXBsZSBpZiBpdCBvbmx5IGhhcyBvbmUgcGFydCwgYW5kIHRoYXQgcGFydCBpcyBub3RcbiAgICAvLyBgLi5gIG9yIGB0aGlzYC5cbiAgICB0aGlzLmlzU2ltcGxlID0gcGFydHMubGVuZ3RoID09PSAxICYmICF0aGlzLmlzU2NvcGVkICYmIGRlcHRoID09PSAwO1xuXG4gICAgdGhpcy5zdHJpbmdNb2RlVmFsdWUgPSB0aGlzLnN0cmluZztcbiAgfSxcblxuICBQYXJ0aWFsTmFtZU5vZGU6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB0aGlzLnR5cGUgPSBcIlBBUlRJQUxfTkFNRVwiO1xuICAgIHRoaXMubmFtZSA9IG5hbWUub3JpZ2luYWw7XG4gIH0sXG5cbiAgRGF0YU5vZGU6IGZ1bmN0aW9uKGlkKSB7XG4gICAgdGhpcy50eXBlID0gXCJEQVRBXCI7XG4gICAgdGhpcy5pZCA9IGlkO1xuICB9LFxuXG4gIFN0cmluZ05vZGU6IGZ1bmN0aW9uKHN0cmluZykge1xuICAgIHRoaXMudHlwZSA9IFwiU1RSSU5HXCI7XG4gICAgdGhpcy5vcmlnaW5hbCA9XG4gICAgICB0aGlzLnN0cmluZyA9XG4gICAgICB0aGlzLnN0cmluZ01vZGVWYWx1ZSA9IHN0cmluZztcbiAgfSxcblxuICBJbnRlZ2VyTm9kZTogZnVuY3Rpb24oaW50ZWdlcikge1xuICAgIHRoaXMudHlwZSA9IFwiSU5URUdFUlwiO1xuICAgIHRoaXMub3JpZ2luYWwgPVxuICAgICAgdGhpcy5pbnRlZ2VyID0gaW50ZWdlcjtcbiAgICB0aGlzLnN0cmluZ01vZGVWYWx1ZSA9IE51bWJlcihpbnRlZ2VyKTtcbiAgfSxcblxuICBCb29sZWFuTm9kZTogZnVuY3Rpb24oYm9vbCkge1xuICAgIHRoaXMudHlwZSA9IFwiQk9PTEVBTlwiO1xuICAgIHRoaXMuYm9vbCA9IGJvb2w7XG4gICAgdGhpcy5zdHJpbmdNb2RlVmFsdWUgPSBib29sID09PSBcInRydWVcIjtcbiAgfSxcblxuICBDb21tZW50Tm9kZTogZnVuY3Rpb24oY29tbWVudCkge1xuICAgIHRoaXMudHlwZSA9IFwiY29tbWVudFwiO1xuICAgIHRoaXMuY29tbWVudCA9IGNvbW1lbnQ7XG4gIH1cbn07XG5cbi8vIE11c3QgYmUgZXhwb3J0ZWQgYXMgYW4gb2JqZWN0IHJhdGhlciB0aGFuIHRoZSByb290IG9mIHRoZSBtb2R1bGUgYXMgdGhlIGppc29uIGxleGVyXG4vLyBtb3N0IG1vZGlmeSB0aGUgb2JqZWN0IHRvIG9wZXJhdGUgcHJvcGVybHkuXG5leHBvcnRzW1wiZGVmYXVsdFwiXSA9IEFTVDsiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBwYXJzZXIgPSByZXF1aXJlKFwiLi9wYXJzZXJcIilbXCJkZWZhdWx0XCJdO1xudmFyIEFTVCA9IHJlcXVpcmUoXCIuL2FzdFwiKVtcImRlZmF1bHRcIl07XG5cbmV4cG9ydHMucGFyc2VyID0gcGFyc2VyO1xuXG5mdW5jdGlvbiBwYXJzZShpbnB1dCkge1xuICAvLyBKdXN0IHJldHVybiBpZiBhbiBhbHJlYWR5LWNvbXBpbGUgQVNUIHdhcyBwYXNzZWQgaW4uXG4gIGlmKGlucHV0LmNvbnN0cnVjdG9yID09PSBBU1QuUHJvZ3JhbU5vZGUpIHsgcmV0dXJuIGlucHV0OyB9XG5cbiAgcGFyc2VyLnl5ID0gQVNUO1xuICByZXR1cm4gcGFyc2VyLnBhcnNlKGlucHV0KTtcbn1cblxuZXhwb3J0cy5wYXJzZSA9IHBhcnNlOyIsIlwidXNlIHN0cmljdFwiO1xudmFyIEV4Y2VwdGlvbiA9IHJlcXVpcmUoXCIuLi9leGNlcHRpb25cIilbXCJkZWZhdWx0XCJdO1xudmFyIHBhcnNlID0gcmVxdWlyZShcIi4vYmFzZVwiKS5wYXJzZTtcbnZhciBKYXZhU2NyaXB0Q29tcGlsZXIgPSByZXF1aXJlKFwiLi9qYXZhc2NyaXB0LWNvbXBpbGVyXCIpW1wiZGVmYXVsdFwiXTtcbnZhciBBU1QgPSByZXF1aXJlKFwiLi9hc3RcIilbXCJkZWZhdWx0XCJdO1xuXG5mdW5jdGlvbiBDb21waWxlcigpIHt9XG5cbmV4cG9ydHMuQ29tcGlsZXIgPSBDb21waWxlcjsvLyB0aGUgZm91bmRIZWxwZXIgcmVnaXN0ZXIgd2lsbCBkaXNhbWJpZ3VhdGUgaGVscGVyIGxvb2t1cCBmcm9tIGZpbmRpbmcgYVxuLy8gZnVuY3Rpb24gaW4gYSBjb250ZXh0LiBUaGlzIGlzIG5lY2Vzc2FyeSBmb3IgbXVzdGFjaGUgY29tcGF0aWJpbGl0eSwgd2hpY2hcbi8vIHJlcXVpcmVzIHRoYXQgY29udGV4dCBmdW5jdGlvbnMgaW4gYmxvY2tzIGFyZSBldmFsdWF0ZWQgYnkgYmxvY2tIZWxwZXJNaXNzaW5nLFxuLy8gYW5kIHRoZW4gcHJvY2VlZCBhcyBpZiB0aGUgcmVzdWx0aW5nIHZhbHVlIHdhcyBwcm92aWRlZCB0byBibG9ja0hlbHBlck1pc3NpbmcuXG5cbkNvbXBpbGVyLnByb3RvdHlwZSA9IHtcbiAgY29tcGlsZXI6IENvbXBpbGVyLFxuXG4gIGRpc2Fzc2VtYmxlOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgb3Bjb2RlcyA9IHRoaXMub3Bjb2Rlcywgb3Bjb2RlLCBvdXQgPSBbXSwgcGFyYW1zLCBwYXJhbTtcblxuICAgIGZvciAodmFyIGk9MCwgbD1vcGNvZGVzLmxlbmd0aDsgaTxsOyBpKyspIHtcbiAgICAgIG9wY29kZSA9IG9wY29kZXNbaV07XG5cbiAgICAgIGlmIChvcGNvZGUub3Bjb2RlID09PSAnREVDTEFSRScpIHtcbiAgICAgICAgb3V0LnB1c2goXCJERUNMQVJFIFwiICsgb3Bjb2RlLm5hbWUgKyBcIj1cIiArIG9wY29kZS52YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwYXJhbXMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaj0wOyBqPG9wY29kZS5hcmdzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgcGFyYW0gPSBvcGNvZGUuYXJnc1tqXTtcbiAgICAgICAgICBpZiAodHlwZW9mIHBhcmFtID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICBwYXJhbSA9IFwiXFxcIlwiICsgcGFyYW0ucmVwbGFjZShcIlxcblwiLCBcIlxcXFxuXCIpICsgXCJcXFwiXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIHBhcmFtcy5wdXNoKHBhcmFtKTtcbiAgICAgICAgfVxuICAgICAgICBvdXQucHVzaChvcGNvZGUub3Bjb2RlICsgXCIgXCIgKyBwYXJhbXMuam9pbihcIiBcIikpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBvdXQuam9pbihcIlxcblwiKTtcbiAgfSxcblxuICBlcXVhbHM6IGZ1bmN0aW9uKG90aGVyKSB7XG4gICAgdmFyIGxlbiA9IHRoaXMub3Bjb2Rlcy5sZW5ndGg7XG4gICAgaWYgKG90aGVyLm9wY29kZXMubGVuZ3RoICE9PSBsZW4pIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICB2YXIgb3Bjb2RlID0gdGhpcy5vcGNvZGVzW2ldLFxuICAgICAgICAgIG90aGVyT3Bjb2RlID0gb3RoZXIub3Bjb2Rlc1tpXTtcbiAgICAgIGlmIChvcGNvZGUub3Bjb2RlICE9PSBvdGhlck9wY29kZS5vcGNvZGUgfHwgb3Bjb2RlLmFyZ3MubGVuZ3RoICE9PSBvdGhlck9wY29kZS5hcmdzLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IG9wY29kZS5hcmdzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIGlmIChvcGNvZGUuYXJnc1tqXSAhPT0gb3RoZXJPcGNvZGUuYXJnc1tqXSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGxlbiA9IHRoaXMuY2hpbGRyZW4ubGVuZ3RoO1xuICAgIGlmIChvdGhlci5jaGlsZHJlbi5sZW5ndGggIT09IGxlbikge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGlmICghdGhpcy5jaGlsZHJlbltpXS5lcXVhbHMob3RoZXIuY2hpbGRyZW5baV0pKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSxcblxuICBndWlkOiAwLFxuXG4gIGNvbXBpbGU6IGZ1bmN0aW9uKHByb2dyYW0sIG9wdGlvbnMpIHtcbiAgICB0aGlzLm9wY29kZXMgPSBbXTtcbiAgICB0aGlzLmNoaWxkcmVuID0gW107XG4gICAgdGhpcy5kZXB0aHMgPSB7bGlzdDogW119O1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG5cbiAgICAvLyBUaGVzZSBjaGFuZ2VzIHdpbGwgcHJvcGFnYXRlIHRvIHRoZSBvdGhlciBjb21waWxlciBjb21wb25lbnRzXG4gICAgdmFyIGtub3duSGVscGVycyA9IHRoaXMub3B0aW9ucy5rbm93bkhlbHBlcnM7XG4gICAgdGhpcy5vcHRpb25zLmtub3duSGVscGVycyA9IHtcbiAgICAgICdoZWxwZXJNaXNzaW5nJzogdHJ1ZSxcbiAgICAgICdibG9ja0hlbHBlck1pc3NpbmcnOiB0cnVlLFxuICAgICAgJ2VhY2gnOiB0cnVlLFxuICAgICAgJ2lmJzogdHJ1ZSxcbiAgICAgICd1bmxlc3MnOiB0cnVlLFxuICAgICAgJ3dpdGgnOiB0cnVlLFxuICAgICAgJ2xvZyc6IHRydWVcbiAgICB9O1xuICAgIGlmIChrbm93bkhlbHBlcnMpIHtcbiAgICAgIGZvciAodmFyIG5hbWUgaW4ga25vd25IZWxwZXJzKSB7XG4gICAgICAgIHRoaXMub3B0aW9ucy5rbm93bkhlbHBlcnNbbmFtZV0gPSBrbm93bkhlbHBlcnNbbmFtZV07XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuYWNjZXB0KHByb2dyYW0pO1xuICB9LFxuXG4gIGFjY2VwdDogZnVuY3Rpb24obm9kZSkge1xuICAgIHZhciBzdHJpcCA9IG5vZGUuc3RyaXAgfHwge30sXG4gICAgICAgIHJldDtcbiAgICBpZiAoc3RyaXAubGVmdCkge1xuICAgICAgdGhpcy5vcGNvZGUoJ3N0cmlwJyk7XG4gICAgfVxuXG4gICAgcmV0ID0gdGhpc1tub2RlLnR5cGVdKG5vZGUpO1xuXG4gICAgaWYgKHN0cmlwLnJpZ2h0KSB7XG4gICAgICB0aGlzLm9wY29kZSgnc3RyaXAnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmV0O1xuICB9LFxuXG4gIHByb2dyYW06IGZ1bmN0aW9uKHByb2dyYW0pIHtcbiAgICB2YXIgc3RhdGVtZW50cyA9IHByb2dyYW0uc3RhdGVtZW50cztcblxuICAgIGZvcih2YXIgaT0wLCBsPXN0YXRlbWVudHMubGVuZ3RoOyBpPGw7IGkrKykge1xuICAgICAgdGhpcy5hY2NlcHQoc3RhdGVtZW50c1tpXSk7XG4gICAgfVxuICAgIHRoaXMuaXNTaW1wbGUgPSBsID09PSAxO1xuXG4gICAgdGhpcy5kZXB0aHMubGlzdCA9IHRoaXMuZGVwdGhzLmxpc3Quc29ydChmdW5jdGlvbihhLCBiKSB7XG4gICAgICByZXR1cm4gYSAtIGI7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICBjb21waWxlUHJvZ3JhbTogZnVuY3Rpb24ocHJvZ3JhbSkge1xuICAgIHZhciByZXN1bHQgPSBuZXcgdGhpcy5jb21waWxlcigpLmNvbXBpbGUocHJvZ3JhbSwgdGhpcy5vcHRpb25zKTtcbiAgICB2YXIgZ3VpZCA9IHRoaXMuZ3VpZCsrLCBkZXB0aDtcblxuICAgIHRoaXMudXNlUGFydGlhbCA9IHRoaXMudXNlUGFydGlhbCB8fCByZXN1bHQudXNlUGFydGlhbDtcblxuICAgIHRoaXMuY2hpbGRyZW5bZ3VpZF0gPSByZXN1bHQ7XG5cbiAgICBmb3IodmFyIGk9MCwgbD1yZXN1bHQuZGVwdGhzLmxpc3QubGVuZ3RoOyBpPGw7IGkrKykge1xuICAgICAgZGVwdGggPSByZXN1bHQuZGVwdGhzLmxpc3RbaV07XG5cbiAgICAgIGlmKGRlcHRoIDwgMikgeyBjb250aW51ZTsgfVxuICAgICAgZWxzZSB7IHRoaXMuYWRkRGVwdGgoZGVwdGggLSAxKTsgfVxuICAgIH1cblxuICAgIHJldHVybiBndWlkO1xuICB9LFxuXG4gIGJsb2NrOiBmdW5jdGlvbihibG9jaykge1xuICAgIHZhciBtdXN0YWNoZSA9IGJsb2NrLm11c3RhY2hlLFxuICAgICAgICBwcm9ncmFtID0gYmxvY2sucHJvZ3JhbSxcbiAgICAgICAgaW52ZXJzZSA9IGJsb2NrLmludmVyc2U7XG5cbiAgICBpZiAocHJvZ3JhbSkge1xuICAgICAgcHJvZ3JhbSA9IHRoaXMuY29tcGlsZVByb2dyYW0ocHJvZ3JhbSk7XG4gICAgfVxuXG4gICAgaWYgKGludmVyc2UpIHtcbiAgICAgIGludmVyc2UgPSB0aGlzLmNvbXBpbGVQcm9ncmFtKGludmVyc2UpO1xuICAgIH1cblxuICAgIHZhciB0eXBlID0gdGhpcy5jbGFzc2lmeU11c3RhY2hlKG11c3RhY2hlKTtcblxuICAgIGlmICh0eXBlID09PSBcImhlbHBlclwiKSB7XG4gICAgICB0aGlzLmhlbHBlck11c3RhY2hlKG11c3RhY2hlLCBwcm9ncmFtLCBpbnZlcnNlKTtcbiAgICB9IGVsc2UgaWYgKHR5cGUgPT09IFwic2ltcGxlXCIpIHtcbiAgICAgIHRoaXMuc2ltcGxlTXVzdGFjaGUobXVzdGFjaGUpO1xuXG4gICAgICAvLyBub3cgdGhhdCB0aGUgc2ltcGxlIG11c3RhY2hlIGlzIHJlc29sdmVkLCB3ZSBuZWVkIHRvXG4gICAgICAvLyBldmFsdWF0ZSBpdCBieSBleGVjdXRpbmcgYGJsb2NrSGVscGVyTWlzc2luZ2BcbiAgICAgIHRoaXMub3Bjb2RlKCdwdXNoUHJvZ3JhbScsIHByb2dyYW0pO1xuICAgICAgdGhpcy5vcGNvZGUoJ3B1c2hQcm9ncmFtJywgaW52ZXJzZSk7XG4gICAgICB0aGlzLm9wY29kZSgnZW1wdHlIYXNoJyk7XG4gICAgICB0aGlzLm9wY29kZSgnYmxvY2tWYWx1ZScpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmFtYmlndW91c011c3RhY2hlKG11c3RhY2hlLCBwcm9ncmFtLCBpbnZlcnNlKTtcblxuICAgICAgLy8gbm93IHRoYXQgdGhlIHNpbXBsZSBtdXN0YWNoZSBpcyByZXNvbHZlZCwgd2UgbmVlZCB0b1xuICAgICAgLy8gZXZhbHVhdGUgaXQgYnkgZXhlY3V0aW5nIGBibG9ja0hlbHBlck1pc3NpbmdgXG4gICAgICB0aGlzLm9wY29kZSgncHVzaFByb2dyYW0nLCBwcm9ncmFtKTtcbiAgICAgIHRoaXMub3Bjb2RlKCdwdXNoUHJvZ3JhbScsIGludmVyc2UpO1xuICAgICAgdGhpcy5vcGNvZGUoJ2VtcHR5SGFzaCcpO1xuICAgICAgdGhpcy5vcGNvZGUoJ2FtYmlndW91c0Jsb2NrVmFsdWUnKTtcbiAgICB9XG5cbiAgICB0aGlzLm9wY29kZSgnYXBwZW5kJyk7XG4gIH0sXG5cbiAgaGFzaDogZnVuY3Rpb24oaGFzaCkge1xuICAgIHZhciBwYWlycyA9IGhhc2gucGFpcnMsIHBhaXIsIHZhbDtcblxuICAgIHRoaXMub3Bjb2RlKCdwdXNoSGFzaCcpO1xuXG4gICAgZm9yKHZhciBpPTAsIGw9cGFpcnMubGVuZ3RoOyBpPGw7IGkrKykge1xuICAgICAgcGFpciA9IHBhaXJzW2ldO1xuICAgICAgdmFsICA9IHBhaXJbMV07XG5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaW5nUGFyYW1zKSB7XG4gICAgICAgIGlmKHZhbC5kZXB0aCkge1xuICAgICAgICAgIHRoaXMuYWRkRGVwdGgodmFsLmRlcHRoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLm9wY29kZSgnZ2V0Q29udGV4dCcsIHZhbC5kZXB0aCB8fCAwKTtcbiAgICAgICAgdGhpcy5vcGNvZGUoJ3B1c2hTdHJpbmdQYXJhbScsIHZhbC5zdHJpbmdNb2RlVmFsdWUsIHZhbC50eXBlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuYWNjZXB0KHZhbCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMub3Bjb2RlKCdhc3NpZ25Ub0hhc2gnLCBwYWlyWzBdKTtcbiAgICB9XG4gICAgdGhpcy5vcGNvZGUoJ3BvcEhhc2gnKTtcbiAgfSxcblxuICBwYXJ0aWFsOiBmdW5jdGlvbihwYXJ0aWFsKSB7XG4gICAgdmFyIHBhcnRpYWxOYW1lID0gcGFydGlhbC5wYXJ0aWFsTmFtZTtcbiAgICB0aGlzLnVzZVBhcnRpYWwgPSB0cnVlO1xuXG4gICAgaWYocGFydGlhbC5jb250ZXh0KSB7XG4gICAgICB0aGlzLklEKHBhcnRpYWwuY29udGV4dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMub3Bjb2RlKCdwdXNoJywgJ2RlcHRoMCcpO1xuICAgIH1cblxuICAgIHRoaXMub3Bjb2RlKCdpbnZva2VQYXJ0aWFsJywgcGFydGlhbE5hbWUubmFtZSk7XG4gICAgdGhpcy5vcGNvZGUoJ2FwcGVuZCcpO1xuICB9LFxuXG4gIGNvbnRlbnQ6IGZ1bmN0aW9uKGNvbnRlbnQpIHtcbiAgICB0aGlzLm9wY29kZSgnYXBwZW5kQ29udGVudCcsIGNvbnRlbnQuc3RyaW5nKTtcbiAgfSxcblxuICBtdXN0YWNoZTogZnVuY3Rpb24obXVzdGFjaGUpIHtcbiAgICB2YXIgb3B0aW9ucyA9IHRoaXMub3B0aW9ucztcbiAgICB2YXIgdHlwZSA9IHRoaXMuY2xhc3NpZnlNdXN0YWNoZShtdXN0YWNoZSk7XG5cbiAgICBpZiAodHlwZSA9PT0gXCJzaW1wbGVcIikge1xuICAgICAgdGhpcy5zaW1wbGVNdXN0YWNoZShtdXN0YWNoZSk7XG4gICAgfSBlbHNlIGlmICh0eXBlID09PSBcImhlbHBlclwiKSB7XG4gICAgICB0aGlzLmhlbHBlck11c3RhY2hlKG11c3RhY2hlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5hbWJpZ3VvdXNNdXN0YWNoZShtdXN0YWNoZSk7XG4gICAgfVxuXG4gICAgaWYobXVzdGFjaGUuZXNjYXBlZCAmJiAhb3B0aW9ucy5ub0VzY2FwZSkge1xuICAgICAgdGhpcy5vcGNvZGUoJ2FwcGVuZEVzY2FwZWQnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5vcGNvZGUoJ2FwcGVuZCcpO1xuICAgIH1cbiAgfSxcblxuICBhbWJpZ3VvdXNNdXN0YWNoZTogZnVuY3Rpb24obXVzdGFjaGUsIHByb2dyYW0sIGludmVyc2UpIHtcbiAgICB2YXIgaWQgPSBtdXN0YWNoZS5pZCxcbiAgICAgICAgbmFtZSA9IGlkLnBhcnRzWzBdLFxuICAgICAgICBpc0Jsb2NrID0gcHJvZ3JhbSAhPSBudWxsIHx8IGludmVyc2UgIT0gbnVsbDtcblxuICAgIHRoaXMub3Bjb2RlKCdnZXRDb250ZXh0JywgaWQuZGVwdGgpO1xuXG4gICAgdGhpcy5vcGNvZGUoJ3B1c2hQcm9ncmFtJywgcHJvZ3JhbSk7XG4gICAgdGhpcy5vcGNvZGUoJ3B1c2hQcm9ncmFtJywgaW52ZXJzZSk7XG5cbiAgICB0aGlzLm9wY29kZSgnaW52b2tlQW1iaWd1b3VzJywgbmFtZSwgaXNCbG9jayk7XG4gIH0sXG5cbiAgc2ltcGxlTXVzdGFjaGU6IGZ1bmN0aW9uKG11c3RhY2hlKSB7XG4gICAgdmFyIGlkID0gbXVzdGFjaGUuaWQ7XG5cbiAgICBpZiAoaWQudHlwZSA9PT0gJ0RBVEEnKSB7XG4gICAgICB0aGlzLkRBVEEoaWQpO1xuICAgIH0gZWxzZSBpZiAoaWQucGFydHMubGVuZ3RoKSB7XG4gICAgICB0aGlzLklEKGlkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gU2ltcGxpZmllZCBJRCBmb3IgYHRoaXNgXG4gICAgICB0aGlzLmFkZERlcHRoKGlkLmRlcHRoKTtcbiAgICAgIHRoaXMub3Bjb2RlKCdnZXRDb250ZXh0JywgaWQuZGVwdGgpO1xuICAgICAgdGhpcy5vcGNvZGUoJ3B1c2hDb250ZXh0Jyk7XG4gICAgfVxuXG4gICAgdGhpcy5vcGNvZGUoJ3Jlc29sdmVQb3NzaWJsZUxhbWJkYScpO1xuICB9LFxuXG4gIGhlbHBlck11c3RhY2hlOiBmdW5jdGlvbihtdXN0YWNoZSwgcHJvZ3JhbSwgaW52ZXJzZSkge1xuICAgIHZhciBwYXJhbXMgPSB0aGlzLnNldHVwRnVsbE11c3RhY2hlUGFyYW1zKG11c3RhY2hlLCBwcm9ncmFtLCBpbnZlcnNlKSxcbiAgICAgICAgbmFtZSA9IG11c3RhY2hlLmlkLnBhcnRzWzBdO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5rbm93bkhlbHBlcnNbbmFtZV0pIHtcbiAgICAgIHRoaXMub3Bjb2RlKCdpbnZva2VLbm93bkhlbHBlcicsIHBhcmFtcy5sZW5ndGgsIG5hbWUpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5vcHRpb25zLmtub3duSGVscGVyc09ubHkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIllvdSBzcGVjaWZpZWQga25vd25IZWxwZXJzT25seSwgYnV0IHVzZWQgdGhlIHVua25vd24gaGVscGVyIFwiICsgbmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMub3Bjb2RlKCdpbnZva2VIZWxwZXInLCBwYXJhbXMubGVuZ3RoLCBuYW1lKTtcbiAgICB9XG4gIH0sXG5cbiAgSUQ6IGZ1bmN0aW9uKGlkKSB7XG4gICAgdGhpcy5hZGREZXB0aChpZC5kZXB0aCk7XG4gICAgdGhpcy5vcGNvZGUoJ2dldENvbnRleHQnLCBpZC5kZXB0aCk7XG5cbiAgICB2YXIgbmFtZSA9IGlkLnBhcnRzWzBdO1xuICAgIGlmICghbmFtZSkge1xuICAgICAgdGhpcy5vcGNvZGUoJ3B1c2hDb250ZXh0Jyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMub3Bjb2RlKCdsb29rdXBPbkNvbnRleHQnLCBpZC5wYXJ0c1swXSk7XG4gICAgfVxuXG4gICAgZm9yKHZhciBpPTEsIGw9aWQucGFydHMubGVuZ3RoOyBpPGw7IGkrKykge1xuICAgICAgdGhpcy5vcGNvZGUoJ2xvb2t1cCcsIGlkLnBhcnRzW2ldKTtcbiAgICB9XG4gIH0sXG5cbiAgREFUQTogZnVuY3Rpb24oZGF0YSkge1xuICAgIHRoaXMub3B0aW9ucy5kYXRhID0gdHJ1ZTtcbiAgICBpZiAoZGF0YS5pZC5pc1Njb3BlZCB8fCBkYXRhLmlkLmRlcHRoKSB7XG4gICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKCdTY29wZWQgZGF0YSByZWZlcmVuY2VzIGFyZSBub3Qgc3VwcG9ydGVkOiAnICsgZGF0YS5vcmlnaW5hbCk7XG4gICAgfVxuXG4gICAgdGhpcy5vcGNvZGUoJ2xvb2t1cERhdGEnKTtcbiAgICB2YXIgcGFydHMgPSBkYXRhLmlkLnBhcnRzO1xuICAgIGZvcih2YXIgaT0wLCBsPXBhcnRzLmxlbmd0aDsgaTxsOyBpKyspIHtcbiAgICAgIHRoaXMub3Bjb2RlKCdsb29rdXAnLCBwYXJ0c1tpXSk7XG4gICAgfVxuICB9LFxuXG4gIFNUUklORzogZnVuY3Rpb24oc3RyaW5nKSB7XG4gICAgdGhpcy5vcGNvZGUoJ3B1c2hTdHJpbmcnLCBzdHJpbmcuc3RyaW5nKTtcbiAgfSxcblxuICBJTlRFR0VSOiBmdW5jdGlvbihpbnRlZ2VyKSB7XG4gICAgdGhpcy5vcGNvZGUoJ3B1c2hMaXRlcmFsJywgaW50ZWdlci5pbnRlZ2VyKTtcbiAgfSxcblxuICBCT09MRUFOOiBmdW5jdGlvbihib29sKSB7XG4gICAgdGhpcy5vcGNvZGUoJ3B1c2hMaXRlcmFsJywgYm9vbC5ib29sKTtcbiAgfSxcblxuICBjb21tZW50OiBmdW5jdGlvbigpIHt9LFxuXG4gIC8vIEhFTFBFUlNcbiAgb3Bjb2RlOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgdGhpcy5vcGNvZGVzLnB1c2goeyBvcGNvZGU6IG5hbWUsIGFyZ3M6IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSB9KTtcbiAgfSxcblxuICBkZWNsYXJlOiBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIHRoaXMub3Bjb2Rlcy5wdXNoKHsgb3Bjb2RlOiAnREVDTEFSRScsIG5hbWU6IG5hbWUsIHZhbHVlOiB2YWx1ZSB9KTtcbiAgfSxcblxuICBhZGREZXB0aDogZnVuY3Rpb24oZGVwdGgpIHtcbiAgICBpZihpc05hTihkZXB0aCkpIHsgdGhyb3cgbmV3IEVycm9yKFwiRVdPVFwiKTsgfVxuICAgIGlmKGRlcHRoID09PSAwKSB7IHJldHVybjsgfVxuXG4gICAgaWYoIXRoaXMuZGVwdGhzW2RlcHRoXSkge1xuICAgICAgdGhpcy5kZXB0aHNbZGVwdGhdID0gdHJ1ZTtcbiAgICAgIHRoaXMuZGVwdGhzLmxpc3QucHVzaChkZXB0aCk7XG4gICAgfVxuICB9LFxuXG4gIGNsYXNzaWZ5TXVzdGFjaGU6IGZ1bmN0aW9uKG11c3RhY2hlKSB7XG4gICAgdmFyIGlzSGVscGVyICAgPSBtdXN0YWNoZS5pc0hlbHBlcjtcbiAgICB2YXIgaXNFbGlnaWJsZSA9IG11c3RhY2hlLmVsaWdpYmxlSGVscGVyO1xuICAgIHZhciBvcHRpb25zICAgID0gdGhpcy5vcHRpb25zO1xuXG4gICAgLy8gaWYgYW1iaWd1b3VzLCB3ZSBjYW4gcG9zc2libHkgcmVzb2x2ZSB0aGUgYW1iaWd1aXR5IG5vd1xuICAgIGlmIChpc0VsaWdpYmxlICYmICFpc0hlbHBlcikge1xuICAgICAgdmFyIG5hbWUgPSBtdXN0YWNoZS5pZC5wYXJ0c1swXTtcblxuICAgICAgaWYgKG9wdGlvbnMua25vd25IZWxwZXJzW25hbWVdKSB7XG4gICAgICAgIGlzSGVscGVyID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAob3B0aW9ucy5rbm93bkhlbHBlcnNPbmx5KSB7XG4gICAgICAgIGlzRWxpZ2libGUgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoaXNIZWxwZXIpIHsgcmV0dXJuIFwiaGVscGVyXCI7IH1cbiAgICBlbHNlIGlmIChpc0VsaWdpYmxlKSB7IHJldHVybiBcImFtYmlndW91c1wiOyB9XG4gICAgZWxzZSB7IHJldHVybiBcInNpbXBsZVwiOyB9XG4gIH0sXG5cbiAgcHVzaFBhcmFtczogZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgdmFyIGkgPSBwYXJhbXMubGVuZ3RoLCBwYXJhbTtcblxuICAgIHdoaWxlKGktLSkge1xuICAgICAgcGFyYW0gPSBwYXJhbXNbaV07XG5cbiAgICAgIGlmKHRoaXMub3B0aW9ucy5zdHJpbmdQYXJhbXMpIHtcbiAgICAgICAgaWYocGFyYW0uZGVwdGgpIHtcbiAgICAgICAgICB0aGlzLmFkZERlcHRoKHBhcmFtLmRlcHRoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMub3Bjb2RlKCdnZXRDb250ZXh0JywgcGFyYW0uZGVwdGggfHwgMCk7XG4gICAgICAgIHRoaXMub3Bjb2RlKCdwdXNoU3RyaW5nUGFyYW0nLCBwYXJhbS5zdHJpbmdNb2RlVmFsdWUsIHBhcmFtLnR5cGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpc1twYXJhbS50eXBlXShwYXJhbSk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIHNldHVwTXVzdGFjaGVQYXJhbXM6IGZ1bmN0aW9uKG11c3RhY2hlKSB7XG4gICAgdmFyIHBhcmFtcyA9IG11c3RhY2hlLnBhcmFtcztcbiAgICB0aGlzLnB1c2hQYXJhbXMocGFyYW1zKTtcblxuICAgIGlmKG11c3RhY2hlLmhhc2gpIHtcbiAgICAgIHRoaXMuaGFzaChtdXN0YWNoZS5oYXNoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5vcGNvZGUoJ2VtcHR5SGFzaCcpO1xuICAgIH1cblxuICAgIHJldHVybiBwYXJhbXM7XG4gIH0sXG5cbiAgLy8gdGhpcyB3aWxsIHJlcGxhY2Ugc2V0dXBNdXN0YWNoZVBhcmFtcyB3aGVuIHdlJ3JlIGRvbmVcbiAgc2V0dXBGdWxsTXVzdGFjaGVQYXJhbXM6IGZ1bmN0aW9uKG11c3RhY2hlLCBwcm9ncmFtLCBpbnZlcnNlKSB7XG4gICAgdmFyIHBhcmFtcyA9IG11c3RhY2hlLnBhcmFtcztcbiAgICB0aGlzLnB1c2hQYXJhbXMocGFyYW1zKTtcblxuICAgIHRoaXMub3Bjb2RlKCdwdXNoUHJvZ3JhbScsIHByb2dyYW0pO1xuICAgIHRoaXMub3Bjb2RlKCdwdXNoUHJvZ3JhbScsIGludmVyc2UpO1xuXG4gICAgaWYobXVzdGFjaGUuaGFzaCkge1xuICAgICAgdGhpcy5oYXNoKG11c3RhY2hlLmhhc2gpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLm9wY29kZSgnZW1wdHlIYXNoJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHBhcmFtcztcbiAgfVxufTtcblxuZnVuY3Rpb24gcHJlY29tcGlsZShpbnB1dCwgb3B0aW9ucykge1xuICBpZiAoaW5wdXQgPT0gbnVsbCB8fCAodHlwZW9mIGlucHV0ICE9PSAnc3RyaW5nJyAmJiBpbnB1dC5jb25zdHJ1Y3RvciAhPT0gQVNULlByb2dyYW1Ob2RlKSkge1xuICAgIHRocm93IG5ldyBFeGNlcHRpb24oXCJZb3UgbXVzdCBwYXNzIGEgc3RyaW5nIG9yIEhhbmRsZWJhcnMgQVNUIHRvIEhhbmRsZWJhcnMucHJlY29tcGlsZS4gWW91IHBhc3NlZCBcIiArIGlucHV0KTtcbiAgfVxuXG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBpZiAoISgnZGF0YScgaW4gb3B0aW9ucykpIHtcbiAgICBvcHRpb25zLmRhdGEgPSB0cnVlO1xuICB9XG5cbiAgdmFyIGFzdCA9IHBhcnNlKGlucHV0KTtcbiAgdmFyIGVudmlyb25tZW50ID0gbmV3IENvbXBpbGVyKCkuY29tcGlsZShhc3QsIG9wdGlvbnMpO1xuICByZXR1cm4gbmV3IEphdmFTY3JpcHRDb21waWxlcigpLmNvbXBpbGUoZW52aXJvbm1lbnQsIG9wdGlvbnMpO1xufVxuXG5leHBvcnRzLnByZWNvbXBpbGUgPSBwcmVjb21waWxlO2Z1bmN0aW9uIGNvbXBpbGUoaW5wdXQsIG9wdGlvbnMsIGVudikge1xuICBpZiAoaW5wdXQgPT0gbnVsbCB8fCAodHlwZW9mIGlucHV0ICE9PSAnc3RyaW5nJyAmJiBpbnB1dC5jb25zdHJ1Y3RvciAhPT0gQVNULlByb2dyYW1Ob2RlKSkge1xuICAgIHRocm93IG5ldyBFeGNlcHRpb24oXCJZb3UgbXVzdCBwYXNzIGEgc3RyaW5nIG9yIEhhbmRsZWJhcnMgQVNUIHRvIEhhbmRsZWJhcnMuY29tcGlsZS4gWW91IHBhc3NlZCBcIiArIGlucHV0KTtcbiAgfVxuXG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIGlmICghKCdkYXRhJyBpbiBvcHRpb25zKSkge1xuICAgIG9wdGlvbnMuZGF0YSA9IHRydWU7XG4gIH1cblxuICB2YXIgY29tcGlsZWQ7XG5cbiAgZnVuY3Rpb24gY29tcGlsZUlucHV0KCkge1xuICAgIHZhciBhc3QgPSBwYXJzZShpbnB1dCk7XG4gICAgdmFyIGVudmlyb25tZW50ID0gbmV3IENvbXBpbGVyKCkuY29tcGlsZShhc3QsIG9wdGlvbnMpO1xuICAgIHZhciB0ZW1wbGF0ZVNwZWMgPSBuZXcgSmF2YVNjcmlwdENvbXBpbGVyKCkuY29tcGlsZShlbnZpcm9ubWVudCwgb3B0aW9ucywgdW5kZWZpbmVkLCB0cnVlKTtcbiAgICByZXR1cm4gZW52LnRlbXBsYXRlKHRlbXBsYXRlU3BlYyk7XG4gIH1cblxuICAvLyBUZW1wbGF0ZSBpcyBvbmx5IGNvbXBpbGVkIG9uIGZpcnN0IHVzZSBhbmQgY2FjaGVkIGFmdGVyIHRoYXQgcG9pbnQuXG4gIHJldHVybiBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgaWYgKCFjb21waWxlZCkge1xuICAgICAgY29tcGlsZWQgPSBjb21waWxlSW5wdXQoKTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbXBpbGVkLmNhbGwodGhpcywgY29udGV4dCwgb3B0aW9ucyk7XG4gIH07XG59XG5cbmV4cG9ydHMuY29tcGlsZSA9IGNvbXBpbGU7IiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgQ09NUElMRVJfUkVWSVNJT04gPSByZXF1aXJlKFwiLi4vYmFzZVwiKS5DT01QSUxFUl9SRVZJU0lPTjtcbnZhciBSRVZJU0lPTl9DSEFOR0VTID0gcmVxdWlyZShcIi4uL2Jhc2VcIikuUkVWSVNJT05fQ0hBTkdFUztcbnZhciBsb2cgPSByZXF1aXJlKFwiLi4vYmFzZVwiKS5sb2c7XG5cbmZ1bmN0aW9uIExpdGVyYWwodmFsdWUpIHtcbiAgdGhpcy52YWx1ZSA9IHZhbHVlO1xufVxuXG5mdW5jdGlvbiBKYXZhU2NyaXB0Q29tcGlsZXIoKSB7fVxuXG5KYXZhU2NyaXB0Q29tcGlsZXIucHJvdG90eXBlID0ge1xuICAvLyBQVUJMSUMgQVBJOiBZb3UgY2FuIG92ZXJyaWRlIHRoZXNlIG1ldGhvZHMgaW4gYSBzdWJjbGFzcyB0byBwcm92aWRlXG4gIC8vIGFsdGVybmF0aXZlIGNvbXBpbGVkIGZvcm1zIGZvciBuYW1lIGxvb2t1cCBhbmQgYnVmZmVyaW5nIHNlbWFudGljc1xuICBuYW1lTG9va3VwOiBmdW5jdGlvbihwYXJlbnQsIG5hbWUgLyogLCB0eXBlKi8pIHtcbiAgICB2YXIgd3JhcCxcbiAgICAgICAgcmV0O1xuICAgIGlmIChwYXJlbnQuaW5kZXhPZignZGVwdGgnKSA9PT0gMCkge1xuICAgICAgd3JhcCA9IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKC9eWzAtOV0rJC8udGVzdChuYW1lKSkge1xuICAgICAgcmV0ID0gcGFyZW50ICsgXCJbXCIgKyBuYW1lICsgXCJdXCI7XG4gICAgfSBlbHNlIGlmIChKYXZhU2NyaXB0Q29tcGlsZXIuaXNWYWxpZEphdmFTY3JpcHRWYXJpYWJsZU5hbWUobmFtZSkpIHtcbiAgICAgIHJldCA9IHBhcmVudCArIFwiLlwiICsgbmFtZTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICByZXQgPSBwYXJlbnQgKyBcIlsnXCIgKyBuYW1lICsgXCInXVwiO1xuICAgIH1cblxuICAgIGlmICh3cmFwKSB7XG4gICAgICByZXR1cm4gJygnICsgcGFyZW50ICsgJyAmJiAnICsgcmV0ICsgJyknO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gcmV0O1xuICAgIH1cbiAgfSxcblxuICBjb21waWxlckluZm86IGZ1bmN0aW9uKCkge1xuICAgIHZhciByZXZpc2lvbiA9IENPTVBJTEVSX1JFVklTSU9OLFxuICAgICAgICB2ZXJzaW9ucyA9IFJFVklTSU9OX0NIQU5HRVNbcmV2aXNpb25dO1xuICAgIHJldHVybiBcInRoaXMuY29tcGlsZXJJbmZvID0gW1wiK3JldmlzaW9uK1wiLCdcIit2ZXJzaW9ucytcIiddO1xcblwiO1xuICB9LFxuXG4gIGFwcGVuZFRvQnVmZmVyOiBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICBpZiAodGhpcy5lbnZpcm9ubWVudC5pc1NpbXBsZSkge1xuICAgICAgcmV0dXJuIFwicmV0dXJuIFwiICsgc3RyaW5nICsgXCI7XCI7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGFwcGVuZFRvQnVmZmVyOiB0cnVlLFxuICAgICAgICBjb250ZW50OiBzdHJpbmcsXG4gICAgICAgIHRvU3RyaW5nOiBmdW5jdGlvbigpIHsgcmV0dXJuIFwiYnVmZmVyICs9IFwiICsgc3RyaW5nICsgXCI7XCI7IH1cbiAgICAgIH07XG4gICAgfVxuICB9LFxuXG4gIGluaXRpYWxpemVCdWZmZXI6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnF1b3RlZFN0cmluZyhcIlwiKTtcbiAgfSxcblxuICBuYW1lc3BhY2U6IFwiSGFuZGxlYmFyc1wiLFxuICAvLyBFTkQgUFVCTElDIEFQSVxuXG4gIGNvbXBpbGU6IGZ1bmN0aW9uKGVudmlyb25tZW50LCBvcHRpb25zLCBjb250ZXh0LCBhc09iamVjdCkge1xuICAgIHRoaXMuZW52aXJvbm1lbnQgPSBlbnZpcm9ubWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgbG9nKCdkZWJ1ZycsIHRoaXMuZW52aXJvbm1lbnQuZGlzYXNzZW1ibGUoKSArIFwiXFxuXFxuXCIpO1xuXG4gICAgdGhpcy5uYW1lID0gdGhpcy5lbnZpcm9ubWVudC5uYW1lO1xuICAgIHRoaXMuaXNDaGlsZCA9ICEhY29udGV4dDtcbiAgICB0aGlzLmNvbnRleHQgPSBjb250ZXh0IHx8IHtcbiAgICAgIHByb2dyYW1zOiBbXSxcbiAgICAgIGVudmlyb25tZW50czogW10sXG4gICAgICBhbGlhc2VzOiB7IH1cbiAgICB9O1xuXG4gICAgdGhpcy5wcmVhbWJsZSgpO1xuXG4gICAgdGhpcy5zdGFja1Nsb3QgPSAwO1xuICAgIHRoaXMuc3RhY2tWYXJzID0gW107XG4gICAgdGhpcy5yZWdpc3RlcnMgPSB7IGxpc3Q6IFtdIH07XG4gICAgdGhpcy5jb21waWxlU3RhY2sgPSBbXTtcbiAgICB0aGlzLmlubGluZVN0YWNrID0gW107XG5cbiAgICB0aGlzLmNvbXBpbGVDaGlsZHJlbihlbnZpcm9ubWVudCwgb3B0aW9ucyk7XG5cbiAgICB2YXIgb3Bjb2RlcyA9IGVudmlyb25tZW50Lm9wY29kZXMsIG9wY29kZTtcblxuICAgIHRoaXMuaSA9IDA7XG5cbiAgICBmb3IodmFyIGw9b3Bjb2Rlcy5sZW5ndGg7IHRoaXMuaTxsOyB0aGlzLmkrKykge1xuICAgICAgb3Bjb2RlID0gb3Bjb2Rlc1t0aGlzLmldO1xuXG4gICAgICBpZihvcGNvZGUub3Bjb2RlID09PSAnREVDTEFSRScpIHtcbiAgICAgICAgdGhpc1tvcGNvZGUubmFtZV0gPSBvcGNvZGUudmFsdWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzW29wY29kZS5vcGNvZGVdLmFwcGx5KHRoaXMsIG9wY29kZS5hcmdzKTtcbiAgICAgIH1cblxuICAgICAgLy8gUmVzZXQgdGhlIHN0cmlwTmV4dCBmbGFnIGlmIGl0IHdhcyBub3Qgc2V0IGJ5IHRoaXMgb3BlcmF0aW9uLlxuICAgICAgaWYgKG9wY29kZS5vcGNvZGUgIT09IHRoaXMuc3RyaXBOZXh0KSB7XG4gICAgICAgIHRoaXMuc3RyaXBOZXh0ID0gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gRmx1c2ggYW55IHRyYWlsaW5nIGNvbnRlbnQgdGhhdCBtaWdodCBiZSBwZW5kaW5nLlxuICAgIHRoaXMucHVzaFNvdXJjZSgnJyk7XG5cbiAgICByZXR1cm4gdGhpcy5jcmVhdGVGdW5jdGlvbkNvbnRleHQoYXNPYmplY3QpO1xuICB9LFxuXG4gIHByZWFtYmxlOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgb3V0ID0gW107XG5cbiAgICBpZiAoIXRoaXMuaXNDaGlsZCkge1xuICAgICAgdmFyIG5hbWVzcGFjZSA9IHRoaXMubmFtZXNwYWNlO1xuXG4gICAgICB2YXIgY29waWVzID0gXCJoZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBcIiArIG5hbWVzcGFjZSArIFwiLmhlbHBlcnMpO1wiO1xuICAgICAgaWYgKHRoaXMuZW52aXJvbm1lbnQudXNlUGFydGlhbCkgeyBjb3BpZXMgPSBjb3BpZXMgKyBcIiBwYXJ0aWFscyA9IHRoaXMubWVyZ2UocGFydGlhbHMsIFwiICsgbmFtZXNwYWNlICsgXCIucGFydGlhbHMpO1wiOyB9XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmRhdGEpIHsgY29waWVzID0gY29waWVzICsgXCIgZGF0YSA9IGRhdGEgfHwge307XCI7IH1cbiAgICAgIG91dC5wdXNoKGNvcGllcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dC5wdXNoKCcnKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuZW52aXJvbm1lbnQuaXNTaW1wbGUpIHtcbiAgICAgIG91dC5wdXNoKFwiLCBidWZmZXIgPSBcIiArIHRoaXMuaW5pdGlhbGl6ZUJ1ZmZlcigpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0LnB1c2goXCJcIik7XG4gICAgfVxuXG4gICAgLy8gdHJhY2sgdGhlIGxhc3QgY29udGV4dCBwdXNoZWQgaW50byBwbGFjZSB0byBhbGxvdyBza2lwcGluZyB0aGVcbiAgICAvLyBnZXRDb250ZXh0IG9wY29kZSB3aGVuIGl0IHdvdWxkIGJlIGEgbm9vcFxuICAgIHRoaXMubGFzdENvbnRleHQgPSAwO1xuICAgIHRoaXMuc291cmNlID0gb3V0O1xuICB9LFxuXG4gIGNyZWF0ZUZ1bmN0aW9uQ29udGV4dDogZnVuY3Rpb24oYXNPYmplY3QpIHtcbiAgICB2YXIgbG9jYWxzID0gdGhpcy5zdGFja1ZhcnMuY29uY2F0KHRoaXMucmVnaXN0ZXJzLmxpc3QpO1xuXG4gICAgaWYobG9jYWxzLmxlbmd0aCA+IDApIHtcbiAgICAgIHRoaXMuc291cmNlWzFdID0gdGhpcy5zb3VyY2VbMV0gKyBcIiwgXCIgKyBsb2NhbHMuam9pbihcIiwgXCIpO1xuICAgIH1cblxuICAgIC8vIEdlbmVyYXRlIG1pbmltaXplciBhbGlhcyBtYXBwaW5nc1xuICAgIGlmICghdGhpcy5pc0NoaWxkKSB7XG4gICAgICBmb3IgKHZhciBhbGlhcyBpbiB0aGlzLmNvbnRleHQuYWxpYXNlcykge1xuICAgICAgICBpZiAodGhpcy5jb250ZXh0LmFsaWFzZXMuaGFzT3duUHJvcGVydHkoYWxpYXMpKSB7XG4gICAgICAgICAgdGhpcy5zb3VyY2VbMV0gPSB0aGlzLnNvdXJjZVsxXSArICcsICcgKyBhbGlhcyArICc9JyArIHRoaXMuY29udGV4dC5hbGlhc2VzW2FsaWFzXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0aGlzLnNvdXJjZVsxXSkge1xuICAgICAgdGhpcy5zb3VyY2VbMV0gPSBcInZhciBcIiArIHRoaXMuc291cmNlWzFdLnN1YnN0cmluZygyKSArIFwiO1wiO1xuICAgIH1cblxuICAgIC8vIE1lcmdlIGNoaWxkcmVuXG4gICAgaWYgKCF0aGlzLmlzQ2hpbGQpIHtcbiAgICAgIHRoaXMuc291cmNlWzFdICs9ICdcXG4nICsgdGhpcy5jb250ZXh0LnByb2dyYW1zLmpvaW4oJ1xcbicpICsgJ1xcbic7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLmVudmlyb25tZW50LmlzU2ltcGxlKSB7XG4gICAgICB0aGlzLnB1c2hTb3VyY2UoXCJyZXR1cm4gYnVmZmVyO1wiKTtcbiAgICB9XG5cbiAgICB2YXIgcGFyYW1zID0gdGhpcy5pc0NoaWxkID8gW1wiZGVwdGgwXCIsIFwiZGF0YVwiXSA6IFtcIkhhbmRsZWJhcnNcIiwgXCJkZXB0aDBcIiwgXCJoZWxwZXJzXCIsIFwicGFydGlhbHNcIiwgXCJkYXRhXCJdO1xuXG4gICAgZm9yKHZhciBpPTAsIGw9dGhpcy5lbnZpcm9ubWVudC5kZXB0aHMubGlzdC5sZW5ndGg7IGk8bDsgaSsrKSB7XG4gICAgICBwYXJhbXMucHVzaChcImRlcHRoXCIgKyB0aGlzLmVudmlyb25tZW50LmRlcHRocy5saXN0W2ldKTtcbiAgICB9XG5cbiAgICAvLyBQZXJmb3JtIGEgc2Vjb25kIHBhc3Mgb3ZlciB0aGUgb3V0cHV0IHRvIG1lcmdlIGNvbnRlbnQgd2hlbiBwb3NzaWJsZVxuICAgIHZhciBzb3VyY2UgPSB0aGlzLm1lcmdlU291cmNlKCk7XG5cbiAgICBpZiAoIXRoaXMuaXNDaGlsZCkge1xuICAgICAgc291cmNlID0gdGhpcy5jb21waWxlckluZm8oKStzb3VyY2U7XG4gICAgfVxuXG4gICAgaWYgKGFzT2JqZWN0KSB7XG4gICAgICBwYXJhbXMucHVzaChzb3VyY2UpO1xuXG4gICAgICByZXR1cm4gRnVuY3Rpb24uYXBwbHkodGhpcywgcGFyYW1zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGZ1bmN0aW9uU291cmNlID0gJ2Z1bmN0aW9uICcgKyAodGhpcy5uYW1lIHx8ICcnKSArICcoJyArIHBhcmFtcy5qb2luKCcsJykgKyAnKSB7XFxuICAnICsgc291cmNlICsgJ30nO1xuICAgICAgbG9nKCdkZWJ1ZycsIGZ1bmN0aW9uU291cmNlICsgXCJcXG5cXG5cIik7XG4gICAgICByZXR1cm4gZnVuY3Rpb25Tb3VyY2U7XG4gICAgfVxuICB9LFxuICBtZXJnZVNvdXJjZTogZnVuY3Rpb24oKSB7XG4gICAgLy8gV0FSTjogV2UgYXJlIG5vdCBoYW5kbGluZyB0aGUgY2FzZSB3aGVyZSBidWZmZXIgaXMgc3RpbGwgcG9wdWxhdGVkIGFzIHRoZSBzb3VyY2Ugc2hvdWxkXG4gICAgLy8gbm90IGhhdmUgYnVmZmVyIGFwcGVuZCBvcGVyYXRpb25zIGFzIHRoZWlyIGZpbmFsIGFjdGlvbi5cbiAgICB2YXIgc291cmNlID0gJycsXG4gICAgICAgIGJ1ZmZlcjtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gdGhpcy5zb3VyY2UubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIHZhciBsaW5lID0gdGhpcy5zb3VyY2VbaV07XG4gICAgICBpZiAobGluZS5hcHBlbmRUb0J1ZmZlcikge1xuICAgICAgICBpZiAoYnVmZmVyKSB7XG4gICAgICAgICAgYnVmZmVyID0gYnVmZmVyICsgJ1xcbiAgICArICcgKyBsaW5lLmNvbnRlbnQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYnVmZmVyID0gbGluZS5jb250ZW50O1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoYnVmZmVyKSB7XG4gICAgICAgICAgc291cmNlICs9ICdidWZmZXIgKz0gJyArIGJ1ZmZlciArICc7XFxuICAnO1xuICAgICAgICAgIGJ1ZmZlciA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICBzb3VyY2UgKz0gbGluZSArICdcXG4gICc7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzb3VyY2U7XG4gIH0sXG5cbiAgLy8gW2Jsb2NrVmFsdWVdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IGhhc2gsIGludmVyc2UsIHByb2dyYW0sIHZhbHVlXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogcmV0dXJuIHZhbHVlIG9mIGJsb2NrSGVscGVyTWlzc2luZ1xuICAvL1xuICAvLyBUaGUgcHVycG9zZSBvZiB0aGlzIG9wY29kZSBpcyB0byB0YWtlIGEgYmxvY2sgb2YgdGhlIGZvcm1cbiAgLy8gYHt7I2Zvb319Li4ue3svZm9vfX1gLCByZXNvbHZlIHRoZSB2YWx1ZSBvZiBgZm9vYCwgYW5kXG4gIC8vIHJlcGxhY2UgaXQgb24gdGhlIHN0YWNrIHdpdGggdGhlIHJlc3VsdCBvZiBwcm9wZXJseVxuICAvLyBpbnZva2luZyBibG9ja0hlbHBlck1pc3NpbmcuXG4gIGJsb2NrVmFsdWU6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuY29udGV4dC5hbGlhc2VzLmJsb2NrSGVscGVyTWlzc2luZyA9ICdoZWxwZXJzLmJsb2NrSGVscGVyTWlzc2luZyc7XG5cbiAgICB2YXIgcGFyYW1zID0gW1wiZGVwdGgwXCJdO1xuICAgIHRoaXMuc2V0dXBQYXJhbXMoMCwgcGFyYW1zKTtcblxuICAgIHRoaXMucmVwbGFjZVN0YWNrKGZ1bmN0aW9uKGN1cnJlbnQpIHtcbiAgICAgIHBhcmFtcy5zcGxpY2UoMSwgMCwgY3VycmVudCk7XG4gICAgICByZXR1cm4gXCJibG9ja0hlbHBlck1pc3NpbmcuY2FsbChcIiArIHBhcmFtcy5qb2luKFwiLCBcIikgKyBcIilcIjtcbiAgICB9KTtcbiAgfSxcblxuICAvLyBbYW1iaWd1b3VzQmxvY2tWYWx1ZV1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogaGFzaCwgaW52ZXJzZSwgcHJvZ3JhbSwgdmFsdWVcbiAgLy8gQ29tcGlsZXIgdmFsdWUsIGJlZm9yZTogbGFzdEhlbHBlcj12YWx1ZSBvZiBsYXN0IGZvdW5kIGhlbHBlciwgaWYgYW55XG4gIC8vIE9uIHN0YWNrLCBhZnRlciwgaWYgbm8gbGFzdEhlbHBlcjogc2FtZSBhcyBbYmxvY2tWYWx1ZV1cbiAgLy8gT24gc3RhY2ssIGFmdGVyLCBpZiBsYXN0SGVscGVyOiB2YWx1ZVxuICBhbWJpZ3VvdXNCbG9ja1ZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmNvbnRleHQuYWxpYXNlcy5ibG9ja0hlbHBlck1pc3NpbmcgPSAnaGVscGVycy5ibG9ja0hlbHBlck1pc3NpbmcnO1xuXG4gICAgdmFyIHBhcmFtcyA9IFtcImRlcHRoMFwiXTtcbiAgICB0aGlzLnNldHVwUGFyYW1zKDAsIHBhcmFtcyk7XG5cbiAgICB2YXIgY3VycmVudCA9IHRoaXMudG9wU3RhY2soKTtcbiAgICBwYXJhbXMuc3BsaWNlKDEsIDAsIGN1cnJlbnQpO1xuXG4gICAgLy8gVXNlIHRoZSBvcHRpb25zIHZhbHVlIGdlbmVyYXRlZCBmcm9tIHRoZSBpbnZvY2F0aW9uXG4gICAgcGFyYW1zW3BhcmFtcy5sZW5ndGgtMV0gPSAnb3B0aW9ucyc7XG5cbiAgICB0aGlzLnB1c2hTb3VyY2UoXCJpZiAoIVwiICsgdGhpcy5sYXN0SGVscGVyICsgXCIpIHsgXCIgKyBjdXJyZW50ICsgXCIgPSBibG9ja0hlbHBlck1pc3NpbmcuY2FsbChcIiArIHBhcmFtcy5qb2luKFwiLCBcIikgKyBcIik7IH1cIik7XG4gIH0sXG5cbiAgLy8gW2FwcGVuZENvbnRlbnRdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IC4uLlxuICAvL1xuICAvLyBBcHBlbmRzIHRoZSBzdHJpbmcgdmFsdWUgb2YgYGNvbnRlbnRgIHRvIHRoZSBjdXJyZW50IGJ1ZmZlclxuICBhcHBlbmRDb250ZW50OiBmdW5jdGlvbihjb250ZW50KSB7XG4gICAgaWYgKHRoaXMucGVuZGluZ0NvbnRlbnQpIHtcbiAgICAgIGNvbnRlbnQgPSB0aGlzLnBlbmRpbmdDb250ZW50ICsgY29udGVudDtcbiAgICB9XG4gICAgaWYgKHRoaXMuc3RyaXBOZXh0KSB7XG4gICAgICBjb250ZW50ID0gY29udGVudC5yZXBsYWNlKC9eXFxzKy8sICcnKTtcbiAgICB9XG5cbiAgICB0aGlzLnBlbmRpbmdDb250ZW50ID0gY29udGVudDtcbiAgfSxcblxuICAvLyBbc3RyaXBdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IC4uLlxuICAvL1xuICAvLyBSZW1vdmVzIGFueSB0cmFpbGluZyB3aGl0ZXNwYWNlIGZyb20gdGhlIHByaW9yIGNvbnRlbnQgbm9kZSBhbmQgZmxhZ3NcbiAgLy8gdGhlIG5leHQgb3BlcmF0aW9uIGZvciBzdHJpcHBpbmcgaWYgaXQgaXMgYSBjb250ZW50IG5vZGUuXG4gIHN0cmlwOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5wZW5kaW5nQ29udGVudCkge1xuICAgICAgdGhpcy5wZW5kaW5nQ29udGVudCA9IHRoaXMucGVuZGluZ0NvbnRlbnQucmVwbGFjZSgvXFxzKyQvLCAnJyk7XG4gICAgfVxuICAgIHRoaXMuc3RyaXBOZXh0ID0gJ3N0cmlwJztcbiAgfSxcblxuICAvLyBbYXBwZW5kXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiB2YWx1ZSwgLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogLi4uXG4gIC8vXG4gIC8vIENvZXJjZXMgYHZhbHVlYCB0byBhIFN0cmluZyBhbmQgYXBwZW5kcyBpdCB0byB0aGUgY3VycmVudCBidWZmZXIuXG4gIC8vXG4gIC8vIElmIGB2YWx1ZWAgaXMgdHJ1dGh5LCBvciAwLCBpdCBpcyBjb2VyY2VkIGludG8gYSBzdHJpbmcgYW5kIGFwcGVuZGVkXG4gIC8vIE90aGVyd2lzZSwgdGhlIGVtcHR5IHN0cmluZyBpcyBhcHBlbmRlZFxuICBhcHBlbmQ6IGZ1bmN0aW9uKCkge1xuICAgIC8vIEZvcmNlIGFueXRoaW5nIHRoYXQgaXMgaW5saW5lZCBvbnRvIHRoZSBzdGFjayBzbyB3ZSBkb24ndCBoYXZlIGR1cGxpY2F0aW9uXG4gICAgLy8gd2hlbiB3ZSBleGFtaW5lIGxvY2FsXG4gICAgdGhpcy5mbHVzaElubGluZSgpO1xuICAgIHZhciBsb2NhbCA9IHRoaXMucG9wU3RhY2soKTtcbiAgICB0aGlzLnB1c2hTb3VyY2UoXCJpZihcIiArIGxvY2FsICsgXCIgfHwgXCIgKyBsb2NhbCArIFwiID09PSAwKSB7IFwiICsgdGhpcy5hcHBlbmRUb0J1ZmZlcihsb2NhbCkgKyBcIiB9XCIpO1xuICAgIGlmICh0aGlzLmVudmlyb25tZW50LmlzU2ltcGxlKSB7XG4gICAgICB0aGlzLnB1c2hTb3VyY2UoXCJlbHNlIHsgXCIgKyB0aGlzLmFwcGVuZFRvQnVmZmVyKFwiJydcIikgKyBcIiB9XCIpO1xuICAgIH1cbiAgfSxcblxuICAvLyBbYXBwZW5kRXNjYXBlZF1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogdmFsdWUsIC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IC4uLlxuICAvL1xuICAvLyBFc2NhcGUgYHZhbHVlYCBhbmQgYXBwZW5kIGl0IHRvIHRoZSBidWZmZXJcbiAgYXBwZW5kRXNjYXBlZDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5jb250ZXh0LmFsaWFzZXMuZXNjYXBlRXhwcmVzc2lvbiA9ICd0aGlzLmVzY2FwZUV4cHJlc3Npb24nO1xuXG4gICAgdGhpcy5wdXNoU291cmNlKHRoaXMuYXBwZW5kVG9CdWZmZXIoXCJlc2NhcGVFeHByZXNzaW9uKFwiICsgdGhpcy5wb3BTdGFjaygpICsgXCIpXCIpKTtcbiAgfSxcblxuICAvLyBbZ2V0Q29udGV4dF1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogLi4uXG4gIC8vIENvbXBpbGVyIHZhbHVlLCBhZnRlcjogbGFzdENvbnRleHQ9ZGVwdGhcbiAgLy9cbiAgLy8gU2V0IHRoZSB2YWx1ZSBvZiB0aGUgYGxhc3RDb250ZXh0YCBjb21waWxlciB2YWx1ZSB0byB0aGUgZGVwdGhcbiAgZ2V0Q29udGV4dDogZnVuY3Rpb24oZGVwdGgpIHtcbiAgICBpZih0aGlzLmxhc3RDb250ZXh0ICE9PSBkZXB0aCkge1xuICAgICAgdGhpcy5sYXN0Q29udGV4dCA9IGRlcHRoO1xuICAgIH1cbiAgfSxcblxuICAvLyBbbG9va3VwT25Db250ZXh0XVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiBjdXJyZW50Q29udGV4dFtuYW1lXSwgLi4uXG4gIC8vXG4gIC8vIExvb2tzIHVwIHRoZSB2YWx1ZSBvZiBgbmFtZWAgb24gdGhlIGN1cnJlbnQgY29udGV4dCBhbmQgcHVzaGVzXG4gIC8vIGl0IG9udG8gdGhlIHN0YWNrLlxuICBsb29rdXBPbkNvbnRleHQ6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB0aGlzLnB1c2godGhpcy5uYW1lTG9va3VwKCdkZXB0aCcgKyB0aGlzLmxhc3RDb250ZXh0LCBuYW1lLCAnY29udGV4dCcpKTtcbiAgfSxcblxuICAvLyBbcHVzaENvbnRleHRdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IGN1cnJlbnRDb250ZXh0LCAuLi5cbiAgLy9cbiAgLy8gUHVzaGVzIHRoZSB2YWx1ZSBvZiB0aGUgY3VycmVudCBjb250ZXh0IG9udG8gdGhlIHN0YWNrLlxuICBwdXNoQ29udGV4dDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5wdXNoU3RhY2tMaXRlcmFsKCdkZXB0aCcgKyB0aGlzLmxhc3RDb250ZXh0KTtcbiAgfSxcblxuICAvLyBbcmVzb2x2ZVBvc3NpYmxlTGFtYmRhXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiB2YWx1ZSwgLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogcmVzb2x2ZWQgdmFsdWUsIC4uLlxuICAvL1xuICAvLyBJZiB0aGUgYHZhbHVlYCBpcyBhIGxhbWJkYSwgcmVwbGFjZSBpdCBvbiB0aGUgc3RhY2sgYnlcbiAgLy8gdGhlIHJldHVybiB2YWx1ZSBvZiB0aGUgbGFtYmRhXG4gIHJlc29sdmVQb3NzaWJsZUxhbWJkYTogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5jb250ZXh0LmFsaWFzZXMuZnVuY3Rpb25UeXBlID0gJ1wiZnVuY3Rpb25cIic7XG5cbiAgICB0aGlzLnJlcGxhY2VTdGFjayhmdW5jdGlvbihjdXJyZW50KSB7XG4gICAgICByZXR1cm4gXCJ0eXBlb2YgXCIgKyBjdXJyZW50ICsgXCIgPT09IGZ1bmN0aW9uVHlwZSA/IFwiICsgY3VycmVudCArIFwiLmFwcGx5KGRlcHRoMCkgOiBcIiArIGN1cnJlbnQ7XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8gW2xvb2t1cF1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogdmFsdWUsIC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IHZhbHVlW25hbWVdLCAuLi5cbiAgLy9cbiAgLy8gUmVwbGFjZSB0aGUgdmFsdWUgb24gdGhlIHN0YWNrIHdpdGggdGhlIHJlc3VsdCBvZiBsb29raW5nXG4gIC8vIHVwIGBuYW1lYCBvbiBgdmFsdWVgXG4gIGxvb2t1cDogZnVuY3Rpb24obmFtZSkge1xuICAgIHRoaXMucmVwbGFjZVN0YWNrKGZ1bmN0aW9uKGN1cnJlbnQpIHtcbiAgICAgIHJldHVybiBjdXJyZW50ICsgXCIgPT0gbnVsbCB8fCBcIiArIGN1cnJlbnQgKyBcIiA9PT0gZmFsc2UgPyBcIiArIGN1cnJlbnQgKyBcIiA6IFwiICsgdGhpcy5uYW1lTG9va3VwKGN1cnJlbnQsIG5hbWUsICdjb250ZXh0Jyk7XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8gW2xvb2t1cERhdGFdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IGRhdGEsIC4uLlxuICAvL1xuICAvLyBQdXNoIHRoZSBkYXRhIGxvb2t1cCBvcGVyYXRvclxuICBsb29rdXBEYXRhOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnB1c2goJ2RhdGEnKTtcbiAgfSxcblxuICAvLyBbcHVzaFN0cmluZ1BhcmFtXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiBzdHJpbmcsIGN1cnJlbnRDb250ZXh0LCAuLi5cbiAgLy9cbiAgLy8gVGhpcyBvcGNvZGUgaXMgZGVzaWduZWQgZm9yIHVzZSBpbiBzdHJpbmcgbW9kZSwgd2hpY2hcbiAgLy8gcHJvdmlkZXMgdGhlIHN0cmluZyB2YWx1ZSBvZiBhIHBhcmFtZXRlciBhbG9uZyB3aXRoIGl0c1xuICAvLyBkZXB0aCByYXRoZXIgdGhhbiByZXNvbHZpbmcgaXQgaW1tZWRpYXRlbHkuXG4gIHB1c2hTdHJpbmdQYXJhbTogZnVuY3Rpb24oc3RyaW5nLCB0eXBlKSB7XG4gICAgdGhpcy5wdXNoU3RhY2tMaXRlcmFsKCdkZXB0aCcgKyB0aGlzLmxhc3RDb250ZXh0KTtcblxuICAgIHRoaXMucHVzaFN0cmluZyh0eXBlKTtcblxuICAgIGlmICh0eXBlb2Ygc3RyaW5nID09PSAnc3RyaW5nJykge1xuICAgICAgdGhpcy5wdXNoU3RyaW5nKHN0cmluZyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucHVzaFN0YWNrTGl0ZXJhbChzdHJpbmcpO1xuICAgIH1cbiAgfSxcblxuICBlbXB0eUhhc2g6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucHVzaFN0YWNrTGl0ZXJhbCgne30nKTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaW5nUGFyYW1zKSB7XG4gICAgICB0aGlzLnJlZ2lzdGVyKCdoYXNoVHlwZXMnLCAne30nKTtcbiAgICAgIHRoaXMucmVnaXN0ZXIoJ2hhc2hDb250ZXh0cycsICd7fScpO1xuICAgIH1cbiAgfSxcbiAgcHVzaEhhc2g6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuaGFzaCA9IHt2YWx1ZXM6IFtdLCB0eXBlczogW10sIGNvbnRleHRzOiBbXX07XG4gIH0sXG4gIHBvcEhhc2g6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBoYXNoID0gdGhpcy5oYXNoO1xuICAgIHRoaXMuaGFzaCA9IHVuZGVmaW5lZDtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaW5nUGFyYW1zKSB7XG4gICAgICB0aGlzLnJlZ2lzdGVyKCdoYXNoQ29udGV4dHMnLCAneycgKyBoYXNoLmNvbnRleHRzLmpvaW4oJywnKSArICd9Jyk7XG4gICAgICB0aGlzLnJlZ2lzdGVyKCdoYXNoVHlwZXMnLCAneycgKyBoYXNoLnR5cGVzLmpvaW4oJywnKSArICd9Jyk7XG4gICAgfVxuICAgIHRoaXMucHVzaCgne1xcbiAgICAnICsgaGFzaC52YWx1ZXMuam9pbignLFxcbiAgICAnKSArICdcXG4gIH0nKTtcbiAgfSxcblxuICAvLyBbcHVzaFN0cmluZ11cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogcXVvdGVkU3RyaW5nKHN0cmluZyksIC4uLlxuICAvL1xuICAvLyBQdXNoIGEgcXVvdGVkIHZlcnNpb24gb2YgYHN0cmluZ2Agb250byB0aGUgc3RhY2tcbiAgcHVzaFN0cmluZzogZnVuY3Rpb24oc3RyaW5nKSB7XG4gICAgdGhpcy5wdXNoU3RhY2tMaXRlcmFsKHRoaXMucXVvdGVkU3RyaW5nKHN0cmluZykpO1xuICB9LFxuXG4gIC8vIFtwdXNoXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiBleHByLCAuLi5cbiAgLy9cbiAgLy8gUHVzaCBhbiBleHByZXNzaW9uIG9udG8gdGhlIHN0YWNrXG4gIHB1c2g6IGZ1bmN0aW9uKGV4cHIpIHtcbiAgICB0aGlzLmlubGluZVN0YWNrLnB1c2goZXhwcik7XG4gICAgcmV0dXJuIGV4cHI7XG4gIH0sXG5cbiAgLy8gW3B1c2hMaXRlcmFsXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiB2YWx1ZSwgLi4uXG4gIC8vXG4gIC8vIFB1c2hlcyBhIHZhbHVlIG9udG8gdGhlIHN0YWNrLiBUaGlzIG9wZXJhdGlvbiBwcmV2ZW50c1xuICAvLyB0aGUgY29tcGlsZXIgZnJvbSBjcmVhdGluZyBhIHRlbXBvcmFyeSB2YXJpYWJsZSB0byBob2xkXG4gIC8vIGl0LlxuICBwdXNoTGl0ZXJhbDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICB0aGlzLnB1c2hTdGFja0xpdGVyYWwodmFsdWUpO1xuICB9LFxuXG4gIC8vIFtwdXNoUHJvZ3JhbV1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogcHJvZ3JhbShndWlkKSwgLi4uXG4gIC8vXG4gIC8vIFB1c2ggYSBwcm9ncmFtIGV4cHJlc3Npb24gb250byB0aGUgc3RhY2suIFRoaXMgdGFrZXNcbiAgLy8gYSBjb21waWxlLXRpbWUgZ3VpZCBhbmQgY29udmVydHMgaXQgaW50byBhIHJ1bnRpbWUtYWNjZXNzaWJsZVxuICAvLyBleHByZXNzaW9uLlxuICBwdXNoUHJvZ3JhbTogZnVuY3Rpb24oZ3VpZCkge1xuICAgIGlmIChndWlkICE9IG51bGwpIHtcbiAgICAgIHRoaXMucHVzaFN0YWNrTGl0ZXJhbCh0aGlzLnByb2dyYW1FeHByZXNzaW9uKGd1aWQpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5wdXNoU3RhY2tMaXRlcmFsKG51bGwpO1xuICAgIH1cbiAgfSxcblxuICAvLyBbaW52b2tlSGVscGVyXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiBoYXNoLCBpbnZlcnNlLCBwcm9ncmFtLCBwYXJhbXMuLi4sIC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IHJlc3VsdCBvZiBoZWxwZXIgaW52b2NhdGlvblxuICAvL1xuICAvLyBQb3BzIG9mZiB0aGUgaGVscGVyJ3MgcGFyYW1ldGVycywgaW52b2tlcyB0aGUgaGVscGVyLFxuICAvLyBhbmQgcHVzaGVzIHRoZSBoZWxwZXIncyByZXR1cm4gdmFsdWUgb250byB0aGUgc3RhY2suXG4gIC8vXG4gIC8vIElmIHRoZSBoZWxwZXIgaXMgbm90IGZvdW5kLCBgaGVscGVyTWlzc2luZ2AgaXMgY2FsbGVkLlxuICBpbnZva2VIZWxwZXI6IGZ1bmN0aW9uKHBhcmFtU2l6ZSwgbmFtZSkge1xuICAgIHRoaXMuY29udGV4dC5hbGlhc2VzLmhlbHBlck1pc3NpbmcgPSAnaGVscGVycy5oZWxwZXJNaXNzaW5nJztcblxuICAgIHZhciBoZWxwZXIgPSB0aGlzLmxhc3RIZWxwZXIgPSB0aGlzLnNldHVwSGVscGVyKHBhcmFtU2l6ZSwgbmFtZSwgdHJ1ZSk7XG4gICAgdmFyIG5vbkhlbHBlciA9IHRoaXMubmFtZUxvb2t1cCgnZGVwdGgnICsgdGhpcy5sYXN0Q29udGV4dCwgbmFtZSwgJ2NvbnRleHQnKTtcblxuICAgIHRoaXMucHVzaChoZWxwZXIubmFtZSArICcgfHwgJyArIG5vbkhlbHBlcik7XG4gICAgdGhpcy5yZXBsYWNlU3RhY2soZnVuY3Rpb24obmFtZSkge1xuICAgICAgcmV0dXJuIG5hbWUgKyAnID8gJyArIG5hbWUgKyAnLmNhbGwoJyArXG4gICAgICAgICAgaGVscGVyLmNhbGxQYXJhbXMgKyBcIikgXCIgKyBcIjogaGVscGVyTWlzc2luZy5jYWxsKFwiICtcbiAgICAgICAgICBoZWxwZXIuaGVscGVyTWlzc2luZ1BhcmFtcyArIFwiKVwiO1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIFtpbnZva2VLbm93bkhlbHBlcl1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogaGFzaCwgaW52ZXJzZSwgcHJvZ3JhbSwgcGFyYW1zLi4uLCAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiByZXN1bHQgb2YgaGVscGVyIGludm9jYXRpb25cbiAgLy9cbiAgLy8gVGhpcyBvcGVyYXRpb24gaXMgdXNlZCB3aGVuIHRoZSBoZWxwZXIgaXMga25vd24gdG8gZXhpc3QsXG4gIC8vIHNvIGEgYGhlbHBlck1pc3NpbmdgIGZhbGxiYWNrIGlzIG5vdCByZXF1aXJlZC5cbiAgaW52b2tlS25vd25IZWxwZXI6IGZ1bmN0aW9uKHBhcmFtU2l6ZSwgbmFtZSkge1xuICAgIHZhciBoZWxwZXIgPSB0aGlzLnNldHVwSGVscGVyKHBhcmFtU2l6ZSwgbmFtZSk7XG4gICAgdGhpcy5wdXNoKGhlbHBlci5uYW1lICsgXCIuY2FsbChcIiArIGhlbHBlci5jYWxsUGFyYW1zICsgXCIpXCIpO1xuICB9LFxuXG4gIC8vIFtpbnZva2VBbWJpZ3VvdXNdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IGhhc2gsIGludmVyc2UsIHByb2dyYW0sIHBhcmFtcy4uLiwgLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogcmVzdWx0IG9mIGRpc2FtYmlndWF0aW9uXG4gIC8vXG4gIC8vIFRoaXMgb3BlcmF0aW9uIGlzIHVzZWQgd2hlbiBhbiBleHByZXNzaW9uIGxpa2UgYHt7Zm9vfX1gXG4gIC8vIGlzIHByb3ZpZGVkLCBidXQgd2UgZG9uJ3Qga25vdyBhdCBjb21waWxlLXRpbWUgd2hldGhlciBpdFxuICAvLyBpcyBhIGhlbHBlciBvciBhIHBhdGguXG4gIC8vXG4gIC8vIFRoaXMgb3BlcmF0aW9uIGVtaXRzIG1vcmUgY29kZSB0aGFuIHRoZSBvdGhlciBvcHRpb25zLFxuICAvLyBhbmQgY2FuIGJlIGF2b2lkZWQgYnkgcGFzc2luZyB0aGUgYGtub3duSGVscGVyc2AgYW5kXG4gIC8vIGBrbm93bkhlbHBlcnNPbmx5YCBmbGFncyBhdCBjb21waWxlLXRpbWUuXG4gIGludm9rZUFtYmlndW91czogZnVuY3Rpb24obmFtZSwgaGVscGVyQ2FsbCkge1xuICAgIHRoaXMuY29udGV4dC5hbGlhc2VzLmZ1bmN0aW9uVHlwZSA9ICdcImZ1bmN0aW9uXCInO1xuXG4gICAgdGhpcy5wdXNoU3RhY2tMaXRlcmFsKCd7fScpOyAgICAvLyBIYXNoIHZhbHVlXG4gICAgdmFyIGhlbHBlciA9IHRoaXMuc2V0dXBIZWxwZXIoMCwgbmFtZSwgaGVscGVyQ2FsbCk7XG5cbiAgICB2YXIgaGVscGVyTmFtZSA9IHRoaXMubGFzdEhlbHBlciA9IHRoaXMubmFtZUxvb2t1cCgnaGVscGVycycsIG5hbWUsICdoZWxwZXInKTtcblxuICAgIHZhciBub25IZWxwZXIgPSB0aGlzLm5hbWVMb29rdXAoJ2RlcHRoJyArIHRoaXMubGFzdENvbnRleHQsIG5hbWUsICdjb250ZXh0Jyk7XG4gICAgdmFyIG5leHRTdGFjayA9IHRoaXMubmV4dFN0YWNrKCk7XG5cbiAgICB0aGlzLnB1c2hTb3VyY2UoJ2lmICgnICsgbmV4dFN0YWNrICsgJyA9ICcgKyBoZWxwZXJOYW1lICsgJykgeyAnICsgbmV4dFN0YWNrICsgJyA9ICcgKyBuZXh0U3RhY2sgKyAnLmNhbGwoJyArIGhlbHBlci5jYWxsUGFyYW1zICsgJyk7IH0nKTtcbiAgICB0aGlzLnB1c2hTb3VyY2UoJ2Vsc2UgeyAnICsgbmV4dFN0YWNrICsgJyA9ICcgKyBub25IZWxwZXIgKyAnOyAnICsgbmV4dFN0YWNrICsgJyA9IHR5cGVvZiAnICsgbmV4dFN0YWNrICsgJyA9PT0gZnVuY3Rpb25UeXBlID8gJyArIG5leHRTdGFjayArICcuY2FsbCgnICsgaGVscGVyLmNhbGxQYXJhbXMgKyAnKSA6ICcgKyBuZXh0U3RhY2sgKyAnOyB9Jyk7XG4gIH0sXG5cbiAgLy8gW2ludm9rZVBhcnRpYWxdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IGNvbnRleHQsIC4uLlxuICAvLyBPbiBzdGFjayBhZnRlcjogcmVzdWx0IG9mIHBhcnRpYWwgaW52b2NhdGlvblxuICAvL1xuICAvLyBUaGlzIG9wZXJhdGlvbiBwb3BzIG9mZiBhIGNvbnRleHQsIGludm9rZXMgYSBwYXJ0aWFsIHdpdGggdGhhdCBjb250ZXh0LFxuICAvLyBhbmQgcHVzaGVzIHRoZSByZXN1bHQgb2YgdGhlIGludm9jYXRpb24gYmFjay5cbiAgaW52b2tlUGFydGlhbDogZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciBwYXJhbXMgPSBbdGhpcy5uYW1lTG9va3VwKCdwYXJ0aWFscycsIG5hbWUsICdwYXJ0aWFsJyksIFwiJ1wiICsgbmFtZSArIFwiJ1wiLCB0aGlzLnBvcFN0YWNrKCksIFwiaGVscGVyc1wiLCBcInBhcnRpYWxzXCJdO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5kYXRhKSB7XG4gICAgICBwYXJhbXMucHVzaChcImRhdGFcIik7XG4gICAgfVxuXG4gICAgdGhpcy5jb250ZXh0LmFsaWFzZXMuc2VsZiA9IFwidGhpc1wiO1xuICAgIHRoaXMucHVzaChcInNlbGYuaW52b2tlUGFydGlhbChcIiArIHBhcmFtcy5qb2luKFwiLCBcIikgKyBcIilcIik7XG4gIH0sXG5cbiAgLy8gW2Fzc2lnblRvSGFzaF1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogdmFsdWUsIGhhc2gsIC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IGhhc2gsIC4uLlxuICAvL1xuICAvLyBQb3BzIGEgdmFsdWUgYW5kIGhhc2ggb2ZmIHRoZSBzdGFjaywgYXNzaWducyBgaGFzaFtrZXldID0gdmFsdWVgXG4gIC8vIGFuZCBwdXNoZXMgdGhlIGhhc2ggYmFjayBvbnRvIHRoZSBzdGFjay5cbiAgYXNzaWduVG9IYXNoOiBmdW5jdGlvbihrZXkpIHtcbiAgICB2YXIgdmFsdWUgPSB0aGlzLnBvcFN0YWNrKCksXG4gICAgICAgIGNvbnRleHQsXG4gICAgICAgIHR5cGU7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmluZ1BhcmFtcykge1xuICAgICAgdHlwZSA9IHRoaXMucG9wU3RhY2soKTtcbiAgICAgIGNvbnRleHQgPSB0aGlzLnBvcFN0YWNrKCk7XG4gICAgfVxuXG4gICAgdmFyIGhhc2ggPSB0aGlzLmhhc2g7XG4gICAgaWYgKGNvbnRleHQpIHtcbiAgICAgIGhhc2guY29udGV4dHMucHVzaChcIidcIiArIGtleSArIFwiJzogXCIgKyBjb250ZXh0KTtcbiAgICB9XG4gICAgaWYgKHR5cGUpIHtcbiAgICAgIGhhc2gudHlwZXMucHVzaChcIidcIiArIGtleSArIFwiJzogXCIgKyB0eXBlKTtcbiAgICB9XG4gICAgaGFzaC52YWx1ZXMucHVzaChcIidcIiArIGtleSArIFwiJzogKFwiICsgdmFsdWUgKyBcIilcIik7XG4gIH0sXG5cbiAgLy8gSEVMUEVSU1xuXG4gIGNvbXBpbGVyOiBKYXZhU2NyaXB0Q29tcGlsZXIsXG5cbiAgY29tcGlsZUNoaWxkcmVuOiBmdW5jdGlvbihlbnZpcm9ubWVudCwgb3B0aW9ucykge1xuICAgIHZhciBjaGlsZHJlbiA9IGVudmlyb25tZW50LmNoaWxkcmVuLCBjaGlsZCwgY29tcGlsZXI7XG5cbiAgICBmb3IodmFyIGk9MCwgbD1jaGlsZHJlbi5sZW5ndGg7IGk8bDsgaSsrKSB7XG4gICAgICBjaGlsZCA9IGNoaWxkcmVuW2ldO1xuICAgICAgY29tcGlsZXIgPSBuZXcgdGhpcy5jb21waWxlcigpO1xuXG4gICAgICB2YXIgaW5kZXggPSB0aGlzLm1hdGNoRXhpc3RpbmdQcm9ncmFtKGNoaWxkKTtcblxuICAgICAgaWYgKGluZGV4ID09IG51bGwpIHtcbiAgICAgICAgdGhpcy5jb250ZXh0LnByb2dyYW1zLnB1c2goJycpOyAgICAgLy8gUGxhY2Vob2xkZXIgdG8gcHJldmVudCBuYW1lIGNvbmZsaWN0cyBmb3IgbmVzdGVkIGNoaWxkcmVuXG4gICAgICAgIGluZGV4ID0gdGhpcy5jb250ZXh0LnByb2dyYW1zLmxlbmd0aDtcbiAgICAgICAgY2hpbGQuaW5kZXggPSBpbmRleDtcbiAgICAgICAgY2hpbGQubmFtZSA9ICdwcm9ncmFtJyArIGluZGV4O1xuICAgICAgICB0aGlzLmNvbnRleHQucHJvZ3JhbXNbaW5kZXhdID0gY29tcGlsZXIuY29tcGlsZShjaGlsZCwgb3B0aW9ucywgdGhpcy5jb250ZXh0KTtcbiAgICAgICAgdGhpcy5jb250ZXh0LmVudmlyb25tZW50c1tpbmRleF0gPSBjaGlsZDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNoaWxkLmluZGV4ID0gaW5kZXg7XG4gICAgICAgIGNoaWxkLm5hbWUgPSAncHJvZ3JhbScgKyBpbmRleDtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIG1hdGNoRXhpc3RpbmdQcm9ncmFtOiBmdW5jdGlvbihjaGlsZCkge1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSB0aGlzLmNvbnRleHQuZW52aXJvbm1lbnRzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICB2YXIgZW52aXJvbm1lbnQgPSB0aGlzLmNvbnRleHQuZW52aXJvbm1lbnRzW2ldO1xuICAgICAgaWYgKGVudmlyb25tZW50ICYmIGVudmlyb25tZW50LmVxdWFscyhjaGlsZCkpIHtcbiAgICAgICAgcmV0dXJuIGk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIHByb2dyYW1FeHByZXNzaW9uOiBmdW5jdGlvbihndWlkKSB7XG4gICAgdGhpcy5jb250ZXh0LmFsaWFzZXMuc2VsZiA9IFwidGhpc1wiO1xuXG4gICAgaWYoZ3VpZCA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gXCJzZWxmLm5vb3BcIjtcbiAgICB9XG5cbiAgICB2YXIgY2hpbGQgPSB0aGlzLmVudmlyb25tZW50LmNoaWxkcmVuW2d1aWRdLFxuICAgICAgICBkZXB0aHMgPSBjaGlsZC5kZXB0aHMubGlzdCwgZGVwdGg7XG5cbiAgICB2YXIgcHJvZ3JhbVBhcmFtcyA9IFtjaGlsZC5pbmRleCwgY2hpbGQubmFtZSwgXCJkYXRhXCJdO1xuXG4gICAgZm9yKHZhciBpPTAsIGwgPSBkZXB0aHMubGVuZ3RoOyBpPGw7IGkrKykge1xuICAgICAgZGVwdGggPSBkZXB0aHNbaV07XG5cbiAgICAgIGlmKGRlcHRoID09PSAxKSB7IHByb2dyYW1QYXJhbXMucHVzaChcImRlcHRoMFwiKTsgfVxuICAgICAgZWxzZSB7IHByb2dyYW1QYXJhbXMucHVzaChcImRlcHRoXCIgKyAoZGVwdGggLSAxKSk7IH1cbiAgICB9XG5cbiAgICByZXR1cm4gKGRlcHRocy5sZW5ndGggPT09IDAgPyBcInNlbGYucHJvZ3JhbShcIiA6IFwic2VsZi5wcm9ncmFtV2l0aERlcHRoKFwiKSArIHByb2dyYW1QYXJhbXMuam9pbihcIiwgXCIpICsgXCIpXCI7XG4gIH0sXG5cbiAgcmVnaXN0ZXI6IGZ1bmN0aW9uKG5hbWUsIHZhbCkge1xuICAgIHRoaXMudXNlUmVnaXN0ZXIobmFtZSk7XG4gICAgdGhpcy5wdXNoU291cmNlKG5hbWUgKyBcIiA9IFwiICsgdmFsICsgXCI7XCIpO1xuICB9LFxuXG4gIHVzZVJlZ2lzdGVyOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgaWYoIXRoaXMucmVnaXN0ZXJzW25hbWVdKSB7XG4gICAgICB0aGlzLnJlZ2lzdGVyc1tuYW1lXSA9IHRydWU7XG4gICAgICB0aGlzLnJlZ2lzdGVycy5saXN0LnB1c2gobmFtZSk7XG4gICAgfVxuICB9LFxuXG4gIHB1c2hTdGFja0xpdGVyYWw6IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICByZXR1cm4gdGhpcy5wdXNoKG5ldyBMaXRlcmFsKGl0ZW0pKTtcbiAgfSxcblxuICBwdXNoU291cmNlOiBmdW5jdGlvbihzb3VyY2UpIHtcbiAgICBpZiAodGhpcy5wZW5kaW5nQ29udGVudCkge1xuICAgICAgdGhpcy5zb3VyY2UucHVzaCh0aGlzLmFwcGVuZFRvQnVmZmVyKHRoaXMucXVvdGVkU3RyaW5nKHRoaXMucGVuZGluZ0NvbnRlbnQpKSk7XG4gICAgICB0aGlzLnBlbmRpbmdDb250ZW50ID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGlmIChzb3VyY2UpIHtcbiAgICAgIHRoaXMuc291cmNlLnB1c2goc291cmNlKTtcbiAgICB9XG4gIH0sXG5cbiAgcHVzaFN0YWNrOiBmdW5jdGlvbihpdGVtKSB7XG4gICAgdGhpcy5mbHVzaElubGluZSgpO1xuXG4gICAgdmFyIHN0YWNrID0gdGhpcy5pbmNyU3RhY2soKTtcbiAgICBpZiAoaXRlbSkge1xuICAgICAgdGhpcy5wdXNoU291cmNlKHN0YWNrICsgXCIgPSBcIiArIGl0ZW0gKyBcIjtcIik7XG4gICAgfVxuICAgIHRoaXMuY29tcGlsZVN0YWNrLnB1c2goc3RhY2spO1xuICAgIHJldHVybiBzdGFjaztcbiAgfSxcblxuICByZXBsYWNlU3RhY2s6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgdmFyIHByZWZpeCA9ICcnLFxuICAgICAgICBpbmxpbmUgPSB0aGlzLmlzSW5saW5lKCksXG4gICAgICAgIHN0YWNrO1xuXG4gICAgLy8gSWYgd2UgYXJlIGN1cnJlbnRseSBpbmxpbmUgdGhlbiB3ZSB3YW50IHRvIG1lcmdlIHRoZSBpbmxpbmUgc3RhdGVtZW50IGludG8gdGhlXG4gICAgLy8gcmVwbGFjZW1lbnQgc3RhdGVtZW50IHZpYSAnLCdcbiAgICBpZiAoaW5saW5lKSB7XG4gICAgICB2YXIgdG9wID0gdGhpcy5wb3BTdGFjayh0cnVlKTtcblxuICAgICAgaWYgKHRvcCBpbnN0YW5jZW9mIExpdGVyYWwpIHtcbiAgICAgICAgLy8gTGl0ZXJhbHMgZG8gbm90IG5lZWQgdG8gYmUgaW5saW5lZFxuICAgICAgICBzdGFjayA9IHRvcC52YWx1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEdldCBvciBjcmVhdGUgdGhlIGN1cnJlbnQgc3RhY2sgbmFtZSBmb3IgdXNlIGJ5IHRoZSBpbmxpbmVcbiAgICAgICAgdmFyIG5hbWUgPSB0aGlzLnN0YWNrU2xvdCA/IHRoaXMudG9wU3RhY2tOYW1lKCkgOiB0aGlzLmluY3JTdGFjaygpO1xuXG4gICAgICAgIHByZWZpeCA9ICcoJyArIHRoaXMucHVzaChuYW1lKSArICcgPSAnICsgdG9wICsgJyksJztcbiAgICAgICAgc3RhY2sgPSB0aGlzLnRvcFN0YWNrKCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0YWNrID0gdGhpcy50b3BTdGFjaygpO1xuICAgIH1cblxuICAgIHZhciBpdGVtID0gY2FsbGJhY2suY2FsbCh0aGlzLCBzdGFjayk7XG5cbiAgICBpZiAoaW5saW5lKSB7XG4gICAgICBpZiAodGhpcy5pbmxpbmVTdGFjay5sZW5ndGggfHwgdGhpcy5jb21waWxlU3RhY2subGVuZ3RoKSB7XG4gICAgICAgIHRoaXMucG9wU3RhY2soKTtcbiAgICAgIH1cbiAgICAgIHRoaXMucHVzaCgnKCcgKyBwcmVmaXggKyBpdGVtICsgJyknKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gUHJldmVudCBtb2RpZmljYXRpb24gb2YgdGhlIGNvbnRleHQgZGVwdGggdmFyaWFibGUuIFRocm91Z2ggcmVwbGFjZVN0YWNrXG4gICAgICBpZiAoIS9ec3RhY2svLnRlc3Qoc3RhY2spKSB7XG4gICAgICAgIHN0YWNrID0gdGhpcy5uZXh0U3RhY2soKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5wdXNoU291cmNlKHN0YWNrICsgXCIgPSAoXCIgKyBwcmVmaXggKyBpdGVtICsgXCIpO1wiKTtcbiAgICB9XG4gICAgcmV0dXJuIHN0YWNrO1xuICB9LFxuXG4gIG5leHRTdGFjazogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMucHVzaFN0YWNrKCk7XG4gIH0sXG5cbiAgaW5jclN0YWNrOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN0YWNrU2xvdCsrO1xuICAgIGlmKHRoaXMuc3RhY2tTbG90ID4gdGhpcy5zdGFja1ZhcnMubGVuZ3RoKSB7IHRoaXMuc3RhY2tWYXJzLnB1c2goXCJzdGFja1wiICsgdGhpcy5zdGFja1Nsb3QpOyB9XG4gICAgcmV0dXJuIHRoaXMudG9wU3RhY2tOYW1lKCk7XG4gIH0sXG4gIHRvcFN0YWNrTmFtZTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIFwic3RhY2tcIiArIHRoaXMuc3RhY2tTbG90O1xuICB9LFxuICBmbHVzaElubGluZTogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGlubGluZVN0YWNrID0gdGhpcy5pbmxpbmVTdGFjaztcbiAgICBpZiAoaW5saW5lU3RhY2subGVuZ3RoKSB7XG4gICAgICB0aGlzLmlubGluZVN0YWNrID0gW107XG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gaW5saW5lU3RhY2subGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgdmFyIGVudHJ5ID0gaW5saW5lU3RhY2tbaV07XG4gICAgICAgIGlmIChlbnRyeSBpbnN0YW5jZW9mIExpdGVyYWwpIHtcbiAgICAgICAgICB0aGlzLmNvbXBpbGVTdGFjay5wdXNoKGVudHJ5KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnB1c2hTdGFjayhlbnRyeSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIGlzSW5saW5lOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5pbmxpbmVTdGFjay5sZW5ndGg7XG4gIH0sXG5cbiAgcG9wU3RhY2s6IGZ1bmN0aW9uKHdyYXBwZWQpIHtcbiAgICB2YXIgaW5saW5lID0gdGhpcy5pc0lubGluZSgpLFxuICAgICAgICBpdGVtID0gKGlubGluZSA/IHRoaXMuaW5saW5lU3RhY2sgOiB0aGlzLmNvbXBpbGVTdGFjaykucG9wKCk7XG5cbiAgICBpZiAoIXdyYXBwZWQgJiYgKGl0ZW0gaW5zdGFuY2VvZiBMaXRlcmFsKSkge1xuICAgICAgcmV0dXJuIGl0ZW0udmFsdWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICghaW5saW5lKSB7XG4gICAgICAgIHRoaXMuc3RhY2tTbG90LS07XG4gICAgICB9XG4gICAgICByZXR1cm4gaXRlbTtcbiAgICB9XG4gIH0sXG5cbiAgdG9wU3RhY2s6IGZ1bmN0aW9uKHdyYXBwZWQpIHtcbiAgICB2YXIgc3RhY2sgPSAodGhpcy5pc0lubGluZSgpID8gdGhpcy5pbmxpbmVTdGFjayA6IHRoaXMuY29tcGlsZVN0YWNrKSxcbiAgICAgICAgaXRlbSA9IHN0YWNrW3N0YWNrLmxlbmd0aCAtIDFdO1xuXG4gICAgaWYgKCF3cmFwcGVkICYmIChpdGVtIGluc3RhbmNlb2YgTGl0ZXJhbCkpIHtcbiAgICAgIHJldHVybiBpdGVtLnZhbHVlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gaXRlbTtcbiAgICB9XG4gIH0sXG5cbiAgcXVvdGVkU3RyaW5nOiBmdW5jdGlvbihzdHIpIHtcbiAgICByZXR1cm4gJ1wiJyArIHN0clxuICAgICAgLnJlcGxhY2UoL1xcXFwvZywgJ1xcXFxcXFxcJylcbiAgICAgIC5yZXBsYWNlKC9cIi9nLCAnXFxcXFwiJylcbiAgICAgIC5yZXBsYWNlKC9cXG4vZywgJ1xcXFxuJylcbiAgICAgIC5yZXBsYWNlKC9cXHIvZywgJ1xcXFxyJylcbiAgICAgIC5yZXBsYWNlKC9cXHUyMDI4L2csICdcXFxcdTIwMjgnKSAgIC8vIFBlciBFY21hLTI2MiA3LjMgKyA3LjguNFxuICAgICAgLnJlcGxhY2UoL1xcdTIwMjkvZywgJ1xcXFx1MjAyOScpICsgJ1wiJztcbiAgfSxcblxuICBzZXR1cEhlbHBlcjogZnVuY3Rpb24ocGFyYW1TaXplLCBuYW1lLCBtaXNzaW5nUGFyYW1zKSB7XG4gICAgdmFyIHBhcmFtcyA9IFtdO1xuICAgIHRoaXMuc2V0dXBQYXJhbXMocGFyYW1TaXplLCBwYXJhbXMsIG1pc3NpbmdQYXJhbXMpO1xuICAgIHZhciBmb3VuZEhlbHBlciA9IHRoaXMubmFtZUxvb2t1cCgnaGVscGVycycsIG5hbWUsICdoZWxwZXInKTtcblxuICAgIHJldHVybiB7XG4gICAgICBwYXJhbXM6IHBhcmFtcyxcbiAgICAgIG5hbWU6IGZvdW5kSGVscGVyLFxuICAgICAgY2FsbFBhcmFtczogW1wiZGVwdGgwXCJdLmNvbmNhdChwYXJhbXMpLmpvaW4oXCIsIFwiKSxcbiAgICAgIGhlbHBlck1pc3NpbmdQYXJhbXM6IG1pc3NpbmdQYXJhbXMgJiYgW1wiZGVwdGgwXCIsIHRoaXMucXVvdGVkU3RyaW5nKG5hbWUpXS5jb25jYXQocGFyYW1zKS5qb2luKFwiLCBcIilcbiAgICB9O1xuICB9LFxuXG4gIC8vIHRoZSBwYXJhbXMgYW5kIGNvbnRleHRzIGFyZ3VtZW50cyBhcmUgcGFzc2VkIGluIGFycmF5c1xuICAvLyB0byBmaWxsIGluXG4gIHNldHVwUGFyYW1zOiBmdW5jdGlvbihwYXJhbVNpemUsIHBhcmFtcywgdXNlUmVnaXN0ZXIpIHtcbiAgICB2YXIgb3B0aW9ucyA9IFtdLCBjb250ZXh0cyA9IFtdLCB0eXBlcyA9IFtdLCBwYXJhbSwgaW52ZXJzZSwgcHJvZ3JhbTtcblxuICAgIG9wdGlvbnMucHVzaChcImhhc2g6XCIgKyB0aGlzLnBvcFN0YWNrKCkpO1xuXG4gICAgaW52ZXJzZSA9IHRoaXMucG9wU3RhY2soKTtcbiAgICBwcm9ncmFtID0gdGhpcy5wb3BTdGFjaygpO1xuXG4gICAgLy8gQXZvaWQgc2V0dGluZyBmbiBhbmQgaW52ZXJzZSBpZiBuZWl0aGVyIGFyZSBzZXQuIFRoaXMgYWxsb3dzXG4gICAgLy8gaGVscGVycyB0byBkbyBhIGNoZWNrIGZvciBgaWYgKG9wdGlvbnMuZm4pYFxuICAgIGlmIChwcm9ncmFtIHx8IGludmVyc2UpIHtcbiAgICAgIGlmICghcHJvZ3JhbSkge1xuICAgICAgICB0aGlzLmNvbnRleHQuYWxpYXNlcy5zZWxmID0gXCJ0aGlzXCI7XG4gICAgICAgIHByb2dyYW0gPSBcInNlbGYubm9vcFwiO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWludmVyc2UpIHtcbiAgICAgICB0aGlzLmNvbnRleHQuYWxpYXNlcy5zZWxmID0gXCJ0aGlzXCI7XG4gICAgICAgIGludmVyc2UgPSBcInNlbGYubm9vcFwiO1xuICAgICAgfVxuXG4gICAgICBvcHRpb25zLnB1c2goXCJpbnZlcnNlOlwiICsgaW52ZXJzZSk7XG4gICAgICBvcHRpb25zLnB1c2goXCJmbjpcIiArIHByb2dyYW0pO1xuICAgIH1cblxuICAgIGZvcih2YXIgaT0wOyBpPHBhcmFtU2l6ZTsgaSsrKSB7XG4gICAgICBwYXJhbSA9IHRoaXMucG9wU3RhY2soKTtcbiAgICAgIHBhcmFtcy5wdXNoKHBhcmFtKTtcblxuICAgICAgaWYodGhpcy5vcHRpb25zLnN0cmluZ1BhcmFtcykge1xuICAgICAgICB0eXBlcy5wdXNoKHRoaXMucG9wU3RhY2soKSk7XG4gICAgICAgIGNvbnRleHRzLnB1c2godGhpcy5wb3BTdGFjaygpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmluZ1BhcmFtcykge1xuICAgICAgb3B0aW9ucy5wdXNoKFwiY29udGV4dHM6W1wiICsgY29udGV4dHMuam9pbihcIixcIikgKyBcIl1cIik7XG4gICAgICBvcHRpb25zLnB1c2goXCJ0eXBlczpbXCIgKyB0eXBlcy5qb2luKFwiLFwiKSArIFwiXVwiKTtcbiAgICAgIG9wdGlvbnMucHVzaChcImhhc2hDb250ZXh0czpoYXNoQ29udGV4dHNcIik7XG4gICAgICBvcHRpb25zLnB1c2goXCJoYXNoVHlwZXM6aGFzaFR5cGVzXCIpO1xuICAgIH1cblxuICAgIGlmKHRoaXMub3B0aW9ucy5kYXRhKSB7XG4gICAgICBvcHRpb25zLnB1c2goXCJkYXRhOmRhdGFcIik7XG4gICAgfVxuXG4gICAgb3B0aW9ucyA9IFwie1wiICsgb3B0aW9ucy5qb2luKFwiLFwiKSArIFwifVwiO1xuICAgIGlmICh1c2VSZWdpc3Rlcikge1xuICAgICAgdGhpcy5yZWdpc3Rlcignb3B0aW9ucycsIG9wdGlvbnMpO1xuICAgICAgcGFyYW1zLnB1c2goJ29wdGlvbnMnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGFyYW1zLnB1c2gob3B0aW9ucyk7XG4gICAgfVxuICAgIHJldHVybiBwYXJhbXMuam9pbihcIiwgXCIpO1xuICB9XG59O1xuXG52YXIgcmVzZXJ2ZWRXb3JkcyA9IChcbiAgXCJicmVhayBlbHNlIG5ldyB2YXJcIiArXG4gIFwiIGNhc2UgZmluYWxseSByZXR1cm4gdm9pZFwiICtcbiAgXCIgY2F0Y2ggZm9yIHN3aXRjaCB3aGlsZVwiICtcbiAgXCIgY29udGludWUgZnVuY3Rpb24gdGhpcyB3aXRoXCIgK1xuICBcIiBkZWZhdWx0IGlmIHRocm93XCIgK1xuICBcIiBkZWxldGUgaW4gdHJ5XCIgK1xuICBcIiBkbyBpbnN0YW5jZW9mIHR5cGVvZlwiICtcbiAgXCIgYWJzdHJhY3QgZW51bSBpbnQgc2hvcnRcIiArXG4gIFwiIGJvb2xlYW4gZXhwb3J0IGludGVyZmFjZSBzdGF0aWNcIiArXG4gIFwiIGJ5dGUgZXh0ZW5kcyBsb25nIHN1cGVyXCIgK1xuICBcIiBjaGFyIGZpbmFsIG5hdGl2ZSBzeW5jaHJvbml6ZWRcIiArXG4gIFwiIGNsYXNzIGZsb2F0IHBhY2thZ2UgdGhyb3dzXCIgK1xuICBcIiBjb25zdCBnb3RvIHByaXZhdGUgdHJhbnNpZW50XCIgK1xuICBcIiBkZWJ1Z2dlciBpbXBsZW1lbnRzIHByb3RlY3RlZCB2b2xhdGlsZVwiICtcbiAgXCIgZG91YmxlIGltcG9ydCBwdWJsaWMgbGV0IHlpZWxkXCJcbikuc3BsaXQoXCIgXCIpO1xuXG52YXIgY29tcGlsZXJXb3JkcyA9IEphdmFTY3JpcHRDb21waWxlci5SRVNFUlZFRF9XT1JEUyA9IHt9O1xuXG5mb3IodmFyIGk9MCwgbD1yZXNlcnZlZFdvcmRzLmxlbmd0aDsgaTxsOyBpKyspIHtcbiAgY29tcGlsZXJXb3Jkc1tyZXNlcnZlZFdvcmRzW2ldXSA9IHRydWU7XG59XG5cbkphdmFTY3JpcHRDb21waWxlci5pc1ZhbGlkSmF2YVNjcmlwdFZhcmlhYmxlTmFtZSA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgaWYoIUphdmFTY3JpcHRDb21waWxlci5SRVNFUlZFRF9XT1JEU1tuYW1lXSAmJiAvXlthLXpBLVpfJF1bMC05YS16QS1aXyRdKiQvLnRlc3QobmFtZSkpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59O1xuXG5leHBvcnRzW1wiZGVmYXVsdFwiXSA9IEphdmFTY3JpcHRDb21waWxlcjsiLCJcInVzZSBzdHJpY3RcIjtcbi8qIGpzaGludCBpZ25vcmU6c3RhcnQgKi9cbi8qIEppc29uIGdlbmVyYXRlZCBwYXJzZXIgKi9cbnZhciBoYW5kbGViYXJzID0gKGZ1bmN0aW9uKCl7XG52YXIgcGFyc2VyID0ge3RyYWNlOiBmdW5jdGlvbiB0cmFjZSgpIHsgfSxcbnl5OiB7fSxcbnN5bWJvbHNfOiB7XCJlcnJvclwiOjIsXCJyb290XCI6MyxcInN0YXRlbWVudHNcIjo0LFwiRU9GXCI6NSxcInByb2dyYW1cIjo2LFwic2ltcGxlSW52ZXJzZVwiOjcsXCJzdGF0ZW1lbnRcIjo4LFwib3BlbkludmVyc2VcIjo5LFwiY2xvc2VCbG9ja1wiOjEwLFwib3BlbkJsb2NrXCI6MTEsXCJtdXN0YWNoZVwiOjEyLFwicGFydGlhbFwiOjEzLFwiQ09OVEVOVFwiOjE0LFwiQ09NTUVOVFwiOjE1LFwiT1BFTl9CTE9DS1wiOjE2LFwiaW5NdXN0YWNoZVwiOjE3LFwiQ0xPU0VcIjoxOCxcIk9QRU5fSU5WRVJTRVwiOjE5LFwiT1BFTl9FTkRCTE9DS1wiOjIwLFwicGF0aFwiOjIxLFwiT1BFTlwiOjIyLFwiT1BFTl9VTkVTQ0FQRURcIjoyMyxcIkNMT1NFX1VORVNDQVBFRFwiOjI0LFwiT1BFTl9QQVJUSUFMXCI6MjUsXCJwYXJ0aWFsTmFtZVwiOjI2LFwicGFydGlhbF9vcHRpb24wXCI6MjcsXCJpbk11c3RhY2hlX3JlcGV0aXRpb24wXCI6MjgsXCJpbk11c3RhY2hlX29wdGlvbjBcIjoyOSxcImRhdGFOYW1lXCI6MzAsXCJwYXJhbVwiOjMxLFwiU1RSSU5HXCI6MzIsXCJJTlRFR0VSXCI6MzMsXCJCT09MRUFOXCI6MzQsXCJoYXNoXCI6MzUsXCJoYXNoX3JlcGV0aXRpb25fcGx1czBcIjozNixcImhhc2hTZWdtZW50XCI6MzcsXCJJRFwiOjM4LFwiRVFVQUxTXCI6MzksXCJEQVRBXCI6NDAsXCJwYXRoU2VnbWVudHNcIjo0MSxcIlNFUFwiOjQyLFwiJGFjY2VwdFwiOjAsXCIkZW5kXCI6MX0sXG50ZXJtaW5hbHNfOiB7MjpcImVycm9yXCIsNTpcIkVPRlwiLDE0OlwiQ09OVEVOVFwiLDE1OlwiQ09NTUVOVFwiLDE2OlwiT1BFTl9CTE9DS1wiLDE4OlwiQ0xPU0VcIiwxOTpcIk9QRU5fSU5WRVJTRVwiLDIwOlwiT1BFTl9FTkRCTE9DS1wiLDIyOlwiT1BFTlwiLDIzOlwiT1BFTl9VTkVTQ0FQRURcIiwyNDpcIkNMT1NFX1VORVNDQVBFRFwiLDI1OlwiT1BFTl9QQVJUSUFMXCIsMzI6XCJTVFJJTkdcIiwzMzpcIklOVEVHRVJcIiwzNDpcIkJPT0xFQU5cIiwzODpcIklEXCIsMzk6XCJFUVVBTFNcIiw0MDpcIkRBVEFcIiw0MjpcIlNFUFwifSxcbnByb2R1Y3Rpb25zXzogWzAsWzMsMl0sWzMsMV0sWzYsMl0sWzYsM10sWzYsMl0sWzYsMV0sWzYsMV0sWzYsMF0sWzQsMV0sWzQsMl0sWzgsM10sWzgsM10sWzgsMV0sWzgsMV0sWzgsMV0sWzgsMV0sWzExLDNdLFs5LDNdLFsxMCwzXSxbMTIsM10sWzEyLDNdLFsxMyw0XSxbNywyXSxbMTcsM10sWzE3LDFdLFszMSwxXSxbMzEsMV0sWzMxLDFdLFszMSwxXSxbMzEsMV0sWzM1LDFdLFszNywzXSxbMjYsMV0sWzI2LDFdLFsyNiwxXSxbMzAsMl0sWzIxLDFdLFs0MSwzXSxbNDEsMV0sWzI3LDBdLFsyNywxXSxbMjgsMF0sWzI4LDJdLFsyOSwwXSxbMjksMV0sWzM2LDFdLFszNiwyXV0sXG5wZXJmb3JtQWN0aW9uOiBmdW5jdGlvbiBhbm9ueW1vdXMoeXl0ZXh0LHl5bGVuZyx5eWxpbmVubyx5eSx5eXN0YXRlLCQkLF8kKSB7XG5cbnZhciAkMCA9ICQkLmxlbmd0aCAtIDE7XG5zd2l0Y2ggKHl5c3RhdGUpIHtcbmNhc2UgMTogcmV0dXJuIG5ldyB5eS5Qcm9ncmFtTm9kZSgkJFskMC0xXSk7IFxuYnJlYWs7XG5jYXNlIDI6IHJldHVybiBuZXcgeXkuUHJvZ3JhbU5vZGUoW10pOyBcbmJyZWFrO1xuY2FzZSAzOnRoaXMuJCA9IG5ldyB5eS5Qcm9ncmFtTm9kZShbXSwgJCRbJDAtMV0sICQkWyQwXSk7XG5icmVhaztcbmNhc2UgNDp0aGlzLiQgPSBuZXcgeXkuUHJvZ3JhbU5vZGUoJCRbJDAtMl0sICQkWyQwLTFdLCAkJFskMF0pO1xuYnJlYWs7XG5jYXNlIDU6dGhpcy4kID0gbmV3IHl5LlByb2dyYW1Ob2RlKCQkWyQwLTFdLCAkJFskMF0sIFtdKTtcbmJyZWFrO1xuY2FzZSA2OnRoaXMuJCA9IG5ldyB5eS5Qcm9ncmFtTm9kZSgkJFskMF0pO1xuYnJlYWs7XG5jYXNlIDc6dGhpcy4kID0gbmV3IHl5LlByb2dyYW1Ob2RlKFtdKTtcbmJyZWFrO1xuY2FzZSA4OnRoaXMuJCA9IG5ldyB5eS5Qcm9ncmFtTm9kZShbXSk7XG5icmVhaztcbmNhc2UgOTp0aGlzLiQgPSBbJCRbJDBdXTtcbmJyZWFrO1xuY2FzZSAxMDogJCRbJDAtMV0ucHVzaCgkJFskMF0pOyB0aGlzLiQgPSAkJFskMC0xXTsgXG5icmVhaztcbmNhc2UgMTE6dGhpcy4kID0gbmV3IHl5LkJsb2NrTm9kZSgkJFskMC0yXSwgJCRbJDAtMV0uaW52ZXJzZSwgJCRbJDAtMV0sICQkWyQwXSk7XG5icmVhaztcbmNhc2UgMTI6dGhpcy4kID0gbmV3IHl5LkJsb2NrTm9kZSgkJFskMC0yXSwgJCRbJDAtMV0sICQkWyQwLTFdLmludmVyc2UsICQkWyQwXSk7XG5icmVhaztcbmNhc2UgMTM6dGhpcy4kID0gJCRbJDBdO1xuYnJlYWs7XG5jYXNlIDE0OnRoaXMuJCA9ICQkWyQwXTtcbmJyZWFrO1xuY2FzZSAxNTp0aGlzLiQgPSBuZXcgeXkuQ29udGVudE5vZGUoJCRbJDBdKTtcbmJyZWFrO1xuY2FzZSAxNjp0aGlzLiQgPSBuZXcgeXkuQ29tbWVudE5vZGUoJCRbJDBdKTtcbmJyZWFrO1xuY2FzZSAxNzp0aGlzLiQgPSBuZXcgeXkuTXVzdGFjaGVOb2RlKCQkWyQwLTFdWzBdLCAkJFskMC0xXVsxXSwgJCRbJDAtMl0sIHN0cmlwRmxhZ3MoJCRbJDAtMl0sICQkWyQwXSkpO1xuYnJlYWs7XG5jYXNlIDE4OnRoaXMuJCA9IG5ldyB5eS5NdXN0YWNoZU5vZGUoJCRbJDAtMV1bMF0sICQkWyQwLTFdWzFdLCAkJFskMC0yXSwgc3RyaXBGbGFncygkJFskMC0yXSwgJCRbJDBdKSk7XG5icmVhaztcbmNhc2UgMTk6dGhpcy4kID0ge3BhdGg6ICQkWyQwLTFdLCBzdHJpcDogc3RyaXBGbGFncygkJFskMC0yXSwgJCRbJDBdKX07XG5icmVhaztcbmNhc2UgMjA6dGhpcy4kID0gbmV3IHl5Lk11c3RhY2hlTm9kZSgkJFskMC0xXVswXSwgJCRbJDAtMV1bMV0sICQkWyQwLTJdLCBzdHJpcEZsYWdzKCQkWyQwLTJdLCAkJFskMF0pKTtcbmJyZWFrO1xuY2FzZSAyMTp0aGlzLiQgPSBuZXcgeXkuTXVzdGFjaGVOb2RlKCQkWyQwLTFdWzBdLCAkJFskMC0xXVsxXSwgJCRbJDAtMl0sIHN0cmlwRmxhZ3MoJCRbJDAtMl0sICQkWyQwXSkpO1xuYnJlYWs7XG5jYXNlIDIyOnRoaXMuJCA9IG5ldyB5eS5QYXJ0aWFsTm9kZSgkJFskMC0yXSwgJCRbJDAtMV0sIHN0cmlwRmxhZ3MoJCRbJDAtM10sICQkWyQwXSkpO1xuYnJlYWs7XG5jYXNlIDIzOnRoaXMuJCA9IHN0cmlwRmxhZ3MoJCRbJDAtMV0sICQkWyQwXSk7XG5icmVhaztcbmNhc2UgMjQ6dGhpcy4kID0gW1skJFskMC0yXV0uY29uY2F0KCQkWyQwLTFdKSwgJCRbJDBdXTtcbmJyZWFrO1xuY2FzZSAyNTp0aGlzLiQgPSBbWyQkWyQwXV0sIG51bGxdO1xuYnJlYWs7XG5jYXNlIDI2OnRoaXMuJCA9ICQkWyQwXTtcbmJyZWFrO1xuY2FzZSAyNzp0aGlzLiQgPSBuZXcgeXkuU3RyaW5nTm9kZSgkJFskMF0pO1xuYnJlYWs7XG5jYXNlIDI4OnRoaXMuJCA9IG5ldyB5eS5JbnRlZ2VyTm9kZSgkJFskMF0pO1xuYnJlYWs7XG5jYXNlIDI5OnRoaXMuJCA9IG5ldyB5eS5Cb29sZWFuTm9kZSgkJFskMF0pO1xuYnJlYWs7XG5jYXNlIDMwOnRoaXMuJCA9ICQkWyQwXTtcbmJyZWFrO1xuY2FzZSAzMTp0aGlzLiQgPSBuZXcgeXkuSGFzaE5vZGUoJCRbJDBdKTtcbmJyZWFrO1xuY2FzZSAzMjp0aGlzLiQgPSBbJCRbJDAtMl0sICQkWyQwXV07XG5icmVhaztcbmNhc2UgMzM6dGhpcy4kID0gbmV3IHl5LlBhcnRpYWxOYW1lTm9kZSgkJFskMF0pO1xuYnJlYWs7XG5jYXNlIDM0OnRoaXMuJCA9IG5ldyB5eS5QYXJ0aWFsTmFtZU5vZGUobmV3IHl5LlN0cmluZ05vZGUoJCRbJDBdKSk7XG5icmVhaztcbmNhc2UgMzU6dGhpcy4kID0gbmV3IHl5LlBhcnRpYWxOYW1lTm9kZShuZXcgeXkuSW50ZWdlck5vZGUoJCRbJDBdKSk7XG5icmVhaztcbmNhc2UgMzY6dGhpcy4kID0gbmV3IHl5LkRhdGFOb2RlKCQkWyQwXSk7XG5icmVhaztcbmNhc2UgMzc6dGhpcy4kID0gbmV3IHl5LklkTm9kZSgkJFskMF0pO1xuYnJlYWs7XG5jYXNlIDM4OiAkJFskMC0yXS5wdXNoKHtwYXJ0OiAkJFskMF0sIHNlcGFyYXRvcjogJCRbJDAtMV19KTsgdGhpcy4kID0gJCRbJDAtMl07IFxuYnJlYWs7XG5jYXNlIDM5OnRoaXMuJCA9IFt7cGFydDogJCRbJDBdfV07XG5icmVhaztcbmNhc2UgNDI6dGhpcy4kID0gW107XG5icmVhaztcbmNhc2UgNDM6JCRbJDAtMV0ucHVzaCgkJFskMF0pO1xuYnJlYWs7XG5jYXNlIDQ2OnRoaXMuJCA9IFskJFskMF1dO1xuYnJlYWs7XG5jYXNlIDQ3OiQkWyQwLTFdLnB1c2goJCRbJDBdKTtcbmJyZWFrO1xufVxufSxcbnRhYmxlOiBbezM6MSw0OjIsNTpbMSwzXSw4OjQsOTo1LDExOjYsMTI6NywxMzo4LDE0OlsxLDldLDE1OlsxLDEwXSwxNjpbMSwxMl0sMTk6WzEsMTFdLDIyOlsxLDEzXSwyMzpbMSwxNF0sMjU6WzEsMTVdfSx7MTpbM119LHs1OlsxLDE2XSw4OjE3LDk6NSwxMTo2LDEyOjcsMTM6OCwxNDpbMSw5XSwxNTpbMSwxMF0sMTY6WzEsMTJdLDE5OlsxLDExXSwyMjpbMSwxM10sMjM6WzEsMTRdLDI1OlsxLDE1XX0sezE6WzIsMl19LHs1OlsyLDldLDE0OlsyLDldLDE1OlsyLDldLDE2OlsyLDldLDE5OlsyLDldLDIwOlsyLDldLDIyOlsyLDldLDIzOlsyLDldLDI1OlsyLDldfSx7NDoyMCw2OjE4LDc6MTksODo0LDk6NSwxMTo2LDEyOjcsMTM6OCwxNDpbMSw5XSwxNTpbMSwxMF0sMTY6WzEsMTJdLDE5OlsxLDIxXSwyMDpbMiw4XSwyMjpbMSwxM10sMjM6WzEsMTRdLDI1OlsxLDE1XX0sezQ6MjAsNjoyMiw3OjE5LDg6NCw5OjUsMTE6NiwxMjo3LDEzOjgsMTQ6WzEsOV0sMTU6WzEsMTBdLDE2OlsxLDEyXSwxOTpbMSwyMV0sMjA6WzIsOF0sMjI6WzEsMTNdLDIzOlsxLDE0XSwyNTpbMSwxNV19LHs1OlsyLDEzXSwxNDpbMiwxM10sMTU6WzIsMTNdLDE2OlsyLDEzXSwxOTpbMiwxM10sMjA6WzIsMTNdLDIyOlsyLDEzXSwyMzpbMiwxM10sMjU6WzIsMTNdfSx7NTpbMiwxNF0sMTQ6WzIsMTRdLDE1OlsyLDE0XSwxNjpbMiwxNF0sMTk6WzIsMTRdLDIwOlsyLDE0XSwyMjpbMiwxNF0sMjM6WzIsMTRdLDI1OlsyLDE0XX0sezU6WzIsMTVdLDE0OlsyLDE1XSwxNTpbMiwxNV0sMTY6WzIsMTVdLDE5OlsyLDE1XSwyMDpbMiwxNV0sMjI6WzIsMTVdLDIzOlsyLDE1XSwyNTpbMiwxNV19LHs1OlsyLDE2XSwxNDpbMiwxNl0sMTU6WzIsMTZdLDE2OlsyLDE2XSwxOTpbMiwxNl0sMjA6WzIsMTZdLDIyOlsyLDE2XSwyMzpbMiwxNl0sMjU6WzIsMTZdfSx7MTc6MjMsMjE6MjQsMzA6MjUsMzg6WzEsMjhdLDQwOlsxLDI3XSw0MToyNn0sezE3OjI5LDIxOjI0LDMwOjI1LDM4OlsxLDI4XSw0MDpbMSwyN10sNDE6MjZ9LHsxNzozMCwyMToyNCwzMDoyNSwzODpbMSwyOF0sNDA6WzEsMjddLDQxOjI2fSx7MTc6MzEsMjE6MjQsMzA6MjUsMzg6WzEsMjhdLDQwOlsxLDI3XSw0MToyNn0sezIxOjMzLDI2OjMyLDMyOlsxLDM0XSwzMzpbMSwzNV0sMzg6WzEsMjhdLDQxOjI2fSx7MTpbMiwxXX0sezU6WzIsMTBdLDE0OlsyLDEwXSwxNTpbMiwxMF0sMTY6WzIsMTBdLDE5OlsyLDEwXSwyMDpbMiwxMF0sMjI6WzIsMTBdLDIzOlsyLDEwXSwyNTpbMiwxMF19LHsxMDozNiwyMDpbMSwzN119LHs0OjM4LDg6NCw5OjUsMTE6NiwxMjo3LDEzOjgsMTQ6WzEsOV0sMTU6WzEsMTBdLDE2OlsxLDEyXSwxOTpbMSwxMV0sMjA6WzIsN10sMjI6WzEsMTNdLDIzOlsxLDE0XSwyNTpbMSwxNV19LHs3OjM5LDg6MTcsOTo1LDExOjYsMTI6NywxMzo4LDE0OlsxLDldLDE1OlsxLDEwXSwxNjpbMSwxMl0sMTk6WzEsMjFdLDIwOlsyLDZdLDIyOlsxLDEzXSwyMzpbMSwxNF0sMjU6WzEsMTVdfSx7MTc6MjMsMTg6WzEsNDBdLDIxOjI0LDMwOjI1LDM4OlsxLDI4XSw0MDpbMSwyN10sNDE6MjZ9LHsxMDo0MSwyMDpbMSwzN119LHsxODpbMSw0Ml19LHsxODpbMiw0Ml0sMjQ6WzIsNDJdLDI4OjQzLDMyOlsyLDQyXSwzMzpbMiw0Ml0sMzQ6WzIsNDJdLDM4OlsyLDQyXSw0MDpbMiw0Ml19LHsxODpbMiwyNV0sMjQ6WzIsMjVdfSx7MTg6WzIsMzddLDI0OlsyLDM3XSwzMjpbMiwzN10sMzM6WzIsMzddLDM0OlsyLDM3XSwzODpbMiwzN10sNDA6WzIsMzddLDQyOlsxLDQ0XX0sezIxOjQ1LDM4OlsxLDI4XSw0MToyNn0sezE4OlsyLDM5XSwyNDpbMiwzOV0sMzI6WzIsMzldLDMzOlsyLDM5XSwzNDpbMiwzOV0sMzg6WzIsMzldLDQwOlsyLDM5XSw0MjpbMiwzOV19LHsxODpbMSw0Nl19LHsxODpbMSw0N119LHsyNDpbMSw0OF19LHsxODpbMiw0MF0sMjE6NTAsMjc6NDksMzg6WzEsMjhdLDQxOjI2fSx7MTg6WzIsMzNdLDM4OlsyLDMzXX0sezE4OlsyLDM0XSwzODpbMiwzNF19LHsxODpbMiwzNV0sMzg6WzIsMzVdfSx7NTpbMiwxMV0sMTQ6WzIsMTFdLDE1OlsyLDExXSwxNjpbMiwxMV0sMTk6WzIsMTFdLDIwOlsyLDExXSwyMjpbMiwxMV0sMjM6WzIsMTFdLDI1OlsyLDExXX0sezIxOjUxLDM4OlsxLDI4XSw0MToyNn0sezg6MTcsOTo1LDExOjYsMTI6NywxMzo4LDE0OlsxLDldLDE1OlsxLDEwXSwxNjpbMSwxMl0sMTk6WzEsMTFdLDIwOlsyLDNdLDIyOlsxLDEzXSwyMzpbMSwxNF0sMjU6WzEsMTVdfSx7NDo1Miw4OjQsOTo1LDExOjYsMTI6NywxMzo4LDE0OlsxLDldLDE1OlsxLDEwXSwxNjpbMSwxMl0sMTk6WzEsMTFdLDIwOlsyLDVdLDIyOlsxLDEzXSwyMzpbMSwxNF0sMjU6WzEsMTVdfSx7MTQ6WzIsMjNdLDE1OlsyLDIzXSwxNjpbMiwyM10sMTk6WzIsMjNdLDIwOlsyLDIzXSwyMjpbMiwyM10sMjM6WzIsMjNdLDI1OlsyLDIzXX0sezU6WzIsMTJdLDE0OlsyLDEyXSwxNTpbMiwxMl0sMTY6WzIsMTJdLDE5OlsyLDEyXSwyMDpbMiwxMl0sMjI6WzIsMTJdLDIzOlsyLDEyXSwyNTpbMiwxMl19LHsxNDpbMiwxOF0sMTU6WzIsMThdLDE2OlsyLDE4XSwxOTpbMiwxOF0sMjA6WzIsMThdLDIyOlsyLDE4XSwyMzpbMiwxOF0sMjU6WzIsMThdfSx7MTg6WzIsNDRdLDIxOjU2LDI0OlsyLDQ0XSwyOTo1MywzMDo2MCwzMTo1NCwzMjpbMSw1N10sMzM6WzEsNThdLDM0OlsxLDU5XSwzNTo1NSwzNjo2MSwzNzo2MiwzODpbMSw2M10sNDA6WzEsMjddLDQxOjI2fSx7Mzg6WzEsNjRdfSx7MTg6WzIsMzZdLDI0OlsyLDM2XSwzMjpbMiwzNl0sMzM6WzIsMzZdLDM0OlsyLDM2XSwzODpbMiwzNl0sNDA6WzIsMzZdfSx7MTQ6WzIsMTddLDE1OlsyLDE3XSwxNjpbMiwxN10sMTk6WzIsMTddLDIwOlsyLDE3XSwyMjpbMiwxN10sMjM6WzIsMTddLDI1OlsyLDE3XX0sezU6WzIsMjBdLDE0OlsyLDIwXSwxNTpbMiwyMF0sMTY6WzIsMjBdLDE5OlsyLDIwXSwyMDpbMiwyMF0sMjI6WzIsMjBdLDIzOlsyLDIwXSwyNTpbMiwyMF19LHs1OlsyLDIxXSwxNDpbMiwyMV0sMTU6WzIsMjFdLDE2OlsyLDIxXSwxOTpbMiwyMV0sMjA6WzIsMjFdLDIyOlsyLDIxXSwyMzpbMiwyMV0sMjU6WzIsMjFdfSx7MTg6WzEsNjVdfSx7MTg6WzIsNDFdfSx7MTg6WzEsNjZdfSx7ODoxNyw5OjUsMTE6NiwxMjo3LDEzOjgsMTQ6WzEsOV0sMTU6WzEsMTBdLDE2OlsxLDEyXSwxOTpbMSwxMV0sMjA6WzIsNF0sMjI6WzEsMTNdLDIzOlsxLDE0XSwyNTpbMSwxNV19LHsxODpbMiwyNF0sMjQ6WzIsMjRdfSx7MTg6WzIsNDNdLDI0OlsyLDQzXSwzMjpbMiw0M10sMzM6WzIsNDNdLDM0OlsyLDQzXSwzODpbMiw0M10sNDA6WzIsNDNdfSx7MTg6WzIsNDVdLDI0OlsyLDQ1XX0sezE4OlsyLDI2XSwyNDpbMiwyNl0sMzI6WzIsMjZdLDMzOlsyLDI2XSwzNDpbMiwyNl0sMzg6WzIsMjZdLDQwOlsyLDI2XX0sezE4OlsyLDI3XSwyNDpbMiwyN10sMzI6WzIsMjddLDMzOlsyLDI3XSwzNDpbMiwyN10sMzg6WzIsMjddLDQwOlsyLDI3XX0sezE4OlsyLDI4XSwyNDpbMiwyOF0sMzI6WzIsMjhdLDMzOlsyLDI4XSwzNDpbMiwyOF0sMzg6WzIsMjhdLDQwOlsyLDI4XX0sezE4OlsyLDI5XSwyNDpbMiwyOV0sMzI6WzIsMjldLDMzOlsyLDI5XSwzNDpbMiwyOV0sMzg6WzIsMjldLDQwOlsyLDI5XX0sezE4OlsyLDMwXSwyNDpbMiwzMF0sMzI6WzIsMzBdLDMzOlsyLDMwXSwzNDpbMiwzMF0sMzg6WzIsMzBdLDQwOlsyLDMwXX0sezE4OlsyLDMxXSwyNDpbMiwzMV0sMzc6NjcsMzg6WzEsNjhdfSx7MTg6WzIsNDZdLDI0OlsyLDQ2XSwzODpbMiw0Nl19LHsxODpbMiwzOV0sMjQ6WzIsMzldLDMyOlsyLDM5XSwzMzpbMiwzOV0sMzQ6WzIsMzldLDM4OlsyLDM5XSwzOTpbMSw2OV0sNDA6WzIsMzldLDQyOlsyLDM5XX0sezE4OlsyLDM4XSwyNDpbMiwzOF0sMzI6WzIsMzhdLDMzOlsyLDM4XSwzNDpbMiwzOF0sMzg6WzIsMzhdLDQwOlsyLDM4XSw0MjpbMiwzOF19LHs1OlsyLDIyXSwxNDpbMiwyMl0sMTU6WzIsMjJdLDE2OlsyLDIyXSwxOTpbMiwyMl0sMjA6WzIsMjJdLDIyOlsyLDIyXSwyMzpbMiwyMl0sMjU6WzIsMjJdfSx7NTpbMiwxOV0sMTQ6WzIsMTldLDE1OlsyLDE5XSwxNjpbMiwxOV0sMTk6WzIsMTldLDIwOlsyLDE5XSwyMjpbMiwxOV0sMjM6WzIsMTldLDI1OlsyLDE5XX0sezE4OlsyLDQ3XSwyNDpbMiw0N10sMzg6WzIsNDddfSx7Mzk6WzEsNjldfSx7MjE6NTYsMzA6NjAsMzE6NzAsMzI6WzEsNTddLDMzOlsxLDU4XSwzNDpbMSw1OV0sMzg6WzEsMjhdLDQwOlsxLDI3XSw0MToyNn0sezE4OlsyLDMyXSwyNDpbMiwzMl0sMzg6WzIsMzJdfV0sXG5kZWZhdWx0QWN0aW9uczogezM6WzIsMl0sMTY6WzIsMV0sNTA6WzIsNDFdfSxcbnBhcnNlRXJyb3I6IGZ1bmN0aW9uIHBhcnNlRXJyb3Ioc3RyLCBoYXNoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKHN0cik7XG59LFxucGFyc2U6IGZ1bmN0aW9uIHBhcnNlKGlucHV0KSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzLCBzdGFjayA9IFswXSwgdnN0YWNrID0gW251bGxdLCBsc3RhY2sgPSBbXSwgdGFibGUgPSB0aGlzLnRhYmxlLCB5eXRleHQgPSBcIlwiLCB5eWxpbmVubyA9IDAsIHl5bGVuZyA9IDAsIHJlY292ZXJpbmcgPSAwLCBURVJST1IgPSAyLCBFT0YgPSAxO1xuICAgIHRoaXMubGV4ZXIuc2V0SW5wdXQoaW5wdXQpO1xuICAgIHRoaXMubGV4ZXIueXkgPSB0aGlzLnl5O1xuICAgIHRoaXMueXkubGV4ZXIgPSB0aGlzLmxleGVyO1xuICAgIHRoaXMueXkucGFyc2VyID0gdGhpcztcbiAgICBpZiAodHlwZW9mIHRoaXMubGV4ZXIueXlsbG9jID09IFwidW5kZWZpbmVkXCIpXG4gICAgICAgIHRoaXMubGV4ZXIueXlsbG9jID0ge307XG4gICAgdmFyIHl5bG9jID0gdGhpcy5sZXhlci55eWxsb2M7XG4gICAgbHN0YWNrLnB1c2goeXlsb2MpO1xuICAgIHZhciByYW5nZXMgPSB0aGlzLmxleGVyLm9wdGlvbnMgJiYgdGhpcy5sZXhlci5vcHRpb25zLnJhbmdlcztcbiAgICBpZiAodHlwZW9mIHRoaXMueXkucGFyc2VFcnJvciA9PT0gXCJmdW5jdGlvblwiKVxuICAgICAgICB0aGlzLnBhcnNlRXJyb3IgPSB0aGlzLnl5LnBhcnNlRXJyb3I7XG4gICAgZnVuY3Rpb24gcG9wU3RhY2sobikge1xuICAgICAgICBzdGFjay5sZW5ndGggPSBzdGFjay5sZW5ndGggLSAyICogbjtcbiAgICAgICAgdnN0YWNrLmxlbmd0aCA9IHZzdGFjay5sZW5ndGggLSBuO1xuICAgICAgICBsc3RhY2subGVuZ3RoID0gbHN0YWNrLmxlbmd0aCAtIG47XG4gICAgfVxuICAgIGZ1bmN0aW9uIGxleCgpIHtcbiAgICAgICAgdmFyIHRva2VuO1xuICAgICAgICB0b2tlbiA9IHNlbGYubGV4ZXIubGV4KCkgfHwgMTtcbiAgICAgICAgaWYgKHR5cGVvZiB0b2tlbiAhPT0gXCJudW1iZXJcIikge1xuICAgICAgICAgICAgdG9rZW4gPSBzZWxmLnN5bWJvbHNfW3Rva2VuXSB8fCB0b2tlbjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdG9rZW47XG4gICAgfVxuICAgIHZhciBzeW1ib2wsIHByZUVycm9yU3ltYm9sLCBzdGF0ZSwgYWN0aW9uLCBhLCByLCB5eXZhbCA9IHt9LCBwLCBsZW4sIG5ld1N0YXRlLCBleHBlY3RlZDtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICBzdGF0ZSA9IHN0YWNrW3N0YWNrLmxlbmd0aCAtIDFdO1xuICAgICAgICBpZiAodGhpcy5kZWZhdWx0QWN0aW9uc1tzdGF0ZV0pIHtcbiAgICAgICAgICAgIGFjdGlvbiA9IHRoaXMuZGVmYXVsdEFjdGlvbnNbc3RhdGVdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHN5bWJvbCA9PT0gbnVsbCB8fCB0eXBlb2Ygc3ltYm9sID09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgICAgICBzeW1ib2wgPSBsZXgoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGFjdGlvbiA9IHRhYmxlW3N0YXRlXSAmJiB0YWJsZVtzdGF0ZV1bc3ltYm9sXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIGFjdGlvbiA9PT0gXCJ1bmRlZmluZWRcIiB8fCAhYWN0aW9uLmxlbmd0aCB8fCAhYWN0aW9uWzBdKSB7XG4gICAgICAgICAgICB2YXIgZXJyU3RyID0gXCJcIjtcbiAgICAgICAgICAgIGlmICghcmVjb3ZlcmluZykge1xuICAgICAgICAgICAgICAgIGV4cGVjdGVkID0gW107XG4gICAgICAgICAgICAgICAgZm9yIChwIGluIHRhYmxlW3N0YXRlXSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudGVybWluYWxzX1twXSAmJiBwID4gMikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0ZWQucHVzaChcIidcIiArIHRoaXMudGVybWluYWxzX1twXSArIFwiJ1wiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmxleGVyLnNob3dQb3NpdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBlcnJTdHIgPSBcIlBhcnNlIGVycm9yIG9uIGxpbmUgXCIgKyAoeXlsaW5lbm8gKyAxKSArIFwiOlxcblwiICsgdGhpcy5sZXhlci5zaG93UG9zaXRpb24oKSArIFwiXFxuRXhwZWN0aW5nIFwiICsgZXhwZWN0ZWQuam9pbihcIiwgXCIpICsgXCIsIGdvdCAnXCIgKyAodGhpcy50ZXJtaW5hbHNfW3N5bWJvbF0gfHwgc3ltYm9sKSArIFwiJ1wiO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGVyclN0ciA9IFwiUGFyc2UgZXJyb3Igb24gbGluZSBcIiArICh5eWxpbmVubyArIDEpICsgXCI6IFVuZXhwZWN0ZWQgXCIgKyAoc3ltYm9sID09IDE/XCJlbmQgb2YgaW5wdXRcIjpcIidcIiArICh0aGlzLnRlcm1pbmFsc19bc3ltYm9sXSB8fCBzeW1ib2wpICsgXCInXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLnBhcnNlRXJyb3IoZXJyU3RyLCB7dGV4dDogdGhpcy5sZXhlci5tYXRjaCwgdG9rZW46IHRoaXMudGVybWluYWxzX1tzeW1ib2xdIHx8IHN5bWJvbCwgbGluZTogdGhpcy5sZXhlci55eWxpbmVubywgbG9jOiB5eWxvYywgZXhwZWN0ZWQ6IGV4cGVjdGVkfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGFjdGlvblswXSBpbnN0YW5jZW9mIEFycmF5ICYmIGFjdGlvbi5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJQYXJzZSBFcnJvcjogbXVsdGlwbGUgYWN0aW9ucyBwb3NzaWJsZSBhdCBzdGF0ZTogXCIgKyBzdGF0ZSArIFwiLCB0b2tlbjogXCIgKyBzeW1ib2wpO1xuICAgICAgICB9XG4gICAgICAgIHN3aXRjaCAoYWN0aW9uWzBdKSB7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgIHN0YWNrLnB1c2goc3ltYm9sKTtcbiAgICAgICAgICAgIHZzdGFjay5wdXNoKHRoaXMubGV4ZXIueXl0ZXh0KTtcbiAgICAgICAgICAgIGxzdGFjay5wdXNoKHRoaXMubGV4ZXIueXlsbG9jKTtcbiAgICAgICAgICAgIHN0YWNrLnB1c2goYWN0aW9uWzFdKTtcbiAgICAgICAgICAgIHN5bWJvbCA9IG51bGw7XG4gICAgICAgICAgICBpZiAoIXByZUVycm9yU3ltYm9sKSB7XG4gICAgICAgICAgICAgICAgeXlsZW5nID0gdGhpcy5sZXhlci55eWxlbmc7XG4gICAgICAgICAgICAgICAgeXl0ZXh0ID0gdGhpcy5sZXhlci55eXRleHQ7XG4gICAgICAgICAgICAgICAgeXlsaW5lbm8gPSB0aGlzLmxleGVyLnl5bGluZW5vO1xuICAgICAgICAgICAgICAgIHl5bG9jID0gdGhpcy5sZXhlci55eWxsb2M7XG4gICAgICAgICAgICAgICAgaWYgKHJlY292ZXJpbmcgPiAwKVxuICAgICAgICAgICAgICAgICAgICByZWNvdmVyaW5nLS07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHN5bWJvbCA9IHByZUVycm9yU3ltYm9sO1xuICAgICAgICAgICAgICAgIHByZUVycm9yU3ltYm9sID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICBsZW4gPSB0aGlzLnByb2R1Y3Rpb25zX1thY3Rpb25bMV1dWzFdO1xuICAgICAgICAgICAgeXl2YWwuJCA9IHZzdGFja1t2c3RhY2subGVuZ3RoIC0gbGVuXTtcbiAgICAgICAgICAgIHl5dmFsLl8kID0ge2ZpcnN0X2xpbmU6IGxzdGFja1tsc3RhY2subGVuZ3RoIC0gKGxlbiB8fCAxKV0uZmlyc3RfbGluZSwgbGFzdF9saW5lOiBsc3RhY2tbbHN0YWNrLmxlbmd0aCAtIDFdLmxhc3RfbGluZSwgZmlyc3RfY29sdW1uOiBsc3RhY2tbbHN0YWNrLmxlbmd0aCAtIChsZW4gfHwgMSldLmZpcnN0X2NvbHVtbiwgbGFzdF9jb2x1bW46IGxzdGFja1tsc3RhY2subGVuZ3RoIC0gMV0ubGFzdF9jb2x1bW59O1xuICAgICAgICAgICAgaWYgKHJhbmdlcykge1xuICAgICAgICAgICAgICAgIHl5dmFsLl8kLnJhbmdlID0gW2xzdGFja1tsc3RhY2subGVuZ3RoIC0gKGxlbiB8fCAxKV0ucmFuZ2VbMF0sIGxzdGFja1tsc3RhY2subGVuZ3RoIC0gMV0ucmFuZ2VbMV1dO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgciA9IHRoaXMucGVyZm9ybUFjdGlvbi5jYWxsKHl5dmFsLCB5eXRleHQsIHl5bGVuZywgeXlsaW5lbm8sIHRoaXMueXksIGFjdGlvblsxXSwgdnN0YWNrLCBsc3RhY2spO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiByICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobGVuKSB7XG4gICAgICAgICAgICAgICAgc3RhY2sgPSBzdGFjay5zbGljZSgwLCAtMSAqIGxlbiAqIDIpO1xuICAgICAgICAgICAgICAgIHZzdGFjayA9IHZzdGFjay5zbGljZSgwLCAtMSAqIGxlbik7XG4gICAgICAgICAgICAgICAgbHN0YWNrID0gbHN0YWNrLnNsaWNlKDAsIC0xICogbGVuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN0YWNrLnB1c2godGhpcy5wcm9kdWN0aW9uc19bYWN0aW9uWzFdXVswXSk7XG4gICAgICAgICAgICB2c3RhY2sucHVzaCh5eXZhbC4kKTtcbiAgICAgICAgICAgIGxzdGFjay5wdXNoKHl5dmFsLl8kKTtcbiAgICAgICAgICAgIG5ld1N0YXRlID0gdGFibGVbc3RhY2tbc3RhY2subGVuZ3RoIC0gMl1dW3N0YWNrW3N0YWNrLmxlbmd0aCAtIDFdXTtcbiAgICAgICAgICAgIHN0YWNrLnB1c2gobmV3U3RhdGUpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufVxufTtcblxuXG5mdW5jdGlvbiBzdHJpcEZsYWdzKG9wZW4sIGNsb3NlKSB7XG4gIHJldHVybiB7XG4gICAgbGVmdDogb3Blbi5jaGFyQXQoMikgPT09ICd+JyxcbiAgICByaWdodDogY2xvc2UuY2hhckF0KDApID09PSAnficgfHwgY2xvc2UuY2hhckF0KDEpID09PSAnfidcbiAgfTtcbn1cblxuLyogSmlzb24gZ2VuZXJhdGVkIGxleGVyICovXG52YXIgbGV4ZXIgPSAoZnVuY3Rpb24oKXtcbnZhciBsZXhlciA9ICh7RU9GOjEsXG5wYXJzZUVycm9yOmZ1bmN0aW9uIHBhcnNlRXJyb3Ioc3RyLCBoYXNoKSB7XG4gICAgICAgIGlmICh0aGlzLnl5LnBhcnNlcikge1xuICAgICAgICAgICAgdGhpcy55eS5wYXJzZXIucGFyc2VFcnJvcihzdHIsIGhhc2gpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKHN0cik7XG4gICAgICAgIH1cbiAgICB9LFxuc2V0SW5wdXQ6ZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICAgIHRoaXMuX2lucHV0ID0gaW5wdXQ7XG4gICAgICAgIHRoaXMuX21vcmUgPSB0aGlzLl9sZXNzID0gdGhpcy5kb25lID0gZmFsc2U7XG4gICAgICAgIHRoaXMueXlsaW5lbm8gPSB0aGlzLnl5bGVuZyA9IDA7XG4gICAgICAgIHRoaXMueXl0ZXh0ID0gdGhpcy5tYXRjaGVkID0gdGhpcy5tYXRjaCA9ICcnO1xuICAgICAgICB0aGlzLmNvbmRpdGlvblN0YWNrID0gWydJTklUSUFMJ107XG4gICAgICAgIHRoaXMueXlsbG9jID0ge2ZpcnN0X2xpbmU6MSxmaXJzdF9jb2x1bW46MCxsYXN0X2xpbmU6MSxsYXN0X2NvbHVtbjowfTtcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5yYW5nZXMpIHRoaXMueXlsbG9jLnJhbmdlID0gWzAsMF07XG4gICAgICAgIHRoaXMub2Zmc2V0ID0gMDtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbmlucHV0OmZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGNoID0gdGhpcy5faW5wdXRbMF07XG4gICAgICAgIHRoaXMueXl0ZXh0ICs9IGNoO1xuICAgICAgICB0aGlzLnl5bGVuZysrO1xuICAgICAgICB0aGlzLm9mZnNldCsrO1xuICAgICAgICB0aGlzLm1hdGNoICs9IGNoO1xuICAgICAgICB0aGlzLm1hdGNoZWQgKz0gY2g7XG4gICAgICAgIHZhciBsaW5lcyA9IGNoLm1hdGNoKC8oPzpcXHJcXG4/fFxcbikuKi9nKTtcbiAgICAgICAgaWYgKGxpbmVzKSB7XG4gICAgICAgICAgICB0aGlzLnl5bGluZW5vKys7XG4gICAgICAgICAgICB0aGlzLnl5bGxvYy5sYXN0X2xpbmUrKztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMueXlsbG9jLmxhc3RfY29sdW1uKys7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5yYW5nZXMpIHRoaXMueXlsbG9jLnJhbmdlWzFdKys7XG5cbiAgICAgICAgdGhpcy5faW5wdXQgPSB0aGlzLl9pbnB1dC5zbGljZSgxKTtcbiAgICAgICAgcmV0dXJuIGNoO1xuICAgIH0sXG51bnB1dDpmdW5jdGlvbiAoY2gpIHtcbiAgICAgICAgdmFyIGxlbiA9IGNoLmxlbmd0aDtcbiAgICAgICAgdmFyIGxpbmVzID0gY2guc3BsaXQoLyg/Olxcclxcbj98XFxuKS9nKTtcblxuICAgICAgICB0aGlzLl9pbnB1dCA9IGNoICsgdGhpcy5faW5wdXQ7XG4gICAgICAgIHRoaXMueXl0ZXh0ID0gdGhpcy55eXRleHQuc3Vic3RyKDAsIHRoaXMueXl0ZXh0Lmxlbmd0aC1sZW4tMSk7XG4gICAgICAgIC8vdGhpcy55eWxlbmcgLT0gbGVuO1xuICAgICAgICB0aGlzLm9mZnNldCAtPSBsZW47XG4gICAgICAgIHZhciBvbGRMaW5lcyA9IHRoaXMubWF0Y2guc3BsaXQoLyg/Olxcclxcbj98XFxuKS9nKTtcbiAgICAgICAgdGhpcy5tYXRjaCA9IHRoaXMubWF0Y2guc3Vic3RyKDAsIHRoaXMubWF0Y2gubGVuZ3RoLTEpO1xuICAgICAgICB0aGlzLm1hdGNoZWQgPSB0aGlzLm1hdGNoZWQuc3Vic3RyKDAsIHRoaXMubWF0Y2hlZC5sZW5ndGgtMSk7XG5cbiAgICAgICAgaWYgKGxpbmVzLmxlbmd0aC0xKSB0aGlzLnl5bGluZW5vIC09IGxpbmVzLmxlbmd0aC0xO1xuICAgICAgICB2YXIgciA9IHRoaXMueXlsbG9jLnJhbmdlO1xuXG4gICAgICAgIHRoaXMueXlsbG9jID0ge2ZpcnN0X2xpbmU6IHRoaXMueXlsbG9jLmZpcnN0X2xpbmUsXG4gICAgICAgICAgbGFzdF9saW5lOiB0aGlzLnl5bGluZW5vKzEsXG4gICAgICAgICAgZmlyc3RfY29sdW1uOiB0aGlzLnl5bGxvYy5maXJzdF9jb2x1bW4sXG4gICAgICAgICAgbGFzdF9jb2x1bW46IGxpbmVzID9cbiAgICAgICAgICAgICAgKGxpbmVzLmxlbmd0aCA9PT0gb2xkTGluZXMubGVuZ3RoID8gdGhpcy55eWxsb2MuZmlyc3RfY29sdW1uIDogMCkgKyBvbGRMaW5lc1tvbGRMaW5lcy5sZW5ndGggLSBsaW5lcy5sZW5ndGhdLmxlbmd0aCAtIGxpbmVzWzBdLmxlbmd0aDpcbiAgICAgICAgICAgICAgdGhpcy55eWxsb2MuZmlyc3RfY29sdW1uIC0gbGVuXG4gICAgICAgICAgfTtcblxuICAgICAgICBpZiAodGhpcy5vcHRpb25zLnJhbmdlcykge1xuICAgICAgICAgICAgdGhpcy55eWxsb2MucmFuZ2UgPSBbclswXSwgclswXSArIHRoaXMueXlsZW5nIC0gbGVuXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxubW9yZTpmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX21vcmUgPSB0cnVlO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxubGVzczpmdW5jdGlvbiAobikge1xuICAgICAgICB0aGlzLnVucHV0KHRoaXMubWF0Y2guc2xpY2UobikpO1xuICAgIH0sXG5wYXN0SW5wdXQ6ZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgcGFzdCA9IHRoaXMubWF0Y2hlZC5zdWJzdHIoMCwgdGhpcy5tYXRjaGVkLmxlbmd0aCAtIHRoaXMubWF0Y2gubGVuZ3RoKTtcbiAgICAgICAgcmV0dXJuIChwYXN0Lmxlbmd0aCA+IDIwID8gJy4uLic6JycpICsgcGFzdC5zdWJzdHIoLTIwKS5yZXBsYWNlKC9cXG4vZywgXCJcIik7XG4gICAgfSxcbnVwY29taW5nSW5wdXQ6ZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgbmV4dCA9IHRoaXMubWF0Y2g7XG4gICAgICAgIGlmIChuZXh0Lmxlbmd0aCA8IDIwKSB7XG4gICAgICAgICAgICBuZXh0ICs9IHRoaXMuX2lucHV0LnN1YnN0cigwLCAyMC1uZXh0Lmxlbmd0aCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIChuZXh0LnN1YnN0cigwLDIwKSsobmV4dC5sZW5ndGggPiAyMCA/ICcuLi4nOicnKSkucmVwbGFjZSgvXFxuL2csIFwiXCIpO1xuICAgIH0sXG5zaG93UG9zaXRpb246ZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgcHJlID0gdGhpcy5wYXN0SW5wdXQoKTtcbiAgICAgICAgdmFyIGMgPSBuZXcgQXJyYXkocHJlLmxlbmd0aCArIDEpLmpvaW4oXCItXCIpO1xuICAgICAgICByZXR1cm4gcHJlICsgdGhpcy51cGNvbWluZ0lucHV0KCkgKyBcIlxcblwiICsgYytcIl5cIjtcbiAgICB9LFxubmV4dDpmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLmRvbmUpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLkVPRjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMuX2lucHV0KSB0aGlzLmRvbmUgPSB0cnVlO1xuXG4gICAgICAgIHZhciB0b2tlbixcbiAgICAgICAgICAgIG1hdGNoLFxuICAgICAgICAgICAgdGVtcE1hdGNoLFxuICAgICAgICAgICAgaW5kZXgsXG4gICAgICAgICAgICBjb2wsXG4gICAgICAgICAgICBsaW5lcztcbiAgICAgICAgaWYgKCF0aGlzLl9tb3JlKSB7XG4gICAgICAgICAgICB0aGlzLnl5dGV4dCA9ICcnO1xuICAgICAgICAgICAgdGhpcy5tYXRjaCA9ICcnO1xuICAgICAgICB9XG4gICAgICAgIHZhciBydWxlcyA9IHRoaXMuX2N1cnJlbnRSdWxlcygpO1xuICAgICAgICBmb3IgKHZhciBpPTA7aSA8IHJ1bGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB0ZW1wTWF0Y2ggPSB0aGlzLl9pbnB1dC5tYXRjaCh0aGlzLnJ1bGVzW3J1bGVzW2ldXSk7XG4gICAgICAgICAgICBpZiAodGVtcE1hdGNoICYmICghbWF0Y2ggfHwgdGVtcE1hdGNoWzBdLmxlbmd0aCA+IG1hdGNoWzBdLmxlbmd0aCkpIHtcbiAgICAgICAgICAgICAgICBtYXRjaCA9IHRlbXBNYXRjaDtcbiAgICAgICAgICAgICAgICBpbmRleCA9IGk7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLm9wdGlvbnMuZmxleCkgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgICAgICBsaW5lcyA9IG1hdGNoWzBdLm1hdGNoKC8oPzpcXHJcXG4/fFxcbikuKi9nKTtcbiAgICAgICAgICAgIGlmIChsaW5lcykgdGhpcy55eWxpbmVubyArPSBsaW5lcy5sZW5ndGg7XG4gICAgICAgICAgICB0aGlzLnl5bGxvYyA9IHtmaXJzdF9saW5lOiB0aGlzLnl5bGxvYy5sYXN0X2xpbmUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBsYXN0X2xpbmU6IHRoaXMueXlsaW5lbm8rMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpcnN0X2NvbHVtbjogdGhpcy55eWxsb2MubGFzdF9jb2x1bW4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBsYXN0X2NvbHVtbjogbGluZXMgPyBsaW5lc1tsaW5lcy5sZW5ndGgtMV0ubGVuZ3RoLWxpbmVzW2xpbmVzLmxlbmd0aC0xXS5tYXRjaCgvXFxyP1xcbj8vKVswXS5sZW5ndGggOiB0aGlzLnl5bGxvYy5sYXN0X2NvbHVtbiArIG1hdGNoWzBdLmxlbmd0aH07XG4gICAgICAgICAgICB0aGlzLnl5dGV4dCArPSBtYXRjaFswXTtcbiAgICAgICAgICAgIHRoaXMubWF0Y2ggKz0gbWF0Y2hbMF07XG4gICAgICAgICAgICB0aGlzLm1hdGNoZXMgPSBtYXRjaDtcbiAgICAgICAgICAgIHRoaXMueXlsZW5nID0gdGhpcy55eXRleHQubGVuZ3RoO1xuICAgICAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5yYW5nZXMpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnl5bGxvYy5yYW5nZSA9IFt0aGlzLm9mZnNldCwgdGhpcy5vZmZzZXQgKz0gdGhpcy55eWxlbmddO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fbW9yZSA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5faW5wdXQgPSB0aGlzLl9pbnB1dC5zbGljZShtYXRjaFswXS5sZW5ndGgpO1xuICAgICAgICAgICAgdGhpcy5tYXRjaGVkICs9IG1hdGNoWzBdO1xuICAgICAgICAgICAgdG9rZW4gPSB0aGlzLnBlcmZvcm1BY3Rpb24uY2FsbCh0aGlzLCB0aGlzLnl5LCB0aGlzLCBydWxlc1tpbmRleF0sdGhpcy5jb25kaXRpb25TdGFja1t0aGlzLmNvbmRpdGlvblN0YWNrLmxlbmd0aC0xXSk7XG4gICAgICAgICAgICBpZiAodGhpcy5kb25lICYmIHRoaXMuX2lucHV0KSB0aGlzLmRvbmUgPSBmYWxzZTtcbiAgICAgICAgICAgIGlmICh0b2tlbikgcmV0dXJuIHRva2VuO1xuICAgICAgICAgICAgZWxzZSByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuX2lucHV0ID09PSBcIlwiKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5FT0Y7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJzZUVycm9yKCdMZXhpY2FsIGVycm9yIG9uIGxpbmUgJysodGhpcy55eWxpbmVubysxKSsnLiBVbnJlY29nbml6ZWQgdGV4dC5cXG4nK3RoaXMuc2hvd1Bvc2l0aW9uKCksXG4gICAgICAgICAgICAgICAgICAgIHt0ZXh0OiBcIlwiLCB0b2tlbjogbnVsbCwgbGluZTogdGhpcy55eWxpbmVub30pO1xuICAgICAgICB9XG4gICAgfSxcbmxleDpmdW5jdGlvbiBsZXgoKSB7XG4gICAgICAgIHZhciByID0gdGhpcy5uZXh0KCk7XG4gICAgICAgIGlmICh0eXBlb2YgciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHJldHVybiByO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubGV4KCk7XG4gICAgICAgIH1cbiAgICB9LFxuYmVnaW46ZnVuY3Rpb24gYmVnaW4oY29uZGl0aW9uKSB7XG4gICAgICAgIHRoaXMuY29uZGl0aW9uU3RhY2sucHVzaChjb25kaXRpb24pO1xuICAgIH0sXG5wb3BTdGF0ZTpmdW5jdGlvbiBwb3BTdGF0ZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29uZGl0aW9uU3RhY2sucG9wKCk7XG4gICAgfSxcbl9jdXJyZW50UnVsZXM6ZnVuY3Rpb24gX2N1cnJlbnRSdWxlcygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29uZGl0aW9uc1t0aGlzLmNvbmRpdGlvblN0YWNrW3RoaXMuY29uZGl0aW9uU3RhY2subGVuZ3RoLTFdXS5ydWxlcztcbiAgICB9LFxudG9wU3RhdGU6ZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jb25kaXRpb25TdGFja1t0aGlzLmNvbmRpdGlvblN0YWNrLmxlbmd0aC0yXTtcbiAgICB9LFxucHVzaFN0YXRlOmZ1bmN0aW9uIGJlZ2luKGNvbmRpdGlvbikge1xuICAgICAgICB0aGlzLmJlZ2luKGNvbmRpdGlvbik7XG4gICAgfX0pO1xubGV4ZXIub3B0aW9ucyA9IHt9O1xubGV4ZXIucGVyZm9ybUFjdGlvbiA9IGZ1bmN0aW9uIGFub255bW91cyh5eSx5eV8sJGF2b2lkaW5nX25hbWVfY29sbGlzaW9ucyxZWV9TVEFSVCkge1xuXG5cbmZ1bmN0aW9uIHN0cmlwKHN0YXJ0LCBlbmQpIHtcbiAgcmV0dXJuIHl5Xy55eXRleHQgPSB5eV8ueXl0ZXh0LnN1YnN0cihzdGFydCwgeXlfLnl5bGVuZy1lbmQpO1xufVxuXG5cbnZhciBZWVNUQVRFPVlZX1NUQVJUXG5zd2l0Y2goJGF2b2lkaW5nX25hbWVfY29sbGlzaW9ucykge1xuY2FzZSAwOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZih5eV8ueXl0ZXh0LnNsaWNlKC0yKSA9PT0gXCJcXFxcXFxcXFwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyaXAoMCwxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJlZ2luKFwibXVcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZih5eV8ueXl0ZXh0LnNsaWNlKC0xKSA9PT0gXCJcXFxcXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHJpcCgwLDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYmVnaW4oXCJlbXVcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5iZWdpbihcIm11XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKHl5Xy55eXRleHQpIHJldHVybiAxNDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuYnJlYWs7XG5jYXNlIDE6cmV0dXJuIDE0O1xuYnJlYWs7XG5jYXNlIDI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucG9wU3RhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDE0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG5icmVhaztcbmNhc2UgMzpzdHJpcCgwLDQpOyB0aGlzLnBvcFN0YXRlKCk7IHJldHVybiAxNTtcbmJyZWFrO1xuY2FzZSA0OnJldHVybiAyNTtcbmJyZWFrO1xuY2FzZSA1OnJldHVybiAxNjtcbmJyZWFrO1xuY2FzZSA2OnJldHVybiAyMDtcbmJyZWFrO1xuY2FzZSA3OnJldHVybiAxOTtcbmJyZWFrO1xuY2FzZSA4OnJldHVybiAxOTtcbmJyZWFrO1xuY2FzZSA5OnJldHVybiAyMztcbmJyZWFrO1xuY2FzZSAxMDpyZXR1cm4gMjI7XG5icmVhaztcbmNhc2UgMTE6dGhpcy5wb3BTdGF0ZSgpOyB0aGlzLmJlZ2luKCdjb20nKTtcbmJyZWFrO1xuY2FzZSAxMjpzdHJpcCgzLDUpOyB0aGlzLnBvcFN0YXRlKCk7IHJldHVybiAxNTtcbmJyZWFrO1xuY2FzZSAxMzpyZXR1cm4gMjI7XG5icmVhaztcbmNhc2UgMTQ6cmV0dXJuIDM5O1xuYnJlYWs7XG5jYXNlIDE1OnJldHVybiAzODtcbmJyZWFrO1xuY2FzZSAxNjpyZXR1cm4gMzg7XG5icmVhaztcbmNhc2UgMTc6cmV0dXJuIDQyO1xuYnJlYWs7XG5jYXNlIDE4Oi8vIGlnbm9yZSB3aGl0ZXNwYWNlXG5icmVhaztcbmNhc2UgMTk6dGhpcy5wb3BTdGF0ZSgpOyByZXR1cm4gMjQ7XG5icmVhaztcbmNhc2UgMjA6dGhpcy5wb3BTdGF0ZSgpOyByZXR1cm4gMTg7XG5icmVhaztcbmNhc2UgMjE6eXlfLnl5dGV4dCA9IHN0cmlwKDEsMikucmVwbGFjZSgvXFxcXFwiL2csJ1wiJyk7IHJldHVybiAzMjtcbmJyZWFrO1xuY2FzZSAyMjp5eV8ueXl0ZXh0ID0gc3RyaXAoMSwyKS5yZXBsYWNlKC9cXFxcJy9nLFwiJ1wiKTsgcmV0dXJuIDMyO1xuYnJlYWs7XG5jYXNlIDIzOnJldHVybiA0MDtcbmJyZWFrO1xuY2FzZSAyNDpyZXR1cm4gMzQ7XG5icmVhaztcbmNhc2UgMjU6cmV0dXJuIDM0O1xuYnJlYWs7XG5jYXNlIDI2OnJldHVybiAzMztcbmJyZWFrO1xuY2FzZSAyNzpyZXR1cm4gMzg7XG5icmVhaztcbmNhc2UgMjg6eXlfLnl5dGV4dCA9IHN0cmlwKDEsMik7IHJldHVybiAzODtcbmJyZWFrO1xuY2FzZSAyOTpyZXR1cm4gJ0lOVkFMSUQnO1xuYnJlYWs7XG5jYXNlIDMwOnJldHVybiA1O1xuYnJlYWs7XG59XG59O1xubGV4ZXIucnVsZXMgPSBbL14oPzpbXlxceDAwXSo/KD89KFxce1xceykpKS8sL14oPzpbXlxceDAwXSspLywvXig/OlteXFx4MDBdezIsfT8oPz0oXFx7XFx7fFxcXFxcXHtcXHt8XFxcXFxcXFxcXHtcXHt8JCkpKS8sL14oPzpbXFxzXFxTXSo/LS1cXH1cXH0pLywvXig/Olxce1xceyh+KT8+KS8sL14oPzpcXHtcXHsofik/IykvLC9eKD86XFx7XFx7KH4pP1xcLykvLC9eKD86XFx7XFx7KH4pP1xcXikvLC9eKD86XFx7XFx7KH4pP1xccyplbHNlXFxiKS8sL14oPzpcXHtcXHsofik/XFx7KS8sL14oPzpcXHtcXHsofik/JikvLC9eKD86XFx7XFx7IS0tKS8sL14oPzpcXHtcXHshW1xcc1xcU10qP1xcfVxcfSkvLC9eKD86XFx7XFx7KH4pPykvLC9eKD86PSkvLC9eKD86XFwuXFwuKS8sL14oPzpcXC4oPz0oWz1+fVxcc1xcLy5dKSkpLywvXig/OltcXC8uXSkvLC9eKD86XFxzKykvLC9eKD86XFx9KH4pP1xcfVxcfSkvLC9eKD86KH4pP1xcfVxcfSkvLC9eKD86XCIoXFxcXFtcIl18W15cIl0pKlwiKS8sL14oPzonKFxcXFxbJ118W14nXSkqJykvLC9eKD86QCkvLC9eKD86dHJ1ZSg/PShbfn1cXHNdKSkpLywvXig/OmZhbHNlKD89KFt+fVxcc10pKSkvLC9eKD86LT9bMC05XSsoPz0oW359XFxzXSkpKS8sL14oPzooW15cXHMhXCIjJS0sXFwuXFwvOy0+QFxcWy1cXF5gXFx7LX5dKyg/PShbPX59XFxzXFwvLl0pKSkpLywvXig/OlxcW1teXFxdXSpcXF0pLywvXig/Oi4pLywvXig/OiQpL107XG5sZXhlci5jb25kaXRpb25zID0ge1wibXVcIjp7XCJydWxlc1wiOls0LDUsNiw3LDgsOSwxMCwxMSwxMiwxMywxNCwxNSwxNiwxNywxOCwxOSwyMCwyMSwyMiwyMywyNCwyNSwyNiwyNywyOCwyOSwzMF0sXCJpbmNsdXNpdmVcIjpmYWxzZX0sXCJlbXVcIjp7XCJydWxlc1wiOlsyXSxcImluY2x1c2l2ZVwiOmZhbHNlfSxcImNvbVwiOntcInJ1bGVzXCI6WzNdLFwiaW5jbHVzaXZlXCI6ZmFsc2V9LFwiSU5JVElBTFwiOntcInJ1bGVzXCI6WzAsMSwzMF0sXCJpbmNsdXNpdmVcIjp0cnVlfX07XG5yZXR1cm4gbGV4ZXI7fSkoKVxucGFyc2VyLmxleGVyID0gbGV4ZXI7XG5mdW5jdGlvbiBQYXJzZXIgKCkgeyB0aGlzLnl5ID0ge307IH1QYXJzZXIucHJvdG90eXBlID0gcGFyc2VyO3BhcnNlci5QYXJzZXIgPSBQYXJzZXI7XG5yZXR1cm4gbmV3IFBhcnNlcjtcbn0pKCk7ZXhwb3J0c1tcImRlZmF1bHRcIl0gPSBoYW5kbGViYXJzO1xuLyoganNoaW50IGlnbm9yZTplbmQgKi8iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIGVycm9yUHJvcHMgPSBbJ2Rlc2NyaXB0aW9uJywgJ2ZpbGVOYW1lJywgJ2xpbmVOdW1iZXInLCAnbWVzc2FnZScsICduYW1lJywgJ251bWJlcicsICdzdGFjayddO1xuXG5mdW5jdGlvbiBFeGNlcHRpb24oLyogbWVzc2FnZSAqLykge1xuICB2YXIgdG1wID0gRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgLy8gVW5mb3J0dW5hdGVseSBlcnJvcnMgYXJlIG5vdCBlbnVtZXJhYmxlIGluIENocm9tZSAoYXQgbGVhc3QpLCBzbyBgZm9yIHByb3AgaW4gdG1wYCBkb2Vzbid0IHdvcmsuXG4gIGZvciAodmFyIGlkeCA9IDA7IGlkeCA8IGVycm9yUHJvcHMubGVuZ3RoOyBpZHgrKykge1xuICAgIHRoaXNbZXJyb3JQcm9wc1tpZHhdXSA9IHRtcFtlcnJvclByb3BzW2lkeF1dO1xuICB9XG59XG5cbkV4Y2VwdGlvbi5wcm90b3R5cGUgPSBuZXcgRXJyb3IoKTtcblxuZXhwb3J0c1tcImRlZmF1bHRcIl0gPSBFeGNlcHRpb247IiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgVXRpbHMgPSByZXF1aXJlKFwiLi91dGlsc1wiKTtcbnZhciBFeGNlcHRpb24gPSByZXF1aXJlKFwiLi9leGNlcHRpb25cIilbXCJkZWZhdWx0XCJdO1xudmFyIENPTVBJTEVSX1JFVklTSU9OID0gcmVxdWlyZShcIi4vYmFzZVwiKS5DT01QSUxFUl9SRVZJU0lPTjtcbnZhciBSRVZJU0lPTl9DSEFOR0VTID0gcmVxdWlyZShcIi4vYmFzZVwiKS5SRVZJU0lPTl9DSEFOR0VTO1xuXG5mdW5jdGlvbiBjaGVja1JldmlzaW9uKGNvbXBpbGVySW5mbykge1xuICB2YXIgY29tcGlsZXJSZXZpc2lvbiA9IGNvbXBpbGVySW5mbyAmJiBjb21waWxlckluZm9bMF0gfHwgMSxcbiAgICAgIGN1cnJlbnRSZXZpc2lvbiA9IENPTVBJTEVSX1JFVklTSU9OO1xuXG4gIGlmIChjb21waWxlclJldmlzaW9uICE9PSBjdXJyZW50UmV2aXNpb24pIHtcbiAgICBpZiAoY29tcGlsZXJSZXZpc2lvbiA8IGN1cnJlbnRSZXZpc2lvbikge1xuICAgICAgdmFyIHJ1bnRpbWVWZXJzaW9ucyA9IFJFVklTSU9OX0NIQU5HRVNbY3VycmVudFJldmlzaW9uXSxcbiAgICAgICAgICBjb21waWxlclZlcnNpb25zID0gUkVWSVNJT05fQ0hBTkdFU1tjb21waWxlclJldmlzaW9uXTtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlRlbXBsYXRlIHdhcyBwcmVjb21waWxlZCB3aXRoIGFuIG9sZGVyIHZlcnNpb24gb2YgSGFuZGxlYmFycyB0aGFuIHRoZSBjdXJyZW50IHJ1bnRpbWUuIFwiK1xuICAgICAgICAgICAgXCJQbGVhc2UgdXBkYXRlIHlvdXIgcHJlY29tcGlsZXIgdG8gYSBuZXdlciB2ZXJzaW9uIChcIitydW50aW1lVmVyc2lvbnMrXCIpIG9yIGRvd25ncmFkZSB5b3VyIHJ1bnRpbWUgdG8gYW4gb2xkZXIgdmVyc2lvbiAoXCIrY29tcGlsZXJWZXJzaW9ucytcIikuXCIpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBVc2UgdGhlIGVtYmVkZGVkIHZlcnNpb24gaW5mbyBzaW5jZSB0aGUgcnVudGltZSBkb2Vzbid0IGtub3cgYWJvdXQgdGhpcyByZXZpc2lvbiB5ZXRcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlRlbXBsYXRlIHdhcyBwcmVjb21waWxlZCB3aXRoIGEgbmV3ZXIgdmVyc2lvbiBvZiBIYW5kbGViYXJzIHRoYW4gdGhlIGN1cnJlbnQgcnVudGltZS4gXCIrXG4gICAgICAgICAgICBcIlBsZWFzZSB1cGRhdGUgeW91ciBydW50aW1lIHRvIGEgbmV3ZXIgdmVyc2lvbiAoXCIrY29tcGlsZXJJbmZvWzFdK1wiKS5cIik7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydHMuY2hlY2tSZXZpc2lvbiA9IGNoZWNrUmV2aXNpb247Ly8gVE9ETzogUmVtb3ZlIHRoaXMgbGluZSBhbmQgYnJlYWsgdXAgY29tcGlsZVBhcnRpYWxcblxuZnVuY3Rpb24gdGVtcGxhdGUodGVtcGxhdGVTcGVjLCBlbnYpIHtcbiAgaWYgKCFlbnYpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJObyBlbnZpcm9ubWVudCBwYXNzZWQgdG8gdGVtcGxhdGVcIik7XG4gIH1cblxuICAvLyBOb3RlOiBVc2luZyBlbnYuVk0gcmVmZXJlbmNlcyByYXRoZXIgdGhhbiBsb2NhbCB2YXIgcmVmZXJlbmNlcyB0aHJvdWdob3V0IHRoaXMgc2VjdGlvbiB0byBhbGxvd1xuICAvLyBmb3IgZXh0ZXJuYWwgdXNlcnMgdG8gb3ZlcnJpZGUgdGhlc2UgYXMgcHN1ZWRvLXN1cHBvcnRlZCBBUElzLlxuICB2YXIgaW52b2tlUGFydGlhbFdyYXBwZXIgPSBmdW5jdGlvbihwYXJ0aWFsLCBuYW1lLCBjb250ZXh0LCBoZWxwZXJzLCBwYXJ0aWFscywgZGF0YSkge1xuICAgIHZhciByZXN1bHQgPSBlbnYuVk0uaW52b2tlUGFydGlhbC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIGlmIChyZXN1bHQgIT0gbnVsbCkgeyByZXR1cm4gcmVzdWx0OyB9XG5cbiAgICBpZiAoZW52LmNvbXBpbGUpIHtcbiAgICAgIHZhciBvcHRpb25zID0geyBoZWxwZXJzOiBoZWxwZXJzLCBwYXJ0aWFsczogcGFydGlhbHMsIGRhdGE6IGRhdGEgfTtcbiAgICAgIHBhcnRpYWxzW25hbWVdID0gZW52LmNvbXBpbGUocGFydGlhbCwgeyBkYXRhOiBkYXRhICE9PSB1bmRlZmluZWQgfSwgZW52KTtcbiAgICAgIHJldHVybiBwYXJ0aWFsc1tuYW1lXShjb250ZXh0LCBvcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcIlRoZSBwYXJ0aWFsIFwiICsgbmFtZSArIFwiIGNvdWxkIG5vdCBiZSBjb21waWxlZCB3aGVuIHJ1bm5pbmcgaW4gcnVudGltZS1vbmx5IG1vZGVcIik7XG4gICAgfVxuICB9O1xuXG4gIC8vIEp1c3QgYWRkIHdhdGVyXG4gIHZhciBjb250YWluZXIgPSB7XG4gICAgZXNjYXBlRXhwcmVzc2lvbjogVXRpbHMuZXNjYXBlRXhwcmVzc2lvbixcbiAgICBpbnZva2VQYXJ0aWFsOiBpbnZva2VQYXJ0aWFsV3JhcHBlcixcbiAgICBwcm9ncmFtczogW10sXG4gICAgcHJvZ3JhbTogZnVuY3Rpb24oaSwgZm4sIGRhdGEpIHtcbiAgICAgIHZhciBwcm9ncmFtV3JhcHBlciA9IHRoaXMucHJvZ3JhbXNbaV07XG4gICAgICBpZihkYXRhKSB7XG4gICAgICAgIHByb2dyYW1XcmFwcGVyID0gcHJvZ3JhbShpLCBmbiwgZGF0YSk7XG4gICAgICB9IGVsc2UgaWYgKCFwcm9ncmFtV3JhcHBlcikge1xuICAgICAgICBwcm9ncmFtV3JhcHBlciA9IHRoaXMucHJvZ3JhbXNbaV0gPSBwcm9ncmFtKGksIGZuKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwcm9ncmFtV3JhcHBlcjtcbiAgICB9LFxuICAgIG1lcmdlOiBmdW5jdGlvbihwYXJhbSwgY29tbW9uKSB7XG4gICAgICB2YXIgcmV0ID0gcGFyYW0gfHwgY29tbW9uO1xuXG4gICAgICBpZiAocGFyYW0gJiYgY29tbW9uICYmIChwYXJhbSAhPT0gY29tbW9uKSkge1xuICAgICAgICByZXQgPSB7fTtcbiAgICAgICAgVXRpbHMuZXh0ZW5kKHJldCwgY29tbW9uKTtcbiAgICAgICAgVXRpbHMuZXh0ZW5kKHJldCwgcGFyYW0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJldDtcbiAgICB9LFxuICAgIHByb2dyYW1XaXRoRGVwdGg6IGVudi5WTS5wcm9ncmFtV2l0aERlcHRoLFxuICAgIG5vb3A6IGVudi5WTS5ub29wLFxuICAgIGNvbXBpbGVySW5mbzogbnVsbFxuICB9O1xuXG4gIHJldHVybiBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgdmFyIG5hbWVzcGFjZSA9IG9wdGlvbnMucGFydGlhbCA/IG9wdGlvbnMgOiBlbnYsXG4gICAgICAgIGhlbHBlcnMsXG4gICAgICAgIHBhcnRpYWxzO1xuXG4gICAgaWYgKCFvcHRpb25zLnBhcnRpYWwpIHtcbiAgICAgIGhlbHBlcnMgPSBvcHRpb25zLmhlbHBlcnM7XG4gICAgICBwYXJ0aWFscyA9IG9wdGlvbnMucGFydGlhbHM7XG4gICAgfVxuICAgIHZhciByZXN1bHQgPSB0ZW1wbGF0ZVNwZWMuY2FsbChcbiAgICAgICAgICBjb250YWluZXIsXG4gICAgICAgICAgbmFtZXNwYWNlLCBjb250ZXh0LFxuICAgICAgICAgIGhlbHBlcnMsXG4gICAgICAgICAgcGFydGlhbHMsXG4gICAgICAgICAgb3B0aW9ucy5kYXRhKTtcblxuICAgIGlmICghb3B0aW9ucy5wYXJ0aWFsKSB7XG4gICAgICBlbnYuVk0uY2hlY2tSZXZpc2lvbihjb250YWluZXIuY29tcGlsZXJJbmZvKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xufVxuXG5leHBvcnRzLnRlbXBsYXRlID0gdGVtcGxhdGU7ZnVuY3Rpb24gcHJvZ3JhbVdpdGhEZXB0aChpLCBmbiwgZGF0YSAvKiwgJGRlcHRoICovKSB7XG4gIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAzKTtcblxuICB2YXIgcHJvZyA9IGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBbY29udGV4dCwgb3B0aW9ucy5kYXRhIHx8IGRhdGFdLmNvbmNhdChhcmdzKSk7XG4gIH07XG4gIHByb2cucHJvZ3JhbSA9IGk7XG4gIHByb2cuZGVwdGggPSBhcmdzLmxlbmd0aDtcbiAgcmV0dXJuIHByb2c7XG59XG5cbmV4cG9ydHMucHJvZ3JhbVdpdGhEZXB0aCA9IHByb2dyYW1XaXRoRGVwdGg7ZnVuY3Rpb24gcHJvZ3JhbShpLCBmbiwgZGF0YSkge1xuICB2YXIgcHJvZyA9IGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgIHJldHVybiBmbihjb250ZXh0LCBvcHRpb25zLmRhdGEgfHwgZGF0YSk7XG4gIH07XG4gIHByb2cucHJvZ3JhbSA9IGk7XG4gIHByb2cuZGVwdGggPSAwO1xuICByZXR1cm4gcHJvZztcbn1cblxuZXhwb3J0cy5wcm9ncmFtID0gcHJvZ3JhbTtmdW5jdGlvbiBpbnZva2VQYXJ0aWFsKHBhcnRpYWwsIG5hbWUsIGNvbnRleHQsIGhlbHBlcnMsIHBhcnRpYWxzLCBkYXRhKSB7XG4gIHZhciBvcHRpb25zID0geyBwYXJ0aWFsOiB0cnVlLCBoZWxwZXJzOiBoZWxwZXJzLCBwYXJ0aWFsczogcGFydGlhbHMsIGRhdGE6IGRhdGEgfTtcblxuICBpZihwYXJ0aWFsID09PSB1bmRlZmluZWQpIHtcbiAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKFwiVGhlIHBhcnRpYWwgXCIgKyBuYW1lICsgXCIgY291bGQgbm90IGJlIGZvdW5kXCIpO1xuICB9IGVsc2UgaWYocGFydGlhbCBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgcmV0dXJuIHBhcnRpYWwoY29udGV4dCwgb3B0aW9ucyk7XG4gIH1cbn1cblxuZXhwb3J0cy5pbnZva2VQYXJ0aWFsID0gaW52b2tlUGFydGlhbDtmdW5jdGlvbiBub29wKCkgeyByZXR1cm4gXCJcIjsgfVxuXG5leHBvcnRzLm5vb3AgPSBub29wOyIsIlwidXNlIHN0cmljdFwiO1xuLy8gQnVpbGQgb3V0IG91ciBiYXNpYyBTYWZlU3RyaW5nIHR5cGVcbmZ1bmN0aW9uIFNhZmVTdHJpbmcoc3RyaW5nKSB7XG4gIHRoaXMuc3RyaW5nID0gc3RyaW5nO1xufVxuXG5TYWZlU3RyaW5nLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gXCJcIiArIHRoaXMuc3RyaW5nO1xufTtcblxuZXhwb3J0c1tcImRlZmF1bHRcIl0gPSBTYWZlU3RyaW5nOyIsIlwidXNlIHN0cmljdFwiO1xuLypqc2hpbnQgLVcwMDQgKi9cbnZhciBTYWZlU3RyaW5nID0gcmVxdWlyZShcIi4vc2FmZS1zdHJpbmdcIilbXCJkZWZhdWx0XCJdO1xuXG52YXIgZXNjYXBlID0ge1xuICBcIiZcIjogXCImYW1wO1wiLFxuICBcIjxcIjogXCImbHQ7XCIsXG4gIFwiPlwiOiBcIiZndDtcIixcbiAgJ1wiJzogXCImcXVvdDtcIixcbiAgXCInXCI6IFwiJiN4Mjc7XCIsXG4gIFwiYFwiOiBcIiYjeDYwO1wiXG59O1xuXG52YXIgYmFkQ2hhcnMgPSAvWyY8PlwiJ2BdL2c7XG52YXIgcG9zc2libGUgPSAvWyY8PlwiJ2BdLztcblxuZnVuY3Rpb24gZXNjYXBlQ2hhcihjaHIpIHtcbiAgcmV0dXJuIGVzY2FwZVtjaHJdIHx8IFwiJmFtcDtcIjtcbn1cblxuZnVuY3Rpb24gZXh0ZW5kKG9iaiwgdmFsdWUpIHtcbiAgZm9yKHZhciBrZXkgaW4gdmFsdWUpIHtcbiAgICBpZihPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwodmFsdWUsIGtleSkpIHtcbiAgICAgIG9ialtrZXldID0gdmFsdWVba2V5XTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0cy5leHRlbmQgPSBleHRlbmQ7dmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcbmV4cG9ydHMudG9TdHJpbmcgPSB0b1N0cmluZztcbi8vIFNvdXJjZWQgZnJvbSBsb2Rhc2hcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9iZXN0aWVqcy9sb2Rhc2gvYmxvYi9tYXN0ZXIvTElDRU5TRS50eHRcbnZhciBpc0Z1bmN0aW9uID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJztcbn07XG4vLyBmYWxsYmFjayBmb3Igb2xkZXIgdmVyc2lvbnMgb2YgQ2hyb21lIGFuZCBTYWZhcmlcbmlmIChpc0Z1bmN0aW9uKC94LykpIHtcbiAgaXNGdW5jdGlvbiA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJyAmJiB0b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJztcbiAgfTtcbn1cbnZhciBpc0Z1bmN0aW9uO1xuZXhwb3J0cy5pc0Z1bmN0aW9uID0gaXNGdW5jdGlvbjtcbnZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpID8gdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09ICdbb2JqZWN0IEFycmF5XScgOiBmYWxzZTtcbn07XG5leHBvcnRzLmlzQXJyYXkgPSBpc0FycmF5O1xuXG5mdW5jdGlvbiBlc2NhcGVFeHByZXNzaW9uKHN0cmluZykge1xuICAvLyBkb24ndCBlc2NhcGUgU2FmZVN0cmluZ3MsIHNpbmNlIHRoZXkncmUgYWxyZWFkeSBzYWZlXG4gIGlmIChzdHJpbmcgaW5zdGFuY2VvZiBTYWZlU3RyaW5nKSB7XG4gICAgcmV0dXJuIHN0cmluZy50b1N0cmluZygpO1xuICB9IGVsc2UgaWYgKCFzdHJpbmcgJiYgc3RyaW5nICE9PSAwKSB7XG4gICAgcmV0dXJuIFwiXCI7XG4gIH1cblxuICAvLyBGb3JjZSBhIHN0cmluZyBjb252ZXJzaW9uIGFzIHRoaXMgd2lsbCBiZSBkb25lIGJ5IHRoZSBhcHBlbmQgcmVnYXJkbGVzcyBhbmRcbiAgLy8gdGhlIHJlZ2V4IHRlc3Qgd2lsbCBkbyB0aGlzIHRyYW5zcGFyZW50bHkgYmVoaW5kIHRoZSBzY2VuZXMsIGNhdXNpbmcgaXNzdWVzIGlmXG4gIC8vIGFuIG9iamVjdCdzIHRvIHN0cmluZyBoYXMgZXNjYXBlZCBjaGFyYWN0ZXJzIGluIGl0LlxuICBzdHJpbmcgPSBcIlwiICsgc3RyaW5nO1xuXG4gIGlmKCFwb3NzaWJsZS50ZXN0KHN0cmluZykpIHsgcmV0dXJuIHN0cmluZzsgfVxuICByZXR1cm4gc3RyaW5nLnJlcGxhY2UoYmFkQ2hhcnMsIGVzY2FwZUNoYXIpO1xufVxuXG5leHBvcnRzLmVzY2FwZUV4cHJlc3Npb24gPSBlc2NhcGVFeHByZXNzaW9uO2Z1bmN0aW9uIGlzRW1wdHkodmFsdWUpIHtcbiAgaWYgKCF2YWx1ZSAmJiB2YWx1ZSAhPT0gMCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2UgaWYgKGlzQXJyYXkodmFsdWUpICYmIHZhbHVlLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG5leHBvcnRzLmlzRW1wdHkgPSBpc0VtcHR5OyIsInZhciBUb2tlbml6ZXIgPSByZXF1aXJlKFwiLi9Ub2tlbml6ZXIuanNcIik7XG5cbi8qXG5cdE9wdGlvbnM6XG5cblx0eG1sTW9kZTogU3BlY2lhbCBiZWhhdmlvciBmb3Igc2NyaXB0L3N0eWxlIHRhZ3MgKHRydWUgYnkgZGVmYXVsdClcblx0bG93ZXJDYXNlQXR0cmlidXRlTmFtZXM6IGNhbGwgLnRvTG93ZXJDYXNlIGZvciBlYWNoIGF0dHJpYnV0ZSBuYW1lICh0cnVlIGlmIHhtbE1vZGUgaXMgYGZhbHNlYClcblx0bG93ZXJDYXNlVGFnczogY2FsbCAudG9Mb3dlckNhc2UgZm9yIGVhY2ggdGFnIG5hbWUgKHRydWUgaWYgeG1sTW9kZSBpcyBgZmFsc2VgKVxuKi9cblxuLypcblx0Q2FsbGJhY2tzOlxuXG5cdG9uY2RhdGFlbmQsXG5cdG9uY2RhdGFzdGFydCxcblx0b25jbG9zZXRhZyxcblx0b25jb21tZW50LFxuXHRvbmNvbW1lbnRlbmQsXG5cdG9uZXJyb3IsXG5cdG9ub3BlbnRhZyxcblx0b25wcm9jZXNzaW5naW5zdHJ1Y3Rpb24sXG5cdG9ucmVzZXQsXG5cdG9udGV4dFxuKi9cblxudmFyIGZvcm1UYWdzID0ge1xuXHRpbnB1dDogdHJ1ZSxcblx0b3B0aW9uOiB0cnVlLFxuXHRvcHRncm91cDogdHJ1ZSxcblx0c2VsZWN0OiB0cnVlLFxuXHRidXR0b246IHRydWUsXG5cdGRhdGFsaXN0OiB0cnVlLFxuXHR0ZXh0YXJlYTogdHJ1ZVxufTtcblxudmFyIG9wZW5JbXBsaWVzQ2xvc2UgPSB7XG5cdHRyICAgICAgOiB7IHRyOnRydWUsIHRoOnRydWUsIHRkOnRydWUgfSxcblx0dGggICAgICA6IHsgdGg6dHJ1ZSB9LFxuXHR0ZCAgICAgIDogeyB0aGVhZDp0cnVlLCB0ZDp0cnVlIH0sXG5cdGJvZHkgICAgOiB7IGhlYWQ6dHJ1ZSwgbGluazp0cnVlLCBzY3JpcHQ6dHJ1ZSB9LFxuXHRsaSAgICAgIDogeyBsaTp0cnVlIH0sXG5cdHAgICAgICAgOiB7IHA6dHJ1ZSB9LFxuXHRzZWxlY3QgIDogZm9ybVRhZ3MsXG5cdGlucHV0ICAgOiBmb3JtVGFncyxcblx0b3V0cHV0ICA6IGZvcm1UYWdzLFxuXHRidXR0b24gIDogZm9ybVRhZ3MsXG5cdGRhdGFsaXN0OiBmb3JtVGFncyxcblx0dGV4dGFyZWE6IGZvcm1UYWdzLFxuXHRvcHRpb24gIDogeyBvcHRpb246dHJ1ZSB9LFxuXHRvcHRncm91cDogeyBvcHRncm91cDp0cnVlIH1cbn07XG5cbnZhciB2b2lkRWxlbWVudHMgPSB7XG5cdF9fcHJvdG9fXzogbnVsbCxcblx0YXJlYTogdHJ1ZSxcblx0YmFzZTogdHJ1ZSxcblx0YmFzZWZvbnQ6IHRydWUsXG5cdGJyOiB0cnVlLFxuXHRjb2w6IHRydWUsXG5cdGNvbW1hbmQ6IHRydWUsXG5cdGVtYmVkOiB0cnVlLFxuXHRmcmFtZTogdHJ1ZSxcblx0aHI6IHRydWUsXG5cdGltZzogdHJ1ZSxcblx0aW5wdXQ6IHRydWUsXG5cdGlzaW5kZXg6IHRydWUsXG5cdGtleWdlbjogdHJ1ZSxcblx0bGluazogdHJ1ZSxcblx0bWV0YTogdHJ1ZSxcblx0cGFyYW06IHRydWUsXG5cdHNvdXJjZTogdHJ1ZSxcblx0dHJhY2s6IHRydWUsXG5cdHdicjogdHJ1ZVxufTtcblxudmFyIHJlX25hbWVFbmQgPSAvXFxzfFxcLy87XG5cbmZ1bmN0aW9uIFBhcnNlcihjYnMsIG9wdGlvbnMpe1xuXHR0aGlzLl9vcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblx0dGhpcy5fY2JzID0gY2JzIHx8IHt9O1xuXG5cdHRoaXMuX3RhZ25hbWUgPSBcIlwiO1xuXHR0aGlzLl9hdHRyaWJuYW1lID0gXCJcIjtcblx0dGhpcy5fYXR0cmlidmFsdWUgPSBcIlwiO1xuXHR0aGlzLl9hdHRyaWJzID0gbnVsbDtcblx0dGhpcy5fc3RhY2sgPSBbXTtcblx0dGhpcy5fZG9uZSA9IGZhbHNlO1xuXG5cdHRoaXMuc3RhcnRJbmRleCA9IDA7XG5cdHRoaXMuZW5kSW5kZXggPSBudWxsO1xuXG5cdHRoaXMuX3Rva2VuaXplciA9IG5ldyBUb2tlbml6ZXIob3B0aW9ucywgdGhpcyk7XG59XG5cbnJlcXVpcmUoXCJ1dGlsXCIpLmluaGVyaXRzKFBhcnNlciwgcmVxdWlyZShcImV2ZW50c1wiKS5FdmVudEVtaXR0ZXIpO1xuXG5QYXJzZXIucHJvdG90eXBlLl91cGRhdGVQb3NpdGlvbiA9IGZ1bmN0aW9uKGluaXRpYWxPZmZzZXQpe1xuXHRpZih0aGlzLmVuZEluZGV4ID09PSBudWxsKXtcblx0XHR0aGlzLnN0YXJ0SW5kZXggPSB0aGlzLl90b2tlbml6ZXIuX3NlY3Rpb25TdGFydCA8PSBpbml0aWFsT2Zmc2V0ID8gMCA6IHRoaXMuX3Rva2VuaXplci5fc2VjdGlvblN0YXJ0IC0gaW5pdGlhbE9mZnNldDtcblx0fVxuXHR0aGlzLnN0YXJ0SW5kZXggPSB0aGlzLmVuZEluZGV4ICsgMTtcblx0dGhpcy5lbmRJbmRleCA9IHRoaXMuX3Rva2VuaXplci5faW5kZXg7XG59O1xuXG4vL1Rva2VuaXplciBldmVudCBoYW5kbGVyc1xuUGFyc2VyLnByb3RvdHlwZS5vbnRleHQgPSBmdW5jdGlvbihkYXRhKXtcblx0dGhpcy5fdXBkYXRlUG9zaXRpb24oMSk7XG5cdHRoaXMuZW5kSW5kZXgtLTtcblxuXHRpZih0aGlzLl9jYnMub250ZXh0KSB0aGlzLl9jYnMub250ZXh0KGRhdGEpO1xufTtcblxuUGFyc2VyLnByb3RvdHlwZS5vbm9wZW50YWduYW1lID0gZnVuY3Rpb24obmFtZSl7XG5cdGlmKCEodGhpcy5fb3B0aW9ucy54bWxNb2RlIHx8IFwibG93ZXJDYXNlVGFnc1wiIGluIHRoaXMuX29wdGlvbnMpIHx8IHRoaXMuX29wdGlvbnMubG93ZXJDYXNlVGFncyl7XG5cdFx0bmFtZSA9IG5hbWUudG9Mb3dlckNhc2UoKTtcblx0fVxuXG5cdHRoaXMuX3RhZ25hbWUgPSBuYW1lO1xuXG5cdGlmICghdGhpcy5fb3B0aW9ucy54bWxNb2RlICYmIG5hbWUgaW4gb3BlbkltcGxpZXNDbG9zZSkge1xuXHRcdGZvcihcblx0XHRcdHZhciBlbDtcblx0XHRcdChlbCA9IHRoaXMuX3N0YWNrW3RoaXMuX3N0YWNrLmxlbmd0aC0xXSkgaW4gb3BlbkltcGxpZXNDbG9zZVtuYW1lXTtcblx0XHRcdHRoaXMub25jbG9zZXRhZyhlbClcblx0XHQpO1xuXHR9XG5cblx0aWYodGhpcy5fb3B0aW9ucy54bWxNb2RlIHx8ICEobmFtZSBpbiB2b2lkRWxlbWVudHMpKXtcblx0XHR0aGlzLl9zdGFjay5wdXNoKG5hbWUpO1xuXHR9XG5cblx0aWYodGhpcy5fY2JzLm9ub3BlbnRhZ25hbWUpIHRoaXMuX2Nicy5vbm9wZW50YWduYW1lKG5hbWUpO1xuXHRpZih0aGlzLl9jYnMub25vcGVudGFnKSB0aGlzLl9hdHRyaWJzID0ge307XG59O1xuXG5QYXJzZXIucHJvdG90eXBlLm9ub3BlbnRhZ2VuZCA9IGZ1bmN0aW9uKCl7XG5cdHRoaXMuX3VwZGF0ZVBvc2l0aW9uKDEpO1xuICAgIFxuXHRpZih0aGlzLl9hdHRyaWJzKXtcblx0XHRpZih0aGlzLl9jYnMub25vcGVudGFnKSB0aGlzLl9jYnMub25vcGVudGFnKHRoaXMuX3RhZ25hbWUsIHRoaXMuX2F0dHJpYnMpO1xuXHRcdHRoaXMuX2F0dHJpYnMgPSBudWxsO1xuXHR9XG4gICAgXG5cdGlmKCF0aGlzLl9vcHRpb25zLnhtbE1vZGUgJiYgdGhpcy5fY2JzLm9uY2xvc2V0YWcgJiYgdGhpcy5fdGFnbmFtZSBpbiB2b2lkRWxlbWVudHMpe1xuXHRcdHRoaXMuX2Nicy5vbmNsb3NldGFnKHRoaXMuX3RhZ25hbWUpO1xuXHR9XG4gICAgXG5cdHRoaXMuX3RhZ25hbWUgPSBcIlwiO1xufTtcblxuUGFyc2VyLnByb3RvdHlwZS5vbmNsb3NldGFnID0gZnVuY3Rpb24obmFtZSl7XG5cdHRoaXMuX3VwZGF0ZVBvc2l0aW9uKDEpO1xuXG5cdGlmKCEodGhpcy5fb3B0aW9ucy54bWxNb2RlIHx8IFwibG93ZXJDYXNlVGFnc1wiIGluIHRoaXMuX29wdGlvbnMpIHx8IHRoaXMuX29wdGlvbnMubG93ZXJDYXNlVGFncyl7XG5cdFx0bmFtZSA9IG5hbWUudG9Mb3dlckNhc2UoKTtcblx0fVxuXG5cdGlmKHRoaXMuX3N0YWNrLmxlbmd0aCAmJiAoIShuYW1lIGluIHZvaWRFbGVtZW50cykgfHwgdGhpcy5fb3B0aW9ucy54bWxNb2RlKSl7XG5cdFx0dmFyIHBvcyA9IHRoaXMuX3N0YWNrLmxhc3RJbmRleE9mKG5hbWUpO1xuXHRcdGlmKHBvcyAhPT0gLTEpe1xuXHRcdFx0aWYodGhpcy5fY2JzLm9uY2xvc2V0YWcpe1xuXHRcdFx0XHRwb3MgPSB0aGlzLl9zdGFjay5sZW5ndGggLSBwb3M7XG5cdFx0XHRcdHdoaWxlKHBvcy0tKSB0aGlzLl9jYnMub25jbG9zZXRhZyh0aGlzLl9zdGFjay5wb3AoKSk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHRoaXMuX3N0YWNrLmxlbmd0aCA9IHBvcztcblx0XHR9IGVsc2UgaWYobmFtZSA9PT0gXCJwXCIgJiYgIXRoaXMuX29wdGlvbnMueG1sTW9kZSl7XG5cdFx0XHR0aGlzLm9ub3BlbnRhZ25hbWUobmFtZSk7XG5cdFx0XHR0aGlzLl9jbG9zZUN1cnJlbnRUYWcoKTtcblx0XHR9XG5cdH0gZWxzZSBpZighdGhpcy5fb3B0aW9ucy54bWxNb2RlICYmIChuYW1lID09PSBcImJyXCIgfHwgbmFtZSA9PT0gXCJwXCIpKXtcblx0XHR0aGlzLm9ub3BlbnRhZ25hbWUobmFtZSk7XG5cdFx0dGhpcy5fY2xvc2VDdXJyZW50VGFnKCk7XG5cdH1cbn07XG5cblBhcnNlci5wcm90b3R5cGUub25zZWxmY2xvc2luZ3RhZyA9IGZ1bmN0aW9uKCl7XG5cdGlmKHRoaXMuX29wdGlvbnMueG1sTW9kZSl7XG5cdFx0dGhpcy5fY2xvc2VDdXJyZW50VGFnKCk7XG5cdH0gZWxzZSB7XG5cdFx0dGhpcy5vbm9wZW50YWdlbmQoKTtcblx0fVxufTtcblxuUGFyc2VyLnByb3RvdHlwZS5fY2xvc2VDdXJyZW50VGFnID0gZnVuY3Rpb24oKXtcblx0dmFyIG5hbWUgPSB0aGlzLl90YWduYW1lO1xuXG5cdHRoaXMub25vcGVudGFnZW5kKCk7XG5cblx0Ly9zZWxmLWNsb3NpbmcgdGFncyB3aWxsIGJlIG9uIHRoZSB0b3Agb2YgdGhlIHN0YWNrXG5cdC8vKGNoZWFwZXIgY2hlY2sgdGhhbiBpbiBvbmNsb3NldGFnKVxuXHRpZih0aGlzLl9zdGFja1t0aGlzLl9zdGFjay5sZW5ndGgtMV0gPT09IG5hbWUpe1xuXHRcdGlmKHRoaXMuX2Nicy5vbmNsb3NldGFnKXtcblx0XHRcdHRoaXMuX2Nicy5vbmNsb3NldGFnKG5hbWUpO1xuXHRcdH1cblx0XHR0aGlzLl9zdGFjay5wb3AoKTtcblx0fVxufTtcblxuUGFyc2VyLnByb3RvdHlwZS5vbmF0dHJpYm5hbWUgPSBmdW5jdGlvbihuYW1lKXtcblx0aWYoISh0aGlzLl9vcHRpb25zLnhtbE1vZGUgfHwgXCJsb3dlckNhc2VBdHRyaWJ1dGVOYW1lc1wiIGluIHRoaXMuX29wdGlvbnMpIHx8IHRoaXMuX29wdGlvbnMubG93ZXJDYXNlQXR0cmlidXRlTmFtZXMpe1xuXHRcdG5hbWUgPSBuYW1lLnRvTG93ZXJDYXNlKCk7XG5cdH1cblx0dGhpcy5fYXR0cmlibmFtZSA9IG5hbWU7XG59O1xuXG5QYXJzZXIucHJvdG90eXBlLm9uYXR0cmliZGF0YSA9IGZ1bmN0aW9uKHZhbHVlKXtcblx0dGhpcy5fYXR0cmlidmFsdWUgKz0gdmFsdWU7XG59O1xuXG5QYXJzZXIucHJvdG90eXBlLm9uYXR0cmliZW5kID0gZnVuY3Rpb24oKXtcblx0aWYodGhpcy5fY2JzLm9uYXR0cmlidXRlKSB0aGlzLl9jYnMub25hdHRyaWJ1dGUodGhpcy5fYXR0cmlibmFtZSwgdGhpcy5fYXR0cmlidmFsdWUpO1xuXHRpZihcblx0XHR0aGlzLl9hdHRyaWJzICYmXG5cdFx0IU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLl9hdHRyaWJzLCB0aGlzLl9hdHRyaWJuYW1lKVxuXHQpe1xuXHRcdHRoaXMuX2F0dHJpYnNbdGhpcy5fYXR0cmlibmFtZV0gPSB0aGlzLl9hdHRyaWJ2YWx1ZTtcblx0fVxuXHR0aGlzLl9hdHRyaWJuYW1lID0gXCJcIjtcblx0dGhpcy5fYXR0cmlidmFsdWUgPSBcIlwiO1xufTtcblxuUGFyc2VyLnByb3RvdHlwZS5vbmRlY2xhcmF0aW9uID0gZnVuY3Rpb24odmFsdWUpe1xuXHRpZih0aGlzLl9jYnMub25wcm9jZXNzaW5naW5zdHJ1Y3Rpb24pe1xuXHRcdHZhciBpZHggPSB2YWx1ZS5zZWFyY2gocmVfbmFtZUVuZCksXG5cdFx0ICAgIG5hbWUgPSBpZHggPCAwID8gdmFsdWUgOiB2YWx1ZS5zdWJzdHIoMCwgaWR4KTtcblxuXHRcdGlmKCEodGhpcy5fb3B0aW9ucy54bWxNb2RlIHx8IFwibG93ZXJDYXNlVGFnc1wiIGluIHRoaXMuX29wdGlvbnMpIHx8IHRoaXMuX29wdGlvbnMubG93ZXJDYXNlVGFncyl7XG5cdFx0XHRuYW1lID0gbmFtZS50b0xvd2VyQ2FzZSgpO1xuXHRcdH1cblx0XHR0aGlzLl9jYnMub25wcm9jZXNzaW5naW5zdHJ1Y3Rpb24oXCIhXCIgKyBuYW1lLCBcIiFcIiArIHZhbHVlKTtcblx0fVxufTtcblxuUGFyc2VyLnByb3RvdHlwZS5vbnByb2Nlc3NpbmdpbnN0cnVjdGlvbiA9IGZ1bmN0aW9uKHZhbHVlKXtcblx0aWYodGhpcy5fY2JzLm9ucHJvY2Vzc2luZ2luc3RydWN0aW9uKXtcblx0XHR2YXIgaWR4ID0gdmFsdWUuc2VhcmNoKHJlX25hbWVFbmQpLFxuXHRcdCAgICBuYW1lID0gaWR4IDwgMCA/IHZhbHVlIDogdmFsdWUuc3Vic3RyKDAsIGlkeCk7XG5cblx0XHRpZighKHRoaXMuX29wdGlvbnMueG1sTW9kZSB8fCBcImxvd2VyQ2FzZVRhZ3NcIiBpbiB0aGlzLl9vcHRpb25zKSB8fCB0aGlzLl9vcHRpb25zLmxvd2VyQ2FzZVRhZ3Mpe1xuXHRcdFx0bmFtZSA9IG5hbWUudG9Mb3dlckNhc2UoKTtcblx0XHR9XG5cdFx0dGhpcy5fY2JzLm9ucHJvY2Vzc2luZ2luc3RydWN0aW9uKFwiP1wiICsgbmFtZSwgXCI/XCIgKyB2YWx1ZSk7XG5cdH1cbn07XG5cblBhcnNlci5wcm90b3R5cGUub25jb21tZW50ID0gZnVuY3Rpb24odmFsdWUpe1xuXHR0aGlzLl91cGRhdGVQb3NpdGlvbig0KTtcblxuXHRpZih0aGlzLl9jYnMub25jb21tZW50KSB0aGlzLl9jYnMub25jb21tZW50KHZhbHVlKTtcblx0aWYodGhpcy5fY2JzLm9uY29tbWVudGVuZCkgdGhpcy5fY2JzLm9uY29tbWVudGVuZCgpO1xufTtcblxuUGFyc2VyLnByb3RvdHlwZS5vbmNkYXRhID0gZnVuY3Rpb24odmFsdWUpe1xuXHR0aGlzLl91cGRhdGVQb3NpdGlvbigxKTtcblxuXHRpZih0aGlzLl9vcHRpb25zLnhtbE1vZGUpe1xuXHRcdGlmKHRoaXMuX2Nicy5vbmNkYXRhc3RhcnQpIHRoaXMuX2Nicy5vbmNkYXRhc3RhcnQoKTtcblx0XHRpZih0aGlzLl9jYnMub250ZXh0KSB0aGlzLl9jYnMub250ZXh0KHZhbHVlKTtcblx0XHRpZih0aGlzLl9jYnMub25jZGF0YWVuZCkgdGhpcy5fY2JzLm9uY2RhdGFlbmQoKTtcblx0fSBlbHNlIHtcblx0XHR0aGlzLm9uY29tbWVudChcIltDREFUQVtcIiArIHZhbHVlICsgXCJdXVwiKTtcblx0fVxufTtcblxuUGFyc2VyLnByb3RvdHlwZS5vbmVycm9yID0gZnVuY3Rpb24oZXJyKXtcblx0aWYodGhpcy5fY2JzLm9uZXJyb3IpIHRoaXMuX2Nicy5vbmVycm9yKGVycik7XG59O1xuXG5QYXJzZXIucHJvdG90eXBlLm9uZW5kID0gZnVuY3Rpb24oKXtcblx0aWYodGhpcy5fY2JzLm9uY2xvc2V0YWcpe1xuXHRcdGZvcihcblx0XHRcdHZhciBpID0gdGhpcy5fc3RhY2subGVuZ3RoO1xuXHRcdFx0aSA+IDA7XG5cdFx0XHR0aGlzLl9jYnMub25jbG9zZXRhZyh0aGlzLl9zdGFja1stLWldKVxuXHRcdCk7XG5cdH1cblx0aWYodGhpcy5fY2JzLm9uZW5kKSB0aGlzLl9jYnMub25lbmQoKTtcbn07XG5cblxuLy9SZXNldHMgdGhlIHBhcnNlciB0byBhIGJsYW5rIHN0YXRlLCByZWFkeSB0byBwYXJzZSBhIG5ldyBIVE1MIGRvY3VtZW50XG5QYXJzZXIucHJvdG90eXBlLnJlc2V0ID0gZnVuY3Rpb24oKXtcblx0aWYodGhpcy5fY2JzLm9ucmVzZXQpIHRoaXMuX2Nicy5vbnJlc2V0KCk7XG5cdHRoaXMuX3Rva2VuaXplci5yZXNldCgpO1xuXG5cdHRoaXMuX3RhZ25hbWUgPSBcIlwiO1xuXHR0aGlzLl9hdHRyaWJuYW1lID0gXCJcIjtcblx0dGhpcy5fYXR0cmlicyA9IG51bGw7XG5cdHRoaXMuX3N0YWNrID0gW107XG5cdHRoaXMuX2RvbmUgPSBmYWxzZTtcbn07XG5cbi8vUGFyc2VzIGEgY29tcGxldGUgSFRNTCBkb2N1bWVudCBhbmQgcHVzaGVzIGl0IHRvIHRoZSBoYW5kbGVyXG5QYXJzZXIucHJvdG90eXBlLnBhcnNlQ29tcGxldGUgPSBmdW5jdGlvbihkYXRhKXtcblx0dGhpcy5yZXNldCgpO1xuXHR0aGlzLmVuZChkYXRhKTtcbn07XG5cblBhcnNlci5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbihjaHVuayl7XG5cdGlmKHRoaXMuX2RvbmUpIHRoaXMub25lcnJvcihFcnJvcihcIi53cml0ZSgpIGFmdGVyIGRvbmUhXCIpKTtcblx0dGhpcy5fdG9rZW5pemVyLndyaXRlKGNodW5rKTtcbn07XG5cblBhcnNlci5wcm90b3R5cGUuZW5kID0gZnVuY3Rpb24oY2h1bmspe1xuXHRpZih0aGlzLl9kb25lKSB0aGlzLm9uZXJyb3IoRXJyb3IoXCIuZW5kKCkgYWZ0ZXIgZG9uZSFcIikpO1xuXHR0aGlzLl90b2tlbml6ZXIuZW5kKGNodW5rKTtcblx0dGhpcy5fZG9uZSA9IHRydWU7XG59O1xuXG4vL2FsaWFzIGZvciBiYWNrd2FyZHMgY29tcGF0XG5QYXJzZXIucHJvdG90eXBlLnBhcnNlQ2h1bmsgPSBQYXJzZXIucHJvdG90eXBlLndyaXRlO1xuUGFyc2VyLnByb3RvdHlwZS5kb25lID0gUGFyc2VyLnByb3RvdHlwZS5lbmQ7XG5cbm1vZHVsZS5leHBvcnRzID0gUGFyc2VyO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBUb2tlbml6ZXI7XG5cbnZhciBlbnRpdHlNYXAgPSByZXF1aXJlKFwiLi9lbnRpdGllcy9lbnRpdGllcy5qc29uXCIpLFxuICAgIGxlZ2FjeU1hcCA9IHJlcXVpcmUoXCIuL2VudGl0aWVzL2xlZ2FjeS5qc29uXCIpLFxuICAgIHhtbE1hcCAgICA9IHJlcXVpcmUoXCIuL2VudGl0aWVzL3htbC5qc29uXCIpLFxuICAgIGRlY29kZU1hcCA9IHJlcXVpcmUoXCIuL2VudGl0aWVzL2RlY29kZS5qc29uXCIpLFxuXG4gICAgaSA9IDAsXG5cbiAgICBURVhUICAgICAgICAgICAgICAgICAgICAgID0gaSsrLFxuICAgIEJFRk9SRV9UQUdfTkFNRSAgICAgICAgICAgPSBpKyssIC8vYWZ0ZXIgPFxuICAgIElOX1RBR19OQU1FICAgICAgICAgICAgICAgPSBpKyssXG4gICAgSU5fU0VMRl9DTE9TSU5HX1RBRyAgICAgICA9IGkrKyxcbiAgICBCRUZPUkVfQ0xPU0lOR19UQUdfTkFNRSAgID0gaSsrLFxuICAgIElOX0NMT1NJTkdfVEFHX05BTUUgICAgICAgPSBpKyssXG4gICAgQUZURVJfQ0xPU0lOR19UQUdfTkFNRSAgICA9IGkrKyxcblxuICAgIC8vYXR0cmlidXRlc1xuICAgIEJFRk9SRV9BVFRSSUJVVEVfTkFNRSAgICAgPSBpKyssXG4gICAgSU5fQVRUUklCVVRFX05BTUUgICAgICAgICA9IGkrKyxcbiAgICBBRlRFUl9BVFRSSUJVVEVfTkFNRSAgICAgID0gaSsrLFxuICAgIEJFRk9SRV9BVFRSSUJVVEVfVkFMVUUgICAgPSBpKyssXG4gICAgSU5fQVRUUklCVVRFX1ZBTFVFX0RRICAgICA9IGkrKywgLy8gXCJcbiAgICBJTl9BVFRSSUJVVEVfVkFMVUVfU1EgICAgID0gaSsrLCAvLyAnXG4gICAgSU5fQVRUUklCVVRFX1ZBTFVFX05RICAgICA9IGkrKyxcblxuICAgIC8vZGVjbGFyYXRpb25zXG4gICAgQkVGT1JFX0RFQ0xBUkFUSU9OICAgICAgICA9IGkrKywgLy8gIVxuICAgIElOX0RFQ0xBUkFUSU9OICAgICAgICAgICAgPSBpKyssXG5cbiAgICAvL3Byb2Nlc3NpbmcgaW5zdHJ1Y3Rpb25zXG4gICAgSU5fUFJPQ0VTU0lOR19JTlNUUlVDVElPTiA9IGkrKywgLy8gP1xuXG4gICAgLy9jb21tZW50c1xuICAgIEJFRk9SRV9DT01NRU5UICAgICAgICAgICAgPSBpKyssXG4gICAgSU5fQ09NTUVOVCAgICAgICAgICAgICAgICA9IGkrKyxcbiAgICBBRlRFUl9DT01NRU5UXzEgICAgICAgICAgID0gaSsrLFxuICAgIEFGVEVSX0NPTU1FTlRfMiAgICAgICAgICAgPSBpKyssXG5cbiAgICAvL2NkYXRhXG4gICAgQkVGT1JFX0NEQVRBXzEgICAgICAgICAgICA9IGkrKywgLy8gW1xuICAgIEJFRk9SRV9DREFUQV8yICAgICAgICAgICAgPSBpKyssIC8vIENcbiAgICBCRUZPUkVfQ0RBVEFfMyAgICAgICAgICAgID0gaSsrLCAvLyBEXG4gICAgQkVGT1JFX0NEQVRBXzQgICAgICAgICAgICA9IGkrKywgLy8gQVxuICAgIEJFRk9SRV9DREFUQV81ICAgICAgICAgICAgPSBpKyssIC8vIFRcbiAgICBCRUZPUkVfQ0RBVEFfNiAgICAgICAgICAgID0gaSsrLCAvLyBBXG4gICAgSU5fQ0RBVEEgICAgICAgICAgICAgICAgICA9IGkrKywvLyBbXG4gICAgQUZURVJfQ0RBVEFfMSAgICAgICAgICAgICA9IGkrKywgLy8gXVxuICAgIEFGVEVSX0NEQVRBXzIgICAgICAgICAgICAgPSBpKyssIC8vIF1cblxuICAgIC8vc3BlY2lhbCB0YWdzXG4gICAgQkVGT1JFX1NQRUNJQUwgICAgICAgICAgICA9IGkrKywgLy9TXG4gICAgQkVGT1JFX1NQRUNJQUxfRU5EICAgICAgICA9IGkrKywgICAvL1NcblxuICAgIEJFRk9SRV9TQ1JJUFRfMSAgICAgICAgICAgPSBpKyssIC8vQ1xuICAgIEJFRk9SRV9TQ1JJUFRfMiAgICAgICAgICAgPSBpKyssIC8vUlxuICAgIEJFRk9SRV9TQ1JJUFRfMyAgICAgICAgICAgPSBpKyssIC8vSVxuICAgIEJFRk9SRV9TQ1JJUFRfNCAgICAgICAgICAgPSBpKyssIC8vUFxuICAgIEJFRk9SRV9TQ1JJUFRfNSAgICAgICAgICAgPSBpKyssIC8vVFxuICAgIEFGVEVSX1NDUklQVF8xICAgICAgICAgICAgPSBpKyssIC8vQ1xuICAgIEFGVEVSX1NDUklQVF8yICAgICAgICAgICAgPSBpKyssIC8vUlxuICAgIEFGVEVSX1NDUklQVF8zICAgICAgICAgICAgPSBpKyssIC8vSVxuICAgIEFGVEVSX1NDUklQVF80ICAgICAgICAgICAgPSBpKyssIC8vUFxuICAgIEFGVEVSX1NDUklQVF81ICAgICAgICAgICAgPSBpKyssIC8vVFxuXG4gICAgQkVGT1JFX1NUWUxFXzEgICAgICAgICAgICA9IGkrKywgLy9UXG4gICAgQkVGT1JFX1NUWUxFXzIgICAgICAgICAgICA9IGkrKywgLy9ZXG4gICAgQkVGT1JFX1NUWUxFXzMgICAgICAgICAgICA9IGkrKywgLy9MXG4gICAgQkVGT1JFX1NUWUxFXzQgICAgICAgICAgICA9IGkrKywgLy9FXG4gICAgQUZURVJfU1RZTEVfMSAgICAgICAgICAgICA9IGkrKywgLy9UXG4gICAgQUZURVJfU1RZTEVfMiAgICAgICAgICAgICA9IGkrKywgLy9ZXG4gICAgQUZURVJfU1RZTEVfMyAgICAgICAgICAgICA9IGkrKywgLy9MXG4gICAgQUZURVJfU1RZTEVfNCAgICAgICAgICAgICA9IGkrKywgLy9FXG5cbiAgICBCRUZPUkVfRU5USVRZICAgICAgICAgICAgID0gaSsrLCAvLyZcbiAgICBCRUZPUkVfTlVNRVJJQ19FTlRJVFkgICAgID0gaSsrLCAvLyNcbiAgICBJTl9OQU1FRF9FTlRJVFkgICAgICAgICAgID0gaSsrLFxuICAgIElOX05VTUVSSUNfRU5USVRZICAgICAgICAgPSBpKyssXG4gICAgSU5fSEVYX0VOVElUWSAgICAgICAgICAgICA9IGkrKywgLy9YXG5cbiAgICBqID0gMCxcblxuICAgIFNQRUNJQUxfTk9ORSAgICAgICAgICAgICAgPSBqKyssXG4gICAgU1BFQ0lBTF9TQ1JJUFQgICAgICAgICAgICA9IGorKyxcbiAgICBTUEVDSUFMX1NUWUxFICAgICAgICAgICAgID0gaisrO1xuXG5mdW5jdGlvbiB3aGl0ZXNwYWNlKGMpe1xuXHRyZXR1cm4gYyA9PT0gXCIgXCIgfHwgYyA9PT0gXCJcXG5cIiB8fCBjID09PSBcIlxcdFwiIHx8IGMgPT09IFwiXFxmXCIgfHwgYyA9PT0gXCJcXHJcIjtcbn1cblxuZnVuY3Rpb24gaWZFbHNlU3RhdGUodXBwZXIsIFNVQ0NFU1MsIEZBSUxVUkUpe1xuXHR2YXIgbG93ZXIgPSB1cHBlci50b0xvd2VyQ2FzZSgpO1xuXG5cdGlmKHVwcGVyID09PSBsb3dlcil7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uKGMpe1xuXHRcdFx0dGhpcy5fc3RhdGUgPSBjID09PSBsb3dlciA/IFNVQ0NFU1MgOiBGQUlMVVJFO1xuXHRcdH07XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uKGMpe1xuXHRcdFx0dGhpcy5fc3RhdGUgPSAoYyA9PT0gbG93ZXIgfHwgYyA9PT0gdXBwZXIpID8gU1VDQ0VTUyA6IEZBSUxVUkU7XG5cdFx0fTtcblx0fVxufVxuXG5mdW5jdGlvbiBjb25zdW1lU3BlY2lhbE5hbWVDaGFyKHVwcGVyLCBORVhUX1NUQVRFKXtcblx0dmFyIGxvd2VyID0gdXBwZXIudG9Mb3dlckNhc2UoKTtcblxuXHRyZXR1cm4gZnVuY3Rpb24oYyl7XG5cdFx0aWYoYyA9PT0gbG93ZXIgfHwgYyA9PT0gdXBwZXIpe1xuXHRcdFx0dGhpcy5fc3RhdGUgPSBORVhUX1NUQVRFO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLl9zdGF0ZSA9IElOX1RBR19OQU1FO1xuXHRcdFx0dGhpcy5faW5kZXgtLTsgLy9jb25zdW1lIHRoZSB0b2tlbiBhZ2FpblxuXHRcdH1cblx0fTtcbn1cblxuZnVuY3Rpb24gVG9rZW5pemVyKG9wdGlvbnMsIGNicyl7XG5cdHRoaXMuX3N0YXRlID0gVEVYVDtcblx0dGhpcy5fYnVmZmVyID0gXCJcIjtcblx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gMDtcblx0dGhpcy5faW5kZXggPSAwO1xuXHR0aGlzLl9iYXNlU3RhdGUgPSBURVhUO1xuXHR0aGlzLl9zcGVjaWFsID0gU1BFQ0lBTF9OT05FO1xuXHR0aGlzLl9jYnMgPSBjYnM7XG5cdHRoaXMuX3J1bm5pbmcgPSB0cnVlO1xuXHR0aGlzLl94bWxNb2RlID0gISEob3B0aW9ucyAmJiBvcHRpb25zLnhtbE1vZGUpO1xuXHR0aGlzLl9kZWNvZGVFbnRpdGllcyA9ICEhKG9wdGlvbnMgJiYgb3B0aW9ucy5kZWNvZGVFbnRpdGllcyk7XG59XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlVGV4dCA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIjxcIil7XG5cdFx0aWYodGhpcy5faW5kZXggPiB0aGlzLl9zZWN0aW9uU3RhcnQpe1xuXHRcdFx0dGhpcy5fY2JzLm9udGV4dCh0aGlzLl9nZXRTZWN0aW9uKCkpO1xuXHRcdH1cblx0XHR0aGlzLl9zdGF0ZSA9IEJFRk9SRV9UQUdfTkFNRTtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleDtcblx0fSBlbHNlIGlmKHRoaXMuX2RlY29kZUVudGl0aWVzICYmIHRoaXMuX3NwZWNpYWwgPT09IFNQRUNJQUxfTk9ORSAmJiBjID09PSBcIiZcIil7XG5cdFx0aWYodGhpcy5faW5kZXggPiB0aGlzLl9zZWN0aW9uU3RhcnQpe1xuXHRcdFx0dGhpcy5fY2JzLm9udGV4dCh0aGlzLl9nZXRTZWN0aW9uKCkpO1xuXHRcdH1cblx0XHR0aGlzLl9iYXNlU3RhdGUgPSBURVhUO1xuXHRcdHRoaXMuX3N0YXRlID0gQkVGT1JFX0VOVElUWTtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleDtcblx0fVxufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVCZWZvcmVUYWdOYW1lID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiL1wiKXtcblx0XHR0aGlzLl9zdGF0ZSA9IEJFRk9SRV9DTE9TSU5HX1RBR19OQU1FO1xuXHR9IGVsc2UgaWYoYyA9PT0gXCI+XCIgfHwgdGhpcy5fc3BlY2lhbCAhPT0gU1BFQ0lBTF9OT05FIHx8IHdoaXRlc3BhY2UoYykpIHtcblx0XHR0aGlzLl9zdGF0ZSA9IFRFWFQ7XG5cdH0gZWxzZSBpZihjID09PSBcIiFcIil7XG5cdFx0dGhpcy5fc3RhdGUgPSBCRUZPUkVfREVDTEFSQVRJT047XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXggKyAxO1xuXHR9IGVsc2UgaWYoYyA9PT0gXCI/XCIpe1xuXHRcdHRoaXMuX3N0YXRlID0gSU5fUFJPQ0VTU0lOR19JTlNUUlVDVElPTjtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleCArIDE7XG5cdH0gZWxzZSBpZihjID09PSBcIjxcIil7XG5cdFx0dGhpcy5fY2JzLm9udGV4dCh0aGlzLl9nZXRTZWN0aW9uKCkpO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4O1xuXHR9IGVsc2Uge1xuXHRcdHRoaXMuX3N0YXRlID0gKCF0aGlzLl94bWxNb2RlICYmIChjID09PSBcInNcIiB8fCBjID09PSBcIlNcIikpID9cblx0XHRcdFx0XHRcdEJFRk9SRV9TUEVDSUFMIDogSU5fVEFHX05BTUU7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXg7XG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlSW5UYWdOYW1lID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiL1wiIHx8IGMgPT09IFwiPlwiIHx8IHdoaXRlc3BhY2UoYykpe1xuXHRcdHRoaXMuX2VtaXRUb2tlbihcIm9ub3BlbnRhZ25hbWVcIik7XG5cdFx0dGhpcy5fc3RhdGUgPSBCRUZPUkVfQVRUUklCVVRFX05BTUU7XG5cdFx0dGhpcy5faW5kZXgtLTtcblx0fVxufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVCZWZvcmVDbG9zZWluZ1RhZ05hbWUgPSBmdW5jdGlvbihjKXtcblx0aWYod2hpdGVzcGFjZShjKSk7XG5cdGVsc2UgaWYoYyA9PT0gXCI+XCIpe1xuXHRcdHRoaXMuX3N0YXRlID0gVEVYVDtcblx0fSBlbHNlIGlmKHRoaXMuX3NwZWNpYWwgIT09IFNQRUNJQUxfTk9ORSl7XG5cdFx0aWYoYyA9PT0gXCJzXCIgfHwgYyA9PT0gXCJTXCIpe1xuXHRcdFx0dGhpcy5fc3RhdGUgPSBCRUZPUkVfU1BFQ0lBTF9FTkQ7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuX3N0YXRlID0gVEVYVDtcblx0XHRcdHRoaXMuX2luZGV4LS07XG5cdFx0fVxuXHR9IGVsc2Uge1xuXHRcdHRoaXMuX3N0YXRlID0gSU5fQ0xPU0lOR19UQUdfTkFNRTtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleDtcblx0fVxufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVJbkNsb3NlaW5nVGFnTmFtZSA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIj5cIiB8fCB3aGl0ZXNwYWNlKGMpKXtcblx0XHR0aGlzLl9lbWl0VG9rZW4oXCJvbmNsb3NldGFnXCIpO1xuXHRcdHRoaXMuX3N0YXRlID0gQUZURVJfQ0xPU0lOR19UQUdfTkFNRTtcblx0XHR0aGlzLl9pbmRleC0tO1xuXHR9XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUFmdGVyQ2xvc2VpbmdUYWdOYW1lID0gZnVuY3Rpb24oYyl7XG5cdC8vc2tpcCBldmVyeXRoaW5nIHVudGlsIFwiPlwiXG5cdGlmKGMgPT09IFwiPlwiKXtcblx0XHR0aGlzLl9zdGF0ZSA9IFRFWFQ7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXggKyAxO1xuXHR9XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUJlZm9yZUF0dHJpYnV0ZU5hbWUgPSBmdW5jdGlvbihjKXtcblx0aWYoYyA9PT0gXCI+XCIpe1xuXHRcdHRoaXMuX2Nicy5vbm9wZW50YWdlbmQoKTtcblx0XHR0aGlzLl9zdGF0ZSA9IFRFWFQ7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXggKyAxO1xuXHR9IGVsc2UgaWYoYyA9PT0gXCIvXCIpe1xuXHRcdHRoaXMuX3N0YXRlID0gSU5fU0VMRl9DTE9TSU5HX1RBRztcblx0fSBlbHNlIGlmKCF3aGl0ZXNwYWNlKGMpKXtcblx0XHR0aGlzLl9zdGF0ZSA9IElOX0FUVFJJQlVURV9OQU1FO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4O1xuXHR9XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUluU2VsZkNsb3NpbmdUYWcgPSBmdW5jdGlvbihjKXtcblx0aWYoYyA9PT0gXCI+XCIpe1xuXHRcdHRoaXMuX2Nicy5vbnNlbGZjbG9zaW5ndGFnKCk7XG5cdFx0dGhpcy5fc3RhdGUgPSBURVhUO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4ICsgMTtcblx0fSBlbHNlIGlmKCF3aGl0ZXNwYWNlKGMpKXtcblx0XHR0aGlzLl9zdGF0ZSA9IEJFRk9SRV9BVFRSSUJVVEVfTkFNRTtcblx0XHR0aGlzLl9pbmRleC0tO1xuXHR9XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUluQXR0cmlidXRlTmFtZSA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIj1cIiB8fCBjID09PSBcIi9cIiB8fCBjID09PSBcIj5cIiB8fCB3aGl0ZXNwYWNlKGMpKXtcblx0XHRpZih0aGlzLl9pbmRleCA+IHRoaXMuX3NlY3Rpb25TdGFydCl7XG5cdFx0XHR0aGlzLl9jYnMub25hdHRyaWJuYW1lKHRoaXMuX2dldFNlY3Rpb24oKSk7XG5cdFx0fVxuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IC0xO1xuXHRcdHRoaXMuX3N0YXRlID0gQUZURVJfQVRUUklCVVRFX05BTUU7XG5cdFx0dGhpcy5faW5kZXgtLTtcblx0fVxufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVBZnRlckF0dHJpYnV0ZU5hbWUgPSBmdW5jdGlvbihjKXtcblx0aWYoYyA9PT0gXCI9XCIpe1xuXHRcdHRoaXMuX3N0YXRlID0gQkVGT1JFX0FUVFJJQlVURV9WQUxVRTtcblx0fSBlbHNlIGlmKGMgPT09IFwiL1wiIHx8IGMgPT09IFwiPlwiKXtcblx0XHR0aGlzLl9jYnMub25hdHRyaWJlbmQoKTtcblx0XHR0aGlzLl9zdGF0ZSA9IEJFRk9SRV9BVFRSSUJVVEVfTkFNRTtcblx0XHR0aGlzLl9pbmRleC0tO1xuXHR9IGVsc2UgaWYoIXdoaXRlc3BhY2UoYykpe1xuXHRcdHRoaXMuX2Nicy5vbmF0dHJpYmVuZCgpO1xuXHRcdHRoaXMuX3N0YXRlID0gSU5fQVRUUklCVVRFX05BTUU7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXg7XG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlQXR0cmlidXRlVmFsdWUgPSBmdW5jdGlvbihjKXtcblx0aWYoYyA9PT0gXCJcXFwiXCIpe1xuXHRcdHRoaXMuX3N0YXRlID0gSU5fQVRUUklCVVRFX1ZBTFVFX0RRO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4ICsgMTtcblx0fSBlbHNlIGlmKGMgPT09IFwiJ1wiKXtcblx0XHR0aGlzLl9zdGF0ZSA9IElOX0FUVFJJQlVURV9WQUxVRV9TUTtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleCArIDE7XG5cdH0gZWxzZSBpZighd2hpdGVzcGFjZShjKSl7XG5cdFx0dGhpcy5fc3RhdGUgPSBJTl9BVFRSSUJVVEVfVkFMVUVfTlE7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXg7XG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlSW5BdHRyaWJ1dGVWYWx1ZURvdWJsZVF1b3RlcyA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIlxcXCJcIil7XG5cdFx0dGhpcy5fZW1pdFRva2VuKFwib25hdHRyaWJkYXRhXCIpO1xuXHRcdHRoaXMuX2Nicy5vbmF0dHJpYmVuZCgpO1xuXHRcdHRoaXMuX3N0YXRlID0gQkVGT1JFX0FUVFJJQlVURV9OQU1FO1xuXHR9IGVsc2UgaWYodGhpcy5fZGVjb2RlRW50aXRpZXMgJiYgYyA9PT0gXCImXCIpe1xuXHRcdHRoaXMuX2VtaXRUb2tlbihcIm9uYXR0cmliZGF0YVwiKTtcblx0XHR0aGlzLl9iYXNlU3RhdGUgPSB0aGlzLl9zdGF0ZTtcblx0XHR0aGlzLl9zdGF0ZSA9IEJFRk9SRV9FTlRJVFk7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXg7XG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlSW5BdHRyaWJ1dGVWYWx1ZVNpbmdsZVF1b3RlcyA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIidcIil7XG5cdFx0dGhpcy5fZW1pdFRva2VuKFwib25hdHRyaWJkYXRhXCIpO1xuXHRcdHRoaXMuX2Nicy5vbmF0dHJpYmVuZCgpO1xuXHRcdHRoaXMuX3N0YXRlID0gQkVGT1JFX0FUVFJJQlVURV9OQU1FO1xuXHR9IGVsc2UgaWYodGhpcy5fZGVjb2RlRW50aXRpZXMgJiYgYyA9PT0gXCImXCIpe1xuXHRcdHRoaXMuX2VtaXRUb2tlbihcIm9uYXR0cmliZGF0YVwiKTtcblx0XHR0aGlzLl9iYXNlU3RhdGUgPSB0aGlzLl9zdGF0ZTtcblx0XHR0aGlzLl9zdGF0ZSA9IEJFRk9SRV9FTlRJVFk7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXg7XG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlSW5BdHRyaWJ1dGVWYWx1ZU5vUXVvdGVzID0gZnVuY3Rpb24oYyl7XG5cdGlmKHdoaXRlc3BhY2UoYykgfHwgYyA9PT0gXCI+XCIpe1xuXHRcdHRoaXMuX2VtaXRUb2tlbihcIm9uYXR0cmliZGF0YVwiKTtcblx0XHR0aGlzLl9jYnMub25hdHRyaWJlbmQoKTtcblx0XHR0aGlzLl9zdGF0ZSA9IEJFRk9SRV9BVFRSSUJVVEVfTkFNRTtcblx0XHR0aGlzLl9pbmRleC0tO1xuXHR9IGVsc2UgaWYodGhpcy5fZGVjb2RlRW50aXRpZXMgJiYgYyA9PT0gXCImXCIpe1xuXHRcdHRoaXMuX2VtaXRUb2tlbihcIm9uYXR0cmliZGF0YVwiKTtcblx0XHR0aGlzLl9iYXNlU3RhdGUgPSB0aGlzLl9zdGF0ZTtcblx0XHR0aGlzLl9zdGF0ZSA9IEJFRk9SRV9FTlRJVFk7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXg7XG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlRGVjbGFyYXRpb24gPSBmdW5jdGlvbihjKXtcblx0dGhpcy5fc3RhdGUgPSBjID09PSBcIltcIiA/IEJFRk9SRV9DREFUQV8xIDpcblx0XHRcdFx0XHRjID09PSBcIi1cIiA/IEJFRk9SRV9DT01NRU5UIDpcblx0XHRcdFx0XHRcdElOX0RFQ0xBUkFUSU9OO1xufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVJbkRlY2xhcmF0aW9uID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiPlwiKXtcblx0XHR0aGlzLl9jYnMub25kZWNsYXJhdGlvbih0aGlzLl9nZXRTZWN0aW9uKCkpO1xuXHRcdHRoaXMuX3N0YXRlID0gVEVYVDtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleCArIDE7XG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlSW5Qcm9jZXNzaW5nSW5zdHJ1Y3Rpb24gPSBmdW5jdGlvbihjKXtcblx0aWYoYyA9PT0gXCI+XCIpe1xuXHRcdHRoaXMuX2Nicy5vbnByb2Nlc3NpbmdpbnN0cnVjdGlvbih0aGlzLl9nZXRTZWN0aW9uKCkpO1xuXHRcdHRoaXMuX3N0YXRlID0gVEVYVDtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleCArIDE7XG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlQ29tbWVudCA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIi1cIil7XG5cdFx0dGhpcy5fc3RhdGUgPSBJTl9DT01NRU5UO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4ICsgMTtcblx0fSBlbHNlIHtcblx0XHR0aGlzLl9zdGF0ZSA9IElOX0RFQ0xBUkFUSU9OO1xuXHR9XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUluQ29tbWVudCA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIi1cIikgdGhpcy5fc3RhdGUgPSBBRlRFUl9DT01NRU5UXzE7XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUFmdGVyQ29tbWVudDEgPSBpZkVsc2VTdGF0ZShcIi1cIiwgQUZURVJfQ09NTUVOVF8yLCBJTl9DT01NRU5UKTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVBZnRlckNvbW1lbnQyID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiPlwiKXtcblx0XHQvL3JlbW92ZSAyIHRyYWlsaW5nIGNoYXJzXG5cdFx0dGhpcy5fY2JzLm9uY29tbWVudCh0aGlzLl9idWZmZXIuc3Vic3RyaW5nKHRoaXMuX3NlY3Rpb25TdGFydCwgdGhpcy5faW5kZXggLSAyKSk7XG5cdFx0dGhpcy5fc3RhdGUgPSBURVhUO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4ICsgMTtcblx0fSBlbHNlIGlmKGMgIT09IFwiLVwiKXtcblx0XHR0aGlzLl9zdGF0ZSA9IElOX0NPTU1FTlQ7XG5cdH1cblx0Ly8gZWxzZTogc3RheSBpbiBBRlRFUl9DT01NRU5UXzIgKGAtLS0+YClcbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlQ2RhdGExID0gaWZFbHNlU3RhdGUoXCJDXCIsIEJFRk9SRV9DREFUQV8yLCBJTl9ERUNMQVJBVElPTik7XG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUJlZm9yZUNkYXRhMiA9IGlmRWxzZVN0YXRlKFwiRFwiLCBCRUZPUkVfQ0RBVEFfMywgSU5fREVDTEFSQVRJT04pO1xuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVCZWZvcmVDZGF0YTMgPSBpZkVsc2VTdGF0ZShcIkFcIiwgQkVGT1JFX0NEQVRBXzQsIElOX0RFQ0xBUkFUSU9OKTtcblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlQ2RhdGE0ID0gaWZFbHNlU3RhdGUoXCJUXCIsIEJFRk9SRV9DREFUQV81LCBJTl9ERUNMQVJBVElPTik7XG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUJlZm9yZUNkYXRhNSA9IGlmRWxzZVN0YXRlKFwiQVwiLCBCRUZPUkVfQ0RBVEFfNiwgSU5fREVDTEFSQVRJT04pO1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUJlZm9yZUNkYXRhNiA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIltcIil7XG5cdFx0dGhpcy5fc3RhdGUgPSBJTl9DREFUQTtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleCArIDE7XG5cdH0gZWxzZSB7XG5cdFx0dGhpcy5fc3RhdGUgPSBJTl9ERUNMQVJBVElPTjtcblx0fVxufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVJbkNkYXRhID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiXVwiKSB0aGlzLl9zdGF0ZSA9IEFGVEVSX0NEQVRBXzE7XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUFmdGVyQ2RhdGExID0gaWZFbHNlU3RhdGUoXCJdXCIsIEFGVEVSX0NEQVRBXzIsIElOX0NEQVRBKTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVBZnRlckNkYXRhMiA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIj5cIil7XG5cdFx0Ly9yZW1vdmUgMiB0cmFpbGluZyBjaGFyc1xuXHRcdHRoaXMuX2Nicy5vbmNkYXRhKHRoaXMuX2J1ZmZlci5zdWJzdHJpbmcodGhpcy5fc2VjdGlvblN0YXJ0LCB0aGlzLl9pbmRleCAtIDIpKTtcblx0XHR0aGlzLl9zdGF0ZSA9IFRFWFQ7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXggKyAxO1xuXHR9IGVsc2UgaWYgKGMgIT09IFwiXVwiKSB7XG5cdFx0dGhpcy5fc3RhdGUgPSBJTl9DREFUQTtcblx0fVxuXHQvL2Vsc2U6IHN0YXkgaW4gQUZURVJfQ0RBVEFfMiAoYF1dXT5gKVxufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVCZWZvcmVTcGVjaWFsID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiY1wiIHx8IGMgPT09IFwiQ1wiKXtcblx0XHR0aGlzLl9zdGF0ZSA9IEJFRk9SRV9TQ1JJUFRfMTtcblx0fSBlbHNlIGlmKGMgPT09IFwidFwiIHx8IGMgPT09IFwiVFwiKXtcblx0XHR0aGlzLl9zdGF0ZSA9IEJFRk9SRV9TVFlMRV8xO1xuXHR9IGVsc2Uge1xuXHRcdHRoaXMuX3N0YXRlID0gSU5fVEFHX05BTUU7XG5cdFx0dGhpcy5faW5kZXgtLTsgLy9jb25zdW1lIHRoZSB0b2tlbiBhZ2FpblxuXHR9XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUJlZm9yZVNwZWNpYWxFbmQgPSBmdW5jdGlvbihjKXtcblx0aWYodGhpcy5fc3BlY2lhbCA9PT0gU1BFQ0lBTF9TQ1JJUFQgJiYgKGMgPT09IFwiY1wiIHx8IGMgPT09IFwiQ1wiKSl7XG5cdFx0dGhpcy5fc3RhdGUgPSBBRlRFUl9TQ1JJUFRfMTtcblx0fSBlbHNlIGlmKHRoaXMuX3NwZWNpYWwgPT09IFNQRUNJQUxfU1RZTEUgJiYgKGMgPT09IFwidFwiIHx8IGMgPT09IFwiVFwiKSl7XG5cdFx0dGhpcy5fc3RhdGUgPSBBRlRFUl9TVFlMRV8xO1xuXHR9XG5cdGVsc2UgdGhpcy5fc3RhdGUgPSBURVhUO1xufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVCZWZvcmVTY3JpcHQxID0gY29uc3VtZVNwZWNpYWxOYW1lQ2hhcihcIlJcIiwgQkVGT1JFX1NDUklQVF8yKTtcblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlU2NyaXB0MiA9IGNvbnN1bWVTcGVjaWFsTmFtZUNoYXIoXCJJXCIsIEJFRk9SRV9TQ1JJUFRfMyk7XG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUJlZm9yZVNjcmlwdDMgPSBjb25zdW1lU3BlY2lhbE5hbWVDaGFyKFwiUFwiLCBCRUZPUkVfU0NSSVBUXzQpO1xuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVCZWZvcmVTY3JpcHQ0ID0gY29uc3VtZVNwZWNpYWxOYW1lQ2hhcihcIlRcIiwgQkVGT1JFX1NDUklQVF81KTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVCZWZvcmVTY3JpcHQ1ID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiL1wiIHx8IGMgPT09IFwiPlwiIHx8IHdoaXRlc3BhY2UoYykpe1xuXHRcdHRoaXMuX3NwZWNpYWwgPSBTUEVDSUFMX1NDUklQVDtcblx0fVxuXHR0aGlzLl9zdGF0ZSA9IElOX1RBR19OQU1FO1xuXHR0aGlzLl9pbmRleC0tOyAvL2NvbnN1bWUgdGhlIHRva2VuIGFnYWluXG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUFmdGVyU2NyaXB0MSA9IGlmRWxzZVN0YXRlKFwiUlwiLCBBRlRFUl9TQ1JJUFRfMiwgVEVYVCk7XG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUFmdGVyU2NyaXB0MiA9IGlmRWxzZVN0YXRlKFwiSVwiLCBBRlRFUl9TQ1JJUFRfMywgVEVYVCk7XG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUFmdGVyU2NyaXB0MyA9IGlmRWxzZVN0YXRlKFwiUFwiLCBBRlRFUl9TQ1JJUFRfNCwgVEVYVCk7XG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUFmdGVyU2NyaXB0NCA9IGlmRWxzZVN0YXRlKFwiVFwiLCBBRlRFUl9TQ1JJUFRfNSwgVEVYVCk7XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQWZ0ZXJTY3JpcHQ1ID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiPlwiIHx8IHdoaXRlc3BhY2UoYykpe1xuXHRcdHRoaXMuX3NwZWNpYWwgPSBTUEVDSUFMX05PTkU7XG5cdFx0dGhpcy5fc3RhdGUgPSBJTl9DTE9TSU5HX1RBR19OQU1FO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4IC0gNjtcblx0XHR0aGlzLl9pbmRleC0tOyAvL3JlY29uc3VtZSB0aGUgdG9rZW5cblx0fVxuXHRlbHNlIHRoaXMuX3N0YXRlID0gVEVYVDtcbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlU3R5bGUxID0gY29uc3VtZVNwZWNpYWxOYW1lQ2hhcihcIllcIiwgQkVGT1JFX1NUWUxFXzIpO1xuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVCZWZvcmVTdHlsZTIgPSBjb25zdW1lU3BlY2lhbE5hbWVDaGFyKFwiTFwiLCBCRUZPUkVfU1RZTEVfMyk7XG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUJlZm9yZVN0eWxlMyA9IGNvbnN1bWVTcGVjaWFsTmFtZUNoYXIoXCJFXCIsIEJFRk9SRV9TVFlMRV80KTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVCZWZvcmVTdHlsZTQgPSBmdW5jdGlvbihjKXtcblx0aWYoYyA9PT0gXCIvXCIgfHwgYyA9PT0gXCI+XCIgfHwgd2hpdGVzcGFjZShjKSl7XG5cdFx0dGhpcy5fc3BlY2lhbCA9IFNQRUNJQUxfU1RZTEU7XG5cdH1cblx0dGhpcy5fc3RhdGUgPSBJTl9UQUdfTkFNRTtcblx0dGhpcy5faW5kZXgtLTsgLy9jb25zdW1lIHRoZSB0b2tlbiBhZ2FpblxufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVBZnRlclN0eWxlMSA9IGlmRWxzZVN0YXRlKFwiWVwiLCBBRlRFUl9TVFlMRV8yLCBURVhUKTtcblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQWZ0ZXJTdHlsZTIgPSBpZkVsc2VTdGF0ZShcIkxcIiwgQUZURVJfU1RZTEVfMywgVEVYVCk7XG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUFmdGVyU3R5bGUzID0gaWZFbHNlU3RhdGUoXCJFXCIsIEFGVEVSX1NUWUxFXzQsIFRFWFQpO1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUFmdGVyU3R5bGU0ID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiPlwiIHx8IHdoaXRlc3BhY2UoYykpe1xuXHRcdHRoaXMuX3NwZWNpYWwgPSBTUEVDSUFMX05PTkU7XG5cdFx0dGhpcy5fc3RhdGUgPSBJTl9DTE9TSU5HX1RBR19OQU1FO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4IC0gNTtcblx0XHR0aGlzLl9pbmRleC0tOyAvL3JlY29uc3VtZSB0aGUgdG9rZW5cblx0fVxuXHRlbHNlIHRoaXMuX3N0YXRlID0gVEVYVDtcbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlRW50aXR5ID0gaWZFbHNlU3RhdGUoXCIjXCIsIEJFRk9SRV9OVU1FUklDX0VOVElUWSwgSU5fTkFNRURfRU5USVRZKTtcblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlTnVtZXJpY0VudGl0eSA9IGlmRWxzZVN0YXRlKFwiWFwiLCBJTl9IRVhfRU5USVRZLCBJTl9OVU1FUklDX0VOVElUWSk7XG5cbi8vZm9yIGVudGl0aWVzIHdpdGhpbiBhdHRyaWJ1dGVzXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9wYXJzZU5hbWVkRW50aXR5U3RyaWN0ID0gZnVuY3Rpb24oKXtcblx0Ly9vZmZzZXQgPSAxXG5cdGlmKHRoaXMuX3NlY3Rpb25TdGFydCArIDEgPCB0aGlzLl9pbmRleCl7XG5cdFx0dmFyIGVudGl0eSA9IHRoaXMuX2J1ZmZlci5zdWJzdHJpbmcodGhpcy5fc2VjdGlvblN0YXJ0ICsgMSwgdGhpcy5faW5kZXgpLFxuXHRcdCAgICBtYXAgPSB0aGlzLl94bWxNb2RlID8geG1sTWFwIDogZW50aXR5TWFwO1xuXG5cdFx0aWYobWFwLmhhc093blByb3BlcnR5KGVudGl0eSkpe1xuXHRcdFx0dGhpcy5fZW1pdFBhcnRpYWwobWFwW2VudGl0eV0pO1xuXHRcdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXggKyAxO1xuXHRcdH1cblx0fVxufTtcblxuXG4vL3BhcnNlcyBsZWdhY3kgZW50aXRpZXMgKHdpdGhvdXQgdHJhaWxpbmcgc2VtaWNvbG9uKVxuVG9rZW5pemVyLnByb3RvdHlwZS5fcGFyc2VMZWdhY3lFbnRpdHkgPSBmdW5jdGlvbigpe1xuXHR2YXIgc3RhcnQgPSB0aGlzLl9zZWN0aW9uU3RhcnQgKyAxLFxuXHQgICAgbGltaXQgPSB0aGlzLl9pbmRleCAtIHN0YXJ0O1xuXG5cdGlmKGxpbWl0ID4gNikgbGltaXQgPSA2OyAvL3RoZSBtYXggbGVuZ3RoIG9mIGxlZ2FjeSBlbnRpdGllcyBpcyA2XG5cblx0d2hpbGUobGltaXQgPj0gMil7IC8vdGhlIG1pbiBsZW5ndGggb2YgbGVnYWN5IGVudGl0aWVzIGlzIDJcblx0XHR2YXIgZW50aXR5ID0gdGhpcy5fYnVmZmVyLnN1YnN0cihzdGFydCwgbGltaXQpO1xuXG5cdFx0aWYobGVnYWN5TWFwLmhhc093blByb3BlcnR5KGVudGl0eSkpe1xuXHRcdFx0dGhpcy5fZW1pdFBhcnRpYWwobGVnYWN5TWFwW2VudGl0eV0pO1xuXHRcdFx0dGhpcy5fc2VjdGlvblN0YXJ0ICs9IGxpbWl0ICsgMjtcblx0XHRcdGJyZWFrO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRsaW1pdC0tO1xuXHRcdH1cblx0fVxufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVJbk5hbWVkRW50aXR5ID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiO1wiKXtcblx0XHR0aGlzLl9wYXJzZU5hbWVkRW50aXR5U3RyaWN0KCk7XG5cdFx0aWYodGhpcy5fc2VjdGlvblN0YXJ0ICsgMSA8IHRoaXMuX2luZGV4ICYmICF0aGlzLl94bWxNb2RlKXtcblx0XHRcdHRoaXMuX3BhcnNlTGVnYWN5RW50aXR5KCk7XG5cdFx0fVxuXHRcdHRoaXMuX3N0YXRlID0gdGhpcy5fYmFzZVN0YXRlO1xuXHR9IGVsc2UgaWYoKGMgPCBcImFcIiB8fCBjID4gXCJ6XCIpICYmIChjIDwgXCJBXCIgfHwgYyA+IFwiWlwiKSAmJiAoYyA8IFwiMFwiIHx8IGMgPiBcIjlcIikpe1xuXHRcdGlmKHRoaXMuX3htbE1vZGUpO1xuXHRcdGVsc2UgaWYodGhpcy5fYmFzZVN0YXRlICE9PSBURVhUKXtcblx0XHRcdGlmKGMgIT09IFwiPVwiKXtcblx0XHRcdFx0dGhpcy5fcGFyc2VOYW1lZEVudGl0eVN0cmljdCgpO1xuXHRcdFx0XHR0aGlzLl9zZWN0aW9uU3RhcnQtLTsgLy9pbmNsdWRlIHRoZSBjdXJyZW50IGNoYXJhY3RlciBpbiB0aGUgc2VjdGlvblxuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLl9wYXJzZUxlZ2FjeUVudGl0eSgpO1xuXHRcdFx0dGhpcy5fc2VjdGlvblN0YXJ0LS07XG5cdFx0fVxuXHRcdHRoaXMuX3N0YXRlID0gdGhpcy5fYmFzZVN0YXRlO1xuXHRcdHRoaXMuX2luZGV4LS07XG5cdH1cbn07XG5cbi8vIG1vZGlmaWVkIHZlcnNpb24gb2YgaHR0cHM6Ly9naXRodWIuY29tL21hdGhpYXNieW5lbnMvaGUvYmxvYi9tYXN0ZXIvc3JjL2hlLmpzI0w5NC1MMTE5XG5mdW5jdGlvbiBkZWNvZGVDb2RlUG9pbnQoY29kZVBvaW50KXtcblx0dmFyIG91dHB1dCA9IFwiXCI7XG5cblx0aWYoKGNvZGVQb2ludCA+PSAweEQ4MDAgJiYgY29kZVBvaW50IDw9IDB4REZGRikgfHwgY29kZVBvaW50ID4gMHgxMEZGRkYpe1xuXHRcdHJldHVybiBcIlxcdUZGRkRcIjtcblx0fVxuXG5cdGlmKGNvZGVQb2ludCBpbiBkZWNvZGVNYXApe1xuXHRcdGNvZGVQb2ludCA9IGRlY29kZU1hcFtjb2RlUG9pbnRdO1xuXHR9XG5cblx0aWYoY29kZVBvaW50ID4gMHhGRkZGKXtcblx0XHRjb2RlUG9pbnQgLT0gMHgxMDAwMDtcblx0XHRvdXRwdXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShjb2RlUG9pbnQgPj4+IDEwICYgMHgzRkYgfCAweEQ4MDApO1xuXHRcdGNvZGVQb2ludCA9IDB4REMwMCB8IGNvZGVQb2ludCAmIDB4M0ZGO1xuXHR9XG5cblx0b3V0cHV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoY29kZVBvaW50KTtcblx0cmV0dXJuIG91dHB1dDtcbn1cblxuVG9rZW5pemVyLnByb3RvdHlwZS5fZGVjb2RlTnVtZXJpY0VudGl0eSA9IGZ1bmN0aW9uKG9mZnNldCwgYmFzZSl7XG5cdHZhciBzZWN0aW9uU3RhcnQgPSB0aGlzLl9zZWN0aW9uU3RhcnQgKyBvZmZzZXQ7XG5cblx0aWYoc2VjdGlvblN0YXJ0ICE9PSB0aGlzLl9pbmRleCl7XG5cdFx0Ly9wYXJzZSBlbnRpdHlcblx0XHR2YXIgZW50aXR5ID0gdGhpcy5fYnVmZmVyLnN1YnN0cmluZyhzZWN0aW9uU3RhcnQsIHRoaXMuX2luZGV4KTtcblx0XHR2YXIgcGFyc2VkID0gcGFyc2VJbnQoZW50aXR5LCBiYXNlKTtcblxuXHRcdGlmKHBhcnNlZCA9PT0gcGFyc2VkKXsgLy9ub3QgTmFOIChUT0RPOiB3aGVuIGNhbiB0aGlzIGhhcHBlbj8pXG5cdFx0XHR0aGlzLl9lbWl0UGFydGlhbChkZWNvZGVDb2RlUG9pbnQocGFyc2VkKSk7XG5cdFx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleDtcblx0XHR9XG5cdH1cblxuXHR0aGlzLl9zdGF0ZSA9IHRoaXMuX2Jhc2VTdGF0ZTtcbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlSW5OdW1lcmljRW50aXR5ID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiO1wiKXtcblx0XHR0aGlzLl9kZWNvZGVOdW1lcmljRW50aXR5KDIsIDEwKTtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQrKztcblx0fSBlbHNlIGlmKGMgPCBcIjBcIiB8fCBjID4gXCI5XCIpe1xuXHRcdGlmKCF0aGlzLl94bWxNb2RlKXtcblx0XHRcdHRoaXMuX2RlY29kZU51bWVyaWNFbnRpdHkoMiwgMTApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLl9zdGF0ZSA9IHRoaXMuX2Jhc2VTdGF0ZTtcblx0XHR9XG5cdFx0dGhpcy5faW5kZXgtLTtcblx0fVxufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVJbkhleEVudGl0eSA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIjtcIil7XG5cdFx0dGhpcy5fZGVjb2RlTnVtZXJpY0VudGl0eSgzLCAxNik7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0Kys7XG5cdH0gZWxzZSBpZigoYyA8IFwiYVwiIHx8IGMgPiBcImZcIikgJiYgKGMgPCBcIkFcIiB8fCBjID4gXCJGXCIpICYmIChjIDwgXCIwXCIgfHwgYyA+IFwiOVwiKSl7XG5cdFx0aWYoIXRoaXMuX3htbE1vZGUpe1xuXHRcdFx0dGhpcy5fZGVjb2RlTnVtZXJpY0VudGl0eSgzLCAxNik7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuX3N0YXRlID0gdGhpcy5fYmFzZVN0YXRlO1xuXHRcdH1cblx0XHR0aGlzLl9pbmRleC0tO1xuXHR9XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9jbGVhbnVwID0gZnVuY3Rpb24gKCkge1xuXHRpZih0aGlzLl9zZWN0aW9uU3RhcnQgPCAwKXtcblx0XHR0aGlzLl9idWZmZXIgPSBcIlwiO1xuXHRcdHRoaXMuX2luZGV4ID0gMDtcblx0fSBlbHNlIHtcblx0XHRpZih0aGlzLl9zdGF0ZSA9PT0gVEVYVCl7XG5cdFx0XHRpZih0aGlzLl9zZWN0aW9uU3RhcnQgIT09IHRoaXMuX2luZGV4KXtcblx0XHRcdFx0dGhpcy5fY2JzLm9udGV4dCh0aGlzLl9idWZmZXIuc3Vic3RyKHRoaXMuX3NlY3Rpb25TdGFydCkpO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5fYnVmZmVyID0gXCJcIjtcblx0XHRcdHRoaXMuX2luZGV4ID0gMDtcblx0XHR9IGVsc2UgaWYodGhpcy5fc2VjdGlvblN0YXJ0ID09PSB0aGlzLl9pbmRleCl7XG5cdFx0XHQvL3RoZSBzZWN0aW9uIGp1c3Qgc3RhcnRlZFxuXHRcdFx0dGhpcy5fYnVmZmVyID0gXCJcIjtcblx0XHRcdHRoaXMuX2luZGV4ID0gMDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly9yZW1vdmUgZXZlcnl0aGluZyB1bm5lY2Vzc2FyeVxuXHRcdFx0dGhpcy5fYnVmZmVyID0gdGhpcy5fYnVmZmVyLnN1YnN0cih0aGlzLl9zZWN0aW9uU3RhcnQpO1xuXHRcdFx0dGhpcy5faW5kZXggLT0gdGhpcy5fc2VjdGlvblN0YXJ0O1xuXHRcdH1cblxuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IDA7XG5cdH1cbn07XG5cbi8vVE9ETyBtYWtlIGV2ZW50cyBjb25kaXRpb25hbFxuVG9rZW5pemVyLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uKGNodW5rKXtcblx0dGhpcy5fYnVmZmVyICs9IGNodW5rO1xuXG5cdHdoaWxlKHRoaXMuX2luZGV4IDwgdGhpcy5fYnVmZmVyLmxlbmd0aCAmJiB0aGlzLl9ydW5uaW5nKXtcblx0XHR2YXIgYyA9IHRoaXMuX2J1ZmZlci5jaGFyQXQodGhpcy5faW5kZXgpO1xuXHRcdGlmKHRoaXMuX3N0YXRlID09PSBURVhUKSB7XG5cdFx0XHR0aGlzLl9zdGF0ZVRleHQoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfVEFHX05BTUUpe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVUYWdOYW1lKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gSU5fVEFHX05BTUUpIHtcblx0XHRcdHRoaXMuX3N0YXRlSW5UYWdOYW1lKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQkVGT1JFX0NMT1NJTkdfVEFHX05BTUUpe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVDbG9zZWluZ1RhZ05hbWUoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBJTl9DTE9TSU5HX1RBR19OQU1FKXtcblx0XHRcdHRoaXMuX3N0YXRlSW5DbG9zZWluZ1RhZ05hbWUoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBBRlRFUl9DTE9TSU5HX1RBR19OQU1FKXtcblx0XHRcdHRoaXMuX3N0YXRlQWZ0ZXJDbG9zZWluZ1RhZ05hbWUoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBJTl9TRUxGX0NMT1NJTkdfVEFHKXtcblx0XHRcdHRoaXMuX3N0YXRlSW5TZWxmQ2xvc2luZ1RhZyhjKTtcblx0XHR9XG5cblx0XHQvKlxuXHRcdCpcdGF0dHJpYnV0ZXNcblx0XHQqL1xuXHRcdGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9BVFRSSUJVVEVfTkFNRSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUJlZm9yZUF0dHJpYnV0ZU5hbWUoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBJTl9BVFRSSUJVVEVfTkFNRSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUluQXR0cmlidXRlTmFtZShjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEFGVEVSX0FUVFJJQlVURV9OQU1FKXtcblx0XHRcdHRoaXMuX3N0YXRlQWZ0ZXJBdHRyaWJ1dGVOYW1lKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQkVGT1JFX0FUVFJJQlVURV9WQUxVRSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUJlZm9yZUF0dHJpYnV0ZVZhbHVlKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gSU5fQVRUUklCVVRFX1ZBTFVFX0RRKXtcblx0XHRcdHRoaXMuX3N0YXRlSW5BdHRyaWJ1dGVWYWx1ZURvdWJsZVF1b3RlcyhjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IElOX0FUVFJJQlVURV9WQUxVRV9TUSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUluQXR0cmlidXRlVmFsdWVTaW5nbGVRdW90ZXMoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBJTl9BVFRSSUJVVEVfVkFMVUVfTlEpe1xuXHRcdFx0dGhpcy5fc3RhdGVJbkF0dHJpYnV0ZVZhbHVlTm9RdW90ZXMoYyk7XG5cdFx0fVxuXG5cdFx0Lypcblx0XHQqXHRkZWNsYXJhdGlvbnNcblx0XHQqL1xuXHRcdGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9ERUNMQVJBVElPTil7XG5cdFx0XHR0aGlzLl9zdGF0ZUJlZm9yZURlY2xhcmF0aW9uKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gSU5fREVDTEFSQVRJT04pe1xuXHRcdFx0dGhpcy5fc3RhdGVJbkRlY2xhcmF0aW9uKGMpO1xuXHRcdH1cblxuXHRcdC8qXG5cdFx0Klx0cHJvY2Vzc2luZyBpbnN0cnVjdGlvbnNcblx0XHQqL1xuXHRcdGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IElOX1BST0NFU1NJTkdfSU5TVFJVQ1RJT04pe1xuXHRcdFx0dGhpcy5fc3RhdGVJblByb2Nlc3NpbmdJbnN0cnVjdGlvbihjKTtcblx0XHR9XG5cblx0XHQvKlxuXHRcdCpcdGNvbW1lbnRzXG5cdFx0Ki9cblx0XHRlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfQ09NTUVOVCl7XG5cdFx0XHR0aGlzLl9zdGF0ZUJlZm9yZUNvbW1lbnQoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBJTl9DT01NRU5UKXtcblx0XHRcdHRoaXMuX3N0YXRlSW5Db21tZW50KGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQUZURVJfQ09NTUVOVF8xKXtcblx0XHRcdHRoaXMuX3N0YXRlQWZ0ZXJDb21tZW50MShjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEFGVEVSX0NPTU1FTlRfMil7XG5cdFx0XHR0aGlzLl9zdGF0ZUFmdGVyQ29tbWVudDIoYyk7XG5cdFx0fVxuXG5cdFx0Lypcblx0XHQqXHRjZGF0YVxuXHRcdCovXG5cdFx0ZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQkVGT1JFX0NEQVRBXzEpe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVDZGF0YTEoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfQ0RBVEFfMil7XG5cdFx0XHR0aGlzLl9zdGF0ZUJlZm9yZUNkYXRhMihjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9DREFUQV8zKXtcblx0XHRcdHRoaXMuX3N0YXRlQmVmb3JlQ2RhdGEzKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQkVGT1JFX0NEQVRBXzQpe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVDZGF0YTQoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfQ0RBVEFfNSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUJlZm9yZUNkYXRhNShjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9DREFUQV82KXtcblx0XHRcdHRoaXMuX3N0YXRlQmVmb3JlQ2RhdGE2KGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gSU5fQ0RBVEEpe1xuXHRcdFx0dGhpcy5fc3RhdGVJbkNkYXRhKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQUZURVJfQ0RBVEFfMSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUFmdGVyQ2RhdGExKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQUZURVJfQ0RBVEFfMil7XG5cdFx0XHR0aGlzLl9zdGF0ZUFmdGVyQ2RhdGEyKGMpO1xuXHRcdH1cblxuXHRcdC8qXG5cdFx0KiBzcGVjaWFsIHRhZ3Ncblx0XHQqL1xuXHRcdGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9TUEVDSUFMKXtcblx0XHRcdHRoaXMuX3N0YXRlQmVmb3JlU3BlY2lhbChjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9TUEVDSUFMX0VORCl7XG5cdFx0XHR0aGlzLl9zdGF0ZUJlZm9yZVNwZWNpYWxFbmQoYyk7XG5cdFx0fVxuXG5cdFx0Lypcblx0XHQqIHNjcmlwdFxuXHRcdCovXG5cdFx0ZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQkVGT1JFX1NDUklQVF8xKXtcblx0XHRcdHRoaXMuX3N0YXRlQmVmb3JlU2NyaXB0MShjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9TQ1JJUFRfMil7XG5cdFx0XHR0aGlzLl9zdGF0ZUJlZm9yZVNjcmlwdDIoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfU0NSSVBUXzMpe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVTY3JpcHQzKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQkVGT1JFX1NDUklQVF80KXtcblx0XHRcdHRoaXMuX3N0YXRlQmVmb3JlU2NyaXB0NChjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9TQ1JJUFRfNSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUJlZm9yZVNjcmlwdDUoYyk7XG5cdFx0fVxuXG5cdFx0ZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQUZURVJfU0NSSVBUXzEpe1xuXHRcdFx0dGhpcy5fc3RhdGVBZnRlclNjcmlwdDEoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBBRlRFUl9TQ1JJUFRfMil7XG5cdFx0XHR0aGlzLl9zdGF0ZUFmdGVyU2NyaXB0MihjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEFGVEVSX1NDUklQVF8zKXtcblx0XHRcdHRoaXMuX3N0YXRlQWZ0ZXJTY3JpcHQzKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQUZURVJfU0NSSVBUXzQpe1xuXHRcdFx0dGhpcy5fc3RhdGVBZnRlclNjcmlwdDQoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBBRlRFUl9TQ1JJUFRfNSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUFmdGVyU2NyaXB0NShjKTtcblx0XHR9XG5cblx0XHQvKlxuXHRcdCogc3R5bGVcblx0XHQqL1xuXHRcdGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9TVFlMRV8xKXtcblx0XHRcdHRoaXMuX3N0YXRlQmVmb3JlU3R5bGUxKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQkVGT1JFX1NUWUxFXzIpe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVTdHlsZTIoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfU1RZTEVfMyl7XG5cdFx0XHR0aGlzLl9zdGF0ZUJlZm9yZVN0eWxlMyhjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9TVFlMRV80KXtcblx0XHRcdHRoaXMuX3N0YXRlQmVmb3JlU3R5bGU0KGMpO1xuXHRcdH1cblxuXHRcdGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEFGVEVSX1NUWUxFXzEpe1xuXHRcdFx0dGhpcy5fc3RhdGVBZnRlclN0eWxlMShjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEFGVEVSX1NUWUxFXzIpe1xuXHRcdFx0dGhpcy5fc3RhdGVBZnRlclN0eWxlMihjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEFGVEVSX1NUWUxFXzMpe1xuXHRcdFx0dGhpcy5fc3RhdGVBZnRlclN0eWxlMyhjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEFGVEVSX1NUWUxFXzQpe1xuXHRcdFx0dGhpcy5fc3RhdGVBZnRlclN0eWxlNChjKTtcblx0XHR9XG5cblx0XHQvKlxuXHRcdCogZW50aXRpZXNcblx0XHQqL1xuXHRcdGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9FTlRJVFkpe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVFbnRpdHkoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfTlVNRVJJQ19FTlRJVFkpe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVOdW1lcmljRW50aXR5KGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gSU5fTkFNRURfRU5USVRZKXtcblx0XHRcdHRoaXMuX3N0YXRlSW5OYW1lZEVudGl0eShjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IElOX05VTUVSSUNfRU5USVRZKXtcblx0XHRcdHRoaXMuX3N0YXRlSW5OdW1lcmljRW50aXR5KGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gSU5fSEVYX0VOVElUWSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUluSGV4RW50aXR5KGMpO1xuXHRcdH1cblxuXHRcdGVsc2Uge1xuXHRcdFx0dGhpcy5fY2JzLm9uZXJyb3IoRXJyb3IoXCJ1bmtub3duIF9zdGF0ZVwiKSwgdGhpcy5fc3RhdGUpO1xuXHRcdH1cblxuXHRcdHRoaXMuX2luZGV4Kys7XG5cdH1cblxuXHR0aGlzLl9jbGVhbnVwKCk7XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLnBhdXNlID0gZnVuY3Rpb24oKXtcblx0dGhpcy5fcnVubmluZyA9IGZhbHNlO1xufTtcblRva2VuaXplci5wcm90b3R5cGUucmVzdW1lID0gZnVuY3Rpb24oKXtcblx0dGhpcy5fcnVubmluZyA9IHRydWU7XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLmVuZCA9IGZ1bmN0aW9uKGNodW5rKXtcblx0aWYoY2h1bmspIHRoaXMud3JpdGUoY2h1bmspO1xuXG5cdC8vaWYgdGhlcmUgaXMgcmVtYWluaW5nIGRhdGEsIGVtaXQgaXQgaW4gYSByZWFzb25hYmxlIHdheVxuXHRpZih0aGlzLl9zZWN0aW9uU3RhcnQgPCB0aGlzLl9pbmRleCl7XG5cdFx0dGhpcy5faGFuZGxlVHJhaWxpbmdEYXRhKCk7XG5cdH1cblxuXHR0aGlzLl9jYnMub25lbmQoKTtcbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX2hhbmRsZVRyYWlsaW5nRGF0YSA9IGZ1bmN0aW9uKCl7XG5cdHZhciBkYXRhID0gdGhpcy5fYnVmZmVyLnN1YnN0cih0aGlzLl9zZWN0aW9uU3RhcnQpO1xuXG5cdGlmKHRoaXMuX3N0YXRlID09PSBJTl9DREFUQSB8fCB0aGlzLl9zdGF0ZSA9PT0gQUZURVJfQ0RBVEFfMSB8fCB0aGlzLl9zdGF0ZSA9PT0gQUZURVJfQ0RBVEFfMil7XG5cdFx0dGhpcy5fY2JzLm9uY2RhdGEoZGF0YSk7XG5cdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gSU5fQ09NTUVOVCB8fCB0aGlzLl9zdGF0ZSA9PT0gQUZURVJfQ09NTUVOVF8xIHx8IHRoaXMuX3N0YXRlID09PSBBRlRFUl9DT01NRU5UXzIpe1xuXHRcdHRoaXMuX2Nicy5vbmNvbW1lbnQoZGF0YSk7XG5cdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gSU5fVEFHX05BTUUpe1xuXHRcdHRoaXMuX2Nicy5vbm9wZW50YWduYW1lKGRhdGEpO1xuXHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9BVFRSSUJVVEVfTkFNRSB8fCB0aGlzLl9zdGF0ZSA9PT0gQkVGT1JFX0FUVFJJQlVURV9WQUxVRSB8fCB0aGlzLl9zdGF0ZSA9PT0gQUZURVJfQVRUUklCVVRFX05BTUUpe1xuXHRcdHRoaXMuX2Nicy5vbm9wZW50YWdlbmQoKTtcblx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBJTl9BVFRSSUJVVEVfTkFNRSl7XG5cdFx0dGhpcy5fY2JzLm9uYXR0cmlibmFtZShkYXRhKTtcblx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBJTl9BVFRSSUJVVEVfVkFMVUVfU1EgfHwgdGhpcy5fc3RhdGUgPT09IElOX0FUVFJJQlVURV9WQUxVRV9EUSB8fCB0aGlzLl9zdGF0ZSA9PT0gSU5fQVRUUklCVVRFX1ZBTFVFX05RKXtcblx0XHR0aGlzLl9jYnMub25hdHRyaWJkYXRhKGRhdGEpO1xuXHRcdHRoaXMuX2Nicy5vbmF0dHJpYmVuZCgpO1xuXHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IElOX0NMT1NJTkdfVEFHX05BTUUpe1xuXHRcdHRoaXMuX2Nicy5vbmNsb3NldGFnKGRhdGEpO1xuXHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IElOX05BTUVEX0VOVElUWSAmJiAhdGhpcy5feG1sTW9kZSl7XG5cdFx0dGhpcy5fcGFyc2VMZWdhY3lFbnRpdHkoKTtcblx0XHRpZigtLXRoaXMuX3NlY3Rpb25TdGFydCA8IHRoaXMuX2luZGV4KXtcblx0XHRcdHRoaXMuX3N0YXRlID0gdGhpcy5fYmFzZVN0YXRlO1xuXHRcdFx0dGhpcy5faGFuZGxlVHJhaWxpbmdEYXRhKCk7XG5cdFx0fVxuXHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IElOX05VTUVSSUNfRU5USVRZICYmICF0aGlzLl94bWxNb2RlKXtcblx0XHR0aGlzLl9kZWNvZGVOdW1lcmljRW50aXR5KDIsIDEwKTtcblx0XHRpZih0aGlzLl9zZWN0aW9uU3RhcnQgPCB0aGlzLl9pbmRleCl7XG5cdFx0XHR0aGlzLl9zdGF0ZSA9IHRoaXMuX2Jhc2VTdGF0ZTtcblx0XHRcdHRoaXMuX2hhbmRsZVRyYWlsaW5nRGF0YSgpO1xuXHRcdH1cblx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBJTl9IRVhfRU5USVRZICYmICF0aGlzLl94bWxNb2RlKXtcblx0XHR0aGlzLl9kZWNvZGVOdW1lcmljRW50aXR5KDMsIDE2KTtcblx0XHRpZih0aGlzLl9zZWN0aW9uU3RhcnQgPCB0aGlzLl9pbmRleCl7XG5cdFx0XHR0aGlzLl9zdGF0ZSA9IHRoaXMuX2Jhc2VTdGF0ZTtcblx0XHRcdHRoaXMuX2hhbmRsZVRyYWlsaW5nRGF0YSgpO1xuXHRcdH1cblx0fSBlbHNlIHtcblx0XHR0aGlzLl9jYnMub250ZXh0KGRhdGEpO1xuXHR9XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLnJlc2V0ID0gZnVuY3Rpb24oKXtcblx0VG9rZW5pemVyLmNhbGwodGhpcywge3htbE1vZGU6IHRoaXMuX3htbE1vZGUsIGRlY29kZUVudGl0aWVzOiB0aGlzLl9kZWNvZGVFbnRpdGllc30sIHRoaXMuX2Nicyk7XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9nZXRTZWN0aW9uID0gZnVuY3Rpb24oKXtcblx0cmV0dXJuIHRoaXMuX2J1ZmZlci5zdWJzdHJpbmcodGhpcy5fc2VjdGlvblN0YXJ0LCB0aGlzLl9pbmRleCk7XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9lbWl0VG9rZW4gPSBmdW5jdGlvbihuYW1lKXtcblx0dGhpcy5fY2JzW25hbWVdKHRoaXMuX2dldFNlY3Rpb24oKSk7XG5cdHRoaXMuX3NlY3Rpb25TdGFydCA9IC0xO1xufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fZW1pdFBhcnRpYWwgPSBmdW5jdGlvbih2YWx1ZSl7XG5cdGlmKHRoaXMuX2Jhc2VTdGF0ZSAhPT0gVEVYVCl7XG5cdFx0dGhpcy5fY2JzLm9uYXR0cmliZGF0YSh2YWx1ZSk7IC8vVE9ETyBpbXBsZW1lbnQgdGhlIG5ldyBldmVudFxuXHR9IGVsc2Uge1xuXHRcdHRoaXMuX2Nicy5vbnRleHQodmFsdWUpO1xuXHR9XG59O1xuIiwibW9kdWxlLmV4cG9ydHM9e1wiMFwiOlwiXFx1RkZGRFwiLFwiMTI4XCI6XCJcXHUyMEFDXCIsXCIxMzBcIjpcIlxcdTIwMUFcIixcIjEzMVwiOlwiXFx1MDE5MlwiLFwiMTMyXCI6XCJcXHUyMDFFXCIsXCIxMzNcIjpcIlxcdTIwMjZcIixcIjEzNFwiOlwiXFx1MjAyMFwiLFwiMTM1XCI6XCJcXHUyMDIxXCIsXCIxMzZcIjpcIlxcdTAyQzZcIixcIjEzN1wiOlwiXFx1MjAzMFwiLFwiMTM4XCI6XCJcXHUwMTYwXCIsXCIxMzlcIjpcIlxcdTIwMzlcIixcIjE0MFwiOlwiXFx1MDE1MlwiLFwiMTQyXCI6XCJcXHUwMTdEXCIsXCIxNDVcIjpcIlxcdTIwMThcIixcIjE0NlwiOlwiXFx1MjAxOVwiLFwiMTQ3XCI6XCJcXHUyMDFDXCIsXCIxNDhcIjpcIlxcdTIwMURcIixcIjE0OVwiOlwiXFx1MjAyMlwiLFwiMTUwXCI6XCJcXHUyMDEzXCIsXCIxNTFcIjpcIlxcdTIwMTRcIixcIjE1MlwiOlwiXFx1MDJEQ1wiLFwiMTUzXCI6XCJcXHUyMTIyXCIsXCIxNTRcIjpcIlxcdTAxNjFcIixcIjE1NVwiOlwiXFx1MjAzQVwiLFwiMTU2XCI6XCJcXHUwMTUzXCIsXCIxNThcIjpcIlxcdTAxN0VcIixcIjE1OVwiOlwiXFx1MDE3OFwifVxuIiwibW9kdWxlLmV4cG9ydHM9e1wiQWFjdXRlXCI6XCJcXHUwMEMxXCIsXCJhYWN1dGVcIjpcIlxcdTAwRTFcIixcIkFicmV2ZVwiOlwiXFx1MDEwMlwiLFwiYWJyZXZlXCI6XCJcXHUwMTAzXCIsXCJhY1wiOlwiXFx1MjIzRVwiLFwiYWNkXCI6XCJcXHUyMjNGXCIsXCJhY0VcIjpcIlxcdTIyM0VcXHUwMzMzXCIsXCJBY2lyY1wiOlwiXFx1MDBDMlwiLFwiYWNpcmNcIjpcIlxcdTAwRTJcIixcImFjdXRlXCI6XCJcXHUwMEI0XCIsXCJBY3lcIjpcIlxcdTA0MTBcIixcImFjeVwiOlwiXFx1MDQzMFwiLFwiQUVsaWdcIjpcIlxcdTAwQzZcIixcImFlbGlnXCI6XCJcXHUwMEU2XCIsXCJhZlwiOlwiXFx1MjA2MVwiLFwiQWZyXCI6XCJcXHVEODM1XFx1REQwNFwiLFwiYWZyXCI6XCJcXHVEODM1XFx1REQxRVwiLFwiQWdyYXZlXCI6XCJcXHUwMEMwXCIsXCJhZ3JhdmVcIjpcIlxcdTAwRTBcIixcImFsZWZzeW1cIjpcIlxcdTIxMzVcIixcImFsZXBoXCI6XCJcXHUyMTM1XCIsXCJBbHBoYVwiOlwiXFx1MDM5MVwiLFwiYWxwaGFcIjpcIlxcdTAzQjFcIixcIkFtYWNyXCI6XCJcXHUwMTAwXCIsXCJhbWFjclwiOlwiXFx1MDEwMVwiLFwiYW1hbGdcIjpcIlxcdTJBM0ZcIixcImFtcFwiOlwiJlwiLFwiQU1QXCI6XCImXCIsXCJhbmRhbmRcIjpcIlxcdTJBNTVcIixcIkFuZFwiOlwiXFx1MkE1M1wiLFwiYW5kXCI6XCJcXHUyMjI3XCIsXCJhbmRkXCI6XCJcXHUyQTVDXCIsXCJhbmRzbG9wZVwiOlwiXFx1MkE1OFwiLFwiYW5kdlwiOlwiXFx1MkE1QVwiLFwiYW5nXCI6XCJcXHUyMjIwXCIsXCJhbmdlXCI6XCJcXHUyOUE0XCIsXCJhbmdsZVwiOlwiXFx1MjIyMFwiLFwiYW5nbXNkYWFcIjpcIlxcdTI5QThcIixcImFuZ21zZGFiXCI6XCJcXHUyOUE5XCIsXCJhbmdtc2RhY1wiOlwiXFx1MjlBQVwiLFwiYW5nbXNkYWRcIjpcIlxcdTI5QUJcIixcImFuZ21zZGFlXCI6XCJcXHUyOUFDXCIsXCJhbmdtc2RhZlwiOlwiXFx1MjlBRFwiLFwiYW5nbXNkYWdcIjpcIlxcdTI5QUVcIixcImFuZ21zZGFoXCI6XCJcXHUyOUFGXCIsXCJhbmdtc2RcIjpcIlxcdTIyMjFcIixcImFuZ3J0XCI6XCJcXHUyMjFGXCIsXCJhbmdydHZiXCI6XCJcXHUyMkJFXCIsXCJhbmdydHZiZFwiOlwiXFx1Mjk5RFwiLFwiYW5nc3BoXCI6XCJcXHUyMjIyXCIsXCJhbmdzdFwiOlwiXFx1MDBDNVwiLFwiYW5nemFyclwiOlwiXFx1MjM3Q1wiLFwiQW9nb25cIjpcIlxcdTAxMDRcIixcImFvZ29uXCI6XCJcXHUwMTA1XCIsXCJBb3BmXCI6XCJcXHVEODM1XFx1REQzOFwiLFwiYW9wZlwiOlwiXFx1RDgzNVxcdURENTJcIixcImFwYWNpclwiOlwiXFx1MkE2RlwiLFwiYXBcIjpcIlxcdTIyNDhcIixcImFwRVwiOlwiXFx1MkE3MFwiLFwiYXBlXCI6XCJcXHUyMjRBXCIsXCJhcGlkXCI6XCJcXHUyMjRCXCIsXCJhcG9zXCI6XCInXCIsXCJBcHBseUZ1bmN0aW9uXCI6XCJcXHUyMDYxXCIsXCJhcHByb3hcIjpcIlxcdTIyNDhcIixcImFwcHJveGVxXCI6XCJcXHUyMjRBXCIsXCJBcmluZ1wiOlwiXFx1MDBDNVwiLFwiYXJpbmdcIjpcIlxcdTAwRTVcIixcIkFzY3JcIjpcIlxcdUQ4MzVcXHVEQzlDXCIsXCJhc2NyXCI6XCJcXHVEODM1XFx1RENCNlwiLFwiQXNzaWduXCI6XCJcXHUyMjU0XCIsXCJhc3RcIjpcIipcIixcImFzeW1wXCI6XCJcXHUyMjQ4XCIsXCJhc3ltcGVxXCI6XCJcXHUyMjREXCIsXCJBdGlsZGVcIjpcIlxcdTAwQzNcIixcImF0aWxkZVwiOlwiXFx1MDBFM1wiLFwiQXVtbFwiOlwiXFx1MDBDNFwiLFwiYXVtbFwiOlwiXFx1MDBFNFwiLFwiYXdjb25pbnRcIjpcIlxcdTIyMzNcIixcImF3aW50XCI6XCJcXHUyQTExXCIsXCJiYWNrY29uZ1wiOlwiXFx1MjI0Q1wiLFwiYmFja2Vwc2lsb25cIjpcIlxcdTAzRjZcIixcImJhY2twcmltZVwiOlwiXFx1MjAzNVwiLFwiYmFja3NpbVwiOlwiXFx1MjIzRFwiLFwiYmFja3NpbWVxXCI6XCJcXHUyMkNEXCIsXCJCYWNrc2xhc2hcIjpcIlxcdTIyMTZcIixcIkJhcnZcIjpcIlxcdTJBRTdcIixcImJhcnZlZVwiOlwiXFx1MjJCRFwiLFwiYmFyd2VkXCI6XCJcXHUyMzA1XCIsXCJCYXJ3ZWRcIjpcIlxcdTIzMDZcIixcImJhcndlZGdlXCI6XCJcXHUyMzA1XCIsXCJiYnJrXCI6XCJcXHUyM0I1XCIsXCJiYnJrdGJya1wiOlwiXFx1MjNCNlwiLFwiYmNvbmdcIjpcIlxcdTIyNENcIixcIkJjeVwiOlwiXFx1MDQxMVwiLFwiYmN5XCI6XCJcXHUwNDMxXCIsXCJiZHF1b1wiOlwiXFx1MjAxRVwiLFwiYmVjYXVzXCI6XCJcXHUyMjM1XCIsXCJiZWNhdXNlXCI6XCJcXHUyMjM1XCIsXCJCZWNhdXNlXCI6XCJcXHUyMjM1XCIsXCJiZW1wdHl2XCI6XCJcXHUyOUIwXCIsXCJiZXBzaVwiOlwiXFx1MDNGNlwiLFwiYmVybm91XCI6XCJcXHUyMTJDXCIsXCJCZXJub3VsbGlzXCI6XCJcXHUyMTJDXCIsXCJCZXRhXCI6XCJcXHUwMzkyXCIsXCJiZXRhXCI6XCJcXHUwM0IyXCIsXCJiZXRoXCI6XCJcXHUyMTM2XCIsXCJiZXR3ZWVuXCI6XCJcXHUyMjZDXCIsXCJCZnJcIjpcIlxcdUQ4MzVcXHVERDA1XCIsXCJiZnJcIjpcIlxcdUQ4MzVcXHVERDFGXCIsXCJiaWdjYXBcIjpcIlxcdTIyQzJcIixcImJpZ2NpcmNcIjpcIlxcdTI1RUZcIixcImJpZ2N1cFwiOlwiXFx1MjJDM1wiLFwiYmlnb2RvdFwiOlwiXFx1MkEwMFwiLFwiYmlnb3BsdXNcIjpcIlxcdTJBMDFcIixcImJpZ290aW1lc1wiOlwiXFx1MkEwMlwiLFwiYmlnc3FjdXBcIjpcIlxcdTJBMDZcIixcImJpZ3N0YXJcIjpcIlxcdTI2MDVcIixcImJpZ3RyaWFuZ2xlZG93blwiOlwiXFx1MjVCRFwiLFwiYmlndHJpYW5nbGV1cFwiOlwiXFx1MjVCM1wiLFwiYmlndXBsdXNcIjpcIlxcdTJBMDRcIixcImJpZ3ZlZVwiOlwiXFx1MjJDMVwiLFwiYmlnd2VkZ2VcIjpcIlxcdTIyQzBcIixcImJrYXJvd1wiOlwiXFx1MjkwRFwiLFwiYmxhY2tsb3plbmdlXCI6XCJcXHUyOUVCXCIsXCJibGFja3NxdWFyZVwiOlwiXFx1MjVBQVwiLFwiYmxhY2t0cmlhbmdsZVwiOlwiXFx1MjVCNFwiLFwiYmxhY2t0cmlhbmdsZWRvd25cIjpcIlxcdTI1QkVcIixcImJsYWNrdHJpYW5nbGVsZWZ0XCI6XCJcXHUyNUMyXCIsXCJibGFja3RyaWFuZ2xlcmlnaHRcIjpcIlxcdTI1QjhcIixcImJsYW5rXCI6XCJcXHUyNDIzXCIsXCJibGsxMlwiOlwiXFx1MjU5MlwiLFwiYmxrMTRcIjpcIlxcdTI1OTFcIixcImJsazM0XCI6XCJcXHUyNTkzXCIsXCJibG9ja1wiOlwiXFx1MjU4OFwiLFwiYm5lXCI6XCI9XFx1MjBFNVwiLFwiYm5lcXVpdlwiOlwiXFx1MjI2MVxcdTIwRTVcIixcImJOb3RcIjpcIlxcdTJBRURcIixcImJub3RcIjpcIlxcdTIzMTBcIixcIkJvcGZcIjpcIlxcdUQ4MzVcXHVERDM5XCIsXCJib3BmXCI6XCJcXHVEODM1XFx1REQ1M1wiLFwiYm90XCI6XCJcXHUyMkE1XCIsXCJib3R0b21cIjpcIlxcdTIyQTVcIixcImJvd3RpZVwiOlwiXFx1MjJDOFwiLFwiYm94Ym94XCI6XCJcXHUyOUM5XCIsXCJib3hkbFwiOlwiXFx1MjUxMFwiLFwiYm94ZExcIjpcIlxcdTI1NTVcIixcImJveERsXCI6XCJcXHUyNTU2XCIsXCJib3hETFwiOlwiXFx1MjU1N1wiLFwiYm94ZHJcIjpcIlxcdTI1MENcIixcImJveGRSXCI6XCJcXHUyNTUyXCIsXCJib3hEclwiOlwiXFx1MjU1M1wiLFwiYm94RFJcIjpcIlxcdTI1NTRcIixcImJveGhcIjpcIlxcdTI1MDBcIixcImJveEhcIjpcIlxcdTI1NTBcIixcImJveGhkXCI6XCJcXHUyNTJDXCIsXCJib3hIZFwiOlwiXFx1MjU2NFwiLFwiYm94aERcIjpcIlxcdTI1NjVcIixcImJveEhEXCI6XCJcXHUyNTY2XCIsXCJib3hodVwiOlwiXFx1MjUzNFwiLFwiYm94SHVcIjpcIlxcdTI1NjdcIixcImJveGhVXCI6XCJcXHUyNTY4XCIsXCJib3hIVVwiOlwiXFx1MjU2OVwiLFwiYm94bWludXNcIjpcIlxcdTIyOUZcIixcImJveHBsdXNcIjpcIlxcdTIyOUVcIixcImJveHRpbWVzXCI6XCJcXHUyMkEwXCIsXCJib3h1bFwiOlwiXFx1MjUxOFwiLFwiYm94dUxcIjpcIlxcdTI1NUJcIixcImJveFVsXCI6XCJcXHUyNTVDXCIsXCJib3hVTFwiOlwiXFx1MjU1RFwiLFwiYm94dXJcIjpcIlxcdTI1MTRcIixcImJveHVSXCI6XCJcXHUyNTU4XCIsXCJib3hVclwiOlwiXFx1MjU1OVwiLFwiYm94VVJcIjpcIlxcdTI1NUFcIixcImJveHZcIjpcIlxcdTI1MDJcIixcImJveFZcIjpcIlxcdTI1NTFcIixcImJveHZoXCI6XCJcXHUyNTNDXCIsXCJib3h2SFwiOlwiXFx1MjU2QVwiLFwiYm94VmhcIjpcIlxcdTI1NkJcIixcImJveFZIXCI6XCJcXHUyNTZDXCIsXCJib3h2bFwiOlwiXFx1MjUyNFwiLFwiYm94dkxcIjpcIlxcdTI1NjFcIixcImJveFZsXCI6XCJcXHUyNTYyXCIsXCJib3hWTFwiOlwiXFx1MjU2M1wiLFwiYm94dnJcIjpcIlxcdTI1MUNcIixcImJveHZSXCI6XCJcXHUyNTVFXCIsXCJib3hWclwiOlwiXFx1MjU1RlwiLFwiYm94VlJcIjpcIlxcdTI1NjBcIixcImJwcmltZVwiOlwiXFx1MjAzNVwiLFwiYnJldmVcIjpcIlxcdTAyRDhcIixcIkJyZXZlXCI6XCJcXHUwMkQ4XCIsXCJicnZiYXJcIjpcIlxcdTAwQTZcIixcImJzY3JcIjpcIlxcdUQ4MzVcXHVEQ0I3XCIsXCJCc2NyXCI6XCJcXHUyMTJDXCIsXCJic2VtaVwiOlwiXFx1MjA0RlwiLFwiYnNpbVwiOlwiXFx1MjIzRFwiLFwiYnNpbWVcIjpcIlxcdTIyQ0RcIixcImJzb2xiXCI6XCJcXHUyOUM1XCIsXCJic29sXCI6XCJcXFxcXCIsXCJic29saHN1YlwiOlwiXFx1MjdDOFwiLFwiYnVsbFwiOlwiXFx1MjAyMlwiLFwiYnVsbGV0XCI6XCJcXHUyMDIyXCIsXCJidW1wXCI6XCJcXHUyMjRFXCIsXCJidW1wRVwiOlwiXFx1MkFBRVwiLFwiYnVtcGVcIjpcIlxcdTIyNEZcIixcIkJ1bXBlcVwiOlwiXFx1MjI0RVwiLFwiYnVtcGVxXCI6XCJcXHUyMjRGXCIsXCJDYWN1dGVcIjpcIlxcdTAxMDZcIixcImNhY3V0ZVwiOlwiXFx1MDEwN1wiLFwiY2FwYW5kXCI6XCJcXHUyQTQ0XCIsXCJjYXBicmN1cFwiOlwiXFx1MkE0OVwiLFwiY2FwY2FwXCI6XCJcXHUyQTRCXCIsXCJjYXBcIjpcIlxcdTIyMjlcIixcIkNhcFwiOlwiXFx1MjJEMlwiLFwiY2FwY3VwXCI6XCJcXHUyQTQ3XCIsXCJjYXBkb3RcIjpcIlxcdTJBNDBcIixcIkNhcGl0YWxEaWZmZXJlbnRpYWxEXCI6XCJcXHUyMTQ1XCIsXCJjYXBzXCI6XCJcXHUyMjI5XFx1RkUwMFwiLFwiY2FyZXRcIjpcIlxcdTIwNDFcIixcImNhcm9uXCI6XCJcXHUwMkM3XCIsXCJDYXlsZXlzXCI6XCJcXHUyMTJEXCIsXCJjY2Fwc1wiOlwiXFx1MkE0RFwiLFwiQ2Nhcm9uXCI6XCJcXHUwMTBDXCIsXCJjY2Fyb25cIjpcIlxcdTAxMERcIixcIkNjZWRpbFwiOlwiXFx1MDBDN1wiLFwiY2NlZGlsXCI6XCJcXHUwMEU3XCIsXCJDY2lyY1wiOlwiXFx1MDEwOFwiLFwiY2NpcmNcIjpcIlxcdTAxMDlcIixcIkNjb25pbnRcIjpcIlxcdTIyMzBcIixcImNjdXBzXCI6XCJcXHUyQTRDXCIsXCJjY3Vwc3NtXCI6XCJcXHUyQTUwXCIsXCJDZG90XCI6XCJcXHUwMTBBXCIsXCJjZG90XCI6XCJcXHUwMTBCXCIsXCJjZWRpbFwiOlwiXFx1MDBCOFwiLFwiQ2VkaWxsYVwiOlwiXFx1MDBCOFwiLFwiY2VtcHR5dlwiOlwiXFx1MjlCMlwiLFwiY2VudFwiOlwiXFx1MDBBMlwiLFwiY2VudGVyZG90XCI6XCJcXHUwMEI3XCIsXCJDZW50ZXJEb3RcIjpcIlxcdTAwQjdcIixcImNmclwiOlwiXFx1RDgzNVxcdUREMjBcIixcIkNmclwiOlwiXFx1MjEyRFwiLFwiQ0hjeVwiOlwiXFx1MDQyN1wiLFwiY2hjeVwiOlwiXFx1MDQ0N1wiLFwiY2hlY2tcIjpcIlxcdTI3MTNcIixcImNoZWNrbWFya1wiOlwiXFx1MjcxM1wiLFwiQ2hpXCI6XCJcXHUwM0E3XCIsXCJjaGlcIjpcIlxcdTAzQzdcIixcImNpcmNcIjpcIlxcdTAyQzZcIixcImNpcmNlcVwiOlwiXFx1MjI1N1wiLFwiY2lyY2xlYXJyb3dsZWZ0XCI6XCJcXHUyMUJBXCIsXCJjaXJjbGVhcnJvd3JpZ2h0XCI6XCJcXHUyMUJCXCIsXCJjaXJjbGVkYXN0XCI6XCJcXHUyMjlCXCIsXCJjaXJjbGVkY2lyY1wiOlwiXFx1MjI5QVwiLFwiY2lyY2xlZGRhc2hcIjpcIlxcdTIyOURcIixcIkNpcmNsZURvdFwiOlwiXFx1MjI5OVwiLFwiY2lyY2xlZFJcIjpcIlxcdTAwQUVcIixcImNpcmNsZWRTXCI6XCJcXHUyNEM4XCIsXCJDaXJjbGVNaW51c1wiOlwiXFx1MjI5NlwiLFwiQ2lyY2xlUGx1c1wiOlwiXFx1MjI5NVwiLFwiQ2lyY2xlVGltZXNcIjpcIlxcdTIyOTdcIixcImNpclwiOlwiXFx1MjVDQlwiLFwiY2lyRVwiOlwiXFx1MjlDM1wiLFwiY2lyZVwiOlwiXFx1MjI1N1wiLFwiY2lyZm5pbnRcIjpcIlxcdTJBMTBcIixcImNpcm1pZFwiOlwiXFx1MkFFRlwiLFwiY2lyc2NpclwiOlwiXFx1MjlDMlwiLFwiQ2xvY2t3aXNlQ29udG91ckludGVncmFsXCI6XCJcXHUyMjMyXCIsXCJDbG9zZUN1cmx5RG91YmxlUXVvdGVcIjpcIlxcdTIwMURcIixcIkNsb3NlQ3VybHlRdW90ZVwiOlwiXFx1MjAxOVwiLFwiY2x1YnNcIjpcIlxcdTI2NjNcIixcImNsdWJzdWl0XCI6XCJcXHUyNjYzXCIsXCJjb2xvblwiOlwiOlwiLFwiQ29sb25cIjpcIlxcdTIyMzdcIixcIkNvbG9uZVwiOlwiXFx1MkE3NFwiLFwiY29sb25lXCI6XCJcXHUyMjU0XCIsXCJjb2xvbmVxXCI6XCJcXHUyMjU0XCIsXCJjb21tYVwiOlwiLFwiLFwiY29tbWF0XCI6XCJAXCIsXCJjb21wXCI6XCJcXHUyMjAxXCIsXCJjb21wZm5cIjpcIlxcdTIyMThcIixcImNvbXBsZW1lbnRcIjpcIlxcdTIyMDFcIixcImNvbXBsZXhlc1wiOlwiXFx1MjEwMlwiLFwiY29uZ1wiOlwiXFx1MjI0NVwiLFwiY29uZ2RvdFwiOlwiXFx1MkE2RFwiLFwiQ29uZ3J1ZW50XCI6XCJcXHUyMjYxXCIsXCJjb25pbnRcIjpcIlxcdTIyMkVcIixcIkNvbmludFwiOlwiXFx1MjIyRlwiLFwiQ29udG91ckludGVncmFsXCI6XCJcXHUyMjJFXCIsXCJjb3BmXCI6XCJcXHVEODM1XFx1REQ1NFwiLFwiQ29wZlwiOlwiXFx1MjEwMlwiLFwiY29wcm9kXCI6XCJcXHUyMjEwXCIsXCJDb3Byb2R1Y3RcIjpcIlxcdTIyMTBcIixcImNvcHlcIjpcIlxcdTAwQTlcIixcIkNPUFlcIjpcIlxcdTAwQTlcIixcImNvcHlzclwiOlwiXFx1MjExN1wiLFwiQ291bnRlckNsb2Nrd2lzZUNvbnRvdXJJbnRlZ3JhbFwiOlwiXFx1MjIzM1wiLFwiY3JhcnJcIjpcIlxcdTIxQjVcIixcImNyb3NzXCI6XCJcXHUyNzE3XCIsXCJDcm9zc1wiOlwiXFx1MkEyRlwiLFwiQ3NjclwiOlwiXFx1RDgzNVxcdURDOUVcIixcImNzY3JcIjpcIlxcdUQ4MzVcXHVEQ0I4XCIsXCJjc3ViXCI6XCJcXHUyQUNGXCIsXCJjc3ViZVwiOlwiXFx1MkFEMVwiLFwiY3N1cFwiOlwiXFx1MkFEMFwiLFwiY3N1cGVcIjpcIlxcdTJBRDJcIixcImN0ZG90XCI6XCJcXHUyMkVGXCIsXCJjdWRhcnJsXCI6XCJcXHUyOTM4XCIsXCJjdWRhcnJyXCI6XCJcXHUyOTM1XCIsXCJjdWVwclwiOlwiXFx1MjJERVwiLFwiY3Vlc2NcIjpcIlxcdTIyREZcIixcImN1bGFyclwiOlwiXFx1MjFCNlwiLFwiY3VsYXJycFwiOlwiXFx1MjkzRFwiLFwiY3VwYnJjYXBcIjpcIlxcdTJBNDhcIixcImN1cGNhcFwiOlwiXFx1MkE0NlwiLFwiQ3VwQ2FwXCI6XCJcXHUyMjREXCIsXCJjdXBcIjpcIlxcdTIyMkFcIixcIkN1cFwiOlwiXFx1MjJEM1wiLFwiY3VwY3VwXCI6XCJcXHUyQTRBXCIsXCJjdXBkb3RcIjpcIlxcdTIyOERcIixcImN1cG9yXCI6XCJcXHUyQTQ1XCIsXCJjdXBzXCI6XCJcXHUyMjJBXFx1RkUwMFwiLFwiY3VyYXJyXCI6XCJcXHUyMUI3XCIsXCJjdXJhcnJtXCI6XCJcXHUyOTNDXCIsXCJjdXJseWVxcHJlY1wiOlwiXFx1MjJERVwiLFwiY3VybHllcXN1Y2NcIjpcIlxcdTIyREZcIixcImN1cmx5dmVlXCI6XCJcXHUyMkNFXCIsXCJjdXJseXdlZGdlXCI6XCJcXHUyMkNGXCIsXCJjdXJyZW5cIjpcIlxcdTAwQTRcIixcImN1cnZlYXJyb3dsZWZ0XCI6XCJcXHUyMUI2XCIsXCJjdXJ2ZWFycm93cmlnaHRcIjpcIlxcdTIxQjdcIixcImN1dmVlXCI6XCJcXHUyMkNFXCIsXCJjdXdlZFwiOlwiXFx1MjJDRlwiLFwiY3djb25pbnRcIjpcIlxcdTIyMzJcIixcImN3aW50XCI6XCJcXHUyMjMxXCIsXCJjeWxjdHlcIjpcIlxcdTIzMkRcIixcImRhZ2dlclwiOlwiXFx1MjAyMFwiLFwiRGFnZ2VyXCI6XCJcXHUyMDIxXCIsXCJkYWxldGhcIjpcIlxcdTIxMzhcIixcImRhcnJcIjpcIlxcdTIxOTNcIixcIkRhcnJcIjpcIlxcdTIxQTFcIixcImRBcnJcIjpcIlxcdTIxRDNcIixcImRhc2hcIjpcIlxcdTIwMTBcIixcIkRhc2h2XCI6XCJcXHUyQUU0XCIsXCJkYXNodlwiOlwiXFx1MjJBM1wiLFwiZGJrYXJvd1wiOlwiXFx1MjkwRlwiLFwiZGJsYWNcIjpcIlxcdTAyRERcIixcIkRjYXJvblwiOlwiXFx1MDEwRVwiLFwiZGNhcm9uXCI6XCJcXHUwMTBGXCIsXCJEY3lcIjpcIlxcdTA0MTRcIixcImRjeVwiOlwiXFx1MDQzNFwiLFwiZGRhZ2dlclwiOlwiXFx1MjAyMVwiLFwiZGRhcnJcIjpcIlxcdTIxQ0FcIixcIkREXCI6XCJcXHUyMTQ1XCIsXCJkZFwiOlwiXFx1MjE0NlwiLFwiRERvdHJhaGRcIjpcIlxcdTI5MTFcIixcImRkb3RzZXFcIjpcIlxcdTJBNzdcIixcImRlZ1wiOlwiXFx1MDBCMFwiLFwiRGVsXCI6XCJcXHUyMjA3XCIsXCJEZWx0YVwiOlwiXFx1MDM5NFwiLFwiZGVsdGFcIjpcIlxcdTAzQjRcIixcImRlbXB0eXZcIjpcIlxcdTI5QjFcIixcImRmaXNodFwiOlwiXFx1Mjk3RlwiLFwiRGZyXCI6XCJcXHVEODM1XFx1REQwN1wiLFwiZGZyXCI6XCJcXHVEODM1XFx1REQyMVwiLFwiZEhhclwiOlwiXFx1Mjk2NVwiLFwiZGhhcmxcIjpcIlxcdTIxQzNcIixcImRoYXJyXCI6XCJcXHUyMUMyXCIsXCJEaWFjcml0aWNhbEFjdXRlXCI6XCJcXHUwMEI0XCIsXCJEaWFjcml0aWNhbERvdFwiOlwiXFx1MDJEOVwiLFwiRGlhY3JpdGljYWxEb3VibGVBY3V0ZVwiOlwiXFx1MDJERFwiLFwiRGlhY3JpdGljYWxHcmF2ZVwiOlwiYFwiLFwiRGlhY3JpdGljYWxUaWxkZVwiOlwiXFx1MDJEQ1wiLFwiZGlhbVwiOlwiXFx1MjJDNFwiLFwiZGlhbW9uZFwiOlwiXFx1MjJDNFwiLFwiRGlhbW9uZFwiOlwiXFx1MjJDNFwiLFwiZGlhbW9uZHN1aXRcIjpcIlxcdTI2NjZcIixcImRpYW1zXCI6XCJcXHUyNjY2XCIsXCJkaWVcIjpcIlxcdTAwQThcIixcIkRpZmZlcmVudGlhbERcIjpcIlxcdTIxNDZcIixcImRpZ2FtbWFcIjpcIlxcdTAzRERcIixcImRpc2luXCI6XCJcXHUyMkYyXCIsXCJkaXZcIjpcIlxcdTAwRjdcIixcImRpdmlkZVwiOlwiXFx1MDBGN1wiLFwiZGl2aWRlb250aW1lc1wiOlwiXFx1MjJDN1wiLFwiZGl2b254XCI6XCJcXHUyMkM3XCIsXCJESmN5XCI6XCJcXHUwNDAyXCIsXCJkamN5XCI6XCJcXHUwNDUyXCIsXCJkbGNvcm5cIjpcIlxcdTIzMUVcIixcImRsY3JvcFwiOlwiXFx1MjMwRFwiLFwiZG9sbGFyXCI6XCIkXCIsXCJEb3BmXCI6XCJcXHVEODM1XFx1REQzQlwiLFwiZG9wZlwiOlwiXFx1RDgzNVxcdURENTVcIixcIkRvdFwiOlwiXFx1MDBBOFwiLFwiZG90XCI6XCJcXHUwMkQ5XCIsXCJEb3REb3RcIjpcIlxcdTIwRENcIixcImRvdGVxXCI6XCJcXHUyMjUwXCIsXCJkb3RlcWRvdFwiOlwiXFx1MjI1MVwiLFwiRG90RXF1YWxcIjpcIlxcdTIyNTBcIixcImRvdG1pbnVzXCI6XCJcXHUyMjM4XCIsXCJkb3RwbHVzXCI6XCJcXHUyMjE0XCIsXCJkb3RzcXVhcmVcIjpcIlxcdTIyQTFcIixcImRvdWJsZWJhcndlZGdlXCI6XCJcXHUyMzA2XCIsXCJEb3VibGVDb250b3VySW50ZWdyYWxcIjpcIlxcdTIyMkZcIixcIkRvdWJsZURvdFwiOlwiXFx1MDBBOFwiLFwiRG91YmxlRG93bkFycm93XCI6XCJcXHUyMUQzXCIsXCJEb3VibGVMZWZ0QXJyb3dcIjpcIlxcdTIxRDBcIixcIkRvdWJsZUxlZnRSaWdodEFycm93XCI6XCJcXHUyMUQ0XCIsXCJEb3VibGVMZWZ0VGVlXCI6XCJcXHUyQUU0XCIsXCJEb3VibGVMb25nTGVmdEFycm93XCI6XCJcXHUyN0Y4XCIsXCJEb3VibGVMb25nTGVmdFJpZ2h0QXJyb3dcIjpcIlxcdTI3RkFcIixcIkRvdWJsZUxvbmdSaWdodEFycm93XCI6XCJcXHUyN0Y5XCIsXCJEb3VibGVSaWdodEFycm93XCI6XCJcXHUyMUQyXCIsXCJEb3VibGVSaWdodFRlZVwiOlwiXFx1MjJBOFwiLFwiRG91YmxlVXBBcnJvd1wiOlwiXFx1MjFEMVwiLFwiRG91YmxlVXBEb3duQXJyb3dcIjpcIlxcdTIxRDVcIixcIkRvdWJsZVZlcnRpY2FsQmFyXCI6XCJcXHUyMjI1XCIsXCJEb3duQXJyb3dCYXJcIjpcIlxcdTI5MTNcIixcImRvd25hcnJvd1wiOlwiXFx1MjE5M1wiLFwiRG93bkFycm93XCI6XCJcXHUyMTkzXCIsXCJEb3duYXJyb3dcIjpcIlxcdTIxRDNcIixcIkRvd25BcnJvd1VwQXJyb3dcIjpcIlxcdTIxRjVcIixcIkRvd25CcmV2ZVwiOlwiXFx1MDMxMVwiLFwiZG93bmRvd25hcnJvd3NcIjpcIlxcdTIxQ0FcIixcImRvd25oYXJwb29ubGVmdFwiOlwiXFx1MjFDM1wiLFwiZG93bmhhcnBvb25yaWdodFwiOlwiXFx1MjFDMlwiLFwiRG93bkxlZnRSaWdodFZlY3RvclwiOlwiXFx1Mjk1MFwiLFwiRG93bkxlZnRUZWVWZWN0b3JcIjpcIlxcdTI5NUVcIixcIkRvd25MZWZ0VmVjdG9yQmFyXCI6XCJcXHUyOTU2XCIsXCJEb3duTGVmdFZlY3RvclwiOlwiXFx1MjFCRFwiLFwiRG93blJpZ2h0VGVlVmVjdG9yXCI6XCJcXHUyOTVGXCIsXCJEb3duUmlnaHRWZWN0b3JCYXJcIjpcIlxcdTI5NTdcIixcIkRvd25SaWdodFZlY3RvclwiOlwiXFx1MjFDMVwiLFwiRG93blRlZUFycm93XCI6XCJcXHUyMUE3XCIsXCJEb3duVGVlXCI6XCJcXHUyMkE0XCIsXCJkcmJrYXJvd1wiOlwiXFx1MjkxMFwiLFwiZHJjb3JuXCI6XCJcXHUyMzFGXCIsXCJkcmNyb3BcIjpcIlxcdTIzMENcIixcIkRzY3JcIjpcIlxcdUQ4MzVcXHVEQzlGXCIsXCJkc2NyXCI6XCJcXHVEODM1XFx1RENCOVwiLFwiRFNjeVwiOlwiXFx1MDQwNVwiLFwiZHNjeVwiOlwiXFx1MDQ1NVwiLFwiZHNvbFwiOlwiXFx1MjlGNlwiLFwiRHN0cm9rXCI6XCJcXHUwMTEwXCIsXCJkc3Ryb2tcIjpcIlxcdTAxMTFcIixcImR0ZG90XCI6XCJcXHUyMkYxXCIsXCJkdHJpXCI6XCJcXHUyNUJGXCIsXCJkdHJpZlwiOlwiXFx1MjVCRVwiLFwiZHVhcnJcIjpcIlxcdTIxRjVcIixcImR1aGFyXCI6XCJcXHUyOTZGXCIsXCJkd2FuZ2xlXCI6XCJcXHUyOUE2XCIsXCJEWmN5XCI6XCJcXHUwNDBGXCIsXCJkemN5XCI6XCJcXHUwNDVGXCIsXCJkemlncmFyclwiOlwiXFx1MjdGRlwiLFwiRWFjdXRlXCI6XCJcXHUwMEM5XCIsXCJlYWN1dGVcIjpcIlxcdTAwRTlcIixcImVhc3RlclwiOlwiXFx1MkE2RVwiLFwiRWNhcm9uXCI6XCJcXHUwMTFBXCIsXCJlY2Fyb25cIjpcIlxcdTAxMUJcIixcIkVjaXJjXCI6XCJcXHUwMENBXCIsXCJlY2lyY1wiOlwiXFx1MDBFQVwiLFwiZWNpclwiOlwiXFx1MjI1NlwiLFwiZWNvbG9uXCI6XCJcXHUyMjU1XCIsXCJFY3lcIjpcIlxcdTA0MkRcIixcImVjeVwiOlwiXFx1MDQ0RFwiLFwiZUREb3RcIjpcIlxcdTJBNzdcIixcIkVkb3RcIjpcIlxcdTAxMTZcIixcImVkb3RcIjpcIlxcdTAxMTdcIixcImVEb3RcIjpcIlxcdTIyNTFcIixcImVlXCI6XCJcXHUyMTQ3XCIsXCJlZkRvdFwiOlwiXFx1MjI1MlwiLFwiRWZyXCI6XCJcXHVEODM1XFx1REQwOFwiLFwiZWZyXCI6XCJcXHVEODM1XFx1REQyMlwiLFwiZWdcIjpcIlxcdTJBOUFcIixcIkVncmF2ZVwiOlwiXFx1MDBDOFwiLFwiZWdyYXZlXCI6XCJcXHUwMEU4XCIsXCJlZ3NcIjpcIlxcdTJBOTZcIixcImVnc2RvdFwiOlwiXFx1MkE5OFwiLFwiZWxcIjpcIlxcdTJBOTlcIixcIkVsZW1lbnRcIjpcIlxcdTIyMDhcIixcImVsaW50ZXJzXCI6XCJcXHUyM0U3XCIsXCJlbGxcIjpcIlxcdTIxMTNcIixcImVsc1wiOlwiXFx1MkE5NVwiLFwiZWxzZG90XCI6XCJcXHUyQTk3XCIsXCJFbWFjclwiOlwiXFx1MDExMlwiLFwiZW1hY3JcIjpcIlxcdTAxMTNcIixcImVtcHR5XCI6XCJcXHUyMjA1XCIsXCJlbXB0eXNldFwiOlwiXFx1MjIwNVwiLFwiRW1wdHlTbWFsbFNxdWFyZVwiOlwiXFx1MjVGQlwiLFwiZW1wdHl2XCI6XCJcXHUyMjA1XCIsXCJFbXB0eVZlcnlTbWFsbFNxdWFyZVwiOlwiXFx1MjVBQlwiLFwiZW1zcDEzXCI6XCJcXHUyMDA0XCIsXCJlbXNwMTRcIjpcIlxcdTIwMDVcIixcImVtc3BcIjpcIlxcdTIwMDNcIixcIkVOR1wiOlwiXFx1MDE0QVwiLFwiZW5nXCI6XCJcXHUwMTRCXCIsXCJlbnNwXCI6XCJcXHUyMDAyXCIsXCJFb2dvblwiOlwiXFx1MDExOFwiLFwiZW9nb25cIjpcIlxcdTAxMTlcIixcIkVvcGZcIjpcIlxcdUQ4MzVcXHVERDNDXCIsXCJlb3BmXCI6XCJcXHVEODM1XFx1REQ1NlwiLFwiZXBhclwiOlwiXFx1MjJENVwiLFwiZXBhcnNsXCI6XCJcXHUyOUUzXCIsXCJlcGx1c1wiOlwiXFx1MkE3MVwiLFwiZXBzaVwiOlwiXFx1MDNCNVwiLFwiRXBzaWxvblwiOlwiXFx1MDM5NVwiLFwiZXBzaWxvblwiOlwiXFx1MDNCNVwiLFwiZXBzaXZcIjpcIlxcdTAzRjVcIixcImVxY2lyY1wiOlwiXFx1MjI1NlwiLFwiZXFjb2xvblwiOlwiXFx1MjI1NVwiLFwiZXFzaW1cIjpcIlxcdTIyNDJcIixcImVxc2xhbnRndHJcIjpcIlxcdTJBOTZcIixcImVxc2xhbnRsZXNzXCI6XCJcXHUyQTk1XCIsXCJFcXVhbFwiOlwiXFx1MkE3NVwiLFwiZXF1YWxzXCI6XCI9XCIsXCJFcXVhbFRpbGRlXCI6XCJcXHUyMjQyXCIsXCJlcXVlc3RcIjpcIlxcdTIyNUZcIixcIkVxdWlsaWJyaXVtXCI6XCJcXHUyMUNDXCIsXCJlcXVpdlwiOlwiXFx1MjI2MVwiLFwiZXF1aXZERFwiOlwiXFx1MkE3OFwiLFwiZXF2cGFyc2xcIjpcIlxcdTI5RTVcIixcImVyYXJyXCI6XCJcXHUyOTcxXCIsXCJlckRvdFwiOlwiXFx1MjI1M1wiLFwiZXNjclwiOlwiXFx1MjEyRlwiLFwiRXNjclwiOlwiXFx1MjEzMFwiLFwiZXNkb3RcIjpcIlxcdTIyNTBcIixcIkVzaW1cIjpcIlxcdTJBNzNcIixcImVzaW1cIjpcIlxcdTIyNDJcIixcIkV0YVwiOlwiXFx1MDM5N1wiLFwiZXRhXCI6XCJcXHUwM0I3XCIsXCJFVEhcIjpcIlxcdTAwRDBcIixcImV0aFwiOlwiXFx1MDBGMFwiLFwiRXVtbFwiOlwiXFx1MDBDQlwiLFwiZXVtbFwiOlwiXFx1MDBFQlwiLFwiZXVyb1wiOlwiXFx1MjBBQ1wiLFwiZXhjbFwiOlwiIVwiLFwiZXhpc3RcIjpcIlxcdTIyMDNcIixcIkV4aXN0c1wiOlwiXFx1MjIwM1wiLFwiZXhwZWN0YXRpb25cIjpcIlxcdTIxMzBcIixcImV4cG9uZW50aWFsZVwiOlwiXFx1MjE0N1wiLFwiRXhwb25lbnRpYWxFXCI6XCJcXHUyMTQ3XCIsXCJmYWxsaW5nZG90c2VxXCI6XCJcXHUyMjUyXCIsXCJGY3lcIjpcIlxcdTA0MjRcIixcImZjeVwiOlwiXFx1MDQ0NFwiLFwiZmVtYWxlXCI6XCJcXHUyNjQwXCIsXCJmZmlsaWdcIjpcIlxcdUZCMDNcIixcImZmbGlnXCI6XCJcXHVGQjAwXCIsXCJmZmxsaWdcIjpcIlxcdUZCMDRcIixcIkZmclwiOlwiXFx1RDgzNVxcdUREMDlcIixcImZmclwiOlwiXFx1RDgzNVxcdUREMjNcIixcImZpbGlnXCI6XCJcXHVGQjAxXCIsXCJGaWxsZWRTbWFsbFNxdWFyZVwiOlwiXFx1MjVGQ1wiLFwiRmlsbGVkVmVyeVNtYWxsU3F1YXJlXCI6XCJcXHUyNUFBXCIsXCJmamxpZ1wiOlwiZmpcIixcImZsYXRcIjpcIlxcdTI2NkRcIixcImZsbGlnXCI6XCJcXHVGQjAyXCIsXCJmbHRuc1wiOlwiXFx1MjVCMVwiLFwiZm5vZlwiOlwiXFx1MDE5MlwiLFwiRm9wZlwiOlwiXFx1RDgzNVxcdUREM0RcIixcImZvcGZcIjpcIlxcdUQ4MzVcXHVERDU3XCIsXCJmb3JhbGxcIjpcIlxcdTIyMDBcIixcIkZvckFsbFwiOlwiXFx1MjIwMFwiLFwiZm9ya1wiOlwiXFx1MjJENFwiLFwiZm9ya3ZcIjpcIlxcdTJBRDlcIixcIkZvdXJpZXJ0cmZcIjpcIlxcdTIxMzFcIixcImZwYXJ0aW50XCI6XCJcXHUyQTBEXCIsXCJmcmFjMTJcIjpcIlxcdTAwQkRcIixcImZyYWMxM1wiOlwiXFx1MjE1M1wiLFwiZnJhYzE0XCI6XCJcXHUwMEJDXCIsXCJmcmFjMTVcIjpcIlxcdTIxNTVcIixcImZyYWMxNlwiOlwiXFx1MjE1OVwiLFwiZnJhYzE4XCI6XCJcXHUyMTVCXCIsXCJmcmFjMjNcIjpcIlxcdTIxNTRcIixcImZyYWMyNVwiOlwiXFx1MjE1NlwiLFwiZnJhYzM0XCI6XCJcXHUwMEJFXCIsXCJmcmFjMzVcIjpcIlxcdTIxNTdcIixcImZyYWMzOFwiOlwiXFx1MjE1Q1wiLFwiZnJhYzQ1XCI6XCJcXHUyMTU4XCIsXCJmcmFjNTZcIjpcIlxcdTIxNUFcIixcImZyYWM1OFwiOlwiXFx1MjE1RFwiLFwiZnJhYzc4XCI6XCJcXHUyMTVFXCIsXCJmcmFzbFwiOlwiXFx1MjA0NFwiLFwiZnJvd25cIjpcIlxcdTIzMjJcIixcImZzY3JcIjpcIlxcdUQ4MzVcXHVEQ0JCXCIsXCJGc2NyXCI6XCJcXHUyMTMxXCIsXCJnYWN1dGVcIjpcIlxcdTAxRjVcIixcIkdhbW1hXCI6XCJcXHUwMzkzXCIsXCJnYW1tYVwiOlwiXFx1MDNCM1wiLFwiR2FtbWFkXCI6XCJcXHUwM0RDXCIsXCJnYW1tYWRcIjpcIlxcdTAzRERcIixcImdhcFwiOlwiXFx1MkE4NlwiLFwiR2JyZXZlXCI6XCJcXHUwMTFFXCIsXCJnYnJldmVcIjpcIlxcdTAxMUZcIixcIkdjZWRpbFwiOlwiXFx1MDEyMlwiLFwiR2NpcmNcIjpcIlxcdTAxMUNcIixcImdjaXJjXCI6XCJcXHUwMTFEXCIsXCJHY3lcIjpcIlxcdTA0MTNcIixcImdjeVwiOlwiXFx1MDQzM1wiLFwiR2RvdFwiOlwiXFx1MDEyMFwiLFwiZ2RvdFwiOlwiXFx1MDEyMVwiLFwiZ2VcIjpcIlxcdTIyNjVcIixcImdFXCI6XCJcXHUyMjY3XCIsXCJnRWxcIjpcIlxcdTJBOENcIixcImdlbFwiOlwiXFx1MjJEQlwiLFwiZ2VxXCI6XCJcXHUyMjY1XCIsXCJnZXFxXCI6XCJcXHUyMjY3XCIsXCJnZXFzbGFudFwiOlwiXFx1MkE3RVwiLFwiZ2VzY2NcIjpcIlxcdTJBQTlcIixcImdlc1wiOlwiXFx1MkE3RVwiLFwiZ2VzZG90XCI6XCJcXHUyQTgwXCIsXCJnZXNkb3RvXCI6XCJcXHUyQTgyXCIsXCJnZXNkb3RvbFwiOlwiXFx1MkE4NFwiLFwiZ2VzbFwiOlwiXFx1MjJEQlxcdUZFMDBcIixcImdlc2xlc1wiOlwiXFx1MkE5NFwiLFwiR2ZyXCI6XCJcXHVEODM1XFx1REQwQVwiLFwiZ2ZyXCI6XCJcXHVEODM1XFx1REQyNFwiLFwiZ2dcIjpcIlxcdTIyNkJcIixcIkdnXCI6XCJcXHUyMkQ5XCIsXCJnZ2dcIjpcIlxcdTIyRDlcIixcImdpbWVsXCI6XCJcXHUyMTM3XCIsXCJHSmN5XCI6XCJcXHUwNDAzXCIsXCJnamN5XCI6XCJcXHUwNDUzXCIsXCJnbGFcIjpcIlxcdTJBQTVcIixcImdsXCI6XCJcXHUyMjc3XCIsXCJnbEVcIjpcIlxcdTJBOTJcIixcImdsalwiOlwiXFx1MkFBNFwiLFwiZ25hcFwiOlwiXFx1MkE4QVwiLFwiZ25hcHByb3hcIjpcIlxcdTJBOEFcIixcImduZVwiOlwiXFx1MkE4OFwiLFwiZ25FXCI6XCJcXHUyMjY5XCIsXCJnbmVxXCI6XCJcXHUyQTg4XCIsXCJnbmVxcVwiOlwiXFx1MjI2OVwiLFwiZ25zaW1cIjpcIlxcdTIyRTdcIixcIkdvcGZcIjpcIlxcdUQ4MzVcXHVERDNFXCIsXCJnb3BmXCI6XCJcXHVEODM1XFx1REQ1OFwiLFwiZ3JhdmVcIjpcImBcIixcIkdyZWF0ZXJFcXVhbFwiOlwiXFx1MjI2NVwiLFwiR3JlYXRlckVxdWFsTGVzc1wiOlwiXFx1MjJEQlwiLFwiR3JlYXRlckZ1bGxFcXVhbFwiOlwiXFx1MjI2N1wiLFwiR3JlYXRlckdyZWF0ZXJcIjpcIlxcdTJBQTJcIixcIkdyZWF0ZXJMZXNzXCI6XCJcXHUyMjc3XCIsXCJHcmVhdGVyU2xhbnRFcXVhbFwiOlwiXFx1MkE3RVwiLFwiR3JlYXRlclRpbGRlXCI6XCJcXHUyMjczXCIsXCJHc2NyXCI6XCJcXHVEODM1XFx1RENBMlwiLFwiZ3NjclwiOlwiXFx1MjEwQVwiLFwiZ3NpbVwiOlwiXFx1MjI3M1wiLFwiZ3NpbWVcIjpcIlxcdTJBOEVcIixcImdzaW1sXCI6XCJcXHUyQTkwXCIsXCJndGNjXCI6XCJcXHUyQUE3XCIsXCJndGNpclwiOlwiXFx1MkE3QVwiLFwiZ3RcIjpcIj5cIixcIkdUXCI6XCI+XCIsXCJHdFwiOlwiXFx1MjI2QlwiLFwiZ3Rkb3RcIjpcIlxcdTIyRDdcIixcImd0bFBhclwiOlwiXFx1Mjk5NVwiLFwiZ3RxdWVzdFwiOlwiXFx1MkE3Q1wiLFwiZ3RyYXBwcm94XCI6XCJcXHUyQTg2XCIsXCJndHJhcnJcIjpcIlxcdTI5NzhcIixcImd0cmRvdFwiOlwiXFx1MjJEN1wiLFwiZ3RyZXFsZXNzXCI6XCJcXHUyMkRCXCIsXCJndHJlcXFsZXNzXCI6XCJcXHUyQThDXCIsXCJndHJsZXNzXCI6XCJcXHUyMjc3XCIsXCJndHJzaW1cIjpcIlxcdTIyNzNcIixcImd2ZXJ0bmVxcVwiOlwiXFx1MjI2OVxcdUZFMDBcIixcImd2bkVcIjpcIlxcdTIyNjlcXHVGRTAwXCIsXCJIYWNla1wiOlwiXFx1MDJDN1wiLFwiaGFpcnNwXCI6XCJcXHUyMDBBXCIsXCJoYWxmXCI6XCJcXHUwMEJEXCIsXCJoYW1pbHRcIjpcIlxcdTIxMEJcIixcIkhBUkRjeVwiOlwiXFx1MDQyQVwiLFwiaGFyZGN5XCI6XCJcXHUwNDRBXCIsXCJoYXJyY2lyXCI6XCJcXHUyOTQ4XCIsXCJoYXJyXCI6XCJcXHUyMTk0XCIsXCJoQXJyXCI6XCJcXHUyMUQ0XCIsXCJoYXJyd1wiOlwiXFx1MjFBRFwiLFwiSGF0XCI6XCJeXCIsXCJoYmFyXCI6XCJcXHUyMTBGXCIsXCJIY2lyY1wiOlwiXFx1MDEyNFwiLFwiaGNpcmNcIjpcIlxcdTAxMjVcIixcImhlYXJ0c1wiOlwiXFx1MjY2NVwiLFwiaGVhcnRzdWl0XCI6XCJcXHUyNjY1XCIsXCJoZWxsaXBcIjpcIlxcdTIwMjZcIixcImhlcmNvblwiOlwiXFx1MjJCOVwiLFwiaGZyXCI6XCJcXHVEODM1XFx1REQyNVwiLFwiSGZyXCI6XCJcXHUyMTBDXCIsXCJIaWxiZXJ0U3BhY2VcIjpcIlxcdTIxMEJcIixcImhrc2Vhcm93XCI6XCJcXHUyOTI1XCIsXCJoa3N3YXJvd1wiOlwiXFx1MjkyNlwiLFwiaG9hcnJcIjpcIlxcdTIxRkZcIixcImhvbXRodFwiOlwiXFx1MjIzQlwiLFwiaG9va2xlZnRhcnJvd1wiOlwiXFx1MjFBOVwiLFwiaG9va3JpZ2h0YXJyb3dcIjpcIlxcdTIxQUFcIixcImhvcGZcIjpcIlxcdUQ4MzVcXHVERDU5XCIsXCJIb3BmXCI6XCJcXHUyMTBEXCIsXCJob3JiYXJcIjpcIlxcdTIwMTVcIixcIkhvcml6b250YWxMaW5lXCI6XCJcXHUyNTAwXCIsXCJoc2NyXCI6XCJcXHVEODM1XFx1RENCRFwiLFwiSHNjclwiOlwiXFx1MjEwQlwiLFwiaHNsYXNoXCI6XCJcXHUyMTBGXCIsXCJIc3Ryb2tcIjpcIlxcdTAxMjZcIixcImhzdHJva1wiOlwiXFx1MDEyN1wiLFwiSHVtcERvd25IdW1wXCI6XCJcXHUyMjRFXCIsXCJIdW1wRXF1YWxcIjpcIlxcdTIyNEZcIixcImh5YnVsbFwiOlwiXFx1MjA0M1wiLFwiaHlwaGVuXCI6XCJcXHUyMDEwXCIsXCJJYWN1dGVcIjpcIlxcdTAwQ0RcIixcImlhY3V0ZVwiOlwiXFx1MDBFRFwiLFwiaWNcIjpcIlxcdTIwNjNcIixcIkljaXJjXCI6XCJcXHUwMENFXCIsXCJpY2lyY1wiOlwiXFx1MDBFRVwiLFwiSWN5XCI6XCJcXHUwNDE4XCIsXCJpY3lcIjpcIlxcdTA0MzhcIixcIklkb3RcIjpcIlxcdTAxMzBcIixcIklFY3lcIjpcIlxcdTA0MTVcIixcImllY3lcIjpcIlxcdTA0MzVcIixcImlleGNsXCI6XCJcXHUwMEExXCIsXCJpZmZcIjpcIlxcdTIxRDRcIixcImlmclwiOlwiXFx1RDgzNVxcdUREMjZcIixcIklmclwiOlwiXFx1MjExMVwiLFwiSWdyYXZlXCI6XCJcXHUwMENDXCIsXCJpZ3JhdmVcIjpcIlxcdTAwRUNcIixcImlpXCI6XCJcXHUyMTQ4XCIsXCJpaWlpbnRcIjpcIlxcdTJBMENcIixcImlpaW50XCI6XCJcXHUyMjJEXCIsXCJpaW5maW5cIjpcIlxcdTI5RENcIixcImlpb3RhXCI6XCJcXHUyMTI5XCIsXCJJSmxpZ1wiOlwiXFx1MDEzMlwiLFwiaWpsaWdcIjpcIlxcdTAxMzNcIixcIkltYWNyXCI6XCJcXHUwMTJBXCIsXCJpbWFjclwiOlwiXFx1MDEyQlwiLFwiaW1hZ2VcIjpcIlxcdTIxMTFcIixcIkltYWdpbmFyeUlcIjpcIlxcdTIxNDhcIixcImltYWdsaW5lXCI6XCJcXHUyMTEwXCIsXCJpbWFncGFydFwiOlwiXFx1MjExMVwiLFwiaW1hdGhcIjpcIlxcdTAxMzFcIixcIkltXCI6XCJcXHUyMTExXCIsXCJpbW9mXCI6XCJcXHUyMkI3XCIsXCJpbXBlZFwiOlwiXFx1MDFCNVwiLFwiSW1wbGllc1wiOlwiXFx1MjFEMlwiLFwiaW5jYXJlXCI6XCJcXHUyMTA1XCIsXCJpblwiOlwiXFx1MjIwOFwiLFwiaW5maW5cIjpcIlxcdTIyMUVcIixcImluZmludGllXCI6XCJcXHUyOUREXCIsXCJpbm9kb3RcIjpcIlxcdTAxMzFcIixcImludGNhbFwiOlwiXFx1MjJCQVwiLFwiaW50XCI6XCJcXHUyMjJCXCIsXCJJbnRcIjpcIlxcdTIyMkNcIixcImludGVnZXJzXCI6XCJcXHUyMTI0XCIsXCJJbnRlZ3JhbFwiOlwiXFx1MjIyQlwiLFwiaW50ZXJjYWxcIjpcIlxcdTIyQkFcIixcIkludGVyc2VjdGlvblwiOlwiXFx1MjJDMlwiLFwiaW50bGFyaGtcIjpcIlxcdTJBMTdcIixcImludHByb2RcIjpcIlxcdTJBM0NcIixcIkludmlzaWJsZUNvbW1hXCI6XCJcXHUyMDYzXCIsXCJJbnZpc2libGVUaW1lc1wiOlwiXFx1MjA2MlwiLFwiSU9jeVwiOlwiXFx1MDQwMVwiLFwiaW9jeVwiOlwiXFx1MDQ1MVwiLFwiSW9nb25cIjpcIlxcdTAxMkVcIixcImlvZ29uXCI6XCJcXHUwMTJGXCIsXCJJb3BmXCI6XCJcXHVEODM1XFx1REQ0MFwiLFwiaW9wZlwiOlwiXFx1RDgzNVxcdURENUFcIixcIklvdGFcIjpcIlxcdTAzOTlcIixcImlvdGFcIjpcIlxcdTAzQjlcIixcImlwcm9kXCI6XCJcXHUyQTNDXCIsXCJpcXVlc3RcIjpcIlxcdTAwQkZcIixcImlzY3JcIjpcIlxcdUQ4MzVcXHVEQ0JFXCIsXCJJc2NyXCI6XCJcXHUyMTEwXCIsXCJpc2luXCI6XCJcXHUyMjA4XCIsXCJpc2luZG90XCI6XCJcXHUyMkY1XCIsXCJpc2luRVwiOlwiXFx1MjJGOVwiLFwiaXNpbnNcIjpcIlxcdTIyRjRcIixcImlzaW5zdlwiOlwiXFx1MjJGM1wiLFwiaXNpbnZcIjpcIlxcdTIyMDhcIixcIml0XCI6XCJcXHUyMDYyXCIsXCJJdGlsZGVcIjpcIlxcdTAxMjhcIixcIml0aWxkZVwiOlwiXFx1MDEyOVwiLFwiSXVrY3lcIjpcIlxcdTA0MDZcIixcIml1a2N5XCI6XCJcXHUwNDU2XCIsXCJJdW1sXCI6XCJcXHUwMENGXCIsXCJpdW1sXCI6XCJcXHUwMEVGXCIsXCJKY2lyY1wiOlwiXFx1MDEzNFwiLFwiamNpcmNcIjpcIlxcdTAxMzVcIixcIkpjeVwiOlwiXFx1MDQxOVwiLFwiamN5XCI6XCJcXHUwNDM5XCIsXCJKZnJcIjpcIlxcdUQ4MzVcXHVERDBEXCIsXCJqZnJcIjpcIlxcdUQ4MzVcXHVERDI3XCIsXCJqbWF0aFwiOlwiXFx1MDIzN1wiLFwiSm9wZlwiOlwiXFx1RDgzNVxcdURENDFcIixcImpvcGZcIjpcIlxcdUQ4MzVcXHVERDVCXCIsXCJKc2NyXCI6XCJcXHVEODM1XFx1RENBNVwiLFwianNjclwiOlwiXFx1RDgzNVxcdURDQkZcIixcIkpzZXJjeVwiOlwiXFx1MDQwOFwiLFwianNlcmN5XCI6XCJcXHUwNDU4XCIsXCJKdWtjeVwiOlwiXFx1MDQwNFwiLFwianVrY3lcIjpcIlxcdTA0NTRcIixcIkthcHBhXCI6XCJcXHUwMzlBXCIsXCJrYXBwYVwiOlwiXFx1MDNCQVwiLFwia2FwcGF2XCI6XCJcXHUwM0YwXCIsXCJLY2VkaWxcIjpcIlxcdTAxMzZcIixcImtjZWRpbFwiOlwiXFx1MDEzN1wiLFwiS2N5XCI6XCJcXHUwNDFBXCIsXCJrY3lcIjpcIlxcdTA0M0FcIixcIktmclwiOlwiXFx1RDgzNVxcdUREMEVcIixcImtmclwiOlwiXFx1RDgzNVxcdUREMjhcIixcImtncmVlblwiOlwiXFx1MDEzOFwiLFwiS0hjeVwiOlwiXFx1MDQyNVwiLFwia2hjeVwiOlwiXFx1MDQ0NVwiLFwiS0pjeVwiOlwiXFx1MDQwQ1wiLFwia2pjeVwiOlwiXFx1MDQ1Q1wiLFwiS29wZlwiOlwiXFx1RDgzNVxcdURENDJcIixcImtvcGZcIjpcIlxcdUQ4MzVcXHVERDVDXCIsXCJLc2NyXCI6XCJcXHVEODM1XFx1RENBNlwiLFwia3NjclwiOlwiXFx1RDgzNVxcdURDQzBcIixcImxBYXJyXCI6XCJcXHUyMURBXCIsXCJMYWN1dGVcIjpcIlxcdTAxMzlcIixcImxhY3V0ZVwiOlwiXFx1MDEzQVwiLFwibGFlbXB0eXZcIjpcIlxcdTI5QjRcIixcImxhZ3JhblwiOlwiXFx1MjExMlwiLFwiTGFtYmRhXCI6XCJcXHUwMzlCXCIsXCJsYW1iZGFcIjpcIlxcdTAzQkJcIixcImxhbmdcIjpcIlxcdTI3RThcIixcIkxhbmdcIjpcIlxcdTI3RUFcIixcImxhbmdkXCI6XCJcXHUyOTkxXCIsXCJsYW5nbGVcIjpcIlxcdTI3RThcIixcImxhcFwiOlwiXFx1MkE4NVwiLFwiTGFwbGFjZXRyZlwiOlwiXFx1MjExMlwiLFwibGFxdW9cIjpcIlxcdTAwQUJcIixcImxhcnJiXCI6XCJcXHUyMUU0XCIsXCJsYXJyYmZzXCI6XCJcXHUyOTFGXCIsXCJsYXJyXCI6XCJcXHUyMTkwXCIsXCJMYXJyXCI6XCJcXHUyMTlFXCIsXCJsQXJyXCI6XCJcXHUyMUQwXCIsXCJsYXJyZnNcIjpcIlxcdTI5MURcIixcImxhcnJoa1wiOlwiXFx1MjFBOVwiLFwibGFycmxwXCI6XCJcXHUyMUFCXCIsXCJsYXJycGxcIjpcIlxcdTI5MzlcIixcImxhcnJzaW1cIjpcIlxcdTI5NzNcIixcImxhcnJ0bFwiOlwiXFx1MjFBMlwiLFwibGF0YWlsXCI6XCJcXHUyOTE5XCIsXCJsQXRhaWxcIjpcIlxcdTI5MUJcIixcImxhdFwiOlwiXFx1MkFBQlwiLFwibGF0ZVwiOlwiXFx1MkFBRFwiLFwibGF0ZXNcIjpcIlxcdTJBQURcXHVGRTAwXCIsXCJsYmFyclwiOlwiXFx1MjkwQ1wiLFwibEJhcnJcIjpcIlxcdTI5MEVcIixcImxiYnJrXCI6XCJcXHUyNzcyXCIsXCJsYnJhY2VcIjpcIntcIixcImxicmFja1wiOlwiW1wiLFwibGJya2VcIjpcIlxcdTI5OEJcIixcImxicmtzbGRcIjpcIlxcdTI5OEZcIixcImxicmtzbHVcIjpcIlxcdTI5OERcIixcIkxjYXJvblwiOlwiXFx1MDEzRFwiLFwibGNhcm9uXCI6XCJcXHUwMTNFXCIsXCJMY2VkaWxcIjpcIlxcdTAxM0JcIixcImxjZWRpbFwiOlwiXFx1MDEzQ1wiLFwibGNlaWxcIjpcIlxcdTIzMDhcIixcImxjdWJcIjpcIntcIixcIkxjeVwiOlwiXFx1MDQxQlwiLFwibGN5XCI6XCJcXHUwNDNCXCIsXCJsZGNhXCI6XCJcXHUyOTM2XCIsXCJsZHF1b1wiOlwiXFx1MjAxQ1wiLFwibGRxdW9yXCI6XCJcXHUyMDFFXCIsXCJsZHJkaGFyXCI6XCJcXHUyOTY3XCIsXCJsZHJ1c2hhclwiOlwiXFx1Mjk0QlwiLFwibGRzaFwiOlwiXFx1MjFCMlwiLFwibGVcIjpcIlxcdTIyNjRcIixcImxFXCI6XCJcXHUyMjY2XCIsXCJMZWZ0QW5nbGVCcmFja2V0XCI6XCJcXHUyN0U4XCIsXCJMZWZ0QXJyb3dCYXJcIjpcIlxcdTIxRTRcIixcImxlZnRhcnJvd1wiOlwiXFx1MjE5MFwiLFwiTGVmdEFycm93XCI6XCJcXHUyMTkwXCIsXCJMZWZ0YXJyb3dcIjpcIlxcdTIxRDBcIixcIkxlZnRBcnJvd1JpZ2h0QXJyb3dcIjpcIlxcdTIxQzZcIixcImxlZnRhcnJvd3RhaWxcIjpcIlxcdTIxQTJcIixcIkxlZnRDZWlsaW5nXCI6XCJcXHUyMzA4XCIsXCJMZWZ0RG91YmxlQnJhY2tldFwiOlwiXFx1MjdFNlwiLFwiTGVmdERvd25UZWVWZWN0b3JcIjpcIlxcdTI5NjFcIixcIkxlZnREb3duVmVjdG9yQmFyXCI6XCJcXHUyOTU5XCIsXCJMZWZ0RG93blZlY3RvclwiOlwiXFx1MjFDM1wiLFwiTGVmdEZsb29yXCI6XCJcXHUyMzBBXCIsXCJsZWZ0aGFycG9vbmRvd25cIjpcIlxcdTIxQkRcIixcImxlZnRoYXJwb29udXBcIjpcIlxcdTIxQkNcIixcImxlZnRsZWZ0YXJyb3dzXCI6XCJcXHUyMUM3XCIsXCJsZWZ0cmlnaHRhcnJvd1wiOlwiXFx1MjE5NFwiLFwiTGVmdFJpZ2h0QXJyb3dcIjpcIlxcdTIxOTRcIixcIkxlZnRyaWdodGFycm93XCI6XCJcXHUyMUQ0XCIsXCJsZWZ0cmlnaHRhcnJvd3NcIjpcIlxcdTIxQzZcIixcImxlZnRyaWdodGhhcnBvb25zXCI6XCJcXHUyMUNCXCIsXCJsZWZ0cmlnaHRzcXVpZ2Fycm93XCI6XCJcXHUyMUFEXCIsXCJMZWZ0UmlnaHRWZWN0b3JcIjpcIlxcdTI5NEVcIixcIkxlZnRUZWVBcnJvd1wiOlwiXFx1MjFBNFwiLFwiTGVmdFRlZVwiOlwiXFx1MjJBM1wiLFwiTGVmdFRlZVZlY3RvclwiOlwiXFx1Mjk1QVwiLFwibGVmdHRocmVldGltZXNcIjpcIlxcdTIyQ0JcIixcIkxlZnRUcmlhbmdsZUJhclwiOlwiXFx1MjlDRlwiLFwiTGVmdFRyaWFuZ2xlXCI6XCJcXHUyMkIyXCIsXCJMZWZ0VHJpYW5nbGVFcXVhbFwiOlwiXFx1MjJCNFwiLFwiTGVmdFVwRG93blZlY3RvclwiOlwiXFx1Mjk1MVwiLFwiTGVmdFVwVGVlVmVjdG9yXCI6XCJcXHUyOTYwXCIsXCJMZWZ0VXBWZWN0b3JCYXJcIjpcIlxcdTI5NThcIixcIkxlZnRVcFZlY3RvclwiOlwiXFx1MjFCRlwiLFwiTGVmdFZlY3RvckJhclwiOlwiXFx1Mjk1MlwiLFwiTGVmdFZlY3RvclwiOlwiXFx1MjFCQ1wiLFwibEVnXCI6XCJcXHUyQThCXCIsXCJsZWdcIjpcIlxcdTIyREFcIixcImxlcVwiOlwiXFx1MjI2NFwiLFwibGVxcVwiOlwiXFx1MjI2NlwiLFwibGVxc2xhbnRcIjpcIlxcdTJBN0RcIixcImxlc2NjXCI6XCJcXHUyQUE4XCIsXCJsZXNcIjpcIlxcdTJBN0RcIixcImxlc2RvdFwiOlwiXFx1MkE3RlwiLFwibGVzZG90b1wiOlwiXFx1MkE4MVwiLFwibGVzZG90b3JcIjpcIlxcdTJBODNcIixcImxlc2dcIjpcIlxcdTIyREFcXHVGRTAwXCIsXCJsZXNnZXNcIjpcIlxcdTJBOTNcIixcImxlc3NhcHByb3hcIjpcIlxcdTJBODVcIixcImxlc3Nkb3RcIjpcIlxcdTIyRDZcIixcImxlc3NlcWd0clwiOlwiXFx1MjJEQVwiLFwibGVzc2VxcWd0clwiOlwiXFx1MkE4QlwiLFwiTGVzc0VxdWFsR3JlYXRlclwiOlwiXFx1MjJEQVwiLFwiTGVzc0Z1bGxFcXVhbFwiOlwiXFx1MjI2NlwiLFwiTGVzc0dyZWF0ZXJcIjpcIlxcdTIyNzZcIixcImxlc3NndHJcIjpcIlxcdTIyNzZcIixcIkxlc3NMZXNzXCI6XCJcXHUyQUExXCIsXCJsZXNzc2ltXCI6XCJcXHUyMjcyXCIsXCJMZXNzU2xhbnRFcXVhbFwiOlwiXFx1MkE3RFwiLFwiTGVzc1RpbGRlXCI6XCJcXHUyMjcyXCIsXCJsZmlzaHRcIjpcIlxcdTI5N0NcIixcImxmbG9vclwiOlwiXFx1MjMwQVwiLFwiTGZyXCI6XCJcXHVEODM1XFx1REQwRlwiLFwibGZyXCI6XCJcXHVEODM1XFx1REQyOVwiLFwibGdcIjpcIlxcdTIyNzZcIixcImxnRVwiOlwiXFx1MkE5MVwiLFwibEhhclwiOlwiXFx1Mjk2MlwiLFwibGhhcmRcIjpcIlxcdTIxQkRcIixcImxoYXJ1XCI6XCJcXHUyMUJDXCIsXCJsaGFydWxcIjpcIlxcdTI5NkFcIixcImxoYmxrXCI6XCJcXHUyNTg0XCIsXCJMSmN5XCI6XCJcXHUwNDA5XCIsXCJsamN5XCI6XCJcXHUwNDU5XCIsXCJsbGFyclwiOlwiXFx1MjFDN1wiLFwibGxcIjpcIlxcdTIyNkFcIixcIkxsXCI6XCJcXHUyMkQ4XCIsXCJsbGNvcm5lclwiOlwiXFx1MjMxRVwiLFwiTGxlZnRhcnJvd1wiOlwiXFx1MjFEQVwiLFwibGxoYXJkXCI6XCJcXHUyOTZCXCIsXCJsbHRyaVwiOlwiXFx1MjVGQVwiLFwiTG1pZG90XCI6XCJcXHUwMTNGXCIsXCJsbWlkb3RcIjpcIlxcdTAxNDBcIixcImxtb3VzdGFjaGVcIjpcIlxcdTIzQjBcIixcImxtb3VzdFwiOlwiXFx1MjNCMFwiLFwibG5hcFwiOlwiXFx1MkE4OVwiLFwibG5hcHByb3hcIjpcIlxcdTJBODlcIixcImxuZVwiOlwiXFx1MkE4N1wiLFwibG5FXCI6XCJcXHUyMjY4XCIsXCJsbmVxXCI6XCJcXHUyQTg3XCIsXCJsbmVxcVwiOlwiXFx1MjI2OFwiLFwibG5zaW1cIjpcIlxcdTIyRTZcIixcImxvYW5nXCI6XCJcXHUyN0VDXCIsXCJsb2FyclwiOlwiXFx1MjFGRFwiLFwibG9icmtcIjpcIlxcdTI3RTZcIixcImxvbmdsZWZ0YXJyb3dcIjpcIlxcdTI3RjVcIixcIkxvbmdMZWZ0QXJyb3dcIjpcIlxcdTI3RjVcIixcIkxvbmdsZWZ0YXJyb3dcIjpcIlxcdTI3RjhcIixcImxvbmdsZWZ0cmlnaHRhcnJvd1wiOlwiXFx1MjdGN1wiLFwiTG9uZ0xlZnRSaWdodEFycm93XCI6XCJcXHUyN0Y3XCIsXCJMb25nbGVmdHJpZ2h0YXJyb3dcIjpcIlxcdTI3RkFcIixcImxvbmdtYXBzdG9cIjpcIlxcdTI3RkNcIixcImxvbmdyaWdodGFycm93XCI6XCJcXHUyN0Y2XCIsXCJMb25nUmlnaHRBcnJvd1wiOlwiXFx1MjdGNlwiLFwiTG9uZ3JpZ2h0YXJyb3dcIjpcIlxcdTI3RjlcIixcImxvb3BhcnJvd2xlZnRcIjpcIlxcdTIxQUJcIixcImxvb3BhcnJvd3JpZ2h0XCI6XCJcXHUyMUFDXCIsXCJsb3BhclwiOlwiXFx1Mjk4NVwiLFwiTG9wZlwiOlwiXFx1RDgzNVxcdURENDNcIixcImxvcGZcIjpcIlxcdUQ4MzVcXHVERDVEXCIsXCJsb3BsdXNcIjpcIlxcdTJBMkRcIixcImxvdGltZXNcIjpcIlxcdTJBMzRcIixcImxvd2FzdFwiOlwiXFx1MjIxN1wiLFwibG93YmFyXCI6XCJfXCIsXCJMb3dlckxlZnRBcnJvd1wiOlwiXFx1MjE5OVwiLFwiTG93ZXJSaWdodEFycm93XCI6XCJcXHUyMTk4XCIsXCJsb3pcIjpcIlxcdTI1Q0FcIixcImxvemVuZ2VcIjpcIlxcdTI1Q0FcIixcImxvemZcIjpcIlxcdTI5RUJcIixcImxwYXJcIjpcIihcIixcImxwYXJsdFwiOlwiXFx1Mjk5M1wiLFwibHJhcnJcIjpcIlxcdTIxQzZcIixcImxyY29ybmVyXCI6XCJcXHUyMzFGXCIsXCJscmhhclwiOlwiXFx1MjFDQlwiLFwibHJoYXJkXCI6XCJcXHUyOTZEXCIsXCJscm1cIjpcIlxcdTIwMEVcIixcImxydHJpXCI6XCJcXHUyMkJGXCIsXCJsc2FxdW9cIjpcIlxcdTIwMzlcIixcImxzY3JcIjpcIlxcdUQ4MzVcXHVEQ0MxXCIsXCJMc2NyXCI6XCJcXHUyMTEyXCIsXCJsc2hcIjpcIlxcdTIxQjBcIixcIkxzaFwiOlwiXFx1MjFCMFwiLFwibHNpbVwiOlwiXFx1MjI3MlwiLFwibHNpbWVcIjpcIlxcdTJBOERcIixcImxzaW1nXCI6XCJcXHUyQThGXCIsXCJsc3FiXCI6XCJbXCIsXCJsc3F1b1wiOlwiXFx1MjAxOFwiLFwibHNxdW9yXCI6XCJcXHUyMDFBXCIsXCJMc3Ryb2tcIjpcIlxcdTAxNDFcIixcImxzdHJva1wiOlwiXFx1MDE0MlwiLFwibHRjY1wiOlwiXFx1MkFBNlwiLFwibHRjaXJcIjpcIlxcdTJBNzlcIixcImx0XCI6XCI8XCIsXCJMVFwiOlwiPFwiLFwiTHRcIjpcIlxcdTIyNkFcIixcImx0ZG90XCI6XCJcXHUyMkQ2XCIsXCJsdGhyZWVcIjpcIlxcdTIyQ0JcIixcImx0aW1lc1wiOlwiXFx1MjJDOVwiLFwibHRsYXJyXCI6XCJcXHUyOTc2XCIsXCJsdHF1ZXN0XCI6XCJcXHUyQTdCXCIsXCJsdHJpXCI6XCJcXHUyNUMzXCIsXCJsdHJpZVwiOlwiXFx1MjJCNFwiLFwibHRyaWZcIjpcIlxcdTI1QzJcIixcImx0clBhclwiOlwiXFx1Mjk5NlwiLFwibHVyZHNoYXJcIjpcIlxcdTI5NEFcIixcImx1cnVoYXJcIjpcIlxcdTI5NjZcIixcImx2ZXJ0bmVxcVwiOlwiXFx1MjI2OFxcdUZFMDBcIixcImx2bkVcIjpcIlxcdTIyNjhcXHVGRTAwXCIsXCJtYWNyXCI6XCJcXHUwMEFGXCIsXCJtYWxlXCI6XCJcXHUyNjQyXCIsXCJtYWx0XCI6XCJcXHUyNzIwXCIsXCJtYWx0ZXNlXCI6XCJcXHUyNzIwXCIsXCJNYXBcIjpcIlxcdTI5MDVcIixcIm1hcFwiOlwiXFx1MjFBNlwiLFwibWFwc3RvXCI6XCJcXHUyMUE2XCIsXCJtYXBzdG9kb3duXCI6XCJcXHUyMUE3XCIsXCJtYXBzdG9sZWZ0XCI6XCJcXHUyMUE0XCIsXCJtYXBzdG91cFwiOlwiXFx1MjFBNVwiLFwibWFya2VyXCI6XCJcXHUyNUFFXCIsXCJtY29tbWFcIjpcIlxcdTJBMjlcIixcIk1jeVwiOlwiXFx1MDQxQ1wiLFwibWN5XCI6XCJcXHUwNDNDXCIsXCJtZGFzaFwiOlwiXFx1MjAxNFwiLFwibUREb3RcIjpcIlxcdTIyM0FcIixcIm1lYXN1cmVkYW5nbGVcIjpcIlxcdTIyMjFcIixcIk1lZGl1bVNwYWNlXCI6XCJcXHUyMDVGXCIsXCJNZWxsaW50cmZcIjpcIlxcdTIxMzNcIixcIk1mclwiOlwiXFx1RDgzNVxcdUREMTBcIixcIm1mclwiOlwiXFx1RDgzNVxcdUREMkFcIixcIm1ob1wiOlwiXFx1MjEyN1wiLFwibWljcm9cIjpcIlxcdTAwQjVcIixcIm1pZGFzdFwiOlwiKlwiLFwibWlkY2lyXCI6XCJcXHUyQUYwXCIsXCJtaWRcIjpcIlxcdTIyMjNcIixcIm1pZGRvdFwiOlwiXFx1MDBCN1wiLFwibWludXNiXCI6XCJcXHUyMjlGXCIsXCJtaW51c1wiOlwiXFx1MjIxMlwiLFwibWludXNkXCI6XCJcXHUyMjM4XCIsXCJtaW51c2R1XCI6XCJcXHUyQTJBXCIsXCJNaW51c1BsdXNcIjpcIlxcdTIyMTNcIixcIm1sY3BcIjpcIlxcdTJBREJcIixcIm1sZHJcIjpcIlxcdTIwMjZcIixcIm1ucGx1c1wiOlwiXFx1MjIxM1wiLFwibW9kZWxzXCI6XCJcXHUyMkE3XCIsXCJNb3BmXCI6XCJcXHVEODM1XFx1REQ0NFwiLFwibW9wZlwiOlwiXFx1RDgzNVxcdURENUVcIixcIm1wXCI6XCJcXHUyMjEzXCIsXCJtc2NyXCI6XCJcXHVEODM1XFx1RENDMlwiLFwiTXNjclwiOlwiXFx1MjEzM1wiLFwibXN0cG9zXCI6XCJcXHUyMjNFXCIsXCJNdVwiOlwiXFx1MDM5Q1wiLFwibXVcIjpcIlxcdTAzQkNcIixcIm11bHRpbWFwXCI6XCJcXHUyMkI4XCIsXCJtdW1hcFwiOlwiXFx1MjJCOFwiLFwibmFibGFcIjpcIlxcdTIyMDdcIixcIk5hY3V0ZVwiOlwiXFx1MDE0M1wiLFwibmFjdXRlXCI6XCJcXHUwMTQ0XCIsXCJuYW5nXCI6XCJcXHUyMjIwXFx1MjBEMlwiLFwibmFwXCI6XCJcXHUyMjQ5XCIsXCJuYXBFXCI6XCJcXHUyQTcwXFx1MDMzOFwiLFwibmFwaWRcIjpcIlxcdTIyNEJcXHUwMzM4XCIsXCJuYXBvc1wiOlwiXFx1MDE0OVwiLFwibmFwcHJveFwiOlwiXFx1MjI0OVwiLFwibmF0dXJhbFwiOlwiXFx1MjY2RVwiLFwibmF0dXJhbHNcIjpcIlxcdTIxMTVcIixcIm5hdHVyXCI6XCJcXHUyNjZFXCIsXCJuYnNwXCI6XCJcXHUwMEEwXCIsXCJuYnVtcFwiOlwiXFx1MjI0RVxcdTAzMzhcIixcIm5idW1wZVwiOlwiXFx1MjI0RlxcdTAzMzhcIixcIm5jYXBcIjpcIlxcdTJBNDNcIixcIk5jYXJvblwiOlwiXFx1MDE0N1wiLFwibmNhcm9uXCI6XCJcXHUwMTQ4XCIsXCJOY2VkaWxcIjpcIlxcdTAxNDVcIixcIm5jZWRpbFwiOlwiXFx1MDE0NlwiLFwibmNvbmdcIjpcIlxcdTIyNDdcIixcIm5jb25nZG90XCI6XCJcXHUyQTZEXFx1MDMzOFwiLFwibmN1cFwiOlwiXFx1MkE0MlwiLFwiTmN5XCI6XCJcXHUwNDFEXCIsXCJuY3lcIjpcIlxcdTA0M0RcIixcIm5kYXNoXCI6XCJcXHUyMDEzXCIsXCJuZWFyaGtcIjpcIlxcdTI5MjRcIixcIm5lYXJyXCI6XCJcXHUyMTk3XCIsXCJuZUFyclwiOlwiXFx1MjFEN1wiLFwibmVhcnJvd1wiOlwiXFx1MjE5N1wiLFwibmVcIjpcIlxcdTIyNjBcIixcIm5lZG90XCI6XCJcXHUyMjUwXFx1MDMzOFwiLFwiTmVnYXRpdmVNZWRpdW1TcGFjZVwiOlwiXFx1MjAwQlwiLFwiTmVnYXRpdmVUaGlja1NwYWNlXCI6XCJcXHUyMDBCXCIsXCJOZWdhdGl2ZVRoaW5TcGFjZVwiOlwiXFx1MjAwQlwiLFwiTmVnYXRpdmVWZXJ5VGhpblNwYWNlXCI6XCJcXHUyMDBCXCIsXCJuZXF1aXZcIjpcIlxcdTIyNjJcIixcIm5lc2VhclwiOlwiXFx1MjkyOFwiLFwibmVzaW1cIjpcIlxcdTIyNDJcXHUwMzM4XCIsXCJOZXN0ZWRHcmVhdGVyR3JlYXRlclwiOlwiXFx1MjI2QlwiLFwiTmVzdGVkTGVzc0xlc3NcIjpcIlxcdTIyNkFcIixcIk5ld0xpbmVcIjpcIlxcblwiLFwibmV4aXN0XCI6XCJcXHUyMjA0XCIsXCJuZXhpc3RzXCI6XCJcXHUyMjA0XCIsXCJOZnJcIjpcIlxcdUQ4MzVcXHVERDExXCIsXCJuZnJcIjpcIlxcdUQ4MzVcXHVERDJCXCIsXCJuZ0VcIjpcIlxcdTIyNjdcXHUwMzM4XCIsXCJuZ2VcIjpcIlxcdTIyNzFcIixcIm5nZXFcIjpcIlxcdTIyNzFcIixcIm5nZXFxXCI6XCJcXHUyMjY3XFx1MDMzOFwiLFwibmdlcXNsYW50XCI6XCJcXHUyQTdFXFx1MDMzOFwiLFwibmdlc1wiOlwiXFx1MkE3RVxcdTAzMzhcIixcIm5HZ1wiOlwiXFx1MjJEOVxcdTAzMzhcIixcIm5nc2ltXCI6XCJcXHUyMjc1XCIsXCJuR3RcIjpcIlxcdTIyNkJcXHUyMEQyXCIsXCJuZ3RcIjpcIlxcdTIyNkZcIixcIm5ndHJcIjpcIlxcdTIyNkZcIixcIm5HdHZcIjpcIlxcdTIyNkJcXHUwMzM4XCIsXCJuaGFyclwiOlwiXFx1MjFBRVwiLFwibmhBcnJcIjpcIlxcdTIxQ0VcIixcIm5ocGFyXCI6XCJcXHUyQUYyXCIsXCJuaVwiOlwiXFx1MjIwQlwiLFwibmlzXCI6XCJcXHUyMkZDXCIsXCJuaXNkXCI6XCJcXHUyMkZBXCIsXCJuaXZcIjpcIlxcdTIyMEJcIixcIk5KY3lcIjpcIlxcdTA0MEFcIixcIm5qY3lcIjpcIlxcdTA0NUFcIixcIm5sYXJyXCI6XCJcXHUyMTlBXCIsXCJubEFyclwiOlwiXFx1MjFDRFwiLFwibmxkclwiOlwiXFx1MjAyNVwiLFwibmxFXCI6XCJcXHUyMjY2XFx1MDMzOFwiLFwibmxlXCI6XCJcXHUyMjcwXCIsXCJubGVmdGFycm93XCI6XCJcXHUyMTlBXCIsXCJuTGVmdGFycm93XCI6XCJcXHUyMUNEXCIsXCJubGVmdHJpZ2h0YXJyb3dcIjpcIlxcdTIxQUVcIixcIm5MZWZ0cmlnaHRhcnJvd1wiOlwiXFx1MjFDRVwiLFwibmxlcVwiOlwiXFx1MjI3MFwiLFwibmxlcXFcIjpcIlxcdTIyNjZcXHUwMzM4XCIsXCJubGVxc2xhbnRcIjpcIlxcdTJBN0RcXHUwMzM4XCIsXCJubGVzXCI6XCJcXHUyQTdEXFx1MDMzOFwiLFwibmxlc3NcIjpcIlxcdTIyNkVcIixcIm5MbFwiOlwiXFx1MjJEOFxcdTAzMzhcIixcIm5sc2ltXCI6XCJcXHUyMjc0XCIsXCJuTHRcIjpcIlxcdTIyNkFcXHUyMEQyXCIsXCJubHRcIjpcIlxcdTIyNkVcIixcIm5sdHJpXCI6XCJcXHUyMkVBXCIsXCJubHRyaWVcIjpcIlxcdTIyRUNcIixcIm5MdHZcIjpcIlxcdTIyNkFcXHUwMzM4XCIsXCJubWlkXCI6XCJcXHUyMjI0XCIsXCJOb0JyZWFrXCI6XCJcXHUyMDYwXCIsXCJOb25CcmVha2luZ1NwYWNlXCI6XCJcXHUwMEEwXCIsXCJub3BmXCI6XCJcXHVEODM1XFx1REQ1RlwiLFwiTm9wZlwiOlwiXFx1MjExNVwiLFwiTm90XCI6XCJcXHUyQUVDXCIsXCJub3RcIjpcIlxcdTAwQUNcIixcIk5vdENvbmdydWVudFwiOlwiXFx1MjI2MlwiLFwiTm90Q3VwQ2FwXCI6XCJcXHUyMjZEXCIsXCJOb3REb3VibGVWZXJ0aWNhbEJhclwiOlwiXFx1MjIyNlwiLFwiTm90RWxlbWVudFwiOlwiXFx1MjIwOVwiLFwiTm90RXF1YWxcIjpcIlxcdTIyNjBcIixcIk5vdEVxdWFsVGlsZGVcIjpcIlxcdTIyNDJcXHUwMzM4XCIsXCJOb3RFeGlzdHNcIjpcIlxcdTIyMDRcIixcIk5vdEdyZWF0ZXJcIjpcIlxcdTIyNkZcIixcIk5vdEdyZWF0ZXJFcXVhbFwiOlwiXFx1MjI3MVwiLFwiTm90R3JlYXRlckZ1bGxFcXVhbFwiOlwiXFx1MjI2N1xcdTAzMzhcIixcIk5vdEdyZWF0ZXJHcmVhdGVyXCI6XCJcXHUyMjZCXFx1MDMzOFwiLFwiTm90R3JlYXRlckxlc3NcIjpcIlxcdTIyNzlcIixcIk5vdEdyZWF0ZXJTbGFudEVxdWFsXCI6XCJcXHUyQTdFXFx1MDMzOFwiLFwiTm90R3JlYXRlclRpbGRlXCI6XCJcXHUyMjc1XCIsXCJOb3RIdW1wRG93bkh1bXBcIjpcIlxcdTIyNEVcXHUwMzM4XCIsXCJOb3RIdW1wRXF1YWxcIjpcIlxcdTIyNEZcXHUwMzM4XCIsXCJub3RpblwiOlwiXFx1MjIwOVwiLFwibm90aW5kb3RcIjpcIlxcdTIyRjVcXHUwMzM4XCIsXCJub3RpbkVcIjpcIlxcdTIyRjlcXHUwMzM4XCIsXCJub3RpbnZhXCI6XCJcXHUyMjA5XCIsXCJub3RpbnZiXCI6XCJcXHUyMkY3XCIsXCJub3RpbnZjXCI6XCJcXHUyMkY2XCIsXCJOb3RMZWZ0VHJpYW5nbGVCYXJcIjpcIlxcdTI5Q0ZcXHUwMzM4XCIsXCJOb3RMZWZ0VHJpYW5nbGVcIjpcIlxcdTIyRUFcIixcIk5vdExlZnRUcmlhbmdsZUVxdWFsXCI6XCJcXHUyMkVDXCIsXCJOb3RMZXNzXCI6XCJcXHUyMjZFXCIsXCJOb3RMZXNzRXF1YWxcIjpcIlxcdTIyNzBcIixcIk5vdExlc3NHcmVhdGVyXCI6XCJcXHUyMjc4XCIsXCJOb3RMZXNzTGVzc1wiOlwiXFx1MjI2QVxcdTAzMzhcIixcIk5vdExlc3NTbGFudEVxdWFsXCI6XCJcXHUyQTdEXFx1MDMzOFwiLFwiTm90TGVzc1RpbGRlXCI6XCJcXHUyMjc0XCIsXCJOb3ROZXN0ZWRHcmVhdGVyR3JlYXRlclwiOlwiXFx1MkFBMlxcdTAzMzhcIixcIk5vdE5lc3RlZExlc3NMZXNzXCI6XCJcXHUyQUExXFx1MDMzOFwiLFwibm90bmlcIjpcIlxcdTIyMENcIixcIm5vdG5pdmFcIjpcIlxcdTIyMENcIixcIm5vdG5pdmJcIjpcIlxcdTIyRkVcIixcIm5vdG5pdmNcIjpcIlxcdTIyRkRcIixcIk5vdFByZWNlZGVzXCI6XCJcXHUyMjgwXCIsXCJOb3RQcmVjZWRlc0VxdWFsXCI6XCJcXHUyQUFGXFx1MDMzOFwiLFwiTm90UHJlY2VkZXNTbGFudEVxdWFsXCI6XCJcXHUyMkUwXCIsXCJOb3RSZXZlcnNlRWxlbWVudFwiOlwiXFx1MjIwQ1wiLFwiTm90UmlnaHRUcmlhbmdsZUJhclwiOlwiXFx1MjlEMFxcdTAzMzhcIixcIk5vdFJpZ2h0VHJpYW5nbGVcIjpcIlxcdTIyRUJcIixcIk5vdFJpZ2h0VHJpYW5nbGVFcXVhbFwiOlwiXFx1MjJFRFwiLFwiTm90U3F1YXJlU3Vic2V0XCI6XCJcXHUyMjhGXFx1MDMzOFwiLFwiTm90U3F1YXJlU3Vic2V0RXF1YWxcIjpcIlxcdTIyRTJcIixcIk5vdFNxdWFyZVN1cGVyc2V0XCI6XCJcXHUyMjkwXFx1MDMzOFwiLFwiTm90U3F1YXJlU3VwZXJzZXRFcXVhbFwiOlwiXFx1MjJFM1wiLFwiTm90U3Vic2V0XCI6XCJcXHUyMjgyXFx1MjBEMlwiLFwiTm90U3Vic2V0RXF1YWxcIjpcIlxcdTIyODhcIixcIk5vdFN1Y2NlZWRzXCI6XCJcXHUyMjgxXCIsXCJOb3RTdWNjZWVkc0VxdWFsXCI6XCJcXHUyQUIwXFx1MDMzOFwiLFwiTm90U3VjY2VlZHNTbGFudEVxdWFsXCI6XCJcXHUyMkUxXCIsXCJOb3RTdWNjZWVkc1RpbGRlXCI6XCJcXHUyMjdGXFx1MDMzOFwiLFwiTm90U3VwZXJzZXRcIjpcIlxcdTIyODNcXHUyMEQyXCIsXCJOb3RTdXBlcnNldEVxdWFsXCI6XCJcXHUyMjg5XCIsXCJOb3RUaWxkZVwiOlwiXFx1MjI0MVwiLFwiTm90VGlsZGVFcXVhbFwiOlwiXFx1MjI0NFwiLFwiTm90VGlsZGVGdWxsRXF1YWxcIjpcIlxcdTIyNDdcIixcIk5vdFRpbGRlVGlsZGVcIjpcIlxcdTIyNDlcIixcIk5vdFZlcnRpY2FsQmFyXCI6XCJcXHUyMjI0XCIsXCJucGFyYWxsZWxcIjpcIlxcdTIyMjZcIixcIm5wYXJcIjpcIlxcdTIyMjZcIixcIm5wYXJzbFwiOlwiXFx1MkFGRFxcdTIwRTVcIixcIm5wYXJ0XCI6XCJcXHUyMjAyXFx1MDMzOFwiLFwibnBvbGludFwiOlwiXFx1MkExNFwiLFwibnByXCI6XCJcXHUyMjgwXCIsXCJucHJjdWVcIjpcIlxcdTIyRTBcIixcIm5wcmVjXCI6XCJcXHUyMjgwXCIsXCJucHJlY2VxXCI6XCJcXHUyQUFGXFx1MDMzOFwiLFwibnByZVwiOlwiXFx1MkFBRlxcdTAzMzhcIixcIm5yYXJyY1wiOlwiXFx1MjkzM1xcdTAzMzhcIixcIm5yYXJyXCI6XCJcXHUyMTlCXCIsXCJuckFyclwiOlwiXFx1MjFDRlwiLFwibnJhcnJ3XCI6XCJcXHUyMTlEXFx1MDMzOFwiLFwibnJpZ2h0YXJyb3dcIjpcIlxcdTIxOUJcIixcIm5SaWdodGFycm93XCI6XCJcXHUyMUNGXCIsXCJucnRyaVwiOlwiXFx1MjJFQlwiLFwibnJ0cmllXCI6XCJcXHUyMkVEXCIsXCJuc2NcIjpcIlxcdTIyODFcIixcIm5zY2N1ZVwiOlwiXFx1MjJFMVwiLFwibnNjZVwiOlwiXFx1MkFCMFxcdTAzMzhcIixcIk5zY3JcIjpcIlxcdUQ4MzVcXHVEQ0E5XCIsXCJuc2NyXCI6XCJcXHVEODM1XFx1RENDM1wiLFwibnNob3J0bWlkXCI6XCJcXHUyMjI0XCIsXCJuc2hvcnRwYXJhbGxlbFwiOlwiXFx1MjIyNlwiLFwibnNpbVwiOlwiXFx1MjI0MVwiLFwibnNpbWVcIjpcIlxcdTIyNDRcIixcIm5zaW1lcVwiOlwiXFx1MjI0NFwiLFwibnNtaWRcIjpcIlxcdTIyMjRcIixcIm5zcGFyXCI6XCJcXHUyMjI2XCIsXCJuc3FzdWJlXCI6XCJcXHUyMkUyXCIsXCJuc3FzdXBlXCI6XCJcXHUyMkUzXCIsXCJuc3ViXCI6XCJcXHUyMjg0XCIsXCJuc3ViRVwiOlwiXFx1MkFDNVxcdTAzMzhcIixcIm5zdWJlXCI6XCJcXHUyMjg4XCIsXCJuc3Vic2V0XCI6XCJcXHUyMjgyXFx1MjBEMlwiLFwibnN1YnNldGVxXCI6XCJcXHUyMjg4XCIsXCJuc3Vic2V0ZXFxXCI6XCJcXHUyQUM1XFx1MDMzOFwiLFwibnN1Y2NcIjpcIlxcdTIyODFcIixcIm5zdWNjZXFcIjpcIlxcdTJBQjBcXHUwMzM4XCIsXCJuc3VwXCI6XCJcXHUyMjg1XCIsXCJuc3VwRVwiOlwiXFx1MkFDNlxcdTAzMzhcIixcIm5zdXBlXCI6XCJcXHUyMjg5XCIsXCJuc3Vwc2V0XCI6XCJcXHUyMjgzXFx1MjBEMlwiLFwibnN1cHNldGVxXCI6XCJcXHUyMjg5XCIsXCJuc3Vwc2V0ZXFxXCI6XCJcXHUyQUM2XFx1MDMzOFwiLFwibnRnbFwiOlwiXFx1MjI3OVwiLFwiTnRpbGRlXCI6XCJcXHUwMEQxXCIsXCJudGlsZGVcIjpcIlxcdTAwRjFcIixcIm50bGdcIjpcIlxcdTIyNzhcIixcIm50cmlhbmdsZWxlZnRcIjpcIlxcdTIyRUFcIixcIm50cmlhbmdsZWxlZnRlcVwiOlwiXFx1MjJFQ1wiLFwibnRyaWFuZ2xlcmlnaHRcIjpcIlxcdTIyRUJcIixcIm50cmlhbmdsZXJpZ2h0ZXFcIjpcIlxcdTIyRURcIixcIk51XCI6XCJcXHUwMzlEXCIsXCJudVwiOlwiXFx1MDNCRFwiLFwibnVtXCI6XCIjXCIsXCJudW1lcm9cIjpcIlxcdTIxMTZcIixcIm51bXNwXCI6XCJcXHUyMDA3XCIsXCJudmFwXCI6XCJcXHUyMjREXFx1MjBEMlwiLFwibnZkYXNoXCI6XCJcXHUyMkFDXCIsXCJudkRhc2hcIjpcIlxcdTIyQURcIixcIm5WZGFzaFwiOlwiXFx1MjJBRVwiLFwiblZEYXNoXCI6XCJcXHUyMkFGXCIsXCJudmdlXCI6XCJcXHUyMjY1XFx1MjBEMlwiLFwibnZndFwiOlwiPlxcdTIwRDJcIixcIm52SGFyclwiOlwiXFx1MjkwNFwiLFwibnZpbmZpblwiOlwiXFx1MjlERVwiLFwibnZsQXJyXCI6XCJcXHUyOTAyXCIsXCJudmxlXCI6XCJcXHUyMjY0XFx1MjBEMlwiLFwibnZsdFwiOlwiPFxcdTIwRDJcIixcIm52bHRyaWVcIjpcIlxcdTIyQjRcXHUyMEQyXCIsXCJudnJBcnJcIjpcIlxcdTI5MDNcIixcIm52cnRyaWVcIjpcIlxcdTIyQjVcXHUyMEQyXCIsXCJudnNpbVwiOlwiXFx1MjIzQ1xcdTIwRDJcIixcIm53YXJoa1wiOlwiXFx1MjkyM1wiLFwibndhcnJcIjpcIlxcdTIxOTZcIixcIm53QXJyXCI6XCJcXHUyMUQ2XCIsXCJud2Fycm93XCI6XCJcXHUyMTk2XCIsXCJud25lYXJcIjpcIlxcdTI5MjdcIixcIk9hY3V0ZVwiOlwiXFx1MDBEM1wiLFwib2FjdXRlXCI6XCJcXHUwMEYzXCIsXCJvYXN0XCI6XCJcXHUyMjlCXCIsXCJPY2lyY1wiOlwiXFx1MDBENFwiLFwib2NpcmNcIjpcIlxcdTAwRjRcIixcIm9jaXJcIjpcIlxcdTIyOUFcIixcIk9jeVwiOlwiXFx1MDQxRVwiLFwib2N5XCI6XCJcXHUwNDNFXCIsXCJvZGFzaFwiOlwiXFx1MjI5RFwiLFwiT2RibGFjXCI6XCJcXHUwMTUwXCIsXCJvZGJsYWNcIjpcIlxcdTAxNTFcIixcIm9kaXZcIjpcIlxcdTJBMzhcIixcIm9kb3RcIjpcIlxcdTIyOTlcIixcIm9kc29sZFwiOlwiXFx1MjlCQ1wiLFwiT0VsaWdcIjpcIlxcdTAxNTJcIixcIm9lbGlnXCI6XCJcXHUwMTUzXCIsXCJvZmNpclwiOlwiXFx1MjlCRlwiLFwiT2ZyXCI6XCJcXHVEODM1XFx1REQxMlwiLFwib2ZyXCI6XCJcXHVEODM1XFx1REQyQ1wiLFwib2dvblwiOlwiXFx1MDJEQlwiLFwiT2dyYXZlXCI6XCJcXHUwMEQyXCIsXCJvZ3JhdmVcIjpcIlxcdTAwRjJcIixcIm9ndFwiOlwiXFx1MjlDMVwiLFwib2hiYXJcIjpcIlxcdTI5QjVcIixcIm9obVwiOlwiXFx1MDNBOVwiLFwib2ludFwiOlwiXFx1MjIyRVwiLFwib2xhcnJcIjpcIlxcdTIxQkFcIixcIm9sY2lyXCI6XCJcXHUyOUJFXCIsXCJvbGNyb3NzXCI6XCJcXHUyOUJCXCIsXCJvbGluZVwiOlwiXFx1MjAzRVwiLFwib2x0XCI6XCJcXHUyOUMwXCIsXCJPbWFjclwiOlwiXFx1MDE0Q1wiLFwib21hY3JcIjpcIlxcdTAxNERcIixcIk9tZWdhXCI6XCJcXHUwM0E5XCIsXCJvbWVnYVwiOlwiXFx1MDNDOVwiLFwiT21pY3JvblwiOlwiXFx1MDM5RlwiLFwib21pY3JvblwiOlwiXFx1MDNCRlwiLFwib21pZFwiOlwiXFx1MjlCNlwiLFwib21pbnVzXCI6XCJcXHUyMjk2XCIsXCJPb3BmXCI6XCJcXHVEODM1XFx1REQ0NlwiLFwib29wZlwiOlwiXFx1RDgzNVxcdURENjBcIixcIm9wYXJcIjpcIlxcdTI5QjdcIixcIk9wZW5DdXJseURvdWJsZVF1b3RlXCI6XCJcXHUyMDFDXCIsXCJPcGVuQ3VybHlRdW90ZVwiOlwiXFx1MjAxOFwiLFwib3BlcnBcIjpcIlxcdTI5QjlcIixcIm9wbHVzXCI6XCJcXHUyMjk1XCIsXCJvcmFyclwiOlwiXFx1MjFCQlwiLFwiT3JcIjpcIlxcdTJBNTRcIixcIm9yXCI6XCJcXHUyMjI4XCIsXCJvcmRcIjpcIlxcdTJBNURcIixcIm9yZGVyXCI6XCJcXHUyMTM0XCIsXCJvcmRlcm9mXCI6XCJcXHUyMTM0XCIsXCJvcmRmXCI6XCJcXHUwMEFBXCIsXCJvcmRtXCI6XCJcXHUwMEJBXCIsXCJvcmlnb2ZcIjpcIlxcdTIyQjZcIixcIm9yb3JcIjpcIlxcdTJBNTZcIixcIm9yc2xvcGVcIjpcIlxcdTJBNTdcIixcIm9ydlwiOlwiXFx1MkE1QlwiLFwib1NcIjpcIlxcdTI0QzhcIixcIk9zY3JcIjpcIlxcdUQ4MzVcXHVEQ0FBXCIsXCJvc2NyXCI6XCJcXHUyMTM0XCIsXCJPc2xhc2hcIjpcIlxcdTAwRDhcIixcIm9zbGFzaFwiOlwiXFx1MDBGOFwiLFwib3NvbFwiOlwiXFx1MjI5OFwiLFwiT3RpbGRlXCI6XCJcXHUwMEQ1XCIsXCJvdGlsZGVcIjpcIlxcdTAwRjVcIixcIm90aW1lc2FzXCI6XCJcXHUyQTM2XCIsXCJPdGltZXNcIjpcIlxcdTJBMzdcIixcIm90aW1lc1wiOlwiXFx1MjI5N1wiLFwiT3VtbFwiOlwiXFx1MDBENlwiLFwib3VtbFwiOlwiXFx1MDBGNlwiLFwib3ZiYXJcIjpcIlxcdTIzM0RcIixcIk92ZXJCYXJcIjpcIlxcdTIwM0VcIixcIk92ZXJCcmFjZVwiOlwiXFx1MjNERVwiLFwiT3ZlckJyYWNrZXRcIjpcIlxcdTIzQjRcIixcIk92ZXJQYXJlbnRoZXNpc1wiOlwiXFx1MjNEQ1wiLFwicGFyYVwiOlwiXFx1MDBCNlwiLFwicGFyYWxsZWxcIjpcIlxcdTIyMjVcIixcInBhclwiOlwiXFx1MjIyNVwiLFwicGFyc2ltXCI6XCJcXHUyQUYzXCIsXCJwYXJzbFwiOlwiXFx1MkFGRFwiLFwicGFydFwiOlwiXFx1MjIwMlwiLFwiUGFydGlhbERcIjpcIlxcdTIyMDJcIixcIlBjeVwiOlwiXFx1MDQxRlwiLFwicGN5XCI6XCJcXHUwNDNGXCIsXCJwZXJjbnRcIjpcIiVcIixcInBlcmlvZFwiOlwiLlwiLFwicGVybWlsXCI6XCJcXHUyMDMwXCIsXCJwZXJwXCI6XCJcXHUyMkE1XCIsXCJwZXJ0ZW5rXCI6XCJcXHUyMDMxXCIsXCJQZnJcIjpcIlxcdUQ4MzVcXHVERDEzXCIsXCJwZnJcIjpcIlxcdUQ4MzVcXHVERDJEXCIsXCJQaGlcIjpcIlxcdTAzQTZcIixcInBoaVwiOlwiXFx1MDNDNlwiLFwicGhpdlwiOlwiXFx1MDNENVwiLFwicGhtbWF0XCI6XCJcXHUyMTMzXCIsXCJwaG9uZVwiOlwiXFx1MjYwRVwiLFwiUGlcIjpcIlxcdTAzQTBcIixcInBpXCI6XCJcXHUwM0MwXCIsXCJwaXRjaGZvcmtcIjpcIlxcdTIyRDRcIixcInBpdlwiOlwiXFx1MDNENlwiLFwicGxhbmNrXCI6XCJcXHUyMTBGXCIsXCJwbGFuY2toXCI6XCJcXHUyMTBFXCIsXCJwbGFua3ZcIjpcIlxcdTIxMEZcIixcInBsdXNhY2lyXCI6XCJcXHUyQTIzXCIsXCJwbHVzYlwiOlwiXFx1MjI5RVwiLFwicGx1c2NpclwiOlwiXFx1MkEyMlwiLFwicGx1c1wiOlwiK1wiLFwicGx1c2RvXCI6XCJcXHUyMjE0XCIsXCJwbHVzZHVcIjpcIlxcdTJBMjVcIixcInBsdXNlXCI6XCJcXHUyQTcyXCIsXCJQbHVzTWludXNcIjpcIlxcdTAwQjFcIixcInBsdXNtblwiOlwiXFx1MDBCMVwiLFwicGx1c3NpbVwiOlwiXFx1MkEyNlwiLFwicGx1c3R3b1wiOlwiXFx1MkEyN1wiLFwicG1cIjpcIlxcdTAwQjFcIixcIlBvaW5jYXJlcGxhbmVcIjpcIlxcdTIxMENcIixcInBvaW50aW50XCI6XCJcXHUyQTE1XCIsXCJwb3BmXCI6XCJcXHVEODM1XFx1REQ2MVwiLFwiUG9wZlwiOlwiXFx1MjExOVwiLFwicG91bmRcIjpcIlxcdTAwQTNcIixcInByYXBcIjpcIlxcdTJBQjdcIixcIlByXCI6XCJcXHUyQUJCXCIsXCJwclwiOlwiXFx1MjI3QVwiLFwicHJjdWVcIjpcIlxcdTIyN0NcIixcInByZWNhcHByb3hcIjpcIlxcdTJBQjdcIixcInByZWNcIjpcIlxcdTIyN0FcIixcInByZWNjdXJseWVxXCI6XCJcXHUyMjdDXCIsXCJQcmVjZWRlc1wiOlwiXFx1MjI3QVwiLFwiUHJlY2VkZXNFcXVhbFwiOlwiXFx1MkFBRlwiLFwiUHJlY2VkZXNTbGFudEVxdWFsXCI6XCJcXHUyMjdDXCIsXCJQcmVjZWRlc1RpbGRlXCI6XCJcXHUyMjdFXCIsXCJwcmVjZXFcIjpcIlxcdTJBQUZcIixcInByZWNuYXBwcm94XCI6XCJcXHUyQUI5XCIsXCJwcmVjbmVxcVwiOlwiXFx1MkFCNVwiLFwicHJlY25zaW1cIjpcIlxcdTIyRThcIixcInByZVwiOlwiXFx1MkFBRlwiLFwicHJFXCI6XCJcXHUyQUIzXCIsXCJwcmVjc2ltXCI6XCJcXHUyMjdFXCIsXCJwcmltZVwiOlwiXFx1MjAzMlwiLFwiUHJpbWVcIjpcIlxcdTIwMzNcIixcInByaW1lc1wiOlwiXFx1MjExOVwiLFwicHJuYXBcIjpcIlxcdTJBQjlcIixcInBybkVcIjpcIlxcdTJBQjVcIixcInBybnNpbVwiOlwiXFx1MjJFOFwiLFwicHJvZFwiOlwiXFx1MjIwRlwiLFwiUHJvZHVjdFwiOlwiXFx1MjIwRlwiLFwicHJvZmFsYXJcIjpcIlxcdTIzMkVcIixcInByb2ZsaW5lXCI6XCJcXHUyMzEyXCIsXCJwcm9mc3VyZlwiOlwiXFx1MjMxM1wiLFwicHJvcFwiOlwiXFx1MjIxRFwiLFwiUHJvcG9ydGlvbmFsXCI6XCJcXHUyMjFEXCIsXCJQcm9wb3J0aW9uXCI6XCJcXHUyMjM3XCIsXCJwcm9wdG9cIjpcIlxcdTIyMURcIixcInByc2ltXCI6XCJcXHUyMjdFXCIsXCJwcnVyZWxcIjpcIlxcdTIyQjBcIixcIlBzY3JcIjpcIlxcdUQ4MzVcXHVEQ0FCXCIsXCJwc2NyXCI6XCJcXHVEODM1XFx1RENDNVwiLFwiUHNpXCI6XCJcXHUwM0E4XCIsXCJwc2lcIjpcIlxcdTAzQzhcIixcInB1bmNzcFwiOlwiXFx1MjAwOFwiLFwiUWZyXCI6XCJcXHVEODM1XFx1REQxNFwiLFwicWZyXCI6XCJcXHVEODM1XFx1REQyRVwiLFwicWludFwiOlwiXFx1MkEwQ1wiLFwicW9wZlwiOlwiXFx1RDgzNVxcdURENjJcIixcIlFvcGZcIjpcIlxcdTIxMUFcIixcInFwcmltZVwiOlwiXFx1MjA1N1wiLFwiUXNjclwiOlwiXFx1RDgzNVxcdURDQUNcIixcInFzY3JcIjpcIlxcdUQ4MzVcXHVEQ0M2XCIsXCJxdWF0ZXJuaW9uc1wiOlwiXFx1MjEwRFwiLFwicXVhdGludFwiOlwiXFx1MkExNlwiLFwicXVlc3RcIjpcIj9cIixcInF1ZXN0ZXFcIjpcIlxcdTIyNUZcIixcInF1b3RcIjpcIlxcXCJcIixcIlFVT1RcIjpcIlxcXCJcIixcInJBYXJyXCI6XCJcXHUyMURCXCIsXCJyYWNlXCI6XCJcXHUyMjNEXFx1MDMzMVwiLFwiUmFjdXRlXCI6XCJcXHUwMTU0XCIsXCJyYWN1dGVcIjpcIlxcdTAxNTVcIixcInJhZGljXCI6XCJcXHUyMjFBXCIsXCJyYWVtcHR5dlwiOlwiXFx1MjlCM1wiLFwicmFuZ1wiOlwiXFx1MjdFOVwiLFwiUmFuZ1wiOlwiXFx1MjdFQlwiLFwicmFuZ2RcIjpcIlxcdTI5OTJcIixcInJhbmdlXCI6XCJcXHUyOUE1XCIsXCJyYW5nbGVcIjpcIlxcdTI3RTlcIixcInJhcXVvXCI6XCJcXHUwMEJCXCIsXCJyYXJyYXBcIjpcIlxcdTI5NzVcIixcInJhcnJiXCI6XCJcXHUyMUU1XCIsXCJyYXJyYmZzXCI6XCJcXHUyOTIwXCIsXCJyYXJyY1wiOlwiXFx1MjkzM1wiLFwicmFyclwiOlwiXFx1MjE5MlwiLFwiUmFyclwiOlwiXFx1MjFBMFwiLFwickFyclwiOlwiXFx1MjFEMlwiLFwicmFycmZzXCI6XCJcXHUyOTFFXCIsXCJyYXJyaGtcIjpcIlxcdTIxQUFcIixcInJhcnJscFwiOlwiXFx1MjFBQ1wiLFwicmFycnBsXCI6XCJcXHUyOTQ1XCIsXCJyYXJyc2ltXCI6XCJcXHUyOTc0XCIsXCJSYXJydGxcIjpcIlxcdTI5MTZcIixcInJhcnJ0bFwiOlwiXFx1MjFBM1wiLFwicmFycndcIjpcIlxcdTIxOURcIixcInJhdGFpbFwiOlwiXFx1MjkxQVwiLFwickF0YWlsXCI6XCJcXHUyOTFDXCIsXCJyYXRpb1wiOlwiXFx1MjIzNlwiLFwicmF0aW9uYWxzXCI6XCJcXHUyMTFBXCIsXCJyYmFyclwiOlwiXFx1MjkwRFwiLFwickJhcnJcIjpcIlxcdTI5MEZcIixcIlJCYXJyXCI6XCJcXHUyOTEwXCIsXCJyYmJya1wiOlwiXFx1Mjc3M1wiLFwicmJyYWNlXCI6XCJ9XCIsXCJyYnJhY2tcIjpcIl1cIixcInJicmtlXCI6XCJcXHUyOThDXCIsXCJyYnJrc2xkXCI6XCJcXHUyOThFXCIsXCJyYnJrc2x1XCI6XCJcXHUyOTkwXCIsXCJSY2Fyb25cIjpcIlxcdTAxNThcIixcInJjYXJvblwiOlwiXFx1MDE1OVwiLFwiUmNlZGlsXCI6XCJcXHUwMTU2XCIsXCJyY2VkaWxcIjpcIlxcdTAxNTdcIixcInJjZWlsXCI6XCJcXHUyMzA5XCIsXCJyY3ViXCI6XCJ9XCIsXCJSY3lcIjpcIlxcdTA0MjBcIixcInJjeVwiOlwiXFx1MDQ0MFwiLFwicmRjYVwiOlwiXFx1MjkzN1wiLFwicmRsZGhhclwiOlwiXFx1Mjk2OVwiLFwicmRxdW9cIjpcIlxcdTIwMURcIixcInJkcXVvclwiOlwiXFx1MjAxRFwiLFwicmRzaFwiOlwiXFx1MjFCM1wiLFwicmVhbFwiOlwiXFx1MjExQ1wiLFwicmVhbGluZVwiOlwiXFx1MjExQlwiLFwicmVhbHBhcnRcIjpcIlxcdTIxMUNcIixcInJlYWxzXCI6XCJcXHUyMTFEXCIsXCJSZVwiOlwiXFx1MjExQ1wiLFwicmVjdFwiOlwiXFx1MjVBRFwiLFwicmVnXCI6XCJcXHUwMEFFXCIsXCJSRUdcIjpcIlxcdTAwQUVcIixcIlJldmVyc2VFbGVtZW50XCI6XCJcXHUyMjBCXCIsXCJSZXZlcnNlRXF1aWxpYnJpdW1cIjpcIlxcdTIxQ0JcIixcIlJldmVyc2VVcEVxdWlsaWJyaXVtXCI6XCJcXHUyOTZGXCIsXCJyZmlzaHRcIjpcIlxcdTI5N0RcIixcInJmbG9vclwiOlwiXFx1MjMwQlwiLFwicmZyXCI6XCJcXHVEODM1XFx1REQyRlwiLFwiUmZyXCI6XCJcXHUyMTFDXCIsXCJySGFyXCI6XCJcXHUyOTY0XCIsXCJyaGFyZFwiOlwiXFx1MjFDMVwiLFwicmhhcnVcIjpcIlxcdTIxQzBcIixcInJoYXJ1bFwiOlwiXFx1Mjk2Q1wiLFwiUmhvXCI6XCJcXHUwM0ExXCIsXCJyaG9cIjpcIlxcdTAzQzFcIixcInJob3ZcIjpcIlxcdTAzRjFcIixcIlJpZ2h0QW5nbGVCcmFja2V0XCI6XCJcXHUyN0U5XCIsXCJSaWdodEFycm93QmFyXCI6XCJcXHUyMUU1XCIsXCJyaWdodGFycm93XCI6XCJcXHUyMTkyXCIsXCJSaWdodEFycm93XCI6XCJcXHUyMTkyXCIsXCJSaWdodGFycm93XCI6XCJcXHUyMUQyXCIsXCJSaWdodEFycm93TGVmdEFycm93XCI6XCJcXHUyMUM0XCIsXCJyaWdodGFycm93dGFpbFwiOlwiXFx1MjFBM1wiLFwiUmlnaHRDZWlsaW5nXCI6XCJcXHUyMzA5XCIsXCJSaWdodERvdWJsZUJyYWNrZXRcIjpcIlxcdTI3RTdcIixcIlJpZ2h0RG93blRlZVZlY3RvclwiOlwiXFx1Mjk1RFwiLFwiUmlnaHREb3duVmVjdG9yQmFyXCI6XCJcXHUyOTU1XCIsXCJSaWdodERvd25WZWN0b3JcIjpcIlxcdTIxQzJcIixcIlJpZ2h0Rmxvb3JcIjpcIlxcdTIzMEJcIixcInJpZ2h0aGFycG9vbmRvd25cIjpcIlxcdTIxQzFcIixcInJpZ2h0aGFycG9vbnVwXCI6XCJcXHUyMUMwXCIsXCJyaWdodGxlZnRhcnJvd3NcIjpcIlxcdTIxQzRcIixcInJpZ2h0bGVmdGhhcnBvb25zXCI6XCJcXHUyMUNDXCIsXCJyaWdodHJpZ2h0YXJyb3dzXCI6XCJcXHUyMUM5XCIsXCJyaWdodHNxdWlnYXJyb3dcIjpcIlxcdTIxOURcIixcIlJpZ2h0VGVlQXJyb3dcIjpcIlxcdTIxQTZcIixcIlJpZ2h0VGVlXCI6XCJcXHUyMkEyXCIsXCJSaWdodFRlZVZlY3RvclwiOlwiXFx1Mjk1QlwiLFwicmlnaHR0aHJlZXRpbWVzXCI6XCJcXHUyMkNDXCIsXCJSaWdodFRyaWFuZ2xlQmFyXCI6XCJcXHUyOUQwXCIsXCJSaWdodFRyaWFuZ2xlXCI6XCJcXHUyMkIzXCIsXCJSaWdodFRyaWFuZ2xlRXF1YWxcIjpcIlxcdTIyQjVcIixcIlJpZ2h0VXBEb3duVmVjdG9yXCI6XCJcXHUyOTRGXCIsXCJSaWdodFVwVGVlVmVjdG9yXCI6XCJcXHUyOTVDXCIsXCJSaWdodFVwVmVjdG9yQmFyXCI6XCJcXHUyOTU0XCIsXCJSaWdodFVwVmVjdG9yXCI6XCJcXHUyMUJFXCIsXCJSaWdodFZlY3RvckJhclwiOlwiXFx1Mjk1M1wiLFwiUmlnaHRWZWN0b3JcIjpcIlxcdTIxQzBcIixcInJpbmdcIjpcIlxcdTAyREFcIixcInJpc2luZ2RvdHNlcVwiOlwiXFx1MjI1M1wiLFwicmxhcnJcIjpcIlxcdTIxQzRcIixcInJsaGFyXCI6XCJcXHUyMUNDXCIsXCJybG1cIjpcIlxcdTIwMEZcIixcInJtb3VzdGFjaGVcIjpcIlxcdTIzQjFcIixcInJtb3VzdFwiOlwiXFx1MjNCMVwiLFwicm5taWRcIjpcIlxcdTJBRUVcIixcInJvYW5nXCI6XCJcXHUyN0VEXCIsXCJyb2FyclwiOlwiXFx1MjFGRVwiLFwicm9icmtcIjpcIlxcdTI3RTdcIixcInJvcGFyXCI6XCJcXHUyOTg2XCIsXCJyb3BmXCI6XCJcXHVEODM1XFx1REQ2M1wiLFwiUm9wZlwiOlwiXFx1MjExRFwiLFwicm9wbHVzXCI6XCJcXHUyQTJFXCIsXCJyb3RpbWVzXCI6XCJcXHUyQTM1XCIsXCJSb3VuZEltcGxpZXNcIjpcIlxcdTI5NzBcIixcInJwYXJcIjpcIilcIixcInJwYXJndFwiOlwiXFx1Mjk5NFwiLFwicnBwb2xpbnRcIjpcIlxcdTJBMTJcIixcInJyYXJyXCI6XCJcXHUyMUM5XCIsXCJScmlnaHRhcnJvd1wiOlwiXFx1MjFEQlwiLFwicnNhcXVvXCI6XCJcXHUyMDNBXCIsXCJyc2NyXCI6XCJcXHVEODM1XFx1RENDN1wiLFwiUnNjclwiOlwiXFx1MjExQlwiLFwicnNoXCI6XCJcXHUyMUIxXCIsXCJSc2hcIjpcIlxcdTIxQjFcIixcInJzcWJcIjpcIl1cIixcInJzcXVvXCI6XCJcXHUyMDE5XCIsXCJyc3F1b3JcIjpcIlxcdTIwMTlcIixcInJ0aHJlZVwiOlwiXFx1MjJDQ1wiLFwicnRpbWVzXCI6XCJcXHUyMkNBXCIsXCJydHJpXCI6XCJcXHUyNUI5XCIsXCJydHJpZVwiOlwiXFx1MjJCNVwiLFwicnRyaWZcIjpcIlxcdTI1QjhcIixcInJ0cmlsdHJpXCI6XCJcXHUyOUNFXCIsXCJSdWxlRGVsYXllZFwiOlwiXFx1MjlGNFwiLFwicnVsdWhhclwiOlwiXFx1Mjk2OFwiLFwicnhcIjpcIlxcdTIxMUVcIixcIlNhY3V0ZVwiOlwiXFx1MDE1QVwiLFwic2FjdXRlXCI6XCJcXHUwMTVCXCIsXCJzYnF1b1wiOlwiXFx1MjAxQVwiLFwic2NhcFwiOlwiXFx1MkFCOFwiLFwiU2Nhcm9uXCI6XCJcXHUwMTYwXCIsXCJzY2Fyb25cIjpcIlxcdTAxNjFcIixcIlNjXCI6XCJcXHUyQUJDXCIsXCJzY1wiOlwiXFx1MjI3QlwiLFwic2NjdWVcIjpcIlxcdTIyN0RcIixcInNjZVwiOlwiXFx1MkFCMFwiLFwic2NFXCI6XCJcXHUyQUI0XCIsXCJTY2VkaWxcIjpcIlxcdTAxNUVcIixcInNjZWRpbFwiOlwiXFx1MDE1RlwiLFwiU2NpcmNcIjpcIlxcdTAxNUNcIixcInNjaXJjXCI6XCJcXHUwMTVEXCIsXCJzY25hcFwiOlwiXFx1MkFCQVwiLFwic2NuRVwiOlwiXFx1MkFCNlwiLFwic2Nuc2ltXCI6XCJcXHUyMkU5XCIsXCJzY3BvbGludFwiOlwiXFx1MkExM1wiLFwic2NzaW1cIjpcIlxcdTIyN0ZcIixcIlNjeVwiOlwiXFx1MDQyMVwiLFwic2N5XCI6XCJcXHUwNDQxXCIsXCJzZG90YlwiOlwiXFx1MjJBMVwiLFwic2RvdFwiOlwiXFx1MjJDNVwiLFwic2RvdGVcIjpcIlxcdTJBNjZcIixcInNlYXJoa1wiOlwiXFx1MjkyNVwiLFwic2VhcnJcIjpcIlxcdTIxOThcIixcInNlQXJyXCI6XCJcXHUyMUQ4XCIsXCJzZWFycm93XCI6XCJcXHUyMTk4XCIsXCJzZWN0XCI6XCJcXHUwMEE3XCIsXCJzZW1pXCI6XCI7XCIsXCJzZXN3YXJcIjpcIlxcdTI5MjlcIixcInNldG1pbnVzXCI6XCJcXHUyMjE2XCIsXCJzZXRtblwiOlwiXFx1MjIxNlwiLFwic2V4dFwiOlwiXFx1MjczNlwiLFwiU2ZyXCI6XCJcXHVEODM1XFx1REQxNlwiLFwic2ZyXCI6XCJcXHVEODM1XFx1REQzMFwiLFwic2Zyb3duXCI6XCJcXHUyMzIyXCIsXCJzaGFycFwiOlwiXFx1MjY2RlwiLFwiU0hDSGN5XCI6XCJcXHUwNDI5XCIsXCJzaGNoY3lcIjpcIlxcdTA0NDlcIixcIlNIY3lcIjpcIlxcdTA0MjhcIixcInNoY3lcIjpcIlxcdTA0NDhcIixcIlNob3J0RG93bkFycm93XCI6XCJcXHUyMTkzXCIsXCJTaG9ydExlZnRBcnJvd1wiOlwiXFx1MjE5MFwiLFwic2hvcnRtaWRcIjpcIlxcdTIyMjNcIixcInNob3J0cGFyYWxsZWxcIjpcIlxcdTIyMjVcIixcIlNob3J0UmlnaHRBcnJvd1wiOlwiXFx1MjE5MlwiLFwiU2hvcnRVcEFycm93XCI6XCJcXHUyMTkxXCIsXCJzaHlcIjpcIlxcdTAwQURcIixcIlNpZ21hXCI6XCJcXHUwM0EzXCIsXCJzaWdtYVwiOlwiXFx1MDNDM1wiLFwic2lnbWFmXCI6XCJcXHUwM0MyXCIsXCJzaWdtYXZcIjpcIlxcdTAzQzJcIixcInNpbVwiOlwiXFx1MjIzQ1wiLFwic2ltZG90XCI6XCJcXHUyQTZBXCIsXCJzaW1lXCI6XCJcXHUyMjQzXCIsXCJzaW1lcVwiOlwiXFx1MjI0M1wiLFwic2ltZ1wiOlwiXFx1MkE5RVwiLFwic2ltZ0VcIjpcIlxcdTJBQTBcIixcInNpbWxcIjpcIlxcdTJBOURcIixcInNpbWxFXCI6XCJcXHUyQTlGXCIsXCJzaW1uZVwiOlwiXFx1MjI0NlwiLFwic2ltcGx1c1wiOlwiXFx1MkEyNFwiLFwic2ltcmFyclwiOlwiXFx1Mjk3MlwiLFwic2xhcnJcIjpcIlxcdTIxOTBcIixcIlNtYWxsQ2lyY2xlXCI6XCJcXHUyMjE4XCIsXCJzbWFsbHNldG1pbnVzXCI6XCJcXHUyMjE2XCIsXCJzbWFzaHBcIjpcIlxcdTJBMzNcIixcInNtZXBhcnNsXCI6XCJcXHUyOUU0XCIsXCJzbWlkXCI6XCJcXHUyMjIzXCIsXCJzbWlsZVwiOlwiXFx1MjMyM1wiLFwic210XCI6XCJcXHUyQUFBXCIsXCJzbXRlXCI6XCJcXHUyQUFDXCIsXCJzbXRlc1wiOlwiXFx1MkFBQ1xcdUZFMDBcIixcIlNPRlRjeVwiOlwiXFx1MDQyQ1wiLFwic29mdGN5XCI6XCJcXHUwNDRDXCIsXCJzb2xiYXJcIjpcIlxcdTIzM0ZcIixcInNvbGJcIjpcIlxcdTI5QzRcIixcInNvbFwiOlwiL1wiLFwiU29wZlwiOlwiXFx1RDgzNVxcdURENEFcIixcInNvcGZcIjpcIlxcdUQ4MzVcXHVERDY0XCIsXCJzcGFkZXNcIjpcIlxcdTI2NjBcIixcInNwYWRlc3VpdFwiOlwiXFx1MjY2MFwiLFwic3BhclwiOlwiXFx1MjIyNVwiLFwic3FjYXBcIjpcIlxcdTIyOTNcIixcInNxY2Fwc1wiOlwiXFx1MjI5M1xcdUZFMDBcIixcInNxY3VwXCI6XCJcXHUyMjk0XCIsXCJzcWN1cHNcIjpcIlxcdTIyOTRcXHVGRTAwXCIsXCJTcXJ0XCI6XCJcXHUyMjFBXCIsXCJzcXN1YlwiOlwiXFx1MjI4RlwiLFwic3FzdWJlXCI6XCJcXHUyMjkxXCIsXCJzcXN1YnNldFwiOlwiXFx1MjI4RlwiLFwic3FzdWJzZXRlcVwiOlwiXFx1MjI5MVwiLFwic3FzdXBcIjpcIlxcdTIyOTBcIixcInNxc3VwZVwiOlwiXFx1MjI5MlwiLFwic3FzdXBzZXRcIjpcIlxcdTIyOTBcIixcInNxc3Vwc2V0ZXFcIjpcIlxcdTIyOTJcIixcInNxdWFyZVwiOlwiXFx1MjVBMVwiLFwiU3F1YXJlXCI6XCJcXHUyNUExXCIsXCJTcXVhcmVJbnRlcnNlY3Rpb25cIjpcIlxcdTIyOTNcIixcIlNxdWFyZVN1YnNldFwiOlwiXFx1MjI4RlwiLFwiU3F1YXJlU3Vic2V0RXF1YWxcIjpcIlxcdTIyOTFcIixcIlNxdWFyZVN1cGVyc2V0XCI6XCJcXHUyMjkwXCIsXCJTcXVhcmVTdXBlcnNldEVxdWFsXCI6XCJcXHUyMjkyXCIsXCJTcXVhcmVVbmlvblwiOlwiXFx1MjI5NFwiLFwic3F1YXJmXCI6XCJcXHUyNUFBXCIsXCJzcXVcIjpcIlxcdTI1QTFcIixcInNxdWZcIjpcIlxcdTI1QUFcIixcInNyYXJyXCI6XCJcXHUyMTkyXCIsXCJTc2NyXCI6XCJcXHVEODM1XFx1RENBRVwiLFwic3NjclwiOlwiXFx1RDgzNVxcdURDQzhcIixcInNzZXRtblwiOlwiXFx1MjIxNlwiLFwic3NtaWxlXCI6XCJcXHUyMzIzXCIsXCJzc3RhcmZcIjpcIlxcdTIyQzZcIixcIlN0YXJcIjpcIlxcdTIyQzZcIixcInN0YXJcIjpcIlxcdTI2MDZcIixcInN0YXJmXCI6XCJcXHUyNjA1XCIsXCJzdHJhaWdodGVwc2lsb25cIjpcIlxcdTAzRjVcIixcInN0cmFpZ2h0cGhpXCI6XCJcXHUwM0Q1XCIsXCJzdHJuc1wiOlwiXFx1MDBBRlwiLFwic3ViXCI6XCJcXHUyMjgyXCIsXCJTdWJcIjpcIlxcdTIyRDBcIixcInN1YmRvdFwiOlwiXFx1MkFCRFwiLFwic3ViRVwiOlwiXFx1MkFDNVwiLFwic3ViZVwiOlwiXFx1MjI4NlwiLFwic3ViZWRvdFwiOlwiXFx1MkFDM1wiLFwic3VibXVsdFwiOlwiXFx1MkFDMVwiLFwic3VibkVcIjpcIlxcdTJBQ0JcIixcInN1Ym5lXCI6XCJcXHUyMjhBXCIsXCJzdWJwbHVzXCI6XCJcXHUyQUJGXCIsXCJzdWJyYXJyXCI6XCJcXHUyOTc5XCIsXCJzdWJzZXRcIjpcIlxcdTIyODJcIixcIlN1YnNldFwiOlwiXFx1MjJEMFwiLFwic3Vic2V0ZXFcIjpcIlxcdTIyODZcIixcInN1YnNldGVxcVwiOlwiXFx1MkFDNVwiLFwiU3Vic2V0RXF1YWxcIjpcIlxcdTIyODZcIixcInN1YnNldG5lcVwiOlwiXFx1MjI4QVwiLFwic3Vic2V0bmVxcVwiOlwiXFx1MkFDQlwiLFwic3Vic2ltXCI6XCJcXHUyQUM3XCIsXCJzdWJzdWJcIjpcIlxcdTJBRDVcIixcInN1YnN1cFwiOlwiXFx1MkFEM1wiLFwic3VjY2FwcHJveFwiOlwiXFx1MkFCOFwiLFwic3VjY1wiOlwiXFx1MjI3QlwiLFwic3VjY2N1cmx5ZXFcIjpcIlxcdTIyN0RcIixcIlN1Y2NlZWRzXCI6XCJcXHUyMjdCXCIsXCJTdWNjZWVkc0VxdWFsXCI6XCJcXHUyQUIwXCIsXCJTdWNjZWVkc1NsYW50RXF1YWxcIjpcIlxcdTIyN0RcIixcIlN1Y2NlZWRzVGlsZGVcIjpcIlxcdTIyN0ZcIixcInN1Y2NlcVwiOlwiXFx1MkFCMFwiLFwic3VjY25hcHByb3hcIjpcIlxcdTJBQkFcIixcInN1Y2NuZXFxXCI6XCJcXHUyQUI2XCIsXCJzdWNjbnNpbVwiOlwiXFx1MjJFOVwiLFwic3VjY3NpbVwiOlwiXFx1MjI3RlwiLFwiU3VjaFRoYXRcIjpcIlxcdTIyMEJcIixcInN1bVwiOlwiXFx1MjIxMVwiLFwiU3VtXCI6XCJcXHUyMjExXCIsXCJzdW5nXCI6XCJcXHUyNjZBXCIsXCJzdXAxXCI6XCJcXHUwMEI5XCIsXCJzdXAyXCI6XCJcXHUwMEIyXCIsXCJzdXAzXCI6XCJcXHUwMEIzXCIsXCJzdXBcIjpcIlxcdTIyODNcIixcIlN1cFwiOlwiXFx1MjJEMVwiLFwic3VwZG90XCI6XCJcXHUyQUJFXCIsXCJzdXBkc3ViXCI6XCJcXHUyQUQ4XCIsXCJzdXBFXCI6XCJcXHUyQUM2XCIsXCJzdXBlXCI6XCJcXHUyMjg3XCIsXCJzdXBlZG90XCI6XCJcXHUyQUM0XCIsXCJTdXBlcnNldFwiOlwiXFx1MjI4M1wiLFwiU3VwZXJzZXRFcXVhbFwiOlwiXFx1MjI4N1wiLFwic3VwaHNvbFwiOlwiXFx1MjdDOVwiLFwic3VwaHN1YlwiOlwiXFx1MkFEN1wiLFwic3VwbGFyclwiOlwiXFx1Mjk3QlwiLFwic3VwbXVsdFwiOlwiXFx1MkFDMlwiLFwic3VwbkVcIjpcIlxcdTJBQ0NcIixcInN1cG5lXCI6XCJcXHUyMjhCXCIsXCJzdXBwbHVzXCI6XCJcXHUyQUMwXCIsXCJzdXBzZXRcIjpcIlxcdTIyODNcIixcIlN1cHNldFwiOlwiXFx1MjJEMVwiLFwic3Vwc2V0ZXFcIjpcIlxcdTIyODdcIixcInN1cHNldGVxcVwiOlwiXFx1MkFDNlwiLFwic3Vwc2V0bmVxXCI6XCJcXHUyMjhCXCIsXCJzdXBzZXRuZXFxXCI6XCJcXHUyQUNDXCIsXCJzdXBzaW1cIjpcIlxcdTJBQzhcIixcInN1cHN1YlwiOlwiXFx1MkFENFwiLFwic3Vwc3VwXCI6XCJcXHUyQUQ2XCIsXCJzd2FyaGtcIjpcIlxcdTI5MjZcIixcInN3YXJyXCI6XCJcXHUyMTk5XCIsXCJzd0FyclwiOlwiXFx1MjFEOVwiLFwic3dhcnJvd1wiOlwiXFx1MjE5OVwiLFwic3dud2FyXCI6XCJcXHUyOTJBXCIsXCJzemxpZ1wiOlwiXFx1MDBERlwiLFwiVGFiXCI6XCJcXHRcIixcInRhcmdldFwiOlwiXFx1MjMxNlwiLFwiVGF1XCI6XCJcXHUwM0E0XCIsXCJ0YXVcIjpcIlxcdTAzQzRcIixcInRicmtcIjpcIlxcdTIzQjRcIixcIlRjYXJvblwiOlwiXFx1MDE2NFwiLFwidGNhcm9uXCI6XCJcXHUwMTY1XCIsXCJUY2VkaWxcIjpcIlxcdTAxNjJcIixcInRjZWRpbFwiOlwiXFx1MDE2M1wiLFwiVGN5XCI6XCJcXHUwNDIyXCIsXCJ0Y3lcIjpcIlxcdTA0NDJcIixcInRkb3RcIjpcIlxcdTIwREJcIixcInRlbHJlY1wiOlwiXFx1MjMxNVwiLFwiVGZyXCI6XCJcXHVEODM1XFx1REQxN1wiLFwidGZyXCI6XCJcXHVEODM1XFx1REQzMVwiLFwidGhlcmU0XCI6XCJcXHUyMjM0XCIsXCJ0aGVyZWZvcmVcIjpcIlxcdTIyMzRcIixcIlRoZXJlZm9yZVwiOlwiXFx1MjIzNFwiLFwiVGhldGFcIjpcIlxcdTAzOThcIixcInRoZXRhXCI6XCJcXHUwM0I4XCIsXCJ0aGV0YXN5bVwiOlwiXFx1MDNEMVwiLFwidGhldGF2XCI6XCJcXHUwM0QxXCIsXCJ0aGlja2FwcHJveFwiOlwiXFx1MjI0OFwiLFwidGhpY2tzaW1cIjpcIlxcdTIyM0NcIixcIlRoaWNrU3BhY2VcIjpcIlxcdTIwNUZcXHUyMDBBXCIsXCJUaGluU3BhY2VcIjpcIlxcdTIwMDlcIixcInRoaW5zcFwiOlwiXFx1MjAwOVwiLFwidGhrYXBcIjpcIlxcdTIyNDhcIixcInRoa3NpbVwiOlwiXFx1MjIzQ1wiLFwiVEhPUk5cIjpcIlxcdTAwREVcIixcInRob3JuXCI6XCJcXHUwMEZFXCIsXCJ0aWxkZVwiOlwiXFx1MDJEQ1wiLFwiVGlsZGVcIjpcIlxcdTIyM0NcIixcIlRpbGRlRXF1YWxcIjpcIlxcdTIyNDNcIixcIlRpbGRlRnVsbEVxdWFsXCI6XCJcXHUyMjQ1XCIsXCJUaWxkZVRpbGRlXCI6XCJcXHUyMjQ4XCIsXCJ0aW1lc2JhclwiOlwiXFx1MkEzMVwiLFwidGltZXNiXCI6XCJcXHUyMkEwXCIsXCJ0aW1lc1wiOlwiXFx1MDBEN1wiLFwidGltZXNkXCI6XCJcXHUyQTMwXCIsXCJ0aW50XCI6XCJcXHUyMjJEXCIsXCJ0b2VhXCI6XCJcXHUyOTI4XCIsXCJ0b3Bib3RcIjpcIlxcdTIzMzZcIixcInRvcGNpclwiOlwiXFx1MkFGMVwiLFwidG9wXCI6XCJcXHUyMkE0XCIsXCJUb3BmXCI6XCJcXHVEODM1XFx1REQ0QlwiLFwidG9wZlwiOlwiXFx1RDgzNVxcdURENjVcIixcInRvcGZvcmtcIjpcIlxcdTJBREFcIixcInRvc2FcIjpcIlxcdTI5MjlcIixcInRwcmltZVwiOlwiXFx1MjAzNFwiLFwidHJhZGVcIjpcIlxcdTIxMjJcIixcIlRSQURFXCI6XCJcXHUyMTIyXCIsXCJ0cmlhbmdsZVwiOlwiXFx1MjVCNVwiLFwidHJpYW5nbGVkb3duXCI6XCJcXHUyNUJGXCIsXCJ0cmlhbmdsZWxlZnRcIjpcIlxcdTI1QzNcIixcInRyaWFuZ2xlbGVmdGVxXCI6XCJcXHUyMkI0XCIsXCJ0cmlhbmdsZXFcIjpcIlxcdTIyNUNcIixcInRyaWFuZ2xlcmlnaHRcIjpcIlxcdTI1QjlcIixcInRyaWFuZ2xlcmlnaHRlcVwiOlwiXFx1MjJCNVwiLFwidHJpZG90XCI6XCJcXHUyNUVDXCIsXCJ0cmllXCI6XCJcXHUyMjVDXCIsXCJ0cmltaW51c1wiOlwiXFx1MkEzQVwiLFwiVHJpcGxlRG90XCI6XCJcXHUyMERCXCIsXCJ0cmlwbHVzXCI6XCJcXHUyQTM5XCIsXCJ0cmlzYlwiOlwiXFx1MjlDRFwiLFwidHJpdGltZVwiOlwiXFx1MkEzQlwiLFwidHJwZXppdW1cIjpcIlxcdTIzRTJcIixcIlRzY3JcIjpcIlxcdUQ4MzVcXHVEQ0FGXCIsXCJ0c2NyXCI6XCJcXHVEODM1XFx1RENDOVwiLFwiVFNjeVwiOlwiXFx1MDQyNlwiLFwidHNjeVwiOlwiXFx1MDQ0NlwiLFwiVFNIY3lcIjpcIlxcdTA0MEJcIixcInRzaGN5XCI6XCJcXHUwNDVCXCIsXCJUc3Ryb2tcIjpcIlxcdTAxNjZcIixcInRzdHJva1wiOlwiXFx1MDE2N1wiLFwidHdpeHRcIjpcIlxcdTIyNkNcIixcInR3b2hlYWRsZWZ0YXJyb3dcIjpcIlxcdTIxOUVcIixcInR3b2hlYWRyaWdodGFycm93XCI6XCJcXHUyMUEwXCIsXCJVYWN1dGVcIjpcIlxcdTAwREFcIixcInVhY3V0ZVwiOlwiXFx1MDBGQVwiLFwidWFyclwiOlwiXFx1MjE5MVwiLFwiVWFyclwiOlwiXFx1MjE5RlwiLFwidUFyclwiOlwiXFx1MjFEMVwiLFwiVWFycm9jaXJcIjpcIlxcdTI5NDlcIixcIlVicmN5XCI6XCJcXHUwNDBFXCIsXCJ1YnJjeVwiOlwiXFx1MDQ1RVwiLFwiVWJyZXZlXCI6XCJcXHUwMTZDXCIsXCJ1YnJldmVcIjpcIlxcdTAxNkRcIixcIlVjaXJjXCI6XCJcXHUwMERCXCIsXCJ1Y2lyY1wiOlwiXFx1MDBGQlwiLFwiVWN5XCI6XCJcXHUwNDIzXCIsXCJ1Y3lcIjpcIlxcdTA0NDNcIixcInVkYXJyXCI6XCJcXHUyMUM1XCIsXCJVZGJsYWNcIjpcIlxcdTAxNzBcIixcInVkYmxhY1wiOlwiXFx1MDE3MVwiLFwidWRoYXJcIjpcIlxcdTI5NkVcIixcInVmaXNodFwiOlwiXFx1Mjk3RVwiLFwiVWZyXCI6XCJcXHVEODM1XFx1REQxOFwiLFwidWZyXCI6XCJcXHVEODM1XFx1REQzMlwiLFwiVWdyYXZlXCI6XCJcXHUwMEQ5XCIsXCJ1Z3JhdmVcIjpcIlxcdTAwRjlcIixcInVIYXJcIjpcIlxcdTI5NjNcIixcInVoYXJsXCI6XCJcXHUyMUJGXCIsXCJ1aGFyclwiOlwiXFx1MjFCRVwiLFwidWhibGtcIjpcIlxcdTI1ODBcIixcInVsY29yblwiOlwiXFx1MjMxQ1wiLFwidWxjb3JuZXJcIjpcIlxcdTIzMUNcIixcInVsY3JvcFwiOlwiXFx1MjMwRlwiLFwidWx0cmlcIjpcIlxcdTI1RjhcIixcIlVtYWNyXCI6XCJcXHUwMTZBXCIsXCJ1bWFjclwiOlwiXFx1MDE2QlwiLFwidW1sXCI6XCJcXHUwMEE4XCIsXCJVbmRlckJhclwiOlwiX1wiLFwiVW5kZXJCcmFjZVwiOlwiXFx1MjNERlwiLFwiVW5kZXJCcmFja2V0XCI6XCJcXHUyM0I1XCIsXCJVbmRlclBhcmVudGhlc2lzXCI6XCJcXHUyM0REXCIsXCJVbmlvblwiOlwiXFx1MjJDM1wiLFwiVW5pb25QbHVzXCI6XCJcXHUyMjhFXCIsXCJVb2dvblwiOlwiXFx1MDE3MlwiLFwidW9nb25cIjpcIlxcdTAxNzNcIixcIlVvcGZcIjpcIlxcdUQ4MzVcXHVERDRDXCIsXCJ1b3BmXCI6XCJcXHVEODM1XFx1REQ2NlwiLFwiVXBBcnJvd0JhclwiOlwiXFx1MjkxMlwiLFwidXBhcnJvd1wiOlwiXFx1MjE5MVwiLFwiVXBBcnJvd1wiOlwiXFx1MjE5MVwiLFwiVXBhcnJvd1wiOlwiXFx1MjFEMVwiLFwiVXBBcnJvd0Rvd25BcnJvd1wiOlwiXFx1MjFDNVwiLFwidXBkb3duYXJyb3dcIjpcIlxcdTIxOTVcIixcIlVwRG93bkFycm93XCI6XCJcXHUyMTk1XCIsXCJVcGRvd25hcnJvd1wiOlwiXFx1MjFENVwiLFwiVXBFcXVpbGlicml1bVwiOlwiXFx1Mjk2RVwiLFwidXBoYXJwb29ubGVmdFwiOlwiXFx1MjFCRlwiLFwidXBoYXJwb29ucmlnaHRcIjpcIlxcdTIxQkVcIixcInVwbHVzXCI6XCJcXHUyMjhFXCIsXCJVcHBlckxlZnRBcnJvd1wiOlwiXFx1MjE5NlwiLFwiVXBwZXJSaWdodEFycm93XCI6XCJcXHUyMTk3XCIsXCJ1cHNpXCI6XCJcXHUwM0M1XCIsXCJVcHNpXCI6XCJcXHUwM0QyXCIsXCJ1cHNpaFwiOlwiXFx1MDNEMlwiLFwiVXBzaWxvblwiOlwiXFx1MDNBNVwiLFwidXBzaWxvblwiOlwiXFx1MDNDNVwiLFwiVXBUZWVBcnJvd1wiOlwiXFx1MjFBNVwiLFwiVXBUZWVcIjpcIlxcdTIyQTVcIixcInVwdXBhcnJvd3NcIjpcIlxcdTIxQzhcIixcInVyY29yblwiOlwiXFx1MjMxRFwiLFwidXJjb3JuZXJcIjpcIlxcdTIzMURcIixcInVyY3JvcFwiOlwiXFx1MjMwRVwiLFwiVXJpbmdcIjpcIlxcdTAxNkVcIixcInVyaW5nXCI6XCJcXHUwMTZGXCIsXCJ1cnRyaVwiOlwiXFx1MjVGOVwiLFwiVXNjclwiOlwiXFx1RDgzNVxcdURDQjBcIixcInVzY3JcIjpcIlxcdUQ4MzVcXHVEQ0NBXCIsXCJ1dGRvdFwiOlwiXFx1MjJGMFwiLFwiVXRpbGRlXCI6XCJcXHUwMTY4XCIsXCJ1dGlsZGVcIjpcIlxcdTAxNjlcIixcInV0cmlcIjpcIlxcdTI1QjVcIixcInV0cmlmXCI6XCJcXHUyNUI0XCIsXCJ1dWFyclwiOlwiXFx1MjFDOFwiLFwiVXVtbFwiOlwiXFx1MDBEQ1wiLFwidXVtbFwiOlwiXFx1MDBGQ1wiLFwidXdhbmdsZVwiOlwiXFx1MjlBN1wiLFwidmFuZ3J0XCI6XCJcXHUyOTlDXCIsXCJ2YXJlcHNpbG9uXCI6XCJcXHUwM0Y1XCIsXCJ2YXJrYXBwYVwiOlwiXFx1MDNGMFwiLFwidmFybm90aGluZ1wiOlwiXFx1MjIwNVwiLFwidmFycGhpXCI6XCJcXHUwM0Q1XCIsXCJ2YXJwaVwiOlwiXFx1MDNENlwiLFwidmFycHJvcHRvXCI6XCJcXHUyMjFEXCIsXCJ2YXJyXCI6XCJcXHUyMTk1XCIsXCJ2QXJyXCI6XCJcXHUyMUQ1XCIsXCJ2YXJyaG9cIjpcIlxcdTAzRjFcIixcInZhcnNpZ21hXCI6XCJcXHUwM0MyXCIsXCJ2YXJzdWJzZXRuZXFcIjpcIlxcdTIyOEFcXHVGRTAwXCIsXCJ2YXJzdWJzZXRuZXFxXCI6XCJcXHUyQUNCXFx1RkUwMFwiLFwidmFyc3Vwc2V0bmVxXCI6XCJcXHUyMjhCXFx1RkUwMFwiLFwidmFyc3Vwc2V0bmVxcVwiOlwiXFx1MkFDQ1xcdUZFMDBcIixcInZhcnRoZXRhXCI6XCJcXHUwM0QxXCIsXCJ2YXJ0cmlhbmdsZWxlZnRcIjpcIlxcdTIyQjJcIixcInZhcnRyaWFuZ2xlcmlnaHRcIjpcIlxcdTIyQjNcIixcInZCYXJcIjpcIlxcdTJBRThcIixcIlZiYXJcIjpcIlxcdTJBRUJcIixcInZCYXJ2XCI6XCJcXHUyQUU5XCIsXCJWY3lcIjpcIlxcdTA0MTJcIixcInZjeVwiOlwiXFx1MDQzMlwiLFwidmRhc2hcIjpcIlxcdTIyQTJcIixcInZEYXNoXCI6XCJcXHUyMkE4XCIsXCJWZGFzaFwiOlwiXFx1MjJBOVwiLFwiVkRhc2hcIjpcIlxcdTIyQUJcIixcIlZkYXNobFwiOlwiXFx1MkFFNlwiLFwidmVlYmFyXCI6XCJcXHUyMkJCXCIsXCJ2ZWVcIjpcIlxcdTIyMjhcIixcIlZlZVwiOlwiXFx1MjJDMVwiLFwidmVlZXFcIjpcIlxcdTIyNUFcIixcInZlbGxpcFwiOlwiXFx1MjJFRVwiLFwidmVyYmFyXCI6XCJ8XCIsXCJWZXJiYXJcIjpcIlxcdTIwMTZcIixcInZlcnRcIjpcInxcIixcIlZlcnRcIjpcIlxcdTIwMTZcIixcIlZlcnRpY2FsQmFyXCI6XCJcXHUyMjIzXCIsXCJWZXJ0aWNhbExpbmVcIjpcInxcIixcIlZlcnRpY2FsU2VwYXJhdG9yXCI6XCJcXHUyNzU4XCIsXCJWZXJ0aWNhbFRpbGRlXCI6XCJcXHUyMjQwXCIsXCJWZXJ5VGhpblNwYWNlXCI6XCJcXHUyMDBBXCIsXCJWZnJcIjpcIlxcdUQ4MzVcXHVERDE5XCIsXCJ2ZnJcIjpcIlxcdUQ4MzVcXHVERDMzXCIsXCJ2bHRyaVwiOlwiXFx1MjJCMlwiLFwidm5zdWJcIjpcIlxcdTIyODJcXHUyMEQyXCIsXCJ2bnN1cFwiOlwiXFx1MjI4M1xcdTIwRDJcIixcIlZvcGZcIjpcIlxcdUQ4MzVcXHVERDREXCIsXCJ2b3BmXCI6XCJcXHVEODM1XFx1REQ2N1wiLFwidnByb3BcIjpcIlxcdTIyMURcIixcInZydHJpXCI6XCJcXHUyMkIzXCIsXCJWc2NyXCI6XCJcXHVEODM1XFx1RENCMVwiLFwidnNjclwiOlwiXFx1RDgzNVxcdURDQ0JcIixcInZzdWJuRVwiOlwiXFx1MkFDQlxcdUZFMDBcIixcInZzdWJuZVwiOlwiXFx1MjI4QVxcdUZFMDBcIixcInZzdXBuRVwiOlwiXFx1MkFDQ1xcdUZFMDBcIixcInZzdXBuZVwiOlwiXFx1MjI4QlxcdUZFMDBcIixcIlZ2ZGFzaFwiOlwiXFx1MjJBQVwiLFwidnppZ3phZ1wiOlwiXFx1Mjk5QVwiLFwiV2NpcmNcIjpcIlxcdTAxNzRcIixcIndjaXJjXCI6XCJcXHUwMTc1XCIsXCJ3ZWRiYXJcIjpcIlxcdTJBNUZcIixcIndlZGdlXCI6XCJcXHUyMjI3XCIsXCJXZWRnZVwiOlwiXFx1MjJDMFwiLFwid2VkZ2VxXCI6XCJcXHUyMjU5XCIsXCJ3ZWllcnBcIjpcIlxcdTIxMThcIixcIldmclwiOlwiXFx1RDgzNVxcdUREMUFcIixcIndmclwiOlwiXFx1RDgzNVxcdUREMzRcIixcIldvcGZcIjpcIlxcdUQ4MzVcXHVERDRFXCIsXCJ3b3BmXCI6XCJcXHVEODM1XFx1REQ2OFwiLFwid3BcIjpcIlxcdTIxMThcIixcIndyXCI6XCJcXHUyMjQwXCIsXCJ3cmVhdGhcIjpcIlxcdTIyNDBcIixcIldzY3JcIjpcIlxcdUQ4MzVcXHVEQ0IyXCIsXCJ3c2NyXCI6XCJcXHVEODM1XFx1RENDQ1wiLFwieGNhcFwiOlwiXFx1MjJDMlwiLFwieGNpcmNcIjpcIlxcdTI1RUZcIixcInhjdXBcIjpcIlxcdTIyQzNcIixcInhkdHJpXCI6XCJcXHUyNUJEXCIsXCJYZnJcIjpcIlxcdUQ4MzVcXHVERDFCXCIsXCJ4ZnJcIjpcIlxcdUQ4MzVcXHVERDM1XCIsXCJ4aGFyclwiOlwiXFx1MjdGN1wiLFwieGhBcnJcIjpcIlxcdTI3RkFcIixcIlhpXCI6XCJcXHUwMzlFXCIsXCJ4aVwiOlwiXFx1MDNCRVwiLFwieGxhcnJcIjpcIlxcdTI3RjVcIixcInhsQXJyXCI6XCJcXHUyN0Y4XCIsXCJ4bWFwXCI6XCJcXHUyN0ZDXCIsXCJ4bmlzXCI6XCJcXHUyMkZCXCIsXCJ4b2RvdFwiOlwiXFx1MkEwMFwiLFwiWG9wZlwiOlwiXFx1RDgzNVxcdURENEZcIixcInhvcGZcIjpcIlxcdUQ4MzVcXHVERDY5XCIsXCJ4b3BsdXNcIjpcIlxcdTJBMDFcIixcInhvdGltZVwiOlwiXFx1MkEwMlwiLFwieHJhcnJcIjpcIlxcdTI3RjZcIixcInhyQXJyXCI6XCJcXHUyN0Y5XCIsXCJYc2NyXCI6XCJcXHVEODM1XFx1RENCM1wiLFwieHNjclwiOlwiXFx1RDgzNVxcdURDQ0RcIixcInhzcWN1cFwiOlwiXFx1MkEwNlwiLFwieHVwbHVzXCI6XCJcXHUyQTA0XCIsXCJ4dXRyaVwiOlwiXFx1MjVCM1wiLFwieHZlZVwiOlwiXFx1MjJDMVwiLFwieHdlZGdlXCI6XCJcXHUyMkMwXCIsXCJZYWN1dGVcIjpcIlxcdTAwRERcIixcInlhY3V0ZVwiOlwiXFx1MDBGRFwiLFwiWUFjeVwiOlwiXFx1MDQyRlwiLFwieWFjeVwiOlwiXFx1MDQ0RlwiLFwiWWNpcmNcIjpcIlxcdTAxNzZcIixcInljaXJjXCI6XCJcXHUwMTc3XCIsXCJZY3lcIjpcIlxcdTA0MkJcIixcInljeVwiOlwiXFx1MDQ0QlwiLFwieWVuXCI6XCJcXHUwMEE1XCIsXCJZZnJcIjpcIlxcdUQ4MzVcXHVERDFDXCIsXCJ5ZnJcIjpcIlxcdUQ4MzVcXHVERDM2XCIsXCJZSWN5XCI6XCJcXHUwNDA3XCIsXCJ5aWN5XCI6XCJcXHUwNDU3XCIsXCJZb3BmXCI6XCJcXHVEODM1XFx1REQ1MFwiLFwieW9wZlwiOlwiXFx1RDgzNVxcdURENkFcIixcIllzY3JcIjpcIlxcdUQ4MzVcXHVEQ0I0XCIsXCJ5c2NyXCI6XCJcXHVEODM1XFx1RENDRVwiLFwiWVVjeVwiOlwiXFx1MDQyRVwiLFwieXVjeVwiOlwiXFx1MDQ0RVwiLFwieXVtbFwiOlwiXFx1MDBGRlwiLFwiWXVtbFwiOlwiXFx1MDE3OFwiLFwiWmFjdXRlXCI6XCJcXHUwMTc5XCIsXCJ6YWN1dGVcIjpcIlxcdTAxN0FcIixcIlpjYXJvblwiOlwiXFx1MDE3RFwiLFwiemNhcm9uXCI6XCJcXHUwMTdFXCIsXCJaY3lcIjpcIlxcdTA0MTdcIixcInpjeVwiOlwiXFx1MDQzN1wiLFwiWmRvdFwiOlwiXFx1MDE3QlwiLFwiemRvdFwiOlwiXFx1MDE3Q1wiLFwiemVldHJmXCI6XCJcXHUyMTI4XCIsXCJaZXJvV2lkdGhTcGFjZVwiOlwiXFx1MjAwQlwiLFwiWmV0YVwiOlwiXFx1MDM5NlwiLFwiemV0YVwiOlwiXFx1MDNCNlwiLFwiemZyXCI6XCJcXHVEODM1XFx1REQzN1wiLFwiWmZyXCI6XCJcXHUyMTI4XCIsXCJaSGN5XCI6XCJcXHUwNDE2XCIsXCJ6aGN5XCI6XCJcXHUwNDM2XCIsXCJ6aWdyYXJyXCI6XCJcXHUyMUREXCIsXCJ6b3BmXCI6XCJcXHVEODM1XFx1REQ2QlwiLFwiWm9wZlwiOlwiXFx1MjEyNFwiLFwiWnNjclwiOlwiXFx1RDgzNVxcdURDQjVcIixcInpzY3JcIjpcIlxcdUQ4MzVcXHVEQ0NGXCIsXCJ6d2pcIjpcIlxcdTIwMERcIixcInp3bmpcIjpcIlxcdTIwMENcIn0iLCJtb2R1bGUuZXhwb3J0cz17XCJBYWN1dGVcIjpcIlxcdTAwQzFcIixcImFhY3V0ZVwiOlwiXFx1MDBFMVwiLFwiQWNpcmNcIjpcIlxcdTAwQzJcIixcImFjaXJjXCI6XCJcXHUwMEUyXCIsXCJhY3V0ZVwiOlwiXFx1MDBCNFwiLFwiQUVsaWdcIjpcIlxcdTAwQzZcIixcImFlbGlnXCI6XCJcXHUwMEU2XCIsXCJBZ3JhdmVcIjpcIlxcdTAwQzBcIixcImFncmF2ZVwiOlwiXFx1MDBFMFwiLFwiYW1wXCI6XCImXCIsXCJBTVBcIjpcIiZcIixcIkFyaW5nXCI6XCJcXHUwMEM1XCIsXCJhcmluZ1wiOlwiXFx1MDBFNVwiLFwiQXRpbGRlXCI6XCJcXHUwMEMzXCIsXCJhdGlsZGVcIjpcIlxcdTAwRTNcIixcIkF1bWxcIjpcIlxcdTAwQzRcIixcImF1bWxcIjpcIlxcdTAwRTRcIixcImJydmJhclwiOlwiXFx1MDBBNlwiLFwiQ2NlZGlsXCI6XCJcXHUwMEM3XCIsXCJjY2VkaWxcIjpcIlxcdTAwRTdcIixcImNlZGlsXCI6XCJcXHUwMEI4XCIsXCJjZW50XCI6XCJcXHUwMEEyXCIsXCJjb3B5XCI6XCJcXHUwMEE5XCIsXCJDT1BZXCI6XCJcXHUwMEE5XCIsXCJjdXJyZW5cIjpcIlxcdTAwQTRcIixcImRlZ1wiOlwiXFx1MDBCMFwiLFwiZGl2aWRlXCI6XCJcXHUwMEY3XCIsXCJFYWN1dGVcIjpcIlxcdTAwQzlcIixcImVhY3V0ZVwiOlwiXFx1MDBFOVwiLFwiRWNpcmNcIjpcIlxcdTAwQ0FcIixcImVjaXJjXCI6XCJcXHUwMEVBXCIsXCJFZ3JhdmVcIjpcIlxcdTAwQzhcIixcImVncmF2ZVwiOlwiXFx1MDBFOFwiLFwiRVRIXCI6XCJcXHUwMEQwXCIsXCJldGhcIjpcIlxcdTAwRjBcIixcIkV1bWxcIjpcIlxcdTAwQ0JcIixcImV1bWxcIjpcIlxcdTAwRUJcIixcImZyYWMxMlwiOlwiXFx1MDBCRFwiLFwiZnJhYzE0XCI6XCJcXHUwMEJDXCIsXCJmcmFjMzRcIjpcIlxcdTAwQkVcIixcImd0XCI6XCI+XCIsXCJHVFwiOlwiPlwiLFwiSWFjdXRlXCI6XCJcXHUwMENEXCIsXCJpYWN1dGVcIjpcIlxcdTAwRURcIixcIkljaXJjXCI6XCJcXHUwMENFXCIsXCJpY2lyY1wiOlwiXFx1MDBFRVwiLFwiaWV4Y2xcIjpcIlxcdTAwQTFcIixcIklncmF2ZVwiOlwiXFx1MDBDQ1wiLFwiaWdyYXZlXCI6XCJcXHUwMEVDXCIsXCJpcXVlc3RcIjpcIlxcdTAwQkZcIixcIkl1bWxcIjpcIlxcdTAwQ0ZcIixcIml1bWxcIjpcIlxcdTAwRUZcIixcImxhcXVvXCI6XCJcXHUwMEFCXCIsXCJsdFwiOlwiPFwiLFwiTFRcIjpcIjxcIixcIm1hY3JcIjpcIlxcdTAwQUZcIixcIm1pY3JvXCI6XCJcXHUwMEI1XCIsXCJtaWRkb3RcIjpcIlxcdTAwQjdcIixcIm5ic3BcIjpcIlxcdTAwQTBcIixcIm5vdFwiOlwiXFx1MDBBQ1wiLFwiTnRpbGRlXCI6XCJcXHUwMEQxXCIsXCJudGlsZGVcIjpcIlxcdTAwRjFcIixcIk9hY3V0ZVwiOlwiXFx1MDBEM1wiLFwib2FjdXRlXCI6XCJcXHUwMEYzXCIsXCJPY2lyY1wiOlwiXFx1MDBENFwiLFwib2NpcmNcIjpcIlxcdTAwRjRcIixcIk9ncmF2ZVwiOlwiXFx1MDBEMlwiLFwib2dyYXZlXCI6XCJcXHUwMEYyXCIsXCJvcmRmXCI6XCJcXHUwMEFBXCIsXCJvcmRtXCI6XCJcXHUwMEJBXCIsXCJPc2xhc2hcIjpcIlxcdTAwRDhcIixcIm9zbGFzaFwiOlwiXFx1MDBGOFwiLFwiT3RpbGRlXCI6XCJcXHUwMEQ1XCIsXCJvdGlsZGVcIjpcIlxcdTAwRjVcIixcIk91bWxcIjpcIlxcdTAwRDZcIixcIm91bWxcIjpcIlxcdTAwRjZcIixcInBhcmFcIjpcIlxcdTAwQjZcIixcInBsdXNtblwiOlwiXFx1MDBCMVwiLFwicG91bmRcIjpcIlxcdTAwQTNcIixcInF1b3RcIjpcIlxcXCJcIixcIlFVT1RcIjpcIlxcXCJcIixcInJhcXVvXCI6XCJcXHUwMEJCXCIsXCJyZWdcIjpcIlxcdTAwQUVcIixcIlJFR1wiOlwiXFx1MDBBRVwiLFwic2VjdFwiOlwiXFx1MDBBN1wiLFwic2h5XCI6XCJcXHUwMEFEXCIsXCJzdXAxXCI6XCJcXHUwMEI5XCIsXCJzdXAyXCI6XCJcXHUwMEIyXCIsXCJzdXAzXCI6XCJcXHUwMEIzXCIsXCJzemxpZ1wiOlwiXFx1MDBERlwiLFwiVEhPUk5cIjpcIlxcdTAwREVcIixcInRob3JuXCI6XCJcXHUwMEZFXCIsXCJ0aW1lc1wiOlwiXFx1MDBEN1wiLFwiVWFjdXRlXCI6XCJcXHUwMERBXCIsXCJ1YWN1dGVcIjpcIlxcdTAwRkFcIixcIlVjaXJjXCI6XCJcXHUwMERCXCIsXCJ1Y2lyY1wiOlwiXFx1MDBGQlwiLFwiVWdyYXZlXCI6XCJcXHUwMEQ5XCIsXCJ1Z3JhdmVcIjpcIlxcdTAwRjlcIixcInVtbFwiOlwiXFx1MDBBOFwiLFwiVXVtbFwiOlwiXFx1MDBEQ1wiLFwidXVtbFwiOlwiXFx1MDBGQ1wiLFwiWWFjdXRlXCI6XCJcXHUwMEREXCIsXCJ5YWN1dGVcIjpcIlxcdTAwRkRcIixcInllblwiOlwiXFx1MDBBNVwiLFwieXVtbFwiOlwiXFx1MDBGRlwifSIsIm1vZHVsZS5leHBvcnRzPXtcImFtcFwiOlwiJlwiLFwiYXBvc1wiOlwiJ1wiLFwiZ3RcIjpcIj5cIixcImx0XCI6XCI8XCIsXCJxdW90XCI6XCJcXFwiXCJ9XG4iLCJ2YXIgYmFzZSAgICAgICA9IHJlcXVpcmUoJy4vbGliL2Jhc2UnKTtcbnZhciBTYWZlU3RyaW5nID0gcmVxdWlyZSgnLi9saWIvc2FmZS1zdHJpbmcnKTtcbnZhciBFeGNlcHRpb24gID0gcmVxdWlyZSgnLi9saWIvZXhjZXB0aW9uJyk7XG52YXIgVXRpbHMgICAgICA9IHJlcXVpcmUoJy4vbGliL3V0aWxzJyk7XG52YXIgRXZlbnRzICAgICA9IHJlcXVpcmUoJy4vbGliL2V2ZW50cycpO1xudmFyIHJ1bnRpbWUgICAgPSByZXF1aXJlKCcuL2xpYi9ydW50aW1lJyk7XG5cbi8vIEV4dGVuZCB0aGUgRE9NQmFycyBwcm90b3R5cGUgd2l0aCBldmVudCBlbWl0dGVyIGZ1bmN0aW9uYWxpdHkuXG5VdGlscy5leHRlbmQoYmFzZS5ET01CYXJzRW52aXJvbm1lbnQucHJvdG90eXBlLCBFdmVudHMpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbiBjcmVhdGUgKCkge1xuICB2YXIgZGIgPSBuZXcgYmFzZS5ET01CYXJzRW52aXJvbm1lbnQoKTtcblxuICBVdGlscy5leHRlbmQoZGIsIGJhc2UpO1xuICBkYi5WTSAgICAgICAgID0gcnVudGltZTtcbiAgZGIuVXRpbHMgICAgICA9IFV0aWxzO1xuICBkYi5jcmVhdGUgICAgID0gY3JlYXRlO1xuICBkYi5FeGNlcHRpb24gID0gRXhjZXB0aW9uO1xuICBkYi5TYWZlU3RyaW5nID0gU2FmZVN0cmluZztcblxuICBkYi50ZW1wbGF0ZSA9IGZ1bmN0aW9uIChzcGVjKSB7XG4gICAgcmV0dXJuIHJ1bnRpbWUudGVtcGxhdGUoc3BlYywgZGIpO1xuICB9O1xuXG4gIHJldHVybiBkYjtcbn0pKCk7XG4iXX0=
(1)
});
