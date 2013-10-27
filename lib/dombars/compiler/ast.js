var ast = require('handlebars/lib/handlebars/compiler/ast');

/**
 * Attach the AST object representations to the DOMBars instance.
 *
 * @param  {Object} DOMBars
 * @return {Object}
 */
exports.attach = function (DOMBars) {
  ast.attach(DOMBars);

  DOMBars.AST.DOM = {
    Element: function (name, attributes, content) {
      this.type       = 'DOM_ELEMENT';
      this.name       = name;
      this.attributes = attributes;
      this.content    = content;
    },
    Attribute: function (name, value) {
      this.type  = 'DOM_ATTRIBUTE';
      this.name  = name;
      this.value = value;
    },
    Comment: function (text) {
      this.type = 'DOM_COMMENT';
      this.text = text;
    },
    Text: function (text) {
      this.type = 'DOM_TEXT';
      this.text = text;
    }
  };

  return DOMBars;
};
