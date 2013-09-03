var HbsParser  = require('handlebars/lib/handlebars/compiler/parser');
var HTMLParser = require('htmlparser2/lib/Parser');

var Parser = function () { this.yy = {}; };

Parser.prototype.Parser = Parser;

Parser.prototype.parse = function (input) {
  HbsParser.yy = this.yy;

  var that = this;
  var yy   = this.yy;
  // Keep track of the current program and the current stack of program nodes
  var program, element, stack;

  // Create and return a new basic program node
  var newProgram = function () { return new yy.ProgramNode([]); };

  // Start the stack with a program node which will contain the entire parsed
  // content
  program = newProgram();
  stack   = [ program ];

  var parser = new HTMLParser({
    onopentagname: function (name) {
      var node = new yy.DOMElementNode(HbsParser.parse(name), [], newProgram());
      program.statements.push(node);

      element = node;
      program = node.content;
      stack.push(node.content);
    },
    onclosetag: function (name) {
      stack.pop();
      element = null;
      program = stack[stack.length - 1];
    },
    onattribute: function (name, value) {
      element.attributes.push(
        new yy.DOMAttributeNode(HbsParser.parse(name), HbsParser.parse(value))
      );
    },
    ontext: function (text) {
      var statements = program.statements;
      statements.push.apply(statements, HbsParser.parse(text).statements);
    },
    onprocessinginstruction: function () {
      throw new Error('Processing instructions are not supported in html');
    },
    oncomment: function (data) {
      program.statements.push(new yy.DOMCommentNode(HbsParser.parse(data)));
    },
    onerror: function (error) {
      console.log('error', error);
    }
  });
  parser.write(input);
  parser.end();

  return stack.pop();
};

module.exports = new Parser();
