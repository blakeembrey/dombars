!function(e){"object"==typeof exports?module.exports=e():"function"==typeof define&&define.amd?define(e):"undefined"!=typeof window?window.DOMBars=e():"undefined"!=typeof global?global.DOMBars=e():"undefined"!=typeof self&&(self.DOMBars=e())}(function(){var define,module,exports;
return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var base     = require('./lib/base');
var compiler = require('./lib/compiler');
var utils    = require('./lib/utils');
var runtime  = require('./lib/runtime');

/**
 * Generate the base DOMBars object.
 *
 * @return {Object}
 */
module.exports = (function create () {
  var DOMBars = base.create();

  utils.attach(DOMBars);
  compiler.attach(DOMBars);
  runtime.attach(DOMBars);

  DOMBars.create     = create;
  DOMBars.Handlebars = require('./lib/handlebars');

  return DOMBars;
})();

},{"./lib/base":2,"./lib/compiler":10,"./lib/handlebars":14,"./lib/runtime":15,"./lib/utils":16}],2:[function(require,module,exports){
var base = require('handlebars/lib/handlebars/base');

exports.create = function () {
  var DOMBars = base.create.apply(this, arguments);

  /**
   * Noop functions for subscribe and unsubscribe. Implement your own function.
   */
  DOMBars.subscribe = DOMBars.unsubscribe = function () {};

  /**
   * Basic getter function. Attach this however you want it to work.
   *
   * @param  {Object} object
   * @param  {String} property
   * @return {*}
   */
  DOMBars.get = function (object, property) {
    return object[property];
  };

  /**
   * Handlebars `each` helper is incompatibable with DOMBars, since it assumes
   * strings (as opposed to document fragments).
   *
   * @param  {Object} context
   * @param  {Object} options
   * @return {Node}
   */
  DOMBars.registerHelper('each', function (context, options) {
    var fn      = options.fn;
    var inverse = options.inverse;
    var buffer  = document.createDocumentFragment();
    var i       = 0;
    var data;

    if (typeof context === 'function') {
      context = context.call(this);
    }

    if (options.data) {
      data = DOMBars.createFrame(options.data);
    }

    if (typeof context === 'object') {
      var len = context.length;

      if (len === +len) {
        for (; i < len; i++) {
          if (data) { data.index = i; }
          buffer.appendChild(fn(context[i], { data: data }));
        }
      } else {
        for (var key in context) {
          if (context.hasOwnProperty(key)) {
            i += 1;
            if (data) { data.key = key; }
            buffer.appendChild(fn(context[key], { data: data }));
          }
        }
      }
    }

    if (i === 0) {
      return inverse(this);
    }

    return buffer;
  });

  return DOMBars;
};


},{"handlebars/lib/handlebars/base":20}],3:[function(require,module,exports){
var ast = require('handlebars/lib/handlebars/compiler/ast');

/**
 * Attach the AST object representations to the DOMBars instance.
 *
 * @param  {Object} DOMBars
 * @return {Object}
 */
exports.attach = function (DOMBars) {
  var AST = ast.attach(DOMBars).AST;
  var DOM = AST.DOM = {};

  /**
   * Create an AST node for representing an element.
   *
   * @param {Object} name
   * @param {Object} attributes
   * @param {Object} content
   */
  DOM.Element = function (name, attributes, content) {
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
  DOM.Attribute = function (name, value) {
    this.type  = 'DOM_ATTRIBUTE';
    this.name  = name;
    this.value = value;
  };

  /**
   * Create an AST node for representing a comment node.
   *
   * @param {Object} text
   */
  DOM.Comment = function (text) {
    this.type = 'DOM_COMMENT';
    this.text = text;
  };

  return DOMBars;
};

},{"handlebars/lib/handlebars/compiler/ast":21}],4:[function(require,module,exports){
var base = require('handlebars/lib/handlebars/compiler/base');

/**
 * Attach the base compiler functionality to the DOMBars object.
 *
 * @param  {Object} DOMBars
 * @return {Object}
 */
exports.attach = function (DOMBars) {
  base.attach(DOMBars);

  DOMBars.Parser = require('./parser');
  DOMBars.Parser.yy = DOMBars.AST;

  DOMBars.Compiler           = require('./compilers/base');
  DOMBars.JavaScriptCompiler = require('./compilers/javascript');

  /**
   * Check the arguments passed into the compilation functions before trying to
   * compile the as a program.
   *
   * @param  {Function} fn
   * @return {Function}
   */
  var compilePrecheck = function (fn) {
    return function (input, options) {
      if (typeof input !== 'string') {
        if (!(input instanceof DOMBars.AST.ProgramNode)) {
          throw new DOMBars.Exception(
            'You must pass a string or DOMBars AST to DOMBars.precompile. ' +
            'You passed ' + input
          );
        }
      }

      options = options || {};

      if (!('data' in options)) {
        options.data = true;
      }

      return fn(input, options);
    };
  };

  /**
   * Precompile generates a string-based JavaScript function.
   *
   * @param  {String} input
   * @param  {Object} options
   * @return {String}
   */
  DOMBars.precompile = compilePrecheck(function (input, options) {
    var ast         = DOMBars.parse(input);
    var environment = new DOMBars.Compiler().compile(ast, options);
    return new DOMBars.JavaScriptCompiler().compile(environment, options);
  });

  /**
   * Compilation return a function that is immediately ready for execution as a
   * template.
   *
   * @param  {String}   input
   * @param  {Object}   options
   * @return {Function}
   */
  DOMBars.compile = compilePrecheck(function (input, options) {
    var compiled;

    var compile = function () {
      var ast          = DOMBars.parse(input);
      var environment  = new DOMBars.Compiler().compile(ast, options);
      var templateSpec = new DOMBars.JavaScriptCompiler().compile(
        environment, options, undefined, true
      );

      return DOMBars.template(templateSpec);
    };

    return function (context, options) {
      if (!compiled) {
        compiled = compile();
      }

      return compiled.call(this, context, options);
    };
  });

  return DOMBars;
};

},{"./compilers/base":6,"./compilers/javascript":8,"./parser":11,"handlebars/lib/handlebars/compiler/base":22}],5:[function(require,module,exports){
var createFrame    = require('../../handlebars').createFrame;
var CommonCompiler = require('./common').prototype;

/**
 * Attribute compiler.
 */
var Compiler = module.exports = function () {};
Compiler.prototype = createFrame(CommonCompiler);
Compiler.prototype.compiler = Compiler;

/**
 * Append a value to the current buffer. We override the default functionality
 * of Handlebars since we want to be able to append *every* value.
 */
Compiler.prototype.append = function () {
  this.flushInline();

  this.source.push(this.appendToBuffer(this.popStack()));
};

},{"../../handlebars":14,"./common":7}],6:[function(require,module,exports){
var Handlebars   = require('../../handlebars');
var BaseCompiler = Handlebars.Compiler.prototype;

/**
 * Base compiler in charge of generating a consumable environment for the
 * JavaScript compiler.
 */
var Compiler = module.exports = function () {};
Compiler.prototype = Handlebars.createFrame(BaseCompiler);
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

},{"../../handlebars":14}],7:[function(require,module,exports){
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
 * Simple function for bouncing a value. E.g. Instead of direct references.
 *
 * @param  {String} string
 * @return {String}
 */
Compiler.prototype.bounce = function (string) {
  return 'function () { return ' + string + '; }';
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

},{"../../handlebars":14}],8:[function(require,module,exports){
var createFrame    = require('../../handlebars').createFrame;
var CommonCompiler = require('./common').prototype;

/**
 * Extends Handlebars JavaScript compiler to add DOM specific rules.
 */
var Compiler = module.exports = function () {};
Compiler.prototype = createFrame(CommonCompiler);
Compiler.prototype.compiler     = Compiler;
Compiler.prototype.attrCompiler = require('./attributes');

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
Compiler.prototype.append = function (escaped) {
  this.flushInline();

  var createFn = 'createText';

  if (escaped) {
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
  var depth  = 'depth' + this.lastContext;
  var invoke = this.bounce(this.topStack() + '(' + depth + ')');

  this.context.aliases.createComment = 'this.createComment';

  this.pushStack('createComment(' + invoke + ')');
};

/**
 * Create a DOM element node ready for appending to the current buffer.
 */
Compiler.prototype.invokeElement = function () {
  this.context.aliases.createElement = 'this.createElement';

  var element = this.pushElement();
  var depth   = 'depth' + this.lastContext;
  var current = this.bounce(this.popStack() + '(' + depth + ')');
  var update  = 'function (element) { ' + element + ' = element; }';
  var create  = 'createElement(' + current + ', ' + update + ')';

  this.pushStackLiteral(element);
  this.register(element, create);
};

/**
 * Append an attribute node to the current element.
 */
Compiler.prototype.invokeAttribute = function () {
  var depth   = 'depth' + this.lastContext;
  var element = this.bounce(this.topElement());
  var value   = this.bounce(this.popStack() + '(' + depth + ')');
  var name    = this.bounce(this.popStack() + '(' + depth + ')');
  var params  = [element, name, value];

  this.context.aliases.setAttribute = 'this.setAttribute';

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

  for (var i = 0, l = depths.length; i < l; i++) {
    var depth = depths[i] + this.environment.depths.list.length;

    programParams.push('depth' + (depth - 1));
  }

  var params = programParams.join(', ');

  if (depths.length === 0) {
    return 'self.program(' + params + ')';
  }

  return 'self.programWithDepth(' + params + ')';
};

},{"../../handlebars":14,"./attributes":5,"./common":7}],9:[function(require,module,exports){
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

},{}],10:[function(require,module,exports){
var ast     = require('./ast');
var base    = require('./base');
var printer = require('./printer');
var visitor = require('./visitor');

exports.attach = function (DOMBars) {
  visitor.attach(DOMBars);
  printer.attach(DOMBars);
  ast.attach(DOMBars);
  base.attach(DOMBars);

  return DOMBars;
};

},{"./ast":3,"./base":4,"./printer":12,"./visitor":13}],11:[function(require,module,exports){
var HbsParser  = require('handlebars/lib/handlebars/compiler/parser');
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
      html += '{{d' + i + '}}'; // "Alias" node
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
      var node = new yy.DOM.Element(name, [], createProgram());
      program.statements.push(element = node);
      stack.push(program = node.content);
    },
    onclosetag: function () {
      stack.pop();
      element = null;
      program = stack[stack.length - 1];
    },
    onattribute: function (name, value) {
      element.attributes.push(new yy.DOM.Attribute(name, value));
    },
    ontext: function (text) {
      program.statements.push(text);
    },
    onprocessinginstruction: function () {
      throw new Error('Processing instructions are not supported');
    },
    oncomment: function (data) {
      program.statements.push(new yy.DOM.Comment(data));
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

},{"handlebars/lib/handlebars/compiler/parser":25,"htmlparser2/lib/Parser":30}],12:[function(require,module,exports){
var printer = require('handlebars/lib/handlebars/compiler/printer');

module.exports = printer;

},{"handlebars/lib/handlebars/compiler/printer":26}],13:[function(require,module,exports){
var visitor = require('handlebars/lib/handlebars/compiler/visitor');

module.exports = visitor;

},{"handlebars/lib/handlebars/compiler/visitor":27}],14:[function(require,module,exports){
var base     = require('handlebars/lib/handlebars/base');
var utils    = require('handlebars/lib/handlebars/utils');
var compiler = require('handlebars/lib/handlebars/compiler');
var runtime  = require('handlebars/lib/handlebars/runtime');

var Handlebars = module.exports = base.create();

utils.attach(Handlebars);
compiler.attach(Handlebars);
runtime.attach(Handlebars);

},{"handlebars/lib/handlebars/base":20,"handlebars/lib/handlebars/compiler":24,"handlebars/lib/handlebars/runtime":28,"handlebars/lib/handlebars/utils":29}],15:[function(require,module,exports){
var runtime = require('handlebars/lib/handlebars/runtime');
var browser = typeof window !== 'undefined';
var raf     = browser && require('raf-component');

/**
 * Attribute runtime features to the DOMBars instance.
 *
 * @param  {Object} DOMBars
 * @return {Object}
 */
exports.attach = function (DOMBars) {
  var VM    = runtime.attach(DOMBars).VM;
  var Utils = DOMBars.Utils;

  /**
   * Bind a function to the animation frame.
   *
   * @param  {Function} fn
   * @return {Number}
   */
  VM.exec = function (fn) {
    return browser ? raf(fn) : setImmediate(fn);
  };

  /**
   * Cancel an execution.
   *
   * @param {Number} id
   */
  VM.exec.cancel = function (id) {
    return browser ? raf.cancel(id) : clearImmediate(id);
  };

  /**
   * Accepts a function that has subscriptions called inside and returns a new
   * function that will listen to all subscriptions and can update with any
   * changes.
   *
   * @param  {Function} fn
   * @return {Function}
   */
  VM.subscribe = function (fn) {
    /**
     * The returned subscription function takes care of aliasing the
     * subscriptions array correctly, subscribing for updates and triggering
     * updates when any of the subscriptions change.
     *
     * @return {*}
     */
    var subscriber = function () {
      var result = subscriber.exec.apply(this, arguments);
      eachSubscription(subscriber.subscriptions, DOMBars.subscribe);
      return result;
    };

    // Keep an array of current subscriptions and an object with references
    // to child subscription functions.
    subscriber.cid      = 'subscriber' + Utils.uniqueId();
    subscriber.children = {};

    /**
     * Trigger this function with every change with the listeners.
     */
    var change = function () {
      // If the triggered flag has been set, don't cause another update.
      if (subscriber.triggered || subscriber.unsubscribed) { return; }

      // Set a triggered flag to avoid multiple triggers. Also unsubscribe any
      // children immediately to stop update clashes.
      subscriber.triggered = true;
      subscriber.unsubscribeChildren();

      subscriber._exec = VM.exec(function () {
        subscriber.beforeUpdate();
        subscriber.update(subscriber.exec());
        subscriber.afterUpdate();
        delete subscriber.triggered;
      });
    };

    /**
     * Iterate over a subscriptions object and unsubscribe everything.
     *
     * @param {Array} subscriptions
     */
    var eachSubscription = function (subscriptions, fn) {
      for (var property in subscriptions) {
        for (var key in subscriptions[property]) {
          fn(subscriptions[property][key], property, change);
        }
      }
    };

    /**
     * Iterate over an array of functions and execute.
     *
     * @param {Array} subscriptions
     */
    var iteration = function (subscriptions) {
      for (var i = 0; i < subscriptions.length; i++) {
        subscriptions[i]();
      }
    };

    /**
     * Execute the function and return the result.
     *
     * @return {*}
     */
    subscriber.exec = function () {
      // If we have a parent subscriber, link the subscribers together.
      if (VM.subscriber) {
        subscriber.parent = VM.subscriber;
        VM.subscriber.children[subscriber.cid] = subscriber;
      }

      // Alias subscriber functionality to the VM object.
      VM.subscriber  = subscriber;
      VM.unsubscribe = function (fn) {
        subscriber.unsubscriptions.push(fn);
      };

      // Reset subscriptions before execution.
      subscriber.subscriptions   = {};
      subscriber.unsubscriptions = [];

      var result = fn.apply(this, arguments);

      // Reset the VM functionality to what it was beforehand.
      VM.subscriber  = subscriber.parent;
      VM.unsubscribe = null;

      return result;
    };

    /**
     * Run this function before we run an update function. It moves current
     * subscriptions so that we can diff the subscriptions after we update
     * the DOM.
     */
    subscriber.beforeUpdate = function () {
      iteration(subscriber.unsubscriptions);
      subscriber.prevSubscriptions = subscriber.subscriptions;
    };

    /**
     * Run this function after an update. It will check for difference in the
     * before and after updates.
     */
    subscriber.afterUpdate = function () {
      var subscriptions = subscriber.subscriptions;

      // Diff the previous subscriptions and new subscriptions to add/remove
      // listeners as needed. This should be more memory efficient than blindly
      // adding and removing listeners every time.
      for (var property in subscriptions) {
        for (var key in subscriptions[property]) {
          if (!subscriber.prevSubscriptions[property][key]) {
            DOMBars.subscribe(subscriptions[property][key], property, change);
          } else {
            delete subscriber.prevSubscriptions[property][key];
          }
        }
      }

      // Loop over previous subscriptions that no longer exist and unsubscribe.
      eachSubscription(subscriber.prevSubscriptions, DOMBars.unsubscribe);

      delete subscriber.prevSubscriptions;
    };

    /**
     * Remove the current subscriber from all listeners. We also need to cancel
     * any current execution event and remove a reference from the parent
     * subscription.
     */
    subscriber.unsubscribe = function () {
      iteration(subscriber.unsubscriptions);
      eachSubscription(subscriber.subscriptions, DOMBars.unsubscribe);

      if (subscriber.parent) {
        delete subscriber.parent.children[subscriber.cid];
        delete subscriber.parent;
      }

      // Track whether we have been unsubscribed. This is required since the
      // listener could still be triggered at any time even though we expect
      // the external references to be dropped. This could also indicate a
      // potential memory leak with the listener unsusbcription code.
      subscriber.unsubscribed = true;
      VM.exec.cancel(subscriber._exec);
      subscriber.unsubscribeChildren();
    };

    /**
     * Unsubscribe every child of the current subscription.
     */
    subscriber.unsubscribeChildren = function () {
      for (var child in subscriber.children) {
        subscriber.children[child].unsubscribe();
      }
    };

    return subscriber;
  };

  /**
   * Render and subscribe a single DOM node using a custom creation function.
   *
   * @param  {Function} fn
   * @param  {Function} create
   * @return {Node}
   */
  var subscribeNode = function (fn, create) {
    var subscription = VM.subscribe(fn);

    // We need to add a before and after element placeholder since the pieces
    // in between can be enabled and disabled randomly.
    var placeholders = {
      after:  document.createTextNode(''),
      before: document.createTextNode('')
    };

    // Create a function to keep track of document fragment children.
    var generate = function (text) {
      var fragment = document.createDocumentFragment();

      // To keep track of the insertions and deletions accurately we need to
      // add placeholder DOM elements.
      fragment.appendChild(placeholders.before);
      fragment.appendChild(create(text));
      fragment.appendChild(placeholders.after);

      return fragment;
    };

    subscription.update = function (value) {
      var parentNode = placeholders.before.parentNode;
      var childNodes = parentNode.childNodes;

      // Iterate over the child nodes to remove the attached children.
      for (var i = 0; i < parentNode.childNodes.length; i++) {
        // When we find the `before` placeholder node, start removing all
        // the child nodes until we hit the `after` placeholder node.
        if (childNodes[i] === placeholders.before) {
          do {
            parentNode.removeChild(childNodes[i]);
          } while (childNodes[i] !== placeholders.after);

          var nextSibling = placeholders.after.nextSibling;
          parentNode.insertBefore(generate(value), nextSibling);
          break;
        }
      }
    };

    return generate(subscription());
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
  VM.createElement = function (fn, cb) {
    var subscription = VM.subscribe(fn);
    var el           = Utils.createElement(subscription());

    subscription.update = function (value) {
      cb(el = Utils.copyAndReplaceNode(Utils.createElement(value), el));
    };

    return el;
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
  VM.setAttribute = function (elementFn, nameFn, valueFn) {
    var nameSubscription  = VM.subscribe(nameFn);
    var valueSubscription = VM.subscribe(valueFn);

    // Keep track of the current name and value without having to re-run the
    // function every time something changes.
    var attrName  = nameSubscription();
    var attrValue = valueSubscription();

    nameSubscription.update = function (value) {
      Utils.removeAttribute(elementFn(), attrName);
      Utils.setAttribute(elementFn(), attrName = value, attrValue);
    };

    valueSubscription.update = function (value) {
      Utils.setAttribute(elementFn(), attrName, attrValue = value);
    };

    return Utils.setAttribute(elementFn(), attrName, attrValue);
  };

  /**
   * Create a DOM element and subscribe to any changes.
   *
   * @param  {Function} fn
   * @return {Node}
   */
  VM.createDOM = function (fn) {
    return subscribeNode(fn, Utils.domifyExpression);
  };

  /**
   * Create a text node and subscribe to any changes.
   *
   * @param  {Function} fn
   * @return {Text}
   */
  VM.createText = function (fn) {
    return subscribeNode(fn, Utils.textifyExpression);
  };

  /**
   * Create a comment node and subscribe to any changes.
   *
   * @param  {Function} fn
   * @return {Comment}
   */
  VM.createComment = function (fn) {
    var subscription = VM.subscribe(fn);
    var node         = Utils.createComment(subscription());

    subscription.update = function (value) {
      node.textContent = value;
    };

    return node;
  };

  /**
   * Generate an executable template from a template spec.
   *
   * @param  {Object}   templateSpec
   * @return {Function}
   */
  VM.template = DOMBars.template = function (templateSpec) {
    var DOMBars = this;

    /**
     * The container object holds all the functions used by the template spec.
     *
     * @type {Object}
     */
    var container = {
      invokePartial:    VM.invokePartial,
      programs:         [],
      noop:             VM.noop,
      compilerInfo:     null,
      appendChild:      Utils.appendChild,
      createDOM:        VM.createDOM,
      createText:       VM.createText,
      setAttribute:     VM.setAttribute,
      createComment:    VM.createComment,
      createElement:    VM.createElement,
      escapeExpression: Utils.escapeExpression,
      programWithDepth: VM.programWithDepth
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
    container.merge = function (param, common) {
      var ret = param || common;

      if (param && common) {
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
      var subscriptions = VM.subscriber.subscriptions;

      (subscriptions[property] || (subscriptions[property] = {}))[id] = object;

      return DOMBars.get(object, property);
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

      // Subscribe to the template spec inside the returned function. This is so
      // that *every* generated DOM template will have a different unsubscribe
      // method.
      var subscriber = VM.subscribe(templateSpec);

      var result = subscriber.call(
        container,
        DOMBars,
        context,
        options.helpers,
        options.partials,
        options.data
      );

      // Attach the current operating context to the VM object for reference
      // within the utility functions.
      VM.context = context;

      // Attach an `unsubscribe` function to the resulting DOM.
      // TODO: Come up with an improved solution.
      result.unsubscribe = subscriber.unsubscribe;

      var compilerInfo     = container.compilerInfo || [];
      var compilerRevision = compilerInfo[0] || 1;
      var currentRevision  = DOMBars.COMPILER_REVISION;

      if (compilerRevision !== currentRevision) {
        if (compilerRevision < currentRevision) {
          var runtimeVersions  = DOMBars.REVISION_CHANGES[currentRevision];
          var compilerVersions = DOMBars.REVISION_CHANGES[compilerRevision];
          throw new Error('Template was precompiled with an older version of ' +
            'DOMBars than the current runtime. Please update your precompiler' +
            ' to a newer version (' + runtimeVersions + ') or downgrade your ' +
            'runtime to an older version (' + compilerVersions + ')');
        }

        throw new Error('Template was precompiled with a newer version of' +
          'DOMBars than the current runtime. Please update your runtime to ' +
          'a newer version (' + compilerInfo[1] + ')');
      }

      VM.context = null;

      return result;
    };
  };

  return DOMBars;
};

},{"handlebars/lib/handlebars/runtime":28,"raf-component":36}],16:[function(require,module,exports){
var utils    = require('handlebars/lib/handlebars/utils');
var events   = require('./compiler/events');
var uniqueId = 0;

/**
 * Attach reusable utility functions to the DOMBars instance.
 *
 * @param  {Object} DOMBars
 * @return {Object}
 */
exports.attach = function (DOMBars) {
  var Utils = utils.attach(DOMBars).Utils;

  // Extend the DOMBars root object with an event emitter.
  DOMBars.Utils.extend(DOMBars, events);

  /**
   * Simple function wrapper that will emit the event with the result of the
   * function execution every time the function is run.
   *
   * @param  {Function} fn
   * @param  {String}   event
   * @return {Function}
   */
  var emitter = function (fn, event) {
    return function () {
      var result = fn.apply(this, arguments);
      DOMBars.emit(event, result);
      return result;
    };
  };

  /**
   * Return a unique id.
   *
   * @return {Number}
   */
  Utils.uniqueId = function () {
    return uniqueId++;
  };

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
   * Create an element from a tag name.
   *
   * @param  {String} tagName
   * @return {Node}
   */
  Utils.createElement = emitter(function (tagName) {
    return document.createElement(tagName);
  }, 'createElement');

  /**
   * Create a comment node based on text contents.
   *
   * @param  {String} contents
   * @return {Node}
   */
  Utils.createComment = emitter(function (contents) {
    return document.createComment(contents);
  }, 'createComment');

  /**
   * Copy all significant data from one element node to another.
   *
   * @param  {Node} newNode
   * @param  {Node} oldNode
   * @return {Node}
   */
  Utils.copyNode = function (newNode, oldNode) {
    // Move all child elements to the new node.
    while (oldNode.firstChild) {
      newNode.appendChild(oldNode.firstChild);
    }

    // Copy all the attributes to the new node.
    for (var i = 0; i < oldNode.attributes.length; i++) {
      var attribute = oldNode.attributes[i];
      Utils.setAttribute(newNode, attribute.name, attribute.value);
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
  Utils.copyAndReplaceNode = function (newNode, oldNode) {
    oldNode.parentNode.replaceChild(Utils.copyNode(newNode, oldNode), oldNode);
    return newNode;
  };

  /**
   * Set an attribute value on an element.
   *
   * @param {Node}   element
   * @param {String} name
   * @param {*}      value
   */
  Utils.setAttribute = function (element, name, value) {
    if (value === false) {
      return Utils.removeAttribute(element, name);
    }

    DOMBars.emit('setAttribute', element, name, value);
    element.setAttribute(name, value);
  };

  /**
   * Remove an attribute from an element.
   *
   * @param {Node}   element
   * @param {String} name
   */
  Utils.removeAttribute = function (element, name) {
    if (element.hasAttribute(name)) {
      DOMBars.emit('removeAttribute', element, name);
      element.removeAttribute(name);
    }
  };

  /**
   * Append a child element to a DOM node.
   *
   * @param {Node} parent
   * @param {Node} child
   */
  Utils.appendChild = function (parent, child) {
    if (child == null) { return; }

    parent.appendChild(child);
    DOMBars.emit('appendChild', parent, child);
  };

  /**
   * Transform a string into arbitrary DOM nodes.
   *
   * @param  {String} string
   * @return {Node}
   */
  Utils.domifyExpression = emitter(function (string) {
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
  }, 'domify');

  /**
   * Transform a string into a DOM text node for appending to the template.
   *
   * @param  {String} string
   * @return {Text}
   */
  Utils.textifyExpression = emitter(function (string) {
    if (string instanceof DOMBars.SafeString) {
      return Utils.domifyExpression(string.toString());
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
  }, 'textify');

  return DOMBars;
};

},{"./compiler/events":9,"handlebars/lib/handlebars/utils":29}],17:[function(require,module,exports){


//
// The shims in this file are not fully implemented shims for the ES5
// features, but do work for the particular usecases there is in
// the other modules.
//

var toString = Object.prototype.toString;
var hasOwnProperty = Object.prototype.hasOwnProperty;

// Array.isArray is supported in IE9
function isArray(xs) {
  return toString.call(xs) === '[object Array]';
}
exports.isArray = typeof Array.isArray === 'function' ? Array.isArray : isArray;

// Array.prototype.indexOf is supported in IE9
exports.indexOf = function indexOf(xs, x) {
  if (xs.indexOf) return xs.indexOf(x);
  for (var i = 0; i < xs.length; i++) {
    if (x === xs[i]) return i;
  }
  return -1;
};

// Array.prototype.filter is supported in IE9
exports.filter = function filter(xs, fn) {
  if (xs.filter) return xs.filter(fn);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    if (fn(xs[i], i, xs)) res.push(xs[i]);
  }
  return res;
};

// Array.prototype.forEach is supported in IE9
exports.forEach = function forEach(xs, fn, self) {
  if (xs.forEach) return xs.forEach(fn, self);
  for (var i = 0; i < xs.length; i++) {
    fn.call(self, xs[i], i, xs);
  }
};

// Array.prototype.map is supported in IE9
exports.map = function map(xs, fn) {
  if (xs.map) return xs.map(fn);
  var out = new Array(xs.length);
  for (var i = 0; i < xs.length; i++) {
    out[i] = fn(xs[i], i, xs);
  }
  return out;
};

// Array.prototype.reduce is supported in IE9
exports.reduce = function reduce(array, callback, opt_initialValue) {
  if (array.reduce) return array.reduce(callback, opt_initialValue);
  var value, isValueSet = false;

  if (2 < arguments.length) {
    value = opt_initialValue;
    isValueSet = true;
  }
  for (var i = 0, l = array.length; l > i; ++i) {
    if (array.hasOwnProperty(i)) {
      if (isValueSet) {
        value = callback(value, array[i], i, array);
      }
      else {
        value = array[i];
        isValueSet = true;
      }
    }
  }

  return value;
};

// String.prototype.substr - negative index don't work in IE8
if ('ab'.substr(-1) !== 'b') {
  exports.substr = function (str, start, length) {
    // did we get a negative start, calculate how much it is from the beginning of the string
    if (start < 0) start = str.length + start;

    // call the original function
    return str.substr(start, length);
  };
} else {
  exports.substr = function (str, start, length) {
    return str.substr(start, length);
  };
}

// String.prototype.trim is supported in IE9
exports.trim = function (str) {
  if (str.trim) return str.trim();
  return str.replace(/^\s+|\s+$/g, '');
};

// Function.prototype.bind is supported in IE9
exports.bind = function () {
  var args = Array.prototype.slice.call(arguments);
  var fn = args.shift();
  if (fn.bind) return fn.bind.apply(fn, args);
  var self = args.shift();
  return function () {
    fn.apply(self, args.concat([Array.prototype.slice.call(arguments)]));
  };
};

// Object.create is supported in IE9
function create(prototype, properties) {
  var object;
  if (prototype === null) {
    object = { '__proto__' : null };
  }
  else {
    if (typeof prototype !== 'object') {
      throw new TypeError(
        'typeof prototype[' + (typeof prototype) + '] != \'object\''
      );
    }
    var Type = function () {};
    Type.prototype = prototype;
    object = new Type();
    object.__proto__ = prototype;
  }
  if (typeof properties !== 'undefined' && Object.defineProperties) {
    Object.defineProperties(object, properties);
  }
  return object;
}
exports.create = typeof Object.create === 'function' ? Object.create : create;

// Object.keys and Object.getOwnPropertyNames is supported in IE9 however
// they do show a description and number property on Error objects
function notObject(object) {
  return ((typeof object != "object" && typeof object != "function") || object === null);
}

function keysShim(object) {
  if (notObject(object)) {
    throw new TypeError("Object.keys called on a non-object");
  }

  var result = [];
  for (var name in object) {
    if (hasOwnProperty.call(object, name)) {
      result.push(name);
    }
  }
  return result;
}

// getOwnPropertyNames is almost the same as Object.keys one key feature
//  is that it returns hidden properties, since that can't be implemented,
//  this feature gets reduced so it just shows the length property on arrays
function propertyShim(object) {
  if (notObject(object)) {
    throw new TypeError("Object.getOwnPropertyNames called on a non-object");
  }

  var result = keysShim(object);
  if (exports.isArray(object) && exports.indexOf(object, 'length') === -1) {
    result.push('length');
  }
  return result;
}

var keys = typeof Object.keys === 'function' ? Object.keys : keysShim;
var getOwnPropertyNames = typeof Object.getOwnPropertyNames === 'function' ?
  Object.getOwnPropertyNames : propertyShim;

if (new Error().hasOwnProperty('description')) {
  var ERROR_PROPERTY_FILTER = function (obj, array) {
    if (toString.call(obj) === '[object Error]') {
      array = exports.filter(array, function (name) {
        return name !== 'description' && name !== 'number' && name !== 'message';
      });
    }
    return array;
  };

  exports.keys = function (object) {
    return ERROR_PROPERTY_FILTER(object, keys(object));
  };
  exports.getOwnPropertyNames = function (object) {
    return ERROR_PROPERTY_FILTER(object, getOwnPropertyNames(object));
  };
} else {
  exports.keys = keys;
  exports.getOwnPropertyNames = getOwnPropertyNames;
}

// Object.getOwnPropertyDescriptor - supported in IE8 but only on dom elements
function valueObject(value, key) {
  return { value: value[key] };
}

if (typeof Object.getOwnPropertyDescriptor === 'function') {
  try {
    Object.getOwnPropertyDescriptor({'a': 1}, 'a');
    exports.getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
  } catch (e) {
    // IE8 dom element issue - use a try catch and default to valueObject
    exports.getOwnPropertyDescriptor = function (value, key) {
      try {
        return Object.getOwnPropertyDescriptor(value, key);
      } catch (e) {
        return valueObject(value, key);
      }
    };
  }
} else {
  exports.getOwnPropertyDescriptor = valueObject;
}

},{}],18:[function(require,module,exports){
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

var util = require('util');

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
  if (!util.isNumber(n) || n < 0)
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
        (util.isObject(this._events.error) && !this._events.error.length)) {
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

  if (util.isUndefined(handler))
    return false;

  if (util.isFunction(handler)) {
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
  } else if (util.isObject(handler)) {
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

  if (!util.isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              util.isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (util.isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (util.isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!util.isUndefined(this._maxListeners)) {
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
  if (!util.isFunction(listener))
    throw TypeError('listener must be a function');

  function g() {
    this.removeListener(type, g);
    listener.apply(this, arguments);
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!util.isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (util.isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (util.isObject(list)) {
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

  if (util.isFunction(listeners)) {
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
  else if (util.isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (util.isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};
},{"util":19}],19:[function(require,module,exports){
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

var shims = require('_shims');

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

  shims.forEach(array, function(val, idx) {
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
    var ret = value.inspect(recurseTimes);
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
  var keys = shims.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = shims.getOwnPropertyNames(value);
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

  shims.forEach(keys, function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = shims.getOwnPropertyDescriptor(value, key) || { value: value[key] };
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
    if (shims.indexOf(ctx.seen, desc.value) < 0) {
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
  var length = shims.reduce(output, function(prev, cur) {
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
  return shims.isArray(ar);
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
  return typeof arg === 'object' && arg;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) && objectToString(e) === '[object Error]';
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

function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.binarySlice === 'function'
  ;
}
exports.isBuffer = isBuffer;

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
exports.inherits = function(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = shims.create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
};

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = shims.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

},{"_shims":17}],20:[function(require,module,exports){
/*jshint eqnull: true */

module.exports.create = function() {

var Handlebars = {};

// BEGIN(BROWSER)

Handlebars.VERSION = "1.0.0";
Handlebars.COMPILER_REVISION = 4;

Handlebars.REVISION_CHANGES = {
  1: '<= 1.0.rc.2', // 1.0.rc.2 is actually rev2 but doesn't report it
  2: '== 1.0.0-rc.3',
  3: '== 1.0.0-rc.4',
  4: '>= 1.0.0'
};

Handlebars.helpers  = {};
Handlebars.partials = {};

var toString = Object.prototype.toString,
    functionType = '[object Function]',
    objectType = '[object Object]';

Handlebars.registerHelper = function(name, fn, inverse) {
  if (toString.call(name) === objectType) {
    if (inverse || fn) { throw new Handlebars.Exception('Arg not supported with multiple helpers'); }
    Handlebars.Utils.extend(this.helpers, name);
  } else {
    if (inverse) { fn.not = inverse; }
    this.helpers[name] = fn;
  }
};

Handlebars.registerPartial = function(name, str) {
  if (toString.call(name) === objectType) {
    Handlebars.Utils.extend(this.partials,  name);
  } else {
    this.partials[name] = str;
  }
};

Handlebars.registerHelper('helperMissing', function(arg) {
  if(arguments.length === 2) {
    return undefined;
  } else {
    throw new Error("Missing helper: '" + arg + "'");
  }
});

Handlebars.registerHelper('blockHelperMissing', function(context, options) {
  var inverse = options.inverse || function() {}, fn = options.fn;

  var type = toString.call(context);

  if(type === functionType) { context = context.call(this); }

  if(context === true) {
    return fn(this);
  } else if(context === false || context == null) {
    return inverse(this);
  } else if(type === "[object Array]") {
    if(context.length > 0) {
      return Handlebars.helpers.each(context, options);
    } else {
      return inverse(this);
    }
  } else {
    return fn(context);
  }
});

Handlebars.K = function() {};

Handlebars.createFrame = Object.create || function(object) {
  Handlebars.K.prototype = object;
  var obj = new Handlebars.K();
  Handlebars.K.prototype = null;
  return obj;
};

Handlebars.logger = {
  DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, level: 3,

  methodMap: {0: 'debug', 1: 'info', 2: 'warn', 3: 'error'},

  // can be overridden in the host environment
  log: function(level, obj) {
    if (Handlebars.logger.level <= level) {
      var method = Handlebars.logger.methodMap[level];
      if (typeof console !== 'undefined' && console[method]) {
        console[method].call(console, obj);
      }
    }
  }
};

Handlebars.log = function(level, obj) { Handlebars.logger.log(level, obj); };

Handlebars.registerHelper('each', function(context, options) {
  var fn = options.fn, inverse = options.inverse;
  var i = 0, ret = "", data;

  var type = toString.call(context);
  if(type === functionType) { context = context.call(this); }

  if (options.data) {
    data = Handlebars.createFrame(options.data);
  }

  if(context && typeof context === 'object') {
    if(context instanceof Array){
      for(var j = context.length; i<j; i++) {
        if (data) { data.index = i; }
        ret = ret + fn(context[i], { data: data });
      }
    } else {
      for(var key in context) {
        if(context.hasOwnProperty(key)) {
          if(data) { data.key = key; }
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

Handlebars.registerHelper('if', function(conditional, options) {
  var type = toString.call(conditional);
  if(type === functionType) { conditional = conditional.call(this); }

  if(!conditional || Handlebars.Utils.isEmpty(conditional)) {
    return options.inverse(this);
  } else {
    return options.fn(this);
  }
});

Handlebars.registerHelper('unless', function(conditional, options) {
  return Handlebars.helpers['if'].call(this, conditional, {fn: options.inverse, inverse: options.fn});
});

Handlebars.registerHelper('with', function(context, options) {
  var type = toString.call(context);
  if(type === functionType) { context = context.call(this); }

  if (!Handlebars.Utils.isEmpty(context)) return options.fn(context);
});

Handlebars.registerHelper('log', function(context, options) {
  var level = options.data && options.data.level != null ? parseInt(options.data.level, 10) : 1;
  Handlebars.log(level, context);
});

// END(BROWSER)

return Handlebars;
};

},{}],21:[function(require,module,exports){
exports.attach = function(Handlebars) {

// BEGIN(BROWSER)
Handlebars.AST = {};

Handlebars.AST.ProgramNode = function(statements, inverse) {
  this.type = "program";
  this.statements = statements;
  if(inverse) { this.inverse = new Handlebars.AST.ProgramNode(inverse); }
};

Handlebars.AST.MustacheNode = function(rawParams, hash, unescaped) {
  this.type = "mustache";
  this.escaped = !unescaped;
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
};

Handlebars.AST.PartialNode = function(partialName, context) {
  this.type         = "partial";
  this.partialName  = partialName;
  this.context      = context;
};

Handlebars.AST.BlockNode = function(mustache, program, inverse, close) {
  var verifyMatch = function(open, close) {
    if(open.original !== close.original) {
      throw new Handlebars.Exception(open.original + " doesn't match " + close.original);
    }
  };

  verifyMatch(mustache.id, close);
  this.type = "block";
  this.mustache = mustache;
  this.program  = program;
  this.inverse  = inverse;

  if (this.inverse && !this.program) {
    this.isInverse = true;
  }
};

Handlebars.AST.ContentNode = function(string) {
  this.type = "content";
  this.string = string;
};

Handlebars.AST.HashNode = function(pairs) {
  this.type = "hash";
  this.pairs = pairs;
};

Handlebars.AST.IdNode = function(parts) {
  this.type = "ID";

  var original = "",
      dig = [],
      depth = 0;

  for(var i=0,l=parts.length; i<l; i++) {
    var part = parts[i].part;
    original += (parts[i].separator || '') + part;

    if (part === ".." || part === "." || part === "this") {
      if (dig.length > 0) { throw new Handlebars.Exception("Invalid path: " + original); }
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
};

Handlebars.AST.PartialNameNode = function(name) {
  this.type = "PARTIAL_NAME";
  this.name = name.original;
};

Handlebars.AST.DataNode = function(id) {
  this.type = "DATA";
  this.id = id;
};

Handlebars.AST.StringNode = function(string) {
  this.type = "STRING";
  this.original =
    this.string =
    this.stringModeValue = string;
};

Handlebars.AST.IntegerNode = function(integer) {
  this.type = "INTEGER";
  this.original =
    this.integer = integer;
  this.stringModeValue = Number(integer);
};

Handlebars.AST.BooleanNode = function(bool) {
  this.type = "BOOLEAN";
  this.bool = bool;
  this.stringModeValue = bool === "true";
};

Handlebars.AST.CommentNode = function(comment) {
  this.type = "comment";
  this.comment = comment;
};

// END(BROWSER)

return Handlebars;
};


},{}],22:[function(require,module,exports){
var handlebars = require("./parser");

exports.attach = function(Handlebars) {

// BEGIN(BROWSER)

Handlebars.Parser = handlebars;

Handlebars.parse = function(input) {

  // Just return if an already-compile AST was passed in.
  if(input.constructor === Handlebars.AST.ProgramNode) { return input; }

  Handlebars.Parser.yy = Handlebars.AST;
  return Handlebars.Parser.parse(input);
};

// END(BROWSER)

return Handlebars;
};

},{"./parser":25}],23:[function(require,module,exports){
var compilerbase = require("./base");

exports.attach = function(Handlebars) {

compilerbase.attach(Handlebars);

// BEGIN(BROWSER)

/*jshint eqnull:true*/
var Compiler = Handlebars.Compiler = function() {};
var JavaScriptCompiler = Handlebars.JavaScriptCompiler = function() {};

// the foundHelper register will disambiguate helper lookup from finding a
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

    return this.program(program);
  },

  accept: function(node) {
    return this[node.type](node);
  },

  program: function(program) {
    var statements = program.statements, statement;
    this.opcodes = [];

    for(var i=0, l=statements.length; i<l; i++) {
      statement = statements[i];
      this[statement.type](statement);
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
      throw new Handlebars.Exception('Scoped data references are not supported: ' + data.original);
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

var Literal = function(value) {
  this.value = value;
};

JavaScriptCompiler.prototype = {
  // PUBLIC API: You can override these methods in a subclass to provide
  // alternative compiled forms for name lookup and buffering semantics
  nameLookup: function(parent, name /* , type*/) {
    if (/^[0-9]+$/.test(name)) {
      return parent + "[" + name + "]";
    } else if (JavaScriptCompiler.isValidJavaScriptVariableName(name)) {
      return parent + "." + name;
    }
    else {
      return parent + "['" + name + "']";
    }
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

    Handlebars.log(Handlebars.logger.DEBUG, this.environment.disassemble() + "\n\n");

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

    for(l=opcodes.length; this.i<l; this.i++) {
      opcode = opcodes[this.i];

      if(opcode.opcode === 'DECLARE') {
        this[opcode.name] = opcode.value;
      } else {
        this[opcode.opcode].apply(this, opcode.args);
      }
    }

    return this.createFunctionContext(asObject);
  },

  nextOpcode: function() {
    var opcodes = this.environment.opcodes;
    return opcodes[this.i + 1];
  },

  eat: function() {
    this.i = this.i + 1;
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
      this.source.push("return buffer;");
    }

    var params = this.isChild ? ["depth0", "data"] : ["Handlebars", "depth0", "helpers", "partials", "data"];

    for(var i=0, l=this.environment.depths.list.length; i<l; i++) {
      params.push("depth" + this.environment.depths.list[i]);
    }

    // Perform a second pass over the output to merge content when possible
    var source = this.mergeSource();

    if (!this.isChild) {
      var revision = Handlebars.COMPILER_REVISION,
          versions = Handlebars.REVISION_CHANGES[revision];
      source = "this.compilerInfo = ["+revision+",'"+versions+"'];\n"+source;
    }

    if (asObject) {
      params.push(source);

      return Function.apply(this, params);
    } else {
      var functionSource = 'function ' + (this.name || '') + '(' + params.join(',') + ') {\n  ' + source + '}';
      Handlebars.log(Handlebars.logger.DEBUG, functionSource + "\n\n");
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

    this.source.push("if (!" + this.lastHelper + ") { " + current + " = blockHelperMissing.call(" + params.join(", ") + "); }");
  },

  // [appendContent]
  //
  // On stack, before: ...
  // On stack, after: ...
  //
  // Appends the string value of `content` to the current buffer
  appendContent: function(content) {
    this.source.push(this.appendToBuffer(this.quotedString(content)));
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
    this.source.push("if(" + local + " || " + local + " === 0) { " + this.appendToBuffer(local) + " }");
    if (this.environment.isSimple) {
      this.source.push("else { " + this.appendToBuffer("''") + " }");
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

    this.source.push(this.appendToBuffer("escapeExpression(" + this.popStack() + ")"));
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
  // On stack, after: data[id], ...
  //
  // Push the result of looking up `id` on the current data
  lookupData: function(id) {
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

    this.source.push('if (' + nextStack + ' = ' + helperName + ') { ' + nextStack + ' = ' + nextStack + '.call(' + helper.callParams + '); }');
    this.source.push('else { ' + nextStack + ' = ' + nonHelper + '; ' + nextStack + ' = typeof ' + nextStack + ' === functionType ? ' + nextStack + '.apply(depth0) : ' + nextStack + '; }');
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
    this.source.push(name + " = " + val + ";");
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

  pushStack: function(item) {
    this.flushInline();

    var stack = this.incrStack();
    if (item) {
      this.source.push(stack + " = " + item + ";");
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

      this.source.push(stack + " = (" + prefix + item + ");");
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

Handlebars.precompile = function(input, options) {
  if (input == null || (typeof input !== 'string' && input.constructor !== Handlebars.AST.ProgramNode)) {
    throw new Handlebars.Exception("You must pass a string or Handlebars AST to Handlebars.precompile. You passed " + input);
  }

  options = options || {};
  if (!('data' in options)) {
    options.data = true;
  }
  var ast = Handlebars.parse(input);
  var environment = new Compiler().compile(ast, options);
  return new JavaScriptCompiler().compile(environment, options);
};

Handlebars.compile = function(input, options) {
  if (input == null || (typeof input !== 'string' && input.constructor !== Handlebars.AST.ProgramNode)) {
    throw new Handlebars.Exception("You must pass a string or Handlebars AST to Handlebars.compile. You passed " + input);
  }

  options = options || {};
  if (!('data' in options)) {
    options.data = true;
  }
  var compiled;
  function compile() {
    var ast = Handlebars.parse(input);
    var environment = new Compiler().compile(ast, options);
    var templateSpec = new JavaScriptCompiler().compile(environment, options, undefined, true);
    return Handlebars.template(templateSpec);
  }

  // Template is only compiled on first use and cached after that point.
  return function(context, options) {
    if (!compiled) {
      compiled = compile();
    }
    return compiled.call(this, context, options);
  };
};


// END(BROWSER)

return Handlebars;

};



},{"./base":22}],24:[function(require,module,exports){
// Each of these module will augment the Handlebars object as it loads. No need to perform addition operations
module.exports.attach = function(Handlebars) {

var visitor = require("./visitor"),
    printer = require("./printer"),
    ast = require("./ast"),
    compiler = require("./compiler");

visitor.attach(Handlebars);
printer.attach(Handlebars);
ast.attach(Handlebars);
compiler.attach(Handlebars);

return Handlebars;

};

},{"./ast":21,"./compiler":23,"./printer":26,"./visitor":27}],25:[function(require,module,exports){
// BEGIN(BROWSER)
/* Jison generated parser */
var handlebars = (function(){
var parser = {trace: function trace() { },
yy: {},
symbols_: {"error":2,"root":3,"program":4,"EOF":5,"simpleInverse":6,"statements":7,"statement":8,"openInverse":9,"closeBlock":10,"openBlock":11,"mustache":12,"partial":13,"CONTENT":14,"COMMENT":15,"OPEN_BLOCK":16,"inMustache":17,"CLOSE":18,"OPEN_INVERSE":19,"OPEN_ENDBLOCK":20,"path":21,"OPEN":22,"OPEN_UNESCAPED":23,"CLOSE_UNESCAPED":24,"OPEN_PARTIAL":25,"partialName":26,"params":27,"hash":28,"dataName":29,"param":30,"STRING":31,"INTEGER":32,"BOOLEAN":33,"hashSegments":34,"hashSegment":35,"ID":36,"EQUALS":37,"DATA":38,"pathSegments":39,"SEP":40,"$accept":0,"$end":1},
terminals_: {2:"error",5:"EOF",14:"CONTENT",15:"COMMENT",16:"OPEN_BLOCK",18:"CLOSE",19:"OPEN_INVERSE",20:"OPEN_ENDBLOCK",22:"OPEN",23:"OPEN_UNESCAPED",24:"CLOSE_UNESCAPED",25:"OPEN_PARTIAL",31:"STRING",32:"INTEGER",33:"BOOLEAN",36:"ID",37:"EQUALS",38:"DATA",40:"SEP"},
productions_: [0,[3,2],[4,2],[4,3],[4,2],[4,1],[4,1],[4,0],[7,1],[7,2],[8,3],[8,3],[8,1],[8,1],[8,1],[8,1],[11,3],[9,3],[10,3],[12,3],[12,3],[13,3],[13,4],[6,2],[17,3],[17,2],[17,2],[17,1],[17,1],[27,2],[27,1],[30,1],[30,1],[30,1],[30,1],[30,1],[28,1],[34,2],[34,1],[35,3],[35,3],[35,3],[35,3],[35,3],[26,1],[26,1],[26,1],[29,2],[21,1],[39,3],[39,1]],
performAction: function anonymous(yytext,yyleng,yylineno,yy,yystate,$$,_$) {

var $0 = $$.length - 1;
switch (yystate) {
case 1: return $$[$0-1]; 
break;
case 2: this.$ = new yy.ProgramNode([], $$[$0]); 
break;
case 3: this.$ = new yy.ProgramNode($$[$0-2], $$[$0]); 
break;
case 4: this.$ = new yy.ProgramNode($$[$0-1], []); 
break;
case 5: this.$ = new yy.ProgramNode($$[$0]); 
break;
case 6: this.$ = new yy.ProgramNode([], []); 
break;
case 7: this.$ = new yy.ProgramNode([]); 
break;
case 8: this.$ = [$$[$0]]; 
break;
case 9: $$[$0-1].push($$[$0]); this.$ = $$[$0-1]; 
break;
case 10: this.$ = new yy.BlockNode($$[$0-2], $$[$0-1].inverse, $$[$0-1], $$[$0]); 
break;
case 11: this.$ = new yy.BlockNode($$[$0-2], $$[$0-1], $$[$0-1].inverse, $$[$0]); 
break;
case 12: this.$ = $$[$0]; 
break;
case 13: this.$ = $$[$0]; 
break;
case 14: this.$ = new yy.ContentNode($$[$0]); 
break;
case 15: this.$ = new yy.CommentNode($$[$0]); 
break;
case 16: this.$ = new yy.MustacheNode($$[$0-1][0], $$[$0-1][1]); 
break;
case 17: this.$ = new yy.MustacheNode($$[$0-1][0], $$[$0-1][1]); 
break;
case 18: this.$ = $$[$0-1]; 
break;
case 19:
    // Parsing out the '&' escape token at this level saves ~500 bytes after min due to the removal of one parser node.
    this.$ = new yy.MustacheNode($$[$0-1][0], $$[$0-1][1], $$[$0-2][2] === '&');
  
break;
case 20: this.$ = new yy.MustacheNode($$[$0-1][0], $$[$0-1][1], true); 
break;
case 21: this.$ = new yy.PartialNode($$[$0-1]); 
break;
case 22: this.$ = new yy.PartialNode($$[$0-2], $$[$0-1]); 
break;
case 23: 
break;
case 24: this.$ = [[$$[$0-2]].concat($$[$0-1]), $$[$0]]; 
break;
case 25: this.$ = [[$$[$0-1]].concat($$[$0]), null]; 
break;
case 26: this.$ = [[$$[$0-1]], $$[$0]]; 
break;
case 27: this.$ = [[$$[$0]], null]; 
break;
case 28: this.$ = [[$$[$0]], null]; 
break;
case 29: $$[$0-1].push($$[$0]); this.$ = $$[$0-1]; 
break;
case 30: this.$ = [$$[$0]]; 
break;
case 31: this.$ = $$[$0]; 
break;
case 32: this.$ = new yy.StringNode($$[$0]); 
break;
case 33: this.$ = new yy.IntegerNode($$[$0]); 
break;
case 34: this.$ = new yy.BooleanNode($$[$0]); 
break;
case 35: this.$ = $$[$0]; 
break;
case 36: this.$ = new yy.HashNode($$[$0]); 
break;
case 37: $$[$0-1].push($$[$0]); this.$ = $$[$0-1]; 
break;
case 38: this.$ = [$$[$0]]; 
break;
case 39: this.$ = [$$[$0-2], $$[$0]]; 
break;
case 40: this.$ = [$$[$0-2], new yy.StringNode($$[$0])]; 
break;
case 41: this.$ = [$$[$0-2], new yy.IntegerNode($$[$0])]; 
break;
case 42: this.$ = [$$[$0-2], new yy.BooleanNode($$[$0])]; 
break;
case 43: this.$ = [$$[$0-2], $$[$0]]; 
break;
case 44: this.$ = new yy.PartialNameNode($$[$0]); 
break;
case 45: this.$ = new yy.PartialNameNode(new yy.StringNode($$[$0])); 
break;
case 46: this.$ = new yy.PartialNameNode(new yy.IntegerNode($$[$0])); 
break;
case 47: this.$ = new yy.DataNode($$[$0]); 
break;
case 48: this.$ = new yy.IdNode($$[$0]); 
break;
case 49: $$[$0-2].push({part: $$[$0], separator: $$[$0-1]}); this.$ = $$[$0-2]; 
break;
case 50: this.$ = [{part: $$[$0]}]; 
break;
}
},
table: [{3:1,4:2,5:[2,7],6:3,7:4,8:6,9:7,11:8,12:9,13:10,14:[1,11],15:[1,12],16:[1,13],19:[1,5],22:[1,14],23:[1,15],25:[1,16]},{1:[3]},{5:[1,17]},{5:[2,6],7:18,8:6,9:7,11:8,12:9,13:10,14:[1,11],15:[1,12],16:[1,13],19:[1,19],20:[2,6],22:[1,14],23:[1,15],25:[1,16]},{5:[2,5],6:20,8:21,9:7,11:8,12:9,13:10,14:[1,11],15:[1,12],16:[1,13],19:[1,5],20:[2,5],22:[1,14],23:[1,15],25:[1,16]},{17:23,18:[1,22],21:24,29:25,36:[1,28],38:[1,27],39:26},{5:[2,8],14:[2,8],15:[2,8],16:[2,8],19:[2,8],20:[2,8],22:[2,8],23:[2,8],25:[2,8]},{4:29,6:3,7:4,8:6,9:7,11:8,12:9,13:10,14:[1,11],15:[1,12],16:[1,13],19:[1,5],20:[2,7],22:[1,14],23:[1,15],25:[1,16]},{4:30,6:3,7:4,8:6,9:7,11:8,12:9,13:10,14:[1,11],15:[1,12],16:[1,13],19:[1,5],20:[2,7],22:[1,14],23:[1,15],25:[1,16]},{5:[2,12],14:[2,12],15:[2,12],16:[2,12],19:[2,12],20:[2,12],22:[2,12],23:[2,12],25:[2,12]},{5:[2,13],14:[2,13],15:[2,13],16:[2,13],19:[2,13],20:[2,13],22:[2,13],23:[2,13],25:[2,13]},{5:[2,14],14:[2,14],15:[2,14],16:[2,14],19:[2,14],20:[2,14],22:[2,14],23:[2,14],25:[2,14]},{5:[2,15],14:[2,15],15:[2,15],16:[2,15],19:[2,15],20:[2,15],22:[2,15],23:[2,15],25:[2,15]},{17:31,21:24,29:25,36:[1,28],38:[1,27],39:26},{17:32,21:24,29:25,36:[1,28],38:[1,27],39:26},{17:33,21:24,29:25,36:[1,28],38:[1,27],39:26},{21:35,26:34,31:[1,36],32:[1,37],36:[1,28],39:26},{1:[2,1]},{5:[2,2],8:21,9:7,11:8,12:9,13:10,14:[1,11],15:[1,12],16:[1,13],19:[1,19],20:[2,2],22:[1,14],23:[1,15],25:[1,16]},{17:23,21:24,29:25,36:[1,28],38:[1,27],39:26},{5:[2,4],7:38,8:6,9:7,11:8,12:9,13:10,14:[1,11],15:[1,12],16:[1,13],19:[1,19],20:[2,4],22:[1,14],23:[1,15],25:[1,16]},{5:[2,9],14:[2,9],15:[2,9],16:[2,9],19:[2,9],20:[2,9],22:[2,9],23:[2,9],25:[2,9]},{5:[2,23],14:[2,23],15:[2,23],16:[2,23],19:[2,23],20:[2,23],22:[2,23],23:[2,23],25:[2,23]},{18:[1,39]},{18:[2,27],21:44,24:[2,27],27:40,28:41,29:48,30:42,31:[1,45],32:[1,46],33:[1,47],34:43,35:49,36:[1,50],38:[1,27],39:26},{18:[2,28],24:[2,28]},{18:[2,48],24:[2,48],31:[2,48],32:[2,48],33:[2,48],36:[2,48],38:[2,48],40:[1,51]},{21:52,36:[1,28],39:26},{18:[2,50],24:[2,50],31:[2,50],32:[2,50],33:[2,50],36:[2,50],38:[2,50],40:[2,50]},{10:53,20:[1,54]},{10:55,20:[1,54]},{18:[1,56]},{18:[1,57]},{24:[1,58]},{18:[1,59],21:60,36:[1,28],39:26},{18:[2,44],36:[2,44]},{18:[2,45],36:[2,45]},{18:[2,46],36:[2,46]},{5:[2,3],8:21,9:7,11:8,12:9,13:10,14:[1,11],15:[1,12],16:[1,13],19:[1,19],20:[2,3],22:[1,14],23:[1,15],25:[1,16]},{14:[2,17],15:[2,17],16:[2,17],19:[2,17],20:[2,17],22:[2,17],23:[2,17],25:[2,17]},{18:[2,25],21:44,24:[2,25],28:61,29:48,30:62,31:[1,45],32:[1,46],33:[1,47],34:43,35:49,36:[1,50],38:[1,27],39:26},{18:[2,26],24:[2,26]},{18:[2,30],24:[2,30],31:[2,30],32:[2,30],33:[2,30],36:[2,30],38:[2,30]},{18:[2,36],24:[2,36],35:63,36:[1,64]},{18:[2,31],24:[2,31],31:[2,31],32:[2,31],33:[2,31],36:[2,31],38:[2,31]},{18:[2,32],24:[2,32],31:[2,32],32:[2,32],33:[2,32],36:[2,32],38:[2,32]},{18:[2,33],24:[2,33],31:[2,33],32:[2,33],33:[2,33],36:[2,33],38:[2,33]},{18:[2,34],24:[2,34],31:[2,34],32:[2,34],33:[2,34],36:[2,34],38:[2,34]},{18:[2,35],24:[2,35],31:[2,35],32:[2,35],33:[2,35],36:[2,35],38:[2,35]},{18:[2,38],24:[2,38],36:[2,38]},{18:[2,50],24:[2,50],31:[2,50],32:[2,50],33:[2,50],36:[2,50],37:[1,65],38:[2,50],40:[2,50]},{36:[1,66]},{18:[2,47],24:[2,47],31:[2,47],32:[2,47],33:[2,47],36:[2,47],38:[2,47]},{5:[2,10],14:[2,10],15:[2,10],16:[2,10],19:[2,10],20:[2,10],22:[2,10],23:[2,10],25:[2,10]},{21:67,36:[1,28],39:26},{5:[2,11],14:[2,11],15:[2,11],16:[2,11],19:[2,11],20:[2,11],22:[2,11],23:[2,11],25:[2,11]},{14:[2,16],15:[2,16],16:[2,16],19:[2,16],20:[2,16],22:[2,16],23:[2,16],25:[2,16]},{5:[2,19],14:[2,19],15:[2,19],16:[2,19],19:[2,19],20:[2,19],22:[2,19],23:[2,19],25:[2,19]},{5:[2,20],14:[2,20],15:[2,20],16:[2,20],19:[2,20],20:[2,20],22:[2,20],23:[2,20],25:[2,20]},{5:[2,21],14:[2,21],15:[2,21],16:[2,21],19:[2,21],20:[2,21],22:[2,21],23:[2,21],25:[2,21]},{18:[1,68]},{18:[2,24],24:[2,24]},{18:[2,29],24:[2,29],31:[2,29],32:[2,29],33:[2,29],36:[2,29],38:[2,29]},{18:[2,37],24:[2,37],36:[2,37]},{37:[1,65]},{21:69,29:73,31:[1,70],32:[1,71],33:[1,72],36:[1,28],38:[1,27],39:26},{18:[2,49],24:[2,49],31:[2,49],32:[2,49],33:[2,49],36:[2,49],38:[2,49],40:[2,49]},{18:[1,74]},{5:[2,22],14:[2,22],15:[2,22],16:[2,22],19:[2,22],20:[2,22],22:[2,22],23:[2,22],25:[2,22]},{18:[2,39],24:[2,39],36:[2,39]},{18:[2,40],24:[2,40],36:[2,40]},{18:[2,41],24:[2,41],36:[2,41]},{18:[2,42],24:[2,42],36:[2,42]},{18:[2,43],24:[2,43],36:[2,43]},{5:[2,18],14:[2,18],15:[2,18],16:[2,18],19:[2,18],20:[2,18],22:[2,18],23:[2,18],25:[2,18]}],
defaultActions: {17:[2,1]},
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

var YYSTATE=YY_START
switch($avoiding_name_collisions) {
case 0: yy_.yytext = "\\"; return 14; 
break;
case 1:
                                   if(yy_.yytext.slice(-1) !== "\\") this.begin("mu");
                                   if(yy_.yytext.slice(-1) === "\\") yy_.yytext = yy_.yytext.substr(0,yy_.yyleng-1), this.begin("emu");
                                   if(yy_.yytext) return 14;
                                 
break;
case 2: return 14; 
break;
case 3:
                                   if(yy_.yytext.slice(-1) !== "\\") this.popState();
                                   if(yy_.yytext.slice(-1) === "\\") yy_.yytext = yy_.yytext.substr(0,yy_.yyleng-1);
                                   return 14;
                                 
break;
case 4: yy_.yytext = yy_.yytext.substr(0, yy_.yyleng-4); this.popState(); return 15; 
break;
case 5: return 25; 
break;
case 6: return 16; 
break;
case 7: return 20; 
break;
case 8: return 19; 
break;
case 9: return 19; 
break;
case 10: return 23; 
break;
case 11: return 22; 
break;
case 12: this.popState(); this.begin('com'); 
break;
case 13: yy_.yytext = yy_.yytext.substr(3,yy_.yyleng-5); this.popState(); return 15; 
break;
case 14: return 22; 
break;
case 15: return 37; 
break;
case 16: return 36; 
break;
case 17: return 36; 
break;
case 18: return 40; 
break;
case 19: /*ignore whitespace*/ 
break;
case 20: this.popState(); return 24; 
break;
case 21: this.popState(); return 18; 
break;
case 22: yy_.yytext = yy_.yytext.substr(1,yy_.yyleng-2).replace(/\\"/g,'"'); return 31; 
break;
case 23: yy_.yytext = yy_.yytext.substr(1,yy_.yyleng-2).replace(/\\'/g,"'"); return 31; 
break;
case 24: return 38; 
break;
case 25: return 33; 
break;
case 26: return 33; 
break;
case 27: return 32; 
break;
case 28: return 36; 
break;
case 29: yy_.yytext = yy_.yytext.substr(1, yy_.yyleng-2); return 36; 
break;
case 30: return 'INVALID'; 
break;
case 31: return 5; 
break;
}
};
lexer.rules = [/^(?:\\\\(?=(\{\{)))/,/^(?:[^\x00]*?(?=(\{\{)))/,/^(?:[^\x00]+)/,/^(?:[^\x00]{2,}?(?=(\{\{|$)))/,/^(?:[\s\S]*?--\}\})/,/^(?:\{\{>)/,/^(?:\{\{#)/,/^(?:\{\{\/)/,/^(?:\{\{\^)/,/^(?:\{\{\s*else\b)/,/^(?:\{\{\{)/,/^(?:\{\{&)/,/^(?:\{\{!--)/,/^(?:\{\{![\s\S]*?\}\})/,/^(?:\{\{)/,/^(?:=)/,/^(?:\.(?=[}\/ ]))/,/^(?:\.\.)/,/^(?:[\/.])/,/^(?:\s+)/,/^(?:\}\}\})/,/^(?:\}\})/,/^(?:"(\\["]|[^"])*")/,/^(?:'(\\[']|[^'])*')/,/^(?:@)/,/^(?:true(?=[}\s]))/,/^(?:false(?=[}\s]))/,/^(?:-?[0-9]+(?=[}\s]))/,/^(?:[^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=[=}\s\/.]))/,/^(?:\[[^\]]*\])/,/^(?:.)/,/^(?:$)/];
lexer.conditions = {"mu":{"rules":[5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31],"inclusive":false},"emu":{"rules":[3],"inclusive":false},"com":{"rules":[4],"inclusive":false},"INITIAL":{"rules":[0,1,2,31],"inclusive":true}};
return lexer;})()
parser.lexer = lexer;
function Parser () { this.yy = {}; }Parser.prototype = parser;parser.Parser = Parser;
return new Parser;
})();
// END(BROWSER)

module.exports = handlebars;

},{}],26:[function(require,module,exports){
exports.attach = function(Handlebars) {

// BEGIN(BROWSER)

Handlebars.print = function(ast) {
  return new Handlebars.PrintVisitor().accept(ast);
};

Handlebars.PrintVisitor = function() { this.padding = 0; };
Handlebars.PrintVisitor.prototype = new Handlebars.Visitor();

Handlebars.PrintVisitor.prototype.pad = function(string, newline) {
  var out = "";

  for(var i=0,l=this.padding; i<l; i++) {
    out = out + "  ";
  }

  out = out + string;

  if(newline !== false) { out = out + "\n"; }
  return out;
};

Handlebars.PrintVisitor.prototype.program = function(program) {
  var out = "",
      statements = program.statements,
      inverse = program.inverse,
      i, l;

  for(i=0, l=statements.length; i<l; i++) {
    out = out + this.accept(statements[i]);
  }

  this.padding--;

  return out;
};

Handlebars.PrintVisitor.prototype.block = function(block) {
  var out = "";

  out = out + this.pad("BLOCK:");
  this.padding++;
  out = out + this.accept(block.mustache);
  if (block.program) {
    out = out + this.pad("PROGRAM:");
    this.padding++;
    out = out + this.accept(block.program);
    this.padding--;
  }
  if (block.inverse) {
    if (block.program) { this.padding++; }
    out = out + this.pad("{{^}}");
    this.padding++;
    out = out + this.accept(block.inverse);
    this.padding--;
    if (block.program) { this.padding--; }
  }
  this.padding--;

  return out;
};

Handlebars.PrintVisitor.prototype.mustache = function(mustache) {
  var params = mustache.params, paramStrings = [], hash;

  for(var i=0, l=params.length; i<l; i++) {
    paramStrings.push(this.accept(params[i]));
  }

  params = "[" + paramStrings.join(", ") + "]";

  hash = mustache.hash ? " " + this.accept(mustache.hash) : "";

  return this.pad("{{ " + this.accept(mustache.id) + " " + params + hash + " }}");
};

Handlebars.PrintVisitor.prototype.partial = function(partial) {
  var content = this.accept(partial.partialName);
  if(partial.context) { content = content + " " + this.accept(partial.context); }
  return this.pad("{{> " + content + " }}");
};

Handlebars.PrintVisitor.prototype.hash = function(hash) {
  var pairs = hash.pairs;
  var joinedPairs = [], left, right;

  for(var i=0, l=pairs.length; i<l; i++) {
    left = pairs[i][0];
    right = this.accept(pairs[i][1]);
    joinedPairs.push( left + "=" + right );
  }

  return "HASH{" + joinedPairs.join(", ") + "}";
};

Handlebars.PrintVisitor.prototype.STRING = function(string) {
  return '"' + string.string + '"';
};

Handlebars.PrintVisitor.prototype.INTEGER = function(integer) {
  return "INTEGER{" + integer.integer + "}";
};

Handlebars.PrintVisitor.prototype.BOOLEAN = function(bool) {
  return "BOOLEAN{" + bool.bool + "}";
};

Handlebars.PrintVisitor.prototype.ID = function(id) {
  var path = id.parts.join("/");
  if(id.parts.length > 1) {
    return "PATH:" + path;
  } else {
    return "ID:" + path;
  }
};

Handlebars.PrintVisitor.prototype.PARTIAL_NAME = function(partialName) {
    return "PARTIAL:" + partialName.name;
};

Handlebars.PrintVisitor.prototype.DATA = function(data) {
  return "@" + this.accept(data.id);
};

Handlebars.PrintVisitor.prototype.content = function(content) {
  return this.pad("CONTENT[ '" + content.string + "' ]");
};

Handlebars.PrintVisitor.prototype.comment = function(comment) {
  return this.pad("{{! '" + comment.comment + "' }}");
};
// END(BROWSER)

return Handlebars;
};


},{}],27:[function(require,module,exports){
exports.attach = function(Handlebars) {

// BEGIN(BROWSER)

Handlebars.Visitor = function() {};

Handlebars.Visitor.prototype = {
  accept: function(object) {
    return this[object.type](object);
  }
};

// END(BROWSER)

return Handlebars;
};



},{}],28:[function(require,module,exports){
exports.attach = function(Handlebars) {

// BEGIN(BROWSER)

Handlebars.VM = {
  template: function(templateSpec) {
    // Just add water
    var container = {
      escapeExpression: Handlebars.Utils.escapeExpression,
      invokePartial: Handlebars.VM.invokePartial,
      programs: [],
      program: function(i, fn, data) {
        var programWrapper = this.programs[i];
        if(data) {
          programWrapper = Handlebars.VM.program(i, fn, data);
        } else if (!programWrapper) {
          programWrapper = this.programs[i] = Handlebars.VM.program(i, fn);
        }
        return programWrapper;
      },
      merge: function(param, common) {
        var ret = param || common;

        if (param && common) {
          ret = {};
          Handlebars.Utils.extend(ret, common);
          Handlebars.Utils.extend(ret, param);
        }
        return ret;
      },
      programWithDepth: Handlebars.VM.programWithDepth,
      noop: Handlebars.VM.noop,
      compilerInfo: null
    };

    return function(context, options) {
      options = options || {};
      var result = templateSpec.call(container, Handlebars, context, options.helpers, options.partials, options.data);

      var compilerInfo = container.compilerInfo || [],
          compilerRevision = compilerInfo[0] || 1,
          currentRevision = Handlebars.COMPILER_REVISION;

      if (compilerRevision !== currentRevision) {
        if (compilerRevision < currentRevision) {
          var runtimeVersions = Handlebars.REVISION_CHANGES[currentRevision],
              compilerVersions = Handlebars.REVISION_CHANGES[compilerRevision];
          throw "Template was precompiled with an older version of Handlebars than the current runtime. "+
                "Please update your precompiler to a newer version ("+runtimeVersions+") or downgrade your runtime to an older version ("+compilerVersions+").";
        } else {
          // Use the embedded version info since the runtime doesn't know about this revision yet
          throw "Template was precompiled with a newer version of Handlebars than the current runtime. "+
                "Please update your runtime to a newer version ("+compilerInfo[1]+").";
        }
      }

      return result;
    };
  },

  programWithDepth: function(i, fn, data /*, $depth */) {
    var args = Array.prototype.slice.call(arguments, 3);

    var program = function(context, options) {
      options = options || {};

      return fn.apply(this, [context, options.data || data].concat(args));
    };
    program.program = i;
    program.depth = args.length;
    return program;
  },
  program: function(i, fn, data) {
    var program = function(context, options) {
      options = options || {};

      return fn(context, options.data || data);
    };
    program.program = i;
    program.depth = 0;
    return program;
  },
  noop: function() { return ""; },
  invokePartial: function(partial, name, context, helpers, partials, data) {
    var options = { helpers: helpers, partials: partials, data: data };

    if(partial === undefined) {
      throw new Handlebars.Exception("The partial " + name + " could not be found");
    } else if(partial instanceof Function) {
      return partial(context, options);
    } else if (!Handlebars.compile) {
      throw new Handlebars.Exception("The partial " + name + " could not be compiled when running in runtime-only mode");
    } else {
      partials[name] = Handlebars.compile(partial, {data: data !== undefined});
      return partials[name](context, options);
    }
  }
};

Handlebars.template = Handlebars.VM.template;

// END(BROWSER)

return Handlebars;

};

},{}],29:[function(require,module,exports){
exports.attach = function(Handlebars) {

var toString = Object.prototype.toString;

// BEGIN(BROWSER)

var errorProps = ['description', 'fileName', 'lineNumber', 'message', 'name', 'number', 'stack'];

Handlebars.Exception = function(message) {
  var tmp = Error.prototype.constructor.apply(this, arguments);

  // Unfortunately errors are not enumerable in Chrome (at least), so `for prop in tmp` doesn't work.
  for (var idx = 0; idx < errorProps.length; idx++) {
    this[errorProps[idx]] = tmp[errorProps[idx]];
  }
};
Handlebars.Exception.prototype = new Error();

// Build out our basic SafeString type
Handlebars.SafeString = function(string) {
  this.string = string;
};
Handlebars.SafeString.prototype.toString = function() {
  return this.string.toString();
};

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

var escapeChar = function(chr) {
  return escape[chr] || "&amp;";
};

Handlebars.Utils = {
  extend: function(obj, value) {
    for(var key in value) {
      if(value.hasOwnProperty(key)) {
        obj[key] = value[key];
      }
    }
  },

  escapeExpression: function(string) {
    // don't escape SafeStrings, since they're already safe
    if (string instanceof Handlebars.SafeString) {
      return string.toString();
    } else if (string == null || string === false) {
      return "";
    }

    // Force a string conversion as this will be done by the append regardless and
    // the regex test will do this transparently behind the scenes, causing issues if
    // an object's to string has escaped characters in it.
    string = string.toString();

    if(!possible.test(string)) { return string; }
    return string.replace(badChars, escapeChar);
  },

  isEmpty: function(value) {
    if (!value && value !== 0) {
      return true;
    } else if(toString.call(value) === "[object Array]" && value.length === 0) {
      return true;
    } else {
      return false;
    }
  }
};

// END(BROWSER)

return Handlebars;
};

},{}],30:[function(require,module,exports){
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

},{"./Tokenizer.js":31,"events":18,"util":19}],31:[function(require,module,exports){
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
/**
 * Expose `requestAnimationFrame()`.
 */

exports = module.exports = window.requestAnimationFrame
  || window.webkitRequestAnimationFrame
  || window.mozRequestAnimationFrame
  || window.oRequestAnimationFrame
  || window.msRequestAnimationFrame
  || fallback;

/**
 * Fallback implementation.
 */

var prev = new Date().getTime();
function fallback(fn) {
  var curr = new Date().getTime();
  var ms = Math.max(0, 16 - (curr - prev));
  var req = setTimeout(fn, ms);
  prev = curr;
  return req;
}

/**
 * Cancel.
 */

var cancel = window.cancelAnimationFrame
  || window.webkitCancelAnimationFrame
  || window.mozCancelAnimationFrame
  || window.oCancelAnimationFrame
  || window.msCancelAnimationFrame
  || window.clearTimeout;

exports.cancel = function(id){
  cancel.call(window, id);
};

},{}]},{},[1])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9kb21iYXJzLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbGliL2Jhc2UuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvY29tcGlsZXIvYXN0LmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbGliL2NvbXBpbGVyL2Jhc2UuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvY29tcGlsZXIvY29tcGlsZXJzL2F0dHJpYnV0ZXMuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvY29tcGlsZXIvY29tcGlsZXJzL2Jhc2UuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvY29tcGlsZXIvY29tcGlsZXJzL2NvbW1vbi5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi9jb21waWxlci9jb21waWxlcnMvamF2YXNjcmlwdC5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi9jb21waWxlci9ldmVudHMuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvY29tcGlsZXIvaW5kZXguanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvY29tcGlsZXIvcGFyc2VyLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbGliL2NvbXBpbGVyL3ByaW50ZXIuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvY29tcGlsZXIvdmlzaXRvci5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL2xpYi9oYW5kbGViYXJzLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbGliL3J1bnRpbWUuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9saWIvdXRpbHMuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1idWlsdGlucy9idWlsdGluL19zaGltcy5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLWJ1aWx0aW5zL2J1aWx0aW4vZXZlbnRzLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItYnVpbHRpbnMvYnVpbHRpbi91dGlsLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvYmFzZS5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2NvbXBpbGVyL2FzdC5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2NvbXBpbGVyL2Jhc2UuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy9jb21waWxlci9jb21waWxlci5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2NvbXBpbGVyL2luZGV4LmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvY29tcGlsZXIvcGFyc2VyLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvY29tcGlsZXIvcHJpbnRlci5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2NvbXBpbGVyL3Zpc2l0b3IuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy9ydW50aW1lLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvdXRpbHMuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvaHRtbHBhcnNlcjIvbGliL1BhcnNlci5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9odG1scGFyc2VyMi9saWIvVG9rZW5pemVyLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL2h0bWxwYXJzZXIyL2xpYi9lbnRpdGllcy9kZWNvZGUuanNvbiIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9odG1scGFyc2VyMi9saWIvZW50aXRpZXMvZW50aXRpZXMuanNvbiIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9kb21iYXJzL25vZGVfbW9kdWxlcy9odG1scGFyc2VyMi9saWIvZW50aXRpZXMvbGVnYWN5Lmpzb24iLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvZG9tYmFycy9ub2RlX21vZHVsZXMvaHRtbHBhcnNlcjIvbGliL2VudGl0aWVzL3htbC5qc29uIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2RvbWJhcnMvbm9kZV9tb2R1bGVzL3JhZi1jb21wb25lbnQvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDblBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4TUE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1ZUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdlJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9oQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6eENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25lQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1MkJBO0FBQ0E7O0FDREE7O0FDQUE7O0FDQUE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgYmFzZSAgICAgPSByZXF1aXJlKCcuL2xpYi9iYXNlJyk7XG52YXIgY29tcGlsZXIgPSByZXF1aXJlKCcuL2xpYi9jb21waWxlcicpO1xudmFyIHV0aWxzICAgID0gcmVxdWlyZSgnLi9saWIvdXRpbHMnKTtcbnZhciBydW50aW1lICA9IHJlcXVpcmUoJy4vbGliL3J1bnRpbWUnKTtcblxuLyoqXG4gKiBHZW5lcmF0ZSB0aGUgYmFzZSBET01CYXJzIG9iamVjdC5cbiAqXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cbm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uIGNyZWF0ZSAoKSB7XG4gIHZhciBET01CYXJzID0gYmFzZS5jcmVhdGUoKTtcblxuICB1dGlscy5hdHRhY2goRE9NQmFycyk7XG4gIGNvbXBpbGVyLmF0dGFjaChET01CYXJzKTtcbiAgcnVudGltZS5hdHRhY2goRE9NQmFycyk7XG5cbiAgRE9NQmFycy5jcmVhdGUgICAgID0gY3JlYXRlO1xuICBET01CYXJzLkhhbmRsZWJhcnMgPSByZXF1aXJlKCcuL2xpYi9oYW5kbGViYXJzJyk7XG5cbiAgcmV0dXJuIERPTUJhcnM7XG59KSgpO1xuIiwidmFyIGJhc2UgPSByZXF1aXJlKCdoYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2Jhc2UnKTtcblxuZXhwb3J0cy5jcmVhdGUgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBET01CYXJzID0gYmFzZS5jcmVhdGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAvKipcbiAgICogTm9vcCBmdW5jdGlvbnMgZm9yIHN1YnNjcmliZSBhbmQgdW5zdWJzY3JpYmUuIEltcGxlbWVudCB5b3VyIG93biBmdW5jdGlvbi5cbiAgICovXG4gIERPTUJhcnMuc3Vic2NyaWJlID0gRE9NQmFycy51bnN1YnNjcmliZSA9IGZ1bmN0aW9uICgpIHt9O1xuXG4gIC8qKlxuICAgKiBCYXNpYyBnZXR0ZXIgZnVuY3Rpb24uIEF0dGFjaCB0aGlzIGhvd2V2ZXIgeW91IHdhbnQgaXQgdG8gd29yay5cbiAgICpcbiAgICogQHBhcmFtICB7T2JqZWN0fSBvYmplY3RcbiAgICogQHBhcmFtICB7U3RyaW5nfSBwcm9wZXJ0eVxuICAgKiBAcmV0dXJuIHsqfVxuICAgKi9cbiAgRE9NQmFycy5nZXQgPSBmdW5jdGlvbiAob2JqZWN0LCBwcm9wZXJ0eSkge1xuICAgIHJldHVybiBvYmplY3RbcHJvcGVydHldO1xuICB9O1xuXG4gIC8qKlxuICAgKiBIYW5kbGViYXJzIGBlYWNoYCBoZWxwZXIgaXMgaW5jb21wYXRpYmFibGUgd2l0aCBET01CYXJzLCBzaW5jZSBpdCBhc3N1bWVzXG4gICAqIHN0cmluZ3MgKGFzIG9wcG9zZWQgdG8gZG9jdW1lbnQgZnJhZ21lbnRzKS5cbiAgICpcbiAgICogQHBhcmFtICB7T2JqZWN0fSBjb250ZXh0XG4gICAqIEBwYXJhbSAge09iamVjdH0gb3B0aW9uc1xuICAgKiBAcmV0dXJuIHtOb2RlfVxuICAgKi9cbiAgRE9NQmFycy5yZWdpc3RlckhlbHBlcignZWFjaCcsIGZ1bmN0aW9uIChjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgdmFyIGZuICAgICAgPSBvcHRpb25zLmZuO1xuICAgIHZhciBpbnZlcnNlID0gb3B0aW9ucy5pbnZlcnNlO1xuICAgIHZhciBidWZmZXIgID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgIHZhciBpICAgICAgID0gMDtcbiAgICB2YXIgZGF0YTtcblxuICAgIGlmICh0eXBlb2YgY29udGV4dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5kYXRhKSB7XG4gICAgICBkYXRhID0gRE9NQmFycy5jcmVhdGVGcmFtZShvcHRpb25zLmRhdGEpO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgY29udGV4dCA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHZhciBsZW4gPSBjb250ZXh0Lmxlbmd0aDtcblxuICAgICAgaWYgKGxlbiA9PT0gK2xlbikge1xuICAgICAgICBmb3IgKDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgaWYgKGRhdGEpIHsgZGF0YS5pbmRleCA9IGk7IH1cbiAgICAgICAgICBidWZmZXIuYXBwZW5kQ2hpbGQoZm4oY29udGV4dFtpXSwgeyBkYXRhOiBkYXRhIH0pKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIGNvbnRleHQpIHtcbiAgICAgICAgICBpZiAoY29udGV4dC5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICBpZiAoZGF0YSkgeyBkYXRhLmtleSA9IGtleTsgfVxuICAgICAgICAgICAgYnVmZmVyLmFwcGVuZENoaWxkKGZuKGNvbnRleHRba2V5XSwgeyBkYXRhOiBkYXRhIH0pKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoaSA9PT0gMCkge1xuICAgICAgcmV0dXJuIGludmVyc2UodGhpcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSk7XG5cbiAgcmV0dXJuIERPTUJhcnM7XG59O1xuXG4iLCJ2YXIgYXN0ID0gcmVxdWlyZSgnaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy9jb21waWxlci9hc3QnKTtcblxuLyoqXG4gKiBBdHRhY2ggdGhlIEFTVCBvYmplY3QgcmVwcmVzZW50YXRpb25zIHRvIHRoZSBET01CYXJzIGluc3RhbmNlLlxuICpcbiAqIEBwYXJhbSAge09iamVjdH0gRE9NQmFyc1xuICogQHJldHVybiB7T2JqZWN0fVxuICovXG5leHBvcnRzLmF0dGFjaCA9IGZ1bmN0aW9uIChET01CYXJzKSB7XG4gIHZhciBBU1QgPSBhc3QuYXR0YWNoKERPTUJhcnMpLkFTVDtcbiAgdmFyIERPTSA9IEFTVC5ET00gPSB7fTtcblxuICAvKipcbiAgICogQ3JlYXRlIGFuIEFTVCBub2RlIGZvciByZXByZXNlbnRpbmcgYW4gZWxlbWVudC5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IG5hbWVcbiAgICogQHBhcmFtIHtPYmplY3R9IGF0dHJpYnV0ZXNcbiAgICogQHBhcmFtIHtPYmplY3R9IGNvbnRlbnRcbiAgICovXG4gIERPTS5FbGVtZW50ID0gZnVuY3Rpb24gKG5hbWUsIGF0dHJpYnV0ZXMsIGNvbnRlbnQpIHtcbiAgICB0aGlzLnR5cGUgICAgICAgPSAnRE9NX0VMRU1FTlQnO1xuICAgIHRoaXMubmFtZSAgICAgICA9IG5hbWU7XG4gICAgdGhpcy5hdHRyaWJ1dGVzID0gYXR0cmlidXRlcztcbiAgICB0aGlzLmNvbnRlbnQgICAgPSBjb250ZW50O1xuICB9O1xuXG4gIC8qKlxuICAgKiBDcmVhdGUgYW4gQVNUIG5vZGUgZm9yIHJlcHJlc2VudGluZyBhbiBlbGVtZW50IGF0dHJpYnV0ZS5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IG5hbWVcbiAgICogQHBhcmFtIHtPYmplY3R9IHZhbHVlXG4gICAqL1xuICBET00uQXR0cmlidXRlID0gZnVuY3Rpb24gKG5hbWUsIHZhbHVlKSB7XG4gICAgdGhpcy50eXBlICA9ICdET01fQVRUUklCVVRFJztcbiAgICB0aGlzLm5hbWUgID0gbmFtZTtcbiAgICB0aGlzLnZhbHVlID0gdmFsdWU7XG4gIH07XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhbiBBU1Qgbm9kZSBmb3IgcmVwcmVzZW50aW5nIGEgY29tbWVudCBub2RlLlxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gdGV4dFxuICAgKi9cbiAgRE9NLkNvbW1lbnQgPSBmdW5jdGlvbiAodGV4dCkge1xuICAgIHRoaXMudHlwZSA9ICdET01fQ09NTUVOVCc7XG4gICAgdGhpcy50ZXh0ID0gdGV4dDtcbiAgfTtcblxuICByZXR1cm4gRE9NQmFycztcbn07XG4iLCJ2YXIgYmFzZSA9IHJlcXVpcmUoJ2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvY29tcGlsZXIvYmFzZScpO1xuXG4vKipcbiAqIEF0dGFjaCB0aGUgYmFzZSBjb21waWxlciBmdW5jdGlvbmFsaXR5IHRvIHRoZSBET01CYXJzIG9iamVjdC5cbiAqXG4gKiBAcGFyYW0gIHtPYmplY3R9IERPTUJhcnNcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqL1xuZXhwb3J0cy5hdHRhY2ggPSBmdW5jdGlvbiAoRE9NQmFycykge1xuICBiYXNlLmF0dGFjaChET01CYXJzKTtcblxuICBET01CYXJzLlBhcnNlciA9IHJlcXVpcmUoJy4vcGFyc2VyJyk7XG4gIERPTUJhcnMuUGFyc2VyLnl5ID0gRE9NQmFycy5BU1Q7XG5cbiAgRE9NQmFycy5Db21waWxlciAgICAgICAgICAgPSByZXF1aXJlKCcuL2NvbXBpbGVycy9iYXNlJyk7XG4gIERPTUJhcnMuSmF2YVNjcmlwdENvbXBpbGVyID0gcmVxdWlyZSgnLi9jb21waWxlcnMvamF2YXNjcmlwdCcpO1xuXG4gIC8qKlxuICAgKiBDaGVjayB0aGUgYXJndW1lbnRzIHBhc3NlZCBpbnRvIHRoZSBjb21waWxhdGlvbiBmdW5jdGlvbnMgYmVmb3JlIHRyeWluZyB0b1xuICAgKiBjb21waWxlIHRoZSBhcyBhIHByb2dyYW0uXG4gICAqXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICAgKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAgICovXG4gIHZhciBjb21waWxlUHJlY2hlY2sgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGlucHV0LCBvcHRpb25zKSB7XG4gICAgICBpZiAodHlwZW9mIGlucHV0ICE9PSAnc3RyaW5nJykge1xuICAgICAgICBpZiAoIShpbnB1dCBpbnN0YW5jZW9mIERPTUJhcnMuQVNULlByb2dyYW1Ob2RlKSkge1xuICAgICAgICAgIHRocm93IG5ldyBET01CYXJzLkV4Y2VwdGlvbihcbiAgICAgICAgICAgICdZb3UgbXVzdCBwYXNzIGEgc3RyaW5nIG9yIERPTUJhcnMgQVNUIHRvIERPTUJhcnMucHJlY29tcGlsZS4gJyArXG4gICAgICAgICAgICAnWW91IHBhc3NlZCAnICsgaW5wdXRcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgICBpZiAoISgnZGF0YScgaW4gb3B0aW9ucykpIHtcbiAgICAgICAgb3B0aW9ucy5kYXRhID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGZuKGlucHV0LCBvcHRpb25zKTtcbiAgICB9O1xuICB9O1xuXG4gIC8qKlxuICAgKiBQcmVjb21waWxlIGdlbmVyYXRlcyBhIHN0cmluZy1iYXNlZCBKYXZhU2NyaXB0IGZ1bmN0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IGlucHV0XG4gICAqIEBwYXJhbSAge09iamVjdH0gb3B0aW9uc1xuICAgKiBAcmV0dXJuIHtTdHJpbmd9XG4gICAqL1xuICBET01CYXJzLnByZWNvbXBpbGUgPSBjb21waWxlUHJlY2hlY2soZnVuY3Rpb24gKGlucHV0LCBvcHRpb25zKSB7XG4gICAgdmFyIGFzdCAgICAgICAgID0gRE9NQmFycy5wYXJzZShpbnB1dCk7XG4gICAgdmFyIGVudmlyb25tZW50ID0gbmV3IERPTUJhcnMuQ29tcGlsZXIoKS5jb21waWxlKGFzdCwgb3B0aW9ucyk7XG4gICAgcmV0dXJuIG5ldyBET01CYXJzLkphdmFTY3JpcHRDb21waWxlcigpLmNvbXBpbGUoZW52aXJvbm1lbnQsIG9wdGlvbnMpO1xuICB9KTtcblxuICAvKipcbiAgICogQ29tcGlsYXRpb24gcmV0dXJuIGEgZnVuY3Rpb24gdGhhdCBpcyBpbW1lZGlhdGVseSByZWFkeSBmb3IgZXhlY3V0aW9uIGFzIGFcbiAgICogdGVtcGxhdGUuXG4gICAqXG4gICAqIEBwYXJhbSAge1N0cmluZ30gICBpbnB1dFxuICAgKiBAcGFyYW0gIHtPYmplY3R9ICAgb3B0aW9uc1xuICAgKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAgICovXG4gIERPTUJhcnMuY29tcGlsZSA9IGNvbXBpbGVQcmVjaGVjayhmdW5jdGlvbiAoaW5wdXQsIG9wdGlvbnMpIHtcbiAgICB2YXIgY29tcGlsZWQ7XG5cbiAgICB2YXIgY29tcGlsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBhc3QgICAgICAgICAgPSBET01CYXJzLnBhcnNlKGlucHV0KTtcbiAgICAgIHZhciBlbnZpcm9ubWVudCAgPSBuZXcgRE9NQmFycy5Db21waWxlcigpLmNvbXBpbGUoYXN0LCBvcHRpb25zKTtcbiAgICAgIHZhciB0ZW1wbGF0ZVNwZWMgPSBuZXcgRE9NQmFycy5KYXZhU2NyaXB0Q29tcGlsZXIoKS5jb21waWxlKFxuICAgICAgICBlbnZpcm9ubWVudCwgb3B0aW9ucywgdW5kZWZpbmVkLCB0cnVlXG4gICAgICApO1xuXG4gICAgICByZXR1cm4gRE9NQmFycy50ZW1wbGF0ZSh0ZW1wbGF0ZVNwZWMpO1xuICAgIH07XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICAgIGlmICghY29tcGlsZWQpIHtcbiAgICAgICAgY29tcGlsZWQgPSBjb21waWxlKCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBjb21waWxlZC5jYWxsKHRoaXMsIGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIH07XG4gIH0pO1xuXG4gIHJldHVybiBET01CYXJzO1xufTtcbiIsInZhciBjcmVhdGVGcmFtZSAgICA9IHJlcXVpcmUoJy4uLy4uL2hhbmRsZWJhcnMnKS5jcmVhdGVGcmFtZTtcbnZhciBDb21tb25Db21waWxlciA9IHJlcXVpcmUoJy4vY29tbW9uJykucHJvdG90eXBlO1xuXG4vKipcbiAqIEF0dHJpYnV0ZSBjb21waWxlci5cbiAqL1xudmFyIENvbXBpbGVyID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoKSB7fTtcbkNvbXBpbGVyLnByb3RvdHlwZSA9IGNyZWF0ZUZyYW1lKENvbW1vbkNvbXBpbGVyKTtcbkNvbXBpbGVyLnByb3RvdHlwZS5jb21waWxlciA9IENvbXBpbGVyO1xuXG4vKipcbiAqIEFwcGVuZCBhIHZhbHVlIHRvIHRoZSBjdXJyZW50IGJ1ZmZlci4gV2Ugb3ZlcnJpZGUgdGhlIGRlZmF1bHQgZnVuY3Rpb25hbGl0eVxuICogb2YgSGFuZGxlYmFycyBzaW5jZSB3ZSB3YW50IHRvIGJlIGFibGUgdG8gYXBwZW5kICpldmVyeSogdmFsdWUuXG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5hcHBlbmQgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuZmx1c2hJbmxpbmUoKTtcblxuICB0aGlzLnNvdXJjZS5wdXNoKHRoaXMuYXBwZW5kVG9CdWZmZXIodGhpcy5wb3BTdGFjaygpKSk7XG59O1xuIiwidmFyIEhhbmRsZWJhcnMgICA9IHJlcXVpcmUoJy4uLy4uL2hhbmRsZWJhcnMnKTtcbnZhciBCYXNlQ29tcGlsZXIgPSBIYW5kbGViYXJzLkNvbXBpbGVyLnByb3RvdHlwZTtcblxuLyoqXG4gKiBCYXNlIGNvbXBpbGVyIGluIGNoYXJnZSBvZiBnZW5lcmF0aW5nIGEgY29uc3VtYWJsZSBlbnZpcm9ubWVudCBmb3IgdGhlXG4gKiBKYXZhU2NyaXB0IGNvbXBpbGVyLlxuICovXG52YXIgQ29tcGlsZXIgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHt9O1xuQ29tcGlsZXIucHJvdG90eXBlID0gSGFuZGxlYmFycy5jcmVhdGVGcmFtZShCYXNlQ29tcGlsZXIpO1xuQ29tcGlsZXIucHJvdG90eXBlLmNvbXBpbGVyID0gQ29tcGlsZXI7XG5cbi8qKlxuICogQXBwZW5kIGEgRE9NIGVsZW1lbnQgbm9kZSB0byB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG5vZGVcbiAqL1xuQ29tcGlsZXIucHJvdG90eXBlLkRPTV9FTEVNRU5UID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgdGhpcy5vcGNvZGUoJ3B1c2hQcm9ncmFtJywgdGhpcy5jb21waWxlQXR0cmlidXRlKG5vZGUubmFtZSkpO1xuICB0aGlzLm9wY29kZSgnaW52b2tlRWxlbWVudCcpO1xuXG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBub2RlLmF0dHJpYnV0ZXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICB2YXIgbmFtZSAgPSB0aGlzLmNvbXBpbGVBdHRyaWJ1dGUobm9kZS5hdHRyaWJ1dGVzW2ldLm5hbWUpO1xuICAgIHZhciB2YWx1ZSA9IHRoaXMuY29tcGlsZUF0dHJpYnV0ZShub2RlLmF0dHJpYnV0ZXNbaV0udmFsdWUpO1xuICAgIHRoaXMuYXBwZW5kQXR0cmlidXRlKG5hbWUsIHZhbHVlKTtcbiAgfVxuXG4gIHRoaXMub3Bjb2RlKCdwdXNoUHJvZ3JhbScsIHRoaXMuY29tcGlsZUNvbnRlbnRzKG5vZGUuY29udGVudCkpO1xuICB0aGlzLm9wY29kZSgnaW52b2tlQ29udGVudCcpO1xuICB0aGlzLm9wY29kZSgnYXBwZW5kRWxlbWVudCcpO1xufTtcblxuLyoqXG4gKiBBcHBlbmQgYSBET00gY29tbWVudCBub2RlIHRvIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gbm9kZVxuICovXG5Db21waWxlci5wcm90b3R5cGUuRE9NX0NPTU1FTlQgPSBmdW5jdGlvbiAobm9kZSkge1xuICB0aGlzLm9wY29kZSgncHVzaFByb2dyYW0nLCB0aGlzLmNvbXBpbGVBdHRyaWJ1dGUobm9kZS50ZXh0KSk7XG4gIHRoaXMub3Bjb2RlKCdpbnZva2VDb21tZW50Jyk7XG4gIHRoaXMub3Bjb2RlKCdhcHBlbmRFbGVtZW50Jyk7XG59O1xuXG4vKipcbiAqIEFwcGVuZCBhbiBhdHRyaWJ1dGUgdG8gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIEBwYXJhbSAge09iamVjdH0gbmFtZVxuICogQHBhcmFtICB7T2JqZWN0fSB2YWx1ZVxuICovXG5Db21waWxlci5wcm90b3R5cGUuYXBwZW5kQXR0cmlidXRlID0gZnVuY3Rpb24gKG5hbWUsIHZhbHVlKSB7XG4gIHRoaXMub3Bjb2RlKCdwdXNoUHJvZ3JhbScsIG5hbWUpO1xuICB0aGlzLm9wY29kZSgncHVzaFByb2dyYW0nLCB2YWx1ZSk7XG4gIHRoaXMub3Bjb2RlKCdpbnZva2VBdHRyaWJ1dGUnKTtcbn07XG5cbi8qKlxuICogQ29tcGlsZSBhbiBhdHRyaWJ1dGUgcHJvZ3JhbS5cbiAqXG4gKiBAcGFyYW0gIHtPYmplY3R9IHByb2dyYW1cbiAqIEByZXR1cm4ge051bWJlcn1cbiAqL1xuQ29tcGlsZXIucHJvdG90eXBlLmNvbXBpbGVBdHRyaWJ1dGUgPSBmdW5jdGlvbiAocHJvZ3JhbSkge1xuICB2YXIgZ3VpZCA9IHRoaXMuY29tcGlsZUNvbnRlbnRzKHByb2dyYW0pO1xuICB0aGlzLmNoaWxkcmVuW2d1aWRdLmlzQXR0cmlidXRlID0gdHJ1ZTtcbiAgcmV0dXJuIGd1aWQ7XG59O1xuXG4vKipcbiAqIENvbXBpbGUgYW4gZWxlbWVudHMgY29udGVudHMuXG4gKlxuICogQHBhcmFtICB7T2JqZWN0fSBwcm9ncmFtXG4gKiBAcmV0dXJuIHtOdW1iZXJ9XG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5jb21waWxlQ29udGVudHMgPSBmdW5jdGlvbiAocHJvZ3JhbSkge1xuICB2YXIgZ3VpZCAgID0gdGhpcy5jb21waWxlUHJvZ3JhbShwcm9ncmFtKTtcbiAgdmFyIHJlc3VsdCA9IHRoaXMuY2hpbGRyZW5bZ3VpZF07XG4gIHJlc3VsdC5pc1Byb3hpZWQgPSB0cnVlO1xuXG4gIC8vIFByb3h5IGFsbCB0aGUgZGVwdGggbm9kZXMgYmV0d2VlbiBjb21waWxlZCBwcm9ncmFtcy5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCByZXN1bHQuZGVwdGhzLmxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICB0aGlzLmFkZERlcHRoKHJlc3VsdC5kZXB0aHMubGlzdFtpXSk7XG4gIH1cblxuICByZXR1cm4gZ3VpZDtcbn07XG5cbi8qKlxuICogVXBkYXRlIHRoZSBjb21waWxlciBlcXVhbGl0eSBjaGVjayB0byBhbHNvIHRha2UgaW50byBhY2NvdW50IGF0dHJpYnV0ZVxuICogcHJvZ3JhbXMuXG4gKlxuICogQHBhcmFtICB7T2JqZWN0fSAgb3RoZXJcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbiAob3RoZXIpIHtcbiAgLy8gQ2hlY2sgaWYgd2UgaGF2ZSB0d28gYXR0cmlidXRlIHByb2dyYW1zIChvciBub24tYXR0cmlidXRlIHByb2dyYW1zKS5cbiAgaWYgKHRoaXMuaXNBdHRyaWJ1dGUgIT09IG90aGVyLmlzQXR0cmlidXRlKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuIEJhc2VDb21waWxlci5lcXVhbHMuY2FsbCh0aGlzLCBvdGhlcik7XG59O1xuIiwidmFyIEhhbmRsZWJhcnMgPSByZXF1aXJlKCcuLi8uLi9oYW5kbGViYXJzJyk7XG52YXIgSlNDb21waWxlciA9IEhhbmRsZWJhcnMuSmF2YVNjcmlwdENvbXBpbGVyLnByb3RvdHlwZTtcblxuLyoqXG4gKiBDcmVhdGUgdGhlIGJhc2UgY29tcGlsZXIgZnVuY3Rpb25hbGl0eSBhbmQgYXR0YWNoIHJlbGV2YW50IHJlZmVyZW5jZXMuXG4gKi9cbnZhciBDb21waWxlciA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge307XG5Db21waWxlci5wcm90b3R5cGUgPSBIYW5kbGViYXJzLmNyZWF0ZUZyYW1lKEpTQ29tcGlsZXIpO1xuQ29tcGlsZXIucHJvdG90eXBlLmNvbXBpbGVyID0gQ29tcGlsZXI7XG5cbi8qKlxuICogT3ZlcnJpZGUgbmFtZSBsb29rdXAgdG8gdXNlIHRoZSBmdW5jdGlvbiBwcm92aWRlZCBvbiB0aGUgRE9NQmFycyBvYmplY3QuXG4gKlxuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5Db21waWxlci5wcm90b3R5cGUubmFtZUxvb2t1cCA9IGZ1bmN0aW9uIChwYXJlbnQsIHByb3BlcnR5LCB0eXBlKSB7XG4gIGlmICh0eXBlICE9PSAnY29udGV4dCcpIHtcbiAgICByZXR1cm4gSlNDb21waWxlci5uYW1lTG9va3VwLmNhbGwodGhpcywgcGFyZW50LCBwcm9wZXJ0eSwgdHlwZSk7XG4gIH1cblxuICB0aGlzLmNvbnRleHQuYWxpYXNlcy5nZXQgPSAndGhpcy5nZXQnO1xuXG4gIHZhciBxdW90ZWRQYXJlbnQgICA9IHRoaXMucXVvdGVkU3RyaW5nKHBhcmVudCk7XG4gIHZhciBxdW90ZWRQcm9wZXJ0eSA9IHRoaXMucXVvdGVkU3RyaW5nKHByb3BlcnR5KTtcblxuICByZXR1cm4gJ2dldCgnICsgcGFyZW50ICsgJywgJyArIHF1b3RlZFByb3BlcnR5ICsgJywgJyArIHF1b3RlZFBhcmVudCArICcpJztcbn07XG5cbi8qKlxuICogU2ltcGxlIGZ1bmN0aW9uIGZvciBib3VuY2luZyBhIHZhbHVlLiBFLmcuIEluc3RlYWQgb2YgZGlyZWN0IHJlZmVyZW5jZXMuXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSBzdHJpbmdcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuQ29tcGlsZXIucHJvdG90eXBlLmJvdW5jZSA9IGZ1bmN0aW9uIChzdHJpbmcpIHtcbiAgcmV0dXJuICdmdW5jdGlvbiAoKSB7IHJldHVybiAnICsgc3RyaW5nICsgJzsgfSc7XG59O1xuXG4vKipcbiAqIE92ZXJyaWRlIGFtYmlndW91cyBpbnZva2VzIHRvIHByb2R1Y2UganVzdCBvbmUgc291cmNlIHZhbHVlLlxuICovXG5Db21waWxlci5wcm90b3R5cGUuaW52b2tlQW1iaWd1b3VzID0gZnVuY3Rpb24gKCkge1xuICBKU0NvbXBpbGVyLmludm9rZUFtYmlndW91cy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB0aGlzLnNvdXJjZS5wdXNoKHRoaXMuc291cmNlLnNwbGljZSgtMikuam9pbignXFxuJykpO1xufTtcblxuLyoqXG4gKiBPdmVycmlkZSB0aGUgYW1iaWdvdXMgYmxvY2sgdmFsdWUgaW52b2thdGlvbiB0byBwcm9kdWNlIGEgc2luZ2xlIHNvdXJjZS5cbiAqL1xuQ29tcGlsZXIucHJvdG90eXBlLmFtYmlndW91c0Jsb2NrVmFsdWUgPSBmdW5jdGlvbiAoKSB7XG4gIEpTQ29tcGlsZXIuYW1iaWd1b3VzQmxvY2tWYWx1ZS5jYWxsKHRoaXMpO1xuICB0aGlzLnNvdXJjZS5wdXNoKHRoaXMuc291cmNlLnNwbGljZSgtMikuam9pbignXFxuJykpO1xufTtcbiIsInZhciBjcmVhdGVGcmFtZSAgICA9IHJlcXVpcmUoJy4uLy4uL2hhbmRsZWJhcnMnKS5jcmVhdGVGcmFtZTtcbnZhciBDb21tb25Db21waWxlciA9IHJlcXVpcmUoJy4vY29tbW9uJykucHJvdG90eXBlO1xuXG4vKipcbiAqIEV4dGVuZHMgSGFuZGxlYmFycyBKYXZhU2NyaXB0IGNvbXBpbGVyIHRvIGFkZCBET00gc3BlY2lmaWMgcnVsZXMuXG4gKi9cbnZhciBDb21waWxlciA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge307XG5Db21waWxlci5wcm90b3R5cGUgPSBjcmVhdGVGcmFtZShDb21tb25Db21waWxlcik7XG5Db21waWxlci5wcm90b3R5cGUuY29tcGlsZXIgICAgID0gQ29tcGlsZXI7XG5Db21waWxlci5wcm90b3R5cGUuYXR0ckNvbXBpbGVyID0gcmVxdWlyZSgnLi9hdHRyaWJ1dGVzJyk7XG5cbi8qKlxuICogQ29tcGlsZXMgdGhlIGVudmlyb25tZW50IG9iamVjdCBnZW5lcmF0ZWQgYnkgdGhlIGJhc2UgY29tcGlsZXIuXG4gKlxuICogQHBhcmFtICB7T2JqZWN0fSAgICAgICAgICAgIGVudmlyb25tZW50XG4gKiBAcmV0dXJuIHsoRnVuY3Rpb258U3RyaW5nKX1cbiAqL1xuQ29tcGlsZXIucHJvdG90eXBlLmNvbXBpbGUgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuZWxlbWVudFNsb3QgPSAwO1xuICByZXR1cm4gQ29tbW9uQ29tcGlsZXIuY29tcGlsZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblxuLyoqXG4gKiBDb21waWxlIGFueSBjaGlsZCBwcm9ncmFtIG5vZGVzLiBFLmcuIEJsb2NrIGhlbHBlcnMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGVudmlyb25tZW50XG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICovXG5Db21waWxlci5wcm90b3R5cGUuY29tcGlsZUNoaWxkcmVuID0gZnVuY3Rpb24oZW52aXJvbm1lbnQsIG9wdGlvbnMpIHtcbiAgdmFyIGNoaWxkcmVuID0gZW52aXJvbm1lbnQuY2hpbGRyZW47XG4gIHZhciBDb21waWxlciwgY2hpbGQsIHByb2dyYW0sIGluZGV4O1xuXG4gIGZvciAodmFyIGkgPSAwLCBsID0gY2hpbGRyZW4ubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgY2hpbGQgICAgPSBjaGlsZHJlbltpXTtcbiAgICBpbmRleCAgICA9IHRoaXMubWF0Y2hFeGlzdGluZ1Byb2dyYW0oY2hpbGQpO1xuICAgIENvbXBpbGVyID0gdGhpcy5jb21waWxlcjtcblxuICAgIGlmIChjaGlsZC5pc0F0dHJpYnV0ZSkge1xuICAgICAgQ29tcGlsZXIgPSB0aGlzLmF0dHJDb21waWxlcjtcbiAgICB9XG5cbiAgICBpZiAoaW5kZXggPT0gbnVsbCkge1xuICAgICAgdGhpcy5jb250ZXh0LnByb2dyYW1zLnB1c2goJycpO1xuICAgICAgY2hpbGQuaW5kZXggPSBpbmRleCA9IHRoaXMuY29udGV4dC5wcm9ncmFtcy5sZW5ndGg7XG4gICAgICBjaGlsZC5uYW1lICA9ICdwcm9ncmFtJyArIGluZGV4O1xuICAgICAgcHJvZ3JhbSA9IG5ldyBDb21waWxlcigpLmNvbXBpbGUoY2hpbGQsIG9wdGlvbnMsIHRoaXMuY29udGV4dCk7XG4gICAgICB0aGlzLmNvbnRleHQucHJvZ3JhbXNbaW5kZXhdICAgICA9IHByb2dyYW07XG4gICAgICB0aGlzLmNvbnRleHQuZW52aXJvbm1lbnRzW2luZGV4XSA9IGNoaWxkO1xuICAgIH0gZWxzZSB7XG4gICAgICBjaGlsZC5pbmRleCA9IGluZGV4O1xuICAgICAgY2hpbGQubmFtZSAgPSAncHJvZ3JhbScgKyBpbmRleDtcbiAgICB9XG4gIH1cbn07XG5cbi8qKlxuICogUHVzaCBhbiBlbGVtZW50IG9udG8gdGhlIHN0YWNrIGFuZCByZXR1cm4gaXQuXG4gKlxuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5Db21waWxlci5wcm90b3R5cGUucHVzaEVsZW1lbnQgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiAnZWxlbWVudCcgKyAoKyt0aGlzLmVsZW1lbnRTbG90KTtcbn07XG5cbi8qKlxuICogUG9wIHRoZSBsYXN0IGVsZW1lbnQgb2ZmIHRoZSBzdGFjayBhbmQgcmV0dXJuIGl0LlxuICpcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuQ29tcGlsZXIucHJvdG90eXBlLnBvcEVsZW1lbnQgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiAnZWxlbWVudCcgKyAodGhpcy5lbGVtZW50U2xvdC0tKTtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgZWxlbWVudCBhdCB0aGUgZW5kIG9mIHRoZSBzdGFjay5cbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS50b3BFbGVtZW50ID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gJ2VsZW1lbnQnICsgdGhpcy5lbGVtZW50U2xvdDtcbn07XG5cbi8qKlxuICogQXBwZW5kIHNvbWUgY29udGVudCB0byB0aGUgYnVmZmVyIChhIGRvY3VtZW50IGZyYWdtZW50KS5cbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9IHN0cmluZ1xuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5Db21waWxlci5wcm90b3R5cGUuYXBwZW5kVG9CdWZmZXIgPSBmdW5jdGlvbiAoc3RyaW5nKSB7XG4gIGlmICh0aGlzLmVudmlyb25tZW50LmlzU2ltcGxlKSB7XG4gICAgcmV0dXJuICdyZXR1cm4gJyArIHN0cmluZyArICc7JztcbiAgfVxuXG4gIHRoaXMuY29udGV4dC5hbGlhc2VzLmFwcGVuZENoaWxkID0gJ3RoaXMuYXBwZW5kQ2hpbGQnO1xuXG4gIHJldHVybiAnYXBwZW5kQ2hpbGQoYnVmZmVyLCAnICsgc3RyaW5nICsgJyk7Jztcbn07XG5cbi8qKlxuICogSW5pdGlhbGl6ZSB0aGUgYmFzZSB2YWx1ZSBvZiB0aGUgYnVmZmVyLCBpbiB0aGlzIGNhc2UgYSBkb2N1bWVudCBmcmFnbWVudC5cbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5pbml0aWFsaXplQnVmZmVyID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gJ2RvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKSc7XG59O1xuXG4vKipcbiAqIEFwcGVuZCBhIHRleHQgbm9kZSB0byB0aGUgYnVmZmVyLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBjb250ZW50XG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5hcHBlbmRDb250ZW50ID0gZnVuY3Rpb24gKGNvbnRlbnQpIHtcbiAgdmFyIHN0cmluZyA9ICdkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnICsgdGhpcy5xdW90ZWRTdHJpbmcoY29udGVudCkgKyAnKSc7XG4gIHRoaXMuc291cmNlLnB1c2godGhpcy5hcHBlbmRUb0J1ZmZlcihzdHJpbmcpKTtcbn07XG5cbi8qKlxuICogQXBwZW5kIGEgdmFyaWFibGUgdG8gdGhlIHN0YWNrLiBBZGRzIHNvbWUgYWRkaXRpb25hbCBsb2dpYyB0byB0cmFuc2Zvcm0gdGhlXG4gKiB0ZXh0IGludG8gYSBET00gbm9kZSBiZWZvcmUgd2UgYXR0ZW1wdCB0byBhcHBlbmQgaXQgdG8gdGhlIGJ1ZmZlci5cbiAqL1xuQ29tcGlsZXIucHJvdG90eXBlLmFwcGVuZCA9IGZ1bmN0aW9uIChlc2NhcGVkKSB7XG4gIHRoaXMuZmx1c2hJbmxpbmUoKTtcblxuICB2YXIgY3JlYXRlRm4gPSAnY3JlYXRlVGV4dCc7XG5cbiAgaWYgKGVzY2FwZWQpIHtcbiAgICB0aGlzLmNvbnRleHQuYWxpYXNlcy5jcmVhdGVUZXh0ID0gJ3RoaXMuY3JlYXRlVGV4dCc7XG4gIH0gZWxzZSB7XG4gICAgY3JlYXRlRm4gPSAnY3JlYXRlRE9NJztcbiAgICB0aGlzLmNvbnRleHQuYWxpYXNlcy5jcmVhdGVET00gPSAndGhpcy5jcmVhdGVET00nO1xuICB9XG5cbiAgdmFyIGxvY2FsICAgPSB0aGlzLnBvcFN0YWNrKCk7XG4gIHZhciBzb3VyY2UgID0gdGhpcy5zb3VyY2UucG9wKCk7XG4gIHZhciBlbGVtZW50ID0gdGhpcy5wdXNoU3RhY2soXG4gICAgY3JlYXRlRm4gKyAnKGZ1bmN0aW9uICgpIHsgJyArIHNvdXJjZSArICc7IHJldHVybiAnICsgbG9jYWwgKyAnOyB9KSdcbiAgKTtcblxuICB0aGlzLnNvdXJjZS5wdXNoKHRoaXMuYXBwZW5kVG9CdWZmZXIoZWxlbWVudCkpO1xufTtcblxuLyoqXG4gKiBBcHBlbmQgYW4gZXNjYXBlZCBIYW5kbGViYXJzIGV4cHJlc3Npb24gdG8gdGhlIHNvdXJjZS5cbiAqL1xuQ29tcGlsZXIucHJvdG90eXBlLmFwcGVuZEVzY2FwZWQgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLmFwcGVuZCh0cnVlKTtcbn07XG5cbi8qKlxuICogQXBwZW5kIGFuIGVsZW1lbnQgbm9kZSB0byB0aGUgc291cmNlLlxuICovXG5Db21waWxlci5wcm90b3R5cGUuYXBwZW5kRWxlbWVudCA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5zb3VyY2UucHVzaCh0aGlzLmFwcGVuZFRvQnVmZmVyKHRoaXMucG9wU3RhY2soKSkpO1xufTtcblxuLyoqXG4gKiBDcmVhdGUgYSBET00gY29tbWVudCBub2RlIHJlYWR5IGZvciBhcHBlbmRpbmcgdG8gdGhlIGN1cnJlbnQgYnVmZmVyLlxuICovXG5Db21waWxlci5wcm90b3R5cGUuaW52b2tlQ29tbWVudCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGRlcHRoICA9ICdkZXB0aCcgKyB0aGlzLmxhc3RDb250ZXh0O1xuICB2YXIgaW52b2tlID0gdGhpcy5ib3VuY2UodGhpcy50b3BTdGFjaygpICsgJygnICsgZGVwdGggKyAnKScpO1xuXG4gIHRoaXMuY29udGV4dC5hbGlhc2VzLmNyZWF0ZUNvbW1lbnQgPSAndGhpcy5jcmVhdGVDb21tZW50JztcblxuICB0aGlzLnB1c2hTdGFjaygnY3JlYXRlQ29tbWVudCgnICsgaW52b2tlICsgJyknKTtcbn07XG5cbi8qKlxuICogQ3JlYXRlIGEgRE9NIGVsZW1lbnQgbm9kZSByZWFkeSBmb3IgYXBwZW5kaW5nIHRvIHRoZSBjdXJyZW50IGJ1ZmZlci5cbiAqL1xuQ29tcGlsZXIucHJvdG90eXBlLmludm9rZUVsZW1lbnQgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuY29udGV4dC5hbGlhc2VzLmNyZWF0ZUVsZW1lbnQgPSAndGhpcy5jcmVhdGVFbGVtZW50JztcblxuICB2YXIgZWxlbWVudCA9IHRoaXMucHVzaEVsZW1lbnQoKTtcbiAgdmFyIGRlcHRoICAgPSAnZGVwdGgnICsgdGhpcy5sYXN0Q29udGV4dDtcbiAgdmFyIGN1cnJlbnQgPSB0aGlzLmJvdW5jZSh0aGlzLnBvcFN0YWNrKCkgKyAnKCcgKyBkZXB0aCArICcpJyk7XG4gIHZhciB1cGRhdGUgID0gJ2Z1bmN0aW9uIChlbGVtZW50KSB7ICcgKyBlbGVtZW50ICsgJyA9IGVsZW1lbnQ7IH0nO1xuICB2YXIgY3JlYXRlICA9ICdjcmVhdGVFbGVtZW50KCcgKyBjdXJyZW50ICsgJywgJyArIHVwZGF0ZSArICcpJztcblxuICB0aGlzLnB1c2hTdGFja0xpdGVyYWwoZWxlbWVudCk7XG4gIHRoaXMucmVnaXN0ZXIoZWxlbWVudCwgY3JlYXRlKTtcbn07XG5cbi8qKlxuICogQXBwZW5kIGFuIGF0dHJpYnV0ZSBub2RlIHRvIHRoZSBjdXJyZW50IGVsZW1lbnQuXG4gKi9cbkNvbXBpbGVyLnByb3RvdHlwZS5pbnZva2VBdHRyaWJ1dGUgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBkZXB0aCAgID0gJ2RlcHRoJyArIHRoaXMubGFzdENvbnRleHQ7XG4gIHZhciBlbGVtZW50ID0gdGhpcy5ib3VuY2UodGhpcy50b3BFbGVtZW50KCkpO1xuICB2YXIgdmFsdWUgICA9IHRoaXMuYm91bmNlKHRoaXMucG9wU3RhY2soKSArICcoJyArIGRlcHRoICsgJyknKTtcbiAgdmFyIG5hbWUgICAgPSB0aGlzLmJvdW5jZSh0aGlzLnBvcFN0YWNrKCkgKyAnKCcgKyBkZXB0aCArICcpJyk7XG4gIHZhciBwYXJhbXMgID0gW2VsZW1lbnQsIG5hbWUsIHZhbHVlXTtcblxuICB0aGlzLmNvbnRleHQuYWxpYXNlcy5zZXRBdHRyaWJ1dGUgPSAndGhpcy5zZXRBdHRyaWJ1dGUnO1xuXG4gIHRoaXMuc291cmNlLnB1c2goJ3NldEF0dHJpYnV0ZSgnICsgcGFyYW1zLmpvaW4oJywgJykgKyAnKTsnKTtcbn07XG5cbi8qKlxuICogSW52b2tlIGFuIGFyYml0cmFyeSBwcm9ncmFtIGFuZCBhcHBlbmQgdG8gdGhlIGN1cnJlbnQgZWxlbWVudC5cbiAqL1xuQ29tcGlsZXIucHJvdG90eXBlLmludm9rZUNvbnRlbnQgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBlbGVtZW50ID0gdGhpcy50b3BFbGVtZW50KCk7XG4gIHZhciBkZXB0aCAgID0gJ2RlcHRoJyArIHRoaXMubGFzdENvbnRleHQ7XG4gIHZhciBjaGlsZCAgID0gdGhpcy5wb3BTdGFjaygpICsgJygnICsgZGVwdGggKyAnKSc7XG5cbiAgdGhpcy5jb250ZXh0LmFsaWFzZXMuYXBwZW5kQ2hpbGQgPSAndGhpcy5hcHBlbmRDaGlsZCc7XG5cbiAgdGhpcy5zb3VyY2UucHVzaCgnYXBwZW5kQ2hpbGQoJyArIGVsZW1lbnQgKyAnLCAnICsgY2hpbGQgKyAnKTsnKTtcbn07XG5cbi8qKlxuICogT3ZlcnJpZGUgdGhlIHByb2dyYW0gZXhwcmVzc2lvbiBmdW5jdGlvbiB0byBwcm94eSBkZXB0aC5cbiAqXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IGd1aWRcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuQ29tcGlsZXIucHJvdG90eXBlLnByb2dyYW1FeHByZXNzaW9uID0gZnVuY3Rpb24gKGd1aWQpIHtcbiAgdGhpcy5jb250ZXh0LmFsaWFzZXMuc2VsZiA9ICd0aGlzJztcblxuICBpZiAoZ3VpZCA9PSBudWxsKSB7XG4gICAgcmV0dXJuICdzZWxmLm5vb3AnO1xuICB9XG5cbiAgdmFyIGNoaWxkICAgICAgICAgPSB0aGlzLmVudmlyb25tZW50LmNoaWxkcmVuW2d1aWRdO1xuICB2YXIgZGVwdGhzICAgICAgICA9IGNoaWxkLmRlcHRocy5saXN0O1xuICB2YXIgcHJvZ3JhbVBhcmFtcyA9IFtjaGlsZC5pbmRleCwgY2hpbGQubmFtZSwgJ2RhdGEnXTtcblxuICBmb3IgKHZhciBpID0gMCwgbCA9IGRlcHRocy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICB2YXIgZGVwdGggPSBkZXB0aHNbaV0gKyB0aGlzLmVudmlyb25tZW50LmRlcHRocy5saXN0Lmxlbmd0aDtcblxuICAgIHByb2dyYW1QYXJhbXMucHVzaCgnZGVwdGgnICsgKGRlcHRoIC0gMSkpO1xuICB9XG5cbiAgdmFyIHBhcmFtcyA9IHByb2dyYW1QYXJhbXMuam9pbignLCAnKTtcblxuICBpZiAoZGVwdGhzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiAnc2VsZi5wcm9ncmFtKCcgKyBwYXJhbXMgKyAnKSc7XG4gIH1cblxuICByZXR1cm4gJ3NlbGYucHJvZ3JhbVdpdGhEZXB0aCgnICsgcGFyYW1zICsgJyknO1xufTtcbiIsInZhciBFdmVudHMgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vKipcbiAqIExpc3RlbiB0byBhbnkgZXZlbnRzIHRyaWdnZXJlZC5cbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9ICAgbmFtZVxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gKiBAcGFyYW0gIHtPYmplY3R9ICAgY29udGV4dFxuICogQHJldHVybiB7RXZlbnRzfVxuICovXG5FdmVudHMub24gPSBmdW5jdGlvbiAobmFtZSwgZm4sIGNvbnRleHQpIHtcbiAgdGhpcy5fZXZlbnRzIHx8ICh0aGlzLl9ldmVudHMgPSB7fSk7XG4gIHZhciBldmVudHMgPSB0aGlzLl9ldmVudHNbbmFtZV0gfHwgKHRoaXMuX2V2ZW50c1tuYW1lXSA9IFtdKTtcbiAgZXZlbnRzLnB1c2goeyBmbjogZm4sIGNvbnRleHQ6IGNvbnRleHQgfSk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBMaXN0ZW4gdG8gYW55IGV2ZW50cyB0cmlnZ2VyZWQgb25jZS5cbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9ICAgbmFtZVxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gKiBAcGFyYW0gIHtPYmplY3R9ICAgY29udGV4dFxuICogQHJldHVybiB7RXZlbnRzfVxuICovXG5FdmVudHMub25jZSA9IGZ1bmN0aW9uIChuYW1lLCBmbiwgY29udGV4dCkge1xuICB2YXIgdGhhdCA9IHRoaXM7XG5cbiAgcmV0dXJuIHRoaXMub24obmFtZSwgZnVuY3Rpb24gc2VsZiAoKSB7XG4gICAgdGhhdC5vZmYobmFtZSwgc2VsZik7XG4gICAgZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfSwgY29udGV4dCk7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBhbiBldmVudCBsaXN0ZW5lci5cbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9ICAgbmFtZVxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gKiBAcGFyYW0gIHtPYmplY3R9ICAgY29udGV4dFxuICogQHJldHVybiB7RXZlbnRzfVxuICovXG5FdmVudHMub2ZmID0gZnVuY3Rpb24gKG5hbWUsIGZuLCBjb250ZXh0KSB7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbbmFtZV0pIHtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgIGlmICghbmFtZSkge1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50cztcbiAgICB9IGVsc2Uge1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1tuYW1lXTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHZhciBldmVudHMgPSB0aGlzLl9ldmVudHNbbmFtZV07XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZXZlbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGV2ZW50c1tpXS5mbiA9PT0gZm4pIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAyIHx8IGV2ZW50c1tpXS5jb250ZXh0ID09PSBjb250ZXh0KSB7XG4gICAgICAgIGV2ZW50cy5zcGxpY2UoaSwgMSk7XG4gICAgICAgIGktLTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZiAoIWV2ZW50cy5sZW5ndGgpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW25hbWVdO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEVtaXQgYW4gZXZlbnQuXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSBuYW1lXG4gKiBAcGFyYW0gIHsqfSAgICAgIC4uLlxuICogQHJldHVybiB7RXZlbnRzfVxuICovXG5FdmVudHMuZW1pdCA9IGZ1bmN0aW9uIChuYW1lIC8qLCAuLi5hcmdzICovKSB7XG4gIHZhciBhcmdzICAgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICB2YXIgZXZlbnRzID0gdGhpcy5fZXZlbnRzICYmIHRoaXMuX2V2ZW50c1tuYW1lXSAmJiB0aGlzLl9ldmVudHNbbmFtZV0uc2xpY2UoKTtcblxuICBpZiAoZXZlbnRzKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBldmVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGV2ZW50c1tpXS5mbi5hcHBseShldmVudHNbaV0uY29udGV4dCwgYXJncyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuIiwidmFyIGFzdCAgICAgPSByZXF1aXJlKCcuL2FzdCcpO1xudmFyIGJhc2UgICAgPSByZXF1aXJlKCcuL2Jhc2UnKTtcbnZhciBwcmludGVyID0gcmVxdWlyZSgnLi9wcmludGVyJyk7XG52YXIgdmlzaXRvciA9IHJlcXVpcmUoJy4vdmlzaXRvcicpO1xuXG5leHBvcnRzLmF0dGFjaCA9IGZ1bmN0aW9uIChET01CYXJzKSB7XG4gIHZpc2l0b3IuYXR0YWNoKERPTUJhcnMpO1xuICBwcmludGVyLmF0dGFjaChET01CYXJzKTtcbiAgYXN0LmF0dGFjaChET01CYXJzKTtcbiAgYmFzZS5hdHRhY2goRE9NQmFycyk7XG5cbiAgcmV0dXJuIERPTUJhcnM7XG59O1xuIiwidmFyIEhic1BhcnNlciAgPSByZXF1aXJlKCdoYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2NvbXBpbGVyL3BhcnNlcicpO1xudmFyIEhUTUxQYXJzZXIgPSByZXF1aXJlKCdodG1scGFyc2VyMi9saWIvUGFyc2VyJyk7XG5cbi8qKlxuICogU3RyaW5naWZ5IGFuIGBBU1QuUHJvZ3JhbU5vZGVgIHNvIGl0IGNhbiBiZSBydW4gdGhyb3VnaCBvdGhlcnMgcGFyc2Vycy4gVGhpc1xuICogaXMgcmVxdWlyZWQgZm9yIHRoZSBub2RlIHRvIGJlIHBhcnNlZCBhcyBIVE1MICphZnRlciogaXQgaXMgcGFyc2VkIGFzIGFcbiAqIEhhbmRsZWJhcnMgdGVtcGxhdGUuIEhhbmRsZWJhcnMgbXVzdCBhbHdheXMgcnVuIGJlZm9yZSB0aGUgSFRNTCBwYXJzZXIsIHNvXG4gKiBpdCBjYW4gY29ycmVjdGx5IG1hdGNoIGJsb2NrIG5vZGVzIChJIGNvdWxkbid0IHNlZSBhIHNpbXBsZSB3YXkgdG8gcmVzdW1lXG4gKiB0aGUgZW5kIGJsb2NrIG5vZGUgcGFyc2luZykuXG4gKlxuICogQHBhcmFtICB7SGFuZGxlYmFycy5BU1QuUHJvZ3JhbU5vZGV9IHByb2dyYW1cbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xudmFyIHN0cmluZ2lmeVByb2dyYW0gPSBmdW5jdGlvbiAocHJvZ3JhbSkge1xuICB2YXIgaHRtbCAgICAgICA9ICcnO1xuICB2YXIgc3RhdGVtZW50cyA9IHByb2dyYW0uc3RhdGVtZW50cztcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0YXRlbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgc3RhdGVtZW50ID0gc3RhdGVtZW50c1tpXTtcblxuICAgIGlmIChzdGF0ZW1lbnQudHlwZSA9PT0gJ2NvbnRlbnQnKSB7XG4gICAgICBodG1sICs9IHN0YXRlbWVudC5zdHJpbmc7XG4gICAgfSBlbHNlIHtcbiAgICAgIGh0bWwgKz0gJ3t7ZCcgKyBpICsgJ319JzsgLy8gXCJBbGlhc1wiIG5vZGVcbiAgICB9XG4gIH1cblxuICByZXR1cm4gaHRtbDtcbn07XG5cbi8qKlxuICogUGFyc2VzIGEgdGV4dCBzdHJpbmcgcmV0dXJuZWQgZnJvbSBzdHJpbmdpZnlpbmcgYSBwcm9ncmFtIG5vZGUuIFJlcGxhY2VzIGFueVxuICogbXVzdGFjaGUgbm9kZSByZWZlcmVuY2VzIHdpdGggdGhlIG9yaWdpbmFsIG5vZGUuXG5cbiAqIEBwYXJhbSAge1N0cmluZ30gaW5wdXRcbiAqIEBwYXJhbSAge09iamVjdH0gb3JpZ2luYWxQcm9ncmFtXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cbnZhciBwYXJzZVByb2dyYW0gPSBmdW5jdGlvbiAoaW5wdXQsIG9yaWdpbmFsUHJvZ3JhbSkge1xuICB2YXIgcHJvZ3JhbSAgICA9IEhic1BhcnNlci5wYXJzZShpbnB1dCk7XG4gIHZhciBzdGF0ZW1lbnRzID0gcHJvZ3JhbS5zdGF0ZW1lbnRzO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RhdGVtZW50cy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBzdGF0ZW1lbnQgPSBzdGF0ZW1lbnRzW2ldO1xuXG4gICAgLy8gUmVwbGFjZSBtdXN0YWNoZSBub2Rlcywgd2hpY2ggKnNob3VsZCogb25seSBiZSByZWFsIEhhbmRsZWJhcnMgXCJhbGlhc1wiXG4gICAgLy8gbm9kZXMgdGhhdCB3ZXJlIGluamVjdGVkIGJ5IHRoZSBzdHJpbmdpZmljYXRpb24gb2YgdGhlIHByb2dyYW0gbm9kZS5cbiAgICBpZiAoc3RhdGVtZW50LnR5cGUgPT09ICdtdXN0YWNoZScpIHtcbiAgICAgIHN0YXRlbWVudHNbaV0gPSBvcmlnaW5hbFByb2dyYW0uc3RhdGVtZW50c1tzdGF0ZW1lbnQuaWQuc3RyaW5nLnN1YnN0cigxKV07XG4gICAgICBzdGF0ZW1lbnQgPSBzdGF0ZW1lbnRzW2ldO1xuICAgIH1cblxuICAgIC8vIE5lZWQgdG8gcmVjdXJzaXZlbHkgcmVzb2x2ZSBibG9jayBub2RlIHByb2dyYW1zIGFzIEhUTUwuXG4gICAgaWYgKHN0YXRlbWVudC50eXBlID09PSAnYmxvY2snKSB7XG4gICAgICBpZiAoc3RhdGVtZW50LnByb2dyYW0pIHtcbiAgICAgICAgc3RhdGVtZW50LnByb2dyYW0gPSBwYXJzZUFzSFRNTChzdGF0ZW1lbnQucHJvZ3JhbSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChzdGF0ZW1lbnQuaW52ZXJzZSkge1xuICAgICAgICBzdGF0ZW1lbnQuaW52ZXJzZSA9IHBhcnNlQXNIVE1MKHN0YXRlbWVudC5pbnZlcnNlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gcHJvZ3JhbTtcbn07XG5cbi8qKlxuICogUGFyc2UgYSBwcm9ncmFtIG9iamVjdCBhcyBIVE1MIGFuZCByZXR1cm4gYW4gdXBkYXRlZCBwcm9ncmFtLlxuICpcbiAqIEBwYXJhbSAge09iamVjdH0gb3JpZ2luYWxQcm9ncmFtXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cbnZhciBwYXJzZUFzSFRNTCA9IGZ1bmN0aW9uIChvcmlnaW5hbFByb2dyYW0pIHtcbiAgdmFyIHl5ICAgPSBIYnNQYXJzZXIueXk7XG4gIHZhciBodG1sID0gc3RyaW5naWZ5UHJvZ3JhbShvcmlnaW5hbFByb2dyYW0pO1xuXG4gIC8vIENyZWF0ZSBhbmQgcmV0dXJuIGEgbmV3IGVtcHR5IHByb2dyYW0gbm9kZS5cbiAgdmFyIGNyZWF0ZVByb2dyYW0gPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIG5ldyB5eS5Qcm9ncmFtTm9kZShbXSk7XG4gIH07XG5cbiAgLy8gU3RhcnQgdGhlIHN0YWNrIHdpdGggYW4gZW1wdHkgcHJvZ3JhbSBub2RlIHdoaWNoIHdpbGwgY29udGFpbiBhbGwgdGhlXG4gIC8vIHBhcnNlZCBlbGVtZW50cy5cbiAgdmFyIHByb2dyYW0gPSBjcmVhdGVQcm9ncmFtKCk7XG4gIHZhciBzdGFjayAgID0gW3Byb2dyYW1dO1xuICB2YXIgZWxlbWVudDtcblxuICAvLyBHZW5lcmF0ZSBhIG5ldyBIVE1MIHBhcnNlciBpbnN0YW5jZS5cbiAgdmFyIHBhcnNlciA9IG5ldyBIVE1MUGFyc2VyKHtcbiAgICBvbm9wZW50YWduYW1lOiBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgdmFyIG5vZGUgPSBuZXcgeXkuRE9NLkVsZW1lbnQobmFtZSwgW10sIGNyZWF0ZVByb2dyYW0oKSk7XG4gICAgICBwcm9ncmFtLnN0YXRlbWVudHMucHVzaChlbGVtZW50ID0gbm9kZSk7XG4gICAgICBzdGFjay5wdXNoKHByb2dyYW0gPSBub2RlLmNvbnRlbnQpO1xuICAgIH0sXG4gICAgb25jbG9zZXRhZzogZnVuY3Rpb24gKCkge1xuICAgICAgc3RhY2sucG9wKCk7XG4gICAgICBlbGVtZW50ID0gbnVsbDtcbiAgICAgIHByb2dyYW0gPSBzdGFja1tzdGFjay5sZW5ndGggLSAxXTtcbiAgICB9LFxuICAgIG9uYXR0cmlidXRlOiBmdW5jdGlvbiAobmFtZSwgdmFsdWUpIHtcbiAgICAgIGVsZW1lbnQuYXR0cmlidXRlcy5wdXNoKG5ldyB5eS5ET00uQXR0cmlidXRlKG5hbWUsIHZhbHVlKSk7XG4gICAgfSxcbiAgICBvbnRleHQ6IGZ1bmN0aW9uICh0ZXh0KSB7XG4gICAgICBwcm9ncmFtLnN0YXRlbWVudHMucHVzaCh0ZXh0KTtcbiAgICB9LFxuICAgIG9ucHJvY2Vzc2luZ2luc3RydWN0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Byb2Nlc3NpbmcgaW5zdHJ1Y3Rpb25zIGFyZSBub3Qgc3VwcG9ydGVkJyk7XG4gICAgfSxcbiAgICBvbmNvbW1lbnQ6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICBwcm9ncmFtLnN0YXRlbWVudHMucHVzaChuZXcgeXkuRE9NLkNvbW1lbnQoZGF0YSkpO1xuICAgIH0sXG4gICAgb25lcnJvcjogZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH0sIHtcbiAgICBkZWNvZGVFbnRpdGllczogdHJ1ZVxuICB9KTtcblxuICBwYXJzZXIud3JpdGUoaHRtbCk7XG4gIHBhcnNlci5lbmQoKTtcblxuICAvKipcbiAgICogUmVjdXJzaXZlbHkgcGFyc2VzIG5lc3RlZCBET00gZWxlbWVudHMgYXMgSGFuZGxlYmFycyB0ZW1wbGF0ZXMuXG4gICAqXG4gICAqIEBwYXJhbSAge09iamVjdH0gcHJvZ3JhbVxuICAgKiBAcGFyYW0gIHtPYmplY3R9IG9yaWdpbmFsUHJvZ3JhbVxuICAgKiBAcmV0dXJuIHtPYmplY3R9XG4gICAqL1xuICB2YXIgYXN0ID0gKGZ1bmN0aW9uIHJlY3Vyc2UgKHByb2dyYW0sIG9yaWdpbmFsUHJvZ3JhbSkge1xuICAgIHZhciBzdGF0ZW1lbnRzID0gcHJvZ3JhbS5zdGF0ZW1lbnRzO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdGF0ZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgc3RhdGVtZW50ID0gc3RhdGVtZW50c1tpXTtcblxuICAgICAgaWYgKHR5cGVvZiBzdGF0ZW1lbnQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHZhciBtZXJnZSA9IHBhcnNlUHJvZ3JhbShzdGF0ZW1lbnQsIG9yaWdpbmFsUHJvZ3JhbSkuc3RhdGVtZW50cztcblxuICAgICAgICBzdGF0ZW1lbnRzLnNwbGljZS5hcHBseShzdGF0ZW1lbnRzLCBbaSwgMV0uY29uY2F0KG1lcmdlKSk7XG4gICAgICAgIGkgKz0gbWVyZ2UubGVuZ3RoIC0gMTtcbiAgICAgIH0gZWxzZSBpZiAoc3RhdGVtZW50LnR5cGUgPT09ICdET01fQ09NTUVOVCcpIHtcbiAgICAgICAgc3RhdGVtZW50LnRleHQgPSBwYXJzZVByb2dyYW0oc3RhdGVtZW50LnRleHQsIG9yaWdpbmFsUHJvZ3JhbSk7XG4gICAgICB9IGVsc2UgaWYgKHN0YXRlbWVudC50eXBlID09PSAnRE9NX0VMRU1FTlQnKSB7XG4gICAgICAgIHN0YXRlbWVudC5uYW1lID0gcGFyc2VQcm9ncmFtKHN0YXRlbWVudC5uYW1lLCBvcmlnaW5hbFByb2dyYW0pO1xuXG4gICAgICAgIGZvciAodmFyIGsgPSAwOyBrIDwgc3RhdGVtZW50LmF0dHJpYnV0ZXMubGVuZ3RoOyBrKyspIHtcbiAgICAgICAgICB2YXIgYXR0cmlidXRlID0gc3RhdGVtZW50LmF0dHJpYnV0ZXNba107XG5cbiAgICAgICAgICBhdHRyaWJ1dGUubmFtZSAgPSBwYXJzZVByb2dyYW0oYXR0cmlidXRlLm5hbWUsICBvcmlnaW5hbFByb2dyYW0pO1xuICAgICAgICAgIGF0dHJpYnV0ZS52YWx1ZSA9IHBhcnNlUHJvZ3JhbShhdHRyaWJ1dGUudmFsdWUsIG9yaWdpbmFsUHJvZ3JhbSk7XG4gICAgICAgIH1cblxuICAgICAgICByZWN1cnNlKHN0YXRlbWVudC5jb250ZW50LCBvcmlnaW5hbFByb2dyYW0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBwcm9ncmFtO1xuICB9KShzdGFjay5wb3AoKSwgb3JpZ2luYWxQcm9ncmFtKTtcblxuICByZXR1cm4gYXN0O1xufTtcblxuLyoqXG4gKiBUaGUgcGFyc2VyIGlzIGEgc2ltcGxlIGNvbnN0cnVjdG9yLiBBbGwgdGhlIGZ1bmN0aW9uYWxpdHkgaXMgb24gdGhlIHByb3RvdHlwZVxuICogb2JqZWN0LlxuICovXG52YXIgUGFyc2VyID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLnl5ID0ge307XG59O1xuXG4vKipcbiAqIEFsaWFzIHRoZSBwYXJzZXIgY29uc3RydWN0b3IgZnVuY3Rpb24uXG4gKlxuICogQHR5cGUge0Z1bmN0aW9ufVxuICovXG5QYXJzZXIucHJvdG90eXBlLlBhcnNlciA9IFBhcnNlcjtcblxuLyoqXG4gKiBUaGUgcHJpbWFyeSBmdW5jdGlvbmFsaXR5IG9mIHRoZSBwYXJzZXIuIFB1c2hlcyB0aGUgaW5wdXQgdGV4dCB0aHJvdWdoXG4gKiBIYW5kbGViYXJzIGFuZCBhIEhUTUwgcGFyc2VyLCBnZW5lcmF0aW5nIGEgQVNUIGZvciB1c2Ugd2l0aCB0aGUgY29tcGlsZXIuXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSBpbnB1dFxuICogQHJldHVybiB7T2JqZWN0fVxuICovXG5QYXJzZXIucHJvdG90eXBlLnBhcnNlID0gZnVuY3Rpb24gKGlucHV0KSB7XG4gIEhic1BhcnNlci55eSA9IHRoaXMueXk7XG5cbiAgLy8gUGFyc2UgaXQgYXMgYSBIYW5kbGViYXJzIHRvIGV4dHJhY3QgdGhlIGltcG9ydGFudCBub2RlcyBmaXJzdC4gVGhlbiB3ZVxuICAvLyBzdHJpbmdpZnkgdGhlIG5vZGUgdG8gc29tZXRoaW5nIHRoZSBIVE1MIHBhcnNlciBjYW4gaGFuZGxlLiBUaGUgQVNUIHRoZVxuICAvLyBIVE1MIHBhcnNlciBnZW5lcmF0ZXMgd2lsbCBiZSBwYXJzZWQgdXNpbmcgSGFuZGxlYmFycyBhZ2FpbiB0byBpbmplY3QgdGhlXG4gIC8vIG9yaWdpbmFsIG5vZGVzIGJhY2suXG4gIHJldHVybiBwYXJzZUFzSFRNTChIYnNQYXJzZXIucGFyc2UoaW5wdXQpKTtcbn07XG5cbi8qKlxuICogRXhwb3J0IGEgc3RhdGljIGluc3RhbmNlIG9mIHRoZSBwYXJzZXIuXG4gKlxuICogQHR5cGUge1BhcnNlcn1cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBuZXcgUGFyc2VyKCk7XG4iLCJ2YXIgcHJpbnRlciA9IHJlcXVpcmUoJ2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvY29tcGlsZXIvcHJpbnRlcicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHByaW50ZXI7XG4iLCJ2YXIgdmlzaXRvciA9IHJlcXVpcmUoJ2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvY29tcGlsZXIvdmlzaXRvcicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHZpc2l0b3I7XG4iLCJ2YXIgYmFzZSAgICAgPSByZXF1aXJlKCdoYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2Jhc2UnKTtcbnZhciB1dGlscyAgICA9IHJlcXVpcmUoJ2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvdXRpbHMnKTtcbnZhciBjb21waWxlciA9IHJlcXVpcmUoJ2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvY29tcGlsZXInKTtcbnZhciBydW50aW1lICA9IHJlcXVpcmUoJ2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvcnVudGltZScpO1xuXG52YXIgSGFuZGxlYmFycyA9IG1vZHVsZS5leHBvcnRzID0gYmFzZS5jcmVhdGUoKTtcblxudXRpbHMuYXR0YWNoKEhhbmRsZWJhcnMpO1xuY29tcGlsZXIuYXR0YWNoKEhhbmRsZWJhcnMpO1xucnVudGltZS5hdHRhY2goSGFuZGxlYmFycyk7XG4iLCJ2YXIgcnVudGltZSA9IHJlcXVpcmUoJ2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvcnVudGltZScpO1xudmFyIGJyb3dzZXIgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJztcbnZhciByYWYgICAgID0gYnJvd3NlciAmJiByZXF1aXJlKCdyYWYtY29tcG9uZW50Jyk7XG5cbi8qKlxuICogQXR0cmlidXRlIHJ1bnRpbWUgZmVhdHVyZXMgdG8gdGhlIERPTUJhcnMgaW5zdGFuY2UuXG4gKlxuICogQHBhcmFtICB7T2JqZWN0fSBET01CYXJzXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cbmV4cG9ydHMuYXR0YWNoID0gZnVuY3Rpb24gKERPTUJhcnMpIHtcbiAgdmFyIFZNICAgID0gcnVudGltZS5hdHRhY2goRE9NQmFycykuVk07XG4gIHZhciBVdGlscyA9IERPTUJhcnMuVXRpbHM7XG5cbiAgLyoqXG4gICAqIEJpbmQgYSBmdW5jdGlvbiB0byB0aGUgYW5pbWF0aW9uIGZyYW1lLlxuICAgKlxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAgICogQHJldHVybiB7TnVtYmVyfVxuICAgKi9cbiAgVk0uZXhlYyA9IGZ1bmN0aW9uIChmbikge1xuICAgIHJldHVybiBicm93c2VyID8gcmFmKGZuKSA6IHNldEltbWVkaWF0ZShmbik7XG4gIH07XG5cbiAgLyoqXG4gICAqIENhbmNlbCBhbiBleGVjdXRpb24uXG4gICAqXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBpZFxuICAgKi9cbiAgVk0uZXhlYy5jYW5jZWwgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICByZXR1cm4gYnJvd3NlciA/IHJhZi5jYW5jZWwoaWQpIDogY2xlYXJJbW1lZGlhdGUoaWQpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBBY2NlcHRzIGEgZnVuY3Rpb24gdGhhdCBoYXMgc3Vic2NyaXB0aW9ucyBjYWxsZWQgaW5zaWRlIGFuZCByZXR1cm5zIGEgbmV3XG4gICAqIGZ1bmN0aW9uIHRoYXQgd2lsbCBsaXN0ZW4gdG8gYWxsIHN1YnNjcmlwdGlvbnMgYW5kIGNhbiB1cGRhdGUgd2l0aCBhbnlcbiAgICogY2hhbmdlcy5cbiAgICpcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gICAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICAgKi9cbiAgVk0uc3Vic2NyaWJlID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgLyoqXG4gICAgICogVGhlIHJldHVybmVkIHN1YnNjcmlwdGlvbiBmdW5jdGlvbiB0YWtlcyBjYXJlIG9mIGFsaWFzaW5nIHRoZVxuICAgICAqIHN1YnNjcmlwdGlvbnMgYXJyYXkgY29ycmVjdGx5LCBzdWJzY3JpYmluZyBmb3IgdXBkYXRlcyBhbmQgdHJpZ2dlcmluZ1xuICAgICAqIHVwZGF0ZXMgd2hlbiBhbnkgb2YgdGhlIHN1YnNjcmlwdGlvbnMgY2hhbmdlLlxuICAgICAqXG4gICAgICogQHJldHVybiB7Kn1cbiAgICAgKi9cbiAgICB2YXIgc3Vic2NyaWJlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciByZXN1bHQgPSBzdWJzY3JpYmVyLmV4ZWMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIGVhY2hTdWJzY3JpcHRpb24oc3Vic2NyaWJlci5zdWJzY3JpcHRpb25zLCBET01CYXJzLnN1YnNjcmliZSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG5cbiAgICAvLyBLZWVwIGFuIGFycmF5IG9mIGN1cnJlbnQgc3Vic2NyaXB0aW9ucyBhbmQgYW4gb2JqZWN0IHdpdGggcmVmZXJlbmNlc1xuICAgIC8vIHRvIGNoaWxkIHN1YnNjcmlwdGlvbiBmdW5jdGlvbnMuXG4gICAgc3Vic2NyaWJlci5jaWQgICAgICA9ICdzdWJzY3JpYmVyJyArIFV0aWxzLnVuaXF1ZUlkKCk7XG4gICAgc3Vic2NyaWJlci5jaGlsZHJlbiA9IHt9O1xuXG4gICAgLyoqXG4gICAgICogVHJpZ2dlciB0aGlzIGZ1bmN0aW9uIHdpdGggZXZlcnkgY2hhbmdlIHdpdGggdGhlIGxpc3RlbmVycy5cbiAgICAgKi9cbiAgICB2YXIgY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgICAgLy8gSWYgdGhlIHRyaWdnZXJlZCBmbGFnIGhhcyBiZWVuIHNldCwgZG9uJ3QgY2F1c2UgYW5vdGhlciB1cGRhdGUuXG4gICAgICBpZiAoc3Vic2NyaWJlci50cmlnZ2VyZWQgfHwgc3Vic2NyaWJlci51bnN1YnNjcmliZWQpIHsgcmV0dXJuOyB9XG5cbiAgICAgIC8vIFNldCBhIHRyaWdnZXJlZCBmbGFnIHRvIGF2b2lkIG11bHRpcGxlIHRyaWdnZXJzLiBBbHNvIHVuc3Vic2NyaWJlIGFueVxuICAgICAgLy8gY2hpbGRyZW4gaW1tZWRpYXRlbHkgdG8gc3RvcCB1cGRhdGUgY2xhc2hlcy5cbiAgICAgIHN1YnNjcmliZXIudHJpZ2dlcmVkID0gdHJ1ZTtcbiAgICAgIHN1YnNjcmliZXIudW5zdWJzY3JpYmVDaGlsZHJlbigpO1xuXG4gICAgICBzdWJzY3JpYmVyLl9leGVjID0gVk0uZXhlYyhmdW5jdGlvbiAoKSB7XG4gICAgICAgIHN1YnNjcmliZXIuYmVmb3JlVXBkYXRlKCk7XG4gICAgICAgIHN1YnNjcmliZXIudXBkYXRlKHN1YnNjcmliZXIuZXhlYygpKTtcbiAgICAgICAgc3Vic2NyaWJlci5hZnRlclVwZGF0ZSgpO1xuICAgICAgICBkZWxldGUgc3Vic2NyaWJlci50cmlnZ2VyZWQ7XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogSXRlcmF0ZSBvdmVyIGEgc3Vic2NyaXB0aW9ucyBvYmplY3QgYW5kIHVuc3Vic2NyaWJlIGV2ZXJ5dGhpbmcuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBzdWJzY3JpcHRpb25zXG4gICAgICovXG4gICAgdmFyIGVhY2hTdWJzY3JpcHRpb24gPSBmdW5jdGlvbiAoc3Vic2NyaXB0aW9ucywgZm4pIHtcbiAgICAgIGZvciAodmFyIHByb3BlcnR5IGluIHN1YnNjcmlwdGlvbnMpIHtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHN1YnNjcmlwdGlvbnNbcHJvcGVydHldKSB7XG4gICAgICAgICAgZm4oc3Vic2NyaXB0aW9uc1twcm9wZXJ0eV1ba2V5XSwgcHJvcGVydHksIGNoYW5nZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogSXRlcmF0ZSBvdmVyIGFuIGFycmF5IG9mIGZ1bmN0aW9ucyBhbmQgZXhlY3V0ZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHN1YnNjcmlwdGlvbnNcbiAgICAgKi9cbiAgICB2YXIgaXRlcmF0aW9uID0gZnVuY3Rpb24gKHN1YnNjcmlwdGlvbnMpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3Vic2NyaXB0aW9ucy5sZW5ndGg7IGkrKykge1xuICAgICAgICBzdWJzY3JpcHRpb25zW2ldKCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEV4ZWN1dGUgdGhlIGZ1bmN0aW9uIGFuZCByZXR1cm4gdGhlIHJlc3VsdC5cbiAgICAgKlxuICAgICAqIEByZXR1cm4geyp9XG4gICAgICovXG4gICAgc3Vic2NyaWJlci5leGVjID0gZnVuY3Rpb24gKCkge1xuICAgICAgLy8gSWYgd2UgaGF2ZSBhIHBhcmVudCBzdWJzY3JpYmVyLCBsaW5rIHRoZSBzdWJzY3JpYmVycyB0b2dldGhlci5cbiAgICAgIGlmIChWTS5zdWJzY3JpYmVyKSB7XG4gICAgICAgIHN1YnNjcmliZXIucGFyZW50ID0gVk0uc3Vic2NyaWJlcjtcbiAgICAgICAgVk0uc3Vic2NyaWJlci5jaGlsZHJlbltzdWJzY3JpYmVyLmNpZF0gPSBzdWJzY3JpYmVyO1xuICAgICAgfVxuXG4gICAgICAvLyBBbGlhcyBzdWJzY3JpYmVyIGZ1bmN0aW9uYWxpdHkgdG8gdGhlIFZNIG9iamVjdC5cbiAgICAgIFZNLnN1YnNjcmliZXIgID0gc3Vic2NyaWJlcjtcbiAgICAgIFZNLnVuc3Vic2NyaWJlID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgIHN1YnNjcmliZXIudW5zdWJzY3JpcHRpb25zLnB1c2goZm4pO1xuICAgICAgfTtcblxuICAgICAgLy8gUmVzZXQgc3Vic2NyaXB0aW9ucyBiZWZvcmUgZXhlY3V0aW9uLlxuICAgICAgc3Vic2NyaWJlci5zdWJzY3JpcHRpb25zICAgPSB7fTtcbiAgICAgIHN1YnNjcmliZXIudW5zdWJzY3JpcHRpb25zID0gW107XG5cbiAgICAgIHZhciByZXN1bHQgPSBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgICAvLyBSZXNldCB0aGUgVk0gZnVuY3Rpb25hbGl0eSB0byB3aGF0IGl0IHdhcyBiZWZvcmVoYW5kLlxuICAgICAgVk0uc3Vic2NyaWJlciAgPSBzdWJzY3JpYmVyLnBhcmVudDtcbiAgICAgIFZNLnVuc3Vic2NyaWJlID0gbnVsbDtcblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUnVuIHRoaXMgZnVuY3Rpb24gYmVmb3JlIHdlIHJ1biBhbiB1cGRhdGUgZnVuY3Rpb24uIEl0IG1vdmVzIGN1cnJlbnRcbiAgICAgKiBzdWJzY3JpcHRpb25zIHNvIHRoYXQgd2UgY2FuIGRpZmYgdGhlIHN1YnNjcmlwdGlvbnMgYWZ0ZXIgd2UgdXBkYXRlXG4gICAgICogdGhlIERPTS5cbiAgICAgKi9cbiAgICBzdWJzY3JpYmVyLmJlZm9yZVVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIGl0ZXJhdGlvbihzdWJzY3JpYmVyLnVuc3Vic2NyaXB0aW9ucyk7XG4gICAgICBzdWJzY3JpYmVyLnByZXZTdWJzY3JpcHRpb25zID0gc3Vic2NyaWJlci5zdWJzY3JpcHRpb25zO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSdW4gdGhpcyBmdW5jdGlvbiBhZnRlciBhbiB1cGRhdGUuIEl0IHdpbGwgY2hlY2sgZm9yIGRpZmZlcmVuY2UgaW4gdGhlXG4gICAgICogYmVmb3JlIGFuZCBhZnRlciB1cGRhdGVzLlxuICAgICAqL1xuICAgIHN1YnNjcmliZXIuYWZ0ZXJVcGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgc3Vic2NyaXB0aW9ucyA9IHN1YnNjcmliZXIuc3Vic2NyaXB0aW9ucztcblxuICAgICAgLy8gRGlmZiB0aGUgcHJldmlvdXMgc3Vic2NyaXB0aW9ucyBhbmQgbmV3IHN1YnNjcmlwdGlvbnMgdG8gYWRkL3JlbW92ZVxuICAgICAgLy8gbGlzdGVuZXJzIGFzIG5lZWRlZC4gVGhpcyBzaG91bGQgYmUgbW9yZSBtZW1vcnkgZWZmaWNpZW50IHRoYW4gYmxpbmRseVxuICAgICAgLy8gYWRkaW5nIGFuZCByZW1vdmluZyBsaXN0ZW5lcnMgZXZlcnkgdGltZS5cbiAgICAgIGZvciAodmFyIHByb3BlcnR5IGluIHN1YnNjcmlwdGlvbnMpIHtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHN1YnNjcmlwdGlvbnNbcHJvcGVydHldKSB7XG4gICAgICAgICAgaWYgKCFzdWJzY3JpYmVyLnByZXZTdWJzY3JpcHRpb25zW3Byb3BlcnR5XVtrZXldKSB7XG4gICAgICAgICAgICBET01CYXJzLnN1YnNjcmliZShzdWJzY3JpcHRpb25zW3Byb3BlcnR5XVtrZXldLCBwcm9wZXJ0eSwgY2hhbmdlKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZGVsZXRlIHN1YnNjcmliZXIucHJldlN1YnNjcmlwdGlvbnNbcHJvcGVydHldW2tleV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIExvb3Agb3ZlciBwcmV2aW91cyBzdWJzY3JpcHRpb25zIHRoYXQgbm8gbG9uZ2VyIGV4aXN0IGFuZCB1bnN1YnNjcmliZS5cbiAgICAgIGVhY2hTdWJzY3JpcHRpb24oc3Vic2NyaWJlci5wcmV2U3Vic2NyaXB0aW9ucywgRE9NQmFycy51bnN1YnNjcmliZSk7XG5cbiAgICAgIGRlbGV0ZSBzdWJzY3JpYmVyLnByZXZTdWJzY3JpcHRpb25zO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmUgdGhlIGN1cnJlbnQgc3Vic2NyaWJlciBmcm9tIGFsbCBsaXN0ZW5lcnMuIFdlIGFsc28gbmVlZCB0byBjYW5jZWxcbiAgICAgKiBhbnkgY3VycmVudCBleGVjdXRpb24gZXZlbnQgYW5kIHJlbW92ZSBhIHJlZmVyZW5jZSBmcm9tIHRoZSBwYXJlbnRcbiAgICAgKiBzdWJzY3JpcHRpb24uXG4gICAgICovXG4gICAgc3Vic2NyaWJlci51bnN1YnNjcmliZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIGl0ZXJhdGlvbihzdWJzY3JpYmVyLnVuc3Vic2NyaXB0aW9ucyk7XG4gICAgICBlYWNoU3Vic2NyaXB0aW9uKHN1YnNjcmliZXIuc3Vic2NyaXB0aW9ucywgRE9NQmFycy51bnN1YnNjcmliZSk7XG5cbiAgICAgIGlmIChzdWJzY3JpYmVyLnBhcmVudCkge1xuICAgICAgICBkZWxldGUgc3Vic2NyaWJlci5wYXJlbnQuY2hpbGRyZW5bc3Vic2NyaWJlci5jaWRdO1xuICAgICAgICBkZWxldGUgc3Vic2NyaWJlci5wYXJlbnQ7XG4gICAgICB9XG5cbiAgICAgIC8vIFRyYWNrIHdoZXRoZXIgd2UgaGF2ZSBiZWVuIHVuc3Vic2NyaWJlZC4gVGhpcyBpcyByZXF1aXJlZCBzaW5jZSB0aGVcbiAgICAgIC8vIGxpc3RlbmVyIGNvdWxkIHN0aWxsIGJlIHRyaWdnZXJlZCBhdCBhbnkgdGltZSBldmVuIHRob3VnaCB3ZSBleHBlY3RcbiAgICAgIC8vIHRoZSBleHRlcm5hbCByZWZlcmVuY2VzIHRvIGJlIGRyb3BwZWQuIFRoaXMgY291bGQgYWxzbyBpbmRpY2F0ZSBhXG4gICAgICAvLyBwb3RlbnRpYWwgbWVtb3J5IGxlYWsgd2l0aCB0aGUgbGlzdGVuZXIgdW5zdXNiY3JpcHRpb24gY29kZS5cbiAgICAgIHN1YnNjcmliZXIudW5zdWJzY3JpYmVkID0gdHJ1ZTtcbiAgICAgIFZNLmV4ZWMuY2FuY2VsKHN1YnNjcmliZXIuX2V4ZWMpO1xuICAgICAgc3Vic2NyaWJlci51bnN1YnNjcmliZUNoaWxkcmVuKCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFVuc3Vic2NyaWJlIGV2ZXJ5IGNoaWxkIG9mIHRoZSBjdXJyZW50IHN1YnNjcmlwdGlvbi5cbiAgICAgKi9cbiAgICBzdWJzY3JpYmVyLnVuc3Vic2NyaWJlQ2hpbGRyZW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICBmb3IgKHZhciBjaGlsZCBpbiBzdWJzY3JpYmVyLmNoaWxkcmVuKSB7XG4gICAgICAgIHN1YnNjcmliZXIuY2hpbGRyZW5bY2hpbGRdLnVuc3Vic2NyaWJlKCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBzdWJzY3JpYmVyO1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZW5kZXIgYW5kIHN1YnNjcmliZSBhIHNpbmdsZSBET00gbm9kZSB1c2luZyBhIGN1c3RvbSBjcmVhdGlvbiBmdW5jdGlvbi5cbiAgICpcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBjcmVhdGVcbiAgICogQHJldHVybiB7Tm9kZX1cbiAgICovXG4gIHZhciBzdWJzY3JpYmVOb2RlID0gZnVuY3Rpb24gKGZuLCBjcmVhdGUpIHtcbiAgICB2YXIgc3Vic2NyaXB0aW9uID0gVk0uc3Vic2NyaWJlKGZuKTtcblxuICAgIC8vIFdlIG5lZWQgdG8gYWRkIGEgYmVmb3JlIGFuZCBhZnRlciBlbGVtZW50IHBsYWNlaG9sZGVyIHNpbmNlIHRoZSBwaWVjZXNcbiAgICAvLyBpbiBiZXR3ZWVuIGNhbiBiZSBlbmFibGVkIGFuZCBkaXNhYmxlZCByYW5kb21seS5cbiAgICB2YXIgcGxhY2Vob2xkZXJzID0ge1xuICAgICAgYWZ0ZXI6ICBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJyksXG4gICAgICBiZWZvcmU6IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKVxuICAgIH07XG5cbiAgICAvLyBDcmVhdGUgYSBmdW5jdGlvbiB0byBrZWVwIHRyYWNrIG9mIGRvY3VtZW50IGZyYWdtZW50IGNoaWxkcmVuLlxuICAgIHZhciBnZW5lcmF0ZSA9IGZ1bmN0aW9uICh0ZXh0KSB7XG4gICAgICB2YXIgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG5cbiAgICAgIC8vIFRvIGtlZXAgdHJhY2sgb2YgdGhlIGluc2VydGlvbnMgYW5kIGRlbGV0aW9ucyBhY2N1cmF0ZWx5IHdlIG5lZWQgdG9cbiAgICAgIC8vIGFkZCBwbGFjZWhvbGRlciBET00gZWxlbWVudHMuXG4gICAgICBmcmFnbWVudC5hcHBlbmRDaGlsZChwbGFjZWhvbGRlcnMuYmVmb3JlKTtcbiAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKGNyZWF0ZSh0ZXh0KSk7XG4gICAgICBmcmFnbWVudC5hcHBlbmRDaGlsZChwbGFjZWhvbGRlcnMuYWZ0ZXIpO1xuXG4gICAgICByZXR1cm4gZnJhZ21lbnQ7XG4gICAgfTtcblxuICAgIHN1YnNjcmlwdGlvbi51cGRhdGUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHZhciBwYXJlbnROb2RlID0gcGxhY2Vob2xkZXJzLmJlZm9yZS5wYXJlbnROb2RlO1xuICAgICAgdmFyIGNoaWxkTm9kZXMgPSBwYXJlbnROb2RlLmNoaWxkTm9kZXM7XG5cbiAgICAgIC8vIEl0ZXJhdGUgb3ZlciB0aGUgY2hpbGQgbm9kZXMgdG8gcmVtb3ZlIHRoZSBhdHRhY2hlZCBjaGlsZHJlbi5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFyZW50Tm9kZS5jaGlsZE5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIC8vIFdoZW4gd2UgZmluZCB0aGUgYGJlZm9yZWAgcGxhY2Vob2xkZXIgbm9kZSwgc3RhcnQgcmVtb3ZpbmcgYWxsXG4gICAgICAgIC8vIHRoZSBjaGlsZCBub2RlcyB1bnRpbCB3ZSBoaXQgdGhlIGBhZnRlcmAgcGxhY2Vob2xkZXIgbm9kZS5cbiAgICAgICAgaWYgKGNoaWxkTm9kZXNbaV0gPT09IHBsYWNlaG9sZGVycy5iZWZvcmUpIHtcbiAgICAgICAgICBkbyB7XG4gICAgICAgICAgICBwYXJlbnROb2RlLnJlbW92ZUNoaWxkKGNoaWxkTm9kZXNbaV0pO1xuICAgICAgICAgIH0gd2hpbGUgKGNoaWxkTm9kZXNbaV0gIT09IHBsYWNlaG9sZGVycy5hZnRlcik7XG5cbiAgICAgICAgICB2YXIgbmV4dFNpYmxpbmcgPSBwbGFjZWhvbGRlcnMuYWZ0ZXIubmV4dFNpYmxpbmc7XG4gICAgICAgICAgcGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoZ2VuZXJhdGUodmFsdWUpLCBuZXh0U2libGluZyk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIGdlbmVyYXRlKHN1YnNjcmlwdGlvbigpKTtcbiAgfTtcblxuICAvKipcbiAgICogQ3JlYXRlIGFuIGVsZW1lbnQgYW5kIHN1YnNjcmliZSB0byBhbnkgY2hhbmdlcy4gVGhpcyBtZXRob2QgcmVxdWlyZXMgYVxuICAgKiBjYWxsYmFjayBmdW5jdGlvbiBmb3IgYW55IGVsZW1lbnQgY2hhbmdlcyBzaW5jZSB5b3UgY2FuJ3QgY2hhbmdlIGEgdGFnXG4gICAqIG5hbWUgaW4gcGxhY2UuXG4gICAqXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gY2JcbiAgICogQHJldHVybiB7RWxlbWVudH1cbiAgICovXG4gIFZNLmNyZWF0ZUVsZW1lbnQgPSBmdW5jdGlvbiAoZm4sIGNiKSB7XG4gICAgdmFyIHN1YnNjcmlwdGlvbiA9IFZNLnN1YnNjcmliZShmbik7XG4gICAgdmFyIGVsICAgICAgICAgICA9IFV0aWxzLmNyZWF0ZUVsZW1lbnQoc3Vic2NyaXB0aW9uKCkpO1xuXG4gICAgc3Vic2NyaXB0aW9uLnVwZGF0ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgY2IoZWwgPSBVdGlscy5jb3B5QW5kUmVwbGFjZU5vZGUoVXRpbHMuY3JlYXRlRWxlbWVudCh2YWx1ZSksIGVsKSk7XG4gICAgfTtcblxuICAgIHJldHVybiBlbDtcbiAgfTtcblxuICAvKipcbiAgICogU2V0IGFuIGVsZW1lbnRzIGF0dHJpYnV0ZS4gV2UgYWNjZXB0IHRoZSBjdXJyZW50IGVsZW1lbnQgYSBmdW5jdGlvblxuICAgKiBiZWNhdXNlIHdoZW4gYSB0YWcgbmFtZSBjaGFuZ2VzIHdlIHdpbGwgbG9zZSByZWZlcmVuY2UgdG8gdGhlIGFjdGl2ZWx5XG4gICAqIHJlbmRlcmVkIGVsZW1lbnQuXG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGVsZW1lbnRGblxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBuYW1lRm5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gdmFsdWVGblxuICAgKi9cbiAgVk0uc2V0QXR0cmlidXRlID0gZnVuY3Rpb24gKGVsZW1lbnRGbiwgbmFtZUZuLCB2YWx1ZUZuKSB7XG4gICAgdmFyIG5hbWVTdWJzY3JpcHRpb24gID0gVk0uc3Vic2NyaWJlKG5hbWVGbik7XG4gICAgdmFyIHZhbHVlU3Vic2NyaXB0aW9uID0gVk0uc3Vic2NyaWJlKHZhbHVlRm4pO1xuXG4gICAgLy8gS2VlcCB0cmFjayBvZiB0aGUgY3VycmVudCBuYW1lIGFuZCB2YWx1ZSB3aXRob3V0IGhhdmluZyB0byByZS1ydW4gdGhlXG4gICAgLy8gZnVuY3Rpb24gZXZlcnkgdGltZSBzb21ldGhpbmcgY2hhbmdlcy5cbiAgICB2YXIgYXR0ck5hbWUgID0gbmFtZVN1YnNjcmlwdGlvbigpO1xuICAgIHZhciBhdHRyVmFsdWUgPSB2YWx1ZVN1YnNjcmlwdGlvbigpO1xuXG4gICAgbmFtZVN1YnNjcmlwdGlvbi51cGRhdGUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIFV0aWxzLnJlbW92ZUF0dHJpYnV0ZShlbGVtZW50Rm4oKSwgYXR0ck5hbWUpO1xuICAgICAgVXRpbHMuc2V0QXR0cmlidXRlKGVsZW1lbnRGbigpLCBhdHRyTmFtZSA9IHZhbHVlLCBhdHRyVmFsdWUpO1xuICAgIH07XG5cbiAgICB2YWx1ZVN1YnNjcmlwdGlvbi51cGRhdGUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIFV0aWxzLnNldEF0dHJpYnV0ZShlbGVtZW50Rm4oKSwgYXR0ck5hbWUsIGF0dHJWYWx1ZSA9IHZhbHVlKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIFV0aWxzLnNldEF0dHJpYnV0ZShlbGVtZW50Rm4oKSwgYXR0ck5hbWUsIGF0dHJWYWx1ZSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIERPTSBlbGVtZW50IGFuZCBzdWJzY3JpYmUgdG8gYW55IGNoYW5nZXMuXG4gICAqXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICAgKiBAcmV0dXJuIHtOb2RlfVxuICAgKi9cbiAgVk0uY3JlYXRlRE9NID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgcmV0dXJuIHN1YnNjcmliZU5vZGUoZm4sIFV0aWxzLmRvbWlmeUV4cHJlc3Npb24pO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSB0ZXh0IG5vZGUgYW5kIHN1YnNjcmliZSB0byBhbnkgY2hhbmdlcy5cbiAgICpcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gICAqIEByZXR1cm4ge1RleHR9XG4gICAqL1xuICBWTS5jcmVhdGVUZXh0ID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgcmV0dXJuIHN1YnNjcmliZU5vZGUoZm4sIFV0aWxzLnRleHRpZnlFeHByZXNzaW9uKTtcbiAgfTtcblxuICAvKipcbiAgICogQ3JlYXRlIGEgY29tbWVudCBub2RlIGFuZCBzdWJzY3JpYmUgdG8gYW55IGNoYW5nZXMuXG4gICAqXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmblxuICAgKiBAcmV0dXJuIHtDb21tZW50fVxuICAgKi9cbiAgVk0uY3JlYXRlQ29tbWVudCA9IGZ1bmN0aW9uIChmbikge1xuICAgIHZhciBzdWJzY3JpcHRpb24gPSBWTS5zdWJzY3JpYmUoZm4pO1xuICAgIHZhciBub2RlICAgICAgICAgPSBVdGlscy5jcmVhdGVDb21tZW50KHN1YnNjcmlwdGlvbigpKTtcblxuICAgIHN1YnNjcmlwdGlvbi51cGRhdGUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIG5vZGUudGV4dENvbnRlbnQgPSB2YWx1ZTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIG5vZGU7XG4gIH07XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlIGFuIGV4ZWN1dGFibGUgdGVtcGxhdGUgZnJvbSBhIHRlbXBsYXRlIHNwZWMuXG4gICAqXG4gICAqIEBwYXJhbSAge09iamVjdH0gICB0ZW1wbGF0ZVNwZWNcbiAgICogQHJldHVybiB7RnVuY3Rpb259XG4gICAqL1xuICBWTS50ZW1wbGF0ZSA9IERPTUJhcnMudGVtcGxhdGUgPSBmdW5jdGlvbiAodGVtcGxhdGVTcGVjKSB7XG4gICAgdmFyIERPTUJhcnMgPSB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogVGhlIGNvbnRhaW5lciBvYmplY3QgaG9sZHMgYWxsIHRoZSBmdW5jdGlvbnMgdXNlZCBieSB0aGUgdGVtcGxhdGUgc3BlYy5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICovXG4gICAgdmFyIGNvbnRhaW5lciA9IHtcbiAgICAgIGludm9rZVBhcnRpYWw6ICAgIFZNLmludm9rZVBhcnRpYWwsXG4gICAgICBwcm9ncmFtczogICAgICAgICBbXSxcbiAgICAgIG5vb3A6ICAgICAgICAgICAgIFZNLm5vb3AsXG4gICAgICBjb21waWxlckluZm86ICAgICBudWxsLFxuICAgICAgYXBwZW5kQ2hpbGQ6ICAgICAgVXRpbHMuYXBwZW5kQ2hpbGQsXG4gICAgICBjcmVhdGVET006ICAgICAgICBWTS5jcmVhdGVET00sXG4gICAgICBjcmVhdGVUZXh0OiAgICAgICBWTS5jcmVhdGVUZXh0LFxuICAgICAgc2V0QXR0cmlidXRlOiAgICAgVk0uc2V0QXR0cmlidXRlLFxuICAgICAgY3JlYXRlQ29tbWVudDogICAgVk0uY3JlYXRlQ29tbWVudCxcbiAgICAgIGNyZWF0ZUVsZW1lbnQ6ICAgIFZNLmNyZWF0ZUVsZW1lbnQsXG4gICAgICBlc2NhcGVFeHByZXNzaW9uOiBVdGlscy5lc2NhcGVFeHByZXNzaW9uLFxuICAgICAgcHJvZ3JhbVdpdGhEZXB0aDogVk0ucHJvZ3JhbVdpdGhEZXB0aFxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYW5kIHJldHVybiBhIHByb2dyYW0gc2luZ2xldG9uIGJhc2VkIG9uIGluZGV4LlxuICAgICAqXG4gICAgICogQHBhcmFtICB7TnVtYmVyfSAgIGlcbiAgICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAgICAgKiBAcGFyYW0gIHtPYmplY3R9ICAgZGF0YVxuICAgICAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICAgICAqL1xuICAgIGNvbnRhaW5lci5wcm9ncmFtID0gZnVuY3Rpb24gKGksIGZuLCBkYXRhKSB7XG4gICAgICB2YXIgcHJvZ3JhbVdyYXBwZXIgPSB0aGlzLnByb2dyYW1zW2ldO1xuXG4gICAgICBpZiAoZGF0YSkge1xuICAgICAgICByZXR1cm4gVk0ucHJvZ3JhbShpLCBmbiwgZGF0YSk7XG4gICAgICB9XG5cbiAgICAgIGlmICghcHJvZ3JhbVdyYXBwZXIpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucHJvZ3JhbXNbaV0gPSBWTS5wcm9ncmFtKGksIGZuKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHByb2dyYW1XcmFwcGVyO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBNZXJnZSB0d28gb2JqZWN0cyBpbnRvIGEgc2luZ2xlIG9iamVjdC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSAge09iamVjdH0gcGFyYW1cbiAgICAgKiBAcGFyYW0gIHtPYmplY3R9IGNvbW1vblxuICAgICAqIEByZXR1cm4ge09iamVjdH1cbiAgICAgKi9cbiAgICBjb250YWluZXIubWVyZ2UgPSBmdW5jdGlvbiAocGFyYW0sIGNvbW1vbikge1xuICAgICAgdmFyIHJldCA9IHBhcmFtIHx8IGNvbW1vbjtcblxuICAgICAgaWYgKHBhcmFtICYmIGNvbW1vbikge1xuICAgICAgICByZXQgPSB7fTtcbiAgICAgICAgVXRpbHMuZXh0ZW5kKHJldCwgY29tbW9uKTtcbiAgICAgICAgVXRpbHMuZXh0ZW5kKHJldCwgcGFyYW0pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmV0O1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBHZXQgYSBwcm9wZXJ0eSBmcm9tIGFuIG9iamVjdC4gUGFzc2VzIGluIHRoZSBvYmplY3QgaWQgKGRlcHRoKSB0byBtYWtlIGl0XG4gICAgICogbXVjaCBmYXN0ZXIgdG8gZG8gY29tcGFyaXNvbnMgYmV0d2VlbiBuZXcgYW5kIG9sZCBzdWJzY3JpcHRpb25zLlxuICAgICAqXG4gICAgICogQHBhcmFtICB7T2JqZWN0fSBvYmplY3RcbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IHByb3BlcnR5XG4gICAgICogQHBhcmFtICB7U3RyaW5nfSBpZFxuICAgICAqIEByZXR1cm4geyp9XG4gICAgICovXG4gICAgY29udGFpbmVyLmdldCA9IGZ1bmN0aW9uIChvYmplY3QsIHByb3BlcnR5LCBpZCkge1xuICAgICAgdmFyIHN1YnNjcmlwdGlvbnMgPSBWTS5zdWJzY3JpYmVyLnN1YnNjcmlwdGlvbnM7XG5cbiAgICAgIChzdWJzY3JpcHRpb25zW3Byb3BlcnR5XSB8fCAoc3Vic2NyaXB0aW9uc1twcm9wZXJ0eV0gPSB7fSkpW2lkXSA9IG9iamVjdDtcblxuICAgICAgcmV0dXJuIERPTUJhcnMuZ2V0KG9iamVjdCwgcHJvcGVydHkpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm4gdGhlIGNvbXBpbGVkIEphdmFTY3JpcHQgZnVuY3Rpb24gZm9yIGV4ZWN1dGlvbi5cbiAgICAgKlxuICAgICAqIEBwYXJhbSAge09iamVjdH0gY29udGV4dFxuICAgICAqIEBwYXJhbSAge09iamVjdH0gb3B0aW9uc1xuICAgICAqIEByZXR1cm4ge05vZGV9XG4gICAgICovXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgLy8gU3Vic2NyaWJlIHRvIHRoZSB0ZW1wbGF0ZSBzcGVjIGluc2lkZSB0aGUgcmV0dXJuZWQgZnVuY3Rpb24uIFRoaXMgaXMgc29cbiAgICAgIC8vIHRoYXQgKmV2ZXJ5KiBnZW5lcmF0ZWQgRE9NIHRlbXBsYXRlIHdpbGwgaGF2ZSBhIGRpZmZlcmVudCB1bnN1YnNjcmliZVxuICAgICAgLy8gbWV0aG9kLlxuICAgICAgdmFyIHN1YnNjcmliZXIgPSBWTS5zdWJzY3JpYmUodGVtcGxhdGVTcGVjKTtcblxuICAgICAgdmFyIHJlc3VsdCA9IHN1YnNjcmliZXIuY2FsbChcbiAgICAgICAgY29udGFpbmVyLFxuICAgICAgICBET01CYXJzLFxuICAgICAgICBjb250ZXh0LFxuICAgICAgICBvcHRpb25zLmhlbHBlcnMsXG4gICAgICAgIG9wdGlvbnMucGFydGlhbHMsXG4gICAgICAgIG9wdGlvbnMuZGF0YVxuICAgICAgKTtcblxuICAgICAgLy8gQXR0YWNoIHRoZSBjdXJyZW50IG9wZXJhdGluZyBjb250ZXh0IHRvIHRoZSBWTSBvYmplY3QgZm9yIHJlZmVyZW5jZVxuICAgICAgLy8gd2l0aGluIHRoZSB1dGlsaXR5IGZ1bmN0aW9ucy5cbiAgICAgIFZNLmNvbnRleHQgPSBjb250ZXh0O1xuXG4gICAgICAvLyBBdHRhY2ggYW4gYHVuc3Vic2NyaWJlYCBmdW5jdGlvbiB0byB0aGUgcmVzdWx0aW5nIERPTS5cbiAgICAgIC8vIFRPRE86IENvbWUgdXAgd2l0aCBhbiBpbXByb3ZlZCBzb2x1dGlvbi5cbiAgICAgIHJlc3VsdC51bnN1YnNjcmliZSA9IHN1YnNjcmliZXIudW5zdWJzY3JpYmU7XG5cbiAgICAgIHZhciBjb21waWxlckluZm8gICAgID0gY29udGFpbmVyLmNvbXBpbGVySW5mbyB8fCBbXTtcbiAgICAgIHZhciBjb21waWxlclJldmlzaW9uID0gY29tcGlsZXJJbmZvWzBdIHx8IDE7XG4gICAgICB2YXIgY3VycmVudFJldmlzaW9uICA9IERPTUJhcnMuQ09NUElMRVJfUkVWSVNJT047XG5cbiAgICAgIGlmIChjb21waWxlclJldmlzaW9uICE9PSBjdXJyZW50UmV2aXNpb24pIHtcbiAgICAgICAgaWYgKGNvbXBpbGVyUmV2aXNpb24gPCBjdXJyZW50UmV2aXNpb24pIHtcbiAgICAgICAgICB2YXIgcnVudGltZVZlcnNpb25zICA9IERPTUJhcnMuUkVWSVNJT05fQ0hBTkdFU1tjdXJyZW50UmV2aXNpb25dO1xuICAgICAgICAgIHZhciBjb21waWxlclZlcnNpb25zID0gRE9NQmFycy5SRVZJU0lPTl9DSEFOR0VTW2NvbXBpbGVyUmV2aXNpb25dO1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVGVtcGxhdGUgd2FzIHByZWNvbXBpbGVkIHdpdGggYW4gb2xkZXIgdmVyc2lvbiBvZiAnICtcbiAgICAgICAgICAgICdET01CYXJzIHRoYW4gdGhlIGN1cnJlbnQgcnVudGltZS4gUGxlYXNlIHVwZGF0ZSB5b3VyIHByZWNvbXBpbGVyJyArXG4gICAgICAgICAgICAnIHRvIGEgbmV3ZXIgdmVyc2lvbiAoJyArIHJ1bnRpbWVWZXJzaW9ucyArICcpIG9yIGRvd25ncmFkZSB5b3VyICcgK1xuICAgICAgICAgICAgJ3J1bnRpbWUgdG8gYW4gb2xkZXIgdmVyc2lvbiAoJyArIGNvbXBpbGVyVmVyc2lvbnMgKyAnKScpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUZW1wbGF0ZSB3YXMgcHJlY29tcGlsZWQgd2l0aCBhIG5ld2VyIHZlcnNpb24gb2YnICtcbiAgICAgICAgICAnRE9NQmFycyB0aGFuIHRoZSBjdXJyZW50IHJ1bnRpbWUuIFBsZWFzZSB1cGRhdGUgeW91ciBydW50aW1lIHRvICcgK1xuICAgICAgICAgICdhIG5ld2VyIHZlcnNpb24gKCcgKyBjb21waWxlckluZm9bMV0gKyAnKScpO1xuICAgICAgfVxuXG4gICAgICBWTS5jb250ZXh0ID0gbnVsbDtcblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9O1xuXG4gIHJldHVybiBET01CYXJzO1xufTtcbiIsInZhciB1dGlscyAgICA9IHJlcXVpcmUoJ2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvdXRpbHMnKTtcbnZhciBldmVudHMgICA9IHJlcXVpcmUoJy4vY29tcGlsZXIvZXZlbnRzJyk7XG52YXIgdW5pcXVlSWQgPSAwO1xuXG4vKipcbiAqIEF0dGFjaCByZXVzYWJsZSB1dGlsaXR5IGZ1bmN0aW9ucyB0byB0aGUgRE9NQmFycyBpbnN0YW5jZS5cbiAqXG4gKiBAcGFyYW0gIHtPYmplY3R9IERPTUJhcnNcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqL1xuZXhwb3J0cy5hdHRhY2ggPSBmdW5jdGlvbiAoRE9NQmFycykge1xuICB2YXIgVXRpbHMgPSB1dGlscy5hdHRhY2goRE9NQmFycykuVXRpbHM7XG5cbiAgLy8gRXh0ZW5kIHRoZSBET01CYXJzIHJvb3Qgb2JqZWN0IHdpdGggYW4gZXZlbnQgZW1pdHRlci5cbiAgRE9NQmFycy5VdGlscy5leHRlbmQoRE9NQmFycywgZXZlbnRzKTtcblxuICAvKipcbiAgICogU2ltcGxlIGZ1bmN0aW9uIHdyYXBwZXIgdGhhdCB3aWxsIGVtaXQgdGhlIGV2ZW50IHdpdGggdGhlIHJlc3VsdCBvZiB0aGVcbiAgICogZnVuY3Rpb24gZXhlY3V0aW9uIGV2ZXJ5IHRpbWUgdGhlIGZ1bmN0aW9uIGlzIHJ1bi5cbiAgICpcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gICAqIEBwYXJhbSAge1N0cmluZ30gICBldmVudFxuICAgKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAgICovXG4gIHZhciBlbWl0dGVyID0gZnVuY3Rpb24gKGZuLCBldmVudCkge1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIERPTUJhcnMuZW1pdChldmVudCwgcmVzdWx0KTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgfTtcblxuICAvKipcbiAgICogUmV0dXJuIGEgdW5pcXVlIGlkLlxuICAgKlxuICAgKiBAcmV0dXJuIHtOdW1iZXJ9XG4gICAqL1xuICBVdGlscy51bmlxdWVJZCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdW5pcXVlSWQrKztcbiAgfTtcblxuICAvKipcbiAgICogQ2hlY2sgd2hldGhlciBhbiBvYmplY3QgaXMgYWN0dWFsbHkgYSBET00gbm9kZS5cbiAgICpcbiAgICogQHBhcmFtICB7Kn0gICAgICAgZWxlbWVudFxuICAgKiBAcmV0dXJuIHtCb29sZWFufVxuICAgKi9cbiAgVXRpbHMuaXNOb2RlID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICByZXR1cm4gZWxlbWVudCBpbnN0YW5jZW9mIE5vZGU7XG4gIH07XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhbiBlbGVtZW50IGZyb20gYSB0YWcgbmFtZS5cbiAgICpcbiAgICogQHBhcmFtICB7U3RyaW5nfSB0YWdOYW1lXG4gICAqIEByZXR1cm4ge05vZGV9XG4gICAqL1xuICBVdGlscy5jcmVhdGVFbGVtZW50ID0gZW1pdHRlcihmdW5jdGlvbiAodGFnTmFtZSkge1xuICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHRhZ05hbWUpO1xuICB9LCAnY3JlYXRlRWxlbWVudCcpO1xuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBjb21tZW50IG5vZGUgYmFzZWQgb24gdGV4dCBjb250ZW50cy5cbiAgICpcbiAgICogQHBhcmFtICB7U3RyaW5nfSBjb250ZW50c1xuICAgKiBAcmV0dXJuIHtOb2RlfVxuICAgKi9cbiAgVXRpbHMuY3JlYXRlQ29tbWVudCA9IGVtaXR0ZXIoZnVuY3Rpb24gKGNvbnRlbnRzKSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZUNvbW1lbnQoY29udGVudHMpO1xuICB9LCAnY3JlYXRlQ29tbWVudCcpO1xuXG4gIC8qKlxuICAgKiBDb3B5IGFsbCBzaWduaWZpY2FudCBkYXRhIGZyb20gb25lIGVsZW1lbnQgbm9kZSB0byBhbm90aGVyLlxuICAgKlxuICAgKiBAcGFyYW0gIHtOb2RlfSBuZXdOb2RlXG4gICAqIEBwYXJhbSAge05vZGV9IG9sZE5vZGVcbiAgICogQHJldHVybiB7Tm9kZX1cbiAgICovXG4gIFV0aWxzLmNvcHlOb2RlID0gZnVuY3Rpb24gKG5ld05vZGUsIG9sZE5vZGUpIHtcbiAgICAvLyBNb3ZlIGFsbCBjaGlsZCBlbGVtZW50cyB0byB0aGUgbmV3IG5vZGUuXG4gICAgd2hpbGUgKG9sZE5vZGUuZmlyc3RDaGlsZCkge1xuICAgICAgbmV3Tm9kZS5hcHBlbmRDaGlsZChvbGROb2RlLmZpcnN0Q2hpbGQpO1xuICAgIH1cblxuICAgIC8vIENvcHkgYWxsIHRoZSBhdHRyaWJ1dGVzIHRvIHRoZSBuZXcgbm9kZS5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9sZE5vZGUuYXR0cmlidXRlcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGF0dHJpYnV0ZSA9IG9sZE5vZGUuYXR0cmlidXRlc1tpXTtcbiAgICAgIFV0aWxzLnNldEF0dHJpYnV0ZShuZXdOb2RlLCBhdHRyaWJ1dGUubmFtZSwgYXR0cmlidXRlLnZhbHVlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3Tm9kZTtcbiAgfTtcblxuICAvKipcbiAgICogQ29weSBhbGwgdGhlIGRhdGEgZnJvbSBvbmUgZWxlbWVudCB0byBhbm90aGVyIGFuZCByZXBsYWNlIGluIHBsYWNlLlxuICAgKlxuICAgKiBAcGFyYW0gIHtOb2RlfSBuZXdOb2RlXG4gICAqIEBwYXJhbSAge05vZGV9IG9sZE5vZGVcbiAgICogQHJldHVybiB7Tm9kZX1cbiAgICovXG4gIFV0aWxzLmNvcHlBbmRSZXBsYWNlTm9kZSA9IGZ1bmN0aW9uIChuZXdOb2RlLCBvbGROb2RlKSB7XG4gICAgb2xkTm9kZS5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChVdGlscy5jb3B5Tm9kZShuZXdOb2RlLCBvbGROb2RlKSwgb2xkTm9kZSk7XG4gICAgcmV0dXJuIG5ld05vZGU7XG4gIH07XG5cbiAgLyoqXG4gICAqIFNldCBhbiBhdHRyaWJ1dGUgdmFsdWUgb24gYW4gZWxlbWVudC5cbiAgICpcbiAgICogQHBhcmFtIHtOb2RlfSAgIGVsZW1lbnRcbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAgICogQHBhcmFtIHsqfSAgICAgIHZhbHVlXG4gICAqL1xuICBVdGlscy5zZXRBdHRyaWJ1dGUgPSBmdW5jdGlvbiAoZWxlbWVudCwgbmFtZSwgdmFsdWUpIHtcbiAgICBpZiAodmFsdWUgPT09IGZhbHNlKSB7XG4gICAgICByZXR1cm4gVXRpbHMucmVtb3ZlQXR0cmlidXRlKGVsZW1lbnQsIG5hbWUpO1xuICAgIH1cblxuICAgIERPTUJhcnMuZW1pdCgnc2V0QXR0cmlidXRlJywgZWxlbWVudCwgbmFtZSwgdmFsdWUpO1xuICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKG5hbWUsIHZhbHVlKTtcbiAgfTtcblxuICAvKipcbiAgICogUmVtb3ZlIGFuIGF0dHJpYnV0ZSBmcm9tIGFuIGVsZW1lbnQuXG4gICAqXG4gICAqIEBwYXJhbSB7Tm9kZX0gICBlbGVtZW50XG4gICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gICAqL1xuICBVdGlscy5yZW1vdmVBdHRyaWJ1dGUgPSBmdW5jdGlvbiAoZWxlbWVudCwgbmFtZSkge1xuICAgIGlmIChlbGVtZW50Lmhhc0F0dHJpYnV0ZShuYW1lKSkge1xuICAgICAgRE9NQmFycy5lbWl0KCdyZW1vdmVBdHRyaWJ1dGUnLCBlbGVtZW50LCBuYW1lKTtcbiAgICAgIGVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKG5hbWUpO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogQXBwZW5kIGEgY2hpbGQgZWxlbWVudCB0byBhIERPTSBub2RlLlxuICAgKlxuICAgKiBAcGFyYW0ge05vZGV9IHBhcmVudFxuICAgKiBAcGFyYW0ge05vZGV9IGNoaWxkXG4gICAqL1xuICBVdGlscy5hcHBlbmRDaGlsZCA9IGZ1bmN0aW9uIChwYXJlbnQsIGNoaWxkKSB7XG4gICAgaWYgKGNoaWxkID09IG51bGwpIHsgcmV0dXJuOyB9XG5cbiAgICBwYXJlbnQuYXBwZW5kQ2hpbGQoY2hpbGQpO1xuICAgIERPTUJhcnMuZW1pdCgnYXBwZW5kQ2hpbGQnLCBwYXJlbnQsIGNoaWxkKTtcbiAgfTtcblxuICAvKipcbiAgICogVHJhbnNmb3JtIGEgc3RyaW5nIGludG8gYXJiaXRyYXJ5IERPTSBub2Rlcy5cbiAgICpcbiAgICogQHBhcmFtICB7U3RyaW5nfSBzdHJpbmdcbiAgICogQHJldHVybiB7Tm9kZX1cbiAgICovXG4gIFV0aWxzLmRvbWlmeUV4cHJlc3Npb24gPSBlbWl0dGVyKGZ1bmN0aW9uIChzdHJpbmcpIHtcbiAgICBpZiAoVXRpbHMuaXNOb2RlKHN0cmluZykpIHtcbiAgICAgIHJldHVybiBzdHJpbmc7XG4gICAgfVxuXG4gICAgdmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGRpdi5pbm5lckhUTUwgPSBzdHJpbmc7XG5cbiAgICBpZiAoZGl2LmNoaWxkTm9kZXMubGVuZ3RoID09PSAxKSB7XG4gICAgICByZXR1cm4gZGl2LnJlbW92ZUNoaWxkKGRpdi5jaGlsZE5vZGVzWzBdKTtcbiAgICB9XG5cbiAgICB2YXIgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG5cbiAgICB3aGlsZSAoZGl2LmZpcnN0Q2hpbGQpIHtcbiAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKGRpdi5maXJzdENoaWxkKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnJhZ21lbnQ7XG4gIH0sICdkb21pZnknKTtcblxuICAvKipcbiAgICogVHJhbnNmb3JtIGEgc3RyaW5nIGludG8gYSBET00gdGV4dCBub2RlIGZvciBhcHBlbmRpbmcgdG8gdGhlIHRlbXBsYXRlLlxuICAgKlxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IHN0cmluZ1xuICAgKiBAcmV0dXJuIHtUZXh0fVxuICAgKi9cbiAgVXRpbHMudGV4dGlmeUV4cHJlc3Npb24gPSBlbWl0dGVyKGZ1bmN0aW9uIChzdHJpbmcpIHtcbiAgICBpZiAoc3RyaW5nIGluc3RhbmNlb2YgRE9NQmFycy5TYWZlU3RyaW5nKSB7XG4gICAgICByZXR1cm4gVXRpbHMuZG9taWZ5RXhwcmVzc2lvbihzdHJpbmcudG9TdHJpbmcoKSk7XG4gICAgfVxuXG4gICAgLy8gQ2F0Y2ggd2hlbiB0aGUgc3RyaW5nIGlzIGFjdHVhbGx5IGEgRE9NIG5vZGUgYW5kIHR1cm4gaXQgaW50byBhIHN0cmluZy5cbiAgICBpZiAoVXRpbHMuaXNOb2RlKHN0cmluZykpIHtcbiAgICAgIC8vIEFscmVhZHkgYSB0ZXh0IG5vZGUsIGp1c3QgcmV0dXJuIGl0IGltbWVkaWF0ZWx5LlxuICAgICAgaWYgKHN0cmluZy5ub2RlVHlwZSA9PT0gMykge1xuICAgICAgICByZXR1cm4gc3RyaW5nO1xuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIHN0cmluZy5vdXRlckhUTUwgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShzdHJpbmcub3V0ZXJIVE1MKTtcbiAgICAgIH1cblxuICAgICAgdmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgZGl2LmFwcGVuZENoaWxkKHN0cmluZy5jbG9uZU5vZGUodHJ1ZSkpO1xuICAgICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGRpdi5pbm5lckhUTUwpO1xuICAgIH1cblxuICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShzdHJpbmcgPT0gbnVsbCA/ICcnIDogc3RyaW5nKTtcbiAgfSwgJ3RleHRpZnknKTtcblxuICByZXR1cm4gRE9NQmFycztcbn07XG4iLCJcblxuLy9cbi8vIFRoZSBzaGltcyBpbiB0aGlzIGZpbGUgYXJlIG5vdCBmdWxseSBpbXBsZW1lbnRlZCBzaGltcyBmb3IgdGhlIEVTNVxuLy8gZmVhdHVyZXMsIGJ1dCBkbyB3b3JrIGZvciB0aGUgcGFydGljdWxhciB1c2VjYXNlcyB0aGVyZSBpcyBpblxuLy8gdGhlIG90aGVyIG1vZHVsZXMuXG4vL1xuXG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xudmFyIGhhc093blByb3BlcnR5ID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxuLy8gQXJyYXkuaXNBcnJheSBpcyBzdXBwb3J0ZWQgaW4gSUU5XG5mdW5jdGlvbiBpc0FycmF5KHhzKSB7XG4gIHJldHVybiB0b1N0cmluZy5jYWxsKHhzKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbn1cbmV4cG9ydHMuaXNBcnJheSA9IHR5cGVvZiBBcnJheS5pc0FycmF5ID09PSAnZnVuY3Rpb24nID8gQXJyYXkuaXNBcnJheSA6IGlzQXJyYXk7XG5cbi8vIEFycmF5LnByb3RvdHlwZS5pbmRleE9mIGlzIHN1cHBvcnRlZCBpbiBJRTlcbmV4cG9ydHMuaW5kZXhPZiA9IGZ1bmN0aW9uIGluZGV4T2YoeHMsIHgpIHtcbiAgaWYgKHhzLmluZGV4T2YpIHJldHVybiB4cy5pbmRleE9mKHgpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHhzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKHggPT09IHhzW2ldKSByZXR1cm4gaTtcbiAgfVxuICByZXR1cm4gLTE7XG59O1xuXG4vLyBBcnJheS5wcm90b3R5cGUuZmlsdGVyIGlzIHN1cHBvcnRlZCBpbiBJRTlcbmV4cG9ydHMuZmlsdGVyID0gZnVuY3Rpb24gZmlsdGVyKHhzLCBmbikge1xuICBpZiAoeHMuZmlsdGVyKSByZXR1cm4geHMuZmlsdGVyKGZuKTtcbiAgdmFyIHJlcyA9IFtdO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHhzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGZuKHhzW2ldLCBpLCB4cykpIHJlcy5wdXNoKHhzW2ldKTtcbiAgfVxuICByZXR1cm4gcmVzO1xufTtcblxuLy8gQXJyYXkucHJvdG90eXBlLmZvckVhY2ggaXMgc3VwcG9ydGVkIGluIElFOVxuZXhwb3J0cy5mb3JFYWNoID0gZnVuY3Rpb24gZm9yRWFjaCh4cywgZm4sIHNlbGYpIHtcbiAgaWYgKHhzLmZvckVhY2gpIHJldHVybiB4cy5mb3JFYWNoKGZuLCBzZWxmKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB4cy5sZW5ndGg7IGkrKykge1xuICAgIGZuLmNhbGwoc2VsZiwgeHNbaV0sIGksIHhzKTtcbiAgfVxufTtcblxuLy8gQXJyYXkucHJvdG90eXBlLm1hcCBpcyBzdXBwb3J0ZWQgaW4gSUU5XG5leHBvcnRzLm1hcCA9IGZ1bmN0aW9uIG1hcCh4cywgZm4pIHtcbiAgaWYgKHhzLm1hcCkgcmV0dXJuIHhzLm1hcChmbik7XG4gIHZhciBvdXQgPSBuZXcgQXJyYXkoeHMubGVuZ3RoKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB4cy5sZW5ndGg7IGkrKykge1xuICAgIG91dFtpXSA9IGZuKHhzW2ldLCBpLCB4cyk7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn07XG5cbi8vIEFycmF5LnByb3RvdHlwZS5yZWR1Y2UgaXMgc3VwcG9ydGVkIGluIElFOVxuZXhwb3J0cy5yZWR1Y2UgPSBmdW5jdGlvbiByZWR1Y2UoYXJyYXksIGNhbGxiYWNrLCBvcHRfaW5pdGlhbFZhbHVlKSB7XG4gIGlmIChhcnJheS5yZWR1Y2UpIHJldHVybiBhcnJheS5yZWR1Y2UoY2FsbGJhY2ssIG9wdF9pbml0aWFsVmFsdWUpO1xuICB2YXIgdmFsdWUsIGlzVmFsdWVTZXQgPSBmYWxzZTtcblxuICBpZiAoMiA8IGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICB2YWx1ZSA9IG9wdF9pbml0aWFsVmFsdWU7XG4gICAgaXNWYWx1ZVNldCA9IHRydWU7XG4gIH1cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBhcnJheS5sZW5ndGg7IGwgPiBpOyArK2kpIHtcbiAgICBpZiAoYXJyYXkuaGFzT3duUHJvcGVydHkoaSkpIHtcbiAgICAgIGlmIChpc1ZhbHVlU2V0KSB7XG4gICAgICAgIHZhbHVlID0gY2FsbGJhY2sodmFsdWUsIGFycmF5W2ldLCBpLCBhcnJheSk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgdmFsdWUgPSBhcnJheVtpXTtcbiAgICAgICAgaXNWYWx1ZVNldCA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHZhbHVlO1xufTtcblxuLy8gU3RyaW5nLnByb3RvdHlwZS5zdWJzdHIgLSBuZWdhdGl2ZSBpbmRleCBkb24ndCB3b3JrIGluIElFOFxuaWYgKCdhYicuc3Vic3RyKC0xKSAhPT0gJ2InKSB7XG4gIGV4cG9ydHMuc3Vic3RyID0gZnVuY3Rpb24gKHN0ciwgc3RhcnQsIGxlbmd0aCkge1xuICAgIC8vIGRpZCB3ZSBnZXQgYSBuZWdhdGl2ZSBzdGFydCwgY2FsY3VsYXRlIGhvdyBtdWNoIGl0IGlzIGZyb20gdGhlIGJlZ2lubmluZyBvZiB0aGUgc3RyaW5nXG4gICAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSBzdHIubGVuZ3RoICsgc3RhcnQ7XG5cbiAgICAvLyBjYWxsIHRoZSBvcmlnaW5hbCBmdW5jdGlvblxuICAgIHJldHVybiBzdHIuc3Vic3RyKHN0YXJ0LCBsZW5ndGgpO1xuICB9O1xufSBlbHNlIHtcbiAgZXhwb3J0cy5zdWJzdHIgPSBmdW5jdGlvbiAoc3RyLCBzdGFydCwgbGVuZ3RoKSB7XG4gICAgcmV0dXJuIHN0ci5zdWJzdHIoc3RhcnQsIGxlbmd0aCk7XG4gIH07XG59XG5cbi8vIFN0cmluZy5wcm90b3R5cGUudHJpbSBpcyBzdXBwb3J0ZWQgaW4gSUU5XG5leHBvcnRzLnRyaW0gPSBmdW5jdGlvbiAoc3RyKSB7XG4gIGlmIChzdHIudHJpbSkgcmV0dXJuIHN0ci50cmltKCk7XG4gIHJldHVybiBzdHIucmVwbGFjZSgvXlxccyt8XFxzKyQvZywgJycpO1xufTtcblxuLy8gRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQgaXMgc3VwcG9ydGVkIGluIElFOVxuZXhwb3J0cy5iaW5kID0gZnVuY3Rpb24gKCkge1xuICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gIHZhciBmbiA9IGFyZ3Muc2hpZnQoKTtcbiAgaWYgKGZuLmJpbmQpIHJldHVybiBmbi5iaW5kLmFwcGx5KGZuLCBhcmdzKTtcbiAgdmFyIHNlbGYgPSBhcmdzLnNoaWZ0KCk7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgZm4uYXBwbHkoc2VsZiwgYXJncy5jb25jYXQoW0FycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyldKSk7XG4gIH07XG59O1xuXG4vLyBPYmplY3QuY3JlYXRlIGlzIHN1cHBvcnRlZCBpbiBJRTlcbmZ1bmN0aW9uIGNyZWF0ZShwcm90b3R5cGUsIHByb3BlcnRpZXMpIHtcbiAgdmFyIG9iamVjdDtcbiAgaWYgKHByb3RvdHlwZSA9PT0gbnVsbCkge1xuICAgIG9iamVjdCA9IHsgJ19fcHJvdG9fXycgOiBudWxsIH07XG4gIH1cbiAgZWxzZSB7XG4gICAgaWYgKHR5cGVvZiBwcm90b3R5cGUgIT09ICdvYmplY3QnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAndHlwZW9mIHByb3RvdHlwZVsnICsgKHR5cGVvZiBwcm90b3R5cGUpICsgJ10gIT0gXFwnb2JqZWN0XFwnJ1xuICAgICAgKTtcbiAgICB9XG4gICAgdmFyIFR5cGUgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICBUeXBlLnByb3RvdHlwZSA9IHByb3RvdHlwZTtcbiAgICBvYmplY3QgPSBuZXcgVHlwZSgpO1xuICAgIG9iamVjdC5fX3Byb3RvX18gPSBwcm90b3R5cGU7XG4gIH1cbiAgaWYgKHR5cGVvZiBwcm9wZXJ0aWVzICE9PSAndW5kZWZpbmVkJyAmJiBPYmplY3QuZGVmaW5lUHJvcGVydGllcykge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKG9iamVjdCwgcHJvcGVydGllcyk7XG4gIH1cbiAgcmV0dXJuIG9iamVjdDtcbn1cbmV4cG9ydHMuY3JlYXRlID0gdHlwZW9mIE9iamVjdC5jcmVhdGUgPT09ICdmdW5jdGlvbicgPyBPYmplY3QuY3JlYXRlIDogY3JlYXRlO1xuXG4vLyBPYmplY3Qua2V5cyBhbmQgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMgaXMgc3VwcG9ydGVkIGluIElFOSBob3dldmVyXG4vLyB0aGV5IGRvIHNob3cgYSBkZXNjcmlwdGlvbiBhbmQgbnVtYmVyIHByb3BlcnR5IG9uIEVycm9yIG9iamVjdHNcbmZ1bmN0aW9uIG5vdE9iamVjdChvYmplY3QpIHtcbiAgcmV0dXJuICgodHlwZW9mIG9iamVjdCAhPSBcIm9iamVjdFwiICYmIHR5cGVvZiBvYmplY3QgIT0gXCJmdW5jdGlvblwiKSB8fCBvYmplY3QgPT09IG51bGwpO1xufVxuXG5mdW5jdGlvbiBrZXlzU2hpbShvYmplY3QpIHtcbiAgaWYgKG5vdE9iamVjdChvYmplY3QpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdC5rZXlzIGNhbGxlZCBvbiBhIG5vbi1vYmplY3RcIik7XG4gIH1cblxuICB2YXIgcmVzdWx0ID0gW107XG4gIGZvciAodmFyIG5hbWUgaW4gb2JqZWN0KSB7XG4gICAgaWYgKGhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBuYW1lKSkge1xuICAgICAgcmVzdWx0LnB1c2gobmFtZSk7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8vIGdldE93blByb3BlcnR5TmFtZXMgaXMgYWxtb3N0IHRoZSBzYW1lIGFzIE9iamVjdC5rZXlzIG9uZSBrZXkgZmVhdHVyZVxuLy8gIGlzIHRoYXQgaXQgcmV0dXJucyBoaWRkZW4gcHJvcGVydGllcywgc2luY2UgdGhhdCBjYW4ndCBiZSBpbXBsZW1lbnRlZCxcbi8vICB0aGlzIGZlYXR1cmUgZ2V0cyByZWR1Y2VkIHNvIGl0IGp1c3Qgc2hvd3MgdGhlIGxlbmd0aCBwcm9wZXJ0eSBvbiBhcnJheXNcbmZ1bmN0aW9uIHByb3BlcnR5U2hpbShvYmplY3QpIHtcbiAgaWYgKG5vdE9iamVjdChvYmplY3QpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzIGNhbGxlZCBvbiBhIG5vbi1vYmplY3RcIik7XG4gIH1cblxuICB2YXIgcmVzdWx0ID0ga2V5c1NoaW0ob2JqZWN0KTtcbiAgaWYgKGV4cG9ydHMuaXNBcnJheShvYmplY3QpICYmIGV4cG9ydHMuaW5kZXhPZihvYmplY3QsICdsZW5ndGgnKSA9PT0gLTEpIHtcbiAgICByZXN1bHQucHVzaCgnbGVuZ3RoJyk7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxudmFyIGtleXMgPSB0eXBlb2YgT2JqZWN0LmtleXMgPT09ICdmdW5jdGlvbicgPyBPYmplY3Qua2V5cyA6IGtleXNTaGltO1xudmFyIGdldE93blByb3BlcnR5TmFtZXMgPSB0eXBlb2YgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMgPT09ICdmdW5jdGlvbicgP1xuICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyA6IHByb3BlcnR5U2hpbTtcblxuaWYgKG5ldyBFcnJvcigpLmhhc093blByb3BlcnR5KCdkZXNjcmlwdGlvbicpKSB7XG4gIHZhciBFUlJPUl9QUk9QRVJUWV9GSUxURVIgPSBmdW5jdGlvbiAob2JqLCBhcnJheSkge1xuICAgIGlmICh0b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0IEVycm9yXScpIHtcbiAgICAgIGFycmF5ID0gZXhwb3J0cy5maWx0ZXIoYXJyYXksIGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgIHJldHVybiBuYW1lICE9PSAnZGVzY3JpcHRpb24nICYmIG5hbWUgIT09ICdudW1iZXInICYmIG5hbWUgIT09ICdtZXNzYWdlJztcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gYXJyYXk7XG4gIH07XG5cbiAgZXhwb3J0cy5rZXlzID0gZnVuY3Rpb24gKG9iamVjdCkge1xuICAgIHJldHVybiBFUlJPUl9QUk9QRVJUWV9GSUxURVIob2JqZWN0LCBrZXlzKG9iamVjdCkpO1xuICB9O1xuICBleHBvcnRzLmdldE93blByb3BlcnR5TmFtZXMgPSBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgcmV0dXJuIEVSUk9SX1BST1BFUlRZX0ZJTFRFUihvYmplY3QsIGdldE93blByb3BlcnR5TmFtZXMob2JqZWN0KSk7XG4gIH07XG59IGVsc2Uge1xuICBleHBvcnRzLmtleXMgPSBrZXlzO1xuICBleHBvcnRzLmdldE93blByb3BlcnR5TmFtZXMgPSBnZXRPd25Qcm9wZXJ0eU5hbWVzO1xufVxuXG4vLyBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yIC0gc3VwcG9ydGVkIGluIElFOCBidXQgb25seSBvbiBkb20gZWxlbWVudHNcbmZ1bmN0aW9uIHZhbHVlT2JqZWN0KHZhbHVlLCBrZXkpIHtcbiAgcmV0dXJuIHsgdmFsdWU6IHZhbHVlW2tleV0gfTtcbn1cblxuaWYgKHR5cGVvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yID09PSAnZnVuY3Rpb24nKSB7XG4gIHRyeSB7XG4gICAgT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih7J2EnOiAxfSwgJ2EnKTtcbiAgICBleHBvcnRzLmdldE93blByb3BlcnR5RGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3I7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICAvLyBJRTggZG9tIGVsZW1lbnQgaXNzdWUgLSB1c2UgYSB0cnkgY2F0Y2ggYW5kIGRlZmF1bHQgdG8gdmFsdWVPYmplY3RcbiAgICBleHBvcnRzLmdldE93blByb3BlcnR5RGVzY3JpcHRvciA9IGZ1bmN0aW9uICh2YWx1ZSwga2V5KSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih2YWx1ZSwga2V5KTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlT2JqZWN0KHZhbHVlLCBrZXkpO1xuICAgICAgfVxuICAgIH07XG4gIH1cbn0gZWxzZSB7XG4gIGV4cG9ydHMuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yID0gdmFsdWVPYmplY3Q7XG59XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxudmFyIHV0aWwgPSByZXF1aXJlKCd1dGlsJyk7XG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgdGhpcy5fZXZlbnRzID0gdGhpcy5fZXZlbnRzIHx8IHt9O1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG5FdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gIGlmICghdXRpbC5pc051bWJlcihuKSB8fCBuIDwgMClcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKHV0aWwuaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAodXRpbC5pc1VuZGVmaW5lZChoYW5kbGVyKSlcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKHV0aWwuaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKHV0aWwuaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIXV0aWwuaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gIGlmICh0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgICAgIHV0aWwuaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAodXRpbC5pc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKHV0aWwuaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSAmJiAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuICAgIHZhciBtO1xuICAgIGlmICghdXRpbC5pc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCF1dGlsLmlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghdXRpbC5pc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgbGVuZ3RoID0gbGlzdC5sZW5ndGg7XG4gIHBvc2l0aW9uID0gLTE7XG5cbiAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAodXRpbC5pc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmICh1dGlsLmlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAodXRpbC5pc0Z1bmN0aW9uKGxpc3RlbmVycykpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gTElGTyBvcmRlclxuICAgIHdoaWxlIChsaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbbGlzdGVuZXJzLmxlbmd0aCAtIDFdKTtcbiAgfVxuICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gW107XG4gIGVsc2UgaWYgKHV0aWwuaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmICh1dGlsLmlzRnVuY3Rpb24oZW1pdHRlci5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSAxO1xuICBlbHNlXG4gICAgcmV0ID0gZW1pdHRlci5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcbiAgcmV0dXJuIHJldDtcbn07IiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbnZhciBzaGltcyA9IHJlcXVpcmUoJ19zaGltcycpO1xuXG52YXIgZm9ybWF0UmVnRXhwID0gLyVbc2RqJV0vZztcbmV4cG9ydHMuZm9ybWF0ID0gZnVuY3Rpb24oZikge1xuICBpZiAoIWlzU3RyaW5nKGYpKSB7XG4gICAgdmFyIG9iamVjdHMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgb2JqZWN0cy5wdXNoKGluc3BlY3QoYXJndW1lbnRzW2ldKSk7XG4gICAgfVxuICAgIHJldHVybiBvYmplY3RzLmpvaW4oJyAnKTtcbiAgfVxuXG4gIHZhciBpID0gMTtcbiAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gIHZhciBsZW4gPSBhcmdzLmxlbmd0aDtcbiAgdmFyIHN0ciA9IFN0cmluZyhmKS5yZXBsYWNlKGZvcm1hdFJlZ0V4cCwgZnVuY3Rpb24oeCkge1xuICAgIGlmICh4ID09PSAnJSUnKSByZXR1cm4gJyUnO1xuICAgIGlmIChpID49IGxlbikgcmV0dXJuIHg7XG4gICAgc3dpdGNoICh4KSB7XG4gICAgICBjYXNlICclcyc6IHJldHVybiBTdHJpbmcoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVkJzogcmV0dXJuIE51bWJlcihhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWonOlxuICAgICAgICB0cnkge1xuICAgICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShhcmdzW2krK10pO1xuICAgICAgICB9IGNhdGNoIChfKSB7XG4gICAgICAgICAgcmV0dXJuICdbQ2lyY3VsYXJdJztcbiAgICAgICAgfVxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIHg7XG4gICAgfVxuICB9KTtcbiAgZm9yICh2YXIgeCA9IGFyZ3NbaV07IGkgPCBsZW47IHggPSBhcmdzWysraV0pIHtcbiAgICBpZiAoaXNOdWxsKHgpIHx8ICFpc09iamVjdCh4KSkge1xuICAgICAgc3RyICs9ICcgJyArIHg7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciArPSAnICcgKyBpbnNwZWN0KHgpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gc3RyO1xufTtcblxuLyoqXG4gKiBFY2hvcyB0aGUgdmFsdWUgb2YgYSB2YWx1ZS4gVHJ5cyB0byBwcmludCB0aGUgdmFsdWUgb3V0XG4gKiBpbiB0aGUgYmVzdCB3YXkgcG9zc2libGUgZ2l2ZW4gdGhlIGRpZmZlcmVudCB0eXBlcy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIFRoZSBvYmplY3QgdG8gcHJpbnQgb3V0LlxuICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgb3B0aW9ucyBvYmplY3QgdGhhdCBhbHRlcnMgdGhlIG91dHB1dC5cbiAqL1xuLyogbGVnYWN5OiBvYmosIHNob3dIaWRkZW4sIGRlcHRoLCBjb2xvcnMqL1xuZnVuY3Rpb24gaW5zcGVjdChvYmosIG9wdHMpIHtcbiAgLy8gZGVmYXVsdCBvcHRpb25zXG4gIHZhciBjdHggPSB7XG4gICAgc2VlbjogW10sXG4gICAgc3R5bGl6ZTogc3R5bGl6ZU5vQ29sb3JcbiAgfTtcbiAgLy8gbGVnYWN5Li4uXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDMpIGN0eC5kZXB0aCA9IGFyZ3VtZW50c1syXTtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gNCkgY3R4LmNvbG9ycyA9IGFyZ3VtZW50c1szXTtcbiAgaWYgKGlzQm9vbGVhbihvcHRzKSkge1xuICAgIC8vIGxlZ2FjeS4uLlxuICAgIGN0eC5zaG93SGlkZGVuID0gb3B0cztcbiAgfSBlbHNlIGlmIChvcHRzKSB7XG4gICAgLy8gZ290IGFuIFwib3B0aW9uc1wiIG9iamVjdFxuICAgIGV4cG9ydHMuX2V4dGVuZChjdHgsIG9wdHMpO1xuICB9XG4gIC8vIHNldCBkZWZhdWx0IG9wdGlvbnNcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5zaG93SGlkZGVuKSkgY3R4LnNob3dIaWRkZW4gPSBmYWxzZTtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5kZXB0aCkpIGN0eC5kZXB0aCA9IDI7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguY29sb3JzKSkgY3R4LmNvbG9ycyA9IGZhbHNlO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmN1c3RvbUluc3BlY3QpKSBjdHguY3VzdG9tSW5zcGVjdCA9IHRydWU7XG4gIGlmIChjdHguY29sb3JzKSBjdHguc3R5bGl6ZSA9IHN0eWxpemVXaXRoQ29sb3I7XG4gIHJldHVybiBmb3JtYXRWYWx1ZShjdHgsIG9iaiwgY3R4LmRlcHRoKTtcbn1cbmV4cG9ydHMuaW5zcGVjdCA9IGluc3BlY3Q7XG5cblxuLy8gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9BTlNJX2VzY2FwZV9jb2RlI2dyYXBoaWNzXG5pbnNwZWN0LmNvbG9ycyA9IHtcbiAgJ2JvbGQnIDogWzEsIDIyXSxcbiAgJ2l0YWxpYycgOiBbMywgMjNdLFxuICAndW5kZXJsaW5lJyA6IFs0LCAyNF0sXG4gICdpbnZlcnNlJyA6IFs3LCAyN10sXG4gICd3aGl0ZScgOiBbMzcsIDM5XSxcbiAgJ2dyZXknIDogWzkwLCAzOV0sXG4gICdibGFjaycgOiBbMzAsIDM5XSxcbiAgJ2JsdWUnIDogWzM0LCAzOV0sXG4gICdjeWFuJyA6IFszNiwgMzldLFxuICAnZ3JlZW4nIDogWzMyLCAzOV0sXG4gICdtYWdlbnRhJyA6IFszNSwgMzldLFxuICAncmVkJyA6IFszMSwgMzldLFxuICAneWVsbG93JyA6IFszMywgMzldXG59O1xuXG4vLyBEb24ndCB1c2UgJ2JsdWUnIG5vdCB2aXNpYmxlIG9uIGNtZC5leGVcbmluc3BlY3Quc3R5bGVzID0ge1xuICAnc3BlY2lhbCc6ICdjeWFuJyxcbiAgJ251bWJlcic6ICd5ZWxsb3cnLFxuICAnYm9vbGVhbic6ICd5ZWxsb3cnLFxuICAndW5kZWZpbmVkJzogJ2dyZXknLFxuICAnbnVsbCc6ICdib2xkJyxcbiAgJ3N0cmluZyc6ICdncmVlbicsXG4gICdkYXRlJzogJ21hZ2VudGEnLFxuICAvLyBcIm5hbWVcIjogaW50ZW50aW9uYWxseSBub3Qgc3R5bGluZ1xuICAncmVnZXhwJzogJ3JlZCdcbn07XG5cblxuZnVuY3Rpb24gc3R5bGl6ZVdpdGhDb2xvcihzdHIsIHN0eWxlVHlwZSkge1xuICB2YXIgc3R5bGUgPSBpbnNwZWN0LnN0eWxlc1tzdHlsZVR5cGVdO1xuXG4gIGlmIChzdHlsZSkge1xuICAgIHJldHVybiAnXFx1MDAxYlsnICsgaW5zcGVjdC5jb2xvcnNbc3R5bGVdWzBdICsgJ20nICsgc3RyICtcbiAgICAgICAgICAgJ1xcdTAwMWJbJyArIGluc3BlY3QuY29sb3JzW3N0eWxlXVsxXSArICdtJztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gc3RyO1xuICB9XG59XG5cblxuZnVuY3Rpb24gc3R5bGl6ZU5vQ29sb3Ioc3RyLCBzdHlsZVR5cGUpIHtcbiAgcmV0dXJuIHN0cjtcbn1cblxuXG5mdW5jdGlvbiBhcnJheVRvSGFzaChhcnJheSkge1xuICB2YXIgaGFzaCA9IHt9O1xuXG4gIHNoaW1zLmZvckVhY2goYXJyYXksIGZ1bmN0aW9uKHZhbCwgaWR4KSB7XG4gICAgaGFzaFt2YWxdID0gdHJ1ZTtcbiAgfSk7XG5cbiAgcmV0dXJuIGhhc2g7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0VmFsdWUoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzKSB7XG4gIC8vIFByb3ZpZGUgYSBob29rIGZvciB1c2VyLXNwZWNpZmllZCBpbnNwZWN0IGZ1bmN0aW9ucy5cbiAgLy8gQ2hlY2sgdGhhdCB2YWx1ZSBpcyBhbiBvYmplY3Qgd2l0aCBhbiBpbnNwZWN0IGZ1bmN0aW9uIG9uIGl0XG4gIGlmIChjdHguY3VzdG9tSW5zcGVjdCAmJlxuICAgICAgdmFsdWUgJiZcbiAgICAgIGlzRnVuY3Rpb24odmFsdWUuaW5zcGVjdCkgJiZcbiAgICAgIC8vIEZpbHRlciBvdXQgdGhlIHV0aWwgbW9kdWxlLCBpdCdzIGluc3BlY3QgZnVuY3Rpb24gaXMgc3BlY2lhbFxuICAgICAgdmFsdWUuaW5zcGVjdCAhPT0gZXhwb3J0cy5pbnNwZWN0ICYmXG4gICAgICAvLyBBbHNvIGZpbHRlciBvdXQgYW55IHByb3RvdHlwZSBvYmplY3RzIHVzaW5nIHRoZSBjaXJjdWxhciBjaGVjay5cbiAgICAgICEodmFsdWUuY29uc3RydWN0b3IgJiYgdmFsdWUuY29uc3RydWN0b3IucHJvdG90eXBlID09PSB2YWx1ZSkpIHtcbiAgICB2YXIgcmV0ID0gdmFsdWUuaW5zcGVjdChyZWN1cnNlVGltZXMpO1xuICAgIGlmICghaXNTdHJpbmcocmV0KSkge1xuICAgICAgcmV0ID0gZm9ybWF0VmFsdWUoY3R4LCByZXQsIHJlY3Vyc2VUaW1lcyk7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH1cblxuICAvLyBQcmltaXRpdmUgdHlwZXMgY2Fubm90IGhhdmUgcHJvcGVydGllc1xuICB2YXIgcHJpbWl0aXZlID0gZm9ybWF0UHJpbWl0aXZlKGN0eCwgdmFsdWUpO1xuICBpZiAocHJpbWl0aXZlKSB7XG4gICAgcmV0dXJuIHByaW1pdGl2ZTtcbiAgfVxuXG4gIC8vIExvb2sgdXAgdGhlIGtleXMgb2YgdGhlIG9iamVjdC5cbiAgdmFyIGtleXMgPSBzaGltcy5rZXlzKHZhbHVlKTtcbiAgdmFyIHZpc2libGVLZXlzID0gYXJyYXlUb0hhc2goa2V5cyk7XG5cbiAgaWYgKGN0eC5zaG93SGlkZGVuKSB7XG4gICAga2V5cyA9IHNoaW1zLmdldE93blByb3BlcnR5TmFtZXModmFsdWUpO1xuICB9XG5cbiAgLy8gU29tZSB0eXBlIG9mIG9iamVjdCB3aXRob3V0IHByb3BlcnRpZXMgY2FuIGJlIHNob3J0Y3V0dGVkLlxuICBpZiAoa2V5cy5sZW5ndGggPT09IDApIHtcbiAgICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgIHZhciBuYW1lID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJ1tGdW5jdGlvbicgKyBuYW1lICsgJ10nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ3JlZ2V4cCcpO1xuICAgIH1cbiAgICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKERhdGUucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAnZGF0ZScpO1xuICAgIH1cbiAgICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgdmFyIGJhc2UgPSAnJywgYXJyYXkgPSBmYWxzZSwgYnJhY2VzID0gWyd7JywgJ30nXTtcblxuICAvLyBNYWtlIEFycmF5IHNheSB0aGF0IHRoZXkgYXJlIEFycmF5XG4gIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgIGFycmF5ID0gdHJ1ZTtcbiAgICBicmFjZXMgPSBbJ1snLCAnXSddO1xuICB9XG5cbiAgLy8gTWFrZSBmdW5jdGlvbnMgc2F5IHRoYXQgdGhleSBhcmUgZnVuY3Rpb25zXG4gIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgIHZhciBuID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgYmFzZSA9ICcgW0Z1bmN0aW9uJyArIG4gKyAnXSc7XG4gIH1cblxuICAvLyBNYWtlIFJlZ0V4cHMgc2F5IHRoYXQgdGhleSBhcmUgUmVnRXhwc1xuICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIH1cblxuICAvLyBNYWtlIGRhdGVzIHdpdGggcHJvcGVydGllcyBmaXJzdCBzYXkgdGhlIGRhdGVcbiAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgRGF0ZS5wcm90b3R5cGUudG9VVENTdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIH1cblxuICAvLyBNYWtlIGVycm9yIHdpdGggbWVzc2FnZSBmaXJzdCBzYXkgdGhlIGVycm9yXG4gIGlmIChpc0Vycm9yKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gIH1cblxuICBpZiAoa2V5cy5sZW5ndGggPT09IDAgJiYgKCFhcnJheSB8fCB2YWx1ZS5sZW5ndGggPT0gMCkpIHtcbiAgICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArIGJyYWNlc1sxXTtcbiAgfVxuXG4gIGlmIChyZWN1cnNlVGltZXMgPCAwKSB7XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbT2JqZWN0XScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG5cbiAgY3R4LnNlZW4ucHVzaCh2YWx1ZSk7XG5cbiAgdmFyIG91dHB1dDtcbiAgaWYgKGFycmF5KSB7XG4gICAgb3V0cHV0ID0gZm9ybWF0QXJyYXkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5cyk7XG4gIH0gZWxzZSB7XG4gICAgb3V0cHV0ID0ga2V5cy5tYXAoZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5LCBhcnJheSk7XG4gICAgfSk7XG4gIH1cblxuICBjdHguc2Vlbi5wb3AoKTtcblxuICByZXR1cm4gcmVkdWNlVG9TaW5nbGVTdHJpbmcob3V0cHV0LCBiYXNlLCBicmFjZXMpO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFByaW1pdGl2ZShjdHgsIHZhbHVlKSB7XG4gIGlmIChpc1VuZGVmaW5lZCh2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCd1bmRlZmluZWQnLCAndW5kZWZpbmVkJyk7XG4gIGlmIChpc1N0cmluZyh2YWx1ZSkpIHtcbiAgICB2YXIgc2ltcGxlID0gJ1xcJycgKyBKU09OLnN0cmluZ2lmeSh2YWx1ZSkucmVwbGFjZSgvXlwifFwiJC9nLCAnJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJykgKyAnXFwnJztcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoc2ltcGxlLCAnc3RyaW5nJyk7XG4gIH1cbiAgaWYgKGlzTnVtYmVyKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ251bWJlcicpO1xuICBpZiAoaXNCb29sZWFuKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ2Jvb2xlYW4nKTtcbiAgLy8gRm9yIHNvbWUgcmVhc29uIHR5cGVvZiBudWxsIGlzIFwib2JqZWN0XCIsIHNvIHNwZWNpYWwgY2FzZSBoZXJlLlxuICBpZiAoaXNOdWxsKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJ251bGwnLCAnbnVsbCcpO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEVycm9yKHZhbHVlKSB7XG4gIHJldHVybiAnWycgKyBFcnJvci5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSkgKyAnXSc7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0QXJyYXkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5cykge1xuICB2YXIgb3V0cHV0ID0gW107XG4gIGZvciAodmFyIGkgPSAwLCBsID0gdmFsdWUubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYgKGhhc093blByb3BlcnR5KHZhbHVlLCBTdHJpbmcoaSkpKSB7XG4gICAgICBvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLFxuICAgICAgICAgIFN0cmluZyhpKSwgdHJ1ZSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXRwdXQucHVzaCgnJyk7XG4gICAgfVxuICB9XG5cbiAgc2hpbXMuZm9yRWFjaChrZXlzLCBmdW5jdGlvbihrZXkpIHtcbiAgICBpZiAoIWtleS5tYXRjaCgvXlxcZCskLykpIHtcbiAgICAgIG91dHB1dC5wdXNoKGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsXG4gICAgICAgICAga2V5LCB0cnVlKSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIG91dHB1dDtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXksIGFycmF5KSB7XG4gIHZhciBuYW1lLCBzdHIsIGRlc2M7XG4gIGRlc2MgPSBzaGltcy5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodmFsdWUsIGtleSkgfHwgeyB2YWx1ZTogdmFsdWVba2V5XSB9O1xuICBpZiAoZGVzYy5nZXQpIHtcbiAgICBpZiAoZGVzYy5zZXQpIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbR2V0dGVyL1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0dldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoZGVzYy5zZXQpIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG5cbiAgaWYgKCFoYXNPd25Qcm9wZXJ0eSh2aXNpYmxlS2V5cywga2V5KSkge1xuICAgIG5hbWUgPSAnWycgKyBrZXkgKyAnXSc7XG4gIH1cbiAgaWYgKCFzdHIpIHtcbiAgICBpZiAoc2hpbXMuaW5kZXhPZihjdHguc2VlbiwgZGVzYy52YWx1ZSkgPCAwKSB7XG4gICAgICBpZiAoaXNOdWxsKHJlY3Vyc2VUaW1lcykpIHtcbiAgICAgICAgc3RyID0gZm9ybWF0VmFsdWUoY3R4LCBkZXNjLnZhbHVlLCBudWxsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0ciA9IGZvcm1hdFZhbHVlKGN0eCwgZGVzYy52YWx1ZSwgcmVjdXJzZVRpbWVzIC0gMSk7XG4gICAgICB9XG4gICAgICBpZiAoc3RyLmluZGV4T2YoJ1xcbicpID4gLTEpIHtcbiAgICAgICAgaWYgKGFycmF5KSB7XG4gICAgICAgICAgc3RyID0gc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICcgKyBsaW5lO1xuICAgICAgICAgIH0pLmpvaW4oJ1xcbicpLnN1YnN0cigyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdHIgPSAnXFxuJyArIHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiAnICAgJyArIGxpbmU7XG4gICAgICAgICAgfSkuam9pbignXFxuJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tDaXJjdWxhcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuICBpZiAoaXNVbmRlZmluZWQobmFtZSkpIHtcbiAgICBpZiAoYXJyYXkgJiYga2V5Lm1hdGNoKC9eXFxkKyQvKSkge1xuICAgICAgcmV0dXJuIHN0cjtcbiAgICB9XG4gICAgbmFtZSA9IEpTT04uc3RyaW5naWZ5KCcnICsga2V5KTtcbiAgICBpZiAobmFtZS5tYXRjaCgvXlwiKFthLXpBLVpfXVthLXpBLVpfMC05XSopXCIkLykpIHtcbiAgICAgIG5hbWUgPSBuYW1lLnN1YnN0cigxLCBuYW1lLmxlbmd0aCAtIDIpO1xuICAgICAgbmFtZSA9IGN0eC5zdHlsaXplKG5hbWUsICduYW1lJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5hbWUgPSBuYW1lLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8oXlwifFwiJCkvZywgXCInXCIpO1xuICAgICAgbmFtZSA9IGN0eC5zdHlsaXplKG5hbWUsICdzdHJpbmcnKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmFtZSArICc6ICcgKyBzdHI7XG59XG5cblxuZnVuY3Rpb24gcmVkdWNlVG9TaW5nbGVTdHJpbmcob3V0cHV0LCBiYXNlLCBicmFjZXMpIHtcbiAgdmFyIG51bUxpbmVzRXN0ID0gMDtcbiAgdmFyIGxlbmd0aCA9IHNoaW1zLnJlZHVjZShvdXRwdXQsIGZ1bmN0aW9uKHByZXYsIGN1cikge1xuICAgIG51bUxpbmVzRXN0Kys7XG4gICAgaWYgKGN1ci5pbmRleE9mKCdcXG4nKSA+PSAwKSBudW1MaW5lc0VzdCsrO1xuICAgIHJldHVybiBwcmV2ICsgY3VyLnJlcGxhY2UoL1xcdTAwMWJcXFtcXGRcXGQ/bS9nLCAnJykubGVuZ3RoICsgMTtcbiAgfSwgMCk7XG5cbiAgaWYgKGxlbmd0aCA+IDYwKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArXG4gICAgICAgICAgIChiYXNlID09PSAnJyA/ICcnIDogYmFzZSArICdcXG4gJykgK1xuICAgICAgICAgICAnICcgK1xuICAgICAgICAgICBvdXRwdXQuam9pbignLFxcbiAgJykgK1xuICAgICAgICAgICAnICcgK1xuICAgICAgICAgICBicmFjZXNbMV07XG4gIH1cblxuICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArICcgJyArIG91dHB1dC5qb2luKCcsICcpICsgJyAnICsgYnJhY2VzWzFdO1xufVxuXG5cbi8vIE5PVEU6IFRoZXNlIHR5cGUgY2hlY2tpbmcgZnVuY3Rpb25zIGludGVudGlvbmFsbHkgZG9uJ3QgdXNlIGBpbnN0YW5jZW9mYFxuLy8gYmVjYXVzZSBpdCBpcyBmcmFnaWxlIGFuZCBjYW4gYmUgZWFzaWx5IGZha2VkIHdpdGggYE9iamVjdC5jcmVhdGUoKWAuXG5mdW5jdGlvbiBpc0FycmF5KGFyKSB7XG4gIHJldHVybiBzaGltcy5pc0FycmF5KGFyKTtcbn1cbmV4cG9ydHMuaXNBcnJheSA9IGlzQXJyYXk7XG5cbmZ1bmN0aW9uIGlzQm9vbGVhbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJztcbn1cbmV4cG9ydHMuaXNCb29sZWFuID0gaXNCb29sZWFuO1xuXG5mdW5jdGlvbiBpc051bGwoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbCA9IGlzTnVsbDtcblxuZnVuY3Rpb24gaXNOdWxsT3JVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsT3JVbmRlZmluZWQgPSBpc051bGxPclVuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cbmV4cG9ydHMuaXNOdW1iZXIgPSBpc051bWJlcjtcblxuZnVuY3Rpb24gaXNTdHJpbmcoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3RyaW5nJztcbn1cbmV4cG9ydHMuaXNTdHJpbmcgPSBpc1N0cmluZztcblxuZnVuY3Rpb24gaXNTeW1ib2woYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3ltYm9sJztcbn1cbmV4cG9ydHMuaXNTeW1ib2wgPSBpc1N5bWJvbDtcblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbmV4cG9ydHMuaXNVbmRlZmluZWQgPSBpc1VuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNSZWdFeHAocmUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KHJlKSAmJiBvYmplY3RUb1N0cmluZyhyZSkgPT09ICdbb2JqZWN0IFJlZ0V4cF0nO1xufVxuZXhwb3J0cy5pc1JlZ0V4cCA9IGlzUmVnRXhwO1xuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZztcbn1cbmV4cG9ydHMuaXNPYmplY3QgPSBpc09iamVjdDtcblxuZnVuY3Rpb24gaXNEYXRlKGQpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KGQpICYmIG9iamVjdFRvU3RyaW5nKGQpID09PSAnW29iamVjdCBEYXRlXSc7XG59XG5leHBvcnRzLmlzRGF0ZSA9IGlzRGF0ZTtcblxuZnVuY3Rpb24gaXNFcnJvcihlKSB7XG4gIHJldHVybiBpc09iamVjdChlKSAmJiBvYmplY3RUb1N0cmluZyhlKSA9PT0gJ1tvYmplY3QgRXJyb3JdJztcbn1cbmV4cG9ydHMuaXNFcnJvciA9IGlzRXJyb3I7XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuZXhwb3J0cy5pc0Z1bmN0aW9uID0gaXNGdW5jdGlvbjtcblxuZnVuY3Rpb24gaXNQcmltaXRpdmUoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGwgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ251bWJlcicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3ltYm9sJyB8fCAgLy8gRVM2IHN5bWJvbFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3VuZGVmaW5lZCc7XG59XG5leHBvcnRzLmlzUHJpbWl0aXZlID0gaXNQcmltaXRpdmU7XG5cbmZ1bmN0aW9uIGlzQnVmZmVyKGFyZykge1xuICByZXR1cm4gYXJnICYmIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnXG4gICAgJiYgdHlwZW9mIGFyZy5jb3B5ID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5maWxsID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5iaW5hcnlTbGljZSA9PT0gJ2Z1bmN0aW9uJ1xuICA7XG59XG5leHBvcnRzLmlzQnVmZmVyID0gaXNCdWZmZXI7XG5cbmZ1bmN0aW9uIG9iamVjdFRvU3RyaW5nKG8pIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKTtcbn1cblxuXG5mdW5jdGlvbiBwYWQobikge1xuICByZXR1cm4gbiA8IDEwID8gJzAnICsgbi50b1N0cmluZygxMCkgOiBuLnRvU3RyaW5nKDEwKTtcbn1cblxuXG52YXIgbW9udGhzID0gWydKYW4nLCAnRmViJywgJ01hcicsICdBcHInLCAnTWF5JywgJ0p1bicsICdKdWwnLCAnQXVnJywgJ1NlcCcsXG4gICAgICAgICAgICAgICdPY3QnLCAnTm92JywgJ0RlYyddO1xuXG4vLyAyNiBGZWIgMTY6MTk6MzRcbmZ1bmN0aW9uIHRpbWVzdGFtcCgpIHtcbiAgdmFyIGQgPSBuZXcgRGF0ZSgpO1xuICB2YXIgdGltZSA9IFtwYWQoZC5nZXRIb3VycygpKSxcbiAgICAgICAgICAgICAgcGFkKGQuZ2V0TWludXRlcygpKSxcbiAgICAgICAgICAgICAgcGFkKGQuZ2V0U2Vjb25kcygpKV0uam9pbignOicpO1xuICByZXR1cm4gW2QuZ2V0RGF0ZSgpLCBtb250aHNbZC5nZXRNb250aCgpXSwgdGltZV0uam9pbignICcpO1xufVxuXG5cbi8vIGxvZyBpcyBqdXN0IGEgdGhpbiB3cmFwcGVyIHRvIGNvbnNvbGUubG9nIHRoYXQgcHJlcGVuZHMgYSB0aW1lc3RhbXBcbmV4cG9ydHMubG9nID0gZnVuY3Rpb24oKSB7XG4gIGNvbnNvbGUubG9nKCclcyAtICVzJywgdGltZXN0YW1wKCksIGV4cG9ydHMuZm9ybWF0LmFwcGx5KGV4cG9ydHMsIGFyZ3VtZW50cykpO1xufTtcblxuXG4vKipcbiAqIEluaGVyaXQgdGhlIHByb3RvdHlwZSBtZXRob2RzIGZyb20gb25lIGNvbnN0cnVjdG9yIGludG8gYW5vdGhlci5cbiAqXG4gKiBUaGUgRnVuY3Rpb24ucHJvdG90eXBlLmluaGVyaXRzIGZyb20gbGFuZy5qcyByZXdyaXR0ZW4gYXMgYSBzdGFuZGFsb25lXG4gKiBmdW5jdGlvbiAobm90IG9uIEZ1bmN0aW9uLnByb3RvdHlwZSkuIE5PVEU6IElmIHRoaXMgZmlsZSBpcyB0byBiZSBsb2FkZWRcbiAqIGR1cmluZyBib290c3RyYXBwaW5nIHRoaXMgZnVuY3Rpb24gbmVlZHMgdG8gYmUgcmV3cml0dGVuIHVzaW5nIHNvbWUgbmF0aXZlXG4gKiBmdW5jdGlvbnMgYXMgcHJvdG90eXBlIHNldHVwIHVzaW5nIG5vcm1hbCBKYXZhU2NyaXB0IGRvZXMgbm90IHdvcmsgYXNcbiAqIGV4cGVjdGVkIGR1cmluZyBib290c3RyYXBwaW5nIChzZWUgbWlycm9yLmpzIGluIHIxMTQ5MDMpLlxuICpcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGN0b3IgQ29uc3RydWN0b3IgZnVuY3Rpb24gd2hpY2ggbmVlZHMgdG8gaW5oZXJpdCB0aGVcbiAqICAgICBwcm90b3R5cGUuXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBzdXBlckN0b3IgQ29uc3RydWN0b3IgZnVuY3Rpb24gdG8gaW5oZXJpdCBwcm90b3R5cGUgZnJvbS5cbiAqL1xuZXhwb3J0cy5pbmhlcml0cyA9IGZ1bmN0aW9uKGN0b3IsIHN1cGVyQ3Rvcikge1xuICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvcjtcbiAgY3Rvci5wcm90b3R5cGUgPSBzaGltcy5jcmVhdGUoc3VwZXJDdG9yLnByb3RvdHlwZSwge1xuICAgIGNvbnN0cnVjdG9yOiB7XG4gICAgICB2YWx1ZTogY3RvcixcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICB9XG4gIH0pO1xufTtcblxuZXhwb3J0cy5fZXh0ZW5kID0gZnVuY3Rpb24ob3JpZ2luLCBhZGQpIHtcbiAgLy8gRG9uJ3QgZG8gYW55dGhpbmcgaWYgYWRkIGlzbid0IGFuIG9iamVjdFxuICBpZiAoIWFkZCB8fCAhaXNPYmplY3QoYWRkKSkgcmV0dXJuIG9yaWdpbjtcblxuICB2YXIga2V5cyA9IHNoaW1zLmtleXMoYWRkKTtcbiAgdmFyIGkgPSBrZXlzLmxlbmd0aDtcbiAgd2hpbGUgKGktLSkge1xuICAgIG9yaWdpbltrZXlzW2ldXSA9IGFkZFtrZXlzW2ldXTtcbiAgfVxuICByZXR1cm4gb3JpZ2luO1xufTtcblxuZnVuY3Rpb24gaGFzT3duUHJvcGVydHkob2JqLCBwcm9wKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKTtcbn1cbiIsIi8qanNoaW50IGVxbnVsbDogdHJ1ZSAqL1xuXG5tb2R1bGUuZXhwb3J0cy5jcmVhdGUgPSBmdW5jdGlvbigpIHtcblxudmFyIEhhbmRsZWJhcnMgPSB7fTtcblxuLy8gQkVHSU4oQlJPV1NFUilcblxuSGFuZGxlYmFycy5WRVJTSU9OID0gXCIxLjAuMFwiO1xuSGFuZGxlYmFycy5DT01QSUxFUl9SRVZJU0lPTiA9IDQ7XG5cbkhhbmRsZWJhcnMuUkVWSVNJT05fQ0hBTkdFUyA9IHtcbiAgMTogJzw9IDEuMC5yYy4yJywgLy8gMS4wLnJjLjIgaXMgYWN0dWFsbHkgcmV2MiBidXQgZG9lc24ndCByZXBvcnQgaXRcbiAgMjogJz09IDEuMC4wLXJjLjMnLFxuICAzOiAnPT0gMS4wLjAtcmMuNCcsXG4gIDQ6ICc+PSAxLjAuMCdcbn07XG5cbkhhbmRsZWJhcnMuaGVscGVycyAgPSB7fTtcbkhhbmRsZWJhcnMucGFydGlhbHMgPSB7fTtcblxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZyxcbiAgICBmdW5jdGlvblR5cGUgPSAnW29iamVjdCBGdW5jdGlvbl0nLFxuICAgIG9iamVjdFR5cGUgPSAnW29iamVjdCBPYmplY3RdJztcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlciA9IGZ1bmN0aW9uKG5hbWUsIGZuLCBpbnZlcnNlKSB7XG4gIGlmICh0b1N0cmluZy5jYWxsKG5hbWUpID09PSBvYmplY3RUeXBlKSB7XG4gICAgaWYgKGludmVyc2UgfHwgZm4pIHsgdGhyb3cgbmV3IEhhbmRsZWJhcnMuRXhjZXB0aW9uKCdBcmcgbm90IHN1cHBvcnRlZCB3aXRoIG11bHRpcGxlIGhlbHBlcnMnKTsgfVxuICAgIEhhbmRsZWJhcnMuVXRpbHMuZXh0ZW5kKHRoaXMuaGVscGVycywgbmFtZSk7XG4gIH0gZWxzZSB7XG4gICAgaWYgKGludmVyc2UpIHsgZm4ubm90ID0gaW52ZXJzZTsgfVxuICAgIHRoaXMuaGVscGVyc1tuYW1lXSA9IGZuO1xuICB9XG59O1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVyUGFydGlhbCA9IGZ1bmN0aW9uKG5hbWUsIHN0cikge1xuICBpZiAodG9TdHJpbmcuY2FsbChuYW1lKSA9PT0gb2JqZWN0VHlwZSkge1xuICAgIEhhbmRsZWJhcnMuVXRpbHMuZXh0ZW5kKHRoaXMucGFydGlhbHMsICBuYW1lKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLnBhcnRpYWxzW25hbWVdID0gc3RyO1xuICB9XG59O1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCdoZWxwZXJNaXNzaW5nJywgZnVuY3Rpb24oYXJnKSB7XG4gIGlmKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgaGVscGVyOiAnXCIgKyBhcmcgKyBcIidcIik7XG4gIH1cbn0pO1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCdibG9ja0hlbHBlck1pc3NpbmcnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gIHZhciBpbnZlcnNlID0gb3B0aW9ucy5pbnZlcnNlIHx8IGZ1bmN0aW9uKCkge30sIGZuID0gb3B0aW9ucy5mbjtcblxuICB2YXIgdHlwZSA9IHRvU3RyaW5nLmNhbGwoY29udGV4dCk7XG5cbiAgaWYodHlwZSA9PT0gZnVuY3Rpb25UeXBlKSB7IGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7IH1cblxuICBpZihjb250ZXh0ID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIGZuKHRoaXMpO1xuICB9IGVsc2UgaWYoY29udGV4dCA9PT0gZmFsc2UgfHwgY29udGV4dCA9PSBudWxsKSB7XG4gICAgcmV0dXJuIGludmVyc2UodGhpcyk7XG4gIH0gZWxzZSBpZih0eXBlID09PSBcIltvYmplY3QgQXJyYXldXCIpIHtcbiAgICBpZihjb250ZXh0Lmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiBIYW5kbGViYXJzLmhlbHBlcnMuZWFjaChjb250ZXh0LCBvcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGludmVyc2UodGhpcyk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBmbihjb250ZXh0KTtcbiAgfVxufSk7XG5cbkhhbmRsZWJhcnMuSyA9IGZ1bmN0aW9uKCkge307XG5cbkhhbmRsZWJhcnMuY3JlYXRlRnJhbWUgPSBPYmplY3QuY3JlYXRlIHx8IGZ1bmN0aW9uKG9iamVjdCkge1xuICBIYW5kbGViYXJzLksucHJvdG90eXBlID0gb2JqZWN0O1xuICB2YXIgb2JqID0gbmV3IEhhbmRsZWJhcnMuSygpO1xuICBIYW5kbGViYXJzLksucHJvdG90eXBlID0gbnVsbDtcbiAgcmV0dXJuIG9iajtcbn07XG5cbkhhbmRsZWJhcnMubG9nZ2VyID0ge1xuICBERUJVRzogMCwgSU5GTzogMSwgV0FSTjogMiwgRVJST1I6IDMsIGxldmVsOiAzLFxuXG4gIG1ldGhvZE1hcDogezA6ICdkZWJ1ZycsIDE6ICdpbmZvJywgMjogJ3dhcm4nLCAzOiAnZXJyb3InfSxcblxuICAvLyBjYW4gYmUgb3ZlcnJpZGRlbiBpbiB0aGUgaG9zdCBlbnZpcm9ubWVudFxuICBsb2c6IGZ1bmN0aW9uKGxldmVsLCBvYmopIHtcbiAgICBpZiAoSGFuZGxlYmFycy5sb2dnZXIubGV2ZWwgPD0gbGV2ZWwpIHtcbiAgICAgIHZhciBtZXRob2QgPSBIYW5kbGViYXJzLmxvZ2dlci5tZXRob2RNYXBbbGV2ZWxdO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlICE9PSAndW5kZWZpbmVkJyAmJiBjb25zb2xlW21ldGhvZF0pIHtcbiAgICAgICAgY29uc29sZVttZXRob2RdLmNhbGwoY29uc29sZSwgb2JqKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5cbkhhbmRsZWJhcnMubG9nID0gZnVuY3Rpb24obGV2ZWwsIG9iaikgeyBIYW5kbGViYXJzLmxvZ2dlci5sb2cobGV2ZWwsIG9iaik7IH07XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ2VhY2gnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gIHZhciBmbiA9IG9wdGlvbnMuZm4sIGludmVyc2UgPSBvcHRpb25zLmludmVyc2U7XG4gIHZhciBpID0gMCwgcmV0ID0gXCJcIiwgZGF0YTtcblxuICB2YXIgdHlwZSA9IHRvU3RyaW5nLmNhbGwoY29udGV4dCk7XG4gIGlmKHR5cGUgPT09IGZ1bmN0aW9uVHlwZSkgeyBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpOyB9XG5cbiAgaWYgKG9wdGlvbnMuZGF0YSkge1xuICAgIGRhdGEgPSBIYW5kbGViYXJzLmNyZWF0ZUZyYW1lKG9wdGlvbnMuZGF0YSk7XG4gIH1cblxuICBpZihjb250ZXh0ICYmIHR5cGVvZiBjb250ZXh0ID09PSAnb2JqZWN0Jykge1xuICAgIGlmKGNvbnRleHQgaW5zdGFuY2VvZiBBcnJheSl7XG4gICAgICBmb3IodmFyIGogPSBjb250ZXh0Lmxlbmd0aDsgaTxqOyBpKyspIHtcbiAgICAgICAgaWYgKGRhdGEpIHsgZGF0YS5pbmRleCA9IGk7IH1cbiAgICAgICAgcmV0ID0gcmV0ICsgZm4oY29udGV4dFtpXSwgeyBkYXRhOiBkYXRhIH0pO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmb3IodmFyIGtleSBpbiBjb250ZXh0KSB7XG4gICAgICAgIGlmKGNvbnRleHQuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgIGlmKGRhdGEpIHsgZGF0YS5rZXkgPSBrZXk7IH1cbiAgICAgICAgICByZXQgPSByZXQgKyBmbihjb250ZXh0W2tleV0sIHtkYXRhOiBkYXRhfSk7XG4gICAgICAgICAgaSsrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYoaSA9PT0gMCl7XG4gICAgcmV0ID0gaW52ZXJzZSh0aGlzKTtcbiAgfVxuXG4gIHJldHVybiByZXQ7XG59KTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignaWYnLCBmdW5jdGlvbihjb25kaXRpb25hbCwgb3B0aW9ucykge1xuICB2YXIgdHlwZSA9IHRvU3RyaW5nLmNhbGwoY29uZGl0aW9uYWwpO1xuICBpZih0eXBlID09PSBmdW5jdGlvblR5cGUpIHsgY29uZGl0aW9uYWwgPSBjb25kaXRpb25hbC5jYWxsKHRoaXMpOyB9XG5cbiAgaWYoIWNvbmRpdGlvbmFsIHx8IEhhbmRsZWJhcnMuVXRpbHMuaXNFbXB0eShjb25kaXRpb25hbCkpIHtcbiAgICByZXR1cm4gb3B0aW9ucy5pbnZlcnNlKHRoaXMpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBvcHRpb25zLmZuKHRoaXMpO1xuICB9XG59KTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcigndW5sZXNzJywgZnVuY3Rpb24oY29uZGl0aW9uYWwsIG9wdGlvbnMpIHtcbiAgcmV0dXJuIEhhbmRsZWJhcnMuaGVscGVyc1snaWYnXS5jYWxsKHRoaXMsIGNvbmRpdGlvbmFsLCB7Zm46IG9wdGlvbnMuaW52ZXJzZSwgaW52ZXJzZTogb3B0aW9ucy5mbn0pO1xufSk7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ3dpdGgnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gIHZhciB0eXBlID0gdG9TdHJpbmcuY2FsbChjb250ZXh0KTtcbiAgaWYodHlwZSA9PT0gZnVuY3Rpb25UeXBlKSB7IGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7IH1cblxuICBpZiAoIUhhbmRsZWJhcnMuVXRpbHMuaXNFbXB0eShjb250ZXh0KSkgcmV0dXJuIG9wdGlvbnMuZm4oY29udGV4dCk7XG59KTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignbG9nJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICB2YXIgbGV2ZWwgPSBvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5kYXRhLmxldmVsICE9IG51bGwgPyBwYXJzZUludChvcHRpb25zLmRhdGEubGV2ZWwsIDEwKSA6IDE7XG4gIEhhbmRsZWJhcnMubG9nKGxldmVsLCBjb250ZXh0KTtcbn0pO1xuXG4vLyBFTkQoQlJPV1NFUilcblxucmV0dXJuIEhhbmRsZWJhcnM7XG59O1xuIiwiZXhwb3J0cy5hdHRhY2ggPSBmdW5jdGlvbihIYW5kbGViYXJzKSB7XG5cbi8vIEJFR0lOKEJST1dTRVIpXG5IYW5kbGViYXJzLkFTVCA9IHt9O1xuXG5IYW5kbGViYXJzLkFTVC5Qcm9ncmFtTm9kZSA9IGZ1bmN0aW9uKHN0YXRlbWVudHMsIGludmVyc2UpIHtcbiAgdGhpcy50eXBlID0gXCJwcm9ncmFtXCI7XG4gIHRoaXMuc3RhdGVtZW50cyA9IHN0YXRlbWVudHM7XG4gIGlmKGludmVyc2UpIHsgdGhpcy5pbnZlcnNlID0gbmV3IEhhbmRsZWJhcnMuQVNULlByb2dyYW1Ob2RlKGludmVyc2UpOyB9XG59O1xuXG5IYW5kbGViYXJzLkFTVC5NdXN0YWNoZU5vZGUgPSBmdW5jdGlvbihyYXdQYXJhbXMsIGhhc2gsIHVuZXNjYXBlZCkge1xuICB0aGlzLnR5cGUgPSBcIm11c3RhY2hlXCI7XG4gIHRoaXMuZXNjYXBlZCA9ICF1bmVzY2FwZWQ7XG4gIHRoaXMuaGFzaCA9IGhhc2g7XG5cbiAgdmFyIGlkID0gdGhpcy5pZCA9IHJhd1BhcmFtc1swXTtcbiAgdmFyIHBhcmFtcyA9IHRoaXMucGFyYW1zID0gcmF3UGFyYW1zLnNsaWNlKDEpO1xuXG4gIC8vIGEgbXVzdGFjaGUgaXMgYW4gZWxpZ2libGUgaGVscGVyIGlmOlxuICAvLyAqIGl0cyBpZCBpcyBzaW1wbGUgKGEgc2luZ2xlIHBhcnQsIG5vdCBgdGhpc2Agb3IgYC4uYClcbiAgdmFyIGVsaWdpYmxlSGVscGVyID0gdGhpcy5lbGlnaWJsZUhlbHBlciA9IGlkLmlzU2ltcGxlO1xuXG4gIC8vIGEgbXVzdGFjaGUgaXMgZGVmaW5pdGVseSBhIGhlbHBlciBpZjpcbiAgLy8gKiBpdCBpcyBhbiBlbGlnaWJsZSBoZWxwZXIsIGFuZFxuICAvLyAqIGl0IGhhcyBhdCBsZWFzdCBvbmUgcGFyYW1ldGVyIG9yIGhhc2ggc2VnbWVudFxuICB0aGlzLmlzSGVscGVyID0gZWxpZ2libGVIZWxwZXIgJiYgKHBhcmFtcy5sZW5ndGggfHwgaGFzaCk7XG5cbiAgLy8gaWYgYSBtdXN0YWNoZSBpcyBhbiBlbGlnaWJsZSBoZWxwZXIgYnV0IG5vdCBhIGRlZmluaXRlXG4gIC8vIGhlbHBlciwgaXQgaXMgYW1iaWd1b3VzLCBhbmQgd2lsbCBiZSByZXNvbHZlZCBpbiBhIGxhdGVyXG4gIC8vIHBhc3Mgb3IgYXQgcnVudGltZS5cbn07XG5cbkhhbmRsZWJhcnMuQVNULlBhcnRpYWxOb2RlID0gZnVuY3Rpb24ocGFydGlhbE5hbWUsIGNvbnRleHQpIHtcbiAgdGhpcy50eXBlICAgICAgICAgPSBcInBhcnRpYWxcIjtcbiAgdGhpcy5wYXJ0aWFsTmFtZSAgPSBwYXJ0aWFsTmFtZTtcbiAgdGhpcy5jb250ZXh0ICAgICAgPSBjb250ZXh0O1xufTtcblxuSGFuZGxlYmFycy5BU1QuQmxvY2tOb2RlID0gZnVuY3Rpb24obXVzdGFjaGUsIHByb2dyYW0sIGludmVyc2UsIGNsb3NlKSB7XG4gIHZhciB2ZXJpZnlNYXRjaCA9IGZ1bmN0aW9uKG9wZW4sIGNsb3NlKSB7XG4gICAgaWYob3Blbi5vcmlnaW5hbCAhPT0gY2xvc2Uub3JpZ2luYWwpIHtcbiAgICAgIHRocm93IG5ldyBIYW5kbGViYXJzLkV4Y2VwdGlvbihvcGVuLm9yaWdpbmFsICsgXCIgZG9lc24ndCBtYXRjaCBcIiArIGNsb3NlLm9yaWdpbmFsKTtcbiAgICB9XG4gIH07XG5cbiAgdmVyaWZ5TWF0Y2gobXVzdGFjaGUuaWQsIGNsb3NlKTtcbiAgdGhpcy50eXBlID0gXCJibG9ja1wiO1xuICB0aGlzLm11c3RhY2hlID0gbXVzdGFjaGU7XG4gIHRoaXMucHJvZ3JhbSAgPSBwcm9ncmFtO1xuICB0aGlzLmludmVyc2UgID0gaW52ZXJzZTtcblxuICBpZiAodGhpcy5pbnZlcnNlICYmICF0aGlzLnByb2dyYW0pIHtcbiAgICB0aGlzLmlzSW52ZXJzZSA9IHRydWU7XG4gIH1cbn07XG5cbkhhbmRsZWJhcnMuQVNULkNvbnRlbnROb2RlID0gZnVuY3Rpb24oc3RyaW5nKSB7XG4gIHRoaXMudHlwZSA9IFwiY29udGVudFwiO1xuICB0aGlzLnN0cmluZyA9IHN0cmluZztcbn07XG5cbkhhbmRsZWJhcnMuQVNULkhhc2hOb2RlID0gZnVuY3Rpb24ocGFpcnMpIHtcbiAgdGhpcy50eXBlID0gXCJoYXNoXCI7XG4gIHRoaXMucGFpcnMgPSBwYWlycztcbn07XG5cbkhhbmRsZWJhcnMuQVNULklkTm9kZSA9IGZ1bmN0aW9uKHBhcnRzKSB7XG4gIHRoaXMudHlwZSA9IFwiSURcIjtcblxuICB2YXIgb3JpZ2luYWwgPSBcIlwiLFxuICAgICAgZGlnID0gW10sXG4gICAgICBkZXB0aCA9IDA7XG5cbiAgZm9yKHZhciBpPTAsbD1wYXJ0cy5sZW5ndGg7IGk8bDsgaSsrKSB7XG4gICAgdmFyIHBhcnQgPSBwYXJ0c1tpXS5wYXJ0O1xuICAgIG9yaWdpbmFsICs9IChwYXJ0c1tpXS5zZXBhcmF0b3IgfHwgJycpICsgcGFydDtcblxuICAgIGlmIChwYXJ0ID09PSBcIi4uXCIgfHwgcGFydCA9PT0gXCIuXCIgfHwgcGFydCA9PT0gXCJ0aGlzXCIpIHtcbiAgICAgIGlmIChkaWcubGVuZ3RoID4gMCkgeyB0aHJvdyBuZXcgSGFuZGxlYmFycy5FeGNlcHRpb24oXCJJbnZhbGlkIHBhdGg6IFwiICsgb3JpZ2luYWwpOyB9XG4gICAgICBlbHNlIGlmIChwYXJ0ID09PSBcIi4uXCIpIHsgZGVwdGgrKzsgfVxuICAgICAgZWxzZSB7IHRoaXMuaXNTY29wZWQgPSB0cnVlOyB9XG4gICAgfVxuICAgIGVsc2UgeyBkaWcucHVzaChwYXJ0KTsgfVxuICB9XG5cbiAgdGhpcy5vcmlnaW5hbCA9IG9yaWdpbmFsO1xuICB0aGlzLnBhcnRzICAgID0gZGlnO1xuICB0aGlzLnN0cmluZyAgID0gZGlnLmpvaW4oJy4nKTtcbiAgdGhpcy5kZXB0aCAgICA9IGRlcHRoO1xuXG4gIC8vIGFuIElEIGlzIHNpbXBsZSBpZiBpdCBvbmx5IGhhcyBvbmUgcGFydCwgYW5kIHRoYXQgcGFydCBpcyBub3RcbiAgLy8gYC4uYCBvciBgdGhpc2AuXG4gIHRoaXMuaXNTaW1wbGUgPSBwYXJ0cy5sZW5ndGggPT09IDEgJiYgIXRoaXMuaXNTY29wZWQgJiYgZGVwdGggPT09IDA7XG5cbiAgdGhpcy5zdHJpbmdNb2RlVmFsdWUgPSB0aGlzLnN0cmluZztcbn07XG5cbkhhbmRsZWJhcnMuQVNULlBhcnRpYWxOYW1lTm9kZSA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgdGhpcy50eXBlID0gXCJQQVJUSUFMX05BTUVcIjtcbiAgdGhpcy5uYW1lID0gbmFtZS5vcmlnaW5hbDtcbn07XG5cbkhhbmRsZWJhcnMuQVNULkRhdGFOb2RlID0gZnVuY3Rpb24oaWQpIHtcbiAgdGhpcy50eXBlID0gXCJEQVRBXCI7XG4gIHRoaXMuaWQgPSBpZDtcbn07XG5cbkhhbmRsZWJhcnMuQVNULlN0cmluZ05vZGUgPSBmdW5jdGlvbihzdHJpbmcpIHtcbiAgdGhpcy50eXBlID0gXCJTVFJJTkdcIjtcbiAgdGhpcy5vcmlnaW5hbCA9XG4gICAgdGhpcy5zdHJpbmcgPVxuICAgIHRoaXMuc3RyaW5nTW9kZVZhbHVlID0gc3RyaW5nO1xufTtcblxuSGFuZGxlYmFycy5BU1QuSW50ZWdlck5vZGUgPSBmdW5jdGlvbihpbnRlZ2VyKSB7XG4gIHRoaXMudHlwZSA9IFwiSU5URUdFUlwiO1xuICB0aGlzLm9yaWdpbmFsID1cbiAgICB0aGlzLmludGVnZXIgPSBpbnRlZ2VyO1xuICB0aGlzLnN0cmluZ01vZGVWYWx1ZSA9IE51bWJlcihpbnRlZ2VyKTtcbn07XG5cbkhhbmRsZWJhcnMuQVNULkJvb2xlYW5Ob2RlID0gZnVuY3Rpb24oYm9vbCkge1xuICB0aGlzLnR5cGUgPSBcIkJPT0xFQU5cIjtcbiAgdGhpcy5ib29sID0gYm9vbDtcbiAgdGhpcy5zdHJpbmdNb2RlVmFsdWUgPSBib29sID09PSBcInRydWVcIjtcbn07XG5cbkhhbmRsZWJhcnMuQVNULkNvbW1lbnROb2RlID0gZnVuY3Rpb24oY29tbWVudCkge1xuICB0aGlzLnR5cGUgPSBcImNvbW1lbnRcIjtcbiAgdGhpcy5jb21tZW50ID0gY29tbWVudDtcbn07XG5cbi8vIEVORChCUk9XU0VSKVxuXG5yZXR1cm4gSGFuZGxlYmFycztcbn07XG5cbiIsInZhciBoYW5kbGViYXJzID0gcmVxdWlyZShcIi4vcGFyc2VyXCIpO1xuXG5leHBvcnRzLmF0dGFjaCA9IGZ1bmN0aW9uKEhhbmRsZWJhcnMpIHtcblxuLy8gQkVHSU4oQlJPV1NFUilcblxuSGFuZGxlYmFycy5QYXJzZXIgPSBoYW5kbGViYXJzO1xuXG5IYW5kbGViYXJzLnBhcnNlID0gZnVuY3Rpb24oaW5wdXQpIHtcblxuICAvLyBKdXN0IHJldHVybiBpZiBhbiBhbHJlYWR5LWNvbXBpbGUgQVNUIHdhcyBwYXNzZWQgaW4uXG4gIGlmKGlucHV0LmNvbnN0cnVjdG9yID09PSBIYW5kbGViYXJzLkFTVC5Qcm9ncmFtTm9kZSkgeyByZXR1cm4gaW5wdXQ7IH1cblxuICBIYW5kbGViYXJzLlBhcnNlci55eSA9IEhhbmRsZWJhcnMuQVNUO1xuICByZXR1cm4gSGFuZGxlYmFycy5QYXJzZXIucGFyc2UoaW5wdXQpO1xufTtcblxuLy8gRU5EKEJST1dTRVIpXG5cbnJldHVybiBIYW5kbGViYXJzO1xufTtcbiIsInZhciBjb21waWxlcmJhc2UgPSByZXF1aXJlKFwiLi9iYXNlXCIpO1xuXG5leHBvcnRzLmF0dGFjaCA9IGZ1bmN0aW9uKEhhbmRsZWJhcnMpIHtcblxuY29tcGlsZXJiYXNlLmF0dGFjaChIYW5kbGViYXJzKTtcblxuLy8gQkVHSU4oQlJPV1NFUilcblxuLypqc2hpbnQgZXFudWxsOnRydWUqL1xudmFyIENvbXBpbGVyID0gSGFuZGxlYmFycy5Db21waWxlciA9IGZ1bmN0aW9uKCkge307XG52YXIgSmF2YVNjcmlwdENvbXBpbGVyID0gSGFuZGxlYmFycy5KYXZhU2NyaXB0Q29tcGlsZXIgPSBmdW5jdGlvbigpIHt9O1xuXG4vLyB0aGUgZm91bmRIZWxwZXIgcmVnaXN0ZXIgd2lsbCBkaXNhbWJpZ3VhdGUgaGVscGVyIGxvb2t1cCBmcm9tIGZpbmRpbmcgYVxuLy8gZnVuY3Rpb24gaW4gYSBjb250ZXh0LiBUaGlzIGlzIG5lY2Vzc2FyeSBmb3IgbXVzdGFjaGUgY29tcGF0aWJpbGl0eSwgd2hpY2hcbi8vIHJlcXVpcmVzIHRoYXQgY29udGV4dCBmdW5jdGlvbnMgaW4gYmxvY2tzIGFyZSBldmFsdWF0ZWQgYnkgYmxvY2tIZWxwZXJNaXNzaW5nLFxuLy8gYW5kIHRoZW4gcHJvY2VlZCBhcyBpZiB0aGUgcmVzdWx0aW5nIHZhbHVlIHdhcyBwcm92aWRlZCB0byBibG9ja0hlbHBlck1pc3NpbmcuXG5cbkNvbXBpbGVyLnByb3RvdHlwZSA9IHtcbiAgY29tcGlsZXI6IENvbXBpbGVyLFxuXG4gIGRpc2Fzc2VtYmxlOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgb3Bjb2RlcyA9IHRoaXMub3Bjb2Rlcywgb3Bjb2RlLCBvdXQgPSBbXSwgcGFyYW1zLCBwYXJhbTtcblxuICAgIGZvciAodmFyIGk9MCwgbD1vcGNvZGVzLmxlbmd0aDsgaTxsOyBpKyspIHtcbiAgICAgIG9wY29kZSA9IG9wY29kZXNbaV07XG5cbiAgICAgIGlmIChvcGNvZGUub3Bjb2RlID09PSAnREVDTEFSRScpIHtcbiAgICAgICAgb3V0LnB1c2goXCJERUNMQVJFIFwiICsgb3Bjb2RlLm5hbWUgKyBcIj1cIiArIG9wY29kZS52YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwYXJhbXMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaj0wOyBqPG9wY29kZS5hcmdzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgcGFyYW0gPSBvcGNvZGUuYXJnc1tqXTtcbiAgICAgICAgICBpZiAodHlwZW9mIHBhcmFtID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICBwYXJhbSA9IFwiXFxcIlwiICsgcGFyYW0ucmVwbGFjZShcIlxcblwiLCBcIlxcXFxuXCIpICsgXCJcXFwiXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIHBhcmFtcy5wdXNoKHBhcmFtKTtcbiAgICAgICAgfVxuICAgICAgICBvdXQucHVzaChvcGNvZGUub3Bjb2RlICsgXCIgXCIgKyBwYXJhbXMuam9pbihcIiBcIikpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBvdXQuam9pbihcIlxcblwiKTtcbiAgfSxcbiAgZXF1YWxzOiBmdW5jdGlvbihvdGhlcikge1xuICAgIHZhciBsZW4gPSB0aGlzLm9wY29kZXMubGVuZ3RoO1xuICAgIGlmIChvdGhlci5vcGNvZGVzLmxlbmd0aCAhPT0gbGVuKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgdmFyIG9wY29kZSA9IHRoaXMub3Bjb2Rlc1tpXSxcbiAgICAgICAgICBvdGhlck9wY29kZSA9IG90aGVyLm9wY29kZXNbaV07XG4gICAgICBpZiAob3Bjb2RlLm9wY29kZSAhPT0gb3RoZXJPcGNvZGUub3Bjb2RlIHx8IG9wY29kZS5hcmdzLmxlbmd0aCAhPT0gb3RoZXJPcGNvZGUuYXJncy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBvcGNvZGUuYXJncy5sZW5ndGg7IGorKykge1xuICAgICAgICBpZiAob3Bjb2RlLmFyZ3Nbal0gIT09IG90aGVyT3Bjb2RlLmFyZ3Nbal0pIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBsZW4gPSB0aGlzLmNoaWxkcmVuLmxlbmd0aDtcbiAgICBpZiAob3RoZXIuY2hpbGRyZW4ubGVuZ3RoICE9PSBsZW4pIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBpZiAoIXRoaXMuY2hpbGRyZW5baV0uZXF1YWxzKG90aGVyLmNoaWxkcmVuW2ldKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG4gIH0sXG5cbiAgZ3VpZDogMCxcblxuICBjb21waWxlOiBmdW5jdGlvbihwcm9ncmFtLCBvcHRpb25zKSB7XG4gICAgdGhpcy5jaGlsZHJlbiA9IFtdO1xuICAgIHRoaXMuZGVwdGhzID0ge2xpc3Q6IFtdfTtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuXG4gICAgLy8gVGhlc2UgY2hhbmdlcyB3aWxsIHByb3BhZ2F0ZSB0byB0aGUgb3RoZXIgY29tcGlsZXIgY29tcG9uZW50c1xuICAgIHZhciBrbm93bkhlbHBlcnMgPSB0aGlzLm9wdGlvbnMua25vd25IZWxwZXJzO1xuICAgIHRoaXMub3B0aW9ucy5rbm93bkhlbHBlcnMgPSB7XG4gICAgICAnaGVscGVyTWlzc2luZyc6IHRydWUsXG4gICAgICAnYmxvY2tIZWxwZXJNaXNzaW5nJzogdHJ1ZSxcbiAgICAgICdlYWNoJzogdHJ1ZSxcbiAgICAgICdpZic6IHRydWUsXG4gICAgICAndW5sZXNzJzogdHJ1ZSxcbiAgICAgICd3aXRoJzogdHJ1ZSxcbiAgICAgICdsb2cnOiB0cnVlXG4gICAgfTtcbiAgICBpZiAoa25vd25IZWxwZXJzKSB7XG4gICAgICBmb3IgKHZhciBuYW1lIGluIGtub3duSGVscGVycykge1xuICAgICAgICB0aGlzLm9wdGlvbnMua25vd25IZWxwZXJzW25hbWVdID0ga25vd25IZWxwZXJzW25hbWVdO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnByb2dyYW0ocHJvZ3JhbSk7XG4gIH0sXG5cbiAgYWNjZXB0OiBmdW5jdGlvbihub2RlKSB7XG4gICAgcmV0dXJuIHRoaXNbbm9kZS50eXBlXShub2RlKTtcbiAgfSxcblxuICBwcm9ncmFtOiBmdW5jdGlvbihwcm9ncmFtKSB7XG4gICAgdmFyIHN0YXRlbWVudHMgPSBwcm9ncmFtLnN0YXRlbWVudHMsIHN0YXRlbWVudDtcbiAgICB0aGlzLm9wY29kZXMgPSBbXTtcblxuICAgIGZvcih2YXIgaT0wLCBsPXN0YXRlbWVudHMubGVuZ3RoOyBpPGw7IGkrKykge1xuICAgICAgc3RhdGVtZW50ID0gc3RhdGVtZW50c1tpXTtcbiAgICAgIHRoaXNbc3RhdGVtZW50LnR5cGVdKHN0YXRlbWVudCk7XG4gICAgfVxuICAgIHRoaXMuaXNTaW1wbGUgPSBsID09PSAxO1xuXG4gICAgdGhpcy5kZXB0aHMubGlzdCA9IHRoaXMuZGVwdGhzLmxpc3Quc29ydChmdW5jdGlvbihhLCBiKSB7XG4gICAgICByZXR1cm4gYSAtIGI7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICBjb21waWxlUHJvZ3JhbTogZnVuY3Rpb24ocHJvZ3JhbSkge1xuICAgIHZhciByZXN1bHQgPSBuZXcgdGhpcy5jb21waWxlcigpLmNvbXBpbGUocHJvZ3JhbSwgdGhpcy5vcHRpb25zKTtcbiAgICB2YXIgZ3VpZCA9IHRoaXMuZ3VpZCsrLCBkZXB0aDtcblxuICAgIHRoaXMudXNlUGFydGlhbCA9IHRoaXMudXNlUGFydGlhbCB8fCByZXN1bHQudXNlUGFydGlhbDtcblxuICAgIHRoaXMuY2hpbGRyZW5bZ3VpZF0gPSByZXN1bHQ7XG5cbiAgICBmb3IodmFyIGk9MCwgbD1yZXN1bHQuZGVwdGhzLmxpc3QubGVuZ3RoOyBpPGw7IGkrKykge1xuICAgICAgZGVwdGggPSByZXN1bHQuZGVwdGhzLmxpc3RbaV07XG5cbiAgICAgIGlmKGRlcHRoIDwgMikgeyBjb250aW51ZTsgfVxuICAgICAgZWxzZSB7IHRoaXMuYWRkRGVwdGgoZGVwdGggLSAxKTsgfVxuICAgIH1cblxuICAgIHJldHVybiBndWlkO1xuICB9LFxuXG4gIGJsb2NrOiBmdW5jdGlvbihibG9jaykge1xuICAgIHZhciBtdXN0YWNoZSA9IGJsb2NrLm11c3RhY2hlLFxuICAgICAgICBwcm9ncmFtID0gYmxvY2sucHJvZ3JhbSxcbiAgICAgICAgaW52ZXJzZSA9IGJsb2NrLmludmVyc2U7XG5cbiAgICBpZiAocHJvZ3JhbSkge1xuICAgICAgcHJvZ3JhbSA9IHRoaXMuY29tcGlsZVByb2dyYW0ocHJvZ3JhbSk7XG4gICAgfVxuXG4gICAgaWYgKGludmVyc2UpIHtcbiAgICAgIGludmVyc2UgPSB0aGlzLmNvbXBpbGVQcm9ncmFtKGludmVyc2UpO1xuICAgIH1cblxuICAgIHZhciB0eXBlID0gdGhpcy5jbGFzc2lmeU11c3RhY2hlKG11c3RhY2hlKTtcblxuICAgIGlmICh0eXBlID09PSBcImhlbHBlclwiKSB7XG4gICAgICB0aGlzLmhlbHBlck11c3RhY2hlKG11c3RhY2hlLCBwcm9ncmFtLCBpbnZlcnNlKTtcbiAgICB9IGVsc2UgaWYgKHR5cGUgPT09IFwic2ltcGxlXCIpIHtcbiAgICAgIHRoaXMuc2ltcGxlTXVzdGFjaGUobXVzdGFjaGUpO1xuXG4gICAgICAvLyBub3cgdGhhdCB0aGUgc2ltcGxlIG11c3RhY2hlIGlzIHJlc29sdmVkLCB3ZSBuZWVkIHRvXG4gICAgICAvLyBldmFsdWF0ZSBpdCBieSBleGVjdXRpbmcgYGJsb2NrSGVscGVyTWlzc2luZ2BcbiAgICAgIHRoaXMub3Bjb2RlKCdwdXNoUHJvZ3JhbScsIHByb2dyYW0pO1xuICAgICAgdGhpcy5vcGNvZGUoJ3B1c2hQcm9ncmFtJywgaW52ZXJzZSk7XG4gICAgICB0aGlzLm9wY29kZSgnZW1wdHlIYXNoJyk7XG4gICAgICB0aGlzLm9wY29kZSgnYmxvY2tWYWx1ZScpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmFtYmlndW91c011c3RhY2hlKG11c3RhY2hlLCBwcm9ncmFtLCBpbnZlcnNlKTtcblxuICAgICAgLy8gbm93IHRoYXQgdGhlIHNpbXBsZSBtdXN0YWNoZSBpcyByZXNvbHZlZCwgd2UgbmVlZCB0b1xuICAgICAgLy8gZXZhbHVhdGUgaXQgYnkgZXhlY3V0aW5nIGBibG9ja0hlbHBlck1pc3NpbmdgXG4gICAgICB0aGlzLm9wY29kZSgncHVzaFByb2dyYW0nLCBwcm9ncmFtKTtcbiAgICAgIHRoaXMub3Bjb2RlKCdwdXNoUHJvZ3JhbScsIGludmVyc2UpO1xuICAgICAgdGhpcy5vcGNvZGUoJ2VtcHR5SGFzaCcpO1xuICAgICAgdGhpcy5vcGNvZGUoJ2FtYmlndW91c0Jsb2NrVmFsdWUnKTtcbiAgICB9XG5cbiAgICB0aGlzLm9wY29kZSgnYXBwZW5kJyk7XG4gIH0sXG5cbiAgaGFzaDogZnVuY3Rpb24oaGFzaCkge1xuICAgIHZhciBwYWlycyA9IGhhc2gucGFpcnMsIHBhaXIsIHZhbDtcblxuICAgIHRoaXMub3Bjb2RlKCdwdXNoSGFzaCcpO1xuXG4gICAgZm9yKHZhciBpPTAsIGw9cGFpcnMubGVuZ3RoOyBpPGw7IGkrKykge1xuICAgICAgcGFpciA9IHBhaXJzW2ldO1xuICAgICAgdmFsICA9IHBhaXJbMV07XG5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaW5nUGFyYW1zKSB7XG4gICAgICAgIGlmKHZhbC5kZXB0aCkge1xuICAgICAgICAgIHRoaXMuYWRkRGVwdGgodmFsLmRlcHRoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLm9wY29kZSgnZ2V0Q29udGV4dCcsIHZhbC5kZXB0aCB8fCAwKTtcbiAgICAgICAgdGhpcy5vcGNvZGUoJ3B1c2hTdHJpbmdQYXJhbScsIHZhbC5zdHJpbmdNb2RlVmFsdWUsIHZhbC50eXBlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuYWNjZXB0KHZhbCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMub3Bjb2RlKCdhc3NpZ25Ub0hhc2gnLCBwYWlyWzBdKTtcbiAgICB9XG4gICAgdGhpcy5vcGNvZGUoJ3BvcEhhc2gnKTtcbiAgfSxcblxuICBwYXJ0aWFsOiBmdW5jdGlvbihwYXJ0aWFsKSB7XG4gICAgdmFyIHBhcnRpYWxOYW1lID0gcGFydGlhbC5wYXJ0aWFsTmFtZTtcbiAgICB0aGlzLnVzZVBhcnRpYWwgPSB0cnVlO1xuXG4gICAgaWYocGFydGlhbC5jb250ZXh0KSB7XG4gICAgICB0aGlzLklEKHBhcnRpYWwuY29udGV4dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMub3Bjb2RlKCdwdXNoJywgJ2RlcHRoMCcpO1xuICAgIH1cblxuICAgIHRoaXMub3Bjb2RlKCdpbnZva2VQYXJ0aWFsJywgcGFydGlhbE5hbWUubmFtZSk7XG4gICAgdGhpcy5vcGNvZGUoJ2FwcGVuZCcpO1xuICB9LFxuXG4gIGNvbnRlbnQ6IGZ1bmN0aW9uKGNvbnRlbnQpIHtcbiAgICB0aGlzLm9wY29kZSgnYXBwZW5kQ29udGVudCcsIGNvbnRlbnQuc3RyaW5nKTtcbiAgfSxcblxuICBtdXN0YWNoZTogZnVuY3Rpb24obXVzdGFjaGUpIHtcbiAgICB2YXIgb3B0aW9ucyA9IHRoaXMub3B0aW9ucztcbiAgICB2YXIgdHlwZSA9IHRoaXMuY2xhc3NpZnlNdXN0YWNoZShtdXN0YWNoZSk7XG5cbiAgICBpZiAodHlwZSA9PT0gXCJzaW1wbGVcIikge1xuICAgICAgdGhpcy5zaW1wbGVNdXN0YWNoZShtdXN0YWNoZSk7XG4gICAgfSBlbHNlIGlmICh0eXBlID09PSBcImhlbHBlclwiKSB7XG4gICAgICB0aGlzLmhlbHBlck11c3RhY2hlKG11c3RhY2hlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5hbWJpZ3VvdXNNdXN0YWNoZShtdXN0YWNoZSk7XG4gICAgfVxuXG4gICAgaWYobXVzdGFjaGUuZXNjYXBlZCAmJiAhb3B0aW9ucy5ub0VzY2FwZSkge1xuICAgICAgdGhpcy5vcGNvZGUoJ2FwcGVuZEVzY2FwZWQnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5vcGNvZGUoJ2FwcGVuZCcpO1xuICAgIH1cbiAgfSxcblxuICBhbWJpZ3VvdXNNdXN0YWNoZTogZnVuY3Rpb24obXVzdGFjaGUsIHByb2dyYW0sIGludmVyc2UpIHtcbiAgICB2YXIgaWQgPSBtdXN0YWNoZS5pZCxcbiAgICAgICAgbmFtZSA9IGlkLnBhcnRzWzBdLFxuICAgICAgICBpc0Jsb2NrID0gcHJvZ3JhbSAhPSBudWxsIHx8IGludmVyc2UgIT0gbnVsbDtcblxuICAgIHRoaXMub3Bjb2RlKCdnZXRDb250ZXh0JywgaWQuZGVwdGgpO1xuXG4gICAgdGhpcy5vcGNvZGUoJ3B1c2hQcm9ncmFtJywgcHJvZ3JhbSk7XG4gICAgdGhpcy5vcGNvZGUoJ3B1c2hQcm9ncmFtJywgaW52ZXJzZSk7XG5cbiAgICB0aGlzLm9wY29kZSgnaW52b2tlQW1iaWd1b3VzJywgbmFtZSwgaXNCbG9jayk7XG4gIH0sXG5cbiAgc2ltcGxlTXVzdGFjaGU6IGZ1bmN0aW9uKG11c3RhY2hlKSB7XG4gICAgdmFyIGlkID0gbXVzdGFjaGUuaWQ7XG5cbiAgICBpZiAoaWQudHlwZSA9PT0gJ0RBVEEnKSB7XG4gICAgICB0aGlzLkRBVEEoaWQpO1xuICAgIH0gZWxzZSBpZiAoaWQucGFydHMubGVuZ3RoKSB7XG4gICAgICB0aGlzLklEKGlkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gU2ltcGxpZmllZCBJRCBmb3IgYHRoaXNgXG4gICAgICB0aGlzLmFkZERlcHRoKGlkLmRlcHRoKTtcbiAgICAgIHRoaXMub3Bjb2RlKCdnZXRDb250ZXh0JywgaWQuZGVwdGgpO1xuICAgICAgdGhpcy5vcGNvZGUoJ3B1c2hDb250ZXh0Jyk7XG4gICAgfVxuXG4gICAgdGhpcy5vcGNvZGUoJ3Jlc29sdmVQb3NzaWJsZUxhbWJkYScpO1xuICB9LFxuXG4gIGhlbHBlck11c3RhY2hlOiBmdW5jdGlvbihtdXN0YWNoZSwgcHJvZ3JhbSwgaW52ZXJzZSkge1xuICAgIHZhciBwYXJhbXMgPSB0aGlzLnNldHVwRnVsbE11c3RhY2hlUGFyYW1zKG11c3RhY2hlLCBwcm9ncmFtLCBpbnZlcnNlKSxcbiAgICAgICAgbmFtZSA9IG11c3RhY2hlLmlkLnBhcnRzWzBdO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5rbm93bkhlbHBlcnNbbmFtZV0pIHtcbiAgICAgIHRoaXMub3Bjb2RlKCdpbnZva2VLbm93bkhlbHBlcicsIHBhcmFtcy5sZW5ndGgsIG5hbWUpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5vcHRpb25zLmtub3duSGVscGVyc09ubHkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIllvdSBzcGVjaWZpZWQga25vd25IZWxwZXJzT25seSwgYnV0IHVzZWQgdGhlIHVua25vd24gaGVscGVyIFwiICsgbmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMub3Bjb2RlKCdpbnZva2VIZWxwZXInLCBwYXJhbXMubGVuZ3RoLCBuYW1lKTtcbiAgICB9XG4gIH0sXG5cbiAgSUQ6IGZ1bmN0aW9uKGlkKSB7XG4gICAgdGhpcy5hZGREZXB0aChpZC5kZXB0aCk7XG4gICAgdGhpcy5vcGNvZGUoJ2dldENvbnRleHQnLCBpZC5kZXB0aCk7XG5cbiAgICB2YXIgbmFtZSA9IGlkLnBhcnRzWzBdO1xuICAgIGlmICghbmFtZSkge1xuICAgICAgdGhpcy5vcGNvZGUoJ3B1c2hDb250ZXh0Jyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMub3Bjb2RlKCdsb29rdXBPbkNvbnRleHQnLCBpZC5wYXJ0c1swXSk7XG4gICAgfVxuXG4gICAgZm9yKHZhciBpPTEsIGw9aWQucGFydHMubGVuZ3RoOyBpPGw7IGkrKykge1xuICAgICAgdGhpcy5vcGNvZGUoJ2xvb2t1cCcsIGlkLnBhcnRzW2ldKTtcbiAgICB9XG4gIH0sXG5cbiAgREFUQTogZnVuY3Rpb24oZGF0YSkge1xuICAgIHRoaXMub3B0aW9ucy5kYXRhID0gdHJ1ZTtcbiAgICBpZiAoZGF0YS5pZC5pc1Njb3BlZCB8fCBkYXRhLmlkLmRlcHRoKSB7XG4gICAgICB0aHJvdyBuZXcgSGFuZGxlYmFycy5FeGNlcHRpb24oJ1Njb3BlZCBkYXRhIHJlZmVyZW5jZXMgYXJlIG5vdCBzdXBwb3J0ZWQ6ICcgKyBkYXRhLm9yaWdpbmFsKTtcbiAgICB9XG5cbiAgICB0aGlzLm9wY29kZSgnbG9va3VwRGF0YScpO1xuICAgIHZhciBwYXJ0cyA9IGRhdGEuaWQucGFydHM7XG4gICAgZm9yKHZhciBpPTAsIGw9cGFydHMubGVuZ3RoOyBpPGw7IGkrKykge1xuICAgICAgdGhpcy5vcGNvZGUoJ2xvb2t1cCcsIHBhcnRzW2ldKTtcbiAgICB9XG4gIH0sXG5cbiAgU1RSSU5HOiBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICB0aGlzLm9wY29kZSgncHVzaFN0cmluZycsIHN0cmluZy5zdHJpbmcpO1xuICB9LFxuXG4gIElOVEVHRVI6IGZ1bmN0aW9uKGludGVnZXIpIHtcbiAgICB0aGlzLm9wY29kZSgncHVzaExpdGVyYWwnLCBpbnRlZ2VyLmludGVnZXIpO1xuICB9LFxuXG4gIEJPT0xFQU46IGZ1bmN0aW9uKGJvb2wpIHtcbiAgICB0aGlzLm9wY29kZSgncHVzaExpdGVyYWwnLCBib29sLmJvb2wpO1xuICB9LFxuXG4gIGNvbW1lbnQ6IGZ1bmN0aW9uKCkge30sXG5cbiAgLy8gSEVMUEVSU1xuICBvcGNvZGU6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB0aGlzLm9wY29kZXMucHVzaCh7IG9wY29kZTogbmFtZSwgYXJnczogW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpIH0pO1xuICB9LFxuXG4gIGRlY2xhcmU6IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gICAgdGhpcy5vcGNvZGVzLnB1c2goeyBvcGNvZGU6ICdERUNMQVJFJywgbmFtZTogbmFtZSwgdmFsdWU6IHZhbHVlIH0pO1xuICB9LFxuXG4gIGFkZERlcHRoOiBmdW5jdGlvbihkZXB0aCkge1xuICAgIGlmKGlzTmFOKGRlcHRoKSkgeyB0aHJvdyBuZXcgRXJyb3IoXCJFV09UXCIpOyB9XG4gICAgaWYoZGVwdGggPT09IDApIHsgcmV0dXJuOyB9XG5cbiAgICBpZighdGhpcy5kZXB0aHNbZGVwdGhdKSB7XG4gICAgICB0aGlzLmRlcHRoc1tkZXB0aF0gPSB0cnVlO1xuICAgICAgdGhpcy5kZXB0aHMubGlzdC5wdXNoKGRlcHRoKTtcbiAgICB9XG4gIH0sXG5cbiAgY2xhc3NpZnlNdXN0YWNoZTogZnVuY3Rpb24obXVzdGFjaGUpIHtcbiAgICB2YXIgaXNIZWxwZXIgICA9IG11c3RhY2hlLmlzSGVscGVyO1xuICAgIHZhciBpc0VsaWdpYmxlID0gbXVzdGFjaGUuZWxpZ2libGVIZWxwZXI7XG4gICAgdmFyIG9wdGlvbnMgICAgPSB0aGlzLm9wdGlvbnM7XG5cbiAgICAvLyBpZiBhbWJpZ3VvdXMsIHdlIGNhbiBwb3NzaWJseSByZXNvbHZlIHRoZSBhbWJpZ3VpdHkgbm93XG4gICAgaWYgKGlzRWxpZ2libGUgJiYgIWlzSGVscGVyKSB7XG4gICAgICB2YXIgbmFtZSA9IG11c3RhY2hlLmlkLnBhcnRzWzBdO1xuXG4gICAgICBpZiAob3B0aW9ucy5rbm93bkhlbHBlcnNbbmFtZV0pIHtcbiAgICAgICAgaXNIZWxwZXIgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChvcHRpb25zLmtub3duSGVscGVyc09ubHkpIHtcbiAgICAgICAgaXNFbGlnaWJsZSA9IGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChpc0hlbHBlcikgeyByZXR1cm4gXCJoZWxwZXJcIjsgfVxuICAgIGVsc2UgaWYgKGlzRWxpZ2libGUpIHsgcmV0dXJuIFwiYW1iaWd1b3VzXCI7IH1cbiAgICBlbHNlIHsgcmV0dXJuIFwic2ltcGxlXCI7IH1cbiAgfSxcblxuICBwdXNoUGFyYW1zOiBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICB2YXIgaSA9IHBhcmFtcy5sZW5ndGgsIHBhcmFtO1xuXG4gICAgd2hpbGUoaS0tKSB7XG4gICAgICBwYXJhbSA9IHBhcmFtc1tpXTtcblxuICAgICAgaWYodGhpcy5vcHRpb25zLnN0cmluZ1BhcmFtcykge1xuICAgICAgICBpZihwYXJhbS5kZXB0aCkge1xuICAgICAgICAgIHRoaXMuYWRkRGVwdGgocGFyYW0uZGVwdGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5vcGNvZGUoJ2dldENvbnRleHQnLCBwYXJhbS5kZXB0aCB8fCAwKTtcbiAgICAgICAgdGhpcy5vcGNvZGUoJ3B1c2hTdHJpbmdQYXJhbScsIHBhcmFtLnN0cmluZ01vZGVWYWx1ZSwgcGFyYW0udHlwZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzW3BhcmFtLnR5cGVdKHBhcmFtKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgc2V0dXBNdXN0YWNoZVBhcmFtczogZnVuY3Rpb24obXVzdGFjaGUpIHtcbiAgICB2YXIgcGFyYW1zID0gbXVzdGFjaGUucGFyYW1zO1xuICAgIHRoaXMucHVzaFBhcmFtcyhwYXJhbXMpO1xuXG4gICAgaWYobXVzdGFjaGUuaGFzaCkge1xuICAgICAgdGhpcy5oYXNoKG11c3RhY2hlLmhhc2gpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLm9wY29kZSgnZW1wdHlIYXNoJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHBhcmFtcztcbiAgfSxcblxuICAvLyB0aGlzIHdpbGwgcmVwbGFjZSBzZXR1cE11c3RhY2hlUGFyYW1zIHdoZW4gd2UncmUgZG9uZVxuICBzZXR1cEZ1bGxNdXN0YWNoZVBhcmFtczogZnVuY3Rpb24obXVzdGFjaGUsIHByb2dyYW0sIGludmVyc2UpIHtcbiAgICB2YXIgcGFyYW1zID0gbXVzdGFjaGUucGFyYW1zO1xuICAgIHRoaXMucHVzaFBhcmFtcyhwYXJhbXMpO1xuXG4gICAgdGhpcy5vcGNvZGUoJ3B1c2hQcm9ncmFtJywgcHJvZ3JhbSk7XG4gICAgdGhpcy5vcGNvZGUoJ3B1c2hQcm9ncmFtJywgaW52ZXJzZSk7XG5cbiAgICBpZihtdXN0YWNoZS5oYXNoKSB7XG4gICAgICB0aGlzLmhhc2gobXVzdGFjaGUuaGFzaCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMub3Bjb2RlKCdlbXB0eUhhc2gnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcGFyYW1zO1xuICB9XG59O1xuXG52YXIgTGl0ZXJhbCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHRoaXMudmFsdWUgPSB2YWx1ZTtcbn07XG5cbkphdmFTY3JpcHRDb21waWxlci5wcm90b3R5cGUgPSB7XG4gIC8vIFBVQkxJQyBBUEk6IFlvdSBjYW4gb3ZlcnJpZGUgdGhlc2UgbWV0aG9kcyBpbiBhIHN1YmNsYXNzIHRvIHByb3ZpZGVcbiAgLy8gYWx0ZXJuYXRpdmUgY29tcGlsZWQgZm9ybXMgZm9yIG5hbWUgbG9va3VwIGFuZCBidWZmZXJpbmcgc2VtYW50aWNzXG4gIG5hbWVMb29rdXA6IGZ1bmN0aW9uKHBhcmVudCwgbmFtZSAvKiAsIHR5cGUqLykge1xuICAgIGlmICgvXlswLTldKyQvLnRlc3QobmFtZSkpIHtcbiAgICAgIHJldHVybiBwYXJlbnQgKyBcIltcIiArIG5hbWUgKyBcIl1cIjtcbiAgICB9IGVsc2UgaWYgKEphdmFTY3JpcHRDb21waWxlci5pc1ZhbGlkSmF2YVNjcmlwdFZhcmlhYmxlTmFtZShuYW1lKSkge1xuICAgICAgcmV0dXJuIHBhcmVudCArIFwiLlwiICsgbmFtZTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICByZXR1cm4gcGFyZW50ICsgXCJbJ1wiICsgbmFtZSArIFwiJ11cIjtcbiAgICB9XG4gIH0sXG5cbiAgYXBwZW5kVG9CdWZmZXI6IGZ1bmN0aW9uKHN0cmluZykge1xuICAgIGlmICh0aGlzLmVudmlyb25tZW50LmlzU2ltcGxlKSB7XG4gICAgICByZXR1cm4gXCJyZXR1cm4gXCIgKyBzdHJpbmcgKyBcIjtcIjtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgYXBwZW5kVG9CdWZmZXI6IHRydWUsXG4gICAgICAgIGNvbnRlbnQ6IHN0cmluZyxcbiAgICAgICAgdG9TdHJpbmc6IGZ1bmN0aW9uKCkgeyByZXR1cm4gXCJidWZmZXIgKz0gXCIgKyBzdHJpbmcgKyBcIjtcIjsgfVxuICAgICAgfTtcbiAgICB9XG4gIH0sXG5cbiAgaW5pdGlhbGl6ZUJ1ZmZlcjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMucXVvdGVkU3RyaW5nKFwiXCIpO1xuICB9LFxuXG4gIG5hbWVzcGFjZTogXCJIYW5kbGViYXJzXCIsXG4gIC8vIEVORCBQVUJMSUMgQVBJXG5cbiAgY29tcGlsZTogZnVuY3Rpb24oZW52aXJvbm1lbnQsIG9wdGlvbnMsIGNvbnRleHQsIGFzT2JqZWN0KSB7XG4gICAgdGhpcy5lbnZpcm9ubWVudCA9IGVudmlyb25tZW50O1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICBIYW5kbGViYXJzLmxvZyhIYW5kbGViYXJzLmxvZ2dlci5ERUJVRywgdGhpcy5lbnZpcm9ubWVudC5kaXNhc3NlbWJsZSgpICsgXCJcXG5cXG5cIik7XG5cbiAgICB0aGlzLm5hbWUgPSB0aGlzLmVudmlyb25tZW50Lm5hbWU7XG4gICAgdGhpcy5pc0NoaWxkID0gISFjb250ZXh0O1xuICAgIHRoaXMuY29udGV4dCA9IGNvbnRleHQgfHwge1xuICAgICAgcHJvZ3JhbXM6IFtdLFxuICAgICAgZW52aXJvbm1lbnRzOiBbXSxcbiAgICAgIGFsaWFzZXM6IHsgfVxuICAgIH07XG5cbiAgICB0aGlzLnByZWFtYmxlKCk7XG5cbiAgICB0aGlzLnN0YWNrU2xvdCA9IDA7XG4gICAgdGhpcy5zdGFja1ZhcnMgPSBbXTtcbiAgICB0aGlzLnJlZ2lzdGVycyA9IHsgbGlzdDogW10gfTtcbiAgICB0aGlzLmNvbXBpbGVTdGFjayA9IFtdO1xuICAgIHRoaXMuaW5saW5lU3RhY2sgPSBbXTtcblxuICAgIHRoaXMuY29tcGlsZUNoaWxkcmVuKGVudmlyb25tZW50LCBvcHRpb25zKTtcblxuICAgIHZhciBvcGNvZGVzID0gZW52aXJvbm1lbnQub3Bjb2Rlcywgb3Bjb2RlO1xuXG4gICAgdGhpcy5pID0gMDtcblxuICAgIGZvcihsPW9wY29kZXMubGVuZ3RoOyB0aGlzLmk8bDsgdGhpcy5pKyspIHtcbiAgICAgIG9wY29kZSA9IG9wY29kZXNbdGhpcy5pXTtcblxuICAgICAgaWYob3Bjb2RlLm9wY29kZSA9PT0gJ0RFQ0xBUkUnKSB7XG4gICAgICAgIHRoaXNbb3Bjb2RlLm5hbWVdID0gb3Bjb2RlLnZhbHVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpc1tvcGNvZGUub3Bjb2RlXS5hcHBseSh0aGlzLCBvcGNvZGUuYXJncyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuY3JlYXRlRnVuY3Rpb25Db250ZXh0KGFzT2JqZWN0KTtcbiAgfSxcblxuICBuZXh0T3Bjb2RlOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgb3Bjb2RlcyA9IHRoaXMuZW52aXJvbm1lbnQub3Bjb2RlcztcbiAgICByZXR1cm4gb3Bjb2Rlc1t0aGlzLmkgKyAxXTtcbiAgfSxcblxuICBlYXQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuaSA9IHRoaXMuaSArIDE7XG4gIH0sXG5cbiAgcHJlYW1ibGU6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBvdXQgPSBbXTtcblxuICAgIGlmICghdGhpcy5pc0NoaWxkKSB7XG4gICAgICB2YXIgbmFtZXNwYWNlID0gdGhpcy5uYW1lc3BhY2U7XG5cbiAgICAgIHZhciBjb3BpZXMgPSBcImhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIFwiICsgbmFtZXNwYWNlICsgXCIuaGVscGVycyk7XCI7XG4gICAgICBpZiAodGhpcy5lbnZpcm9ubWVudC51c2VQYXJ0aWFsKSB7IGNvcGllcyA9IGNvcGllcyArIFwiIHBhcnRpYWxzID0gdGhpcy5tZXJnZShwYXJ0aWFscywgXCIgKyBuYW1lc3BhY2UgKyBcIi5wYXJ0aWFscyk7XCI7IH1cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuZGF0YSkgeyBjb3BpZXMgPSBjb3BpZXMgKyBcIiBkYXRhID0gZGF0YSB8fCB7fTtcIjsgfVxuICAgICAgb3V0LnB1c2goY29waWVzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0LnB1c2goJycpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5lbnZpcm9ubWVudC5pc1NpbXBsZSkge1xuICAgICAgb3V0LnB1c2goXCIsIGJ1ZmZlciA9IFwiICsgdGhpcy5pbml0aWFsaXplQnVmZmVyKCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQucHVzaChcIlwiKTtcbiAgICB9XG5cbiAgICAvLyB0cmFjayB0aGUgbGFzdCBjb250ZXh0IHB1c2hlZCBpbnRvIHBsYWNlIHRvIGFsbG93IHNraXBwaW5nIHRoZVxuICAgIC8vIGdldENvbnRleHQgb3Bjb2RlIHdoZW4gaXQgd291bGQgYmUgYSBub29wXG4gICAgdGhpcy5sYXN0Q29udGV4dCA9IDA7XG4gICAgdGhpcy5zb3VyY2UgPSBvdXQ7XG4gIH0sXG5cbiAgY3JlYXRlRnVuY3Rpb25Db250ZXh0OiBmdW5jdGlvbihhc09iamVjdCkge1xuICAgIHZhciBsb2NhbHMgPSB0aGlzLnN0YWNrVmFycy5jb25jYXQodGhpcy5yZWdpc3RlcnMubGlzdCk7XG5cbiAgICBpZihsb2NhbHMubGVuZ3RoID4gMCkge1xuICAgICAgdGhpcy5zb3VyY2VbMV0gPSB0aGlzLnNvdXJjZVsxXSArIFwiLCBcIiArIGxvY2Fscy5qb2luKFwiLCBcIik7XG4gICAgfVxuXG4gICAgLy8gR2VuZXJhdGUgbWluaW1pemVyIGFsaWFzIG1hcHBpbmdzXG4gICAgaWYgKCF0aGlzLmlzQ2hpbGQpIHtcbiAgICAgIGZvciAodmFyIGFsaWFzIGluIHRoaXMuY29udGV4dC5hbGlhc2VzKSB7XG4gICAgICAgIGlmICh0aGlzLmNvbnRleHQuYWxpYXNlcy5oYXNPd25Qcm9wZXJ0eShhbGlhcykpIHtcbiAgICAgICAgICB0aGlzLnNvdXJjZVsxXSA9IHRoaXMuc291cmNlWzFdICsgJywgJyArIGFsaWFzICsgJz0nICsgdGhpcy5jb250ZXh0LmFsaWFzZXNbYWxpYXNdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuc291cmNlWzFdKSB7XG4gICAgICB0aGlzLnNvdXJjZVsxXSA9IFwidmFyIFwiICsgdGhpcy5zb3VyY2VbMV0uc3Vic3RyaW5nKDIpICsgXCI7XCI7XG4gICAgfVxuXG4gICAgLy8gTWVyZ2UgY2hpbGRyZW5cbiAgICBpZiAoIXRoaXMuaXNDaGlsZCkge1xuICAgICAgdGhpcy5zb3VyY2VbMV0gKz0gJ1xcbicgKyB0aGlzLmNvbnRleHQucHJvZ3JhbXMuam9pbignXFxuJykgKyAnXFxuJztcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuZW52aXJvbm1lbnQuaXNTaW1wbGUpIHtcbiAgICAgIHRoaXMuc291cmNlLnB1c2goXCJyZXR1cm4gYnVmZmVyO1wiKTtcbiAgICB9XG5cbiAgICB2YXIgcGFyYW1zID0gdGhpcy5pc0NoaWxkID8gW1wiZGVwdGgwXCIsIFwiZGF0YVwiXSA6IFtcIkhhbmRsZWJhcnNcIiwgXCJkZXB0aDBcIiwgXCJoZWxwZXJzXCIsIFwicGFydGlhbHNcIiwgXCJkYXRhXCJdO1xuXG4gICAgZm9yKHZhciBpPTAsIGw9dGhpcy5lbnZpcm9ubWVudC5kZXB0aHMubGlzdC5sZW5ndGg7IGk8bDsgaSsrKSB7XG4gICAgICBwYXJhbXMucHVzaChcImRlcHRoXCIgKyB0aGlzLmVudmlyb25tZW50LmRlcHRocy5saXN0W2ldKTtcbiAgICB9XG5cbiAgICAvLyBQZXJmb3JtIGEgc2Vjb25kIHBhc3Mgb3ZlciB0aGUgb3V0cHV0IHRvIG1lcmdlIGNvbnRlbnQgd2hlbiBwb3NzaWJsZVxuICAgIHZhciBzb3VyY2UgPSB0aGlzLm1lcmdlU291cmNlKCk7XG5cbiAgICBpZiAoIXRoaXMuaXNDaGlsZCkge1xuICAgICAgdmFyIHJldmlzaW9uID0gSGFuZGxlYmFycy5DT01QSUxFUl9SRVZJU0lPTixcbiAgICAgICAgICB2ZXJzaW9ucyA9IEhhbmRsZWJhcnMuUkVWSVNJT05fQ0hBTkdFU1tyZXZpc2lvbl07XG4gICAgICBzb3VyY2UgPSBcInRoaXMuY29tcGlsZXJJbmZvID0gW1wiK3JldmlzaW9uK1wiLCdcIit2ZXJzaW9ucytcIiddO1xcblwiK3NvdXJjZTtcbiAgICB9XG5cbiAgICBpZiAoYXNPYmplY3QpIHtcbiAgICAgIHBhcmFtcy5wdXNoKHNvdXJjZSk7XG5cbiAgICAgIHJldHVybiBGdW5jdGlvbi5hcHBseSh0aGlzLCBwYXJhbXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgZnVuY3Rpb25Tb3VyY2UgPSAnZnVuY3Rpb24gJyArICh0aGlzLm5hbWUgfHwgJycpICsgJygnICsgcGFyYW1zLmpvaW4oJywnKSArICcpIHtcXG4gICcgKyBzb3VyY2UgKyAnfSc7XG4gICAgICBIYW5kbGViYXJzLmxvZyhIYW5kbGViYXJzLmxvZ2dlci5ERUJVRywgZnVuY3Rpb25Tb3VyY2UgKyBcIlxcblxcblwiKTtcbiAgICAgIHJldHVybiBmdW5jdGlvblNvdXJjZTtcbiAgICB9XG4gIH0sXG4gIG1lcmdlU291cmNlOiBmdW5jdGlvbigpIHtcbiAgICAvLyBXQVJOOiBXZSBhcmUgbm90IGhhbmRsaW5nIHRoZSBjYXNlIHdoZXJlIGJ1ZmZlciBpcyBzdGlsbCBwb3B1bGF0ZWQgYXMgdGhlIHNvdXJjZSBzaG91bGRcbiAgICAvLyBub3QgaGF2ZSBidWZmZXIgYXBwZW5kIG9wZXJhdGlvbnMgYXMgdGhlaXIgZmluYWwgYWN0aW9uLlxuICAgIHZhciBzb3VyY2UgPSAnJyxcbiAgICAgICAgYnVmZmVyO1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSB0aGlzLnNvdXJjZS5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgdmFyIGxpbmUgPSB0aGlzLnNvdXJjZVtpXTtcbiAgICAgIGlmIChsaW5lLmFwcGVuZFRvQnVmZmVyKSB7XG4gICAgICAgIGlmIChidWZmZXIpIHtcbiAgICAgICAgICBidWZmZXIgPSBidWZmZXIgKyAnXFxuICAgICsgJyArIGxpbmUuY29udGVudDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBidWZmZXIgPSBsaW5lLmNvbnRlbnQ7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChidWZmZXIpIHtcbiAgICAgICAgICBzb3VyY2UgKz0gJ2J1ZmZlciArPSAnICsgYnVmZmVyICsgJztcXG4gICc7XG4gICAgICAgICAgYnVmZmVyID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIHNvdXJjZSArPSBsaW5lICsgJ1xcbiAgJztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHNvdXJjZTtcbiAgfSxcblxuICAvLyBbYmxvY2tWYWx1ZV1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogaGFzaCwgaW52ZXJzZSwgcHJvZ3JhbSwgdmFsdWVcbiAgLy8gT24gc3RhY2ssIGFmdGVyOiByZXR1cm4gdmFsdWUgb2YgYmxvY2tIZWxwZXJNaXNzaW5nXG4gIC8vXG4gIC8vIFRoZSBwdXJwb3NlIG9mIHRoaXMgb3Bjb2RlIGlzIHRvIHRha2UgYSBibG9jayBvZiB0aGUgZm9ybVxuICAvLyBge3sjZm9vfX0uLi57ey9mb299fWAsIHJlc29sdmUgdGhlIHZhbHVlIG9mIGBmb29gLCBhbmRcbiAgLy8gcmVwbGFjZSBpdCBvbiB0aGUgc3RhY2sgd2l0aCB0aGUgcmVzdWx0IG9mIHByb3Blcmx5XG4gIC8vIGludm9raW5nIGJsb2NrSGVscGVyTWlzc2luZy5cbiAgYmxvY2tWYWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5jb250ZXh0LmFsaWFzZXMuYmxvY2tIZWxwZXJNaXNzaW5nID0gJ2hlbHBlcnMuYmxvY2tIZWxwZXJNaXNzaW5nJztcblxuICAgIHZhciBwYXJhbXMgPSBbXCJkZXB0aDBcIl07XG4gICAgdGhpcy5zZXR1cFBhcmFtcygwLCBwYXJhbXMpO1xuXG4gICAgdGhpcy5yZXBsYWNlU3RhY2soZnVuY3Rpb24oY3VycmVudCkge1xuICAgICAgcGFyYW1zLnNwbGljZSgxLCAwLCBjdXJyZW50KTtcbiAgICAgIHJldHVybiBcImJsb2NrSGVscGVyTWlzc2luZy5jYWxsKFwiICsgcGFyYW1zLmpvaW4oXCIsIFwiKSArIFwiKVwiO1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIFthbWJpZ3VvdXNCbG9ja1ZhbHVlXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiBoYXNoLCBpbnZlcnNlLCBwcm9ncmFtLCB2YWx1ZVxuICAvLyBDb21waWxlciB2YWx1ZSwgYmVmb3JlOiBsYXN0SGVscGVyPXZhbHVlIG9mIGxhc3QgZm91bmQgaGVscGVyLCBpZiBhbnlcbiAgLy8gT24gc3RhY2ssIGFmdGVyLCBpZiBubyBsYXN0SGVscGVyOiBzYW1lIGFzIFtibG9ja1ZhbHVlXVxuICAvLyBPbiBzdGFjaywgYWZ0ZXIsIGlmIGxhc3RIZWxwZXI6IHZhbHVlXG4gIGFtYmlndW91c0Jsb2NrVmFsdWU6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuY29udGV4dC5hbGlhc2VzLmJsb2NrSGVscGVyTWlzc2luZyA9ICdoZWxwZXJzLmJsb2NrSGVscGVyTWlzc2luZyc7XG5cbiAgICB2YXIgcGFyYW1zID0gW1wiZGVwdGgwXCJdO1xuICAgIHRoaXMuc2V0dXBQYXJhbXMoMCwgcGFyYW1zKTtcblxuICAgIHZhciBjdXJyZW50ID0gdGhpcy50b3BTdGFjaygpO1xuICAgIHBhcmFtcy5zcGxpY2UoMSwgMCwgY3VycmVudCk7XG5cbiAgICAvLyBVc2UgdGhlIG9wdGlvbnMgdmFsdWUgZ2VuZXJhdGVkIGZyb20gdGhlIGludm9jYXRpb25cbiAgICBwYXJhbXNbcGFyYW1zLmxlbmd0aC0xXSA9ICdvcHRpb25zJztcblxuICAgIHRoaXMuc291cmNlLnB1c2goXCJpZiAoIVwiICsgdGhpcy5sYXN0SGVscGVyICsgXCIpIHsgXCIgKyBjdXJyZW50ICsgXCIgPSBibG9ja0hlbHBlck1pc3NpbmcuY2FsbChcIiArIHBhcmFtcy5qb2luKFwiLCBcIikgKyBcIik7IH1cIik7XG4gIH0sXG5cbiAgLy8gW2FwcGVuZENvbnRlbnRdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IC4uLlxuICAvL1xuICAvLyBBcHBlbmRzIHRoZSBzdHJpbmcgdmFsdWUgb2YgYGNvbnRlbnRgIHRvIHRoZSBjdXJyZW50IGJ1ZmZlclxuICBhcHBlbmRDb250ZW50OiBmdW5jdGlvbihjb250ZW50KSB7XG4gICAgdGhpcy5zb3VyY2UucHVzaCh0aGlzLmFwcGVuZFRvQnVmZmVyKHRoaXMucXVvdGVkU3RyaW5nKGNvbnRlbnQpKSk7XG4gIH0sXG5cbiAgLy8gW2FwcGVuZF1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogdmFsdWUsIC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IC4uLlxuICAvL1xuICAvLyBDb2VyY2VzIGB2YWx1ZWAgdG8gYSBTdHJpbmcgYW5kIGFwcGVuZHMgaXQgdG8gdGhlIGN1cnJlbnQgYnVmZmVyLlxuICAvL1xuICAvLyBJZiBgdmFsdWVgIGlzIHRydXRoeSwgb3IgMCwgaXQgaXMgY29lcmNlZCBpbnRvIGEgc3RyaW5nIGFuZCBhcHBlbmRlZFxuICAvLyBPdGhlcndpc2UsIHRoZSBlbXB0eSBzdHJpbmcgaXMgYXBwZW5kZWRcbiAgYXBwZW5kOiBmdW5jdGlvbigpIHtcbiAgICAvLyBGb3JjZSBhbnl0aGluZyB0aGF0IGlzIGlubGluZWQgb250byB0aGUgc3RhY2sgc28gd2UgZG9uJ3QgaGF2ZSBkdXBsaWNhdGlvblxuICAgIC8vIHdoZW4gd2UgZXhhbWluZSBsb2NhbFxuICAgIHRoaXMuZmx1c2hJbmxpbmUoKTtcbiAgICB2YXIgbG9jYWwgPSB0aGlzLnBvcFN0YWNrKCk7XG4gICAgdGhpcy5zb3VyY2UucHVzaChcImlmKFwiICsgbG9jYWwgKyBcIiB8fCBcIiArIGxvY2FsICsgXCIgPT09IDApIHsgXCIgKyB0aGlzLmFwcGVuZFRvQnVmZmVyKGxvY2FsKSArIFwiIH1cIik7XG4gICAgaWYgKHRoaXMuZW52aXJvbm1lbnQuaXNTaW1wbGUpIHtcbiAgICAgIHRoaXMuc291cmNlLnB1c2goXCJlbHNlIHsgXCIgKyB0aGlzLmFwcGVuZFRvQnVmZmVyKFwiJydcIikgKyBcIiB9XCIpO1xuICAgIH1cbiAgfSxcblxuICAvLyBbYXBwZW5kRXNjYXBlZF1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogdmFsdWUsIC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IC4uLlxuICAvL1xuICAvLyBFc2NhcGUgYHZhbHVlYCBhbmQgYXBwZW5kIGl0IHRvIHRoZSBidWZmZXJcbiAgYXBwZW5kRXNjYXBlZDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5jb250ZXh0LmFsaWFzZXMuZXNjYXBlRXhwcmVzc2lvbiA9ICd0aGlzLmVzY2FwZUV4cHJlc3Npb24nO1xuXG4gICAgdGhpcy5zb3VyY2UucHVzaCh0aGlzLmFwcGVuZFRvQnVmZmVyKFwiZXNjYXBlRXhwcmVzc2lvbihcIiArIHRoaXMucG9wU3RhY2soKSArIFwiKVwiKSk7XG4gIH0sXG5cbiAgLy8gW2dldENvbnRleHRdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IC4uLlxuICAvLyBDb21waWxlciB2YWx1ZSwgYWZ0ZXI6IGxhc3RDb250ZXh0PWRlcHRoXG4gIC8vXG4gIC8vIFNldCB0aGUgdmFsdWUgb2YgdGhlIGBsYXN0Q29udGV4dGAgY29tcGlsZXIgdmFsdWUgdG8gdGhlIGRlcHRoXG4gIGdldENvbnRleHQ6IGZ1bmN0aW9uKGRlcHRoKSB7XG4gICAgaWYodGhpcy5sYXN0Q29udGV4dCAhPT0gZGVwdGgpIHtcbiAgICAgIHRoaXMubGFzdENvbnRleHQgPSBkZXB0aDtcbiAgICB9XG4gIH0sXG5cbiAgLy8gW2xvb2t1cE9uQ29udGV4dF1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogY3VycmVudENvbnRleHRbbmFtZV0sIC4uLlxuICAvL1xuICAvLyBMb29rcyB1cCB0aGUgdmFsdWUgb2YgYG5hbWVgIG9uIHRoZSBjdXJyZW50IGNvbnRleHQgYW5kIHB1c2hlc1xuICAvLyBpdCBvbnRvIHRoZSBzdGFjay5cbiAgbG9va3VwT25Db250ZXh0OiBmdW5jdGlvbihuYW1lKSB7XG4gICAgdGhpcy5wdXNoKHRoaXMubmFtZUxvb2t1cCgnZGVwdGgnICsgdGhpcy5sYXN0Q29udGV4dCwgbmFtZSwgJ2NvbnRleHQnKSk7XG4gIH0sXG5cbiAgLy8gW3B1c2hDb250ZXh0XVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiBjdXJyZW50Q29udGV4dCwgLi4uXG4gIC8vXG4gIC8vIFB1c2hlcyB0aGUgdmFsdWUgb2YgdGhlIGN1cnJlbnQgY29udGV4dCBvbnRvIHRoZSBzdGFjay5cbiAgcHVzaENvbnRleHQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucHVzaFN0YWNrTGl0ZXJhbCgnZGVwdGgnICsgdGhpcy5sYXN0Q29udGV4dCk7XG4gIH0sXG5cbiAgLy8gW3Jlc29sdmVQb3NzaWJsZUxhbWJkYV1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogdmFsdWUsIC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IHJlc29sdmVkIHZhbHVlLCAuLi5cbiAgLy9cbiAgLy8gSWYgdGhlIGB2YWx1ZWAgaXMgYSBsYW1iZGEsIHJlcGxhY2UgaXQgb24gdGhlIHN0YWNrIGJ5XG4gIC8vIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIGxhbWJkYVxuICByZXNvbHZlUG9zc2libGVMYW1iZGE6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuY29udGV4dC5hbGlhc2VzLmZ1bmN0aW9uVHlwZSA9ICdcImZ1bmN0aW9uXCInO1xuXG4gICAgdGhpcy5yZXBsYWNlU3RhY2soZnVuY3Rpb24oY3VycmVudCkge1xuICAgICAgcmV0dXJuIFwidHlwZW9mIFwiICsgY3VycmVudCArIFwiID09PSBmdW5jdGlvblR5cGUgPyBcIiArIGN1cnJlbnQgKyBcIi5hcHBseShkZXB0aDApIDogXCIgKyBjdXJyZW50O1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIFtsb29rdXBdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IHZhbHVlLCAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiB2YWx1ZVtuYW1lXSwgLi4uXG4gIC8vXG4gIC8vIFJlcGxhY2UgdGhlIHZhbHVlIG9uIHRoZSBzdGFjayB3aXRoIHRoZSByZXN1bHQgb2YgbG9va2luZ1xuICAvLyB1cCBgbmFtZWAgb24gYHZhbHVlYFxuICBsb29rdXA6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB0aGlzLnJlcGxhY2VTdGFjayhmdW5jdGlvbihjdXJyZW50KSB7XG4gICAgICByZXR1cm4gY3VycmVudCArIFwiID09IG51bGwgfHwgXCIgKyBjdXJyZW50ICsgXCIgPT09IGZhbHNlID8gXCIgKyBjdXJyZW50ICsgXCIgOiBcIiArIHRoaXMubmFtZUxvb2t1cChjdXJyZW50LCBuYW1lLCAnY29udGV4dCcpO1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIFtsb29rdXBEYXRhXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiBkYXRhW2lkXSwgLi4uXG4gIC8vXG4gIC8vIFB1c2ggdGhlIHJlc3VsdCBvZiBsb29raW5nIHVwIGBpZGAgb24gdGhlIGN1cnJlbnQgZGF0YVxuICBsb29rdXBEYXRhOiBmdW5jdGlvbihpZCkge1xuICAgIHRoaXMucHVzaCgnZGF0YScpO1xuICB9LFxuXG4gIC8vIFtwdXNoU3RyaW5nUGFyYW1dXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IHN0cmluZywgY3VycmVudENvbnRleHQsIC4uLlxuICAvL1xuICAvLyBUaGlzIG9wY29kZSBpcyBkZXNpZ25lZCBmb3IgdXNlIGluIHN0cmluZyBtb2RlLCB3aGljaFxuICAvLyBwcm92aWRlcyB0aGUgc3RyaW5nIHZhbHVlIG9mIGEgcGFyYW1ldGVyIGFsb25nIHdpdGggaXRzXG4gIC8vIGRlcHRoIHJhdGhlciB0aGFuIHJlc29sdmluZyBpdCBpbW1lZGlhdGVseS5cbiAgcHVzaFN0cmluZ1BhcmFtOiBmdW5jdGlvbihzdHJpbmcsIHR5cGUpIHtcbiAgICB0aGlzLnB1c2hTdGFja0xpdGVyYWwoJ2RlcHRoJyArIHRoaXMubGFzdENvbnRleHQpO1xuXG4gICAgdGhpcy5wdXNoU3RyaW5nKHR5cGUpO1xuXG4gICAgaWYgKHR5cGVvZiBzdHJpbmcgPT09ICdzdHJpbmcnKSB7XG4gICAgICB0aGlzLnB1c2hTdHJpbmcoc3RyaW5nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5wdXNoU3RhY2tMaXRlcmFsKHN0cmluZyk7XG4gICAgfVxuICB9LFxuXG4gIGVtcHR5SGFzaDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5wdXNoU3RhY2tMaXRlcmFsKCd7fScpO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpbmdQYXJhbXMpIHtcbiAgICAgIHRoaXMucmVnaXN0ZXIoJ2hhc2hUeXBlcycsICd7fScpO1xuICAgICAgdGhpcy5yZWdpc3RlcignaGFzaENvbnRleHRzJywgJ3t9Jyk7XG4gICAgfVxuICB9LFxuICBwdXNoSGFzaDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5oYXNoID0ge3ZhbHVlczogW10sIHR5cGVzOiBbXSwgY29udGV4dHM6IFtdfTtcbiAgfSxcbiAgcG9wSGFzaDogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGhhc2ggPSB0aGlzLmhhc2g7XG4gICAgdGhpcy5oYXNoID0gdW5kZWZpbmVkO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpbmdQYXJhbXMpIHtcbiAgICAgIHRoaXMucmVnaXN0ZXIoJ2hhc2hDb250ZXh0cycsICd7JyArIGhhc2guY29udGV4dHMuam9pbignLCcpICsgJ30nKTtcbiAgICAgIHRoaXMucmVnaXN0ZXIoJ2hhc2hUeXBlcycsICd7JyArIGhhc2gudHlwZXMuam9pbignLCcpICsgJ30nKTtcbiAgICB9XG4gICAgdGhpcy5wdXNoKCd7XFxuICAgICcgKyBoYXNoLnZhbHVlcy5qb2luKCcsXFxuICAgICcpICsgJ1xcbiAgfScpO1xuICB9LFxuXG4gIC8vIFtwdXNoU3RyaW5nXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiBxdW90ZWRTdHJpbmcoc3RyaW5nKSwgLi4uXG4gIC8vXG4gIC8vIFB1c2ggYSBxdW90ZWQgdmVyc2lvbiBvZiBgc3RyaW5nYCBvbnRvIHRoZSBzdGFja1xuICBwdXNoU3RyaW5nOiBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICB0aGlzLnB1c2hTdGFja0xpdGVyYWwodGhpcy5xdW90ZWRTdHJpbmcoc3RyaW5nKSk7XG4gIH0sXG5cbiAgLy8gW3B1c2hdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IGV4cHIsIC4uLlxuICAvL1xuICAvLyBQdXNoIGFuIGV4cHJlc3Npb24gb250byB0aGUgc3RhY2tcbiAgcHVzaDogZnVuY3Rpb24oZXhwcikge1xuICAgIHRoaXMuaW5saW5lU3RhY2sucHVzaChleHByKTtcbiAgICByZXR1cm4gZXhwcjtcbiAgfSxcblxuICAvLyBbcHVzaExpdGVyYWxdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IHZhbHVlLCAuLi5cbiAgLy9cbiAgLy8gUHVzaGVzIGEgdmFsdWUgb250byB0aGUgc3RhY2suIFRoaXMgb3BlcmF0aW9uIHByZXZlbnRzXG4gIC8vIHRoZSBjb21waWxlciBmcm9tIGNyZWF0aW5nIGEgdGVtcG9yYXJ5IHZhcmlhYmxlIHRvIGhvbGRcbiAgLy8gaXQuXG4gIHB1c2hMaXRlcmFsOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHRoaXMucHVzaFN0YWNrTGl0ZXJhbCh2YWx1ZSk7XG4gIH0sXG5cbiAgLy8gW3B1c2hQcm9ncmFtXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiBwcm9ncmFtKGd1aWQpLCAuLi5cbiAgLy9cbiAgLy8gUHVzaCBhIHByb2dyYW0gZXhwcmVzc2lvbiBvbnRvIHRoZSBzdGFjay4gVGhpcyB0YWtlc1xuICAvLyBhIGNvbXBpbGUtdGltZSBndWlkIGFuZCBjb252ZXJ0cyBpdCBpbnRvIGEgcnVudGltZS1hY2Nlc3NpYmxlXG4gIC8vIGV4cHJlc3Npb24uXG4gIHB1c2hQcm9ncmFtOiBmdW5jdGlvbihndWlkKSB7XG4gICAgaWYgKGd1aWQgIT0gbnVsbCkge1xuICAgICAgdGhpcy5wdXNoU3RhY2tMaXRlcmFsKHRoaXMucHJvZ3JhbUV4cHJlc3Npb24oZ3VpZCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnB1c2hTdGFja0xpdGVyYWwobnVsbCk7XG4gICAgfVxuICB9LFxuXG4gIC8vIFtpbnZva2VIZWxwZXJdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IGhhc2gsIGludmVyc2UsIHByb2dyYW0sIHBhcmFtcy4uLiwgLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogcmVzdWx0IG9mIGhlbHBlciBpbnZvY2F0aW9uXG4gIC8vXG4gIC8vIFBvcHMgb2ZmIHRoZSBoZWxwZXIncyBwYXJhbWV0ZXJzLCBpbnZva2VzIHRoZSBoZWxwZXIsXG4gIC8vIGFuZCBwdXNoZXMgdGhlIGhlbHBlcidzIHJldHVybiB2YWx1ZSBvbnRvIHRoZSBzdGFjay5cbiAgLy9cbiAgLy8gSWYgdGhlIGhlbHBlciBpcyBub3QgZm91bmQsIGBoZWxwZXJNaXNzaW5nYCBpcyBjYWxsZWQuXG4gIGludm9rZUhlbHBlcjogZnVuY3Rpb24ocGFyYW1TaXplLCBuYW1lKSB7XG4gICAgdGhpcy5jb250ZXh0LmFsaWFzZXMuaGVscGVyTWlzc2luZyA9ICdoZWxwZXJzLmhlbHBlck1pc3NpbmcnO1xuXG4gICAgdmFyIGhlbHBlciA9IHRoaXMubGFzdEhlbHBlciA9IHRoaXMuc2V0dXBIZWxwZXIocGFyYW1TaXplLCBuYW1lLCB0cnVlKTtcbiAgICB2YXIgbm9uSGVscGVyID0gdGhpcy5uYW1lTG9va3VwKCdkZXB0aCcgKyB0aGlzLmxhc3RDb250ZXh0LCBuYW1lLCAnY29udGV4dCcpO1xuXG4gICAgdGhpcy5wdXNoKGhlbHBlci5uYW1lICsgJyB8fCAnICsgbm9uSGVscGVyKTtcbiAgICB0aGlzLnJlcGxhY2VTdGFjayhmdW5jdGlvbihuYW1lKSB7XG4gICAgICByZXR1cm4gbmFtZSArICcgPyAnICsgbmFtZSArICcuY2FsbCgnICtcbiAgICAgICAgICBoZWxwZXIuY2FsbFBhcmFtcyArIFwiKSBcIiArIFwiOiBoZWxwZXJNaXNzaW5nLmNhbGwoXCIgK1xuICAgICAgICAgIGhlbHBlci5oZWxwZXJNaXNzaW5nUGFyYW1zICsgXCIpXCI7XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8gW2ludm9rZUtub3duSGVscGVyXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiBoYXNoLCBpbnZlcnNlLCBwcm9ncmFtLCBwYXJhbXMuLi4sIC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IHJlc3VsdCBvZiBoZWxwZXIgaW52b2NhdGlvblxuICAvL1xuICAvLyBUaGlzIG9wZXJhdGlvbiBpcyB1c2VkIHdoZW4gdGhlIGhlbHBlciBpcyBrbm93biB0byBleGlzdCxcbiAgLy8gc28gYSBgaGVscGVyTWlzc2luZ2AgZmFsbGJhY2sgaXMgbm90IHJlcXVpcmVkLlxuICBpbnZva2VLbm93bkhlbHBlcjogZnVuY3Rpb24ocGFyYW1TaXplLCBuYW1lKSB7XG4gICAgdmFyIGhlbHBlciA9IHRoaXMuc2V0dXBIZWxwZXIocGFyYW1TaXplLCBuYW1lKTtcbiAgICB0aGlzLnB1c2goaGVscGVyLm5hbWUgKyBcIi5jYWxsKFwiICsgaGVscGVyLmNhbGxQYXJhbXMgKyBcIilcIik7XG4gIH0sXG5cbiAgLy8gW2ludm9rZUFtYmlndW91c11cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogaGFzaCwgaW52ZXJzZSwgcHJvZ3JhbSwgcGFyYW1zLi4uLCAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiByZXN1bHQgb2YgZGlzYW1iaWd1YXRpb25cbiAgLy9cbiAgLy8gVGhpcyBvcGVyYXRpb24gaXMgdXNlZCB3aGVuIGFuIGV4cHJlc3Npb24gbGlrZSBge3tmb299fWBcbiAgLy8gaXMgcHJvdmlkZWQsIGJ1dCB3ZSBkb24ndCBrbm93IGF0IGNvbXBpbGUtdGltZSB3aGV0aGVyIGl0XG4gIC8vIGlzIGEgaGVscGVyIG9yIGEgcGF0aC5cbiAgLy9cbiAgLy8gVGhpcyBvcGVyYXRpb24gZW1pdHMgbW9yZSBjb2RlIHRoYW4gdGhlIG90aGVyIG9wdGlvbnMsXG4gIC8vIGFuZCBjYW4gYmUgYXZvaWRlZCBieSBwYXNzaW5nIHRoZSBga25vd25IZWxwZXJzYCBhbmRcbiAgLy8gYGtub3duSGVscGVyc09ubHlgIGZsYWdzIGF0IGNvbXBpbGUtdGltZS5cbiAgaW52b2tlQW1iaWd1b3VzOiBmdW5jdGlvbihuYW1lLCBoZWxwZXJDYWxsKSB7XG4gICAgdGhpcy5jb250ZXh0LmFsaWFzZXMuZnVuY3Rpb25UeXBlID0gJ1wiZnVuY3Rpb25cIic7XG5cbiAgICB0aGlzLnB1c2hTdGFja0xpdGVyYWwoJ3t9Jyk7ICAgIC8vIEhhc2ggdmFsdWVcbiAgICB2YXIgaGVscGVyID0gdGhpcy5zZXR1cEhlbHBlcigwLCBuYW1lLCBoZWxwZXJDYWxsKTtcblxuICAgIHZhciBoZWxwZXJOYW1lID0gdGhpcy5sYXN0SGVscGVyID0gdGhpcy5uYW1lTG9va3VwKCdoZWxwZXJzJywgbmFtZSwgJ2hlbHBlcicpO1xuXG4gICAgdmFyIG5vbkhlbHBlciA9IHRoaXMubmFtZUxvb2t1cCgnZGVwdGgnICsgdGhpcy5sYXN0Q29udGV4dCwgbmFtZSwgJ2NvbnRleHQnKTtcbiAgICB2YXIgbmV4dFN0YWNrID0gdGhpcy5uZXh0U3RhY2soKTtcblxuICAgIHRoaXMuc291cmNlLnB1c2goJ2lmICgnICsgbmV4dFN0YWNrICsgJyA9ICcgKyBoZWxwZXJOYW1lICsgJykgeyAnICsgbmV4dFN0YWNrICsgJyA9ICcgKyBuZXh0U3RhY2sgKyAnLmNhbGwoJyArIGhlbHBlci5jYWxsUGFyYW1zICsgJyk7IH0nKTtcbiAgICB0aGlzLnNvdXJjZS5wdXNoKCdlbHNlIHsgJyArIG5leHRTdGFjayArICcgPSAnICsgbm9uSGVscGVyICsgJzsgJyArIG5leHRTdGFjayArICcgPSB0eXBlb2YgJyArIG5leHRTdGFjayArICcgPT09IGZ1bmN0aW9uVHlwZSA/ICcgKyBuZXh0U3RhY2sgKyAnLmFwcGx5KGRlcHRoMCkgOiAnICsgbmV4dFN0YWNrICsgJzsgfScpO1xuICB9LFxuXG4gIC8vIFtpbnZva2VQYXJ0aWFsXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiBjb250ZXh0LCAuLi5cbiAgLy8gT24gc3RhY2sgYWZ0ZXI6IHJlc3VsdCBvZiBwYXJ0aWFsIGludm9jYXRpb25cbiAgLy9cbiAgLy8gVGhpcyBvcGVyYXRpb24gcG9wcyBvZmYgYSBjb250ZXh0LCBpbnZva2VzIGEgcGFydGlhbCB3aXRoIHRoYXQgY29udGV4dCxcbiAgLy8gYW5kIHB1c2hlcyB0aGUgcmVzdWx0IG9mIHRoZSBpbnZvY2F0aW9uIGJhY2suXG4gIGludm9rZVBhcnRpYWw6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgcGFyYW1zID0gW3RoaXMubmFtZUxvb2t1cCgncGFydGlhbHMnLCBuYW1lLCAncGFydGlhbCcpLCBcIidcIiArIG5hbWUgKyBcIidcIiwgdGhpcy5wb3BTdGFjaygpLCBcImhlbHBlcnNcIiwgXCJwYXJ0aWFsc1wiXTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuZGF0YSkge1xuICAgICAgcGFyYW1zLnB1c2goXCJkYXRhXCIpO1xuICAgIH1cblxuICAgIHRoaXMuY29udGV4dC5hbGlhc2VzLnNlbGYgPSBcInRoaXNcIjtcbiAgICB0aGlzLnB1c2goXCJzZWxmLmludm9rZVBhcnRpYWwoXCIgKyBwYXJhbXMuam9pbihcIiwgXCIpICsgXCIpXCIpO1xuICB9LFxuXG4gIC8vIFthc3NpZ25Ub0hhc2hdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IHZhbHVlLCBoYXNoLCAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiBoYXNoLCAuLi5cbiAgLy9cbiAgLy8gUG9wcyBhIHZhbHVlIGFuZCBoYXNoIG9mZiB0aGUgc3RhY2ssIGFzc2lnbnMgYGhhc2hba2V5XSA9IHZhbHVlYFxuICAvLyBhbmQgcHVzaGVzIHRoZSBoYXNoIGJhY2sgb250byB0aGUgc3RhY2suXG4gIGFzc2lnblRvSGFzaDogZnVuY3Rpb24oa2V5KSB7XG4gICAgdmFyIHZhbHVlID0gdGhpcy5wb3BTdGFjaygpLFxuICAgICAgICBjb250ZXh0LFxuICAgICAgICB0eXBlO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpbmdQYXJhbXMpIHtcbiAgICAgIHR5cGUgPSB0aGlzLnBvcFN0YWNrKCk7XG4gICAgICBjb250ZXh0ID0gdGhpcy5wb3BTdGFjaygpO1xuICAgIH1cblxuICAgIHZhciBoYXNoID0gdGhpcy5oYXNoO1xuICAgIGlmIChjb250ZXh0KSB7XG4gICAgICBoYXNoLmNvbnRleHRzLnB1c2goXCInXCIgKyBrZXkgKyBcIic6IFwiICsgY29udGV4dCk7XG4gICAgfVxuICAgIGlmICh0eXBlKSB7XG4gICAgICBoYXNoLnR5cGVzLnB1c2goXCInXCIgKyBrZXkgKyBcIic6IFwiICsgdHlwZSk7XG4gICAgfVxuICAgIGhhc2gudmFsdWVzLnB1c2goXCInXCIgKyBrZXkgKyBcIic6IChcIiArIHZhbHVlICsgXCIpXCIpO1xuICB9LFxuXG4gIC8vIEhFTFBFUlNcblxuICBjb21waWxlcjogSmF2YVNjcmlwdENvbXBpbGVyLFxuXG4gIGNvbXBpbGVDaGlsZHJlbjogZnVuY3Rpb24oZW52aXJvbm1lbnQsIG9wdGlvbnMpIHtcbiAgICB2YXIgY2hpbGRyZW4gPSBlbnZpcm9ubWVudC5jaGlsZHJlbiwgY2hpbGQsIGNvbXBpbGVyO1xuXG4gICAgZm9yKHZhciBpPTAsIGw9Y2hpbGRyZW4ubGVuZ3RoOyBpPGw7IGkrKykge1xuICAgICAgY2hpbGQgPSBjaGlsZHJlbltpXTtcbiAgICAgIGNvbXBpbGVyID0gbmV3IHRoaXMuY29tcGlsZXIoKTtcblxuICAgICAgdmFyIGluZGV4ID0gdGhpcy5tYXRjaEV4aXN0aW5nUHJvZ3JhbShjaGlsZCk7XG5cbiAgICAgIGlmIChpbmRleCA9PSBudWxsKSB7XG4gICAgICAgIHRoaXMuY29udGV4dC5wcm9ncmFtcy5wdXNoKCcnKTsgICAgIC8vIFBsYWNlaG9sZGVyIHRvIHByZXZlbnQgbmFtZSBjb25mbGljdHMgZm9yIG5lc3RlZCBjaGlsZHJlblxuICAgICAgICBpbmRleCA9IHRoaXMuY29udGV4dC5wcm9ncmFtcy5sZW5ndGg7XG4gICAgICAgIGNoaWxkLmluZGV4ID0gaW5kZXg7XG4gICAgICAgIGNoaWxkLm5hbWUgPSAncHJvZ3JhbScgKyBpbmRleDtcbiAgICAgICAgdGhpcy5jb250ZXh0LnByb2dyYW1zW2luZGV4XSA9IGNvbXBpbGVyLmNvbXBpbGUoY2hpbGQsIG9wdGlvbnMsIHRoaXMuY29udGV4dCk7XG4gICAgICAgIHRoaXMuY29udGV4dC5lbnZpcm9ubWVudHNbaW5kZXhdID0gY2hpbGQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjaGlsZC5pbmRleCA9IGluZGV4O1xuICAgICAgICBjaGlsZC5uYW1lID0gJ3Byb2dyYW0nICsgaW5kZXg7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBtYXRjaEV4aXN0aW5nUHJvZ3JhbTogZnVuY3Rpb24oY2hpbGQpIHtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gdGhpcy5jb250ZXh0LmVudmlyb25tZW50cy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgdmFyIGVudmlyb25tZW50ID0gdGhpcy5jb250ZXh0LmVudmlyb25tZW50c1tpXTtcbiAgICAgIGlmIChlbnZpcm9ubWVudCAmJiBlbnZpcm9ubWVudC5lcXVhbHMoY2hpbGQpKSB7XG4gICAgICAgIHJldHVybiBpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBwcm9ncmFtRXhwcmVzc2lvbjogZnVuY3Rpb24oZ3VpZCkge1xuICAgIHRoaXMuY29udGV4dC5hbGlhc2VzLnNlbGYgPSBcInRoaXNcIjtcblxuICAgIGlmKGd1aWQgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIFwic2VsZi5ub29wXCI7XG4gICAgfVxuXG4gICAgdmFyIGNoaWxkID0gdGhpcy5lbnZpcm9ubWVudC5jaGlsZHJlbltndWlkXSxcbiAgICAgICAgZGVwdGhzID0gY2hpbGQuZGVwdGhzLmxpc3QsIGRlcHRoO1xuXG4gICAgdmFyIHByb2dyYW1QYXJhbXMgPSBbY2hpbGQuaW5kZXgsIGNoaWxkLm5hbWUsIFwiZGF0YVwiXTtcblxuICAgIGZvcih2YXIgaT0wLCBsID0gZGVwdGhzLmxlbmd0aDsgaTxsOyBpKyspIHtcbiAgICAgIGRlcHRoID0gZGVwdGhzW2ldO1xuXG4gICAgICBpZihkZXB0aCA9PT0gMSkgeyBwcm9ncmFtUGFyYW1zLnB1c2goXCJkZXB0aDBcIik7IH1cbiAgICAgIGVsc2UgeyBwcm9ncmFtUGFyYW1zLnB1c2goXCJkZXB0aFwiICsgKGRlcHRoIC0gMSkpOyB9XG4gICAgfVxuXG4gICAgcmV0dXJuIChkZXB0aHMubGVuZ3RoID09PSAwID8gXCJzZWxmLnByb2dyYW0oXCIgOiBcInNlbGYucHJvZ3JhbVdpdGhEZXB0aChcIikgKyBwcm9ncmFtUGFyYW1zLmpvaW4oXCIsIFwiKSArIFwiKVwiO1xuICB9LFxuXG4gIHJlZ2lzdGVyOiBmdW5jdGlvbihuYW1lLCB2YWwpIHtcbiAgICB0aGlzLnVzZVJlZ2lzdGVyKG5hbWUpO1xuICAgIHRoaXMuc291cmNlLnB1c2gobmFtZSArIFwiID0gXCIgKyB2YWwgKyBcIjtcIik7XG4gIH0sXG5cbiAgdXNlUmVnaXN0ZXI6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBpZighdGhpcy5yZWdpc3RlcnNbbmFtZV0pIHtcbiAgICAgIHRoaXMucmVnaXN0ZXJzW25hbWVdID0gdHJ1ZTtcbiAgICAgIHRoaXMucmVnaXN0ZXJzLmxpc3QucHVzaChuYW1lKTtcbiAgICB9XG4gIH0sXG5cbiAgcHVzaFN0YWNrTGl0ZXJhbDogZnVuY3Rpb24oaXRlbSkge1xuICAgIHJldHVybiB0aGlzLnB1c2gobmV3IExpdGVyYWwoaXRlbSkpO1xuICB9LFxuXG4gIHB1c2hTdGFjazogZnVuY3Rpb24oaXRlbSkge1xuICAgIHRoaXMuZmx1c2hJbmxpbmUoKTtcblxuICAgIHZhciBzdGFjayA9IHRoaXMuaW5jclN0YWNrKCk7XG4gICAgaWYgKGl0ZW0pIHtcbiAgICAgIHRoaXMuc291cmNlLnB1c2goc3RhY2sgKyBcIiA9IFwiICsgaXRlbSArIFwiO1wiKTtcbiAgICB9XG4gICAgdGhpcy5jb21waWxlU3RhY2sucHVzaChzdGFjayk7XG4gICAgcmV0dXJuIHN0YWNrO1xuICB9LFxuXG4gIHJlcGxhY2VTdGFjazogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICB2YXIgcHJlZml4ID0gJycsXG4gICAgICAgIGlubGluZSA9IHRoaXMuaXNJbmxpbmUoKSxcbiAgICAgICAgc3RhY2s7XG5cbiAgICAvLyBJZiB3ZSBhcmUgY3VycmVudGx5IGlubGluZSB0aGVuIHdlIHdhbnQgdG8gbWVyZ2UgdGhlIGlubGluZSBzdGF0ZW1lbnQgaW50byB0aGVcbiAgICAvLyByZXBsYWNlbWVudCBzdGF0ZW1lbnQgdmlhICcsJ1xuICAgIGlmIChpbmxpbmUpIHtcbiAgICAgIHZhciB0b3AgPSB0aGlzLnBvcFN0YWNrKHRydWUpO1xuXG4gICAgICBpZiAodG9wIGluc3RhbmNlb2YgTGl0ZXJhbCkge1xuICAgICAgICAvLyBMaXRlcmFscyBkbyBub3QgbmVlZCB0byBiZSBpbmxpbmVkXG4gICAgICAgIHN0YWNrID0gdG9wLnZhbHVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gR2V0IG9yIGNyZWF0ZSB0aGUgY3VycmVudCBzdGFjayBuYW1lIGZvciB1c2UgYnkgdGhlIGlubGluZVxuICAgICAgICB2YXIgbmFtZSA9IHRoaXMuc3RhY2tTbG90ID8gdGhpcy50b3BTdGFja05hbWUoKSA6IHRoaXMuaW5jclN0YWNrKCk7XG5cbiAgICAgICAgcHJlZml4ID0gJygnICsgdGhpcy5wdXNoKG5hbWUpICsgJyA9ICcgKyB0b3AgKyAnKSwnO1xuICAgICAgICBzdGFjayA9IHRoaXMudG9wU3RhY2soKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc3RhY2sgPSB0aGlzLnRvcFN0YWNrKCk7XG4gICAgfVxuXG4gICAgdmFyIGl0ZW0gPSBjYWxsYmFjay5jYWxsKHRoaXMsIHN0YWNrKTtcblxuICAgIGlmIChpbmxpbmUpIHtcbiAgICAgIGlmICh0aGlzLmlubGluZVN0YWNrLmxlbmd0aCB8fCB0aGlzLmNvbXBpbGVTdGFjay5sZW5ndGgpIHtcbiAgICAgICAgdGhpcy5wb3BTdGFjaygpO1xuICAgICAgfVxuICAgICAgdGhpcy5wdXNoKCcoJyArIHByZWZpeCArIGl0ZW0gKyAnKScpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBQcmV2ZW50IG1vZGlmaWNhdGlvbiBvZiB0aGUgY29udGV4dCBkZXB0aCB2YXJpYWJsZS4gVGhyb3VnaCByZXBsYWNlU3RhY2tcbiAgICAgIGlmICghL15zdGFjay8udGVzdChzdGFjaykpIHtcbiAgICAgICAgc3RhY2sgPSB0aGlzLm5leHRTdGFjaygpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnNvdXJjZS5wdXNoKHN0YWNrICsgXCIgPSAoXCIgKyBwcmVmaXggKyBpdGVtICsgXCIpO1wiKTtcbiAgICB9XG4gICAgcmV0dXJuIHN0YWNrO1xuICB9LFxuXG4gIG5leHRTdGFjazogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMucHVzaFN0YWNrKCk7XG4gIH0sXG5cbiAgaW5jclN0YWNrOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN0YWNrU2xvdCsrO1xuICAgIGlmKHRoaXMuc3RhY2tTbG90ID4gdGhpcy5zdGFja1ZhcnMubGVuZ3RoKSB7IHRoaXMuc3RhY2tWYXJzLnB1c2goXCJzdGFja1wiICsgdGhpcy5zdGFja1Nsb3QpOyB9XG4gICAgcmV0dXJuIHRoaXMudG9wU3RhY2tOYW1lKCk7XG4gIH0sXG4gIHRvcFN0YWNrTmFtZTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIFwic3RhY2tcIiArIHRoaXMuc3RhY2tTbG90O1xuICB9LFxuICBmbHVzaElubGluZTogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGlubGluZVN0YWNrID0gdGhpcy5pbmxpbmVTdGFjaztcbiAgICBpZiAoaW5saW5lU3RhY2subGVuZ3RoKSB7XG4gICAgICB0aGlzLmlubGluZVN0YWNrID0gW107XG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gaW5saW5lU3RhY2subGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgdmFyIGVudHJ5ID0gaW5saW5lU3RhY2tbaV07XG4gICAgICAgIGlmIChlbnRyeSBpbnN0YW5jZW9mIExpdGVyYWwpIHtcbiAgICAgICAgICB0aGlzLmNvbXBpbGVTdGFjay5wdXNoKGVudHJ5KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnB1c2hTdGFjayhlbnRyeSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIGlzSW5saW5lOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5pbmxpbmVTdGFjay5sZW5ndGg7XG4gIH0sXG5cbiAgcG9wU3RhY2s6IGZ1bmN0aW9uKHdyYXBwZWQpIHtcbiAgICB2YXIgaW5saW5lID0gdGhpcy5pc0lubGluZSgpLFxuICAgICAgICBpdGVtID0gKGlubGluZSA/IHRoaXMuaW5saW5lU3RhY2sgOiB0aGlzLmNvbXBpbGVTdGFjaykucG9wKCk7XG5cbiAgICBpZiAoIXdyYXBwZWQgJiYgKGl0ZW0gaW5zdGFuY2VvZiBMaXRlcmFsKSkge1xuICAgICAgcmV0dXJuIGl0ZW0udmFsdWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICghaW5saW5lKSB7XG4gICAgICAgIHRoaXMuc3RhY2tTbG90LS07XG4gICAgICB9XG4gICAgICByZXR1cm4gaXRlbTtcbiAgICB9XG4gIH0sXG5cbiAgdG9wU3RhY2s6IGZ1bmN0aW9uKHdyYXBwZWQpIHtcbiAgICB2YXIgc3RhY2sgPSAodGhpcy5pc0lubGluZSgpID8gdGhpcy5pbmxpbmVTdGFjayA6IHRoaXMuY29tcGlsZVN0YWNrKSxcbiAgICAgICAgaXRlbSA9IHN0YWNrW3N0YWNrLmxlbmd0aCAtIDFdO1xuXG4gICAgaWYgKCF3cmFwcGVkICYmIChpdGVtIGluc3RhbmNlb2YgTGl0ZXJhbCkpIHtcbiAgICAgIHJldHVybiBpdGVtLnZhbHVlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gaXRlbTtcbiAgICB9XG4gIH0sXG5cbiAgcXVvdGVkU3RyaW5nOiBmdW5jdGlvbihzdHIpIHtcbiAgICByZXR1cm4gJ1wiJyArIHN0clxuICAgICAgLnJlcGxhY2UoL1xcXFwvZywgJ1xcXFxcXFxcJylcbiAgICAgIC5yZXBsYWNlKC9cIi9nLCAnXFxcXFwiJylcbiAgICAgIC5yZXBsYWNlKC9cXG4vZywgJ1xcXFxuJylcbiAgICAgIC5yZXBsYWNlKC9cXHIvZywgJ1xcXFxyJylcbiAgICAgIC5yZXBsYWNlKC9cXHUyMDI4L2csICdcXFxcdTIwMjgnKSAgIC8vIFBlciBFY21hLTI2MiA3LjMgKyA3LjguNFxuICAgICAgLnJlcGxhY2UoL1xcdTIwMjkvZywgJ1xcXFx1MjAyOScpICsgJ1wiJztcbiAgfSxcblxuICBzZXR1cEhlbHBlcjogZnVuY3Rpb24ocGFyYW1TaXplLCBuYW1lLCBtaXNzaW5nUGFyYW1zKSB7XG4gICAgdmFyIHBhcmFtcyA9IFtdO1xuICAgIHRoaXMuc2V0dXBQYXJhbXMocGFyYW1TaXplLCBwYXJhbXMsIG1pc3NpbmdQYXJhbXMpO1xuICAgIHZhciBmb3VuZEhlbHBlciA9IHRoaXMubmFtZUxvb2t1cCgnaGVscGVycycsIG5hbWUsICdoZWxwZXInKTtcblxuICAgIHJldHVybiB7XG4gICAgICBwYXJhbXM6IHBhcmFtcyxcbiAgICAgIG5hbWU6IGZvdW5kSGVscGVyLFxuICAgICAgY2FsbFBhcmFtczogW1wiZGVwdGgwXCJdLmNvbmNhdChwYXJhbXMpLmpvaW4oXCIsIFwiKSxcbiAgICAgIGhlbHBlck1pc3NpbmdQYXJhbXM6IG1pc3NpbmdQYXJhbXMgJiYgW1wiZGVwdGgwXCIsIHRoaXMucXVvdGVkU3RyaW5nKG5hbWUpXS5jb25jYXQocGFyYW1zKS5qb2luKFwiLCBcIilcbiAgICB9O1xuICB9LFxuXG4gIC8vIHRoZSBwYXJhbXMgYW5kIGNvbnRleHRzIGFyZ3VtZW50cyBhcmUgcGFzc2VkIGluIGFycmF5c1xuICAvLyB0byBmaWxsIGluXG4gIHNldHVwUGFyYW1zOiBmdW5jdGlvbihwYXJhbVNpemUsIHBhcmFtcywgdXNlUmVnaXN0ZXIpIHtcbiAgICB2YXIgb3B0aW9ucyA9IFtdLCBjb250ZXh0cyA9IFtdLCB0eXBlcyA9IFtdLCBwYXJhbSwgaW52ZXJzZSwgcHJvZ3JhbTtcblxuICAgIG9wdGlvbnMucHVzaChcImhhc2g6XCIgKyB0aGlzLnBvcFN0YWNrKCkpO1xuXG4gICAgaW52ZXJzZSA9IHRoaXMucG9wU3RhY2soKTtcbiAgICBwcm9ncmFtID0gdGhpcy5wb3BTdGFjaygpO1xuXG4gICAgLy8gQXZvaWQgc2V0dGluZyBmbiBhbmQgaW52ZXJzZSBpZiBuZWl0aGVyIGFyZSBzZXQuIFRoaXMgYWxsb3dzXG4gICAgLy8gaGVscGVycyB0byBkbyBhIGNoZWNrIGZvciBgaWYgKG9wdGlvbnMuZm4pYFxuICAgIGlmIChwcm9ncmFtIHx8IGludmVyc2UpIHtcbiAgICAgIGlmICghcHJvZ3JhbSkge1xuICAgICAgICB0aGlzLmNvbnRleHQuYWxpYXNlcy5zZWxmID0gXCJ0aGlzXCI7XG4gICAgICAgIHByb2dyYW0gPSBcInNlbGYubm9vcFwiO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWludmVyc2UpIHtcbiAgICAgICB0aGlzLmNvbnRleHQuYWxpYXNlcy5zZWxmID0gXCJ0aGlzXCI7XG4gICAgICAgIGludmVyc2UgPSBcInNlbGYubm9vcFwiO1xuICAgICAgfVxuXG4gICAgICBvcHRpb25zLnB1c2goXCJpbnZlcnNlOlwiICsgaW52ZXJzZSk7XG4gICAgICBvcHRpb25zLnB1c2goXCJmbjpcIiArIHByb2dyYW0pO1xuICAgIH1cblxuICAgIGZvcih2YXIgaT0wOyBpPHBhcmFtU2l6ZTsgaSsrKSB7XG4gICAgICBwYXJhbSA9IHRoaXMucG9wU3RhY2soKTtcbiAgICAgIHBhcmFtcy5wdXNoKHBhcmFtKTtcblxuICAgICAgaWYodGhpcy5vcHRpb25zLnN0cmluZ1BhcmFtcykge1xuICAgICAgICB0eXBlcy5wdXNoKHRoaXMucG9wU3RhY2soKSk7XG4gICAgICAgIGNvbnRleHRzLnB1c2godGhpcy5wb3BTdGFjaygpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmluZ1BhcmFtcykge1xuICAgICAgb3B0aW9ucy5wdXNoKFwiY29udGV4dHM6W1wiICsgY29udGV4dHMuam9pbihcIixcIikgKyBcIl1cIik7XG4gICAgICBvcHRpb25zLnB1c2goXCJ0eXBlczpbXCIgKyB0eXBlcy5qb2luKFwiLFwiKSArIFwiXVwiKTtcbiAgICAgIG9wdGlvbnMucHVzaChcImhhc2hDb250ZXh0czpoYXNoQ29udGV4dHNcIik7XG4gICAgICBvcHRpb25zLnB1c2goXCJoYXNoVHlwZXM6aGFzaFR5cGVzXCIpO1xuICAgIH1cblxuICAgIGlmKHRoaXMub3B0aW9ucy5kYXRhKSB7XG4gICAgICBvcHRpb25zLnB1c2goXCJkYXRhOmRhdGFcIik7XG4gICAgfVxuXG4gICAgb3B0aW9ucyA9IFwie1wiICsgb3B0aW9ucy5qb2luKFwiLFwiKSArIFwifVwiO1xuICAgIGlmICh1c2VSZWdpc3Rlcikge1xuICAgICAgdGhpcy5yZWdpc3Rlcignb3B0aW9ucycsIG9wdGlvbnMpO1xuICAgICAgcGFyYW1zLnB1c2goJ29wdGlvbnMnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGFyYW1zLnB1c2gob3B0aW9ucyk7XG4gICAgfVxuICAgIHJldHVybiBwYXJhbXMuam9pbihcIiwgXCIpO1xuICB9XG59O1xuXG52YXIgcmVzZXJ2ZWRXb3JkcyA9IChcbiAgXCJicmVhayBlbHNlIG5ldyB2YXJcIiArXG4gIFwiIGNhc2UgZmluYWxseSByZXR1cm4gdm9pZFwiICtcbiAgXCIgY2F0Y2ggZm9yIHN3aXRjaCB3aGlsZVwiICtcbiAgXCIgY29udGludWUgZnVuY3Rpb24gdGhpcyB3aXRoXCIgK1xuICBcIiBkZWZhdWx0IGlmIHRocm93XCIgK1xuICBcIiBkZWxldGUgaW4gdHJ5XCIgK1xuICBcIiBkbyBpbnN0YW5jZW9mIHR5cGVvZlwiICtcbiAgXCIgYWJzdHJhY3QgZW51bSBpbnQgc2hvcnRcIiArXG4gIFwiIGJvb2xlYW4gZXhwb3J0IGludGVyZmFjZSBzdGF0aWNcIiArXG4gIFwiIGJ5dGUgZXh0ZW5kcyBsb25nIHN1cGVyXCIgK1xuICBcIiBjaGFyIGZpbmFsIG5hdGl2ZSBzeW5jaHJvbml6ZWRcIiArXG4gIFwiIGNsYXNzIGZsb2F0IHBhY2thZ2UgdGhyb3dzXCIgK1xuICBcIiBjb25zdCBnb3RvIHByaXZhdGUgdHJhbnNpZW50XCIgK1xuICBcIiBkZWJ1Z2dlciBpbXBsZW1lbnRzIHByb3RlY3RlZCB2b2xhdGlsZVwiICtcbiAgXCIgZG91YmxlIGltcG9ydCBwdWJsaWMgbGV0IHlpZWxkXCJcbikuc3BsaXQoXCIgXCIpO1xuXG52YXIgY29tcGlsZXJXb3JkcyA9IEphdmFTY3JpcHRDb21waWxlci5SRVNFUlZFRF9XT1JEUyA9IHt9O1xuXG5mb3IodmFyIGk9MCwgbD1yZXNlcnZlZFdvcmRzLmxlbmd0aDsgaTxsOyBpKyspIHtcbiAgY29tcGlsZXJXb3Jkc1tyZXNlcnZlZFdvcmRzW2ldXSA9IHRydWU7XG59XG5cbkphdmFTY3JpcHRDb21waWxlci5pc1ZhbGlkSmF2YVNjcmlwdFZhcmlhYmxlTmFtZSA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgaWYoIUphdmFTY3JpcHRDb21waWxlci5SRVNFUlZFRF9XT1JEU1tuYW1lXSAmJiAvXlthLXpBLVpfJF1bMC05YS16QS1aXyRdKyQvLnRlc3QobmFtZSkpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59O1xuXG5IYW5kbGViYXJzLnByZWNvbXBpbGUgPSBmdW5jdGlvbihpbnB1dCwgb3B0aW9ucykge1xuICBpZiAoaW5wdXQgPT0gbnVsbCB8fCAodHlwZW9mIGlucHV0ICE9PSAnc3RyaW5nJyAmJiBpbnB1dC5jb25zdHJ1Y3RvciAhPT0gSGFuZGxlYmFycy5BU1QuUHJvZ3JhbU5vZGUpKSB7XG4gICAgdGhyb3cgbmV3IEhhbmRsZWJhcnMuRXhjZXB0aW9uKFwiWW91IG11c3QgcGFzcyBhIHN0cmluZyBvciBIYW5kbGViYXJzIEFTVCB0byBIYW5kbGViYXJzLnByZWNvbXBpbGUuIFlvdSBwYXNzZWQgXCIgKyBpbnB1dCk7XG4gIH1cblxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgaWYgKCEoJ2RhdGEnIGluIG9wdGlvbnMpKSB7XG4gICAgb3B0aW9ucy5kYXRhID0gdHJ1ZTtcbiAgfVxuICB2YXIgYXN0ID0gSGFuZGxlYmFycy5wYXJzZShpbnB1dCk7XG4gIHZhciBlbnZpcm9ubWVudCA9IG5ldyBDb21waWxlcigpLmNvbXBpbGUoYXN0LCBvcHRpb25zKTtcbiAgcmV0dXJuIG5ldyBKYXZhU2NyaXB0Q29tcGlsZXIoKS5jb21waWxlKGVudmlyb25tZW50LCBvcHRpb25zKTtcbn07XG5cbkhhbmRsZWJhcnMuY29tcGlsZSA9IGZ1bmN0aW9uKGlucHV0LCBvcHRpb25zKSB7XG4gIGlmIChpbnB1dCA9PSBudWxsIHx8ICh0eXBlb2YgaW5wdXQgIT09ICdzdHJpbmcnICYmIGlucHV0LmNvbnN0cnVjdG9yICE9PSBIYW5kbGViYXJzLkFTVC5Qcm9ncmFtTm9kZSkpIHtcbiAgICB0aHJvdyBuZXcgSGFuZGxlYmFycy5FeGNlcHRpb24oXCJZb3UgbXVzdCBwYXNzIGEgc3RyaW5nIG9yIEhhbmRsZWJhcnMgQVNUIHRvIEhhbmRsZWJhcnMuY29tcGlsZS4gWW91IHBhc3NlZCBcIiArIGlucHV0KTtcbiAgfVxuXG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBpZiAoISgnZGF0YScgaW4gb3B0aW9ucykpIHtcbiAgICBvcHRpb25zLmRhdGEgPSB0cnVlO1xuICB9XG4gIHZhciBjb21waWxlZDtcbiAgZnVuY3Rpb24gY29tcGlsZSgpIHtcbiAgICB2YXIgYXN0ID0gSGFuZGxlYmFycy5wYXJzZShpbnB1dCk7XG4gICAgdmFyIGVudmlyb25tZW50ID0gbmV3IENvbXBpbGVyKCkuY29tcGlsZShhc3QsIG9wdGlvbnMpO1xuICAgIHZhciB0ZW1wbGF0ZVNwZWMgPSBuZXcgSmF2YVNjcmlwdENvbXBpbGVyKCkuY29tcGlsZShlbnZpcm9ubWVudCwgb3B0aW9ucywgdW5kZWZpbmVkLCB0cnVlKTtcbiAgICByZXR1cm4gSGFuZGxlYmFycy50ZW1wbGF0ZSh0ZW1wbGF0ZVNwZWMpO1xuICB9XG5cbiAgLy8gVGVtcGxhdGUgaXMgb25seSBjb21waWxlZCBvbiBmaXJzdCB1c2UgYW5kIGNhY2hlZCBhZnRlciB0aGF0IHBvaW50LlxuICByZXR1cm4gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIGlmICghY29tcGlsZWQpIHtcbiAgICAgIGNvbXBpbGVkID0gY29tcGlsZSgpO1xuICAgIH1cbiAgICByZXR1cm4gY29tcGlsZWQuY2FsbCh0aGlzLCBjb250ZXh0LCBvcHRpb25zKTtcbiAgfTtcbn07XG5cblxuLy8gRU5EKEJST1dTRVIpXG5cbnJldHVybiBIYW5kbGViYXJzO1xuXG59O1xuXG5cbiIsIi8vIEVhY2ggb2YgdGhlc2UgbW9kdWxlIHdpbGwgYXVnbWVudCB0aGUgSGFuZGxlYmFycyBvYmplY3QgYXMgaXQgbG9hZHMuIE5vIG5lZWQgdG8gcGVyZm9ybSBhZGRpdGlvbiBvcGVyYXRpb25zXG5tb2R1bGUuZXhwb3J0cy5hdHRhY2ggPSBmdW5jdGlvbihIYW5kbGViYXJzKSB7XG5cbnZhciB2aXNpdG9yID0gcmVxdWlyZShcIi4vdmlzaXRvclwiKSxcbiAgICBwcmludGVyID0gcmVxdWlyZShcIi4vcHJpbnRlclwiKSxcbiAgICBhc3QgPSByZXF1aXJlKFwiLi9hc3RcIiksXG4gICAgY29tcGlsZXIgPSByZXF1aXJlKFwiLi9jb21waWxlclwiKTtcblxudmlzaXRvci5hdHRhY2goSGFuZGxlYmFycyk7XG5wcmludGVyLmF0dGFjaChIYW5kbGViYXJzKTtcbmFzdC5hdHRhY2goSGFuZGxlYmFycyk7XG5jb21waWxlci5hdHRhY2goSGFuZGxlYmFycyk7XG5cbnJldHVybiBIYW5kbGViYXJzO1xuXG59O1xuIiwiLy8gQkVHSU4oQlJPV1NFUilcbi8qIEppc29uIGdlbmVyYXRlZCBwYXJzZXIgKi9cbnZhciBoYW5kbGViYXJzID0gKGZ1bmN0aW9uKCl7XG52YXIgcGFyc2VyID0ge3RyYWNlOiBmdW5jdGlvbiB0cmFjZSgpIHsgfSxcbnl5OiB7fSxcbnN5bWJvbHNfOiB7XCJlcnJvclwiOjIsXCJyb290XCI6MyxcInByb2dyYW1cIjo0LFwiRU9GXCI6NSxcInNpbXBsZUludmVyc2VcIjo2LFwic3RhdGVtZW50c1wiOjcsXCJzdGF0ZW1lbnRcIjo4LFwib3BlbkludmVyc2VcIjo5LFwiY2xvc2VCbG9ja1wiOjEwLFwib3BlbkJsb2NrXCI6MTEsXCJtdXN0YWNoZVwiOjEyLFwicGFydGlhbFwiOjEzLFwiQ09OVEVOVFwiOjE0LFwiQ09NTUVOVFwiOjE1LFwiT1BFTl9CTE9DS1wiOjE2LFwiaW5NdXN0YWNoZVwiOjE3LFwiQ0xPU0VcIjoxOCxcIk9QRU5fSU5WRVJTRVwiOjE5LFwiT1BFTl9FTkRCTE9DS1wiOjIwLFwicGF0aFwiOjIxLFwiT1BFTlwiOjIyLFwiT1BFTl9VTkVTQ0FQRURcIjoyMyxcIkNMT1NFX1VORVNDQVBFRFwiOjI0LFwiT1BFTl9QQVJUSUFMXCI6MjUsXCJwYXJ0aWFsTmFtZVwiOjI2LFwicGFyYW1zXCI6MjcsXCJoYXNoXCI6MjgsXCJkYXRhTmFtZVwiOjI5LFwicGFyYW1cIjozMCxcIlNUUklOR1wiOjMxLFwiSU5URUdFUlwiOjMyLFwiQk9PTEVBTlwiOjMzLFwiaGFzaFNlZ21lbnRzXCI6MzQsXCJoYXNoU2VnbWVudFwiOjM1LFwiSURcIjozNixcIkVRVUFMU1wiOjM3LFwiREFUQVwiOjM4LFwicGF0aFNlZ21lbnRzXCI6MzksXCJTRVBcIjo0MCxcIiRhY2NlcHRcIjowLFwiJGVuZFwiOjF9LFxudGVybWluYWxzXzogezI6XCJlcnJvclwiLDU6XCJFT0ZcIiwxNDpcIkNPTlRFTlRcIiwxNTpcIkNPTU1FTlRcIiwxNjpcIk9QRU5fQkxPQ0tcIiwxODpcIkNMT1NFXCIsMTk6XCJPUEVOX0lOVkVSU0VcIiwyMDpcIk9QRU5fRU5EQkxPQ0tcIiwyMjpcIk9QRU5cIiwyMzpcIk9QRU5fVU5FU0NBUEVEXCIsMjQ6XCJDTE9TRV9VTkVTQ0FQRURcIiwyNTpcIk9QRU5fUEFSVElBTFwiLDMxOlwiU1RSSU5HXCIsMzI6XCJJTlRFR0VSXCIsMzM6XCJCT09MRUFOXCIsMzY6XCJJRFwiLDM3OlwiRVFVQUxTXCIsMzg6XCJEQVRBXCIsNDA6XCJTRVBcIn0sXG5wcm9kdWN0aW9uc186IFswLFszLDJdLFs0LDJdLFs0LDNdLFs0LDJdLFs0LDFdLFs0LDFdLFs0LDBdLFs3LDFdLFs3LDJdLFs4LDNdLFs4LDNdLFs4LDFdLFs4LDFdLFs4LDFdLFs4LDFdLFsxMSwzXSxbOSwzXSxbMTAsM10sWzEyLDNdLFsxMiwzXSxbMTMsM10sWzEzLDRdLFs2LDJdLFsxNywzXSxbMTcsMl0sWzE3LDJdLFsxNywxXSxbMTcsMV0sWzI3LDJdLFsyNywxXSxbMzAsMV0sWzMwLDFdLFszMCwxXSxbMzAsMV0sWzMwLDFdLFsyOCwxXSxbMzQsMl0sWzM0LDFdLFszNSwzXSxbMzUsM10sWzM1LDNdLFszNSwzXSxbMzUsM10sWzI2LDFdLFsyNiwxXSxbMjYsMV0sWzI5LDJdLFsyMSwxXSxbMzksM10sWzM5LDFdXSxcbnBlcmZvcm1BY3Rpb246IGZ1bmN0aW9uIGFub255bW91cyh5eXRleHQseXlsZW5nLHl5bGluZW5vLHl5LHl5c3RhdGUsJCQsXyQpIHtcblxudmFyICQwID0gJCQubGVuZ3RoIC0gMTtcbnN3aXRjaCAoeXlzdGF0ZSkge1xuY2FzZSAxOiByZXR1cm4gJCRbJDAtMV07IFxuYnJlYWs7XG5jYXNlIDI6IHRoaXMuJCA9IG5ldyB5eS5Qcm9ncmFtTm9kZShbXSwgJCRbJDBdKTsgXG5icmVhaztcbmNhc2UgMzogdGhpcy4kID0gbmV3IHl5LlByb2dyYW1Ob2RlKCQkWyQwLTJdLCAkJFskMF0pOyBcbmJyZWFrO1xuY2FzZSA0OiB0aGlzLiQgPSBuZXcgeXkuUHJvZ3JhbU5vZGUoJCRbJDAtMV0sIFtdKTsgXG5icmVhaztcbmNhc2UgNTogdGhpcy4kID0gbmV3IHl5LlByb2dyYW1Ob2RlKCQkWyQwXSk7IFxuYnJlYWs7XG5jYXNlIDY6IHRoaXMuJCA9IG5ldyB5eS5Qcm9ncmFtTm9kZShbXSwgW10pOyBcbmJyZWFrO1xuY2FzZSA3OiB0aGlzLiQgPSBuZXcgeXkuUHJvZ3JhbU5vZGUoW10pOyBcbmJyZWFrO1xuY2FzZSA4OiB0aGlzLiQgPSBbJCRbJDBdXTsgXG5icmVhaztcbmNhc2UgOTogJCRbJDAtMV0ucHVzaCgkJFskMF0pOyB0aGlzLiQgPSAkJFskMC0xXTsgXG5icmVhaztcbmNhc2UgMTA6IHRoaXMuJCA9IG5ldyB5eS5CbG9ja05vZGUoJCRbJDAtMl0sICQkWyQwLTFdLmludmVyc2UsICQkWyQwLTFdLCAkJFskMF0pOyBcbmJyZWFrO1xuY2FzZSAxMTogdGhpcy4kID0gbmV3IHl5LkJsb2NrTm9kZSgkJFskMC0yXSwgJCRbJDAtMV0sICQkWyQwLTFdLmludmVyc2UsICQkWyQwXSk7IFxuYnJlYWs7XG5jYXNlIDEyOiB0aGlzLiQgPSAkJFskMF07IFxuYnJlYWs7XG5jYXNlIDEzOiB0aGlzLiQgPSAkJFskMF07IFxuYnJlYWs7XG5jYXNlIDE0OiB0aGlzLiQgPSBuZXcgeXkuQ29udGVudE5vZGUoJCRbJDBdKTsgXG5icmVhaztcbmNhc2UgMTU6IHRoaXMuJCA9IG5ldyB5eS5Db21tZW50Tm9kZSgkJFskMF0pOyBcbmJyZWFrO1xuY2FzZSAxNjogdGhpcy4kID0gbmV3IHl5Lk11c3RhY2hlTm9kZSgkJFskMC0xXVswXSwgJCRbJDAtMV1bMV0pOyBcbmJyZWFrO1xuY2FzZSAxNzogdGhpcy4kID0gbmV3IHl5Lk11c3RhY2hlTm9kZSgkJFskMC0xXVswXSwgJCRbJDAtMV1bMV0pOyBcbmJyZWFrO1xuY2FzZSAxODogdGhpcy4kID0gJCRbJDAtMV07IFxuYnJlYWs7XG5jYXNlIDE5OlxuICAgIC8vIFBhcnNpbmcgb3V0IHRoZSAnJicgZXNjYXBlIHRva2VuIGF0IHRoaXMgbGV2ZWwgc2F2ZXMgfjUwMCBieXRlcyBhZnRlciBtaW4gZHVlIHRvIHRoZSByZW1vdmFsIG9mIG9uZSBwYXJzZXIgbm9kZS5cbiAgICB0aGlzLiQgPSBuZXcgeXkuTXVzdGFjaGVOb2RlKCQkWyQwLTFdWzBdLCAkJFskMC0xXVsxXSwgJCRbJDAtMl1bMl0gPT09ICcmJyk7XG4gIFxuYnJlYWs7XG5jYXNlIDIwOiB0aGlzLiQgPSBuZXcgeXkuTXVzdGFjaGVOb2RlKCQkWyQwLTFdWzBdLCAkJFskMC0xXVsxXSwgdHJ1ZSk7IFxuYnJlYWs7XG5jYXNlIDIxOiB0aGlzLiQgPSBuZXcgeXkuUGFydGlhbE5vZGUoJCRbJDAtMV0pOyBcbmJyZWFrO1xuY2FzZSAyMjogdGhpcy4kID0gbmV3IHl5LlBhcnRpYWxOb2RlKCQkWyQwLTJdLCAkJFskMC0xXSk7IFxuYnJlYWs7XG5jYXNlIDIzOiBcbmJyZWFrO1xuY2FzZSAyNDogdGhpcy4kID0gW1skJFskMC0yXV0uY29uY2F0KCQkWyQwLTFdKSwgJCRbJDBdXTsgXG5icmVhaztcbmNhc2UgMjU6IHRoaXMuJCA9IFtbJCRbJDAtMV1dLmNvbmNhdCgkJFskMF0pLCBudWxsXTsgXG5icmVhaztcbmNhc2UgMjY6IHRoaXMuJCA9IFtbJCRbJDAtMV1dLCAkJFskMF1dOyBcbmJyZWFrO1xuY2FzZSAyNzogdGhpcy4kID0gW1skJFskMF1dLCBudWxsXTsgXG5icmVhaztcbmNhc2UgMjg6IHRoaXMuJCA9IFtbJCRbJDBdXSwgbnVsbF07IFxuYnJlYWs7XG5jYXNlIDI5OiAkJFskMC0xXS5wdXNoKCQkWyQwXSk7IHRoaXMuJCA9ICQkWyQwLTFdOyBcbmJyZWFrO1xuY2FzZSAzMDogdGhpcy4kID0gWyQkWyQwXV07IFxuYnJlYWs7XG5jYXNlIDMxOiB0aGlzLiQgPSAkJFskMF07IFxuYnJlYWs7XG5jYXNlIDMyOiB0aGlzLiQgPSBuZXcgeXkuU3RyaW5nTm9kZSgkJFskMF0pOyBcbmJyZWFrO1xuY2FzZSAzMzogdGhpcy4kID0gbmV3IHl5LkludGVnZXJOb2RlKCQkWyQwXSk7IFxuYnJlYWs7XG5jYXNlIDM0OiB0aGlzLiQgPSBuZXcgeXkuQm9vbGVhbk5vZGUoJCRbJDBdKTsgXG5icmVhaztcbmNhc2UgMzU6IHRoaXMuJCA9ICQkWyQwXTsgXG5icmVhaztcbmNhc2UgMzY6IHRoaXMuJCA9IG5ldyB5eS5IYXNoTm9kZSgkJFskMF0pOyBcbmJyZWFrO1xuY2FzZSAzNzogJCRbJDAtMV0ucHVzaCgkJFskMF0pOyB0aGlzLiQgPSAkJFskMC0xXTsgXG5icmVhaztcbmNhc2UgMzg6IHRoaXMuJCA9IFskJFskMF1dOyBcbmJyZWFrO1xuY2FzZSAzOTogdGhpcy4kID0gWyQkWyQwLTJdLCAkJFskMF1dOyBcbmJyZWFrO1xuY2FzZSA0MDogdGhpcy4kID0gWyQkWyQwLTJdLCBuZXcgeXkuU3RyaW5nTm9kZSgkJFskMF0pXTsgXG5icmVhaztcbmNhc2UgNDE6IHRoaXMuJCA9IFskJFskMC0yXSwgbmV3IHl5LkludGVnZXJOb2RlKCQkWyQwXSldOyBcbmJyZWFrO1xuY2FzZSA0MjogdGhpcy4kID0gWyQkWyQwLTJdLCBuZXcgeXkuQm9vbGVhbk5vZGUoJCRbJDBdKV07IFxuYnJlYWs7XG5jYXNlIDQzOiB0aGlzLiQgPSBbJCRbJDAtMl0sICQkWyQwXV07IFxuYnJlYWs7XG5jYXNlIDQ0OiB0aGlzLiQgPSBuZXcgeXkuUGFydGlhbE5hbWVOb2RlKCQkWyQwXSk7IFxuYnJlYWs7XG5jYXNlIDQ1OiB0aGlzLiQgPSBuZXcgeXkuUGFydGlhbE5hbWVOb2RlKG5ldyB5eS5TdHJpbmdOb2RlKCQkWyQwXSkpOyBcbmJyZWFrO1xuY2FzZSA0NjogdGhpcy4kID0gbmV3IHl5LlBhcnRpYWxOYW1lTm9kZShuZXcgeXkuSW50ZWdlck5vZGUoJCRbJDBdKSk7IFxuYnJlYWs7XG5jYXNlIDQ3OiB0aGlzLiQgPSBuZXcgeXkuRGF0YU5vZGUoJCRbJDBdKTsgXG5icmVhaztcbmNhc2UgNDg6IHRoaXMuJCA9IG5ldyB5eS5JZE5vZGUoJCRbJDBdKTsgXG5icmVhaztcbmNhc2UgNDk6ICQkWyQwLTJdLnB1c2goe3BhcnQ6ICQkWyQwXSwgc2VwYXJhdG9yOiAkJFskMC0xXX0pOyB0aGlzLiQgPSAkJFskMC0yXTsgXG5icmVhaztcbmNhc2UgNTA6IHRoaXMuJCA9IFt7cGFydDogJCRbJDBdfV07IFxuYnJlYWs7XG59XG59LFxudGFibGU6IFt7MzoxLDQ6Miw1OlsyLDddLDY6Myw3OjQsODo2LDk6NywxMTo4LDEyOjksMTM6MTAsMTQ6WzEsMTFdLDE1OlsxLDEyXSwxNjpbMSwxM10sMTk6WzEsNV0sMjI6WzEsMTRdLDIzOlsxLDE1XSwyNTpbMSwxNl19LHsxOlszXX0sezU6WzEsMTddfSx7NTpbMiw2XSw3OjE4LDg6Niw5OjcsMTE6OCwxMjo5LDEzOjEwLDE0OlsxLDExXSwxNTpbMSwxMl0sMTY6WzEsMTNdLDE5OlsxLDE5XSwyMDpbMiw2XSwyMjpbMSwxNF0sMjM6WzEsMTVdLDI1OlsxLDE2XX0sezU6WzIsNV0sNjoyMCw4OjIxLDk6NywxMTo4LDEyOjksMTM6MTAsMTQ6WzEsMTFdLDE1OlsxLDEyXSwxNjpbMSwxM10sMTk6WzEsNV0sMjA6WzIsNV0sMjI6WzEsMTRdLDIzOlsxLDE1XSwyNTpbMSwxNl19LHsxNzoyMywxODpbMSwyMl0sMjE6MjQsMjk6MjUsMzY6WzEsMjhdLDM4OlsxLDI3XSwzOToyNn0sezU6WzIsOF0sMTQ6WzIsOF0sMTU6WzIsOF0sMTY6WzIsOF0sMTk6WzIsOF0sMjA6WzIsOF0sMjI6WzIsOF0sMjM6WzIsOF0sMjU6WzIsOF19LHs0OjI5LDY6Myw3OjQsODo2LDk6NywxMTo4LDEyOjksMTM6MTAsMTQ6WzEsMTFdLDE1OlsxLDEyXSwxNjpbMSwxM10sMTk6WzEsNV0sMjA6WzIsN10sMjI6WzEsMTRdLDIzOlsxLDE1XSwyNTpbMSwxNl19LHs0OjMwLDY6Myw3OjQsODo2LDk6NywxMTo4LDEyOjksMTM6MTAsMTQ6WzEsMTFdLDE1OlsxLDEyXSwxNjpbMSwxM10sMTk6WzEsNV0sMjA6WzIsN10sMjI6WzEsMTRdLDIzOlsxLDE1XSwyNTpbMSwxNl19LHs1OlsyLDEyXSwxNDpbMiwxMl0sMTU6WzIsMTJdLDE2OlsyLDEyXSwxOTpbMiwxMl0sMjA6WzIsMTJdLDIyOlsyLDEyXSwyMzpbMiwxMl0sMjU6WzIsMTJdfSx7NTpbMiwxM10sMTQ6WzIsMTNdLDE1OlsyLDEzXSwxNjpbMiwxM10sMTk6WzIsMTNdLDIwOlsyLDEzXSwyMjpbMiwxM10sMjM6WzIsMTNdLDI1OlsyLDEzXX0sezU6WzIsMTRdLDE0OlsyLDE0XSwxNTpbMiwxNF0sMTY6WzIsMTRdLDE5OlsyLDE0XSwyMDpbMiwxNF0sMjI6WzIsMTRdLDIzOlsyLDE0XSwyNTpbMiwxNF19LHs1OlsyLDE1XSwxNDpbMiwxNV0sMTU6WzIsMTVdLDE2OlsyLDE1XSwxOTpbMiwxNV0sMjA6WzIsMTVdLDIyOlsyLDE1XSwyMzpbMiwxNV0sMjU6WzIsMTVdfSx7MTc6MzEsMjE6MjQsMjk6MjUsMzY6WzEsMjhdLDM4OlsxLDI3XSwzOToyNn0sezE3OjMyLDIxOjI0LDI5OjI1LDM2OlsxLDI4XSwzODpbMSwyN10sMzk6MjZ9LHsxNzozMywyMToyNCwyOToyNSwzNjpbMSwyOF0sMzg6WzEsMjddLDM5OjI2fSx7MjE6MzUsMjY6MzQsMzE6WzEsMzZdLDMyOlsxLDM3XSwzNjpbMSwyOF0sMzk6MjZ9LHsxOlsyLDFdfSx7NTpbMiwyXSw4OjIxLDk6NywxMTo4LDEyOjksMTM6MTAsMTQ6WzEsMTFdLDE1OlsxLDEyXSwxNjpbMSwxM10sMTk6WzEsMTldLDIwOlsyLDJdLDIyOlsxLDE0XSwyMzpbMSwxNV0sMjU6WzEsMTZdfSx7MTc6MjMsMjE6MjQsMjk6MjUsMzY6WzEsMjhdLDM4OlsxLDI3XSwzOToyNn0sezU6WzIsNF0sNzozOCw4OjYsOTo3LDExOjgsMTI6OSwxMzoxMCwxNDpbMSwxMV0sMTU6WzEsMTJdLDE2OlsxLDEzXSwxOTpbMSwxOV0sMjA6WzIsNF0sMjI6WzEsMTRdLDIzOlsxLDE1XSwyNTpbMSwxNl19LHs1OlsyLDldLDE0OlsyLDldLDE1OlsyLDldLDE2OlsyLDldLDE5OlsyLDldLDIwOlsyLDldLDIyOlsyLDldLDIzOlsyLDldLDI1OlsyLDldfSx7NTpbMiwyM10sMTQ6WzIsMjNdLDE1OlsyLDIzXSwxNjpbMiwyM10sMTk6WzIsMjNdLDIwOlsyLDIzXSwyMjpbMiwyM10sMjM6WzIsMjNdLDI1OlsyLDIzXX0sezE4OlsxLDM5XX0sezE4OlsyLDI3XSwyMTo0NCwyNDpbMiwyN10sMjc6NDAsMjg6NDEsMjk6NDgsMzA6NDIsMzE6WzEsNDVdLDMyOlsxLDQ2XSwzMzpbMSw0N10sMzQ6NDMsMzU6NDksMzY6WzEsNTBdLDM4OlsxLDI3XSwzOToyNn0sezE4OlsyLDI4XSwyNDpbMiwyOF19LHsxODpbMiw0OF0sMjQ6WzIsNDhdLDMxOlsyLDQ4XSwzMjpbMiw0OF0sMzM6WzIsNDhdLDM2OlsyLDQ4XSwzODpbMiw0OF0sNDA6WzEsNTFdfSx7MjE6NTIsMzY6WzEsMjhdLDM5OjI2fSx7MTg6WzIsNTBdLDI0OlsyLDUwXSwzMTpbMiw1MF0sMzI6WzIsNTBdLDMzOlsyLDUwXSwzNjpbMiw1MF0sMzg6WzIsNTBdLDQwOlsyLDUwXX0sezEwOjUzLDIwOlsxLDU0XX0sezEwOjU1LDIwOlsxLDU0XX0sezE4OlsxLDU2XX0sezE4OlsxLDU3XX0sezI0OlsxLDU4XX0sezE4OlsxLDU5XSwyMTo2MCwzNjpbMSwyOF0sMzk6MjZ9LHsxODpbMiw0NF0sMzY6WzIsNDRdfSx7MTg6WzIsNDVdLDM2OlsyLDQ1XX0sezE4OlsyLDQ2XSwzNjpbMiw0Nl19LHs1OlsyLDNdLDg6MjEsOTo3LDExOjgsMTI6OSwxMzoxMCwxNDpbMSwxMV0sMTU6WzEsMTJdLDE2OlsxLDEzXSwxOTpbMSwxOV0sMjA6WzIsM10sMjI6WzEsMTRdLDIzOlsxLDE1XSwyNTpbMSwxNl19LHsxNDpbMiwxN10sMTU6WzIsMTddLDE2OlsyLDE3XSwxOTpbMiwxN10sMjA6WzIsMTddLDIyOlsyLDE3XSwyMzpbMiwxN10sMjU6WzIsMTddfSx7MTg6WzIsMjVdLDIxOjQ0LDI0OlsyLDI1XSwyODo2MSwyOTo0OCwzMDo2MiwzMTpbMSw0NV0sMzI6WzEsNDZdLDMzOlsxLDQ3XSwzNDo0MywzNTo0OSwzNjpbMSw1MF0sMzg6WzEsMjddLDM5OjI2fSx7MTg6WzIsMjZdLDI0OlsyLDI2XX0sezE4OlsyLDMwXSwyNDpbMiwzMF0sMzE6WzIsMzBdLDMyOlsyLDMwXSwzMzpbMiwzMF0sMzY6WzIsMzBdLDM4OlsyLDMwXX0sezE4OlsyLDM2XSwyNDpbMiwzNl0sMzU6NjMsMzY6WzEsNjRdfSx7MTg6WzIsMzFdLDI0OlsyLDMxXSwzMTpbMiwzMV0sMzI6WzIsMzFdLDMzOlsyLDMxXSwzNjpbMiwzMV0sMzg6WzIsMzFdfSx7MTg6WzIsMzJdLDI0OlsyLDMyXSwzMTpbMiwzMl0sMzI6WzIsMzJdLDMzOlsyLDMyXSwzNjpbMiwzMl0sMzg6WzIsMzJdfSx7MTg6WzIsMzNdLDI0OlsyLDMzXSwzMTpbMiwzM10sMzI6WzIsMzNdLDMzOlsyLDMzXSwzNjpbMiwzM10sMzg6WzIsMzNdfSx7MTg6WzIsMzRdLDI0OlsyLDM0XSwzMTpbMiwzNF0sMzI6WzIsMzRdLDMzOlsyLDM0XSwzNjpbMiwzNF0sMzg6WzIsMzRdfSx7MTg6WzIsMzVdLDI0OlsyLDM1XSwzMTpbMiwzNV0sMzI6WzIsMzVdLDMzOlsyLDM1XSwzNjpbMiwzNV0sMzg6WzIsMzVdfSx7MTg6WzIsMzhdLDI0OlsyLDM4XSwzNjpbMiwzOF19LHsxODpbMiw1MF0sMjQ6WzIsNTBdLDMxOlsyLDUwXSwzMjpbMiw1MF0sMzM6WzIsNTBdLDM2OlsyLDUwXSwzNzpbMSw2NV0sMzg6WzIsNTBdLDQwOlsyLDUwXX0sezM2OlsxLDY2XX0sezE4OlsyLDQ3XSwyNDpbMiw0N10sMzE6WzIsNDddLDMyOlsyLDQ3XSwzMzpbMiw0N10sMzY6WzIsNDddLDM4OlsyLDQ3XX0sezU6WzIsMTBdLDE0OlsyLDEwXSwxNTpbMiwxMF0sMTY6WzIsMTBdLDE5OlsyLDEwXSwyMDpbMiwxMF0sMjI6WzIsMTBdLDIzOlsyLDEwXSwyNTpbMiwxMF19LHsyMTo2NywzNjpbMSwyOF0sMzk6MjZ9LHs1OlsyLDExXSwxNDpbMiwxMV0sMTU6WzIsMTFdLDE2OlsyLDExXSwxOTpbMiwxMV0sMjA6WzIsMTFdLDIyOlsyLDExXSwyMzpbMiwxMV0sMjU6WzIsMTFdfSx7MTQ6WzIsMTZdLDE1OlsyLDE2XSwxNjpbMiwxNl0sMTk6WzIsMTZdLDIwOlsyLDE2XSwyMjpbMiwxNl0sMjM6WzIsMTZdLDI1OlsyLDE2XX0sezU6WzIsMTldLDE0OlsyLDE5XSwxNTpbMiwxOV0sMTY6WzIsMTldLDE5OlsyLDE5XSwyMDpbMiwxOV0sMjI6WzIsMTldLDIzOlsyLDE5XSwyNTpbMiwxOV19LHs1OlsyLDIwXSwxNDpbMiwyMF0sMTU6WzIsMjBdLDE2OlsyLDIwXSwxOTpbMiwyMF0sMjA6WzIsMjBdLDIyOlsyLDIwXSwyMzpbMiwyMF0sMjU6WzIsMjBdfSx7NTpbMiwyMV0sMTQ6WzIsMjFdLDE1OlsyLDIxXSwxNjpbMiwyMV0sMTk6WzIsMjFdLDIwOlsyLDIxXSwyMjpbMiwyMV0sMjM6WzIsMjFdLDI1OlsyLDIxXX0sezE4OlsxLDY4XX0sezE4OlsyLDI0XSwyNDpbMiwyNF19LHsxODpbMiwyOV0sMjQ6WzIsMjldLDMxOlsyLDI5XSwzMjpbMiwyOV0sMzM6WzIsMjldLDM2OlsyLDI5XSwzODpbMiwyOV19LHsxODpbMiwzN10sMjQ6WzIsMzddLDM2OlsyLDM3XX0sezM3OlsxLDY1XX0sezIxOjY5LDI5OjczLDMxOlsxLDcwXSwzMjpbMSw3MV0sMzM6WzEsNzJdLDM2OlsxLDI4XSwzODpbMSwyN10sMzk6MjZ9LHsxODpbMiw0OV0sMjQ6WzIsNDldLDMxOlsyLDQ5XSwzMjpbMiw0OV0sMzM6WzIsNDldLDM2OlsyLDQ5XSwzODpbMiw0OV0sNDA6WzIsNDldfSx7MTg6WzEsNzRdfSx7NTpbMiwyMl0sMTQ6WzIsMjJdLDE1OlsyLDIyXSwxNjpbMiwyMl0sMTk6WzIsMjJdLDIwOlsyLDIyXSwyMjpbMiwyMl0sMjM6WzIsMjJdLDI1OlsyLDIyXX0sezE4OlsyLDM5XSwyNDpbMiwzOV0sMzY6WzIsMzldfSx7MTg6WzIsNDBdLDI0OlsyLDQwXSwzNjpbMiw0MF19LHsxODpbMiw0MV0sMjQ6WzIsNDFdLDM2OlsyLDQxXX0sezE4OlsyLDQyXSwyNDpbMiw0Ml0sMzY6WzIsNDJdfSx7MTg6WzIsNDNdLDI0OlsyLDQzXSwzNjpbMiw0M119LHs1OlsyLDE4XSwxNDpbMiwxOF0sMTU6WzIsMThdLDE2OlsyLDE4XSwxOTpbMiwxOF0sMjA6WzIsMThdLDIyOlsyLDE4XSwyMzpbMiwxOF0sMjU6WzIsMThdfV0sXG5kZWZhdWx0QWN0aW9uczogezE3OlsyLDFdfSxcbnBhcnNlRXJyb3I6IGZ1bmN0aW9uIHBhcnNlRXJyb3Ioc3RyLCBoYXNoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKHN0cik7XG59LFxucGFyc2U6IGZ1bmN0aW9uIHBhcnNlKGlucHV0KSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzLCBzdGFjayA9IFswXSwgdnN0YWNrID0gW251bGxdLCBsc3RhY2sgPSBbXSwgdGFibGUgPSB0aGlzLnRhYmxlLCB5eXRleHQgPSBcIlwiLCB5eWxpbmVubyA9IDAsIHl5bGVuZyA9IDAsIHJlY292ZXJpbmcgPSAwLCBURVJST1IgPSAyLCBFT0YgPSAxO1xuICAgIHRoaXMubGV4ZXIuc2V0SW5wdXQoaW5wdXQpO1xuICAgIHRoaXMubGV4ZXIueXkgPSB0aGlzLnl5O1xuICAgIHRoaXMueXkubGV4ZXIgPSB0aGlzLmxleGVyO1xuICAgIHRoaXMueXkucGFyc2VyID0gdGhpcztcbiAgICBpZiAodHlwZW9mIHRoaXMubGV4ZXIueXlsbG9jID09IFwidW5kZWZpbmVkXCIpXG4gICAgICAgIHRoaXMubGV4ZXIueXlsbG9jID0ge307XG4gICAgdmFyIHl5bG9jID0gdGhpcy5sZXhlci55eWxsb2M7XG4gICAgbHN0YWNrLnB1c2goeXlsb2MpO1xuICAgIHZhciByYW5nZXMgPSB0aGlzLmxleGVyLm9wdGlvbnMgJiYgdGhpcy5sZXhlci5vcHRpb25zLnJhbmdlcztcbiAgICBpZiAodHlwZW9mIHRoaXMueXkucGFyc2VFcnJvciA9PT0gXCJmdW5jdGlvblwiKVxuICAgICAgICB0aGlzLnBhcnNlRXJyb3IgPSB0aGlzLnl5LnBhcnNlRXJyb3I7XG4gICAgZnVuY3Rpb24gcG9wU3RhY2sobikge1xuICAgICAgICBzdGFjay5sZW5ndGggPSBzdGFjay5sZW5ndGggLSAyICogbjtcbiAgICAgICAgdnN0YWNrLmxlbmd0aCA9IHZzdGFjay5sZW5ndGggLSBuO1xuICAgICAgICBsc3RhY2subGVuZ3RoID0gbHN0YWNrLmxlbmd0aCAtIG47XG4gICAgfVxuICAgIGZ1bmN0aW9uIGxleCgpIHtcbiAgICAgICAgdmFyIHRva2VuO1xuICAgICAgICB0b2tlbiA9IHNlbGYubGV4ZXIubGV4KCkgfHwgMTtcbiAgICAgICAgaWYgKHR5cGVvZiB0b2tlbiAhPT0gXCJudW1iZXJcIikge1xuICAgICAgICAgICAgdG9rZW4gPSBzZWxmLnN5bWJvbHNfW3Rva2VuXSB8fCB0b2tlbjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdG9rZW47XG4gICAgfVxuICAgIHZhciBzeW1ib2wsIHByZUVycm9yU3ltYm9sLCBzdGF0ZSwgYWN0aW9uLCBhLCByLCB5eXZhbCA9IHt9LCBwLCBsZW4sIG5ld1N0YXRlLCBleHBlY3RlZDtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICBzdGF0ZSA9IHN0YWNrW3N0YWNrLmxlbmd0aCAtIDFdO1xuICAgICAgICBpZiAodGhpcy5kZWZhdWx0QWN0aW9uc1tzdGF0ZV0pIHtcbiAgICAgICAgICAgIGFjdGlvbiA9IHRoaXMuZGVmYXVsdEFjdGlvbnNbc3RhdGVdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHN5bWJvbCA9PT0gbnVsbCB8fCB0eXBlb2Ygc3ltYm9sID09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgICAgICBzeW1ib2wgPSBsZXgoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGFjdGlvbiA9IHRhYmxlW3N0YXRlXSAmJiB0YWJsZVtzdGF0ZV1bc3ltYm9sXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIGFjdGlvbiA9PT0gXCJ1bmRlZmluZWRcIiB8fCAhYWN0aW9uLmxlbmd0aCB8fCAhYWN0aW9uWzBdKSB7XG4gICAgICAgICAgICB2YXIgZXJyU3RyID0gXCJcIjtcbiAgICAgICAgICAgIGlmICghcmVjb3ZlcmluZykge1xuICAgICAgICAgICAgICAgIGV4cGVjdGVkID0gW107XG4gICAgICAgICAgICAgICAgZm9yIChwIGluIHRhYmxlW3N0YXRlXSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudGVybWluYWxzX1twXSAmJiBwID4gMikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0ZWQucHVzaChcIidcIiArIHRoaXMudGVybWluYWxzX1twXSArIFwiJ1wiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmxleGVyLnNob3dQb3NpdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBlcnJTdHIgPSBcIlBhcnNlIGVycm9yIG9uIGxpbmUgXCIgKyAoeXlsaW5lbm8gKyAxKSArIFwiOlxcblwiICsgdGhpcy5sZXhlci5zaG93UG9zaXRpb24oKSArIFwiXFxuRXhwZWN0aW5nIFwiICsgZXhwZWN0ZWQuam9pbihcIiwgXCIpICsgXCIsIGdvdCAnXCIgKyAodGhpcy50ZXJtaW5hbHNfW3N5bWJvbF0gfHwgc3ltYm9sKSArIFwiJ1wiO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGVyclN0ciA9IFwiUGFyc2UgZXJyb3Igb24gbGluZSBcIiArICh5eWxpbmVubyArIDEpICsgXCI6IFVuZXhwZWN0ZWQgXCIgKyAoc3ltYm9sID09IDE/XCJlbmQgb2YgaW5wdXRcIjpcIidcIiArICh0aGlzLnRlcm1pbmFsc19bc3ltYm9sXSB8fCBzeW1ib2wpICsgXCInXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLnBhcnNlRXJyb3IoZXJyU3RyLCB7dGV4dDogdGhpcy5sZXhlci5tYXRjaCwgdG9rZW46IHRoaXMudGVybWluYWxzX1tzeW1ib2xdIHx8IHN5bWJvbCwgbGluZTogdGhpcy5sZXhlci55eWxpbmVubywgbG9jOiB5eWxvYywgZXhwZWN0ZWQ6IGV4cGVjdGVkfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGFjdGlvblswXSBpbnN0YW5jZW9mIEFycmF5ICYmIGFjdGlvbi5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJQYXJzZSBFcnJvcjogbXVsdGlwbGUgYWN0aW9ucyBwb3NzaWJsZSBhdCBzdGF0ZTogXCIgKyBzdGF0ZSArIFwiLCB0b2tlbjogXCIgKyBzeW1ib2wpO1xuICAgICAgICB9XG4gICAgICAgIHN3aXRjaCAoYWN0aW9uWzBdKSB7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgIHN0YWNrLnB1c2goc3ltYm9sKTtcbiAgICAgICAgICAgIHZzdGFjay5wdXNoKHRoaXMubGV4ZXIueXl0ZXh0KTtcbiAgICAgICAgICAgIGxzdGFjay5wdXNoKHRoaXMubGV4ZXIueXlsbG9jKTtcbiAgICAgICAgICAgIHN0YWNrLnB1c2goYWN0aW9uWzFdKTtcbiAgICAgICAgICAgIHN5bWJvbCA9IG51bGw7XG4gICAgICAgICAgICBpZiAoIXByZUVycm9yU3ltYm9sKSB7XG4gICAgICAgICAgICAgICAgeXlsZW5nID0gdGhpcy5sZXhlci55eWxlbmc7XG4gICAgICAgICAgICAgICAgeXl0ZXh0ID0gdGhpcy5sZXhlci55eXRleHQ7XG4gICAgICAgICAgICAgICAgeXlsaW5lbm8gPSB0aGlzLmxleGVyLnl5bGluZW5vO1xuICAgICAgICAgICAgICAgIHl5bG9jID0gdGhpcy5sZXhlci55eWxsb2M7XG4gICAgICAgICAgICAgICAgaWYgKHJlY292ZXJpbmcgPiAwKVxuICAgICAgICAgICAgICAgICAgICByZWNvdmVyaW5nLS07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHN5bWJvbCA9IHByZUVycm9yU3ltYm9sO1xuICAgICAgICAgICAgICAgIHByZUVycm9yU3ltYm9sID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICBsZW4gPSB0aGlzLnByb2R1Y3Rpb25zX1thY3Rpb25bMV1dWzFdO1xuICAgICAgICAgICAgeXl2YWwuJCA9IHZzdGFja1t2c3RhY2subGVuZ3RoIC0gbGVuXTtcbiAgICAgICAgICAgIHl5dmFsLl8kID0ge2ZpcnN0X2xpbmU6IGxzdGFja1tsc3RhY2subGVuZ3RoIC0gKGxlbiB8fCAxKV0uZmlyc3RfbGluZSwgbGFzdF9saW5lOiBsc3RhY2tbbHN0YWNrLmxlbmd0aCAtIDFdLmxhc3RfbGluZSwgZmlyc3RfY29sdW1uOiBsc3RhY2tbbHN0YWNrLmxlbmd0aCAtIChsZW4gfHwgMSldLmZpcnN0X2NvbHVtbiwgbGFzdF9jb2x1bW46IGxzdGFja1tsc3RhY2subGVuZ3RoIC0gMV0ubGFzdF9jb2x1bW59O1xuICAgICAgICAgICAgaWYgKHJhbmdlcykge1xuICAgICAgICAgICAgICAgIHl5dmFsLl8kLnJhbmdlID0gW2xzdGFja1tsc3RhY2subGVuZ3RoIC0gKGxlbiB8fCAxKV0ucmFuZ2VbMF0sIGxzdGFja1tsc3RhY2subGVuZ3RoIC0gMV0ucmFuZ2VbMV1dO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgciA9IHRoaXMucGVyZm9ybUFjdGlvbi5jYWxsKHl5dmFsLCB5eXRleHQsIHl5bGVuZywgeXlsaW5lbm8sIHRoaXMueXksIGFjdGlvblsxXSwgdnN0YWNrLCBsc3RhY2spO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiByICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobGVuKSB7XG4gICAgICAgICAgICAgICAgc3RhY2sgPSBzdGFjay5zbGljZSgwLCAtMSAqIGxlbiAqIDIpO1xuICAgICAgICAgICAgICAgIHZzdGFjayA9IHZzdGFjay5zbGljZSgwLCAtMSAqIGxlbik7XG4gICAgICAgICAgICAgICAgbHN0YWNrID0gbHN0YWNrLnNsaWNlKDAsIC0xICogbGVuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN0YWNrLnB1c2godGhpcy5wcm9kdWN0aW9uc19bYWN0aW9uWzFdXVswXSk7XG4gICAgICAgICAgICB2c3RhY2sucHVzaCh5eXZhbC4kKTtcbiAgICAgICAgICAgIGxzdGFjay5wdXNoKHl5dmFsLl8kKTtcbiAgICAgICAgICAgIG5ld1N0YXRlID0gdGFibGVbc3RhY2tbc3RhY2subGVuZ3RoIC0gMl1dW3N0YWNrW3N0YWNrLmxlbmd0aCAtIDFdXTtcbiAgICAgICAgICAgIHN0YWNrLnB1c2gobmV3U3RhdGUpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufVxufTtcbi8qIEppc29uIGdlbmVyYXRlZCBsZXhlciAqL1xudmFyIGxleGVyID0gKGZ1bmN0aW9uKCl7XG52YXIgbGV4ZXIgPSAoe0VPRjoxLFxucGFyc2VFcnJvcjpmdW5jdGlvbiBwYXJzZUVycm9yKHN0ciwgaGFzaCkge1xuICAgICAgICBpZiAodGhpcy55eS5wYXJzZXIpIHtcbiAgICAgICAgICAgIHRoaXMueXkucGFyc2VyLnBhcnNlRXJyb3Ioc3RyLCBoYXNoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihzdHIpO1xuICAgICAgICB9XG4gICAgfSxcbnNldElucHV0OmZ1bmN0aW9uIChpbnB1dCkge1xuICAgICAgICB0aGlzLl9pbnB1dCA9IGlucHV0O1xuICAgICAgICB0aGlzLl9tb3JlID0gdGhpcy5fbGVzcyA9IHRoaXMuZG9uZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLnl5bGluZW5vID0gdGhpcy55eWxlbmcgPSAwO1xuICAgICAgICB0aGlzLnl5dGV4dCA9IHRoaXMubWF0Y2hlZCA9IHRoaXMubWF0Y2ggPSAnJztcbiAgICAgICAgdGhpcy5jb25kaXRpb25TdGFjayA9IFsnSU5JVElBTCddO1xuICAgICAgICB0aGlzLnl5bGxvYyA9IHtmaXJzdF9saW5lOjEsZmlyc3RfY29sdW1uOjAsbGFzdF9saW5lOjEsbGFzdF9jb2x1bW46MH07XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMucmFuZ2VzKSB0aGlzLnl5bGxvYy5yYW5nZSA9IFswLDBdO1xuICAgICAgICB0aGlzLm9mZnNldCA9IDA7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5pbnB1dDpmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBjaCA9IHRoaXMuX2lucHV0WzBdO1xuICAgICAgICB0aGlzLnl5dGV4dCArPSBjaDtcbiAgICAgICAgdGhpcy55eWxlbmcrKztcbiAgICAgICAgdGhpcy5vZmZzZXQrKztcbiAgICAgICAgdGhpcy5tYXRjaCArPSBjaDtcbiAgICAgICAgdGhpcy5tYXRjaGVkICs9IGNoO1xuICAgICAgICB2YXIgbGluZXMgPSBjaC5tYXRjaCgvKD86XFxyXFxuP3xcXG4pLiovZyk7XG4gICAgICAgIGlmIChsaW5lcykge1xuICAgICAgICAgICAgdGhpcy55eWxpbmVubysrO1xuICAgICAgICAgICAgdGhpcy55eWxsb2MubGFzdF9saW5lKys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnl5bGxvYy5sYXN0X2NvbHVtbisrO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMucmFuZ2VzKSB0aGlzLnl5bGxvYy5yYW5nZVsxXSsrO1xuXG4gICAgICAgIHRoaXMuX2lucHV0ID0gdGhpcy5faW5wdXQuc2xpY2UoMSk7XG4gICAgICAgIHJldHVybiBjaDtcbiAgICB9LFxudW5wdXQ6ZnVuY3Rpb24gKGNoKSB7XG4gICAgICAgIHZhciBsZW4gPSBjaC5sZW5ndGg7XG4gICAgICAgIHZhciBsaW5lcyA9IGNoLnNwbGl0KC8oPzpcXHJcXG4/fFxcbikvZyk7XG5cbiAgICAgICAgdGhpcy5faW5wdXQgPSBjaCArIHRoaXMuX2lucHV0O1xuICAgICAgICB0aGlzLnl5dGV4dCA9IHRoaXMueXl0ZXh0LnN1YnN0cigwLCB0aGlzLnl5dGV4dC5sZW5ndGgtbGVuLTEpO1xuICAgICAgICAvL3RoaXMueXlsZW5nIC09IGxlbjtcbiAgICAgICAgdGhpcy5vZmZzZXQgLT0gbGVuO1xuICAgICAgICB2YXIgb2xkTGluZXMgPSB0aGlzLm1hdGNoLnNwbGl0KC8oPzpcXHJcXG4/fFxcbikvZyk7XG4gICAgICAgIHRoaXMubWF0Y2ggPSB0aGlzLm1hdGNoLnN1YnN0cigwLCB0aGlzLm1hdGNoLmxlbmd0aC0xKTtcbiAgICAgICAgdGhpcy5tYXRjaGVkID0gdGhpcy5tYXRjaGVkLnN1YnN0cigwLCB0aGlzLm1hdGNoZWQubGVuZ3RoLTEpO1xuXG4gICAgICAgIGlmIChsaW5lcy5sZW5ndGgtMSkgdGhpcy55eWxpbmVubyAtPSBsaW5lcy5sZW5ndGgtMTtcbiAgICAgICAgdmFyIHIgPSB0aGlzLnl5bGxvYy5yYW5nZTtcblxuICAgICAgICB0aGlzLnl5bGxvYyA9IHtmaXJzdF9saW5lOiB0aGlzLnl5bGxvYy5maXJzdF9saW5lLFxuICAgICAgICAgIGxhc3RfbGluZTogdGhpcy55eWxpbmVubysxLFxuICAgICAgICAgIGZpcnN0X2NvbHVtbjogdGhpcy55eWxsb2MuZmlyc3RfY29sdW1uLFxuICAgICAgICAgIGxhc3RfY29sdW1uOiBsaW5lcyA/XG4gICAgICAgICAgICAgIChsaW5lcy5sZW5ndGggPT09IG9sZExpbmVzLmxlbmd0aCA/IHRoaXMueXlsbG9jLmZpcnN0X2NvbHVtbiA6IDApICsgb2xkTGluZXNbb2xkTGluZXMubGVuZ3RoIC0gbGluZXMubGVuZ3RoXS5sZW5ndGggLSBsaW5lc1swXS5sZW5ndGg6XG4gICAgICAgICAgICAgIHRoaXMueXlsbG9jLmZpcnN0X2NvbHVtbiAtIGxlblxuICAgICAgICAgIH07XG5cbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5yYW5nZXMpIHtcbiAgICAgICAgICAgIHRoaXMueXlsbG9jLnJhbmdlID0gW3JbMF0sIHJbMF0gKyB0aGlzLnl5bGVuZyAtIGxlbl07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbm1vcmU6ZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9tb3JlID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbmxlc3M6ZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgdGhpcy51bnB1dCh0aGlzLm1hdGNoLnNsaWNlKG4pKTtcbiAgICB9LFxucGFzdElucHV0OmZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHBhc3QgPSB0aGlzLm1hdGNoZWQuc3Vic3RyKDAsIHRoaXMubWF0Y2hlZC5sZW5ndGggLSB0aGlzLm1hdGNoLmxlbmd0aCk7XG4gICAgICAgIHJldHVybiAocGFzdC5sZW5ndGggPiAyMCA/ICcuLi4nOicnKSArIHBhc3Quc3Vic3RyKC0yMCkucmVwbGFjZSgvXFxuL2csIFwiXCIpO1xuICAgIH0sXG51cGNvbWluZ0lucHV0OmZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG5leHQgPSB0aGlzLm1hdGNoO1xuICAgICAgICBpZiAobmV4dC5sZW5ndGggPCAyMCkge1xuICAgICAgICAgICAgbmV4dCArPSB0aGlzLl9pbnB1dC5zdWJzdHIoMCwgMjAtbmV4dC5sZW5ndGgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAobmV4dC5zdWJzdHIoMCwyMCkrKG5leHQubGVuZ3RoID4gMjAgPyAnLi4uJzonJykpLnJlcGxhY2UoL1xcbi9nLCBcIlwiKTtcbiAgICB9LFxuc2hvd1Bvc2l0aW9uOmZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHByZSA9IHRoaXMucGFzdElucHV0KCk7XG4gICAgICAgIHZhciBjID0gbmV3IEFycmF5KHByZS5sZW5ndGggKyAxKS5qb2luKFwiLVwiKTtcbiAgICAgICAgcmV0dXJuIHByZSArIHRoaXMudXBjb21pbmdJbnB1dCgpICsgXCJcXG5cIiArIGMrXCJeXCI7XG4gICAgfSxcbm5leHQ6ZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy5kb25lKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5FT0Y7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLl9pbnB1dCkgdGhpcy5kb25lID0gdHJ1ZTtcblxuICAgICAgICB2YXIgdG9rZW4sXG4gICAgICAgICAgICBtYXRjaCxcbiAgICAgICAgICAgIHRlbXBNYXRjaCxcbiAgICAgICAgICAgIGluZGV4LFxuICAgICAgICAgICAgY29sLFxuICAgICAgICAgICAgbGluZXM7XG4gICAgICAgIGlmICghdGhpcy5fbW9yZSkge1xuICAgICAgICAgICAgdGhpcy55eXRleHQgPSAnJztcbiAgICAgICAgICAgIHRoaXMubWF0Y2ggPSAnJztcbiAgICAgICAgfVxuICAgICAgICB2YXIgcnVsZXMgPSB0aGlzLl9jdXJyZW50UnVsZXMoKTtcbiAgICAgICAgZm9yICh2YXIgaT0wO2kgPCBydWxlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdGVtcE1hdGNoID0gdGhpcy5faW5wdXQubWF0Y2godGhpcy5ydWxlc1tydWxlc1tpXV0pO1xuICAgICAgICAgICAgaWYgKHRlbXBNYXRjaCAmJiAoIW1hdGNoIHx8IHRlbXBNYXRjaFswXS5sZW5ndGggPiBtYXRjaFswXS5sZW5ndGgpKSB7XG4gICAgICAgICAgICAgICAgbWF0Y2ggPSB0ZW1wTWF0Y2g7XG4gICAgICAgICAgICAgICAgaW5kZXggPSBpO1xuICAgICAgICAgICAgICAgIGlmICghdGhpcy5vcHRpb25zLmZsZXgpIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICAgICAgbGluZXMgPSBtYXRjaFswXS5tYXRjaCgvKD86XFxyXFxuP3xcXG4pLiovZyk7XG4gICAgICAgICAgICBpZiAobGluZXMpIHRoaXMueXlsaW5lbm8gKz0gbGluZXMubGVuZ3RoO1xuICAgICAgICAgICAgdGhpcy55eWxsb2MgPSB7Zmlyc3RfbGluZTogdGhpcy55eWxsb2MubGFzdF9saW5lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgbGFzdF9saW5lOiB0aGlzLnl5bGluZW5vKzEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBmaXJzdF9jb2x1bW46IHRoaXMueXlsbG9jLmxhc3RfY29sdW1uLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgbGFzdF9jb2x1bW46IGxpbmVzID8gbGluZXNbbGluZXMubGVuZ3RoLTFdLmxlbmd0aC1saW5lc1tsaW5lcy5sZW5ndGgtMV0ubWF0Y2goL1xccj9cXG4/LylbMF0ubGVuZ3RoIDogdGhpcy55eWxsb2MubGFzdF9jb2x1bW4gKyBtYXRjaFswXS5sZW5ndGh9O1xuICAgICAgICAgICAgdGhpcy55eXRleHQgKz0gbWF0Y2hbMF07XG4gICAgICAgICAgICB0aGlzLm1hdGNoICs9IG1hdGNoWzBdO1xuICAgICAgICAgICAgdGhpcy5tYXRjaGVzID0gbWF0Y2g7XG4gICAgICAgICAgICB0aGlzLnl5bGVuZyA9IHRoaXMueXl0ZXh0Lmxlbmd0aDtcbiAgICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnMucmFuZ2VzKSB7XG4gICAgICAgICAgICAgICAgdGhpcy55eWxsb2MucmFuZ2UgPSBbdGhpcy5vZmZzZXQsIHRoaXMub2Zmc2V0ICs9IHRoaXMueXlsZW5nXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX21vcmUgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuX2lucHV0ID0gdGhpcy5faW5wdXQuc2xpY2UobWF0Y2hbMF0ubGVuZ3RoKTtcbiAgICAgICAgICAgIHRoaXMubWF0Y2hlZCArPSBtYXRjaFswXTtcbiAgICAgICAgICAgIHRva2VuID0gdGhpcy5wZXJmb3JtQWN0aW9uLmNhbGwodGhpcywgdGhpcy55eSwgdGhpcywgcnVsZXNbaW5kZXhdLHRoaXMuY29uZGl0aW9uU3RhY2tbdGhpcy5jb25kaXRpb25TdGFjay5sZW5ndGgtMV0pO1xuICAgICAgICAgICAgaWYgKHRoaXMuZG9uZSAmJiB0aGlzLl9pbnB1dCkgdGhpcy5kb25lID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAodG9rZW4pIHJldHVybiB0b2tlbjtcbiAgICAgICAgICAgIGVsc2UgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLl9pbnB1dCA9PT0gXCJcIikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuRU9GO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyc2VFcnJvcignTGV4aWNhbCBlcnJvciBvbiBsaW5lICcrKHRoaXMueXlsaW5lbm8rMSkrJy4gVW5yZWNvZ25pemVkIHRleHQuXFxuJyt0aGlzLnNob3dQb3NpdGlvbigpLFxuICAgICAgICAgICAgICAgICAgICB7dGV4dDogXCJcIiwgdG9rZW46IG51bGwsIGxpbmU6IHRoaXMueXlsaW5lbm99KTtcbiAgICAgICAgfVxuICAgIH0sXG5sZXg6ZnVuY3Rpb24gbGV4KCkge1xuICAgICAgICB2YXIgciA9IHRoaXMubmV4dCgpO1xuICAgICAgICBpZiAodHlwZW9mIHIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICByZXR1cm4gcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxleCgpO1xuICAgICAgICB9XG4gICAgfSxcbmJlZ2luOmZ1bmN0aW9uIGJlZ2luKGNvbmRpdGlvbikge1xuICAgICAgICB0aGlzLmNvbmRpdGlvblN0YWNrLnB1c2goY29uZGl0aW9uKTtcbiAgICB9LFxucG9wU3RhdGU6ZnVuY3Rpb24gcG9wU3RhdGUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbmRpdGlvblN0YWNrLnBvcCgpO1xuICAgIH0sXG5fY3VycmVudFJ1bGVzOmZ1bmN0aW9uIF9jdXJyZW50UnVsZXMoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbmRpdGlvbnNbdGhpcy5jb25kaXRpb25TdGFja1t0aGlzLmNvbmRpdGlvblN0YWNrLmxlbmd0aC0xXV0ucnVsZXM7XG4gICAgfSxcbnRvcFN0YXRlOmZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29uZGl0aW9uU3RhY2tbdGhpcy5jb25kaXRpb25TdGFjay5sZW5ndGgtMl07XG4gICAgfSxcbnB1c2hTdGF0ZTpmdW5jdGlvbiBiZWdpbihjb25kaXRpb24pIHtcbiAgICAgICAgdGhpcy5iZWdpbihjb25kaXRpb24pO1xuICAgIH19KTtcbmxleGVyLm9wdGlvbnMgPSB7fTtcbmxleGVyLnBlcmZvcm1BY3Rpb24gPSBmdW5jdGlvbiBhbm9ueW1vdXMoeXkseXlfLCRhdm9pZGluZ19uYW1lX2NvbGxpc2lvbnMsWVlfU1RBUlQpIHtcblxudmFyIFlZU1RBVEU9WVlfU1RBUlRcbnN3aXRjaCgkYXZvaWRpbmdfbmFtZV9jb2xsaXNpb25zKSB7XG5jYXNlIDA6IHl5Xy55eXRleHQgPSBcIlxcXFxcIjsgcmV0dXJuIDE0OyBcbmJyZWFrO1xuY2FzZSAxOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZih5eV8ueXl0ZXh0LnNsaWNlKC0xKSAhPT0gXCJcXFxcXCIpIHRoaXMuYmVnaW4oXCJtdVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoeXlfLnl5dGV4dC5zbGljZSgtMSkgPT09IFwiXFxcXFwiKSB5eV8ueXl0ZXh0ID0geXlfLnl5dGV4dC5zdWJzdHIoMCx5eV8ueXlsZW5nLTEpLCB0aGlzLmJlZ2luKFwiZW11XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZih5eV8ueXl0ZXh0KSByZXR1cm4gMTQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbmJyZWFrO1xuY2FzZSAyOiByZXR1cm4gMTQ7IFxuYnJlYWs7XG5jYXNlIDM6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKHl5Xy55eXRleHQuc2xpY2UoLTEpICE9PSBcIlxcXFxcIikgdGhpcy5wb3BTdGF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZih5eV8ueXl0ZXh0LnNsaWNlKC0xKSA9PT0gXCJcXFxcXCIpIHl5Xy55eXRleHQgPSB5eV8ueXl0ZXh0LnN1YnN0cigwLHl5Xy55eWxlbmctMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAxNDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuYnJlYWs7XG5jYXNlIDQ6IHl5Xy55eXRleHQgPSB5eV8ueXl0ZXh0LnN1YnN0cigwLCB5eV8ueXlsZW5nLTQpOyB0aGlzLnBvcFN0YXRlKCk7IHJldHVybiAxNTsgXG5icmVhaztcbmNhc2UgNTogcmV0dXJuIDI1OyBcbmJyZWFrO1xuY2FzZSA2OiByZXR1cm4gMTY7IFxuYnJlYWs7XG5jYXNlIDc6IHJldHVybiAyMDsgXG5icmVhaztcbmNhc2UgODogcmV0dXJuIDE5OyBcbmJyZWFrO1xuY2FzZSA5OiByZXR1cm4gMTk7IFxuYnJlYWs7XG5jYXNlIDEwOiByZXR1cm4gMjM7IFxuYnJlYWs7XG5jYXNlIDExOiByZXR1cm4gMjI7IFxuYnJlYWs7XG5jYXNlIDEyOiB0aGlzLnBvcFN0YXRlKCk7IHRoaXMuYmVnaW4oJ2NvbScpOyBcbmJyZWFrO1xuY2FzZSAxMzogeXlfLnl5dGV4dCA9IHl5Xy55eXRleHQuc3Vic3RyKDMseXlfLnl5bGVuZy01KTsgdGhpcy5wb3BTdGF0ZSgpOyByZXR1cm4gMTU7IFxuYnJlYWs7XG5jYXNlIDE0OiByZXR1cm4gMjI7IFxuYnJlYWs7XG5jYXNlIDE1OiByZXR1cm4gMzc7IFxuYnJlYWs7XG5jYXNlIDE2OiByZXR1cm4gMzY7IFxuYnJlYWs7XG5jYXNlIDE3OiByZXR1cm4gMzY7IFxuYnJlYWs7XG5jYXNlIDE4OiByZXR1cm4gNDA7IFxuYnJlYWs7XG5jYXNlIDE5OiAvKmlnbm9yZSB3aGl0ZXNwYWNlKi8gXG5icmVhaztcbmNhc2UgMjA6IHRoaXMucG9wU3RhdGUoKTsgcmV0dXJuIDI0OyBcbmJyZWFrO1xuY2FzZSAyMTogdGhpcy5wb3BTdGF0ZSgpOyByZXR1cm4gMTg7IFxuYnJlYWs7XG5jYXNlIDIyOiB5eV8ueXl0ZXh0ID0geXlfLnl5dGV4dC5zdWJzdHIoMSx5eV8ueXlsZW5nLTIpLnJlcGxhY2UoL1xcXFxcIi9nLCdcIicpOyByZXR1cm4gMzE7IFxuYnJlYWs7XG5jYXNlIDIzOiB5eV8ueXl0ZXh0ID0geXlfLnl5dGV4dC5zdWJzdHIoMSx5eV8ueXlsZW5nLTIpLnJlcGxhY2UoL1xcXFwnL2csXCInXCIpOyByZXR1cm4gMzE7IFxuYnJlYWs7XG5jYXNlIDI0OiByZXR1cm4gMzg7IFxuYnJlYWs7XG5jYXNlIDI1OiByZXR1cm4gMzM7IFxuYnJlYWs7XG5jYXNlIDI2OiByZXR1cm4gMzM7IFxuYnJlYWs7XG5jYXNlIDI3OiByZXR1cm4gMzI7IFxuYnJlYWs7XG5jYXNlIDI4OiByZXR1cm4gMzY7IFxuYnJlYWs7XG5jYXNlIDI5OiB5eV8ueXl0ZXh0ID0geXlfLnl5dGV4dC5zdWJzdHIoMSwgeXlfLnl5bGVuZy0yKTsgcmV0dXJuIDM2OyBcbmJyZWFrO1xuY2FzZSAzMDogcmV0dXJuICdJTlZBTElEJzsgXG5icmVhaztcbmNhc2UgMzE6IHJldHVybiA1OyBcbmJyZWFrO1xufVxufTtcbmxleGVyLnJ1bGVzID0gWy9eKD86XFxcXFxcXFwoPz0oXFx7XFx7KSkpLywvXig/OlteXFx4MDBdKj8oPz0oXFx7XFx7KSkpLywvXig/OlteXFx4MDBdKykvLC9eKD86W15cXHgwMF17Mix9Pyg/PShcXHtcXHt8JCkpKS8sL14oPzpbXFxzXFxTXSo/LS1cXH1cXH0pLywvXig/Olxce1xcez4pLywvXig/Olxce1xceyMpLywvXig/Olxce1xce1xcLykvLC9eKD86XFx7XFx7XFxeKS8sL14oPzpcXHtcXHtcXHMqZWxzZVxcYikvLC9eKD86XFx7XFx7XFx7KS8sL14oPzpcXHtcXHsmKS8sL14oPzpcXHtcXHshLS0pLywvXig/Olxce1xceyFbXFxzXFxTXSo/XFx9XFx9KS8sL14oPzpcXHtcXHspLywvXig/Oj0pLywvXig/OlxcLig/PVt9XFwvIF0pKS8sL14oPzpcXC5cXC4pLywvXig/OltcXC8uXSkvLC9eKD86XFxzKykvLC9eKD86XFx9XFx9XFx9KS8sL14oPzpcXH1cXH0pLywvXig/OlwiKFxcXFxbXCJdfFteXCJdKSpcIikvLC9eKD86JyhcXFxcWyddfFteJ10pKicpLywvXig/OkApLywvXig/OnRydWUoPz1bfVxcc10pKS8sL14oPzpmYWxzZSg/PVt9XFxzXSkpLywvXig/Oi0/WzAtOV0rKD89W31cXHNdKSkvLC9eKD86W15cXHMhXCIjJS0sXFwuXFwvOy0+QFxcWy1cXF5gXFx7LX5dKyg/PVs9fVxcc1xcLy5dKSkvLC9eKD86XFxbW15cXF1dKlxcXSkvLC9eKD86LikvLC9eKD86JCkvXTtcbmxleGVyLmNvbmRpdGlvbnMgPSB7XCJtdVwiOntcInJ1bGVzXCI6WzUsNiw3LDgsOSwxMCwxMSwxMiwxMywxNCwxNSwxNiwxNywxOCwxOSwyMCwyMSwyMiwyMywyNCwyNSwyNiwyNywyOCwyOSwzMCwzMV0sXCJpbmNsdXNpdmVcIjpmYWxzZX0sXCJlbXVcIjp7XCJydWxlc1wiOlszXSxcImluY2x1c2l2ZVwiOmZhbHNlfSxcImNvbVwiOntcInJ1bGVzXCI6WzRdLFwiaW5jbHVzaXZlXCI6ZmFsc2V9LFwiSU5JVElBTFwiOntcInJ1bGVzXCI6WzAsMSwyLDMxXSxcImluY2x1c2l2ZVwiOnRydWV9fTtcbnJldHVybiBsZXhlcjt9KSgpXG5wYXJzZXIubGV4ZXIgPSBsZXhlcjtcbmZ1bmN0aW9uIFBhcnNlciAoKSB7IHRoaXMueXkgPSB7fTsgfVBhcnNlci5wcm90b3R5cGUgPSBwYXJzZXI7cGFyc2VyLlBhcnNlciA9IFBhcnNlcjtcbnJldHVybiBuZXcgUGFyc2VyO1xufSkoKTtcbi8vIEVORChCUk9XU0VSKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGhhbmRsZWJhcnM7XG4iLCJleHBvcnRzLmF0dGFjaCA9IGZ1bmN0aW9uKEhhbmRsZWJhcnMpIHtcblxuLy8gQkVHSU4oQlJPV1NFUilcblxuSGFuZGxlYmFycy5wcmludCA9IGZ1bmN0aW9uKGFzdCkge1xuICByZXR1cm4gbmV3IEhhbmRsZWJhcnMuUHJpbnRWaXNpdG9yKCkuYWNjZXB0KGFzdCk7XG59O1xuXG5IYW5kbGViYXJzLlByaW50VmlzaXRvciA9IGZ1bmN0aW9uKCkgeyB0aGlzLnBhZGRpbmcgPSAwOyB9O1xuSGFuZGxlYmFycy5QcmludFZpc2l0b3IucHJvdG90eXBlID0gbmV3IEhhbmRsZWJhcnMuVmlzaXRvcigpO1xuXG5IYW5kbGViYXJzLlByaW50VmlzaXRvci5wcm90b3R5cGUucGFkID0gZnVuY3Rpb24oc3RyaW5nLCBuZXdsaW5lKSB7XG4gIHZhciBvdXQgPSBcIlwiO1xuXG4gIGZvcih2YXIgaT0wLGw9dGhpcy5wYWRkaW5nOyBpPGw7IGkrKykge1xuICAgIG91dCA9IG91dCArIFwiICBcIjtcbiAgfVxuXG4gIG91dCA9IG91dCArIHN0cmluZztcblxuICBpZihuZXdsaW5lICE9PSBmYWxzZSkgeyBvdXQgPSBvdXQgKyBcIlxcblwiOyB9XG4gIHJldHVybiBvdXQ7XG59O1xuXG5IYW5kbGViYXJzLlByaW50VmlzaXRvci5wcm90b3R5cGUucHJvZ3JhbSA9IGZ1bmN0aW9uKHByb2dyYW0pIHtcbiAgdmFyIG91dCA9IFwiXCIsXG4gICAgICBzdGF0ZW1lbnRzID0gcHJvZ3JhbS5zdGF0ZW1lbnRzLFxuICAgICAgaW52ZXJzZSA9IHByb2dyYW0uaW52ZXJzZSxcbiAgICAgIGksIGw7XG5cbiAgZm9yKGk9MCwgbD1zdGF0ZW1lbnRzLmxlbmd0aDsgaTxsOyBpKyspIHtcbiAgICBvdXQgPSBvdXQgKyB0aGlzLmFjY2VwdChzdGF0ZW1lbnRzW2ldKTtcbiAgfVxuXG4gIHRoaXMucGFkZGluZy0tO1xuXG4gIHJldHVybiBvdXQ7XG59O1xuXG5IYW5kbGViYXJzLlByaW50VmlzaXRvci5wcm90b3R5cGUuYmxvY2sgPSBmdW5jdGlvbihibG9jaykge1xuICB2YXIgb3V0ID0gXCJcIjtcblxuICBvdXQgPSBvdXQgKyB0aGlzLnBhZChcIkJMT0NLOlwiKTtcbiAgdGhpcy5wYWRkaW5nKys7XG4gIG91dCA9IG91dCArIHRoaXMuYWNjZXB0KGJsb2NrLm11c3RhY2hlKTtcbiAgaWYgKGJsb2NrLnByb2dyYW0pIHtcbiAgICBvdXQgPSBvdXQgKyB0aGlzLnBhZChcIlBST0dSQU06XCIpO1xuICAgIHRoaXMucGFkZGluZysrO1xuICAgIG91dCA9IG91dCArIHRoaXMuYWNjZXB0KGJsb2NrLnByb2dyYW0pO1xuICAgIHRoaXMucGFkZGluZy0tO1xuICB9XG4gIGlmIChibG9jay5pbnZlcnNlKSB7XG4gICAgaWYgKGJsb2NrLnByb2dyYW0pIHsgdGhpcy5wYWRkaW5nKys7IH1cbiAgICBvdXQgPSBvdXQgKyB0aGlzLnBhZChcInt7Xn19XCIpO1xuICAgIHRoaXMucGFkZGluZysrO1xuICAgIG91dCA9IG91dCArIHRoaXMuYWNjZXB0KGJsb2NrLmludmVyc2UpO1xuICAgIHRoaXMucGFkZGluZy0tO1xuICAgIGlmIChibG9jay5wcm9ncmFtKSB7IHRoaXMucGFkZGluZy0tOyB9XG4gIH1cbiAgdGhpcy5wYWRkaW5nLS07XG5cbiAgcmV0dXJuIG91dDtcbn07XG5cbkhhbmRsZWJhcnMuUHJpbnRWaXNpdG9yLnByb3RvdHlwZS5tdXN0YWNoZSA9IGZ1bmN0aW9uKG11c3RhY2hlKSB7XG4gIHZhciBwYXJhbXMgPSBtdXN0YWNoZS5wYXJhbXMsIHBhcmFtU3RyaW5ncyA9IFtdLCBoYXNoO1xuXG4gIGZvcih2YXIgaT0wLCBsPXBhcmFtcy5sZW5ndGg7IGk8bDsgaSsrKSB7XG4gICAgcGFyYW1TdHJpbmdzLnB1c2godGhpcy5hY2NlcHQocGFyYW1zW2ldKSk7XG4gIH1cblxuICBwYXJhbXMgPSBcIltcIiArIHBhcmFtU3RyaW5ncy5qb2luKFwiLCBcIikgKyBcIl1cIjtcblxuICBoYXNoID0gbXVzdGFjaGUuaGFzaCA/IFwiIFwiICsgdGhpcy5hY2NlcHQobXVzdGFjaGUuaGFzaCkgOiBcIlwiO1xuXG4gIHJldHVybiB0aGlzLnBhZChcInt7IFwiICsgdGhpcy5hY2NlcHQobXVzdGFjaGUuaWQpICsgXCIgXCIgKyBwYXJhbXMgKyBoYXNoICsgXCIgfX1cIik7XG59O1xuXG5IYW5kbGViYXJzLlByaW50VmlzaXRvci5wcm90b3R5cGUucGFydGlhbCA9IGZ1bmN0aW9uKHBhcnRpYWwpIHtcbiAgdmFyIGNvbnRlbnQgPSB0aGlzLmFjY2VwdChwYXJ0aWFsLnBhcnRpYWxOYW1lKTtcbiAgaWYocGFydGlhbC5jb250ZXh0KSB7IGNvbnRlbnQgPSBjb250ZW50ICsgXCIgXCIgKyB0aGlzLmFjY2VwdChwYXJ0aWFsLmNvbnRleHQpOyB9XG4gIHJldHVybiB0aGlzLnBhZChcInt7PiBcIiArIGNvbnRlbnQgKyBcIiB9fVwiKTtcbn07XG5cbkhhbmRsZWJhcnMuUHJpbnRWaXNpdG9yLnByb3RvdHlwZS5oYXNoID0gZnVuY3Rpb24oaGFzaCkge1xuICB2YXIgcGFpcnMgPSBoYXNoLnBhaXJzO1xuICB2YXIgam9pbmVkUGFpcnMgPSBbXSwgbGVmdCwgcmlnaHQ7XG5cbiAgZm9yKHZhciBpPTAsIGw9cGFpcnMubGVuZ3RoOyBpPGw7IGkrKykge1xuICAgIGxlZnQgPSBwYWlyc1tpXVswXTtcbiAgICByaWdodCA9IHRoaXMuYWNjZXB0KHBhaXJzW2ldWzFdKTtcbiAgICBqb2luZWRQYWlycy5wdXNoKCBsZWZ0ICsgXCI9XCIgKyByaWdodCApO1xuICB9XG5cbiAgcmV0dXJuIFwiSEFTSHtcIiArIGpvaW5lZFBhaXJzLmpvaW4oXCIsIFwiKSArIFwifVwiO1xufTtcblxuSGFuZGxlYmFycy5QcmludFZpc2l0b3IucHJvdG90eXBlLlNUUklORyA9IGZ1bmN0aW9uKHN0cmluZykge1xuICByZXR1cm4gJ1wiJyArIHN0cmluZy5zdHJpbmcgKyAnXCInO1xufTtcblxuSGFuZGxlYmFycy5QcmludFZpc2l0b3IucHJvdG90eXBlLklOVEVHRVIgPSBmdW5jdGlvbihpbnRlZ2VyKSB7XG4gIHJldHVybiBcIklOVEVHRVJ7XCIgKyBpbnRlZ2VyLmludGVnZXIgKyBcIn1cIjtcbn07XG5cbkhhbmRsZWJhcnMuUHJpbnRWaXNpdG9yLnByb3RvdHlwZS5CT09MRUFOID0gZnVuY3Rpb24oYm9vbCkge1xuICByZXR1cm4gXCJCT09MRUFOe1wiICsgYm9vbC5ib29sICsgXCJ9XCI7XG59O1xuXG5IYW5kbGViYXJzLlByaW50VmlzaXRvci5wcm90b3R5cGUuSUQgPSBmdW5jdGlvbihpZCkge1xuICB2YXIgcGF0aCA9IGlkLnBhcnRzLmpvaW4oXCIvXCIpO1xuICBpZihpZC5wYXJ0cy5sZW5ndGggPiAxKSB7XG4gICAgcmV0dXJuIFwiUEFUSDpcIiArIHBhdGg7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIFwiSUQ6XCIgKyBwYXRoO1xuICB9XG59O1xuXG5IYW5kbGViYXJzLlByaW50VmlzaXRvci5wcm90b3R5cGUuUEFSVElBTF9OQU1FID0gZnVuY3Rpb24ocGFydGlhbE5hbWUpIHtcbiAgICByZXR1cm4gXCJQQVJUSUFMOlwiICsgcGFydGlhbE5hbWUubmFtZTtcbn07XG5cbkhhbmRsZWJhcnMuUHJpbnRWaXNpdG9yLnByb3RvdHlwZS5EQVRBID0gZnVuY3Rpb24oZGF0YSkge1xuICByZXR1cm4gXCJAXCIgKyB0aGlzLmFjY2VwdChkYXRhLmlkKTtcbn07XG5cbkhhbmRsZWJhcnMuUHJpbnRWaXNpdG9yLnByb3RvdHlwZS5jb250ZW50ID0gZnVuY3Rpb24oY29udGVudCkge1xuICByZXR1cm4gdGhpcy5wYWQoXCJDT05URU5UWyAnXCIgKyBjb250ZW50LnN0cmluZyArIFwiJyBdXCIpO1xufTtcblxuSGFuZGxlYmFycy5QcmludFZpc2l0b3IucHJvdG90eXBlLmNvbW1lbnQgPSBmdW5jdGlvbihjb21tZW50KSB7XG4gIHJldHVybiB0aGlzLnBhZChcInt7ISAnXCIgKyBjb21tZW50LmNvbW1lbnQgKyBcIicgfX1cIik7XG59O1xuLy8gRU5EKEJST1dTRVIpXG5cbnJldHVybiBIYW5kbGViYXJzO1xufTtcblxuIiwiZXhwb3J0cy5hdHRhY2ggPSBmdW5jdGlvbihIYW5kbGViYXJzKSB7XG5cbi8vIEJFR0lOKEJST1dTRVIpXG5cbkhhbmRsZWJhcnMuVmlzaXRvciA9IGZ1bmN0aW9uKCkge307XG5cbkhhbmRsZWJhcnMuVmlzaXRvci5wcm90b3R5cGUgPSB7XG4gIGFjY2VwdDogZnVuY3Rpb24ob2JqZWN0KSB7XG4gICAgcmV0dXJuIHRoaXNbb2JqZWN0LnR5cGVdKG9iamVjdCk7XG4gIH1cbn07XG5cbi8vIEVORChCUk9XU0VSKVxuXG5yZXR1cm4gSGFuZGxlYmFycztcbn07XG5cblxuIiwiZXhwb3J0cy5hdHRhY2ggPSBmdW5jdGlvbihIYW5kbGViYXJzKSB7XG5cbi8vIEJFR0lOKEJST1dTRVIpXG5cbkhhbmRsZWJhcnMuVk0gPSB7XG4gIHRlbXBsYXRlOiBmdW5jdGlvbih0ZW1wbGF0ZVNwZWMpIHtcbiAgICAvLyBKdXN0IGFkZCB3YXRlclxuICAgIHZhciBjb250YWluZXIgPSB7XG4gICAgICBlc2NhcGVFeHByZXNzaW9uOiBIYW5kbGViYXJzLlV0aWxzLmVzY2FwZUV4cHJlc3Npb24sXG4gICAgICBpbnZva2VQYXJ0aWFsOiBIYW5kbGViYXJzLlZNLmludm9rZVBhcnRpYWwsXG4gICAgICBwcm9ncmFtczogW10sXG4gICAgICBwcm9ncmFtOiBmdW5jdGlvbihpLCBmbiwgZGF0YSkge1xuICAgICAgICB2YXIgcHJvZ3JhbVdyYXBwZXIgPSB0aGlzLnByb2dyYW1zW2ldO1xuICAgICAgICBpZihkYXRhKSB7XG4gICAgICAgICAgcHJvZ3JhbVdyYXBwZXIgPSBIYW5kbGViYXJzLlZNLnByb2dyYW0oaSwgZm4sIGRhdGEpO1xuICAgICAgICB9IGVsc2UgaWYgKCFwcm9ncmFtV3JhcHBlcikge1xuICAgICAgICAgIHByb2dyYW1XcmFwcGVyID0gdGhpcy5wcm9ncmFtc1tpXSA9IEhhbmRsZWJhcnMuVk0ucHJvZ3JhbShpLCBmbik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByb2dyYW1XcmFwcGVyO1xuICAgICAgfSxcbiAgICAgIG1lcmdlOiBmdW5jdGlvbihwYXJhbSwgY29tbW9uKSB7XG4gICAgICAgIHZhciByZXQgPSBwYXJhbSB8fCBjb21tb247XG5cbiAgICAgICAgaWYgKHBhcmFtICYmIGNvbW1vbikge1xuICAgICAgICAgIHJldCA9IHt9O1xuICAgICAgICAgIEhhbmRsZWJhcnMuVXRpbHMuZXh0ZW5kKHJldCwgY29tbW9uKTtcbiAgICAgICAgICBIYW5kbGViYXJzLlV0aWxzLmV4dGVuZChyZXQsIHBhcmFtKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgfSxcbiAgICAgIHByb2dyYW1XaXRoRGVwdGg6IEhhbmRsZWJhcnMuVk0ucHJvZ3JhbVdpdGhEZXB0aCxcbiAgICAgIG5vb3A6IEhhbmRsZWJhcnMuVk0ubm9vcCxcbiAgICAgIGNvbXBpbGVySW5mbzogbnVsbFxuICAgIH07XG5cbiAgICByZXR1cm4gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICB2YXIgcmVzdWx0ID0gdGVtcGxhdGVTcGVjLmNhbGwoY29udGFpbmVyLCBIYW5kbGViYXJzLCBjb250ZXh0LCBvcHRpb25zLmhlbHBlcnMsIG9wdGlvbnMucGFydGlhbHMsIG9wdGlvbnMuZGF0YSk7XG5cbiAgICAgIHZhciBjb21waWxlckluZm8gPSBjb250YWluZXIuY29tcGlsZXJJbmZvIHx8IFtdLFxuICAgICAgICAgIGNvbXBpbGVyUmV2aXNpb24gPSBjb21waWxlckluZm9bMF0gfHwgMSxcbiAgICAgICAgICBjdXJyZW50UmV2aXNpb24gPSBIYW5kbGViYXJzLkNPTVBJTEVSX1JFVklTSU9OO1xuXG4gICAgICBpZiAoY29tcGlsZXJSZXZpc2lvbiAhPT0gY3VycmVudFJldmlzaW9uKSB7XG4gICAgICAgIGlmIChjb21waWxlclJldmlzaW9uIDwgY3VycmVudFJldmlzaW9uKSB7XG4gICAgICAgICAgdmFyIHJ1bnRpbWVWZXJzaW9ucyA9IEhhbmRsZWJhcnMuUkVWSVNJT05fQ0hBTkdFU1tjdXJyZW50UmV2aXNpb25dLFxuICAgICAgICAgICAgICBjb21waWxlclZlcnNpb25zID0gSGFuZGxlYmFycy5SRVZJU0lPTl9DSEFOR0VTW2NvbXBpbGVyUmV2aXNpb25dO1xuICAgICAgICAgIHRocm93IFwiVGVtcGxhdGUgd2FzIHByZWNvbXBpbGVkIHdpdGggYW4gb2xkZXIgdmVyc2lvbiBvZiBIYW5kbGViYXJzIHRoYW4gdGhlIGN1cnJlbnQgcnVudGltZS4gXCIrXG4gICAgICAgICAgICAgICAgXCJQbGVhc2UgdXBkYXRlIHlvdXIgcHJlY29tcGlsZXIgdG8gYSBuZXdlciB2ZXJzaW9uIChcIitydW50aW1lVmVyc2lvbnMrXCIpIG9yIGRvd25ncmFkZSB5b3VyIHJ1bnRpbWUgdG8gYW4gb2xkZXIgdmVyc2lvbiAoXCIrY29tcGlsZXJWZXJzaW9ucytcIikuXCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gVXNlIHRoZSBlbWJlZGRlZCB2ZXJzaW9uIGluZm8gc2luY2UgdGhlIHJ1bnRpbWUgZG9lc24ndCBrbm93IGFib3V0IHRoaXMgcmV2aXNpb24geWV0XG4gICAgICAgICAgdGhyb3cgXCJUZW1wbGF0ZSB3YXMgcHJlY29tcGlsZWQgd2l0aCBhIG5ld2VyIHZlcnNpb24gb2YgSGFuZGxlYmFycyB0aGFuIHRoZSBjdXJyZW50IHJ1bnRpbWUuIFwiK1xuICAgICAgICAgICAgICAgIFwiUGxlYXNlIHVwZGF0ZSB5b3VyIHJ1bnRpbWUgdG8gYSBuZXdlciB2ZXJzaW9uIChcIitjb21waWxlckluZm9bMV0rXCIpLlwiO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgfSxcblxuICBwcm9ncmFtV2l0aERlcHRoOiBmdW5jdGlvbihpLCBmbiwgZGF0YSAvKiwgJGRlcHRoICovKSB7XG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDMpO1xuXG4gICAgdmFyIHByb2dyYW0gPSBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIFtjb250ZXh0LCBvcHRpb25zLmRhdGEgfHwgZGF0YV0uY29uY2F0KGFyZ3MpKTtcbiAgICB9O1xuICAgIHByb2dyYW0ucHJvZ3JhbSA9IGk7XG4gICAgcHJvZ3JhbS5kZXB0aCA9IGFyZ3MubGVuZ3RoO1xuICAgIHJldHVybiBwcm9ncmFtO1xuICB9LFxuICBwcm9ncmFtOiBmdW5jdGlvbihpLCBmbiwgZGF0YSkge1xuICAgIHZhciBwcm9ncmFtID0gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICAgIHJldHVybiBmbihjb250ZXh0LCBvcHRpb25zLmRhdGEgfHwgZGF0YSk7XG4gICAgfTtcbiAgICBwcm9ncmFtLnByb2dyYW0gPSBpO1xuICAgIHByb2dyYW0uZGVwdGggPSAwO1xuICAgIHJldHVybiBwcm9ncmFtO1xuICB9LFxuICBub29wOiBmdW5jdGlvbigpIHsgcmV0dXJuIFwiXCI7IH0sXG4gIGludm9rZVBhcnRpYWw6IGZ1bmN0aW9uKHBhcnRpYWwsIG5hbWUsIGNvbnRleHQsIGhlbHBlcnMsIHBhcnRpYWxzLCBkYXRhKSB7XG4gICAgdmFyIG9wdGlvbnMgPSB7IGhlbHBlcnM6IGhlbHBlcnMsIHBhcnRpYWxzOiBwYXJ0aWFscywgZGF0YTogZGF0YSB9O1xuXG4gICAgaWYocGFydGlhbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgSGFuZGxlYmFycy5FeGNlcHRpb24oXCJUaGUgcGFydGlhbCBcIiArIG5hbWUgKyBcIiBjb3VsZCBub3QgYmUgZm91bmRcIik7XG4gICAgfSBlbHNlIGlmKHBhcnRpYWwgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgcmV0dXJuIHBhcnRpYWwoY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfSBlbHNlIGlmICghSGFuZGxlYmFycy5jb21waWxlKSB7XG4gICAgICB0aHJvdyBuZXcgSGFuZGxlYmFycy5FeGNlcHRpb24oXCJUaGUgcGFydGlhbCBcIiArIG5hbWUgKyBcIiBjb3VsZCBub3QgYmUgY29tcGlsZWQgd2hlbiBydW5uaW5nIGluIHJ1bnRpbWUtb25seSBtb2RlXCIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYXJ0aWFsc1tuYW1lXSA9IEhhbmRsZWJhcnMuY29tcGlsZShwYXJ0aWFsLCB7ZGF0YTogZGF0YSAhPT0gdW5kZWZpbmVkfSk7XG4gICAgICByZXR1cm4gcGFydGlhbHNbbmFtZV0oY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfVxuICB9XG59O1xuXG5IYW5kbGViYXJzLnRlbXBsYXRlID0gSGFuZGxlYmFycy5WTS50ZW1wbGF0ZTtcblxuLy8gRU5EKEJST1dTRVIpXG5cbnJldHVybiBIYW5kbGViYXJzO1xuXG59O1xuIiwiZXhwb3J0cy5hdHRhY2ggPSBmdW5jdGlvbihIYW5kbGViYXJzKSB7XG5cbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbi8vIEJFR0lOKEJST1dTRVIpXG5cbnZhciBlcnJvclByb3BzID0gWydkZXNjcmlwdGlvbicsICdmaWxlTmFtZScsICdsaW5lTnVtYmVyJywgJ21lc3NhZ2UnLCAnbmFtZScsICdudW1iZXInLCAnc3RhY2snXTtcblxuSGFuZGxlYmFycy5FeGNlcHRpb24gPSBmdW5jdGlvbihtZXNzYWdlKSB7XG4gIHZhciB0bXAgPSBFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAvLyBVbmZvcnR1bmF0ZWx5IGVycm9ycyBhcmUgbm90IGVudW1lcmFibGUgaW4gQ2hyb21lIChhdCBsZWFzdCksIHNvIGBmb3IgcHJvcCBpbiB0bXBgIGRvZXNuJ3Qgd29yay5cbiAgZm9yICh2YXIgaWR4ID0gMDsgaWR4IDwgZXJyb3JQcm9wcy5sZW5ndGg7IGlkeCsrKSB7XG4gICAgdGhpc1tlcnJvclByb3BzW2lkeF1dID0gdG1wW2Vycm9yUHJvcHNbaWR4XV07XG4gIH1cbn07XG5IYW5kbGViYXJzLkV4Y2VwdGlvbi5wcm90b3R5cGUgPSBuZXcgRXJyb3IoKTtcblxuLy8gQnVpbGQgb3V0IG91ciBiYXNpYyBTYWZlU3RyaW5nIHR5cGVcbkhhbmRsZWJhcnMuU2FmZVN0cmluZyA9IGZ1bmN0aW9uKHN0cmluZykge1xuICB0aGlzLnN0cmluZyA9IHN0cmluZztcbn07XG5IYW5kbGViYXJzLlNhZmVTdHJpbmcucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLnN0cmluZy50b1N0cmluZygpO1xufTtcblxudmFyIGVzY2FwZSA9IHtcbiAgXCImXCI6IFwiJmFtcDtcIixcbiAgXCI8XCI6IFwiJmx0O1wiLFxuICBcIj5cIjogXCImZ3Q7XCIsXG4gICdcIic6IFwiJnF1b3Q7XCIsXG4gIFwiJ1wiOiBcIiYjeDI3O1wiLFxuICBcImBcIjogXCImI3g2MDtcIlxufTtcblxudmFyIGJhZENoYXJzID0gL1smPD5cIidgXS9nO1xudmFyIHBvc3NpYmxlID0gL1smPD5cIidgXS87XG5cbnZhciBlc2NhcGVDaGFyID0gZnVuY3Rpb24oY2hyKSB7XG4gIHJldHVybiBlc2NhcGVbY2hyXSB8fCBcIiZhbXA7XCI7XG59O1xuXG5IYW5kbGViYXJzLlV0aWxzID0ge1xuICBleHRlbmQ6IGZ1bmN0aW9uKG9iaiwgdmFsdWUpIHtcbiAgICBmb3IodmFyIGtleSBpbiB2YWx1ZSkge1xuICAgICAgaWYodmFsdWUuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICBvYmpba2V5XSA9IHZhbHVlW2tleV07XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIGVzY2FwZUV4cHJlc3Npb246IGZ1bmN0aW9uKHN0cmluZykge1xuICAgIC8vIGRvbid0IGVzY2FwZSBTYWZlU3RyaW5ncywgc2luY2UgdGhleSdyZSBhbHJlYWR5IHNhZmVcbiAgICBpZiAoc3RyaW5nIGluc3RhbmNlb2YgSGFuZGxlYmFycy5TYWZlU3RyaW5nKSB7XG4gICAgICByZXR1cm4gc3RyaW5nLnRvU3RyaW5nKCk7XG4gICAgfSBlbHNlIGlmIChzdHJpbmcgPT0gbnVsbCB8fCBzdHJpbmcgPT09IGZhbHNlKSB7XG4gICAgICByZXR1cm4gXCJcIjtcbiAgICB9XG5cbiAgICAvLyBGb3JjZSBhIHN0cmluZyBjb252ZXJzaW9uIGFzIHRoaXMgd2lsbCBiZSBkb25lIGJ5IHRoZSBhcHBlbmQgcmVnYXJkbGVzcyBhbmRcbiAgICAvLyB0aGUgcmVnZXggdGVzdCB3aWxsIGRvIHRoaXMgdHJhbnNwYXJlbnRseSBiZWhpbmQgdGhlIHNjZW5lcywgY2F1c2luZyBpc3N1ZXMgaWZcbiAgICAvLyBhbiBvYmplY3QncyB0byBzdHJpbmcgaGFzIGVzY2FwZWQgY2hhcmFjdGVycyBpbiBpdC5cbiAgICBzdHJpbmcgPSBzdHJpbmcudG9TdHJpbmcoKTtcblxuICAgIGlmKCFwb3NzaWJsZS50ZXN0KHN0cmluZykpIHsgcmV0dXJuIHN0cmluZzsgfVxuICAgIHJldHVybiBzdHJpbmcucmVwbGFjZShiYWRDaGFycywgZXNjYXBlQ2hhcik7XG4gIH0sXG5cbiAgaXNFbXB0eTogZnVuY3Rpb24odmFsdWUpIHtcbiAgICBpZiAoIXZhbHVlICYmIHZhbHVlICE9PSAwKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2UgaWYodG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09IFwiW29iamVjdCBBcnJheV1cIiAmJiB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG59O1xuXG4vLyBFTkQoQlJPV1NFUilcblxucmV0dXJuIEhhbmRsZWJhcnM7XG59O1xuIiwidmFyIFRva2VuaXplciA9IHJlcXVpcmUoXCIuL1Rva2VuaXplci5qc1wiKTtcblxuLypcblx0T3B0aW9uczpcblxuXHR4bWxNb2RlOiBTcGVjaWFsIGJlaGF2aW9yIGZvciBzY3JpcHQvc3R5bGUgdGFncyAodHJ1ZSBieSBkZWZhdWx0KVxuXHRsb3dlckNhc2VBdHRyaWJ1dGVOYW1lczogY2FsbCAudG9Mb3dlckNhc2UgZm9yIGVhY2ggYXR0cmlidXRlIG5hbWUgKHRydWUgaWYgeG1sTW9kZSBpcyBgZmFsc2VgKVxuXHRsb3dlckNhc2VUYWdzOiBjYWxsIC50b0xvd2VyQ2FzZSBmb3IgZWFjaCB0YWcgbmFtZSAodHJ1ZSBpZiB4bWxNb2RlIGlzIGBmYWxzZWApXG4qL1xuXG4vKlxuXHRDYWxsYmFja3M6XG5cblx0b25jZGF0YWVuZCxcblx0b25jZGF0YXN0YXJ0LFxuXHRvbmNsb3NldGFnLFxuXHRvbmNvbW1lbnQsXG5cdG9uY29tbWVudGVuZCxcblx0b25lcnJvcixcblx0b25vcGVudGFnLFxuXHRvbnByb2Nlc3NpbmdpbnN0cnVjdGlvbixcblx0b25yZXNldCxcblx0b250ZXh0XG4qL1xuXG52YXIgZm9ybVRhZ3MgPSB7XG5cdGlucHV0OiB0cnVlLFxuXHRvcHRpb246IHRydWUsXG5cdG9wdGdyb3VwOiB0cnVlLFxuXHRzZWxlY3Q6IHRydWUsXG5cdGJ1dHRvbjogdHJ1ZSxcblx0ZGF0YWxpc3Q6IHRydWUsXG5cdHRleHRhcmVhOiB0cnVlXG59O1xuXG52YXIgb3BlbkltcGxpZXNDbG9zZSA9IHtcblx0dHIgICAgICA6IHsgdHI6dHJ1ZSwgdGg6dHJ1ZSwgdGQ6dHJ1ZSB9LFxuXHR0aCAgICAgIDogeyB0aDp0cnVlIH0sXG5cdHRkICAgICAgOiB7IHRoZWFkOnRydWUsIHRkOnRydWUgfSxcblx0Ym9keSAgICA6IHsgaGVhZDp0cnVlLCBsaW5rOnRydWUsIHNjcmlwdDp0cnVlIH0sXG5cdGxpICAgICAgOiB7IGxpOnRydWUgfSxcblx0cCAgICAgICA6IHsgcDp0cnVlIH0sXG5cdHNlbGVjdCAgOiBmb3JtVGFncyxcblx0aW5wdXQgICA6IGZvcm1UYWdzLFxuXHRvdXRwdXQgIDogZm9ybVRhZ3MsXG5cdGJ1dHRvbiAgOiBmb3JtVGFncyxcblx0ZGF0YWxpc3Q6IGZvcm1UYWdzLFxuXHR0ZXh0YXJlYTogZm9ybVRhZ3MsXG5cdG9wdGlvbiAgOiB7IG9wdGlvbjp0cnVlIH0sXG5cdG9wdGdyb3VwOiB7IG9wdGdyb3VwOnRydWUgfVxufTtcblxudmFyIHZvaWRFbGVtZW50cyA9IHtcblx0X19wcm90b19fOiBudWxsLFxuXHRhcmVhOiB0cnVlLFxuXHRiYXNlOiB0cnVlLFxuXHRiYXNlZm9udDogdHJ1ZSxcblx0YnI6IHRydWUsXG5cdGNvbDogdHJ1ZSxcblx0Y29tbWFuZDogdHJ1ZSxcblx0ZW1iZWQ6IHRydWUsXG5cdGZyYW1lOiB0cnVlLFxuXHRocjogdHJ1ZSxcblx0aW1nOiB0cnVlLFxuXHRpbnB1dDogdHJ1ZSxcblx0aXNpbmRleDogdHJ1ZSxcblx0a2V5Z2VuOiB0cnVlLFxuXHRsaW5rOiB0cnVlLFxuXHRtZXRhOiB0cnVlLFxuXHRwYXJhbTogdHJ1ZSxcblx0c291cmNlOiB0cnVlLFxuXHR0cmFjazogdHJ1ZSxcblx0d2JyOiB0cnVlXG59O1xuXG52YXIgcmVfbmFtZUVuZCA9IC9cXHN8XFwvLztcblxuZnVuY3Rpb24gUGFyc2VyKGNicywgb3B0aW9ucyl7XG5cdHRoaXMuX29wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXHR0aGlzLl9jYnMgPSBjYnMgfHwge307XG5cblx0dGhpcy5fdGFnbmFtZSA9IFwiXCI7XG5cdHRoaXMuX2F0dHJpYm5hbWUgPSBcIlwiO1xuXHR0aGlzLl9hdHRyaWJ2YWx1ZSA9IFwiXCI7XG5cdHRoaXMuX2F0dHJpYnMgPSBudWxsO1xuXHR0aGlzLl9zdGFjayA9IFtdO1xuXHR0aGlzLl9kb25lID0gZmFsc2U7XG5cblx0dGhpcy5zdGFydEluZGV4ID0gMDtcblx0dGhpcy5lbmRJbmRleCA9IG51bGw7XG5cblx0dGhpcy5fdG9rZW5pemVyID0gbmV3IFRva2VuaXplcihvcHRpb25zLCB0aGlzKTtcbn1cblxucmVxdWlyZShcInV0aWxcIikuaW5oZXJpdHMoUGFyc2VyLCByZXF1aXJlKFwiZXZlbnRzXCIpLkV2ZW50RW1pdHRlcik7XG5cblBhcnNlci5wcm90b3R5cGUuX3VwZGF0ZVBvc2l0aW9uID0gZnVuY3Rpb24oaW5pdGlhbE9mZnNldCl7XG5cdGlmKHRoaXMuZW5kSW5kZXggPT09IG51bGwpe1xuXHRcdHRoaXMuc3RhcnRJbmRleCA9IHRoaXMuX3Rva2VuaXplci5fc2VjdGlvblN0YXJ0IDw9IGluaXRpYWxPZmZzZXQgPyAwIDogdGhpcy5fdG9rZW5pemVyLl9zZWN0aW9uU3RhcnQgLSBpbml0aWFsT2Zmc2V0O1xuXHR9XG5cdHRoaXMuc3RhcnRJbmRleCA9IHRoaXMuZW5kSW5kZXggKyAxO1xuXHR0aGlzLmVuZEluZGV4ID0gdGhpcy5fdG9rZW5pemVyLl9pbmRleDtcbn07XG5cbi8vVG9rZW5pemVyIGV2ZW50IGhhbmRsZXJzXG5QYXJzZXIucHJvdG90eXBlLm9udGV4dCA9IGZ1bmN0aW9uKGRhdGEpe1xuXHR0aGlzLl91cGRhdGVQb3NpdGlvbigxKTtcblx0dGhpcy5lbmRJbmRleC0tO1xuXG5cdGlmKHRoaXMuX2Nicy5vbnRleHQpIHRoaXMuX2Nicy5vbnRleHQoZGF0YSk7XG59O1xuXG5QYXJzZXIucHJvdG90eXBlLm9ub3BlbnRhZ25hbWUgPSBmdW5jdGlvbihuYW1lKXtcblx0aWYoISh0aGlzLl9vcHRpb25zLnhtbE1vZGUgfHwgXCJsb3dlckNhc2VUYWdzXCIgaW4gdGhpcy5fb3B0aW9ucykgfHwgdGhpcy5fb3B0aW9ucy5sb3dlckNhc2VUYWdzKXtcblx0XHRuYW1lID0gbmFtZS50b0xvd2VyQ2FzZSgpO1xuXHR9XG5cblx0dGhpcy5fdGFnbmFtZSA9IG5hbWU7XG5cblx0aWYgKCF0aGlzLl9vcHRpb25zLnhtbE1vZGUgJiYgbmFtZSBpbiBvcGVuSW1wbGllc0Nsb3NlKSB7XG5cdFx0Zm9yKFxuXHRcdFx0dmFyIGVsO1xuXHRcdFx0KGVsID0gdGhpcy5fc3RhY2tbdGhpcy5fc3RhY2subGVuZ3RoLTFdKSBpbiBvcGVuSW1wbGllc0Nsb3NlW25hbWVdO1xuXHRcdFx0dGhpcy5vbmNsb3NldGFnKGVsKVxuXHRcdCk7XG5cdH1cblxuXHRpZih0aGlzLl9vcHRpb25zLnhtbE1vZGUgfHwgIShuYW1lIGluIHZvaWRFbGVtZW50cykpe1xuXHRcdHRoaXMuX3N0YWNrLnB1c2gobmFtZSk7XG5cdH1cblxuXHRpZih0aGlzLl9jYnMub25vcGVudGFnbmFtZSkgdGhpcy5fY2JzLm9ub3BlbnRhZ25hbWUobmFtZSk7XG5cdGlmKHRoaXMuX2Nicy5vbm9wZW50YWcpIHRoaXMuX2F0dHJpYnMgPSB7fTtcbn07XG5cblBhcnNlci5wcm90b3R5cGUub25vcGVudGFnZW5kID0gZnVuY3Rpb24oKXtcblx0dGhpcy5fdXBkYXRlUG9zaXRpb24oMSk7XG4gICAgXG5cdGlmKHRoaXMuX2F0dHJpYnMpe1xuXHRcdGlmKHRoaXMuX2Nicy5vbm9wZW50YWcpIHRoaXMuX2Nicy5vbm9wZW50YWcodGhpcy5fdGFnbmFtZSwgdGhpcy5fYXR0cmlicyk7XG5cdFx0dGhpcy5fYXR0cmlicyA9IG51bGw7XG5cdH1cbiAgICBcblx0aWYoIXRoaXMuX29wdGlvbnMueG1sTW9kZSAmJiB0aGlzLl9jYnMub25jbG9zZXRhZyAmJiB0aGlzLl90YWduYW1lIGluIHZvaWRFbGVtZW50cyl7XG5cdFx0dGhpcy5fY2JzLm9uY2xvc2V0YWcodGhpcy5fdGFnbmFtZSk7XG5cdH1cbiAgICBcblx0dGhpcy5fdGFnbmFtZSA9IFwiXCI7XG59O1xuXG5QYXJzZXIucHJvdG90eXBlLm9uY2xvc2V0YWcgPSBmdW5jdGlvbihuYW1lKXtcblx0dGhpcy5fdXBkYXRlUG9zaXRpb24oMSk7XG5cblx0aWYoISh0aGlzLl9vcHRpb25zLnhtbE1vZGUgfHwgXCJsb3dlckNhc2VUYWdzXCIgaW4gdGhpcy5fb3B0aW9ucykgfHwgdGhpcy5fb3B0aW9ucy5sb3dlckNhc2VUYWdzKXtcblx0XHRuYW1lID0gbmFtZS50b0xvd2VyQ2FzZSgpO1xuXHR9XG5cblx0aWYodGhpcy5fc3RhY2subGVuZ3RoICYmICghKG5hbWUgaW4gdm9pZEVsZW1lbnRzKSB8fCB0aGlzLl9vcHRpb25zLnhtbE1vZGUpKXtcblx0XHR2YXIgcG9zID0gdGhpcy5fc3RhY2subGFzdEluZGV4T2YobmFtZSk7XG5cdFx0aWYocG9zICE9PSAtMSl7XG5cdFx0XHRpZih0aGlzLl9jYnMub25jbG9zZXRhZyl7XG5cdFx0XHRcdHBvcyA9IHRoaXMuX3N0YWNrLmxlbmd0aCAtIHBvcztcblx0XHRcdFx0d2hpbGUocG9zLS0pIHRoaXMuX2Nicy5vbmNsb3NldGFnKHRoaXMuX3N0YWNrLnBvcCgpKTtcblx0XHRcdH1cblx0XHRcdGVsc2UgdGhpcy5fc3RhY2subGVuZ3RoID0gcG9zO1xuXHRcdH0gZWxzZSBpZihuYW1lID09PSBcInBcIiAmJiAhdGhpcy5fb3B0aW9ucy54bWxNb2RlKXtcblx0XHRcdHRoaXMub25vcGVudGFnbmFtZShuYW1lKTtcblx0XHRcdHRoaXMuX2Nsb3NlQ3VycmVudFRhZygpO1xuXHRcdH1cblx0fSBlbHNlIGlmKCF0aGlzLl9vcHRpb25zLnhtbE1vZGUgJiYgKG5hbWUgPT09IFwiYnJcIiB8fCBuYW1lID09PSBcInBcIikpe1xuXHRcdHRoaXMub25vcGVudGFnbmFtZShuYW1lKTtcblx0XHR0aGlzLl9jbG9zZUN1cnJlbnRUYWcoKTtcblx0fVxufTtcblxuUGFyc2VyLnByb3RvdHlwZS5vbnNlbGZjbG9zaW5ndGFnID0gZnVuY3Rpb24oKXtcblx0aWYodGhpcy5fb3B0aW9ucy54bWxNb2RlKXtcblx0XHR0aGlzLl9jbG9zZUN1cnJlbnRUYWcoKTtcblx0fSBlbHNlIHtcblx0XHR0aGlzLm9ub3BlbnRhZ2VuZCgpO1xuXHR9XG59O1xuXG5QYXJzZXIucHJvdG90eXBlLl9jbG9zZUN1cnJlbnRUYWcgPSBmdW5jdGlvbigpe1xuXHR2YXIgbmFtZSA9IHRoaXMuX3RhZ25hbWU7XG5cblx0dGhpcy5vbm9wZW50YWdlbmQoKTtcblxuXHQvL3NlbGYtY2xvc2luZyB0YWdzIHdpbGwgYmUgb24gdGhlIHRvcCBvZiB0aGUgc3RhY2tcblx0Ly8oY2hlYXBlciBjaGVjayB0aGFuIGluIG9uY2xvc2V0YWcpXG5cdGlmKHRoaXMuX3N0YWNrW3RoaXMuX3N0YWNrLmxlbmd0aC0xXSA9PT0gbmFtZSl7XG5cdFx0aWYodGhpcy5fY2JzLm9uY2xvc2V0YWcpe1xuXHRcdFx0dGhpcy5fY2JzLm9uY2xvc2V0YWcobmFtZSk7XG5cdFx0fVxuXHRcdHRoaXMuX3N0YWNrLnBvcCgpO1xuXHR9XG59O1xuXG5QYXJzZXIucHJvdG90eXBlLm9uYXR0cmlibmFtZSA9IGZ1bmN0aW9uKG5hbWUpe1xuXHRpZighKHRoaXMuX29wdGlvbnMueG1sTW9kZSB8fCBcImxvd2VyQ2FzZUF0dHJpYnV0ZU5hbWVzXCIgaW4gdGhpcy5fb3B0aW9ucykgfHwgdGhpcy5fb3B0aW9ucy5sb3dlckNhc2VBdHRyaWJ1dGVOYW1lcyl7XG5cdFx0bmFtZSA9IG5hbWUudG9Mb3dlckNhc2UoKTtcblx0fVxuXHR0aGlzLl9hdHRyaWJuYW1lID0gbmFtZTtcbn07XG5cblBhcnNlci5wcm90b3R5cGUub25hdHRyaWJkYXRhID0gZnVuY3Rpb24odmFsdWUpe1xuXHR0aGlzLl9hdHRyaWJ2YWx1ZSArPSB2YWx1ZTtcbn07XG5cblBhcnNlci5wcm90b3R5cGUub25hdHRyaWJlbmQgPSBmdW5jdGlvbigpe1xuXHRpZih0aGlzLl9jYnMub25hdHRyaWJ1dGUpIHRoaXMuX2Nicy5vbmF0dHJpYnV0ZSh0aGlzLl9hdHRyaWJuYW1lLCB0aGlzLl9hdHRyaWJ2YWx1ZSk7XG5cdGlmKFxuXHRcdHRoaXMuX2F0dHJpYnMgJiZcblx0XHQhT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHRoaXMuX2F0dHJpYnMsIHRoaXMuX2F0dHJpYm5hbWUpXG5cdCl7XG5cdFx0dGhpcy5fYXR0cmlic1t0aGlzLl9hdHRyaWJuYW1lXSA9IHRoaXMuX2F0dHJpYnZhbHVlO1xuXHR9XG5cdHRoaXMuX2F0dHJpYm5hbWUgPSBcIlwiO1xuXHR0aGlzLl9hdHRyaWJ2YWx1ZSA9IFwiXCI7XG59O1xuXG5QYXJzZXIucHJvdG90eXBlLm9uZGVjbGFyYXRpb24gPSBmdW5jdGlvbih2YWx1ZSl7XG5cdGlmKHRoaXMuX2Nicy5vbnByb2Nlc3NpbmdpbnN0cnVjdGlvbil7XG5cdFx0dmFyIGlkeCA9IHZhbHVlLnNlYXJjaChyZV9uYW1lRW5kKSxcblx0XHQgICAgbmFtZSA9IGlkeCA8IDAgPyB2YWx1ZSA6IHZhbHVlLnN1YnN0cigwLCBpZHgpO1xuXG5cdFx0aWYoISh0aGlzLl9vcHRpb25zLnhtbE1vZGUgfHwgXCJsb3dlckNhc2VUYWdzXCIgaW4gdGhpcy5fb3B0aW9ucykgfHwgdGhpcy5fb3B0aW9ucy5sb3dlckNhc2VUYWdzKXtcblx0XHRcdG5hbWUgPSBuYW1lLnRvTG93ZXJDYXNlKCk7XG5cdFx0fVxuXHRcdHRoaXMuX2Nicy5vbnByb2Nlc3NpbmdpbnN0cnVjdGlvbihcIiFcIiArIG5hbWUsIFwiIVwiICsgdmFsdWUpO1xuXHR9XG59O1xuXG5QYXJzZXIucHJvdG90eXBlLm9ucHJvY2Vzc2luZ2luc3RydWN0aW9uID0gZnVuY3Rpb24odmFsdWUpe1xuXHRpZih0aGlzLl9jYnMub25wcm9jZXNzaW5naW5zdHJ1Y3Rpb24pe1xuXHRcdHZhciBpZHggPSB2YWx1ZS5zZWFyY2gocmVfbmFtZUVuZCksXG5cdFx0ICAgIG5hbWUgPSBpZHggPCAwID8gdmFsdWUgOiB2YWx1ZS5zdWJzdHIoMCwgaWR4KTtcblxuXHRcdGlmKCEodGhpcy5fb3B0aW9ucy54bWxNb2RlIHx8IFwibG93ZXJDYXNlVGFnc1wiIGluIHRoaXMuX29wdGlvbnMpIHx8IHRoaXMuX29wdGlvbnMubG93ZXJDYXNlVGFncyl7XG5cdFx0XHRuYW1lID0gbmFtZS50b0xvd2VyQ2FzZSgpO1xuXHRcdH1cblx0XHR0aGlzLl9jYnMub25wcm9jZXNzaW5naW5zdHJ1Y3Rpb24oXCI/XCIgKyBuYW1lLCBcIj9cIiArIHZhbHVlKTtcblx0fVxufTtcblxuUGFyc2VyLnByb3RvdHlwZS5vbmNvbW1lbnQgPSBmdW5jdGlvbih2YWx1ZSl7XG5cdHRoaXMuX3VwZGF0ZVBvc2l0aW9uKDQpO1xuXG5cdGlmKHRoaXMuX2Nicy5vbmNvbW1lbnQpIHRoaXMuX2Nicy5vbmNvbW1lbnQodmFsdWUpO1xuXHRpZih0aGlzLl9jYnMub25jb21tZW50ZW5kKSB0aGlzLl9jYnMub25jb21tZW50ZW5kKCk7XG59O1xuXG5QYXJzZXIucHJvdG90eXBlLm9uY2RhdGEgPSBmdW5jdGlvbih2YWx1ZSl7XG5cdHRoaXMuX3VwZGF0ZVBvc2l0aW9uKDEpO1xuXG5cdGlmKHRoaXMuX29wdGlvbnMueG1sTW9kZSl7XG5cdFx0aWYodGhpcy5fY2JzLm9uY2RhdGFzdGFydCkgdGhpcy5fY2JzLm9uY2RhdGFzdGFydCgpO1xuXHRcdGlmKHRoaXMuX2Nicy5vbnRleHQpIHRoaXMuX2Nicy5vbnRleHQodmFsdWUpO1xuXHRcdGlmKHRoaXMuX2Nicy5vbmNkYXRhZW5kKSB0aGlzLl9jYnMub25jZGF0YWVuZCgpO1xuXHR9IGVsc2Uge1xuXHRcdHRoaXMub25jb21tZW50KFwiW0NEQVRBW1wiICsgdmFsdWUgKyBcIl1dXCIpO1xuXHR9XG59O1xuXG5QYXJzZXIucHJvdG90eXBlLm9uZXJyb3IgPSBmdW5jdGlvbihlcnIpe1xuXHRpZih0aGlzLl9jYnMub25lcnJvcikgdGhpcy5fY2JzLm9uZXJyb3IoZXJyKTtcbn07XG5cblBhcnNlci5wcm90b3R5cGUub25lbmQgPSBmdW5jdGlvbigpe1xuXHRpZih0aGlzLl9jYnMub25jbG9zZXRhZyl7XG5cdFx0Zm9yKFxuXHRcdFx0dmFyIGkgPSB0aGlzLl9zdGFjay5sZW5ndGg7XG5cdFx0XHRpID4gMDtcblx0XHRcdHRoaXMuX2Nicy5vbmNsb3NldGFnKHRoaXMuX3N0YWNrWy0taV0pXG5cdFx0KTtcblx0fVxuXHRpZih0aGlzLl9jYnMub25lbmQpIHRoaXMuX2Nicy5vbmVuZCgpO1xufTtcblxuXG4vL1Jlc2V0cyB0aGUgcGFyc2VyIHRvIGEgYmxhbmsgc3RhdGUsIHJlYWR5IHRvIHBhcnNlIGEgbmV3IEhUTUwgZG9jdW1lbnRcblBhcnNlci5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbigpe1xuXHRpZih0aGlzLl9jYnMub25yZXNldCkgdGhpcy5fY2JzLm9ucmVzZXQoKTtcblx0dGhpcy5fdG9rZW5pemVyLnJlc2V0KCk7XG5cblx0dGhpcy5fdGFnbmFtZSA9IFwiXCI7XG5cdHRoaXMuX2F0dHJpYm5hbWUgPSBcIlwiO1xuXHR0aGlzLl9hdHRyaWJzID0gbnVsbDtcblx0dGhpcy5fc3RhY2sgPSBbXTtcblx0dGhpcy5fZG9uZSA9IGZhbHNlO1xufTtcblxuLy9QYXJzZXMgYSBjb21wbGV0ZSBIVE1MIGRvY3VtZW50IGFuZCBwdXNoZXMgaXQgdG8gdGhlIGhhbmRsZXJcblBhcnNlci5wcm90b3R5cGUucGFyc2VDb21wbGV0ZSA9IGZ1bmN0aW9uKGRhdGEpe1xuXHR0aGlzLnJlc2V0KCk7XG5cdHRoaXMuZW5kKGRhdGEpO1xufTtcblxuUGFyc2VyLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uKGNodW5rKXtcblx0aWYodGhpcy5fZG9uZSkgdGhpcy5vbmVycm9yKEVycm9yKFwiLndyaXRlKCkgYWZ0ZXIgZG9uZSFcIikpO1xuXHR0aGlzLl90b2tlbml6ZXIud3JpdGUoY2h1bmspO1xufTtcblxuUGFyc2VyLnByb3RvdHlwZS5lbmQgPSBmdW5jdGlvbihjaHVuayl7XG5cdGlmKHRoaXMuX2RvbmUpIHRoaXMub25lcnJvcihFcnJvcihcIi5lbmQoKSBhZnRlciBkb25lIVwiKSk7XG5cdHRoaXMuX3Rva2VuaXplci5lbmQoY2h1bmspO1xuXHR0aGlzLl9kb25lID0gdHJ1ZTtcbn07XG5cbi8vYWxpYXMgZm9yIGJhY2t3YXJkcyBjb21wYXRcblBhcnNlci5wcm90b3R5cGUucGFyc2VDaHVuayA9IFBhcnNlci5wcm90b3R5cGUud3JpdGU7XG5QYXJzZXIucHJvdG90eXBlLmRvbmUgPSBQYXJzZXIucHJvdG90eXBlLmVuZDtcblxubW9kdWxlLmV4cG9ydHMgPSBQYXJzZXI7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFRva2VuaXplcjtcblxudmFyIGVudGl0eU1hcCA9IHJlcXVpcmUoXCIuL2VudGl0aWVzL2VudGl0aWVzLmpzb25cIiksXG4gICAgbGVnYWN5TWFwID0gcmVxdWlyZShcIi4vZW50aXRpZXMvbGVnYWN5Lmpzb25cIiksXG4gICAgeG1sTWFwICAgID0gcmVxdWlyZShcIi4vZW50aXRpZXMveG1sLmpzb25cIiksXG4gICAgZGVjb2RlTWFwID0gcmVxdWlyZShcIi4vZW50aXRpZXMvZGVjb2RlLmpzb25cIiksXG5cbiAgICBpID0gMCxcblxuICAgIFRFWFQgICAgICAgICAgICAgICAgICAgICAgPSBpKyssXG4gICAgQkVGT1JFX1RBR19OQU1FICAgICAgICAgICA9IGkrKywgLy9hZnRlciA8XG4gICAgSU5fVEFHX05BTUUgICAgICAgICAgICAgICA9IGkrKyxcbiAgICBJTl9TRUxGX0NMT1NJTkdfVEFHICAgICAgID0gaSsrLFxuICAgIEJFRk9SRV9DTE9TSU5HX1RBR19OQU1FICAgPSBpKyssXG4gICAgSU5fQ0xPU0lOR19UQUdfTkFNRSAgICAgICA9IGkrKyxcbiAgICBBRlRFUl9DTE9TSU5HX1RBR19OQU1FICAgID0gaSsrLFxuXG4gICAgLy9hdHRyaWJ1dGVzXG4gICAgQkVGT1JFX0FUVFJJQlVURV9OQU1FICAgICA9IGkrKyxcbiAgICBJTl9BVFRSSUJVVEVfTkFNRSAgICAgICAgID0gaSsrLFxuICAgIEFGVEVSX0FUVFJJQlVURV9OQU1FICAgICAgPSBpKyssXG4gICAgQkVGT1JFX0FUVFJJQlVURV9WQUxVRSAgICA9IGkrKyxcbiAgICBJTl9BVFRSSUJVVEVfVkFMVUVfRFEgICAgID0gaSsrLCAvLyBcIlxuICAgIElOX0FUVFJJQlVURV9WQUxVRV9TUSAgICAgPSBpKyssIC8vICdcbiAgICBJTl9BVFRSSUJVVEVfVkFMVUVfTlEgICAgID0gaSsrLFxuXG4gICAgLy9kZWNsYXJhdGlvbnNcbiAgICBCRUZPUkVfREVDTEFSQVRJT04gICAgICAgID0gaSsrLCAvLyAhXG4gICAgSU5fREVDTEFSQVRJT04gICAgICAgICAgICA9IGkrKyxcblxuICAgIC8vcHJvY2Vzc2luZyBpbnN0cnVjdGlvbnNcbiAgICBJTl9QUk9DRVNTSU5HX0lOU1RSVUNUSU9OID0gaSsrLCAvLyA/XG5cbiAgICAvL2NvbW1lbnRzXG4gICAgQkVGT1JFX0NPTU1FTlQgICAgICAgICAgICA9IGkrKyxcbiAgICBJTl9DT01NRU5UICAgICAgICAgICAgICAgID0gaSsrLFxuICAgIEFGVEVSX0NPTU1FTlRfMSAgICAgICAgICAgPSBpKyssXG4gICAgQUZURVJfQ09NTUVOVF8yICAgICAgICAgICA9IGkrKyxcblxuICAgIC8vY2RhdGFcbiAgICBCRUZPUkVfQ0RBVEFfMSAgICAgICAgICAgID0gaSsrLCAvLyBbXG4gICAgQkVGT1JFX0NEQVRBXzIgICAgICAgICAgICA9IGkrKywgLy8gQ1xuICAgIEJFRk9SRV9DREFUQV8zICAgICAgICAgICAgPSBpKyssIC8vIERcbiAgICBCRUZPUkVfQ0RBVEFfNCAgICAgICAgICAgID0gaSsrLCAvLyBBXG4gICAgQkVGT1JFX0NEQVRBXzUgICAgICAgICAgICA9IGkrKywgLy8gVFxuICAgIEJFRk9SRV9DREFUQV82ICAgICAgICAgICAgPSBpKyssIC8vIEFcbiAgICBJTl9DREFUQSAgICAgICAgICAgICAgICAgID0gaSsrLC8vIFtcbiAgICBBRlRFUl9DREFUQV8xICAgICAgICAgICAgID0gaSsrLCAvLyBdXG4gICAgQUZURVJfQ0RBVEFfMiAgICAgICAgICAgICA9IGkrKywgLy8gXVxuXG4gICAgLy9zcGVjaWFsIHRhZ3NcbiAgICBCRUZPUkVfU1BFQ0lBTCAgICAgICAgICAgID0gaSsrLCAvL1NcbiAgICBCRUZPUkVfU1BFQ0lBTF9FTkQgICAgICAgID0gaSsrLCAgIC8vU1xuXG4gICAgQkVGT1JFX1NDUklQVF8xICAgICAgICAgICA9IGkrKywgLy9DXG4gICAgQkVGT1JFX1NDUklQVF8yICAgICAgICAgICA9IGkrKywgLy9SXG4gICAgQkVGT1JFX1NDUklQVF8zICAgICAgICAgICA9IGkrKywgLy9JXG4gICAgQkVGT1JFX1NDUklQVF80ICAgICAgICAgICA9IGkrKywgLy9QXG4gICAgQkVGT1JFX1NDUklQVF81ICAgICAgICAgICA9IGkrKywgLy9UXG4gICAgQUZURVJfU0NSSVBUXzEgICAgICAgICAgICA9IGkrKywgLy9DXG4gICAgQUZURVJfU0NSSVBUXzIgICAgICAgICAgICA9IGkrKywgLy9SXG4gICAgQUZURVJfU0NSSVBUXzMgICAgICAgICAgICA9IGkrKywgLy9JXG4gICAgQUZURVJfU0NSSVBUXzQgICAgICAgICAgICA9IGkrKywgLy9QXG4gICAgQUZURVJfU0NSSVBUXzUgICAgICAgICAgICA9IGkrKywgLy9UXG5cbiAgICBCRUZPUkVfU1RZTEVfMSAgICAgICAgICAgID0gaSsrLCAvL1RcbiAgICBCRUZPUkVfU1RZTEVfMiAgICAgICAgICAgID0gaSsrLCAvL1lcbiAgICBCRUZPUkVfU1RZTEVfMyAgICAgICAgICAgID0gaSsrLCAvL0xcbiAgICBCRUZPUkVfU1RZTEVfNCAgICAgICAgICAgID0gaSsrLCAvL0VcbiAgICBBRlRFUl9TVFlMRV8xICAgICAgICAgICAgID0gaSsrLCAvL1RcbiAgICBBRlRFUl9TVFlMRV8yICAgICAgICAgICAgID0gaSsrLCAvL1lcbiAgICBBRlRFUl9TVFlMRV8zICAgICAgICAgICAgID0gaSsrLCAvL0xcbiAgICBBRlRFUl9TVFlMRV80ICAgICAgICAgICAgID0gaSsrLCAvL0VcblxuICAgIEJFRk9SRV9FTlRJVFkgICAgICAgICAgICAgPSBpKyssIC8vJlxuICAgIEJFRk9SRV9OVU1FUklDX0VOVElUWSAgICAgPSBpKyssIC8vI1xuICAgIElOX05BTUVEX0VOVElUWSAgICAgICAgICAgPSBpKyssXG4gICAgSU5fTlVNRVJJQ19FTlRJVFkgICAgICAgICA9IGkrKyxcbiAgICBJTl9IRVhfRU5USVRZICAgICAgICAgICAgID0gaSsrLCAvL1hcblxuICAgIGogPSAwLFxuXG4gICAgU1BFQ0lBTF9OT05FICAgICAgICAgICAgICA9IGorKyxcbiAgICBTUEVDSUFMX1NDUklQVCAgICAgICAgICAgID0gaisrLFxuICAgIFNQRUNJQUxfU1RZTEUgICAgICAgICAgICAgPSBqKys7XG5cbmZ1bmN0aW9uIHdoaXRlc3BhY2UoYyl7XG5cdHJldHVybiBjID09PSBcIiBcIiB8fCBjID09PSBcIlxcblwiIHx8IGMgPT09IFwiXFx0XCIgfHwgYyA9PT0gXCJcXGZcIiB8fCBjID09PSBcIlxcclwiO1xufVxuXG5mdW5jdGlvbiBpZkVsc2VTdGF0ZSh1cHBlciwgU1VDQ0VTUywgRkFJTFVSRSl7XG5cdHZhciBsb3dlciA9IHVwcGVyLnRvTG93ZXJDYXNlKCk7XG5cblx0aWYodXBwZXIgPT09IGxvd2VyKXtcblx0XHRyZXR1cm4gZnVuY3Rpb24oYyl7XG5cdFx0XHR0aGlzLl9zdGF0ZSA9IGMgPT09IGxvd2VyID8gU1VDQ0VTUyA6IEZBSUxVUkU7XG5cdFx0fTtcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gZnVuY3Rpb24oYyl7XG5cdFx0XHR0aGlzLl9zdGF0ZSA9IChjID09PSBsb3dlciB8fCBjID09PSB1cHBlcikgPyBTVUNDRVNTIDogRkFJTFVSRTtcblx0XHR9O1xuXHR9XG59XG5cbmZ1bmN0aW9uIGNvbnN1bWVTcGVjaWFsTmFtZUNoYXIodXBwZXIsIE5FWFRfU1RBVEUpe1xuXHR2YXIgbG93ZXIgPSB1cHBlci50b0xvd2VyQ2FzZSgpO1xuXG5cdHJldHVybiBmdW5jdGlvbihjKXtcblx0XHRpZihjID09PSBsb3dlciB8fCBjID09PSB1cHBlcil7XG5cdFx0XHR0aGlzLl9zdGF0ZSA9IE5FWFRfU1RBVEU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuX3N0YXRlID0gSU5fVEFHX05BTUU7XG5cdFx0XHR0aGlzLl9pbmRleC0tOyAvL2NvbnN1bWUgdGhlIHRva2VuIGFnYWluXG5cdFx0fVxuXHR9O1xufVxuXG5mdW5jdGlvbiBUb2tlbml6ZXIob3B0aW9ucywgY2JzKXtcblx0dGhpcy5fc3RhdGUgPSBURVhUO1xuXHR0aGlzLl9idWZmZXIgPSBcIlwiO1xuXHR0aGlzLl9zZWN0aW9uU3RhcnQgPSAwO1xuXHR0aGlzLl9pbmRleCA9IDA7XG5cdHRoaXMuX2Jhc2VTdGF0ZSA9IFRFWFQ7XG5cdHRoaXMuX3NwZWNpYWwgPSBTUEVDSUFMX05PTkU7XG5cdHRoaXMuX2NicyA9IGNicztcblx0dGhpcy5fcnVubmluZyA9IHRydWU7XG5cdHRoaXMuX3htbE1vZGUgPSAhIShvcHRpb25zICYmIG9wdGlvbnMueG1sTW9kZSk7XG5cdHRoaXMuX2RlY29kZUVudGl0aWVzID0gISEob3B0aW9ucyAmJiBvcHRpb25zLmRlY29kZUVudGl0aWVzKTtcbn1cblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVUZXh0ID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiPFwiKXtcblx0XHRpZih0aGlzLl9pbmRleCA+IHRoaXMuX3NlY3Rpb25TdGFydCl7XG5cdFx0XHR0aGlzLl9jYnMub250ZXh0KHRoaXMuX2dldFNlY3Rpb24oKSk7XG5cdFx0fVxuXHRcdHRoaXMuX3N0YXRlID0gQkVGT1JFX1RBR19OQU1FO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4O1xuXHR9IGVsc2UgaWYodGhpcy5fZGVjb2RlRW50aXRpZXMgJiYgdGhpcy5fc3BlY2lhbCA9PT0gU1BFQ0lBTF9OT05FICYmIGMgPT09IFwiJlwiKXtcblx0XHRpZih0aGlzLl9pbmRleCA+IHRoaXMuX3NlY3Rpb25TdGFydCl7XG5cdFx0XHR0aGlzLl9jYnMub250ZXh0KHRoaXMuX2dldFNlY3Rpb24oKSk7XG5cdFx0fVxuXHRcdHRoaXMuX2Jhc2VTdGF0ZSA9IFRFWFQ7XG5cdFx0dGhpcy5fc3RhdGUgPSBCRUZPUkVfRU5USVRZO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4O1xuXHR9XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUJlZm9yZVRhZ05hbWUgPSBmdW5jdGlvbihjKXtcblx0aWYoYyA9PT0gXCIvXCIpe1xuXHRcdHRoaXMuX3N0YXRlID0gQkVGT1JFX0NMT1NJTkdfVEFHX05BTUU7XG5cdH0gZWxzZSBpZihjID09PSBcIj5cIiB8fCB0aGlzLl9zcGVjaWFsICE9PSBTUEVDSUFMX05PTkUgfHwgd2hpdGVzcGFjZShjKSkge1xuXHRcdHRoaXMuX3N0YXRlID0gVEVYVDtcblx0fSBlbHNlIGlmKGMgPT09IFwiIVwiKXtcblx0XHR0aGlzLl9zdGF0ZSA9IEJFRk9SRV9ERUNMQVJBVElPTjtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleCArIDE7XG5cdH0gZWxzZSBpZihjID09PSBcIj9cIil7XG5cdFx0dGhpcy5fc3RhdGUgPSBJTl9QUk9DRVNTSU5HX0lOU1RSVUNUSU9OO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4ICsgMTtcblx0fSBlbHNlIGlmKGMgPT09IFwiPFwiKXtcblx0XHR0aGlzLl9jYnMub250ZXh0KHRoaXMuX2dldFNlY3Rpb24oKSk7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXg7XG5cdH0gZWxzZSB7XG5cdFx0dGhpcy5fc3RhdGUgPSAoIXRoaXMuX3htbE1vZGUgJiYgKGMgPT09IFwic1wiIHx8IGMgPT09IFwiU1wiKSkgP1xuXHRcdFx0XHRcdFx0QkVGT1JFX1NQRUNJQUwgOiBJTl9UQUdfTkFNRTtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleDtcblx0fVxufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVJblRhZ05hbWUgPSBmdW5jdGlvbihjKXtcblx0aWYoYyA9PT0gXCIvXCIgfHwgYyA9PT0gXCI+XCIgfHwgd2hpdGVzcGFjZShjKSl7XG5cdFx0dGhpcy5fZW1pdFRva2VuKFwib25vcGVudGFnbmFtZVwiKTtcblx0XHR0aGlzLl9zdGF0ZSA9IEJFRk9SRV9BVFRSSUJVVEVfTkFNRTtcblx0XHR0aGlzLl9pbmRleC0tO1xuXHR9XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUJlZm9yZUNsb3NlaW5nVGFnTmFtZSA9IGZ1bmN0aW9uKGMpe1xuXHRpZih3aGl0ZXNwYWNlKGMpKTtcblx0ZWxzZSBpZihjID09PSBcIj5cIil7XG5cdFx0dGhpcy5fc3RhdGUgPSBURVhUO1xuXHR9IGVsc2UgaWYodGhpcy5fc3BlY2lhbCAhPT0gU1BFQ0lBTF9OT05FKXtcblx0XHRpZihjID09PSBcInNcIiB8fCBjID09PSBcIlNcIil7XG5cdFx0XHR0aGlzLl9zdGF0ZSA9IEJFRk9SRV9TUEVDSUFMX0VORDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5fc3RhdGUgPSBURVhUO1xuXHRcdFx0dGhpcy5faW5kZXgtLTtcblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0dGhpcy5fc3RhdGUgPSBJTl9DTE9TSU5HX1RBR19OQU1FO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4O1xuXHR9XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUluQ2xvc2VpbmdUYWdOYW1lID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiPlwiIHx8IHdoaXRlc3BhY2UoYykpe1xuXHRcdHRoaXMuX2VtaXRUb2tlbihcIm9uY2xvc2V0YWdcIik7XG5cdFx0dGhpcy5fc3RhdGUgPSBBRlRFUl9DTE9TSU5HX1RBR19OQU1FO1xuXHRcdHRoaXMuX2luZGV4LS07XG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQWZ0ZXJDbG9zZWluZ1RhZ05hbWUgPSBmdW5jdGlvbihjKXtcblx0Ly9za2lwIGV2ZXJ5dGhpbmcgdW50aWwgXCI+XCJcblx0aWYoYyA9PT0gXCI+XCIpe1xuXHRcdHRoaXMuX3N0YXRlID0gVEVYVDtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleCArIDE7XG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlQXR0cmlidXRlTmFtZSA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIj5cIil7XG5cdFx0dGhpcy5fY2JzLm9ub3BlbnRhZ2VuZCgpO1xuXHRcdHRoaXMuX3N0YXRlID0gVEVYVDtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleCArIDE7XG5cdH0gZWxzZSBpZihjID09PSBcIi9cIil7XG5cdFx0dGhpcy5fc3RhdGUgPSBJTl9TRUxGX0NMT1NJTkdfVEFHO1xuXHR9IGVsc2UgaWYoIXdoaXRlc3BhY2UoYykpe1xuXHRcdHRoaXMuX3N0YXRlID0gSU5fQVRUUklCVVRFX05BTUU7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXg7XG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlSW5TZWxmQ2xvc2luZ1RhZyA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIj5cIil7XG5cdFx0dGhpcy5fY2JzLm9uc2VsZmNsb3Npbmd0YWcoKTtcblx0XHR0aGlzLl9zdGF0ZSA9IFRFWFQ7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXggKyAxO1xuXHR9IGVsc2UgaWYoIXdoaXRlc3BhY2UoYykpe1xuXHRcdHRoaXMuX3N0YXRlID0gQkVGT1JFX0FUVFJJQlVURV9OQU1FO1xuXHRcdHRoaXMuX2luZGV4LS07XG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlSW5BdHRyaWJ1dGVOYW1lID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiPVwiIHx8IGMgPT09IFwiL1wiIHx8IGMgPT09IFwiPlwiIHx8IHdoaXRlc3BhY2UoYykpe1xuXHRcdGlmKHRoaXMuX2luZGV4ID4gdGhpcy5fc2VjdGlvblN0YXJ0KXtcblx0XHRcdHRoaXMuX2Nicy5vbmF0dHJpYm5hbWUodGhpcy5fZ2V0U2VjdGlvbigpKTtcblx0XHR9XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gLTE7XG5cdFx0dGhpcy5fc3RhdGUgPSBBRlRFUl9BVFRSSUJVVEVfTkFNRTtcblx0XHR0aGlzLl9pbmRleC0tO1xuXHR9XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUFmdGVyQXR0cmlidXRlTmFtZSA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIj1cIil7XG5cdFx0dGhpcy5fc3RhdGUgPSBCRUZPUkVfQVRUUklCVVRFX1ZBTFVFO1xuXHR9IGVsc2UgaWYoYyA9PT0gXCIvXCIgfHwgYyA9PT0gXCI+XCIpe1xuXHRcdHRoaXMuX2Nicy5vbmF0dHJpYmVuZCgpO1xuXHRcdHRoaXMuX3N0YXRlID0gQkVGT1JFX0FUVFJJQlVURV9OQU1FO1xuXHRcdHRoaXMuX2luZGV4LS07XG5cdH0gZWxzZSBpZighd2hpdGVzcGFjZShjKSl7XG5cdFx0dGhpcy5fY2JzLm9uYXR0cmliZW5kKCk7XG5cdFx0dGhpcy5fc3RhdGUgPSBJTl9BVFRSSUJVVEVfTkFNRTtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleDtcblx0fVxufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVCZWZvcmVBdHRyaWJ1dGVWYWx1ZSA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIlxcXCJcIil7XG5cdFx0dGhpcy5fc3RhdGUgPSBJTl9BVFRSSUJVVEVfVkFMVUVfRFE7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXggKyAxO1xuXHR9IGVsc2UgaWYoYyA9PT0gXCInXCIpe1xuXHRcdHRoaXMuX3N0YXRlID0gSU5fQVRUUklCVVRFX1ZBTFVFX1NRO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4ICsgMTtcblx0fSBlbHNlIGlmKCF3aGl0ZXNwYWNlKGMpKXtcblx0XHR0aGlzLl9zdGF0ZSA9IElOX0FUVFJJQlVURV9WQUxVRV9OUTtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleDtcblx0fVxufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVJbkF0dHJpYnV0ZVZhbHVlRG91YmxlUXVvdGVzID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiXFxcIlwiKXtcblx0XHR0aGlzLl9lbWl0VG9rZW4oXCJvbmF0dHJpYmRhdGFcIik7XG5cdFx0dGhpcy5fY2JzLm9uYXR0cmliZW5kKCk7XG5cdFx0dGhpcy5fc3RhdGUgPSBCRUZPUkVfQVRUUklCVVRFX05BTUU7XG5cdH0gZWxzZSBpZih0aGlzLl9kZWNvZGVFbnRpdGllcyAmJiBjID09PSBcIiZcIil7XG5cdFx0dGhpcy5fZW1pdFRva2VuKFwib25hdHRyaWJkYXRhXCIpO1xuXHRcdHRoaXMuX2Jhc2VTdGF0ZSA9IHRoaXMuX3N0YXRlO1xuXHRcdHRoaXMuX3N0YXRlID0gQkVGT1JFX0VOVElUWTtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleDtcblx0fVxufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVJbkF0dHJpYnV0ZVZhbHVlU2luZ2xlUXVvdGVzID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiJ1wiKXtcblx0XHR0aGlzLl9lbWl0VG9rZW4oXCJvbmF0dHJpYmRhdGFcIik7XG5cdFx0dGhpcy5fY2JzLm9uYXR0cmliZW5kKCk7XG5cdFx0dGhpcy5fc3RhdGUgPSBCRUZPUkVfQVRUUklCVVRFX05BTUU7XG5cdH0gZWxzZSBpZih0aGlzLl9kZWNvZGVFbnRpdGllcyAmJiBjID09PSBcIiZcIil7XG5cdFx0dGhpcy5fZW1pdFRva2VuKFwib25hdHRyaWJkYXRhXCIpO1xuXHRcdHRoaXMuX2Jhc2VTdGF0ZSA9IHRoaXMuX3N0YXRlO1xuXHRcdHRoaXMuX3N0YXRlID0gQkVGT1JFX0VOVElUWTtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleDtcblx0fVxufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVJbkF0dHJpYnV0ZVZhbHVlTm9RdW90ZXMgPSBmdW5jdGlvbihjKXtcblx0aWYod2hpdGVzcGFjZShjKSB8fCBjID09PSBcIj5cIil7XG5cdFx0dGhpcy5fZW1pdFRva2VuKFwib25hdHRyaWJkYXRhXCIpO1xuXHRcdHRoaXMuX2Nicy5vbmF0dHJpYmVuZCgpO1xuXHRcdHRoaXMuX3N0YXRlID0gQkVGT1JFX0FUVFJJQlVURV9OQU1FO1xuXHRcdHRoaXMuX2luZGV4LS07XG5cdH0gZWxzZSBpZih0aGlzLl9kZWNvZGVFbnRpdGllcyAmJiBjID09PSBcIiZcIil7XG5cdFx0dGhpcy5fZW1pdFRva2VuKFwib25hdHRyaWJkYXRhXCIpO1xuXHRcdHRoaXMuX2Jhc2VTdGF0ZSA9IHRoaXMuX3N0YXRlO1xuXHRcdHRoaXMuX3N0YXRlID0gQkVGT1JFX0VOVElUWTtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleDtcblx0fVxufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVCZWZvcmVEZWNsYXJhdGlvbiA9IGZ1bmN0aW9uKGMpe1xuXHR0aGlzLl9zdGF0ZSA9IGMgPT09IFwiW1wiID8gQkVGT1JFX0NEQVRBXzEgOlxuXHRcdFx0XHRcdGMgPT09IFwiLVwiID8gQkVGT1JFX0NPTU1FTlQgOlxuXHRcdFx0XHRcdFx0SU5fREVDTEFSQVRJT047XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUluRGVjbGFyYXRpb24gPSBmdW5jdGlvbihjKXtcblx0aWYoYyA9PT0gXCI+XCIpe1xuXHRcdHRoaXMuX2Nicy5vbmRlY2xhcmF0aW9uKHRoaXMuX2dldFNlY3Rpb24oKSk7XG5cdFx0dGhpcy5fc3RhdGUgPSBURVhUO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4ICsgMTtcblx0fVxufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVJblByb2Nlc3NpbmdJbnN0cnVjdGlvbiA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIj5cIil7XG5cdFx0dGhpcy5fY2JzLm9ucHJvY2Vzc2luZ2luc3RydWN0aW9uKHRoaXMuX2dldFNlY3Rpb24oKSk7XG5cdFx0dGhpcy5fc3RhdGUgPSBURVhUO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4ICsgMTtcblx0fVxufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVCZWZvcmVDb21tZW50ID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiLVwiKXtcblx0XHR0aGlzLl9zdGF0ZSA9IElOX0NPTU1FTlQ7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXggKyAxO1xuXHR9IGVsc2Uge1xuXHRcdHRoaXMuX3N0YXRlID0gSU5fREVDTEFSQVRJT047XG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlSW5Db21tZW50ID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiLVwiKSB0aGlzLl9zdGF0ZSA9IEFGVEVSX0NPTU1FTlRfMTtcbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQWZ0ZXJDb21tZW50MSA9IGlmRWxzZVN0YXRlKFwiLVwiLCBBRlRFUl9DT01NRU5UXzIsIElOX0NPTU1FTlQpO1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUFmdGVyQ29tbWVudDIgPSBmdW5jdGlvbihjKXtcblx0aWYoYyA9PT0gXCI+XCIpe1xuXHRcdC8vcmVtb3ZlIDIgdHJhaWxpbmcgY2hhcnNcblx0XHR0aGlzLl9jYnMub25jb21tZW50KHRoaXMuX2J1ZmZlci5zdWJzdHJpbmcodGhpcy5fc2VjdGlvblN0YXJ0LCB0aGlzLl9pbmRleCAtIDIpKTtcblx0XHR0aGlzLl9zdGF0ZSA9IFRFWFQ7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXggKyAxO1xuXHR9IGVsc2UgaWYoYyAhPT0gXCItXCIpe1xuXHRcdHRoaXMuX3N0YXRlID0gSU5fQ09NTUVOVDtcblx0fVxuXHQvLyBlbHNlOiBzdGF5IGluIEFGVEVSX0NPTU1FTlRfMiAoYC0tLT5gKVxufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVCZWZvcmVDZGF0YTEgPSBpZkVsc2VTdGF0ZShcIkNcIiwgQkVGT1JFX0NEQVRBXzIsIElOX0RFQ0xBUkFUSU9OKTtcblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlQ2RhdGEyID0gaWZFbHNlU3RhdGUoXCJEXCIsIEJFRk9SRV9DREFUQV8zLCBJTl9ERUNMQVJBVElPTik7XG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUJlZm9yZUNkYXRhMyA9IGlmRWxzZVN0YXRlKFwiQVwiLCBCRUZPUkVfQ0RBVEFfNCwgSU5fREVDTEFSQVRJT04pO1xuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVCZWZvcmVDZGF0YTQgPSBpZkVsc2VTdGF0ZShcIlRcIiwgQkVGT1JFX0NEQVRBXzUsIElOX0RFQ0xBUkFUSU9OKTtcblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlQ2RhdGE1ID0gaWZFbHNlU3RhdGUoXCJBXCIsIEJFRk9SRV9DREFUQV82LCBJTl9ERUNMQVJBVElPTik7XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlQ2RhdGE2ID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiW1wiKXtcblx0XHR0aGlzLl9zdGF0ZSA9IElOX0NEQVRBO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4ICsgMTtcblx0fSBlbHNlIHtcblx0XHR0aGlzLl9zdGF0ZSA9IElOX0RFQ0xBUkFUSU9OO1xuXHR9XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUluQ2RhdGEgPSBmdW5jdGlvbihjKXtcblx0aWYoYyA9PT0gXCJdXCIpIHRoaXMuX3N0YXRlID0gQUZURVJfQ0RBVEFfMTtcbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQWZ0ZXJDZGF0YTEgPSBpZkVsc2VTdGF0ZShcIl1cIiwgQUZURVJfQ0RBVEFfMiwgSU5fQ0RBVEEpO1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUFmdGVyQ2RhdGEyID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiPlwiKXtcblx0XHQvL3JlbW92ZSAyIHRyYWlsaW5nIGNoYXJzXG5cdFx0dGhpcy5fY2JzLm9uY2RhdGEodGhpcy5fYnVmZmVyLnN1YnN0cmluZyh0aGlzLl9zZWN0aW9uU3RhcnQsIHRoaXMuX2luZGV4IC0gMikpO1xuXHRcdHRoaXMuX3N0YXRlID0gVEVYVDtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleCArIDE7XG5cdH0gZWxzZSBpZiAoYyAhPT0gXCJdXCIpIHtcblx0XHR0aGlzLl9zdGF0ZSA9IElOX0NEQVRBO1xuXHR9XG5cdC8vZWxzZTogc3RheSBpbiBBRlRFUl9DREFUQV8yIChgXV1dPmApXG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUJlZm9yZVNwZWNpYWwgPSBmdW5jdGlvbihjKXtcblx0aWYoYyA9PT0gXCJjXCIgfHwgYyA9PT0gXCJDXCIpe1xuXHRcdHRoaXMuX3N0YXRlID0gQkVGT1JFX1NDUklQVF8xO1xuXHR9IGVsc2UgaWYoYyA9PT0gXCJ0XCIgfHwgYyA9PT0gXCJUXCIpe1xuXHRcdHRoaXMuX3N0YXRlID0gQkVGT1JFX1NUWUxFXzE7XG5cdH0gZWxzZSB7XG5cdFx0dGhpcy5fc3RhdGUgPSBJTl9UQUdfTkFNRTtcblx0XHR0aGlzLl9pbmRleC0tOyAvL2NvbnN1bWUgdGhlIHRva2VuIGFnYWluXG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlU3BlY2lhbEVuZCA9IGZ1bmN0aW9uKGMpe1xuXHRpZih0aGlzLl9zcGVjaWFsID09PSBTUEVDSUFMX1NDUklQVCAmJiAoYyA9PT0gXCJjXCIgfHwgYyA9PT0gXCJDXCIpKXtcblx0XHR0aGlzLl9zdGF0ZSA9IEFGVEVSX1NDUklQVF8xO1xuXHR9IGVsc2UgaWYodGhpcy5fc3BlY2lhbCA9PT0gU1BFQ0lBTF9TVFlMRSAmJiAoYyA9PT0gXCJ0XCIgfHwgYyA9PT0gXCJUXCIpKXtcblx0XHR0aGlzLl9zdGF0ZSA9IEFGVEVSX1NUWUxFXzE7XG5cdH1cblx0ZWxzZSB0aGlzLl9zdGF0ZSA9IFRFWFQ7XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUJlZm9yZVNjcmlwdDEgPSBjb25zdW1lU3BlY2lhbE5hbWVDaGFyKFwiUlwiLCBCRUZPUkVfU0NSSVBUXzIpO1xuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVCZWZvcmVTY3JpcHQyID0gY29uc3VtZVNwZWNpYWxOYW1lQ2hhcihcIklcIiwgQkVGT1JFX1NDUklQVF8zKTtcblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlU2NyaXB0MyA9IGNvbnN1bWVTcGVjaWFsTmFtZUNoYXIoXCJQXCIsIEJFRk9SRV9TQ1JJUFRfNCk7XG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUJlZm9yZVNjcmlwdDQgPSBjb25zdW1lU3BlY2lhbE5hbWVDaGFyKFwiVFwiLCBCRUZPUkVfU0NSSVBUXzUpO1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUJlZm9yZVNjcmlwdDUgPSBmdW5jdGlvbihjKXtcblx0aWYoYyA9PT0gXCIvXCIgfHwgYyA9PT0gXCI+XCIgfHwgd2hpdGVzcGFjZShjKSl7XG5cdFx0dGhpcy5fc3BlY2lhbCA9IFNQRUNJQUxfU0NSSVBUO1xuXHR9XG5cdHRoaXMuX3N0YXRlID0gSU5fVEFHX05BTUU7XG5cdHRoaXMuX2luZGV4LS07IC8vY29uc3VtZSB0aGUgdG9rZW4gYWdhaW5cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQWZ0ZXJTY3JpcHQxID0gaWZFbHNlU3RhdGUoXCJSXCIsIEFGVEVSX1NDUklQVF8yLCBURVhUKTtcblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQWZ0ZXJTY3JpcHQyID0gaWZFbHNlU3RhdGUoXCJJXCIsIEFGVEVSX1NDUklQVF8zLCBURVhUKTtcblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQWZ0ZXJTY3JpcHQzID0gaWZFbHNlU3RhdGUoXCJQXCIsIEFGVEVSX1NDUklQVF80LCBURVhUKTtcblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQWZ0ZXJTY3JpcHQ0ID0gaWZFbHNlU3RhdGUoXCJUXCIsIEFGVEVSX1NDUklQVF81LCBURVhUKTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVBZnRlclNjcmlwdDUgPSBmdW5jdGlvbihjKXtcblx0aWYoYyA9PT0gXCI+XCIgfHwgd2hpdGVzcGFjZShjKSl7XG5cdFx0dGhpcy5fc3BlY2lhbCA9IFNQRUNJQUxfTk9ORTtcblx0XHR0aGlzLl9zdGF0ZSA9IElOX0NMT1NJTkdfVEFHX05BTUU7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXggLSA2O1xuXHRcdHRoaXMuX2luZGV4LS07IC8vcmVjb25zdW1lIHRoZSB0b2tlblxuXHR9XG5cdGVsc2UgdGhpcy5fc3RhdGUgPSBURVhUO1xufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVCZWZvcmVTdHlsZTEgPSBjb25zdW1lU3BlY2lhbE5hbWVDaGFyKFwiWVwiLCBCRUZPUkVfU1RZTEVfMik7XG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUJlZm9yZVN0eWxlMiA9IGNvbnN1bWVTcGVjaWFsTmFtZUNoYXIoXCJMXCIsIEJFRk9SRV9TVFlMRV8zKTtcblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQmVmb3JlU3R5bGUzID0gY29uc3VtZVNwZWNpYWxOYW1lQ2hhcihcIkVcIiwgQkVGT1JFX1NUWUxFXzQpO1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUJlZm9yZVN0eWxlNCA9IGZ1bmN0aW9uKGMpe1xuXHRpZihjID09PSBcIi9cIiB8fCBjID09PSBcIj5cIiB8fCB3aGl0ZXNwYWNlKGMpKXtcblx0XHR0aGlzLl9zcGVjaWFsID0gU1BFQ0lBTF9TVFlMRTtcblx0fVxuXHR0aGlzLl9zdGF0ZSA9IElOX1RBR19OQU1FO1xuXHR0aGlzLl9pbmRleC0tOyAvL2NvbnN1bWUgdGhlIHRva2VuIGFnYWluXG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUFmdGVyU3R5bGUxID0gaWZFbHNlU3RhdGUoXCJZXCIsIEFGVEVSX1NUWUxFXzIsIFRFWFQpO1xuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVBZnRlclN0eWxlMiA9IGlmRWxzZVN0YXRlKFwiTFwiLCBBRlRFUl9TVFlMRV8zLCBURVhUKTtcblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQWZ0ZXJTdHlsZTMgPSBpZkVsc2VTdGF0ZShcIkVcIiwgQUZURVJfU1RZTEVfNCwgVEVYVCk7XG5cblRva2VuaXplci5wcm90b3R5cGUuX3N0YXRlQWZ0ZXJTdHlsZTQgPSBmdW5jdGlvbihjKXtcblx0aWYoYyA9PT0gXCI+XCIgfHwgd2hpdGVzcGFjZShjKSl7XG5cdFx0dGhpcy5fc3BlY2lhbCA9IFNQRUNJQUxfTk9ORTtcblx0XHR0aGlzLl9zdGF0ZSA9IElOX0NMT1NJTkdfVEFHX05BTUU7XG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gdGhpcy5faW5kZXggLSA1O1xuXHRcdHRoaXMuX2luZGV4LS07IC8vcmVjb25zdW1lIHRoZSB0b2tlblxuXHR9XG5cdGVsc2UgdGhpcy5fc3RhdGUgPSBURVhUO1xufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVCZWZvcmVFbnRpdHkgPSBpZkVsc2VTdGF0ZShcIiNcIiwgQkVGT1JFX05VTUVSSUNfRU5USVRZLCBJTl9OQU1FRF9FTlRJVFkpO1xuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVCZWZvcmVOdW1lcmljRW50aXR5ID0gaWZFbHNlU3RhdGUoXCJYXCIsIElOX0hFWF9FTlRJVFksIElOX05VTUVSSUNfRU5USVRZKTtcblxuLy9mb3IgZW50aXRpZXMgd2l0aGluIGF0dHJpYnV0ZXNcblRva2VuaXplci5wcm90b3R5cGUuX3BhcnNlTmFtZWRFbnRpdHlTdHJpY3QgPSBmdW5jdGlvbigpe1xuXHQvL29mZnNldCA9IDFcblx0aWYodGhpcy5fc2VjdGlvblN0YXJ0ICsgMSA8IHRoaXMuX2luZGV4KXtcblx0XHR2YXIgZW50aXR5ID0gdGhpcy5fYnVmZmVyLnN1YnN0cmluZyh0aGlzLl9zZWN0aW9uU3RhcnQgKyAxLCB0aGlzLl9pbmRleCksXG5cdFx0ICAgIG1hcCA9IHRoaXMuX3htbE1vZGUgPyB4bWxNYXAgOiBlbnRpdHlNYXA7XG5cblx0XHRpZihtYXAuaGFzT3duUHJvcGVydHkoZW50aXR5KSl7XG5cdFx0XHR0aGlzLl9lbWl0UGFydGlhbChtYXBbZW50aXR5XSk7XG5cdFx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgPSB0aGlzLl9pbmRleCArIDE7XG5cdFx0fVxuXHR9XG59O1xuXG5cbi8vcGFyc2VzIGxlZ2FjeSBlbnRpdGllcyAod2l0aG91dCB0cmFpbGluZyBzZW1pY29sb24pXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9wYXJzZUxlZ2FjeUVudGl0eSA9IGZ1bmN0aW9uKCl7XG5cdHZhciBzdGFydCA9IHRoaXMuX3NlY3Rpb25TdGFydCArIDEsXG5cdCAgICBsaW1pdCA9IHRoaXMuX2luZGV4IC0gc3RhcnQ7XG5cblx0aWYobGltaXQgPiA2KSBsaW1pdCA9IDY7IC8vdGhlIG1heCBsZW5ndGggb2YgbGVnYWN5IGVudGl0aWVzIGlzIDZcblxuXHR3aGlsZShsaW1pdCA+PSAyKXsgLy90aGUgbWluIGxlbmd0aCBvZiBsZWdhY3kgZW50aXRpZXMgaXMgMlxuXHRcdHZhciBlbnRpdHkgPSB0aGlzLl9idWZmZXIuc3Vic3RyKHN0YXJ0LCBsaW1pdCk7XG5cblx0XHRpZihsZWdhY3lNYXAuaGFzT3duUHJvcGVydHkoZW50aXR5KSl7XG5cdFx0XHR0aGlzLl9lbWl0UGFydGlhbChsZWdhY3lNYXBbZW50aXR5XSk7XG5cdFx0XHR0aGlzLl9zZWN0aW9uU3RhcnQgKz0gbGltaXQgKyAyO1xuXHRcdFx0YnJlYWs7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGxpbWl0LS07XG5cdFx0fVxuXHR9XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUluTmFtZWRFbnRpdHkgPSBmdW5jdGlvbihjKXtcblx0aWYoYyA9PT0gXCI7XCIpe1xuXHRcdHRoaXMuX3BhcnNlTmFtZWRFbnRpdHlTdHJpY3QoKTtcblx0XHRpZih0aGlzLl9zZWN0aW9uU3RhcnQgKyAxIDwgdGhpcy5faW5kZXggJiYgIXRoaXMuX3htbE1vZGUpe1xuXHRcdFx0dGhpcy5fcGFyc2VMZWdhY3lFbnRpdHkoKTtcblx0XHR9XG5cdFx0dGhpcy5fc3RhdGUgPSB0aGlzLl9iYXNlU3RhdGU7XG5cdH0gZWxzZSBpZigoYyA8IFwiYVwiIHx8IGMgPiBcInpcIikgJiYgKGMgPCBcIkFcIiB8fCBjID4gXCJaXCIpICYmIChjIDwgXCIwXCIgfHwgYyA+IFwiOVwiKSl7XG5cdFx0aWYodGhpcy5feG1sTW9kZSk7XG5cdFx0ZWxzZSBpZih0aGlzLl9iYXNlU3RhdGUgIT09IFRFWFQpe1xuXHRcdFx0aWYoYyAhPT0gXCI9XCIpe1xuXHRcdFx0XHR0aGlzLl9wYXJzZU5hbWVkRW50aXR5U3RyaWN0KCk7XG5cdFx0XHRcdHRoaXMuX3NlY3Rpb25TdGFydC0tOyAvL2luY2x1ZGUgdGhlIGN1cnJlbnQgY2hhcmFjdGVyIGluIHRoZSBzZWN0aW9uXG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuX3BhcnNlTGVnYWN5RW50aXR5KCk7XG5cdFx0XHR0aGlzLl9zZWN0aW9uU3RhcnQtLTtcblx0XHR9XG5cdFx0dGhpcy5fc3RhdGUgPSB0aGlzLl9iYXNlU3RhdGU7XG5cdFx0dGhpcy5faW5kZXgtLTtcblx0fVxufTtcblxuLy8gbW9kaWZpZWQgdmVyc2lvbiBvZiBodHRwczovL2dpdGh1Yi5jb20vbWF0aGlhc2J5bmVucy9oZS9ibG9iL21hc3Rlci9zcmMvaGUuanMjTDk0LUwxMTlcbmZ1bmN0aW9uIGRlY29kZUNvZGVQb2ludChjb2RlUG9pbnQpe1xuXHR2YXIgb3V0cHV0ID0gXCJcIjtcblxuXHRpZigoY29kZVBvaW50ID49IDB4RDgwMCAmJiBjb2RlUG9pbnQgPD0gMHhERkZGKSB8fCBjb2RlUG9pbnQgPiAweDEwRkZGRil7XG5cdFx0cmV0dXJuIFwiXFx1RkZGRFwiO1xuXHR9XG5cblx0aWYoY29kZVBvaW50IGluIGRlY29kZU1hcCl7XG5cdFx0Y29kZVBvaW50ID0gZGVjb2RlTWFwW2NvZGVQb2ludF07XG5cdH1cblxuXHRpZihjb2RlUG9pbnQgPiAweEZGRkYpe1xuXHRcdGNvZGVQb2ludCAtPSAweDEwMDAwO1xuXHRcdG91dHB1dCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGNvZGVQb2ludCA+Pj4gMTAgJiAweDNGRiB8IDB4RDgwMCk7XG5cdFx0Y29kZVBvaW50ID0gMHhEQzAwIHwgY29kZVBvaW50ICYgMHgzRkY7XG5cdH1cblxuXHRvdXRwdXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShjb2RlUG9pbnQpO1xuXHRyZXR1cm4gb3V0cHV0O1xufVxuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9kZWNvZGVOdW1lcmljRW50aXR5ID0gZnVuY3Rpb24ob2Zmc2V0LCBiYXNlKXtcblx0dmFyIHNlY3Rpb25TdGFydCA9IHRoaXMuX3NlY3Rpb25TdGFydCArIG9mZnNldDtcblxuXHRpZihzZWN0aW9uU3RhcnQgIT09IHRoaXMuX2luZGV4KXtcblx0XHQvL3BhcnNlIGVudGl0eVxuXHRcdHZhciBlbnRpdHkgPSB0aGlzLl9idWZmZXIuc3Vic3RyaW5nKHNlY3Rpb25TdGFydCwgdGhpcy5faW5kZXgpO1xuXHRcdHZhciBwYXJzZWQgPSBwYXJzZUludChlbnRpdHksIGJhc2UpO1xuXG5cdFx0aWYocGFyc2VkID09PSBwYXJzZWQpeyAvL25vdCBOYU4gKFRPRE86IHdoZW4gY2FuIHRoaXMgaGFwcGVuPylcblx0XHRcdHRoaXMuX2VtaXRQYXJ0aWFsKGRlY29kZUNvZGVQb2ludChwYXJzZWQpKTtcblx0XHRcdHRoaXMuX3NlY3Rpb25TdGFydCA9IHRoaXMuX2luZGV4O1xuXHRcdH1cblx0fVxuXG5cdHRoaXMuX3N0YXRlID0gdGhpcy5fYmFzZVN0YXRlO1xufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5fc3RhdGVJbk51bWVyaWNFbnRpdHkgPSBmdW5jdGlvbihjKXtcblx0aWYoYyA9PT0gXCI7XCIpe1xuXHRcdHRoaXMuX2RlY29kZU51bWVyaWNFbnRpdHkoMiwgMTApO1xuXHRcdHRoaXMuX3NlY3Rpb25TdGFydCsrO1xuXHR9IGVsc2UgaWYoYyA8IFwiMFwiIHx8IGMgPiBcIjlcIil7XG5cdFx0aWYoIXRoaXMuX3htbE1vZGUpe1xuXHRcdFx0dGhpcy5fZGVjb2RlTnVtZXJpY0VudGl0eSgyLCAxMCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuX3N0YXRlID0gdGhpcy5fYmFzZVN0YXRlO1xuXHRcdH1cblx0XHR0aGlzLl9pbmRleC0tO1xuXHR9XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9zdGF0ZUluSGV4RW50aXR5ID0gZnVuY3Rpb24oYyl7XG5cdGlmKGMgPT09IFwiO1wiKXtcblx0XHR0aGlzLl9kZWNvZGVOdW1lcmljRW50aXR5KDMsIDE2KTtcblx0XHR0aGlzLl9zZWN0aW9uU3RhcnQrKztcblx0fSBlbHNlIGlmKChjIDwgXCJhXCIgfHwgYyA+IFwiZlwiKSAmJiAoYyA8IFwiQVwiIHx8IGMgPiBcIkZcIikgJiYgKGMgPCBcIjBcIiB8fCBjID4gXCI5XCIpKXtcblx0XHRpZighdGhpcy5feG1sTW9kZSl7XG5cdFx0XHR0aGlzLl9kZWNvZGVOdW1lcmljRW50aXR5KDMsIDE2KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5fc3RhdGUgPSB0aGlzLl9iYXNlU3RhdGU7XG5cdFx0fVxuXHRcdHRoaXMuX2luZGV4LS07XG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX2NsZWFudXAgPSBmdW5jdGlvbiAoKSB7XG5cdGlmKHRoaXMuX3NlY3Rpb25TdGFydCA8IDApe1xuXHRcdHRoaXMuX2J1ZmZlciA9IFwiXCI7XG5cdFx0dGhpcy5faW5kZXggPSAwO1xuXHR9IGVsc2Uge1xuXHRcdGlmKHRoaXMuX3N0YXRlID09PSBURVhUKXtcblx0XHRcdGlmKHRoaXMuX3NlY3Rpb25TdGFydCAhPT0gdGhpcy5faW5kZXgpe1xuXHRcdFx0XHR0aGlzLl9jYnMub250ZXh0KHRoaXMuX2J1ZmZlci5zdWJzdHIodGhpcy5fc2VjdGlvblN0YXJ0KSk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLl9idWZmZXIgPSBcIlwiO1xuXHRcdFx0dGhpcy5faW5kZXggPSAwO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zZWN0aW9uU3RhcnQgPT09IHRoaXMuX2luZGV4KXtcblx0XHRcdC8vdGhlIHNlY3Rpb24ganVzdCBzdGFydGVkXG5cdFx0XHR0aGlzLl9idWZmZXIgPSBcIlwiO1xuXHRcdFx0dGhpcy5faW5kZXggPSAwO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQvL3JlbW92ZSBldmVyeXRoaW5nIHVubmVjZXNzYXJ5XG5cdFx0XHR0aGlzLl9idWZmZXIgPSB0aGlzLl9idWZmZXIuc3Vic3RyKHRoaXMuX3NlY3Rpb25TdGFydCk7XG5cdFx0XHR0aGlzLl9pbmRleCAtPSB0aGlzLl9zZWN0aW9uU3RhcnQ7XG5cdFx0fVxuXG5cdFx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gMDtcblx0fVxufTtcblxuLy9UT0RPIG1ha2UgZXZlbnRzIGNvbmRpdGlvbmFsXG5Ub2tlbml6ZXIucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24oY2h1bmspe1xuXHR0aGlzLl9idWZmZXIgKz0gY2h1bms7XG5cblx0d2hpbGUodGhpcy5faW5kZXggPCB0aGlzLl9idWZmZXIubGVuZ3RoICYmIHRoaXMuX3J1bm5pbmcpe1xuXHRcdHZhciBjID0gdGhpcy5fYnVmZmVyLmNoYXJBdCh0aGlzLl9pbmRleCk7XG5cdFx0aWYodGhpcy5fc3RhdGUgPT09IFRFWFQpIHtcblx0XHRcdHRoaXMuX3N0YXRlVGV4dChjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9UQUdfTkFNRSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUJlZm9yZVRhZ05hbWUoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBJTl9UQUdfTkFNRSkge1xuXHRcdFx0dGhpcy5fc3RhdGVJblRhZ05hbWUoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfQ0xPU0lOR19UQUdfTkFNRSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUJlZm9yZUNsb3NlaW5nVGFnTmFtZShjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IElOX0NMT1NJTkdfVEFHX05BTUUpe1xuXHRcdFx0dGhpcy5fc3RhdGVJbkNsb3NlaW5nVGFnTmFtZShjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEFGVEVSX0NMT1NJTkdfVEFHX05BTUUpe1xuXHRcdFx0dGhpcy5fc3RhdGVBZnRlckNsb3NlaW5nVGFnTmFtZShjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IElOX1NFTEZfQ0xPU0lOR19UQUcpe1xuXHRcdFx0dGhpcy5fc3RhdGVJblNlbGZDbG9zaW5nVGFnKGMpO1xuXHRcdH1cblxuXHRcdC8qXG5cdFx0Klx0YXR0cmlidXRlc1xuXHRcdCovXG5cdFx0ZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQkVGT1JFX0FUVFJJQlVURV9OQU1FKXtcblx0XHRcdHRoaXMuX3N0YXRlQmVmb3JlQXR0cmlidXRlTmFtZShjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IElOX0FUVFJJQlVURV9OQU1FKXtcblx0XHRcdHRoaXMuX3N0YXRlSW5BdHRyaWJ1dGVOYW1lKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQUZURVJfQVRUUklCVVRFX05BTUUpe1xuXHRcdFx0dGhpcy5fc3RhdGVBZnRlckF0dHJpYnV0ZU5hbWUoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfQVRUUklCVVRFX1ZBTFVFKXtcblx0XHRcdHRoaXMuX3N0YXRlQmVmb3JlQXR0cmlidXRlVmFsdWUoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBJTl9BVFRSSUJVVEVfVkFMVUVfRFEpe1xuXHRcdFx0dGhpcy5fc3RhdGVJbkF0dHJpYnV0ZVZhbHVlRG91YmxlUXVvdGVzKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gSU5fQVRUUklCVVRFX1ZBTFVFX1NRKXtcblx0XHRcdHRoaXMuX3N0YXRlSW5BdHRyaWJ1dGVWYWx1ZVNpbmdsZVF1b3RlcyhjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IElOX0FUVFJJQlVURV9WQUxVRV9OUSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUluQXR0cmlidXRlVmFsdWVOb1F1b3RlcyhjKTtcblx0XHR9XG5cblx0XHQvKlxuXHRcdCpcdGRlY2xhcmF0aW9uc1xuXHRcdCovXG5cdFx0ZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQkVGT1JFX0RFQ0xBUkFUSU9OKXtcblx0XHRcdHRoaXMuX3N0YXRlQmVmb3JlRGVjbGFyYXRpb24oYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBJTl9ERUNMQVJBVElPTil7XG5cdFx0XHR0aGlzLl9zdGF0ZUluRGVjbGFyYXRpb24oYyk7XG5cdFx0fVxuXG5cdFx0Lypcblx0XHQqXHRwcm9jZXNzaW5nIGluc3RydWN0aW9uc1xuXHRcdCovXG5cdFx0ZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gSU5fUFJPQ0VTU0lOR19JTlNUUlVDVElPTil7XG5cdFx0XHR0aGlzLl9zdGF0ZUluUHJvY2Vzc2luZ0luc3RydWN0aW9uKGMpO1xuXHRcdH1cblxuXHRcdC8qXG5cdFx0Klx0Y29tbWVudHNcblx0XHQqL1xuXHRcdGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9DT01NRU5UKXtcblx0XHRcdHRoaXMuX3N0YXRlQmVmb3JlQ29tbWVudChjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IElOX0NPTU1FTlQpe1xuXHRcdFx0dGhpcy5fc3RhdGVJbkNvbW1lbnQoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBBRlRFUl9DT01NRU5UXzEpe1xuXHRcdFx0dGhpcy5fc3RhdGVBZnRlckNvbW1lbnQxKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQUZURVJfQ09NTUVOVF8yKXtcblx0XHRcdHRoaXMuX3N0YXRlQWZ0ZXJDb21tZW50MihjKTtcblx0XHR9XG5cblx0XHQvKlxuXHRcdCpcdGNkYXRhXG5cdFx0Ki9cblx0XHRlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfQ0RBVEFfMSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUJlZm9yZUNkYXRhMShjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9DREFUQV8yKXtcblx0XHRcdHRoaXMuX3N0YXRlQmVmb3JlQ2RhdGEyKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQkVGT1JFX0NEQVRBXzMpe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVDZGF0YTMoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfQ0RBVEFfNCl7XG5cdFx0XHR0aGlzLl9zdGF0ZUJlZm9yZUNkYXRhNChjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9DREFUQV81KXtcblx0XHRcdHRoaXMuX3N0YXRlQmVmb3JlQ2RhdGE1KGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQkVGT1JFX0NEQVRBXzYpe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVDZGF0YTYoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBJTl9DREFUQSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUluQ2RhdGEoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBBRlRFUl9DREFUQV8xKXtcblx0XHRcdHRoaXMuX3N0YXRlQWZ0ZXJDZGF0YTEoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBBRlRFUl9DREFUQV8yKXtcblx0XHRcdHRoaXMuX3N0YXRlQWZ0ZXJDZGF0YTIoYyk7XG5cdFx0fVxuXG5cdFx0Lypcblx0XHQqIHNwZWNpYWwgdGFnc1xuXHRcdCovXG5cdFx0ZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQkVGT1JFX1NQRUNJQUwpe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVTcGVjaWFsKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQkVGT1JFX1NQRUNJQUxfRU5EKXtcblx0XHRcdHRoaXMuX3N0YXRlQmVmb3JlU3BlY2lhbEVuZChjKTtcblx0XHR9XG5cblx0XHQvKlxuXHRcdCogc2NyaXB0XG5cdFx0Ki9cblx0XHRlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfU0NSSVBUXzEpe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVTY3JpcHQxKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQkVGT1JFX1NDUklQVF8yKXtcblx0XHRcdHRoaXMuX3N0YXRlQmVmb3JlU2NyaXB0MihjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9TQ1JJUFRfMyl7XG5cdFx0XHR0aGlzLl9zdGF0ZUJlZm9yZVNjcmlwdDMoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfU0NSSVBUXzQpe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVTY3JpcHQ0KGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQkVGT1JFX1NDUklQVF81KXtcblx0XHRcdHRoaXMuX3N0YXRlQmVmb3JlU2NyaXB0NShjKTtcblx0XHR9XG5cblx0XHRlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBBRlRFUl9TQ1JJUFRfMSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUFmdGVyU2NyaXB0MShjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEFGVEVSX1NDUklQVF8yKXtcblx0XHRcdHRoaXMuX3N0YXRlQWZ0ZXJTY3JpcHQyKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQUZURVJfU0NSSVBUXzMpe1xuXHRcdFx0dGhpcy5fc3RhdGVBZnRlclNjcmlwdDMoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBBRlRFUl9TQ1JJUFRfNCl7XG5cdFx0XHR0aGlzLl9zdGF0ZUFmdGVyU2NyaXB0NChjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEFGVEVSX1NDUklQVF81KXtcblx0XHRcdHRoaXMuX3N0YXRlQWZ0ZXJTY3JpcHQ1KGMpO1xuXHRcdH1cblxuXHRcdC8qXG5cdFx0KiBzdHlsZVxuXHRcdCovXG5cdFx0ZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQkVGT1JFX1NUWUxFXzEpe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVTdHlsZTEoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBCRUZPUkVfU1RZTEVfMil7XG5cdFx0XHR0aGlzLl9zdGF0ZUJlZm9yZVN0eWxlMihjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9TVFlMRV8zKXtcblx0XHRcdHRoaXMuX3N0YXRlQmVmb3JlU3R5bGUzKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQkVGT1JFX1NUWUxFXzQpe1xuXHRcdFx0dGhpcy5fc3RhdGVCZWZvcmVTdHlsZTQoYyk7XG5cdFx0fVxuXG5cdFx0ZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQUZURVJfU1RZTEVfMSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUFmdGVyU3R5bGUxKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQUZURVJfU1RZTEVfMil7XG5cdFx0XHR0aGlzLl9zdGF0ZUFmdGVyU3R5bGUyKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQUZURVJfU1RZTEVfMyl7XG5cdFx0XHR0aGlzLl9zdGF0ZUFmdGVyU3R5bGUzKGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQUZURVJfU1RZTEVfNCl7XG5cdFx0XHR0aGlzLl9zdGF0ZUFmdGVyU3R5bGU0KGMpO1xuXHRcdH1cblxuXHRcdC8qXG5cdFx0KiBlbnRpdGllc1xuXHRcdCovXG5cdFx0ZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQkVGT1JFX0VOVElUWSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUJlZm9yZUVudGl0eShjKTtcblx0XHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IEJFRk9SRV9OVU1FUklDX0VOVElUWSl7XG5cdFx0XHR0aGlzLl9zdGF0ZUJlZm9yZU51bWVyaWNFbnRpdHkoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBJTl9OQU1FRF9FTlRJVFkpe1xuXHRcdFx0dGhpcy5fc3RhdGVJbk5hbWVkRW50aXR5KGMpO1xuXHRcdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gSU5fTlVNRVJJQ19FTlRJVFkpe1xuXHRcdFx0dGhpcy5fc3RhdGVJbk51bWVyaWNFbnRpdHkoYyk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBJTl9IRVhfRU5USVRZKXtcblx0XHRcdHRoaXMuX3N0YXRlSW5IZXhFbnRpdHkoYyk7XG5cdFx0fVxuXG5cdFx0ZWxzZSB7XG5cdFx0XHR0aGlzLl9jYnMub25lcnJvcihFcnJvcihcInVua25vd24gX3N0YXRlXCIpLCB0aGlzLl9zdGF0ZSk7XG5cdFx0fVxuXG5cdFx0dGhpcy5faW5kZXgrKztcblx0fVxuXG5cdHRoaXMuX2NsZWFudXAoKTtcbn07XG5cblRva2VuaXplci5wcm90b3R5cGUucGF1c2UgPSBmdW5jdGlvbigpe1xuXHR0aGlzLl9ydW5uaW5nID0gZmFsc2U7XG59O1xuVG9rZW5pemVyLnByb3RvdHlwZS5yZXN1bWUgPSBmdW5jdGlvbigpe1xuXHR0aGlzLl9ydW5uaW5nID0gdHJ1ZTtcbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuZW5kID0gZnVuY3Rpb24oY2h1bmspe1xuXHRpZihjaHVuaykgdGhpcy53cml0ZShjaHVuayk7XG5cblx0Ly9pZiB0aGVyZSBpcyByZW1haW5pbmcgZGF0YSwgZW1pdCBpdCBpbiBhIHJlYXNvbmFibGUgd2F5XG5cdGlmKHRoaXMuX3NlY3Rpb25TdGFydCA8IHRoaXMuX2luZGV4KXtcblx0XHR0aGlzLl9oYW5kbGVUcmFpbGluZ0RhdGEoKTtcblx0fVxuXG5cdHRoaXMuX2Nicy5vbmVuZCgpO1xufTtcblxuVG9rZW5pemVyLnByb3RvdHlwZS5faGFuZGxlVHJhaWxpbmdEYXRhID0gZnVuY3Rpb24oKXtcblx0dmFyIGRhdGEgPSB0aGlzLl9idWZmZXIuc3Vic3RyKHRoaXMuX3NlY3Rpb25TdGFydCk7XG5cblx0aWYodGhpcy5fc3RhdGUgPT09IElOX0NEQVRBIHx8IHRoaXMuX3N0YXRlID09PSBBRlRFUl9DREFUQV8xIHx8IHRoaXMuX3N0YXRlID09PSBBRlRFUl9DREFUQV8yKXtcblx0XHR0aGlzLl9jYnMub25jZGF0YShkYXRhKTtcblx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBJTl9DT01NRU5UIHx8IHRoaXMuX3N0YXRlID09PSBBRlRFUl9DT01NRU5UXzEgfHwgdGhpcy5fc3RhdGUgPT09IEFGVEVSX0NPTU1FTlRfMil7XG5cdFx0dGhpcy5fY2JzLm9uY29tbWVudChkYXRhKTtcblx0fSBlbHNlIGlmKHRoaXMuX3N0YXRlID09PSBJTl9UQUdfTkFNRSl7XG5cdFx0dGhpcy5fY2JzLm9ub3BlbnRhZ25hbWUoZGF0YSk7XG5cdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gQkVGT1JFX0FUVFJJQlVURV9OQU1FIHx8IHRoaXMuX3N0YXRlID09PSBCRUZPUkVfQVRUUklCVVRFX1ZBTFVFIHx8IHRoaXMuX3N0YXRlID09PSBBRlRFUl9BVFRSSUJVVEVfTkFNRSl7XG5cdFx0dGhpcy5fY2JzLm9ub3BlbnRhZ2VuZCgpO1xuXHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IElOX0FUVFJJQlVURV9OQU1FKXtcblx0XHR0aGlzLl9jYnMub25hdHRyaWJuYW1lKGRhdGEpO1xuXHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IElOX0FUVFJJQlVURV9WQUxVRV9TUSB8fCB0aGlzLl9zdGF0ZSA9PT0gSU5fQVRUUklCVVRFX1ZBTFVFX0RRIHx8IHRoaXMuX3N0YXRlID09PSBJTl9BVFRSSUJVVEVfVkFMVUVfTlEpe1xuXHRcdHRoaXMuX2Nicy5vbmF0dHJpYmRhdGEoZGF0YSk7XG5cdFx0dGhpcy5fY2JzLm9uYXR0cmliZW5kKCk7XG5cdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gSU5fQ0xPU0lOR19UQUdfTkFNRSl7XG5cdFx0dGhpcy5fY2JzLm9uY2xvc2V0YWcoZGF0YSk7XG5cdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gSU5fTkFNRURfRU5USVRZICYmICF0aGlzLl94bWxNb2RlKXtcblx0XHR0aGlzLl9wYXJzZUxlZ2FjeUVudGl0eSgpO1xuXHRcdGlmKC0tdGhpcy5fc2VjdGlvblN0YXJ0IDwgdGhpcy5faW5kZXgpe1xuXHRcdFx0dGhpcy5fc3RhdGUgPSB0aGlzLl9iYXNlU3RhdGU7XG5cdFx0XHR0aGlzLl9oYW5kbGVUcmFpbGluZ0RhdGEoKTtcblx0XHR9XG5cdH0gZWxzZSBpZih0aGlzLl9zdGF0ZSA9PT0gSU5fTlVNRVJJQ19FTlRJVFkgJiYgIXRoaXMuX3htbE1vZGUpe1xuXHRcdHRoaXMuX2RlY29kZU51bWVyaWNFbnRpdHkoMiwgMTApO1xuXHRcdGlmKHRoaXMuX3NlY3Rpb25TdGFydCA8IHRoaXMuX2luZGV4KXtcblx0XHRcdHRoaXMuX3N0YXRlID0gdGhpcy5fYmFzZVN0YXRlO1xuXHRcdFx0dGhpcy5faGFuZGxlVHJhaWxpbmdEYXRhKCk7XG5cdFx0fVxuXHR9IGVsc2UgaWYodGhpcy5fc3RhdGUgPT09IElOX0hFWF9FTlRJVFkgJiYgIXRoaXMuX3htbE1vZGUpe1xuXHRcdHRoaXMuX2RlY29kZU51bWVyaWNFbnRpdHkoMywgMTYpO1xuXHRcdGlmKHRoaXMuX3NlY3Rpb25TdGFydCA8IHRoaXMuX2luZGV4KXtcblx0XHRcdHRoaXMuX3N0YXRlID0gdGhpcy5fYmFzZVN0YXRlO1xuXHRcdFx0dGhpcy5faGFuZGxlVHJhaWxpbmdEYXRhKCk7XG5cdFx0fVxuXHR9IGVsc2Uge1xuXHRcdHRoaXMuX2Nicy5vbnRleHQoZGF0YSk7XG5cdH1cbn07XG5cblRva2VuaXplci5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbigpe1xuXHRUb2tlbml6ZXIuY2FsbCh0aGlzLCB7eG1sTW9kZTogdGhpcy5feG1sTW9kZSwgZGVjb2RlRW50aXRpZXM6IHRoaXMuX2RlY29kZUVudGl0aWVzfSwgdGhpcy5fY2JzKTtcbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX2dldFNlY3Rpb24gPSBmdW5jdGlvbigpe1xuXHRyZXR1cm4gdGhpcy5fYnVmZmVyLnN1YnN0cmluZyh0aGlzLl9zZWN0aW9uU3RhcnQsIHRoaXMuX2luZGV4KTtcbn07XG5cblRva2VuaXplci5wcm90b3R5cGUuX2VtaXRUb2tlbiA9IGZ1bmN0aW9uKG5hbWUpe1xuXHR0aGlzLl9jYnNbbmFtZV0odGhpcy5fZ2V0U2VjdGlvbigpKTtcblx0dGhpcy5fc2VjdGlvblN0YXJ0ID0gLTE7XG59O1xuXG5Ub2tlbml6ZXIucHJvdG90eXBlLl9lbWl0UGFydGlhbCA9IGZ1bmN0aW9uKHZhbHVlKXtcblx0aWYodGhpcy5fYmFzZVN0YXRlICE9PSBURVhUKXtcblx0XHR0aGlzLl9jYnMub25hdHRyaWJkYXRhKHZhbHVlKTsgLy9UT0RPIGltcGxlbWVudCB0aGUgbmV3IGV2ZW50XG5cdH0gZWxzZSB7XG5cdFx0dGhpcy5fY2JzLm9udGV4dCh2YWx1ZSk7XG5cdH1cbn07XG4iLCJtb2R1bGUuZXhwb3J0cz17XCIwXCI6XCJcXHVGRkZEXCIsXCIxMjhcIjpcIlxcdTIwQUNcIixcIjEzMFwiOlwiXFx1MjAxQVwiLFwiMTMxXCI6XCJcXHUwMTkyXCIsXCIxMzJcIjpcIlxcdTIwMUVcIixcIjEzM1wiOlwiXFx1MjAyNlwiLFwiMTM0XCI6XCJcXHUyMDIwXCIsXCIxMzVcIjpcIlxcdTIwMjFcIixcIjEzNlwiOlwiXFx1MDJDNlwiLFwiMTM3XCI6XCJcXHUyMDMwXCIsXCIxMzhcIjpcIlxcdTAxNjBcIixcIjEzOVwiOlwiXFx1MjAzOVwiLFwiMTQwXCI6XCJcXHUwMTUyXCIsXCIxNDJcIjpcIlxcdTAxN0RcIixcIjE0NVwiOlwiXFx1MjAxOFwiLFwiMTQ2XCI6XCJcXHUyMDE5XCIsXCIxNDdcIjpcIlxcdTIwMUNcIixcIjE0OFwiOlwiXFx1MjAxRFwiLFwiMTQ5XCI6XCJcXHUyMDIyXCIsXCIxNTBcIjpcIlxcdTIwMTNcIixcIjE1MVwiOlwiXFx1MjAxNFwiLFwiMTUyXCI6XCJcXHUwMkRDXCIsXCIxNTNcIjpcIlxcdTIxMjJcIixcIjE1NFwiOlwiXFx1MDE2MVwiLFwiMTU1XCI6XCJcXHUyMDNBXCIsXCIxNTZcIjpcIlxcdTAxNTNcIixcIjE1OFwiOlwiXFx1MDE3RVwiLFwiMTU5XCI6XCJcXHUwMTc4XCJ9XG4iLCJtb2R1bGUuZXhwb3J0cz17XCJBYWN1dGVcIjpcIlxcdTAwQzFcIixcImFhY3V0ZVwiOlwiXFx1MDBFMVwiLFwiQWJyZXZlXCI6XCJcXHUwMTAyXCIsXCJhYnJldmVcIjpcIlxcdTAxMDNcIixcImFjXCI6XCJcXHUyMjNFXCIsXCJhY2RcIjpcIlxcdTIyM0ZcIixcImFjRVwiOlwiXFx1MjIzRVxcdTAzMzNcIixcIkFjaXJjXCI6XCJcXHUwMEMyXCIsXCJhY2lyY1wiOlwiXFx1MDBFMlwiLFwiYWN1dGVcIjpcIlxcdTAwQjRcIixcIkFjeVwiOlwiXFx1MDQxMFwiLFwiYWN5XCI6XCJcXHUwNDMwXCIsXCJBRWxpZ1wiOlwiXFx1MDBDNlwiLFwiYWVsaWdcIjpcIlxcdTAwRTZcIixcImFmXCI6XCJcXHUyMDYxXCIsXCJBZnJcIjpcIlxcdUQ4MzVcXHVERDA0XCIsXCJhZnJcIjpcIlxcdUQ4MzVcXHVERDFFXCIsXCJBZ3JhdmVcIjpcIlxcdTAwQzBcIixcImFncmF2ZVwiOlwiXFx1MDBFMFwiLFwiYWxlZnN5bVwiOlwiXFx1MjEzNVwiLFwiYWxlcGhcIjpcIlxcdTIxMzVcIixcIkFscGhhXCI6XCJcXHUwMzkxXCIsXCJhbHBoYVwiOlwiXFx1MDNCMVwiLFwiQW1hY3JcIjpcIlxcdTAxMDBcIixcImFtYWNyXCI6XCJcXHUwMTAxXCIsXCJhbWFsZ1wiOlwiXFx1MkEzRlwiLFwiYW1wXCI6XCImXCIsXCJBTVBcIjpcIiZcIixcImFuZGFuZFwiOlwiXFx1MkE1NVwiLFwiQW5kXCI6XCJcXHUyQTUzXCIsXCJhbmRcIjpcIlxcdTIyMjdcIixcImFuZGRcIjpcIlxcdTJBNUNcIixcImFuZHNsb3BlXCI6XCJcXHUyQTU4XCIsXCJhbmR2XCI6XCJcXHUyQTVBXCIsXCJhbmdcIjpcIlxcdTIyMjBcIixcImFuZ2VcIjpcIlxcdTI5QTRcIixcImFuZ2xlXCI6XCJcXHUyMjIwXCIsXCJhbmdtc2RhYVwiOlwiXFx1MjlBOFwiLFwiYW5nbXNkYWJcIjpcIlxcdTI5QTlcIixcImFuZ21zZGFjXCI6XCJcXHUyOUFBXCIsXCJhbmdtc2RhZFwiOlwiXFx1MjlBQlwiLFwiYW5nbXNkYWVcIjpcIlxcdTI5QUNcIixcImFuZ21zZGFmXCI6XCJcXHUyOUFEXCIsXCJhbmdtc2RhZ1wiOlwiXFx1MjlBRVwiLFwiYW5nbXNkYWhcIjpcIlxcdTI5QUZcIixcImFuZ21zZFwiOlwiXFx1MjIyMVwiLFwiYW5ncnRcIjpcIlxcdTIyMUZcIixcImFuZ3J0dmJcIjpcIlxcdTIyQkVcIixcImFuZ3J0dmJkXCI6XCJcXHUyOTlEXCIsXCJhbmdzcGhcIjpcIlxcdTIyMjJcIixcImFuZ3N0XCI6XCJcXHUwMEM1XCIsXCJhbmd6YXJyXCI6XCJcXHUyMzdDXCIsXCJBb2dvblwiOlwiXFx1MDEwNFwiLFwiYW9nb25cIjpcIlxcdTAxMDVcIixcIkFvcGZcIjpcIlxcdUQ4MzVcXHVERDM4XCIsXCJhb3BmXCI6XCJcXHVEODM1XFx1REQ1MlwiLFwiYXBhY2lyXCI6XCJcXHUyQTZGXCIsXCJhcFwiOlwiXFx1MjI0OFwiLFwiYXBFXCI6XCJcXHUyQTcwXCIsXCJhcGVcIjpcIlxcdTIyNEFcIixcImFwaWRcIjpcIlxcdTIyNEJcIixcImFwb3NcIjpcIidcIixcIkFwcGx5RnVuY3Rpb25cIjpcIlxcdTIwNjFcIixcImFwcHJveFwiOlwiXFx1MjI0OFwiLFwiYXBwcm94ZXFcIjpcIlxcdTIyNEFcIixcIkFyaW5nXCI6XCJcXHUwMEM1XCIsXCJhcmluZ1wiOlwiXFx1MDBFNVwiLFwiQXNjclwiOlwiXFx1RDgzNVxcdURDOUNcIixcImFzY3JcIjpcIlxcdUQ4MzVcXHVEQ0I2XCIsXCJBc3NpZ25cIjpcIlxcdTIyNTRcIixcImFzdFwiOlwiKlwiLFwiYXN5bXBcIjpcIlxcdTIyNDhcIixcImFzeW1wZXFcIjpcIlxcdTIyNERcIixcIkF0aWxkZVwiOlwiXFx1MDBDM1wiLFwiYXRpbGRlXCI6XCJcXHUwMEUzXCIsXCJBdW1sXCI6XCJcXHUwMEM0XCIsXCJhdW1sXCI6XCJcXHUwMEU0XCIsXCJhd2NvbmludFwiOlwiXFx1MjIzM1wiLFwiYXdpbnRcIjpcIlxcdTJBMTFcIixcImJhY2tjb25nXCI6XCJcXHUyMjRDXCIsXCJiYWNrZXBzaWxvblwiOlwiXFx1MDNGNlwiLFwiYmFja3ByaW1lXCI6XCJcXHUyMDM1XCIsXCJiYWNrc2ltXCI6XCJcXHUyMjNEXCIsXCJiYWNrc2ltZXFcIjpcIlxcdTIyQ0RcIixcIkJhY2tzbGFzaFwiOlwiXFx1MjIxNlwiLFwiQmFydlwiOlwiXFx1MkFFN1wiLFwiYmFydmVlXCI6XCJcXHUyMkJEXCIsXCJiYXJ3ZWRcIjpcIlxcdTIzMDVcIixcIkJhcndlZFwiOlwiXFx1MjMwNlwiLFwiYmFyd2VkZ2VcIjpcIlxcdTIzMDVcIixcImJicmtcIjpcIlxcdTIzQjVcIixcImJicmt0YnJrXCI6XCJcXHUyM0I2XCIsXCJiY29uZ1wiOlwiXFx1MjI0Q1wiLFwiQmN5XCI6XCJcXHUwNDExXCIsXCJiY3lcIjpcIlxcdTA0MzFcIixcImJkcXVvXCI6XCJcXHUyMDFFXCIsXCJiZWNhdXNcIjpcIlxcdTIyMzVcIixcImJlY2F1c2VcIjpcIlxcdTIyMzVcIixcIkJlY2F1c2VcIjpcIlxcdTIyMzVcIixcImJlbXB0eXZcIjpcIlxcdTI5QjBcIixcImJlcHNpXCI6XCJcXHUwM0Y2XCIsXCJiZXJub3VcIjpcIlxcdTIxMkNcIixcIkJlcm5vdWxsaXNcIjpcIlxcdTIxMkNcIixcIkJldGFcIjpcIlxcdTAzOTJcIixcImJldGFcIjpcIlxcdTAzQjJcIixcImJldGhcIjpcIlxcdTIxMzZcIixcImJldHdlZW5cIjpcIlxcdTIyNkNcIixcIkJmclwiOlwiXFx1RDgzNVxcdUREMDVcIixcImJmclwiOlwiXFx1RDgzNVxcdUREMUZcIixcImJpZ2NhcFwiOlwiXFx1MjJDMlwiLFwiYmlnY2lyY1wiOlwiXFx1MjVFRlwiLFwiYmlnY3VwXCI6XCJcXHUyMkMzXCIsXCJiaWdvZG90XCI6XCJcXHUyQTAwXCIsXCJiaWdvcGx1c1wiOlwiXFx1MkEwMVwiLFwiYmlnb3RpbWVzXCI6XCJcXHUyQTAyXCIsXCJiaWdzcWN1cFwiOlwiXFx1MkEwNlwiLFwiYmlnc3RhclwiOlwiXFx1MjYwNVwiLFwiYmlndHJpYW5nbGVkb3duXCI6XCJcXHUyNUJEXCIsXCJiaWd0cmlhbmdsZXVwXCI6XCJcXHUyNUIzXCIsXCJiaWd1cGx1c1wiOlwiXFx1MkEwNFwiLFwiYmlndmVlXCI6XCJcXHUyMkMxXCIsXCJiaWd3ZWRnZVwiOlwiXFx1MjJDMFwiLFwiYmthcm93XCI6XCJcXHUyOTBEXCIsXCJibGFja2xvemVuZ2VcIjpcIlxcdTI5RUJcIixcImJsYWNrc3F1YXJlXCI6XCJcXHUyNUFBXCIsXCJibGFja3RyaWFuZ2xlXCI6XCJcXHUyNUI0XCIsXCJibGFja3RyaWFuZ2xlZG93blwiOlwiXFx1MjVCRVwiLFwiYmxhY2t0cmlhbmdsZWxlZnRcIjpcIlxcdTI1QzJcIixcImJsYWNrdHJpYW5nbGVyaWdodFwiOlwiXFx1MjVCOFwiLFwiYmxhbmtcIjpcIlxcdTI0MjNcIixcImJsazEyXCI6XCJcXHUyNTkyXCIsXCJibGsxNFwiOlwiXFx1MjU5MVwiLFwiYmxrMzRcIjpcIlxcdTI1OTNcIixcImJsb2NrXCI6XCJcXHUyNTg4XCIsXCJibmVcIjpcIj1cXHUyMEU1XCIsXCJibmVxdWl2XCI6XCJcXHUyMjYxXFx1MjBFNVwiLFwiYk5vdFwiOlwiXFx1MkFFRFwiLFwiYm5vdFwiOlwiXFx1MjMxMFwiLFwiQm9wZlwiOlwiXFx1RDgzNVxcdUREMzlcIixcImJvcGZcIjpcIlxcdUQ4MzVcXHVERDUzXCIsXCJib3RcIjpcIlxcdTIyQTVcIixcImJvdHRvbVwiOlwiXFx1MjJBNVwiLFwiYm93dGllXCI6XCJcXHUyMkM4XCIsXCJib3hib3hcIjpcIlxcdTI5QzlcIixcImJveGRsXCI6XCJcXHUyNTEwXCIsXCJib3hkTFwiOlwiXFx1MjU1NVwiLFwiYm94RGxcIjpcIlxcdTI1NTZcIixcImJveERMXCI6XCJcXHUyNTU3XCIsXCJib3hkclwiOlwiXFx1MjUwQ1wiLFwiYm94ZFJcIjpcIlxcdTI1NTJcIixcImJveERyXCI6XCJcXHUyNTUzXCIsXCJib3hEUlwiOlwiXFx1MjU1NFwiLFwiYm94aFwiOlwiXFx1MjUwMFwiLFwiYm94SFwiOlwiXFx1MjU1MFwiLFwiYm94aGRcIjpcIlxcdTI1MkNcIixcImJveEhkXCI6XCJcXHUyNTY0XCIsXCJib3hoRFwiOlwiXFx1MjU2NVwiLFwiYm94SERcIjpcIlxcdTI1NjZcIixcImJveGh1XCI6XCJcXHUyNTM0XCIsXCJib3hIdVwiOlwiXFx1MjU2N1wiLFwiYm94aFVcIjpcIlxcdTI1NjhcIixcImJveEhVXCI6XCJcXHUyNTY5XCIsXCJib3htaW51c1wiOlwiXFx1MjI5RlwiLFwiYm94cGx1c1wiOlwiXFx1MjI5RVwiLFwiYm94dGltZXNcIjpcIlxcdTIyQTBcIixcImJveHVsXCI6XCJcXHUyNTE4XCIsXCJib3h1TFwiOlwiXFx1MjU1QlwiLFwiYm94VWxcIjpcIlxcdTI1NUNcIixcImJveFVMXCI6XCJcXHUyNTVEXCIsXCJib3h1clwiOlwiXFx1MjUxNFwiLFwiYm94dVJcIjpcIlxcdTI1NThcIixcImJveFVyXCI6XCJcXHUyNTU5XCIsXCJib3hVUlwiOlwiXFx1MjU1QVwiLFwiYm94dlwiOlwiXFx1MjUwMlwiLFwiYm94VlwiOlwiXFx1MjU1MVwiLFwiYm94dmhcIjpcIlxcdTI1M0NcIixcImJveHZIXCI6XCJcXHUyNTZBXCIsXCJib3hWaFwiOlwiXFx1MjU2QlwiLFwiYm94VkhcIjpcIlxcdTI1NkNcIixcImJveHZsXCI6XCJcXHUyNTI0XCIsXCJib3h2TFwiOlwiXFx1MjU2MVwiLFwiYm94VmxcIjpcIlxcdTI1NjJcIixcImJveFZMXCI6XCJcXHUyNTYzXCIsXCJib3h2clwiOlwiXFx1MjUxQ1wiLFwiYm94dlJcIjpcIlxcdTI1NUVcIixcImJveFZyXCI6XCJcXHUyNTVGXCIsXCJib3hWUlwiOlwiXFx1MjU2MFwiLFwiYnByaW1lXCI6XCJcXHUyMDM1XCIsXCJicmV2ZVwiOlwiXFx1MDJEOFwiLFwiQnJldmVcIjpcIlxcdTAyRDhcIixcImJydmJhclwiOlwiXFx1MDBBNlwiLFwiYnNjclwiOlwiXFx1RDgzNVxcdURDQjdcIixcIkJzY3JcIjpcIlxcdTIxMkNcIixcImJzZW1pXCI6XCJcXHUyMDRGXCIsXCJic2ltXCI6XCJcXHUyMjNEXCIsXCJic2ltZVwiOlwiXFx1MjJDRFwiLFwiYnNvbGJcIjpcIlxcdTI5QzVcIixcImJzb2xcIjpcIlxcXFxcIixcImJzb2xoc3ViXCI6XCJcXHUyN0M4XCIsXCJidWxsXCI6XCJcXHUyMDIyXCIsXCJidWxsZXRcIjpcIlxcdTIwMjJcIixcImJ1bXBcIjpcIlxcdTIyNEVcIixcImJ1bXBFXCI6XCJcXHUyQUFFXCIsXCJidW1wZVwiOlwiXFx1MjI0RlwiLFwiQnVtcGVxXCI6XCJcXHUyMjRFXCIsXCJidW1wZXFcIjpcIlxcdTIyNEZcIixcIkNhY3V0ZVwiOlwiXFx1MDEwNlwiLFwiY2FjdXRlXCI6XCJcXHUwMTA3XCIsXCJjYXBhbmRcIjpcIlxcdTJBNDRcIixcImNhcGJyY3VwXCI6XCJcXHUyQTQ5XCIsXCJjYXBjYXBcIjpcIlxcdTJBNEJcIixcImNhcFwiOlwiXFx1MjIyOVwiLFwiQ2FwXCI6XCJcXHUyMkQyXCIsXCJjYXBjdXBcIjpcIlxcdTJBNDdcIixcImNhcGRvdFwiOlwiXFx1MkE0MFwiLFwiQ2FwaXRhbERpZmZlcmVudGlhbERcIjpcIlxcdTIxNDVcIixcImNhcHNcIjpcIlxcdTIyMjlcXHVGRTAwXCIsXCJjYXJldFwiOlwiXFx1MjA0MVwiLFwiY2Fyb25cIjpcIlxcdTAyQzdcIixcIkNheWxleXNcIjpcIlxcdTIxMkRcIixcImNjYXBzXCI6XCJcXHUyQTREXCIsXCJDY2Fyb25cIjpcIlxcdTAxMENcIixcImNjYXJvblwiOlwiXFx1MDEwRFwiLFwiQ2NlZGlsXCI6XCJcXHUwMEM3XCIsXCJjY2VkaWxcIjpcIlxcdTAwRTdcIixcIkNjaXJjXCI6XCJcXHUwMTA4XCIsXCJjY2lyY1wiOlwiXFx1MDEwOVwiLFwiQ2NvbmludFwiOlwiXFx1MjIzMFwiLFwiY2N1cHNcIjpcIlxcdTJBNENcIixcImNjdXBzc21cIjpcIlxcdTJBNTBcIixcIkNkb3RcIjpcIlxcdTAxMEFcIixcImNkb3RcIjpcIlxcdTAxMEJcIixcImNlZGlsXCI6XCJcXHUwMEI4XCIsXCJDZWRpbGxhXCI6XCJcXHUwMEI4XCIsXCJjZW1wdHl2XCI6XCJcXHUyOUIyXCIsXCJjZW50XCI6XCJcXHUwMEEyXCIsXCJjZW50ZXJkb3RcIjpcIlxcdTAwQjdcIixcIkNlbnRlckRvdFwiOlwiXFx1MDBCN1wiLFwiY2ZyXCI6XCJcXHVEODM1XFx1REQyMFwiLFwiQ2ZyXCI6XCJcXHUyMTJEXCIsXCJDSGN5XCI6XCJcXHUwNDI3XCIsXCJjaGN5XCI6XCJcXHUwNDQ3XCIsXCJjaGVja1wiOlwiXFx1MjcxM1wiLFwiY2hlY2ttYXJrXCI6XCJcXHUyNzEzXCIsXCJDaGlcIjpcIlxcdTAzQTdcIixcImNoaVwiOlwiXFx1MDNDN1wiLFwiY2lyY1wiOlwiXFx1MDJDNlwiLFwiY2lyY2VxXCI6XCJcXHUyMjU3XCIsXCJjaXJjbGVhcnJvd2xlZnRcIjpcIlxcdTIxQkFcIixcImNpcmNsZWFycm93cmlnaHRcIjpcIlxcdTIxQkJcIixcImNpcmNsZWRhc3RcIjpcIlxcdTIyOUJcIixcImNpcmNsZWRjaXJjXCI6XCJcXHUyMjlBXCIsXCJjaXJjbGVkZGFzaFwiOlwiXFx1MjI5RFwiLFwiQ2lyY2xlRG90XCI6XCJcXHUyMjk5XCIsXCJjaXJjbGVkUlwiOlwiXFx1MDBBRVwiLFwiY2lyY2xlZFNcIjpcIlxcdTI0QzhcIixcIkNpcmNsZU1pbnVzXCI6XCJcXHUyMjk2XCIsXCJDaXJjbGVQbHVzXCI6XCJcXHUyMjk1XCIsXCJDaXJjbGVUaW1lc1wiOlwiXFx1MjI5N1wiLFwiY2lyXCI6XCJcXHUyNUNCXCIsXCJjaXJFXCI6XCJcXHUyOUMzXCIsXCJjaXJlXCI6XCJcXHUyMjU3XCIsXCJjaXJmbmludFwiOlwiXFx1MkExMFwiLFwiY2lybWlkXCI6XCJcXHUyQUVGXCIsXCJjaXJzY2lyXCI6XCJcXHUyOUMyXCIsXCJDbG9ja3dpc2VDb250b3VySW50ZWdyYWxcIjpcIlxcdTIyMzJcIixcIkNsb3NlQ3VybHlEb3VibGVRdW90ZVwiOlwiXFx1MjAxRFwiLFwiQ2xvc2VDdXJseVF1b3RlXCI6XCJcXHUyMDE5XCIsXCJjbHVic1wiOlwiXFx1MjY2M1wiLFwiY2x1YnN1aXRcIjpcIlxcdTI2NjNcIixcImNvbG9uXCI6XCI6XCIsXCJDb2xvblwiOlwiXFx1MjIzN1wiLFwiQ29sb25lXCI6XCJcXHUyQTc0XCIsXCJjb2xvbmVcIjpcIlxcdTIyNTRcIixcImNvbG9uZXFcIjpcIlxcdTIyNTRcIixcImNvbW1hXCI6XCIsXCIsXCJjb21tYXRcIjpcIkBcIixcImNvbXBcIjpcIlxcdTIyMDFcIixcImNvbXBmblwiOlwiXFx1MjIxOFwiLFwiY29tcGxlbWVudFwiOlwiXFx1MjIwMVwiLFwiY29tcGxleGVzXCI6XCJcXHUyMTAyXCIsXCJjb25nXCI6XCJcXHUyMjQ1XCIsXCJjb25nZG90XCI6XCJcXHUyQTZEXCIsXCJDb25ncnVlbnRcIjpcIlxcdTIyNjFcIixcImNvbmludFwiOlwiXFx1MjIyRVwiLFwiQ29uaW50XCI6XCJcXHUyMjJGXCIsXCJDb250b3VySW50ZWdyYWxcIjpcIlxcdTIyMkVcIixcImNvcGZcIjpcIlxcdUQ4MzVcXHVERDU0XCIsXCJDb3BmXCI6XCJcXHUyMTAyXCIsXCJjb3Byb2RcIjpcIlxcdTIyMTBcIixcIkNvcHJvZHVjdFwiOlwiXFx1MjIxMFwiLFwiY29weVwiOlwiXFx1MDBBOVwiLFwiQ09QWVwiOlwiXFx1MDBBOVwiLFwiY29weXNyXCI6XCJcXHUyMTE3XCIsXCJDb3VudGVyQ2xvY2t3aXNlQ29udG91ckludGVncmFsXCI6XCJcXHUyMjMzXCIsXCJjcmFyclwiOlwiXFx1MjFCNVwiLFwiY3Jvc3NcIjpcIlxcdTI3MTdcIixcIkNyb3NzXCI6XCJcXHUyQTJGXCIsXCJDc2NyXCI6XCJcXHVEODM1XFx1REM5RVwiLFwiY3NjclwiOlwiXFx1RDgzNVxcdURDQjhcIixcImNzdWJcIjpcIlxcdTJBQ0ZcIixcImNzdWJlXCI6XCJcXHUyQUQxXCIsXCJjc3VwXCI6XCJcXHUyQUQwXCIsXCJjc3VwZVwiOlwiXFx1MkFEMlwiLFwiY3Rkb3RcIjpcIlxcdTIyRUZcIixcImN1ZGFycmxcIjpcIlxcdTI5MzhcIixcImN1ZGFycnJcIjpcIlxcdTI5MzVcIixcImN1ZXByXCI6XCJcXHUyMkRFXCIsXCJjdWVzY1wiOlwiXFx1MjJERlwiLFwiY3VsYXJyXCI6XCJcXHUyMUI2XCIsXCJjdWxhcnJwXCI6XCJcXHUyOTNEXCIsXCJjdXBicmNhcFwiOlwiXFx1MkE0OFwiLFwiY3VwY2FwXCI6XCJcXHUyQTQ2XCIsXCJDdXBDYXBcIjpcIlxcdTIyNERcIixcImN1cFwiOlwiXFx1MjIyQVwiLFwiQ3VwXCI6XCJcXHUyMkQzXCIsXCJjdXBjdXBcIjpcIlxcdTJBNEFcIixcImN1cGRvdFwiOlwiXFx1MjI4RFwiLFwiY3Vwb3JcIjpcIlxcdTJBNDVcIixcImN1cHNcIjpcIlxcdTIyMkFcXHVGRTAwXCIsXCJjdXJhcnJcIjpcIlxcdTIxQjdcIixcImN1cmFycm1cIjpcIlxcdTI5M0NcIixcImN1cmx5ZXFwcmVjXCI6XCJcXHUyMkRFXCIsXCJjdXJseWVxc3VjY1wiOlwiXFx1MjJERlwiLFwiY3VybHl2ZWVcIjpcIlxcdTIyQ0VcIixcImN1cmx5d2VkZ2VcIjpcIlxcdTIyQ0ZcIixcImN1cnJlblwiOlwiXFx1MDBBNFwiLFwiY3VydmVhcnJvd2xlZnRcIjpcIlxcdTIxQjZcIixcImN1cnZlYXJyb3dyaWdodFwiOlwiXFx1MjFCN1wiLFwiY3V2ZWVcIjpcIlxcdTIyQ0VcIixcImN1d2VkXCI6XCJcXHUyMkNGXCIsXCJjd2NvbmludFwiOlwiXFx1MjIzMlwiLFwiY3dpbnRcIjpcIlxcdTIyMzFcIixcImN5bGN0eVwiOlwiXFx1MjMyRFwiLFwiZGFnZ2VyXCI6XCJcXHUyMDIwXCIsXCJEYWdnZXJcIjpcIlxcdTIwMjFcIixcImRhbGV0aFwiOlwiXFx1MjEzOFwiLFwiZGFyclwiOlwiXFx1MjE5M1wiLFwiRGFyclwiOlwiXFx1MjFBMVwiLFwiZEFyclwiOlwiXFx1MjFEM1wiLFwiZGFzaFwiOlwiXFx1MjAxMFwiLFwiRGFzaHZcIjpcIlxcdTJBRTRcIixcImRhc2h2XCI6XCJcXHUyMkEzXCIsXCJkYmthcm93XCI6XCJcXHUyOTBGXCIsXCJkYmxhY1wiOlwiXFx1MDJERFwiLFwiRGNhcm9uXCI6XCJcXHUwMTBFXCIsXCJkY2Fyb25cIjpcIlxcdTAxMEZcIixcIkRjeVwiOlwiXFx1MDQxNFwiLFwiZGN5XCI6XCJcXHUwNDM0XCIsXCJkZGFnZ2VyXCI6XCJcXHUyMDIxXCIsXCJkZGFyclwiOlwiXFx1MjFDQVwiLFwiRERcIjpcIlxcdTIxNDVcIixcImRkXCI6XCJcXHUyMTQ2XCIsXCJERG90cmFoZFwiOlwiXFx1MjkxMVwiLFwiZGRvdHNlcVwiOlwiXFx1MkE3N1wiLFwiZGVnXCI6XCJcXHUwMEIwXCIsXCJEZWxcIjpcIlxcdTIyMDdcIixcIkRlbHRhXCI6XCJcXHUwMzk0XCIsXCJkZWx0YVwiOlwiXFx1MDNCNFwiLFwiZGVtcHR5dlwiOlwiXFx1MjlCMVwiLFwiZGZpc2h0XCI6XCJcXHUyOTdGXCIsXCJEZnJcIjpcIlxcdUQ4MzVcXHVERDA3XCIsXCJkZnJcIjpcIlxcdUQ4MzVcXHVERDIxXCIsXCJkSGFyXCI6XCJcXHUyOTY1XCIsXCJkaGFybFwiOlwiXFx1MjFDM1wiLFwiZGhhcnJcIjpcIlxcdTIxQzJcIixcIkRpYWNyaXRpY2FsQWN1dGVcIjpcIlxcdTAwQjRcIixcIkRpYWNyaXRpY2FsRG90XCI6XCJcXHUwMkQ5XCIsXCJEaWFjcml0aWNhbERvdWJsZUFjdXRlXCI6XCJcXHUwMkREXCIsXCJEaWFjcml0aWNhbEdyYXZlXCI6XCJgXCIsXCJEaWFjcml0aWNhbFRpbGRlXCI6XCJcXHUwMkRDXCIsXCJkaWFtXCI6XCJcXHUyMkM0XCIsXCJkaWFtb25kXCI6XCJcXHUyMkM0XCIsXCJEaWFtb25kXCI6XCJcXHUyMkM0XCIsXCJkaWFtb25kc3VpdFwiOlwiXFx1MjY2NlwiLFwiZGlhbXNcIjpcIlxcdTI2NjZcIixcImRpZVwiOlwiXFx1MDBBOFwiLFwiRGlmZmVyZW50aWFsRFwiOlwiXFx1MjE0NlwiLFwiZGlnYW1tYVwiOlwiXFx1MDNERFwiLFwiZGlzaW5cIjpcIlxcdTIyRjJcIixcImRpdlwiOlwiXFx1MDBGN1wiLFwiZGl2aWRlXCI6XCJcXHUwMEY3XCIsXCJkaXZpZGVvbnRpbWVzXCI6XCJcXHUyMkM3XCIsXCJkaXZvbnhcIjpcIlxcdTIyQzdcIixcIkRKY3lcIjpcIlxcdTA0MDJcIixcImRqY3lcIjpcIlxcdTA0NTJcIixcImRsY29yblwiOlwiXFx1MjMxRVwiLFwiZGxjcm9wXCI6XCJcXHUyMzBEXCIsXCJkb2xsYXJcIjpcIiRcIixcIkRvcGZcIjpcIlxcdUQ4MzVcXHVERDNCXCIsXCJkb3BmXCI6XCJcXHVEODM1XFx1REQ1NVwiLFwiRG90XCI6XCJcXHUwMEE4XCIsXCJkb3RcIjpcIlxcdTAyRDlcIixcIkRvdERvdFwiOlwiXFx1MjBEQ1wiLFwiZG90ZXFcIjpcIlxcdTIyNTBcIixcImRvdGVxZG90XCI6XCJcXHUyMjUxXCIsXCJEb3RFcXVhbFwiOlwiXFx1MjI1MFwiLFwiZG90bWludXNcIjpcIlxcdTIyMzhcIixcImRvdHBsdXNcIjpcIlxcdTIyMTRcIixcImRvdHNxdWFyZVwiOlwiXFx1MjJBMVwiLFwiZG91YmxlYmFyd2VkZ2VcIjpcIlxcdTIzMDZcIixcIkRvdWJsZUNvbnRvdXJJbnRlZ3JhbFwiOlwiXFx1MjIyRlwiLFwiRG91YmxlRG90XCI6XCJcXHUwMEE4XCIsXCJEb3VibGVEb3duQXJyb3dcIjpcIlxcdTIxRDNcIixcIkRvdWJsZUxlZnRBcnJvd1wiOlwiXFx1MjFEMFwiLFwiRG91YmxlTGVmdFJpZ2h0QXJyb3dcIjpcIlxcdTIxRDRcIixcIkRvdWJsZUxlZnRUZWVcIjpcIlxcdTJBRTRcIixcIkRvdWJsZUxvbmdMZWZ0QXJyb3dcIjpcIlxcdTI3RjhcIixcIkRvdWJsZUxvbmdMZWZ0UmlnaHRBcnJvd1wiOlwiXFx1MjdGQVwiLFwiRG91YmxlTG9uZ1JpZ2h0QXJyb3dcIjpcIlxcdTI3RjlcIixcIkRvdWJsZVJpZ2h0QXJyb3dcIjpcIlxcdTIxRDJcIixcIkRvdWJsZVJpZ2h0VGVlXCI6XCJcXHUyMkE4XCIsXCJEb3VibGVVcEFycm93XCI6XCJcXHUyMUQxXCIsXCJEb3VibGVVcERvd25BcnJvd1wiOlwiXFx1MjFENVwiLFwiRG91YmxlVmVydGljYWxCYXJcIjpcIlxcdTIyMjVcIixcIkRvd25BcnJvd0JhclwiOlwiXFx1MjkxM1wiLFwiZG93bmFycm93XCI6XCJcXHUyMTkzXCIsXCJEb3duQXJyb3dcIjpcIlxcdTIxOTNcIixcIkRvd25hcnJvd1wiOlwiXFx1MjFEM1wiLFwiRG93bkFycm93VXBBcnJvd1wiOlwiXFx1MjFGNVwiLFwiRG93bkJyZXZlXCI6XCJcXHUwMzExXCIsXCJkb3duZG93bmFycm93c1wiOlwiXFx1MjFDQVwiLFwiZG93bmhhcnBvb25sZWZ0XCI6XCJcXHUyMUMzXCIsXCJkb3duaGFycG9vbnJpZ2h0XCI6XCJcXHUyMUMyXCIsXCJEb3duTGVmdFJpZ2h0VmVjdG9yXCI6XCJcXHUyOTUwXCIsXCJEb3duTGVmdFRlZVZlY3RvclwiOlwiXFx1Mjk1RVwiLFwiRG93bkxlZnRWZWN0b3JCYXJcIjpcIlxcdTI5NTZcIixcIkRvd25MZWZ0VmVjdG9yXCI6XCJcXHUyMUJEXCIsXCJEb3duUmlnaHRUZWVWZWN0b3JcIjpcIlxcdTI5NUZcIixcIkRvd25SaWdodFZlY3RvckJhclwiOlwiXFx1Mjk1N1wiLFwiRG93blJpZ2h0VmVjdG9yXCI6XCJcXHUyMUMxXCIsXCJEb3duVGVlQXJyb3dcIjpcIlxcdTIxQTdcIixcIkRvd25UZWVcIjpcIlxcdTIyQTRcIixcImRyYmthcm93XCI6XCJcXHUyOTEwXCIsXCJkcmNvcm5cIjpcIlxcdTIzMUZcIixcImRyY3JvcFwiOlwiXFx1MjMwQ1wiLFwiRHNjclwiOlwiXFx1RDgzNVxcdURDOUZcIixcImRzY3JcIjpcIlxcdUQ4MzVcXHVEQ0I5XCIsXCJEU2N5XCI6XCJcXHUwNDA1XCIsXCJkc2N5XCI6XCJcXHUwNDU1XCIsXCJkc29sXCI6XCJcXHUyOUY2XCIsXCJEc3Ryb2tcIjpcIlxcdTAxMTBcIixcImRzdHJva1wiOlwiXFx1MDExMVwiLFwiZHRkb3RcIjpcIlxcdTIyRjFcIixcImR0cmlcIjpcIlxcdTI1QkZcIixcImR0cmlmXCI6XCJcXHUyNUJFXCIsXCJkdWFyclwiOlwiXFx1MjFGNVwiLFwiZHVoYXJcIjpcIlxcdTI5NkZcIixcImR3YW5nbGVcIjpcIlxcdTI5QTZcIixcIkRaY3lcIjpcIlxcdTA0MEZcIixcImR6Y3lcIjpcIlxcdTA0NUZcIixcImR6aWdyYXJyXCI6XCJcXHUyN0ZGXCIsXCJFYWN1dGVcIjpcIlxcdTAwQzlcIixcImVhY3V0ZVwiOlwiXFx1MDBFOVwiLFwiZWFzdGVyXCI6XCJcXHUyQTZFXCIsXCJFY2Fyb25cIjpcIlxcdTAxMUFcIixcImVjYXJvblwiOlwiXFx1MDExQlwiLFwiRWNpcmNcIjpcIlxcdTAwQ0FcIixcImVjaXJjXCI6XCJcXHUwMEVBXCIsXCJlY2lyXCI6XCJcXHUyMjU2XCIsXCJlY29sb25cIjpcIlxcdTIyNTVcIixcIkVjeVwiOlwiXFx1MDQyRFwiLFwiZWN5XCI6XCJcXHUwNDREXCIsXCJlRERvdFwiOlwiXFx1MkE3N1wiLFwiRWRvdFwiOlwiXFx1MDExNlwiLFwiZWRvdFwiOlwiXFx1MDExN1wiLFwiZURvdFwiOlwiXFx1MjI1MVwiLFwiZWVcIjpcIlxcdTIxNDdcIixcImVmRG90XCI6XCJcXHUyMjUyXCIsXCJFZnJcIjpcIlxcdUQ4MzVcXHVERDA4XCIsXCJlZnJcIjpcIlxcdUQ4MzVcXHVERDIyXCIsXCJlZ1wiOlwiXFx1MkE5QVwiLFwiRWdyYXZlXCI6XCJcXHUwMEM4XCIsXCJlZ3JhdmVcIjpcIlxcdTAwRThcIixcImVnc1wiOlwiXFx1MkE5NlwiLFwiZWdzZG90XCI6XCJcXHUyQTk4XCIsXCJlbFwiOlwiXFx1MkE5OVwiLFwiRWxlbWVudFwiOlwiXFx1MjIwOFwiLFwiZWxpbnRlcnNcIjpcIlxcdTIzRTdcIixcImVsbFwiOlwiXFx1MjExM1wiLFwiZWxzXCI6XCJcXHUyQTk1XCIsXCJlbHNkb3RcIjpcIlxcdTJBOTdcIixcIkVtYWNyXCI6XCJcXHUwMTEyXCIsXCJlbWFjclwiOlwiXFx1MDExM1wiLFwiZW1wdHlcIjpcIlxcdTIyMDVcIixcImVtcHR5c2V0XCI6XCJcXHUyMjA1XCIsXCJFbXB0eVNtYWxsU3F1YXJlXCI6XCJcXHUyNUZCXCIsXCJlbXB0eXZcIjpcIlxcdTIyMDVcIixcIkVtcHR5VmVyeVNtYWxsU3F1YXJlXCI6XCJcXHUyNUFCXCIsXCJlbXNwMTNcIjpcIlxcdTIwMDRcIixcImVtc3AxNFwiOlwiXFx1MjAwNVwiLFwiZW1zcFwiOlwiXFx1MjAwM1wiLFwiRU5HXCI6XCJcXHUwMTRBXCIsXCJlbmdcIjpcIlxcdTAxNEJcIixcImVuc3BcIjpcIlxcdTIwMDJcIixcIkVvZ29uXCI6XCJcXHUwMTE4XCIsXCJlb2dvblwiOlwiXFx1MDExOVwiLFwiRW9wZlwiOlwiXFx1RDgzNVxcdUREM0NcIixcImVvcGZcIjpcIlxcdUQ4MzVcXHVERDU2XCIsXCJlcGFyXCI6XCJcXHUyMkQ1XCIsXCJlcGFyc2xcIjpcIlxcdTI5RTNcIixcImVwbHVzXCI6XCJcXHUyQTcxXCIsXCJlcHNpXCI6XCJcXHUwM0I1XCIsXCJFcHNpbG9uXCI6XCJcXHUwMzk1XCIsXCJlcHNpbG9uXCI6XCJcXHUwM0I1XCIsXCJlcHNpdlwiOlwiXFx1MDNGNVwiLFwiZXFjaXJjXCI6XCJcXHUyMjU2XCIsXCJlcWNvbG9uXCI6XCJcXHUyMjU1XCIsXCJlcXNpbVwiOlwiXFx1MjI0MlwiLFwiZXFzbGFudGd0clwiOlwiXFx1MkE5NlwiLFwiZXFzbGFudGxlc3NcIjpcIlxcdTJBOTVcIixcIkVxdWFsXCI6XCJcXHUyQTc1XCIsXCJlcXVhbHNcIjpcIj1cIixcIkVxdWFsVGlsZGVcIjpcIlxcdTIyNDJcIixcImVxdWVzdFwiOlwiXFx1MjI1RlwiLFwiRXF1aWxpYnJpdW1cIjpcIlxcdTIxQ0NcIixcImVxdWl2XCI6XCJcXHUyMjYxXCIsXCJlcXVpdkREXCI6XCJcXHUyQTc4XCIsXCJlcXZwYXJzbFwiOlwiXFx1MjlFNVwiLFwiZXJhcnJcIjpcIlxcdTI5NzFcIixcImVyRG90XCI6XCJcXHUyMjUzXCIsXCJlc2NyXCI6XCJcXHUyMTJGXCIsXCJFc2NyXCI6XCJcXHUyMTMwXCIsXCJlc2RvdFwiOlwiXFx1MjI1MFwiLFwiRXNpbVwiOlwiXFx1MkE3M1wiLFwiZXNpbVwiOlwiXFx1MjI0MlwiLFwiRXRhXCI6XCJcXHUwMzk3XCIsXCJldGFcIjpcIlxcdTAzQjdcIixcIkVUSFwiOlwiXFx1MDBEMFwiLFwiZXRoXCI6XCJcXHUwMEYwXCIsXCJFdW1sXCI6XCJcXHUwMENCXCIsXCJldW1sXCI6XCJcXHUwMEVCXCIsXCJldXJvXCI6XCJcXHUyMEFDXCIsXCJleGNsXCI6XCIhXCIsXCJleGlzdFwiOlwiXFx1MjIwM1wiLFwiRXhpc3RzXCI6XCJcXHUyMjAzXCIsXCJleHBlY3RhdGlvblwiOlwiXFx1MjEzMFwiLFwiZXhwb25lbnRpYWxlXCI6XCJcXHUyMTQ3XCIsXCJFeHBvbmVudGlhbEVcIjpcIlxcdTIxNDdcIixcImZhbGxpbmdkb3RzZXFcIjpcIlxcdTIyNTJcIixcIkZjeVwiOlwiXFx1MDQyNFwiLFwiZmN5XCI6XCJcXHUwNDQ0XCIsXCJmZW1hbGVcIjpcIlxcdTI2NDBcIixcImZmaWxpZ1wiOlwiXFx1RkIwM1wiLFwiZmZsaWdcIjpcIlxcdUZCMDBcIixcImZmbGxpZ1wiOlwiXFx1RkIwNFwiLFwiRmZyXCI6XCJcXHVEODM1XFx1REQwOVwiLFwiZmZyXCI6XCJcXHVEODM1XFx1REQyM1wiLFwiZmlsaWdcIjpcIlxcdUZCMDFcIixcIkZpbGxlZFNtYWxsU3F1YXJlXCI6XCJcXHUyNUZDXCIsXCJGaWxsZWRWZXJ5U21hbGxTcXVhcmVcIjpcIlxcdTI1QUFcIixcImZqbGlnXCI6XCJmalwiLFwiZmxhdFwiOlwiXFx1MjY2RFwiLFwiZmxsaWdcIjpcIlxcdUZCMDJcIixcImZsdG5zXCI6XCJcXHUyNUIxXCIsXCJmbm9mXCI6XCJcXHUwMTkyXCIsXCJGb3BmXCI6XCJcXHVEODM1XFx1REQzRFwiLFwiZm9wZlwiOlwiXFx1RDgzNVxcdURENTdcIixcImZvcmFsbFwiOlwiXFx1MjIwMFwiLFwiRm9yQWxsXCI6XCJcXHUyMjAwXCIsXCJmb3JrXCI6XCJcXHUyMkQ0XCIsXCJmb3JrdlwiOlwiXFx1MkFEOVwiLFwiRm91cmllcnRyZlwiOlwiXFx1MjEzMVwiLFwiZnBhcnRpbnRcIjpcIlxcdTJBMERcIixcImZyYWMxMlwiOlwiXFx1MDBCRFwiLFwiZnJhYzEzXCI6XCJcXHUyMTUzXCIsXCJmcmFjMTRcIjpcIlxcdTAwQkNcIixcImZyYWMxNVwiOlwiXFx1MjE1NVwiLFwiZnJhYzE2XCI6XCJcXHUyMTU5XCIsXCJmcmFjMThcIjpcIlxcdTIxNUJcIixcImZyYWMyM1wiOlwiXFx1MjE1NFwiLFwiZnJhYzI1XCI6XCJcXHUyMTU2XCIsXCJmcmFjMzRcIjpcIlxcdTAwQkVcIixcImZyYWMzNVwiOlwiXFx1MjE1N1wiLFwiZnJhYzM4XCI6XCJcXHUyMTVDXCIsXCJmcmFjNDVcIjpcIlxcdTIxNThcIixcImZyYWM1NlwiOlwiXFx1MjE1QVwiLFwiZnJhYzU4XCI6XCJcXHUyMTVEXCIsXCJmcmFjNzhcIjpcIlxcdTIxNUVcIixcImZyYXNsXCI6XCJcXHUyMDQ0XCIsXCJmcm93blwiOlwiXFx1MjMyMlwiLFwiZnNjclwiOlwiXFx1RDgzNVxcdURDQkJcIixcIkZzY3JcIjpcIlxcdTIxMzFcIixcImdhY3V0ZVwiOlwiXFx1MDFGNVwiLFwiR2FtbWFcIjpcIlxcdTAzOTNcIixcImdhbW1hXCI6XCJcXHUwM0IzXCIsXCJHYW1tYWRcIjpcIlxcdTAzRENcIixcImdhbW1hZFwiOlwiXFx1MDNERFwiLFwiZ2FwXCI6XCJcXHUyQTg2XCIsXCJHYnJldmVcIjpcIlxcdTAxMUVcIixcImdicmV2ZVwiOlwiXFx1MDExRlwiLFwiR2NlZGlsXCI6XCJcXHUwMTIyXCIsXCJHY2lyY1wiOlwiXFx1MDExQ1wiLFwiZ2NpcmNcIjpcIlxcdTAxMURcIixcIkdjeVwiOlwiXFx1MDQxM1wiLFwiZ2N5XCI6XCJcXHUwNDMzXCIsXCJHZG90XCI6XCJcXHUwMTIwXCIsXCJnZG90XCI6XCJcXHUwMTIxXCIsXCJnZVwiOlwiXFx1MjI2NVwiLFwiZ0VcIjpcIlxcdTIyNjdcIixcImdFbFwiOlwiXFx1MkE4Q1wiLFwiZ2VsXCI6XCJcXHUyMkRCXCIsXCJnZXFcIjpcIlxcdTIyNjVcIixcImdlcXFcIjpcIlxcdTIyNjdcIixcImdlcXNsYW50XCI6XCJcXHUyQTdFXCIsXCJnZXNjY1wiOlwiXFx1MkFBOVwiLFwiZ2VzXCI6XCJcXHUyQTdFXCIsXCJnZXNkb3RcIjpcIlxcdTJBODBcIixcImdlc2RvdG9cIjpcIlxcdTJBODJcIixcImdlc2RvdG9sXCI6XCJcXHUyQTg0XCIsXCJnZXNsXCI6XCJcXHUyMkRCXFx1RkUwMFwiLFwiZ2VzbGVzXCI6XCJcXHUyQTk0XCIsXCJHZnJcIjpcIlxcdUQ4MzVcXHVERDBBXCIsXCJnZnJcIjpcIlxcdUQ4MzVcXHVERDI0XCIsXCJnZ1wiOlwiXFx1MjI2QlwiLFwiR2dcIjpcIlxcdTIyRDlcIixcImdnZ1wiOlwiXFx1MjJEOVwiLFwiZ2ltZWxcIjpcIlxcdTIxMzdcIixcIkdKY3lcIjpcIlxcdTA0MDNcIixcImdqY3lcIjpcIlxcdTA0NTNcIixcImdsYVwiOlwiXFx1MkFBNVwiLFwiZ2xcIjpcIlxcdTIyNzdcIixcImdsRVwiOlwiXFx1MkE5MlwiLFwiZ2xqXCI6XCJcXHUyQUE0XCIsXCJnbmFwXCI6XCJcXHUyQThBXCIsXCJnbmFwcHJveFwiOlwiXFx1MkE4QVwiLFwiZ25lXCI6XCJcXHUyQTg4XCIsXCJnbkVcIjpcIlxcdTIyNjlcIixcImduZXFcIjpcIlxcdTJBODhcIixcImduZXFxXCI6XCJcXHUyMjY5XCIsXCJnbnNpbVwiOlwiXFx1MjJFN1wiLFwiR29wZlwiOlwiXFx1RDgzNVxcdUREM0VcIixcImdvcGZcIjpcIlxcdUQ4MzVcXHVERDU4XCIsXCJncmF2ZVwiOlwiYFwiLFwiR3JlYXRlckVxdWFsXCI6XCJcXHUyMjY1XCIsXCJHcmVhdGVyRXF1YWxMZXNzXCI6XCJcXHUyMkRCXCIsXCJHcmVhdGVyRnVsbEVxdWFsXCI6XCJcXHUyMjY3XCIsXCJHcmVhdGVyR3JlYXRlclwiOlwiXFx1MkFBMlwiLFwiR3JlYXRlckxlc3NcIjpcIlxcdTIyNzdcIixcIkdyZWF0ZXJTbGFudEVxdWFsXCI6XCJcXHUyQTdFXCIsXCJHcmVhdGVyVGlsZGVcIjpcIlxcdTIyNzNcIixcIkdzY3JcIjpcIlxcdUQ4MzVcXHVEQ0EyXCIsXCJnc2NyXCI6XCJcXHUyMTBBXCIsXCJnc2ltXCI6XCJcXHUyMjczXCIsXCJnc2ltZVwiOlwiXFx1MkE4RVwiLFwiZ3NpbWxcIjpcIlxcdTJBOTBcIixcImd0Y2NcIjpcIlxcdTJBQTdcIixcImd0Y2lyXCI6XCJcXHUyQTdBXCIsXCJndFwiOlwiPlwiLFwiR1RcIjpcIj5cIixcIkd0XCI6XCJcXHUyMjZCXCIsXCJndGRvdFwiOlwiXFx1MjJEN1wiLFwiZ3RsUGFyXCI6XCJcXHUyOTk1XCIsXCJndHF1ZXN0XCI6XCJcXHUyQTdDXCIsXCJndHJhcHByb3hcIjpcIlxcdTJBODZcIixcImd0cmFyclwiOlwiXFx1Mjk3OFwiLFwiZ3RyZG90XCI6XCJcXHUyMkQ3XCIsXCJndHJlcWxlc3NcIjpcIlxcdTIyREJcIixcImd0cmVxcWxlc3NcIjpcIlxcdTJBOENcIixcImd0cmxlc3NcIjpcIlxcdTIyNzdcIixcImd0cnNpbVwiOlwiXFx1MjI3M1wiLFwiZ3ZlcnRuZXFxXCI6XCJcXHUyMjY5XFx1RkUwMFwiLFwiZ3ZuRVwiOlwiXFx1MjI2OVxcdUZFMDBcIixcIkhhY2VrXCI6XCJcXHUwMkM3XCIsXCJoYWlyc3BcIjpcIlxcdTIwMEFcIixcImhhbGZcIjpcIlxcdTAwQkRcIixcImhhbWlsdFwiOlwiXFx1MjEwQlwiLFwiSEFSRGN5XCI6XCJcXHUwNDJBXCIsXCJoYXJkY3lcIjpcIlxcdTA0NEFcIixcImhhcnJjaXJcIjpcIlxcdTI5NDhcIixcImhhcnJcIjpcIlxcdTIxOTRcIixcImhBcnJcIjpcIlxcdTIxRDRcIixcImhhcnJ3XCI6XCJcXHUyMUFEXCIsXCJIYXRcIjpcIl5cIixcImhiYXJcIjpcIlxcdTIxMEZcIixcIkhjaXJjXCI6XCJcXHUwMTI0XCIsXCJoY2lyY1wiOlwiXFx1MDEyNVwiLFwiaGVhcnRzXCI6XCJcXHUyNjY1XCIsXCJoZWFydHN1aXRcIjpcIlxcdTI2NjVcIixcImhlbGxpcFwiOlwiXFx1MjAyNlwiLFwiaGVyY29uXCI6XCJcXHUyMkI5XCIsXCJoZnJcIjpcIlxcdUQ4MzVcXHVERDI1XCIsXCJIZnJcIjpcIlxcdTIxMENcIixcIkhpbGJlcnRTcGFjZVwiOlwiXFx1MjEwQlwiLFwiaGtzZWFyb3dcIjpcIlxcdTI5MjVcIixcImhrc3dhcm93XCI6XCJcXHUyOTI2XCIsXCJob2FyclwiOlwiXFx1MjFGRlwiLFwiaG9tdGh0XCI6XCJcXHUyMjNCXCIsXCJob29rbGVmdGFycm93XCI6XCJcXHUyMUE5XCIsXCJob29rcmlnaHRhcnJvd1wiOlwiXFx1MjFBQVwiLFwiaG9wZlwiOlwiXFx1RDgzNVxcdURENTlcIixcIkhvcGZcIjpcIlxcdTIxMERcIixcImhvcmJhclwiOlwiXFx1MjAxNVwiLFwiSG9yaXpvbnRhbExpbmVcIjpcIlxcdTI1MDBcIixcImhzY3JcIjpcIlxcdUQ4MzVcXHVEQ0JEXCIsXCJIc2NyXCI6XCJcXHUyMTBCXCIsXCJoc2xhc2hcIjpcIlxcdTIxMEZcIixcIkhzdHJva1wiOlwiXFx1MDEyNlwiLFwiaHN0cm9rXCI6XCJcXHUwMTI3XCIsXCJIdW1wRG93bkh1bXBcIjpcIlxcdTIyNEVcIixcIkh1bXBFcXVhbFwiOlwiXFx1MjI0RlwiLFwiaHlidWxsXCI6XCJcXHUyMDQzXCIsXCJoeXBoZW5cIjpcIlxcdTIwMTBcIixcIklhY3V0ZVwiOlwiXFx1MDBDRFwiLFwiaWFjdXRlXCI6XCJcXHUwMEVEXCIsXCJpY1wiOlwiXFx1MjA2M1wiLFwiSWNpcmNcIjpcIlxcdTAwQ0VcIixcImljaXJjXCI6XCJcXHUwMEVFXCIsXCJJY3lcIjpcIlxcdTA0MThcIixcImljeVwiOlwiXFx1MDQzOFwiLFwiSWRvdFwiOlwiXFx1MDEzMFwiLFwiSUVjeVwiOlwiXFx1MDQxNVwiLFwiaWVjeVwiOlwiXFx1MDQzNVwiLFwiaWV4Y2xcIjpcIlxcdTAwQTFcIixcImlmZlwiOlwiXFx1MjFENFwiLFwiaWZyXCI6XCJcXHVEODM1XFx1REQyNlwiLFwiSWZyXCI6XCJcXHUyMTExXCIsXCJJZ3JhdmVcIjpcIlxcdTAwQ0NcIixcImlncmF2ZVwiOlwiXFx1MDBFQ1wiLFwiaWlcIjpcIlxcdTIxNDhcIixcImlpaWludFwiOlwiXFx1MkEwQ1wiLFwiaWlpbnRcIjpcIlxcdTIyMkRcIixcImlpbmZpblwiOlwiXFx1MjlEQ1wiLFwiaWlvdGFcIjpcIlxcdTIxMjlcIixcIklKbGlnXCI6XCJcXHUwMTMyXCIsXCJpamxpZ1wiOlwiXFx1MDEzM1wiLFwiSW1hY3JcIjpcIlxcdTAxMkFcIixcImltYWNyXCI6XCJcXHUwMTJCXCIsXCJpbWFnZVwiOlwiXFx1MjExMVwiLFwiSW1hZ2luYXJ5SVwiOlwiXFx1MjE0OFwiLFwiaW1hZ2xpbmVcIjpcIlxcdTIxMTBcIixcImltYWdwYXJ0XCI6XCJcXHUyMTExXCIsXCJpbWF0aFwiOlwiXFx1MDEzMVwiLFwiSW1cIjpcIlxcdTIxMTFcIixcImltb2ZcIjpcIlxcdTIyQjdcIixcImltcGVkXCI6XCJcXHUwMUI1XCIsXCJJbXBsaWVzXCI6XCJcXHUyMUQyXCIsXCJpbmNhcmVcIjpcIlxcdTIxMDVcIixcImluXCI6XCJcXHUyMjA4XCIsXCJpbmZpblwiOlwiXFx1MjIxRVwiLFwiaW5maW50aWVcIjpcIlxcdTI5RERcIixcImlub2RvdFwiOlwiXFx1MDEzMVwiLFwiaW50Y2FsXCI6XCJcXHUyMkJBXCIsXCJpbnRcIjpcIlxcdTIyMkJcIixcIkludFwiOlwiXFx1MjIyQ1wiLFwiaW50ZWdlcnNcIjpcIlxcdTIxMjRcIixcIkludGVncmFsXCI6XCJcXHUyMjJCXCIsXCJpbnRlcmNhbFwiOlwiXFx1MjJCQVwiLFwiSW50ZXJzZWN0aW9uXCI6XCJcXHUyMkMyXCIsXCJpbnRsYXJoa1wiOlwiXFx1MkExN1wiLFwiaW50cHJvZFwiOlwiXFx1MkEzQ1wiLFwiSW52aXNpYmxlQ29tbWFcIjpcIlxcdTIwNjNcIixcIkludmlzaWJsZVRpbWVzXCI6XCJcXHUyMDYyXCIsXCJJT2N5XCI6XCJcXHUwNDAxXCIsXCJpb2N5XCI6XCJcXHUwNDUxXCIsXCJJb2dvblwiOlwiXFx1MDEyRVwiLFwiaW9nb25cIjpcIlxcdTAxMkZcIixcIklvcGZcIjpcIlxcdUQ4MzVcXHVERDQwXCIsXCJpb3BmXCI6XCJcXHVEODM1XFx1REQ1QVwiLFwiSW90YVwiOlwiXFx1MDM5OVwiLFwiaW90YVwiOlwiXFx1MDNCOVwiLFwiaXByb2RcIjpcIlxcdTJBM0NcIixcImlxdWVzdFwiOlwiXFx1MDBCRlwiLFwiaXNjclwiOlwiXFx1RDgzNVxcdURDQkVcIixcIklzY3JcIjpcIlxcdTIxMTBcIixcImlzaW5cIjpcIlxcdTIyMDhcIixcImlzaW5kb3RcIjpcIlxcdTIyRjVcIixcImlzaW5FXCI6XCJcXHUyMkY5XCIsXCJpc2luc1wiOlwiXFx1MjJGNFwiLFwiaXNpbnN2XCI6XCJcXHUyMkYzXCIsXCJpc2ludlwiOlwiXFx1MjIwOFwiLFwiaXRcIjpcIlxcdTIwNjJcIixcIkl0aWxkZVwiOlwiXFx1MDEyOFwiLFwiaXRpbGRlXCI6XCJcXHUwMTI5XCIsXCJJdWtjeVwiOlwiXFx1MDQwNlwiLFwiaXVrY3lcIjpcIlxcdTA0NTZcIixcIkl1bWxcIjpcIlxcdTAwQ0ZcIixcIml1bWxcIjpcIlxcdTAwRUZcIixcIkpjaXJjXCI6XCJcXHUwMTM0XCIsXCJqY2lyY1wiOlwiXFx1MDEzNVwiLFwiSmN5XCI6XCJcXHUwNDE5XCIsXCJqY3lcIjpcIlxcdTA0MzlcIixcIkpmclwiOlwiXFx1RDgzNVxcdUREMERcIixcImpmclwiOlwiXFx1RDgzNVxcdUREMjdcIixcImptYXRoXCI6XCJcXHUwMjM3XCIsXCJKb3BmXCI6XCJcXHVEODM1XFx1REQ0MVwiLFwiam9wZlwiOlwiXFx1RDgzNVxcdURENUJcIixcIkpzY3JcIjpcIlxcdUQ4MzVcXHVEQ0E1XCIsXCJqc2NyXCI6XCJcXHVEODM1XFx1RENCRlwiLFwiSnNlcmN5XCI6XCJcXHUwNDA4XCIsXCJqc2VyY3lcIjpcIlxcdTA0NThcIixcIkp1a2N5XCI6XCJcXHUwNDA0XCIsXCJqdWtjeVwiOlwiXFx1MDQ1NFwiLFwiS2FwcGFcIjpcIlxcdTAzOUFcIixcImthcHBhXCI6XCJcXHUwM0JBXCIsXCJrYXBwYXZcIjpcIlxcdTAzRjBcIixcIktjZWRpbFwiOlwiXFx1MDEzNlwiLFwia2NlZGlsXCI6XCJcXHUwMTM3XCIsXCJLY3lcIjpcIlxcdTA0MUFcIixcImtjeVwiOlwiXFx1MDQzQVwiLFwiS2ZyXCI6XCJcXHVEODM1XFx1REQwRVwiLFwia2ZyXCI6XCJcXHVEODM1XFx1REQyOFwiLFwia2dyZWVuXCI6XCJcXHUwMTM4XCIsXCJLSGN5XCI6XCJcXHUwNDI1XCIsXCJraGN5XCI6XCJcXHUwNDQ1XCIsXCJLSmN5XCI6XCJcXHUwNDBDXCIsXCJramN5XCI6XCJcXHUwNDVDXCIsXCJLb3BmXCI6XCJcXHVEODM1XFx1REQ0MlwiLFwia29wZlwiOlwiXFx1RDgzNVxcdURENUNcIixcIktzY3JcIjpcIlxcdUQ4MzVcXHVEQ0E2XCIsXCJrc2NyXCI6XCJcXHVEODM1XFx1RENDMFwiLFwibEFhcnJcIjpcIlxcdTIxREFcIixcIkxhY3V0ZVwiOlwiXFx1MDEzOVwiLFwibGFjdXRlXCI6XCJcXHUwMTNBXCIsXCJsYWVtcHR5dlwiOlwiXFx1MjlCNFwiLFwibGFncmFuXCI6XCJcXHUyMTEyXCIsXCJMYW1iZGFcIjpcIlxcdTAzOUJcIixcImxhbWJkYVwiOlwiXFx1MDNCQlwiLFwibGFuZ1wiOlwiXFx1MjdFOFwiLFwiTGFuZ1wiOlwiXFx1MjdFQVwiLFwibGFuZ2RcIjpcIlxcdTI5OTFcIixcImxhbmdsZVwiOlwiXFx1MjdFOFwiLFwibGFwXCI6XCJcXHUyQTg1XCIsXCJMYXBsYWNldHJmXCI6XCJcXHUyMTEyXCIsXCJsYXF1b1wiOlwiXFx1MDBBQlwiLFwibGFycmJcIjpcIlxcdTIxRTRcIixcImxhcnJiZnNcIjpcIlxcdTI5MUZcIixcImxhcnJcIjpcIlxcdTIxOTBcIixcIkxhcnJcIjpcIlxcdTIxOUVcIixcImxBcnJcIjpcIlxcdTIxRDBcIixcImxhcnJmc1wiOlwiXFx1MjkxRFwiLFwibGFycmhrXCI6XCJcXHUyMUE5XCIsXCJsYXJybHBcIjpcIlxcdTIxQUJcIixcImxhcnJwbFwiOlwiXFx1MjkzOVwiLFwibGFycnNpbVwiOlwiXFx1Mjk3M1wiLFwibGFycnRsXCI6XCJcXHUyMUEyXCIsXCJsYXRhaWxcIjpcIlxcdTI5MTlcIixcImxBdGFpbFwiOlwiXFx1MjkxQlwiLFwibGF0XCI6XCJcXHUyQUFCXCIsXCJsYXRlXCI6XCJcXHUyQUFEXCIsXCJsYXRlc1wiOlwiXFx1MkFBRFxcdUZFMDBcIixcImxiYXJyXCI6XCJcXHUyOTBDXCIsXCJsQmFyclwiOlwiXFx1MjkwRVwiLFwibGJicmtcIjpcIlxcdTI3NzJcIixcImxicmFjZVwiOlwie1wiLFwibGJyYWNrXCI6XCJbXCIsXCJsYnJrZVwiOlwiXFx1Mjk4QlwiLFwibGJya3NsZFwiOlwiXFx1Mjk4RlwiLFwibGJya3NsdVwiOlwiXFx1Mjk4RFwiLFwiTGNhcm9uXCI6XCJcXHUwMTNEXCIsXCJsY2Fyb25cIjpcIlxcdTAxM0VcIixcIkxjZWRpbFwiOlwiXFx1MDEzQlwiLFwibGNlZGlsXCI6XCJcXHUwMTNDXCIsXCJsY2VpbFwiOlwiXFx1MjMwOFwiLFwibGN1YlwiOlwie1wiLFwiTGN5XCI6XCJcXHUwNDFCXCIsXCJsY3lcIjpcIlxcdTA0M0JcIixcImxkY2FcIjpcIlxcdTI5MzZcIixcImxkcXVvXCI6XCJcXHUyMDFDXCIsXCJsZHF1b3JcIjpcIlxcdTIwMUVcIixcImxkcmRoYXJcIjpcIlxcdTI5NjdcIixcImxkcnVzaGFyXCI6XCJcXHUyOTRCXCIsXCJsZHNoXCI6XCJcXHUyMUIyXCIsXCJsZVwiOlwiXFx1MjI2NFwiLFwibEVcIjpcIlxcdTIyNjZcIixcIkxlZnRBbmdsZUJyYWNrZXRcIjpcIlxcdTI3RThcIixcIkxlZnRBcnJvd0JhclwiOlwiXFx1MjFFNFwiLFwibGVmdGFycm93XCI6XCJcXHUyMTkwXCIsXCJMZWZ0QXJyb3dcIjpcIlxcdTIxOTBcIixcIkxlZnRhcnJvd1wiOlwiXFx1MjFEMFwiLFwiTGVmdEFycm93UmlnaHRBcnJvd1wiOlwiXFx1MjFDNlwiLFwibGVmdGFycm93dGFpbFwiOlwiXFx1MjFBMlwiLFwiTGVmdENlaWxpbmdcIjpcIlxcdTIzMDhcIixcIkxlZnREb3VibGVCcmFja2V0XCI6XCJcXHUyN0U2XCIsXCJMZWZ0RG93blRlZVZlY3RvclwiOlwiXFx1Mjk2MVwiLFwiTGVmdERvd25WZWN0b3JCYXJcIjpcIlxcdTI5NTlcIixcIkxlZnREb3duVmVjdG9yXCI6XCJcXHUyMUMzXCIsXCJMZWZ0Rmxvb3JcIjpcIlxcdTIzMEFcIixcImxlZnRoYXJwb29uZG93blwiOlwiXFx1MjFCRFwiLFwibGVmdGhhcnBvb251cFwiOlwiXFx1MjFCQ1wiLFwibGVmdGxlZnRhcnJvd3NcIjpcIlxcdTIxQzdcIixcImxlZnRyaWdodGFycm93XCI6XCJcXHUyMTk0XCIsXCJMZWZ0UmlnaHRBcnJvd1wiOlwiXFx1MjE5NFwiLFwiTGVmdHJpZ2h0YXJyb3dcIjpcIlxcdTIxRDRcIixcImxlZnRyaWdodGFycm93c1wiOlwiXFx1MjFDNlwiLFwibGVmdHJpZ2h0aGFycG9vbnNcIjpcIlxcdTIxQ0JcIixcImxlZnRyaWdodHNxdWlnYXJyb3dcIjpcIlxcdTIxQURcIixcIkxlZnRSaWdodFZlY3RvclwiOlwiXFx1Mjk0RVwiLFwiTGVmdFRlZUFycm93XCI6XCJcXHUyMUE0XCIsXCJMZWZ0VGVlXCI6XCJcXHUyMkEzXCIsXCJMZWZ0VGVlVmVjdG9yXCI6XCJcXHUyOTVBXCIsXCJsZWZ0dGhyZWV0aW1lc1wiOlwiXFx1MjJDQlwiLFwiTGVmdFRyaWFuZ2xlQmFyXCI6XCJcXHUyOUNGXCIsXCJMZWZ0VHJpYW5nbGVcIjpcIlxcdTIyQjJcIixcIkxlZnRUcmlhbmdsZUVxdWFsXCI6XCJcXHUyMkI0XCIsXCJMZWZ0VXBEb3duVmVjdG9yXCI6XCJcXHUyOTUxXCIsXCJMZWZ0VXBUZWVWZWN0b3JcIjpcIlxcdTI5NjBcIixcIkxlZnRVcFZlY3RvckJhclwiOlwiXFx1Mjk1OFwiLFwiTGVmdFVwVmVjdG9yXCI6XCJcXHUyMUJGXCIsXCJMZWZ0VmVjdG9yQmFyXCI6XCJcXHUyOTUyXCIsXCJMZWZ0VmVjdG9yXCI6XCJcXHUyMUJDXCIsXCJsRWdcIjpcIlxcdTJBOEJcIixcImxlZ1wiOlwiXFx1MjJEQVwiLFwibGVxXCI6XCJcXHUyMjY0XCIsXCJsZXFxXCI6XCJcXHUyMjY2XCIsXCJsZXFzbGFudFwiOlwiXFx1MkE3RFwiLFwibGVzY2NcIjpcIlxcdTJBQThcIixcImxlc1wiOlwiXFx1MkE3RFwiLFwibGVzZG90XCI6XCJcXHUyQTdGXCIsXCJsZXNkb3RvXCI6XCJcXHUyQTgxXCIsXCJsZXNkb3RvclwiOlwiXFx1MkE4M1wiLFwibGVzZ1wiOlwiXFx1MjJEQVxcdUZFMDBcIixcImxlc2dlc1wiOlwiXFx1MkE5M1wiLFwibGVzc2FwcHJveFwiOlwiXFx1MkE4NVwiLFwibGVzc2RvdFwiOlwiXFx1MjJENlwiLFwibGVzc2VxZ3RyXCI6XCJcXHUyMkRBXCIsXCJsZXNzZXFxZ3RyXCI6XCJcXHUyQThCXCIsXCJMZXNzRXF1YWxHcmVhdGVyXCI6XCJcXHUyMkRBXCIsXCJMZXNzRnVsbEVxdWFsXCI6XCJcXHUyMjY2XCIsXCJMZXNzR3JlYXRlclwiOlwiXFx1MjI3NlwiLFwibGVzc2d0clwiOlwiXFx1MjI3NlwiLFwiTGVzc0xlc3NcIjpcIlxcdTJBQTFcIixcImxlc3NzaW1cIjpcIlxcdTIyNzJcIixcIkxlc3NTbGFudEVxdWFsXCI6XCJcXHUyQTdEXCIsXCJMZXNzVGlsZGVcIjpcIlxcdTIyNzJcIixcImxmaXNodFwiOlwiXFx1Mjk3Q1wiLFwibGZsb29yXCI6XCJcXHUyMzBBXCIsXCJMZnJcIjpcIlxcdUQ4MzVcXHVERDBGXCIsXCJsZnJcIjpcIlxcdUQ4MzVcXHVERDI5XCIsXCJsZ1wiOlwiXFx1MjI3NlwiLFwibGdFXCI6XCJcXHUyQTkxXCIsXCJsSGFyXCI6XCJcXHUyOTYyXCIsXCJsaGFyZFwiOlwiXFx1MjFCRFwiLFwibGhhcnVcIjpcIlxcdTIxQkNcIixcImxoYXJ1bFwiOlwiXFx1Mjk2QVwiLFwibGhibGtcIjpcIlxcdTI1ODRcIixcIkxKY3lcIjpcIlxcdTA0MDlcIixcImxqY3lcIjpcIlxcdTA0NTlcIixcImxsYXJyXCI6XCJcXHUyMUM3XCIsXCJsbFwiOlwiXFx1MjI2QVwiLFwiTGxcIjpcIlxcdTIyRDhcIixcImxsY29ybmVyXCI6XCJcXHUyMzFFXCIsXCJMbGVmdGFycm93XCI6XCJcXHUyMURBXCIsXCJsbGhhcmRcIjpcIlxcdTI5NkJcIixcImxsdHJpXCI6XCJcXHUyNUZBXCIsXCJMbWlkb3RcIjpcIlxcdTAxM0ZcIixcImxtaWRvdFwiOlwiXFx1MDE0MFwiLFwibG1vdXN0YWNoZVwiOlwiXFx1MjNCMFwiLFwibG1vdXN0XCI6XCJcXHUyM0IwXCIsXCJsbmFwXCI6XCJcXHUyQTg5XCIsXCJsbmFwcHJveFwiOlwiXFx1MkE4OVwiLFwibG5lXCI6XCJcXHUyQTg3XCIsXCJsbkVcIjpcIlxcdTIyNjhcIixcImxuZXFcIjpcIlxcdTJBODdcIixcImxuZXFxXCI6XCJcXHUyMjY4XCIsXCJsbnNpbVwiOlwiXFx1MjJFNlwiLFwibG9hbmdcIjpcIlxcdTI3RUNcIixcImxvYXJyXCI6XCJcXHUyMUZEXCIsXCJsb2Jya1wiOlwiXFx1MjdFNlwiLFwibG9uZ2xlZnRhcnJvd1wiOlwiXFx1MjdGNVwiLFwiTG9uZ0xlZnRBcnJvd1wiOlwiXFx1MjdGNVwiLFwiTG9uZ2xlZnRhcnJvd1wiOlwiXFx1MjdGOFwiLFwibG9uZ2xlZnRyaWdodGFycm93XCI6XCJcXHUyN0Y3XCIsXCJMb25nTGVmdFJpZ2h0QXJyb3dcIjpcIlxcdTI3RjdcIixcIkxvbmdsZWZ0cmlnaHRhcnJvd1wiOlwiXFx1MjdGQVwiLFwibG9uZ21hcHN0b1wiOlwiXFx1MjdGQ1wiLFwibG9uZ3JpZ2h0YXJyb3dcIjpcIlxcdTI3RjZcIixcIkxvbmdSaWdodEFycm93XCI6XCJcXHUyN0Y2XCIsXCJMb25ncmlnaHRhcnJvd1wiOlwiXFx1MjdGOVwiLFwibG9vcGFycm93bGVmdFwiOlwiXFx1MjFBQlwiLFwibG9vcGFycm93cmlnaHRcIjpcIlxcdTIxQUNcIixcImxvcGFyXCI6XCJcXHUyOTg1XCIsXCJMb3BmXCI6XCJcXHVEODM1XFx1REQ0M1wiLFwibG9wZlwiOlwiXFx1RDgzNVxcdURENURcIixcImxvcGx1c1wiOlwiXFx1MkEyRFwiLFwibG90aW1lc1wiOlwiXFx1MkEzNFwiLFwibG93YXN0XCI6XCJcXHUyMjE3XCIsXCJsb3diYXJcIjpcIl9cIixcIkxvd2VyTGVmdEFycm93XCI6XCJcXHUyMTk5XCIsXCJMb3dlclJpZ2h0QXJyb3dcIjpcIlxcdTIxOThcIixcImxvelwiOlwiXFx1MjVDQVwiLFwibG96ZW5nZVwiOlwiXFx1MjVDQVwiLFwibG96ZlwiOlwiXFx1MjlFQlwiLFwibHBhclwiOlwiKFwiLFwibHBhcmx0XCI6XCJcXHUyOTkzXCIsXCJscmFyclwiOlwiXFx1MjFDNlwiLFwibHJjb3JuZXJcIjpcIlxcdTIzMUZcIixcImxyaGFyXCI6XCJcXHUyMUNCXCIsXCJscmhhcmRcIjpcIlxcdTI5NkRcIixcImxybVwiOlwiXFx1MjAwRVwiLFwibHJ0cmlcIjpcIlxcdTIyQkZcIixcImxzYXF1b1wiOlwiXFx1MjAzOVwiLFwibHNjclwiOlwiXFx1RDgzNVxcdURDQzFcIixcIkxzY3JcIjpcIlxcdTIxMTJcIixcImxzaFwiOlwiXFx1MjFCMFwiLFwiTHNoXCI6XCJcXHUyMUIwXCIsXCJsc2ltXCI6XCJcXHUyMjcyXCIsXCJsc2ltZVwiOlwiXFx1MkE4RFwiLFwibHNpbWdcIjpcIlxcdTJBOEZcIixcImxzcWJcIjpcIltcIixcImxzcXVvXCI6XCJcXHUyMDE4XCIsXCJsc3F1b3JcIjpcIlxcdTIwMUFcIixcIkxzdHJva1wiOlwiXFx1MDE0MVwiLFwibHN0cm9rXCI6XCJcXHUwMTQyXCIsXCJsdGNjXCI6XCJcXHUyQUE2XCIsXCJsdGNpclwiOlwiXFx1MkE3OVwiLFwibHRcIjpcIjxcIixcIkxUXCI6XCI8XCIsXCJMdFwiOlwiXFx1MjI2QVwiLFwibHRkb3RcIjpcIlxcdTIyRDZcIixcImx0aHJlZVwiOlwiXFx1MjJDQlwiLFwibHRpbWVzXCI6XCJcXHUyMkM5XCIsXCJsdGxhcnJcIjpcIlxcdTI5NzZcIixcImx0cXVlc3RcIjpcIlxcdTJBN0JcIixcImx0cmlcIjpcIlxcdTI1QzNcIixcImx0cmllXCI6XCJcXHUyMkI0XCIsXCJsdHJpZlwiOlwiXFx1MjVDMlwiLFwibHRyUGFyXCI6XCJcXHUyOTk2XCIsXCJsdXJkc2hhclwiOlwiXFx1Mjk0QVwiLFwibHVydWhhclwiOlwiXFx1Mjk2NlwiLFwibHZlcnRuZXFxXCI6XCJcXHUyMjY4XFx1RkUwMFwiLFwibHZuRVwiOlwiXFx1MjI2OFxcdUZFMDBcIixcIm1hY3JcIjpcIlxcdTAwQUZcIixcIm1hbGVcIjpcIlxcdTI2NDJcIixcIm1hbHRcIjpcIlxcdTI3MjBcIixcIm1hbHRlc2VcIjpcIlxcdTI3MjBcIixcIk1hcFwiOlwiXFx1MjkwNVwiLFwibWFwXCI6XCJcXHUyMUE2XCIsXCJtYXBzdG9cIjpcIlxcdTIxQTZcIixcIm1hcHN0b2Rvd25cIjpcIlxcdTIxQTdcIixcIm1hcHN0b2xlZnRcIjpcIlxcdTIxQTRcIixcIm1hcHN0b3VwXCI6XCJcXHUyMUE1XCIsXCJtYXJrZXJcIjpcIlxcdTI1QUVcIixcIm1jb21tYVwiOlwiXFx1MkEyOVwiLFwiTWN5XCI6XCJcXHUwNDFDXCIsXCJtY3lcIjpcIlxcdTA0M0NcIixcIm1kYXNoXCI6XCJcXHUyMDE0XCIsXCJtRERvdFwiOlwiXFx1MjIzQVwiLFwibWVhc3VyZWRhbmdsZVwiOlwiXFx1MjIyMVwiLFwiTWVkaXVtU3BhY2VcIjpcIlxcdTIwNUZcIixcIk1lbGxpbnRyZlwiOlwiXFx1MjEzM1wiLFwiTWZyXCI6XCJcXHVEODM1XFx1REQxMFwiLFwibWZyXCI6XCJcXHVEODM1XFx1REQyQVwiLFwibWhvXCI6XCJcXHUyMTI3XCIsXCJtaWNyb1wiOlwiXFx1MDBCNVwiLFwibWlkYXN0XCI6XCIqXCIsXCJtaWRjaXJcIjpcIlxcdTJBRjBcIixcIm1pZFwiOlwiXFx1MjIyM1wiLFwibWlkZG90XCI6XCJcXHUwMEI3XCIsXCJtaW51c2JcIjpcIlxcdTIyOUZcIixcIm1pbnVzXCI6XCJcXHUyMjEyXCIsXCJtaW51c2RcIjpcIlxcdTIyMzhcIixcIm1pbnVzZHVcIjpcIlxcdTJBMkFcIixcIk1pbnVzUGx1c1wiOlwiXFx1MjIxM1wiLFwibWxjcFwiOlwiXFx1MkFEQlwiLFwibWxkclwiOlwiXFx1MjAyNlwiLFwibW5wbHVzXCI6XCJcXHUyMjEzXCIsXCJtb2RlbHNcIjpcIlxcdTIyQTdcIixcIk1vcGZcIjpcIlxcdUQ4MzVcXHVERDQ0XCIsXCJtb3BmXCI6XCJcXHVEODM1XFx1REQ1RVwiLFwibXBcIjpcIlxcdTIyMTNcIixcIm1zY3JcIjpcIlxcdUQ4MzVcXHVEQ0MyXCIsXCJNc2NyXCI6XCJcXHUyMTMzXCIsXCJtc3Rwb3NcIjpcIlxcdTIyM0VcIixcIk11XCI6XCJcXHUwMzlDXCIsXCJtdVwiOlwiXFx1MDNCQ1wiLFwibXVsdGltYXBcIjpcIlxcdTIyQjhcIixcIm11bWFwXCI6XCJcXHUyMkI4XCIsXCJuYWJsYVwiOlwiXFx1MjIwN1wiLFwiTmFjdXRlXCI6XCJcXHUwMTQzXCIsXCJuYWN1dGVcIjpcIlxcdTAxNDRcIixcIm5hbmdcIjpcIlxcdTIyMjBcXHUyMEQyXCIsXCJuYXBcIjpcIlxcdTIyNDlcIixcIm5hcEVcIjpcIlxcdTJBNzBcXHUwMzM4XCIsXCJuYXBpZFwiOlwiXFx1MjI0QlxcdTAzMzhcIixcIm5hcG9zXCI6XCJcXHUwMTQ5XCIsXCJuYXBwcm94XCI6XCJcXHUyMjQ5XCIsXCJuYXR1cmFsXCI6XCJcXHUyNjZFXCIsXCJuYXR1cmFsc1wiOlwiXFx1MjExNVwiLFwibmF0dXJcIjpcIlxcdTI2NkVcIixcIm5ic3BcIjpcIlxcdTAwQTBcIixcIm5idW1wXCI6XCJcXHUyMjRFXFx1MDMzOFwiLFwibmJ1bXBlXCI6XCJcXHUyMjRGXFx1MDMzOFwiLFwibmNhcFwiOlwiXFx1MkE0M1wiLFwiTmNhcm9uXCI6XCJcXHUwMTQ3XCIsXCJuY2Fyb25cIjpcIlxcdTAxNDhcIixcIk5jZWRpbFwiOlwiXFx1MDE0NVwiLFwibmNlZGlsXCI6XCJcXHUwMTQ2XCIsXCJuY29uZ1wiOlwiXFx1MjI0N1wiLFwibmNvbmdkb3RcIjpcIlxcdTJBNkRcXHUwMzM4XCIsXCJuY3VwXCI6XCJcXHUyQTQyXCIsXCJOY3lcIjpcIlxcdTA0MURcIixcIm5jeVwiOlwiXFx1MDQzRFwiLFwibmRhc2hcIjpcIlxcdTIwMTNcIixcIm5lYXJoa1wiOlwiXFx1MjkyNFwiLFwibmVhcnJcIjpcIlxcdTIxOTdcIixcIm5lQXJyXCI6XCJcXHUyMUQ3XCIsXCJuZWFycm93XCI6XCJcXHUyMTk3XCIsXCJuZVwiOlwiXFx1MjI2MFwiLFwibmVkb3RcIjpcIlxcdTIyNTBcXHUwMzM4XCIsXCJOZWdhdGl2ZU1lZGl1bVNwYWNlXCI6XCJcXHUyMDBCXCIsXCJOZWdhdGl2ZVRoaWNrU3BhY2VcIjpcIlxcdTIwMEJcIixcIk5lZ2F0aXZlVGhpblNwYWNlXCI6XCJcXHUyMDBCXCIsXCJOZWdhdGl2ZVZlcnlUaGluU3BhY2VcIjpcIlxcdTIwMEJcIixcIm5lcXVpdlwiOlwiXFx1MjI2MlwiLFwibmVzZWFyXCI6XCJcXHUyOTI4XCIsXCJuZXNpbVwiOlwiXFx1MjI0MlxcdTAzMzhcIixcIk5lc3RlZEdyZWF0ZXJHcmVhdGVyXCI6XCJcXHUyMjZCXCIsXCJOZXN0ZWRMZXNzTGVzc1wiOlwiXFx1MjI2QVwiLFwiTmV3TGluZVwiOlwiXFxuXCIsXCJuZXhpc3RcIjpcIlxcdTIyMDRcIixcIm5leGlzdHNcIjpcIlxcdTIyMDRcIixcIk5mclwiOlwiXFx1RDgzNVxcdUREMTFcIixcIm5mclwiOlwiXFx1RDgzNVxcdUREMkJcIixcIm5nRVwiOlwiXFx1MjI2N1xcdTAzMzhcIixcIm5nZVwiOlwiXFx1MjI3MVwiLFwibmdlcVwiOlwiXFx1MjI3MVwiLFwibmdlcXFcIjpcIlxcdTIyNjdcXHUwMzM4XCIsXCJuZ2Vxc2xhbnRcIjpcIlxcdTJBN0VcXHUwMzM4XCIsXCJuZ2VzXCI6XCJcXHUyQTdFXFx1MDMzOFwiLFwibkdnXCI6XCJcXHUyMkQ5XFx1MDMzOFwiLFwibmdzaW1cIjpcIlxcdTIyNzVcIixcIm5HdFwiOlwiXFx1MjI2QlxcdTIwRDJcIixcIm5ndFwiOlwiXFx1MjI2RlwiLFwibmd0clwiOlwiXFx1MjI2RlwiLFwibkd0dlwiOlwiXFx1MjI2QlxcdTAzMzhcIixcIm5oYXJyXCI6XCJcXHUyMUFFXCIsXCJuaEFyclwiOlwiXFx1MjFDRVwiLFwibmhwYXJcIjpcIlxcdTJBRjJcIixcIm5pXCI6XCJcXHUyMjBCXCIsXCJuaXNcIjpcIlxcdTIyRkNcIixcIm5pc2RcIjpcIlxcdTIyRkFcIixcIm5pdlwiOlwiXFx1MjIwQlwiLFwiTkpjeVwiOlwiXFx1MDQwQVwiLFwibmpjeVwiOlwiXFx1MDQ1QVwiLFwibmxhcnJcIjpcIlxcdTIxOUFcIixcIm5sQXJyXCI6XCJcXHUyMUNEXCIsXCJubGRyXCI6XCJcXHUyMDI1XCIsXCJubEVcIjpcIlxcdTIyNjZcXHUwMzM4XCIsXCJubGVcIjpcIlxcdTIyNzBcIixcIm5sZWZ0YXJyb3dcIjpcIlxcdTIxOUFcIixcIm5MZWZ0YXJyb3dcIjpcIlxcdTIxQ0RcIixcIm5sZWZ0cmlnaHRhcnJvd1wiOlwiXFx1MjFBRVwiLFwibkxlZnRyaWdodGFycm93XCI6XCJcXHUyMUNFXCIsXCJubGVxXCI6XCJcXHUyMjcwXCIsXCJubGVxcVwiOlwiXFx1MjI2NlxcdTAzMzhcIixcIm5sZXFzbGFudFwiOlwiXFx1MkE3RFxcdTAzMzhcIixcIm5sZXNcIjpcIlxcdTJBN0RcXHUwMzM4XCIsXCJubGVzc1wiOlwiXFx1MjI2RVwiLFwibkxsXCI6XCJcXHUyMkQ4XFx1MDMzOFwiLFwibmxzaW1cIjpcIlxcdTIyNzRcIixcIm5MdFwiOlwiXFx1MjI2QVxcdTIwRDJcIixcIm5sdFwiOlwiXFx1MjI2RVwiLFwibmx0cmlcIjpcIlxcdTIyRUFcIixcIm5sdHJpZVwiOlwiXFx1MjJFQ1wiLFwibkx0dlwiOlwiXFx1MjI2QVxcdTAzMzhcIixcIm5taWRcIjpcIlxcdTIyMjRcIixcIk5vQnJlYWtcIjpcIlxcdTIwNjBcIixcIk5vbkJyZWFraW5nU3BhY2VcIjpcIlxcdTAwQTBcIixcIm5vcGZcIjpcIlxcdUQ4MzVcXHVERDVGXCIsXCJOb3BmXCI6XCJcXHUyMTE1XCIsXCJOb3RcIjpcIlxcdTJBRUNcIixcIm5vdFwiOlwiXFx1MDBBQ1wiLFwiTm90Q29uZ3J1ZW50XCI6XCJcXHUyMjYyXCIsXCJOb3RDdXBDYXBcIjpcIlxcdTIyNkRcIixcIk5vdERvdWJsZVZlcnRpY2FsQmFyXCI6XCJcXHUyMjI2XCIsXCJOb3RFbGVtZW50XCI6XCJcXHUyMjA5XCIsXCJOb3RFcXVhbFwiOlwiXFx1MjI2MFwiLFwiTm90RXF1YWxUaWxkZVwiOlwiXFx1MjI0MlxcdTAzMzhcIixcIk5vdEV4aXN0c1wiOlwiXFx1MjIwNFwiLFwiTm90R3JlYXRlclwiOlwiXFx1MjI2RlwiLFwiTm90R3JlYXRlckVxdWFsXCI6XCJcXHUyMjcxXCIsXCJOb3RHcmVhdGVyRnVsbEVxdWFsXCI6XCJcXHUyMjY3XFx1MDMzOFwiLFwiTm90R3JlYXRlckdyZWF0ZXJcIjpcIlxcdTIyNkJcXHUwMzM4XCIsXCJOb3RHcmVhdGVyTGVzc1wiOlwiXFx1MjI3OVwiLFwiTm90R3JlYXRlclNsYW50RXF1YWxcIjpcIlxcdTJBN0VcXHUwMzM4XCIsXCJOb3RHcmVhdGVyVGlsZGVcIjpcIlxcdTIyNzVcIixcIk5vdEh1bXBEb3duSHVtcFwiOlwiXFx1MjI0RVxcdTAzMzhcIixcIk5vdEh1bXBFcXVhbFwiOlwiXFx1MjI0RlxcdTAzMzhcIixcIm5vdGluXCI6XCJcXHUyMjA5XCIsXCJub3RpbmRvdFwiOlwiXFx1MjJGNVxcdTAzMzhcIixcIm5vdGluRVwiOlwiXFx1MjJGOVxcdTAzMzhcIixcIm5vdGludmFcIjpcIlxcdTIyMDlcIixcIm5vdGludmJcIjpcIlxcdTIyRjdcIixcIm5vdGludmNcIjpcIlxcdTIyRjZcIixcIk5vdExlZnRUcmlhbmdsZUJhclwiOlwiXFx1MjlDRlxcdTAzMzhcIixcIk5vdExlZnRUcmlhbmdsZVwiOlwiXFx1MjJFQVwiLFwiTm90TGVmdFRyaWFuZ2xlRXF1YWxcIjpcIlxcdTIyRUNcIixcIk5vdExlc3NcIjpcIlxcdTIyNkVcIixcIk5vdExlc3NFcXVhbFwiOlwiXFx1MjI3MFwiLFwiTm90TGVzc0dyZWF0ZXJcIjpcIlxcdTIyNzhcIixcIk5vdExlc3NMZXNzXCI6XCJcXHUyMjZBXFx1MDMzOFwiLFwiTm90TGVzc1NsYW50RXF1YWxcIjpcIlxcdTJBN0RcXHUwMzM4XCIsXCJOb3RMZXNzVGlsZGVcIjpcIlxcdTIyNzRcIixcIk5vdE5lc3RlZEdyZWF0ZXJHcmVhdGVyXCI6XCJcXHUyQUEyXFx1MDMzOFwiLFwiTm90TmVzdGVkTGVzc0xlc3NcIjpcIlxcdTJBQTFcXHUwMzM4XCIsXCJub3RuaVwiOlwiXFx1MjIwQ1wiLFwibm90bml2YVwiOlwiXFx1MjIwQ1wiLFwibm90bml2YlwiOlwiXFx1MjJGRVwiLFwibm90bml2Y1wiOlwiXFx1MjJGRFwiLFwiTm90UHJlY2VkZXNcIjpcIlxcdTIyODBcIixcIk5vdFByZWNlZGVzRXF1YWxcIjpcIlxcdTJBQUZcXHUwMzM4XCIsXCJOb3RQcmVjZWRlc1NsYW50RXF1YWxcIjpcIlxcdTIyRTBcIixcIk5vdFJldmVyc2VFbGVtZW50XCI6XCJcXHUyMjBDXCIsXCJOb3RSaWdodFRyaWFuZ2xlQmFyXCI6XCJcXHUyOUQwXFx1MDMzOFwiLFwiTm90UmlnaHRUcmlhbmdsZVwiOlwiXFx1MjJFQlwiLFwiTm90UmlnaHRUcmlhbmdsZUVxdWFsXCI6XCJcXHUyMkVEXCIsXCJOb3RTcXVhcmVTdWJzZXRcIjpcIlxcdTIyOEZcXHUwMzM4XCIsXCJOb3RTcXVhcmVTdWJzZXRFcXVhbFwiOlwiXFx1MjJFMlwiLFwiTm90U3F1YXJlU3VwZXJzZXRcIjpcIlxcdTIyOTBcXHUwMzM4XCIsXCJOb3RTcXVhcmVTdXBlcnNldEVxdWFsXCI6XCJcXHUyMkUzXCIsXCJOb3RTdWJzZXRcIjpcIlxcdTIyODJcXHUyMEQyXCIsXCJOb3RTdWJzZXRFcXVhbFwiOlwiXFx1MjI4OFwiLFwiTm90U3VjY2VlZHNcIjpcIlxcdTIyODFcIixcIk5vdFN1Y2NlZWRzRXF1YWxcIjpcIlxcdTJBQjBcXHUwMzM4XCIsXCJOb3RTdWNjZWVkc1NsYW50RXF1YWxcIjpcIlxcdTIyRTFcIixcIk5vdFN1Y2NlZWRzVGlsZGVcIjpcIlxcdTIyN0ZcXHUwMzM4XCIsXCJOb3RTdXBlcnNldFwiOlwiXFx1MjI4M1xcdTIwRDJcIixcIk5vdFN1cGVyc2V0RXF1YWxcIjpcIlxcdTIyODlcIixcIk5vdFRpbGRlXCI6XCJcXHUyMjQxXCIsXCJOb3RUaWxkZUVxdWFsXCI6XCJcXHUyMjQ0XCIsXCJOb3RUaWxkZUZ1bGxFcXVhbFwiOlwiXFx1MjI0N1wiLFwiTm90VGlsZGVUaWxkZVwiOlwiXFx1MjI0OVwiLFwiTm90VmVydGljYWxCYXJcIjpcIlxcdTIyMjRcIixcIm5wYXJhbGxlbFwiOlwiXFx1MjIyNlwiLFwibnBhclwiOlwiXFx1MjIyNlwiLFwibnBhcnNsXCI6XCJcXHUyQUZEXFx1MjBFNVwiLFwibnBhcnRcIjpcIlxcdTIyMDJcXHUwMzM4XCIsXCJucG9saW50XCI6XCJcXHUyQTE0XCIsXCJucHJcIjpcIlxcdTIyODBcIixcIm5wcmN1ZVwiOlwiXFx1MjJFMFwiLFwibnByZWNcIjpcIlxcdTIyODBcIixcIm5wcmVjZXFcIjpcIlxcdTJBQUZcXHUwMzM4XCIsXCJucHJlXCI6XCJcXHUyQUFGXFx1MDMzOFwiLFwibnJhcnJjXCI6XCJcXHUyOTMzXFx1MDMzOFwiLFwibnJhcnJcIjpcIlxcdTIxOUJcIixcIm5yQXJyXCI6XCJcXHUyMUNGXCIsXCJucmFycndcIjpcIlxcdTIxOURcXHUwMzM4XCIsXCJucmlnaHRhcnJvd1wiOlwiXFx1MjE5QlwiLFwiblJpZ2h0YXJyb3dcIjpcIlxcdTIxQ0ZcIixcIm5ydHJpXCI6XCJcXHUyMkVCXCIsXCJucnRyaWVcIjpcIlxcdTIyRURcIixcIm5zY1wiOlwiXFx1MjI4MVwiLFwibnNjY3VlXCI6XCJcXHUyMkUxXCIsXCJuc2NlXCI6XCJcXHUyQUIwXFx1MDMzOFwiLFwiTnNjclwiOlwiXFx1RDgzNVxcdURDQTlcIixcIm5zY3JcIjpcIlxcdUQ4MzVcXHVEQ0MzXCIsXCJuc2hvcnRtaWRcIjpcIlxcdTIyMjRcIixcIm5zaG9ydHBhcmFsbGVsXCI6XCJcXHUyMjI2XCIsXCJuc2ltXCI6XCJcXHUyMjQxXCIsXCJuc2ltZVwiOlwiXFx1MjI0NFwiLFwibnNpbWVxXCI6XCJcXHUyMjQ0XCIsXCJuc21pZFwiOlwiXFx1MjIyNFwiLFwibnNwYXJcIjpcIlxcdTIyMjZcIixcIm5zcXN1YmVcIjpcIlxcdTIyRTJcIixcIm5zcXN1cGVcIjpcIlxcdTIyRTNcIixcIm5zdWJcIjpcIlxcdTIyODRcIixcIm5zdWJFXCI6XCJcXHUyQUM1XFx1MDMzOFwiLFwibnN1YmVcIjpcIlxcdTIyODhcIixcIm5zdWJzZXRcIjpcIlxcdTIyODJcXHUyMEQyXCIsXCJuc3Vic2V0ZXFcIjpcIlxcdTIyODhcIixcIm5zdWJzZXRlcXFcIjpcIlxcdTJBQzVcXHUwMzM4XCIsXCJuc3VjY1wiOlwiXFx1MjI4MVwiLFwibnN1Y2NlcVwiOlwiXFx1MkFCMFxcdTAzMzhcIixcIm5zdXBcIjpcIlxcdTIyODVcIixcIm5zdXBFXCI6XCJcXHUyQUM2XFx1MDMzOFwiLFwibnN1cGVcIjpcIlxcdTIyODlcIixcIm5zdXBzZXRcIjpcIlxcdTIyODNcXHUyMEQyXCIsXCJuc3Vwc2V0ZXFcIjpcIlxcdTIyODlcIixcIm5zdXBzZXRlcXFcIjpcIlxcdTJBQzZcXHUwMzM4XCIsXCJudGdsXCI6XCJcXHUyMjc5XCIsXCJOdGlsZGVcIjpcIlxcdTAwRDFcIixcIm50aWxkZVwiOlwiXFx1MDBGMVwiLFwibnRsZ1wiOlwiXFx1MjI3OFwiLFwibnRyaWFuZ2xlbGVmdFwiOlwiXFx1MjJFQVwiLFwibnRyaWFuZ2xlbGVmdGVxXCI6XCJcXHUyMkVDXCIsXCJudHJpYW5nbGVyaWdodFwiOlwiXFx1MjJFQlwiLFwibnRyaWFuZ2xlcmlnaHRlcVwiOlwiXFx1MjJFRFwiLFwiTnVcIjpcIlxcdTAzOURcIixcIm51XCI6XCJcXHUwM0JEXCIsXCJudW1cIjpcIiNcIixcIm51bWVyb1wiOlwiXFx1MjExNlwiLFwibnVtc3BcIjpcIlxcdTIwMDdcIixcIm52YXBcIjpcIlxcdTIyNERcXHUyMEQyXCIsXCJudmRhc2hcIjpcIlxcdTIyQUNcIixcIm52RGFzaFwiOlwiXFx1MjJBRFwiLFwiblZkYXNoXCI6XCJcXHUyMkFFXCIsXCJuVkRhc2hcIjpcIlxcdTIyQUZcIixcIm52Z2VcIjpcIlxcdTIyNjVcXHUyMEQyXCIsXCJudmd0XCI6XCI+XFx1MjBEMlwiLFwibnZIYXJyXCI6XCJcXHUyOTA0XCIsXCJudmluZmluXCI6XCJcXHUyOURFXCIsXCJudmxBcnJcIjpcIlxcdTI5MDJcIixcIm52bGVcIjpcIlxcdTIyNjRcXHUyMEQyXCIsXCJudmx0XCI6XCI8XFx1MjBEMlwiLFwibnZsdHJpZVwiOlwiXFx1MjJCNFxcdTIwRDJcIixcIm52ckFyclwiOlwiXFx1MjkwM1wiLFwibnZydHJpZVwiOlwiXFx1MjJCNVxcdTIwRDJcIixcIm52c2ltXCI6XCJcXHUyMjNDXFx1MjBEMlwiLFwibndhcmhrXCI6XCJcXHUyOTIzXCIsXCJud2FyclwiOlwiXFx1MjE5NlwiLFwibndBcnJcIjpcIlxcdTIxRDZcIixcIm53YXJyb3dcIjpcIlxcdTIxOTZcIixcIm53bmVhclwiOlwiXFx1MjkyN1wiLFwiT2FjdXRlXCI6XCJcXHUwMEQzXCIsXCJvYWN1dGVcIjpcIlxcdTAwRjNcIixcIm9hc3RcIjpcIlxcdTIyOUJcIixcIk9jaXJjXCI6XCJcXHUwMEQ0XCIsXCJvY2lyY1wiOlwiXFx1MDBGNFwiLFwib2NpclwiOlwiXFx1MjI5QVwiLFwiT2N5XCI6XCJcXHUwNDFFXCIsXCJvY3lcIjpcIlxcdTA0M0VcIixcIm9kYXNoXCI6XCJcXHUyMjlEXCIsXCJPZGJsYWNcIjpcIlxcdTAxNTBcIixcIm9kYmxhY1wiOlwiXFx1MDE1MVwiLFwib2RpdlwiOlwiXFx1MkEzOFwiLFwib2RvdFwiOlwiXFx1MjI5OVwiLFwib2Rzb2xkXCI6XCJcXHUyOUJDXCIsXCJPRWxpZ1wiOlwiXFx1MDE1MlwiLFwib2VsaWdcIjpcIlxcdTAxNTNcIixcIm9mY2lyXCI6XCJcXHUyOUJGXCIsXCJPZnJcIjpcIlxcdUQ4MzVcXHVERDEyXCIsXCJvZnJcIjpcIlxcdUQ4MzVcXHVERDJDXCIsXCJvZ29uXCI6XCJcXHUwMkRCXCIsXCJPZ3JhdmVcIjpcIlxcdTAwRDJcIixcIm9ncmF2ZVwiOlwiXFx1MDBGMlwiLFwib2d0XCI6XCJcXHUyOUMxXCIsXCJvaGJhclwiOlwiXFx1MjlCNVwiLFwib2htXCI6XCJcXHUwM0E5XCIsXCJvaW50XCI6XCJcXHUyMjJFXCIsXCJvbGFyclwiOlwiXFx1MjFCQVwiLFwib2xjaXJcIjpcIlxcdTI5QkVcIixcIm9sY3Jvc3NcIjpcIlxcdTI5QkJcIixcIm9saW5lXCI6XCJcXHUyMDNFXCIsXCJvbHRcIjpcIlxcdTI5QzBcIixcIk9tYWNyXCI6XCJcXHUwMTRDXCIsXCJvbWFjclwiOlwiXFx1MDE0RFwiLFwiT21lZ2FcIjpcIlxcdTAzQTlcIixcIm9tZWdhXCI6XCJcXHUwM0M5XCIsXCJPbWljcm9uXCI6XCJcXHUwMzlGXCIsXCJvbWljcm9uXCI6XCJcXHUwM0JGXCIsXCJvbWlkXCI6XCJcXHUyOUI2XCIsXCJvbWludXNcIjpcIlxcdTIyOTZcIixcIk9vcGZcIjpcIlxcdUQ4MzVcXHVERDQ2XCIsXCJvb3BmXCI6XCJcXHVEODM1XFx1REQ2MFwiLFwib3BhclwiOlwiXFx1MjlCN1wiLFwiT3BlbkN1cmx5RG91YmxlUXVvdGVcIjpcIlxcdTIwMUNcIixcIk9wZW5DdXJseVF1b3RlXCI6XCJcXHUyMDE4XCIsXCJvcGVycFwiOlwiXFx1MjlCOVwiLFwib3BsdXNcIjpcIlxcdTIyOTVcIixcIm9yYXJyXCI6XCJcXHUyMUJCXCIsXCJPclwiOlwiXFx1MkE1NFwiLFwib3JcIjpcIlxcdTIyMjhcIixcIm9yZFwiOlwiXFx1MkE1RFwiLFwib3JkZXJcIjpcIlxcdTIxMzRcIixcIm9yZGVyb2ZcIjpcIlxcdTIxMzRcIixcIm9yZGZcIjpcIlxcdTAwQUFcIixcIm9yZG1cIjpcIlxcdTAwQkFcIixcIm9yaWdvZlwiOlwiXFx1MjJCNlwiLFwib3JvclwiOlwiXFx1MkE1NlwiLFwib3JzbG9wZVwiOlwiXFx1MkE1N1wiLFwib3J2XCI6XCJcXHUyQTVCXCIsXCJvU1wiOlwiXFx1MjRDOFwiLFwiT3NjclwiOlwiXFx1RDgzNVxcdURDQUFcIixcIm9zY3JcIjpcIlxcdTIxMzRcIixcIk9zbGFzaFwiOlwiXFx1MDBEOFwiLFwib3NsYXNoXCI6XCJcXHUwMEY4XCIsXCJvc29sXCI6XCJcXHUyMjk4XCIsXCJPdGlsZGVcIjpcIlxcdTAwRDVcIixcIm90aWxkZVwiOlwiXFx1MDBGNVwiLFwib3RpbWVzYXNcIjpcIlxcdTJBMzZcIixcIk90aW1lc1wiOlwiXFx1MkEzN1wiLFwib3RpbWVzXCI6XCJcXHUyMjk3XCIsXCJPdW1sXCI6XCJcXHUwMEQ2XCIsXCJvdW1sXCI6XCJcXHUwMEY2XCIsXCJvdmJhclwiOlwiXFx1MjMzRFwiLFwiT3ZlckJhclwiOlwiXFx1MjAzRVwiLFwiT3ZlckJyYWNlXCI6XCJcXHUyM0RFXCIsXCJPdmVyQnJhY2tldFwiOlwiXFx1MjNCNFwiLFwiT3ZlclBhcmVudGhlc2lzXCI6XCJcXHUyM0RDXCIsXCJwYXJhXCI6XCJcXHUwMEI2XCIsXCJwYXJhbGxlbFwiOlwiXFx1MjIyNVwiLFwicGFyXCI6XCJcXHUyMjI1XCIsXCJwYXJzaW1cIjpcIlxcdTJBRjNcIixcInBhcnNsXCI6XCJcXHUyQUZEXCIsXCJwYXJ0XCI6XCJcXHUyMjAyXCIsXCJQYXJ0aWFsRFwiOlwiXFx1MjIwMlwiLFwiUGN5XCI6XCJcXHUwNDFGXCIsXCJwY3lcIjpcIlxcdTA0M0ZcIixcInBlcmNudFwiOlwiJVwiLFwicGVyaW9kXCI6XCIuXCIsXCJwZXJtaWxcIjpcIlxcdTIwMzBcIixcInBlcnBcIjpcIlxcdTIyQTVcIixcInBlcnRlbmtcIjpcIlxcdTIwMzFcIixcIlBmclwiOlwiXFx1RDgzNVxcdUREMTNcIixcInBmclwiOlwiXFx1RDgzNVxcdUREMkRcIixcIlBoaVwiOlwiXFx1MDNBNlwiLFwicGhpXCI6XCJcXHUwM0M2XCIsXCJwaGl2XCI6XCJcXHUwM0Q1XCIsXCJwaG1tYXRcIjpcIlxcdTIxMzNcIixcInBob25lXCI6XCJcXHUyNjBFXCIsXCJQaVwiOlwiXFx1MDNBMFwiLFwicGlcIjpcIlxcdTAzQzBcIixcInBpdGNoZm9ya1wiOlwiXFx1MjJENFwiLFwicGl2XCI6XCJcXHUwM0Q2XCIsXCJwbGFuY2tcIjpcIlxcdTIxMEZcIixcInBsYW5ja2hcIjpcIlxcdTIxMEVcIixcInBsYW5rdlwiOlwiXFx1MjEwRlwiLFwicGx1c2FjaXJcIjpcIlxcdTJBMjNcIixcInBsdXNiXCI6XCJcXHUyMjlFXCIsXCJwbHVzY2lyXCI6XCJcXHUyQTIyXCIsXCJwbHVzXCI6XCIrXCIsXCJwbHVzZG9cIjpcIlxcdTIyMTRcIixcInBsdXNkdVwiOlwiXFx1MkEyNVwiLFwicGx1c2VcIjpcIlxcdTJBNzJcIixcIlBsdXNNaW51c1wiOlwiXFx1MDBCMVwiLFwicGx1c21uXCI6XCJcXHUwMEIxXCIsXCJwbHVzc2ltXCI6XCJcXHUyQTI2XCIsXCJwbHVzdHdvXCI6XCJcXHUyQTI3XCIsXCJwbVwiOlwiXFx1MDBCMVwiLFwiUG9pbmNhcmVwbGFuZVwiOlwiXFx1MjEwQ1wiLFwicG9pbnRpbnRcIjpcIlxcdTJBMTVcIixcInBvcGZcIjpcIlxcdUQ4MzVcXHVERDYxXCIsXCJQb3BmXCI6XCJcXHUyMTE5XCIsXCJwb3VuZFwiOlwiXFx1MDBBM1wiLFwicHJhcFwiOlwiXFx1MkFCN1wiLFwiUHJcIjpcIlxcdTJBQkJcIixcInByXCI6XCJcXHUyMjdBXCIsXCJwcmN1ZVwiOlwiXFx1MjI3Q1wiLFwicHJlY2FwcHJveFwiOlwiXFx1MkFCN1wiLFwicHJlY1wiOlwiXFx1MjI3QVwiLFwicHJlY2N1cmx5ZXFcIjpcIlxcdTIyN0NcIixcIlByZWNlZGVzXCI6XCJcXHUyMjdBXCIsXCJQcmVjZWRlc0VxdWFsXCI6XCJcXHUyQUFGXCIsXCJQcmVjZWRlc1NsYW50RXF1YWxcIjpcIlxcdTIyN0NcIixcIlByZWNlZGVzVGlsZGVcIjpcIlxcdTIyN0VcIixcInByZWNlcVwiOlwiXFx1MkFBRlwiLFwicHJlY25hcHByb3hcIjpcIlxcdTJBQjlcIixcInByZWNuZXFxXCI6XCJcXHUyQUI1XCIsXCJwcmVjbnNpbVwiOlwiXFx1MjJFOFwiLFwicHJlXCI6XCJcXHUyQUFGXCIsXCJwckVcIjpcIlxcdTJBQjNcIixcInByZWNzaW1cIjpcIlxcdTIyN0VcIixcInByaW1lXCI6XCJcXHUyMDMyXCIsXCJQcmltZVwiOlwiXFx1MjAzM1wiLFwicHJpbWVzXCI6XCJcXHUyMTE5XCIsXCJwcm5hcFwiOlwiXFx1MkFCOVwiLFwicHJuRVwiOlwiXFx1MkFCNVwiLFwicHJuc2ltXCI6XCJcXHUyMkU4XCIsXCJwcm9kXCI6XCJcXHUyMjBGXCIsXCJQcm9kdWN0XCI6XCJcXHUyMjBGXCIsXCJwcm9mYWxhclwiOlwiXFx1MjMyRVwiLFwicHJvZmxpbmVcIjpcIlxcdTIzMTJcIixcInByb2ZzdXJmXCI6XCJcXHUyMzEzXCIsXCJwcm9wXCI6XCJcXHUyMjFEXCIsXCJQcm9wb3J0aW9uYWxcIjpcIlxcdTIyMURcIixcIlByb3BvcnRpb25cIjpcIlxcdTIyMzdcIixcInByb3B0b1wiOlwiXFx1MjIxRFwiLFwicHJzaW1cIjpcIlxcdTIyN0VcIixcInBydXJlbFwiOlwiXFx1MjJCMFwiLFwiUHNjclwiOlwiXFx1RDgzNVxcdURDQUJcIixcInBzY3JcIjpcIlxcdUQ4MzVcXHVEQ0M1XCIsXCJQc2lcIjpcIlxcdTAzQThcIixcInBzaVwiOlwiXFx1MDNDOFwiLFwicHVuY3NwXCI6XCJcXHUyMDA4XCIsXCJRZnJcIjpcIlxcdUQ4MzVcXHVERDE0XCIsXCJxZnJcIjpcIlxcdUQ4MzVcXHVERDJFXCIsXCJxaW50XCI6XCJcXHUyQTBDXCIsXCJxb3BmXCI6XCJcXHVEODM1XFx1REQ2MlwiLFwiUW9wZlwiOlwiXFx1MjExQVwiLFwicXByaW1lXCI6XCJcXHUyMDU3XCIsXCJRc2NyXCI6XCJcXHVEODM1XFx1RENBQ1wiLFwicXNjclwiOlwiXFx1RDgzNVxcdURDQzZcIixcInF1YXRlcm5pb25zXCI6XCJcXHUyMTBEXCIsXCJxdWF0aW50XCI6XCJcXHUyQTE2XCIsXCJxdWVzdFwiOlwiP1wiLFwicXVlc3RlcVwiOlwiXFx1MjI1RlwiLFwicXVvdFwiOlwiXFxcIlwiLFwiUVVPVFwiOlwiXFxcIlwiLFwickFhcnJcIjpcIlxcdTIxREJcIixcInJhY2VcIjpcIlxcdTIyM0RcXHUwMzMxXCIsXCJSYWN1dGVcIjpcIlxcdTAxNTRcIixcInJhY3V0ZVwiOlwiXFx1MDE1NVwiLFwicmFkaWNcIjpcIlxcdTIyMUFcIixcInJhZW1wdHl2XCI6XCJcXHUyOUIzXCIsXCJyYW5nXCI6XCJcXHUyN0U5XCIsXCJSYW5nXCI6XCJcXHUyN0VCXCIsXCJyYW5nZFwiOlwiXFx1Mjk5MlwiLFwicmFuZ2VcIjpcIlxcdTI5QTVcIixcInJhbmdsZVwiOlwiXFx1MjdFOVwiLFwicmFxdW9cIjpcIlxcdTAwQkJcIixcInJhcnJhcFwiOlwiXFx1Mjk3NVwiLFwicmFycmJcIjpcIlxcdTIxRTVcIixcInJhcnJiZnNcIjpcIlxcdTI5MjBcIixcInJhcnJjXCI6XCJcXHUyOTMzXCIsXCJyYXJyXCI6XCJcXHUyMTkyXCIsXCJSYXJyXCI6XCJcXHUyMUEwXCIsXCJyQXJyXCI6XCJcXHUyMUQyXCIsXCJyYXJyZnNcIjpcIlxcdTI5MUVcIixcInJhcnJoa1wiOlwiXFx1MjFBQVwiLFwicmFycmxwXCI6XCJcXHUyMUFDXCIsXCJyYXJycGxcIjpcIlxcdTI5NDVcIixcInJhcnJzaW1cIjpcIlxcdTI5NzRcIixcIlJhcnJ0bFwiOlwiXFx1MjkxNlwiLFwicmFycnRsXCI6XCJcXHUyMUEzXCIsXCJyYXJyd1wiOlwiXFx1MjE5RFwiLFwicmF0YWlsXCI6XCJcXHUyOTFBXCIsXCJyQXRhaWxcIjpcIlxcdTI5MUNcIixcInJhdGlvXCI6XCJcXHUyMjM2XCIsXCJyYXRpb25hbHNcIjpcIlxcdTIxMUFcIixcInJiYXJyXCI6XCJcXHUyOTBEXCIsXCJyQmFyclwiOlwiXFx1MjkwRlwiLFwiUkJhcnJcIjpcIlxcdTI5MTBcIixcInJiYnJrXCI6XCJcXHUyNzczXCIsXCJyYnJhY2VcIjpcIn1cIixcInJicmFja1wiOlwiXVwiLFwicmJya2VcIjpcIlxcdTI5OENcIixcInJicmtzbGRcIjpcIlxcdTI5OEVcIixcInJicmtzbHVcIjpcIlxcdTI5OTBcIixcIlJjYXJvblwiOlwiXFx1MDE1OFwiLFwicmNhcm9uXCI6XCJcXHUwMTU5XCIsXCJSY2VkaWxcIjpcIlxcdTAxNTZcIixcInJjZWRpbFwiOlwiXFx1MDE1N1wiLFwicmNlaWxcIjpcIlxcdTIzMDlcIixcInJjdWJcIjpcIn1cIixcIlJjeVwiOlwiXFx1MDQyMFwiLFwicmN5XCI6XCJcXHUwNDQwXCIsXCJyZGNhXCI6XCJcXHUyOTM3XCIsXCJyZGxkaGFyXCI6XCJcXHUyOTY5XCIsXCJyZHF1b1wiOlwiXFx1MjAxRFwiLFwicmRxdW9yXCI6XCJcXHUyMDFEXCIsXCJyZHNoXCI6XCJcXHUyMUIzXCIsXCJyZWFsXCI6XCJcXHUyMTFDXCIsXCJyZWFsaW5lXCI6XCJcXHUyMTFCXCIsXCJyZWFscGFydFwiOlwiXFx1MjExQ1wiLFwicmVhbHNcIjpcIlxcdTIxMURcIixcIlJlXCI6XCJcXHUyMTFDXCIsXCJyZWN0XCI6XCJcXHUyNUFEXCIsXCJyZWdcIjpcIlxcdTAwQUVcIixcIlJFR1wiOlwiXFx1MDBBRVwiLFwiUmV2ZXJzZUVsZW1lbnRcIjpcIlxcdTIyMEJcIixcIlJldmVyc2VFcXVpbGlicml1bVwiOlwiXFx1MjFDQlwiLFwiUmV2ZXJzZVVwRXF1aWxpYnJpdW1cIjpcIlxcdTI5NkZcIixcInJmaXNodFwiOlwiXFx1Mjk3RFwiLFwicmZsb29yXCI6XCJcXHUyMzBCXCIsXCJyZnJcIjpcIlxcdUQ4MzVcXHVERDJGXCIsXCJSZnJcIjpcIlxcdTIxMUNcIixcInJIYXJcIjpcIlxcdTI5NjRcIixcInJoYXJkXCI6XCJcXHUyMUMxXCIsXCJyaGFydVwiOlwiXFx1MjFDMFwiLFwicmhhcnVsXCI6XCJcXHUyOTZDXCIsXCJSaG9cIjpcIlxcdTAzQTFcIixcInJob1wiOlwiXFx1MDNDMVwiLFwicmhvdlwiOlwiXFx1MDNGMVwiLFwiUmlnaHRBbmdsZUJyYWNrZXRcIjpcIlxcdTI3RTlcIixcIlJpZ2h0QXJyb3dCYXJcIjpcIlxcdTIxRTVcIixcInJpZ2h0YXJyb3dcIjpcIlxcdTIxOTJcIixcIlJpZ2h0QXJyb3dcIjpcIlxcdTIxOTJcIixcIlJpZ2h0YXJyb3dcIjpcIlxcdTIxRDJcIixcIlJpZ2h0QXJyb3dMZWZ0QXJyb3dcIjpcIlxcdTIxQzRcIixcInJpZ2h0YXJyb3d0YWlsXCI6XCJcXHUyMUEzXCIsXCJSaWdodENlaWxpbmdcIjpcIlxcdTIzMDlcIixcIlJpZ2h0RG91YmxlQnJhY2tldFwiOlwiXFx1MjdFN1wiLFwiUmlnaHREb3duVGVlVmVjdG9yXCI6XCJcXHUyOTVEXCIsXCJSaWdodERvd25WZWN0b3JCYXJcIjpcIlxcdTI5NTVcIixcIlJpZ2h0RG93blZlY3RvclwiOlwiXFx1MjFDMlwiLFwiUmlnaHRGbG9vclwiOlwiXFx1MjMwQlwiLFwicmlnaHRoYXJwb29uZG93blwiOlwiXFx1MjFDMVwiLFwicmlnaHRoYXJwb29udXBcIjpcIlxcdTIxQzBcIixcInJpZ2h0bGVmdGFycm93c1wiOlwiXFx1MjFDNFwiLFwicmlnaHRsZWZ0aGFycG9vbnNcIjpcIlxcdTIxQ0NcIixcInJpZ2h0cmlnaHRhcnJvd3NcIjpcIlxcdTIxQzlcIixcInJpZ2h0c3F1aWdhcnJvd1wiOlwiXFx1MjE5RFwiLFwiUmlnaHRUZWVBcnJvd1wiOlwiXFx1MjFBNlwiLFwiUmlnaHRUZWVcIjpcIlxcdTIyQTJcIixcIlJpZ2h0VGVlVmVjdG9yXCI6XCJcXHUyOTVCXCIsXCJyaWdodHRocmVldGltZXNcIjpcIlxcdTIyQ0NcIixcIlJpZ2h0VHJpYW5nbGVCYXJcIjpcIlxcdTI5RDBcIixcIlJpZ2h0VHJpYW5nbGVcIjpcIlxcdTIyQjNcIixcIlJpZ2h0VHJpYW5nbGVFcXVhbFwiOlwiXFx1MjJCNVwiLFwiUmlnaHRVcERvd25WZWN0b3JcIjpcIlxcdTI5NEZcIixcIlJpZ2h0VXBUZWVWZWN0b3JcIjpcIlxcdTI5NUNcIixcIlJpZ2h0VXBWZWN0b3JCYXJcIjpcIlxcdTI5NTRcIixcIlJpZ2h0VXBWZWN0b3JcIjpcIlxcdTIxQkVcIixcIlJpZ2h0VmVjdG9yQmFyXCI6XCJcXHUyOTUzXCIsXCJSaWdodFZlY3RvclwiOlwiXFx1MjFDMFwiLFwicmluZ1wiOlwiXFx1MDJEQVwiLFwicmlzaW5nZG90c2VxXCI6XCJcXHUyMjUzXCIsXCJybGFyclwiOlwiXFx1MjFDNFwiLFwicmxoYXJcIjpcIlxcdTIxQ0NcIixcInJsbVwiOlwiXFx1MjAwRlwiLFwicm1vdXN0YWNoZVwiOlwiXFx1MjNCMVwiLFwicm1vdXN0XCI6XCJcXHUyM0IxXCIsXCJybm1pZFwiOlwiXFx1MkFFRVwiLFwicm9hbmdcIjpcIlxcdTI3RURcIixcInJvYXJyXCI6XCJcXHUyMUZFXCIsXCJyb2Jya1wiOlwiXFx1MjdFN1wiLFwicm9wYXJcIjpcIlxcdTI5ODZcIixcInJvcGZcIjpcIlxcdUQ4MzVcXHVERDYzXCIsXCJSb3BmXCI6XCJcXHUyMTFEXCIsXCJyb3BsdXNcIjpcIlxcdTJBMkVcIixcInJvdGltZXNcIjpcIlxcdTJBMzVcIixcIlJvdW5kSW1wbGllc1wiOlwiXFx1Mjk3MFwiLFwicnBhclwiOlwiKVwiLFwicnBhcmd0XCI6XCJcXHUyOTk0XCIsXCJycHBvbGludFwiOlwiXFx1MkExMlwiLFwicnJhcnJcIjpcIlxcdTIxQzlcIixcIlJyaWdodGFycm93XCI6XCJcXHUyMURCXCIsXCJyc2FxdW9cIjpcIlxcdTIwM0FcIixcInJzY3JcIjpcIlxcdUQ4MzVcXHVEQ0M3XCIsXCJSc2NyXCI6XCJcXHUyMTFCXCIsXCJyc2hcIjpcIlxcdTIxQjFcIixcIlJzaFwiOlwiXFx1MjFCMVwiLFwicnNxYlwiOlwiXVwiLFwicnNxdW9cIjpcIlxcdTIwMTlcIixcInJzcXVvclwiOlwiXFx1MjAxOVwiLFwicnRocmVlXCI6XCJcXHUyMkNDXCIsXCJydGltZXNcIjpcIlxcdTIyQ0FcIixcInJ0cmlcIjpcIlxcdTI1QjlcIixcInJ0cmllXCI6XCJcXHUyMkI1XCIsXCJydHJpZlwiOlwiXFx1MjVCOFwiLFwicnRyaWx0cmlcIjpcIlxcdTI5Q0VcIixcIlJ1bGVEZWxheWVkXCI6XCJcXHUyOUY0XCIsXCJydWx1aGFyXCI6XCJcXHUyOTY4XCIsXCJyeFwiOlwiXFx1MjExRVwiLFwiU2FjdXRlXCI6XCJcXHUwMTVBXCIsXCJzYWN1dGVcIjpcIlxcdTAxNUJcIixcInNicXVvXCI6XCJcXHUyMDFBXCIsXCJzY2FwXCI6XCJcXHUyQUI4XCIsXCJTY2Fyb25cIjpcIlxcdTAxNjBcIixcInNjYXJvblwiOlwiXFx1MDE2MVwiLFwiU2NcIjpcIlxcdTJBQkNcIixcInNjXCI6XCJcXHUyMjdCXCIsXCJzY2N1ZVwiOlwiXFx1MjI3RFwiLFwic2NlXCI6XCJcXHUyQUIwXCIsXCJzY0VcIjpcIlxcdTJBQjRcIixcIlNjZWRpbFwiOlwiXFx1MDE1RVwiLFwic2NlZGlsXCI6XCJcXHUwMTVGXCIsXCJTY2lyY1wiOlwiXFx1MDE1Q1wiLFwic2NpcmNcIjpcIlxcdTAxNURcIixcInNjbmFwXCI6XCJcXHUyQUJBXCIsXCJzY25FXCI6XCJcXHUyQUI2XCIsXCJzY25zaW1cIjpcIlxcdTIyRTlcIixcInNjcG9saW50XCI6XCJcXHUyQTEzXCIsXCJzY3NpbVwiOlwiXFx1MjI3RlwiLFwiU2N5XCI6XCJcXHUwNDIxXCIsXCJzY3lcIjpcIlxcdTA0NDFcIixcInNkb3RiXCI6XCJcXHUyMkExXCIsXCJzZG90XCI6XCJcXHUyMkM1XCIsXCJzZG90ZVwiOlwiXFx1MkE2NlwiLFwic2VhcmhrXCI6XCJcXHUyOTI1XCIsXCJzZWFyclwiOlwiXFx1MjE5OFwiLFwic2VBcnJcIjpcIlxcdTIxRDhcIixcInNlYXJyb3dcIjpcIlxcdTIxOThcIixcInNlY3RcIjpcIlxcdTAwQTdcIixcInNlbWlcIjpcIjtcIixcInNlc3dhclwiOlwiXFx1MjkyOVwiLFwic2V0bWludXNcIjpcIlxcdTIyMTZcIixcInNldG1uXCI6XCJcXHUyMjE2XCIsXCJzZXh0XCI6XCJcXHUyNzM2XCIsXCJTZnJcIjpcIlxcdUQ4MzVcXHVERDE2XCIsXCJzZnJcIjpcIlxcdUQ4MzVcXHVERDMwXCIsXCJzZnJvd25cIjpcIlxcdTIzMjJcIixcInNoYXJwXCI6XCJcXHUyNjZGXCIsXCJTSENIY3lcIjpcIlxcdTA0MjlcIixcInNoY2hjeVwiOlwiXFx1MDQ0OVwiLFwiU0hjeVwiOlwiXFx1MDQyOFwiLFwic2hjeVwiOlwiXFx1MDQ0OFwiLFwiU2hvcnREb3duQXJyb3dcIjpcIlxcdTIxOTNcIixcIlNob3J0TGVmdEFycm93XCI6XCJcXHUyMTkwXCIsXCJzaG9ydG1pZFwiOlwiXFx1MjIyM1wiLFwic2hvcnRwYXJhbGxlbFwiOlwiXFx1MjIyNVwiLFwiU2hvcnRSaWdodEFycm93XCI6XCJcXHUyMTkyXCIsXCJTaG9ydFVwQXJyb3dcIjpcIlxcdTIxOTFcIixcInNoeVwiOlwiXFx1MDBBRFwiLFwiU2lnbWFcIjpcIlxcdTAzQTNcIixcInNpZ21hXCI6XCJcXHUwM0MzXCIsXCJzaWdtYWZcIjpcIlxcdTAzQzJcIixcInNpZ21hdlwiOlwiXFx1MDNDMlwiLFwic2ltXCI6XCJcXHUyMjNDXCIsXCJzaW1kb3RcIjpcIlxcdTJBNkFcIixcInNpbWVcIjpcIlxcdTIyNDNcIixcInNpbWVxXCI6XCJcXHUyMjQzXCIsXCJzaW1nXCI6XCJcXHUyQTlFXCIsXCJzaW1nRVwiOlwiXFx1MkFBMFwiLFwic2ltbFwiOlwiXFx1MkE5RFwiLFwic2ltbEVcIjpcIlxcdTJBOUZcIixcInNpbW5lXCI6XCJcXHUyMjQ2XCIsXCJzaW1wbHVzXCI6XCJcXHUyQTI0XCIsXCJzaW1yYXJyXCI6XCJcXHUyOTcyXCIsXCJzbGFyclwiOlwiXFx1MjE5MFwiLFwiU21hbGxDaXJjbGVcIjpcIlxcdTIyMThcIixcInNtYWxsc2V0bWludXNcIjpcIlxcdTIyMTZcIixcInNtYXNocFwiOlwiXFx1MkEzM1wiLFwic21lcGFyc2xcIjpcIlxcdTI5RTRcIixcInNtaWRcIjpcIlxcdTIyMjNcIixcInNtaWxlXCI6XCJcXHUyMzIzXCIsXCJzbXRcIjpcIlxcdTJBQUFcIixcInNtdGVcIjpcIlxcdTJBQUNcIixcInNtdGVzXCI6XCJcXHUyQUFDXFx1RkUwMFwiLFwiU09GVGN5XCI6XCJcXHUwNDJDXCIsXCJzb2Z0Y3lcIjpcIlxcdTA0NENcIixcInNvbGJhclwiOlwiXFx1MjMzRlwiLFwic29sYlwiOlwiXFx1MjlDNFwiLFwic29sXCI6XCIvXCIsXCJTb3BmXCI6XCJcXHVEODM1XFx1REQ0QVwiLFwic29wZlwiOlwiXFx1RDgzNVxcdURENjRcIixcInNwYWRlc1wiOlwiXFx1MjY2MFwiLFwic3BhZGVzdWl0XCI6XCJcXHUyNjYwXCIsXCJzcGFyXCI6XCJcXHUyMjI1XCIsXCJzcWNhcFwiOlwiXFx1MjI5M1wiLFwic3FjYXBzXCI6XCJcXHUyMjkzXFx1RkUwMFwiLFwic3FjdXBcIjpcIlxcdTIyOTRcIixcInNxY3Vwc1wiOlwiXFx1MjI5NFxcdUZFMDBcIixcIlNxcnRcIjpcIlxcdTIyMUFcIixcInNxc3ViXCI6XCJcXHUyMjhGXCIsXCJzcXN1YmVcIjpcIlxcdTIyOTFcIixcInNxc3Vic2V0XCI6XCJcXHUyMjhGXCIsXCJzcXN1YnNldGVxXCI6XCJcXHUyMjkxXCIsXCJzcXN1cFwiOlwiXFx1MjI5MFwiLFwic3FzdXBlXCI6XCJcXHUyMjkyXCIsXCJzcXN1cHNldFwiOlwiXFx1MjI5MFwiLFwic3FzdXBzZXRlcVwiOlwiXFx1MjI5MlwiLFwic3F1YXJlXCI6XCJcXHUyNUExXCIsXCJTcXVhcmVcIjpcIlxcdTI1QTFcIixcIlNxdWFyZUludGVyc2VjdGlvblwiOlwiXFx1MjI5M1wiLFwiU3F1YXJlU3Vic2V0XCI6XCJcXHUyMjhGXCIsXCJTcXVhcmVTdWJzZXRFcXVhbFwiOlwiXFx1MjI5MVwiLFwiU3F1YXJlU3VwZXJzZXRcIjpcIlxcdTIyOTBcIixcIlNxdWFyZVN1cGVyc2V0RXF1YWxcIjpcIlxcdTIyOTJcIixcIlNxdWFyZVVuaW9uXCI6XCJcXHUyMjk0XCIsXCJzcXVhcmZcIjpcIlxcdTI1QUFcIixcInNxdVwiOlwiXFx1MjVBMVwiLFwic3F1ZlwiOlwiXFx1MjVBQVwiLFwic3JhcnJcIjpcIlxcdTIxOTJcIixcIlNzY3JcIjpcIlxcdUQ4MzVcXHVEQ0FFXCIsXCJzc2NyXCI6XCJcXHVEODM1XFx1RENDOFwiLFwic3NldG1uXCI6XCJcXHUyMjE2XCIsXCJzc21pbGVcIjpcIlxcdTIzMjNcIixcInNzdGFyZlwiOlwiXFx1MjJDNlwiLFwiU3RhclwiOlwiXFx1MjJDNlwiLFwic3RhclwiOlwiXFx1MjYwNlwiLFwic3RhcmZcIjpcIlxcdTI2MDVcIixcInN0cmFpZ2h0ZXBzaWxvblwiOlwiXFx1MDNGNVwiLFwic3RyYWlnaHRwaGlcIjpcIlxcdTAzRDVcIixcInN0cm5zXCI6XCJcXHUwMEFGXCIsXCJzdWJcIjpcIlxcdTIyODJcIixcIlN1YlwiOlwiXFx1MjJEMFwiLFwic3ViZG90XCI6XCJcXHUyQUJEXCIsXCJzdWJFXCI6XCJcXHUyQUM1XCIsXCJzdWJlXCI6XCJcXHUyMjg2XCIsXCJzdWJlZG90XCI6XCJcXHUyQUMzXCIsXCJzdWJtdWx0XCI6XCJcXHUyQUMxXCIsXCJzdWJuRVwiOlwiXFx1MkFDQlwiLFwic3VibmVcIjpcIlxcdTIyOEFcIixcInN1YnBsdXNcIjpcIlxcdTJBQkZcIixcInN1YnJhcnJcIjpcIlxcdTI5NzlcIixcInN1YnNldFwiOlwiXFx1MjI4MlwiLFwiU3Vic2V0XCI6XCJcXHUyMkQwXCIsXCJzdWJzZXRlcVwiOlwiXFx1MjI4NlwiLFwic3Vic2V0ZXFxXCI6XCJcXHUyQUM1XCIsXCJTdWJzZXRFcXVhbFwiOlwiXFx1MjI4NlwiLFwic3Vic2V0bmVxXCI6XCJcXHUyMjhBXCIsXCJzdWJzZXRuZXFxXCI6XCJcXHUyQUNCXCIsXCJzdWJzaW1cIjpcIlxcdTJBQzdcIixcInN1YnN1YlwiOlwiXFx1MkFENVwiLFwic3Vic3VwXCI6XCJcXHUyQUQzXCIsXCJzdWNjYXBwcm94XCI6XCJcXHUyQUI4XCIsXCJzdWNjXCI6XCJcXHUyMjdCXCIsXCJzdWNjY3VybHllcVwiOlwiXFx1MjI3RFwiLFwiU3VjY2VlZHNcIjpcIlxcdTIyN0JcIixcIlN1Y2NlZWRzRXF1YWxcIjpcIlxcdTJBQjBcIixcIlN1Y2NlZWRzU2xhbnRFcXVhbFwiOlwiXFx1MjI3RFwiLFwiU3VjY2VlZHNUaWxkZVwiOlwiXFx1MjI3RlwiLFwic3VjY2VxXCI6XCJcXHUyQUIwXCIsXCJzdWNjbmFwcHJveFwiOlwiXFx1MkFCQVwiLFwic3VjY25lcXFcIjpcIlxcdTJBQjZcIixcInN1Y2Nuc2ltXCI6XCJcXHUyMkU5XCIsXCJzdWNjc2ltXCI6XCJcXHUyMjdGXCIsXCJTdWNoVGhhdFwiOlwiXFx1MjIwQlwiLFwic3VtXCI6XCJcXHUyMjExXCIsXCJTdW1cIjpcIlxcdTIyMTFcIixcInN1bmdcIjpcIlxcdTI2NkFcIixcInN1cDFcIjpcIlxcdTAwQjlcIixcInN1cDJcIjpcIlxcdTAwQjJcIixcInN1cDNcIjpcIlxcdTAwQjNcIixcInN1cFwiOlwiXFx1MjI4M1wiLFwiU3VwXCI6XCJcXHUyMkQxXCIsXCJzdXBkb3RcIjpcIlxcdTJBQkVcIixcInN1cGRzdWJcIjpcIlxcdTJBRDhcIixcInN1cEVcIjpcIlxcdTJBQzZcIixcInN1cGVcIjpcIlxcdTIyODdcIixcInN1cGVkb3RcIjpcIlxcdTJBQzRcIixcIlN1cGVyc2V0XCI6XCJcXHUyMjgzXCIsXCJTdXBlcnNldEVxdWFsXCI6XCJcXHUyMjg3XCIsXCJzdXBoc29sXCI6XCJcXHUyN0M5XCIsXCJzdXBoc3ViXCI6XCJcXHUyQUQ3XCIsXCJzdXBsYXJyXCI6XCJcXHUyOTdCXCIsXCJzdXBtdWx0XCI6XCJcXHUyQUMyXCIsXCJzdXBuRVwiOlwiXFx1MkFDQ1wiLFwic3VwbmVcIjpcIlxcdTIyOEJcIixcInN1cHBsdXNcIjpcIlxcdTJBQzBcIixcInN1cHNldFwiOlwiXFx1MjI4M1wiLFwiU3Vwc2V0XCI6XCJcXHUyMkQxXCIsXCJzdXBzZXRlcVwiOlwiXFx1MjI4N1wiLFwic3Vwc2V0ZXFxXCI6XCJcXHUyQUM2XCIsXCJzdXBzZXRuZXFcIjpcIlxcdTIyOEJcIixcInN1cHNldG5lcXFcIjpcIlxcdTJBQ0NcIixcInN1cHNpbVwiOlwiXFx1MkFDOFwiLFwic3Vwc3ViXCI6XCJcXHUyQUQ0XCIsXCJzdXBzdXBcIjpcIlxcdTJBRDZcIixcInN3YXJoa1wiOlwiXFx1MjkyNlwiLFwic3dhcnJcIjpcIlxcdTIxOTlcIixcInN3QXJyXCI6XCJcXHUyMUQ5XCIsXCJzd2Fycm93XCI6XCJcXHUyMTk5XCIsXCJzd253YXJcIjpcIlxcdTI5MkFcIixcInN6bGlnXCI6XCJcXHUwMERGXCIsXCJUYWJcIjpcIlxcdFwiLFwidGFyZ2V0XCI6XCJcXHUyMzE2XCIsXCJUYXVcIjpcIlxcdTAzQTRcIixcInRhdVwiOlwiXFx1MDNDNFwiLFwidGJya1wiOlwiXFx1MjNCNFwiLFwiVGNhcm9uXCI6XCJcXHUwMTY0XCIsXCJ0Y2Fyb25cIjpcIlxcdTAxNjVcIixcIlRjZWRpbFwiOlwiXFx1MDE2MlwiLFwidGNlZGlsXCI6XCJcXHUwMTYzXCIsXCJUY3lcIjpcIlxcdTA0MjJcIixcInRjeVwiOlwiXFx1MDQ0MlwiLFwidGRvdFwiOlwiXFx1MjBEQlwiLFwidGVscmVjXCI6XCJcXHUyMzE1XCIsXCJUZnJcIjpcIlxcdUQ4MzVcXHVERDE3XCIsXCJ0ZnJcIjpcIlxcdUQ4MzVcXHVERDMxXCIsXCJ0aGVyZTRcIjpcIlxcdTIyMzRcIixcInRoZXJlZm9yZVwiOlwiXFx1MjIzNFwiLFwiVGhlcmVmb3JlXCI6XCJcXHUyMjM0XCIsXCJUaGV0YVwiOlwiXFx1MDM5OFwiLFwidGhldGFcIjpcIlxcdTAzQjhcIixcInRoZXRhc3ltXCI6XCJcXHUwM0QxXCIsXCJ0aGV0YXZcIjpcIlxcdTAzRDFcIixcInRoaWNrYXBwcm94XCI6XCJcXHUyMjQ4XCIsXCJ0aGlja3NpbVwiOlwiXFx1MjIzQ1wiLFwiVGhpY2tTcGFjZVwiOlwiXFx1MjA1RlxcdTIwMEFcIixcIlRoaW5TcGFjZVwiOlwiXFx1MjAwOVwiLFwidGhpbnNwXCI6XCJcXHUyMDA5XCIsXCJ0aGthcFwiOlwiXFx1MjI0OFwiLFwidGhrc2ltXCI6XCJcXHUyMjNDXCIsXCJUSE9STlwiOlwiXFx1MDBERVwiLFwidGhvcm5cIjpcIlxcdTAwRkVcIixcInRpbGRlXCI6XCJcXHUwMkRDXCIsXCJUaWxkZVwiOlwiXFx1MjIzQ1wiLFwiVGlsZGVFcXVhbFwiOlwiXFx1MjI0M1wiLFwiVGlsZGVGdWxsRXF1YWxcIjpcIlxcdTIyNDVcIixcIlRpbGRlVGlsZGVcIjpcIlxcdTIyNDhcIixcInRpbWVzYmFyXCI6XCJcXHUyQTMxXCIsXCJ0aW1lc2JcIjpcIlxcdTIyQTBcIixcInRpbWVzXCI6XCJcXHUwMEQ3XCIsXCJ0aW1lc2RcIjpcIlxcdTJBMzBcIixcInRpbnRcIjpcIlxcdTIyMkRcIixcInRvZWFcIjpcIlxcdTI5MjhcIixcInRvcGJvdFwiOlwiXFx1MjMzNlwiLFwidG9wY2lyXCI6XCJcXHUyQUYxXCIsXCJ0b3BcIjpcIlxcdTIyQTRcIixcIlRvcGZcIjpcIlxcdUQ4MzVcXHVERDRCXCIsXCJ0b3BmXCI6XCJcXHVEODM1XFx1REQ2NVwiLFwidG9wZm9ya1wiOlwiXFx1MkFEQVwiLFwidG9zYVwiOlwiXFx1MjkyOVwiLFwidHByaW1lXCI6XCJcXHUyMDM0XCIsXCJ0cmFkZVwiOlwiXFx1MjEyMlwiLFwiVFJBREVcIjpcIlxcdTIxMjJcIixcInRyaWFuZ2xlXCI6XCJcXHUyNUI1XCIsXCJ0cmlhbmdsZWRvd25cIjpcIlxcdTI1QkZcIixcInRyaWFuZ2xlbGVmdFwiOlwiXFx1MjVDM1wiLFwidHJpYW5nbGVsZWZ0ZXFcIjpcIlxcdTIyQjRcIixcInRyaWFuZ2xlcVwiOlwiXFx1MjI1Q1wiLFwidHJpYW5nbGVyaWdodFwiOlwiXFx1MjVCOVwiLFwidHJpYW5nbGVyaWdodGVxXCI6XCJcXHUyMkI1XCIsXCJ0cmlkb3RcIjpcIlxcdTI1RUNcIixcInRyaWVcIjpcIlxcdTIyNUNcIixcInRyaW1pbnVzXCI6XCJcXHUyQTNBXCIsXCJUcmlwbGVEb3RcIjpcIlxcdTIwREJcIixcInRyaXBsdXNcIjpcIlxcdTJBMzlcIixcInRyaXNiXCI6XCJcXHUyOUNEXCIsXCJ0cml0aW1lXCI6XCJcXHUyQTNCXCIsXCJ0cnBleml1bVwiOlwiXFx1MjNFMlwiLFwiVHNjclwiOlwiXFx1RDgzNVxcdURDQUZcIixcInRzY3JcIjpcIlxcdUQ4MzVcXHVEQ0M5XCIsXCJUU2N5XCI6XCJcXHUwNDI2XCIsXCJ0c2N5XCI6XCJcXHUwNDQ2XCIsXCJUU0hjeVwiOlwiXFx1MDQwQlwiLFwidHNoY3lcIjpcIlxcdTA0NUJcIixcIlRzdHJva1wiOlwiXFx1MDE2NlwiLFwidHN0cm9rXCI6XCJcXHUwMTY3XCIsXCJ0d2l4dFwiOlwiXFx1MjI2Q1wiLFwidHdvaGVhZGxlZnRhcnJvd1wiOlwiXFx1MjE5RVwiLFwidHdvaGVhZHJpZ2h0YXJyb3dcIjpcIlxcdTIxQTBcIixcIlVhY3V0ZVwiOlwiXFx1MDBEQVwiLFwidWFjdXRlXCI6XCJcXHUwMEZBXCIsXCJ1YXJyXCI6XCJcXHUyMTkxXCIsXCJVYXJyXCI6XCJcXHUyMTlGXCIsXCJ1QXJyXCI6XCJcXHUyMUQxXCIsXCJVYXJyb2NpclwiOlwiXFx1Mjk0OVwiLFwiVWJyY3lcIjpcIlxcdTA0MEVcIixcInVicmN5XCI6XCJcXHUwNDVFXCIsXCJVYnJldmVcIjpcIlxcdTAxNkNcIixcInVicmV2ZVwiOlwiXFx1MDE2RFwiLFwiVWNpcmNcIjpcIlxcdTAwREJcIixcInVjaXJjXCI6XCJcXHUwMEZCXCIsXCJVY3lcIjpcIlxcdTA0MjNcIixcInVjeVwiOlwiXFx1MDQ0M1wiLFwidWRhcnJcIjpcIlxcdTIxQzVcIixcIlVkYmxhY1wiOlwiXFx1MDE3MFwiLFwidWRibGFjXCI6XCJcXHUwMTcxXCIsXCJ1ZGhhclwiOlwiXFx1Mjk2RVwiLFwidWZpc2h0XCI6XCJcXHUyOTdFXCIsXCJVZnJcIjpcIlxcdUQ4MzVcXHVERDE4XCIsXCJ1ZnJcIjpcIlxcdUQ4MzVcXHVERDMyXCIsXCJVZ3JhdmVcIjpcIlxcdTAwRDlcIixcInVncmF2ZVwiOlwiXFx1MDBGOVwiLFwidUhhclwiOlwiXFx1Mjk2M1wiLFwidWhhcmxcIjpcIlxcdTIxQkZcIixcInVoYXJyXCI6XCJcXHUyMUJFXCIsXCJ1aGJsa1wiOlwiXFx1MjU4MFwiLFwidWxjb3JuXCI6XCJcXHUyMzFDXCIsXCJ1bGNvcm5lclwiOlwiXFx1MjMxQ1wiLFwidWxjcm9wXCI6XCJcXHUyMzBGXCIsXCJ1bHRyaVwiOlwiXFx1MjVGOFwiLFwiVW1hY3JcIjpcIlxcdTAxNkFcIixcInVtYWNyXCI6XCJcXHUwMTZCXCIsXCJ1bWxcIjpcIlxcdTAwQThcIixcIlVuZGVyQmFyXCI6XCJfXCIsXCJVbmRlckJyYWNlXCI6XCJcXHUyM0RGXCIsXCJVbmRlckJyYWNrZXRcIjpcIlxcdTIzQjVcIixcIlVuZGVyUGFyZW50aGVzaXNcIjpcIlxcdTIzRERcIixcIlVuaW9uXCI6XCJcXHUyMkMzXCIsXCJVbmlvblBsdXNcIjpcIlxcdTIyOEVcIixcIlVvZ29uXCI6XCJcXHUwMTcyXCIsXCJ1b2dvblwiOlwiXFx1MDE3M1wiLFwiVW9wZlwiOlwiXFx1RDgzNVxcdURENENcIixcInVvcGZcIjpcIlxcdUQ4MzVcXHVERDY2XCIsXCJVcEFycm93QmFyXCI6XCJcXHUyOTEyXCIsXCJ1cGFycm93XCI6XCJcXHUyMTkxXCIsXCJVcEFycm93XCI6XCJcXHUyMTkxXCIsXCJVcGFycm93XCI6XCJcXHUyMUQxXCIsXCJVcEFycm93RG93bkFycm93XCI6XCJcXHUyMUM1XCIsXCJ1cGRvd25hcnJvd1wiOlwiXFx1MjE5NVwiLFwiVXBEb3duQXJyb3dcIjpcIlxcdTIxOTVcIixcIlVwZG93bmFycm93XCI6XCJcXHUyMUQ1XCIsXCJVcEVxdWlsaWJyaXVtXCI6XCJcXHUyOTZFXCIsXCJ1cGhhcnBvb25sZWZ0XCI6XCJcXHUyMUJGXCIsXCJ1cGhhcnBvb25yaWdodFwiOlwiXFx1MjFCRVwiLFwidXBsdXNcIjpcIlxcdTIyOEVcIixcIlVwcGVyTGVmdEFycm93XCI6XCJcXHUyMTk2XCIsXCJVcHBlclJpZ2h0QXJyb3dcIjpcIlxcdTIxOTdcIixcInVwc2lcIjpcIlxcdTAzQzVcIixcIlVwc2lcIjpcIlxcdTAzRDJcIixcInVwc2loXCI6XCJcXHUwM0QyXCIsXCJVcHNpbG9uXCI6XCJcXHUwM0E1XCIsXCJ1cHNpbG9uXCI6XCJcXHUwM0M1XCIsXCJVcFRlZUFycm93XCI6XCJcXHUyMUE1XCIsXCJVcFRlZVwiOlwiXFx1MjJBNVwiLFwidXB1cGFycm93c1wiOlwiXFx1MjFDOFwiLFwidXJjb3JuXCI6XCJcXHUyMzFEXCIsXCJ1cmNvcm5lclwiOlwiXFx1MjMxRFwiLFwidXJjcm9wXCI6XCJcXHUyMzBFXCIsXCJVcmluZ1wiOlwiXFx1MDE2RVwiLFwidXJpbmdcIjpcIlxcdTAxNkZcIixcInVydHJpXCI6XCJcXHUyNUY5XCIsXCJVc2NyXCI6XCJcXHVEODM1XFx1RENCMFwiLFwidXNjclwiOlwiXFx1RDgzNVxcdURDQ0FcIixcInV0ZG90XCI6XCJcXHUyMkYwXCIsXCJVdGlsZGVcIjpcIlxcdTAxNjhcIixcInV0aWxkZVwiOlwiXFx1MDE2OVwiLFwidXRyaVwiOlwiXFx1MjVCNVwiLFwidXRyaWZcIjpcIlxcdTI1QjRcIixcInV1YXJyXCI6XCJcXHUyMUM4XCIsXCJVdW1sXCI6XCJcXHUwMERDXCIsXCJ1dW1sXCI6XCJcXHUwMEZDXCIsXCJ1d2FuZ2xlXCI6XCJcXHUyOUE3XCIsXCJ2YW5ncnRcIjpcIlxcdTI5OUNcIixcInZhcmVwc2lsb25cIjpcIlxcdTAzRjVcIixcInZhcmthcHBhXCI6XCJcXHUwM0YwXCIsXCJ2YXJub3RoaW5nXCI6XCJcXHUyMjA1XCIsXCJ2YXJwaGlcIjpcIlxcdTAzRDVcIixcInZhcnBpXCI6XCJcXHUwM0Q2XCIsXCJ2YXJwcm9wdG9cIjpcIlxcdTIyMURcIixcInZhcnJcIjpcIlxcdTIxOTVcIixcInZBcnJcIjpcIlxcdTIxRDVcIixcInZhcnJob1wiOlwiXFx1MDNGMVwiLFwidmFyc2lnbWFcIjpcIlxcdTAzQzJcIixcInZhcnN1YnNldG5lcVwiOlwiXFx1MjI4QVxcdUZFMDBcIixcInZhcnN1YnNldG5lcXFcIjpcIlxcdTJBQ0JcXHVGRTAwXCIsXCJ2YXJzdXBzZXRuZXFcIjpcIlxcdTIyOEJcXHVGRTAwXCIsXCJ2YXJzdXBzZXRuZXFxXCI6XCJcXHUyQUNDXFx1RkUwMFwiLFwidmFydGhldGFcIjpcIlxcdTAzRDFcIixcInZhcnRyaWFuZ2xlbGVmdFwiOlwiXFx1MjJCMlwiLFwidmFydHJpYW5nbGVyaWdodFwiOlwiXFx1MjJCM1wiLFwidkJhclwiOlwiXFx1MkFFOFwiLFwiVmJhclwiOlwiXFx1MkFFQlwiLFwidkJhcnZcIjpcIlxcdTJBRTlcIixcIlZjeVwiOlwiXFx1MDQxMlwiLFwidmN5XCI6XCJcXHUwNDMyXCIsXCJ2ZGFzaFwiOlwiXFx1MjJBMlwiLFwidkRhc2hcIjpcIlxcdTIyQThcIixcIlZkYXNoXCI6XCJcXHUyMkE5XCIsXCJWRGFzaFwiOlwiXFx1MjJBQlwiLFwiVmRhc2hsXCI6XCJcXHUyQUU2XCIsXCJ2ZWViYXJcIjpcIlxcdTIyQkJcIixcInZlZVwiOlwiXFx1MjIyOFwiLFwiVmVlXCI6XCJcXHUyMkMxXCIsXCJ2ZWVlcVwiOlwiXFx1MjI1QVwiLFwidmVsbGlwXCI6XCJcXHUyMkVFXCIsXCJ2ZXJiYXJcIjpcInxcIixcIlZlcmJhclwiOlwiXFx1MjAxNlwiLFwidmVydFwiOlwifFwiLFwiVmVydFwiOlwiXFx1MjAxNlwiLFwiVmVydGljYWxCYXJcIjpcIlxcdTIyMjNcIixcIlZlcnRpY2FsTGluZVwiOlwifFwiLFwiVmVydGljYWxTZXBhcmF0b3JcIjpcIlxcdTI3NThcIixcIlZlcnRpY2FsVGlsZGVcIjpcIlxcdTIyNDBcIixcIlZlcnlUaGluU3BhY2VcIjpcIlxcdTIwMEFcIixcIlZmclwiOlwiXFx1RDgzNVxcdUREMTlcIixcInZmclwiOlwiXFx1RDgzNVxcdUREMzNcIixcInZsdHJpXCI6XCJcXHUyMkIyXCIsXCJ2bnN1YlwiOlwiXFx1MjI4MlxcdTIwRDJcIixcInZuc3VwXCI6XCJcXHUyMjgzXFx1MjBEMlwiLFwiVm9wZlwiOlwiXFx1RDgzNVxcdURENERcIixcInZvcGZcIjpcIlxcdUQ4MzVcXHVERDY3XCIsXCJ2cHJvcFwiOlwiXFx1MjIxRFwiLFwidnJ0cmlcIjpcIlxcdTIyQjNcIixcIlZzY3JcIjpcIlxcdUQ4MzVcXHVEQ0IxXCIsXCJ2c2NyXCI6XCJcXHVEODM1XFx1RENDQlwiLFwidnN1Ym5FXCI6XCJcXHUyQUNCXFx1RkUwMFwiLFwidnN1Ym5lXCI6XCJcXHUyMjhBXFx1RkUwMFwiLFwidnN1cG5FXCI6XCJcXHUyQUNDXFx1RkUwMFwiLFwidnN1cG5lXCI6XCJcXHUyMjhCXFx1RkUwMFwiLFwiVnZkYXNoXCI6XCJcXHUyMkFBXCIsXCJ2emlnemFnXCI6XCJcXHUyOTlBXCIsXCJXY2lyY1wiOlwiXFx1MDE3NFwiLFwid2NpcmNcIjpcIlxcdTAxNzVcIixcIndlZGJhclwiOlwiXFx1MkE1RlwiLFwid2VkZ2VcIjpcIlxcdTIyMjdcIixcIldlZGdlXCI6XCJcXHUyMkMwXCIsXCJ3ZWRnZXFcIjpcIlxcdTIyNTlcIixcIndlaWVycFwiOlwiXFx1MjExOFwiLFwiV2ZyXCI6XCJcXHVEODM1XFx1REQxQVwiLFwid2ZyXCI6XCJcXHVEODM1XFx1REQzNFwiLFwiV29wZlwiOlwiXFx1RDgzNVxcdURENEVcIixcIndvcGZcIjpcIlxcdUQ4MzVcXHVERDY4XCIsXCJ3cFwiOlwiXFx1MjExOFwiLFwid3JcIjpcIlxcdTIyNDBcIixcIndyZWF0aFwiOlwiXFx1MjI0MFwiLFwiV3NjclwiOlwiXFx1RDgzNVxcdURDQjJcIixcIndzY3JcIjpcIlxcdUQ4MzVcXHVEQ0NDXCIsXCJ4Y2FwXCI6XCJcXHUyMkMyXCIsXCJ4Y2lyY1wiOlwiXFx1MjVFRlwiLFwieGN1cFwiOlwiXFx1MjJDM1wiLFwieGR0cmlcIjpcIlxcdTI1QkRcIixcIlhmclwiOlwiXFx1RDgzNVxcdUREMUJcIixcInhmclwiOlwiXFx1RDgzNVxcdUREMzVcIixcInhoYXJyXCI6XCJcXHUyN0Y3XCIsXCJ4aEFyclwiOlwiXFx1MjdGQVwiLFwiWGlcIjpcIlxcdTAzOUVcIixcInhpXCI6XCJcXHUwM0JFXCIsXCJ4bGFyclwiOlwiXFx1MjdGNVwiLFwieGxBcnJcIjpcIlxcdTI3RjhcIixcInhtYXBcIjpcIlxcdTI3RkNcIixcInhuaXNcIjpcIlxcdTIyRkJcIixcInhvZG90XCI6XCJcXHUyQTAwXCIsXCJYb3BmXCI6XCJcXHVEODM1XFx1REQ0RlwiLFwieG9wZlwiOlwiXFx1RDgzNVxcdURENjlcIixcInhvcGx1c1wiOlwiXFx1MkEwMVwiLFwieG90aW1lXCI6XCJcXHUyQTAyXCIsXCJ4cmFyclwiOlwiXFx1MjdGNlwiLFwieHJBcnJcIjpcIlxcdTI3RjlcIixcIlhzY3JcIjpcIlxcdUQ4MzVcXHVEQ0IzXCIsXCJ4c2NyXCI6XCJcXHVEODM1XFx1RENDRFwiLFwieHNxY3VwXCI6XCJcXHUyQTA2XCIsXCJ4dXBsdXNcIjpcIlxcdTJBMDRcIixcInh1dHJpXCI6XCJcXHUyNUIzXCIsXCJ4dmVlXCI6XCJcXHUyMkMxXCIsXCJ4d2VkZ2VcIjpcIlxcdTIyQzBcIixcIllhY3V0ZVwiOlwiXFx1MDBERFwiLFwieWFjdXRlXCI6XCJcXHUwMEZEXCIsXCJZQWN5XCI6XCJcXHUwNDJGXCIsXCJ5YWN5XCI6XCJcXHUwNDRGXCIsXCJZY2lyY1wiOlwiXFx1MDE3NlwiLFwieWNpcmNcIjpcIlxcdTAxNzdcIixcIlljeVwiOlwiXFx1MDQyQlwiLFwieWN5XCI6XCJcXHUwNDRCXCIsXCJ5ZW5cIjpcIlxcdTAwQTVcIixcIllmclwiOlwiXFx1RDgzNVxcdUREMUNcIixcInlmclwiOlwiXFx1RDgzNVxcdUREMzZcIixcIllJY3lcIjpcIlxcdTA0MDdcIixcInlpY3lcIjpcIlxcdTA0NTdcIixcIllvcGZcIjpcIlxcdUQ4MzVcXHVERDUwXCIsXCJ5b3BmXCI6XCJcXHVEODM1XFx1REQ2QVwiLFwiWXNjclwiOlwiXFx1RDgzNVxcdURDQjRcIixcInlzY3JcIjpcIlxcdUQ4MzVcXHVEQ0NFXCIsXCJZVWN5XCI6XCJcXHUwNDJFXCIsXCJ5dWN5XCI6XCJcXHUwNDRFXCIsXCJ5dW1sXCI6XCJcXHUwMEZGXCIsXCJZdW1sXCI6XCJcXHUwMTc4XCIsXCJaYWN1dGVcIjpcIlxcdTAxNzlcIixcInphY3V0ZVwiOlwiXFx1MDE3QVwiLFwiWmNhcm9uXCI6XCJcXHUwMTdEXCIsXCJ6Y2Fyb25cIjpcIlxcdTAxN0VcIixcIlpjeVwiOlwiXFx1MDQxN1wiLFwiemN5XCI6XCJcXHUwNDM3XCIsXCJaZG90XCI6XCJcXHUwMTdCXCIsXCJ6ZG90XCI6XCJcXHUwMTdDXCIsXCJ6ZWV0cmZcIjpcIlxcdTIxMjhcIixcIlplcm9XaWR0aFNwYWNlXCI6XCJcXHUyMDBCXCIsXCJaZXRhXCI6XCJcXHUwMzk2XCIsXCJ6ZXRhXCI6XCJcXHUwM0I2XCIsXCJ6ZnJcIjpcIlxcdUQ4MzVcXHVERDM3XCIsXCJaZnJcIjpcIlxcdTIxMjhcIixcIlpIY3lcIjpcIlxcdTA0MTZcIixcInpoY3lcIjpcIlxcdTA0MzZcIixcInppZ3JhcnJcIjpcIlxcdTIxRERcIixcInpvcGZcIjpcIlxcdUQ4MzVcXHVERDZCXCIsXCJab3BmXCI6XCJcXHUyMTI0XCIsXCJac2NyXCI6XCJcXHVEODM1XFx1RENCNVwiLFwienNjclwiOlwiXFx1RDgzNVxcdURDQ0ZcIixcInp3alwiOlwiXFx1MjAwRFwiLFwiendualwiOlwiXFx1MjAwQ1wifSIsIm1vZHVsZS5leHBvcnRzPXtcIkFhY3V0ZVwiOlwiXFx1MDBDMVwiLFwiYWFjdXRlXCI6XCJcXHUwMEUxXCIsXCJBY2lyY1wiOlwiXFx1MDBDMlwiLFwiYWNpcmNcIjpcIlxcdTAwRTJcIixcImFjdXRlXCI6XCJcXHUwMEI0XCIsXCJBRWxpZ1wiOlwiXFx1MDBDNlwiLFwiYWVsaWdcIjpcIlxcdTAwRTZcIixcIkFncmF2ZVwiOlwiXFx1MDBDMFwiLFwiYWdyYXZlXCI6XCJcXHUwMEUwXCIsXCJhbXBcIjpcIiZcIixcIkFNUFwiOlwiJlwiLFwiQXJpbmdcIjpcIlxcdTAwQzVcIixcImFyaW5nXCI6XCJcXHUwMEU1XCIsXCJBdGlsZGVcIjpcIlxcdTAwQzNcIixcImF0aWxkZVwiOlwiXFx1MDBFM1wiLFwiQXVtbFwiOlwiXFx1MDBDNFwiLFwiYXVtbFwiOlwiXFx1MDBFNFwiLFwiYnJ2YmFyXCI6XCJcXHUwMEE2XCIsXCJDY2VkaWxcIjpcIlxcdTAwQzdcIixcImNjZWRpbFwiOlwiXFx1MDBFN1wiLFwiY2VkaWxcIjpcIlxcdTAwQjhcIixcImNlbnRcIjpcIlxcdTAwQTJcIixcImNvcHlcIjpcIlxcdTAwQTlcIixcIkNPUFlcIjpcIlxcdTAwQTlcIixcImN1cnJlblwiOlwiXFx1MDBBNFwiLFwiZGVnXCI6XCJcXHUwMEIwXCIsXCJkaXZpZGVcIjpcIlxcdTAwRjdcIixcIkVhY3V0ZVwiOlwiXFx1MDBDOVwiLFwiZWFjdXRlXCI6XCJcXHUwMEU5XCIsXCJFY2lyY1wiOlwiXFx1MDBDQVwiLFwiZWNpcmNcIjpcIlxcdTAwRUFcIixcIkVncmF2ZVwiOlwiXFx1MDBDOFwiLFwiZWdyYXZlXCI6XCJcXHUwMEU4XCIsXCJFVEhcIjpcIlxcdTAwRDBcIixcImV0aFwiOlwiXFx1MDBGMFwiLFwiRXVtbFwiOlwiXFx1MDBDQlwiLFwiZXVtbFwiOlwiXFx1MDBFQlwiLFwiZnJhYzEyXCI6XCJcXHUwMEJEXCIsXCJmcmFjMTRcIjpcIlxcdTAwQkNcIixcImZyYWMzNFwiOlwiXFx1MDBCRVwiLFwiZ3RcIjpcIj5cIixcIkdUXCI6XCI+XCIsXCJJYWN1dGVcIjpcIlxcdTAwQ0RcIixcImlhY3V0ZVwiOlwiXFx1MDBFRFwiLFwiSWNpcmNcIjpcIlxcdTAwQ0VcIixcImljaXJjXCI6XCJcXHUwMEVFXCIsXCJpZXhjbFwiOlwiXFx1MDBBMVwiLFwiSWdyYXZlXCI6XCJcXHUwMENDXCIsXCJpZ3JhdmVcIjpcIlxcdTAwRUNcIixcImlxdWVzdFwiOlwiXFx1MDBCRlwiLFwiSXVtbFwiOlwiXFx1MDBDRlwiLFwiaXVtbFwiOlwiXFx1MDBFRlwiLFwibGFxdW9cIjpcIlxcdTAwQUJcIixcImx0XCI6XCI8XCIsXCJMVFwiOlwiPFwiLFwibWFjclwiOlwiXFx1MDBBRlwiLFwibWljcm9cIjpcIlxcdTAwQjVcIixcIm1pZGRvdFwiOlwiXFx1MDBCN1wiLFwibmJzcFwiOlwiXFx1MDBBMFwiLFwibm90XCI6XCJcXHUwMEFDXCIsXCJOdGlsZGVcIjpcIlxcdTAwRDFcIixcIm50aWxkZVwiOlwiXFx1MDBGMVwiLFwiT2FjdXRlXCI6XCJcXHUwMEQzXCIsXCJvYWN1dGVcIjpcIlxcdTAwRjNcIixcIk9jaXJjXCI6XCJcXHUwMEQ0XCIsXCJvY2lyY1wiOlwiXFx1MDBGNFwiLFwiT2dyYXZlXCI6XCJcXHUwMEQyXCIsXCJvZ3JhdmVcIjpcIlxcdTAwRjJcIixcIm9yZGZcIjpcIlxcdTAwQUFcIixcIm9yZG1cIjpcIlxcdTAwQkFcIixcIk9zbGFzaFwiOlwiXFx1MDBEOFwiLFwib3NsYXNoXCI6XCJcXHUwMEY4XCIsXCJPdGlsZGVcIjpcIlxcdTAwRDVcIixcIm90aWxkZVwiOlwiXFx1MDBGNVwiLFwiT3VtbFwiOlwiXFx1MDBENlwiLFwib3VtbFwiOlwiXFx1MDBGNlwiLFwicGFyYVwiOlwiXFx1MDBCNlwiLFwicGx1c21uXCI6XCJcXHUwMEIxXCIsXCJwb3VuZFwiOlwiXFx1MDBBM1wiLFwicXVvdFwiOlwiXFxcIlwiLFwiUVVPVFwiOlwiXFxcIlwiLFwicmFxdW9cIjpcIlxcdTAwQkJcIixcInJlZ1wiOlwiXFx1MDBBRVwiLFwiUkVHXCI6XCJcXHUwMEFFXCIsXCJzZWN0XCI6XCJcXHUwMEE3XCIsXCJzaHlcIjpcIlxcdTAwQURcIixcInN1cDFcIjpcIlxcdTAwQjlcIixcInN1cDJcIjpcIlxcdTAwQjJcIixcInN1cDNcIjpcIlxcdTAwQjNcIixcInN6bGlnXCI6XCJcXHUwMERGXCIsXCJUSE9STlwiOlwiXFx1MDBERVwiLFwidGhvcm5cIjpcIlxcdTAwRkVcIixcInRpbWVzXCI6XCJcXHUwMEQ3XCIsXCJVYWN1dGVcIjpcIlxcdTAwREFcIixcInVhY3V0ZVwiOlwiXFx1MDBGQVwiLFwiVWNpcmNcIjpcIlxcdTAwREJcIixcInVjaXJjXCI6XCJcXHUwMEZCXCIsXCJVZ3JhdmVcIjpcIlxcdTAwRDlcIixcInVncmF2ZVwiOlwiXFx1MDBGOVwiLFwidW1sXCI6XCJcXHUwMEE4XCIsXCJVdW1sXCI6XCJcXHUwMERDXCIsXCJ1dW1sXCI6XCJcXHUwMEZDXCIsXCJZYWN1dGVcIjpcIlxcdTAwRERcIixcInlhY3V0ZVwiOlwiXFx1MDBGRFwiLFwieWVuXCI6XCJcXHUwMEE1XCIsXCJ5dW1sXCI6XCJcXHUwMEZGXCJ9IiwibW9kdWxlLmV4cG9ydHM9e1wiYW1wXCI6XCImXCIsXCJhcG9zXCI6XCInXCIsXCJndFwiOlwiPlwiLFwibHRcIjpcIjxcIixcInF1b3RcIjpcIlxcXCJcIn1cbiIsIi8qKlxuICogRXhwb3NlIGByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKWAuXG4gKi9cblxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZVxuICB8fCB3aW5kb3cud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lXG4gIHx8IHdpbmRvdy5tb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbiAgfHwgd2luZG93Lm9SZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbiAgfHwgd2luZG93Lm1zUmVxdWVzdEFuaW1hdGlvbkZyYW1lXG4gIHx8IGZhbGxiYWNrO1xuXG4vKipcbiAqIEZhbGxiYWNrIGltcGxlbWVudGF0aW9uLlxuICovXG5cbnZhciBwcmV2ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5mdW5jdGlvbiBmYWxsYmFjayhmbikge1xuICB2YXIgY3VyciA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICB2YXIgbXMgPSBNYXRoLm1heCgwLCAxNiAtIChjdXJyIC0gcHJldikpO1xuICB2YXIgcmVxID0gc2V0VGltZW91dChmbiwgbXMpO1xuICBwcmV2ID0gY3VycjtcbiAgcmV0dXJuIHJlcTtcbn1cblxuLyoqXG4gKiBDYW5jZWwuXG4gKi9cblxudmFyIGNhbmNlbCA9IHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZVxuICB8fCB3aW5kb3cud2Via2l0Q2FuY2VsQW5pbWF0aW9uRnJhbWVcbiAgfHwgd2luZG93Lm1vekNhbmNlbEFuaW1hdGlvbkZyYW1lXG4gIHx8IHdpbmRvdy5vQ2FuY2VsQW5pbWF0aW9uRnJhbWVcbiAgfHwgd2luZG93Lm1zQ2FuY2VsQW5pbWF0aW9uRnJhbWVcbiAgfHwgd2luZG93LmNsZWFyVGltZW91dDtcblxuZXhwb3J0cy5jYW5jZWwgPSBmdW5jdGlvbihpZCl7XG4gIGNhbmNlbC5jYWxsKHdpbmRvdywgaWQpO1xufTtcbiJdfQ==
(1)
});
;