/* global DOMBars, describe, it */

var equal = require('../support/equal');

describe('Safe String', function () {
  it('should always domify a safe string', function () {
    equal('<div>{{test}}</div>', {
      test: new DOMBars.SafeString('<span></span>')
    })('<div><span></span></div>');
  });

  it('should function as usual with an unescaped mustache', function () {
    equal('<div>{{{test}}}</div>', {
      test: new DOMBars.SafeString('<span></span>')
    })('<div><span></span></div>');
  });
});
