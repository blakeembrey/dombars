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
