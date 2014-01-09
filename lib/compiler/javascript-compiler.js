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
  this.context.aliases.partial = 'this.partial';

  var depth  = 'depth' + this.lastContext;
  var invoke = 'partial(' + this.popStack() + ', ' + depth + ')';

  this.context.aliases.createComment = 'this.createComment';

  this.pushStack('createComment(' + invoke + ')');
};

/**
 * Create a DOM element node ready for appending to the current buffer.
 */
Compiler.prototype.invokeElement = function () {
  this.context.aliases.partial       = 'this.partial';
  this.context.aliases.createElement = 'this.createElement';

  var depth   = 'depth' + this.lastContext;
  var create  = 'partial(' + this.popStack() + ', ' + depth + ')';
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

  var depth   = 'depth' + this.lastContext;
  var element = 'function () { return ' + this.lastElement + '; }';
  var value   = 'partial(' + this.popStack() + ', ' + depth + ')';
  var name    = 'partial(' + this.popStack() + ', ' + depth + ')';
  var params  = [element, name, value];

  this.source.push('setAttribute(' + params.join(', ') + ');');
};

/**
 * Invoke an arbitrary program and append to the current element.
 */
Compiler.prototype.invokeContent = function () {
  var element = this.lastElement;
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
