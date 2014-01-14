/* global describe, it */

var equal = require('../support/equal');

describe('Element Children', function () {
  it('should compile text', function () {
    equal('<div>test</div>')('<div>test</div>');
  });

  it('should compile expressions', function () {
    equal('<div>{{test}}</div>', {
      test: 'random content'
    })('<div>random content</div>');
  });

  it('should compile text and expressions', function () {
    equal('<div>some {{test}} here</div', {
      test: 'content'
    })('<div>some content here</div>');
  });

  it('should compile child elements', function () {
    equal('<div><span></span></div>')('<div><span></span></div>');
  });

  it('should compile child elements and text', function () {
    equal('<div>test <span></span></div>')('<div>test <span></span></div>');
  });

  it('should compile child elements, text and expressions', function () {
    equal('<div>test <span></span> {{test}}</div>', {
      test: 'expression'
    })('<div>test <span></span> expression</div>');
  });

  describe('DOM Expressions', function () {
    it('should compile unescaped expressions as DOM', function () {
      equal('<div>{{{test}}}</div>', {
        test: '<span></span>'
      })('<div><span></span></div>');
    });

    it('should compile unescaped text expressions to DOM', function () {
      equal('<div>{{{test}}}</div>', {
        test: 'some text'
      })('<div>some text</div>');
    });
  });

  describe('Escaping', function () {
    it('should compile escaped expressions as text', function () {
      equal('<div>{{test}}</div>', {
        test: '<span></span>'
      })('<div>&lt;span&gt;&lt;/span&gt;</div>');
    });

    it('should compile elements to text in escaped expressions', function () {
      equal('<div>{{test}}</div>', {
        test: document.createElement('span')
      })('<div>&lt;span&gt;&lt;/span&gt;</div>');
    });
  });
});
