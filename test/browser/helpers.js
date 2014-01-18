/* global DOMBars, describe, it, sinon, expect */

var equal = require('../support/equal');

describe('Helpers', function () {
  describe('Built-in Helpers', function () {
    it('should work with the each helper', function () {
      equal(
        '<ul>{{#each test}}<li>{{@index}} = {{.}}</li>{{/each}}</ul>',
        {
          test: ['this', 'that', 'another thing']
        }
      )(
        '<ul><li>0 = this</li><li>1 = that</li><li>2 = another thing</li></ul>'
      );
    });

    it('should work with the if helper', function () {
      equal('{{#if test}}<div></div>{{else}}<span></span>{{/if}}', {
        test: true
      })('<div></div>');
    });

    it('should work with the unless helper', function () {
      equal('{{#unless test}}<div></div>{{else}}<span></span>{{/unless}}', {
        test: false
      })('<div></div>');
    });

    it('should work with the with helper', function () {
      equal('{{#with test.nested}}<span>I know {{value}}</span>{{/with}}', {
        test: {
          nested: {
            value: 'something goes here'
          }
        }
      })('<span>I know something goes here</span>');
    });
  });

  describe('Expressions', function () {
    it('should refer to the parent scope', function () {
      equal([
        '<h1>Comments</h1>',
        '',
        '<div id="comments">',
        '{{#each comments}}',
        '  <h2><a href="/posts/{{../permalink}}#{{id}}">{{title}}</a></h2>',
        '  <div>{{body}}</div>',
        '{{/each}}',
        '</div>'
      ].join('\n'), {
        permalink: 'comments',
        comments: [{
          id: 1,
          title: 'Test',
          body: 'Example comment'
        }, {
          id: 3,
          title: 'Again',
          body: 'Another comment'
        }]
      })([
        '<h1>Comments</h1>',
        '',
        '<div id="comments">',
        '',
        '  <h2><a href="/posts/comments#1">Test</a></h2>',
        '  <div>Example comment</div>',
        '',
        '  <h2><a href="/posts/comments#3">Again</a></h2>',
        '  <div>Another comment</div>',
        '',
        '</div>'
      ].join('\n'));
    });
  });

  describe('User-defined Helpers', function () {
    it('should work with helpers that return strings', function () {
      equal('{{test}}', {}, {
        helpers: {
          test: function () {
            return '<div></div>';
          }
        }
      })('&lt;div&gt;&lt;/div&gt;');
    });

    it('should work with helpers that return safe strings', function () {
      equal('{{test}}', {}, {
        helpers: {
          test: function () {
            return new DOMBars.SafeString('<div></div>');
          }
        }
      })('<div></div>');
    });

    it('should work with block helpers', function () {
      equal('{{#test}}content{{/test}}', {}, {
        helpers: {
          test: function (options) {
            var el = document.createElement('span');
            el.appendChild(options.fn().value);
            return el;
          }
        }
      })('<span>content</span>');
    });
  });

  describe('Options', function () {
    it('should tell us whether we are in an attribute', function () {
      /**
       * Throws an assertion error if the attribute is not `false`.
       *
       * @param  {Object} options
       * @return {String}
       */
      var notAttribute = function (options) {
        expect(options.attribute).to.be.false;
        return 'notAttribute';
      };

      /**
       * Throws an assertion error if the attribute is not `true`.
       *
       * @param  {Object} options
       * @return {String}
       */
      var isAttribute = function (options) {
        expect(options.attribute).to.be.true;
        return 'isAttribute';
      };

      // Generate different spies for checking each position.
      var tagSpy   = sinon.spy(isAttribute);
      var attrSpy  = sinon.spy(isAttribute);
      var valueSpy = sinon.spy(isAttribute);
      var textSpy  = sinon.spy(notAttribute);

      DOMBars.compile('<{{tag}} {{attr}}="{{value}}">{{text}}</{{tag}}>')({}, {
        helpers: {
          tag:   tagSpy,
          attr:  attrSpy,
          text:  textSpy,
          value: valueSpy
        }
      });

      expect(tagSpy).to.be.calledOnce;
      expect(attrSpy).to.be.calledOnce;
      expect(textSpy).to.be.calledOnce;
      expect(valueSpy).to.be.calledOnce;
    });

    it('should re-render the helper', function (done) {
      var i     = 0;
      var clock = sinon.useFakeTimers();

      /**
       * Execute a simple helper that updates itself after 100ms.
       *
       * @param  {Object} options
       * @return {Number}
       */
      var testHelper = sinon.spy(function (options) {
        window.setTimeout(options.update, 100);
        return i++;
      });

      /**
       * Check that the template output DOM matches a string template.
       *
       * @type {Function}
       */
      var matches = equal('{{test}}', {}, {
        helpers: {
          test: testHelper
        }
      });

      // Check that the call count is correct.
      matches('0');
      expect(testHelper).to.be.calledOnce;

      // Run the update function and restore the default timers.
      clock.tick(100);
      clock.restore();

      // Check the update was executed.
      return DOMBars.VM.exec(function () {
        matches('1');
        expect(testHelper).to.be.calledTwice;
        return done();
      });
    });

    it('should re-render the helper with subexpressions', function (done) {
      var i     = 0;
      var clock = sinon.useFakeTimers();

      /**
       * Execute a simple helper that updates itself after 100ms.
       *
       * @param  {Object} options
       * @return {Number}
       */
      var testHelper = sinon.spy(function (options) {
        window.setTimeout(options.update, 100);
        return i++;
      });

      /**
       * Solely used for proxying the value to the DOM.
       *
       * @param  {*} value
       * @return {*}
       */
      var proxyHelper = sinon.spy(function (value) {
        return value;
      });

      /**
       * Check that the template output DOM matches a string template.
       *
       * @type {Function}
       */
      var matches = equal('{{proxy (test)}}', {}, {
        helpers: {
          test:  testHelper,
          proxy: proxyHelper
        }
      });

      // Check that the call count is correct.
      matches('0');
      expect(testHelper).to.be.calledOnce;
      expect(proxyHelper).to.be.calledOnce;

      // Run the update function and restore the default timers.
      clock.tick(100);
      clock.restore();

      // Check the update was executed.
      return DOMBars.VM.exec(function () {
        matches('1');
        expect(testHelper).to.be.calledTwice;
        expect(proxyHelper).to.be.calledTwice;
        return done();
      });
    });

    it('should re-render helpers inside attributes', function (done) {
      var i     = 0;
      var clock = sinon.useFakeTimers();

      /**
       * Execute a simple helper that updates itself after 100ms.
       *
       * @param  {Object} options
       * @return {Number}
       */
      var testHelper = sinon.spy(function (options) {
        window.setTimeout(options.update, 100);
        return i++;
      });

      /**
       * Check that the template output DOM matches a string template.
       *
       * @type {Function}
       */
      var matches = equal('<div class="test {{test}}"></div>', {}, {
        helpers: {
          test: testHelper
        }
      });

      // Check that the call count is correct.
      matches('<div class="test 0"></div>');
      expect(testHelper).to.be.calledOnce;

      // Run the update function and restore the default timers.
      clock.tick(100);
      clock.restore();

      // Check the update was executed.
      return DOMBars.VM.exec(function () {
        matches('<div class="test 1"></div>');
        expect(testHelper).to.be.calledTwice;
        return done();
      });
    });
  });
});
