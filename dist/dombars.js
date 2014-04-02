!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.DOMBars=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var DOMBars            = _dereq_('./runtime');
var AST                = _dereq_('./lib/compiler/ast');
var base               = _dereq_('./lib/compiler/base');
var Compiler           = _dereq_('./lib/compiler/compiler');
var JavaScriptCompiler = _dereq_('./lib/compiler/javascript-compiler');

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

},{"./lib/compiler/ast":3,"./lib/compiler/base":5,"./lib/compiler/compiler":7,"./lib/compiler/javascript-compiler":8,"./runtime":37}],2:[function(_dereq_,module,exports){
var hbsBase               = _dereq_('handlebars/dist/cjs/handlebars/base');
var Utils                 = _dereq_('./utils');
var HandlebarsEnvironment = hbsBase.HandlebarsEnvironment;

/**
 * Extend Handlebars base object with custom functionality.
 *
 * @type {Object}
 */
var base = module.exports = Utils.create(hbsBase);

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

          fragment.appendChild(fn(context[i], { data: data }));
        }
      } else {
        for (var key in context) {
          if (Object.prototype.hasOwnProperty.call(context, key)) {
            i += 1;

            data.key   = key;
            data.index = i;
            data.first = (i === 0);

            fragment.appendChild(fn(context[key], { data: data }));
          }
        }
      }
    }

    if (i === 0) {
      return inverse(this);
    }

    return fragment;
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

},{"./utils":15,"handlebars/dist/cjs/handlebars/base":21}],3:[function(_dereq_,module,exports){
var hbsAST = _dereq_('handlebars/dist/cjs/handlebars/compiler/ast')['default'];
var Utils  = _dereq_('../utils');

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

},{"../utils":15,"handlebars/dist/cjs/handlebars/compiler/ast":22}],4:[function(_dereq_,module,exports){
var create         = _dereq_('../utils').create;
var CommonCompiler = _dereq_('./common-compiler').prototype;

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

},{"../utils":15,"./common-compiler":6}],5:[function(_dereq_,module,exports){
var AST    = _dereq_('./ast');
var parser = exports.parser = _dereq_('./parser');

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

},{"./ast":3,"./parser":9}],6:[function(_dereq_,module,exports){
var create     = _dereq_('../utils').create;
var JSCompiler = _dereq_(
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

},{"../utils":15,"handlebars/dist/cjs/handlebars/compiler/javascript-compiler":24}],7:[function(_dereq_,module,exports){
var create       = _dereq_('../utils').create;
var hbsCompiler  = _dereq_('handlebars/dist/cjs/handlebars/compiler/compiler');
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

/**
 * Trigger a `beforeAppend` opcode to enable wrapping the result of a block.
 *
 * @param {Object} block
 */
Compiler.prototype.block = function (block) {
  this.opcode('beforeAppend');
  BaseCompiler.block.call(this, block);
};

/**
 * Trigger a `beforeAppend` opcode to enable wrapping the result of a partial.
 *
 * @param {Object} block
 */
Compiler.prototype.partial = function (partial) {
  this.opcode('beforeAppend');
  BaseCompiler.partial.call(this, partial);
};

/**
 * Trigger a `beforeAppend` opcode to enable wrapping the result of a mustache.
 *
 * @param {Object} mustache
 */
Compiler.prototype.mustache = function (mustache) {
  this.opcode('beforeAppend');
  BaseCompiler.mustache.call(this, mustache);
};

},{"../utils":15,"handlebars/dist/cjs/handlebars/compiler/compiler":23}],8:[function(_dereq_,module,exports){
var create         = _dereq_('../utils').create;
var CommonCompiler = _dereq_('./common-compiler').prototype;

/**
 * Extends Handlebars JavaScript compiler to add DOM specific rules.
 */
var Compiler = module.exports = function () {};
Compiler.prototype = create(CommonCompiler);
Compiler.prototype.compiler          = Compiler;
Compiler.prototype.attributeCompiler = _dereq_('./attribute-compiler');

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
  this.pushSource(this.appendToBuffer(string));
};

/**
 * Wrap any contents between this and the append opcode in a function for reuse.
 */
Compiler.prototype.beforeAppend = function () {
  this.pushSource(this.nextStack() + ' = function () {');
};

/**
 * Append a variable to the stack. Adds some additional logic to transform the
 * text into a DOM node before we attempt to append it to the buffer.
 *
 * @param {Boolean} isEscaped
 */
Compiler.prototype.append = function (isEscaped) {
  this.flushInline();

  // Close the function subscription wrapper.
  this.pushSource('return ' + this.popStack() + ';');
  this.pushSource('};');

  var createFn = isEscaped ? 'createText' : 'createDOM';

  this.context.aliases.self = 'this';

  // Append the function to the current buffer.
  this.pushSource(
    this.appendToBuffer('self.' + createFn + '(' + this.popStack() + ')')
  );
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
  this.pushSource(this.appendToBuffer(this.popStack()));
};

/**
 * Create a DOM comment node ready for appending to the current buffer.
 */
Compiler.prototype.invokeComment = function () {
  this.context.aliases.self = 'this';

  this.pushStack(
    'self.createComment(self.partial(' + this.popStack() + ', depth0))'
  );
};

/**
 * Get a unique variable name for each element on the stack.
 *
 * @return {String}
 */
Compiler.prototype.nextElement = function () {
  var el = 'element' + (++this.elementSlot);
  this.useRegister(el);
  return el;
};

/**
 * Create a DOM element node ready for appending to the current buffer.
 */
Compiler.prototype.invokeElement = function () {
  this.context.aliases.self = 'this';

  var create  = 'self.partial(' + this.popStack() + ', depth0)';
  var element = this.lastElement = this.nextElement();
  var cb      = 'function (el) { ' + element + ' = el; }';

  this.pushStack(element + ' = self.createElement(' + create + ', ' + cb + ')');
};

/**
 * Append an attribute node to the current element.
 */
Compiler.prototype.invokeAttribute = function () {
  this.context.aliases.self = 'this';

  var element = 'function () { return ' + this.lastElement + '; }';
  var value   = 'self.partial(' + this.popStack() + ', depth0)';
  var name    = 'self.partial(' + this.popStack() + ', depth0)';
  var params  = [element, name, value];

  this.pushSource('self.setAttribute(' + params.join(', ') + ');');
};

/**
 * Invoke an arbitrary program and append to the current element.
 */
Compiler.prototype.invokeContent = function () {
  var child = this.popStack() + '(depth0)';

  this.context.aliases.appendChild = 'this.appendChild';

  this.pushSource('appendChild(' + this.lastElement + ', ' + child + ');');
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

},{"../utils":15,"./attribute-compiler":4,"./common-compiler":6}],9:[function(_dereq_,module,exports){
var HbsParser  = _dereq_(
  'handlebars/dist/cjs/handlebars/compiler/parser'
)['default'];
var HTMLParser = _dereq_('htmlparser2/lib/Parser');

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

},{"handlebars/dist/cjs/handlebars/compiler/parser":25,"htmlparser2/lib/Parser":30}],10:[function(_dereq_,module,exports){
module.exports = _dereq_('handlebars/dist/cjs/handlebars/exception')['default'];

},{"handlebars/dist/cjs/handlebars/exception":26}],11:[function(_dereq_,module,exports){
(function (global){
/**
 * Wrap in an anonymous function to alias timer utilities.
 */
(function (setTimeout, clearTimeout, Date) {
  /**
   * Fallback animation frame implementation.
   *
   * @return {Function}
   */
  var fallback = function () {
    /**
     * Return the current timestamp integer.
     */
    var now = Date.now || function () {
      return new Date().getTime();
    };

    // Keep track of the previous "animation frame" manually.
    var prev = now();

    return function (fn) {
      var curr = now();
      var ms   = Math.max(0, 16 - (curr - prev));
      var req  = setTimeout(fn, ms);

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
    clearTimeout;

  /**
   * Cancel an animation frame.
   *
   * @param {Number} id
   */
  exports.cancel = function (id) {
    cancel(id);
  };
})(setTimeout, clearTimeout, Date);

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],12:[function(_dereq_,module,exports){
var hbsVM = _dereq_('handlebars/dist/cjs/handlebars/runtime');
var Utils = _dereq_('./utils');
var raf   = _dereq_('./raf');

/**
 * Keep a map of attributes that need to update the corresponding properties.
 *
 * @type {Object}
 */
var ATTRIBUTE_PROPS = {
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
 */
var Subscription = function (fn, update, container) {
  // Alias passed in variables for later access.
  this._fn        = fn;
  this._update    = update;
  this._container = container;

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
    this._container._unsubscribe(object, property, this.boundUpdate);
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
  if (this._unsubscribed) { return; }

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
  var parent = this._container.subscription;

  // If we have an existing subscription, link the subscriptions together.
  if (parent && !parent._unsubscribed) {
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
  var result = this._fn.apply(this._container, arguments);
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

    this._container._subscribe(object, property, this.boundUpdate);
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

  this._unsubscribeChildren();

  this._execId = VM.exec(Utils.bind(function () {
    delete this._triggered;
    this._update(this.execute());
  }, this));

  return this._triggered = true;
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
    newNode.setAttribute(attribute.name, attribute.value);
  }

  // Replace the node position in place.
  if (node.parentNode) {
    node.parentNode.replaceChild(newNode, node);
  }

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
  if (ATTRIBUTE_PROPS[el.tagName] && ATTRIBUTE_PROPS[el.tagName][name]) {
    el[ATTRIBUTE_PROPS[el.tagName][name]] = null;
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
  if (ATTRIBUTE_PROPS[el.tagName] && ATTRIBUTE_PROPS[el.tagName][name]) {
    el[ATTRIBUTE_PROPS[el.tagName][name]] = value;
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
 * Subscriber to function in the DOMBars execution instance.
 *
 * @param  {Function} fn
 * @param  {Function} create
 * @param  {Function} update
 * @return {Object}
 */
var subscribe = function (fn, create, update) {
  var subscriber = new Subscription(fn, update, this);

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
  var container = this;

  var program = function () {
    var subscriber = new Subscription(fn, null, container);
    return subscriber.execute.apply(subscriber, arguments);
  };

  Utils.extend(program, fn);

  return program;
};

/**
 * Render and subscribe a single DOM node using a custom creation function.
 *
 * @param  {Function} fn
 * @param  {Function} create
 * @return {Node}
 */
var subscribeNode = function (fn, create) {
  return subscribe.call(this, fn, function (value) {
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
var createElement = function (fn, cb) {
  return subscribe.call(this, fn, function (value) {
    return VM.createElement(value);
  }, function (value) {
    cb(this.value = VM.setTagName(this.value, value));
  }).value;
};

/**
 * Append an element to the end of another element.
 *
 * @param {Node} parent
 * @param {Node} child
 */
var appendChild = function (parent, child) {
  // Catch errors that occur from trying to append content to a void element.
  try {
    child && parent.appendChild(child);
  } catch (e) {}
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
var setAttribute = function (currentEl, nameFn, valueFn) {
  var attrName = subscribe.call(this, nameFn, null, function (value) {
    VM.removeAttribute(currentEl(), this.value);
    VM.setAttribute(currentEl(), this.value = value, attrValue.value);
  });

  var attrValue = subscribe.call(this, valueFn, null, function (value) {
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
var createDOM = function (fn) {
  return subscribeNode.call(this, fn, Utils.domifyExpression);
};

/**
 * Create a text node and subscribe to any changes.
 *
 * @param  {Function} fn
 * @return {Text}
 */
var createText = function (fn) {
  return subscribeNode.call(this, fn, Utils.textifyExpression);
};

/**
 * Create a comment node and subscribe to any changes.
 *
 * @param  {Function} fn
 * @return {Comment}
 */
var createComment = function (fn) {
  return subscribe.call(this, fn, function (value) {
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
var program = function (i, fn, data) {
  var programWrapper = this.programs[i];

  if (data) {
    return VM.program(i, fn, data);
  }

  if (!programWrapper) {
    return this.programs[i] = VM.program(i, fn);
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
var merge = function (param, common) {
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
var get = function (object, property, id) {
  this.subscription.subscribe(object, property, id);
  return this._get(object, property);
};

/**
 * Generate an executable template from a template spec.
 *
 * @param  {Object}   templateSpec
 * @return {Function}
 */
VM.template = function (templateSpec, env) {
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
    get:              get,
    merge:            merge,
    program:          program,
    createDOM:        createDOM,
    createText:       createText,
    createComment:    createComment,
    createElement:    createElement,
    appendChild:      appendChild,
    setAttribute:     setAttribute,
    escapeExpression: Utils.escapeExpression,
    programWithDepth: VM.programWithDepth
  };

  /**
   * Return the compiled JavaScript function for execution.
   *
   * @param  {Object} context
   * @param  {Object} options
   * @return {Node}
   */
  return function (context, options) {
    options = options || {};

    var namespace = options.partial ? options : env;
    var helpers, partials;

    if (!options.partial) {
      helpers  = options.helpers;
      partials = options.partials;
    }

    // Create a custom container for each execution.
    var containment = {};

    // Allows custom subscription options to be passed through each time.
    Utils.extend(containment, container);
    containment._get         = options.get         || env.get;
    containment._subscribe   = options.subscribe   || env.subscribe;
    containment._unsubscribe = options.unsubscribe || env.unsubscribe;

    var result = wrapProgram.call(containment, templateSpec).call(
      containment,
      namespace,
      context,
      helpers,
      partials,
      options.data
    );

    if (!options.partial) {
      env.VM.checkRevision(containment.compilerInfo);
    }

    return result;
  };
};

},{"./raf":11,"./utils":15,"handlebars/dist/cjs/handlebars/runtime":27}],13:[function(_dereq_,module,exports){
module.exports = _dereq_(
  'handlebars/dist/cjs/handlebars/safe-string'
)['default'];

},{"handlebars/dist/cjs/handlebars/safe-string":28}],14:[function(_dereq_,module,exports){
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
  this.after.parentNode && this.after.parentNode.insertBefore(node, this.after);

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
  while (this.before.nextSibling && this.before.nextSibling !== this.after) {
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
  while (this.before.nextSibling && this.before.nextSibling !== this.after) {
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

},{}],15:[function(_dereq_,module,exports){
var hbsUtils   = _dereq_('handlebars/dist/cjs/handlebars/utils');
var uniqueId   = 0;
var TrackNode  = _dereq_('./track-node');
var SafeString = _dereq_('./safe-string');
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
 * @param  {*}       o
 * @return {Boolean}
 */
Utils.isNode = function (o) {
  return typeof o === 'object' && o.ownerDocument === window.document;
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

},{"./safe-string":13,"./track-node":14,"handlebars/dist/cjs/handlebars/utils":29}],16:[function(_dereq_,module,exports){
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

},{}],17:[function(_dereq_,module,exports){
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

},{}],18:[function(_dereq_,module,exports){
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
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
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

},{}],19:[function(_dereq_,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],20:[function(_dereq_,module,exports){
(function (process,global){
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

exports.isBuffer = _dereq_('./support/isBuffer');

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
exports.inherits = _dereq_('inherits');

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

}).call(this,_dereq_("/Users/blakeembrey/Projects/dombars/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":19,"/Users/blakeembrey/Projects/dombars/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":18,"inherits":17}],21:[function(_dereq_,module,exports){
"use strict";
var Utils = _dereq_("./utils");
var Exception = _dereq_("./exception")["default"];

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
},{"./exception":26,"./utils":29}],22:[function(_dereq_,module,exports){
"use strict";
var Exception = _dereq_("../exception")["default"];

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
},{"../exception":26}],23:[function(_dereq_,module,exports){
"use strict";
var Exception = _dereq_("../exception")["default"];

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
},{"../exception":26}],24:[function(_dereq_,module,exports){
"use strict";
var COMPILER_REVISION = _dereq_("../base").COMPILER_REVISION;
var REVISION_CHANGES = _dereq_("../base").REVISION_CHANGES;
var log = _dereq_("../base").log;
var Exception = _dereq_("../exception")["default"];

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
},{"../base":21,"../exception":26}],25:[function(_dereq_,module,exports){
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
},{}],26:[function(_dereq_,module,exports){
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
},{}],27:[function(_dereq_,module,exports){
"use strict";
var Utils = _dereq_("./utils");
var Exception = _dereq_("./exception")["default"];
var COMPILER_REVISION = _dereq_("./base").COMPILER_REVISION;
var REVISION_CHANGES = _dereq_("./base").REVISION_CHANGES;

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
},{"./base":21,"./exception":26,"./utils":29}],28:[function(_dereq_,module,exports){
"use strict";
// Build out our basic SafeString type
function SafeString(string) {
  this.string = string;
}

SafeString.prototype.toString = function() {
  return "" + this.string;
};

exports["default"] = SafeString;
},{}],29:[function(_dereq_,module,exports){
"use strict";
/*jshint -W004 */
var SafeString = _dereq_("./safe-string")["default"];

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
},{"./safe-string":28}],30:[function(_dereq_,module,exports){
var Tokenizer = _dereq_("./Tokenizer.js");

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
	wbr: true,

	//common self closing svg elements
	path: true,
	circle: true,
	ellipse: true,
	line: true,
	rect: true,
	use: true
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

	this.startIndex = 0;
	this.endIndex = null;

	this._lowerCaseTagNames = "lowerCaseTags" in this._options ?
									!!this._options.lowerCaseTags :
									!this._options.xmlMode;
	this._lowerCaseAttributeNames = "lowerCaseAttributeNames" in this._options ?
									!!this._options.lowerCaseAttributeNames :
									!this._options.xmlMode;

	this._tokenizer = new Tokenizer(this._options, this);
}

_dereq_("util").inherits(Parser, _dereq_("events").EventEmitter);

Parser.prototype._updatePosition = function(initialOffset){
	if(this.endIndex === null){
		if(this._tokenizer._sectionStart <= initialOffset){
			this.startIndex = 0;
		} else {
			this.startIndex = this._tokenizer._sectionStart - initialOffset;
		}
	}
	else this.startIndex = this.endIndex + 1;
	this.endIndex = this._tokenizer._index;
};

//Tokenizer event handlers
Parser.prototype.ontext = function(data){
	this._updatePosition(1);
	this.endIndex--;

	if(this._cbs.ontext) this._cbs.ontext(data);
};

Parser.prototype.onopentagname = function(name){
	if(this._lowerCaseTagNames){
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

	if(this._lowerCaseTagNames){
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
	if(this._options.xmlMode || this._options.recognizeSelfClosing){
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
	if(this._lowerCaseAttributeNames){
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

Parser.prototype._getInstructionName = function(value){
	var idx = value.search(re_nameEnd),
	    name = idx < 0 ? value : value.substr(0, idx);

	if(this._lowerCaseTagNames){
		name = name.toLowerCase();
	}

	return name;
};

Parser.prototype.ondeclaration = function(value){
	if(this._cbs.onprocessinginstruction){
		var name = this._getInstructionName(value);
		this._cbs.onprocessinginstruction("!" + name, "!" + value);
	}
};

Parser.prototype.onprocessinginstruction = function(value){
	if(this._cbs.onprocessinginstruction){
		var name = this._getInstructionName(value);
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

	if(this._options.xmlMode || this._options.recognizeCDATA){
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
};

//Parses a complete HTML document and pushes it to the handler
Parser.prototype.parseComplete = function(data){
	this.reset();
	this.end(data);
};

Parser.prototype.write = function(chunk){
	this._tokenizer.write(chunk);
};

Parser.prototype.end = function(chunk){
	this._tokenizer.end(chunk);
};

Parser.prototype.pause = function(){
	this._tokenizer.pause();
};

Parser.prototype.resume = function(){
	this._tokenizer.resume();
};

//alias for backwards compat
Parser.prototype.parseChunk = Parser.prototype.write;
Parser.prototype.done = Parser.prototype.end;

module.exports = Parser;

},{"./Tokenizer.js":31,"events":16,"util":20}],31:[function(_dereq_,module,exports){
module.exports = Tokenizer;

var decodeCodePoint = _dereq_("entities/lib/decode_codepoint.js"),
    entityMap = _dereq_("entities/maps/entities.json"),
    legacyMap = _dereq_("entities/maps/legacy.json"),
    xmlMap    = _dereq_("entities/maps/xml.json"),

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
    IN_CDATA                  = i++, // [
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

function characterState(char, SUCCESS){
	return function(c){
		if(c === char) this._state = SUCCESS;
	};
}

function ifElseState(upper, SUCCESS, FAILURE){
	var lower = upper.toLowerCase();

	if(upper === lower){
		return function(c){
			if(c === lower){
				this._state = SUCCESS;
			} else {
				this._state = FAILURE;
				this._index--;
			}
		};
	} else {
		return function(c){
			if(c === lower || c === upper){
				this._state = SUCCESS;
			} else {
				this._state = FAILURE;
				this._index--;
			}
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
	this._ended = false;
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
		this._cbs.onattribname(this._getSection());
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
		this._index--; //reconsume token
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

Tokenizer.prototype._stateAfterComment1 = characterState("-", AFTER_COMMENT_2);

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
		this._index--;
	}
};

Tokenizer.prototype._stateInCdata = function(c){
	if(c === "]") this._state = AFTER_CDATA_1;
};

Tokenizer.prototype._stateAfterCdata1 = characterState("]", AFTER_CDATA_2);

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

//for entities terminated with a semicolon
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
			this._sectionStart += limit + 1;
			return;
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
		else if(this._sectionStart + 1 === this._index);
		else if(this._baseState !== TEXT){
			if(c !== "="){
				this._parseNamedEntityStrict();
			}
		} else {
			this._parseLegacyEntity();
		}

		this._state = this._baseState;
		this._index--;
	}
};

Tokenizer.prototype._decodeNumericEntity = function(offset, base){
	var sectionStart = this._sectionStart + offset;

	if(sectionStart !== this._index){
		//parse entity
		var entity = this._buffer.substring(sectionStart, this._index);
		var parsed = parseInt(entity, base);

		this._emitPartial(decodeCodePoint(parsed));
		this._sectionStart = this._index;
	} else {
		this._sectionStart--;
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
	} else if(this._running){
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
	if(this._ended) this._cbs.onerror(Error(".write() after done!"));

	this._buffer += chunk;
	this._parse();
};

Tokenizer.prototype._parse = function(){
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

	if(this._index < this._buffer.length){
		this._parse();
	}
	if(this._ended){
		this._finish();
	}
};

Tokenizer.prototype.end = function(chunk){
	if(this._ended) this._cbs.onerror(Error(".end() after done!"));
	if(chunk) this.write(chunk);

	this._ended = true;

	if(this._running) this._finish();
};

Tokenizer.prototype._finish = function(){
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
	} else if(this._state === IN_NAMED_ENTITY && !this._xmlMode){
		this._parseLegacyEntity();
		if(this._sectionStart < this._index){
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
	} else if(
		this._state !== IN_TAG_NAME &&
		this._state !== BEFORE_ATTRIBUTE_NAME &&
		this._state !== BEFORE_ATTRIBUTE_VALUE &&
		this._state !== AFTER_ATTRIBUTE_NAME &&
		this._state !== IN_ATTRIBUTE_NAME &&
		this._state !== IN_ATTRIBUTE_VALUE_SQ &&
		this._state !== IN_ATTRIBUTE_VALUE_DQ &&
		this._state !== IN_ATTRIBUTE_VALUE_NQ &&
		this._state !== IN_CLOSING_TAG_NAME
	){
		this._cbs.ontext(data);
	}
	//else, ignore remaining data
	//TODO add a way to remove current tag
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

},{"entities/lib/decode_codepoint.js":32,"entities/maps/entities.json":34,"entities/maps/legacy.json":35,"entities/maps/xml.json":36}],32:[function(_dereq_,module,exports){
var decodeMap = _dereq_("../maps/decode.json");

module.exports = decodeCodePoint;

// modified version of https://github.com/mathiasbynens/he/blob/master/src/he.js#L94-L119
function decodeCodePoint(codePoint){

	if((codePoint >= 0xD800 && codePoint <= 0xDFFF) || codePoint > 0x10FFFF){
		return "\uFFFD";
	}

	if(codePoint in decodeMap){
		codePoint = decodeMap[codePoint];
	}

	var output = "";

	if(codePoint > 0xFFFF){
		codePoint -= 0x10000;
		output += String.fromCharCode(codePoint >>> 10 & 0x3FF | 0xD800);
		codePoint = 0xDC00 | codePoint & 0x3FF;
	}

	output += String.fromCharCode(codePoint);
	return output;
}

},{"../maps/decode.json":33}],33:[function(_dereq_,module,exports){
module.exports={"0":65533,"128":8364,"130":8218,"131":402,"132":8222,"133":8230,"134":8224,"135":8225,"136":710,"137":8240,"138":352,"139":8249,"140":338,"142":381,"145":8216,"146":8217,"147":8220,"148":8221,"149":8226,"150":8211,"151":8212,"152":732,"153":8482,"154":353,"155":8250,"156":339,"158":382,"159":376}
},{}],34:[function(_dereq_,module,exports){
module.exports={"Aacute":"\u00C1","aacute":"\u00E1","Abreve":"\u0102","abreve":"\u0103","ac":"\u223E","acd":"\u223F","acE":"\u223E\u0333","Acirc":"\u00C2","acirc":"\u00E2","acute":"\u00B4","Acy":"\u0410","acy":"\u0430","AElig":"\u00C6","aelig":"\u00E6","af":"\u2061","Afr":"\uD835\uDD04","afr":"\uD835\uDD1E","Agrave":"\u00C0","agrave":"\u00E0","alefsym":"\u2135","aleph":"\u2135","Alpha":"\u0391","alpha":"\u03B1","Amacr":"\u0100","amacr":"\u0101","amalg":"\u2A3F","amp":"&","AMP":"&","andand":"\u2A55","And":"\u2A53","and":"\u2227","andd":"\u2A5C","andslope":"\u2A58","andv":"\u2A5A","ang":"\u2220","ange":"\u29A4","angle":"\u2220","angmsdaa":"\u29A8","angmsdab":"\u29A9","angmsdac":"\u29AA","angmsdad":"\u29AB","angmsdae":"\u29AC","angmsdaf":"\u29AD","angmsdag":"\u29AE","angmsdah":"\u29AF","angmsd":"\u2221","angrt":"\u221F","angrtvb":"\u22BE","angrtvbd":"\u299D","angsph":"\u2222","angst":"\u00C5","angzarr":"\u237C","Aogon":"\u0104","aogon":"\u0105","Aopf":"\uD835\uDD38","aopf":"\uD835\uDD52","apacir":"\u2A6F","ap":"\u2248","apE":"\u2A70","ape":"\u224A","apid":"\u224B","apos":"'","ApplyFunction":"\u2061","approx":"\u2248","approxeq":"\u224A","Aring":"\u00C5","aring":"\u00E5","Ascr":"\uD835\uDC9C","ascr":"\uD835\uDCB6","Assign":"\u2254","ast":"*","asymp":"\u2248","asympeq":"\u224D","Atilde":"\u00C3","atilde":"\u00E3","Auml":"\u00C4","auml":"\u00E4","awconint":"\u2233","awint":"\u2A11","backcong":"\u224C","backepsilon":"\u03F6","backprime":"\u2035","backsim":"\u223D","backsimeq":"\u22CD","Backslash":"\u2216","Barv":"\u2AE7","barvee":"\u22BD","barwed":"\u2305","Barwed":"\u2306","barwedge":"\u2305","bbrk":"\u23B5","bbrktbrk":"\u23B6","bcong":"\u224C","Bcy":"\u0411","bcy":"\u0431","bdquo":"\u201E","becaus":"\u2235","because":"\u2235","Because":"\u2235","bemptyv":"\u29B0","bepsi":"\u03F6","bernou":"\u212C","Bernoullis":"\u212C","Beta":"\u0392","beta":"\u03B2","beth":"\u2136","between":"\u226C","Bfr":"\uD835\uDD05","bfr":"\uD835\uDD1F","bigcap":"\u22C2","bigcirc":"\u25EF","bigcup":"\u22C3","bigodot":"\u2A00","bigoplus":"\u2A01","bigotimes":"\u2A02","bigsqcup":"\u2A06","bigstar":"\u2605","bigtriangledown":"\u25BD","bigtriangleup":"\u25B3","biguplus":"\u2A04","bigvee":"\u22C1","bigwedge":"\u22C0","bkarow":"\u290D","blacklozenge":"\u29EB","blacksquare":"\u25AA","blacktriangle":"\u25B4","blacktriangledown":"\u25BE","blacktriangleleft":"\u25C2","blacktriangleright":"\u25B8","blank":"\u2423","blk12":"\u2592","blk14":"\u2591","blk34":"\u2593","block":"\u2588","bne":"=\u20E5","bnequiv":"\u2261\u20E5","bNot":"\u2AED","bnot":"\u2310","Bopf":"\uD835\uDD39","bopf":"\uD835\uDD53","bot":"\u22A5","bottom":"\u22A5","bowtie":"\u22C8","boxbox":"\u29C9","boxdl":"\u2510","boxdL":"\u2555","boxDl":"\u2556","boxDL":"\u2557","boxdr":"\u250C","boxdR":"\u2552","boxDr":"\u2553","boxDR":"\u2554","boxh":"\u2500","boxH":"\u2550","boxhd":"\u252C","boxHd":"\u2564","boxhD":"\u2565","boxHD":"\u2566","boxhu":"\u2534","boxHu":"\u2567","boxhU":"\u2568","boxHU":"\u2569","boxminus":"\u229F","boxplus":"\u229E","boxtimes":"\u22A0","boxul":"\u2518","boxuL":"\u255B","boxUl":"\u255C","boxUL":"\u255D","boxur":"\u2514","boxuR":"\u2558","boxUr":"\u2559","boxUR":"\u255A","boxv":"\u2502","boxV":"\u2551","boxvh":"\u253C","boxvH":"\u256A","boxVh":"\u256B","boxVH":"\u256C","boxvl":"\u2524","boxvL":"\u2561","boxVl":"\u2562","boxVL":"\u2563","boxvr":"\u251C","boxvR":"\u255E","boxVr":"\u255F","boxVR":"\u2560","bprime":"\u2035","breve":"\u02D8","Breve":"\u02D8","brvbar":"\u00A6","bscr":"\uD835\uDCB7","Bscr":"\u212C","bsemi":"\u204F","bsim":"\u223D","bsime":"\u22CD","bsolb":"\u29C5","bsol":"\\","bsolhsub":"\u27C8","bull":"\u2022","bullet":"\u2022","bump":"\u224E","bumpE":"\u2AAE","bumpe":"\u224F","Bumpeq":"\u224E","bumpeq":"\u224F","Cacute":"\u0106","cacute":"\u0107","capand":"\u2A44","capbrcup":"\u2A49","capcap":"\u2A4B","cap":"\u2229","Cap":"\u22D2","capcup":"\u2A47","capdot":"\u2A40","CapitalDifferentialD":"\u2145","caps":"\u2229\uFE00","caret":"\u2041","caron":"\u02C7","Cayleys":"\u212D","ccaps":"\u2A4D","Ccaron":"\u010C","ccaron":"\u010D","Ccedil":"\u00C7","ccedil":"\u00E7","Ccirc":"\u0108","ccirc":"\u0109","Cconint":"\u2230","ccups":"\u2A4C","ccupssm":"\u2A50","Cdot":"\u010A","cdot":"\u010B","cedil":"\u00B8","Cedilla":"\u00B8","cemptyv":"\u29B2","cent":"\u00A2","centerdot":"\u00B7","CenterDot":"\u00B7","cfr":"\uD835\uDD20","Cfr":"\u212D","CHcy":"\u0427","chcy":"\u0447","check":"\u2713","checkmark":"\u2713","Chi":"\u03A7","chi":"\u03C7","circ":"\u02C6","circeq":"\u2257","circlearrowleft":"\u21BA","circlearrowright":"\u21BB","circledast":"\u229B","circledcirc":"\u229A","circleddash":"\u229D","CircleDot":"\u2299","circledR":"\u00AE","circledS":"\u24C8","CircleMinus":"\u2296","CirclePlus":"\u2295","CircleTimes":"\u2297","cir":"\u25CB","cirE":"\u29C3","cire":"\u2257","cirfnint":"\u2A10","cirmid":"\u2AEF","cirscir":"\u29C2","ClockwiseContourIntegral":"\u2232","CloseCurlyDoubleQuote":"\u201D","CloseCurlyQuote":"\u2019","clubs":"\u2663","clubsuit":"\u2663","colon":":","Colon":"\u2237","Colone":"\u2A74","colone":"\u2254","coloneq":"\u2254","comma":",","commat":"@","comp":"\u2201","compfn":"\u2218","complement":"\u2201","complexes":"\u2102","cong":"\u2245","congdot":"\u2A6D","Congruent":"\u2261","conint":"\u222E","Conint":"\u222F","ContourIntegral":"\u222E","copf":"\uD835\uDD54","Copf":"\u2102","coprod":"\u2210","Coproduct":"\u2210","copy":"\u00A9","COPY":"\u00A9","copysr":"\u2117","CounterClockwiseContourIntegral":"\u2233","crarr":"\u21B5","cross":"\u2717","Cross":"\u2A2F","Cscr":"\uD835\uDC9E","cscr":"\uD835\uDCB8","csub":"\u2ACF","csube":"\u2AD1","csup":"\u2AD0","csupe":"\u2AD2","ctdot":"\u22EF","cudarrl":"\u2938","cudarrr":"\u2935","cuepr":"\u22DE","cuesc":"\u22DF","cularr":"\u21B6","cularrp":"\u293D","cupbrcap":"\u2A48","cupcap":"\u2A46","CupCap":"\u224D","cup":"\u222A","Cup":"\u22D3","cupcup":"\u2A4A","cupdot":"\u228D","cupor":"\u2A45","cups":"\u222A\uFE00","curarr":"\u21B7","curarrm":"\u293C","curlyeqprec":"\u22DE","curlyeqsucc":"\u22DF","curlyvee":"\u22CE","curlywedge":"\u22CF","curren":"\u00A4","curvearrowleft":"\u21B6","curvearrowright":"\u21B7","cuvee":"\u22CE","cuwed":"\u22CF","cwconint":"\u2232","cwint":"\u2231","cylcty":"\u232D","dagger":"\u2020","Dagger":"\u2021","daleth":"\u2138","darr":"\u2193","Darr":"\u21A1","dArr":"\u21D3","dash":"\u2010","Dashv":"\u2AE4","dashv":"\u22A3","dbkarow":"\u290F","dblac":"\u02DD","Dcaron":"\u010E","dcaron":"\u010F","Dcy":"\u0414","dcy":"\u0434","ddagger":"\u2021","ddarr":"\u21CA","DD":"\u2145","dd":"\u2146","DDotrahd":"\u2911","ddotseq":"\u2A77","deg":"\u00B0","Del":"\u2207","Delta":"\u0394","delta":"\u03B4","demptyv":"\u29B1","dfisht":"\u297F","Dfr":"\uD835\uDD07","dfr":"\uD835\uDD21","dHar":"\u2965","dharl":"\u21C3","dharr":"\u21C2","DiacriticalAcute":"\u00B4","DiacriticalDot":"\u02D9","DiacriticalDoubleAcute":"\u02DD","DiacriticalGrave":"`","DiacriticalTilde":"\u02DC","diam":"\u22C4","diamond":"\u22C4","Diamond":"\u22C4","diamondsuit":"\u2666","diams":"\u2666","die":"\u00A8","DifferentialD":"\u2146","digamma":"\u03DD","disin":"\u22F2","div":"\u00F7","divide":"\u00F7","divideontimes":"\u22C7","divonx":"\u22C7","DJcy":"\u0402","djcy":"\u0452","dlcorn":"\u231E","dlcrop":"\u230D","dollar":"$","Dopf":"\uD835\uDD3B","dopf":"\uD835\uDD55","Dot":"\u00A8","dot":"\u02D9","DotDot":"\u20DC","doteq":"\u2250","doteqdot":"\u2251","DotEqual":"\u2250","dotminus":"\u2238","dotplus":"\u2214","dotsquare":"\u22A1","doublebarwedge":"\u2306","DoubleContourIntegral":"\u222F","DoubleDot":"\u00A8","DoubleDownArrow":"\u21D3","DoubleLeftArrow":"\u21D0","DoubleLeftRightArrow":"\u21D4","DoubleLeftTee":"\u2AE4","DoubleLongLeftArrow":"\u27F8","DoubleLongLeftRightArrow":"\u27FA","DoubleLongRightArrow":"\u27F9","DoubleRightArrow":"\u21D2","DoubleRightTee":"\u22A8","DoubleUpArrow":"\u21D1","DoubleUpDownArrow":"\u21D5","DoubleVerticalBar":"\u2225","DownArrowBar":"\u2913","downarrow":"\u2193","DownArrow":"\u2193","Downarrow":"\u21D3","DownArrowUpArrow":"\u21F5","DownBreve":"\u0311","downdownarrows":"\u21CA","downharpoonleft":"\u21C3","downharpoonright":"\u21C2","DownLeftRightVector":"\u2950","DownLeftTeeVector":"\u295E","DownLeftVectorBar":"\u2956","DownLeftVector":"\u21BD","DownRightTeeVector":"\u295F","DownRightVectorBar":"\u2957","DownRightVector":"\u21C1","DownTeeArrow":"\u21A7","DownTee":"\u22A4","drbkarow":"\u2910","drcorn":"\u231F","drcrop":"\u230C","Dscr":"\uD835\uDC9F","dscr":"\uD835\uDCB9","DScy":"\u0405","dscy":"\u0455","dsol":"\u29F6","Dstrok":"\u0110","dstrok":"\u0111","dtdot":"\u22F1","dtri":"\u25BF","dtrif":"\u25BE","duarr":"\u21F5","duhar":"\u296F","dwangle":"\u29A6","DZcy":"\u040F","dzcy":"\u045F","dzigrarr":"\u27FF","Eacute":"\u00C9","eacute":"\u00E9","easter":"\u2A6E","Ecaron":"\u011A","ecaron":"\u011B","Ecirc":"\u00CA","ecirc":"\u00EA","ecir":"\u2256","ecolon":"\u2255","Ecy":"\u042D","ecy":"\u044D","eDDot":"\u2A77","Edot":"\u0116","edot":"\u0117","eDot":"\u2251","ee":"\u2147","efDot":"\u2252","Efr":"\uD835\uDD08","efr":"\uD835\uDD22","eg":"\u2A9A","Egrave":"\u00C8","egrave":"\u00E8","egs":"\u2A96","egsdot":"\u2A98","el":"\u2A99","Element":"\u2208","elinters":"\u23E7","ell":"\u2113","els":"\u2A95","elsdot":"\u2A97","Emacr":"\u0112","emacr":"\u0113","empty":"\u2205","emptyset":"\u2205","EmptySmallSquare":"\u25FB","emptyv":"\u2205","EmptyVerySmallSquare":"\u25AB","emsp13":"\u2004","emsp14":"\u2005","emsp":"\u2003","ENG":"\u014A","eng":"\u014B","ensp":"\u2002","Eogon":"\u0118","eogon":"\u0119","Eopf":"\uD835\uDD3C","eopf":"\uD835\uDD56","epar":"\u22D5","eparsl":"\u29E3","eplus":"\u2A71","epsi":"\u03B5","Epsilon":"\u0395","epsilon":"\u03B5","epsiv":"\u03F5","eqcirc":"\u2256","eqcolon":"\u2255","eqsim":"\u2242","eqslantgtr":"\u2A96","eqslantless":"\u2A95","Equal":"\u2A75","equals":"=","EqualTilde":"\u2242","equest":"\u225F","Equilibrium":"\u21CC","equiv":"\u2261","equivDD":"\u2A78","eqvparsl":"\u29E5","erarr":"\u2971","erDot":"\u2253","escr":"\u212F","Escr":"\u2130","esdot":"\u2250","Esim":"\u2A73","esim":"\u2242","Eta":"\u0397","eta":"\u03B7","ETH":"\u00D0","eth":"\u00F0","Euml":"\u00CB","euml":"\u00EB","euro":"\u20AC","excl":"!","exist":"\u2203","Exists":"\u2203","expectation":"\u2130","exponentiale":"\u2147","ExponentialE":"\u2147","fallingdotseq":"\u2252","Fcy":"\u0424","fcy":"\u0444","female":"\u2640","ffilig":"\uFB03","fflig":"\uFB00","ffllig":"\uFB04","Ffr":"\uD835\uDD09","ffr":"\uD835\uDD23","filig":"\uFB01","FilledSmallSquare":"\u25FC","FilledVerySmallSquare":"\u25AA","fjlig":"fj","flat":"\u266D","fllig":"\uFB02","fltns":"\u25B1","fnof":"\u0192","Fopf":"\uD835\uDD3D","fopf":"\uD835\uDD57","forall":"\u2200","ForAll":"\u2200","fork":"\u22D4","forkv":"\u2AD9","Fouriertrf":"\u2131","fpartint":"\u2A0D","frac12":"\u00BD","frac13":"\u2153","frac14":"\u00BC","frac15":"\u2155","frac16":"\u2159","frac18":"\u215B","frac23":"\u2154","frac25":"\u2156","frac34":"\u00BE","frac35":"\u2157","frac38":"\u215C","frac45":"\u2158","frac56":"\u215A","frac58":"\u215D","frac78":"\u215E","frasl":"\u2044","frown":"\u2322","fscr":"\uD835\uDCBB","Fscr":"\u2131","gacute":"\u01F5","Gamma":"\u0393","gamma":"\u03B3","Gammad":"\u03DC","gammad":"\u03DD","gap":"\u2A86","Gbreve":"\u011E","gbreve":"\u011F","Gcedil":"\u0122","Gcirc":"\u011C","gcirc":"\u011D","Gcy":"\u0413","gcy":"\u0433","Gdot":"\u0120","gdot":"\u0121","ge":"\u2265","gE":"\u2267","gEl":"\u2A8C","gel":"\u22DB","geq":"\u2265","geqq":"\u2267","geqslant":"\u2A7E","gescc":"\u2AA9","ges":"\u2A7E","gesdot":"\u2A80","gesdoto":"\u2A82","gesdotol":"\u2A84","gesl":"\u22DB\uFE00","gesles":"\u2A94","Gfr":"\uD835\uDD0A","gfr":"\uD835\uDD24","gg":"\u226B","Gg":"\u22D9","ggg":"\u22D9","gimel":"\u2137","GJcy":"\u0403","gjcy":"\u0453","gla":"\u2AA5","gl":"\u2277","glE":"\u2A92","glj":"\u2AA4","gnap":"\u2A8A","gnapprox":"\u2A8A","gne":"\u2A88","gnE":"\u2269","gneq":"\u2A88","gneqq":"\u2269","gnsim":"\u22E7","Gopf":"\uD835\uDD3E","gopf":"\uD835\uDD58","grave":"`","GreaterEqual":"\u2265","GreaterEqualLess":"\u22DB","GreaterFullEqual":"\u2267","GreaterGreater":"\u2AA2","GreaterLess":"\u2277","GreaterSlantEqual":"\u2A7E","GreaterTilde":"\u2273","Gscr":"\uD835\uDCA2","gscr":"\u210A","gsim":"\u2273","gsime":"\u2A8E","gsiml":"\u2A90","gtcc":"\u2AA7","gtcir":"\u2A7A","gt":">","GT":">","Gt":"\u226B","gtdot":"\u22D7","gtlPar":"\u2995","gtquest":"\u2A7C","gtrapprox":"\u2A86","gtrarr":"\u2978","gtrdot":"\u22D7","gtreqless":"\u22DB","gtreqqless":"\u2A8C","gtrless":"\u2277","gtrsim":"\u2273","gvertneqq":"\u2269\uFE00","gvnE":"\u2269\uFE00","Hacek":"\u02C7","hairsp":"\u200A","half":"\u00BD","hamilt":"\u210B","HARDcy":"\u042A","hardcy":"\u044A","harrcir":"\u2948","harr":"\u2194","hArr":"\u21D4","harrw":"\u21AD","Hat":"^","hbar":"\u210F","Hcirc":"\u0124","hcirc":"\u0125","hearts":"\u2665","heartsuit":"\u2665","hellip":"\u2026","hercon":"\u22B9","hfr":"\uD835\uDD25","Hfr":"\u210C","HilbertSpace":"\u210B","hksearow":"\u2925","hkswarow":"\u2926","hoarr":"\u21FF","homtht":"\u223B","hookleftarrow":"\u21A9","hookrightarrow":"\u21AA","hopf":"\uD835\uDD59","Hopf":"\u210D","horbar":"\u2015","HorizontalLine":"\u2500","hscr":"\uD835\uDCBD","Hscr":"\u210B","hslash":"\u210F","Hstrok":"\u0126","hstrok":"\u0127","HumpDownHump":"\u224E","HumpEqual":"\u224F","hybull":"\u2043","hyphen":"\u2010","Iacute":"\u00CD","iacute":"\u00ED","ic":"\u2063","Icirc":"\u00CE","icirc":"\u00EE","Icy":"\u0418","icy":"\u0438","Idot":"\u0130","IEcy":"\u0415","iecy":"\u0435","iexcl":"\u00A1","iff":"\u21D4","ifr":"\uD835\uDD26","Ifr":"\u2111","Igrave":"\u00CC","igrave":"\u00EC","ii":"\u2148","iiiint":"\u2A0C","iiint":"\u222D","iinfin":"\u29DC","iiota":"\u2129","IJlig":"\u0132","ijlig":"\u0133","Imacr":"\u012A","imacr":"\u012B","image":"\u2111","ImaginaryI":"\u2148","imagline":"\u2110","imagpart":"\u2111","imath":"\u0131","Im":"\u2111","imof":"\u22B7","imped":"\u01B5","Implies":"\u21D2","incare":"\u2105","in":"\u2208","infin":"\u221E","infintie":"\u29DD","inodot":"\u0131","intcal":"\u22BA","int":"\u222B","Int":"\u222C","integers":"\u2124","Integral":"\u222B","intercal":"\u22BA","Intersection":"\u22C2","intlarhk":"\u2A17","intprod":"\u2A3C","InvisibleComma":"\u2063","InvisibleTimes":"\u2062","IOcy":"\u0401","iocy":"\u0451","Iogon":"\u012E","iogon":"\u012F","Iopf":"\uD835\uDD40","iopf":"\uD835\uDD5A","Iota":"\u0399","iota":"\u03B9","iprod":"\u2A3C","iquest":"\u00BF","iscr":"\uD835\uDCBE","Iscr":"\u2110","isin":"\u2208","isindot":"\u22F5","isinE":"\u22F9","isins":"\u22F4","isinsv":"\u22F3","isinv":"\u2208","it":"\u2062","Itilde":"\u0128","itilde":"\u0129","Iukcy":"\u0406","iukcy":"\u0456","Iuml":"\u00CF","iuml":"\u00EF","Jcirc":"\u0134","jcirc":"\u0135","Jcy":"\u0419","jcy":"\u0439","Jfr":"\uD835\uDD0D","jfr":"\uD835\uDD27","jmath":"\u0237","Jopf":"\uD835\uDD41","jopf":"\uD835\uDD5B","Jscr":"\uD835\uDCA5","jscr":"\uD835\uDCBF","Jsercy":"\u0408","jsercy":"\u0458","Jukcy":"\u0404","jukcy":"\u0454","Kappa":"\u039A","kappa":"\u03BA","kappav":"\u03F0","Kcedil":"\u0136","kcedil":"\u0137","Kcy":"\u041A","kcy":"\u043A","Kfr":"\uD835\uDD0E","kfr":"\uD835\uDD28","kgreen":"\u0138","KHcy":"\u0425","khcy":"\u0445","KJcy":"\u040C","kjcy":"\u045C","Kopf":"\uD835\uDD42","kopf":"\uD835\uDD5C","Kscr":"\uD835\uDCA6","kscr":"\uD835\uDCC0","lAarr":"\u21DA","Lacute":"\u0139","lacute":"\u013A","laemptyv":"\u29B4","lagran":"\u2112","Lambda":"\u039B","lambda":"\u03BB","lang":"\u27E8","Lang":"\u27EA","langd":"\u2991","langle":"\u27E8","lap":"\u2A85","Laplacetrf":"\u2112","laquo":"\u00AB","larrb":"\u21E4","larrbfs":"\u291F","larr":"\u2190","Larr":"\u219E","lArr":"\u21D0","larrfs":"\u291D","larrhk":"\u21A9","larrlp":"\u21AB","larrpl":"\u2939","larrsim":"\u2973","larrtl":"\u21A2","latail":"\u2919","lAtail":"\u291B","lat":"\u2AAB","late":"\u2AAD","lates":"\u2AAD\uFE00","lbarr":"\u290C","lBarr":"\u290E","lbbrk":"\u2772","lbrace":"{","lbrack":"[","lbrke":"\u298B","lbrksld":"\u298F","lbrkslu":"\u298D","Lcaron":"\u013D","lcaron":"\u013E","Lcedil":"\u013B","lcedil":"\u013C","lceil":"\u2308","lcub":"{","Lcy":"\u041B","lcy":"\u043B","ldca":"\u2936","ldquo":"\u201C","ldquor":"\u201E","ldrdhar":"\u2967","ldrushar":"\u294B","ldsh":"\u21B2","le":"\u2264","lE":"\u2266","LeftAngleBracket":"\u27E8","LeftArrowBar":"\u21E4","leftarrow":"\u2190","LeftArrow":"\u2190","Leftarrow":"\u21D0","LeftArrowRightArrow":"\u21C6","leftarrowtail":"\u21A2","LeftCeiling":"\u2308","LeftDoubleBracket":"\u27E6","LeftDownTeeVector":"\u2961","LeftDownVectorBar":"\u2959","LeftDownVector":"\u21C3","LeftFloor":"\u230A","leftharpoondown":"\u21BD","leftharpoonup":"\u21BC","leftleftarrows":"\u21C7","leftrightarrow":"\u2194","LeftRightArrow":"\u2194","Leftrightarrow":"\u21D4","leftrightarrows":"\u21C6","leftrightharpoons":"\u21CB","leftrightsquigarrow":"\u21AD","LeftRightVector":"\u294E","LeftTeeArrow":"\u21A4","LeftTee":"\u22A3","LeftTeeVector":"\u295A","leftthreetimes":"\u22CB","LeftTriangleBar":"\u29CF","LeftTriangle":"\u22B2","LeftTriangleEqual":"\u22B4","LeftUpDownVector":"\u2951","LeftUpTeeVector":"\u2960","LeftUpVectorBar":"\u2958","LeftUpVector":"\u21BF","LeftVectorBar":"\u2952","LeftVector":"\u21BC","lEg":"\u2A8B","leg":"\u22DA","leq":"\u2264","leqq":"\u2266","leqslant":"\u2A7D","lescc":"\u2AA8","les":"\u2A7D","lesdot":"\u2A7F","lesdoto":"\u2A81","lesdotor":"\u2A83","lesg":"\u22DA\uFE00","lesges":"\u2A93","lessapprox":"\u2A85","lessdot":"\u22D6","lesseqgtr":"\u22DA","lesseqqgtr":"\u2A8B","LessEqualGreater":"\u22DA","LessFullEqual":"\u2266","LessGreater":"\u2276","lessgtr":"\u2276","LessLess":"\u2AA1","lesssim":"\u2272","LessSlantEqual":"\u2A7D","LessTilde":"\u2272","lfisht":"\u297C","lfloor":"\u230A","Lfr":"\uD835\uDD0F","lfr":"\uD835\uDD29","lg":"\u2276","lgE":"\u2A91","lHar":"\u2962","lhard":"\u21BD","lharu":"\u21BC","lharul":"\u296A","lhblk":"\u2584","LJcy":"\u0409","ljcy":"\u0459","llarr":"\u21C7","ll":"\u226A","Ll":"\u22D8","llcorner":"\u231E","Lleftarrow":"\u21DA","llhard":"\u296B","lltri":"\u25FA","Lmidot":"\u013F","lmidot":"\u0140","lmoustache":"\u23B0","lmoust":"\u23B0","lnap":"\u2A89","lnapprox":"\u2A89","lne":"\u2A87","lnE":"\u2268","lneq":"\u2A87","lneqq":"\u2268","lnsim":"\u22E6","loang":"\u27EC","loarr":"\u21FD","lobrk":"\u27E6","longleftarrow":"\u27F5","LongLeftArrow":"\u27F5","Longleftarrow":"\u27F8","longleftrightarrow":"\u27F7","LongLeftRightArrow":"\u27F7","Longleftrightarrow":"\u27FA","longmapsto":"\u27FC","longrightarrow":"\u27F6","LongRightArrow":"\u27F6","Longrightarrow":"\u27F9","looparrowleft":"\u21AB","looparrowright":"\u21AC","lopar":"\u2985","Lopf":"\uD835\uDD43","lopf":"\uD835\uDD5D","loplus":"\u2A2D","lotimes":"\u2A34","lowast":"\u2217","lowbar":"_","LowerLeftArrow":"\u2199","LowerRightArrow":"\u2198","loz":"\u25CA","lozenge":"\u25CA","lozf":"\u29EB","lpar":"(","lparlt":"\u2993","lrarr":"\u21C6","lrcorner":"\u231F","lrhar":"\u21CB","lrhard":"\u296D","lrm":"\u200E","lrtri":"\u22BF","lsaquo":"\u2039","lscr":"\uD835\uDCC1","Lscr":"\u2112","lsh":"\u21B0","Lsh":"\u21B0","lsim":"\u2272","lsime":"\u2A8D","lsimg":"\u2A8F","lsqb":"[","lsquo":"\u2018","lsquor":"\u201A","Lstrok":"\u0141","lstrok":"\u0142","ltcc":"\u2AA6","ltcir":"\u2A79","lt":"<","LT":"<","Lt":"\u226A","ltdot":"\u22D6","lthree":"\u22CB","ltimes":"\u22C9","ltlarr":"\u2976","ltquest":"\u2A7B","ltri":"\u25C3","ltrie":"\u22B4","ltrif":"\u25C2","ltrPar":"\u2996","lurdshar":"\u294A","luruhar":"\u2966","lvertneqq":"\u2268\uFE00","lvnE":"\u2268\uFE00","macr":"\u00AF","male":"\u2642","malt":"\u2720","maltese":"\u2720","Map":"\u2905","map":"\u21A6","mapsto":"\u21A6","mapstodown":"\u21A7","mapstoleft":"\u21A4","mapstoup":"\u21A5","marker":"\u25AE","mcomma":"\u2A29","Mcy":"\u041C","mcy":"\u043C","mdash":"\u2014","mDDot":"\u223A","measuredangle":"\u2221","MediumSpace":"\u205F","Mellintrf":"\u2133","Mfr":"\uD835\uDD10","mfr":"\uD835\uDD2A","mho":"\u2127","micro":"\u00B5","midast":"*","midcir":"\u2AF0","mid":"\u2223","middot":"\u00B7","minusb":"\u229F","minus":"\u2212","minusd":"\u2238","minusdu":"\u2A2A","MinusPlus":"\u2213","mlcp":"\u2ADB","mldr":"\u2026","mnplus":"\u2213","models":"\u22A7","Mopf":"\uD835\uDD44","mopf":"\uD835\uDD5E","mp":"\u2213","mscr":"\uD835\uDCC2","Mscr":"\u2133","mstpos":"\u223E","Mu":"\u039C","mu":"\u03BC","multimap":"\u22B8","mumap":"\u22B8","nabla":"\u2207","Nacute":"\u0143","nacute":"\u0144","nang":"\u2220\u20D2","nap":"\u2249","napE":"\u2A70\u0338","napid":"\u224B\u0338","napos":"\u0149","napprox":"\u2249","natural":"\u266E","naturals":"\u2115","natur":"\u266E","nbsp":"\u00A0","nbump":"\u224E\u0338","nbumpe":"\u224F\u0338","ncap":"\u2A43","Ncaron":"\u0147","ncaron":"\u0148","Ncedil":"\u0145","ncedil":"\u0146","ncong":"\u2247","ncongdot":"\u2A6D\u0338","ncup":"\u2A42","Ncy":"\u041D","ncy":"\u043D","ndash":"\u2013","nearhk":"\u2924","nearr":"\u2197","neArr":"\u21D7","nearrow":"\u2197","ne":"\u2260","nedot":"\u2250\u0338","NegativeMediumSpace":"\u200B","NegativeThickSpace":"\u200B","NegativeThinSpace":"\u200B","NegativeVeryThinSpace":"\u200B","nequiv":"\u2262","nesear":"\u2928","nesim":"\u2242\u0338","NestedGreaterGreater":"\u226B","NestedLessLess":"\u226A","NewLine":"\n","nexist":"\u2204","nexists":"\u2204","Nfr":"\uD835\uDD11","nfr":"\uD835\uDD2B","ngE":"\u2267\u0338","nge":"\u2271","ngeq":"\u2271","ngeqq":"\u2267\u0338","ngeqslant":"\u2A7E\u0338","nges":"\u2A7E\u0338","nGg":"\u22D9\u0338","ngsim":"\u2275","nGt":"\u226B\u20D2","ngt":"\u226F","ngtr":"\u226F","nGtv":"\u226B\u0338","nharr":"\u21AE","nhArr":"\u21CE","nhpar":"\u2AF2","ni":"\u220B","nis":"\u22FC","nisd":"\u22FA","niv":"\u220B","NJcy":"\u040A","njcy":"\u045A","nlarr":"\u219A","nlArr":"\u21CD","nldr":"\u2025","nlE":"\u2266\u0338","nle":"\u2270","nleftarrow":"\u219A","nLeftarrow":"\u21CD","nleftrightarrow":"\u21AE","nLeftrightarrow":"\u21CE","nleq":"\u2270","nleqq":"\u2266\u0338","nleqslant":"\u2A7D\u0338","nles":"\u2A7D\u0338","nless":"\u226E","nLl":"\u22D8\u0338","nlsim":"\u2274","nLt":"\u226A\u20D2","nlt":"\u226E","nltri":"\u22EA","nltrie":"\u22EC","nLtv":"\u226A\u0338","nmid":"\u2224","NoBreak":"\u2060","NonBreakingSpace":"\u00A0","nopf":"\uD835\uDD5F","Nopf":"\u2115","Not":"\u2AEC","not":"\u00AC","NotCongruent":"\u2262","NotCupCap":"\u226D","NotDoubleVerticalBar":"\u2226","NotElement":"\u2209","NotEqual":"\u2260","NotEqualTilde":"\u2242\u0338","NotExists":"\u2204","NotGreater":"\u226F","NotGreaterEqual":"\u2271","NotGreaterFullEqual":"\u2267\u0338","NotGreaterGreater":"\u226B\u0338","NotGreaterLess":"\u2279","NotGreaterSlantEqual":"\u2A7E\u0338","NotGreaterTilde":"\u2275","NotHumpDownHump":"\u224E\u0338","NotHumpEqual":"\u224F\u0338","notin":"\u2209","notindot":"\u22F5\u0338","notinE":"\u22F9\u0338","notinva":"\u2209","notinvb":"\u22F7","notinvc":"\u22F6","NotLeftTriangleBar":"\u29CF\u0338","NotLeftTriangle":"\u22EA","NotLeftTriangleEqual":"\u22EC","NotLess":"\u226E","NotLessEqual":"\u2270","NotLessGreater":"\u2278","NotLessLess":"\u226A\u0338","NotLessSlantEqual":"\u2A7D\u0338","NotLessTilde":"\u2274","NotNestedGreaterGreater":"\u2AA2\u0338","NotNestedLessLess":"\u2AA1\u0338","notni":"\u220C","notniva":"\u220C","notnivb":"\u22FE","notnivc":"\u22FD","NotPrecedes":"\u2280","NotPrecedesEqual":"\u2AAF\u0338","NotPrecedesSlantEqual":"\u22E0","NotReverseElement":"\u220C","NotRightTriangleBar":"\u29D0\u0338","NotRightTriangle":"\u22EB","NotRightTriangleEqual":"\u22ED","NotSquareSubset":"\u228F\u0338","NotSquareSubsetEqual":"\u22E2","NotSquareSuperset":"\u2290\u0338","NotSquareSupersetEqual":"\u22E3","NotSubset":"\u2282\u20D2","NotSubsetEqual":"\u2288","NotSucceeds":"\u2281","NotSucceedsEqual":"\u2AB0\u0338","NotSucceedsSlantEqual":"\u22E1","NotSucceedsTilde":"\u227F\u0338","NotSuperset":"\u2283\u20D2","NotSupersetEqual":"\u2289","NotTilde":"\u2241","NotTildeEqual":"\u2244","NotTildeFullEqual":"\u2247","NotTildeTilde":"\u2249","NotVerticalBar":"\u2224","nparallel":"\u2226","npar":"\u2226","nparsl":"\u2AFD\u20E5","npart":"\u2202\u0338","npolint":"\u2A14","npr":"\u2280","nprcue":"\u22E0","nprec":"\u2280","npreceq":"\u2AAF\u0338","npre":"\u2AAF\u0338","nrarrc":"\u2933\u0338","nrarr":"\u219B","nrArr":"\u21CF","nrarrw":"\u219D\u0338","nrightarrow":"\u219B","nRightarrow":"\u21CF","nrtri":"\u22EB","nrtrie":"\u22ED","nsc":"\u2281","nsccue":"\u22E1","nsce":"\u2AB0\u0338","Nscr":"\uD835\uDCA9","nscr":"\uD835\uDCC3","nshortmid":"\u2224","nshortparallel":"\u2226","nsim":"\u2241","nsime":"\u2244","nsimeq":"\u2244","nsmid":"\u2224","nspar":"\u2226","nsqsube":"\u22E2","nsqsupe":"\u22E3","nsub":"\u2284","nsubE":"\u2AC5\u0338","nsube":"\u2288","nsubset":"\u2282\u20D2","nsubseteq":"\u2288","nsubseteqq":"\u2AC5\u0338","nsucc":"\u2281","nsucceq":"\u2AB0\u0338","nsup":"\u2285","nsupE":"\u2AC6\u0338","nsupe":"\u2289","nsupset":"\u2283\u20D2","nsupseteq":"\u2289","nsupseteqq":"\u2AC6\u0338","ntgl":"\u2279","Ntilde":"\u00D1","ntilde":"\u00F1","ntlg":"\u2278","ntriangleleft":"\u22EA","ntrianglelefteq":"\u22EC","ntriangleright":"\u22EB","ntrianglerighteq":"\u22ED","Nu":"\u039D","nu":"\u03BD","num":"#","numero":"\u2116","numsp":"\u2007","nvap":"\u224D\u20D2","nvdash":"\u22AC","nvDash":"\u22AD","nVdash":"\u22AE","nVDash":"\u22AF","nvge":"\u2265\u20D2","nvgt":">\u20D2","nvHarr":"\u2904","nvinfin":"\u29DE","nvlArr":"\u2902","nvle":"\u2264\u20D2","nvlt":"<\u20D2","nvltrie":"\u22B4\u20D2","nvrArr":"\u2903","nvrtrie":"\u22B5\u20D2","nvsim":"\u223C\u20D2","nwarhk":"\u2923","nwarr":"\u2196","nwArr":"\u21D6","nwarrow":"\u2196","nwnear":"\u2927","Oacute":"\u00D3","oacute":"\u00F3","oast":"\u229B","Ocirc":"\u00D4","ocirc":"\u00F4","ocir":"\u229A","Ocy":"\u041E","ocy":"\u043E","odash":"\u229D","Odblac":"\u0150","odblac":"\u0151","odiv":"\u2A38","odot":"\u2299","odsold":"\u29BC","OElig":"\u0152","oelig":"\u0153","ofcir":"\u29BF","Ofr":"\uD835\uDD12","ofr":"\uD835\uDD2C","ogon":"\u02DB","Ograve":"\u00D2","ograve":"\u00F2","ogt":"\u29C1","ohbar":"\u29B5","ohm":"\u03A9","oint":"\u222E","olarr":"\u21BA","olcir":"\u29BE","olcross":"\u29BB","oline":"\u203E","olt":"\u29C0","Omacr":"\u014C","omacr":"\u014D","Omega":"\u03A9","omega":"\u03C9","Omicron":"\u039F","omicron":"\u03BF","omid":"\u29B6","ominus":"\u2296","Oopf":"\uD835\uDD46","oopf":"\uD835\uDD60","opar":"\u29B7","OpenCurlyDoubleQuote":"\u201C","OpenCurlyQuote":"\u2018","operp":"\u29B9","oplus":"\u2295","orarr":"\u21BB","Or":"\u2A54","or":"\u2228","ord":"\u2A5D","order":"\u2134","orderof":"\u2134","ordf":"\u00AA","ordm":"\u00BA","origof":"\u22B6","oror":"\u2A56","orslope":"\u2A57","orv":"\u2A5B","oS":"\u24C8","Oscr":"\uD835\uDCAA","oscr":"\u2134","Oslash":"\u00D8","oslash":"\u00F8","osol":"\u2298","Otilde":"\u00D5","otilde":"\u00F5","otimesas":"\u2A36","Otimes":"\u2A37","otimes":"\u2297","Ouml":"\u00D6","ouml":"\u00F6","ovbar":"\u233D","OverBar":"\u203E","OverBrace":"\u23DE","OverBracket":"\u23B4","OverParenthesis":"\u23DC","para":"\u00B6","parallel":"\u2225","par":"\u2225","parsim":"\u2AF3","parsl":"\u2AFD","part":"\u2202","PartialD":"\u2202","Pcy":"\u041F","pcy":"\u043F","percnt":"%","period":".","permil":"\u2030","perp":"\u22A5","pertenk":"\u2031","Pfr":"\uD835\uDD13","pfr":"\uD835\uDD2D","Phi":"\u03A6","phi":"\u03C6","phiv":"\u03D5","phmmat":"\u2133","phone":"\u260E","Pi":"\u03A0","pi":"\u03C0","pitchfork":"\u22D4","piv":"\u03D6","planck":"\u210F","planckh":"\u210E","plankv":"\u210F","plusacir":"\u2A23","plusb":"\u229E","pluscir":"\u2A22","plus":"+","plusdo":"\u2214","plusdu":"\u2A25","pluse":"\u2A72","PlusMinus":"\u00B1","plusmn":"\u00B1","plussim":"\u2A26","plustwo":"\u2A27","pm":"\u00B1","Poincareplane":"\u210C","pointint":"\u2A15","popf":"\uD835\uDD61","Popf":"\u2119","pound":"\u00A3","prap":"\u2AB7","Pr":"\u2ABB","pr":"\u227A","prcue":"\u227C","precapprox":"\u2AB7","prec":"\u227A","preccurlyeq":"\u227C","Precedes":"\u227A","PrecedesEqual":"\u2AAF","PrecedesSlantEqual":"\u227C","PrecedesTilde":"\u227E","preceq":"\u2AAF","precnapprox":"\u2AB9","precneqq":"\u2AB5","precnsim":"\u22E8","pre":"\u2AAF","prE":"\u2AB3","precsim":"\u227E","prime":"\u2032","Prime":"\u2033","primes":"\u2119","prnap":"\u2AB9","prnE":"\u2AB5","prnsim":"\u22E8","prod":"\u220F","Product":"\u220F","profalar":"\u232E","profline":"\u2312","profsurf":"\u2313","prop":"\u221D","Proportional":"\u221D","Proportion":"\u2237","propto":"\u221D","prsim":"\u227E","prurel":"\u22B0","Pscr":"\uD835\uDCAB","pscr":"\uD835\uDCC5","Psi":"\u03A8","psi":"\u03C8","puncsp":"\u2008","Qfr":"\uD835\uDD14","qfr":"\uD835\uDD2E","qint":"\u2A0C","qopf":"\uD835\uDD62","Qopf":"\u211A","qprime":"\u2057","Qscr":"\uD835\uDCAC","qscr":"\uD835\uDCC6","quaternions":"\u210D","quatint":"\u2A16","quest":"?","questeq":"\u225F","quot":"\"","QUOT":"\"","rAarr":"\u21DB","race":"\u223D\u0331","Racute":"\u0154","racute":"\u0155","radic":"\u221A","raemptyv":"\u29B3","rang":"\u27E9","Rang":"\u27EB","rangd":"\u2992","range":"\u29A5","rangle":"\u27E9","raquo":"\u00BB","rarrap":"\u2975","rarrb":"\u21E5","rarrbfs":"\u2920","rarrc":"\u2933","rarr":"\u2192","Rarr":"\u21A0","rArr":"\u21D2","rarrfs":"\u291E","rarrhk":"\u21AA","rarrlp":"\u21AC","rarrpl":"\u2945","rarrsim":"\u2974","Rarrtl":"\u2916","rarrtl":"\u21A3","rarrw":"\u219D","ratail":"\u291A","rAtail":"\u291C","ratio":"\u2236","rationals":"\u211A","rbarr":"\u290D","rBarr":"\u290F","RBarr":"\u2910","rbbrk":"\u2773","rbrace":"}","rbrack":"]","rbrke":"\u298C","rbrksld":"\u298E","rbrkslu":"\u2990","Rcaron":"\u0158","rcaron":"\u0159","Rcedil":"\u0156","rcedil":"\u0157","rceil":"\u2309","rcub":"}","Rcy":"\u0420","rcy":"\u0440","rdca":"\u2937","rdldhar":"\u2969","rdquo":"\u201D","rdquor":"\u201D","rdsh":"\u21B3","real":"\u211C","realine":"\u211B","realpart":"\u211C","reals":"\u211D","Re":"\u211C","rect":"\u25AD","reg":"\u00AE","REG":"\u00AE","ReverseElement":"\u220B","ReverseEquilibrium":"\u21CB","ReverseUpEquilibrium":"\u296F","rfisht":"\u297D","rfloor":"\u230B","rfr":"\uD835\uDD2F","Rfr":"\u211C","rHar":"\u2964","rhard":"\u21C1","rharu":"\u21C0","rharul":"\u296C","Rho":"\u03A1","rho":"\u03C1","rhov":"\u03F1","RightAngleBracket":"\u27E9","RightArrowBar":"\u21E5","rightarrow":"\u2192","RightArrow":"\u2192","Rightarrow":"\u21D2","RightArrowLeftArrow":"\u21C4","rightarrowtail":"\u21A3","RightCeiling":"\u2309","RightDoubleBracket":"\u27E7","RightDownTeeVector":"\u295D","RightDownVectorBar":"\u2955","RightDownVector":"\u21C2","RightFloor":"\u230B","rightharpoondown":"\u21C1","rightharpoonup":"\u21C0","rightleftarrows":"\u21C4","rightleftharpoons":"\u21CC","rightrightarrows":"\u21C9","rightsquigarrow":"\u219D","RightTeeArrow":"\u21A6","RightTee":"\u22A2","RightTeeVector":"\u295B","rightthreetimes":"\u22CC","RightTriangleBar":"\u29D0","RightTriangle":"\u22B3","RightTriangleEqual":"\u22B5","RightUpDownVector":"\u294F","RightUpTeeVector":"\u295C","RightUpVectorBar":"\u2954","RightUpVector":"\u21BE","RightVectorBar":"\u2953","RightVector":"\u21C0","ring":"\u02DA","risingdotseq":"\u2253","rlarr":"\u21C4","rlhar":"\u21CC","rlm":"\u200F","rmoustache":"\u23B1","rmoust":"\u23B1","rnmid":"\u2AEE","roang":"\u27ED","roarr":"\u21FE","robrk":"\u27E7","ropar":"\u2986","ropf":"\uD835\uDD63","Ropf":"\u211D","roplus":"\u2A2E","rotimes":"\u2A35","RoundImplies":"\u2970","rpar":")","rpargt":"\u2994","rppolint":"\u2A12","rrarr":"\u21C9","Rrightarrow":"\u21DB","rsaquo":"\u203A","rscr":"\uD835\uDCC7","Rscr":"\u211B","rsh":"\u21B1","Rsh":"\u21B1","rsqb":"]","rsquo":"\u2019","rsquor":"\u2019","rthree":"\u22CC","rtimes":"\u22CA","rtri":"\u25B9","rtrie":"\u22B5","rtrif":"\u25B8","rtriltri":"\u29CE","RuleDelayed":"\u29F4","ruluhar":"\u2968","rx":"\u211E","Sacute":"\u015A","sacute":"\u015B","sbquo":"\u201A","scap":"\u2AB8","Scaron":"\u0160","scaron":"\u0161","Sc":"\u2ABC","sc":"\u227B","sccue":"\u227D","sce":"\u2AB0","scE":"\u2AB4","Scedil":"\u015E","scedil":"\u015F","Scirc":"\u015C","scirc":"\u015D","scnap":"\u2ABA","scnE":"\u2AB6","scnsim":"\u22E9","scpolint":"\u2A13","scsim":"\u227F","Scy":"\u0421","scy":"\u0441","sdotb":"\u22A1","sdot":"\u22C5","sdote":"\u2A66","searhk":"\u2925","searr":"\u2198","seArr":"\u21D8","searrow":"\u2198","sect":"\u00A7","semi":";","seswar":"\u2929","setminus":"\u2216","setmn":"\u2216","sext":"\u2736","Sfr":"\uD835\uDD16","sfr":"\uD835\uDD30","sfrown":"\u2322","sharp":"\u266F","SHCHcy":"\u0429","shchcy":"\u0449","SHcy":"\u0428","shcy":"\u0448","ShortDownArrow":"\u2193","ShortLeftArrow":"\u2190","shortmid":"\u2223","shortparallel":"\u2225","ShortRightArrow":"\u2192","ShortUpArrow":"\u2191","shy":"\u00AD","Sigma":"\u03A3","sigma":"\u03C3","sigmaf":"\u03C2","sigmav":"\u03C2","sim":"\u223C","simdot":"\u2A6A","sime":"\u2243","simeq":"\u2243","simg":"\u2A9E","simgE":"\u2AA0","siml":"\u2A9D","simlE":"\u2A9F","simne":"\u2246","simplus":"\u2A24","simrarr":"\u2972","slarr":"\u2190","SmallCircle":"\u2218","smallsetminus":"\u2216","smashp":"\u2A33","smeparsl":"\u29E4","smid":"\u2223","smile":"\u2323","smt":"\u2AAA","smte":"\u2AAC","smtes":"\u2AAC\uFE00","SOFTcy":"\u042C","softcy":"\u044C","solbar":"\u233F","solb":"\u29C4","sol":"/","Sopf":"\uD835\uDD4A","sopf":"\uD835\uDD64","spades":"\u2660","spadesuit":"\u2660","spar":"\u2225","sqcap":"\u2293","sqcaps":"\u2293\uFE00","sqcup":"\u2294","sqcups":"\u2294\uFE00","Sqrt":"\u221A","sqsub":"\u228F","sqsube":"\u2291","sqsubset":"\u228F","sqsubseteq":"\u2291","sqsup":"\u2290","sqsupe":"\u2292","sqsupset":"\u2290","sqsupseteq":"\u2292","square":"\u25A1","Square":"\u25A1","SquareIntersection":"\u2293","SquareSubset":"\u228F","SquareSubsetEqual":"\u2291","SquareSuperset":"\u2290","SquareSupersetEqual":"\u2292","SquareUnion":"\u2294","squarf":"\u25AA","squ":"\u25A1","squf":"\u25AA","srarr":"\u2192","Sscr":"\uD835\uDCAE","sscr":"\uD835\uDCC8","ssetmn":"\u2216","ssmile":"\u2323","sstarf":"\u22C6","Star":"\u22C6","star":"\u2606","starf":"\u2605","straightepsilon":"\u03F5","straightphi":"\u03D5","strns":"\u00AF","sub":"\u2282","Sub":"\u22D0","subdot":"\u2ABD","subE":"\u2AC5","sube":"\u2286","subedot":"\u2AC3","submult":"\u2AC1","subnE":"\u2ACB","subne":"\u228A","subplus":"\u2ABF","subrarr":"\u2979","subset":"\u2282","Subset":"\u22D0","subseteq":"\u2286","subseteqq":"\u2AC5","SubsetEqual":"\u2286","subsetneq":"\u228A","subsetneqq":"\u2ACB","subsim":"\u2AC7","subsub":"\u2AD5","subsup":"\u2AD3","succapprox":"\u2AB8","succ":"\u227B","succcurlyeq":"\u227D","Succeeds":"\u227B","SucceedsEqual":"\u2AB0","SucceedsSlantEqual":"\u227D","SucceedsTilde":"\u227F","succeq":"\u2AB0","succnapprox":"\u2ABA","succneqq":"\u2AB6","succnsim":"\u22E9","succsim":"\u227F","SuchThat":"\u220B","sum":"\u2211","Sum":"\u2211","sung":"\u266A","sup1":"\u00B9","sup2":"\u00B2","sup3":"\u00B3","sup":"\u2283","Sup":"\u22D1","supdot":"\u2ABE","supdsub":"\u2AD8","supE":"\u2AC6","supe":"\u2287","supedot":"\u2AC4","Superset":"\u2283","SupersetEqual":"\u2287","suphsol":"\u27C9","suphsub":"\u2AD7","suplarr":"\u297B","supmult":"\u2AC2","supnE":"\u2ACC","supne":"\u228B","supplus":"\u2AC0","supset":"\u2283","Supset":"\u22D1","supseteq":"\u2287","supseteqq":"\u2AC6","supsetneq":"\u228B","supsetneqq":"\u2ACC","supsim":"\u2AC8","supsub":"\u2AD4","supsup":"\u2AD6","swarhk":"\u2926","swarr":"\u2199","swArr":"\u21D9","swarrow":"\u2199","swnwar":"\u292A","szlig":"\u00DF","Tab":"\t","target":"\u2316","Tau":"\u03A4","tau":"\u03C4","tbrk":"\u23B4","Tcaron":"\u0164","tcaron":"\u0165","Tcedil":"\u0162","tcedil":"\u0163","Tcy":"\u0422","tcy":"\u0442","tdot":"\u20DB","telrec":"\u2315","Tfr":"\uD835\uDD17","tfr":"\uD835\uDD31","there4":"\u2234","therefore":"\u2234","Therefore":"\u2234","Theta":"\u0398","theta":"\u03B8","thetasym":"\u03D1","thetav":"\u03D1","thickapprox":"\u2248","thicksim":"\u223C","ThickSpace":"\u205F\u200A","ThinSpace":"\u2009","thinsp":"\u2009","thkap":"\u2248","thksim":"\u223C","THORN":"\u00DE","thorn":"\u00FE","tilde":"\u02DC","Tilde":"\u223C","TildeEqual":"\u2243","TildeFullEqual":"\u2245","TildeTilde":"\u2248","timesbar":"\u2A31","timesb":"\u22A0","times":"\u00D7","timesd":"\u2A30","tint":"\u222D","toea":"\u2928","topbot":"\u2336","topcir":"\u2AF1","top":"\u22A4","Topf":"\uD835\uDD4B","topf":"\uD835\uDD65","topfork":"\u2ADA","tosa":"\u2929","tprime":"\u2034","trade":"\u2122","TRADE":"\u2122","triangle":"\u25B5","triangledown":"\u25BF","triangleleft":"\u25C3","trianglelefteq":"\u22B4","triangleq":"\u225C","triangleright":"\u25B9","trianglerighteq":"\u22B5","tridot":"\u25EC","trie":"\u225C","triminus":"\u2A3A","TripleDot":"\u20DB","triplus":"\u2A39","trisb":"\u29CD","tritime":"\u2A3B","trpezium":"\u23E2","Tscr":"\uD835\uDCAF","tscr":"\uD835\uDCC9","TScy":"\u0426","tscy":"\u0446","TSHcy":"\u040B","tshcy":"\u045B","Tstrok":"\u0166","tstrok":"\u0167","twixt":"\u226C","twoheadleftarrow":"\u219E","twoheadrightarrow":"\u21A0","Uacute":"\u00DA","uacute":"\u00FA","uarr":"\u2191","Uarr":"\u219F","uArr":"\u21D1","Uarrocir":"\u2949","Ubrcy":"\u040E","ubrcy":"\u045E","Ubreve":"\u016C","ubreve":"\u016D","Ucirc":"\u00DB","ucirc":"\u00FB","Ucy":"\u0423","ucy":"\u0443","udarr":"\u21C5","Udblac":"\u0170","udblac":"\u0171","udhar":"\u296E","ufisht":"\u297E","Ufr":"\uD835\uDD18","ufr":"\uD835\uDD32","Ugrave":"\u00D9","ugrave":"\u00F9","uHar":"\u2963","uharl":"\u21BF","uharr":"\u21BE","uhblk":"\u2580","ulcorn":"\u231C","ulcorner":"\u231C","ulcrop":"\u230F","ultri":"\u25F8","Umacr":"\u016A","umacr":"\u016B","uml":"\u00A8","UnderBar":"_","UnderBrace":"\u23DF","UnderBracket":"\u23B5","UnderParenthesis":"\u23DD","Union":"\u22C3","UnionPlus":"\u228E","Uogon":"\u0172","uogon":"\u0173","Uopf":"\uD835\uDD4C","uopf":"\uD835\uDD66","UpArrowBar":"\u2912","uparrow":"\u2191","UpArrow":"\u2191","Uparrow":"\u21D1","UpArrowDownArrow":"\u21C5","updownarrow":"\u2195","UpDownArrow":"\u2195","Updownarrow":"\u21D5","UpEquilibrium":"\u296E","upharpoonleft":"\u21BF","upharpoonright":"\u21BE","uplus":"\u228E","UpperLeftArrow":"\u2196","UpperRightArrow":"\u2197","upsi":"\u03C5","Upsi":"\u03D2","upsih":"\u03D2","Upsilon":"\u03A5","upsilon":"\u03C5","UpTeeArrow":"\u21A5","UpTee":"\u22A5","upuparrows":"\u21C8","urcorn":"\u231D","urcorner":"\u231D","urcrop":"\u230E","Uring":"\u016E","uring":"\u016F","urtri":"\u25F9","Uscr":"\uD835\uDCB0","uscr":"\uD835\uDCCA","utdot":"\u22F0","Utilde":"\u0168","utilde":"\u0169","utri":"\u25B5","utrif":"\u25B4","uuarr":"\u21C8","Uuml":"\u00DC","uuml":"\u00FC","uwangle":"\u29A7","vangrt":"\u299C","varepsilon":"\u03F5","varkappa":"\u03F0","varnothing":"\u2205","varphi":"\u03D5","varpi":"\u03D6","varpropto":"\u221D","varr":"\u2195","vArr":"\u21D5","varrho":"\u03F1","varsigma":"\u03C2","varsubsetneq":"\u228A\uFE00","varsubsetneqq":"\u2ACB\uFE00","varsupsetneq":"\u228B\uFE00","varsupsetneqq":"\u2ACC\uFE00","vartheta":"\u03D1","vartriangleleft":"\u22B2","vartriangleright":"\u22B3","vBar":"\u2AE8","Vbar":"\u2AEB","vBarv":"\u2AE9","Vcy":"\u0412","vcy":"\u0432","vdash":"\u22A2","vDash":"\u22A8","Vdash":"\u22A9","VDash":"\u22AB","Vdashl":"\u2AE6","veebar":"\u22BB","vee":"\u2228","Vee":"\u22C1","veeeq":"\u225A","vellip":"\u22EE","verbar":"|","Verbar":"\u2016","vert":"|","Vert":"\u2016","VerticalBar":"\u2223","VerticalLine":"|","VerticalSeparator":"\u2758","VerticalTilde":"\u2240","VeryThinSpace":"\u200A","Vfr":"\uD835\uDD19","vfr":"\uD835\uDD33","vltri":"\u22B2","vnsub":"\u2282\u20D2","vnsup":"\u2283\u20D2","Vopf":"\uD835\uDD4D","vopf":"\uD835\uDD67","vprop":"\u221D","vrtri":"\u22B3","Vscr":"\uD835\uDCB1","vscr":"\uD835\uDCCB","vsubnE":"\u2ACB\uFE00","vsubne":"\u228A\uFE00","vsupnE":"\u2ACC\uFE00","vsupne":"\u228B\uFE00","Vvdash":"\u22AA","vzigzag":"\u299A","Wcirc":"\u0174","wcirc":"\u0175","wedbar":"\u2A5F","wedge":"\u2227","Wedge":"\u22C0","wedgeq":"\u2259","weierp":"\u2118","Wfr":"\uD835\uDD1A","wfr":"\uD835\uDD34","Wopf":"\uD835\uDD4E","wopf":"\uD835\uDD68","wp":"\u2118","wr":"\u2240","wreath":"\u2240","Wscr":"\uD835\uDCB2","wscr":"\uD835\uDCCC","xcap":"\u22C2","xcirc":"\u25EF","xcup":"\u22C3","xdtri":"\u25BD","Xfr":"\uD835\uDD1B","xfr":"\uD835\uDD35","xharr":"\u27F7","xhArr":"\u27FA","Xi":"\u039E","xi":"\u03BE","xlarr":"\u27F5","xlArr":"\u27F8","xmap":"\u27FC","xnis":"\u22FB","xodot":"\u2A00","Xopf":"\uD835\uDD4F","xopf":"\uD835\uDD69","xoplus":"\u2A01","xotime":"\u2A02","xrarr":"\u27F6","xrArr":"\u27F9","Xscr":"\uD835\uDCB3","xscr":"\uD835\uDCCD","xsqcup":"\u2A06","xuplus":"\u2A04","xutri":"\u25B3","xvee":"\u22C1","xwedge":"\u22C0","Yacute":"\u00DD","yacute":"\u00FD","YAcy":"\u042F","yacy":"\u044F","Ycirc":"\u0176","ycirc":"\u0177","Ycy":"\u042B","ycy":"\u044B","yen":"\u00A5","Yfr":"\uD835\uDD1C","yfr":"\uD835\uDD36","YIcy":"\u0407","yicy":"\u0457","Yopf":"\uD835\uDD50","yopf":"\uD835\uDD6A","Yscr":"\uD835\uDCB4","yscr":"\uD835\uDCCE","YUcy":"\u042E","yucy":"\u044E","yuml":"\u00FF","Yuml":"\u0178","Zacute":"\u0179","zacute":"\u017A","Zcaron":"\u017D","zcaron":"\u017E","Zcy":"\u0417","zcy":"\u0437","Zdot":"\u017B","zdot":"\u017C","zeetrf":"\u2128","ZeroWidthSpace":"\u200B","Zeta":"\u0396","zeta":"\u03B6","zfr":"\uD835\uDD37","Zfr":"\u2128","ZHcy":"\u0416","zhcy":"\u0436","zigrarr":"\u21DD","zopf":"\uD835\uDD6B","Zopf":"\u2124","Zscr":"\uD835\uDCB5","zscr":"\uD835\uDCCF","zwj":"\u200D","zwnj":"\u200C"}
},{}],35:[function(_dereq_,module,exports){
module.exports={"Aacute":"\u00C1","aacute":"\u00E1","Acirc":"\u00C2","acirc":"\u00E2","acute":"\u00B4","AElig":"\u00C6","aelig":"\u00E6","Agrave":"\u00C0","agrave":"\u00E0","amp":"&","AMP":"&","Aring":"\u00C5","aring":"\u00E5","Atilde":"\u00C3","atilde":"\u00E3","Auml":"\u00C4","auml":"\u00E4","brvbar":"\u00A6","Ccedil":"\u00C7","ccedil":"\u00E7","cedil":"\u00B8","cent":"\u00A2","copy":"\u00A9","COPY":"\u00A9","curren":"\u00A4","deg":"\u00B0","divide":"\u00F7","Eacute":"\u00C9","eacute":"\u00E9","Ecirc":"\u00CA","ecirc":"\u00EA","Egrave":"\u00C8","egrave":"\u00E8","ETH":"\u00D0","eth":"\u00F0","Euml":"\u00CB","euml":"\u00EB","frac12":"\u00BD","frac14":"\u00BC","frac34":"\u00BE","gt":">","GT":">","Iacute":"\u00CD","iacute":"\u00ED","Icirc":"\u00CE","icirc":"\u00EE","iexcl":"\u00A1","Igrave":"\u00CC","igrave":"\u00EC","iquest":"\u00BF","Iuml":"\u00CF","iuml":"\u00EF","laquo":"\u00AB","lt":"<","LT":"<","macr":"\u00AF","micro":"\u00B5","middot":"\u00B7","nbsp":"\u00A0","not":"\u00AC","Ntilde":"\u00D1","ntilde":"\u00F1","Oacute":"\u00D3","oacute":"\u00F3","Ocirc":"\u00D4","ocirc":"\u00F4","Ograve":"\u00D2","ograve":"\u00F2","ordf":"\u00AA","ordm":"\u00BA","Oslash":"\u00D8","oslash":"\u00F8","Otilde":"\u00D5","otilde":"\u00F5","Ouml":"\u00D6","ouml":"\u00F6","para":"\u00B6","plusmn":"\u00B1","pound":"\u00A3","quot":"\"","QUOT":"\"","raquo":"\u00BB","reg":"\u00AE","REG":"\u00AE","sect":"\u00A7","shy":"\u00AD","sup1":"\u00B9","sup2":"\u00B2","sup3":"\u00B3","szlig":"\u00DF","THORN":"\u00DE","thorn":"\u00FE","times":"\u00D7","Uacute":"\u00DA","uacute":"\u00FA","Ucirc":"\u00DB","ucirc":"\u00FB","Ugrave":"\u00D9","ugrave":"\u00F9","uml":"\u00A8","Uuml":"\u00DC","uuml":"\u00FC","Yacute":"\u00DD","yacute":"\u00FD","yen":"\u00A5","yuml":"\u00FF"}
},{}],36:[function(_dereq_,module,exports){
module.exports={"amp":"&","apos":"'","gt":">","lt":"<","quot":"\""}

},{}],37:[function(_dereq_,module,exports){
var base       = _dereq_('./lib/base');
var SafeString = _dereq_('./lib/safe-string');
var Exception  = _dereq_('./lib/exception');
var Utils      = _dereq_('./lib/utils');
var runtime    = _dereq_('./lib/runtime');

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvZmFrZV9lZmE0YzRmYi5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi9iYXNlLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbGliL2NvbXBpbGVyL2FzdC5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi9jb21waWxlci9hdHRyaWJ1dGUtY29tcGlsZXIuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvY29tcGlsZXIvYmFzZS5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi9jb21waWxlci9jb21tb24tY29tcGlsZXIuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvY29tcGlsZXIvY29tcGlsZXIuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvY29tcGlsZXIvamF2YXNjcmlwdC1jb21waWxlci5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi9jb21waWxlci9wYXJzZXIuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvZXhjZXB0aW9uLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbGliL3JhZi5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi9ydW50aW1lLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbGliL3NhZmUtc3RyaW5nLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbGliL3RyYWNrLW5vZGUuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvdXRpbHMuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9pbmhlcml0cy9pbmhlcml0c19icm93c2VyLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2luc2VydC1tb2R1bGUtZ2xvYmFscy9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3V0aWwvc3VwcG9ydC9pc0J1ZmZlckJyb3dzZXIuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvdXRpbC91dGlsLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9iYXNlLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9jb21waWxlci9hc3QuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL2NvbXBpbGVyL2NvbXBpbGVyLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9jb21waWxlci9qYXZhc2NyaXB0LWNvbXBpbGVyLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9jb21waWxlci9wYXJzZXIuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL2V4Y2VwdGlvbi5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvcnVudGltZS5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvc2FmZS1zdHJpbmcuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL3V0aWxzLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2h0bWxwYXJzZXIyL2xpYi9QYXJzZXIuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvaHRtbHBhcnNlcjIvbGliL1Rva2VuaXplci5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9odG1scGFyc2VyMi9ub2RlX21vZHVsZXMvZW50aXRpZXMvbGliL2RlY29kZV9jb2RlcG9pbnQuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvaHRtbHBhcnNlcjIvbm9kZV9tb2R1bGVzL2VudGl0aWVzL21hcHMvZGVjb2RlLmpzb24iLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvaHRtbHBhcnNlcjIvbm9kZV9tb2R1bGVzL2VudGl0aWVzL21hcHMvZW50aXRpZXMuanNvbiIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9odG1scGFyc2VyMi9ub2RlX21vZHVsZXMvZW50aXRpZXMvbWFwcy9sZWdhY3kuanNvbiIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9odG1scGFyc2VyMi9ub2RlX21vZHVsZXMvZW50aXRpZXMvbWFwcy94bWwuanNvbiIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL3J1bnRpbWUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxTUE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6bEJBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVrQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25MQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzc2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDemVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7O0FDQUE7O0FDQUE7O0FDQUE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgRE9NQmFycyAgICAgICAgICAgID0gcmVxdWlyZSgnLi9ydW50aW1lJyk7XG52YXIgQVNUICAgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi9saWIvY29tcGlsZXIvYXN0Jyk7XG52YXIgYmFzZSAgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi9saWIvY29tcGlsZXIvYmFzZScpO1xudmFyIENvbXBpbGVyICAgICAgICAgICA9IHJlcXVpcmUoJy4vbGliL2NvbXBpbGVyL2NvbXBpbGVyJyk7XG52YXIgSmF2YVNjcmlwdENvbXBpbGVyID0gcmVxdWlyZSgnLi9saWIvY29tcGlsZXIvamF2YXNjcmlwdC1jb21waWxlcicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbiBjcmVhdGUgKCkge1xuICB2YXIgZGIgPSBET01CYXJzLmNyZWF0ZSgpO1xuXG4gIGRiLmNvbXBpbGUgPSBmdW5jdGlvbiAoaW5wdXQsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gQ29tcGlsZXIuY29tcGlsZShpbnB1dCwgb3B0aW9ucywgZGIpO1xuICB9O1xuXG4gIGRiLnByZWNvbXBpbGUgPSBmdW5jdGlvbiAoaW5wdXQsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gQ29tcGlsZXIucHJlY29tcGlsZShpbnB1dCwgb3B0aW9ucywgZGIpO1xuICB9O1xuXG4gIGRiLmNyZWF0ZSAgICAgICAgICAgICA9IGNyZWF0ZTtcbiAgZGIuQVNUICAgICAgICAgICAgICAgID0gQVNUO1xuICBkYi5Db21waWxlciAgICAgICAgICAgPSBDb21waWxlci5Db21waWxlcjtcbiAgZGIuSmF2YVNjcmlwdENvbXBpbGVyID0gSmF2YVNjcmlwdENvbXBpbGVyO1xuICBkYi5wYXJzZSAgICAgICAgICAgICAgPSBiYXNlLnBhcnNlO1xuICBkYi5QYXJzZXIgICAgICAgICAgICAgPSBiYXNlLnBhcnNlcjtcblxuICByZXR1cm4gZGI7XG59KSgpO1xuIiwidmFyIGhic0Jhc2UgICAgICAgICAgICAgICA9IHJlcXVpcmUoJ2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9iYXNlJyk7XG52YXIgVXRpbHMgICAgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi91dGlscycpO1xudmFyIEhhbmRsZWJhcnNFbnZpcm9ubWVudCA9IGhic0Jhc2UuSGFuZGxlYmFyc0Vudmlyb25tZW50O1xuXG4vKipcbiAqIEV4dGVuZCBIYW5kbGViYXJzIGJhc2Ugb2JqZWN0IHdpdGggY3VzdG9tIGZ1bmN0aW9uYWxpdHkuXG4gKlxuICogQHR5cGUge09iamVjdH1cbiAqL1xudmFyIGJhc2UgPSBtb2R1bGUuZXhwb3J0cyA9IFV0aWxzLmNyZWF0ZShoYnNCYXNlKTtcblxuLyoqXG4gKiBSZWdpc3RlciBET01CYXJzIGhlbHBlcnMgb24gdGhlIHBhc3NlZCBpbiBET01CYXJzIGluc3RhbmNlLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBpbnN0YW5jZVxuICovXG52YXIgcmVnaXN0ZXJEZWZhdWx0SGVscGVycyA9IGZ1bmN0aW9uIChpbnN0YW5jZSkge1xuICAvKipcbiAgICogVGhlIGhhbmRsZWJhcnMgYGVhY2hgIGhlbHBlciBpcyBpbmNvbXBhdGliYWJsZSB3aXRoIERPTUJhcnMsIHNpbmNlIGl0XG4gICAqIGFzc3VtZXMgc3RyaW5nIGNvbmNhdGluYXRpb24gKGFzIG9wcG9zZWQgdG8gZG9jdW1lbnQgZnJhZ21lbnRzKS5cbiAgICpcbiAgICogQHBhcmFtICB7T2JqZWN0fSBjb250ZXh0XG4gICAqIEBwYXJhbSAge09iamVjdH0gb3B0aW9uc1xuICAgKiBAcmV0dXJuIHtOb2RlfVxuICAgKi9cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2VhY2gnLCBmdW5jdGlvbiAoY29udGV4dCwgb3B0aW9ucykge1xuICAgIHZhciBmbiAgICAgICA9IG9wdGlvbnMuZm47XG4gICAgdmFyIGludmVyc2UgID0gb3B0aW9ucy5pbnZlcnNlO1xuICAgIHZhciBmcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICB2YXIgaSAgICAgICAgPSAwO1xuICAgIHZhciBkYXRhO1xuXG4gICAgaWYgKHR5cGVvZiBjb250ZXh0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLmRhdGEpIHtcbiAgICAgIGRhdGEgPSBVdGlscy5jcmVhdGUob3B0aW9ucy5kYXRhKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGNvbnRleHQgPT09ICdvYmplY3QnKSB7XG4gICAgICB2YXIgbGVuID0gY29udGV4dC5sZW5ndGg7XG5cbiAgICAgIGlmIChsZW4gPT09ICtsZW4pIHtcbiAgICAgICAgZm9yICg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgIGRhdGEuaW5kZXggPSBpO1xuICAgICAgICAgIGRhdGEuZmlyc3QgPSAoaSA9PT0gMCk7XG4gICAgICAgICAgZGF0YS5sYXN0ICA9IChpID09PSBsZW4gLSAxKTtcblxuICAgICAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKGZuKGNvbnRleHRbaV0sIHsgZGF0YTogZGF0YSB9KSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBjb250ZXh0KSB7XG4gICAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChjb250ZXh0LCBrZXkpKSB7XG4gICAgICAgICAgICBpICs9IDE7XG5cbiAgICAgICAgICAgIGRhdGEua2V5ICAgPSBrZXk7XG4gICAgICAgICAgICBkYXRhLmluZGV4ID0gaTtcbiAgICAgICAgICAgIGRhdGEuZmlyc3QgPSAoaSA9PT0gMCk7XG5cbiAgICAgICAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKGZuKGNvbnRleHRba2V5XSwgeyBkYXRhOiBkYXRhIH0pKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoaSA9PT0gMCkge1xuICAgICAgcmV0dXJuIGludmVyc2UodGhpcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZyYWdtZW50O1xuICB9KTtcbn07XG5cbi8qKlxuICogQ3JlYXRlIGEgY3VzdG9tIERPTUJhcnMgZW52aXJvbm1lbnQgdG8gbWF0Y2ggSGFuZGxlYmFyc0Vudmlyb25tZW50LlxuICovXG52YXIgRE9NQmFyc0Vudmlyb25tZW50ID0gYmFzZS5ET01CYXJzRW52aXJvbm1lbnQgPSBmdW5jdGlvbiAoKSB7XG4gIEhhbmRsZWJhcnNFbnZpcm9ubWVudC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICByZWdpc3RlckRlZmF1bHRIZWxwZXJzKHRoaXMpO1xufTtcblxuLyoqXG4gKiBFeHRlbmQgdGhlIEhhbmRsZWJhcnNFbnZpcm9ubWVudCBwcm90b3R5cGUuXG4gKlxuICogQHR5cGUge09iamVjdH1cbiAqL1xudmFyIGVudlByb3RvdHlwZSA9IERPTUJhcnNFbnZpcm9ubWVudC5wcm90b3R5cGUgPSBVdGlscy5jcmVhdGUoXG4gIEhhbmRsZWJhcnNFbnZpcm9ubWVudC5wcm90b3R5cGVcbik7XG5cbi8qKlxuICogQWxpYXMgc29tZSB1c2VmdWwgZnVuY3Rpb25hbGl0eSB0aGF0IGlzIGV4cGVjdGVkIHRvIGJlIGV4cG9zZWQgb24gdGhlIHJvb3RcbiAqIG9iamVjdC5cbiAqL1xuZW52UHJvdG90eXBlLmNyZWF0ZUZyYW1lICAgICAgID0gaGJzQmFzZS5jcmVhdGVGcmFtZTtcbmVudlByb3RvdHlwZS5SRVZJU0lPTl9DSEFOR0VTICA9IGhic0Jhc2UuUkVWSVNJT05fQ0hBTkdFUztcbmVudlByb3RvdHlwZS5DT01QSUxFUl9SRVZJU0lPTiA9IGhic0Jhc2UuQ09NUElMRVJfUkVWSVNJT047XG5cbi8qKlxuICogVGhlIGJhc2ljIGdldHRlciBmdW5jdGlvbi4gT3ZlcnJpZGUgdGhpcyB3aXRoIHNvbWV0aGluZyBlbHNlIGJhc2VkIG9uIHlvdXJcbiAqIHByb2plY3QuIEZvciBleGFtcGxlLCBCYWNrYm9uZS5qcyBtb2RlbHMuXG4gKlxuICogQHBhcmFtICB7T2JqZWN0fSBvYmplY3RcbiAqIEBwYXJhbSAge1N0cmluZ30gcHJvcGVydHlcbiAqIEByZXR1cm4geyp9XG4gKi9cbmVudlByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAob2JqZWN0LCBwcm9wZXJ0eSkge1xuICByZXR1cm4gb2JqZWN0W3Byb3BlcnR5XTtcbn07XG5cbi8qKlxuICogTm9vcCBmdW5jdGlvbnMgZm9yIHN1YnNjcmliZSBhbmQgdW5zdWJzY3JpYmUuIE92ZXJyaWRlIHdpdGggY3VzdG9tXG4gKiBmdW5jdGlvbmFsaXR5LlxuICovXG5lbnZQcm90b3R5cGUuc3Vic2NyaWJlID0gZW52UHJvdG90eXBlLnVuc3Vic2NyaWJlID0gZnVuY3Rpb24gKCkge307XG4iLCJ2YXIgaGJzQVNUID0gcmVxdWlyZSgnaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL2NvbXBpbGVyL2FzdCcpWydkZWZhdWx0J107XG52YXIgVXRpbHMgID0gcmVxdWlyZSgnLi4vdXRpbHMnKTtcblxuLyoqXG4gKiBFeHRlbmQgdGhlIEhhbmRsZWJhcnMgQVNUIHdpdGggRE9NIG5vZGVzLlxuICpcbiAqIEB0eXBlIHtPYmplY3R9XG4gKi9cbnZhciBBU1QgPSBtb2R1bGUuZXhwb3J0cyA9IFV0aWxzLmNyZWF0ZShoYnNBU1QpO1xuXG4vKipcbiAqIENyZWF0ZSBhbiBBU1Qgbm9kZSBmb3IgcmVwcmVzZW50aW5nIGFuIGVsZW1lbnQuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG5hbWVcbiAqIEBwYXJhbSB7T2JqZWN0fSBhdHRyaWJ1dGVzXG4gKiBAcGFyYW0ge09iamVjdH0gY29udGVudFxuICovXG5BU1QuRE9NRWxlbWVudCA9IGZ1bmN0aW9uIChuYW1lLCBhdHRyaWJ1dGVzLCBjb250ZW50KSB7XG4gIHRoaXMudHlwZSAgICAgICA9ICdET01fRUxFTUVOVCc7XG4gIHRoaXMubmFtZSAgICAgICA9IG5hbWU7XG4gIHRoaXMuYXR0cmlidXRlcyA9IGF0dHJpYnV0ZXM7XG4gIHRoaXMuY29udGVudCAgICA9IGNvbnRlbnQ7XG59O1xuXG4vKipcbiAqIENyZWF0ZSBhbiBBU1Qgbm9kZSBmb3IgcmVwcmVzZW50aW5nIGFuIGVsZW1lbnQgYXR0cmlidXRlLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBuYW1lXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWVcbiAqL1xuQVNULkRPTUF0dHJpYnV0ZSA9IGZ1bmN0aW9uIChuYW1lLCB2YWx1ZSkge1xuICB0aGlzLnR5cGUgID0gJ0RPTV9BVFRSSUJVVEUnO1xuICB0aGlzLm5hbWUgID0gbmFtZTtcbiAgdGhpcy52YWx1ZSA9IHZhbHVlO1xufTtcblxuLyoqXG4gKiBDcmVhdGUgYW4gQVNUIG5vZGUgZm9yIHJlcHJlc2VudGluZyBhIGNvbW1lbnQgbm9kZS5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdGV4dFxuICovXG5BU1QuRE9NQ29tbWVudCA9IGZ1bmN0aW9uICh0ZXh0KSB7XG4gIHRoaXMudHlwZSA9ICdET01fQ09NTUVOVCc7XG4gIHRoaXMudGV4dCA9IHRleHQ7XG59O1xuIiwidmFyIGNyZWF0ZSAgICAgICAgID0gcmVxdWlyZSgnLi4vdXRpbHMnKS5jcmVhdGU7XG52YXIgQ29tbW9uQ29tcGlsZXIgPSByZXF1aXJlKCcuL2NvbW1vbi1jb21waWxlcicpLnByb3RvdHlwZTtcblxuLyoqXG4gKiBBdHRyaWJ1dGUgY29tcGlsZXIuXG4gKi9cbnZhciBDb21waWxlciA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge307XG5Db21waWxlci5wcm90b3R5cGUgPSBjcmVhdGUoQ29tbW9uQ29tcGlsZXIpO1xuQ29tcGlsZXIucHJvdG90eXBlLmNvbXBpbGVyID0gQ29tcGlsZXI7XG5cbi8qKlxuICogQXBwZW5kIGEgdmFsdWUgdG8gdGhlIGN1cnJlbnQgYnVmZmVyLiBXZSBvdmVycmlkZSB0aGUgZGVmYXVsdCBmdW5jdGlvbmFsaXR5XG4gKiBvZiBIYW5kbGViYXJzIHNpbmNlIHdlIHdhbnQgdG8gYmUgYWJsZSB0byBhcHBlbmQgKmV2ZXJ5KiB2YWx1ZS5cbiAqL1xuQ29tcGlsZXIucHJvdG90eXBlLmFwcGVuZCA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5mbHVzaElubGluZSgpO1xuXG4gIHRoaXMuc291cmNlLnB1c2godGhpcy5hcHBlbmRUb0J1ZmZlcih0aGlzLnBvcFN0YWNrKCkpKTtcbn07XG5cbi8qKlxuICogU2V0IGEgZmxhZyB0byBpbmRpY2F0ZSB0aGUgY29tcGlsZXIgaXMgYW4gYXR0cmlidXRlIGNvbXBpbGVyLlxuICpcbiAqIEB0eXBlIHtCb29sZWFufVxuICovXG5Db21waWxlci5wcm90b3R5cGUuaXNBdHRyaWJ1dGUgPSB0cnVlO1xuIiwidmFyIEFTVCAgICA9IHJlcXVpcmUoJy4vYXN0Jyk7XG52YXIgcGFyc2VyID0gZXhwb3J0cy5wYXJzZXIgPSByZXF1aXJlKCcuL3BhcnNlcicpO1xuXG4vKipcbiAqIFBhcnNlIGEgc3RyaW5nIGludG8gYW4gQVNULlxuICpcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqL1xuZXhwb3J0cy5wYXJzZSA9IGZ1bmN0aW9uIChpbnB1dCkge1xuICBpZiAoaW5wdXQuY29uc3RydWN0b3IgPT09IEFTVC5Qcm9ncmFtTm9kZSkge1xuICAgIHJldHVybiBpbnB1dDtcbiAgfVxuXG4gIHBhcnNlci55eSA9IEFTVDtcbiAgcmV0dXJuIHBhcnNlci5wYXJzZShpbnB1dCk7XG59O1xuIiwidmFyIGNyZWF0ZSAgICAgPSByZXF1aXJlKCcuLi91dGlscycpLmNyZWF0ZTtcbnZhciBKU0NvbXBpbGVyID0gcmVxdWlyZShcbiAgJ2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9jb21waWxlci9qYXZhc2NyaXB0LWNvbXBpbGVyJ1xuKVsnZGVmYXVsdCddLnByb3RvdHlwZTtcblxuLyoqXG4gKiBDcmVhdGUgdGhlIGJhc2UgY29tcGlsZXIgZnVuY3Rpb25hbGl0eSBhbmQgYXR0YWNoIHJlbGV2YW50IHJlZmVyZW5jZXMuXG4gKi9cbnZhciBDb21waWxlciA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge307XG5Db21waWxlci5wcm90b3R5cGUgPSBjcmVhdGUoSlNDb21waWxlcik7XG5Db21waWxlci5wcm90b3R5cGUuY29tcGlsZXIgPSBDb21waWxlcjtcblxuLyoqXG4gKiBPdmVycmlkZSBuYW1lIGxvb2t1cCB0byB1c2UgdGhlIGZ1bmN0aW9uIHByb3ZpZGVkIG9uIHRoZSBET01CYXJzIG9iamVjdC5cbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5uYW1lTG9va3VwID0gZnVuY3Rpb24gKHBhcmVudCwgcHJvcGVydHksIHR5cGUpIHtcbiAgaWYgKHR5cGUgIT09ICdjb250ZXh0Jykge1xuICAgIHJldHVybiBKU0NvbXBpbGVyLm5hbWVMb29rdXAuY2FsbCh0aGlzLCBwYXJlbnQsIHByb3BlcnR5LCB0eXBlKTtcbiAgfVxuXG4gIHRoaXMuY29udGV4dC5hbGlhc2VzLnNlbGYgPSAndGhpcyc7XG5cbiAgdmFyIGFyZ3MgPSBbcGFyZW50LCB0aGlzLnF1b3RlZFN0cmluZyhwcm9wZXJ0eSksIHRoaXMucXVvdGVkU3RyaW5nKHBhcmVudCldO1xuXG4gIHJldHVybiAnc2VsZi5nZXQoJyArIGFyZ3Muam9pbignLCAnKSArICcpJztcbn07XG5cbi8qKlxuICogU2V0IHRoZSBhdHRyaWJ1dGUgY29tcGlsZXIgdG8gYmUgZmFsc2UuIFRoaXMgaXMgb3ZlcnJpZGVuIGluIHRoZSBhdHRyaWJ1dGVcbiAqIGNvbXBpbGVyIHN1YmNsYXNzLlxuICpcbiAqIEB0eXBlIHtCb29sZWFufVxuICovXG5Db21waWxlci5wcm90b3R5cGUuaXNBdHRyaWJ1dGUgPSBmYWxzZTtcblxuLyoqXG4gKiBOby1vcCBmdW5jdGlvbi4gT25seSB1c2VkIGZvciBzdWJzY3JpYmVycyBpbiB0aGUgSmF2YVNjcmlwdCBjb21waWxlci5cbiAqL1xuQ29tcGlsZXIucHJvdG90eXBlLmJlZm9yZUFwcGVuZCA9IGZ1bmN0aW9uICgpIHt9O1xuXG4vKipcbiAqIE92ZXJyaWRlIHRoZSBwYXJhbXMgc2V0dXAgd2l0aCBhbiBhdHRyaWJ1dGUgYm9vbGVhbiBhbmQgY3VzdG9tIHdyYXBwZXJzXG4gKiBmb3IgcHJvZ3JhbSBmdW5jdGlvbnMuXG4gKlxuICogQHBhcmFtICB7TnVtYmVyfSAgcGFyYW1TaXplXG4gKiBAcGFyYW0gIHtBcnJheX0gICBwYXJhbXNcbiAqIEBwYXJhbSAge0Jvb2xlYW59IHVzZVJlZ2lzdGVyXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5zZXR1cE9wdGlvbnMgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBvcHRpb25zID0gSlNDb21waWxlci5zZXR1cE9wdGlvbnMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAvLyBBbGlhcyBgc2VsZmAgaW5zdGVhZCBvZiBhIHN0YXRpYyBzdWJzY3JpcHRpb24sIHNpbmNlIHRoZSBjdXJyZW50XG4gIC8vIHN1YnNjcmlwdGlvbiBvYmplY3Qgd2lsbCBjaGFuZ2UgZHVyaW5nIGV4ZWN1dGlvbi5cbiAgdGhpcy5jb250ZXh0LmFsaWFzZXMuc2VsZiA9ICd0aGlzJztcblxuICBvcHRpb25zLnB1c2goJ2F0dHJpYnV0ZTonICsgdGhpcy5pc0F0dHJpYnV0ZSk7XG4gIG9wdGlvbnMucHVzaCgndXBkYXRlOnNlbGYuc3Vic2NyaXB0aW9uLmJvdW5kVXBkYXRlJyk7XG4gIG9wdGlvbnMucHVzaCgndW5zdWJzY3JpYmU6c2VsZi5zdWJzY3JpcHRpb24uYm91bmRVbnN1YnNjcmlwdGlvbicpO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgb3B0aW9ucy5sZW5ndGg7IGkrKykge1xuICAgIGlmIChvcHRpb25zW2ldLnN1YnN0cigwLCA4KSA9PT0gJ2ludmVyc2U6Jykge1xuICAgICAgb3B0aW9uc1tpXSA9ICdpbnZlcnNlOnNlbGYud3JhcFByb2dyYW0oJyArIG9wdGlvbnNbaV0uc3Vic3RyKDgpICsgJyknO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zW2ldLnN1YnN0cigwLCAzKSA9PT0gJ2ZuOicpIHtcbiAgICAgIG9wdGlvbnNbaV0gPSAnZm46c2VsZi53cmFwUHJvZ3JhbSgnICsgb3B0aW9uc1tpXS5zdWJzdHIoMykgKyAnKSc7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG9wdGlvbnM7XG59O1xuIiwidmFyIGNyZWF0ZSAgICAgICA9IHJlcXVpcmUoJy4uL3V0aWxzJykuY3JlYXRlO1xudmFyIGhic0NvbXBpbGVyICA9IHJlcXVpcmUoJ2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9jb21waWxlci9jb21waWxlcicpO1xudmFyIEJhc2VDb21waWxlciA9IGhic0NvbXBpbGVyLkNvbXBpbGVyLnByb3RvdHlwZTtcblxuLyoqXG4gKiBDb21waWxlIEhhbmRsZWJhcnMgQVNUIGFuZCBzdHJpbmdzLlxuICpcbiAqIEB0eXBlIHtGdW5jdGlvbn1cbiAqL1xuZXhwb3J0cy5jb21waWxlICAgID0gaGJzQ29tcGlsZXIuY29tcGlsZTtcbmV4cG9ydHMucHJlY29tcGlsZSA9IGhic0NvbXBpbGVyLnByZWNvbXBpbGU7XG5cbi8qKlxuICogQmFzZSBjb21waWxlciBpbiBjaGFyZ2Ugb2YgZ2VuZXJhdGluZyBhIGNvbnN1bWFibGUgZW52aXJvbm1lbnQgZm9yIHRoZVxuICogSmF2YVNjcmlwdCBjb21waWxlci5cbiAqL1xudmFyIENvbXBpbGVyID0gZXhwb3J0cy5Db21waWxlciA9IGZ1bmN0aW9uICgpIHt9O1xuQ29tcGlsZXIucHJvdG90eXBlID0gY3JlYXRlKEJhc2VDb21waWxlcik7XG5Db21waWxlci5wcm90b3R5cGUuY29tcGlsZXIgPSBDb21waWxlcjtcblxuLyoqXG4gKiBBcHBlbmQgYSBET00gZWxlbWVudCBub2RlIHRvIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gbm9kZVxuICovXG5Db21waWxlci5wcm90b3R5cGUuRE9NX0VMRU1FTlQgPSBmdW5jdGlvbiAobm9kZSkge1xuICB0aGlzLm9wY29kZSgncHVzaFByb2dyYW0nLCB0aGlzLmNvbXBpbGVBdHRyaWJ1dGUobm9kZS5uYW1lKSk7XG4gIHRoaXMub3Bjb2RlKCdpbnZva2VFbGVtZW50Jyk7XG5cbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IG5vZGUuYXR0cmlidXRlcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIHZhciBuYW1lICA9IHRoaXMuY29tcGlsZUF0dHJpYnV0ZShub2RlLmF0dHJpYnV0ZXNbaV0ubmFtZSk7XG4gICAgdmFyIHZhbHVlID0gdGhpcy5jb21waWxlQXR0cmlidXRlKG5vZGUuYXR0cmlidXRlc1tpXS52YWx1ZSk7XG4gICAgdGhpcy5hcHBlbmRBdHRyaWJ1dGUobmFtZSwgdmFsdWUpO1xuICB9XG5cbiAgdGhpcy5vcGNvZGUoJ3B1c2hQcm9ncmFtJywgdGhpcy5jb21waWxlQ29udGVudHMobm9kZS5jb250ZW50KSk7XG4gIHRoaXMub3Bjb2RlKCdpbnZva2VDb250ZW50Jyk7XG4gIHRoaXMub3Bjb2RlKCdhcHBlbmRFbGVtZW50Jyk7XG59O1xuXG4vKipcbiAqIEFwcGVuZCBhIERPTSBjb21tZW50IG5vZGUgdG8gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBub2RlXG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5ET01fQ09NTUVOVCA9IGZ1bmN0aW9uIChub2RlKSB7XG4gIHRoaXMub3Bjb2RlKCdwdXNoUHJvZ3JhbScsIHRoaXMuY29tcGlsZUF0dHJpYnV0ZShub2RlLnRleHQpKTtcbiAgdGhpcy5vcGNvZGUoJ2ludm9rZUNvbW1lbnQnKTtcbiAgdGhpcy5vcGNvZGUoJ2FwcGVuZEVsZW1lbnQnKTtcbn07XG5cbi8qKlxuICogQXBwZW5kIGFuIGF0dHJpYnV0ZSB0byB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogQHBhcmFtICB7T2JqZWN0fSBuYW1lXG4gKiBAcGFyYW0gIHtPYmplY3R9IHZhbHVlXG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5hcHBlbmRBdHRyaWJ1dGUgPSBmdW5jdGlvbiAobmFtZSwgdmFsdWUpIHtcbiAgdGhpcy5vcGNvZGUoJ3B1c2hQcm9ncmFtJywgbmFtZSk7XG4gIHRoaXMub3Bjb2RlKCdwdXNoUHJvZ3JhbScsIHZhbHVlKTtcbiAgdGhpcy5vcGNvZGUoJ2ludm9rZUF0dHJpYnV0ZScpO1xufTtcblxuLyoqXG4gKiBDb21waWxlIGFuIGF0dHJpYnV0ZSBwcm9ncmFtLlxuICpcbiAqIEBwYXJhbSAge09iamVjdH0gcHJvZ3JhbVxuICogQHJldHVybiB7TnVtYmVyfVxuICovXG5Db21waWxlci5wcm90b3R5cGUuY29tcGlsZUF0dHJpYnV0ZSA9IGZ1bmN0aW9uIChwcm9ncmFtKSB7XG4gIHZhciBndWlkID0gdGhpcy5jb21waWxlQ29udGVudHMocHJvZ3JhbSk7XG4gIHRoaXMuY2hpbGRyZW5bZ3VpZF0uaXNBdHRyaWJ1dGUgPSB0cnVlO1xuICByZXR1cm4gZ3VpZDtcbn07XG5cbi8qKlxuICogQ29tcGlsZSBhbiBlbGVtZW50cyBjb250ZW50cy5cbiAqXG4gKiBAcGFyYW0gIHtPYmplY3R9IHByb2dyYW1cbiAqIEByZXR1cm4ge051bWJlcn1cbiAqL1xuQ29tcGlsZXIucHJvdG90eXBlLmNvbXBpbGVDb250ZW50cyA9IGZ1bmN0aW9uIChwcm9ncmFtKSB7XG4gIHZhciBndWlkICAgPSB0aGlzLmNvbXBpbGVQcm9ncmFtKHByb2dyYW0pO1xuICB2YXIgcmVzdWx0ID0gdGhpcy5jaGlsZHJlbltndWlkXTtcbiAgcmVzdWx0LmlzUHJveGllZCA9IHRydWU7XG5cbiAgLy8gUHJveHkgYWxsIHRoZSBkZXB0aCBub2RlcyBiZXR3ZWVuIGNvbXBpbGVkIHByb2dyYW1zLlxuICBmb3IgKHZhciBpID0gMDsgaSA8IHJlc3VsdC5kZXB0aHMubGlzdC5sZW5ndGg7IGkrKykge1xuICAgIHRoaXMuYWRkRGVwdGgocmVzdWx0LmRlcHRocy5saXN0W2ldKTtcbiAgfVxuXG4gIHJldHVybiBndWlkO1xufTtcblxuLyoqXG4gKiBVcGRhdGUgdGhlIGNvbXBpbGVyIGVxdWFsaXR5IGNoZWNrIHRvIGFsc28gdGFrZSBpbnRvIGFjY291bnQgYXR0cmlidXRlXG4gKiBwcm9ncmFtcy5cbiAqXG4gKiBAcGFyYW0gIHtPYmplY3R9ICBvdGhlclxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqL1xuQ29tcGlsZXIucHJvdG90eXBlLmVxdWFscyA9IGZ1bmN0aW9uIChvdGhlcikge1xuICAvLyBDaGVjayBpZiB3ZSBoYXZlIHR3byBhdHRyaWJ1dGUgcHJvZ3JhbXMgKG9yIG5vbi1hdHRyaWJ1dGUgcHJvZ3JhbXMpLlxuICBpZiAodGhpcy5pc0F0dHJpYnV0ZSAhPT0gb3RoZXIuaXNBdHRyaWJ1dGUpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gQmFzZUNvbXBpbGVyLmVxdWFscy5jYWxsKHRoaXMsIG90aGVyKTtcbn07XG5cbi8qKlxuICogVHJpZ2dlciBhIGBiZWZvcmVBcHBlbmRgIG9wY29kZSB0byBlbmFibGUgd3JhcHBpbmcgdGhlIHJlc3VsdCBvZiBhIGJsb2NrLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBibG9ja1xuICovXG5Db21waWxlci5wcm90b3R5cGUuYmxvY2sgPSBmdW5jdGlvbiAoYmxvY2spIHtcbiAgdGhpcy5vcGNvZGUoJ2JlZm9yZUFwcGVuZCcpO1xuICBCYXNlQ29tcGlsZXIuYmxvY2suY2FsbCh0aGlzLCBibG9jayk7XG59O1xuXG4vKipcbiAqIFRyaWdnZXIgYSBgYmVmb3JlQXBwZW5kYCBvcGNvZGUgdG8gZW5hYmxlIHdyYXBwaW5nIHRoZSByZXN1bHQgb2YgYSBwYXJ0aWFsLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBibG9ja1xuICovXG5Db21waWxlci5wcm90b3R5cGUucGFydGlhbCA9IGZ1bmN0aW9uIChwYXJ0aWFsKSB7XG4gIHRoaXMub3Bjb2RlKCdiZWZvcmVBcHBlbmQnKTtcbiAgQmFzZUNvbXBpbGVyLnBhcnRpYWwuY2FsbCh0aGlzLCBwYXJ0aWFsKTtcbn07XG5cbi8qKlxuICogVHJpZ2dlciBhIGBiZWZvcmVBcHBlbmRgIG9wY29kZSB0byBlbmFibGUgd3JhcHBpbmcgdGhlIHJlc3VsdCBvZiBhIG11c3RhY2hlLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBtdXN0YWNoZVxuICovXG5Db21waWxlci5wcm90b3R5cGUubXVzdGFjaGUgPSBmdW5jdGlvbiAobXVzdGFjaGUpIHtcbiAgdGhpcy5vcGNvZGUoJ2JlZm9yZUFwcGVuZCcpO1xuICBCYXNlQ29tcGlsZXIubXVzdGFjaGUuY2FsbCh0aGlzLCBtdXN0YWNoZSk7XG59O1xuIiwidmFyIGNyZWF0ZSAgICAgICAgID0gcmVxdWlyZSgnLi4vdXRpbHMnKS5jcmVhdGU7XG52YXIgQ29tbW9uQ29tcGlsZXIgPSByZXF1aXJlKCcuL2NvbW1vbi1jb21waWxlcicpLnByb3RvdHlwZTtcblxuLyoqXG4gKiBFeHRlbmRzIEhhbmRsZWJhcnMgSmF2YVNjcmlwdCBjb21waWxlciB0byBhZGQgRE9NIHNwZWNpZmljIHJ1bGVzLlxuICovXG52YXIgQ29tcGlsZXIgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHt9O1xuQ29tcGlsZXIucHJvdG90eXBlID0gY3JlYXRlKENvbW1vbkNvbXBpbGVyKTtcbkNvbXBpbGVyLnByb3RvdHlwZS5jb21waWxlciAgICAgICAgICA9IENvbXBpbGVyO1xuQ29tcGlsZXIucHJvdG90eXBlLmF0dHJpYnV0ZUNvbXBpbGVyID0gcmVxdWlyZSgnLi9hdHRyaWJ1dGUtY29tcGlsZXInKTtcblxuLyoqXG4gKiBDb21waWxlIGFueSBjaGlsZCBwcm9ncmFtIG5vZGVzLiBFLmcuIEJsb2NrIGhlbHBlcnMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGVudmlyb25tZW50XG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICovXG5Db21waWxlci5wcm90b3R5cGUuY29tcGlsZUNoaWxkcmVuID0gZnVuY3Rpb24oZW52aXJvbm1lbnQsIG9wdGlvbnMpIHtcbiAgdmFyIGNoaWxkcmVuID0gZW52aXJvbm1lbnQuY2hpbGRyZW47XG4gIHZhciBDb21waWxlciwgY2hpbGQsIHByb2dyYW0sIGluZGV4O1xuXG4gIGZvciAodmFyIGkgPSAwLCBsID0gY2hpbGRyZW4ubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgY2hpbGQgICAgPSBjaGlsZHJlbltpXTtcbiAgICBpbmRleCAgICA9IHRoaXMubWF0Y2hFeGlzdGluZ1Byb2dyYW0oY2hpbGQpO1xuICAgIENvbXBpbGVyID0gdGhpcy5jb21waWxlcjtcblxuICAgIGlmIChjaGlsZC5pc0F0dHJpYnV0ZSkge1xuICAgICAgQ29tcGlsZXIgPSB0aGlzLmF0dHJpYnV0ZUNvbXBpbGVyO1xuICAgIH1cblxuICAgIGlmIChpbmRleCA9PSBudWxsKSB7XG4gICAgICB0aGlzLmNvbnRleHQucHJvZ3JhbXMucHVzaCgnJyk7XG4gICAgICBjaGlsZC5pbmRleCA9IGluZGV4ID0gdGhpcy5jb250ZXh0LnByb2dyYW1zLmxlbmd0aDtcbiAgICAgIGNoaWxkLm5hbWUgID0gJ3Byb2dyYW0nICsgaW5kZXg7XG4gICAgICBwcm9ncmFtID0gbmV3IENvbXBpbGVyKCkuY29tcGlsZShjaGlsZCwgb3B0aW9ucywgdGhpcy5jb250ZXh0KTtcbiAgICAgIHRoaXMuY29udGV4dC5wcm9ncmFtc1tpbmRleF0gICAgID0gcHJvZ3JhbTtcbiAgICAgIHRoaXMuY29udGV4dC5lbnZpcm9ubWVudHNbaW5kZXhdID0gY2hpbGQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNoaWxkLmluZGV4ID0gaW5kZXg7XG4gICAgICBjaGlsZC5uYW1lICA9ICdwcm9ncmFtJyArIGluZGV4O1xuICAgIH1cbiAgfVxufTtcblxuLyoqXG4gKiBDb21waWxlcyB0aGUgZW52aXJvbm1lbnQgb2JqZWN0IGdlbmVyYXRlZCBieSB0aGUgYmFzZSBjb21waWxlci5cbiAqXG4gKiBAcGFyYW0gIHtPYmplY3R9ICAgICAgICAgICAgZW52aXJvbm1lbnRcbiAqIEByZXR1cm4geyhGdW5jdGlvbnxTdHJpbmcpfVxuICovXG5Db21waWxlci5wcm90b3R5cGUuY29tcGlsZSA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5lbGVtZW50U2xvdCA9IDA7XG4gIHJldHVybiBDb21tb25Db21waWxlci5jb21waWxlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59O1xuXG4vKipcbiAqIEFwcGVuZCBzb21lIGNvbnRlbnQgdG8gdGhlIGJ1ZmZlciAoYSBkb2N1bWVudCBmcmFnbWVudCkuXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSBzdHJpbmdcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuQ29tcGlsZXIucHJvdG90eXBlLmFwcGVuZFRvQnVmZmVyID0gZnVuY3Rpb24gKHN0cmluZykge1xuICBpZiAodGhpcy5lbnZpcm9ubWVudC5pc1NpbXBsZSkge1xuICAgIHJldHVybiAncmV0dXJuICcgKyBzdHJpbmcgKyAnOyc7XG4gIH1cblxuICB0aGlzLmNvbnRleHQuYWxpYXNlcy5hcHBlbmRDaGlsZCA9ICd0aGlzLmFwcGVuZENoaWxkJztcblxuICByZXR1cm4gJ2FwcGVuZENoaWxkKGJ1ZmZlciwgJyArIHN0cmluZyArICcpOyc7XG59O1xuXG4vKipcbiAqIEluaXRpYWxpemUgdGhlIGJhc2UgdmFsdWUgb2YgdGhlIGJ1ZmZlciwgaW4gdGhpcyBjYXNlIGEgZG9jdW1lbnQgZnJhZ21lbnQuXG4gKlxuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5Db21waWxlci5wcm90b3R5cGUuaW5pdGlhbGl6ZUJ1ZmZlciA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuICdkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCknO1xufTtcblxuLyoqXG4gKiBBcHBlbmQgYSB0ZXh0IG5vZGUgdG8gdGhlIGJ1ZmZlci5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gY29udGVudFxuICovXG5Db21waWxlci5wcm90b3R5cGUuYXBwZW5kQ29udGVudCA9IGZ1bmN0aW9uIChjb250ZW50KSB7XG4gIHZhciBzdHJpbmcgPSAnZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJyArIHRoaXMucXVvdGVkU3RyaW5nKGNvbnRlbnQpICsgJyknO1xuICB0aGlzLnB1c2hTb3VyY2UodGhpcy5hcHBlbmRUb0J1ZmZlcihzdHJpbmcpKTtcbn07XG5cbi8qKlxuICogV3JhcCBhbnkgY29udGVudHMgYmV0d2VlbiB0aGlzIGFuZCB0aGUgYXBwZW5kIG9wY29kZSBpbiBhIGZ1bmN0aW9uIGZvciByZXVzZS5cbiAqL1xuQ29tcGlsZXIucHJvdG90eXBlLmJlZm9yZUFwcGVuZCA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5wdXNoU291cmNlKHRoaXMubmV4dFN0YWNrKCkgKyAnID0gZnVuY3Rpb24gKCkgeycpO1xufTtcblxuLyoqXG4gKiBBcHBlbmQgYSB2YXJpYWJsZSB0byB0aGUgc3RhY2suIEFkZHMgc29tZSBhZGRpdGlvbmFsIGxvZ2ljIHRvIHRyYW5zZm9ybSB0aGVcbiAqIHRleHQgaW50byBhIERPTSBub2RlIGJlZm9yZSB3ZSBhdHRlbXB0IHRvIGFwcGVuZCBpdCB0byB0aGUgYnVmZmVyLlxuICpcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gaXNFc2NhcGVkXG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5hcHBlbmQgPSBmdW5jdGlvbiAoaXNFc2NhcGVkKSB7XG4gIHRoaXMuZmx1c2hJbmxpbmUoKTtcblxuICAvLyBDbG9zZSB0aGUgZnVuY3Rpb24gc3Vic2NyaXB0aW9uIHdyYXBwZXIuXG4gIHRoaXMucHVzaFNvdXJjZSgncmV0dXJuICcgKyB0aGlzLnBvcFN0YWNrKCkgKyAnOycpO1xuICB0aGlzLnB1c2hTb3VyY2UoJ307Jyk7XG5cbiAgdmFyIGNyZWF0ZUZuID0gaXNFc2NhcGVkID8gJ2NyZWF0ZVRleHQnIDogJ2NyZWF0ZURPTSc7XG5cbiAgdGhpcy5jb250ZXh0LmFsaWFzZXMuc2VsZiA9ICd0aGlzJztcblxuICAvLyBBcHBlbmQgdGhlIGZ1bmN0aW9uIHRvIHRoZSBjdXJyZW50IGJ1ZmZlci5cbiAgdGhpcy5wdXNoU291cmNlKFxuICAgIHRoaXMuYXBwZW5kVG9CdWZmZXIoJ3NlbGYuJyArIGNyZWF0ZUZuICsgJygnICsgdGhpcy5wb3BTdGFjaygpICsgJyknKVxuICApO1xufTtcblxuLyoqXG4gKiBBcHBlbmQgYW4gZXNjYXBlZCBIYW5kbGViYXJzIGV4cHJlc3Npb24gdG8gdGhlIHNvdXJjZS5cbiAqL1xuQ29tcGlsZXIucHJvdG90eXBlLmFwcGVuZEVzY2FwZWQgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLmFwcGVuZCh0cnVlKTtcbn07XG5cbi8qKlxuICogQXBwZW5kIGFuIGVsZW1lbnQgbm9kZSB0byB0aGUgc291cmNlLlxuICovXG5Db21waWxlci5wcm90b3R5cGUuYXBwZW5kRWxlbWVudCA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5wdXNoU291cmNlKHRoaXMuYXBwZW5kVG9CdWZmZXIodGhpcy5wb3BTdGFjaygpKSk7XG59O1xuXG4vKipcbiAqIENyZWF0ZSBhIERPTSBjb21tZW50IG5vZGUgcmVhZHkgZm9yIGFwcGVuZGluZyB0byB0aGUgY3VycmVudCBidWZmZXIuXG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5pbnZva2VDb21tZW50ID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmNvbnRleHQuYWxpYXNlcy5zZWxmID0gJ3RoaXMnO1xuXG4gIHRoaXMucHVzaFN0YWNrKFxuICAgICdzZWxmLmNyZWF0ZUNvbW1lbnQoc2VsZi5wYXJ0aWFsKCcgKyB0aGlzLnBvcFN0YWNrKCkgKyAnLCBkZXB0aDApKSdcbiAgKTtcbn07XG5cbi8qKlxuICogR2V0IGEgdW5pcXVlIHZhcmlhYmxlIG5hbWUgZm9yIGVhY2ggZWxlbWVudCBvbiB0aGUgc3RhY2suXG4gKlxuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5Db21waWxlci5wcm90b3R5cGUubmV4dEVsZW1lbnQgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBlbCA9ICdlbGVtZW50JyArICgrK3RoaXMuZWxlbWVudFNsb3QpO1xuICB0aGlzLnVzZVJlZ2lzdGVyKGVsKTtcbiAgcmV0dXJuIGVsO1xufTtcblxuLyoqXG4gKiBDcmVhdGUgYSBET00gZWxlbWVudCBub2RlIHJlYWR5IGZvciBhcHBlbmRpbmcgdG8gdGhlIGN1cnJlbnQgYnVmZmVyLlxuICovXG5Db21waWxlci5wcm90b3R5cGUuaW52b2tlRWxlbWVudCA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5jb250ZXh0LmFsaWFzZXMuc2VsZiA9ICd0aGlzJztcblxuICB2YXIgY3JlYXRlICA9ICdzZWxmLnBhcnRpYWwoJyArIHRoaXMucG9wU3RhY2soKSArICcsIGRlcHRoMCknO1xuICB2YXIgZWxlbWVudCA9IHRoaXMubGFzdEVsZW1lbnQgPSB0aGlzLm5leHRFbGVtZW50KCk7XG4gIHZhciBjYiAgICAgID0gJ2Z1bmN0aW9uIChlbCkgeyAnICsgZWxlbWVudCArICcgPSBlbDsgfSc7XG5cbiAgdGhpcy5wdXNoU3RhY2soZWxlbWVudCArICcgPSBzZWxmLmNyZWF0ZUVsZW1lbnQoJyArIGNyZWF0ZSArICcsICcgKyBjYiArICcpJyk7XG59O1xuXG4vKipcbiAqIEFwcGVuZCBhbiBhdHRyaWJ1dGUgbm9kZSB0byB0aGUgY3VycmVudCBlbGVtZW50LlxuICovXG5Db21waWxlci5wcm90b3R5cGUuaW52b2tlQXR0cmlidXRlID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmNvbnRleHQuYWxpYXNlcy5zZWxmID0gJ3RoaXMnO1xuXG4gIHZhciBlbGVtZW50ID0gJ2Z1bmN0aW9uICgpIHsgcmV0dXJuICcgKyB0aGlzLmxhc3RFbGVtZW50ICsgJzsgfSc7XG4gIHZhciB2YWx1ZSAgID0gJ3NlbGYucGFydGlhbCgnICsgdGhpcy5wb3BTdGFjaygpICsgJywgZGVwdGgwKSc7XG4gIHZhciBuYW1lICAgID0gJ3NlbGYucGFydGlhbCgnICsgdGhpcy5wb3BTdGFjaygpICsgJywgZGVwdGgwKSc7XG4gIHZhciBwYXJhbXMgID0gW2VsZW1lbnQsIG5hbWUsIHZhbHVlXTtcblxuICB0aGlzLnB1c2hTb3VyY2UoJ3NlbGYuc2V0QXR0cmlidXRlKCcgKyBwYXJhbXMuam9pbignLCAnKSArICcpOycpO1xufTtcblxuLyoqXG4gKiBJbnZva2UgYW4gYXJiaXRyYXJ5IHByb2dyYW0gYW5kIGFwcGVuZCB0byB0aGUgY3VycmVudCBlbGVtZW50LlxuICovXG5Db21waWxlci5wcm90b3R5cGUuaW52b2tlQ29udGVudCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGNoaWxkID0gdGhpcy5wb3BTdGFjaygpICsgJyhkZXB0aDApJztcblxuICB0aGlzLmNvbnRleHQuYWxpYXNlcy5hcHBlbmRDaGlsZCA9ICd0aGlzLmFwcGVuZENoaWxkJztcblxuICB0aGlzLnB1c2hTb3VyY2UoJ2FwcGVuZENoaWxkKCcgKyB0aGlzLmxhc3RFbGVtZW50ICsgJywgJyArIGNoaWxkICsgJyk7Jyk7XG59O1xuXG4vKipcbiAqIE92ZXJyaWRlIHRoZSBwcm9ncmFtIGV4cHJlc3Npb24gZnVuY3Rpb24gdG8gcHJveHkgZGVwdGguXG4gKlxuICogQHBhcmFtICB7TnVtYmVyfSBndWlkXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5wcm9ncmFtRXhwcmVzc2lvbiA9IGZ1bmN0aW9uIChndWlkKSB7XG4gIHRoaXMuY29udGV4dC5hbGlhc2VzLnNlbGYgPSAndGhpcyc7XG5cbiAgaWYgKGd1aWQgPT0gbnVsbCkge1xuICAgIHJldHVybiAnc2VsZi5ub29wJztcbiAgfVxuXG4gIHZhciBjaGlsZCAgICAgICAgID0gdGhpcy5lbnZpcm9ubWVudC5jaGlsZHJlbltndWlkXTtcbiAgdmFyIGRlcHRocyAgICAgICAgPSBjaGlsZC5kZXB0aHMubGlzdDtcbiAgdmFyIHByb2dyYW1QYXJhbXMgPSBbY2hpbGQuaW5kZXgsIGNoaWxkLm5hbWUsICdkYXRhJ107XG5cbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGRlcHRocy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIHZhciBkZXB0aCA9IGRlcHRoc1tpXSArIHRoaXMuZW52aXJvbm1lbnQuZGVwdGhzLmxpc3QubGVuZ3RoO1xuXG4gICAgcHJvZ3JhbVBhcmFtcy5wdXNoKCdkZXB0aCcgKyAoZGVwdGggLSAxKSk7XG4gIH1cblxuICB2YXIgcGFyYW1zID0gcHJvZ3JhbVBhcmFtcy5qb2luKCcsICcpO1xuXG4gIGlmIChkZXB0aHMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuICdzZWxmLnByb2dyYW0oJyArIHBhcmFtcyArICcpJztcbiAgfVxuXG4gIHJldHVybiAnc2VsZi5wcm9ncmFtV2l0aERlcHRoKCcgKyBwYXJhbXMgKyAnKSc7XG59O1xuIiwidmFyIEhic1BhcnNlciAgPSByZXF1aXJlKFxuICAnaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL2NvbXBpbGVyL3BhcnNlcidcbilbJ2RlZmF1bHQnXTtcbnZhciBIVE1MUGFyc2VyID0gcmVxdWlyZSgnaHRtbHBhcnNlcjIvbGliL1BhcnNlcicpO1xuXG4vKipcbiAqIFN0cmluZ2lmeSBhbiBgQVNULlByb2dyYW1Ob2RlYCBzbyBpdCBjYW4gYmUgcnVuIHRocm91Z2ggb3RoZXJzIHBhcnNlcnMuIFRoaXNcbiAqIGlzIHJlcXVpcmVkIGZvciB0aGUgbm9kZSB0byBiZSBwYXJzZWQgYXMgSFRNTCAqYWZ0ZXIqIGl0IGlzIHBhcnNlZCBhcyBhXG4gKiBIYW5kbGViYXJzIHRlbXBsYXRlLiBIYW5kbGViYXJzIG11c3QgYWx3YXlzIHJ1biBiZWZvcmUgdGhlIEhUTUwgcGFyc2VyLCBzb1xuICogaXQgY2FuIGNvcnJlY3RseSBtYXRjaCBibG9jayBub2RlcyAoSSBjb3VsZG4ndCBzZWUgYSBzaW1wbGUgd2F5IHRvIHJlc3VtZVxuICogdGhlIGVuZCBibG9jayBub2RlIHBhcnNpbmcpLlxuICpcbiAqIEBwYXJhbSAge0hhbmRsZWJhcnMuQVNULlByb2dyYW1Ob2RlfSBwcm9ncmFtXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKi9cbnZhciBzdHJpbmdpZnlQcm9ncmFtID0gZnVuY3Rpb24gKHByb2dyYW0pIHtcbiAgdmFyIGh0bWwgICAgICAgPSAnJztcbiAgdmFyIHN0YXRlbWVudHMgPSBwcm9ncmFtLnN0YXRlbWVudHM7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdGF0ZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHN0YXRlbWVudCA9IHN0YXRlbWVudHNbaV07XG5cbiAgICBpZiAoc3RhdGVtZW50LnR5cGUgPT09ICdjb250ZW50Jykge1xuICAgICAgaHRtbCArPSBzdGF0ZW1lbnQuc3RyaW5nO1xuICAgIH0gZWxzZSB7XG4gICAgICBodG1sICs9ICd7e2QnICsgaSArICd9fSc7IC8vIFwiQWxpYXNcIiBub2RlLlxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBodG1sO1xufTtcblxuLyoqXG4gKiBQYXJzZXMgYSB0ZXh0IHN0cmluZyByZXR1cm5lZCBmcm9tIHN0cmluZ2lmeWluZyBhIHByb2dyYW0gbm9kZS4gUmVwbGFjZXMgYW55XG4gKiBtdXN0YWNoZSBub2RlIHJlZmVyZW5jZXMgd2l0aCB0aGUgb3JpZ2luYWwgbm9kZS5cblxuICogQHBhcmFtICB7U3RyaW5nfSBpbnB1dFxuICogQHBhcmFtICB7T2JqZWN0fSBvcmlnaW5hbFByb2dyYW1cbiAqIEByZXR1cm4ge09iamVjdH1cbiAqL1xudmFyIHBhcnNlUHJvZ3JhbSA9IGZ1bmN0aW9uIChpbnB1dCwgb3JpZ2luYWxQcm9ncmFtKSB7XG4gIHZhciBwcm9ncmFtICAgID0gSGJzUGFyc2VyLnBhcnNlKGlucHV0KTtcbiAgdmFyIHN0YXRlbWVudHMgPSBwcm9ncmFtLnN0YXRlbWVudHM7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdGF0ZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHN0YXRlbWVudCA9IHN0YXRlbWVudHNbaV07XG5cbiAgICAvLyBSZXBsYWNlIG11c3RhY2hlIG5vZGVzLCB3aGljaCAqc2hvdWxkKiBvbmx5IGJlIHJlYWwgSGFuZGxlYmFycyBcImFsaWFzXCJcbiAgICAvLyBub2RlcyB0aGF0IHdlcmUgaW5qZWN0ZWQgYnkgdGhlIHN0cmluZ2lmaWNhdGlvbiBvZiB0aGUgcHJvZ3JhbSBub2RlLlxuICAgIGlmIChzdGF0ZW1lbnQudHlwZSA9PT0gJ211c3RhY2hlJykge1xuICAgICAgc3RhdGVtZW50c1tpXSA9IG9yaWdpbmFsUHJvZ3JhbS5zdGF0ZW1lbnRzW3N0YXRlbWVudC5pZC5zdHJpbmcuc3Vic3RyKDEpXTtcbiAgICAgIHN0YXRlbWVudCA9IHN0YXRlbWVudHNbaV07XG4gICAgfVxuXG4gICAgLy8gTmVlZCB0byByZWN1cnNpdmVseSByZXNvbHZlIGJsb2NrIG5vZGUgcHJvZ3JhbXMgYXMgSFRNTC5cbiAgICBpZiAoc3RhdGVtZW50LnR5cGUgPT09ICdibG9jaycpIHtcbiAgICAgIGlmIChzdGF0ZW1lbnQucHJvZ3JhbSkge1xuICAgICAgICBzdGF0ZW1lbnQucHJvZ3JhbSA9IHBhcnNlQXNIVE1MKHN0YXRlbWVudC5wcm9ncmFtKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHN0YXRlbWVudC5pbnZlcnNlKSB7XG4gICAgICAgIHN0YXRlbWVudC5pbnZlcnNlID0gcGFyc2VBc0hUTUwoc3RhdGVtZW50LmludmVyc2UpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBwcm9ncmFtO1xufTtcblxuLyoqXG4gKiBQYXJzZSBhIHByb2dyYW0gb2JqZWN0IGFzIEhUTUwgYW5kIHJldHVybiBhbiB1cGRhdGVkIHByb2dyYW0uXG4gKlxuICogQHBhcmFtICB7T2JqZWN0fSBvcmlnaW5hbFByb2dyYW1cbiAqIEByZXR1cm4ge09iamVjdH1cbiAqL1xudmFyIHBhcnNlQXNIVE1MID0gZnVuY3Rpb24gKG9yaWdpbmFsUHJvZ3JhbSkge1xuICB2YXIgeXkgICA9IEhic1BhcnNlci55eTtcbiAgdmFyIGh0bWwgPSBzdHJpbmdpZnlQcm9ncmFtKG9yaWdpbmFsUHJvZ3JhbSk7XG5cbiAgLy8gQ3JlYXRlIGFuZCByZXR1cm4gYSBuZXcgZW1wdHkgcHJvZ3JhbSBub2RlLlxuICB2YXIgY3JlYXRlUHJvZ3JhbSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gbmV3IHl5LlByb2dyYW1Ob2RlKFtdKTtcbiAgfTtcblxuICAvLyBTdGFydCB0aGUgc3RhY2sgd2l0aCBhbiBlbXB0eSBwcm9ncmFtIG5vZGUgd2hpY2ggd2lsbCBjb250YWluIGFsbCB0aGVcbiAgLy8gcGFyc2VkIGVsZW1lbnRzLlxuICB2YXIgcHJvZ3JhbSA9IGNyZWF0ZVByb2dyYW0oKTtcbiAgdmFyIHN0YWNrICAgPSBbcHJvZ3JhbV07XG4gIHZhciBlbGVtZW50O1xuXG4gIC8vIEdlbmVyYXRlIGEgbmV3IEhUTUwgcGFyc2VyIGluc3RhbmNlLlxuICB2YXIgcGFyc2VyID0gbmV3IEhUTUxQYXJzZXIoe1xuICAgIG9ub3BlbnRhZ25hbWU6IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICB2YXIgbm9kZSA9IG5ldyB5eS5ET01FbGVtZW50KG5hbWUsIFtdLCBjcmVhdGVQcm9ncmFtKCkpO1xuICAgICAgcHJvZ3JhbS5zdGF0ZW1lbnRzLnB1c2goZWxlbWVudCA9IG5vZGUpO1xuICAgICAgc3RhY2sucHVzaChwcm9ncmFtID0gbm9kZS5jb250ZW50KTtcbiAgICB9LFxuICAgIG9uY2xvc2V0YWc6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHN0YWNrLnBvcCgpO1xuICAgICAgZWxlbWVudCA9IG51bGw7XG4gICAgICBwcm9ncmFtID0gc3RhY2tbc3RhY2subGVuZ3RoIC0gMV07XG4gICAgfSxcbiAgICBvbmF0dHJpYnV0ZTogZnVuY3Rpb24gKG5hbWUsIHZhbHVlKSB7XG4gICAgICBlbGVtZW50LmF0dHJpYnV0ZXMucHVzaChuZXcgeXkuRE9NQXR0cmlidXRlKG5hbWUsIHZhbHVlKSk7XG4gICAgfSxcbiAgICBvbnRleHQ6IGZ1bmN0aW9uICh0ZXh0KSB7XG4gICAgICBwcm9ncmFtLnN0YXRlbWVudHMucHVzaCh0ZXh0KTtcbiAgICB9LFxuICAgIG9ucHJvY2Vzc2luZ2luc3RydWN0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Byb2Nlc3NpbmcgaW5zdHJ1Y3Rpb25zIGFyZSBub3Qgc3VwcG9ydGVkJyk7XG4gICAgfSxcbiAgICBvbmNvbW1lbnQ6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICBwcm9ncmFtLnN0YXRlbWVudHMucHVzaChuZXcgeXkuRE9NQ29tbWVudChkYXRhKSk7XG4gICAgfSxcbiAgICBvbmVycm9yOiBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfSwge1xuICAgIGRlY29kZUVudGl0aWVzOiB0cnVlXG4gIH0pO1xuXG4gIHBhcnNlci53cml0ZShodG1sKTtcbiAgcGFyc2VyLmVuZCgpO1xuXG4gIC8qKlxuICAgKiBSZWN1cnNpdmVseSBwYXJzZXMgbmVzdGVkIERPTSBlbGVtZW50cyBhcyBIYW5kbGViYXJzIHRlbXBsYXRlcy5cbiAgICpcbiAgICogQHBhcmFtICB7T2JqZWN0fSBwcm9ncmFtXG4gICAqIEBwYXJhbSAge09iamVjdH0gb3JpZ2luYWxQcm9ncmFtXG4gICAqIEByZXR1cm4ge09iamVjdH1cbiAgICovXG4gIHZhciBhc3QgPSAoZnVuY3Rpb24gcmVjdXJzZSAocHJvZ3JhbSwgb3JpZ2luYWxQcm9ncmFtKSB7XG4gICAgdmFyIHN0YXRlbWVudHMgPSBwcm9ncmFtLnN0YXRlbWVudHM7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN0YXRlbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBzdGF0ZW1lbnQgPSBzdGF0ZW1lbnRzW2ldO1xuXG4gICAgICBpZiAodHlwZW9mIHN0YXRlbWVudCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgdmFyIG1lcmdlID0gcGFyc2VQcm9ncmFtKHN0YXRlbWVudCwgb3JpZ2luYWxQcm9ncmFtKS5zdGF0ZW1lbnRzO1xuXG4gICAgICAgIHN0YXRlbWVudHMuc3BsaWNlLmFwcGx5KHN0YXRlbWVudHMsIFtpLCAxXS5jb25jYXQobWVyZ2UpKTtcbiAgICAgICAgaSArPSBtZXJnZS5sZW5ndGggLSAxO1xuICAgICAgfSBlbHNlIGlmIChzdGF0ZW1lbnQudHlwZSA9PT0gJ0RPTV9DT01NRU5UJykge1xuICAgICAgICBzdGF0ZW1lbnQudGV4dCA9IHBhcnNlUHJvZ3JhbShzdGF0ZW1lbnQudGV4dCwgb3JpZ2luYWxQcm9ncmFtKTtcbiAgICAgIH0gZWxzZSBpZiAoc3RhdGVtZW50LnR5cGUgPT09ICdET01fRUxFTUVOVCcpIHtcbiAgICAgICAgc3RhdGVtZW50Lm5hbWUgPSBwYXJzZVByb2dyYW0oc3RhdGVtZW50Lm5hbWUsIG9yaWdpbmFsUHJvZ3JhbSk7XG5cbiAgICAgICAgZm9yICh2YXIgayA9IDA7IGsgPCBzdGF0ZW1lbnQuYXR0cmlidXRlcy5sZW5ndGg7IGsrKykge1xuICAgICAgICAgIHZhciBhdHRyaWJ1dGUgPSBzdGF0ZW1lbnQuYXR0cmlidXRlc1trXTtcblxuICAgICAgICAgIGF0dHJpYnV0ZS5uYW1lICA9IHBhcnNlUHJvZ3JhbShhdHRyaWJ1dGUubmFtZSwgIG9yaWdpbmFsUHJvZ3JhbSk7XG4gICAgICAgICAgYXR0cmlidXRlLnZhbHVlID0gcGFyc2VQcm9ncmFtKGF0dHJpYnV0ZS52YWx1ZSwgb3JpZ2luYWxQcm9ncmFtKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlY3Vyc2Uoc3RhdGVtZW50LmNvbnRlbnQsIG9yaWdpbmFsUHJvZ3JhbSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHByb2dyYW07XG4gIH0pKHN0YWNrLnBvcCgpLCBvcmlnaW5hbFByb2dyYW0pO1xuXG4gIHJldHVybiBhc3Q7XG59O1xuXG4vKipcbiAqIFRoZSBwYXJzZXIgaXMgYSBzaW1wbGUgY29uc3RydWN0b3IuIEFsbCB0aGUgZnVuY3Rpb25hbGl0eSBpcyBvbiB0aGUgcHJvdG90eXBlXG4gKiBvYmplY3QuXG4gKi9cbnZhciBQYXJzZXIgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMueXkgPSB7fTtcbn07XG5cbi8qKlxuICogQWxpYXMgdGhlIHBhcnNlciBjb25zdHJ1Y3RvciBmdW5jdGlvbi5cbiAqXG4gKiBAdHlwZSB7RnVuY3Rpb259XG4gKi9cblBhcnNlci5wcm90b3R5cGUuUGFyc2VyID0gUGFyc2VyO1xuXG4vKipcbiAqIFRoZSBwcmltYXJ5IGZ1bmN0aW9uYWxpdHkgb2YgdGhlIHBhcnNlci4gUHVzaGVzIHRoZSBpbnB1dCB0ZXh0IHRocm91Z2hcbiAqIEhhbmRsZWJhcnMgYW5kIGEgSFRNTCBwYXJzZXIsIGdlbmVyYXRpbmcgYSBBU1QgZm9yIHVzZSB3aXRoIHRoZSBjb21waWxlci5cbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9IGlucHV0XG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cblBhcnNlci5wcm90b3R5cGUucGFyc2UgPSBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgSGJzUGFyc2VyLnl5ID0gdGhpcy55eTtcblxuICAvLyBQYXJzZSBpdCBhcyBhIEhhbmRsZWJhcnMgdG8gZXh0cmFjdCB0aGUgaW1wb3J0YW50IG5vZGVzIGZpcnN0LiBUaGVuIHdlXG4gIC8vIHN0cmluZ2lmeSB0aGUgbm9kZSB0byBzb21ldGhpbmcgdGhlIEhUTUwgcGFyc2VyIGNhbiBoYW5kbGUuIFRoZSBBU1QgdGhlXG4gIC8vIEhUTUwgcGFyc2VyIGdlbmVyYXRlcyB3aWxsIGJlIHBhcnNlZCB1c2luZyBIYW5kbGViYXJzIGFnYWluIHRvIGluamVjdCB0aGVcbiAgLy8gb3JpZ2luYWwgbm9kZXMgYmFjay5cbiAgcmV0dXJuIHBhcnNlQXNIVE1MKEhic1BhcnNlci5wYXJzZShpbnB1dCkpO1xufTtcblxuLyoqXG4gKiBFeHBvcnQgYSBzdGF0aWMgaW5zdGFuY2Ugb2YgdGhlIHBhcnNlci5cbiAqXG4gKiBAdHlwZSB7UGFyc2VyfVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBQYXJzZXIoKTtcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL2V4Y2VwdGlvbicpWydkZWZhdWx0J107XG4iLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4vKipcbiAqIFdyYXAgaW4gYW4gYW5vbnltb3VzIGZ1bmN0aW9uIHRvIGFsaWFzIHRpbWVyIHV0aWxpdGllcy5cbiAqL1xuKGZ1bmN0aW9uIChzZXRUaW1lb3V0LCBjbGVhclRpbWVvdXQsIERhdGUpIHtcbiAgLyoqXG4gICAqIEZhbGxiYWNrIGFuaW1hdGlvbiBmcmFtZSBpbXBsZW1lbnRhdGlvbi5cbiAgICpcbiAgICogQHJldHVybiB7RnVuY3Rpb259XG4gICAqL1xuICB2YXIgZmFsbGJhY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgLyoqXG4gICAgICogUmV0dXJuIHRoZSBjdXJyZW50IHRpbWVzdGFtcCBpbnRlZ2VyLlxuICAgICAqL1xuICAgIHZhciBub3cgPSBEYXRlLm5vdyB8fCBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgfTtcblxuICAgIC8vIEtlZXAgdHJhY2sgb2YgdGhlIHByZXZpb3VzIFwiYW5pbWF0aW9uIGZyYW1lXCIgbWFudWFsbHkuXG4gICAgdmFyIHByZXYgPSBub3coKTtcblxuICAgIHJldHVybiBmdW5jdGlvbiAoZm4pIHtcbiAgICAgIHZhciBjdXJyID0gbm93KCk7XG4gICAgICB2YXIgbXMgICA9IE1hdGgubWF4KDAsIDE2IC0gKGN1cnIgLSBwcmV2KSk7XG4gICAgICB2YXIgcmVxICA9IHNldFRpbWVvdXQoZm4sIG1zKTtcblxuICAgICAgcHJldiA9IGN1cnI7XG5cbiAgICAgIHJldHVybiByZXE7XG4gICAgfTtcbiAgfTtcblxuICAvKipcbiAgICogRXhwb3NlIGByZXF1ZXN0QW5pbWF0aW9uRnJhbWVgLlxuICAgKlxuICAgKiBAdHlwZSB7RnVuY3Rpb259XG4gICAqL1xuICBleHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBnbG9iYWwucmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgZ2xvYmFsLndlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgIGdsb2JhbC5tb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgICBnbG9iYWwubXNSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgICBnbG9iYWwub1JlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgIGZhbGxiYWNrKCk7XG5cbiAgLyoqXG4gICAqIENhbmNlbCB0aGUgYW5pbWF0aW9uIGZyYW1lLlxuICAgKlxuICAgKiBAdHlwZSB7RnVuY3Rpb259XG4gICAqL1xuICB2YXIgY2FuY2VsID0gZ2xvYmFsLmNhbmNlbEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgZ2xvYmFsLndlYmtpdENhbmNlbEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgZ2xvYmFsLm1vekNhbmNlbEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgZ2xvYmFsLm1zQ2FuY2VsQW5pbWF0aW9uRnJhbWUgfHxcbiAgICBnbG9iYWwub0NhbmNlbEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgY2xlYXJUaW1lb3V0O1xuXG4gIC8qKlxuICAgKiBDYW5jZWwgYW4gYW5pbWF0aW9uIGZyYW1lLlxuICAgKlxuICAgKiBAcGFyYW0ge051bWJlcn0gaWRcbiAgICovXG4gIGV4cG9ydHMuY2FuY2VsID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgY2FuY2VsKGlkKTtcbiAgfTtcbn0pKHNldFRpbWVvdXQsIGNsZWFyVGltZW91dCwgRGF0ZSk7XG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwidmFyIGhic1ZNID0gcmVxdWlyZSgnaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL3J1bnRpbWUnKTtcbnZhciBVdGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbnZhciByYWYgICA9IHJlcXVpcmUoJy4vcmFmJyk7XG5cbi8qKlxuICogS2VlcCBhIG1hcCBvZiBhdHRyaWJ1dGVzIHRoYXQgbmVlZCB0byB1cGRhdGUgdGhlIGNvcnJlc3BvbmRpbmcgcHJvcGVydGllcy5cbiAqXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG52YXIgQVRUUklCVVRFX1BST1BTID0ge1xuICBJTlBVVDoge1xuICAgIHZhbHVlOiAgICd2YWx1ZScsXG4gICAgY2hlY2tlZDogJ2NoZWNrZWQnXG4gIH0sXG4gIE9QVElPTjoge1xuICAgIHNlbGVjdGVkOiAnc2VsZWN0ZWQnXG4gIH1cbn07XG5cbi8qKlxuICogSXRlcmF0ZSBvdmVyIGEgc3Vic2NyaXB0aW9ucyBvYmplY3QsIGNhbGxpbmcgYSBmdW5jdGlvbiB3aXRoIHRoZSBvYmplY3RcbiAqIHByb3BlcnR5IGRldGFpbHMgYW5kIGEgdW5pcXVlIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9ICAgIHN1YnNjcmlwdGlvbnNcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xuICovXG52YXIgaXRlcmF0ZVN1YnNjcmlwdGlvbnMgPSBmdW5jdGlvbiAoc3Vic2NyaXB0aW9ucywgZm4sIGNvbnRleHQpIHtcbiAgZm9yICh2YXIgaWQgaW4gc3Vic2NyaXB0aW9ucykge1xuICAgIGZvciAodmFyIHByb3BlcnR5IGluIHN1YnNjcmlwdGlvbnNbaWRdKSB7XG4gICAgICBmbi5jYWxsKGNvbnRleHQsIHN1YnNjcmlwdGlvbnNbaWRdW3Byb3BlcnR5XSwgcHJvcGVydHksIGlkKTtcbiAgICB9XG4gIH1cbn07XG5cbi8qKlxuICogQ3JlYXRlIGEgbmV3IHN1YnNjaXB0aW9uIGluc3RhbmNlLiBUaGlzIGZ1bmN0aW9uYWxpdHkgaXMgdGlnaHRseSBjb3VwbGVkIHRvXG4gKiBET01CYXJzIHByb2dyYW0gZXhlY3V0aW9uLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSB1cGRhdGVcbiAqIEBwYXJhbSB7T2JqZWN0fSAgIGNvbnRhaW5lclxuICovXG52YXIgU3Vic2NyaXB0aW9uID0gZnVuY3Rpb24gKGZuLCB1cGRhdGUsIGNvbnRhaW5lcikge1xuICAvLyBBbGlhcyBwYXNzZWQgaW4gdmFyaWFibGVzIGZvciBsYXRlciBhY2Nlc3MuXG4gIHRoaXMuX2ZuICAgICAgICA9IGZuO1xuICB0aGlzLl91cGRhdGUgICAgPSB1cGRhdGU7XG4gIHRoaXMuX2NvbnRhaW5lciA9IGNvbnRhaW5lcjtcblxuICAvLyBBc3NpZ24gZXZlcnkgc3Vic2NyaXB0aW9uIGluc3RhbmNlIGEgdW5pcXVlIGlkLiBUaGlzIGhlbHBzIHdpdGggbGlua2luZ1xuICAvLyBiZXR3ZWVuIHBhcmVudCBhbmQgY2hpbGQgc3Vic2NyaXB0aW9uIGluc3RhbmNlcy5cbiAgdGhpcy5jaWQgICAgICAgICAgICAgPSAnYycgKyBVdGlscy51bmlxdWVJZCgpO1xuICB0aGlzLmNoaWxkcmVuICAgICAgICA9IHt9O1xuICB0aGlzLnN1YnNjcmlwdGlvbnMgICA9IHt9O1xuICB0aGlzLnVuc3Vic2NyaXB0aW9ucyA9IFtdO1xuXG4gIC8vIENyZWF0ZSBzdGF0aWNhbGx5IGJvdW5kIGZ1bmN0aW9uIGluc3RhbmNlcyBmb3IgcHVibGljIGNvbnN1bXB0aW9uLlxuICB0aGlzLmJvdW5kVXBkYXRlICAgICAgICAgPSBVdGlscy5iaW5kKHRoaXMudXBkYXRlLCB0aGlzKTtcbiAgdGhpcy5ib3VuZFVuc3Vic2NyaXB0aW9uID0gVXRpbHMuYmluZCh0aGlzLnVuc3Vic2NyaXB0aW9uLCB0aGlzKTtcbn07XG5cbi8qKlxuICogRXhwb3NlIHRoZSBpbnRlcm5hbCBzdXNiY3JpYmUgZnVuY3Rpb25hbGl0eSBmb3IgdGhlIGNvbnRhaW5lci5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0XG4gKiBAcGFyYW0ge1N0cmluZ30gcHJvcGVydHlcbiAqIEBwYXJhbSB7U3RyaW5nfSBpZFxuICovXG5TdWJzY3JpcHRpb24ucHJvdG90eXBlLnN1YnNjcmliZSA9IGZ1bmN0aW9uIChvYmplY3QsIHByb3BlcnR5LCBpZCkge1xuICAodGhpcy5zdWJzY3JpcHRpb25zW2lkXSB8fCAodGhpcy5zdWJzY3JpcHRpb25zW2lkXSA9IHt9KSlbcHJvcGVydHldID0gb2JqZWN0O1xufTtcblxuLyoqXG4gKiBQYXNzIGEgY3VzdG9tIHVuc3Vic2NyaXB0aW9uIGZ1bmN0aW9uIHRoYXQgd2lsbCBleGVjdXRlIHdoZW4gd2UgdW5zdWJzY3JpYmUuXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqL1xuU3Vic2NyaXB0aW9uLnByb3RvdHlwZS51bnN1YnNjcmlwdGlvbiA9IGZ1bmN0aW9uIChmbikge1xuICBVdGlscy5pc0Z1bmN0aW9uKGZuKSAmJiB0aGlzLnVuc3Vic2NyaXB0aW9ucy5wdXNoKGZuKTtcbn07XG5cbi8qKlxuICogVW5zdWJzY3JpYmUgZnJvbSBhIHN1YmNyaXB0aW9ucyBvYmplY3QuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHN1YnNjcmlwdGlvbnNcbiAqL1xuU3Vic2NyaXB0aW9uLnByb3RvdHlwZS5fdW5zdWJzY3JpYmUgPSBmdW5jdGlvbiAoc3Vic2NyaXB0aW9ucykge1xuICBpdGVyYXRlU3Vic2NyaXB0aW9ucyhzdWJzY3JpcHRpb25zLCBmdW5jdGlvbiAob2JqZWN0LCBwcm9wZXJ0eSwgaWQpIHtcbiAgICBkZWxldGUgc3Vic2NyaXB0aW9uc1tpZF1bcHJvcGVydHldO1xuICAgIHRoaXMuX2NvbnRhaW5lci5fdW5zdWJzY3JpYmUob2JqZWN0LCBwcm9wZXJ0eSwgdGhpcy5ib3VuZFVwZGF0ZSk7XG4gIH0sIHRoaXMpO1xufTtcblxuLyoqXG4gKiBJdGVyYXRlIG92ZXIgYW4gYXJyYXkgb2YgdW5zdWJzY3JpcHRpb25zLlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHVuc3Vic2NyaXB0aW9uc1xuICovXG5TdWJzY3JpcHRpb24ucHJvdG90eXBlLl91bnN1YnNjcmlwdGlvbiA9IGZ1bmN0aW9uICh1bnN1YnNjcmlwdGlvbnMpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB1bnN1YnNjcmlwdGlvbnMubGVuZ3RoOyBpKyspIHtcbiAgICB1bnN1YnNjcmlwdGlvbnNbaV0oKTtcbiAgfVxufTtcblxuLyoqXG4gKiBVbnN1YnNjcmliZSBldmVyeXRoaW5nIGZyb20gdGhlIGN1cnJlbnQgaW5zdGFuY2UuXG4gKi9cblN1YnNjcmlwdGlvbi5wcm90b3R5cGUudW5zdWJzY3JpYmUgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0aGlzLl91bnN1YnNjcmliZWQpIHsgcmV0dXJuOyB9XG5cbiAgdGhpcy5fdW5zdWJzY3JpYmUodGhpcy5zdWJzY3JpcHRpb25zKTtcbiAgdGhpcy5fdW5zdWJzY3JpcHRpb24odGhpcy51bnN1YnNjcmlwdGlvbnMpO1xuXG4gIC8vIERlbGV0ZSBhbnkgcmVmZXJlbmNlIHRvIHRoaXMgc3Vic2NyaXB0aW9uIGZyb20gdGhlIHBhcmVudC5cbiAgaWYgKHRoaXMucGFyZW50KSB7XG4gICAgZGVsZXRlIHRoaXMucGFyZW50LmNoaWxkcmVuW3RoaXMuY2lkXTtcbiAgICBkZWxldGUgdGhpcy5wYXJlbnQ7XG4gIH1cblxuICAvLyBDYW5jZWwgYW55IGN1cnJlbnRseSBleGVjdXRpbmcgZnVuY3Rpb25zLiBXZSBhbHNvIG5lZWQgdG8gc2V0IGFuXG4gIC8vIHVuc3Vic2NyaWJlZCBmbGFnIGluIGNhc2UgdGhlIGZ1bmN0aW9uIGlzIHN0aWxsIGF2YWlsYWJsZSBzb21ld2hlcmUgYW5kXG4gIC8vIGNhbGxlZCBhZnRlciB1bnN1YnNjcmlwdGlvbiBoYXMgb2NjdXJlZC5cbiAgVk0uZXhlYy5jYW5jZWwodGhpcy5fZXhlY0lkKTtcbiAgdGhpcy5fdW5zdWJzY3JpYmVkID0gdHJ1ZTtcbiAgdGhpcy5fdW5zdWJzY3JpYmVDaGlsZHJlbigpO1xuXG4gIC8vIFJlbW92ZSB1bndhbnRlZCBsaW5nZXJpbmcgcmVmZXJlbmNlcy5cbiAgZGVsZXRlIHRoaXMuY2hpbGRyZW47XG4gIGRlbGV0ZSB0aGlzLnN1YnNjcmlwdGlvbnM7XG4gIGRlbGV0ZSB0aGlzLnVuc3Vic2NyaXB0aW9ucztcbiAgZGVsZXRlIHRoaXMuX2ZuO1xuICBkZWxldGUgdGhpcy5fdXBkYXRlO1xuICBkZWxldGUgdGhpcy5fY29udGFpbmVyO1xuICBkZWxldGUgdGhpcy5ib3VuZFVwZGF0ZTtcbiAgZGVsZXRlIHRoaXMuYm91bmRVbnN1YnNjcmlwdGlvbjtcbn07XG5cbi8qKlxuICogVW5zdWJzY3JpYmUgdGhlIGN1cnJlbnQgaW5zdGFuY2UgY2hpbGRyZW4uXG4gKi9cblN1YnNjcmlwdGlvbi5wcm90b3R5cGUuX3Vuc3Vic2NyaWJlQ2hpbGRyZW4gPSBmdW5jdGlvbiAoKSB7XG4gIGZvciAodmFyIGNoaWxkIGluIHRoaXMuY2hpbGRyZW4pIHtcbiAgICB0aGlzLmNoaWxkcmVuW2NoaWxkXS51bnN1YnNjcmliZSgpO1xuICB9XG59O1xuXG4vKipcbiAqIEV4ZWN1dGUgdGhlIHN1YnNjcmlwdGlvbiBmdW5jdGlvbi5cbiAqXG4gKiBAcmV0dXJuIHsqfVxuICovXG5TdWJzY3JpcHRpb24ucHJvdG90eXBlLmV4ZWN1dGUgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBwYXJlbnQgPSB0aGlzLl9jb250YWluZXIuc3Vic2NyaXB0aW9uO1xuXG4gIC8vIElmIHdlIGhhdmUgYW4gZXhpc3Rpbmcgc3Vic2NyaXB0aW9uLCBsaW5rIHRoZSBzdWJzY3JpcHRpb25zIHRvZ2V0aGVyLlxuICBpZiAocGFyZW50ICYmICFwYXJlbnQuX3Vuc3Vic2NyaWJlZCkge1xuICAgIHRoaXMucGFyZW50ID0gdGhpcy5fY29udGFpbmVyLnN1YnNjcmlwdGlvbjtcbiAgICB0aGlzLnBhcmVudC5jaGlsZHJlblt0aGlzLmNpZF0gPSB0aGlzO1xuICB9XG5cbiAgLy8gQWxpYXMgdGhlIGN1cnJlbnQgc3Vic2NyaXB0aW9ucyBvYmplY3QgZm9yIGRpZmZpbmcgYWZ0ZXIgZXhlY3V0aW9uLlxuICB0aGlzLl9zdWJzY3JpcHRpb25zID0gdGhpcy5zdWJzY3JpcHRpb25zO1xuICB0aGlzLl91bnN1YnNjcmlwdGlvbih0aGlzLnVuc3Vic2NyaXB0aW9ucyk7XG5cbiAgLy8gUmVzZXQgdGhlIHN1YnNjcmlwdGlvbnMgYW5kIHVuc3Vic2NyaXB0aW9ucyBvYmplY3RzIGJlZm9yZSBleGVjdXRpb24uXG4gIHRoaXMuc3Vic2NyaXB0aW9ucyAgID0ge307XG4gIHRoaXMudW5zdWJzY3JpcHRpb25zID0gW107XG5cbiAgdGhpcy5fY29udGFpbmVyLnN1YnNjcmlwdGlvbiA9IHRoaXM7XG4gIHZhciByZXN1bHQgPSB0aGlzLl9mbi5hcHBseSh0aGlzLl9jb250YWluZXIsIGFyZ3VtZW50cyk7XG4gIHRoaXMuX2NvbnRhaW5lci5zdWJzY3JpcHRpb24gPSB0aGlzLnBhcmVudDtcblxuICAvLyBUaGUgY3VycmVudCBzdWJzY3JpcHRpb25zIG9iamVjdCBuZWVkcyB0byBiZSBjb21wYXJlZCBhZ2FpbnN0IHRoZSBwcmV2aW91c1xuICAvLyBzdWJzY3JpcHRpb25zIGFuZCBhbnkgZGlmZmVuY2VzIGZpeGVkLlxuICB2YXIgY3VycmVudCAgPSB0aGlzLnN1YnNjcmlwdGlvbnM7XG4gIHZhciBwcmV2aW91cyA9IHRoaXMuX3N1YnNjcmlwdGlvbnM7XG5cbiAgLy8gSXRlcmF0ZSBvdmVyIHRoZSBuZXcgc3Vic2NyaXB0aW9ucyBvYmplY3QuIENoZWNrIGV2ZXJ5IGtleSBpbiB0aGUgb2JqZWN0XG4gIC8vIGFnYWluc3QgdGhlIHByZXZpb3VzIHN1YnNjcmlwdGlvbnMuIElmIGl0IGV4aXN0cyBpbiB0aGUgcHJldmlvdXMgb2JqZWN0LFxuICAvLyBpdCBtZWFucyB3ZSBhcmUgYWxyZWFkeSBzdWJzY3JpYmVkLiBPdGhlcndpc2Ugd2UgbmVlZCB0byBzdWJzY3JpYmUgdG9cbiAgLy8gdGhlIG5ldyBwcm9wZXJ0eS5cbiAgaXRlcmF0ZVN1YnNjcmlwdGlvbnMoY3VycmVudCwgZnVuY3Rpb24gKG9iamVjdCwgcHJvcGVydHksIGlkKSB7XG4gICAgaWYgKHByZXZpb3VzW2lkXSAmJiBwcmV2aW91c1tpZF1bcHJvcGVydHldKSB7XG4gICAgICByZXR1cm4gZGVsZXRlIHByZXZpb3VzW2lkXVtwcm9wZXJ0eV07XG4gICAgfVxuXG4gICAgdGhpcy5fY29udGFpbmVyLl9zdWJzY3JpYmUob2JqZWN0LCBwcm9wZXJ0eSwgdGhpcy5ib3VuZFVwZGF0ZSk7XG4gIH0sIHRoaXMpO1xuXG4gIC8vIEl0ZXJhdGUgb3ZlciBhbGwgcmVtYWluaW5nIHByZXZpb3VzIHN1YnNjcmlwdGlvbnMgYW5kIHVuc3Vic2NyaWJlIHRoZW0uXG4gIGRlbGV0ZSB0aGlzLl9zdWJzY3JpcHRpb25zO1xuICB0aGlzLl91bnN1YnNjcmliZShwcmV2aW91cyk7XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8qKlxuICogVXBkYXRlIHRoZSBzdXNiY3JpcHRpb24gaW5zdGFuY2Ugd2l0aCBjaGFuZ2VzLlxuICpcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKi9cblN1YnNjcmlwdGlvbi5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5fdHJpZ2dlcmVkIHx8IHRoaXMuX3Vuc3Vic2NyaWJlZCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHRoaXMuX3Vuc3Vic2NyaWJlQ2hpbGRyZW4oKTtcblxuICB0aGlzLl9leGVjSWQgPSBWTS5leGVjKFV0aWxzLmJpbmQoZnVuY3Rpb24gKCkge1xuICAgIGRlbGV0ZSB0aGlzLl90cmlnZ2VyZWQ7XG4gICAgdGhpcy5fdXBkYXRlKHRoaXMuZXhlY3V0ZSgpKTtcbiAgfSwgdGhpcykpO1xuXG4gIHJldHVybiB0aGlzLl90cmlnZ2VyZWQgPSB0cnVlO1xufTtcblxuLyoqXG4gKiBFeHRlbmQgdGhlIEhhbmRsZWJhcnMgcnVudGltZSBlbnZpcm9ubWVudCB3aXRoIERPTSBzcGVjaWZpYyBoZWxwZXJzLlxuICpcbiAqIEB0eXBlIHtPYmplY3R9XG4gKi9cbnZhciBWTSA9IG1vZHVsZS5leHBvcnRzID0gVXRpbHMuY3JlYXRlKGhic1ZNKTtcblxuLyoqXG4gKiBCaW5kIGEgZnVuY3Rpb24gdG8gdGhlIGFuaW1hdGlvbiBmcmFtZS5cbiAqXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge051bWJlcn1cbiAqL1xuVk0uZXhlYyA9IGZ1bmN0aW9uIChmbikge1xuICByZXR1cm4gcmFmKGZuKTtcbn07XG5cbi8qKlxuICogQ2FuY2VsIGFuIGV4ZWN1dGlvbi5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gaWRcbiAqL1xuVk0uZXhlYy5jYW5jZWwgPSBmdW5jdGlvbiAoaWQpIHtcbiAgcmV0dXJuIHJhZi5jYW5jZWwoaWQpO1xufTtcblxuLyoqXG4gKiBDcmVhdGUgYW4gZWxlbWVudCBmcm9tIGEgdGFnIG5hbWUuXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSB0YWdOYW1lXG4gKiBAcGFyYW0gIHtPYmplY3R9IGVudlxuICogQHJldHVybiB7Tm9kZX1cbiAqL1xuVk0uY3JlYXRlRWxlbWVudCA9IGZ1bmN0aW9uICh0YWdOYW1lKSB7XG4gIHJldHVybiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHRhZ05hbWUpO1xufTtcblxuLyoqXG4gKiBDb3B5IGFsbCB0aGUgZGF0YSBmcm9tIG9uZSBlbGVtZW50IHRvIGFub3RoZXIgYW5kIHJlcGxhY2UgaW4gcGxhY2UuXG4gKlxuICogQHBhcmFtICB7Tm9kZX0gICBub2RlXG4gKiBAcGFyYW0gIHtTdHJpbmd9IHRhZ05hbWVcbiAqIEBwYXJhbSAge09iamVjdH0gZW52XG4gKiBAcmV0dXJuIHtOb2RlfVxuICovXG5WTS5zZXRUYWdOYW1lID0gZnVuY3Rpb24gKG5vZGUsIHRhZ05hbWUpIHtcbiAgdmFyIG5ld05vZGUgPSBWTS5jcmVhdGVFbGVtZW50KHRhZ05hbWUpO1xuXG4gIC8vIE1vdmUgYWxsIGNoaWxkIGVsZW1lbnRzIHRvIHRoZSBuZXcgbm9kZS5cbiAgd2hpbGUgKG5vZGUuZmlyc3RDaGlsZCkge1xuICAgIG5ld05vZGUuYXBwZW5kQ2hpbGQobm9kZS5maXJzdENoaWxkKTtcbiAgfVxuXG4gIC8vIENvcHkgYWxsIHRoZSBhdHRyaWJ1dGVzIHRvIHRoZSBuZXcgbm9kZS5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2RlLmF0dHJpYnV0ZXMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgYXR0cmlidXRlID0gbm9kZS5hdHRyaWJ1dGVzW2ldO1xuICAgIG5ld05vZGUuc2V0QXR0cmlidXRlKGF0dHJpYnV0ZS5uYW1lLCBhdHRyaWJ1dGUudmFsdWUpO1xuICB9XG5cbiAgLy8gUmVwbGFjZSB0aGUgbm9kZSBwb3NpdGlvbiBpbiBwbGFjZS5cbiAgaWYgKG5vZGUucGFyZW50Tm9kZSkge1xuICAgIG5vZGUucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQobmV3Tm9kZSwgbm9kZSk7XG4gIH1cblxuICByZXR1cm4gbmV3Tm9kZTtcbn07XG5cbi8qKlxuICogUmVtb3ZlIGFuIGF0dHJpYnV0ZSBmcm9tIGFuIGVsZW1lbnQuXG4gKlxuICogQHBhcmFtIHtOb2RlfSAgIGVsXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICogQHBhcmFtIHtPYmplY3R9IGVudlxuICovXG5WTS5yZW1vdmVBdHRyaWJ1dGUgPSBmdW5jdGlvbiAoZWwsIG5hbWUpIHtcbiAgaWYgKCFlbC5oYXNBdHRyaWJ1dGUobmFtZSkpIHsgcmV0dXJuOyB9XG5cbiAgZWwucmVtb3ZlQXR0cmlidXRlKG5hbWUpO1xuXG4gIC8vIFVuc2V0IHRoZSBET00gcHJvcGVydHkgd2hlbiB0aGUgYXR0cmlidXRlIGlzIHJlbW92ZWQuXG4gIGlmIChBVFRSSUJVVEVfUFJPUFNbZWwudGFnTmFtZV0gJiYgQVRUUklCVVRFX1BST1BTW2VsLnRhZ05hbWVdW25hbWVdKSB7XG4gICAgZWxbQVRUUklCVVRFX1BST1BTW2VsLnRhZ05hbWVdW25hbWVdXSA9IG51bGw7XG4gIH1cbn07XG5cbi8qKlxuICogU2V0IGFuIGF0dHJpYnV0ZSB2YWx1ZSBvbiBhbiBlbGVtZW50LlxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gICBlbFxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAqIEBwYXJhbSB7Kn0gICAgICB2YWx1ZVxuICogQHBhcmFtIHtPYmplY3R9IGVudlxuICovXG5WTS5zZXRBdHRyaWJ1dGUgPSBmdW5jdGlvbiAoZWwsIG5hbWUsIHZhbHVlKSB7XG4gIGlmICh2YWx1ZSA9PT0gZmFsc2UpIHtcbiAgICByZXR1cm4gVk0ucmVtb3ZlQXR0cmlidXRlKGVsLCBuYW1lKTtcbiAgfVxuXG4gIC8vIFNldCB0aGUgYXR0cmlidXRlIHZhbHVlIHRvIHRoZSBuYW1lIHdoZW4gdGhlIHZhbHVlIGlzIGB0cnVlYC5cbiAgZWwuc2V0QXR0cmlidXRlKG5hbWUsIHZhbHVlID09PSB0cnVlID8gbmFtZSA6IHZhbHVlKTtcblxuICAvLyBVcGRhdGUgdGhlIERPTSBwcm9wZXJ0eSB3aGVuIHRoZSBhdHRyaWJ1dGUgY2hhbmdlcy5cbiAgaWYgKEFUVFJJQlVURV9QUk9QU1tlbC50YWdOYW1lXSAmJiBBVFRSSUJVVEVfUFJPUFNbZWwudGFnTmFtZV1bbmFtZV0pIHtcbiAgICBlbFtBVFRSSUJVVEVfUFJPUFNbZWwudGFnTmFtZV1bbmFtZV1dID0gdmFsdWU7XG4gIH1cbn07XG5cbi8qKlxuICogQ3JlYXRlIGEgY29tbWVudCBub2RlIGJhc2VkIG9uIHRleHQgY29udGVudHMuXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSBjb250ZW50c1xuICogQHBhcmFtICB7T2JqZWN0fSBlbnZcbiAqIEByZXR1cm4ge05vZGV9XG4gKi9cblZNLmNyZWF0ZUNvbW1lbnQgPSBmdW5jdGlvbiAoY29tbWVudCkge1xuICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlQ29tbWVudChjb21tZW50KTtcbn07XG5cbi8qKlxuICogU3Vic2NyaWJlciB0byBmdW5jdGlvbiBpbiB0aGUgRE9NQmFycyBleGVjdXRpb24gaW5zdGFuY2UuXG4gKlxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gY3JlYXRlXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gdXBkYXRlXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cbnZhciBzdWJzY3JpYmUgPSBmdW5jdGlvbiAoZm4sIGNyZWF0ZSwgdXBkYXRlKSB7XG4gIHZhciBzdWJzY3JpYmVyID0gbmV3IFN1YnNjcmlwdGlvbihmbiwgdXBkYXRlLCB0aGlzKTtcblxuICAvLyBJbW1lZGlhdGVseSBhbGlhcyB0aGUgc3RhcnRpbmcgdmFsdWUuXG4gIHN1YnNjcmliZXIudmFsdWUgPSBzdWJzY3JpYmVyLmV4ZWN1dGUoKTtcbiAgVXRpbHMuaXNGdW5jdGlvbihjcmVhdGUpICYmIChzdWJzY3JpYmVyLnZhbHVlID0gY3JlYXRlKHN1YnNjcmliZXIudmFsdWUpKTtcblxuICByZXR1cm4gc3Vic2NyaWJlcjtcbn07XG5cbi8qKlxuICogV3JhcCBhIGZ1bmN0aW9uIHdpdGggYSBzYW5pdGl6ZWQgcHVibGljIHN1YnNjcmliZXIgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7RnVuY3Rpb259XG4gKi9cbnZhciB3cmFwUHJvZ3JhbSA9IGZ1bmN0aW9uIChmbikge1xuICB2YXIgY29udGFpbmVyID0gdGhpcztcblxuICB2YXIgcHJvZ3JhbSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc3Vic2NyaWJlciA9IG5ldyBTdWJzY3JpcHRpb24oZm4sIG51bGwsIGNvbnRhaW5lcik7XG4gICAgcmV0dXJuIHN1YnNjcmliZXIuZXhlY3V0ZS5hcHBseShzdWJzY3JpYmVyLCBhcmd1bWVudHMpO1xuICB9O1xuXG4gIFV0aWxzLmV4dGVuZChwcm9ncmFtLCBmbik7XG5cbiAgcmV0dXJuIHByb2dyYW07XG59O1xuXG4vKipcbiAqIFJlbmRlciBhbmQgc3Vic2NyaWJlIGEgc2luZ2xlIERPTSBub2RlIHVzaW5nIGEgY3VzdG9tIGNyZWF0aW9uIGZ1bmN0aW9uLlxuICpcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICogQHBhcmFtICB7RnVuY3Rpb259IGNyZWF0ZVxuICogQHJldHVybiB7Tm9kZX1cbiAqL1xudmFyIHN1YnNjcmliZU5vZGUgPSBmdW5jdGlvbiAoZm4sIGNyZWF0ZSkge1xuICByZXR1cm4gc3Vic2NyaWJlLmNhbGwodGhpcywgZm4sIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHJldHVybiBVdGlscy50cmFja05vZGUoY3JlYXRlKHZhbHVlKSk7XG4gIH0sIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHRoaXMudmFsdWUucmVwbGFjZShjcmVhdGUodmFsdWUpKTtcbiAgfSkudmFsdWUuZnJhZ21lbnQ7XG59O1xuXG4vKipcbiAqIENyZWF0ZSBhbiBlbGVtZW50IGFuZCBzdWJzY3JpYmUgdG8gYW55IGNoYW5nZXMuIFRoaXMgbWV0aG9kIHJlcXVpcmVzIGFcbiAqIGNhbGxiYWNrIGZ1bmN0aW9uIGZvciBhbnkgZWxlbWVudCBjaGFuZ2VzIHNpbmNlIHlvdSBjYW4ndCBjaGFuZ2UgYSB0YWdcbiAqIG5hbWUgaW4gcGxhY2UuXG4gKlxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gY2JcbiAqIEByZXR1cm4ge0VsZW1lbnR9XG4gKi9cbnZhciBjcmVhdGVFbGVtZW50ID0gZnVuY3Rpb24gKGZuLCBjYikge1xuICByZXR1cm4gc3Vic2NyaWJlLmNhbGwodGhpcywgZm4sIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHJldHVybiBWTS5jcmVhdGVFbGVtZW50KHZhbHVlKTtcbiAgfSwgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgY2IodGhpcy52YWx1ZSA9IFZNLnNldFRhZ05hbWUodGhpcy52YWx1ZSwgdmFsdWUpKTtcbiAgfSkudmFsdWU7XG59O1xuXG4vKipcbiAqIEFwcGVuZCBhbiBlbGVtZW50IHRvIHRoZSBlbmQgb2YgYW5vdGhlciBlbGVtZW50LlxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gcGFyZW50XG4gKiBAcGFyYW0ge05vZGV9IGNoaWxkXG4gKi9cbnZhciBhcHBlbmRDaGlsZCA9IGZ1bmN0aW9uIChwYXJlbnQsIGNoaWxkKSB7XG4gIC8vIENhdGNoIGVycm9ycyB0aGF0IG9jY3VyIGZyb20gdHJ5aW5nIHRvIGFwcGVuZCBjb250ZW50IHRvIGEgdm9pZCBlbGVtZW50LlxuICB0cnkge1xuICAgIGNoaWxkICYmIHBhcmVudC5hcHBlbmRDaGlsZChjaGlsZCk7XG4gIH0gY2F0Y2ggKGUpIHt9XG59O1xuXG4vKipcbiAqIFNldCBhbiBlbGVtZW50cyBhdHRyaWJ1dGUuIFdlIGFjY2VwdCB0aGUgY3VycmVudCBlbGVtZW50IGEgZnVuY3Rpb25cbiAqIGJlY2F1c2Ugd2hlbiBhIHRhZyBuYW1lIGNoYW5nZXMgd2Ugd2lsbCBsb3NlIHJlZmVyZW5jZSB0byB0aGUgYWN0aXZlbHlcbiAqIHJlbmRlcmVkIGVsZW1lbnQuXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gY3VycmVudEVsXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBuYW1lRm5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IHZhbHVlRm5cbiAqL1xudmFyIHNldEF0dHJpYnV0ZSA9IGZ1bmN0aW9uIChjdXJyZW50RWwsIG5hbWVGbiwgdmFsdWVGbikge1xuICB2YXIgYXR0ck5hbWUgPSBzdWJzY3JpYmUuY2FsbCh0aGlzLCBuYW1lRm4sIG51bGwsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIFZNLnJlbW92ZUF0dHJpYnV0ZShjdXJyZW50RWwoKSwgdGhpcy52YWx1ZSk7XG4gICAgVk0uc2V0QXR0cmlidXRlKGN1cnJlbnRFbCgpLCB0aGlzLnZhbHVlID0gdmFsdWUsIGF0dHJWYWx1ZS52YWx1ZSk7XG4gIH0pO1xuXG4gIHZhciBhdHRyVmFsdWUgPSBzdWJzY3JpYmUuY2FsbCh0aGlzLCB2YWx1ZUZuLCBudWxsLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICBWTS5zZXRBdHRyaWJ1dGUoY3VycmVudEVsKCksIGF0dHJOYW1lLnZhbHVlLCB0aGlzLnZhbHVlID0gdmFsdWUpO1xuICB9KTtcblxuICByZXR1cm4gVk0uc2V0QXR0cmlidXRlKGN1cnJlbnRFbCgpLCBhdHRyTmFtZS52YWx1ZSwgYXR0clZhbHVlLnZhbHVlKTtcbn07XG5cbi8qKlxuICogQ3JlYXRlIGEgRE9NIGVsZW1lbnQgYW5kIHN1YnNjcmliZSB0byBhbnkgY2hhbmdlcy5cbiAqXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge05vZGV9XG4gKi9cbnZhciBjcmVhdGVET00gPSBmdW5jdGlvbiAoZm4pIHtcbiAgcmV0dXJuIHN1YnNjcmliZU5vZGUuY2FsbCh0aGlzLCBmbiwgVXRpbHMuZG9taWZ5RXhwcmVzc2lvbik7XG59O1xuXG4vKipcbiAqIENyZWF0ZSBhIHRleHQgbm9kZSBhbmQgc3Vic2NyaWJlIHRvIGFueSBjaGFuZ2VzLlxuICpcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7VGV4dH1cbiAqL1xudmFyIGNyZWF0ZVRleHQgPSBmdW5jdGlvbiAoZm4pIHtcbiAgcmV0dXJuIHN1YnNjcmliZU5vZGUuY2FsbCh0aGlzLCBmbiwgVXRpbHMudGV4dGlmeUV4cHJlc3Npb24pO1xufTtcblxuLyoqXG4gKiBDcmVhdGUgYSBjb21tZW50IG5vZGUgYW5kIHN1YnNjcmliZSB0byBhbnkgY2hhbmdlcy5cbiAqXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge0NvbW1lbnR9XG4gKi9cbnZhciBjcmVhdGVDb21tZW50ID0gZnVuY3Rpb24gKGZuKSB7XG4gIHJldHVybiBzdWJzY3JpYmUuY2FsbCh0aGlzLCBmbiwgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgcmV0dXJuIFZNLmNyZWF0ZUNvbW1lbnQodmFsdWUpO1xuICB9LCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICB0aGlzLnZhbHVlLnRleHRDb250ZW50ID0gdmFsdWU7XG4gIH0pLnZhbHVlO1xufTtcblxuLyoqXG4gKiBDcmVhdGUgYW5kIHJldHVybiBhIHByb2dyYW0gc2luZ2xldG9uIGJhc2VkIG9uIGluZGV4LlxuICpcbiAqIEBwYXJhbSAge051bWJlcn0gICBpXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAqIEBwYXJhbSAge09iamVjdH0gICBkYXRhXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqL1xudmFyIHByb2dyYW0gPSBmdW5jdGlvbiAoaSwgZm4sIGRhdGEpIHtcbiAgdmFyIHByb2dyYW1XcmFwcGVyID0gdGhpcy5wcm9ncmFtc1tpXTtcblxuICBpZiAoZGF0YSkge1xuICAgIHJldHVybiBWTS5wcm9ncmFtKGksIGZuLCBkYXRhKTtcbiAgfVxuXG4gIGlmICghcHJvZ3JhbVdyYXBwZXIpIHtcbiAgICByZXR1cm4gdGhpcy5wcm9ncmFtc1tpXSA9IFZNLnByb2dyYW0oaSwgZm4pO1xuICB9XG5cbiAgcmV0dXJuIHByb2dyYW1XcmFwcGVyO1xufTtcblxuLyoqXG4gKiBNZXJnZSB0d28gb2JqZWN0cyBpbnRvIGEgc2luZ2xlIG9iamVjdC5cbiAqXG4gKiBAcGFyYW0gIHtPYmplY3R9IHBhcmFtXG4gKiBAcGFyYW0gIHtPYmplY3R9IGNvbW1vblxuICogQHJldHVybiB7T2JqZWN0fVxuICovXG52YXIgbWVyZ2UgPSBmdW5jdGlvbiAocGFyYW0sIGNvbW1vbikge1xuICB2YXIgcmV0ID0gcGFyYW0gfHwgY29tbW9uO1xuXG4gIGlmIChwYXJhbSAmJiBjb21tb24gJiYgKHBhcmFtICE9PSBjb21tb24pKSB7XG4gICAgcmV0ID0ge307XG4gICAgVXRpbHMuZXh0ZW5kKHJldCwgY29tbW9uKTtcbiAgICBVdGlscy5leHRlbmQocmV0LCBwYXJhbSk7XG4gIH1cblxuICByZXR1cm4gcmV0O1xufTtcblxuLyoqXG4gKiBHZXQgYSBwcm9wZXJ0eSBmcm9tIGFuIG9iamVjdC4gUGFzc2VzIGluIHRoZSBvYmplY3QgaWQgKGRlcHRoKSB0byBtYWtlIGl0XG4gKiBtdWNoIGZhc3RlciB0byBkbyBjb21wYXJpc29ucyBiZXR3ZWVuIG5ldyBhbmQgb2xkIHN1YnNjcmlwdGlvbnMuXG4gKlxuICogQHBhcmFtICB7T2JqZWN0fSBvYmplY3RcbiAqIEBwYXJhbSAge1N0cmluZ30gcHJvcGVydHlcbiAqIEBwYXJhbSAge1N0cmluZ30gaWRcbiAqIEByZXR1cm4geyp9XG4gKi9cbnZhciBnZXQgPSBmdW5jdGlvbiAob2JqZWN0LCBwcm9wZXJ0eSwgaWQpIHtcbiAgdGhpcy5zdWJzY3JpcHRpb24uc3Vic2NyaWJlKG9iamVjdCwgcHJvcGVydHksIGlkKTtcbiAgcmV0dXJuIHRoaXMuX2dldChvYmplY3QsIHByb3BlcnR5KTtcbn07XG5cbi8qKlxuICogR2VuZXJhdGUgYW4gZXhlY3V0YWJsZSB0ZW1wbGF0ZSBmcm9tIGEgdGVtcGxhdGUgc3BlYy5cbiAqXG4gKiBAcGFyYW0gIHtPYmplY3R9ICAgdGVtcGxhdGVTcGVjXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqL1xuVk0udGVtcGxhdGUgPSBmdW5jdGlvbiAodGVtcGxhdGVTcGVjLCBlbnYpIHtcbiAgLyoqXG4gICAqIFRoZSBjb250YWluZXIgb2JqZWN0IGhvbGRzIGFsbCB0aGUgZnVuY3Rpb25zIHVzZWQgYnkgdGhlIHRlbXBsYXRlIHNwZWMuXG4gICAqXG4gICAqIEB0eXBlIHtPYmplY3R9XG4gICAqL1xuICB2YXIgY29udGFpbmVyID0ge1xuICAgIGludm9rZVBhcnRpYWw6ICAgIFZNLmludm9rZVBhcnRpYWwsXG4gICAgcHJvZ3JhbXM6ICAgICAgICAgW10sXG4gICAgbm9vcDogICAgICAgICAgICAgVk0ubm9vcCxcbiAgICBwYXJ0aWFsOiAgICAgICAgICBVdGlscy5wYXJ0aWFsLFxuICAgIHdyYXBQcm9ncmFtOiAgICAgIHdyYXBQcm9ncmFtLFxuICAgIGdldDogICAgICAgICAgICAgIGdldCxcbiAgICBtZXJnZTogICAgICAgICAgICBtZXJnZSxcbiAgICBwcm9ncmFtOiAgICAgICAgICBwcm9ncmFtLFxuICAgIGNyZWF0ZURPTTogICAgICAgIGNyZWF0ZURPTSxcbiAgICBjcmVhdGVUZXh0OiAgICAgICBjcmVhdGVUZXh0LFxuICAgIGNyZWF0ZUNvbW1lbnQ6ICAgIGNyZWF0ZUNvbW1lbnQsXG4gICAgY3JlYXRlRWxlbWVudDogICAgY3JlYXRlRWxlbWVudCxcbiAgICBhcHBlbmRDaGlsZDogICAgICBhcHBlbmRDaGlsZCxcbiAgICBzZXRBdHRyaWJ1dGU6ICAgICBzZXRBdHRyaWJ1dGUsXG4gICAgZXNjYXBlRXhwcmVzc2lvbjogVXRpbHMuZXNjYXBlRXhwcmVzc2lvbixcbiAgICBwcm9ncmFtV2l0aERlcHRoOiBWTS5wcm9ncmFtV2l0aERlcHRoXG4gIH07XG5cbiAgLyoqXG4gICAqIFJldHVybiB0aGUgY29tcGlsZWQgSmF2YVNjcmlwdCBmdW5jdGlvbiBmb3IgZXhlY3V0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGNvbnRleHRcbiAgICogQHBhcmFtICB7T2JqZWN0fSBvcHRpb25zXG4gICAqIEByZXR1cm4ge05vZGV9XG4gICAqL1xuICByZXR1cm4gZnVuY3Rpb24gKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgIHZhciBuYW1lc3BhY2UgPSBvcHRpb25zLnBhcnRpYWwgPyBvcHRpb25zIDogZW52O1xuICAgIHZhciBoZWxwZXJzLCBwYXJ0aWFscztcblxuICAgIGlmICghb3B0aW9ucy5wYXJ0aWFsKSB7XG4gICAgICBoZWxwZXJzICA9IG9wdGlvbnMuaGVscGVycztcbiAgICAgIHBhcnRpYWxzID0gb3B0aW9ucy5wYXJ0aWFscztcbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgYSBjdXN0b20gY29udGFpbmVyIGZvciBlYWNoIGV4ZWN1dGlvbi5cbiAgICB2YXIgY29udGFpbm1lbnQgPSB7fTtcblxuICAgIC8vIEFsbG93cyBjdXN0b20gc3Vic2NyaXB0aW9uIG9wdGlvbnMgdG8gYmUgcGFzc2VkIHRocm91Z2ggZWFjaCB0aW1lLlxuICAgIFV0aWxzLmV4dGVuZChjb250YWlubWVudCwgY29udGFpbmVyKTtcbiAgICBjb250YWlubWVudC5fZ2V0ICAgICAgICAgPSBvcHRpb25zLmdldCAgICAgICAgIHx8IGVudi5nZXQ7XG4gICAgY29udGFpbm1lbnQuX3N1YnNjcmliZSAgID0gb3B0aW9ucy5zdWJzY3JpYmUgICB8fCBlbnYuc3Vic2NyaWJlO1xuICAgIGNvbnRhaW5tZW50Ll91bnN1YnNjcmliZSA9IG9wdGlvbnMudW5zdWJzY3JpYmUgfHwgZW52LnVuc3Vic2NyaWJlO1xuXG4gICAgdmFyIHJlc3VsdCA9IHdyYXBQcm9ncmFtLmNhbGwoY29udGFpbm1lbnQsIHRlbXBsYXRlU3BlYykuY2FsbChcbiAgICAgIGNvbnRhaW5tZW50LFxuICAgICAgbmFtZXNwYWNlLFxuICAgICAgY29udGV4dCxcbiAgICAgIGhlbHBlcnMsXG4gICAgICBwYXJ0aWFscyxcbiAgICAgIG9wdGlvbnMuZGF0YVxuICAgICk7XG5cbiAgICBpZiAoIW9wdGlvbnMucGFydGlhbCkge1xuICAgICAgZW52LlZNLmNoZWNrUmV2aXNpb24oY29udGFpbm1lbnQuY29tcGlsZXJJbmZvKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcbiAgJ2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9zYWZlLXN0cmluZydcbilbJ2RlZmF1bHQnXTtcbiIsInZhciBUcmFja05vZGUgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChub2RlKSB7XG4gIHRoaXMuZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG5cbiAgLy8gSW5zdGFudGx5IGFwcGVuZCBhIGJlZm9yZSBhbmQgYWZ0ZXIgdHJhY2tpbmcgbm9kZS5cbiAgdGhpcy5iZWZvcmUgPSB0aGlzLmZyYWdtZW50LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKSk7XG4gIHRoaXMuYWZ0ZXIgID0gdGhpcy5mcmFnbWVudC5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJykpO1xuXG4gIC8vIEFwcGVuZCB0aGUgcGFzc2VkIGluIG5vZGUgdG8gdGhlIGN1cnJlbnQgZnJhZ21lbnQuXG4gIG5vZGUgJiYgdGhpcy5hcHBlbmRDaGlsZChub2RlKTtcbn07XG5cbi8qKlxuICogQXBwZW5kIGEgbm9kZSB0byB0aGUgY3VycmVudCB0cmFja2luZyBmcmFnbWVudC5cbiAqXG4gKiBAcGFyYW0gIHtOb2RlfSBub2RlXG4gKiBAcmV0dXJuIHt0aGlzfVxuICovXG5UcmFja05vZGUucHJvdG90eXBlLmFwcGVuZENoaWxkID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgdGhpcy5hZnRlci5wYXJlbnROb2RlICYmIHRoaXMuYWZ0ZXIucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUobm9kZSwgdGhpcy5hZnRlcik7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFByZXBlbmQgYSBub2RlIHRvIHRoZSBjdXJyZW50IHRyYWNraW5nIGZyYWdtZW50LlxuICpcbiAqIEBwYXJhbSAge05vZGV9IG5vZGVcbiAqIEByZXR1cm4ge3RoaXN9XG4gKi9cblRyYWNrTm9kZS5wcm90b3R5cGUucHJlcGVuZENoaWxkID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgdGhpcy5iZWZvcmUucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUobm9kZSwgdGhpcy5iZWZvcmUubmV4dFNpYmxpbmcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgYWxsIGVsZW1lbnRzIGJldHdlZW4gdGhlIHR3byB0cmFja2luZyBub2Rlcy5cbiAqXG4gKiBAcGFyYW0gIHtOb2RlfSBub2RlXG4gKiBAcmV0dXJuIHt0aGlzfVxuICovXG5UcmFja05vZGUucHJvdG90eXBlLmVtcHR5ID0gZnVuY3Rpb24gKCkge1xuICB3aGlsZSAodGhpcy5iZWZvcmUubmV4dFNpYmxpbmcgJiYgdGhpcy5iZWZvcmUubmV4dFNpYmxpbmcgIT09IHRoaXMuYWZ0ZXIpIHtcbiAgICB0aGlzLmJlZm9yZS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMuYmVmb3JlLm5leHRTaWJsaW5nKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgdGhlIHRoZSBlbGVtZW50cyBmcm9tIHRoZSBET00uXG4gKlxuICogQHBhcmFtICB7Tm9kZX0gbm9kZVxuICogQHJldHVybiB7dGhpc31cbiAqL1xuVHJhY2tOb2RlLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAoKSB7XG4gIHdoaWxlICh0aGlzLmJlZm9yZS5uZXh0U2libGluZyAmJiB0aGlzLmJlZm9yZS5uZXh0U2libGluZyAhPT0gdGhpcy5hZnRlcikge1xuICAgIHRoaXMuZnJhZ21lbnQuYXBwZW5kQ2hpbGQodGhpcy5iZWZvcmUubmV4dFNpYmxpbmcpO1xuICB9XG5cbiAgLy8gUHVsbCB0aGUgdHdvIHJlZmVyZW5jZSBub2RlcyBvdXQgb2YgdGhlIERPTSBhbmQgaW50byB0aGUgZnJhZ21lbnQuXG4gIHRoaXMuZnJhZ21lbnQuYXBwZW5kQ2hpbGQodGhpcy5hZnRlcik7XG4gIHRoaXMuZnJhZ21lbnQuaW5zZXJ0QmVmb3JlKHRoaXMuYmVmb3JlLCB0aGlzLmZyYWdtZW50LmZpcnN0Q2hpbGQpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZXBsYWNlIHRoZSBjb250ZW50cyBvZiB0aGUgdHJhY2tpbmcgbm9kZSB3aXRoIG5ldyBjb250ZW50cy5cbiAqXG4gKiBAcGFyYW0gIHtOb2RlfSBub2RlXG4gKiBAcmV0dXJuIHt0aGlzfVxuICovXG5UcmFja05vZGUucHJvdG90eXBlLnJlcGxhY2UgPSBmdW5jdGlvbiAobm9kZSkge1xuICByZXR1cm4gdGhpcy5lbXB0eSgpLmFwcGVuZENoaWxkKG5vZGUpO1xufTtcbiIsInZhciBoYnNVdGlscyAgID0gcmVxdWlyZSgnaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL3V0aWxzJyk7XG52YXIgdW5pcXVlSWQgICA9IDA7XG52YXIgVHJhY2tOb2RlICA9IHJlcXVpcmUoJy4vdHJhY2stbm9kZScpO1xudmFyIFNhZmVTdHJpbmcgPSByZXF1aXJlKCcuL3NhZmUtc3RyaW5nJyk7XG52YXIgX19zbGljZSAgICA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcblxuLyoqXG4gKiBTaW1wbGUgd2F5IHRvIHN1YmNsYXNzIGFuIG9iamVjdCwgd2l0aCBzdXBwb3J0IGZvciBvbGRlciBicm93c2Vycy5cbiAqXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cbnZhciBjcmVhdGUgPSBPYmplY3QuY3JlYXRlIHx8IChmdW5jdGlvbiAoKSB7XG4gIHZhciBGID0gZnVuY3Rpb24gKCkge307XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIChvKSB7XG4gICAgRi5wcm90b3R5cGUgPSBvO1xuICAgIHZhciBvYmogPSBuZXcgRigpO1xuICAgIEYucHJvdG90eXBlID0gbnVsbDtcbiAgICByZXR1cm4gb2JqO1xuICB9O1xufSkoKTtcblxuLyoqXG4gKiBFeHRlbmQgSGFuZGxlYmFycyB1dGlsaXRpZXMgd2l0aCBET00gZnVuY3Rpb25hbGl0eS5cbiAqXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG52YXIgVXRpbHMgPSBtb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZShoYnNVdGlscyk7XG5cbi8qKlxuICogUmV0dXJuIGEgdW5pcXVlIGlkLlxuICpcbiAqIEByZXR1cm4ge051bWJlcn1cbiAqL1xuVXRpbHMudW5pcXVlSWQgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB1bmlxdWVJZCsrO1xufTtcblxuLyoqXG4gKiBDcmVhdGUgYSBmdW5jdGlvbiB0aGF0IGFjY2VwdHMgYW4gdW5saW1pdGVkIG51bWJlciBvZiBhcmd1bWVudHMgYXMgdGhlIGxhc3RcbiAqIGFyZ3VtZW50LlxuICpcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7RnVuY3Rpb259XG4gKi9cblV0aWxzLnZhcmlhZGljID0gZnVuY3Rpb24gKGZuKSB7XG4gIHZhciBjb3VudCA9IE1hdGgubWF4KGZuLmxlbmd0aCAtIDEsIDApO1xuXG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGFyZ3MgPSBfX3NsaWNlLmNhbGwoYXJndW1lbnRzLCAwLCBjb3VudCk7XG5cbiAgICAvLyBFbmZvcmNlIHRoZSBhcnJheSBsZW5ndGgsIGluIGNhc2Ugd2UgZGlkbid0IGhhdmUgZW5vdWdoIGFyZ3VtZW50cy5cbiAgICBhcmdzLmxlbmd0aCA9IGNvdW50O1xuICAgIGFyZ3MucHVzaChfX3NsaWNlLmNhbGwoYXJndW1lbnRzLCBjb3VudCkpO1xuXG4gICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9O1xufTtcblxuLyoqXG4gKiBTaW1wbGUgcGFydGlhbCBhcHBsaWNhdGlvbiBmdW5jdGlvbi5cbiAqXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAqIEBwYXJhbSAgeyp9ICAgICAgICAuLi5cbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICovXG5VdGlscy5wYXJ0aWFsID0gVXRpbHMudmFyaWFkaWMoZnVuY3Rpb24gKGZuLCBhcmdzKSB7XG4gIHJldHVybiBVdGlscy52YXJpYWRpYyhmdW5jdGlvbiAoY2FsbGVkKSB7XG4gICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3MuY29uY2F0KGNhbGxlZCkpO1xuICB9KTtcbn0pO1xuXG4vKipcbiAqIEJpbmQgYSBmdW5jdGlvbiB0byBhIGNlcnRhaW4gY29udGV4dC5cbiAqXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAqIEBwYXJhbSAge09iamVjdH0gICBjb250ZXh0XG4gKiBAcGFyYW0gIHsqfSAgICAgICAgLi4uXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqL1xuVXRpbHMuYmluZCA9IFV0aWxzLnZhcmlhZGljKGZ1bmN0aW9uIChmbiwgY29udGV4dCwgYXJncykge1xuICByZXR1cm4gVXRpbHMudmFyaWFkaWMoZnVuY3Rpb24gKGNhbGxlZCkge1xuICAgIHJldHVybiBmbi5hcHBseShjb250ZXh0LCBhcmdzLmNvbmNhdChjYWxsZWQpKTtcbiAgfSk7XG59KTtcblxuLyoqXG4gKiBFeHBvc2UgdGhlIGNyZWF0ZSBmdW5jdGlvbi5cbiAqXG4gKiBAdHlwZSB7RnVuY3Rpb259XG4gKi9cblV0aWxzLmNyZWF0ZSA9IGNyZWF0ZTtcblxuLyoqXG4gKiBDaGVjayB3aGV0aGVyIGFuIG9iamVjdCBpcyBhY3R1YWxseSBhIERPTSBub2RlLlxuICpcbiAqIEBwYXJhbSAgeyp9ICAgICAgIG9cbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKi9cblV0aWxzLmlzTm9kZSA9IGZ1bmN0aW9uIChvKSB7XG4gIHJldHVybiB0eXBlb2YgbyA9PT0gJ29iamVjdCcgJiYgby5vd25lckRvY3VtZW50ID09PSB3aW5kb3cuZG9jdW1lbnQ7XG59O1xuXG4vKipcbiAqIFRyYWNrIGEgbm9kZSBpbnN0YW5jZSBhbnl3aGVyZSBpdCBnb2VzIGluIHRoZSBET00uXG4gKlxuICogQHBhcmFtICB7Tm9kZX0gICAgICBub2RlXG4gKiBAcmV0dXJuIHtUcmFja05vZGV9XG4gKi9cblV0aWxzLnRyYWNrTm9kZSA9IGZ1bmN0aW9uIChub2RlKSB7XG4gIHJldHVybiBuZXcgVHJhY2tOb2RlKG5vZGUpO1xufTtcblxuLyoqXG4gKiBUcmFuc2Zvcm0gYSBzdHJpbmcgaW50byBhcmJpdHJhcnkgRE9NIG5vZGVzLlxuICpcbiAqIEBwYXJhbSAge1N0cmluZ30gc3RyaW5nXG4gKiBAcmV0dXJuIHtOb2RlfVxuICovXG5VdGlscy5kb21pZnlFeHByZXNzaW9uID0gZnVuY3Rpb24gKHN0cmluZykge1xuICAvLyBJZiB3ZSBwYXNzZWQgaW4gYSBzYWZlIHN0cmluZywgZ2V0IHRoZSBhY3R1YWwgdmFsdWUuXG4gIGlmIChzdHJpbmcgaW5zdGFuY2VvZiBTYWZlU3RyaW5nKSB7XG4gICAgc3RyaW5nID0gc3RyaW5nLnN0cmluZztcbiAgfVxuXG4gIC8vIE5vIG5lZWQgdG8gY29lcmNlIGEgbm9kZS5cbiAgaWYgKFV0aWxzLmlzTm9kZShzdHJpbmcpKSB7XG4gICAgcmV0dXJuIHN0cmluZztcbiAgfVxuXG4gIHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgZGl2LmlubmVySFRNTCA9IHN0cmluZztcblxuICBpZiAoZGl2LmNoaWxkTm9kZXMubGVuZ3RoID09PSAxKSB7XG4gICAgcmV0dXJuIGRpdi5yZW1vdmVDaGlsZChkaXYuY2hpbGROb2Rlc1swXSk7XG4gIH1cblxuICB2YXIgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG5cbiAgd2hpbGUgKGRpdi5maXJzdENoaWxkKSB7XG4gICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQoZGl2LmZpcnN0Q2hpbGQpO1xuICB9XG5cbiAgcmV0dXJuIGZyYWdtZW50O1xufTtcblxuLyoqXG4gKiBUcmFuc2Zvcm0gYSBzdHJpbmcgaW50byBhIERPTSB0ZXh0IG5vZGUgZm9yIGFwcGVuZGluZyB0byB0aGUgdGVtcGxhdGUuXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSBzdHJpbmdcbiAqIEByZXR1cm4ge1RleHR9XG4gKi9cblV0aWxzLnRleHRpZnlFeHByZXNzaW9uID0gZnVuY3Rpb24gKHN0cmluZykge1xuICBpZiAoc3RyaW5nIGluc3RhbmNlb2YgU2FmZVN0cmluZykge1xuICAgIHJldHVybiBVdGlscy5kb21pZnlFeHByZXNzaW9uKHN0cmluZy5zdHJpbmcpO1xuICB9XG5cbiAgLy8gQ2F0Y2ggd2hlbiB0aGUgc3RyaW5nIGlzIGFjdHVhbGx5IGEgRE9NIG5vZGUgYW5kIHR1cm4gaXQgaW50byBhIHN0cmluZy5cbiAgaWYgKFV0aWxzLmlzTm9kZShzdHJpbmcpKSB7XG4gICAgLy8gQWxyZWFkeSBhIHRleHQgbm9kZSwganVzdCByZXR1cm4gaXQgaW1tZWRpYXRlbHkuXG4gICAgaWYgKHN0cmluZy5ub2RlVHlwZSA9PT0gMykge1xuICAgICAgcmV0dXJuIHN0cmluZztcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHN0cmluZy5vdXRlckhUTUwgPT09ICdzdHJpbmcnKSB7XG4gICAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoc3RyaW5nLm91dGVySFRNTCk7XG4gICAgfVxuXG4gICAgdmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGRpdi5hcHBlbmRDaGlsZChzdHJpbmcuY2xvbmVOb2RlKHRydWUpKTtcbiAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoZGl2LmlubmVySFRNTCk7XG4gIH1cblxuICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoc3RyaW5nID09IG51bGwgPyAnJyA6IHN0cmluZyk7XG59O1xuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgdGhpcy5fZXZlbnRzID0gdGhpcy5fZXZlbnRzIHx8IHt9O1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG5FdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gIGlmICghaXNOdW1iZXIobikgfHwgbiA8IDAgfHwgaXNOYU4obikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCduIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBlciwgaGFuZGxlciwgbGVuLCBhcmdzLCBpLCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xuICAgIGlmICghdGhpcy5fZXZlbnRzLmVycm9yIHx8XG4gICAgICAgIChpc09iamVjdCh0aGlzLl9ldmVudHMuZXJyb3IpICYmICF0aGlzLl9ldmVudHMuZXJyb3IubGVuZ3RoKSkge1xuICAgICAgZXIgPSBhcmd1bWVudHNbMV07XG4gICAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBlcjsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IFR5cGVFcnJvcignVW5jYXVnaHQsIHVuc3BlY2lmaWVkIFwiZXJyb3JcIiBldmVudC4nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc1VuZGVmaW5lZChoYW5kbGVyKSlcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIC8vIGZhc3QgY2FzZXNcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc09iamVjdChoYW5kbGVyKSkge1xuICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcblxuICAgIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBtO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gIGlmICh0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgICAgIGlzRnVuY3Rpb24obGlzdGVuZXIubGlzdGVuZXIpID9cbiAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIGVsc2UgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZVxuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcblxuICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSAmJiAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuICAgIHZhciBtO1xuICAgIGlmICghaXNVbmRlZmluZWQodGhpcy5fbWF4TGlzdGVuZXJzKSkge1xuICAgICAgbSA9IHRoaXMuX21heExpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cblxuICAgIGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICB2YXIgZmlyZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBnKCkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG5cbiAgICBpZiAoIWZpcmVkKSB7XG4gICAgICBmaXJlZCA9IHRydWU7XG4gICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIGcubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgdGhpcy5vbih0eXBlLCBnKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZmYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGxpc3QsIHBvc2l0aW9uLCBsZW5ndGgsIGk7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgbGVuZ3RoID0gbGlzdC5sZW5ndGg7XG4gIHBvc2l0aW9uID0gLTE7XG5cbiAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAoaXNGdW5jdGlvbihsaXN0Lmxpc3RlbmVyKSAmJiBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gIH0gZWxzZSBpZiAoaXNPYmplY3QobGlzdCkpIHtcbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSA+IDA7KSB7XG4gICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAobGlzdFtpXS5saXN0ZW5lciAmJiBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpc3Quc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBrZXksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gIGlmICghdGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgZm9yIChrZXkgaW4gdGhpcy5fZXZlbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGxpc3RlbmVycykpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gTElGTyBvcmRlclxuICAgIHdoaWxlIChsaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbbGlzdGVuZXJzLmxlbmd0aCAtIDFdKTtcbiAgfVxuICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gW107XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24odGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgZWxzZVxuICAgIHJldCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5zbGljZSgpO1xuICByZXR1cm4gcmV0O1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghZW1pdHRlci5fZXZlbnRzIHx8ICFlbWl0dGVyLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gMDtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbihlbWl0dGVyLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IDE7XG4gIGVsc2VcbiAgICByZXQgPSBlbWl0dGVyLl9ldmVudHNbdHlwZV0ubGVuZ3RoO1xuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuIiwiaWYgKHR5cGVvZiBPYmplY3QuY3JlYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gIC8vIGltcGxlbWVudGF0aW9uIGZyb20gc3RhbmRhcmQgbm9kZS5qcyAndXRpbCcgbW9kdWxlXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICBjdG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDdG9yLnByb3RvdHlwZSwge1xuICAgICAgY29uc3RydWN0b3I6IHtcbiAgICAgICAgdmFsdWU6IGN0b3IsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICB9XG4gICAgfSk7XG4gIH07XG59IGVsc2Uge1xuICAvLyBvbGQgc2Nob29sIHNoaW0gZm9yIG9sZCBicm93c2Vyc1xuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgdmFyIFRlbXBDdG9yID0gZnVuY3Rpb24gKCkge31cbiAgICBUZW1wQ3Rvci5wcm90b3R5cGUgPSBzdXBlckN0b3IucHJvdG90eXBlXG4gICAgY3Rvci5wcm90b3R5cGUgPSBuZXcgVGVtcEN0b3IoKVxuICAgIGN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY3RvclxuICB9XG59XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHZhciBxdWV1ZSA9IFtdO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGV2LnNvdXJjZTtcbiAgICAgICAgICAgIGlmICgoc291cmNlID09PSB3aW5kb3cgfHwgc291cmNlID09PSBudWxsKSAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufVxuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGlzQnVmZmVyKGFyZykge1xuICByZXR1cm4gYXJnICYmIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnXG4gICAgJiYgdHlwZW9mIGFyZy5jb3B5ID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5maWxsID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5yZWFkVUludDggPT09ICdmdW5jdGlvbic7XG59IiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCl7XG4vLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxudmFyIGZvcm1hdFJlZ0V4cCA9IC8lW3NkaiVdL2c7XG5leHBvcnRzLmZvcm1hdCA9IGZ1bmN0aW9uKGYpIHtcbiAgaWYgKCFpc1N0cmluZyhmKSkge1xuICAgIHZhciBvYmplY3RzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIG9iamVjdHMucHVzaChpbnNwZWN0KGFyZ3VtZW50c1tpXSkpO1xuICAgIH1cbiAgICByZXR1cm4gb2JqZWN0cy5qb2luKCcgJyk7XG4gIH1cblxuICB2YXIgaSA9IDE7XG4gIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICB2YXIgbGVuID0gYXJncy5sZW5ndGg7XG4gIHZhciBzdHIgPSBTdHJpbmcoZikucmVwbGFjZShmb3JtYXRSZWdFeHAsIGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoeCA9PT0gJyUlJykgcmV0dXJuICclJztcbiAgICBpZiAoaSA+PSBsZW4pIHJldHVybiB4O1xuICAgIHN3aXRjaCAoeCkge1xuICAgICAgY2FzZSAnJXMnOiByZXR1cm4gU3RyaW5nKGFyZ3NbaSsrXSk7XG4gICAgICBjYXNlICclZCc6IHJldHVybiBOdW1iZXIoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVqJzpcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoYXJnc1tpKytdKTtcbiAgICAgICAgfSBjYXRjaCAoXykge1xuICAgICAgICAgIHJldHVybiAnW0NpcmN1bGFyXSc7XG4gICAgICAgIH1cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiB4O1xuICAgIH1cbiAgfSk7XG4gIGZvciAodmFyIHggPSBhcmdzW2ldOyBpIDwgbGVuOyB4ID0gYXJnc1srK2ldKSB7XG4gICAgaWYgKGlzTnVsbCh4KSB8fCAhaXNPYmplY3QoeCkpIHtcbiAgICAgIHN0ciArPSAnICcgKyB4O1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgKz0gJyAnICsgaW5zcGVjdCh4KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHN0cjtcbn07XG5cblxuLy8gTWFyayB0aGF0IGEgbWV0aG9kIHNob3VsZCBub3QgYmUgdXNlZC5cbi8vIFJldHVybnMgYSBtb2RpZmllZCBmdW5jdGlvbiB3aGljaCB3YXJucyBvbmNlIGJ5IGRlZmF1bHQuXG4vLyBJZiAtLW5vLWRlcHJlY2F0aW9uIGlzIHNldCwgdGhlbiBpdCBpcyBhIG5vLW9wLlxuZXhwb3J0cy5kZXByZWNhdGUgPSBmdW5jdGlvbihmbiwgbXNnKSB7XG4gIC8vIEFsbG93IGZvciBkZXByZWNhdGluZyB0aGluZ3MgaW4gdGhlIHByb2Nlc3Mgb2Ygc3RhcnRpbmcgdXAuXG4gIGlmIChpc1VuZGVmaW5lZChnbG9iYWwucHJvY2VzcykpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZXhwb3J0cy5kZXByZWNhdGUoZm4sIG1zZykuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9XG5cbiAgaWYgKHByb2Nlc3Mubm9EZXByZWNhdGlvbiA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiBmbjtcbiAgfVxuXG4gIHZhciB3YXJuZWQgPSBmYWxzZTtcbiAgZnVuY3Rpb24gZGVwcmVjYXRlZCgpIHtcbiAgICBpZiAoIXdhcm5lZCkge1xuICAgICAgaWYgKHByb2Nlc3MudGhyb3dEZXByZWNhdGlvbikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobXNnKTtcbiAgICAgIH0gZWxzZSBpZiAocHJvY2Vzcy50cmFjZURlcHJlY2F0aW9uKSB7XG4gICAgICAgIGNvbnNvbGUudHJhY2UobXNnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IobXNnKTtcbiAgICAgIH1cbiAgICAgIHdhcm5lZCA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9XG5cbiAgcmV0dXJuIGRlcHJlY2F0ZWQ7XG59O1xuXG5cbnZhciBkZWJ1Z3MgPSB7fTtcbnZhciBkZWJ1Z0Vudmlyb247XG5leHBvcnRzLmRlYnVnbG9nID0gZnVuY3Rpb24oc2V0KSB7XG4gIGlmIChpc1VuZGVmaW5lZChkZWJ1Z0Vudmlyb24pKVxuICAgIGRlYnVnRW52aXJvbiA9IHByb2Nlc3MuZW52Lk5PREVfREVCVUcgfHwgJyc7XG4gIHNldCA9IHNldC50b1VwcGVyQ2FzZSgpO1xuICBpZiAoIWRlYnVnc1tzZXRdKSB7XG4gICAgaWYgKG5ldyBSZWdFeHAoJ1xcXFxiJyArIHNldCArICdcXFxcYicsICdpJykudGVzdChkZWJ1Z0Vudmlyb24pKSB7XG4gICAgICB2YXIgcGlkID0gcHJvY2Vzcy5waWQ7XG4gICAgICBkZWJ1Z3Nbc2V0XSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbXNnID0gZXhwb3J0cy5mb3JtYXQuYXBwbHkoZXhwb3J0cywgYXJndW1lbnRzKTtcbiAgICAgICAgY29uc29sZS5lcnJvcignJXMgJWQ6ICVzJywgc2V0LCBwaWQsIG1zZyk7XG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBkZWJ1Z3Nbc2V0XSA9IGZ1bmN0aW9uKCkge307XG4gICAgfVxuICB9XG4gIHJldHVybiBkZWJ1Z3Nbc2V0XTtcbn07XG5cblxuLyoqXG4gKiBFY2hvcyB0aGUgdmFsdWUgb2YgYSB2YWx1ZS4gVHJ5cyB0byBwcmludCB0aGUgdmFsdWUgb3V0XG4gKiBpbiB0aGUgYmVzdCB3YXkgcG9zc2libGUgZ2l2ZW4gdGhlIGRpZmZlcmVudCB0eXBlcy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIFRoZSBvYmplY3QgdG8gcHJpbnQgb3V0LlxuICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgb3B0aW9ucyBvYmplY3QgdGhhdCBhbHRlcnMgdGhlIG91dHB1dC5cbiAqL1xuLyogbGVnYWN5OiBvYmosIHNob3dIaWRkZW4sIGRlcHRoLCBjb2xvcnMqL1xuZnVuY3Rpb24gaW5zcGVjdChvYmosIG9wdHMpIHtcbiAgLy8gZGVmYXVsdCBvcHRpb25zXG4gIHZhciBjdHggPSB7XG4gICAgc2VlbjogW10sXG4gICAgc3R5bGl6ZTogc3R5bGl6ZU5vQ29sb3JcbiAgfTtcbiAgLy8gbGVnYWN5Li4uXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDMpIGN0eC5kZXB0aCA9IGFyZ3VtZW50c1syXTtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gNCkgY3R4LmNvbG9ycyA9IGFyZ3VtZW50c1szXTtcbiAgaWYgKGlzQm9vbGVhbihvcHRzKSkge1xuICAgIC8vIGxlZ2FjeS4uLlxuICAgIGN0eC5zaG93SGlkZGVuID0gb3B0cztcbiAgfSBlbHNlIGlmIChvcHRzKSB7XG4gICAgLy8gZ290IGFuIFwib3B0aW9uc1wiIG9iamVjdFxuICAgIGV4cG9ydHMuX2V4dGVuZChjdHgsIG9wdHMpO1xuICB9XG4gIC8vIHNldCBkZWZhdWx0IG9wdGlvbnNcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5zaG93SGlkZGVuKSkgY3R4LnNob3dIaWRkZW4gPSBmYWxzZTtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5kZXB0aCkpIGN0eC5kZXB0aCA9IDI7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguY29sb3JzKSkgY3R4LmNvbG9ycyA9IGZhbHNlO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmN1c3RvbUluc3BlY3QpKSBjdHguY3VzdG9tSW5zcGVjdCA9IHRydWU7XG4gIGlmIChjdHguY29sb3JzKSBjdHguc3R5bGl6ZSA9IHN0eWxpemVXaXRoQ29sb3I7XG4gIHJldHVybiBmb3JtYXRWYWx1ZShjdHgsIG9iaiwgY3R4LmRlcHRoKTtcbn1cbmV4cG9ydHMuaW5zcGVjdCA9IGluc3BlY3Q7XG5cblxuLy8gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9BTlNJX2VzY2FwZV9jb2RlI2dyYXBoaWNzXG5pbnNwZWN0LmNvbG9ycyA9IHtcbiAgJ2JvbGQnIDogWzEsIDIyXSxcbiAgJ2l0YWxpYycgOiBbMywgMjNdLFxuICAndW5kZXJsaW5lJyA6IFs0LCAyNF0sXG4gICdpbnZlcnNlJyA6IFs3LCAyN10sXG4gICd3aGl0ZScgOiBbMzcsIDM5XSxcbiAgJ2dyZXknIDogWzkwLCAzOV0sXG4gICdibGFjaycgOiBbMzAsIDM5XSxcbiAgJ2JsdWUnIDogWzM0LCAzOV0sXG4gICdjeWFuJyA6IFszNiwgMzldLFxuICAnZ3JlZW4nIDogWzMyLCAzOV0sXG4gICdtYWdlbnRhJyA6IFszNSwgMzldLFxuICAncmVkJyA6IFszMSwgMzldLFxuICAneWVsbG93JyA6IFszMywgMzldXG59O1xuXG4vLyBEb24ndCB1c2UgJ2JsdWUnIG5vdCB2aXNpYmxlIG9uIGNtZC5leGVcbmluc3BlY3Quc3R5bGVzID0ge1xuICAnc3BlY2lhbCc6ICdjeWFuJyxcbiAgJ251bWJlcic6ICd5ZWxsb3cnLFxuICAnYm9vbGVhbic6ICd5ZWxsb3cnLFxuICAndW5kZWZpbmVkJzogJ2dyZXknLFxuICAnbnVsbCc6ICdib2xkJyxcbiAgJ3N0cmluZyc6ICdncmVlbicsXG4gICdkYXRlJzogJ21hZ2VudGEnLFxuICAvLyBcIm5hbWVcIjogaW50ZW50aW9uYWxseSBub3Qgc3R5bGluZ1xuICAncmVnZXhwJzogJ3JlZCdcbn07XG5cblxuZnVuY3Rpb24gc3R5bGl6ZVdpdGhDb2xvcihzdHIsIHN0eWxlVHlwZSkge1xuICB2YXIgc3R5bGUgPSBpbnNwZWN0LnN0eWxlc1tzdHlsZVR5cGVdO1xuXG4gIGlmIChzdHlsZSkge1xuICAgIHJldHVybiAnXFx1MDAxYlsnICsgaW5zcGVjdC5jb2xvcnNbc3R5bGVdWzBdICsgJ20nICsgc3RyICtcbiAgICAgICAgICAgJ1xcdTAwMWJbJyArIGluc3BlY3QuY29sb3JzW3N0eWxlXVsxXSArICdtJztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gc3RyO1xuICB9XG59XG5cblxuZnVuY3Rpb24gc3R5bGl6ZU5vQ29sb3Ioc3RyLCBzdHlsZVR5cGUpIHtcbiAgcmV0dXJuIHN0cjtcbn1cblxuXG5mdW5jdGlvbiBhcnJheVRvSGFzaChhcnJheSkge1xuICB2YXIgaGFzaCA9IHt9O1xuXG4gIGFycmF5LmZvckVhY2goZnVuY3Rpb24odmFsLCBpZHgpIHtcbiAgICBoYXNoW3ZhbF0gPSB0cnVlO1xuICB9KTtcblxuICByZXR1cm4gaGFzaDtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRWYWx1ZShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMpIHtcbiAgLy8gUHJvdmlkZSBhIGhvb2sgZm9yIHVzZXItc3BlY2lmaWVkIGluc3BlY3QgZnVuY3Rpb25zLlxuICAvLyBDaGVjayB0aGF0IHZhbHVlIGlzIGFuIG9iamVjdCB3aXRoIGFuIGluc3BlY3QgZnVuY3Rpb24gb24gaXRcbiAgaWYgKGN0eC5jdXN0b21JbnNwZWN0ICYmXG4gICAgICB2YWx1ZSAmJlxuICAgICAgaXNGdW5jdGlvbih2YWx1ZS5pbnNwZWN0KSAmJlxuICAgICAgLy8gRmlsdGVyIG91dCB0aGUgdXRpbCBtb2R1bGUsIGl0J3MgaW5zcGVjdCBmdW5jdGlvbiBpcyBzcGVjaWFsXG4gICAgICB2YWx1ZS5pbnNwZWN0ICE9PSBleHBvcnRzLmluc3BlY3QgJiZcbiAgICAgIC8vIEFsc28gZmlsdGVyIG91dCBhbnkgcHJvdG90eXBlIG9iamVjdHMgdXNpbmcgdGhlIGNpcmN1bGFyIGNoZWNrLlxuICAgICAgISh2YWx1ZS5jb25zdHJ1Y3RvciAmJiB2YWx1ZS5jb25zdHJ1Y3Rvci5wcm90b3R5cGUgPT09IHZhbHVlKSkge1xuICAgIHZhciByZXQgPSB2YWx1ZS5pbnNwZWN0KHJlY3Vyc2VUaW1lcywgY3R4KTtcbiAgICBpZiAoIWlzU3RyaW5nKHJldCkpIHtcbiAgICAgIHJldCA9IGZvcm1hdFZhbHVlKGN0eCwgcmV0LCByZWN1cnNlVGltZXMpO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9XG5cbiAgLy8gUHJpbWl0aXZlIHR5cGVzIGNhbm5vdCBoYXZlIHByb3BlcnRpZXNcbiAgdmFyIHByaW1pdGl2ZSA9IGZvcm1hdFByaW1pdGl2ZShjdHgsIHZhbHVlKTtcbiAgaWYgKHByaW1pdGl2ZSkge1xuICAgIHJldHVybiBwcmltaXRpdmU7XG4gIH1cblxuICAvLyBMb29rIHVwIHRoZSBrZXlzIG9mIHRoZSBvYmplY3QuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXModmFsdWUpO1xuICB2YXIgdmlzaWJsZUtleXMgPSBhcnJheVRvSGFzaChrZXlzKTtcblxuICBpZiAoY3R4LnNob3dIaWRkZW4pIHtcbiAgICBrZXlzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModmFsdWUpO1xuICB9XG5cbiAgLy8gSUUgZG9lc24ndCBtYWtlIGVycm9yIGZpZWxkcyBub24tZW51bWVyYWJsZVxuICAvLyBodHRwOi8vbXNkbi5taWNyb3NvZnQuY29tL2VuLXVzL2xpYnJhcnkvaWUvZHd3NTJzYnQodj12cy45NCkuYXNweFxuICBpZiAoaXNFcnJvcih2YWx1ZSlcbiAgICAgICYmIChrZXlzLmluZGV4T2YoJ21lc3NhZ2UnKSA+PSAwIHx8IGtleXMuaW5kZXhPZignZGVzY3JpcHRpb24nKSA+PSAwKSkge1xuICAgIHJldHVybiBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gIH1cblxuICAvLyBTb21lIHR5cGUgb2Ygb2JqZWN0IHdpdGhvdXQgcHJvcGVydGllcyBjYW4gYmUgc2hvcnRjdXR0ZWQuXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCkge1xuICAgIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgICAgdmFyIG5hbWUgPSB2YWx1ZS5uYW1lID8gJzogJyArIHZhbHVlLm5hbWUgOiAnJztcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZSgnW0Z1bmN0aW9uJyArIG5hbWUgKyAnXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAncmVnZXhwJyk7XG4gICAgfVxuICAgIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoRGF0ZS5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdkYXRlJyk7XG4gICAgfVxuICAgIGlmIChpc0Vycm9yKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICB2YXIgYmFzZSA9ICcnLCBhcnJheSA9IGZhbHNlLCBicmFjZXMgPSBbJ3snLCAnfSddO1xuXG4gIC8vIE1ha2UgQXJyYXkgc2F5IHRoYXQgdGhleSBhcmUgQXJyYXlcbiAgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgYXJyYXkgPSB0cnVlO1xuICAgIGJyYWNlcyA9IFsnWycsICddJ107XG4gIH1cblxuICAvLyBNYWtlIGZ1bmN0aW9ucyBzYXkgdGhhdCB0aGV5IGFyZSBmdW5jdGlvbnNcbiAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgdmFyIG4gPSB2YWx1ZS5uYW1lID8gJzogJyArIHZhbHVlLm5hbWUgOiAnJztcbiAgICBiYXNlID0gJyBbRnVuY3Rpb24nICsgbiArICddJztcbiAgfVxuXG4gIC8vIE1ha2UgUmVnRXhwcyBzYXkgdGhhdCB0aGV5IGFyZSBSZWdFeHBzXG4gIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgfVxuXG4gIC8vIE1ha2UgZGF0ZXMgd2l0aCBwcm9wZXJ0aWVzIGZpcnN0IHNheSB0aGUgZGF0ZVxuICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBEYXRlLnByb3RvdHlwZS50b1VUQ1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgfVxuXG4gIC8vIE1ha2UgZXJyb3Igd2l0aCBtZXNzYWdlIGZpcnN0IHNheSB0aGUgZXJyb3JcbiAgaWYgKGlzRXJyb3IodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgfVxuXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCAmJiAoIWFycmF5IHx8IHZhbHVlLmxlbmd0aCA9PSAwKSkge1xuICAgIHJldHVybiBicmFjZXNbMF0gKyBiYXNlICsgYnJhY2VzWzFdO1xuICB9XG5cbiAgaWYgKHJlY3Vyc2VUaW1lcyA8IDApIHtcbiAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ3JlZ2V4cCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJ1tPYmplY3RdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cblxuICBjdHguc2Vlbi5wdXNoKHZhbHVlKTtcblxuICB2YXIgb3V0cHV0O1xuICBpZiAoYXJyYXkpIHtcbiAgICBvdXRwdXQgPSBmb3JtYXRBcnJheShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXlzKTtcbiAgfSBlbHNlIHtcbiAgICBvdXRwdXQgPSBrZXlzLm1hcChmdW5jdGlvbihrZXkpIHtcbiAgICAgIHJldHVybiBmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXksIGFycmF5KTtcbiAgICB9KTtcbiAgfVxuXG4gIGN0eC5zZWVuLnBvcCgpO1xuXG4gIHJldHVybiByZWR1Y2VUb1NpbmdsZVN0cmluZyhvdXRwdXQsIGJhc2UsIGJyYWNlcyk7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0UHJpbWl0aXZlKGN0eCwgdmFsdWUpIHtcbiAgaWYgKGlzVW5kZWZpbmVkKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJ3VuZGVmaW5lZCcsICd1bmRlZmluZWQnKTtcbiAgaWYgKGlzU3RyaW5nKHZhbHVlKSkge1xuICAgIHZhciBzaW1wbGUgPSAnXFwnJyArIEpTT04uc3RyaW5naWZ5KHZhbHVlKS5yZXBsYWNlKC9eXCJ8XCIkL2csICcnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKSArICdcXCcnO1xuICAgIHJldHVybiBjdHguc3R5bGl6ZShzaW1wbGUsICdzdHJpbmcnKTtcbiAgfVxuICBpZiAoaXNOdW1iZXIodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnJyArIHZhbHVlLCAnbnVtYmVyJyk7XG4gIGlmIChpc0Jvb2xlYW4odmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnJyArIHZhbHVlLCAnYm9vbGVhbicpO1xuICAvLyBGb3Igc29tZSByZWFzb24gdHlwZW9mIG51bGwgaXMgXCJvYmplY3RcIiwgc28gc3BlY2lhbCBjYXNlIGhlcmUuXG4gIGlmIChpc051bGwodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnbnVsbCcsICdudWxsJyk7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0RXJyb3IodmFsdWUpIHtcbiAgcmV0dXJuICdbJyArIEVycm9yLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSArICddJztcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRBcnJheShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXlzKSB7XG4gIHZhciBvdXRwdXQgPSBbXTtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB2YWx1ZS5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBpZiAoaGFzT3duUHJvcGVydHkodmFsdWUsIFN0cmluZyhpKSkpIHtcbiAgICAgIG91dHB1dC5wdXNoKGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsXG4gICAgICAgICAgU3RyaW5nKGkpLCB0cnVlKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dHB1dC5wdXNoKCcnKTtcbiAgICB9XG4gIH1cbiAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIGlmICgha2V5Lm1hdGNoKC9eXFxkKyQvKSkge1xuICAgICAgb3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cyxcbiAgICAgICAgICBrZXksIHRydWUpKTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gb3V0cHV0O1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleSwgYXJyYXkpIHtcbiAgdmFyIG5hbWUsIHN0ciwgZGVzYztcbiAgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodmFsdWUsIGtleSkgfHwgeyB2YWx1ZTogdmFsdWVba2V5XSB9O1xuICBpZiAoZGVzYy5nZXQpIHtcbiAgICBpZiAoZGVzYy5zZXQpIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbR2V0dGVyL1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0dldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoZGVzYy5zZXQpIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG4gIGlmICghaGFzT3duUHJvcGVydHkodmlzaWJsZUtleXMsIGtleSkpIHtcbiAgICBuYW1lID0gJ1snICsga2V5ICsgJ10nO1xuICB9XG4gIGlmICghc3RyKSB7XG4gICAgaWYgKGN0eC5zZWVuLmluZGV4T2YoZGVzYy52YWx1ZSkgPCAwKSB7XG4gICAgICBpZiAoaXNOdWxsKHJlY3Vyc2VUaW1lcykpIHtcbiAgICAgICAgc3RyID0gZm9ybWF0VmFsdWUoY3R4LCBkZXNjLnZhbHVlLCBudWxsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0ciA9IGZvcm1hdFZhbHVlKGN0eCwgZGVzYy52YWx1ZSwgcmVjdXJzZVRpbWVzIC0gMSk7XG4gICAgICB9XG4gICAgICBpZiAoc3RyLmluZGV4T2YoJ1xcbicpID4gLTEpIHtcbiAgICAgICAgaWYgKGFycmF5KSB7XG4gICAgICAgICAgc3RyID0gc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICcgKyBsaW5lO1xuICAgICAgICAgIH0pLmpvaW4oJ1xcbicpLnN1YnN0cigyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdHIgPSAnXFxuJyArIHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiAnICAgJyArIGxpbmU7XG4gICAgICAgICAgfSkuam9pbignXFxuJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tDaXJjdWxhcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuICBpZiAoaXNVbmRlZmluZWQobmFtZSkpIHtcbiAgICBpZiAoYXJyYXkgJiYga2V5Lm1hdGNoKC9eXFxkKyQvKSkge1xuICAgICAgcmV0dXJuIHN0cjtcbiAgICB9XG4gICAgbmFtZSA9IEpTT04uc3RyaW5naWZ5KCcnICsga2V5KTtcbiAgICBpZiAobmFtZS5tYXRjaCgvXlwiKFthLXpBLVpfXVthLXpBLVpfMC05XSopXCIkLykpIHtcbiAgICAgIG5hbWUgPSBuYW1lLnN1YnN0cigxLCBuYW1lLmxlbmd0aCAtIDIpO1xuICAgICAgbmFtZSA9IGN0eC5zdHlsaXplKG5hbWUsICduYW1lJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5hbWUgPSBuYW1lLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8oXlwifFwiJCkvZywgXCInXCIpO1xuICAgICAgbmFtZSA9IGN0eC5zdHlsaXplKG5hbWUsICdzdHJpbmcnKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmFtZSArICc6ICcgKyBzdHI7XG59XG5cblxuZnVuY3Rpb24gcmVkdWNlVG9TaW5nbGVTdHJpbmcob3V0cHV0LCBiYXNlLCBicmFjZXMpIHtcbiAgdmFyIG51bUxpbmVzRXN0ID0gMDtcbiAgdmFyIGxlbmd0aCA9IG91dHB1dC5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgY3VyKSB7XG4gICAgbnVtTGluZXNFc3QrKztcbiAgICBpZiAoY3VyLmluZGV4T2YoJ1xcbicpID49IDApIG51bUxpbmVzRXN0Kys7XG4gICAgcmV0dXJuIHByZXYgKyBjdXIucmVwbGFjZSgvXFx1MDAxYlxcW1xcZFxcZD9tL2csICcnKS5sZW5ndGggKyAxO1xuICB9LCAwKTtcblxuICBpZiAobGVuZ3RoID4gNjApIHtcbiAgICByZXR1cm4gYnJhY2VzWzBdICtcbiAgICAgICAgICAgKGJhc2UgPT09ICcnID8gJycgOiBiYXNlICsgJ1xcbiAnKSArXG4gICAgICAgICAgICcgJyArXG4gICAgICAgICAgIG91dHB1dC5qb2luKCcsXFxuICAnKSArXG4gICAgICAgICAgICcgJyArXG4gICAgICAgICAgIGJyYWNlc1sxXTtcbiAgfVxuXG4gIHJldHVybiBicmFjZXNbMF0gKyBiYXNlICsgJyAnICsgb3V0cHV0LmpvaW4oJywgJykgKyAnICcgKyBicmFjZXNbMV07XG59XG5cblxuLy8gTk9URTogVGhlc2UgdHlwZSBjaGVja2luZyBmdW5jdGlvbnMgaW50ZW50aW9uYWxseSBkb24ndCB1c2UgYGluc3RhbmNlb2ZgXG4vLyBiZWNhdXNlIGl0IGlzIGZyYWdpbGUgYW5kIGNhbiBiZSBlYXNpbHkgZmFrZWQgd2l0aCBgT2JqZWN0LmNyZWF0ZSgpYC5cbmZ1bmN0aW9uIGlzQXJyYXkoYXIpIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkoYXIpO1xufVxuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheTtcblxuZnVuY3Rpb24gaXNCb29sZWFuKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nO1xufVxuZXhwb3J0cy5pc0Jvb2xlYW4gPSBpc0Jvb2xlYW47XG5cbmZ1bmN0aW9uIGlzTnVsbChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsID0gaXNOdWxsO1xuXG5mdW5jdGlvbiBpc051bGxPclVuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGxPclVuZGVmaW5lZCA9IGlzTnVsbE9yVW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuZXhwb3J0cy5pc051bWJlciA9IGlzTnVtYmVyO1xuXG5mdW5jdGlvbiBpc1N0cmluZyhhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnO1xufVxuZXhwb3J0cy5pc1N0cmluZyA9IGlzU3RyaW5nO1xuXG5mdW5jdGlvbiBpc1N5bWJvbChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnO1xufVxuZXhwb3J0cy5pc1N5bWJvbCA9IGlzU3ltYm9sO1xuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuZXhwb3J0cy5pc1VuZGVmaW5lZCA9IGlzVW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBpc1JlZ0V4cChyZSkge1xuICByZXR1cm4gaXNPYmplY3QocmUpICYmIG9iamVjdFRvU3RyaW5nKHJlKSA9PT0gJ1tvYmplY3QgUmVnRXhwXSc7XG59XG5leHBvcnRzLmlzUmVnRXhwID0gaXNSZWdFeHA7XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuZXhwb3J0cy5pc09iamVjdCA9IGlzT2JqZWN0O1xuXG5mdW5jdGlvbiBpc0RhdGUoZCkge1xuICByZXR1cm4gaXNPYmplY3QoZCkgJiYgb2JqZWN0VG9TdHJpbmcoZCkgPT09ICdbb2JqZWN0IERhdGVdJztcbn1cbmV4cG9ydHMuaXNEYXRlID0gaXNEYXRlO1xuXG5mdW5jdGlvbiBpc0Vycm9yKGUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KGUpICYmXG4gICAgICAob2JqZWN0VG9TdHJpbmcoZSkgPT09ICdbb2JqZWN0IEVycm9yXScgfHwgZSBpbnN0YW5jZW9mIEVycm9yKTtcbn1cbmV4cG9ydHMuaXNFcnJvciA9IGlzRXJyb3I7XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuZXhwb3J0cy5pc0Z1bmN0aW9uID0gaXNGdW5jdGlvbjtcblxuZnVuY3Rpb24gaXNQcmltaXRpdmUoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGwgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ251bWJlcicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3ltYm9sJyB8fCAgLy8gRVM2IHN5bWJvbFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3VuZGVmaW5lZCc7XG59XG5leHBvcnRzLmlzUHJpbWl0aXZlID0gaXNQcmltaXRpdmU7XG5cbmV4cG9ydHMuaXNCdWZmZXIgPSByZXF1aXJlKCcuL3N1cHBvcnQvaXNCdWZmZXInKTtcblxuZnVuY3Rpb24gb2JqZWN0VG9TdHJpbmcobykge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pO1xufVxuXG5cbmZ1bmN0aW9uIHBhZChuKSB7XG4gIHJldHVybiBuIDwgMTAgPyAnMCcgKyBuLnRvU3RyaW5nKDEwKSA6IG4udG9TdHJpbmcoMTApO1xufVxuXG5cbnZhciBtb250aHMgPSBbJ0phbicsICdGZWInLCAnTWFyJywgJ0FwcicsICdNYXknLCAnSnVuJywgJ0p1bCcsICdBdWcnLCAnU2VwJyxcbiAgICAgICAgICAgICAgJ09jdCcsICdOb3YnLCAnRGVjJ107XG5cbi8vIDI2IEZlYiAxNjoxOTozNFxuZnVuY3Rpb24gdGltZXN0YW1wKCkge1xuICB2YXIgZCA9IG5ldyBEYXRlKCk7XG4gIHZhciB0aW1lID0gW3BhZChkLmdldEhvdXJzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRNaW51dGVzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRTZWNvbmRzKCkpXS5qb2luKCc6Jyk7XG4gIHJldHVybiBbZC5nZXREYXRlKCksIG1vbnRoc1tkLmdldE1vbnRoKCldLCB0aW1lXS5qb2luKCcgJyk7XG59XG5cblxuLy8gbG9nIGlzIGp1c3QgYSB0aGluIHdyYXBwZXIgdG8gY29uc29sZS5sb2cgdGhhdCBwcmVwZW5kcyBhIHRpbWVzdGFtcFxuZXhwb3J0cy5sb2cgPSBmdW5jdGlvbigpIHtcbiAgY29uc29sZS5sb2coJyVzIC0gJXMnLCB0aW1lc3RhbXAoKSwgZXhwb3J0cy5mb3JtYXQuYXBwbHkoZXhwb3J0cywgYXJndW1lbnRzKSk7XG59O1xuXG5cbi8qKlxuICogSW5oZXJpdCB0aGUgcHJvdG90eXBlIG1ldGhvZHMgZnJvbSBvbmUgY29uc3RydWN0b3IgaW50byBhbm90aGVyLlxuICpcbiAqIFRoZSBGdW5jdGlvbi5wcm90b3R5cGUuaW5oZXJpdHMgZnJvbSBsYW5nLmpzIHJld3JpdHRlbiBhcyBhIHN0YW5kYWxvbmVcbiAqIGZ1bmN0aW9uIChub3Qgb24gRnVuY3Rpb24ucHJvdG90eXBlKS4gTk9URTogSWYgdGhpcyBmaWxlIGlzIHRvIGJlIGxvYWRlZFxuICogZHVyaW5nIGJvb3RzdHJhcHBpbmcgdGhpcyBmdW5jdGlvbiBuZWVkcyB0byBiZSByZXdyaXR0ZW4gdXNpbmcgc29tZSBuYXRpdmVcbiAqIGZ1bmN0aW9ucyBhcyBwcm90b3R5cGUgc2V0dXAgdXNpbmcgbm9ybWFsIEphdmFTY3JpcHQgZG9lcyBub3Qgd29yayBhc1xuICogZXhwZWN0ZWQgZHVyaW5nIGJvb3RzdHJhcHBpbmcgKHNlZSBtaXJyb3IuanMgaW4gcjExNDkwMykuXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gY3RvciBDb25zdHJ1Y3RvciBmdW5jdGlvbiB3aGljaCBuZWVkcyB0byBpbmhlcml0IHRoZVxuICogICAgIHByb3RvdHlwZS5cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IHN1cGVyQ3RvciBDb25zdHJ1Y3RvciBmdW5jdGlvbiB0byBpbmhlcml0IHByb3RvdHlwZSBmcm9tLlxuICovXG5leHBvcnRzLmluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcblxuZXhwb3J0cy5fZXh0ZW5kID0gZnVuY3Rpb24ob3JpZ2luLCBhZGQpIHtcbiAgLy8gRG9uJ3QgZG8gYW55dGhpbmcgaWYgYWRkIGlzbid0IGFuIG9iamVjdFxuICBpZiAoIWFkZCB8fCAhaXNPYmplY3QoYWRkKSkgcmV0dXJuIG9yaWdpbjtcblxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGFkZCk7XG4gIHZhciBpID0ga2V5cy5sZW5ndGg7XG4gIHdoaWxlIChpLS0pIHtcbiAgICBvcmlnaW5ba2V5c1tpXV0gPSBhZGRba2V5c1tpXV07XG4gIH1cbiAgcmV0dXJuIG9yaWdpbjtcbn07XG5cbmZ1bmN0aW9uIGhhc093blByb3BlcnR5KG9iaiwgcHJvcCkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCk7XG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2luc2VydC1tb2R1bGUtZ2xvYmFscy9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBVdGlscyA9IHJlcXVpcmUoXCIuL3V0aWxzXCIpO1xudmFyIEV4Y2VwdGlvbiA9IHJlcXVpcmUoXCIuL2V4Y2VwdGlvblwiKVtcImRlZmF1bHRcIl07XG5cbnZhciBWRVJTSU9OID0gXCIxLjMuMFwiO1xuZXhwb3J0cy5WRVJTSU9OID0gVkVSU0lPTjt2YXIgQ09NUElMRVJfUkVWSVNJT04gPSA0O1xuZXhwb3J0cy5DT01QSUxFUl9SRVZJU0lPTiA9IENPTVBJTEVSX1JFVklTSU9OO1xudmFyIFJFVklTSU9OX0NIQU5HRVMgPSB7XG4gIDE6ICc8PSAxLjAucmMuMicsIC8vIDEuMC5yYy4yIGlzIGFjdHVhbGx5IHJldjIgYnV0IGRvZXNuJ3QgcmVwb3J0IGl0XG4gIDI6ICc9PSAxLjAuMC1yYy4zJyxcbiAgMzogJz09IDEuMC4wLXJjLjQnLFxuICA0OiAnPj0gMS4wLjAnXG59O1xuZXhwb3J0cy5SRVZJU0lPTl9DSEFOR0VTID0gUkVWSVNJT05fQ0hBTkdFUztcbnZhciBpc0FycmF5ID0gVXRpbHMuaXNBcnJheSxcbiAgICBpc0Z1bmN0aW9uID0gVXRpbHMuaXNGdW5jdGlvbixcbiAgICB0b1N0cmluZyA9IFV0aWxzLnRvU3RyaW5nLFxuICAgIG9iamVjdFR5cGUgPSAnW29iamVjdCBPYmplY3RdJztcblxuZnVuY3Rpb24gSGFuZGxlYmFyc0Vudmlyb25tZW50KGhlbHBlcnMsIHBhcnRpYWxzKSB7XG4gIHRoaXMuaGVscGVycyA9IGhlbHBlcnMgfHwge307XG4gIHRoaXMucGFydGlhbHMgPSBwYXJ0aWFscyB8fCB7fTtcblxuICByZWdpc3RlckRlZmF1bHRIZWxwZXJzKHRoaXMpO1xufVxuXG5leHBvcnRzLkhhbmRsZWJhcnNFbnZpcm9ubWVudCA9IEhhbmRsZWJhcnNFbnZpcm9ubWVudDtIYW5kbGViYXJzRW52aXJvbm1lbnQucHJvdG90eXBlID0ge1xuICBjb25zdHJ1Y3RvcjogSGFuZGxlYmFyc0Vudmlyb25tZW50LFxuXG4gIGxvZ2dlcjogbG9nZ2VyLFxuICBsb2c6IGxvZyxcblxuICByZWdpc3RlckhlbHBlcjogZnVuY3Rpb24obmFtZSwgZm4sIGludmVyc2UpIHtcbiAgICBpZiAodG9TdHJpbmcuY2FsbChuYW1lKSA9PT0gb2JqZWN0VHlwZSkge1xuICAgICAgaWYgKGludmVyc2UgfHwgZm4pIHsgdGhyb3cgbmV3IEV4Y2VwdGlvbignQXJnIG5vdCBzdXBwb3J0ZWQgd2l0aCBtdWx0aXBsZSBoZWxwZXJzJyk7IH1cbiAgICAgIFV0aWxzLmV4dGVuZCh0aGlzLmhlbHBlcnMsIG5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoaW52ZXJzZSkgeyBmbi5ub3QgPSBpbnZlcnNlOyB9XG4gICAgICB0aGlzLmhlbHBlcnNbbmFtZV0gPSBmbjtcbiAgICB9XG4gIH0sXG5cbiAgcmVnaXN0ZXJQYXJ0aWFsOiBmdW5jdGlvbihuYW1lLCBzdHIpIHtcbiAgICBpZiAodG9TdHJpbmcuY2FsbChuYW1lKSA9PT0gb2JqZWN0VHlwZSkge1xuICAgICAgVXRpbHMuZXh0ZW5kKHRoaXMucGFydGlhbHMsICBuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5wYXJ0aWFsc1tuYW1lXSA9IHN0cjtcbiAgICB9XG4gIH1cbn07XG5cbmZ1bmN0aW9uIHJlZ2lzdGVyRGVmYXVsdEhlbHBlcnMoaW5zdGFuY2UpIHtcbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2hlbHBlck1pc3NpbmcnLCBmdW5jdGlvbihhcmcpIHtcbiAgICBpZihhcmd1bWVudHMubGVuZ3RoID09PSAyKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKFwiTWlzc2luZyBoZWxwZXI6ICdcIiArIGFyZyArIFwiJ1wiKTtcbiAgICB9XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdibG9ja0hlbHBlck1pc3NpbmcnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgdmFyIGludmVyc2UgPSBvcHRpb25zLmludmVyc2UgfHwgZnVuY3Rpb24oKSB7fSwgZm4gPSBvcHRpb25zLmZuO1xuXG4gICAgaWYgKGlzRnVuY3Rpb24oY29udGV4dCkpIHsgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTsgfVxuXG4gICAgaWYoY29udGV4dCA9PT0gdHJ1ZSkge1xuICAgICAgcmV0dXJuIGZuKHRoaXMpO1xuICAgIH0gZWxzZSBpZihjb250ZXh0ID09PSBmYWxzZSB8fCBjb250ZXh0ID09IG51bGwpIHtcbiAgICAgIHJldHVybiBpbnZlcnNlKHRoaXMpO1xuICAgIH0gZWxzZSBpZiAoaXNBcnJheShjb250ZXh0KSkge1xuICAgICAgaWYoY29udGV4dC5sZW5ndGggPiAwKSB7XG4gICAgICAgIHJldHVybiBpbnN0YW5jZS5oZWxwZXJzLmVhY2goY29udGV4dCwgb3B0aW9ucyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gaW52ZXJzZSh0aGlzKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZuKGNvbnRleHQpO1xuICAgIH1cbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2VhY2gnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgdmFyIGZuID0gb3B0aW9ucy5mbiwgaW52ZXJzZSA9IG9wdGlvbnMuaW52ZXJzZTtcbiAgICB2YXIgaSA9IDAsIHJldCA9IFwiXCIsIGRhdGE7XG5cbiAgICBpZiAoaXNGdW5jdGlvbihjb250ZXh0KSkgeyBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpOyB9XG5cbiAgICBpZiAob3B0aW9ucy5kYXRhKSB7XG4gICAgICBkYXRhID0gY3JlYXRlRnJhbWUob3B0aW9ucy5kYXRhKTtcbiAgICB9XG5cbiAgICBpZihjb250ZXh0ICYmIHR5cGVvZiBjb250ZXh0ID09PSAnb2JqZWN0Jykge1xuICAgICAgaWYgKGlzQXJyYXkoY29udGV4dCkpIHtcbiAgICAgICAgZm9yKHZhciBqID0gY29udGV4dC5sZW5ndGg7IGk8ajsgaSsrKSB7XG4gICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgIGRhdGEuaW5kZXggPSBpO1xuICAgICAgICAgICAgZGF0YS5maXJzdCA9IChpID09PSAwKTtcbiAgICAgICAgICAgIGRhdGEubGFzdCAgPSAoaSA9PT0gKGNvbnRleHQubGVuZ3RoLTEpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0ID0gcmV0ICsgZm4oY29udGV4dFtpXSwgeyBkYXRhOiBkYXRhIH0pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb3IodmFyIGtleSBpbiBjb250ZXh0KSB7XG4gICAgICAgICAgaWYoY29udGV4dC5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICBpZihkYXRhKSB7IFxuICAgICAgICAgICAgICBkYXRhLmtleSA9IGtleTsgXG4gICAgICAgICAgICAgIGRhdGEuaW5kZXggPSBpO1xuICAgICAgICAgICAgICBkYXRhLmZpcnN0ID0gKGkgPT09IDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0ID0gcmV0ICsgZm4oY29udGV4dFtrZXldLCB7ZGF0YTogZGF0YX0pO1xuICAgICAgICAgICAgaSsrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmKGkgPT09IDApe1xuICAgICAgcmV0ID0gaW52ZXJzZSh0aGlzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmV0O1xuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignaWYnLCBmdW5jdGlvbihjb25kaXRpb25hbCwgb3B0aW9ucykge1xuICAgIGlmIChpc0Z1bmN0aW9uKGNvbmRpdGlvbmFsKSkgeyBjb25kaXRpb25hbCA9IGNvbmRpdGlvbmFsLmNhbGwodGhpcyk7IH1cblxuICAgIC8vIERlZmF1bHQgYmVoYXZpb3IgaXMgdG8gcmVuZGVyIHRoZSBwb3NpdGl2ZSBwYXRoIGlmIHRoZSB2YWx1ZSBpcyB0cnV0aHkgYW5kIG5vdCBlbXB0eS5cbiAgICAvLyBUaGUgYGluY2x1ZGVaZXJvYCBvcHRpb24gbWF5IGJlIHNldCB0byB0cmVhdCB0aGUgY29uZHRpb25hbCBhcyBwdXJlbHkgbm90IGVtcHR5IGJhc2VkIG9uIHRoZVxuICAgIC8vIGJlaGF2aW9yIG9mIGlzRW1wdHkuIEVmZmVjdGl2ZWx5IHRoaXMgZGV0ZXJtaW5lcyBpZiAwIGlzIGhhbmRsZWQgYnkgdGhlIHBvc2l0aXZlIHBhdGggb3IgbmVnYXRpdmUuXG4gICAgaWYgKCghb3B0aW9ucy5oYXNoLmluY2x1ZGVaZXJvICYmICFjb25kaXRpb25hbCkgfHwgVXRpbHMuaXNFbXB0eShjb25kaXRpb25hbCkpIHtcbiAgICAgIHJldHVybiBvcHRpb25zLmludmVyc2UodGhpcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBvcHRpb25zLmZuKHRoaXMpO1xuICAgIH1cbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ3VubGVzcycsIGZ1bmN0aW9uKGNvbmRpdGlvbmFsLCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIGluc3RhbmNlLmhlbHBlcnNbJ2lmJ10uY2FsbCh0aGlzLCBjb25kaXRpb25hbCwge2ZuOiBvcHRpb25zLmludmVyc2UsIGludmVyc2U6IG9wdGlvbnMuZm4sIGhhc2g6IG9wdGlvbnMuaGFzaH0pO1xuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignd2l0aCcsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBpZiAoaXNGdW5jdGlvbihjb250ZXh0KSkgeyBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpOyB9XG5cbiAgICBpZiAoIVV0aWxzLmlzRW1wdHkoY29udGV4dCkpIHJldHVybiBvcHRpb25zLmZuKGNvbnRleHQpO1xuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignbG9nJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIHZhciBsZXZlbCA9IG9wdGlvbnMuZGF0YSAmJiBvcHRpb25zLmRhdGEubGV2ZWwgIT0gbnVsbCA/IHBhcnNlSW50KG9wdGlvbnMuZGF0YS5sZXZlbCwgMTApIDogMTtcbiAgICBpbnN0YW5jZS5sb2cobGV2ZWwsIGNvbnRleHQpO1xuICB9KTtcbn1cblxudmFyIGxvZ2dlciA9IHtcbiAgbWV0aG9kTWFwOiB7IDA6ICdkZWJ1ZycsIDE6ICdpbmZvJywgMjogJ3dhcm4nLCAzOiAnZXJyb3InIH0sXG5cbiAgLy8gU3RhdGUgZW51bVxuICBERUJVRzogMCxcbiAgSU5GTzogMSxcbiAgV0FSTjogMixcbiAgRVJST1I6IDMsXG4gIGxldmVsOiAzLFxuXG4gIC8vIGNhbiBiZSBvdmVycmlkZGVuIGluIHRoZSBob3N0IGVudmlyb25tZW50XG4gIGxvZzogZnVuY3Rpb24obGV2ZWwsIG9iaikge1xuICAgIGlmIChsb2dnZXIubGV2ZWwgPD0gbGV2ZWwpIHtcbiAgICAgIHZhciBtZXRob2QgPSBsb2dnZXIubWV0aG9kTWFwW2xldmVsXTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZSAhPT0gJ3VuZGVmaW5lZCcgJiYgY29uc29sZVttZXRob2RdKSB7XG4gICAgICAgIGNvbnNvbGVbbWV0aG9kXS5jYWxsKGNvbnNvbGUsIG9iaik7XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuZXhwb3J0cy5sb2dnZXIgPSBsb2dnZXI7XG5mdW5jdGlvbiBsb2cobGV2ZWwsIG9iaikgeyBsb2dnZXIubG9nKGxldmVsLCBvYmopOyB9XG5cbmV4cG9ydHMubG9nID0gbG9nO3ZhciBjcmVhdGVGcmFtZSA9IGZ1bmN0aW9uKG9iamVjdCkge1xuICB2YXIgb2JqID0ge307XG4gIFV0aWxzLmV4dGVuZChvYmosIG9iamVjdCk7XG4gIHJldHVybiBvYmo7XG59O1xuZXhwb3J0cy5jcmVhdGVGcmFtZSA9IGNyZWF0ZUZyYW1lOyIsIlwidXNlIHN0cmljdFwiO1xudmFyIEV4Y2VwdGlvbiA9IHJlcXVpcmUoXCIuLi9leGNlcHRpb25cIilbXCJkZWZhdWx0XCJdO1xuXG5mdW5jdGlvbiBMb2NhdGlvbkluZm8obG9jSW5mbyl7XG4gIGxvY0luZm8gPSBsb2NJbmZvIHx8IHt9O1xuICB0aGlzLmZpcnN0TGluZSAgID0gbG9jSW5mby5maXJzdF9saW5lO1xuICB0aGlzLmZpcnN0Q29sdW1uID0gbG9jSW5mby5maXJzdF9jb2x1bW47XG4gIHRoaXMubGFzdENvbHVtbiAgPSBsb2NJbmZvLmxhc3RfY29sdW1uO1xuICB0aGlzLmxhc3RMaW5lICAgID0gbG9jSW5mby5sYXN0X2xpbmU7XG59XG5cbnZhciBBU1QgPSB7XG4gIFByb2dyYW1Ob2RlOiBmdW5jdGlvbihzdGF0ZW1lbnRzLCBpbnZlcnNlU3RyaXAsIGludmVyc2UsIGxvY0luZm8pIHtcbiAgICB2YXIgaW52ZXJzZUxvY2F0aW9uSW5mbywgZmlyc3RJbnZlcnNlTm9kZTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMykge1xuICAgICAgbG9jSW5mbyA9IGludmVyc2U7XG4gICAgICBpbnZlcnNlID0gbnVsbDtcbiAgICB9IGVsc2UgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcbiAgICAgIGxvY0luZm8gPSBpbnZlcnNlU3RyaXA7XG4gICAgICBpbnZlcnNlU3RyaXAgPSBudWxsO1xuICAgIH1cblxuICAgIExvY2F0aW9uSW5mby5jYWxsKHRoaXMsIGxvY0luZm8pO1xuICAgIHRoaXMudHlwZSA9IFwicHJvZ3JhbVwiO1xuICAgIHRoaXMuc3RhdGVtZW50cyA9IHN0YXRlbWVudHM7XG4gICAgdGhpcy5zdHJpcCA9IHt9O1xuXG4gICAgaWYoaW52ZXJzZSkge1xuICAgICAgZmlyc3RJbnZlcnNlTm9kZSA9IGludmVyc2VbMF07XG4gICAgICBpZiAoZmlyc3RJbnZlcnNlTm9kZSkge1xuICAgICAgICBpbnZlcnNlTG9jYXRpb25JbmZvID0ge1xuICAgICAgICAgIGZpcnN0X2xpbmU6IGZpcnN0SW52ZXJzZU5vZGUuZmlyc3RMaW5lLFxuICAgICAgICAgIGxhc3RfbGluZTogZmlyc3RJbnZlcnNlTm9kZS5sYXN0TGluZSxcbiAgICAgICAgICBsYXN0X2NvbHVtbjogZmlyc3RJbnZlcnNlTm9kZS5sYXN0Q29sdW1uLFxuICAgICAgICAgIGZpcnN0X2NvbHVtbjogZmlyc3RJbnZlcnNlTm9kZS5maXJzdENvbHVtblxuICAgICAgICB9O1xuICAgICAgICB0aGlzLmludmVyc2UgPSBuZXcgQVNULlByb2dyYW1Ob2RlKGludmVyc2UsIGludmVyc2VTdHJpcCwgaW52ZXJzZUxvY2F0aW9uSW5mbyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmludmVyc2UgPSBuZXcgQVNULlByb2dyYW1Ob2RlKGludmVyc2UsIGludmVyc2VTdHJpcCk7XG4gICAgICB9XG4gICAgICB0aGlzLnN0cmlwLnJpZ2h0ID0gaW52ZXJzZVN0cmlwLmxlZnQ7XG4gICAgfSBlbHNlIGlmIChpbnZlcnNlU3RyaXApIHtcbiAgICAgIHRoaXMuc3RyaXAubGVmdCA9IGludmVyc2VTdHJpcC5yaWdodDtcbiAgICB9XG4gIH0sXG5cbiAgTXVzdGFjaGVOb2RlOiBmdW5jdGlvbihyYXdQYXJhbXMsIGhhc2gsIG9wZW4sIHN0cmlwLCBsb2NJbmZvKSB7XG4gICAgTG9jYXRpb25JbmZvLmNhbGwodGhpcywgbG9jSW5mbyk7XG4gICAgdGhpcy50eXBlID0gXCJtdXN0YWNoZVwiO1xuICAgIHRoaXMuc3RyaXAgPSBzdHJpcDtcblxuICAgIC8vIE9wZW4gbWF5IGJlIGEgc3RyaW5nIHBhcnNlZCBmcm9tIHRoZSBwYXJzZXIgb3IgYSBwYXNzZWQgYm9vbGVhbiBmbGFnXG4gICAgaWYgKG9wZW4gIT0gbnVsbCAmJiBvcGVuLmNoYXJBdCkge1xuICAgICAgLy8gTXVzdCB1c2UgY2hhckF0IHRvIHN1cHBvcnQgSUUgcHJlLTEwXG4gICAgICB2YXIgZXNjYXBlRmxhZyA9IG9wZW4uY2hhckF0KDMpIHx8IG9wZW4uY2hhckF0KDIpO1xuICAgICAgdGhpcy5lc2NhcGVkID0gZXNjYXBlRmxhZyAhPT0gJ3snICYmIGVzY2FwZUZsYWcgIT09ICcmJztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5lc2NhcGVkID0gISFvcGVuO1xuICAgIH1cblxuICAgIGlmIChyYXdQYXJhbXMgaW5zdGFuY2VvZiBBU1QuU2V4cHJOb2RlKSB7XG4gICAgICB0aGlzLnNleHByID0gcmF3UGFyYW1zO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBTdXBwb3J0IG9sZCBBU1QgQVBJXG4gICAgICB0aGlzLnNleHByID0gbmV3IEFTVC5TZXhwck5vZGUocmF3UGFyYW1zLCBoYXNoKTtcbiAgICB9XG5cbiAgICB0aGlzLnNleHByLmlzUm9vdCA9IHRydWU7XG5cbiAgICAvLyBTdXBwb3J0IG9sZCBBU1QgQVBJIHRoYXQgc3RvcmVkIHRoaXMgaW5mbyBpbiBNdXN0YWNoZU5vZGVcbiAgICB0aGlzLmlkID0gdGhpcy5zZXhwci5pZDtcbiAgICB0aGlzLnBhcmFtcyA9IHRoaXMuc2V4cHIucGFyYW1zO1xuICAgIHRoaXMuaGFzaCA9IHRoaXMuc2V4cHIuaGFzaDtcbiAgICB0aGlzLmVsaWdpYmxlSGVscGVyID0gdGhpcy5zZXhwci5lbGlnaWJsZUhlbHBlcjtcbiAgICB0aGlzLmlzSGVscGVyID0gdGhpcy5zZXhwci5pc0hlbHBlcjtcbiAgfSxcblxuICBTZXhwck5vZGU6IGZ1bmN0aW9uKHJhd1BhcmFtcywgaGFzaCwgbG9jSW5mbykge1xuICAgIExvY2F0aW9uSW5mby5jYWxsKHRoaXMsIGxvY0luZm8pO1xuXG4gICAgdGhpcy50eXBlID0gXCJzZXhwclwiO1xuICAgIHRoaXMuaGFzaCA9IGhhc2g7XG5cbiAgICB2YXIgaWQgPSB0aGlzLmlkID0gcmF3UGFyYW1zWzBdO1xuICAgIHZhciBwYXJhbXMgPSB0aGlzLnBhcmFtcyA9IHJhd1BhcmFtcy5zbGljZSgxKTtcblxuICAgIC8vIGEgbXVzdGFjaGUgaXMgYW4gZWxpZ2libGUgaGVscGVyIGlmOlxuICAgIC8vICogaXRzIGlkIGlzIHNpbXBsZSAoYSBzaW5nbGUgcGFydCwgbm90IGB0aGlzYCBvciBgLi5gKVxuICAgIHZhciBlbGlnaWJsZUhlbHBlciA9IHRoaXMuZWxpZ2libGVIZWxwZXIgPSBpZC5pc1NpbXBsZTtcblxuICAgIC8vIGEgbXVzdGFjaGUgaXMgZGVmaW5pdGVseSBhIGhlbHBlciBpZjpcbiAgICAvLyAqIGl0IGlzIGFuIGVsaWdpYmxlIGhlbHBlciwgYW5kXG4gICAgLy8gKiBpdCBoYXMgYXQgbGVhc3Qgb25lIHBhcmFtZXRlciBvciBoYXNoIHNlZ21lbnRcbiAgICB0aGlzLmlzSGVscGVyID0gZWxpZ2libGVIZWxwZXIgJiYgKHBhcmFtcy5sZW5ndGggfHwgaGFzaCk7XG5cbiAgICAvLyBpZiBhIG11c3RhY2hlIGlzIGFuIGVsaWdpYmxlIGhlbHBlciBidXQgbm90IGEgZGVmaW5pdGVcbiAgICAvLyBoZWxwZXIsIGl0IGlzIGFtYmlndW91cywgYW5kIHdpbGwgYmUgcmVzb2x2ZWQgaW4gYSBsYXRlclxuICAgIC8vIHBhc3Mgb3IgYXQgcnVudGltZS5cbiAgfSxcblxuICBQYXJ0aWFsTm9kZTogZnVuY3Rpb24ocGFydGlhbE5hbWUsIGNvbnRleHQsIHN0cmlwLCBsb2NJbmZvKSB7XG4gICAgTG9jYXRpb25JbmZvLmNhbGwodGhpcywgbG9jSW5mbyk7XG4gICAgdGhpcy50eXBlICAgICAgICAgPSBcInBhcnRpYWxcIjtcbiAgICB0aGlzLnBhcnRpYWxOYW1lICA9IHBhcnRpYWxOYW1lO1xuICAgIHRoaXMuY29udGV4dCAgICAgID0gY29udGV4dDtcbiAgICB0aGlzLnN0cmlwID0gc3RyaXA7XG4gIH0sXG5cbiAgQmxvY2tOb2RlOiBmdW5jdGlvbihtdXN0YWNoZSwgcHJvZ3JhbSwgaW52ZXJzZSwgY2xvc2UsIGxvY0luZm8pIHtcbiAgICBMb2NhdGlvbkluZm8uY2FsbCh0aGlzLCBsb2NJbmZvKTtcblxuICAgIGlmKG11c3RhY2hlLnNleHByLmlkLm9yaWdpbmFsICE9PSBjbG9zZS5wYXRoLm9yaWdpbmFsKSB7XG4gICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKG11c3RhY2hlLnNleHByLmlkLm9yaWdpbmFsICsgXCIgZG9lc24ndCBtYXRjaCBcIiArIGNsb3NlLnBhdGgub3JpZ2luYWwsIHRoaXMpO1xuICAgIH1cblxuICAgIHRoaXMudHlwZSA9ICdibG9jayc7XG4gICAgdGhpcy5tdXN0YWNoZSA9IG11c3RhY2hlO1xuICAgIHRoaXMucHJvZ3JhbSAgPSBwcm9ncmFtO1xuICAgIHRoaXMuaW52ZXJzZSAgPSBpbnZlcnNlO1xuXG4gICAgdGhpcy5zdHJpcCA9IHtcbiAgICAgIGxlZnQ6IG11c3RhY2hlLnN0cmlwLmxlZnQsXG4gICAgICByaWdodDogY2xvc2Uuc3RyaXAucmlnaHRcbiAgICB9O1xuXG4gICAgKHByb2dyYW0gfHwgaW52ZXJzZSkuc3RyaXAubGVmdCA9IG11c3RhY2hlLnN0cmlwLnJpZ2h0O1xuICAgIChpbnZlcnNlIHx8IHByb2dyYW0pLnN0cmlwLnJpZ2h0ID0gY2xvc2Uuc3RyaXAubGVmdDtcblxuICAgIGlmIChpbnZlcnNlICYmICFwcm9ncmFtKSB7XG4gICAgICB0aGlzLmlzSW52ZXJzZSA9IHRydWU7XG4gICAgfVxuICB9LFxuXG4gIENvbnRlbnROb2RlOiBmdW5jdGlvbihzdHJpbmcsIGxvY0luZm8pIHtcbiAgICBMb2NhdGlvbkluZm8uY2FsbCh0aGlzLCBsb2NJbmZvKTtcbiAgICB0aGlzLnR5cGUgPSBcImNvbnRlbnRcIjtcbiAgICB0aGlzLnN0cmluZyA9IHN0cmluZztcbiAgfSxcblxuICBIYXNoTm9kZTogZnVuY3Rpb24ocGFpcnMsIGxvY0luZm8pIHtcbiAgICBMb2NhdGlvbkluZm8uY2FsbCh0aGlzLCBsb2NJbmZvKTtcbiAgICB0aGlzLnR5cGUgPSBcImhhc2hcIjtcbiAgICB0aGlzLnBhaXJzID0gcGFpcnM7XG4gIH0sXG5cbiAgSWROb2RlOiBmdW5jdGlvbihwYXJ0cywgbG9jSW5mbykge1xuICAgIExvY2F0aW9uSW5mby5jYWxsKHRoaXMsIGxvY0luZm8pO1xuICAgIHRoaXMudHlwZSA9IFwiSURcIjtcblxuICAgIHZhciBvcmlnaW5hbCA9IFwiXCIsXG4gICAgICAgIGRpZyA9IFtdLFxuICAgICAgICBkZXB0aCA9IDA7XG5cbiAgICBmb3IodmFyIGk9MCxsPXBhcnRzLmxlbmd0aDsgaTxsOyBpKyspIHtcbiAgICAgIHZhciBwYXJ0ID0gcGFydHNbaV0ucGFydDtcbiAgICAgIG9yaWdpbmFsICs9IChwYXJ0c1tpXS5zZXBhcmF0b3IgfHwgJycpICsgcGFydDtcblxuICAgICAgaWYgKHBhcnQgPT09IFwiLi5cIiB8fCBwYXJ0ID09PSBcIi5cIiB8fCBwYXJ0ID09PSBcInRoaXNcIikge1xuICAgICAgICBpZiAoZGlnLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKFwiSW52YWxpZCBwYXRoOiBcIiArIG9yaWdpbmFsLCB0aGlzKTtcbiAgICAgICAgfSBlbHNlIGlmIChwYXJ0ID09PSBcIi4uXCIpIHtcbiAgICAgICAgICBkZXB0aCsrO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuaXNTY29wZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkaWcucHVzaChwYXJ0KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLm9yaWdpbmFsID0gb3JpZ2luYWw7XG4gICAgdGhpcy5wYXJ0cyAgICA9IGRpZztcbiAgICB0aGlzLnN0cmluZyAgID0gZGlnLmpvaW4oJy4nKTtcbiAgICB0aGlzLmRlcHRoICAgID0gZGVwdGg7XG5cbiAgICAvLyBhbiBJRCBpcyBzaW1wbGUgaWYgaXQgb25seSBoYXMgb25lIHBhcnQsIGFuZCB0aGF0IHBhcnQgaXMgbm90XG4gICAgLy8gYC4uYCBvciBgdGhpc2AuXG4gICAgdGhpcy5pc1NpbXBsZSA9IHBhcnRzLmxlbmd0aCA9PT0gMSAmJiAhdGhpcy5pc1Njb3BlZCAmJiBkZXB0aCA9PT0gMDtcblxuICAgIHRoaXMuc3RyaW5nTW9kZVZhbHVlID0gdGhpcy5zdHJpbmc7XG4gIH0sXG5cbiAgUGFydGlhbE5hbWVOb2RlOiBmdW5jdGlvbihuYW1lLCBsb2NJbmZvKSB7XG4gICAgTG9jYXRpb25JbmZvLmNhbGwodGhpcywgbG9jSW5mbyk7XG4gICAgdGhpcy50eXBlID0gXCJQQVJUSUFMX05BTUVcIjtcbiAgICB0aGlzLm5hbWUgPSBuYW1lLm9yaWdpbmFsO1xuICB9LFxuXG4gIERhdGFOb2RlOiBmdW5jdGlvbihpZCwgbG9jSW5mbykge1xuICAgIExvY2F0aW9uSW5mby5jYWxsKHRoaXMsIGxvY0luZm8pO1xuICAgIHRoaXMudHlwZSA9IFwiREFUQVwiO1xuICAgIHRoaXMuaWQgPSBpZDtcbiAgfSxcblxuICBTdHJpbmdOb2RlOiBmdW5jdGlvbihzdHJpbmcsIGxvY0luZm8pIHtcbiAgICBMb2NhdGlvbkluZm8uY2FsbCh0aGlzLCBsb2NJbmZvKTtcbiAgICB0aGlzLnR5cGUgPSBcIlNUUklOR1wiO1xuICAgIHRoaXMub3JpZ2luYWwgPVxuICAgICAgdGhpcy5zdHJpbmcgPVxuICAgICAgdGhpcy5zdHJpbmdNb2RlVmFsdWUgPSBzdHJpbmc7XG4gIH0sXG5cbiAgSW50ZWdlck5vZGU6IGZ1bmN0aW9uKGludGVnZXIsIGxvY0luZm8pIHtcbiAgICBMb2NhdGlvbkluZm8uY2FsbCh0aGlzLCBsb2NJbmZvKTtcbiAgICB0aGlzLnR5cGUgPSBcIklOVEVHRVJcIjtcbiAgICB0aGlzLm9yaWdpbmFsID1cbiAgICAgIHRoaXMuaW50ZWdlciA9IGludGVnZXI7XG4gICAgdGhpcy5zdHJpbmdNb2RlVmFsdWUgPSBOdW1iZXIoaW50ZWdlcik7XG4gIH0sXG5cbiAgQm9vbGVhbk5vZGU6IGZ1bmN0aW9uKGJvb2wsIGxvY0luZm8pIHtcbiAgICBMb2NhdGlvbkluZm8uY2FsbCh0aGlzLCBsb2NJbmZvKTtcbiAgICB0aGlzLnR5cGUgPSBcIkJPT0xFQU5cIjtcbiAgICB0aGlzLmJvb2wgPSBib29sO1xuICAgIHRoaXMuc3RyaW5nTW9kZVZhbHVlID0gYm9vbCA9PT0gXCJ0cnVlXCI7XG4gIH0sXG5cbiAgQ29tbWVudE5vZGU6IGZ1bmN0aW9uKGNvbW1lbnQsIGxvY0luZm8pIHtcbiAgICBMb2NhdGlvbkluZm8uY2FsbCh0aGlzLCBsb2NJbmZvKTtcbiAgICB0aGlzLnR5cGUgPSBcImNvbW1lbnRcIjtcbiAgICB0aGlzLmNvbW1lbnQgPSBjb21tZW50O1xuICB9XG59O1xuXG4vLyBNdXN0IGJlIGV4cG9ydGVkIGFzIGFuIG9iamVjdCByYXRoZXIgdGhhbiB0aGUgcm9vdCBvZiB0aGUgbW9kdWxlIGFzIHRoZSBqaXNvbiBsZXhlclxuLy8gbW9zdCBtb2RpZnkgdGhlIG9iamVjdCB0byBvcGVyYXRlIHByb3Blcmx5LlxuZXhwb3J0c1tcImRlZmF1bHRcIl0gPSBBU1Q7IiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgRXhjZXB0aW9uID0gcmVxdWlyZShcIi4uL2V4Y2VwdGlvblwiKVtcImRlZmF1bHRcIl07XG5cbmZ1bmN0aW9uIENvbXBpbGVyKCkge31cblxuZXhwb3J0cy5Db21waWxlciA9IENvbXBpbGVyOy8vIHRoZSBmb3VuZEhlbHBlciByZWdpc3RlciB3aWxsIGRpc2FtYmlndWF0ZSBoZWxwZXIgbG9va3VwIGZyb20gZmluZGluZyBhXG4vLyBmdW5jdGlvbiBpbiBhIGNvbnRleHQuIFRoaXMgaXMgbmVjZXNzYXJ5IGZvciBtdXN0YWNoZSBjb21wYXRpYmlsaXR5LCB3aGljaFxuLy8gcmVxdWlyZXMgdGhhdCBjb250ZXh0IGZ1bmN0aW9ucyBpbiBibG9ja3MgYXJlIGV2YWx1YXRlZCBieSBibG9ja0hlbHBlck1pc3NpbmcsXG4vLyBhbmQgdGhlbiBwcm9jZWVkIGFzIGlmIHRoZSByZXN1bHRpbmcgdmFsdWUgd2FzIHByb3ZpZGVkIHRvIGJsb2NrSGVscGVyTWlzc2luZy5cblxuQ29tcGlsZXIucHJvdG90eXBlID0ge1xuICBjb21waWxlcjogQ29tcGlsZXIsXG5cbiAgZGlzYXNzZW1ibGU6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBvcGNvZGVzID0gdGhpcy5vcGNvZGVzLCBvcGNvZGUsIG91dCA9IFtdLCBwYXJhbXMsIHBhcmFtO1xuXG4gICAgZm9yICh2YXIgaT0wLCBsPW9wY29kZXMubGVuZ3RoOyBpPGw7IGkrKykge1xuICAgICAgb3Bjb2RlID0gb3Bjb2Rlc1tpXTtcblxuICAgICAgaWYgKG9wY29kZS5vcGNvZGUgPT09ICdERUNMQVJFJykge1xuICAgICAgICBvdXQucHVzaChcIkRFQ0xBUkUgXCIgKyBvcGNvZGUubmFtZSArIFwiPVwiICsgb3Bjb2RlLnZhbHVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBhcmFtcyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBqPTA7IGo8b3Bjb2RlLmFyZ3MubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICBwYXJhbSA9IG9wY29kZS5hcmdzW2pdO1xuICAgICAgICAgIGlmICh0eXBlb2YgcGFyYW0gPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIHBhcmFtID0gXCJcXFwiXCIgKyBwYXJhbS5yZXBsYWNlKFwiXFxuXCIsIFwiXFxcXG5cIikgKyBcIlxcXCJcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgcGFyYW1zLnB1c2gocGFyYW0pO1xuICAgICAgICB9XG4gICAgICAgIG91dC5wdXNoKG9wY29kZS5vcGNvZGUgKyBcIiBcIiArIHBhcmFtcy5qb2luKFwiIFwiKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG91dC5qb2luKFwiXFxuXCIpO1xuICB9LFxuXG4gIGVxdWFsczogZnVuY3Rpb24ob3RoZXIpIHtcbiAgICB2YXIgbGVuID0gdGhpcy5vcGNvZGVzLmxlbmd0aDtcbiAgICBpZiAob3RoZXIub3Bjb2Rlcy5sZW5ndGggIT09IGxlbikge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIHZhciBvcGNvZGUgPSB0aGlzLm9wY29kZXNbaV0sXG4gICAgICAgICAgb3RoZXJPcGNvZGUgPSBvdGhlci5vcGNvZGVzW2ldO1xuICAgICAgaWYgKG9wY29kZS5vcGNvZGUgIT09IG90aGVyT3Bjb2RlLm9wY29kZSB8fCBvcGNvZGUuYXJncy5sZW5ndGggIT09IG90aGVyT3Bjb2RlLmFyZ3MubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgb3Bjb2RlLmFyZ3MubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgaWYgKG9wY29kZS5hcmdzW2pdICE9PSBvdGhlck9wY29kZS5hcmdzW2pdKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgbGVuID0gdGhpcy5jaGlsZHJlbi5sZW5ndGg7XG4gICAgaWYgKG90aGVyLmNoaWxkcmVuLmxlbmd0aCAhPT0gbGVuKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgaWYgKCF0aGlzLmNoaWxkcmVuW2ldLmVxdWFscyhvdGhlci5jaGlsZHJlbltpXSkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9LFxuXG4gIGd1aWQ6IDAsXG5cbiAgY29tcGlsZTogZnVuY3Rpb24ocHJvZ3JhbSwgb3B0aW9ucykge1xuICAgIHRoaXMub3Bjb2RlcyA9IFtdO1xuICAgIHRoaXMuY2hpbGRyZW4gPSBbXTtcbiAgICB0aGlzLmRlcHRocyA9IHtsaXN0OiBbXX07XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcblxuICAgIC8vIFRoZXNlIGNoYW5nZXMgd2lsbCBwcm9wYWdhdGUgdG8gdGhlIG90aGVyIGNvbXBpbGVyIGNvbXBvbmVudHNcbiAgICB2YXIga25vd25IZWxwZXJzID0gdGhpcy5vcHRpb25zLmtub3duSGVscGVycztcbiAgICB0aGlzLm9wdGlvbnMua25vd25IZWxwZXJzID0ge1xuICAgICAgJ2hlbHBlck1pc3NpbmcnOiB0cnVlLFxuICAgICAgJ2Jsb2NrSGVscGVyTWlzc2luZyc6IHRydWUsXG4gICAgICAnZWFjaCc6IHRydWUsXG4gICAgICAnaWYnOiB0cnVlLFxuICAgICAgJ3VubGVzcyc6IHRydWUsXG4gICAgICAnd2l0aCc6IHRydWUsXG4gICAgICAnbG9nJzogdHJ1ZVxuICAgIH07XG4gICAgaWYgKGtub3duSGVscGVycykge1xuICAgICAgZm9yICh2YXIgbmFtZSBpbiBrbm93bkhlbHBlcnMpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zLmtub3duSGVscGVyc1tuYW1lXSA9IGtub3duSGVscGVyc1tuYW1lXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5hY2NlcHQocHJvZ3JhbSk7XG4gIH0sXG5cbiAgYWNjZXB0OiBmdW5jdGlvbihub2RlKSB7XG4gICAgdmFyIHN0cmlwID0gbm9kZS5zdHJpcCB8fCB7fSxcbiAgICAgICAgcmV0O1xuICAgIGlmIChzdHJpcC5sZWZ0KSB7XG4gICAgICB0aGlzLm9wY29kZSgnc3RyaXAnKTtcbiAgICB9XG5cbiAgICByZXQgPSB0aGlzW25vZGUudHlwZV0obm9kZSk7XG5cbiAgICBpZiAoc3RyaXAucmlnaHQpIHtcbiAgICAgIHRoaXMub3Bjb2RlKCdzdHJpcCcpO1xuICAgIH1cblxuICAgIHJldHVybiByZXQ7XG4gIH0sXG5cbiAgcHJvZ3JhbTogZnVuY3Rpb24ocHJvZ3JhbSkge1xuICAgIHZhciBzdGF0ZW1lbnRzID0gcHJvZ3JhbS5zdGF0ZW1lbnRzO1xuXG4gICAgZm9yKHZhciBpPTAsIGw9c3RhdGVtZW50cy5sZW5ndGg7IGk8bDsgaSsrKSB7XG4gICAgICB0aGlzLmFjY2VwdChzdGF0ZW1lbnRzW2ldKTtcbiAgICB9XG4gICAgdGhpcy5pc1NpbXBsZSA9IGwgPT09IDE7XG5cbiAgICB0aGlzLmRlcHRocy5saXN0ID0gdGhpcy5kZXB0aHMubGlzdC5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgIHJldHVybiBhIC0gYjtcbiAgICB9KTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIGNvbXBpbGVQcm9ncmFtOiBmdW5jdGlvbihwcm9ncmFtKSB7XG4gICAgdmFyIHJlc3VsdCA9IG5ldyB0aGlzLmNvbXBpbGVyKCkuY29tcGlsZShwcm9ncmFtLCB0aGlzLm9wdGlvbnMpO1xuICAgIHZhciBndWlkID0gdGhpcy5ndWlkKyssIGRlcHRoO1xuXG4gICAgdGhpcy51c2VQYXJ0aWFsID0gdGhpcy51c2VQYXJ0aWFsIHx8IHJlc3VsdC51c2VQYXJ0aWFsO1xuXG4gICAgdGhpcy5jaGlsZHJlbltndWlkXSA9IHJlc3VsdDtcblxuICAgIGZvcih2YXIgaT0wLCBsPXJlc3VsdC5kZXB0aHMubGlzdC5sZW5ndGg7IGk8bDsgaSsrKSB7XG4gICAgICBkZXB0aCA9IHJlc3VsdC5kZXB0aHMubGlzdFtpXTtcblxuICAgICAgaWYoZGVwdGggPCAyKSB7IGNvbnRpbnVlOyB9XG4gICAgICBlbHNlIHsgdGhpcy5hZGREZXB0aChkZXB0aCAtIDEpOyB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGd1aWQ7XG4gIH0sXG5cbiAgYmxvY2s6IGZ1bmN0aW9uKGJsb2NrKSB7XG4gICAgdmFyIG11c3RhY2hlID0gYmxvY2subXVzdGFjaGUsXG4gICAgICAgIHByb2dyYW0gPSBibG9jay5wcm9ncmFtLFxuICAgICAgICBpbnZlcnNlID0gYmxvY2suaW52ZXJzZTtcblxuICAgIGlmIChwcm9ncmFtKSB7XG4gICAgICBwcm9ncmFtID0gdGhpcy5jb21waWxlUHJvZ3JhbShwcm9ncmFtKTtcbiAgICB9XG5cbiAgICBpZiAoaW52ZXJzZSkge1xuICAgICAgaW52ZXJzZSA9IHRoaXMuY29tcGlsZVByb2dyYW0oaW52ZXJzZSk7XG4gICAgfVxuXG4gICAgdmFyIHNleHByID0gbXVzdGFjaGUuc2V4cHI7XG4gICAgdmFyIHR5cGUgPSB0aGlzLmNsYXNzaWZ5U2V4cHIoc2V4cHIpO1xuXG4gICAgaWYgKHR5cGUgPT09IFwiaGVscGVyXCIpIHtcbiAgICAgIHRoaXMuaGVscGVyU2V4cHIoc2V4cHIsIHByb2dyYW0sIGludmVyc2UpO1xuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gXCJzaW1wbGVcIikge1xuICAgICAgdGhpcy5zaW1wbGVTZXhwcihzZXhwcik7XG5cbiAgICAgIC8vIG5vdyB0aGF0IHRoZSBzaW1wbGUgbXVzdGFjaGUgaXMgcmVzb2x2ZWQsIHdlIG5lZWQgdG9cbiAgICAgIC8vIGV2YWx1YXRlIGl0IGJ5IGV4ZWN1dGluZyBgYmxvY2tIZWxwZXJNaXNzaW5nYFxuICAgICAgdGhpcy5vcGNvZGUoJ3B1c2hQcm9ncmFtJywgcHJvZ3JhbSk7XG4gICAgICB0aGlzLm9wY29kZSgncHVzaFByb2dyYW0nLCBpbnZlcnNlKTtcbiAgICAgIHRoaXMub3Bjb2RlKCdlbXB0eUhhc2gnKTtcbiAgICAgIHRoaXMub3Bjb2RlKCdibG9ja1ZhbHVlJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuYW1iaWd1b3VzU2V4cHIoc2V4cHIsIHByb2dyYW0sIGludmVyc2UpO1xuXG4gICAgICAvLyBub3cgdGhhdCB0aGUgc2ltcGxlIG11c3RhY2hlIGlzIHJlc29sdmVkLCB3ZSBuZWVkIHRvXG4gICAgICAvLyBldmFsdWF0ZSBpdCBieSBleGVjdXRpbmcgYGJsb2NrSGVscGVyTWlzc2luZ2BcbiAgICAgIHRoaXMub3Bjb2RlKCdwdXNoUHJvZ3JhbScsIHByb2dyYW0pO1xuICAgICAgdGhpcy5vcGNvZGUoJ3B1c2hQcm9ncmFtJywgaW52ZXJzZSk7XG4gICAgICB0aGlzLm9wY29kZSgnZW1wdHlIYXNoJyk7XG4gICAgICB0aGlzLm9wY29kZSgnYW1iaWd1b3VzQmxvY2tWYWx1ZScpO1xuICAgIH1cblxuICAgIHRoaXMub3Bjb2RlKCdhcHBlbmQnKTtcbiAgfSxcblxuICBoYXNoOiBmdW5jdGlvbihoYXNoKSB7XG4gICAgdmFyIHBhaXJzID0gaGFzaC5wYWlycywgcGFpciwgdmFsO1xuXG4gICAgdGhpcy5vcGNvZGUoJ3B1c2hIYXNoJyk7XG5cbiAgICBmb3IodmFyIGk9MCwgbD1wYWlycy5sZW5ndGg7IGk8bDsgaSsrKSB7XG4gICAgICBwYWlyID0gcGFpcnNbaV07XG4gICAgICB2YWwgID0gcGFpclsxXTtcblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpbmdQYXJhbXMpIHtcbiAgICAgICAgaWYodmFsLmRlcHRoKSB7XG4gICAgICAgICAgdGhpcy5hZGREZXB0aCh2YWwuZGVwdGgpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMub3Bjb2RlKCdnZXRDb250ZXh0JywgdmFsLmRlcHRoIHx8IDApO1xuICAgICAgICB0aGlzLm9wY29kZSgncHVzaFN0cmluZ1BhcmFtJywgdmFsLnN0cmluZ01vZGVWYWx1ZSwgdmFsLnR5cGUpO1xuXG4gICAgICAgIGlmICh2YWwudHlwZSA9PT0gJ3NleHByJykge1xuICAgICAgICAgIC8vIFN1YmV4cHJlc3Npb25zIGdldCBldmFsdWF0ZWQgYW5kIHBhc3NlZCBpblxuICAgICAgICAgIC8vIGluIHN0cmluZyBwYXJhbXMgbW9kZS5cbiAgICAgICAgICB0aGlzLnNleHByKHZhbCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuYWNjZXB0KHZhbCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMub3Bjb2RlKCdhc3NpZ25Ub0hhc2gnLCBwYWlyWzBdKTtcbiAgICB9XG4gICAgdGhpcy5vcGNvZGUoJ3BvcEhhc2gnKTtcbiAgfSxcblxuICBwYXJ0aWFsOiBmdW5jdGlvbihwYXJ0aWFsKSB7XG4gICAgdmFyIHBhcnRpYWxOYW1lID0gcGFydGlhbC5wYXJ0aWFsTmFtZTtcbiAgICB0aGlzLnVzZVBhcnRpYWwgPSB0cnVlO1xuXG4gICAgaWYocGFydGlhbC5jb250ZXh0KSB7XG4gICAgICB0aGlzLklEKHBhcnRpYWwuY29udGV4dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMub3Bjb2RlKCdwdXNoJywgJ2RlcHRoMCcpO1xuICAgIH1cblxuICAgIHRoaXMub3Bjb2RlKCdpbnZva2VQYXJ0aWFsJywgcGFydGlhbE5hbWUubmFtZSk7XG4gICAgdGhpcy5vcGNvZGUoJ2FwcGVuZCcpO1xuICB9LFxuXG4gIGNvbnRlbnQ6IGZ1bmN0aW9uKGNvbnRlbnQpIHtcbiAgICB0aGlzLm9wY29kZSgnYXBwZW5kQ29udGVudCcsIGNvbnRlbnQuc3RyaW5nKTtcbiAgfSxcblxuICBtdXN0YWNoZTogZnVuY3Rpb24obXVzdGFjaGUpIHtcbiAgICB0aGlzLnNleHByKG11c3RhY2hlLnNleHByKTtcblxuICAgIGlmKG11c3RhY2hlLmVzY2FwZWQgJiYgIXRoaXMub3B0aW9ucy5ub0VzY2FwZSkge1xuICAgICAgdGhpcy5vcGNvZGUoJ2FwcGVuZEVzY2FwZWQnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5vcGNvZGUoJ2FwcGVuZCcpO1xuICAgIH1cbiAgfSxcblxuICBhbWJpZ3VvdXNTZXhwcjogZnVuY3Rpb24oc2V4cHIsIHByb2dyYW0sIGludmVyc2UpIHtcbiAgICB2YXIgaWQgPSBzZXhwci5pZCxcbiAgICAgICAgbmFtZSA9IGlkLnBhcnRzWzBdLFxuICAgICAgICBpc0Jsb2NrID0gcHJvZ3JhbSAhPSBudWxsIHx8IGludmVyc2UgIT0gbnVsbDtcblxuICAgIHRoaXMub3Bjb2RlKCdnZXRDb250ZXh0JywgaWQuZGVwdGgpO1xuXG4gICAgdGhpcy5vcGNvZGUoJ3B1c2hQcm9ncmFtJywgcHJvZ3JhbSk7XG4gICAgdGhpcy5vcGNvZGUoJ3B1c2hQcm9ncmFtJywgaW52ZXJzZSk7XG5cbiAgICB0aGlzLm9wY29kZSgnaW52b2tlQW1iaWd1b3VzJywgbmFtZSwgaXNCbG9jayk7XG4gIH0sXG5cbiAgc2ltcGxlU2V4cHI6IGZ1bmN0aW9uKHNleHByKSB7XG4gICAgdmFyIGlkID0gc2V4cHIuaWQ7XG5cbiAgICBpZiAoaWQudHlwZSA9PT0gJ0RBVEEnKSB7XG4gICAgICB0aGlzLkRBVEEoaWQpO1xuICAgIH0gZWxzZSBpZiAoaWQucGFydHMubGVuZ3RoKSB7XG4gICAgICB0aGlzLklEKGlkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gU2ltcGxpZmllZCBJRCBmb3IgYHRoaXNgXG4gICAgICB0aGlzLmFkZERlcHRoKGlkLmRlcHRoKTtcbiAgICAgIHRoaXMub3Bjb2RlKCdnZXRDb250ZXh0JywgaWQuZGVwdGgpO1xuICAgICAgdGhpcy5vcGNvZGUoJ3B1c2hDb250ZXh0Jyk7XG4gICAgfVxuXG4gICAgdGhpcy5vcGNvZGUoJ3Jlc29sdmVQb3NzaWJsZUxhbWJkYScpO1xuICB9LFxuXG4gIGhlbHBlclNleHByOiBmdW5jdGlvbihzZXhwciwgcHJvZ3JhbSwgaW52ZXJzZSkge1xuICAgIHZhciBwYXJhbXMgPSB0aGlzLnNldHVwRnVsbE11c3RhY2hlUGFyYW1zKHNleHByLCBwcm9ncmFtLCBpbnZlcnNlKSxcbiAgICAgICAgbmFtZSA9IHNleHByLmlkLnBhcnRzWzBdO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5rbm93bkhlbHBlcnNbbmFtZV0pIHtcbiAgICAgIHRoaXMub3Bjb2RlKCdpbnZva2VLbm93bkhlbHBlcicsIHBhcmFtcy5sZW5ndGgsIG5hbWUpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5vcHRpb25zLmtub3duSGVscGVyc09ubHkpIHtcbiAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oXCJZb3Ugc3BlY2lmaWVkIGtub3duSGVscGVyc09ubHksIGJ1dCB1c2VkIHRoZSB1bmtub3duIGhlbHBlciBcIiArIG5hbWUsIHNleHByKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5vcGNvZGUoJ2ludm9rZUhlbHBlcicsIHBhcmFtcy5sZW5ndGgsIG5hbWUsIHNleHByLmlzUm9vdCk7XG4gICAgfVxuICB9LFxuXG4gIHNleHByOiBmdW5jdGlvbihzZXhwcikge1xuICAgIHZhciB0eXBlID0gdGhpcy5jbGFzc2lmeVNleHByKHNleHByKTtcblxuICAgIGlmICh0eXBlID09PSBcInNpbXBsZVwiKSB7XG4gICAgICB0aGlzLnNpbXBsZVNleHByKHNleHByKTtcbiAgICB9IGVsc2UgaWYgKHR5cGUgPT09IFwiaGVscGVyXCIpIHtcbiAgICAgIHRoaXMuaGVscGVyU2V4cHIoc2V4cHIpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmFtYmlndW91c1NleHByKHNleHByKTtcbiAgICB9XG4gIH0sXG5cbiAgSUQ6IGZ1bmN0aW9uKGlkKSB7XG4gICAgdGhpcy5hZGREZXB0aChpZC5kZXB0aCk7XG4gICAgdGhpcy5vcGNvZGUoJ2dldENvbnRleHQnLCBpZC5kZXB0aCk7XG5cbiAgICB2YXIgbmFtZSA9IGlkLnBhcnRzWzBdO1xuICAgIGlmICghbmFtZSkge1xuICAgICAgdGhpcy5vcGNvZGUoJ3B1c2hDb250ZXh0Jyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMub3Bjb2RlKCdsb29rdXBPbkNvbnRleHQnLCBpZC5wYXJ0c1swXSk7XG4gICAgfVxuXG4gICAgZm9yKHZhciBpPTEsIGw9aWQucGFydHMubGVuZ3RoOyBpPGw7IGkrKykge1xuICAgICAgdGhpcy5vcGNvZGUoJ2xvb2t1cCcsIGlkLnBhcnRzW2ldKTtcbiAgICB9XG4gIH0sXG5cbiAgREFUQTogZnVuY3Rpb24oZGF0YSkge1xuICAgIHRoaXMub3B0aW9ucy5kYXRhID0gdHJ1ZTtcbiAgICBpZiAoZGF0YS5pZC5pc1Njb3BlZCB8fCBkYXRhLmlkLmRlcHRoKSB7XG4gICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKCdTY29wZWQgZGF0YSByZWZlcmVuY2VzIGFyZSBub3Qgc3VwcG9ydGVkOiAnICsgZGF0YS5vcmlnaW5hbCwgZGF0YSk7XG4gICAgfVxuXG4gICAgdGhpcy5vcGNvZGUoJ2xvb2t1cERhdGEnKTtcbiAgICB2YXIgcGFydHMgPSBkYXRhLmlkLnBhcnRzO1xuICAgIGZvcih2YXIgaT0wLCBsPXBhcnRzLmxlbmd0aDsgaTxsOyBpKyspIHtcbiAgICAgIHRoaXMub3Bjb2RlKCdsb29rdXAnLCBwYXJ0c1tpXSk7XG4gICAgfVxuICB9LFxuXG4gIFNUUklORzogZnVuY3Rpb24oc3RyaW5nKSB7XG4gICAgdGhpcy5vcGNvZGUoJ3B1c2hTdHJpbmcnLCBzdHJpbmcuc3RyaW5nKTtcbiAgfSxcblxuICBJTlRFR0VSOiBmdW5jdGlvbihpbnRlZ2VyKSB7XG4gICAgdGhpcy5vcGNvZGUoJ3B1c2hMaXRlcmFsJywgaW50ZWdlci5pbnRlZ2VyKTtcbiAgfSxcblxuICBCT09MRUFOOiBmdW5jdGlvbihib29sKSB7XG4gICAgdGhpcy5vcGNvZGUoJ3B1c2hMaXRlcmFsJywgYm9vbC5ib29sKTtcbiAgfSxcblxuICBjb21tZW50OiBmdW5jdGlvbigpIHt9LFxuXG4gIC8vIEhFTFBFUlNcbiAgb3Bjb2RlOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgdGhpcy5vcGNvZGVzLnB1c2goeyBvcGNvZGU6IG5hbWUsIGFyZ3M6IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSB9KTtcbiAgfSxcblxuICBkZWNsYXJlOiBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIHRoaXMub3Bjb2Rlcy5wdXNoKHsgb3Bjb2RlOiAnREVDTEFSRScsIG5hbWU6IG5hbWUsIHZhbHVlOiB2YWx1ZSB9KTtcbiAgfSxcblxuICBhZGREZXB0aDogZnVuY3Rpb24oZGVwdGgpIHtcbiAgICBpZihkZXB0aCA9PT0gMCkgeyByZXR1cm47IH1cblxuICAgIGlmKCF0aGlzLmRlcHRoc1tkZXB0aF0pIHtcbiAgICAgIHRoaXMuZGVwdGhzW2RlcHRoXSA9IHRydWU7XG4gICAgICB0aGlzLmRlcHRocy5saXN0LnB1c2goZGVwdGgpO1xuICAgIH1cbiAgfSxcblxuICBjbGFzc2lmeVNleHByOiBmdW5jdGlvbihzZXhwcikge1xuICAgIHZhciBpc0hlbHBlciAgID0gc2V4cHIuaXNIZWxwZXI7XG4gICAgdmFyIGlzRWxpZ2libGUgPSBzZXhwci5lbGlnaWJsZUhlbHBlcjtcbiAgICB2YXIgb3B0aW9ucyAgICA9IHRoaXMub3B0aW9ucztcblxuICAgIC8vIGlmIGFtYmlndW91cywgd2UgY2FuIHBvc3NpYmx5IHJlc29sdmUgdGhlIGFtYmlndWl0eSBub3dcbiAgICBpZiAoaXNFbGlnaWJsZSAmJiAhaXNIZWxwZXIpIHtcbiAgICAgIHZhciBuYW1lID0gc2V4cHIuaWQucGFydHNbMF07XG5cbiAgICAgIGlmIChvcHRpb25zLmtub3duSGVscGVyc1tuYW1lXSkge1xuICAgICAgICBpc0hlbHBlciA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKG9wdGlvbnMua25vd25IZWxwZXJzT25seSkge1xuICAgICAgICBpc0VsaWdpYmxlID0gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGlzSGVscGVyKSB7IHJldHVybiBcImhlbHBlclwiOyB9XG4gICAgZWxzZSBpZiAoaXNFbGlnaWJsZSkgeyByZXR1cm4gXCJhbWJpZ3VvdXNcIjsgfVxuICAgIGVsc2UgeyByZXR1cm4gXCJzaW1wbGVcIjsgfVxuICB9LFxuXG4gIHB1c2hQYXJhbXM6IGZ1bmN0aW9uKHBhcmFtcykge1xuICAgIHZhciBpID0gcGFyYW1zLmxlbmd0aCwgcGFyYW07XG5cbiAgICB3aGlsZShpLS0pIHtcbiAgICAgIHBhcmFtID0gcGFyYW1zW2ldO1xuXG4gICAgICBpZih0aGlzLm9wdGlvbnMuc3RyaW5nUGFyYW1zKSB7XG4gICAgICAgIGlmKHBhcmFtLmRlcHRoKSB7XG4gICAgICAgICAgdGhpcy5hZGREZXB0aChwYXJhbS5kZXB0aCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLm9wY29kZSgnZ2V0Q29udGV4dCcsIHBhcmFtLmRlcHRoIHx8IDApO1xuICAgICAgICB0aGlzLm9wY29kZSgncHVzaFN0cmluZ1BhcmFtJywgcGFyYW0uc3RyaW5nTW9kZVZhbHVlLCBwYXJhbS50eXBlKTtcblxuICAgICAgICBpZiAocGFyYW0udHlwZSA9PT0gJ3NleHByJykge1xuICAgICAgICAgIC8vIFN1YmV4cHJlc3Npb25zIGdldCBldmFsdWF0ZWQgYW5kIHBhc3NlZCBpblxuICAgICAgICAgIC8vIGluIHN0cmluZyBwYXJhbXMgbW9kZS5cbiAgICAgICAgICB0aGlzLnNleHByKHBhcmFtKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpc1twYXJhbS50eXBlXShwYXJhbSk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIHNldHVwRnVsbE11c3RhY2hlUGFyYW1zOiBmdW5jdGlvbihzZXhwciwgcHJvZ3JhbSwgaW52ZXJzZSkge1xuICAgIHZhciBwYXJhbXMgPSBzZXhwci5wYXJhbXM7XG4gICAgdGhpcy5wdXNoUGFyYW1zKHBhcmFtcyk7XG5cbiAgICB0aGlzLm9wY29kZSgncHVzaFByb2dyYW0nLCBwcm9ncmFtKTtcbiAgICB0aGlzLm9wY29kZSgncHVzaFByb2dyYW0nLCBpbnZlcnNlKTtcblxuICAgIGlmIChzZXhwci5oYXNoKSB7XG4gICAgICB0aGlzLmhhc2goc2V4cHIuaGFzaCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMub3Bjb2RlKCdlbXB0eUhhc2gnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcGFyYW1zO1xuICB9XG59O1xuXG5mdW5jdGlvbiBwcmVjb21waWxlKGlucHV0LCBvcHRpb25zLCBlbnYpIHtcbiAgaWYgKGlucHV0ID09IG51bGwgfHwgKHR5cGVvZiBpbnB1dCAhPT0gJ3N0cmluZycgJiYgaW5wdXQuY29uc3RydWN0b3IgIT09IGVudi5BU1QuUHJvZ3JhbU5vZGUpKSB7XG4gICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcIllvdSBtdXN0IHBhc3MgYSBzdHJpbmcgb3IgSGFuZGxlYmFycyBBU1QgdG8gSGFuZGxlYmFycy5wcmVjb21waWxlLiBZb3UgcGFzc2VkIFwiICsgaW5wdXQpO1xuICB9XG5cbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIGlmICghKCdkYXRhJyBpbiBvcHRpb25zKSkge1xuICAgIG9wdGlvbnMuZGF0YSA9IHRydWU7XG4gIH1cblxuICB2YXIgYXN0ID0gZW52LnBhcnNlKGlucHV0KTtcbiAgdmFyIGVudmlyb25tZW50ID0gbmV3IGVudi5Db21waWxlcigpLmNvbXBpbGUoYXN0LCBvcHRpb25zKTtcbiAgcmV0dXJuIG5ldyBlbnYuSmF2YVNjcmlwdENvbXBpbGVyKCkuY29tcGlsZShlbnZpcm9ubWVudCwgb3B0aW9ucyk7XG59XG5cbmV4cG9ydHMucHJlY29tcGlsZSA9IHByZWNvbXBpbGU7ZnVuY3Rpb24gY29tcGlsZShpbnB1dCwgb3B0aW9ucywgZW52KSB7XG4gIGlmIChpbnB1dCA9PSBudWxsIHx8ICh0eXBlb2YgaW5wdXQgIT09ICdzdHJpbmcnICYmIGlucHV0LmNvbnN0cnVjdG9yICE9PSBlbnYuQVNULlByb2dyYW1Ob2RlKSkge1xuICAgIHRocm93IG5ldyBFeGNlcHRpb24oXCJZb3UgbXVzdCBwYXNzIGEgc3RyaW5nIG9yIEhhbmRsZWJhcnMgQVNUIHRvIEhhbmRsZWJhcnMuY29tcGlsZS4gWW91IHBhc3NlZCBcIiArIGlucHV0KTtcbiAgfVxuXG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIGlmICghKCdkYXRhJyBpbiBvcHRpb25zKSkge1xuICAgIG9wdGlvbnMuZGF0YSA9IHRydWU7XG4gIH1cblxuICB2YXIgY29tcGlsZWQ7XG5cbiAgZnVuY3Rpb24gY29tcGlsZUlucHV0KCkge1xuICAgIHZhciBhc3QgPSBlbnYucGFyc2UoaW5wdXQpO1xuICAgIHZhciBlbnZpcm9ubWVudCA9IG5ldyBlbnYuQ29tcGlsZXIoKS5jb21waWxlKGFzdCwgb3B0aW9ucyk7XG4gICAgdmFyIHRlbXBsYXRlU3BlYyA9IG5ldyBlbnYuSmF2YVNjcmlwdENvbXBpbGVyKCkuY29tcGlsZShlbnZpcm9ubWVudCwgb3B0aW9ucywgdW5kZWZpbmVkLCB0cnVlKTtcbiAgICByZXR1cm4gZW52LnRlbXBsYXRlKHRlbXBsYXRlU3BlYyk7XG4gIH1cblxuICAvLyBUZW1wbGF0ZSBpcyBvbmx5IGNvbXBpbGVkIG9uIGZpcnN0IHVzZSBhbmQgY2FjaGVkIGFmdGVyIHRoYXQgcG9pbnQuXG4gIHJldHVybiBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgaWYgKCFjb21waWxlZCkge1xuICAgICAgY29tcGlsZWQgPSBjb21waWxlSW5wdXQoKTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbXBpbGVkLmNhbGwodGhpcywgY29udGV4dCwgb3B0aW9ucyk7XG4gIH07XG59XG5cbmV4cG9ydHMuY29tcGlsZSA9IGNvbXBpbGU7IiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgQ09NUElMRVJfUkVWSVNJT04gPSByZXF1aXJlKFwiLi4vYmFzZVwiKS5DT01QSUxFUl9SRVZJU0lPTjtcbnZhciBSRVZJU0lPTl9DSEFOR0VTID0gcmVxdWlyZShcIi4uL2Jhc2VcIikuUkVWSVNJT05fQ0hBTkdFUztcbnZhciBsb2cgPSByZXF1aXJlKFwiLi4vYmFzZVwiKS5sb2c7XG52YXIgRXhjZXB0aW9uID0gcmVxdWlyZShcIi4uL2V4Y2VwdGlvblwiKVtcImRlZmF1bHRcIl07XG5cbmZ1bmN0aW9uIExpdGVyYWwodmFsdWUpIHtcbiAgdGhpcy52YWx1ZSA9IHZhbHVlO1xufVxuXG5mdW5jdGlvbiBKYXZhU2NyaXB0Q29tcGlsZXIoKSB7fVxuXG5KYXZhU2NyaXB0Q29tcGlsZXIucHJvdG90eXBlID0ge1xuICAvLyBQVUJMSUMgQVBJOiBZb3UgY2FuIG92ZXJyaWRlIHRoZXNlIG1ldGhvZHMgaW4gYSBzdWJjbGFzcyB0byBwcm92aWRlXG4gIC8vIGFsdGVybmF0aXZlIGNvbXBpbGVkIGZvcm1zIGZvciBuYW1lIGxvb2t1cCBhbmQgYnVmZmVyaW5nIHNlbWFudGljc1xuICBuYW1lTG9va3VwOiBmdW5jdGlvbihwYXJlbnQsIG5hbWUgLyogLCB0eXBlKi8pIHtcbiAgICB2YXIgd3JhcCxcbiAgICAgICAgcmV0O1xuICAgIGlmIChwYXJlbnQuaW5kZXhPZignZGVwdGgnKSA9PT0gMCkge1xuICAgICAgd3JhcCA9IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKC9eWzAtOV0rJC8udGVzdChuYW1lKSkge1xuICAgICAgcmV0ID0gcGFyZW50ICsgXCJbXCIgKyBuYW1lICsgXCJdXCI7XG4gICAgfSBlbHNlIGlmIChKYXZhU2NyaXB0Q29tcGlsZXIuaXNWYWxpZEphdmFTY3JpcHRWYXJpYWJsZU5hbWUobmFtZSkpIHtcbiAgICAgIHJldCA9IHBhcmVudCArIFwiLlwiICsgbmFtZTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICByZXQgPSBwYXJlbnQgKyBcIlsnXCIgKyBuYW1lICsgXCInXVwiO1xuICAgIH1cblxuICAgIGlmICh3cmFwKSB7XG4gICAgICByZXR1cm4gJygnICsgcGFyZW50ICsgJyAmJiAnICsgcmV0ICsgJyknO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gcmV0O1xuICAgIH1cbiAgfSxcblxuICBjb21waWxlckluZm86IGZ1bmN0aW9uKCkge1xuICAgIHZhciByZXZpc2lvbiA9IENPTVBJTEVSX1JFVklTSU9OLFxuICAgICAgICB2ZXJzaW9ucyA9IFJFVklTSU9OX0NIQU5HRVNbcmV2aXNpb25dO1xuICAgIHJldHVybiBcInRoaXMuY29tcGlsZXJJbmZvID0gW1wiK3JldmlzaW9uK1wiLCdcIit2ZXJzaW9ucytcIiddO1xcblwiO1xuICB9LFxuXG4gIGFwcGVuZFRvQnVmZmVyOiBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICBpZiAodGhpcy5lbnZpcm9ubWVudC5pc1NpbXBsZSkge1xuICAgICAgcmV0dXJuIFwicmV0dXJuIFwiICsgc3RyaW5nICsgXCI7XCI7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGFwcGVuZFRvQnVmZmVyOiB0cnVlLFxuICAgICAgICBjb250ZW50OiBzdHJpbmcsXG4gICAgICAgIHRvU3RyaW5nOiBmdW5jdGlvbigpIHsgcmV0dXJuIFwiYnVmZmVyICs9IFwiICsgc3RyaW5nICsgXCI7XCI7IH1cbiAgICAgIH07XG4gICAgfVxuICB9LFxuXG4gIGluaXRpYWxpemVCdWZmZXI6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnF1b3RlZFN0cmluZyhcIlwiKTtcbiAgfSxcblxuICBuYW1lc3BhY2U6IFwiSGFuZGxlYmFyc1wiLFxuICAvLyBFTkQgUFVCTElDIEFQSVxuXG4gIGNvbXBpbGU6IGZ1bmN0aW9uKGVudmlyb25tZW50LCBvcHRpb25zLCBjb250ZXh0LCBhc09iamVjdCkge1xuICAgIHRoaXMuZW52aXJvbm1lbnQgPSBlbnZpcm9ubWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgbG9nKCdkZWJ1ZycsIHRoaXMuZW52aXJvbm1lbnQuZGlzYXNzZW1ibGUoKSArIFwiXFxuXFxuXCIpO1xuXG4gICAgdGhpcy5uYW1lID0gdGhpcy5lbnZpcm9ubWVudC5uYW1lO1xuICAgIHRoaXMuaXNDaGlsZCA9ICEhY29udGV4dDtcbiAgICB0aGlzLmNvbnRleHQgPSBjb250ZXh0IHx8IHtcbiAgICAgIHByb2dyYW1zOiBbXSxcbiAgICAgIGVudmlyb25tZW50czogW10sXG4gICAgICBhbGlhc2VzOiB7IH1cbiAgICB9O1xuXG4gICAgdGhpcy5wcmVhbWJsZSgpO1xuXG4gICAgdGhpcy5zdGFja1Nsb3QgPSAwO1xuICAgIHRoaXMuc3RhY2tWYXJzID0gW107XG4gICAgdGhpcy5yZWdpc3RlcnMgPSB7IGxpc3Q6IFtdIH07XG4gICAgdGhpcy5oYXNoZXMgPSBbXTtcbiAgICB0aGlzLmNvbXBpbGVTdGFjayA9IFtdO1xuICAgIHRoaXMuaW5saW5lU3RhY2sgPSBbXTtcblxuICAgIHRoaXMuY29tcGlsZUNoaWxkcmVuKGVudmlyb25tZW50LCBvcHRpb25zKTtcblxuICAgIHZhciBvcGNvZGVzID0gZW52aXJvbm1lbnQub3Bjb2Rlcywgb3Bjb2RlO1xuXG4gICAgdGhpcy5pID0gMDtcblxuICAgIGZvcih2YXIgbD1vcGNvZGVzLmxlbmd0aDsgdGhpcy5pPGw7IHRoaXMuaSsrKSB7XG4gICAgICBvcGNvZGUgPSBvcGNvZGVzW3RoaXMuaV07XG5cbiAgICAgIGlmKG9wY29kZS5vcGNvZGUgPT09ICdERUNMQVJFJykge1xuICAgICAgICB0aGlzW29wY29kZS5uYW1lXSA9IG9wY29kZS52YWx1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXNbb3Bjb2RlLm9wY29kZV0uYXBwbHkodGhpcywgb3Bjb2RlLmFyZ3MpO1xuICAgICAgfVxuXG4gICAgICAvLyBSZXNldCB0aGUgc3RyaXBOZXh0IGZsYWcgaWYgaXQgd2FzIG5vdCBzZXQgYnkgdGhpcyBvcGVyYXRpb24uXG4gICAgICBpZiAob3Bjb2RlLm9wY29kZSAhPT0gdGhpcy5zdHJpcE5leHQpIHtcbiAgICAgICAgdGhpcy5zdHJpcE5leHQgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBGbHVzaCBhbnkgdHJhaWxpbmcgY29udGVudCB0aGF0IG1pZ2h0IGJlIHBlbmRpbmcuXG4gICAgdGhpcy5wdXNoU291cmNlKCcnKTtcblxuICAgIGlmICh0aGlzLnN0YWNrU2xvdCB8fCB0aGlzLmlubGluZVN0YWNrLmxlbmd0aCB8fCB0aGlzLmNvbXBpbGVTdGFjay5sZW5ndGgpIHtcbiAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oJ0NvbXBpbGUgY29tcGxldGVkIHdpdGggY29udGVudCBsZWZ0IG9uIHN0YWNrJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuY3JlYXRlRnVuY3Rpb25Db250ZXh0KGFzT2JqZWN0KTtcbiAgfSxcblxuICBwcmVhbWJsZTogZnVuY3Rpb24oKSB7XG4gICAgdmFyIG91dCA9IFtdO1xuXG4gICAgaWYgKCF0aGlzLmlzQ2hpbGQpIHtcbiAgICAgIHZhciBuYW1lc3BhY2UgPSB0aGlzLm5hbWVzcGFjZTtcblxuICAgICAgdmFyIGNvcGllcyA9IFwiaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgXCIgKyBuYW1lc3BhY2UgKyBcIi5oZWxwZXJzKTtcIjtcbiAgICAgIGlmICh0aGlzLmVudmlyb25tZW50LnVzZVBhcnRpYWwpIHsgY29waWVzID0gY29waWVzICsgXCIgcGFydGlhbHMgPSB0aGlzLm1lcmdlKHBhcnRpYWxzLCBcIiArIG5hbWVzcGFjZSArIFwiLnBhcnRpYWxzKTtcIjsgfVxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5kYXRhKSB7IGNvcGllcyA9IGNvcGllcyArIFwiIGRhdGEgPSBkYXRhIHx8IHt9O1wiOyB9XG4gICAgICBvdXQucHVzaChjb3BpZXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQucHVzaCgnJyk7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLmVudmlyb25tZW50LmlzU2ltcGxlKSB7XG4gICAgICBvdXQucHVzaChcIiwgYnVmZmVyID0gXCIgKyB0aGlzLmluaXRpYWxpemVCdWZmZXIoKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dC5wdXNoKFwiXCIpO1xuICAgIH1cblxuICAgIC8vIHRyYWNrIHRoZSBsYXN0IGNvbnRleHQgcHVzaGVkIGludG8gcGxhY2UgdG8gYWxsb3cgc2tpcHBpbmcgdGhlXG4gICAgLy8gZ2V0Q29udGV4dCBvcGNvZGUgd2hlbiBpdCB3b3VsZCBiZSBhIG5vb3BcbiAgICB0aGlzLmxhc3RDb250ZXh0ID0gMDtcbiAgICB0aGlzLnNvdXJjZSA9IG91dDtcbiAgfSxcblxuICBjcmVhdGVGdW5jdGlvbkNvbnRleHQ6IGZ1bmN0aW9uKGFzT2JqZWN0KSB7XG4gICAgdmFyIGxvY2FscyA9IHRoaXMuc3RhY2tWYXJzLmNvbmNhdCh0aGlzLnJlZ2lzdGVycy5saXN0KTtcblxuICAgIGlmKGxvY2Fscy5sZW5ndGggPiAwKSB7XG4gICAgICB0aGlzLnNvdXJjZVsxXSA9IHRoaXMuc291cmNlWzFdICsgXCIsIFwiICsgbG9jYWxzLmpvaW4oXCIsIFwiKTtcbiAgICB9XG5cbiAgICAvLyBHZW5lcmF0ZSBtaW5pbWl6ZXIgYWxpYXMgbWFwcGluZ3NcbiAgICBpZiAoIXRoaXMuaXNDaGlsZCkge1xuICAgICAgZm9yICh2YXIgYWxpYXMgaW4gdGhpcy5jb250ZXh0LmFsaWFzZXMpIHtcbiAgICAgICAgaWYgKHRoaXMuY29udGV4dC5hbGlhc2VzLmhhc093blByb3BlcnR5KGFsaWFzKSkge1xuICAgICAgICAgIHRoaXMuc291cmNlWzFdID0gdGhpcy5zb3VyY2VbMV0gKyAnLCAnICsgYWxpYXMgKyAnPScgKyB0aGlzLmNvbnRleHQuYWxpYXNlc1thbGlhc107XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy5zb3VyY2VbMV0pIHtcbiAgICAgIHRoaXMuc291cmNlWzFdID0gXCJ2YXIgXCIgKyB0aGlzLnNvdXJjZVsxXS5zdWJzdHJpbmcoMikgKyBcIjtcIjtcbiAgICB9XG5cbiAgICAvLyBNZXJnZSBjaGlsZHJlblxuICAgIGlmICghdGhpcy5pc0NoaWxkKSB7XG4gICAgICB0aGlzLnNvdXJjZVsxXSArPSAnXFxuJyArIHRoaXMuY29udGV4dC5wcm9ncmFtcy5qb2luKCdcXG4nKSArICdcXG4nO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5lbnZpcm9ubWVudC5pc1NpbXBsZSkge1xuICAgICAgdGhpcy5wdXNoU291cmNlKFwicmV0dXJuIGJ1ZmZlcjtcIik7XG4gICAgfVxuXG4gICAgdmFyIHBhcmFtcyA9IHRoaXMuaXNDaGlsZCA/IFtcImRlcHRoMFwiLCBcImRhdGFcIl0gOiBbXCJIYW5kbGViYXJzXCIsIFwiZGVwdGgwXCIsIFwiaGVscGVyc1wiLCBcInBhcnRpYWxzXCIsIFwiZGF0YVwiXTtcblxuICAgIGZvcih2YXIgaT0wLCBsPXRoaXMuZW52aXJvbm1lbnQuZGVwdGhzLmxpc3QubGVuZ3RoOyBpPGw7IGkrKykge1xuICAgICAgcGFyYW1zLnB1c2goXCJkZXB0aFwiICsgdGhpcy5lbnZpcm9ubWVudC5kZXB0aHMubGlzdFtpXSk7XG4gICAgfVxuXG4gICAgLy8gUGVyZm9ybSBhIHNlY29uZCBwYXNzIG92ZXIgdGhlIG91dHB1dCB0byBtZXJnZSBjb250ZW50IHdoZW4gcG9zc2libGVcbiAgICB2YXIgc291cmNlID0gdGhpcy5tZXJnZVNvdXJjZSgpO1xuXG4gICAgaWYgKCF0aGlzLmlzQ2hpbGQpIHtcbiAgICAgIHNvdXJjZSA9IHRoaXMuY29tcGlsZXJJbmZvKCkrc291cmNlO1xuICAgIH1cblxuICAgIGlmIChhc09iamVjdCkge1xuICAgICAgcGFyYW1zLnB1c2goc291cmNlKTtcblxuICAgICAgcmV0dXJuIEZ1bmN0aW9uLmFwcGx5KHRoaXMsIHBhcmFtcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBmdW5jdGlvblNvdXJjZSA9ICdmdW5jdGlvbiAnICsgKHRoaXMubmFtZSB8fCAnJykgKyAnKCcgKyBwYXJhbXMuam9pbignLCcpICsgJykge1xcbiAgJyArIHNvdXJjZSArICd9JztcbiAgICAgIGxvZygnZGVidWcnLCBmdW5jdGlvblNvdXJjZSArIFwiXFxuXFxuXCIpO1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uU291cmNlO1xuICAgIH1cbiAgfSxcbiAgbWVyZ2VTb3VyY2U6IGZ1bmN0aW9uKCkge1xuICAgIC8vIFdBUk46IFdlIGFyZSBub3QgaGFuZGxpbmcgdGhlIGNhc2Ugd2hlcmUgYnVmZmVyIGlzIHN0aWxsIHBvcHVsYXRlZCBhcyB0aGUgc291cmNlIHNob3VsZFxuICAgIC8vIG5vdCBoYXZlIGJ1ZmZlciBhcHBlbmQgb3BlcmF0aW9ucyBhcyB0aGVpciBmaW5hbCBhY3Rpb24uXG4gICAgdmFyIHNvdXJjZSA9ICcnLFxuICAgICAgICBidWZmZXI7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHRoaXMuc291cmNlLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICB2YXIgbGluZSA9IHRoaXMuc291cmNlW2ldO1xuICAgICAgaWYgKGxpbmUuYXBwZW5kVG9CdWZmZXIpIHtcbiAgICAgICAgaWYgKGJ1ZmZlcikge1xuICAgICAgICAgIGJ1ZmZlciA9IGJ1ZmZlciArICdcXG4gICAgKyAnICsgbGluZS5jb250ZW50O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGJ1ZmZlciA9IGxpbmUuY29udGVudDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGJ1ZmZlcikge1xuICAgICAgICAgIHNvdXJjZSArPSAnYnVmZmVyICs9ICcgKyBidWZmZXIgKyAnO1xcbiAgJztcbiAgICAgICAgICBidWZmZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgc291cmNlICs9IGxpbmUgKyAnXFxuICAnO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc291cmNlO1xuICB9LFxuXG4gIC8vIFtibG9ja1ZhbHVlXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiBoYXNoLCBpbnZlcnNlLCBwcm9ncmFtLCB2YWx1ZVxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IHJldHVybiB2YWx1ZSBvZiBibG9ja0hlbHBlck1pc3NpbmdcbiAgLy9cbiAgLy8gVGhlIHB1cnBvc2Ugb2YgdGhpcyBvcGNvZGUgaXMgdG8gdGFrZSBhIGJsb2NrIG9mIHRoZSBmb3JtXG4gIC8vIGB7eyNmb299fS4uLnt7L2Zvb319YCwgcmVzb2x2ZSB0aGUgdmFsdWUgb2YgYGZvb2AsIGFuZFxuICAvLyByZXBsYWNlIGl0IG9uIHRoZSBzdGFjayB3aXRoIHRoZSByZXN1bHQgb2YgcHJvcGVybHlcbiAgLy8gaW52b2tpbmcgYmxvY2tIZWxwZXJNaXNzaW5nLlxuICBibG9ja1ZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmNvbnRleHQuYWxpYXNlcy5ibG9ja0hlbHBlck1pc3NpbmcgPSAnaGVscGVycy5ibG9ja0hlbHBlck1pc3NpbmcnO1xuXG4gICAgdmFyIHBhcmFtcyA9IFtcImRlcHRoMFwiXTtcbiAgICB0aGlzLnNldHVwUGFyYW1zKDAsIHBhcmFtcyk7XG5cbiAgICB0aGlzLnJlcGxhY2VTdGFjayhmdW5jdGlvbihjdXJyZW50KSB7XG4gICAgICBwYXJhbXMuc3BsaWNlKDEsIDAsIGN1cnJlbnQpO1xuICAgICAgcmV0dXJuIFwiYmxvY2tIZWxwZXJNaXNzaW5nLmNhbGwoXCIgKyBwYXJhbXMuam9pbihcIiwgXCIpICsgXCIpXCI7XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8gW2FtYmlndW91c0Jsb2NrVmFsdWVdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IGhhc2gsIGludmVyc2UsIHByb2dyYW0sIHZhbHVlXG4gIC8vIENvbXBpbGVyIHZhbHVlLCBiZWZvcmU6IGxhc3RIZWxwZXI9dmFsdWUgb2YgbGFzdCBmb3VuZCBoZWxwZXIsIGlmIGFueVxuICAvLyBPbiBzdGFjaywgYWZ0ZXIsIGlmIG5vIGxhc3RIZWxwZXI6IHNhbWUgYXMgW2Jsb2NrVmFsdWVdXG4gIC8vIE9uIHN0YWNrLCBhZnRlciwgaWYgbGFzdEhlbHBlcjogdmFsdWVcbiAgYW1iaWd1b3VzQmxvY2tWYWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5jb250ZXh0LmFsaWFzZXMuYmxvY2tIZWxwZXJNaXNzaW5nID0gJ2hlbHBlcnMuYmxvY2tIZWxwZXJNaXNzaW5nJztcblxuICAgIHZhciBwYXJhbXMgPSBbXCJkZXB0aDBcIl07XG4gICAgdGhpcy5zZXR1cFBhcmFtcygwLCBwYXJhbXMpO1xuXG4gICAgdmFyIGN1cnJlbnQgPSB0aGlzLnRvcFN0YWNrKCk7XG4gICAgcGFyYW1zLnNwbGljZSgxLCAwLCBjdXJyZW50KTtcblxuICAgIHRoaXMucHVzaFNvdXJjZShcImlmICghXCIgKyB0aGlzLmxhc3RIZWxwZXIgKyBcIikgeyBcIiArIGN1cnJlbnQgKyBcIiA9IGJsb2NrSGVscGVyTWlzc2luZy5jYWxsKFwiICsgcGFyYW1zLmpvaW4oXCIsIFwiKSArIFwiKTsgfVwiKTtcbiAgfSxcblxuICAvLyBbYXBwZW5kQ29udGVudF1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogLi4uXG4gIC8vXG4gIC8vIEFwcGVuZHMgdGhlIHN0cmluZyB2YWx1ZSBvZiBgY29udGVudGAgdG8gdGhlIGN1cnJlbnQgYnVmZmVyXG4gIGFwcGVuZENvbnRlbnQ6IGZ1bmN0aW9uKGNvbnRlbnQpIHtcbiAgICBpZiAodGhpcy5wZW5kaW5nQ29udGVudCkge1xuICAgICAgY29udGVudCA9IHRoaXMucGVuZGluZ0NvbnRlbnQgKyBjb250ZW50O1xuICAgIH1cbiAgICBpZiAodGhpcy5zdHJpcE5leHQpIHtcbiAgICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoL15cXHMrLywgJycpO1xuICAgIH1cblxuICAgIHRoaXMucGVuZGluZ0NvbnRlbnQgPSBjb250ZW50O1xuICB9LFxuXG4gIC8vIFtzdHJpcF1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogLi4uXG4gIC8vXG4gIC8vIFJlbW92ZXMgYW55IHRyYWlsaW5nIHdoaXRlc3BhY2UgZnJvbSB0aGUgcHJpb3IgY29udGVudCBub2RlIGFuZCBmbGFnc1xuICAvLyB0aGUgbmV4dCBvcGVyYXRpb24gZm9yIHN0cmlwcGluZyBpZiBpdCBpcyBhIGNvbnRlbnQgbm9kZS5cbiAgc3RyaXA6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLnBlbmRpbmdDb250ZW50KSB7XG4gICAgICB0aGlzLnBlbmRpbmdDb250ZW50ID0gdGhpcy5wZW5kaW5nQ29udGVudC5yZXBsYWNlKC9cXHMrJC8sICcnKTtcbiAgICB9XG4gICAgdGhpcy5zdHJpcE5leHQgPSAnc3RyaXAnO1xuICB9LFxuXG4gIC8vIFthcHBlbmRdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IHZhbHVlLCAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiAuLi5cbiAgLy9cbiAgLy8gQ29lcmNlcyBgdmFsdWVgIHRvIGEgU3RyaW5nIGFuZCBhcHBlbmRzIGl0IHRvIHRoZSBjdXJyZW50IGJ1ZmZlci5cbiAgLy9cbiAgLy8gSWYgYHZhbHVlYCBpcyB0cnV0aHksIG9yIDAsIGl0IGlzIGNvZXJjZWQgaW50byBhIHN0cmluZyBhbmQgYXBwZW5kZWRcbiAgLy8gT3RoZXJ3aXNlLCB0aGUgZW1wdHkgc3RyaW5nIGlzIGFwcGVuZGVkXG4gIGFwcGVuZDogZnVuY3Rpb24oKSB7XG4gICAgLy8gRm9yY2UgYW55dGhpbmcgdGhhdCBpcyBpbmxpbmVkIG9udG8gdGhlIHN0YWNrIHNvIHdlIGRvbid0IGhhdmUgZHVwbGljYXRpb25cbiAgICAvLyB3aGVuIHdlIGV4YW1pbmUgbG9jYWxcbiAgICB0aGlzLmZsdXNoSW5saW5lKCk7XG4gICAgdmFyIGxvY2FsID0gdGhpcy5wb3BTdGFjaygpO1xuICAgIHRoaXMucHVzaFNvdXJjZShcImlmKFwiICsgbG9jYWwgKyBcIiB8fCBcIiArIGxvY2FsICsgXCIgPT09IDApIHsgXCIgKyB0aGlzLmFwcGVuZFRvQnVmZmVyKGxvY2FsKSArIFwiIH1cIik7XG4gICAgaWYgKHRoaXMuZW52aXJvbm1lbnQuaXNTaW1wbGUpIHtcbiAgICAgIHRoaXMucHVzaFNvdXJjZShcImVsc2UgeyBcIiArIHRoaXMuYXBwZW5kVG9CdWZmZXIoXCInJ1wiKSArIFwiIH1cIik7XG4gICAgfVxuICB9LFxuXG4gIC8vIFthcHBlbmRFc2NhcGVkXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiB2YWx1ZSwgLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogLi4uXG4gIC8vXG4gIC8vIEVzY2FwZSBgdmFsdWVgIGFuZCBhcHBlbmQgaXQgdG8gdGhlIGJ1ZmZlclxuICBhcHBlbmRFc2NhcGVkOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmNvbnRleHQuYWxpYXNlcy5lc2NhcGVFeHByZXNzaW9uID0gJ3RoaXMuZXNjYXBlRXhwcmVzc2lvbic7XG5cbiAgICB0aGlzLnB1c2hTb3VyY2UodGhpcy5hcHBlbmRUb0J1ZmZlcihcImVzY2FwZUV4cHJlc3Npb24oXCIgKyB0aGlzLnBvcFN0YWNrKCkgKyBcIilcIikpO1xuICB9LFxuXG4gIC8vIFtnZXRDb250ZXh0XVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiAuLi5cbiAgLy8gQ29tcGlsZXIgdmFsdWUsIGFmdGVyOiBsYXN0Q29udGV4dD1kZXB0aFxuICAvL1xuICAvLyBTZXQgdGhlIHZhbHVlIG9mIHRoZSBgbGFzdENvbnRleHRgIGNvbXBpbGVyIHZhbHVlIHRvIHRoZSBkZXB0aFxuICBnZXRDb250ZXh0OiBmdW5jdGlvbihkZXB0aCkge1xuICAgIGlmKHRoaXMubGFzdENvbnRleHQgIT09IGRlcHRoKSB7XG4gICAgICB0aGlzLmxhc3RDb250ZXh0ID0gZGVwdGg7XG4gICAgfVxuICB9LFxuXG4gIC8vIFtsb29rdXBPbkNvbnRleHRdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IGN1cnJlbnRDb250ZXh0W25hbWVdLCAuLi5cbiAgLy9cbiAgLy8gTG9va3MgdXAgdGhlIHZhbHVlIG9mIGBuYW1lYCBvbiB0aGUgY3VycmVudCBjb250ZXh0IGFuZCBwdXNoZXNcbiAgLy8gaXQgb250byB0aGUgc3RhY2suXG4gIGxvb2t1cE9uQ29udGV4dDogZnVuY3Rpb24obmFtZSkge1xuICAgIHRoaXMucHVzaCh0aGlzLm5hbWVMb29rdXAoJ2RlcHRoJyArIHRoaXMubGFzdENvbnRleHQsIG5hbWUsICdjb250ZXh0JykpO1xuICB9LFxuXG4gIC8vIFtwdXNoQ29udGV4dF1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogY3VycmVudENvbnRleHQsIC4uLlxuICAvL1xuICAvLyBQdXNoZXMgdGhlIHZhbHVlIG9mIHRoZSBjdXJyZW50IGNvbnRleHQgb250byB0aGUgc3RhY2suXG4gIHB1c2hDb250ZXh0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnB1c2hTdGFja0xpdGVyYWwoJ2RlcHRoJyArIHRoaXMubGFzdENvbnRleHQpO1xuICB9LFxuXG4gIC8vIFtyZXNvbHZlUG9zc2libGVMYW1iZGFdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IHZhbHVlLCAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiByZXNvbHZlZCB2YWx1ZSwgLi4uXG4gIC8vXG4gIC8vIElmIHRoZSBgdmFsdWVgIGlzIGEgbGFtYmRhLCByZXBsYWNlIGl0IG9uIHRoZSBzdGFjayBieVxuICAvLyB0aGUgcmV0dXJuIHZhbHVlIG9mIHRoZSBsYW1iZGFcbiAgcmVzb2x2ZVBvc3NpYmxlTGFtYmRhOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmNvbnRleHQuYWxpYXNlcy5mdW5jdGlvblR5cGUgPSAnXCJmdW5jdGlvblwiJztcblxuICAgIHRoaXMucmVwbGFjZVN0YWNrKGZ1bmN0aW9uKGN1cnJlbnQpIHtcbiAgICAgIHJldHVybiBcInR5cGVvZiBcIiArIGN1cnJlbnQgKyBcIiA9PT0gZnVuY3Rpb25UeXBlID8gXCIgKyBjdXJyZW50ICsgXCIuYXBwbHkoZGVwdGgwKSA6IFwiICsgY3VycmVudDtcbiAgICB9KTtcbiAgfSxcblxuICAvLyBbbG9va3VwXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiB2YWx1ZSwgLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogdmFsdWVbbmFtZV0sIC4uLlxuICAvL1xuICAvLyBSZXBsYWNlIHRoZSB2YWx1ZSBvbiB0aGUgc3RhY2sgd2l0aCB0aGUgcmVzdWx0IG9mIGxvb2tpbmdcbiAgLy8gdXAgYG5hbWVgIG9uIGB2YWx1ZWBcbiAgbG9va3VwOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgdGhpcy5yZXBsYWNlU3RhY2soZnVuY3Rpb24oY3VycmVudCkge1xuICAgICAgcmV0dXJuIGN1cnJlbnQgKyBcIiA9PSBudWxsIHx8IFwiICsgY3VycmVudCArIFwiID09PSBmYWxzZSA/IFwiICsgY3VycmVudCArIFwiIDogXCIgKyB0aGlzLm5hbWVMb29rdXAoY3VycmVudCwgbmFtZSwgJ2NvbnRleHQnKTtcbiAgICB9KTtcbiAgfSxcblxuICAvLyBbbG9va3VwRGF0YV1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogZGF0YSwgLi4uXG4gIC8vXG4gIC8vIFB1c2ggdGhlIGRhdGEgbG9va3VwIG9wZXJhdG9yXG4gIGxvb2t1cERhdGE6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucHVzaFN0YWNrTGl0ZXJhbCgnZGF0YScpO1xuICB9LFxuXG4gIC8vIFtwdXNoU3RyaW5nUGFyYW1dXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IHN0cmluZywgY3VycmVudENvbnRleHQsIC4uLlxuICAvL1xuICAvLyBUaGlzIG9wY29kZSBpcyBkZXNpZ25lZCBmb3IgdXNlIGluIHN0cmluZyBtb2RlLCB3aGljaFxuICAvLyBwcm92aWRlcyB0aGUgc3RyaW5nIHZhbHVlIG9mIGEgcGFyYW1ldGVyIGFsb25nIHdpdGggaXRzXG4gIC8vIGRlcHRoIHJhdGhlciB0aGFuIHJlc29sdmluZyBpdCBpbW1lZGlhdGVseS5cbiAgcHVzaFN0cmluZ1BhcmFtOiBmdW5jdGlvbihzdHJpbmcsIHR5cGUpIHtcbiAgICB0aGlzLnB1c2hTdGFja0xpdGVyYWwoJ2RlcHRoJyArIHRoaXMubGFzdENvbnRleHQpO1xuXG4gICAgdGhpcy5wdXNoU3RyaW5nKHR5cGUpO1xuXG4gICAgLy8gSWYgaXQncyBhIHN1YmV4cHJlc3Npb24sIHRoZSBzdHJpbmcgcmVzdWx0XG4gICAgLy8gd2lsbCBiZSBwdXNoZWQgYWZ0ZXIgdGhpcyBvcGNvZGUuXG4gICAgaWYgKHR5cGUgIT09ICdzZXhwcicpIHtcbiAgICAgIGlmICh0eXBlb2Ygc3RyaW5nID09PSAnc3RyaW5nJykge1xuICAgICAgICB0aGlzLnB1c2hTdHJpbmcoc3RyaW5nKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMucHVzaFN0YWNrTGl0ZXJhbChzdHJpbmcpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBlbXB0eUhhc2g6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucHVzaFN0YWNrTGl0ZXJhbCgne30nKTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaW5nUGFyYW1zKSB7XG4gICAgICB0aGlzLnB1c2goJ3t9Jyk7IC8vIGhhc2hDb250ZXh0c1xuICAgICAgdGhpcy5wdXNoKCd7fScpOyAvLyBoYXNoVHlwZXNcbiAgICB9XG4gIH0sXG4gIHB1c2hIYXNoOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5oYXNoKSB7XG4gICAgICB0aGlzLmhhc2hlcy5wdXNoKHRoaXMuaGFzaCk7XG4gICAgfVxuICAgIHRoaXMuaGFzaCA9IHt2YWx1ZXM6IFtdLCB0eXBlczogW10sIGNvbnRleHRzOiBbXX07XG4gIH0sXG4gIHBvcEhhc2g6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBoYXNoID0gdGhpcy5oYXNoO1xuICAgIHRoaXMuaGFzaCA9IHRoaXMuaGFzaGVzLnBvcCgpO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpbmdQYXJhbXMpIHtcbiAgICAgIHRoaXMucHVzaCgneycgKyBoYXNoLmNvbnRleHRzLmpvaW4oJywnKSArICd9Jyk7XG4gICAgICB0aGlzLnB1c2goJ3snICsgaGFzaC50eXBlcy5qb2luKCcsJykgKyAnfScpO1xuICAgIH1cblxuICAgIHRoaXMucHVzaCgne1xcbiAgICAnICsgaGFzaC52YWx1ZXMuam9pbignLFxcbiAgICAnKSArICdcXG4gIH0nKTtcbiAgfSxcblxuICAvLyBbcHVzaFN0cmluZ11cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogcXVvdGVkU3RyaW5nKHN0cmluZyksIC4uLlxuICAvL1xuICAvLyBQdXNoIGEgcXVvdGVkIHZlcnNpb24gb2YgYHN0cmluZ2Agb250byB0aGUgc3RhY2tcbiAgcHVzaFN0cmluZzogZnVuY3Rpb24oc3RyaW5nKSB7XG4gICAgdGhpcy5wdXNoU3RhY2tMaXRlcmFsKHRoaXMucXVvdGVkU3RyaW5nKHN0cmluZykpO1xuICB9LFxuXG4gIC8vIFtwdXNoXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiBleHByLCAuLi5cbiAgLy9cbiAgLy8gUHVzaCBhbiBleHByZXNzaW9uIG9udG8gdGhlIHN0YWNrXG4gIHB1c2g6IGZ1bmN0aW9uKGV4cHIpIHtcbiAgICB0aGlzLmlubGluZVN0YWNrLnB1c2goZXhwcik7XG4gICAgcmV0dXJuIGV4cHI7XG4gIH0sXG5cbiAgLy8gW3B1c2hMaXRlcmFsXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiB2YWx1ZSwgLi4uXG4gIC8vXG4gIC8vIFB1c2hlcyBhIHZhbHVlIG9udG8gdGhlIHN0YWNrLiBUaGlzIG9wZXJhdGlvbiBwcmV2ZW50c1xuICAvLyB0aGUgY29tcGlsZXIgZnJvbSBjcmVhdGluZyBhIHRlbXBvcmFyeSB2YXJpYWJsZSB0byBob2xkXG4gIC8vIGl0LlxuICBwdXNoTGl0ZXJhbDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICB0aGlzLnB1c2hTdGFja0xpdGVyYWwodmFsdWUpO1xuICB9LFxuXG4gIC8vIFtwdXNoUHJvZ3JhbV1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogcHJvZ3JhbShndWlkKSwgLi4uXG4gIC8vXG4gIC8vIFB1c2ggYSBwcm9ncmFtIGV4cHJlc3Npb24gb250byB0aGUgc3RhY2suIFRoaXMgdGFrZXNcbiAgLy8gYSBjb21waWxlLXRpbWUgZ3VpZCBhbmQgY29udmVydHMgaXQgaW50byBhIHJ1bnRpbWUtYWNjZXNzaWJsZVxuICAvLyBleHByZXNzaW9uLlxuICBwdXNoUHJvZ3JhbTogZnVuY3Rpb24oZ3VpZCkge1xuICAgIGlmIChndWlkICE9IG51bGwpIHtcbiAgICAgIHRoaXMucHVzaFN0YWNrTGl0ZXJhbCh0aGlzLnByb2dyYW1FeHByZXNzaW9uKGd1aWQpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5wdXNoU3RhY2tMaXRlcmFsKG51bGwpO1xuICAgIH1cbiAgfSxcblxuICAvLyBbaW52b2tlSGVscGVyXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiBoYXNoLCBpbnZlcnNlLCBwcm9ncmFtLCBwYXJhbXMuLi4sIC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IHJlc3VsdCBvZiBoZWxwZXIgaW52b2NhdGlvblxuICAvL1xuICAvLyBQb3BzIG9mZiB0aGUgaGVscGVyJ3MgcGFyYW1ldGVycywgaW52b2tlcyB0aGUgaGVscGVyLFxuICAvLyBhbmQgcHVzaGVzIHRoZSBoZWxwZXIncyByZXR1cm4gdmFsdWUgb250byB0aGUgc3RhY2suXG4gIC8vXG4gIC8vIElmIHRoZSBoZWxwZXIgaXMgbm90IGZvdW5kLCBgaGVscGVyTWlzc2luZ2AgaXMgY2FsbGVkLlxuICBpbnZva2VIZWxwZXI6IGZ1bmN0aW9uKHBhcmFtU2l6ZSwgbmFtZSwgaXNSb290KSB7XG4gICAgdGhpcy5jb250ZXh0LmFsaWFzZXMuaGVscGVyTWlzc2luZyA9ICdoZWxwZXJzLmhlbHBlck1pc3NpbmcnO1xuICAgIHRoaXMudXNlUmVnaXN0ZXIoJ2hlbHBlcicpO1xuXG4gICAgdmFyIGhlbHBlciA9IHRoaXMubGFzdEhlbHBlciA9IHRoaXMuc2V0dXBIZWxwZXIocGFyYW1TaXplLCBuYW1lLCB0cnVlKTtcbiAgICB2YXIgbm9uSGVscGVyID0gdGhpcy5uYW1lTG9va3VwKCdkZXB0aCcgKyB0aGlzLmxhc3RDb250ZXh0LCBuYW1lLCAnY29udGV4dCcpO1xuXG4gICAgdmFyIGxvb2t1cCA9ICdoZWxwZXIgPSAnICsgaGVscGVyLm5hbWUgKyAnIHx8ICcgKyBub25IZWxwZXI7XG4gICAgaWYgKGhlbHBlci5wYXJhbXNJbml0KSB7XG4gICAgICBsb29rdXAgKz0gJywnICsgaGVscGVyLnBhcmFtc0luaXQ7XG4gICAgfVxuXG4gICAgdGhpcy5wdXNoKFxuICAgICAgJygnXG4gICAgICAgICsgbG9va3VwXG4gICAgICAgICsgJyxoZWxwZXIgJ1xuICAgICAgICAgICsgJz8gaGVscGVyLmNhbGwoJyArIGhlbHBlci5jYWxsUGFyYW1zICsgJykgJ1xuICAgICAgICAgICsgJzogaGVscGVyTWlzc2luZy5jYWxsKCcgKyBoZWxwZXIuaGVscGVyTWlzc2luZ1BhcmFtcyArICcpKScpO1xuXG4gICAgLy8gQWx3YXlzIGZsdXNoIHN1YmV4cHJlc3Npb25zLiBUaGlzIGlzIGJvdGggdG8gcHJldmVudCB0aGUgY29tcG91bmRpbmcgc2l6ZSBpc3N1ZSB0aGF0XG4gICAgLy8gb2NjdXJzIHdoZW4gdGhlIGNvZGUgaGFzIHRvIGJlIGR1cGxpY2F0ZWQgZm9yIGlubGluaW5nIGFuZCBhbHNvIHRvIHByZXZlbnQgZXJyb3JzXG4gICAgLy8gZHVlIHRvIHRoZSBpbmNvcnJlY3Qgb3B0aW9ucyBvYmplY3QgYmVpbmcgcGFzc2VkIGR1ZSB0byB0aGUgc2hhcmVkIHJlZ2lzdGVyLlxuICAgIGlmICghaXNSb290KSB7XG4gICAgICB0aGlzLmZsdXNoSW5saW5lKCk7XG4gICAgfVxuICB9LFxuXG4gIC8vIFtpbnZva2VLbm93bkhlbHBlcl1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogaGFzaCwgaW52ZXJzZSwgcHJvZ3JhbSwgcGFyYW1zLi4uLCAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiByZXN1bHQgb2YgaGVscGVyIGludm9jYXRpb25cbiAgLy9cbiAgLy8gVGhpcyBvcGVyYXRpb24gaXMgdXNlZCB3aGVuIHRoZSBoZWxwZXIgaXMga25vd24gdG8gZXhpc3QsXG4gIC8vIHNvIGEgYGhlbHBlck1pc3NpbmdgIGZhbGxiYWNrIGlzIG5vdCByZXF1aXJlZC5cbiAgaW52b2tlS25vd25IZWxwZXI6IGZ1bmN0aW9uKHBhcmFtU2l6ZSwgbmFtZSkge1xuICAgIHZhciBoZWxwZXIgPSB0aGlzLnNldHVwSGVscGVyKHBhcmFtU2l6ZSwgbmFtZSk7XG4gICAgdGhpcy5wdXNoKGhlbHBlci5uYW1lICsgXCIuY2FsbChcIiArIGhlbHBlci5jYWxsUGFyYW1zICsgXCIpXCIpO1xuICB9LFxuXG4gIC8vIFtpbnZva2VBbWJpZ3VvdXNdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IGhhc2gsIGludmVyc2UsIHByb2dyYW0sIHBhcmFtcy4uLiwgLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogcmVzdWx0IG9mIGRpc2FtYmlndWF0aW9uXG4gIC8vXG4gIC8vIFRoaXMgb3BlcmF0aW9uIGlzIHVzZWQgd2hlbiBhbiBleHByZXNzaW9uIGxpa2UgYHt7Zm9vfX1gXG4gIC8vIGlzIHByb3ZpZGVkLCBidXQgd2UgZG9uJ3Qga25vdyBhdCBjb21waWxlLXRpbWUgd2hldGhlciBpdFxuICAvLyBpcyBhIGhlbHBlciBvciBhIHBhdGguXG4gIC8vXG4gIC8vIFRoaXMgb3BlcmF0aW9uIGVtaXRzIG1vcmUgY29kZSB0aGFuIHRoZSBvdGhlciBvcHRpb25zLFxuICAvLyBhbmQgY2FuIGJlIGF2b2lkZWQgYnkgcGFzc2luZyB0aGUgYGtub3duSGVscGVyc2AgYW5kXG4gIC8vIGBrbm93bkhlbHBlcnNPbmx5YCBmbGFncyBhdCBjb21waWxlLXRpbWUuXG4gIGludm9rZUFtYmlndW91czogZnVuY3Rpb24obmFtZSwgaGVscGVyQ2FsbCkge1xuICAgIHRoaXMuY29udGV4dC5hbGlhc2VzLmZ1bmN0aW9uVHlwZSA9ICdcImZ1bmN0aW9uXCInO1xuICAgIHRoaXMudXNlUmVnaXN0ZXIoJ2hlbHBlcicpO1xuXG4gICAgdGhpcy5lbXB0eUhhc2goKTtcbiAgICB2YXIgaGVscGVyID0gdGhpcy5zZXR1cEhlbHBlcigwLCBuYW1lLCBoZWxwZXJDYWxsKTtcblxuICAgIHZhciBoZWxwZXJOYW1lID0gdGhpcy5sYXN0SGVscGVyID0gdGhpcy5uYW1lTG9va3VwKCdoZWxwZXJzJywgbmFtZSwgJ2hlbHBlcicpO1xuXG4gICAgdmFyIG5vbkhlbHBlciA9IHRoaXMubmFtZUxvb2t1cCgnZGVwdGgnICsgdGhpcy5sYXN0Q29udGV4dCwgbmFtZSwgJ2NvbnRleHQnKTtcbiAgICB2YXIgbmV4dFN0YWNrID0gdGhpcy5uZXh0U3RhY2soKTtcblxuICAgIGlmIChoZWxwZXIucGFyYW1zSW5pdCkge1xuICAgICAgdGhpcy5wdXNoU291cmNlKGhlbHBlci5wYXJhbXNJbml0KTtcbiAgICB9XG4gICAgdGhpcy5wdXNoU291cmNlKCdpZiAoaGVscGVyID0gJyArIGhlbHBlck5hbWUgKyAnKSB7ICcgKyBuZXh0U3RhY2sgKyAnID0gaGVscGVyLmNhbGwoJyArIGhlbHBlci5jYWxsUGFyYW1zICsgJyk7IH0nKTtcbiAgICB0aGlzLnB1c2hTb3VyY2UoJ2Vsc2UgeyBoZWxwZXIgPSAnICsgbm9uSGVscGVyICsgJzsgJyArIG5leHRTdGFjayArICcgPSB0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbCgnICsgaGVscGVyLmNhbGxQYXJhbXMgKyAnKSA6IGhlbHBlcjsgfScpO1xuICB9LFxuXG4gIC8vIFtpbnZva2VQYXJ0aWFsXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiBjb250ZXh0LCAuLi5cbiAgLy8gT24gc3RhY2sgYWZ0ZXI6IHJlc3VsdCBvZiBwYXJ0aWFsIGludm9jYXRpb25cbiAgLy9cbiAgLy8gVGhpcyBvcGVyYXRpb24gcG9wcyBvZmYgYSBjb250ZXh0LCBpbnZva2VzIGEgcGFydGlhbCB3aXRoIHRoYXQgY29udGV4dCxcbiAgLy8gYW5kIHB1c2hlcyB0aGUgcmVzdWx0IG9mIHRoZSBpbnZvY2F0aW9uIGJhY2suXG4gIGludm9rZVBhcnRpYWw6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgcGFyYW1zID0gW3RoaXMubmFtZUxvb2t1cCgncGFydGlhbHMnLCBuYW1lLCAncGFydGlhbCcpLCBcIidcIiArIG5hbWUgKyBcIidcIiwgdGhpcy5wb3BTdGFjaygpLCBcImhlbHBlcnNcIiwgXCJwYXJ0aWFsc1wiXTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuZGF0YSkge1xuICAgICAgcGFyYW1zLnB1c2goXCJkYXRhXCIpO1xuICAgIH1cblxuICAgIHRoaXMuY29udGV4dC5hbGlhc2VzLnNlbGYgPSBcInRoaXNcIjtcbiAgICB0aGlzLnB1c2goXCJzZWxmLmludm9rZVBhcnRpYWwoXCIgKyBwYXJhbXMuam9pbihcIiwgXCIpICsgXCIpXCIpO1xuICB9LFxuXG4gIC8vIFthc3NpZ25Ub0hhc2hdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IHZhbHVlLCBoYXNoLCAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiBoYXNoLCAuLi5cbiAgLy9cbiAgLy8gUG9wcyBhIHZhbHVlIGFuZCBoYXNoIG9mZiB0aGUgc3RhY2ssIGFzc2lnbnMgYGhhc2hba2V5XSA9IHZhbHVlYFxuICAvLyBhbmQgcHVzaGVzIHRoZSBoYXNoIGJhY2sgb250byB0aGUgc3RhY2suXG4gIGFzc2lnblRvSGFzaDogZnVuY3Rpb24oa2V5KSB7XG4gICAgdmFyIHZhbHVlID0gdGhpcy5wb3BTdGFjaygpLFxuICAgICAgICBjb250ZXh0LFxuICAgICAgICB0eXBlO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpbmdQYXJhbXMpIHtcbiAgICAgIHR5cGUgPSB0aGlzLnBvcFN0YWNrKCk7XG4gICAgICBjb250ZXh0ID0gdGhpcy5wb3BTdGFjaygpO1xuICAgIH1cblxuICAgIHZhciBoYXNoID0gdGhpcy5oYXNoO1xuICAgIGlmIChjb250ZXh0KSB7XG4gICAgICBoYXNoLmNvbnRleHRzLnB1c2goXCInXCIgKyBrZXkgKyBcIic6IFwiICsgY29udGV4dCk7XG4gICAgfVxuICAgIGlmICh0eXBlKSB7XG4gICAgICBoYXNoLnR5cGVzLnB1c2goXCInXCIgKyBrZXkgKyBcIic6IFwiICsgdHlwZSk7XG4gICAgfVxuICAgIGhhc2gudmFsdWVzLnB1c2goXCInXCIgKyBrZXkgKyBcIic6IChcIiArIHZhbHVlICsgXCIpXCIpO1xuICB9LFxuXG4gIC8vIEhFTFBFUlNcblxuICBjb21waWxlcjogSmF2YVNjcmlwdENvbXBpbGVyLFxuXG4gIGNvbXBpbGVDaGlsZHJlbjogZnVuY3Rpb24oZW52aXJvbm1lbnQsIG9wdGlvbnMpIHtcbiAgICB2YXIgY2hpbGRyZW4gPSBlbnZpcm9ubWVudC5jaGlsZHJlbiwgY2hpbGQsIGNvbXBpbGVyO1xuXG4gICAgZm9yKHZhciBpPTAsIGw9Y2hpbGRyZW4ubGVuZ3RoOyBpPGw7IGkrKykge1xuICAgICAgY2hpbGQgPSBjaGlsZHJlbltpXTtcbiAgICAgIGNvbXBpbGVyID0gbmV3IHRoaXMuY29tcGlsZXIoKTtcblxuICAgICAgdmFyIGluZGV4ID0gdGhpcy5tYXRjaEV4aXN0aW5nUHJvZ3JhbShjaGlsZCk7XG5cbiAgICAgIGlmIChpbmRleCA9PSBudWxsKSB7XG4gICAgICAgIHRoaXMuY29udGV4dC5wcm9ncmFtcy5wdXNoKCcnKTsgICAgIC8vIFBsYWNlaG9sZGVyIHRvIHByZXZlbnQgbmFtZSBjb25mbGljdHMgZm9yIG5lc3RlZCBjaGlsZHJlblxuICAgICAgICBpbmRleCA9IHRoaXMuY29udGV4dC5wcm9ncmFtcy5sZW5ndGg7XG4gICAgICAgIGNoaWxkLmluZGV4ID0gaW5kZXg7XG4gICAgICAgIGNoaWxkLm5hbWUgPSAncHJvZ3JhbScgKyBpbmRleDtcbiAgICAgICAgdGhpcy5jb250ZXh0LnByb2dyYW1zW2luZGV4XSA9IGNvbXBpbGVyLmNvbXBpbGUoY2hpbGQsIG9wdGlvbnMsIHRoaXMuY29udGV4dCk7XG4gICAgICAgIHRoaXMuY29udGV4dC5lbnZpcm9ubWVudHNbaW5kZXhdID0gY2hpbGQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjaGlsZC5pbmRleCA9IGluZGV4O1xuICAgICAgICBjaGlsZC5uYW1lID0gJ3Byb2dyYW0nICsgaW5kZXg7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBtYXRjaEV4aXN0aW5nUHJvZ3JhbTogZnVuY3Rpb24oY2hpbGQpIHtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gdGhpcy5jb250ZXh0LmVudmlyb25tZW50cy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgdmFyIGVudmlyb25tZW50ID0gdGhpcy5jb250ZXh0LmVudmlyb25tZW50c1tpXTtcbiAgICAgIGlmIChlbnZpcm9ubWVudCAmJiBlbnZpcm9ubWVudC5lcXVhbHMoY2hpbGQpKSB7XG4gICAgICAgIHJldHVybiBpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBwcm9ncmFtRXhwcmVzc2lvbjogZnVuY3Rpb24oZ3VpZCkge1xuICAgIHRoaXMuY29udGV4dC5hbGlhc2VzLnNlbGYgPSBcInRoaXNcIjtcblxuICAgIGlmKGd1aWQgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIFwic2VsZi5ub29wXCI7XG4gICAgfVxuXG4gICAgdmFyIGNoaWxkID0gdGhpcy5lbnZpcm9ubWVudC5jaGlsZHJlbltndWlkXSxcbiAgICAgICAgZGVwdGhzID0gY2hpbGQuZGVwdGhzLmxpc3QsIGRlcHRoO1xuXG4gICAgdmFyIHByb2dyYW1QYXJhbXMgPSBbY2hpbGQuaW5kZXgsIGNoaWxkLm5hbWUsIFwiZGF0YVwiXTtcblxuICAgIGZvcih2YXIgaT0wLCBsID0gZGVwdGhzLmxlbmd0aDsgaTxsOyBpKyspIHtcbiAgICAgIGRlcHRoID0gZGVwdGhzW2ldO1xuXG4gICAgICBpZihkZXB0aCA9PT0gMSkgeyBwcm9ncmFtUGFyYW1zLnB1c2goXCJkZXB0aDBcIik7IH1cbiAgICAgIGVsc2UgeyBwcm9ncmFtUGFyYW1zLnB1c2goXCJkZXB0aFwiICsgKGRlcHRoIC0gMSkpOyB9XG4gICAgfVxuXG4gICAgcmV0dXJuIChkZXB0aHMubGVuZ3RoID09PSAwID8gXCJzZWxmLnByb2dyYW0oXCIgOiBcInNlbGYucHJvZ3JhbVdpdGhEZXB0aChcIikgKyBwcm9ncmFtUGFyYW1zLmpvaW4oXCIsIFwiKSArIFwiKVwiO1xuICB9LFxuXG4gIHJlZ2lzdGVyOiBmdW5jdGlvbihuYW1lLCB2YWwpIHtcbiAgICB0aGlzLnVzZVJlZ2lzdGVyKG5hbWUpO1xuICAgIHRoaXMucHVzaFNvdXJjZShuYW1lICsgXCIgPSBcIiArIHZhbCArIFwiO1wiKTtcbiAgfSxcblxuICB1c2VSZWdpc3RlcjogZnVuY3Rpb24obmFtZSkge1xuICAgIGlmKCF0aGlzLnJlZ2lzdGVyc1tuYW1lXSkge1xuICAgICAgdGhpcy5yZWdpc3RlcnNbbmFtZV0gPSB0cnVlO1xuICAgICAgdGhpcy5yZWdpc3RlcnMubGlzdC5wdXNoKG5hbWUpO1xuICAgIH1cbiAgfSxcblxuICBwdXNoU3RhY2tMaXRlcmFsOiBmdW5jdGlvbihpdGVtKSB7XG4gICAgcmV0dXJuIHRoaXMucHVzaChuZXcgTGl0ZXJhbChpdGVtKSk7XG4gIH0sXG5cbiAgcHVzaFNvdXJjZTogZnVuY3Rpb24oc291cmNlKSB7XG4gICAgaWYgKHRoaXMucGVuZGluZ0NvbnRlbnQpIHtcbiAgICAgIHRoaXMuc291cmNlLnB1c2godGhpcy5hcHBlbmRUb0J1ZmZlcih0aGlzLnF1b3RlZFN0cmluZyh0aGlzLnBlbmRpbmdDb250ZW50KSkpO1xuICAgICAgdGhpcy5wZW5kaW5nQ29udGVudCA9IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBpZiAoc291cmNlKSB7XG4gICAgICB0aGlzLnNvdXJjZS5wdXNoKHNvdXJjZSk7XG4gICAgfVxuICB9LFxuXG4gIHB1c2hTdGFjazogZnVuY3Rpb24oaXRlbSkge1xuICAgIHRoaXMuZmx1c2hJbmxpbmUoKTtcblxuICAgIHZhciBzdGFjayA9IHRoaXMuaW5jclN0YWNrKCk7XG4gICAgaWYgKGl0ZW0pIHtcbiAgICAgIHRoaXMucHVzaFNvdXJjZShzdGFjayArIFwiID0gXCIgKyBpdGVtICsgXCI7XCIpO1xuICAgIH1cbiAgICB0aGlzLmNvbXBpbGVTdGFjay5wdXNoKHN0YWNrKTtcbiAgICByZXR1cm4gc3RhY2s7XG4gIH0sXG5cbiAgcmVwbGFjZVN0YWNrOiBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIHZhciBwcmVmaXggPSAnJyxcbiAgICAgICAgaW5saW5lID0gdGhpcy5pc0lubGluZSgpLFxuICAgICAgICBzdGFjayxcbiAgICAgICAgY3JlYXRlZFN0YWNrLFxuICAgICAgICB1c2VkTGl0ZXJhbDtcblxuICAgIC8vIElmIHdlIGFyZSBjdXJyZW50bHkgaW5saW5lIHRoZW4gd2Ugd2FudCB0byBtZXJnZSB0aGUgaW5saW5lIHN0YXRlbWVudCBpbnRvIHRoZVxuICAgIC8vIHJlcGxhY2VtZW50IHN0YXRlbWVudCB2aWEgJywnXG4gICAgaWYgKGlubGluZSkge1xuICAgICAgdmFyIHRvcCA9IHRoaXMucG9wU3RhY2sodHJ1ZSk7XG5cbiAgICAgIGlmICh0b3AgaW5zdGFuY2VvZiBMaXRlcmFsKSB7XG4gICAgICAgIC8vIExpdGVyYWxzIGRvIG5vdCBuZWVkIHRvIGJlIGlubGluZWRcbiAgICAgICAgc3RhY2sgPSB0b3AudmFsdWU7XG4gICAgICAgIHVzZWRMaXRlcmFsID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEdldCBvciBjcmVhdGUgdGhlIGN1cnJlbnQgc3RhY2sgbmFtZSBmb3IgdXNlIGJ5IHRoZSBpbmxpbmVcbiAgICAgICAgY3JlYXRlZFN0YWNrID0gIXRoaXMuc3RhY2tTbG90O1xuICAgICAgICB2YXIgbmFtZSA9ICFjcmVhdGVkU3RhY2sgPyB0aGlzLnRvcFN0YWNrTmFtZSgpIDogdGhpcy5pbmNyU3RhY2soKTtcblxuICAgICAgICBwcmVmaXggPSAnKCcgKyB0aGlzLnB1c2gobmFtZSkgKyAnID0gJyArIHRvcCArICcpLCc7XG4gICAgICAgIHN0YWNrID0gdGhpcy50b3BTdGFjaygpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzdGFjayA9IHRoaXMudG9wU3RhY2soKTtcbiAgICB9XG5cbiAgICB2YXIgaXRlbSA9IGNhbGxiYWNrLmNhbGwodGhpcywgc3RhY2spO1xuXG4gICAgaWYgKGlubGluZSkge1xuICAgICAgaWYgKCF1c2VkTGl0ZXJhbCkge1xuICAgICAgICB0aGlzLnBvcFN0YWNrKCk7XG4gICAgICB9XG4gICAgICBpZiAoY3JlYXRlZFN0YWNrKSB7XG4gICAgICAgIHRoaXMuc3RhY2tTbG90LS07XG4gICAgICB9XG4gICAgICB0aGlzLnB1c2goJygnICsgcHJlZml4ICsgaXRlbSArICcpJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFByZXZlbnQgbW9kaWZpY2F0aW9uIG9mIHRoZSBjb250ZXh0IGRlcHRoIHZhcmlhYmxlLiBUaHJvdWdoIHJlcGxhY2VTdGFja1xuICAgICAgaWYgKCEvXnN0YWNrLy50ZXN0KHN0YWNrKSkge1xuICAgICAgICBzdGFjayA9IHRoaXMubmV4dFN0YWNrKCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMucHVzaFNvdXJjZShzdGFjayArIFwiID0gKFwiICsgcHJlZml4ICsgaXRlbSArIFwiKTtcIik7XG4gICAgfVxuICAgIHJldHVybiBzdGFjaztcbiAgfSxcblxuICBuZXh0U3RhY2s6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnB1c2hTdGFjaygpO1xuICB9LFxuXG4gIGluY3JTdGFjazogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zdGFja1Nsb3QrKztcbiAgICBpZih0aGlzLnN0YWNrU2xvdCA+IHRoaXMuc3RhY2tWYXJzLmxlbmd0aCkgeyB0aGlzLnN0YWNrVmFycy5wdXNoKFwic3RhY2tcIiArIHRoaXMuc3RhY2tTbG90KTsgfVxuICAgIHJldHVybiB0aGlzLnRvcFN0YWNrTmFtZSgpO1xuICB9LFxuICB0b3BTdGFja05hbWU6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBcInN0YWNrXCIgKyB0aGlzLnN0YWNrU2xvdDtcbiAgfSxcbiAgZmx1c2hJbmxpbmU6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpbmxpbmVTdGFjayA9IHRoaXMuaW5saW5lU3RhY2s7XG4gICAgaWYgKGlubGluZVN0YWNrLmxlbmd0aCkge1xuICAgICAgdGhpcy5pbmxpbmVTdGFjayA9IFtdO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGlubGluZVN0YWNrLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIHZhciBlbnRyeSA9IGlubGluZVN0YWNrW2ldO1xuICAgICAgICBpZiAoZW50cnkgaW5zdGFuY2VvZiBMaXRlcmFsKSB7XG4gICAgICAgICAgdGhpcy5jb21waWxlU3RhY2sucHVzaChlbnRyeSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5wdXNoU3RhY2soZW50cnkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBpc0lubGluZTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuaW5saW5lU3RhY2subGVuZ3RoO1xuICB9LFxuXG4gIHBvcFN0YWNrOiBmdW5jdGlvbih3cmFwcGVkKSB7XG4gICAgdmFyIGlubGluZSA9IHRoaXMuaXNJbmxpbmUoKSxcbiAgICAgICAgaXRlbSA9IChpbmxpbmUgPyB0aGlzLmlubGluZVN0YWNrIDogdGhpcy5jb21waWxlU3RhY2spLnBvcCgpO1xuXG4gICAgaWYgKCF3cmFwcGVkICYmIChpdGVtIGluc3RhbmNlb2YgTGl0ZXJhbCkpIHtcbiAgICAgIHJldHVybiBpdGVtLnZhbHVlO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoIWlubGluZSkge1xuICAgICAgICBpZiAoIXRoaXMuc3RhY2tTbG90KSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbignSW52YWxpZCBzdGFjayBwb3AnKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnN0YWNrU2xvdC0tO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGl0ZW07XG4gICAgfVxuICB9LFxuXG4gIHRvcFN0YWNrOiBmdW5jdGlvbih3cmFwcGVkKSB7XG4gICAgdmFyIHN0YWNrID0gKHRoaXMuaXNJbmxpbmUoKSA/IHRoaXMuaW5saW5lU3RhY2sgOiB0aGlzLmNvbXBpbGVTdGFjayksXG4gICAgICAgIGl0ZW0gPSBzdGFja1tzdGFjay5sZW5ndGggLSAxXTtcblxuICAgIGlmICghd3JhcHBlZCAmJiAoaXRlbSBpbnN0YW5jZW9mIExpdGVyYWwpKSB7XG4gICAgICByZXR1cm4gaXRlbS52YWx1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGl0ZW07XG4gICAgfVxuICB9LFxuXG4gIHF1b3RlZFN0cmluZzogZnVuY3Rpb24oc3RyKSB7XG4gICAgcmV0dXJuICdcIicgKyBzdHJcbiAgICAgIC5yZXBsYWNlKC9cXFxcL2csICdcXFxcXFxcXCcpXG4gICAgICAucmVwbGFjZSgvXCIvZywgJ1xcXFxcIicpXG4gICAgICAucmVwbGFjZSgvXFxuL2csICdcXFxcbicpXG4gICAgICAucmVwbGFjZSgvXFxyL2csICdcXFxccicpXG4gICAgICAucmVwbGFjZSgvXFx1MjAyOC9nLCAnXFxcXHUyMDI4JykgICAvLyBQZXIgRWNtYS0yNjIgNy4zICsgNy44LjRcbiAgICAgIC5yZXBsYWNlKC9cXHUyMDI5L2csICdcXFxcdTIwMjknKSArICdcIic7XG4gIH0sXG5cbiAgc2V0dXBIZWxwZXI6IGZ1bmN0aW9uKHBhcmFtU2l6ZSwgbmFtZSwgbWlzc2luZ1BhcmFtcykge1xuICAgIHZhciBwYXJhbXMgPSBbXSxcbiAgICAgICAgcGFyYW1zSW5pdCA9IHRoaXMuc2V0dXBQYXJhbXMocGFyYW1TaXplLCBwYXJhbXMsIG1pc3NpbmdQYXJhbXMpO1xuICAgIHZhciBmb3VuZEhlbHBlciA9IHRoaXMubmFtZUxvb2t1cCgnaGVscGVycycsIG5hbWUsICdoZWxwZXInKTtcblxuICAgIHJldHVybiB7XG4gICAgICBwYXJhbXM6IHBhcmFtcyxcbiAgICAgIHBhcmFtc0luaXQ6IHBhcmFtc0luaXQsXG4gICAgICBuYW1lOiBmb3VuZEhlbHBlcixcbiAgICAgIGNhbGxQYXJhbXM6IFtcImRlcHRoMFwiXS5jb25jYXQocGFyYW1zKS5qb2luKFwiLCBcIiksXG4gICAgICBoZWxwZXJNaXNzaW5nUGFyYW1zOiBtaXNzaW5nUGFyYW1zICYmIFtcImRlcHRoMFwiLCB0aGlzLnF1b3RlZFN0cmluZyhuYW1lKV0uY29uY2F0KHBhcmFtcykuam9pbihcIiwgXCIpXG4gICAgfTtcbiAgfSxcblxuICBzZXR1cE9wdGlvbnM6IGZ1bmN0aW9uKHBhcmFtU2l6ZSwgcGFyYW1zKSB7XG4gICAgdmFyIG9wdGlvbnMgPSBbXSwgY29udGV4dHMgPSBbXSwgdHlwZXMgPSBbXSwgcGFyYW0sIGludmVyc2UsIHByb2dyYW07XG5cbiAgICBvcHRpb25zLnB1c2goXCJoYXNoOlwiICsgdGhpcy5wb3BTdGFjaygpKTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaW5nUGFyYW1zKSB7XG4gICAgICBvcHRpb25zLnB1c2goXCJoYXNoVHlwZXM6XCIgKyB0aGlzLnBvcFN0YWNrKCkpO1xuICAgICAgb3B0aW9ucy5wdXNoKFwiaGFzaENvbnRleHRzOlwiICsgdGhpcy5wb3BTdGFjaygpKTtcbiAgICB9XG5cbiAgICBpbnZlcnNlID0gdGhpcy5wb3BTdGFjaygpO1xuICAgIHByb2dyYW0gPSB0aGlzLnBvcFN0YWNrKCk7XG5cbiAgICAvLyBBdm9pZCBzZXR0aW5nIGZuIGFuZCBpbnZlcnNlIGlmIG5laXRoZXIgYXJlIHNldC4gVGhpcyBhbGxvd3NcbiAgICAvLyBoZWxwZXJzIHRvIGRvIGEgY2hlY2sgZm9yIGBpZiAob3B0aW9ucy5mbilgXG4gICAgaWYgKHByb2dyYW0gfHwgaW52ZXJzZSkge1xuICAgICAgaWYgKCFwcm9ncmFtKSB7XG4gICAgICAgIHRoaXMuY29udGV4dC5hbGlhc2VzLnNlbGYgPSBcInRoaXNcIjtcbiAgICAgICAgcHJvZ3JhbSA9IFwic2VsZi5ub29wXCI7XG4gICAgICB9XG5cbiAgICAgIGlmICghaW52ZXJzZSkge1xuICAgICAgICB0aGlzLmNvbnRleHQuYWxpYXNlcy5zZWxmID0gXCJ0aGlzXCI7XG4gICAgICAgIGludmVyc2UgPSBcInNlbGYubm9vcFwiO1xuICAgICAgfVxuXG4gICAgICBvcHRpb25zLnB1c2goXCJpbnZlcnNlOlwiICsgaW52ZXJzZSk7XG4gICAgICBvcHRpb25zLnB1c2goXCJmbjpcIiArIHByb2dyYW0pO1xuICAgIH1cblxuICAgIGZvcih2YXIgaT0wOyBpPHBhcmFtU2l6ZTsgaSsrKSB7XG4gICAgICBwYXJhbSA9IHRoaXMucG9wU3RhY2soKTtcbiAgICAgIHBhcmFtcy5wdXNoKHBhcmFtKTtcblxuICAgICAgaWYodGhpcy5vcHRpb25zLnN0cmluZ1BhcmFtcykge1xuICAgICAgICB0eXBlcy5wdXNoKHRoaXMucG9wU3RhY2soKSk7XG4gICAgICAgIGNvbnRleHRzLnB1c2godGhpcy5wb3BTdGFjaygpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmluZ1BhcmFtcykge1xuICAgICAgb3B0aW9ucy5wdXNoKFwiY29udGV4dHM6W1wiICsgY29udGV4dHMuam9pbihcIixcIikgKyBcIl1cIik7XG4gICAgICBvcHRpb25zLnB1c2goXCJ0eXBlczpbXCIgKyB0eXBlcy5qb2luKFwiLFwiKSArIFwiXVwiKTtcbiAgICB9XG5cbiAgICBpZih0aGlzLm9wdGlvbnMuZGF0YSkge1xuICAgICAgb3B0aW9ucy5wdXNoKFwiZGF0YTpkYXRhXCIpO1xuICAgIH1cblxuICAgIHJldHVybiBvcHRpb25zO1xuICB9LFxuXG4gIC8vIHRoZSBwYXJhbXMgYW5kIGNvbnRleHRzIGFyZ3VtZW50cyBhcmUgcGFzc2VkIGluIGFycmF5c1xuICAvLyB0byBmaWxsIGluXG4gIHNldHVwUGFyYW1zOiBmdW5jdGlvbihwYXJhbVNpemUsIHBhcmFtcywgdXNlUmVnaXN0ZXIpIHtcbiAgICB2YXIgb3B0aW9ucyA9ICd7JyArIHRoaXMuc2V0dXBPcHRpb25zKHBhcmFtU2l6ZSwgcGFyYW1zKS5qb2luKCcsJykgKyAnfSc7XG5cbiAgICBpZiAodXNlUmVnaXN0ZXIpIHtcbiAgICAgIHRoaXMudXNlUmVnaXN0ZXIoJ29wdGlvbnMnKTtcbiAgICAgIHBhcmFtcy5wdXNoKCdvcHRpb25zJyk7XG4gICAgICByZXR1cm4gJ29wdGlvbnM9JyArIG9wdGlvbnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBhcmFtcy5wdXNoKG9wdGlvbnMpO1xuICAgICAgcmV0dXJuICcnO1xuICAgIH1cbiAgfVxufTtcblxudmFyIHJlc2VydmVkV29yZHMgPSAoXG4gIFwiYnJlYWsgZWxzZSBuZXcgdmFyXCIgK1xuICBcIiBjYXNlIGZpbmFsbHkgcmV0dXJuIHZvaWRcIiArXG4gIFwiIGNhdGNoIGZvciBzd2l0Y2ggd2hpbGVcIiArXG4gIFwiIGNvbnRpbnVlIGZ1bmN0aW9uIHRoaXMgd2l0aFwiICtcbiAgXCIgZGVmYXVsdCBpZiB0aHJvd1wiICtcbiAgXCIgZGVsZXRlIGluIHRyeVwiICtcbiAgXCIgZG8gaW5zdGFuY2VvZiB0eXBlb2ZcIiArXG4gIFwiIGFic3RyYWN0IGVudW0gaW50IHNob3J0XCIgK1xuICBcIiBib29sZWFuIGV4cG9ydCBpbnRlcmZhY2Ugc3RhdGljXCIgK1xuICBcIiBieXRlIGV4dGVuZHMgbG9uZyBzdXBlclwiICtcbiAgXCIgY2hhciBmaW5hbCBuYXRpdmUgc3luY2hyb25pemVkXCIgK1xuICBcIiBjbGFzcyBmbG9hdCBwYWNrYWdlIHRocm93c1wiICtcbiAgXCIgY29uc3QgZ290byBwcml2YXRlIHRyYW5zaWVudFwiICtcbiAgXCIgZGVidWdnZXIgaW1wbGVtZW50cyBwcm90ZWN0ZWQgdm9sYXRpbGVcIiArXG4gIFwiIGRvdWJsZSBpbXBvcnQgcHVibGljIGxldCB5aWVsZFwiXG4pLnNwbGl0KFwiIFwiKTtcblxudmFyIGNvbXBpbGVyV29yZHMgPSBKYXZhU2NyaXB0Q29tcGlsZXIuUkVTRVJWRURfV09SRFMgPSB7fTtcblxuZm9yKHZhciBpPTAsIGw9cmVzZXJ2ZWRXb3Jkcy5sZW5ndGg7IGk8bDsgaSsrKSB7XG4gIGNvbXBpbGVyV29yZHNbcmVzZXJ2ZWRXb3Jkc1tpXV0gPSB0cnVlO1xufVxuXG5KYXZhU2NyaXB0Q29tcGlsZXIuaXNWYWxpZEphdmFTY3JpcHRWYXJpYWJsZU5hbWUgPSBmdW5jdGlvbihuYW1lKSB7XG4gIGlmKCFKYXZhU2NyaXB0Q29tcGlsZXIuUkVTRVJWRURfV09SRFNbbmFtZV0gJiYgL15bYS16QS1aXyRdWzAtOWEtekEtWl8kXSokLy50ZXN0KG5hbWUpKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufTtcblxuZXhwb3J0c1tcImRlZmF1bHRcIl0gPSBKYXZhU2NyaXB0Q29tcGlsZXI7IiwiXCJ1c2Ugc3RyaWN0XCI7XG4vKiBqc2hpbnQgaWdub3JlOnN0YXJ0ICovXG4vKiBKaXNvbiBnZW5lcmF0ZWQgcGFyc2VyICovXG52YXIgaGFuZGxlYmFycyA9IChmdW5jdGlvbigpe1xudmFyIHBhcnNlciA9IHt0cmFjZTogZnVuY3Rpb24gdHJhY2UoKSB7IH0sXG55eToge30sXG5zeW1ib2xzXzoge1wiZXJyb3JcIjoyLFwicm9vdFwiOjMsXCJzdGF0ZW1lbnRzXCI6NCxcIkVPRlwiOjUsXCJwcm9ncmFtXCI6NixcInNpbXBsZUludmVyc2VcIjo3LFwic3RhdGVtZW50XCI6OCxcIm9wZW5JbnZlcnNlXCI6OSxcImNsb3NlQmxvY2tcIjoxMCxcIm9wZW5CbG9ja1wiOjExLFwibXVzdGFjaGVcIjoxMixcInBhcnRpYWxcIjoxMyxcIkNPTlRFTlRcIjoxNCxcIkNPTU1FTlRcIjoxNSxcIk9QRU5fQkxPQ0tcIjoxNixcInNleHByXCI6MTcsXCJDTE9TRVwiOjE4LFwiT1BFTl9JTlZFUlNFXCI6MTksXCJPUEVOX0VOREJMT0NLXCI6MjAsXCJwYXRoXCI6MjEsXCJPUEVOXCI6MjIsXCJPUEVOX1VORVNDQVBFRFwiOjIzLFwiQ0xPU0VfVU5FU0NBUEVEXCI6MjQsXCJPUEVOX1BBUlRJQUxcIjoyNSxcInBhcnRpYWxOYW1lXCI6MjYsXCJwYXJ0aWFsX29wdGlvbjBcIjoyNyxcInNleHByX3JlcGV0aXRpb24wXCI6MjgsXCJzZXhwcl9vcHRpb24wXCI6MjksXCJkYXRhTmFtZVwiOjMwLFwicGFyYW1cIjozMSxcIlNUUklOR1wiOjMyLFwiSU5URUdFUlwiOjMzLFwiQk9PTEVBTlwiOjM0LFwiT1BFTl9TRVhQUlwiOjM1LFwiQ0xPU0VfU0VYUFJcIjozNixcImhhc2hcIjozNyxcImhhc2hfcmVwZXRpdGlvbl9wbHVzMFwiOjM4LFwiaGFzaFNlZ21lbnRcIjozOSxcIklEXCI6NDAsXCJFUVVBTFNcIjo0MSxcIkRBVEFcIjo0MixcInBhdGhTZWdtZW50c1wiOjQzLFwiU0VQXCI6NDQsXCIkYWNjZXB0XCI6MCxcIiRlbmRcIjoxfSxcbnRlcm1pbmFsc186IHsyOlwiZXJyb3JcIiw1OlwiRU9GXCIsMTQ6XCJDT05URU5UXCIsMTU6XCJDT01NRU5UXCIsMTY6XCJPUEVOX0JMT0NLXCIsMTg6XCJDTE9TRVwiLDE5OlwiT1BFTl9JTlZFUlNFXCIsMjA6XCJPUEVOX0VOREJMT0NLXCIsMjI6XCJPUEVOXCIsMjM6XCJPUEVOX1VORVNDQVBFRFwiLDI0OlwiQ0xPU0VfVU5FU0NBUEVEXCIsMjU6XCJPUEVOX1BBUlRJQUxcIiwzMjpcIlNUUklOR1wiLDMzOlwiSU5URUdFUlwiLDM0OlwiQk9PTEVBTlwiLDM1OlwiT1BFTl9TRVhQUlwiLDM2OlwiQ0xPU0VfU0VYUFJcIiw0MDpcIklEXCIsNDE6XCJFUVVBTFNcIiw0MjpcIkRBVEFcIiw0NDpcIlNFUFwifSxcbnByb2R1Y3Rpb25zXzogWzAsWzMsMl0sWzMsMV0sWzYsMl0sWzYsM10sWzYsMl0sWzYsMV0sWzYsMV0sWzYsMF0sWzQsMV0sWzQsMl0sWzgsM10sWzgsM10sWzgsMV0sWzgsMV0sWzgsMV0sWzgsMV0sWzExLDNdLFs5LDNdLFsxMCwzXSxbMTIsM10sWzEyLDNdLFsxMyw0XSxbNywyXSxbMTcsM10sWzE3LDFdLFszMSwxXSxbMzEsMV0sWzMxLDFdLFszMSwxXSxbMzEsMV0sWzMxLDNdLFszNywxXSxbMzksM10sWzI2LDFdLFsyNiwxXSxbMjYsMV0sWzMwLDJdLFsyMSwxXSxbNDMsM10sWzQzLDFdLFsyNywwXSxbMjcsMV0sWzI4LDBdLFsyOCwyXSxbMjksMF0sWzI5LDFdLFszOCwxXSxbMzgsMl1dLFxucGVyZm9ybUFjdGlvbjogZnVuY3Rpb24gYW5vbnltb3VzKHl5dGV4dCx5eWxlbmcseXlsaW5lbm8seXkseXlzdGF0ZSwkJCxfJCkge1xuXG52YXIgJDAgPSAkJC5sZW5ndGggLSAxO1xuc3dpdGNoICh5eXN0YXRlKSB7XG5jYXNlIDE6IHJldHVybiBuZXcgeXkuUHJvZ3JhbU5vZGUoJCRbJDAtMV0sIHRoaXMuXyQpOyBcbmJyZWFrO1xuY2FzZSAyOiByZXR1cm4gbmV3IHl5LlByb2dyYW1Ob2RlKFtdLCB0aGlzLl8kKTsgXG5icmVhaztcbmNhc2UgMzp0aGlzLiQgPSBuZXcgeXkuUHJvZ3JhbU5vZGUoW10sICQkWyQwLTFdLCAkJFskMF0sIHRoaXMuXyQpO1xuYnJlYWs7XG5jYXNlIDQ6dGhpcy4kID0gbmV3IHl5LlByb2dyYW1Ob2RlKCQkWyQwLTJdLCAkJFskMC0xXSwgJCRbJDBdLCB0aGlzLl8kKTtcbmJyZWFrO1xuY2FzZSA1OnRoaXMuJCA9IG5ldyB5eS5Qcm9ncmFtTm9kZSgkJFskMC0xXSwgJCRbJDBdLCBbXSwgdGhpcy5fJCk7XG5icmVhaztcbmNhc2UgNjp0aGlzLiQgPSBuZXcgeXkuUHJvZ3JhbU5vZGUoJCRbJDBdLCB0aGlzLl8kKTtcbmJyZWFrO1xuY2FzZSA3OnRoaXMuJCA9IG5ldyB5eS5Qcm9ncmFtTm9kZShbXSwgdGhpcy5fJCk7XG5icmVhaztcbmNhc2UgODp0aGlzLiQgPSBuZXcgeXkuUHJvZ3JhbU5vZGUoW10sIHRoaXMuXyQpO1xuYnJlYWs7XG5jYXNlIDk6dGhpcy4kID0gWyQkWyQwXV07XG5icmVhaztcbmNhc2UgMTA6ICQkWyQwLTFdLnB1c2goJCRbJDBdKTsgdGhpcy4kID0gJCRbJDAtMV07IFxuYnJlYWs7XG5jYXNlIDExOnRoaXMuJCA9IG5ldyB5eS5CbG9ja05vZGUoJCRbJDAtMl0sICQkWyQwLTFdLmludmVyc2UsICQkWyQwLTFdLCAkJFskMF0sIHRoaXMuXyQpO1xuYnJlYWs7XG5jYXNlIDEyOnRoaXMuJCA9IG5ldyB5eS5CbG9ja05vZGUoJCRbJDAtMl0sICQkWyQwLTFdLCAkJFskMC0xXS5pbnZlcnNlLCAkJFskMF0sIHRoaXMuXyQpO1xuYnJlYWs7XG5jYXNlIDEzOnRoaXMuJCA9ICQkWyQwXTtcbmJyZWFrO1xuY2FzZSAxNDp0aGlzLiQgPSAkJFskMF07XG5icmVhaztcbmNhc2UgMTU6dGhpcy4kID0gbmV3IHl5LkNvbnRlbnROb2RlKCQkWyQwXSwgdGhpcy5fJCk7XG5icmVhaztcbmNhc2UgMTY6dGhpcy4kID0gbmV3IHl5LkNvbW1lbnROb2RlKCQkWyQwXSwgdGhpcy5fJCk7XG5icmVhaztcbmNhc2UgMTc6dGhpcy4kID0gbmV3IHl5Lk11c3RhY2hlTm9kZSgkJFskMC0xXSwgbnVsbCwgJCRbJDAtMl0sIHN0cmlwRmxhZ3MoJCRbJDAtMl0sICQkWyQwXSksIHRoaXMuXyQpO1xuYnJlYWs7XG5jYXNlIDE4OnRoaXMuJCA9IG5ldyB5eS5NdXN0YWNoZU5vZGUoJCRbJDAtMV0sIG51bGwsICQkWyQwLTJdLCBzdHJpcEZsYWdzKCQkWyQwLTJdLCAkJFskMF0pLCB0aGlzLl8kKTtcbmJyZWFrO1xuY2FzZSAxOTp0aGlzLiQgPSB7cGF0aDogJCRbJDAtMV0sIHN0cmlwOiBzdHJpcEZsYWdzKCQkWyQwLTJdLCAkJFskMF0pfTtcbmJyZWFrO1xuY2FzZSAyMDp0aGlzLiQgPSBuZXcgeXkuTXVzdGFjaGVOb2RlKCQkWyQwLTFdLCBudWxsLCAkJFskMC0yXSwgc3RyaXBGbGFncygkJFskMC0yXSwgJCRbJDBdKSwgdGhpcy5fJCk7XG5icmVhaztcbmNhc2UgMjE6dGhpcy4kID0gbmV3IHl5Lk11c3RhY2hlTm9kZSgkJFskMC0xXSwgbnVsbCwgJCRbJDAtMl0sIHN0cmlwRmxhZ3MoJCRbJDAtMl0sICQkWyQwXSksIHRoaXMuXyQpO1xuYnJlYWs7XG5jYXNlIDIyOnRoaXMuJCA9IG5ldyB5eS5QYXJ0aWFsTm9kZSgkJFskMC0yXSwgJCRbJDAtMV0sIHN0cmlwRmxhZ3MoJCRbJDAtM10sICQkWyQwXSksIHRoaXMuXyQpO1xuYnJlYWs7XG5jYXNlIDIzOnRoaXMuJCA9IHN0cmlwRmxhZ3MoJCRbJDAtMV0sICQkWyQwXSk7XG5icmVhaztcbmNhc2UgMjQ6dGhpcy4kID0gbmV3IHl5LlNleHByTm9kZShbJCRbJDAtMl1dLmNvbmNhdCgkJFskMC0xXSksICQkWyQwXSwgdGhpcy5fJCk7XG5icmVhaztcbmNhc2UgMjU6dGhpcy4kID0gbmV3IHl5LlNleHByTm9kZShbJCRbJDBdXSwgbnVsbCwgdGhpcy5fJCk7XG5icmVhaztcbmNhc2UgMjY6dGhpcy4kID0gJCRbJDBdO1xuYnJlYWs7XG5jYXNlIDI3OnRoaXMuJCA9IG5ldyB5eS5TdHJpbmdOb2RlKCQkWyQwXSwgdGhpcy5fJCk7XG5icmVhaztcbmNhc2UgMjg6dGhpcy4kID0gbmV3IHl5LkludGVnZXJOb2RlKCQkWyQwXSwgdGhpcy5fJCk7XG5icmVhaztcbmNhc2UgMjk6dGhpcy4kID0gbmV3IHl5LkJvb2xlYW5Ob2RlKCQkWyQwXSwgdGhpcy5fJCk7XG5icmVhaztcbmNhc2UgMzA6dGhpcy4kID0gJCRbJDBdO1xuYnJlYWs7XG5jYXNlIDMxOiQkWyQwLTFdLmlzSGVscGVyID0gdHJ1ZTsgdGhpcy4kID0gJCRbJDAtMV07XG5icmVhaztcbmNhc2UgMzI6dGhpcy4kID0gbmV3IHl5Lkhhc2hOb2RlKCQkWyQwXSwgdGhpcy5fJCk7XG5icmVhaztcbmNhc2UgMzM6dGhpcy4kID0gWyQkWyQwLTJdLCAkJFskMF1dO1xuYnJlYWs7XG5jYXNlIDM0OnRoaXMuJCA9IG5ldyB5eS5QYXJ0aWFsTmFtZU5vZGUoJCRbJDBdLCB0aGlzLl8kKTtcbmJyZWFrO1xuY2FzZSAzNTp0aGlzLiQgPSBuZXcgeXkuUGFydGlhbE5hbWVOb2RlKG5ldyB5eS5TdHJpbmdOb2RlKCQkWyQwXSwgdGhpcy5fJCksIHRoaXMuXyQpO1xuYnJlYWs7XG5jYXNlIDM2OnRoaXMuJCA9IG5ldyB5eS5QYXJ0aWFsTmFtZU5vZGUobmV3IHl5LkludGVnZXJOb2RlKCQkWyQwXSwgdGhpcy5fJCkpO1xuYnJlYWs7XG5jYXNlIDM3OnRoaXMuJCA9IG5ldyB5eS5EYXRhTm9kZSgkJFskMF0sIHRoaXMuXyQpO1xuYnJlYWs7XG5jYXNlIDM4OnRoaXMuJCA9IG5ldyB5eS5JZE5vZGUoJCRbJDBdLCB0aGlzLl8kKTtcbmJyZWFrO1xuY2FzZSAzOTogJCRbJDAtMl0ucHVzaCh7cGFydDogJCRbJDBdLCBzZXBhcmF0b3I6ICQkWyQwLTFdfSk7IHRoaXMuJCA9ICQkWyQwLTJdOyBcbmJyZWFrO1xuY2FzZSA0MDp0aGlzLiQgPSBbe3BhcnQ6ICQkWyQwXX1dO1xuYnJlYWs7XG5jYXNlIDQzOnRoaXMuJCA9IFtdO1xuYnJlYWs7XG5jYXNlIDQ0OiQkWyQwLTFdLnB1c2goJCRbJDBdKTtcbmJyZWFrO1xuY2FzZSA0Nzp0aGlzLiQgPSBbJCRbJDBdXTtcbmJyZWFrO1xuY2FzZSA0ODokJFskMC0xXS5wdXNoKCQkWyQwXSk7XG5icmVhaztcbn1cbn0sXG50YWJsZTogW3szOjEsNDoyLDU6WzEsM10sODo0LDk6NSwxMTo2LDEyOjcsMTM6OCwxNDpbMSw5XSwxNTpbMSwxMF0sMTY6WzEsMTJdLDE5OlsxLDExXSwyMjpbMSwxM10sMjM6WzEsMTRdLDI1OlsxLDE1XX0sezE6WzNdfSx7NTpbMSwxNl0sODoxNyw5OjUsMTE6NiwxMjo3LDEzOjgsMTQ6WzEsOV0sMTU6WzEsMTBdLDE2OlsxLDEyXSwxOTpbMSwxMV0sMjI6WzEsMTNdLDIzOlsxLDE0XSwyNTpbMSwxNV19LHsxOlsyLDJdfSx7NTpbMiw5XSwxNDpbMiw5XSwxNTpbMiw5XSwxNjpbMiw5XSwxOTpbMiw5XSwyMDpbMiw5XSwyMjpbMiw5XSwyMzpbMiw5XSwyNTpbMiw5XX0sezQ6MjAsNjoxOCw3OjE5LDg6NCw5OjUsMTE6NiwxMjo3LDEzOjgsMTQ6WzEsOV0sMTU6WzEsMTBdLDE2OlsxLDEyXSwxOTpbMSwyMV0sMjA6WzIsOF0sMjI6WzEsMTNdLDIzOlsxLDE0XSwyNTpbMSwxNV19LHs0OjIwLDY6MjIsNzoxOSw4OjQsOTo1LDExOjYsMTI6NywxMzo4LDE0OlsxLDldLDE1OlsxLDEwXSwxNjpbMSwxMl0sMTk6WzEsMjFdLDIwOlsyLDhdLDIyOlsxLDEzXSwyMzpbMSwxNF0sMjU6WzEsMTVdfSx7NTpbMiwxM10sMTQ6WzIsMTNdLDE1OlsyLDEzXSwxNjpbMiwxM10sMTk6WzIsMTNdLDIwOlsyLDEzXSwyMjpbMiwxM10sMjM6WzIsMTNdLDI1OlsyLDEzXX0sezU6WzIsMTRdLDE0OlsyLDE0XSwxNTpbMiwxNF0sMTY6WzIsMTRdLDE5OlsyLDE0XSwyMDpbMiwxNF0sMjI6WzIsMTRdLDIzOlsyLDE0XSwyNTpbMiwxNF19LHs1OlsyLDE1XSwxNDpbMiwxNV0sMTU6WzIsMTVdLDE2OlsyLDE1XSwxOTpbMiwxNV0sMjA6WzIsMTVdLDIyOlsyLDE1XSwyMzpbMiwxNV0sMjU6WzIsMTVdfSx7NTpbMiwxNl0sMTQ6WzIsMTZdLDE1OlsyLDE2XSwxNjpbMiwxNl0sMTk6WzIsMTZdLDIwOlsyLDE2XSwyMjpbMiwxNl0sMjM6WzIsMTZdLDI1OlsyLDE2XX0sezE3OjIzLDIxOjI0LDMwOjI1LDQwOlsxLDI4XSw0MjpbMSwyN10sNDM6MjZ9LHsxNzoyOSwyMToyNCwzMDoyNSw0MDpbMSwyOF0sNDI6WzEsMjddLDQzOjI2fSx7MTc6MzAsMjE6MjQsMzA6MjUsNDA6WzEsMjhdLDQyOlsxLDI3XSw0MzoyNn0sezE3OjMxLDIxOjI0LDMwOjI1LDQwOlsxLDI4XSw0MjpbMSwyN10sNDM6MjZ9LHsyMTozMywyNjozMiwzMjpbMSwzNF0sMzM6WzEsMzVdLDQwOlsxLDI4XSw0MzoyNn0sezE6WzIsMV19LHs1OlsyLDEwXSwxNDpbMiwxMF0sMTU6WzIsMTBdLDE2OlsyLDEwXSwxOTpbMiwxMF0sMjA6WzIsMTBdLDIyOlsyLDEwXSwyMzpbMiwxMF0sMjU6WzIsMTBdfSx7MTA6MzYsMjA6WzEsMzddfSx7NDozOCw4OjQsOTo1LDExOjYsMTI6NywxMzo4LDE0OlsxLDldLDE1OlsxLDEwXSwxNjpbMSwxMl0sMTk6WzEsMTFdLDIwOlsyLDddLDIyOlsxLDEzXSwyMzpbMSwxNF0sMjU6WzEsMTVdfSx7NzozOSw4OjE3LDk6NSwxMTo2LDEyOjcsMTM6OCwxNDpbMSw5XSwxNTpbMSwxMF0sMTY6WzEsMTJdLDE5OlsxLDIxXSwyMDpbMiw2XSwyMjpbMSwxM10sMjM6WzEsMTRdLDI1OlsxLDE1XX0sezE3OjIzLDE4OlsxLDQwXSwyMToyNCwzMDoyNSw0MDpbMSwyOF0sNDI6WzEsMjddLDQzOjI2fSx7MTA6NDEsMjA6WzEsMzddfSx7MTg6WzEsNDJdfSx7MTg6WzIsNDNdLDI0OlsyLDQzXSwyODo0MywzMjpbMiw0M10sMzM6WzIsNDNdLDM0OlsyLDQzXSwzNTpbMiw0M10sMzY6WzIsNDNdLDQwOlsyLDQzXSw0MjpbMiw0M119LHsxODpbMiwyNV0sMjQ6WzIsMjVdLDM2OlsyLDI1XX0sezE4OlsyLDM4XSwyNDpbMiwzOF0sMzI6WzIsMzhdLDMzOlsyLDM4XSwzNDpbMiwzOF0sMzU6WzIsMzhdLDM2OlsyLDM4XSw0MDpbMiwzOF0sNDI6WzIsMzhdLDQ0OlsxLDQ0XX0sezIxOjQ1LDQwOlsxLDI4XSw0MzoyNn0sezE4OlsyLDQwXSwyNDpbMiw0MF0sMzI6WzIsNDBdLDMzOlsyLDQwXSwzNDpbMiw0MF0sMzU6WzIsNDBdLDM2OlsyLDQwXSw0MDpbMiw0MF0sNDI6WzIsNDBdLDQ0OlsyLDQwXX0sezE4OlsxLDQ2XX0sezE4OlsxLDQ3XX0sezI0OlsxLDQ4XX0sezE4OlsyLDQxXSwyMTo1MCwyNzo0OSw0MDpbMSwyOF0sNDM6MjZ9LHsxODpbMiwzNF0sNDA6WzIsMzRdfSx7MTg6WzIsMzVdLDQwOlsyLDM1XX0sezE4OlsyLDM2XSw0MDpbMiwzNl19LHs1OlsyLDExXSwxNDpbMiwxMV0sMTU6WzIsMTFdLDE2OlsyLDExXSwxOTpbMiwxMV0sMjA6WzIsMTFdLDIyOlsyLDExXSwyMzpbMiwxMV0sMjU6WzIsMTFdfSx7MjE6NTEsNDA6WzEsMjhdLDQzOjI2fSx7ODoxNyw5OjUsMTE6NiwxMjo3LDEzOjgsMTQ6WzEsOV0sMTU6WzEsMTBdLDE2OlsxLDEyXSwxOTpbMSwxMV0sMjA6WzIsM10sMjI6WzEsMTNdLDIzOlsxLDE0XSwyNTpbMSwxNV19LHs0OjUyLDg6NCw5OjUsMTE6NiwxMjo3LDEzOjgsMTQ6WzEsOV0sMTU6WzEsMTBdLDE2OlsxLDEyXSwxOTpbMSwxMV0sMjA6WzIsNV0sMjI6WzEsMTNdLDIzOlsxLDE0XSwyNTpbMSwxNV19LHsxNDpbMiwyM10sMTU6WzIsMjNdLDE2OlsyLDIzXSwxOTpbMiwyM10sMjA6WzIsMjNdLDIyOlsyLDIzXSwyMzpbMiwyM10sMjU6WzIsMjNdfSx7NTpbMiwxMl0sMTQ6WzIsMTJdLDE1OlsyLDEyXSwxNjpbMiwxMl0sMTk6WzIsMTJdLDIwOlsyLDEyXSwyMjpbMiwxMl0sMjM6WzIsMTJdLDI1OlsyLDEyXX0sezE0OlsyLDE4XSwxNTpbMiwxOF0sMTY6WzIsMThdLDE5OlsyLDE4XSwyMDpbMiwxOF0sMjI6WzIsMThdLDIzOlsyLDE4XSwyNTpbMiwxOF19LHsxODpbMiw0NV0sMjE6NTYsMjQ6WzIsNDVdLDI5OjUzLDMwOjYwLDMxOjU0LDMyOlsxLDU3XSwzMzpbMSw1OF0sMzQ6WzEsNTldLDM1OlsxLDYxXSwzNjpbMiw0NV0sMzc6NTUsMzg6NjIsMzk6NjMsNDA6WzEsNjRdLDQyOlsxLDI3XSw0MzoyNn0sezQwOlsxLDY1XX0sezE4OlsyLDM3XSwyNDpbMiwzN10sMzI6WzIsMzddLDMzOlsyLDM3XSwzNDpbMiwzN10sMzU6WzIsMzddLDM2OlsyLDM3XSw0MDpbMiwzN10sNDI6WzIsMzddfSx7MTQ6WzIsMTddLDE1OlsyLDE3XSwxNjpbMiwxN10sMTk6WzIsMTddLDIwOlsyLDE3XSwyMjpbMiwxN10sMjM6WzIsMTddLDI1OlsyLDE3XX0sezU6WzIsMjBdLDE0OlsyLDIwXSwxNTpbMiwyMF0sMTY6WzIsMjBdLDE5OlsyLDIwXSwyMDpbMiwyMF0sMjI6WzIsMjBdLDIzOlsyLDIwXSwyNTpbMiwyMF19LHs1OlsyLDIxXSwxNDpbMiwyMV0sMTU6WzIsMjFdLDE2OlsyLDIxXSwxOTpbMiwyMV0sMjA6WzIsMjFdLDIyOlsyLDIxXSwyMzpbMiwyMV0sMjU6WzIsMjFdfSx7MTg6WzEsNjZdfSx7MTg6WzIsNDJdfSx7MTg6WzEsNjddfSx7ODoxNyw5OjUsMTE6NiwxMjo3LDEzOjgsMTQ6WzEsOV0sMTU6WzEsMTBdLDE2OlsxLDEyXSwxOTpbMSwxMV0sMjA6WzIsNF0sMjI6WzEsMTNdLDIzOlsxLDE0XSwyNTpbMSwxNV19LHsxODpbMiwyNF0sMjQ6WzIsMjRdLDM2OlsyLDI0XX0sezE4OlsyLDQ0XSwyNDpbMiw0NF0sMzI6WzIsNDRdLDMzOlsyLDQ0XSwzNDpbMiw0NF0sMzU6WzIsNDRdLDM2OlsyLDQ0XSw0MDpbMiw0NF0sNDI6WzIsNDRdfSx7MTg6WzIsNDZdLDI0OlsyLDQ2XSwzNjpbMiw0Nl19LHsxODpbMiwyNl0sMjQ6WzIsMjZdLDMyOlsyLDI2XSwzMzpbMiwyNl0sMzQ6WzIsMjZdLDM1OlsyLDI2XSwzNjpbMiwyNl0sNDA6WzIsMjZdLDQyOlsyLDI2XX0sezE4OlsyLDI3XSwyNDpbMiwyN10sMzI6WzIsMjddLDMzOlsyLDI3XSwzNDpbMiwyN10sMzU6WzIsMjddLDM2OlsyLDI3XSw0MDpbMiwyN10sNDI6WzIsMjddfSx7MTg6WzIsMjhdLDI0OlsyLDI4XSwzMjpbMiwyOF0sMzM6WzIsMjhdLDM0OlsyLDI4XSwzNTpbMiwyOF0sMzY6WzIsMjhdLDQwOlsyLDI4XSw0MjpbMiwyOF19LHsxODpbMiwyOV0sMjQ6WzIsMjldLDMyOlsyLDI5XSwzMzpbMiwyOV0sMzQ6WzIsMjldLDM1OlsyLDI5XSwzNjpbMiwyOV0sNDA6WzIsMjldLDQyOlsyLDI5XX0sezE4OlsyLDMwXSwyNDpbMiwzMF0sMzI6WzIsMzBdLDMzOlsyLDMwXSwzNDpbMiwzMF0sMzU6WzIsMzBdLDM2OlsyLDMwXSw0MDpbMiwzMF0sNDI6WzIsMzBdfSx7MTc6NjgsMjE6MjQsMzA6MjUsNDA6WzEsMjhdLDQyOlsxLDI3XSw0MzoyNn0sezE4OlsyLDMyXSwyNDpbMiwzMl0sMzY6WzIsMzJdLDM5OjY5LDQwOlsxLDcwXX0sezE4OlsyLDQ3XSwyNDpbMiw0N10sMzY6WzIsNDddLDQwOlsyLDQ3XX0sezE4OlsyLDQwXSwyNDpbMiw0MF0sMzI6WzIsNDBdLDMzOlsyLDQwXSwzNDpbMiw0MF0sMzU6WzIsNDBdLDM2OlsyLDQwXSw0MDpbMiw0MF0sNDE6WzEsNzFdLDQyOlsyLDQwXSw0NDpbMiw0MF19LHsxODpbMiwzOV0sMjQ6WzIsMzldLDMyOlsyLDM5XSwzMzpbMiwzOV0sMzQ6WzIsMzldLDM1OlsyLDM5XSwzNjpbMiwzOV0sNDA6WzIsMzldLDQyOlsyLDM5XSw0NDpbMiwzOV19LHs1OlsyLDIyXSwxNDpbMiwyMl0sMTU6WzIsMjJdLDE2OlsyLDIyXSwxOTpbMiwyMl0sMjA6WzIsMjJdLDIyOlsyLDIyXSwyMzpbMiwyMl0sMjU6WzIsMjJdfSx7NTpbMiwxOV0sMTQ6WzIsMTldLDE1OlsyLDE5XSwxNjpbMiwxOV0sMTk6WzIsMTldLDIwOlsyLDE5XSwyMjpbMiwxOV0sMjM6WzIsMTldLDI1OlsyLDE5XX0sezM2OlsxLDcyXX0sezE4OlsyLDQ4XSwyNDpbMiw0OF0sMzY6WzIsNDhdLDQwOlsyLDQ4XX0sezQxOlsxLDcxXX0sezIxOjU2LDMwOjYwLDMxOjczLDMyOlsxLDU3XSwzMzpbMSw1OF0sMzQ6WzEsNTldLDM1OlsxLDYxXSw0MDpbMSwyOF0sNDI6WzEsMjddLDQzOjI2fSx7MTg6WzIsMzFdLDI0OlsyLDMxXSwzMjpbMiwzMV0sMzM6WzIsMzFdLDM0OlsyLDMxXSwzNTpbMiwzMV0sMzY6WzIsMzFdLDQwOlsyLDMxXSw0MjpbMiwzMV19LHsxODpbMiwzM10sMjQ6WzIsMzNdLDM2OlsyLDMzXSw0MDpbMiwzM119XSxcbmRlZmF1bHRBY3Rpb25zOiB7MzpbMiwyXSwxNjpbMiwxXSw1MDpbMiw0Ml19LFxucGFyc2VFcnJvcjogZnVuY3Rpb24gcGFyc2VFcnJvcihzdHIsIGhhc2gpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3Ioc3RyKTtcbn0sXG5wYXJzZTogZnVuY3Rpb24gcGFyc2UoaW5wdXQpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXMsIHN0YWNrID0gWzBdLCB2c3RhY2sgPSBbbnVsbF0sIGxzdGFjayA9IFtdLCB0YWJsZSA9IHRoaXMudGFibGUsIHl5dGV4dCA9IFwiXCIsIHl5bGluZW5vID0gMCwgeXlsZW5nID0gMCwgcmVjb3ZlcmluZyA9IDAsIFRFUlJPUiA9IDIsIEVPRiA9IDE7XG4gICAgdGhpcy5sZXhlci5zZXRJbnB1dChpbnB1dCk7XG4gICAgdGhpcy5sZXhlci55eSA9IHRoaXMueXk7XG4gICAgdGhpcy55eS5sZXhlciA9IHRoaXMubGV4ZXI7XG4gICAgdGhpcy55eS5wYXJzZXIgPSB0aGlzO1xuICAgIGlmICh0eXBlb2YgdGhpcy5sZXhlci55eWxsb2MgPT0gXCJ1bmRlZmluZWRcIilcbiAgICAgICAgdGhpcy5sZXhlci55eWxsb2MgPSB7fTtcbiAgICB2YXIgeXlsb2MgPSB0aGlzLmxleGVyLnl5bGxvYztcbiAgICBsc3RhY2sucHVzaCh5eWxvYyk7XG4gICAgdmFyIHJhbmdlcyA9IHRoaXMubGV4ZXIub3B0aW9ucyAmJiB0aGlzLmxleGVyLm9wdGlvbnMucmFuZ2VzO1xuICAgIGlmICh0eXBlb2YgdGhpcy55eS5wYXJzZUVycm9yID09PSBcImZ1bmN0aW9uXCIpXG4gICAgICAgIHRoaXMucGFyc2VFcnJvciA9IHRoaXMueXkucGFyc2VFcnJvcjtcbiAgICBmdW5jdGlvbiBwb3BTdGFjayhuKSB7XG4gICAgICAgIHN0YWNrLmxlbmd0aCA9IHN0YWNrLmxlbmd0aCAtIDIgKiBuO1xuICAgICAgICB2c3RhY2subGVuZ3RoID0gdnN0YWNrLmxlbmd0aCAtIG47XG4gICAgICAgIGxzdGFjay5sZW5ndGggPSBsc3RhY2subGVuZ3RoIC0gbjtcbiAgICB9XG4gICAgZnVuY3Rpb24gbGV4KCkge1xuICAgICAgICB2YXIgdG9rZW47XG4gICAgICAgIHRva2VuID0gc2VsZi5sZXhlci5sZXgoKSB8fCAxO1xuICAgICAgICBpZiAodHlwZW9mIHRva2VuICE9PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgICB0b2tlbiA9IHNlbGYuc3ltYm9sc19bdG9rZW5dIHx8IHRva2VuO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0b2tlbjtcbiAgICB9XG4gICAgdmFyIHN5bWJvbCwgcHJlRXJyb3JTeW1ib2wsIHN0YXRlLCBhY3Rpb24sIGEsIHIsIHl5dmFsID0ge30sIHAsIGxlbiwgbmV3U3RhdGUsIGV4cGVjdGVkO1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgIHN0YXRlID0gc3RhY2tbc3RhY2subGVuZ3RoIC0gMV07XG4gICAgICAgIGlmICh0aGlzLmRlZmF1bHRBY3Rpb25zW3N0YXRlXSkge1xuICAgICAgICAgICAgYWN0aW9uID0gdGhpcy5kZWZhdWx0QWN0aW9uc1tzdGF0ZV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoc3ltYm9sID09PSBudWxsIHx8IHR5cGVvZiBzeW1ib2wgPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgIHN5bWJvbCA9IGxleCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYWN0aW9uID0gdGFibGVbc3RhdGVdICYmIHRhYmxlW3N0YXRlXVtzeW1ib2xdO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgYWN0aW9uID09PSBcInVuZGVmaW5lZFwiIHx8ICFhY3Rpb24ubGVuZ3RoIHx8ICFhY3Rpb25bMF0pIHtcbiAgICAgICAgICAgIHZhciBlcnJTdHIgPSBcIlwiO1xuICAgICAgICAgICAgaWYgKCFyZWNvdmVyaW5nKSB7XG4gICAgICAgICAgICAgICAgZXhwZWN0ZWQgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKHAgaW4gdGFibGVbc3RhdGVdKVxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50ZXJtaW5hbHNfW3BdICYmIHAgPiAyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBleHBlY3RlZC5wdXNoKFwiJ1wiICsgdGhpcy50ZXJtaW5hbHNfW3BdICsgXCInXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMubGV4ZXIuc2hvd1Bvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGVyclN0ciA9IFwiUGFyc2UgZXJyb3Igb24gbGluZSBcIiArICh5eWxpbmVubyArIDEpICsgXCI6XFxuXCIgKyB0aGlzLmxleGVyLnNob3dQb3NpdGlvbigpICsgXCJcXG5FeHBlY3RpbmcgXCIgKyBleHBlY3RlZC5qb2luKFwiLCBcIikgKyBcIiwgZ290ICdcIiArICh0aGlzLnRlcm1pbmFsc19bc3ltYm9sXSB8fCBzeW1ib2wpICsgXCInXCI7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyU3RyID0gXCJQYXJzZSBlcnJvciBvbiBsaW5lIFwiICsgKHl5bGluZW5vICsgMSkgKyBcIjogVW5leHBlY3RlZCBcIiArIChzeW1ib2wgPT0gMT9cImVuZCBvZiBpbnB1dFwiOlwiJ1wiICsgKHRoaXMudGVybWluYWxzX1tzeW1ib2xdIHx8IHN5bWJvbCkgKyBcIidcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMucGFyc2VFcnJvcihlcnJTdHIsIHt0ZXh0OiB0aGlzLmxleGVyLm1hdGNoLCB0b2tlbjogdGhpcy50ZXJtaW5hbHNfW3N5bWJvbF0gfHwgc3ltYm9sLCBsaW5lOiB0aGlzLmxleGVyLnl5bGluZW5vLCBsb2M6IHl5bG9jLCBleHBlY3RlZDogZXhwZWN0ZWR9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoYWN0aW9uWzBdIGluc3RhbmNlb2YgQXJyYXkgJiYgYWN0aW9uLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlBhcnNlIEVycm9yOiBtdWx0aXBsZSBhY3Rpb25zIHBvc3NpYmxlIGF0IHN0YXRlOiBcIiArIHN0YXRlICsgXCIsIHRva2VuOiBcIiArIHN5bWJvbCk7XG4gICAgICAgIH1cbiAgICAgICAgc3dpdGNoIChhY3Rpb25bMF0pIHtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgc3RhY2sucHVzaChzeW1ib2wpO1xuICAgICAgICAgICAgdnN0YWNrLnB1c2godGhpcy5sZXhlci55eXRleHQpO1xuICAgICAgICAgICAgbHN0YWNrLnB1c2godGhpcy5sZXhlci55eWxsb2MpO1xuICAgICAgICAgICAgc3RhY2sucHVzaChhY3Rpb25bMV0pO1xuICAgICAgICAgICAgc3ltYm9sID0gbnVsbDtcbiAgICAgICAgICAgIGlmICghcHJlRXJyb3JTeW1ib2wpIHtcbiAgICAgICAgICAgICAgICB5eWxlbmcgPSB0aGlzLmxleGVyLnl5bGVuZztcbiAgICAgICAgICAgICAgICB5eXRleHQgPSB0aGlzLmxleGVyLnl5dGV4dDtcbiAgICAgICAgICAgICAgICB5eWxpbmVubyA9IHRoaXMubGV4ZXIueXlsaW5lbm87XG4gICAgICAgICAgICAgICAgeXlsb2MgPSB0aGlzLmxleGVyLnl5bGxvYztcbiAgICAgICAgICAgICAgICBpZiAocmVjb3ZlcmluZyA+IDApXG4gICAgICAgICAgICAgICAgICAgIHJlY292ZXJpbmctLTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc3ltYm9sID0gcHJlRXJyb3JTeW1ib2w7XG4gICAgICAgICAgICAgICAgcHJlRXJyb3JTeW1ib2wgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgIGxlbiA9IHRoaXMucHJvZHVjdGlvbnNfW2FjdGlvblsxXV1bMV07XG4gICAgICAgICAgICB5eXZhbC4kID0gdnN0YWNrW3ZzdGFjay5sZW5ndGggLSBsZW5dO1xuICAgICAgICAgICAgeXl2YWwuXyQgPSB7Zmlyc3RfbGluZTogbHN0YWNrW2xzdGFjay5sZW5ndGggLSAobGVuIHx8IDEpXS5maXJzdF9saW5lLCBsYXN0X2xpbmU6IGxzdGFja1tsc3RhY2subGVuZ3RoIC0gMV0ubGFzdF9saW5lLCBmaXJzdF9jb2x1bW46IGxzdGFja1tsc3RhY2subGVuZ3RoIC0gKGxlbiB8fCAxKV0uZmlyc3RfY29sdW1uLCBsYXN0X2NvbHVtbjogbHN0YWNrW2xzdGFjay5sZW5ndGggLSAxXS5sYXN0X2NvbHVtbn07XG4gICAgICAgICAgICBpZiAocmFuZ2VzKSB7XG4gICAgICAgICAgICAgICAgeXl2YWwuXyQucmFuZ2UgPSBbbHN0YWNrW2xzdGFjay5sZW5ndGggLSAobGVuIHx8IDEpXS5yYW5nZVswXSwgbHN0YWNrW2xzdGFjay5sZW5ndGggLSAxXS5yYW5nZVsxXV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByID0gdGhpcy5wZXJmb3JtQWN0aW9uLmNhbGwoeXl2YWwsIHl5dGV4dCwgeXlsZW5nLCB5eWxpbmVubywgdGhpcy55eSwgYWN0aW9uWzFdLCB2c3RhY2ssIGxzdGFjayk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHIgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChsZW4pIHtcbiAgICAgICAgICAgICAgICBzdGFjayA9IHN0YWNrLnNsaWNlKDAsIC0xICogbGVuICogMik7XG4gICAgICAgICAgICAgICAgdnN0YWNrID0gdnN0YWNrLnNsaWNlKDAsIC0xICogbGVuKTtcbiAgICAgICAgICAgICAgICBsc3RhY2sgPSBsc3RhY2suc2xpY2UoMCwgLTEgKiBsZW4pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RhY2sucHVzaCh0aGlzLnByb2R1Y3Rpb25zX1thY3Rpb25bMV1dWzBdKTtcbiAgICAgICAgICAgIHZzdGFjay5wdXNoKHl5dmFsLiQpO1xuICAgICAgICAgICAgbHN0YWNrLnB1c2goeXl2YWwuXyQpO1xuICAgICAgICAgICAgbmV3U3RhdGUgPSB0YWJsZVtzdGFja1tzdGFjay5sZW5ndGggLSAyXV1bc3RhY2tbc3RhY2subGVuZ3RoIC0gMV1dO1xuICAgICAgICAgICAgc3RhY2sucHVzaChuZXdTdGF0ZSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59XG59O1xuXG5cbmZ1bmN0aW9uIHN0cmlwRmxhZ3Mob3BlbiwgY2xvc2UpIHtcbiAgcmV0dXJuIHtcbiAgICBsZWZ0OiBvcGVuLmNoYXJBdCgyKSA9PT0gJ34nLFxuICAgIHJpZ2h0OiBjbG9zZS5jaGFyQXQoMCkgPT09ICd+JyB8fCBjbG9zZS5jaGFyQXQoMSkgPT09ICd+J1xuICB9O1xufVxuXG4vKiBKaXNvbiBnZW5lcmF0ZWQgbGV4ZXIgKi9cbnZhciBsZXhlciA9IChmdW5jdGlvbigpe1xudmFyIGxleGVyID0gKHtFT0Y6MSxcbnBhcnNlRXJyb3I6ZnVuY3Rpb24gcGFyc2VFcnJvcihzdHIsIGhhc2gpIHtcbiAgICAgICAgaWYgKHRoaXMueXkucGFyc2VyKSB7XG4gICAgICAgICAgICB0aGlzLnl5LnBhcnNlci5wYXJzZUVycm9yKHN0ciwgaGFzaCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3Ioc3RyKTtcbiAgICAgICAgfVxuICAgIH0sXG5zZXRJbnB1dDpmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgICAgdGhpcy5faW5wdXQgPSBpbnB1dDtcbiAgICAgICAgdGhpcy5fbW9yZSA9IHRoaXMuX2xlc3MgPSB0aGlzLmRvbmUgPSBmYWxzZTtcbiAgICAgICAgdGhpcy55eWxpbmVubyA9IHRoaXMueXlsZW5nID0gMDtcbiAgICAgICAgdGhpcy55eXRleHQgPSB0aGlzLm1hdGNoZWQgPSB0aGlzLm1hdGNoID0gJyc7XG4gICAgICAgIHRoaXMuY29uZGl0aW9uU3RhY2sgPSBbJ0lOSVRJQUwnXTtcbiAgICAgICAgdGhpcy55eWxsb2MgPSB7Zmlyc3RfbGluZToxLGZpcnN0X2NvbHVtbjowLGxhc3RfbGluZToxLGxhc3RfY29sdW1uOjB9O1xuICAgICAgICBpZiAodGhpcy5vcHRpb25zLnJhbmdlcykgdGhpcy55eWxsb2MucmFuZ2UgPSBbMCwwXTtcbiAgICAgICAgdGhpcy5vZmZzZXQgPSAwO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuaW5wdXQ6ZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgY2ggPSB0aGlzLl9pbnB1dFswXTtcbiAgICAgICAgdGhpcy55eXRleHQgKz0gY2g7XG4gICAgICAgIHRoaXMueXlsZW5nKys7XG4gICAgICAgIHRoaXMub2Zmc2V0Kys7XG4gICAgICAgIHRoaXMubWF0Y2ggKz0gY2g7XG4gICAgICAgIHRoaXMubWF0Y2hlZCArPSBjaDtcbiAgICAgICAgdmFyIGxpbmVzID0gY2gubWF0Y2goLyg/Olxcclxcbj98XFxuKS4qL2cpO1xuICAgICAgICBpZiAobGluZXMpIHtcbiAgICAgICAgICAgIHRoaXMueXlsaW5lbm8rKztcbiAgICAgICAgICAgIHRoaXMueXlsbG9jLmxhc3RfbGluZSsrO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy55eWxsb2MubGFzdF9jb2x1bW4rKztcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5vcHRpb25zLnJhbmdlcykgdGhpcy55eWxsb2MucmFuZ2VbMV0rKztcblxuICAgICAgICB0aGlzLl9pbnB1dCA9IHRoaXMuX2lucHV0LnNsaWNlKDEpO1xuICAgICAgICByZXR1cm4gY2g7XG4gICAgfSxcbnVucHV0OmZ1bmN0aW9uIChjaCkge1xuICAgICAgICB2YXIgbGVuID0gY2gubGVuZ3RoO1xuICAgICAgICB2YXIgbGluZXMgPSBjaC5zcGxpdCgvKD86XFxyXFxuP3xcXG4pL2cpO1xuXG4gICAgICAgIHRoaXMuX2lucHV0ID0gY2ggKyB0aGlzLl9pbnB1dDtcbiAgICAgICAgdGhpcy55eXRleHQgPSB0aGlzLnl5dGV4dC5zdWJzdHIoMCwgdGhpcy55eXRleHQubGVuZ3RoLWxlbi0xKTtcbiAgICAgICAgLy90aGlzLnl5bGVuZyAtPSBsZW47XG4gICAgICAgIHRoaXMub2Zmc2V0IC09IGxlbjtcbiAgICAgICAgdmFyIG9sZExpbmVzID0gdGhpcy5tYXRjaC5zcGxpdCgvKD86XFxyXFxuP3xcXG4pL2cpO1xuICAgICAgICB0aGlzLm1hdGNoID0gdGhpcy5tYXRjaC5zdWJzdHIoMCwgdGhpcy5tYXRjaC5sZW5ndGgtMSk7XG4gICAgICAgIHRoaXMubWF0Y2hlZCA9IHRoaXMubWF0Y2hlZC5zdWJzdHIoMCwgdGhpcy5tYXRjaGVkLmxlbmd0aC0xKTtcblxuICAgICAgICBpZiAobGluZXMubGVuZ3RoLTEpIHRoaXMueXlsaW5lbm8gLT0gbGluZXMubGVuZ3RoLTE7XG4gICAgICAgIHZhciByID0gdGhpcy55eWxsb2MucmFuZ2U7XG5cbiAgICAgICAgdGhpcy55eWxsb2MgPSB7Zmlyc3RfbGluZTogdGhpcy55eWxsb2MuZmlyc3RfbGluZSxcbiAgICAgICAgICBsYXN0X2xpbmU6IHRoaXMueXlsaW5lbm8rMSxcbiAgICAgICAgICBmaXJzdF9jb2x1bW46IHRoaXMueXlsbG9jLmZpcnN0X2NvbHVtbixcbiAgICAgICAgICBsYXN0X2NvbHVtbjogbGluZXMgP1xuICAgICAgICAgICAgICAobGluZXMubGVuZ3RoID09PSBvbGRMaW5lcy5sZW5ndGggPyB0aGlzLnl5bGxvYy5maXJzdF9jb2x1bW4gOiAwKSArIG9sZExpbmVzW29sZExpbmVzLmxlbmd0aCAtIGxpbmVzLmxlbmd0aF0ubGVuZ3RoIC0gbGluZXNbMF0ubGVuZ3RoOlxuICAgICAgICAgICAgICB0aGlzLnl5bGxvYy5maXJzdF9jb2x1bW4gLSBsZW5cbiAgICAgICAgICB9O1xuXG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMucmFuZ2VzKSB7XG4gICAgICAgICAgICB0aGlzLnl5bGxvYy5yYW5nZSA9IFtyWzBdLCByWzBdICsgdGhpcy55eWxlbmcgLSBsZW5dO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5tb3JlOmZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fbW9yZSA9IHRydWU7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5sZXNzOmZ1bmN0aW9uIChuKSB7XG4gICAgICAgIHRoaXMudW5wdXQodGhpcy5tYXRjaC5zbGljZShuKSk7XG4gICAgfSxcbnBhc3RJbnB1dDpmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBwYXN0ID0gdGhpcy5tYXRjaGVkLnN1YnN0cigwLCB0aGlzLm1hdGNoZWQubGVuZ3RoIC0gdGhpcy5tYXRjaC5sZW5ndGgpO1xuICAgICAgICByZXR1cm4gKHBhc3QubGVuZ3RoID4gMjAgPyAnLi4uJzonJykgKyBwYXN0LnN1YnN0cigtMjApLnJlcGxhY2UoL1xcbi9nLCBcIlwiKTtcbiAgICB9LFxudXBjb21pbmdJbnB1dDpmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBuZXh0ID0gdGhpcy5tYXRjaDtcbiAgICAgICAgaWYgKG5leHQubGVuZ3RoIDwgMjApIHtcbiAgICAgICAgICAgIG5leHQgKz0gdGhpcy5faW5wdXQuc3Vic3RyKDAsIDIwLW5leHQubGVuZ3RoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKG5leHQuc3Vic3RyKDAsMjApKyhuZXh0Lmxlbmd0aCA+IDIwID8gJy4uLic6JycpKS5yZXBsYWNlKC9cXG4vZywgXCJcIik7XG4gICAgfSxcbnNob3dQb3NpdGlvbjpmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBwcmUgPSB0aGlzLnBhc3RJbnB1dCgpO1xuICAgICAgICB2YXIgYyA9IG5ldyBBcnJheShwcmUubGVuZ3RoICsgMSkuam9pbihcIi1cIik7XG4gICAgICAgIHJldHVybiBwcmUgKyB0aGlzLnVwY29taW5nSW5wdXQoKSArIFwiXFxuXCIgKyBjK1wiXlwiO1xuICAgIH0sXG5uZXh0OmZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMuZG9uZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuRU9GO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy5faW5wdXQpIHRoaXMuZG9uZSA9IHRydWU7XG5cbiAgICAgICAgdmFyIHRva2VuLFxuICAgICAgICAgICAgbWF0Y2gsXG4gICAgICAgICAgICB0ZW1wTWF0Y2gsXG4gICAgICAgICAgICBpbmRleCxcbiAgICAgICAgICAgIGNvbCxcbiAgICAgICAgICAgIGxpbmVzO1xuICAgICAgICBpZiAoIXRoaXMuX21vcmUpIHtcbiAgICAgICAgICAgIHRoaXMueXl0ZXh0ID0gJyc7XG4gICAgICAgICAgICB0aGlzLm1hdGNoID0gJyc7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJ1bGVzID0gdGhpcy5fY3VycmVudFJ1bGVzKCk7XG4gICAgICAgIGZvciAodmFyIGk9MDtpIDwgcnVsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHRlbXBNYXRjaCA9IHRoaXMuX2lucHV0Lm1hdGNoKHRoaXMucnVsZXNbcnVsZXNbaV1dKTtcbiAgICAgICAgICAgIGlmICh0ZW1wTWF0Y2ggJiYgKCFtYXRjaCB8fCB0ZW1wTWF0Y2hbMF0ubGVuZ3RoID4gbWF0Y2hbMF0ubGVuZ3RoKSkge1xuICAgICAgICAgICAgICAgIG1hdGNoID0gdGVtcE1hdGNoO1xuICAgICAgICAgICAgICAgIGluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMub3B0aW9ucy5mbGV4KSBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgICAgIGxpbmVzID0gbWF0Y2hbMF0ubWF0Y2goLyg/Olxcclxcbj98XFxuKS4qL2cpO1xuICAgICAgICAgICAgaWYgKGxpbmVzKSB0aGlzLnl5bGluZW5vICs9IGxpbmVzLmxlbmd0aDtcbiAgICAgICAgICAgIHRoaXMueXlsbG9jID0ge2ZpcnN0X2xpbmU6IHRoaXMueXlsbG9jLmxhc3RfbGluZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhc3RfbGluZTogdGhpcy55eWxpbmVubysxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3RfY29sdW1uOiB0aGlzLnl5bGxvYy5sYXN0X2NvbHVtbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhc3RfY29sdW1uOiBsaW5lcyA/IGxpbmVzW2xpbmVzLmxlbmd0aC0xXS5sZW5ndGgtbGluZXNbbGluZXMubGVuZ3RoLTFdLm1hdGNoKC9cXHI/XFxuPy8pWzBdLmxlbmd0aCA6IHRoaXMueXlsbG9jLmxhc3RfY29sdW1uICsgbWF0Y2hbMF0ubGVuZ3RofTtcbiAgICAgICAgICAgIHRoaXMueXl0ZXh0ICs9IG1hdGNoWzBdO1xuICAgICAgICAgICAgdGhpcy5tYXRjaCArPSBtYXRjaFswXTtcbiAgICAgICAgICAgIHRoaXMubWF0Y2hlcyA9IG1hdGNoO1xuICAgICAgICAgICAgdGhpcy55eWxlbmcgPSB0aGlzLnl5dGV4dC5sZW5ndGg7XG4gICAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLnJhbmdlcykge1xuICAgICAgICAgICAgICAgIHRoaXMueXlsbG9jLnJhbmdlID0gW3RoaXMub2Zmc2V0LCB0aGlzLm9mZnNldCArPSB0aGlzLnl5bGVuZ107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9tb3JlID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLl9pbnB1dCA9IHRoaXMuX2lucHV0LnNsaWNlKG1hdGNoWzBdLmxlbmd0aCk7XG4gICAgICAgICAgICB0aGlzLm1hdGNoZWQgKz0gbWF0Y2hbMF07XG4gICAgICAgICAgICB0b2tlbiA9IHRoaXMucGVyZm9ybUFjdGlvbi5jYWxsKHRoaXMsIHRoaXMueXksIHRoaXMsIHJ1bGVzW2luZGV4XSx0aGlzLmNvbmRpdGlvblN0YWNrW3RoaXMuY29uZGl0aW9uU3RhY2subGVuZ3RoLTFdKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmRvbmUgJiYgdGhpcy5faW5wdXQpIHRoaXMuZG9uZSA9IGZhbHNlO1xuICAgICAgICAgICAgaWYgKHRva2VuKSByZXR1cm4gdG9rZW47XG4gICAgICAgICAgICBlbHNlIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5faW5wdXQgPT09IFwiXCIpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLkVPRjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcnNlRXJyb3IoJ0xleGljYWwgZXJyb3Igb24gbGluZSAnKyh0aGlzLnl5bGluZW5vKzEpKycuIFVucmVjb2duaXplZCB0ZXh0LlxcbicrdGhpcy5zaG93UG9zaXRpb24oKSxcbiAgICAgICAgICAgICAgICAgICAge3RleHQ6IFwiXCIsIHRva2VuOiBudWxsLCBsaW5lOiB0aGlzLnl5bGluZW5vfSk7XG4gICAgICAgIH1cbiAgICB9LFxubGV4OmZ1bmN0aW9uIGxleCgpIHtcbiAgICAgICAgdmFyIHIgPSB0aGlzLm5leHQoKTtcbiAgICAgICAgaWYgKHR5cGVvZiByICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgcmV0dXJuIHI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5sZXgoKTtcbiAgICAgICAgfVxuICAgIH0sXG5iZWdpbjpmdW5jdGlvbiBiZWdpbihjb25kaXRpb24pIHtcbiAgICAgICAgdGhpcy5jb25kaXRpb25TdGFjay5wdXNoKGNvbmRpdGlvbik7XG4gICAgfSxcbnBvcFN0YXRlOmZ1bmN0aW9uIHBvcFN0YXRlKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jb25kaXRpb25TdGFjay5wb3AoKTtcbiAgICB9LFxuX2N1cnJlbnRSdWxlczpmdW5jdGlvbiBfY3VycmVudFJ1bGVzKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jb25kaXRpb25zW3RoaXMuY29uZGl0aW9uU3RhY2tbdGhpcy5jb25kaXRpb25TdGFjay5sZW5ndGgtMV1dLnJ1bGVzO1xuICAgIH0sXG50b3BTdGF0ZTpmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbmRpdGlvblN0YWNrW3RoaXMuY29uZGl0aW9uU3RhY2subGVuZ3RoLTJdO1xuICAgIH0sXG5wdXNoU3RhdGU6ZnVuY3Rpb24gYmVnaW4oY29uZGl0aW9uKSB7XG4gICAgICAgIHRoaXMuYmVnaW4oY29uZGl0aW9uKTtcbiAgICB9fSk7XG5sZXhlci5vcHRpb25zID0ge307XG5sZXhlci5wZXJmb3JtQWN0aW9uID0gZnVuY3Rpb24gYW5vbnltb3VzKHl5LHl5XywkYXZvaWRpbmdfbmFtZV9jb2xsaXNpb25zLFlZX1NUQVJUKSB7XG5cblxuZnVuY3Rpb24gc3RyaXAoc3RhcnQsIGVuZCkge1xuICByZXR1cm4geXlfLnl5dGV4dCA9IHl5Xy55eXRleHQuc3Vic3RyKHN0YXJ0LCB5eV8ueXlsZW5nLWVuZCk7XG59XG5cblxudmFyIFlZU1RBVEU9WVlfU1RBUlRcbnN3aXRjaCgkYXZvaWRpbmdfbmFtZV9jb2xsaXNpb25zKSB7XG5jYXNlIDA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKHl5Xy55eXRleHQuc2xpY2UoLTIpID09PSBcIlxcXFxcXFxcXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHJpcCgwLDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYmVnaW4oXCJtdVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmKHl5Xy55eXRleHQuc2xpY2UoLTEpID09PSBcIlxcXFxcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0cmlwKDAsMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5iZWdpbihcImVtdVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJlZ2luKFwibXVcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoeXlfLnl5dGV4dCkgcmV0dXJuIDE0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG5icmVhaztcbmNhc2UgMTpyZXR1cm4gMTQ7XG5icmVhaztcbmNhc2UgMjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wb3BTdGF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gMTQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbmJyZWFrO1xuY2FzZSAzOnN0cmlwKDAsNCk7IHRoaXMucG9wU3RhdGUoKTsgcmV0dXJuIDE1O1xuYnJlYWs7XG5jYXNlIDQ6cmV0dXJuIDM1O1xuYnJlYWs7XG5jYXNlIDU6cmV0dXJuIDM2O1xuYnJlYWs7XG5jYXNlIDY6cmV0dXJuIDI1O1xuYnJlYWs7XG5jYXNlIDc6cmV0dXJuIDE2O1xuYnJlYWs7XG5jYXNlIDg6cmV0dXJuIDIwO1xuYnJlYWs7XG5jYXNlIDk6cmV0dXJuIDE5O1xuYnJlYWs7XG5jYXNlIDEwOnJldHVybiAxOTtcbmJyZWFrO1xuY2FzZSAxMTpyZXR1cm4gMjM7XG5icmVhaztcbmNhc2UgMTI6cmV0dXJuIDIyO1xuYnJlYWs7XG5jYXNlIDEzOnRoaXMucG9wU3RhdGUoKTsgdGhpcy5iZWdpbignY29tJyk7XG5icmVhaztcbmNhc2UgMTQ6c3RyaXAoMyw1KTsgdGhpcy5wb3BTdGF0ZSgpOyByZXR1cm4gMTU7XG5icmVhaztcbmNhc2UgMTU6cmV0dXJuIDIyO1xuYnJlYWs7XG5jYXNlIDE2OnJldHVybiA0MTtcbmJyZWFrO1xuY2FzZSAxNzpyZXR1cm4gNDA7XG5icmVhaztcbmNhc2UgMTg6cmV0dXJuIDQwO1xuYnJlYWs7XG5jYXNlIDE5OnJldHVybiA0NDtcbmJyZWFrO1xuY2FzZSAyMDovLyBpZ25vcmUgd2hpdGVzcGFjZVxuYnJlYWs7XG5jYXNlIDIxOnRoaXMucG9wU3RhdGUoKTsgcmV0dXJuIDI0O1xuYnJlYWs7XG5jYXNlIDIyOnRoaXMucG9wU3RhdGUoKTsgcmV0dXJuIDE4O1xuYnJlYWs7XG5jYXNlIDIzOnl5Xy55eXRleHQgPSBzdHJpcCgxLDIpLnJlcGxhY2UoL1xcXFxcIi9nLCdcIicpOyByZXR1cm4gMzI7XG5icmVhaztcbmNhc2UgMjQ6eXlfLnl5dGV4dCA9IHN0cmlwKDEsMikucmVwbGFjZSgvXFxcXCcvZyxcIidcIik7IHJldHVybiAzMjtcbmJyZWFrO1xuY2FzZSAyNTpyZXR1cm4gNDI7XG5icmVhaztcbmNhc2UgMjY6cmV0dXJuIDM0O1xuYnJlYWs7XG5jYXNlIDI3OnJldHVybiAzNDtcbmJyZWFrO1xuY2FzZSAyODpyZXR1cm4gMzM7XG5icmVhaztcbmNhc2UgMjk6cmV0dXJuIDQwO1xuYnJlYWs7XG5jYXNlIDMwOnl5Xy55eXRleHQgPSBzdHJpcCgxLDIpOyByZXR1cm4gNDA7XG5icmVhaztcbmNhc2UgMzE6cmV0dXJuICdJTlZBTElEJztcbmJyZWFrO1xuY2FzZSAzMjpyZXR1cm4gNTtcbmJyZWFrO1xufVxufTtcbmxleGVyLnJ1bGVzID0gWy9eKD86W15cXHgwMF0qPyg/PShcXHtcXHspKSkvLC9eKD86W15cXHgwMF0rKS8sL14oPzpbXlxceDAwXXsyLH0/KD89KFxce1xce3xcXFxcXFx7XFx7fFxcXFxcXFxcXFx7XFx7fCQpKSkvLC9eKD86W1xcc1xcU10qPy0tXFx9XFx9KS8sL14oPzpcXCgpLywvXig/OlxcKSkvLC9eKD86XFx7XFx7KH4pPz4pLywvXig/Olxce1xceyh+KT8jKS8sL14oPzpcXHtcXHsofik/XFwvKS8sL14oPzpcXHtcXHsofik/XFxeKS8sL14oPzpcXHtcXHsofik/XFxzKmVsc2VcXGIpLywvXig/Olxce1xceyh+KT9cXHspLywvXig/Olxce1xceyh+KT8mKS8sL14oPzpcXHtcXHshLS0pLywvXig/Olxce1xceyFbXFxzXFxTXSo/XFx9XFx9KS8sL14oPzpcXHtcXHsofik/KS8sL14oPzo9KS8sL14oPzpcXC5cXC4pLywvXig/OlxcLig/PShbPX59XFxzXFwvLildKSkpLywvXig/OltcXC8uXSkvLC9eKD86XFxzKykvLC9eKD86XFx9KH4pP1xcfVxcfSkvLC9eKD86KH4pP1xcfVxcfSkvLC9eKD86XCIoXFxcXFtcIl18W15cIl0pKlwiKS8sL14oPzonKFxcXFxbJ118W14nXSkqJykvLC9eKD86QCkvLC9eKD86dHJ1ZSg/PShbfn1cXHMpXSkpKS8sL14oPzpmYWxzZSg/PShbfn1cXHMpXSkpKS8sL14oPzotP1swLTldKyg/PShbfn1cXHMpXSkpKS8sL14oPzooW15cXHMhXCIjJS0sXFwuXFwvOy0+QFxcWy1cXF5gXFx7LX5dKyg/PShbPX59XFxzXFwvLildKSkpKS8sL14oPzpcXFtbXlxcXV0qXFxdKS8sL14oPzouKS8sL14oPzokKS9dO1xubGV4ZXIuY29uZGl0aW9ucyA9IHtcIm11XCI6e1wicnVsZXNcIjpbNCw1LDYsNyw4LDksMTAsMTEsMTIsMTMsMTQsMTUsMTYsMTcsMTgsMTksMjAsMjEsMjIsMjMsMjQsMjUsMjYsMjcsMjgsMjksMzAsMzEsMzJdLFwiaW5jbHVzaXZlXCI6ZmFsc2V9LFwiZW11XCI6e1wicnVsZXNcIjpbMl0sXCJpbmNsdXNpdmVcIjpmYWxzZX0sXCJjb21cIjp7XCJydWxlc1wiOlszXSxcImluY2x1c2l2ZVwiOmZhbHNlfSxcIklOSVRJQUxcIjp7XCJydWxlc1wiOlswLDEsMzJdLFwiaW5jbHVzaXZlXCI6dHJ1ZX19O1xucmV0dXJuIGxleGVyO30pKClcbnBhcnNlci5sZXhlciA9IGxleGVyO1xuZnVuY3Rpb24gUGFyc2VyICgpIHsgdGhpcy55eSA9IHt9OyB9UGFyc2VyLnByb3RvdHlwZSA9IHBhcnNlcjtwYXJzZXIuUGFyc2VyID0gUGFyc2VyO1xucmV0dXJuIG5ldyBQYXJzZXI7XG59KSgpO2V4cG9ydHNbXCJkZWZhdWx0XCJdID0gaGFuZGxlYmFycztcbi8qIGpzaGludCBpZ25vcmU6ZW5kICovIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBlcnJvclByb3BzID0gWydkZXNjcmlwdGlvbicsICdmaWxlTmFtZScsICdsaW5lTnVtYmVyJywgJ21lc3NhZ2UnLCAnbmFtZScsICdudW1iZXInLCAnc3RhY2snXTtcblxuZnVuY3Rpb24gRXhjZXB0aW9uKG1lc3NhZ2UsIG5vZGUpIHtcbiAgdmFyIGxpbmU7XG4gIGlmIChub2RlICYmIG5vZGUuZmlyc3RMaW5lKSB7XG4gICAgbGluZSA9IG5vZGUuZmlyc3RMaW5lO1xuXG4gICAgbWVzc2FnZSArPSAnIC0gJyArIGxpbmUgKyAnOicgKyBub2RlLmZpcnN0Q29sdW1uO1xuICB9XG5cbiAgdmFyIHRtcCA9IEVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3Rvci5jYWxsKHRoaXMsIG1lc3NhZ2UpO1xuXG4gIC8vIFVuZm9ydHVuYXRlbHkgZXJyb3JzIGFyZSBub3QgZW51bWVyYWJsZSBpbiBDaHJvbWUgKGF0IGxlYXN0KSwgc28gYGZvciBwcm9wIGluIHRtcGAgZG9lc24ndCB3b3JrLlxuICBmb3IgKHZhciBpZHggPSAwOyBpZHggPCBlcnJvclByb3BzLmxlbmd0aDsgaWR4KyspIHtcbiAgICB0aGlzW2Vycm9yUHJvcHNbaWR4XV0gPSB0bXBbZXJyb3JQcm9wc1tpZHhdXTtcbiAgfVxuXG4gIGlmIChsaW5lKSB7XG4gICAgdGhpcy5saW5lTnVtYmVyID0gbGluZTtcbiAgICB0aGlzLmNvbHVtbiA9IG5vZGUuZmlyc3RDb2x1bW47XG4gIH1cbn1cblxuRXhjZXB0aW9uLnByb3RvdHlwZSA9IG5ldyBFcnJvcigpO1xuXG5leHBvcnRzW1wiZGVmYXVsdFwiXSA9IEV4Y2VwdGlvbjsiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBVdGlscyA9IHJlcXVpcmUoXCIuL3V0aWxzXCIpO1xudmFyIEV4Y2VwdGlvbiA9IHJlcXVpcmUoXCIuL2V4Y2VwdGlvblwiKVtcImRlZmF1bHRcIl07XG52YXIgQ09NUElMRVJfUkVWSVNJT04gPSByZXF1aXJlKFwiLi9iYXNlXCIpLkNPTVBJTEVSX1JFVklTSU9OO1xudmFyIFJFVklTSU9OX0NIQU5HRVMgPSByZXF1aXJlKFwiLi9iYXNlXCIpLlJFVklTSU9OX0NIQU5HRVM7XG5cbmZ1bmN0aW9uIGNoZWNrUmV2aXNpb24oY29tcGlsZXJJbmZvKSB7XG4gIHZhciBjb21waWxlclJldmlzaW9uID0gY29tcGlsZXJJbmZvICYmIGNvbXBpbGVySW5mb1swXSB8fCAxLFxuICAgICAgY3VycmVudFJldmlzaW9uID0gQ09NUElMRVJfUkVWSVNJT047XG5cbiAgaWYgKGNvbXBpbGVyUmV2aXNpb24gIT09IGN1cnJlbnRSZXZpc2lvbikge1xuICAgIGlmIChjb21waWxlclJldmlzaW9uIDwgY3VycmVudFJldmlzaW9uKSB7XG4gICAgICB2YXIgcnVudGltZVZlcnNpb25zID0gUkVWSVNJT05fQ0hBTkdFU1tjdXJyZW50UmV2aXNpb25dLFxuICAgICAgICAgIGNvbXBpbGVyVmVyc2lvbnMgPSBSRVZJU0lPTl9DSEFOR0VTW2NvbXBpbGVyUmV2aXNpb25dO1xuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcIlRlbXBsYXRlIHdhcyBwcmVjb21waWxlZCB3aXRoIGFuIG9sZGVyIHZlcnNpb24gb2YgSGFuZGxlYmFycyB0aGFuIHRoZSBjdXJyZW50IHJ1bnRpbWUuIFwiK1xuICAgICAgICAgICAgXCJQbGVhc2UgdXBkYXRlIHlvdXIgcHJlY29tcGlsZXIgdG8gYSBuZXdlciB2ZXJzaW9uIChcIitydW50aW1lVmVyc2lvbnMrXCIpIG9yIGRvd25ncmFkZSB5b3VyIHJ1bnRpbWUgdG8gYW4gb2xkZXIgdmVyc2lvbiAoXCIrY29tcGlsZXJWZXJzaW9ucytcIikuXCIpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBVc2UgdGhlIGVtYmVkZGVkIHZlcnNpb24gaW5mbyBzaW5jZSB0aGUgcnVudGltZSBkb2Vzbid0IGtub3cgYWJvdXQgdGhpcyByZXZpc2lvbiB5ZXRcbiAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oXCJUZW1wbGF0ZSB3YXMgcHJlY29tcGlsZWQgd2l0aCBhIG5ld2VyIHZlcnNpb24gb2YgSGFuZGxlYmFycyB0aGFuIHRoZSBjdXJyZW50IHJ1bnRpbWUuIFwiK1xuICAgICAgICAgICAgXCJQbGVhc2UgdXBkYXRlIHlvdXIgcnVudGltZSB0byBhIG5ld2VyIHZlcnNpb24gKFwiK2NvbXBpbGVySW5mb1sxXStcIikuXCIpO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnRzLmNoZWNrUmV2aXNpb24gPSBjaGVja1JldmlzaW9uOy8vIFRPRE86IFJlbW92ZSB0aGlzIGxpbmUgYW5kIGJyZWFrIHVwIGNvbXBpbGVQYXJ0aWFsXG5cbmZ1bmN0aW9uIHRlbXBsYXRlKHRlbXBsYXRlU3BlYywgZW52KSB7XG4gIGlmICghZW52KSB7XG4gICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcIk5vIGVudmlyb25tZW50IHBhc3NlZCB0byB0ZW1wbGF0ZVwiKTtcbiAgfVxuXG4gIC8vIE5vdGU6IFVzaW5nIGVudi5WTSByZWZlcmVuY2VzIHJhdGhlciB0aGFuIGxvY2FsIHZhciByZWZlcmVuY2VzIHRocm91Z2hvdXQgdGhpcyBzZWN0aW9uIHRvIGFsbG93XG4gIC8vIGZvciBleHRlcm5hbCB1c2VycyB0byBvdmVycmlkZSB0aGVzZSBhcyBwc3VlZG8tc3VwcG9ydGVkIEFQSXMuXG4gIHZhciBpbnZva2VQYXJ0aWFsV3JhcHBlciA9IGZ1bmN0aW9uKHBhcnRpYWwsIG5hbWUsIGNvbnRleHQsIGhlbHBlcnMsIHBhcnRpYWxzLCBkYXRhKSB7XG4gICAgdmFyIHJlc3VsdCA9IGVudi5WTS5pbnZva2VQYXJ0aWFsLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgaWYgKHJlc3VsdCAhPSBudWxsKSB7IHJldHVybiByZXN1bHQ7IH1cblxuICAgIGlmIChlbnYuY29tcGlsZSkge1xuICAgICAgdmFyIG9wdGlvbnMgPSB7IGhlbHBlcnM6IGhlbHBlcnMsIHBhcnRpYWxzOiBwYXJ0aWFscywgZGF0YTogZGF0YSB9O1xuICAgICAgcGFydGlhbHNbbmFtZV0gPSBlbnYuY29tcGlsZShwYXJ0aWFsLCB7IGRhdGE6IGRhdGEgIT09IHVuZGVmaW5lZCB9LCBlbnYpO1xuICAgICAgcmV0dXJuIHBhcnRpYWxzW25hbWVdKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKFwiVGhlIHBhcnRpYWwgXCIgKyBuYW1lICsgXCIgY291bGQgbm90IGJlIGNvbXBpbGVkIHdoZW4gcnVubmluZyBpbiBydW50aW1lLW9ubHkgbW9kZVwiKTtcbiAgICB9XG4gIH07XG5cbiAgLy8gSnVzdCBhZGQgd2F0ZXJcbiAgdmFyIGNvbnRhaW5lciA9IHtcbiAgICBlc2NhcGVFeHByZXNzaW9uOiBVdGlscy5lc2NhcGVFeHByZXNzaW9uLFxuICAgIGludm9rZVBhcnRpYWw6IGludm9rZVBhcnRpYWxXcmFwcGVyLFxuICAgIHByb2dyYW1zOiBbXSxcbiAgICBwcm9ncmFtOiBmdW5jdGlvbihpLCBmbiwgZGF0YSkge1xuICAgICAgdmFyIHByb2dyYW1XcmFwcGVyID0gdGhpcy5wcm9ncmFtc1tpXTtcbiAgICAgIGlmKGRhdGEpIHtcbiAgICAgICAgcHJvZ3JhbVdyYXBwZXIgPSBwcm9ncmFtKGksIGZuLCBkYXRhKTtcbiAgICAgIH0gZWxzZSBpZiAoIXByb2dyYW1XcmFwcGVyKSB7XG4gICAgICAgIHByb2dyYW1XcmFwcGVyID0gdGhpcy5wcm9ncmFtc1tpXSA9IHByb2dyYW0oaSwgZm4pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHByb2dyYW1XcmFwcGVyO1xuICAgIH0sXG4gICAgbWVyZ2U6IGZ1bmN0aW9uKHBhcmFtLCBjb21tb24pIHtcbiAgICAgIHZhciByZXQgPSBwYXJhbSB8fCBjb21tb247XG5cbiAgICAgIGlmIChwYXJhbSAmJiBjb21tb24gJiYgKHBhcmFtICE9PSBjb21tb24pKSB7XG4gICAgICAgIHJldCA9IHt9O1xuICAgICAgICBVdGlscy5leHRlbmQocmV0LCBjb21tb24pO1xuICAgICAgICBVdGlscy5leHRlbmQocmV0LCBwYXJhbSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmV0O1xuICAgIH0sXG4gICAgcHJvZ3JhbVdpdGhEZXB0aDogZW52LlZNLnByb2dyYW1XaXRoRGVwdGgsXG4gICAgbm9vcDogZW52LlZNLm5vb3AsXG4gICAgY29tcGlsZXJJbmZvOiBudWxsXG4gIH07XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB2YXIgbmFtZXNwYWNlID0gb3B0aW9ucy5wYXJ0aWFsID8gb3B0aW9ucyA6IGVudixcbiAgICAgICAgaGVscGVycyxcbiAgICAgICAgcGFydGlhbHM7XG5cbiAgICBpZiAoIW9wdGlvbnMucGFydGlhbCkge1xuICAgICAgaGVscGVycyA9IG9wdGlvbnMuaGVscGVycztcbiAgICAgIHBhcnRpYWxzID0gb3B0aW9ucy5wYXJ0aWFscztcbiAgICB9XG4gICAgdmFyIHJlc3VsdCA9IHRlbXBsYXRlU3BlYy5jYWxsKFxuICAgICAgICAgIGNvbnRhaW5lcixcbiAgICAgICAgICBuYW1lc3BhY2UsIGNvbnRleHQsXG4gICAgICAgICAgaGVscGVycyxcbiAgICAgICAgICBwYXJ0aWFscyxcbiAgICAgICAgICBvcHRpb25zLmRhdGEpO1xuXG4gICAgaWYgKCFvcHRpb25zLnBhcnRpYWwpIHtcbiAgICAgIGVudi5WTS5jaGVja1JldmlzaW9uKGNvbnRhaW5lci5jb21waWxlckluZm8pO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG59XG5cbmV4cG9ydHMudGVtcGxhdGUgPSB0ZW1wbGF0ZTtmdW5jdGlvbiBwcm9ncmFtV2l0aERlcHRoKGksIGZuLCBkYXRhIC8qLCAkZGVwdGggKi8pIHtcbiAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDMpO1xuXG4gIHZhciBwcm9nID0gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIFtjb250ZXh0LCBvcHRpb25zLmRhdGEgfHwgZGF0YV0uY29uY2F0KGFyZ3MpKTtcbiAgfTtcbiAgcHJvZy5wcm9ncmFtID0gaTtcbiAgcHJvZy5kZXB0aCA9IGFyZ3MubGVuZ3RoO1xuICByZXR1cm4gcHJvZztcbn1cblxuZXhwb3J0cy5wcm9ncmFtV2l0aERlcHRoID0gcHJvZ3JhbVdpdGhEZXB0aDtmdW5jdGlvbiBwcm9ncmFtKGksIGZuLCBkYXRhKSB7XG4gIHZhciBwcm9nID0gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgcmV0dXJuIGZuKGNvbnRleHQsIG9wdGlvbnMuZGF0YSB8fCBkYXRhKTtcbiAgfTtcbiAgcHJvZy5wcm9ncmFtID0gaTtcbiAgcHJvZy5kZXB0aCA9IDA7XG4gIHJldHVybiBwcm9nO1xufVxuXG5leHBvcnRzLnByb2dyYW0gPSBwcm9ncmFtO2Z1bmN0aW9uIGludm9rZVBhcnRpYWwocGFydGlhbCwgbmFtZSwgY29udGV4dCwgaGVscGVycywgcGFydGlhbHMsIGRhdGEpIHtcbiAgdmFyIG9wdGlvbnMgPSB7IHBhcnRpYWw6IHRydWUsIGhlbHBlcnM6IGhlbHBlcnMsIHBhcnRpYWxzOiBwYXJ0aWFscywgZGF0YTogZGF0YSB9O1xuXG4gIGlmKHBhcnRpYWwgPT09IHVuZGVmaW5lZCkge1xuICAgIHRocm93IG5ldyBFeGNlcHRpb24oXCJUaGUgcGFydGlhbCBcIiArIG5hbWUgKyBcIiBjb3VsZCBub3QgYmUgZm91bmRcIik7XG4gIH0gZWxzZSBpZihwYXJ0aWFsIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICByZXR1cm4gcGFydGlhbChjb250ZXh0LCBvcHRpb25zKTtcbiAgfVxufVxuXG5leHBvcnRzLmludm9rZVBhcnRpYWwgPSBpbnZva2VQYXJ0aWFsO2Z1bmN0aW9uIG5vb3AoKSB7IHJldHVybiBcIlwiOyB9XG5cbmV4cG9ydHMubm9vcCA9IG5vb3A7IiwiXCJ1c2Ugc3RyaWN0XCI7XG4vLyBCdWlsZCBvdXQgb3VyIGJhc2ljIFNhZmVTdHJpbmcgdHlwZVxuZnVuY3Rpb24gU2FmZVN0cmluZyhzdHJpbmcpIHtcbiAgdGhpcy5zdHJpbmcgPSBzdHJpbmc7XG59XG5cblNhZmVTdHJpbmcucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBcIlwiICsgdGhpcy5zdHJpbmc7XG59O1xuXG5leHBvcnRzW1wiZGVmYXVsdFwiXSA9IFNhZmVTdHJpbmc7IiwiXCJ1c2Ugc3RyaWN0XCI7XG4vKmpzaGludCAtVzAwNCAqL1xudmFyIFNhZmVTdHJpbmcgPSByZXF1aXJlKFwiLi9zYWZlLXN0cmluZ1wiKVtcImRlZmF1bHRcIl07XG5cbnZhciBlc2NhcGUgPSB7XG4gIFwiJlwiOiBcIiZhbXA7XCIsXG4gIFwiPFwiOiBcIiZsdDtcIixcbiAgXCI+XCI6IFwiJmd0O1wiLFxuICAnXCInOiBcIiZxdW90O1wiLFxuICBcIidcIjogXCImI3gyNztcIixcbiAgXCJgXCI6IFwiJiN4NjA7XCJcbn07XG5cbnZhciBiYWRDaGFycyA9IC9bJjw+XCInYF0vZztcbnZhciBwb3NzaWJsZSA9IC9bJjw+XCInYF0vO1xuXG5mdW5jdGlvbiBlc2NhcGVDaGFyKGNocikge1xuICByZXR1cm4gZXNjYXBlW2Nocl0gfHwgXCImYW1wO1wiO1xufVxuXG5mdW5jdGlvbiBleHRlbmQob2JqLCB2YWx1ZSkge1xuICBmb3IodmFyIGtleSBpbiB2YWx1ZSkge1xuICAgIGlmKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh2YWx1ZSwga2V5KSkge1xuICAgICAgb2JqW2tleV0gPSB2YWx1ZVtrZXldO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnRzLmV4dGVuZCA9IGV4dGVuZDt2YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuZXhwb3J0cy50b1N0cmluZyA9IHRvU3RyaW5nO1xuLy8gU291cmNlZCBmcm9tIGxvZGFzaFxuLy8gaHR0cHM6Ly9naXRodWIuY29tL2Jlc3RpZWpzL2xvZGFzaC9ibG9iL21hc3Rlci9MSUNFTlNFLnR4dFxudmFyIGlzRnVuY3Rpb24gPSBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nO1xufTtcbi8vIGZhbGxiYWNrIGZvciBvbGRlciB2ZXJzaW9ucyBvZiBDaHJvbWUgYW5kIFNhZmFyaVxuaWYgKGlzRnVuY3Rpb24oL3gvKSkge1xuICBpc0Z1bmN0aW9uID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nICYmIHRvU3RyaW5nLmNhbGwodmFsdWUpID09PSAnW29iamVjdCBGdW5jdGlvbl0nO1xuICB9O1xufVxudmFyIGlzRnVuY3Rpb247XG5leHBvcnRzLmlzRnVuY3Rpb24gPSBpc0Z1bmN0aW9uO1xudmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JykgPyB0b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gJ1tvYmplY3QgQXJyYXldJyA6IGZhbHNlO1xufTtcbmV4cG9ydHMuaXNBcnJheSA9IGlzQXJyYXk7XG5cbmZ1bmN0aW9uIGVzY2FwZUV4cHJlc3Npb24oc3RyaW5nKSB7XG4gIC8vIGRvbid0IGVzY2FwZSBTYWZlU3RyaW5ncywgc2luY2UgdGhleSdyZSBhbHJlYWR5IHNhZmVcbiAgaWYgKHN0cmluZyBpbnN0YW5jZW9mIFNhZmVTdHJpbmcpIHtcbiAgICByZXR1cm4gc3RyaW5nLnRvU3RyaW5nKCk7XG4gIH0gZWxzZSBpZiAoIXN0cmluZyAmJiBzdHJpbmcgIT09IDApIHtcbiAgICByZXR1cm4gXCJcIjtcbiAgfVxuXG4gIC8vIEZvcmNlIGEgc3RyaW5nIGNvbnZlcnNpb24gYXMgdGhpcyB3aWxsIGJlIGRvbmUgYnkgdGhlIGFwcGVuZCByZWdhcmRsZXNzIGFuZFxuICAvLyB0aGUgcmVnZXggdGVzdCB3aWxsIGRvIHRoaXMgdHJhbnNwYXJlbnRseSBiZWhpbmQgdGhlIHNjZW5lcywgY2F1c2luZyBpc3N1ZXMgaWZcbiAgLy8gYW4gb2JqZWN0J3MgdG8gc3RyaW5nIGhhcyBlc2NhcGVkIGNoYXJhY3RlcnMgaW4gaXQuXG4gIHN0cmluZyA9IFwiXCIgKyBzdHJpbmc7XG5cbiAgaWYoIXBvc3NpYmxlLnRlc3Qoc3RyaW5nKSkgeyByZXR1cm4gc3RyaW5nOyB9XG4gIHJldHVybiBzdHJpbmcucmVwbGFjZShiYWRDaGFycywgZXNjYXBlQ2hhcik7XG59XG5cbmV4cG9ydHMuZXNjYXBlRXhwcmVzc2lvbiA9IGVzY2FwZUV4cHJlc3Npb247ZnVuY3Rpb24gaXNFbXB0eSh2YWx1ZSkge1xuICBpZiAoIXZhbHVlICYmIHZhbHVlICE9PSAwKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSBpZiAoaXNBcnJheSh2YWx1ZSkgJiYgdmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbmV4cG9ydHMuaXNFbXB0eSA9IGlzRW1wdHk7IiwidmFyIFRva2VuaXplciA9IHJlcXVpcmUoXCIuL1Rva2VuaXplci5qc1wiKTtcblxuLypcblx0T3B0aW9uczpcblxuXHR4bWxNb2RlOiBTcGVjaWFsIGJlaGF2aW9yIGZvciBzY3JpcHQvc3R5bGUgdGFncyAodHJ1ZSBieSBkZWZhdWx0KVxuXHRsb3dlckNhc2VBdHRyaWJ1dGVOYW1lczogY2FsbCAudG9Mb3dlckNhc2UgZm9yIGVhY2ggYXR0cmlidXRlIG5hbWUgKHRydWUgaWYgeG1sTW9kZSBpcyBgZmFsc2VgKVxuXHRsb3dlckNhc2VUYWdzOiBjYWxsIC50b0xvd2VyQ2FzZSBmb3IgZWFjaCB0YWcgbmFtZSAodHJ1ZSBpZiB4bWxNb2RlIGlzIGBmYWxzZWApXG4qL1xuXG4vKlxuXHRDYWxsYmFja3M6XG5cblx0b25jZGF0YWVuZCxcblx0b25jZGF0YXN0YXJ0LFxuXHRvbmNsb3NldGFnLFxuXHRvbmNvbW1lbnQsXG5cdG9uY29tbWVudGVuZCxcblx0b25lcnJvcixcblx0b25vcGVudGFnLFxuXHRvbnByb2Nlc3NpbmdpbnN0cnVjdGlvbixcblx0b25yZXNldCxcblx0b250ZXh0XG4qL1xuXG52YXIgZm9ybVRhZ3MgPSB7XG5cdGlucHV0OiB0cnVlLFxuXHRvcHRpb246IHRydWUsXG5cdG9wdGdyb3VwOiB0cnVlLFxuXHRzZWxlY3Q6IHRydWUsXG5cdGJ1dHRvbjogdHJ1ZSxcblx0ZGF0YWxpc3Q6IHRydWUsXG5cdHRleHRhcmVhOiB0cnVlXG59O1xuXG52YXIgb3BlbkltcGxpZXNDbG9zZSA9IHtcblx0dHIgICAgICA6IHsgdHI6dHJ1ZSwgdGg6dHJ1ZSwgdGQ6dHJ1ZSB9LFxuXHR0aCAgICAgIDogeyB0aDp0cnVlIH0sXG5cdHRkICAgICAgOiB7IHRoZWFkOnRydWUsIHRkOnRydWUgfSxcblx0Ym9keSAgICA6IHsgaGVhZDp0cnVlLCBsaW5rOnRydWUsIHNjcmlwdDp0cnVlIH0sXG5cdGxpICAgICAgOiB7IGxpOnRydWUgfSxcblx0cCAgICAgICA6IHsgcDp0cnVlIH0sXG5cdHNlbGVjdCAgOiBmb3JtVGFncyxcblx0aW5wdXQgICA6IGZvcm1UYWdzLFxuXHRvdXRwdXQgIDogZm9ybVRhZ3MsXG5cdGJ1dHRvbiAgOiBmb3JtVGFncyxcblx0ZGF0YWxpc3Q6IGZvcm1UYWdzLFxuXHR0ZXh0YXJlYTogZm9ybVRhZ3MsXG5cdG9wdGlvbiAgOiB7IG9wdGlvbjp0cnVlIH0sXG5cdG9wdGdyb3VwOiB7IG9wdGdyb3VwOnRydWUgfVxufTtcblxudmFyIHZvaWRFbGVtZW50cyA9IHtcblx0X19wcm90b19fOiBudWxsLFxuXHRhcmVhOiB0cnVlLFxuXHRiYXNlOiB0cnVlLFxuXHRiYXNlZm9udDogdHJ1ZSxcblx0YnI6IHRydWUsXG5cdGNvbDogdHJ1ZSxcblx0Y29tbWFuZDogdHJ1ZSxcblx0ZW1iZWQ6IHRydWUsXG5cdGZyYW1lOiB0cnVlLFxuXHRocjogdHJ1ZSxcblx0aW1nOiB0cnVlLFxuXHRpbnB1dDogdHJ1ZSxcblx0aXNpbmRleDogdHJ1ZSxcblx0a2V5Z2VuOiB0cnVlLFxuXHRsaW5rOiB0cnVlLFxuXHRtZXRhOiB0cnVlLFxuXHRwYXJhbTogdHJ1ZSxcblx0c291cmNlOiB0cnVlLFxuXHR0cmFjazogdHJ1ZSxcblx0d2JyOiB0cnVlLFxuXG5cdC8vY29tbW9uIHNlbGYgY2xvc2luZyBzdmcgZWxlbWVudHNcblx0cGF0aDogdHJ1ZSxcblx0Y2lyY2xlOiB0cnVlLFxuXHRlbGxpcHNlOiB0cnVlLFxuXHRsaW5lOiB0cnVlLFxuXHRyZWN0OiB0cnVlLFxuXHR1c2U6IHRydWVcbn07XG5cbnZhciByZV9uYW1lRW5kID0gL1xcc3xcXC8vO1xuXG5mdW5jdGlvbiBQYXJzZXIoY2JzLCBvcHRpb25zKXtcblx0dGhpcy5fb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cdHRoaXMuX2NicyA9IGNicyB8fCB7fTtcblxuXHR0aGlzLl90YWduYW1lID0gXCJcIjtcblx0dGhpcy5fYXR0cmlibmFtZSA9IFwiXCI7XG5cdHRoaXMuX2F0dHJpYnZhbHVlID0gXCJcIjtcblx0dGhpcy5fYXR0cmlicyA9IG51bGw7XG5cdHRoaXMuX3N0YWNrID0gW107XG5cblx0dGhpcy5zdGFydEluZGV4ID0gMDtcblx0dGhpcy5lbmRJbmRleCA9IG51bGw7XG5cblx0dGhpcy5fbG93ZXJDYXNlVGFnTmFtZXMgPSBcImxvd2VyQ2FzZVRhZ3NcIiBpbiB0aGlzLl9vcHRpb25zID9cblx0XHRcdFx0XHRcdFx0XHRcdCEhdGhpcy5fb3B0aW9ucy5sb3dlckNhc2VUYWdzIDpcblx0XHRcdFx0XHRcdFx0XHRcdCF0aGlzLl9vcHRpb25zLnhtbE1vZGU7XG5cdHRoaXMuX2xvd2VyQ2FzZUF0dHJpYnV0ZU5hbWVzID0gXCJsb3dlckNhc2VBdHRyaWJ1dGVOYW1lc1wiIGluIHRoaXMuX29wdGlvbnMgP1xuXHRcdFx0XHRcdFx0XHRcdFx0ISF0aGlzLl9vcHRpb25zLmxvd2VyQ2FzZUF0dHJpYnV0ZU5hbWVzIDpcblx0XHRcdFx0XHRcdFx0XHRcdCF0aGlzLl9vcHRpb25zLnhtbE1vZGU7XG5cblx0dGhpcy5fdG9rZW5pemVyID0gbmV3IFRva2VuaXplcih0aGlzLl9vcHRpb25zLCB0aGlzKTtcbn1cblxucmVxdWlyZShcInV0aWxcIikuaW5oZXJpdHMoUGFyc2VyLCByZXF1aXJlKFwiZXZlbnRzXCIpLkV2ZW50RW1pdHRlcik7XG5cblBhcnNlci5wcm90b3R5cGUuX3VwZGF0ZVBvc2l0aW9uID0gZnVuY3Rpb24oaW5pdGlhbE9mZnNldCl7XG5cdGlmKHRoaXMuZW5kSW5kZXggPT09IG51bGwpe1xuXHRcdGlmKHRoaXMuX3Rva2VuaXplci5fc2VjdGlvblN0YXJ0IDw9IGluaXRpYWxPZmZzZXQpe1xuXHRcdFx0dGhpcy5zdGFydEluZGV4ID0gMDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5zdGFydEluZGV4ID0gdGhpcy5fdG9rZW5pemVyLl9zZWN0aW9uU3RhcnQgLSBpbml0aWFsT2Zmc2V0O1xuXHRcdH1cblx0fVxuXHRlbHNlIHRoaXMuc3RhcnRJbmRleCA9IHRoaXMuZW5kSW5kZXggKyAxO1xuXHR0aGlzLmVuZEluZGV4ID0gdGhpcy5fdG9rZW5pemVyLl9pbmRleDtcbn07XG5cbi8vVG9rZW5pemVyIGV2ZW50IGhhbmRsZXJzXG5QYXJzZXIucHJvdG90eXBlLm9udGV4dCA9IGZ1bmN0aW9uKGRhdGEpe1xuXHR0aGlzLl91cGRhdGVQb3NpdGlvbigxKTtcblx0dGhpcy5lbmRJbmRleC0tO1xuXG5cdGlmKHRoaXMuX2Nicy5vbnRleHQpIHRoaXMuX2Nicy5vbnRleHQoZGF0YSk7XG59O1xuXG5QYXJzZXIucHJvdG90eXBlLm9ub3BlbnRhZ25hbWUgPSBmdW5jdGlvbihuYW1lKXtcblx0aWYodGhpcy5fbG93ZXJDYXNlVGFnTmFtZXMpe1xuXHRcdG5hbWUgPSBuYW1lLnRvTG93ZXJDYXNlKCk7XG5cdH1cblxuXHR0aGlzLl90YWduYW1lID0gbmFtZTtcblxuXHRpZiAoIXRoaXMuX29wdGlvbnMueG1sTW9kZSAmJiBuYW1lIGluIG9wZW5JbXBsaWVzQ2xvc2UpIHtcblx0XHRmb3IoXG5cdFx0XHR2YXIgZWw7XG5cdFx0XHQoZWwgPSB0aGlzLl9zdGFja1t0aGlzLl9zdGFjay5sZW5ndGgtMV0pIGluIG9wZW5JbXBsaWVzQ2xvc2VbbmFtZV07XG5cdFx0XHR0aGlzLm9uY2xvc2V0YWcoZWwpXG5cdFx0KTtcblx0fVxuXG5cdGlmKHRoaXMuX29wdGlvbnMueG1sTW9kZSB8fCAhKG5hbWUgaW4gdm9pZEVsZW1lbnRzKSl7XG5cdFx0dGhpcy5fc3RhY2sucHVzaChuYW1lKTtcblx0fVxuXG5cdGlmKHRoaXMuX2Nicy5vbm9wZW50YWduYW1lKSB0aGlzLl9jYnMub25vcGVudGFnbmFtZShuYW1lKTtcblx0aWYodGhpcy5fY2JzLm9ub3BlbnRhZykgdGhpcy5fYXR0cmlicyA9IHt9O1xufTtcblxuUGFyc2VyLnByb3RvdHlwZS5vbm9wZW50YWdlbmQgPSBmdW5jdGlvbigpe1xuXHR0aGlzLl91cGRhdGVQb3NpdGlvbigxKTtcblxuXHRpZih0aGlzLl9hdHRyaWJzKXtcblx0XHRpZih0aGlzLl9jYnMub25vcGVudGFnKSB0aGlzLl9jYnMub25vcGVudGFnKHRoaXMuX3RhZ25hbWUsIHRoaXMuX2F0dHJpYnMpO1xuXHRcdHRoaXMuX2F0dHJpYnMgPSBudWxsO1xuXHR9XG5cblx0aWYoIXRoaXMuX29wdGlvbnMueG1sTW9kZSAmJiB0aGlzLl9jYnMub25jbG9zZXRhZyAmJiB0aGlzLl90YWduYW1lIGluIHZvaWRFbGVtZW50cyl7XG5cdFx0dGhpcy5fY2JzLm9uY2xvc2V0YWcodGhpcy5fdGFnbmFtZSk7XG5cdH1cblxuXHR0aGlzLl90YWduYW1lID0gXCJcIjtcbn07XG5cblBhcnNlci5wcm90b3R5cGUub25jbG9zZXRhZyA9IGZ1bmN0aW9uKG5hbWUpe1xuXHR0aGlzLl91cGRhdGVQb3NpdGlvbigxKTtcblxuXHRpZih0aGlzLl9sb3dlckNhc2VUYWdOYW1lcyl7XG5cdFx0bmFtZSA9IG5hbWUudG9Mb3dlckNhc2UoKTtcblx0fVxuXG5cdGlmKHRoaXMuX3N0YWNrLmxlbmd0aCAmJiAoIShuYW1lIGluIHZvaWRFbGVtZW50cykgfHwgdGhpcy5fb3B0aW9ucy54bWxNb2RlKSl7XG5cdFx0dmFyIHBvcyA9IHRoaXMuX3N0YWNrLmxhc3RJbmRleE9mKG5hbWUpO1xuXHRcdGlmKHBvcyAhPT0gLTEpe1xuXHRcdFx0aWYodGhpcy5fY2JzLm9uY2xvc2V0YWcpe1xuXHRcdFx0XHRwb3MgPSB0aGlzLl9zdGFjay5sZW5ndGggLSBwb3M7XG5cdFx0XHRcdHdoaWxlKHBvcy0tKSB0aGlzLl9jYnMub25jbG9zZXRhZyh0aGlzLl9zdGFjay5wb3AoKSk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHRoaXMuX3N0YWNrLmxlbmd0aCA9IHBvcztcblx0XHR9IGVsc2UgaWYobmFtZSA9PT0gXCJwXCIgJiYgIXRoaXMuX29wdGlvbnMueG1sTW9kZSl7XG5cdFx0XHR0aGlzLm9ub3BlbnRhZ25hbWUobmFtZSk7XG5cdFx0XHR0aGlzLl9jbG9zZUN1cnJlbnRUYWcoKTtcblx0XHR9XG5cdH0gZWxzZSBpZighdGhpcy5fb3B0aW9ucy54bWxNb2RlICYmIChuYW1lID09PSBcImJyXCIgfHwgbmFtZSA9PT0gXCJwXCIpKXtcblx0XHR0aGlzLm9ub3BlbnRhZ25hbWUobmFtZSk7XG5cdFx0dGhpcy5fY2xvc2VDdXJyZW50VGFnKCk7XG5cdH1cbn07XG5cblBhcnNlci5wcm90b3R5cGUub25zZWxmY2xvc2luZ3RhZyA9IGZ1bmN0aW9uKCl7XG5cdGlmKHRoaXMuX29wdGlvbnMueG1sTW9kZSB8fCB0aGlzLl9vcHRpb25zLnJlY29nbml6ZVNlbGZDbG9zaW5nKXtcblx0XHR0aGlzLl9jbG9zZUN1cnJlbnRUYWcoKTtcblx0fSBlbHNlIHtcblx0XHR0aGlzLm9ub3BlbnRhZ2VuZCgpO1xuXHR9XG59O1xuXG5QYXJzZXIucHJvdG90eXBlLl9jbG9zZUN1cnJlbnRUYWcgPSBmdW5jdGlvbigpe1xuXHR2YXIgbmFtZSA9IHRoaXMuX3RhZ25hbWU7XG5cblx0dGhpcy5vbm9wZW50YWdlbmQoKTtcblxuXHQvL3NlbGYtY2xvc2luZyB0YWdzIHdpbGwgYmUgb24gdGhlIHRvcCBvZiB0aGUgc3RhY2tcblx0Ly8oY2hlYXBlciBjaGVjayB0aGFuIGluIG9uY2xvc2V0YWcpXG5cdGlmKHRoaXMuX3N0YWNrW3RoaXMuX3N0YWNrLmxlbmd0aC0xXSA9PT0gbmFtZSl7XG5cdFx0aWYodGhpcy5fY2JzLm9uY2xvc2V0YWcpe1xuXHRcdFx0dGhpcy5fY2JzLm9uY2xvc2V0YWcobmFtZSk7XG5cdFx0fVxuXHRcdHRoaXMuX3N0YWNrLnBvcCgpO1xuXHR9XG59O1xuXG5QYXJzZXIucHJvdG90eXBlLm9uYXR0cmlibmFtZSA9IGZ1bmN0aW9uKG5hbWUpe1xuXHRpZih0aGlzLl9sb3dlckNhc2VBdHRyaWJ1dGVOYW1lcyl7XG5cdFx0bmFtZSA9IG5hbWUudG9Mb3dlckNhc2UoKTtcblx0fVxuXHR0aGlzLl9hdHRyaWJuYW1lID0gbmFtZTtcbn07XG5cblBhcnNlci5wcm90b3R5cGUub25hdHRyaWJkYXRhID0gZnVuY3Rpb24odmFsdWUpe1xuXHR0aGlzLl9hdHRyaWJ2YWx1ZSArPSB2YWx1ZTtcbn07XG5cblBhcnNlci5wcm90b3R5cGUub25hdHRyaWJlbmQgPSBmdW5jdGlvbigpe1xuXHRpZih0aGlzLl9jYnMub25hdHRyaWJ1dGUpIHRoaXMuX2Nicy5vbmF0dHJpYnV0ZSh0aGlzLl9hdHRyaWJuYW1lLCB0aGlzLl9hdHRyaWJ2YWx1ZSk7XG5cdGlmKFxuXHRcdHRoaXMuX2F0dHJpYnMgJiZcblx0XHQhT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHRoaXMuX2F0dHJpYnMsIHRoaXMuX2F0dHJpYm5hbWUpXG5cdCl7XG5cdFx0dGhpcy5fYXR0cmlic1t0aGlzLl9hdHRyaWJuYW1lXSA9IHRoaXMuX2F0dHJpYnZhbHVlO1xuXHR9XG5cdHRoaXMuX2F0dHJpYm5hbWUgPSBcIlwiO1xuXHR0aGlzLl9hdHRyaWJ2YWx1ZSA9IFwiXCI7XG59O1xuXG5QYXJzZXIucHJvdG90eXBlLl9nZXRJbnN0cnVjdGlvbk5hbWUgPSBmdW5jdGlvbih2YWx1ZSl7XG5cdHZhciBpZHggPSB2YWx1ZS5zZWFyY2gocmVfbmFtZUVuZCksXG5cdCAgICBuYW1lID0gaWR4IDwgMCA/IHZhbHVlIDogdmFsdWUuc3Vic3RyKDAsIGlkeCk7XG5cblx0aWYodGhpcy5fbG93ZXJDYXNlVGFnTmFtZXMpe1xuXHRcdG5hbWUgPSBuYW1lLnRvTG93ZXJDYXNlKCk7XG5cdH1cblxuXHRyZXR1cm4gbmFtZTtcbn07XG5cblBhcnNlci5wcm90b3R5cGUub25kZWNsYXJhdGlvbiA9IGZ1bmN0aW9uKHZhbHVlKXtcblx0aWYodGhpcy5fY2JzLm9ucHJvY2Vzc2luZ2luc3RydWN0aW9uKXtcblx0XHR2YXIgbmFtZSA9IHRoaXMuX2dldEluc3RydWN0aW9uTmFtZSh2YWx1ZSk7XG5cdFx0dGhpcy5fY2JzLm9ucHJvY2Vzc2luZ2luc3RydWN0aW9uKFwiIVwiICsgbmFtZSwgXCIhXCIgKyB2YWx1ZSk7XG5cdH1cbn07XG5cblBhcnNlci5wcm90b3R5cGUub25wcm9jZXNzaW5naW5zdHJ1Y3Rpb24gPSBmdW5jdGlvbih2YWx1ZSl7XG5cdGlmKHRoaXMuX2Nicy5vbnByb2Nlc3NpbmdpbnN0cnVjdGlvbil7XG5cdFx0dmFyIG5hbWUgPSB0aGlzLl9nZXRJbnN0cnVjdGlvbk5hbWUodmFsdWUpO1xuXHRcdHRoaXMuX2Nicy5vbnByb2Nlc3NpbmdpbnN0cnVjdGlvbihcIj9cIiArIG5hbWUsIFwiP1wiICsgdmFsdWUpO1xuXHR9XG59O1xuXG5QYXJzZXIucHJvdG90eXBlLm9uY29tbWVudCA9IGZ1bmN0aW9uKHZhbHVlKXtcblx0dGhpcy5fdXBkYXRlUG9zaXRpb24oNCk7XG5cblx0aWYodGhpcy5fY2JzLm9uY29tbWVudCkgdGhpcy5fY2JzLm9uY29tbWVudCh2YWx1ZSk7XG5cdGlmKHRoaXMuX2Nicy5vbmNvbW1lbnRlbmQpIHRoaXMuX2Nicy5vbmNvbW1lbnRlbmQoKTtcbn07XG5cblBhcnNlci5wcm90b3R5cGUub25jZGF0YSA9IGZ1bmN0aW9uKHZhbHVlKXtcblx0dGhpcy5fdXBkYXRlUG9zaXRpb24oMSk7XG5cblx0aWYodGhpcy5fb3B0aW9ucy54bWxNb2RlIHx8IHRoaXMuX29wdGlvbnMucmVjb2duaXplQ0RBVEEpe1xuXHRcdGlmKHRoaXMuX2Nicy5vbmNkYXRhc3RhcnQpIHRoaXMuX2Nicy5vbmNkYXRhc3RhcnQoKTtcblx0XHRpZih0aGlzLl9jYnMub250ZXh0KSB0aGlzLl9jYnMub250ZXh0KHZhbHVlKTtcblx0XHRpZih0aGlzLl9jYnMub25jZGF0YWVuZCkgdGhpcy5fY2JzLm9uY2RhdGFlbmQoKTtcblx0fSBlbHNlIHtcblx0XHR0aGlzLm9uY29tbWVudChcIltDREFUQVtcIiArIHZhbHVlICsgXCJdXVwiKTtcblx0fVxufTtcblxuUGFyc2VyLnByb3RvdHlwZS5vbmVycm9yID0gZnVuY3Rpb24oZXJyKXtcblx0aWYodGhpcy5fY2JzLm9uZXJyb3IpIHRoaXMuX2Nicy5vbmVycm9yKGVycik7XG59O1xuXG5QYXJzZXIucHJvdG90eXBlLm9uZW5kID0gZnVuY3Rpb24oKXtcblx0aWYodGhpcy5fY2JzLm9uY2xvc2V0YWcpe1xuXHRcdGZvcihcblx0XHRcdHZhciBpID0gdGhpcy5fc3RhY2subGVuZ3RoO1xuXHRcdFx0aSA+IDA7XG5cdFx0XHR0aGlzLl9jYnMub25jbG9zZXRhZyh0aGlzLl9zdGFja1stLWldKVxuXHRcdCk7XG5cdH1cblx0aWYodGhpcy5fY2JzLm9uZW5kKSB0aGlzLl9jYnMub25lbmQoKTtcbn07XG5cblxuLy9SZXNldHMgdGhlIHBhcnNlciB0byBhIGJsYW5rIHN0YXRlLCByZWFkeSB0byBwYXJzZSBhIG5ldyBIVE1MIGRvY3VtZW50XG5QYXJzZXIucHJvdG90eXBlLnJlc2V0ID0gZnVuY3Rpb24oKXtcblx0aWYodGhpcy5fY2JzLm9ucmVzZXQpIHRoaXMuX2Nicy5vbnJlc2V0KCk7XG5cdHRoaXMuX3Rva2VuaXplci5yZXNldCgpO1xuXG5cdHRoaXMuX3RhZ25hbWUgPSBcIlwiO1xuXHR0aGlzLl9hdHRyaWJuYW1lID0gXCJcIjtcblx0dGhpcy5fYXR0cmlicyA9IG51bGw7XG5cdHRoaXMuX3N0YWNrID0gW107XG59O1xuXG4vL1BhcnNlcyBhIGNvbXBsZXRlIEhUTUwgZG9jdW1lbnQgYW5kIHB1c2hlcyBpdCB0byB0aGUgaGFuZGxlclxuUGFyc2VyLnByb3RvdHlwZS5wYXJzZUNvbXBsZXRlID0gZnVuY3Rpb24oZGF0YSl7XG5cdHRoaXMucmVzZXQoKTtcblx0dGhpcy5lbmQoZGF0YSk7XG59O1xuXG5QYXJzZXIucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24oY2h1bmspe1xuXHR0aGlzLl90b2tlbml6ZXIud3JpdGUoY2h1bmspO1xufTtcblxuUGFyc2VyLnByb3RvdHlwZS5lbmQgPSBmdW5jdGlvbihjaHVuayl7XG5cdHRoaXMuX3Rva2VuaXplci5lbmQoY2h1bmspO1xufTtcblxuUGFyc2VyLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uKCl7XG5cdHRoaXMuX3Rva2VuaXplci5wYXVzZSgpO1xufTtcblxuUGFyc2VyLnByb3RvdHlwZS5yZXN1bWUgPSBmdW5jdGlvbigpe1xuXHR0aGlzLl90b2tlbml6ZXIucmVzdW1lKCk7XG59O1xuXG4vL2FsaWFzIGZvciBiYWNrd2FyZHMgY29tcGF0XG5QYXJzZXIucHJvdG90eXBlLnBhcnNlQ2h1bmsgPSBQYXJzZXIucHJvdG90eXBlLndyaXRlO1xuUGFyc2VyLnByb3RvdHlwZS5kb25lID0gUGFyc2VyLnByb3RvdHlwZS5lbmQ7XG5cbm1vZHVsZS5leHBvcnRzID0gUGFyc2VyO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBUb2tlbml6ZXI7XG5cbnZhciBkZWNvZGVDb2RlUG9pbnQgPSByZXF1aXJlKFwiZW50aXRpZXMvbGliL2RlY29kZV9jb2RlcG9pbnQuanNcIiksXG4gICAgZW50aXR5TWFwID0gcmVxdWlyZShcImVudGl0aWVzL21hcHMvZW50aXRpZXMuanNvblwiKSxcbiAgICBsZWdhY3lNYXAgPSByZXF1aXJlKFwiZW50aXRpZXMvbWFwcy9sZWdhY3kuanNvblwiKSxcbiAgICB4bWxNYXAgICAgPSByZXF1aXJlKFwiZW50aXRpZXMvbWFwcy94bWwuanNvblwiKSxcblxuICAgIGkgPSAwLFxuXG4gICAgVEVYVCAgICAgICAgICAgICAgICAgICAgICA9IGkrKyxcbiAgICBCRUZPUkVfVEFHX05BTUUgICAgICAgICAgID0gaSsrLCAvL2FmdGVyIDxcbiAgICBJTl9UQUdfTkFNRSAgICAgICAgICAgICAgID0gaSsrLFxuICAgIElOX1NFTEZfQ0xPU0lOR19UQUcgICAgICAgPSBpKyssXG4gICAgQkVGT1JFX0NMT1NJTkdfVEFHX05BTUUgICA9IGkrKyxcbiAgICBJTl9DTE9TSU5HX1RBR19OQU1FICAgICAgID0gaSsrLFxuICAgIEFGVEVSX0NMT1NJTkdfVEFHX05BTUUgICAgPSBpKyssXG5cbiAgICAvL2F0dHJpYnV0ZXNcbiAgICBCRUZPUkVfQVRUUklCVVRFX05BTUUgICAgID0gaSsrLFxuICAgIElOX0FUVFJJQlVURV9OQU1FICAgICAgICAgPSBpKyssXG4gICAgQUZURVJfQVRUUklCVVRFX05BTUUgICAgICA9IGkrKyxcbiAgICBCRUZPUkVfQVRUUklCVVRFX1ZBTFVFICAgID0gaSsrLFxuICAgIElOX0FUVFJJQlVURV9WQUxVRV9EUSAgICAgPSBpKyssIC8vIFwiXG4gICAgSU5fQVRUUklCVVRFX1ZBTFVFX1NRICAgICA9IGkrKywgLy8gJ1xuICAgIElOX0FUVFJJQlVURV9WQUxVRV9OUSAgICAgPSBpKyssXG5cbiAgICAvL2RlY2xhcmF0aW9uc1xuICAgIEJFRk9SRV9ERUNMQVJBVElPTiAgICAgICAgPSBpKyssIC8vICFcbiAgICBJTl9ERUNMQVJBVElPTiAgICAgICAgICAgID0gaSsrLFxuXG4gICAgLy9wcm9jZXNzaW5nIGluc3RydWN0aW9uc1xuICAgIElOX1BST0NFU1NJTkdfSU5TVFJVQ1RJT04gPSBpKyssIC8vID9cblxuICAgIC8vY29tbWVudHNcbiAgICBCRUZPUkVfQ09NTUVOVCAgICAgICAgICAgID0gaSsrLFxuICAgIElOX0NPTU1FTlQgICAgICAgICAgICAgICAgPSBpKyssXG4gICAgQUZURVJfQ09NTUVOVF8xICAgICAgICAgICA9IGkrKyxcbiAgICBBRlRFUl9DT01NRU5UXzIgICAgICAgICAgID0gaSsrLFxuXG4gICAgLy9jZGF0YVxuICAgIEJFRk9SRV9DREFUQV8xICAgICAgICAgICAgPSBpKyssIC8vIFtcbiAgICBCRUZPUkVfQ0RBVEFfMiAgICAgICAgICAgID0gaSsrLCAvLyBDXG4gICAgQkVGT1JFX0NEQVRBXzMgICAgICAgICAgICA9IGkrKywgLy8gRFxuICAgIEJFRk9SRV9DREFUQV80ICAgICAgICAgICAgPSBpKyssIC8vIEFcbiAgICBCRUZPUkVfQ0RBVEFfNSAgICAgICAgICAgID0gaSsrLCAvLyBUXG4gICAgQkVGT1JFX0NEQVRBXzYgICAgICAgICAgICA9IGkrKywgLy8gQVxuICAgIElOX0NEQVRBICAgICAgICAgICAgICAgICAgPSBpKyssIC8vIFtcbiAgICBBRlRFUl9DREFUQV8xICAgICAgICAgICAgID0gaSsrLCAvLyBdXG4gICAgQUZURVJfQ0RBVEFfMiAgICAgICAgICAgICA9IGkrKywgLy8gXVxuXG4gICAgLy9zcGVjaWFsIHRhZ3NcbiAgICBCRUZPUkVfU1BFQ0lBTCAgICAgICAgICAgID0gaSsrLCAvL1NcbiAgICBCRUZPUkVfU1BFQ0lBTF9FTkQgICAgICAgID0gaSsrLCAgIC8vU1xuXG4gICAgQkVGT1JFX1NDUklQVF8xICAgICAgICAgICA9IGkrKywgLy9DXG4gICAgQkVGT1JFX1NDUklQVF8yICAgICAgICAgICA9IGkrKywgLy9SXG4gICAgQkVGT1JFX1NDUklQVF8zICAgICAgICAgICA9IGkrKywgLy9JXG4gICAgQkVGT1JFX1NDUklQVF80ICAgICAgICAgICA9IGkrKywgLy9QXG4gICAgQkVGT1JFX1NDUklQVF81ICAgICAgICAgICA9IGkrKywgLy9UXG4gICAgQUZURVJfU0NSSVBUXzEgICAgICAgICAgICA9IGkrKywgLy9DXG4gICAgQUZURVJfU0NSSVBUXzIgICAgICAgICAgICA9IGkrKywgLy9SXG4gICAgQUZURVJfU0NSSVBUXzMgICAgICAgICAgICA9IGkrKywgLy9JXG4gICAgQUZURVJfU0NSSVBUXzQgICAgICAgICAgICA9IGkrKywgLy9QXG4gICAgQUZURVJfU0NSSVBUXzUgICAgICAgICAgICA9IGkrKywgLy9UXG5cbiAgICBCRUZPUkVfU1RZTEVfMSAgICAgICAgICAgID0gaSsrLCAvL1RcbiAgICBCRUZPUkVfU1RZTEVfMiAgICAgICAgICAgID0gaSsrLCAvL1lcbiAgICBCRUZPUkVfU1RZTEVfMyAgICAgICAgICAgID0gaSsrLCAvL0xcbiAgICBCRUZPUkVfU1RZTEVfNCAgICAgICAgICAgID0gaSsrLCAvL0VcbiAgICBBRlRFUl9TVFlMRV8xICAgICAgICAgICAgID0gaSsrLCAvL1RcbiAgICBBRlRFUl9TVFlMRV8yICAgICAgICAgICAgID0gaSsrLCAvL1lcbiAgICBBRlRFUl9TVFlMRV8zICAgICAgICAgICAgID0gaSsrLCAvL0xcbiAgICBBRlRFUl9TVFlMRV80ICAgICAgICAgICAgID0gaSsrLCAvL0VcblxuICAgIEJFRk9SRV9FTlRJVFkgICAgICAgICAgICAgPSBpKyssIC8vJlxuICAgIEJFRk9SRV9OVU1FUklDX0VOVElUWSAgICAgPSBpKyssIC8vI1xuICAgIElOX05BTUVEX0VOVElUWSAgICAgICAgICAgPSBpKyssXG4gICAgSU5fTlVNRVJJQ19FTlRJVFkgICAgICAgICA9IGkrKyxcbiAgICBJTl9IRVhfRU5USVRZICAgICAgICAgICAgID0gaSsrLCAvL1hcblxuICAgIGogPSAwLFxuXG4gICAgU1BFQ0lBTF9OT05FICAgICAgICAgICAgICA9IGorKyxcbiAgICBTUEVDSUFMX1NDUklQVCAgICAgICAgICAgID0gaisrLFxuICAgIFNQRUNJQUxfU1RZTEUgICAgICAgICAgICAgPSBqKys7XG5cbmZ1bmN0aW9uIHdoaXRlc3BhY2UoYyl7XG5cdHJldHVybiBjID09PSBcIiBcIiB8fCBjID09PSBcIlxcblwiIHx8IGMgPT09IFwiXFx0XCIgfHwgYyA9PT0gXCJcXGZcIiB8fCBjID09PSBcIlxcclwiO1xufVxuXG5mdW5jdGlvbiBjaGFyYWN0ZXJTdGF0ZShjaGFyLCBTVUNDRVNTKXtcblx0cmV0dXJuIGZ1bmN0aW9uKGMpe1xuXHRcdGlmKGMgPT09IGNoYXIpIHRoaXMuX3N0YXRlID0gU1VDQ0VTUztcblx0fTtcbn1cblxuZnVuY3Rpb24gaWZFbHNlU3RhdGUodXBwZXIsIFNVQ0NFU1MsIEZBSUxVUkUpe1xuXHR2YXIgbG93ZXIgPSB1cHBlci50b0xvd2VyQ2FzZSgpO1xuXG5cdGlmKHVwcGVyID09PSBsb3dlcil7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uKGMpe1xuXHRcdFx0aWYoYyA9PT0gbG93ZXIpe1xuXHRcdFx0XHR0aGlzLl9zdGF0ZSA9IFNVQ0NFU1M7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzLl9zdGF0ZSA9IEZBSUxVUkU7XG5cdFx0XHRcdHRoaXMuX2luZGV4LS07XG5cdFx0XHR9XG5cdFx0fTtcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gZnVuY3Rpb24oYyl7XG5cdFx0XHRpZihjID09PSBsb3dlciB8fCBjID09PSB1cHBlcil7XG5cdFx0XHRcdHRoaXMuX3N0YXRlID0gU1VDQ0VTUztcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRoaXMuX3N0YXRlID0gRkFJTFVSRTtcblx0XHRcdFx0dGhpcy5faW5kZXgtLTtcblx0XHRcdH1cblx0XHR9O1xuXHR9XG59XG5cbmZ1bmN0aW9uIGNvbnN1bWVTcGVjaWFsTmFtZUNoYXIodXBwZXIsIE5FWFRfU1RBVEUpe1xuXHR2YXIgbG93ZXIgPSB1cHBlci50b0xvd2VyQ2FzZSgpO1xuXG5cdHJldHVybiBmdW5jdGlvbihjKXtcblx0XHRpZihjID09PSBsb3dlciB8fCBjID09PSB1cHBlcil7XG5cdFx0XHR0aGlzLl9zdGF0ZSA9IE5FWFRfU1RBVEU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuX3N0YXRlID0gSU5fVEFHX05BTUU7XG5cdFx0XHR0aGlzLl9pbmRleC0tOyAvL2NvbnN1bWUgdGhlIHRva2VuIGFnYWluXG5cdFx0fVxuXHR9O1xufVxuXG5mdW5jdGlvbiBUb2tlbml6ZXIob3B0aW9ucywgY2JzKXtcblx0dGhpcy5fc3RhdGUgPSBURVhUO1xuXHR0aGlzLl9idWZmZXIgPSBcIlwiO1xuXHR0aGlzLl9zZWN0aW9uU3RhcnQgPSAwO1xuXHR0aGlzLl9pbmRleCA9IDA7XG5cdHRoaXMuX2Jhc2VTdGF0ZSA9IFRFWFQ7XG5cdHRoaXMuX3NwZWNpYWwgPSBTUEVDSUFMX05PTkU7XG5cdHRoaXMuX2NicyA9IGNicztcblx0dGhpcy5fcnVubmluZyA9IHRydWU7XG5cdHRoaXMuX2VuZGVkID0gZmFsc2U7XG5cdHRoaXMuX3htbE1vZGUgPSAhIShvcHRpb25zICYmIG9wdGlvbnMueG1sTW9kZSk7XG5cdHRoaXMuX2RlY29kZUVudGl0aWVzID0gISEob3B0aW9ucyAmJiBvcHRpb25zLmRlY29kZUVudGl0aWVzKTtcbn1cblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVUZXh0ID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiPFwiKXtcblx0XHRpZih0aGlzLl9pbmRleCA+IHRoaXMuX3NlY3Rpb25TdGFydCl7XG5cdFx0XHR0aGlzLl9jYnMub250ZXh0KHRoaXMuX2dldFNlY3Rpb24oKSk7XG5cdFx0fVxuXHRcdHRoaXMuX3N0YXRlID0gQkVGT1JFX1RBR19OQU1FO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4O1xuXHR9IGVsc2UgaWYodGhpcy5fZGVjb2RlRW50aXRpZXMgJiYgdGhpcy5fc3BlY2lhbCA9PT0gU1BFQ0lBTF9OT05FICYmIGMgPT09IFwiJlwiKXtcblx0XHRpZih0aGlzLl9pbmRleCA+IHRoaXMuX3NlY3Rpb25TdGFydCl7XG5cdFx0XHR0aGlzLl9jYnMub250ZXh0KHRoaXMuX2dldFNlY3Rpb24oKSk7XG5cdFx0fVxuXHRcdHRoaXMuX2Jhc2VTdGF0ZSA9IFRFWFQ7XG5cdFx0dGhpcy5fc3RhdGUgPSBCRUZPUkVfRU5USVRZO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4O1xuXHR9XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUJlZm9yZVRhZ05hbWUgPSBmdW5jdGlvbihjKXtcblx0aWYoYyA9PT0gXCIvXCIpe1xuXHRcdHRoaXMuX3N0YXRlID0gQkVGT1JFX0NMT1NJTkdfVEFHX05BTUU7XG5cdH0gZWxzZSBpZihjID09PSBcIj5cIiB8fCB0aGlzLl9zcGVjaWFsICE9PSBTUEVDSUFMX05PTkUgfHwgd2hpdGVzcGFjZShjKSkge1xuXHRcdHRoaXMuX3N0YXRlID0gVEVYVDtcblx0fSBlbHNlIGlmKGMgPT09IFwiIVwiKXtcblx0XHR0aGlzLl9zdGF0ZSA9IEJFRk9SRV9ERUNMQVJBVElPTjtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleCArIDE7XG5cdH0gZWxzZSBpZihjID09PSBcIj9cIil7XG5cdFx0dGhpcy5fc3RhdGUgPSBJTl9QUk9DRVNTSU5HX0lOU1RSVUNUSU9OO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4ICsgMTtcblx0fSBlbHNlIGlmKGMgPT09IFwiPFwiKXtcblx0XHR0aGlzLl9jYnMub250ZXh0KHRoaXMuX2dldFNlY3Rpb24oKSk7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXg7XG5cdH0gZWxzZSB7XG5cdFx0dGhpcy5fc3RhdGUgPSAoIXRoaXMuX3htbE1vZGUgJiYgKGMgPT09IFwic1wiIHx8IGMgPT09IFwiU1wiKSkgP1xuXHRcdFx0XHRcdFx0QkVGT1JFX1NQRUNJQUwgOiBJTl9UQUdfTkFNRTtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleDtcblx0fVxufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVJblRhZ05hbWUgPSBmdW5jdGlvbihjKXtcblx0aWYoYyA9PT0gXCIvXCIgfHwgYyA9PT0gXCI+XCIgfHwgd2hpdGVzcGFjZShjKSl7XG5cdFx0dGhpcy5fZW1pdFRva2VuKFwib25vcGVudGFnbmFtZVwiKTtcblx0XHR0aGlzLl9zdGF0ZSA9IEJFRk9SRV9BVFRSSUJVVEVfTkFNRTtcblx0XHR0aGlzLl9pbmRleC0tO1xuXHR9XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUJlZm9yZUNsb3NlaW5nVGFnTmFtZSA9IGZ1bmN0aW9uKGMpe1xuXHRpZih3aGl0ZXNwYWNlKGMpKTtcblx0ZWxzZSBpZihjID09PSBcIj5cIil7XG5cdFx0dGhpcy5fc3RhdGUgPSBURVhUO1xuXHR9IGVsc2UgaWYodGhpcy5fc3BlY2lhbCAhPT0gU1BFQ0lBTF9OT05FKXtcblx0XHRpZihjID09PSBcInNcIiB8fCBjID09PSBcIlNcIil7XG5cdFx0XHR0aGlzLl9zdGF0ZSA9IEJFRk9SRV9TUEVDSUFMX0VORDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5fc3RhdGUgPSBURVhUO1xuXHRcdFx0dGhpcy5faW5kZXgtLTtcblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0dGhpcy5fc3RhdGUgPSBJTl9DTE9TSU5HX1RBR19OQU1FO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4O1xuXHR9XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUluQ2xvc2VpbmdUYWdOYW1lID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiPlwiIHx8IHdoaXRlc3BhY2UoYykpe1xuXHRcdHRoaXMuX2VtaXRUb2tlbihcIm9uY2xvc2V0YWdcIik7XG5cdFx0dGhpcy5fc3RhdGUgPSBBRlRFUl9DTE9TSU5HX1RBR19OQU1FO1xuXHRcdHRoaXMuX2luZGV4LS07XG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQWZ0ZXJDbG9zZWluZ1RhZ05hbWUgPSBmdW5jdGlvbihjKXtcblx0Ly9za2lwIGV2ZXJ5dGhpbmcgdW50aWwgXCI+XCJcblx0aWYoYyA9PT0gXCI+XCIpe1xuXHRcdHRoaXMuX3N0YXRlID0gVEVYVDtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleCArIDE7XG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlQXR0cmlidXRlTmFtZSA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIj5cIil7XG5cdFx0dGhpcy5fY2JzLm9ub3BlbnRhZ2VuZCgpO1xuXHRcdHRoaXMuX3N0YXRlID0gVEVYVDtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleCArIDE7XG5cdH0gZWxzZSBpZihjID09PSBcIi9cIil7XG5cdFx0dGhpcy5fc3RhdGUgPSBJTl9TRUxGX0NMT1NJTkdfVEFHO1xuXHR9IGVsc2UgaWYoIXdoaXRlc3BhY2UoYykpe1xuXHRcdHRoaXMuX3N0YXRlID0gSU5fQVRUUklCVVRFX05BTUU7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXg7XG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlSW5TZWxmQ2xvc2luZ1RhZyA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIj5cIil7XG5cdFx0dGhpcy5fY2JzLm9uc2VsZmNsb3Npbmd0YWcoKTtcblx0XHR0aGlzLl9zdGF0ZSA9IFRFWFQ7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXggKyAxO1xuXHR9IGVsc2UgaWYoIXdoaXRlc3BhY2UoYykpe1xuXHRcdHRoaXMuX3N0YXRlID0gQkVGT1JFX0FUVFJJQlVURV9OQU1FO1xuXHRcdHRoaXMuX2luZGV4LS07XG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlSW5BdHRyaWJ1dGVOYW1lID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiPVwiIHx8IGMgPT09IFwiL1wiIHx8IGMgPT09IFwiPlwiIHx8IHdoaXRlc3BhY2UoYykpe1xuXHRcdHRoaXMuX2Nicy5vbmF0dHJpYm5hbWUodGhpcy5fZ2V0U2VjdGlvbigpKTtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSAtMTtcblx0XHR0aGlzLl9zdGF0ZSA9IEFGVEVSX0FUVFJJQlVURV9OQU1FO1xuXHRcdHRoaXMuX2luZGV4LS07XG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQWZ0ZXJBdHRyaWJ1dGVOYW1lID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiPVwiKXtcblx0XHR0aGlzLl9zdGF0ZSA9IEJFRk9SRV9BVFRSSUJVVEVfVkFMVUU7XG5cdH0gZWxzZSBpZihjID09PSBcIi9cIiB8fCBjID09PSBcIj5cIil7XG5cdFx0dGhpcy5fY2JzLm9uYXR0cmliZW5kKCk7XG5cdFx0dGhpcy5fc3RhdGUgPSBCRUZPUkVfQVRUUklCVVRFX05BTUU7XG5cdFx0dGhpcy5faW5kZXgtLTtcblx0fSBlbHNlIGlmKCF3aGl0ZXNwYWNlKGMpKXtcblx0XHR0aGlzLl9jYnMub25hdHRyaWJlbmQoKTtcblx0XHR0aGlzLl9zdGF0ZSA9IElOX0FUVFJJQlVURV9OQU1FO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4O1xuXHR9XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUJlZm9yZUF0dHJpYnV0ZVZhbHVlID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiXFxcIlwiKXtcblx0XHR0aGlzLl9zdGF0ZSA9IElOX0FUVFJJQlVURV9WQUxVRV9EUTtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleCArIDE7XG5cdH0gZWxzZSBpZihjID09PSBcIidcIil7XG5cdFx0dGhpcy5fc3RhdGUgPSBJTl9BVFRSSUJVVEVfVkFMVUVfU1E7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXggKyAxO1xuXHR9IGVsc2UgaWYoIXdoaXRlc3BhY2UoYykpe1xuXHRcdHRoaXMuX3N0YXRlID0gSU5fQVRUUklCVVRFX1ZBTFVFX05RO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4O1xuXHRcdHRoaXMuX2luZGV4LS07IC8vcmVjb25zdW1lIHRva2VuXG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlSW5BdHRyaWJ1dGVWYWx1ZURvdWJsZVF1b3RlcyA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIlxcXCJcIil7XG5cdFx0dGhpcy5fZW1pdFRva2VuKFwib25hdHRyaWJkYXRhXCIpO1xuXHRcdHRoaXMuX2Nicy5vbmF0dHJpYmVuZCgpO1xuXHRcdHRoaXMuX3N0YXRlID0gQkVGT1JFX0FUVFJJQlVURV9OQU1FO1xuXHR9IGVsc2UgaWYodGhpcy5fZGVjb2RlRW50aXRpZXMgJiYgYyA9PT0gXCImXCIpe1xuXHRcdHRoaXMuX2VtaXRUb2tlbihcIm9uYXR0cmliZGF0YVwiKTtcblx0XHR0aGlzLl9iYXNlU3RhdGUgPSB0aGlzLl9zdGF0ZTtcblx0XHR0aGlzLl9zdGF0ZSA9IEJFRk9SRV9FTlRJVFk7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXg7XG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlSW5BdHRyaWJ1dGVWYWx1ZVNpbmdsZVF1b3RlcyA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIidcIil7XG5cdFx0dGhpcy5fZW1pdFRva2VuKFwib25hdHRyaWJkYXRhXCIpO1xuXHRcdHRoaXMuX2Nicy5vbmF0dHJpYmVuZCgpO1xuXHRcdHRoaXMuX3N0YXRlID0gQkVGT1JFX0FUVFJJQlVURV9OQU1FO1xuXHR9IGVsc2UgaWYodGhpcy5fZGVjb2RlRW50aXRpZXMgJiYgYyA9PT0gXCImXCIpe1xuXHRcdHRoaXMuX2VtaXRUb2tlbihcIm9uYXR0cmliZGF0YVwiKTtcblx0XHR0aGlzLl9iYXNlU3RhdGUgPSB0aGlzLl9zdGF0ZTtcblx0XHR0aGlzLl9zdGF0ZSA9IEJFRk9SRV9FTlRJVFk7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXg7XG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlSW5BdHRyaWJ1dGVWYWx1ZU5vUXVvdGVzID0gZnVuY3Rpb24oYyl7XG5cdGlmKHdoaXRlc3BhY2UoYykgfHwgYyA9PT0gXCI+XCIpe1xuXHRcdHRoaXMuX2VtaXRUb2tlbihcIm9uYXR0cmliZGF0YVwiKTtcblx0XHR0aGlzLl9jYnMub25hdHRyaWJlbmQoKTtcblx0XHR0aGlzLl9zdGF0ZSA9IEJFRk9SRV9BVFRSSUJVVEVfTkFNRTtcblx0XHR0aGlzLl9pbmRleC0tO1xuXHR9IGVsc2UgaWYodGhpcy5fZGVjb2RlRW50aXRpZXMgJiYgYyA9PT0gXCImXCIpe1xuXHRcdHRoaXMuX2VtaXRUb2tlbihcIm9uYXR0cmliZGF0YVwiKTtcblx0XHR0aGlzLl9iYXNlU3RhdGUgPSB0aGlzLl9zdGF0ZTtcblx0XHR0aGlzLl9zdGF0ZSA9IEJFRk9SRV9FTlRJVFk7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXg7XG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlRGVjbGFyYXRpb24gPSBmdW5jdGlvbihjKXtcblx0dGhpcy5fc3RhdGUgPSBjID09PSBcIltcIiA/IEJFRk9SRV9DREFUQV8xIDpcblx0XHRcdFx0XHRjID09PSBcIi1cIiA/IEJFRk9SRV9DT01NRU5UIDpcblx0XHRcdFx0XHRcdElOX0RFQ0xBUkFUSU9OO1xufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVJbkRlY2xhcmF0aW9uID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiPlwiKXtcblx0XHR0aGlzLl9jYnMub25kZWNsYXJhdGlvbih0aGlzLl9nZXRTZWN0aW9uKCkpO1xuXHRcdHRoaXMuX3N0YXRlID0gVEVYVDtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleCArIDE7XG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlSW5Qcm9jZXNzaW5nSW5zdHJ1Y3Rpb24gPSBmdW5jdGlvbihjKXtcblx0aWYoYyA9PT0gXCI+XCIpe1xuXHRcdHRoaXMuX2Nicy5vbnByb2Nlc3NpbmdpbnN0cnVjdGlvbih0aGlzLl9nZXRTZWN0aW9uKCkpO1xuXHRcdHRoaXMuX3N0YXRlID0gVEVYVDtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleCArIDE7XG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlQ29tbWVudCA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIi1cIil7XG5cdFx0dGhpcy5fc3RhdGUgPSBJTl9DT01NRU5UO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4ICsgMTtcblx0fSBlbHNlIHtcblx0XHR0aGlzLl9zdGF0ZSA9IElOX0RFQ0xBUkFUSU9OO1xuXHR9XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUluQ29tbWVudCA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIi1cIikgdGhpcy5fc3RhdGUgPSBBRlRFUl9DT01NRU5UXzE7XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUFmdGVyQ29tbWVudDEgPSBjaGFyYWN0ZXJTdGF0ZShcIi1cIiwgQUZURVJfQ09NTUVOVF8yKTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVBZnRlckNvbW1lbnQyID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiPlwiKXtcblx0XHQvL3JlbW92ZSAyIHRyYWlsaW5nIGNoYXJzXG5cdFx0dGhpcy5fY2JzLm9uY29tbWVudCh0aGlzLl9idWZmZXIuc3Vic3RyaW5nKHRoaXMuX3NlY3Rpb25TdGFydCwgdGhpcy5faW5kZXggLSAyKSk7XG5cdFx0dGhpcy5fc3RhdGUgPSBURVhUO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4ICsgMTtcblx0fSBlbHNlIGlmKGMgIT09IFwiLVwiKXtcblx0XHR0aGlzLl9zdGF0ZSA9IElOX0NPTU1FTlQ7XG5cdH1cblx0Ly8gZWxzZTogc3RheSBpbiBBRlRFUl9DT01NRU5UXzIgKGAtLS0+YClcbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlQ2RhdGExID0gaWZFbHNlU3RhdGUoXCJDXCIsIEJFRk9SRV9DREFUQV8yLCBJTl9ERUNMQVJBVElPTik7XG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUJlZm9yZUNkYXRhMiA9IGlmRWxzZVN0YXRlKFwiRFwiLCBCRUZPUkVfQ0RBVEFfMywgSU5fREVDTEFSQVRJT04pO1xuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVCZWZvcmVDZGF0YTMgPSBpZkVsc2VTdGF0ZShcIkFcIiwgQkVGT1JFX0NEQVRBXzQsIElOX0RFQ0xBUkFUSU9OKTtcblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlQ2RhdGE0ID0gaWZFbHNlU3RhdGUoXCJUXCIsIEJFRk9SRV9DREFUQV81LCBJTl9ERUNMQVJBVElPTik7XG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUJlZm9yZUNkYXRhNSA9IGlmRWxzZVN0YXRlKFwiQVwiLCBCRUZPUkVfQ0RBVEFfNiwgSU5fREVDTEFSQVRJT04pO1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUJlZm9yZUNkYXRhNiA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIltcIil7XG5cdFx0dGhpcy5fc3RhdGUgPSBJTl9DREFUQTtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleCArIDE7XG5cdH0gZWxzZSB7XG5cdFx0dGhpcy5fc3RhdGUgPSBJTl9ERUNMQVJBVElPTjtcblx0XHR0aGlzLl9pbmRleC0tO1xuXHR9XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUluQ2RhdGEgPSBmdW5jdGlvbihjKXtcblx0aWYoYyA9PT0gXCJdXCIpIHRoaXMuX3N0YXRlID0gQUZURVJfQ0RBVEFfMTtcbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQWZ0ZXJDZGF0YTEgPSBjaGFyYWN0ZXJTdGF0ZShcIl1cIiwgQUZURVJfQ0RBVEFfMik7XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQWZ0ZXJDZGF0YTIgPSBmdW5jdGlvbihjKXtcblx0aWYoYyA9PT0gXCI+XCIpe1xuXHRcdC8vcmVtb3ZlIDIgdHJhaWxpbmcgY2hhcnNcblx0XHR0aGlzLl9jYnMub25jZGF0YSh0aGlzLl9idWZmZXIuc3Vic3RyaW5nKHRoaXMuX3NlY3Rpb25TdGFydCwgdGhpcy5faW5kZXggLSAyKSk7XG5cdFx0dGhpcy5fc3RhdGUgPSBURVhUO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4ICsgMTtcblx0fSBlbHNlIGlmIChjICE9PSBcIl1cIikge1xuXHRcdHRoaXMuX3N0YXRlID0gSU5fQ0RBVEE7XG5cdH1cblx0Ly9lbHNlOiBzdGF5IGluIEFGVEVSX0NEQVRBXzIgKGBdXV0+YClcbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlU3BlY2lhbCA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcImNcIiB8fCBjID09PSBcIkNcIil7XG5cdFx0dGhpcy5fc3RhdGUgPSBCRUZPUkVfU0NSSVBUXzE7XG5cdH0gZWxzZSBpZihjID09PSBcInRcIiB8fCBjID09PSBcIlRcIil7XG5cdFx0dGhpcy5fc3RhdGUgPSBCRUZPUkVfU1RZTEVfMTtcblx0fSBlbHNlIHtcblx0XHR0aGlzLl9zdGF0ZSA9IElOX1RBR19OQU1FO1xuXHRcdHRoaXMuX2luZGV4LS07IC8vY29uc3VtZSB0aGUgdG9rZW4gYWdhaW5cblx0fVxufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVCZWZvcmVTcGVjaWFsRW5kID0gZnVuY3Rpb24oYyl7XG5cdGlmKHRoaXMuX3NwZWNpYWwgPT09IFNQRUNJQUxfU0NSSVBUICYmIChjID09PSBcImNcIiB8fCBjID09PSBcIkNcIikpe1xuXHRcdHRoaXMuX3N0YXRlID0gQUZURVJfU0NSSVBUXzE7XG5cdH0gZWxzZSBpZih0aGlzLl9zcGVjaWFsID09PSBTUEVDSUFMX1NUWUxFICYmIChjID09PSBcInRcIiB8fCBjID09PSBcIlRcIikpe1xuXHRcdHRoaXMuX3N0YXRlID0gQUZURVJfU1RZTEVfMTtcblx0fVxuXHRlbHNlIHRoaXMuX3N0YXRlID0gVEVYVDtcbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlU2NyaXB0MSA9IGNvbnN1bWVTcGVjaWFsTmFtZUNoYXIoXCJSXCIsIEJFRk9SRV9TQ1JJUFRfMik7XG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUJlZm9yZVNjcmlwdDIgPSBjb25zdW1lU3BlY2lhbE5hbWVDaGFyKFwiSVwiLCBCRUZPUkVfU0NSSVBUXzMpO1xuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVCZWZvcmVTY3JpcHQzID0gY29uc3VtZVNwZWNpYWxOYW1lQ2hhcihcIlBcIiwgQkVGT1JFX1NDUklQVF80KTtcblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlU2NyaXB0NCA9IGNvbnN1bWVTcGVjaWFsTmFtZUNoYXIoXCJUXCIsIEJFRk9SRV9TQ1JJUFRfNSk7XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlU2NyaXB0NSA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIi9cIiB8fCBjID09PSBcIj5cIiB8fCB3aGl0ZXNwYWNlKGMpKXtcblx0XHR0aGlzLl9zcGVjaWFsID0gU1BFQ0lBTF9TQ1JJUFQ7XG5cdH1cblx0dGhpcy5fc3RhdGUgPSBJTl9UQUdfTkFNRTtcblx0dGhpcy5faW5kZXgtLTsgLy9jb25zdW1lIHRoZSB0b2tlbiBhZ2FpblxufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVBZnRlclNjcmlwdDEgPSBpZkVsc2VTdGF0ZShcIlJcIiwgQUZURVJfU0NSSVBUXzIsIFRFWFQpO1xuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVBZnRlclNjcmlwdDIgPSBpZkVsc2VTdGF0ZShcIklcIiwgQUZURVJfU0NSSVBUXzMsIFRFWFQpO1xuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVBZnRlclNjcmlwdDMgPSBpZkVsc2VTdGF0ZShcIlBcIiwgQUZURVJfU0NSSVBUXzQsIFRFWFQpO1xuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVBZnRlclNjcmlwdDQgPSBpZkVsc2VTdGF0ZShcIlRcIiwgQUZURVJfU0NSSVBUXzUsIFRFWFQpO1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUFmdGVyU2NyaXB0NSA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIj5cIiB8fCB3aGl0ZXNwYWNlKGMpKXtcblx0XHR0aGlzLl9zcGVjaWFsID0gU1BFQ0lBTF9OT05FO1xuXHRcdHRoaXMuX3N0YXRlID0gSU5fQ0xPU0lOR19UQUdfTkFNRTtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleCAtIDY7XG5cdFx0dGhpcy5faW5kZXgtLTsgLy9yZWNvbnN1bWUgdGhlIHRva2VuXG5cdH1cblx0ZWxzZSB0aGlzLl9zdGF0ZSA9IFRFWFQ7XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUJlZm9yZVN0eWxlMSA9IGNvbnN1bWVTcGVjaWFsTmFtZUNoYXIoXCJZXCIsIEJFRk9SRV9TVFlMRV8yKTtcblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlU3R5bGUyID0gY29uc3VtZVNwZWNpYWxOYW1lQ2hhcihcIkxcIiwgQkVGT1JFX1NUWUxFXzMpO1xuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVCZWZvcmVTdHlsZTMgPSBjb25zdW1lU3BlY2lhbE5hbWVDaGFyKFwiRVwiLCBCRUZPUkVfU1RZTEVfNCk7XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlU3R5bGU0ID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiL1wiIHx8IGMgPT09IFwiPlwiIHx8IHdoaXRlc3BhY2UoYykpe1xuXHRcdHRoaXMuX3NwZWNpYWwgPSBTUEVDSUFMX1NUWUxFO1xuXHR9XG5cdHRoaXMuX3N0YXRlID0gSU5fVEFHX05BTUU7XG5cdHRoaXMuX2luZGV4LS07IC8vY29uc3VtZSB0aGUgdG9rZW4gYWdhaW5cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQWZ0ZXJTdHlsZTEgPSBpZkVsc2VTdGF0ZShcIllcIiwgQUZURVJfU1RZTEVfMiwgVEVYVCk7XG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUFmdGVyU3R5bGUyID0gaWZFbHNlU3RhdGUoXCJMXCIsIEFGVEVSX1NUWUxFXzMsIFRFWFQpO1xuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVBZnRlclN0eWxlMyA9IGlmRWxzZVN0YXRlKFwiRVwiLCBBRlRFUl9TVFlMRV80LCBURVhUKTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVBZnRlclN0eWxlNCA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIj5cIiB8fCB3aGl0ZXNwYWNlKGMpKXtcblx0XHR0aGlzLl9zcGVjaWFsID0gU1BFQ0lBTF9OT05FO1xuXHRcdHRoaXMuX3N0YXRlID0gSU5fQ0xPU0lOR19UQUdfTkFNRTtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleCAtIDU7XG5cdFx0dGhpcy5faW5kZXgtLTsgLy9yZWNvbnN1bWUgdGhlIHRva2VuXG5cdH1cblx0ZWxzZSB0aGlzLl9zdGF0ZSA9IFRFWFQ7XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUJlZm9yZUVudGl0eSA9IGlmRWxzZVN0YXRlKFwiI1wiLCBCRUZPUkVfTlVNRVJJQ19FTlRJVFksIElOX05BTUVEX0VOVElUWSk7XG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUJlZm9yZU51bWVyaWNFbnRpdHkgPSBpZkVsc2VTdGF0ZShcIlhcIiwgSU5fSEVYX0VOVElUWSwgSU5fTlVNRVJJQ19FTlRJVFkpO1xuXG4vL2ZvciBlbnRpdGllcyB0ZXJtaW5hdGVkIHdpdGggYSBzZW1pY29sb25cblRva2VuaXplci5wcm90b3R5cGUuX3BhcnNlTmFtZWRFbnRpdHlTdHJpY3QgPSBmdW5jdGlvbigpe1xuXHQvL29mZnNldCA9IDFcblx0aWYodGhpcy5fc2VjdGlvblN0YXJ0ICsgMSA8IHRoaXMuX2luZGV4KXtcblx0XHR2YXIgZW50aXR5ID0gdGhpcy5fYnVmZmVyLnN1YnN0cmluZyh0aGlzLl9zZWN0aW9uU3RhcnQgKyAxLCB0aGlzLl9pbmRleCksXG5cdFx0ICAgIG1hcCA9IHRoaXMuX3htbE1vZGUgPyB4bWxNYXAgOiBlbnRpdHlNYXA7XG5cblx0XHRpZihtYXAuaGFzT3duUHJvcGVydHkoZW50aXR5KSl7XG5cdFx0XHR0aGlzLl9lbWl0UGFydGlhbChtYXBbZW50aXR5XSk7XG5cdFx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleCArIDE7XG5cdFx0fVxuXHR9XG59O1xuXG5cbi8vcGFyc2VzIGxlZ2FjeSBlbnRpdGllcyAod2l0aG91dCB0cmFpbGluZyBzZW1pY29sb24pXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9wYXJzZUxlZ2FjeUVudGl0eSA9IGZ1bmN0aW9uKCl7XG5cdHZhciBzdGFydCA9IHRoaXMuX3NlY3Rpb25TdGFydCArIDEsXG5cdCAgICBsaW1pdCA9IHRoaXMuX2luZGV4IC0gc3RhcnQ7XG5cblx0aWYobGltaXQgPiA2KSBsaW1pdCA9IDY7IC8vdGhlIG1heCBsZW5ndGggb2YgbGVnYWN5IGVudGl0aWVzIGlzIDZcblxuXHR3aGlsZShsaW1pdCA+PSAyKXsgLy90aGUgbWluIGxlbmd0aCBvZiBsZWdhY3kgZW50aXRpZXMgaXMgMlxuXHRcdHZhciBlbnRpdHkgPSB0aGlzLl9idWZmZXIuc3Vic3RyKHN0YXJ0LCBsaW1pdCk7XG5cblx0XHRpZihsZWdhY3lNYXAuaGFzT3duUHJvcGVydHkoZW50aXR5KSl7XG5cdFx0XHR0aGlzLl9lbWl0UGFydGlhbChsZWdhY3lNYXBbZW50aXR5XSk7XG5cdFx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgKz0gbGltaXQgKyAxO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRsaW1pdC0tO1xuXHRcdH1cblx0fVxufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVJbk5hbWVkRW50aXR5ID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiO1wiKXtcblx0XHR0aGlzLl9wYXJzZU5hbWVkRW50aXR5U3RyaWN0KCk7XG5cdFx0aWYodGhpcy5fc2VjdGlvblN0YXJ0ICsgMSA8IHRoaXMuX2luZGV4ICYmICF0aGlzLl94bWxNb2RlKXtcblx0XHRcdHRoaXMuX3BhcnNlTGVnYWN5RW50aXR5KCk7XG5cdFx0fVxuXHRcdHRoaXMuX3N0YXRlID0gdGhpcy5fYmFzZVN0YXRlO1xuXHR9IGVsc2UgaWYoKGMgPCBcImFcIiB8fCBjID4gXCJ6XCIpICYmIChjIDwgXCJBXCIgfHwgYyA+IFwiWlwiKSAmJiAoYyA8IFwiMFwiIHx8IGMgPiBcIjlcIikpe1xuXHRcdGlmKHRoaXMuX3htbE1vZGUpO1xuXHRcdGVsc2UgaWYodGhpcy5fc2VjdGlvblN0YXJ0ICsgMSA9PT0gdGhpcy5faW5kZXgpO1xuXHRcdGVsc2UgaWYodGhpcy5fYmFzZVN0YXRlICE9PSBURVhUKXtcblx0XHRcdGlmKGMgIT09IFwiPVwiKXtcblx0XHRcdFx0dGhpcy5fcGFyc2VOYW1lZEVudGl0eVN0cmljdCgpO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLl9wYXJzZUxlZ2FjeUVudGl0eSgpO1xuXHRcdH1cblxuXHRcdHRoaXMuX3N0YXRlID0gdGhpcy5fYmFzZVN0YXRlO1xuXHRcdHRoaXMuX2luZGV4LS07XG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX2RlY29kZU51bWVyaWNFbnRpdHkgPSBmdW5jdGlvbihvZmZzZXQsIGJhc2Upe1xuXHR2YXIgc2VjdGlvblN0YXJ0ID0gdGhpcy5fc2VjdGlvblN0YXJ0ICsgb2Zmc2V0O1xuXG5cdGlmKHNlY3Rpb25TdGFydCAhPT0gdGhpcy5faW5kZXgpe1xuXHRcdC8vcGFyc2UgZW50aXR5XG5cdFx0dmFyIGVudGl0eSA9IHRoaXMuX2J1ZmZlci5zdWJzdHJpbmcoc2VjdGlvblN0YXJ0LCB0aGlzLl9pbmRleCk7XG5cdFx0dmFyIHBhcnNlZCA9IHBhcnNlSW50KGVudGl0eSwgYmFzZSk7XG5cblx0XHR0aGlzLl9lbWl0UGFydGlhbChkZWNvZGVDb2RlUG9pbnQocGFyc2VkKSk7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXg7XG5cdH0gZWxzZSB7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0LS07XG5cdH1cblxuXHR0aGlzLl9zdGF0ZSA9IHRoaXMuX2Jhc2VTdGF0ZTtcbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlSW5OdW1lcmljRW50aXR5ID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiO1wiKXtcblx0XHR0aGlzLl9kZWNvZGVOdW1lcmljRW50aXR5KDIsIDEwKTtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQrKztcblx0fSBlbHNlIGlmKGMgPCBcIjBcIiB8fCBjID4gXCI5XCIpe1xuXHRcdGlmKCF0aGlzLl94bWxNb2RlKXtcblx0XHRcdHRoaXMuX2RlY29kZU51bWVyaWNFbnRpdHkoMiwgMTApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLl9zdGF0ZSA9IHRoaXMuX2Jhc2VTdGF0ZTtcblx0XHR9XG5cdFx0dGhpcy5faW5kZXgtLTtcblx0fVxufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVJbkhleEVudGl0eSA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIjtcIil7XG5cdFx0dGhpcy5fZGVjb2RlTnVtZXJpY0VudGl0eSgzLCAxNik7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0Kys7XG5cdH0gZWxzZSBpZigoYyA8IFwiYVwiIHx8IGMgPiBcImZcIikgJiYgKGMgPCBcIkFcIiB8fCBjID4gXCJGXCIpICYmIChjIDwgXCIwXCIgfHwgYyA+IFwiOVwiKSl7XG5cdFx0aWYoIXRoaXMuX3htbE1vZGUpe1xuXHRcdFx0dGhpcy5fZGVjb2RlTnVtZXJpY0VudGl0eSgzLCAxNik7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuX3N0YXRlID0gdGhpcy5fYmFzZVN0YXRlO1xuXHRcdH1cblx0XHR0aGlzLl9pbmRleC0tO1xuXHR9XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9jbGVhbnVwID0gZnVuY3Rpb24gKCkge1xuXHRpZih0aGlzLl9zZWN0aW9uU3RhcnQgPCAwKXtcblx0XHR0aGlzLl9idWZmZXIgPSBcIlwiO1xuXHRcdHRoaXMuX2luZGV4ID0gMDtcblx0fSBlbHNlIGlmKHRoaXMuX3J1bm5pbmcpe1xuXHRcdGlmKHRoaXMuX3N0YXRlID09PSBURVhUKXtcblx0XHRcdGlmKHRoaXMuX3NlY3Rpb25TdGFydCAhPT0gdGhpcy5faW5kZXgpe1xuXHRcdFx0XHR0aGlzLl9jYnMub250ZXh0KHRoaXMuX2J1ZmZlci5zdWJzdHIodGhpcy5fc2VjdGlvblN0YXJ0KSk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLl9idWZmZXIgPSBcIlwiO1xuXHRcdFx0dGhpcy5faW5kZXggPSAwO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zZWN0aW9uU3RhcnQgPT09IHRoaXMuX2luZGV4KXtcblx0XHRcdC8vdGhlIHNlY3Rpb24ganVzdCBzdGFydGVkXG5cdFx0XHR0aGlzLl9idWZmZXIgPSBcIlwiO1xuXHRcdFx0dGhpcy5faW5kZXggPSAwO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQvL3JlbW92ZSBldmVyeXRoaW5nIHVubmVjZXNzYXJ5XG5cdFx0XHR0aGlzLl9idWZmZXIgPSB0aGlzLl9idWZmZXIuc3Vic3RyKHRoaXMuX3NlY3Rpb25TdGFydCk7XG5cdFx0XHR0aGlzLl9pbmRleCAtPSB0aGlzLl9zZWN0aW9uU3RhcnQ7XG5cdFx0fVxuXG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gMDtcblx0fVxufTtcblxuLy9UT0RPIG1ha2UgZXZlbnRzIGNvbmRpdGlvbmFsXG5Ub2tlbml6ZXIucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24oY2h1bmspe1xuXHRpZih0aGlzLl9lbmRlZCkgdGhpcy5fY2JzLm9uZXJyb3IoRXJyb3IoXCIud3JpdGUoKSBhZnRlciBkb25lIVwiKSk7XG5cblx0dGhpcy5fYnVmZmVyICs9IGNodW5rO1xuXHR0aGlzLl9wYXJzZSgpO1xufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fcGFyc2UgPSBmdW5jdGlvbigpe1xuXHR3aGlsZSh0aGlzLl9pbmRleCA8IHRoaXMuX2J1ZmZlci5sZW5ndGggJiYgdGhpcy5fcnVubmluZyl7XG5cdFx0dmFyIGMgPSB0aGlzLl9idWZmZXIuY2hhckF0KHRoaXMuX2luZGV4KTtcblx0XHRpZih0aGlzLl9zdGF0ZSA9PT0gVEVYVCkge1xuXHRcdFx0dGhpcy5fc3RhdGVUZXh0KGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQkVGT1JFX1RBR19OQU1FKXtcblx0XHRcdHRoaXMuX3N0YXRlQmVmb3JlVGFnTmFtZShjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IElOX1RBR19OQU1FKSB7XG5cdFx0XHR0aGlzLl9zdGF0ZUluVGFnTmFtZShjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9DTE9TSU5HX1RBR19OQU1FKXtcblx0XHRcdHRoaXMuX3N0YXRlQmVmb3JlQ2xvc2VpbmdUYWdOYW1lKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gSU5fQ0xPU0lOR19UQUdfTkFNRSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUluQ2xvc2VpbmdUYWdOYW1lKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQUZURVJfQ0xPU0lOR19UQUdfTkFNRSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUFmdGVyQ2xvc2VpbmdUYWdOYW1lKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gSU5fU0VMRl9DTE9TSU5HX1RBRyl7XG5cdFx0XHR0aGlzLl9zdGF0ZUluU2VsZkNsb3NpbmdUYWcoYyk7XG5cdFx0fVxuXG5cdFx0Lypcblx0XHQqXHRhdHRyaWJ1dGVzXG5cdFx0Ki9cblx0XHRlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfQVRUUklCVVRFX05BTUUpe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVBdHRyaWJ1dGVOYW1lKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gSU5fQVRUUklCVVRFX05BTUUpe1xuXHRcdFx0dGhpcy5fc3RhdGVJbkF0dHJpYnV0ZU5hbWUoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBBRlRFUl9BVFRSSUJVVEVfTkFNRSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUFmdGVyQXR0cmlidXRlTmFtZShjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9BVFRSSUJVVEVfVkFMVUUpe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVBdHRyaWJ1dGVWYWx1ZShjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IElOX0FUVFJJQlVURV9WQUxVRV9EUSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUluQXR0cmlidXRlVmFsdWVEb3VibGVRdW90ZXMoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBJTl9BVFRSSUJVVEVfVkFMVUVfU1Epe1xuXHRcdFx0dGhpcy5fc3RhdGVJbkF0dHJpYnV0ZVZhbHVlU2luZ2xlUXVvdGVzKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gSU5fQVRUUklCVVRFX1ZBTFVFX05RKXtcblx0XHRcdHRoaXMuX3N0YXRlSW5BdHRyaWJ1dGVWYWx1ZU5vUXVvdGVzKGMpO1xuXHRcdH1cblxuXHRcdC8qXG5cdFx0Klx0ZGVjbGFyYXRpb25zXG5cdFx0Ki9cblx0XHRlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfREVDTEFSQVRJT04pe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVEZWNsYXJhdGlvbihjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IElOX0RFQ0xBUkFUSU9OKXtcblx0XHRcdHRoaXMuX3N0YXRlSW5EZWNsYXJhdGlvbihjKTtcblx0XHR9XG5cblx0XHQvKlxuXHRcdCpcdHByb2Nlc3NpbmcgaW5zdHJ1Y3Rpb25zXG5cdFx0Ki9cblx0XHRlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBJTl9QUk9DRVNTSU5HX0lOU1RSVUNUSU9OKXtcblx0XHRcdHRoaXMuX3N0YXRlSW5Qcm9jZXNzaW5nSW5zdHJ1Y3Rpb24oYyk7XG5cdFx0fVxuXG5cdFx0Lypcblx0XHQqXHRjb21tZW50c1xuXHRcdCovXG5cdFx0ZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQkVGT1JFX0NPTU1FTlQpe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVDb21tZW50KGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gSU5fQ09NTUVOVCl7XG5cdFx0XHR0aGlzLl9zdGF0ZUluQ29tbWVudChjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEFGVEVSX0NPTU1FTlRfMSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUFmdGVyQ29tbWVudDEoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBBRlRFUl9DT01NRU5UXzIpe1xuXHRcdFx0dGhpcy5fc3RhdGVBZnRlckNvbW1lbnQyKGMpO1xuXHRcdH1cblxuXHRcdC8qXG5cdFx0Klx0Y2RhdGFcblx0XHQqL1xuXHRcdGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9DREFUQV8xKXtcblx0XHRcdHRoaXMuX3N0YXRlQmVmb3JlQ2RhdGExKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQkVGT1JFX0NEQVRBXzIpe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVDZGF0YTIoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfQ0RBVEFfMyl7XG5cdFx0XHR0aGlzLl9zdGF0ZUJlZm9yZUNkYXRhMyhjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9DREFUQV80KXtcblx0XHRcdHRoaXMuX3N0YXRlQmVmb3JlQ2RhdGE0KGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQkVGT1JFX0NEQVRBXzUpe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVDZGF0YTUoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfQ0RBVEFfNil7XG5cdFx0XHR0aGlzLl9zdGF0ZUJlZm9yZUNkYXRhNihjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IElOX0NEQVRBKXtcblx0XHRcdHRoaXMuX3N0YXRlSW5DZGF0YShjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEFGVEVSX0NEQVRBXzEpe1xuXHRcdFx0dGhpcy5fc3RhdGVBZnRlckNkYXRhMShjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEFGVEVSX0NEQVRBXzIpe1xuXHRcdFx0dGhpcy5fc3RhdGVBZnRlckNkYXRhMihjKTtcblx0XHR9XG5cblx0XHQvKlxuXHRcdCogc3BlY2lhbCB0YWdzXG5cdFx0Ki9cblx0XHRlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfU1BFQ0lBTCl7XG5cdFx0XHR0aGlzLl9zdGF0ZUJlZm9yZVNwZWNpYWwoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfU1BFQ0lBTF9FTkQpe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVTcGVjaWFsRW5kKGMpO1xuXHRcdH1cblxuXHRcdC8qXG5cdFx0KiBzY3JpcHRcblx0XHQqL1xuXHRcdGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9TQ1JJUFRfMSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUJlZm9yZVNjcmlwdDEoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfU0NSSVBUXzIpe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVTY3JpcHQyKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQkVGT1JFX1NDUklQVF8zKXtcblx0XHRcdHRoaXMuX3N0YXRlQmVmb3JlU2NyaXB0MyhjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9TQ1JJUFRfNCl7XG5cdFx0XHR0aGlzLl9zdGF0ZUJlZm9yZVNjcmlwdDQoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfU0NSSVBUXzUpe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVTY3JpcHQ1KGMpO1xuXHRcdH1cblxuXHRcdGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEFGVEVSX1NDUklQVF8xKXtcblx0XHRcdHRoaXMuX3N0YXRlQWZ0ZXJTY3JpcHQxKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQUZURVJfU0NSSVBUXzIpe1xuXHRcdFx0dGhpcy5fc3RhdGVBZnRlclNjcmlwdDIoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBBRlRFUl9TQ1JJUFRfMyl7XG5cdFx0XHR0aGlzLl9zdGF0ZUFmdGVyU2NyaXB0MyhjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEFGVEVSX1NDUklQVF80KXtcblx0XHRcdHRoaXMuX3N0YXRlQWZ0ZXJTY3JpcHQ0KGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQUZURVJfU0NSSVBUXzUpe1xuXHRcdFx0dGhpcy5fc3RhdGVBZnRlclNjcmlwdDUoYyk7XG5cdFx0fVxuXG5cdFx0Lypcblx0XHQqIHN0eWxlXG5cdFx0Ki9cblx0XHRlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfU1RZTEVfMSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUJlZm9yZVN0eWxlMShjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9TVFlMRV8yKXtcblx0XHRcdHRoaXMuX3N0YXRlQmVmb3JlU3R5bGUyKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQkVGT1JFX1NUWUxFXzMpe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVTdHlsZTMoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfU1RZTEVfNCl7XG5cdFx0XHR0aGlzLl9zdGF0ZUJlZm9yZVN0eWxlNChjKTtcblx0XHR9XG5cblx0XHRlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBBRlRFUl9TVFlMRV8xKXtcblx0XHRcdHRoaXMuX3N0YXRlQWZ0ZXJTdHlsZTEoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBBRlRFUl9TVFlMRV8yKXtcblx0XHRcdHRoaXMuX3N0YXRlQWZ0ZXJTdHlsZTIoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBBRlRFUl9TVFlMRV8zKXtcblx0XHRcdHRoaXMuX3N0YXRlQWZ0ZXJTdHlsZTMoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBBRlRFUl9TVFlMRV80KXtcblx0XHRcdHRoaXMuX3N0YXRlQWZ0ZXJTdHlsZTQoYyk7XG5cdFx0fVxuXG5cdFx0Lypcblx0XHQqIGVudGl0aWVzXG5cdFx0Ki9cblx0XHRlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfRU5USVRZKXtcblx0XHRcdHRoaXMuX3N0YXRlQmVmb3JlRW50aXR5KGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQkVGT1JFX05VTUVSSUNfRU5USVRZKXtcblx0XHRcdHRoaXMuX3N0YXRlQmVmb3JlTnVtZXJpY0VudGl0eShjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IElOX05BTUVEX0VOVElUWSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUluTmFtZWRFbnRpdHkoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBJTl9OVU1FUklDX0VOVElUWSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUluTnVtZXJpY0VudGl0eShjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IElOX0hFWF9FTlRJVFkpe1xuXHRcdFx0dGhpcy5fc3RhdGVJbkhleEVudGl0eShjKTtcblx0XHR9XG5cblx0XHRlbHNlIHtcblx0XHRcdHRoaXMuX2Nicy5vbmVycm9yKEVycm9yKFwidW5rbm93biBfc3RhdGVcIiksIHRoaXMuX3N0YXRlKTtcblx0XHR9XG5cblx0XHR0aGlzLl9pbmRleCsrO1xuXHR9XG5cblx0dGhpcy5fY2xlYW51cCgpO1xufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uKCl7XG5cdHRoaXMuX3J1bm5pbmcgPSBmYWxzZTtcbn07XG5Ub2tlbml6ZXIucHJvdG90eXBlLnJlc3VtZSA9IGZ1bmN0aW9uKCl7XG5cdHRoaXMuX3J1bm5pbmcgPSB0cnVlO1xuXG5cdGlmKHRoaXMuX2luZGV4IDwgdGhpcy5fYnVmZmVyLmxlbmd0aCl7XG5cdFx0dGhpcy5fcGFyc2UoKTtcblx0fVxuXHRpZih0aGlzLl9lbmRlZCl7XG5cdFx0dGhpcy5fZmluaXNoKCk7XG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuZW5kID0gZnVuY3Rpb24oY2h1bmspe1xuXHRpZih0aGlzLl9lbmRlZCkgdGhpcy5fY2JzLm9uZXJyb3IoRXJyb3IoXCIuZW5kKCkgYWZ0ZXIgZG9uZSFcIikpO1xuXHRpZihjaHVuaykgdGhpcy53cml0ZShjaHVuayk7XG5cblx0dGhpcy5fZW5kZWQgPSB0cnVlO1xuXG5cdGlmKHRoaXMuX3J1bm5pbmcpIHRoaXMuX2ZpbmlzaCgpO1xufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fZmluaXNoID0gZnVuY3Rpb24oKXtcblx0Ly9pZiB0aGVyZSBpcyByZW1haW5pbmcgZGF0YSwgZW1pdCBpdCBpbiBhIHJlYXNvbmFibGUgd2F5XG5cdGlmKHRoaXMuX3NlY3Rpb25TdGFydCA8IHRoaXMuX2luZGV4KXtcblx0XHR0aGlzLl9oYW5kbGVUcmFpbGluZ0RhdGEoKTtcblx0fVxuXG5cdHRoaXMuX2Nicy5vbmVuZCgpO1xufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5faGFuZGxlVHJhaWxpbmdEYXRhID0gZnVuY3Rpb24oKXtcblx0dmFyIGRhdGEgPSB0aGlzLl9idWZmZXIuc3Vic3RyKHRoaXMuX3NlY3Rpb25TdGFydCk7XG5cblx0aWYodGhpcy5fc3RhdGUgPT09IElOX0NEQVRBIHx8IHRoaXMuX3N0YXRlID09PSBBRlRFUl9DREFUQV8xIHx8IHRoaXMuX3N0YXRlID09PSBBRlRFUl9DREFUQV8yKXtcblx0XHR0aGlzLl9jYnMub25jZGF0YShkYXRhKTtcblx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBJTl9DT01NRU5UIHx8IHRoaXMuX3N0YXRlID09PSBBRlRFUl9DT01NRU5UXzEgfHwgdGhpcy5fc3RhdGUgPT09IEFGVEVSX0NPTU1FTlRfMil7XG5cdFx0dGhpcy5fY2JzLm9uY29tbWVudChkYXRhKTtcblx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBJTl9OQU1FRF9FTlRJVFkgJiYgIXRoaXMuX3htbE1vZGUpe1xuXHRcdHRoaXMuX3BhcnNlTGVnYWN5RW50aXR5KCk7XG5cdFx0aWYodGhpcy5fc2VjdGlvblN0YXJ0IDwgdGhpcy5faW5kZXgpe1xuXHRcdFx0dGhpcy5fc3RhdGUgPSB0aGlzLl9iYXNlU3RhdGU7XG5cdFx0XHR0aGlzLl9oYW5kbGVUcmFpbGluZ0RhdGEoKTtcblx0XHR9XG5cdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gSU5fTlVNRVJJQ19FTlRJVFkgJiYgIXRoaXMuX3htbE1vZGUpe1xuXHRcdHRoaXMuX2RlY29kZU51bWVyaWNFbnRpdHkoMiwgMTApO1xuXHRcdGlmKHRoaXMuX3NlY3Rpb25TdGFydCA8IHRoaXMuX2luZGV4KXtcblx0XHRcdHRoaXMuX3N0YXRlID0gdGhpcy5fYmFzZVN0YXRlO1xuXHRcdFx0dGhpcy5faGFuZGxlVHJhaWxpbmdEYXRhKCk7XG5cdFx0fVxuXHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IElOX0hFWF9FTlRJVFkgJiYgIXRoaXMuX3htbE1vZGUpe1xuXHRcdHRoaXMuX2RlY29kZU51bWVyaWNFbnRpdHkoMywgMTYpO1xuXHRcdGlmKHRoaXMuX3NlY3Rpb25TdGFydCA8IHRoaXMuX2luZGV4KXtcblx0XHRcdHRoaXMuX3N0YXRlID0gdGhpcy5fYmFzZVN0YXRlO1xuXHRcdFx0dGhpcy5faGFuZGxlVHJhaWxpbmdEYXRhKCk7XG5cdFx0fVxuXHR9IGVsc2UgaWYoXG5cdFx0dGhpcy5fc3RhdGUgIT09IElOX1RBR19OQU1FICYmXG5cdFx0dGhpcy5fc3RhdGUgIT09IEJFRk9SRV9BVFRSSUJVVEVfTkFNRSAmJlxuXHRcdHRoaXMuX3N0YXRlICE9PSBCRUZPUkVfQVRUUklCVVRFX1ZBTFVFICYmXG5cdFx0dGhpcy5fc3RhdGUgIT09IEFGVEVSX0FUVFJJQlVURV9OQU1FICYmXG5cdFx0dGhpcy5fc3RhdGUgIT09IElOX0FUVFJJQlVURV9OQU1FICYmXG5cdFx0dGhpcy5fc3RhdGUgIT09IElOX0FUVFJJQlVURV9WQUxVRV9TUSAmJlxuXHRcdHRoaXMuX3N0YXRlICE9PSBJTl9BVFRSSUJVVEVfVkFMVUVfRFEgJiZcblx0XHR0aGlzLl9zdGF0ZSAhPT0gSU5fQVRUUklCVVRFX1ZBTFVFX05RICYmXG5cdFx0dGhpcy5fc3RhdGUgIT09IElOX0NMT1NJTkdfVEFHX05BTUVcblx0KXtcblx0XHR0aGlzLl9jYnMub250ZXh0KGRhdGEpO1xuXHR9XG5cdC8vZWxzZSwgaWdub3JlIHJlbWFpbmluZyBkYXRhXG5cdC8vVE9ETyBhZGQgYSB3YXkgdG8gcmVtb3ZlIGN1cnJlbnQgdGFnXG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLnJlc2V0ID0gZnVuY3Rpb24oKXtcblx0VG9rZW5pemVyLmNhbGwodGhpcywge3htbE1vZGU6IHRoaXMuX3htbE1vZGUsIGRlY29kZUVudGl0aWVzOiB0aGlzLl9kZWNvZGVFbnRpdGllc30sIHRoaXMuX2Nicyk7XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9nZXRTZWN0aW9uID0gZnVuY3Rpb24oKXtcblx0cmV0dXJuIHRoaXMuX2J1ZmZlci5zdWJzdHJpbmcodGhpcy5fc2VjdGlvblN0YXJ0LCB0aGlzLl9pbmRleCk7XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9lbWl0VG9rZW4gPSBmdW5jdGlvbihuYW1lKXtcblx0dGhpcy5fY2JzW25hbWVdKHRoaXMuX2dldFNlY3Rpb24oKSk7XG5cdHRoaXMuX3NlY3Rpb25TdGFydCA9IC0xO1xufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fZW1pdFBhcnRpYWwgPSBmdW5jdGlvbih2YWx1ZSl7XG5cdGlmKHRoaXMuX2Jhc2VTdGF0ZSAhPT0gVEVYVCl7XG5cdFx0dGhpcy5fY2JzLm9uYXR0cmliZGF0YSh2YWx1ZSk7IC8vVE9ETyBpbXBsZW1lbnQgdGhlIG5ldyBldmVudFxuXHR9IGVsc2Uge1xuXHRcdHRoaXMuX2Nicy5vbnRleHQodmFsdWUpO1xuXHR9XG59O1xuIiwidmFyIGRlY29kZU1hcCA9IHJlcXVpcmUoXCIuLi9tYXBzL2RlY29kZS5qc29uXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGRlY29kZUNvZGVQb2ludDtcblxuLy8gbW9kaWZpZWQgdmVyc2lvbiBvZiBodHRwczovL2dpdGh1Yi5jb20vbWF0aGlhc2J5bmVucy9oZS9ibG9iL21hc3Rlci9zcmMvaGUuanMjTDk0LUwxMTlcbmZ1bmN0aW9uIGRlY29kZUNvZGVQb2ludChjb2RlUG9pbnQpe1xuXG5cdGlmKChjb2RlUG9pbnQgPj0gMHhEODAwICYmIGNvZGVQb2ludCA8PSAweERGRkYpIHx8IGNvZGVQb2ludCA+IDB4MTBGRkZGKXtcblx0XHRyZXR1cm4gXCJcXHVGRkZEXCI7XG5cdH1cblxuXHRpZihjb2RlUG9pbnQgaW4gZGVjb2RlTWFwKXtcblx0XHRjb2RlUG9pbnQgPSBkZWNvZGVNYXBbY29kZVBvaW50XTtcblx0fVxuXG5cdHZhciBvdXRwdXQgPSBcIlwiO1xuXG5cdGlmKGNvZGVQb2ludCA+IDB4RkZGRil7XG5cdFx0Y29kZVBvaW50IC09IDB4MTAwMDA7XG5cdFx0b3V0cHV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoY29kZVBvaW50ID4+PiAxMCAmIDB4M0ZGIHwgMHhEODAwKTtcblx0XHRjb2RlUG9pbnQgPSAweERDMDAgfCBjb2RlUG9pbnQgJiAweDNGRjtcblx0fVxuXG5cdG91dHB1dCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGNvZGVQb2ludCk7XG5cdHJldHVybiBvdXRwdXQ7XG59XG4iLCJtb2R1bGUuZXhwb3J0cz17XCIwXCI6NjU1MzMsXCIxMjhcIjo4MzY0LFwiMTMwXCI6ODIxOCxcIjEzMVwiOjQwMixcIjEzMlwiOjgyMjIsXCIxMzNcIjo4MjMwLFwiMTM0XCI6ODIyNCxcIjEzNVwiOjgyMjUsXCIxMzZcIjo3MTAsXCIxMzdcIjo4MjQwLFwiMTM4XCI6MzUyLFwiMTM5XCI6ODI0OSxcIjE0MFwiOjMzOCxcIjE0MlwiOjM4MSxcIjE0NVwiOjgyMTYsXCIxNDZcIjo4MjE3LFwiMTQ3XCI6ODIyMCxcIjE0OFwiOjgyMjEsXCIxNDlcIjo4MjI2LFwiMTUwXCI6ODIxMSxcIjE1MVwiOjgyMTIsXCIxNTJcIjo3MzIsXCIxNTNcIjo4NDgyLFwiMTU0XCI6MzUzLFwiMTU1XCI6ODI1MCxcIjE1NlwiOjMzOSxcIjE1OFwiOjM4MixcIjE1OVwiOjM3Nn0iLCJtb2R1bGUuZXhwb3J0cz17XCJBYWN1dGVcIjpcIlxcdTAwQzFcIixcImFhY3V0ZVwiOlwiXFx1MDBFMVwiLFwiQWJyZXZlXCI6XCJcXHUwMTAyXCIsXCJhYnJldmVcIjpcIlxcdTAxMDNcIixcImFjXCI6XCJcXHUyMjNFXCIsXCJhY2RcIjpcIlxcdTIyM0ZcIixcImFjRVwiOlwiXFx1MjIzRVxcdTAzMzNcIixcIkFjaXJjXCI6XCJcXHUwMEMyXCIsXCJhY2lyY1wiOlwiXFx1MDBFMlwiLFwiYWN1dGVcIjpcIlxcdTAwQjRcIixcIkFjeVwiOlwiXFx1MDQxMFwiLFwiYWN5XCI6XCJcXHUwNDMwXCIsXCJBRWxpZ1wiOlwiXFx1MDBDNlwiLFwiYWVsaWdcIjpcIlxcdTAwRTZcIixcImFmXCI6XCJcXHUyMDYxXCIsXCJBZnJcIjpcIlxcdUQ4MzVcXHVERDA0XCIsXCJhZnJcIjpcIlxcdUQ4MzVcXHVERDFFXCIsXCJBZ3JhdmVcIjpcIlxcdTAwQzBcIixcImFncmF2ZVwiOlwiXFx1MDBFMFwiLFwiYWxlZnN5bVwiOlwiXFx1MjEzNVwiLFwiYWxlcGhcIjpcIlxcdTIxMzVcIixcIkFscGhhXCI6XCJcXHUwMzkxXCIsXCJhbHBoYVwiOlwiXFx1MDNCMVwiLFwiQW1hY3JcIjpcIlxcdTAxMDBcIixcImFtYWNyXCI6XCJcXHUwMTAxXCIsXCJhbWFsZ1wiOlwiXFx1MkEzRlwiLFwiYW1wXCI6XCImXCIsXCJBTVBcIjpcIiZcIixcImFuZGFuZFwiOlwiXFx1MkE1NVwiLFwiQW5kXCI6XCJcXHUyQTUzXCIsXCJhbmRcIjpcIlxcdTIyMjdcIixcImFuZGRcIjpcIlxcdTJBNUNcIixcImFuZHNsb3BlXCI6XCJcXHUyQTU4XCIsXCJhbmR2XCI6XCJcXHUyQTVBXCIsXCJhbmdcIjpcIlxcdTIyMjBcIixcImFuZ2VcIjpcIlxcdTI5QTRcIixcImFuZ2xlXCI6XCJcXHUyMjIwXCIsXCJhbmdtc2RhYVwiOlwiXFx1MjlBOFwiLFwiYW5nbXNkYWJcIjpcIlxcdTI5QTlcIixcImFuZ21zZGFjXCI6XCJcXHUyOUFBXCIsXCJhbmdtc2RhZFwiOlwiXFx1MjlBQlwiLFwiYW5nbXNkYWVcIjpcIlxcdTI5QUNcIixcImFuZ21zZGFmXCI6XCJcXHUyOUFEXCIsXCJhbmdtc2RhZ1wiOlwiXFx1MjlBRVwiLFwiYW5nbXNkYWhcIjpcIlxcdTI5QUZcIixcImFuZ21zZFwiOlwiXFx1MjIyMVwiLFwiYW5ncnRcIjpcIlxcdTIyMUZcIixcImFuZ3J0dmJcIjpcIlxcdTIyQkVcIixcImFuZ3J0dmJkXCI6XCJcXHUyOTlEXCIsXCJhbmdzcGhcIjpcIlxcdTIyMjJcIixcImFuZ3N0XCI6XCJcXHUwMEM1XCIsXCJhbmd6YXJyXCI6XCJcXHUyMzdDXCIsXCJBb2dvblwiOlwiXFx1MDEwNFwiLFwiYW9nb25cIjpcIlxcdTAxMDVcIixcIkFvcGZcIjpcIlxcdUQ4MzVcXHVERDM4XCIsXCJhb3BmXCI6XCJcXHVEODM1XFx1REQ1MlwiLFwiYXBhY2lyXCI6XCJcXHUyQTZGXCIsXCJhcFwiOlwiXFx1MjI0OFwiLFwiYXBFXCI6XCJcXHUyQTcwXCIsXCJhcGVcIjpcIlxcdTIyNEFcIixcImFwaWRcIjpcIlxcdTIyNEJcIixcImFwb3NcIjpcIidcIixcIkFwcGx5RnVuY3Rpb25cIjpcIlxcdTIwNjFcIixcImFwcHJveFwiOlwiXFx1MjI0OFwiLFwiYXBwcm94ZXFcIjpcIlxcdTIyNEFcIixcIkFyaW5nXCI6XCJcXHUwMEM1XCIsXCJhcmluZ1wiOlwiXFx1MDBFNVwiLFwiQXNjclwiOlwiXFx1RDgzNVxcdURDOUNcIixcImFzY3JcIjpcIlxcdUQ4MzVcXHVEQ0I2XCIsXCJBc3NpZ25cIjpcIlxcdTIyNTRcIixcImFzdFwiOlwiKlwiLFwiYXN5bXBcIjpcIlxcdTIyNDhcIixcImFzeW1wZXFcIjpcIlxcdTIyNERcIixcIkF0aWxkZVwiOlwiXFx1MDBDM1wiLFwiYXRpbGRlXCI6XCJcXHUwMEUzXCIsXCJBdW1sXCI6XCJcXHUwMEM0XCIsXCJhdW1sXCI6XCJcXHUwMEU0XCIsXCJhd2NvbmludFwiOlwiXFx1MjIzM1wiLFwiYXdpbnRcIjpcIlxcdTJBMTFcIixcImJhY2tjb25nXCI6XCJcXHUyMjRDXCIsXCJiYWNrZXBzaWxvblwiOlwiXFx1MDNGNlwiLFwiYmFja3ByaW1lXCI6XCJcXHUyMDM1XCIsXCJiYWNrc2ltXCI6XCJcXHUyMjNEXCIsXCJiYWNrc2ltZXFcIjpcIlxcdTIyQ0RcIixcIkJhY2tzbGFzaFwiOlwiXFx1MjIxNlwiLFwiQmFydlwiOlwiXFx1MkFFN1wiLFwiYmFydmVlXCI6XCJcXHUyMkJEXCIsXCJiYXJ3ZWRcIjpcIlxcdTIzMDVcIixcIkJhcndlZFwiOlwiXFx1MjMwNlwiLFwiYmFyd2VkZ2VcIjpcIlxcdTIzMDVcIixcImJicmtcIjpcIlxcdTIzQjVcIixcImJicmt0YnJrXCI6XCJcXHUyM0I2XCIsXCJiY29uZ1wiOlwiXFx1MjI0Q1wiLFwiQmN5XCI6XCJcXHUwNDExXCIsXCJiY3lcIjpcIlxcdTA0MzFcIixcImJkcXVvXCI6XCJcXHUyMDFFXCIsXCJiZWNhdXNcIjpcIlxcdTIyMzVcIixcImJlY2F1c2VcIjpcIlxcdTIyMzVcIixcIkJlY2F1c2VcIjpcIlxcdTIyMzVcIixcImJlbXB0eXZcIjpcIlxcdTI5QjBcIixcImJlcHNpXCI6XCJcXHUwM0Y2XCIsXCJiZXJub3VcIjpcIlxcdTIxMkNcIixcIkJlcm5vdWxsaXNcIjpcIlxcdTIxMkNcIixcIkJldGFcIjpcIlxcdTAzOTJcIixcImJldGFcIjpcIlxcdTAzQjJcIixcImJldGhcIjpcIlxcdTIxMzZcIixcImJldHdlZW5cIjpcIlxcdTIyNkNcIixcIkJmclwiOlwiXFx1RDgzNVxcdUREMDVcIixcImJmclwiOlwiXFx1RDgzNVxcdUREMUZcIixcImJpZ2NhcFwiOlwiXFx1MjJDMlwiLFwiYmlnY2lyY1wiOlwiXFx1MjVFRlwiLFwiYmlnY3VwXCI6XCJcXHUyMkMzXCIsXCJiaWdvZG90XCI6XCJcXHUyQTAwXCIsXCJiaWdvcGx1c1wiOlwiXFx1MkEwMVwiLFwiYmlnb3RpbWVzXCI6XCJcXHUyQTAyXCIsXCJiaWdzcWN1cFwiOlwiXFx1MkEwNlwiLFwiYmlnc3RhclwiOlwiXFx1MjYwNVwiLFwiYmlndHJpYW5nbGVkb3duXCI6XCJcXHUyNUJEXCIsXCJiaWd0cmlhbmdsZXVwXCI6XCJcXHUyNUIzXCIsXCJiaWd1cGx1c1wiOlwiXFx1MkEwNFwiLFwiYmlndmVlXCI6XCJcXHUyMkMxXCIsXCJiaWd3ZWRnZVwiOlwiXFx1MjJDMFwiLFwiYmthcm93XCI6XCJcXHUyOTBEXCIsXCJibGFja2xvemVuZ2VcIjpcIlxcdTI5RUJcIixcImJsYWNrc3F1YXJlXCI6XCJcXHUyNUFBXCIsXCJibGFja3RyaWFuZ2xlXCI6XCJcXHUyNUI0XCIsXCJibGFja3RyaWFuZ2xlZG93blwiOlwiXFx1MjVCRVwiLFwiYmxhY2t0cmlhbmdsZWxlZnRcIjpcIlxcdTI1QzJcIixcImJsYWNrdHJpYW5nbGVyaWdodFwiOlwiXFx1MjVCOFwiLFwiYmxhbmtcIjpcIlxcdTI0MjNcIixcImJsazEyXCI6XCJcXHUyNTkyXCIsXCJibGsxNFwiOlwiXFx1MjU5MVwiLFwiYmxrMzRcIjpcIlxcdTI1OTNcIixcImJsb2NrXCI6XCJcXHUyNTg4XCIsXCJibmVcIjpcIj1cXHUyMEU1XCIsXCJibmVxdWl2XCI6XCJcXHUyMjYxXFx1MjBFNVwiLFwiYk5vdFwiOlwiXFx1MkFFRFwiLFwiYm5vdFwiOlwiXFx1MjMxMFwiLFwiQm9wZlwiOlwiXFx1RDgzNVxcdUREMzlcIixcImJvcGZcIjpcIlxcdUQ4MzVcXHVERDUzXCIsXCJib3RcIjpcIlxcdTIyQTVcIixcImJvdHRvbVwiOlwiXFx1MjJBNVwiLFwiYm93dGllXCI6XCJcXHUyMkM4XCIsXCJib3hib3hcIjpcIlxcdTI5QzlcIixcImJveGRsXCI6XCJcXHUyNTEwXCIsXCJib3hkTFwiOlwiXFx1MjU1NVwiLFwiYm94RGxcIjpcIlxcdTI1NTZcIixcImJveERMXCI6XCJcXHUyNTU3XCIsXCJib3hkclwiOlwiXFx1MjUwQ1wiLFwiYm94ZFJcIjpcIlxcdTI1NTJcIixcImJveERyXCI6XCJcXHUyNTUzXCIsXCJib3hEUlwiOlwiXFx1MjU1NFwiLFwiYm94aFwiOlwiXFx1MjUwMFwiLFwiYm94SFwiOlwiXFx1MjU1MFwiLFwiYm94aGRcIjpcIlxcdTI1MkNcIixcImJveEhkXCI6XCJcXHUyNTY0XCIsXCJib3hoRFwiOlwiXFx1MjU2NVwiLFwiYm94SERcIjpcIlxcdTI1NjZcIixcImJveGh1XCI6XCJcXHUyNTM0XCIsXCJib3hIdVwiOlwiXFx1MjU2N1wiLFwiYm94aFVcIjpcIlxcdTI1NjhcIixcImJveEhVXCI6XCJcXHUyNTY5XCIsXCJib3htaW51c1wiOlwiXFx1MjI5RlwiLFwiYm94cGx1c1wiOlwiXFx1MjI5RVwiLFwiYm94dGltZXNcIjpcIlxcdTIyQTBcIixcImJveHVsXCI6XCJcXHUyNTE4XCIsXCJib3h1TFwiOlwiXFx1MjU1QlwiLFwiYm94VWxcIjpcIlxcdTI1NUNcIixcImJveFVMXCI6XCJcXHUyNTVEXCIsXCJib3h1clwiOlwiXFx1MjUxNFwiLFwiYm94dVJcIjpcIlxcdTI1NThcIixcImJveFVyXCI6XCJcXHUyNTU5XCIsXCJib3hVUlwiOlwiXFx1MjU1QVwiLFwiYm94dlwiOlwiXFx1MjUwMlwiLFwiYm94VlwiOlwiXFx1MjU1MVwiLFwiYm94dmhcIjpcIlxcdTI1M0NcIixcImJveHZIXCI6XCJcXHUyNTZBXCIsXCJib3hWaFwiOlwiXFx1MjU2QlwiLFwiYm94VkhcIjpcIlxcdTI1NkNcIixcImJveHZsXCI6XCJcXHUyNTI0XCIsXCJib3h2TFwiOlwiXFx1MjU2MVwiLFwiYm94VmxcIjpcIlxcdTI1NjJcIixcImJveFZMXCI6XCJcXHUyNTYzXCIsXCJib3h2clwiOlwiXFx1MjUxQ1wiLFwiYm94dlJcIjpcIlxcdTI1NUVcIixcImJveFZyXCI6XCJcXHUyNTVGXCIsXCJib3hWUlwiOlwiXFx1MjU2MFwiLFwiYnByaW1lXCI6XCJcXHUyMDM1XCIsXCJicmV2ZVwiOlwiXFx1MDJEOFwiLFwiQnJldmVcIjpcIlxcdTAyRDhcIixcImJydmJhclwiOlwiXFx1MDBBNlwiLFwiYnNjclwiOlwiXFx1RDgzNVxcdURDQjdcIixcIkJzY3JcIjpcIlxcdTIxMkNcIixcImJzZW1pXCI6XCJcXHUyMDRGXCIsXCJic2ltXCI6XCJcXHUyMjNEXCIsXCJic2ltZVwiOlwiXFx1MjJDRFwiLFwiYnNvbGJcIjpcIlxcdTI5QzVcIixcImJzb2xcIjpcIlxcXFxcIixcImJzb2xoc3ViXCI6XCJcXHUyN0M4XCIsXCJidWxsXCI6XCJcXHUyMDIyXCIsXCJidWxsZXRcIjpcIlxcdTIwMjJcIixcImJ1bXBcIjpcIlxcdTIyNEVcIixcImJ1bXBFXCI6XCJcXHUyQUFFXCIsXCJidW1wZVwiOlwiXFx1MjI0RlwiLFwiQnVtcGVxXCI6XCJcXHUyMjRFXCIsXCJidW1wZXFcIjpcIlxcdTIyNEZcIixcIkNhY3V0ZVwiOlwiXFx1MDEwNlwiLFwiY2FjdXRlXCI6XCJcXHUwMTA3XCIsXCJjYXBhbmRcIjpcIlxcdTJBNDRcIixcImNhcGJyY3VwXCI6XCJcXHUyQTQ5XCIsXCJjYXBjYXBcIjpcIlxcdTJBNEJcIixcImNhcFwiOlwiXFx1MjIyOVwiLFwiQ2FwXCI6XCJcXHUyMkQyXCIsXCJjYXBjdXBcIjpcIlxcdTJBNDdcIixcImNhcGRvdFwiOlwiXFx1MkE0MFwiLFwiQ2FwaXRhbERpZmZlcmVudGlhbERcIjpcIlxcdTIxNDVcIixcImNhcHNcIjpcIlxcdTIyMjlcXHVGRTAwXCIsXCJjYXJldFwiOlwiXFx1MjA0MVwiLFwiY2Fyb25cIjpcIlxcdTAyQzdcIixcIkNheWxleXNcIjpcIlxcdTIxMkRcIixcImNjYXBzXCI6XCJcXHUyQTREXCIsXCJDY2Fyb25cIjpcIlxcdTAxMENcIixcImNjYXJvblwiOlwiXFx1MDEwRFwiLFwiQ2NlZGlsXCI6XCJcXHUwMEM3XCIsXCJjY2VkaWxcIjpcIlxcdTAwRTdcIixcIkNjaXJjXCI6XCJcXHUwMTA4XCIsXCJjY2lyY1wiOlwiXFx1MDEwOVwiLFwiQ2NvbmludFwiOlwiXFx1MjIzMFwiLFwiY2N1cHNcIjpcIlxcdTJBNENcIixcImNjdXBzc21cIjpcIlxcdTJBNTBcIixcIkNkb3RcIjpcIlxcdTAxMEFcIixcImNkb3RcIjpcIlxcdTAxMEJcIixcImNlZGlsXCI6XCJcXHUwMEI4XCIsXCJDZWRpbGxhXCI6XCJcXHUwMEI4XCIsXCJjZW1wdHl2XCI6XCJcXHUyOUIyXCIsXCJjZW50XCI6XCJcXHUwMEEyXCIsXCJjZW50ZXJkb3RcIjpcIlxcdTAwQjdcIixcIkNlbnRlckRvdFwiOlwiXFx1MDBCN1wiLFwiY2ZyXCI6XCJcXHVEODM1XFx1REQyMFwiLFwiQ2ZyXCI6XCJcXHUyMTJEXCIsXCJDSGN5XCI6XCJcXHUwNDI3XCIsXCJjaGN5XCI6XCJcXHUwNDQ3XCIsXCJjaGVja1wiOlwiXFx1MjcxM1wiLFwiY2hlY2ttYXJrXCI6XCJcXHUyNzEzXCIsXCJDaGlcIjpcIlxcdTAzQTdcIixcImNoaVwiOlwiXFx1MDNDN1wiLFwiY2lyY1wiOlwiXFx1MDJDNlwiLFwiY2lyY2VxXCI6XCJcXHUyMjU3XCIsXCJjaXJjbGVhcnJvd2xlZnRcIjpcIlxcdTIxQkFcIixcImNpcmNsZWFycm93cmlnaHRcIjpcIlxcdTIxQkJcIixcImNpcmNsZWRhc3RcIjpcIlxcdTIyOUJcIixcImNpcmNsZWRjaXJjXCI6XCJcXHUyMjlBXCIsXCJjaXJjbGVkZGFzaFwiOlwiXFx1MjI5RFwiLFwiQ2lyY2xlRG90XCI6XCJcXHUyMjk5XCIsXCJjaXJjbGVkUlwiOlwiXFx1MDBBRVwiLFwiY2lyY2xlZFNcIjpcIlxcdTI0QzhcIixcIkNpcmNsZU1pbnVzXCI6XCJcXHUyMjk2XCIsXCJDaXJjbGVQbHVzXCI6XCJcXHUyMjk1XCIsXCJDaXJjbGVUaW1lc1wiOlwiXFx1MjI5N1wiLFwiY2lyXCI6XCJcXHUyNUNCXCIsXCJjaXJFXCI6XCJcXHUyOUMzXCIsXCJjaXJlXCI6XCJcXHUyMjU3XCIsXCJjaXJmbmludFwiOlwiXFx1MkExMFwiLFwiY2lybWlkXCI6XCJcXHUyQUVGXCIsXCJjaXJzY2lyXCI6XCJcXHUyOUMyXCIsXCJDbG9ja3dpc2VDb250b3VySW50ZWdyYWxcIjpcIlxcdTIyMzJcIixcIkNsb3NlQ3VybHlEb3VibGVRdW90ZVwiOlwiXFx1MjAxRFwiLFwiQ2xvc2VDdXJseVF1b3RlXCI6XCJcXHUyMDE5XCIsXCJjbHVic1wiOlwiXFx1MjY2M1wiLFwiY2x1YnN1aXRcIjpcIlxcdTI2NjNcIixcImNvbG9uXCI6XCI6XCIsXCJDb2xvblwiOlwiXFx1MjIzN1wiLFwiQ29sb25lXCI6XCJcXHUyQTc0XCIsXCJjb2xvbmVcIjpcIlxcdTIyNTRcIixcImNvbG9uZXFcIjpcIlxcdTIyNTRcIixcImNvbW1hXCI6XCIsXCIsXCJjb21tYXRcIjpcIkBcIixcImNvbXBcIjpcIlxcdTIyMDFcIixcImNvbXBmblwiOlwiXFx1MjIxOFwiLFwiY29tcGxlbWVudFwiOlwiXFx1MjIwMVwiLFwiY29tcGxleGVzXCI6XCJcXHUyMTAyXCIsXCJjb25nXCI6XCJcXHUyMjQ1XCIsXCJjb25nZG90XCI6XCJcXHUyQTZEXCIsXCJDb25ncnVlbnRcIjpcIlxcdTIyNjFcIixcImNvbmludFwiOlwiXFx1MjIyRVwiLFwiQ29uaW50XCI6XCJcXHUyMjJGXCIsXCJDb250b3VySW50ZWdyYWxcIjpcIlxcdTIyMkVcIixcImNvcGZcIjpcIlxcdUQ4MzVcXHVERDU0XCIsXCJDb3BmXCI6XCJcXHUyMTAyXCIsXCJjb3Byb2RcIjpcIlxcdTIyMTBcIixcIkNvcHJvZHVjdFwiOlwiXFx1MjIxMFwiLFwiY29weVwiOlwiXFx1MDBBOVwiLFwiQ09QWVwiOlwiXFx1MDBBOVwiLFwiY29weXNyXCI6XCJcXHUyMTE3XCIsXCJDb3VudGVyQ2xvY2t3aXNlQ29udG91ckludGVncmFsXCI6XCJcXHUyMjMzXCIsXCJjcmFyclwiOlwiXFx1MjFCNVwiLFwiY3Jvc3NcIjpcIlxcdTI3MTdcIixcIkNyb3NzXCI6XCJcXHUyQTJGXCIsXCJDc2NyXCI6XCJcXHVEODM1XFx1REM5RVwiLFwiY3NjclwiOlwiXFx1RDgzNVxcdURDQjhcIixcImNzdWJcIjpcIlxcdTJBQ0ZcIixcImNzdWJlXCI6XCJcXHUyQUQxXCIsXCJjc3VwXCI6XCJcXHUyQUQwXCIsXCJjc3VwZVwiOlwiXFx1MkFEMlwiLFwiY3Rkb3RcIjpcIlxcdTIyRUZcIixcImN1ZGFycmxcIjpcIlxcdTI5MzhcIixcImN1ZGFycnJcIjpcIlxcdTI5MzVcIixcImN1ZXByXCI6XCJcXHUyMkRFXCIsXCJjdWVzY1wiOlwiXFx1MjJERlwiLFwiY3VsYXJyXCI6XCJcXHUyMUI2XCIsXCJjdWxhcnJwXCI6XCJcXHUyOTNEXCIsXCJjdXBicmNhcFwiOlwiXFx1MkE0OFwiLFwiY3VwY2FwXCI6XCJcXHUyQTQ2XCIsXCJDdXBDYXBcIjpcIlxcdTIyNERcIixcImN1cFwiOlwiXFx1MjIyQVwiLFwiQ3VwXCI6XCJcXHUyMkQzXCIsXCJjdXBjdXBcIjpcIlxcdTJBNEFcIixcImN1cGRvdFwiOlwiXFx1MjI4RFwiLFwiY3Vwb3JcIjpcIlxcdTJBNDVcIixcImN1cHNcIjpcIlxcdTIyMkFcXHVGRTAwXCIsXCJjdXJhcnJcIjpcIlxcdTIxQjdcIixcImN1cmFycm1cIjpcIlxcdTI5M0NcIixcImN1cmx5ZXFwcmVjXCI6XCJcXHUyMkRFXCIsXCJjdXJseWVxc3VjY1wiOlwiXFx1MjJERlwiLFwiY3VybHl2ZWVcIjpcIlxcdTIyQ0VcIixcImN1cmx5d2VkZ2VcIjpcIlxcdTIyQ0ZcIixcImN1cnJlblwiOlwiXFx1MDBBNFwiLFwiY3VydmVhcnJvd2xlZnRcIjpcIlxcdTIxQjZcIixcImN1cnZlYXJyb3dyaWdodFwiOlwiXFx1MjFCN1wiLFwiY3V2ZWVcIjpcIlxcdTIyQ0VcIixcImN1d2VkXCI6XCJcXHUyMkNGXCIsXCJjd2NvbmludFwiOlwiXFx1MjIzMlwiLFwiY3dpbnRcIjpcIlxcdTIyMzFcIixcImN5bGN0eVwiOlwiXFx1MjMyRFwiLFwiZGFnZ2VyXCI6XCJcXHUyMDIwXCIsXCJEYWdnZXJcIjpcIlxcdTIwMjFcIixcImRhbGV0aFwiOlwiXFx1MjEzOFwiLFwiZGFyclwiOlwiXFx1MjE5M1wiLFwiRGFyclwiOlwiXFx1MjFBMVwiLFwiZEFyclwiOlwiXFx1MjFEM1wiLFwiZGFzaFwiOlwiXFx1MjAxMFwiLFwiRGFzaHZcIjpcIlxcdTJBRTRcIixcImRhc2h2XCI6XCJcXHUyMkEzXCIsXCJkYmthcm93XCI6XCJcXHUyOTBGXCIsXCJkYmxhY1wiOlwiXFx1MDJERFwiLFwiRGNhcm9uXCI6XCJcXHUwMTBFXCIsXCJkY2Fyb25cIjpcIlxcdTAxMEZcIixcIkRjeVwiOlwiXFx1MDQxNFwiLFwiZGN5XCI6XCJcXHUwNDM0XCIsXCJkZGFnZ2VyXCI6XCJcXHUyMDIxXCIsXCJkZGFyclwiOlwiXFx1MjFDQVwiLFwiRERcIjpcIlxcdTIxNDVcIixcImRkXCI6XCJcXHUyMTQ2XCIsXCJERG90cmFoZFwiOlwiXFx1MjkxMVwiLFwiZGRvdHNlcVwiOlwiXFx1MkE3N1wiLFwiZGVnXCI6XCJcXHUwMEIwXCIsXCJEZWxcIjpcIlxcdTIyMDdcIixcIkRlbHRhXCI6XCJcXHUwMzk0XCIsXCJkZWx0YVwiOlwiXFx1MDNCNFwiLFwiZGVtcHR5dlwiOlwiXFx1MjlCMVwiLFwiZGZpc2h0XCI6XCJcXHUyOTdGXCIsXCJEZnJcIjpcIlxcdUQ4MzVcXHVERDA3XCIsXCJkZnJcIjpcIlxcdUQ4MzVcXHVERDIxXCIsXCJkSGFyXCI6XCJcXHUyOTY1XCIsXCJkaGFybFwiOlwiXFx1MjFDM1wiLFwiZGhhcnJcIjpcIlxcdTIxQzJcIixcIkRpYWNyaXRpY2FsQWN1dGVcIjpcIlxcdTAwQjRcIixcIkRpYWNyaXRpY2FsRG90XCI6XCJcXHUwMkQ5XCIsXCJEaWFjcml0aWNhbERvdWJsZUFjdXRlXCI6XCJcXHUwMkREXCIsXCJEaWFjcml0aWNhbEdyYXZlXCI6XCJgXCIsXCJEaWFjcml0aWNhbFRpbGRlXCI6XCJcXHUwMkRDXCIsXCJkaWFtXCI6XCJcXHUyMkM0XCIsXCJkaWFtb25kXCI6XCJcXHUyMkM0XCIsXCJEaWFtb25kXCI6XCJcXHUyMkM0XCIsXCJkaWFtb25kc3VpdFwiOlwiXFx1MjY2NlwiLFwiZGlhbXNcIjpcIlxcdTI2NjZcIixcImRpZVwiOlwiXFx1MDBBOFwiLFwiRGlmZmVyZW50aWFsRFwiOlwiXFx1MjE0NlwiLFwiZGlnYW1tYVwiOlwiXFx1MDNERFwiLFwiZGlzaW5cIjpcIlxcdTIyRjJcIixcImRpdlwiOlwiXFx1MDBGN1wiLFwiZGl2aWRlXCI6XCJcXHUwMEY3XCIsXCJkaXZpZGVvbnRpbWVzXCI6XCJcXHUyMkM3XCIsXCJkaXZvbnhcIjpcIlxcdTIyQzdcIixcIkRKY3lcIjpcIlxcdTA0MDJcIixcImRqY3lcIjpcIlxcdTA0NTJcIixcImRsY29yblwiOlwiXFx1MjMxRVwiLFwiZGxjcm9wXCI6XCJcXHUyMzBEXCIsXCJkb2xsYXJcIjpcIiRcIixcIkRvcGZcIjpcIlxcdUQ4MzVcXHVERDNCXCIsXCJkb3BmXCI6XCJcXHVEODM1XFx1REQ1NVwiLFwiRG90XCI6XCJcXHUwMEE4XCIsXCJkb3RcIjpcIlxcdTAyRDlcIixcIkRvdERvdFwiOlwiXFx1MjBEQ1wiLFwiZG90ZXFcIjpcIlxcdTIyNTBcIixcImRvdGVxZG90XCI6XCJcXHUyMjUxXCIsXCJEb3RFcXVhbFwiOlwiXFx1MjI1MFwiLFwiZG90bWludXNcIjpcIlxcdTIyMzhcIixcImRvdHBsdXNcIjpcIlxcdTIyMTRcIixcImRvdHNxdWFyZVwiOlwiXFx1MjJBMVwiLFwiZG91YmxlYmFyd2VkZ2VcIjpcIlxcdTIzMDZcIixcIkRvdWJsZUNvbnRvdXJJbnRlZ3JhbFwiOlwiXFx1MjIyRlwiLFwiRG91YmxlRG90XCI6XCJcXHUwMEE4XCIsXCJEb3VibGVEb3duQXJyb3dcIjpcIlxcdTIxRDNcIixcIkRvdWJsZUxlZnRBcnJvd1wiOlwiXFx1MjFEMFwiLFwiRG91YmxlTGVmdFJpZ2h0QXJyb3dcIjpcIlxcdTIxRDRcIixcIkRvdWJsZUxlZnRUZWVcIjpcIlxcdTJBRTRcIixcIkRvdWJsZUxvbmdMZWZ0QXJyb3dcIjpcIlxcdTI3RjhcIixcIkRvdWJsZUxvbmdMZWZ0UmlnaHRBcnJvd1wiOlwiXFx1MjdGQVwiLFwiRG91YmxlTG9uZ1JpZ2h0QXJyb3dcIjpcIlxcdTI3RjlcIixcIkRvdWJsZVJpZ2h0QXJyb3dcIjpcIlxcdTIxRDJcIixcIkRvdWJsZVJpZ2h0VGVlXCI6XCJcXHUyMkE4XCIsXCJEb3VibGVVcEFycm93XCI6XCJcXHUyMUQxXCIsXCJEb3VibGVVcERvd25BcnJvd1wiOlwiXFx1MjFENVwiLFwiRG91YmxlVmVydGljYWxCYXJcIjpcIlxcdTIyMjVcIixcIkRvd25BcnJvd0JhclwiOlwiXFx1MjkxM1wiLFwiZG93bmFycm93XCI6XCJcXHUyMTkzXCIsXCJEb3duQXJyb3dcIjpcIlxcdTIxOTNcIixcIkRvd25hcnJvd1wiOlwiXFx1MjFEM1wiLFwiRG93bkFycm93VXBBcnJvd1wiOlwiXFx1MjFGNVwiLFwiRG93bkJyZXZlXCI6XCJcXHUwMzExXCIsXCJkb3duZG93bmFycm93c1wiOlwiXFx1MjFDQVwiLFwiZG93bmhhcnBvb25sZWZ0XCI6XCJcXHUyMUMzXCIsXCJkb3duaGFycG9vbnJpZ2h0XCI6XCJcXHUyMUMyXCIsXCJEb3duTGVmdFJpZ2h0VmVjdG9yXCI6XCJcXHUyOTUwXCIsXCJEb3duTGVmdFRlZVZlY3RvclwiOlwiXFx1Mjk1RVwiLFwiRG93bkxlZnRWZWN0b3JCYXJcIjpcIlxcdTI5NTZcIixcIkRvd25MZWZ0VmVjdG9yXCI6XCJcXHUyMUJEXCIsXCJEb3duUmlnaHRUZWVWZWN0b3JcIjpcIlxcdTI5NUZcIixcIkRvd25SaWdodFZlY3RvckJhclwiOlwiXFx1Mjk1N1wiLFwiRG93blJpZ2h0VmVjdG9yXCI6XCJcXHUyMUMxXCIsXCJEb3duVGVlQXJyb3dcIjpcIlxcdTIxQTdcIixcIkRvd25UZWVcIjpcIlxcdTIyQTRcIixcImRyYmthcm93XCI6XCJcXHUyOTEwXCIsXCJkcmNvcm5cIjpcIlxcdTIzMUZcIixcImRyY3JvcFwiOlwiXFx1MjMwQ1wiLFwiRHNjclwiOlwiXFx1RDgzNVxcdURDOUZcIixcImRzY3JcIjpcIlxcdUQ4MzVcXHVEQ0I5XCIsXCJEU2N5XCI6XCJcXHUwNDA1XCIsXCJkc2N5XCI6XCJcXHUwNDU1XCIsXCJkc29sXCI6XCJcXHUyOUY2XCIsXCJEc3Ryb2tcIjpcIlxcdTAxMTBcIixcImRzdHJva1wiOlwiXFx1MDExMVwiLFwiZHRkb3RcIjpcIlxcdTIyRjFcIixcImR0cmlcIjpcIlxcdTI1QkZcIixcImR0cmlmXCI6XCJcXHUyNUJFXCIsXCJkdWFyclwiOlwiXFx1MjFGNVwiLFwiZHVoYXJcIjpcIlxcdTI5NkZcIixcImR3YW5nbGVcIjpcIlxcdTI5QTZcIixcIkRaY3lcIjpcIlxcdTA0MEZcIixcImR6Y3lcIjpcIlxcdTA0NUZcIixcImR6aWdyYXJyXCI6XCJcXHUyN0ZGXCIsXCJFYWN1dGVcIjpcIlxcdTAwQzlcIixcImVhY3V0ZVwiOlwiXFx1MDBFOVwiLFwiZWFzdGVyXCI6XCJcXHUyQTZFXCIsXCJFY2Fyb25cIjpcIlxcdTAxMUFcIixcImVjYXJvblwiOlwiXFx1MDExQlwiLFwiRWNpcmNcIjpcIlxcdTAwQ0FcIixcImVjaXJjXCI6XCJcXHUwMEVBXCIsXCJlY2lyXCI6XCJcXHUyMjU2XCIsXCJlY29sb25cIjpcIlxcdTIyNTVcIixcIkVjeVwiOlwiXFx1MDQyRFwiLFwiZWN5XCI6XCJcXHUwNDREXCIsXCJlRERvdFwiOlwiXFx1MkE3N1wiLFwiRWRvdFwiOlwiXFx1MDExNlwiLFwiZWRvdFwiOlwiXFx1MDExN1wiLFwiZURvdFwiOlwiXFx1MjI1MVwiLFwiZWVcIjpcIlxcdTIxNDdcIixcImVmRG90XCI6XCJcXHUyMjUyXCIsXCJFZnJcIjpcIlxcdUQ4MzVcXHVERDA4XCIsXCJlZnJcIjpcIlxcdUQ4MzVcXHVERDIyXCIsXCJlZ1wiOlwiXFx1MkE5QVwiLFwiRWdyYXZlXCI6XCJcXHUwMEM4XCIsXCJlZ3JhdmVcIjpcIlxcdTAwRThcIixcImVnc1wiOlwiXFx1MkE5NlwiLFwiZWdzZG90XCI6XCJcXHUyQTk4XCIsXCJlbFwiOlwiXFx1MkE5OVwiLFwiRWxlbWVudFwiOlwiXFx1MjIwOFwiLFwiZWxpbnRlcnNcIjpcIlxcdTIzRTdcIixcImVsbFwiOlwiXFx1MjExM1wiLFwiZWxzXCI6XCJcXHUyQTk1XCIsXCJlbHNkb3RcIjpcIlxcdTJBOTdcIixcIkVtYWNyXCI6XCJcXHUwMTEyXCIsXCJlbWFjclwiOlwiXFx1MDExM1wiLFwiZW1wdHlcIjpcIlxcdTIyMDVcIixcImVtcHR5c2V0XCI6XCJcXHUyMjA1XCIsXCJFbXB0eVNtYWxsU3F1YXJlXCI6XCJcXHUyNUZCXCIsXCJlbXB0eXZcIjpcIlxcdTIyMDVcIixcIkVtcHR5VmVyeVNtYWxsU3F1YXJlXCI6XCJcXHUyNUFCXCIsXCJlbXNwMTNcIjpcIlxcdTIwMDRcIixcImVtc3AxNFwiOlwiXFx1MjAwNVwiLFwiZW1zcFwiOlwiXFx1MjAwM1wiLFwiRU5HXCI6XCJcXHUwMTRBXCIsXCJlbmdcIjpcIlxcdTAxNEJcIixcImVuc3BcIjpcIlxcdTIwMDJcIixcIkVvZ29uXCI6XCJcXHUwMTE4XCIsXCJlb2dvblwiOlwiXFx1MDExOVwiLFwiRW9wZlwiOlwiXFx1RDgzNVxcdUREM0NcIixcImVvcGZcIjpcIlxcdUQ4MzVcXHVERDU2XCIsXCJlcGFyXCI6XCJcXHUyMkQ1XCIsXCJlcGFyc2xcIjpcIlxcdTI5RTNcIixcImVwbHVzXCI6XCJcXHUyQTcxXCIsXCJlcHNpXCI6XCJcXHUwM0I1XCIsXCJFcHNpbG9uXCI6XCJcXHUwMzk1XCIsXCJlcHNpbG9uXCI6XCJcXHUwM0I1XCIsXCJlcHNpdlwiOlwiXFx1MDNGNVwiLFwiZXFjaXJjXCI6XCJcXHUyMjU2XCIsXCJlcWNvbG9uXCI6XCJcXHUyMjU1XCIsXCJlcXNpbVwiOlwiXFx1MjI0MlwiLFwiZXFzbGFudGd0clwiOlwiXFx1MkE5NlwiLFwiZXFzbGFudGxlc3NcIjpcIlxcdTJBOTVcIixcIkVxdWFsXCI6XCJcXHUyQTc1XCIsXCJlcXVhbHNcIjpcIj1cIixcIkVxdWFsVGlsZGVcIjpcIlxcdTIyNDJcIixcImVxdWVzdFwiOlwiXFx1MjI1RlwiLFwiRXF1aWxpYnJpdW1cIjpcIlxcdTIxQ0NcIixcImVxdWl2XCI6XCJcXHUyMjYxXCIsXCJlcXVpdkREXCI6XCJcXHUyQTc4XCIsXCJlcXZwYXJzbFwiOlwiXFx1MjlFNVwiLFwiZXJhcnJcIjpcIlxcdTI5NzFcIixcImVyRG90XCI6XCJcXHUyMjUzXCIsXCJlc2NyXCI6XCJcXHUyMTJGXCIsXCJFc2NyXCI6XCJcXHUyMTMwXCIsXCJlc2RvdFwiOlwiXFx1MjI1MFwiLFwiRXNpbVwiOlwiXFx1MkE3M1wiLFwiZXNpbVwiOlwiXFx1MjI0MlwiLFwiRXRhXCI6XCJcXHUwMzk3XCIsXCJldGFcIjpcIlxcdTAzQjdcIixcIkVUSFwiOlwiXFx1MDBEMFwiLFwiZXRoXCI6XCJcXHUwMEYwXCIsXCJFdW1sXCI6XCJcXHUwMENCXCIsXCJldW1sXCI6XCJcXHUwMEVCXCIsXCJldXJvXCI6XCJcXHUyMEFDXCIsXCJleGNsXCI6XCIhXCIsXCJleGlzdFwiOlwiXFx1MjIwM1wiLFwiRXhpc3RzXCI6XCJcXHUyMjAzXCIsXCJleHBlY3RhdGlvblwiOlwiXFx1MjEzMFwiLFwiZXhwb25lbnRpYWxlXCI6XCJcXHUyMTQ3XCIsXCJFeHBvbmVudGlhbEVcIjpcIlxcdTIxNDdcIixcImZhbGxpbmdkb3RzZXFcIjpcIlxcdTIyNTJcIixcIkZjeVwiOlwiXFx1MDQyNFwiLFwiZmN5XCI6XCJcXHUwNDQ0XCIsXCJmZW1hbGVcIjpcIlxcdTI2NDBcIixcImZmaWxpZ1wiOlwiXFx1RkIwM1wiLFwiZmZsaWdcIjpcIlxcdUZCMDBcIixcImZmbGxpZ1wiOlwiXFx1RkIwNFwiLFwiRmZyXCI6XCJcXHVEODM1XFx1REQwOVwiLFwiZmZyXCI6XCJcXHVEODM1XFx1REQyM1wiLFwiZmlsaWdcIjpcIlxcdUZCMDFcIixcIkZpbGxlZFNtYWxsU3F1YXJlXCI6XCJcXHUyNUZDXCIsXCJGaWxsZWRWZXJ5U21hbGxTcXVhcmVcIjpcIlxcdTI1QUFcIixcImZqbGlnXCI6XCJmalwiLFwiZmxhdFwiOlwiXFx1MjY2RFwiLFwiZmxsaWdcIjpcIlxcdUZCMDJcIixcImZsdG5zXCI6XCJcXHUyNUIxXCIsXCJmbm9mXCI6XCJcXHUwMTkyXCIsXCJGb3BmXCI6XCJcXHVEODM1XFx1REQzRFwiLFwiZm9wZlwiOlwiXFx1RDgzNVxcdURENTdcIixcImZvcmFsbFwiOlwiXFx1MjIwMFwiLFwiRm9yQWxsXCI6XCJcXHUyMjAwXCIsXCJmb3JrXCI6XCJcXHUyMkQ0XCIsXCJmb3JrdlwiOlwiXFx1MkFEOVwiLFwiRm91cmllcnRyZlwiOlwiXFx1MjEzMVwiLFwiZnBhcnRpbnRcIjpcIlxcdTJBMERcIixcImZyYWMxMlwiOlwiXFx1MDBCRFwiLFwiZnJhYzEzXCI6XCJcXHUyMTUzXCIsXCJmcmFjMTRcIjpcIlxcdTAwQkNcIixcImZyYWMxNVwiOlwiXFx1MjE1NVwiLFwiZnJhYzE2XCI6XCJcXHUyMTU5XCIsXCJmcmFjMThcIjpcIlxcdTIxNUJcIixcImZyYWMyM1wiOlwiXFx1MjE1NFwiLFwiZnJhYzI1XCI6XCJcXHUyMTU2XCIsXCJmcmFjMzRcIjpcIlxcdTAwQkVcIixcImZyYWMzNVwiOlwiXFx1MjE1N1wiLFwiZnJhYzM4XCI6XCJcXHUyMTVDXCIsXCJmcmFjNDVcIjpcIlxcdTIxNThcIixcImZyYWM1NlwiOlwiXFx1MjE1QVwiLFwiZnJhYzU4XCI6XCJcXHUyMTVEXCIsXCJmcmFjNzhcIjpcIlxcdTIxNUVcIixcImZyYXNsXCI6XCJcXHUyMDQ0XCIsXCJmcm93blwiOlwiXFx1MjMyMlwiLFwiZnNjclwiOlwiXFx1RDgzNVxcdURDQkJcIixcIkZzY3JcIjpcIlxcdTIxMzFcIixcImdhY3V0ZVwiOlwiXFx1MDFGNVwiLFwiR2FtbWFcIjpcIlxcdTAzOTNcIixcImdhbW1hXCI6XCJcXHUwM0IzXCIsXCJHYW1tYWRcIjpcIlxcdTAzRENcIixcImdhbW1hZFwiOlwiXFx1MDNERFwiLFwiZ2FwXCI6XCJcXHUyQTg2XCIsXCJHYnJldmVcIjpcIlxcdTAxMUVcIixcImdicmV2ZVwiOlwiXFx1MDExRlwiLFwiR2NlZGlsXCI6XCJcXHUwMTIyXCIsXCJHY2lyY1wiOlwiXFx1MDExQ1wiLFwiZ2NpcmNcIjpcIlxcdTAxMURcIixcIkdjeVwiOlwiXFx1MDQxM1wiLFwiZ2N5XCI6XCJcXHUwNDMzXCIsXCJHZG90XCI6XCJcXHUwMTIwXCIsXCJnZG90XCI6XCJcXHUwMTIxXCIsXCJnZVwiOlwiXFx1MjI2NVwiLFwiZ0VcIjpcIlxcdTIyNjdcIixcImdFbFwiOlwiXFx1MkE4Q1wiLFwiZ2VsXCI6XCJcXHUyMkRCXCIsXCJnZXFcIjpcIlxcdTIyNjVcIixcImdlcXFcIjpcIlxcdTIyNjdcIixcImdlcXNsYW50XCI6XCJcXHUyQTdFXCIsXCJnZXNjY1wiOlwiXFx1MkFBOVwiLFwiZ2VzXCI6XCJcXHUyQTdFXCIsXCJnZXNkb3RcIjpcIlxcdTJBODBcIixcImdlc2RvdG9cIjpcIlxcdTJBODJcIixcImdlc2RvdG9sXCI6XCJcXHUyQTg0XCIsXCJnZXNsXCI6XCJcXHUyMkRCXFx1RkUwMFwiLFwiZ2VzbGVzXCI6XCJcXHUyQTk0XCIsXCJHZnJcIjpcIlxcdUQ4MzVcXHVERDBBXCIsXCJnZnJcIjpcIlxcdUQ4MzVcXHVERDI0XCIsXCJnZ1wiOlwiXFx1MjI2QlwiLFwiR2dcIjpcIlxcdTIyRDlcIixcImdnZ1wiOlwiXFx1MjJEOVwiLFwiZ2ltZWxcIjpcIlxcdTIxMzdcIixcIkdKY3lcIjpcIlxcdTA0MDNcIixcImdqY3lcIjpcIlxcdTA0NTNcIixcImdsYVwiOlwiXFx1MkFBNVwiLFwiZ2xcIjpcIlxcdTIyNzdcIixcImdsRVwiOlwiXFx1MkE5MlwiLFwiZ2xqXCI6XCJcXHUyQUE0XCIsXCJnbmFwXCI6XCJcXHUyQThBXCIsXCJnbmFwcHJveFwiOlwiXFx1MkE4QVwiLFwiZ25lXCI6XCJcXHUyQTg4XCIsXCJnbkVcIjpcIlxcdTIyNjlcIixcImduZXFcIjpcIlxcdTJBODhcIixcImduZXFxXCI6XCJcXHUyMjY5XCIsXCJnbnNpbVwiOlwiXFx1MjJFN1wiLFwiR29wZlwiOlwiXFx1RDgzNVxcdUREM0VcIixcImdvcGZcIjpcIlxcdUQ4MzVcXHVERDU4XCIsXCJncmF2ZVwiOlwiYFwiLFwiR3JlYXRlckVxdWFsXCI6XCJcXHUyMjY1XCIsXCJHcmVhdGVyRXF1YWxMZXNzXCI6XCJcXHUyMkRCXCIsXCJHcmVhdGVyRnVsbEVxdWFsXCI6XCJcXHUyMjY3XCIsXCJHcmVhdGVyR3JlYXRlclwiOlwiXFx1MkFBMlwiLFwiR3JlYXRlckxlc3NcIjpcIlxcdTIyNzdcIixcIkdyZWF0ZXJTbGFudEVxdWFsXCI6XCJcXHUyQTdFXCIsXCJHcmVhdGVyVGlsZGVcIjpcIlxcdTIyNzNcIixcIkdzY3JcIjpcIlxcdUQ4MzVcXHVEQ0EyXCIsXCJnc2NyXCI6XCJcXHUyMTBBXCIsXCJnc2ltXCI6XCJcXHUyMjczXCIsXCJnc2ltZVwiOlwiXFx1MkE4RVwiLFwiZ3NpbWxcIjpcIlxcdTJBOTBcIixcImd0Y2NcIjpcIlxcdTJBQTdcIixcImd0Y2lyXCI6XCJcXHUyQTdBXCIsXCJndFwiOlwiPlwiLFwiR1RcIjpcIj5cIixcIkd0XCI6XCJcXHUyMjZCXCIsXCJndGRvdFwiOlwiXFx1MjJEN1wiLFwiZ3RsUGFyXCI6XCJcXHUyOTk1XCIsXCJndHF1ZXN0XCI6XCJcXHUyQTdDXCIsXCJndHJhcHByb3hcIjpcIlxcdTJBODZcIixcImd0cmFyclwiOlwiXFx1Mjk3OFwiLFwiZ3RyZG90XCI6XCJcXHUyMkQ3XCIsXCJndHJlcWxlc3NcIjpcIlxcdTIyREJcIixcImd0cmVxcWxlc3NcIjpcIlxcdTJBOENcIixcImd0cmxlc3NcIjpcIlxcdTIyNzdcIixcImd0cnNpbVwiOlwiXFx1MjI3M1wiLFwiZ3ZlcnRuZXFxXCI6XCJcXHUyMjY5XFx1RkUwMFwiLFwiZ3ZuRVwiOlwiXFx1MjI2OVxcdUZFMDBcIixcIkhhY2VrXCI6XCJcXHUwMkM3XCIsXCJoYWlyc3BcIjpcIlxcdTIwMEFcIixcImhhbGZcIjpcIlxcdTAwQkRcIixcImhhbWlsdFwiOlwiXFx1MjEwQlwiLFwiSEFSRGN5XCI6XCJcXHUwNDJBXCIsXCJoYXJkY3lcIjpcIlxcdTA0NEFcIixcImhhcnJjaXJcIjpcIlxcdTI5NDhcIixcImhhcnJcIjpcIlxcdTIxOTRcIixcImhBcnJcIjpcIlxcdTIxRDRcIixcImhhcnJ3XCI6XCJcXHUyMUFEXCIsXCJIYXRcIjpcIl5cIixcImhiYXJcIjpcIlxcdTIxMEZcIixcIkhjaXJjXCI6XCJcXHUwMTI0XCIsXCJoY2lyY1wiOlwiXFx1MDEyNVwiLFwiaGVhcnRzXCI6XCJcXHUyNjY1XCIsXCJoZWFydHN1aXRcIjpcIlxcdTI2NjVcIixcImhlbGxpcFwiOlwiXFx1MjAyNlwiLFwiaGVyY29uXCI6XCJcXHUyMkI5XCIsXCJoZnJcIjpcIlxcdUQ4MzVcXHVERDI1XCIsXCJIZnJcIjpcIlxcdTIxMENcIixcIkhpbGJlcnRTcGFjZVwiOlwiXFx1MjEwQlwiLFwiaGtzZWFyb3dcIjpcIlxcdTI5MjVcIixcImhrc3dhcm93XCI6XCJcXHUyOTI2XCIsXCJob2FyclwiOlwiXFx1MjFGRlwiLFwiaG9tdGh0XCI6XCJcXHUyMjNCXCIsXCJob29rbGVmdGFycm93XCI6XCJcXHUyMUE5XCIsXCJob29rcmlnaHRhcnJvd1wiOlwiXFx1MjFBQVwiLFwiaG9wZlwiOlwiXFx1RDgzNVxcdURENTlcIixcIkhvcGZcIjpcIlxcdTIxMERcIixcImhvcmJhclwiOlwiXFx1MjAxNVwiLFwiSG9yaXpvbnRhbExpbmVcIjpcIlxcdTI1MDBcIixcImhzY3JcIjpcIlxcdUQ4MzVcXHVEQ0JEXCIsXCJIc2NyXCI6XCJcXHUyMTBCXCIsXCJoc2xhc2hcIjpcIlxcdTIxMEZcIixcIkhzdHJva1wiOlwiXFx1MDEyNlwiLFwiaHN0cm9rXCI6XCJcXHUwMTI3XCIsXCJIdW1wRG93bkh1bXBcIjpcIlxcdTIyNEVcIixcIkh1bXBFcXVhbFwiOlwiXFx1MjI0RlwiLFwiaHlidWxsXCI6XCJcXHUyMDQzXCIsXCJoeXBoZW5cIjpcIlxcdTIwMTBcIixcIklhY3V0ZVwiOlwiXFx1MDBDRFwiLFwiaWFjdXRlXCI6XCJcXHUwMEVEXCIsXCJpY1wiOlwiXFx1MjA2M1wiLFwiSWNpcmNcIjpcIlxcdTAwQ0VcIixcImljaXJjXCI6XCJcXHUwMEVFXCIsXCJJY3lcIjpcIlxcdTA0MThcIixcImljeVwiOlwiXFx1MDQzOFwiLFwiSWRvdFwiOlwiXFx1MDEzMFwiLFwiSUVjeVwiOlwiXFx1MDQxNVwiLFwiaWVjeVwiOlwiXFx1MDQzNVwiLFwiaWV4Y2xcIjpcIlxcdTAwQTFcIixcImlmZlwiOlwiXFx1MjFENFwiLFwiaWZyXCI6XCJcXHVEODM1XFx1REQyNlwiLFwiSWZyXCI6XCJcXHUyMTExXCIsXCJJZ3JhdmVcIjpcIlxcdTAwQ0NcIixcImlncmF2ZVwiOlwiXFx1MDBFQ1wiLFwiaWlcIjpcIlxcdTIxNDhcIixcImlpaWludFwiOlwiXFx1MkEwQ1wiLFwiaWlpbnRcIjpcIlxcdTIyMkRcIixcImlpbmZpblwiOlwiXFx1MjlEQ1wiLFwiaWlvdGFcIjpcIlxcdTIxMjlcIixcIklKbGlnXCI6XCJcXHUwMTMyXCIsXCJpamxpZ1wiOlwiXFx1MDEzM1wiLFwiSW1hY3JcIjpcIlxcdTAxMkFcIixcImltYWNyXCI6XCJcXHUwMTJCXCIsXCJpbWFnZVwiOlwiXFx1MjExMVwiLFwiSW1hZ2luYXJ5SVwiOlwiXFx1MjE0OFwiLFwiaW1hZ2xpbmVcIjpcIlxcdTIxMTBcIixcImltYWdwYXJ0XCI6XCJcXHUyMTExXCIsXCJpbWF0aFwiOlwiXFx1MDEzMVwiLFwiSW1cIjpcIlxcdTIxMTFcIixcImltb2ZcIjpcIlxcdTIyQjdcIixcImltcGVkXCI6XCJcXHUwMUI1XCIsXCJJbXBsaWVzXCI6XCJcXHUyMUQyXCIsXCJpbmNhcmVcIjpcIlxcdTIxMDVcIixcImluXCI6XCJcXHUyMjA4XCIsXCJpbmZpblwiOlwiXFx1MjIxRVwiLFwiaW5maW50aWVcIjpcIlxcdTI5RERcIixcImlub2RvdFwiOlwiXFx1MDEzMVwiLFwiaW50Y2FsXCI6XCJcXHUyMkJBXCIsXCJpbnRcIjpcIlxcdTIyMkJcIixcIkludFwiOlwiXFx1MjIyQ1wiLFwiaW50ZWdlcnNcIjpcIlxcdTIxMjRcIixcIkludGVncmFsXCI6XCJcXHUyMjJCXCIsXCJpbnRlcmNhbFwiOlwiXFx1MjJCQVwiLFwiSW50ZXJzZWN0aW9uXCI6XCJcXHUyMkMyXCIsXCJpbnRsYXJoa1wiOlwiXFx1MkExN1wiLFwiaW50cHJvZFwiOlwiXFx1MkEzQ1wiLFwiSW52aXNpYmxlQ29tbWFcIjpcIlxcdTIwNjNcIixcIkludmlzaWJsZVRpbWVzXCI6XCJcXHUyMDYyXCIsXCJJT2N5XCI6XCJcXHUwNDAxXCIsXCJpb2N5XCI6XCJcXHUwNDUxXCIsXCJJb2dvblwiOlwiXFx1MDEyRVwiLFwiaW9nb25cIjpcIlxcdTAxMkZcIixcIklvcGZcIjpcIlxcdUQ4MzVcXHVERDQwXCIsXCJpb3BmXCI6XCJcXHVEODM1XFx1REQ1QVwiLFwiSW90YVwiOlwiXFx1MDM5OVwiLFwiaW90YVwiOlwiXFx1MDNCOVwiLFwiaXByb2RcIjpcIlxcdTJBM0NcIixcImlxdWVzdFwiOlwiXFx1MDBCRlwiLFwiaXNjclwiOlwiXFx1RDgzNVxcdURDQkVcIixcIklzY3JcIjpcIlxcdTIxMTBcIixcImlzaW5cIjpcIlxcdTIyMDhcIixcImlzaW5kb3RcIjpcIlxcdTIyRjVcIixcImlzaW5FXCI6XCJcXHUyMkY5XCIsXCJpc2luc1wiOlwiXFx1MjJGNFwiLFwiaXNpbnN2XCI6XCJcXHUyMkYzXCIsXCJpc2ludlwiOlwiXFx1MjIwOFwiLFwiaXRcIjpcIlxcdTIwNjJcIixcIkl0aWxkZVwiOlwiXFx1MDEyOFwiLFwiaXRpbGRlXCI6XCJcXHUwMTI5XCIsXCJJdWtjeVwiOlwiXFx1MDQwNlwiLFwiaXVrY3lcIjpcIlxcdTA0NTZcIixcIkl1bWxcIjpcIlxcdTAwQ0ZcIixcIml1bWxcIjpcIlxcdTAwRUZcIixcIkpjaXJjXCI6XCJcXHUwMTM0XCIsXCJqY2lyY1wiOlwiXFx1MDEzNVwiLFwiSmN5XCI6XCJcXHUwNDE5XCIsXCJqY3lcIjpcIlxcdTA0MzlcIixcIkpmclwiOlwiXFx1RDgzNVxcdUREMERcIixcImpmclwiOlwiXFx1RDgzNVxcdUREMjdcIixcImptYXRoXCI6XCJcXHUwMjM3XCIsXCJKb3BmXCI6XCJcXHVEODM1XFx1REQ0MVwiLFwiam9wZlwiOlwiXFx1RDgzNVxcdURENUJcIixcIkpzY3JcIjpcIlxcdUQ4MzVcXHVEQ0E1XCIsXCJqc2NyXCI6XCJcXHVEODM1XFx1RENCRlwiLFwiSnNlcmN5XCI6XCJcXHUwNDA4XCIsXCJqc2VyY3lcIjpcIlxcdTA0NThcIixcIkp1a2N5XCI6XCJcXHUwNDA0XCIsXCJqdWtjeVwiOlwiXFx1MDQ1NFwiLFwiS2FwcGFcIjpcIlxcdTAzOUFcIixcImthcHBhXCI6XCJcXHUwM0JBXCIsXCJrYXBwYXZcIjpcIlxcdTAzRjBcIixcIktjZWRpbFwiOlwiXFx1MDEzNlwiLFwia2NlZGlsXCI6XCJcXHUwMTM3XCIsXCJLY3lcIjpcIlxcdTA0MUFcIixcImtjeVwiOlwiXFx1MDQzQVwiLFwiS2ZyXCI6XCJcXHVEODM1XFx1REQwRVwiLFwia2ZyXCI6XCJcXHVEODM1XFx1REQyOFwiLFwia2dyZWVuXCI6XCJcXHUwMTM4XCIsXCJLSGN5XCI6XCJcXHUwNDI1XCIsXCJraGN5XCI6XCJcXHUwNDQ1XCIsXCJLSmN5XCI6XCJcXHUwNDBDXCIsXCJramN5XCI6XCJcXHUwNDVDXCIsXCJLb3BmXCI6XCJcXHVEODM1XFx1REQ0MlwiLFwia29wZlwiOlwiXFx1RDgzNVxcdURENUNcIixcIktzY3JcIjpcIlxcdUQ4MzVcXHVEQ0E2XCIsXCJrc2NyXCI6XCJcXHVEODM1XFx1RENDMFwiLFwibEFhcnJcIjpcIlxcdTIxREFcIixcIkxhY3V0ZVwiOlwiXFx1MDEzOVwiLFwibGFjdXRlXCI6XCJcXHUwMTNBXCIsXCJsYWVtcHR5dlwiOlwiXFx1MjlCNFwiLFwibGFncmFuXCI6XCJcXHUyMTEyXCIsXCJMYW1iZGFcIjpcIlxcdTAzOUJcIixcImxhbWJkYVwiOlwiXFx1MDNCQlwiLFwibGFuZ1wiOlwiXFx1MjdFOFwiLFwiTGFuZ1wiOlwiXFx1MjdFQVwiLFwibGFuZ2RcIjpcIlxcdTI5OTFcIixcImxhbmdsZVwiOlwiXFx1MjdFOFwiLFwibGFwXCI6XCJcXHUyQTg1XCIsXCJMYXBsYWNldHJmXCI6XCJcXHUyMTEyXCIsXCJsYXF1b1wiOlwiXFx1MDBBQlwiLFwibGFycmJcIjpcIlxcdTIxRTRcIixcImxhcnJiZnNcIjpcIlxcdTI5MUZcIixcImxhcnJcIjpcIlxcdTIxOTBcIixcIkxhcnJcIjpcIlxcdTIxOUVcIixcImxBcnJcIjpcIlxcdTIxRDBcIixcImxhcnJmc1wiOlwiXFx1MjkxRFwiLFwibGFycmhrXCI6XCJcXHUyMUE5XCIsXCJsYXJybHBcIjpcIlxcdTIxQUJcIixcImxhcnJwbFwiOlwiXFx1MjkzOVwiLFwibGFycnNpbVwiOlwiXFx1Mjk3M1wiLFwibGFycnRsXCI6XCJcXHUyMUEyXCIsXCJsYXRhaWxcIjpcIlxcdTI5MTlcIixcImxBdGFpbFwiOlwiXFx1MjkxQlwiLFwibGF0XCI6XCJcXHUyQUFCXCIsXCJsYXRlXCI6XCJcXHUyQUFEXCIsXCJsYXRlc1wiOlwiXFx1MkFBRFxcdUZFMDBcIixcImxiYXJyXCI6XCJcXHUyOTBDXCIsXCJsQmFyclwiOlwiXFx1MjkwRVwiLFwibGJicmtcIjpcIlxcdTI3NzJcIixcImxicmFjZVwiOlwie1wiLFwibGJyYWNrXCI6XCJbXCIsXCJsYnJrZVwiOlwiXFx1Mjk4QlwiLFwibGJya3NsZFwiOlwiXFx1Mjk4RlwiLFwibGJya3NsdVwiOlwiXFx1Mjk4RFwiLFwiTGNhcm9uXCI6XCJcXHUwMTNEXCIsXCJsY2Fyb25cIjpcIlxcdTAxM0VcIixcIkxjZWRpbFwiOlwiXFx1MDEzQlwiLFwibGNlZGlsXCI6XCJcXHUwMTNDXCIsXCJsY2VpbFwiOlwiXFx1MjMwOFwiLFwibGN1YlwiOlwie1wiLFwiTGN5XCI6XCJcXHUwNDFCXCIsXCJsY3lcIjpcIlxcdTA0M0JcIixcImxkY2FcIjpcIlxcdTI5MzZcIixcImxkcXVvXCI6XCJcXHUyMDFDXCIsXCJsZHF1b3JcIjpcIlxcdTIwMUVcIixcImxkcmRoYXJcIjpcIlxcdTI5NjdcIixcImxkcnVzaGFyXCI6XCJcXHUyOTRCXCIsXCJsZHNoXCI6XCJcXHUyMUIyXCIsXCJsZVwiOlwiXFx1MjI2NFwiLFwibEVcIjpcIlxcdTIyNjZcIixcIkxlZnRBbmdsZUJyYWNrZXRcIjpcIlxcdTI3RThcIixcIkxlZnRBcnJvd0JhclwiOlwiXFx1MjFFNFwiLFwibGVmdGFycm93XCI6XCJcXHUyMTkwXCIsXCJMZWZ0QXJyb3dcIjpcIlxcdTIxOTBcIixcIkxlZnRhcnJvd1wiOlwiXFx1MjFEMFwiLFwiTGVmdEFycm93UmlnaHRBcnJvd1wiOlwiXFx1MjFDNlwiLFwibGVmdGFycm93dGFpbFwiOlwiXFx1MjFBMlwiLFwiTGVmdENlaWxpbmdcIjpcIlxcdTIzMDhcIixcIkxlZnREb3VibGVCcmFja2V0XCI6XCJcXHUyN0U2XCIsXCJMZWZ0RG93blRlZVZlY3RvclwiOlwiXFx1Mjk2MVwiLFwiTGVmdERvd25WZWN0b3JCYXJcIjpcIlxcdTI5NTlcIixcIkxlZnREb3duVmVjdG9yXCI6XCJcXHUyMUMzXCIsXCJMZWZ0Rmxvb3JcIjpcIlxcdTIzMEFcIixcImxlZnRoYXJwb29uZG93blwiOlwiXFx1MjFCRFwiLFwibGVmdGhhcnBvb251cFwiOlwiXFx1MjFCQ1wiLFwibGVmdGxlZnRhcnJvd3NcIjpcIlxcdTIxQzdcIixcImxlZnRyaWdodGFycm93XCI6XCJcXHUyMTk0XCIsXCJMZWZ0UmlnaHRBcnJvd1wiOlwiXFx1MjE5NFwiLFwiTGVmdHJpZ2h0YXJyb3dcIjpcIlxcdTIxRDRcIixcImxlZnRyaWdodGFycm93c1wiOlwiXFx1MjFDNlwiLFwibGVmdHJpZ2h0aGFycG9vbnNcIjpcIlxcdTIxQ0JcIixcImxlZnRyaWdodHNxdWlnYXJyb3dcIjpcIlxcdTIxQURcIixcIkxlZnRSaWdodFZlY3RvclwiOlwiXFx1Mjk0RVwiLFwiTGVmdFRlZUFycm93XCI6XCJcXHUyMUE0XCIsXCJMZWZ0VGVlXCI6XCJcXHUyMkEzXCIsXCJMZWZ0VGVlVmVjdG9yXCI6XCJcXHUyOTVBXCIsXCJsZWZ0dGhyZWV0aW1lc1wiOlwiXFx1MjJDQlwiLFwiTGVmdFRyaWFuZ2xlQmFyXCI6XCJcXHUyOUNGXCIsXCJMZWZ0VHJpYW5nbGVcIjpcIlxcdTIyQjJcIixcIkxlZnRUcmlhbmdsZUVxdWFsXCI6XCJcXHUyMkI0XCIsXCJMZWZ0VXBEb3duVmVjdG9yXCI6XCJcXHUyOTUxXCIsXCJMZWZ0VXBUZWVWZWN0b3JcIjpcIlxcdTI5NjBcIixcIkxlZnRVcFZlY3RvckJhclwiOlwiXFx1Mjk1OFwiLFwiTGVmdFVwVmVjdG9yXCI6XCJcXHUyMUJGXCIsXCJMZWZ0VmVjdG9yQmFyXCI6XCJcXHUyOTUyXCIsXCJMZWZ0VmVjdG9yXCI6XCJcXHUyMUJDXCIsXCJsRWdcIjpcIlxcdTJBOEJcIixcImxlZ1wiOlwiXFx1MjJEQVwiLFwibGVxXCI6XCJcXHUyMjY0XCIsXCJsZXFxXCI6XCJcXHUyMjY2XCIsXCJsZXFzbGFudFwiOlwiXFx1MkE3RFwiLFwibGVzY2NcIjpcIlxcdTJBQThcIixcImxlc1wiOlwiXFx1MkE3RFwiLFwibGVzZG90XCI6XCJcXHUyQTdGXCIsXCJsZXNkb3RvXCI6XCJcXHUyQTgxXCIsXCJsZXNkb3RvclwiOlwiXFx1MkE4M1wiLFwibGVzZ1wiOlwiXFx1MjJEQVxcdUZFMDBcIixcImxlc2dlc1wiOlwiXFx1MkE5M1wiLFwibGVzc2FwcHJveFwiOlwiXFx1MkE4NVwiLFwibGVzc2RvdFwiOlwiXFx1MjJENlwiLFwibGVzc2VxZ3RyXCI6XCJcXHUyMkRBXCIsXCJsZXNzZXFxZ3RyXCI6XCJcXHUyQThCXCIsXCJMZXNzRXF1YWxHcmVhdGVyXCI6XCJcXHUyMkRBXCIsXCJMZXNzRnVsbEVxdWFsXCI6XCJcXHUyMjY2XCIsXCJMZXNzR3JlYXRlclwiOlwiXFx1MjI3NlwiLFwibGVzc2d0clwiOlwiXFx1MjI3NlwiLFwiTGVzc0xlc3NcIjpcIlxcdTJBQTFcIixcImxlc3NzaW1cIjpcIlxcdTIyNzJcIixcIkxlc3NTbGFudEVxdWFsXCI6XCJcXHUyQTdEXCIsXCJMZXNzVGlsZGVcIjpcIlxcdTIyNzJcIixcImxmaXNodFwiOlwiXFx1Mjk3Q1wiLFwibGZsb29yXCI6XCJcXHUyMzBBXCIsXCJMZnJcIjpcIlxcdUQ4MzVcXHVERDBGXCIsXCJsZnJcIjpcIlxcdUQ4MzVcXHVERDI5XCIsXCJsZ1wiOlwiXFx1MjI3NlwiLFwibGdFXCI6XCJcXHUyQTkxXCIsXCJsSGFyXCI6XCJcXHUyOTYyXCIsXCJsaGFyZFwiOlwiXFx1MjFCRFwiLFwibGhhcnVcIjpcIlxcdTIxQkNcIixcImxoYXJ1bFwiOlwiXFx1Mjk2QVwiLFwibGhibGtcIjpcIlxcdTI1ODRcIixcIkxKY3lcIjpcIlxcdTA0MDlcIixcImxqY3lcIjpcIlxcdTA0NTlcIixcImxsYXJyXCI6XCJcXHUyMUM3XCIsXCJsbFwiOlwiXFx1MjI2QVwiLFwiTGxcIjpcIlxcdTIyRDhcIixcImxsY29ybmVyXCI6XCJcXHUyMzFFXCIsXCJMbGVmdGFycm93XCI6XCJcXHUyMURBXCIsXCJsbGhhcmRcIjpcIlxcdTI5NkJcIixcImxsdHJpXCI6XCJcXHUyNUZBXCIsXCJMbWlkb3RcIjpcIlxcdTAxM0ZcIixcImxtaWRvdFwiOlwiXFx1MDE0MFwiLFwibG1vdXN0YWNoZVwiOlwiXFx1MjNCMFwiLFwibG1vdXN0XCI6XCJcXHUyM0IwXCIsXCJsbmFwXCI6XCJcXHUyQTg5XCIsXCJsbmFwcHJveFwiOlwiXFx1MkE4OVwiLFwibG5lXCI6XCJcXHUyQTg3XCIsXCJsbkVcIjpcIlxcdTIyNjhcIixcImxuZXFcIjpcIlxcdTJBODdcIixcImxuZXFxXCI6XCJcXHUyMjY4XCIsXCJsbnNpbVwiOlwiXFx1MjJFNlwiLFwibG9hbmdcIjpcIlxcdTI3RUNcIixcImxvYXJyXCI6XCJcXHUyMUZEXCIsXCJsb2Jya1wiOlwiXFx1MjdFNlwiLFwibG9uZ2xlZnRhcnJvd1wiOlwiXFx1MjdGNVwiLFwiTG9uZ0xlZnRBcnJvd1wiOlwiXFx1MjdGNVwiLFwiTG9uZ2xlZnRhcnJvd1wiOlwiXFx1MjdGOFwiLFwibG9uZ2xlZnRyaWdodGFycm93XCI6XCJcXHUyN0Y3XCIsXCJMb25nTGVmdFJpZ2h0QXJyb3dcIjpcIlxcdTI3RjdcIixcIkxvbmdsZWZ0cmlnaHRhcnJvd1wiOlwiXFx1MjdGQVwiLFwibG9uZ21hcHN0b1wiOlwiXFx1MjdGQ1wiLFwibG9uZ3JpZ2h0YXJyb3dcIjpcIlxcdTI3RjZcIixcIkxvbmdSaWdodEFycm93XCI6XCJcXHUyN0Y2XCIsXCJMb25ncmlnaHRhcnJvd1wiOlwiXFx1MjdGOVwiLFwibG9vcGFycm93bGVmdFwiOlwiXFx1MjFBQlwiLFwibG9vcGFycm93cmlnaHRcIjpcIlxcdTIxQUNcIixcImxvcGFyXCI6XCJcXHUyOTg1XCIsXCJMb3BmXCI6XCJcXHVEODM1XFx1REQ0M1wiLFwibG9wZlwiOlwiXFx1RDgzNVxcdURENURcIixcImxvcGx1c1wiOlwiXFx1MkEyRFwiLFwibG90aW1lc1wiOlwiXFx1MkEzNFwiLFwibG93YXN0XCI6XCJcXHUyMjE3XCIsXCJsb3diYXJcIjpcIl9cIixcIkxvd2VyTGVmdEFycm93XCI6XCJcXHUyMTk5XCIsXCJMb3dlclJpZ2h0QXJyb3dcIjpcIlxcdTIxOThcIixcImxvelwiOlwiXFx1MjVDQVwiLFwibG96ZW5nZVwiOlwiXFx1MjVDQVwiLFwibG96ZlwiOlwiXFx1MjlFQlwiLFwibHBhclwiOlwiKFwiLFwibHBhcmx0XCI6XCJcXHUyOTkzXCIsXCJscmFyclwiOlwiXFx1MjFDNlwiLFwibHJjb3JuZXJcIjpcIlxcdTIzMUZcIixcImxyaGFyXCI6XCJcXHUyMUNCXCIsXCJscmhhcmRcIjpcIlxcdTI5NkRcIixcImxybVwiOlwiXFx1MjAwRVwiLFwibHJ0cmlcIjpcIlxcdTIyQkZcIixcImxzYXF1b1wiOlwiXFx1MjAzOVwiLFwibHNjclwiOlwiXFx1RDgzNVxcdURDQzFcIixcIkxzY3JcIjpcIlxcdTIxMTJcIixcImxzaFwiOlwiXFx1MjFCMFwiLFwiTHNoXCI6XCJcXHUyMUIwXCIsXCJsc2ltXCI6XCJcXHUyMjcyXCIsXCJsc2ltZVwiOlwiXFx1MkE4RFwiLFwibHNpbWdcIjpcIlxcdTJBOEZcIixcImxzcWJcIjpcIltcIixcImxzcXVvXCI6XCJcXHUyMDE4XCIsXCJsc3F1b3JcIjpcIlxcdTIwMUFcIixcIkxzdHJva1wiOlwiXFx1MDE0MVwiLFwibHN0cm9rXCI6XCJcXHUwMTQyXCIsXCJsdGNjXCI6XCJcXHUyQUE2XCIsXCJsdGNpclwiOlwiXFx1MkE3OVwiLFwibHRcIjpcIjxcIixcIkxUXCI6XCI8XCIsXCJMdFwiOlwiXFx1MjI2QVwiLFwibHRkb3RcIjpcIlxcdTIyRDZcIixcImx0aHJlZVwiOlwiXFx1MjJDQlwiLFwibHRpbWVzXCI6XCJcXHUyMkM5XCIsXCJsdGxhcnJcIjpcIlxcdTI5NzZcIixcImx0cXVlc3RcIjpcIlxcdTJBN0JcIixcImx0cmlcIjpcIlxcdTI1QzNcIixcImx0cmllXCI6XCJcXHUyMkI0XCIsXCJsdHJpZlwiOlwiXFx1MjVDMlwiLFwibHRyUGFyXCI6XCJcXHUyOTk2XCIsXCJsdXJkc2hhclwiOlwiXFx1Mjk0QVwiLFwibHVydWhhclwiOlwiXFx1Mjk2NlwiLFwibHZlcnRuZXFxXCI6XCJcXHUyMjY4XFx1RkUwMFwiLFwibHZuRVwiOlwiXFx1MjI2OFxcdUZFMDBcIixcIm1hY3JcIjpcIlxcdTAwQUZcIixcIm1hbGVcIjpcIlxcdTI2NDJcIixcIm1hbHRcIjpcIlxcdTI3MjBcIixcIm1hbHRlc2VcIjpcIlxcdTI3MjBcIixcIk1hcFwiOlwiXFx1MjkwNVwiLFwibWFwXCI6XCJcXHUyMUE2XCIsXCJtYXBzdG9cIjpcIlxcdTIxQTZcIixcIm1hcHN0b2Rvd25cIjpcIlxcdTIxQTdcIixcIm1hcHN0b2xlZnRcIjpcIlxcdTIxQTRcIixcIm1hcHN0b3VwXCI6XCJcXHUyMUE1XCIsXCJtYXJrZXJcIjpcIlxcdTI1QUVcIixcIm1jb21tYVwiOlwiXFx1MkEyOVwiLFwiTWN5XCI6XCJcXHUwNDFDXCIsXCJtY3lcIjpcIlxcdTA0M0NcIixcIm1kYXNoXCI6XCJcXHUyMDE0XCIsXCJtRERvdFwiOlwiXFx1MjIzQVwiLFwibWVhc3VyZWRhbmdsZVwiOlwiXFx1MjIyMVwiLFwiTWVkaXVtU3BhY2VcIjpcIlxcdTIwNUZcIixcIk1lbGxpbnRyZlwiOlwiXFx1MjEzM1wiLFwiTWZyXCI6XCJcXHVEODM1XFx1REQxMFwiLFwibWZyXCI6XCJcXHVEODM1XFx1REQyQVwiLFwibWhvXCI6XCJcXHUyMTI3XCIsXCJtaWNyb1wiOlwiXFx1MDBCNVwiLFwibWlkYXN0XCI6XCIqXCIsXCJtaWRjaXJcIjpcIlxcdTJBRjBcIixcIm1pZFwiOlwiXFx1MjIyM1wiLFwibWlkZG90XCI6XCJcXHUwMEI3XCIsXCJtaW51c2JcIjpcIlxcdTIyOUZcIixcIm1pbnVzXCI6XCJcXHUyMjEyXCIsXCJtaW51c2RcIjpcIlxcdTIyMzhcIixcIm1pbnVzZHVcIjpcIlxcdTJBMkFcIixcIk1pbnVzUGx1c1wiOlwiXFx1MjIxM1wiLFwibWxjcFwiOlwiXFx1MkFEQlwiLFwibWxkclwiOlwiXFx1MjAyNlwiLFwibW5wbHVzXCI6XCJcXHUyMjEzXCIsXCJtb2RlbHNcIjpcIlxcdTIyQTdcIixcIk1vcGZcIjpcIlxcdUQ4MzVcXHVERDQ0XCIsXCJtb3BmXCI6XCJcXHVEODM1XFx1REQ1RVwiLFwibXBcIjpcIlxcdTIyMTNcIixcIm1zY3JcIjpcIlxcdUQ4MzVcXHVEQ0MyXCIsXCJNc2NyXCI6XCJcXHUyMTMzXCIsXCJtc3Rwb3NcIjpcIlxcdTIyM0VcIixcIk11XCI6XCJcXHUwMzlDXCIsXCJtdVwiOlwiXFx1MDNCQ1wiLFwibXVsdGltYXBcIjpcIlxcdTIyQjhcIixcIm11bWFwXCI6XCJcXHUyMkI4XCIsXCJuYWJsYVwiOlwiXFx1MjIwN1wiLFwiTmFjdXRlXCI6XCJcXHUwMTQzXCIsXCJuYWN1dGVcIjpcIlxcdTAxNDRcIixcIm5hbmdcIjpcIlxcdTIyMjBcXHUyMEQyXCIsXCJuYXBcIjpcIlxcdTIyNDlcIixcIm5hcEVcIjpcIlxcdTJBNzBcXHUwMzM4XCIsXCJuYXBpZFwiOlwiXFx1MjI0QlxcdTAzMzhcIixcIm5hcG9zXCI6XCJcXHUwMTQ5XCIsXCJuYXBwcm94XCI6XCJcXHUyMjQ5XCIsXCJuYXR1cmFsXCI6XCJcXHUyNjZFXCIsXCJuYXR1cmFsc1wiOlwiXFx1MjExNVwiLFwibmF0dXJcIjpcIlxcdTI2NkVcIixcIm5ic3BcIjpcIlxcdTAwQTBcIixcIm5idW1wXCI6XCJcXHUyMjRFXFx1MDMzOFwiLFwibmJ1bXBlXCI6XCJcXHUyMjRGXFx1MDMzOFwiLFwibmNhcFwiOlwiXFx1MkE0M1wiLFwiTmNhcm9uXCI6XCJcXHUwMTQ3XCIsXCJuY2Fyb25cIjpcIlxcdTAxNDhcIixcIk5jZWRpbFwiOlwiXFx1MDE0NVwiLFwibmNlZGlsXCI6XCJcXHUwMTQ2XCIsXCJuY29uZ1wiOlwiXFx1MjI0N1wiLFwibmNvbmdkb3RcIjpcIlxcdTJBNkRcXHUwMzM4XCIsXCJuY3VwXCI6XCJcXHUyQTQyXCIsXCJOY3lcIjpcIlxcdTA0MURcIixcIm5jeVwiOlwiXFx1MDQzRFwiLFwibmRhc2hcIjpcIlxcdTIwMTNcIixcIm5lYXJoa1wiOlwiXFx1MjkyNFwiLFwibmVhcnJcIjpcIlxcdTIxOTdcIixcIm5lQXJyXCI6XCJcXHUyMUQ3XCIsXCJuZWFycm93XCI6XCJcXHUyMTk3XCIsXCJuZVwiOlwiXFx1MjI2MFwiLFwibmVkb3RcIjpcIlxcdTIyNTBcXHUwMzM4XCIsXCJOZWdhdGl2ZU1lZGl1bVNwYWNlXCI6XCJcXHUyMDBCXCIsXCJOZWdhdGl2ZVRoaWNrU3BhY2VcIjpcIlxcdTIwMEJcIixcIk5lZ2F0aXZlVGhpblNwYWNlXCI6XCJcXHUyMDBCXCIsXCJOZWdhdGl2ZVZlcnlUaGluU3BhY2VcIjpcIlxcdTIwMEJcIixcIm5lcXVpdlwiOlwiXFx1MjI2MlwiLFwibmVzZWFyXCI6XCJcXHUyOTI4XCIsXCJuZXNpbVwiOlwiXFx1MjI0MlxcdTAzMzhcIixcIk5lc3RlZEdyZWF0ZXJHcmVhdGVyXCI6XCJcXHUyMjZCXCIsXCJOZXN0ZWRMZXNzTGVzc1wiOlwiXFx1MjI2QVwiLFwiTmV3TGluZVwiOlwiXFxuXCIsXCJuZXhpc3RcIjpcIlxcdTIyMDRcIixcIm5leGlzdHNcIjpcIlxcdTIyMDRcIixcIk5mclwiOlwiXFx1RDgzNVxcdUREMTFcIixcIm5mclwiOlwiXFx1RDgzNVxcdUREMkJcIixcIm5nRVwiOlwiXFx1MjI2N1xcdTAzMzhcIixcIm5nZVwiOlwiXFx1MjI3MVwiLFwibmdlcVwiOlwiXFx1MjI3MVwiLFwibmdlcXFcIjpcIlxcdTIyNjdcXHUwMzM4XCIsXCJuZ2Vxc2xhbnRcIjpcIlxcdTJBN0VcXHUwMzM4XCIsXCJuZ2VzXCI6XCJcXHUyQTdFXFx1MDMzOFwiLFwibkdnXCI6XCJcXHUyMkQ5XFx1MDMzOFwiLFwibmdzaW1cIjpcIlxcdTIyNzVcIixcIm5HdFwiOlwiXFx1MjI2QlxcdTIwRDJcIixcIm5ndFwiOlwiXFx1MjI2RlwiLFwibmd0clwiOlwiXFx1MjI2RlwiLFwibkd0dlwiOlwiXFx1MjI2QlxcdTAzMzhcIixcIm5oYXJyXCI6XCJcXHUyMUFFXCIsXCJuaEFyclwiOlwiXFx1MjFDRVwiLFwibmhwYXJcIjpcIlxcdTJBRjJcIixcIm5pXCI6XCJcXHUyMjBCXCIsXCJuaXNcIjpcIlxcdTIyRkNcIixcIm5pc2RcIjpcIlxcdTIyRkFcIixcIm5pdlwiOlwiXFx1MjIwQlwiLFwiTkpjeVwiOlwiXFx1MDQwQVwiLFwibmpjeVwiOlwiXFx1MDQ1QVwiLFwibmxhcnJcIjpcIlxcdTIxOUFcIixcIm5sQXJyXCI6XCJcXHUyMUNEXCIsXCJubGRyXCI6XCJcXHUyMDI1XCIsXCJubEVcIjpcIlxcdTIyNjZcXHUwMzM4XCIsXCJubGVcIjpcIlxcdTIyNzBcIixcIm5sZWZ0YXJyb3dcIjpcIlxcdTIxOUFcIixcIm5MZWZ0YXJyb3dcIjpcIlxcdTIxQ0RcIixcIm5sZWZ0cmlnaHRhcnJvd1wiOlwiXFx1MjFBRVwiLFwibkxlZnRyaWdodGFycm93XCI6XCJcXHUyMUNFXCIsXCJubGVxXCI6XCJcXHUyMjcwXCIsXCJubGVxcVwiOlwiXFx1MjI2NlxcdTAzMzhcIixcIm5sZXFzbGFudFwiOlwiXFx1MkE3RFxcdTAzMzhcIixcIm5sZXNcIjpcIlxcdTJBN0RcXHUwMzM4XCIsXCJubGVzc1wiOlwiXFx1MjI2RVwiLFwibkxsXCI6XCJcXHUyMkQ4XFx1MDMzOFwiLFwibmxzaW1cIjpcIlxcdTIyNzRcIixcIm5MdFwiOlwiXFx1MjI2QVxcdTIwRDJcIixcIm5sdFwiOlwiXFx1MjI2RVwiLFwibmx0cmlcIjpcIlxcdTIyRUFcIixcIm5sdHJpZVwiOlwiXFx1MjJFQ1wiLFwibkx0dlwiOlwiXFx1MjI2QVxcdTAzMzhcIixcIm5taWRcIjpcIlxcdTIyMjRcIixcIk5vQnJlYWtcIjpcIlxcdTIwNjBcIixcIk5vbkJyZWFraW5nU3BhY2VcIjpcIlxcdTAwQTBcIixcIm5vcGZcIjpcIlxcdUQ4MzVcXHVERDVGXCIsXCJOb3BmXCI6XCJcXHUyMTE1XCIsXCJOb3RcIjpcIlxcdTJBRUNcIixcIm5vdFwiOlwiXFx1MDBBQ1wiLFwiTm90Q29uZ3J1ZW50XCI6XCJcXHUyMjYyXCIsXCJOb3RDdXBDYXBcIjpcIlxcdTIyNkRcIixcIk5vdERvdWJsZVZlcnRpY2FsQmFyXCI6XCJcXHUyMjI2XCIsXCJOb3RFbGVtZW50XCI6XCJcXHUyMjA5XCIsXCJOb3RFcXVhbFwiOlwiXFx1MjI2MFwiLFwiTm90RXF1YWxUaWxkZVwiOlwiXFx1MjI0MlxcdTAzMzhcIixcIk5vdEV4aXN0c1wiOlwiXFx1MjIwNFwiLFwiTm90R3JlYXRlclwiOlwiXFx1MjI2RlwiLFwiTm90R3JlYXRlckVxdWFsXCI6XCJcXHUyMjcxXCIsXCJOb3RHcmVhdGVyRnVsbEVxdWFsXCI6XCJcXHUyMjY3XFx1MDMzOFwiLFwiTm90R3JlYXRlckdyZWF0ZXJcIjpcIlxcdTIyNkJcXHUwMzM4XCIsXCJOb3RHcmVhdGVyTGVzc1wiOlwiXFx1MjI3OVwiLFwiTm90R3JlYXRlclNsYW50RXF1YWxcIjpcIlxcdTJBN0VcXHUwMzM4XCIsXCJOb3RHcmVhdGVyVGlsZGVcIjpcIlxcdTIyNzVcIixcIk5vdEh1bXBEb3duSHVtcFwiOlwiXFx1MjI0RVxcdTAzMzhcIixcIk5vdEh1bXBFcXVhbFwiOlwiXFx1MjI0RlxcdTAzMzhcIixcIm5vdGluXCI6XCJcXHUyMjA5XCIsXCJub3RpbmRvdFwiOlwiXFx1MjJGNVxcdTAzMzhcIixcIm5vdGluRVwiOlwiXFx1MjJGOVxcdTAzMzhcIixcIm5vdGludmFcIjpcIlxcdTIyMDlcIixcIm5vdGludmJcIjpcIlxcdTIyRjdcIixcIm5vdGludmNcIjpcIlxcdTIyRjZcIixcIk5vdExlZnRUcmlhbmdsZUJhclwiOlwiXFx1MjlDRlxcdTAzMzhcIixcIk5vdExlZnRUcmlhbmdsZVwiOlwiXFx1MjJFQVwiLFwiTm90TGVmdFRyaWFuZ2xlRXF1YWxcIjpcIlxcdTIyRUNcIixcIk5vdExlc3NcIjpcIlxcdTIyNkVcIixcIk5vdExlc3NFcXVhbFwiOlwiXFx1MjI3MFwiLFwiTm90TGVzc0dyZWF0ZXJcIjpcIlxcdTIyNzhcIixcIk5vdExlc3NMZXNzXCI6XCJcXHUyMjZBXFx1MDMzOFwiLFwiTm90TGVzc1NsYW50RXF1YWxcIjpcIlxcdTJBN0RcXHUwMzM4XCIsXCJOb3RMZXNzVGlsZGVcIjpcIlxcdTIyNzRcIixcIk5vdE5lc3RlZEdyZWF0ZXJHcmVhdGVyXCI6XCJcXHUyQUEyXFx1MDMzOFwiLFwiTm90TmVzdGVkTGVzc0xlc3NcIjpcIlxcdTJBQTFcXHUwMzM4XCIsXCJub3RuaVwiOlwiXFx1MjIwQ1wiLFwibm90bml2YVwiOlwiXFx1MjIwQ1wiLFwibm90bml2YlwiOlwiXFx1MjJGRVwiLFwibm90bml2Y1wiOlwiXFx1MjJGRFwiLFwiTm90UHJlY2VkZXNcIjpcIlxcdTIyODBcIixcIk5vdFByZWNlZGVzRXF1YWxcIjpcIlxcdTJBQUZcXHUwMzM4XCIsXCJOb3RQcmVjZWRlc1NsYW50RXF1YWxcIjpcIlxcdTIyRTBcIixcIk5vdFJldmVyc2VFbGVtZW50XCI6XCJcXHUyMjBDXCIsXCJOb3RSaWdodFRyaWFuZ2xlQmFyXCI6XCJcXHUyOUQwXFx1MDMzOFwiLFwiTm90UmlnaHRUcmlhbmdsZVwiOlwiXFx1MjJFQlwiLFwiTm90UmlnaHRUcmlhbmdsZUVxdWFsXCI6XCJcXHUyMkVEXCIsXCJOb3RTcXVhcmVTdWJzZXRcIjpcIlxcdTIyOEZcXHUwMzM4XCIsXCJOb3RTcXVhcmVTdWJzZXRFcXVhbFwiOlwiXFx1MjJFMlwiLFwiTm90U3F1YXJlU3VwZXJzZXRcIjpcIlxcdTIyOTBcXHUwMzM4XCIsXCJOb3RTcXVhcmVTdXBlcnNldEVxdWFsXCI6XCJcXHUyMkUzXCIsXCJOb3RTdWJzZXRcIjpcIlxcdTIyODJcXHUyMEQyXCIsXCJOb3RTdWJzZXRFcXVhbFwiOlwiXFx1MjI4OFwiLFwiTm90U3VjY2VlZHNcIjpcIlxcdTIyODFcIixcIk5vdFN1Y2NlZWRzRXF1YWxcIjpcIlxcdTJBQjBcXHUwMzM4XCIsXCJOb3RTdWNjZWVkc1NsYW50RXF1YWxcIjpcIlxcdTIyRTFcIixcIk5vdFN1Y2NlZWRzVGlsZGVcIjpcIlxcdTIyN0ZcXHUwMzM4XCIsXCJOb3RTdXBlcnNldFwiOlwiXFx1MjI4M1xcdTIwRDJcIixcIk5vdFN1cGVyc2V0RXF1YWxcIjpcIlxcdTIyODlcIixcIk5vdFRpbGRlXCI6XCJcXHUyMjQxXCIsXCJOb3RUaWxkZUVxdWFsXCI6XCJcXHUyMjQ0XCIsXCJOb3RUaWxkZUZ1bGxFcXVhbFwiOlwiXFx1MjI0N1wiLFwiTm90VGlsZGVUaWxkZVwiOlwiXFx1MjI0OVwiLFwiTm90VmVydGljYWxCYXJcIjpcIlxcdTIyMjRcIixcIm5wYXJhbGxlbFwiOlwiXFx1MjIyNlwiLFwibnBhclwiOlwiXFx1MjIyNlwiLFwibnBhcnNsXCI6XCJcXHUyQUZEXFx1MjBFNVwiLFwibnBhcnRcIjpcIlxcdTIyMDJcXHUwMzM4XCIsXCJucG9saW50XCI6XCJcXHUyQTE0XCIsXCJucHJcIjpcIlxcdTIyODBcIixcIm5wcmN1ZVwiOlwiXFx1MjJFMFwiLFwibnByZWNcIjpcIlxcdTIyODBcIixcIm5wcmVjZXFcIjpcIlxcdTJBQUZcXHUwMzM4XCIsXCJucHJlXCI6XCJcXHUyQUFGXFx1MDMzOFwiLFwibnJhcnJjXCI6XCJcXHUyOTMzXFx1MDMzOFwiLFwibnJhcnJcIjpcIlxcdTIxOUJcIixcIm5yQXJyXCI6XCJcXHUyMUNGXCIsXCJucmFycndcIjpcIlxcdTIxOURcXHUwMzM4XCIsXCJucmlnaHRhcnJvd1wiOlwiXFx1MjE5QlwiLFwiblJpZ2h0YXJyb3dcIjpcIlxcdTIxQ0ZcIixcIm5ydHJpXCI6XCJcXHUyMkVCXCIsXCJucnRyaWVcIjpcIlxcdTIyRURcIixcIm5zY1wiOlwiXFx1MjI4MVwiLFwibnNjY3VlXCI6XCJcXHUyMkUxXCIsXCJuc2NlXCI6XCJcXHUyQUIwXFx1MDMzOFwiLFwiTnNjclwiOlwiXFx1RDgzNVxcdURDQTlcIixcIm5zY3JcIjpcIlxcdUQ4MzVcXHVEQ0MzXCIsXCJuc2hvcnRtaWRcIjpcIlxcdTIyMjRcIixcIm5zaG9ydHBhcmFsbGVsXCI6XCJcXHUyMjI2XCIsXCJuc2ltXCI6XCJcXHUyMjQxXCIsXCJuc2ltZVwiOlwiXFx1MjI0NFwiLFwibnNpbWVxXCI6XCJcXHUyMjQ0XCIsXCJuc21pZFwiOlwiXFx1MjIyNFwiLFwibnNwYXJcIjpcIlxcdTIyMjZcIixcIm5zcXN1YmVcIjpcIlxcdTIyRTJcIixcIm5zcXN1cGVcIjpcIlxcdTIyRTNcIixcIm5zdWJcIjpcIlxcdTIyODRcIixcIm5zdWJFXCI6XCJcXHUyQUM1XFx1MDMzOFwiLFwibnN1YmVcIjpcIlxcdTIyODhcIixcIm5zdWJzZXRcIjpcIlxcdTIyODJcXHUyMEQyXCIsXCJuc3Vic2V0ZXFcIjpcIlxcdTIyODhcIixcIm5zdWJzZXRlcXFcIjpcIlxcdTJBQzVcXHUwMzM4XCIsXCJuc3VjY1wiOlwiXFx1MjI4MVwiLFwibnN1Y2NlcVwiOlwiXFx1MkFCMFxcdTAzMzhcIixcIm5zdXBcIjpcIlxcdTIyODVcIixcIm5zdXBFXCI6XCJcXHUyQUM2XFx1MDMzOFwiLFwibnN1cGVcIjpcIlxcdTIyODlcIixcIm5zdXBzZXRcIjpcIlxcdTIyODNcXHUyMEQyXCIsXCJuc3Vwc2V0ZXFcIjpcIlxcdTIyODlcIixcIm5zdXBzZXRlcXFcIjpcIlxcdTJBQzZcXHUwMzM4XCIsXCJudGdsXCI6XCJcXHUyMjc5XCIsXCJOdGlsZGVcIjpcIlxcdTAwRDFcIixcIm50aWxkZVwiOlwiXFx1MDBGMVwiLFwibnRsZ1wiOlwiXFx1MjI3OFwiLFwibnRyaWFuZ2xlbGVmdFwiOlwiXFx1MjJFQVwiLFwibnRyaWFuZ2xlbGVmdGVxXCI6XCJcXHUyMkVDXCIsXCJudHJpYW5nbGVyaWdodFwiOlwiXFx1MjJFQlwiLFwibnRyaWFuZ2xlcmlnaHRlcVwiOlwiXFx1MjJFRFwiLFwiTnVcIjpcIlxcdTAzOURcIixcIm51XCI6XCJcXHUwM0JEXCIsXCJudW1cIjpcIiNcIixcIm51bWVyb1wiOlwiXFx1MjExNlwiLFwibnVtc3BcIjpcIlxcdTIwMDdcIixcIm52YXBcIjpcIlxcdTIyNERcXHUyMEQyXCIsXCJudmRhc2hcIjpcIlxcdTIyQUNcIixcIm52RGFzaFwiOlwiXFx1MjJBRFwiLFwiblZkYXNoXCI6XCJcXHUyMkFFXCIsXCJuVkRhc2hcIjpcIlxcdTIyQUZcIixcIm52Z2VcIjpcIlxcdTIyNjVcXHUyMEQyXCIsXCJudmd0XCI6XCI+XFx1MjBEMlwiLFwibnZIYXJyXCI6XCJcXHUyOTA0XCIsXCJudmluZmluXCI6XCJcXHUyOURFXCIsXCJudmxBcnJcIjpcIlxcdTI5MDJcIixcIm52bGVcIjpcIlxcdTIyNjRcXHUyMEQyXCIsXCJudmx0XCI6XCI8XFx1MjBEMlwiLFwibnZsdHJpZVwiOlwiXFx1MjJCNFxcdTIwRDJcIixcIm52ckFyclwiOlwiXFx1MjkwM1wiLFwibnZydHJpZVwiOlwiXFx1MjJCNVxcdTIwRDJcIixcIm52c2ltXCI6XCJcXHUyMjNDXFx1MjBEMlwiLFwibndhcmhrXCI6XCJcXHUyOTIzXCIsXCJud2FyclwiOlwiXFx1MjE5NlwiLFwibndBcnJcIjpcIlxcdTIxRDZcIixcIm53YXJyb3dcIjpcIlxcdTIxOTZcIixcIm53bmVhclwiOlwiXFx1MjkyN1wiLFwiT2FjdXRlXCI6XCJcXHUwMEQzXCIsXCJvYWN1dGVcIjpcIlxcdTAwRjNcIixcIm9hc3RcIjpcIlxcdTIyOUJcIixcIk9jaXJjXCI6XCJcXHUwMEQ0XCIsXCJvY2lyY1wiOlwiXFx1MDBGNFwiLFwib2NpclwiOlwiXFx1MjI5QVwiLFwiT2N5XCI6XCJcXHUwNDFFXCIsXCJvY3lcIjpcIlxcdTA0M0VcIixcIm9kYXNoXCI6XCJcXHUyMjlEXCIsXCJPZGJsYWNcIjpcIlxcdTAxNTBcIixcIm9kYmxhY1wiOlwiXFx1MDE1MVwiLFwib2RpdlwiOlwiXFx1MkEzOFwiLFwib2RvdFwiOlwiXFx1MjI5OVwiLFwib2Rzb2xkXCI6XCJcXHUyOUJDXCIsXCJPRWxpZ1wiOlwiXFx1MDE1MlwiLFwib2VsaWdcIjpcIlxcdTAxNTNcIixcIm9mY2lyXCI6XCJcXHUyOUJGXCIsXCJPZnJcIjpcIlxcdUQ4MzVcXHVERDEyXCIsXCJvZnJcIjpcIlxcdUQ4MzVcXHVERDJDXCIsXCJvZ29uXCI6XCJcXHUwMkRCXCIsXCJPZ3JhdmVcIjpcIlxcdTAwRDJcIixcIm9ncmF2ZVwiOlwiXFx1MDBGMlwiLFwib2d0XCI6XCJcXHUyOUMxXCIsXCJvaGJhclwiOlwiXFx1MjlCNVwiLFwib2htXCI6XCJcXHUwM0E5XCIsXCJvaW50XCI6XCJcXHUyMjJFXCIsXCJvbGFyclwiOlwiXFx1MjFCQVwiLFwib2xjaXJcIjpcIlxcdTI5QkVcIixcIm9sY3Jvc3NcIjpcIlxcdTI5QkJcIixcIm9saW5lXCI6XCJcXHUyMDNFXCIsXCJvbHRcIjpcIlxcdTI5QzBcIixcIk9tYWNyXCI6XCJcXHUwMTRDXCIsXCJvbWFjclwiOlwiXFx1MDE0RFwiLFwiT21lZ2FcIjpcIlxcdTAzQTlcIixcIm9tZWdhXCI6XCJcXHUwM0M5XCIsXCJPbWljcm9uXCI6XCJcXHUwMzlGXCIsXCJvbWljcm9uXCI6XCJcXHUwM0JGXCIsXCJvbWlkXCI6XCJcXHUyOUI2XCIsXCJvbWludXNcIjpcIlxcdTIyOTZcIixcIk9vcGZcIjpcIlxcdUQ4MzVcXHVERDQ2XCIsXCJvb3BmXCI6XCJcXHVEODM1XFx1REQ2MFwiLFwib3BhclwiOlwiXFx1MjlCN1wiLFwiT3BlbkN1cmx5RG91YmxlUXVvdGVcIjpcIlxcdTIwMUNcIixcIk9wZW5DdXJseVF1b3RlXCI6XCJcXHUyMDE4XCIsXCJvcGVycFwiOlwiXFx1MjlCOVwiLFwib3BsdXNcIjpcIlxcdTIyOTVcIixcIm9yYXJyXCI6XCJcXHUyMUJCXCIsXCJPclwiOlwiXFx1MkE1NFwiLFwib3JcIjpcIlxcdTIyMjhcIixcIm9yZFwiOlwiXFx1MkE1RFwiLFwib3JkZXJcIjpcIlxcdTIxMzRcIixcIm9yZGVyb2ZcIjpcIlxcdTIxMzRcIixcIm9yZGZcIjpcIlxcdTAwQUFcIixcIm9yZG1cIjpcIlxcdTAwQkFcIixcIm9yaWdvZlwiOlwiXFx1MjJCNlwiLFwib3JvclwiOlwiXFx1MkE1NlwiLFwib3JzbG9wZVwiOlwiXFx1MkE1N1wiLFwib3J2XCI6XCJcXHUyQTVCXCIsXCJvU1wiOlwiXFx1MjRDOFwiLFwiT3NjclwiOlwiXFx1RDgzNVxcdURDQUFcIixcIm9zY3JcIjpcIlxcdTIxMzRcIixcIk9zbGFzaFwiOlwiXFx1MDBEOFwiLFwib3NsYXNoXCI6XCJcXHUwMEY4XCIsXCJvc29sXCI6XCJcXHUyMjk4XCIsXCJPdGlsZGVcIjpcIlxcdTAwRDVcIixcIm90aWxkZVwiOlwiXFx1MDBGNVwiLFwib3RpbWVzYXNcIjpcIlxcdTJBMzZcIixcIk90aW1lc1wiOlwiXFx1MkEzN1wiLFwib3RpbWVzXCI6XCJcXHUyMjk3XCIsXCJPdW1sXCI6XCJcXHUwMEQ2XCIsXCJvdW1sXCI6XCJcXHUwMEY2XCIsXCJvdmJhclwiOlwiXFx1MjMzRFwiLFwiT3ZlckJhclwiOlwiXFx1MjAzRVwiLFwiT3ZlckJyYWNlXCI6XCJcXHUyM0RFXCIsXCJPdmVyQnJhY2tldFwiOlwiXFx1MjNCNFwiLFwiT3ZlclBhcmVudGhlc2lzXCI6XCJcXHUyM0RDXCIsXCJwYXJhXCI6XCJcXHUwMEI2XCIsXCJwYXJhbGxlbFwiOlwiXFx1MjIyNVwiLFwicGFyXCI6XCJcXHUyMjI1XCIsXCJwYXJzaW1cIjpcIlxcdTJBRjNcIixcInBhcnNsXCI6XCJcXHUyQUZEXCIsXCJwYXJ0XCI6XCJcXHUyMjAyXCIsXCJQYXJ0aWFsRFwiOlwiXFx1MjIwMlwiLFwiUGN5XCI6XCJcXHUwNDFGXCIsXCJwY3lcIjpcIlxcdTA0M0ZcIixcInBlcmNudFwiOlwiJVwiLFwicGVyaW9kXCI6XCIuXCIsXCJwZXJtaWxcIjpcIlxcdTIwMzBcIixcInBlcnBcIjpcIlxcdTIyQTVcIixcInBlcnRlbmtcIjpcIlxcdTIwMzFcIixcIlBmclwiOlwiXFx1RDgzNVxcdUREMTNcIixcInBmclwiOlwiXFx1RDgzNVxcdUREMkRcIixcIlBoaVwiOlwiXFx1MDNBNlwiLFwicGhpXCI6XCJcXHUwM0M2XCIsXCJwaGl2XCI6XCJcXHUwM0Q1XCIsXCJwaG1tYXRcIjpcIlxcdTIxMzNcIixcInBob25lXCI6XCJcXHUyNjBFXCIsXCJQaVwiOlwiXFx1MDNBMFwiLFwicGlcIjpcIlxcdTAzQzBcIixcInBpdGNoZm9ya1wiOlwiXFx1MjJENFwiLFwicGl2XCI6XCJcXHUwM0Q2XCIsXCJwbGFuY2tcIjpcIlxcdTIxMEZcIixcInBsYW5ja2hcIjpcIlxcdTIxMEVcIixcInBsYW5rdlwiOlwiXFx1MjEwRlwiLFwicGx1c2FjaXJcIjpcIlxcdTJBMjNcIixcInBsdXNiXCI6XCJcXHUyMjlFXCIsXCJwbHVzY2lyXCI6XCJcXHUyQTIyXCIsXCJwbHVzXCI6XCIrXCIsXCJwbHVzZG9cIjpcIlxcdTIyMTRcIixcInBsdXNkdVwiOlwiXFx1MkEyNVwiLFwicGx1c2VcIjpcIlxcdTJBNzJcIixcIlBsdXNNaW51c1wiOlwiXFx1MDBCMVwiLFwicGx1c21uXCI6XCJcXHUwMEIxXCIsXCJwbHVzc2ltXCI6XCJcXHUyQTI2XCIsXCJwbHVzdHdvXCI6XCJcXHUyQTI3XCIsXCJwbVwiOlwiXFx1MDBCMVwiLFwiUG9pbmNhcmVwbGFuZVwiOlwiXFx1MjEwQ1wiLFwicG9pbnRpbnRcIjpcIlxcdTJBMTVcIixcInBvcGZcIjpcIlxcdUQ4MzVcXHVERDYxXCIsXCJQb3BmXCI6XCJcXHUyMTE5XCIsXCJwb3VuZFwiOlwiXFx1MDBBM1wiLFwicHJhcFwiOlwiXFx1MkFCN1wiLFwiUHJcIjpcIlxcdTJBQkJcIixcInByXCI6XCJcXHUyMjdBXCIsXCJwcmN1ZVwiOlwiXFx1MjI3Q1wiLFwicHJlY2FwcHJveFwiOlwiXFx1MkFCN1wiLFwicHJlY1wiOlwiXFx1MjI3QVwiLFwicHJlY2N1cmx5ZXFcIjpcIlxcdTIyN0NcIixcIlByZWNlZGVzXCI6XCJcXHUyMjdBXCIsXCJQcmVjZWRlc0VxdWFsXCI6XCJcXHUyQUFGXCIsXCJQcmVjZWRlc1NsYW50RXF1YWxcIjpcIlxcdTIyN0NcIixcIlByZWNlZGVzVGlsZGVcIjpcIlxcdTIyN0VcIixcInByZWNlcVwiOlwiXFx1MkFBRlwiLFwicHJlY25hcHByb3hcIjpcIlxcdTJBQjlcIixcInByZWNuZXFxXCI6XCJcXHUyQUI1XCIsXCJwcmVjbnNpbVwiOlwiXFx1MjJFOFwiLFwicHJlXCI6XCJcXHUyQUFGXCIsXCJwckVcIjpcIlxcdTJBQjNcIixcInByZWNzaW1cIjpcIlxcdTIyN0VcIixcInByaW1lXCI6XCJcXHUyMDMyXCIsXCJQcmltZVwiOlwiXFx1MjAzM1wiLFwicHJpbWVzXCI6XCJcXHUyMTE5XCIsXCJwcm5hcFwiOlwiXFx1MkFCOVwiLFwicHJuRVwiOlwiXFx1MkFCNVwiLFwicHJuc2ltXCI6XCJcXHUyMkU4XCIsXCJwcm9kXCI6XCJcXHUyMjBGXCIsXCJQcm9kdWN0XCI6XCJcXHUyMjBGXCIsXCJwcm9mYWxhclwiOlwiXFx1MjMyRVwiLFwicHJvZmxpbmVcIjpcIlxcdTIzMTJcIixcInByb2ZzdXJmXCI6XCJcXHUyMzEzXCIsXCJwcm9wXCI6XCJcXHUyMjFEXCIsXCJQcm9wb3J0aW9uYWxcIjpcIlxcdTIyMURcIixcIlByb3BvcnRpb25cIjpcIlxcdTIyMzdcIixcInByb3B0b1wiOlwiXFx1MjIxRFwiLFwicHJzaW1cIjpcIlxcdTIyN0VcIixcInBydXJlbFwiOlwiXFx1MjJCMFwiLFwiUHNjclwiOlwiXFx1RDgzNVxcdURDQUJcIixcInBzY3JcIjpcIlxcdUQ4MzVcXHVEQ0M1XCIsXCJQc2lcIjpcIlxcdTAzQThcIixcInBzaVwiOlwiXFx1MDNDOFwiLFwicHVuY3NwXCI6XCJcXHUyMDA4XCIsXCJRZnJcIjpcIlxcdUQ4MzVcXHVERDE0XCIsXCJxZnJcIjpcIlxcdUQ4MzVcXHVERDJFXCIsXCJxaW50XCI6XCJcXHUyQTBDXCIsXCJxb3BmXCI6XCJcXHVEODM1XFx1REQ2MlwiLFwiUW9wZlwiOlwiXFx1MjExQVwiLFwicXByaW1lXCI6XCJcXHUyMDU3XCIsXCJRc2NyXCI6XCJcXHVEODM1XFx1RENBQ1wiLFwicXNjclwiOlwiXFx1RDgzNVxcdURDQzZcIixcInF1YXRlcm5pb25zXCI6XCJcXHUyMTBEXCIsXCJxdWF0aW50XCI6XCJcXHUyQTE2XCIsXCJxdWVzdFwiOlwiP1wiLFwicXVlc3RlcVwiOlwiXFx1MjI1RlwiLFwicXVvdFwiOlwiXFxcIlwiLFwiUVVPVFwiOlwiXFxcIlwiLFwickFhcnJcIjpcIlxcdTIxREJcIixcInJhY2VcIjpcIlxcdTIyM0RcXHUwMzMxXCIsXCJSYWN1dGVcIjpcIlxcdTAxNTRcIixcInJhY3V0ZVwiOlwiXFx1MDE1NVwiLFwicmFkaWNcIjpcIlxcdTIyMUFcIixcInJhZW1wdHl2XCI6XCJcXHUyOUIzXCIsXCJyYW5nXCI6XCJcXHUyN0U5XCIsXCJSYW5nXCI6XCJcXHUyN0VCXCIsXCJyYW5nZFwiOlwiXFx1Mjk5MlwiLFwicmFuZ2VcIjpcIlxcdTI5QTVcIixcInJhbmdsZVwiOlwiXFx1MjdFOVwiLFwicmFxdW9cIjpcIlxcdTAwQkJcIixcInJhcnJhcFwiOlwiXFx1Mjk3NVwiLFwicmFycmJcIjpcIlxcdTIxRTVcIixcInJhcnJiZnNcIjpcIlxcdTI5MjBcIixcInJhcnJjXCI6XCJcXHUyOTMzXCIsXCJyYXJyXCI6XCJcXHUyMTkyXCIsXCJSYXJyXCI6XCJcXHUyMUEwXCIsXCJyQXJyXCI6XCJcXHUyMUQyXCIsXCJyYXJyZnNcIjpcIlxcdTI5MUVcIixcInJhcnJoa1wiOlwiXFx1MjFBQVwiLFwicmFycmxwXCI6XCJcXHUyMUFDXCIsXCJyYXJycGxcIjpcIlxcdTI5NDVcIixcInJhcnJzaW1cIjpcIlxcdTI5NzRcIixcIlJhcnJ0bFwiOlwiXFx1MjkxNlwiLFwicmFycnRsXCI6XCJcXHUyMUEzXCIsXCJyYXJyd1wiOlwiXFx1MjE5RFwiLFwicmF0YWlsXCI6XCJcXHUyOTFBXCIsXCJyQXRhaWxcIjpcIlxcdTI5MUNcIixcInJhdGlvXCI6XCJcXHUyMjM2XCIsXCJyYXRpb25hbHNcIjpcIlxcdTIxMUFcIixcInJiYXJyXCI6XCJcXHUyOTBEXCIsXCJyQmFyclwiOlwiXFx1MjkwRlwiLFwiUkJhcnJcIjpcIlxcdTI5MTBcIixcInJiYnJrXCI6XCJcXHUyNzczXCIsXCJyYnJhY2VcIjpcIn1cIixcInJicmFja1wiOlwiXVwiLFwicmJya2VcIjpcIlxcdTI5OENcIixcInJicmtzbGRcIjpcIlxcdTI5OEVcIixcInJicmtzbHVcIjpcIlxcdTI5OTBcIixcIlJjYXJvblwiOlwiXFx1MDE1OFwiLFwicmNhcm9uXCI6XCJcXHUwMTU5XCIsXCJSY2VkaWxcIjpcIlxcdTAxNTZcIixcInJjZWRpbFwiOlwiXFx1MDE1N1wiLFwicmNlaWxcIjpcIlxcdTIzMDlcIixcInJjdWJcIjpcIn1cIixcIlJjeVwiOlwiXFx1MDQyMFwiLFwicmN5XCI6XCJcXHUwNDQwXCIsXCJyZGNhXCI6XCJcXHUyOTM3XCIsXCJyZGxkaGFyXCI6XCJcXHUyOTY5XCIsXCJyZHF1b1wiOlwiXFx1MjAxRFwiLFwicmRxdW9yXCI6XCJcXHUyMDFEXCIsXCJyZHNoXCI6XCJcXHUyMUIzXCIsXCJyZWFsXCI6XCJcXHUyMTFDXCIsXCJyZWFsaW5lXCI6XCJcXHUyMTFCXCIsXCJyZWFscGFydFwiOlwiXFx1MjExQ1wiLFwicmVhbHNcIjpcIlxcdTIxMURcIixcIlJlXCI6XCJcXHUyMTFDXCIsXCJyZWN0XCI6XCJcXHUyNUFEXCIsXCJyZWdcIjpcIlxcdTAwQUVcIixcIlJFR1wiOlwiXFx1MDBBRVwiLFwiUmV2ZXJzZUVsZW1lbnRcIjpcIlxcdTIyMEJcIixcIlJldmVyc2VFcXVpbGlicml1bVwiOlwiXFx1MjFDQlwiLFwiUmV2ZXJzZVVwRXF1aWxpYnJpdW1cIjpcIlxcdTI5NkZcIixcInJmaXNodFwiOlwiXFx1Mjk3RFwiLFwicmZsb29yXCI6XCJcXHUyMzBCXCIsXCJyZnJcIjpcIlxcdUQ4MzVcXHVERDJGXCIsXCJSZnJcIjpcIlxcdTIxMUNcIixcInJIYXJcIjpcIlxcdTI5NjRcIixcInJoYXJkXCI6XCJcXHUyMUMxXCIsXCJyaGFydVwiOlwiXFx1MjFDMFwiLFwicmhhcnVsXCI6XCJcXHUyOTZDXCIsXCJSaG9cIjpcIlxcdTAzQTFcIixcInJob1wiOlwiXFx1MDNDMVwiLFwicmhvdlwiOlwiXFx1MDNGMVwiLFwiUmlnaHRBbmdsZUJyYWNrZXRcIjpcIlxcdTI3RTlcIixcIlJpZ2h0QXJyb3dCYXJcIjpcIlxcdTIxRTVcIixcInJpZ2h0YXJyb3dcIjpcIlxcdTIxOTJcIixcIlJpZ2h0QXJyb3dcIjpcIlxcdTIxOTJcIixcIlJpZ2h0YXJyb3dcIjpcIlxcdTIxRDJcIixcIlJpZ2h0QXJyb3dMZWZ0QXJyb3dcIjpcIlxcdTIxQzRcIixcInJpZ2h0YXJyb3d0YWlsXCI6XCJcXHUyMUEzXCIsXCJSaWdodENlaWxpbmdcIjpcIlxcdTIzMDlcIixcIlJpZ2h0RG91YmxlQnJhY2tldFwiOlwiXFx1MjdFN1wiLFwiUmlnaHREb3duVGVlVmVjdG9yXCI6XCJcXHUyOTVEXCIsXCJSaWdodERvd25WZWN0b3JCYXJcIjpcIlxcdTI5NTVcIixcIlJpZ2h0RG93blZlY3RvclwiOlwiXFx1MjFDMlwiLFwiUmlnaHRGbG9vclwiOlwiXFx1MjMwQlwiLFwicmlnaHRoYXJwb29uZG93blwiOlwiXFx1MjFDMVwiLFwicmlnaHRoYXJwb29udXBcIjpcIlxcdTIxQzBcIixcInJpZ2h0bGVmdGFycm93c1wiOlwiXFx1MjFDNFwiLFwicmlnaHRsZWZ0aGFycG9vbnNcIjpcIlxcdTIxQ0NcIixcInJpZ2h0cmlnaHRhcnJvd3NcIjpcIlxcdTIxQzlcIixcInJpZ2h0c3F1aWdhcnJvd1wiOlwiXFx1MjE5RFwiLFwiUmlnaHRUZWVBcnJvd1wiOlwiXFx1MjFBNlwiLFwiUmlnaHRUZWVcIjpcIlxcdTIyQTJcIixcIlJpZ2h0VGVlVmVjdG9yXCI6XCJcXHUyOTVCXCIsXCJyaWdodHRocmVldGltZXNcIjpcIlxcdTIyQ0NcIixcIlJpZ2h0VHJpYW5nbGVCYXJcIjpcIlxcdTI5RDBcIixcIlJpZ2h0VHJpYW5nbGVcIjpcIlxcdTIyQjNcIixcIlJpZ2h0VHJpYW5nbGVFcXVhbFwiOlwiXFx1MjJCNVwiLFwiUmlnaHRVcERvd25WZWN0b3JcIjpcIlxcdTI5NEZcIixcIlJpZ2h0VXBUZWVWZWN0b3JcIjpcIlxcdTI5NUNcIixcIlJpZ2h0VXBWZWN0b3JCYXJcIjpcIlxcdTI5NTRcIixcIlJpZ2h0VXBWZWN0b3JcIjpcIlxcdTIxQkVcIixcIlJpZ2h0VmVjdG9yQmFyXCI6XCJcXHUyOTUzXCIsXCJSaWdodFZlY3RvclwiOlwiXFx1MjFDMFwiLFwicmluZ1wiOlwiXFx1MDJEQVwiLFwicmlzaW5nZG90c2VxXCI6XCJcXHUyMjUzXCIsXCJybGFyclwiOlwiXFx1MjFDNFwiLFwicmxoYXJcIjpcIlxcdTIxQ0NcIixcInJsbVwiOlwiXFx1MjAwRlwiLFwicm1vdXN0YWNoZVwiOlwiXFx1MjNCMVwiLFwicm1vdXN0XCI6XCJcXHUyM0IxXCIsXCJybm1pZFwiOlwiXFx1MkFFRVwiLFwicm9hbmdcIjpcIlxcdTI3RURcIixcInJvYXJyXCI6XCJcXHUyMUZFXCIsXCJyb2Jya1wiOlwiXFx1MjdFN1wiLFwicm9wYXJcIjpcIlxcdTI5ODZcIixcInJvcGZcIjpcIlxcdUQ4MzVcXHVERDYzXCIsXCJSb3BmXCI6XCJcXHUyMTFEXCIsXCJyb3BsdXNcIjpcIlxcdTJBMkVcIixcInJvdGltZXNcIjpcIlxcdTJBMzVcIixcIlJvdW5kSW1wbGllc1wiOlwiXFx1Mjk3MFwiLFwicnBhclwiOlwiKVwiLFwicnBhcmd0XCI6XCJcXHUyOTk0XCIsXCJycHBvbGludFwiOlwiXFx1MkExMlwiLFwicnJhcnJcIjpcIlxcdTIxQzlcIixcIlJyaWdodGFycm93XCI6XCJcXHUyMURCXCIsXCJyc2FxdW9cIjpcIlxcdTIwM0FcIixcInJzY3JcIjpcIlxcdUQ4MzVcXHVEQ0M3XCIsXCJSc2NyXCI6XCJcXHUyMTFCXCIsXCJyc2hcIjpcIlxcdTIxQjFcIixcIlJzaFwiOlwiXFx1MjFCMVwiLFwicnNxYlwiOlwiXVwiLFwicnNxdW9cIjpcIlxcdTIwMTlcIixcInJzcXVvclwiOlwiXFx1MjAxOVwiLFwicnRocmVlXCI6XCJcXHUyMkNDXCIsXCJydGltZXNcIjpcIlxcdTIyQ0FcIixcInJ0cmlcIjpcIlxcdTI1QjlcIixcInJ0cmllXCI6XCJcXHUyMkI1XCIsXCJydHJpZlwiOlwiXFx1MjVCOFwiLFwicnRyaWx0cmlcIjpcIlxcdTI5Q0VcIixcIlJ1bGVEZWxheWVkXCI6XCJcXHUyOUY0XCIsXCJydWx1aGFyXCI6XCJcXHUyOTY4XCIsXCJyeFwiOlwiXFx1MjExRVwiLFwiU2FjdXRlXCI6XCJcXHUwMTVBXCIsXCJzYWN1dGVcIjpcIlxcdTAxNUJcIixcInNicXVvXCI6XCJcXHUyMDFBXCIsXCJzY2FwXCI6XCJcXHUyQUI4XCIsXCJTY2Fyb25cIjpcIlxcdTAxNjBcIixcInNjYXJvblwiOlwiXFx1MDE2MVwiLFwiU2NcIjpcIlxcdTJBQkNcIixcInNjXCI6XCJcXHUyMjdCXCIsXCJzY2N1ZVwiOlwiXFx1MjI3RFwiLFwic2NlXCI6XCJcXHUyQUIwXCIsXCJzY0VcIjpcIlxcdTJBQjRcIixcIlNjZWRpbFwiOlwiXFx1MDE1RVwiLFwic2NlZGlsXCI6XCJcXHUwMTVGXCIsXCJTY2lyY1wiOlwiXFx1MDE1Q1wiLFwic2NpcmNcIjpcIlxcdTAxNURcIixcInNjbmFwXCI6XCJcXHUyQUJBXCIsXCJzY25FXCI6XCJcXHUyQUI2XCIsXCJzY25zaW1cIjpcIlxcdTIyRTlcIixcInNjcG9saW50XCI6XCJcXHUyQTEzXCIsXCJzY3NpbVwiOlwiXFx1MjI3RlwiLFwiU2N5XCI6XCJcXHUwNDIxXCIsXCJzY3lcIjpcIlxcdTA0NDFcIixcInNkb3RiXCI6XCJcXHUyMkExXCIsXCJzZG90XCI6XCJcXHUyMkM1XCIsXCJzZG90ZVwiOlwiXFx1MkE2NlwiLFwic2VhcmhrXCI6XCJcXHUyOTI1XCIsXCJzZWFyclwiOlwiXFx1MjE5OFwiLFwic2VBcnJcIjpcIlxcdTIxRDhcIixcInNlYXJyb3dcIjpcIlxcdTIxOThcIixcInNlY3RcIjpcIlxcdTAwQTdcIixcInNlbWlcIjpcIjtcIixcInNlc3dhclwiOlwiXFx1MjkyOVwiLFwic2V0bWludXNcIjpcIlxcdTIyMTZcIixcInNldG1uXCI6XCJcXHUyMjE2XCIsXCJzZXh0XCI6XCJcXHUyNzM2XCIsXCJTZnJcIjpcIlxcdUQ4MzVcXHVERDE2XCIsXCJzZnJcIjpcIlxcdUQ4MzVcXHVERDMwXCIsXCJzZnJvd25cIjpcIlxcdTIzMjJcIixcInNoYXJwXCI6XCJcXHUyNjZGXCIsXCJTSENIY3lcIjpcIlxcdTA0MjlcIixcInNoY2hjeVwiOlwiXFx1MDQ0OVwiLFwiU0hjeVwiOlwiXFx1MDQyOFwiLFwic2hjeVwiOlwiXFx1MDQ0OFwiLFwiU2hvcnREb3duQXJyb3dcIjpcIlxcdTIxOTNcIixcIlNob3J0TGVmdEFycm93XCI6XCJcXHUyMTkwXCIsXCJzaG9ydG1pZFwiOlwiXFx1MjIyM1wiLFwic2hvcnRwYXJhbGxlbFwiOlwiXFx1MjIyNVwiLFwiU2hvcnRSaWdodEFycm93XCI6XCJcXHUyMTkyXCIsXCJTaG9ydFVwQXJyb3dcIjpcIlxcdTIxOTFcIixcInNoeVwiOlwiXFx1MDBBRFwiLFwiU2lnbWFcIjpcIlxcdTAzQTNcIixcInNpZ21hXCI6XCJcXHUwM0MzXCIsXCJzaWdtYWZcIjpcIlxcdTAzQzJcIixcInNpZ21hdlwiOlwiXFx1MDNDMlwiLFwic2ltXCI6XCJcXHUyMjNDXCIsXCJzaW1kb3RcIjpcIlxcdTJBNkFcIixcInNpbWVcIjpcIlxcdTIyNDNcIixcInNpbWVxXCI6XCJcXHUyMjQzXCIsXCJzaW1nXCI6XCJcXHUyQTlFXCIsXCJzaW1nRVwiOlwiXFx1MkFBMFwiLFwic2ltbFwiOlwiXFx1MkE5RFwiLFwic2ltbEVcIjpcIlxcdTJBOUZcIixcInNpbW5lXCI6XCJcXHUyMjQ2XCIsXCJzaW1wbHVzXCI6XCJcXHUyQTI0XCIsXCJzaW1yYXJyXCI6XCJcXHUyOTcyXCIsXCJzbGFyclwiOlwiXFx1MjE5MFwiLFwiU21hbGxDaXJjbGVcIjpcIlxcdTIyMThcIixcInNtYWxsc2V0bWludXNcIjpcIlxcdTIyMTZcIixcInNtYXNocFwiOlwiXFx1MkEzM1wiLFwic21lcGFyc2xcIjpcIlxcdTI5RTRcIixcInNtaWRcIjpcIlxcdTIyMjNcIixcInNtaWxlXCI6XCJcXHUyMzIzXCIsXCJzbXRcIjpcIlxcdTJBQUFcIixcInNtdGVcIjpcIlxcdTJBQUNcIixcInNtdGVzXCI6XCJcXHUyQUFDXFx1RkUwMFwiLFwiU09GVGN5XCI6XCJcXHUwNDJDXCIsXCJzb2Z0Y3lcIjpcIlxcdTA0NENcIixcInNvbGJhclwiOlwiXFx1MjMzRlwiLFwic29sYlwiOlwiXFx1MjlDNFwiLFwic29sXCI6XCIvXCIsXCJTb3BmXCI6XCJcXHVEODM1XFx1REQ0QVwiLFwic29wZlwiOlwiXFx1RDgzNVxcdURENjRcIixcInNwYWRlc1wiOlwiXFx1MjY2MFwiLFwic3BhZGVzdWl0XCI6XCJcXHUyNjYwXCIsXCJzcGFyXCI6XCJcXHUyMjI1XCIsXCJzcWNhcFwiOlwiXFx1MjI5M1wiLFwic3FjYXBzXCI6XCJcXHUyMjkzXFx1RkUwMFwiLFwic3FjdXBcIjpcIlxcdTIyOTRcIixcInNxY3Vwc1wiOlwiXFx1MjI5NFxcdUZFMDBcIixcIlNxcnRcIjpcIlxcdTIyMUFcIixcInNxc3ViXCI6XCJcXHUyMjhGXCIsXCJzcXN1YmVcIjpcIlxcdTIyOTFcIixcInNxc3Vic2V0XCI6XCJcXHUyMjhGXCIsXCJzcXN1YnNldGVxXCI6XCJcXHUyMjkxXCIsXCJzcXN1cFwiOlwiXFx1MjI5MFwiLFwic3FzdXBlXCI6XCJcXHUyMjkyXCIsXCJzcXN1cHNldFwiOlwiXFx1MjI5MFwiLFwic3FzdXBzZXRlcVwiOlwiXFx1MjI5MlwiLFwic3F1YXJlXCI6XCJcXHUyNUExXCIsXCJTcXVhcmVcIjpcIlxcdTI1QTFcIixcIlNxdWFyZUludGVyc2VjdGlvblwiOlwiXFx1MjI5M1wiLFwiU3F1YXJlU3Vic2V0XCI6XCJcXHUyMjhGXCIsXCJTcXVhcmVTdWJzZXRFcXVhbFwiOlwiXFx1MjI5MVwiLFwiU3F1YXJlU3VwZXJzZXRcIjpcIlxcdTIyOTBcIixcIlNxdWFyZVN1cGVyc2V0RXF1YWxcIjpcIlxcdTIyOTJcIixcIlNxdWFyZVVuaW9uXCI6XCJcXHUyMjk0XCIsXCJzcXVhcmZcIjpcIlxcdTI1QUFcIixcInNxdVwiOlwiXFx1MjVBMVwiLFwic3F1ZlwiOlwiXFx1MjVBQVwiLFwic3JhcnJcIjpcIlxcdTIxOTJcIixcIlNzY3JcIjpcIlxcdUQ4MzVcXHVEQ0FFXCIsXCJzc2NyXCI6XCJcXHVEODM1XFx1RENDOFwiLFwic3NldG1uXCI6XCJcXHUyMjE2XCIsXCJzc21pbGVcIjpcIlxcdTIzMjNcIixcInNzdGFyZlwiOlwiXFx1MjJDNlwiLFwiU3RhclwiOlwiXFx1MjJDNlwiLFwic3RhclwiOlwiXFx1MjYwNlwiLFwic3RhcmZcIjpcIlxcdTI2MDVcIixcInN0cmFpZ2h0ZXBzaWxvblwiOlwiXFx1MDNGNVwiLFwic3RyYWlnaHRwaGlcIjpcIlxcdTAzRDVcIixcInN0cm5zXCI6XCJcXHUwMEFGXCIsXCJzdWJcIjpcIlxcdTIyODJcIixcIlN1YlwiOlwiXFx1MjJEMFwiLFwic3ViZG90XCI6XCJcXHUyQUJEXCIsXCJzdWJFXCI6XCJcXHUyQUM1XCIsXCJzdWJlXCI6XCJcXHUyMjg2XCIsXCJzdWJlZG90XCI6XCJcXHUyQUMzXCIsXCJzdWJtdWx0XCI6XCJcXHUyQUMxXCIsXCJzdWJuRVwiOlwiXFx1MkFDQlwiLFwic3VibmVcIjpcIlxcdTIyOEFcIixcInN1YnBsdXNcIjpcIlxcdTJBQkZcIixcInN1YnJhcnJcIjpcIlxcdTI5NzlcIixcInN1YnNldFwiOlwiXFx1MjI4MlwiLFwiU3Vic2V0XCI6XCJcXHUyMkQwXCIsXCJzdWJzZXRlcVwiOlwiXFx1MjI4NlwiLFwic3Vic2V0ZXFxXCI6XCJcXHUyQUM1XCIsXCJTdWJzZXRFcXVhbFwiOlwiXFx1MjI4NlwiLFwic3Vic2V0bmVxXCI6XCJcXHUyMjhBXCIsXCJzdWJzZXRuZXFxXCI6XCJcXHUyQUNCXCIsXCJzdWJzaW1cIjpcIlxcdTJBQzdcIixcInN1YnN1YlwiOlwiXFx1MkFENVwiLFwic3Vic3VwXCI6XCJcXHUyQUQzXCIsXCJzdWNjYXBwcm94XCI6XCJcXHUyQUI4XCIsXCJzdWNjXCI6XCJcXHUyMjdCXCIsXCJzdWNjY3VybHllcVwiOlwiXFx1MjI3RFwiLFwiU3VjY2VlZHNcIjpcIlxcdTIyN0JcIixcIlN1Y2NlZWRzRXF1YWxcIjpcIlxcdTJBQjBcIixcIlN1Y2NlZWRzU2xhbnRFcXVhbFwiOlwiXFx1MjI3RFwiLFwiU3VjY2VlZHNUaWxkZVwiOlwiXFx1MjI3RlwiLFwic3VjY2VxXCI6XCJcXHUyQUIwXCIsXCJzdWNjbmFwcHJveFwiOlwiXFx1MkFCQVwiLFwic3VjY25lcXFcIjpcIlxcdTJBQjZcIixcInN1Y2Nuc2ltXCI6XCJcXHUyMkU5XCIsXCJzdWNjc2ltXCI6XCJcXHUyMjdGXCIsXCJTdWNoVGhhdFwiOlwiXFx1MjIwQlwiLFwic3VtXCI6XCJcXHUyMjExXCIsXCJTdW1cIjpcIlxcdTIyMTFcIixcInN1bmdcIjpcIlxcdTI2NkFcIixcInN1cDFcIjpcIlxcdTAwQjlcIixcInN1cDJcIjpcIlxcdTAwQjJcIixcInN1cDNcIjpcIlxcdTAwQjNcIixcInN1cFwiOlwiXFx1MjI4M1wiLFwiU3VwXCI6XCJcXHUyMkQxXCIsXCJzdXBkb3RcIjpcIlxcdTJBQkVcIixcInN1cGRzdWJcIjpcIlxcdTJBRDhcIixcInN1cEVcIjpcIlxcdTJBQzZcIixcInN1cGVcIjpcIlxcdTIyODdcIixcInN1cGVkb3RcIjpcIlxcdTJBQzRcIixcIlN1cGVyc2V0XCI6XCJcXHUyMjgzXCIsXCJTdXBlcnNldEVxdWFsXCI6XCJcXHUyMjg3XCIsXCJzdXBoc29sXCI6XCJcXHUyN0M5XCIsXCJzdXBoc3ViXCI6XCJcXHUyQUQ3XCIsXCJzdXBsYXJyXCI6XCJcXHUyOTdCXCIsXCJzdXBtdWx0XCI6XCJcXHUyQUMyXCIsXCJzdXBuRVwiOlwiXFx1MkFDQ1wiLFwic3VwbmVcIjpcIlxcdTIyOEJcIixcInN1cHBsdXNcIjpcIlxcdTJBQzBcIixcInN1cHNldFwiOlwiXFx1MjI4M1wiLFwiU3Vwc2V0XCI6XCJcXHUyMkQxXCIsXCJzdXBzZXRlcVwiOlwiXFx1MjI4N1wiLFwic3Vwc2V0ZXFxXCI6XCJcXHUyQUM2XCIsXCJzdXBzZXRuZXFcIjpcIlxcdTIyOEJcIixcInN1cHNldG5lcXFcIjpcIlxcdTJBQ0NcIixcInN1cHNpbVwiOlwiXFx1MkFDOFwiLFwic3Vwc3ViXCI6XCJcXHUyQUQ0XCIsXCJzdXBzdXBcIjpcIlxcdTJBRDZcIixcInN3YXJoa1wiOlwiXFx1MjkyNlwiLFwic3dhcnJcIjpcIlxcdTIxOTlcIixcInN3QXJyXCI6XCJcXHUyMUQ5XCIsXCJzd2Fycm93XCI6XCJcXHUyMTk5XCIsXCJzd253YXJcIjpcIlxcdTI5MkFcIixcInN6bGlnXCI6XCJcXHUwMERGXCIsXCJUYWJcIjpcIlxcdFwiLFwidGFyZ2V0XCI6XCJcXHUyMzE2XCIsXCJUYXVcIjpcIlxcdTAzQTRcIixcInRhdVwiOlwiXFx1MDNDNFwiLFwidGJya1wiOlwiXFx1MjNCNFwiLFwiVGNhcm9uXCI6XCJcXHUwMTY0XCIsXCJ0Y2Fyb25cIjpcIlxcdTAxNjVcIixcIlRjZWRpbFwiOlwiXFx1MDE2MlwiLFwidGNlZGlsXCI6XCJcXHUwMTYzXCIsXCJUY3lcIjpcIlxcdTA0MjJcIixcInRjeVwiOlwiXFx1MDQ0MlwiLFwidGRvdFwiOlwiXFx1MjBEQlwiLFwidGVscmVjXCI6XCJcXHUyMzE1XCIsXCJUZnJcIjpcIlxcdUQ4MzVcXHVERDE3XCIsXCJ0ZnJcIjpcIlxcdUQ4MzVcXHVERDMxXCIsXCJ0aGVyZTRcIjpcIlxcdTIyMzRcIixcInRoZXJlZm9yZVwiOlwiXFx1MjIzNFwiLFwiVGhlcmVmb3JlXCI6XCJcXHUyMjM0XCIsXCJUaGV0YVwiOlwiXFx1MDM5OFwiLFwidGhldGFcIjpcIlxcdTAzQjhcIixcInRoZXRhc3ltXCI6XCJcXHUwM0QxXCIsXCJ0aGV0YXZcIjpcIlxcdTAzRDFcIixcInRoaWNrYXBwcm94XCI6XCJcXHUyMjQ4XCIsXCJ0aGlja3NpbVwiOlwiXFx1MjIzQ1wiLFwiVGhpY2tTcGFjZVwiOlwiXFx1MjA1RlxcdTIwMEFcIixcIlRoaW5TcGFjZVwiOlwiXFx1MjAwOVwiLFwidGhpbnNwXCI6XCJcXHUyMDA5XCIsXCJ0aGthcFwiOlwiXFx1MjI0OFwiLFwidGhrc2ltXCI6XCJcXHUyMjNDXCIsXCJUSE9STlwiOlwiXFx1MDBERVwiLFwidGhvcm5cIjpcIlxcdTAwRkVcIixcInRpbGRlXCI6XCJcXHUwMkRDXCIsXCJUaWxkZVwiOlwiXFx1MjIzQ1wiLFwiVGlsZGVFcXVhbFwiOlwiXFx1MjI0M1wiLFwiVGlsZGVGdWxsRXF1YWxcIjpcIlxcdTIyNDVcIixcIlRpbGRlVGlsZGVcIjpcIlxcdTIyNDhcIixcInRpbWVzYmFyXCI6XCJcXHUyQTMxXCIsXCJ0aW1lc2JcIjpcIlxcdTIyQTBcIixcInRpbWVzXCI6XCJcXHUwMEQ3XCIsXCJ0aW1lc2RcIjpcIlxcdTJBMzBcIixcInRpbnRcIjpcIlxcdTIyMkRcIixcInRvZWFcIjpcIlxcdTI5MjhcIixcInRvcGJvdFwiOlwiXFx1MjMzNlwiLFwidG9wY2lyXCI6XCJcXHUyQUYxXCIsXCJ0b3BcIjpcIlxcdTIyQTRcIixcIlRvcGZcIjpcIlxcdUQ4MzVcXHVERDRCXCIsXCJ0b3BmXCI6XCJcXHVEODM1XFx1REQ2NVwiLFwidG9wZm9ya1wiOlwiXFx1MkFEQVwiLFwidG9zYVwiOlwiXFx1MjkyOVwiLFwidHByaW1lXCI6XCJcXHUyMDM0XCIsXCJ0cmFkZVwiOlwiXFx1MjEyMlwiLFwiVFJBREVcIjpcIlxcdTIxMjJcIixcInRyaWFuZ2xlXCI6XCJcXHUyNUI1XCIsXCJ0cmlhbmdsZWRvd25cIjpcIlxcdTI1QkZcIixcInRyaWFuZ2xlbGVmdFwiOlwiXFx1MjVDM1wiLFwidHJpYW5nbGVsZWZ0ZXFcIjpcIlxcdTIyQjRcIixcInRyaWFuZ2xlcVwiOlwiXFx1MjI1Q1wiLFwidHJpYW5nbGVyaWdodFwiOlwiXFx1MjVCOVwiLFwidHJpYW5nbGVyaWdodGVxXCI6XCJcXHUyMkI1XCIsXCJ0cmlkb3RcIjpcIlxcdTI1RUNcIixcInRyaWVcIjpcIlxcdTIyNUNcIixcInRyaW1pbnVzXCI6XCJcXHUyQTNBXCIsXCJUcmlwbGVEb3RcIjpcIlxcdTIwREJcIixcInRyaXBsdXNcIjpcIlxcdTJBMzlcIixcInRyaXNiXCI6XCJcXHUyOUNEXCIsXCJ0cml0aW1lXCI6XCJcXHUyQTNCXCIsXCJ0cnBleml1bVwiOlwiXFx1MjNFMlwiLFwiVHNjclwiOlwiXFx1RDgzNVxcdURDQUZcIixcInRzY3JcIjpcIlxcdUQ4MzVcXHVEQ0M5XCIsXCJUU2N5XCI6XCJcXHUwNDI2XCIsXCJ0c2N5XCI6XCJcXHUwNDQ2XCIsXCJUU0hjeVwiOlwiXFx1MDQwQlwiLFwidHNoY3lcIjpcIlxcdTA0NUJcIixcIlRzdHJva1wiOlwiXFx1MDE2NlwiLFwidHN0cm9rXCI6XCJcXHUwMTY3XCIsXCJ0d2l4dFwiOlwiXFx1MjI2Q1wiLFwidHdvaGVhZGxlZnRhcnJvd1wiOlwiXFx1MjE5RVwiLFwidHdvaGVhZHJpZ2h0YXJyb3dcIjpcIlxcdTIxQTBcIixcIlVhY3V0ZVwiOlwiXFx1MDBEQVwiLFwidWFjdXRlXCI6XCJcXHUwMEZBXCIsXCJ1YXJyXCI6XCJcXHUyMTkxXCIsXCJVYXJyXCI6XCJcXHUyMTlGXCIsXCJ1QXJyXCI6XCJcXHUyMUQxXCIsXCJVYXJyb2NpclwiOlwiXFx1Mjk0OVwiLFwiVWJyY3lcIjpcIlxcdTA0MEVcIixcInVicmN5XCI6XCJcXHUwNDVFXCIsXCJVYnJldmVcIjpcIlxcdTAxNkNcIixcInVicmV2ZVwiOlwiXFx1MDE2RFwiLFwiVWNpcmNcIjpcIlxcdTAwREJcIixcInVjaXJjXCI6XCJcXHUwMEZCXCIsXCJVY3lcIjpcIlxcdTA0MjNcIixcInVjeVwiOlwiXFx1MDQ0M1wiLFwidWRhcnJcIjpcIlxcdTIxQzVcIixcIlVkYmxhY1wiOlwiXFx1MDE3MFwiLFwidWRibGFjXCI6XCJcXHUwMTcxXCIsXCJ1ZGhhclwiOlwiXFx1Mjk2RVwiLFwidWZpc2h0XCI6XCJcXHUyOTdFXCIsXCJVZnJcIjpcIlxcdUQ4MzVcXHVERDE4XCIsXCJ1ZnJcIjpcIlxcdUQ4MzVcXHVERDMyXCIsXCJVZ3JhdmVcIjpcIlxcdTAwRDlcIixcInVncmF2ZVwiOlwiXFx1MDBGOVwiLFwidUhhclwiOlwiXFx1Mjk2M1wiLFwidWhhcmxcIjpcIlxcdTIxQkZcIixcInVoYXJyXCI6XCJcXHUyMUJFXCIsXCJ1aGJsa1wiOlwiXFx1MjU4MFwiLFwidWxjb3JuXCI6XCJcXHUyMzFDXCIsXCJ1bGNvcm5lclwiOlwiXFx1MjMxQ1wiLFwidWxjcm9wXCI6XCJcXHUyMzBGXCIsXCJ1bHRyaVwiOlwiXFx1MjVGOFwiLFwiVW1hY3JcIjpcIlxcdTAxNkFcIixcInVtYWNyXCI6XCJcXHUwMTZCXCIsXCJ1bWxcIjpcIlxcdTAwQThcIixcIlVuZGVyQmFyXCI6XCJfXCIsXCJVbmRlckJyYWNlXCI6XCJcXHUyM0RGXCIsXCJVbmRlckJyYWNrZXRcIjpcIlxcdTIzQjVcIixcIlVuZGVyUGFyZW50aGVzaXNcIjpcIlxcdTIzRERcIixcIlVuaW9uXCI6XCJcXHUyMkMzXCIsXCJVbmlvblBsdXNcIjpcIlxcdTIyOEVcIixcIlVvZ29uXCI6XCJcXHUwMTcyXCIsXCJ1b2dvblwiOlwiXFx1MDE3M1wiLFwiVW9wZlwiOlwiXFx1RDgzNVxcdURENENcIixcInVvcGZcIjpcIlxcdUQ4MzVcXHVERDY2XCIsXCJVcEFycm93QmFyXCI6XCJcXHUyOTEyXCIsXCJ1cGFycm93XCI6XCJcXHUyMTkxXCIsXCJVcEFycm93XCI6XCJcXHUyMTkxXCIsXCJVcGFycm93XCI6XCJcXHUyMUQxXCIsXCJVcEFycm93RG93bkFycm93XCI6XCJcXHUyMUM1XCIsXCJ1cGRvd25hcnJvd1wiOlwiXFx1MjE5NVwiLFwiVXBEb3duQXJyb3dcIjpcIlxcdTIxOTVcIixcIlVwZG93bmFycm93XCI6XCJcXHUyMUQ1XCIsXCJVcEVxdWlsaWJyaXVtXCI6XCJcXHUyOTZFXCIsXCJ1cGhhcnBvb25sZWZ0XCI6XCJcXHUyMUJGXCIsXCJ1cGhhcnBvb25yaWdodFwiOlwiXFx1MjFCRVwiLFwidXBsdXNcIjpcIlxcdTIyOEVcIixcIlVwcGVyTGVmdEFycm93XCI6XCJcXHUyMTk2XCIsXCJVcHBlclJpZ2h0QXJyb3dcIjpcIlxcdTIxOTdcIixcInVwc2lcIjpcIlxcdTAzQzVcIixcIlVwc2lcIjpcIlxcdTAzRDJcIixcInVwc2loXCI6XCJcXHUwM0QyXCIsXCJVcHNpbG9uXCI6XCJcXHUwM0E1XCIsXCJ1cHNpbG9uXCI6XCJcXHUwM0M1XCIsXCJVcFRlZUFycm93XCI6XCJcXHUyMUE1XCIsXCJVcFRlZVwiOlwiXFx1MjJBNVwiLFwidXB1cGFycm93c1wiOlwiXFx1MjFDOFwiLFwidXJjb3JuXCI6XCJcXHUyMzFEXCIsXCJ1cmNvcm5lclwiOlwiXFx1MjMxRFwiLFwidXJjcm9wXCI6XCJcXHUyMzBFXCIsXCJVcmluZ1wiOlwiXFx1MDE2RVwiLFwidXJpbmdcIjpcIlxcdTAxNkZcIixcInVydHJpXCI6XCJcXHUyNUY5XCIsXCJVc2NyXCI6XCJcXHVEODM1XFx1RENCMFwiLFwidXNjclwiOlwiXFx1RDgzNVxcdURDQ0FcIixcInV0ZG90XCI6XCJcXHUyMkYwXCIsXCJVdGlsZGVcIjpcIlxcdTAxNjhcIixcInV0aWxkZVwiOlwiXFx1MDE2OVwiLFwidXRyaVwiOlwiXFx1MjVCNVwiLFwidXRyaWZcIjpcIlxcdTI1QjRcIixcInV1YXJyXCI6XCJcXHUyMUM4XCIsXCJVdW1sXCI6XCJcXHUwMERDXCIsXCJ1dW1sXCI6XCJcXHUwMEZDXCIsXCJ1d2FuZ2xlXCI6XCJcXHUyOUE3XCIsXCJ2YW5ncnRcIjpcIlxcdTI5OUNcIixcInZhcmVwc2lsb25cIjpcIlxcdTAzRjVcIixcInZhcmthcHBhXCI6XCJcXHUwM0YwXCIsXCJ2YXJub3RoaW5nXCI6XCJcXHUyMjA1XCIsXCJ2YXJwaGlcIjpcIlxcdTAzRDVcIixcInZhcnBpXCI6XCJcXHUwM0Q2XCIsXCJ2YXJwcm9wdG9cIjpcIlxcdTIyMURcIixcInZhcnJcIjpcIlxcdTIxOTVcIixcInZBcnJcIjpcIlxcdTIxRDVcIixcInZhcnJob1wiOlwiXFx1MDNGMVwiLFwidmFyc2lnbWFcIjpcIlxcdTAzQzJcIixcInZhcnN1YnNldG5lcVwiOlwiXFx1MjI4QVxcdUZFMDBcIixcInZhcnN1YnNldG5lcXFcIjpcIlxcdTJBQ0JcXHVGRTAwXCIsXCJ2YXJzdXBzZXRuZXFcIjpcIlxcdTIyOEJcXHVGRTAwXCIsXCJ2YXJzdXBzZXRuZXFxXCI6XCJcXHUyQUNDXFx1RkUwMFwiLFwidmFydGhldGFcIjpcIlxcdTAzRDFcIixcInZhcnRyaWFuZ2xlbGVmdFwiOlwiXFx1MjJCMlwiLFwidmFydHJpYW5nbGVyaWdodFwiOlwiXFx1MjJCM1wiLFwidkJhclwiOlwiXFx1MkFFOFwiLFwiVmJhclwiOlwiXFx1MkFFQlwiLFwidkJhcnZcIjpcIlxcdTJBRTlcIixcIlZjeVwiOlwiXFx1MDQxMlwiLFwidmN5XCI6XCJcXHUwNDMyXCIsXCJ2ZGFzaFwiOlwiXFx1MjJBMlwiLFwidkRhc2hcIjpcIlxcdTIyQThcIixcIlZkYXNoXCI6XCJcXHUyMkE5XCIsXCJWRGFzaFwiOlwiXFx1MjJBQlwiLFwiVmRhc2hsXCI6XCJcXHUyQUU2XCIsXCJ2ZWViYXJcIjpcIlxcdTIyQkJcIixcInZlZVwiOlwiXFx1MjIyOFwiLFwiVmVlXCI6XCJcXHUyMkMxXCIsXCJ2ZWVlcVwiOlwiXFx1MjI1QVwiLFwidmVsbGlwXCI6XCJcXHUyMkVFXCIsXCJ2ZXJiYXJcIjpcInxcIixcIlZlcmJhclwiOlwiXFx1MjAxNlwiLFwidmVydFwiOlwifFwiLFwiVmVydFwiOlwiXFx1MjAxNlwiLFwiVmVydGljYWxCYXJcIjpcIlxcdTIyMjNcIixcIlZlcnRpY2FsTGluZVwiOlwifFwiLFwiVmVydGljYWxTZXBhcmF0b3JcIjpcIlxcdTI3NThcIixcIlZlcnRpY2FsVGlsZGVcIjpcIlxcdTIyNDBcIixcIlZlcnlUaGluU3BhY2VcIjpcIlxcdTIwMEFcIixcIlZmclwiOlwiXFx1RDgzNVxcdUREMTlcIixcInZmclwiOlwiXFx1RDgzNVxcdUREMzNcIixcInZsdHJpXCI6XCJcXHUyMkIyXCIsXCJ2bnN1YlwiOlwiXFx1MjI4MlxcdTIwRDJcIixcInZuc3VwXCI6XCJcXHUyMjgzXFx1MjBEMlwiLFwiVm9wZlwiOlwiXFx1RDgzNVxcdURENERcIixcInZvcGZcIjpcIlxcdUQ4MzVcXHVERDY3XCIsXCJ2cHJvcFwiOlwiXFx1MjIxRFwiLFwidnJ0cmlcIjpcIlxcdTIyQjNcIixcIlZzY3JcIjpcIlxcdUQ4MzVcXHVEQ0IxXCIsXCJ2c2NyXCI6XCJcXHVEODM1XFx1RENDQlwiLFwidnN1Ym5FXCI6XCJcXHUyQUNCXFx1RkUwMFwiLFwidnN1Ym5lXCI6XCJcXHUyMjhBXFx1RkUwMFwiLFwidnN1cG5FXCI6XCJcXHUyQUNDXFx1RkUwMFwiLFwidnN1cG5lXCI6XCJcXHUyMjhCXFx1RkUwMFwiLFwiVnZkYXNoXCI6XCJcXHUyMkFBXCIsXCJ2emlnemFnXCI6XCJcXHUyOTlBXCIsXCJXY2lyY1wiOlwiXFx1MDE3NFwiLFwid2NpcmNcIjpcIlxcdTAxNzVcIixcIndlZGJhclwiOlwiXFx1MkE1RlwiLFwid2VkZ2VcIjpcIlxcdTIyMjdcIixcIldlZGdlXCI6XCJcXHUyMkMwXCIsXCJ3ZWRnZXFcIjpcIlxcdTIyNTlcIixcIndlaWVycFwiOlwiXFx1MjExOFwiLFwiV2ZyXCI6XCJcXHVEODM1XFx1REQxQVwiLFwid2ZyXCI6XCJcXHVEODM1XFx1REQzNFwiLFwiV29wZlwiOlwiXFx1RDgzNVxcdURENEVcIixcIndvcGZcIjpcIlxcdUQ4MzVcXHVERDY4XCIsXCJ3cFwiOlwiXFx1MjExOFwiLFwid3JcIjpcIlxcdTIyNDBcIixcIndyZWF0aFwiOlwiXFx1MjI0MFwiLFwiV3NjclwiOlwiXFx1RDgzNVxcdURDQjJcIixcIndzY3JcIjpcIlxcdUQ4MzVcXHVEQ0NDXCIsXCJ4Y2FwXCI6XCJcXHUyMkMyXCIsXCJ4Y2lyY1wiOlwiXFx1MjVFRlwiLFwieGN1cFwiOlwiXFx1MjJDM1wiLFwieGR0cmlcIjpcIlxcdTI1QkRcIixcIlhmclwiOlwiXFx1RDgzNVxcdUREMUJcIixcInhmclwiOlwiXFx1RDgzNVxcdUREMzVcIixcInhoYXJyXCI6XCJcXHUyN0Y3XCIsXCJ4aEFyclwiOlwiXFx1MjdGQVwiLFwiWGlcIjpcIlxcdTAzOUVcIixcInhpXCI6XCJcXHUwM0JFXCIsXCJ4bGFyclwiOlwiXFx1MjdGNVwiLFwieGxBcnJcIjpcIlxcdTI3RjhcIixcInhtYXBcIjpcIlxcdTI3RkNcIixcInhuaXNcIjpcIlxcdTIyRkJcIixcInhvZG90XCI6XCJcXHUyQTAwXCIsXCJYb3BmXCI6XCJcXHVEODM1XFx1REQ0RlwiLFwieG9wZlwiOlwiXFx1RDgzNVxcdURENjlcIixcInhvcGx1c1wiOlwiXFx1MkEwMVwiLFwieG90aW1lXCI6XCJcXHUyQTAyXCIsXCJ4cmFyclwiOlwiXFx1MjdGNlwiLFwieHJBcnJcIjpcIlxcdTI3RjlcIixcIlhzY3JcIjpcIlxcdUQ4MzVcXHVEQ0IzXCIsXCJ4c2NyXCI6XCJcXHVEODM1XFx1RENDRFwiLFwieHNxY3VwXCI6XCJcXHUyQTA2XCIsXCJ4dXBsdXNcIjpcIlxcdTJBMDRcIixcInh1dHJpXCI6XCJcXHUyNUIzXCIsXCJ4dmVlXCI6XCJcXHUyMkMxXCIsXCJ4d2VkZ2VcIjpcIlxcdTIyQzBcIixcIllhY3V0ZVwiOlwiXFx1MDBERFwiLFwieWFjdXRlXCI6XCJcXHUwMEZEXCIsXCJZQWN5XCI6XCJcXHUwNDJGXCIsXCJ5YWN5XCI6XCJcXHUwNDRGXCIsXCJZY2lyY1wiOlwiXFx1MDE3NlwiLFwieWNpcmNcIjpcIlxcdTAxNzdcIixcIlljeVwiOlwiXFx1MDQyQlwiLFwieWN5XCI6XCJcXHUwNDRCXCIsXCJ5ZW5cIjpcIlxcdTAwQTVcIixcIllmclwiOlwiXFx1RDgzNVxcdUREMUNcIixcInlmclwiOlwiXFx1RDgzNVxcdUREMzZcIixcIllJY3lcIjpcIlxcdTA0MDdcIixcInlpY3lcIjpcIlxcdTA0NTdcIixcIllvcGZcIjpcIlxcdUQ4MzVcXHVERDUwXCIsXCJ5b3BmXCI6XCJcXHVEODM1XFx1REQ2QVwiLFwiWXNjclwiOlwiXFx1RDgzNVxcdURDQjRcIixcInlzY3JcIjpcIlxcdUQ4MzVcXHVEQ0NFXCIsXCJZVWN5XCI6XCJcXHUwNDJFXCIsXCJ5dWN5XCI6XCJcXHUwNDRFXCIsXCJ5dW1sXCI6XCJcXHUwMEZGXCIsXCJZdW1sXCI6XCJcXHUwMTc4XCIsXCJaYWN1dGVcIjpcIlxcdTAxNzlcIixcInphY3V0ZVwiOlwiXFx1MDE3QVwiLFwiWmNhcm9uXCI6XCJcXHUwMTdEXCIsXCJ6Y2Fyb25cIjpcIlxcdTAxN0VcIixcIlpjeVwiOlwiXFx1MDQxN1wiLFwiemN5XCI6XCJcXHUwNDM3XCIsXCJaZG90XCI6XCJcXHUwMTdCXCIsXCJ6ZG90XCI6XCJcXHUwMTdDXCIsXCJ6ZWV0cmZcIjpcIlxcdTIxMjhcIixcIlplcm9XaWR0aFNwYWNlXCI6XCJcXHUyMDBCXCIsXCJaZXRhXCI6XCJcXHUwMzk2XCIsXCJ6ZXRhXCI6XCJcXHUwM0I2XCIsXCJ6ZnJcIjpcIlxcdUQ4MzVcXHVERDM3XCIsXCJaZnJcIjpcIlxcdTIxMjhcIixcIlpIY3lcIjpcIlxcdTA0MTZcIixcInpoY3lcIjpcIlxcdTA0MzZcIixcInppZ3JhcnJcIjpcIlxcdTIxRERcIixcInpvcGZcIjpcIlxcdUQ4MzVcXHVERDZCXCIsXCJab3BmXCI6XCJcXHUyMTI0XCIsXCJac2NyXCI6XCJcXHVEODM1XFx1RENCNVwiLFwienNjclwiOlwiXFx1RDgzNVxcdURDQ0ZcIixcInp3alwiOlwiXFx1MjAwRFwiLFwiendualwiOlwiXFx1MjAwQ1wifSIsIm1vZHVsZS5leHBvcnRzPXtcIkFhY3V0ZVwiOlwiXFx1MDBDMVwiLFwiYWFjdXRlXCI6XCJcXHUwMEUxXCIsXCJBY2lyY1wiOlwiXFx1MDBDMlwiLFwiYWNpcmNcIjpcIlxcdTAwRTJcIixcImFjdXRlXCI6XCJcXHUwMEI0XCIsXCJBRWxpZ1wiOlwiXFx1MDBDNlwiLFwiYWVsaWdcIjpcIlxcdTAwRTZcIixcIkFncmF2ZVwiOlwiXFx1MDBDMFwiLFwiYWdyYXZlXCI6XCJcXHUwMEUwXCIsXCJhbXBcIjpcIiZcIixcIkFNUFwiOlwiJlwiLFwiQXJpbmdcIjpcIlxcdTAwQzVcIixcImFyaW5nXCI6XCJcXHUwMEU1XCIsXCJBdGlsZGVcIjpcIlxcdTAwQzNcIixcImF0aWxkZVwiOlwiXFx1MDBFM1wiLFwiQXVtbFwiOlwiXFx1MDBDNFwiLFwiYXVtbFwiOlwiXFx1MDBFNFwiLFwiYnJ2YmFyXCI6XCJcXHUwMEE2XCIsXCJDY2VkaWxcIjpcIlxcdTAwQzdcIixcImNjZWRpbFwiOlwiXFx1MDBFN1wiLFwiY2VkaWxcIjpcIlxcdTAwQjhcIixcImNlbnRcIjpcIlxcdTAwQTJcIixcImNvcHlcIjpcIlxcdTAwQTlcIixcIkNPUFlcIjpcIlxcdTAwQTlcIixcImN1cnJlblwiOlwiXFx1MDBBNFwiLFwiZGVnXCI6XCJcXHUwMEIwXCIsXCJkaXZpZGVcIjpcIlxcdTAwRjdcIixcIkVhY3V0ZVwiOlwiXFx1MDBDOVwiLFwiZWFjdXRlXCI6XCJcXHUwMEU5XCIsXCJFY2lyY1wiOlwiXFx1MDBDQVwiLFwiZWNpcmNcIjpcIlxcdTAwRUFcIixcIkVncmF2ZVwiOlwiXFx1MDBDOFwiLFwiZWdyYXZlXCI6XCJcXHUwMEU4XCIsXCJFVEhcIjpcIlxcdTAwRDBcIixcImV0aFwiOlwiXFx1MDBGMFwiLFwiRXVtbFwiOlwiXFx1MDBDQlwiLFwiZXVtbFwiOlwiXFx1MDBFQlwiLFwiZnJhYzEyXCI6XCJcXHUwMEJEXCIsXCJmcmFjMTRcIjpcIlxcdTAwQkNcIixcImZyYWMzNFwiOlwiXFx1MDBCRVwiLFwiZ3RcIjpcIj5cIixcIkdUXCI6XCI+XCIsXCJJYWN1dGVcIjpcIlxcdTAwQ0RcIixcImlhY3V0ZVwiOlwiXFx1MDBFRFwiLFwiSWNpcmNcIjpcIlxcdTAwQ0VcIixcImljaXJjXCI6XCJcXHUwMEVFXCIsXCJpZXhjbFwiOlwiXFx1MDBBMVwiLFwiSWdyYXZlXCI6XCJcXHUwMENDXCIsXCJpZ3JhdmVcIjpcIlxcdTAwRUNcIixcImlxdWVzdFwiOlwiXFx1MDBCRlwiLFwiSXVtbFwiOlwiXFx1MDBDRlwiLFwiaXVtbFwiOlwiXFx1MDBFRlwiLFwibGFxdW9cIjpcIlxcdTAwQUJcIixcImx0XCI6XCI8XCIsXCJMVFwiOlwiPFwiLFwibWFjclwiOlwiXFx1MDBBRlwiLFwibWljcm9cIjpcIlxcdTAwQjVcIixcIm1pZGRvdFwiOlwiXFx1MDBCN1wiLFwibmJzcFwiOlwiXFx1MDBBMFwiLFwibm90XCI6XCJcXHUwMEFDXCIsXCJOdGlsZGVcIjpcIlxcdTAwRDFcIixcIm50aWxkZVwiOlwiXFx1MDBGMVwiLFwiT2FjdXRlXCI6XCJcXHUwMEQzXCIsXCJvYWN1dGVcIjpcIlxcdTAwRjNcIixcIk9jaXJjXCI6XCJcXHUwMEQ0XCIsXCJvY2lyY1wiOlwiXFx1MDBGNFwiLFwiT2dyYXZlXCI6XCJcXHUwMEQyXCIsXCJvZ3JhdmVcIjpcIlxcdTAwRjJcIixcIm9yZGZcIjpcIlxcdTAwQUFcIixcIm9yZG1cIjpcIlxcdTAwQkFcIixcIk9zbGFzaFwiOlwiXFx1MDBEOFwiLFwib3NsYXNoXCI6XCJcXHUwMEY4XCIsXCJPdGlsZGVcIjpcIlxcdTAwRDVcIixcIm90aWxkZVwiOlwiXFx1MDBGNVwiLFwiT3VtbFwiOlwiXFx1MDBENlwiLFwib3VtbFwiOlwiXFx1MDBGNlwiLFwicGFyYVwiOlwiXFx1MDBCNlwiLFwicGx1c21uXCI6XCJcXHUwMEIxXCIsXCJwb3VuZFwiOlwiXFx1MDBBM1wiLFwicXVvdFwiOlwiXFxcIlwiLFwiUVVPVFwiOlwiXFxcIlwiLFwicmFxdW9cIjpcIlxcdTAwQkJcIixcInJlZ1wiOlwiXFx1MDBBRVwiLFwiUkVHXCI6XCJcXHUwMEFFXCIsXCJzZWN0XCI6XCJcXHUwMEE3XCIsXCJzaHlcIjpcIlxcdTAwQURcIixcInN1cDFcIjpcIlxcdTAwQjlcIixcInN1cDJcIjpcIlxcdTAwQjJcIixcInN1cDNcIjpcIlxcdTAwQjNcIixcInN6bGlnXCI6XCJcXHUwMERGXCIsXCJUSE9STlwiOlwiXFx1MDBERVwiLFwidGhvcm5cIjpcIlxcdTAwRkVcIixcInRpbWVzXCI6XCJcXHUwMEQ3XCIsXCJVYWN1dGVcIjpcIlxcdTAwREFcIixcInVhY3V0ZVwiOlwiXFx1MDBGQVwiLFwiVWNpcmNcIjpcIlxcdTAwREJcIixcInVjaXJjXCI6XCJcXHUwMEZCXCIsXCJVZ3JhdmVcIjpcIlxcdTAwRDlcIixcInVncmF2ZVwiOlwiXFx1MDBGOVwiLFwidW1sXCI6XCJcXHUwMEE4XCIsXCJVdW1sXCI6XCJcXHUwMERDXCIsXCJ1dW1sXCI6XCJcXHUwMEZDXCIsXCJZYWN1dGVcIjpcIlxcdTAwRERcIixcInlhY3V0ZVwiOlwiXFx1MDBGRFwiLFwieWVuXCI6XCJcXHUwMEE1XCIsXCJ5dW1sXCI6XCJcXHUwMEZGXCJ9IiwibW9kdWxlLmV4cG9ydHM9e1wiYW1wXCI6XCImXCIsXCJhcG9zXCI6XCInXCIsXCJndFwiOlwiPlwiLFwibHRcIjpcIjxcIixcInF1b3RcIjpcIlxcXCJcIn1cbiIsInZhciBiYXNlICAgICAgID0gcmVxdWlyZSgnLi9saWIvYmFzZScpO1xudmFyIFNhZmVTdHJpbmcgPSByZXF1aXJlKCcuL2xpYi9zYWZlLXN0cmluZycpO1xudmFyIEV4Y2VwdGlvbiAgPSByZXF1aXJlKCcuL2xpYi9leGNlcHRpb24nKTtcbnZhciBVdGlscyAgICAgID0gcmVxdWlyZSgnLi9saWIvdXRpbHMnKTtcbnZhciBydW50aW1lICAgID0gcmVxdWlyZSgnLi9saWIvcnVudGltZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbiBjcmVhdGUgKCkge1xuICB2YXIgZGIgPSBuZXcgYmFzZS5ET01CYXJzRW52aXJvbm1lbnQoKTtcblxuICBVdGlscy5leHRlbmQoZGIsIGJhc2UpO1xuICBkYi5WTSAgICAgICAgID0gcnVudGltZTtcbiAgZGIuVXRpbHMgICAgICA9IFV0aWxzO1xuICBkYi5jcmVhdGUgICAgID0gY3JlYXRlO1xuICBkYi5FeGNlcHRpb24gID0gRXhjZXB0aW9uO1xuICBkYi5TYWZlU3RyaW5nID0gU2FmZVN0cmluZztcblxuICBkYi50ZW1wbGF0ZSA9IGZ1bmN0aW9uIChzcGVjKSB7XG4gICAgcmV0dXJuIHJ1bnRpbWUudGVtcGxhdGUoc3BlYywgZGIpO1xuICB9O1xuXG4gIHJldHVybiBkYjtcbn0pKCk7XG4iXX0=
(1)
});
