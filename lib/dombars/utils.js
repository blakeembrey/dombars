var utils  = require('handlebars/lib/handlebars/utils');
var domify = require('domify');

exports.attach = function (DOMBars) {
  utils.attach(DOMBars);

  DOMBars.Utils.isElement = function (element) {
    return element instanceof Node;
  };

  DOMBars.Utils.domifyExpression = function (string) {
    if (DOMBars.Utils.isElement(string)) { return string; }

    try {
      return domify(string.toString());
    } catch (e) {
      return document.createTextNode(string);
    }
  };

  DOMBars.Utils.textifyExpression = function (string) {
    if (string instanceof DOMBars.SafeString) {
      return DOMBars.Utils.domifyExpression(string.toString());
    }

    if (DOMBars.Utils.isElement(string)) {
      if (string.outerHTML) {
        return document.createTextNode(string.outerHTML);
      }

      var div = document.createElement('div');
      var outerHTML;

      div.appendChild(string.cloneNode(true));
      outerHTML = div.innerHTML;
      div       = null;

      return document.createTextNode(outerHTML);
    }

    return document.createTextNode(string);
  };
};
