var utils  = require('handlebars/lib/handlebars/utils');
var domify = require('domify');

exports.attach = function (DOMBars) {
  utils.attach(DOMBars);

  DOMBars.Utils.domify = function (string) {
    return domify(string);
  };
};
