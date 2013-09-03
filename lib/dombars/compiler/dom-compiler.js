var Handlebars = require('handlebars');
var JSCompiler = Handlebars.JavaScriptCompiler.prototype;

var DOMCompiler = module.exports = function () {};
DOMCompiler.prototype = Handlebars.createFrame(JSCompiler);
DOMCompiler.prototype.compiler = DOMCompiler;

DOMCompiler.prototype.compile = function (environment) {
  // Set a boolean flag to indicate which context of logic we should be execute.
  this.isAttribute = !!(environment.options && environment.options.attribute);
  this.elementSlot = 0;
  return JSCompiler.compile.apply(this, arguments);
};

DOMCompiler.prototype.pushElement = function () {
  return 'element' + (++this.elementSlot);
}

DOMCompiler.prototype.popElement = function () {
  return 'element' + (this.elementSlot--);
}

DOMCompiler.prototype.topElement = function () {
  return 'element' + this.elementSlot;
}

DOMCompiler.prototype.appendToBuffer = function (string) {
  if (this.environment.isSimple) {
    return 'return ' + string + ';';
  } else if (!this.isAttribute) {
    return 'buffer.appendChild(' + string + ');';
  } else {
    return JSCompiler.appendToBuffer.call(this, string);
  }
};

DOMCompiler.prototype.initializeBuffer = function () {
  if (this.isAttribute) { return this.quotedString(''); }
  return 'document.createDocumentFragment()';
};

DOMCompiler.prototype.appendContent = function (content) {
  var string = this.quotedString(content);
  if (!this.isAttribute) { string = 'document.createTextNode(' + string + ')'; }
  this.source.push(this.appendToBuffer(string));
};

DOMCompiler.prototype.appendEscaped = function () {
  if (this.isAttribute) { return JSCompiler.appendEscaped.call(this); }

  var node = 'document.createTextNode(' + this.popStack() + ')';
  this.source.push(this.appendToBuffer(node));
};

DOMCompiler.prototype.mergeSource = function () {
  if (this.isAttribute) { return JSCompiler.mergeSource.call(this); }

  return this.source.join('\n  ');
};

DOMCompiler.prototype.append = function() {
  if (this.isAttribute) { return JSCompiler.append.call(this); }

  this.flushInline();
  var local = this.popStack();
  this.source.push('if (' + local + ') { ' + this.appendToBuffer(local) + ' }');
  if (this.environment.isSimple) {
    this.source.push('else { return ' + this.initializeBuffer() + '; }');
  }
};

DOMCompiler.prototype.invokeComment = function () {
  this.replaceStack(function (current) {
    return 'document.createComment(' + current + '(depth0))';
  });
};

DOMCompiler.prototype.invokeElement = function () {
  var element = this.pushElement();
  var current = this.popStack();

  this.useRegister(element);
  this.source.push(element + ' = document.createElement(' + current + '(depth0))');

  this.push(element);
};

DOMCompiler.prototype.invokeAttribute = function () {
  var element = this.topElement();
  var value   = this.popStack();
  var name    = this.popStack();

  var params = [name + '(depth0)', value + '(depth0)'];
  this.source.push(element + '.setAttribute(' + params.join(',') + ');');
};

DOMCompiler.prototype.invokeContent = function () {
  var element = this.topElement();
  this.source.push(element + '.appendChild(' + this.popStack() + '(depth0))');
};
