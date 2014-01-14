/* global describe, it */

var equal = require('../support/equal');

describe('Comments', function () {
  it('should compile text', function () {
    equal('<!-- testing -->')('<!-- testing -->');
  });

  it('should compile expressions', function () {
    equal('<!-- {{test}} -->', {
      test: 'some random comment'
    })('<!-- some random comment -->');
  });

  it('should compile expressions and text', function () {
    equal('<!-- test {{mixing}} content -->', {
      mixing: 'more'
    })('<!-- test more content -->');
  });
});
