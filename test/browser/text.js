/* global describe, it */

var equal = require('../support/equal');

describe('Text', function () {
  it('should compile text', function () {
    equal('testing')('testing');
  });

  it('should compile escaped symbols', function () {
    equal('this &amp; that')('this &amp; that');
  });

  it('should compile expressions', function () {
    equal('{{test}}', {
      test: 'hello world'
    })('hello world');
  });

  it('should compile paths', function () {
    equal('{{test.nested.paths}}', {
      test: {
        nested: {
          paths: 'hello world'
        }
      }
    })('hello world');
  });

  it('should compile using segment-literal notation', function () {
    equal('{{test.[#nested].[~path]}}', {
      test: {
        '#nested': {
          '~path': 'hello world'
        }
      }
    })('hello world');
  });

  it('should not escape text expressions', function () {
    equal('{{test}}', {
      test: '& \' "'
    })('& \' "');
  });

  it('should compile text before expressions', function () {
    equal('test {{test}}', {
      test: 'more stuff'
    })('test more stuff');
  });

  it('should compile text after expressions', function () {
    equal('{{test}} test', {
      test: 'yet another'
    })('yet another test');
  });

  it('should compile text before and after expressions', function () {
    equal('just {{test}} test', {
      test: 'one more'
    })('just one more test');
  });

  it('should compile expressions before and after text', function () {
    equal('{{before}} more {{after}}', {
      before: 'some',
      after:  'tests'
    })('some more tests');
  });
});
