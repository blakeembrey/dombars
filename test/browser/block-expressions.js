/* global describe, it */

var equal = require('../support/equal');

describe('Block Expressions', function () {
  it('should compile block helpers', function () {
    equal('{{#test}}text{{/test}}', {
      test: true
    })('text');
  });

  it('should compile block helpers with DOM nodes', function () {
    equal('{{#test}}<div>testing</div>{{/test}}', {
      test: true
    })('<div>testing</div>');
  });

  it('should compile deeply nested block helpers', function () {
    equal(
      '<div>{{#test}}<span>{{#again}}{{more}}{{/again}}</span>{{/test}}</div>',
      {
        test: {
          again: {
            more: 'test'
          }
        }
      }
    )('<div><span>test</span></div>');
  });

  it('should work with else block helpers', function () {
    equal('{{#test}}<div></div>{{else}}<span>testing</span>{{/test}}', {
      test: false
    })('<span>testing</span>');
  });
});
