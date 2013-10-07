var Handlebars = require('handlebars');
var JSCompiler = Handlebars.JavaScriptCompiler.prototype;

var Compiler = module.exports = function () {};
Compiler.prototype = Handlebars.createFrame(JSCompiler);
Compiler.prototype.compiler    = Compiler;
Compiler.prototype.attrCompiler = require('./attributes');

Compiler.prototype.compile = function (environment) {
  this.elementSlot = 0;
  return JSCompiler.compile.apply(this, arguments);
};

Compiler.prototype.compileChildren = function(environment, options) {
  var children = environment.children
  var child, compiler, program, index;

  for (var i = 0, l = children.length; i < l; i++) {
    child    = children[i];
    index    = this.matchExistingProgram(child);
    compiler = this.compiler;

    if (child.attribute) {
      compiler = this.attrCompiler;
    }

    if (index == null) {
      this.context.programs.push('');
      child.index = index = this.context.programs.length;
      child.name  = 'program' + index;
      program = (new compiler()).compile(child, options, this.context);
      this.context.programs[index]     = program;
      this.context.environments[index] = child;
    } else {
      child.index = index;
      child.name  = 'program' + index;
    }
  }
};

Compiler.prototype.pushElement = function () {
  return 'element' + (++this.elementSlot);
}

Compiler.prototype.popElement = function () {
  return 'element' + (this.elementSlot--);
}

Compiler.prototype.topElement = function () {
  return 'element' + this.elementSlot;
}

Compiler.prototype.appendToBuffer = function (string) {
  if (this.environment.isSimple) {
    return 'return ' + string + ';';
  }

  return 'buffer.appendChild(' + string + ');';
};

Compiler.prototype.initializeBuffer = function () {
  return 'document.createDocumentFragment()';
};

Compiler.prototype.mergeSource = function () {
  return this.source.join('\n  ');
};

Compiler.prototype.append = function () {
  this.flushInline();
  var local = this.popStack();

  this.context.aliases.domify = 'this.domifyExpression';

  this.source.push('if (' + local + ' || ' + local + ' === 0) {');
  this.source.push('  ' + this.appendToBuffer('domify(' + local + ')'));
  this.source.push('}');

  if (this.environment.isSimple) {
    this.source.push('else { return ' + this.initializeBuffer() + '; }');
  }
};

Compiler.prototype.appendContent = function (content) {
  var string = 'document.createTextNode(' + this.quotedString(content) + ')';
  this.source.push(this.appendToBuffer(string));
};

Compiler.prototype.appendComment = function () {
  this.source.push(this.appendToBuffer(this.initializeBuffer()));
};

Compiler.prototype.appendProgram = function () {
  this.source.push(this.appendToBuffer(this.popStack() + '(depth0)'));
};

Compiler.prototype.appendEscaped = function () {
  var local = this.popStack();

  this.context.aliases.textify = 'this.textifyExpression';

  this.source.push(this.appendToBuffer('textify(' + local + ')'));
};

Compiler.prototype.appendElement = function () {
  this.source.push(this.appendToBuffer(this.popStack()));
};

Compiler.prototype.invokeComment = function () {
  this.replaceStack(function (current) {
    return 'document.createComment(' + current + '(depth0))';
  });
};

Compiler.prototype.invokeElement = function () {
  var element = this.pushElement();
  var current = this.popStack();

  this.useRegister(element);
  this.source.push(
    element + ' = document.createElement(' + current + '(depth0));'
  );

  this.push(element);
};

Compiler.prototype.invokeAttribute = function () {
  var element = this.topElement();
  var value   = this.popStack();
  var name    = this.popStack();

  var params = [name + '(depth0)', value + '(depth0)'];
  this.source.push(element + '.setAttribute(' + params.join(',') + ');');
};

Compiler.prototype.invokeContent = function () {
  var element = this.topElement();
  this.source.push(element + '.appendChild(' + this.popStack() + '(depth0));');
};
