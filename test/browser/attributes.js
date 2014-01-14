/* global describe, it */

var equal = require('../support/equal');

describe('Element Attributes', function () {
  it('should compile text', function () {
    equal('<div class="test"></div>')('<div class="test"></div>');
  });

  it('should compile expressions in the attribute value', function () {
    equal('<div class="{{test}}"></div>', {
      test: 'value'
    })('<div class="value"></div>');
  });

  it('should compile expressions in the attribute name', function () {
    equal('<div {{test}}="value"></div>', {
      test: 'attribute'
    })('<div attribute="value"></div>');
  });

  it('should compile expressions and text in the attribute value', function () {
    equal('<div class="a {{test}} here"></div>', {
      test: 'class'
    })('<div class="a class here"></div>');
  });

  it('should compile expressions and text in the attribute name', function () {
    equal('<div some-{{test}}-here="test"></div>', {
      test: 'attribute'
    })('<div some-attribute-here="test"></div>');
  });

  it('should use a false value to remove the attribute', function () {
    equal('<input type="checkbox" checked="{{{checked}}}">', {
      checked: false
    })('<input type="checkbox">');
  });

  it('should not escape attributes with special characters', function () {
    equal('<div test="{{{test}}}"></div>', {
      test: 'testing &\'"'
    })('<div test="testing &amp;\'&quot;"></div>');
  });
});
