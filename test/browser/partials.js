/* global describe, it */

var equal = require('../support/equal');

describe('Partials', function () {
  it('should compile partials', function () {
    equal('{{> test}}', {}, {
      partials: {
        test: function () {
          return '<div class="test"></div>';
        }
      }
    })('<div class="test"></div>');
  });

  it('should compile partials in attributes', function () {
    equal('<div class="{{> test}}"></div>', {}, {
      partials: {
        test: function () {
          return 'test';
        }
      }
    })('<div class="test"></div>');
  });
});
