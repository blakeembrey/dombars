/* global describe, it */

var equal = require('../support/equal');

describe('Elements', function () {
  it('should compile text', function () {
    equal('<div></div>')('<div></div>');
  });

  it('should compile expressions', function () {
    equal('<{{test}}></{{test}}>', {
      test: 'div'
    })('<div></div>');
  });

  it('should compile expressions and text', function () {
    equal('<{{test}}-tag></{{test}}-tag>', {
      test: 'custom'
    })('<custom-tag></custom-tag>');
  });

  it('should not reuse nodes during compilation', function () {
    equal('<div>{{test}}</div><span>{{test}}</span>', {
      test: 'text'
    })('<div>text</div><span>text</span>');
  });

  it('should not reuse attribute and non-attribute programs', function () {
    equal('<h1>{{title}}</h1><input value="{{title}}">', {
      title: 'Testing'
    })('<h1>Testing</h1><input value="Testing">');
  });
});
