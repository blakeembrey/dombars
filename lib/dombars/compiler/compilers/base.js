var Handlebars = require('handlebars');
var JSCompiler = Handlebars.Compiler.prototype;

var Compiler = module.exports = function () {};
Compiler.prototype = Handlebars.createFrame(JSCompiler);
Compiler.prototype.compiler = Compiler;

Compiler.prototype.DOM_ELEMENT = function (node) {
  this.opcode('pushProgram', this.compileAttribute(node.name));
  this.opcode('invokeElement');

  var name, value;
  for (var i = 0, len = node.attributes.length; i < len; i++) {
    name  = this.compileAttribute(node.attributes[i].name);
    value = this.compileAttribute(node.attributes[i].value);
    this.appendAttribute(name, value);
  }

  this.opcode('pushProgram', this.compileProgram(node.content));
  this.opcode('invokeContent');
  this.opcode('appendElement');
};

Compiler.prototype.DOM_COMMENT = function (node) {
  this.opcode('pushProgram', this.compileAttribute(node.text));
  this.opcode('invokeComment');
  this.opcode('appendElement');
};

Compiler.prototype.DOM_TEXT = function (node) {
  this.opcode('pushProgram', this.compileProgram(node.text));
  this.opcode('appendProgram');
};

Compiler.prototype.appendAttribute = function (name, value) {
  this.opcode('pushProgram', name);
  this.opcode('pushProgram', value);
  this.opcode('invokeAttribute');
};

Compiler.prototype.comment = function () {
  this.opcode('appendComment');
};

Compiler.prototype.compileAttribute = function (program) {
  var guid = JSCompiler.compileProgram.call(this, program);
  this.children[guid].attribute = true;
  return guid;
};
