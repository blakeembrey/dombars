var HandlebarsAST = require('handlebars/lib/handlebars/compiler/ast');

exports.attach = function (DOMBars) {
  // HandlebarsAST.attach(DOMBars);

  DOMBars.AST.DOMElementNode = function (name, attributes, content) {
    this.type       = 'DOM_ELEMENT';
    this.name       = name;
    this.attributes = attributes;
    this.content    = content;
  };

  DOMBars.AST.DOMAttributeNode = function (name, value) {
    this.type  = 'DOM_ATTRIBUTE';
    this.name  = name;
    this.value = value;
  };

  DOMBars.AST.DOMCommentNode = function (comment) {
    this.type    = 'DOM_COMMENT';
    this.comment = comment;
  };

  return DOMBars;
};
