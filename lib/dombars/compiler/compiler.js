var Handlebars = require('handlebars');

var Compiler = module.exports = function () {};
Compiler.prototype = Handlebars.createFrame(Handlebars.Compiler.prototype);
Compiler.prototype.compiler = Compiler;

Compiler.prototype.DOM_ELEMENT = function (node) {
  // Generate the element node
  this.opcode('pushProgram', this.compileProgram(node.name, {
    attribute: true
  }));
  this.opcode('invokeElement');

  var name, value;
  for (var i = 0, l = node.attributes.length; i < l; i++) {
    name = this.compileProgram(node.attributes[i].name, {
      attribute: true
    });
    value = this.compileProgram(node.attributes[i].value, {
      attribute: true
    });
    this.domAttribute(name, value);
  }

  this.opcode('pushProgram', this.compileProgram(node.content));
  this.opcode('invokeContent');

  this.opcode('append');
};

Compiler.prototype.DOM_COMMENT = function (node) {
  this.opcode('pushProgram', this.compileProgram(node.comment, {
    attribute: true
  }));
  this.opcode('invokeComment');
  this.opcode('append');
};

Compiler.prototype.domAttribute = function (name, value) {
  this.opcode('pushProgram', name);
  this.opcode('pushProgram', value);

  this.opcode('invokeAttribute');
};

Compiler.prototype.compileProgram = function (program, options) {
  var compileOptions = {};
  Handlebars.Utils.extend(compileOptions, this.options);
  Handlebars.Utils.extend(compileOptions, options);

  var guid   = this.guid++;
  var result = new this.compiler().compile(program, compileOptions);
  var depth;

  this.usePartial     = this.usePartial || result.usePartial;
  this.children[guid] = result;

  for (var i = 0, l = result.depths.list.length; i < l; i++) {
    depth = result.depths.list[i];

    if (depth < 2) {
      continue;
    } else {
      this.addDepth(depth - 1);
    }
  }

  return guid;
};
