var utils  = require('handlebars/lib/handlebars/utils');
var domify = require('domify');

exports.attach = function (DOMBars) {
  utils.attach(DOMBars);

  DOMBars.Utils.domify = function (string) {
    return domify(string);
  };

  DOMBars.Utils.undomify = function (node) {
    if (node.outerHTML) { return node.outerHTML; }

    var div = document.createElement('div');
    var innerHTML;

    div.appendChild(node.cloneNode(true));
    innerHTML = div.innerHTML;
    div       = null;

    return innerHTML;
  };

  DOMBars.Utils.isElement = function (element) {
    return element instanceof Node;
  };
};
