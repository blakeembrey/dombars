/* global describe, it */

var equal = require('../support/equal');

describe('Comment Expressions', function () {
  it('should not output comment nodes in the template', function () {
    equal('<div>{{! comment }}</div>')('<div></div>');
  });

  it('should not output comment nodes beside text', function () {
    equal('<div>text {{! comment }}</div>')('<div>text </div>');
  });
});
