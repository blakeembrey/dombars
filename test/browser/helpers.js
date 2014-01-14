/* global DOMBars, describe, it */

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
});
