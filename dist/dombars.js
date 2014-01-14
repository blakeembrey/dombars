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

  db.precompile = function (input, options) {
    return Compiler.precompile(input, options, db);
  };

  db.create             = create;
  db.AST                = AST;
  db.Compiler           = Compiler.Compiler;
  db.JavaScriptCompiler = JavaScriptCompiler;
  db.parse              = base.parse;
  db.Parser             = base.parser;

  return db;
})();

},{"./lib/compiler/ast":3,"./lib/compiler/base":5,"./lib/compiler/compiler":7,"./lib/compiler/javascript-compiler":8,"./runtime":36}],2:[function(require,module,exports){
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

},{"./utils":15,"handlebars/dist/cjs/handlebars/base":21}],3:[function(require,module,exports){
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

},{"../utils":15,"handlebars/dist/cjs/handlebars/compiler/ast":22}],4:[function(require,module,exports){
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

},{"../utils":15,"./common-compiler":6}],5:[function(require,module,exports){
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
Compiler.prototype.setupOptions = function () {
  var options = JSCompiler.setupOptions.apply(this, arguments);

  this.context.aliases.self = 'this';

  options.push('attribute:' + this.isAttribute);
  options.push('update:self.subscription.boundUpdate');
  options.push('unsubscribe:self.subscription.boundUnsubscription');

  for (var i = 0; i < options.length; i++) {
    if (options[i].substr(0, 8) === 'inverse:') {
      this.context.aliases.wrapProgram = 'this.wrapProgram';
      options[i] = 'inverse:wrapProgram(' + options[i].substr(8) + ')';
    }

    if (options[i].substr(0, 3) === 'fn:') {
      this.context.aliases.wrapProgram = 'this.wrapProgram';
      options[i] = 'fn:wrapProgram(' + options[i].substr(3) + ')';
    }
  }

  return options;
};

},{"../utils":15,"handlebars/dist/cjs/handlebars/compiler/javascript-compiler":24}],7:[function(require,module,exports){
var create       = require('../utils').create;
var hbsCompiler  = require('handlebars/dist/cjs/handlebars/compiler/compiler');
var BaseCompiler = hbsCompiler.Compiler.prototype;

/**
 * Compile Handlebars AST and strings.
 *
 * @type {Function}
 */
exports.compile    = hbsCompiler.compile;
exports.precompile = hbsCompiler.precompile;

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

},{"../utils":15,"handlebars/dist/cjs/handlebars/compiler/compiler":23}],8:[function(require,module,exports){
var create         = require('../utils').create;
var CommonCompiler = require('./common-compiler').prototype;

/**
 * Extends Handlebars JavaScript compiler to add DOM specific rules.
 */
var Compiler = module.exports = function () {};
Compiler.prototype = create(CommonCompiler);
Compiler.prototype.compiler          = Compiler;
Compiler.prototype.attributeCompiler = require('./attribute-compiler');

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
      Compiler = this.attributeCompiler;
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

  var createFn = 'createDOM';

  if (isEscaped) {
    createFn = 'createText';
  }

  // Alias the creation function.
  this.context.aliases[createFn] = 'this.' + createFn;

  var local   = this.popStack();
  var source  = this.source.pop();

  this.pushStack(
    createFn + '(function () { ' + source + '; return ' + local + '; })'
  );

  this.source.push(this.appendToBuffer(this.popStack()));
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
  this.context.aliases.partial       = 'this.partial';
  this.context.aliases.createComment = 'this.createComment';

  this.pushStack('createComment(partial(' + this.popStack() + ', depth0))');
};

/**
 * Create a DOM element node ready for appending to the current buffer.
 */
Compiler.prototype.invokeElement = function () {
  this.context.aliases.partial       = 'this.partial';
  this.context.aliases.createElement = 'this.createElement';

  var create  = 'partial(' + this.popStack() + ', depth0)';
  var element = this.lastElement = this.nextStack();

  this.replaceStack(function () {
    var cb = 'function (el) { ' + element + ' = el; }';
    return 'createElement(' + create + ', ' + cb + ')';
  });
};

/**
 * Append an attribute node to the current element.
 */
Compiler.prototype.invokeAttribute = function () {
  this.context.aliases.partial      = 'this.partial';
  this.context.aliases.setAttribute = 'this.setAttribute';

  var element = 'function () { return ' + this.lastElement + '; }';
  var value   = 'partial(' + this.popStack() + ', depth0)';
  var name    = 'partial(' + this.popStack() + ', depth0)';
  var params  = [element, name, value];

  this.source.push('setAttribute(' + params.join(', ') + ');');
};

/**
 * Invoke an arbitrary program and append to the current element.
 */
Compiler.prototype.invokeContent = function () {
  var child = this.popStack() + '(depth0)';

  this.context.aliases.appendChild = 'this.appendChild';

  this.source.push('appendChild(' + this.lastElement + ', ' + child + ');');
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

},{"../utils":15,"./attribute-compiler":4,"./common-compiler":6}],9:[function(require,module,exports){
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

},{"handlebars/dist/cjs/handlebars/compiler/parser":25,"htmlparser2/lib/Parser":30}],10:[function(require,module,exports){
module.exports = require('handlebars/dist/cjs/handlebars/exception').default;

},{"handlebars/dist/cjs/handlebars/exception":26}],11:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};/**
 * Return the current timestamp integer.
 *
 * @return {Number}
 */
var currentTime = global.Date.now || (function () {
  var Constuctor = global.Date;

  return function () {
    return new Constuctor().getTime();
  };
})();

/**
 * Keep local references to the timeout functions. This stops utilities like
 * Sinon.js from breaking the implementation.
 *
 * @type {Function}
 */
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

},{}],12:[function(require,module,exports){
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
VM.createElement = function (tagName) {
  return document.createElement(tagName);
};

/**
 * Copy all the data from one element to another and replace in place.
 *
 * @param  {Node}   node
 * @param  {String} tagName
 * @param  {Object} env
 * @return {Node}
 */
VM.setTagName = function (node, tagName) {
  var newNode = VM.createElement(tagName);

  // Move all child elements to the new node.
  while (node.firstChild) {
    newNode.appendChild(node.firstChild);
  }

  // Copy all the attributes to the new node.
  for (var i = 0; i < node.attributes.length; i++) {
    var attribute = node.attributes[i];
    VM.setAttribute(newNode, attribute.name, attribute.value);
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
VM.removeAttribute = function (el, name) {
  if (!el.hasAttribute(name)) { return; }

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
VM.setAttribute = function (el, name, value) {
  if (value === false) {
    return VM.removeAttribute(el, name);
  }

  // Set the attribute value to the name when the value is `true`.
  el.setAttribute(name, value === true ? name : value);

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
VM.createComment = function (comment) {
  return document.createComment(comment);
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
    child && parent.appendChild(child);
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
      VM.removeAttribute(currentEl(), this.value);
      VM.setAttribute(currentEl(), this.value = value, attrValue.value);
    });

    var attrValue = subscribe(valueFn, null, function (value) {
      VM.setAttribute(currentEl(), attrName.value, this.value = value);
    });

    return VM.setAttribute(currentEl(), attrName.value, attrValue.value);
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
      return VM.createComment(value);
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

},{"./raf":11,"./utils":15,"handlebars/dist/cjs/handlebars/runtime":27}],13:[function(require,module,exports){
module.exports = require('handlebars/dist/cjs/handlebars/safe-string').default;

},{"handlebars/dist/cjs/handlebars/safe-string":28}],14:[function(require,module,exports){
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

},{}],15:[function(require,module,exports){
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

},{"./safe-string":13,"./track-node":14,"handlebars/dist/cjs/handlebars/utils":29}],16:[function(require,module,exports){
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

},{}],17:[function(require,module,exports){
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

},{}],18:[function(require,module,exports){
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

},{}],19:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],20:[function(require,module,exports){
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

},{"./support/isBuffer":19,"__browserify_process":18,"inherits":17}],21:[function(require,module,exports){
"use strict";
var Utils = require("./utils");
var Exception = require("./exception")["default"];

var VERSION = "1.3.0";
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
      throw new Exception("Missing helper: '" + arg + "'");
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
},{"./exception":26,"./utils":29}],22:[function(require,module,exports){
"use strict";
var Exception = require("../exception")["default"];

function LocationInfo(locInfo){
  locInfo = locInfo || {};
  this.firstLine   = locInfo.first_line;
  this.firstColumn = locInfo.first_column;
  this.lastColumn  = locInfo.last_column;
  this.lastLine    = locInfo.last_line;
}

var AST = {
  ProgramNode: function(statements, inverseStrip, inverse, locInfo) {
    var inverseLocationInfo, firstInverseNode;
    if (arguments.length === 3) {
      locInfo = inverse;
      inverse = null;
    } else if (arguments.length === 2) {
      locInfo = inverseStrip;
      inverseStrip = null;
    }

    LocationInfo.call(this, locInfo);
    this.type = "program";
    this.statements = statements;
    this.strip = {};

    if(inverse) {
      firstInverseNode = inverse[0];
      if (firstInverseNode) {
        inverseLocationInfo = {
          first_line: firstInverseNode.firstLine,
          last_line: firstInverseNode.lastLine,
          last_column: firstInverseNode.lastColumn,
          first_column: firstInverseNode.firstColumn
        };
        this.inverse = new AST.ProgramNode(inverse, inverseStrip, inverseLocationInfo);
      } else {
        this.inverse = new AST.ProgramNode(inverse, inverseStrip);
      }
      this.strip.right = inverseStrip.left;
    } else if (inverseStrip) {
      this.strip.left = inverseStrip.right;
    }
  },

  MustacheNode: function(rawParams, hash, open, strip, locInfo) {
    LocationInfo.call(this, locInfo);
    this.type = "mustache";
    this.strip = strip;

    // Open may be a string parsed from the parser or a passed boolean flag
    if (open != null && open.charAt) {
      // Must use charAt to support IE pre-10
      var escapeFlag = open.charAt(3) || open.charAt(2);
      this.escaped = escapeFlag !== '{' && escapeFlag !== '&';
    } else {
      this.escaped = !!open;
    }

    if (rawParams instanceof AST.SexprNode) {
      this.sexpr = rawParams;
    } else {
      // Support old AST API
      this.sexpr = new AST.SexprNode(rawParams, hash);
    }

    this.sexpr.isRoot = true;

    // Support old AST API that stored this info in MustacheNode
    this.id = this.sexpr.id;
    this.params = this.sexpr.params;
    this.hash = this.sexpr.hash;
    this.eligibleHelper = this.sexpr.eligibleHelper;
    this.isHelper = this.sexpr.isHelper;
  },

  SexprNode: function(rawParams, hash, locInfo) {
    LocationInfo.call(this, locInfo);

    this.type = "sexpr";
    this.hash = hash;

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

  PartialNode: function(partialName, context, strip, locInfo) {
    LocationInfo.call(this, locInfo);
    this.type         = "partial";
    this.partialName  = partialName;
    this.context      = context;
    this.strip = strip;
  },

  BlockNode: function(mustache, program, inverse, close, locInfo) {
    LocationInfo.call(this, locInfo);

    if(mustache.sexpr.id.original !== close.path.original) {
      throw new Exception(mustache.sexpr.id.original + " doesn't match " + close.path.original, this);
    }

    this.type = 'block';
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

  ContentNode: function(string, locInfo) {
    LocationInfo.call(this, locInfo);
    this.type = "content";
    this.string = string;
  },

  HashNode: function(pairs, locInfo) {
    LocationInfo.call(this, locInfo);
    this.type = "hash";
    this.pairs = pairs;
  },

  IdNode: function(parts, locInfo) {
    LocationInfo.call(this, locInfo);
    this.type = "ID";

    var original = "",
        dig = [],
        depth = 0;

    for(var i=0,l=parts.length; i<l; i++) {
      var part = parts[i].part;
      original += (parts[i].separator || '') + part;

      if (part === ".." || part === "." || part === "this") {
        if (dig.length > 0) {
          throw new Exception("Invalid path: " + original, this);
        } else if (part === "..") {
          depth++;
        } else {
          this.isScoped = true;
        }
      } else {
        dig.push(part);
      }
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

  PartialNameNode: function(name, locInfo) {
    LocationInfo.call(this, locInfo);
    this.type = "PARTIAL_NAME";
    this.name = name.original;
  },

  DataNode: function(id, locInfo) {
    LocationInfo.call(this, locInfo);
    this.type = "DATA";
    this.id = id;
  },

  StringNode: function(string, locInfo) {
    LocationInfo.call(this, locInfo);
    this.type = "STRING";
    this.original =
      this.string =
      this.stringModeValue = string;
  },

  IntegerNode: function(integer, locInfo) {
    LocationInfo.call(this, locInfo);
    this.type = "INTEGER";
    this.original =
      this.integer = integer;
    this.stringModeValue = Number(integer);
  },

  BooleanNode: function(bool, locInfo) {
    LocationInfo.call(this, locInfo);
    this.type = "BOOLEAN";
    this.bool = bool;
    this.stringModeValue = bool === "true";
  },

  CommentNode: function(comment, locInfo) {
    LocationInfo.call(this, locInfo);
    this.type = "comment";
    this.comment = comment;
  }
};

// Must be exported as an object rather than the root of the module as the jison lexer
// most modify the object to operate properly.
exports["default"] = AST;
},{"../exception":26}],23:[function(require,module,exports){
"use strict";
var Exception = require("../exception")["default"];

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

    var sexpr = mustache.sexpr;
    var type = this.classifySexpr(sexpr);

    if (type === "helper") {
      this.helperSexpr(sexpr, program, inverse);
    } else if (type === "simple") {
      this.simpleSexpr(sexpr);

      // now that the simple mustache is resolved, we need to
      // evaluate it by executing `blockHelperMissing`
      this.opcode('pushProgram', program);
      this.opcode('pushProgram', inverse);
      this.opcode('emptyHash');
      this.opcode('blockValue');
    } else {
      this.ambiguousSexpr(sexpr, program, inverse);

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

        if (val.type === 'sexpr') {
          // Subexpressions get evaluated and passed in
          // in string params mode.
          this.sexpr(val);
        }
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
    this.sexpr(mustache.sexpr);

    if(mustache.escaped && !this.options.noEscape) {
      this.opcode('appendEscaped');
    } else {
      this.opcode('append');
    }
  },

  ambiguousSexpr: function(sexpr, program, inverse) {
    var id = sexpr.id,
        name = id.parts[0],
        isBlock = program != null || inverse != null;

    this.opcode('getContext', id.depth);

    this.opcode('pushProgram', program);
    this.opcode('pushProgram', inverse);

    this.opcode('invokeAmbiguous', name, isBlock);
  },

  simpleSexpr: function(sexpr) {
    var id = sexpr.id;

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

  helperSexpr: function(sexpr, program, inverse) {
    var params = this.setupFullMustacheParams(sexpr, program, inverse),
        name = sexpr.id.parts[0];

    if (this.options.knownHelpers[name]) {
      this.opcode('invokeKnownHelper', params.length, name);
    } else if (this.options.knownHelpersOnly) {
      throw new Exception("You specified knownHelpersOnly, but used the unknown helper " + name, sexpr);
    } else {
      this.opcode('invokeHelper', params.length, name, sexpr.isRoot);
    }
  },

  sexpr: function(sexpr) {
    var type = this.classifySexpr(sexpr);

    if (type === "simple") {
      this.simpleSexpr(sexpr);
    } else if (type === "helper") {
      this.helperSexpr(sexpr);
    } else {
      this.ambiguousSexpr(sexpr);
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
      throw new Exception('Scoped data references are not supported: ' + data.original, data);
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
    if(depth === 0) { return; }

    if(!this.depths[depth]) {
      this.depths[depth] = true;
      this.depths.list.push(depth);
    }
  },

  classifySexpr: function(sexpr) {
    var isHelper   = sexpr.isHelper;
    var isEligible = sexpr.eligibleHelper;
    var options    = this.options;

    // if ambiguous, we can possibly resolve the ambiguity now
    if (isEligible && !isHelper) {
      var name = sexpr.id.parts[0];

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

        if (param.type === 'sexpr') {
          // Subexpressions get evaluated and passed in
          // in string params mode.
          this.sexpr(param);
        }
      } else {
        this[param.type](param);
      }
    }
  },

  setupFullMustacheParams: function(sexpr, program, inverse) {
    var params = sexpr.params;
    this.pushParams(params);

    this.opcode('pushProgram', program);
    this.opcode('pushProgram', inverse);

    if (sexpr.hash) {
      this.hash(sexpr.hash);
    } else {
      this.opcode('emptyHash');
    }

    return params;
  }
};

function precompile(input, options, env) {
  if (input == null || (typeof input !== 'string' && input.constructor !== env.AST.ProgramNode)) {
    throw new Exception("You must pass a string or Handlebars AST to Handlebars.precompile. You passed " + input);
  }

  options = options || {};
  if (!('data' in options)) {
    options.data = true;
  }

  var ast = env.parse(input);
  var environment = new env.Compiler().compile(ast, options);
  return new env.JavaScriptCompiler().compile(environment, options);
}

exports.precompile = precompile;function compile(input, options, env) {
  if (input == null || (typeof input !== 'string' && input.constructor !== env.AST.ProgramNode)) {
    throw new Exception("You must pass a string or Handlebars AST to Handlebars.compile. You passed " + input);
  }

  options = options || {};

  if (!('data' in options)) {
    options.data = true;
  }

  var compiled;

  function compileInput() {
    var ast = env.parse(input);
    var environment = new env.Compiler().compile(ast, options);
    var templateSpec = new env.JavaScriptCompiler().compile(environment, options, undefined, true);
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
},{"../exception":26}],24:[function(require,module,exports){
"use strict";
var COMPILER_REVISION = require("../base").COMPILER_REVISION;
var REVISION_CHANGES = require("../base").REVISION_CHANGES;
var log = require("../base").log;
var Exception = require("../exception")["default"];

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
    this.hashes = [];
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

    if (this.stackSlot || this.inlineStack.length || this.compileStack.length) {
      throw new Exception('Compile completed with content left on stack');
    }

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
    this.pushStackLiteral('data');
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

    // If it's a subexpression, the string result
    // will be pushed after this opcode.
    if (type !== 'sexpr') {
      if (typeof string === 'string') {
        this.pushString(string);
      } else {
        this.pushStackLiteral(string);
      }
    }
  },

  emptyHash: function() {
    this.pushStackLiteral('{}');

    if (this.options.stringParams) {
      this.push('{}'); // hashContexts
      this.push('{}'); // hashTypes
    }
  },
  pushHash: function() {
    if (this.hash) {
      this.hashes.push(this.hash);
    }
    this.hash = {values: [], types: [], contexts: []};
  },
  popHash: function() {
    var hash = this.hash;
    this.hash = this.hashes.pop();

    if (this.options.stringParams) {
      this.push('{' + hash.contexts.join(',') + '}');
      this.push('{' + hash.types.join(',') + '}');
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
  invokeHelper: function(paramSize, name, isRoot) {
    this.context.aliases.helperMissing = 'helpers.helperMissing';
    this.useRegister('helper');

    var helper = this.lastHelper = this.setupHelper(paramSize, name, true);
    var nonHelper = this.nameLookup('depth' + this.lastContext, name, 'context');

    var lookup = 'helper = ' + helper.name + ' || ' + nonHelper;
    if (helper.paramsInit) {
      lookup += ',' + helper.paramsInit;
    }

    this.push(
      '('
        + lookup
        + ',helper '
          + '? helper.call(' + helper.callParams + ') '
          + ': helperMissing.call(' + helper.helperMissingParams + '))');

    // Always flush subexpressions. This is both to prevent the compounding size issue that
    // occurs when the code has to be duplicated for inlining and also to prevent errors
    // due to the incorrect options object being passed due to the shared register.
    if (!isRoot) {
      this.flushInline();
    }
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
    this.useRegister('helper');

    this.emptyHash();
    var helper = this.setupHelper(0, name, helperCall);

    var helperName = this.lastHelper = this.nameLookup('helpers', name, 'helper');

    var nonHelper = this.nameLookup('depth' + this.lastContext, name, 'context');
    var nextStack = this.nextStack();

    if (helper.paramsInit) {
      this.pushSource(helper.paramsInit);
    }
    this.pushSource('if (helper = ' + helperName + ') { ' + nextStack + ' = helper.call(' + helper.callParams + '); }');
    this.pushSource('else { helper = ' + nonHelper + '; ' + nextStack + ' = typeof helper === functionType ? helper.call(' + helper.callParams + ') : helper; }');
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
        stack,
        createdStack,
        usedLiteral;

    // If we are currently inline then we want to merge the inline statement into the
    // replacement statement via ','
    if (inline) {
      var top = this.popStack(true);

      if (top instanceof Literal) {
        // Literals do not need to be inlined
        stack = top.value;
        usedLiteral = true;
      } else {
        // Get or create the current stack name for use by the inline
        createdStack = !this.stackSlot;
        var name = !createdStack ? this.topStackName() : this.incrStack();

        prefix = '(' + this.push(name) + ' = ' + top + '),';
        stack = this.topStack();
      }
    } else {
      stack = this.topStack();
    }

    var item = callback.call(this, stack);

    if (inline) {
      if (!usedLiteral) {
        this.popStack();
      }
      if (createdStack) {
        this.stackSlot--;
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
        if (!this.stackSlot) {
          throw new Exception('Invalid stack pop');
        }
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
    var params = [],
        paramsInit = this.setupParams(paramSize, params, missingParams);
    var foundHelper = this.nameLookup('helpers', name, 'helper');

    return {
      params: params,
      paramsInit: paramsInit,
      name: foundHelper,
      callParams: ["depth0"].concat(params).join(", "),
      helperMissingParams: missingParams && ["depth0", this.quotedString(name)].concat(params).join(", ")
    };
  },

  setupOptions: function(paramSize, params) {
    var options = [], contexts = [], types = [], param, inverse, program;

    options.push("hash:" + this.popStack());

    if (this.options.stringParams) {
      options.push("hashTypes:" + this.popStack());
      options.push("hashContexts:" + this.popStack());
    }

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
    }

    if(this.options.data) {
      options.push("data:data");
    }

    return options;
  },

  // the params and contexts arguments are passed in arrays
  // to fill in
  setupParams: function(paramSize, params, useRegister) {
    var options = '{' + this.setupOptions(paramSize, params).join(',') + '}';

    if (useRegister) {
      this.useRegister('options');
      params.push('options');
      return 'options=' + options;
    } else {
      params.push(options);
      return '';
    }
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
},{"../base":21,"../exception":26}],25:[function(require,module,exports){
"use strict";
/* jshint ignore:start */
/* Jison generated parser */
var handlebars = (function(){
var parser = {trace: function trace() { },
yy: {},
symbols_: {"error":2,"root":3,"statements":4,"EOF":5,"program":6,"simpleInverse":7,"statement":8,"openInverse":9,"closeBlock":10,"openBlock":11,"mustache":12,"partial":13,"CONTENT":14,"COMMENT":15,"OPEN_BLOCK":16,"sexpr":17,"CLOSE":18,"OPEN_INVERSE":19,"OPEN_ENDBLOCK":20,"path":21,"OPEN":22,"OPEN_UNESCAPED":23,"CLOSE_UNESCAPED":24,"OPEN_PARTIAL":25,"partialName":26,"partial_option0":27,"sexpr_repetition0":28,"sexpr_option0":29,"dataName":30,"param":31,"STRING":32,"INTEGER":33,"BOOLEAN":34,"OPEN_SEXPR":35,"CLOSE_SEXPR":36,"hash":37,"hash_repetition_plus0":38,"hashSegment":39,"ID":40,"EQUALS":41,"DATA":42,"pathSegments":43,"SEP":44,"$accept":0,"$end":1},
terminals_: {2:"error",5:"EOF",14:"CONTENT",15:"COMMENT",16:"OPEN_BLOCK",18:"CLOSE",19:"OPEN_INVERSE",20:"OPEN_ENDBLOCK",22:"OPEN",23:"OPEN_UNESCAPED",24:"CLOSE_UNESCAPED",25:"OPEN_PARTIAL",32:"STRING",33:"INTEGER",34:"BOOLEAN",35:"OPEN_SEXPR",36:"CLOSE_SEXPR",40:"ID",41:"EQUALS",42:"DATA",44:"SEP"},
productions_: [0,[3,2],[3,1],[6,2],[6,3],[6,2],[6,1],[6,1],[6,0],[4,1],[4,2],[8,3],[8,3],[8,1],[8,1],[8,1],[8,1],[11,3],[9,3],[10,3],[12,3],[12,3],[13,4],[7,2],[17,3],[17,1],[31,1],[31,1],[31,1],[31,1],[31,1],[31,3],[37,1],[39,3],[26,1],[26,1],[26,1],[30,2],[21,1],[43,3],[43,1],[27,0],[27,1],[28,0],[28,2],[29,0],[29,1],[38,1],[38,2]],
performAction: function anonymous(yytext,yyleng,yylineno,yy,yystate,$$,_$) {

var $0 = $$.length - 1;
switch (yystate) {
case 1: return new yy.ProgramNode($$[$0-1], this._$); 
break;
case 2: return new yy.ProgramNode([], this._$); 
break;
case 3:this.$ = new yy.ProgramNode([], $$[$0-1], $$[$0], this._$);
break;
case 4:this.$ = new yy.ProgramNode($$[$0-2], $$[$0-1], $$[$0], this._$);
break;
case 5:this.$ = new yy.ProgramNode($$[$0-1], $$[$0], [], this._$);
break;
case 6:this.$ = new yy.ProgramNode($$[$0], this._$);
break;
case 7:this.$ = new yy.ProgramNode([], this._$);
break;
case 8:this.$ = new yy.ProgramNode([], this._$);
break;
case 9:this.$ = [$$[$0]];
break;
case 10: $$[$0-1].push($$[$0]); this.$ = $$[$0-1]; 
break;
case 11:this.$ = new yy.BlockNode($$[$0-2], $$[$0-1].inverse, $$[$0-1], $$[$0], this._$);
break;
case 12:this.$ = new yy.BlockNode($$[$0-2], $$[$0-1], $$[$0-1].inverse, $$[$0], this._$);
break;
case 13:this.$ = $$[$0];
break;
case 14:this.$ = $$[$0];
break;
case 15:this.$ = new yy.ContentNode($$[$0], this._$);
break;
case 16:this.$ = new yy.CommentNode($$[$0], this._$);
break;
case 17:this.$ = new yy.MustacheNode($$[$0-1], null, $$[$0-2], stripFlags($$[$0-2], $$[$0]), this._$);
break;
case 18:this.$ = new yy.MustacheNode($$[$0-1], null, $$[$0-2], stripFlags($$[$0-2], $$[$0]), this._$);
break;
case 19:this.$ = {path: $$[$0-1], strip: stripFlags($$[$0-2], $$[$0])};
break;
case 20:this.$ = new yy.MustacheNode($$[$0-1], null, $$[$0-2], stripFlags($$[$0-2], $$[$0]), this._$);
break;
case 21:this.$ = new yy.MustacheNode($$[$0-1], null, $$[$0-2], stripFlags($$[$0-2], $$[$0]), this._$);
break;
case 22:this.$ = new yy.PartialNode($$[$0-2], $$[$0-1], stripFlags($$[$0-3], $$[$0]), this._$);
break;
case 23:this.$ = stripFlags($$[$0-1], $$[$0]);
break;
case 24:this.$ = new yy.SexprNode([$$[$0-2]].concat($$[$0-1]), $$[$0], this._$);
break;
case 25:this.$ = new yy.SexprNode([$$[$0]], null, this._$);
break;
case 26:this.$ = $$[$0];
break;
case 27:this.$ = new yy.StringNode($$[$0], this._$);
break;
case 28:this.$ = new yy.IntegerNode($$[$0], this._$);
break;
case 29:this.$ = new yy.BooleanNode($$[$0], this._$);
break;
case 30:this.$ = $$[$0];
break;
case 31:$$[$0-1].isHelper = true; this.$ = $$[$0-1];
break;
case 32:this.$ = new yy.HashNode($$[$0], this._$);
break;
case 33:this.$ = [$$[$0-2], $$[$0]];
break;
case 34:this.$ = new yy.PartialNameNode($$[$0], this._$);
break;
case 35:this.$ = new yy.PartialNameNode(new yy.StringNode($$[$0], this._$), this._$);
break;
case 36:this.$ = new yy.PartialNameNode(new yy.IntegerNode($$[$0], this._$));
break;
case 37:this.$ = new yy.DataNode($$[$0], this._$);
break;
case 38:this.$ = new yy.IdNode($$[$0], this._$);
break;
case 39: $$[$0-2].push({part: $$[$0], separator: $$[$0-1]}); this.$ = $$[$0-2]; 
break;
case 40:this.$ = [{part: $$[$0]}];
break;
case 43:this.$ = [];
break;
case 44:$$[$0-1].push($$[$0]);
break;
case 47:this.$ = [$$[$0]];
break;
case 48:$$[$0-1].push($$[$0]);
break;
}
},
table: [{3:1,4:2,5:[1,3],8:4,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,11],22:[1,13],23:[1,14],25:[1,15]},{1:[3]},{5:[1,16],8:17,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,11],22:[1,13],23:[1,14],25:[1,15]},{1:[2,2]},{5:[2,9],14:[2,9],15:[2,9],16:[2,9],19:[2,9],20:[2,9],22:[2,9],23:[2,9],25:[2,9]},{4:20,6:18,7:19,8:4,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,21],20:[2,8],22:[1,13],23:[1,14],25:[1,15]},{4:20,6:22,7:19,8:4,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,21],20:[2,8],22:[1,13],23:[1,14],25:[1,15]},{5:[2,13],14:[2,13],15:[2,13],16:[2,13],19:[2,13],20:[2,13],22:[2,13],23:[2,13],25:[2,13]},{5:[2,14],14:[2,14],15:[2,14],16:[2,14],19:[2,14],20:[2,14],22:[2,14],23:[2,14],25:[2,14]},{5:[2,15],14:[2,15],15:[2,15],16:[2,15],19:[2,15],20:[2,15],22:[2,15],23:[2,15],25:[2,15]},{5:[2,16],14:[2,16],15:[2,16],16:[2,16],19:[2,16],20:[2,16],22:[2,16],23:[2,16],25:[2,16]},{17:23,21:24,30:25,40:[1,28],42:[1,27],43:26},{17:29,21:24,30:25,40:[1,28],42:[1,27],43:26},{17:30,21:24,30:25,40:[1,28],42:[1,27],43:26},{17:31,21:24,30:25,40:[1,28],42:[1,27],43:26},{21:33,26:32,32:[1,34],33:[1,35],40:[1,28],43:26},{1:[2,1]},{5:[2,10],14:[2,10],15:[2,10],16:[2,10],19:[2,10],20:[2,10],22:[2,10],23:[2,10],25:[2,10]},{10:36,20:[1,37]},{4:38,8:4,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,11],20:[2,7],22:[1,13],23:[1,14],25:[1,15]},{7:39,8:17,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,21],20:[2,6],22:[1,13],23:[1,14],25:[1,15]},{17:23,18:[1,40],21:24,30:25,40:[1,28],42:[1,27],43:26},{10:41,20:[1,37]},{18:[1,42]},{18:[2,43],24:[2,43],28:43,32:[2,43],33:[2,43],34:[2,43],35:[2,43],36:[2,43],40:[2,43],42:[2,43]},{18:[2,25],24:[2,25],36:[2,25]},{18:[2,38],24:[2,38],32:[2,38],33:[2,38],34:[2,38],35:[2,38],36:[2,38],40:[2,38],42:[2,38],44:[1,44]},{21:45,40:[1,28],43:26},{18:[2,40],24:[2,40],32:[2,40],33:[2,40],34:[2,40],35:[2,40],36:[2,40],40:[2,40],42:[2,40],44:[2,40]},{18:[1,46]},{18:[1,47]},{24:[1,48]},{18:[2,41],21:50,27:49,40:[1,28],43:26},{18:[2,34],40:[2,34]},{18:[2,35],40:[2,35]},{18:[2,36],40:[2,36]},{5:[2,11],14:[2,11],15:[2,11],16:[2,11],19:[2,11],20:[2,11],22:[2,11],23:[2,11],25:[2,11]},{21:51,40:[1,28],43:26},{8:17,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,11],20:[2,3],22:[1,13],23:[1,14],25:[1,15]},{4:52,8:4,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,11],20:[2,5],22:[1,13],23:[1,14],25:[1,15]},{14:[2,23],15:[2,23],16:[2,23],19:[2,23],20:[2,23],22:[2,23],23:[2,23],25:[2,23]},{5:[2,12],14:[2,12],15:[2,12],16:[2,12],19:[2,12],20:[2,12],22:[2,12],23:[2,12],25:[2,12]},{14:[2,18],15:[2,18],16:[2,18],19:[2,18],20:[2,18],22:[2,18],23:[2,18],25:[2,18]},{18:[2,45],21:56,24:[2,45],29:53,30:60,31:54,32:[1,57],33:[1,58],34:[1,59],35:[1,61],36:[2,45],37:55,38:62,39:63,40:[1,64],42:[1,27],43:26},{40:[1,65]},{18:[2,37],24:[2,37],32:[2,37],33:[2,37],34:[2,37],35:[2,37],36:[2,37],40:[2,37],42:[2,37]},{14:[2,17],15:[2,17],16:[2,17],19:[2,17],20:[2,17],22:[2,17],23:[2,17],25:[2,17]},{5:[2,20],14:[2,20],15:[2,20],16:[2,20],19:[2,20],20:[2,20],22:[2,20],23:[2,20],25:[2,20]},{5:[2,21],14:[2,21],15:[2,21],16:[2,21],19:[2,21],20:[2,21],22:[2,21],23:[2,21],25:[2,21]},{18:[1,66]},{18:[2,42]},{18:[1,67]},{8:17,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,11],20:[2,4],22:[1,13],23:[1,14],25:[1,15]},{18:[2,24],24:[2,24],36:[2,24]},{18:[2,44],24:[2,44],32:[2,44],33:[2,44],34:[2,44],35:[2,44],36:[2,44],40:[2,44],42:[2,44]},{18:[2,46],24:[2,46],36:[2,46]},{18:[2,26],24:[2,26],32:[2,26],33:[2,26],34:[2,26],35:[2,26],36:[2,26],40:[2,26],42:[2,26]},{18:[2,27],24:[2,27],32:[2,27],33:[2,27],34:[2,27],35:[2,27],36:[2,27],40:[2,27],42:[2,27]},{18:[2,28],24:[2,28],32:[2,28],33:[2,28],34:[2,28],35:[2,28],36:[2,28],40:[2,28],42:[2,28]},{18:[2,29],24:[2,29],32:[2,29],33:[2,29],34:[2,29],35:[2,29],36:[2,29],40:[2,29],42:[2,29]},{18:[2,30],24:[2,30],32:[2,30],33:[2,30],34:[2,30],35:[2,30],36:[2,30],40:[2,30],42:[2,30]},{17:68,21:24,30:25,40:[1,28],42:[1,27],43:26},{18:[2,32],24:[2,32],36:[2,32],39:69,40:[1,70]},{18:[2,47],24:[2,47],36:[2,47],40:[2,47]},{18:[2,40],24:[2,40],32:[2,40],33:[2,40],34:[2,40],35:[2,40],36:[2,40],40:[2,40],41:[1,71],42:[2,40],44:[2,40]},{18:[2,39],24:[2,39],32:[2,39],33:[2,39],34:[2,39],35:[2,39],36:[2,39],40:[2,39],42:[2,39],44:[2,39]},{5:[2,22],14:[2,22],15:[2,22],16:[2,22],19:[2,22],20:[2,22],22:[2,22],23:[2,22],25:[2,22]},{5:[2,19],14:[2,19],15:[2,19],16:[2,19],19:[2,19],20:[2,19],22:[2,19],23:[2,19],25:[2,19]},{36:[1,72]},{18:[2,48],24:[2,48],36:[2,48],40:[2,48]},{41:[1,71]},{21:56,30:60,31:73,32:[1,57],33:[1,58],34:[1,59],35:[1,61],40:[1,28],42:[1,27],43:26},{18:[2,31],24:[2,31],32:[2,31],33:[2,31],34:[2,31],35:[2,31],36:[2,31],40:[2,31],42:[2,31]},{18:[2,33],24:[2,33],36:[2,33],40:[2,33]}],
defaultActions: {3:[2,2],16:[2,1],50:[2,42]},
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
case 4:return 35;
break;
case 5:return 36;
break;
case 6:return 25;
break;
case 7:return 16;
break;
case 8:return 20;
break;
case 9:return 19;
break;
case 10:return 19;
break;
case 11:return 23;
break;
case 12:return 22;
break;
case 13:this.popState(); this.begin('com');
break;
case 14:strip(3,5); this.popState(); return 15;
break;
case 15:return 22;
break;
case 16:return 41;
break;
case 17:return 40;
break;
case 18:return 40;
break;
case 19:return 44;
break;
case 20:// ignore whitespace
break;
case 21:this.popState(); return 24;
break;
case 22:this.popState(); return 18;
break;
case 23:yy_.yytext = strip(1,2).replace(/\\"/g,'"'); return 32;
break;
case 24:yy_.yytext = strip(1,2).replace(/\\'/g,"'"); return 32;
break;
case 25:return 42;
break;
case 26:return 34;
break;
case 27:return 34;
break;
case 28:return 33;
break;
case 29:return 40;
break;
case 30:yy_.yytext = strip(1,2); return 40;
break;
case 31:return 'INVALID';
break;
case 32:return 5;
break;
}
};
lexer.rules = [/^(?:[^\x00]*?(?=(\{\{)))/,/^(?:[^\x00]+)/,/^(?:[^\x00]{2,}?(?=(\{\{|\\\{\{|\\\\\{\{|$)))/,/^(?:[\s\S]*?--\}\})/,/^(?:\()/,/^(?:\))/,/^(?:\{\{(~)?>)/,/^(?:\{\{(~)?#)/,/^(?:\{\{(~)?\/)/,/^(?:\{\{(~)?\^)/,/^(?:\{\{(~)?\s*else\b)/,/^(?:\{\{(~)?\{)/,/^(?:\{\{(~)?&)/,/^(?:\{\{!--)/,/^(?:\{\{![\s\S]*?\}\})/,/^(?:\{\{(~)?)/,/^(?:=)/,/^(?:\.\.)/,/^(?:\.(?=([=~}\s\/.)])))/,/^(?:[\/.])/,/^(?:\s+)/,/^(?:\}(~)?\}\})/,/^(?:(~)?\}\})/,/^(?:"(\\["]|[^"])*")/,/^(?:'(\\[']|[^'])*')/,/^(?:@)/,/^(?:true(?=([~}\s)])))/,/^(?:false(?=([~}\s)])))/,/^(?:-?[0-9]+(?=([~}\s)])))/,/^(?:([^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=([=~}\s\/.)]))))/,/^(?:\[[^\]]*\])/,/^(?:.)/,/^(?:$)/];
lexer.conditions = {"mu":{"rules":[4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32],"inclusive":false},"emu":{"rules":[2],"inclusive":false},"com":{"rules":[3],"inclusive":false},"INITIAL":{"rules":[0,1,32],"inclusive":true}};
return lexer;})()
parser.lexer = lexer;
function Parser () { this.yy = {}; }Parser.prototype = parser;parser.Parser = Parser;
return new Parser;
})();exports["default"] = handlebars;
/* jshint ignore:end */
},{}],26:[function(require,module,exports){
"use strict";

var errorProps = ['description', 'fileName', 'lineNumber', 'message', 'name', 'number', 'stack'];

function Exception(message, node) {
  var line;
  if (node && node.firstLine) {
    line = node.firstLine;

    message += ' - ' + line + ':' + node.firstColumn;
  }

  var tmp = Error.prototype.constructor.call(this, message);

  // Unfortunately errors are not enumerable in Chrome (at least), so `for prop in tmp` doesn't work.
  for (var idx = 0; idx < errorProps.length; idx++) {
    this[errorProps[idx]] = tmp[errorProps[idx]];
  }

  if (line) {
    this.lineNumber = line;
    this.column = node.firstColumn;
  }
}

Exception.prototype = new Error();

exports["default"] = Exception;
},{}],27:[function(require,module,exports){
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
      throw new Exception("Template was precompiled with an older version of Handlebars than the current runtime. "+
            "Please update your precompiler to a newer version ("+runtimeVersions+") or downgrade your runtime to an older version ("+compilerVersions+").");
    } else {
      // Use the embedded version info since the runtime doesn't know about this revision yet
      throw new Exception("Template was precompiled with a newer version of Handlebars than the current runtime. "+
            "Please update your runtime to a newer version ("+compilerInfo[1]+").");
    }
  }
}

exports.checkRevision = checkRevision;// TODO: Remove this line and break up compilePartial

function template(templateSpec, env) {
  if (!env) {
    throw new Exception("No environment passed to template");
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
},{"./base":21,"./exception":26,"./utils":29}],28:[function(require,module,exports){
"use strict";
// Build out our basic SafeString type
function SafeString(string) {
  this.string = string;
}

SafeString.prototype.toString = function() {
  return "" + this.string;
};

exports["default"] = SafeString;
},{}],29:[function(require,module,exports){
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
},{"./safe-string":28}],30:[function(require,module,exports){
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

},{"./Tokenizer.js":31,"events":16,"util":20}],31:[function(require,module,exports){
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

},{"./entities/decode.json":32,"./entities/entities.json":33,"./entities/legacy.json":34,"./entities/xml.json":35}],32:[function(require,module,exports){
module.exports={"0":"\uFFFD","128":"\u20AC","130":"\u201A","131":"\u0192","132":"\u201E","133":"\u2026","134":"\u2020","135":"\u2021","136":"\u02C6","137":"\u2030","138":"\u0160","139":"\u2039","140":"\u0152","142":"\u017D","145":"\u2018","146":"\u2019","147":"\u201C","148":"\u201D","149":"\u2022","150":"\u2013","151":"\u2014","152":"\u02DC","153":"\u2122","154":"\u0161","155":"\u203A","156":"\u0153","158":"\u017E","159":"\u0178"}

},{}],33:[function(require,module,exports){
module.exports={"Aacute":"\u00C1","aacute":"\u00E1","Abreve":"\u0102","abreve":"\u0103","ac":"\u223E","acd":"\u223F","acE":"\u223E\u0333","Acirc":"\u00C2","acirc":"\u00E2","acute":"\u00B4","Acy":"\u0410","acy":"\u0430","AElig":"\u00C6","aelig":"\u00E6","af":"\u2061","Afr":"\uD835\uDD04","afr":"\uD835\uDD1E","Agrave":"\u00C0","agrave":"\u00E0","alefsym":"\u2135","aleph":"\u2135","Alpha":"\u0391","alpha":"\u03B1","Amacr":"\u0100","amacr":"\u0101","amalg":"\u2A3F","amp":"&","AMP":"&","andand":"\u2A55","And":"\u2A53","and":"\u2227","andd":"\u2A5C","andslope":"\u2A58","andv":"\u2A5A","ang":"\u2220","ange":"\u29A4","angle":"\u2220","angmsdaa":"\u29A8","angmsdab":"\u29A9","angmsdac":"\u29AA","angmsdad":"\u29AB","angmsdae":"\u29AC","angmsdaf":"\u29AD","angmsdag":"\u29AE","angmsdah":"\u29AF","angmsd":"\u2221","angrt":"\u221F","angrtvb":"\u22BE","angrtvbd":"\u299D","angsph":"\u2222","angst":"\u00C5","angzarr":"\u237C","Aogon":"\u0104","aogon":"\u0105","Aopf":"\uD835\uDD38","aopf":"\uD835\uDD52","apacir":"\u2A6F","ap":"\u2248","apE":"\u2A70","ape":"\u224A","apid":"\u224B","apos":"'","ApplyFunction":"\u2061","approx":"\u2248","approxeq":"\u224A","Aring":"\u00C5","aring":"\u00E5","Ascr":"\uD835\uDC9C","ascr":"\uD835\uDCB6","Assign":"\u2254","ast":"*","asymp":"\u2248","asympeq":"\u224D","Atilde":"\u00C3","atilde":"\u00E3","Auml":"\u00C4","auml":"\u00E4","awconint":"\u2233","awint":"\u2A11","backcong":"\u224C","backepsilon":"\u03F6","backprime":"\u2035","backsim":"\u223D","backsimeq":"\u22CD","Backslash":"\u2216","Barv":"\u2AE7","barvee":"\u22BD","barwed":"\u2305","Barwed":"\u2306","barwedge":"\u2305","bbrk":"\u23B5","bbrktbrk":"\u23B6","bcong":"\u224C","Bcy":"\u0411","bcy":"\u0431","bdquo":"\u201E","becaus":"\u2235","because":"\u2235","Because":"\u2235","bemptyv":"\u29B0","bepsi":"\u03F6","bernou":"\u212C","Bernoullis":"\u212C","Beta":"\u0392","beta":"\u03B2","beth":"\u2136","between":"\u226C","Bfr":"\uD835\uDD05","bfr":"\uD835\uDD1F","bigcap":"\u22C2","bigcirc":"\u25EF","bigcup":"\u22C3","bigodot":"\u2A00","bigoplus":"\u2A01","bigotimes":"\u2A02","bigsqcup":"\u2A06","bigstar":"\u2605","bigtriangledown":"\u25BD","bigtriangleup":"\u25B3","biguplus":"\u2A04","bigvee":"\u22C1","bigwedge":"\u22C0","bkarow":"\u290D","blacklozenge":"\u29EB","blacksquare":"\u25AA","blacktriangle":"\u25B4","blacktriangledown":"\u25BE","blacktriangleleft":"\u25C2","blacktriangleright":"\u25B8","blank":"\u2423","blk12":"\u2592","blk14":"\u2591","blk34":"\u2593","block":"\u2588","bne":"=\u20E5","bnequiv":"\u2261\u20E5","bNot":"\u2AED","bnot":"\u2310","Bopf":"\uD835\uDD39","bopf":"\uD835\uDD53","bot":"\u22A5","bottom":"\u22A5","bowtie":"\u22C8","boxbox":"\u29C9","boxdl":"\u2510","boxdL":"\u2555","boxDl":"\u2556","boxDL":"\u2557","boxdr":"\u250C","boxdR":"\u2552","boxDr":"\u2553","boxDR":"\u2554","boxh":"\u2500","boxH":"\u2550","boxhd":"\u252C","boxHd":"\u2564","boxhD":"\u2565","boxHD":"\u2566","boxhu":"\u2534","boxHu":"\u2567","boxhU":"\u2568","boxHU":"\u2569","boxminus":"\u229F","boxplus":"\u229E","boxtimes":"\u22A0","boxul":"\u2518","boxuL":"\u255B","boxUl":"\u255C","boxUL":"\u255D","boxur":"\u2514","boxuR":"\u2558","boxUr":"\u2559","boxUR":"\u255A","boxv":"\u2502","boxV":"\u2551","boxvh":"\u253C","boxvH":"\u256A","boxVh":"\u256B","boxVH":"\u256C","boxvl":"\u2524","boxvL":"\u2561","boxVl":"\u2562","boxVL":"\u2563","boxvr":"\u251C","boxvR":"\u255E","boxVr":"\u255F","boxVR":"\u2560","bprime":"\u2035","breve":"\u02D8","Breve":"\u02D8","brvbar":"\u00A6","bscr":"\uD835\uDCB7","Bscr":"\u212C","bsemi":"\u204F","bsim":"\u223D","bsime":"\u22CD","bsolb":"\u29C5","bsol":"\\","bsolhsub":"\u27C8","bull":"\u2022","bullet":"\u2022","bump":"\u224E","bumpE":"\u2AAE","bumpe":"\u224F","Bumpeq":"\u224E","bumpeq":"\u224F","Cacute":"\u0106","cacute":"\u0107","capand":"\u2A44","capbrcup":"\u2A49","capcap":"\u2A4B","cap":"\u2229","Cap":"\u22D2","capcup":"\u2A47","capdot":"\u2A40","CapitalDifferentialD":"\u2145","caps":"\u2229\uFE00","caret":"\u2041","caron":"\u02C7","Cayleys":"\u212D","ccaps":"\u2A4D","Ccaron":"\u010C","ccaron":"\u010D","Ccedil":"\u00C7","ccedil":"\u00E7","Ccirc":"\u0108","ccirc":"\u0109","Cconint":"\u2230","ccups":"\u2A4C","ccupssm":"\u2A50","Cdot":"\u010A","cdot":"\u010B","cedil":"\u00B8","Cedilla":"\u00B8","cemptyv":"\u29B2","cent":"\u00A2","centerdot":"\u00B7","CenterDot":"\u00B7","cfr":"\uD835\uDD20","Cfr":"\u212D","CHcy":"\u0427","chcy":"\u0447","check":"\u2713","checkmark":"\u2713","Chi":"\u03A7","chi":"\u03C7","circ":"\u02C6","circeq":"\u2257","circlearrowleft":"\u21BA","circlearrowright":"\u21BB","circledast":"\u229B","circledcirc":"\u229A","circleddash":"\u229D","CircleDot":"\u2299","circledR":"\u00AE","circledS":"\u24C8","CircleMinus":"\u2296","CirclePlus":"\u2295","CircleTimes":"\u2297","cir":"\u25CB","cirE":"\u29C3","cire":"\u2257","cirfnint":"\u2A10","cirmid":"\u2AEF","cirscir":"\u29C2","ClockwiseContourIntegral":"\u2232","CloseCurlyDoubleQuote":"\u201D","CloseCurlyQuote":"\u2019","clubs":"\u2663","clubsuit":"\u2663","colon":":","Colon":"\u2237","Colone":"\u2A74","colone":"\u2254","coloneq":"\u2254","comma":",","commat":"@","comp":"\u2201","compfn":"\u2218","complement":"\u2201","complexes":"\u2102","cong":"\u2245","congdot":"\u2A6D","Congruent":"\u2261","conint":"\u222E","Conint":"\u222F","ContourIntegral":"\u222E","copf":"\uD835\uDD54","Copf":"\u2102","coprod":"\u2210","Coproduct":"\u2210","copy":"\u00A9","COPY":"\u00A9","copysr":"\u2117","CounterClockwiseContourIntegral":"\u2233","crarr":"\u21B5","cross":"\u2717","Cross":"\u2A2F","Cscr":"\uD835\uDC9E","cscr":"\uD835\uDCB8","csub":"\u2ACF","csube":"\u2AD1","csup":"\u2AD0","csupe":"\u2AD2","ctdot":"\u22EF","cudarrl":"\u2938","cudarrr":"\u2935","cuepr":"\u22DE","cuesc":"\u22DF","cularr":"\u21B6","cularrp":"\u293D","cupbrcap":"\u2A48","cupcap":"\u2A46","CupCap":"\u224D","cup":"\u222A","Cup":"\u22D3","cupcup":"\u2A4A","cupdot":"\u228D","cupor":"\u2A45","cups":"\u222A\uFE00","curarr":"\u21B7","curarrm":"\u293C","curlyeqprec":"\u22DE","curlyeqsucc":"\u22DF","curlyvee":"\u22CE","curlywedge":"\u22CF","curren":"\u00A4","curvearrowleft":"\u21B6","curvearrowright":"\u21B7","cuvee":"\u22CE","cuwed":"\u22CF","cwconint":"\u2232","cwint":"\u2231","cylcty":"\u232D","dagger":"\u2020","Dagger":"\u2021","daleth":"\u2138","darr":"\u2193","Darr":"\u21A1","dArr":"\u21D3","dash":"\u2010","Dashv":"\u2AE4","dashv":"\u22A3","dbkarow":"\u290F","dblac":"\u02DD","Dcaron":"\u010E","dcaron":"\u010F","Dcy":"\u0414","dcy":"\u0434","ddagger":"\u2021","ddarr":"\u21CA","DD":"\u2145","dd":"\u2146","DDotrahd":"\u2911","ddotseq":"\u2A77","deg":"\u00B0","Del":"\u2207","Delta":"\u0394","delta":"\u03B4","demptyv":"\u29B1","dfisht":"\u297F","Dfr":"\uD835\uDD07","dfr":"\uD835\uDD21","dHar":"\u2965","dharl":"\u21C3","dharr":"\u21C2","DiacriticalAcute":"\u00B4","DiacriticalDot":"\u02D9","DiacriticalDoubleAcute":"\u02DD","DiacriticalGrave":"`","DiacriticalTilde":"\u02DC","diam":"\u22C4","diamond":"\u22C4","Diamond":"\u22C4","diamondsuit":"\u2666","diams":"\u2666","die":"\u00A8","DifferentialD":"\u2146","digamma":"\u03DD","disin":"\u22F2","div":"\u00F7","divide":"\u00F7","divideontimes":"\u22C7","divonx":"\u22C7","DJcy":"\u0402","djcy":"\u0452","dlcorn":"\u231E","dlcrop":"\u230D","dollar":"$","Dopf":"\uD835\uDD3B","dopf":"\uD835\uDD55","Dot":"\u00A8","dot":"\u02D9","DotDot":"\u20DC","doteq":"\u2250","doteqdot":"\u2251","DotEqual":"\u2250","dotminus":"\u2238","dotplus":"\u2214","dotsquare":"\u22A1","doublebarwedge":"\u2306","DoubleContourIntegral":"\u222F","DoubleDot":"\u00A8","DoubleDownArrow":"\u21D3","DoubleLeftArrow":"\u21D0","DoubleLeftRightArrow":"\u21D4","DoubleLeftTee":"\u2AE4","DoubleLongLeftArrow":"\u27F8","DoubleLongLeftRightArrow":"\u27FA","DoubleLongRightArrow":"\u27F9","DoubleRightArrow":"\u21D2","DoubleRightTee":"\u22A8","DoubleUpArrow":"\u21D1","DoubleUpDownArrow":"\u21D5","DoubleVerticalBar":"\u2225","DownArrowBar":"\u2913","downarrow":"\u2193","DownArrow":"\u2193","Downarrow":"\u21D3","DownArrowUpArrow":"\u21F5","DownBreve":"\u0311","downdownarrows":"\u21CA","downharpoonleft":"\u21C3","downharpoonright":"\u21C2","DownLeftRightVector":"\u2950","DownLeftTeeVector":"\u295E","DownLeftVectorBar":"\u2956","DownLeftVector":"\u21BD","DownRightTeeVector":"\u295F","DownRightVectorBar":"\u2957","DownRightVector":"\u21C1","DownTeeArrow":"\u21A7","DownTee":"\u22A4","drbkarow":"\u2910","drcorn":"\u231F","drcrop":"\u230C","Dscr":"\uD835\uDC9F","dscr":"\uD835\uDCB9","DScy":"\u0405","dscy":"\u0455","dsol":"\u29F6","Dstrok":"\u0110","dstrok":"\u0111","dtdot":"\u22F1","dtri":"\u25BF","dtrif":"\u25BE","duarr":"\u21F5","duhar":"\u296F","dwangle":"\u29A6","DZcy":"\u040F","dzcy":"\u045F","dzigrarr":"\u27FF","Eacute":"\u00C9","eacute":"\u00E9","easter":"\u2A6E","Ecaron":"\u011A","ecaron":"\u011B","Ecirc":"\u00CA","ecirc":"\u00EA","ecir":"\u2256","ecolon":"\u2255","Ecy":"\u042D","ecy":"\u044D","eDDot":"\u2A77","Edot":"\u0116","edot":"\u0117","eDot":"\u2251","ee":"\u2147","efDot":"\u2252","Efr":"\uD835\uDD08","efr":"\uD835\uDD22","eg":"\u2A9A","Egrave":"\u00C8","egrave":"\u00E8","egs":"\u2A96","egsdot":"\u2A98","el":"\u2A99","Element":"\u2208","elinters":"\u23E7","ell":"\u2113","els":"\u2A95","elsdot":"\u2A97","Emacr":"\u0112","emacr":"\u0113","empty":"\u2205","emptyset":"\u2205","EmptySmallSquare":"\u25FB","emptyv":"\u2205","EmptyVerySmallSquare":"\u25AB","emsp13":"\u2004","emsp14":"\u2005","emsp":"\u2003","ENG":"\u014A","eng":"\u014B","ensp":"\u2002","Eogon":"\u0118","eogon":"\u0119","Eopf":"\uD835\uDD3C","eopf":"\uD835\uDD56","epar":"\u22D5","eparsl":"\u29E3","eplus":"\u2A71","epsi":"\u03B5","Epsilon":"\u0395","epsilon":"\u03B5","epsiv":"\u03F5","eqcirc":"\u2256","eqcolon":"\u2255","eqsim":"\u2242","eqslantgtr":"\u2A96","eqslantless":"\u2A95","Equal":"\u2A75","equals":"=","EqualTilde":"\u2242","equest":"\u225F","Equilibrium":"\u21CC","equiv":"\u2261","equivDD":"\u2A78","eqvparsl":"\u29E5","erarr":"\u2971","erDot":"\u2253","escr":"\u212F","Escr":"\u2130","esdot":"\u2250","Esim":"\u2A73","esim":"\u2242","Eta":"\u0397","eta":"\u03B7","ETH":"\u00D0","eth":"\u00F0","Euml":"\u00CB","euml":"\u00EB","euro":"\u20AC","excl":"!","exist":"\u2203","Exists":"\u2203","expectation":"\u2130","exponentiale":"\u2147","ExponentialE":"\u2147","fallingdotseq":"\u2252","Fcy":"\u0424","fcy":"\u0444","female":"\u2640","ffilig":"\uFB03","fflig":"\uFB00","ffllig":"\uFB04","Ffr":"\uD835\uDD09","ffr":"\uD835\uDD23","filig":"\uFB01","FilledSmallSquare":"\u25FC","FilledVerySmallSquare":"\u25AA","fjlig":"fj","flat":"\u266D","fllig":"\uFB02","fltns":"\u25B1","fnof":"\u0192","Fopf":"\uD835\uDD3D","fopf":"\uD835\uDD57","forall":"\u2200","ForAll":"\u2200","fork":"\u22D4","forkv":"\u2AD9","Fouriertrf":"\u2131","fpartint":"\u2A0D","frac12":"\u00BD","frac13":"\u2153","frac14":"\u00BC","frac15":"\u2155","frac16":"\u2159","frac18":"\u215B","frac23":"\u2154","frac25":"\u2156","frac34":"\u00BE","frac35":"\u2157","frac38":"\u215C","frac45":"\u2158","frac56":"\u215A","frac58":"\u215D","frac78":"\u215E","frasl":"\u2044","frown":"\u2322","fscr":"\uD835\uDCBB","Fscr":"\u2131","gacute":"\u01F5","Gamma":"\u0393","gamma":"\u03B3","Gammad":"\u03DC","gammad":"\u03DD","gap":"\u2A86","Gbreve":"\u011E","gbreve":"\u011F","Gcedil":"\u0122","Gcirc":"\u011C","gcirc":"\u011D","Gcy":"\u0413","gcy":"\u0433","Gdot":"\u0120","gdot":"\u0121","ge":"\u2265","gE":"\u2267","gEl":"\u2A8C","gel":"\u22DB","geq":"\u2265","geqq":"\u2267","geqslant":"\u2A7E","gescc":"\u2AA9","ges":"\u2A7E","gesdot":"\u2A80","gesdoto":"\u2A82","gesdotol":"\u2A84","gesl":"\u22DB\uFE00","gesles":"\u2A94","Gfr":"\uD835\uDD0A","gfr":"\uD835\uDD24","gg":"\u226B","Gg":"\u22D9","ggg":"\u22D9","gimel":"\u2137","GJcy":"\u0403","gjcy":"\u0453","gla":"\u2AA5","gl":"\u2277","glE":"\u2A92","glj":"\u2AA4","gnap":"\u2A8A","gnapprox":"\u2A8A","gne":"\u2A88","gnE":"\u2269","gneq":"\u2A88","gneqq":"\u2269","gnsim":"\u22E7","Gopf":"\uD835\uDD3E","gopf":"\uD835\uDD58","grave":"`","GreaterEqual":"\u2265","GreaterEqualLess":"\u22DB","GreaterFullEqual":"\u2267","GreaterGreater":"\u2AA2","GreaterLess":"\u2277","GreaterSlantEqual":"\u2A7E","GreaterTilde":"\u2273","Gscr":"\uD835\uDCA2","gscr":"\u210A","gsim":"\u2273","gsime":"\u2A8E","gsiml":"\u2A90","gtcc":"\u2AA7","gtcir":"\u2A7A","gt":">","GT":">","Gt":"\u226B","gtdot":"\u22D7","gtlPar":"\u2995","gtquest":"\u2A7C","gtrapprox":"\u2A86","gtrarr":"\u2978","gtrdot":"\u22D7","gtreqless":"\u22DB","gtreqqless":"\u2A8C","gtrless":"\u2277","gtrsim":"\u2273","gvertneqq":"\u2269\uFE00","gvnE":"\u2269\uFE00","Hacek":"\u02C7","hairsp":"\u200A","half":"\u00BD","hamilt":"\u210B","HARDcy":"\u042A","hardcy":"\u044A","harrcir":"\u2948","harr":"\u2194","hArr":"\u21D4","harrw":"\u21AD","Hat":"^","hbar":"\u210F","Hcirc":"\u0124","hcirc":"\u0125","hearts":"\u2665","heartsuit":"\u2665","hellip":"\u2026","hercon":"\u22B9","hfr":"\uD835\uDD25","Hfr":"\u210C","HilbertSpace":"\u210B","hksearow":"\u2925","hkswarow":"\u2926","hoarr":"\u21FF","homtht":"\u223B","hookleftarrow":"\u21A9","hookrightarrow":"\u21AA","hopf":"\uD835\uDD59","Hopf":"\u210D","horbar":"\u2015","HorizontalLine":"\u2500","hscr":"\uD835\uDCBD","Hscr":"\u210B","hslash":"\u210F","Hstrok":"\u0126","hstrok":"\u0127","HumpDownHump":"\u224E","HumpEqual":"\u224F","hybull":"\u2043","hyphen":"\u2010","Iacute":"\u00CD","iacute":"\u00ED","ic":"\u2063","Icirc":"\u00CE","icirc":"\u00EE","Icy":"\u0418","icy":"\u0438","Idot":"\u0130","IEcy":"\u0415","iecy":"\u0435","iexcl":"\u00A1","iff":"\u21D4","ifr":"\uD835\uDD26","Ifr":"\u2111","Igrave":"\u00CC","igrave":"\u00EC","ii":"\u2148","iiiint":"\u2A0C","iiint":"\u222D","iinfin":"\u29DC","iiota":"\u2129","IJlig":"\u0132","ijlig":"\u0133","Imacr":"\u012A","imacr":"\u012B","image":"\u2111","ImaginaryI":"\u2148","imagline":"\u2110","imagpart":"\u2111","imath":"\u0131","Im":"\u2111","imof":"\u22B7","imped":"\u01B5","Implies":"\u21D2","incare":"\u2105","in":"\u2208","infin":"\u221E","infintie":"\u29DD","inodot":"\u0131","intcal":"\u22BA","int":"\u222B","Int":"\u222C","integers":"\u2124","Integral":"\u222B","intercal":"\u22BA","Intersection":"\u22C2","intlarhk":"\u2A17","intprod":"\u2A3C","InvisibleComma":"\u2063","InvisibleTimes":"\u2062","IOcy":"\u0401","iocy":"\u0451","Iogon":"\u012E","iogon":"\u012F","Iopf":"\uD835\uDD40","iopf":"\uD835\uDD5A","Iota":"\u0399","iota":"\u03B9","iprod":"\u2A3C","iquest":"\u00BF","iscr":"\uD835\uDCBE","Iscr":"\u2110","isin":"\u2208","isindot":"\u22F5","isinE":"\u22F9","isins":"\u22F4","isinsv":"\u22F3","isinv":"\u2208","it":"\u2062","Itilde":"\u0128","itilde":"\u0129","Iukcy":"\u0406","iukcy":"\u0456","Iuml":"\u00CF","iuml":"\u00EF","Jcirc":"\u0134","jcirc":"\u0135","Jcy":"\u0419","jcy":"\u0439","Jfr":"\uD835\uDD0D","jfr":"\uD835\uDD27","jmath":"\u0237","Jopf":"\uD835\uDD41","jopf":"\uD835\uDD5B","Jscr":"\uD835\uDCA5","jscr":"\uD835\uDCBF","Jsercy":"\u0408","jsercy":"\u0458","Jukcy":"\u0404","jukcy":"\u0454","Kappa":"\u039A","kappa":"\u03BA","kappav":"\u03F0","Kcedil":"\u0136","kcedil":"\u0137","Kcy":"\u041A","kcy":"\u043A","Kfr":"\uD835\uDD0E","kfr":"\uD835\uDD28","kgreen":"\u0138","KHcy":"\u0425","khcy":"\u0445","KJcy":"\u040C","kjcy":"\u045C","Kopf":"\uD835\uDD42","kopf":"\uD835\uDD5C","Kscr":"\uD835\uDCA6","kscr":"\uD835\uDCC0","lAarr":"\u21DA","Lacute":"\u0139","lacute":"\u013A","laemptyv":"\u29B4","lagran":"\u2112","Lambda":"\u039B","lambda":"\u03BB","lang":"\u27E8","Lang":"\u27EA","langd":"\u2991","langle":"\u27E8","lap":"\u2A85","Laplacetrf":"\u2112","laquo":"\u00AB","larrb":"\u21E4","larrbfs":"\u291F","larr":"\u2190","Larr":"\u219E","lArr":"\u21D0","larrfs":"\u291D","larrhk":"\u21A9","larrlp":"\u21AB","larrpl":"\u2939","larrsim":"\u2973","larrtl":"\u21A2","latail":"\u2919","lAtail":"\u291B","lat":"\u2AAB","late":"\u2AAD","lates":"\u2AAD\uFE00","lbarr":"\u290C","lBarr":"\u290E","lbbrk":"\u2772","lbrace":"{","lbrack":"[","lbrke":"\u298B","lbrksld":"\u298F","lbrkslu":"\u298D","Lcaron":"\u013D","lcaron":"\u013E","Lcedil":"\u013B","lcedil":"\u013C","lceil":"\u2308","lcub":"{","Lcy":"\u041B","lcy":"\u043B","ldca":"\u2936","ldquo":"\u201C","ldquor":"\u201E","ldrdhar":"\u2967","ldrushar":"\u294B","ldsh":"\u21B2","le":"\u2264","lE":"\u2266","LeftAngleBracket":"\u27E8","LeftArrowBar":"\u21E4","leftarrow":"\u2190","LeftArrow":"\u2190","Leftarrow":"\u21D0","LeftArrowRightArrow":"\u21C6","leftarrowtail":"\u21A2","LeftCeiling":"\u2308","LeftDoubleBracket":"\u27E6","LeftDownTeeVector":"\u2961","LeftDownVectorBar":"\u2959","LeftDownVector":"\u21C3","LeftFloor":"\u230A","leftharpoondown":"\u21BD","leftharpoonup":"\u21BC","leftleftarrows":"\u21C7","leftrightarrow":"\u2194","LeftRightArrow":"\u2194","Leftrightarrow":"\u21D4","leftrightarrows":"\u21C6","leftrightharpoons":"\u21CB","leftrightsquigarrow":"\u21AD","LeftRightVector":"\u294E","LeftTeeArrow":"\u21A4","LeftTee":"\u22A3","LeftTeeVector":"\u295A","leftthreetimes":"\u22CB","LeftTriangleBar":"\u29CF","LeftTriangle":"\u22B2","LeftTriangleEqual":"\u22B4","LeftUpDownVector":"\u2951","LeftUpTeeVector":"\u2960","LeftUpVectorBar":"\u2958","LeftUpVector":"\u21BF","LeftVectorBar":"\u2952","LeftVector":"\u21BC","lEg":"\u2A8B","leg":"\u22DA","leq":"\u2264","leqq":"\u2266","leqslant":"\u2A7D","lescc":"\u2AA8","les":"\u2A7D","lesdot":"\u2A7F","lesdoto":"\u2A81","lesdotor":"\u2A83","lesg":"\u22DA\uFE00","lesges":"\u2A93","lessapprox":"\u2A85","lessdot":"\u22D6","lesseqgtr":"\u22DA","lesseqqgtr":"\u2A8B","LessEqualGreater":"\u22DA","LessFullEqual":"\u2266","LessGreater":"\u2276","lessgtr":"\u2276","LessLess":"\u2AA1","lesssim":"\u2272","LessSlantEqual":"\u2A7D","LessTilde":"\u2272","lfisht":"\u297C","lfloor":"\u230A","Lfr":"\uD835\uDD0F","lfr":"\uD835\uDD29","lg":"\u2276","lgE":"\u2A91","lHar":"\u2962","lhard":"\u21BD","lharu":"\u21BC","lharul":"\u296A","lhblk":"\u2584","LJcy":"\u0409","ljcy":"\u0459","llarr":"\u21C7","ll":"\u226A","Ll":"\u22D8","llcorner":"\u231E","Lleftarrow":"\u21DA","llhard":"\u296B","lltri":"\u25FA","Lmidot":"\u013F","lmidot":"\u0140","lmoustache":"\u23B0","lmoust":"\u23B0","lnap":"\u2A89","lnapprox":"\u2A89","lne":"\u2A87","lnE":"\u2268","lneq":"\u2A87","lneqq":"\u2268","lnsim":"\u22E6","loang":"\u27EC","loarr":"\u21FD","lobrk":"\u27E6","longleftarrow":"\u27F5","LongLeftArrow":"\u27F5","Longleftarrow":"\u27F8","longleftrightarrow":"\u27F7","LongLeftRightArrow":"\u27F7","Longleftrightarrow":"\u27FA","longmapsto":"\u27FC","longrightarrow":"\u27F6","LongRightArrow":"\u27F6","Longrightarrow":"\u27F9","looparrowleft":"\u21AB","looparrowright":"\u21AC","lopar":"\u2985","Lopf":"\uD835\uDD43","lopf":"\uD835\uDD5D","loplus":"\u2A2D","lotimes":"\u2A34","lowast":"\u2217","lowbar":"_","LowerLeftArrow":"\u2199","LowerRightArrow":"\u2198","loz":"\u25CA","lozenge":"\u25CA","lozf":"\u29EB","lpar":"(","lparlt":"\u2993","lrarr":"\u21C6","lrcorner":"\u231F","lrhar":"\u21CB","lrhard":"\u296D","lrm":"\u200E","lrtri":"\u22BF","lsaquo":"\u2039","lscr":"\uD835\uDCC1","Lscr":"\u2112","lsh":"\u21B0","Lsh":"\u21B0","lsim":"\u2272","lsime":"\u2A8D","lsimg":"\u2A8F","lsqb":"[","lsquo":"\u2018","lsquor":"\u201A","Lstrok":"\u0141","lstrok":"\u0142","ltcc":"\u2AA6","ltcir":"\u2A79","lt":"<","LT":"<","Lt":"\u226A","ltdot":"\u22D6","lthree":"\u22CB","ltimes":"\u22C9","ltlarr":"\u2976","ltquest":"\u2A7B","ltri":"\u25C3","ltrie":"\u22B4","ltrif":"\u25C2","ltrPar":"\u2996","lurdshar":"\u294A","luruhar":"\u2966","lvertneqq":"\u2268\uFE00","lvnE":"\u2268\uFE00","macr":"\u00AF","male":"\u2642","malt":"\u2720","maltese":"\u2720","Map":"\u2905","map":"\u21A6","mapsto":"\u21A6","mapstodown":"\u21A7","mapstoleft":"\u21A4","mapstoup":"\u21A5","marker":"\u25AE","mcomma":"\u2A29","Mcy":"\u041C","mcy":"\u043C","mdash":"\u2014","mDDot":"\u223A","measuredangle":"\u2221","MediumSpace":"\u205F","Mellintrf":"\u2133","Mfr":"\uD835\uDD10","mfr":"\uD835\uDD2A","mho":"\u2127","micro":"\u00B5","midast":"*","midcir":"\u2AF0","mid":"\u2223","middot":"\u00B7","minusb":"\u229F","minus":"\u2212","minusd":"\u2238","minusdu":"\u2A2A","MinusPlus":"\u2213","mlcp":"\u2ADB","mldr":"\u2026","mnplus":"\u2213","models":"\u22A7","Mopf":"\uD835\uDD44","mopf":"\uD835\uDD5E","mp":"\u2213","mscr":"\uD835\uDCC2","Mscr":"\u2133","mstpos":"\u223E","Mu":"\u039C","mu":"\u03BC","multimap":"\u22B8","mumap":"\u22B8","nabla":"\u2207","Nacute":"\u0143","nacute":"\u0144","nang":"\u2220\u20D2","nap":"\u2249","napE":"\u2A70\u0338","napid":"\u224B\u0338","napos":"\u0149","napprox":"\u2249","natural":"\u266E","naturals":"\u2115","natur":"\u266E","nbsp":"\u00A0","nbump":"\u224E\u0338","nbumpe":"\u224F\u0338","ncap":"\u2A43","Ncaron":"\u0147","ncaron":"\u0148","Ncedil":"\u0145","ncedil":"\u0146","ncong":"\u2247","ncongdot":"\u2A6D\u0338","ncup":"\u2A42","Ncy":"\u041D","ncy":"\u043D","ndash":"\u2013","nearhk":"\u2924","nearr":"\u2197","neArr":"\u21D7","nearrow":"\u2197","ne":"\u2260","nedot":"\u2250\u0338","NegativeMediumSpace":"\u200B","NegativeThickSpace":"\u200B","NegativeThinSpace":"\u200B","NegativeVeryThinSpace":"\u200B","nequiv":"\u2262","nesear":"\u2928","nesim":"\u2242\u0338","NestedGreaterGreater":"\u226B","NestedLessLess":"\u226A","NewLine":"\n","nexist":"\u2204","nexists":"\u2204","Nfr":"\uD835\uDD11","nfr":"\uD835\uDD2B","ngE":"\u2267\u0338","nge":"\u2271","ngeq":"\u2271","ngeqq":"\u2267\u0338","ngeqslant":"\u2A7E\u0338","nges":"\u2A7E\u0338","nGg":"\u22D9\u0338","ngsim":"\u2275","nGt":"\u226B\u20D2","ngt":"\u226F","ngtr":"\u226F","nGtv":"\u226B\u0338","nharr":"\u21AE","nhArr":"\u21CE","nhpar":"\u2AF2","ni":"\u220B","nis":"\u22FC","nisd":"\u22FA","niv":"\u220B","NJcy":"\u040A","njcy":"\u045A","nlarr":"\u219A","nlArr":"\u21CD","nldr":"\u2025","nlE":"\u2266\u0338","nle":"\u2270","nleftarrow":"\u219A","nLeftarrow":"\u21CD","nleftrightarrow":"\u21AE","nLeftrightarrow":"\u21CE","nleq":"\u2270","nleqq":"\u2266\u0338","nleqslant":"\u2A7D\u0338","nles":"\u2A7D\u0338","nless":"\u226E","nLl":"\u22D8\u0338","nlsim":"\u2274","nLt":"\u226A\u20D2","nlt":"\u226E","nltri":"\u22EA","nltrie":"\u22EC","nLtv":"\u226A\u0338","nmid":"\u2224","NoBreak":"\u2060","NonBreakingSpace":"\u00A0","nopf":"\uD835\uDD5F","Nopf":"\u2115","Not":"\u2AEC","not":"\u00AC","NotCongruent":"\u2262","NotCupCap":"\u226D","NotDoubleVerticalBar":"\u2226","NotElement":"\u2209","NotEqual":"\u2260","NotEqualTilde":"\u2242\u0338","NotExists":"\u2204","NotGreater":"\u226F","NotGreaterEqual":"\u2271","NotGreaterFullEqual":"\u2267\u0338","NotGreaterGreater":"\u226B\u0338","NotGreaterLess":"\u2279","NotGreaterSlantEqual":"\u2A7E\u0338","NotGreaterTilde":"\u2275","NotHumpDownHump":"\u224E\u0338","NotHumpEqual":"\u224F\u0338","notin":"\u2209","notindot":"\u22F5\u0338","notinE":"\u22F9\u0338","notinva":"\u2209","notinvb":"\u22F7","notinvc":"\u22F6","NotLeftTriangleBar":"\u29CF\u0338","NotLeftTriangle":"\u22EA","NotLeftTriangleEqual":"\u22EC","NotLess":"\u226E","NotLessEqual":"\u2270","NotLessGreater":"\u2278","NotLessLess":"\u226A\u0338","NotLessSlantEqual":"\u2A7D\u0338","NotLessTilde":"\u2274","NotNestedGreaterGreater":"\u2AA2\u0338","NotNestedLessLess":"\u2AA1\u0338","notni":"\u220C","notniva":"\u220C","notnivb":"\u22FE","notnivc":"\u22FD","NotPrecedes":"\u2280","NotPrecedesEqual":"\u2AAF\u0338","NotPrecedesSlantEqual":"\u22E0","NotReverseElement":"\u220C","NotRightTriangleBar":"\u29D0\u0338","NotRightTriangle":"\u22EB","NotRightTriangleEqual":"\u22ED","NotSquareSubset":"\u228F\u0338","NotSquareSubsetEqual":"\u22E2","NotSquareSuperset":"\u2290\u0338","NotSquareSupersetEqual":"\u22E3","NotSubset":"\u2282\u20D2","NotSubsetEqual":"\u2288","NotSucceeds":"\u2281","NotSucceedsEqual":"\u2AB0\u0338","NotSucceedsSlantEqual":"\u22E1","NotSucceedsTilde":"\u227F\u0338","NotSuperset":"\u2283\u20D2","NotSupersetEqual":"\u2289","NotTilde":"\u2241","NotTildeEqual":"\u2244","NotTildeFullEqual":"\u2247","NotTildeTilde":"\u2249","NotVerticalBar":"\u2224","nparallel":"\u2226","npar":"\u2226","nparsl":"\u2AFD\u20E5","npart":"\u2202\u0338","npolint":"\u2A14","npr":"\u2280","nprcue":"\u22E0","nprec":"\u2280","npreceq":"\u2AAF\u0338","npre":"\u2AAF\u0338","nrarrc":"\u2933\u0338","nrarr":"\u219B","nrArr":"\u21CF","nrarrw":"\u219D\u0338","nrightarrow":"\u219B","nRightarrow":"\u21CF","nrtri":"\u22EB","nrtrie":"\u22ED","nsc":"\u2281","nsccue":"\u22E1","nsce":"\u2AB0\u0338","Nscr":"\uD835\uDCA9","nscr":"\uD835\uDCC3","nshortmid":"\u2224","nshortparallel":"\u2226","nsim":"\u2241","nsime":"\u2244","nsimeq":"\u2244","nsmid":"\u2224","nspar":"\u2226","nsqsube":"\u22E2","nsqsupe":"\u22E3","nsub":"\u2284","nsubE":"\u2AC5\u0338","nsube":"\u2288","nsubset":"\u2282\u20D2","nsubseteq":"\u2288","nsubseteqq":"\u2AC5\u0338","nsucc":"\u2281","nsucceq":"\u2AB0\u0338","nsup":"\u2285","nsupE":"\u2AC6\u0338","nsupe":"\u2289","nsupset":"\u2283\u20D2","nsupseteq":"\u2289","nsupseteqq":"\u2AC6\u0338","ntgl":"\u2279","Ntilde":"\u00D1","ntilde":"\u00F1","ntlg":"\u2278","ntriangleleft":"\u22EA","ntrianglelefteq":"\u22EC","ntriangleright":"\u22EB","ntrianglerighteq":"\u22ED","Nu":"\u039D","nu":"\u03BD","num":"#","numero":"\u2116","numsp":"\u2007","nvap":"\u224D\u20D2","nvdash":"\u22AC","nvDash":"\u22AD","nVdash":"\u22AE","nVDash":"\u22AF","nvge":"\u2265\u20D2","nvgt":">\u20D2","nvHarr":"\u2904","nvinfin":"\u29DE","nvlArr":"\u2902","nvle":"\u2264\u20D2","nvlt":"<\u20D2","nvltrie":"\u22B4\u20D2","nvrArr":"\u2903","nvrtrie":"\u22B5\u20D2","nvsim":"\u223C\u20D2","nwarhk":"\u2923","nwarr":"\u2196","nwArr":"\u21D6","nwarrow":"\u2196","nwnear":"\u2927","Oacute":"\u00D3","oacute":"\u00F3","oast":"\u229B","Ocirc":"\u00D4","ocirc":"\u00F4","ocir":"\u229A","Ocy":"\u041E","ocy":"\u043E","odash":"\u229D","Odblac":"\u0150","odblac":"\u0151","odiv":"\u2A38","odot":"\u2299","odsold":"\u29BC","OElig":"\u0152","oelig":"\u0153","ofcir":"\u29BF","Ofr":"\uD835\uDD12","ofr":"\uD835\uDD2C","ogon":"\u02DB","Ograve":"\u00D2","ograve":"\u00F2","ogt":"\u29C1","ohbar":"\u29B5","ohm":"\u03A9","oint":"\u222E","olarr":"\u21BA","olcir":"\u29BE","olcross":"\u29BB","oline":"\u203E","olt":"\u29C0","Omacr":"\u014C","omacr":"\u014D","Omega":"\u03A9","omega":"\u03C9","Omicron":"\u039F","omicron":"\u03BF","omid":"\u29B6","ominus":"\u2296","Oopf":"\uD835\uDD46","oopf":"\uD835\uDD60","opar":"\u29B7","OpenCurlyDoubleQuote":"\u201C","OpenCurlyQuote":"\u2018","operp":"\u29B9","oplus":"\u2295","orarr":"\u21BB","Or":"\u2A54","or":"\u2228","ord":"\u2A5D","order":"\u2134","orderof":"\u2134","ordf":"\u00AA","ordm":"\u00BA","origof":"\u22B6","oror":"\u2A56","orslope":"\u2A57","orv":"\u2A5B","oS":"\u24C8","Oscr":"\uD835\uDCAA","oscr":"\u2134","Oslash":"\u00D8","oslash":"\u00F8","osol":"\u2298","Otilde":"\u00D5","otilde":"\u00F5","otimesas":"\u2A36","Otimes":"\u2A37","otimes":"\u2297","Ouml":"\u00D6","ouml":"\u00F6","ovbar":"\u233D","OverBar":"\u203E","OverBrace":"\u23DE","OverBracket":"\u23B4","OverParenthesis":"\u23DC","para":"\u00B6","parallel":"\u2225","par":"\u2225","parsim":"\u2AF3","parsl":"\u2AFD","part":"\u2202","PartialD":"\u2202","Pcy":"\u041F","pcy":"\u043F","percnt":"%","period":".","permil":"\u2030","perp":"\u22A5","pertenk":"\u2031","Pfr":"\uD835\uDD13","pfr":"\uD835\uDD2D","Phi":"\u03A6","phi":"\u03C6","phiv":"\u03D5","phmmat":"\u2133","phone":"\u260E","Pi":"\u03A0","pi":"\u03C0","pitchfork":"\u22D4","piv":"\u03D6","planck":"\u210F","planckh":"\u210E","plankv":"\u210F","plusacir":"\u2A23","plusb":"\u229E","pluscir":"\u2A22","plus":"+","plusdo":"\u2214","plusdu":"\u2A25","pluse":"\u2A72","PlusMinus":"\u00B1","plusmn":"\u00B1","plussim":"\u2A26","plustwo":"\u2A27","pm":"\u00B1","Poincareplane":"\u210C","pointint":"\u2A15","popf":"\uD835\uDD61","Popf":"\u2119","pound":"\u00A3","prap":"\u2AB7","Pr":"\u2ABB","pr":"\u227A","prcue":"\u227C","precapprox":"\u2AB7","prec":"\u227A","preccurlyeq":"\u227C","Precedes":"\u227A","PrecedesEqual":"\u2AAF","PrecedesSlantEqual":"\u227C","PrecedesTilde":"\u227E","preceq":"\u2AAF","precnapprox":"\u2AB9","precneqq":"\u2AB5","precnsim":"\u22E8","pre":"\u2AAF","prE":"\u2AB3","precsim":"\u227E","prime":"\u2032","Prime":"\u2033","primes":"\u2119","prnap":"\u2AB9","prnE":"\u2AB5","prnsim":"\u22E8","prod":"\u220F","Product":"\u220F","profalar":"\u232E","profline":"\u2312","profsurf":"\u2313","prop":"\u221D","Proportional":"\u221D","Proportion":"\u2237","propto":"\u221D","prsim":"\u227E","prurel":"\u22B0","Pscr":"\uD835\uDCAB","pscr":"\uD835\uDCC5","Psi":"\u03A8","psi":"\u03C8","puncsp":"\u2008","Qfr":"\uD835\uDD14","qfr":"\uD835\uDD2E","qint":"\u2A0C","qopf":"\uD835\uDD62","Qopf":"\u211A","qprime":"\u2057","Qscr":"\uD835\uDCAC","qscr":"\uD835\uDCC6","quaternions":"\u210D","quatint":"\u2A16","quest":"?","questeq":"\u225F","quot":"\"","QUOT":"\"","rAarr":"\u21DB","race":"\u223D\u0331","Racute":"\u0154","racute":"\u0155","radic":"\u221A","raemptyv":"\u29B3","rang":"\u27E9","Rang":"\u27EB","rangd":"\u2992","range":"\u29A5","rangle":"\u27E9","raquo":"\u00BB","rarrap":"\u2975","rarrb":"\u21E5","rarrbfs":"\u2920","rarrc":"\u2933","rarr":"\u2192","Rarr":"\u21A0","rArr":"\u21D2","rarrfs":"\u291E","rarrhk":"\u21AA","rarrlp":"\u21AC","rarrpl":"\u2945","rarrsim":"\u2974","Rarrtl":"\u2916","rarrtl":"\u21A3","rarrw":"\u219D","ratail":"\u291A","rAtail":"\u291C","ratio":"\u2236","rationals":"\u211A","rbarr":"\u290D","rBarr":"\u290F","RBarr":"\u2910","rbbrk":"\u2773","rbrace":"}","rbrack":"]","rbrke":"\u298C","rbrksld":"\u298E","rbrkslu":"\u2990","Rcaron":"\u0158","rcaron":"\u0159","Rcedil":"\u0156","rcedil":"\u0157","rceil":"\u2309","rcub":"}","Rcy":"\u0420","rcy":"\u0440","rdca":"\u2937","rdldhar":"\u2969","rdquo":"\u201D","rdquor":"\u201D","rdsh":"\u21B3","real":"\u211C","realine":"\u211B","realpart":"\u211C","reals":"\u211D","Re":"\u211C","rect":"\u25AD","reg":"\u00AE","REG":"\u00AE","ReverseElement":"\u220B","ReverseEquilibrium":"\u21CB","ReverseUpEquilibrium":"\u296F","rfisht":"\u297D","rfloor":"\u230B","rfr":"\uD835\uDD2F","Rfr":"\u211C","rHar":"\u2964","rhard":"\u21C1","rharu":"\u21C0","rharul":"\u296C","Rho":"\u03A1","rho":"\u03C1","rhov":"\u03F1","RightAngleBracket":"\u27E9","RightArrowBar":"\u21E5","rightarrow":"\u2192","RightArrow":"\u2192","Rightarrow":"\u21D2","RightArrowLeftArrow":"\u21C4","rightarrowtail":"\u21A3","RightCeiling":"\u2309","RightDoubleBracket":"\u27E7","RightDownTeeVector":"\u295D","RightDownVectorBar":"\u2955","RightDownVector":"\u21C2","RightFloor":"\u230B","rightharpoondown":"\u21C1","rightharpoonup":"\u21C0","rightleftarrows":"\u21C4","rightleftharpoons":"\u21CC","rightrightarrows":"\u21C9","rightsquigarrow":"\u219D","RightTeeArrow":"\u21A6","RightTee":"\u22A2","RightTeeVector":"\u295B","rightthreetimes":"\u22CC","RightTriangleBar":"\u29D0","RightTriangle":"\u22B3","RightTriangleEqual":"\u22B5","RightUpDownVector":"\u294F","RightUpTeeVector":"\u295C","RightUpVectorBar":"\u2954","RightUpVector":"\u21BE","RightVectorBar":"\u2953","RightVector":"\u21C0","ring":"\u02DA","risingdotseq":"\u2253","rlarr":"\u21C4","rlhar":"\u21CC","rlm":"\u200F","rmoustache":"\u23B1","rmoust":"\u23B1","rnmid":"\u2AEE","roang":"\u27ED","roarr":"\u21FE","robrk":"\u27E7","ropar":"\u2986","ropf":"\uD835\uDD63","Ropf":"\u211D","roplus":"\u2A2E","rotimes":"\u2A35","RoundImplies":"\u2970","rpar":")","rpargt":"\u2994","rppolint":"\u2A12","rrarr":"\u21C9","Rrightarrow":"\u21DB","rsaquo":"\u203A","rscr":"\uD835\uDCC7","Rscr":"\u211B","rsh":"\u21B1","Rsh":"\u21B1","rsqb":"]","rsquo":"\u2019","rsquor":"\u2019","rthree":"\u22CC","rtimes":"\u22CA","rtri":"\u25B9","rtrie":"\u22B5","rtrif":"\u25B8","rtriltri":"\u29CE","RuleDelayed":"\u29F4","ruluhar":"\u2968","rx":"\u211E","Sacute":"\u015A","sacute":"\u015B","sbquo":"\u201A","scap":"\u2AB8","Scaron":"\u0160","scaron":"\u0161","Sc":"\u2ABC","sc":"\u227B","sccue":"\u227D","sce":"\u2AB0","scE":"\u2AB4","Scedil":"\u015E","scedil":"\u015F","Scirc":"\u015C","scirc":"\u015D","scnap":"\u2ABA","scnE":"\u2AB6","scnsim":"\u22E9","scpolint":"\u2A13","scsim":"\u227F","Scy":"\u0421","scy":"\u0441","sdotb":"\u22A1","sdot":"\u22C5","sdote":"\u2A66","searhk":"\u2925","searr":"\u2198","seArr":"\u21D8","searrow":"\u2198","sect":"\u00A7","semi":";","seswar":"\u2929","setminus":"\u2216","setmn":"\u2216","sext":"\u2736","Sfr":"\uD835\uDD16","sfr":"\uD835\uDD30","sfrown":"\u2322","sharp":"\u266F","SHCHcy":"\u0429","shchcy":"\u0449","SHcy":"\u0428","shcy":"\u0448","ShortDownArrow":"\u2193","ShortLeftArrow":"\u2190","shortmid":"\u2223","shortparallel":"\u2225","ShortRightArrow":"\u2192","ShortUpArrow":"\u2191","shy":"\u00AD","Sigma":"\u03A3","sigma":"\u03C3","sigmaf":"\u03C2","sigmav":"\u03C2","sim":"\u223C","simdot":"\u2A6A","sime":"\u2243","simeq":"\u2243","simg":"\u2A9E","simgE":"\u2AA0","siml":"\u2A9D","simlE":"\u2A9F","simne":"\u2246","simplus":"\u2A24","simrarr":"\u2972","slarr":"\u2190","SmallCircle":"\u2218","smallsetminus":"\u2216","smashp":"\u2A33","smeparsl":"\u29E4","smid":"\u2223","smile":"\u2323","smt":"\u2AAA","smte":"\u2AAC","smtes":"\u2AAC\uFE00","SOFTcy":"\u042C","softcy":"\u044C","solbar":"\u233F","solb":"\u29C4","sol":"/","Sopf":"\uD835\uDD4A","sopf":"\uD835\uDD64","spades":"\u2660","spadesuit":"\u2660","spar":"\u2225","sqcap":"\u2293","sqcaps":"\u2293\uFE00","sqcup":"\u2294","sqcups":"\u2294\uFE00","Sqrt":"\u221A","sqsub":"\u228F","sqsube":"\u2291","sqsubset":"\u228F","sqsubseteq":"\u2291","sqsup":"\u2290","sqsupe":"\u2292","sqsupset":"\u2290","sqsupseteq":"\u2292","square":"\u25A1","Square":"\u25A1","SquareIntersection":"\u2293","SquareSubset":"\u228F","SquareSubsetEqual":"\u2291","SquareSuperset":"\u2290","SquareSupersetEqual":"\u2292","SquareUnion":"\u2294","squarf":"\u25AA","squ":"\u25A1","squf":"\u25AA","srarr":"\u2192","Sscr":"\uD835\uDCAE","sscr":"\uD835\uDCC8","ssetmn":"\u2216","ssmile":"\u2323","sstarf":"\u22C6","Star":"\u22C6","star":"\u2606","starf":"\u2605","straightepsilon":"\u03F5","straightphi":"\u03D5","strns":"\u00AF","sub":"\u2282","Sub":"\u22D0","subdot":"\u2ABD","subE":"\u2AC5","sube":"\u2286","subedot":"\u2AC3","submult":"\u2AC1","subnE":"\u2ACB","subne":"\u228A","subplus":"\u2ABF","subrarr":"\u2979","subset":"\u2282","Subset":"\u22D0","subseteq":"\u2286","subseteqq":"\u2AC5","SubsetEqual":"\u2286","subsetneq":"\u228A","subsetneqq":"\u2ACB","subsim":"\u2AC7","subsub":"\u2AD5","subsup":"\u2AD3","succapprox":"\u2AB8","succ":"\u227B","succcurlyeq":"\u227D","Succeeds":"\u227B","SucceedsEqual":"\u2AB0","SucceedsSlantEqual":"\u227D","SucceedsTilde":"\u227F","succeq":"\u2AB0","succnapprox":"\u2ABA","succneqq":"\u2AB6","succnsim":"\u22E9","succsim":"\u227F","SuchThat":"\u220B","sum":"\u2211","Sum":"\u2211","sung":"\u266A","sup1":"\u00B9","sup2":"\u00B2","sup3":"\u00B3","sup":"\u2283","Sup":"\u22D1","supdot":"\u2ABE","supdsub":"\u2AD8","supE":"\u2AC6","supe":"\u2287","supedot":"\u2AC4","Superset":"\u2283","SupersetEqual":"\u2287","suphsol":"\u27C9","suphsub":"\u2AD7","suplarr":"\u297B","supmult":"\u2AC2","supnE":"\u2ACC","supne":"\u228B","supplus":"\u2AC0","supset":"\u2283","Supset":"\u22D1","supseteq":"\u2287","supseteqq":"\u2AC6","supsetneq":"\u228B","supsetneqq":"\u2ACC","supsim":"\u2AC8","supsub":"\u2AD4","supsup":"\u2AD6","swarhk":"\u2926","swarr":"\u2199","swArr":"\u21D9","swarrow":"\u2199","swnwar":"\u292A","szlig":"\u00DF","Tab":"\t","target":"\u2316","Tau":"\u03A4","tau":"\u03C4","tbrk":"\u23B4","Tcaron":"\u0164","tcaron":"\u0165","Tcedil":"\u0162","tcedil":"\u0163","Tcy":"\u0422","tcy":"\u0442","tdot":"\u20DB","telrec":"\u2315","Tfr":"\uD835\uDD17","tfr":"\uD835\uDD31","there4":"\u2234","therefore":"\u2234","Therefore":"\u2234","Theta":"\u0398","theta":"\u03B8","thetasym":"\u03D1","thetav":"\u03D1","thickapprox":"\u2248","thicksim":"\u223C","ThickSpace":"\u205F\u200A","ThinSpace":"\u2009","thinsp":"\u2009","thkap":"\u2248","thksim":"\u223C","THORN":"\u00DE","thorn":"\u00FE","tilde":"\u02DC","Tilde":"\u223C","TildeEqual":"\u2243","TildeFullEqual":"\u2245","TildeTilde":"\u2248","timesbar":"\u2A31","timesb":"\u22A0","times":"\u00D7","timesd":"\u2A30","tint":"\u222D","toea":"\u2928","topbot":"\u2336","topcir":"\u2AF1","top":"\u22A4","Topf":"\uD835\uDD4B","topf":"\uD835\uDD65","topfork":"\u2ADA","tosa":"\u2929","tprime":"\u2034","trade":"\u2122","TRADE":"\u2122","triangle":"\u25B5","triangledown":"\u25BF","triangleleft":"\u25C3","trianglelefteq":"\u22B4","triangleq":"\u225C","triangleright":"\u25B9","trianglerighteq":"\u22B5","tridot":"\u25EC","trie":"\u225C","triminus":"\u2A3A","TripleDot":"\u20DB","triplus":"\u2A39","trisb":"\u29CD","tritime":"\u2A3B","trpezium":"\u23E2","Tscr":"\uD835\uDCAF","tscr":"\uD835\uDCC9","TScy":"\u0426","tscy":"\u0446","TSHcy":"\u040B","tshcy":"\u045B","Tstrok":"\u0166","tstrok":"\u0167","twixt":"\u226C","twoheadleftarrow":"\u219E","twoheadrightarrow":"\u21A0","Uacute":"\u00DA","uacute":"\u00FA","uarr":"\u2191","Uarr":"\u219F","uArr":"\u21D1","Uarrocir":"\u2949","Ubrcy":"\u040E","ubrcy":"\u045E","Ubreve":"\u016C","ubreve":"\u016D","Ucirc":"\u00DB","ucirc":"\u00FB","Ucy":"\u0423","ucy":"\u0443","udarr":"\u21C5","Udblac":"\u0170","udblac":"\u0171","udhar":"\u296E","ufisht":"\u297E","Ufr":"\uD835\uDD18","ufr":"\uD835\uDD32","Ugrave":"\u00D9","ugrave":"\u00F9","uHar":"\u2963","uharl":"\u21BF","uharr":"\u21BE","uhblk":"\u2580","ulcorn":"\u231C","ulcorner":"\u231C","ulcrop":"\u230F","ultri":"\u25F8","Umacr":"\u016A","umacr":"\u016B","uml":"\u00A8","UnderBar":"_","UnderBrace":"\u23DF","UnderBracket":"\u23B5","UnderParenthesis":"\u23DD","Union":"\u22C3","UnionPlus":"\u228E","Uogon":"\u0172","uogon":"\u0173","Uopf":"\uD835\uDD4C","uopf":"\uD835\uDD66","UpArrowBar":"\u2912","uparrow":"\u2191","UpArrow":"\u2191","Uparrow":"\u21D1","UpArrowDownArrow":"\u21C5","updownarrow":"\u2195","UpDownArrow":"\u2195","Updownarrow":"\u21D5","UpEquilibrium":"\u296E","upharpoonleft":"\u21BF","upharpoonright":"\u21BE","uplus":"\u228E","UpperLeftArrow":"\u2196","UpperRightArrow":"\u2197","upsi":"\u03C5","Upsi":"\u03D2","upsih":"\u03D2","Upsilon":"\u03A5","upsilon":"\u03C5","UpTeeArrow":"\u21A5","UpTee":"\u22A5","upuparrows":"\u21C8","urcorn":"\u231D","urcorner":"\u231D","urcrop":"\u230E","Uring":"\u016E","uring":"\u016F","urtri":"\u25F9","Uscr":"\uD835\uDCB0","uscr":"\uD835\uDCCA","utdot":"\u22F0","Utilde":"\u0168","utilde":"\u0169","utri":"\u25B5","utrif":"\u25B4","uuarr":"\u21C8","Uuml":"\u00DC","uuml":"\u00FC","uwangle":"\u29A7","vangrt":"\u299C","varepsilon":"\u03F5","varkappa":"\u03F0","varnothing":"\u2205","varphi":"\u03D5","varpi":"\u03D6","varpropto":"\u221D","varr":"\u2195","vArr":"\u21D5","varrho":"\u03F1","varsigma":"\u03C2","varsubsetneq":"\u228A\uFE00","varsubsetneqq":"\u2ACB\uFE00","varsupsetneq":"\u228B\uFE00","varsupsetneqq":"\u2ACC\uFE00","vartheta":"\u03D1","vartriangleleft":"\u22B2","vartriangleright":"\u22B3","vBar":"\u2AE8","Vbar":"\u2AEB","vBarv":"\u2AE9","Vcy":"\u0412","vcy":"\u0432","vdash":"\u22A2","vDash":"\u22A8","Vdash":"\u22A9","VDash":"\u22AB","Vdashl":"\u2AE6","veebar":"\u22BB","vee":"\u2228","Vee":"\u22C1","veeeq":"\u225A","vellip":"\u22EE","verbar":"|","Verbar":"\u2016","vert":"|","Vert":"\u2016","VerticalBar":"\u2223","VerticalLine":"|","VerticalSeparator":"\u2758","VerticalTilde":"\u2240","VeryThinSpace":"\u200A","Vfr":"\uD835\uDD19","vfr":"\uD835\uDD33","vltri":"\u22B2","vnsub":"\u2282\u20D2","vnsup":"\u2283\u20D2","Vopf":"\uD835\uDD4D","vopf":"\uD835\uDD67","vprop":"\u221D","vrtri":"\u22B3","Vscr":"\uD835\uDCB1","vscr":"\uD835\uDCCB","vsubnE":"\u2ACB\uFE00","vsubne":"\u228A\uFE00","vsupnE":"\u2ACC\uFE00","vsupne":"\u228B\uFE00","Vvdash":"\u22AA","vzigzag":"\u299A","Wcirc":"\u0174","wcirc":"\u0175","wedbar":"\u2A5F","wedge":"\u2227","Wedge":"\u22C0","wedgeq":"\u2259","weierp":"\u2118","Wfr":"\uD835\uDD1A","wfr":"\uD835\uDD34","Wopf":"\uD835\uDD4E","wopf":"\uD835\uDD68","wp":"\u2118","wr":"\u2240","wreath":"\u2240","Wscr":"\uD835\uDCB2","wscr":"\uD835\uDCCC","xcap":"\u22C2","xcirc":"\u25EF","xcup":"\u22C3","xdtri":"\u25BD","Xfr":"\uD835\uDD1B","xfr":"\uD835\uDD35","xharr":"\u27F7","xhArr":"\u27FA","Xi":"\u039E","xi":"\u03BE","xlarr":"\u27F5","xlArr":"\u27F8","xmap":"\u27FC","xnis":"\u22FB","xodot":"\u2A00","Xopf":"\uD835\uDD4F","xopf":"\uD835\uDD69","xoplus":"\u2A01","xotime":"\u2A02","xrarr":"\u27F6","xrArr":"\u27F9","Xscr":"\uD835\uDCB3","xscr":"\uD835\uDCCD","xsqcup":"\u2A06","xuplus":"\u2A04","xutri":"\u25B3","xvee":"\u22C1","xwedge":"\u22C0","Yacute":"\u00DD","yacute":"\u00FD","YAcy":"\u042F","yacy":"\u044F","Ycirc":"\u0176","ycirc":"\u0177","Ycy":"\u042B","ycy":"\u044B","yen":"\u00A5","Yfr":"\uD835\uDD1C","yfr":"\uD835\uDD36","YIcy":"\u0407","yicy":"\u0457","Yopf":"\uD835\uDD50","yopf":"\uD835\uDD6A","Yscr":"\uD835\uDCB4","yscr":"\uD835\uDCCE","YUcy":"\u042E","yucy":"\u044E","yuml":"\u00FF","Yuml":"\u0178","Zacute":"\u0179","zacute":"\u017A","Zcaron":"\u017D","zcaron":"\u017E","Zcy":"\u0417","zcy":"\u0437","Zdot":"\u017B","zdot":"\u017C","zeetrf":"\u2128","ZeroWidthSpace":"\u200B","Zeta":"\u0396","zeta":"\u03B6","zfr":"\uD835\uDD37","Zfr":"\u2128","ZHcy":"\u0416","zhcy":"\u0436","zigrarr":"\u21DD","zopf":"\uD835\uDD6B","Zopf":"\u2124","Zscr":"\uD835\uDCB5","zscr":"\uD835\uDCCF","zwj":"\u200D","zwnj":"\u200C"}
},{}],34:[function(require,module,exports){
module.exports={"Aacute":"\u00C1","aacute":"\u00E1","Acirc":"\u00C2","acirc":"\u00E2","acute":"\u00B4","AElig":"\u00C6","aelig":"\u00E6","Agrave":"\u00C0","agrave":"\u00E0","amp":"&","AMP":"&","Aring":"\u00C5","aring":"\u00E5","Atilde":"\u00C3","atilde":"\u00E3","Auml":"\u00C4","auml":"\u00E4","brvbar":"\u00A6","Ccedil":"\u00C7","ccedil":"\u00E7","cedil":"\u00B8","cent":"\u00A2","copy":"\u00A9","COPY":"\u00A9","curren":"\u00A4","deg":"\u00B0","divide":"\u00F7","Eacute":"\u00C9","eacute":"\u00E9","Ecirc":"\u00CA","ecirc":"\u00EA","Egrave":"\u00C8","egrave":"\u00E8","ETH":"\u00D0","eth":"\u00F0","Euml":"\u00CB","euml":"\u00EB","frac12":"\u00BD","frac14":"\u00BC","frac34":"\u00BE","gt":">","GT":">","Iacute":"\u00CD","iacute":"\u00ED","Icirc":"\u00CE","icirc":"\u00EE","iexcl":"\u00A1","Igrave":"\u00CC","igrave":"\u00EC","iquest":"\u00BF","Iuml":"\u00CF","iuml":"\u00EF","laquo":"\u00AB","lt":"<","LT":"<","macr":"\u00AF","micro":"\u00B5","middot":"\u00B7","nbsp":"\u00A0","not":"\u00AC","Ntilde":"\u00D1","ntilde":"\u00F1","Oacute":"\u00D3","oacute":"\u00F3","Ocirc":"\u00D4","ocirc":"\u00F4","Ograve":"\u00D2","ograve":"\u00F2","ordf":"\u00AA","ordm":"\u00BA","Oslash":"\u00D8","oslash":"\u00F8","Otilde":"\u00D5","otilde":"\u00F5","Ouml":"\u00D6","ouml":"\u00F6","para":"\u00B6","plusmn":"\u00B1","pound":"\u00A3","quot":"\"","QUOT":"\"","raquo":"\u00BB","reg":"\u00AE","REG":"\u00AE","sect":"\u00A7","shy":"\u00AD","sup1":"\u00B9","sup2":"\u00B2","sup3":"\u00B3","szlig":"\u00DF","THORN":"\u00DE","thorn":"\u00FE","times":"\u00D7","Uacute":"\u00DA","uacute":"\u00FA","Ucirc":"\u00DB","ucirc":"\u00FB","Ugrave":"\u00D9","ugrave":"\u00F9","uml":"\u00A8","Uuml":"\u00DC","uuml":"\u00FC","Yacute":"\u00DD","yacute":"\u00FD","yen":"\u00A5","yuml":"\u00FF"}
},{}],35:[function(require,module,exports){
module.exports={"amp":"&","apos":"'","gt":">","lt":"<","quot":"\""}

},{}],36:[function(require,module,exports){
var base       = require('./lib/base');
var SafeString = require('./lib/safe-string');
var Exception  = require('./lib/exception');
var Utils      = require('./lib/utils');
var runtime    = require('./lib/runtime');

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

},{"./lib/base":2,"./lib/exception":10,"./lib/runtime":12,"./lib/safe-string":13,"./lib/utils":15}]},{},[1])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvZ3J1bnQtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvZG9tYmFycy5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi9iYXNlLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbGliL2NvbXBpbGVyL2FzdC5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi9jb21waWxlci9hdHRyaWJ1dGUtY29tcGlsZXIuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvY29tcGlsZXIvYmFzZS5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi9jb21waWxlci9jb21tb24tY29tcGlsZXIuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvY29tcGlsZXIvY29tcGlsZXIuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvY29tcGlsZXIvamF2YXNjcmlwdC1jb21waWxlci5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi9jb21waWxlci9wYXJzZXIuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvZXhjZXB0aW9uLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbGliL3JhZi5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi9ydW50aW1lLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbGliL3NhZmUtc3RyaW5nLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbGliL3RyYWNrLW5vZGUuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvdXRpbHMuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvZ3J1bnQtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9pbmhlcml0cy9pbmhlcml0c19icm93c2VyLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2dydW50LWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2luc2VydC1tb2R1bGUtZ2xvYmFscy9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2dydW50LWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3V0aWwvc3VwcG9ydC9pc0J1ZmZlckJyb3dzZXIuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvZ3J1bnQtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvdXRpbC91dGlsLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9iYXNlLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9jb21waWxlci9hc3QuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL2NvbXBpbGVyL2NvbXBpbGVyLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9jb21waWxlci9qYXZhc2NyaXB0LWNvbXBpbGVyLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9jb21waWxlci9wYXJzZXIuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL2V4Y2VwdGlvbi5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvcnVudGltZS5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvc2FmZS1zdHJpbmcuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL3V0aWxzLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2h0bWxwYXJzZXIyL2xpYi9QYXJzZXIuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvaHRtbHBhcnNlcjIvbGliL1Rva2VuaXplci5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9odG1scGFyc2VyMi9saWIvZW50aXRpZXMvZGVjb2RlLmpzb24iLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvaHRtbHBhcnNlcjIvbGliL2VudGl0aWVzL2VudGl0aWVzLmpzb24iLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvaHRtbHBhcnNlcjIvbGliL2VudGl0aWVzL2xlZ2FjeS5qc29uIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2h0bWxwYXJzZXIyL2xpYi9lbnRpdGllcy94bWwuanNvbiIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL3J1bnRpbWUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMU1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMU1BO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2a0JBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNVNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMWtCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNzZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6ZUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNTJCQTtBQUNBOztBQ0RBOztBQ0FBOztBQ0FBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIERPTUJhcnMgICAgICAgICAgICA9IHJlcXVpcmUoJy4vcnVudGltZScpO1xudmFyIEFTVCAgICAgICAgICAgICAgICA9IHJlcXVpcmUoJy4vbGliL2NvbXBpbGVyL2FzdCcpO1xudmFyIGJhc2UgICAgICAgICAgICAgICA9IHJlcXVpcmUoJy4vbGliL2NvbXBpbGVyL2Jhc2UnKTtcbnZhciBDb21waWxlciAgICAgICAgICAgPSByZXF1aXJlKCcuL2xpYi9jb21waWxlci9jb21waWxlcicpO1xudmFyIEphdmFTY3JpcHRDb21waWxlciA9IHJlcXVpcmUoJy4vbGliL2NvbXBpbGVyL2phdmFzY3JpcHQtY29tcGlsZXInKTtcblxubW9kdWxlLmV4cG9ydHMgPSAoZnVuY3Rpb24gY3JlYXRlICgpIHtcbiAgdmFyIGRiID0gRE9NQmFycy5jcmVhdGUoKTtcblxuICBkYi5jb21waWxlID0gZnVuY3Rpb24gKGlucHV0LCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIENvbXBpbGVyLmNvbXBpbGUoaW5wdXQsIG9wdGlvbnMsIGRiKTtcbiAgfTtcblxuICBkYi5wcmVjb21waWxlID0gZnVuY3Rpb24gKGlucHV0LCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIENvbXBpbGVyLnByZWNvbXBpbGUoaW5wdXQsIG9wdGlvbnMsIGRiKTtcbiAgfTtcblxuICBkYi5jcmVhdGUgICAgICAgICAgICAgPSBjcmVhdGU7XG4gIGRiLkFTVCAgICAgICAgICAgICAgICA9IEFTVDtcbiAgZGIuQ29tcGlsZXIgICAgICAgICAgID0gQ29tcGlsZXIuQ29tcGlsZXI7XG4gIGRiLkphdmFTY3JpcHRDb21waWxlciA9IEphdmFTY3JpcHRDb21waWxlcjtcbiAgZGIucGFyc2UgICAgICAgICAgICAgID0gYmFzZS5wYXJzZTtcbiAgZGIuUGFyc2VyICAgICAgICAgICAgID0gYmFzZS5wYXJzZXI7XG5cbiAgcmV0dXJuIGRiO1xufSkoKTtcbiIsInZhciBoYnNCYXNlICAgICAgICAgICAgICAgPSByZXF1aXJlKCdoYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvYmFzZScpO1xudmFyIFV0aWxzICAgICAgICAgICAgICAgICA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbnZhciBIYW5kbGViYXJzRW52aXJvbm1lbnQgPSBoYnNCYXNlLkhhbmRsZWJhcnNFbnZpcm9ubWVudDtcblxuLyoqXG4gKiBFeHRlbmQgSGFuZGxlYmFycyBiYXNlIG9iamVjdCB3aXRoIGN1c3RvbSBmdW5jdGlvbmFsaXR5LlxuICpcbiAqIEB0eXBlIHtPYmplY3R9XG4gKi9cbnZhciBiYXNlID0gbW9kdWxlLmV4cG9ydHMgPSBVdGlscy5jcmVhdGUoaGJzQmFzZSk7XG5cbi8qKlxuICogV3JhcCBvbGQtc3R5bGUgSGFuZGxlYmFycyBoZWxwZXJzIHdpdGggdGhlIHVwZGF0ZWQgb2JqZWN0IHN5bnRheCByZXR1cm4uXG4gKlxuICogQHBhcmFtICB7RnVuY3Rpb259IGhlbHBlclxuICogQHJldHVybiB7RnVuY3Rpb259XG4gKi9cbnZhciB3cmFwT2xkSGVscGVyID0gZnVuY3Rpb24gKGhlbHBlcikge1xuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHZhciByZXN1bHQgPSBoZWxwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAgIC8vIE5lZWQgYSBzcGVjaWFsIGhhbmRsZXIgZm9yIHRoZSBgd2l0aGAgaGVscGVyIHdoaWNoIHdvbid0IGFsd2F5cyBleGVjdXRlLlxuICAgIHJldHVybiByZXN1bHQgPT0gbnVsbCA/IHJlc3VsdCA6IHJlc3VsdC52YWx1ZTtcbiAgfTtcbn07XG5cbi8qKlxuICogUmVnaXN0ZXIgRE9NQmFycyBoZWxwZXJzIG9uIHRoZSBwYXNzZWQgaW4gRE9NQmFycyBpbnN0YW5jZS5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gaW5zdGFuY2VcbiAqL1xudmFyIHJlZ2lzdGVyRGVmYXVsdEhlbHBlcnMgPSBmdW5jdGlvbiAoaW5zdGFuY2UpIHtcbiAgLyoqXG4gICAqIFRoZSBoYW5kbGViYXJzIGBlYWNoYCBoZWxwZXIgaXMgaW5jb21wYXRpYmFibGUgd2l0aCBET01CYXJzLCBzaW5jZSBpdFxuICAgKiBhc3N1bWVzIHN0cmluZyBjb25jYXRpbmF0aW9uIChhcyBvcHBvc2VkIHRvIGRvY3VtZW50IGZyYWdtZW50cykuXG4gICAqXG4gICAqIEBwYXJhbSAge09iamVjdH0gY29udGV4dFxuICAgKiBAcGFyYW0gIHtPYmplY3R9IG9wdGlvbnNcbiAgICogQHJldHVybiB7Tm9kZX1cbiAgICovXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdlYWNoJywgZnVuY3Rpb24gKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICB2YXIgZm4gICAgICAgPSBvcHRpb25zLmZuO1xuICAgIHZhciBpbnZlcnNlICA9IG9wdGlvbnMuaW52ZXJzZTtcbiAgICB2YXIgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgdmFyIGkgICAgICAgID0gMDtcbiAgICB2YXIgZGF0YTtcblxuICAgIGlmICh0eXBlb2YgY29udGV4dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5kYXRhKSB7XG4gICAgICBkYXRhID0gVXRpbHMuY3JlYXRlKG9wdGlvbnMuZGF0YSk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBjb250ZXh0ID09PSAnb2JqZWN0Jykge1xuICAgICAgdmFyIGxlbiA9IGNvbnRleHQubGVuZ3RoO1xuXG4gICAgICBpZiAobGVuID09PSArbGVuKSB7XG4gICAgICAgIGZvciAoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICBkYXRhLmluZGV4ID0gaTtcbiAgICAgICAgICBkYXRhLmZpcnN0ID0gKGkgPT09IDApO1xuICAgICAgICAgIGRhdGEubGFzdCAgPSAoaSA9PT0gbGVuIC0gMSk7XG5cbiAgICAgICAgICBmcmFnbWVudC5hcHBlbmRDaGlsZChmbihjb250ZXh0W2ldLCB7IGRhdGE6IGRhdGEgfSkudmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gY29udGV4dCkge1xuICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoY29udGV4dCwga2V5KSkge1xuICAgICAgICAgICAgaSArPSAxO1xuXG4gICAgICAgICAgICBkYXRhLmtleSAgID0ga2V5O1xuICAgICAgICAgICAgZGF0YS5pbmRleCA9IGk7XG4gICAgICAgICAgICBkYXRhLmZpcnN0ID0gKGkgPT09IDApO1xuXG4gICAgICAgICAgICBmcmFnbWVudC5hcHBlbmRDaGlsZChmbihjb250ZXh0W2tleV0sIHsgZGF0YTogZGF0YSB9KS52YWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGkgPT09IDApIHtcbiAgICAgIHJldHVybiBpbnZlcnNlKHRoaXMpLnZhbHVlO1xuICAgIH1cblxuICAgIHJldHVybiBmcmFnbWVudDtcbiAgfSk7XG5cbiAgLy8gUmVnaXN0ZXIgdXBkYXRlZCBIYW5kbGViYXJzIGhlbHBlcnMuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKHtcbiAgICAnaWYnOiAgICAgICAgICAgICAgICAgd3JhcE9sZEhlbHBlcihpbnN0YW5jZS5oZWxwZXJzLmlmKSxcbiAgICAnd2l0aCc6ICAgICAgICAgICAgICAgd3JhcE9sZEhlbHBlcihpbnN0YW5jZS5oZWxwZXJzLndpdGgpLFxuICAgICdibG9ja0hlbHBlck1pc3NpbmcnOiB3cmFwT2xkSGVscGVyKGluc3RhbmNlLmhlbHBlcnMuYmxvY2tIZWxwZXJNaXNzaW5nKVxuICB9KTtcbn07XG5cbi8qKlxuICogQ3JlYXRlIGEgY3VzdG9tIERPTUJhcnMgZW52aXJvbm1lbnQgdG8gbWF0Y2ggSGFuZGxlYmFyc0Vudmlyb25tZW50LlxuICovXG52YXIgRE9NQmFyc0Vudmlyb25tZW50ID0gYmFzZS5ET01CYXJzRW52aXJvbm1lbnQgPSBmdW5jdGlvbiAoKSB7XG4gIEhhbmRsZWJhcnNFbnZpcm9ubWVudC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICByZWdpc3RlckRlZmF1bHRIZWxwZXJzKHRoaXMpO1xufTtcblxuLyoqXG4gKiBFeHRlbmQgdGhlIEhhbmRsZWJhcnNFbnZpcm9ubWVudCBwcm90b3R5cGUuXG4gKlxuICogQHR5cGUge09iamVjdH1cbiAqL1xudmFyIGVudlByb3RvdHlwZSA9IERPTUJhcnNFbnZpcm9ubWVudC5wcm90b3R5cGUgPSBVdGlscy5jcmVhdGUoXG4gIEhhbmRsZWJhcnNFbnZpcm9ubWVudC5wcm90b3R5cGVcbik7XG5cbi8qKlxuICogQWxpYXMgc29tZSB1c2VmdWwgZnVuY3Rpb25hbGl0eSB0aGF0IGlzIGV4cGVjdGVkIHRvIGJlIGV4cG9zZWQgb24gdGhlIHJvb3RcbiAqIG9iamVjdC5cbiAqL1xuZW52UHJvdG90eXBlLmNyZWF0ZUZyYW1lICAgICAgID0gaGJzQmFzZS5jcmVhdGVGcmFtZTtcbmVudlByb3RvdHlwZS5SRVZJU0lPTl9DSEFOR0VTICA9IGhic0Jhc2UuUkVWSVNJT05fQ0hBTkdFUztcbmVudlByb3RvdHlwZS5DT01QSUxFUl9SRVZJU0lPTiA9IGhic0Jhc2UuQ09NUElMRVJfUkVWSVNJT047XG5cbi8qKlxuICogVGhlIGJhc2ljIGdldHRlciBmdW5jdGlvbi4gT3ZlcnJpZGUgdGhpcyB3aXRoIHNvbWV0aGluZyBlbHNlIGJhc2VkIG9uIHlvdXJcbiAqIHByb2plY3QuIEZvciBleGFtcGxlLCBCYWNrYm9uZS5qcyBtb2RlbHMuXG4gKlxuICogQHBhcmFtICB7T2JqZWN0fSBvYmplY3RcbiAqIEBwYXJhbSAge1N0cmluZ30gcHJvcGVydHlcbiAqIEByZXR1cm4geyp9XG4gKi9cbmVudlByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAob2JqZWN0LCBwcm9wZXJ0eSkge1xuICByZXR1cm4gb2JqZWN0W3Byb3BlcnR5XTtcbn07XG5cbi8qKlxuICogTm9vcCBmdW5jdGlvbnMgZm9yIHN1YnNjcmliZSBhbmQgdW5zdWJzY3JpYmUuIE92ZXJyaWRlIHdpdGggY3VzdG9tXG4gKiBmdW5jdGlvbmFsaXR5LlxuICovXG5lbnZQcm90b3R5cGUuc3Vic2NyaWJlID0gZW52UHJvdG90eXBlLnVuc3Vic2NyaWJlID0gZnVuY3Rpb24gKCkge307XG4iLCJ2YXIgaGJzQVNUID0gcmVxdWlyZSgnaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL2NvbXBpbGVyL2FzdCcpLmRlZmF1bHQ7XG52YXIgVXRpbHMgID0gcmVxdWlyZSgnLi4vdXRpbHMnKTtcblxuLyoqXG4gKiBFeHRlbmQgdGhlIEhhbmRsZWJhcnMgQVNUIHdpdGggRE9NIG5vZGVzLlxuICpcbiAqIEB0eXBlIHtPYmplY3R9XG4gKi9cbnZhciBBU1QgPSBtb2R1bGUuZXhwb3J0cyA9IFV0aWxzLmNyZWF0ZShoYnNBU1QpO1xuXG4vKipcbiAqIENyZWF0ZSBhbiBBU1Qgbm9kZSBmb3IgcmVwcmVzZW50aW5nIGFuIGVsZW1lbnQuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG5hbWVcbiAqIEBwYXJhbSB7T2JqZWN0fSBhdHRyaWJ1dGVzXG4gKiBAcGFyYW0ge09iamVjdH0gY29udGVudFxuICovXG5BU1QuRE9NRWxlbWVudCA9IGZ1bmN0aW9uIChuYW1lLCBhdHRyaWJ1dGVzLCBjb250ZW50KSB7XG4gIHRoaXMudHlwZSAgICAgICA9ICdET01fRUxFTUVOVCc7XG4gIHRoaXMubmFtZSAgICAgICA9IG5hbWU7XG4gIHRoaXMuYXR0cmlidXRlcyA9IGF0dHJpYnV0ZXM7XG4gIHRoaXMuY29udGVudCAgICA9IGNvbnRlbnQ7XG59O1xuXG4vKipcbiAqIENyZWF0ZSBhbiBBU1Qgbm9kZSBmb3IgcmVwcmVzZW50aW5nIGFuIGVsZW1lbnQgYXR0cmlidXRlLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBuYW1lXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWVcbiAqL1xuQVNULkRPTUF0dHJpYnV0ZSA9IGZ1bmN0aW9uIChuYW1lLCB2YWx1ZSkge1xuICB0aGlzLnR5cGUgID0gJ0RPTV9BVFRSSUJVVEUnO1xuICB0aGlzLm5hbWUgID0gbmFtZTtcbiAgdGhpcy52YWx1ZSA9IHZhbHVlO1xufTtcblxuLyoqXG4gKiBDcmVhdGUgYW4gQVNUIG5vZGUgZm9yIHJlcHJlc2VudGluZyBhIGNvbW1lbnQgbm9kZS5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdGV4dFxuICovXG5BU1QuRE9NQ29tbWVudCA9IGZ1bmN0aW9uICh0ZXh0KSB7XG4gIHRoaXMudHlwZSA9ICdET01fQ09NTUVOVCc7XG4gIHRoaXMudGV4dCA9IHRleHQ7XG59O1xuIiwidmFyIGNyZWF0ZSAgICAgICAgID0gcmVxdWlyZSgnLi4vdXRpbHMnKS5jcmVhdGU7XG52YXIgQ29tbW9uQ29tcGlsZXIgPSByZXF1aXJlKCcuL2NvbW1vbi1jb21waWxlcicpLnByb3RvdHlwZTtcblxuLyoqXG4gKiBBdHRyaWJ1dGUgY29tcGlsZXIuXG4gKi9cbnZhciBDb21waWxlciA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge307XG5Db21waWxlci5wcm90b3R5cGUgPSBjcmVhdGUoQ29tbW9uQ29tcGlsZXIpO1xuQ29tcGlsZXIucHJvdG90eXBlLmNvbXBpbGVyID0gQ29tcGlsZXI7XG5cbi8qKlxuICogQXBwZW5kIGEgdmFsdWUgdG8gdGhlIGN1cnJlbnQgYnVmZmVyLiBXZSBvdmVycmlkZSB0aGUgZGVmYXVsdCBmdW5jdGlvbmFsaXR5XG4gKiBvZiBIYW5kbGViYXJzIHNpbmNlIHdlIHdhbnQgdG8gYmUgYWJsZSB0byBhcHBlbmQgKmV2ZXJ5KiB2YWx1ZS5cbiAqL1xuQ29tcGlsZXIucHJvdG90eXBlLmFwcGVuZCA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5mbHVzaElubGluZSgpO1xuXG4gIHRoaXMuc291cmNlLnB1c2godGhpcy5hcHBlbmRUb0J1ZmZlcih0aGlzLnBvcFN0YWNrKCkpKTtcbn07XG5cbi8qKlxuICogU2V0IGEgZmxhZyB0byBpbmRpY2F0ZSB0aGUgY29tcGlsZXIgaXMgYW4gYXR0cmlidXRlIGNvbXBpbGVyLlxuICpcbiAqIEB0eXBlIHtCb29sZWFufVxuICovXG5Db21waWxlci5wcm90b3R5cGUuaXNBdHRyaWJ1dGUgPSB0cnVlO1xuIiwidmFyIEFTVCAgICA9IHJlcXVpcmUoJy4vYXN0Jyk7XG52YXIgcGFyc2VyID0gZXhwb3J0cy5wYXJzZXIgPSByZXF1aXJlKCcuL3BhcnNlcicpO1xuXG4vKipcbiAqIFBhcnNlIGEgc3RyaW5nIGludG8gYW4gQVNULlxuICpcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqL1xuZXhwb3J0cy5wYXJzZSA9IGZ1bmN0aW9uIChpbnB1dCkge1xuICBpZiAoaW5wdXQuY29uc3RydWN0b3IgPT09IEFTVC5Qcm9ncmFtTm9kZSkge1xuICAgIHJldHVybiBpbnB1dDtcbiAgfVxuXG4gIHBhcnNlci55eSA9IEFTVDtcbiAgcmV0dXJuIHBhcnNlci5wYXJzZShpbnB1dCk7XG59O1xuIiwidmFyIGNyZWF0ZSAgICAgPSByZXF1aXJlKCcuLi91dGlscycpLmNyZWF0ZTtcbnZhciBKU0NvbXBpbGVyID0gcmVxdWlyZShcbiAgJ2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9jb21waWxlci9qYXZhc2NyaXB0LWNvbXBpbGVyJ1xuKS5kZWZhdWx0LnByb3RvdHlwZTtcblxuLyoqXG4gKiBDcmVhdGUgdGhlIGJhc2UgY29tcGlsZXIgZnVuY3Rpb25hbGl0eSBhbmQgYXR0YWNoIHJlbGV2YW50IHJlZmVyZW5jZXMuXG4gKi9cbnZhciBDb21waWxlciA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge307XG5Db21waWxlci5wcm90b3R5cGUgPSBjcmVhdGUoSlNDb21waWxlcik7XG5Db21waWxlci5wcm90b3R5cGUuY29tcGlsZXIgPSBDb21waWxlcjtcblxuLyoqXG4gKiBPdmVycmlkZSBuYW1lIGxvb2t1cCB0byB1c2UgdGhlIGZ1bmN0aW9uIHByb3ZpZGVkIG9uIHRoZSBET01CYXJzIG9iamVjdC5cbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5uYW1lTG9va3VwID0gZnVuY3Rpb24gKHBhcmVudCwgcHJvcGVydHksIHR5cGUpIHtcbiAgaWYgKHR5cGUgIT09ICdjb250ZXh0Jykge1xuICAgIHJldHVybiBKU0NvbXBpbGVyLm5hbWVMb29rdXAuY2FsbCh0aGlzLCBwYXJlbnQsIHByb3BlcnR5LCB0eXBlKTtcbiAgfVxuXG4gIHRoaXMuY29udGV4dC5hbGlhc2VzLmdldCA9ICd0aGlzLmdldCc7XG5cbiAgdmFyIHF1b3RlZFBhcmVudCAgID0gdGhpcy5xdW90ZWRTdHJpbmcocGFyZW50KTtcbiAgdmFyIHF1b3RlZFByb3BlcnR5ID0gdGhpcy5xdW90ZWRTdHJpbmcocHJvcGVydHkpO1xuXG4gIHJldHVybiAnZ2V0KCcgKyBwYXJlbnQgKyAnLCAnICsgcXVvdGVkUHJvcGVydHkgKyAnLCAnICsgcXVvdGVkUGFyZW50ICsgJyknO1xufTtcblxuLyoqXG4gKiBPdmVycmlkZSBhbWJpZ3VvdXMgaW52b2tlcyB0byBwcm9kdWNlIGp1c3Qgb25lIHNvdXJjZSB2YWx1ZS5cbiAqL1xuQ29tcGlsZXIucHJvdG90eXBlLmludm9rZUFtYmlndW91cyA9IGZ1bmN0aW9uICgpIHtcbiAgSlNDb21waWxlci5pbnZva2VBbWJpZ3VvdXMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgdGhpcy5zb3VyY2UucHVzaCh0aGlzLnNvdXJjZS5zcGxpY2UoLTIpLmpvaW4oJ1xcbicpKTtcbn07XG5cbi8qKlxuICogT3ZlcnJpZGUgdGhlIGFtYmlnb3VzIGJsb2NrIHZhbHVlIGludm9rYXRpb24gdG8gcHJvZHVjZSBhIHNpbmdsZSBzb3VyY2UuXG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5hbWJpZ3VvdXNCbG9ja1ZhbHVlID0gZnVuY3Rpb24gKCkge1xuICBKU0NvbXBpbGVyLmFtYmlndW91c0Jsb2NrVmFsdWUuY2FsbCh0aGlzKTtcbiAgdGhpcy5zb3VyY2UucHVzaCh0aGlzLnNvdXJjZS5zcGxpY2UoLTIpLmpvaW4oJ1xcbicpKTtcbn07XG5cbi8qKlxuICogU2V0IHRoZSBhdHRyaWJ1dGUgY29tcGlsZXIgdG8gYmUgZmFsc2UuIFRoaXMgaXMgb3ZlcnJpZGVuIGluIHRoZSBhdHRyaWJ1dGVcbiAqIGNvbXBpbGVyIHN1YmNsYXNzLlxuICpcbiAqIEB0eXBlIHtCb29sZWFufVxuICovXG5Db21waWxlci5wcm90b3R5cGUuaXNBdHRyaWJ1dGUgPSBmYWxzZTtcblxuLyoqXG4gKiBPdmVycmlkZSB0aGUgcGFyYW1zIHNldHVwIHdpdGggYW4gYXR0cmlidXRlIGJvb2xlYW4gYW5kIGN1c3RvbSB3cmFwcGVyc1xuICogZm9yIHByb2dyYW0gZnVuY3Rpb25zLlxuICpcbiAqIEBwYXJhbSAge051bWJlcn0gIHBhcmFtU2l6ZVxuICogQHBhcmFtICB7QXJyYXl9ICAgcGFyYW1zXG4gKiBAcGFyYW0gIHtCb29sZWFufSB1c2VSZWdpc3RlclxuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5Db21waWxlci5wcm90b3R5cGUuc2V0dXBPcHRpb25zID0gZnVuY3Rpb24gKCkge1xuICB2YXIgb3B0aW9ucyA9IEpTQ29tcGlsZXIuc2V0dXBPcHRpb25zLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgdGhpcy5jb250ZXh0LmFsaWFzZXMuc2VsZiA9ICd0aGlzJztcblxuICBvcHRpb25zLnB1c2goJ2F0dHJpYnV0ZTonICsgdGhpcy5pc0F0dHJpYnV0ZSk7XG4gIG9wdGlvbnMucHVzaCgndXBkYXRlOnNlbGYuc3Vic2NyaXB0aW9uLmJvdW5kVXBkYXRlJyk7XG4gIG9wdGlvbnMucHVzaCgndW5zdWJzY3JpYmU6c2VsZi5zdWJzY3JpcHRpb24uYm91bmRVbnN1YnNjcmlwdGlvbicpO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgb3B0aW9ucy5sZW5ndGg7IGkrKykge1xuICAgIGlmIChvcHRpb25zW2ldLnN1YnN0cigwLCA4KSA9PT0gJ2ludmVyc2U6Jykge1xuICAgICAgdGhpcy5jb250ZXh0LmFsaWFzZXMud3JhcFByb2dyYW0gPSAndGhpcy53cmFwUHJvZ3JhbSc7XG4gICAgICBvcHRpb25zW2ldID0gJ2ludmVyc2U6d3JhcFByb2dyYW0oJyArIG9wdGlvbnNbaV0uc3Vic3RyKDgpICsgJyknO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zW2ldLnN1YnN0cigwLCAzKSA9PT0gJ2ZuOicpIHtcbiAgICAgIHRoaXMuY29udGV4dC5hbGlhc2VzLndyYXBQcm9ncmFtID0gJ3RoaXMud3JhcFByb2dyYW0nO1xuICAgICAgb3B0aW9uc1tpXSA9ICdmbjp3cmFwUHJvZ3JhbSgnICsgb3B0aW9uc1tpXS5zdWJzdHIoMykgKyAnKSc7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG9wdGlvbnM7XG59O1xuIiwidmFyIGNyZWF0ZSAgICAgICA9IHJlcXVpcmUoJy4uL3V0aWxzJykuY3JlYXRlO1xudmFyIGhic0NvbXBpbGVyICA9IHJlcXVpcmUoJ2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9jb21waWxlci9jb21waWxlcicpO1xudmFyIEJhc2VDb21waWxlciA9IGhic0NvbXBpbGVyLkNvbXBpbGVyLnByb3RvdHlwZTtcblxuLyoqXG4gKiBDb21waWxlIEhhbmRsZWJhcnMgQVNUIGFuZCBzdHJpbmdzLlxuICpcbiAqIEB0eXBlIHtGdW5jdGlvbn1cbiAqL1xuZXhwb3J0cy5jb21waWxlICAgID0gaGJzQ29tcGlsZXIuY29tcGlsZTtcbmV4cG9ydHMucHJlY29tcGlsZSA9IGhic0NvbXBpbGVyLnByZWNvbXBpbGU7XG5cbi8qKlxuICogQmFzZSBjb21waWxlciBpbiBjaGFyZ2Ugb2YgZ2VuZXJhdGluZyBhIGNvbnN1bWFibGUgZW52aXJvbm1lbnQgZm9yIHRoZVxuICogSmF2YVNjcmlwdCBjb21waWxlci5cbiAqL1xudmFyIENvbXBpbGVyID0gZXhwb3J0cy5Db21waWxlciA9IGZ1bmN0aW9uICgpIHt9O1xuQ29tcGlsZXIucHJvdG90eXBlID0gY3JlYXRlKEJhc2VDb21waWxlcik7XG5Db21waWxlci5wcm90b3R5cGUuY29tcGlsZXIgPSBDb21waWxlcjtcblxuLyoqXG4gKiBBcHBlbmQgYSBET00gZWxlbWVudCBub2RlIHRvIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gbm9kZVxuICovXG5Db21waWxlci5wcm90b3R5cGUuRE9NX0VMRU1FTlQgPSBmdW5jdGlvbiAobm9kZSkge1xuICB0aGlzLm9wY29kZSgncHVzaFByb2dyYW0nLCB0aGlzLmNvbXBpbGVBdHRyaWJ1dGUobm9kZS5uYW1lKSk7XG4gIHRoaXMub3Bjb2RlKCdpbnZva2VFbGVtZW50Jyk7XG5cbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IG5vZGUuYXR0cmlidXRlcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIHZhciBuYW1lICA9IHRoaXMuY29tcGlsZUF0dHJpYnV0ZShub2RlLmF0dHJpYnV0ZXNbaV0ubmFtZSk7XG4gICAgdmFyIHZhbHVlID0gdGhpcy5jb21waWxlQXR0cmlidXRlKG5vZGUuYXR0cmlidXRlc1tpXS52YWx1ZSk7XG4gICAgdGhpcy5hcHBlbmRBdHRyaWJ1dGUobmFtZSwgdmFsdWUpO1xuICB9XG5cbiAgdGhpcy5vcGNvZGUoJ3B1c2hQcm9ncmFtJywgdGhpcy5jb21waWxlQ29udGVudHMobm9kZS5jb250ZW50KSk7XG4gIHRoaXMub3Bjb2RlKCdpbnZva2VDb250ZW50Jyk7XG4gIHRoaXMub3Bjb2RlKCdhcHBlbmRFbGVtZW50Jyk7XG59O1xuXG4vKipcbiAqIEFwcGVuZCBhIERPTSBjb21tZW50IG5vZGUgdG8gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBub2RlXG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5ET01fQ09NTUVOVCA9IGZ1bmN0aW9uIChub2RlKSB7XG4gIHRoaXMub3Bjb2RlKCdwdXNoUHJvZ3JhbScsIHRoaXMuY29tcGlsZUF0dHJpYnV0ZShub2RlLnRleHQpKTtcbiAgdGhpcy5vcGNvZGUoJ2ludm9rZUNvbW1lbnQnKTtcbiAgdGhpcy5vcGNvZGUoJ2FwcGVuZEVsZW1lbnQnKTtcbn07XG5cbi8qKlxuICogQXBwZW5kIGFuIGF0dHJpYnV0ZSB0byB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogQHBhcmFtICB7T2JqZWN0fSBuYW1lXG4gKiBAcGFyYW0gIHtPYmplY3R9IHZhbHVlXG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5hcHBlbmRBdHRyaWJ1dGUgPSBmdW5jdGlvbiAobmFtZSwgdmFsdWUpIHtcbiAgdGhpcy5vcGNvZGUoJ3B1c2hQcm9ncmFtJywgbmFtZSk7XG4gIHRoaXMub3Bjb2RlKCdwdXNoUHJvZ3JhbScsIHZhbHVlKTtcbiAgdGhpcy5vcGNvZGUoJ2ludm9rZUF0dHJpYnV0ZScpO1xufTtcblxuLyoqXG4gKiBDb21waWxlIGFuIGF0dHJpYnV0ZSBwcm9ncmFtLlxuICpcbiAqIEBwYXJhbSAge09iamVjdH0gcHJvZ3JhbVxuICogQHJldHVybiB7TnVtYmVyfVxuICovXG5Db21waWxlci5wcm90b3R5cGUuY29tcGlsZUF0dHJpYnV0ZSA9IGZ1bmN0aW9uIChwcm9ncmFtKSB7XG4gIHZhciBndWlkID0gdGhpcy5jb21waWxlQ29udGVudHMocHJvZ3JhbSk7XG4gIHRoaXMuY2hpbGRyZW5bZ3VpZF0uaXNBdHRyaWJ1dGUgPSB0cnVlO1xuICByZXR1cm4gZ3VpZDtcbn07XG5cbi8qKlxuICogQ29tcGlsZSBhbiBlbGVtZW50cyBjb250ZW50cy5cbiAqXG4gKiBAcGFyYW0gIHtPYmplY3R9IHByb2dyYW1cbiAqIEByZXR1cm4ge051bWJlcn1cbiAqL1xuQ29tcGlsZXIucHJvdG90eXBlLmNvbXBpbGVDb250ZW50cyA9IGZ1bmN0aW9uIChwcm9ncmFtKSB7XG4gIHZhciBndWlkICAgPSB0aGlzLmNvbXBpbGVQcm9ncmFtKHByb2dyYW0pO1xuICB2YXIgcmVzdWx0ID0gdGhpcy5jaGlsZHJlbltndWlkXTtcbiAgcmVzdWx0LmlzUHJveGllZCA9IHRydWU7XG5cbiAgLy8gUHJveHkgYWxsIHRoZSBkZXB0aCBub2RlcyBiZXR3ZWVuIGNvbXBpbGVkIHByb2dyYW1zLlxuICBmb3IgKHZhciBpID0gMDsgaSA8IHJlc3VsdC5kZXB0aHMubGlzdC5sZW5ndGg7IGkrKykge1xuICAgIHRoaXMuYWRkRGVwdGgocmVzdWx0LmRlcHRocy5saXN0W2ldKTtcbiAgfVxuXG4gIHJldHVybiBndWlkO1xufTtcblxuLyoqXG4gKiBVcGRhdGUgdGhlIGNvbXBpbGVyIGVxdWFsaXR5IGNoZWNrIHRvIGFsc28gdGFrZSBpbnRvIGFjY291bnQgYXR0cmlidXRlXG4gKiBwcm9ncmFtcy5cbiAqXG4gKiBAcGFyYW0gIHtPYmplY3R9ICBvdGhlclxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqL1xuQ29tcGlsZXIucHJvdG90eXBlLmVxdWFscyA9IGZ1bmN0aW9uIChvdGhlcikge1xuICAvLyBDaGVjayBpZiB3ZSBoYXZlIHR3byBhdHRyaWJ1dGUgcHJvZ3JhbXMgKG9yIG5vbi1hdHRyaWJ1dGUgcHJvZ3JhbXMpLlxuICBpZiAodGhpcy5pc0F0dHJpYnV0ZSAhPT0gb3RoZXIuaXNBdHRyaWJ1dGUpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gQmFzZUNvbXBpbGVyLmVxdWFscy5jYWxsKHRoaXMsIG90aGVyKTtcbn07XG4iLCJ2YXIgY3JlYXRlICAgICAgICAgPSByZXF1aXJlKCcuLi91dGlscycpLmNyZWF0ZTtcbnZhciBDb21tb25Db21waWxlciA9IHJlcXVpcmUoJy4vY29tbW9uLWNvbXBpbGVyJykucHJvdG90eXBlO1xuXG4vKipcbiAqIEV4dGVuZHMgSGFuZGxlYmFycyBKYXZhU2NyaXB0IGNvbXBpbGVyIHRvIGFkZCBET00gc3BlY2lmaWMgcnVsZXMuXG4gKi9cbnZhciBDb21waWxlciA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge307XG5Db21waWxlci5wcm90b3R5cGUgPSBjcmVhdGUoQ29tbW9uQ29tcGlsZXIpO1xuQ29tcGlsZXIucHJvdG90eXBlLmNvbXBpbGVyICAgICAgICAgID0gQ29tcGlsZXI7XG5Db21waWxlci5wcm90b3R5cGUuYXR0cmlidXRlQ29tcGlsZXIgPSByZXF1aXJlKCcuL2F0dHJpYnV0ZS1jb21waWxlcicpO1xuXG4vKipcbiAqIENvbXBpbGUgYW55IGNoaWxkIHByb2dyYW0gbm9kZXMuIEUuZy4gQmxvY2sgaGVscGVycy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gZW52aXJvbm1lbnRcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5jb21waWxlQ2hpbGRyZW4gPSBmdW5jdGlvbihlbnZpcm9ubWVudCwgb3B0aW9ucykge1xuICB2YXIgY2hpbGRyZW4gPSBlbnZpcm9ubWVudC5jaGlsZHJlbjtcbiAgdmFyIENvbXBpbGVyLCBjaGlsZCwgcHJvZ3JhbSwgaW5kZXg7XG5cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBjaGlsZHJlbi5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBjaGlsZCAgICA9IGNoaWxkcmVuW2ldO1xuICAgIGluZGV4ICAgID0gdGhpcy5tYXRjaEV4aXN0aW5nUHJvZ3JhbShjaGlsZCk7XG4gICAgQ29tcGlsZXIgPSB0aGlzLmNvbXBpbGVyO1xuXG4gICAgaWYgKGNoaWxkLmlzQXR0cmlidXRlKSB7XG4gICAgICBDb21waWxlciA9IHRoaXMuYXR0cmlidXRlQ29tcGlsZXI7XG4gICAgfVxuXG4gICAgaWYgKGluZGV4ID09IG51bGwpIHtcbiAgICAgIHRoaXMuY29udGV4dC5wcm9ncmFtcy5wdXNoKCcnKTtcbiAgICAgIGNoaWxkLmluZGV4ID0gaW5kZXggPSB0aGlzLmNvbnRleHQucHJvZ3JhbXMubGVuZ3RoO1xuICAgICAgY2hpbGQubmFtZSAgPSAncHJvZ3JhbScgKyBpbmRleDtcbiAgICAgIHByb2dyYW0gPSBuZXcgQ29tcGlsZXIoKS5jb21waWxlKGNoaWxkLCBvcHRpb25zLCB0aGlzLmNvbnRleHQpO1xuICAgICAgdGhpcy5jb250ZXh0LnByb2dyYW1zW2luZGV4XSAgICAgPSBwcm9ncmFtO1xuICAgICAgdGhpcy5jb250ZXh0LmVudmlyb25tZW50c1tpbmRleF0gPSBjaGlsZDtcbiAgICB9IGVsc2Uge1xuICAgICAgY2hpbGQuaW5kZXggPSBpbmRleDtcbiAgICAgIGNoaWxkLm5hbWUgID0gJ3Byb2dyYW0nICsgaW5kZXg7XG4gICAgfVxuICB9XG59O1xuXG4vKipcbiAqIEFwcGVuZCBzb21lIGNvbnRlbnQgdG8gdGhlIGJ1ZmZlciAoYSBkb2N1bWVudCBmcmFnbWVudCkuXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSBzdHJpbmdcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuQ29tcGlsZXIucHJvdG90eXBlLmFwcGVuZFRvQnVmZmVyID0gZnVuY3Rpb24gKHN0cmluZykge1xuICBpZiAodGhpcy5lbnZpcm9ubWVudC5pc1NpbXBsZSkge1xuICAgIHJldHVybiAncmV0dXJuICcgKyBzdHJpbmcgKyAnOyc7XG4gIH1cblxuICB0aGlzLmNvbnRleHQuYWxpYXNlcy5hcHBlbmRDaGlsZCA9ICd0aGlzLmFwcGVuZENoaWxkJztcblxuICByZXR1cm4gJ2FwcGVuZENoaWxkKGJ1ZmZlciwgJyArIHN0cmluZyArICcpOyc7XG59O1xuXG4vKipcbiAqIEluaXRpYWxpemUgdGhlIGJhc2UgdmFsdWUgb2YgdGhlIGJ1ZmZlciwgaW4gdGhpcyBjYXNlIGEgZG9jdW1lbnQgZnJhZ21lbnQuXG4gKlxuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5Db21waWxlci5wcm90b3R5cGUuaW5pdGlhbGl6ZUJ1ZmZlciA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuICdkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCknO1xufTtcblxuLyoqXG4gKiBBcHBlbmQgYSB0ZXh0IG5vZGUgdG8gdGhlIGJ1ZmZlci5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gY29udGVudFxuICovXG5Db21waWxlci5wcm90b3R5cGUuYXBwZW5kQ29udGVudCA9IGZ1bmN0aW9uIChjb250ZW50KSB7XG4gIHZhciBzdHJpbmcgPSAnZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJyArIHRoaXMucXVvdGVkU3RyaW5nKGNvbnRlbnQpICsgJyknO1xuICB0aGlzLnNvdXJjZS5wdXNoKHRoaXMuYXBwZW5kVG9CdWZmZXIoc3RyaW5nKSk7XG59O1xuXG4vKipcbiAqIEFwcGVuZCBhIHZhcmlhYmxlIHRvIHRoZSBzdGFjay4gQWRkcyBzb21lIGFkZGl0aW9uYWwgbG9naWMgdG8gdHJhbnNmb3JtIHRoZVxuICogdGV4dCBpbnRvIGEgRE9NIG5vZGUgYmVmb3JlIHdlIGF0dGVtcHQgdG8gYXBwZW5kIGl0IHRvIHRoZSBidWZmZXIuXG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5hcHBlbmQgPSBmdW5jdGlvbiAoaXNFc2NhcGVkKSB7XG4gIHRoaXMuZmx1c2hJbmxpbmUoKTtcblxuICB2YXIgY3JlYXRlRm4gPSAnY3JlYXRlRE9NJztcblxuICBpZiAoaXNFc2NhcGVkKSB7XG4gICAgY3JlYXRlRm4gPSAnY3JlYXRlVGV4dCc7XG4gIH1cblxuICAvLyBBbGlhcyB0aGUgY3JlYXRpb24gZnVuY3Rpb24uXG4gIHRoaXMuY29udGV4dC5hbGlhc2VzW2NyZWF0ZUZuXSA9ICd0aGlzLicgKyBjcmVhdGVGbjtcblxuICB2YXIgbG9jYWwgICA9IHRoaXMucG9wU3RhY2soKTtcbiAgdmFyIHNvdXJjZSAgPSB0aGlzLnNvdXJjZS5wb3AoKTtcblxuICB0aGlzLnB1c2hTdGFjayhcbiAgICBjcmVhdGVGbiArICcoZnVuY3Rpb24gKCkgeyAnICsgc291cmNlICsgJzsgcmV0dXJuICcgKyBsb2NhbCArICc7IH0pJ1xuICApO1xuXG4gIHRoaXMuc291cmNlLnB1c2godGhpcy5hcHBlbmRUb0J1ZmZlcih0aGlzLnBvcFN0YWNrKCkpKTtcbn07XG5cbi8qKlxuICogQXBwZW5kIGFuIGVzY2FwZWQgSGFuZGxlYmFycyBleHByZXNzaW9uIHRvIHRoZSBzb3VyY2UuXG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5hcHBlbmRFc2NhcGVkID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5hcHBlbmQodHJ1ZSk7XG59O1xuXG4vKipcbiAqIEFwcGVuZCBhbiBlbGVtZW50IG5vZGUgdG8gdGhlIHNvdXJjZS5cbiAqL1xuQ29tcGlsZXIucHJvdG90eXBlLmFwcGVuZEVsZW1lbnQgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuc291cmNlLnB1c2godGhpcy5hcHBlbmRUb0J1ZmZlcih0aGlzLnBvcFN0YWNrKCkpKTtcbn07XG5cbi8qKlxuICogQ3JlYXRlIGEgRE9NIGNvbW1lbnQgbm9kZSByZWFkeSBmb3IgYXBwZW5kaW5nIHRvIHRoZSBjdXJyZW50IGJ1ZmZlci5cbiAqL1xuQ29tcGlsZXIucHJvdG90eXBlLmludm9rZUNvbW1lbnQgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuY29udGV4dC5hbGlhc2VzLnBhcnRpYWwgICAgICAgPSAndGhpcy5wYXJ0aWFsJztcbiAgdGhpcy5jb250ZXh0LmFsaWFzZXMuY3JlYXRlQ29tbWVudCA9ICd0aGlzLmNyZWF0ZUNvbW1lbnQnO1xuXG4gIHRoaXMucHVzaFN0YWNrKCdjcmVhdGVDb21tZW50KHBhcnRpYWwoJyArIHRoaXMucG9wU3RhY2soKSArICcsIGRlcHRoMCkpJyk7XG59O1xuXG4vKipcbiAqIENyZWF0ZSBhIERPTSBlbGVtZW50IG5vZGUgcmVhZHkgZm9yIGFwcGVuZGluZyB0byB0aGUgY3VycmVudCBidWZmZXIuXG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5pbnZva2VFbGVtZW50ID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmNvbnRleHQuYWxpYXNlcy5wYXJ0aWFsICAgICAgID0gJ3RoaXMucGFydGlhbCc7XG4gIHRoaXMuY29udGV4dC5hbGlhc2VzLmNyZWF0ZUVsZW1lbnQgPSAndGhpcy5jcmVhdGVFbGVtZW50JztcblxuICB2YXIgY3JlYXRlICA9ICdwYXJ0aWFsKCcgKyB0aGlzLnBvcFN0YWNrKCkgKyAnLCBkZXB0aDApJztcbiAgdmFyIGVsZW1lbnQgPSB0aGlzLmxhc3RFbGVtZW50ID0gdGhpcy5uZXh0U3RhY2soKTtcblxuICB0aGlzLnJlcGxhY2VTdGFjayhmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNiID0gJ2Z1bmN0aW9uIChlbCkgeyAnICsgZWxlbWVudCArICcgPSBlbDsgfSc7XG4gICAgcmV0dXJuICdjcmVhdGVFbGVtZW50KCcgKyBjcmVhdGUgKyAnLCAnICsgY2IgKyAnKSc7XG4gIH0pO1xufTtcblxuLyoqXG4gKiBBcHBlbmQgYW4gYXR0cmlidXRlIG5vZGUgdG8gdGhlIGN1cnJlbnQgZWxlbWVudC5cbiAqL1xuQ29tcGlsZXIucHJvdG90eXBlLmludm9rZUF0dHJpYnV0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5jb250ZXh0LmFsaWFzZXMucGFydGlhbCAgICAgID0gJ3RoaXMucGFydGlhbCc7XG4gIHRoaXMuY29udGV4dC5hbGlhc2VzLnNldEF0dHJpYnV0ZSA9ICd0aGlzLnNldEF0dHJpYnV0ZSc7XG5cbiAgdmFyIGVsZW1lbnQgPSAnZnVuY3Rpb24gKCkgeyByZXR1cm4gJyArIHRoaXMubGFzdEVsZW1lbnQgKyAnOyB9JztcbiAgdmFyIHZhbHVlICAgPSAncGFydGlhbCgnICsgdGhpcy5wb3BTdGFjaygpICsgJywgZGVwdGgwKSc7XG4gIHZhciBuYW1lICAgID0gJ3BhcnRpYWwoJyArIHRoaXMucG9wU3RhY2soKSArICcsIGRlcHRoMCknO1xuICB2YXIgcGFyYW1zICA9IFtlbGVtZW50LCBuYW1lLCB2YWx1ZV07XG5cbiAgdGhpcy5zb3VyY2UucHVzaCgnc2V0QXR0cmlidXRlKCcgKyBwYXJhbXMuam9pbignLCAnKSArICcpOycpO1xufTtcblxuLyoqXG4gKiBJbnZva2UgYW4gYXJiaXRyYXJ5IHByb2dyYW0gYW5kIGFwcGVuZCB0byB0aGUgY3VycmVudCBlbGVtZW50LlxuICovXG5Db21waWxlci5wcm90b3R5cGUuaW52b2tlQ29udGVudCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGNoaWxkID0gdGhpcy5wb3BTdGFjaygpICsgJyhkZXB0aDApJztcblxuICB0aGlzLmNvbnRleHQuYWxpYXNlcy5hcHBlbmRDaGlsZCA9ICd0aGlzLmFwcGVuZENoaWxkJztcblxuICB0aGlzLnNvdXJjZS5wdXNoKCdhcHBlbmRDaGlsZCgnICsgdGhpcy5sYXN0RWxlbWVudCArICcsICcgKyBjaGlsZCArICcpOycpO1xufTtcblxuLyoqXG4gKiBPdmVycmlkZSB0aGUgcHJvZ3JhbSBleHByZXNzaW9uIGZ1bmN0aW9uIHRvIHByb3h5IGRlcHRoLlxuICpcbiAqIEBwYXJhbSAge051bWJlcn0gZ3VpZFxuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5Db21waWxlci5wcm90b3R5cGUucHJvZ3JhbUV4cHJlc3Npb24gPSBmdW5jdGlvbiAoZ3VpZCkge1xuICB0aGlzLmNvbnRleHQuYWxpYXNlcy5zZWxmID0gJ3RoaXMnO1xuXG4gIGlmIChndWlkID09IG51bGwpIHtcbiAgICByZXR1cm4gJ3NlbGYubm9vcCc7XG4gIH1cblxuICB2YXIgY2hpbGQgICAgICAgICA9IHRoaXMuZW52aXJvbm1lbnQuY2hpbGRyZW5bZ3VpZF07XG4gIHZhciBkZXB0aHMgICAgICAgID0gY2hpbGQuZGVwdGhzLmxpc3Q7XG4gIHZhciBwcm9ncmFtUGFyYW1zID0gW2NoaWxkLmluZGV4LCBjaGlsZC5uYW1lLCAnZGF0YSddO1xuXG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBkZXB0aHMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICB2YXIgZGVwdGggPSBkZXB0aHNbaV0gKyB0aGlzLmVudmlyb25tZW50LmRlcHRocy5saXN0Lmxlbmd0aDtcblxuICAgIHByb2dyYW1QYXJhbXMucHVzaCgnZGVwdGgnICsgKGRlcHRoIC0gMSkpO1xuICB9XG5cbiAgdmFyIHBhcmFtcyA9IHByb2dyYW1QYXJhbXMuam9pbignLCAnKTtcblxuICBpZiAoZGVwdGhzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiAnc2VsZi5wcm9ncmFtKCcgKyBwYXJhbXMgKyAnKSc7XG4gIH1cblxuICByZXR1cm4gJ3NlbGYucHJvZ3JhbVdpdGhEZXB0aCgnICsgcGFyYW1zICsgJyknO1xufTtcbiIsInZhciBIYnNQYXJzZXIgID0gcmVxdWlyZShcbiAgJ2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9jb21waWxlci9wYXJzZXInXG4pLmRlZmF1bHQ7XG52YXIgSFRNTFBhcnNlciA9IHJlcXVpcmUoJ2h0bWxwYXJzZXIyL2xpYi9QYXJzZXInKTtcblxuLyoqXG4gKiBTdHJpbmdpZnkgYW4gYEFTVC5Qcm9ncmFtTm9kZWAgc28gaXQgY2FuIGJlIHJ1biB0aHJvdWdoIG90aGVycyBwYXJzZXJzLiBUaGlzXG4gKiBpcyByZXF1aXJlZCBmb3IgdGhlIG5vZGUgdG8gYmUgcGFyc2VkIGFzIEhUTUwgKmFmdGVyKiBpdCBpcyBwYXJzZWQgYXMgYVxuICogSGFuZGxlYmFycyB0ZW1wbGF0ZS4gSGFuZGxlYmFycyBtdXN0IGFsd2F5cyBydW4gYmVmb3JlIHRoZSBIVE1MIHBhcnNlciwgc29cbiAqIGl0IGNhbiBjb3JyZWN0bHkgbWF0Y2ggYmxvY2sgbm9kZXMgKEkgY291bGRuJ3Qgc2VlIGEgc2ltcGxlIHdheSB0byByZXN1bWVcbiAqIHRoZSBlbmQgYmxvY2sgbm9kZSBwYXJzaW5nKS5cbiAqXG4gKiBAcGFyYW0gIHtIYW5kbGViYXJzLkFTVC5Qcm9ncmFtTm9kZX0gcHJvZ3JhbVxuICogQHJldHVybiB7U3RyaW5nfVxuICovXG52YXIgc3RyaW5naWZ5UHJvZ3JhbSA9IGZ1bmN0aW9uIChwcm9ncmFtKSB7XG4gIHZhciBodG1sICAgICAgID0gJyc7XG4gIHZhciBzdGF0ZW1lbnRzID0gcHJvZ3JhbS5zdGF0ZW1lbnRzO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RhdGVtZW50cy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBzdGF0ZW1lbnQgPSBzdGF0ZW1lbnRzW2ldO1xuXG4gICAgaWYgKHN0YXRlbWVudC50eXBlID09PSAnY29udGVudCcpIHtcbiAgICAgIGh0bWwgKz0gc3RhdGVtZW50LnN0cmluZztcbiAgICB9IGVsc2Uge1xuICAgICAgaHRtbCArPSAne3tkJyArIGkgKyAnfX0nOyAvLyBcIkFsaWFzXCIgbm9kZS5cbiAgICB9XG4gIH1cblxuICByZXR1cm4gaHRtbDtcbn07XG5cbi8qKlxuICogUGFyc2VzIGEgdGV4dCBzdHJpbmcgcmV0dXJuZWQgZnJvbSBzdHJpbmdpZnlpbmcgYSBwcm9ncmFtIG5vZGUuIFJlcGxhY2VzIGFueVxuICogbXVzdGFjaGUgbm9kZSByZWZlcmVuY2VzIHdpdGggdGhlIG9yaWdpbmFsIG5vZGUuXG5cbiAqIEBwYXJhbSAge1N0cmluZ30gaW5wdXRcbiAqIEBwYXJhbSAge09iamVjdH0gb3JpZ2luYWxQcm9ncmFtXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cbnZhciBwYXJzZVByb2dyYW0gPSBmdW5jdGlvbiAoaW5wdXQsIG9yaWdpbmFsUHJvZ3JhbSkge1xuICB2YXIgcHJvZ3JhbSAgICA9IEhic1BhcnNlci5wYXJzZShpbnB1dCk7XG4gIHZhciBzdGF0ZW1lbnRzID0gcHJvZ3JhbS5zdGF0ZW1lbnRzO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RhdGVtZW50cy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBzdGF0ZW1lbnQgPSBzdGF0ZW1lbnRzW2ldO1xuXG4gICAgLy8gUmVwbGFjZSBtdXN0YWNoZSBub2Rlcywgd2hpY2ggKnNob3VsZCogb25seSBiZSByZWFsIEhhbmRsZWJhcnMgXCJhbGlhc1wiXG4gICAgLy8gbm9kZXMgdGhhdCB3ZXJlIGluamVjdGVkIGJ5IHRoZSBzdHJpbmdpZmljYXRpb24gb2YgdGhlIHByb2dyYW0gbm9kZS5cbiAgICBpZiAoc3RhdGVtZW50LnR5cGUgPT09ICdtdXN0YWNoZScpIHtcbiAgICAgIHN0YXRlbWVudHNbaV0gPSBvcmlnaW5hbFByb2dyYW0uc3RhdGVtZW50c1tzdGF0ZW1lbnQuaWQuc3RyaW5nLnN1YnN0cigxKV07XG4gICAgICBzdGF0ZW1lbnQgPSBzdGF0ZW1lbnRzW2ldO1xuICAgIH1cblxuICAgIC8vIE5lZWQgdG8gcmVjdXJzaXZlbHkgcmVzb2x2ZSBibG9jayBub2RlIHByb2dyYW1zIGFzIEhUTUwuXG4gICAgaWYgKHN0YXRlbWVudC50eXBlID09PSAnYmxvY2snKSB7XG4gICAgICBpZiAoc3RhdGVtZW50LnByb2dyYW0pIHtcbiAgICAgICAgc3RhdGVtZW50LnByb2dyYW0gPSBwYXJzZUFzSFRNTChzdGF0ZW1lbnQucHJvZ3JhbSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChzdGF0ZW1lbnQuaW52ZXJzZSkge1xuICAgICAgICBzdGF0ZW1lbnQuaW52ZXJzZSA9IHBhcnNlQXNIVE1MKHN0YXRlbWVudC5pbnZlcnNlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gcHJvZ3JhbTtcbn07XG5cbi8qKlxuICogUGFyc2UgYSBwcm9ncmFtIG9iamVjdCBhcyBIVE1MIGFuZCByZXR1cm4gYW4gdXBkYXRlZCBwcm9ncmFtLlxuICpcbiAqIEBwYXJhbSAge09iamVjdH0gb3JpZ2luYWxQcm9ncmFtXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cbnZhciBwYXJzZUFzSFRNTCA9IGZ1bmN0aW9uIChvcmlnaW5hbFByb2dyYW0pIHtcbiAgdmFyIHl5ICAgPSBIYnNQYXJzZXIueXk7XG4gIHZhciBodG1sID0gc3RyaW5naWZ5UHJvZ3JhbShvcmlnaW5hbFByb2dyYW0pO1xuXG4gIC8vIENyZWF0ZSBhbmQgcmV0dXJuIGEgbmV3IGVtcHR5IHByb2dyYW0gbm9kZS5cbiAgdmFyIGNyZWF0ZVByb2dyYW0gPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIG5ldyB5eS5Qcm9ncmFtTm9kZShbXSk7XG4gIH07XG5cbiAgLy8gU3RhcnQgdGhlIHN0YWNrIHdpdGggYW4gZW1wdHkgcHJvZ3JhbSBub2RlIHdoaWNoIHdpbGwgY29udGFpbiBhbGwgdGhlXG4gIC8vIHBhcnNlZCBlbGVtZW50cy5cbiAgdmFyIHByb2dyYW0gPSBjcmVhdGVQcm9ncmFtKCk7XG4gIHZhciBzdGFjayAgID0gW3Byb2dyYW1dO1xuICB2YXIgZWxlbWVudDtcblxuICAvLyBHZW5lcmF0ZSBhIG5ldyBIVE1MIHBhcnNlciBpbnN0YW5jZS5cbiAgdmFyIHBhcnNlciA9IG5ldyBIVE1MUGFyc2VyKHtcbiAgICBvbm9wZW50YWduYW1lOiBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgdmFyIG5vZGUgPSBuZXcgeXkuRE9NRWxlbWVudChuYW1lLCBbXSwgY3JlYXRlUHJvZ3JhbSgpKTtcbiAgICAgIHByb2dyYW0uc3RhdGVtZW50cy5wdXNoKGVsZW1lbnQgPSBub2RlKTtcbiAgICAgIHN0YWNrLnB1c2gocHJvZ3JhbSA9IG5vZGUuY29udGVudCk7XG4gICAgfSxcbiAgICBvbmNsb3NldGFnOiBmdW5jdGlvbiAoKSB7XG4gICAgICBzdGFjay5wb3AoKTtcbiAgICAgIGVsZW1lbnQgPSBudWxsO1xuICAgICAgcHJvZ3JhbSA9IHN0YWNrW3N0YWNrLmxlbmd0aCAtIDFdO1xuICAgIH0sXG4gICAgb25hdHRyaWJ1dGU6IGZ1bmN0aW9uIChuYW1lLCB2YWx1ZSkge1xuICAgICAgZWxlbWVudC5hdHRyaWJ1dGVzLnB1c2gobmV3IHl5LkRPTUF0dHJpYnV0ZShuYW1lLCB2YWx1ZSkpO1xuICAgIH0sXG4gICAgb250ZXh0OiBmdW5jdGlvbiAodGV4dCkge1xuICAgICAgcHJvZ3JhbS5zdGF0ZW1lbnRzLnB1c2godGV4dCk7XG4gICAgfSxcbiAgICBvbnByb2Nlc3NpbmdpbnN0cnVjdGlvbjogZnVuY3Rpb24gKCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdQcm9jZXNzaW5nIGluc3RydWN0aW9ucyBhcmUgbm90IHN1cHBvcnRlZCcpO1xuICAgIH0sXG4gICAgb25jb21tZW50OiBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgcHJvZ3JhbS5zdGF0ZW1lbnRzLnB1c2gobmV3IHl5LkRPTUNvbW1lbnQoZGF0YSkpO1xuICAgIH0sXG4gICAgb25lcnJvcjogZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH0sIHtcbiAgICBkZWNvZGVFbnRpdGllczogdHJ1ZVxuICB9KTtcblxuICBwYXJzZXIud3JpdGUoaHRtbCk7XG4gIHBhcnNlci5lbmQoKTtcblxuICAvKipcbiAgICogUmVjdXJzaXZlbHkgcGFyc2VzIG5lc3RlZCBET00gZWxlbWVudHMgYXMgSGFuZGxlYmFycyB0ZW1wbGF0ZXMuXG4gICAqXG4gICAqIEBwYXJhbSAge09iamVjdH0gcHJvZ3JhbVxuICAgKiBAcGFyYW0gIHtPYmplY3R9IG9yaWdpbmFsUHJvZ3JhbVxuICAgKiBAcmV0dXJuIHtPYmplY3R9XG4gICAqL1xuICB2YXIgYXN0ID0gKGZ1bmN0aW9uIHJlY3Vyc2UgKHByb2dyYW0sIG9yaWdpbmFsUHJvZ3JhbSkge1xuICAgIHZhciBzdGF0ZW1lbnRzID0gcHJvZ3JhbS5zdGF0ZW1lbnRzO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdGF0ZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgc3RhdGVtZW50ID0gc3RhdGVtZW50c1tpXTtcblxuICAgICAgaWYgKHR5cGVvZiBzdGF0ZW1lbnQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHZhciBtZXJnZSA9IHBhcnNlUHJvZ3JhbShzdGF0ZW1lbnQsIG9yaWdpbmFsUHJvZ3JhbSkuc3RhdGVtZW50cztcblxuICAgICAgICBzdGF0ZW1lbnRzLnNwbGljZS5hcHBseShzdGF0ZW1lbnRzLCBbaSwgMV0uY29uY2F0KG1lcmdlKSk7XG4gICAgICAgIGkgKz0gbWVyZ2UubGVuZ3RoIC0gMTtcbiAgICAgIH0gZWxzZSBpZiAoc3RhdGVtZW50LnR5cGUgPT09ICdET01fQ09NTUVOVCcpIHtcbiAgICAgICAgc3RhdGVtZW50LnRleHQgPSBwYXJzZVByb2dyYW0oc3RhdGVtZW50LnRleHQsIG9yaWdpbmFsUHJvZ3JhbSk7XG4gICAgICB9IGVsc2UgaWYgKHN0YXRlbWVudC50eXBlID09PSAnRE9NX0VMRU1FTlQnKSB7XG4gICAgICAgIHN0YXRlbWVudC5uYW1lID0gcGFyc2VQcm9ncmFtKHN0YXRlbWVudC5uYW1lLCBvcmlnaW5hbFByb2dyYW0pO1xuXG4gICAgICAgIGZvciAodmFyIGsgPSAwOyBrIDwgc3RhdGVtZW50LmF0dHJpYnV0ZXMubGVuZ3RoOyBrKyspIHtcbiAgICAgICAgICB2YXIgYXR0cmlidXRlID0gc3RhdGVtZW50LmF0dHJpYnV0ZXNba107XG5cbiAgICAgICAgICBhdHRyaWJ1dGUubmFtZSAgPSBwYXJzZVByb2dyYW0oYXR0cmlidXRlLm5hbWUsICBvcmlnaW5hbFByb2dyYW0pO1xuICAgICAgICAgIGF0dHJpYnV0ZS52YWx1ZSA9IHBhcnNlUHJvZ3JhbShhdHRyaWJ1dGUudmFsdWUsIG9yaWdpbmFsUHJvZ3JhbSk7XG4gICAgICAgIH1cblxuICAgICAgICByZWN1cnNlKHN0YXRlbWVudC5jb250ZW50LCBvcmlnaW5hbFByb2dyYW0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBwcm9ncmFtO1xuICB9KShzdGFjay5wb3AoKSwgb3JpZ2luYWxQcm9ncmFtKTtcblxuICByZXR1cm4gYXN0O1xufTtcblxuLyoqXG4gKiBUaGUgcGFyc2VyIGlzIGEgc2ltcGxlIGNvbnN0cnVjdG9yLiBBbGwgdGhlIGZ1bmN0aW9uYWxpdHkgaXMgb24gdGhlIHByb3RvdHlwZVxuICogb2JqZWN0LlxuICovXG52YXIgUGFyc2VyID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLnl5ID0ge307XG59O1xuXG4vKipcbiAqIEFsaWFzIHRoZSBwYXJzZXIgY29uc3RydWN0b3IgZnVuY3Rpb24uXG4gKlxuICogQHR5cGUge0Z1bmN0aW9ufVxuICovXG5QYXJzZXIucHJvdG90eXBlLlBhcnNlciA9IFBhcnNlcjtcblxuLyoqXG4gKiBUaGUgcHJpbWFyeSBmdW5jdGlvbmFsaXR5IG9mIHRoZSBwYXJzZXIuIFB1c2hlcyB0aGUgaW5wdXQgdGV4dCB0aHJvdWdoXG4gKiBIYW5kbGViYXJzIGFuZCBhIEhUTUwgcGFyc2VyLCBnZW5lcmF0aW5nIGEgQVNUIGZvciB1c2Ugd2l0aCB0aGUgY29tcGlsZXIuXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSBpbnB1dFxuICogQHJldHVybiB7T2JqZWN0fVxuICovXG5QYXJzZXIucHJvdG90eXBlLnBhcnNlID0gZnVuY3Rpb24gKGlucHV0KSB7XG4gIEhic1BhcnNlci55eSA9IHRoaXMueXk7XG5cbiAgLy8gUGFyc2UgaXQgYXMgYSBIYW5kbGViYXJzIHRvIGV4dHJhY3QgdGhlIGltcG9ydGFudCBub2RlcyBmaXJzdC4gVGhlbiB3ZVxuICAvLyBzdHJpbmdpZnkgdGhlIG5vZGUgdG8gc29tZXRoaW5nIHRoZSBIVE1MIHBhcnNlciBjYW4gaGFuZGxlLiBUaGUgQVNUIHRoZVxuICAvLyBIVE1MIHBhcnNlciBnZW5lcmF0ZXMgd2lsbCBiZSBwYXJzZWQgdXNpbmcgSGFuZGxlYmFycyBhZ2FpbiB0byBpbmplY3QgdGhlXG4gIC8vIG9yaWdpbmFsIG5vZGVzIGJhY2suXG4gIHJldHVybiBwYXJzZUFzSFRNTChIYnNQYXJzZXIucGFyc2UoaW5wdXQpKTtcbn07XG5cbi8qKlxuICogRXhwb3J0IGEgc3RhdGljIGluc3RhbmNlIG9mIHRoZSBwYXJzZXIuXG4gKlxuICogQHR5cGUge1BhcnNlcn1cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBuZXcgUGFyc2VyKCk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJ2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9leGNlcHRpb24nKS5kZWZhdWx0O1xuIiwidmFyIGdsb2JhbD10eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge307LyoqXG4gKiBSZXR1cm4gdGhlIGN1cnJlbnQgdGltZXN0YW1wIGludGVnZXIuXG4gKlxuICogQHJldHVybiB7TnVtYmVyfVxuICovXG52YXIgY3VycmVudFRpbWUgPSBnbG9iYWwuRGF0ZS5ub3cgfHwgKGZ1bmN0aW9uICgpIHtcbiAgdmFyIENvbnN0dWN0b3IgPSBnbG9iYWwuRGF0ZTtcblxuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBuZXcgQ29uc3R1Y3RvcigpLmdldFRpbWUoKTtcbiAgfTtcbn0pKCk7XG5cbi8qKlxuICogS2VlcCBsb2NhbCByZWZlcmVuY2VzIHRvIHRoZSB0aW1lb3V0IGZ1bmN0aW9ucy4gVGhpcyBzdG9wcyB1dGlsaXRpZXMgbGlrZVxuICogU2lub24uanMgZnJvbSBicmVha2luZyB0aGUgaW1wbGVtZW50YXRpb24uXG4gKlxuICogQHR5cGUge0Z1bmN0aW9ufVxuICovXG52YXIgc2V0VGltZXIgICA9IGdsb2JhbC5zZXRUaW1lb3V0O1xudmFyIGNsZWFyVGltZXIgPSBnbG9iYWwuY2xlYXJUaW1lb3V0O1xuXG4vKipcbiAqIEZhbGxiYWNrIGFuaW1hdGlvbiBmcmFtZSBpbXBsZW1lbnRhdGlvbi5cbiAqXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqL1xudmFyIGZhbGxiYWNrID0gZnVuY3Rpb24gKCkge1xuICB2YXIgcHJldiA9IGN1cnJlbnRUaW1lKCk7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIChmbikge1xuICAgIHZhciBjdXJyID0gY3VycmVudFRpbWUoKTtcbiAgICB2YXIgbXMgICA9IE1hdGgubWF4KDAsIDE2IC0gKGN1cnIgLSBwcmV2KSk7XG4gICAgdmFyIHJlcSAgPSBzZXRUaW1lcihmbiwgbXMpO1xuXG4gICAgcHJldiA9IGN1cnI7XG5cbiAgICByZXR1cm4gcmVxO1xuICB9O1xufTtcblxuLyoqXG4gKiBFeHBvc2UgYHJlcXVlc3RBbmltYXRpb25GcmFtZWAuXG4gKlxuICogQHR5cGUge0Z1bmN0aW9ufVxuICovXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBnbG9iYWwucmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gIGdsb2JhbC53ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgZ2xvYmFsLm1velJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICBnbG9iYWwubXNSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgZ2xvYmFsLm9SZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgZmFsbGJhY2soKTtcblxuLyoqXG4gKiBDYW5jZWwgdGhlIGFuaW1hdGlvbiBmcmFtZS5cbiAqXG4gKiBAdHlwZSB7RnVuY3Rpb259XG4gKi9cbnZhciBjYW5jZWwgPSBnbG9iYWwuY2FuY2VsQW5pbWF0aW9uRnJhbWUgfHxcbiAgZ2xvYmFsLndlYmtpdENhbmNlbEFuaW1hdGlvbkZyYW1lIHx8XG4gIGdsb2JhbC5tb3pDYW5jZWxBbmltYXRpb25GcmFtZSB8fFxuICBnbG9iYWwubXNDYW5jZWxBbmltYXRpb25GcmFtZSB8fFxuICBnbG9iYWwub0NhbmNlbEFuaW1hdGlvbkZyYW1lIHx8XG4gIGNsZWFyVGltZXI7XG5cbi8qKlxuICogQ2FuY2VsIGFuIGFuaW1hdGlvbiBmcmFtZS5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gaWRcbiAqL1xuZXhwb3J0cy5jYW5jZWwgPSBmdW5jdGlvbiAoaWQpIHtcbiAgY2FuY2VsLmNhbGwoZ2xvYmFsLCBpZCk7XG59O1xuIiwidmFyIGhic1ZNID0gcmVxdWlyZSgnaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL3J1bnRpbWUnKTtcbnZhciBVdGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbnZhciByYWYgICA9IHJlcXVpcmUoJy4vcmFmJyk7XG5cbi8qKlxuICogS2VlcCBhIG1hcCBvZiBhdHRyaWJ1dGVzIHRoYXQgbmVlZCB0byB1cGRhdGUgdGhlIGNvcnJlc3BvbmRpbmcgcHJvcGVydGllcy5cbiAqXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG52YXIgYXR0clByb3BzID0ge1xuICBJTlBVVDoge1xuICAgIHZhbHVlOiAgICd2YWx1ZScsXG4gICAgY2hlY2tlZDogJ2NoZWNrZWQnXG4gIH0sXG4gIE9QVElPTjoge1xuICAgIHNlbGVjdGVkOiAnc2VsZWN0ZWQnXG4gIH1cbn07XG5cbi8qKlxuICogSXRlcmF0ZSBvdmVyIGEgc3Vic2NyaXB0aW9ucyBvYmplY3QsIGNhbGxpbmcgYSBmdW5jdGlvbiB3aXRoIHRoZSBvYmplY3RcbiAqIHByb3BlcnR5IGRldGFpbHMgYW5kIGEgdW5pcXVlIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9ICAgIHN1YnNjcmlwdGlvbnNcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xuICovXG52YXIgaXRlcmF0ZVN1YnNjcmlwdGlvbnMgPSBmdW5jdGlvbiAoc3Vic2NyaXB0aW9ucywgZm4sIGNvbnRleHQpIHtcbiAgZm9yICh2YXIgaWQgaW4gc3Vic2NyaXB0aW9ucykge1xuICAgIGZvciAodmFyIHByb3BlcnR5IGluIHN1YnNjcmlwdGlvbnNbaWRdKSB7XG4gICAgICBmbi5jYWxsKGNvbnRleHQsIHN1YnNjcmlwdGlvbnNbaWRdW3Byb3BlcnR5XSwgcHJvcGVydHksIGlkKTtcbiAgICB9XG4gIH1cbn07XG5cbi8qKlxuICogQ3JlYXRlIGEgbmV3IHN1YnNjaXB0aW9uIGluc3RhbmNlLiBUaGlzIGZ1bmN0aW9uYWxpdHkgaXMgdGlnaHRseSBjb3VwbGVkIHRvXG4gKiBET01CYXJzIHByb2dyYW0gZXhlY3V0aW9uLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSB1cGRhdGVcbiAqIEBwYXJhbSB7T2JqZWN0fSAgIGNvbnRhaW5lclxuICogQHBhcmFtIHtPYmplY3R9ICAgZW52XG4gKi9cbnZhciBTdWJzY3JpcHRpb24gPSBmdW5jdGlvbiAoZm4sIHVwZGF0ZSwgY29udGFpbmVyLCBlbnYpIHtcbiAgLy8gQWxpYXMgcGFzc2VkIGluIHZhcmlhYmxlcyBmb3IgbGF0ZXIgYWNjZXNzLlxuICB0aGlzLl9mbiAgICAgICAgPSBmbjtcbiAgdGhpcy5fdXBkYXRlICAgID0gdXBkYXRlO1xuICB0aGlzLl9jb250YWluZXIgPSBjb250YWluZXI7XG4gIHRoaXMuX2VudiAgICAgICA9IGVudjtcblxuICAvLyBBc3NpZ24gZXZlcnkgc3Vic2NyaXB0aW9uIGluc3RhbmNlIGEgdW5pcXVlIGlkLiBUaGlzIGhlbHBzIHdpdGggbGlua2luZ1xuICAvLyBiZXR3ZWVuIHBhcmVudCBhbmQgY2hpbGQgc3Vic2NyaXB0aW9uIGluc3RhbmNlcy5cbiAgdGhpcy5jaWQgICAgICAgICAgICAgPSAnYycgKyBVdGlscy51bmlxdWVJZCgpO1xuICB0aGlzLmNoaWxkcmVuICAgICAgICA9IHt9O1xuICB0aGlzLnN1YnNjcmlwdGlvbnMgICA9IHt9O1xuICB0aGlzLnVuc3Vic2NyaXB0aW9ucyA9IFtdO1xuXG4gIC8vIENyZWF0ZSBzdGF0aWNhbGx5IGJvdW5kIGZ1bmN0aW9uIGluc3RhbmNlcyBmb3IgcHVibGljIGNvbnN1bXB0aW9uLlxuICB0aGlzLmJvdW5kVXBkYXRlICAgICAgICAgPSBVdGlscy5iaW5kKHRoaXMudXBkYXRlLCB0aGlzKTtcbiAgdGhpcy5ib3VuZFVuc3Vic2NyaXB0aW9uID0gVXRpbHMuYmluZCh0aGlzLnVuc3Vic2NyaXB0aW9uLCB0aGlzKTtcbn07XG5cbi8qKlxuICogRXhwb3NlIHRoZSBpbnRlcm5hbCBzdXNiY3JpYmUgZnVuY3Rpb25hbGl0eSBmb3IgdGhlIGNvbnRhaW5lci5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0XG4gKiBAcGFyYW0ge1N0cmluZ30gcHJvcGVydHlcbiAqIEBwYXJhbSB7U3RyaW5nfSBpZFxuICovXG5TdWJzY3JpcHRpb24ucHJvdG90eXBlLnN1YnNjcmliZSA9IGZ1bmN0aW9uIChvYmplY3QsIHByb3BlcnR5LCBpZCkge1xuICAodGhpcy5zdWJzY3JpcHRpb25zW2lkXSB8fCAodGhpcy5zdWJzY3JpcHRpb25zW2lkXSA9IHt9KSlbcHJvcGVydHldID0gb2JqZWN0O1xufTtcblxuLyoqXG4gKiBQYXNzIGEgY3VzdG9tIHVuc3Vic2NyaXB0aW9uIGZ1bmN0aW9uIHRoYXQgd2lsbCBleGVjdXRlIHdoZW4gd2UgdW5zdWJzY3JpYmUuXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqL1xuU3Vic2NyaXB0aW9uLnByb3RvdHlwZS51bnN1YnNjcmlwdGlvbiA9IGZ1bmN0aW9uIChmbikge1xuICBVdGlscy5pc0Z1bmN0aW9uKGZuKSAmJiB0aGlzLnVuc3Vic2NyaXB0aW9ucy5wdXNoKGZuKTtcbn07XG5cbi8qKlxuICogVW5zdWJzY3JpYmUgZnJvbSBhIHN1YmNyaXB0aW9ucyBvYmplY3QuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHN1YnNjcmlwdGlvbnNcbiAqL1xuU3Vic2NyaXB0aW9uLnByb3RvdHlwZS5fdW5zdWJzY3JpYmUgPSBmdW5jdGlvbiAoc3Vic2NyaXB0aW9ucykge1xuICBpdGVyYXRlU3Vic2NyaXB0aW9ucyhzdWJzY3JpcHRpb25zLCBmdW5jdGlvbiAob2JqZWN0LCBwcm9wZXJ0eSwgaWQpIHtcbiAgICBkZWxldGUgc3Vic2NyaXB0aW9uc1tpZF1bcHJvcGVydHldO1xuICAgIHRoaXMuX2Vudi51bnN1YnNjcmliZShvYmplY3QsIHByb3BlcnR5LCB0aGlzLmJvdW5kVXBkYXRlKTtcbiAgfSwgdGhpcyk7XG59O1xuXG4vKipcbiAqIEl0ZXJhdGUgb3ZlciBhbiBhcnJheSBvZiB1bnN1YnNjcmlwdGlvbnMuXG4gKlxuICogQHBhcmFtIHtBcnJheX0gdW5zdWJzY3JpcHRpb25zXG4gKi9cblN1YnNjcmlwdGlvbi5wcm90b3R5cGUuX3Vuc3Vic2NyaXB0aW9uID0gZnVuY3Rpb24gKHVuc3Vic2NyaXB0aW9ucykge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHVuc3Vic2NyaXB0aW9ucy5sZW5ndGg7IGkrKykge1xuICAgIHVuc3Vic2NyaXB0aW9uc1tpXSgpO1xuICB9XG59O1xuXG4vKipcbiAqIFVuc3Vic2NyaWJlIGV2ZXJ5dGhpbmcgZnJvbSB0aGUgY3VycmVudCBpbnN0YW5jZS5cbiAqL1xuU3Vic2NyaXB0aW9uLnByb3RvdHlwZS51bnN1YnNjcmliZSA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5fdW5zdWJzY3JpYmUodGhpcy5zdWJzY3JpcHRpb25zKTtcbiAgdGhpcy5fdW5zdWJzY3JpcHRpb24odGhpcy51bnN1YnNjcmlwdGlvbnMpO1xuXG4gIC8vIERlbGV0ZSBhbnkgcmVmZXJlbmNlIHRvIHRoaXMgc3Vic2NyaXB0aW9uIGZyb20gdGhlIHBhcmVudC5cbiAgaWYgKHRoaXMucGFyZW50KSB7XG4gICAgZGVsZXRlIHRoaXMucGFyZW50LmNoaWxkcmVuW3RoaXMuY2lkXTtcbiAgICBkZWxldGUgdGhpcy5wYXJlbnQ7XG4gIH1cblxuICAvLyBDYW5jZWwgYW55IGN1cnJlbnRseSBleGVjdXRpbmcgZnVuY3Rpb25zLiBXZSBhbHNvIG5lZWQgdG8gc2V0IGFuXG4gIC8vIHVuc3Vic2NyaWJlZCBmbGFnIGluIGNhc2UgdGhlIGZ1bmN0aW9uIGlzIHN0aWxsIGF2YWlsYWJsZSBzb21ld2hlcmUgYW5kXG4gIC8vIGNhbGxlZCBhZnRlciB1bnN1YnNjcmlwdGlvbiBoYXMgb2NjdXJlZC5cbiAgVk0uZXhlYy5jYW5jZWwodGhpcy5fZXhlY0lkKTtcbiAgdGhpcy5fdW5zdWJzY3JpYmVkID0gdHJ1ZTtcbiAgdGhpcy5fdW5zdWJzY3JpYmVDaGlsZHJlbigpO1xuXG4gIC8vIFJlbW92ZSB1bndhbnRlZCBsaW5nZXJpbmcgcmVmZXJlbmNlcy5cbiAgZGVsZXRlIHRoaXMuY2hpbGRyZW47XG4gIGRlbGV0ZSB0aGlzLnN1YnNjcmlwdGlvbnM7XG4gIGRlbGV0ZSB0aGlzLnVuc3Vic2NyaXB0aW9ucztcbiAgZGVsZXRlIHRoaXMuX2ZuO1xuICBkZWxldGUgdGhpcy5fZW52O1xuICBkZWxldGUgdGhpcy5fdXBkYXRlO1xuICBkZWxldGUgdGhpcy5fY29udGFpbmVyO1xuICBkZWxldGUgdGhpcy5ib3VuZFVwZGF0ZTtcbiAgZGVsZXRlIHRoaXMuYm91bmRVbnN1YnNjcmlwdGlvbjtcbn07XG5cbi8qKlxuICogVW5zdWJzY3JpYmUgdGhlIGN1cnJlbnQgaW5zdGFuY2UgY2hpbGRyZW4uXG4gKi9cblN1YnNjcmlwdGlvbi5wcm90b3R5cGUuX3Vuc3Vic2NyaWJlQ2hpbGRyZW4gPSBmdW5jdGlvbiAoKSB7XG4gIGZvciAodmFyIGNoaWxkIGluIHRoaXMuY2hpbGRyZW4pIHtcbiAgICB0aGlzLmNoaWxkcmVuW2NoaWxkXS51bnN1YnNjcmliZSgpO1xuICB9XG59O1xuXG4vKipcbiAqIEV4ZWN1dGUgdGhlIHN1YnNjcmlwdGlvbiBmdW5jdGlvbi5cbiAqXG4gKiBAcmV0dXJuIHsqfVxuICovXG5TdWJzY3JpcHRpb24ucHJvdG90eXBlLmV4ZWN1dGUgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIElmIHdlIGhhdmUgYW4gZXhpc3Rpbmcgc3Vic2NyaXB0aW9uLCBsaW5rIHRoZSBzdWJzY3JpcHRpb25zIHRvZ2V0aGVyLlxuICBpZiAodGhpcy5fY29udGFpbmVyLnN1YnNjcmlwdGlvbikge1xuICAgIHRoaXMucGFyZW50ID0gdGhpcy5fY29udGFpbmVyLnN1YnNjcmlwdGlvbjtcbiAgICB0aGlzLnBhcmVudC5jaGlsZHJlblt0aGlzLmNpZF0gPSB0aGlzO1xuICB9XG5cbiAgLy8gQWxpYXMgdGhlIGN1cnJlbnQgc3Vic2NyaXB0aW9ucyBvYmplY3QgZm9yIGRpZmZpbmcgYWZ0ZXIgZXhlY3V0aW9uLlxuICB0aGlzLl9zdWJzY3JpcHRpb25zID0gdGhpcy5zdWJzY3JpcHRpb25zO1xuICB0aGlzLl91bnN1YnNjcmlwdGlvbih0aGlzLnVuc3Vic2NyaXB0aW9ucyk7XG5cbiAgLy8gUmVzZXQgdGhlIHN1YnNjcmlwdGlvbnMgYW5kIHVuc3Vic2NyaXB0aW9ucyBvYmplY3RzIGJlZm9yZSBleGVjdXRpb24uXG4gIHRoaXMuc3Vic2NyaXB0aW9ucyAgID0ge307XG4gIHRoaXMudW5zdWJzY3JpcHRpb25zID0gW107XG5cbiAgdGhpcy5fY29udGFpbmVyLnN1YnNjcmlwdGlvbiA9IHRoaXM7XG4gIHZhciByZXN1bHQgPSB0aGlzLl9mbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB0aGlzLl9jb250YWluZXIuc3Vic2NyaXB0aW9uID0gdGhpcy5wYXJlbnQ7XG5cbiAgLy8gVGhlIGN1cnJlbnQgc3Vic2NyaXB0aW9ucyBvYmplY3QgbmVlZHMgdG8gYmUgY29tcGFyZWQgYWdhaW5zdCB0aGUgcHJldmlvdXNcbiAgLy8gc3Vic2NyaXB0aW9ucyBhbmQgYW55IGRpZmZlbmNlcyBmaXhlZC5cbiAgdmFyIGN1cnJlbnQgID0gdGhpcy5zdWJzY3JpcHRpb25zO1xuICB2YXIgcHJldmlvdXMgPSB0aGlzLl9zdWJzY3JpcHRpb25zO1xuXG4gIC8vIEl0ZXJhdGUgb3ZlciB0aGUgbmV3IHN1YnNjcmlwdGlvbnMgb2JqZWN0LiBDaGVjayBldmVyeSBrZXkgaW4gdGhlIG9iamVjdFxuICAvLyBhZ2FpbnN0IHRoZSBwcmV2aW91cyBzdWJzY3JpcHRpb25zLiBJZiBpdCBleGlzdHMgaW4gdGhlIHByZXZpb3VzIG9iamVjdCxcbiAgLy8gaXQgbWVhbnMgd2UgYXJlIGFscmVhZHkgc3Vic2NyaWJlZC4gT3RoZXJ3aXNlIHdlIG5lZWQgdG8gc3Vic2NyaWJlIHRvXG4gIC8vIHRoZSBuZXcgcHJvcGVydHkuXG4gIGl0ZXJhdGVTdWJzY3JpcHRpb25zKGN1cnJlbnQsIGZ1bmN0aW9uIChvYmplY3QsIHByb3BlcnR5LCBpZCkge1xuICAgIGlmIChwcmV2aW91c1tpZF0gJiYgcHJldmlvdXNbaWRdW3Byb3BlcnR5XSkge1xuICAgICAgcmV0dXJuIGRlbGV0ZSBwcmV2aW91c1tpZF1bcHJvcGVydHldO1xuICAgIH1cblxuICAgIHRoaXMuX2Vudi5zdWJzY3JpYmUob2JqZWN0LCBwcm9wZXJ0eSwgdGhpcy5ib3VuZFVwZGF0ZSk7XG4gIH0sIHRoaXMpO1xuXG4gIC8vIEl0ZXJhdGUgb3ZlciBhbGwgcmVtYWluaW5nIHByZXZpb3VzIHN1YnNjcmlwdGlvbnMgYW5kIHVuc3Vic2NyaWJlIHRoZW0uXG4gIGRlbGV0ZSB0aGlzLl9zdWJzY3JpcHRpb25zO1xuICB0aGlzLl91bnN1YnNjcmliZShwcmV2aW91cyk7XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8qKlxuICogVXBkYXRlIHRoZSBzdXNiY3JpcHRpb24gaW5zdGFuY2Ugd2l0aCBjaGFuZ2VzLlxuICpcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKi9cblN1YnNjcmlwdGlvbi5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5fdHJpZ2dlcmVkIHx8IHRoaXMuX3Vuc3Vic2NyaWJlZCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIEJsb2NrIHRyaWdnZXJzIGZyb20gb2NjdXJpbmcgYmV0d2VlbiBhbmltYXRpb24gZnJhbWVzLlxuICB0aGlzLl90cmlnZ2VyZWQgPSB0cnVlO1xuICB0aGlzLl91bnN1YnNjcmliZUNoaWxkcmVuKCk7XG5cbiAgdGhpcy5fZXhlY0lkID0gVk0uZXhlYyhVdGlscy5iaW5kKGZ1bmN0aW9uICgpIHtcbiAgICBkZWxldGUgdGhpcy5fdHJpZ2dlcmVkO1xuICAgIHRoaXMuX3VwZGF0ZSh0aGlzLmV4ZWN1dGUoKSk7XG4gIH0sIHRoaXMpKTtcblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogRXh0ZW5kIHRoZSBIYW5kbGViYXJzIHJ1bnRpbWUgZW52aXJvbm1lbnQgd2l0aCBET00gc3BlY2lmaWMgaGVscGVycy5cbiAqXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG52YXIgVk0gPSBtb2R1bGUuZXhwb3J0cyA9IFV0aWxzLmNyZWF0ZShoYnNWTSk7XG5cbi8qKlxuICogQmluZCBhIGZ1bmN0aW9uIHRvIHRoZSBhbmltYXRpb24gZnJhbWUuXG4gKlxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtOdW1iZXJ9XG4gKi9cblZNLmV4ZWMgPSBmdW5jdGlvbiAoZm4pIHtcbiAgcmV0dXJuIHJhZihmbik7XG59O1xuXG4vKipcbiAqIENhbmNlbCBhbiBleGVjdXRpb24uXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IGlkXG4gKi9cblZNLmV4ZWMuY2FuY2VsID0gZnVuY3Rpb24gKGlkKSB7XG4gIHJldHVybiByYWYuY2FuY2VsKGlkKTtcbn07XG5cbi8qKlxuICogQ3JlYXRlIGFuIGVsZW1lbnQgZnJvbSBhIHRhZyBuYW1lLlxuICpcbiAqIEBwYXJhbSAge1N0cmluZ30gdGFnTmFtZVxuICogQHBhcmFtICB7T2JqZWN0fSBlbnZcbiAqIEByZXR1cm4ge05vZGV9XG4gKi9cblZNLmNyZWF0ZUVsZW1lbnQgPSBmdW5jdGlvbiAodGFnTmFtZSkge1xuICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0YWdOYW1lKTtcbn07XG5cbi8qKlxuICogQ29weSBhbGwgdGhlIGRhdGEgZnJvbSBvbmUgZWxlbWVudCB0byBhbm90aGVyIGFuZCByZXBsYWNlIGluIHBsYWNlLlxuICpcbiAqIEBwYXJhbSAge05vZGV9ICAgbm9kZVxuICogQHBhcmFtICB7U3RyaW5nfSB0YWdOYW1lXG4gKiBAcGFyYW0gIHtPYmplY3R9IGVudlxuICogQHJldHVybiB7Tm9kZX1cbiAqL1xuVk0uc2V0VGFnTmFtZSA9IGZ1bmN0aW9uIChub2RlLCB0YWdOYW1lKSB7XG4gIHZhciBuZXdOb2RlID0gVk0uY3JlYXRlRWxlbWVudCh0YWdOYW1lKTtcblxuICAvLyBNb3ZlIGFsbCBjaGlsZCBlbGVtZW50cyB0byB0aGUgbmV3IG5vZGUuXG4gIHdoaWxlIChub2RlLmZpcnN0Q2hpbGQpIHtcbiAgICBuZXdOb2RlLmFwcGVuZENoaWxkKG5vZGUuZmlyc3RDaGlsZCk7XG4gIH1cblxuICAvLyBDb3B5IGFsbCB0aGUgYXR0cmlidXRlcyB0byB0aGUgbmV3IG5vZGUuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZS5hdHRyaWJ1dGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGF0dHJpYnV0ZSA9IG5vZGUuYXR0cmlidXRlc1tpXTtcbiAgICBWTS5zZXRBdHRyaWJ1dGUobmV3Tm9kZSwgYXR0cmlidXRlLm5hbWUsIGF0dHJpYnV0ZS52YWx1ZSk7XG4gIH1cblxuICAvLyBSZXBsYWNlIHRoZSBub2RlIHBvc2l0aW9uIGluIHRoZSBwbGFjZS5cbiAgbm9kZS5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChuZXdOb2RlLCBub2RlKTtcblxuICByZXR1cm4gbmV3Tm9kZTtcbn07XG5cbi8qKlxuICogUmVtb3ZlIGFuIGF0dHJpYnV0ZSBmcm9tIGFuIGVsZW1lbnQuXG4gKlxuICogQHBhcmFtIHtOb2RlfSAgIGVsXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICogQHBhcmFtIHtPYmplY3R9IGVudlxuICovXG5WTS5yZW1vdmVBdHRyaWJ1dGUgPSBmdW5jdGlvbiAoZWwsIG5hbWUpIHtcbiAgaWYgKCFlbC5oYXNBdHRyaWJ1dGUobmFtZSkpIHsgcmV0dXJuOyB9XG5cbiAgZWwucmVtb3ZlQXR0cmlidXRlKG5hbWUpO1xuXG4gIC8vIFVuc2V0IHRoZSBET00gcHJvcGVydHkgd2hlbiB0aGUgYXR0cmlidXRlIGlzIHJlbW92ZWQuXG4gIGlmIChhdHRyUHJvcHNbZWwudGFnTmFtZV0gJiYgYXR0clByb3BzW2VsLnRhZ05hbWVdW25hbWVdKSB7XG4gICAgZWxbYXR0clByb3BzW2VsLnRhZ05hbWVdW25hbWVdXSA9IG51bGw7XG4gIH1cbn07XG5cbi8qKlxuICogU2V0IGFuIGF0dHJpYnV0ZSB2YWx1ZSBvbiBhbiBlbGVtZW50LlxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gICBlbFxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAqIEBwYXJhbSB7Kn0gICAgICB2YWx1ZVxuICogQHBhcmFtIHtPYmplY3R9IGVudlxuICovXG5WTS5zZXRBdHRyaWJ1dGUgPSBmdW5jdGlvbiAoZWwsIG5hbWUsIHZhbHVlKSB7XG4gIGlmICh2YWx1ZSA9PT0gZmFsc2UpIHtcbiAgICByZXR1cm4gVk0ucmVtb3ZlQXR0cmlidXRlKGVsLCBuYW1lKTtcbiAgfVxuXG4gIC8vIFNldCB0aGUgYXR0cmlidXRlIHZhbHVlIHRvIHRoZSBuYW1lIHdoZW4gdGhlIHZhbHVlIGlzIGB0cnVlYC5cbiAgZWwuc2V0QXR0cmlidXRlKG5hbWUsIHZhbHVlID09PSB0cnVlID8gbmFtZSA6IHZhbHVlKTtcblxuICAvLyBVcGRhdGUgdGhlIERPTSBwcm9wZXJ0eSB3aGVuIHRoZSBhdHRyaWJ1dGUgY2hhbmdlcy5cbiAgaWYgKGF0dHJQcm9wc1tlbC50YWdOYW1lXSAmJiBhdHRyUHJvcHNbZWwudGFnTmFtZV1bbmFtZV0pIHtcbiAgICBlbFthdHRyUHJvcHNbZWwudGFnTmFtZV1bbmFtZV1dID0gdmFsdWU7XG4gIH1cbn07XG5cbi8qKlxuICogQ3JlYXRlIGEgY29tbWVudCBub2RlIGJhc2VkIG9uIHRleHQgY29udGVudHMuXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSBjb250ZW50c1xuICogQHBhcmFtICB7T2JqZWN0fSBlbnZcbiAqIEByZXR1cm4ge05vZGV9XG4gKi9cblZNLmNyZWF0ZUNvbW1lbnQgPSBmdW5jdGlvbiAoY29tbWVudCkge1xuICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlQ29tbWVudChjb21tZW50KTtcbn07XG5cbi8qKlxuICogR2VuZXJhdGUgYW4gZXhlY3V0YWJsZSB0ZW1wbGF0ZSBmcm9tIGEgdGVtcGxhdGUgc3BlYy5cbiAqXG4gKiBAcGFyYW0gIHtPYmplY3R9ICAgdGVtcGxhdGVTcGVjXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqL1xuVk0udGVtcGxhdGUgPSBmdW5jdGlvbiAodGVtcGxhdGVTcGVjLCBlbnYpIHtcbiAgLyoqXG4gICAqIFN1YnNjcmliZXIgdG8gZnVuY3Rpb24gaW4gdGhlIERPTUJhcnMgZXhlY3V0aW9uIGluc3RhbmNlLlxuICAgKlxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGNyZWF0ZVxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gdXBkYXRlXG4gICAqIEByZXR1cm4ge09iamVjdH1cbiAgICovXG4gIHZhciBzdWJzY3JpYmUgPSBmdW5jdGlvbiAoZm4sIGNyZWF0ZSwgdXBkYXRlKSB7XG4gICAgdmFyIHN1YnNjcmliZXIgPSBuZXcgU3Vic2NyaXB0aW9uKGZuLCB1cGRhdGUsIGNvbnRhaW5lciwgZW52KTtcblxuICAgIC8vIEltbWVkaWF0ZWx5IGFsaWFzIHRoZSBzdGFydGluZyB2YWx1ZS5cbiAgICBzdWJzY3JpYmVyLnZhbHVlID0gc3Vic2NyaWJlci5leGVjdXRlKCk7XG4gICAgVXRpbHMuaXNGdW5jdGlvbihjcmVhdGUpICYmIChzdWJzY3JpYmVyLnZhbHVlID0gY3JlYXRlKHN1YnNjcmliZXIudmFsdWUpKTtcblxuICAgIHJldHVybiBzdWJzY3JpYmVyO1xuICB9O1xuXG4gIC8qKlxuICAgKiBXcmFwIGEgZnVuY3Rpb24gd2l0aCBhIHNhbml0aXplZCBwdWJsaWMgc3Vic2NyaWJlciBvYmplY3QuXG4gICAqXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICAgKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAgICovXG4gIHZhciB3cmFwUHJvZ3JhbSA9IGZ1bmN0aW9uIChmbikge1xuICAgIHZhciB3cmFwcGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIHN1YnNjcmliZXIgPSBuZXcgU3Vic2NyaXB0aW9uKGZuLCBudWxsLCBjb250YWluZXIsIGVudik7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHZhbHVlOiAgICAgICBzdWJzY3JpYmVyLmV4ZWN1dGUuYXBwbHkoc3Vic2NyaWJlciwgYXJndW1lbnRzKSxcbiAgICAgICAgdW5zdWJzY3JpYmU6IFV0aWxzLmJpbmQoc3Vic2NyaWJlci51bnN1YnNjcmliZSwgc3Vic2NyaWJlcilcbiAgICAgIH07XG4gICAgfTtcblxuICAgIC8vIEV4dGVuZCB0aGUgd3JhcHBlciBmdW5jdGlvbiB3aXRoIHByb3BlcnRpZXMgb2YgdGhlIHBhc3NlZCBpbiBmdW5jdGlvbi5cbiAgICBVdGlscy5leHRlbmQod3JhcHBlciwgZm4pO1xuXG4gICAgcmV0dXJuIHdyYXBwZXI7XG4gIH07XG5cbiAgLyoqXG4gICAqIFRoZSBjb250YWluZXIgb2JqZWN0IGhvbGRzIGFsbCB0aGUgZnVuY3Rpb25zIHVzZWQgYnkgdGhlIHRlbXBsYXRlIHNwZWMuXG4gICAqXG4gICAqIEB0eXBlIHtPYmplY3R9XG4gICAqL1xuICB2YXIgY29udGFpbmVyID0ge1xuICAgIGludm9rZVBhcnRpYWw6ICAgIFZNLmludm9rZVBhcnRpYWwsXG4gICAgcHJvZ3JhbXM6ICAgICAgICAgW10sXG4gICAgbm9vcDogICAgICAgICAgICAgVk0ubm9vcCxcbiAgICBwYXJ0aWFsOiAgICAgICAgICBVdGlscy5wYXJ0aWFsLFxuICAgIHdyYXBQcm9ncmFtOiAgICAgIHdyYXBQcm9ncmFtLFxuICAgIGVzY2FwZUV4cHJlc3Npb246IFV0aWxzLmVzY2FwZUV4cHJlc3Npb24sXG4gICAgcHJvZ3JhbVdpdGhEZXB0aDogVk0ucHJvZ3JhbVdpdGhEZXB0aFxuICB9O1xuXG4gIC8qKlxuICAgKiBSZW5kZXIgYW5kIHN1YnNjcmliZSBhIHNpbmdsZSBET00gbm9kZSB1c2luZyBhIGN1c3RvbSBjcmVhdGlvbiBmdW5jdGlvbi5cbiAgICpcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBjcmVhdGVcbiAgICogQHJldHVybiB7Tm9kZX1cbiAgICovXG4gIHZhciBzdWJzY3JpYmVOb2RlID0gZnVuY3Rpb24gKGZuLCBjcmVhdGUpIHtcbiAgICByZXR1cm4gc3Vic2NyaWJlKGZuLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHJldHVybiBVdGlscy50cmFja05vZGUoY3JlYXRlKHZhbHVlKSk7XG4gICAgfSwgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICB0aGlzLnZhbHVlLnJlcGxhY2UoY3JlYXRlKHZhbHVlKSk7XG4gICAgfSkudmFsdWUuZnJhZ21lbnQ7XG4gIH07XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhbiBlbGVtZW50IGFuZCBzdWJzY3JpYmUgdG8gYW55IGNoYW5nZXMuIFRoaXMgbWV0aG9kIHJlcXVpcmVzIGFcbiAgICogY2FsbGJhY2sgZnVuY3Rpb24gZm9yIGFueSBlbGVtZW50IGNoYW5nZXMgc2luY2UgeW91IGNhbid0IGNoYW5nZSBhIHRhZ1xuICAgKiBuYW1lIGluIHBsYWNlLlxuICAgKlxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGNiXG4gICAqIEByZXR1cm4ge0VsZW1lbnR9XG4gICAqL1xuICBjb250YWluZXIuY3JlYXRlRWxlbWVudCA9IGZ1bmN0aW9uIChmbiwgY2IpIHtcbiAgICByZXR1cm4gc3Vic2NyaWJlKGZuLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHJldHVybiBWTS5jcmVhdGVFbGVtZW50KHZhbHVlLCBlbnYpO1xuICAgIH0sIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgY2IodGhpcy52YWx1ZSA9IFZNLnNldFRhZ05hbWUodGhpcy52YWx1ZSwgdmFsdWUsIGVudikpO1xuICAgIH0pLnZhbHVlO1xuICB9O1xuXG4gIC8qKlxuICAgKiBBcHBlbmQgYW4gZWxlbWVudCB0byB0aGUgZW5kIG9mIGFub3RoZXIgZWxlbWVudC5cbiAgICpcbiAgICogQHBhcmFtIHtOb2RlfSBwYXJlbnRcbiAgICogQHBhcmFtIHtOb2RlfSBjaGlsZFxuICAgKi9cbiAgY29udGFpbmVyLmFwcGVuZENoaWxkID0gZnVuY3Rpb24gKHBhcmVudCwgY2hpbGQpIHtcbiAgICBjaGlsZCAmJiBwYXJlbnQuYXBwZW5kQ2hpbGQoY2hpbGQpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBTZXQgYW4gZWxlbWVudHMgYXR0cmlidXRlLiBXZSBhY2NlcHQgdGhlIGN1cnJlbnQgZWxlbWVudCBhIGZ1bmN0aW9uXG4gICAqIGJlY2F1c2Ugd2hlbiBhIHRhZyBuYW1lIGNoYW5nZXMgd2Ugd2lsbCBsb3NlIHJlZmVyZW5jZSB0byB0aGUgYWN0aXZlbHlcbiAgICogcmVuZGVyZWQgZWxlbWVudC5cbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY3VycmVudEVsXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IG5hbWVGblxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSB2YWx1ZUZuXG4gICAqL1xuICBjb250YWluZXIuc2V0QXR0cmlidXRlID0gZnVuY3Rpb24gKGN1cnJlbnRFbCwgbmFtZUZuLCB2YWx1ZUZuKSB7XG4gICAgdmFyIGF0dHJOYW1lID0gc3Vic2NyaWJlKG5hbWVGbiwgbnVsbCwgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICBWTS5yZW1vdmVBdHRyaWJ1dGUoY3VycmVudEVsKCksIHRoaXMudmFsdWUpO1xuICAgICAgVk0uc2V0QXR0cmlidXRlKGN1cnJlbnRFbCgpLCB0aGlzLnZhbHVlID0gdmFsdWUsIGF0dHJWYWx1ZS52YWx1ZSk7XG4gICAgfSk7XG5cbiAgICB2YXIgYXR0clZhbHVlID0gc3Vic2NyaWJlKHZhbHVlRm4sIG51bGwsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgVk0uc2V0QXR0cmlidXRlKGN1cnJlbnRFbCgpLCBhdHRyTmFtZS52YWx1ZSwgdGhpcy52YWx1ZSA9IHZhbHVlKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBWTS5zZXRBdHRyaWJ1dGUoY3VycmVudEVsKCksIGF0dHJOYW1lLnZhbHVlLCBhdHRyVmFsdWUudmFsdWUpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBET00gZWxlbWVudCBhbmQgc3Vic2NyaWJlIHRvIGFueSBjaGFuZ2VzLlxuICAgKlxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAgICogQHJldHVybiB7Tm9kZX1cbiAgICovXG4gIGNvbnRhaW5lci5jcmVhdGVET00gPSBmdW5jdGlvbiAoZm4pIHtcbiAgICByZXR1cm4gc3Vic2NyaWJlTm9kZShmbiwgVXRpbHMuZG9taWZ5RXhwcmVzc2lvbik7XG4gIH07XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIHRleHQgbm9kZSBhbmQgc3Vic2NyaWJlIHRvIGFueSBjaGFuZ2VzLlxuICAgKlxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAgICogQHJldHVybiB7VGV4dH1cbiAgICovXG4gIGNvbnRhaW5lci5jcmVhdGVUZXh0ID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgcmV0dXJuIHN1YnNjcmliZU5vZGUoZm4sIFV0aWxzLnRleHRpZnlFeHByZXNzaW9uKTtcbiAgfTtcblxuICAvKipcbiAgICogQ3JlYXRlIGEgY29tbWVudCBub2RlIGFuZCBzdWJzY3JpYmUgdG8gYW55IGNoYW5nZXMuXG4gICAqXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICAgKiBAcmV0dXJuIHtDb21tZW50fVxuICAgKi9cbiAgY29udGFpbmVyLmNyZWF0ZUNvbW1lbnQgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICByZXR1cm4gc3Vic2NyaWJlKGZuLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHJldHVybiBWTS5jcmVhdGVDb21tZW50KHZhbHVlKTtcbiAgICB9LCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHRoaXMudmFsdWUudGV4dENvbnRlbnQgPSB2YWx1ZTtcbiAgICB9KS52YWx1ZTtcbiAgfTtcblxuICAvKipcbiAgICogQ3JlYXRlIGFuZCByZXR1cm4gYSBwcm9ncmFtIHNpbmdsZXRvbiBiYXNlZCBvbiBpbmRleC5cbiAgICpcbiAgICogQHBhcmFtICB7TnVtYmVyfSAgIGlcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gICAqIEBwYXJhbSAge09iamVjdH0gICBkYXRhXG4gICAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICAgKi9cbiAgY29udGFpbmVyLnByb2dyYW0gPSBmdW5jdGlvbiAoaSwgZm4sIGRhdGEpIHtcbiAgICB2YXIgcHJvZ3JhbVdyYXBwZXIgPSBjb250YWluZXIucHJvZ3JhbXNbaV07XG5cbiAgICBpZiAoZGF0YSkge1xuICAgICAgcmV0dXJuIFZNLnByb2dyYW0oaSwgZm4sIGRhdGEpO1xuICAgIH1cblxuICAgIGlmICghcHJvZ3JhbVdyYXBwZXIpIHtcbiAgICAgIHJldHVybiBjb250YWluZXIucHJvZ3JhbXNbaV0gPSBWTS5wcm9ncmFtKGksIGZuKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcHJvZ3JhbVdyYXBwZXI7XG4gIH07XG5cbiAgLyoqXG4gICAqIE1lcmdlIHR3byBvYmplY3RzIGludG8gYSBzaW5nbGUgb2JqZWN0LlxuICAgKlxuICAgKiBAcGFyYW0gIHtPYmplY3R9IHBhcmFtXG4gICAqIEBwYXJhbSAge09iamVjdH0gY29tbW9uXG4gICAqIEByZXR1cm4ge09iamVjdH1cbiAgICovXG4gIGNvbnRhaW5lci5tZXJnZSA9IGZ1bmN0aW9uIChwYXJhbSwgY29tbW9uKSB7XG4gICAgdmFyIHJldCA9IHBhcmFtIHx8IGNvbW1vbjtcblxuICAgIGlmIChwYXJhbSAmJiBjb21tb24gJiYgKHBhcmFtICE9PSBjb21tb24pKSB7XG4gICAgICByZXQgPSB7fTtcbiAgICAgIFV0aWxzLmV4dGVuZChyZXQsIGNvbW1vbik7XG4gICAgICBVdGlscy5leHRlbmQocmV0LCBwYXJhbSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldDtcbiAgfTtcblxuICAvKipcbiAgICogR2V0IGEgcHJvcGVydHkgZnJvbSBhbiBvYmplY3QuIFBhc3NlcyBpbiB0aGUgb2JqZWN0IGlkIChkZXB0aCkgdG8gbWFrZSBpdFxuICAgKiBtdWNoIGZhc3RlciB0byBkbyBjb21wYXJpc29ucyBiZXR3ZWVuIG5ldyBhbmQgb2xkIHN1YnNjcmlwdGlvbnMuXG4gICAqXG4gICAqIEBwYXJhbSAge09iamVjdH0gb2JqZWN0XG4gICAqIEBwYXJhbSAge1N0cmluZ30gcHJvcGVydHlcbiAgICogQHBhcmFtICB7U3RyaW5nfSBpZFxuICAgKiBAcmV0dXJuIHsqfVxuICAgKi9cbiAgY29udGFpbmVyLmdldCA9IGZ1bmN0aW9uIChvYmplY3QsIHByb3BlcnR5LCBpZCkge1xuICAgIGNvbnRhaW5lci5zdWJzY3JpcHRpb24uc3Vic2NyaWJlKG9iamVjdCwgcHJvcGVydHksIGlkKTtcbiAgICByZXR1cm4gZW52LmdldChvYmplY3QsIHByb3BlcnR5KTtcbiAgfTtcblxuICAvKipcbiAgICogUmV0dXJuIHRoZSBjb21waWxlZCBKYXZhU2NyaXB0IGZ1bmN0aW9uIGZvciBleGVjdXRpb24uXG4gICAqXG4gICAqIEBwYXJhbSAge09iamVjdH0gY29udGV4dFxuICAgKiBAcGFyYW0gIHtPYmplY3R9IG9wdGlvbnNcbiAgICogQHJldHVybiB7Tm9kZX1cbiAgICovXG4gIHJldHVybiB3cmFwUHJvZ3JhbShmdW5jdGlvbiAoY29udGV4dCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgdmFyIG5hbWVzcGFjZSA9IG9wdGlvbnMucGFydGlhbCA/IG9wdGlvbnMgOiBlbnY7XG4gICAgdmFyIGhlbHBlcnM7XG4gICAgdmFyIHBhcnRpYWxzO1xuXG4gICAgaWYgKCFvcHRpb25zLnBhcnRpYWwpIHtcbiAgICAgIGhlbHBlcnMgID0gb3B0aW9ucy5oZWxwZXJzO1xuICAgICAgcGFydGlhbHMgPSBvcHRpb25zLnBhcnRpYWxzO1xuICAgIH1cblxuICAgIHZhciByZXN1bHQgPSB0ZW1wbGF0ZVNwZWMuY2FsbChcbiAgICAgIGNvbnRhaW5lcixcbiAgICAgIG5hbWVzcGFjZSxcbiAgICAgIGNvbnRleHQsXG4gICAgICBoZWxwZXJzLFxuICAgICAgcGFydGlhbHMsXG4gICAgICBvcHRpb25zLmRhdGFcbiAgICApO1xuXG4gICAgaWYgKCFvcHRpb25zLnBhcnRpYWwpIHtcbiAgICAgIGVudi5WTS5jaGVja1JldmlzaW9uKGNvbnRhaW5lci5jb21waWxlckluZm8pO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH0pO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL3NhZmUtc3RyaW5nJykuZGVmYXVsdDtcbiIsInZhciBUcmFja05vZGUgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChub2RlKSB7XG4gIHRoaXMuZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG5cbiAgLy8gSW5zdGFudGx5IGFwcGVuZCBhIGJlZm9yZSBhbmQgYWZ0ZXIgdHJhY2tpbmcgbm9kZS5cbiAgdGhpcy5iZWZvcmUgPSB0aGlzLmZyYWdtZW50LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKSk7XG4gIHRoaXMuYWZ0ZXIgID0gdGhpcy5mcmFnbWVudC5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJykpO1xuXG4gIC8vIEFwcGVuZCB0aGUgcGFzc2VkIGluIG5vZGUgdG8gdGhlIGN1cnJlbnQgZnJhZ21lbnQuXG4gIG5vZGUgJiYgdGhpcy5hcHBlbmRDaGlsZChub2RlKTtcbn07XG5cbi8qKlxuICogQXBwZW5kIGEgbm9kZSB0byB0aGUgY3VycmVudCB0cmFja2luZyBmcmFnbWVudC5cbiAqXG4gKiBAcGFyYW0gIHtOb2RlfSBub2RlXG4gKiBAcmV0dXJuIHt0aGlzfVxuICovXG5UcmFja05vZGUucHJvdG90eXBlLmFwcGVuZENoaWxkID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgdGhpcy5hZnRlci5wYXJlbnROb2RlLmluc2VydEJlZm9yZShub2RlLCB0aGlzLmFmdGVyKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUHJlcGVuZCBhIG5vZGUgdG8gdGhlIGN1cnJlbnQgdHJhY2tpbmcgZnJhZ21lbnQuXG4gKlxuICogQHBhcmFtICB7Tm9kZX0gbm9kZVxuICogQHJldHVybiB7dGhpc31cbiAqL1xuVHJhY2tOb2RlLnByb3RvdHlwZS5wcmVwZW5kQ2hpbGQgPSBmdW5jdGlvbiAobm9kZSkge1xuICB0aGlzLmJlZm9yZS5wYXJlbnROb2RlLmluc2VydEJlZm9yZShub2RlLCB0aGlzLmJlZm9yZS5uZXh0U2libGluZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBhbGwgZWxlbWVudHMgYmV0d2VlbiB0aGUgdHdvIHRyYWNraW5nIG5vZGVzLlxuICpcbiAqIEBwYXJhbSAge05vZGV9IG5vZGVcbiAqIEByZXR1cm4ge3RoaXN9XG4gKi9cblRyYWNrTm9kZS5wcm90b3R5cGUuZW1wdHkgPSBmdW5jdGlvbiAoKSB7XG4gIHdoaWxlICh0aGlzLmJlZm9yZS5uZXh0U2libGluZyAhPT0gdGhpcy5hZnRlcikge1xuICAgIHRoaXMuYmVmb3JlLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcy5iZWZvcmUubmV4dFNpYmxpbmcpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZSB0aGUgdGhlIGVsZW1lbnRzIGZyb20gdGhlIERPTS5cbiAqXG4gKiBAcGFyYW0gIHtOb2RlfSBub2RlXG4gKiBAcmV0dXJuIHt0aGlzfVxuICovXG5UcmFja05vZGUucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uICgpIHtcbiAgd2hpbGUgKHRoaXMuYmVmb3JlLm5leHRTaWJsaW5nICE9PSB0aGlzLmFmdGVyKSB7XG4gICAgdGhpcy5mcmFnbWVudC5hcHBlbmRDaGlsZCh0aGlzLmJlZm9yZS5uZXh0U2libGluZyk7XG4gIH1cblxuICAvLyBQdWxsIHRoZSB0d28gcmVmZXJlbmNlIG5vZGVzIG91dCBvZiB0aGUgRE9NIGFuZCBpbnRvIHRoZSBmcmFnbWVudC5cbiAgdGhpcy5mcmFnbWVudC5hcHBlbmRDaGlsZCh0aGlzLmFmdGVyKTtcbiAgdGhpcy5mcmFnbWVudC5pbnNlcnRCZWZvcmUodGhpcy5iZWZvcmUsIHRoaXMuZnJhZ21lbnQuZmlyc3RDaGlsZCk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlcGxhY2UgdGhlIGNvbnRlbnRzIG9mIHRoZSB0cmFja2luZyBub2RlIHdpdGggbmV3IGNvbnRlbnRzLlxuICpcbiAqIEBwYXJhbSAge05vZGV9IG5vZGVcbiAqIEByZXR1cm4ge3RoaXN9XG4gKi9cblRyYWNrTm9kZS5wcm90b3R5cGUucmVwbGFjZSA9IGZ1bmN0aW9uIChub2RlKSB7XG4gIHJldHVybiB0aGlzLmVtcHR5KCkuYXBwZW5kQ2hpbGQobm9kZSk7XG59O1xuIiwidmFyIGhic1V0aWxzICAgPSByZXF1aXJlKCdoYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvdXRpbHMnKTtcbnZhciB1bmlxdWVJZCAgID0gMDtcbnZhciBUcmFja05vZGUgID0gcmVxdWlyZSgnLi90cmFjay1ub2RlJyk7XG52YXIgU2FmZVN0cmluZyA9IHJlcXVpcmUoJy4vc2FmZS1zdHJpbmcnKTtcbnZhciBfX3NsaWNlICAgID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xuXG4vKipcbiAqIFNpbXBsZSB3YXkgdG8gc3ViY2xhc3MgYW4gb2JqZWN0LCB3aXRoIHN1cHBvcnQgZm9yIG9sZGVyIGJyb3dzZXJzLlxuICpcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqL1xudmFyIGNyZWF0ZSA9IE9iamVjdC5jcmVhdGUgfHwgKGZ1bmN0aW9uICgpIHtcbiAgdmFyIEYgPSBmdW5jdGlvbiAoKSB7fTtcblxuICByZXR1cm4gZnVuY3Rpb24gKG8pIHtcbiAgICBGLnByb3RvdHlwZSA9IG87XG4gICAgdmFyIG9iaiA9IG5ldyBGKCk7XG4gICAgRi5wcm90b3R5cGUgPSBudWxsO1xuICAgIHJldHVybiBvYmo7XG4gIH07XG59KSgpO1xuXG4vKipcbiAqIEV4dGVuZCBIYW5kbGViYXJzIHV0aWxpdGllcyB3aXRoIERPTSBmdW5jdGlvbmFsaXR5LlxuICpcbiAqIEB0eXBlIHtPYmplY3R9XG4gKi9cbnZhciBVdGlscyA9IG1vZHVsZS5leHBvcnRzID0gY3JlYXRlKGhic1V0aWxzKTtcblxuLyoqXG4gKiBSZXR1cm4gYSB1bmlxdWUgaWQuXG4gKlxuICogQHJldHVybiB7TnVtYmVyfVxuICovXG5VdGlscy51bmlxdWVJZCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHVuaXF1ZUlkKys7XG59O1xuXG4vKipcbiAqIENyZWF0ZSBhIGZ1bmN0aW9uIHRoYXQgYWNjZXB0cyBhbiB1bmxpbWl0ZWQgbnVtYmVyIG9mIGFyZ3VtZW50cyBhcyB0aGUgbGFzdFxuICogYXJndW1lbnQuXG4gKlxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqL1xuVXRpbHMudmFyaWFkaWMgPSBmdW5jdGlvbiAoZm4pIHtcbiAgdmFyIGNvdW50ID0gTWF0aC5tYXgoZm4ubGVuZ3RoIC0gMSwgMCk7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYXJncyA9IF9fc2xpY2UuY2FsbChhcmd1bWVudHMsIDAsIGNvdW50KTtcblxuICAgIC8vIEVuZm9yY2UgdGhlIGFycmF5IGxlbmd0aCwgaW4gY2FzZSB3ZSBkaWRuJ3QgaGF2ZSBlbm91Z2ggYXJndW1lbnRzLlxuICAgIGFyZ3MubGVuZ3RoID0gY291bnQ7XG4gICAgYXJncy5wdXNoKF9fc2xpY2UuY2FsbChhcmd1bWVudHMsIGNvdW50KSk7XG5cbiAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJncyk7XG4gIH07XG59O1xuXG4vKipcbiAqIFNpbXBsZSBwYXJ0aWFsIGFwcGxpY2F0aW9uIGZ1bmN0aW9uLlxuICpcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICogQHBhcmFtICB7Kn0gICAgICAgIC4uLlxuICogQHJldHVybiB7RnVuY3Rpb259XG4gKi9cblV0aWxzLnBhcnRpYWwgPSBVdGlscy52YXJpYWRpYyhmdW5jdGlvbiAoZm4sIGFyZ3MpIHtcbiAgcmV0dXJuIFV0aWxzLnZhcmlhZGljKGZ1bmN0aW9uIChjYWxsZWQpIHtcbiAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJncy5jb25jYXQoY2FsbGVkKSk7XG4gIH0pO1xufSk7XG5cbi8qKlxuICogQmluZCBhIGZ1bmN0aW9uIHRvIGEgY2VydGFpbiBjb250ZXh0LlxuICpcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICogQHBhcmFtICB7T2JqZWN0fSAgIGNvbnRleHRcbiAqIEBwYXJhbSAgeyp9ICAgICAgICAuLi5cbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICovXG5VdGlscy5iaW5kID0gVXRpbHMudmFyaWFkaWMoZnVuY3Rpb24gKGZuLCBjb250ZXh0LCBhcmdzKSB7XG4gIHJldHVybiBVdGlscy52YXJpYWRpYyhmdW5jdGlvbiAoY2FsbGVkKSB7XG4gICAgcmV0dXJuIGZuLmFwcGx5KGNvbnRleHQsIGFyZ3MuY29uY2F0KGNhbGxlZCkpO1xuICB9KTtcbn0pO1xuXG4vKipcbiAqIEV4cG9zZSB0aGUgY3JlYXRlIGZ1bmN0aW9uLlxuICpcbiAqIEB0eXBlIHtGdW5jdGlvbn1cbiAqL1xuVXRpbHMuY3JlYXRlID0gY3JlYXRlO1xuXG4vKipcbiAqIENoZWNrIHdoZXRoZXIgYW4gb2JqZWN0IGlzIGFjdHVhbGx5IGEgRE9NIG5vZGUuXG4gKlxuICogQHBhcmFtICB7Kn0gICAgICAgZWxlbWVudFxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqL1xuVXRpbHMuaXNOb2RlID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgcmV0dXJuIGVsZW1lbnQgaW5zdGFuY2VvZiBOb2RlO1xufTtcblxuLyoqXG4gKiBUcmFjayBhIG5vZGUgaW5zdGFuY2UgYW55d2hlcmUgaXQgZ29lcyBpbiB0aGUgRE9NLlxuICpcbiAqIEBwYXJhbSAge05vZGV9ICAgICAgbm9kZVxuICogQHJldHVybiB7VHJhY2tOb2RlfVxuICovXG5VdGlscy50cmFja05vZGUgPSBmdW5jdGlvbiAobm9kZSkge1xuICByZXR1cm4gbmV3IFRyYWNrTm9kZShub2RlKTtcbn07XG5cbi8qKlxuICogVHJhbnNmb3JtIGEgc3RyaW5nIGludG8gYXJiaXRyYXJ5IERPTSBub2Rlcy5cbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9IHN0cmluZ1xuICogQHJldHVybiB7Tm9kZX1cbiAqL1xuVXRpbHMuZG9taWZ5RXhwcmVzc2lvbiA9IGZ1bmN0aW9uIChzdHJpbmcpIHtcbiAgLy8gSWYgd2UgcGFzc2VkIGluIGEgc2FmZSBzdHJpbmcsIGdldCB0aGUgYWN0dWFsIHZhbHVlLlxuICBpZiAoc3RyaW5nIGluc3RhbmNlb2YgU2FmZVN0cmluZykge1xuICAgIHN0cmluZyA9IHN0cmluZy5zdHJpbmc7XG4gIH1cblxuICAvLyBObyBuZWVkIHRvIGNvZXJjZSBhIG5vZGUuXG4gIGlmIChVdGlscy5pc05vZGUoc3RyaW5nKSkge1xuICAgIHJldHVybiBzdHJpbmc7XG4gIH1cblxuICB2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIGRpdi5pbm5lckhUTUwgPSBzdHJpbmc7XG5cbiAgaWYgKGRpdi5jaGlsZE5vZGVzLmxlbmd0aCA9PT0gMSkge1xuICAgIHJldHVybiBkaXYucmVtb3ZlQ2hpbGQoZGl2LmNoaWxkTm9kZXNbMF0pO1xuICB9XG5cbiAgdmFyIGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuXG4gIHdoaWxlIChkaXYuZmlyc3RDaGlsZCkge1xuICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKGRpdi5maXJzdENoaWxkKTtcbiAgfVxuXG4gIHJldHVybiBmcmFnbWVudDtcbn07XG5cbi8qKlxuICogVHJhbnNmb3JtIGEgc3RyaW5nIGludG8gYSBET00gdGV4dCBub2RlIGZvciBhcHBlbmRpbmcgdG8gdGhlIHRlbXBsYXRlLlxuICpcbiAqIEBwYXJhbSAge1N0cmluZ30gc3RyaW5nXG4gKiBAcmV0dXJuIHtUZXh0fVxuICovXG5VdGlscy50ZXh0aWZ5RXhwcmVzc2lvbiA9IGZ1bmN0aW9uIChzdHJpbmcpIHtcbiAgaWYgKHN0cmluZyBpbnN0YW5jZW9mIFNhZmVTdHJpbmcpIHtcbiAgICByZXR1cm4gVXRpbHMuZG9taWZ5RXhwcmVzc2lvbihzdHJpbmcuc3RyaW5nKTtcbiAgfVxuXG4gIC8vIENhdGNoIHdoZW4gdGhlIHN0cmluZyBpcyBhY3R1YWxseSBhIERPTSBub2RlIGFuZCB0dXJuIGl0IGludG8gYSBzdHJpbmcuXG4gIGlmIChVdGlscy5pc05vZGUoc3RyaW5nKSkge1xuICAgIC8vIEFscmVhZHkgYSB0ZXh0IG5vZGUsIGp1c3QgcmV0dXJuIGl0IGltbWVkaWF0ZWx5LlxuICAgIGlmIChzdHJpbmcubm9kZVR5cGUgPT09IDMpIHtcbiAgICAgIHJldHVybiBzdHJpbmc7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBzdHJpbmcub3V0ZXJIVE1MID09PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHN0cmluZy5vdXRlckhUTUwpO1xuICAgIH1cblxuICAgIHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBkaXYuYXBwZW5kQ2hpbGQoc3RyaW5nLmNsb25lTm9kZSh0cnVlKSk7XG4gICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGRpdi5pbm5lckhUTUwpO1xuICB9XG5cbiAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHN0cmluZyA9PSBudWxsID8gJycgOiBzdHJpbmcpO1xufTtcbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2Uge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIWVtaXR0ZXIuX2V2ZW50cyB8fCAhZW1pdHRlci5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IDA7XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24oZW1pdHRlci5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSAxO1xuICBlbHNlXG4gICAgcmV0ID0gZW1pdHRlci5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiIsImlmICh0eXBlb2YgT2JqZWN0LmNyZWF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAvLyBpbXBsZW1lbnRhdGlvbiBmcm9tIHN0YW5kYXJkIG5vZGUuanMgJ3V0aWwnIG1vZHVsZVxuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgY3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ3Rvci5wcm90b3R5cGUsIHtcbiAgICAgIGNvbnN0cnVjdG9yOiB7XG4gICAgICAgIHZhbHVlOiBjdG9yLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgfVxuICAgIH0pO1xuICB9O1xufSBlbHNlIHtcbiAgLy8gb2xkIHNjaG9vbCBzaGltIGZvciBvbGQgYnJvd3NlcnNcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIHZhciBUZW1wQ3RvciA9IGZ1bmN0aW9uICgpIHt9XG4gICAgVGVtcEN0b3IucHJvdG90eXBlID0gc3VwZXJDdG9yLnByb3RvdHlwZVxuICAgIGN0b3IucHJvdG90eXBlID0gbmV3IFRlbXBDdG9yKClcbiAgICBjdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGN0b3JcbiAgfVxufVxuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxucHJvY2Vzcy5uZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhblNldEltbWVkaWF0ZSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnNldEltbWVkaWF0ZTtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICBpZiAoY2FuUG9zdCkge1xuICAgICAgICB2YXIgcXVldWUgPSBbXTtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIGlmIChldi5zb3VyY2UgPT09IHdpbmRvdyAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufVxuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGlzQnVmZmVyKGFyZykge1xuICByZXR1cm4gYXJnICYmIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnXG4gICAgJiYgdHlwZW9mIGFyZy5jb3B5ID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5maWxsID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5yZWFkVUludDggPT09ICdmdW5jdGlvbic7XG59IiwidmFyIHByb2Nlc3M9cmVxdWlyZShcIl9fYnJvd3NlcmlmeV9wcm9jZXNzXCIpLGdsb2JhbD10eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge307Ly8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbnZhciBmb3JtYXRSZWdFeHAgPSAvJVtzZGolXS9nO1xuZXhwb3J0cy5mb3JtYXQgPSBmdW5jdGlvbihmKSB7XG4gIGlmICghaXNTdHJpbmcoZikpIHtcbiAgICB2YXIgb2JqZWN0cyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBvYmplY3RzLnB1c2goaW5zcGVjdChhcmd1bWVudHNbaV0pKTtcbiAgICB9XG4gICAgcmV0dXJuIG9iamVjdHMuam9pbignICcpO1xuICB9XG5cbiAgdmFyIGkgPSAxO1xuICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgdmFyIGxlbiA9IGFyZ3MubGVuZ3RoO1xuICB2YXIgc3RyID0gU3RyaW5nKGYpLnJlcGxhY2UoZm9ybWF0UmVnRXhwLCBmdW5jdGlvbih4KSB7XG4gICAgaWYgKHggPT09ICclJScpIHJldHVybiAnJSc7XG4gICAgaWYgKGkgPj0gbGVuKSByZXR1cm4geDtcbiAgICBzd2l0Y2ggKHgpIHtcbiAgICAgIGNhc2UgJyVzJzogcmV0dXJuIFN0cmluZyhhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWQnOiByZXR1cm4gTnVtYmVyKGFyZ3NbaSsrXSk7XG4gICAgICBjYXNlICclaic6XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGFyZ3NbaSsrXSk7XG4gICAgICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgICByZXR1cm4gJ1tDaXJjdWxhcl0nO1xuICAgICAgICB9XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4geDtcbiAgICB9XG4gIH0pO1xuICBmb3IgKHZhciB4ID0gYXJnc1tpXTsgaSA8IGxlbjsgeCA9IGFyZ3NbKytpXSkge1xuICAgIGlmIChpc051bGwoeCkgfHwgIWlzT2JqZWN0KHgpKSB7XG4gICAgICBzdHIgKz0gJyAnICsgeDtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyICs9ICcgJyArIGluc3BlY3QoeCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBzdHI7XG59O1xuXG5cbi8vIE1hcmsgdGhhdCBhIG1ldGhvZCBzaG91bGQgbm90IGJlIHVzZWQuXG4vLyBSZXR1cm5zIGEgbW9kaWZpZWQgZnVuY3Rpb24gd2hpY2ggd2FybnMgb25jZSBieSBkZWZhdWx0LlxuLy8gSWYgLS1uby1kZXByZWNhdGlvbiBpcyBzZXQsIHRoZW4gaXQgaXMgYSBuby1vcC5cbmV4cG9ydHMuZGVwcmVjYXRlID0gZnVuY3Rpb24oZm4sIG1zZykge1xuICAvLyBBbGxvdyBmb3IgZGVwcmVjYXRpbmcgdGhpbmdzIGluIHRoZSBwcm9jZXNzIG9mIHN0YXJ0aW5nIHVwLlxuICBpZiAoaXNVbmRlZmluZWQoZ2xvYmFsLnByb2Nlc3MpKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGV4cG9ydHMuZGVwcmVjYXRlKGZuLCBtc2cpLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfVxuXG4gIGlmIChwcm9jZXNzLm5vRGVwcmVjYXRpb24gPT09IHRydWUpIHtcbiAgICByZXR1cm4gZm47XG4gIH1cblxuICB2YXIgd2FybmVkID0gZmFsc2U7XG4gIGZ1bmN0aW9uIGRlcHJlY2F0ZWQoKSB7XG4gICAgaWYgKCF3YXJuZWQpIHtcbiAgICAgIGlmIChwcm9jZXNzLnRocm93RGVwcmVjYXRpb24pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1zZyk7XG4gICAgICB9IGVsc2UgaWYgKHByb2Nlc3MudHJhY2VEZXByZWNhdGlvbikge1xuICAgICAgICBjb25zb2xlLnRyYWNlKG1zZyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmVycm9yKG1zZyk7XG4gICAgICB9XG4gICAgICB3YXJuZWQgPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuXG4gIHJldHVybiBkZXByZWNhdGVkO1xufTtcblxuXG52YXIgZGVidWdzID0ge307XG52YXIgZGVidWdFbnZpcm9uO1xuZXhwb3J0cy5kZWJ1Z2xvZyA9IGZ1bmN0aW9uKHNldCkge1xuICBpZiAoaXNVbmRlZmluZWQoZGVidWdFbnZpcm9uKSlcbiAgICBkZWJ1Z0Vudmlyb24gPSBwcm9jZXNzLmVudi5OT0RFX0RFQlVHIHx8ICcnO1xuICBzZXQgPSBzZXQudG9VcHBlckNhc2UoKTtcbiAgaWYgKCFkZWJ1Z3Nbc2V0XSkge1xuICAgIGlmIChuZXcgUmVnRXhwKCdcXFxcYicgKyBzZXQgKyAnXFxcXGInLCAnaScpLnRlc3QoZGVidWdFbnZpcm9uKSkge1xuICAgICAgdmFyIHBpZCA9IHByb2Nlc3MucGlkO1xuICAgICAgZGVidWdzW3NldF0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG1zZyA9IGV4cG9ydHMuZm9ybWF0LmFwcGx5KGV4cG9ydHMsIGFyZ3VtZW50cyk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJyVzICVkOiAlcycsIHNldCwgcGlkLCBtc2cpO1xuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGVidWdzW3NldF0gPSBmdW5jdGlvbigpIHt9O1xuICAgIH1cbiAgfVxuICByZXR1cm4gZGVidWdzW3NldF07XG59O1xuXG5cbi8qKlxuICogRWNob3MgdGhlIHZhbHVlIG9mIGEgdmFsdWUuIFRyeXMgdG8gcHJpbnQgdGhlIHZhbHVlIG91dFxuICogaW4gdGhlIGJlc3Qgd2F5IHBvc3NpYmxlIGdpdmVuIHRoZSBkaWZmZXJlbnQgdHlwZXMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iaiBUaGUgb2JqZWN0IHRvIHByaW50IG91dC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIE9wdGlvbmFsIG9wdGlvbnMgb2JqZWN0IHRoYXQgYWx0ZXJzIHRoZSBvdXRwdXQuXG4gKi9cbi8qIGxlZ2FjeTogb2JqLCBzaG93SGlkZGVuLCBkZXB0aCwgY29sb3JzKi9cbmZ1bmN0aW9uIGluc3BlY3Qob2JqLCBvcHRzKSB7XG4gIC8vIGRlZmF1bHQgb3B0aW9uc1xuICB2YXIgY3R4ID0ge1xuICAgIHNlZW46IFtdLFxuICAgIHN0eWxpemU6IHN0eWxpemVOb0NvbG9yXG4gIH07XG4gIC8vIGxlZ2FjeS4uLlxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSAzKSBjdHguZGVwdGggPSBhcmd1bWVudHNbMl07XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDQpIGN0eC5jb2xvcnMgPSBhcmd1bWVudHNbM107XG4gIGlmIChpc0Jvb2xlYW4ob3B0cykpIHtcbiAgICAvLyBsZWdhY3kuLi5cbiAgICBjdHguc2hvd0hpZGRlbiA9IG9wdHM7XG4gIH0gZWxzZSBpZiAob3B0cykge1xuICAgIC8vIGdvdCBhbiBcIm9wdGlvbnNcIiBvYmplY3RcbiAgICBleHBvcnRzLl9leHRlbmQoY3R4LCBvcHRzKTtcbiAgfVxuICAvLyBzZXQgZGVmYXVsdCBvcHRpb25zXG4gIGlmIChpc1VuZGVmaW5lZChjdHguc2hvd0hpZGRlbikpIGN0eC5zaG93SGlkZGVuID0gZmFsc2U7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguZGVwdGgpKSBjdHguZGVwdGggPSAyO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmNvbG9ycykpIGN0eC5jb2xvcnMgPSBmYWxzZTtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5jdXN0b21JbnNwZWN0KSkgY3R4LmN1c3RvbUluc3BlY3QgPSB0cnVlO1xuICBpZiAoY3R4LmNvbG9ycykgY3R4LnN0eWxpemUgPSBzdHlsaXplV2l0aENvbG9yO1xuICByZXR1cm4gZm9ybWF0VmFsdWUoY3R4LCBvYmosIGN0eC5kZXB0aCk7XG59XG5leHBvcnRzLmluc3BlY3QgPSBpbnNwZWN0O1xuXG5cbi8vIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQU5TSV9lc2NhcGVfY29kZSNncmFwaGljc1xuaW5zcGVjdC5jb2xvcnMgPSB7XG4gICdib2xkJyA6IFsxLCAyMl0sXG4gICdpdGFsaWMnIDogWzMsIDIzXSxcbiAgJ3VuZGVybGluZScgOiBbNCwgMjRdLFxuICAnaW52ZXJzZScgOiBbNywgMjddLFxuICAnd2hpdGUnIDogWzM3LCAzOV0sXG4gICdncmV5JyA6IFs5MCwgMzldLFxuICAnYmxhY2snIDogWzMwLCAzOV0sXG4gICdibHVlJyA6IFszNCwgMzldLFxuICAnY3lhbicgOiBbMzYsIDM5XSxcbiAgJ2dyZWVuJyA6IFszMiwgMzldLFxuICAnbWFnZW50YScgOiBbMzUsIDM5XSxcbiAgJ3JlZCcgOiBbMzEsIDM5XSxcbiAgJ3llbGxvdycgOiBbMzMsIDM5XVxufTtcblxuLy8gRG9uJ3QgdXNlICdibHVlJyBub3QgdmlzaWJsZSBvbiBjbWQuZXhlXG5pbnNwZWN0LnN0eWxlcyA9IHtcbiAgJ3NwZWNpYWwnOiAnY3lhbicsXG4gICdudW1iZXInOiAneWVsbG93JyxcbiAgJ2Jvb2xlYW4nOiAneWVsbG93JyxcbiAgJ3VuZGVmaW5lZCc6ICdncmV5JyxcbiAgJ251bGwnOiAnYm9sZCcsXG4gICdzdHJpbmcnOiAnZ3JlZW4nLFxuICAnZGF0ZSc6ICdtYWdlbnRhJyxcbiAgLy8gXCJuYW1lXCI6IGludGVudGlvbmFsbHkgbm90IHN0eWxpbmdcbiAgJ3JlZ2V4cCc6ICdyZWQnXG59O1xuXG5cbmZ1bmN0aW9uIHN0eWxpemVXaXRoQ29sb3Ioc3RyLCBzdHlsZVR5cGUpIHtcbiAgdmFyIHN0eWxlID0gaW5zcGVjdC5zdHlsZXNbc3R5bGVUeXBlXTtcblxuICBpZiAoc3R5bGUpIHtcbiAgICByZXR1cm4gJ1xcdTAwMWJbJyArIGluc3BlY3QuY29sb3JzW3N0eWxlXVswXSArICdtJyArIHN0ciArXG4gICAgICAgICAgICdcXHUwMDFiWycgKyBpbnNwZWN0LmNvbG9yc1tzdHlsZV1bMV0gKyAnbSc7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHN0cjtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIHN0eWxpemVOb0NvbG9yKHN0ciwgc3R5bGVUeXBlKSB7XG4gIHJldHVybiBzdHI7XG59XG5cblxuZnVuY3Rpb24gYXJyYXlUb0hhc2goYXJyYXkpIHtcbiAgdmFyIGhhc2ggPSB7fTtcblxuICBhcnJheS5mb3JFYWNoKGZ1bmN0aW9uKHZhbCwgaWR4KSB7XG4gICAgaGFzaFt2YWxdID0gdHJ1ZTtcbiAgfSk7XG5cbiAgcmV0dXJuIGhhc2g7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0VmFsdWUoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzKSB7XG4gIC8vIFByb3ZpZGUgYSBob29rIGZvciB1c2VyLXNwZWNpZmllZCBpbnNwZWN0IGZ1bmN0aW9ucy5cbiAgLy8gQ2hlY2sgdGhhdCB2YWx1ZSBpcyBhbiBvYmplY3Qgd2l0aCBhbiBpbnNwZWN0IGZ1bmN0aW9uIG9uIGl0XG4gIGlmIChjdHguY3VzdG9tSW5zcGVjdCAmJlxuICAgICAgdmFsdWUgJiZcbiAgICAgIGlzRnVuY3Rpb24odmFsdWUuaW5zcGVjdCkgJiZcbiAgICAgIC8vIEZpbHRlciBvdXQgdGhlIHV0aWwgbW9kdWxlLCBpdCdzIGluc3BlY3QgZnVuY3Rpb24gaXMgc3BlY2lhbFxuICAgICAgdmFsdWUuaW5zcGVjdCAhPT0gZXhwb3J0cy5pbnNwZWN0ICYmXG4gICAgICAvLyBBbHNvIGZpbHRlciBvdXQgYW55IHByb3RvdHlwZSBvYmplY3RzIHVzaW5nIHRoZSBjaXJjdWxhciBjaGVjay5cbiAgICAgICEodmFsdWUuY29uc3RydWN0b3IgJiYgdmFsdWUuY29uc3RydWN0b3IucHJvdG90eXBlID09PSB2YWx1ZSkpIHtcbiAgICB2YXIgcmV0ID0gdmFsdWUuaW5zcGVjdChyZWN1cnNlVGltZXMsIGN0eCk7XG4gICAgaWYgKCFpc1N0cmluZyhyZXQpKSB7XG4gICAgICByZXQgPSBmb3JtYXRWYWx1ZShjdHgsIHJldCwgcmVjdXJzZVRpbWVzKTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG4gIC8vIFByaW1pdGl2ZSB0eXBlcyBjYW5ub3QgaGF2ZSBwcm9wZXJ0aWVzXG4gIHZhciBwcmltaXRpdmUgPSBmb3JtYXRQcmltaXRpdmUoY3R4LCB2YWx1ZSk7XG4gIGlmIChwcmltaXRpdmUpIHtcbiAgICByZXR1cm4gcHJpbWl0aXZlO1xuICB9XG5cbiAgLy8gTG9vayB1cCB0aGUga2V5cyBvZiB0aGUgb2JqZWN0LlxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHZhbHVlKTtcbiAgdmFyIHZpc2libGVLZXlzID0gYXJyYXlUb0hhc2goa2V5cyk7XG5cbiAgaWYgKGN0eC5zaG93SGlkZGVuKSB7XG4gICAga2V5cyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHZhbHVlKTtcbiAgfVxuXG4gIC8vIElFIGRvZXNuJ3QgbWFrZSBlcnJvciBmaWVsZHMgbm9uLWVudW1lcmFibGVcbiAgLy8gaHR0cDovL21zZG4ubWljcm9zb2Z0LmNvbS9lbi11cy9saWJyYXJ5L2llL2R3dzUyc2J0KHY9dnMuOTQpLmFzcHhcbiAgaWYgKGlzRXJyb3IodmFsdWUpXG4gICAgICAmJiAoa2V5cy5pbmRleE9mKCdtZXNzYWdlJykgPj0gMCB8fCBrZXlzLmluZGV4T2YoJ2Rlc2NyaXB0aW9uJykgPj0gMCkpIHtcbiAgICByZXR1cm4gZm9ybWF0RXJyb3IodmFsdWUpO1xuICB9XG5cbiAgLy8gU29tZSB0eXBlIG9mIG9iamVjdCB3aXRob3V0IHByb3BlcnRpZXMgY2FuIGJlIHNob3J0Y3V0dGVkLlxuICBpZiAoa2V5cy5sZW5ndGggPT09IDApIHtcbiAgICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgIHZhciBuYW1lID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJ1tGdW5jdGlvbicgKyBuYW1lICsgJ10nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ3JlZ2V4cCcpO1xuICAgIH1cbiAgICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKERhdGUucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAnZGF0ZScpO1xuICAgIH1cbiAgICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgdmFyIGJhc2UgPSAnJywgYXJyYXkgPSBmYWxzZSwgYnJhY2VzID0gWyd7JywgJ30nXTtcblxuICAvLyBNYWtlIEFycmF5IHNheSB0aGF0IHRoZXkgYXJlIEFycmF5XG4gIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgIGFycmF5ID0gdHJ1ZTtcbiAgICBicmFjZXMgPSBbJ1snLCAnXSddO1xuICB9XG5cbiAgLy8gTWFrZSBmdW5jdGlvbnMgc2F5IHRoYXQgdGhleSBhcmUgZnVuY3Rpb25zXG4gIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgIHZhciBuID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgYmFzZSA9ICcgW0Z1bmN0aW9uJyArIG4gKyAnXSc7XG4gIH1cblxuICAvLyBNYWtlIFJlZ0V4cHMgc2F5IHRoYXQgdGhleSBhcmUgUmVnRXhwc1xuICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIH1cblxuICAvLyBNYWtlIGRhdGVzIHdpdGggcHJvcGVydGllcyBmaXJzdCBzYXkgdGhlIGRhdGVcbiAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgRGF0ZS5wcm90b3R5cGUudG9VVENTdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIH1cblxuICAvLyBNYWtlIGVycm9yIHdpdGggbWVzc2FnZSBmaXJzdCBzYXkgdGhlIGVycm9yXG4gIGlmIChpc0Vycm9yKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gIH1cblxuICBpZiAoa2V5cy5sZW5ndGggPT09IDAgJiYgKCFhcnJheSB8fCB2YWx1ZS5sZW5ndGggPT0gMCkpIHtcbiAgICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArIGJyYWNlc1sxXTtcbiAgfVxuXG4gIGlmIChyZWN1cnNlVGltZXMgPCAwKSB7XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbT2JqZWN0XScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG5cbiAgY3R4LnNlZW4ucHVzaCh2YWx1ZSk7XG5cbiAgdmFyIG91dHB1dDtcbiAgaWYgKGFycmF5KSB7XG4gICAgb3V0cHV0ID0gZm9ybWF0QXJyYXkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5cyk7XG4gIH0gZWxzZSB7XG4gICAgb3V0cHV0ID0ga2V5cy5tYXAoZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5LCBhcnJheSk7XG4gICAgfSk7XG4gIH1cblxuICBjdHguc2Vlbi5wb3AoKTtcblxuICByZXR1cm4gcmVkdWNlVG9TaW5nbGVTdHJpbmcob3V0cHV0LCBiYXNlLCBicmFjZXMpO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFByaW1pdGl2ZShjdHgsIHZhbHVlKSB7XG4gIGlmIChpc1VuZGVmaW5lZCh2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCd1bmRlZmluZWQnLCAndW5kZWZpbmVkJyk7XG4gIGlmIChpc1N0cmluZyh2YWx1ZSkpIHtcbiAgICB2YXIgc2ltcGxlID0gJ1xcJycgKyBKU09OLnN0cmluZ2lmeSh2YWx1ZSkucmVwbGFjZSgvXlwifFwiJC9nLCAnJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJykgKyAnXFwnJztcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoc2ltcGxlLCAnc3RyaW5nJyk7XG4gIH1cbiAgaWYgKGlzTnVtYmVyKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ251bWJlcicpO1xuICBpZiAoaXNCb29sZWFuKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ2Jvb2xlYW4nKTtcbiAgLy8gRm9yIHNvbWUgcmVhc29uIHR5cGVvZiBudWxsIGlzIFwib2JqZWN0XCIsIHNvIHNwZWNpYWwgY2FzZSBoZXJlLlxuICBpZiAoaXNOdWxsKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJ251bGwnLCAnbnVsbCcpO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEVycm9yKHZhbHVlKSB7XG4gIHJldHVybiAnWycgKyBFcnJvci5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSkgKyAnXSc7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0QXJyYXkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5cykge1xuICB2YXIgb3V0cHV0ID0gW107XG4gIGZvciAodmFyIGkgPSAwLCBsID0gdmFsdWUubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYgKGhhc093blByb3BlcnR5KHZhbHVlLCBTdHJpbmcoaSkpKSB7XG4gICAgICBvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLFxuICAgICAgICAgIFN0cmluZyhpKSwgdHJ1ZSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXRwdXQucHVzaCgnJyk7XG4gICAgfVxuICB9XG4gIGtleXMuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICBpZiAoIWtleS5tYXRjaCgvXlxcZCskLykpIHtcbiAgICAgIG91dHB1dC5wdXNoKGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsXG4gICAgICAgICAga2V5LCB0cnVlKSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIG91dHB1dDtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXksIGFycmF5KSB7XG4gIHZhciBuYW1lLCBzdHIsIGRlc2M7XG4gIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHZhbHVlLCBrZXkpIHx8IHsgdmFsdWU6IHZhbHVlW2tleV0gfTtcbiAgaWYgKGRlc2MuZ2V0KSB7XG4gICAgaWYgKGRlc2Muc2V0KSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0dldHRlci9TZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tHZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKGRlc2Muc2V0KSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuICBpZiAoIWhhc093blByb3BlcnR5KHZpc2libGVLZXlzLCBrZXkpKSB7XG4gICAgbmFtZSA9ICdbJyArIGtleSArICddJztcbiAgfVxuICBpZiAoIXN0cikge1xuICAgIGlmIChjdHguc2Vlbi5pbmRleE9mKGRlc2MudmFsdWUpIDwgMCkge1xuICAgICAgaWYgKGlzTnVsbChyZWN1cnNlVGltZXMpKSB7XG4gICAgICAgIHN0ciA9IGZvcm1hdFZhbHVlKGN0eCwgZGVzYy52YWx1ZSwgbnVsbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdHIgPSBmb3JtYXRWYWx1ZShjdHgsIGRlc2MudmFsdWUsIHJlY3Vyc2VUaW1lcyAtIDEpO1xuICAgICAgfVxuICAgICAgaWYgKHN0ci5pbmRleE9mKCdcXG4nKSA+IC0xKSB7XG4gICAgICAgIGlmIChhcnJheSkge1xuICAgICAgICAgIHN0ciA9IHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiAnICAnICsgbGluZTtcbiAgICAgICAgICB9KS5qb2luKCdcXG4nKS5zdWJzdHIoMik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3RyID0gJ1xcbicgKyBzdHIuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gJyAgICcgKyBsaW5lO1xuICAgICAgICAgIH0pLmpvaW4oJ1xcbicpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbQ2lyY3VsYXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cbiAgaWYgKGlzVW5kZWZpbmVkKG5hbWUpKSB7XG4gICAgaWYgKGFycmF5ICYmIGtleS5tYXRjaCgvXlxcZCskLykpIHtcbiAgICAgIHJldHVybiBzdHI7XG4gICAgfVxuICAgIG5hbWUgPSBKU09OLnN0cmluZ2lmeSgnJyArIGtleSk7XG4gICAgaWYgKG5hbWUubWF0Y2goL15cIihbYS16QS1aX11bYS16QS1aXzAtOV0qKVwiJC8pKSB7XG4gICAgICBuYW1lID0gbmFtZS5zdWJzdHIoMSwgbmFtZS5sZW5ndGggLSAyKTtcbiAgICAgIG5hbWUgPSBjdHguc3R5bGl6ZShuYW1lLCAnbmFtZScpO1xuICAgIH0gZWxzZSB7XG4gICAgICBuYW1lID0gbmFtZS5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKVxuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvKF5cInxcIiQpL2csIFwiJ1wiKTtcbiAgICAgIG5hbWUgPSBjdHguc3R5bGl6ZShuYW1lLCAnc3RyaW5nJyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5hbWUgKyAnOiAnICsgc3RyO1xufVxuXG5cbmZ1bmN0aW9uIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKSB7XG4gIHZhciBudW1MaW5lc0VzdCA9IDA7XG4gIHZhciBsZW5ndGggPSBvdXRwdXQucmVkdWNlKGZ1bmN0aW9uKHByZXYsIGN1cikge1xuICAgIG51bUxpbmVzRXN0Kys7XG4gICAgaWYgKGN1ci5pbmRleE9mKCdcXG4nKSA+PSAwKSBudW1MaW5lc0VzdCsrO1xuICAgIHJldHVybiBwcmV2ICsgY3VyLnJlcGxhY2UoL1xcdTAwMWJcXFtcXGRcXGQ/bS9nLCAnJykubGVuZ3RoICsgMTtcbiAgfSwgMCk7XG5cbiAgaWYgKGxlbmd0aCA+IDYwKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArXG4gICAgICAgICAgIChiYXNlID09PSAnJyA/ICcnIDogYmFzZSArICdcXG4gJykgK1xuICAgICAgICAgICAnICcgK1xuICAgICAgICAgICBvdXRwdXQuam9pbignLFxcbiAgJykgK1xuICAgICAgICAgICAnICcgK1xuICAgICAgICAgICBicmFjZXNbMV07XG4gIH1cblxuICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArICcgJyArIG91dHB1dC5qb2luKCcsICcpICsgJyAnICsgYnJhY2VzWzFdO1xufVxuXG5cbi8vIE5PVEU6IFRoZXNlIHR5cGUgY2hlY2tpbmcgZnVuY3Rpb25zIGludGVudGlvbmFsbHkgZG9uJ3QgdXNlIGBpbnN0YW5jZW9mYFxuLy8gYmVjYXVzZSBpdCBpcyBmcmFnaWxlIGFuZCBjYW4gYmUgZWFzaWx5IGZha2VkIHdpdGggYE9iamVjdC5jcmVhdGUoKWAuXG5mdW5jdGlvbiBpc0FycmF5KGFyKSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KGFyKTtcbn1cbmV4cG9ydHMuaXNBcnJheSA9IGlzQXJyYXk7XG5cbmZ1bmN0aW9uIGlzQm9vbGVhbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJztcbn1cbmV4cG9ydHMuaXNCb29sZWFuID0gaXNCb29sZWFuO1xuXG5mdW5jdGlvbiBpc051bGwoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbCA9IGlzTnVsbDtcblxuZnVuY3Rpb24gaXNOdWxsT3JVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsT3JVbmRlZmluZWQgPSBpc051bGxPclVuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cbmV4cG9ydHMuaXNOdW1iZXIgPSBpc051bWJlcjtcblxuZnVuY3Rpb24gaXNTdHJpbmcoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3RyaW5nJztcbn1cbmV4cG9ydHMuaXNTdHJpbmcgPSBpc1N0cmluZztcblxuZnVuY3Rpb24gaXNTeW1ib2woYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3ltYm9sJztcbn1cbmV4cG9ydHMuaXNTeW1ib2wgPSBpc1N5bWJvbDtcblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbmV4cG9ydHMuaXNVbmRlZmluZWQgPSBpc1VuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNSZWdFeHAocmUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KHJlKSAmJiBvYmplY3RUb1N0cmluZyhyZSkgPT09ICdbb2JqZWN0IFJlZ0V4cF0nO1xufVxuZXhwb3J0cy5pc1JlZ0V4cCA9IGlzUmVnRXhwO1xuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNPYmplY3QgPSBpc09iamVjdDtcblxuZnVuY3Rpb24gaXNEYXRlKGQpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KGQpICYmIG9iamVjdFRvU3RyaW5nKGQpID09PSAnW29iamVjdCBEYXRlXSc7XG59XG5leHBvcnRzLmlzRGF0ZSA9IGlzRGF0ZTtcblxuZnVuY3Rpb24gaXNFcnJvcihlKSB7XG4gIHJldHVybiBpc09iamVjdChlKSAmJlxuICAgICAgKG9iamVjdFRvU3RyaW5nKGUpID09PSAnW29iamVjdCBFcnJvcl0nIHx8IGUgaW5zdGFuY2VvZiBFcnJvcik7XG59XG5leHBvcnRzLmlzRXJyb3IgPSBpc0Vycm9yO1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cbmV4cG9ydHMuaXNGdW5jdGlvbiA9IGlzRnVuY3Rpb247XG5cbmZ1bmN0aW9uIGlzUHJpbWl0aXZlKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnYm9vbGVhbicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdudW1iZXInIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3RyaW5nJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCcgfHwgIC8vIEVTNiBzeW1ib2xcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICd1bmRlZmluZWQnO1xufVxuZXhwb3J0cy5pc1ByaW1pdGl2ZSA9IGlzUHJpbWl0aXZlO1xuXG5leHBvcnRzLmlzQnVmZmVyID0gcmVxdWlyZSgnLi9zdXBwb3J0L2lzQnVmZmVyJyk7XG5cbmZ1bmN0aW9uIG9iamVjdFRvU3RyaW5nKG8pIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKTtcbn1cblxuXG5mdW5jdGlvbiBwYWQobikge1xuICByZXR1cm4gbiA8IDEwID8gJzAnICsgbi50b1N0cmluZygxMCkgOiBuLnRvU3RyaW5nKDEwKTtcbn1cblxuXG52YXIgbW9udGhzID0gWydKYW4nLCAnRmViJywgJ01hcicsICdBcHInLCAnTWF5JywgJ0p1bicsICdKdWwnLCAnQXVnJywgJ1NlcCcsXG4gICAgICAgICAgICAgICdPY3QnLCAnTm92JywgJ0RlYyddO1xuXG4vLyAyNiBGZWIgMTY6MTk6MzRcbmZ1bmN0aW9uIHRpbWVzdGFtcCgpIHtcbiAgdmFyIGQgPSBuZXcgRGF0ZSgpO1xuICB2YXIgdGltZSA9IFtwYWQoZC5nZXRIb3VycygpKSxcbiAgICAgICAgICAgICAgcGFkKGQuZ2V0TWludXRlcygpKSxcbiAgICAgICAgICAgICAgcGFkKGQuZ2V0U2Vjb25kcygpKV0uam9pbignOicpO1xuICByZXR1cm4gW2QuZ2V0RGF0ZSgpLCBtb250aHNbZC5nZXRNb250aCgpXSwgdGltZV0uam9pbignICcpO1xufVxuXG5cbi8vIGxvZyBpcyBqdXN0IGEgdGhpbiB3cmFwcGVyIHRvIGNvbnNvbGUubG9nIHRoYXQgcHJlcGVuZHMgYSB0aW1lc3RhbXBcbmV4cG9ydHMubG9nID0gZnVuY3Rpb24oKSB7XG4gIGNvbnNvbGUubG9nKCclcyAtICVzJywgdGltZXN0YW1wKCksIGV4cG9ydHMuZm9ybWF0LmFwcGx5KGV4cG9ydHMsIGFyZ3VtZW50cykpO1xufTtcblxuXG4vKipcbiAqIEluaGVyaXQgdGhlIHByb3RvdHlwZSBtZXRob2RzIGZyb20gb25lIGNvbnN0cnVjdG9yIGludG8gYW5vdGhlci5cbiAqXG4gKiBUaGUgRnVuY3Rpb24ucHJvdG90eXBlLmluaGVyaXRzIGZyb20gbGFuZy5qcyByZXdyaXR0ZW4gYXMgYSBzdGFuZGFsb25lXG4gKiBmdW5jdGlvbiAobm90IG9uIEZ1bmN0aW9uLnByb3RvdHlwZSkuIE5PVEU6IElmIHRoaXMgZmlsZSBpcyB0byBiZSBsb2FkZWRcbiAqIGR1cmluZyBib290c3RyYXBwaW5nIHRoaXMgZnVuY3Rpb24gbmVlZHMgdG8gYmUgcmV3cml0dGVuIHVzaW5nIHNvbWUgbmF0aXZlXG4gKiBmdW5jdGlvbnMgYXMgcHJvdG90eXBlIHNldHVwIHVzaW5nIG5vcm1hbCBKYXZhU2NyaXB0IGRvZXMgbm90IHdvcmsgYXNcbiAqIGV4cGVjdGVkIGR1cmluZyBib290c3RyYXBwaW5nIChzZWUgbWlycm9yLmpzIGluIHIxMTQ5MDMpLlxuICpcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGN0b3IgQ29uc3RydWN0b3IgZnVuY3Rpb24gd2hpY2ggbmVlZHMgdG8gaW5oZXJpdCB0aGVcbiAqICAgICBwcm90b3R5cGUuXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBzdXBlckN0b3IgQ29uc3RydWN0b3IgZnVuY3Rpb24gdG8gaW5oZXJpdCBwcm90b3R5cGUgZnJvbS5cbiAqL1xuZXhwb3J0cy5pbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG5cbmV4cG9ydHMuX2V4dGVuZCA9IGZ1bmN0aW9uKG9yaWdpbiwgYWRkKSB7XG4gIC8vIERvbid0IGRvIGFueXRoaW5nIGlmIGFkZCBpc24ndCBhbiBvYmplY3RcbiAgaWYgKCFhZGQgfHwgIWlzT2JqZWN0KGFkZCkpIHJldHVybiBvcmlnaW47XG5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhhZGQpO1xuICB2YXIgaSA9IGtleXMubGVuZ3RoO1xuICB3aGlsZSAoaS0tKSB7XG4gICAgb3JpZ2luW2tleXNbaV1dID0gYWRkW2tleXNbaV1dO1xuICB9XG4gIHJldHVybiBvcmlnaW47XG59O1xuXG5mdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApO1xufVxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgVXRpbHMgPSByZXF1aXJlKFwiLi91dGlsc1wiKTtcbnZhciBFeGNlcHRpb24gPSByZXF1aXJlKFwiLi9leGNlcHRpb25cIilbXCJkZWZhdWx0XCJdO1xuXG52YXIgVkVSU0lPTiA9IFwiMS4zLjBcIjtcbmV4cG9ydHMuVkVSU0lPTiA9IFZFUlNJT047dmFyIENPTVBJTEVSX1JFVklTSU9OID0gNDtcbmV4cG9ydHMuQ09NUElMRVJfUkVWSVNJT04gPSBDT01QSUxFUl9SRVZJU0lPTjtcbnZhciBSRVZJU0lPTl9DSEFOR0VTID0ge1xuICAxOiAnPD0gMS4wLnJjLjInLCAvLyAxLjAucmMuMiBpcyBhY3R1YWxseSByZXYyIGJ1dCBkb2Vzbid0IHJlcG9ydCBpdFxuICAyOiAnPT0gMS4wLjAtcmMuMycsXG4gIDM6ICc9PSAxLjAuMC1yYy40JyxcbiAgNDogJz49IDEuMC4wJ1xufTtcbmV4cG9ydHMuUkVWSVNJT05fQ0hBTkdFUyA9IFJFVklTSU9OX0NIQU5HRVM7XG52YXIgaXNBcnJheSA9IFV0aWxzLmlzQXJyYXksXG4gICAgaXNGdW5jdGlvbiA9IFV0aWxzLmlzRnVuY3Rpb24sXG4gICAgdG9TdHJpbmcgPSBVdGlscy50b1N0cmluZyxcbiAgICBvYmplY3RUeXBlID0gJ1tvYmplY3QgT2JqZWN0XSc7XG5cbmZ1bmN0aW9uIEhhbmRsZWJhcnNFbnZpcm9ubWVudChoZWxwZXJzLCBwYXJ0aWFscykge1xuICB0aGlzLmhlbHBlcnMgPSBoZWxwZXJzIHx8IHt9O1xuICB0aGlzLnBhcnRpYWxzID0gcGFydGlhbHMgfHwge307XG5cbiAgcmVnaXN0ZXJEZWZhdWx0SGVscGVycyh0aGlzKTtcbn1cblxuZXhwb3J0cy5IYW5kbGViYXJzRW52aXJvbm1lbnQgPSBIYW5kbGViYXJzRW52aXJvbm1lbnQ7SGFuZGxlYmFyc0Vudmlyb25tZW50LnByb3RvdHlwZSA9IHtcbiAgY29uc3RydWN0b3I6IEhhbmRsZWJhcnNFbnZpcm9ubWVudCxcblxuICBsb2dnZXI6IGxvZ2dlcixcbiAgbG9nOiBsb2csXG5cbiAgcmVnaXN0ZXJIZWxwZXI6IGZ1bmN0aW9uKG5hbWUsIGZuLCBpbnZlcnNlKSB7XG4gICAgaWYgKHRvU3RyaW5nLmNhbGwobmFtZSkgPT09IG9iamVjdFR5cGUpIHtcbiAgICAgIGlmIChpbnZlcnNlIHx8IGZuKSB7IHRocm93IG5ldyBFeGNlcHRpb24oJ0FyZyBub3Qgc3VwcG9ydGVkIHdpdGggbXVsdGlwbGUgaGVscGVycycpOyB9XG4gICAgICBVdGlscy5leHRlbmQodGhpcy5oZWxwZXJzLCBuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGludmVyc2UpIHsgZm4ubm90ID0gaW52ZXJzZTsgfVxuICAgICAgdGhpcy5oZWxwZXJzW25hbWVdID0gZm47XG4gICAgfVxuICB9LFxuXG4gIHJlZ2lzdGVyUGFydGlhbDogZnVuY3Rpb24obmFtZSwgc3RyKSB7XG4gICAgaWYgKHRvU3RyaW5nLmNhbGwobmFtZSkgPT09IG9iamVjdFR5cGUpIHtcbiAgICAgIFV0aWxzLmV4dGVuZCh0aGlzLnBhcnRpYWxzLCAgbmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucGFydGlhbHNbbmFtZV0gPSBzdHI7XG4gICAgfVxuICB9XG59O1xuXG5mdW5jdGlvbiByZWdpc3RlckRlZmF1bHRIZWxwZXJzKGluc3RhbmNlKSB7XG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdoZWxwZXJNaXNzaW5nJywgZnVuY3Rpb24oYXJnKSB7XG4gICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PT0gMikge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcIk1pc3NpbmcgaGVscGVyOiAnXCIgKyBhcmcgKyBcIidcIik7XG4gICAgfVxuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignYmxvY2tIZWxwZXJNaXNzaW5nJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIHZhciBpbnZlcnNlID0gb3B0aW9ucy5pbnZlcnNlIHx8IGZ1bmN0aW9uKCkge30sIGZuID0gb3B0aW9ucy5mbjtcblxuICAgIGlmIChpc0Z1bmN0aW9uKGNvbnRleHQpKSB7IGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7IH1cblxuICAgIGlmKGNvbnRleHQgPT09IHRydWUpIHtcbiAgICAgIHJldHVybiBmbih0aGlzKTtcbiAgICB9IGVsc2UgaWYoY29udGV4dCA9PT0gZmFsc2UgfHwgY29udGV4dCA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gaW52ZXJzZSh0aGlzKTtcbiAgICB9IGVsc2UgaWYgKGlzQXJyYXkoY29udGV4dCkpIHtcbiAgICAgIGlmKGNvbnRleHQubGVuZ3RoID4gMCkge1xuICAgICAgICByZXR1cm4gaW5zdGFuY2UuaGVscGVycy5lYWNoKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGludmVyc2UodGhpcyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmbihjb250ZXh0KTtcbiAgICB9XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdlYWNoJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIHZhciBmbiA9IG9wdGlvbnMuZm4sIGludmVyc2UgPSBvcHRpb25zLmludmVyc2U7XG4gICAgdmFyIGkgPSAwLCByZXQgPSBcIlwiLCBkYXRhO1xuXG4gICAgaWYgKGlzRnVuY3Rpb24oY29udGV4dCkpIHsgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTsgfVxuXG4gICAgaWYgKG9wdGlvbnMuZGF0YSkge1xuICAgICAgZGF0YSA9IGNyZWF0ZUZyYW1lKG9wdGlvbnMuZGF0YSk7XG4gICAgfVxuXG4gICAgaWYoY29udGV4dCAmJiB0eXBlb2YgY29udGV4dCA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGlmIChpc0FycmF5KGNvbnRleHQpKSB7XG4gICAgICAgIGZvcih2YXIgaiA9IGNvbnRleHQubGVuZ3RoOyBpPGo7IGkrKykge1xuICAgICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICBkYXRhLmluZGV4ID0gaTtcbiAgICAgICAgICAgIGRhdGEuZmlyc3QgPSAoaSA9PT0gMCk7XG4gICAgICAgICAgICBkYXRhLmxhc3QgID0gKGkgPT09IChjb250ZXh0Lmxlbmd0aC0xKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldCA9IHJldCArIGZuKGNvbnRleHRbaV0sIHsgZGF0YTogZGF0YSB9KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9yKHZhciBrZXkgaW4gY29udGV4dCkge1xuICAgICAgICAgIGlmKGNvbnRleHQuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgaWYoZGF0YSkgeyBcbiAgICAgICAgICAgICAgZGF0YS5rZXkgPSBrZXk7IFxuICAgICAgICAgICAgICBkYXRhLmluZGV4ID0gaTtcbiAgICAgICAgICAgICAgZGF0YS5maXJzdCA9IChpID09PSAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldCA9IHJldCArIGZuKGNvbnRleHRba2V5XSwge2RhdGE6IGRhdGF9KTtcbiAgICAgICAgICAgIGkrKztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZihpID09PSAwKXtcbiAgICAgIHJldCA9IGludmVyc2UodGhpcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldDtcbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2lmJywgZnVuY3Rpb24oY29uZGl0aW9uYWwsIG9wdGlvbnMpIHtcbiAgICBpZiAoaXNGdW5jdGlvbihjb25kaXRpb25hbCkpIHsgY29uZGl0aW9uYWwgPSBjb25kaXRpb25hbC5jYWxsKHRoaXMpOyB9XG5cbiAgICAvLyBEZWZhdWx0IGJlaGF2aW9yIGlzIHRvIHJlbmRlciB0aGUgcG9zaXRpdmUgcGF0aCBpZiB0aGUgdmFsdWUgaXMgdHJ1dGh5IGFuZCBub3QgZW1wdHkuXG4gICAgLy8gVGhlIGBpbmNsdWRlWmVyb2Agb3B0aW9uIG1heSBiZSBzZXQgdG8gdHJlYXQgdGhlIGNvbmR0aW9uYWwgYXMgcHVyZWx5IG5vdCBlbXB0eSBiYXNlZCBvbiB0aGVcbiAgICAvLyBiZWhhdmlvciBvZiBpc0VtcHR5LiBFZmZlY3RpdmVseSB0aGlzIGRldGVybWluZXMgaWYgMCBpcyBoYW5kbGVkIGJ5IHRoZSBwb3NpdGl2ZSBwYXRoIG9yIG5lZ2F0aXZlLlxuICAgIGlmICgoIW9wdGlvbnMuaGFzaC5pbmNsdWRlWmVybyAmJiAhY29uZGl0aW9uYWwpIHx8IFV0aWxzLmlzRW1wdHkoY29uZGl0aW9uYWwpKSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5pbnZlcnNlKHRoaXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5mbih0aGlzKTtcbiAgICB9XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCd1bmxlc3MnLCBmdW5jdGlvbihjb25kaXRpb25hbCwgb3B0aW9ucykge1xuICAgIHJldHVybiBpbnN0YW5jZS5oZWxwZXJzWydpZiddLmNhbGwodGhpcywgY29uZGl0aW9uYWwsIHtmbjogb3B0aW9ucy5pbnZlcnNlLCBpbnZlcnNlOiBvcHRpb25zLmZuLCBoYXNoOiBvcHRpb25zLmhhc2h9KTtcbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ3dpdGgnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24oY29udGV4dCkpIHsgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTsgfVxuXG4gICAgaWYgKCFVdGlscy5pc0VtcHR5KGNvbnRleHQpKSByZXR1cm4gb3B0aW9ucy5mbihjb250ZXh0KTtcbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2xvZycsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICB2YXIgbGV2ZWwgPSBvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5kYXRhLmxldmVsICE9IG51bGwgPyBwYXJzZUludChvcHRpb25zLmRhdGEubGV2ZWwsIDEwKSA6IDE7XG4gICAgaW5zdGFuY2UubG9nKGxldmVsLCBjb250ZXh0KTtcbiAgfSk7XG59XG5cbnZhciBsb2dnZXIgPSB7XG4gIG1ldGhvZE1hcDogeyAwOiAnZGVidWcnLCAxOiAnaW5mbycsIDI6ICd3YXJuJywgMzogJ2Vycm9yJyB9LFxuXG4gIC8vIFN0YXRlIGVudW1cbiAgREVCVUc6IDAsXG4gIElORk86IDEsXG4gIFdBUk46IDIsXG4gIEVSUk9SOiAzLFxuICBsZXZlbDogMyxcblxuICAvLyBjYW4gYmUgb3ZlcnJpZGRlbiBpbiB0aGUgaG9zdCBlbnZpcm9ubWVudFxuICBsb2c6IGZ1bmN0aW9uKGxldmVsLCBvYmopIHtcbiAgICBpZiAobG9nZ2VyLmxldmVsIDw9IGxldmVsKSB7XG4gICAgICB2YXIgbWV0aG9kID0gbG9nZ2VyLm1ldGhvZE1hcFtsZXZlbF07XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnICYmIGNvbnNvbGVbbWV0aG9kXSkge1xuICAgICAgICBjb25zb2xlW21ldGhvZF0uY2FsbChjb25zb2xlLCBvYmopO1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcbmV4cG9ydHMubG9nZ2VyID0gbG9nZ2VyO1xuZnVuY3Rpb24gbG9nKGxldmVsLCBvYmopIHsgbG9nZ2VyLmxvZyhsZXZlbCwgb2JqKTsgfVxuXG5leHBvcnRzLmxvZyA9IGxvZzt2YXIgY3JlYXRlRnJhbWUgPSBmdW5jdGlvbihvYmplY3QpIHtcbiAgdmFyIG9iaiA9IHt9O1xuICBVdGlscy5leHRlbmQob2JqLCBvYmplY3QpO1xuICByZXR1cm4gb2JqO1xufTtcbmV4cG9ydHMuY3JlYXRlRnJhbWUgPSBjcmVhdGVGcmFtZTsiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBFeGNlcHRpb24gPSByZXF1aXJlKFwiLi4vZXhjZXB0aW9uXCIpW1wiZGVmYXVsdFwiXTtcblxuZnVuY3Rpb24gTG9jYXRpb25JbmZvKGxvY0luZm8pe1xuICBsb2NJbmZvID0gbG9jSW5mbyB8fCB7fTtcbiAgdGhpcy5maXJzdExpbmUgICA9IGxvY0luZm8uZmlyc3RfbGluZTtcbiAgdGhpcy5maXJzdENvbHVtbiA9IGxvY0luZm8uZmlyc3RfY29sdW1uO1xuICB0aGlzLmxhc3RDb2x1bW4gID0gbG9jSW5mby5sYXN0X2NvbHVtbjtcbiAgdGhpcy5sYXN0TGluZSAgICA9IGxvY0luZm8ubGFzdF9saW5lO1xufVxuXG52YXIgQVNUID0ge1xuICBQcm9ncmFtTm9kZTogZnVuY3Rpb24oc3RhdGVtZW50cywgaW52ZXJzZVN0cmlwLCBpbnZlcnNlLCBsb2NJbmZvKSB7XG4gICAgdmFyIGludmVyc2VMb2NhdGlvbkluZm8sIGZpcnN0SW52ZXJzZU5vZGU7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDMpIHtcbiAgICAgIGxvY0luZm8gPSBpbnZlcnNlO1xuICAgICAgaW52ZXJzZSA9IG51bGw7XG4gICAgfSBlbHNlIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAyKSB7XG4gICAgICBsb2NJbmZvID0gaW52ZXJzZVN0cmlwO1xuICAgICAgaW52ZXJzZVN0cmlwID0gbnVsbDtcbiAgICB9XG5cbiAgICBMb2NhdGlvbkluZm8uY2FsbCh0aGlzLCBsb2NJbmZvKTtcbiAgICB0aGlzLnR5cGUgPSBcInByb2dyYW1cIjtcbiAgICB0aGlzLnN0YXRlbWVudHMgPSBzdGF0ZW1lbnRzO1xuICAgIHRoaXMuc3RyaXAgPSB7fTtcblxuICAgIGlmKGludmVyc2UpIHtcbiAgICAgIGZpcnN0SW52ZXJzZU5vZGUgPSBpbnZlcnNlWzBdO1xuICAgICAgaWYgKGZpcnN0SW52ZXJzZU5vZGUpIHtcbiAgICAgICAgaW52ZXJzZUxvY2F0aW9uSW5mbyA9IHtcbiAgICAgICAgICBmaXJzdF9saW5lOiBmaXJzdEludmVyc2VOb2RlLmZpcnN0TGluZSxcbiAgICAgICAgICBsYXN0X2xpbmU6IGZpcnN0SW52ZXJzZU5vZGUubGFzdExpbmUsXG4gICAgICAgICAgbGFzdF9jb2x1bW46IGZpcnN0SW52ZXJzZU5vZGUubGFzdENvbHVtbixcbiAgICAgICAgICBmaXJzdF9jb2x1bW46IGZpcnN0SW52ZXJzZU5vZGUuZmlyc3RDb2x1bW5cbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5pbnZlcnNlID0gbmV3IEFTVC5Qcm9ncmFtTm9kZShpbnZlcnNlLCBpbnZlcnNlU3RyaXAsIGludmVyc2VMb2NhdGlvbkluZm8pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5pbnZlcnNlID0gbmV3IEFTVC5Qcm9ncmFtTm9kZShpbnZlcnNlLCBpbnZlcnNlU3RyaXApO1xuICAgICAgfVxuICAgICAgdGhpcy5zdHJpcC5yaWdodCA9IGludmVyc2VTdHJpcC5sZWZ0O1xuICAgIH0gZWxzZSBpZiAoaW52ZXJzZVN0cmlwKSB7XG4gICAgICB0aGlzLnN0cmlwLmxlZnQgPSBpbnZlcnNlU3RyaXAucmlnaHQ7XG4gICAgfVxuICB9LFxuXG4gIE11c3RhY2hlTm9kZTogZnVuY3Rpb24ocmF3UGFyYW1zLCBoYXNoLCBvcGVuLCBzdHJpcCwgbG9jSW5mbykge1xuICAgIExvY2F0aW9uSW5mby5jYWxsKHRoaXMsIGxvY0luZm8pO1xuICAgIHRoaXMudHlwZSA9IFwibXVzdGFjaGVcIjtcbiAgICB0aGlzLnN0cmlwID0gc3RyaXA7XG5cbiAgICAvLyBPcGVuIG1heSBiZSBhIHN0cmluZyBwYXJzZWQgZnJvbSB0aGUgcGFyc2VyIG9yIGEgcGFzc2VkIGJvb2xlYW4gZmxhZ1xuICAgIGlmIChvcGVuICE9IG51bGwgJiYgb3Blbi5jaGFyQXQpIHtcbiAgICAgIC8vIE11c3QgdXNlIGNoYXJBdCB0byBzdXBwb3J0IElFIHByZS0xMFxuICAgICAgdmFyIGVzY2FwZUZsYWcgPSBvcGVuLmNoYXJBdCgzKSB8fCBvcGVuLmNoYXJBdCgyKTtcbiAgICAgIHRoaXMuZXNjYXBlZCA9IGVzY2FwZUZsYWcgIT09ICd7JyAmJiBlc2NhcGVGbGFnICE9PSAnJic7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZXNjYXBlZCA9ICEhb3BlbjtcbiAgICB9XG5cbiAgICBpZiAocmF3UGFyYW1zIGluc3RhbmNlb2YgQVNULlNleHByTm9kZSkge1xuICAgICAgdGhpcy5zZXhwciA9IHJhd1BhcmFtcztcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gU3VwcG9ydCBvbGQgQVNUIEFQSVxuICAgICAgdGhpcy5zZXhwciA9IG5ldyBBU1QuU2V4cHJOb2RlKHJhd1BhcmFtcywgaGFzaCk7XG4gICAgfVxuXG4gICAgdGhpcy5zZXhwci5pc1Jvb3QgPSB0cnVlO1xuXG4gICAgLy8gU3VwcG9ydCBvbGQgQVNUIEFQSSB0aGF0IHN0b3JlZCB0aGlzIGluZm8gaW4gTXVzdGFjaGVOb2RlXG4gICAgdGhpcy5pZCA9IHRoaXMuc2V4cHIuaWQ7XG4gICAgdGhpcy5wYXJhbXMgPSB0aGlzLnNleHByLnBhcmFtcztcbiAgICB0aGlzLmhhc2ggPSB0aGlzLnNleHByLmhhc2g7XG4gICAgdGhpcy5lbGlnaWJsZUhlbHBlciA9IHRoaXMuc2V4cHIuZWxpZ2libGVIZWxwZXI7XG4gICAgdGhpcy5pc0hlbHBlciA9IHRoaXMuc2V4cHIuaXNIZWxwZXI7XG4gIH0sXG5cbiAgU2V4cHJOb2RlOiBmdW5jdGlvbihyYXdQYXJhbXMsIGhhc2gsIGxvY0luZm8pIHtcbiAgICBMb2NhdGlvbkluZm8uY2FsbCh0aGlzLCBsb2NJbmZvKTtcblxuICAgIHRoaXMudHlwZSA9IFwic2V4cHJcIjtcbiAgICB0aGlzLmhhc2ggPSBoYXNoO1xuXG4gICAgdmFyIGlkID0gdGhpcy5pZCA9IHJhd1BhcmFtc1swXTtcbiAgICB2YXIgcGFyYW1zID0gdGhpcy5wYXJhbXMgPSByYXdQYXJhbXMuc2xpY2UoMSk7XG5cbiAgICAvLyBhIG11c3RhY2hlIGlzIGFuIGVsaWdpYmxlIGhlbHBlciBpZjpcbiAgICAvLyAqIGl0cyBpZCBpcyBzaW1wbGUgKGEgc2luZ2xlIHBhcnQsIG5vdCBgdGhpc2Agb3IgYC4uYClcbiAgICB2YXIgZWxpZ2libGVIZWxwZXIgPSB0aGlzLmVsaWdpYmxlSGVscGVyID0gaWQuaXNTaW1wbGU7XG5cbiAgICAvLyBhIG11c3RhY2hlIGlzIGRlZmluaXRlbHkgYSBoZWxwZXIgaWY6XG4gICAgLy8gKiBpdCBpcyBhbiBlbGlnaWJsZSBoZWxwZXIsIGFuZFxuICAgIC8vICogaXQgaGFzIGF0IGxlYXN0IG9uZSBwYXJhbWV0ZXIgb3IgaGFzaCBzZWdtZW50XG4gICAgdGhpcy5pc0hlbHBlciA9IGVsaWdpYmxlSGVscGVyICYmIChwYXJhbXMubGVuZ3RoIHx8IGhhc2gpO1xuXG4gICAgLy8gaWYgYSBtdXN0YWNoZSBpcyBhbiBlbGlnaWJsZSBoZWxwZXIgYnV0IG5vdCBhIGRlZmluaXRlXG4gICAgLy8gaGVscGVyLCBpdCBpcyBhbWJpZ3VvdXMsIGFuZCB3aWxsIGJlIHJlc29sdmVkIGluIGEgbGF0ZXJcbiAgICAvLyBwYXNzIG9yIGF0IHJ1bnRpbWUuXG4gIH0sXG5cbiAgUGFydGlhbE5vZGU6IGZ1bmN0aW9uKHBhcnRpYWxOYW1lLCBjb250ZXh0LCBzdHJpcCwgbG9jSW5mbykge1xuICAgIExvY2F0aW9uSW5mby5jYWxsKHRoaXMsIGxvY0luZm8pO1xuICAgIHRoaXMudHlwZSAgICAgICAgID0gXCJwYXJ0aWFsXCI7XG4gICAgdGhpcy5wYXJ0aWFsTmFtZSAgPSBwYXJ0aWFsTmFtZTtcbiAgICB0aGlzLmNvbnRleHQgICAgICA9IGNvbnRleHQ7XG4gICAgdGhpcy5zdHJpcCA9IHN0cmlwO1xuICB9LFxuXG4gIEJsb2NrTm9kZTogZnVuY3Rpb24obXVzdGFjaGUsIHByb2dyYW0sIGludmVyc2UsIGNsb3NlLCBsb2NJbmZvKSB7XG4gICAgTG9jYXRpb25JbmZvLmNhbGwodGhpcywgbG9jSW5mbyk7XG5cbiAgICBpZihtdXN0YWNoZS5zZXhwci5pZC5vcmlnaW5hbCAhPT0gY2xvc2UucGF0aC5vcmlnaW5hbCkge1xuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihtdXN0YWNoZS5zZXhwci5pZC5vcmlnaW5hbCArIFwiIGRvZXNuJ3QgbWF0Y2ggXCIgKyBjbG9zZS5wYXRoLm9yaWdpbmFsLCB0aGlzKTtcbiAgICB9XG5cbiAgICB0aGlzLnR5cGUgPSAnYmxvY2snO1xuICAgIHRoaXMubXVzdGFjaGUgPSBtdXN0YWNoZTtcbiAgICB0aGlzLnByb2dyYW0gID0gcHJvZ3JhbTtcbiAgICB0aGlzLmludmVyc2UgID0gaW52ZXJzZTtcblxuICAgIHRoaXMuc3RyaXAgPSB7XG4gICAgICBsZWZ0OiBtdXN0YWNoZS5zdHJpcC5sZWZ0LFxuICAgICAgcmlnaHQ6IGNsb3NlLnN0cmlwLnJpZ2h0XG4gICAgfTtcblxuICAgIChwcm9ncmFtIHx8IGludmVyc2UpLnN0cmlwLmxlZnQgPSBtdXN0YWNoZS5zdHJpcC5yaWdodDtcbiAgICAoaW52ZXJzZSB8fCBwcm9ncmFtKS5zdHJpcC5yaWdodCA9IGNsb3NlLnN0cmlwLmxlZnQ7XG5cbiAgICBpZiAoaW52ZXJzZSAmJiAhcHJvZ3JhbSkge1xuICAgICAgdGhpcy5pc0ludmVyc2UgPSB0cnVlO1xuICAgIH1cbiAgfSxcblxuICBDb250ZW50Tm9kZTogZnVuY3Rpb24oc3RyaW5nLCBsb2NJbmZvKSB7XG4gICAgTG9jYXRpb25JbmZvLmNhbGwodGhpcywgbG9jSW5mbyk7XG4gICAgdGhpcy50eXBlID0gXCJjb250ZW50XCI7XG4gICAgdGhpcy5zdHJpbmcgPSBzdHJpbmc7XG4gIH0sXG5cbiAgSGFzaE5vZGU6IGZ1bmN0aW9uKHBhaXJzLCBsb2NJbmZvKSB7XG4gICAgTG9jYXRpb25JbmZvLmNhbGwodGhpcywgbG9jSW5mbyk7XG4gICAgdGhpcy50eXBlID0gXCJoYXNoXCI7XG4gICAgdGhpcy5wYWlycyA9IHBhaXJzO1xuICB9LFxuXG4gIElkTm9kZTogZnVuY3Rpb24ocGFydHMsIGxvY0luZm8pIHtcbiAgICBMb2NhdGlvbkluZm8uY2FsbCh0aGlzLCBsb2NJbmZvKTtcbiAgICB0aGlzLnR5cGUgPSBcIklEXCI7XG5cbiAgICB2YXIgb3JpZ2luYWwgPSBcIlwiLFxuICAgICAgICBkaWcgPSBbXSxcbiAgICAgICAgZGVwdGggPSAwO1xuXG4gICAgZm9yKHZhciBpPTAsbD1wYXJ0cy5sZW5ndGg7IGk8bDsgaSsrKSB7XG4gICAgICB2YXIgcGFydCA9IHBhcnRzW2ldLnBhcnQ7XG4gICAgICBvcmlnaW5hbCArPSAocGFydHNbaV0uc2VwYXJhdG9yIHx8ICcnKSArIHBhcnQ7XG5cbiAgICAgIGlmIChwYXJ0ID09PSBcIi4uXCIgfHwgcGFydCA9PT0gXCIuXCIgfHwgcGFydCA9PT0gXCJ0aGlzXCIpIHtcbiAgICAgICAgaWYgKGRpZy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcIkludmFsaWQgcGF0aDogXCIgKyBvcmlnaW5hbCwgdGhpcyk7XG4gICAgICAgIH0gZWxzZSBpZiAocGFydCA9PT0gXCIuLlwiKSB7XG4gICAgICAgICAgZGVwdGgrKztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLmlzU2NvcGVkID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGlnLnB1c2gocGFydCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5vcmlnaW5hbCA9IG9yaWdpbmFsO1xuICAgIHRoaXMucGFydHMgICAgPSBkaWc7XG4gICAgdGhpcy5zdHJpbmcgICA9IGRpZy5qb2luKCcuJyk7XG4gICAgdGhpcy5kZXB0aCAgICA9IGRlcHRoO1xuXG4gICAgLy8gYW4gSUQgaXMgc2ltcGxlIGlmIGl0IG9ubHkgaGFzIG9uZSBwYXJ0LCBhbmQgdGhhdCBwYXJ0IGlzIG5vdFxuICAgIC8vIGAuLmAgb3IgYHRoaXNgLlxuICAgIHRoaXMuaXNTaW1wbGUgPSBwYXJ0cy5sZW5ndGggPT09IDEgJiYgIXRoaXMuaXNTY29wZWQgJiYgZGVwdGggPT09IDA7XG5cbiAgICB0aGlzLnN0cmluZ01vZGVWYWx1ZSA9IHRoaXMuc3RyaW5nO1xuICB9LFxuXG4gIFBhcnRpYWxOYW1lTm9kZTogZnVuY3Rpb24obmFtZSwgbG9jSW5mbykge1xuICAgIExvY2F0aW9uSW5mby5jYWxsKHRoaXMsIGxvY0luZm8pO1xuICAgIHRoaXMudHlwZSA9IFwiUEFSVElBTF9OQU1FXCI7XG4gICAgdGhpcy5uYW1lID0gbmFtZS5vcmlnaW5hbDtcbiAgfSxcblxuICBEYXRhTm9kZTogZnVuY3Rpb24oaWQsIGxvY0luZm8pIHtcbiAgICBMb2NhdGlvbkluZm8uY2FsbCh0aGlzLCBsb2NJbmZvKTtcbiAgICB0aGlzLnR5cGUgPSBcIkRBVEFcIjtcbiAgICB0aGlzLmlkID0gaWQ7XG4gIH0sXG5cbiAgU3RyaW5nTm9kZTogZnVuY3Rpb24oc3RyaW5nLCBsb2NJbmZvKSB7XG4gICAgTG9jYXRpb25JbmZvLmNhbGwodGhpcywgbG9jSW5mbyk7XG4gICAgdGhpcy50eXBlID0gXCJTVFJJTkdcIjtcbiAgICB0aGlzLm9yaWdpbmFsID1cbiAgICAgIHRoaXMuc3RyaW5nID1cbiAgICAgIHRoaXMuc3RyaW5nTW9kZVZhbHVlID0gc3RyaW5nO1xuICB9LFxuXG4gIEludGVnZXJOb2RlOiBmdW5jdGlvbihpbnRlZ2VyLCBsb2NJbmZvKSB7XG4gICAgTG9jYXRpb25JbmZvLmNhbGwodGhpcywgbG9jSW5mbyk7XG4gICAgdGhpcy50eXBlID0gXCJJTlRFR0VSXCI7XG4gICAgdGhpcy5vcmlnaW5hbCA9XG4gICAgICB0aGlzLmludGVnZXIgPSBpbnRlZ2VyO1xuICAgIHRoaXMuc3RyaW5nTW9kZVZhbHVlID0gTnVtYmVyKGludGVnZXIpO1xuICB9LFxuXG4gIEJvb2xlYW5Ob2RlOiBmdW5jdGlvbihib29sLCBsb2NJbmZvKSB7XG4gICAgTG9jYXRpb25JbmZvLmNhbGwodGhpcywgbG9jSW5mbyk7XG4gICAgdGhpcy50eXBlID0gXCJCT09MRUFOXCI7XG4gICAgdGhpcy5ib29sID0gYm9vbDtcbiAgICB0aGlzLnN0cmluZ01vZGVWYWx1ZSA9IGJvb2wgPT09IFwidHJ1ZVwiO1xuICB9LFxuXG4gIENvbW1lbnROb2RlOiBmdW5jdGlvbihjb21tZW50LCBsb2NJbmZvKSB7XG4gICAgTG9jYXRpb25JbmZvLmNhbGwodGhpcywgbG9jSW5mbyk7XG4gICAgdGhpcy50eXBlID0gXCJjb21tZW50XCI7XG4gICAgdGhpcy5jb21tZW50ID0gY29tbWVudDtcbiAgfVxufTtcblxuLy8gTXVzdCBiZSBleHBvcnRlZCBhcyBhbiBvYmplY3QgcmF0aGVyIHRoYW4gdGhlIHJvb3Qgb2YgdGhlIG1vZHVsZSBhcyB0aGUgamlzb24gbGV4ZXJcbi8vIG1vc3QgbW9kaWZ5IHRoZSBvYmplY3QgdG8gb3BlcmF0ZSBwcm9wZXJseS5cbmV4cG9ydHNbXCJkZWZhdWx0XCJdID0gQVNUOyIsIlwidXNlIHN0cmljdFwiO1xudmFyIEV4Y2VwdGlvbiA9IHJlcXVpcmUoXCIuLi9leGNlcHRpb25cIilbXCJkZWZhdWx0XCJdO1xuXG5mdW5jdGlvbiBDb21waWxlcigpIHt9XG5cbmV4cG9ydHMuQ29tcGlsZXIgPSBDb21waWxlcjsvLyB0aGUgZm91bmRIZWxwZXIgcmVnaXN0ZXIgd2lsbCBkaXNhbWJpZ3VhdGUgaGVscGVyIGxvb2t1cCBmcm9tIGZpbmRpbmcgYVxuLy8gZnVuY3Rpb24gaW4gYSBjb250ZXh0LiBUaGlzIGlzIG5lY2Vzc2FyeSBmb3IgbXVzdGFjaGUgY29tcGF0aWJpbGl0eSwgd2hpY2hcbi8vIHJlcXVpcmVzIHRoYXQgY29udGV4dCBmdW5jdGlvbnMgaW4gYmxvY2tzIGFyZSBldmFsdWF0ZWQgYnkgYmxvY2tIZWxwZXJNaXNzaW5nLFxuLy8gYW5kIHRoZW4gcHJvY2VlZCBhcyBpZiB0aGUgcmVzdWx0aW5nIHZhbHVlIHdhcyBwcm92aWRlZCB0byBibG9ja0hlbHBlck1pc3NpbmcuXG5cbkNvbXBpbGVyLnByb3RvdHlwZSA9IHtcbiAgY29tcGlsZXI6IENvbXBpbGVyLFxuXG4gIGRpc2Fzc2VtYmxlOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgb3Bjb2RlcyA9IHRoaXMub3Bjb2Rlcywgb3Bjb2RlLCBvdXQgPSBbXSwgcGFyYW1zLCBwYXJhbTtcblxuICAgIGZvciAodmFyIGk9MCwgbD1vcGNvZGVzLmxlbmd0aDsgaTxsOyBpKyspIHtcbiAgICAgIG9wY29kZSA9IG9wY29kZXNbaV07XG5cbiAgICAgIGlmIChvcGNvZGUub3Bjb2RlID09PSAnREVDTEFSRScpIHtcbiAgICAgICAgb3V0LnB1c2goXCJERUNMQVJFIFwiICsgb3Bjb2RlLm5hbWUgKyBcIj1cIiArIG9wY29kZS52YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwYXJhbXMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaj0wOyBqPG9wY29kZS5hcmdzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgcGFyYW0gPSBvcGNvZGUuYXJnc1tqXTtcbiAgICAgICAgICBpZiAodHlwZW9mIHBhcmFtID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICBwYXJhbSA9IFwiXFxcIlwiICsgcGFyYW0ucmVwbGFjZShcIlxcblwiLCBcIlxcXFxuXCIpICsgXCJcXFwiXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIHBhcmFtcy5wdXNoKHBhcmFtKTtcbiAgICAgICAgfVxuICAgICAgICBvdXQucHVzaChvcGNvZGUub3Bjb2RlICsgXCIgXCIgKyBwYXJhbXMuam9pbihcIiBcIikpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBvdXQuam9pbihcIlxcblwiKTtcbiAgfSxcblxuICBlcXVhbHM6IGZ1bmN0aW9uKG90aGVyKSB7XG4gICAgdmFyIGxlbiA9IHRoaXMub3Bjb2Rlcy5sZW5ndGg7XG4gICAgaWYgKG90aGVyLm9wY29kZXMubGVuZ3RoICE9PSBsZW4pIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICB2YXIgb3Bjb2RlID0gdGhpcy5vcGNvZGVzW2ldLFxuICAgICAgICAgIG90aGVyT3Bjb2RlID0gb3RoZXIub3Bjb2Rlc1tpXTtcbiAgICAgIGlmIChvcGNvZGUub3Bjb2RlICE9PSBvdGhlck9wY29kZS5vcGNvZGUgfHwgb3Bjb2RlLmFyZ3MubGVuZ3RoICE9PSBvdGhlck9wY29kZS5hcmdzLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IG9wY29kZS5hcmdzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIGlmIChvcGNvZGUuYXJnc1tqXSAhPT0gb3RoZXJPcGNvZGUuYXJnc1tqXSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGxlbiA9IHRoaXMuY2hpbGRyZW4ubGVuZ3RoO1xuICAgIGlmIChvdGhlci5jaGlsZHJlbi5sZW5ndGggIT09IGxlbikge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGlmICghdGhpcy5jaGlsZHJlbltpXS5lcXVhbHMob3RoZXIuY2hpbGRyZW5baV0pKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSxcblxuICBndWlkOiAwLFxuXG4gIGNvbXBpbGU6IGZ1bmN0aW9uKHByb2dyYW0sIG9wdGlvbnMpIHtcbiAgICB0aGlzLm9wY29kZXMgPSBbXTtcbiAgICB0aGlzLmNoaWxkcmVuID0gW107XG4gICAgdGhpcy5kZXB0aHMgPSB7bGlzdDogW119O1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG5cbiAgICAvLyBUaGVzZSBjaGFuZ2VzIHdpbGwgcHJvcGFnYXRlIHRvIHRoZSBvdGhlciBjb21waWxlciBjb21wb25lbnRzXG4gICAgdmFyIGtub3duSGVscGVycyA9IHRoaXMub3B0aW9ucy5rbm93bkhlbHBlcnM7XG4gICAgdGhpcy5vcHRpb25zLmtub3duSGVscGVycyA9IHtcbiAgICAgICdoZWxwZXJNaXNzaW5nJzogdHJ1ZSxcbiAgICAgICdibG9ja0hlbHBlck1pc3NpbmcnOiB0cnVlLFxuICAgICAgJ2VhY2gnOiB0cnVlLFxuICAgICAgJ2lmJzogdHJ1ZSxcbiAgICAgICd1bmxlc3MnOiB0cnVlLFxuICAgICAgJ3dpdGgnOiB0cnVlLFxuICAgICAgJ2xvZyc6IHRydWVcbiAgICB9O1xuICAgIGlmIChrbm93bkhlbHBlcnMpIHtcbiAgICAgIGZvciAodmFyIG5hbWUgaW4ga25vd25IZWxwZXJzKSB7XG4gICAgICAgIHRoaXMub3B0aW9ucy5rbm93bkhlbHBlcnNbbmFtZV0gPSBrbm93bkhlbHBlcnNbbmFtZV07XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuYWNjZXB0KHByb2dyYW0pO1xuICB9LFxuXG4gIGFjY2VwdDogZnVuY3Rpb24obm9kZSkge1xuICAgIHZhciBzdHJpcCA9IG5vZGUuc3RyaXAgfHwge30sXG4gICAgICAgIHJldDtcbiAgICBpZiAoc3RyaXAubGVmdCkge1xuICAgICAgdGhpcy5vcGNvZGUoJ3N0cmlwJyk7XG4gICAgfVxuXG4gICAgcmV0ID0gdGhpc1tub2RlLnR5cGVdKG5vZGUpO1xuXG4gICAgaWYgKHN0cmlwLnJpZ2h0KSB7XG4gICAgICB0aGlzLm9wY29kZSgnc3RyaXAnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmV0O1xuICB9LFxuXG4gIHByb2dyYW06IGZ1bmN0aW9uKHByb2dyYW0pIHtcbiAgICB2YXIgc3RhdGVtZW50cyA9IHByb2dyYW0uc3RhdGVtZW50cztcblxuICAgIGZvcih2YXIgaT0wLCBsPXN0YXRlbWVudHMubGVuZ3RoOyBpPGw7IGkrKykge1xuICAgICAgdGhpcy5hY2NlcHQoc3RhdGVtZW50c1tpXSk7XG4gICAgfVxuICAgIHRoaXMuaXNTaW1wbGUgPSBsID09PSAxO1xuXG4gICAgdGhpcy5kZXB0aHMubGlzdCA9IHRoaXMuZGVwdGhzLmxpc3Quc29ydChmdW5jdGlvbihhLCBiKSB7XG4gICAgICByZXR1cm4gYSAtIGI7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICBjb21waWxlUHJvZ3JhbTogZnVuY3Rpb24ocHJvZ3JhbSkge1xuICAgIHZhciByZXN1bHQgPSBuZXcgdGhpcy5jb21waWxlcigpLmNvbXBpbGUocHJvZ3JhbSwgdGhpcy5vcHRpb25zKTtcbiAgICB2YXIgZ3VpZCA9IHRoaXMuZ3VpZCsrLCBkZXB0aDtcblxuICAgIHRoaXMudXNlUGFydGlhbCA9IHRoaXMudXNlUGFydGlhbCB8fCByZXN1bHQudXNlUGFydGlhbDtcblxuICAgIHRoaXMuY2hpbGRyZW5bZ3VpZF0gPSByZXN1bHQ7XG5cbiAgICBmb3IodmFyIGk9MCwgbD1yZXN1bHQuZGVwdGhzLmxpc3QubGVuZ3RoOyBpPGw7IGkrKykge1xuICAgICAgZGVwdGggPSByZXN1bHQuZGVwdGhzLmxpc3RbaV07XG5cbiAgICAgIGlmKGRlcHRoIDwgMikgeyBjb250aW51ZTsgfVxuICAgICAgZWxzZSB7IHRoaXMuYWRkRGVwdGgoZGVwdGggLSAxKTsgfVxuICAgIH1cblxuICAgIHJldHVybiBndWlkO1xuICB9LFxuXG4gIGJsb2NrOiBmdW5jdGlvbihibG9jaykge1xuICAgIHZhciBtdXN0YWNoZSA9IGJsb2NrLm11c3RhY2hlLFxuICAgICAgICBwcm9ncmFtID0gYmxvY2sucHJvZ3JhbSxcbiAgICAgICAgaW52ZXJzZSA9IGJsb2NrLmludmVyc2U7XG5cbiAgICBpZiAocHJvZ3JhbSkge1xuICAgICAgcHJvZ3JhbSA9IHRoaXMuY29tcGlsZVByb2dyYW0ocHJvZ3JhbSk7XG4gICAgfVxuXG4gICAgaWYgKGludmVyc2UpIHtcbiAgICAgIGludmVyc2UgPSB0aGlzLmNvbXBpbGVQcm9ncmFtKGludmVyc2UpO1xuICAgIH1cblxuICAgIHZhciBzZXhwciA9IG11c3RhY2hlLnNleHByO1xuICAgIHZhciB0eXBlID0gdGhpcy5jbGFzc2lmeVNleHByKHNleHByKTtcblxuICAgIGlmICh0eXBlID09PSBcImhlbHBlclwiKSB7XG4gICAgICB0aGlzLmhlbHBlclNleHByKHNleHByLCBwcm9ncmFtLCBpbnZlcnNlKTtcbiAgICB9IGVsc2UgaWYgKHR5cGUgPT09IFwic2ltcGxlXCIpIHtcbiAgICAgIHRoaXMuc2ltcGxlU2V4cHIoc2V4cHIpO1xuXG4gICAgICAvLyBub3cgdGhhdCB0aGUgc2ltcGxlIG11c3RhY2hlIGlzIHJlc29sdmVkLCB3ZSBuZWVkIHRvXG4gICAgICAvLyBldmFsdWF0ZSBpdCBieSBleGVjdXRpbmcgYGJsb2NrSGVscGVyTWlzc2luZ2BcbiAgICAgIHRoaXMub3Bjb2RlKCdwdXNoUHJvZ3JhbScsIHByb2dyYW0pO1xuICAgICAgdGhpcy5vcGNvZGUoJ3B1c2hQcm9ncmFtJywgaW52ZXJzZSk7XG4gICAgICB0aGlzLm9wY29kZSgnZW1wdHlIYXNoJyk7XG4gICAgICB0aGlzLm9wY29kZSgnYmxvY2tWYWx1ZScpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmFtYmlndW91c1NleHByKHNleHByLCBwcm9ncmFtLCBpbnZlcnNlKTtcblxuICAgICAgLy8gbm93IHRoYXQgdGhlIHNpbXBsZSBtdXN0YWNoZSBpcyByZXNvbHZlZCwgd2UgbmVlZCB0b1xuICAgICAgLy8gZXZhbHVhdGUgaXQgYnkgZXhlY3V0aW5nIGBibG9ja0hlbHBlck1pc3NpbmdgXG4gICAgICB0aGlzLm9wY29kZSgncHVzaFByb2dyYW0nLCBwcm9ncmFtKTtcbiAgICAgIHRoaXMub3Bjb2RlKCdwdXNoUHJvZ3JhbScsIGludmVyc2UpO1xuICAgICAgdGhpcy5vcGNvZGUoJ2VtcHR5SGFzaCcpO1xuICAgICAgdGhpcy5vcGNvZGUoJ2FtYmlndW91c0Jsb2NrVmFsdWUnKTtcbiAgICB9XG5cbiAgICB0aGlzLm9wY29kZSgnYXBwZW5kJyk7XG4gIH0sXG5cbiAgaGFzaDogZnVuY3Rpb24oaGFzaCkge1xuICAgIHZhciBwYWlycyA9IGhhc2gucGFpcnMsIHBhaXIsIHZhbDtcblxuICAgIHRoaXMub3Bjb2RlKCdwdXNoSGFzaCcpO1xuXG4gICAgZm9yKHZhciBpPTAsIGw9cGFpcnMubGVuZ3RoOyBpPGw7IGkrKykge1xuICAgICAgcGFpciA9IHBhaXJzW2ldO1xuICAgICAgdmFsICA9IHBhaXJbMV07XG5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaW5nUGFyYW1zKSB7XG4gICAgICAgIGlmKHZhbC5kZXB0aCkge1xuICAgICAgICAgIHRoaXMuYWRkRGVwdGgodmFsLmRlcHRoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLm9wY29kZSgnZ2V0Q29udGV4dCcsIHZhbC5kZXB0aCB8fCAwKTtcbiAgICAgICAgdGhpcy5vcGNvZGUoJ3B1c2hTdHJpbmdQYXJhbScsIHZhbC5zdHJpbmdNb2RlVmFsdWUsIHZhbC50eXBlKTtcblxuICAgICAgICBpZiAodmFsLnR5cGUgPT09ICdzZXhwcicpIHtcbiAgICAgICAgICAvLyBTdWJleHByZXNzaW9ucyBnZXQgZXZhbHVhdGVkIGFuZCBwYXNzZWQgaW5cbiAgICAgICAgICAvLyBpbiBzdHJpbmcgcGFyYW1zIG1vZGUuXG4gICAgICAgICAgdGhpcy5zZXhwcih2YWwpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmFjY2VwdCh2YWwpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLm9wY29kZSgnYXNzaWduVG9IYXNoJywgcGFpclswXSk7XG4gICAgfVxuICAgIHRoaXMub3Bjb2RlKCdwb3BIYXNoJyk7XG4gIH0sXG5cbiAgcGFydGlhbDogZnVuY3Rpb24ocGFydGlhbCkge1xuICAgIHZhciBwYXJ0aWFsTmFtZSA9IHBhcnRpYWwucGFydGlhbE5hbWU7XG4gICAgdGhpcy51c2VQYXJ0aWFsID0gdHJ1ZTtcblxuICAgIGlmKHBhcnRpYWwuY29udGV4dCkge1xuICAgICAgdGhpcy5JRChwYXJ0aWFsLmNvbnRleHQpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLm9wY29kZSgncHVzaCcsICdkZXB0aDAnKTtcbiAgICB9XG5cbiAgICB0aGlzLm9wY29kZSgnaW52b2tlUGFydGlhbCcsIHBhcnRpYWxOYW1lLm5hbWUpO1xuICAgIHRoaXMub3Bjb2RlKCdhcHBlbmQnKTtcbiAgfSxcblxuICBjb250ZW50OiBmdW5jdGlvbihjb250ZW50KSB7XG4gICAgdGhpcy5vcGNvZGUoJ2FwcGVuZENvbnRlbnQnLCBjb250ZW50LnN0cmluZyk7XG4gIH0sXG5cbiAgbXVzdGFjaGU6IGZ1bmN0aW9uKG11c3RhY2hlKSB7XG4gICAgdGhpcy5zZXhwcihtdXN0YWNoZS5zZXhwcik7XG5cbiAgICBpZihtdXN0YWNoZS5lc2NhcGVkICYmICF0aGlzLm9wdGlvbnMubm9Fc2NhcGUpIHtcbiAgICAgIHRoaXMub3Bjb2RlKCdhcHBlbmRFc2NhcGVkJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMub3Bjb2RlKCdhcHBlbmQnKTtcbiAgICB9XG4gIH0sXG5cbiAgYW1iaWd1b3VzU2V4cHI6IGZ1bmN0aW9uKHNleHByLCBwcm9ncmFtLCBpbnZlcnNlKSB7XG4gICAgdmFyIGlkID0gc2V4cHIuaWQsXG4gICAgICAgIG5hbWUgPSBpZC5wYXJ0c1swXSxcbiAgICAgICAgaXNCbG9jayA9IHByb2dyYW0gIT0gbnVsbCB8fCBpbnZlcnNlICE9IG51bGw7XG5cbiAgICB0aGlzLm9wY29kZSgnZ2V0Q29udGV4dCcsIGlkLmRlcHRoKTtcblxuICAgIHRoaXMub3Bjb2RlKCdwdXNoUHJvZ3JhbScsIHByb2dyYW0pO1xuICAgIHRoaXMub3Bjb2RlKCdwdXNoUHJvZ3JhbScsIGludmVyc2UpO1xuXG4gICAgdGhpcy5vcGNvZGUoJ2ludm9rZUFtYmlndW91cycsIG5hbWUsIGlzQmxvY2spO1xuICB9LFxuXG4gIHNpbXBsZVNleHByOiBmdW5jdGlvbihzZXhwcikge1xuICAgIHZhciBpZCA9IHNleHByLmlkO1xuXG4gICAgaWYgKGlkLnR5cGUgPT09ICdEQVRBJykge1xuICAgICAgdGhpcy5EQVRBKGlkKTtcbiAgICB9IGVsc2UgaWYgKGlkLnBhcnRzLmxlbmd0aCkge1xuICAgICAgdGhpcy5JRChpZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFNpbXBsaWZpZWQgSUQgZm9yIGB0aGlzYFxuICAgICAgdGhpcy5hZGREZXB0aChpZC5kZXB0aCk7XG4gICAgICB0aGlzLm9wY29kZSgnZ2V0Q29udGV4dCcsIGlkLmRlcHRoKTtcbiAgICAgIHRoaXMub3Bjb2RlKCdwdXNoQ29udGV4dCcpO1xuICAgIH1cblxuICAgIHRoaXMub3Bjb2RlKCdyZXNvbHZlUG9zc2libGVMYW1iZGEnKTtcbiAgfSxcblxuICBoZWxwZXJTZXhwcjogZnVuY3Rpb24oc2V4cHIsIHByb2dyYW0sIGludmVyc2UpIHtcbiAgICB2YXIgcGFyYW1zID0gdGhpcy5zZXR1cEZ1bGxNdXN0YWNoZVBhcmFtcyhzZXhwciwgcHJvZ3JhbSwgaW52ZXJzZSksXG4gICAgICAgIG5hbWUgPSBzZXhwci5pZC5wYXJ0c1swXTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMua25vd25IZWxwZXJzW25hbWVdKSB7XG4gICAgICB0aGlzLm9wY29kZSgnaW52b2tlS25vd25IZWxwZXInLCBwYXJhbXMubGVuZ3RoLCBuYW1lKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMub3B0aW9ucy5rbm93bkhlbHBlcnNPbmx5KSB7XG4gICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKFwiWW91IHNwZWNpZmllZCBrbm93bkhlbHBlcnNPbmx5LCBidXQgdXNlZCB0aGUgdW5rbm93biBoZWxwZXIgXCIgKyBuYW1lLCBzZXhwcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMub3Bjb2RlKCdpbnZva2VIZWxwZXInLCBwYXJhbXMubGVuZ3RoLCBuYW1lLCBzZXhwci5pc1Jvb3QpO1xuICAgIH1cbiAgfSxcblxuICBzZXhwcjogZnVuY3Rpb24oc2V4cHIpIHtcbiAgICB2YXIgdHlwZSA9IHRoaXMuY2xhc3NpZnlTZXhwcihzZXhwcik7XG5cbiAgICBpZiAodHlwZSA9PT0gXCJzaW1wbGVcIikge1xuICAgICAgdGhpcy5zaW1wbGVTZXhwcihzZXhwcik7XG4gICAgfSBlbHNlIGlmICh0eXBlID09PSBcImhlbHBlclwiKSB7XG4gICAgICB0aGlzLmhlbHBlclNleHByKHNleHByKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5hbWJpZ3VvdXNTZXhwcihzZXhwcik7XG4gICAgfVxuICB9LFxuXG4gIElEOiBmdW5jdGlvbihpZCkge1xuICAgIHRoaXMuYWRkRGVwdGgoaWQuZGVwdGgpO1xuICAgIHRoaXMub3Bjb2RlKCdnZXRDb250ZXh0JywgaWQuZGVwdGgpO1xuXG4gICAgdmFyIG5hbWUgPSBpZC5wYXJ0c1swXTtcbiAgICBpZiAoIW5hbWUpIHtcbiAgICAgIHRoaXMub3Bjb2RlKCdwdXNoQ29udGV4dCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLm9wY29kZSgnbG9va3VwT25Db250ZXh0JywgaWQucGFydHNbMF0pO1xuICAgIH1cblxuICAgIGZvcih2YXIgaT0xLCBsPWlkLnBhcnRzLmxlbmd0aDsgaTxsOyBpKyspIHtcbiAgICAgIHRoaXMub3Bjb2RlKCdsb29rdXAnLCBpZC5wYXJ0c1tpXSk7XG4gICAgfVxuICB9LFxuXG4gIERBVEE6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICB0aGlzLm9wdGlvbnMuZGF0YSA9IHRydWU7XG4gICAgaWYgKGRhdGEuaWQuaXNTY29wZWQgfHwgZGF0YS5pZC5kZXB0aCkge1xuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbignU2NvcGVkIGRhdGEgcmVmZXJlbmNlcyBhcmUgbm90IHN1cHBvcnRlZDogJyArIGRhdGEub3JpZ2luYWwsIGRhdGEpO1xuICAgIH1cblxuICAgIHRoaXMub3Bjb2RlKCdsb29rdXBEYXRhJyk7XG4gICAgdmFyIHBhcnRzID0gZGF0YS5pZC5wYXJ0cztcbiAgICBmb3IodmFyIGk9MCwgbD1wYXJ0cy5sZW5ndGg7IGk8bDsgaSsrKSB7XG4gICAgICB0aGlzLm9wY29kZSgnbG9va3VwJywgcGFydHNbaV0pO1xuICAgIH1cbiAgfSxcblxuICBTVFJJTkc6IGZ1bmN0aW9uKHN0cmluZykge1xuICAgIHRoaXMub3Bjb2RlKCdwdXNoU3RyaW5nJywgc3RyaW5nLnN0cmluZyk7XG4gIH0sXG5cbiAgSU5URUdFUjogZnVuY3Rpb24oaW50ZWdlcikge1xuICAgIHRoaXMub3Bjb2RlKCdwdXNoTGl0ZXJhbCcsIGludGVnZXIuaW50ZWdlcik7XG4gIH0sXG5cbiAgQk9PTEVBTjogZnVuY3Rpb24oYm9vbCkge1xuICAgIHRoaXMub3Bjb2RlKCdwdXNoTGl0ZXJhbCcsIGJvb2wuYm9vbCk7XG4gIH0sXG5cbiAgY29tbWVudDogZnVuY3Rpb24oKSB7fSxcblxuICAvLyBIRUxQRVJTXG4gIG9wY29kZTogZnVuY3Rpb24obmFtZSkge1xuICAgIHRoaXMub3Bjb2Rlcy5wdXNoKHsgb3Bjb2RlOiBuYW1lLCBhcmdzOiBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkgfSk7XG4gIH0sXG5cbiAgZGVjbGFyZTogZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICB0aGlzLm9wY29kZXMucHVzaCh7IG9wY29kZTogJ0RFQ0xBUkUnLCBuYW1lOiBuYW1lLCB2YWx1ZTogdmFsdWUgfSk7XG4gIH0sXG5cbiAgYWRkRGVwdGg6IGZ1bmN0aW9uKGRlcHRoKSB7XG4gICAgaWYoZGVwdGggPT09IDApIHsgcmV0dXJuOyB9XG5cbiAgICBpZighdGhpcy5kZXB0aHNbZGVwdGhdKSB7XG4gICAgICB0aGlzLmRlcHRoc1tkZXB0aF0gPSB0cnVlO1xuICAgICAgdGhpcy5kZXB0aHMubGlzdC5wdXNoKGRlcHRoKTtcbiAgICB9XG4gIH0sXG5cbiAgY2xhc3NpZnlTZXhwcjogZnVuY3Rpb24oc2V4cHIpIHtcbiAgICB2YXIgaXNIZWxwZXIgICA9IHNleHByLmlzSGVscGVyO1xuICAgIHZhciBpc0VsaWdpYmxlID0gc2V4cHIuZWxpZ2libGVIZWxwZXI7XG4gICAgdmFyIG9wdGlvbnMgICAgPSB0aGlzLm9wdGlvbnM7XG5cbiAgICAvLyBpZiBhbWJpZ3VvdXMsIHdlIGNhbiBwb3NzaWJseSByZXNvbHZlIHRoZSBhbWJpZ3VpdHkgbm93XG4gICAgaWYgKGlzRWxpZ2libGUgJiYgIWlzSGVscGVyKSB7XG4gICAgICB2YXIgbmFtZSA9IHNleHByLmlkLnBhcnRzWzBdO1xuXG4gICAgICBpZiAob3B0aW9ucy5rbm93bkhlbHBlcnNbbmFtZV0pIHtcbiAgICAgICAgaXNIZWxwZXIgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChvcHRpb25zLmtub3duSGVscGVyc09ubHkpIHtcbiAgICAgICAgaXNFbGlnaWJsZSA9IGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChpc0hlbHBlcikgeyByZXR1cm4gXCJoZWxwZXJcIjsgfVxuICAgIGVsc2UgaWYgKGlzRWxpZ2libGUpIHsgcmV0dXJuIFwiYW1iaWd1b3VzXCI7IH1cbiAgICBlbHNlIHsgcmV0dXJuIFwic2ltcGxlXCI7IH1cbiAgfSxcblxuICBwdXNoUGFyYW1zOiBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICB2YXIgaSA9IHBhcmFtcy5sZW5ndGgsIHBhcmFtO1xuXG4gICAgd2hpbGUoaS0tKSB7XG4gICAgICBwYXJhbSA9IHBhcmFtc1tpXTtcblxuICAgICAgaWYodGhpcy5vcHRpb25zLnN0cmluZ1BhcmFtcykge1xuICAgICAgICBpZihwYXJhbS5kZXB0aCkge1xuICAgICAgICAgIHRoaXMuYWRkRGVwdGgocGFyYW0uZGVwdGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5vcGNvZGUoJ2dldENvbnRleHQnLCBwYXJhbS5kZXB0aCB8fCAwKTtcbiAgICAgICAgdGhpcy5vcGNvZGUoJ3B1c2hTdHJpbmdQYXJhbScsIHBhcmFtLnN0cmluZ01vZGVWYWx1ZSwgcGFyYW0udHlwZSk7XG5cbiAgICAgICAgaWYgKHBhcmFtLnR5cGUgPT09ICdzZXhwcicpIHtcbiAgICAgICAgICAvLyBTdWJleHByZXNzaW9ucyBnZXQgZXZhbHVhdGVkIGFuZCBwYXNzZWQgaW5cbiAgICAgICAgICAvLyBpbiBzdHJpbmcgcGFyYW1zIG1vZGUuXG4gICAgICAgICAgdGhpcy5zZXhwcihwYXJhbSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXNbcGFyYW0udHlwZV0ocGFyYW0pO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBzZXR1cEZ1bGxNdXN0YWNoZVBhcmFtczogZnVuY3Rpb24oc2V4cHIsIHByb2dyYW0sIGludmVyc2UpIHtcbiAgICB2YXIgcGFyYW1zID0gc2V4cHIucGFyYW1zO1xuICAgIHRoaXMucHVzaFBhcmFtcyhwYXJhbXMpO1xuXG4gICAgdGhpcy5vcGNvZGUoJ3B1c2hQcm9ncmFtJywgcHJvZ3JhbSk7XG4gICAgdGhpcy5vcGNvZGUoJ3B1c2hQcm9ncmFtJywgaW52ZXJzZSk7XG5cbiAgICBpZiAoc2V4cHIuaGFzaCkge1xuICAgICAgdGhpcy5oYXNoKHNleHByLmhhc2gpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLm9wY29kZSgnZW1wdHlIYXNoJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHBhcmFtcztcbiAgfVxufTtcblxuZnVuY3Rpb24gcHJlY29tcGlsZShpbnB1dCwgb3B0aW9ucywgZW52KSB7XG4gIGlmIChpbnB1dCA9PSBudWxsIHx8ICh0eXBlb2YgaW5wdXQgIT09ICdzdHJpbmcnICYmIGlucHV0LmNvbnN0cnVjdG9yICE9PSBlbnYuQVNULlByb2dyYW1Ob2RlKSkge1xuICAgIHRocm93IG5ldyBFeGNlcHRpb24oXCJZb3UgbXVzdCBwYXNzIGEgc3RyaW5nIG9yIEhhbmRsZWJhcnMgQVNUIHRvIEhhbmRsZWJhcnMucHJlY29tcGlsZS4gWW91IHBhc3NlZCBcIiArIGlucHV0KTtcbiAgfVxuXG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBpZiAoISgnZGF0YScgaW4gb3B0aW9ucykpIHtcbiAgICBvcHRpb25zLmRhdGEgPSB0cnVlO1xuICB9XG5cbiAgdmFyIGFzdCA9IGVudi5wYXJzZShpbnB1dCk7XG4gIHZhciBlbnZpcm9ubWVudCA9IG5ldyBlbnYuQ29tcGlsZXIoKS5jb21waWxlKGFzdCwgb3B0aW9ucyk7XG4gIHJldHVybiBuZXcgZW52LkphdmFTY3JpcHRDb21waWxlcigpLmNvbXBpbGUoZW52aXJvbm1lbnQsIG9wdGlvbnMpO1xufVxuXG5leHBvcnRzLnByZWNvbXBpbGUgPSBwcmVjb21waWxlO2Z1bmN0aW9uIGNvbXBpbGUoaW5wdXQsIG9wdGlvbnMsIGVudikge1xuICBpZiAoaW5wdXQgPT0gbnVsbCB8fCAodHlwZW9mIGlucHV0ICE9PSAnc3RyaW5nJyAmJiBpbnB1dC5jb25zdHJ1Y3RvciAhPT0gZW52LkFTVC5Qcm9ncmFtTm9kZSkpIHtcbiAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKFwiWW91IG11c3QgcGFzcyBhIHN0cmluZyBvciBIYW5kbGViYXJzIEFTVCB0byBIYW5kbGViYXJzLmNvbXBpbGUuIFlvdSBwYXNzZWQgXCIgKyBpbnB1dCk7XG4gIH1cblxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICBpZiAoISgnZGF0YScgaW4gb3B0aW9ucykpIHtcbiAgICBvcHRpb25zLmRhdGEgPSB0cnVlO1xuICB9XG5cbiAgdmFyIGNvbXBpbGVkO1xuXG4gIGZ1bmN0aW9uIGNvbXBpbGVJbnB1dCgpIHtcbiAgICB2YXIgYXN0ID0gZW52LnBhcnNlKGlucHV0KTtcbiAgICB2YXIgZW52aXJvbm1lbnQgPSBuZXcgZW52LkNvbXBpbGVyKCkuY29tcGlsZShhc3QsIG9wdGlvbnMpO1xuICAgIHZhciB0ZW1wbGF0ZVNwZWMgPSBuZXcgZW52LkphdmFTY3JpcHRDb21waWxlcigpLmNvbXBpbGUoZW52aXJvbm1lbnQsIG9wdGlvbnMsIHVuZGVmaW5lZCwgdHJ1ZSk7XG4gICAgcmV0dXJuIGVudi50ZW1wbGF0ZSh0ZW1wbGF0ZVNwZWMpO1xuICB9XG5cbiAgLy8gVGVtcGxhdGUgaXMgb25seSBjb21waWxlZCBvbiBmaXJzdCB1c2UgYW5kIGNhY2hlZCBhZnRlciB0aGF0IHBvaW50LlxuICByZXR1cm4gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIGlmICghY29tcGlsZWQpIHtcbiAgICAgIGNvbXBpbGVkID0gY29tcGlsZUlucHV0KCk7XG4gICAgfVxuICAgIHJldHVybiBjb21waWxlZC5jYWxsKHRoaXMsIGNvbnRleHQsIG9wdGlvbnMpO1xuICB9O1xufVxuXG5leHBvcnRzLmNvbXBpbGUgPSBjb21waWxlOyIsIlwidXNlIHN0cmljdFwiO1xudmFyIENPTVBJTEVSX1JFVklTSU9OID0gcmVxdWlyZShcIi4uL2Jhc2VcIikuQ09NUElMRVJfUkVWSVNJT047XG52YXIgUkVWSVNJT05fQ0hBTkdFUyA9IHJlcXVpcmUoXCIuLi9iYXNlXCIpLlJFVklTSU9OX0NIQU5HRVM7XG52YXIgbG9nID0gcmVxdWlyZShcIi4uL2Jhc2VcIikubG9nO1xudmFyIEV4Y2VwdGlvbiA9IHJlcXVpcmUoXCIuLi9leGNlcHRpb25cIilbXCJkZWZhdWx0XCJdO1xuXG5mdW5jdGlvbiBMaXRlcmFsKHZhbHVlKSB7XG4gIHRoaXMudmFsdWUgPSB2YWx1ZTtcbn1cblxuZnVuY3Rpb24gSmF2YVNjcmlwdENvbXBpbGVyKCkge31cblxuSmF2YVNjcmlwdENvbXBpbGVyLnByb3RvdHlwZSA9IHtcbiAgLy8gUFVCTElDIEFQSTogWW91IGNhbiBvdmVycmlkZSB0aGVzZSBtZXRob2RzIGluIGEgc3ViY2xhc3MgdG8gcHJvdmlkZVxuICAvLyBhbHRlcm5hdGl2ZSBjb21waWxlZCBmb3JtcyBmb3IgbmFtZSBsb29rdXAgYW5kIGJ1ZmZlcmluZyBzZW1hbnRpY3NcbiAgbmFtZUxvb2t1cDogZnVuY3Rpb24ocGFyZW50LCBuYW1lIC8qICwgdHlwZSovKSB7XG4gICAgdmFyIHdyYXAsXG4gICAgICAgIHJldDtcbiAgICBpZiAocGFyZW50LmluZGV4T2YoJ2RlcHRoJykgPT09IDApIHtcbiAgICAgIHdyYXAgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmICgvXlswLTldKyQvLnRlc3QobmFtZSkpIHtcbiAgICAgIHJldCA9IHBhcmVudCArIFwiW1wiICsgbmFtZSArIFwiXVwiO1xuICAgIH0gZWxzZSBpZiAoSmF2YVNjcmlwdENvbXBpbGVyLmlzVmFsaWRKYXZhU2NyaXB0VmFyaWFibGVOYW1lKG5hbWUpKSB7XG4gICAgICByZXQgPSBwYXJlbnQgKyBcIi5cIiArIG5hbWU7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcmV0ID0gcGFyZW50ICsgXCJbJ1wiICsgbmFtZSArIFwiJ11cIjtcbiAgICB9XG5cbiAgICBpZiAod3JhcCkge1xuICAgICAgcmV0dXJuICcoJyArIHBhcmVudCArICcgJiYgJyArIHJldCArICcpJztcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG4gIH0sXG5cbiAgY29tcGlsZXJJbmZvOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgcmV2aXNpb24gPSBDT01QSUxFUl9SRVZJU0lPTixcbiAgICAgICAgdmVyc2lvbnMgPSBSRVZJU0lPTl9DSEFOR0VTW3JldmlzaW9uXTtcbiAgICByZXR1cm4gXCJ0aGlzLmNvbXBpbGVySW5mbyA9IFtcIityZXZpc2lvbitcIiwnXCIrdmVyc2lvbnMrXCInXTtcXG5cIjtcbiAgfSxcblxuICBhcHBlbmRUb0J1ZmZlcjogZnVuY3Rpb24oc3RyaW5nKSB7XG4gICAgaWYgKHRoaXMuZW52aXJvbm1lbnQuaXNTaW1wbGUpIHtcbiAgICAgIHJldHVybiBcInJldHVybiBcIiArIHN0cmluZyArIFwiO1wiO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBhcHBlbmRUb0J1ZmZlcjogdHJ1ZSxcbiAgICAgICAgY29udGVudDogc3RyaW5nLFxuICAgICAgICB0b1N0cmluZzogZnVuY3Rpb24oKSB7IHJldHVybiBcImJ1ZmZlciArPSBcIiArIHN0cmluZyArIFwiO1wiOyB9XG4gICAgICB9O1xuICAgIH1cbiAgfSxcblxuICBpbml0aWFsaXplQnVmZmVyOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5xdW90ZWRTdHJpbmcoXCJcIik7XG4gIH0sXG5cbiAgbmFtZXNwYWNlOiBcIkhhbmRsZWJhcnNcIixcbiAgLy8gRU5EIFBVQkxJQyBBUElcblxuICBjb21waWxlOiBmdW5jdGlvbihlbnZpcm9ubWVudCwgb3B0aW9ucywgY29udGV4dCwgYXNPYmplY3QpIHtcbiAgICB0aGlzLmVudmlyb25tZW50ID0gZW52aXJvbm1lbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgIGxvZygnZGVidWcnLCB0aGlzLmVudmlyb25tZW50LmRpc2Fzc2VtYmxlKCkgKyBcIlxcblxcblwiKTtcblxuICAgIHRoaXMubmFtZSA9IHRoaXMuZW52aXJvbm1lbnQubmFtZTtcbiAgICB0aGlzLmlzQ2hpbGQgPSAhIWNvbnRleHQ7XG4gICAgdGhpcy5jb250ZXh0ID0gY29udGV4dCB8fCB7XG4gICAgICBwcm9ncmFtczogW10sXG4gICAgICBlbnZpcm9ubWVudHM6IFtdLFxuICAgICAgYWxpYXNlczogeyB9XG4gICAgfTtcblxuICAgIHRoaXMucHJlYW1ibGUoKTtcblxuICAgIHRoaXMuc3RhY2tTbG90ID0gMDtcbiAgICB0aGlzLnN0YWNrVmFycyA9IFtdO1xuICAgIHRoaXMucmVnaXN0ZXJzID0geyBsaXN0OiBbXSB9O1xuICAgIHRoaXMuaGFzaGVzID0gW107XG4gICAgdGhpcy5jb21waWxlU3RhY2sgPSBbXTtcbiAgICB0aGlzLmlubGluZVN0YWNrID0gW107XG5cbiAgICB0aGlzLmNvbXBpbGVDaGlsZHJlbihlbnZpcm9ubWVudCwgb3B0aW9ucyk7XG5cbiAgICB2YXIgb3Bjb2RlcyA9IGVudmlyb25tZW50Lm9wY29kZXMsIG9wY29kZTtcblxuICAgIHRoaXMuaSA9IDA7XG5cbiAgICBmb3IodmFyIGw9b3Bjb2Rlcy5sZW5ndGg7IHRoaXMuaTxsOyB0aGlzLmkrKykge1xuICAgICAgb3Bjb2RlID0gb3Bjb2Rlc1t0aGlzLmldO1xuXG4gICAgICBpZihvcGNvZGUub3Bjb2RlID09PSAnREVDTEFSRScpIHtcbiAgICAgICAgdGhpc1tvcGNvZGUubmFtZV0gPSBvcGNvZGUudmFsdWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzW29wY29kZS5vcGNvZGVdLmFwcGx5KHRoaXMsIG9wY29kZS5hcmdzKTtcbiAgICAgIH1cblxuICAgICAgLy8gUmVzZXQgdGhlIHN0cmlwTmV4dCBmbGFnIGlmIGl0IHdhcyBub3Qgc2V0IGJ5IHRoaXMgb3BlcmF0aW9uLlxuICAgICAgaWYgKG9wY29kZS5vcGNvZGUgIT09IHRoaXMuc3RyaXBOZXh0KSB7XG4gICAgICAgIHRoaXMuc3RyaXBOZXh0ID0gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gRmx1c2ggYW55IHRyYWlsaW5nIGNvbnRlbnQgdGhhdCBtaWdodCBiZSBwZW5kaW5nLlxuICAgIHRoaXMucHVzaFNvdXJjZSgnJyk7XG5cbiAgICBpZiAodGhpcy5zdGFja1Nsb3QgfHwgdGhpcy5pbmxpbmVTdGFjay5sZW5ndGggfHwgdGhpcy5jb21waWxlU3RhY2subGVuZ3RoKSB7XG4gICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKCdDb21waWxlIGNvbXBsZXRlZCB3aXRoIGNvbnRlbnQgbGVmdCBvbiBzdGFjaycpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmNyZWF0ZUZ1bmN0aW9uQ29udGV4dChhc09iamVjdCk7XG4gIH0sXG5cbiAgcHJlYW1ibGU6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBvdXQgPSBbXTtcblxuICAgIGlmICghdGhpcy5pc0NoaWxkKSB7XG4gICAgICB2YXIgbmFtZXNwYWNlID0gdGhpcy5uYW1lc3BhY2U7XG5cbiAgICAgIHZhciBjb3BpZXMgPSBcImhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIFwiICsgbmFtZXNwYWNlICsgXCIuaGVscGVycyk7XCI7XG4gICAgICBpZiAodGhpcy5lbnZpcm9ubWVudC51c2VQYXJ0aWFsKSB7IGNvcGllcyA9IGNvcGllcyArIFwiIHBhcnRpYWxzID0gdGhpcy5tZXJnZShwYXJ0aWFscywgXCIgKyBuYW1lc3BhY2UgKyBcIi5wYXJ0aWFscyk7XCI7IH1cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuZGF0YSkgeyBjb3BpZXMgPSBjb3BpZXMgKyBcIiBkYXRhID0gZGF0YSB8fCB7fTtcIjsgfVxuICAgICAgb3V0LnB1c2goY29waWVzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0LnB1c2goJycpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5lbnZpcm9ubWVudC5pc1NpbXBsZSkge1xuICAgICAgb3V0LnB1c2goXCIsIGJ1ZmZlciA9IFwiICsgdGhpcy5pbml0aWFsaXplQnVmZmVyKCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQucHVzaChcIlwiKTtcbiAgICB9XG5cbiAgICAvLyB0cmFjayB0aGUgbGFzdCBjb250ZXh0IHB1c2hlZCBpbnRvIHBsYWNlIHRvIGFsbG93IHNraXBwaW5nIHRoZVxuICAgIC8vIGdldENvbnRleHQgb3Bjb2RlIHdoZW4gaXQgd291bGQgYmUgYSBub29wXG4gICAgdGhpcy5sYXN0Q29udGV4dCA9IDA7XG4gICAgdGhpcy5zb3VyY2UgPSBvdXQ7XG4gIH0sXG5cbiAgY3JlYXRlRnVuY3Rpb25Db250ZXh0OiBmdW5jdGlvbihhc09iamVjdCkge1xuICAgIHZhciBsb2NhbHMgPSB0aGlzLnN0YWNrVmFycy5jb25jYXQodGhpcy5yZWdpc3RlcnMubGlzdCk7XG5cbiAgICBpZihsb2NhbHMubGVuZ3RoID4gMCkge1xuICAgICAgdGhpcy5zb3VyY2VbMV0gPSB0aGlzLnNvdXJjZVsxXSArIFwiLCBcIiArIGxvY2Fscy5qb2luKFwiLCBcIik7XG4gICAgfVxuXG4gICAgLy8gR2VuZXJhdGUgbWluaW1pemVyIGFsaWFzIG1hcHBpbmdzXG4gICAgaWYgKCF0aGlzLmlzQ2hpbGQpIHtcbiAgICAgIGZvciAodmFyIGFsaWFzIGluIHRoaXMuY29udGV4dC5hbGlhc2VzKSB7XG4gICAgICAgIGlmICh0aGlzLmNvbnRleHQuYWxpYXNlcy5oYXNPd25Qcm9wZXJ0eShhbGlhcykpIHtcbiAgICAgICAgICB0aGlzLnNvdXJjZVsxXSA9IHRoaXMuc291cmNlWzFdICsgJywgJyArIGFsaWFzICsgJz0nICsgdGhpcy5jb250ZXh0LmFsaWFzZXNbYWxpYXNdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuc291cmNlWzFdKSB7XG4gICAgICB0aGlzLnNvdXJjZVsxXSA9IFwidmFyIFwiICsgdGhpcy5zb3VyY2VbMV0uc3Vic3RyaW5nKDIpICsgXCI7XCI7XG4gICAgfVxuXG4gICAgLy8gTWVyZ2UgY2hpbGRyZW5cbiAgICBpZiAoIXRoaXMuaXNDaGlsZCkge1xuICAgICAgdGhpcy5zb3VyY2VbMV0gKz0gJ1xcbicgKyB0aGlzLmNvbnRleHQucHJvZ3JhbXMuam9pbignXFxuJykgKyAnXFxuJztcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuZW52aXJvbm1lbnQuaXNTaW1wbGUpIHtcbiAgICAgIHRoaXMucHVzaFNvdXJjZShcInJldHVybiBidWZmZXI7XCIpO1xuICAgIH1cblxuICAgIHZhciBwYXJhbXMgPSB0aGlzLmlzQ2hpbGQgPyBbXCJkZXB0aDBcIiwgXCJkYXRhXCJdIDogW1wiSGFuZGxlYmFyc1wiLCBcImRlcHRoMFwiLCBcImhlbHBlcnNcIiwgXCJwYXJ0aWFsc1wiLCBcImRhdGFcIl07XG5cbiAgICBmb3IodmFyIGk9MCwgbD10aGlzLmVudmlyb25tZW50LmRlcHRocy5saXN0Lmxlbmd0aDsgaTxsOyBpKyspIHtcbiAgICAgIHBhcmFtcy5wdXNoKFwiZGVwdGhcIiArIHRoaXMuZW52aXJvbm1lbnQuZGVwdGhzLmxpc3RbaV0pO1xuICAgIH1cblxuICAgIC8vIFBlcmZvcm0gYSBzZWNvbmQgcGFzcyBvdmVyIHRoZSBvdXRwdXQgdG8gbWVyZ2UgY29udGVudCB3aGVuIHBvc3NpYmxlXG4gICAgdmFyIHNvdXJjZSA9IHRoaXMubWVyZ2VTb3VyY2UoKTtcblxuICAgIGlmICghdGhpcy5pc0NoaWxkKSB7XG4gICAgICBzb3VyY2UgPSB0aGlzLmNvbXBpbGVySW5mbygpK3NvdXJjZTtcbiAgICB9XG5cbiAgICBpZiAoYXNPYmplY3QpIHtcbiAgICAgIHBhcmFtcy5wdXNoKHNvdXJjZSk7XG5cbiAgICAgIHJldHVybiBGdW5jdGlvbi5hcHBseSh0aGlzLCBwYXJhbXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgZnVuY3Rpb25Tb3VyY2UgPSAnZnVuY3Rpb24gJyArICh0aGlzLm5hbWUgfHwgJycpICsgJygnICsgcGFyYW1zLmpvaW4oJywnKSArICcpIHtcXG4gICcgKyBzb3VyY2UgKyAnfSc7XG4gICAgICBsb2coJ2RlYnVnJywgZnVuY3Rpb25Tb3VyY2UgKyBcIlxcblxcblwiKTtcbiAgICAgIHJldHVybiBmdW5jdGlvblNvdXJjZTtcbiAgICB9XG4gIH0sXG4gIG1lcmdlU291cmNlOiBmdW5jdGlvbigpIHtcbiAgICAvLyBXQVJOOiBXZSBhcmUgbm90IGhhbmRsaW5nIHRoZSBjYXNlIHdoZXJlIGJ1ZmZlciBpcyBzdGlsbCBwb3B1bGF0ZWQgYXMgdGhlIHNvdXJjZSBzaG91bGRcbiAgICAvLyBub3QgaGF2ZSBidWZmZXIgYXBwZW5kIG9wZXJhdGlvbnMgYXMgdGhlaXIgZmluYWwgYWN0aW9uLlxuICAgIHZhciBzb3VyY2UgPSAnJyxcbiAgICAgICAgYnVmZmVyO1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSB0aGlzLnNvdXJjZS5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgdmFyIGxpbmUgPSB0aGlzLnNvdXJjZVtpXTtcbiAgICAgIGlmIChsaW5lLmFwcGVuZFRvQnVmZmVyKSB7XG4gICAgICAgIGlmIChidWZmZXIpIHtcbiAgICAgICAgICBidWZmZXIgPSBidWZmZXIgKyAnXFxuICAgICsgJyArIGxpbmUuY29udGVudDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBidWZmZXIgPSBsaW5lLmNvbnRlbnQ7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChidWZmZXIpIHtcbiAgICAgICAgICBzb3VyY2UgKz0gJ2J1ZmZlciArPSAnICsgYnVmZmVyICsgJztcXG4gICc7XG4gICAgICAgICAgYnVmZmVyID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIHNvdXJjZSArPSBsaW5lICsgJ1xcbiAgJztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHNvdXJjZTtcbiAgfSxcblxuICAvLyBbYmxvY2tWYWx1ZV1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogaGFzaCwgaW52ZXJzZSwgcHJvZ3JhbSwgdmFsdWVcbiAgLy8gT24gc3RhY2ssIGFmdGVyOiByZXR1cm4gdmFsdWUgb2YgYmxvY2tIZWxwZXJNaXNzaW5nXG4gIC8vXG4gIC8vIFRoZSBwdXJwb3NlIG9mIHRoaXMgb3Bjb2RlIGlzIHRvIHRha2UgYSBibG9jayBvZiB0aGUgZm9ybVxuICAvLyBge3sjZm9vfX0uLi57ey9mb299fWAsIHJlc29sdmUgdGhlIHZhbHVlIG9mIGBmb29gLCBhbmRcbiAgLy8gcmVwbGFjZSBpdCBvbiB0aGUgc3RhY2sgd2l0aCB0aGUgcmVzdWx0IG9mIHByb3Blcmx5XG4gIC8vIGludm9raW5nIGJsb2NrSGVscGVyTWlzc2luZy5cbiAgYmxvY2tWYWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5jb250ZXh0LmFsaWFzZXMuYmxvY2tIZWxwZXJNaXNzaW5nID0gJ2hlbHBlcnMuYmxvY2tIZWxwZXJNaXNzaW5nJztcblxuICAgIHZhciBwYXJhbXMgPSBbXCJkZXB0aDBcIl07XG4gICAgdGhpcy5zZXR1cFBhcmFtcygwLCBwYXJhbXMpO1xuXG4gICAgdGhpcy5yZXBsYWNlU3RhY2soZnVuY3Rpb24oY3VycmVudCkge1xuICAgICAgcGFyYW1zLnNwbGljZSgxLCAwLCBjdXJyZW50KTtcbiAgICAgIHJldHVybiBcImJsb2NrSGVscGVyTWlzc2luZy5jYWxsKFwiICsgcGFyYW1zLmpvaW4oXCIsIFwiKSArIFwiKVwiO1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIFthbWJpZ3VvdXNCbG9ja1ZhbHVlXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiBoYXNoLCBpbnZlcnNlLCBwcm9ncmFtLCB2YWx1ZVxuICAvLyBDb21waWxlciB2YWx1ZSwgYmVmb3JlOiBsYXN0SGVscGVyPXZhbHVlIG9mIGxhc3QgZm91bmQgaGVscGVyLCBpZiBhbnlcbiAgLy8gT24gc3RhY2ssIGFmdGVyLCBpZiBubyBsYXN0SGVscGVyOiBzYW1lIGFzIFtibG9ja1ZhbHVlXVxuICAvLyBPbiBzdGFjaywgYWZ0ZXIsIGlmIGxhc3RIZWxwZXI6IHZhbHVlXG4gIGFtYmlndW91c0Jsb2NrVmFsdWU6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuY29udGV4dC5hbGlhc2VzLmJsb2NrSGVscGVyTWlzc2luZyA9ICdoZWxwZXJzLmJsb2NrSGVscGVyTWlzc2luZyc7XG5cbiAgICB2YXIgcGFyYW1zID0gW1wiZGVwdGgwXCJdO1xuICAgIHRoaXMuc2V0dXBQYXJhbXMoMCwgcGFyYW1zKTtcblxuICAgIHZhciBjdXJyZW50ID0gdGhpcy50b3BTdGFjaygpO1xuICAgIHBhcmFtcy5zcGxpY2UoMSwgMCwgY3VycmVudCk7XG5cbiAgICB0aGlzLnB1c2hTb3VyY2UoXCJpZiAoIVwiICsgdGhpcy5sYXN0SGVscGVyICsgXCIpIHsgXCIgKyBjdXJyZW50ICsgXCIgPSBibG9ja0hlbHBlck1pc3NpbmcuY2FsbChcIiArIHBhcmFtcy5qb2luKFwiLCBcIikgKyBcIik7IH1cIik7XG4gIH0sXG5cbiAgLy8gW2FwcGVuZENvbnRlbnRdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IC4uLlxuICAvL1xuICAvLyBBcHBlbmRzIHRoZSBzdHJpbmcgdmFsdWUgb2YgYGNvbnRlbnRgIHRvIHRoZSBjdXJyZW50IGJ1ZmZlclxuICBhcHBlbmRDb250ZW50OiBmdW5jdGlvbihjb250ZW50KSB7XG4gICAgaWYgKHRoaXMucGVuZGluZ0NvbnRlbnQpIHtcbiAgICAgIGNvbnRlbnQgPSB0aGlzLnBlbmRpbmdDb250ZW50ICsgY29udGVudDtcbiAgICB9XG4gICAgaWYgKHRoaXMuc3RyaXBOZXh0KSB7XG4gICAgICBjb250ZW50ID0gY29udGVudC5yZXBsYWNlKC9eXFxzKy8sICcnKTtcbiAgICB9XG5cbiAgICB0aGlzLnBlbmRpbmdDb250ZW50ID0gY29udGVudDtcbiAgfSxcblxuICAvLyBbc3RyaXBdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IC4uLlxuICAvL1xuICAvLyBSZW1vdmVzIGFueSB0cmFpbGluZyB3aGl0ZXNwYWNlIGZyb20gdGhlIHByaW9yIGNvbnRlbnQgbm9kZSBhbmQgZmxhZ3NcbiAgLy8gdGhlIG5leHQgb3BlcmF0aW9uIGZvciBzdHJpcHBpbmcgaWYgaXQgaXMgYSBjb250ZW50IG5vZGUuXG4gIHN0cmlwOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5wZW5kaW5nQ29udGVudCkge1xuICAgICAgdGhpcy5wZW5kaW5nQ29udGVudCA9IHRoaXMucGVuZGluZ0NvbnRlbnQucmVwbGFjZSgvXFxzKyQvLCAnJyk7XG4gICAgfVxuICAgIHRoaXMuc3RyaXBOZXh0ID0gJ3N0cmlwJztcbiAgfSxcblxuICAvLyBbYXBwZW5kXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiB2YWx1ZSwgLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogLi4uXG4gIC8vXG4gIC8vIENvZXJjZXMgYHZhbHVlYCB0byBhIFN0cmluZyBhbmQgYXBwZW5kcyBpdCB0byB0aGUgY3VycmVudCBidWZmZXIuXG4gIC8vXG4gIC8vIElmIGB2YWx1ZWAgaXMgdHJ1dGh5LCBvciAwLCBpdCBpcyBjb2VyY2VkIGludG8gYSBzdHJpbmcgYW5kIGFwcGVuZGVkXG4gIC8vIE90aGVyd2lzZSwgdGhlIGVtcHR5IHN0cmluZyBpcyBhcHBlbmRlZFxuICBhcHBlbmQ6IGZ1bmN0aW9uKCkge1xuICAgIC8vIEZvcmNlIGFueXRoaW5nIHRoYXQgaXMgaW5saW5lZCBvbnRvIHRoZSBzdGFjayBzbyB3ZSBkb24ndCBoYXZlIGR1cGxpY2F0aW9uXG4gICAgLy8gd2hlbiB3ZSBleGFtaW5lIGxvY2FsXG4gICAgdGhpcy5mbHVzaElubGluZSgpO1xuICAgIHZhciBsb2NhbCA9IHRoaXMucG9wU3RhY2soKTtcbiAgICB0aGlzLnB1c2hTb3VyY2UoXCJpZihcIiArIGxvY2FsICsgXCIgfHwgXCIgKyBsb2NhbCArIFwiID09PSAwKSB7IFwiICsgdGhpcy5hcHBlbmRUb0J1ZmZlcihsb2NhbCkgKyBcIiB9XCIpO1xuICAgIGlmICh0aGlzLmVudmlyb25tZW50LmlzU2ltcGxlKSB7XG4gICAgICB0aGlzLnB1c2hTb3VyY2UoXCJlbHNlIHsgXCIgKyB0aGlzLmFwcGVuZFRvQnVmZmVyKFwiJydcIikgKyBcIiB9XCIpO1xuICAgIH1cbiAgfSxcblxuICAvLyBbYXBwZW5kRXNjYXBlZF1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogdmFsdWUsIC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IC4uLlxuICAvL1xuICAvLyBFc2NhcGUgYHZhbHVlYCBhbmQgYXBwZW5kIGl0IHRvIHRoZSBidWZmZXJcbiAgYXBwZW5kRXNjYXBlZDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5jb250ZXh0LmFsaWFzZXMuZXNjYXBlRXhwcmVzc2lvbiA9ICd0aGlzLmVzY2FwZUV4cHJlc3Npb24nO1xuXG4gICAgdGhpcy5wdXNoU291cmNlKHRoaXMuYXBwZW5kVG9CdWZmZXIoXCJlc2NhcGVFeHByZXNzaW9uKFwiICsgdGhpcy5wb3BTdGFjaygpICsgXCIpXCIpKTtcbiAgfSxcblxuICAvLyBbZ2V0Q29udGV4dF1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogLi4uXG4gIC8vIENvbXBpbGVyIHZhbHVlLCBhZnRlcjogbGFzdENvbnRleHQ9ZGVwdGhcbiAgLy9cbiAgLy8gU2V0IHRoZSB2YWx1ZSBvZiB0aGUgYGxhc3RDb250ZXh0YCBjb21waWxlciB2YWx1ZSB0byB0aGUgZGVwdGhcbiAgZ2V0Q29udGV4dDogZnVuY3Rpb24oZGVwdGgpIHtcbiAgICBpZih0aGlzLmxhc3RDb250ZXh0ICE9PSBkZXB0aCkge1xuICAgICAgdGhpcy5sYXN0Q29udGV4dCA9IGRlcHRoO1xuICAgIH1cbiAgfSxcblxuICAvLyBbbG9va3VwT25Db250ZXh0XVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiBjdXJyZW50Q29udGV4dFtuYW1lXSwgLi4uXG4gIC8vXG4gIC8vIExvb2tzIHVwIHRoZSB2YWx1ZSBvZiBgbmFtZWAgb24gdGhlIGN1cnJlbnQgY29udGV4dCBhbmQgcHVzaGVzXG4gIC8vIGl0IG9udG8gdGhlIHN0YWNrLlxuICBsb29rdXBPbkNvbnRleHQ6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB0aGlzLnB1c2godGhpcy5uYW1lTG9va3VwKCdkZXB0aCcgKyB0aGlzLmxhc3RDb250ZXh0LCBuYW1lLCAnY29udGV4dCcpKTtcbiAgfSxcblxuICAvLyBbcHVzaENvbnRleHRdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IGN1cnJlbnRDb250ZXh0LCAuLi5cbiAgLy9cbiAgLy8gUHVzaGVzIHRoZSB2YWx1ZSBvZiB0aGUgY3VycmVudCBjb250ZXh0IG9udG8gdGhlIHN0YWNrLlxuICBwdXNoQ29udGV4dDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5wdXNoU3RhY2tMaXRlcmFsKCdkZXB0aCcgKyB0aGlzLmxhc3RDb250ZXh0KTtcbiAgfSxcblxuICAvLyBbcmVzb2x2ZVBvc3NpYmxlTGFtYmRhXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiB2YWx1ZSwgLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogcmVzb2x2ZWQgdmFsdWUsIC4uLlxuICAvL1xuICAvLyBJZiB0aGUgYHZhbHVlYCBpcyBhIGxhbWJkYSwgcmVwbGFjZSBpdCBvbiB0aGUgc3RhY2sgYnlcbiAgLy8gdGhlIHJldHVybiB2YWx1ZSBvZiB0aGUgbGFtYmRhXG4gIHJlc29sdmVQb3NzaWJsZUxhbWJkYTogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5jb250ZXh0LmFsaWFzZXMuZnVuY3Rpb25UeXBlID0gJ1wiZnVuY3Rpb25cIic7XG5cbiAgICB0aGlzLnJlcGxhY2VTdGFjayhmdW5jdGlvbihjdXJyZW50KSB7XG4gICAgICByZXR1cm4gXCJ0eXBlb2YgXCIgKyBjdXJyZW50ICsgXCIgPT09IGZ1bmN0aW9uVHlwZSA/IFwiICsgY3VycmVudCArIFwiLmFwcGx5KGRlcHRoMCkgOiBcIiArIGN1cnJlbnQ7XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8gW2xvb2t1cF1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogdmFsdWUsIC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IHZhbHVlW25hbWVdLCAuLi5cbiAgLy9cbiAgLy8gUmVwbGFjZSB0aGUgdmFsdWUgb24gdGhlIHN0YWNrIHdpdGggdGhlIHJlc3VsdCBvZiBsb29raW5nXG4gIC8vIHVwIGBuYW1lYCBvbiBgdmFsdWVgXG4gIGxvb2t1cDogZnVuY3Rpb24obmFtZSkge1xuICAgIHRoaXMucmVwbGFjZVN0YWNrKGZ1bmN0aW9uKGN1cnJlbnQpIHtcbiAgICAgIHJldHVybiBjdXJyZW50ICsgXCIgPT0gbnVsbCB8fCBcIiArIGN1cnJlbnQgKyBcIiA9PT0gZmFsc2UgPyBcIiArIGN1cnJlbnQgKyBcIiA6IFwiICsgdGhpcy5uYW1lTG9va3VwKGN1cnJlbnQsIG5hbWUsICdjb250ZXh0Jyk7XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8gW2xvb2t1cERhdGFdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IGRhdGEsIC4uLlxuICAvL1xuICAvLyBQdXNoIHRoZSBkYXRhIGxvb2t1cCBvcGVyYXRvclxuICBsb29rdXBEYXRhOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnB1c2hTdGFja0xpdGVyYWwoJ2RhdGEnKTtcbiAgfSxcblxuICAvLyBbcHVzaFN0cmluZ1BhcmFtXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiBzdHJpbmcsIGN1cnJlbnRDb250ZXh0LCAuLi5cbiAgLy9cbiAgLy8gVGhpcyBvcGNvZGUgaXMgZGVzaWduZWQgZm9yIHVzZSBpbiBzdHJpbmcgbW9kZSwgd2hpY2hcbiAgLy8gcHJvdmlkZXMgdGhlIHN0cmluZyB2YWx1ZSBvZiBhIHBhcmFtZXRlciBhbG9uZyB3aXRoIGl0c1xuICAvLyBkZXB0aCByYXRoZXIgdGhhbiByZXNvbHZpbmcgaXQgaW1tZWRpYXRlbHkuXG4gIHB1c2hTdHJpbmdQYXJhbTogZnVuY3Rpb24oc3RyaW5nLCB0eXBlKSB7XG4gICAgdGhpcy5wdXNoU3RhY2tMaXRlcmFsKCdkZXB0aCcgKyB0aGlzLmxhc3RDb250ZXh0KTtcblxuICAgIHRoaXMucHVzaFN0cmluZyh0eXBlKTtcblxuICAgIC8vIElmIGl0J3MgYSBzdWJleHByZXNzaW9uLCB0aGUgc3RyaW5nIHJlc3VsdFxuICAgIC8vIHdpbGwgYmUgcHVzaGVkIGFmdGVyIHRoaXMgb3Bjb2RlLlxuICAgIGlmICh0eXBlICE9PSAnc2V4cHInKSB7XG4gICAgICBpZiAodHlwZW9mIHN0cmluZyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhpcy5wdXNoU3RyaW5nKHN0cmluZyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnB1c2hTdGFja0xpdGVyYWwoc3RyaW5nKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgZW1wdHlIYXNoOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnB1c2hTdGFja0xpdGVyYWwoJ3t9Jyk7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmluZ1BhcmFtcykge1xuICAgICAgdGhpcy5wdXNoKCd7fScpOyAvLyBoYXNoQ29udGV4dHNcbiAgICAgIHRoaXMucHVzaCgne30nKTsgLy8gaGFzaFR5cGVzXG4gICAgfVxuICB9LFxuICBwdXNoSGFzaDogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuaGFzaCkge1xuICAgICAgdGhpcy5oYXNoZXMucHVzaCh0aGlzLmhhc2gpO1xuICAgIH1cbiAgICB0aGlzLmhhc2ggPSB7dmFsdWVzOiBbXSwgdHlwZXM6IFtdLCBjb250ZXh0czogW119O1xuICB9LFxuICBwb3BIYXNoOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgaGFzaCA9IHRoaXMuaGFzaDtcbiAgICB0aGlzLmhhc2ggPSB0aGlzLmhhc2hlcy5wb3AoKTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaW5nUGFyYW1zKSB7XG4gICAgICB0aGlzLnB1c2goJ3snICsgaGFzaC5jb250ZXh0cy5qb2luKCcsJykgKyAnfScpO1xuICAgICAgdGhpcy5wdXNoKCd7JyArIGhhc2gudHlwZXMuam9pbignLCcpICsgJ30nKTtcbiAgICB9XG5cbiAgICB0aGlzLnB1c2goJ3tcXG4gICAgJyArIGhhc2gudmFsdWVzLmpvaW4oJyxcXG4gICAgJykgKyAnXFxuICB9Jyk7XG4gIH0sXG5cbiAgLy8gW3B1c2hTdHJpbmddXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IHF1b3RlZFN0cmluZyhzdHJpbmcpLCAuLi5cbiAgLy9cbiAgLy8gUHVzaCBhIHF1b3RlZCB2ZXJzaW9uIG9mIGBzdHJpbmdgIG9udG8gdGhlIHN0YWNrXG4gIHB1c2hTdHJpbmc6IGZ1bmN0aW9uKHN0cmluZykge1xuICAgIHRoaXMucHVzaFN0YWNrTGl0ZXJhbCh0aGlzLnF1b3RlZFN0cmluZyhzdHJpbmcpKTtcbiAgfSxcblxuICAvLyBbcHVzaF1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogZXhwciwgLi4uXG4gIC8vXG4gIC8vIFB1c2ggYW4gZXhwcmVzc2lvbiBvbnRvIHRoZSBzdGFja1xuICBwdXNoOiBmdW5jdGlvbihleHByKSB7XG4gICAgdGhpcy5pbmxpbmVTdGFjay5wdXNoKGV4cHIpO1xuICAgIHJldHVybiBleHByO1xuICB9LFxuXG4gIC8vIFtwdXNoTGl0ZXJhbF1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogdmFsdWUsIC4uLlxuICAvL1xuICAvLyBQdXNoZXMgYSB2YWx1ZSBvbnRvIHRoZSBzdGFjay4gVGhpcyBvcGVyYXRpb24gcHJldmVudHNcbiAgLy8gdGhlIGNvbXBpbGVyIGZyb20gY3JlYXRpbmcgYSB0ZW1wb3JhcnkgdmFyaWFibGUgdG8gaG9sZFxuICAvLyBpdC5cbiAgcHVzaExpdGVyYWw6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgdGhpcy5wdXNoU3RhY2tMaXRlcmFsKHZhbHVlKTtcbiAgfSxcblxuICAvLyBbcHVzaFByb2dyYW1dXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IHByb2dyYW0oZ3VpZCksIC4uLlxuICAvL1xuICAvLyBQdXNoIGEgcHJvZ3JhbSBleHByZXNzaW9uIG9udG8gdGhlIHN0YWNrLiBUaGlzIHRha2VzXG4gIC8vIGEgY29tcGlsZS10aW1lIGd1aWQgYW5kIGNvbnZlcnRzIGl0IGludG8gYSBydW50aW1lLWFjY2Vzc2libGVcbiAgLy8gZXhwcmVzc2lvbi5cbiAgcHVzaFByb2dyYW06IGZ1bmN0aW9uKGd1aWQpIHtcbiAgICBpZiAoZ3VpZCAhPSBudWxsKSB7XG4gICAgICB0aGlzLnB1c2hTdGFja0xpdGVyYWwodGhpcy5wcm9ncmFtRXhwcmVzc2lvbihndWlkKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucHVzaFN0YWNrTGl0ZXJhbChudWxsKTtcbiAgICB9XG4gIH0sXG5cbiAgLy8gW2ludm9rZUhlbHBlcl1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogaGFzaCwgaW52ZXJzZSwgcHJvZ3JhbSwgcGFyYW1zLi4uLCAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiByZXN1bHQgb2YgaGVscGVyIGludm9jYXRpb25cbiAgLy9cbiAgLy8gUG9wcyBvZmYgdGhlIGhlbHBlcidzIHBhcmFtZXRlcnMsIGludm9rZXMgdGhlIGhlbHBlcixcbiAgLy8gYW5kIHB1c2hlcyB0aGUgaGVscGVyJ3MgcmV0dXJuIHZhbHVlIG9udG8gdGhlIHN0YWNrLlxuICAvL1xuICAvLyBJZiB0aGUgaGVscGVyIGlzIG5vdCBmb3VuZCwgYGhlbHBlck1pc3NpbmdgIGlzIGNhbGxlZC5cbiAgaW52b2tlSGVscGVyOiBmdW5jdGlvbihwYXJhbVNpemUsIG5hbWUsIGlzUm9vdCkge1xuICAgIHRoaXMuY29udGV4dC5hbGlhc2VzLmhlbHBlck1pc3NpbmcgPSAnaGVscGVycy5oZWxwZXJNaXNzaW5nJztcbiAgICB0aGlzLnVzZVJlZ2lzdGVyKCdoZWxwZXInKTtcblxuICAgIHZhciBoZWxwZXIgPSB0aGlzLmxhc3RIZWxwZXIgPSB0aGlzLnNldHVwSGVscGVyKHBhcmFtU2l6ZSwgbmFtZSwgdHJ1ZSk7XG4gICAgdmFyIG5vbkhlbHBlciA9IHRoaXMubmFtZUxvb2t1cCgnZGVwdGgnICsgdGhpcy5sYXN0Q29udGV4dCwgbmFtZSwgJ2NvbnRleHQnKTtcblxuICAgIHZhciBsb29rdXAgPSAnaGVscGVyID0gJyArIGhlbHBlci5uYW1lICsgJyB8fCAnICsgbm9uSGVscGVyO1xuICAgIGlmIChoZWxwZXIucGFyYW1zSW5pdCkge1xuICAgICAgbG9va3VwICs9ICcsJyArIGhlbHBlci5wYXJhbXNJbml0O1xuICAgIH1cblxuICAgIHRoaXMucHVzaChcbiAgICAgICcoJ1xuICAgICAgICArIGxvb2t1cFxuICAgICAgICArICcsaGVscGVyICdcbiAgICAgICAgICArICc/IGhlbHBlci5jYWxsKCcgKyBoZWxwZXIuY2FsbFBhcmFtcyArICcpICdcbiAgICAgICAgICArICc6IGhlbHBlck1pc3NpbmcuY2FsbCgnICsgaGVscGVyLmhlbHBlck1pc3NpbmdQYXJhbXMgKyAnKSknKTtcblxuICAgIC8vIEFsd2F5cyBmbHVzaCBzdWJleHByZXNzaW9ucy4gVGhpcyBpcyBib3RoIHRvIHByZXZlbnQgdGhlIGNvbXBvdW5kaW5nIHNpemUgaXNzdWUgdGhhdFxuICAgIC8vIG9jY3VycyB3aGVuIHRoZSBjb2RlIGhhcyB0byBiZSBkdXBsaWNhdGVkIGZvciBpbmxpbmluZyBhbmQgYWxzbyB0byBwcmV2ZW50IGVycm9yc1xuICAgIC8vIGR1ZSB0byB0aGUgaW5jb3JyZWN0IG9wdGlvbnMgb2JqZWN0IGJlaW5nIHBhc3NlZCBkdWUgdG8gdGhlIHNoYXJlZCByZWdpc3Rlci5cbiAgICBpZiAoIWlzUm9vdCkge1xuICAgICAgdGhpcy5mbHVzaElubGluZSgpO1xuICAgIH1cbiAgfSxcblxuICAvLyBbaW52b2tlS25vd25IZWxwZXJdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IGhhc2gsIGludmVyc2UsIHByb2dyYW0sIHBhcmFtcy4uLiwgLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogcmVzdWx0IG9mIGhlbHBlciBpbnZvY2F0aW9uXG4gIC8vXG4gIC8vIFRoaXMgb3BlcmF0aW9uIGlzIHVzZWQgd2hlbiB0aGUgaGVscGVyIGlzIGtub3duIHRvIGV4aXN0LFxuICAvLyBzbyBhIGBoZWxwZXJNaXNzaW5nYCBmYWxsYmFjayBpcyBub3QgcmVxdWlyZWQuXG4gIGludm9rZUtub3duSGVscGVyOiBmdW5jdGlvbihwYXJhbVNpemUsIG5hbWUpIHtcbiAgICB2YXIgaGVscGVyID0gdGhpcy5zZXR1cEhlbHBlcihwYXJhbVNpemUsIG5hbWUpO1xuICAgIHRoaXMucHVzaChoZWxwZXIubmFtZSArIFwiLmNhbGwoXCIgKyBoZWxwZXIuY2FsbFBhcmFtcyArIFwiKVwiKTtcbiAgfSxcblxuICAvLyBbaW52b2tlQW1iaWd1b3VzXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiBoYXNoLCBpbnZlcnNlLCBwcm9ncmFtLCBwYXJhbXMuLi4sIC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IHJlc3VsdCBvZiBkaXNhbWJpZ3VhdGlvblxuICAvL1xuICAvLyBUaGlzIG9wZXJhdGlvbiBpcyB1c2VkIHdoZW4gYW4gZXhwcmVzc2lvbiBsaWtlIGB7e2Zvb319YFxuICAvLyBpcyBwcm92aWRlZCwgYnV0IHdlIGRvbid0IGtub3cgYXQgY29tcGlsZS10aW1lIHdoZXRoZXIgaXRcbiAgLy8gaXMgYSBoZWxwZXIgb3IgYSBwYXRoLlxuICAvL1xuICAvLyBUaGlzIG9wZXJhdGlvbiBlbWl0cyBtb3JlIGNvZGUgdGhhbiB0aGUgb3RoZXIgb3B0aW9ucyxcbiAgLy8gYW5kIGNhbiBiZSBhdm9pZGVkIGJ5IHBhc3NpbmcgdGhlIGBrbm93bkhlbHBlcnNgIGFuZFxuICAvLyBga25vd25IZWxwZXJzT25seWAgZmxhZ3MgYXQgY29tcGlsZS10aW1lLlxuICBpbnZva2VBbWJpZ3VvdXM6IGZ1bmN0aW9uKG5hbWUsIGhlbHBlckNhbGwpIHtcbiAgICB0aGlzLmNvbnRleHQuYWxpYXNlcy5mdW5jdGlvblR5cGUgPSAnXCJmdW5jdGlvblwiJztcbiAgICB0aGlzLnVzZVJlZ2lzdGVyKCdoZWxwZXInKTtcblxuICAgIHRoaXMuZW1wdHlIYXNoKCk7XG4gICAgdmFyIGhlbHBlciA9IHRoaXMuc2V0dXBIZWxwZXIoMCwgbmFtZSwgaGVscGVyQ2FsbCk7XG5cbiAgICB2YXIgaGVscGVyTmFtZSA9IHRoaXMubGFzdEhlbHBlciA9IHRoaXMubmFtZUxvb2t1cCgnaGVscGVycycsIG5hbWUsICdoZWxwZXInKTtcblxuICAgIHZhciBub25IZWxwZXIgPSB0aGlzLm5hbWVMb29rdXAoJ2RlcHRoJyArIHRoaXMubGFzdENvbnRleHQsIG5hbWUsICdjb250ZXh0Jyk7XG4gICAgdmFyIG5leHRTdGFjayA9IHRoaXMubmV4dFN0YWNrKCk7XG5cbiAgICBpZiAoaGVscGVyLnBhcmFtc0luaXQpIHtcbiAgICAgIHRoaXMucHVzaFNvdXJjZShoZWxwZXIucGFyYW1zSW5pdCk7XG4gICAgfVxuICAgIHRoaXMucHVzaFNvdXJjZSgnaWYgKGhlbHBlciA9ICcgKyBoZWxwZXJOYW1lICsgJykgeyAnICsgbmV4dFN0YWNrICsgJyA9IGhlbHBlci5jYWxsKCcgKyBoZWxwZXIuY2FsbFBhcmFtcyArICcpOyB9Jyk7XG4gICAgdGhpcy5wdXNoU291cmNlKCdlbHNlIHsgaGVscGVyID0gJyArIG5vbkhlbHBlciArICc7ICcgKyBuZXh0U3RhY2sgKyAnID0gdHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoJyArIGhlbHBlci5jYWxsUGFyYW1zICsgJykgOiBoZWxwZXI7IH0nKTtcbiAgfSxcblxuICAvLyBbaW52b2tlUGFydGlhbF1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogY29udGV4dCwgLi4uXG4gIC8vIE9uIHN0YWNrIGFmdGVyOiByZXN1bHQgb2YgcGFydGlhbCBpbnZvY2F0aW9uXG4gIC8vXG4gIC8vIFRoaXMgb3BlcmF0aW9uIHBvcHMgb2ZmIGEgY29udGV4dCwgaW52b2tlcyBhIHBhcnRpYWwgd2l0aCB0aGF0IGNvbnRleHQsXG4gIC8vIGFuZCBwdXNoZXMgdGhlIHJlc3VsdCBvZiB0aGUgaW52b2NhdGlvbiBiYWNrLlxuICBpbnZva2VQYXJ0aWFsOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIHBhcmFtcyA9IFt0aGlzLm5hbWVMb29rdXAoJ3BhcnRpYWxzJywgbmFtZSwgJ3BhcnRpYWwnKSwgXCInXCIgKyBuYW1lICsgXCInXCIsIHRoaXMucG9wU3RhY2soKSwgXCJoZWxwZXJzXCIsIFwicGFydGlhbHNcIl07XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmRhdGEpIHtcbiAgICAgIHBhcmFtcy5wdXNoKFwiZGF0YVwiKTtcbiAgICB9XG5cbiAgICB0aGlzLmNvbnRleHQuYWxpYXNlcy5zZWxmID0gXCJ0aGlzXCI7XG4gICAgdGhpcy5wdXNoKFwic2VsZi5pbnZva2VQYXJ0aWFsKFwiICsgcGFyYW1zLmpvaW4oXCIsIFwiKSArIFwiKVwiKTtcbiAgfSxcblxuICAvLyBbYXNzaWduVG9IYXNoXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiB2YWx1ZSwgaGFzaCwgLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogaGFzaCwgLi4uXG4gIC8vXG4gIC8vIFBvcHMgYSB2YWx1ZSBhbmQgaGFzaCBvZmYgdGhlIHN0YWNrLCBhc3NpZ25zIGBoYXNoW2tleV0gPSB2YWx1ZWBcbiAgLy8gYW5kIHB1c2hlcyB0aGUgaGFzaCBiYWNrIG9udG8gdGhlIHN0YWNrLlxuICBhc3NpZ25Ub0hhc2g6IGZ1bmN0aW9uKGtleSkge1xuICAgIHZhciB2YWx1ZSA9IHRoaXMucG9wU3RhY2soKSxcbiAgICAgICAgY29udGV4dCxcbiAgICAgICAgdHlwZTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaW5nUGFyYW1zKSB7XG4gICAgICB0eXBlID0gdGhpcy5wb3BTdGFjaygpO1xuICAgICAgY29udGV4dCA9IHRoaXMucG9wU3RhY2soKTtcbiAgICB9XG5cbiAgICB2YXIgaGFzaCA9IHRoaXMuaGFzaDtcbiAgICBpZiAoY29udGV4dCkge1xuICAgICAgaGFzaC5jb250ZXh0cy5wdXNoKFwiJ1wiICsga2V5ICsgXCInOiBcIiArIGNvbnRleHQpO1xuICAgIH1cbiAgICBpZiAodHlwZSkge1xuICAgICAgaGFzaC50eXBlcy5wdXNoKFwiJ1wiICsga2V5ICsgXCInOiBcIiArIHR5cGUpO1xuICAgIH1cbiAgICBoYXNoLnZhbHVlcy5wdXNoKFwiJ1wiICsga2V5ICsgXCInOiAoXCIgKyB2YWx1ZSArIFwiKVwiKTtcbiAgfSxcblxuICAvLyBIRUxQRVJTXG5cbiAgY29tcGlsZXI6IEphdmFTY3JpcHRDb21waWxlcixcblxuICBjb21waWxlQ2hpbGRyZW46IGZ1bmN0aW9uKGVudmlyb25tZW50LCBvcHRpb25zKSB7XG4gICAgdmFyIGNoaWxkcmVuID0gZW52aXJvbm1lbnQuY2hpbGRyZW4sIGNoaWxkLCBjb21waWxlcjtcblxuICAgIGZvcih2YXIgaT0wLCBsPWNoaWxkcmVuLmxlbmd0aDsgaTxsOyBpKyspIHtcbiAgICAgIGNoaWxkID0gY2hpbGRyZW5baV07XG4gICAgICBjb21waWxlciA9IG5ldyB0aGlzLmNvbXBpbGVyKCk7XG5cbiAgICAgIHZhciBpbmRleCA9IHRoaXMubWF0Y2hFeGlzdGluZ1Byb2dyYW0oY2hpbGQpO1xuXG4gICAgICBpZiAoaW5kZXggPT0gbnVsbCkge1xuICAgICAgICB0aGlzLmNvbnRleHQucHJvZ3JhbXMucHVzaCgnJyk7ICAgICAvLyBQbGFjZWhvbGRlciB0byBwcmV2ZW50IG5hbWUgY29uZmxpY3RzIGZvciBuZXN0ZWQgY2hpbGRyZW5cbiAgICAgICAgaW5kZXggPSB0aGlzLmNvbnRleHQucHJvZ3JhbXMubGVuZ3RoO1xuICAgICAgICBjaGlsZC5pbmRleCA9IGluZGV4O1xuICAgICAgICBjaGlsZC5uYW1lID0gJ3Byb2dyYW0nICsgaW5kZXg7XG4gICAgICAgIHRoaXMuY29udGV4dC5wcm9ncmFtc1tpbmRleF0gPSBjb21waWxlci5jb21waWxlKGNoaWxkLCBvcHRpb25zLCB0aGlzLmNvbnRleHQpO1xuICAgICAgICB0aGlzLmNvbnRleHQuZW52aXJvbm1lbnRzW2luZGV4XSA9IGNoaWxkO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2hpbGQuaW5kZXggPSBpbmRleDtcbiAgICAgICAgY2hpbGQubmFtZSA9ICdwcm9ncmFtJyArIGluZGV4O1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgbWF0Y2hFeGlzdGluZ1Byb2dyYW06IGZ1bmN0aW9uKGNoaWxkKSB7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHRoaXMuY29udGV4dC5lbnZpcm9ubWVudHMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIHZhciBlbnZpcm9ubWVudCA9IHRoaXMuY29udGV4dC5lbnZpcm9ubWVudHNbaV07XG4gICAgICBpZiAoZW52aXJvbm1lbnQgJiYgZW52aXJvbm1lbnQuZXF1YWxzKGNoaWxkKSkge1xuICAgICAgICByZXR1cm4gaTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgcHJvZ3JhbUV4cHJlc3Npb246IGZ1bmN0aW9uKGd1aWQpIHtcbiAgICB0aGlzLmNvbnRleHQuYWxpYXNlcy5zZWxmID0gXCJ0aGlzXCI7XG5cbiAgICBpZihndWlkID09IG51bGwpIHtcbiAgICAgIHJldHVybiBcInNlbGYubm9vcFwiO1xuICAgIH1cblxuICAgIHZhciBjaGlsZCA9IHRoaXMuZW52aXJvbm1lbnQuY2hpbGRyZW5bZ3VpZF0sXG4gICAgICAgIGRlcHRocyA9IGNoaWxkLmRlcHRocy5saXN0LCBkZXB0aDtcblxuICAgIHZhciBwcm9ncmFtUGFyYW1zID0gW2NoaWxkLmluZGV4LCBjaGlsZC5uYW1lLCBcImRhdGFcIl07XG5cbiAgICBmb3IodmFyIGk9MCwgbCA9IGRlcHRocy5sZW5ndGg7IGk8bDsgaSsrKSB7XG4gICAgICBkZXB0aCA9IGRlcHRoc1tpXTtcblxuICAgICAgaWYoZGVwdGggPT09IDEpIHsgcHJvZ3JhbVBhcmFtcy5wdXNoKFwiZGVwdGgwXCIpOyB9XG4gICAgICBlbHNlIHsgcHJvZ3JhbVBhcmFtcy5wdXNoKFwiZGVwdGhcIiArIChkZXB0aCAtIDEpKTsgfVxuICAgIH1cblxuICAgIHJldHVybiAoZGVwdGhzLmxlbmd0aCA9PT0gMCA/IFwic2VsZi5wcm9ncmFtKFwiIDogXCJzZWxmLnByb2dyYW1XaXRoRGVwdGgoXCIpICsgcHJvZ3JhbVBhcmFtcy5qb2luKFwiLCBcIikgKyBcIilcIjtcbiAgfSxcblxuICByZWdpc3RlcjogZnVuY3Rpb24obmFtZSwgdmFsKSB7XG4gICAgdGhpcy51c2VSZWdpc3RlcihuYW1lKTtcbiAgICB0aGlzLnB1c2hTb3VyY2UobmFtZSArIFwiID0gXCIgKyB2YWwgKyBcIjtcIik7XG4gIH0sXG5cbiAgdXNlUmVnaXN0ZXI6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBpZighdGhpcy5yZWdpc3RlcnNbbmFtZV0pIHtcbiAgICAgIHRoaXMucmVnaXN0ZXJzW25hbWVdID0gdHJ1ZTtcbiAgICAgIHRoaXMucmVnaXN0ZXJzLmxpc3QucHVzaChuYW1lKTtcbiAgICB9XG4gIH0sXG5cbiAgcHVzaFN0YWNrTGl0ZXJhbDogZnVuY3Rpb24oaXRlbSkge1xuICAgIHJldHVybiB0aGlzLnB1c2gobmV3IExpdGVyYWwoaXRlbSkpO1xuICB9LFxuXG4gIHB1c2hTb3VyY2U6IGZ1bmN0aW9uKHNvdXJjZSkge1xuICAgIGlmICh0aGlzLnBlbmRpbmdDb250ZW50KSB7XG4gICAgICB0aGlzLnNvdXJjZS5wdXNoKHRoaXMuYXBwZW5kVG9CdWZmZXIodGhpcy5xdW90ZWRTdHJpbmcodGhpcy5wZW5kaW5nQ29udGVudCkpKTtcbiAgICAgIHRoaXMucGVuZGluZ0NvbnRlbnQgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgaWYgKHNvdXJjZSkge1xuICAgICAgdGhpcy5zb3VyY2UucHVzaChzb3VyY2UpO1xuICAgIH1cbiAgfSxcblxuICBwdXNoU3RhY2s6IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICB0aGlzLmZsdXNoSW5saW5lKCk7XG5cbiAgICB2YXIgc3RhY2sgPSB0aGlzLmluY3JTdGFjaygpO1xuICAgIGlmIChpdGVtKSB7XG4gICAgICB0aGlzLnB1c2hTb3VyY2Uoc3RhY2sgKyBcIiA9IFwiICsgaXRlbSArIFwiO1wiKTtcbiAgICB9XG4gICAgdGhpcy5jb21waWxlU3RhY2sucHVzaChzdGFjayk7XG4gICAgcmV0dXJuIHN0YWNrO1xuICB9LFxuXG4gIHJlcGxhY2VTdGFjazogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICB2YXIgcHJlZml4ID0gJycsXG4gICAgICAgIGlubGluZSA9IHRoaXMuaXNJbmxpbmUoKSxcbiAgICAgICAgc3RhY2ssXG4gICAgICAgIGNyZWF0ZWRTdGFjayxcbiAgICAgICAgdXNlZExpdGVyYWw7XG5cbiAgICAvLyBJZiB3ZSBhcmUgY3VycmVudGx5IGlubGluZSB0aGVuIHdlIHdhbnQgdG8gbWVyZ2UgdGhlIGlubGluZSBzdGF0ZW1lbnQgaW50byB0aGVcbiAgICAvLyByZXBsYWNlbWVudCBzdGF0ZW1lbnQgdmlhICcsJ1xuICAgIGlmIChpbmxpbmUpIHtcbiAgICAgIHZhciB0b3AgPSB0aGlzLnBvcFN0YWNrKHRydWUpO1xuXG4gICAgICBpZiAodG9wIGluc3RhbmNlb2YgTGl0ZXJhbCkge1xuICAgICAgICAvLyBMaXRlcmFscyBkbyBub3QgbmVlZCB0byBiZSBpbmxpbmVkXG4gICAgICAgIHN0YWNrID0gdG9wLnZhbHVlO1xuICAgICAgICB1c2VkTGl0ZXJhbCA9IHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBHZXQgb3IgY3JlYXRlIHRoZSBjdXJyZW50IHN0YWNrIG5hbWUgZm9yIHVzZSBieSB0aGUgaW5saW5lXG4gICAgICAgIGNyZWF0ZWRTdGFjayA9ICF0aGlzLnN0YWNrU2xvdDtcbiAgICAgICAgdmFyIG5hbWUgPSAhY3JlYXRlZFN0YWNrID8gdGhpcy50b3BTdGFja05hbWUoKSA6IHRoaXMuaW5jclN0YWNrKCk7XG5cbiAgICAgICAgcHJlZml4ID0gJygnICsgdGhpcy5wdXNoKG5hbWUpICsgJyA9ICcgKyB0b3AgKyAnKSwnO1xuICAgICAgICBzdGFjayA9IHRoaXMudG9wU3RhY2soKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc3RhY2sgPSB0aGlzLnRvcFN0YWNrKCk7XG4gICAgfVxuXG4gICAgdmFyIGl0ZW0gPSBjYWxsYmFjay5jYWxsKHRoaXMsIHN0YWNrKTtcblxuICAgIGlmIChpbmxpbmUpIHtcbiAgICAgIGlmICghdXNlZExpdGVyYWwpIHtcbiAgICAgICAgdGhpcy5wb3BTdGFjaygpO1xuICAgICAgfVxuICAgICAgaWYgKGNyZWF0ZWRTdGFjaykge1xuICAgICAgICB0aGlzLnN0YWNrU2xvdC0tO1xuICAgICAgfVxuICAgICAgdGhpcy5wdXNoKCcoJyArIHByZWZpeCArIGl0ZW0gKyAnKScpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBQcmV2ZW50IG1vZGlmaWNhdGlvbiBvZiB0aGUgY29udGV4dCBkZXB0aCB2YXJpYWJsZS4gVGhyb3VnaCByZXBsYWNlU3RhY2tcbiAgICAgIGlmICghL15zdGFjay8udGVzdChzdGFjaykpIHtcbiAgICAgICAgc3RhY2sgPSB0aGlzLm5leHRTdGFjaygpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnB1c2hTb3VyY2Uoc3RhY2sgKyBcIiA9IChcIiArIHByZWZpeCArIGl0ZW0gKyBcIik7XCIpO1xuICAgIH1cbiAgICByZXR1cm4gc3RhY2s7XG4gIH0sXG5cbiAgbmV4dFN0YWNrOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5wdXNoU3RhY2soKTtcbiAgfSxcblxuICBpbmNyU3RhY2s6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc3RhY2tTbG90Kys7XG4gICAgaWYodGhpcy5zdGFja1Nsb3QgPiB0aGlzLnN0YWNrVmFycy5sZW5ndGgpIHsgdGhpcy5zdGFja1ZhcnMucHVzaChcInN0YWNrXCIgKyB0aGlzLnN0YWNrU2xvdCk7IH1cbiAgICByZXR1cm4gdGhpcy50b3BTdGFja05hbWUoKTtcbiAgfSxcbiAgdG9wU3RhY2tOYW1lOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gXCJzdGFja1wiICsgdGhpcy5zdGFja1Nsb3Q7XG4gIH0sXG4gIGZsdXNoSW5saW5lOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgaW5saW5lU3RhY2sgPSB0aGlzLmlubGluZVN0YWNrO1xuICAgIGlmIChpbmxpbmVTdGFjay5sZW5ndGgpIHtcbiAgICAgIHRoaXMuaW5saW5lU3RhY2sgPSBbXTtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBpbmxpbmVTdGFjay5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICB2YXIgZW50cnkgPSBpbmxpbmVTdGFja1tpXTtcbiAgICAgICAgaWYgKGVudHJ5IGluc3RhbmNlb2YgTGl0ZXJhbCkge1xuICAgICAgICAgIHRoaXMuY29tcGlsZVN0YWNrLnB1c2goZW50cnkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMucHVzaFN0YWNrKGVudHJ5KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgaXNJbmxpbmU6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmlubGluZVN0YWNrLmxlbmd0aDtcbiAgfSxcblxuICBwb3BTdGFjazogZnVuY3Rpb24od3JhcHBlZCkge1xuICAgIHZhciBpbmxpbmUgPSB0aGlzLmlzSW5saW5lKCksXG4gICAgICAgIGl0ZW0gPSAoaW5saW5lID8gdGhpcy5pbmxpbmVTdGFjayA6IHRoaXMuY29tcGlsZVN0YWNrKS5wb3AoKTtcblxuICAgIGlmICghd3JhcHBlZCAmJiAoaXRlbSBpbnN0YW5jZW9mIExpdGVyYWwpKSB7XG4gICAgICByZXR1cm4gaXRlbS52YWx1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKCFpbmxpbmUpIHtcbiAgICAgICAgaWYgKCF0aGlzLnN0YWNrU2xvdCkge1xuICAgICAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oJ0ludmFsaWQgc3RhY2sgcG9wJyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zdGFja1Nsb3QtLTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBpdGVtO1xuICAgIH1cbiAgfSxcblxuICB0b3BTdGFjazogZnVuY3Rpb24od3JhcHBlZCkge1xuICAgIHZhciBzdGFjayA9ICh0aGlzLmlzSW5saW5lKCkgPyB0aGlzLmlubGluZVN0YWNrIDogdGhpcy5jb21waWxlU3RhY2spLFxuICAgICAgICBpdGVtID0gc3RhY2tbc3RhY2subGVuZ3RoIC0gMV07XG5cbiAgICBpZiAoIXdyYXBwZWQgJiYgKGl0ZW0gaW5zdGFuY2VvZiBMaXRlcmFsKSkge1xuICAgICAgcmV0dXJuIGl0ZW0udmFsdWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBpdGVtO1xuICAgIH1cbiAgfSxcblxuICBxdW90ZWRTdHJpbmc6IGZ1bmN0aW9uKHN0cikge1xuICAgIHJldHVybiAnXCInICsgc3RyXG4gICAgICAucmVwbGFjZSgvXFxcXC9nLCAnXFxcXFxcXFwnKVxuICAgICAgLnJlcGxhY2UoL1wiL2csICdcXFxcXCInKVxuICAgICAgLnJlcGxhY2UoL1xcbi9nLCAnXFxcXG4nKVxuICAgICAgLnJlcGxhY2UoL1xcci9nLCAnXFxcXHInKVxuICAgICAgLnJlcGxhY2UoL1xcdTIwMjgvZywgJ1xcXFx1MjAyOCcpICAgLy8gUGVyIEVjbWEtMjYyIDcuMyArIDcuOC40XG4gICAgICAucmVwbGFjZSgvXFx1MjAyOS9nLCAnXFxcXHUyMDI5JykgKyAnXCInO1xuICB9LFxuXG4gIHNldHVwSGVscGVyOiBmdW5jdGlvbihwYXJhbVNpemUsIG5hbWUsIG1pc3NpbmdQYXJhbXMpIHtcbiAgICB2YXIgcGFyYW1zID0gW10sXG4gICAgICAgIHBhcmFtc0luaXQgPSB0aGlzLnNldHVwUGFyYW1zKHBhcmFtU2l6ZSwgcGFyYW1zLCBtaXNzaW5nUGFyYW1zKTtcbiAgICB2YXIgZm91bmRIZWxwZXIgPSB0aGlzLm5hbWVMb29rdXAoJ2hlbHBlcnMnLCBuYW1lLCAnaGVscGVyJyk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgcGFyYW1zOiBwYXJhbXMsXG4gICAgICBwYXJhbXNJbml0OiBwYXJhbXNJbml0LFxuICAgICAgbmFtZTogZm91bmRIZWxwZXIsXG4gICAgICBjYWxsUGFyYW1zOiBbXCJkZXB0aDBcIl0uY29uY2F0KHBhcmFtcykuam9pbihcIiwgXCIpLFxuICAgICAgaGVscGVyTWlzc2luZ1BhcmFtczogbWlzc2luZ1BhcmFtcyAmJiBbXCJkZXB0aDBcIiwgdGhpcy5xdW90ZWRTdHJpbmcobmFtZSldLmNvbmNhdChwYXJhbXMpLmpvaW4oXCIsIFwiKVxuICAgIH07XG4gIH0sXG5cbiAgc2V0dXBPcHRpb25zOiBmdW5jdGlvbihwYXJhbVNpemUsIHBhcmFtcykge1xuICAgIHZhciBvcHRpb25zID0gW10sIGNvbnRleHRzID0gW10sIHR5cGVzID0gW10sIHBhcmFtLCBpbnZlcnNlLCBwcm9ncmFtO1xuXG4gICAgb3B0aW9ucy5wdXNoKFwiaGFzaDpcIiArIHRoaXMucG9wU3RhY2soKSk7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmluZ1BhcmFtcykge1xuICAgICAgb3B0aW9ucy5wdXNoKFwiaGFzaFR5cGVzOlwiICsgdGhpcy5wb3BTdGFjaygpKTtcbiAgICAgIG9wdGlvbnMucHVzaChcImhhc2hDb250ZXh0czpcIiArIHRoaXMucG9wU3RhY2soKSk7XG4gICAgfVxuXG4gICAgaW52ZXJzZSA9IHRoaXMucG9wU3RhY2soKTtcbiAgICBwcm9ncmFtID0gdGhpcy5wb3BTdGFjaygpO1xuXG4gICAgLy8gQXZvaWQgc2V0dGluZyBmbiBhbmQgaW52ZXJzZSBpZiBuZWl0aGVyIGFyZSBzZXQuIFRoaXMgYWxsb3dzXG4gICAgLy8gaGVscGVycyB0byBkbyBhIGNoZWNrIGZvciBgaWYgKG9wdGlvbnMuZm4pYFxuICAgIGlmIChwcm9ncmFtIHx8IGludmVyc2UpIHtcbiAgICAgIGlmICghcHJvZ3JhbSkge1xuICAgICAgICB0aGlzLmNvbnRleHQuYWxpYXNlcy5zZWxmID0gXCJ0aGlzXCI7XG4gICAgICAgIHByb2dyYW0gPSBcInNlbGYubm9vcFwiO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWludmVyc2UpIHtcbiAgICAgICAgdGhpcy5jb250ZXh0LmFsaWFzZXMuc2VsZiA9IFwidGhpc1wiO1xuICAgICAgICBpbnZlcnNlID0gXCJzZWxmLm5vb3BcIjtcbiAgICAgIH1cblxuICAgICAgb3B0aW9ucy5wdXNoKFwiaW52ZXJzZTpcIiArIGludmVyc2UpO1xuICAgICAgb3B0aW9ucy5wdXNoKFwiZm46XCIgKyBwcm9ncmFtKTtcbiAgICB9XG5cbiAgICBmb3IodmFyIGk9MDsgaTxwYXJhbVNpemU7IGkrKykge1xuICAgICAgcGFyYW0gPSB0aGlzLnBvcFN0YWNrKCk7XG4gICAgICBwYXJhbXMucHVzaChwYXJhbSk7XG5cbiAgICAgIGlmKHRoaXMub3B0aW9ucy5zdHJpbmdQYXJhbXMpIHtcbiAgICAgICAgdHlwZXMucHVzaCh0aGlzLnBvcFN0YWNrKCkpO1xuICAgICAgICBjb250ZXh0cy5wdXNoKHRoaXMucG9wU3RhY2soKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpbmdQYXJhbXMpIHtcbiAgICAgIG9wdGlvbnMucHVzaChcImNvbnRleHRzOltcIiArIGNvbnRleHRzLmpvaW4oXCIsXCIpICsgXCJdXCIpO1xuICAgICAgb3B0aW9ucy5wdXNoKFwidHlwZXM6W1wiICsgdHlwZXMuam9pbihcIixcIikgKyBcIl1cIik7XG4gICAgfVxuXG4gICAgaWYodGhpcy5vcHRpb25zLmRhdGEpIHtcbiAgICAgIG9wdGlvbnMucHVzaChcImRhdGE6ZGF0YVwiKTtcbiAgICB9XG5cbiAgICByZXR1cm4gb3B0aW9ucztcbiAgfSxcblxuICAvLyB0aGUgcGFyYW1zIGFuZCBjb250ZXh0cyBhcmd1bWVudHMgYXJlIHBhc3NlZCBpbiBhcnJheXNcbiAgLy8gdG8gZmlsbCBpblxuICBzZXR1cFBhcmFtczogZnVuY3Rpb24ocGFyYW1TaXplLCBwYXJhbXMsIHVzZVJlZ2lzdGVyKSB7XG4gICAgdmFyIG9wdGlvbnMgPSAneycgKyB0aGlzLnNldHVwT3B0aW9ucyhwYXJhbVNpemUsIHBhcmFtcykuam9pbignLCcpICsgJ30nO1xuXG4gICAgaWYgKHVzZVJlZ2lzdGVyKSB7XG4gICAgICB0aGlzLnVzZVJlZ2lzdGVyKCdvcHRpb25zJyk7XG4gICAgICBwYXJhbXMucHVzaCgnb3B0aW9ucycpO1xuICAgICAgcmV0dXJuICdvcHRpb25zPScgKyBvcHRpb25zO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYXJhbXMucHVzaChvcHRpb25zKTtcbiAgICAgIHJldHVybiAnJztcbiAgICB9XG4gIH1cbn07XG5cbnZhciByZXNlcnZlZFdvcmRzID0gKFxuICBcImJyZWFrIGVsc2UgbmV3IHZhclwiICtcbiAgXCIgY2FzZSBmaW5hbGx5IHJldHVybiB2b2lkXCIgK1xuICBcIiBjYXRjaCBmb3Igc3dpdGNoIHdoaWxlXCIgK1xuICBcIiBjb250aW51ZSBmdW5jdGlvbiB0aGlzIHdpdGhcIiArXG4gIFwiIGRlZmF1bHQgaWYgdGhyb3dcIiArXG4gIFwiIGRlbGV0ZSBpbiB0cnlcIiArXG4gIFwiIGRvIGluc3RhbmNlb2YgdHlwZW9mXCIgK1xuICBcIiBhYnN0cmFjdCBlbnVtIGludCBzaG9ydFwiICtcbiAgXCIgYm9vbGVhbiBleHBvcnQgaW50ZXJmYWNlIHN0YXRpY1wiICtcbiAgXCIgYnl0ZSBleHRlbmRzIGxvbmcgc3VwZXJcIiArXG4gIFwiIGNoYXIgZmluYWwgbmF0aXZlIHN5bmNocm9uaXplZFwiICtcbiAgXCIgY2xhc3MgZmxvYXQgcGFja2FnZSB0aHJvd3NcIiArXG4gIFwiIGNvbnN0IGdvdG8gcHJpdmF0ZSB0cmFuc2llbnRcIiArXG4gIFwiIGRlYnVnZ2VyIGltcGxlbWVudHMgcHJvdGVjdGVkIHZvbGF0aWxlXCIgK1xuICBcIiBkb3VibGUgaW1wb3J0IHB1YmxpYyBsZXQgeWllbGRcIlxuKS5zcGxpdChcIiBcIik7XG5cbnZhciBjb21waWxlcldvcmRzID0gSmF2YVNjcmlwdENvbXBpbGVyLlJFU0VSVkVEX1dPUkRTID0ge307XG5cbmZvcih2YXIgaT0wLCBsPXJlc2VydmVkV29yZHMubGVuZ3RoOyBpPGw7IGkrKykge1xuICBjb21waWxlcldvcmRzW3Jlc2VydmVkV29yZHNbaV1dID0gdHJ1ZTtcbn1cblxuSmF2YVNjcmlwdENvbXBpbGVyLmlzVmFsaWRKYXZhU2NyaXB0VmFyaWFibGVOYW1lID0gZnVuY3Rpb24obmFtZSkge1xuICBpZighSmF2YVNjcmlwdENvbXBpbGVyLlJFU0VSVkVEX1dPUkRTW25hbWVdICYmIC9eW2EtekEtWl8kXVswLTlhLXpBLVpfJF0qJC8udGVzdChuYW1lKSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn07XG5cbmV4cG9ydHNbXCJkZWZhdWx0XCJdID0gSmF2YVNjcmlwdENvbXBpbGVyOyIsIlwidXNlIHN0cmljdFwiO1xuLyoganNoaW50IGlnbm9yZTpzdGFydCAqL1xuLyogSmlzb24gZ2VuZXJhdGVkIHBhcnNlciAqL1xudmFyIGhhbmRsZWJhcnMgPSAoZnVuY3Rpb24oKXtcbnZhciBwYXJzZXIgPSB7dHJhY2U6IGZ1bmN0aW9uIHRyYWNlKCkgeyB9LFxueXk6IHt9LFxuc3ltYm9sc186IHtcImVycm9yXCI6MixcInJvb3RcIjozLFwic3RhdGVtZW50c1wiOjQsXCJFT0ZcIjo1LFwicHJvZ3JhbVwiOjYsXCJzaW1wbGVJbnZlcnNlXCI6NyxcInN0YXRlbWVudFwiOjgsXCJvcGVuSW52ZXJzZVwiOjksXCJjbG9zZUJsb2NrXCI6MTAsXCJvcGVuQmxvY2tcIjoxMSxcIm11c3RhY2hlXCI6MTIsXCJwYXJ0aWFsXCI6MTMsXCJDT05URU5UXCI6MTQsXCJDT01NRU5UXCI6MTUsXCJPUEVOX0JMT0NLXCI6MTYsXCJzZXhwclwiOjE3LFwiQ0xPU0VcIjoxOCxcIk9QRU5fSU5WRVJTRVwiOjE5LFwiT1BFTl9FTkRCTE9DS1wiOjIwLFwicGF0aFwiOjIxLFwiT1BFTlwiOjIyLFwiT1BFTl9VTkVTQ0FQRURcIjoyMyxcIkNMT1NFX1VORVNDQVBFRFwiOjI0LFwiT1BFTl9QQVJUSUFMXCI6MjUsXCJwYXJ0aWFsTmFtZVwiOjI2LFwicGFydGlhbF9vcHRpb24wXCI6MjcsXCJzZXhwcl9yZXBldGl0aW9uMFwiOjI4LFwic2V4cHJfb3B0aW9uMFwiOjI5LFwiZGF0YU5hbWVcIjozMCxcInBhcmFtXCI6MzEsXCJTVFJJTkdcIjozMixcIklOVEVHRVJcIjozMyxcIkJPT0xFQU5cIjozNCxcIk9QRU5fU0VYUFJcIjozNSxcIkNMT1NFX1NFWFBSXCI6MzYsXCJoYXNoXCI6MzcsXCJoYXNoX3JlcGV0aXRpb25fcGx1czBcIjozOCxcImhhc2hTZWdtZW50XCI6MzksXCJJRFwiOjQwLFwiRVFVQUxTXCI6NDEsXCJEQVRBXCI6NDIsXCJwYXRoU2VnbWVudHNcIjo0MyxcIlNFUFwiOjQ0LFwiJGFjY2VwdFwiOjAsXCIkZW5kXCI6MX0sXG50ZXJtaW5hbHNfOiB7MjpcImVycm9yXCIsNTpcIkVPRlwiLDE0OlwiQ09OVEVOVFwiLDE1OlwiQ09NTUVOVFwiLDE2OlwiT1BFTl9CTE9DS1wiLDE4OlwiQ0xPU0VcIiwxOTpcIk9QRU5fSU5WRVJTRVwiLDIwOlwiT1BFTl9FTkRCTE9DS1wiLDIyOlwiT1BFTlwiLDIzOlwiT1BFTl9VTkVTQ0FQRURcIiwyNDpcIkNMT1NFX1VORVNDQVBFRFwiLDI1OlwiT1BFTl9QQVJUSUFMXCIsMzI6XCJTVFJJTkdcIiwzMzpcIklOVEVHRVJcIiwzNDpcIkJPT0xFQU5cIiwzNTpcIk9QRU5fU0VYUFJcIiwzNjpcIkNMT1NFX1NFWFBSXCIsNDA6XCJJRFwiLDQxOlwiRVFVQUxTXCIsNDI6XCJEQVRBXCIsNDQ6XCJTRVBcIn0sXG5wcm9kdWN0aW9uc186IFswLFszLDJdLFszLDFdLFs2LDJdLFs2LDNdLFs2LDJdLFs2LDFdLFs2LDFdLFs2LDBdLFs0LDFdLFs0LDJdLFs4LDNdLFs4LDNdLFs4LDFdLFs4LDFdLFs4LDFdLFs4LDFdLFsxMSwzXSxbOSwzXSxbMTAsM10sWzEyLDNdLFsxMiwzXSxbMTMsNF0sWzcsMl0sWzE3LDNdLFsxNywxXSxbMzEsMV0sWzMxLDFdLFszMSwxXSxbMzEsMV0sWzMxLDFdLFszMSwzXSxbMzcsMV0sWzM5LDNdLFsyNiwxXSxbMjYsMV0sWzI2LDFdLFszMCwyXSxbMjEsMV0sWzQzLDNdLFs0MywxXSxbMjcsMF0sWzI3LDFdLFsyOCwwXSxbMjgsMl0sWzI5LDBdLFsyOSwxXSxbMzgsMV0sWzM4LDJdXSxcbnBlcmZvcm1BY3Rpb246IGZ1bmN0aW9uIGFub255bW91cyh5eXRleHQseXlsZW5nLHl5bGluZW5vLHl5LHl5c3RhdGUsJCQsXyQpIHtcblxudmFyICQwID0gJCQubGVuZ3RoIC0gMTtcbnN3aXRjaCAoeXlzdGF0ZSkge1xuY2FzZSAxOiByZXR1cm4gbmV3IHl5LlByb2dyYW1Ob2RlKCQkWyQwLTFdLCB0aGlzLl8kKTsgXG5icmVhaztcbmNhc2UgMjogcmV0dXJuIG5ldyB5eS5Qcm9ncmFtTm9kZShbXSwgdGhpcy5fJCk7IFxuYnJlYWs7XG5jYXNlIDM6dGhpcy4kID0gbmV3IHl5LlByb2dyYW1Ob2RlKFtdLCAkJFskMC0xXSwgJCRbJDBdLCB0aGlzLl8kKTtcbmJyZWFrO1xuY2FzZSA0OnRoaXMuJCA9IG5ldyB5eS5Qcm9ncmFtTm9kZSgkJFskMC0yXSwgJCRbJDAtMV0sICQkWyQwXSwgdGhpcy5fJCk7XG5icmVhaztcbmNhc2UgNTp0aGlzLiQgPSBuZXcgeXkuUHJvZ3JhbU5vZGUoJCRbJDAtMV0sICQkWyQwXSwgW10sIHRoaXMuXyQpO1xuYnJlYWs7XG5jYXNlIDY6dGhpcy4kID0gbmV3IHl5LlByb2dyYW1Ob2RlKCQkWyQwXSwgdGhpcy5fJCk7XG5icmVhaztcbmNhc2UgNzp0aGlzLiQgPSBuZXcgeXkuUHJvZ3JhbU5vZGUoW10sIHRoaXMuXyQpO1xuYnJlYWs7XG5jYXNlIDg6dGhpcy4kID0gbmV3IHl5LlByb2dyYW1Ob2RlKFtdLCB0aGlzLl8kKTtcbmJyZWFrO1xuY2FzZSA5OnRoaXMuJCA9IFskJFskMF1dO1xuYnJlYWs7XG5jYXNlIDEwOiAkJFskMC0xXS5wdXNoKCQkWyQwXSk7IHRoaXMuJCA9ICQkWyQwLTFdOyBcbmJyZWFrO1xuY2FzZSAxMTp0aGlzLiQgPSBuZXcgeXkuQmxvY2tOb2RlKCQkWyQwLTJdLCAkJFskMC0xXS5pbnZlcnNlLCAkJFskMC0xXSwgJCRbJDBdLCB0aGlzLl8kKTtcbmJyZWFrO1xuY2FzZSAxMjp0aGlzLiQgPSBuZXcgeXkuQmxvY2tOb2RlKCQkWyQwLTJdLCAkJFskMC0xXSwgJCRbJDAtMV0uaW52ZXJzZSwgJCRbJDBdLCB0aGlzLl8kKTtcbmJyZWFrO1xuY2FzZSAxMzp0aGlzLiQgPSAkJFskMF07XG5icmVhaztcbmNhc2UgMTQ6dGhpcy4kID0gJCRbJDBdO1xuYnJlYWs7XG5jYXNlIDE1OnRoaXMuJCA9IG5ldyB5eS5Db250ZW50Tm9kZSgkJFskMF0sIHRoaXMuXyQpO1xuYnJlYWs7XG5jYXNlIDE2OnRoaXMuJCA9IG5ldyB5eS5Db21tZW50Tm9kZSgkJFskMF0sIHRoaXMuXyQpO1xuYnJlYWs7XG5jYXNlIDE3OnRoaXMuJCA9IG5ldyB5eS5NdXN0YWNoZU5vZGUoJCRbJDAtMV0sIG51bGwsICQkWyQwLTJdLCBzdHJpcEZsYWdzKCQkWyQwLTJdLCAkJFskMF0pLCB0aGlzLl8kKTtcbmJyZWFrO1xuY2FzZSAxODp0aGlzLiQgPSBuZXcgeXkuTXVzdGFjaGVOb2RlKCQkWyQwLTFdLCBudWxsLCAkJFskMC0yXSwgc3RyaXBGbGFncygkJFskMC0yXSwgJCRbJDBdKSwgdGhpcy5fJCk7XG5icmVhaztcbmNhc2UgMTk6dGhpcy4kID0ge3BhdGg6ICQkWyQwLTFdLCBzdHJpcDogc3RyaXBGbGFncygkJFskMC0yXSwgJCRbJDBdKX07XG5icmVhaztcbmNhc2UgMjA6dGhpcy4kID0gbmV3IHl5Lk11c3RhY2hlTm9kZSgkJFskMC0xXSwgbnVsbCwgJCRbJDAtMl0sIHN0cmlwRmxhZ3MoJCRbJDAtMl0sICQkWyQwXSksIHRoaXMuXyQpO1xuYnJlYWs7XG5jYXNlIDIxOnRoaXMuJCA9IG5ldyB5eS5NdXN0YWNoZU5vZGUoJCRbJDAtMV0sIG51bGwsICQkWyQwLTJdLCBzdHJpcEZsYWdzKCQkWyQwLTJdLCAkJFskMF0pLCB0aGlzLl8kKTtcbmJyZWFrO1xuY2FzZSAyMjp0aGlzLiQgPSBuZXcgeXkuUGFydGlhbE5vZGUoJCRbJDAtMl0sICQkWyQwLTFdLCBzdHJpcEZsYWdzKCQkWyQwLTNdLCAkJFskMF0pLCB0aGlzLl8kKTtcbmJyZWFrO1xuY2FzZSAyMzp0aGlzLiQgPSBzdHJpcEZsYWdzKCQkWyQwLTFdLCAkJFskMF0pO1xuYnJlYWs7XG5jYXNlIDI0OnRoaXMuJCA9IG5ldyB5eS5TZXhwck5vZGUoWyQkWyQwLTJdXS5jb25jYXQoJCRbJDAtMV0pLCAkJFskMF0sIHRoaXMuXyQpO1xuYnJlYWs7XG5jYXNlIDI1OnRoaXMuJCA9IG5ldyB5eS5TZXhwck5vZGUoWyQkWyQwXV0sIG51bGwsIHRoaXMuXyQpO1xuYnJlYWs7XG5jYXNlIDI2OnRoaXMuJCA9ICQkWyQwXTtcbmJyZWFrO1xuY2FzZSAyNzp0aGlzLiQgPSBuZXcgeXkuU3RyaW5nTm9kZSgkJFskMF0sIHRoaXMuXyQpO1xuYnJlYWs7XG5jYXNlIDI4OnRoaXMuJCA9IG5ldyB5eS5JbnRlZ2VyTm9kZSgkJFskMF0sIHRoaXMuXyQpO1xuYnJlYWs7XG5jYXNlIDI5OnRoaXMuJCA9IG5ldyB5eS5Cb29sZWFuTm9kZSgkJFskMF0sIHRoaXMuXyQpO1xuYnJlYWs7XG5jYXNlIDMwOnRoaXMuJCA9ICQkWyQwXTtcbmJyZWFrO1xuY2FzZSAzMTokJFskMC0xXS5pc0hlbHBlciA9IHRydWU7IHRoaXMuJCA9ICQkWyQwLTFdO1xuYnJlYWs7XG5jYXNlIDMyOnRoaXMuJCA9IG5ldyB5eS5IYXNoTm9kZSgkJFskMF0sIHRoaXMuXyQpO1xuYnJlYWs7XG5jYXNlIDMzOnRoaXMuJCA9IFskJFskMC0yXSwgJCRbJDBdXTtcbmJyZWFrO1xuY2FzZSAzNDp0aGlzLiQgPSBuZXcgeXkuUGFydGlhbE5hbWVOb2RlKCQkWyQwXSwgdGhpcy5fJCk7XG5icmVhaztcbmNhc2UgMzU6dGhpcy4kID0gbmV3IHl5LlBhcnRpYWxOYW1lTm9kZShuZXcgeXkuU3RyaW5nTm9kZSgkJFskMF0sIHRoaXMuXyQpLCB0aGlzLl8kKTtcbmJyZWFrO1xuY2FzZSAzNjp0aGlzLiQgPSBuZXcgeXkuUGFydGlhbE5hbWVOb2RlKG5ldyB5eS5JbnRlZ2VyTm9kZSgkJFskMF0sIHRoaXMuXyQpKTtcbmJyZWFrO1xuY2FzZSAzNzp0aGlzLiQgPSBuZXcgeXkuRGF0YU5vZGUoJCRbJDBdLCB0aGlzLl8kKTtcbmJyZWFrO1xuY2FzZSAzODp0aGlzLiQgPSBuZXcgeXkuSWROb2RlKCQkWyQwXSwgdGhpcy5fJCk7XG5icmVhaztcbmNhc2UgMzk6ICQkWyQwLTJdLnB1c2goe3BhcnQ6ICQkWyQwXSwgc2VwYXJhdG9yOiAkJFskMC0xXX0pOyB0aGlzLiQgPSAkJFskMC0yXTsgXG5icmVhaztcbmNhc2UgNDA6dGhpcy4kID0gW3twYXJ0OiAkJFskMF19XTtcbmJyZWFrO1xuY2FzZSA0Mzp0aGlzLiQgPSBbXTtcbmJyZWFrO1xuY2FzZSA0NDokJFskMC0xXS5wdXNoKCQkWyQwXSk7XG5icmVhaztcbmNhc2UgNDc6dGhpcy4kID0gWyQkWyQwXV07XG5icmVhaztcbmNhc2UgNDg6JCRbJDAtMV0ucHVzaCgkJFskMF0pO1xuYnJlYWs7XG59XG59LFxudGFibGU6IFt7MzoxLDQ6Miw1OlsxLDNdLDg6NCw5OjUsMTE6NiwxMjo3LDEzOjgsMTQ6WzEsOV0sMTU6WzEsMTBdLDE2OlsxLDEyXSwxOTpbMSwxMV0sMjI6WzEsMTNdLDIzOlsxLDE0XSwyNTpbMSwxNV19LHsxOlszXX0sezU6WzEsMTZdLDg6MTcsOTo1LDExOjYsMTI6NywxMzo4LDE0OlsxLDldLDE1OlsxLDEwXSwxNjpbMSwxMl0sMTk6WzEsMTFdLDIyOlsxLDEzXSwyMzpbMSwxNF0sMjU6WzEsMTVdfSx7MTpbMiwyXX0sezU6WzIsOV0sMTQ6WzIsOV0sMTU6WzIsOV0sMTY6WzIsOV0sMTk6WzIsOV0sMjA6WzIsOV0sMjI6WzIsOV0sMjM6WzIsOV0sMjU6WzIsOV19LHs0OjIwLDY6MTgsNzoxOSw4OjQsOTo1LDExOjYsMTI6NywxMzo4LDE0OlsxLDldLDE1OlsxLDEwXSwxNjpbMSwxMl0sMTk6WzEsMjFdLDIwOlsyLDhdLDIyOlsxLDEzXSwyMzpbMSwxNF0sMjU6WzEsMTVdfSx7NDoyMCw2OjIyLDc6MTksODo0LDk6NSwxMTo2LDEyOjcsMTM6OCwxNDpbMSw5XSwxNTpbMSwxMF0sMTY6WzEsMTJdLDE5OlsxLDIxXSwyMDpbMiw4XSwyMjpbMSwxM10sMjM6WzEsMTRdLDI1OlsxLDE1XX0sezU6WzIsMTNdLDE0OlsyLDEzXSwxNTpbMiwxM10sMTY6WzIsMTNdLDE5OlsyLDEzXSwyMDpbMiwxM10sMjI6WzIsMTNdLDIzOlsyLDEzXSwyNTpbMiwxM119LHs1OlsyLDE0XSwxNDpbMiwxNF0sMTU6WzIsMTRdLDE2OlsyLDE0XSwxOTpbMiwxNF0sMjA6WzIsMTRdLDIyOlsyLDE0XSwyMzpbMiwxNF0sMjU6WzIsMTRdfSx7NTpbMiwxNV0sMTQ6WzIsMTVdLDE1OlsyLDE1XSwxNjpbMiwxNV0sMTk6WzIsMTVdLDIwOlsyLDE1XSwyMjpbMiwxNV0sMjM6WzIsMTVdLDI1OlsyLDE1XX0sezU6WzIsMTZdLDE0OlsyLDE2XSwxNTpbMiwxNl0sMTY6WzIsMTZdLDE5OlsyLDE2XSwyMDpbMiwxNl0sMjI6WzIsMTZdLDIzOlsyLDE2XSwyNTpbMiwxNl19LHsxNzoyMywyMToyNCwzMDoyNSw0MDpbMSwyOF0sNDI6WzEsMjddLDQzOjI2fSx7MTc6MjksMjE6MjQsMzA6MjUsNDA6WzEsMjhdLDQyOlsxLDI3XSw0MzoyNn0sezE3OjMwLDIxOjI0LDMwOjI1LDQwOlsxLDI4XSw0MjpbMSwyN10sNDM6MjZ9LHsxNzozMSwyMToyNCwzMDoyNSw0MDpbMSwyOF0sNDI6WzEsMjddLDQzOjI2fSx7MjE6MzMsMjY6MzIsMzI6WzEsMzRdLDMzOlsxLDM1XSw0MDpbMSwyOF0sNDM6MjZ9LHsxOlsyLDFdfSx7NTpbMiwxMF0sMTQ6WzIsMTBdLDE1OlsyLDEwXSwxNjpbMiwxMF0sMTk6WzIsMTBdLDIwOlsyLDEwXSwyMjpbMiwxMF0sMjM6WzIsMTBdLDI1OlsyLDEwXX0sezEwOjM2LDIwOlsxLDM3XX0sezQ6MzgsODo0LDk6NSwxMTo2LDEyOjcsMTM6OCwxNDpbMSw5XSwxNTpbMSwxMF0sMTY6WzEsMTJdLDE5OlsxLDExXSwyMDpbMiw3XSwyMjpbMSwxM10sMjM6WzEsMTRdLDI1OlsxLDE1XX0sezc6MzksODoxNyw5OjUsMTE6NiwxMjo3LDEzOjgsMTQ6WzEsOV0sMTU6WzEsMTBdLDE2OlsxLDEyXSwxOTpbMSwyMV0sMjA6WzIsNl0sMjI6WzEsMTNdLDIzOlsxLDE0XSwyNTpbMSwxNV19LHsxNzoyMywxODpbMSw0MF0sMjE6MjQsMzA6MjUsNDA6WzEsMjhdLDQyOlsxLDI3XSw0MzoyNn0sezEwOjQxLDIwOlsxLDM3XX0sezE4OlsxLDQyXX0sezE4OlsyLDQzXSwyNDpbMiw0M10sMjg6NDMsMzI6WzIsNDNdLDMzOlsyLDQzXSwzNDpbMiw0M10sMzU6WzIsNDNdLDM2OlsyLDQzXSw0MDpbMiw0M10sNDI6WzIsNDNdfSx7MTg6WzIsMjVdLDI0OlsyLDI1XSwzNjpbMiwyNV19LHsxODpbMiwzOF0sMjQ6WzIsMzhdLDMyOlsyLDM4XSwzMzpbMiwzOF0sMzQ6WzIsMzhdLDM1OlsyLDM4XSwzNjpbMiwzOF0sNDA6WzIsMzhdLDQyOlsyLDM4XSw0NDpbMSw0NF19LHsyMTo0NSw0MDpbMSwyOF0sNDM6MjZ9LHsxODpbMiw0MF0sMjQ6WzIsNDBdLDMyOlsyLDQwXSwzMzpbMiw0MF0sMzQ6WzIsNDBdLDM1OlsyLDQwXSwzNjpbMiw0MF0sNDA6WzIsNDBdLDQyOlsyLDQwXSw0NDpbMiw0MF19LHsxODpbMSw0Nl19LHsxODpbMSw0N119LHsyNDpbMSw0OF19LHsxODpbMiw0MV0sMjE6NTAsMjc6NDksNDA6WzEsMjhdLDQzOjI2fSx7MTg6WzIsMzRdLDQwOlsyLDM0XX0sezE4OlsyLDM1XSw0MDpbMiwzNV19LHsxODpbMiwzNl0sNDA6WzIsMzZdfSx7NTpbMiwxMV0sMTQ6WzIsMTFdLDE1OlsyLDExXSwxNjpbMiwxMV0sMTk6WzIsMTFdLDIwOlsyLDExXSwyMjpbMiwxMV0sMjM6WzIsMTFdLDI1OlsyLDExXX0sezIxOjUxLDQwOlsxLDI4XSw0MzoyNn0sezg6MTcsOTo1LDExOjYsMTI6NywxMzo4LDE0OlsxLDldLDE1OlsxLDEwXSwxNjpbMSwxMl0sMTk6WzEsMTFdLDIwOlsyLDNdLDIyOlsxLDEzXSwyMzpbMSwxNF0sMjU6WzEsMTVdfSx7NDo1Miw4OjQsOTo1LDExOjYsMTI6NywxMzo4LDE0OlsxLDldLDE1OlsxLDEwXSwxNjpbMSwxMl0sMTk6WzEsMTFdLDIwOlsyLDVdLDIyOlsxLDEzXSwyMzpbMSwxNF0sMjU6WzEsMTVdfSx7MTQ6WzIsMjNdLDE1OlsyLDIzXSwxNjpbMiwyM10sMTk6WzIsMjNdLDIwOlsyLDIzXSwyMjpbMiwyM10sMjM6WzIsMjNdLDI1OlsyLDIzXX0sezU6WzIsMTJdLDE0OlsyLDEyXSwxNTpbMiwxMl0sMTY6WzIsMTJdLDE5OlsyLDEyXSwyMDpbMiwxMl0sMjI6WzIsMTJdLDIzOlsyLDEyXSwyNTpbMiwxMl19LHsxNDpbMiwxOF0sMTU6WzIsMThdLDE2OlsyLDE4XSwxOTpbMiwxOF0sMjA6WzIsMThdLDIyOlsyLDE4XSwyMzpbMiwxOF0sMjU6WzIsMThdfSx7MTg6WzIsNDVdLDIxOjU2LDI0OlsyLDQ1XSwyOTo1MywzMDo2MCwzMTo1NCwzMjpbMSw1N10sMzM6WzEsNThdLDM0OlsxLDU5XSwzNTpbMSw2MV0sMzY6WzIsNDVdLDM3OjU1LDM4OjYyLDM5OjYzLDQwOlsxLDY0XSw0MjpbMSwyN10sNDM6MjZ9LHs0MDpbMSw2NV19LHsxODpbMiwzN10sMjQ6WzIsMzddLDMyOlsyLDM3XSwzMzpbMiwzN10sMzQ6WzIsMzddLDM1OlsyLDM3XSwzNjpbMiwzN10sNDA6WzIsMzddLDQyOlsyLDM3XX0sezE0OlsyLDE3XSwxNTpbMiwxN10sMTY6WzIsMTddLDE5OlsyLDE3XSwyMDpbMiwxN10sMjI6WzIsMTddLDIzOlsyLDE3XSwyNTpbMiwxN119LHs1OlsyLDIwXSwxNDpbMiwyMF0sMTU6WzIsMjBdLDE2OlsyLDIwXSwxOTpbMiwyMF0sMjA6WzIsMjBdLDIyOlsyLDIwXSwyMzpbMiwyMF0sMjU6WzIsMjBdfSx7NTpbMiwyMV0sMTQ6WzIsMjFdLDE1OlsyLDIxXSwxNjpbMiwyMV0sMTk6WzIsMjFdLDIwOlsyLDIxXSwyMjpbMiwyMV0sMjM6WzIsMjFdLDI1OlsyLDIxXX0sezE4OlsxLDY2XX0sezE4OlsyLDQyXX0sezE4OlsxLDY3XX0sezg6MTcsOTo1LDExOjYsMTI6NywxMzo4LDE0OlsxLDldLDE1OlsxLDEwXSwxNjpbMSwxMl0sMTk6WzEsMTFdLDIwOlsyLDRdLDIyOlsxLDEzXSwyMzpbMSwxNF0sMjU6WzEsMTVdfSx7MTg6WzIsMjRdLDI0OlsyLDI0XSwzNjpbMiwyNF19LHsxODpbMiw0NF0sMjQ6WzIsNDRdLDMyOlsyLDQ0XSwzMzpbMiw0NF0sMzQ6WzIsNDRdLDM1OlsyLDQ0XSwzNjpbMiw0NF0sNDA6WzIsNDRdLDQyOlsyLDQ0XX0sezE4OlsyLDQ2XSwyNDpbMiw0Nl0sMzY6WzIsNDZdfSx7MTg6WzIsMjZdLDI0OlsyLDI2XSwzMjpbMiwyNl0sMzM6WzIsMjZdLDM0OlsyLDI2XSwzNTpbMiwyNl0sMzY6WzIsMjZdLDQwOlsyLDI2XSw0MjpbMiwyNl19LHsxODpbMiwyN10sMjQ6WzIsMjddLDMyOlsyLDI3XSwzMzpbMiwyN10sMzQ6WzIsMjddLDM1OlsyLDI3XSwzNjpbMiwyN10sNDA6WzIsMjddLDQyOlsyLDI3XX0sezE4OlsyLDI4XSwyNDpbMiwyOF0sMzI6WzIsMjhdLDMzOlsyLDI4XSwzNDpbMiwyOF0sMzU6WzIsMjhdLDM2OlsyLDI4XSw0MDpbMiwyOF0sNDI6WzIsMjhdfSx7MTg6WzIsMjldLDI0OlsyLDI5XSwzMjpbMiwyOV0sMzM6WzIsMjldLDM0OlsyLDI5XSwzNTpbMiwyOV0sMzY6WzIsMjldLDQwOlsyLDI5XSw0MjpbMiwyOV19LHsxODpbMiwzMF0sMjQ6WzIsMzBdLDMyOlsyLDMwXSwzMzpbMiwzMF0sMzQ6WzIsMzBdLDM1OlsyLDMwXSwzNjpbMiwzMF0sNDA6WzIsMzBdLDQyOlsyLDMwXX0sezE3OjY4LDIxOjI0LDMwOjI1LDQwOlsxLDI4XSw0MjpbMSwyN10sNDM6MjZ9LHsxODpbMiwzMl0sMjQ6WzIsMzJdLDM2OlsyLDMyXSwzOTo2OSw0MDpbMSw3MF19LHsxODpbMiw0N10sMjQ6WzIsNDddLDM2OlsyLDQ3XSw0MDpbMiw0N119LHsxODpbMiw0MF0sMjQ6WzIsNDBdLDMyOlsyLDQwXSwzMzpbMiw0MF0sMzQ6WzIsNDBdLDM1OlsyLDQwXSwzNjpbMiw0MF0sNDA6WzIsNDBdLDQxOlsxLDcxXSw0MjpbMiw0MF0sNDQ6WzIsNDBdfSx7MTg6WzIsMzldLDI0OlsyLDM5XSwzMjpbMiwzOV0sMzM6WzIsMzldLDM0OlsyLDM5XSwzNTpbMiwzOV0sMzY6WzIsMzldLDQwOlsyLDM5XSw0MjpbMiwzOV0sNDQ6WzIsMzldfSx7NTpbMiwyMl0sMTQ6WzIsMjJdLDE1OlsyLDIyXSwxNjpbMiwyMl0sMTk6WzIsMjJdLDIwOlsyLDIyXSwyMjpbMiwyMl0sMjM6WzIsMjJdLDI1OlsyLDIyXX0sezU6WzIsMTldLDE0OlsyLDE5XSwxNTpbMiwxOV0sMTY6WzIsMTldLDE5OlsyLDE5XSwyMDpbMiwxOV0sMjI6WzIsMTldLDIzOlsyLDE5XSwyNTpbMiwxOV19LHszNjpbMSw3Ml19LHsxODpbMiw0OF0sMjQ6WzIsNDhdLDM2OlsyLDQ4XSw0MDpbMiw0OF19LHs0MTpbMSw3MV19LHsyMTo1NiwzMDo2MCwzMTo3MywzMjpbMSw1N10sMzM6WzEsNThdLDM0OlsxLDU5XSwzNTpbMSw2MV0sNDA6WzEsMjhdLDQyOlsxLDI3XSw0MzoyNn0sezE4OlsyLDMxXSwyNDpbMiwzMV0sMzI6WzIsMzFdLDMzOlsyLDMxXSwzNDpbMiwzMV0sMzU6WzIsMzFdLDM2OlsyLDMxXSw0MDpbMiwzMV0sNDI6WzIsMzFdfSx7MTg6WzIsMzNdLDI0OlsyLDMzXSwzNjpbMiwzM10sNDA6WzIsMzNdfV0sXG5kZWZhdWx0QWN0aW9uczogezM6WzIsMl0sMTY6WzIsMV0sNTA6WzIsNDJdfSxcbnBhcnNlRXJyb3I6IGZ1bmN0aW9uIHBhcnNlRXJyb3Ioc3RyLCBoYXNoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKHN0cik7XG59LFxucGFyc2U6IGZ1bmN0aW9uIHBhcnNlKGlucHV0KSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzLCBzdGFjayA9IFswXSwgdnN0YWNrID0gW251bGxdLCBsc3RhY2sgPSBbXSwgdGFibGUgPSB0aGlzLnRhYmxlLCB5eXRleHQgPSBcIlwiLCB5eWxpbmVubyA9IDAsIHl5bGVuZyA9IDAsIHJlY292ZXJpbmcgPSAwLCBURVJST1IgPSAyLCBFT0YgPSAxO1xuICAgIHRoaXMubGV4ZXIuc2V0SW5wdXQoaW5wdXQpO1xuICAgIHRoaXMubGV4ZXIueXkgPSB0aGlzLnl5O1xuICAgIHRoaXMueXkubGV4ZXIgPSB0aGlzLmxleGVyO1xuICAgIHRoaXMueXkucGFyc2VyID0gdGhpcztcbiAgICBpZiAodHlwZW9mIHRoaXMubGV4ZXIueXlsbG9jID09IFwidW5kZWZpbmVkXCIpXG4gICAgICAgIHRoaXMubGV4ZXIueXlsbG9jID0ge307XG4gICAgdmFyIHl5bG9jID0gdGhpcy5sZXhlci55eWxsb2M7XG4gICAgbHN0YWNrLnB1c2goeXlsb2MpO1xuICAgIHZhciByYW5nZXMgPSB0aGlzLmxleGVyLm9wdGlvbnMgJiYgdGhpcy5sZXhlci5vcHRpb25zLnJhbmdlcztcbiAgICBpZiAodHlwZW9mIHRoaXMueXkucGFyc2VFcnJvciA9PT0gXCJmdW5jdGlvblwiKVxuICAgICAgICB0aGlzLnBhcnNlRXJyb3IgPSB0aGlzLnl5LnBhcnNlRXJyb3I7XG4gICAgZnVuY3Rpb24gcG9wU3RhY2sobikge1xuICAgICAgICBzdGFjay5sZW5ndGggPSBzdGFjay5sZW5ndGggLSAyICogbjtcbiAgICAgICAgdnN0YWNrLmxlbmd0aCA9IHZzdGFjay5sZW5ndGggLSBuO1xuICAgICAgICBsc3RhY2subGVuZ3RoID0gbHN0YWNrLmxlbmd0aCAtIG47XG4gICAgfVxuICAgIGZ1bmN0aW9uIGxleCgpIHtcbiAgICAgICAgdmFyIHRva2VuO1xuICAgICAgICB0b2tlbiA9IHNlbGYubGV4ZXIubGV4KCkgfHwgMTtcbiAgICAgICAgaWYgKHR5cGVvZiB0b2tlbiAhPT0gXCJudW1iZXJcIikge1xuICAgICAgICAgICAgdG9rZW4gPSBzZWxmLnN5bWJvbHNfW3Rva2VuXSB8fCB0b2tlbjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdG9rZW47XG4gICAgfVxuICAgIHZhciBzeW1ib2wsIHByZUVycm9yU3ltYm9sLCBzdGF0ZSwgYWN0aW9uLCBhLCByLCB5eXZhbCA9IHt9LCBwLCBsZW4sIG5ld1N0YXRlLCBleHBlY3RlZDtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICBzdGF0ZSA9IHN0YWNrW3N0YWNrLmxlbmd0aCAtIDFdO1xuICAgICAgICBpZiAodGhpcy5kZWZhdWx0QWN0aW9uc1tzdGF0ZV0pIHtcbiAgICAgICAgICAgIGFjdGlvbiA9IHRoaXMuZGVmYXVsdEFjdGlvbnNbc3RhdGVdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHN5bWJvbCA9PT0gbnVsbCB8fCB0eXBlb2Ygc3ltYm9sID09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgICAgICBzeW1ib2wgPSBsZXgoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGFjdGlvbiA9IHRhYmxlW3N0YXRlXSAmJiB0YWJsZVtzdGF0ZV1bc3ltYm9sXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIGFjdGlvbiA9PT0gXCJ1bmRlZmluZWRcIiB8fCAhYWN0aW9uLmxlbmd0aCB8fCAhYWN0aW9uWzBdKSB7XG4gICAgICAgICAgICB2YXIgZXJyU3RyID0gXCJcIjtcbiAgICAgICAgICAgIGlmICghcmVjb3ZlcmluZykge1xuICAgICAgICAgICAgICAgIGV4cGVjdGVkID0gW107XG4gICAgICAgICAgICAgICAgZm9yIChwIGluIHRhYmxlW3N0YXRlXSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudGVybWluYWxzX1twXSAmJiBwID4gMikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0ZWQucHVzaChcIidcIiArIHRoaXMudGVybWluYWxzX1twXSArIFwiJ1wiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmxleGVyLnNob3dQb3NpdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBlcnJTdHIgPSBcIlBhcnNlIGVycm9yIG9uIGxpbmUgXCIgKyAoeXlsaW5lbm8gKyAxKSArIFwiOlxcblwiICsgdGhpcy5sZXhlci5zaG93UG9zaXRpb24oKSArIFwiXFxuRXhwZWN0aW5nIFwiICsgZXhwZWN0ZWQuam9pbihcIiwgXCIpICsgXCIsIGdvdCAnXCIgKyAodGhpcy50ZXJtaW5hbHNfW3N5bWJvbF0gfHwgc3ltYm9sKSArIFwiJ1wiO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGVyclN0ciA9IFwiUGFyc2UgZXJyb3Igb24gbGluZSBcIiArICh5eWxpbmVubyArIDEpICsgXCI6IFVuZXhwZWN0ZWQgXCIgKyAoc3ltYm9sID09IDE/XCJlbmQgb2YgaW5wdXRcIjpcIidcIiArICh0aGlzLnRlcm1pbmFsc19bc3ltYm9sXSB8fCBzeW1ib2wpICsgXCInXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLnBhcnNlRXJyb3IoZXJyU3RyLCB7dGV4dDogdGhpcy5sZXhlci5tYXRjaCwgdG9rZW46IHRoaXMudGVybWluYWxzX1tzeW1ib2xdIHx8IHN5bWJvbCwgbGluZTogdGhpcy5sZXhlci55eWxpbmVubywgbG9jOiB5eWxvYywgZXhwZWN0ZWQ6IGV4cGVjdGVkfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGFjdGlvblswXSBpbnN0YW5jZW9mIEFycmF5ICYmIGFjdGlvbi5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJQYXJzZSBFcnJvcjogbXVsdGlwbGUgYWN0aW9ucyBwb3NzaWJsZSBhdCBzdGF0ZTogXCIgKyBzdGF0ZSArIFwiLCB0b2tlbjogXCIgKyBzeW1ib2wpO1xuICAgICAgICB9XG4gICAgICAgIHN3aXRjaCAoYWN0aW9uWzBdKSB7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgIHN0YWNrLnB1c2goc3ltYm9sKTtcbiAgICAgICAgICAgIHZzdGFjay5wdXNoKHRoaXMubGV4ZXIueXl0ZXh0KTtcbiAgICAgICAgICAgIGxzdGFjay5wdXNoKHRoaXMubGV4ZXIueXlsbG9jKTtcbiAgICAgICAgICAgIHN0YWNrLnB1c2goYWN0aW9uWzFdKTtcbiAgICAgICAgICAgIHN5bWJvbCA9IG51bGw7XG4gICAgICAgICAgICBpZiAoIXByZUVycm9yU3ltYm9sKSB7XG4gICAgICAgICAgICAgICAgeXlsZW5nID0gdGhpcy5sZXhlci55eWxlbmc7XG4gICAgICAgICAgICAgICAgeXl0ZXh0ID0gdGhpcy5sZXhlci55eXRleHQ7XG4gICAgICAgICAgICAgICAgeXlsaW5lbm8gPSB0aGlzLmxleGVyLnl5bGluZW5vO1xuICAgICAgICAgICAgICAgIHl5bG9jID0gdGhpcy5sZXhlci55eWxsb2M7XG4gICAgICAgICAgICAgICAgaWYgKHJlY292ZXJpbmcgPiAwKVxuICAgICAgICAgICAgICAgICAgICByZWNvdmVyaW5nLS07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHN5bWJvbCA9IHByZUVycm9yU3ltYm9sO1xuICAgICAgICAgICAgICAgIHByZUVycm9yU3ltYm9sID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICBsZW4gPSB0aGlzLnByb2R1Y3Rpb25zX1thY3Rpb25bMV1dWzFdO1xuICAgICAgICAgICAgeXl2YWwuJCA9IHZzdGFja1t2c3RhY2subGVuZ3RoIC0gbGVuXTtcbiAgICAgICAgICAgIHl5dmFsLl8kID0ge2ZpcnN0X2xpbmU6IGxzdGFja1tsc3RhY2subGVuZ3RoIC0gKGxlbiB8fCAxKV0uZmlyc3RfbGluZSwgbGFzdF9saW5lOiBsc3RhY2tbbHN0YWNrLmxlbmd0aCAtIDFdLmxhc3RfbGluZSwgZmlyc3RfY29sdW1uOiBsc3RhY2tbbHN0YWNrLmxlbmd0aCAtIChsZW4gfHwgMSldLmZpcnN0X2NvbHVtbiwgbGFzdF9jb2x1bW46IGxzdGFja1tsc3RhY2subGVuZ3RoIC0gMV0ubGFzdF9jb2x1bW59O1xuICAgICAgICAgICAgaWYgKHJhbmdlcykge1xuICAgICAgICAgICAgICAgIHl5dmFsLl8kLnJhbmdlID0gW2xzdGFja1tsc3RhY2subGVuZ3RoIC0gKGxlbiB8fCAxKV0ucmFuZ2VbMF0sIGxzdGFja1tsc3RhY2subGVuZ3RoIC0gMV0ucmFuZ2VbMV1dO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgciA9IHRoaXMucGVyZm9ybUFjdGlvbi5jYWxsKHl5dmFsLCB5eXRleHQsIHl5bGVuZywgeXlsaW5lbm8sIHRoaXMueXksIGFjdGlvblsxXSwgdnN0YWNrLCBsc3RhY2spO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiByICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobGVuKSB7XG4gICAgICAgICAgICAgICAgc3RhY2sgPSBzdGFjay5zbGljZSgwLCAtMSAqIGxlbiAqIDIpO1xuICAgICAgICAgICAgICAgIHZzdGFjayA9IHZzdGFjay5zbGljZSgwLCAtMSAqIGxlbik7XG4gICAgICAgICAgICAgICAgbHN0YWNrID0gbHN0YWNrLnNsaWNlKDAsIC0xICogbGVuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN0YWNrLnB1c2godGhpcy5wcm9kdWN0aW9uc19bYWN0aW9uWzFdXVswXSk7XG4gICAgICAgICAgICB2c3RhY2sucHVzaCh5eXZhbC4kKTtcbiAgICAgICAgICAgIGxzdGFjay5wdXNoKHl5dmFsLl8kKTtcbiAgICAgICAgICAgIG5ld1N0YXRlID0gdGFibGVbc3RhY2tbc3RhY2subGVuZ3RoIC0gMl1dW3N0YWNrW3N0YWNrLmxlbmd0aCAtIDFdXTtcbiAgICAgICAgICAgIHN0YWNrLnB1c2gobmV3U3RhdGUpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufVxufTtcblxuXG5mdW5jdGlvbiBzdHJpcEZsYWdzKG9wZW4sIGNsb3NlKSB7XG4gIHJldHVybiB7XG4gICAgbGVmdDogb3Blbi5jaGFyQXQoMikgPT09ICd+JyxcbiAgICByaWdodDogY2xvc2UuY2hhckF0KDApID09PSAnficgfHwgY2xvc2UuY2hhckF0KDEpID09PSAnfidcbiAgfTtcbn1cblxuLyogSmlzb24gZ2VuZXJhdGVkIGxleGVyICovXG52YXIgbGV4ZXIgPSAoZnVuY3Rpb24oKXtcbnZhciBsZXhlciA9ICh7RU9GOjEsXG5wYXJzZUVycm9yOmZ1bmN0aW9uIHBhcnNlRXJyb3Ioc3RyLCBoYXNoKSB7XG4gICAgICAgIGlmICh0aGlzLnl5LnBhcnNlcikge1xuICAgICAgICAgICAgdGhpcy55eS5wYXJzZXIucGFyc2VFcnJvcihzdHIsIGhhc2gpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKHN0cik7XG4gICAgICAgIH1cbiAgICB9LFxuc2V0SW5wdXQ6ZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICAgIHRoaXMuX2lucHV0ID0gaW5wdXQ7XG4gICAgICAgIHRoaXMuX21vcmUgPSB0aGlzLl9sZXNzID0gdGhpcy5kb25lID0gZmFsc2U7XG4gICAgICAgIHRoaXMueXlsaW5lbm8gPSB0aGlzLnl5bGVuZyA9IDA7XG4gICAgICAgIHRoaXMueXl0ZXh0ID0gdGhpcy5tYXRjaGVkID0gdGhpcy5tYXRjaCA9ICcnO1xuICAgICAgICB0aGlzLmNvbmRpdGlvblN0YWNrID0gWydJTklUSUFMJ107XG4gICAgICAgIHRoaXMueXlsbG9jID0ge2ZpcnN0X2xpbmU6MSxmaXJzdF9jb2x1bW46MCxsYXN0X2xpbmU6MSxsYXN0X2NvbHVtbjowfTtcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5yYW5nZXMpIHRoaXMueXlsbG9jLnJhbmdlID0gWzAsMF07XG4gICAgICAgIHRoaXMub2Zmc2V0ID0gMDtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbmlucHV0OmZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGNoID0gdGhpcy5faW5wdXRbMF07XG4gICAgICAgIHRoaXMueXl0ZXh0ICs9IGNoO1xuICAgICAgICB0aGlzLnl5bGVuZysrO1xuICAgICAgICB0aGlzLm9mZnNldCsrO1xuICAgICAgICB0aGlzLm1hdGNoICs9IGNoO1xuICAgICAgICB0aGlzLm1hdGNoZWQgKz0gY2g7XG4gICAgICAgIHZhciBsaW5lcyA9IGNoLm1hdGNoKC8oPzpcXHJcXG4/fFxcbikuKi9nKTtcbiAgICAgICAgaWYgKGxpbmVzKSB7XG4gICAgICAgICAgICB0aGlzLnl5bGluZW5vKys7XG4gICAgICAgICAgICB0aGlzLnl5bGxvYy5sYXN0X2xpbmUrKztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMueXlsbG9jLmxhc3RfY29sdW1uKys7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5yYW5nZXMpIHRoaXMueXlsbG9jLnJhbmdlWzFdKys7XG5cbiAgICAgICAgdGhpcy5faW5wdXQgPSB0aGlzLl9pbnB1dC5zbGljZSgxKTtcbiAgICAgICAgcmV0dXJuIGNoO1xuICAgIH0sXG51bnB1dDpmdW5jdGlvbiAoY2gpIHtcbiAgICAgICAgdmFyIGxlbiA9IGNoLmxlbmd0aDtcbiAgICAgICAgdmFyIGxpbmVzID0gY2guc3BsaXQoLyg/Olxcclxcbj98XFxuKS9nKTtcblxuICAgICAgICB0aGlzLl9pbnB1dCA9IGNoICsgdGhpcy5faW5wdXQ7XG4gICAgICAgIHRoaXMueXl0ZXh0ID0gdGhpcy55eXRleHQuc3Vic3RyKDAsIHRoaXMueXl0ZXh0Lmxlbmd0aC1sZW4tMSk7XG4gICAgICAgIC8vdGhpcy55eWxlbmcgLT0gbGVuO1xuICAgICAgICB0aGlzLm9mZnNldCAtPSBsZW47XG4gICAgICAgIHZhciBvbGRMaW5lcyA9IHRoaXMubWF0Y2guc3BsaXQoLyg/Olxcclxcbj98XFxuKS9nKTtcbiAgICAgICAgdGhpcy5tYXRjaCA9IHRoaXMubWF0Y2guc3Vic3RyKDAsIHRoaXMubWF0Y2gubGVuZ3RoLTEpO1xuICAgICAgICB0aGlzLm1hdGNoZWQgPSB0aGlzLm1hdGNoZWQuc3Vic3RyKDAsIHRoaXMubWF0Y2hlZC5sZW5ndGgtMSk7XG5cbiAgICAgICAgaWYgKGxpbmVzLmxlbmd0aC0xKSB0aGlzLnl5bGluZW5vIC09IGxpbmVzLmxlbmd0aC0xO1xuICAgICAgICB2YXIgciA9IHRoaXMueXlsbG9jLnJhbmdlO1xuXG4gICAgICAgIHRoaXMueXlsbG9jID0ge2ZpcnN0X2xpbmU6IHRoaXMueXlsbG9jLmZpcnN0X2xpbmUsXG4gICAgICAgICAgbGFzdF9saW5lOiB0aGlzLnl5bGluZW5vKzEsXG4gICAgICAgICAgZmlyc3RfY29sdW1uOiB0aGlzLnl5bGxvYy5maXJzdF9jb2x1bW4sXG4gICAgICAgICAgbGFzdF9jb2x1bW46IGxpbmVzID9cbiAgICAgICAgICAgICAgKGxpbmVzLmxlbmd0aCA9PT0gb2xkTGluZXMubGVuZ3RoID8gdGhpcy55eWxsb2MuZmlyc3RfY29sdW1uIDogMCkgKyBvbGRMaW5lc1tvbGRMaW5lcy5sZW5ndGggLSBsaW5lcy5sZW5ndGhdLmxlbmd0aCAtIGxpbmVzWzBdLmxlbmd0aDpcbiAgICAgICAgICAgICAgdGhpcy55eWxsb2MuZmlyc3RfY29sdW1uIC0gbGVuXG4gICAgICAgICAgfTtcblxuICAgICAgICBpZiAodGhpcy5vcHRpb25zLnJhbmdlcykge1xuICAgICAgICAgICAgdGhpcy55eWxsb2MucmFuZ2UgPSBbclswXSwgclswXSArIHRoaXMueXlsZW5nIC0gbGVuXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxubW9yZTpmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX21vcmUgPSB0cnVlO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxubGVzczpmdW5jdGlvbiAobikge1xuICAgICAgICB0aGlzLnVucHV0KHRoaXMubWF0Y2guc2xpY2UobikpO1xuICAgIH0sXG5wYXN0SW5wdXQ6ZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgcGFzdCA9IHRoaXMubWF0Y2hlZC5zdWJzdHIoMCwgdGhpcy5tYXRjaGVkLmxlbmd0aCAtIHRoaXMubWF0Y2gubGVuZ3RoKTtcbiAgICAgICAgcmV0dXJuIChwYXN0Lmxlbmd0aCA+IDIwID8gJy4uLic6JycpICsgcGFzdC5zdWJzdHIoLTIwKS5yZXBsYWNlKC9cXG4vZywgXCJcIik7XG4gICAgfSxcbnVwY29taW5nSW5wdXQ6ZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgbmV4dCA9IHRoaXMubWF0Y2g7XG4gICAgICAgIGlmIChuZXh0Lmxlbmd0aCA8IDIwKSB7XG4gICAgICAgICAgICBuZXh0ICs9IHRoaXMuX2lucHV0LnN1YnN0cigwLCAyMC1uZXh0Lmxlbmd0aCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIChuZXh0LnN1YnN0cigwLDIwKSsobmV4dC5sZW5ndGggPiAyMCA/ICcuLi4nOicnKSkucmVwbGFjZSgvXFxuL2csIFwiXCIpO1xuICAgIH0sXG5zaG93UG9zaXRpb246ZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgcHJlID0gdGhpcy5wYXN0SW5wdXQoKTtcbiAgICAgICAgdmFyIGMgPSBuZXcgQXJyYXkocHJlLmxlbmd0aCArIDEpLmpvaW4oXCItXCIpO1xuICAgICAgICByZXR1cm4gcHJlICsgdGhpcy51cGNvbWluZ0lucHV0KCkgKyBcIlxcblwiICsgYytcIl5cIjtcbiAgICB9LFxubmV4dDpmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLmRvbmUpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLkVPRjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMuX2lucHV0KSB0aGlzLmRvbmUgPSB0cnVlO1xuXG4gICAgICAgIHZhciB0b2tlbixcbiAgICAgICAgICAgIG1hdGNoLFxuICAgICAgICAgICAgdGVtcE1hdGNoLFxuICAgICAgICAgICAgaW5kZXgsXG4gICAgICAgICAgICBjb2wsXG4gICAgICAgICAgICBsaW5lcztcbiAgICAgICAgaWYgKCF0aGlzLl9tb3JlKSB7XG4gICAgICAgICAgICB0aGlzLnl5dGV4dCA9ICcnO1xuICAgICAgICAgICAgdGhpcy5tYXRjaCA9ICcnO1xuICAgICAgICB9XG4gICAgICAgIHZhciBydWxlcyA9IHRoaXMuX2N1cnJlbnRSdWxlcygpO1xuICAgICAgICBmb3IgKHZhciBpPTA7aSA8IHJ1bGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB0ZW1wTWF0Y2ggPSB0aGlzLl9pbnB1dC5tYXRjaCh0aGlzLnJ1bGVzW3J1bGVzW2ldXSk7XG4gICAgICAgICAgICBpZiAodGVtcE1hdGNoICYmICghbWF0Y2ggfHwgdGVtcE1hdGNoWzBdLmxlbmd0aCA+IG1hdGNoWzBdLmxlbmd0aCkpIHtcbiAgICAgICAgICAgICAgICBtYXRjaCA9IHRlbXBNYXRjaDtcbiAgICAgICAgICAgICAgICBpbmRleCA9IGk7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLm9wdGlvbnMuZmxleCkgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgICAgICBsaW5lcyA9IG1hdGNoWzBdLm1hdGNoKC8oPzpcXHJcXG4/fFxcbikuKi9nKTtcbiAgICAgICAgICAgIGlmIChsaW5lcykgdGhpcy55eWxpbmVubyArPSBsaW5lcy5sZW5ndGg7XG4gICAgICAgICAgICB0aGlzLnl5bGxvYyA9IHtmaXJzdF9saW5lOiB0aGlzLnl5bGxvYy5sYXN0X2xpbmUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBsYXN0X2xpbmU6IHRoaXMueXlsaW5lbm8rMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpcnN0X2NvbHVtbjogdGhpcy55eWxsb2MubGFzdF9jb2x1bW4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBsYXN0X2NvbHVtbjogbGluZXMgPyBsaW5lc1tsaW5lcy5sZW5ndGgtMV0ubGVuZ3RoLWxpbmVzW2xpbmVzLmxlbmd0aC0xXS5tYXRjaCgvXFxyP1xcbj8vKVswXS5sZW5ndGggOiB0aGlzLnl5bGxvYy5sYXN0X2NvbHVtbiArIG1hdGNoWzBdLmxlbmd0aH07XG4gICAgICAgICAgICB0aGlzLnl5dGV4dCArPSBtYXRjaFswXTtcbiAgICAgICAgICAgIHRoaXMubWF0Y2ggKz0gbWF0Y2hbMF07XG4gICAgICAgICAgICB0aGlzLm1hdGNoZXMgPSBtYXRjaDtcbiAgICAgICAgICAgIHRoaXMueXlsZW5nID0gdGhpcy55eXRleHQubGVuZ3RoO1xuICAgICAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5yYW5nZXMpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnl5bGxvYy5yYW5nZSA9IFt0aGlzLm9mZnNldCwgdGhpcy5vZmZzZXQgKz0gdGhpcy55eWxlbmddO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fbW9yZSA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5faW5wdXQgPSB0aGlzLl9pbnB1dC5zbGljZShtYXRjaFswXS5sZW5ndGgpO1xuICAgICAgICAgICAgdGhpcy5tYXRjaGVkICs9IG1hdGNoWzBdO1xuICAgICAgICAgICAgdG9rZW4gPSB0aGlzLnBlcmZvcm1BY3Rpb24uY2FsbCh0aGlzLCB0aGlzLnl5LCB0aGlzLCBydWxlc1tpbmRleF0sdGhpcy5jb25kaXRpb25TdGFja1t0aGlzLmNvbmRpdGlvblN0YWNrLmxlbmd0aC0xXSk7XG4gICAgICAgICAgICBpZiAodGhpcy5kb25lICYmIHRoaXMuX2lucHV0KSB0aGlzLmRvbmUgPSBmYWxzZTtcbiAgICAgICAgICAgIGlmICh0b2tlbikgcmV0dXJuIHRva2VuO1xuICAgICAgICAgICAgZWxzZSByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuX2lucHV0ID09PSBcIlwiKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5FT0Y7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJzZUVycm9yKCdMZXhpY2FsIGVycm9yIG9uIGxpbmUgJysodGhpcy55eWxpbmVubysxKSsnLiBVbnJlY29nbml6ZWQgdGV4dC5cXG4nK3RoaXMuc2hvd1Bvc2l0aW9uKCksXG4gICAgICAgICAgICAgICAgICAgIHt0ZXh0OiBcIlwiLCB0b2tlbjogbnVsbCwgbGluZTogdGhpcy55eWxpbmVub30pO1xuICAgICAgICB9XG4gICAgfSxcbmxleDpmdW5jdGlvbiBsZXgoKSB7XG4gICAgICAgIHZhciByID0gdGhpcy5uZXh0KCk7XG4gICAgICAgIGlmICh0eXBlb2YgciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHJldHVybiByO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubGV4KCk7XG4gICAgICAgIH1cbiAgICB9LFxuYmVnaW46ZnVuY3Rpb24gYmVnaW4oY29uZGl0aW9uKSB7XG4gICAgICAgIHRoaXMuY29uZGl0aW9uU3RhY2sucHVzaChjb25kaXRpb24pO1xuICAgIH0sXG5wb3BTdGF0ZTpmdW5jdGlvbiBwb3BTdGF0ZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29uZGl0aW9uU3RhY2sucG9wKCk7XG4gICAgfSxcbl9jdXJyZW50UnVsZXM6ZnVuY3Rpb24gX2N1cnJlbnRSdWxlcygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29uZGl0aW9uc1t0aGlzLmNvbmRpdGlvblN0YWNrW3RoaXMuY29uZGl0aW9uU3RhY2subGVuZ3RoLTFdXS5ydWxlcztcbiAgICB9LFxudG9wU3RhdGU6ZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jb25kaXRpb25TdGFja1t0aGlzLmNvbmRpdGlvblN0YWNrLmxlbmd0aC0yXTtcbiAgICB9LFxucHVzaFN0YXRlOmZ1bmN0aW9uIGJlZ2luKGNvbmRpdGlvbikge1xuICAgICAgICB0aGlzLmJlZ2luKGNvbmRpdGlvbik7XG4gICAgfX0pO1xubGV4ZXIub3B0aW9ucyA9IHt9O1xubGV4ZXIucGVyZm9ybUFjdGlvbiA9IGZ1bmN0aW9uIGFub255bW91cyh5eSx5eV8sJGF2b2lkaW5nX25hbWVfY29sbGlzaW9ucyxZWV9TVEFSVCkge1xuXG5cbmZ1bmN0aW9uIHN0cmlwKHN0YXJ0LCBlbmQpIHtcbiAgcmV0dXJuIHl5Xy55eXRleHQgPSB5eV8ueXl0ZXh0LnN1YnN0cihzdGFydCwgeXlfLnl5bGVuZy1lbmQpO1xufVxuXG5cbnZhciBZWVNUQVRFPVlZX1NUQVJUXG5zd2l0Y2goJGF2b2lkaW5nX25hbWVfY29sbGlzaW9ucykge1xuY2FzZSAwOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZih5eV8ueXl0ZXh0LnNsaWNlKC0yKSA9PT0gXCJcXFxcXFxcXFwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyaXAoMCwxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJlZ2luKFwibXVcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZih5eV8ueXl0ZXh0LnNsaWNlKC0xKSA9PT0gXCJcXFxcXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHJpcCgwLDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYmVnaW4oXCJlbXVcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5iZWdpbihcIm11XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKHl5Xy55eXRleHQpIHJldHVybiAxNDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuYnJlYWs7XG5jYXNlIDE6cmV0dXJuIDE0O1xuYnJlYWs7XG5jYXNlIDI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucG9wU3RhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDE0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG5icmVhaztcbmNhc2UgMzpzdHJpcCgwLDQpOyB0aGlzLnBvcFN0YXRlKCk7IHJldHVybiAxNTtcbmJyZWFrO1xuY2FzZSA0OnJldHVybiAzNTtcbmJyZWFrO1xuY2FzZSA1OnJldHVybiAzNjtcbmJyZWFrO1xuY2FzZSA2OnJldHVybiAyNTtcbmJyZWFrO1xuY2FzZSA3OnJldHVybiAxNjtcbmJyZWFrO1xuY2FzZSA4OnJldHVybiAyMDtcbmJyZWFrO1xuY2FzZSA5OnJldHVybiAxOTtcbmJyZWFrO1xuY2FzZSAxMDpyZXR1cm4gMTk7XG5icmVhaztcbmNhc2UgMTE6cmV0dXJuIDIzO1xuYnJlYWs7XG5jYXNlIDEyOnJldHVybiAyMjtcbmJyZWFrO1xuY2FzZSAxMzp0aGlzLnBvcFN0YXRlKCk7IHRoaXMuYmVnaW4oJ2NvbScpO1xuYnJlYWs7XG5jYXNlIDE0OnN0cmlwKDMsNSk7IHRoaXMucG9wU3RhdGUoKTsgcmV0dXJuIDE1O1xuYnJlYWs7XG5jYXNlIDE1OnJldHVybiAyMjtcbmJyZWFrO1xuY2FzZSAxNjpyZXR1cm4gNDE7XG5icmVhaztcbmNhc2UgMTc6cmV0dXJuIDQwO1xuYnJlYWs7XG5jYXNlIDE4OnJldHVybiA0MDtcbmJyZWFrO1xuY2FzZSAxOTpyZXR1cm4gNDQ7XG5icmVhaztcbmNhc2UgMjA6Ly8gaWdub3JlIHdoaXRlc3BhY2VcbmJyZWFrO1xuY2FzZSAyMTp0aGlzLnBvcFN0YXRlKCk7IHJldHVybiAyNDtcbmJyZWFrO1xuY2FzZSAyMjp0aGlzLnBvcFN0YXRlKCk7IHJldHVybiAxODtcbmJyZWFrO1xuY2FzZSAyMzp5eV8ueXl0ZXh0ID0gc3RyaXAoMSwyKS5yZXBsYWNlKC9cXFxcXCIvZywnXCInKTsgcmV0dXJuIDMyO1xuYnJlYWs7XG5jYXNlIDI0Onl5Xy55eXRleHQgPSBzdHJpcCgxLDIpLnJlcGxhY2UoL1xcXFwnL2csXCInXCIpOyByZXR1cm4gMzI7XG5icmVhaztcbmNhc2UgMjU6cmV0dXJuIDQyO1xuYnJlYWs7XG5jYXNlIDI2OnJldHVybiAzNDtcbmJyZWFrO1xuY2FzZSAyNzpyZXR1cm4gMzQ7XG5icmVhaztcbmNhc2UgMjg6cmV0dXJuIDMzO1xuYnJlYWs7XG5jYXNlIDI5OnJldHVybiA0MDtcbmJyZWFrO1xuY2FzZSAzMDp5eV8ueXl0ZXh0ID0gc3RyaXAoMSwyKTsgcmV0dXJuIDQwO1xuYnJlYWs7XG5jYXNlIDMxOnJldHVybiAnSU5WQUxJRCc7XG5icmVhaztcbmNhc2UgMzI6cmV0dXJuIDU7XG5icmVhaztcbn1cbn07XG5sZXhlci5ydWxlcyA9IFsvXig/OlteXFx4MDBdKj8oPz0oXFx7XFx7KSkpLywvXig/OlteXFx4MDBdKykvLC9eKD86W15cXHgwMF17Mix9Pyg/PShcXHtcXHt8XFxcXFxce1xce3xcXFxcXFxcXFxce1xce3wkKSkpLywvXig/OltcXHNcXFNdKj8tLVxcfVxcfSkvLC9eKD86XFwoKS8sL14oPzpcXCkpLywvXig/Olxce1xceyh+KT8+KS8sL14oPzpcXHtcXHsofik/IykvLC9eKD86XFx7XFx7KH4pP1xcLykvLC9eKD86XFx7XFx7KH4pP1xcXikvLC9eKD86XFx7XFx7KH4pP1xccyplbHNlXFxiKS8sL14oPzpcXHtcXHsofik/XFx7KS8sL14oPzpcXHtcXHsofik/JikvLC9eKD86XFx7XFx7IS0tKS8sL14oPzpcXHtcXHshW1xcc1xcU10qP1xcfVxcfSkvLC9eKD86XFx7XFx7KH4pPykvLC9eKD86PSkvLC9eKD86XFwuXFwuKS8sL14oPzpcXC4oPz0oWz1+fVxcc1xcLy4pXSkpKS8sL14oPzpbXFwvLl0pLywvXig/OlxccyspLywvXig/OlxcfSh+KT9cXH1cXH0pLywvXig/Oih+KT9cXH1cXH0pLywvXig/OlwiKFxcXFxbXCJdfFteXCJdKSpcIikvLC9eKD86JyhcXFxcWyddfFteJ10pKicpLywvXig/OkApLywvXig/OnRydWUoPz0oW359XFxzKV0pKSkvLC9eKD86ZmFsc2UoPz0oW359XFxzKV0pKSkvLC9eKD86LT9bMC05XSsoPz0oW359XFxzKV0pKSkvLC9eKD86KFteXFxzIVwiIyUtLFxcLlxcLzstPkBcXFstXFxeYFxcey1+XSsoPz0oWz1+fVxcc1xcLy4pXSkpKSkvLC9eKD86XFxbW15cXF1dKlxcXSkvLC9eKD86LikvLC9eKD86JCkvXTtcbmxleGVyLmNvbmRpdGlvbnMgPSB7XCJtdVwiOntcInJ1bGVzXCI6WzQsNSw2LDcsOCw5LDEwLDExLDEyLDEzLDE0LDE1LDE2LDE3LDE4LDE5LDIwLDIxLDIyLDIzLDI0LDI1LDI2LDI3LDI4LDI5LDMwLDMxLDMyXSxcImluY2x1c2l2ZVwiOmZhbHNlfSxcImVtdVwiOntcInJ1bGVzXCI6WzJdLFwiaW5jbHVzaXZlXCI6ZmFsc2V9LFwiY29tXCI6e1wicnVsZXNcIjpbM10sXCJpbmNsdXNpdmVcIjpmYWxzZX0sXCJJTklUSUFMXCI6e1wicnVsZXNcIjpbMCwxLDMyXSxcImluY2x1c2l2ZVwiOnRydWV9fTtcbnJldHVybiBsZXhlcjt9KSgpXG5wYXJzZXIubGV4ZXIgPSBsZXhlcjtcbmZ1bmN0aW9uIFBhcnNlciAoKSB7IHRoaXMueXkgPSB7fTsgfVBhcnNlci5wcm90b3R5cGUgPSBwYXJzZXI7cGFyc2VyLlBhcnNlciA9IFBhcnNlcjtcbnJldHVybiBuZXcgUGFyc2VyO1xufSkoKTtleHBvcnRzW1wiZGVmYXVsdFwiXSA9IGhhbmRsZWJhcnM7XG4vKiBqc2hpbnQgaWdub3JlOmVuZCAqLyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgZXJyb3JQcm9wcyA9IFsnZGVzY3JpcHRpb24nLCAnZmlsZU5hbWUnLCAnbGluZU51bWJlcicsICdtZXNzYWdlJywgJ25hbWUnLCAnbnVtYmVyJywgJ3N0YWNrJ107XG5cbmZ1bmN0aW9uIEV4Y2VwdGlvbihtZXNzYWdlLCBub2RlKSB7XG4gIHZhciBsaW5lO1xuICBpZiAobm9kZSAmJiBub2RlLmZpcnN0TGluZSkge1xuICAgIGxpbmUgPSBub2RlLmZpcnN0TGluZTtcblxuICAgIG1lc3NhZ2UgKz0gJyAtICcgKyBsaW5lICsgJzonICsgbm9kZS5maXJzdENvbHVtbjtcbiAgfVxuXG4gIHZhciB0bXAgPSBFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IuY2FsbCh0aGlzLCBtZXNzYWdlKTtcblxuICAvLyBVbmZvcnR1bmF0ZWx5IGVycm9ycyBhcmUgbm90IGVudW1lcmFibGUgaW4gQ2hyb21lIChhdCBsZWFzdCksIHNvIGBmb3IgcHJvcCBpbiB0bXBgIGRvZXNuJ3Qgd29yay5cbiAgZm9yICh2YXIgaWR4ID0gMDsgaWR4IDwgZXJyb3JQcm9wcy5sZW5ndGg7IGlkeCsrKSB7XG4gICAgdGhpc1tlcnJvclByb3BzW2lkeF1dID0gdG1wW2Vycm9yUHJvcHNbaWR4XV07XG4gIH1cblxuICBpZiAobGluZSkge1xuICAgIHRoaXMubGluZU51bWJlciA9IGxpbmU7XG4gICAgdGhpcy5jb2x1bW4gPSBub2RlLmZpcnN0Q29sdW1uO1xuICB9XG59XG5cbkV4Y2VwdGlvbi5wcm90b3R5cGUgPSBuZXcgRXJyb3IoKTtcblxuZXhwb3J0c1tcImRlZmF1bHRcIl0gPSBFeGNlcHRpb247IiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgVXRpbHMgPSByZXF1aXJlKFwiLi91dGlsc1wiKTtcbnZhciBFeGNlcHRpb24gPSByZXF1aXJlKFwiLi9leGNlcHRpb25cIilbXCJkZWZhdWx0XCJdO1xudmFyIENPTVBJTEVSX1JFVklTSU9OID0gcmVxdWlyZShcIi4vYmFzZVwiKS5DT01QSUxFUl9SRVZJU0lPTjtcbnZhciBSRVZJU0lPTl9DSEFOR0VTID0gcmVxdWlyZShcIi4vYmFzZVwiKS5SRVZJU0lPTl9DSEFOR0VTO1xuXG5mdW5jdGlvbiBjaGVja1JldmlzaW9uKGNvbXBpbGVySW5mbykge1xuICB2YXIgY29tcGlsZXJSZXZpc2lvbiA9IGNvbXBpbGVySW5mbyAmJiBjb21waWxlckluZm9bMF0gfHwgMSxcbiAgICAgIGN1cnJlbnRSZXZpc2lvbiA9IENPTVBJTEVSX1JFVklTSU9OO1xuXG4gIGlmIChjb21waWxlclJldmlzaW9uICE9PSBjdXJyZW50UmV2aXNpb24pIHtcbiAgICBpZiAoY29tcGlsZXJSZXZpc2lvbiA8IGN1cnJlbnRSZXZpc2lvbikge1xuICAgICAgdmFyIHJ1bnRpbWVWZXJzaW9ucyA9IFJFVklTSU9OX0NIQU5HRVNbY3VycmVudFJldmlzaW9uXSxcbiAgICAgICAgICBjb21waWxlclZlcnNpb25zID0gUkVWSVNJT05fQ0hBTkdFU1tjb21waWxlclJldmlzaW9uXTtcbiAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oXCJUZW1wbGF0ZSB3YXMgcHJlY29tcGlsZWQgd2l0aCBhbiBvbGRlciB2ZXJzaW9uIG9mIEhhbmRsZWJhcnMgdGhhbiB0aGUgY3VycmVudCBydW50aW1lLiBcIitcbiAgICAgICAgICAgIFwiUGxlYXNlIHVwZGF0ZSB5b3VyIHByZWNvbXBpbGVyIHRvIGEgbmV3ZXIgdmVyc2lvbiAoXCIrcnVudGltZVZlcnNpb25zK1wiKSBvciBkb3duZ3JhZGUgeW91ciBydW50aW1lIHRvIGFuIG9sZGVyIHZlcnNpb24gKFwiK2NvbXBpbGVyVmVyc2lvbnMrXCIpLlwiKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVXNlIHRoZSBlbWJlZGRlZCB2ZXJzaW9uIGluZm8gc2luY2UgdGhlIHJ1bnRpbWUgZG9lc24ndCBrbm93IGFib3V0IHRoaXMgcmV2aXNpb24geWV0XG4gICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKFwiVGVtcGxhdGUgd2FzIHByZWNvbXBpbGVkIHdpdGggYSBuZXdlciB2ZXJzaW9uIG9mIEhhbmRsZWJhcnMgdGhhbiB0aGUgY3VycmVudCBydW50aW1lLiBcIitcbiAgICAgICAgICAgIFwiUGxlYXNlIHVwZGF0ZSB5b3VyIHJ1bnRpbWUgdG8gYSBuZXdlciB2ZXJzaW9uIChcIitjb21waWxlckluZm9bMV0rXCIpLlwiKTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0cy5jaGVja1JldmlzaW9uID0gY2hlY2tSZXZpc2lvbjsvLyBUT0RPOiBSZW1vdmUgdGhpcyBsaW5lIGFuZCBicmVhayB1cCBjb21waWxlUGFydGlhbFxuXG5mdW5jdGlvbiB0ZW1wbGF0ZSh0ZW1wbGF0ZVNwZWMsIGVudikge1xuICBpZiAoIWVudikge1xuICAgIHRocm93IG5ldyBFeGNlcHRpb24oXCJObyBlbnZpcm9ubWVudCBwYXNzZWQgdG8gdGVtcGxhdGVcIik7XG4gIH1cblxuICAvLyBOb3RlOiBVc2luZyBlbnYuVk0gcmVmZXJlbmNlcyByYXRoZXIgdGhhbiBsb2NhbCB2YXIgcmVmZXJlbmNlcyB0aHJvdWdob3V0IHRoaXMgc2VjdGlvbiB0byBhbGxvd1xuICAvLyBmb3IgZXh0ZXJuYWwgdXNlcnMgdG8gb3ZlcnJpZGUgdGhlc2UgYXMgcHN1ZWRvLXN1cHBvcnRlZCBBUElzLlxuICB2YXIgaW52b2tlUGFydGlhbFdyYXBwZXIgPSBmdW5jdGlvbihwYXJ0aWFsLCBuYW1lLCBjb250ZXh0LCBoZWxwZXJzLCBwYXJ0aWFscywgZGF0YSkge1xuICAgIHZhciByZXN1bHQgPSBlbnYuVk0uaW52b2tlUGFydGlhbC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIGlmIChyZXN1bHQgIT0gbnVsbCkgeyByZXR1cm4gcmVzdWx0OyB9XG5cbiAgICBpZiAoZW52LmNvbXBpbGUpIHtcbiAgICAgIHZhciBvcHRpb25zID0geyBoZWxwZXJzOiBoZWxwZXJzLCBwYXJ0aWFsczogcGFydGlhbHMsIGRhdGE6IGRhdGEgfTtcbiAgICAgIHBhcnRpYWxzW25hbWVdID0gZW52LmNvbXBpbGUocGFydGlhbCwgeyBkYXRhOiBkYXRhICE9PSB1bmRlZmluZWQgfSwgZW52KTtcbiAgICAgIHJldHVybiBwYXJ0aWFsc1tuYW1lXShjb250ZXh0LCBvcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcIlRoZSBwYXJ0aWFsIFwiICsgbmFtZSArIFwiIGNvdWxkIG5vdCBiZSBjb21waWxlZCB3aGVuIHJ1bm5pbmcgaW4gcnVudGltZS1vbmx5IG1vZGVcIik7XG4gICAgfVxuICB9O1xuXG4gIC8vIEp1c3QgYWRkIHdhdGVyXG4gIHZhciBjb250YWluZXIgPSB7XG4gICAgZXNjYXBlRXhwcmVzc2lvbjogVXRpbHMuZXNjYXBlRXhwcmVzc2lvbixcbiAgICBpbnZva2VQYXJ0aWFsOiBpbnZva2VQYXJ0aWFsV3JhcHBlcixcbiAgICBwcm9ncmFtczogW10sXG4gICAgcHJvZ3JhbTogZnVuY3Rpb24oaSwgZm4sIGRhdGEpIHtcbiAgICAgIHZhciBwcm9ncmFtV3JhcHBlciA9IHRoaXMucHJvZ3JhbXNbaV07XG4gICAgICBpZihkYXRhKSB7XG4gICAgICAgIHByb2dyYW1XcmFwcGVyID0gcHJvZ3JhbShpLCBmbiwgZGF0YSk7XG4gICAgICB9IGVsc2UgaWYgKCFwcm9ncmFtV3JhcHBlcikge1xuICAgICAgICBwcm9ncmFtV3JhcHBlciA9IHRoaXMucHJvZ3JhbXNbaV0gPSBwcm9ncmFtKGksIGZuKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwcm9ncmFtV3JhcHBlcjtcbiAgICB9LFxuICAgIG1lcmdlOiBmdW5jdGlvbihwYXJhbSwgY29tbW9uKSB7XG4gICAgICB2YXIgcmV0ID0gcGFyYW0gfHwgY29tbW9uO1xuXG4gICAgICBpZiAocGFyYW0gJiYgY29tbW9uICYmIChwYXJhbSAhPT0gY29tbW9uKSkge1xuICAgICAgICByZXQgPSB7fTtcbiAgICAgICAgVXRpbHMuZXh0ZW5kKHJldCwgY29tbW9uKTtcbiAgICAgICAgVXRpbHMuZXh0ZW5kKHJldCwgcGFyYW0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJldDtcbiAgICB9LFxuICAgIHByb2dyYW1XaXRoRGVwdGg6IGVudi5WTS5wcm9ncmFtV2l0aERlcHRoLFxuICAgIG5vb3A6IGVudi5WTS5ub29wLFxuICAgIGNvbXBpbGVySW5mbzogbnVsbFxuICB9O1xuXG4gIHJldHVybiBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgdmFyIG5hbWVzcGFjZSA9IG9wdGlvbnMucGFydGlhbCA/IG9wdGlvbnMgOiBlbnYsXG4gICAgICAgIGhlbHBlcnMsXG4gICAgICAgIHBhcnRpYWxzO1xuXG4gICAgaWYgKCFvcHRpb25zLnBhcnRpYWwpIHtcbiAgICAgIGhlbHBlcnMgPSBvcHRpb25zLmhlbHBlcnM7XG4gICAgICBwYXJ0aWFscyA9IG9wdGlvbnMucGFydGlhbHM7XG4gICAgfVxuICAgIHZhciByZXN1bHQgPSB0ZW1wbGF0ZVNwZWMuY2FsbChcbiAgICAgICAgICBjb250YWluZXIsXG4gICAgICAgICAgbmFtZXNwYWNlLCBjb250ZXh0LFxuICAgICAgICAgIGhlbHBlcnMsXG4gICAgICAgICAgcGFydGlhbHMsXG4gICAgICAgICAgb3B0aW9ucy5kYXRhKTtcblxuICAgIGlmICghb3B0aW9ucy5wYXJ0aWFsKSB7XG4gICAgICBlbnYuVk0uY2hlY2tSZXZpc2lvbihjb250YWluZXIuY29tcGlsZXJJbmZvKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xufVxuXG5leHBvcnRzLnRlbXBsYXRlID0gdGVtcGxhdGU7ZnVuY3Rpb24gcHJvZ3JhbVdpdGhEZXB0aChpLCBmbiwgZGF0YSAvKiwgJGRlcHRoICovKSB7XG4gIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAzKTtcblxuICB2YXIgcHJvZyA9IGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBbY29udGV4dCwgb3B0aW9ucy5kYXRhIHx8IGRhdGFdLmNvbmNhdChhcmdzKSk7XG4gIH07XG4gIHByb2cucHJvZ3JhbSA9IGk7XG4gIHByb2cuZGVwdGggPSBhcmdzLmxlbmd0aDtcbiAgcmV0dXJuIHByb2c7XG59XG5cbmV4cG9ydHMucHJvZ3JhbVdpdGhEZXB0aCA9IHByb2dyYW1XaXRoRGVwdGg7ZnVuY3Rpb24gcHJvZ3JhbShpLCBmbiwgZGF0YSkge1xuICB2YXIgcHJvZyA9IGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgIHJldHVybiBmbihjb250ZXh0LCBvcHRpb25zLmRhdGEgfHwgZGF0YSk7XG4gIH07XG4gIHByb2cucHJvZ3JhbSA9IGk7XG4gIHByb2cuZGVwdGggPSAwO1xuICByZXR1cm4gcHJvZztcbn1cblxuZXhwb3J0cy5wcm9ncmFtID0gcHJvZ3JhbTtmdW5jdGlvbiBpbnZva2VQYXJ0aWFsKHBhcnRpYWwsIG5hbWUsIGNvbnRleHQsIGhlbHBlcnMsIHBhcnRpYWxzLCBkYXRhKSB7XG4gIHZhciBvcHRpb25zID0geyBwYXJ0aWFsOiB0cnVlLCBoZWxwZXJzOiBoZWxwZXJzLCBwYXJ0aWFsczogcGFydGlhbHMsIGRhdGE6IGRhdGEgfTtcblxuICBpZihwYXJ0aWFsID09PSB1bmRlZmluZWQpIHtcbiAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKFwiVGhlIHBhcnRpYWwgXCIgKyBuYW1lICsgXCIgY291bGQgbm90IGJlIGZvdW5kXCIpO1xuICB9IGVsc2UgaWYocGFydGlhbCBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgcmV0dXJuIHBhcnRpYWwoY29udGV4dCwgb3B0aW9ucyk7XG4gIH1cbn1cblxuZXhwb3J0cy5pbnZva2VQYXJ0aWFsID0gaW52b2tlUGFydGlhbDtmdW5jdGlvbiBub29wKCkgeyByZXR1cm4gXCJcIjsgfVxuXG5leHBvcnRzLm5vb3AgPSBub29wOyIsIlwidXNlIHN0cmljdFwiO1xuLy8gQnVpbGQgb3V0IG91ciBiYXNpYyBTYWZlU3RyaW5nIHR5cGVcbmZ1bmN0aW9uIFNhZmVTdHJpbmcoc3RyaW5nKSB7XG4gIHRoaXMuc3RyaW5nID0gc3RyaW5nO1xufVxuXG5TYWZlU3RyaW5nLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gXCJcIiArIHRoaXMuc3RyaW5nO1xufTtcblxuZXhwb3J0c1tcImRlZmF1bHRcIl0gPSBTYWZlU3RyaW5nOyIsIlwidXNlIHN0cmljdFwiO1xuLypqc2hpbnQgLVcwMDQgKi9cbnZhciBTYWZlU3RyaW5nID0gcmVxdWlyZShcIi4vc2FmZS1zdHJpbmdcIilbXCJkZWZhdWx0XCJdO1xuXG52YXIgZXNjYXBlID0ge1xuICBcIiZcIjogXCImYW1wO1wiLFxuICBcIjxcIjogXCImbHQ7XCIsXG4gIFwiPlwiOiBcIiZndDtcIixcbiAgJ1wiJzogXCImcXVvdDtcIixcbiAgXCInXCI6IFwiJiN4Mjc7XCIsXG4gIFwiYFwiOiBcIiYjeDYwO1wiXG59O1xuXG52YXIgYmFkQ2hhcnMgPSAvWyY8PlwiJ2BdL2c7XG52YXIgcG9zc2libGUgPSAvWyY8PlwiJ2BdLztcblxuZnVuY3Rpb24gZXNjYXBlQ2hhcihjaHIpIHtcbiAgcmV0dXJuIGVzY2FwZVtjaHJdIHx8IFwiJmFtcDtcIjtcbn1cblxuZnVuY3Rpb24gZXh0ZW5kKG9iaiwgdmFsdWUpIHtcbiAgZm9yKHZhciBrZXkgaW4gdmFsdWUpIHtcbiAgICBpZihPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwodmFsdWUsIGtleSkpIHtcbiAgICAgIG9ialtrZXldID0gdmFsdWVba2V5XTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0cy5leHRlbmQgPSBleHRlbmQ7dmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcbmV4cG9ydHMudG9TdHJpbmcgPSB0b1N0cmluZztcbi8vIFNvdXJjZWQgZnJvbSBsb2Rhc2hcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9iZXN0aWVqcy9sb2Rhc2gvYmxvYi9tYXN0ZXIvTElDRU5TRS50eHRcbnZhciBpc0Z1bmN0aW9uID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJztcbn07XG4vLyBmYWxsYmFjayBmb3Igb2xkZXIgdmVyc2lvbnMgb2YgQ2hyb21lIGFuZCBTYWZhcmlcbmlmIChpc0Z1bmN0aW9uKC94LykpIHtcbiAgaXNGdW5jdGlvbiA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJyAmJiB0b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJztcbiAgfTtcbn1cbnZhciBpc0Z1bmN0aW9uO1xuZXhwb3J0cy5pc0Z1bmN0aW9uID0gaXNGdW5jdGlvbjtcbnZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpID8gdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09ICdbb2JqZWN0IEFycmF5XScgOiBmYWxzZTtcbn07XG5leHBvcnRzLmlzQXJyYXkgPSBpc0FycmF5O1xuXG5mdW5jdGlvbiBlc2NhcGVFeHByZXNzaW9uKHN0cmluZykge1xuICAvLyBkb24ndCBlc2NhcGUgU2FmZVN0cmluZ3MsIHNpbmNlIHRoZXkncmUgYWxyZWFkeSBzYWZlXG4gIGlmIChzdHJpbmcgaW5zdGFuY2VvZiBTYWZlU3RyaW5nKSB7XG4gICAgcmV0dXJuIHN0cmluZy50b1N0cmluZygpO1xuICB9IGVsc2UgaWYgKCFzdHJpbmcgJiYgc3RyaW5nICE9PSAwKSB7XG4gICAgcmV0dXJuIFwiXCI7XG4gIH1cblxuICAvLyBGb3JjZSBhIHN0cmluZyBjb252ZXJzaW9uIGFzIHRoaXMgd2lsbCBiZSBkb25lIGJ5IHRoZSBhcHBlbmQgcmVnYXJkbGVzcyBhbmRcbiAgLy8gdGhlIHJlZ2V4IHRlc3Qgd2lsbCBkbyB0aGlzIHRyYW5zcGFyZW50bHkgYmVoaW5kIHRoZSBzY2VuZXMsIGNhdXNpbmcgaXNzdWVzIGlmXG4gIC8vIGFuIG9iamVjdCdzIHRvIHN0cmluZyBoYXMgZXNjYXBlZCBjaGFyYWN0ZXJzIGluIGl0LlxuICBzdHJpbmcgPSBcIlwiICsgc3RyaW5nO1xuXG4gIGlmKCFwb3NzaWJsZS50ZXN0KHN0cmluZykpIHsgcmV0dXJuIHN0cmluZzsgfVxuICByZXR1cm4gc3RyaW5nLnJlcGxhY2UoYmFkQ2hhcnMsIGVzY2FwZUNoYXIpO1xufVxuXG5leHBvcnRzLmVzY2FwZUV4cHJlc3Npb24gPSBlc2NhcGVFeHByZXNzaW9uO2Z1bmN0aW9uIGlzRW1wdHkodmFsdWUpIHtcbiAgaWYgKCF2YWx1ZSAmJiB2YWx1ZSAhPT0gMCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2UgaWYgKGlzQXJyYXkodmFsdWUpICYmIHZhbHVlLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG5leHBvcnRzLmlzRW1wdHkgPSBpc0VtcHR5OyIsInZhciBUb2tlbml6ZXIgPSByZXF1aXJlKFwiLi9Ub2tlbml6ZXIuanNcIik7XG5cbi8qXG5cdE9wdGlvbnM6XG5cblx0eG1sTW9kZTogU3BlY2lhbCBiZWhhdmlvciBmb3Igc2NyaXB0L3N0eWxlIHRhZ3MgKHRydWUgYnkgZGVmYXVsdClcblx0bG93ZXJDYXNlQXR0cmlidXRlTmFtZXM6IGNhbGwgLnRvTG93ZXJDYXNlIGZvciBlYWNoIGF0dHJpYnV0ZSBuYW1lICh0cnVlIGlmIHhtbE1vZGUgaXMgYGZhbHNlYClcblx0bG93ZXJDYXNlVGFnczogY2FsbCAudG9Mb3dlckNhc2UgZm9yIGVhY2ggdGFnIG5hbWUgKHRydWUgaWYgeG1sTW9kZSBpcyBgZmFsc2VgKVxuKi9cblxuLypcblx0Q2FsbGJhY2tzOlxuXG5cdG9uY2RhdGFlbmQsXG5cdG9uY2RhdGFzdGFydCxcblx0b25jbG9zZXRhZyxcblx0b25jb21tZW50LFxuXHRvbmNvbW1lbnRlbmQsXG5cdG9uZXJyb3IsXG5cdG9ub3BlbnRhZyxcblx0b25wcm9jZXNzaW5naW5zdHJ1Y3Rpb24sXG5cdG9ucmVzZXQsXG5cdG9udGV4dFxuKi9cblxudmFyIGZvcm1UYWdzID0ge1xuXHRpbnB1dDogdHJ1ZSxcblx0b3B0aW9uOiB0cnVlLFxuXHRvcHRncm91cDogdHJ1ZSxcblx0c2VsZWN0OiB0cnVlLFxuXHRidXR0b246IHRydWUsXG5cdGRhdGFsaXN0OiB0cnVlLFxuXHR0ZXh0YXJlYTogdHJ1ZVxufTtcblxudmFyIG9wZW5JbXBsaWVzQ2xvc2UgPSB7XG5cdHRyICAgICAgOiB7IHRyOnRydWUsIHRoOnRydWUsIHRkOnRydWUgfSxcblx0dGggICAgICA6IHsgdGg6dHJ1ZSB9LFxuXHR0ZCAgICAgIDogeyB0aGVhZDp0cnVlLCB0ZDp0cnVlIH0sXG5cdGJvZHkgICAgOiB7IGhlYWQ6dHJ1ZSwgbGluazp0cnVlLCBzY3JpcHQ6dHJ1ZSB9LFxuXHRsaSAgICAgIDogeyBsaTp0cnVlIH0sXG5cdHAgICAgICAgOiB7IHA6dHJ1ZSB9LFxuXHRzZWxlY3QgIDogZm9ybVRhZ3MsXG5cdGlucHV0ICAgOiBmb3JtVGFncyxcblx0b3V0cHV0ICA6IGZvcm1UYWdzLFxuXHRidXR0b24gIDogZm9ybVRhZ3MsXG5cdGRhdGFsaXN0OiBmb3JtVGFncyxcblx0dGV4dGFyZWE6IGZvcm1UYWdzLFxuXHRvcHRpb24gIDogeyBvcHRpb246dHJ1ZSB9LFxuXHRvcHRncm91cDogeyBvcHRncm91cDp0cnVlIH1cbn07XG5cbnZhciB2b2lkRWxlbWVudHMgPSB7XG5cdF9fcHJvdG9fXzogbnVsbCxcblx0YXJlYTogdHJ1ZSxcblx0YmFzZTogdHJ1ZSxcblx0YmFzZWZvbnQ6IHRydWUsXG5cdGJyOiB0cnVlLFxuXHRjb2w6IHRydWUsXG5cdGNvbW1hbmQ6IHRydWUsXG5cdGVtYmVkOiB0cnVlLFxuXHRmcmFtZTogdHJ1ZSxcblx0aHI6IHRydWUsXG5cdGltZzogdHJ1ZSxcblx0aW5wdXQ6IHRydWUsXG5cdGlzaW5kZXg6IHRydWUsXG5cdGtleWdlbjogdHJ1ZSxcblx0bGluazogdHJ1ZSxcblx0bWV0YTogdHJ1ZSxcblx0cGFyYW06IHRydWUsXG5cdHNvdXJjZTogdHJ1ZSxcblx0dHJhY2s6IHRydWUsXG5cdHdicjogdHJ1ZVxufTtcblxudmFyIHJlX25hbWVFbmQgPSAvXFxzfFxcLy87XG5cbmZ1bmN0aW9uIFBhcnNlcihjYnMsIG9wdGlvbnMpe1xuXHR0aGlzLl9vcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblx0dGhpcy5fY2JzID0gY2JzIHx8IHt9O1xuXG5cdHRoaXMuX3RhZ25hbWUgPSBcIlwiO1xuXHR0aGlzLl9hdHRyaWJuYW1lID0gXCJcIjtcblx0dGhpcy5fYXR0cmlidmFsdWUgPSBcIlwiO1xuXHR0aGlzLl9hdHRyaWJzID0gbnVsbDtcblx0dGhpcy5fc3RhY2sgPSBbXTtcblx0dGhpcy5fZG9uZSA9IGZhbHNlO1xuXG5cdHRoaXMuc3RhcnRJbmRleCA9IDA7XG5cdHRoaXMuZW5kSW5kZXggPSBudWxsO1xuXG5cdHRoaXMuX3Rva2VuaXplciA9IG5ldyBUb2tlbml6ZXIob3B0aW9ucywgdGhpcyk7XG59XG5cbnJlcXVpcmUoXCJ1dGlsXCIpLmluaGVyaXRzKFBhcnNlciwgcmVxdWlyZShcImV2ZW50c1wiKS5FdmVudEVtaXR0ZXIpO1xuXG5QYXJzZXIucHJvdG90eXBlLl91cGRhdGVQb3NpdGlvbiA9IGZ1bmN0aW9uKGluaXRpYWxPZmZzZXQpe1xuXHRpZih0aGlzLmVuZEluZGV4ID09PSBudWxsKXtcblx0XHR0aGlzLnN0YXJ0SW5kZXggPSB0aGlzLl90b2tlbml6ZXIuX3NlY3Rpb25TdGFydCA8PSBpbml0aWFsT2Zmc2V0ID8gMCA6IHRoaXMuX3Rva2VuaXplci5fc2VjdGlvblN0YXJ0IC0gaW5pdGlhbE9mZnNldDtcblx0fVxuXHR0aGlzLnN0YXJ0SW5kZXggPSB0aGlzLmVuZEluZGV4ICsgMTtcblx0dGhpcy5lbmRJbmRleCA9IHRoaXMuX3Rva2VuaXplci5faW5kZXg7XG59O1xuXG4vL1Rva2VuaXplciBldmVudCBoYW5kbGVyc1xuUGFyc2VyLnByb3RvdHlwZS5vbnRleHQgPSBmdW5jdGlvbihkYXRhKXtcblx0dGhpcy5fdXBkYXRlUG9zaXRpb24oMSk7XG5cdHRoaXMuZW5kSW5kZXgtLTtcblxuXHRpZih0aGlzLl9jYnMub250ZXh0KSB0aGlzLl9jYnMub250ZXh0KGRhdGEpO1xufTtcblxuUGFyc2VyLnByb3RvdHlwZS5vbm9wZW50YWduYW1lID0gZnVuY3Rpb24obmFtZSl7XG5cdGlmKCEodGhpcy5fb3B0aW9ucy54bWxNb2RlIHx8IFwibG93ZXJDYXNlVGFnc1wiIGluIHRoaXMuX29wdGlvbnMpIHx8IHRoaXMuX29wdGlvbnMubG93ZXJDYXNlVGFncyl7XG5cdFx0bmFtZSA9IG5hbWUudG9Mb3dlckNhc2UoKTtcblx0fVxuXG5cdHRoaXMuX3RhZ25hbWUgPSBuYW1lO1xuXG5cdGlmICghdGhpcy5fb3B0aW9ucy54bWxNb2RlICYmIG5hbWUgaW4gb3BlbkltcGxpZXNDbG9zZSkge1xuXHRcdGZvcihcblx0XHRcdHZhciBlbDtcblx0XHRcdChlbCA9IHRoaXMuX3N0YWNrW3RoaXMuX3N0YWNrLmxlbmd0aC0xXSkgaW4gb3BlbkltcGxpZXNDbG9zZVtuYW1lXTtcblx0XHRcdHRoaXMub25jbG9zZXRhZyhlbClcblx0XHQpO1xuXHR9XG5cblx0aWYodGhpcy5fb3B0aW9ucy54bWxNb2RlIHx8ICEobmFtZSBpbiB2b2lkRWxlbWVudHMpKXtcblx0XHR0aGlzLl9zdGFjay5wdXNoKG5hbWUpO1xuXHR9XG5cblx0aWYodGhpcy5fY2JzLm9ub3BlbnRhZ25hbWUpIHRoaXMuX2Nicy5vbm9wZW50YWduYW1lKG5hbWUpO1xuXHRpZih0aGlzLl9jYnMub25vcGVudGFnKSB0aGlzLl9hdHRyaWJzID0ge307XG59O1xuXG5QYXJzZXIucHJvdG90eXBlLm9ub3BlbnRhZ2VuZCA9IGZ1bmN0aW9uKCl7XG5cdHRoaXMuX3VwZGF0ZVBvc2l0aW9uKDEpO1xuICAgIFxuXHRpZih0aGlzLl9hdHRyaWJzKXtcblx0XHRpZih0aGlzLl9jYnMub25vcGVudGFnKSB0aGlzLl9jYnMub25vcGVudGFnKHRoaXMuX3RhZ25hbWUsIHRoaXMuX2F0dHJpYnMpO1xuXHRcdHRoaXMuX2F0dHJpYnMgPSBudWxsO1xuXHR9XG4gICAgXG5cdGlmKCF0aGlzLl9vcHRpb25zLnhtbE1vZGUgJiYgdGhpcy5fY2JzLm9uY2xvc2V0YWcgJiYgdGhpcy5fdGFnbmFtZSBpbiB2b2lkRWxlbWVudHMpe1xuXHRcdHRoaXMuX2Nicy5vbmNsb3NldGFnKHRoaXMuX3RhZ25hbWUpO1xuXHR9XG4gICAgXG5cdHRoaXMuX3RhZ25hbWUgPSBcIlwiO1xufTtcblxuUGFyc2VyLnByb3RvdHlwZS5vbmNsb3NldGFnID0gZnVuY3Rpb24obmFtZSl7XG5cdHRoaXMuX3VwZGF0ZVBvc2l0aW9uKDEpO1xuXG5cdGlmKCEodGhpcy5fb3B0aW9ucy54bWxNb2RlIHx8IFwibG93ZXJDYXNlVGFnc1wiIGluIHRoaXMuX29wdGlvbnMpIHx8IHRoaXMuX29wdGlvbnMubG93ZXJDYXNlVGFncyl7XG5cdFx0bmFtZSA9IG5hbWUudG9Mb3dlckNhc2UoKTtcblx0fVxuXG5cdGlmKHRoaXMuX3N0YWNrLmxlbmd0aCAmJiAoIShuYW1lIGluIHZvaWRFbGVtZW50cykgfHwgdGhpcy5fb3B0aW9ucy54bWxNb2RlKSl7XG5cdFx0dmFyIHBvcyA9IHRoaXMuX3N0YWNrLmxhc3RJbmRleE9mKG5hbWUpO1xuXHRcdGlmKHBvcyAhPT0gLTEpe1xuXHRcdFx0aWYodGhpcy5fY2JzLm9uY2xvc2V0YWcpe1xuXHRcdFx0XHRwb3MgPSB0aGlzLl9zdGFjay5sZW5ndGggLSBwb3M7XG5cdFx0XHRcdHdoaWxlKHBvcy0tKSB0aGlzLl9jYnMub25jbG9zZXRhZyh0aGlzLl9zdGFjay5wb3AoKSk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHRoaXMuX3N0YWNrLmxlbmd0aCA9IHBvcztcblx0XHR9IGVsc2UgaWYobmFtZSA9PT0gXCJwXCIgJiYgIXRoaXMuX29wdGlvbnMueG1sTW9kZSl7XG5cdFx0XHR0aGlzLm9ub3BlbnRhZ25hbWUobmFtZSk7XG5cdFx0XHR0aGlzLl9jbG9zZUN1cnJlbnRUYWcoKTtcblx0XHR9XG5cdH0gZWxzZSBpZighdGhpcy5fb3B0aW9ucy54bWxNb2RlICYmIChuYW1lID09PSBcImJyXCIgfHwgbmFtZSA9PT0gXCJwXCIpKXtcblx0XHR0aGlzLm9ub3BlbnRhZ25hbWUobmFtZSk7XG5cdFx0dGhpcy5fY2xvc2VDdXJyZW50VGFnKCk7XG5cdH1cbn07XG5cblBhcnNlci5wcm90b3R5cGUub25zZWxmY2xvc2luZ3RhZyA9IGZ1bmN0aW9uKCl7XG5cdGlmKHRoaXMuX29wdGlvbnMueG1sTW9kZSl7XG5cdFx0dGhpcy5fY2xvc2VDdXJyZW50VGFnKCk7XG5cdH0gZWxzZSB7XG5cdFx0dGhpcy5vbm9wZW50YWdlbmQoKTtcblx0fVxufTtcblxuUGFyc2VyLnByb3RvdHlwZS5fY2xvc2VDdXJyZW50VGFnID0gZnVuY3Rpb24oKXtcblx0dmFyIG5hbWUgPSB0aGlzLl90YWduYW1lO1xuXG5cdHRoaXMub25vcGVudGFnZW5kKCk7XG5cblx0Ly9zZWxmLWNsb3NpbmcgdGFncyB3aWxsIGJlIG9uIHRoZSB0b3Agb2YgdGhlIHN0YWNrXG5cdC8vKGNoZWFwZXIgY2hlY2sgdGhhbiBpbiBvbmNsb3NldGFnKVxuXHRpZih0aGlzLl9zdGFja1t0aGlzLl9zdGFjay5sZW5ndGgtMV0gPT09IG5hbWUpe1xuXHRcdGlmKHRoaXMuX2Nicy5vbmNsb3NldGFnKXtcblx0XHRcdHRoaXMuX2Nicy5vbmNsb3NldGFnKG5hbWUpO1xuXHRcdH1cblx0XHR0aGlzLl9zdGFjay5wb3AoKTtcblx0fVxufTtcblxuUGFyc2VyLnByb3RvdHlwZS5vbmF0dHJpYm5hbWUgPSBmdW5jdGlvbihuYW1lKXtcblx0aWYoISh0aGlzLl9vcHRpb25zLnhtbE1vZGUgfHwgXCJsb3dlckNhc2VBdHRyaWJ1dGVOYW1lc1wiIGluIHRoaXMuX29wdGlvbnMpIHx8IHRoaXMuX29wdGlvbnMubG93ZXJDYXNlQXR0cmlidXRlTmFtZXMpe1xuXHRcdG5hbWUgPSBuYW1lLnRvTG93ZXJDYXNlKCk7XG5cdH1cblx0dGhpcy5fYXR0cmlibmFtZSA9IG5hbWU7XG59O1xuXG5QYXJzZXIucHJvdG90eXBlLm9uYXR0cmliZGF0YSA9IGZ1bmN0aW9uKHZhbHVlKXtcblx0dGhpcy5fYXR0cmlidmFsdWUgKz0gdmFsdWU7XG59O1xuXG5QYXJzZXIucHJvdG90eXBlLm9uYXR0cmliZW5kID0gZnVuY3Rpb24oKXtcblx0aWYodGhpcy5fY2JzLm9uYXR0cmlidXRlKSB0aGlzLl9jYnMub25hdHRyaWJ1dGUodGhpcy5fYXR0cmlibmFtZSwgdGhpcy5fYXR0cmlidmFsdWUpO1xuXHRpZihcblx0XHR0aGlzLl9hdHRyaWJzICYmXG5cdFx0IU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLl9hdHRyaWJzLCB0aGlzLl9hdHRyaWJuYW1lKVxuXHQpe1xuXHRcdHRoaXMuX2F0dHJpYnNbdGhpcy5fYXR0cmlibmFtZV0gPSB0aGlzLl9hdHRyaWJ2YWx1ZTtcblx0fVxuXHR0aGlzLl9hdHRyaWJuYW1lID0gXCJcIjtcblx0dGhpcy5fYXR0cmlidmFsdWUgPSBcIlwiO1xufTtcblxuUGFyc2VyLnByb3RvdHlwZS5vbmRlY2xhcmF0aW9uID0gZnVuY3Rpb24odmFsdWUpe1xuXHRpZih0aGlzLl9jYnMub25wcm9jZXNzaW5naW5zdHJ1Y3Rpb24pe1xuXHRcdHZhciBpZHggPSB2YWx1ZS5zZWFyY2gocmVfbmFtZUVuZCksXG5cdFx0ICAgIG5hbWUgPSBpZHggPCAwID8gdmFsdWUgOiB2YWx1ZS5zdWJzdHIoMCwgaWR4KTtcblxuXHRcdGlmKCEodGhpcy5fb3B0aW9ucy54bWxNb2RlIHx8IFwibG93ZXJDYXNlVGFnc1wiIGluIHRoaXMuX29wdGlvbnMpIHx8IHRoaXMuX29wdGlvbnMubG93ZXJDYXNlVGFncyl7XG5cdFx0XHRuYW1lID0gbmFtZS50b0xvd2VyQ2FzZSgpO1xuXHRcdH1cblx0XHR0aGlzLl9jYnMub25wcm9jZXNzaW5naW5zdHJ1Y3Rpb24oXCIhXCIgKyBuYW1lLCBcIiFcIiArIHZhbHVlKTtcblx0fVxufTtcblxuUGFyc2VyLnByb3RvdHlwZS5vbnByb2Nlc3NpbmdpbnN0cnVjdGlvbiA9IGZ1bmN0aW9uKHZhbHVlKXtcblx0aWYodGhpcy5fY2JzLm9ucHJvY2Vzc2luZ2luc3RydWN0aW9uKXtcblx0XHR2YXIgaWR4ID0gdmFsdWUuc2VhcmNoKHJlX25hbWVFbmQpLFxuXHRcdCAgICBuYW1lID0gaWR4IDwgMCA/IHZhbHVlIDogdmFsdWUuc3Vic3RyKDAsIGlkeCk7XG5cblx0XHRpZighKHRoaXMuX29wdGlvbnMueG1sTW9kZSB8fCBcImxvd2VyQ2FzZVRhZ3NcIiBpbiB0aGlzLl9vcHRpb25zKSB8fCB0aGlzLl9vcHRpb25zLmxvd2VyQ2FzZVRhZ3Mpe1xuXHRcdFx0bmFtZSA9IG5hbWUudG9Mb3dlckNhc2UoKTtcblx0XHR9XG5cdFx0dGhpcy5fY2JzLm9ucHJvY2Vzc2luZ2luc3RydWN0aW9uKFwiP1wiICsgbmFtZSwgXCI/XCIgKyB2YWx1ZSk7XG5cdH1cbn07XG5cblBhcnNlci5wcm90b3R5cGUub25jb21tZW50ID0gZnVuY3Rpb24odmFsdWUpe1xuXHR0aGlzLl91cGRhdGVQb3NpdGlvbig0KTtcblxuXHRpZih0aGlzLl9jYnMub25jb21tZW50KSB0aGlzLl9jYnMub25jb21tZW50KHZhbHVlKTtcblx0aWYodGhpcy5fY2JzLm9uY29tbWVudGVuZCkgdGhpcy5fY2JzLm9uY29tbWVudGVuZCgpO1xufTtcblxuUGFyc2VyLnByb3RvdHlwZS5vbmNkYXRhID0gZnVuY3Rpb24odmFsdWUpe1xuXHR0aGlzLl91cGRhdGVQb3NpdGlvbigxKTtcblxuXHRpZih0aGlzLl9vcHRpb25zLnhtbE1vZGUpe1xuXHRcdGlmKHRoaXMuX2Nicy5vbmNkYXRhc3RhcnQpIHRoaXMuX2Nicy5vbmNkYXRhc3RhcnQoKTtcblx0XHRpZih0aGlzLl9jYnMub250ZXh0KSB0aGlzLl9jYnMub250ZXh0KHZhbHVlKTtcblx0XHRpZih0aGlzLl9jYnMub25jZGF0YWVuZCkgdGhpcy5fY2JzLm9uY2RhdGFlbmQoKTtcblx0fSBlbHNlIHtcblx0XHR0aGlzLm9uY29tbWVudChcIltDREFUQVtcIiArIHZhbHVlICsgXCJdXVwiKTtcblx0fVxufTtcblxuUGFyc2VyLnByb3RvdHlwZS5vbmVycm9yID0gZnVuY3Rpb24oZXJyKXtcblx0aWYodGhpcy5fY2JzLm9uZXJyb3IpIHRoaXMuX2Nicy5vbmVycm9yKGVycik7XG59O1xuXG5QYXJzZXIucHJvdG90eXBlLm9uZW5kID0gZnVuY3Rpb24oKXtcblx0aWYodGhpcy5fY2JzLm9uY2xvc2V0YWcpe1xuXHRcdGZvcihcblx0XHRcdHZhciBpID0gdGhpcy5fc3RhY2subGVuZ3RoO1xuXHRcdFx0aSA+IDA7XG5cdFx0XHR0aGlzLl9jYnMub25jbG9zZXRhZyh0aGlzLl9zdGFja1stLWldKVxuXHRcdCk7XG5cdH1cblx0aWYodGhpcy5fY2JzLm9uZW5kKSB0aGlzLl9jYnMub25lbmQoKTtcbn07XG5cblxuLy9SZXNldHMgdGhlIHBhcnNlciB0byBhIGJsYW5rIHN0YXRlLCByZWFkeSB0byBwYXJzZSBhIG5ldyBIVE1MIGRvY3VtZW50XG5QYXJzZXIucHJvdG90eXBlLnJlc2V0ID0gZnVuY3Rpb24oKXtcblx0aWYodGhpcy5fY2JzLm9ucmVzZXQpIHRoaXMuX2Nicy5vbnJlc2V0KCk7XG5cdHRoaXMuX3Rva2VuaXplci5yZXNldCgpO1xuXG5cdHRoaXMuX3RhZ25hbWUgPSBcIlwiO1xuXHR0aGlzLl9hdHRyaWJuYW1lID0gXCJcIjtcblx0dGhpcy5fYXR0cmlicyA9IG51bGw7XG5cdHRoaXMuX3N0YWNrID0gW107XG5cdHRoaXMuX2RvbmUgPSBmYWxzZTtcbn07XG5cbi8vUGFyc2VzIGEgY29tcGxldGUgSFRNTCBkb2N1bWVudCBhbmQgcHVzaGVzIGl0IHRvIHRoZSBoYW5kbGVyXG5QYXJzZXIucHJvdG90eXBlLnBhcnNlQ29tcGxldGUgPSBmdW5jdGlvbihkYXRhKXtcblx0dGhpcy5yZXNldCgpO1xuXHR0aGlzLmVuZChkYXRhKTtcbn07XG5cblBhcnNlci5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbihjaHVuayl7XG5cdGlmKHRoaXMuX2RvbmUpIHRoaXMub25lcnJvcihFcnJvcihcIi53cml0ZSgpIGFmdGVyIGRvbmUhXCIpKTtcblx0dGhpcy5fdG9rZW5pemVyLndyaXRlKGNodW5rKTtcbn07XG5cblBhcnNlci5wcm90b3R5cGUuZW5kID0gZnVuY3Rpb24oY2h1bmspe1xuXHRpZih0aGlzLl9kb25lKSB0aGlzLm9uZXJyb3IoRXJyb3IoXCIuZW5kKCkgYWZ0ZXIgZG9uZSFcIikpO1xuXHR0aGlzLl90b2tlbml6ZXIuZW5kKGNodW5rKTtcblx0dGhpcy5fZG9uZSA9IHRydWU7XG59O1xuXG4vL2FsaWFzIGZvciBiYWNrd2FyZHMgY29tcGF0XG5QYXJzZXIucHJvdG90eXBlLnBhcnNlQ2h1bmsgPSBQYXJzZXIucHJvdG90eXBlLndyaXRlO1xuUGFyc2VyLnByb3RvdHlwZS5kb25lID0gUGFyc2VyLnByb3RvdHlwZS5lbmQ7XG5cbm1vZHVsZS5leHBvcnRzID0gUGFyc2VyO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBUb2tlbml6ZXI7XG5cbnZhciBlbnRpdHlNYXAgPSByZXF1aXJlKFwiLi9lbnRpdGllcy9lbnRpdGllcy5qc29uXCIpLFxuICAgIGxlZ2FjeU1hcCA9IHJlcXVpcmUoXCIuL2VudGl0aWVzL2xlZ2FjeS5qc29uXCIpLFxuICAgIHhtbE1hcCAgICA9IHJlcXVpcmUoXCIuL2VudGl0aWVzL3htbC5qc29uXCIpLFxuICAgIGRlY29kZU1hcCA9IHJlcXVpcmUoXCIuL2VudGl0aWVzL2RlY29kZS5qc29uXCIpLFxuXG4gICAgaSA9IDAsXG5cbiAgICBURVhUICAgICAgICAgICAgICAgICAgICAgID0gaSsrLFxuICAgIEJFRk9SRV9UQUdfTkFNRSAgICAgICAgICAgPSBpKyssIC8vYWZ0ZXIgPFxuICAgIElOX1RBR19OQU1FICAgICAgICAgICAgICAgPSBpKyssXG4gICAgSU5fU0VMRl9DTE9TSU5HX1RBRyAgICAgICA9IGkrKyxcbiAgICBCRUZPUkVfQ0xPU0lOR19UQUdfTkFNRSAgID0gaSsrLFxuICAgIElOX0NMT1NJTkdfVEFHX05BTUUgICAgICAgPSBpKyssXG4gICAgQUZURVJfQ0xPU0lOR19UQUdfTkFNRSAgICA9IGkrKyxcblxuICAgIC8vYXR0cmlidXRlc1xuICAgIEJFRk9SRV9BVFRSSUJVVEVfTkFNRSAgICAgPSBpKyssXG4gICAgSU5fQVRUUklCVVRFX05BTUUgICAgICAgICA9IGkrKyxcbiAgICBBRlRFUl9BVFRSSUJVVEVfTkFNRSAgICAgID0gaSsrLFxuICAgIEJFRk9SRV9BVFRSSUJVVEVfVkFMVUUgICAgPSBpKyssXG4gICAgSU5fQVRUUklCVVRFX1ZBTFVFX0RRICAgICA9IGkrKywgLy8gXCJcbiAgICBJTl9BVFRSSUJVVEVfVkFMVUVfU1EgICAgID0gaSsrLCAvLyAnXG4gICAgSU5fQVRUUklCVVRFX1ZBTFVFX05RICAgICA9IGkrKyxcblxuICAgIC8vZGVjbGFyYXRpb25zXG4gICAgQkVGT1JFX0RFQ0xBUkFUSU9OICAgICAgICA9IGkrKywgLy8gIVxuICAgIElOX0RFQ0xBUkFUSU9OICAgICAgICAgICAgPSBpKyssXG5cbiAgICAvL3Byb2Nlc3NpbmcgaW5zdHJ1Y3Rpb25zXG4gICAgSU5fUFJPQ0VTU0lOR19JTlNUUlVDVElPTiA9IGkrKywgLy8gP1xuXG4gICAgLy9jb21tZW50c1xuICAgIEJFRk9SRV9DT01NRU5UICAgICAgICAgICAgPSBpKyssXG4gICAgSU5fQ09NTUVOVCAgICAgICAgICAgICAgICA9IGkrKyxcbiAgICBBRlRFUl9DT01NRU5UXzEgICAgICAgICAgID0gaSsrLFxuICAgIEFGVEVSX0NPTU1FTlRfMiAgICAgICAgICAgPSBpKyssXG5cbiAgICAvL2NkYXRhXG4gICAgQkVGT1JFX0NEQVRBXzEgICAgICAgICAgICA9IGkrKywgLy8gW1xuICAgIEJFRk9SRV9DREFUQV8yICAgICAgICAgICAgPSBpKyssIC8vIENcbiAgICBCRUZPUkVfQ0RBVEFfMyAgICAgICAgICAgID0gaSsrLCAvLyBEXG4gICAgQkVGT1JFX0NEQVRBXzQgICAgICAgICAgICA9IGkrKywgLy8gQVxuICAgIEJFRk9SRV9DREFUQV81ICAgICAgICAgICAgPSBpKyssIC8vIFRcbiAgICBCRUZPUkVfQ0RBVEFfNiAgICAgICAgICAgID0gaSsrLCAvLyBBXG4gICAgSU5fQ0RBVEEgICAgICAgICAgICAgICAgICA9IGkrKywvLyBbXG4gICAgQUZURVJfQ0RBVEFfMSAgICAgICAgICAgICA9IGkrKywgLy8gXVxuICAgIEFGVEVSX0NEQVRBXzIgICAgICAgICAgICAgPSBpKyssIC8vIF1cblxuICAgIC8vc3BlY2lhbCB0YWdzXG4gICAgQkVGT1JFX1NQRUNJQUwgICAgICAgICAgICA9IGkrKywgLy9TXG4gICAgQkVGT1JFX1NQRUNJQUxfRU5EICAgICAgICA9IGkrKywgICAvL1NcblxuICAgIEJFRk9SRV9TQ1JJUFRfMSAgICAgICAgICAgPSBpKyssIC8vQ1xuICAgIEJFRk9SRV9TQ1JJUFRfMiAgICAgICAgICAgPSBpKyssIC8vUlxuICAgIEJFRk9SRV9TQ1JJUFRfMyAgICAgICAgICAgPSBpKyssIC8vSVxuICAgIEJFRk9SRV9TQ1JJUFRfNCAgICAgICAgICAgPSBpKyssIC8vUFxuICAgIEJFRk9SRV9TQ1JJUFRfNSAgICAgICAgICAgPSBpKyssIC8vVFxuICAgIEFGVEVSX1NDUklQVF8xICAgICAgICAgICAgPSBpKyssIC8vQ1xuICAgIEFGVEVSX1NDUklQVF8yICAgICAgICAgICAgPSBpKyssIC8vUlxuICAgIEFGVEVSX1NDUklQVF8zICAgICAgICAgICAgPSBpKyssIC8vSVxuICAgIEFGVEVSX1NDUklQVF80ICAgICAgICAgICAgPSBpKyssIC8vUFxuICAgIEFGVEVSX1NDUklQVF81ICAgICAgICAgICAgPSBpKyssIC8vVFxuXG4gICAgQkVGT1JFX1NUWUxFXzEgICAgICAgICAgICA9IGkrKywgLy9UXG4gICAgQkVGT1JFX1NUWUxFXzIgICAgICAgICAgICA9IGkrKywgLy9ZXG4gICAgQkVGT1JFX1NUWUxFXzMgICAgICAgICAgICA9IGkrKywgLy9MXG4gICAgQkVGT1JFX1NUWUxFXzQgICAgICAgICAgICA9IGkrKywgLy9FXG4gICAgQUZURVJfU1RZTEVfMSAgICAgICAgICAgICA9IGkrKywgLy9UXG4gICAgQUZURVJfU1RZTEVfMiAgICAgICAgICAgICA9IGkrKywgLy9ZXG4gICAgQUZURVJfU1RZTEVfMyAgICAgICAgICAgICA9IGkrKywgLy9MXG4gICAgQUZURVJfU1RZTEVfNCAgICAgICAgICAgICA9IGkrKywgLy9FXG5cbiAgICBCRUZPUkVfRU5USVRZICAgICAgICAgICAgID0gaSsrLCAvLyZcbiAgICBCRUZPUkVfTlVNRVJJQ19FTlRJVFkgICAgID0gaSsrLCAvLyNcbiAgICBJTl9OQU1FRF9FTlRJVFkgICAgICAgICAgID0gaSsrLFxuICAgIElOX05VTUVSSUNfRU5USVRZICAgICAgICAgPSBpKyssXG4gICAgSU5fSEVYX0VOVElUWSAgICAgICAgICAgICA9IGkrKywgLy9YXG5cbiAgICBqID0gMCxcblxuICAgIFNQRUNJQUxfTk9ORSAgICAgICAgICAgICAgPSBqKyssXG4gICAgU1BFQ0lBTF9TQ1JJUFQgICAgICAgICAgICA9IGorKyxcbiAgICBTUEVDSUFMX1NUWUxFICAgICAgICAgICAgID0gaisrO1xuXG5mdW5jdGlvbiB3aGl0ZXNwYWNlKGMpe1xuXHRyZXR1cm4gYyA9PT0gXCIgXCIgfHwgYyA9PT0gXCJcXG5cIiB8fCBjID09PSBcIlxcdFwiIHx8IGMgPT09IFwiXFxmXCIgfHwgYyA9PT0gXCJcXHJcIjtcbn1cblxuZnVuY3Rpb24gaWZFbHNlU3RhdGUodXBwZXIsIFNVQ0NFU1MsIEZBSUxVUkUpe1xuXHR2YXIgbG93ZXIgPSB1cHBlci50b0xvd2VyQ2FzZSgpO1xuXG5cdGlmKHVwcGVyID09PSBsb3dlcil7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uKGMpe1xuXHRcdFx0dGhpcy5fc3RhdGUgPSBjID09PSBsb3dlciA/IFNVQ0NFU1MgOiBGQUlMVVJFO1xuXHRcdH07XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uKGMpe1xuXHRcdFx0dGhpcy5fc3RhdGUgPSAoYyA9PT0gbG93ZXIgfHwgYyA9PT0gdXBwZXIpID8gU1VDQ0VTUyA6IEZBSUxVUkU7XG5cdFx0fTtcblx0fVxufVxuXG5mdW5jdGlvbiBjb25zdW1lU3BlY2lhbE5hbWVDaGFyKHVwcGVyLCBORVhUX1NUQVRFKXtcblx0dmFyIGxvd2VyID0gdXBwZXIudG9Mb3dlckNhc2UoKTtcblxuXHRyZXR1cm4gZnVuY3Rpb24oYyl7XG5cdFx0aWYoYyA9PT0gbG93ZXIgfHwgYyA9PT0gdXBwZXIpe1xuXHRcdFx0dGhpcy5fc3RhdGUgPSBORVhUX1NUQVRFO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLl9zdGF0ZSA9IElOX1RBR19OQU1FO1xuXHRcdFx0dGhpcy5faW5kZXgtLTsgLy9jb25zdW1lIHRoZSB0b2tlbiBhZ2FpblxuXHRcdH1cblx0fTtcbn1cblxuZnVuY3Rpb24gVG9rZW5pemVyKG9wdGlvbnMsIGNicyl7XG5cdHRoaXMuX3N0YXRlID0gVEVYVDtcblx0dGhpcy5fYnVmZmVyID0gXCJcIjtcblx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gMDtcblx0dGhpcy5faW5kZXggPSAwO1xuXHR0aGlzLl9iYXNlU3RhdGUgPSBURVhUO1xuXHR0aGlzLl9zcGVjaWFsID0gU1BFQ0lBTF9OT05FO1xuXHR0aGlzLl9jYnMgPSBjYnM7XG5cdHRoaXMuX3J1bm5pbmcgPSB0cnVlO1xuXHR0aGlzLl94bWxNb2RlID0gISEob3B0aW9ucyAmJiBvcHRpb25zLnhtbE1vZGUpO1xuXHR0aGlzLl9kZWNvZGVFbnRpdGllcyA9ICEhKG9wdGlvbnMgJiYgb3B0aW9ucy5kZWNvZGVFbnRpdGllcyk7XG59XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlVGV4dCA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIjxcIil7XG5cdFx0aWYodGhpcy5faW5kZXggPiB0aGlzLl9zZWN0aW9uU3RhcnQpe1xuXHRcdFx0dGhpcy5fY2JzLm9udGV4dCh0aGlzLl9nZXRTZWN0aW9uKCkpO1xuXHRcdH1cblx0XHR0aGlzLl9zdGF0ZSA9IEJFRk9SRV9UQUdfTkFNRTtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleDtcblx0fSBlbHNlIGlmKHRoaXMuX2RlY29kZUVudGl0aWVzICYmIHRoaXMuX3NwZWNpYWwgPT09IFNQRUNJQUxfTk9ORSAmJiBjID09PSBcIiZcIil7XG5cdFx0aWYodGhpcy5faW5kZXggPiB0aGlzLl9zZWN0aW9uU3RhcnQpe1xuXHRcdFx0dGhpcy5fY2JzLm9udGV4dCh0aGlzLl9nZXRTZWN0aW9uKCkpO1xuXHRcdH1cblx0XHR0aGlzLl9iYXNlU3RhdGUgPSBURVhUO1xuXHRcdHRoaXMuX3N0YXRlID0gQkVGT1JFX0VOVElUWTtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleDtcblx0fVxufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVCZWZvcmVUYWdOYW1lID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiL1wiKXtcblx0XHR0aGlzLl9zdGF0ZSA9IEJFRk9SRV9DTE9TSU5HX1RBR19OQU1FO1xuXHR9IGVsc2UgaWYoYyA9PT0gXCI+XCIgfHwgdGhpcy5fc3BlY2lhbCAhPT0gU1BFQ0lBTF9OT05FIHx8IHdoaXRlc3BhY2UoYykpIHtcblx0XHR0aGlzLl9zdGF0ZSA9IFRFWFQ7XG5cdH0gZWxzZSBpZihjID09PSBcIiFcIil7XG5cdFx0dGhpcy5fc3RhdGUgPSBCRUZPUkVfREVDTEFSQVRJT047XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXggKyAxO1xuXHR9IGVsc2UgaWYoYyA9PT0gXCI/XCIpe1xuXHRcdHRoaXMuX3N0YXRlID0gSU5fUFJPQ0VTU0lOR19JTlNUUlVDVElPTjtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleCArIDE7XG5cdH0gZWxzZSBpZihjID09PSBcIjxcIil7XG5cdFx0dGhpcy5fY2JzLm9udGV4dCh0aGlzLl9nZXRTZWN0aW9uKCkpO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4O1xuXHR9IGVsc2Uge1xuXHRcdHRoaXMuX3N0YXRlID0gKCF0aGlzLl94bWxNb2RlICYmIChjID09PSBcInNcIiB8fCBjID09PSBcIlNcIikpID9cblx0XHRcdFx0XHRcdEJFRk9SRV9TUEVDSUFMIDogSU5fVEFHX05BTUU7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXg7XG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlSW5UYWdOYW1lID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiL1wiIHx8IGMgPT09IFwiPlwiIHx8IHdoaXRlc3BhY2UoYykpe1xuXHRcdHRoaXMuX2VtaXRUb2tlbihcIm9ub3BlbnRhZ25hbWVcIik7XG5cdFx0dGhpcy5fc3RhdGUgPSBCRUZPUkVfQVRUUklCVVRFX05BTUU7XG5cdFx0dGhpcy5faW5kZXgtLTtcblx0fVxufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVCZWZvcmVDbG9zZWluZ1RhZ05hbWUgPSBmdW5jdGlvbihjKXtcblx0aWYod2hpdGVzcGFjZShjKSk7XG5cdGVsc2UgaWYoYyA9PT0gXCI+XCIpe1xuXHRcdHRoaXMuX3N0YXRlID0gVEVYVDtcblx0fSBlbHNlIGlmKHRoaXMuX3NwZWNpYWwgIT09IFNQRUNJQUxfTk9ORSl7XG5cdFx0aWYoYyA9PT0gXCJzXCIgfHwgYyA9PT0gXCJTXCIpe1xuXHRcdFx0dGhpcy5fc3RhdGUgPSBCRUZPUkVfU1BFQ0lBTF9FTkQ7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuX3N0YXRlID0gVEVYVDtcblx0XHRcdHRoaXMuX2luZGV4LS07XG5cdFx0fVxuXHR9IGVsc2Uge1xuXHRcdHRoaXMuX3N0YXRlID0gSU5fQ0xPU0lOR19UQUdfTkFNRTtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleDtcblx0fVxufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVJbkNsb3NlaW5nVGFnTmFtZSA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIj5cIiB8fCB3aGl0ZXNwYWNlKGMpKXtcblx0XHR0aGlzLl9lbWl0VG9rZW4oXCJvbmNsb3NldGFnXCIpO1xuXHRcdHRoaXMuX3N0YXRlID0gQUZURVJfQ0xPU0lOR19UQUdfTkFNRTtcblx0XHR0aGlzLl9pbmRleC0tO1xuXHR9XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUFmdGVyQ2xvc2VpbmdUYWdOYW1lID0gZnVuY3Rpb24oYyl7XG5cdC8vc2tpcCBldmVyeXRoaW5nIHVudGlsIFwiPlwiXG5cdGlmKGMgPT09IFwiPlwiKXtcblx0XHR0aGlzLl9zdGF0ZSA9IFRFWFQ7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXggKyAxO1xuXHR9XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUJlZm9yZUF0dHJpYnV0ZU5hbWUgPSBmdW5jdGlvbihjKXtcblx0aWYoYyA9PT0gXCI+XCIpe1xuXHRcdHRoaXMuX2Nicy5vbm9wZW50YWdlbmQoKTtcblx0XHR0aGlzLl9zdGF0ZSA9IFRFWFQ7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXggKyAxO1xuXHR9IGVsc2UgaWYoYyA9PT0gXCIvXCIpe1xuXHRcdHRoaXMuX3N0YXRlID0gSU5fU0VMRl9DTE9TSU5HX1RBRztcblx0fSBlbHNlIGlmKCF3aGl0ZXNwYWNlKGMpKXtcblx0XHR0aGlzLl9zdGF0ZSA9IElOX0FUVFJJQlVURV9OQU1FO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4O1xuXHR9XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUluU2VsZkNsb3NpbmdUYWcgPSBmdW5jdGlvbihjKXtcblx0aWYoYyA9PT0gXCI+XCIpe1xuXHRcdHRoaXMuX2Nicy5vbnNlbGZjbG9zaW5ndGFnKCk7XG5cdFx0dGhpcy5fc3RhdGUgPSBURVhUO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4ICsgMTtcblx0fSBlbHNlIGlmKCF3aGl0ZXNwYWNlKGMpKXtcblx0XHR0aGlzLl9zdGF0ZSA9IEJFRk9SRV9BVFRSSUJVVEVfTkFNRTtcblx0XHR0aGlzLl9pbmRleC0tO1xuXHR9XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUluQXR0cmlidXRlTmFtZSA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIj1cIiB8fCBjID09PSBcIi9cIiB8fCBjID09PSBcIj5cIiB8fCB3aGl0ZXNwYWNlKGMpKXtcblx0XHRpZih0aGlzLl9pbmRleCA+IHRoaXMuX3NlY3Rpb25TdGFydCl7XG5cdFx0XHR0aGlzLl9jYnMub25hdHRyaWJuYW1lKHRoaXMuX2dldFNlY3Rpb24oKSk7XG5cdFx0fVxuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IC0xO1xuXHRcdHRoaXMuX3N0YXRlID0gQUZURVJfQVRUUklCVVRFX05BTUU7XG5cdFx0dGhpcy5faW5kZXgtLTtcblx0fVxufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVBZnRlckF0dHJpYnV0ZU5hbWUgPSBmdW5jdGlvbihjKXtcblx0aWYoYyA9PT0gXCI9XCIpe1xuXHRcdHRoaXMuX3N0YXRlID0gQkVGT1JFX0FUVFJJQlVURV9WQUxVRTtcblx0fSBlbHNlIGlmKGMgPT09IFwiL1wiIHx8IGMgPT09IFwiPlwiKXtcblx0XHR0aGlzLl9jYnMub25hdHRyaWJlbmQoKTtcblx0XHR0aGlzLl9zdGF0ZSA9IEJFRk9SRV9BVFRSSUJVVEVfTkFNRTtcblx0XHR0aGlzLl9pbmRleC0tO1xuXHR9IGVsc2UgaWYoIXdoaXRlc3BhY2UoYykpe1xuXHRcdHRoaXMuX2Nicy5vbmF0dHJpYmVuZCgpO1xuXHRcdHRoaXMuX3N0YXRlID0gSU5fQVRUUklCVVRFX05BTUU7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXg7XG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlQXR0cmlidXRlVmFsdWUgPSBmdW5jdGlvbihjKXtcblx0aWYoYyA9PT0gXCJcXFwiXCIpe1xuXHRcdHRoaXMuX3N0YXRlID0gSU5fQVRUUklCVVRFX1ZBTFVFX0RRO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4ICsgMTtcblx0fSBlbHNlIGlmKGMgPT09IFwiJ1wiKXtcblx0XHR0aGlzLl9zdGF0ZSA9IElOX0FUVFJJQlVURV9WQUxVRV9TUTtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleCArIDE7XG5cdH0gZWxzZSBpZighd2hpdGVzcGFjZShjKSl7XG5cdFx0dGhpcy5fc3RhdGUgPSBJTl9BVFRSSUJVVEVfVkFMVUVfTlE7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXg7XG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlSW5BdHRyaWJ1dGVWYWx1ZURvdWJsZVF1b3RlcyA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIlxcXCJcIil7XG5cdFx0dGhpcy5fZW1pdFRva2VuKFwib25hdHRyaWJkYXRhXCIpO1xuXHRcdHRoaXMuX2Nicy5vbmF0dHJpYmVuZCgpO1xuXHRcdHRoaXMuX3N0YXRlID0gQkVGT1JFX0FUVFJJQlVURV9OQU1FO1xuXHR9IGVsc2UgaWYodGhpcy5fZGVjb2RlRW50aXRpZXMgJiYgYyA9PT0gXCImXCIpe1xuXHRcdHRoaXMuX2VtaXRUb2tlbihcIm9uYXR0cmliZGF0YVwiKTtcblx0XHR0aGlzLl9iYXNlU3RhdGUgPSB0aGlzLl9zdGF0ZTtcblx0XHR0aGlzLl9zdGF0ZSA9IEJFRk9SRV9FTlRJVFk7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXg7XG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlSW5BdHRyaWJ1dGVWYWx1ZVNpbmdsZVF1b3RlcyA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIidcIil7XG5cdFx0dGhpcy5fZW1pdFRva2VuKFwib25hdHRyaWJkYXRhXCIpO1xuXHRcdHRoaXMuX2Nicy5vbmF0dHJpYmVuZCgpO1xuXHRcdHRoaXMuX3N0YXRlID0gQkVGT1JFX0FUVFJJQlVURV9OQU1FO1xuXHR9IGVsc2UgaWYodGhpcy5fZGVjb2RlRW50aXRpZXMgJiYgYyA9PT0gXCImXCIpe1xuXHRcdHRoaXMuX2VtaXRUb2tlbihcIm9uYXR0cmliZGF0YVwiKTtcblx0XHR0aGlzLl9iYXNlU3RhdGUgPSB0aGlzLl9zdGF0ZTtcblx0XHR0aGlzLl9zdGF0ZSA9IEJFRk9SRV9FTlRJVFk7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXg7XG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlSW5BdHRyaWJ1dGVWYWx1ZU5vUXVvdGVzID0gZnVuY3Rpb24oYyl7XG5cdGlmKHdoaXRlc3BhY2UoYykgfHwgYyA9PT0gXCI+XCIpe1xuXHRcdHRoaXMuX2VtaXRUb2tlbihcIm9uYXR0cmliZGF0YVwiKTtcblx0XHR0aGlzLl9jYnMub25hdHRyaWJlbmQoKTtcblx0XHR0aGlzLl9zdGF0ZSA9IEJFRk9SRV9BVFRSSUJVVEVfTkFNRTtcblx0XHR0aGlzLl9pbmRleC0tO1xuXHR9IGVsc2UgaWYodGhpcy5fZGVjb2RlRW50aXRpZXMgJiYgYyA9PT0gXCImXCIpe1xuXHRcdHRoaXMuX2VtaXRUb2tlbihcIm9uYXR0cmliZGF0YVwiKTtcblx0XHR0aGlzLl9iYXNlU3RhdGUgPSB0aGlzLl9zdGF0ZTtcblx0XHR0aGlzLl9zdGF0ZSA9IEJFRk9SRV9FTlRJVFk7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXg7XG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlRGVjbGFyYXRpb24gPSBmdW5jdGlvbihjKXtcblx0dGhpcy5fc3RhdGUgPSBjID09PSBcIltcIiA/IEJFRk9SRV9DREFUQV8xIDpcblx0XHRcdFx0XHRjID09PSBcIi1cIiA/IEJFRk9SRV9DT01NRU5UIDpcblx0XHRcdFx0XHRcdElOX0RFQ0xBUkFUSU9OO1xufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVJbkRlY2xhcmF0aW9uID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiPlwiKXtcblx0XHR0aGlzLl9jYnMub25kZWNsYXJhdGlvbih0aGlzLl9nZXRTZWN0aW9uKCkpO1xuXHRcdHRoaXMuX3N0YXRlID0gVEVYVDtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleCArIDE7XG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlSW5Qcm9jZXNzaW5nSW5zdHJ1Y3Rpb24gPSBmdW5jdGlvbihjKXtcblx0aWYoYyA9PT0gXCI+XCIpe1xuXHRcdHRoaXMuX2Nicy5vbnByb2Nlc3NpbmdpbnN0cnVjdGlvbih0aGlzLl9nZXRTZWN0aW9uKCkpO1xuXHRcdHRoaXMuX3N0YXRlID0gVEVYVDtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleCArIDE7XG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlQ29tbWVudCA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIi1cIil7XG5cdFx0dGhpcy5fc3RhdGUgPSBJTl9DT01NRU5UO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4ICsgMTtcblx0fSBlbHNlIHtcblx0XHR0aGlzLl9zdGF0ZSA9IElOX0RFQ0xBUkFUSU9OO1xuXHR9XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUluQ29tbWVudCA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIi1cIikgdGhpcy5fc3RhdGUgPSBBRlRFUl9DT01NRU5UXzE7XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUFmdGVyQ29tbWVudDEgPSBpZkVsc2VTdGF0ZShcIi1cIiwgQUZURVJfQ09NTUVOVF8yLCBJTl9DT01NRU5UKTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVBZnRlckNvbW1lbnQyID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiPlwiKXtcblx0XHQvL3JlbW92ZSAyIHRyYWlsaW5nIGNoYXJzXG5cdFx0dGhpcy5fY2JzLm9uY29tbWVudCh0aGlzLl9idWZmZXIuc3Vic3RyaW5nKHRoaXMuX3NlY3Rpb25TdGFydCwgdGhpcy5faW5kZXggLSAyKSk7XG5cdFx0dGhpcy5fc3RhdGUgPSBURVhUO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4ICsgMTtcblx0fSBlbHNlIGlmKGMgIT09IFwiLVwiKXtcblx0XHR0aGlzLl9zdGF0ZSA9IElOX0NPTU1FTlQ7XG5cdH1cblx0Ly8gZWxzZTogc3RheSBpbiBBRlRFUl9DT01NRU5UXzIgKGAtLS0+YClcbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlQ2RhdGExID0gaWZFbHNlU3RhdGUoXCJDXCIsIEJFRk9SRV9DREFUQV8yLCBJTl9ERUNMQVJBVElPTik7XG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUJlZm9yZUNkYXRhMiA9IGlmRWxzZVN0YXRlKFwiRFwiLCBCRUZPUkVfQ0RBVEFfMywgSU5fREVDTEFSQVRJT04pO1xuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVCZWZvcmVDZGF0YTMgPSBpZkVsc2VTdGF0ZShcIkFcIiwgQkVGT1JFX0NEQVRBXzQsIElOX0RFQ0xBUkFUSU9OKTtcblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlQ2RhdGE0ID0gaWZFbHNlU3RhdGUoXCJUXCIsIEJFRk9SRV9DREFUQV81LCBJTl9ERUNMQVJBVElPTik7XG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUJlZm9yZUNkYXRhNSA9IGlmRWxzZVN0YXRlKFwiQVwiLCBCRUZPUkVfQ0RBVEFfNiwgSU5fREVDTEFSQVRJT04pO1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUJlZm9yZUNkYXRhNiA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIltcIil7XG5cdFx0dGhpcy5fc3RhdGUgPSBJTl9DREFUQTtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleCArIDE7XG5cdH0gZWxzZSB7XG5cdFx0dGhpcy5fc3RhdGUgPSBJTl9ERUNMQVJBVElPTjtcblx0fVxufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVJbkNkYXRhID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiXVwiKSB0aGlzLl9zdGF0ZSA9IEFGVEVSX0NEQVRBXzE7XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUFmdGVyQ2RhdGExID0gaWZFbHNlU3RhdGUoXCJdXCIsIEFGVEVSX0NEQVRBXzIsIElOX0NEQVRBKTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVBZnRlckNkYXRhMiA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIj5cIil7XG5cdFx0Ly9yZW1vdmUgMiB0cmFpbGluZyBjaGFyc1xuXHRcdHRoaXMuX2Nicy5vbmNkYXRhKHRoaXMuX2J1ZmZlci5zdWJzdHJpbmcodGhpcy5fc2VjdGlvblN0YXJ0LCB0aGlzLl9pbmRleCAtIDIpKTtcblx0XHR0aGlzLl9zdGF0ZSA9IFRFWFQ7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXggKyAxO1xuXHR9IGVsc2UgaWYgKGMgIT09IFwiXVwiKSB7XG5cdFx0dGhpcy5fc3RhdGUgPSBJTl9DREFUQTtcblx0fVxuXHQvL2Vsc2U6IHN0YXkgaW4gQUZURVJfQ0RBVEFfMiAoYF1dXT5gKVxufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVCZWZvcmVTcGVjaWFsID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiY1wiIHx8IGMgPT09IFwiQ1wiKXtcblx0XHR0aGlzLl9zdGF0ZSA9IEJFRk9SRV9TQ1JJUFRfMTtcblx0fSBlbHNlIGlmKGMgPT09IFwidFwiIHx8IGMgPT09IFwiVFwiKXtcblx0XHR0aGlzLl9zdGF0ZSA9IEJFRk9SRV9TVFlMRV8xO1xuXHR9IGVsc2Uge1xuXHRcdHRoaXMuX3N0YXRlID0gSU5fVEFHX05BTUU7XG5cdFx0dGhpcy5faW5kZXgtLTsgLy9jb25zdW1lIHRoZSB0b2tlbiBhZ2FpblxuXHR9XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUJlZm9yZVNwZWNpYWxFbmQgPSBmdW5jdGlvbihjKXtcblx0aWYodGhpcy5fc3BlY2lhbCA9PT0gU1BFQ0lBTF9TQ1JJUFQgJiYgKGMgPT09IFwiY1wiIHx8IGMgPT09IFwiQ1wiKSl7XG5cdFx0dGhpcy5fc3RhdGUgPSBBRlRFUl9TQ1JJUFRfMTtcblx0fSBlbHNlIGlmKHRoaXMuX3NwZWNpYWwgPT09IFNQRUNJQUxfU1RZTEUgJiYgKGMgPT09IFwidFwiIHx8IGMgPT09IFwiVFwiKSl7XG5cdFx0dGhpcy5fc3RhdGUgPSBBRlRFUl9TVFlMRV8xO1xuXHR9XG5cdGVsc2UgdGhpcy5fc3RhdGUgPSBURVhUO1xufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVCZWZvcmVTY3JpcHQxID0gY29uc3VtZVNwZWNpYWxOYW1lQ2hhcihcIlJcIiwgQkVGT1JFX1NDUklQVF8yKTtcblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlU2NyaXB0MiA9IGNvbnN1bWVTcGVjaWFsTmFtZUNoYXIoXCJJXCIsIEJFRk9SRV9TQ1JJUFRfMyk7XG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUJlZm9yZVNjcmlwdDMgPSBjb25zdW1lU3BlY2lhbE5hbWVDaGFyKFwiUFwiLCBCRUZPUkVfU0NSSVBUXzQpO1xuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVCZWZvcmVTY3JpcHQ0ID0gY29uc3VtZVNwZWNpYWxOYW1lQ2hhcihcIlRcIiwgQkVGT1JFX1NDUklQVF81KTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVCZWZvcmVTY3JpcHQ1ID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiL1wiIHx8IGMgPT09IFwiPlwiIHx8IHdoaXRlc3BhY2UoYykpe1xuXHRcdHRoaXMuX3NwZWNpYWwgPSBTUEVDSUFMX1NDUklQVDtcblx0fVxuXHR0aGlzLl9zdGF0ZSA9IElOX1RBR19OQU1FO1xuXHR0aGlzLl9pbmRleC0tOyAvL2NvbnN1bWUgdGhlIHRva2VuIGFnYWluXG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUFmdGVyU2NyaXB0MSA9IGlmRWxzZVN0YXRlKFwiUlwiLCBBRlRFUl9TQ1JJUFRfMiwgVEVYVCk7XG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUFmdGVyU2NyaXB0MiA9IGlmRWxzZVN0YXRlKFwiSVwiLCBBRlRFUl9TQ1JJUFRfMywgVEVYVCk7XG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUFmdGVyU2NyaXB0MyA9IGlmRWxzZVN0YXRlKFwiUFwiLCBBRlRFUl9TQ1JJUFRfNCwgVEVYVCk7XG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUFmdGVyU2NyaXB0NCA9IGlmRWxzZVN0YXRlKFwiVFwiLCBBRlRFUl9TQ1JJUFRfNSwgVEVYVCk7XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQWZ0ZXJTY3JpcHQ1ID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiPlwiIHx8IHdoaXRlc3BhY2UoYykpe1xuXHRcdHRoaXMuX3NwZWNpYWwgPSBTUEVDSUFMX05PTkU7XG5cdFx0dGhpcy5fc3RhdGUgPSBJTl9DTE9TSU5HX1RBR19OQU1FO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4IC0gNjtcblx0XHR0aGlzLl9pbmRleC0tOyAvL3JlY29uc3VtZSB0aGUgdG9rZW5cblx0fVxuXHRlbHNlIHRoaXMuX3N0YXRlID0gVEVYVDtcbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlU3R5bGUxID0gY29uc3VtZVNwZWNpYWxOYW1lQ2hhcihcIllcIiwgQkVGT1JFX1NUWUxFXzIpO1xuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVCZWZvcmVTdHlsZTIgPSBjb25zdW1lU3BlY2lhbE5hbWVDaGFyKFwiTFwiLCBCRUZPUkVfU1RZTEVfMyk7XG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUJlZm9yZVN0eWxlMyA9IGNvbnN1bWVTcGVjaWFsTmFtZUNoYXIoXCJFXCIsIEJFRk9SRV9TVFlMRV80KTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVCZWZvcmVTdHlsZTQgPSBmdW5jdGlvbihjKXtcblx0aWYoYyA9PT0gXCIvXCIgfHwgYyA9PT0gXCI+XCIgfHwgd2hpdGVzcGFjZShjKSl7XG5cdFx0dGhpcy5fc3BlY2lhbCA9IFNQRUNJQUxfU1RZTEU7XG5cdH1cblx0dGhpcy5fc3RhdGUgPSBJTl9UQUdfTkFNRTtcblx0dGhpcy5faW5kZXgtLTsgLy9jb25zdW1lIHRoZSB0b2tlbiBhZ2FpblxufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVBZnRlclN0eWxlMSA9IGlmRWxzZVN0YXRlKFwiWVwiLCBBRlRFUl9TVFlMRV8yLCBURVhUKTtcblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQWZ0ZXJTdHlsZTIgPSBpZkVsc2VTdGF0ZShcIkxcIiwgQUZURVJfU1RZTEVfMywgVEVYVCk7XG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUFmdGVyU3R5bGUzID0gaWZFbHNlU3RhdGUoXCJFXCIsIEFGVEVSX1NUWUxFXzQsIFRFWFQpO1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUFmdGVyU3R5bGU0ID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiPlwiIHx8IHdoaXRlc3BhY2UoYykpe1xuXHRcdHRoaXMuX3NwZWNpYWwgPSBTUEVDSUFMX05PTkU7XG5cdFx0dGhpcy5fc3RhdGUgPSBJTl9DTE9TSU5HX1RBR19OQU1FO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4IC0gNTtcblx0XHR0aGlzLl9pbmRleC0tOyAvL3JlY29uc3VtZSB0aGUgdG9rZW5cblx0fVxuXHRlbHNlIHRoaXMuX3N0YXRlID0gVEVYVDtcbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlRW50aXR5ID0gaWZFbHNlU3RhdGUoXCIjXCIsIEJFRk9SRV9OVU1FUklDX0VOVElUWSwgSU5fTkFNRURfRU5USVRZKTtcblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlTnVtZXJpY0VudGl0eSA9IGlmRWxzZVN0YXRlKFwiWFwiLCBJTl9IRVhfRU5USVRZLCBJTl9OVU1FUklDX0VOVElUWSk7XG5cbi8vZm9yIGVudGl0aWVzIHdpdGhpbiBhdHRyaWJ1dGVzXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9wYXJzZU5hbWVkRW50aXR5U3RyaWN0ID0gZnVuY3Rpb24oKXtcblx0Ly9vZmZzZXQgPSAxXG5cdGlmKHRoaXMuX3NlY3Rpb25TdGFydCArIDEgPCB0aGlzLl9pbmRleCl7XG5cdFx0dmFyIGVudGl0eSA9IHRoaXMuX2J1ZmZlci5zdWJzdHJpbmcodGhpcy5fc2VjdGlvblN0YXJ0ICsgMSwgdGhpcy5faW5kZXgpLFxuXHRcdCAgICBtYXAgPSB0aGlzLl94bWxNb2RlID8geG1sTWFwIDogZW50aXR5TWFwO1xuXG5cdFx0aWYobWFwLmhhc093blByb3BlcnR5KGVudGl0eSkpe1xuXHRcdFx0dGhpcy5fZW1pdFBhcnRpYWwobWFwW2VudGl0eV0pO1xuXHRcdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXggKyAxO1xuXHRcdH1cblx0fVxufTtcblxuXG4vL3BhcnNlcyBsZWdhY3kgZW50aXRpZXMgKHdpdGhvdXQgdHJhaWxpbmcgc2VtaWNvbG9uKVxuVG9rZW5pemVyLnByb3RvdHlwZS5fcGFyc2VMZWdhY3lFbnRpdHkgPSBmdW5jdGlvbigpe1xuXHR2YXIgc3RhcnQgPSB0aGlzLl9zZWN0aW9uU3RhcnQgKyAxLFxuXHQgICAgbGltaXQgPSB0aGlzLl9pbmRleCAtIHN0YXJ0O1xuXG5cdGlmKGxpbWl0ID4gNikgbGltaXQgPSA2OyAvL3RoZSBtYXggbGVuZ3RoIG9mIGxlZ2FjeSBlbnRpdGllcyBpcyA2XG5cblx0d2hpbGUobGltaXQgPj0gMil7IC8vdGhlIG1pbiBsZW5ndGggb2YgbGVnYWN5IGVudGl0aWVzIGlzIDJcblx0XHR2YXIgZW50aXR5ID0gdGhpcy5fYnVmZmVyLnN1YnN0cihzdGFydCwgbGltaXQpO1xuXG5cdFx0aWYobGVnYWN5TWFwLmhhc093blByb3BlcnR5KGVudGl0eSkpe1xuXHRcdFx0dGhpcy5fZW1pdFBhcnRpYWwobGVnYWN5TWFwW2VudGl0eV0pO1xuXHRcdFx0dGhpcy5fc2VjdGlvblN0YXJ0ICs9IGxpbWl0ICsgMjtcblx0XHRcdGJyZWFrO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRsaW1pdC0tO1xuXHRcdH1cblx0fVxufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVJbk5hbWVkRW50aXR5ID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiO1wiKXtcblx0XHR0aGlzLl9wYXJzZU5hbWVkRW50aXR5U3RyaWN0KCk7XG5cdFx0aWYodGhpcy5fc2VjdGlvblN0YXJ0ICsgMSA8IHRoaXMuX2luZGV4ICYmICF0aGlzLl94bWxNb2RlKXtcblx0XHRcdHRoaXMuX3BhcnNlTGVnYWN5RW50aXR5KCk7XG5cdFx0fVxuXHRcdHRoaXMuX3N0YXRlID0gdGhpcy5fYmFzZVN0YXRlO1xuXHR9IGVsc2UgaWYoKGMgPCBcImFcIiB8fCBjID4gXCJ6XCIpICYmIChjIDwgXCJBXCIgfHwgYyA+IFwiWlwiKSAmJiAoYyA8IFwiMFwiIHx8IGMgPiBcIjlcIikpe1xuXHRcdGlmKHRoaXMuX3htbE1vZGUpO1xuXHRcdGVsc2UgaWYodGhpcy5fYmFzZVN0YXRlICE9PSBURVhUKXtcblx0XHRcdGlmKGMgIT09IFwiPVwiKXtcblx0XHRcdFx0dGhpcy5fcGFyc2VOYW1lZEVudGl0eVN0cmljdCgpO1xuXHRcdFx0XHR0aGlzLl9zZWN0aW9uU3RhcnQtLTsgLy9pbmNsdWRlIHRoZSBjdXJyZW50IGNoYXJhY3RlciBpbiB0aGUgc2VjdGlvblxuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLl9wYXJzZUxlZ2FjeUVudGl0eSgpO1xuXHRcdFx0dGhpcy5fc2VjdGlvblN0YXJ0LS07XG5cdFx0fVxuXHRcdHRoaXMuX3N0YXRlID0gdGhpcy5fYmFzZVN0YXRlO1xuXHRcdHRoaXMuX2luZGV4LS07XG5cdH1cbn07XG5cbi8vIG1vZGlmaWVkIHZlcnNpb24gb2YgaHR0cHM6Ly9naXRodWIuY29tL21hdGhpYXNieW5lbnMvaGUvYmxvYi9tYXN0ZXIvc3JjL2hlLmpzI0w5NC1MMTE5XG5mdW5jdGlvbiBkZWNvZGVDb2RlUG9pbnQoY29kZVBvaW50KXtcblx0dmFyIG91dHB1dCA9IFwiXCI7XG5cblx0aWYoKGNvZGVQb2ludCA+PSAweEQ4MDAgJiYgY29kZVBvaW50IDw9IDB4REZGRikgfHwgY29kZVBvaW50ID4gMHgxMEZGRkYpe1xuXHRcdHJldHVybiBcIlxcdUZGRkRcIjtcblx0fVxuXG5cdGlmKGNvZGVQb2ludCBpbiBkZWNvZGVNYXApe1xuXHRcdGNvZGVQb2ludCA9IGRlY29kZU1hcFtjb2RlUG9pbnRdO1xuXHR9XG5cblx0aWYoY29kZVBvaW50ID4gMHhGRkZGKXtcblx0XHRjb2RlUG9pbnQgLT0gMHgxMDAwMDtcblx0XHRvdXRwdXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShjb2RlUG9pbnQgPj4+IDEwICYgMHgzRkYgfCAweEQ4MDApO1xuXHRcdGNvZGVQb2ludCA9IDB4REMwMCB8IGNvZGVQb2ludCAmIDB4M0ZGO1xuXHR9XG5cblx0b3V0cHV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoY29kZVBvaW50KTtcblx0cmV0dXJuIG91dHB1dDtcbn1cblxuVG9rZW5pemVyLnByb3RvdHlwZS5fZGVjb2RlTnVtZXJpY0VudGl0eSA9IGZ1bmN0aW9uKG9mZnNldCwgYmFzZSl7XG5cdHZhciBzZWN0aW9uU3RhcnQgPSB0aGlzLl9zZWN0aW9uU3RhcnQgKyBvZmZzZXQ7XG5cblx0aWYoc2VjdGlvblN0YXJ0ICE9PSB0aGlzLl9pbmRleCl7XG5cdFx0Ly9wYXJzZSBlbnRpdHlcblx0XHR2YXIgZW50aXR5ID0gdGhpcy5fYnVmZmVyLnN1YnN0cmluZyhzZWN0aW9uU3RhcnQsIHRoaXMuX2luZGV4KTtcblx0XHR2YXIgcGFyc2VkID0gcGFyc2VJbnQoZW50aXR5LCBiYXNlKTtcblxuXHRcdGlmKHBhcnNlZCA9PT0gcGFyc2VkKXsgLy9ub3QgTmFOIChUT0RPOiB3aGVuIGNhbiB0aGlzIGhhcHBlbj8pXG5cdFx0XHR0aGlzLl9lbWl0UGFydGlhbChkZWNvZGVDb2RlUG9pbnQocGFyc2VkKSk7XG5cdFx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleDtcblx0XHR9XG5cdH1cblxuXHR0aGlzLl9zdGF0ZSA9IHRoaXMuX2Jhc2VTdGF0ZTtcbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlSW5OdW1lcmljRW50aXR5ID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiO1wiKXtcblx0XHR0aGlzLl9kZWNvZGVOdW1lcmljRW50aXR5KDIsIDEwKTtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQrKztcblx0fSBlbHNlIGlmKGMgPCBcIjBcIiB8fCBjID4gXCI5XCIpe1xuXHRcdGlmKCF0aGlzLl94bWxNb2RlKXtcblx0XHRcdHRoaXMuX2RlY29kZU51bWVyaWNFbnRpdHkoMiwgMTApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLl9zdGF0ZSA9IHRoaXMuX2Jhc2VTdGF0ZTtcblx0XHR9XG5cdFx0dGhpcy5faW5kZXgtLTtcblx0fVxufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVJbkhleEVudGl0eSA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIjtcIil7XG5cdFx0dGhpcy5fZGVjb2RlTnVtZXJpY0VudGl0eSgzLCAxNik7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0Kys7XG5cdH0gZWxzZSBpZigoYyA8IFwiYVwiIHx8IGMgPiBcImZcIikgJiYgKGMgPCBcIkFcIiB8fCBjID4gXCJGXCIpICYmIChjIDwgXCIwXCIgfHwgYyA+IFwiOVwiKSl7XG5cdFx0aWYoIXRoaXMuX3htbE1vZGUpe1xuXHRcdFx0dGhpcy5fZGVjb2RlTnVtZXJpY0VudGl0eSgzLCAxNik7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuX3N0YXRlID0gdGhpcy5fYmFzZVN0YXRlO1xuXHRcdH1cblx0XHR0aGlzLl9pbmRleC0tO1xuXHR9XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9jbGVhbnVwID0gZnVuY3Rpb24gKCkge1xuXHRpZih0aGlzLl9zZWN0aW9uU3RhcnQgPCAwKXtcblx0XHR0aGlzLl9idWZmZXIgPSBcIlwiO1xuXHRcdHRoaXMuX2luZGV4ID0gMDtcblx0fSBlbHNlIHtcblx0XHRpZih0aGlzLl9zdGF0ZSA9PT0gVEVYVCl7XG5cdFx0XHRpZih0aGlzLl9zZWN0aW9uU3RhcnQgIT09IHRoaXMuX2luZGV4KXtcblx0XHRcdFx0dGhpcy5fY2JzLm9udGV4dCh0aGlzLl9idWZmZXIuc3Vic3RyKHRoaXMuX3NlY3Rpb25TdGFydCkpO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5fYnVmZmVyID0gXCJcIjtcblx0XHRcdHRoaXMuX2luZGV4ID0gMDtcblx0XHR9IGVsc2UgaWYodGhpcy5fc2VjdGlvblN0YXJ0ID09PSB0aGlzLl9pbmRleCl7XG5cdFx0XHQvL3RoZSBzZWN0aW9uIGp1c3Qgc3RhcnRlZFxuXHRcdFx0dGhpcy5fYnVmZmVyID0gXCJcIjtcblx0XHRcdHRoaXMuX2luZGV4ID0gMDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly9yZW1vdmUgZXZlcnl0aGluZyB1bm5lY2Vzc2FyeVxuXHRcdFx0dGhpcy5fYnVmZmVyID0gdGhpcy5fYnVmZmVyLnN1YnN0cih0aGlzLl9zZWN0aW9uU3RhcnQpO1xuXHRcdFx0dGhpcy5faW5kZXggLT0gdGhpcy5fc2VjdGlvblN0YXJ0O1xuXHRcdH1cblxuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IDA7XG5cdH1cbn07XG5cbi8vVE9ETyBtYWtlIGV2ZW50cyBjb25kaXRpb25hbFxuVG9rZW5pemVyLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uKGNodW5rKXtcblx0dGhpcy5fYnVmZmVyICs9IGNodW5rO1xuXG5cdHdoaWxlKHRoaXMuX2luZGV4IDwgdGhpcy5fYnVmZmVyLmxlbmd0aCAmJiB0aGlzLl9ydW5uaW5nKXtcblx0XHR2YXIgYyA9IHRoaXMuX2J1ZmZlci5jaGFyQXQodGhpcy5faW5kZXgpO1xuXHRcdGlmKHRoaXMuX3N0YXRlID09PSBURVhUKSB7XG5cdFx0XHR0aGlzLl9zdGF0ZVRleHQoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfVEFHX05BTUUpe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVUYWdOYW1lKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gSU5fVEFHX05BTUUpIHtcblx0XHRcdHRoaXMuX3N0YXRlSW5UYWdOYW1lKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQkVGT1JFX0NMT1NJTkdfVEFHX05BTUUpe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVDbG9zZWluZ1RhZ05hbWUoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBJTl9DTE9TSU5HX1RBR19OQU1FKXtcblx0XHRcdHRoaXMuX3N0YXRlSW5DbG9zZWluZ1RhZ05hbWUoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBBRlRFUl9DTE9TSU5HX1RBR19OQU1FKXtcblx0XHRcdHRoaXMuX3N0YXRlQWZ0ZXJDbG9zZWluZ1RhZ05hbWUoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBJTl9TRUxGX0NMT1NJTkdfVEFHKXtcblx0XHRcdHRoaXMuX3N0YXRlSW5TZWxmQ2xvc2luZ1RhZyhjKTtcblx0XHR9XG5cblx0XHQvKlxuXHRcdCpcdGF0dHJpYnV0ZXNcblx0XHQqL1xuXHRcdGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9BVFRSSUJVVEVfTkFNRSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUJlZm9yZUF0dHJpYnV0ZU5hbWUoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBJTl9BVFRSSUJVVEVfTkFNRSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUluQXR0cmlidXRlTmFtZShjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEFGVEVSX0FUVFJJQlVURV9OQU1FKXtcblx0XHRcdHRoaXMuX3N0YXRlQWZ0ZXJBdHRyaWJ1dGVOYW1lKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQkVGT1JFX0FUVFJJQlVURV9WQUxVRSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUJlZm9yZUF0dHJpYnV0ZVZhbHVlKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gSU5fQVRUUklCVVRFX1ZBTFVFX0RRKXtcblx0XHRcdHRoaXMuX3N0YXRlSW5BdHRyaWJ1dGVWYWx1ZURvdWJsZVF1b3RlcyhjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IElOX0FUVFJJQlVURV9WQUxVRV9TUSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUluQXR0cmlidXRlVmFsdWVTaW5nbGVRdW90ZXMoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBJTl9BVFRSSUJVVEVfVkFMVUVfTlEpe1xuXHRcdFx0dGhpcy5fc3RhdGVJbkF0dHJpYnV0ZVZhbHVlTm9RdW90ZXMoYyk7XG5cdFx0fVxuXG5cdFx0Lypcblx0XHQqXHRkZWNsYXJhdGlvbnNcblx0XHQqL1xuXHRcdGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9ERUNMQVJBVElPTil7XG5cdFx0XHR0aGlzLl9zdGF0ZUJlZm9yZURlY2xhcmF0aW9uKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gSU5fREVDTEFSQVRJT04pe1xuXHRcdFx0dGhpcy5fc3RhdGVJbkRlY2xhcmF0aW9uKGMpO1xuXHRcdH1cblxuXHRcdC8qXG5cdFx0Klx0cHJvY2Vzc2luZyBpbnN0cnVjdGlvbnNcblx0XHQqL1xuXHRcdGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IElOX1BST0NFU1NJTkdfSU5TVFJVQ1RJT04pe1xuXHRcdFx0dGhpcy5fc3RhdGVJblByb2Nlc3NpbmdJbnN0cnVjdGlvbihjKTtcblx0XHR9XG5cblx0XHQvKlxuXHRcdCpcdGNvbW1lbnRzXG5cdFx0Ki9cblx0XHRlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfQ09NTUVOVCl7XG5cdFx0XHR0aGlzLl9zdGF0ZUJlZm9yZUNvbW1lbnQoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBJTl9DT01NRU5UKXtcblx0XHRcdHRoaXMuX3N0YXRlSW5Db21tZW50KGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQUZURVJfQ09NTUVOVF8xKXtcblx0XHRcdHRoaXMuX3N0YXRlQWZ0ZXJDb21tZW50MShjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEFGVEVSX0NPTU1FTlRfMil7XG5cdFx0XHR0aGlzLl9zdGF0ZUFmdGVyQ29tbWVudDIoYyk7XG5cdFx0fVxuXG5cdFx0Lypcblx0XHQqXHRjZGF0YVxuXHRcdCovXG5cdFx0ZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQkVGT1JFX0NEQVRBXzEpe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVDZGF0YTEoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfQ0RBVEFfMil7XG5cdFx0XHR0aGlzLl9zdGF0ZUJlZm9yZUNkYXRhMihjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9DREFUQV8zKXtcblx0XHRcdHRoaXMuX3N0YXRlQmVmb3JlQ2RhdGEzKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQkVGT1JFX0NEQVRBXzQpe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVDZGF0YTQoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfQ0RBVEFfNSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUJlZm9yZUNkYXRhNShjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9DREFUQV82KXtcblx0XHRcdHRoaXMuX3N0YXRlQmVmb3JlQ2RhdGE2KGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gSU5fQ0RBVEEpe1xuXHRcdFx0dGhpcy5fc3RhdGVJbkNkYXRhKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQUZURVJfQ0RBVEFfMSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUFmdGVyQ2RhdGExKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQUZURVJfQ0RBVEFfMil7XG5cdFx0XHR0aGlzLl9zdGF0ZUFmdGVyQ2RhdGEyKGMpO1xuXHRcdH1cblxuXHRcdC8qXG5cdFx0KiBzcGVjaWFsIHRhZ3Ncblx0XHQqL1xuXHRcdGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9TUEVDSUFMKXtcblx0XHRcdHRoaXMuX3N0YXRlQmVmb3JlU3BlY2lhbChjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9TUEVDSUFMX0VORCl7XG5cdFx0XHR0aGlzLl9zdGF0ZUJlZm9yZVNwZWNpYWxFbmQoYyk7XG5cdFx0fVxuXG5cdFx0Lypcblx0XHQqIHNjcmlwdFxuXHRcdCovXG5cdFx0ZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQkVGT1JFX1NDUklQVF8xKXtcblx0XHRcdHRoaXMuX3N0YXRlQmVmb3JlU2NyaXB0MShjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9TQ1JJUFRfMil7XG5cdFx0XHR0aGlzLl9zdGF0ZUJlZm9yZVNjcmlwdDIoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfU0NSSVBUXzMpe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVTY3JpcHQzKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQkVGT1JFX1NDUklQVF80KXtcblx0XHRcdHRoaXMuX3N0YXRlQmVmb3JlU2NyaXB0NChjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9TQ1JJUFRfNSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUJlZm9yZVNjcmlwdDUoYyk7XG5cdFx0fVxuXG5cdFx0ZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQUZURVJfU0NSSVBUXzEpe1xuXHRcdFx0dGhpcy5fc3RhdGVBZnRlclNjcmlwdDEoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBBRlRFUl9TQ1JJUFRfMil7XG5cdFx0XHR0aGlzLl9zdGF0ZUFmdGVyU2NyaXB0MihjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEFGVEVSX1NDUklQVF8zKXtcblx0XHRcdHRoaXMuX3N0YXRlQWZ0ZXJTY3JpcHQzKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQUZURVJfU0NSSVBUXzQpe1xuXHRcdFx0dGhpcy5fc3RhdGVBZnRlclNjcmlwdDQoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBBRlRFUl9TQ1JJUFRfNSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUFmdGVyU2NyaXB0NShjKTtcblx0XHR9XG5cblx0XHQvKlxuXHRcdCogc3R5bGVcblx0XHQqL1xuXHRcdGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9TVFlMRV8xKXtcblx0XHRcdHRoaXMuX3N0YXRlQmVmb3JlU3R5bGUxKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQkVGT1JFX1NUWUxFXzIpe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVTdHlsZTIoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfU1RZTEVfMyl7XG5cdFx0XHR0aGlzLl9zdGF0ZUJlZm9yZVN0eWxlMyhjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9TVFlMRV80KXtcblx0XHRcdHRoaXMuX3N0YXRlQmVmb3JlU3R5bGU0KGMpO1xuXHRcdH1cblxuXHRcdGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEFGVEVSX1NUWUxFXzEpe1xuXHRcdFx0dGhpcy5fc3RhdGVBZnRlclN0eWxlMShjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEFGVEVSX1NUWUxFXzIpe1xuXHRcdFx0dGhpcy5fc3RhdGVBZnRlclN0eWxlMihjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEFGVEVSX1NUWUxFXzMpe1xuXHRcdFx0dGhpcy5fc3RhdGVBZnRlclN0eWxlMyhjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEFGVEVSX1NUWUxFXzQpe1xuXHRcdFx0dGhpcy5fc3RhdGVBZnRlclN0eWxlNChjKTtcblx0XHR9XG5cblx0XHQvKlxuXHRcdCogZW50aXRpZXNcblx0XHQqL1xuXHRcdGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9FTlRJVFkpe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVFbnRpdHkoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfTlVNRVJJQ19FTlRJVFkpe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVOdW1lcmljRW50aXR5KGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gSU5fTkFNRURfRU5USVRZKXtcblx0XHRcdHRoaXMuX3N0YXRlSW5OYW1lZEVudGl0eShjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IElOX05VTUVSSUNfRU5USVRZKXtcblx0XHRcdHRoaXMuX3N0YXRlSW5OdW1lcmljRW50aXR5KGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gSU5fSEVYX0VOVElUWSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUluSGV4RW50aXR5KGMpO1xuXHRcdH1cblxuXHRcdGVsc2Uge1xuXHRcdFx0dGhpcy5fY2JzLm9uZXJyb3IoRXJyb3IoXCJ1bmtub3duIF9zdGF0ZVwiKSwgdGhpcy5fc3RhdGUpO1xuXHRcdH1cblxuXHRcdHRoaXMuX2luZGV4Kys7XG5cdH1cblxuXHR0aGlzLl9jbGVhbnVwKCk7XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLnBhdXNlID0gZnVuY3Rpb24oKXtcblx0dGhpcy5fcnVubmluZyA9IGZhbHNlO1xufTtcblRva2VuaXplci5wcm90b3R5cGUucmVzdW1lID0gZnVuY3Rpb24oKXtcblx0dGhpcy5fcnVubmluZyA9IHRydWU7XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLmVuZCA9IGZ1bmN0aW9uKGNodW5rKXtcblx0aWYoY2h1bmspIHRoaXMud3JpdGUoY2h1bmspO1xuXG5cdC8vaWYgdGhlcmUgaXMgcmVtYWluaW5nIGRhdGEsIGVtaXQgaXQgaW4gYSByZWFzb25hYmxlIHdheVxuXHRpZih0aGlzLl9zZWN0aW9uU3RhcnQgPCB0aGlzLl9pbmRleCl7XG5cdFx0dGhpcy5faGFuZGxlVHJhaWxpbmdEYXRhKCk7XG5cdH1cblxuXHR0aGlzLl9jYnMub25lbmQoKTtcbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX2hhbmRsZVRyYWlsaW5nRGF0YSA9IGZ1bmN0aW9uKCl7XG5cdHZhciBkYXRhID0gdGhpcy5fYnVmZmVyLnN1YnN0cih0aGlzLl9zZWN0aW9uU3RhcnQpO1xuXG5cdGlmKHRoaXMuX3N0YXRlID09PSBJTl9DREFUQSB8fCB0aGlzLl9zdGF0ZSA9PT0gQUZURVJfQ0RBVEFfMSB8fCB0aGlzLl9zdGF0ZSA9PT0gQUZURVJfQ0RBVEFfMil7XG5cdFx0dGhpcy5fY2JzLm9uY2RhdGEoZGF0YSk7XG5cdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gSU5fQ09NTUVOVCB8fCB0aGlzLl9zdGF0ZSA9PT0gQUZURVJfQ09NTUVOVF8xIHx8IHRoaXMuX3N0YXRlID09PSBBRlRFUl9DT01NRU5UXzIpe1xuXHRcdHRoaXMuX2Nicy5vbmNvbW1lbnQoZGF0YSk7XG5cdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gSU5fVEFHX05BTUUpe1xuXHRcdHRoaXMuX2Nicy5vbm9wZW50YWduYW1lKGRhdGEpO1xuXHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9BVFRSSUJVVEVfTkFNRSB8fCB0aGlzLl9zdGF0ZSA9PT0gQkVGT1JFX0FUVFJJQlVURV9WQUxVRSB8fCB0aGlzLl9zdGF0ZSA9PT0gQUZURVJfQVRUUklCVVRFX05BTUUpe1xuXHRcdHRoaXMuX2Nicy5vbm9wZW50YWdlbmQoKTtcblx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBJTl9BVFRSSUJVVEVfTkFNRSl7XG5cdFx0dGhpcy5fY2JzLm9uYXR0cmlibmFtZShkYXRhKTtcblx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBJTl9BVFRSSUJVVEVfVkFMVUVfU1EgfHwgdGhpcy5fc3RhdGUgPT09IElOX0FUVFJJQlVURV9WQUxVRV9EUSB8fCB0aGlzLl9zdGF0ZSA9PT0gSU5fQVRUUklCVVRFX1ZBTFVFX05RKXtcblx0XHR0aGlzLl9jYnMub25hdHRyaWJkYXRhKGRhdGEpO1xuXHRcdHRoaXMuX2Nicy5vbmF0dHJpYmVuZCgpO1xuXHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IElOX0NMT1NJTkdfVEFHX05BTUUpe1xuXHRcdHRoaXMuX2Nicy5vbmNsb3NldGFnKGRhdGEpO1xuXHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IElOX05BTUVEX0VOVElUWSAmJiAhdGhpcy5feG1sTW9kZSl7XG5cdFx0dGhpcy5fcGFyc2VMZWdhY3lFbnRpdHkoKTtcblx0XHRpZigtLXRoaXMuX3NlY3Rpb25TdGFydCA8IHRoaXMuX2luZGV4KXtcblx0XHRcdHRoaXMuX3N0YXRlID0gdGhpcy5fYmFzZVN0YXRlO1xuXHRcdFx0dGhpcy5faGFuZGxlVHJhaWxpbmdEYXRhKCk7XG5cdFx0fVxuXHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IElOX05VTUVSSUNfRU5USVRZICYmICF0aGlzLl94bWxNb2RlKXtcblx0XHR0aGlzLl9kZWNvZGVOdW1lcmljRW50aXR5KDIsIDEwKTtcblx0XHRpZih0aGlzLl9zZWN0aW9uU3RhcnQgPCB0aGlzLl9pbmRleCl7XG5cdFx0XHR0aGlzLl9zdGF0ZSA9IHRoaXMuX2Jhc2VTdGF0ZTtcblx0XHRcdHRoaXMuX2hhbmRsZVRyYWlsaW5nRGF0YSgpO1xuXHRcdH1cblx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBJTl9IRVhfRU5USVRZICYmICF0aGlzLl94bWxNb2RlKXtcblx0XHR0aGlzLl9kZWNvZGVOdW1lcmljRW50aXR5KDMsIDE2KTtcblx0XHRpZih0aGlzLl9zZWN0aW9uU3RhcnQgPCB0aGlzLl9pbmRleCl7XG5cdFx0XHR0aGlzLl9zdGF0ZSA9IHRoaXMuX2Jhc2VTdGF0ZTtcblx0XHRcdHRoaXMuX2hhbmRsZVRyYWlsaW5nRGF0YSgpO1xuXHRcdH1cblx0fSBlbHNlIHtcblx0XHR0aGlzLl9jYnMub250ZXh0KGRhdGEpO1xuXHR9XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLnJlc2V0ID0gZnVuY3Rpb24oKXtcblx0VG9rZW5pemVyLmNhbGwodGhpcywge3htbE1vZGU6IHRoaXMuX3htbE1vZGUsIGRlY29kZUVudGl0aWVzOiB0aGlzLl9kZWNvZGVFbnRpdGllc30sIHRoaXMuX2Nicyk7XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9nZXRTZWN0aW9uID0gZnVuY3Rpb24oKXtcblx0cmV0dXJuIHRoaXMuX2J1ZmZlci5zdWJzdHJpbmcodGhpcy5fc2VjdGlvblN0YXJ0LCB0aGlzLl9pbmRleCk7XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9lbWl0VG9rZW4gPSBmdW5jdGlvbihuYW1lKXtcblx0dGhpcy5fY2JzW25hbWVdKHRoaXMuX2dldFNlY3Rpb24oKSk7XG5cdHRoaXMuX3NlY3Rpb25TdGFydCA9IC0xO1xufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fZW1pdFBhcnRpYWwgPSBmdW5jdGlvbih2YWx1ZSl7XG5cdGlmKHRoaXMuX2Jhc2VTdGF0ZSAhPT0gVEVYVCl7XG5cdFx0dGhpcy5fY2JzLm9uYXR0cmliZGF0YSh2YWx1ZSk7IC8vVE9ETyBpbXBsZW1lbnQgdGhlIG5ldyBldmVudFxuXHR9IGVsc2Uge1xuXHRcdHRoaXMuX2Nicy5vbnRleHQodmFsdWUpO1xuXHR9XG59O1xuIiwibW9kdWxlLmV4cG9ydHM9e1wiMFwiOlwiXFx1RkZGRFwiLFwiMTI4XCI6XCJcXHUyMEFDXCIsXCIxMzBcIjpcIlxcdTIwMUFcIixcIjEzMVwiOlwiXFx1MDE5MlwiLFwiMTMyXCI6XCJcXHUyMDFFXCIsXCIxMzNcIjpcIlxcdTIwMjZcIixcIjEzNFwiOlwiXFx1MjAyMFwiLFwiMTM1XCI6XCJcXHUyMDIxXCIsXCIxMzZcIjpcIlxcdTAyQzZcIixcIjEzN1wiOlwiXFx1MjAzMFwiLFwiMTM4XCI6XCJcXHUwMTYwXCIsXCIxMzlcIjpcIlxcdTIwMzlcIixcIjE0MFwiOlwiXFx1MDE1MlwiLFwiMTQyXCI6XCJcXHUwMTdEXCIsXCIxNDVcIjpcIlxcdTIwMThcIixcIjE0NlwiOlwiXFx1MjAxOVwiLFwiMTQ3XCI6XCJcXHUyMDFDXCIsXCIxNDhcIjpcIlxcdTIwMURcIixcIjE0OVwiOlwiXFx1MjAyMlwiLFwiMTUwXCI6XCJcXHUyMDEzXCIsXCIxNTFcIjpcIlxcdTIwMTRcIixcIjE1MlwiOlwiXFx1MDJEQ1wiLFwiMTUzXCI6XCJcXHUyMTIyXCIsXCIxNTRcIjpcIlxcdTAxNjFcIixcIjE1NVwiOlwiXFx1MjAzQVwiLFwiMTU2XCI6XCJcXHUwMTUzXCIsXCIxNThcIjpcIlxcdTAxN0VcIixcIjE1OVwiOlwiXFx1MDE3OFwifVxuIiwibW9kdWxlLmV4cG9ydHM9e1wiQWFjdXRlXCI6XCJcXHUwMEMxXCIsXCJhYWN1dGVcIjpcIlxcdTAwRTFcIixcIkFicmV2ZVwiOlwiXFx1MDEwMlwiLFwiYWJyZXZlXCI6XCJcXHUwMTAzXCIsXCJhY1wiOlwiXFx1MjIzRVwiLFwiYWNkXCI6XCJcXHUyMjNGXCIsXCJhY0VcIjpcIlxcdTIyM0VcXHUwMzMzXCIsXCJBY2lyY1wiOlwiXFx1MDBDMlwiLFwiYWNpcmNcIjpcIlxcdTAwRTJcIixcImFjdXRlXCI6XCJcXHUwMEI0XCIsXCJBY3lcIjpcIlxcdTA0MTBcIixcImFjeVwiOlwiXFx1MDQzMFwiLFwiQUVsaWdcIjpcIlxcdTAwQzZcIixcImFlbGlnXCI6XCJcXHUwMEU2XCIsXCJhZlwiOlwiXFx1MjA2MVwiLFwiQWZyXCI6XCJcXHVEODM1XFx1REQwNFwiLFwiYWZyXCI6XCJcXHVEODM1XFx1REQxRVwiLFwiQWdyYXZlXCI6XCJcXHUwMEMwXCIsXCJhZ3JhdmVcIjpcIlxcdTAwRTBcIixcImFsZWZzeW1cIjpcIlxcdTIxMzVcIixcImFsZXBoXCI6XCJcXHUyMTM1XCIsXCJBbHBoYVwiOlwiXFx1MDM5MVwiLFwiYWxwaGFcIjpcIlxcdTAzQjFcIixcIkFtYWNyXCI6XCJcXHUwMTAwXCIsXCJhbWFjclwiOlwiXFx1MDEwMVwiLFwiYW1hbGdcIjpcIlxcdTJBM0ZcIixcImFtcFwiOlwiJlwiLFwiQU1QXCI6XCImXCIsXCJhbmRhbmRcIjpcIlxcdTJBNTVcIixcIkFuZFwiOlwiXFx1MkE1M1wiLFwiYW5kXCI6XCJcXHUyMjI3XCIsXCJhbmRkXCI6XCJcXHUyQTVDXCIsXCJhbmRzbG9wZVwiOlwiXFx1MkE1OFwiLFwiYW5kdlwiOlwiXFx1MkE1QVwiLFwiYW5nXCI6XCJcXHUyMjIwXCIsXCJhbmdlXCI6XCJcXHUyOUE0XCIsXCJhbmdsZVwiOlwiXFx1MjIyMFwiLFwiYW5nbXNkYWFcIjpcIlxcdTI5QThcIixcImFuZ21zZGFiXCI6XCJcXHUyOUE5XCIsXCJhbmdtc2RhY1wiOlwiXFx1MjlBQVwiLFwiYW5nbXNkYWRcIjpcIlxcdTI5QUJcIixcImFuZ21zZGFlXCI6XCJcXHUyOUFDXCIsXCJhbmdtc2RhZlwiOlwiXFx1MjlBRFwiLFwiYW5nbXNkYWdcIjpcIlxcdTI5QUVcIixcImFuZ21zZGFoXCI6XCJcXHUyOUFGXCIsXCJhbmdtc2RcIjpcIlxcdTIyMjFcIixcImFuZ3J0XCI6XCJcXHUyMjFGXCIsXCJhbmdydHZiXCI6XCJcXHUyMkJFXCIsXCJhbmdydHZiZFwiOlwiXFx1Mjk5RFwiLFwiYW5nc3BoXCI6XCJcXHUyMjIyXCIsXCJhbmdzdFwiOlwiXFx1MDBDNVwiLFwiYW5nemFyclwiOlwiXFx1MjM3Q1wiLFwiQW9nb25cIjpcIlxcdTAxMDRcIixcImFvZ29uXCI6XCJcXHUwMTA1XCIsXCJBb3BmXCI6XCJcXHVEODM1XFx1REQzOFwiLFwiYW9wZlwiOlwiXFx1RDgzNVxcdURENTJcIixcImFwYWNpclwiOlwiXFx1MkE2RlwiLFwiYXBcIjpcIlxcdTIyNDhcIixcImFwRVwiOlwiXFx1MkE3MFwiLFwiYXBlXCI6XCJcXHUyMjRBXCIsXCJhcGlkXCI6XCJcXHUyMjRCXCIsXCJhcG9zXCI6XCInXCIsXCJBcHBseUZ1bmN0aW9uXCI6XCJcXHUyMDYxXCIsXCJhcHByb3hcIjpcIlxcdTIyNDhcIixcImFwcHJveGVxXCI6XCJcXHUyMjRBXCIsXCJBcmluZ1wiOlwiXFx1MDBDNVwiLFwiYXJpbmdcIjpcIlxcdTAwRTVcIixcIkFzY3JcIjpcIlxcdUQ4MzVcXHVEQzlDXCIsXCJhc2NyXCI6XCJcXHVEODM1XFx1RENCNlwiLFwiQXNzaWduXCI6XCJcXHUyMjU0XCIsXCJhc3RcIjpcIipcIixcImFzeW1wXCI6XCJcXHUyMjQ4XCIsXCJhc3ltcGVxXCI6XCJcXHUyMjREXCIsXCJBdGlsZGVcIjpcIlxcdTAwQzNcIixcImF0aWxkZVwiOlwiXFx1MDBFM1wiLFwiQXVtbFwiOlwiXFx1MDBDNFwiLFwiYXVtbFwiOlwiXFx1MDBFNFwiLFwiYXdjb25pbnRcIjpcIlxcdTIyMzNcIixcImF3aW50XCI6XCJcXHUyQTExXCIsXCJiYWNrY29uZ1wiOlwiXFx1MjI0Q1wiLFwiYmFja2Vwc2lsb25cIjpcIlxcdTAzRjZcIixcImJhY2twcmltZVwiOlwiXFx1MjAzNVwiLFwiYmFja3NpbVwiOlwiXFx1MjIzRFwiLFwiYmFja3NpbWVxXCI6XCJcXHUyMkNEXCIsXCJCYWNrc2xhc2hcIjpcIlxcdTIyMTZcIixcIkJhcnZcIjpcIlxcdTJBRTdcIixcImJhcnZlZVwiOlwiXFx1MjJCRFwiLFwiYmFyd2VkXCI6XCJcXHUyMzA1XCIsXCJCYXJ3ZWRcIjpcIlxcdTIzMDZcIixcImJhcndlZGdlXCI6XCJcXHUyMzA1XCIsXCJiYnJrXCI6XCJcXHUyM0I1XCIsXCJiYnJrdGJya1wiOlwiXFx1MjNCNlwiLFwiYmNvbmdcIjpcIlxcdTIyNENcIixcIkJjeVwiOlwiXFx1MDQxMVwiLFwiYmN5XCI6XCJcXHUwNDMxXCIsXCJiZHF1b1wiOlwiXFx1MjAxRVwiLFwiYmVjYXVzXCI6XCJcXHUyMjM1XCIsXCJiZWNhdXNlXCI6XCJcXHUyMjM1XCIsXCJCZWNhdXNlXCI6XCJcXHUyMjM1XCIsXCJiZW1wdHl2XCI6XCJcXHUyOUIwXCIsXCJiZXBzaVwiOlwiXFx1MDNGNlwiLFwiYmVybm91XCI6XCJcXHUyMTJDXCIsXCJCZXJub3VsbGlzXCI6XCJcXHUyMTJDXCIsXCJCZXRhXCI6XCJcXHUwMzkyXCIsXCJiZXRhXCI6XCJcXHUwM0IyXCIsXCJiZXRoXCI6XCJcXHUyMTM2XCIsXCJiZXR3ZWVuXCI6XCJcXHUyMjZDXCIsXCJCZnJcIjpcIlxcdUQ4MzVcXHVERDA1XCIsXCJiZnJcIjpcIlxcdUQ4MzVcXHVERDFGXCIsXCJiaWdjYXBcIjpcIlxcdTIyQzJcIixcImJpZ2NpcmNcIjpcIlxcdTI1RUZcIixcImJpZ2N1cFwiOlwiXFx1MjJDM1wiLFwiYmlnb2RvdFwiOlwiXFx1MkEwMFwiLFwiYmlnb3BsdXNcIjpcIlxcdTJBMDFcIixcImJpZ290aW1lc1wiOlwiXFx1MkEwMlwiLFwiYmlnc3FjdXBcIjpcIlxcdTJBMDZcIixcImJpZ3N0YXJcIjpcIlxcdTI2MDVcIixcImJpZ3RyaWFuZ2xlZG93blwiOlwiXFx1MjVCRFwiLFwiYmlndHJpYW5nbGV1cFwiOlwiXFx1MjVCM1wiLFwiYmlndXBsdXNcIjpcIlxcdTJBMDRcIixcImJpZ3ZlZVwiOlwiXFx1MjJDMVwiLFwiYmlnd2VkZ2VcIjpcIlxcdTIyQzBcIixcImJrYXJvd1wiOlwiXFx1MjkwRFwiLFwiYmxhY2tsb3plbmdlXCI6XCJcXHUyOUVCXCIsXCJibGFja3NxdWFyZVwiOlwiXFx1MjVBQVwiLFwiYmxhY2t0cmlhbmdsZVwiOlwiXFx1MjVCNFwiLFwiYmxhY2t0cmlhbmdsZWRvd25cIjpcIlxcdTI1QkVcIixcImJsYWNrdHJpYW5nbGVsZWZ0XCI6XCJcXHUyNUMyXCIsXCJibGFja3RyaWFuZ2xlcmlnaHRcIjpcIlxcdTI1QjhcIixcImJsYW5rXCI6XCJcXHUyNDIzXCIsXCJibGsxMlwiOlwiXFx1MjU5MlwiLFwiYmxrMTRcIjpcIlxcdTI1OTFcIixcImJsazM0XCI6XCJcXHUyNTkzXCIsXCJibG9ja1wiOlwiXFx1MjU4OFwiLFwiYm5lXCI6XCI9XFx1MjBFNVwiLFwiYm5lcXVpdlwiOlwiXFx1MjI2MVxcdTIwRTVcIixcImJOb3RcIjpcIlxcdTJBRURcIixcImJub3RcIjpcIlxcdTIzMTBcIixcIkJvcGZcIjpcIlxcdUQ4MzVcXHVERDM5XCIsXCJib3BmXCI6XCJcXHVEODM1XFx1REQ1M1wiLFwiYm90XCI6XCJcXHUyMkE1XCIsXCJib3R0b21cIjpcIlxcdTIyQTVcIixcImJvd3RpZVwiOlwiXFx1MjJDOFwiLFwiYm94Ym94XCI6XCJcXHUyOUM5XCIsXCJib3hkbFwiOlwiXFx1MjUxMFwiLFwiYm94ZExcIjpcIlxcdTI1NTVcIixcImJveERsXCI6XCJcXHUyNTU2XCIsXCJib3hETFwiOlwiXFx1MjU1N1wiLFwiYm94ZHJcIjpcIlxcdTI1MENcIixcImJveGRSXCI6XCJcXHUyNTUyXCIsXCJib3hEclwiOlwiXFx1MjU1M1wiLFwiYm94RFJcIjpcIlxcdTI1NTRcIixcImJveGhcIjpcIlxcdTI1MDBcIixcImJveEhcIjpcIlxcdTI1NTBcIixcImJveGhkXCI6XCJcXHUyNTJDXCIsXCJib3hIZFwiOlwiXFx1MjU2NFwiLFwiYm94aERcIjpcIlxcdTI1NjVcIixcImJveEhEXCI6XCJcXHUyNTY2XCIsXCJib3hodVwiOlwiXFx1MjUzNFwiLFwiYm94SHVcIjpcIlxcdTI1NjdcIixcImJveGhVXCI6XCJcXHUyNTY4XCIsXCJib3hIVVwiOlwiXFx1MjU2OVwiLFwiYm94bWludXNcIjpcIlxcdTIyOUZcIixcImJveHBsdXNcIjpcIlxcdTIyOUVcIixcImJveHRpbWVzXCI6XCJcXHUyMkEwXCIsXCJib3h1bFwiOlwiXFx1MjUxOFwiLFwiYm94dUxcIjpcIlxcdTI1NUJcIixcImJveFVsXCI6XCJcXHUyNTVDXCIsXCJib3hVTFwiOlwiXFx1MjU1RFwiLFwiYm94dXJcIjpcIlxcdTI1MTRcIixcImJveHVSXCI6XCJcXHUyNTU4XCIsXCJib3hVclwiOlwiXFx1MjU1OVwiLFwiYm94VVJcIjpcIlxcdTI1NUFcIixcImJveHZcIjpcIlxcdTI1MDJcIixcImJveFZcIjpcIlxcdTI1NTFcIixcImJveHZoXCI6XCJcXHUyNTNDXCIsXCJib3h2SFwiOlwiXFx1MjU2QVwiLFwiYm94VmhcIjpcIlxcdTI1NkJcIixcImJveFZIXCI6XCJcXHUyNTZDXCIsXCJib3h2bFwiOlwiXFx1MjUyNFwiLFwiYm94dkxcIjpcIlxcdTI1NjFcIixcImJveFZsXCI6XCJcXHUyNTYyXCIsXCJib3hWTFwiOlwiXFx1MjU2M1wiLFwiYm94dnJcIjpcIlxcdTI1MUNcIixcImJveHZSXCI6XCJcXHUyNTVFXCIsXCJib3hWclwiOlwiXFx1MjU1RlwiLFwiYm94VlJcIjpcIlxcdTI1NjBcIixcImJwcmltZVwiOlwiXFx1MjAzNVwiLFwiYnJldmVcIjpcIlxcdTAyRDhcIixcIkJyZXZlXCI6XCJcXHUwMkQ4XCIsXCJicnZiYXJcIjpcIlxcdTAwQTZcIixcImJzY3JcIjpcIlxcdUQ4MzVcXHVEQ0I3XCIsXCJCc2NyXCI6XCJcXHUyMTJDXCIsXCJic2VtaVwiOlwiXFx1MjA0RlwiLFwiYnNpbVwiOlwiXFx1MjIzRFwiLFwiYnNpbWVcIjpcIlxcdTIyQ0RcIixcImJzb2xiXCI6XCJcXHUyOUM1XCIsXCJic29sXCI6XCJcXFxcXCIsXCJic29saHN1YlwiOlwiXFx1MjdDOFwiLFwiYnVsbFwiOlwiXFx1MjAyMlwiLFwiYnVsbGV0XCI6XCJcXHUyMDIyXCIsXCJidW1wXCI6XCJcXHUyMjRFXCIsXCJidW1wRVwiOlwiXFx1MkFBRVwiLFwiYnVtcGVcIjpcIlxcdTIyNEZcIixcIkJ1bXBlcVwiOlwiXFx1MjI0RVwiLFwiYnVtcGVxXCI6XCJcXHUyMjRGXCIsXCJDYWN1dGVcIjpcIlxcdTAxMDZcIixcImNhY3V0ZVwiOlwiXFx1MDEwN1wiLFwiY2FwYW5kXCI6XCJcXHUyQTQ0XCIsXCJjYXBicmN1cFwiOlwiXFx1MkE0OVwiLFwiY2FwY2FwXCI6XCJcXHUyQTRCXCIsXCJjYXBcIjpcIlxcdTIyMjlcIixcIkNhcFwiOlwiXFx1MjJEMlwiLFwiY2FwY3VwXCI6XCJcXHUyQTQ3XCIsXCJjYXBkb3RcIjpcIlxcdTJBNDBcIixcIkNhcGl0YWxEaWZmZXJlbnRpYWxEXCI6XCJcXHUyMTQ1XCIsXCJjYXBzXCI6XCJcXHUyMjI5XFx1RkUwMFwiLFwiY2FyZXRcIjpcIlxcdTIwNDFcIixcImNhcm9uXCI6XCJcXHUwMkM3XCIsXCJDYXlsZXlzXCI6XCJcXHUyMTJEXCIsXCJjY2Fwc1wiOlwiXFx1MkE0RFwiLFwiQ2Nhcm9uXCI6XCJcXHUwMTBDXCIsXCJjY2Fyb25cIjpcIlxcdTAxMERcIixcIkNjZWRpbFwiOlwiXFx1MDBDN1wiLFwiY2NlZGlsXCI6XCJcXHUwMEU3XCIsXCJDY2lyY1wiOlwiXFx1MDEwOFwiLFwiY2NpcmNcIjpcIlxcdTAxMDlcIixcIkNjb25pbnRcIjpcIlxcdTIyMzBcIixcImNjdXBzXCI6XCJcXHUyQTRDXCIsXCJjY3Vwc3NtXCI6XCJcXHUyQTUwXCIsXCJDZG90XCI6XCJcXHUwMTBBXCIsXCJjZG90XCI6XCJcXHUwMTBCXCIsXCJjZWRpbFwiOlwiXFx1MDBCOFwiLFwiQ2VkaWxsYVwiOlwiXFx1MDBCOFwiLFwiY2VtcHR5dlwiOlwiXFx1MjlCMlwiLFwiY2VudFwiOlwiXFx1MDBBMlwiLFwiY2VudGVyZG90XCI6XCJcXHUwMEI3XCIsXCJDZW50ZXJEb3RcIjpcIlxcdTAwQjdcIixcImNmclwiOlwiXFx1RDgzNVxcdUREMjBcIixcIkNmclwiOlwiXFx1MjEyRFwiLFwiQ0hjeVwiOlwiXFx1MDQyN1wiLFwiY2hjeVwiOlwiXFx1MDQ0N1wiLFwiY2hlY2tcIjpcIlxcdTI3MTNcIixcImNoZWNrbWFya1wiOlwiXFx1MjcxM1wiLFwiQ2hpXCI6XCJcXHUwM0E3XCIsXCJjaGlcIjpcIlxcdTAzQzdcIixcImNpcmNcIjpcIlxcdTAyQzZcIixcImNpcmNlcVwiOlwiXFx1MjI1N1wiLFwiY2lyY2xlYXJyb3dsZWZ0XCI6XCJcXHUyMUJBXCIsXCJjaXJjbGVhcnJvd3JpZ2h0XCI6XCJcXHUyMUJCXCIsXCJjaXJjbGVkYXN0XCI6XCJcXHUyMjlCXCIsXCJjaXJjbGVkY2lyY1wiOlwiXFx1MjI5QVwiLFwiY2lyY2xlZGRhc2hcIjpcIlxcdTIyOURcIixcIkNpcmNsZURvdFwiOlwiXFx1MjI5OVwiLFwiY2lyY2xlZFJcIjpcIlxcdTAwQUVcIixcImNpcmNsZWRTXCI6XCJcXHUyNEM4XCIsXCJDaXJjbGVNaW51c1wiOlwiXFx1MjI5NlwiLFwiQ2lyY2xlUGx1c1wiOlwiXFx1MjI5NVwiLFwiQ2lyY2xlVGltZXNcIjpcIlxcdTIyOTdcIixcImNpclwiOlwiXFx1MjVDQlwiLFwiY2lyRVwiOlwiXFx1MjlDM1wiLFwiY2lyZVwiOlwiXFx1MjI1N1wiLFwiY2lyZm5pbnRcIjpcIlxcdTJBMTBcIixcImNpcm1pZFwiOlwiXFx1MkFFRlwiLFwiY2lyc2NpclwiOlwiXFx1MjlDMlwiLFwiQ2xvY2t3aXNlQ29udG91ckludGVncmFsXCI6XCJcXHUyMjMyXCIsXCJDbG9zZUN1cmx5RG91YmxlUXVvdGVcIjpcIlxcdTIwMURcIixcIkNsb3NlQ3VybHlRdW90ZVwiOlwiXFx1MjAxOVwiLFwiY2x1YnNcIjpcIlxcdTI2NjNcIixcImNsdWJzdWl0XCI6XCJcXHUyNjYzXCIsXCJjb2xvblwiOlwiOlwiLFwiQ29sb25cIjpcIlxcdTIyMzdcIixcIkNvbG9uZVwiOlwiXFx1MkE3NFwiLFwiY29sb25lXCI6XCJcXHUyMjU0XCIsXCJjb2xvbmVxXCI6XCJcXHUyMjU0XCIsXCJjb21tYVwiOlwiLFwiLFwiY29tbWF0XCI6XCJAXCIsXCJjb21wXCI6XCJcXHUyMjAxXCIsXCJjb21wZm5cIjpcIlxcdTIyMThcIixcImNvbXBsZW1lbnRcIjpcIlxcdTIyMDFcIixcImNvbXBsZXhlc1wiOlwiXFx1MjEwMlwiLFwiY29uZ1wiOlwiXFx1MjI0NVwiLFwiY29uZ2RvdFwiOlwiXFx1MkE2RFwiLFwiQ29uZ3J1ZW50XCI6XCJcXHUyMjYxXCIsXCJjb25pbnRcIjpcIlxcdTIyMkVcIixcIkNvbmludFwiOlwiXFx1MjIyRlwiLFwiQ29udG91ckludGVncmFsXCI6XCJcXHUyMjJFXCIsXCJjb3BmXCI6XCJcXHVEODM1XFx1REQ1NFwiLFwiQ29wZlwiOlwiXFx1MjEwMlwiLFwiY29wcm9kXCI6XCJcXHUyMjEwXCIsXCJDb3Byb2R1Y3RcIjpcIlxcdTIyMTBcIixcImNvcHlcIjpcIlxcdTAwQTlcIixcIkNPUFlcIjpcIlxcdTAwQTlcIixcImNvcHlzclwiOlwiXFx1MjExN1wiLFwiQ291bnRlckNsb2Nrd2lzZUNvbnRvdXJJbnRlZ3JhbFwiOlwiXFx1MjIzM1wiLFwiY3JhcnJcIjpcIlxcdTIxQjVcIixcImNyb3NzXCI6XCJcXHUyNzE3XCIsXCJDcm9zc1wiOlwiXFx1MkEyRlwiLFwiQ3NjclwiOlwiXFx1RDgzNVxcdURDOUVcIixcImNzY3JcIjpcIlxcdUQ4MzVcXHVEQ0I4XCIsXCJjc3ViXCI6XCJcXHUyQUNGXCIsXCJjc3ViZVwiOlwiXFx1MkFEMVwiLFwiY3N1cFwiOlwiXFx1MkFEMFwiLFwiY3N1cGVcIjpcIlxcdTJBRDJcIixcImN0ZG90XCI6XCJcXHUyMkVGXCIsXCJjdWRhcnJsXCI6XCJcXHUyOTM4XCIsXCJjdWRhcnJyXCI6XCJcXHUyOTM1XCIsXCJjdWVwclwiOlwiXFx1MjJERVwiLFwiY3Vlc2NcIjpcIlxcdTIyREZcIixcImN1bGFyclwiOlwiXFx1MjFCNlwiLFwiY3VsYXJycFwiOlwiXFx1MjkzRFwiLFwiY3VwYnJjYXBcIjpcIlxcdTJBNDhcIixcImN1cGNhcFwiOlwiXFx1MkE0NlwiLFwiQ3VwQ2FwXCI6XCJcXHUyMjREXCIsXCJjdXBcIjpcIlxcdTIyMkFcIixcIkN1cFwiOlwiXFx1MjJEM1wiLFwiY3VwY3VwXCI6XCJcXHUyQTRBXCIsXCJjdXBkb3RcIjpcIlxcdTIyOERcIixcImN1cG9yXCI6XCJcXHUyQTQ1XCIsXCJjdXBzXCI6XCJcXHUyMjJBXFx1RkUwMFwiLFwiY3VyYXJyXCI6XCJcXHUyMUI3XCIsXCJjdXJhcnJtXCI6XCJcXHUyOTNDXCIsXCJjdXJseWVxcHJlY1wiOlwiXFx1MjJERVwiLFwiY3VybHllcXN1Y2NcIjpcIlxcdTIyREZcIixcImN1cmx5dmVlXCI6XCJcXHUyMkNFXCIsXCJjdXJseXdlZGdlXCI6XCJcXHUyMkNGXCIsXCJjdXJyZW5cIjpcIlxcdTAwQTRcIixcImN1cnZlYXJyb3dsZWZ0XCI6XCJcXHUyMUI2XCIsXCJjdXJ2ZWFycm93cmlnaHRcIjpcIlxcdTIxQjdcIixcImN1dmVlXCI6XCJcXHUyMkNFXCIsXCJjdXdlZFwiOlwiXFx1MjJDRlwiLFwiY3djb25pbnRcIjpcIlxcdTIyMzJcIixcImN3aW50XCI6XCJcXHUyMjMxXCIsXCJjeWxjdHlcIjpcIlxcdTIzMkRcIixcImRhZ2dlclwiOlwiXFx1MjAyMFwiLFwiRGFnZ2VyXCI6XCJcXHUyMDIxXCIsXCJkYWxldGhcIjpcIlxcdTIxMzhcIixcImRhcnJcIjpcIlxcdTIxOTNcIixcIkRhcnJcIjpcIlxcdTIxQTFcIixcImRBcnJcIjpcIlxcdTIxRDNcIixcImRhc2hcIjpcIlxcdTIwMTBcIixcIkRhc2h2XCI6XCJcXHUyQUU0XCIsXCJkYXNodlwiOlwiXFx1MjJBM1wiLFwiZGJrYXJvd1wiOlwiXFx1MjkwRlwiLFwiZGJsYWNcIjpcIlxcdTAyRERcIixcIkRjYXJvblwiOlwiXFx1MDEwRVwiLFwiZGNhcm9uXCI6XCJcXHUwMTBGXCIsXCJEY3lcIjpcIlxcdTA0MTRcIixcImRjeVwiOlwiXFx1MDQzNFwiLFwiZGRhZ2dlclwiOlwiXFx1MjAyMVwiLFwiZGRhcnJcIjpcIlxcdTIxQ0FcIixcIkREXCI6XCJcXHUyMTQ1XCIsXCJkZFwiOlwiXFx1MjE0NlwiLFwiRERvdHJhaGRcIjpcIlxcdTI5MTFcIixcImRkb3RzZXFcIjpcIlxcdTJBNzdcIixcImRlZ1wiOlwiXFx1MDBCMFwiLFwiRGVsXCI6XCJcXHUyMjA3XCIsXCJEZWx0YVwiOlwiXFx1MDM5NFwiLFwiZGVsdGFcIjpcIlxcdTAzQjRcIixcImRlbXB0eXZcIjpcIlxcdTI5QjFcIixcImRmaXNodFwiOlwiXFx1Mjk3RlwiLFwiRGZyXCI6XCJcXHVEODM1XFx1REQwN1wiLFwiZGZyXCI6XCJcXHVEODM1XFx1REQyMVwiLFwiZEhhclwiOlwiXFx1Mjk2NVwiLFwiZGhhcmxcIjpcIlxcdTIxQzNcIixcImRoYXJyXCI6XCJcXHUyMUMyXCIsXCJEaWFjcml0aWNhbEFjdXRlXCI6XCJcXHUwMEI0XCIsXCJEaWFjcml0aWNhbERvdFwiOlwiXFx1MDJEOVwiLFwiRGlhY3JpdGljYWxEb3VibGVBY3V0ZVwiOlwiXFx1MDJERFwiLFwiRGlhY3JpdGljYWxHcmF2ZVwiOlwiYFwiLFwiRGlhY3JpdGljYWxUaWxkZVwiOlwiXFx1MDJEQ1wiLFwiZGlhbVwiOlwiXFx1MjJDNFwiLFwiZGlhbW9uZFwiOlwiXFx1MjJDNFwiLFwiRGlhbW9uZFwiOlwiXFx1MjJDNFwiLFwiZGlhbW9uZHN1aXRcIjpcIlxcdTI2NjZcIixcImRpYW1zXCI6XCJcXHUyNjY2XCIsXCJkaWVcIjpcIlxcdTAwQThcIixcIkRpZmZlcmVudGlhbERcIjpcIlxcdTIxNDZcIixcImRpZ2FtbWFcIjpcIlxcdTAzRERcIixcImRpc2luXCI6XCJcXHUyMkYyXCIsXCJkaXZcIjpcIlxcdTAwRjdcIixcImRpdmlkZVwiOlwiXFx1MDBGN1wiLFwiZGl2aWRlb250aW1lc1wiOlwiXFx1MjJDN1wiLFwiZGl2b254XCI6XCJcXHUyMkM3XCIsXCJESmN5XCI6XCJcXHUwNDAyXCIsXCJkamN5XCI6XCJcXHUwNDUyXCIsXCJkbGNvcm5cIjpcIlxcdTIzMUVcIixcImRsY3JvcFwiOlwiXFx1MjMwRFwiLFwiZG9sbGFyXCI6XCIkXCIsXCJEb3BmXCI6XCJcXHVEODM1XFx1REQzQlwiLFwiZG9wZlwiOlwiXFx1RDgzNVxcdURENTVcIixcIkRvdFwiOlwiXFx1MDBBOFwiLFwiZG90XCI6XCJcXHUwMkQ5XCIsXCJEb3REb3RcIjpcIlxcdTIwRENcIixcImRvdGVxXCI6XCJcXHUyMjUwXCIsXCJkb3RlcWRvdFwiOlwiXFx1MjI1MVwiLFwiRG90RXF1YWxcIjpcIlxcdTIyNTBcIixcImRvdG1pbnVzXCI6XCJcXHUyMjM4XCIsXCJkb3RwbHVzXCI6XCJcXHUyMjE0XCIsXCJkb3RzcXVhcmVcIjpcIlxcdTIyQTFcIixcImRvdWJsZWJhcndlZGdlXCI6XCJcXHUyMzA2XCIsXCJEb3VibGVDb250b3VySW50ZWdyYWxcIjpcIlxcdTIyMkZcIixcIkRvdWJsZURvdFwiOlwiXFx1MDBBOFwiLFwiRG91YmxlRG93bkFycm93XCI6XCJcXHUyMUQzXCIsXCJEb3VibGVMZWZ0QXJyb3dcIjpcIlxcdTIxRDBcIixcIkRvdWJsZUxlZnRSaWdodEFycm93XCI6XCJcXHUyMUQ0XCIsXCJEb3VibGVMZWZ0VGVlXCI6XCJcXHUyQUU0XCIsXCJEb3VibGVMb25nTGVmdEFycm93XCI6XCJcXHUyN0Y4XCIsXCJEb3VibGVMb25nTGVmdFJpZ2h0QXJyb3dcIjpcIlxcdTI3RkFcIixcIkRvdWJsZUxvbmdSaWdodEFycm93XCI6XCJcXHUyN0Y5XCIsXCJEb3VibGVSaWdodEFycm93XCI6XCJcXHUyMUQyXCIsXCJEb3VibGVSaWdodFRlZVwiOlwiXFx1MjJBOFwiLFwiRG91YmxlVXBBcnJvd1wiOlwiXFx1MjFEMVwiLFwiRG91YmxlVXBEb3duQXJyb3dcIjpcIlxcdTIxRDVcIixcIkRvdWJsZVZlcnRpY2FsQmFyXCI6XCJcXHUyMjI1XCIsXCJEb3duQXJyb3dCYXJcIjpcIlxcdTI5MTNcIixcImRvd25hcnJvd1wiOlwiXFx1MjE5M1wiLFwiRG93bkFycm93XCI6XCJcXHUyMTkzXCIsXCJEb3duYXJyb3dcIjpcIlxcdTIxRDNcIixcIkRvd25BcnJvd1VwQXJyb3dcIjpcIlxcdTIxRjVcIixcIkRvd25CcmV2ZVwiOlwiXFx1MDMxMVwiLFwiZG93bmRvd25hcnJvd3NcIjpcIlxcdTIxQ0FcIixcImRvd25oYXJwb29ubGVmdFwiOlwiXFx1MjFDM1wiLFwiZG93bmhhcnBvb25yaWdodFwiOlwiXFx1MjFDMlwiLFwiRG93bkxlZnRSaWdodFZlY3RvclwiOlwiXFx1Mjk1MFwiLFwiRG93bkxlZnRUZWVWZWN0b3JcIjpcIlxcdTI5NUVcIixcIkRvd25MZWZ0VmVjdG9yQmFyXCI6XCJcXHUyOTU2XCIsXCJEb3duTGVmdFZlY3RvclwiOlwiXFx1MjFCRFwiLFwiRG93blJpZ2h0VGVlVmVjdG9yXCI6XCJcXHUyOTVGXCIsXCJEb3duUmlnaHRWZWN0b3JCYXJcIjpcIlxcdTI5NTdcIixcIkRvd25SaWdodFZlY3RvclwiOlwiXFx1MjFDMVwiLFwiRG93blRlZUFycm93XCI6XCJcXHUyMUE3XCIsXCJEb3duVGVlXCI6XCJcXHUyMkE0XCIsXCJkcmJrYXJvd1wiOlwiXFx1MjkxMFwiLFwiZHJjb3JuXCI6XCJcXHUyMzFGXCIsXCJkcmNyb3BcIjpcIlxcdTIzMENcIixcIkRzY3JcIjpcIlxcdUQ4MzVcXHVEQzlGXCIsXCJkc2NyXCI6XCJcXHVEODM1XFx1RENCOVwiLFwiRFNjeVwiOlwiXFx1MDQwNVwiLFwiZHNjeVwiOlwiXFx1MDQ1NVwiLFwiZHNvbFwiOlwiXFx1MjlGNlwiLFwiRHN0cm9rXCI6XCJcXHUwMTEwXCIsXCJkc3Ryb2tcIjpcIlxcdTAxMTFcIixcImR0ZG90XCI6XCJcXHUyMkYxXCIsXCJkdHJpXCI6XCJcXHUyNUJGXCIsXCJkdHJpZlwiOlwiXFx1MjVCRVwiLFwiZHVhcnJcIjpcIlxcdTIxRjVcIixcImR1aGFyXCI6XCJcXHUyOTZGXCIsXCJkd2FuZ2xlXCI6XCJcXHUyOUE2XCIsXCJEWmN5XCI6XCJcXHUwNDBGXCIsXCJkemN5XCI6XCJcXHUwNDVGXCIsXCJkemlncmFyclwiOlwiXFx1MjdGRlwiLFwiRWFjdXRlXCI6XCJcXHUwMEM5XCIsXCJlYWN1dGVcIjpcIlxcdTAwRTlcIixcImVhc3RlclwiOlwiXFx1MkE2RVwiLFwiRWNhcm9uXCI6XCJcXHUwMTFBXCIsXCJlY2Fyb25cIjpcIlxcdTAxMUJcIixcIkVjaXJjXCI6XCJcXHUwMENBXCIsXCJlY2lyY1wiOlwiXFx1MDBFQVwiLFwiZWNpclwiOlwiXFx1MjI1NlwiLFwiZWNvbG9uXCI6XCJcXHUyMjU1XCIsXCJFY3lcIjpcIlxcdTA0MkRcIixcImVjeVwiOlwiXFx1MDQ0RFwiLFwiZUREb3RcIjpcIlxcdTJBNzdcIixcIkVkb3RcIjpcIlxcdTAxMTZcIixcImVkb3RcIjpcIlxcdTAxMTdcIixcImVEb3RcIjpcIlxcdTIyNTFcIixcImVlXCI6XCJcXHUyMTQ3XCIsXCJlZkRvdFwiOlwiXFx1MjI1MlwiLFwiRWZyXCI6XCJcXHVEODM1XFx1REQwOFwiLFwiZWZyXCI6XCJcXHVEODM1XFx1REQyMlwiLFwiZWdcIjpcIlxcdTJBOUFcIixcIkVncmF2ZVwiOlwiXFx1MDBDOFwiLFwiZWdyYXZlXCI6XCJcXHUwMEU4XCIsXCJlZ3NcIjpcIlxcdTJBOTZcIixcImVnc2RvdFwiOlwiXFx1MkE5OFwiLFwiZWxcIjpcIlxcdTJBOTlcIixcIkVsZW1lbnRcIjpcIlxcdTIyMDhcIixcImVsaW50ZXJzXCI6XCJcXHUyM0U3XCIsXCJlbGxcIjpcIlxcdTIxMTNcIixcImVsc1wiOlwiXFx1MkE5NVwiLFwiZWxzZG90XCI6XCJcXHUyQTk3XCIsXCJFbWFjclwiOlwiXFx1MDExMlwiLFwiZW1hY3JcIjpcIlxcdTAxMTNcIixcImVtcHR5XCI6XCJcXHUyMjA1XCIsXCJlbXB0eXNldFwiOlwiXFx1MjIwNVwiLFwiRW1wdHlTbWFsbFNxdWFyZVwiOlwiXFx1MjVGQlwiLFwiZW1wdHl2XCI6XCJcXHUyMjA1XCIsXCJFbXB0eVZlcnlTbWFsbFNxdWFyZVwiOlwiXFx1MjVBQlwiLFwiZW1zcDEzXCI6XCJcXHUyMDA0XCIsXCJlbXNwMTRcIjpcIlxcdTIwMDVcIixcImVtc3BcIjpcIlxcdTIwMDNcIixcIkVOR1wiOlwiXFx1MDE0QVwiLFwiZW5nXCI6XCJcXHUwMTRCXCIsXCJlbnNwXCI6XCJcXHUyMDAyXCIsXCJFb2dvblwiOlwiXFx1MDExOFwiLFwiZW9nb25cIjpcIlxcdTAxMTlcIixcIkVvcGZcIjpcIlxcdUQ4MzVcXHVERDNDXCIsXCJlb3BmXCI6XCJcXHVEODM1XFx1REQ1NlwiLFwiZXBhclwiOlwiXFx1MjJENVwiLFwiZXBhcnNsXCI6XCJcXHUyOUUzXCIsXCJlcGx1c1wiOlwiXFx1MkE3MVwiLFwiZXBzaVwiOlwiXFx1MDNCNVwiLFwiRXBzaWxvblwiOlwiXFx1MDM5NVwiLFwiZXBzaWxvblwiOlwiXFx1MDNCNVwiLFwiZXBzaXZcIjpcIlxcdTAzRjVcIixcImVxY2lyY1wiOlwiXFx1MjI1NlwiLFwiZXFjb2xvblwiOlwiXFx1MjI1NVwiLFwiZXFzaW1cIjpcIlxcdTIyNDJcIixcImVxc2xhbnRndHJcIjpcIlxcdTJBOTZcIixcImVxc2xhbnRsZXNzXCI6XCJcXHUyQTk1XCIsXCJFcXVhbFwiOlwiXFx1MkE3NVwiLFwiZXF1YWxzXCI6XCI9XCIsXCJFcXVhbFRpbGRlXCI6XCJcXHUyMjQyXCIsXCJlcXVlc3RcIjpcIlxcdTIyNUZcIixcIkVxdWlsaWJyaXVtXCI6XCJcXHUyMUNDXCIsXCJlcXVpdlwiOlwiXFx1MjI2MVwiLFwiZXF1aXZERFwiOlwiXFx1MkE3OFwiLFwiZXF2cGFyc2xcIjpcIlxcdTI5RTVcIixcImVyYXJyXCI6XCJcXHUyOTcxXCIsXCJlckRvdFwiOlwiXFx1MjI1M1wiLFwiZXNjclwiOlwiXFx1MjEyRlwiLFwiRXNjclwiOlwiXFx1MjEzMFwiLFwiZXNkb3RcIjpcIlxcdTIyNTBcIixcIkVzaW1cIjpcIlxcdTJBNzNcIixcImVzaW1cIjpcIlxcdTIyNDJcIixcIkV0YVwiOlwiXFx1MDM5N1wiLFwiZXRhXCI6XCJcXHUwM0I3XCIsXCJFVEhcIjpcIlxcdTAwRDBcIixcImV0aFwiOlwiXFx1MDBGMFwiLFwiRXVtbFwiOlwiXFx1MDBDQlwiLFwiZXVtbFwiOlwiXFx1MDBFQlwiLFwiZXVyb1wiOlwiXFx1MjBBQ1wiLFwiZXhjbFwiOlwiIVwiLFwiZXhpc3RcIjpcIlxcdTIyMDNcIixcIkV4aXN0c1wiOlwiXFx1MjIwM1wiLFwiZXhwZWN0YXRpb25cIjpcIlxcdTIxMzBcIixcImV4cG9uZW50aWFsZVwiOlwiXFx1MjE0N1wiLFwiRXhwb25lbnRpYWxFXCI6XCJcXHUyMTQ3XCIsXCJmYWxsaW5nZG90c2VxXCI6XCJcXHUyMjUyXCIsXCJGY3lcIjpcIlxcdTA0MjRcIixcImZjeVwiOlwiXFx1MDQ0NFwiLFwiZmVtYWxlXCI6XCJcXHUyNjQwXCIsXCJmZmlsaWdcIjpcIlxcdUZCMDNcIixcImZmbGlnXCI6XCJcXHVGQjAwXCIsXCJmZmxsaWdcIjpcIlxcdUZCMDRcIixcIkZmclwiOlwiXFx1RDgzNVxcdUREMDlcIixcImZmclwiOlwiXFx1RDgzNVxcdUREMjNcIixcImZpbGlnXCI6XCJcXHVGQjAxXCIsXCJGaWxsZWRTbWFsbFNxdWFyZVwiOlwiXFx1MjVGQ1wiLFwiRmlsbGVkVmVyeVNtYWxsU3F1YXJlXCI6XCJcXHUyNUFBXCIsXCJmamxpZ1wiOlwiZmpcIixcImZsYXRcIjpcIlxcdTI2NkRcIixcImZsbGlnXCI6XCJcXHVGQjAyXCIsXCJmbHRuc1wiOlwiXFx1MjVCMVwiLFwiZm5vZlwiOlwiXFx1MDE5MlwiLFwiRm9wZlwiOlwiXFx1RDgzNVxcdUREM0RcIixcImZvcGZcIjpcIlxcdUQ4MzVcXHVERDU3XCIsXCJmb3JhbGxcIjpcIlxcdTIyMDBcIixcIkZvckFsbFwiOlwiXFx1MjIwMFwiLFwiZm9ya1wiOlwiXFx1MjJENFwiLFwiZm9ya3ZcIjpcIlxcdTJBRDlcIixcIkZvdXJpZXJ0cmZcIjpcIlxcdTIxMzFcIixcImZwYXJ0aW50XCI6XCJcXHUyQTBEXCIsXCJmcmFjMTJcIjpcIlxcdTAwQkRcIixcImZyYWMxM1wiOlwiXFx1MjE1M1wiLFwiZnJhYzE0XCI6XCJcXHUwMEJDXCIsXCJmcmFjMTVcIjpcIlxcdTIxNTVcIixcImZyYWMxNlwiOlwiXFx1MjE1OVwiLFwiZnJhYzE4XCI6XCJcXHUyMTVCXCIsXCJmcmFjMjNcIjpcIlxcdTIxNTRcIixcImZyYWMyNVwiOlwiXFx1MjE1NlwiLFwiZnJhYzM0XCI6XCJcXHUwMEJFXCIsXCJmcmFjMzVcIjpcIlxcdTIxNTdcIixcImZyYWMzOFwiOlwiXFx1MjE1Q1wiLFwiZnJhYzQ1XCI6XCJcXHUyMTU4XCIsXCJmcmFjNTZcIjpcIlxcdTIxNUFcIixcImZyYWM1OFwiOlwiXFx1MjE1RFwiLFwiZnJhYzc4XCI6XCJcXHUyMTVFXCIsXCJmcmFzbFwiOlwiXFx1MjA0NFwiLFwiZnJvd25cIjpcIlxcdTIzMjJcIixcImZzY3JcIjpcIlxcdUQ4MzVcXHVEQ0JCXCIsXCJGc2NyXCI6XCJcXHUyMTMxXCIsXCJnYWN1dGVcIjpcIlxcdTAxRjVcIixcIkdhbW1hXCI6XCJcXHUwMzkzXCIsXCJnYW1tYVwiOlwiXFx1MDNCM1wiLFwiR2FtbWFkXCI6XCJcXHUwM0RDXCIsXCJnYW1tYWRcIjpcIlxcdTAzRERcIixcImdhcFwiOlwiXFx1MkE4NlwiLFwiR2JyZXZlXCI6XCJcXHUwMTFFXCIsXCJnYnJldmVcIjpcIlxcdTAxMUZcIixcIkdjZWRpbFwiOlwiXFx1MDEyMlwiLFwiR2NpcmNcIjpcIlxcdTAxMUNcIixcImdjaXJjXCI6XCJcXHUwMTFEXCIsXCJHY3lcIjpcIlxcdTA0MTNcIixcImdjeVwiOlwiXFx1MDQzM1wiLFwiR2RvdFwiOlwiXFx1MDEyMFwiLFwiZ2RvdFwiOlwiXFx1MDEyMVwiLFwiZ2VcIjpcIlxcdTIyNjVcIixcImdFXCI6XCJcXHUyMjY3XCIsXCJnRWxcIjpcIlxcdTJBOENcIixcImdlbFwiOlwiXFx1MjJEQlwiLFwiZ2VxXCI6XCJcXHUyMjY1XCIsXCJnZXFxXCI6XCJcXHUyMjY3XCIsXCJnZXFzbGFudFwiOlwiXFx1MkE3RVwiLFwiZ2VzY2NcIjpcIlxcdTJBQTlcIixcImdlc1wiOlwiXFx1MkE3RVwiLFwiZ2VzZG90XCI6XCJcXHUyQTgwXCIsXCJnZXNkb3RvXCI6XCJcXHUyQTgyXCIsXCJnZXNkb3RvbFwiOlwiXFx1MkE4NFwiLFwiZ2VzbFwiOlwiXFx1MjJEQlxcdUZFMDBcIixcImdlc2xlc1wiOlwiXFx1MkE5NFwiLFwiR2ZyXCI6XCJcXHVEODM1XFx1REQwQVwiLFwiZ2ZyXCI6XCJcXHVEODM1XFx1REQyNFwiLFwiZ2dcIjpcIlxcdTIyNkJcIixcIkdnXCI6XCJcXHUyMkQ5XCIsXCJnZ2dcIjpcIlxcdTIyRDlcIixcImdpbWVsXCI6XCJcXHUyMTM3XCIsXCJHSmN5XCI6XCJcXHUwNDAzXCIsXCJnamN5XCI6XCJcXHUwNDUzXCIsXCJnbGFcIjpcIlxcdTJBQTVcIixcImdsXCI6XCJcXHUyMjc3XCIsXCJnbEVcIjpcIlxcdTJBOTJcIixcImdsalwiOlwiXFx1MkFBNFwiLFwiZ25hcFwiOlwiXFx1MkE4QVwiLFwiZ25hcHByb3hcIjpcIlxcdTJBOEFcIixcImduZVwiOlwiXFx1MkE4OFwiLFwiZ25FXCI6XCJcXHUyMjY5XCIsXCJnbmVxXCI6XCJcXHUyQTg4XCIsXCJnbmVxcVwiOlwiXFx1MjI2OVwiLFwiZ25zaW1cIjpcIlxcdTIyRTdcIixcIkdvcGZcIjpcIlxcdUQ4MzVcXHVERDNFXCIsXCJnb3BmXCI6XCJcXHVEODM1XFx1REQ1OFwiLFwiZ3JhdmVcIjpcImBcIixcIkdyZWF0ZXJFcXVhbFwiOlwiXFx1MjI2NVwiLFwiR3JlYXRlckVxdWFsTGVzc1wiOlwiXFx1MjJEQlwiLFwiR3JlYXRlckZ1bGxFcXVhbFwiOlwiXFx1MjI2N1wiLFwiR3JlYXRlckdyZWF0ZXJcIjpcIlxcdTJBQTJcIixcIkdyZWF0ZXJMZXNzXCI6XCJcXHUyMjc3XCIsXCJHcmVhdGVyU2xhbnRFcXVhbFwiOlwiXFx1MkE3RVwiLFwiR3JlYXRlclRpbGRlXCI6XCJcXHUyMjczXCIsXCJHc2NyXCI6XCJcXHVEODM1XFx1RENBMlwiLFwiZ3NjclwiOlwiXFx1MjEwQVwiLFwiZ3NpbVwiOlwiXFx1MjI3M1wiLFwiZ3NpbWVcIjpcIlxcdTJBOEVcIixcImdzaW1sXCI6XCJcXHUyQTkwXCIsXCJndGNjXCI6XCJcXHUyQUE3XCIsXCJndGNpclwiOlwiXFx1MkE3QVwiLFwiZ3RcIjpcIj5cIixcIkdUXCI6XCI+XCIsXCJHdFwiOlwiXFx1MjI2QlwiLFwiZ3Rkb3RcIjpcIlxcdTIyRDdcIixcImd0bFBhclwiOlwiXFx1Mjk5NVwiLFwiZ3RxdWVzdFwiOlwiXFx1MkE3Q1wiLFwiZ3RyYXBwcm94XCI6XCJcXHUyQTg2XCIsXCJndHJhcnJcIjpcIlxcdTI5NzhcIixcImd0cmRvdFwiOlwiXFx1MjJEN1wiLFwiZ3RyZXFsZXNzXCI6XCJcXHUyMkRCXCIsXCJndHJlcXFsZXNzXCI6XCJcXHUyQThDXCIsXCJndHJsZXNzXCI6XCJcXHUyMjc3XCIsXCJndHJzaW1cIjpcIlxcdTIyNzNcIixcImd2ZXJ0bmVxcVwiOlwiXFx1MjI2OVxcdUZFMDBcIixcImd2bkVcIjpcIlxcdTIyNjlcXHVGRTAwXCIsXCJIYWNla1wiOlwiXFx1MDJDN1wiLFwiaGFpcnNwXCI6XCJcXHUyMDBBXCIsXCJoYWxmXCI6XCJcXHUwMEJEXCIsXCJoYW1pbHRcIjpcIlxcdTIxMEJcIixcIkhBUkRjeVwiOlwiXFx1MDQyQVwiLFwiaGFyZGN5XCI6XCJcXHUwNDRBXCIsXCJoYXJyY2lyXCI6XCJcXHUyOTQ4XCIsXCJoYXJyXCI6XCJcXHUyMTk0XCIsXCJoQXJyXCI6XCJcXHUyMUQ0XCIsXCJoYXJyd1wiOlwiXFx1MjFBRFwiLFwiSGF0XCI6XCJeXCIsXCJoYmFyXCI6XCJcXHUyMTBGXCIsXCJIY2lyY1wiOlwiXFx1MDEyNFwiLFwiaGNpcmNcIjpcIlxcdTAxMjVcIixcImhlYXJ0c1wiOlwiXFx1MjY2NVwiLFwiaGVhcnRzdWl0XCI6XCJcXHUyNjY1XCIsXCJoZWxsaXBcIjpcIlxcdTIwMjZcIixcImhlcmNvblwiOlwiXFx1MjJCOVwiLFwiaGZyXCI6XCJcXHVEODM1XFx1REQyNVwiLFwiSGZyXCI6XCJcXHUyMTBDXCIsXCJIaWxiZXJ0U3BhY2VcIjpcIlxcdTIxMEJcIixcImhrc2Vhcm93XCI6XCJcXHUyOTI1XCIsXCJoa3N3YXJvd1wiOlwiXFx1MjkyNlwiLFwiaG9hcnJcIjpcIlxcdTIxRkZcIixcImhvbXRodFwiOlwiXFx1MjIzQlwiLFwiaG9va2xlZnRhcnJvd1wiOlwiXFx1MjFBOVwiLFwiaG9va3JpZ2h0YXJyb3dcIjpcIlxcdTIxQUFcIixcImhvcGZcIjpcIlxcdUQ4MzVcXHVERDU5XCIsXCJIb3BmXCI6XCJcXHUyMTBEXCIsXCJob3JiYXJcIjpcIlxcdTIwMTVcIixcIkhvcml6b250YWxMaW5lXCI6XCJcXHUyNTAwXCIsXCJoc2NyXCI6XCJcXHVEODM1XFx1RENCRFwiLFwiSHNjclwiOlwiXFx1MjEwQlwiLFwiaHNsYXNoXCI6XCJcXHUyMTBGXCIsXCJIc3Ryb2tcIjpcIlxcdTAxMjZcIixcImhzdHJva1wiOlwiXFx1MDEyN1wiLFwiSHVtcERvd25IdW1wXCI6XCJcXHUyMjRFXCIsXCJIdW1wRXF1YWxcIjpcIlxcdTIyNEZcIixcImh5YnVsbFwiOlwiXFx1MjA0M1wiLFwiaHlwaGVuXCI6XCJcXHUyMDEwXCIsXCJJYWN1dGVcIjpcIlxcdTAwQ0RcIixcImlhY3V0ZVwiOlwiXFx1MDBFRFwiLFwiaWNcIjpcIlxcdTIwNjNcIixcIkljaXJjXCI6XCJcXHUwMENFXCIsXCJpY2lyY1wiOlwiXFx1MDBFRVwiLFwiSWN5XCI6XCJcXHUwNDE4XCIsXCJpY3lcIjpcIlxcdTA0MzhcIixcIklkb3RcIjpcIlxcdTAxMzBcIixcIklFY3lcIjpcIlxcdTA0MTVcIixcImllY3lcIjpcIlxcdTA0MzVcIixcImlleGNsXCI6XCJcXHUwMEExXCIsXCJpZmZcIjpcIlxcdTIxRDRcIixcImlmclwiOlwiXFx1RDgzNVxcdUREMjZcIixcIklmclwiOlwiXFx1MjExMVwiLFwiSWdyYXZlXCI6XCJcXHUwMENDXCIsXCJpZ3JhdmVcIjpcIlxcdTAwRUNcIixcImlpXCI6XCJcXHUyMTQ4XCIsXCJpaWlpbnRcIjpcIlxcdTJBMENcIixcImlpaW50XCI6XCJcXHUyMjJEXCIsXCJpaW5maW5cIjpcIlxcdTI5RENcIixcImlpb3RhXCI6XCJcXHUyMTI5XCIsXCJJSmxpZ1wiOlwiXFx1MDEzMlwiLFwiaWpsaWdcIjpcIlxcdTAxMzNcIixcIkltYWNyXCI6XCJcXHUwMTJBXCIsXCJpbWFjclwiOlwiXFx1MDEyQlwiLFwiaW1hZ2VcIjpcIlxcdTIxMTFcIixcIkltYWdpbmFyeUlcIjpcIlxcdTIxNDhcIixcImltYWdsaW5lXCI6XCJcXHUyMTEwXCIsXCJpbWFncGFydFwiOlwiXFx1MjExMVwiLFwiaW1hdGhcIjpcIlxcdTAxMzFcIixcIkltXCI6XCJcXHUyMTExXCIsXCJpbW9mXCI6XCJcXHUyMkI3XCIsXCJpbXBlZFwiOlwiXFx1MDFCNVwiLFwiSW1wbGllc1wiOlwiXFx1MjFEMlwiLFwiaW5jYXJlXCI6XCJcXHUyMTA1XCIsXCJpblwiOlwiXFx1MjIwOFwiLFwiaW5maW5cIjpcIlxcdTIyMUVcIixcImluZmludGllXCI6XCJcXHUyOUREXCIsXCJpbm9kb3RcIjpcIlxcdTAxMzFcIixcImludGNhbFwiOlwiXFx1MjJCQVwiLFwiaW50XCI6XCJcXHUyMjJCXCIsXCJJbnRcIjpcIlxcdTIyMkNcIixcImludGVnZXJzXCI6XCJcXHUyMTI0XCIsXCJJbnRlZ3JhbFwiOlwiXFx1MjIyQlwiLFwiaW50ZXJjYWxcIjpcIlxcdTIyQkFcIixcIkludGVyc2VjdGlvblwiOlwiXFx1MjJDMlwiLFwiaW50bGFyaGtcIjpcIlxcdTJBMTdcIixcImludHByb2RcIjpcIlxcdTJBM0NcIixcIkludmlzaWJsZUNvbW1hXCI6XCJcXHUyMDYzXCIsXCJJbnZpc2libGVUaW1lc1wiOlwiXFx1MjA2MlwiLFwiSU9jeVwiOlwiXFx1MDQwMVwiLFwiaW9jeVwiOlwiXFx1MDQ1MVwiLFwiSW9nb25cIjpcIlxcdTAxMkVcIixcImlvZ29uXCI6XCJcXHUwMTJGXCIsXCJJb3BmXCI6XCJcXHVEODM1XFx1REQ0MFwiLFwiaW9wZlwiOlwiXFx1RDgzNVxcdURENUFcIixcIklvdGFcIjpcIlxcdTAzOTlcIixcImlvdGFcIjpcIlxcdTAzQjlcIixcImlwcm9kXCI6XCJcXHUyQTNDXCIsXCJpcXVlc3RcIjpcIlxcdTAwQkZcIixcImlzY3JcIjpcIlxcdUQ4MzVcXHVEQ0JFXCIsXCJJc2NyXCI6XCJcXHUyMTEwXCIsXCJpc2luXCI6XCJcXHUyMjA4XCIsXCJpc2luZG90XCI6XCJcXHUyMkY1XCIsXCJpc2luRVwiOlwiXFx1MjJGOVwiLFwiaXNpbnNcIjpcIlxcdTIyRjRcIixcImlzaW5zdlwiOlwiXFx1MjJGM1wiLFwiaXNpbnZcIjpcIlxcdTIyMDhcIixcIml0XCI6XCJcXHUyMDYyXCIsXCJJdGlsZGVcIjpcIlxcdTAxMjhcIixcIml0aWxkZVwiOlwiXFx1MDEyOVwiLFwiSXVrY3lcIjpcIlxcdTA0MDZcIixcIml1a2N5XCI6XCJcXHUwNDU2XCIsXCJJdW1sXCI6XCJcXHUwMENGXCIsXCJpdW1sXCI6XCJcXHUwMEVGXCIsXCJKY2lyY1wiOlwiXFx1MDEzNFwiLFwiamNpcmNcIjpcIlxcdTAxMzVcIixcIkpjeVwiOlwiXFx1MDQxOVwiLFwiamN5XCI6XCJcXHUwNDM5XCIsXCJKZnJcIjpcIlxcdUQ4MzVcXHVERDBEXCIsXCJqZnJcIjpcIlxcdUQ4MzVcXHVERDI3XCIsXCJqbWF0aFwiOlwiXFx1MDIzN1wiLFwiSm9wZlwiOlwiXFx1RDgzNVxcdURENDFcIixcImpvcGZcIjpcIlxcdUQ4MzVcXHVERDVCXCIsXCJKc2NyXCI6XCJcXHVEODM1XFx1RENBNVwiLFwianNjclwiOlwiXFx1RDgzNVxcdURDQkZcIixcIkpzZXJjeVwiOlwiXFx1MDQwOFwiLFwianNlcmN5XCI6XCJcXHUwNDU4XCIsXCJKdWtjeVwiOlwiXFx1MDQwNFwiLFwianVrY3lcIjpcIlxcdTA0NTRcIixcIkthcHBhXCI6XCJcXHUwMzlBXCIsXCJrYXBwYVwiOlwiXFx1MDNCQVwiLFwia2FwcGF2XCI6XCJcXHUwM0YwXCIsXCJLY2VkaWxcIjpcIlxcdTAxMzZcIixcImtjZWRpbFwiOlwiXFx1MDEzN1wiLFwiS2N5XCI6XCJcXHUwNDFBXCIsXCJrY3lcIjpcIlxcdTA0M0FcIixcIktmclwiOlwiXFx1RDgzNVxcdUREMEVcIixcImtmclwiOlwiXFx1RDgzNVxcdUREMjhcIixcImtncmVlblwiOlwiXFx1MDEzOFwiLFwiS0hjeVwiOlwiXFx1MDQyNVwiLFwia2hjeVwiOlwiXFx1MDQ0NVwiLFwiS0pjeVwiOlwiXFx1MDQwQ1wiLFwia2pjeVwiOlwiXFx1MDQ1Q1wiLFwiS29wZlwiOlwiXFx1RDgzNVxcdURENDJcIixcImtvcGZcIjpcIlxcdUQ4MzVcXHVERDVDXCIsXCJLc2NyXCI6XCJcXHVEODM1XFx1RENBNlwiLFwia3NjclwiOlwiXFx1RDgzNVxcdURDQzBcIixcImxBYXJyXCI6XCJcXHUyMURBXCIsXCJMYWN1dGVcIjpcIlxcdTAxMzlcIixcImxhY3V0ZVwiOlwiXFx1MDEzQVwiLFwibGFlbXB0eXZcIjpcIlxcdTI5QjRcIixcImxhZ3JhblwiOlwiXFx1MjExMlwiLFwiTGFtYmRhXCI6XCJcXHUwMzlCXCIsXCJsYW1iZGFcIjpcIlxcdTAzQkJcIixcImxhbmdcIjpcIlxcdTI3RThcIixcIkxhbmdcIjpcIlxcdTI3RUFcIixcImxhbmdkXCI6XCJcXHUyOTkxXCIsXCJsYW5nbGVcIjpcIlxcdTI3RThcIixcImxhcFwiOlwiXFx1MkE4NVwiLFwiTGFwbGFjZXRyZlwiOlwiXFx1MjExMlwiLFwibGFxdW9cIjpcIlxcdTAwQUJcIixcImxhcnJiXCI6XCJcXHUyMUU0XCIsXCJsYXJyYmZzXCI6XCJcXHUyOTFGXCIsXCJsYXJyXCI6XCJcXHUyMTkwXCIsXCJMYXJyXCI6XCJcXHUyMTlFXCIsXCJsQXJyXCI6XCJcXHUyMUQwXCIsXCJsYXJyZnNcIjpcIlxcdTI5MURcIixcImxhcnJoa1wiOlwiXFx1MjFBOVwiLFwibGFycmxwXCI6XCJcXHUyMUFCXCIsXCJsYXJycGxcIjpcIlxcdTI5MzlcIixcImxhcnJzaW1cIjpcIlxcdTI5NzNcIixcImxhcnJ0bFwiOlwiXFx1MjFBMlwiLFwibGF0YWlsXCI6XCJcXHUyOTE5XCIsXCJsQXRhaWxcIjpcIlxcdTI5MUJcIixcImxhdFwiOlwiXFx1MkFBQlwiLFwibGF0ZVwiOlwiXFx1MkFBRFwiLFwibGF0ZXNcIjpcIlxcdTJBQURcXHVGRTAwXCIsXCJsYmFyclwiOlwiXFx1MjkwQ1wiLFwibEJhcnJcIjpcIlxcdTI5MEVcIixcImxiYnJrXCI6XCJcXHUyNzcyXCIsXCJsYnJhY2VcIjpcIntcIixcImxicmFja1wiOlwiW1wiLFwibGJya2VcIjpcIlxcdTI5OEJcIixcImxicmtzbGRcIjpcIlxcdTI5OEZcIixcImxicmtzbHVcIjpcIlxcdTI5OERcIixcIkxjYXJvblwiOlwiXFx1MDEzRFwiLFwibGNhcm9uXCI6XCJcXHUwMTNFXCIsXCJMY2VkaWxcIjpcIlxcdTAxM0JcIixcImxjZWRpbFwiOlwiXFx1MDEzQ1wiLFwibGNlaWxcIjpcIlxcdTIzMDhcIixcImxjdWJcIjpcIntcIixcIkxjeVwiOlwiXFx1MDQxQlwiLFwibGN5XCI6XCJcXHUwNDNCXCIsXCJsZGNhXCI6XCJcXHUyOTM2XCIsXCJsZHF1b1wiOlwiXFx1MjAxQ1wiLFwibGRxdW9yXCI6XCJcXHUyMDFFXCIsXCJsZHJkaGFyXCI6XCJcXHUyOTY3XCIsXCJsZHJ1c2hhclwiOlwiXFx1Mjk0QlwiLFwibGRzaFwiOlwiXFx1MjFCMlwiLFwibGVcIjpcIlxcdTIyNjRcIixcImxFXCI6XCJcXHUyMjY2XCIsXCJMZWZ0QW5nbGVCcmFja2V0XCI6XCJcXHUyN0U4XCIsXCJMZWZ0QXJyb3dCYXJcIjpcIlxcdTIxRTRcIixcImxlZnRhcnJvd1wiOlwiXFx1MjE5MFwiLFwiTGVmdEFycm93XCI6XCJcXHUyMTkwXCIsXCJMZWZ0YXJyb3dcIjpcIlxcdTIxRDBcIixcIkxlZnRBcnJvd1JpZ2h0QXJyb3dcIjpcIlxcdTIxQzZcIixcImxlZnRhcnJvd3RhaWxcIjpcIlxcdTIxQTJcIixcIkxlZnRDZWlsaW5nXCI6XCJcXHUyMzA4XCIsXCJMZWZ0RG91YmxlQnJhY2tldFwiOlwiXFx1MjdFNlwiLFwiTGVmdERvd25UZWVWZWN0b3JcIjpcIlxcdTI5NjFcIixcIkxlZnREb3duVmVjdG9yQmFyXCI6XCJcXHUyOTU5XCIsXCJMZWZ0RG93blZlY3RvclwiOlwiXFx1MjFDM1wiLFwiTGVmdEZsb29yXCI6XCJcXHUyMzBBXCIsXCJsZWZ0aGFycG9vbmRvd25cIjpcIlxcdTIxQkRcIixcImxlZnRoYXJwb29udXBcIjpcIlxcdTIxQkNcIixcImxlZnRsZWZ0YXJyb3dzXCI6XCJcXHUyMUM3XCIsXCJsZWZ0cmlnaHRhcnJvd1wiOlwiXFx1MjE5NFwiLFwiTGVmdFJpZ2h0QXJyb3dcIjpcIlxcdTIxOTRcIixcIkxlZnRyaWdodGFycm93XCI6XCJcXHUyMUQ0XCIsXCJsZWZ0cmlnaHRhcnJvd3NcIjpcIlxcdTIxQzZcIixcImxlZnRyaWdodGhhcnBvb25zXCI6XCJcXHUyMUNCXCIsXCJsZWZ0cmlnaHRzcXVpZ2Fycm93XCI6XCJcXHUyMUFEXCIsXCJMZWZ0UmlnaHRWZWN0b3JcIjpcIlxcdTI5NEVcIixcIkxlZnRUZWVBcnJvd1wiOlwiXFx1MjFBNFwiLFwiTGVmdFRlZVwiOlwiXFx1MjJBM1wiLFwiTGVmdFRlZVZlY3RvclwiOlwiXFx1Mjk1QVwiLFwibGVmdHRocmVldGltZXNcIjpcIlxcdTIyQ0JcIixcIkxlZnRUcmlhbmdsZUJhclwiOlwiXFx1MjlDRlwiLFwiTGVmdFRyaWFuZ2xlXCI6XCJcXHUyMkIyXCIsXCJMZWZ0VHJpYW5nbGVFcXVhbFwiOlwiXFx1MjJCNFwiLFwiTGVmdFVwRG93blZlY3RvclwiOlwiXFx1Mjk1MVwiLFwiTGVmdFVwVGVlVmVjdG9yXCI6XCJcXHUyOTYwXCIsXCJMZWZ0VXBWZWN0b3JCYXJcIjpcIlxcdTI5NThcIixcIkxlZnRVcFZlY3RvclwiOlwiXFx1MjFCRlwiLFwiTGVmdFZlY3RvckJhclwiOlwiXFx1Mjk1MlwiLFwiTGVmdFZlY3RvclwiOlwiXFx1MjFCQ1wiLFwibEVnXCI6XCJcXHUyQThCXCIsXCJsZWdcIjpcIlxcdTIyREFcIixcImxlcVwiOlwiXFx1MjI2NFwiLFwibGVxcVwiOlwiXFx1MjI2NlwiLFwibGVxc2xhbnRcIjpcIlxcdTJBN0RcIixcImxlc2NjXCI6XCJcXHUyQUE4XCIsXCJsZXNcIjpcIlxcdTJBN0RcIixcImxlc2RvdFwiOlwiXFx1MkE3RlwiLFwibGVzZG90b1wiOlwiXFx1MkE4MVwiLFwibGVzZG90b3JcIjpcIlxcdTJBODNcIixcImxlc2dcIjpcIlxcdTIyREFcXHVGRTAwXCIsXCJsZXNnZXNcIjpcIlxcdTJBOTNcIixcImxlc3NhcHByb3hcIjpcIlxcdTJBODVcIixcImxlc3Nkb3RcIjpcIlxcdTIyRDZcIixcImxlc3NlcWd0clwiOlwiXFx1MjJEQVwiLFwibGVzc2VxcWd0clwiOlwiXFx1MkE4QlwiLFwiTGVzc0VxdWFsR3JlYXRlclwiOlwiXFx1MjJEQVwiLFwiTGVzc0Z1bGxFcXVhbFwiOlwiXFx1MjI2NlwiLFwiTGVzc0dyZWF0ZXJcIjpcIlxcdTIyNzZcIixcImxlc3NndHJcIjpcIlxcdTIyNzZcIixcIkxlc3NMZXNzXCI6XCJcXHUyQUExXCIsXCJsZXNzc2ltXCI6XCJcXHUyMjcyXCIsXCJMZXNzU2xhbnRFcXVhbFwiOlwiXFx1MkE3RFwiLFwiTGVzc1RpbGRlXCI6XCJcXHUyMjcyXCIsXCJsZmlzaHRcIjpcIlxcdTI5N0NcIixcImxmbG9vclwiOlwiXFx1MjMwQVwiLFwiTGZyXCI6XCJcXHVEODM1XFx1REQwRlwiLFwibGZyXCI6XCJcXHVEODM1XFx1REQyOVwiLFwibGdcIjpcIlxcdTIyNzZcIixcImxnRVwiOlwiXFx1MkE5MVwiLFwibEhhclwiOlwiXFx1Mjk2MlwiLFwibGhhcmRcIjpcIlxcdTIxQkRcIixcImxoYXJ1XCI6XCJcXHUyMUJDXCIsXCJsaGFydWxcIjpcIlxcdTI5NkFcIixcImxoYmxrXCI6XCJcXHUyNTg0XCIsXCJMSmN5XCI6XCJcXHUwNDA5XCIsXCJsamN5XCI6XCJcXHUwNDU5XCIsXCJsbGFyclwiOlwiXFx1MjFDN1wiLFwibGxcIjpcIlxcdTIyNkFcIixcIkxsXCI6XCJcXHUyMkQ4XCIsXCJsbGNvcm5lclwiOlwiXFx1MjMxRVwiLFwiTGxlZnRhcnJvd1wiOlwiXFx1MjFEQVwiLFwibGxoYXJkXCI6XCJcXHUyOTZCXCIsXCJsbHRyaVwiOlwiXFx1MjVGQVwiLFwiTG1pZG90XCI6XCJcXHUwMTNGXCIsXCJsbWlkb3RcIjpcIlxcdTAxNDBcIixcImxtb3VzdGFjaGVcIjpcIlxcdTIzQjBcIixcImxtb3VzdFwiOlwiXFx1MjNCMFwiLFwibG5hcFwiOlwiXFx1MkE4OVwiLFwibG5hcHByb3hcIjpcIlxcdTJBODlcIixcImxuZVwiOlwiXFx1MkE4N1wiLFwibG5FXCI6XCJcXHUyMjY4XCIsXCJsbmVxXCI6XCJcXHUyQTg3XCIsXCJsbmVxcVwiOlwiXFx1MjI2OFwiLFwibG5zaW1cIjpcIlxcdTIyRTZcIixcImxvYW5nXCI6XCJcXHUyN0VDXCIsXCJsb2FyclwiOlwiXFx1MjFGRFwiLFwibG9icmtcIjpcIlxcdTI3RTZcIixcImxvbmdsZWZ0YXJyb3dcIjpcIlxcdTI3RjVcIixcIkxvbmdMZWZ0QXJyb3dcIjpcIlxcdTI3RjVcIixcIkxvbmdsZWZ0YXJyb3dcIjpcIlxcdTI3RjhcIixcImxvbmdsZWZ0cmlnaHRhcnJvd1wiOlwiXFx1MjdGN1wiLFwiTG9uZ0xlZnRSaWdodEFycm93XCI6XCJcXHUyN0Y3XCIsXCJMb25nbGVmdHJpZ2h0YXJyb3dcIjpcIlxcdTI3RkFcIixcImxvbmdtYXBzdG9cIjpcIlxcdTI3RkNcIixcImxvbmdyaWdodGFycm93XCI6XCJcXHUyN0Y2XCIsXCJMb25nUmlnaHRBcnJvd1wiOlwiXFx1MjdGNlwiLFwiTG9uZ3JpZ2h0YXJyb3dcIjpcIlxcdTI3RjlcIixcImxvb3BhcnJvd2xlZnRcIjpcIlxcdTIxQUJcIixcImxvb3BhcnJvd3JpZ2h0XCI6XCJcXHUyMUFDXCIsXCJsb3BhclwiOlwiXFx1Mjk4NVwiLFwiTG9wZlwiOlwiXFx1RDgzNVxcdURENDNcIixcImxvcGZcIjpcIlxcdUQ4MzVcXHVERDVEXCIsXCJsb3BsdXNcIjpcIlxcdTJBMkRcIixcImxvdGltZXNcIjpcIlxcdTJBMzRcIixcImxvd2FzdFwiOlwiXFx1MjIxN1wiLFwibG93YmFyXCI6XCJfXCIsXCJMb3dlckxlZnRBcnJvd1wiOlwiXFx1MjE5OVwiLFwiTG93ZXJSaWdodEFycm93XCI6XCJcXHUyMTk4XCIsXCJsb3pcIjpcIlxcdTI1Q0FcIixcImxvemVuZ2VcIjpcIlxcdTI1Q0FcIixcImxvemZcIjpcIlxcdTI5RUJcIixcImxwYXJcIjpcIihcIixcImxwYXJsdFwiOlwiXFx1Mjk5M1wiLFwibHJhcnJcIjpcIlxcdTIxQzZcIixcImxyY29ybmVyXCI6XCJcXHUyMzFGXCIsXCJscmhhclwiOlwiXFx1MjFDQlwiLFwibHJoYXJkXCI6XCJcXHUyOTZEXCIsXCJscm1cIjpcIlxcdTIwMEVcIixcImxydHJpXCI6XCJcXHUyMkJGXCIsXCJsc2FxdW9cIjpcIlxcdTIwMzlcIixcImxzY3JcIjpcIlxcdUQ4MzVcXHVEQ0MxXCIsXCJMc2NyXCI6XCJcXHUyMTEyXCIsXCJsc2hcIjpcIlxcdTIxQjBcIixcIkxzaFwiOlwiXFx1MjFCMFwiLFwibHNpbVwiOlwiXFx1MjI3MlwiLFwibHNpbWVcIjpcIlxcdTJBOERcIixcImxzaW1nXCI6XCJcXHUyQThGXCIsXCJsc3FiXCI6XCJbXCIsXCJsc3F1b1wiOlwiXFx1MjAxOFwiLFwibHNxdW9yXCI6XCJcXHUyMDFBXCIsXCJMc3Ryb2tcIjpcIlxcdTAxNDFcIixcImxzdHJva1wiOlwiXFx1MDE0MlwiLFwibHRjY1wiOlwiXFx1MkFBNlwiLFwibHRjaXJcIjpcIlxcdTJBNzlcIixcImx0XCI6XCI8XCIsXCJMVFwiOlwiPFwiLFwiTHRcIjpcIlxcdTIyNkFcIixcImx0ZG90XCI6XCJcXHUyMkQ2XCIsXCJsdGhyZWVcIjpcIlxcdTIyQ0JcIixcImx0aW1lc1wiOlwiXFx1MjJDOVwiLFwibHRsYXJyXCI6XCJcXHUyOTc2XCIsXCJsdHF1ZXN0XCI6XCJcXHUyQTdCXCIsXCJsdHJpXCI6XCJcXHUyNUMzXCIsXCJsdHJpZVwiOlwiXFx1MjJCNFwiLFwibHRyaWZcIjpcIlxcdTI1QzJcIixcImx0clBhclwiOlwiXFx1Mjk5NlwiLFwibHVyZHNoYXJcIjpcIlxcdTI5NEFcIixcImx1cnVoYXJcIjpcIlxcdTI5NjZcIixcImx2ZXJ0bmVxcVwiOlwiXFx1MjI2OFxcdUZFMDBcIixcImx2bkVcIjpcIlxcdTIyNjhcXHVGRTAwXCIsXCJtYWNyXCI6XCJcXHUwMEFGXCIsXCJtYWxlXCI6XCJcXHUyNjQyXCIsXCJtYWx0XCI6XCJcXHUyNzIwXCIsXCJtYWx0ZXNlXCI6XCJcXHUyNzIwXCIsXCJNYXBcIjpcIlxcdTI5MDVcIixcIm1hcFwiOlwiXFx1MjFBNlwiLFwibWFwc3RvXCI6XCJcXHUyMUE2XCIsXCJtYXBzdG9kb3duXCI6XCJcXHUyMUE3XCIsXCJtYXBzdG9sZWZ0XCI6XCJcXHUyMUE0XCIsXCJtYXBzdG91cFwiOlwiXFx1MjFBNVwiLFwibWFya2VyXCI6XCJcXHUyNUFFXCIsXCJtY29tbWFcIjpcIlxcdTJBMjlcIixcIk1jeVwiOlwiXFx1MDQxQ1wiLFwibWN5XCI6XCJcXHUwNDNDXCIsXCJtZGFzaFwiOlwiXFx1MjAxNFwiLFwibUREb3RcIjpcIlxcdTIyM0FcIixcIm1lYXN1cmVkYW5nbGVcIjpcIlxcdTIyMjFcIixcIk1lZGl1bVNwYWNlXCI6XCJcXHUyMDVGXCIsXCJNZWxsaW50cmZcIjpcIlxcdTIxMzNcIixcIk1mclwiOlwiXFx1RDgzNVxcdUREMTBcIixcIm1mclwiOlwiXFx1RDgzNVxcdUREMkFcIixcIm1ob1wiOlwiXFx1MjEyN1wiLFwibWljcm9cIjpcIlxcdTAwQjVcIixcIm1pZGFzdFwiOlwiKlwiLFwibWlkY2lyXCI6XCJcXHUyQUYwXCIsXCJtaWRcIjpcIlxcdTIyMjNcIixcIm1pZGRvdFwiOlwiXFx1MDBCN1wiLFwibWludXNiXCI6XCJcXHUyMjlGXCIsXCJtaW51c1wiOlwiXFx1MjIxMlwiLFwibWludXNkXCI6XCJcXHUyMjM4XCIsXCJtaW51c2R1XCI6XCJcXHUyQTJBXCIsXCJNaW51c1BsdXNcIjpcIlxcdTIyMTNcIixcIm1sY3BcIjpcIlxcdTJBREJcIixcIm1sZHJcIjpcIlxcdTIwMjZcIixcIm1ucGx1c1wiOlwiXFx1MjIxM1wiLFwibW9kZWxzXCI6XCJcXHUyMkE3XCIsXCJNb3BmXCI6XCJcXHVEODM1XFx1REQ0NFwiLFwibW9wZlwiOlwiXFx1RDgzNVxcdURENUVcIixcIm1wXCI6XCJcXHUyMjEzXCIsXCJtc2NyXCI6XCJcXHVEODM1XFx1RENDMlwiLFwiTXNjclwiOlwiXFx1MjEzM1wiLFwibXN0cG9zXCI6XCJcXHUyMjNFXCIsXCJNdVwiOlwiXFx1MDM5Q1wiLFwibXVcIjpcIlxcdTAzQkNcIixcIm11bHRpbWFwXCI6XCJcXHUyMkI4XCIsXCJtdW1hcFwiOlwiXFx1MjJCOFwiLFwibmFibGFcIjpcIlxcdTIyMDdcIixcIk5hY3V0ZVwiOlwiXFx1MDE0M1wiLFwibmFjdXRlXCI6XCJcXHUwMTQ0XCIsXCJuYW5nXCI6XCJcXHUyMjIwXFx1MjBEMlwiLFwibmFwXCI6XCJcXHUyMjQ5XCIsXCJuYXBFXCI6XCJcXHUyQTcwXFx1MDMzOFwiLFwibmFwaWRcIjpcIlxcdTIyNEJcXHUwMzM4XCIsXCJuYXBvc1wiOlwiXFx1MDE0OVwiLFwibmFwcHJveFwiOlwiXFx1MjI0OVwiLFwibmF0dXJhbFwiOlwiXFx1MjY2RVwiLFwibmF0dXJhbHNcIjpcIlxcdTIxMTVcIixcIm5hdHVyXCI6XCJcXHUyNjZFXCIsXCJuYnNwXCI6XCJcXHUwMEEwXCIsXCJuYnVtcFwiOlwiXFx1MjI0RVxcdTAzMzhcIixcIm5idW1wZVwiOlwiXFx1MjI0RlxcdTAzMzhcIixcIm5jYXBcIjpcIlxcdTJBNDNcIixcIk5jYXJvblwiOlwiXFx1MDE0N1wiLFwibmNhcm9uXCI6XCJcXHUwMTQ4XCIsXCJOY2VkaWxcIjpcIlxcdTAxNDVcIixcIm5jZWRpbFwiOlwiXFx1MDE0NlwiLFwibmNvbmdcIjpcIlxcdTIyNDdcIixcIm5jb25nZG90XCI6XCJcXHUyQTZEXFx1MDMzOFwiLFwibmN1cFwiOlwiXFx1MkE0MlwiLFwiTmN5XCI6XCJcXHUwNDFEXCIsXCJuY3lcIjpcIlxcdTA0M0RcIixcIm5kYXNoXCI6XCJcXHUyMDEzXCIsXCJuZWFyaGtcIjpcIlxcdTI5MjRcIixcIm5lYXJyXCI6XCJcXHUyMTk3XCIsXCJuZUFyclwiOlwiXFx1MjFEN1wiLFwibmVhcnJvd1wiOlwiXFx1MjE5N1wiLFwibmVcIjpcIlxcdTIyNjBcIixcIm5lZG90XCI6XCJcXHUyMjUwXFx1MDMzOFwiLFwiTmVnYXRpdmVNZWRpdW1TcGFjZVwiOlwiXFx1MjAwQlwiLFwiTmVnYXRpdmVUaGlja1NwYWNlXCI6XCJcXHUyMDBCXCIsXCJOZWdhdGl2ZVRoaW5TcGFjZVwiOlwiXFx1MjAwQlwiLFwiTmVnYXRpdmVWZXJ5VGhpblNwYWNlXCI6XCJcXHUyMDBCXCIsXCJuZXF1aXZcIjpcIlxcdTIyNjJcIixcIm5lc2VhclwiOlwiXFx1MjkyOFwiLFwibmVzaW1cIjpcIlxcdTIyNDJcXHUwMzM4XCIsXCJOZXN0ZWRHcmVhdGVyR3JlYXRlclwiOlwiXFx1MjI2QlwiLFwiTmVzdGVkTGVzc0xlc3NcIjpcIlxcdTIyNkFcIixcIk5ld0xpbmVcIjpcIlxcblwiLFwibmV4aXN0XCI6XCJcXHUyMjA0XCIsXCJuZXhpc3RzXCI6XCJcXHUyMjA0XCIsXCJOZnJcIjpcIlxcdUQ4MzVcXHVERDExXCIsXCJuZnJcIjpcIlxcdUQ4MzVcXHVERDJCXCIsXCJuZ0VcIjpcIlxcdTIyNjdcXHUwMzM4XCIsXCJuZ2VcIjpcIlxcdTIyNzFcIixcIm5nZXFcIjpcIlxcdTIyNzFcIixcIm5nZXFxXCI6XCJcXHUyMjY3XFx1MDMzOFwiLFwibmdlcXNsYW50XCI6XCJcXHUyQTdFXFx1MDMzOFwiLFwibmdlc1wiOlwiXFx1MkE3RVxcdTAzMzhcIixcIm5HZ1wiOlwiXFx1MjJEOVxcdTAzMzhcIixcIm5nc2ltXCI6XCJcXHUyMjc1XCIsXCJuR3RcIjpcIlxcdTIyNkJcXHUyMEQyXCIsXCJuZ3RcIjpcIlxcdTIyNkZcIixcIm5ndHJcIjpcIlxcdTIyNkZcIixcIm5HdHZcIjpcIlxcdTIyNkJcXHUwMzM4XCIsXCJuaGFyclwiOlwiXFx1MjFBRVwiLFwibmhBcnJcIjpcIlxcdTIxQ0VcIixcIm5ocGFyXCI6XCJcXHUyQUYyXCIsXCJuaVwiOlwiXFx1MjIwQlwiLFwibmlzXCI6XCJcXHUyMkZDXCIsXCJuaXNkXCI6XCJcXHUyMkZBXCIsXCJuaXZcIjpcIlxcdTIyMEJcIixcIk5KY3lcIjpcIlxcdTA0MEFcIixcIm5qY3lcIjpcIlxcdTA0NUFcIixcIm5sYXJyXCI6XCJcXHUyMTlBXCIsXCJubEFyclwiOlwiXFx1MjFDRFwiLFwibmxkclwiOlwiXFx1MjAyNVwiLFwibmxFXCI6XCJcXHUyMjY2XFx1MDMzOFwiLFwibmxlXCI6XCJcXHUyMjcwXCIsXCJubGVmdGFycm93XCI6XCJcXHUyMTlBXCIsXCJuTGVmdGFycm93XCI6XCJcXHUyMUNEXCIsXCJubGVmdHJpZ2h0YXJyb3dcIjpcIlxcdTIxQUVcIixcIm5MZWZ0cmlnaHRhcnJvd1wiOlwiXFx1MjFDRVwiLFwibmxlcVwiOlwiXFx1MjI3MFwiLFwibmxlcXFcIjpcIlxcdTIyNjZcXHUwMzM4XCIsXCJubGVxc2xhbnRcIjpcIlxcdTJBN0RcXHUwMzM4XCIsXCJubGVzXCI6XCJcXHUyQTdEXFx1MDMzOFwiLFwibmxlc3NcIjpcIlxcdTIyNkVcIixcIm5MbFwiOlwiXFx1MjJEOFxcdTAzMzhcIixcIm5sc2ltXCI6XCJcXHUyMjc0XCIsXCJuTHRcIjpcIlxcdTIyNkFcXHUyMEQyXCIsXCJubHRcIjpcIlxcdTIyNkVcIixcIm5sdHJpXCI6XCJcXHUyMkVBXCIsXCJubHRyaWVcIjpcIlxcdTIyRUNcIixcIm5MdHZcIjpcIlxcdTIyNkFcXHUwMzM4XCIsXCJubWlkXCI6XCJcXHUyMjI0XCIsXCJOb0JyZWFrXCI6XCJcXHUyMDYwXCIsXCJOb25CcmVha2luZ1NwYWNlXCI6XCJcXHUwMEEwXCIsXCJub3BmXCI6XCJcXHVEODM1XFx1REQ1RlwiLFwiTm9wZlwiOlwiXFx1MjExNVwiLFwiTm90XCI6XCJcXHUyQUVDXCIsXCJub3RcIjpcIlxcdTAwQUNcIixcIk5vdENvbmdydWVudFwiOlwiXFx1MjI2MlwiLFwiTm90Q3VwQ2FwXCI6XCJcXHUyMjZEXCIsXCJOb3REb3VibGVWZXJ0aWNhbEJhclwiOlwiXFx1MjIyNlwiLFwiTm90RWxlbWVudFwiOlwiXFx1MjIwOVwiLFwiTm90RXF1YWxcIjpcIlxcdTIyNjBcIixcIk5vdEVxdWFsVGlsZGVcIjpcIlxcdTIyNDJcXHUwMzM4XCIsXCJOb3RFeGlzdHNcIjpcIlxcdTIyMDRcIixcIk5vdEdyZWF0ZXJcIjpcIlxcdTIyNkZcIixcIk5vdEdyZWF0ZXJFcXVhbFwiOlwiXFx1MjI3MVwiLFwiTm90R3JlYXRlckZ1bGxFcXVhbFwiOlwiXFx1MjI2N1xcdTAzMzhcIixcIk5vdEdyZWF0ZXJHcmVhdGVyXCI6XCJcXHUyMjZCXFx1MDMzOFwiLFwiTm90R3JlYXRlckxlc3NcIjpcIlxcdTIyNzlcIixcIk5vdEdyZWF0ZXJTbGFudEVxdWFsXCI6XCJcXHUyQTdFXFx1MDMzOFwiLFwiTm90R3JlYXRlclRpbGRlXCI6XCJcXHUyMjc1XCIsXCJOb3RIdW1wRG93bkh1bXBcIjpcIlxcdTIyNEVcXHUwMzM4XCIsXCJOb3RIdW1wRXF1YWxcIjpcIlxcdTIyNEZcXHUwMzM4XCIsXCJub3RpblwiOlwiXFx1MjIwOVwiLFwibm90aW5kb3RcIjpcIlxcdTIyRjVcXHUwMzM4XCIsXCJub3RpbkVcIjpcIlxcdTIyRjlcXHUwMzM4XCIsXCJub3RpbnZhXCI6XCJcXHUyMjA5XCIsXCJub3RpbnZiXCI6XCJcXHUyMkY3XCIsXCJub3RpbnZjXCI6XCJcXHUyMkY2XCIsXCJOb3RMZWZ0VHJpYW5nbGVCYXJcIjpcIlxcdTI5Q0ZcXHUwMzM4XCIsXCJOb3RMZWZ0VHJpYW5nbGVcIjpcIlxcdTIyRUFcIixcIk5vdExlZnRUcmlhbmdsZUVxdWFsXCI6XCJcXHUyMkVDXCIsXCJOb3RMZXNzXCI6XCJcXHUyMjZFXCIsXCJOb3RMZXNzRXF1YWxcIjpcIlxcdTIyNzBcIixcIk5vdExlc3NHcmVhdGVyXCI6XCJcXHUyMjc4XCIsXCJOb3RMZXNzTGVzc1wiOlwiXFx1MjI2QVxcdTAzMzhcIixcIk5vdExlc3NTbGFudEVxdWFsXCI6XCJcXHUyQTdEXFx1MDMzOFwiLFwiTm90TGVzc1RpbGRlXCI6XCJcXHUyMjc0XCIsXCJOb3ROZXN0ZWRHcmVhdGVyR3JlYXRlclwiOlwiXFx1MkFBMlxcdTAzMzhcIixcIk5vdE5lc3RlZExlc3NMZXNzXCI6XCJcXHUyQUExXFx1MDMzOFwiLFwibm90bmlcIjpcIlxcdTIyMENcIixcIm5vdG5pdmFcIjpcIlxcdTIyMENcIixcIm5vdG5pdmJcIjpcIlxcdTIyRkVcIixcIm5vdG5pdmNcIjpcIlxcdTIyRkRcIixcIk5vdFByZWNlZGVzXCI6XCJcXHUyMjgwXCIsXCJOb3RQcmVjZWRlc0VxdWFsXCI6XCJcXHUyQUFGXFx1MDMzOFwiLFwiTm90UHJlY2VkZXNTbGFudEVxdWFsXCI6XCJcXHUyMkUwXCIsXCJOb3RSZXZlcnNlRWxlbWVudFwiOlwiXFx1MjIwQ1wiLFwiTm90UmlnaHRUcmlhbmdsZUJhclwiOlwiXFx1MjlEMFxcdTAzMzhcIixcIk5vdFJpZ2h0VHJpYW5nbGVcIjpcIlxcdTIyRUJcIixcIk5vdFJpZ2h0VHJpYW5nbGVFcXVhbFwiOlwiXFx1MjJFRFwiLFwiTm90U3F1YXJlU3Vic2V0XCI6XCJcXHUyMjhGXFx1MDMzOFwiLFwiTm90U3F1YXJlU3Vic2V0RXF1YWxcIjpcIlxcdTIyRTJcIixcIk5vdFNxdWFyZVN1cGVyc2V0XCI6XCJcXHUyMjkwXFx1MDMzOFwiLFwiTm90U3F1YXJlU3VwZXJzZXRFcXVhbFwiOlwiXFx1MjJFM1wiLFwiTm90U3Vic2V0XCI6XCJcXHUyMjgyXFx1MjBEMlwiLFwiTm90U3Vic2V0RXF1YWxcIjpcIlxcdTIyODhcIixcIk5vdFN1Y2NlZWRzXCI6XCJcXHUyMjgxXCIsXCJOb3RTdWNjZWVkc0VxdWFsXCI6XCJcXHUyQUIwXFx1MDMzOFwiLFwiTm90U3VjY2VlZHNTbGFudEVxdWFsXCI6XCJcXHUyMkUxXCIsXCJOb3RTdWNjZWVkc1RpbGRlXCI6XCJcXHUyMjdGXFx1MDMzOFwiLFwiTm90U3VwZXJzZXRcIjpcIlxcdTIyODNcXHUyMEQyXCIsXCJOb3RTdXBlcnNldEVxdWFsXCI6XCJcXHUyMjg5XCIsXCJOb3RUaWxkZVwiOlwiXFx1MjI0MVwiLFwiTm90VGlsZGVFcXVhbFwiOlwiXFx1MjI0NFwiLFwiTm90VGlsZGVGdWxsRXF1YWxcIjpcIlxcdTIyNDdcIixcIk5vdFRpbGRlVGlsZGVcIjpcIlxcdTIyNDlcIixcIk5vdFZlcnRpY2FsQmFyXCI6XCJcXHUyMjI0XCIsXCJucGFyYWxsZWxcIjpcIlxcdTIyMjZcIixcIm5wYXJcIjpcIlxcdTIyMjZcIixcIm5wYXJzbFwiOlwiXFx1MkFGRFxcdTIwRTVcIixcIm5wYXJ0XCI6XCJcXHUyMjAyXFx1MDMzOFwiLFwibnBvbGludFwiOlwiXFx1MkExNFwiLFwibnByXCI6XCJcXHUyMjgwXCIsXCJucHJjdWVcIjpcIlxcdTIyRTBcIixcIm5wcmVjXCI6XCJcXHUyMjgwXCIsXCJucHJlY2VxXCI6XCJcXHUyQUFGXFx1MDMzOFwiLFwibnByZVwiOlwiXFx1MkFBRlxcdTAzMzhcIixcIm5yYXJyY1wiOlwiXFx1MjkzM1xcdTAzMzhcIixcIm5yYXJyXCI6XCJcXHUyMTlCXCIsXCJuckFyclwiOlwiXFx1MjFDRlwiLFwibnJhcnJ3XCI6XCJcXHUyMTlEXFx1MDMzOFwiLFwibnJpZ2h0YXJyb3dcIjpcIlxcdTIxOUJcIixcIm5SaWdodGFycm93XCI6XCJcXHUyMUNGXCIsXCJucnRyaVwiOlwiXFx1MjJFQlwiLFwibnJ0cmllXCI6XCJcXHUyMkVEXCIsXCJuc2NcIjpcIlxcdTIyODFcIixcIm5zY2N1ZVwiOlwiXFx1MjJFMVwiLFwibnNjZVwiOlwiXFx1MkFCMFxcdTAzMzhcIixcIk5zY3JcIjpcIlxcdUQ4MzVcXHVEQ0E5XCIsXCJuc2NyXCI6XCJcXHVEODM1XFx1RENDM1wiLFwibnNob3J0bWlkXCI6XCJcXHUyMjI0XCIsXCJuc2hvcnRwYXJhbGxlbFwiOlwiXFx1MjIyNlwiLFwibnNpbVwiOlwiXFx1MjI0MVwiLFwibnNpbWVcIjpcIlxcdTIyNDRcIixcIm5zaW1lcVwiOlwiXFx1MjI0NFwiLFwibnNtaWRcIjpcIlxcdTIyMjRcIixcIm5zcGFyXCI6XCJcXHUyMjI2XCIsXCJuc3FzdWJlXCI6XCJcXHUyMkUyXCIsXCJuc3FzdXBlXCI6XCJcXHUyMkUzXCIsXCJuc3ViXCI6XCJcXHUyMjg0XCIsXCJuc3ViRVwiOlwiXFx1MkFDNVxcdTAzMzhcIixcIm5zdWJlXCI6XCJcXHUyMjg4XCIsXCJuc3Vic2V0XCI6XCJcXHUyMjgyXFx1MjBEMlwiLFwibnN1YnNldGVxXCI6XCJcXHUyMjg4XCIsXCJuc3Vic2V0ZXFxXCI6XCJcXHUyQUM1XFx1MDMzOFwiLFwibnN1Y2NcIjpcIlxcdTIyODFcIixcIm5zdWNjZXFcIjpcIlxcdTJBQjBcXHUwMzM4XCIsXCJuc3VwXCI6XCJcXHUyMjg1XCIsXCJuc3VwRVwiOlwiXFx1MkFDNlxcdTAzMzhcIixcIm5zdXBlXCI6XCJcXHUyMjg5XCIsXCJuc3Vwc2V0XCI6XCJcXHUyMjgzXFx1MjBEMlwiLFwibnN1cHNldGVxXCI6XCJcXHUyMjg5XCIsXCJuc3Vwc2V0ZXFxXCI6XCJcXHUyQUM2XFx1MDMzOFwiLFwibnRnbFwiOlwiXFx1MjI3OVwiLFwiTnRpbGRlXCI6XCJcXHUwMEQxXCIsXCJudGlsZGVcIjpcIlxcdTAwRjFcIixcIm50bGdcIjpcIlxcdTIyNzhcIixcIm50cmlhbmdsZWxlZnRcIjpcIlxcdTIyRUFcIixcIm50cmlhbmdsZWxlZnRlcVwiOlwiXFx1MjJFQ1wiLFwibnRyaWFuZ2xlcmlnaHRcIjpcIlxcdTIyRUJcIixcIm50cmlhbmdsZXJpZ2h0ZXFcIjpcIlxcdTIyRURcIixcIk51XCI6XCJcXHUwMzlEXCIsXCJudVwiOlwiXFx1MDNCRFwiLFwibnVtXCI6XCIjXCIsXCJudW1lcm9cIjpcIlxcdTIxMTZcIixcIm51bXNwXCI6XCJcXHUyMDA3XCIsXCJudmFwXCI6XCJcXHUyMjREXFx1MjBEMlwiLFwibnZkYXNoXCI6XCJcXHUyMkFDXCIsXCJudkRhc2hcIjpcIlxcdTIyQURcIixcIm5WZGFzaFwiOlwiXFx1MjJBRVwiLFwiblZEYXNoXCI6XCJcXHUyMkFGXCIsXCJudmdlXCI6XCJcXHUyMjY1XFx1MjBEMlwiLFwibnZndFwiOlwiPlxcdTIwRDJcIixcIm52SGFyclwiOlwiXFx1MjkwNFwiLFwibnZpbmZpblwiOlwiXFx1MjlERVwiLFwibnZsQXJyXCI6XCJcXHUyOTAyXCIsXCJudmxlXCI6XCJcXHUyMjY0XFx1MjBEMlwiLFwibnZsdFwiOlwiPFxcdTIwRDJcIixcIm52bHRyaWVcIjpcIlxcdTIyQjRcXHUyMEQyXCIsXCJudnJBcnJcIjpcIlxcdTI5MDNcIixcIm52cnRyaWVcIjpcIlxcdTIyQjVcXHUyMEQyXCIsXCJudnNpbVwiOlwiXFx1MjIzQ1xcdTIwRDJcIixcIm53YXJoa1wiOlwiXFx1MjkyM1wiLFwibndhcnJcIjpcIlxcdTIxOTZcIixcIm53QXJyXCI6XCJcXHUyMUQ2XCIsXCJud2Fycm93XCI6XCJcXHUyMTk2XCIsXCJud25lYXJcIjpcIlxcdTI5MjdcIixcIk9hY3V0ZVwiOlwiXFx1MDBEM1wiLFwib2FjdXRlXCI6XCJcXHUwMEYzXCIsXCJvYXN0XCI6XCJcXHUyMjlCXCIsXCJPY2lyY1wiOlwiXFx1MDBENFwiLFwib2NpcmNcIjpcIlxcdTAwRjRcIixcIm9jaXJcIjpcIlxcdTIyOUFcIixcIk9jeVwiOlwiXFx1MDQxRVwiLFwib2N5XCI6XCJcXHUwNDNFXCIsXCJvZGFzaFwiOlwiXFx1MjI5RFwiLFwiT2RibGFjXCI6XCJcXHUwMTUwXCIsXCJvZGJsYWNcIjpcIlxcdTAxNTFcIixcIm9kaXZcIjpcIlxcdTJBMzhcIixcIm9kb3RcIjpcIlxcdTIyOTlcIixcIm9kc29sZFwiOlwiXFx1MjlCQ1wiLFwiT0VsaWdcIjpcIlxcdTAxNTJcIixcIm9lbGlnXCI6XCJcXHUwMTUzXCIsXCJvZmNpclwiOlwiXFx1MjlCRlwiLFwiT2ZyXCI6XCJcXHVEODM1XFx1REQxMlwiLFwib2ZyXCI6XCJcXHVEODM1XFx1REQyQ1wiLFwib2dvblwiOlwiXFx1MDJEQlwiLFwiT2dyYXZlXCI6XCJcXHUwMEQyXCIsXCJvZ3JhdmVcIjpcIlxcdTAwRjJcIixcIm9ndFwiOlwiXFx1MjlDMVwiLFwib2hiYXJcIjpcIlxcdTI5QjVcIixcIm9obVwiOlwiXFx1MDNBOVwiLFwib2ludFwiOlwiXFx1MjIyRVwiLFwib2xhcnJcIjpcIlxcdTIxQkFcIixcIm9sY2lyXCI6XCJcXHUyOUJFXCIsXCJvbGNyb3NzXCI6XCJcXHUyOUJCXCIsXCJvbGluZVwiOlwiXFx1MjAzRVwiLFwib2x0XCI6XCJcXHUyOUMwXCIsXCJPbWFjclwiOlwiXFx1MDE0Q1wiLFwib21hY3JcIjpcIlxcdTAxNERcIixcIk9tZWdhXCI6XCJcXHUwM0E5XCIsXCJvbWVnYVwiOlwiXFx1MDNDOVwiLFwiT21pY3JvblwiOlwiXFx1MDM5RlwiLFwib21pY3JvblwiOlwiXFx1MDNCRlwiLFwib21pZFwiOlwiXFx1MjlCNlwiLFwib21pbnVzXCI6XCJcXHUyMjk2XCIsXCJPb3BmXCI6XCJcXHVEODM1XFx1REQ0NlwiLFwib29wZlwiOlwiXFx1RDgzNVxcdURENjBcIixcIm9wYXJcIjpcIlxcdTI5QjdcIixcIk9wZW5DdXJseURvdWJsZVF1b3RlXCI6XCJcXHUyMDFDXCIsXCJPcGVuQ3VybHlRdW90ZVwiOlwiXFx1MjAxOFwiLFwib3BlcnBcIjpcIlxcdTI5QjlcIixcIm9wbHVzXCI6XCJcXHUyMjk1XCIsXCJvcmFyclwiOlwiXFx1MjFCQlwiLFwiT3JcIjpcIlxcdTJBNTRcIixcIm9yXCI6XCJcXHUyMjI4XCIsXCJvcmRcIjpcIlxcdTJBNURcIixcIm9yZGVyXCI6XCJcXHUyMTM0XCIsXCJvcmRlcm9mXCI6XCJcXHUyMTM0XCIsXCJvcmRmXCI6XCJcXHUwMEFBXCIsXCJvcmRtXCI6XCJcXHUwMEJBXCIsXCJvcmlnb2ZcIjpcIlxcdTIyQjZcIixcIm9yb3JcIjpcIlxcdTJBNTZcIixcIm9yc2xvcGVcIjpcIlxcdTJBNTdcIixcIm9ydlwiOlwiXFx1MkE1QlwiLFwib1NcIjpcIlxcdTI0QzhcIixcIk9zY3JcIjpcIlxcdUQ4MzVcXHVEQ0FBXCIsXCJvc2NyXCI6XCJcXHUyMTM0XCIsXCJPc2xhc2hcIjpcIlxcdTAwRDhcIixcIm9zbGFzaFwiOlwiXFx1MDBGOFwiLFwib3NvbFwiOlwiXFx1MjI5OFwiLFwiT3RpbGRlXCI6XCJcXHUwMEQ1XCIsXCJvdGlsZGVcIjpcIlxcdTAwRjVcIixcIm90aW1lc2FzXCI6XCJcXHUyQTM2XCIsXCJPdGltZXNcIjpcIlxcdTJBMzdcIixcIm90aW1lc1wiOlwiXFx1MjI5N1wiLFwiT3VtbFwiOlwiXFx1MDBENlwiLFwib3VtbFwiOlwiXFx1MDBGNlwiLFwib3ZiYXJcIjpcIlxcdTIzM0RcIixcIk92ZXJCYXJcIjpcIlxcdTIwM0VcIixcIk92ZXJCcmFjZVwiOlwiXFx1MjNERVwiLFwiT3ZlckJyYWNrZXRcIjpcIlxcdTIzQjRcIixcIk92ZXJQYXJlbnRoZXNpc1wiOlwiXFx1MjNEQ1wiLFwicGFyYVwiOlwiXFx1MDBCNlwiLFwicGFyYWxsZWxcIjpcIlxcdTIyMjVcIixcInBhclwiOlwiXFx1MjIyNVwiLFwicGFyc2ltXCI6XCJcXHUyQUYzXCIsXCJwYXJzbFwiOlwiXFx1MkFGRFwiLFwicGFydFwiOlwiXFx1MjIwMlwiLFwiUGFydGlhbERcIjpcIlxcdTIyMDJcIixcIlBjeVwiOlwiXFx1MDQxRlwiLFwicGN5XCI6XCJcXHUwNDNGXCIsXCJwZXJjbnRcIjpcIiVcIixcInBlcmlvZFwiOlwiLlwiLFwicGVybWlsXCI6XCJcXHUyMDMwXCIsXCJwZXJwXCI6XCJcXHUyMkE1XCIsXCJwZXJ0ZW5rXCI6XCJcXHUyMDMxXCIsXCJQZnJcIjpcIlxcdUQ4MzVcXHVERDEzXCIsXCJwZnJcIjpcIlxcdUQ4MzVcXHVERDJEXCIsXCJQaGlcIjpcIlxcdTAzQTZcIixcInBoaVwiOlwiXFx1MDNDNlwiLFwicGhpdlwiOlwiXFx1MDNENVwiLFwicGhtbWF0XCI6XCJcXHUyMTMzXCIsXCJwaG9uZVwiOlwiXFx1MjYwRVwiLFwiUGlcIjpcIlxcdTAzQTBcIixcInBpXCI6XCJcXHUwM0MwXCIsXCJwaXRjaGZvcmtcIjpcIlxcdTIyRDRcIixcInBpdlwiOlwiXFx1MDNENlwiLFwicGxhbmNrXCI6XCJcXHUyMTBGXCIsXCJwbGFuY2toXCI6XCJcXHUyMTBFXCIsXCJwbGFua3ZcIjpcIlxcdTIxMEZcIixcInBsdXNhY2lyXCI6XCJcXHUyQTIzXCIsXCJwbHVzYlwiOlwiXFx1MjI5RVwiLFwicGx1c2NpclwiOlwiXFx1MkEyMlwiLFwicGx1c1wiOlwiK1wiLFwicGx1c2RvXCI6XCJcXHUyMjE0XCIsXCJwbHVzZHVcIjpcIlxcdTJBMjVcIixcInBsdXNlXCI6XCJcXHUyQTcyXCIsXCJQbHVzTWludXNcIjpcIlxcdTAwQjFcIixcInBsdXNtblwiOlwiXFx1MDBCMVwiLFwicGx1c3NpbVwiOlwiXFx1MkEyNlwiLFwicGx1c3R3b1wiOlwiXFx1MkEyN1wiLFwicG1cIjpcIlxcdTAwQjFcIixcIlBvaW5jYXJlcGxhbmVcIjpcIlxcdTIxMENcIixcInBvaW50aW50XCI6XCJcXHUyQTE1XCIsXCJwb3BmXCI6XCJcXHVEODM1XFx1REQ2MVwiLFwiUG9wZlwiOlwiXFx1MjExOVwiLFwicG91bmRcIjpcIlxcdTAwQTNcIixcInByYXBcIjpcIlxcdTJBQjdcIixcIlByXCI6XCJcXHUyQUJCXCIsXCJwclwiOlwiXFx1MjI3QVwiLFwicHJjdWVcIjpcIlxcdTIyN0NcIixcInByZWNhcHByb3hcIjpcIlxcdTJBQjdcIixcInByZWNcIjpcIlxcdTIyN0FcIixcInByZWNjdXJseWVxXCI6XCJcXHUyMjdDXCIsXCJQcmVjZWRlc1wiOlwiXFx1MjI3QVwiLFwiUHJlY2VkZXNFcXVhbFwiOlwiXFx1MkFBRlwiLFwiUHJlY2VkZXNTbGFudEVxdWFsXCI6XCJcXHUyMjdDXCIsXCJQcmVjZWRlc1RpbGRlXCI6XCJcXHUyMjdFXCIsXCJwcmVjZXFcIjpcIlxcdTJBQUZcIixcInByZWNuYXBwcm94XCI6XCJcXHUyQUI5XCIsXCJwcmVjbmVxcVwiOlwiXFx1MkFCNVwiLFwicHJlY25zaW1cIjpcIlxcdTIyRThcIixcInByZVwiOlwiXFx1MkFBRlwiLFwicHJFXCI6XCJcXHUyQUIzXCIsXCJwcmVjc2ltXCI6XCJcXHUyMjdFXCIsXCJwcmltZVwiOlwiXFx1MjAzMlwiLFwiUHJpbWVcIjpcIlxcdTIwMzNcIixcInByaW1lc1wiOlwiXFx1MjExOVwiLFwicHJuYXBcIjpcIlxcdTJBQjlcIixcInBybkVcIjpcIlxcdTJBQjVcIixcInBybnNpbVwiOlwiXFx1MjJFOFwiLFwicHJvZFwiOlwiXFx1MjIwRlwiLFwiUHJvZHVjdFwiOlwiXFx1MjIwRlwiLFwicHJvZmFsYXJcIjpcIlxcdTIzMkVcIixcInByb2ZsaW5lXCI6XCJcXHUyMzEyXCIsXCJwcm9mc3VyZlwiOlwiXFx1MjMxM1wiLFwicHJvcFwiOlwiXFx1MjIxRFwiLFwiUHJvcG9ydGlvbmFsXCI6XCJcXHUyMjFEXCIsXCJQcm9wb3J0aW9uXCI6XCJcXHUyMjM3XCIsXCJwcm9wdG9cIjpcIlxcdTIyMURcIixcInByc2ltXCI6XCJcXHUyMjdFXCIsXCJwcnVyZWxcIjpcIlxcdTIyQjBcIixcIlBzY3JcIjpcIlxcdUQ4MzVcXHVEQ0FCXCIsXCJwc2NyXCI6XCJcXHVEODM1XFx1RENDNVwiLFwiUHNpXCI6XCJcXHUwM0E4XCIsXCJwc2lcIjpcIlxcdTAzQzhcIixcInB1bmNzcFwiOlwiXFx1MjAwOFwiLFwiUWZyXCI6XCJcXHVEODM1XFx1REQxNFwiLFwicWZyXCI6XCJcXHVEODM1XFx1REQyRVwiLFwicWludFwiOlwiXFx1MkEwQ1wiLFwicW9wZlwiOlwiXFx1RDgzNVxcdURENjJcIixcIlFvcGZcIjpcIlxcdTIxMUFcIixcInFwcmltZVwiOlwiXFx1MjA1N1wiLFwiUXNjclwiOlwiXFx1RDgzNVxcdURDQUNcIixcInFzY3JcIjpcIlxcdUQ4MzVcXHVEQ0M2XCIsXCJxdWF0ZXJuaW9uc1wiOlwiXFx1MjEwRFwiLFwicXVhdGludFwiOlwiXFx1MkExNlwiLFwicXVlc3RcIjpcIj9cIixcInF1ZXN0ZXFcIjpcIlxcdTIyNUZcIixcInF1b3RcIjpcIlxcXCJcIixcIlFVT1RcIjpcIlxcXCJcIixcInJBYXJyXCI6XCJcXHUyMURCXCIsXCJyYWNlXCI6XCJcXHUyMjNEXFx1MDMzMVwiLFwiUmFjdXRlXCI6XCJcXHUwMTU0XCIsXCJyYWN1dGVcIjpcIlxcdTAxNTVcIixcInJhZGljXCI6XCJcXHUyMjFBXCIsXCJyYWVtcHR5dlwiOlwiXFx1MjlCM1wiLFwicmFuZ1wiOlwiXFx1MjdFOVwiLFwiUmFuZ1wiOlwiXFx1MjdFQlwiLFwicmFuZ2RcIjpcIlxcdTI5OTJcIixcInJhbmdlXCI6XCJcXHUyOUE1XCIsXCJyYW5nbGVcIjpcIlxcdTI3RTlcIixcInJhcXVvXCI6XCJcXHUwMEJCXCIsXCJyYXJyYXBcIjpcIlxcdTI5NzVcIixcInJhcnJiXCI6XCJcXHUyMUU1XCIsXCJyYXJyYmZzXCI6XCJcXHUyOTIwXCIsXCJyYXJyY1wiOlwiXFx1MjkzM1wiLFwicmFyclwiOlwiXFx1MjE5MlwiLFwiUmFyclwiOlwiXFx1MjFBMFwiLFwickFyclwiOlwiXFx1MjFEMlwiLFwicmFycmZzXCI6XCJcXHUyOTFFXCIsXCJyYXJyaGtcIjpcIlxcdTIxQUFcIixcInJhcnJscFwiOlwiXFx1MjFBQ1wiLFwicmFycnBsXCI6XCJcXHUyOTQ1XCIsXCJyYXJyc2ltXCI6XCJcXHUyOTc0XCIsXCJSYXJydGxcIjpcIlxcdTI5MTZcIixcInJhcnJ0bFwiOlwiXFx1MjFBM1wiLFwicmFycndcIjpcIlxcdTIxOURcIixcInJhdGFpbFwiOlwiXFx1MjkxQVwiLFwickF0YWlsXCI6XCJcXHUyOTFDXCIsXCJyYXRpb1wiOlwiXFx1MjIzNlwiLFwicmF0aW9uYWxzXCI6XCJcXHUyMTFBXCIsXCJyYmFyclwiOlwiXFx1MjkwRFwiLFwickJhcnJcIjpcIlxcdTI5MEZcIixcIlJCYXJyXCI6XCJcXHUyOTEwXCIsXCJyYmJya1wiOlwiXFx1Mjc3M1wiLFwicmJyYWNlXCI6XCJ9XCIsXCJyYnJhY2tcIjpcIl1cIixcInJicmtlXCI6XCJcXHUyOThDXCIsXCJyYnJrc2xkXCI6XCJcXHUyOThFXCIsXCJyYnJrc2x1XCI6XCJcXHUyOTkwXCIsXCJSY2Fyb25cIjpcIlxcdTAxNThcIixcInJjYXJvblwiOlwiXFx1MDE1OVwiLFwiUmNlZGlsXCI6XCJcXHUwMTU2XCIsXCJyY2VkaWxcIjpcIlxcdTAxNTdcIixcInJjZWlsXCI6XCJcXHUyMzA5XCIsXCJyY3ViXCI6XCJ9XCIsXCJSY3lcIjpcIlxcdTA0MjBcIixcInJjeVwiOlwiXFx1MDQ0MFwiLFwicmRjYVwiOlwiXFx1MjkzN1wiLFwicmRsZGhhclwiOlwiXFx1Mjk2OVwiLFwicmRxdW9cIjpcIlxcdTIwMURcIixcInJkcXVvclwiOlwiXFx1MjAxRFwiLFwicmRzaFwiOlwiXFx1MjFCM1wiLFwicmVhbFwiOlwiXFx1MjExQ1wiLFwicmVhbGluZVwiOlwiXFx1MjExQlwiLFwicmVhbHBhcnRcIjpcIlxcdTIxMUNcIixcInJlYWxzXCI6XCJcXHUyMTFEXCIsXCJSZVwiOlwiXFx1MjExQ1wiLFwicmVjdFwiOlwiXFx1MjVBRFwiLFwicmVnXCI6XCJcXHUwMEFFXCIsXCJSRUdcIjpcIlxcdTAwQUVcIixcIlJldmVyc2VFbGVtZW50XCI6XCJcXHUyMjBCXCIsXCJSZXZlcnNlRXF1aWxpYnJpdW1cIjpcIlxcdTIxQ0JcIixcIlJldmVyc2VVcEVxdWlsaWJyaXVtXCI6XCJcXHUyOTZGXCIsXCJyZmlzaHRcIjpcIlxcdTI5N0RcIixcInJmbG9vclwiOlwiXFx1MjMwQlwiLFwicmZyXCI6XCJcXHVEODM1XFx1REQyRlwiLFwiUmZyXCI6XCJcXHUyMTFDXCIsXCJySGFyXCI6XCJcXHUyOTY0XCIsXCJyaGFyZFwiOlwiXFx1MjFDMVwiLFwicmhhcnVcIjpcIlxcdTIxQzBcIixcInJoYXJ1bFwiOlwiXFx1Mjk2Q1wiLFwiUmhvXCI6XCJcXHUwM0ExXCIsXCJyaG9cIjpcIlxcdTAzQzFcIixcInJob3ZcIjpcIlxcdTAzRjFcIixcIlJpZ2h0QW5nbGVCcmFja2V0XCI6XCJcXHUyN0U5XCIsXCJSaWdodEFycm93QmFyXCI6XCJcXHUyMUU1XCIsXCJyaWdodGFycm93XCI6XCJcXHUyMTkyXCIsXCJSaWdodEFycm93XCI6XCJcXHUyMTkyXCIsXCJSaWdodGFycm93XCI6XCJcXHUyMUQyXCIsXCJSaWdodEFycm93TGVmdEFycm93XCI6XCJcXHUyMUM0XCIsXCJyaWdodGFycm93dGFpbFwiOlwiXFx1MjFBM1wiLFwiUmlnaHRDZWlsaW5nXCI6XCJcXHUyMzA5XCIsXCJSaWdodERvdWJsZUJyYWNrZXRcIjpcIlxcdTI3RTdcIixcIlJpZ2h0RG93blRlZVZlY3RvclwiOlwiXFx1Mjk1RFwiLFwiUmlnaHREb3duVmVjdG9yQmFyXCI6XCJcXHUyOTU1XCIsXCJSaWdodERvd25WZWN0b3JcIjpcIlxcdTIxQzJcIixcIlJpZ2h0Rmxvb3JcIjpcIlxcdTIzMEJcIixcInJpZ2h0aGFycG9vbmRvd25cIjpcIlxcdTIxQzFcIixcInJpZ2h0aGFycG9vbnVwXCI6XCJcXHUyMUMwXCIsXCJyaWdodGxlZnRhcnJvd3NcIjpcIlxcdTIxQzRcIixcInJpZ2h0bGVmdGhhcnBvb25zXCI6XCJcXHUyMUNDXCIsXCJyaWdodHJpZ2h0YXJyb3dzXCI6XCJcXHUyMUM5XCIsXCJyaWdodHNxdWlnYXJyb3dcIjpcIlxcdTIxOURcIixcIlJpZ2h0VGVlQXJyb3dcIjpcIlxcdTIxQTZcIixcIlJpZ2h0VGVlXCI6XCJcXHUyMkEyXCIsXCJSaWdodFRlZVZlY3RvclwiOlwiXFx1Mjk1QlwiLFwicmlnaHR0aHJlZXRpbWVzXCI6XCJcXHUyMkNDXCIsXCJSaWdodFRyaWFuZ2xlQmFyXCI6XCJcXHUyOUQwXCIsXCJSaWdodFRyaWFuZ2xlXCI6XCJcXHUyMkIzXCIsXCJSaWdodFRyaWFuZ2xlRXF1YWxcIjpcIlxcdTIyQjVcIixcIlJpZ2h0VXBEb3duVmVjdG9yXCI6XCJcXHUyOTRGXCIsXCJSaWdodFVwVGVlVmVjdG9yXCI6XCJcXHUyOTVDXCIsXCJSaWdodFVwVmVjdG9yQmFyXCI6XCJcXHUyOTU0XCIsXCJSaWdodFVwVmVjdG9yXCI6XCJcXHUyMUJFXCIsXCJSaWdodFZlY3RvckJhclwiOlwiXFx1Mjk1M1wiLFwiUmlnaHRWZWN0b3JcIjpcIlxcdTIxQzBcIixcInJpbmdcIjpcIlxcdTAyREFcIixcInJpc2luZ2RvdHNlcVwiOlwiXFx1MjI1M1wiLFwicmxhcnJcIjpcIlxcdTIxQzRcIixcInJsaGFyXCI6XCJcXHUyMUNDXCIsXCJybG1cIjpcIlxcdTIwMEZcIixcInJtb3VzdGFjaGVcIjpcIlxcdTIzQjFcIixcInJtb3VzdFwiOlwiXFx1MjNCMVwiLFwicm5taWRcIjpcIlxcdTJBRUVcIixcInJvYW5nXCI6XCJcXHUyN0VEXCIsXCJyb2FyclwiOlwiXFx1MjFGRVwiLFwicm9icmtcIjpcIlxcdTI3RTdcIixcInJvcGFyXCI6XCJcXHUyOTg2XCIsXCJyb3BmXCI6XCJcXHVEODM1XFx1REQ2M1wiLFwiUm9wZlwiOlwiXFx1MjExRFwiLFwicm9wbHVzXCI6XCJcXHUyQTJFXCIsXCJyb3RpbWVzXCI6XCJcXHUyQTM1XCIsXCJSb3VuZEltcGxpZXNcIjpcIlxcdTI5NzBcIixcInJwYXJcIjpcIilcIixcInJwYXJndFwiOlwiXFx1Mjk5NFwiLFwicnBwb2xpbnRcIjpcIlxcdTJBMTJcIixcInJyYXJyXCI6XCJcXHUyMUM5XCIsXCJScmlnaHRhcnJvd1wiOlwiXFx1MjFEQlwiLFwicnNhcXVvXCI6XCJcXHUyMDNBXCIsXCJyc2NyXCI6XCJcXHVEODM1XFx1RENDN1wiLFwiUnNjclwiOlwiXFx1MjExQlwiLFwicnNoXCI6XCJcXHUyMUIxXCIsXCJSc2hcIjpcIlxcdTIxQjFcIixcInJzcWJcIjpcIl1cIixcInJzcXVvXCI6XCJcXHUyMDE5XCIsXCJyc3F1b3JcIjpcIlxcdTIwMTlcIixcInJ0aHJlZVwiOlwiXFx1MjJDQ1wiLFwicnRpbWVzXCI6XCJcXHUyMkNBXCIsXCJydHJpXCI6XCJcXHUyNUI5XCIsXCJydHJpZVwiOlwiXFx1MjJCNVwiLFwicnRyaWZcIjpcIlxcdTI1QjhcIixcInJ0cmlsdHJpXCI6XCJcXHUyOUNFXCIsXCJSdWxlRGVsYXllZFwiOlwiXFx1MjlGNFwiLFwicnVsdWhhclwiOlwiXFx1Mjk2OFwiLFwicnhcIjpcIlxcdTIxMUVcIixcIlNhY3V0ZVwiOlwiXFx1MDE1QVwiLFwic2FjdXRlXCI6XCJcXHUwMTVCXCIsXCJzYnF1b1wiOlwiXFx1MjAxQVwiLFwic2NhcFwiOlwiXFx1MkFCOFwiLFwiU2Nhcm9uXCI6XCJcXHUwMTYwXCIsXCJzY2Fyb25cIjpcIlxcdTAxNjFcIixcIlNjXCI6XCJcXHUyQUJDXCIsXCJzY1wiOlwiXFx1MjI3QlwiLFwic2NjdWVcIjpcIlxcdTIyN0RcIixcInNjZVwiOlwiXFx1MkFCMFwiLFwic2NFXCI6XCJcXHUyQUI0XCIsXCJTY2VkaWxcIjpcIlxcdTAxNUVcIixcInNjZWRpbFwiOlwiXFx1MDE1RlwiLFwiU2NpcmNcIjpcIlxcdTAxNUNcIixcInNjaXJjXCI6XCJcXHUwMTVEXCIsXCJzY25hcFwiOlwiXFx1MkFCQVwiLFwic2NuRVwiOlwiXFx1MkFCNlwiLFwic2Nuc2ltXCI6XCJcXHUyMkU5XCIsXCJzY3BvbGludFwiOlwiXFx1MkExM1wiLFwic2NzaW1cIjpcIlxcdTIyN0ZcIixcIlNjeVwiOlwiXFx1MDQyMVwiLFwic2N5XCI6XCJcXHUwNDQxXCIsXCJzZG90YlwiOlwiXFx1MjJBMVwiLFwic2RvdFwiOlwiXFx1MjJDNVwiLFwic2RvdGVcIjpcIlxcdTJBNjZcIixcInNlYXJoa1wiOlwiXFx1MjkyNVwiLFwic2VhcnJcIjpcIlxcdTIxOThcIixcInNlQXJyXCI6XCJcXHUyMUQ4XCIsXCJzZWFycm93XCI6XCJcXHUyMTk4XCIsXCJzZWN0XCI6XCJcXHUwMEE3XCIsXCJzZW1pXCI6XCI7XCIsXCJzZXN3YXJcIjpcIlxcdTI5MjlcIixcInNldG1pbnVzXCI6XCJcXHUyMjE2XCIsXCJzZXRtblwiOlwiXFx1MjIxNlwiLFwic2V4dFwiOlwiXFx1MjczNlwiLFwiU2ZyXCI6XCJcXHVEODM1XFx1REQxNlwiLFwic2ZyXCI6XCJcXHVEODM1XFx1REQzMFwiLFwic2Zyb3duXCI6XCJcXHUyMzIyXCIsXCJzaGFycFwiOlwiXFx1MjY2RlwiLFwiU0hDSGN5XCI6XCJcXHUwNDI5XCIsXCJzaGNoY3lcIjpcIlxcdTA0NDlcIixcIlNIY3lcIjpcIlxcdTA0MjhcIixcInNoY3lcIjpcIlxcdTA0NDhcIixcIlNob3J0RG93bkFycm93XCI6XCJcXHUyMTkzXCIsXCJTaG9ydExlZnRBcnJvd1wiOlwiXFx1MjE5MFwiLFwic2hvcnRtaWRcIjpcIlxcdTIyMjNcIixcInNob3J0cGFyYWxsZWxcIjpcIlxcdTIyMjVcIixcIlNob3J0UmlnaHRBcnJvd1wiOlwiXFx1MjE5MlwiLFwiU2hvcnRVcEFycm93XCI6XCJcXHUyMTkxXCIsXCJzaHlcIjpcIlxcdTAwQURcIixcIlNpZ21hXCI6XCJcXHUwM0EzXCIsXCJzaWdtYVwiOlwiXFx1MDNDM1wiLFwic2lnbWFmXCI6XCJcXHUwM0MyXCIsXCJzaWdtYXZcIjpcIlxcdTAzQzJcIixcInNpbVwiOlwiXFx1MjIzQ1wiLFwic2ltZG90XCI6XCJcXHUyQTZBXCIsXCJzaW1lXCI6XCJcXHUyMjQzXCIsXCJzaW1lcVwiOlwiXFx1MjI0M1wiLFwic2ltZ1wiOlwiXFx1MkE5RVwiLFwic2ltZ0VcIjpcIlxcdTJBQTBcIixcInNpbWxcIjpcIlxcdTJBOURcIixcInNpbWxFXCI6XCJcXHUyQTlGXCIsXCJzaW1uZVwiOlwiXFx1MjI0NlwiLFwic2ltcGx1c1wiOlwiXFx1MkEyNFwiLFwic2ltcmFyclwiOlwiXFx1Mjk3MlwiLFwic2xhcnJcIjpcIlxcdTIxOTBcIixcIlNtYWxsQ2lyY2xlXCI6XCJcXHUyMjE4XCIsXCJzbWFsbHNldG1pbnVzXCI6XCJcXHUyMjE2XCIsXCJzbWFzaHBcIjpcIlxcdTJBMzNcIixcInNtZXBhcnNsXCI6XCJcXHUyOUU0XCIsXCJzbWlkXCI6XCJcXHUyMjIzXCIsXCJzbWlsZVwiOlwiXFx1MjMyM1wiLFwic210XCI6XCJcXHUyQUFBXCIsXCJzbXRlXCI6XCJcXHUyQUFDXCIsXCJzbXRlc1wiOlwiXFx1MkFBQ1xcdUZFMDBcIixcIlNPRlRjeVwiOlwiXFx1MDQyQ1wiLFwic29mdGN5XCI6XCJcXHUwNDRDXCIsXCJzb2xiYXJcIjpcIlxcdTIzM0ZcIixcInNvbGJcIjpcIlxcdTI5QzRcIixcInNvbFwiOlwiL1wiLFwiU29wZlwiOlwiXFx1RDgzNVxcdURENEFcIixcInNvcGZcIjpcIlxcdUQ4MzVcXHVERDY0XCIsXCJzcGFkZXNcIjpcIlxcdTI2NjBcIixcInNwYWRlc3VpdFwiOlwiXFx1MjY2MFwiLFwic3BhclwiOlwiXFx1MjIyNVwiLFwic3FjYXBcIjpcIlxcdTIyOTNcIixcInNxY2Fwc1wiOlwiXFx1MjI5M1xcdUZFMDBcIixcInNxY3VwXCI6XCJcXHUyMjk0XCIsXCJzcWN1cHNcIjpcIlxcdTIyOTRcXHVGRTAwXCIsXCJTcXJ0XCI6XCJcXHUyMjFBXCIsXCJzcXN1YlwiOlwiXFx1MjI4RlwiLFwic3FzdWJlXCI6XCJcXHUyMjkxXCIsXCJzcXN1YnNldFwiOlwiXFx1MjI4RlwiLFwic3FzdWJzZXRlcVwiOlwiXFx1MjI5MVwiLFwic3FzdXBcIjpcIlxcdTIyOTBcIixcInNxc3VwZVwiOlwiXFx1MjI5MlwiLFwic3FzdXBzZXRcIjpcIlxcdTIyOTBcIixcInNxc3Vwc2V0ZXFcIjpcIlxcdTIyOTJcIixcInNxdWFyZVwiOlwiXFx1MjVBMVwiLFwiU3F1YXJlXCI6XCJcXHUyNUExXCIsXCJTcXVhcmVJbnRlcnNlY3Rpb25cIjpcIlxcdTIyOTNcIixcIlNxdWFyZVN1YnNldFwiOlwiXFx1MjI4RlwiLFwiU3F1YXJlU3Vic2V0RXF1YWxcIjpcIlxcdTIyOTFcIixcIlNxdWFyZVN1cGVyc2V0XCI6XCJcXHUyMjkwXCIsXCJTcXVhcmVTdXBlcnNldEVxdWFsXCI6XCJcXHUyMjkyXCIsXCJTcXVhcmVVbmlvblwiOlwiXFx1MjI5NFwiLFwic3F1YXJmXCI6XCJcXHUyNUFBXCIsXCJzcXVcIjpcIlxcdTI1QTFcIixcInNxdWZcIjpcIlxcdTI1QUFcIixcInNyYXJyXCI6XCJcXHUyMTkyXCIsXCJTc2NyXCI6XCJcXHVEODM1XFx1RENBRVwiLFwic3NjclwiOlwiXFx1RDgzNVxcdURDQzhcIixcInNzZXRtblwiOlwiXFx1MjIxNlwiLFwic3NtaWxlXCI6XCJcXHUyMzIzXCIsXCJzc3RhcmZcIjpcIlxcdTIyQzZcIixcIlN0YXJcIjpcIlxcdTIyQzZcIixcInN0YXJcIjpcIlxcdTI2MDZcIixcInN0YXJmXCI6XCJcXHUyNjA1XCIsXCJzdHJhaWdodGVwc2lsb25cIjpcIlxcdTAzRjVcIixcInN0cmFpZ2h0cGhpXCI6XCJcXHUwM0Q1XCIsXCJzdHJuc1wiOlwiXFx1MDBBRlwiLFwic3ViXCI6XCJcXHUyMjgyXCIsXCJTdWJcIjpcIlxcdTIyRDBcIixcInN1YmRvdFwiOlwiXFx1MkFCRFwiLFwic3ViRVwiOlwiXFx1MkFDNVwiLFwic3ViZVwiOlwiXFx1MjI4NlwiLFwic3ViZWRvdFwiOlwiXFx1MkFDM1wiLFwic3VibXVsdFwiOlwiXFx1MkFDMVwiLFwic3VibkVcIjpcIlxcdTJBQ0JcIixcInN1Ym5lXCI6XCJcXHUyMjhBXCIsXCJzdWJwbHVzXCI6XCJcXHUyQUJGXCIsXCJzdWJyYXJyXCI6XCJcXHUyOTc5XCIsXCJzdWJzZXRcIjpcIlxcdTIyODJcIixcIlN1YnNldFwiOlwiXFx1MjJEMFwiLFwic3Vic2V0ZXFcIjpcIlxcdTIyODZcIixcInN1YnNldGVxcVwiOlwiXFx1MkFDNVwiLFwiU3Vic2V0RXF1YWxcIjpcIlxcdTIyODZcIixcInN1YnNldG5lcVwiOlwiXFx1MjI4QVwiLFwic3Vic2V0bmVxcVwiOlwiXFx1MkFDQlwiLFwic3Vic2ltXCI6XCJcXHUyQUM3XCIsXCJzdWJzdWJcIjpcIlxcdTJBRDVcIixcInN1YnN1cFwiOlwiXFx1MkFEM1wiLFwic3VjY2FwcHJveFwiOlwiXFx1MkFCOFwiLFwic3VjY1wiOlwiXFx1MjI3QlwiLFwic3VjY2N1cmx5ZXFcIjpcIlxcdTIyN0RcIixcIlN1Y2NlZWRzXCI6XCJcXHUyMjdCXCIsXCJTdWNjZWVkc0VxdWFsXCI6XCJcXHUyQUIwXCIsXCJTdWNjZWVkc1NsYW50RXF1YWxcIjpcIlxcdTIyN0RcIixcIlN1Y2NlZWRzVGlsZGVcIjpcIlxcdTIyN0ZcIixcInN1Y2NlcVwiOlwiXFx1MkFCMFwiLFwic3VjY25hcHByb3hcIjpcIlxcdTJBQkFcIixcInN1Y2NuZXFxXCI6XCJcXHUyQUI2XCIsXCJzdWNjbnNpbVwiOlwiXFx1MjJFOVwiLFwic3VjY3NpbVwiOlwiXFx1MjI3RlwiLFwiU3VjaFRoYXRcIjpcIlxcdTIyMEJcIixcInN1bVwiOlwiXFx1MjIxMVwiLFwiU3VtXCI6XCJcXHUyMjExXCIsXCJzdW5nXCI6XCJcXHUyNjZBXCIsXCJzdXAxXCI6XCJcXHUwMEI5XCIsXCJzdXAyXCI6XCJcXHUwMEIyXCIsXCJzdXAzXCI6XCJcXHUwMEIzXCIsXCJzdXBcIjpcIlxcdTIyODNcIixcIlN1cFwiOlwiXFx1MjJEMVwiLFwic3VwZG90XCI6XCJcXHUyQUJFXCIsXCJzdXBkc3ViXCI6XCJcXHUyQUQ4XCIsXCJzdXBFXCI6XCJcXHUyQUM2XCIsXCJzdXBlXCI6XCJcXHUyMjg3XCIsXCJzdXBlZG90XCI6XCJcXHUyQUM0XCIsXCJTdXBlcnNldFwiOlwiXFx1MjI4M1wiLFwiU3VwZXJzZXRFcXVhbFwiOlwiXFx1MjI4N1wiLFwic3VwaHNvbFwiOlwiXFx1MjdDOVwiLFwic3VwaHN1YlwiOlwiXFx1MkFEN1wiLFwic3VwbGFyclwiOlwiXFx1Mjk3QlwiLFwic3VwbXVsdFwiOlwiXFx1MkFDMlwiLFwic3VwbkVcIjpcIlxcdTJBQ0NcIixcInN1cG5lXCI6XCJcXHUyMjhCXCIsXCJzdXBwbHVzXCI6XCJcXHUyQUMwXCIsXCJzdXBzZXRcIjpcIlxcdTIyODNcIixcIlN1cHNldFwiOlwiXFx1MjJEMVwiLFwic3Vwc2V0ZXFcIjpcIlxcdTIyODdcIixcInN1cHNldGVxcVwiOlwiXFx1MkFDNlwiLFwic3Vwc2V0bmVxXCI6XCJcXHUyMjhCXCIsXCJzdXBzZXRuZXFxXCI6XCJcXHUyQUNDXCIsXCJzdXBzaW1cIjpcIlxcdTJBQzhcIixcInN1cHN1YlwiOlwiXFx1MkFENFwiLFwic3Vwc3VwXCI6XCJcXHUyQUQ2XCIsXCJzd2FyaGtcIjpcIlxcdTI5MjZcIixcInN3YXJyXCI6XCJcXHUyMTk5XCIsXCJzd0FyclwiOlwiXFx1MjFEOVwiLFwic3dhcnJvd1wiOlwiXFx1MjE5OVwiLFwic3dud2FyXCI6XCJcXHUyOTJBXCIsXCJzemxpZ1wiOlwiXFx1MDBERlwiLFwiVGFiXCI6XCJcXHRcIixcInRhcmdldFwiOlwiXFx1MjMxNlwiLFwiVGF1XCI6XCJcXHUwM0E0XCIsXCJ0YXVcIjpcIlxcdTAzQzRcIixcInRicmtcIjpcIlxcdTIzQjRcIixcIlRjYXJvblwiOlwiXFx1MDE2NFwiLFwidGNhcm9uXCI6XCJcXHUwMTY1XCIsXCJUY2VkaWxcIjpcIlxcdTAxNjJcIixcInRjZWRpbFwiOlwiXFx1MDE2M1wiLFwiVGN5XCI6XCJcXHUwNDIyXCIsXCJ0Y3lcIjpcIlxcdTA0NDJcIixcInRkb3RcIjpcIlxcdTIwREJcIixcInRlbHJlY1wiOlwiXFx1MjMxNVwiLFwiVGZyXCI6XCJcXHVEODM1XFx1REQxN1wiLFwidGZyXCI6XCJcXHVEODM1XFx1REQzMVwiLFwidGhlcmU0XCI6XCJcXHUyMjM0XCIsXCJ0aGVyZWZvcmVcIjpcIlxcdTIyMzRcIixcIlRoZXJlZm9yZVwiOlwiXFx1MjIzNFwiLFwiVGhldGFcIjpcIlxcdTAzOThcIixcInRoZXRhXCI6XCJcXHUwM0I4XCIsXCJ0aGV0YXN5bVwiOlwiXFx1MDNEMVwiLFwidGhldGF2XCI6XCJcXHUwM0QxXCIsXCJ0aGlja2FwcHJveFwiOlwiXFx1MjI0OFwiLFwidGhpY2tzaW1cIjpcIlxcdTIyM0NcIixcIlRoaWNrU3BhY2VcIjpcIlxcdTIwNUZcXHUyMDBBXCIsXCJUaGluU3BhY2VcIjpcIlxcdTIwMDlcIixcInRoaW5zcFwiOlwiXFx1MjAwOVwiLFwidGhrYXBcIjpcIlxcdTIyNDhcIixcInRoa3NpbVwiOlwiXFx1MjIzQ1wiLFwiVEhPUk5cIjpcIlxcdTAwREVcIixcInRob3JuXCI6XCJcXHUwMEZFXCIsXCJ0aWxkZVwiOlwiXFx1MDJEQ1wiLFwiVGlsZGVcIjpcIlxcdTIyM0NcIixcIlRpbGRlRXF1YWxcIjpcIlxcdTIyNDNcIixcIlRpbGRlRnVsbEVxdWFsXCI6XCJcXHUyMjQ1XCIsXCJUaWxkZVRpbGRlXCI6XCJcXHUyMjQ4XCIsXCJ0aW1lc2JhclwiOlwiXFx1MkEzMVwiLFwidGltZXNiXCI6XCJcXHUyMkEwXCIsXCJ0aW1lc1wiOlwiXFx1MDBEN1wiLFwidGltZXNkXCI6XCJcXHUyQTMwXCIsXCJ0aW50XCI6XCJcXHUyMjJEXCIsXCJ0b2VhXCI6XCJcXHUyOTI4XCIsXCJ0b3Bib3RcIjpcIlxcdTIzMzZcIixcInRvcGNpclwiOlwiXFx1MkFGMVwiLFwidG9wXCI6XCJcXHUyMkE0XCIsXCJUb3BmXCI6XCJcXHVEODM1XFx1REQ0QlwiLFwidG9wZlwiOlwiXFx1RDgzNVxcdURENjVcIixcInRvcGZvcmtcIjpcIlxcdTJBREFcIixcInRvc2FcIjpcIlxcdTI5MjlcIixcInRwcmltZVwiOlwiXFx1MjAzNFwiLFwidHJhZGVcIjpcIlxcdTIxMjJcIixcIlRSQURFXCI6XCJcXHUyMTIyXCIsXCJ0cmlhbmdsZVwiOlwiXFx1MjVCNVwiLFwidHJpYW5nbGVkb3duXCI6XCJcXHUyNUJGXCIsXCJ0cmlhbmdsZWxlZnRcIjpcIlxcdTI1QzNcIixcInRyaWFuZ2xlbGVmdGVxXCI6XCJcXHUyMkI0XCIsXCJ0cmlhbmdsZXFcIjpcIlxcdTIyNUNcIixcInRyaWFuZ2xlcmlnaHRcIjpcIlxcdTI1QjlcIixcInRyaWFuZ2xlcmlnaHRlcVwiOlwiXFx1MjJCNVwiLFwidHJpZG90XCI6XCJcXHUyNUVDXCIsXCJ0cmllXCI6XCJcXHUyMjVDXCIsXCJ0cmltaW51c1wiOlwiXFx1MkEzQVwiLFwiVHJpcGxlRG90XCI6XCJcXHUyMERCXCIsXCJ0cmlwbHVzXCI6XCJcXHUyQTM5XCIsXCJ0cmlzYlwiOlwiXFx1MjlDRFwiLFwidHJpdGltZVwiOlwiXFx1MkEzQlwiLFwidHJwZXppdW1cIjpcIlxcdTIzRTJcIixcIlRzY3JcIjpcIlxcdUQ4MzVcXHVEQ0FGXCIsXCJ0c2NyXCI6XCJcXHVEODM1XFx1RENDOVwiLFwiVFNjeVwiOlwiXFx1MDQyNlwiLFwidHNjeVwiOlwiXFx1MDQ0NlwiLFwiVFNIY3lcIjpcIlxcdTA0MEJcIixcInRzaGN5XCI6XCJcXHUwNDVCXCIsXCJUc3Ryb2tcIjpcIlxcdTAxNjZcIixcInRzdHJva1wiOlwiXFx1MDE2N1wiLFwidHdpeHRcIjpcIlxcdTIyNkNcIixcInR3b2hlYWRsZWZ0YXJyb3dcIjpcIlxcdTIxOUVcIixcInR3b2hlYWRyaWdodGFycm93XCI6XCJcXHUyMUEwXCIsXCJVYWN1dGVcIjpcIlxcdTAwREFcIixcInVhY3V0ZVwiOlwiXFx1MDBGQVwiLFwidWFyclwiOlwiXFx1MjE5MVwiLFwiVWFyclwiOlwiXFx1MjE5RlwiLFwidUFyclwiOlwiXFx1MjFEMVwiLFwiVWFycm9jaXJcIjpcIlxcdTI5NDlcIixcIlVicmN5XCI6XCJcXHUwNDBFXCIsXCJ1YnJjeVwiOlwiXFx1MDQ1RVwiLFwiVWJyZXZlXCI6XCJcXHUwMTZDXCIsXCJ1YnJldmVcIjpcIlxcdTAxNkRcIixcIlVjaXJjXCI6XCJcXHUwMERCXCIsXCJ1Y2lyY1wiOlwiXFx1MDBGQlwiLFwiVWN5XCI6XCJcXHUwNDIzXCIsXCJ1Y3lcIjpcIlxcdTA0NDNcIixcInVkYXJyXCI6XCJcXHUyMUM1XCIsXCJVZGJsYWNcIjpcIlxcdTAxNzBcIixcInVkYmxhY1wiOlwiXFx1MDE3MVwiLFwidWRoYXJcIjpcIlxcdTI5NkVcIixcInVmaXNodFwiOlwiXFx1Mjk3RVwiLFwiVWZyXCI6XCJcXHVEODM1XFx1REQxOFwiLFwidWZyXCI6XCJcXHVEODM1XFx1REQzMlwiLFwiVWdyYXZlXCI6XCJcXHUwMEQ5XCIsXCJ1Z3JhdmVcIjpcIlxcdTAwRjlcIixcInVIYXJcIjpcIlxcdTI5NjNcIixcInVoYXJsXCI6XCJcXHUyMUJGXCIsXCJ1aGFyclwiOlwiXFx1MjFCRVwiLFwidWhibGtcIjpcIlxcdTI1ODBcIixcInVsY29yblwiOlwiXFx1MjMxQ1wiLFwidWxjb3JuZXJcIjpcIlxcdTIzMUNcIixcInVsY3JvcFwiOlwiXFx1MjMwRlwiLFwidWx0cmlcIjpcIlxcdTI1RjhcIixcIlVtYWNyXCI6XCJcXHUwMTZBXCIsXCJ1bWFjclwiOlwiXFx1MDE2QlwiLFwidW1sXCI6XCJcXHUwMEE4XCIsXCJVbmRlckJhclwiOlwiX1wiLFwiVW5kZXJCcmFjZVwiOlwiXFx1MjNERlwiLFwiVW5kZXJCcmFja2V0XCI6XCJcXHUyM0I1XCIsXCJVbmRlclBhcmVudGhlc2lzXCI6XCJcXHUyM0REXCIsXCJVbmlvblwiOlwiXFx1MjJDM1wiLFwiVW5pb25QbHVzXCI6XCJcXHUyMjhFXCIsXCJVb2dvblwiOlwiXFx1MDE3MlwiLFwidW9nb25cIjpcIlxcdTAxNzNcIixcIlVvcGZcIjpcIlxcdUQ4MzVcXHVERDRDXCIsXCJ1b3BmXCI6XCJcXHVEODM1XFx1REQ2NlwiLFwiVXBBcnJvd0JhclwiOlwiXFx1MjkxMlwiLFwidXBhcnJvd1wiOlwiXFx1MjE5MVwiLFwiVXBBcnJvd1wiOlwiXFx1MjE5MVwiLFwiVXBhcnJvd1wiOlwiXFx1MjFEMVwiLFwiVXBBcnJvd0Rvd25BcnJvd1wiOlwiXFx1MjFDNVwiLFwidXBkb3duYXJyb3dcIjpcIlxcdTIxOTVcIixcIlVwRG93bkFycm93XCI6XCJcXHUyMTk1XCIsXCJVcGRvd25hcnJvd1wiOlwiXFx1MjFENVwiLFwiVXBFcXVpbGlicml1bVwiOlwiXFx1Mjk2RVwiLFwidXBoYXJwb29ubGVmdFwiOlwiXFx1MjFCRlwiLFwidXBoYXJwb29ucmlnaHRcIjpcIlxcdTIxQkVcIixcInVwbHVzXCI6XCJcXHUyMjhFXCIsXCJVcHBlckxlZnRBcnJvd1wiOlwiXFx1MjE5NlwiLFwiVXBwZXJSaWdodEFycm93XCI6XCJcXHUyMTk3XCIsXCJ1cHNpXCI6XCJcXHUwM0M1XCIsXCJVcHNpXCI6XCJcXHUwM0QyXCIsXCJ1cHNpaFwiOlwiXFx1MDNEMlwiLFwiVXBzaWxvblwiOlwiXFx1MDNBNVwiLFwidXBzaWxvblwiOlwiXFx1MDNDNVwiLFwiVXBUZWVBcnJvd1wiOlwiXFx1MjFBNVwiLFwiVXBUZWVcIjpcIlxcdTIyQTVcIixcInVwdXBhcnJvd3NcIjpcIlxcdTIxQzhcIixcInVyY29yblwiOlwiXFx1MjMxRFwiLFwidXJjb3JuZXJcIjpcIlxcdTIzMURcIixcInVyY3JvcFwiOlwiXFx1MjMwRVwiLFwiVXJpbmdcIjpcIlxcdTAxNkVcIixcInVyaW5nXCI6XCJcXHUwMTZGXCIsXCJ1cnRyaVwiOlwiXFx1MjVGOVwiLFwiVXNjclwiOlwiXFx1RDgzNVxcdURDQjBcIixcInVzY3JcIjpcIlxcdUQ4MzVcXHVEQ0NBXCIsXCJ1dGRvdFwiOlwiXFx1MjJGMFwiLFwiVXRpbGRlXCI6XCJcXHUwMTY4XCIsXCJ1dGlsZGVcIjpcIlxcdTAxNjlcIixcInV0cmlcIjpcIlxcdTI1QjVcIixcInV0cmlmXCI6XCJcXHUyNUI0XCIsXCJ1dWFyclwiOlwiXFx1MjFDOFwiLFwiVXVtbFwiOlwiXFx1MDBEQ1wiLFwidXVtbFwiOlwiXFx1MDBGQ1wiLFwidXdhbmdsZVwiOlwiXFx1MjlBN1wiLFwidmFuZ3J0XCI6XCJcXHUyOTlDXCIsXCJ2YXJlcHNpbG9uXCI6XCJcXHUwM0Y1XCIsXCJ2YXJrYXBwYVwiOlwiXFx1MDNGMFwiLFwidmFybm90aGluZ1wiOlwiXFx1MjIwNVwiLFwidmFycGhpXCI6XCJcXHUwM0Q1XCIsXCJ2YXJwaVwiOlwiXFx1MDNENlwiLFwidmFycHJvcHRvXCI6XCJcXHUyMjFEXCIsXCJ2YXJyXCI6XCJcXHUyMTk1XCIsXCJ2QXJyXCI6XCJcXHUyMUQ1XCIsXCJ2YXJyaG9cIjpcIlxcdTAzRjFcIixcInZhcnNpZ21hXCI6XCJcXHUwM0MyXCIsXCJ2YXJzdWJzZXRuZXFcIjpcIlxcdTIyOEFcXHVGRTAwXCIsXCJ2YXJzdWJzZXRuZXFxXCI6XCJcXHUyQUNCXFx1RkUwMFwiLFwidmFyc3Vwc2V0bmVxXCI6XCJcXHUyMjhCXFx1RkUwMFwiLFwidmFyc3Vwc2V0bmVxcVwiOlwiXFx1MkFDQ1xcdUZFMDBcIixcInZhcnRoZXRhXCI6XCJcXHUwM0QxXCIsXCJ2YXJ0cmlhbmdsZWxlZnRcIjpcIlxcdTIyQjJcIixcInZhcnRyaWFuZ2xlcmlnaHRcIjpcIlxcdTIyQjNcIixcInZCYXJcIjpcIlxcdTJBRThcIixcIlZiYXJcIjpcIlxcdTJBRUJcIixcInZCYXJ2XCI6XCJcXHUyQUU5XCIsXCJWY3lcIjpcIlxcdTA0MTJcIixcInZjeVwiOlwiXFx1MDQzMlwiLFwidmRhc2hcIjpcIlxcdTIyQTJcIixcInZEYXNoXCI6XCJcXHUyMkE4XCIsXCJWZGFzaFwiOlwiXFx1MjJBOVwiLFwiVkRhc2hcIjpcIlxcdTIyQUJcIixcIlZkYXNobFwiOlwiXFx1MkFFNlwiLFwidmVlYmFyXCI6XCJcXHUyMkJCXCIsXCJ2ZWVcIjpcIlxcdTIyMjhcIixcIlZlZVwiOlwiXFx1MjJDMVwiLFwidmVlZXFcIjpcIlxcdTIyNUFcIixcInZlbGxpcFwiOlwiXFx1MjJFRVwiLFwidmVyYmFyXCI6XCJ8XCIsXCJWZXJiYXJcIjpcIlxcdTIwMTZcIixcInZlcnRcIjpcInxcIixcIlZlcnRcIjpcIlxcdTIwMTZcIixcIlZlcnRpY2FsQmFyXCI6XCJcXHUyMjIzXCIsXCJWZXJ0aWNhbExpbmVcIjpcInxcIixcIlZlcnRpY2FsU2VwYXJhdG9yXCI6XCJcXHUyNzU4XCIsXCJWZXJ0aWNhbFRpbGRlXCI6XCJcXHUyMjQwXCIsXCJWZXJ5VGhpblNwYWNlXCI6XCJcXHUyMDBBXCIsXCJWZnJcIjpcIlxcdUQ4MzVcXHVERDE5XCIsXCJ2ZnJcIjpcIlxcdUQ4MzVcXHVERDMzXCIsXCJ2bHRyaVwiOlwiXFx1MjJCMlwiLFwidm5zdWJcIjpcIlxcdTIyODJcXHUyMEQyXCIsXCJ2bnN1cFwiOlwiXFx1MjI4M1xcdTIwRDJcIixcIlZvcGZcIjpcIlxcdUQ4MzVcXHVERDREXCIsXCJ2b3BmXCI6XCJcXHVEODM1XFx1REQ2N1wiLFwidnByb3BcIjpcIlxcdTIyMURcIixcInZydHJpXCI6XCJcXHUyMkIzXCIsXCJWc2NyXCI6XCJcXHVEODM1XFx1RENCMVwiLFwidnNjclwiOlwiXFx1RDgzNVxcdURDQ0JcIixcInZzdWJuRVwiOlwiXFx1MkFDQlxcdUZFMDBcIixcInZzdWJuZVwiOlwiXFx1MjI4QVxcdUZFMDBcIixcInZzdXBuRVwiOlwiXFx1MkFDQ1xcdUZFMDBcIixcInZzdXBuZVwiOlwiXFx1MjI4QlxcdUZFMDBcIixcIlZ2ZGFzaFwiOlwiXFx1MjJBQVwiLFwidnppZ3phZ1wiOlwiXFx1Mjk5QVwiLFwiV2NpcmNcIjpcIlxcdTAxNzRcIixcIndjaXJjXCI6XCJcXHUwMTc1XCIsXCJ3ZWRiYXJcIjpcIlxcdTJBNUZcIixcIndlZGdlXCI6XCJcXHUyMjI3XCIsXCJXZWRnZVwiOlwiXFx1MjJDMFwiLFwid2VkZ2VxXCI6XCJcXHUyMjU5XCIsXCJ3ZWllcnBcIjpcIlxcdTIxMThcIixcIldmclwiOlwiXFx1RDgzNVxcdUREMUFcIixcIndmclwiOlwiXFx1RDgzNVxcdUREMzRcIixcIldvcGZcIjpcIlxcdUQ4MzVcXHVERDRFXCIsXCJ3b3BmXCI6XCJcXHVEODM1XFx1REQ2OFwiLFwid3BcIjpcIlxcdTIxMThcIixcIndyXCI6XCJcXHUyMjQwXCIsXCJ3cmVhdGhcIjpcIlxcdTIyNDBcIixcIldzY3JcIjpcIlxcdUQ4MzVcXHVEQ0IyXCIsXCJ3c2NyXCI6XCJcXHVEODM1XFx1RENDQ1wiLFwieGNhcFwiOlwiXFx1MjJDMlwiLFwieGNpcmNcIjpcIlxcdTI1RUZcIixcInhjdXBcIjpcIlxcdTIyQzNcIixcInhkdHJpXCI6XCJcXHUyNUJEXCIsXCJYZnJcIjpcIlxcdUQ4MzVcXHVERDFCXCIsXCJ4ZnJcIjpcIlxcdUQ4MzVcXHVERDM1XCIsXCJ4aGFyclwiOlwiXFx1MjdGN1wiLFwieGhBcnJcIjpcIlxcdTI3RkFcIixcIlhpXCI6XCJcXHUwMzlFXCIsXCJ4aVwiOlwiXFx1MDNCRVwiLFwieGxhcnJcIjpcIlxcdTI3RjVcIixcInhsQXJyXCI6XCJcXHUyN0Y4XCIsXCJ4bWFwXCI6XCJcXHUyN0ZDXCIsXCJ4bmlzXCI6XCJcXHUyMkZCXCIsXCJ4b2RvdFwiOlwiXFx1MkEwMFwiLFwiWG9wZlwiOlwiXFx1RDgzNVxcdURENEZcIixcInhvcGZcIjpcIlxcdUQ4MzVcXHVERDY5XCIsXCJ4b3BsdXNcIjpcIlxcdTJBMDFcIixcInhvdGltZVwiOlwiXFx1MkEwMlwiLFwieHJhcnJcIjpcIlxcdTI3RjZcIixcInhyQXJyXCI6XCJcXHUyN0Y5XCIsXCJYc2NyXCI6XCJcXHVEODM1XFx1RENCM1wiLFwieHNjclwiOlwiXFx1RDgzNVxcdURDQ0RcIixcInhzcWN1cFwiOlwiXFx1MkEwNlwiLFwieHVwbHVzXCI6XCJcXHUyQTA0XCIsXCJ4dXRyaVwiOlwiXFx1MjVCM1wiLFwieHZlZVwiOlwiXFx1MjJDMVwiLFwieHdlZGdlXCI6XCJcXHUyMkMwXCIsXCJZYWN1dGVcIjpcIlxcdTAwRERcIixcInlhY3V0ZVwiOlwiXFx1MDBGRFwiLFwiWUFjeVwiOlwiXFx1MDQyRlwiLFwieWFjeVwiOlwiXFx1MDQ0RlwiLFwiWWNpcmNcIjpcIlxcdTAxNzZcIixcInljaXJjXCI6XCJcXHUwMTc3XCIsXCJZY3lcIjpcIlxcdTA0MkJcIixcInljeVwiOlwiXFx1MDQ0QlwiLFwieWVuXCI6XCJcXHUwMEE1XCIsXCJZZnJcIjpcIlxcdUQ4MzVcXHVERDFDXCIsXCJ5ZnJcIjpcIlxcdUQ4MzVcXHVERDM2XCIsXCJZSWN5XCI6XCJcXHUwNDA3XCIsXCJ5aWN5XCI6XCJcXHUwNDU3XCIsXCJZb3BmXCI6XCJcXHVEODM1XFx1REQ1MFwiLFwieW9wZlwiOlwiXFx1RDgzNVxcdURENkFcIixcIllzY3JcIjpcIlxcdUQ4MzVcXHVEQ0I0XCIsXCJ5c2NyXCI6XCJcXHVEODM1XFx1RENDRVwiLFwiWVVjeVwiOlwiXFx1MDQyRVwiLFwieXVjeVwiOlwiXFx1MDQ0RVwiLFwieXVtbFwiOlwiXFx1MDBGRlwiLFwiWXVtbFwiOlwiXFx1MDE3OFwiLFwiWmFjdXRlXCI6XCJcXHUwMTc5XCIsXCJ6YWN1dGVcIjpcIlxcdTAxN0FcIixcIlpjYXJvblwiOlwiXFx1MDE3RFwiLFwiemNhcm9uXCI6XCJcXHUwMTdFXCIsXCJaY3lcIjpcIlxcdTA0MTdcIixcInpjeVwiOlwiXFx1MDQzN1wiLFwiWmRvdFwiOlwiXFx1MDE3QlwiLFwiemRvdFwiOlwiXFx1MDE3Q1wiLFwiemVldHJmXCI6XCJcXHUyMTI4XCIsXCJaZXJvV2lkdGhTcGFjZVwiOlwiXFx1MjAwQlwiLFwiWmV0YVwiOlwiXFx1MDM5NlwiLFwiemV0YVwiOlwiXFx1MDNCNlwiLFwiemZyXCI6XCJcXHVEODM1XFx1REQzN1wiLFwiWmZyXCI6XCJcXHUyMTI4XCIsXCJaSGN5XCI6XCJcXHUwNDE2XCIsXCJ6aGN5XCI6XCJcXHUwNDM2XCIsXCJ6aWdyYXJyXCI6XCJcXHUyMUREXCIsXCJ6b3BmXCI6XCJcXHVEODM1XFx1REQ2QlwiLFwiWm9wZlwiOlwiXFx1MjEyNFwiLFwiWnNjclwiOlwiXFx1RDgzNVxcdURDQjVcIixcInpzY3JcIjpcIlxcdUQ4MzVcXHVEQ0NGXCIsXCJ6d2pcIjpcIlxcdTIwMERcIixcInp3bmpcIjpcIlxcdTIwMENcIn0iLCJtb2R1bGUuZXhwb3J0cz17XCJBYWN1dGVcIjpcIlxcdTAwQzFcIixcImFhY3V0ZVwiOlwiXFx1MDBFMVwiLFwiQWNpcmNcIjpcIlxcdTAwQzJcIixcImFjaXJjXCI6XCJcXHUwMEUyXCIsXCJhY3V0ZVwiOlwiXFx1MDBCNFwiLFwiQUVsaWdcIjpcIlxcdTAwQzZcIixcImFlbGlnXCI6XCJcXHUwMEU2XCIsXCJBZ3JhdmVcIjpcIlxcdTAwQzBcIixcImFncmF2ZVwiOlwiXFx1MDBFMFwiLFwiYW1wXCI6XCImXCIsXCJBTVBcIjpcIiZcIixcIkFyaW5nXCI6XCJcXHUwMEM1XCIsXCJhcmluZ1wiOlwiXFx1MDBFNVwiLFwiQXRpbGRlXCI6XCJcXHUwMEMzXCIsXCJhdGlsZGVcIjpcIlxcdTAwRTNcIixcIkF1bWxcIjpcIlxcdTAwQzRcIixcImF1bWxcIjpcIlxcdTAwRTRcIixcImJydmJhclwiOlwiXFx1MDBBNlwiLFwiQ2NlZGlsXCI6XCJcXHUwMEM3XCIsXCJjY2VkaWxcIjpcIlxcdTAwRTdcIixcImNlZGlsXCI6XCJcXHUwMEI4XCIsXCJjZW50XCI6XCJcXHUwMEEyXCIsXCJjb3B5XCI6XCJcXHUwMEE5XCIsXCJDT1BZXCI6XCJcXHUwMEE5XCIsXCJjdXJyZW5cIjpcIlxcdTAwQTRcIixcImRlZ1wiOlwiXFx1MDBCMFwiLFwiZGl2aWRlXCI6XCJcXHUwMEY3XCIsXCJFYWN1dGVcIjpcIlxcdTAwQzlcIixcImVhY3V0ZVwiOlwiXFx1MDBFOVwiLFwiRWNpcmNcIjpcIlxcdTAwQ0FcIixcImVjaXJjXCI6XCJcXHUwMEVBXCIsXCJFZ3JhdmVcIjpcIlxcdTAwQzhcIixcImVncmF2ZVwiOlwiXFx1MDBFOFwiLFwiRVRIXCI6XCJcXHUwMEQwXCIsXCJldGhcIjpcIlxcdTAwRjBcIixcIkV1bWxcIjpcIlxcdTAwQ0JcIixcImV1bWxcIjpcIlxcdTAwRUJcIixcImZyYWMxMlwiOlwiXFx1MDBCRFwiLFwiZnJhYzE0XCI6XCJcXHUwMEJDXCIsXCJmcmFjMzRcIjpcIlxcdTAwQkVcIixcImd0XCI6XCI+XCIsXCJHVFwiOlwiPlwiLFwiSWFjdXRlXCI6XCJcXHUwMENEXCIsXCJpYWN1dGVcIjpcIlxcdTAwRURcIixcIkljaXJjXCI6XCJcXHUwMENFXCIsXCJpY2lyY1wiOlwiXFx1MDBFRVwiLFwiaWV4Y2xcIjpcIlxcdTAwQTFcIixcIklncmF2ZVwiOlwiXFx1MDBDQ1wiLFwiaWdyYXZlXCI6XCJcXHUwMEVDXCIsXCJpcXVlc3RcIjpcIlxcdTAwQkZcIixcIkl1bWxcIjpcIlxcdTAwQ0ZcIixcIml1bWxcIjpcIlxcdTAwRUZcIixcImxhcXVvXCI6XCJcXHUwMEFCXCIsXCJsdFwiOlwiPFwiLFwiTFRcIjpcIjxcIixcIm1hY3JcIjpcIlxcdTAwQUZcIixcIm1pY3JvXCI6XCJcXHUwMEI1XCIsXCJtaWRkb3RcIjpcIlxcdTAwQjdcIixcIm5ic3BcIjpcIlxcdTAwQTBcIixcIm5vdFwiOlwiXFx1MDBBQ1wiLFwiTnRpbGRlXCI6XCJcXHUwMEQxXCIsXCJudGlsZGVcIjpcIlxcdTAwRjFcIixcIk9hY3V0ZVwiOlwiXFx1MDBEM1wiLFwib2FjdXRlXCI6XCJcXHUwMEYzXCIsXCJPY2lyY1wiOlwiXFx1MDBENFwiLFwib2NpcmNcIjpcIlxcdTAwRjRcIixcIk9ncmF2ZVwiOlwiXFx1MDBEMlwiLFwib2dyYXZlXCI6XCJcXHUwMEYyXCIsXCJvcmRmXCI6XCJcXHUwMEFBXCIsXCJvcmRtXCI6XCJcXHUwMEJBXCIsXCJPc2xhc2hcIjpcIlxcdTAwRDhcIixcIm9zbGFzaFwiOlwiXFx1MDBGOFwiLFwiT3RpbGRlXCI6XCJcXHUwMEQ1XCIsXCJvdGlsZGVcIjpcIlxcdTAwRjVcIixcIk91bWxcIjpcIlxcdTAwRDZcIixcIm91bWxcIjpcIlxcdTAwRjZcIixcInBhcmFcIjpcIlxcdTAwQjZcIixcInBsdXNtblwiOlwiXFx1MDBCMVwiLFwicG91bmRcIjpcIlxcdTAwQTNcIixcInF1b3RcIjpcIlxcXCJcIixcIlFVT1RcIjpcIlxcXCJcIixcInJhcXVvXCI6XCJcXHUwMEJCXCIsXCJyZWdcIjpcIlxcdTAwQUVcIixcIlJFR1wiOlwiXFx1MDBBRVwiLFwic2VjdFwiOlwiXFx1MDBBN1wiLFwic2h5XCI6XCJcXHUwMEFEXCIsXCJzdXAxXCI6XCJcXHUwMEI5XCIsXCJzdXAyXCI6XCJcXHUwMEIyXCIsXCJzdXAzXCI6XCJcXHUwMEIzXCIsXCJzemxpZ1wiOlwiXFx1MDBERlwiLFwiVEhPUk5cIjpcIlxcdTAwREVcIixcInRob3JuXCI6XCJcXHUwMEZFXCIsXCJ0aW1lc1wiOlwiXFx1MDBEN1wiLFwiVWFjdXRlXCI6XCJcXHUwMERBXCIsXCJ1YWN1dGVcIjpcIlxcdTAwRkFcIixcIlVjaXJjXCI6XCJcXHUwMERCXCIsXCJ1Y2lyY1wiOlwiXFx1MDBGQlwiLFwiVWdyYXZlXCI6XCJcXHUwMEQ5XCIsXCJ1Z3JhdmVcIjpcIlxcdTAwRjlcIixcInVtbFwiOlwiXFx1MDBBOFwiLFwiVXVtbFwiOlwiXFx1MDBEQ1wiLFwidXVtbFwiOlwiXFx1MDBGQ1wiLFwiWWFjdXRlXCI6XCJcXHUwMEREXCIsXCJ5YWN1dGVcIjpcIlxcdTAwRkRcIixcInllblwiOlwiXFx1MDBBNVwiLFwieXVtbFwiOlwiXFx1MDBGRlwifSIsIm1vZHVsZS5leHBvcnRzPXtcImFtcFwiOlwiJlwiLFwiYXBvc1wiOlwiJ1wiLFwiZ3RcIjpcIj5cIixcImx0XCI6XCI8XCIsXCJxdW90XCI6XCJcXFwiXCJ9XG4iLCJ2YXIgYmFzZSAgICAgICA9IHJlcXVpcmUoJy4vbGliL2Jhc2UnKTtcbnZhciBTYWZlU3RyaW5nID0gcmVxdWlyZSgnLi9saWIvc2FmZS1zdHJpbmcnKTtcbnZhciBFeGNlcHRpb24gID0gcmVxdWlyZSgnLi9saWIvZXhjZXB0aW9uJyk7XG52YXIgVXRpbHMgICAgICA9IHJlcXVpcmUoJy4vbGliL3V0aWxzJyk7XG52YXIgcnVudGltZSAgICA9IHJlcXVpcmUoJy4vbGliL3J1bnRpbWUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSAoZnVuY3Rpb24gY3JlYXRlICgpIHtcbiAgdmFyIGRiID0gbmV3IGJhc2UuRE9NQmFyc0Vudmlyb25tZW50KCk7XG5cbiAgVXRpbHMuZXh0ZW5kKGRiLCBiYXNlKTtcbiAgZGIuVk0gICAgICAgICA9IHJ1bnRpbWU7XG4gIGRiLlV0aWxzICAgICAgPSBVdGlscztcbiAgZGIuY3JlYXRlICAgICA9IGNyZWF0ZTtcbiAgZGIuRXhjZXB0aW9uICA9IEV4Y2VwdGlvbjtcbiAgZGIuU2FmZVN0cmluZyA9IFNhZmVTdHJpbmc7XG5cbiAgZGIudGVtcGxhdGUgPSBmdW5jdGlvbiAoc3BlYykge1xuICAgIHJldHVybiBydW50aW1lLnRlbXBsYXRlKHNwZWMsIGRiKTtcbiAgfTtcblxuICByZXR1cm4gZGI7XG59KSgpO1xuIl19
(1)
});
